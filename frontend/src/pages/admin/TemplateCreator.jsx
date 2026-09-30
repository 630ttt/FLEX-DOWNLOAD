import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaGlobe, FaSave } from 'react-icons/fa';
import DesignEditor from '../../components/editor/DesignEditor';
import { createEmptyTemplate, normalizeTemplate } from '../../utils/templateSerializer';
import { getAdminTemplate, publishTemplate, saveTemplate, uploadTemplateAsset } from '../../services/templateService';
import './TemplateCreator.css';

const TemplateCreator = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef(null);
  const [templateId, setTemplateId] = useState(id || '');
  const [name, setName] = useState('Untitled template');
  const [description, setDescription] = useState('');
  const [initialTemplate, setInitialTemplate] = useState(() => createEmptyTemplate());
  const [document, setDocument] = useState(() => createEmptyTemplate());
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState('Unsaved');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return undefined;
    let active = true;
    getAdminTemplate(id)
      .then((template) => {
        if (!active) return;
        const normalized = normalizeTemplate(template.templateJson);
        setTemplateId(template._id);
        setName(template.name);
        setDescription(template.description || '');
        setInitialTemplate(normalized);
        setDocument(normalized);
        setSaveState(template.status === 'published' ? 'Published' : 'Saved draft');
      })
      .catch((requestError) => { if (active) setError(requestError.message || 'Could not load this template'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const saveDocument = useCallback(async (templateJson, previewBlob, automatic = false) => {
    if (!name.trim()) throw new Error('Enter a template name before saving.');
    if (!automatic) setSaving(true);
    setSaveState(automatic ? 'Saving...' : 'Saving...');
    setError('');
    try {
      const saved = await saveTemplate({ name: name.trim(), description, templateJson: { ...templateJson, name: name.trim(), description }, previewBlob }, templateId);
      setTemplateId(saved._id);
      setDocument(templateJson);
      setDirty(false);
      setSaveState(saved.status === 'published' ? 'Published' : 'Saved');
      if (!id) navigate(`/admin/templates/${saved._id}/edit`, { replace: true });
      return saved;
    } catch (requestError) {
      setSaveState('Save failed');
      setError(requestError.message || 'Could not save this draft');
      throw requestError;
    } finally {
      if (!automatic) setSaving(false);
    }
  }, [description, id, name, navigate, templateId]);

  useEffect(() => {
    if (!templateId || !dirty || !name.trim()) return undefined;
    const timer = window.setTimeout(async () => {
      setSaveState('Saving...');
      try {
        const preview = await editorRef.current?.getImageBlob({ format: 'png', scale: 1 });
        await saveDocument(document, preview, true);
      } catch {
        setSaveState('Save failed');
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [document, dirty, description, name, saveDocument, templateId]);

  const handleSave = async (templateJson, previewBlob) => {
    await saveDocument(templateJson, previewBlob);
  };

  const saveCurrentDraft = async () => {
    const templateJson = editorRef.current?.getTemplate();
    if (!templateJson) return;
    try {
      const previewBlob = await editorRef.current.getImageBlob({ format: 'png', scale: 1 });
      await saveDocument(templateJson, previewBlob);
    } catch (requestError) {
      setError(requestError.message || 'Could not save this draft');
    }
  };

  const handlePublish = async () => {
    if (!templateId) {
      setError('Save this template as a draft before publishing.');
      return;
    }
    try {
      if (dirty) {
        const latest = editorRef.current?.getTemplate() || document;
        await saveDocument(latest, await editorRef.current?.getImageBlob({ format: 'png', scale: 1 }));
      }
      await publishTemplate(templateId, 'published');
      setSaveState('Published');
      setError('');
    } catch (requestError) { setError(requestError.message || 'Could not publish this template'); }
  };

  if (loading) return <main className="page-container"><p className="empty-state">Loading template...</p></main>;
  return (
    <main className="page-container template-creator-page">
      <Link to="/admin/templates" className="template-creator-back"><FaArrowLeft /> Templates</Link>
      <header className="template-creator-header">
        <div className="template-creator-fields">
          <label>Template name<input value={name} maxLength={120} onChange={(event) => { setName(event.target.value); setDirty(true); }} /></label>
          <label>Description<input value={description} maxLength={1000} onChange={(event) => { setDescription(event.target.value); setDirty(true); }} /></label>
        </div>
        <div className="template-creator-actions">
          <span className={`template-save-state${saveState === 'Save failed' ? ' is-error' : ''}`} role="status">{saving ? 'Saving...' : saveState}</span>
          <button type="button" className="btn btn-outline" disabled={saving || !templateId} onClick={handlePublish}><FaGlobe /> Publish</button>
          <button type="button" className="btn btn-primary" disabled={saving} onClick={saveCurrentDraft}><FaSave /> Save draft</button>
        </div>
      </header>
      {error && <p className="template-creator-error" role="alert">{error}</p>}
      <DesignEditor
        key={templateId || 'new-template'}
        ref={editorRef}
        initialTemplate={initialTemplate}
        templateMetadata={{ id: templateId || document.id, name, description }}
        onChange={(nextTemplate) => { setDocument(nextTemplate); setDirty(true); setSaveState('Unsaved changes'); }}
        onSave={handleSave}
        onAssetUpload={uploadTemplateAsset}
        mode="admin"
      />
    </main>
  );
};

export default TemplateCreator;