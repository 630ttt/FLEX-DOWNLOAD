const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.AI_API_KEY,
});

const VISION_MODEL =
  process.env.AI_VISION_MODEL || 'gpt-5.6-luna';

const IMAGE_MODEL =
  process.env.AI_IMAGE_MODEL || 'gpt-image-2';

/**
 * Convert an image Buffer into a data URL that can be
 * passed to the OpenAI Responses API as image_url.
 */
const bufferToDataUrl = (buffer, mimeType = 'image/png') => {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error(
      'OpenAI vision provider expected the image to be a Buffer.'
    );
  }

  if (!buffer.length) {
    throw new Error(
      'OpenAI vision provider received an empty image.'
    );
  }

  const safeMimeType =
    typeof mimeType === 'string' &&
    /^image\/(jpeg|png|webp)$/i.test(mimeType)
      ? mimeType.toLowerCase()
      : 'image/png';

  return `data:${safeMimeType};base64,${buffer.toString(
    'base64'
  )}`;
};

/**
 * Analyze the original design image.
 *
 * imageAnalysisService passes:
 *
 *   image       -> Buffer
 *   imageBuffer -> Buffer
 *   mimeType    -> image/jpeg, image/png, etc.
 */
const analyze = async ({
  image,
  imageBuffer,
  mimeType,
  instructions = '',
}) => {
  /*
   * Support both names so this provider remains compatible
   * with the pipeline even if another caller uses imageBuffer.
   */
  const sourceImage = image || imageBuffer;

  if (!sourceImage) {
    throw new Error(
      'Image is required for AI analysis.'
    );
  }

  const imageDataUrl = bufferToDataUrl(
    sourceImage,
    mimeType
  );

  const response = await client.responses.create({
    model: VISION_MODEL,

    input: [
      {
        role: 'user',

        content: [
          {
            type: 'input_text',

            text: `
Analyze this poster/design image carefully.

Your task is to identify the editable semantic elements
that exist in the original flattened image.

Identify:

1. Every visible text element.
2. The exact visible text content whenever readable.
3. The approximate pixel bounding box of every text element.
4. Photos, people, product images, logos, icons and other
   meaningful image regions.
5. The background region.
6. Decorative elements when they are visually significant.
7. The semantic meaning of each element where possible.

For text, use one of these semantic types whenever appropriate:

- business_name
- heading
- subheading
- description
- phone
- email
- address
- price
- offer
- date
- website
- call_to_action
- other

For non-text elements use semantic types such as:

- photo
- person
- product
- logo
- icon
- background
- decoration
- other

IMPORTANT:

- Bounding boxes must use PIXEL coordinates.
- The origin (0,0) is the top-left corner.
- x increases toward the right.
- y increases toward the bottom.
- width and height are measured in pixels.
- Keep every bounding box inside the actual image.
- Do not invent elements that are not visible.
- Preserve the original text exactly when it can be read.
- If text is uncertain, provide the best reading and lower
  the confidence.
- Confidence must be between 0 and 1.
- Return JSON only.
- Do not wrap the JSON in markdown fences.
- Do not include explanations outside the JSON.

Return exactly this structure:

{
  "elements": [
    {
      "id": "text_1",
      "type": "text",
      "semanticType": "business_name",
      "text": "Example",
      "bbox": {
        "x": 0,
        "y": 0,
        "width": 100,
        "height": 50
      },
      "confidence": 0.95
    },
    {
      "id": "image_1",
      "type": "image",
      "semanticType": "photo",
      "text": "",
      "bbox": {
        "x": 200,
        "y": 100,
        "width": 300,
        "height": 300
      },
      "confidence": 0.91
    }
  ]
}

Image dimensions supplied by the application:

width: ${Number.isFinite(arguments?.width) ? arguments.width : 'unknown'}
height: ${Number.isFinite(arguments?.height) ? arguments.height : 'unknown'}

User instructions:

${String(instructions || '').trim()}
            `.trim(),
          },

          {
            type: 'input_image',

            /*
             * IMPORTANT:
             * image_url must be a STRING.
             *
             * Previously this was:
             *
             *     image_url: image
             *
             * where image was a Buffer/object.
             *
             * That caused:
             *
             *     expected an image URL,
             *     but got an object instead
             */
            image_url: imageDataUrl,
          },
        ],
      },
    ],
  });

  const text = response.output_text;

  if (
    typeof text !== 'string' ||
    !text.trim()
  ) {
    throw new Error(
      'OpenAI vision returned an empty response.'
    );
  }

  /*
   * Occasionally models can return JSON surrounded by
   * whitespace or markdown fences. Remove those fences
   * before parsing while still requiring valid JSON.
   */
  let cleanedText = text.trim();

  if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  }

  try {
    const parsed = JSON.parse(cleanedText);

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray(parsed.elements)
    ) {
      throw new Error(
        'Vision response does not contain an elements array.'
      );
    }

    return parsed;
  } catch (error) {
    throw new Error(
      `OpenAI vision returned invalid JSON: ${cleanedText}`
    );
  }
};

/**
 * Image editing / inpainting.
 *
 * This stays behind the provider interface.
 *
 * The actual image-edit API expects image data rather than
 * the Responses API image_url format used by analyze().
 */
const inpaint = async ({
  image,
  mask,
  prompt,
}) => {
  if (!image) {
    throw new Error(
      'Image is required for inpainting.'
    );
  }

  if (!mask) {
    throw new Error(
      'Mask is required for inpainting.'
    );
  }

  if (
    typeof prompt !== 'string' ||
    !prompt.trim()
  ) {
    throw new Error(
      'Prompt is required for inpainting.'
    );
  }

  /*
   * Keep the image-edit call isolated here.
   *
   * image and mask may be Buffers or file-compatible
   * values depending on the customization pipeline.
   */
  const response = await client.images.edit({
    model: IMAGE_MODEL,
    image,
    mask,
    prompt: prompt.trim(),
  });

  return response;
};

module.exports = {
  requiresApiKey: true,
  analyze,
  inpaint,
};