# Automatic Design Customization

The existing `POST /api/ai/customize` route orchestrates these services:

1. `imageAnalysisService.js` hashes the original GridFS image with SHA-256, validates it with Sharp, and reuses `Design.aiAnalysis` when the hash and `ANALYSIS_VERSION` match.
2. A vision adapter returns OCR/region elements with pixel bounds, semantic labels, confidence, approximate font size, alignment, and text color.
3. `instructionParserService.js` uses a deterministic local parser. It only maps changes to detected element IDs; ambiguous or unsupported requests return clarification warnings.
4. `imageEditingService.js` edits text locally and resolves the configured image adapter only for actual image/photo replacements.
5. `imageRenderingService.js` reconstructs the original text pixels locally and renders replacement text into SVG. The original GridFS file is never modified.
6. The generated PNG is stored in GridFS and returned as `previewUrl`. `POST /api/ai/customizations` saves or accepts that stored preview.

## Provider adapters

Provider adapters are loaded through the shared registry at `services/ai/providers/<name>.js`. Gemini and OpenAI adapters are included. A vision adapter implements `analyze()`, an image adapter implements `inpaint()`, or one module may implement both:

```js
module.exports = {
  async analyze({ imageBuffer, mimeType, width, height, sourceHash, analysisVersion }) {
    return { elements: [] };
  },
  async inpaint({ imageBuffer, maskBuffer, mimeType, width, height, changes, instruction }) {
    return { imageBuffer: editedImageBuffer };
  },
};
```

The vision adapter must return normalized `elements` with pixel-space bounds and semantic labels such as `business_name`, `phone`, `offer`, `price`, or `product_photo`. The image adapter must honor the white-edit/black-preserve PNG mask, preserve unmasked content, and return an image with unchanged dimensions. Never ask the image provider to render replacement text. Set `requiresApiKey = true` on adapters that need `AI_API_KEY`; the registry will return a configuration error if it is absent.

Set `AI_VISION_PROVIDER=gemini` and `GEMINI_API_KEY` (or configure another installed vision adapter) in the backend environment. `AI_IMAGE_PROVIDER` is only needed for photo/image replacement, not text-only changes. `AI_VISION_MODEL` and `AI_IMAGE_MODEL` are optional. Do not create corresponding `VITE_*` variables. `AI_EDIT_PROVIDER=mock` remains only for the backwards-compatible editableTemplate path.

## Limitations

Automatic OCR/region analysis requires a configured vision adapter. Analysis is cached by source hash and `ANALYSIS_VERSION`; cached designs remain usable when provider quota is unavailable. Text-only replacements use local pixel reconstruction and rendering. Actual photo replacements require the configured image adapter. Low-confidence and ambiguous matches are returned for clarification rather than applied silently.
