import { useEffect, useState } from 'react';
import { useInView } from '../../hooks/useInView';
import Reveal from '../Reveal';
import './StatsSection.css';

const STATS = [
  { value: 10000, suffix: '+', label: 'Designs Created', display: '10,000+' },
  { value: 5000, suffix: '+', label: 'Happy Customers', display: '5,000+' },
  { value: 100, suffix: '+', label: 'Templates', display: '100+' },
  { value: null, label: 'Printing & Delivery', display: 'Fast', text: true },
];

function useCountUp(target, active, duration = 1400) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active || target == null) return undefined;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setCount(target);
      return undefined;
    }

    let start;
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    return undefined;
  }, [active, target, duration]);

  return count;
}

const StatCard = ({ stat, active }) => {
  const animated = useCountUp(stat.value, active && stat.value != null);
  const display =
    stat.text || (active && stat.value != null
      ? `${animated.toLocaleString()}${stat.suffix || ''}`
      : stat.display);

  return (
    <div className="stats-section__card">
      <span className="stats-section__value">{display}</span>
      <span className="stats-section__label">{stat.label}</span>
    </div>
  );
};

const StatsSection = () => {
  const { ref, inView } = useInView({ threshold: 0.2 });

  return (
    <section className="stats-section" ref={ref} aria-labelledby="stats-title">
      <div className="premium-container">
        <Reveal>
          <h2 id="stats-title" className="stats-section__title">
            Built for creators, businesses and events
          </h2>
        </Reveal>
        <div className="stats-section__grid">
          {STATS.map((stat, index) => (
            <Reveal key={stat.label} delay={index * 80}>
              <StatCard stat={stat} active={inView} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
