const AdminSettings = require('../models/AdminSettings');

const defaultSettings = {
  shopName: 'YAMINI FLEX PRINTING',
  shopSubtitle: 'Cherukupalli',
  phone: '7801016470',
  whatsapp: '7801016470',
  email: 'yamini.flex.printing@example.com',
  address: 'Behind Bhaskar Theatre, Tenali Road, Cherukupalli',
  logoText: 'YAMINI FLEX PRINTING',
  primaryColor: '#0757b8',
  secondaryColor: '#f5b800',
  currency: 'INR',
  paymentMode: 'Cash / UPI / PhonePe',
  orderNotificationEmail: true,
  orderNotificationWhatsApp: true,
  autoDownloadAfterPayment: true,
};

const getAdminSettings = async (req, res) => {
  try {
    let settings = await AdminSettings.findOne();
    if (!settings) {
      settings = await AdminSettings.create(defaultSettings);
    }

    return res.json({ success: true, data: settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Unable to load admin settings' });
  }
};

const updateAdminSettings = async (req, res) => {
  try {
    const incoming = req.body || {};
    const allowedFields = Object.keys(defaultSettings);

    const clean = {};
    allowedFields.forEach((key) => {
      if (incoming[key] !== undefined) {
        clean[key] = incoming[key];
      }
    });

    const merged = { ...defaultSettings, ...clean };

    if (!merged.shopName || !String(merged.shopName).trim()) {
      return res.status(400).json({ success: false, message: 'Shop name is required' });
    }

    if (!merged.phone || !String(merged.phone).trim()) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const settings = await AdminSettings.findOneAndUpdate(
      {},
      { $set: merged },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return res.json({ success: true, message: 'Admin settings updated successfully', data: settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Unable to update admin settings' });
  }
};

module.exports = {
  defaultSettings,
  getAdminSettings,
  updateAdminSettings,
};
