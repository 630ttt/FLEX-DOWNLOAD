const FAVORITES_KEY = 'yamini-flex.element-favorites';
const RECENT_KEY = 'yamini-flex.element-recent';
const MAX_RECENT = 20;

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or private mode */
  }
};

export const getFavoriteIds = () => readJson(FAVORITES_KEY, []);

export const isFavorite = (id) => getFavoriteIds().includes(id);

export const toggleFavorite = (id) => {
  const current = getFavoriteIds();
  const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
  writeJson(FAVORITES_KEY, next);
  return next;
};

export const getRecentIds = () => readJson(RECENT_KEY, []);

export const pushRecent = (id) => {
  if (!id) return getRecentIds();
  const next = [id, ...getRecentIds().filter((item) => item !== id)].slice(0, MAX_RECENT);
  writeJson(RECENT_KEY, next);
  return next;
};
