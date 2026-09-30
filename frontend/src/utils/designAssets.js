const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');
export const DESIGN_PREVIEW_FALLBACK = '/design-preview-placeholder.svg';
const PSD_TYPES = new Set(['psd', 'psb']);
const PSD_PATH = /\.(?:psd|psb)(?:[?#].*)?$/i;

export const resolveImageUrl = (src) => {
  if (!src) return '';
  if (src === DESIGN_PREVIEW_FALLBACK) return src;
  if (/^(?:https?:|data:|blob:)/i.test(src)) return src;
  return `${API_ORIGIN}${src.startsWith('/') ? src : `/${src}`}`;
};

export const getDesignImageUrl = (design, fullSize = false) => {
  if (!design) return DESIGN_PREVIEW_FALLBACK;
  const fileType = String(design.fileType || '').toLowerCase().replace(/^\./, '');
  const candidates = fullSize
    ? PSD_TYPES.has(fileType)
      ? [design.previewImage]
      : [design.fullImage, design.previewImage, design.thumbnail]
    : [design.previewImage, ...(!PSD_TYPES.has(fileType) ? [design.thumbnail, design.fullImage] : [])];

  const candidate = candidates.find((src) => src && !PSD_PATH.test(src));
  return candidate ? resolveImageUrl(candidate) : DESIGN_PREVIEW_FALLBACK;
};
