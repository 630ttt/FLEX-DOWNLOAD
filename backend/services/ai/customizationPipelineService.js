const { getCachedOrAnalyzeDesign, readDesignRasterSource } = require('./imageAnalysisService');
const { parseInstruction } = require('./instructionParserService');
const { editImage } = require('./imageEditingService');
const { renderExactText } = require('./imageRenderingService');

const processDesignCustomization = async ({ design, instruction, replacementImage, imageGenerationAvailable = false, analysisProvider, imageProvider }) => {
  const analysis = await getCachedOrAnalyzeDesign(design, { provider: analysisProvider });
  const parsed = await parseInstruction({
    instruction,
    detectedElements: analysis.elements,
    replacementImageAvailable: Boolean(replacementImage),
    imageGenerationAvailable,
  });

  if (parsed.clarificationRequired || parsed.changes.length === 0) {
    return {
      status: 'needs_clarification',
      analysis,
      changes: parsed.changes,
      warnings: parsed.warnings,
    };
  }

  const original = await readDesignRasterSource(design);
  const editedBackground = await editImage({
    imageBuffer: original.buffer,
    mimeType: original.mimeType,
    changes: parsed.changes,
    elements: analysis.elements,
    replacementImage,
    imageGenerationAvailable,
    provider: imageProvider,
  });
  const previewBuffer = await renderExactText({
    imageBuffer: editedBackground,
    analysis,
    changes: parsed.changes,
  });

  return {
    status: 'ready',
    previewBuffer,
    changes: parsed.changes,
    analysis,
    warnings: parsed.warnings,
  };
};

module.exports = { processDesignCustomization };
