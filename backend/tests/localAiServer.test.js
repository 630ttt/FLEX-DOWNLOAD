const test = require('node:test');
const assert = require('node:assert/strict');
const { generateImage, health } = require('../services/localAiServer');

const originalFetch = global.fetch;
const originalServerUrl = process.env.AI_SERVER_URL;

test.afterEach(() => {
  global.fetch = originalFetch;
  if (originalServerUrl === undefined) delete process.env.AI_SERVER_URL;
  else process.env.AI_SERVER_URL = originalServerUrl;
});

test('reports missing local AI configuration without exposing internals', async () => {
  delete process.env.AI_SERVER_URL;
  await assert.rejects(health(), (error) => error.code === 'AI_CONFIGURATION_REQUIRED' && error.status === 503);
});

test('maps an offline Python server to a clean unavailable error', async () => {
  process.env.AI_SERVER_URL = 'http://127.0.0.1:8000';
  global.fetch = async () => { throw new TypeError('connect ECONNREFUSED 127.0.0.1'); };
  await assert.rejects(health(), (error) => error.code === 'AI_SERVER_UNAVAILABLE' && !error.message.includes('ECONNREFUSED'));
});

test('rejects generated image paths outside the generated-file route', async () => {
  process.env.AI_SERVER_URL = 'http://127.0.0.1:8000';
  global.fetch = async () => new Response(JSON.stringify({ success: true, image_url: '/uploads/private.png' }), {
    headers: { 'Content-Type': 'application/json' },
  });
  await assert.rejects(
    generateImage({ prompt: 'Artwork', width: 512, height: 512, steps: 2 }),
    (error) => error.code === 'AI_SERVER_INVALID_RESPONSE' && error.status === 502,
  );
});

test('downloads only a unique generated PNG returned by the local service', async () => {
  process.env.AI_SERVER_URL = 'http://127.0.0.1:8000';
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  let requestCount = 0;
  global.fetch = async (url) => {
    requestCount += 1;
    if (String(url).endsWith('/generate')) {
      return new Response(JSON.stringify({
        success: true,
        image_url: `/generated/design_${'a'.repeat(32)}.png`,
        model: 'stabilityai/sd-turbo',
      }), { headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(png, { headers: { 'Content-Type': 'image/png' } });
  };
  const result = await generateImage({ prompt: 'Artwork', width: 512, height: 512, steps: 2 });
  assert.deepEqual(result.imageBuffer, png);
  assert.equal(result.imagePath, `/generated/design_${'a'.repeat(32)}.png`);
  assert.equal(result.model, 'stabilityai/sd-turbo');
  assert.equal(requestCount, 2);
});