const Design = require('../models/Design');
const sharp = require('sharp');
const { saveUpload, readFileByUrl } = require('../services/fileStorage');
const {
  interpretEdits,
  validateValues,
} = require('../services/ai/editService');
const {
  processDesignCustomization,
} = require('../services/ai/customizationPipelineService');

const MAX_REPLACEMENT_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 50_000_000;

const isUsableTemplate = (template) =>
  template?.enabled === true &&
  Boolean(template.backgroundImage) &&
  Array.isArray(template.textLayers) &&
  template.textLayers.length > 0;

const getActiveDesign = async (designId, res) => {
  if (
    typeof designId !== 'string' ||
    !/^[a-f\d]{24}$/i.test(designId)
  ) {
    res.status(400).json({
      success: false,
      message: 'A valid designId is required',
    });

    return null;
  }

  const design = await Design.findOne({
    _id: designId,
    isActive: true,
  })
    .select(
      'title thumbnail fullImage sourceFile previewImage fileType editableTemplate aiAnalysis isActive'
    )
    .lean();

  if (!design) {
    res.status(404).json({
      success: false,
      message:
        'Design not found or is not available for customization',
    });

    return null;
  }

  return design;
};

const validateReplacementImage = async (file) => {
  if (!file) return null;

  if (
    !Buffer.isBuffer(file.buffer) ||
    file.size > MAX_REPLACEMENT_BYTES ||
    file.buffer.length > MAX_REPLACEMENT_BYTES
  ) {
    throw new Error(
      'Replacement image must be 10 MB or smaller'
    );
  }

  const metadata = await sharp(file.buffer, {
    limitInputPixels: MAX_IMAGE_PIXELS,
  }).metadata();

  if (!['jpeg', 'png', 'webp'].includes(metadata.format)) {
    throw new Error(
      'Replacement photo must be a valid JPG, PNG, or WebP image'
    );
  }

  if (
    file.mimetype &&
    file.mimetype !==
      `image/${
        metadata.format === 'jpeg'
          ? 'jpeg'
          : metadata.format
      }`
  ) {
    throw new Error(
      'Replacement photo content type does not match the image'
    );
  }

  return file.buffer;
};

const getTemplateFallback = async (
  design,
  instruction,
  values,
  warning = ''
) => {
  if (!isUsableTemplate(design.editableTemplate)) {
    return null;
  }

  const result = await interpretEdits({
    instructions: instruction,
    values,
  });

  return {
    mode: 'template',
    provider: result.provider,
    edits: result.edits,
    changes: [],
    analysis: design.aiAnalysis || null,
    template: design.editableTemplate,
    warnings: warning ? [warning] : [],
  };
};

const publicPipelineError = (error) => {
  if (error?.code === 'AI_VISION_QUOTA_EXHAUSTED') {
    return {
      status: 429,
      code: error.code,
      message: error.message,
    };
  }

  if (error?.code === 'AI_CONFIGURATION_REQUIRED') {
    return {
      status: error.status || error.statusCode || 503,
      code: error.code,
      message: error.message,
    };
  }

  if (error?.code === 'AI_VISION_UNAVAILABLE' || error?.code === 'AI_VISION_TEMPORARILY_UNAVAILABLE') {
    return {
      status: error.status || error.statusCode || 503,
      code: error.code,
      message: error.message,
    };
  }

  if (
    /replacement image|replacement photo|instruction must|design image|design source|design must|detected element|does not match|low confidence|does not fit/i.test(
      error?.message || ''
    )
  ) {
    return {
      status: 400,
      message: error.message,
    };
  }

  return {
    status: 502,
    message:
      'The design analysis or image-editing provider could not complete this preview. Check backend provider configuration and try again.',
  };
};

/**
 * Prints the COMPLETE provider error to the backend terminal.
 *
 * This is intentionally verbose during development so we can identify
 * whether the failure is authentication, model configuration, image
 * format, provider loading, OpenAI SDK, etc.
 */
const logProviderError = (label, error) => {
  let message = error?.message || 'Unknown provider error';
  for (const keyName of ['GEMINI_API_KEY', 'AI_API_KEY']) {
    const secret = process.env[keyName];
    if (secret) message = message.split(secret).join('[REDACTED]');
  }
  console.error(`[${label}]`, {
    name: error?.name,
    code: error?.code,
    status: error?.status || error?.statusCode,
    type: error?.type,
    provider: error?.provider || process.env.AI_VISION_PROVIDER || 'unknown',
    model: process.env.AI_VISION_MODEL || 'provider-default',
    message,
  });
};

const customizeDesign = async (req, res) => {
  try {
    const design = await getActiveDesign(
      req.body?.designId,
      res
    );

    if (!design) return;

    const instruction =
      req.body?.instruction ||
      req.body?.instructions ||
      '';

    if (
      typeof instruction !== 'string' ||
      instruction.length > 2000
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Instruction must be 2000 characters or fewer',
      });
    }

    const values = req.body?.values || {};

    if (
      !values ||
      typeof values !== 'object' ||
      Array.isArray(values)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Values must be an object',
      });
    }

    /*
     * Existing editable-template fallback.
     */
    if (
      !instruction.trim() &&
      Object.keys(values).length &&
      isUsableTemplate(design.editableTemplate)
    ) {
      const fallback = await getTemplateFallback(
        design,
        instruction,
        values
      );

      return res.json({
        success: true,
        data: fallback,
      });
    }

    let replacementImage;

    try {
      replacementImage =
        await validateReplacementImage(req.file);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    let result;

    try {
      result = await processDesignCustomization({
        design,
        instruction,
        replacementImage,
        imageGenerationAvailable:
          process.env.AI_IMAGE_PROVIDER?.trim() === 'selfhosted',
      });
    } catch (error) {
      /*
       * IMPORTANT:
       * Print the real provider error before attempting fallback.
       */
      logProviderError(
        'AI CUSTOMIZATION PROVIDER FAILURE',
        error
      );

      const fallback = await getTemplateFallback(
        design,
        instruction,
        values,
        'Automatic image analysis was unavailable; using the existing editable template.'
      ).catch((fallbackError) => {
        console.error('');
        console.error(
          'Template fallback also failed:'
        );
        console.error(
          fallbackError?.message ||
            fallbackError
        );
        console.error(
          fallbackError?.stack || ''
        );
        console.error('');
        return null;
      });

      if (fallback) {
        return res.json({
          success: true,
          data: fallback,
        });
      }

      const safe = publicPipelineError(error);

      return res.status(safe.status).json({
        success: false,
        code: safe.code || error.code || 'AI_CUSTOMIZATION_FAILED',
        message: safe.message,
      });
    }

    if (result.status === 'needs_clarification') {
      return res.json({
        success: true,
        data: {
          mode: 'automatic',
          status: result.status,
          previewUrl:
            design.previewImage ||
            design.thumbnail ||
            design.fullImage,
          changes: result.changes,
          analysis: result.analysis,
          warnings: result.warnings,
        },
      });
    }

    if (
      !result.previewBuffer ||
      !Buffer.isBuffer(result.previewBuffer)
    ) {
      const error = new Error(
        'AI customization did not return a valid preview image'
      );

      logProviderError(
        'INVALID AI PREVIEW RESULT',
        error
      );

      return res.status(502).json({
        success: false,
        message:
          'The AI provider did not return a valid preview image.',
      });
    }

    const previewUrl = await saveUpload({
      originalname: `customized-${design._id}.png`,
      mimetype: 'image/png',
      size: result.previewBuffer.length,
      buffer: result.previewBuffer,
    });

    return res.json({
      success: true,
      data: {
        mode: 'automatic',
        status: 'ready',
        previewUrl,
        changes: result.changes,
        analysis: result.analysis,
        warnings: result.warnings,
      },
    });
  } catch (error) {
    logProviderError(
      'AI CUSTOMIZATION REQUEST FAILED',
      error
    );

    const safe = publicPipelineError(error);

    return res.status(safe.status).json({
      success: false,
      code: safe.code || error.code || 'AI_CUSTOMIZATION_FAILED',
      message: safe.message,
    });
  }
};

const saveCustomizationPreview = async (
  req,
  res
) => {
  try {
    const design = await getActiveDesign(
      req.body?.designId,
      res
    );

    if (!design) return;

    let fileUrl;

    if (req.file) {
      if (
        req.file.mimetype !== 'image/png' ||
        !Buffer.isBuffer(req.file.buffer) ||
        req.file.buffer.length > MAX_REPLACEMENT_BYTES
      ) {
        return res.status(400).json({
          success: false,
          message:
            'A valid PNG preview of 10 MB or smaller is required',
        });
      }

      const previewMetadata = await sharp(
        req.file.buffer,
        {
          limitInputPixels: MAX_IMAGE_PIXELS,
        }
      ).metadata();

      if (previewMetadata.format !== 'png') {
        return res.status(400).json({
          success: false,
          message:
            'Preview upload must contain PNG image data',
        });
      }

      fileUrl = await saveUpload(req.file);
    } else if (
      typeof req.body?.previewUrl === 'string'
    ) {
      const preview = await readFileByUrl(
        req.body.previewUrl,
        MAX_REPLACEMENT_BYTES
      );

      if (preview.mimeType !== 'image/png') {
        return res.status(400).json({
          success: false,
          message:
            'Saved preview must be a PNG image',
        });
      }

      if (
        preview.filename !==
        `customized-${design._id}.png`
      ) {
        return res.status(403).json({
          success: false,
          message:
            'This preview does not belong to the selected design',
        });
      }

      const previewMetadata = await sharp(
        preview.buffer,
        {
          limitInputPixels: MAX_IMAGE_PIXELS,
        }
      ).metadata();

      if (previewMetadata.format !== 'png') {
        return res.status(400).json({
          success: false,
          message:
            'Saved preview must contain PNG image data',
        });
      }

      fileUrl = req.body.previewUrl;
    } else {
      return res.status(400).json({
        success: false,
        message:
          'A rendered PNG preview is required',
      });
    }

    if (req.body.edits) {
      const parsedEdits = JSON.parse(
        req.body.edits
      );

      if (Array.isArray(parsedEdits)) {
        if (
          parsedEdits.length > 100 ||
          parsedEdits.some(
            (change) =>
              !change ||
              typeof change.elementId !==
                'string' ||
              typeof change.newValue !==
                'string'
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              'Invalid structured design changes',
          });
        }
      } else {
        validateValues(parsedEdits);
      }
    }

    return res.status(201).json({
      success: true,
      data: {
        fileUrl,
        designTitle: design.title,
      },
    });
  } catch (error) {
    logProviderError(
      'SAVE CUSTOMIZATION PREVIEW FAILED',
      error
    );

    const safe = publicPipelineError(error);

    return res.status(safe.status).json({
      success: false,
      message:
        safe.status === 503
          ? safe.message
          : 'Could not save design preview',
    });
  }
};

module.exports = {
  customizeDesign,
  saveCustomizationPreview,
  getTemplateFallback,
  publicPipelineError,
  validateReplacementImage,
};