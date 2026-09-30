import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import './DesignForm.css';

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
const resolveFile = (src) => (src?.startsWith('http') ? src : `${API_ORIGIN}${src || ''}`);
const flattenLayers = (layers = [], depth = 0) => layers.flatMap((layer) => [
  { ...layer, depth },
  ...flattenLayers(layer.children || [], depth + 1),
]);
const setLayerEditable = (layers, layerId, editable) => layers.map((layer) => ({
  ...layer,
  editable: layer.id === layerId ? editable : layer.editable,
  children: layer.children ? setLayerEditable(layer.children, layerId, editable) : undefined,
}));
const getLayerEditMode = (layer) => layer.editMode || (
  layer.type === 'text' || (
    layer.type === 'image' && /headline|description|phone|email|address|customer\s*name|offer|date|title|text/i.test(layer.name || '') &&
    !/logo|brand|icon|feature|decor|background/i.test(layer.name || '')
  ) ? 'text' : 'image'
);
const setLayerEditMode = (layers, layerId, editMode) => layers.map((layer) => ({
  ...layer,
  editMode: layer.id === layerId ? editMode : layer.editMode,
  children: layer.children ? setLayerEditMode(layer.children, layerId, editMode) : undefined,
}));
const DesignForm = ({ mode }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = mode === 'edit';

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    tags: '',
    sizeOptions: '',
    price: '',
    isFeatured: false,
  });
  const [thumbnail, setThumbnail] = useState(null);
  const [fullImage, setFullImage] = useState(null);
  const [uploadMode, setUploadMode] = useState('raster');
  const [designFile, setDesignFile] = useState(null);
  const [psdFile, setPsdFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [currentSourceFile, setCurrentSourceFile] = useState('');
  const [currentPreviewImage, setCurrentPreviewImage] = useState('');
  const [templateBackground, setTemplateBackground] = useState(null);
  const [editableTemplateJson, setEditableTemplateJson] = useState('');
  const [psdTemplate, setPsdTemplate] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState('');
  const usingPsdTemplate = uploadMode === 'psd';

  useEffect(() => {
    api.get('/admin/categories').then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/admin/designs/${id}`)
      .then((res) => {
        const d = res.data;
        setUploadMode(d.template?.type === 'psd' ? 'psd' : 'raster');
        setForm({
          title: d.title || '',
          description: d.description || '',
          category: d.category?._id || d.category || '',
          tags: (d.tags || []).join(', '),
          sizeOptions: (d.sizeOptions || []).join(', '),
          price: d.price || '',
          isFeatured: d.isFeatured || false,
        });
        setEditableTemplateJson(d.editableTemplate ? JSON.stringify(d.editableTemplate, null, 2) : '');
        setPsdTemplate(d.template?.type === 'psd' ? d.template : null);
        setCurrentSourceFile(d.sourceFile || '');
        setCurrentPreviewImage(d.previewImage || '');
      })
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e, templateAction = 'draft') => {
    e.preventDefault();
    if (usingPsdTemplate && psdFile && !previewImage) {
      setError('Choose both the PSD template and its JPG/PNG preview image.');
      return;
    }
    if (usingPsdTemplate && psdFile && !['image/jpeg', 'image/png'].includes(previewImage.type)) {
      setError('PSD template previews must be JPG or PNG.');
      return;
    }
    if (usingPsdTemplate && !psdTemplate && !psdFile) {
      setError('Choose a PSD template file to continue.');
      return;
    }
    setSubmitting(true);
    setError('');
    setUploadProgress(0);
    setUploadPhase('uploading');
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      if (thumbnail) formData.append('thumbnail', thumbnail);
      if (fullImage) formData.append('fullImage', fullImage);
      const masterFile = usingPsdTemplate ? psdFile : designFile;
      if (masterFile) formData.append('designFile', masterFile);
      if (previewImage) formData.append('previewImage', previewImage);
      if (templateBackground) formData.append('templateBackground', templateBackground);
      if (editableTemplateJson.trim()) formData.append('editableTemplate', editableTemplateJson);
      if (psdTemplate) {
        formData.append('template', JSON.stringify(psdTemplate));
        formData.append('templateAction', templateAction);
      }

      let response;
      const send = isEdit ? api.putWithProgress : api.postWithProgress;
      const onProgress = ({ loaded, total, lengthComputable }) => {
        if (!lengthComputable || total <= 0) return;
        const percent = Math.min(100, Math.round(loaded * 100 / total));
        setUploadProgress(percent);
        if (percent >= 100) setUploadPhase(usingPsdTemplate ? 'processing' : 'saving');
      };
      if (isEdit) {
        response = await send(`/admin/designs/${id}`, formData, onProgress);
      } else {
        response = await send('/admin/designs', formData, onProgress);
      }
      if (!isEdit && response.data?.template?.type === 'psd') {
        navigate(`/admin/designs/edit/${response.data._id}`);
      } else {
        navigate('/admin/designs');
      }
    } catch (err) {
      setError(err.message || 'Failed to save design');
    } finally {
      setSubmitting(false);
      setUploadPhase('');
    }
  };

  if (loading) return <p>Loading...</p>;
  const importedLayers = psdTemplate ? flattenLayers(psdTemplate.layers) : [];
  const textLayerCount = importedLayers.filter((layer) => layer.type === 'text' || getLayerEditMode(layer) === 'text').length;
  const imageLayerCount = importedLayers.filter((layer) => ['image', 'smartObject'].includes(layer.type)).length;

  return (
    <div>
      <h1 className="section-title">{isEdit ? 'Edit Design' : 'Add Design'}</h1>

      <form className="card design-form" onSubmit={handleSubmit}>
        {error && <p className="order-form-error">{error}</p>}
        {submitting && (
          <div className="design-upload-progress" role="status" aria-live="polite">
            <strong>{uploadPhase === 'processing' ? 'Upload complete. Processing PSD layers and saving the preview…' : 'Uploading design files…'}</strong>
            <progress max="100" value={uploadProgress} />
            {uploadProgress > 0 && <span>{uploadProgress}% uploaded</span>}
            <small>Large files may take several minutes. Keep this page open until processing finishes.</small>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">{usingPsdTemplate ? 'Template Name' : 'Title'}</label>
          <input className="form-input" name="title" value={form.title} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-textarea" name="description" value={form.description} onChange={handleChange} rows={3} />
        </div>

        <div className="form-group">
          <label className="form-label">Category {usingPsdTemplate && '(optional)'}</label>
          <select className="form-select" name="category" value={form.category} onChange={handleChange} required={!usingPsdTemplate}>
            <option value="">Select category</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <section className="design-source-editor">
          <h2>Upload Design</h2>
          <fieldset className="design-upload-mode">
            <legend>Design type</legend>
            <label className={uploadMode === 'raster' ? 'selected' : ''}>
              <input
                type="radio"
                name="uploadMode"
                value="raster"
                checked={uploadMode === 'raster'}
                disabled={Boolean(isEdit && psdTemplate)}
                onChange={() => { setUploadMode('raster'); setPsdFile(null); setError(''); }}
              />
              JPG / PNG image
            </label>
            <label className={uploadMode === 'psd' ? 'selected' : ''}>
              <input
                type="radio"
                name="uploadMode"
                value="psd"
                checked={uploadMode === 'psd'}
                disabled={Boolean(isEdit && psdTemplate)}
                onChange={() => { setUploadMode('psd'); setDesignFile(null); setError(''); }}
              />
              Layered PSD template
            </label>
          </fieldset>
          <p>{usingPsdTemplate ? 'Select the Photoshop master and a separate JPG/PNG preview. Customers see the preview; customization uses the PSD layers.' : 'Upload a flattened JPG, PNG, or WebP design. Existing raster customization remains unchanged.'}</p>
          {isEdit && (currentSourceFile || currentPreviewImage) && (
            <div className="design-current-assets">
              {currentSourceFile && <a href={resolveFile(currentSourceFile)} target="_blank" rel="noopener noreferrer">View current master file</a>}
              {currentPreviewImage && <a href={resolveFile(currentPreviewImage)} target="_blank" rel="noopener noreferrer">View current browser preview</a>}
            </div>
          )}
          <div className="design-form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="design-master-file">{usingPsdTemplate ? 'PSD Template File (.psd)' : 'Design File (JPG/PNG)'}</label>
              <input
                id="design-master-file"
                type="file"
                accept={usingPsdTemplate ? '.psd,application/x-photoshop' : '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp'}
                required={usingPsdTemplate && !psdTemplate && !psdFile}
                onChange={(e) => {
                  const file = e.target.files[0] || null;
                  if (usingPsdTemplate) setPsdFile(file);
                  else setDesignFile(file);
                  setError('');
                }}
              />
              <small>{usingPsdTemplate ? (psdFile?.name || (psdTemplate ? 'Current PSD master retained unless replaced.' : 'Original PSD is preserved as the editable master.')) : (designFile?.name || 'JPG, PNG, or WebP raster design.')}</small>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="design-preview-file">Preview Image {usingPsdTemplate ? '(required JPG/PNG)' : '(optional)'}</label>
              <input
                id="design-preview-file"
                type="file"
                accept={usingPsdTemplate ? '.png,.jpg,.jpeg,image/png,image/jpeg' : '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp'}
                required={Boolean(usingPsdTemplate && psdFile && !previewImage)}
                onChange={(e) => { setPreviewImage(e.target.files[0] || null); setError(''); }}
              />
              <small>{previewImage?.name || (usingPsdTemplate ? 'Choose a JPG or PNG shown in the catalogue.' : 'Optional browser preview; existing raster fields remain supported.')}</small>
            </div>
          </div>
        </section>

        {psdTemplate && (
          <section className="design-template-editor">
            <h2>Imported PSD layers</h2>
            <p>{psdTemplate.canvas.width} × {psdTemplate.canvas.height} px · {importedLayers.length} layers · {textLayerCount} text · {imageLayerCount} image · {importedLayers.length - textLayerCount - imageLayerCount} other · {psdTemplate.status}</p>
            {currentPreviewImage && <img className="psd-admin-preview" src={resolveFile(currentPreviewImage)} alt="Generated PSD template preview" />}
            <div className="psd-layer-list">
              {flattenLayers(psdTemplate.layers).map((layer) => (
                <label className="psd-layer-row" key={layer.id} style={{ paddingInlineStart: `${12 + layer.depth * 20}px` }}>
                  <input
                    type="checkbox"
                    checked={Boolean(layer.editable)}
                    disabled={layer.type === 'group' || (layer.type !== 'text' && !layer.image)}
                    onChange={(event) => setPsdTemplate((current) => ({
                      ...current,
                      layers: setLayerEditable(current.layers, layer.id, event.target.checked),
                    }))}
                  />
                  <span>{layer.name}</span>
                  {layer.image && (
                    <select
                      className="psd-layer-mode"
                      aria-label={`Edit mode for ${layer.name}`}
                      value={getLayerEditMode(layer)}
                      disabled={!layer.editable}
                      onChange={(event) => setPsdTemplate((current) => ({
                        ...current,
                        layers: setLayerEditMode(current.layers, layer.id, event.target.value),
                      }))}
                    >
                      <option value="image">Replace image</option>
                    {layer.image && (
                      <select
                        className="psd-layer-mode"
                        aria-label={`Edit mode for ${layer.name}`}
                        value={getLayerEditMode(layer)}
                        disabled={!layer.editable}
                        onChange={(event) => setPsdTemplate((current) => ({
                          ...current,
                          layers: setLayerEditMode(current.layers, layer.id, event.target.value),
                        }))}
                      >
                        <option value="image">Replace image</option>
                        <option value="text">Replace text</option>
                      </select>
                    )}
                      <option value="text">Replace text</option>
                    </select>
                  )}
                  <small title={`${layer.type}; x ${Math.round(layer.x)}, y ${Math.round(layer.y)}; ${Math.round(layer.width)} × ${Math.round(layer.height)} px; ${layer.visible ? 'visible' : 'hidden'}; ${Math.round(layer.opacity * 100)}% opacity; z-order ${layer.zOrder}${layer.textStyle?.fontFamily ? `; ${layer.textStyle.fontFamily} ${layer.textStyle.fontSize || ''}px` : ''}${layer.mask ? '; has pixel mask' : ''}`}>
                    {layer.type} · x {Math.round(layer.x)}, y {Math.round(layer.y)} · {Math.round(layer.width)} × {Math.round(layer.height)} px · {layer.visible ? 'visible' : 'hidden'} · z{layer.zOrder}{layer.text ? ` · ${layer.text}` : ''}
                  </small>
                </label>
              ))}
            </div>
          </section>
        )}

        <div className="design-form-row">
          <div className="form-group">
            <label className="form-label">Tags (comma separated)</label>
            <input className="form-input" name="tags" value={form.tags} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Size Options (comma separated)</label>
            <input className="form-input" name="sizeOptions" value={form.sizeOptions} onChange={handleChange} />
          </div>
        </div>

        <section className="design-template-editor">
          <h2>Legacy Editable Template (Optional)</h2>
          <p>Raster designs are analyzed automatically. These fields are only for existing manually prepared templates.</p>
          <div className="form-group">
            <label className="form-label">Legacy clean background (optional) {isEdit && '(leave empty to keep current)'}</label>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setTemplateBackground(e.target.files[0] || null)} />
          </div>
          <div className="form-group">
            <label className="form-label">Legacy editable text layers (optional)</label>
            <textarea
              className="form-textarea design-template-json"
              value={editableTemplateJson}
              onChange={(e) => setEditableTemplateJson(e.target.value)}
              rows={12}
              placeholder='{"enabled":true,"width":1200,"height":800,"palette":{"background":"#172554","primary":"#f59e0b","text":"#ffffff"},"textLayers":[{"key":"name","x":5,"y":8,"width":90,"height":18,"fontSize":72,"color":"$text","align":"middle"}]}'
            />
          </div>
        </section>

        <div className="design-form-row">
          <div className="form-group">
            <label className="form-label">Price</label>
            <input className="form-input" type="number" name="price" value={form.price} onChange={handleChange} />
          </div>
          <div className="form-group design-form-checkbox">
            <label className="form-label">
              <input type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={handleChange} /> Featured
            </label>
          </div>
        </div>

        <div className="design-form-row">
          <div className="form-group">
            <label className="form-label">Legacy thumbnail / preview {isEdit && '(leave empty to keep current)'}</label>
            <input type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" onChange={(e) => setThumbnail(e.target.files[0] || null)} />
          </div>
          <div className="form-group">
            <label className="form-label">Legacy full image {isEdit && '(leave empty to keep current)'}</label>
            <input type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" onChange={(e) => setFullImage(e.target.files[0] || null)} />
          </div>
        </div>

        <div className="design-form-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : psdTemplate ? 'Save Draft' : isEdit ? 'Update Design' : 'Create Design'}
          </button>
          {psdTemplate && (
            <button type="button" className="btn btn-outline" disabled={submitting} onClick={(event) => handleSubmit(event, 'publish')}>
              {submitting ? 'Saving...' : 'Save and Publish Template'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default DesignForm;
