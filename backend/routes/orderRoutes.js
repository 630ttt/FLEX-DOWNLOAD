const express = require('express');
const router = express.Router();

const upload = require('../middleware/uploadMiddleware');
const rejectPsdCustomerUploads = require('../middleware/rejectPsdCustomerUploads');

const {
  createOrder,
  getOrderById,
} = require('../controllers/orderController');

// Create order
router.post(
  '/',
  upload.array('customerFiles', 5),
  rejectPsdCustomerUploads,
  createOrder
);

// Get single order
router.get(
  '/:id',
  getOrderById
);

module.exports = router;