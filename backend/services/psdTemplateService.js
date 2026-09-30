const sharp = require('sharp');
const { initializeCanvas, readPsd } = require('ag-psd');
const { readFileByUrl } = require('./fileStorage');

const configuredMaxPixels = Number.parseInt(process.env.PSD_MAX_PIXELS || '', 10);
const MAX_PIXELS = Number.isSafeInteger(configuredMaxPixels) && configuredMaxPixels > 0
  ? configuredMaxPixels
  : 50_000_000;

initializeCanvas(
  (width, height) => ({ width, height }),
  (width, height) => ({
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
  })
);

const getPixelBuffer = (pixelData, useAsMask = false) => {
  if (!pixelData?.data || !pixelData.width || !pixelData.height) return null;
  const pixelCount = pixelData.width * pixelData.height;
  const channels = pixelData.data.length / pixelCount;
  if (![1, 3, 4].includes(channels)) return null;

  const rgba = new Uint8Array(pixelCount * 4);
  const source = pixelData.data;
  const scale = source instanceof Uint16Array ? 255 / 65535 : source instanceof Float32Array ? 255 : 1;
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const sourceIndex = pixel * channels;
    const targetIndex = pixel * 4;
    let red;
    let green;
    let blue;
    let alpha = 255;
    if (channels === 1) {
      red = green = blue = Math.round(source[sourceIndex] * scale);
    } else {
      red = Math.round(source[sourceIndex] * scale);
      green = Math.round(source[sourceIndex + 1] * scale);
      blue = Math.round(source[sourceIndex + 2] * scale);
      if (channels === 4) alpha = Math.round(source[sourceIndex + 3] * scale);
    }
    if (useAsMask) {
      alpha = Math.round(((red + green + blue) / 3) * alpha / 255);
      red = green = blue = 255;
    }
    rgba[targetIndex] = red;
    rgba[targetIndex + 1] = green;
    rgba[targetIndex + 2] = blue;
    rgba[targetIndex + 3] = alpha;
  }
  return {
    buffer: Buffer.from(rgba),
    width: pixelData.width,
    height: pixelData.height,
  };
};

const toPng = async (pixelData, useAsMask = false) => {
  const pixels = getPixelBuffer(pixelData, useAsMask);
  if (!pixels) return null;
  return sharp(pixels.buffer, {
    raw: { width: pixels.width, height: pixels.height, channels: 4 },
  }).png().toBuffer();
};

const colorToHex = (color) => {
  if (!color) return '';
  let { r, g, b } = color;
  if (![r, g, b].every(Number.isFinite) && ['c', 'm', 'y', 'k'].every((key) => Number.isFinite(color[key]))) {
    r = 255 * (1 - color.c) * (1 - color.k);
    g = 255 * (1 - color.m) * (1 - color.k);
    b = 255 * (1 - color.y) * (1 - color.k);
  }
  if (![r, g, b].every(Number.isFinite)) return '';
  return `#${[r, g, b].map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0')).join('')}`;
};

const getTextStyle = (textData) => {
  if (!textData) return null;
  const style = textData.styleRuns?.[0]?.style || textData.style || {};
  const paragraph = textData.paragraphStyleRuns?.[0]?.style || textData.paragraphStyle || {};
  const fontSize = Number(style.fontSize) || null;
  const tracking = Number(style.tracking) || 0;
  const justification = String(paragraph.justification || '').toLowerCase();
  const alignment = justification.includes('left') ? 'left' : justification.includes('right') ? 'right' : justification.includes('center') ? 'center' : 'left';
  const fontFamily = style.font?.name || '';
  return {
    fontFamily,
    fontSize,
    fontWeight: style.fauxBold || /bold|black|heavy/i.test(fontFamily) ? 700 : 400,
    fontStyle: style.fauxItalic || /italic|oblique/i.test(fontFamily) ? 'italic' : 'normal',
    letterSpacing: fontSize ? tracking * fontSize / 1000 : tracking,
    lineHeight: Number(style.leading) || null,
    textColor: colorToHex(style.fillColor),
    alignment,
    rotation: Array.isArray(textData.transform) && textData.transform.length >= 2
      ? Math.atan2(textData.transform[1], textData.transform[0]) * 180 / Math.PI
      : 0,
  };
};

const isRasterTextLayerName = (name) =>
  /headline|description|phone|email|address|customer\s*name|offer|date|title|text/i.test(name || '') &&
  !/logo|brand|icon|feature|decor|background/i.test(name || '');

const getRasterTextStyle = (pixelData, layer, rotation) => {
  const pixelCount = pixelData?.width && pixelData?.height ? pixelData.width * pixelData.height : 0;
  const channels = pixelCount ? pixelData.data.length / pixelCount : 0;
  let textColor = '#ffffff';
  if (pixelData?.data && channels === 4) {
    const colors = new Map();
    for (let index = 0; index < pixelData.data.length; index += 4) {
      if (pixelData.data[index + 3] < 224) continue;
      const key = [0, 1, 2].map((channel) => Math.round(pixelData.data[index + channel] / 16) * 16).join(',');
      colors.set(key, (colors.get(key) || 0) + 1);
    }
    const dominant = [...colors.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
    if (dominant) textColor = `#${dominant.split(',').map((value) => Math.max(0, Math.min(255, Number(value))).toString(16).padStart(2, '0')).join('')}`;
  }
  return {
    fontFamily: process.env.DESIGN_RENDER_FONT?.split(',')[0]?.trim() || 'Arial',
    fontSize: Math.max(8, Math.round(Math.min(layer.bottom - layer.top, layer.right - layer.left) * 0.72)),
    fontWeight: 700,
    fontStyle: 'normal',
    letterSpacing: 0,
    lineHeight: Math.max(8, Math.round((layer.bottom - layer.top) * 0.9)),
    textColor,
    alignment: 'left',
    rotation,
    estimatedFromRaster: true,
  };
};

const getLayerRotation = (layer, textStyle) => {
  if (textStyle && Number.isFinite(textStyle.rotation)) return textStyle.rotation;
  const transform = layer.placedLayer?.transform || layer.transform;
  if (Array.isArray(transform) && transform.length >= 8) {
    const [firstX, firstY, secondX, secondY] = transform;
    if ([firstX, firstY, secondX, secondY].every(Number.isFinite)) {
      return Math.atan2(secondY - firstY, secondX - firstX) * 180 / Math.PI;
    }
  }
  return 0;
};

const normalizeVectorData = (value) => {
  if (!value) return null;
  if (Array.isArray(value)) return value.map(normalizeVectorData);
  if (typeof value !== 'object') return typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean' ? value : undefined;
  if (ArrayBuffer.isView(value)) return Array.from(value);
  return Object.fromEntries(Object.entries(value)
    .filter(([key, item]) => !['canvas', 'imageData', 'rawData'].includes(key) && typeof item !== 'function')
    .map(([key, item]) => [key, normalizeVectorData(item)])
    .filter(([, item]) => item !== undefined));
};

const importPsdTemplate = async (buffer, { saveAsset } = {}) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 26 || buffer.toString('ascii', 0, 4) !== '8BPS') {
    throw new Error('PSD import requires a valid Photoshop document');
  }

  const psd = readPsd(buffer, {
    useImageData: true,
    skipThumbnail: true,
    memoryLimit: MAX_PIXELS * 4,
  });
  if (!psd.width || !psd.height || psd.width * psd.height > MAX_PIXELS) {
    throw new Error('PSD canvas dimensions are invalid or exceed the import limit');
  }

  const storeAsset = async (png, filename) => {
    if (!png || !saveAsset) return '';
    return saveAsset({
      originalname: filename,
      mimetype: 'image/png',
      size: png.length,
      buffer: png,
    });
  };

  const composite = await toPng(psd.imageData);
  const previewBuffer = composite ? await sharp(composite).png().toBuffer() : null;
  let zOrder = 0;

  const normalizeLayer = async (layer, parentId = null, path = []) => {
    const order = zOrder++;
    const layerId = String(layer.id || `layer-${path.join('-') || order}`);
    const children = Array.isArray(layer.children)
      ? await Promise.all(layer.children.map((child, index) => normalizeLayer(child, layerId, [...path, index])))
      : undefined;
    const layerName = layer.name || `Layer ${order + 1}`;
    const backgroundName = /^(?:background|backdrop|bg)(?:\b|[_ -])/i.test(layerName);
    const decorativeName = /logo|brand|decor|leaves?|border|frame|ornament|watermark|icon/i.test(layerName);
    const nativeTextStyle = getTextStyle(layer.text);
    const textLayerName = !layer.text && isRasterTextLayerName(layerName);
    const layerType = children ? 'group'
      : layer.text ? 'text'
        : backgroundName ? 'background'
          : decorativeName ? 'decorative'
            : layer.vectorMask || layer.vectorOrigination ? 'shape'
          : layer.placedLayer ? 'smartObject'
            : layer.adjustment ? 'adjustment'
              : layer.imageData ? 'image' : 'unknown';
            const rotation = getLayerRotation(layer, nativeTextStyle);
            const textStyle = nativeTextStyle || (textLayerName ? getRasterTextStyle(layer.imageData, layer, rotation) : null);
    const left = Number(layer.left) || 0;
    const top = Number(layer.top) || 0;
    const right = Number.isFinite(layer.right) ? layer.right : left + (layer.imageData?.width || 0);
    const bottom = Number.isFinite(layer.bottom) ? layer.bottom : top + (layer.imageData?.height || 0);
    let imagePng = await toPng(layer.imageData);
    if (!imagePng && layerType === 'smartObject' && previewBuffer) {
      const cropLeft = Math.max(0, Math.floor(left));
      const cropTop = Math.max(0, Math.floor(top));
      const cropRight = Math.min(psd.width, Math.ceil(right));
      const cropBottom = Math.min(psd.height, Math.ceil(bottom));
      if (cropRight > cropLeft && cropBottom > cropTop) {
        imagePng = await sharp(previewBuffer)
          .extract({ left: cropLeft, top: cropTop, width: cropRight - cropLeft, height: cropBottom - cropTop })
          .png()
          .toBuffer();
      }
    }
    const maskPng = await toPng(layer.mask?.imageData, true);
    const realMaskPng = await toPng(layer.realMask?.imageData, true);
    const image = await storeAsset(imagePng, `psd-layer-${layerId}.png`);
    const mask = await storeAsset(maskPng, `psd-mask-${layerId}.png`);
    const realMask = await storeAsset(realMaskPng, `psd-real-mask-${layerId}.png`);

    return {
      id: layerId,
      name: layerName,
      type: layerType,
      parentId,
      x: left,
      y: top,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
      rotation,
      opacity: Number.isFinite(layer.opacity) ? layer.opacity : 1,
      visible: layer.hidden !== true,
      zOrder: order,
      editable: ['text', 'image', 'smartObject'].includes(layerType) && !backgroundName && !decorativeName,
      editMode: layer.text || textLayerName ? 'text' : 'image',
      text: layer.text?.text || '',
      textStyle,
      image,
      mask,
      realMask,
      maskBounds: layer.mask ? {
        x: Number(layer.mask.left) || 0,
        y: Number(layer.mask.top) || 0,
        width: Math.max(0, (layer.mask.right || 0) - (layer.mask.left || 0)),
        height: Math.max(0, (layer.mask.bottom || 0) - (layer.mask.top || 0)),
        disabled: layer.mask.disabled === true,
        density: layer.mask.userMaskDensity,
        feather: layer.mask.userMaskFeather,
      } : null,
      vectorData: normalizeVectorData(layer.vectorMask || layer.vectorOrigination),
      effects: normalizeVectorData(layer.effects),
      blendMode: layer.blendMode || 'normal',
      children,
    };
  };

  const layers = await Promise.all((psd.children || []).map((layer, index) => normalizeLayer(layer, null, [index])));
  const flattenedLayers = layers.flatMap(function flatten(layer) {
    return [layer, ...(layer.children || []).flatMap(flatten)];
  });
  console.info('[PSD IMPORT]', {
    canvas: `${psd.width}x${psd.height}`,
    layerCount: flattenedLayers.length,
    textLayerCount: flattenedLayers.filter((layer) => layer.type === 'text').length,
    imageLayerCount: flattenedLayers.filter((layer) => ['image', 'smartObject'].includes(layer.type)).length,
    compositePreviewAvailable: Boolean(previewBuffer),
  });
  return {
    previewBuffer,
    template: {
      type: 'psd',
      status: 'draft',
      parser: 'ag-psd',
      canvas: { width: psd.width, height: psd.height },
      layers,
    },
  };
};

const importPsdTemplateFromStoredFile = async (fileUrl, options = {}) => {
  const storedFile = await readFileByUrl(fileUrl, Infinity);
  return importPsdTemplate(storedFile.buffer, options);
};

module.exports = { importPsdTemplate, importPsdTemplateFromStoredFile, getPixelBuffer, getTextStyle, isRasterTextLayerName, getRasterTextStyle };