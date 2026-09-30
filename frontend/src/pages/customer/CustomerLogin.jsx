import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { useAuth } from '../../context/AuthContext';
import CustomerAuthVisual from './CustomerAuthVisual';
import './CustomerAuth.css';

const CustomerLogin = () => {
  const { login: customerLogin } = useCustomerAuth();
  const { login: adminLogin } = useAuth();

  const navigate = useNavigate();

  const [form, setForm] = useState({
    phone: '',
    password: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError('');

    const identifier = form.phone.trim();
    const password = form.password;

    try {
      /*
       * =====================================================
       * 1. TRY CUSTOMER LOGIN
       * =====================================================
       */

      try {
        const customerRes = await api.post('/customers/login', {
          phone: identifier,
          password,
        });

        if (customerRes?.token && customerRes?.customer) {
          customerLogin(
            customerRes.token,
            customerRes.customer
          );

          navigate('/account');
          return;
        }
      } catch (customerError) {
        /*
         * Customer login failed.
         * We will now try admin login.
         */
      }

      /*
       * =====================================================
       * 2. TRY ADMIN LOGIN
       * =====================================================
       *
       * Admin login expects:
       * username + password
       *
       * The same input field is used as the username.
       */

      try {
        const adminRes = await api.post('/admin/auth/login', {
          username: identifier,
          password,
        });

        if (adminRes?.token && adminRes?.admin) {
          adminLogin(
            adminRes.token,
            adminRes.admin
          );

          navigate('/admin/dashboard');
          return;
        }
      } catch (adminError) {
        /*
         * Both customer and admin login failed.
         */
      }

      /*
       * =====================================================
       * 3. BOTH FAILED
       * =====================================================
       */

      setError('Invalid phone/username or password.');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="customer-auth-shell">
      <CustomerAuthVisual title="Your idea deserves a beautiful design.">
        Sign in to manage orders, saved templates, and your creative studio. Premium print and design, all in one place.
      </CustomerAuthVisual>
      <div className="page-container customer-auth-page">
      <form
        className="card customer-auth-card"
        onSubmit={handleSubmit}
      >
        <h1 className="section-title">
          Login
        </h1>

        <p className="section-subtitle">
          Login to manage your orders and profile.
        </p>

        {error && (
          <p className="order-form-error">
            {error}
          </p>
        )}

        <div className="form-group">
          <label className="form-label">
            Phone Number / Username
          </label>

          <input
            className="form-input"
            type="text"
            value={form.phone}
            onChange={(e) =>
              setForm({
                ...form,
                phone: e.target.value,
              })
            }
            placeholder="Enter phone number or username"
            autoComplete="username"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            Password
          </label>

          <input
            className="form-input"
            type="password"
            value={form.password}
            onChange={(e) =>
              setForm({
                ...form,
                password: e.target.value,
              })
            }
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary customer-auth-btn"
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>

        <p className="customer-auth-switch">
          Don't have an account?{' '}
          <Link to="/register">
            Register
          </Link>
        </p>
      </form>
      </div>
    </div>
  );
};

export default CustomerLogin;