import BrandLogo from './BrandLogo';
import './BrandLoader.css';

const BrandLoader = ({ label = 'Loading experience…', fullscreen = false }) => (
  <div
    className={`brand-loader${fullscreen ? ' brand-loader--fullscreen' : ''}`}
    role="status"
    aria-live="polite"
    aria-busy="true"
  >
    <BrandLogo variant="dark" className="brand-loader__logo" />
    <div className="brand-loader__bar" aria-hidden="true">
      <span />
    </div>
    {label ? <p className="brand-loader__label">{label}</p> : null}
  </div>
);

export default BrandLoader;
