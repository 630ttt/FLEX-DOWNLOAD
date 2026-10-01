import { useEffect, useState } from 'react';
import Reveal from '../Reveal';
import { DESIGN_PREVIEW_FALLBACK } from '../../utils/designAssets';
import { api } from '../../api/client';
import './DesignGallery.css';

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
const resolveImageUrl = (src) => src?.startsWith('/') ? `${API_ORIGIN}${src}` : src;

const DEFAULT_GALLERY = [
  {
    src: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=900&q=85&auto=format&fit=crop',
    label: 'Wedding',
    tall: true,
  },
  {
    src: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=85&auto=format&fit=crop',
    label: 'Festival poster',
  },
  {
    src: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=900&q=85&auto=format&fit=crop',
    label: 'Business ad',
  },
  {
    src: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=900&q=85&auto=format&fit=crop',
    label: 'Corporate',
    wide: true,
  },
  {
    src: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=900&q=85&auto=format&fit=crop',
    label: 'Birthday',
  },
  {
    src: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=85&auto=format&fit=crop',
    label: 'Event banner',
    tall: true,
  },
  {
    src: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=900&q=85&auto=format&fit=crop',
    label: 'Social creative',
  },
  {
    src: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=900&q=85&auto=format&fit=crop',
    label: 'Invitation',
  },
  {
    src: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=900&q=85&auto=format&fit=crop',
    label: 'Design studio',
  },
  {
    src: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=900&q=85&auto=format&fit=crop',
    label: 'Celebration',
    short: true,
  },
  {
    src: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=900&q=85&auto=format&fit=crop',
    label: 'Event details',
    short: true,
  },
];

const GALLERY_END = [
  {
    src: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&q=85&auto=format&fit=crop',
    label: 'Celebration lights',
    short: true,
  },
  {
    src: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=900&q=85&auto=format&fit=crop',
    label: 'Reception detail',
    short: true,
  },
];

const DesignGallery = ({ apiDesigns = [] }) => {
  const [gallery, setGallery] = useState(DEFAULT_GALLERY);

  useEffect(() => {
    let active = true;

    api
      .get('/site-settings')
      .then((response) => {
        const saved = response?.data?.inspirationGalleryItems || response?.inspirationGalleryItems || DEFAULT_GALLERY;

        if (active) {
          const normalized = normalizeGalleryItems(saved);
          setGallery(normalized);
        }
      })
      .catch(() => {
        if (active) {
          setGallery(DEFAULT_GALLERY);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const normalizeGalleryItems = (items = []) => {
    if (!Array.isArray(items)) {
      return DEFAULT_GALLERY;
    }

    const parsed = items
      .filter((item) => item && (item.src || item.image || item.imageUrl))
      .map((item) => ({
        src: item.src || item.image || item.imageUrl,
        label: item.label || item.name || 'Studio design',
        tall: Boolean(item.tall),
        wide: Boolean(item.wide),
        short: Boolean(item.short),
      }));

    return parsed.length ? parsed : DEFAULT_GALLERY;
  };

  const extra =
    apiDesigns
      .slice(0, 4)
      .map((d) => ({
        src: d.imageUrl || d.thumbnail,
        label: d.title || d.name || 'Studio design',
      }))
      .filter((item) => item.src) || [];

  const items = [...gallery, ...extra, ...GALLERY_END].slice(0, 17);

  return (
    <section className="premium-section design-gallery" aria-labelledby="design-gallery-title">
      <div className="premium-container">
        <Reveal>
          <div className="design-gallery__header">
            <span className="section-kicker">Inspiration</span>
            <h2 id="design-gallery-title" className="section-title">
              Designed to Make an Impression
            </h2>
          </div>
        </Reveal>

        <div className="design-gallery__masonry">
          {items.map((item, index) => (
            <Reveal
              key={`${item.src}-${index}`}
              delay={(index % 6) * 50}
              className={`design-gallery__item${item.tall ? ' design-gallery__item--tall' : ''}${item.wide ? ' design-gallery__item--wide' : ''}${item.short ? ' design-gallery__item--short' : ''}`}
            >
              <figure className="design-gallery__figure">
                <img
                  src={resolveImageUrl(item.src)}
                  alt={item.label}
                  loading="lazy"
                  decoding="async"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = DESIGN_PREVIEW_FALLBACK;
                  }}
                />
                <figcaption>{item.label}</figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DesignGallery;
