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
import API_BASE_URL, { api } from '../../api/client';
import './AdminSettings.css';

const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');
const resolveImageUrl = (src) => src?.startsWith('/') ? `${API_ORIGIN}${src}` : src || '';

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
  productShowcaseItems: [
    { name: 'Banners', category: 'Large format', image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=85&auto=format&fit=crop', to: '/catalogue' },
    { name: 'Posters', category: 'Events & retail', image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=85&auto=format&fit=crop', to: '/catalogue' },
    { name: 'Invitations', category: 'Celebrations', image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=85&auto=format&fit=crop', to: '/templates' },
    { name: 'Business Cards', category: 'Brand identity', image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&q=85&auto=format&fit=crop', to: '/catalogue' },
    { name: 'Flyers', category: 'Promotions', image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=85&auto=format&fit=crop', to: '/catalogue' },
    { name: 'Wedding Invitations', category: 'Weddings', image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=85&auto=format&fit=crop', to: '/templates' },
    { name: 'Event Posters', category: 'Events', image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=85&auto=format&fit=crop', to: '/catalogue' },
    { name: 'Social Media Creatives', category: 'Digital-first', image: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&q=85&auto=format&fit=crop', to: '/inspiration' },
  ],
  inspirationGalleryItems: [
    { src: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=900&q=85&auto=format&fit=crop', label: 'Wedding', tall: true },
    { src: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=85&auto=format&fit=crop', label: 'Festival poster' },
    { src: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=900&q=85&auto=format&fit=crop', label: 'Business ad' },
    { src: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=900&q=85&auto=format&fit=crop', label: 'Corporate', wide: true },
    { src: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=900&q=85&auto=format&fit=crop', label: 'Birthday' },
    { src: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=85&auto=format&fit=crop', label: 'Event banner', tall: true },
    { src: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=900&q=85&auto=format&fit=crop', label: 'Social creative' },
    { src: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=900&q=85&auto=format&fit=crop', label: 'Invitation' },
    { src: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=900&q=85&auto=format&fit=crop', label: 'Design studio' },
    { src: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=900&q=85&auto=format&fit=crop', label: 'Celebration', short: true },
    { src: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=900&q=85&auto=format&fit=crop', label: 'Event details', short: true },
    { src: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&q=85&auto=format&fit=crop', label: 'Celebration lights', short: true },
    { src: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=900&q=85&auto=format&fit=crop', label: 'Reception detail', short: true },
  ],
};

const AdminSettings = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingImages, setUploadingImages] = useState({});
  const [savingImageUrls, setSavingImageUrls] = useState({});
  const [imageSourceModes, setImageSourceModes] = useState({});

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

  const handleHomepageItemChange = (section, index, key, value) => {
    const settingKey = section === 'products' ? 'productShowcaseItems' : 'inspirationGalleryItems';
    setSettings((current) => ({
      ...current,
      [settingKey]: current[settingKey].map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      ),
    }));
  };

  const handleHomepageItemAdd = (section) => {
    const settingKey = section === 'products' ? 'productShowcaseItems' : 'inspirationGalleryItems';
    const item = section === 'products'
      ? { name: 'New product', category: 'Custom print', image: '', to: '/catalogue' }
      : { label: 'New inspiration', src: '', tall: false, wide: false, short: false };
    setSettings((current) => ({ ...current, [settingKey]: [...current[settingKey], item] }));
  };

  const handleHomepageItemRemove = (section, index) => {
    const settingKey = section === 'products' ? 'productShowcaseItems' : 'inspirationGalleryItems';
    setSettings((current) => ({
      ...current,
      [settingKey]: current[settingKey].filter((_item, itemIndex) => itemIndex !== index),
    }));
  };

  const getImageSourceMode = (section, index, imageUrl) => {
    const key = `${section}-${index}`;
    return imageSourceModes[key] || (/^https?:\/\//i.test(imageUrl || '') ? 'url' : 'device');
  };

  const renderImageSourceEditor = (section, index, imageUrl) => {
    const uploadKey = `${section}-${index}`;
    const mode = getImageSourceMode(section, index, imageUrl);
    const imageField = section === 'products' ? 'image' : 'src';

    return (
      <div className="homepage-image-source">
        <div className="homepage-image-source__options" role="group" aria-label="Choose image source">
          <button
            type="button"
            className={mode === 'device' ? 'is-active' : ''}
            aria-pressed={mode === 'device'}
            onClick={() => setImageSourceModes((current) => ({ ...current, [uploadKey]: 'device' }))}
          >
            Upload from device
          </button>
          <button
            type="button"
            className={mode === 'url' ? 'is-active' : ''}
            aria-pressed={mode === 'url'}
            onClick={() => setImageSourceModes((current) => ({ ...current, [uploadKey]: 'url' }))}
          >
            Use image URL
          </button>
        </div>
        {mode === 'url' ? (
          <div className="homepage-image-source__url">
            <label className="admin-settings-label">
              Image URL
              <input
                type="url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl || ''}
                onChange={(e) => handleHomepageItemChange(section, index, imageField, e.target.value)}
              />
            </label>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={savingImageUrls[uploadKey] || !imageUrl?.trim()}
              onClick={() => handleHomepageUrlSave(section, index)}
            >
              {savingImageUrls[uploadKey] ? 'Saving...' : 'Save URL'}
            </button>
          </div>
        ) : (
          <label className="btn btn-secondary homepage-image-upload">
            {uploadingImages[uploadKey] ? 'Uploading...' : 'Choose image file'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={uploadingImages[uploadKey]}
              onChange={(e) => {
                handleHomepageImageUpload(section, index, e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
        )}
      </div>
    );
  };

  const handleHomepageImageUpload = async (section, index, file) => {
    if (!file) return;
    const uploadKey = `${section}-${index}`;
    const body = new FormData();
    body.append('image', file);
    body.append('section', section);
    body.append('index', String(index));
    const items = section === 'products' ? settings.productShowcaseItems : settings.inspirationGalleryItems;
    body.append('items', JSON.stringify(items));
    setError('');
    setMessage('');
    setUploadingImages((current) => ({ ...current, [uploadKey]: true }));

    try {
      const response = await api.post('/admin/settings/homepage-image', body);
      const imageField = section === 'products' ? 'image' : 'src';
      const settingKey = section === 'products' ? 'productShowcaseItems' : 'inspirationGalleryItems';
      setSettings((current) => ({
        ...current,
        [settingKey]: current[settingKey].map((entry, entryIndex) => entryIndex === index
          ? { ...entry, [imageField]: response.data.imageUrl }
          : entry),
      }));
      setMessage(response.message || 'Homepage image uploaded');
    } catch (err) {
      setError(err.message || 'Unable to upload homepage image');
    } finally {
      setUploadingImages((current) => ({ ...current, [uploadKey]: false }));
    }
  };

  const handleHomepageUrlSave = async (section, index) => {
    const settingKey = section === 'products' ? 'productShowcaseItems' : 'inspirationGalleryItems';
    const imageField = section === 'products' ? 'image' : 'src';
    const uploadKey = `${section}-${index}`;
    const imageUrl = settings[settingKey][index]?.[imageField]?.trim();

    try {
      const parsedUrl = new URL(imageUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Use a valid HTTP or HTTPS image URL');
    } catch (err) {
      setError(err.message === 'Use a valid HTTP or HTTPS image URL' ? err.message : 'Enter a valid image URL before saving');
      return;
    }

    setError('');
    setMessage('');
    setSavingImageUrls((current) => ({ ...current, [uploadKey]: true }));
    try {
      const response = await api.put('/admin/settings', settings);
      setSettings({ ...defaultSettings, ...response.data });
      setMessage('Image URL saved. It will appear on the homepage after refresh.');
    } catch (err) {
      setError(err.message || 'Unable to save image URL');
    } finally {
      setSavingImageUrls((current) => ({ ...current, [uploadKey]: false }));
    }
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

        <section className="admin-settings-card image-card">
          <div className="admin-settings-card-head">
            <span><FaImage /> Homepage Sections</span>
            <span className="admin-settings-card-status">Content</span>
          </div>

          <div className="homepage-image-section">
            <div className="homepage-image-section__heading">
              <h3>Print Products Cards</h3>
              <button type="button" className="btn btn-secondary" onClick={() => handleHomepageItemAdd('products')}>Add product</button>
            </div>
            <div className="homepage-image-grid">
              {settings.productShowcaseItems.map((item, index) => (
                <div className="homepage-image-item" key={`product-${index}`}>
                  <img src={resolveImageUrl(item.image)} alt={item.name || 'Product'} />
                  <div className="homepage-image-item__fields">
                    <label className="admin-settings-label">Title<input value={item.name} onChange={(e) => handleHomepageItemChange('products', index, 'name', e.target.value)} /></label>
                    <label className="admin-settings-label">Category<input value={item.category} onChange={(e) => handleHomepageItemChange('products', index, 'category', e.target.value)} /></label>
                    {renderImageSourceEditor('products', index, item.image)}
                    <label className="admin-settings-label">Destination<select value={item.to || '/catalogue'} onChange={(e) => handleHomepageItemChange('products', index, 'to', e.target.value)}><option value="/catalogue">Catalogue</option><option value="/templates">Templates</option><option value="/inspiration">Inspiration</option></select></label>
                    <div className="homepage-image-item__actions">
                      <button type="button" className="btn btn-secondary" onClick={() => handleHomepageItemRemove('products', index)}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="homepage-image-section">
            <div className="homepage-image-section__heading">
              <h3>Inspiration Gallery</h3>
              <button type="button" className="btn btn-secondary" onClick={() => handleHomepageItemAdd('inspiration')}>Add image</button>
            </div>
            <div className="homepage-image-grid homepage-image-grid--gallery">
              {settings.inspirationGalleryItems.map((item, index) => (
                <div className="homepage-image-item" key={`inspiration-${index}`}>
                  <img src={resolveImageUrl(item.src)} alt={item.label || 'Inspiration'} />
                  <div className="homepage-image-item__fields">
                    <label className="admin-settings-label">Caption<input value={item.label} onChange={(e) => handleHomepageItemChange('inspiration', index, 'label', e.target.value)} /></label>
                    {renderImageSourceEditor('inspiration', index, item.src)}
                    <label className="admin-settings-label">Layout<select value={item.tall ? 'tall' : item.wide ? 'wide' : item.short ? 'short' : 'standard'} onChange={(e) => {
                      const layout = e.target.value;
                      setSettings((current) => ({
                        ...current,
                        inspirationGalleryItems: current.inspirationGalleryItems.map((entry, entryIndex) => entryIndex === index
                          ? { ...entry, tall: layout === 'tall', wide: layout === 'wide', short: layout === 'short' }
                          : entry),
                      }));
                    }}><option value="standard">Standard</option><option value="tall">Tall</option><option value="wide">Wide</option><option value="short">Short</option></select></label>
                    <div className="homepage-image-item__actions">
                      <button type="button" className="btn btn-secondary" onClick={() => handleHomepageItemRemove('inspiration', index)}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
            <button type="submit" className="btn btn-primary" disabled={saving || Object.values(uploadingImages).some(Boolean)}><FaSave /> {saving ? 'Saving...' : 'Save Settings'}</button>
          </div>
        </section>
      </form>
      )}
    </div>
  );
};

export default AdminSettings;
