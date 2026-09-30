const fs = require('fs');
const path = require('path');
const fontkit = require('fontkit');
const { execFileSync } = require('child_process');

const fontIndexCache = new Map();
const faceCache = new Map();
const openedFontCache = new Map();
const FONT_EXTENSIONS = new Set(['.ttf', '.otf', '.ttc']);
const FONT_ROOTS = process.platform === 'win32'
  ? [path.join(process.env.WINDIR || 'C:\\Windows', 'Fonts')]
  : [
      '/usr/share/fonts',
      '/usr/local/share/fonts',
      path.join(process.env.HOME || '', '.fonts'),
      path.join(process.env.HOME || '', '.local/share/fonts'),
      path.resolve(__dirname, '../../assets/fonts'),
    ];

const normalizeFamily = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const familyPrefix = (family) => normalizeFamily(family).split(' ')[0] || '';

const walkFonts = (root, prefixes, depth = 0) => {
  if (!root || depth > 5 || !fs.existsSync(root)) return [];
  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const fullPath = path.join(root, entry.name);
    if (entry.isFile() && FONT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      const stem = normalizeFamily(path.basename(entry.name, path.extname(entry.name))).replace(/\s+/g, '');
      return prefixes.some((prefix) => stem.startsWith(prefix)) ? [fullPath] : [];
    }
    return entry.isDirectory() ? walkFonts(fullPath, prefixes, depth + 1) : [];
  });
};

const readFaces = (filePath) => {
  if (faceCache.has(filePath)) return faceCache.get(filePath);
  const faces = [];
  try {
    const parsed = fontkit.openSync(filePath);
    const fonts = Array.isArray(parsed.fonts) ? parsed.fonts : [parsed];
    for (const font of fonts) {
      if (!font.familyName || !font.unitsPerEm) continue;
      faces.push({ path: filePath, family: font.familyName, subfamily: font.subfamilyName || '', postscriptName: font.postscriptName || '', unitsPerEm: font.unitsPerEm });
    }
  } catch {
    // Ignore unsupported, corrupt, and protected system font files.
  }
  faceCache.set(filePath, faces);
  return faces;
};

const getFontIndex = (requests) => {
  const cacheKey = requests.map(normalizeFamily).join('|');
  if (fontIndexCache.has(cacheKey)) return fontIndexCache.get(cacheKey);
  const faces = [];
  const files = new Set();
  const prefixes = [...new Set(requests.map(familyPrefix).filter(Boolean))];

  if (process.platform !== 'win32') {
    for (const request of requests) {
      try {
        const match = execFileSync('fc-match', ['-f', '%{file}', request], { encoding: 'utf8', timeout: 1000 }).trim();
        if (match && fs.existsSync(match)) files.add(match);
      } catch {
        // Fontconfig is optional; fall back to likely-name scanning below.
      }
    }
  }

  for (const root of FONT_ROOTS) {
    for (const filePath of walkFonts(root, prefixes)) {
      files.add(filePath);
    }
  }
  for (const filePath of files) faces.push(...readFaces(filePath));
  fontIndexCache.set(cacheKey, faces);
  return faces;
};

const classifyFamily = (family) => {
  const normalized = normalizeFamily(family);
  if (/serif|times|georgia|garamond|baskerville|bodoni/.test(normalized)) return 'serif';
  if (/script|hand|brush|calligraph|cursive/.test(normalized)) return 'script';
  if (/condensed|narrow/.test(normalized)) return 'condensed';
  if (/display|impact|poster|black/.test(normalized)) return 'display';
  return 'sans';
};

const scoreFace = (face, requested, weight, style) => {
  const targetFamily = normalizeFamily(requested);
  const faceFamily = normalizeFamily(face.family);
  const subfamily = normalizeFamily(`${face.subfamily} ${face.postscriptName}`);
  let score = faceFamily === targetFamily ? 100 : 0;
  if (faceFamily.startsWith(targetFamily) || targetFamily.startsWith(faceFamily)) score = Math.max(score, 78);
  if (classifyFamily(face.family) === classifyFamily(requested)) score += 15;

  const wantsItalic = /italic|oblique/i.test(style || '');
  if (wantsItalic && /italic|oblique/.test(subfamily)) score += 14;
  if (wantsItalic && !/italic|oblique/.test(subfamily)) score -= 14;
  if (!wantsItalic && /italic|oblique/.test(subfamily)) score -= 12;

  const numericWeight = Number(weight) || 400;
  const faceBold = /bold|black|heavy|demi/.test(subfamily);
  if (numericWeight >= 600 && faceBold) score += 10;
  if (numericWeight < 600 && !faceBold) score += 6;
  return score;
};

const resolveAvailableFont = (fontFamily, fontWeight = 400, fontStyle = 'normal') => {
  const configuredFallback = process.env.DESIGN_RENDER_FONT?.trim() || 'Arial';
  const requestedList = String(fontFamily || '').split(',').map((family) => family.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  const requests = [...requestedList, configuredFallback, 'Arial', 'Liberation Sans', 'DejaVu Sans'];
  const faces = getFontIndex(requests);
  let best = null;

  for (const requested of requests) {
    if (!faces.length) break;
    const candidate = faces
      .map((face) => ({ face, score: scoreFace(face, requested, fontWeight, fontStyle) }))
      .sort((a, b) => b.score - a.score)[0];
    if (candidate && (!best || candidate.score > best.score)) {
      best = { ...candidate, requested };
    }
    if (candidate?.score >= 100) break;
  }

  if (best) {
    return {
      family: best.face.family,
      path: best.face.path,
      confidence: best.score >= 100 ? 1 : best.score >= 80 ? 0.8 : 0.6,
      exact: best.score >= 100,
      weight: fontWeight,
      style: fontStyle,
    };
  }

  const family = requestedList[0] || configuredFallback;
  return { family, path: null, confidence: 0, exact: false, weight: fontWeight, style: fontStyle };
};

const measureText = ({ fontPath, text, fontSize, letterSpacing = 0, fallbackFactor = 0.54 }) => {
  const fontSizePx = Math.max(1, Number(fontSize) || 12);
  if (fontPath) {
    try {
      let font = openedFontCache.get(fontPath);
      if (!font) {
        font = fontkit.openSync(fontPath);
        openedFontCache.set(fontPath, font);
      }
      const layout = font.layout(String(text));
      const advances = layout.positions.reduce((sum, position) => sum + position.xAdvance, 0);
      const glyphCount = layout.glyphs.length;
      return advances * fontSizePx / font.unitsPerEm + Math.max(0, glyphCount - 1) * Number(letterSpacing || 0);
    } catch {
      // Fall through to a conservative proportional estimate.
    }
  }
  return [...String(text)].reduce((sum, char) => sum + (/[MW@#%]/.test(char) ? 0.82 : /[il.,' ]/.test(char) ? 0.3 : fallbackFactor), 0) * fontSizePx + Math.max(0, String(text).length - 1) * Number(letterSpacing || 0);
};

const clearFontCache = () => { fontIndexCache.clear(); faceCache.clear(); openedFontCache.clear(); };

module.exports = { resolveAvailableFont, measureText, clearFontCache, normalizeFamily };
