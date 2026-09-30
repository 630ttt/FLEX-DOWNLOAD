const mongoose = require('mongoose');

const adminSettingsSchema = new mongoose.Schema(
  {
    shopName: { type: String, required: true, trim: true, default: 'YAMINI FLEX PRINTING' },
    shopSubtitle: { type: String, trim: true, default: 'Cherukupalli' },
    phone: { type: String, trim: true, default: '7801016470' },
    whatsapp: { type: String, trim: true, default: '7801016470' },
    email: { type: String, trim: true, default: 'yamini.flex.printing@example.com' },
    address: { type: String, trim: true, default: 'Behind Bhaskar Theatre, Tenali Road, Cherukupalli' },
    logoText: { type: String, trim: true, default: 'YAMINI FLEX PRINTING' },
    primaryColor: { type: String, trim: true, default: '#0757b8' },
    secondaryColor: { type: String, trim: true, default: '#f5b800' },
    currency: { type: String, trim: true, default: 'INR' },
    paymentMode: { type: String, trim: true, default: 'Cash / UPI / PhonePe' },
    orderNotificationEmail: { type: Boolean, default: true },
    orderNotificationWhatsApp: { type: Boolean, default: true },
    autoDownloadAfterPayment: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdminSettings', adminSettingsSchema);
