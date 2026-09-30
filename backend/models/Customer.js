const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, unique: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    address: { type: String, trim: true, default: '' },
    password: { type: String, select: false }, // set only when customer registers an account
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);
