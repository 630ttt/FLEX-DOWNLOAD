import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FaHeart, FaRegHeart, FaEye, FaArrowRight } from 'react-icons/fa';
import { listPublishedTemplates } from '../../services/templateService';
import { resolveImageUrl } from '../../utils/designAssets';
import BrandLoader from '../../components/BrandLoader';
import Reveal from '../../components/Reveal';
import './TemplateBrowser.css';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'weddings', label: 'Weddings' },
  { id: 'birthdays', label: 'Birthdays' },
  { id: 'festivals', label: 'Festivals' },
  { id: 'business', label: 'Business' },
  { id: 'events', label: 'Events' },
  { id: 'education', label: 'Education' },
  { id: 'religious', label: 'Religious' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'social', label: 'Social Media' },
  { id: 'invitations', label: 'Invitations' },
];

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'trending', label: 'Trending' },
  { id: 'new', label: 'New' },
  { id: 'popular', label: 'Popular' },
  { id: 'recommended', label: 'Recommended' },
];

const FAVORITES_KEY = 'yamini-template-favorites';

const TemplateBrowser = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const category = searchParams.get('category') || 'all';
  const filter = searchParams.get('filter') || 'all';

  useEffect(() => {
    let active = true;
    listPublishedTemplates()
      .then((data) => {
        if (active) setTemplates(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Could not load templates');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const filtered = useMemo(() => {
    let list = [...templates];
    const q = search.trim().toLowerCase();

    if (q) {
      list = list.filter((t) => (t.name || '').toLowerCase().includes(q));
    }

    if (category !== 'all') {
      list = list.filter((t) => {
        const tags = `${t.name || ''} ${t.description || ''} ${t.category || ''}`.toLowerCase();
        return tags.includes(category.replace('-', ' '));
      });
    }

    if (filter === 'new') {
      list = [...list].reverse();
    } else if (filter === 'popular' || filter === 'trending' || filter === 'recommended') {
      list = [...list].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    }

    return list;
  }, [templates, search, category, filter]);

  const setCategory = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id === 'all') next.delete('category');
    else next.set('category', id);
    setSearchParams(next);
  };

  const setFilter = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id === 'all') next.delete('filter');
    else next.set('filter', id);
    setSearchParams(next);
  };

  return (
    <main className="template-browser-page">
      <header className="template-browser-hero page-hero-strip premium-container">
        <Reveal>
          <span className="section-kicker">Design Studio</span>
          <h1 className="section-title">
            <span className="template-browser-title-main">Find the</span>{' '}
            <span className="template-browser-title-accent">Perfect Design</span>
          </h1>
          <p className="template-browser-lead">
            Search curated layouts, personalize allowed details, and export at print dimensions.
          </p>
        </Reveal>

        <div className="template-browser-toolbar premium-card">
          <input
            type="search"
            className="template-browser-search"
            placeholder="Search templates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search templates"
          />
          <div className="template-browser-filters" role="tablist" aria-label="Template filters">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`template-browser-chip${filter === f.id ? ' is-active' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <nav className="template-browser-categories" aria-label="Categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`template-browser-chip${category === cat.id ? ' is-active' : ''}`}
              onClick={() => setCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="premium-container template-browser-body">
        {error && <p className="template-browser-error" role="alert">{error}</p>}
        {loading ? (
          <BrandLoader label="Loading templates…" />
        ) : error ? null : filtered.length ? (
          <div className="template-browser-grid">
            {filtered.map((template, index) => {
              const fav = favorites.includes(template._id);
              return (
                <Reveal key={template._id} delay={(index % 8) * 40}>
                  <article className="template-browser-card premium-card premium-scene__item">
                    <div className="template-browser-preview">
                      {template.previewImage ? (
                        <img
                          src={resolveImageUrl(template.previewImage)}
                          alt={`${template.name} preview`}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <span className="template-browser-preview-fallback">Preview unavailable</span>
                      )}
                      <div className="template-browser-card-actions">
                        <button
                          type="button"
                          className="template-browser-icon-btn"
                          aria-label={fav ? 'Remove favorite' : 'Add favorite'}
                          onClick={() => toggleFavorite(template._id)}
                        >
                          {fav ? <FaHeart /> : <FaRegHeart />}
                        </button>
                        <Link
                          to={`/editor/template/${template._id}`}
                          className="template-browser-icon-btn"
                          aria-label={`Preview ${template.name}`}
                        >
                          <FaEye />
                        </Link>
                      </div>
                    </div>
                    <div className="template-browser-card-body">
                      <div>
                        <h2>{template.name}</h2>
                        <p>
                          {template.templateJson?.canvas?.width} × {template.templateJson?.canvas?.height}
                        </p>
                      </div>
                      <Link
                        to={`/editor/template/${template._id}`}
                        className="btn-premium btn-premium--primary template-browser-use"
                      >
                        Open in studio
                        <FaArrowRight />
                      </Link>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        ) : (
          <div className="template-browser-empty premium-card">
            <h2>No templates match</h2>
            <p>Try another category or check back when new layouts are published.</p>
          </div>
        )}
      </div>
    </main>
  );
};

export default TemplateBrowser;
