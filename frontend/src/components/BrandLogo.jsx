import darkModeLogo from '../assets/yamini-flex-logo.webp';
import lightModeLogo from '../assets/yamini-flex-logo-transparent.webp';

const BrandLogo = ({ className = '' }) => (
  <>
    <img className={`brand-logo brand-logo--light ${className}`} src={lightModeLogo} alt="YAMINI Flex Printing" />
    <img className={`brand-logo brand-logo--dark ${className}`} src={darkModeLogo} alt="YAMINI Flex Printing" />
  </>
);

export default BrandLogo;
