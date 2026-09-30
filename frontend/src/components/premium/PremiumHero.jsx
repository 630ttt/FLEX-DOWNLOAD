import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { DESIGN_PREVIEW_FALLBACK } from '../../utils/designAssets';
import Reveal from '../Reveal';
import './PremiumHero.css';

const BACKGROUND_SLIDES = [
  {
    id: 'weddings',
    image:
      'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=1600&q=80&auto=format&fit=crop',
    label: 'Wedding prints',
  },
  {
    id: 'festivals',
    image:
      'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1600&q=80&auto=format&fit=crop',
    label: 'Festival design',
  },
  {
    id: 'business',
    image:
      'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1600&q=80&auto=format&fit=crop',
    label: 'Business branding',
  },
  {
    id: 'celebrations',
    image:
      'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1600&q=80&auto=format&fit=crop',
    label: 'Celebration cards',
  },
];

const FLOAT_CARDS = [
  {
    id: 1,
    src: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=640&q=80&auto=format&fit=crop',
    alt: 'Wedding invitation',
    z: 55,
    rotate: -7,
    x: -14,
    y: 6,
  },
  {
    id: 2,
    src: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=640&q=80&auto=format&fit=crop',
    alt: 'Festival banner',
    z: 70,
    rotate: 5,
    x: 10,
    y: -8,
  },
  {
    id: 3,
    src: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=640&q=80&auto=format&fit=crop',
    alt: 'Birthday poster',
    z: 85,
    rotate: -2,
    x: -4,
    y: 2,
  },
  {
    id: 4,
    src: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=640&q=80&auto=format&fit=crop',
    alt: 'Business opening banner',
    z: 50,
    rotate: 9,
    x: 16,
    y: 10,
  },
  {
    id: 5,
    src: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=640&q=80&auto=format&fit=crop',
    alt: 'Political event banner',
    z: 62,
    rotate: -11,
    x: -8,
    y: 14,
  },
  {
    id: 6,
    src: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=640&q=80&auto=format&fit=crop',
    alt: 'Printed poster design',
    z: 48,
    rotate: 6,
    x: 6,
    y: -12,
  },
];

const PremiumHero = ({ printDesignImage }) => {
  const reducedMotion = usePrefersReducedMotion();
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [selectedCardId, setSelectedCardId] = useState(6);
  const [activeBackgroundIndex, setActiveBackgroundIndex] = useState(0);

  useEffect(() => {
    if (reducedMotion) return undefined;

    const timer = window.setInterval(() => {
      setActiveBackgroundIndex((prev) => (prev + 1) % BACKGROUND_SLIDES.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [reducedMotion]);

  const handleStageMove = useCallback((event) => {
    if (reducedMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 14;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 10;
    setParallax({ x, y });
  }, [reducedMotion]);

  const handleStageLeave = useCallback(() => {
    setParallax({ x: 0, y: 0 });
  }, []);

  const cards = FLOAT_CARDS.map((card) =>
    card.id === 6 && printDesignImage
      ? { ...card, src: printDesignImage }
      : card
  );

  return (
    <section className="premium-hero" aria-label="Hero">
      <div className="premium-hero__bg" aria-hidden="true">
        <div className="premium-hero__bg-carousel" aria-hidden="true">
          {BACKGROUND_SLIDES.map((slide, index) => (
            <div
              key={slide.id}
              className={`premium-hero__bg-slide${index === activeBackgroundIndex ? ' is-active' : ''}`}
              style={{ backgroundImage: `url(${slide.image})` }}
              aria-label={slide.label}
            />
          ))}
        </div>
      </div>
      <div className="premium-hero__bg-overlay" aria-hidden="true" />
      <div className="premium-container premium-hero__grid">
        <div className="premium-hero__copy">
          <Reveal>
            <span className="section-kicker">Print studio · Design platform</span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="premium-hero__title">
              Create. Customize. <em>Print.</em>
            </h1>
          </Reveal>
          <Reveal delay={140}>
            <p className="premium-hero__lead">
              YAMINI Flex unites a professional design studio, curated templates, and premium print — for weddings,
              festivals, business, and every celebration across India.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <div className="premium-hero__actions">
              <Link to="/catalogue" className="btn-premium btn-premium--primary">
                Explore Designs
                <FaArrowRight />
              </Link>
              <Link to="/editor" className="btn-premium btn-premium--ghost">
                Start Your Own Design
              </Link>
            </div>
          </Reveal>
        </div>

        <div
          className={`premium-hero__stage${reducedMotion ? ' premium-hero__stage--static' : ''}`}
          role="group"
          aria-label="Featured print designs. Select an image to bring it forward."
          onMouseMove={handleStageMove}
          onMouseLeave={handleStageLeave}
        >
          <div className="premium-hero__stage-inner">
            <div
              className="premium-hero__parallax"
              style={{
                transform: `translate3d(${parallax.x}px, ${parallax.y}px, 0)`,
              }}
            >
            {cards.map((card, index) => (
              <button
                type="button"
                key={card.id}
                className={`premium-hero__float-card${selectedCardId === card.id ? ' is-selected' : ''}`}
                aria-label={`Show ${card.alt}`}
                aria-pressed={selectedCardId === card.id}
                onClick={() => setSelectedCardId(card.id)}
                style={{
                  '--z': card.z,
                  zIndex: selectedCardId === card.id ? 100 : card.z,
                  '--rot': `${card.rotate}deg`,
                  '--tx': `${card.x}%`,
                  '--ty': `${card.y}%`,
                  '--float-delay': `${index * 0.35}s`,
                }}
              >
                <img
                  src={card.src}
                  alt=""
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = DESIGN_PREVIEW_FALLBACK;
                  }}
                />
              </button>
            ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PremiumHero;
