import Reveal from '../Reveal';
import { DESIGN_PREVIEW_FALLBACK } from '../../utils/designAssets';
import './DesignGallery.css';

const GALLERY = [
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
];

const DesignGallery = ({ apiDesigns = [] }) => {
  const extra =
    apiDesigns
      .slice(0, 4)
      .map((d) => ({
        src: d.imageUrl || d.thumbnail,
        label: d.title || d.name || 'Studio design',
      }))
      .filter((item) => item.src) || [];

  const items = [...GALLERY, ...extra].slice(0, 12);

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
              className={`design-gallery__item${item.tall ? ' design-gallery__item--tall' : ''}${item.wide ? ' design-gallery__item--wide' : ''}`}
            >
              <figure className="design-gallery__figure">
                <img
                  src={item.src}
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
