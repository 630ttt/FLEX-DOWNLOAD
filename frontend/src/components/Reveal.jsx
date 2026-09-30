import { useInView } from '../hooks/useInView';
import './Reveal.css';

const Reveal = ({
  children,
  className = '',
  as = 'div',
  delay = 0,
  variant = 'fade-up',
}) => {
  const { ref, inView } = useInView({ once: true });
  const Tag = as;

  return (
    <Tag
      ref={ref}
      className={`reveal reveal--${variant}${inView ? ' reveal--visible' : ''} ${className}`.trim()}
      style={{ '--reveal-delay': `${delay}ms` }}
    >
      {children}
    </Tag>
  );
};

export default Reveal;
