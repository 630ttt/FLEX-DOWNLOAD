const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

// Check email configuration when server starts
transporter.verify((error) => {
  if (error) {
    console.error('Email service configuration error:', error.message);
  } else {
    console.log('Email service is ready');
  }
});

/**
 * Send Order Confirmation Email
 */
const sendOrderConfirmationEmail = async (order) => {
  if (!order?.email) {
    console.log('No customer email. Order confirmation email skipped.');
    return;
  }

  const mailOptions = {
    from: `"Yamini Flex Printing" <${process.env.EMAIL_USER}>`,
    to: order.email,
    subject: `Order Confirmation - ${order.orderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">

        <h2 style="text-align: center;">
          Order Confirmed
        </h2>

        <p>Dear ${order.name || 'Customer'},</p>

        <p>
          Thank you for placing your order with
          <strong>Yamini Flex Printing</strong>.
        </p>

        <p>
          Your order has been successfully placed.
        </p>

        <hr>

        <h3>Order Details</h3>

        <p>
          <strong>Order ID:</strong> ${order.orderId}
        </p>

        <p>
          <strong>Quantity:</strong> ${order.quantity}
        </p>

        <p>
          <strong>Material:</strong> ${order.material || 'N/A'}
        </p>

        <p>
          <strong>Total Amount:</strong>
          ₹${Number(order.totalAmount || order.grandTotal || 0).toFixed(2)}
        </p>

        <p>
          <strong>Payment Method:</strong>
          ${order.paymentMethod || 'N/A'}
        </p>

        <p>
          <strong>Order Status:</strong>
          ${order.status || 'pending'}
        </p>

        <hr>

        <p>
          We have received your order and will process it shortly.
        </p>

        <p>
          Thank you for choosing Yamini Flex Printing.
        </p>

      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(
      `Order confirmation email sent to ${order.email}`
    );
  } catch (error) {
    console.error(
      'Order confirmation email failed:',
      error.message
    );
  }
};


/**
 * Send Payment Successful Email
 */
const sendPaymentSuccessEmail = async (order) => {
  if (!order?.email) {
    console.log('No customer email. Payment email skipped.');
    return;
  }

  const mailOptions = {
    from: `"Yamini Flex Printing" <${process.env.EMAIL_USER}>`,
    to: order.email,
    subject: `Payment Successful - ${order.orderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">

        <h2 style="text-align: center;">
          Payment Successful
        </h2>

        <p>Dear ${order.name || 'Customer'},</p>

        <p>
          Your payment has been successfully received.
        </p>

        <hr>

        <h3>Payment Details</h3>

        <p>
          <strong>Order ID:</strong> ${order.orderId}
        </p>

        <p>
          <strong>Payment Method:</strong> PhonePe
        </p>

        <p>
          <strong>Amount Paid:</strong>
          ₹${Number(order.amountPaid || 0).toFixed(2)}
        </p>

        <p>
          <strong>Transaction ID:</strong>
          ${order.transactionId || 'N/A'}
        </p>

        <p>
          <strong>Payment Date:</strong>
          ${order.paymentDate || 'N/A'}
        </p>

        <p>
          <strong>Payment Time:</strong>
          ${order.paymentTime || 'N/A'}
        </p>

        <p>
          <strong>Payment Status:</strong>
          ${order.paymentStatus || 'Paid'}
        </p>

        <hr>

        <p>
          Your order will now continue through our processing workflow.
        </p>

        <p>
          Thank you for choosing Yamini Flex Printing.
        </p>

      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(
      `Payment success email sent to ${order.email}`
    );
  } catch (error) {
    console.error(
      'Payment success email failed:',
      error.message
    );
  }
};


/**
 * Send Order Status Update Email
 */
const sendOrderStatusUpdateEmail = async (
  order,
  oldStatus
) => {
  if (!order?.email) {
    console.log('No customer email. Status email skipped.');
    return;
  }

  const mailOptions = {
    from: `"Yamini Flex Printing" <${process.env.EMAIL_USER}>`,
    to: order.email,
    subject: `Order Update - ${order.orderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">

        <h2 style="text-align: center;">
          Order Status Updated
        </h2>

        <p>Dear ${order.name || 'Customer'},</p>

        <p>
          There has been an update to your order.
        </p>

        <hr>

        <p>
          <strong>Order ID:</strong> ${order.orderId}
        </p>

        <p>
          <strong>Previous Status:</strong>
          ${oldStatus || 'N/A'}
        </p>

        <p>
          <strong>Current Status:</strong>
          ${order.status}
        </p>

        <hr>

        <p>
          We will keep you updated as your order progresses.
        </p>

        <p>
          Thank you for choosing Yamini Flex Printing.
        </p>

      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(
      `Order status email sent to ${order.email}`
    );
  } catch (error) {
    console.error(
      'Order status email failed:',
      error.message
    );
  }
};


module.exports = {
  sendOrderConfirmationEmail,
  sendPaymentSuccessEmail,
  sendOrderStatusUpdateEmail,
};