const sharp = require('sharp');
const { resolveProvider } = require('./providerRegistry');
const { inpaintTextElements } = require('./localTextInpaintingService');

const MAX_IMAGE_PIXELS = 50_000_000;

const isSupportedImage = (mimeType) =>
  ['image/png', 'image/jpeg', 'image/webp'].includes(mimeType);

const getElementsForChange = (change, elements) => {
  const byId = new Map(elements.map((element) => [element.id, element]));

  const ids = Array.isArray(change.elementIds)
    ? change.elementIds
    : change.elementId
      ? [change.elementId]
      : [];

  return ids
    .map((id) => byId.get(id))
    .filter(Boolean);
};

const getCombinedBoundingBox = (elements) => {
  if (!elements.length) {
    throw new Error('No detected elements found for image edit');
  }

  const left = Math.min(
    ...elements.map((element) => element.bbox.x)
  );

  const top = Math.min(
    ...elements.map((element) => element.bbox.y)
  );

  const right = Math.max(
    ...elements.map(
      (element) =>
        element.bbox.x + element.bbox.width
    )
  );

  const bottom = Math.max(
    ...elements.map(
      (element) =>
        element.bbox.y + element.bbox.height
    )
  );

  return {
    x: Math.max(0, Math.round(left)),
    y: Math.max(0, Math.round(top)),
    width: Math.max(1, Math.round(right - left)),
    height: Math.max(1, Math.round(bottom - top)),
  };
};

const getPaddedBox = (
  box,
  imageWidth,
  imageHeight,
  padding = 4
) => {
  const x = Math.max(
    0,
    Math.floor(box.x - padding)
  );

  const y = Math.max(
    0,
    Math.floor(box.y - padding)
  );

  const right = Math.min(
    imageWidth,
    Math.ceil(
      box.x + box.width + padding
    )
  );

  const bottom = Math.min(
    imageHeight,
    Math.ceil(
      box.y + box.height + padding
    )
  );

  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
  };
};

const createEditMask = async ({ width, height, boxes, padding = 4 }) => {
  const rects = boxes.map((box) => {
    const bounded = getPaddedBox(box, width, height, padding);
    return `<rect x="${bounded.x}" y="${bounded.y}" width="${bounded.width}" height="${bounded.height}" fill="#ffffff"/>`;
  }).join('');
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#000000"/>${rects}</svg>`);
  return sharp(svg).png().toBuffer();
};

/*
 * Creates an alpha mask for the detected text/image regions.
 *
 * White = region to edit
 * Black = preserve original image
 */
const createRegionAlphaMask = async ({
  width,
  height,
  box,
  padding = 4
}) => {
  return createEditMask({
    width,
    height,
    boxes: [box],
    padding,
  });
};

const makeAlphaMask = async (maskBuffer, width, height) => {
  const { data } = await sharp(maskBuffer).greyscale().raw().toBuffer({ resolveWithObject: true });
  const rgba = Buffer.alloc(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const offset = pixel * 4;
    rgba[offset] = 255;
    rgba[offset + 1] = 255;
    rgba[offset + 2] = 255;
    rgba[offset + 3] = data[pixel];
  }
  return sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer();
};

const compositeProviderImageInsideBoxes = async ({ original, edited, boxes, width, height }) => {
  const maskBuffer = await createEditMask({ width, height, boxes, padding: 0 });
  const alphaMask = await makeAlphaMask(maskBuffer, width, height);
  const editedInsideRegions = await sharp(edited, { limitInputPixels: MAX_IMAGE_PIXELS })
    .ensureAlpha()
    .composite([{ input: alphaMask, blend: 'dest-in' }])
    .png()
    .toBuffer();
  return sharp(original, { limitInputPixels: MAX_IMAGE_PIXELS })
    .composite([{ input: editedInsideRegions, left: 0, top: 0 }])
    .png()
    .toBuffer();
};

/*
 * Build prompt for optional AI image editing.
 *
 * This is ONLY used for non-text generative edits.
 */
const buildTextEditPrompt = (changes) => {
  return changes
    .map((change) => {
      const from =
        change.oldValue ||
        change.from ||
        '';

      const to =
        change.newValue ||
        change.to ||
        '';

      return `Replace "${from}" with "${to}" while preserving the original design layout, typography, spacing, colors, and background.`;
    })
    .join('\n');
};

/*
 * Optional AI image-region replacement.
 *
 * This is retained for photo/image changes.
 */
const replaceImageRegions = async ({
  imageBuffer,
  mimeType,
  changes,
  elements,
  replacementImage,
  provider,
}) => {
  if (!isSupportedImage(mimeType)) {
    throw new Error(
      `Unsupported source image type: ${mimeType}`
    );
  }

  const metadata = await sharp(imageBuffer, {
    limitInputPixels: MAX_IMAGE_PIXELS,
  }).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error(
      'Source image has invalid dimensions'
    );
  }

  const imageChanges = changes.filter(
    (change) =>
      change.operation === 'replace_image' ||
      change.operation === 'replace_photo' ||
      change.operation === 'image_replace'
  );

  if (!imageChanges.length) {
    return imageBuffer;
  }

  if (!provider) {
    throw new Error(
      'An image provider is required for image replacement'
    );
  }

  const boxes = [];

  for (const change of imageChanges) {
    const matched = getElementsForChange(
      change,
      elements
    );

    for (const element of matched) {
      if (!element.bbox) continue;

      boxes.push(element.bbox);
    }
  }

  if (!boxes.length) {
    throw new Error(
      'No detected image region was found for replacement'
    );
  }

  const maskBuffer = await createEditMask({
    width: metadata.width,
    height: metadata.height,
    boxes,
    padding: 2,
  });

  const imageDescriptions = imageChanges
    .map((change) => change.newValue)
    .filter((value) => value && value !== 'uploaded_image')
    .join('; ');
  const prompt = `
Create new artwork for the selected image/photo region${imageDescriptions ? `: ${imageDescriptions}` : ' using the supplied replacement image'}.

Preserve:
- original design layout
- original canvas dimensions
- surrounding background
- surrounding text
- borders
- shadows
- decorative elements

Fit the supplied replacement image naturally inside the detected photo region.
Do not modify unrelated parts of the design.
`.trim();

  const edited = await provider.inpaint({
    image: imageBuffer,
    imageBuffer,
    mask: maskBuffer,
    maskBuffer,
    mimeType,
    width: metadata.width,
    height: metadata.height,
    changes: imageChanges,
    prompt,
    instruction: prompt,
    replacementImage,
  });

  const editedBuffer = Buffer.isBuffer(edited) ? edited : edited?.imageBuffer;
  if (!Buffer.isBuffer(editedBuffer) || editedBuffer.length === 0) {
    throw new Error(
      'Image provider did not return an edited image'
    );
  }

  const editedMetadata = await sharp(editedBuffer, { limitInputPixels: MAX_IMAGE_PIXELS }).metadata();
  if (editedMetadata.width !== metadata.width || editedMetadata.height !== metadata.height || !isSupportedImage(`image/${editedMetadata.format === 'jpeg' ? 'jpeg' : editedMetadata.format}`)) {
    throw new Error('Image provider returned an image with incompatible dimensions or format');
  }

  return compositeProviderImageInsideBoxes({
    original: imageBuffer,
    edited: editedBuffer,
    boxes,
    width: metadata.width,
    height: metadata.height,
  });
};

/*
 * AI text inpainting is intentionally NOT used anymore.
 *
 * Gemini image generation has a separate quota and can return
 * 429 errors even when Gemini Vision works.
 *
 * Text replacement is handled locally by imageRenderingService.js.
 */
const inpaintTextRegions = async ({ imageBuffer, changes, elements }) =>
  inpaintTextElements({ imageBuffer, changes, elements });

/*
 * Main image editing entry point.
 */
const editImage = async ({
  imageBuffer,
  mimeType,
  changes,
  elements,
  replacementImage,
  imageGenerationAvailable = false,
}) => {
  if (!Buffer.isBuffer(imageBuffer)) {
    throw new Error(
      'imageBuffer must be a Buffer'
    );
  }

  if (!isSupportedImage(mimeType)) {
    throw new Error(
      `Unsupported source image type: ${mimeType}`
    );
  }

  if (!Array.isArray(changes)) {
    throw new Error(
      'changes must be an array'
    );
  }

  if (!Array.isArray(elements)) {
    throw new Error(
      'elements must be an array'
    );
  }

  /* Text repair and rendering are local and run after photo edits. */
  let result = imageBuffer;

  /*
   * ---------------------------------------------------------
   * 2. IMAGE / PHOTO CHANGES
   * ---------------------------------------------------------
   *
   * Only resolve the image provider if an actual image
   * replacement is requested.
   */
  const imageChanges = changes.filter(
    (change) =>
      change.operation === 'replace_image' ||
      change.operation === 'replace_photo' ||
      change.operation === 'image_replace'
  );

  if (imageChanges.length && (replacementImage || imageGenerationAvailable)) {
    const selected = resolveProvider('image');

    result = await replaceImageRegions({
      imageBuffer: result,
      mimeType,
      changes: imageChanges,
      elements,
      replacementImage,
      provider: selected.provider,
    });
  }

  /*
   * Validate final image.
   */
  const metadata = await sharp(result, {
    limitInputPixels: MAX_IMAGE_PIXELS,
  }).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error(
      'Image editing produced an invalid image'
    );
  }

  return result;
};

module.exports = {
  isSupportedImage,
  getElementsForChange,
  getCombinedBoundingBox,
  getPaddedBox,
  createEditMask,
  createRegionAlphaMask,
  buildTextEditPrompt,
  replaceImageRegions,
  inpaintTextRegions,
  editImage,
};