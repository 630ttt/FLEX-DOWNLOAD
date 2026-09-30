export const isEditablePsdLayer = (layer, imageFiles = {}) => {
  if (!layer || !layer.editable) return false;
  if (layer.type === 'text') return true;
  if (layer.type === 'image') return true;
  return Boolean(layer.image) || Boolean(imageFiles?.[layer.id]);
};

export const shouldUseTextEditingForPsdLayer = (layer, textValues = {}) => {
  if (!layer) return false;
  if (layer.type === 'text') return true;
  if (layer.type !== 'image') return false;
  const value = textValues?.[layer.id];
  return typeof value === 'string' && value.trim().length > 0;
};

export const findFirstEditablePsdLayer = (layers = []) => {
  for (const layer of layers) {
    if (!layer) continue;
    if (layer.editable && (layer.type === 'text' || layer.type === 'image')) return layer;
    const nested = findFirstEditablePsdLayer(layer.children || []);
    if (nested) return nested;
  }
  return null;
};

export const buildPsdEditPayload = ({
  textValues = {},
  imageFiles = {},
  imageAdjustments = {},
  textStyles = {},
} = {}) => ({
  textValues,
  imageFiles: Object.fromEntries(
    Object.entries(imageFiles)
      .filter(([, file]) => Boolean(file))
      .map(([id, file]) => [id, { fileName: file.name, mimeType: file.type || 'application/octet-stream' }])
  ),
  imageAdjustments,
  textStyles,
});
