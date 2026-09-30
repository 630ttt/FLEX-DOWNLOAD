
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FaClipboardList,
  FaUser,
  FaMapMarkerAlt,
  FaImages,
  FaCheckCircle,
  FaFilePdf,
  FaUpload,
  FaEye,
  FaClock,
  FaTruck,
  FaBoxOpen,
  FaTimesCircle,
  FaRupeeSign,
} from 'react-icons/fa';
import { api } from '../../api/client';
import Pagination from '../../components/Pagination';
import Loader from '../../components/Loader';
import './AdminTable.css';
import './AdminOrders.css';

const STATUS_OPTIONS = [
  'pending',
  'confirmed',
  'in-progress',
  'awaiting-approval',
  'approved',
  'ready',
  'delivered',
  'cancelled',
];

const API_ORIGIN = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
).replace('/api', '');

const AdminOrders = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [orders, setOrders] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadingId, setUploadingId] = useState(null);

  const page =
    parseInt(searchParams.get('page'), 10) || 1;

  const status =
    searchParams.get('status') || '';

  const loadOrders = () => {
    setLoading(true);
    setError('');

    api
      .get('/admin/orders', {
        page,
        limit: 20,
        status,
      })
      .then((res) => {
        setOrders(res.data || []);

        setPagination(
          res.pagination || {
            page: 1,
            totalPages: 1,
          }
        );
      })
      .catch((err) => {
        setError(
          err.message || 'Failed to load orders'
        );
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadOrders();
  }, [page, status]);

  const handleStatusChange = async (
    orderId,
    newStatus
  ) => {
    setError('');

    try {
      await api.put(
        `/admin/orders/${orderId}`,
        {
          status: newStatus,
        }
      );

      loadOrders();
    } catch (err) {
      setError(
        err.message ||
          'Failed to update order status'
      );
    }
  };

  const handleFileUpload = async (
    orderId,
    file
  ) => {
    setError('');
    setUploadingId(orderId);

    try {
      const formData = new FormData();

      formData.append(
        'finalDesignFile',
        file
      );

      await api.put(
        `/admin/orders/${orderId}`,
        formData
      );

      loadOrders();
    } catch (err) {
      setError(
        err.message ||
          'Failed to upload final design file'
      );
    } finally {
      setUploadingId(null);
    }
  };

  const getDeliveryAddress = (order) => {
    return (
      order.deliveryAddress ||
      order.address ||
      order.functionHallAddress ||
      ''
    );
  };

  const getStatusIcon = (orderStatus) => {
    switch (orderStatus) {
      case 'confirmed':
        return <FaCheckCircle />;

      case 'in-progress':
        return <FaClock />;

      case 'awaiting-approval':
        return <FaEye />;

      case 'approved':
        return <FaCheckCircle />;

      case 'ready':
        return <FaBoxOpen />;

      case 'delivered':
        return <FaTruck />;

      case 'cancelled':
        return <FaTimesCircle />;

      default:
        return <FaClock />;
    }
  };

  const getStatusClass = (orderStatus) => {
    return `status-${(
      orderStatus || 'pending'
    )
      .toLowerCase()
      .replace(/\s+/g, '-')}`;
  };

  const formatStatus = (value) => {
    if (!value) return 'Pending';

    return value
      .split('-')
      .map(
        (word) =>
          word.charAt(0).toUpperCase() +
          word.slice(1)
      )
      .join(' ');
  };

  return (
    <div className="admin-orders-page">

      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <div className="admin-page-header admin-orders-header">

        <div className="admin-orders-heading">

          <span className="admin-orders-eyebrow">
            ORDER MANAGEMENT
          </span>

          <div className="admin-orders-title-row">

            <div className="admin-orders-title-icon">
              <FaClipboardList />
            </div>

            <div>
              <h1 className="section-title">
                Orders
              </h1>

              <p className="section-subtitle">
                Manage customer orders, approvals,
                delivery details and final designs.
              </p>
            </div>

          </div>

        </div>


        <div className="admin-orders-filter-wrap">

          <label
            htmlFor="order-status-filter"
            className="admin-orders-filter-label"
          >
            Filter by status
          </label>

          <select
            id="order-status-filter"
            className="form-select admin-orders-filter"
            value={status}
            onChange={(e) =>
              setSearchParams({
                status: e.target.value,
                page: 1,
              })
            }
          >
            <option value="">
              All Statuses
            </option>

            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {formatStatus(s)}
              </option>
            ))}
          </select>

        </div>

      </div>


      {/* =====================================================
          ERROR
          ===================================================== */}

      {error && (
        <div className="admin-orders-error">
          <FaTimesCircle />
          <span>{error}</span>
        </div>
      )}


      {/* =====================================================
          CONTENT
          ===================================================== */}

      {loading ? (
        <div className="admin-orders-loader">
          <Loader />
        </div>
      ) : (
        <>

          {/* =================================================
              ORDERS SUMMARY
              ================================================= */}

          <div className="admin-orders-summary">

            <div className="admin-orders-summary-card">

              <div className="admin-orders-summary-icon blue">
                <FaClipboardList />
              </div>

              <div>
                <span>Showing</span>

                <strong>
                  {orders.length}
                </strong>

                <small>
                  Orders
                </small>
              </div>

            </div>


            <div className="admin-orders-summary-card">

              <div className="admin-orders-summary-icon yellow">
                <FaClock />
              </div>

              <div>
                <span>Filter</span>

                <strong className="summary-status">
                  {status
                    ? formatStatus(status)
                    : 'All'}
                </strong>

                <small>
                  Current view
                </small>
              </div>

            </div>


            <div className="admin-orders-summary-card">

              <div className="admin-orders-summary-icon navy">
                <FaImages />
              </div>

              <div>
                <span>Page</span>

                <strong>
                  {pagination.page || page}
                </strong>

                <small>
                  of {pagination.totalPages || 1}
                </small>
              </div>

            </div>

          </div>


          {/* =================================================
              ORDERS TABLE
              ================================================= */}

          <div className="admin-table-wrapper card admin-orders-table-card">

            <div className="admin-orders-table-header">

              <div>
                <h2>
                  Customer Orders
                </h2>

                <p>
                  Review and manage every order from one place.
                </p>
              </div>

              <div className="admin-orders-live">
                <span></span>
                Live Orders
              </div>

            </div>


            {orders.length > 0 ? (

              <div className="admin-orders-scroll">

                <table className="admin-table admin-orders-table">

                  <thead>
                    <tr>
                      <th>Design</th>
                      <th>Customer</th>
                      <th>Delivery</th>
                      <th>Qty</th>
                      <th>References</th>
                      <th>Status</th>
                      <th>Approval</th>
                      <th>Final Design</th>
                    </tr>
                  </thead>


                  <tbody>

                    {orders.map((order) => {

                      const deliveryAddress =
                        getDeliveryAddress(order);

                      const currentStatus =
                        order.status || 'pending';

                      return (
                        <tr key={order._id}>

                          {/* =================================
                              DESIGN
                              ================================= */}

                          <td data-label="Design">

                            <div className="order-design-cell">

                              <div className="order-design-icon">
                                <FaImages />
                              </div>

                              <div>
                                <strong>
                                  {order.design?.title ||
                                    'Custom Design'}
                                </strong>

                                <span>
                                  #{order._id?.slice(-8)}
                                </span>
                              </div>

                            </div>

                          </td>


                          {/* =================================
                              CUSTOMER
                              ================================= */}

                          <td data-label="Customer">

                            <div className="order-customer-cell">

                              <div className="order-customer-icon">
                                <FaUser />
                              </div>

                              <div>

                                <strong>
                                  {order.customer?.name ||
                                    order.name ||
                                    '-'}
                                </strong>

                                <span>
                                  {order.customer?.phone ||
                                    order.phone ||
                                    '-'}
                                </span>

                                {(order.customer?.email ||
                                  order.email) && (
                                  <small>
                                    {order.customer?.email ||
                                      order.email}
                                  </small>
                                )}

                              </div>

                            </div>

                          </td>


                          {/* =================================
                              DELIVERY
                              ================================= */}

                          <td data-label="Delivery">

                            <div className="admin-orders-address">

                              {order.deliveryMode ===
                              'home-dispatch' ? (

                                <>
                                  <div className="delivery-type home">
                                    <FaTruck />
                                    Home Delivery
                                  </div>

                                  {deliveryAddress ? (
                                    <p>
                                      <FaMapMarkerAlt />
                                      {deliveryAddress}
                                    </p>
                                  ) : (
                                    <span className="admin-orders-approval-none">
                                      Address not provided
                                    </span>
                                  )}
                                </>

                              ) : order.deliveryMode ===
                                'studio-pickup' ? (

                                <div className="delivery-type pickup">
                                  <FaBoxOpen />
                                  Studio Pickup
                                </div>

                              ) : deliveryAddress ? (

                                <p>
                                  <FaMapMarkerAlt />
                                  {deliveryAddress}
                                </p>

                              ) : (

                                <span className="admin-orders-approval-none">
                                  Address not provided
                                </span>

                              )}

                            </div>

                          </td>


                          {/* =================================
                              QUANTITY
                              ================================= */}

                          <td data-label="Quantity">

                            <div className="order-quantity">

                              <span>
                                {order.quantity || 1}
                              </span>

                              <small>
                                {Number(
                                  order.quantity || 1
                                ) === 1
                                  ? 'Item'
                                  : 'Items'}
                              </small>

                            </div>

                          </td>


                          {/* =================================
                              REFERENCE IMAGES
                              ================================= */}

                          <td data-label="References">

                            {order.customerFileUploads?.length > 0 || order.customizedDesignFile ? (

                              <div className="admin-orders-ref-images">

                                {order.customerFileUploads.map(
                                  (src, index) => (

                                    <a
                                      key={`${src}-${index}`}
                                      href={`${API_ORIGIN}${src}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="admin-order-reference-link"
                                    >
                                      <FaImages />
                                      Image {index + 1}
                                      <FaEye />
                                    </a>

                                  )
                                )}

                                {order.customizedDesignFile && (
                                  <a
                                    href={`${API_ORIGIN}${order.customizedDesignFile}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="admin-order-reference-link"
                                  >
                                    <FaImages />
                                    AI design preview
                                    <FaEye />
                                  </a>
                                )}

                              </div>

                            ) : (

                              <span className="admin-orders-approval-none">
                                No references
                              </span>

                            )}

                          </td>


                          {/* =================================
                              STATUS
                              ================================= */}

                          <td data-label="Status">

                            <div className="order-status-wrapper">

                              <div
                                className={`order-status-badge ${getStatusClass(
                                  currentStatus
                                )}`}
                              >
                                {getStatusIcon(
                                  currentStatus
                                )}

                                <span>
                                  {formatStatus(
                                    currentStatus
                                  )}
                                </span>
                              </div>

                              <select
                                className="form-select order-status-select"
                                value={currentStatus}
                                onChange={(e) =>
                                  handleStatusChange(
                                    order._id,
                                    e.target.value
                                  )
                                }
                              >
                                {STATUS_OPTIONS.map(
                                  (s) => (
                                    <option
                                      key={s}
                                      value={s}
                                    >
                                      {formatStatus(s)}
                                    </option>
                                  )
                                )}
                              </select>

                            </div>

                          </td>


                          {/* =================================
                              CUSTOMER APPROVAL
                              ================================= */}

                          <td data-label="Approval">

                            <div className="order-approval-cell">

                              {!order.finalDesignFile ? (

                                <span className="approval-status none">
                                  <FaClock />
                                  Not uploaded
                                </span>

                              ) : order.finalDesignApproved ? (

                                <span className="approval-status approved">
                                  <FaCheckCircle />
                                  Approved
                                </span>

                              ) : order.status ===
                                'awaiting-approval' ? (

                                <span className="approval-status waiting">
                                  <FaClock />
                                  Awaiting customer
                                </span>

                              ) : (

                                <span className="approval-status none">
                                  <FaClock />
                                  Not approved
                                </span>

                              )}

                              {order.customerFeedback && (

                                <div className="admin-orders-feedback">

                                  <strong>
                                    Customer feedback
                                  </strong>

                                  <p>
                                    "{order.customerFeedback}"
                                  </p>

                                </div>

                              )}

                            </div>

                          </td>


                          {/* =================================
                              FINAL DESIGN
                              ================================= */}

                          <td data-label="Final Design">

                            <div className="final-design-cell">

                              {order.finalDesignFile && (

                                <a
                                  href={`${API_ORIGIN}${order.finalDesignFile}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="admin-orders-final-link"
                                >
                                  <FaFilePdf />

                                  <span>
                                    View uploaded
                                  </span>

                                  <FaEye />
                                </a>

                              )}


                              <label className="final-design-upload">

                                <FaUpload />

                                <span>
                                  {uploadingId ===
                                  order._id
                                    ? 'Uploading...'
                                    : order.finalDesignFile
                                    ? 'Replace File'
                                    : 'Upload Final Design'}
                                </span>

                                <input
                                  type="file"
                                  accept=".pdf,image/*"
                                  disabled={
                                    uploadingId ===
                                    order._id
                                  }
                                  onChange={(e) => {

                                    const file =
                                      e.target.files?.[0];

                                    if (file) {
                                      handleFileUpload(
                                        order._id,
                                        file
                                      );
                                    }

                                  }}
                                />

                              </label>

                              {uploadingId ===
                                order._id && (

                                <span className="admin-orders-uploading">
                                  Please wait...
                                </span>

                              )}

                            </div>

                          </td>

                        </tr>
                      );

                    })}

                  </tbody>

                </table>

              </div>

            ) : (

              <div className="empty-state admin-orders-empty">

                <div className="admin-orders-empty-icon">
                  <FaClipboardList />
                </div>

                <h3>
                  No orders found
                </h3>

                <p>
                  There are no orders matching the
                  selected status.
                </p>

              </div>

            )}

          </div>


          {/* =================================================
              PAGINATION
              ================================================= */}

          <div className="admin-orders-pagination">

            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(newPage) =>
                setSearchParams({
                  status,
                  page: newPage,
                })
              }
            />

          </div>

        </>
      )}

    </div>
  );
};

export default AdminOrders;

