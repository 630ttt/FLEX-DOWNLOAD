import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getAssetsByCategory,
  getCatalogAssetById,
  getSearchSuggestions,
  resolveCatalogAssetUrl,
  searchCatalogAssets,
} from '../../catalog/designElementCatalog';
import { ELEMENT_CATEGORIES, FRAME_CATEGORIES } from '../../catalog/elementCategories';
import { getFavoriteIds, getRecentIds, isFavorite, pushRecent, toggleFavorite } from '../../utils/elementLibraryStorage';
import './ElementsLibraryPanel.css';

const DRAG_MIME = 'application/x-yamini-element';

function AssetThumb({ asset, onSelect, onToggleFavorite, isFav, onDragStart, compact }) {
  const [url, setUrl] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    setError(false);
    resolveCatalogAssetUrl(asset)
      .then((resolved) => {
        if (active) {
          setUrl(resolved);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [asset.id]);

  return (
    <button
      type="button"
      className={`yamini-asset-card${loaded ? ' is-loaded' : ''}${compact ? ' yamini-asset-card--compact' : ''}`}
      title={asset.name}
      draggable
      onMouseDown={(event) => event.preventDefault()}
      onDragStart={(event) => {
        event.dataTransfer.setData(DRAG_MIME, asset.id);
        event.dataTransfer.effectAllowed = 'copy';
        onDragStart?.(asset);
      }}
      onClick={() => onSelect(asset)}
    >
      <span className="yamini-asset-card__media">
        {!loaded && !error && <span className="yamini-asset-card__skeleton" aria-hidden="true" />}
        {error && <span className="yamini-asset-card__fallback">◇</span>}
        {url && <img src={url} alt="" loading="lazy" decoding="async" />}
        {asset.premium && <span className="yamini-asset-card__badge">Pro</span>}
      </span>
      {!compact && <span className="yamini-asset-card__label">{asset.name}</span>}
      <span
        role="button"
        tabIndex={-1}
        className={`yamini-asset-card__fav${isFav ? ' is-active' : ''}`}
        aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => {
          event.stopPropagation();
          onToggleFavorite(asset.id);
        }}
      >
        ★
      </span>
    </button>
  );
}

export default function ElementsLibraryPanel({
  mode = 'elements',
  onModeChange,
  onAddAsset,
  onDragAsset,
  compact = false,
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(mode === 'frames' ? 'frames-popular' : 'popular');
  const [favorites, setFavorites] = useState(() => getFavoriteIds());
  const [recentIds, setRecentIds] = useState(() => getRecentIds());
  const [loadingCategory, setLoadingCategory] = useState(false);

  const categories = mode === 'frames' ? FRAME_CATEGORIES : ELEMENT_CATEGORIES;

  useEffect(() => {
    setCategory(mode === 'frames' ? 'frames-popular' : 'popular');
  }, [mode]);

  const assets = useMemo(() => {
    if (query.trim()) {
      return searchCatalogAssets(query, { kind: mode === 'frames' ? 'frames' : 'elements' }).slice(0, compact ? 24 : 200);
    }
    if (category === 'favorites') {
      return favorites
        .map((id) => getCatalogAssetById(id))
        .filter(Boolean)
        .filter((asset) => (mode === 'frames' ? asset.type !== 'element' : asset.type === 'element'));
    }
    if (category === 'recent') {
      return recentIds
        .map((id) => getCatalogAssetById(id))
        .filter(Boolean)
        .filter((asset) => (mode === 'frames' ? asset.type !== 'element' : asset.type === 'element'));
    }
    const list = getAssetsByCategory(category, mode === 'frames' ? 'frames' : 'elements');
    return compact ? list.slice(0, 24) : list;
  }, [query, category, favorites, recentIds, mode, compact]);

  useEffect(() => {
    setLoadingCategory(true);
    const timer = window.setTimeout(() => setLoadingCategory(false), 120);
    return () => window.clearTimeout(timer);
  }, [category, query, mode]);

  const suggestions = useMemo(() => getSearchSuggestions(query), [query]);

  const handleSelect = useCallback((asset) => {
    pushRecent(asset.id);
    setRecentIds(getRecentIds());
    onAddAsset?.(asset);
  }, [onAddAsset]);

  const handleFavorite = useCallback((id) => {
    setFavorites(toggleFavorite(id));
  }, []);

  const emptyLabel = mode === 'frames'
    ? 'No frames match. Try “gold” or “circle”.'
    : 'No elements match. Try “flower” or “leaf”.';

  const libraryType = mode === 'frames' ? 'frames' : 'elements';

  return (
    <div className={`yamini-elements-panel${compact ? ' yamini-elements-panel--compact' : ''}`}>
      {compact ? (
        <div className="yamini-elements-panel__compact-row">
          <label className="yamini-elements-panel__select-label">
            Type
            <select
              value={libraryType}
              onChange={(event) => onModeChange?.(event.target.value)}
              aria-label="Library type"
            >
              <option value="elements">Elements</option>
              <option value="frames">Frames</option>
            </select>
          </label>
          <label className="yamini-elements-panel__select-label">
            Category
            <select
              value={category}
              onChange={(event) => {
                setQuery('');
                setCategory(event.target.value);
              }}
              aria-label="Category"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <div className="yamini-elements-panel__tabs" role="tablist" aria-label="Library section">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'elements'}
            className={mode === 'elements' ? 'is-active' : ''}
            onClick={() => onModeChange?.('elements')}
          >
            Elements
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'frames'}
            className={mode === 'frames' ? 'is-active' : ''}
            onClick={() => onModeChange?.('frames')}
          >
            Frames
          </button>
        </div>
      )}

      <div className="yamini-elements-panel__search">
        <input
          type="search"
          placeholder={mode === 'frames' ? 'Search frames…' : 'Search elements…'}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search library"
        />
        {query && suggestions.length > 0 && !compact && (
          <div className="yamini-elements-panel__suggestions">
            {suggestions.map((item) => (
              <button key={item} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setQuery(item)}>
                {item}
              </button>
            ))}
          </div>
        )}
      </div>

      {!compact && (
        <div className="yamini-elements-panel__categories" role="tablist" aria-label="Categories">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={category === cat.id}
              className={category === cat.id ? 'is-active' : ''}
              onClick={() => {
                setQuery('');
                setCategory(cat.id);
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      <div className={`yamini-elements-panel__grid${loadingCategory ? ' is-loading' : ''}`}>
        {loadingCategory && assets.length > 0 && (
          <div className="yamini-elements-panel__grid-overlay" aria-hidden="true" />
        )}
        {assets.length ? assets.map((asset) => (
          <AssetThumb
            key={asset.id}
            asset={asset}
            compact={compact}
            isFav={isFavorite(asset.id)}
            onSelect={handleSelect}
            onToggleFavorite={handleFavorite}
            onDragStart={onDragAsset}
          />
        )) : (
          <p className="yamini-elements-panel__empty">{emptyLabel}</p>
        )}
      </div>
      <p className="yamini-elements-panel__hint">{compact ? 'Tap to add · drag to canvas' : 'Click or drag onto the canvas. SVG assets stay sharp for print.'}</p>
    </div>
  );
}

export { DRAG_MIME };
