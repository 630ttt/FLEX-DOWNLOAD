const sharp = require('sharp');

const MAX_IMAGE_PIXELS = 50_000_000;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const parseHex = (value) => {
  const match = String(value || '').match(/^#([0-9a-f]{6})$/i);
  if (!match) return null;
  return [0, 2, 4].map((offset) => Number.parseInt(match[1].slice(offset, offset + 2), 16));
};

const pixelOffset = (x, y, width) => (y * width + x) * 4;

const colorDistance = (raw, offset, color) => {
  const dr = raw[offset] - color[0];
  const dg = raw[offset + 1] - color[1];
  const db = raw[offset + 2] - color[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
};

const average = (values) => values.length
  ? values.reduce((sum, value) => sum + value, 0) / values.length
  : 0;

const estimateBorderColor = (raw, width, height, box) => {
  const samples = [[], [], []];
  const margin = Math.max(2, Math.min(8, Math.round(Math.min(box.width, box.height) * 0.15)));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const inCore = x >= box.x && x < box.x + box.width && y >= box.y && y < box.y + box.height;
      const nearEdge = x < box.x + margin || x >= box.x + box.width - margin || y < box.y + margin || y >= box.y + box.height - margin;
      if (inCore && !nearEdge) continue;
      const offset = pixelOffset(x, y, width);
      for (let channel = 0; channel < 3; channel += 1) samples[channel].push(raw[offset + channel]);
    }
  }
  return samples.map(average);
};

const createTextMask = ({ raw, width, height, box, element }) => {
  const mask = new Uint8Array(width * height);
  const expectedColor = parseHex(element.textColor);
  const fallbackColor = estimateBorderColor(raw, width, height, box);
  const colorConfidence = Number(element.textColorConfidence ?? element.fontConfidence ?? 0.7);
  const threshold = expectedColor ? (colorConfidence >= 0.8 ? 92 : 68) : 42;
  let marked = 0;

  const startX = clamp(Math.floor(box.x), 0, width);
  const startY = clamp(Math.floor(box.y), 0, height);
  const endX = clamp(Math.ceil(box.x + box.width), 0, width);
  const endY = clamp(Math.ceil(box.y + box.height), 0, height);

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const offset = pixelOffset(x, y, width);
      const distance = colorDistance(raw, offset, expectedColor || fallbackColor);
      let foreground = distance <= threshold;
      if (!expectedColor) {
        const luminance = 0.2126 * raw[offset] + 0.7152 * raw[offset + 1] + 0.0722 * raw[offset + 2];
        const backgroundLuminance = 0.2126 * fallbackColor[0] + 0.7152 * fallbackColor[1] + 0.0722 * fallbackColor[2];
        foreground = Math.abs(luminance - backgroundLuminance) >= threshold;
      }
      if (foreground) {
        mask[y * width + x] = 1;
        marked += 1;
      }
    }
  }

  const coreArea = Math.max(1, (endX - startX) * (endY - startY));
  if (marked === 0 || marked / coreArea > 0.88) {
    throw new Error(`Could not confidently isolate the original text pixels for ${element.semanticType || 'text'}; no pixels were changed.`);
  }

  const dilated = new Uint8Array(mask);
  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      if (!mask[y * width + x]) continue;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= startX && nx < endX && ny >= startY && ny < endY) dilated[ny * width + nx] = 1;
        }
      }
    }
  }
  return dilated;
};

const fastMarchingInpaint = ({ raw, width, height, mask, radius = 5 }) => {
  const state = new Uint8Array(mask.length);
  const pixels = new Uint8Array(raw);
  const queue = [];
  for (let i = 0; i < mask.length; i += 1) state[i] = mask[i] ? 1 : 0;

  const hasKnownNeighbor = (x, y) => {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && state[ny * width + nx] === 0) return true;
      }
    }
    return false;
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (state[index] === 1 && hasKnownNeighbor(x, y)) {
        state[index] = 2;
        queue.push(index);
      }
    }
  }

  let cursor = 0;
  while (cursor < queue.length) {
    const index = queue[cursor++];
    const x = index % width;
    const y = Math.floor(index / width);
    const sums = [0, 0, 0];
    let weights = 0;

    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const neighborIndex = ny * width + nx;
        if (state[neighborIndex] === 1 || state[neighborIndex] === 2) continue;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const directional = 1 + Math.abs(dx) / (distance * 2);
        const weight = directional / (distance * distance + 0.01);
        const offset = pixelOffset(nx, ny, width);
        for (let channel = 0; channel < 3; channel += 1) sums[channel] += pixels[offset + channel] * weight;
        weights += weight;
      }
    }

    if (!weights) {
      state[index] = 0;
      continue;
    }

    const offset = pixelOffset(x, y, width);
    for (let channel = 0; channel < 3; channel += 1) pixels[offset + channel] = Math.round(sums[channel] / weights);
    state[index] = 3;

    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const nextIndex = ny * width + nx;
        if (state[nextIndex] === 1) {
          state[nextIndex] = 2;
          queue.push(nextIndex);
        }
      }
    }
  }

  const unfilled = state.reduce((count, value, index) => count + (mask[index] && value !== 3 ? 1 : 0), 0);
  if (unfilled) throw new Error('Local background reconstruction could not reach all masked text pixels');
  return pixels;
};

const inpaintTextElements = async ({ imageBuffer, elements, changes }) => {
  if (!Buffer.isBuffer(imageBuffer)) throw new Error('imageBuffer must be a Buffer');
  const metadata = await sharp(imageBuffer, { limitInputPixels: MAX_IMAGE_PIXELS }).metadata();
  if (!metadata.width || !metadata.height) throw new Error('Source image has invalid dimensions');
  const byId = new Map(elements.map((element) => [element.id, element]));
  const compositeLayers = [];

  for (const change of changes) {
    if (!['replace_text', 'replace_text_group'].includes(change.operation)) continue;
    const ids = Array.isArray(change.elementIds) ? change.elementIds : [change.elementId];
    const targets = ids.map((id) => byId.get(id)).filter((element) => element?.type === 'text');
    if (!targets.length) throw new Error('Text replacement does not match a detected text element');

    for (const element of targets) {
      const pad = Math.max(6, Math.round((element.fontSize || element.bbox.height) * 0.22));
      const left = clamp(Math.floor(element.bbox.x - pad), 0, metadata.width - 1);
      const top = clamp(Math.floor(element.bbox.y - pad), 0, metadata.height - 1);
      const right = clamp(Math.ceil(element.bbox.x + element.bbox.width + pad), left + 1, metadata.width);
      const bottom = clamp(Math.ceil(element.bbox.y + element.bbox.height + pad), top + 1, metadata.height);
      const width = right - left;
      const height = bottom - top;
      const region = await sharp(imageBuffer).extract({ left, top, width, height }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const box = { x: element.bbox.x - left, y: element.bbox.y - top, width: element.bbox.width, height: element.bbox.height };
      const mask = createTextMask({ raw: region.data, width, height, box, element });
      const reconstructed = fastMarchingInpaint({ raw: region.data, width, height, mask });
      const patch = await sharp(reconstructed, { raw: { width, height, channels: 4 } }).png().toBuffer();
      const alphaMask = Buffer.alloc(mask.length * 4);
      for (let pixel = 0; pixel < mask.length; pixel += 1) {
        const offset = pixel * 4;
        alphaMask[offset] = 255;
        alphaMask[offset + 1] = 255;
        alphaMask[offset + 2] = 255;
        alphaMask[offset + 3] = mask[pixel] ? 255 : 0;
      }
      const alpha = await sharp(alphaMask, { raw: { width, height, channels: 4 } }).png().toBuffer();
      const maskedPatch = await sharp(patch).composite([{ input: alpha, blend: 'dest-in' }]).png().toBuffer();
      compositeLayers.push({ input: maskedPatch, left, top });
    }
  }

  if (!compositeLayers.length) return imageBuffer;
  return sharp(imageBuffer, { limitInputPixels: MAX_IMAGE_PIXELS }).composite(compositeLayers).png().toBuffer();
};

module.exports = { parseHex, createTextMask, fastMarchingInpaint, inpaintTextElements };
