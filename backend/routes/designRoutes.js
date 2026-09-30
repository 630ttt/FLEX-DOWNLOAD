const express = require('express');
const router = express.Router();
const { getDesigns, getDesignById } = require('../controllers/designController');

router.get('/', getDesigns);
router.get('/:id', getDesignById);

module.exports = router;
