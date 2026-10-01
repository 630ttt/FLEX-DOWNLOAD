const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const designUpload = upload.withDiskStorage();

const {
  getDesigns,
  getDesignById,
  createDesign,
  updateDesign,
  deleteDesign,
} = require('../controllers/designController');
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { getOrders, updateOrder } = require('../controllers/orderController');
const {
  getCustomers,
  getCustomerById,
  updateCustomerByAdmin,
  deleteCustomerByAdmin,
} = require('../controllers/customerController');
const { getAdminProfile, updateAdminProfile, updateAdminPassword } = require('../controllers/authController');
const {
  getAdminSettings,
  updateAdminSettings,
  uploadHomepageSectionImage,
} = require('../controllers/adminSettingsController');

router.use(protectAdmin);

// Designs
router.get('/designs', getDesigns);
router.get('/designs/:id', getDesignById);
router.post(
  '/designs',
  designUpload.fields([
    { name: 'designFile', maxCount: 1 },
    { name: 'previewImage', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
    { name: 'fullImage', maxCount: 1 },
    { name: 'templateBackground', maxCount: 1 },
  ]),
  createDesign
);
router.put(
  '/designs/:id',
  designUpload.fields([
    { name: 'designFile', maxCount: 1 },
    { name: 'previewImage', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
    { name: 'fullImage', maxCount: 1 },
    { name: 'templateBackground', maxCount: 1 },
  ]),
  updateDesign
);
router.delete('/designs/:id', deleteDesign);

// Categories
router.get('/categories', getCategories);
router.get('/categories/:id', getCategoryById);
router.post('/categories', upload.single('image'), createCategory);
router.put('/categories/:id', upload.single('image'), updateCategory);
router.delete('/categories/:id', deleteCategory);

// Orders
router.get('/orders', getOrders);
router.put('/orders/:id', upload.single('finalDesignFile'), updateOrder);

// Admin profile
router.get('/profile', getAdminProfile);
router.put('/profile', updateAdminProfile);
router.put('/profile/password', updateAdminPassword);

// Admin settings
router.get('/settings', getAdminSettings);
router.put('/settings', updateAdminSettings);
router.post('/settings/homepage-image', upload.single('image'), uploadHomepageSectionImage);

// Customers
router.get('/customers', getCustomers);
router.get('/customers/:id', getCustomerById);
router.put('/customers/:id', updateCustomerByAdmin);
router.delete('/customers/:id', deleteCustomerByAdmin);

module.exports = router;
