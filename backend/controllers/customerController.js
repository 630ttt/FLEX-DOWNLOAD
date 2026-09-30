const Customer = require('../models/Customer');

// @desc  Get all customers (admin, paginated)
// @route GET /api/admin/customers?page=1&limit=20&search=xxx
const getCustomers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.search) {
      const regex = new RegExp(req.query.search, 'i');
      filter.$or = [{ name: regex }, { phone: regex }, { email: regex }, { address: regex }];
    }

    const [customers, total] = await Promise.all([
      Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Customer.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: customers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Get single customer
// @route GET /api/admin/customers/:id
const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Update customer details from admin panel
// @route PUT /api/admin/customers/:id
const updateCustomerByAdmin = async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (phone && phone !== customer.phone) {
      const duplicatePhone = await Customer.findOne({ phone, _id: { $ne: customer._id } });
      if (duplicatePhone) {
        return res.status(409).json({ success: false, message: 'Phone number is already registered to another customer' });
      }
    }

    if (email && email.trim()) {
      const duplicateEmail = await Customer.findOne({ email: email.trim().toLowerCase(), _id: { $ne: customer._id } });
      if (duplicateEmail) {
        return res.status(409).json({ success: false, message: 'Email is already registered to another customer' });
      }
    }

    customer.name = name && name.trim() ? name.trim() : customer.name;
    customer.phone = phone && phone.trim() ? phone.trim() : customer.phone;
    customer.email = email && email.trim() ? email.trim().toLowerCase() : '';
    customer.address = address && address.trim() ? address.trim() : '';

    await customer.save();

    res.json({ success: true, message: 'Customer updated successfully', data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Delete customer permanently from admin panel
// @route DELETE /api/admin/customers/:id
const deleteCustomerByAdmin = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.json({ success: true, message: 'Customer deleted successfully', data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  updateCustomerByAdmin,
  deleteCustomerByAdmin,
};
