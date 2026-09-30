
const Order = require('../models/Order');

const {
  createPhonePePayment,
  getPhonePeOrderStatus,
} = require('../services/phonepeService');

const {
  sendPaymentSuccessEmail,
} = require('../services/emailService');

const toFiniteNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

/*
 * =========================================================
 * PRODUCTION URL CONFIGURATION
 * =========================================================
 *
 * IMPORTANT:
 * These values MUST be configured in Render Environment
 * Variables.
 *
 * BACKEND_PUBLIC_URL
 * = Your deployed Render backend
 *
 * FRONTEND_URL
 * = Your deployed Vercel frontend
 *
 * Do NOT use localhost in production.
 */

const getProductionUrls = () => {
  const backendUrl =
    process.env.BACKEND_PUBLIC_URL?.trim();

  const frontendUrl =
    process.env.FRONTEND_URL?.trim();

  if (!backendUrl) {
    throw new Error(
      'BACKEND_PUBLIC_URL environment variable is not configured.'
    );
  }

  if (!frontendUrl) {
    throw new Error(
      'FRONTEND_URL environment variable is not configured.'
    );
  }

  /*
   * Remove trailing slashes so that URLs do not become:
   *
   * https://example.com//api/...
   */
  return {
    backendUrl: backendUrl.replace(/\/+$/, ''),
    frontendUrl: frontendUrl.replace(/\/+$/, ''),
  };
};

/*
 * =========================================================
 * POST /api/payments/phonepe/create
 * =========================================================
 *
 * Creates a PhonePe payment for an existing Yamini Flex
 * order.
 */
const createPhonePeOrder = async (req, res) => {
  try {
    const { orderId } = req.body || {};

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required',
      });
    }

    /*
     * Make sure production URLs are configured BEFORE
     * creating the PhonePe payment.
     */
    const {
      backendUrl,
    } = getProductionUrls();

    const order =
      await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (
      order.paymentMethod !== 'PhonePe'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'This order is not configured for PhonePe payment',
      });
    }

    if (
      order.paymentStatus === 'Paid'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'This order has already been paid',
      });
    }

    const orderAmount =
      toFiniteNumber(
        order.grandTotal,
        toFiniteNumber(
          order.totalAmount,
          0
        )
      );

    if (orderAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order amount',
      });
    }

    /*
     * Convert rupees to paise.
     */
    const amountInPaise =
      Math.round(
        orderAmount * 100
      );

    /*
     * Reuse the existing PhonePe merchant order ID
     * if one already exists.
     */
    let merchantOrderId =
      order.phonePeOrderId;

    if (!merchantOrderId) {
      merchantOrderId =
        `YF-${order.orderId}-${Date.now()}`;
    }

    /*
     * =====================================================
     * PHONEPE CALLBACK URL
     * =====================================================
     *
     * PhonePe sends the customer back to the deployed
     * Render backend.
     *
     * Render backend verifies the payment with PhonePe.
     *
     * After verification, backend redirects the customer
     * to the deployed Vercel frontend.
     */
    const redirectUrl =
      `${backendUrl}/api/payments/phonepe/return` +
      `?orderId=${encodeURIComponent(
        order._id.toString()
      )}` +
      `&merchantOrderId=${encodeURIComponent(
        merchantOrderId
      )}`;

    console.log(
      '========================================'
    );

    console.log(
      'CREATING PHONEPE PAYMENT'
    );

    console.log(
      'YAMINI ORDER ID:',
      order._id.toString()
    );

    console.log(
      'YAMINI ORDER NUMBER:',
      order.orderId
    );

    console.log(
      'PHONEPE MERCHANT ORDER ID:',
      merchantOrderId
    );

    console.log(
      'AMOUNT IN PAISE:',
      amountInPaise
    );

    console.log(
      'PHONEPE CALLBACK URL:',
      redirectUrl
    );

    console.log(
      '========================================'
    );

    const phonePeResponse =
      await createPhonePePayment({
        merchantOrderId,
        amount: amountInPaise,
        redirectUrl,
      });

    if (
      !phonePeResponse?.redirectUrl
    ) {
      return res.status(500).json({
        success: false,
        message:
          'PhonePe did not return a checkout URL',
      });
    }

    /*
     * Store PhonePe merchant order ID on the Yamini order.
     */
    order.phonePeOrderId =
      merchantOrderId;

    order.paymentStatus =
      'Pending';

    order.paymentMethod =
      'PhonePe';

    await order.save();

    return res.status(200).json({
      success: true,
      message:
        'PhonePe payment created',

      data: {
        orderId:
          order._id,

        merchantOrderId,

        redirectUrl:
          phonePeResponse.redirectUrl,
      },
    });
  } catch (error) {
    console.error(
      'PhonePe create payment error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        'Unable to create PhonePe payment',
    });
  }
};

/*
 * =========================================================
 * GET /api/payments/phonepe/return
 * =========================================================
 *
 * PhonePe redirects the CUSTOMER here after checkout.
 *
 * IMPORTANT:
 *
 * 1. Backend receives the callback.
 * 2. Backend verifies the payment directly with PhonePe.
 * 3. Backend checks the amount.
 * 4. Backend updates the Yamini order.
 * 5. Backend sends the payment-success email.
 * 6. Backend redirects customer to Vercel HOME.
 *
 * Therefore the customer never needs to see a callback page.
 */
const handlePhonePeReturn = async (
  req,
  res
) => {
  let frontendUrl = null;

  try {
    /*
     * Get production frontend URL.
     *
     * If this is missing, we cannot safely redirect
     * the customer.
     */
    const productionUrls =
      getProductionUrls();

    frontendUrl =
      productionUrls.frontendUrl;

    const {
      orderId,
      merchantOrderId,
    } = req.query;

    console.log(
      '========================================'
    );

    console.log(
      'PHONEPE RETURN RECEIVED'
    );

    console.log(
      'ORDER ID:',
      orderId
    );

    console.log(
      'MERCHANT ORDER ID:',
      merchantOrderId
    );

    console.log(
      'FRONTEND URL:',
      frontendUrl
    );

    console.log(
      '========================================'
    );

    /*
     * Missing callback information.
     */
    if (
      !orderId ||
      !merchantOrderId
    ) {
      console.error(
        'PhonePe return missing orderId or merchantOrderId'
      );

      return res.redirect(
        `${frontendUrl}/`
      );
    }

    /*
     * Find Yamini order.
     */
    const order =
      await Order.findById(orderId);

    if (!order) {
      console.error(
        'Order not found:',
        orderId
      );

      return res.redirect(
        `${frontendUrl}/`
      );
    }

    /*
     * Make sure the PhonePe order belongs
     * to this Yamini order.
     */
    if (
      !order.phonePeOrderId ||
      order.phonePeOrderId !==
        merchantOrderId
    ) {
      console.error(
        'PhonePe merchant order mismatch:',
        {
          stored:
            order.phonePeOrderId,

          received:
            merchantOrderId,
        }
      );

      return res.redirect(
        `${frontendUrl}/`
      );
    }

    /*
     * =====================================================
     * ALREADY PAID
     * =====================================================
     *
     * Prevent duplicate processing and duplicate emails.
     */
    if (
      order.paymentStatus === 'Paid'
    ) {
      console.log(
        'Order is already marked Paid.'
      );

      return res.redirect(
        `${frontendUrl}/`
      );
    }

    /*
     * =====================================================
     * ASK PHONEPE FOR THE REAL PAYMENT STATUS
     * =====================================================
     *
     * PhonePe may need a short amount of time to update
     * the transaction state, so we retry up to 3 times.
     */
    let statusResponse = null;

    for (
      let attempt = 1;
      attempt <= 3;
      attempt++
    ) {
      try {
        statusResponse =
          await getPhonePeOrderStatus(
            merchantOrderId
          );

        console.log(
          `PhonePe status attempt ${attempt}:`,
          JSON.stringify(
            statusResponse,
            null,
            2
          )
        );

        const state =
          String(
            statusResponse?.state ||
              statusResponse?.data?.state ||
              ''
          ).toUpperCase();

        /*
         * Stop retrying when PhonePe has reached
         * a final state.
         */
        if (
          state === 'COMPLETED' ||
          state === 'FAILED' ||
          state === 'FAILURE' ||
          state === 'CANCELLED'
        ) {
          break;
        }
      } catch (error) {
        console.error(
          `PhonePe status attempt ${attempt} failed:`,
          error.message
        );
      }

      if (attempt < 3) {
        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              2000
            )
        );
      }
    }

    const state =
      String(
        statusResponse?.state ||
          statusResponse?.data?.state ||
          ''
      ).toUpperCase();

    console.log(
      'FINAL PHONEPE STATE:',
      state
    );

    /*
     * =====================================================
     * SUCCESS
     * =====================================================
     *
     * Only COMPLETED can mark the Yamini order as Paid.
     */
    if (
      state === 'COMPLETED'
    ) {
      const phonePeAmount =
        toFiniteNumber(
          statusResponse?.amount ??
            statusResponse?.data?.amount,
          0
        );

      const expectedAmount =
        Math.round(
          toFiniteNumber(
            order.grandTotal,
            toFiniteNumber(
              order.totalAmount,
              0
            )
          ) * 100
        );

      /*
       * ===================================================
       * PAYMENT AMOUNT VERIFICATION
       * ===================================================
       *
       * If PhonePe provides an amount, it MUST match
       * the Yamini order amount.
       */
      if (
        phonePeAmount > 0 &&
        phonePeAmount !==
          expectedAmount
      ) {
        console.error(
          'Payment amount mismatch:',
          {
            phonePeAmount,
            expectedAmount,
          }
        );

        return res.redirect(
          `${frontendUrl}/`
        );
      }

      /*
       * ===================================================
       * TRANSACTION ID
       * ===================================================
       */
      const transactionId =
        statusResponse?.transactionId ||
        statusResponse?.data
          ?.transactionId ||
        statusResponse
          ?.transactionDetails?.[0]
          ?.transactionId ||
        statusResponse?.data
          ?.transactionDetails?.[0]
          ?.transactionId ||
        merchantOrderId;

      const now =
        new Date();

      /*
       * ===================================================
       * UPDATE ORDER
       * ===================================================
       */
      order.paymentStatus =
        'Paid';

      order.paymentMethod =
        'PhonePe';

      order.transactionId =
        String(transactionId);

      order.phonePeTransactionId =
        String(transactionId);

      order.amountPaid =
        toFiniteNumber(
          order.grandTotal,
          toFiniteNumber(
            order.totalAmount,
            0
          )
        );

      order.paymentDate =
        now
          .toISOString()
          .slice(0, 10);

      order.paymentTime =
        now.toLocaleTimeString();

      /*
       * IMPORTANT:
       *
       * Keep this value compatible with your Order schema.
       */
      order.status =
        'confirmed';

      await order.save();

      console.log(
        '========================================'
      );

      console.log(
        'PHONEPE PAYMENT SUCCESSFUL'
      );

      console.log(
        'YAMINI ORDER:',
        order.orderId
      );

      console.log(
        'PHONEPE ORDER:',
        merchantOrderId
      );

      console.log(
        'TRANSACTION:',
        transactionId
      );

      console.log(
        'AMOUNT:',
        order.amountPaid
      );

      console.log(
        'CUSTOMER EMAIL:',
        order.email
      );

      console.log(
        'SENDING PAYMENT SUCCESS EMAIL...'
      );

      console.log(
        '========================================'
      );

      /*
       * ===================================================
       * PAYMENT SUCCESS EMAIL
       * ===================================================
       *
       * The payment is already saved as Paid.
       *
       * Email failure should NOT change the payment result.
       */
      try {
        await sendPaymentSuccessEmail(
          order
        );
      } catch (emailError) {
        console.error(
          'Payment success email failed:',
          emailError
        );
      }

      /*
       * ===================================================
       * FINAL SUCCESS REDIRECT
       * ===================================================
       *
       * THIS IS THE IMPORTANT PART.
       *
       * PhonePe success
       *       ↓
       * Backend verification
       *       ↓
       * Order marked Paid
       *       ↓
       * Customer redirected directly to
       * Vercel Home page.
       */
      console.log(
        'Redirecting customer to Vercel Home:',
        frontendUrl
      );

      return res.redirect(
        `${frontendUrl}/`
      );
    }

    /*
     * =====================================================
     * FAILED / CANCELLED
     * =====================================================
     */
    if (
      state === 'FAILED' ||
      state === 'FAILURE' ||
      state === 'CANCELLED'
    ) {
      order.paymentStatus =
        'Failed';

      await order.save();

      console.log(
        'PhonePe payment failed/cancelled.'
      );

      /*
       * For now, return customer to Home as requested.
       */
      return res.redirect(
        `${frontendUrl}/`
      );
    }

    /*
     * =====================================================
     * PENDING / UNKNOWN
     * =====================================================
     *
     * Never mark the order as Paid.
     *
     * Return customer to Home as requested.
     */
    console.log(
      'PhonePe payment still pending or state is unknown:',
      state
    );

    return res.redirect(
      `${frontendUrl}/`
    );
  } catch (error) {
    console.error(
      'PhonePe return/verification error:',
      error
    );

    /*
     * If frontendUrl was successfully loaded before
     * the error, redirect safely to Home.
     *
     * If environment configuration itself is missing,
     * do NOT redirect to localhost.
     */
    if (frontendUrl) {
      return res.redirect(
        `${frontendUrl}/`
      );
    }

    /*
     * Production configuration is missing.
     *
     * Returning an error is safer than accidentally
     * redirecting a customer to localhost.
     */
    return res.status(500).json({
      success: false,
      message:
        'Payment callback configuration is missing. Please contact support.',
    });
  }
};

module.exports = {
  createPhonePeOrder,
  handlePhonePeReturn,
};
