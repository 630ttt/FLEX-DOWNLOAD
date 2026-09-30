import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FaSave, FaThLarge } from 'react-icons/fa';
import DesignEditor from '../components/editor/DesignEditor';
import BrandLoader from '../components/BrandLoader';
import BrandLogo from '../components/BrandLogo';
import { createEmptyTemplate, normalizeTemplate } from '../utils/templateSerializer';
import { getPublishedTemplate } from '../services/templateService';
import './DesignEditorPage.css';

const DesignEditorPage = () => {
  const { templateId } = useParams();
  const [templateRecord, setTemplateRecord] = useState(null);
  const [editedDocument, setEditedDocument] = useState(null);
  const [loading, setLoading] = useState(Boolean(templateId));
  const [error, setError] = useState('');
  const [saveLabel, setSaveLabel] = useState('Save draft');

  useEffect(() => {
    document.documentElement.classList.add('design-studio-active');
    return () => document.documentElement.classList.remove('design-studio-active');
  }, []);

  useEffect(() => {
    if (!templateId) {
      let empty = createEmptyTemplate();
      try {
        const saved = sessionStorage.getItem('yamini-editor-draft');
        if (saved) empty = normalizeTemplate(JSON.parse(saved));
      } catch {
        sessionStorage.removeItem('yamini-editor-draft');
      }
      setTemplateRecord({ name: 'Untitled banner', templateJson: empty });
      setEditedDocument(empty);
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError('');

    getPublishedTemplate(templateId)
      .then((record) => {
        if (!active) return;
        let initial = normalizeTemplate(record.templateJson);
        try {
          const saved = sessionStorage.getItem(`yamini-template-draft:${templateId}`);
          if (saved) initial = normalizeTemplate(JSON.parse(saved));
        } catch {
          sessionStorage.removeItem(`yamini-template-draft:${templateId}`);
        }
        setTemplateRecord({ ...record, templateJson: initial });
        setEditedDocument(initial);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Could not load this template');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [templateId]);

  const saveDraft = () => {
    if (!editedDocument) return;
    const key = templateId ? `yamini-template-draft:${templateId}` : 'yamini-editor-draft';
    try {
      sessionStorage.setItem(key, JSON.stringify(editedDocument));
      setSaveLabel('Saved in this browser');
      window.setTimeout(() => setSaveLabel('Save draft'), 2000);
    } catch {
      setSaveLabel('Could not save');
    }
  };

  const title = templateRecord?.name || 'Untitled design';
  const canvasLabel = editedDocument?.canvas
    ? `${editedDocument.canvas.width} × ${editedDocument.canvas.height}px`
    : 'Canvas';

  if (loading) {
    return (
      <main className="design-studio-root design-studio-root--loading">
        <BrandLoader label="Opening design studio…" fullscreen />
      </main>
    );
  }

  if (error || !templateRecord || !editedDocument) {
    return (
      <main className="design-studio-root design-studio-root--error">
        <p>{error || 'Design studio could not be opened.'}</p>
        <Link to="/templates" className="design-studio-link">Back to templates</Link>
      </main>
    );
  }

  return (
    <main className="design-studio-root">
      <header className="design-studio-toolbar">
        <div className="design-studio-toolbar__left">
          <Link to="/" className="design-studio-brand" aria-label="YAMINI Flex home">
            <BrandLogo variant="light" />
          </Link>
          <div className="design-studio-doc">
            <span className="design-studio-doc__kicker">Design studio</span>
            <h1>{title}</h1>
            <span className="design-studio-doc__meta">{canvasLabel} · Live canvas</span>
          </div>
        </div>
        <div className="design-studio-toolbar__right">
          <Link to="/templates" className="design-studio-btn design-studio-btn--ghost">
            <FaThLarge />
            Templates
          </Link>
          <button type="button" className="design-studio-btn design-studio-btn--ghost" onClick={saveDraft}>
            <FaSave />
            {saveLabel}
          </button>
          <Link to="/catalogue" className="design-studio-btn design-studio-btn--primary">
            Order print
          </Link>
        </div>
      </header>

      <div className="design-studio-canvas-host">
        <DesignEditor
          key={templateId || 'new'}
          initialTemplate={templateRecord.templateJson}
          templateMetadata={{
            id: templateRecord.templateJson?.id,
            name: templateRecord.name,
            description: templateRecord.description,
          }}
          onChange={setEditedDocument}
          mode="customer"
        />
      </div>
    </main>
  );
};

export default DesignEditorPage;
