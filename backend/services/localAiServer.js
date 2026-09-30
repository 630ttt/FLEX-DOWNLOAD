const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

class LocalAiServerError extends Error {
  constructor(message, status = 503, code = 'AI_SERVER_UNAVAILABLE') {
    super(message);
    this.name = 'LocalAiServerError';
    this.status = status;
    this.code = code;
  }
}

const getServerUrl = () => {
  const configuredUrl = process.env.AI_SERVER_URL?.trim();
  if (!configuredUrl) throw new LocalAiServerError('The local AI server is not configured.', 503, 'AI_CONFIGURATION_REQUIRED');
  try {
    const url = new URL(configuredUrl);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported protocol');
    return url;
  } catch {
    throw new LocalAiServerError('The local AI server URL is invalid.', 503, 'AI_CONFIGURATION_REQUIRED');
  }
};

const getTimeout = () => {
  const configuredSeconds = Number(process.env.AI_SERVER_TIMEOUT || 180);
  return Number.isFinite(configuredSeconds)
    ? Math.min(300000, Math.max(1000, configuredSeconds * 1000))
    : 180000;
};

const fetchWithTimeout = async (url, options = {}) => {
  try {
    return await fetch(url, { ...options, signal: AbortSignal.timeout(getTimeout()) });
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new LocalAiServerError('The local image service timed out. Try a smaller image or fewer steps.', 504, 'AI_SERVER_TIMEOUT');
    }
    throw new LocalAiServerError('The local image service is unavailable.', 503, 'AI_SERVER_UNAVAILABLE');
  }
};

const readJson = async (response) => {
  try {
    return await response.json();
  } catch {
    throw new LocalAiServerError('The local image service returned an invalid response.', 502, 'AI_SERVER_INVALID_RESPONSE');
  }
};

const health = async () => {
  const response = await fetchWithTimeout(new URL('/health', getServerUrl()));
  const body = await readJson(response);
  if (!response.ok || body.status !== 'ok') throw new LocalAiServerError('The local image model is not ready.', 503, 'AI_MODEL_UNAVAILABLE');
  return body;
};

const getGeneratedImage = async (imagePath, serverUrl = getServerUrl()) => {
  if (typeof imagePath !== 'string' || !/^\/generated\/design_[a-f\d]{32}\.png$/i.test(imagePath)) {
    throw new LocalAiServerError('The local image service returned an invalid image reference.', 502, 'AI_SERVER_INVALID_RESPONSE');
  }
  const imageUrl = new URL(imagePath, serverUrl);
  if (imageUrl.origin !== serverUrl.origin) throw new LocalAiServerError('The local image service returned an invalid image reference.', 502, 'AI_SERVER_INVALID_RESPONSE');
  const response = await fetchWithTimeout(imageUrl);
  if (!response.ok || !/^image\/png(?:;|$)/i.test(response.headers.get('content-type') || '')) {
    throw new LocalAiServerError('The local image service could not provide the generated image.', 502, 'AI_SERVER_INVALID_RESPONSE');
  }
  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (declaredLength > MAX_IMAGE_BYTES) throw new LocalAiServerError('Generated image exceeded the allowed size.', 502, 'AI_IMAGE_TOO_LARGE');
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_IMAGE_BYTES || !buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new LocalAiServerError('The local image service returned an invalid image.', 502, 'AI_SERVER_INVALID_RESPONSE');
  }
  return buffer;
};

const requestImage = async (path, options) => {
  const serverUrl = getServerUrl();
  const response = await fetchWithTimeout(new URL(path, serverUrl), options);
  const body = await readJson(response);
  if (!response.ok || body.success !== true) {
    const status = response.status === 422 || response.status === 400 ? 400 : 502;
    throw new LocalAiServerError(
      status === 400 ? 'The image request was rejected by the local service.' : 'The local image service could not generate the image.',
      status,
      'AI_GENERATION_FAILED',
    );
  }
  const imageBuffer = await getGeneratedImage(body.image_url, serverUrl);
  return {
    imageBuffer,
    imagePath: body.image_url,
    model: typeof body.model === 'string' ? body.model.slice(0, 200) : 'configured-model',
  };
};

const generateImage = async ({ prompt, width, height, steps }) => requestImage('/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt, width, height, steps }),
});

const editImage = async ({ imageBuffer, mimeType, prompt, steps = 4, referenceImage, maskBuffer }) => {
  const form = new FormData();
  form.append('prompt', prompt);
  form.append('steps', String(steps));
  form.append('image', new Blob([imageBuffer], { type: mimeType }), 'design.png');
  if (referenceImage?.buffer && referenceImage?.mimetype) {
    form.append('reference_image', new Blob([referenceImage.buffer], { type: referenceImage.mimetype }), 'reference.png');
  }
  if (Buffer.isBuffer(maskBuffer)) form.append('mask', new Blob([maskBuffer], { type: 'image/png' }), 'mask.png');
  return requestImage('/edit', { method: 'POST', body: form });
};

module.exports = { LocalAiServerError, health, generateImage, editImage, getGeneratedImage, getServerUrl };