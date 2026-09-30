import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client';
import Loader from '../../components/Loader';
import './OrderSuccess.css';

const STATUS_FLOW = [
  'Order Placed',
  'Payment Confirmed',
  'Design Proof Preparing',
  'Proof Sent on WhatsApp',
  'Customer Approved',
  'Printing',
  'Ready for Pickup / Dispatch',
  'Out for Delivery',
  'Delivered',
];

const TrackOrder = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/orders/${orderId}`)
      .then((res) => setOrder(res.data))
      .catch((err) => setError(err.message || 'Order not found'))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) return <Loader label="Loading order tracking..." />;
  if (error) return <div className="page-container empty-state">{error}</div>;

  const current = order?.status || 'Order Placed';
  const flow = STATUS_FLOW.map((item) => ({
    label: item,
    active: item === current || STATUS_FLOW.indexOf(item) <= STATUS_FLOW.indexOf(current),
  }));

  return (
    <div className="page-container order-success">
      <h1 className="section-title">Track Order</h1>
      <div className="card order-success-card">
        <p><strong>Order ID:</strong> {order?._id}</p>
        <p><strong>Status:</strong> <span className={`badge badge-${order?.status || 'pending'}`}>{current}</span></p>
        <p><strong>Payment Status:</strong> {order?.paymentStatus || 'Pending'}</p>
      </div>

      <div className="tracking-flow">
        {flow.map((step, index) => (
          <div className="tracking-step" key={step.label}>
            <span className={`tracking-dot ${step.active ? 'active' : ''}`}>{index + 1}</span>
            <span className="tracking-label">{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrackOrder;
