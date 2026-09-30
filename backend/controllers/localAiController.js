const crypto = require('crypto');
const sharp = require('sharp');
const { saveUpload } = require('../services/fileStorage');
const localAiServer = require('../services/localAiServer');

const MAX_PROMPT_LENGTH = 1500;
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 50_000_000;

const publicError = (error) => ({
  status: Number.isInteger(error?.status) ? error.status : 503,
  code: typeof error?.code === 'string' ? error.code : 'AI_SERVER_UNAVAILABLE',
  message: Number.isInteger(error?.status) && typeof error?.message === 'string'
    ? error.message
    : 'The local image service is unavailable.',
});

const getHealth = async (_req, res) => {
  try {
    return res.json({ success: true, data: await localAiServer.health() });
  } catch (error) {
    const safe = publicError(error);
    return res.status(safe.status).json({ success: false, code: safe.code, message: safe.message });
  }
};

const getGenerated = async (req, res) => {
  const filename = req.params?.filename;
  if (typeof filename !== 'string' || !/^design_[a-f\d]{32}\.png$/i.test(filename)) {
    return res.status(404).json({ success: false, message: 'Generated image not found.' });
  }
  try {
    const buffer = await localAiServer.getGeneratedImage(`/generated/${filename}`);
    return res.type('png').set('Cache-Control', 'private, max-age=300').send(buffer);
  } catch (error) {
    const safe = publicError(error);
    return res.status(safe.status).json({ success: false, code: safe.code, message: safe.message });
  }
};

const validatePrompt = (prompt) => typeof prompt === 'string' && prompt.trim().length > 0 && prompt.length <= MAX_PROMPT_LENGTH;

const saveGenerated = async ({ imageBuffer, imagePath, model }) => {
  let imageUrl;
  try {
    imageUrl = await saveUpload({
      originalname: `ai-generated-${crypto.randomUUID()}.png`,
      mimetype: 'image/png',
      size: imageBuffer.length,
      buffer: imageBuffer,
    });
  } catch (error) {
    const message = String(error?.message || 'Unknown storage error')
      .replace(/mongodb(?:\+srv)?:\/\/[^@\s]+@/gi, 'mongodb://[REDACTED]@')
      .slice(0, 500);
    console.error('[LOCAL AI IMAGE STORAGE FAILED]', {
      name: error?.name || 'Error',
      code: error?.code || '',
      message,
    });
    if (
      (Number(error?.code) === 8000 || /space quota|writes are blocked/i.test(message)) &&
      typeof imagePath === 'string' &&
      /^\/generated\/design_[a-f\d]{32}\.png$/i.test(imagePath)
    ) {
      return {
        imageUrl: `/api/ai/generated/${imagePath.slice('/generated/'.length)}`,
        model,
      };
    }
    const storageError = new Error('The generated image could not be saved in the application file store.');
    storageError.status = 503;
    storageError.code = 'AI_IMAGE_STORAGE_UNAVAILABLE';
    throw storageError;
  }
  return { imageUrl, model };
};

const generate = async (req, res) => {
  const { prompt, width = 512, height = 512, steps = 2 } = req.body || {};
  if (!validatePrompt(prompt)) {
    return res.status(400).json({ success: false, code: 'INVALID_PROMPT', message: 'Prompt must contain 1–1500 characters.' });
  }
  if (![width, height].every((value) => Number.isInteger(value) && value >= 256 && value <= 768 && value % 8 === 0)) {
    return res.status(400).json({ success: false, code: 'INVALID_DIMENSIONS', message: 'Width and height must be 256–768 and divisible by 8.' });
  }
  if (!Number.isInteger(steps) || steps < 1 || steps > 4) {
    return res.status(400).json({ success: false, code: 'INVALID_STEPS', message: 'Steps must be between 1 and 4 for the configured model.' });
  }
  try {
    const result = await localAiServer.generateImage({ prompt: prompt.trim(), width, height, steps });
    return res.json({ success: true, data: await saveGenerated(result) });
  } catch (error) {
    const safe = publicError(error);
    return res.status(safe.status).json({ success: false, code: safe.code, message: safe.message });
  }
};

const edit = async (req, res) => {
  const prompt = req.body?.prompt;
  if (!validatePrompt(prompt)) {
    return res.status(400).json({ success: false, code: 'INVALID_PROMPT', message: 'Prompt must contain 1–1500 characters.' });
  }
  const file = req.files?.image?.[0] || req.file;
  const maskFile = req.files?.mask?.[0] || null;
  if (!file || !Buffer.isBuffer(file.buffer) || file.size > MAX_UPLOAD_BYTES) {
    return res.status(400).json({ success: false, code: 'INVALID_IMAGE', message: 'A PNG, JPG, or WebP image of 15 MB or smaller is required.' });
  }
  try {
    const metadata = await sharp(file.buffer, { limitInputPixels: MAX_IMAGE_PIXELS }).metadata();
    const mimeType = metadata.format === 'jpeg' ? 'image/jpeg' : `image/${metadata.format}`;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(mimeType) || file.mimetype !== mimeType) {
      return res.status(400).json({ success: false, code: 'INVALID_IMAGE', message: 'Source image must be a valid PNG, JPG, or WebP.' });
    }
    let maskBuffer;
    if (maskFile) {
      if (!Buffer.isBuffer(maskFile.buffer) || maskFile.size > MAX_UPLOAD_BYTES || maskFile.mimetype !== 'image/png') {
        return res.status(400).json({ success: false, code: 'INVALID_MASK', message: 'Text mask must be a PNG image of 15 MB or smaller.' });
      }
      const maskMetadata = await sharp(maskFile.buffer, { limitInputPixels: MAX_IMAGE_PIXELS }).metadata();
      if (maskMetadata.format !== 'png' || maskMetadata.width !== metadata.width || maskMetadata.height !== metadata.height) {
        return res.status(400).json({ success: false, code: 'INVALID_MASK', message: 'Text mask dimensions must match the source image.' });
      }
      maskBuffer = maskFile.buffer;
    }
    const result = await localAiServer.editImage({ imageBuffer: file.buffer, mimeType, prompt: prompt.trim(), maskBuffer });
    return res.json({ success: true, data: await saveGenerated(result) });
  } catch (error) {
    const safe = publicError(error);
    return res.status(safe.status).json({ success: false, code: safe.code, message: safe.message });
  }
};

module.exports = { getHealth, getGenerated, generate, edit };