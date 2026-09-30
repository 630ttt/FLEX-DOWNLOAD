import { useEffect, useState } from 'react';
import {
  FaCog,
  FaBuilding,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaWhatsapp,
  FaSave,
  FaTimes,
  FaShieldAlt,
  FaPalette,
  FaImage,
} from 'react-icons/fa';
import { api } from '../../api/client';
import './AdminSettings.css';

const defaultSettings = {
  shopName: 'YAMINI FLEX PRINTING',
  shopSubtitle: 'Cherukupalli',
  phone: '7801016470',
  whatsapp: '7801016470',
  email: 'yamini.flex.printing@example.com',
  address: 'Behind Bhaskar Theatre, Tenali Road, Cherukupalli',
  logoText: 'YAMINI FLEX PRINTING',
  primaryColor: '#0757b8',
  secondaryColor: '#f5b800',
  currency: 'INR',
  paymentMode: 'Cash / UPI / PhonePe',
  orderNotificationEmail: true,
  orderNotificationWhatsApp: true,
  autoDownloadAfterPayment: true,
};

const AdminSettings = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await api.get('/admin/settings');
        if (res?.data) {
          setSettings({ ...defaultSettings, ...res.data });
        }
      } catch (err) {
        setError(err.message || 'Unable to load saved settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setSettings((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      if (!settings.shopName.trim()) {
        setError('Shop name is required');
        return;
      }

      if (!settings.phone.trim()) {
        setError('Phone number is required');
        return;
      }

      setSaving(true);
      const res = await api.put('/admin/settings', settings);
      setSettings({ ...defaultSettings, ...res.data });
      setMessage(res.message || 'Settings saved successfully');
    } catch (err) {
      setError(err.message || 'Unable to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    setError('');
    setMessage('Settings reset to default');
  };

  return (
    <div className="admin-settings-page">
      <section className="admin-settings-header">
        <div className="admin-settings-heading">
          <span className="admin-settings-kicker"><FaCog /> Admin Settings</span>
          <h1 className="section-title">Website Settings</h1>
          <p className="section-subtitle">Manage shop identity, contacts, payments and workflow preferences.</p>
        </div>
      </section>

      {error && <div className="admin-settings-error">{error}</div>}
      {message && <div className="admin-settings-success">{message}</div>}

      {loading ? (
        <div className="admin-settings-loader"><span className="loader-spine"></span></div>
      ) : (
      <form className="admin-settings-grid" onSubmit={handleSave}>
        <section className="admin-settings-card profile-card">
          <div className="admin-settings-card-head">
            <span><FaBuilding /> Business Details</span>
            <span className="admin-settings-card-status">Store</span>
          </div>

          <div className="admin-settings-form-grid">
            <label className="admin-settings-label">
              Shop Name
              <input name="shopName" value={settings.shopName} onChange={handleChange} required />
            </label>
            <label className="admin-settings-label">
              Subtitle / Area
              <input name="shopSubtitle" value={settings.shopSubtitle} onChange={handleChange} />
            </label>
            <label className="admin-settings-label">
              Logo Text
              <input name="logoText" value={settings.logoText} onChange={handleChange} />
            </label>
            <label className="admin-settings-label">
              Currency
              <select name="currency" value={settings.currency} onChange={handleChange}>
                <option>INR</option>
                <option>USD</option>
                <option>EUR</option>
              </select>
            </label>
          </div>
        </section>

        <section className="admin-settings-card contact-card">
          <div className="admin-settings-card-head">
            <span><FaPhone /> Contact & Address</span>
            <span className="admin-settings-card-status">Contact</span>
          </div>

          <div className="admin-settings-form-grid">
            <label className="admin-settings-label">
              Phone
              <input name="phone" value={settings.phone} onChange={handleChange} required />
            </label>
            <label className="admin-settings-label">
              WhatsApp
              <input name="whatsapp" value={settings.whatsapp} onChange={handleChange} />
            </label>
            <label className="admin-settings-label">
              Email
              <input name="email" type="email" value={settings.email} onChange={handleChange} />
            </label>
            <label className="admin-settings-label full">
              Address
              <textarea name="address" value={settings.address} onChange={handleChange} />
            </label>
          </div>
        </section>

        <section className="admin-settings-card brand-card">
          <div className="admin-settings-card-head">
            <span><FaPalette /> Visual Style</span>
            <span className="admin-settings-card-status">Brand</span>
          </div>

          <div className="admin-settings-form-grid">
            <label className="admin-settings-label">
              Primary Color
              <input name="primaryColor" type="color" value={settings.primaryColor} onChange={handleChange} />
            </label>
            <label className="admin-settings-label">
              Secondary Color
              <input name="secondaryColor" type="color" value={settings.secondaryColor} onChange={handleChange} />
            </label>
            <label className="admin-settings-label">
              Payment Mode
              <select name="paymentMode" value={settings.paymentMode} onChange={handleChange}>
                <option>Cash / UPI / PhonePe</option>
                <option>Cash</option>
                <option>UPI</option>
                <option>PhonePe</option>
                <option>Cash / UPI</option>
              </select>
            </label>
          </div>
        </section>

        <section className="admin-settings-card preview-card">
          <div className="admin-settings-card-head">
            <span><FaCog /> Live Preview</span>
          </div>
          <div className="admin-settings-preview">
            <div className="admin-settings-preview-brand">
              <span className="preview-logo">
                <FaBuilding />
              </span>
              <span>
                <span className="preview-shop-name">{settings.shopName}</span>
                <span className="preview-shop-subtitle">{settings.shopSubtitle}</span>
              </span>
            </div>
            <div className="admin-settings-preview-contact">
              <span><FaPhone /> {settings.phone}</span>
              <span><FaWhatsapp /> {settings.whatsapp}</span>
              <span><FaEnvelope /> {settings.email}</span>
              <span><FaMapMarkerAlt /> {settings.address}</span>
            </div>
          </div>
        </section>

        <section className="admin-settings-card actions-card">
          <div className="admin-settings-card-head">
            <span><FaSave /> Actions</span>
          </div>
          <div className="admin-settings-actions">
            <button type="button" className="btn btn-secondary" onClick={handleReset}><FaTimes /> Reset</button>
            <button type="submit" className="btn btn-primary" disabled={saving}><FaSave /> {saving ? 'Saving...' : 'Save Settings'}</button>
          </div>
        </section>
      </form>
      )}
    </div>
  );
};

export default AdminSettings;
