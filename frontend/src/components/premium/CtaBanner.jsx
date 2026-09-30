import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import Reveal from '../Reveal';
import './CtaBanner.css';

const CtaBanner = ({
  title = 'Your idea deserves more than a template.',
  subtitle = 'Create something people remember.',
  primaryTo = '/editor',
  primaryLabel = 'Start Creating',
  secondaryTo = '/templates',
  secondaryLabel = 'Explore Templates',
}) => (
  <section className="cta-banner" aria-label="Call to action">
    <div className="cta-banner__bg" aria-hidden="true" />
    <div className="premium-container cta-banner__inner">
      <Reveal>
        <h2 className="cta-banner__title">{title}</h2>
        <p className="cta-banner__subtitle">{subtitle}</p>
        <div className="cta-banner__actions">
          <Link to={primaryTo} className="btn-premium btn-premium--dark">
            {primaryLabel}
            <FaArrowRight />
          </Link>
          <Link to={secondaryTo} className="btn-premium btn-premium--ghost">
            {secondaryLabel}
          </Link>
        </div>
      </Reveal>
    </div>
  </section>
);

export default CtaBanner;
