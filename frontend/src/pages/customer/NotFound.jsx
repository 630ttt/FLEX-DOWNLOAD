import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="page-container empty-state">
    <h1 className="section-title">404</h1>
    <p>The page you are looking for does not exist.</p>
    <Link to="/" className="btn btn-primary">Go Home</Link>
  </div>
);

export default NotFound;
