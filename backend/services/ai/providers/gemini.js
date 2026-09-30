const path = require('path');
const dotenv = require('dotenv');

// ============================================================
// LOAD BACKEND .ENV
// ============================================================
//
// gemini.js is located at:
//
// backend/services/ai/providers/gemini.js
//
// Therefore ../../../.env points to:
//
// backend/.env
//
// ============================================================

dotenv.config({
  path: path.resolve(__dirname, '../../../.env'),
});

const { GoogleGenAI } = require('@google/genai');

// ============================================================
// API KEY
// ============================================================

let client;
const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY is required by the configured vision provider.');
    error.code = 'AI_CONFIGURATION_REQUIRED';
    error.status = 503;
    throw error;
  }
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
};

// ============================================================
// MODELS
// ============================================================

const VISION_MODEL =
  process.env.AI_VISION_MODEL?.trim() ||
  'gemini-3.6-flash';

const IMAGE_MODEL =
  process.env.AI_IMAGE_MODEL?.trim() ||
  'gemini-3.1-flash-image';

console.log(
  `Gemini vision model: ${VISION_MODEL}`
);

console.log(
  `Gemini image model: ${IMAGE_MODEL}`
);

// ============================================================
// VISION FALLBACK MODELS
// ============================================================
//
// The configured AI_VISION_MODEL is always attempted first.
//
// Temporary service errors can move to fallback models.
//
// IMPORTANT:
// Daily/project quota exhaustion is NOT treated as a reason
// to continue trying other models.
//
// ============================================================

const VISION_FALLBACK_MODELS = [
  VISION_MODEL,
  'gemini-3.7-flash',
  'gemini-3.5-flash',
].filter(
  (model, index, models) =>
    model &&
    models.indexOf(model) === index
);

// ============================================================
// RETRY SETTINGS
// ============================================================
//
// MAX_RETRIES_PER_MODEL = 1 means:
//
// attempt 1
//      ↓
// temporary failure
//      ↓
// wait
//      ↓
// attempt 2
//
// Then fallback model is attempted.
//
// ============================================================

const MAX_RETRIES_PER_MODEL = 1;

const INITIAL_RETRY_DELAY_MS = 1200;

const MAX_RETRY_DELAY_MS = 4000;

// ============================================================
// SLEEP
// ============================================================

const sleep = (milliseconds) =>
  new Promise((resolve) =>
    setTimeout(resolve, milliseconds)
  );

// ============================================================
// GET HTTP STATUS FROM GEMINI ERROR
// ============================================================

const getErrorStatus = (error) => {
  if (!error) {
    return null;
  }

  if (
    Number.isInteger(error.status)
  ) {
    return error.status;
  }

  if (
    Number.isInteger(error.statusCode)
  ) {
    return error.statusCode;
  }

  if (
    Number.isInteger(error.code) &&
    [
      429,
      500,
      502,
      503,
      504,
    ].includes(error.code)
  ) {
    return error.code;
  }

  const message =
    typeof error.message === 'string'
      ? error.message
      : '';

  const match = message.match(
    /\b(429|500|502|503|504)\b/
  );

  if (match) {
    return Number(match[1]);
  }

  return null;
};

// ============================================================
// ERROR MESSAGE
// ============================================================

const getErrorMessage = (error) => {
  if (!error) {
    return '';
  }

  if (
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return '';
  }
};

// ============================================================
// DETECT DAILY / PROJECT QUOTA EXHAUSTION
// ============================================================
//
// This specifically detects errors like:
//
// generate_content_free_tier_requests
//
// GenerateRequestsPerDayPerProject-FreeTier
//
// "You exceeded your current quota"
//
// These errors should NOT be retried.
//
// ============================================================

const isQuotaExhaustedError = (
  error
) => {
  const status =
    getErrorStatus(error);

  if (status !== 429) {
    return false;
  }

  const message =
    getErrorMessage(
      error
    ).toLowerCase();

  return (
    message.includes(
      'quota exceeded'
    ) ||
    message.includes(
      'quotaexceeded'
    ) ||
    message.includes(
      'resource_exhausted'
    ) ||
    message.includes(
      'generate_content_free_tier_requests'
    ) ||
    message.includes(
      'generaterequestsperdayperproject'
    ) ||
    message.includes(
      'requests per day'
    ) ||
    message.includes(
      'daily quota'
    )
  );
};

// ============================================================
// DETERMINE WHETHER ERROR IS TEMPORARY
// ============================================================
//
// 429 can be a short-lived rate limit.
//
// But if it is a daily/project quota exhaustion,
// isQuotaExhaustedError() catches it first.
//
// ============================================================

const isRetryableError = (
  error
) => {
  const status =
    getErrorStatus(error);

  if (
    isQuotaExhaustedError(error)
  ) {
    return false;
  }

  return [
    429,
    500,
    502,
    503,
    504,
  ].includes(status);
};

// ============================================================
// LOG GEMINI ERROR SAFELY
// ============================================================

const logGeminiError = (
  context,
  error,
  model
) => {
  const status =
    getErrorStatus(error);
  let message = getErrorMessage(error) || 'Unknown Gemini error';
  for (const keyName of ['GEMINI_API_KEY', 'AI_API_KEY']) {
    const secret = process.env[keyName];
    if (secret) message = message.split(secret).join('[REDACTED]');
  }

  console.error(
    `Gemini ${context} failed.`,
    {
      model,
      status,
      message,
    }
  );
};

// ============================================================
// RUN WITH RETRIES
// ============================================================

const runWithRetries = async ({
  operation,
  model,
  context,
}) => {
  let lastError = null;

  for (
    let attempt = 0;
    attempt <= MAX_RETRIES_PER_MODEL;
    attempt += 1
  ) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      const status =
        getErrorStatus(error);

      // ------------------------------------------------------
      // DAILY / PROJECT QUOTA EXHAUSTED
      // ------------------------------------------------------
      //
      // NEVER retry this.
      //
      // Example:
      //
      // 429
      // GenerateRequestsPerDayPerProject-FreeTier
      //
      // Retrying will not restore the quota.
      // ------------------------------------------------------

      if (
        isQuotaExhaustedError(error)
      ) {
        logGeminiError(
          context,
          error,
          model
        );

        console.error(
          `Gemini ${context}: quota exhausted for model "${model}".`
        );

        throw error;
      }

      const retryable =
        isRetryableError(error);

      const isLastAttempt =
        attempt >=
        MAX_RETRIES_PER_MODEL;

      logGeminiError(
        context,
        error,
        model
      );

      if (
        !retryable ||
        isLastAttempt
      ) {
        throw error;
      }

      const exponentialDelay =
        INITIAL_RETRY_DELAY_MS *
        Math.pow(
          2,
          attempt
        );

      const delay =
        Math.min(
          exponentialDelay,
          MAX_RETRY_DELAY_MS
        );

      console.warn(
        `Gemini ${context}: temporary error ${status}. ` +
        `Retrying model "${model}" in ${delay}ms...`
      );

      await sleep(delay);
    }
  }

  throw lastError;
};

// ============================================================
// RUN VISION WITH MODEL FALLBACK
// ============================================================

const runVisionWithFallback = async ({
  request,
}) => {
  let lastError = null;

  for (
    const model of
      VISION_FALLBACK_MODELS
  ) {
    try {
      console.log(
        `Gemini vision: trying model "${model}"`
      );

      const response =
        await runWithRetries({
          model,

          context:
            'vision analysis',

          operation: () =>
            getClient().models.generateContent({
              model,

              contents:
                request.contents,

              config:
                request.config,
            }),
        });

      console.log(
        `Gemini vision: model "${model}" succeeded`
      );

      return response;
    } catch (error) {
      lastError = error;

      const status =
        getErrorStatus(error);

      // ------------------------------------------------------
      // QUOTA EXHAUSTION
      // ------------------------------------------------------
      //
      // Do NOT continue through the fallback chain.
      // ------------------------------------------------------

      if (
        isQuotaExhaustedError(error)
      ) {
        console.error(
          `Gemini vision: quota exhausted for model "${model}".`
        );

        const friendlyError =
          new Error(
            'Gemini vision quota has been exhausted for this project. Please wait for the Gemini quota to reset or enable/increase billing quota, then try again.'
          );

        friendlyError.status =
          429;

        friendlyError.code =
          'AI_VISION_QUOTA_EXHAUSTED';

        friendlyError.cause =
          error;

        throw friendlyError;
      }

      // ------------------------------------------------------
      // NON-RETRYABLE ERROR
      // ------------------------------------------------------

      if (
        !isRetryableError(error)
      ) {
        throw error;
      }

      // ------------------------------------------------------
      // TEMPORARY MODEL FAILURE
      // ------------------------------------------------------

      console.warn(
        `Gemini vision: model "${model}" unavailable with status ${status}.`
      );

      console.warn(
        'Gemini vision: moving to next fallback model.'
      );
    }
  }

  // ==========================================================
  // ALL MODELS FAILED
  // ==========================================================

  const status =
    getErrorStatus(
      lastError
    );

  let message =
    'Gemini vision analysis is temporarily unavailable. Please try again.';

  if (
    status === 503 ||
    status === 500 ||
    status === 502 ||
    status === 504
  ) {
    message =
      'Gemini vision is temporarily unavailable because the selected AI models are experiencing high demand. Please try again in a few moments.';
  }

  const friendlyError =
    new Error(message);

  friendlyError.status =
    status || 503;

  friendlyError.code =
    'AI_VISION_TEMPORARILY_UNAVAILABLE';

  friendlyError.cause =
    lastError;

  throw friendlyError;
};

// ============================================================
// MIME TYPE
// ============================================================

const normalizeMimeType = (
  mimeType
) => {
  if (
    typeof mimeType === 'string' &&
    /^image\/(jpeg|png|webp)$/i.test(
      mimeType
    )
  ) {
    return mimeType.toLowerCase();
  }

  return 'image/png';
};

// ============================================================
// BUFFER -> GEMINI INLINE IMAGE
// ============================================================

const bufferToInlineImage = (
  image,
  mimeType = 'image/png'
) => {
  if (!Buffer.isBuffer(image)) {
    throw new Error(
      'Gemini provider expected the image to be a Buffer.'
    );
  }

  if (image.length === 0) {
    throw new Error(
      'Gemini provider received an empty image.'
    );
  }

  return {
    inlineData: {
      mimeType:
        normalizeMimeType(
          mimeType
        ),

      data:
        image.toString(
          'base64'
        ),
    },
  };
};

// ============================================================
// JSON RESPONSE PARSER
// ============================================================

const parseJsonResponse = (
  text
) => {
  if (
    typeof text !== 'string' ||
    !text.trim()
  ) {
    throw new Error(
      'Gemini returned an empty response.'
    );
  }

  let cleaned =
    text.trim();

  if (
    cleaned.startsWith('```')
  ) {
    cleaned =
      cleaned
        .replace(
          /^```(?:json)?\s*/i,
          ''
        )
        .replace(
          /\s*```$/i,
          ''
        )
        .trim();
  }

  try {
    return JSON.parse(
      cleaned
    );
  } catch (error) {
    throw new Error(
      `Gemini returned invalid JSON: ${cleaned}`
    );
  }
};

// ============================================================
// DESIGN / POSTER ANALYSIS
// ============================================================

const analyze = async ({
  image,
  imageBuffer,
  mimeType,
  width,
  height,
  instructions = '',
}) => {
  // imageAnalysisService supports both names.
  const sourceImage =
    image || imageBuffer;

  if (!sourceImage) {
    throw new Error(
      'Image is required for Gemini analysis.'
    );
  }

  const imagePart =
    bufferToInlineImage(
      sourceImage,
      mimeType
    );

  const numericWidth =
    Number(width);

  const numericHeight =
    Number(height);

  const prompt = `
Analyze this poster/design image carefully.

The image is a flattened raster design.

Your job is to identify every meaningful visual element
that can potentially be customized while preserving the
original design.

============================================================
TEXT DETECTION
============================================================

Identify EVERY visible text element.

For every visible text element:

1. Read the exact visible text.
2. Identify its semantic purpose.
3. Locate its pixel bounding box.
4. Estimate typography properties.
5. Estimate text color.
6. Estimate alignment.
7. Estimate rotation if applicable.

Text semanticType should use one of:

business_name
heading
subheading
description
phone
email
address
price
offer
date
website
call_to_action
other

============================================================
TYPOGRAPHY ANALYSIS
============================================================

For every text element, estimate:

fontFamily
fontSize
fontWeight
fontStyle
letterSpacing
lineHeight
textColor
alignment
rotation

IMPORTANT:

The source is a flattened raster image.

Therefore:

- fontFamily is an ESTIMATE unless the font is visually
  recognizable.
- Do not claim an exact font file when it cannot be known
  from the raster image.
- Use a commonly recognized font family name when possible.
- If uncertain, provide the closest visual family.
- Lower fontConfidence when uncertain.
- fontSize should be estimated in PIXELS relative to the
  supplied image dimensions.
- textColor should be the visible primary text color,
  preferably as a hexadecimal color.
- textColorConfidence must be between 0 and 1.
- fontConfidence must be between 0 and 1.
- alignment must be one of:
  left
  center
  right
- fontWeight should preferably be a numeric CSS-like value:
  300
  400
  500
  600
  700
  800
  900
- fontStyle should normally be:
  normal
  italic
- letterSpacing should be estimated in pixels.
- lineHeight should be estimated in pixels.
- rotation should be degrees.
- If no visible rotation exists, use 0.

============================================================
GROUPED TEXT
============================================================

When text is visually part of one combined heading,
still identify individual text elements when they have
separate visual bounding boxes.

Example:

Happy
Birthday
Eeshitha

may be returned as three separate text elements.

Do not merge separate visual lines unless they are clearly
one inseparable text block.

============================================================
IMAGES
============================================================

Identify:

1. Photos
2. People
3. Product images
4. Logos
5. Icons
6. Background regions
7. Decorative graphics
8. Image placeholders when visually apparent

For image/non-text elements use:

photo
person
product
logo
icon
background
decoration
other

============================================================
BOUNDING BOX RULES
============================================================

Bounding boxes MUST use pixel coordinates.

Origin:

(0,0) = top-left.

x increases:
left → right

y increases:
top → bottom

width and height:
pixel measurements.

Every bounding box MUST remain completely inside
the image.

For an image with:

width = W
height = H

the following must always be true:

0 <= x <= W
0 <= y <= H
0 <= width
0 <= height
x + width <= W
y + height <= H

Do NOT return normalized coordinates.

Do NOT return percentages.

Do NOT return coordinates outside the image.

============================================================
OCR RULES
============================================================

Only report text that is visibly printed in the supplied
image.

Do NOT invent OCR text.

Do NOT copy text from these instructions as design text.

Do NOT treat phrases such as:

"IMAGE NOT INCLUDED"
"image placeholder"
"insert image"
"add image"
"sample text"
"internal instruction"

as design elements unless those exact words are visibly
printed inside the supplied image.

If text is uncertain:

- provide your best reading
- lower confidence

Preserve visible text exactly whenever readable.

============================================================
SEMANTIC RULES
============================================================

Determine the semantic purpose from visual context.

For example:

Company/brand name:
business_name

Large central title:
heading

Supporting title:
subheading

Paragraph:
description

Telephone number:
phone

Email address:
email

Physical location:
address

Currency/amount:
price

Discount/sale:
offer

Date:
date

Website:
website

Action phrase:
call_to_action

Other text:
other

============================================================
CONFIDENCE
============================================================

confidence MUST be between 0 and 1.

Use high confidence only when the element is clearly
visible and readable.

Lower confidence when:

- OCR is uncertain
- boundaries are uncertain
- typography is uncertain
- color is uncertain
- an element overlaps another element

============================================================
IMPORTANT PRESERVATION RULE
============================================================

The purpose of this analysis is to allow the application
to change ONLY the requested element while preserving the
rest of the original flattened design.

Therefore:

- Be precise.
- Do not invent elements.
- Do not merge unrelated elements.
- Do not omit visible text.
- Do not omit important photos/logos.
- Do not redesign the image.
- Do not generate replacement content.

============================================================
IMAGE DIMENSIONS
============================================================

width:
${
  Number.isFinite(
    numericWidth
  )
    ? numericWidth
    : 'unknown'
}

height:
${
  Number.isFinite(
    numericHeight
  )
    ? numericHeight
    : 'unknown'
}

============================================================
OUTPUT
============================================================

Return ONLY valid JSON.

Do NOT return markdown.

Do NOT return explanations.

Return exactly this structure:

{
  "elements": [
    {
      "id": "text_1",
      "type": "text",
      "semanticType": "heading",
      "text": "Example",

      "bbox": {
        "x": 10,
        "y": 20,
        "width": 300,
        "height": 60
      },

      "confidence": 0.95,

      "fontFamily": "Arial",
      "fontSize": 48,
      "fontWeight": 700,
      "fontStyle": "normal",
      "letterSpacing": 0,
      "lineHeight": 54,

      "textColor": "#FFFFFF",
      "textColorConfidence": 0.95,

      "fontConfidence": 0.80,

      "alignment": "center",

      "rotation": 0
    }
  ]
}

For non-text elements, text may be an empty string and
typography properties may use sensible defaults.

User instructions:

${String(
  instructions || ''
).trim()}
`.trim();

  try {
    const response =
      await runVisionWithFallback({
        request: {
          contents: [
            {
              role: 'user',

              parts: [
                {
                  text: prompt,
                },

                imagePart,
              ],
            },
          ],

          config: {
            responseMimeType:
              'application/json',

            responseSchema: {
              type: 'object',

              properties: {
                elements: {
                  type: 'array',

                  items: {
                    type: 'object',

                    properties: {
                      id: {
                        type: 'string',
                      },

                      type: {
                        type: 'string',
                      },

                      semanticType: {
                        type: 'string',
                      },

                      text: {
                        type: 'string',
                      },

                      bbox: {
                        type: 'object',

                        properties: {
                          x: {
                            type: 'number',
                          },

                          y: {
                            type: 'number',
                          },

                          width: {
                            type: 'number',
                          },

                          height: {
                            type: 'number',
                          },
                        },

                        required: [
                          'x',
                          'y',
                          'width',
                          'height',
                        ],
                      },

                      confidence: {
                        type: 'number',
                      },

                      fontFamily: {
                        type: 'string',
                      },

                      fontSize: {
                        type: 'number',
                      },

                      fontWeight: {
                        type: 'number',
                      },

                      fontStyle: {
                        type: 'string',
                      },

                      letterSpacing: {
                        type: 'number',
                      },

                      lineHeight: {
                        type: 'number',
                      },

                      textColor: {
                        type: 'string',
                      },

                      textColorConfidence: {
                        type: 'number',
                      },

                      fontConfidence: {
                        type: 'number',
                      },

                      alignment: {
                        type: 'string',
                      },

                      rotation: {
                        type: 'number',
                      },
                    },

                    required: [
                      'id',
                      'type',
                      'semanticType',
                      'text',
                      'bbox',
                      'confidence',
                    ],
                  },
                },
              },

              required: [
                'elements',
              ],
            },
          },
        },
      });

    const responseText =
      typeof response?.text === 'string'
        ? response.text
        : '';

    const parsed =
      parseJsonResponse(
        responseText
      );

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray(
        parsed.elements
      )
    ) {
      throw new Error(
        'Gemini analysis response does not contain an elements array.'
      );
    }

    return parsed;
  } catch (error) {
    logGeminiError('vision analysis', error, VISION_MODEL);

    throw error;
  }
};

// ============================================================
// IMAGE EDITING
// ============================================================
//
// Gemini 3.1 Flash Image supports image editing.
//
// IMPORTANT:
// Your local imageRenderingService should handle normal
// text replacement whenever possible.
//
// Gemini image editing should mainly be used for actual
// image/photo manipulation.
// ============================================================

const inpaint = async ({
  image,
  imageBuffer,
  mask,
  prompt,
  mimeType,
}) => {
  const sourceImage =
    image || imageBuffer;

  if (!sourceImage) {
    throw new Error(
      'Image is required for Gemini image editing.'
    );
  }

  if (
    typeof prompt !== 'string' ||
    !prompt.trim()
  ) {
    throw new Error(
      'Prompt is required for Gemini image editing.'
    );
  }

  if (
    !Buffer.isBuffer(
      sourceImage
    )
  ) {
    throw new Error(
      'Gemini image editing expected the source image to be a Buffer.'
    );
  }

  const normalizedMimeType =
    normalizeMimeType(
      mimeType
    );

  const base64Image =
    sourceImage.toString(
      'base64'
    );

  let editPrompt =
    prompt.trim();

  // ==========================================================
  // PRESERVATION INSTRUCTIONS
  // ==========================================================

  editPrompt += `

IMPORTANT EDITING RULES:

Use the supplied image as the original design.

Modify ONLY the requested content.

Preserve all unrelated content exactly as closely as
possible.

Preserve:

- original overall composition
- original dimensions
- original aspect ratio
- original layout
- logos
- photographs
- decorative elements
- unrelated text
- typography placement
- spacing
- colors outside the requested area
- visual hierarchy
- overall design style

Do NOT redesign the poster.

Do NOT create a new unrelated poster.

Do NOT move unrelated elements.

Do NOT remove unrelated content.

Do NOT change unrelated text.

Do NOT change the background unless explicitly requested.
`;

  // ==========================================================
  // MASK INFORMATION
  // ==========================================================

  if (mask) {
    editPrompt += `

The application has identified a specific target region
for this edit.

Only modify the region required for the requested change.

Keep the rest of the supplied image unchanged as closely
as possible.
`;
  }

  try {
    const interaction =
      await runWithRetries({
        model:
          IMAGE_MODEL,

        context:
          'image editing',

        operation: () =>
          getClient().interactions.create({
            model:
              IMAGE_MODEL,

            input: [
              {
                type: 'image',

                mime_type:
                  normalizedMimeType,

                data:
                  base64Image,
              },

              {
                type: 'text',

                text:
                  editPrompt,
              },
            ],

            response_format: {
              type: 'image',
            },
          }),
      });

    // ========================================================
    // DIRECT OUTPUT IMAGE
    // ========================================================

    if (
      interaction?.output_image?.data
    ) {
      return {
        imageBuffer:
          Buffer.from(
            interaction
              .output_image
              .data,
            'base64'
          ),

        mimeType:
          interaction
            .output_image
            .mime_type ||
          'image/png',

        raw:
          interaction,
      };
    }

    // ========================================================
    // OUTPUT IMAGE INSIDE STEPS
    // ========================================================

    if (
      Array.isArray(
        interaction?.steps
      )
    ) {
      for (
        const step of
          interaction.steps
      ) {
        if (
          step?.type !==
            'model_output' ||
          !Array.isArray(
            step.content
          )
        ) {
          continue;
        }

        for (
          const contentBlock of
            step.content
        ) {
          if (
            contentBlock?.type ===
              'image' &&
            contentBlock?.data
          ) {
            return {
              imageBuffer:
                Buffer.from(
                  contentBlock.data,
                  'base64'
                ),

              mimeType:
                contentBlock
                  .mime_type ||
                'image/png',

              raw:
                interaction,
            };
          }
        }
      }
    }

    throw new Error(
      'Gemini image model did not return a generated image.'
    );
  } catch (error) {
    logGeminiError('image editing', error, IMAGE_MODEL);

    throw error;
  }
};

// ============================================================
// PROVIDER EXPORT
// ============================================================

module.exports = {
  requiresApiKey: true,

  apiKeyEnv:
    'GEMINI_API_KEY',

  analyze,

  inpaint,
};