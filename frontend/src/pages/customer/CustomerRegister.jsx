import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import CustomerAuthVisual from './CustomerAuthVisual';
import './CustomerAuth.css';

const CustomerRegister = () => {
  const { login } = useCustomerAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', phone: '', password: '', email: '', address: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/customers/register', form);
      login(res.token, res.customer);
      navigate('/account');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="customer-auth-shell">
      <CustomerAuthVisual title="Make room for beautiful ideas.">
        Create an account to save designs, track print orders, and discover templates for celebrations and business.
      </CustomerAuthVisual>
      <div className="page-container customer-auth-page">
      <form className="card customer-auth-card" onSubmit={handleSubmit}>
        <h1 className="section-title">Create Account</h1>
        <p className="section-subtitle">Register to track your orders and manage your profile.</p>

        {error && <p className="order-form-error">{error}</p>}

        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input className="form-input" name="name" value={form.name} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label className="form-label">Phone Number</label>
          <input className="form-input" name="phone" value={form.phone} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            className="form-input"
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            minLength={6}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Email (optional)</label>
          <input className="form-input" type="email" name="email" value={form.email} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label className="form-label">Address (optional)</label>
          <textarea className="form-textarea" name="address" value={form.address} onChange={handleChange} rows={2} />
        </div>

        <button type="submit" className="btn btn-primary customer-auth-btn" disabled={loading}>
          {loading ? 'Creating account...' : 'Register'}
        </button>

        <p className="customer-auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
      </div>
    </div>
  );
};

export default CustomerRegister;
