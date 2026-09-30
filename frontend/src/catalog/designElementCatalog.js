import { FRAME_MASK_LIBRARY } from '../utils/frameMaskFactory';

const elementUrlLoaders = import.meta.glob('../assets/elements/**/*.svg', {
  query: '?url',
  import: 'default',
});

const decorativeFrameLoaders = import.meta.glob('../assets/frames/decorative/*.svg', {
  query: '?url',
  import: 'default',
});

const TAG_HINTS = {
  flowers: ['flower', 'rose', 'bloom', 'petal'],
  leaves: ['leaf', 'fern', 'vine', 'green'],
  wedding: ['wedding', 'bride', 'gold', 'ring'],
  festival: ['festival', 'celebration', 'color'],
  religious: ['religious', 'temple', 'spiritual'],
  diya: ['diya', 'lamp', 'diwali'],
  mandala: ['mandala', 'pattern', 'symmetry'],
  'indian-motifs': ['indian', 'motif', 'traditional', 'ornament'],
  rangoli: ['rangoli', 'kolam', 'festival', 'pattern'],
  borders: ['border', 'frame', 'divider', 'ornament'],
  peacock: ['peacock', 'feather'],
  decorative: ['decorative', 'border', 'ornament'],
  ribbons: ['ribbon', 'bow'],
  badges: ['badge', 'label', 'seal'],
  sparkles: ['sparkle', 'shine', 'glitter'],
  frames: ['frame', 'border', 'gold'],
};

const POPULAR_ELEMENT_IDS = [
  'flowers-flowers-01',
  'flowers-flowers-05',
  'leaves-leaves-03',
  'wedding-wedding-02',
  'festival-festival-04',
  'diya-diya-01',
  'mandala-mandala-02',
  'sparkles-sparkles-01',
  'decorative-decorative-01',
  'ribbons-ribbons-02',
];

const POPULAR_FRAME_IDS = ['mask-circle', 'mask-rounded', 'mask-heart', 'mask-polaroid', 'frame-decorative-01'];

function slugFromPath(path) {
  const parts = path.split('/');
  const file = parts[parts.length - 1].replace('.svg', '');
  const category = parts[parts.length - 2];
  return { category, file, id: `${category}-${file}` };
}

function buildElementEntries() {
  return Object.keys(elementUrlLoaders).map((path) => {
    const { category, file, id } = slugFromPath(path);
    const name = file
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const tags = [
      category.replace(/-/g, ' '),
      name.toLowerCase(),
      ...(TAG_HINTS[category] || []),
    ];
    return {
      id,
      name,
      category,
      type: 'element',
      sourcePath: path,
      thumbnailPath: path,
      tags,
      premium: false,
      recolorable: true,
      popular: POPULAR_ELEMENT_IDS.includes(id),
      loadUrl: elementUrlLoaders[path],
    };
  });
}

function buildDecorativeFrameEntries() {
  return Object.keys(decorativeFrameLoaders).map((path) => {
    const file = path.split('/').pop().replace('.svg', '');
    const id = file;
    const index = Number(file.split('-').pop()) || 0;
    let category = 'frames-decorative';
    if (index <= 8) category = 'frames-wedding';
    else if (index <= 16) category = 'frames-festival';
    else if (index <= 24) category = 'frames-traditional';
    else if (index <= 32) category = 'frames-mandala';
    const name = file.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      id,
      name,
      category,
      type: 'frame-border',
      maskShape: 'rect',
      sourcePath: path,
      thumbnailPath: path,
      tags: ['frame', 'border', 'gold', 'ornamental', ...(TAG_HINTS.decorative || [])],
      premium: index > 24,
      width: 320,
      height: 260,
      popular: POPULAR_FRAME_IDS.includes(id),
      loadUrl: decorativeFrameLoaders[path],
    };
  });
}

const ELEMENT_ENTRIES = buildElementEntries();
const FRAME_BORDER_ENTRIES = buildDecorativeFrameEntries();
const MASK_FRAME_ENTRIES = FRAME_MASK_LIBRARY.map((item) => ({
  ...item,
  type: 'frame-mask',
  tags: item.tags || [],
  popular: POPULAR_FRAME_IDS.includes(item.id),
}));

export const ALL_CATALOG_ASSETS = [...ELEMENT_ENTRIES, ...MASK_FRAME_ENTRIES, ...FRAME_BORDER_ENTRIES];

const urlCache = new Map();

export async function resolveCatalogAssetUrl(asset) {
  if (!asset?.loadUrl) return '';
  if (urlCache.has(asset.id)) return urlCache.get(asset.id);
  const url = await asset.loadUrl();
  urlCache.set(asset.id, url);
  return url;
}

export function searchCatalogAssets(query, { kind = 'all' } = {}) {
  const q = String(query || '').trim().toLowerCase();
  let pool = ALL_CATALOG_ASSETS;
  if (kind === 'elements') pool = ELEMENT_ENTRIES;
  if (kind === 'frames') pool = [...MASK_FRAME_ENTRIES, ...FRAME_BORDER_ENTRIES];
  if (!q) return pool;
  return pool.filter((asset) => {
    const haystack = [asset.name, asset.category, ...(asset.tags || [])].join(' ').toLowerCase();
    return haystack.includes(q) || q.split(/\s+/).every((token) => haystack.includes(token));
  });
}

export function getAssetsByCategory(categoryId, kind = 'elements') {
  if (categoryId === 'popular') {
    return ELEMENT_ENTRIES.filter((a) => a.popular).slice(0, 24);
  }
  if (categoryId === 'frames-popular') {
    return [...MASK_FRAME_ENTRIES, ...FRAME_BORDER_ENTRIES].filter((a) => a.popular).slice(0, 16);
  }
  if (kind === 'frames') {
    if (categoryId.startsWith('frames-')) {
      return [...MASK_FRAME_ENTRIES, ...FRAME_BORDER_ENTRIES].filter((a) => a.category === categoryId);
    }
    return [...MASK_FRAME_ENTRIES, ...FRAME_BORDER_ENTRIES];
  }
  if (categoryId === 'indian-motifs') {
    return ELEMENT_ENTRIES.filter((a) =>
      ['mandala', 'diya', 'religious', 'peacock', 'festival'].includes(a.category)
      || (a.tags || []).some((t) => ['indian', 'traditional', 'ornament'].includes(t))
    );
  }
  if (categoryId === 'rangoli') {
    return ELEMENT_ENTRIES.filter((a) =>
      a.category === 'mandala' || (a.tags || []).some((t) => ['rangoli', 'kolam', 'pattern'].includes(t))
    );
  }
  if (categoryId === 'borders') {
    return ELEMENT_ENTRIES.filter((a) => a.category === 'dividers' || a.category === 'decorative' || a.category === 'ribbons');
  }
  return ELEMENT_ENTRIES.filter((a) => a.category === categoryId);
}

export function getCatalogAssetById(id) {
  return ALL_CATALOG_ASSETS.find((a) => a.id === id) || null;
}

export function getSearchSuggestions(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return ['flower', 'leaf', 'wedding', 'diya', 'festival', 'gold', 'frame', 'border'];
  const matches = new Set();
  ALL_CATALOG_ASSETS.forEach((asset) => {
    asset.tags?.forEach((tag) => {
      if (tag.startsWith(q)) matches.add(tag);
    });
    if (asset.name.toLowerCase().includes(q)) matches.add(asset.name.toLowerCase());
  });
  return Array.from(matches).slice(0, 8);
}

export { ELEMENT_ENTRIES, FRAME_BORDER_ENTRIES, MASK_FRAME_ENTRIES };
