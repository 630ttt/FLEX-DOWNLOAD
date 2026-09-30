const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const sharp = require('sharp');
const {
  analyzeDesignImage,
  getCachedOrAnalyzeDesign,
  readDesignRasterSource,
  ANALYSIS_VERSION,
} = require('../services/ai/imageAnalysisService');
const { parseInstruction } = require('../services/ai/instructionParserService');
const { replaceImageRegions, inpaintTextRegions, editImage } = require('../services/ai/imageEditingService');
const { inpaintTextElements } = require('../services/ai/localTextInpaintingService');
const { renderExactText, getTextSvg } = require('../services/ai/imageRenderingService');
const { resolveProvider, registerProvider, unregisterProvider, AiConfigurationError } = require('../services/ai/providerRegistry');
const Design = require('../models/Design');

const makeImage = (format = 'png', background = '#234567') => sharp({
  create: { width: 400, height: 220, channels: 3, background },
}).toFormat(format).toBuffer();

const textElements = [
  { id: 'name-1', type: 'text', semanticType: 'business_name', text: 'ABC Traders', bbox: { x: 20, y: 20, width: 180, height: 40 }, confidence: 0.96, fontSize: 28, alignment: 'center', textColor: '#ffffff' },
  { id: 'phone-1', type: 'text', semanticType: 'phone', text: '1234567890', bbox: { x: 20, y: 75, width: 180, height: 32 }, confidence: 0.94, fontSize: 22, alignment: 'left', textColor: '#ffffff' },
  { id: 'offer-1', type: 'text', semanticType: 'offer', text: '10% OFF', bbox: { x: 20, y: 120, width: 180, height: 34 }, confidence: 0.91, fontSize: 24, alignment: 'center', textColor: '#ffdd00' },
  { id: 'price-1', type: 'text', semanticType: 'price', text: '₹500', bbox: { x: 20, y: 165, width: 180, height: 30 }, confidence: 0.9, fontSize: 22, alignment: 'center', textColor: '#ffffff' },
];

test('analyzes valid JPG and PNG buffers through an injected vision provider', async () => {
  assert.equal(ANALYSIS_VERSION, 4);
  for (const format of ['jpeg', 'png']) {
    const imageBuffer = await makeImage(format);
    const result = await analyzeDesignImage({
      imageBuffer,
      mimeType: format === 'jpeg' ? 'image/jpeg' : 'image/png',
      provider: { analyze: async ({ width, height }) => ({ elements: [{ ...textElements[0], bbox: { x: 20, y: 20, width: Math.min(180, width - 20), height: 40 } }] }) },
    });
    assert.equal(result.elements[0].text, 'ABC Traders');
    assert.equal(result.elements[0].bbox.x, 20);
    assert.equal(result.analysisVersion, ANALYSIS_VERSION);
    assert.match(result.sourceHash, /^[a-f\d]{64}$/);
  }
});

test('preserves a structured quota error from the vision provider', async () => {
  const imageBuffer = await makeImage('png');
  const quotaError = new Error('GenerateRequestsPerDayPerProject-FreeTier quota exceeded');
  quotaError.status = 429;
  await assert.rejects(
    analyzeDesignImage({
      imageBuffer,
      mimeType: 'image/png',
      provider: { analyze: async () => { throw quotaError; } },
    }),
    (error) => error.code === 'AI_VISION_QUOTA_EXHAUSTED' && error.status === 429 && /exhausted its quota/.test(error.message)
  );
});

test('keeps unexpected vision errors distinct from provider configuration failures', async () => {
  const imageBuffer = await makeImage('png');
  await assert.rejects(
    analyzeDesignImage({
      imageBuffer,
      mimeType: 'image/png',
      provider: { analyze: async () => { throw new Error('vision service failed'); } },
    }),
    (error) => error.code === 'AI_VISION_UNAVAILABLE' && error.message === 'vision service failed'
  );
});

test('analysis cache schema accepts OCR elements without optional text styling', () => {
  const design = new Design({
    title: 'Analysis schema test',
    category: '507f1f77bcf86cd799439011',
    thumbnail: '/preview.png',
    fullImage: '/original.png',
    aiAnalysis: {
      sourceHash: 'a'.repeat(64),
      analysisVersion: 1,
      imageWidth: 400,
      imageHeight: 220,
      elements: [{ id: 'e1', type: 'text', semanticType: 'phone', text: '123', bbox: { x: 2, y: 2, width: 100, height: 20 }, confidence: 0.9 }],
    },
  });
  assert.equal(design.validateSync(), undefined);
});

test('reuses cached analysis for the same bytes and invalidates when source bytes change', async () => {
  const firstImage = await makeImage('png', '#234567');
  const changedImage = await makeImage('png', '#765432');
  const sources = { first: firstImage, changed: changedImage };
  const design = { _id: 'design-test', sourceFile: 'first' };
  let providerCalls = 0;
  const model = {
    updateOne: async (_filter, update) => {
      design.aiAnalysis = update.$set.aiAnalysis;
      return { matchedCount: 1 };
    },
  };
  const options = {
    model,
    readImage: async (path) => ({ buffer: sources[path], mimeType: 'image/png' }),
    provider: { analyze: async () => { providerCalls += 1; return { elements: textElements }; } },
  };

  const first = await getCachedOrAnalyzeDesign(design, options);
  const repeated = await getCachedOrAnalyzeDesign(design, options);
  assert.equal(first.cacheHit, false);
  assert.equal(repeated.cacheHit, true);
  assert.equal(providerCalls, 1);

  design.sourceFile = 'changed';
  const changed = await getCachedOrAnalyzeDesign(design, options);
  assert.equal(changed.cacheHit, false);
  assert.notEqual(changed.sourceHash, first.sourceHash);
  assert.equal(providerCalls, 2);

  design.aiAnalysis.analysisVersion = 0;
  const reanalyzed = await getCachedOrAnalyzeDesign(design, options);
  assert.equal(reanalyzed.cacheHit, false);
  assert.equal(reanalyzed.analysisVersion, ANALYSIS_VERSION);
  assert.equal(providerCalls, 3);
});

test('analysis prefers a browser raster preview when sourceFile is a PSD', async () => {
  const png = await makeImage('png');
  const paths = [];
  const source = await readDesignRasterSource({
    sourceFile: '/api/files/master.psd',
    previewImage: '/api/files/preview.png',
    fullImage: '/api/files/full.png',
  }, async (imagePath) => {
    paths.push(imagePath);
    if (imagePath.endsWith('master.psd')) return { buffer: Buffer.from('8BPSxxxx'), mimeType: 'application/octet-stream' };
    return { buffer: png, mimeType: 'image/png' };
  });
  assert.equal(source.field, 'previewImage');
  assert.equal(source.imagePath, '/api/files/preview.png');
  assert.deepEqual(paths, ['/api/files/master.psd', '/api/files/preview.png']);
});

test('parses name, phone, and offer together only against detected elements', async () => {
  const result = await parseInstruction({
    instruction: 'Change the business name to Yamini Flex, change the phone number to 9876543210, change the offer to 30% OFF, change the price to ₹750',
    detectedElements: textElements,
  });
  assert.equal(result.clarificationRequired, false);
  assert.deepEqual(result.changes.map((change) => change.newValue), ['Yamini Flex', '9876543210', '30% OFF', '₹750']);
  assert.deepEqual(result.changes.map((change) => change.elementId), ['name-1', 'phone-1', 'offer-1', 'price-1']);
});

test('parses an AI photo description and exact text replacement together without an uploaded image', async () => {
  const photo = { id: 'photo-1', type: 'image', semanticType: 'product_photo', text: '', bbox: { x: 230, y: 30, width: 150, height: 150 }, confidence: 0.94 };
  const result = await parseInstruction({
    instruction: 'Change the photo to fresh strawberries; change the phone number to 5551234567',
    detectedElements: [photo, textElements[1]],
    imageGenerationAvailable: true,
  });
  assert.equal(result.clarificationRequired, false);
  assert.deepEqual(result.changes.map(({ operation, newValue }) => [operation, newValue]), [
    ['replace_image', 'fresh strawberries'],
    ['replace_text', '5551234567'],
  ]);
});

test('does not invent unknown elements and requests clarification for ambiguous matches', async () => {
  const unknown = await parseInstruction({ instruction: 'Make the logo spin', detectedElements: textElements });
  assert.equal(unknown.changes.length, 0);
  assert.equal(unknown.clarificationRequired, true);

  const ambiguous = await parseInstruction({
    instruction: 'Change the phone number to 5551111',
    detectedElements: [...textElements, { ...textElements[1], id: 'phone-2', text: '0987654321' }],
  });
  assert.equal(ambiguous.changes.length, 0);
  assert.equal(ambiguous.clarificationRequired, true);
});

test('replacement photo is fitted only into its detected image box and leaves source bytes unchanged', async () => {
  const original = await makeImage('png', '#234567');
  const originalHash = crypto.createHash('sha256').update(original).digest('hex');
  const photo = await makeImage('png', '#ff0000');
  const elements = [{ id: 'photo-1', type: 'image', semanticType: 'product_photo', text: '', bbox: { x: 40, y: 50, width: 80, height: 60 }, confidence: 0.92 }];
  const output = await replaceImageRegions({
    imageBuffer: original,
    mimeType: 'image/png',
    replacementImage: photo,
    elements,
    changes: [{ elementId: 'photo-1', operation: 'replace_image', newValue: 'uploaded_image' }],
    provider: { inpaint: async () => ({ imageBuffer: photo }) },
  });
  assert.equal(crypto.createHash('sha256').update(original).digest('hex'), originalHash);
  const outputMeta = await sharp(output).metadata();
  assert.equal(outputMeta.width, 400);
  assert.equal(outputMeta.height, 220);
  assert.notEqual(crypto.createHash('sha256').update(output).digest('hex'), originalHash);
  const unchangedOriginal = await sharp(original).extract({ left: 5, top: 5, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
  const unchangedOutput = await sharp(output).extract({ left: 5, top: 5, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
  assert.deepEqual([...unchangedOutput], [...unchangedOriginal]);
});

test('self-hosted image provider generates a replacement from a prompt without an uploaded photo', async () => {
  const previousProvider = process.env.AI_IMAGE_PROVIDER;
  let receivedPrompt = '';
  registerProvider('image', 'selfhosted-image-test', {
    inpaint: async ({ prompt }) => {
      receivedPrompt = prompt;
      return { imageBuffer: await makeImage('png', '#ff0000') };
    },
  });
  process.env.AI_IMAGE_PROVIDER = 'selfhosted-image-test';
  try {
    const original = await makeImage('png', '#234567');
    const output = await editImage({
      imageBuffer: original,
      mimeType: 'image/png',
      changes: [{ elementId: 'photo-1', operation: 'replace_image', newValue: 'fresh strawberries' }],
      elements: [{ id: 'photo-1', type: 'image', bbox: { x: 40, y: 50, width: 80, height: 60 } }],
      imageGenerationAvailable: true,
    });
    assert.match(receivedPrompt, /fresh strawberries/);
    assert.equal((await sharp(output).metadata()).width, 400);
    const originalPixel = await sharp(original).extract({ left: 50, top: 60, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
    const editedPixel = await sharp(output).extract({ left: 50, top: 60, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
    assert.notDeepEqual([...editedPixel], [...originalPixel]);
  } finally {
    unregisterProvider('image', 'selfhosted-image-test');
    if (previousProvider === undefined) delete process.env.AI_IMAGE_PROVIDER;
    else process.env.AI_IMAGE_PROVIDER = previousProvider;
  }
});

test('text-only image editing does not resolve or call an image provider', async () => {
  const previousProvider = process.env.AI_IMAGE_PROVIDER;
  process.env.AI_IMAGE_PROVIDER = 'missing-image-provider-for-text-test';
  const image = await makeImage('png');
  try {
    const result = await editImage({
      imageBuffer: image,
      mimeType: 'image/png',
      changes: [{ elementId: 'name-1', operation: 'replace_text', newValue: 'Yamini' }],
      elements: [textElements[0]],
    });
    assert.deepEqual(result, image);
  } finally {
    if (previousProvider === undefined) delete process.env.AI_IMAGE_PROVIDER;
    else process.env.AI_IMAGE_PROVIDER = previousProvider;
  }
});

test('text-only background reconstruction works without any image provider', async () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="70"><defs><linearGradient id="g"><stop stop-color="#165e9a"/><stop offset="1" stop-color="#29a66a"/></linearGradient></defs><rect width="120" height="70" fill="url(#g)"/><g fill="#ffffff"><rect x="22" y="12" width="5" height="34"/><rect x="38" y="12" width="5" height="34"/><rect x="22" y="26" width="21" height="5"/></g></svg>');
  const image = await sharp(svg).png().toBuffer();
  const element = { id: 'glyph', type: 'text', semanticType: 'heading', text: 'H', bbox: { x: 20, y: 10, width: 25, height: 38 }, confidence: 0.99, textColor: '#ffffff', textColorConfidence: 0.99, fontSize: 32 };
  const result = await inpaintTextRegions({ imageBuffer: image, changes: [{ operation: 'replace_text', elementId: 'glyph', newValue: 'I' }], elements: [element] });
  const repairedGlyph = await sharp(result).extract({ left: 24, top: 18, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
  const originalOutside = await sharp(image).extract({ left: 105, top: 60, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
  const repairedOutside = await sharp(result).extract({ left: 105, top: 60, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
  assert.notDeepEqual([...repairedGlyph], [255, 255, 255]);
  assert.deepEqual([...repairedOutside], [...originalOutside]);
});

test('local text inpainting reconstructs glyph pixels over a gradient and leaves outside pixels unchanged', async () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="70"><defs><linearGradient id="g"><stop stop-color="#165e9a"/><stop offset="1" stop-color="#29a66a"/></linearGradient></defs><rect width="120" height="70" fill="url(#g)"/><g fill="#ffffff"><rect x="22" y="12" width="5" height="34"/><rect x="38" y="12" width="5" height="34"/><rect x="22" y="26" width="21" height="5"/></g></svg>');
  const image = await sharp(svg).png().toBuffer();
  const element = { id: 'glyph', type: 'text', semanticType: 'heading', text: 'H', bbox: { x: 20, y: 10, width: 25, height: 38 }, confidence: 0.99, textColor: '#ffffff', textColorConfidence: 0.99, fontSize: 32 };
  const result = await inpaintTextElements({ imageBuffer: image, elements: [element], changes: [{ operation: 'replace_text', elementId: 'glyph', newValue: 'I' }] });
  const originalGlyph = await sharp(image).extract({ left: 24, top: 18, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
  const repairedGlyph = await sharp(result).extract({ left: 24, top: 18, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
  const originalOutside = await sharp(image).extract({ left: 105, top: 60, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
  const repairedOutside = await sharp(result).extract({ left: 105, top: 60, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
  assert.notDeepEqual([...repairedGlyph], [...originalGlyph]);
  assert.deepEqual([...repairedOutside], [...originalOutside]);
});

test('exact text renderer escapes user text and preserves image dimensions', async () => {
  const base = await makeImage('png');
  const originalText = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="220"><text x="30" y="50" font-family="Arial" font-size="28" font-weight="700" fill="#ffffff">ABC Traders</text></svg>');
  const image = await sharp(base).composite([{ input: originalText }]).png().toBuffer();
  const newValue = 'Yamini <Flex> & 9876543210';
  const svg = getTextSvg(400, 220, textElements, [{ elementId: 'name-1', operation: 'replace_text', newValue }]).toString();
  assert.match(svg, /Yamini &lt;Flex&gt; &amp;/);
  assert.match(svg, /9876543210/);
  const rendered = await renderExactText({ imageBuffer: image, analysis: { imageWidth: 400, imageHeight: 220, elements: textElements }, changes: [{ elementId: 'name-1', operation: 'replace_text', newValue }] });
  const metadata = await sharp(rendered).metadata();
  assert.equal(metadata.width, 400);
  assert.equal(metadata.height, 220);
  assert.equal(metadata.format, 'png');
});

test('missing provider configuration reports a safe setup error', () => {
  const oldValue = process.env.AI_VISION_PROVIDER;
  delete process.env.AI_VISION_PROVIDER;
  try {
    assert.throws(() => resolveProvider('vision'), (error) => error.code === 'AI_CONFIGURATION_REQUIRED' && /AI_VISION_PROVIDER/.test(error.message));
  } finally {
    if (oldValue !== undefined) process.env.AI_VISION_PROVIDER = oldValue;
  }
});

test('configured provider without an adapter reports a configuration error', () => {
  const previousProvider = process.env.AI_VISION_PROVIDER;
  process.env.AI_VISION_PROVIDER = 'missing-adapter-for-test';
  try {
    assert.throws(
      () => resolveProvider('vision'),
      (error) => error.code === 'AI_CONFIGURATION_REQUIRED' && /no installed backend adapter/.test(error.message)
    );
  } finally {
    if (previousProvider === undefined) delete process.env.AI_VISION_PROVIDER;
    else process.env.AI_VISION_PROVIDER = previousProvider;
  }
});

test('provider adapters that require credentials fail with a backend setup error', () => {
  const previousProvider = process.env.AI_VISION_PROVIDER;
  const previousKey = process.env.AI_API_KEY;
  registerProvider('vision', 'credential-test', { requiresApiKey: true, analyze: async () => ({ elements: [] }) });
  process.env.AI_VISION_PROVIDER = 'credential-test';
  delete process.env.AI_API_KEY;
  try {
    assert.throws(() => resolveProvider('vision'), (error) => error instanceof AiConfigurationError && /AI_API_KEY/.test(error.message));
  } finally {
    unregisterProvider('vision', 'credential-test');
    if (previousProvider === undefined) delete process.env.AI_VISION_PROVIDER;
    else process.env.AI_VISION_PROVIDER = previousProvider;
    if (previousKey === undefined) delete process.env.AI_API_KEY;
    else process.env.AI_API_KEY = previousKey;
  }
});
