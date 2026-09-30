const express = require('express');

const router = express.Router();

const {
  createPhonePeOrder,
  handlePhonePeReturn,
} = require('../controllers/paymentController');

// Create PhonePe payment
router.post(
  '/phonepe/create',
  createPhonePeOrder
);

// PhonePe redirects here after checkout
router.get(
  '/phonepe/return',
  handlePhonePeReturn
);

module.exports = router;