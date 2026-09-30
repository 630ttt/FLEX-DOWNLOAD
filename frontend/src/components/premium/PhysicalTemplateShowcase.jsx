import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import Reveal from '../Reveal';
import { useInView } from '../../hooks/useInView';
import { DESIGN_PREVIEW_FALLBACK } from '../../utils/designAssets';
import './PhysicalTemplateShowcase.css';

const STACK = [
  {
    id: 'wedding',
    label: 'Wedding invitation',
    src: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80&auto=format&fit=crop',
    depth: 0,
  },
  {
    id: 'festival',
    label: 'Festival banner',
    src: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80&auto=format&fit=crop',
    depth: 1,
  },
  {
    id: 'birthday',
    label: 'Birthday poster',
    src: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80&auto=format&fit=crop',
    depth: 2,
  },
  {
    id: 'business',
    label: 'Business branding',
    src: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80&auto=format&fit=crop',
    depth: 3,
  },
  {
    id: 'event',
    label: 'Event flyer',
    src: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80&auto=format&fit=crop',
    depth: 4,
  },
];

const BACKGROUND_IMAGES = STACK.map((card) => ({
  ...card,
  alt: card.label,
}));

export default function PhysicalTemplateShowcase() {
  const { ref, inView } = useInView({ once: false });
  const [scrollY, setScrollY] = useState(0);
  const [selectedCardId, setSelectedCardId] = useState('birthday');
  const activeBackground = BACKGROUND_IMAGES.find((card) => card.id === selectedCardId) || BACKGROUND_IMAGES[0];

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSelectedCardId((current) => {
        const currentIndex = STACK.findIndex((card) => card.id === current);
        const nextIndex = (currentIndex + 1) % STACK.length;
        return STACK[nextIndex].id;
      });
    }, 3500);

    return () => window.clearInterval(timer);
  }, []);

  const parallax = inView ? Math.min(40, (scrollY % 800) / 20) : 0;

  return (
    <section className="physical-showcase premium-section" ref={ref} aria-labelledby="physical-showcase-title">
      <div className="premium-container physical-showcase__grid">
        <Reveal variant="slide-right">
          <span className="section-kicker">Printed perfection</span>
          <h2 id="physical-showcase-title" className="section-title">Designs that feel tangible</h2>
          <p className="physical-showcase__lead">
            Templates are composed for real print — invitations, flex, posters, and event branding with depth and
            material-aware layouts.
          </p>
          <Link to="/templates" className="btn-premium btn-premium--primary">
            Explore templates <FaArrowRight />
          </Link>
        </Reveal>

        <div
          className="physical-showcase__stage premium-scene"
          style={{ '--parallax': `${parallax}px` }}
          role="group"
          aria-label="Printed design examples. Select an image to bring it forward."
        >
          <div className="physical-showcase__background" aria-hidden="true">
            {BACKGROUND_IMAGES.map((card) => (
              <div
                key={card.id}
                className={`physical-showcase__background-slide${selectedCardId === card.id ? ' is-active' : ''}`}
                style={{ backgroundImage: `url(${card.src})` }}
              />
            ))}
          </div>
          <div className="physical-showcase__backdrop" aria-hidden="true" />
          {STACK.map((card, index) => (
            <button
              type="button"
              key={card.id}
              className={`physical-showcase__card physical-showcase__card--${index}${selectedCardId === card.id ? ' is-selected' : ''}`}
              aria-label={`Show ${card.label}`}
              aria-pressed={selectedCardId === card.id}
              onClick={() => setSelectedCardId(card.id)}
              style={{
                '--i': index,
                zIndex: selectedCardId === card.id ? 10 : index,
                transform: `translate3d(0, calc(var(--parallax) * ${0.15 + index * 0.1}), 0) rotateY(${-8 + index * 6}deg) rotateX(${4 - index}deg)`,
              }}
            >
              <img
                src={card.src}
                alt=""
                loading="lazy"
                decoding="async"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = DESIGN_PREVIEW_FALLBACK;
                }}
              />
              <span>{card.label}</span>
            </button>
          ))}
          <div className="physical-showcase__dots" aria-label="Template carousel dots">
            {STACK.map((card) => (
              <button
                key={card.id}
                type="button"
                className={`physical-showcase__dot${selectedCardId === card.id ? ' is-active' : ''}`}
                aria-label={`View ${card.label}`}
                onClick={() => setSelectedCardId(card.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
