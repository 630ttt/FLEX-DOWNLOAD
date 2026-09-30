const {
  StandardCheckoutClient,
  StandardCheckoutPayRequest,
  Env,
} = require('@phonepe-pg/pg-sdk-node');

const clientId = process.env.PHONEPE_CLIENT_ID;
const clientSecret = process.env.PHONEPE_CLIENT_SECRET;
const clientVersion = Number(process.env.PHONEPE_CLIENT_VERSION || 1);

const phonePeEnv =
  String(process.env.PHONEPE_ENV || 'SANDBOX').toUpperCase() === 'PRODUCTION'
    ? Env.PRODUCTION
    : Env.SANDBOX;

if (!clientId || !clientSecret) {
  console.warn(
    'PhonePe credentials are not configured. PhonePe payments will not work until PHONEPE_CLIENT_ID and PHONEPE_CLIENT_SECRET are added.'
  );
}

const client = StandardCheckoutClient.getInstance(
  clientId,
  clientSecret,
  clientVersion,
  phonePeEnv
);

/**
 * Create a PhonePe Standard Checkout payment.
 *
 * PhonePe amount is sent in the lowest currency denomination.
 * For INR:
 * ₹100 = 10000 paise
 */
const createPhonePePayment = async ({
  merchantOrderId,
  amount,
  redirectUrl,
}) => {
  if (!merchantOrderId) {
    throw new Error('PhonePe merchant order ID is required');
  }

  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    throw new Error('Invalid PhonePe payment amount');
  }

  if (!redirectUrl) {
    throw new Error('PhonePe redirect URL is required');
  }

  const request = StandardCheckoutPayRequest.builder()
    .merchantOrderId(String(merchantOrderId))
    .amount(Math.round(Number(amount)))
    .redirectUrl(String(redirectUrl))
    .build();

  const response = await client.pay(request);

  if (!response || !response.redirectUrl) {
    throw new Error('PhonePe did not return a checkout URL');
  }

  return response;
};

/**
 * Get the current PhonePe order status.
 */
const getPhonePeOrderStatus = async (merchantOrderId) => {
  if (!merchantOrderId) {
    throw new Error('PhonePe merchant order ID is required');
  }

  return client.getOrderStatus(String(merchantOrderId));
};

module.exports = {
  createPhonePePayment,
  getPhonePeOrderStatus,
};