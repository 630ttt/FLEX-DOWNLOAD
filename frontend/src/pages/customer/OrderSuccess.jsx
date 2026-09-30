import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FaCheckCircle, FaWhatsapp } from 'react-icons/fa';
import { api } from '../../api/client';
import { WHATSAPP_LINK } from '../../constants/business';
import Loader from '../../components/Loader';
import './OrderSuccess.css';

const OrderSuccess = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/orders/${orderId}`)
      .then((res) => setOrder(res.data))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) return <Loader label="Loading order..." />;

  return (
    <div className="page-container order-success">
      <FaCheckCircle className="order-success-icon" />
      <h1 className="section-title">Order Placed Successfully!</h1>
      <p className="section-subtitle">
        Thank you{order?.customer?.name ? `, ${order.customer.name}` : ''}. Your order has been received.
      </p>

      {order && (
        <div className="card order-success-card">
          <p><strong>Order ID:</strong> {order._id}</p>
          <p><strong>Design:</strong> {order.design?.title}</p>
          <p><strong>Quantity:</strong> {order.quantity}</p>
          <p><strong>Status:</strong> <span className={`badge badge-${order.status}`}>{order.status}</span></p>
        </div>
      )}

      <div className="order-success-actions">
        <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
          <FaWhatsapp /> Confirm on WhatsApp
        </a>
        <Link to="/catalogue" className="btn btn-outline">Continue Browsing</Link>
      </div>
    </div>
  );
};

export default OrderSuccess;
