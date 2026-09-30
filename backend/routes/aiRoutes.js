const express = require('express');
const upload = require('../middleware/uploadMiddleware');
const { customizeDesign, saveCustomizationPreview } = require('../controllers/aiController');
const localAiController = require('../controllers/localAiController');

const router = express.Router();
const generationRequests = new Map();
const generationRateLimit = (req, res, next) => {
	const now = Date.now();
	const key = req.ip || req.socket.remoteAddress || 'unknown';
	if (generationRequests.size > 5000) {
		for (const [storedKey, times] of generationRequests) {
			if (!times.some((time) => now - time < 60_000)) generationRequests.delete(storedKey);
		}
	}
	const recent = (generationRequests.get(key) || []).filter((time) => now - time < 60_000);
	if (recent.length >= 3) {
		return res.status(429).json({ success: false, code: 'AI_RATE_LIMITED', message: 'Please wait before requesting another generated image.' });
	}
	recent.push(now);
	generationRequests.set(key, recent);
	return next();
};

router.get('/health', localAiController.getHealth);
router.get('/generated/:filename', localAiController.getGenerated);
router.post('/generate', generationRateLimit, localAiController.generate);
router.post('/edit', generationRateLimit, upload.withMaxFileSize(15 * 1024 * 1024).fields([
	{ name: 'image', maxCount: 1 },
	{ name: 'mask', maxCount: 1 },
]), localAiController.edit);
router.post('/customize', upload.single('replacementImage'), customizeDesign);
router.post('/customizations', upload.single('preview'), saveCustomizationPreview);

module.exports = router;
