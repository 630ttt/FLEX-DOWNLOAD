import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaPaperPlane, FaWhatsapp } from 'react-icons/fa';
import { api } from '../../api/client';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { RATE_CARD_MATERIALS, DELIVERY_MODES, whatsappLinkWithMessage } from '../../constants/business';
import Loader from '../../components/Loader';
import './OrderForm.css';

const MAX_FILES = 5;

const StepHeader = ({ number, title, hint }) => (
  <div className="wizard-step-header">
    <span className="wizard-step-number">{number}</span>
    <div>
      <h3>{title}</h3>
      {hint && <span className="wizard-step-hint">{hint}</span>}
    </div>
  </div>
);

const OrderForm = () => {
  const { designId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useCustomerAuth();
  const [selectedCustomization, setSelectedCustomization] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('yaminiflex_ai_customization') || 'null');
      return saved?.designId === designId ? saved : null;
    } catch {
      return null;
    }
  });
  const [design, setDesign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    size: '',
    quantity: 1,
    customizationNotes: '',
  });

  const [materialIndex, setMaterialIndex] = useState(0);
  const [celebrantName, setCelebrantName] = useState('');
  const [occasion, setOccasion] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [deliveryMode, setDeliveryMode] = useState(DELIVERY_MODES[0].value);
  const [confirmed, setConfirmed] = useState(false);

  const [mainPhoto, setMainPhoto] = useState(null);
  const [extraFiles, setExtraFiles] = useState([]);

  useEffect(() => {
    api
      .get(`/designs/${designId}`)
      .then((res) => setDesign(res.data))
      .catch(() => setError('Design not found'))
      .finally(() => setLoading(false));
  }, [designId]);

  useEffect(() => {
    if (design?.sizeOptions?.length > 0) {
      setForm((prev) => ({ ...prev, size: prev.size || design.sizeOptions[0] }));
    }
  }, [design]);

  useEffect(() => {
    if (!isAuthenticated) return;
    api
      .get('/customers/me')
      .then((res) => {
        setForm((prev) => ({
          ...prev,
          name: res.data.name || '',
          phone: res.data.phone || '',
          email: res.data.email || '',
          address: res.data.address || '',
        }));
      })
      .catch(() => {});
  }, [isAuthenticated]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleMainPhotoChange = (e) => {
    setMainPhoto(e.target.files?.[0] || null);
  };

  const handleExtraFilesChange = (e) => {
    const remainingSlots = MAX_FILES - (mainPhoto ? 1 : 0);
    const selected = Array.from(e.target.files || []).slice(0, remainingSlots);
    setExtraFiles(selected);
  };

  const removeExtraFile = (index) => {
    setExtraFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const material = RATE_CARD_MATERIALS[materialIndex];
  const selectedDeliveryMode = DELIVERY_MODES.find((d) => d.value === deliveryMode);

  const estimatedTotal = useMemo(() => (design?.price || 0) * (Number(form.quantity) || 1), [design, form.quantity]);

  const composedNotes = useMemo(() => {
    const lines = [];
    if (material) lines.push(`Material/Substrate: ${material.name} (₹${material.price}/sq.ft)`);
    if (celebrantName) lines.push(`Celebrant/Family Name: ${celebrantName}`);
    if (occasion) lines.push(`Occasion/Slogan: ${occasion}`);
    if (eventDate) lines.push(`Event Date: ${eventDate}`);
    if (selectedDeliveryMode) lines.push(`Delivery: ${selectedDeliveryMode.label}`);
    if (form.customizationNotes) lines.push(`Special Instructions: ${form.customizationNotes}`);
    if (selectedCustomization?.values) {
      lines.push('AI design fields:');
      Object.entries(selectedCustomization.values).forEach(([key, value]) => {
        if (key !== 'colors' && value) lines.push(`${key}: ${value}`);
      });
      lines.push(`Colors: ${JSON.stringify(selectedCustomization.values.colors || {})}`);
    }
    return lines.join('\n');
  }, [material, celebrantName, occasion, eventDate, selectedDeliveryMode, form.customizationNotes, selectedCustomization]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!confirmed) {
      setError('Please confirm the entered details are correct before proceeding.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const quantity = Math.max(1, Number(form.quantity) || 1);
      const designPrice = Number(design?.price) || 0;
      const safeGrandTotal = designPrice * quantity;

      const draft = {
        designId,
        designTitle: design?.title,
        customizedDesignFile: selectedCustomization?.fileUrl || '',
        designBasePrice: designPrice,
        grandTotal: safeGrandTotal,
        totalAmount: safeGrandTotal,
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        size: form.size,
        quantity,
        customizationNotes: composedNotes,
        material: material?.name,
        materialPrice: material?.price,
        occasion,
        celebrantName,
        eventDate,
        deliveryMode,
        mainSubjectPhotoData: mainPhoto ? await readFileAsDataUrl(mainPhoto) : '',
        mainPhotoName: mainPhoto?.name || '',
        additionalFilesData: await Promise.all(extraFiles.map((file) => readFileAsDataUrl(file))),
        additionalFilesNames: extraFiles.map((file) => file.name),
      };

      sessionStorage.setItem('yaminiflex_order_draft', JSON.stringify(draft));
      sessionStorage.removeItem('yaminiflex_ai_customization');
      setSelectedCustomization(null);
      navigate('/payment-method');
    } catch (err) {
      setError(err.message || 'Failed to prepare order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInstantWhatsApp = () => {
    const message = `Hi, I have a query about ordering "${design?.title}".\nSize: ${form.size}\nMaterial: ${material?.name}\nQuantity: ${form.quantity}`;
    window.open(whatsappLinkWithMessage(message), '_blank', 'noopener,noreferrer');
  };

  if (loading) return <Loader label="Loading..." />;
  if (error && !design) {
    return <div className="page-container empty-state">{error}</div>;
  }

  return (
    <div className="page-container order-form-page">
      <h1 className="section-title">Customize &amp; Order</h1>
      <p className="section-subtitle">Ordering: {design?.title}</p>
      {selectedCustomization?.fileUrl && (
        <p className="order-custom-design-proof">
          <strong>AI-customized proof attached.</strong>{' '}
          <a href={`${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')}${selectedCustomization.fileUrl}`} target="_blank" rel="noopener noreferrer">View preview</a>
        </p>
      )}

      <form className="order-form" onSubmit={handleSubmit}>
        {error && <p className="order-form-error">{error}</p>}

        <div className="wizard-card card">
          <StepHeader number={1} title="Select Hoarding Size" hint={`Popular for stage: ${design?.sizeOptions?.[0] || '-'}`} />
          <div className="wizard-size-grid">
            {(design?.sizeOptions?.length ? design.sizeOptions : ['Custom Size']).map((size) => (
              <button
                type="button"
                key={size}
                className={`wizard-size-option${form.size === size ? ' wizard-size-option-active' : ''}`}
                onClick={() => setForm((prev) => ({ ...prev, size }))}
              >
                {size}
              </button>
            ))}
          </div>
          <div className="form-group wizard-quantity">
            <label className="form-label">Quantity (No. of Hoardings)</label>
            <input
              className="form-input"
              type="number"
              min={1}
              name="quantity"
              value={form.quantity}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="wizard-card card">
          <StepHeader number={2} title="Choose Material / Substrate" />
          <div className="wizard-material-list">
            {RATE_CARD_MATERIALS.map((mat, index) => (
              <button
                type="button"
                key={mat.name}
                className={`wizard-material-option${materialIndex === index ? ' wizard-material-option-active' : ''}`}
                onClick={() => setMaterialIndex(index)}
              >
                <span className="wizard-material-name">{mat.name}</span>
                <span className="wizard-material-price">₹{mat.price}/sq.ft</span>
              </button>
            ))}
          </div>
        </div>

        <div className="wizard-card card">
          <StepHeader number={3} title="Customize Text & Event Details" />
          <div className="order-form-row">
            <div className="form-group">
              <label className="form-label">Celebrant Name / Family</label>
              <input className="form-input" value={celebrantName} onChange={(e) => setCelebrantName(e.target.value)} placeholder="e.g. Sri Krishnaveni Garu" />
            </div>
            <div className="form-group">
              <label className="form-label">Occasion / Slogan</label>
              <input className="form-input" value={occasion} onChange={(e) => setOccasion(e.target.value)} placeholder="e.g. 70th Birthday" />
            </div>
          </div>
          <div className="order-form-row">
            <div className="form-group">
              <label className="form-label">Event Date</label>
              <input className="form-input" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">WhatsApp Number (for Proof)</label>
              <input className="form-input" name="phone" value={form.phone} onChange={handleChange} required placeholder="Proof sent in 30 mins" />
            </div>
          </div>
        </div>

        <div className="wizard-card card">
          <StepHeader number={4} title="Upload Main Subject Photo" hint="Supports JPG, PNG, WEBP or RAW (up to 30MB)" />
          <input type="file" accept="image/*,.pdf" onChange={handleMainPhotoChange} />
          {mainPhoto && <p className="wizard-file-selected">Selected: {mainPhoto.name}</p>}
        </div>

        <div className="wizard-card card">
          <StepHeader number={5} title="Additional Photos or Logo (Optional)" hint={`Up to ${MAX_FILES - (mainPhoto ? 1 : 0)} more files`} />
          <input type="file" accept="image/*,.pdf" multiple onChange={handleExtraFilesChange} />
          {extraFiles.length > 0 && (
            <ul className="order-form-file-list">
              {extraFiles.map((f, index) => (
                <li key={`${f.name}-${index}`}>
                  {f.name}
                  <button type="button" onClick={() => removeExtraFile(index)}>Remove</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="wizard-card card">
          <StepHeader number={6} title="Special Changes for Yamini Flex DTP Team" />
          <textarea
            className="form-textarea"
            name="customizationNotes"
            value={form.customizationNotes}
            onChange={handleChange}
            rows={3}
            placeholder="Example: Replace the background colors with Red/Gold theme, add bold title text at top..."
          />
        </div>

        <div className="wizard-card card">
          <StepHeader number={7} title="Delivery or Pickup Mode" />
          <div className="wizard-delivery-options">
            {DELIVERY_MODES.map((mode) => (
              <button
                type="button"
                key={mode.value}
                className={`wizard-delivery-option${deliveryMode === mode.value ? ' wizard-delivery-option-active' : ''}`}
                onClick={() => setDeliveryMode(mode.value)}
              >
                <strong>{mode.label}</strong>
                <span>{mode.description}</span>
              </button>
            ))}
          </div>
          {deliveryMode === 'home-dispatch' && (
            <div className="form-group wizard-address">
              <label className="form-label">Delivery Address</label>
              <textarea className="form-textarea" name="address" value={form.address} onChange={handleChange} rows={2} required />
            </div>
          )}
        </div>

        <div className="wizard-card card wizard-summary">
          <StepHeader number={8} title="Order Summary & Live Estimate" hint="All Inclusive Price" />
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" name="name" value={form.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email (optional)</label>
            <input className="form-input" type="email" name="email" value={form.email} onChange={handleChange} />
          </div>

          <div className="wizard-summary-rows">
            <div>
              <span>Selected Size</span>
              <span>{form.size || '-'}</span>
            </div>
            <div>
              <span>Substrate</span>
              <span>{material?.name} (₹{material?.price}/sq.ft)</span>
            </div>
            <div>
              <span>Quantity</span>
              <span>{form.quantity}</span>
            </div>
          </div>

          <div className="wizard-grand-total">
            <span>Grand Total (Design Base Price)</span>
            <strong>&#8377;{estimatedTotal}</strong>
          </div>

          <label className="wizard-confirm-checkbox">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            I confirm the entered celebration details are correct. Yamini Flex will send a full-size color digital
            proof on WhatsApp for my final approval before printing.
          </label>

          <div className="wizard-summary-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <FaPaperPlane /> {submitting ? 'Preparing Payment...' : 'Proceed to WhatsApp Proof & Order'}
            </button>
            <button type="button" className="btn btn-gold" onClick={handleInstantWhatsApp}>
              <FaWhatsapp /> Instant WhatsApp Query
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export default OrderForm;
