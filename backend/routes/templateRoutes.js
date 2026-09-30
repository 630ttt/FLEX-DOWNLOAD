const express = require('express');
const { listPublishedTemplates, getPublishedTemplate } = require('../controllers/templateController');

const router = express.Router();
router.get('/', listPublishedTemplates);
router.get('/:id', getPublishedTemplate);

module.exports = router;