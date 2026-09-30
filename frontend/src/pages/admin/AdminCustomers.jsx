import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FaSearch,
  FaEye,
  FaEdit,
  FaTrash,
  FaTimes,
  FaUser,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaCalendarAlt,
} from 'react-icons/fa';
import { api } from '../../api/client';
import Pagination from '../../components/Pagination';
import Loader from '../../components/Loader';
import './AdminTable.css';
import './AdminCustomers.css';

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
};

const AdminCustomers = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerForm, setCustomerForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const page = parseInt(searchParams.get('page'), 10) || 1;
  const search = searchParams.get('search') || '';

  const fetchCustomers = () => {
    setLoading(true);
    api
      .get('/admin/customers', { page, limit: 12, search })
      .then((res) => {
        setCustomers(res.data);
        setPagination(res.pagination);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, search]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ search: searchInput, page: 1 });
  };

  const handleViewCustomer = (customer) => {
    setSelectedCustomer(customer);
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setError('');
    setCustomerForm({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
    });
  };

  const handleDeleteCustomer = async (customer) => {
    if (!window.confirm(`Delete ${customer.name || 'this customer'}?`)) return;

    try {
      await api.del(`/admin/customers/${customer._id}`);
      setCustomers((current) => current.filter((item) => item._id !== customer._id));
      if (selectedCustomer?._id === customer._id) {
        setSelectedCustomer(null);
      }
      if (editingCustomer?._id === customer._id) {
        setEditingCustomer(null);
      }
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const payload = {
        name: customerForm.name,
        phone: customerForm.phone,
        email: customerForm.email,
        address: customerForm.address,
      };

      const res = await api.put(`/admin/customers/${editingCustomer._id}`, payload);
      const updated = res.data;
      setCustomers((current) =>
        current.map((item) => (item._id === updated._id ? updated : item))
      );
      setSelectedCustomer(updated);
      setEditingCustomer(null);
      setCustomerForm(emptyForm);
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString();
  };

  const initials = (name) => {
    if (!name) return 'CU';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'CU';
  };

  return (
    <div className="admin-customers-page">
      <div className="admin-customers-top">
        <div className="admin-customers-title-wrap">
          <span className="admin-customers-kicker">Customer Directory</span>
          <h1 className="section-title">Customers</h1>
          <p className="section-subtitle">Manage all registered customer information.</p>
        </div>

        <form onSubmit={handleSearchSubmit} className="catalogue-search customer-search">
          <input
            className="form-input"
            placeholder="Search by name, phone or email"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="btn btn-primary"><FaSearch /></button>
        </form>
      </div>

      {error && <div className="customer-form-error">{error}</div>}

      {loading ? (
        <Loader />
      ) : (
        <>
          <section className="admin-customer-summary-grid">
            <article className="admin-customer-summary-card">
              <span className="icon"><FaUser /></span>
              <div>
                <span className="label">Total</span>
                <span className="value">{pagination.total || customers.length}</span>
              </div>
            </article>
            <article className="admin-customer-summary-card">
              <span className="icon"><FaPhone /></span>
              <div>
                <span className="label">Phones</span>
                <span className="value">{customers.length}</span>
              </div>
            </article>
            <article className="admin-customer-summary-card">
              <span className="icon"><FaEnvelope /></span>
              <div>
                <span className="label">With Email</span>
                <span className="value">{customers.filter((c) => c.email).length}</span>
              </div>
            </article>
            <article className="admin-customer-summary-card">
              <span className="icon"><FaMapMarkerAlt /></span>
              <div>
                <span className="label">With Address</span>
                <span className="value">{customers.filter((c) => c.address).length}</span>
              </div>
            </article>
          </section>

          <section className="admin-customers-shell">
            <div className="admin-customers-table-head">
              <h2>Registered Customers</h2>
              <span>{customers.length} shown</span>
            </div>

            <div className="admin-customers-table-wrap">
              <table className="admin-customers-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Address</th>
                    <th>Registered</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer._id}>
                      <td>
                        <span className="customer-name">
                          <span className="customer-avatar">{initials(customer.name)}</span>
                          <span className="customer-name-text">{customer.name}</span>
                        </span>
                      </td>
                      <td>
                        <span className="customer-phone"><FaPhone />{customer.phone}</span>
                      </td>
                      <td>
                        <span className="customer-email"><FaEnvelope />{customer.email || '—'}</span>
                      </td>
                      <td>
                        <span className="customer-address"><FaMapMarkerAlt />{customer.address || '—'}</span>
                      </td>
                      <td>
                        <span className="customer-address"><FaCalendarAlt />{formatDate(customer.createdAt)}</span>
                      </td>
                      <td>
                        <div className="customer-table-actions">
                          <button className="customer-icon-button" title="View details" onClick={() => handleViewCustomer(customer)}>
                            <FaEye />
                          </button>
                          <button className="customer-icon-button" title="Edit customer" onClick={() => handleEditCustomer(customer)}>
                            <FaEdit />
                          </button>
                          <button className="customer-icon-button delete" title="Delete customer" onClick={() => handleDeleteCustomer(customer)}>
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {customers.length === 0 && (
                <div className="customer-empty-state">No customers found.</div>
              )}
            </div>
          </section>

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(newPage) => setSearchParams({ search, page: newPage })}
          />
        </>
      )}

      {selectedCustomer && (
        <div className="customer-detail-backdrop">
          <div className="customer-detail-panel">
            <div className="customer-detail-top">
              <h3>Customer Profile</h3>
              <button onClick={() => setSelectedCustomer(null)}><FaTimes /></button>
            </div>
            <div className="customer-detail-body">
              <div className="customer-detail-grid">
                <div className="customer-detail-card full">
                  <span className="label">Customer Name</span>
                  <span className="value">{selectedCustomer.name}</span>
                </div>
                <div className="customer-detail-card">
                  <span className="label">Phone</span>
                  <span className="value">{selectedCustomer.phone}</span>
                </div>
                <div className="customer-detail-card">
                  <span className="label">Email</span>
                  <span className="value">{selectedCustomer.email || 'No email added'}</span>
                </div>
                <div className="customer-detail-card full">
                  <span className="label">Address</span>
                  <span className="value">{selectedCustomer.address || 'No address added'}</span>
                </div>
                <div className="customer-detail-card">
                  <span className="label">Created</span>
                  <span className="value">{formatDate(selectedCustomer.createdAt)}</span>
                </div>
                <div className="customer-detail-card">
                  <span className="label">Updated</span>
                  <span className="value">{formatDate(selectedCustomer.updatedAt)}</span>
                </div>
              </div>
            </div>
            <div className="customer-detail-actions">
              <button className="secondary" onClick={() => setSelectedCustomer(null)}>Close</button>
              <button className="primary" onClick={() => { setSelectedCustomer(null); handleEditCustomer(selectedCustomer); }}>Edit</button>
            </div>
          </div>
        </div>
      )}

      {editingCustomer && (
        <div className="customer-edit-backdrop">
          <div className="customer-edit-panel">
            <div className="customer-edit-top">
              <h3>Edit Customer</h3>
              <button onClick={() => setEditingCustomer(null)}><FaTimes /></button>
            </div>
            <div className="customer-edit-body">
              {error && <div className="customer-form-error">{error}</div>}
              <form className="customer-edit-form" onSubmit={handleUpdateCustomer}>
                <div className="form-row">
                  <label>
                    Name
                    <input value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} required />
                  </label>
                  <label>
                    Phone
                    <input value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} required />
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    Email
                    <input value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} />
                  </label>
                  <label>
                    Address
                    <input value={customerForm.address} onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} />
                  </label>
                </div>
                <div className="customer-detail-actions">
                  <button type="button" className="secondary cancel" onClick={() => setEditingCustomer(null)}>Cancel</button>
                  <button type="submit" className="primary save">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCustomers;
