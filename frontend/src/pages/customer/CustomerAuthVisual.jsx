import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

const AUTH_SLIDES = [
  {
    id: 'wedding',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=85',
  },
  {
    id: 'celebration',
    image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1600&q=85',
  },
  {
    id: 'studio',
    image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=85',
  },
];

const CustomerAuthVisual = ({ title, children }) => {
  const reducedMotion = usePrefersReducedMotion();
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    if (reducedMotion) return undefined;

    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % AUTH_SLIDES.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [reducedMotion]);

  return (
    <aside className="customer-auth-visual" aria-label="YAMINI Flex design studio">
      <div className="customer-auth-visual__carousel" aria-hidden="true">
        {AUTH_SLIDES.map((slide, index) => (
          <div
            key={slide.id}
            className={`customer-auth-visual__slide${index === activeSlide ? ' is-active' : ''}`}
            style={{ backgroundImage: `url(${slide.image})` }}
          />
        ))}
      </div>
      <div className="customer-auth-visual__content">
        <span className="customer-auth-visual__eyebrow">YAMINI FLEX · PRINT &amp; DESIGN</span>
        <h2>{title}</h2>
        <p>{children}</p>
        <div className="customer-auth-visual__indicators" aria-hidden="true">
          {AUTH_SLIDES.map((slide, index) => (
            <span key={slide.id} className={index === activeSlide ? 'is-active' : ''} />
          ))}
        </div>
      </div>
    </aside>
  );
};

export default CustomerAuthVisual;