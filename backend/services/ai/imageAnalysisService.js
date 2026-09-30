const crypto = require('crypto');
const sharp = require('sharp');
const Design = require('../../models/Design');
const { readFileByUrl } = require('../fileStorage');
const { resolveProvider } = require('./providerRegistry');

const ANALYSIS_VERSION = 4;

const ELEMENT_TYPES = new Set([
  'text',
  'image',
  'logo',
  'background',
  'decorative',
  'unknown',
]);

const SUPPORTED_FORMATS = new Set([
  'jpeg',
  'png',
  'webp',
]);

const MAX_PIXELS = 50_000_000;

const quotaError = (error) => {
  const details = `${error?.code || ''} ${error?.message || ''} ${error?.cause?.message || ''}`;
  return Number(error?.status || error?.statusCode) === 429 &&
    /GenerateRequestsPerDayPerProject-FreeTier|generate_content_free_tier_requests|quota exceeded|resource exhausted/i.test(details);
};

const safeErrorMessage = (error) => {
  let message = error?.message || 'Unknown vision provider error';
  for (const keyName of ['GEMINI_API_KEY', 'AI_API_KEY']) {
    const secret = process.env[keyName];
    if (secret) message = message.split(secret).join('[REDACTED]');
  }
  return message;
};

const normalizeVisionError = (error) => {
  if (quotaError(error)) {
    if (error.code === 'AI_VISION_QUOTA_EXHAUSTED') return error;
    const quota = new Error(
      'The configured vision provider has exhausted its quota. Previously analyzed designs can still be customized from cached analysis.'
    );
    quota.code = 'AI_VISION_QUOTA_EXHAUSTED';
    quota.status = 429;
    quota.cause = error;
    return quota;
  }

  if (!error.code) error.code = 'AI_VISION_UNAVAILABLE';
  if (!error.status && !error.statusCode) error.status = 503;
  return error;
};

/**
 * Create a stable SHA-256 hash for the source image.
 */
const hashImage = (buffer) =>
  crypto.createHash('sha256').update(buffer).digest('hex');

/**
 * Clamp a numeric value to a range.
 */
const clamp = (value, min, max) =>
  Math.min(Math.max(value, min), max);

/**
 * Normalize a bounding box returned by the vision provider.
 *
 * Vision models can occasionally return coordinates that are
 * slightly outside the actual image boundaries.
 *
 * Instead of rejecting the entire analysis, safely clamp the
 * bounding box to the real image dimensions.
 */
const normalizeBoundingBox = ({
  bbox,
  imageWidth,
  imageHeight,
  elementIndex,
}) => {
  if (!bbox || typeof bbox !== 'object') {
    throw new Error(
      `Vision provider returned an invalid bounding box for element ${
        elementIndex + 1
      }`
    );
  }

  let x = Number(bbox.x);
  let y = Number(bbox.y);
  let boxWidth = Number(bbox.width);
  let boxHeight = Number(bbox.height);

  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(boxWidth) ||
    !Number.isFinite(boxHeight)
  ) {
    throw new Error(
      `Vision provider returned non-numeric bounds for element ${
        elementIndex + 1
      }`
    );
  }

  /*
   * Completely nonsensical boxes should still be rejected.
   *
   * Small coordinate errors are handled below by clamping.
   */
  const originalRight =
    x + boxWidth;

  const originalBottom =
    y + boxHeight;

  const severelyInvalid =
    x < -imageWidth ||
    y < -imageHeight ||
    originalRight > imageWidth * 2 ||
    originalBottom > imageHeight * 2;

  if (severelyInvalid) {
    throw new Error(
      `Vision provider returned severely invalid bounds for element ${
        elementIndex + 1
      }`
    );
  }

  /*
   * Width and height cannot be negative.
   */
  boxWidth = Math.max(
    0,
    boxWidth
  );

  boxHeight = Math.max(
    0,
    boxHeight
  );

  /*
   * Move x/y inside the image.
   */
  x = clamp(
    x,
    0,
    imageWidth
  );

  y = clamp(
    y,
    0,
    imageHeight
  );

  /*
   * Prevent the right/bottom edges from exceeding
   * the actual image dimensions.
   */
  boxWidth = Math.min(
    boxWidth,
    Math.max(
      0,
      imageWidth - x
    )
  );

  boxHeight = Math.min(
    boxHeight,
    Math.max(
      0,
      imageHeight - y
    )
  );

  /*
   * The box must still have an actual visible area.
   */
  if (
    boxWidth <= 0 ||
    boxHeight <= 0
  ) {
    throw new Error(
      `Vision provider returned an empty bounding box for element ${
        elementIndex + 1
      }`
    );
  }

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(boxWidth),
    height: Math.round(boxHeight),
  };
};

/**
 * Read the actual raster image used for automatic AI analysis.
 *
 * Preference order:
 *   1. sourceFile
 *   2. previewImage
 *   3. fullImage
 *   4. thumbnail
 */
const readDesignRasterSource = async (
  design,
  readImage = readFileByUrl
) => {
  const fields = [
    'sourceFile',
    'previewImage',
    'fullImage',
    'thumbnail',
  ];

  const seen = new Set();
  let lastError;

  for (const field of fields) {
    const imagePath = design[field];

    if (
      !imagePath ||
      seen.has(imagePath)
    ) {
      continue;
    }

    seen.add(imagePath);

    try {
      const source =
        await readImage(
          imagePath
        );

      if (
        !source ||
        !Buffer.isBuffer(
          source.buffer
        )
      ) {
        lastError = new Error(
          `Design ${field} could not be read as an image`
        );

        continue;
      }

      const metadata =
        await sharp(
          source.buffer,
          {
            limitInputPixels:
              MAX_PIXELS,
          }
        ).metadata();

      if (
        SUPPORTED_FORMATS.has(
          metadata.format
        )
      ) {
        return {
          ...source,

          field,

          imagePath,

          mimeType:
            source.mimeType ||
            `image/${
              metadata.format ===
              'jpeg'
                ? 'jpeg'
                : metadata.format
            }`,
        };
      }

      lastError = new Error(
        `Design ${field} is not a supported raster image`
      );
    } catch (error) {
      lastError = error;
    }
  }

  throw (
    lastError ||
    new Error(
      'This design has no source JPG, PNG, or WebP image'
    )
  );
};

/**
 * Validate and normalize elements returned by the vision provider.
 *
 * Important:
 * Vision-model bounding boxes are not always pixel-perfect.
 * Slightly out-of-range coordinates are safely clamped to the
 * actual image dimensions instead of rejecting the whole analysis.
 */
const validateElements = (
  elements,
  width,
  height
) => {
  if (
    !Array.isArray(elements) ||
    elements.length > 500
  ) {
    throw new Error(
      'Vision provider returned an invalid element list'
    );
  }

  return elements.map(
    (element, index) => {
      const bbox =
        element?.bbox || {};

      const values = [
        bbox.x,
        bbox.y,
        bbox.width,
        bbox.height,
        element.confidence,
      ];

      if (
        !values.every((value) =>
          Number.isFinite(
            Number(value)
          )
        )
      ) {
        throw new Error(
          `Vision provider returned invalid bounds for element ${
            index + 1
          }`
        );
      }

      const confidence =
        Number(
          element.confidence
        );

      if (
        confidence < 0 ||
        confidence > 1
      ) {
        throw new Error(
          `Vision provider returned invalid confidence for element ${
            index + 1
          }`
        );
      }

      /*
       * Normalize/clamp Gemini's bounding box.
       */
      const normalizedBbox =
        normalizeBoundingBox({
          bbox,

          imageWidth:
            width,

          imageHeight:
            height,

          elementIndex:
            index,
        });

      const type =
        ELEMENT_TYPES.has(
          element.type
        )
          ? element.type
          : 'unknown';

      return {
        id:
          typeof element.id ===
            'string' &&
          element.id.trim()
            ? element.id.trim()
            : `element_${index + 1}`,

        type,

        semanticType:
          typeof element.semanticType ===
            'string' &&
          element.semanticType.trim()
            ? element.semanticType
                .trim()
                .toLowerCase()
            : 'unknown',

        text:
          typeof element.text ===
            'string'
            ? element.text.slice(
                0,
                1000
              )
            : '',

        bbox:
          normalizedBbox,

        confidence,

        fontSize:
          Number.isFinite(
            Number(
              element.fontSize
            )
          ) &&
          Number(
            element.fontSize
          ) > 0
            ? Number(
                element.fontSize
              )
            : null,

        fontFamily:
          typeof element.fontFamily === 'string'
            ? element.fontFamily.trim().slice(0, 100)
            : '',

        fontWeight:
          element.fontWeight !== undefined && element.fontWeight !== null
            ? String(element.fontWeight).slice(0, 20)
            : '',

        fontStyle: ['normal', 'italic', 'oblique'].includes(String(element.fontStyle || '').toLowerCase())
          ? String(element.fontStyle).toLowerCase()
          : 'unknown',

        letterSpacing:
          Number.isFinite(Number(element.letterSpacing))
            ? clamp(Number(element.letterSpacing), -100, 200)
            : null,

        lineHeight:
          Number.isFinite(Number(element.lineHeight)) && Number(element.lineHeight) > 0
            ? clamp(Number(element.lineHeight), 1, height)
            : null,

        fontFamily:
          typeof element.fontFamily === 'string'
            ? element.fontFamily.trim().slice(0, 100)
            : '',

        fontWeight:
          element.fontWeight !== undefined &&
          element.fontWeight !== null
            ? String(element.fontWeight).slice(0, 20)
            : '',

        fontStyle: [
          'normal',
          'italic',
          'oblique',
        ].includes(String(element.fontStyle || '').toLowerCase())
          ? String(element.fontStyle).toLowerCase()
          : 'unknown',

        letterSpacing:
          Number.isFinite(Number(element.letterSpacing))
            ? clamp(Number(element.letterSpacing), -100, 200)
            : null,

        lineHeight:
          Number.isFinite(Number(element.lineHeight)) && Number(element.lineHeight) > 0
            ? clamp(Number(element.lineHeight), 1, height)
            : null,

        alignment: [
          'left',
          'center',
          'right',
        ].includes(
          element.alignment
        )
          ? element.alignment
          : 'unknown',

        rotation:
          Number.isFinite(Number(element.rotation))
            ? clamp(Number(element.rotation), -360, 360)
            : 0,

        textColor:
          /^#[0-9a-f]{6}$/i.test(
            element.textColor || ''
          )
            ? element.textColor.toLowerCase()
            : '',

        textColorConfidence:
          Number.isFinite(Number(element.textColorConfidence))
            ? clamp(Number(element.textColorConfidence), 0, 1)
            : 0,

        fontConfidence:
          Number.isFinite(Number(element.fontConfidence))
            ? clamp(Number(element.fontConfidence), 0, 1)
            : 0,

        textOpacity:
          Number.isFinite(Number(element.textOpacity))
            ? clamp(Number(element.textOpacity), 0, 1)
            : null,

        strokeColor: /^#[0-9a-f]{6}$/i.test(element.strokeColor || '')
          ? element.strokeColor.toLowerCase()
          : '',

        strokeWidth:
          Number.isFinite(Number(element.strokeWidth)) && Number(element.strokeWidth) >= 0
            ? clamp(Number(element.strokeWidth), 0, 100)
            : null,

        shadowColor: /^#[0-9a-f]{6}$/i.test(element.shadowColor || '')
          ? element.shadowColor.toLowerCase()
          : '',

        shadowBlur:
          Number.isFinite(Number(element.shadowBlur)) && Number(element.shadowBlur) >= 0
            ? clamp(Number(element.shadowBlur), 0, 100)
            : null,

        shadowOffsetX:
          Number.isFinite(Number(element.shadowOffsetX))
            ? clamp(Number(element.shadowOffsetX), -200, 200)
            : null,

        shadowOffsetY:
          Number.isFinite(Number(element.shadowOffsetY))
            ? clamp(Number(element.shadowOffsetY), -200, 200)
            : null,

        textColorConfidence:
          Number.isFinite(Number(element.textColorConfidence))
            ? clamp(Number(element.textColorConfidence), 0, 1)
            : 0,

        fontConfidence:
          Number.isFinite(Number(element.fontConfidence))
            ? clamp(Number(element.fontConfidence), 0, 1)
            : 0,

        textOpacity:
          Number.isFinite(Number(element.textOpacity))
            ? clamp(Number(element.textOpacity), 0, 1)
            : null,

        strokeColor:
          /^#[0-9a-f]{6}$/i.test(element.strokeColor || '')
            ? element.strokeColor.toLowerCase()
            : '',

        strokeWidth:
          Number.isFinite(Number(element.strokeWidth)) && Number(element.strokeWidth) >= 0
            ? clamp(Number(element.strokeWidth), 0, 100)
            : null,

        shadowColor:
          /^#[0-9a-f]{6}$/i.test(element.shadowColor || '')
            ? element.shadowColor.toLowerCase()
            : '',

        shadowBlur:
          Number.isFinite(Number(element.shadowBlur)) && Number(element.shadowBlur) >= 0
            ? clamp(Number(element.shadowBlur), 0, 100)
            : null,

        shadowOffsetX:
          Number.isFinite(Number(element.shadowOffsetX))
            ? clamp(Number(element.shadowOffsetX), -200, 200)
            : null,

        shadowOffsetY:
          Number.isFinite(Number(element.shadowOffsetY))
            ? clamp(Number(element.shadowOffsetY), -200, 200)
            : null,
      };
    }
  );
};

/**
 * Analyze a design image using the configured vision provider.
 */
const analyzeDesignImage = async ({
  imagePath,
  imageBuffer,
  mimeType,
  sourceHash,
  provider: injectedProvider,
}) => {
  const source = imageBuffer
    ? {
        buffer: imageBuffer,
        mimeType,
      }
    : await readFileByUrl(
        imagePath
      );

  const buffer =
    source.buffer;

  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length === 0
  ) {
    throw new Error(
      'Design source image is missing'
    );
  }

  const metadata =
    await sharp(
      buffer,
      {
        limitInputPixels:
          MAX_PIXELS,
      }
    ).metadata();

  if (
    !SUPPORTED_FORMATS.has(
      metadata.format
    ) ||
    !metadata.width ||
    !metadata.height
  ) {
    throw new Error(
      'Automatic analysis supports valid JPG, PNG, and WebP design images only'
    );
  }

  if (
    metadata.width *
      metadata.height >
    MAX_PIXELS
  ) {
    throw new Error(
      'Design image dimensions exceed the analysis limit'
    );
  }

  const contentHash =
    sourceHash ||
    hashImage(buffer);

  const selected = injectedProvider
    ? { name: 'injected', provider: injectedProvider }
    : resolveProvider('vision');

  const resolvedMimeType =
    source.mimeType ||
    mimeType ||
    `image/${
      metadata.format ===
      'jpeg'
        ? 'jpeg'
        : metadata.format
    }`;

  /*
   * Send BOTH image and imageBuffer for provider compatibility.
   */
  let response;
  try {
    response = await selected.provider.analyze({
      image: buffer,

      imageBuffer: buffer,

      mimeType:
        resolvedMimeType,

      width:
        metadata.width,

      height:
        metadata.height,

      sourceHash:
        contentHash,

      analysisVersion:
        ANALYSIS_VERSION,
    });
  } catch (error) {
    throw normalizeVisionError(error);
  }

  const validatedElements =
    validateElements(
      response?.elements,

      metadata.width,

      metadata.height
    );

  return {
    sourceHash:
      contentHash,

    analysisVersion:
      ANALYSIS_VERSION,

    analyzedAt:
      new Date(),

    imageWidth:
      metadata.width,

    imageHeight:
      metadata.height,

    elements:
      validatedElements,

    provider:
      selected.name,
  };
};

/**
 * Return cached analysis when the source image has not changed.
 * Otherwise run a fresh AI analysis and cache the result.
 */
const getCachedOrAnalyzeDesign =
  async (
    design,
    {
      provider,
      readImage =
        readFileByUrl,
      model = Design,
    } = {}
  ) => {
    const source =
      await readDesignRasterSource(
        design,
        readImage
      );

    const sourceField =
      source.field;

    const imagePath =
      source.imagePath;

    const sourceHash =
      hashImage(
        source.buffer
      );

    /*
     * Reuse existing AI analysis when:
     *
     * 1. Source image is identical.
     * 2. Analysis version is identical.
     */
    if (
      design.aiAnalysis
        ?.sourceHash ===
        sourceHash &&
      design.aiAnalysis
        ?.analysisVersion ===
        ANALYSIS_VERSION
    ) {
      console.info('[AI ANALYSIS]', {
        sourceHash,
        cacheHit: true,
        analysisVersion: ANALYSIS_VERSION,
        visionProvider: design.aiAnalysis.provider || process.env.AI_VISION_PROVIDER || 'unknown',
        model: process.env.AI_VISION_MODEL || 'provider-default',
        analysisStarted: false,
        analysisCompleted: true,
        elementCount: design.aiAnalysis.elements?.length || 0,
      });
      return {
        ...design.aiAnalysis,

        cacheHit: true,
      };
    }

    const configuredProvider = provider ? 'injected' : process.env.AI_VISION_PROVIDER?.trim() || 'unconfigured';
    console.info('[AI ANALYSIS]', {
      sourceHash,
      cacheHit: false,
      analysisVersion: ANALYSIS_VERSION,
      visionProvider: configuredProvider,
      model: process.env.AI_VISION_MODEL || 'provider-default',
      analysisStarted: true,
    });

    let analysis;
    try {
      analysis = await analyzeDesignImage({
        imageBuffer:
          source.buffer,

        mimeType:
          source.mimeType,

        sourceHash,

        provider,
      });
    } catch (error) {
      const normalized = normalizeVisionError(error);
      console.error('[AI ANALYSIS ERROR]', {
        code: normalized.code || 'AI_VISION_UNAVAILABLE',
        provider: configuredProvider,
        status: normalized.status || normalized.statusCode || 503,
        message: safeErrorMessage(normalized),
      });
      throw normalized;
    }

    const update =
      await model.updateOne(
        {
          _id: design._id,

          [sourceField]:
            imagePath,
        },

        {
          $set: {
            aiAnalysis:
              analysis,
          },
        }
      );

    if (
      update.matchedCount ===
      0
    ) {
      throw new Error(
        'Design source changed during analysis; please retry'
      );
    }

    console.info('[AI ANALYSIS]', {
      sourceHash,
      cacheHit: false,
      analysisVersion: ANALYSIS_VERSION,
      visionProvider: analysis.provider,
      model: process.env.AI_VISION_MODEL || 'provider-default',
      analysisStarted: true,
      analysisCompleted: true,
      elementCount: analysis.elements.length,
    });

    return {
      ...analysis,

      cacheHit: false,
    };
  };

module.exports = {
  ANALYSIS_VERSION,

  hashImage,

  readDesignRasterSource,

  validateElements,

  analyzeDesignImage,

  getCachedOrAnalyzeDesign,
};