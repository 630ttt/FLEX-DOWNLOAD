const express = require('express');
const router = express.Router();
const { protectCustomer } = require('../middleware/authMiddleware');
const {
  registerCustomer,
  loginCustomer,
  getMyProfile,
  updateMyProfile,
  getMyOrders,
  approveOrderDesign,
  rejectOrderDesign,
} = require('../controllers/customerAuthController');

router.post('/register', registerCustomer);
router.post('/login', loginCustomer);
router.get('/me', protectCustomer, getMyProfile);
router.put('/me', protectCustomer, updateMyProfile);
router.get('/me/orders', protectCustomer, getMyOrders);
router.put('/me/orders/:id/approve', protectCustomer, approveOrderDesign);
router.put('/me/orders/:id/reject', protectCustomer, rejectOrderDesign);

module.exports = router;
