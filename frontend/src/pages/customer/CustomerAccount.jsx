import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { FaSignOutAlt, FaPaintBrush, FaThLarge, FaShoppingBag, FaFolderOpen } from 'react-icons/fa';
import { api } from '../../api/client';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import Pagination from '../../components/Pagination';
import Loader from '../../components/Loader';
import DesignPreviewImage from '../../components/DesignPreviewImage';
import './CustomerAccount.css';

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace('/api', '');
const resolveFile = (src) => (src?.startsWith('http') ? src : `${API_ORIGIN}${src || ''}`);

const CustomerAccount = () => {
  const { customer, logout, login } = useCustomerAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({ name: '', email: '', address: '' });
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');

  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [feedbackDraftFor, setFeedbackDraftFor] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');

  useEffect(() => {
    api
      .get('/customers/me')
      .then((res) => setProfile({ name: res.data.name, email: res.data.email || '', address: res.data.address || '' }))
      .finally(() => setProfileLoading(false));
  }, []);

  const loadOrders = () => {
    setOrdersLoading(true);
    api
      .get('/customers/me/orders', { page, limit: 10 })
      .then((res) => {
        setOrders(res.data);
        setPagination(res.pagination);
      })
      .finally(() => setOrdersLoading(false));
  };

  useEffect(loadOrders, [page]);

  const handleApprove = async (orderId) => {
    setActionError('');
    setActionLoadingId(orderId);
    try {
      await api.put(`/customers/me/orders/${orderId}/approve`);
      loadOrders();
    } catch (err) {
      setActionError(err.message || 'Failed to approve design');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (orderId) => {
    setActionError('');
    setActionLoadingId(orderId);
    try {
      await api.put(`/customers/me/orders/${orderId}/reject`, { feedback: feedbackText });
      setFeedbackDraftFor(null);
      setFeedbackText('');
      loadOrders();
    } catch (err) {
      setActionError(err.message || 'Failed to send feedback');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleProfileChange = (e) => setProfile((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage('');
    setProfileError('');
    try {
      const res = await api.put('/customers/me', profile);
      login(localStorage.getItem('customer_token'), { ...customer, name: res.data.name });
      setProfileMessage('Profile updated successfully.');
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="page-container customer-account-page">
      <header className="customer-dashboard-hero premium-card">
        <div>
          <span className="section-kicker">Dashboard</span>
          <h1 className="section-title">Welcome back, {customer?.name?.split(' ')[0] || profile.name || 'Creator'}</h1>
          <p className="customer-dashboard-lead">Manage designs, orders, and your studio profile in one place.</p>
        </div>
        <button className="btn btn-outline" type="button" onClick={handleLogout}>
          <FaSignOutAlt /> Logout
        </button>
      </header>

      <div className="customer-quick-actions">
        <Link to="/editor" className="customer-quick-action premium-card">
          <FaPaintBrush />
          <span>Create Design</span>
        </Link>
        <Link to="/templates" className="customer-quick-action premium-card">
          <FaThLarge />
          <span>Browse Templates</span>
        </Link>
        <Link to="/account" className="customer-quick-action premium-card">
          <FaShoppingBag />
          <span>My Orders</span>
        </Link>
        <Link to="/catalogue" className="customer-quick-action premium-card">
          <FaFolderOpen />
          <span>My Designs</span>
        </Link>
      </div>

      <section className="card customer-account-section">
        <h2 className="customer-account-subtitle">Profile</h2>
        {profileLoading ? (
          <Loader label="Loading profile..." />
        ) : (
          <form onSubmit={handleProfileSubmit} className="customer-account-form">
            {profileError && <p className="order-form-error">{profileError}</p>}
            {profileMessage && <p className="customer-account-success">{profileMessage}</p>}

            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" name="name" value={profile.name} onChange={handleProfileChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" name="email" value={profile.email} onChange={handleProfileChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea className="form-textarea" name="address" value={profile.address} onChange={handleProfileChange} rows={2} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        )}
      </section>

      <section className="card customer-account-section">
        <h2 className="customer-account-subtitle">My Orders</h2>
        {actionError && <p className="order-form-error">{actionError}</p>}
        {ordersLoading ? (
          <Loader label="Loading orders..." />
        ) : orders.length === 0 ? (
          <div className="empty-state">You haven't placed any orders yet.</div>
        ) : (
          <>
            <div className="customer-orders-list">
              {orders.map((order) => {
                const needsReview = order.status === 'awaiting-approval' && order.finalDesignFile && !order.finalDesignApproved;
                return (
                  <div key={order._id} className="customer-order-item">
                    <DesignPreviewImage
                      design={order.design}
                      alt={order.design?.title}
                      className="customer-order-thumb"
                    />
                    <div className="customer-order-details">
                      <p className="customer-order-title">{order.design?.title || 'Design'}</p>
                      <p className="customer-order-meta">Qty: {order.quantity} &middot; Placed {new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`badge badge-${order.status}`}>{order.status}</span>
                    {order.finalDesignFile && (
                      <a href={resolveFile(order.finalDesignFile)} target="_blank" rel="noopener noreferrer" className="btn btn-gold customer-order-download">
                        {needsReview ? 'View Final Design' : 'Download Final Design'}
                      </a>
                    )}

                    {needsReview && (
                      <div className="customer-order-review">
                        <p className="customer-order-review-prompt">Do you approve this final design?</p>
                        <div className="customer-order-review-actions">
                          <button
                            className="btn btn-primary"
                            disabled={actionLoadingId === order._id}
                            onClick={() => handleApprove(order._id)}
                          >
                            {actionLoadingId === order._id ? 'Submitting...' : 'Approve Design'}
                          </button>
                          <button
                            className="btn btn-outline"
                            disabled={actionLoadingId === order._id}
                            onClick={() => setFeedbackDraftFor(feedbackDraftFor === order._id ? null : order._id)}
                          >
                            Request Changes
                          </button>
                        </div>
                        {feedbackDraftFor === order._id && (
                          <div className="customer-order-feedback-box">
                            <textarea
                              className="form-textarea"
                              rows={2}
                              placeholder="Tell us what needs to change..."
                              value={feedbackText}
                              onChange={(e) => setFeedbackText(e.target.value)}
                            />
                            <button
                              className="btn btn-primary"
                              disabled={actionLoadingId === order._id || !feedbackText.trim()}
                              onClick={() => handleReject(order._id)}
                            >
                              Send Feedback
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {order.customerFeedback && order.status === 'in-progress' && (
                      <p className="customer-order-feedback-sent">Your feedback: "{order.customerFeedback}"</p>
                    )}
                  </div>
                );
              })}
            </div>
            <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
          </>
        )}
      </section>
    </div>
  );
};

export default CustomerAccount;
