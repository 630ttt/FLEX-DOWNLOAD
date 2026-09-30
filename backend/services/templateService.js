const crypto = require('crypto');
const sharp = require('sharp');

const MAX_ELEMENTS = 500;
const MAX_TEMPLATE_BYTES = 5 * 1024 * 1024;
const MAX_ASSET_BYTES = 10 * 1024 * 1024;
const ELEMENT_TYPES = new Set(['text', 'image', 'rectangle', 'circle', 'line', 'shape', 'group']);
const STORED_FILE_PATTERN = /\/api\/files\/[a-f\d]{24}(?:[?#].*)?$/i;

const templateError = (message, status = 400) => Object.assign(new Error(message), { status });
const boundedNumber = (value, min, max, label) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) throw templateError(`${label} must be between ${min} and ${max}`);
  return number;
};
const isStoredAsset = (src) => typeof src === 'string' && !/^https?:\/\//i.test(src) && STORED_FILE_PATTERN.test(src);

const parseTemplateJson = (input) => {
  let value = input;
  if (typeof value === 'string') {
    if (Buffer.byteLength(value, 'utf8') > MAX_TEMPLATE_BYTES) throw templateError('Template JSON exceeds the 5 MB limit');
    try { value = JSON.parse(value); } catch { throw templateError('Template JSON is not valid JSON'); }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw templateError('Template JSON must be an object');
  if (Buffer.byteLength(JSON.stringify(value), 'utf8') > MAX_TEMPLATE_BYTES) throw templateError('Template JSON exceeds the 5 MB limit');
  if (value.version !== 1) throw templateError('Only Template JSON version 1 is supported');
  if (!value.canvas || typeof value.canvas !== 'object') throw templateError('Template canvas settings are required');
  const canvas = {
    width: boundedNumber(value.canvas.width, 100, 12000, 'Canvas width'),
    height: boundedNumber(value.canvas.height, 100, 12000, 'Canvas height'),
    backgroundColor: typeof value.canvas.backgroundColor === 'string' ? value.canvas.backgroundColor : '#ffffff',
  };
  const elements = value.elements;
  if (!Array.isArray(elements) || elements.length > MAX_ELEMENTS) throw templateError(`Template must contain between 0 and ${MAX_ELEMENTS} elements`);
  const ids = new Set();
  const normalizedElements = elements.map((element) => {
    if (!element || typeof element !== 'object' || !ELEMENT_TYPES.has(element.type)) throw templateError('Template contains an unsupported element type');
    const id = String(element.id || '');
    if (!id || id.length > 100 || ids.has(id)) throw templateError('Template element IDs must be unique non-empty strings');
    ids.add(id);
    const normalized = {
      ...element,
      id,
      name: String(element.name || element.type).slice(0, 100),
      x: boundedNumber(element.x, -12000, 12000, 'Element x'),
      y: boundedNumber(element.y, -12000, 12000, 'Element y'),
      width: boundedNumber(element.width, 1, 12000, 'Element width'),
      height: boundedNumber(element.height, 1, 12000, 'Element height'),
      rotation: boundedNumber(element.rotation ?? 0, -3600, 3600, 'Element rotation'),
      opacity: boundedNumber(element.opacity ?? 1, 0, 1, 'Element opacity'),
      visible: element.visible !== false,
      locked: element.locked === true,
      editable: element.editable !== false,
      permissions: element.permissions && typeof element.permissions === 'object' ? element.permissions : {},
    };
    if (element.type === 'text' && typeof element.text !== 'string') throw templateError('Text elements require text content');
    if (element.type === 'image') {
      if (element.src && !isStoredAsset(element.src)) throw templateError('Template image sources must use the application file store');
      if (!element.src && !element.replaceable) throw templateError('Image elements without a source must be replaceable photo placeholders');
    }
    if (element.type === 'group') {
      if (!Array.isArray(element.elements)) throw templateError('Group elements must contain an elements array');
    }
    return normalized;
  });
  const background = value.background && typeof value.background === 'object' ? value.background : { type: 'color', color: canvas.backgroundColor };
  if (background.type === 'image' && !isStoredAsset(background.src)) throw templateError('Background image must use the application file store');
  if (background.type !== 'image' && background.type !== 'color') throw templateError('Background type must be color or image');
  return {
    version: 1,
    id: String(value.id || crypto.randomUUID()),
    name: String(value.name || 'Untitled template').trim().slice(0, 120),
    description: String(value.description || '').trim().slice(0, 1000),
    canvas,
    background,
    elements: normalizedElements,
  };
};

const validateImageUpload = async (file) => {
  if (!file?.buffer || !Buffer.isBuffer(file.buffer)) throw templateError('Choose a valid image file');
  if (file.buffer.length > MAX_ASSET_BYTES || file.size > MAX_ASSET_BYTES) throw templateError('Template images must be 10 MB or smaller');
  let metadata;
  try { metadata = await sharp(file.buffer, { limitInputPixels: 40_000_000 }).metadata(); } catch { throw templateError('Image file is corrupt or unsupported'); }
  if (!['jpeg', 'png', 'webp'].includes(metadata.format)) throw templateError('Template images must be JPG, PNG, or WebP');
  if (file.mimetype && file.mimetype !== `image/${metadata.format === 'jpeg' ? 'jpeg' : metadata.format}`) throw templateError('Image content type does not match the file');
  return metadata;
};

const duplicateTemplateJson = (input, name) => {
  const template = parseTemplateJson(input);
  const duplicateIds = (elements) => elements.map((element) => ({
    ...element,
    id: crypto.randomUUID(),
    ...(element.type === 'group' ? { elements: duplicateIds(element.elements || []) } : {}),
  }));
  return {
    ...template,
    id: crypto.randomUUID(),
    name: String(name || `${template.name} - Copy`).trim().slice(0, 120),
    elements: duplicateIds(template.elements),
  };
};

module.exports = { MAX_ASSET_BYTES, MAX_ELEMENTS, parseTemplateJson, validateImageUpload, duplicateTemplateJson, isStoredAsset };