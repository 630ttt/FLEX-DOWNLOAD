const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const {
  getTemplateFallback,
  publicPipelineError,
  validateReplacementImage,
} = require('../controllers/aiController');
const { AiConfigurationError } = require('../services/ai/providerRegistry');

test('existing editableTemplate designs retain the prior mock edit fallback', async () => {
  const previousProvider = process.env.AI_EDIT_PROVIDER;
  process.env.AI_EDIT_PROVIDER = 'mock';
  try {
    const fallback = await getTemplateFallback({
      title: 'Legacy Template',
      editableTemplate: {
        enabled: true,
        backgroundImage: '/api/files/507f1f77bcf86cd799439011',
        width: 1200,
        height: 800,
        textLayers: [{ key: 'name', x: 5, y: 5, width: 90, height: 12 }],
      },
    }, 'Change the name to Yamini Flex', {});
    assert.equal(fallback.mode, 'template');
    assert.equal(fallback.edits.name, 'Yamini Flex');
  } finally {
    if (previousProvider === undefined) delete process.env.AI_EDIT_PROVIDER;
    else process.env.AI_EDIT_PROVIDER = previousProvider;
  }
});

test('replacement photo upload validates image bytes, MIME and size', async () => {
  const image = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#123456' } }).png().toBuffer();
  const accepted = await validateReplacementImage({ buffer: image, size: image.length, mimetype: 'image/png' });
  assert.deepEqual(accepted, image);
  await assert.rejects(validateReplacementImage({ buffer: Buffer.from('not image'), size: 9, mimetype: 'image/png' }));
  await assert.rejects(validateReplacementImage({ buffer: image, size: 11 * 1024 * 1024, mimetype: 'image/png' }), /10 MB/);
});

test('provider configuration errors are actionable without exposing secret values', () => {
  const error = new AiConfigurationError('AI_VISION_PROVIDER is not configured');
  const result = publicPipelineError(error);
  assert.equal(result.status, 503);
  assert.match(result.message, /AI_VISION_PROVIDER/);
  assert.doesNotMatch(result.message, /secret|sk-/i);
});

test('vision quota failures preserve their quota code and message', () => {
  const error = new Error('The configured vision provider has exhausted its quota.');
  error.code = 'AI_VISION_QUOTA_EXHAUSTED';
  error.status = 429;
  const result = publicPipelineError(error);
  assert.equal(result.status, 429);
  assert.equal(result.code, 'AI_VISION_QUOTA_EXHAUSTED');
  assert.match(result.message, /exhausted its quota/);
  assert.doesNotMatch(result.message, /editable|clean background|template/i);
});
