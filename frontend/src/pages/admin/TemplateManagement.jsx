import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArchive, FaCopy, FaEdit, FaPlus, FaTrash } from 'react-icons/fa';
import { deleteTemplate, duplicateTemplate, listAdminTemplates, publishTemplate } from '../../services/templateService';
import { resolveImageUrl } from '../../utils/designAssets';
import './TemplateManagement.css';

const TemplateManagement = () => {
  const [templates, setTemplates] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTemplates = async () => {
    setLoading(true);
    try { setTemplates(await listAdminTemplates()); setError(''); }
    catch (requestError) { setError(requestError.message || 'Could not load templates'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    let active = true;
    listAdminTemplates()
      .then((data) => { if (active) setTemplates(data); })
      .catch((requestError) => { if (active) setError(requestError.message || 'Could not load templates'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const updateStatus = async (template) => {
    try {
      await publishTemplate(template._id, template.status === 'published' ? 'archived' : 'published');
      await loadTemplates();
    } catch (requestError) { setError(requestError.message || 'Could not update template status'); }
  };

  const duplicate = async (template) => {
    try { await duplicateTemplate(template._id); await loadTemplates(); }
    catch (requestError) { setError(requestError.message || 'Could not duplicate template'); }
  };

  const remove = async (template) => {
    if (!window.confirm(`Delete ${template.name}?`)) return;
    try { await deleteTemplate(template._id); await loadTemplates(); }
    catch (requestError) { setError(requestError.message || 'Could not delete template'); }
  };

  const visibleTemplates = templates.filter((template) => filter === 'all' || template.status === filter);
  return (
    <main className="page-container admin-templates-page">
      <header className="admin-templates-header">
        <div><span className="admin-templates-kicker">DESIGN STUDIO</span><h1 className="section-title">Templates</h1><p>Build structured, reusable print layouts.</p></div>
        <Link className="btn btn-primary" to="/admin/templates/create"><FaPlus /> Create template</Link>
      </header>
      {error && <p className="admin-templates-error" role="alert">{error}</p>}
      <div className="admin-template-filters" role="tablist" aria-label="Template status">
        {['all', 'draft', 'published', 'archived'].map((status) => <button key={status} type="button" className={filter === status ? 'is-active' : ''} onClick={() => setFilter(status)}>{status[0].toUpperCase() + status.slice(1)} <span>{status === 'all' ? templates.length : templates.filter((item) => item.status === status).length}</span></button>)}
      </div>
      {loading ? <p className="empty-state">Loading templates...</p> : visibleTemplates.length ? (
        <div className="admin-template-grid">
          {visibleTemplates.map((template) => (
            <article className="admin-template-item" key={template._id}>
              <Link className="admin-template-preview" to={`/admin/templates/${template._id}/edit`}>
                {template.previewImage ? <img src={resolveImageUrl(template.previewImage)} alt={`${template.name} preview`} /> : <span>Preview not saved</span>}
                <span className={`admin-template-status status-${template.status}`}>{template.status}</span>
              </Link>
              <div className="admin-template-item-body">
                <div><h2>{template.name}</h2><p>{template.templateJson?.canvas?.width} × {template.templateJson?.canvas?.height}</p></div>
                <div className="admin-template-actions">
                  <Link aria-label={`Edit ${template.name}`} title="Edit" to={`/admin/templates/${template._id}/edit`}><FaEdit /></Link>
                  <button type="button" aria-label={`Duplicate ${template.name}`} title="Duplicate" onClick={() => duplicate(template)}><FaCopy /></button>
                  <button type="button" aria-label={`${template.status === 'published' ? 'Archive' : 'Publish'} ${template.name}`} title={template.status === 'published' ? 'Archive' : 'Publish'} onClick={() => updateStatus(template)}>{template.status === 'published' ? <FaArchive /> : 'Publish'}</button>
                  <button type="button" aria-label={`Delete ${template.name}`} title="Delete" onClick={() => remove(template)}><FaTrash /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : !error && <div className="admin-template-empty"><h2>No templates here yet</h2><p>Create a template to start a reusable design library.</p></div>}
    </main>
  );
};

export default TemplateManagement;