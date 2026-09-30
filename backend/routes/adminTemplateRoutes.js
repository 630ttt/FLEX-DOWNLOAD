const express = require('express');
const upload = require('../middleware/uploadMiddleware');
const { protectAdmin } = require('../middleware/authMiddleware');
const { MAX_ASSET_BYTES } = require('../services/templateService');
const {
  listAdminTemplates,
  getAdminTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  publishTemplate,
  duplicateTemplate,
  uploadTemplateAsset,
  updateTemplatePreview,
} = require('../controllers/templateController');

const router = express.Router();
const templateUpload = upload.withMaxFileSize(MAX_ASSET_BYTES);
router.use(protectAdmin);

router.post('/assets', templateUpload.single('asset'), uploadTemplateAsset);
router.get('/', listAdminTemplates);
router.post('/', templateUpload.single('preview'), createTemplate);
router.get('/:id', getAdminTemplate);
router.put('/:id', templateUpload.single('preview'), updateTemplate);
router.delete('/:id', deleteTemplate);
router.post('/:id/publish', publishTemplate);
router.post('/:id/duplicate', duplicateTemplate);
router.post('/:id/preview', templateUpload.single('preview'), updateTemplatePreview);

module.exports = router;