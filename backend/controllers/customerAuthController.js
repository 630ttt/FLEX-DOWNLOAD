const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const { normalizeDesignAssets } = require('./designController');

const generateCustomerToken = (customer) => {
  return jwt.sign(
    { id: customer._id, phone: customer.phone, type: 'customer' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// @desc  Register a new customer account
// @route POST /api/customers/register
const registerCustomer = async (req, res) => {
  try {
    const { name, phone, password, email, address } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Name, phone and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    let customer = await Customer.findOne({ phone }).select('+password');
    if (customer && customer.password) {
      return res.status(400).json({ success: false, message: 'An account with this phone number already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    if (customer) {
      // Customer record exists from a prior guest order but has no account yet
      customer.name = name;
      customer.email = email || customer.email;
      customer.address = address || customer.address;
      customer.password = hashedPassword;
      await customer.save();
    } else {
      customer = await Customer.create({ name, phone, email, address, password: hashedPassword });
    }

    const token = generateCustomerToken(customer);
    res.status(201).json({
      success: true,
      token,
      customer: { id: customer._id, name: customer.name, phone: customer.phone, email: customer.email, address: customer.address },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc  Login customer
// @route POST /api/customers/login
const loginCustomer = async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'Phone and password are required' });
    }

    const customer = await Customer.findOne({ phone }).select('+password');
    if (!customer || !customer.password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateCustomerToken(customer);
    res.json({
      success: true,
      token,
      customer: { id: customer._id, name: customer.name, phone: customer.phone, email: customer.email, address: customer.address },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Get logged-in customer's profile
// @route GET /api/customers/me
const getMyProfile = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Update logged-in customer's profile (name, email, address only)
// @route PUT /api/customers/me
const updateMyProfile = async (req, res) => {
  try {
    const { name, email, address } = req.body;
    const customer = await Customer.findByIdAndUpdate(
      req.customer.id,
      { name, email, address },
      { new: true, runValidators: true }
    );
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc  Get logged-in customer's orders (paginated)
// @route GET /api/customers/me/orders?page=1&limit=20
const getMyOrders = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter = { customer: req.customer.id };
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('design', 'title thumbnail fullImage sourceFile previewImage fileType customizable')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    const normalizedDesigns = await normalizeDesignAssets(orders.map((order) => order.design).filter(Boolean));
    let designIndex = 0;
    orders.forEach((order) => {
      if (order.design) order.design = normalizedDesigns[designIndex++];
    });

    res.json({
      success: true,
      data: orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Approve the uploaded final design for one of my orders
// @route PUT /api/customers/me/orders/:id/approve
const approveOrderDesign = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.customer.id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (!order.finalDesignFile) {
      return res.status(400).json({ success: false, message: 'No final design has been uploaded yet' });
    }

    order.finalDesignApproved = true;
    order.finalDesignApprovedAt = new Date();
    order.customerFeedback = '';
    order.status = 'approved';
    await order.save();

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc  Request changes to the uploaded final design for one of my orders
// @route PUT /api/customers/me/orders/:id/reject
const rejectOrderDesign = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.customer.id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (!order.finalDesignFile) {
      return res.status(400).json({ success: false, message: 'No final design has been uploaded yet' });
    }

    order.finalDesignApproved = false;
    order.finalDesignApprovedAt = null;
    order.customerFeedback = req.body.feedback || '';
    order.status = 'in-progress';
    await order.save();

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  registerCustomer,
  loginCustomer,
  getMyProfile,
  updateMyProfile,
  getMyOrders,
  approveOrderDesign,
  rejectOrderDesign,
};
