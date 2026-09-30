import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import { listPublishedTemplates } from '../../services/templateService';
import { resolveImageUrl } from '../../utils/designAssets';
import BrandLoader from '../BrandLoader';
import Reveal from '../Reveal';
import './EditorialTemplateRail.css';

const CATEGORY_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'weddings', label: 'Wedding' },
  { id: 'birthdays', label: 'Birthday' },
  { id: 'festivals', label: 'Festival' },
  { id: 'business', label: 'Business' },
  { id: 'religious', label: 'Religious' },
  { id: 'events', label: 'Event' },
  { id: 'education', label: 'School' },
  { id: 'invitations', label: 'Invitation' },
  { id: 'social', label: 'Social' },
];

export default function EditorialTemplateRail() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    let alive = true;
    listPublishedTemplates()
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.templates || data?.data || [];
        if (alive) setTemplates(list);
      })
      .catch(() => {
        if (alive) setTemplates([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (activeCategory === 'all') return templates;
    return templates.filter((t) => String(t.category || '').toLowerCase().includes(activeCategory));
  }, [templates, activeCategory]);

  const display = filtered.length ? filtered : templates;

  return (
    <section className="editorial-rail premium-section" aria-labelledby="editorial-rail-title">
      <div className="premium-container">
        <Reveal>
          <div className="editorial-rail__head">
            <div>
              <span className="section-kicker">Template gallery</span>
              <h2 id="editorial-rail-title" className="section-title">Curated designs, print-ready</h2>
              <p className="editorial-rail__lead">
                Editorial layouts with live previews — customize in the studio and export in HD.
              </p>
            </div>
            <Link to="/templates" className="btn-premium btn-premium--ghost editorial-rail__view-all">
              View all templates <FaArrowRight />
            </Link>
          </div>
        </Reveal>

        <div className="editorial-rail__chips" role="tablist" aria-label="Template categories">
          {CATEGORY_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              role="tab"
              aria-selected={activeCategory === chip.id}
              className={`editorial-rail__chip${activeCategory === chip.id ? ' is-active' : ''}`}
              onClick={() => setActiveCategory(chip.id)}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="editorial-rail__loading">
            <BrandLoader label="Loading templates…" />
          </div>
        ) : (
          <div className="editorial-rail__track premium-scene" role="list">
            {display.slice(0, 12).map((template, index) => {
              const templateId = template._id || template.id;
              const preview = template.previewImage || template.thumbnailUrl || template.previewUrl;
              const size = index % 5 === 0 ? 'is-featured' : index % 3 === 0 ? 'is-tall' : '';
              return (
                <Reveal key={templateId} delay={index * 40} variant="fade-up">
                  <article className={`editorial-rail__card premium-card premium-scene__item ${size}`} role="listitem">
                    <Link to={`/editor/template/${templateId}`} className="editorial-rail__card-link">
                      <div className="editorial-rail__media interactive-image">
                        {preview ? (
                          <img src={resolveImageUrl(preview)} alt="" loading="lazy" decoding="async" />
                        ) : (
                          <div className="editorial-rail__placeholder" aria-hidden="true" />
                        )}
                        <span className="editorial-rail__badge">{template.isPremium || template.premium ? 'Premium' : 'Free'}</span>
                        <span className="editorial-rail__customize">Customize</span>
                      </div>
                      <div className="editorial-rail__meta">
                        <span className="editorial-rail__category">{template.category || 'Design'}</span>
                        <h3>{template.name || 'Untitled template'}</h3>
                        <p>
                          {template.templateJson?.canvas?.width || template.canvas?.width || 1200}×
                          {template.templateJson?.canvas?.height || template.canvas?.height || 800}px
                        </p>
                      </div>
                    </Link>
                  </article>
                </Reveal>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
