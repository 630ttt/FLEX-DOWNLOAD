const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

const generateToken = (admin) => {
  return jwt.sign(
    { id: admin._id, username: admin.username, role: admin.role, type: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const safeAdmin = (admin) => ({
  id: admin._id,
  name: admin.name,
  username: admin.username,
  role: admin.role,
  createdAt: admin.createdAt,
  updatedAt: admin.updatedAt,
});

// @desc  Login admin
// @route POST /api/admin/auth/login
const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const admin = await Admin.findOne({ username: username.toLowerCase() });
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(admin);
    res.json({
      success: true,
      message: 'Login successful',
      token,
      admin: { id: admin._id, name: admin.name, username: admin.username, role: admin.role },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get current admin profile
// @route GET /api/admin/profile
const getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('-password');
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin profile not found' });
    }
    res.json({ success: true, data: safeAdmin(admin) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Update current admin profile
// @route PUT /api/admin/profile
const updateAdminProfile = async (req, res) => {
  try {
    const { name, username } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    if (!username || !username.trim()) {
      return res.status(400).json({ success: false, message: 'Username is required' });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const duplicate = await Admin.findOne({ username: normalizedUsername, _id: { $ne: req.admin.id } });
    if (duplicate) {
      return res.status(409).json({ success: false, message: 'Username already exists' });
    }

    const admin = await Admin.findById(req.admin.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin profile not found' });
    }

    admin.name = name.trim();
    admin.username = normalizedUsername;
    await admin.save();

    const token = generateToken(admin);
    res.json({
      success: true,
      message: 'Profile updated successfully',
      token,
      admin: { id: admin._id, name: admin.name, username: admin.username, role: admin.role },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Change current admin password
// @route PUT /api/admin/profile/password
const updateAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'Current password, new password and confirmation are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New password and confirmation do not match' });
    }

    const admin = await Admin.findById(req.admin.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin profile not found' });
    }

    const validOldPassword = await bcrypt.compare(currentPassword, admin.password);
    if (!validOldPassword) {
      return res.status(400).json({ success: false, message: 'Current password is not correct' });
    }

    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { loginAdmin, getAdminProfile, updateAdminProfile, updateAdminPassword };
