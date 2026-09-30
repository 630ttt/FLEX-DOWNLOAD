const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Design = require('../models/Design');
const jwt = require('jsonwebtoken');
const { saveUpload, saveUploads } = require('../services/fileStorage');

const {
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
} = require('../services/emailService');

const toFiniteNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const normalizePaymentMethod = (method) => {
  if (!method) return 'COD';

  const value = String(method).trim();

  if (value === 'COD') return 'COD';

  if (
    ['PhonePe', 'UPI', 'Direct Bank Transfer'].includes(value)
  ) {
    return value;
  }

  return 'COD';
};

// @desc    Create order
// @route   POST /api/orders
// @access  Public / Customer
const createOrder = async (req, res) => {
  try {
    const body = req.body || {};

    const designId = body.designId || body.design;

    const phone =
      body.phone ||
      body.whatsapp ||
      body.phoneNumber ||
      '';

    const name =
      body.name ||
      body.fullName ||
      '';

    const email = body.email || '';

    const address =
      body.address ||
      body.deliveryAddress ||
      body.homeAddress ||
      '';

    const deliveryAddress =
      body.deliveryAddress ||
      address ||
      '';

    const size =
      body.size ||
      body.hoardingSize ||
      '';

    const quantity = Math.max(
      1,
      toFiniteNumber(body.quantity, 1)
    );

    const customizationNotes =
      body.customizationNotes ||
      body.specialChanges ||
      '';

    const customizedDesignFile = body.customizedDesignFile || '';
    if (customizedDesignFile && !/^\/api\/files\/[a-f\d]{24}$/i.test(customizedDesignFile)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customized design file reference',
      });
    }

    // --------------------------------------------------
    // Validate design
    // --------------------------------------------------

    const design = await Design.findById(designId);

    if (!design) {
      return res.status(404).json({
        success: false,
        message: 'Design not found',
      });
    }

    // --------------------------------------------------
    // Find authenticated customer
    // --------------------------------------------------

    let customer = null;

    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(
          authHeader.split(' ')[1],
          process.env.JWT_SECRET
        );

        if (decoded.type === 'customer') {
          customer = await Customer.findById(decoded.id);
        }
      } catch {
        // Invalid token.
        // Continue as guest/customer lookup.
      }
    }

    // --------------------------------------------------
    // Find customer by phone if not authenticated
    // --------------------------------------------------

    if (!customer && phone) {
      customer = await Customer.findOne({ phone });
    }

    // --------------------------------------------------
    // Create customer if necessary
    // --------------------------------------------------

    if (!customer) {
      customer = await Customer.create({
        name,
        phone,
        email,
        address,
      });
    } else {
      let customerChanged = false;

      if (name && name !== customer.name) {
        customer.name = name;
        customerChanged = true;
      }

      if (email && email !== customer.email) {
        customer.email = email;
        customerChanged = true;
      }

      if (address && address !== customer.address) {
        customer.address = address;
        customerChanged = true;
      }

      if (customerChanged) {
        await customer.save();
      }
    }

    // --------------------------------------------------
    // Save uploaded customer files
    // --------------------------------------------------

    const customerFileUploads = await saveUploads(
      req.files || []
    );

    // --------------------------------------------------
    // Generate order ID
    // --------------------------------------------------

    const orderDate = new Date();

    const datePart = orderDate
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '');

    const count = await Order.countDocuments();

    const orderId = `YF-${datePart}-${String(
      count + 1
    ).padStart(3, '0')}`;

    // --------------------------------------------------
    // Calculate prices
    // --------------------------------------------------

    const baseDesignPrice = toFiniteNumber(
      design.price,
      0
    );

    const materialPrice = toFiniteNumber(
      body.materialPrice,
      baseDesignPrice
    );

    const pricePerSqFt = toFiniteNumber(
      body.pricePerSqFt,
      baseDesignPrice
    );

    const designBasePrice = toFiniteNumber(
      body.designBasePrice,
      baseDesignPrice
    );

    const calculatedTotal = Math.max(
      0,
      baseDesignPrice * quantity
    );

    const grandTotal = Math.max(
      0,
      toFiniteNumber(
        body.grandTotal,
        calculatedTotal
      )
    );

    const totalAmount = Math.max(
      0,
      toFiniteNumber(
        body.totalAmount,
        grandTotal
      )
    );

    // --------------------------------------------------
    // Payment
    // --------------------------------------------------

    const paymentMethod = normalizePaymentMethod(
      body.paymentMethod
    );

    const selectedPaymentStatus =
      paymentMethod === 'COD'
        ? 'COD / Pending'
        : 'Pending';

    // --------------------------------------------------
    // Create order
    // --------------------------------------------------

    const order = await Order.create({
      orderId,

      design: design._id,

      customer: customer._id,

      occasion: body.occasion || '',

      hoardingSize: size,

      size,

      quantity,

      material: body.material || '',

      materialPrice,

      pricePerSqFt,

      designBasePrice,

      grandTotal,

      totalAmount,

      customizationNotes,

      customizedDesignFile,

      celebrantName:
        body.celebrantName || '',

      slogan:
        body.slogan ||
        body.occasion ||
        '',

      eventDate:
        body.eventDate || '',

      customerFileUploads,

      mainSubjectPhoto:
        customerFileUploads[0] || '',

      additionalPhotos:
        customerFileUploads.slice(1),

      specialChanges:
        body.specialChanges ||
        customizationNotes ||
        '',

      paymentMethod,

      paymentStatus:
        selectedPaymentStatus,

      transactionId:
        body.transactionId || '',

      amountPaid: 0,

      paymentDate:
        body.paymentDate ||
        orderDate.toISOString().slice(0, 10),

      paymentTime:
        body.paymentTime ||
        orderDate.toLocaleTimeString(),

      name,

      email,

      phone,

      address,

      deliveryMode:
        body.deliveryMode ||
        'studio-pickup',

      deliveryAddress,

      functionHallAddress:
        body.functionHallAddress || '',

      // Must match Order.js enum
      status: 'pending',

      finalDesignFile: '',

      finalDesignApproved: false,

      finalDesignApprovedAt: null,

      customerFeedback: '',
    });

    // --------------------------------------------------
    // Send Order Confirmation Email
    // --------------------------------------------------
    // IMPORTANT:
    // Do not wait for the email before returning
    // the newly-created order to the frontend.
    //
    // This makes the order creation request faster.
    // Email continues in the background.
    // --------------------------------------------------

    sendOrderConfirmationEmail(order).catch((error) => {
      console.error(
        'Background order confirmation email error:',
        error.message
      );
    });

    // --------------------------------------------------
    // Return response immediately
    // --------------------------------------------------

    return res.status(201).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Create order error:', error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Public / Customer
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate(
        'design',
        'title thumbnail price'
      )
      .populate(
        'customer',
        'name phone email address'
      );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    return res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all orders
// @route   GET /api/admin/orders?page=1&limit=20&status=pending
// @access  Admin
const getOrders = async (req, res) => {
  try {
    const page = Math.max(
      parseInt(req.query.page, 10) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        parseInt(req.query.limit, 10) || 20,
        1
      ),
      100
    );

    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate(
          'design',
          'title thumbnail'
        )
        .populate(
          'customer',
          'name phone email address'
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      Order.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(
          total / limit
        ),
      },
    });
  } catch (error) {
    console.error('Get orders error:', error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update order status / upload final design
// @route   PUT /api/admin/orders/:id
// @access  Admin
const updateOrder = async (req, res) => {
  try {
    const updates = {
      ...req.body,
    };

    // --------------------------------------------------
    // Get existing order first
    // --------------------------------------------------

    const existingOrder =
      await Order.findById(req.params.id);

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const oldStatus = existingOrder.status;

    // --------------------------------------------------
    // Allowed order statuses
    // --------------------------------------------------

    const allowedStatuses = [
      'pending',
      'confirmed',
      'in-progress',
      'awaiting-approval',
      'approved',
      'ready',
      'delivered',
      'cancelled',
    ];

    // --------------------------------------------------
    // Validate status
    // --------------------------------------------------

    if (updates.status) {
      if (!allowedStatuses.includes(updates.status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid order status: ${updates.status}`,
        });
      }
    }

    // --------------------------------------------------
    // Final design upload
    // --------------------------------------------------

    if (req.file) {
      updates.finalDesignFile =
        await saveUpload(req.file);

      // Whenever admin uploads a new design,
      // customer must review it again.
      updates.status =
        'awaiting-approval';

      updates.finalDesignApproved =
        false;

      updates.finalDesignApprovedAt =
        null;

      updates.customerFeedback = '';
    }

    // --------------------------------------------------
    // Update order
    // --------------------------------------------------

    const order =
      await Order.findByIdAndUpdate(
        req.params.id,
        updates,
        {
          new: true,
          runValidators: true,
        }
      );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // --------------------------------------------------
    // Send Order Status Update Email
    // --------------------------------------------------

    if (oldStatus !== order.status) {
      sendOrderConfirmationEmail(order).catch((error) => {
        console.error(
          'Background order confirmation email error:',
          error.message
        );
      });
    }

    return res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Update order error:', error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createOrder,
  getOrderById,
  getOrders,
  updateOrder,
};
