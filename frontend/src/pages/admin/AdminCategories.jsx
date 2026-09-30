import { useEffect, useState } from 'react';
import { FaPlus, FaTrash, FaEdit, FaEye, FaTimes, FaFolder, FaLink, FaTags, FaClipboardList } from 'react-icons/fa';
import { api } from '../../api/client';
import Loader from '../../components/Loader';
import './AdminTable.css';
import './AdminCategories.css';

const emptyCategory = { name: '', slug: '', description: '' };

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyCategory);
  const [editingCategory, setEditingCategory] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [error, setError] = useState('');

  const loadCategories = () => {
    setLoading(true);
    api.get('/admin/categories').then((res) => setCategories(res.data)).catch((err) => setError(err.message)).finally(() => setLoading(false));
  };

  useEffect(loadCategories, []);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/admin/categories', form);
      setForm(emptyCategory);
      loadCategories();
    } catch (err) {
      setError(err.message || 'Failed to create category');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await api.del(`/admin/categories/${id}`);
      setCategories((current) => current.filter((cat) => cat._id !== id));
      if (selectedCategory?._id === id) setSelectedCategory(null);
      if (editingCategory?._id === id) setEditingCategory(null);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to delete category');
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setForm({ name: category.name, slug: category.slug, description: category.description || '' });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingCategory) return;
    try {
      const res = await api.put(`/admin/categories/${editingCategory._id}`, form);
      const updated = res.data;
      setCategories((current) => current.map((cat) => (cat._id === updated._id ? updated : cat)));
      setEditingCategory(null);
      setForm(emptyCategory);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to update category');
    }
  };

  return (
    <div className="admin-categories-page">
      <div className="admin-categories-top">
        <div className="admin-categories-title-wrap">
          <span className="admin-categories-kicker">Catalogue Setup</span>
          <h1 className="section-title">Categories</h1>
          <p className="section-subtitle">Create, update and organise your catalog groups.</p>
        </div>
      </div>

      <form className="card category-form" onSubmit={handleSubmit}>
        {error && <p className="order-form-error">{error}</p>}
        <div className="category-form-row">
          <input className="form-input" name="name" placeholder="Category name" value={form.name} onChange={handleChange} required />
          <input className="form-input" name="slug" placeholder="slug-name" value={form.slug} onChange={handleChange} required />
          <input className="form-input" name="description" placeholder="Description" value={form.description} onChange={handleChange} />
          <button type="submit" className="btn btn-primary"><FaPlus /> Add</button>
        </div>
      </form>

      {loading ? (
        <Loader />
      ) : (
        <section className="admin-categories-shell">
          <div className="admin-categories-table-head">
            <h2>Category List</h2>
            <span>{categories.length} available</span>
          </div>
          <div className="admin-categories-table-wrap">
            <table className="admin-categories-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Description</th>
                  <th>Designs</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat._id}>
                    <td>
                      <span className="category-name-wrap">
                        <span className="category-icon"><FaFolder /></span>
                        <span className="category-name">{cat.name}</span>
                      </span>
                    </td>
                    <td><span className="category-slug"><FaLink />{cat.slug}</span></td>
                    <td><span className="category-description">{cat.description || 'No description'}</span></td>
                    <td><span className="category-design-count"><FaClipboardList />{cat.designCount || 0}</span></td>
                    <td>
                      <div className="category-table-actions">
                        <button className="category-icon-button" title="View" onClick={() => setSelectedCategory(cat)}><FaEye /></button>
                        <button className="category-icon-button" title="Edit" onClick={() => handleEdit(cat)}><FaEdit /></button>
                        <button className="category-icon-button delete" title="Delete" onClick={() => handleDelete(cat._id)}><FaTrash /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {categories.length === 0 && <div className="empty-state">No categories yet.</div>}
          </div>
        </section>
      )}

      {selectedCategory && (
        <div className="category-detail-backdrop">
          <div className="category-detail-panel">
            <div className="category-detail-top">
              <h3>Category Detail</h3>
              <button onClick={() => setSelectedCategory(null)}><FaTimes /></button>
            </div>
            <div className="category-detail-body">
              <div className="category-detail-grid">
                <div className="category-detail-card full">
                  <span className="label">Name</span>
                  <span className="value">{selectedCategory.name}</span>
                </div>
                <div className="category-detail-card">
                  <span className="label">Slug</span>
                  <span className="value">{selectedCategory.slug}</span>
                </div>
                <div className="category-detail-card">
                  <span className="label">Designs</span>
                  <span className="value">{selectedCategory.designCount || 0}</span>
                </div>
                <div className="category-detail-card full">
                  <span className="label">Description</span>
                  <span className="value">{selectedCategory.description || 'No description added'}</span>
                </div>
              </div>
            </div>
            <div className="category-detail-actions">
              <button className="secondary" onClick={() => setSelectedCategory(null)}>Close</button>
              <button className="primary" onClick={() => { setSelectedCategory(null); handleEdit(selectedCategory); }}>Edit</button>
            </div>
          </div>
        </div>
      )}

      {editingCategory && (
        <div className="category-edit-backdrop">
          <div className="category-edit-panel">
            <div className="category-edit-top">
              <h3>Edit Category</h3>
              <button onClick={() => setEditingCategory(null)}><FaTimes /></button>
            </div>
            <div className="category-edit-body">
              {error && <p className="order-form-error">{error}</p>}
              <form className="category-edit-form" onSubmit={handleUpdate}>
                <div className="category-edit-grid">
                  <label>
                    Name
                    <input name="name" value={form.name} onChange={handleChange} required />
                  </label>
                  <label>
                    Slug
                    <input name="slug" value={form.slug} onChange={handleChange} required />
                  </label>
                </div>
                <label>
                  Description
                  <textarea name="description" value={form.description} onChange={handleChange} />
                </label>
                <div className="category-edit-actions">
                  <button type="button" className="secondary cancel" onClick={() => setEditingCategory(null)}>Cancel</button>
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

export default AdminCategories;
