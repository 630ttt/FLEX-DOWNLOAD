import { api } from '../api/client';

const templateRequest = async (request) => {
  try { return await request(); }
  catch (error) {
    if (error instanceof TypeError || error.message === 'Failed to fetch') {
      throw new Error('Template service is unavailable. Check the backend connection and try again.');
    }
    throw error;
  }
};

const createTemplateForm = ({ name, description, templateJson, previewBlob, status }) => {
  const form = new FormData();
  form.append('name', name || templateJson.name || 'Untitled template');
  form.append('description', description || templateJson.description || '');
  form.append('templateJson', JSON.stringify(templateJson));
  if (status) form.append('status', status);
  if (previewBlob) form.append('preview', new File([previewBlob], 'template-preview.png', { type: 'image/png' }));
  return form;
};

export const listPublishedTemplates = async () => (await templateRequest(() => api.get('/templates'))).data;
export const getPublishedTemplate = async (id) => (await templateRequest(() => api.get(`/templates/${id}`))).data;
export const listAdminTemplates = async () => (await templateRequest(() => api.get('/admin/templates'))).data;
export const getAdminTemplate = async (id) => (await templateRequest(() => api.get(`/admin/templates/${id}`))).data;

export const saveTemplate = async (template, id = '') => {
  const form = createTemplateForm(template);
  const response = await templateRequest(() => id
    ? api.put(`/admin/templates/${id}`, form)
    : api.post('/admin/templates', form));
  return response.data;
};

export const uploadTemplateAsset = async (file) => {
  const form = new FormData();
  form.append('asset', file);
  return (await templateRequest(() => api.post('/admin/templates/assets', form))).data;
};

export const publishTemplate = async (id, status = 'published') => (await templateRequest(() => api.post(`/admin/templates/${id}/publish`, { status }))).data;
export const duplicateTemplate = async (id, name) => (await templateRequest(() => api.post(`/admin/templates/${id}/duplicate`, { name }))).data;
export const deleteTemplate = async (id) => templateRequest(() => api.del(`/admin/templates/${id}`));
export const updateTemplatePreview = async (id, previewBlob) => {
  const form = new FormData();
  form.append('preview', new File([previewBlob], 'template-preview.png', { type: 'image/png' }));
  return (await templateRequest(() => api.post(`/admin/templates/${id}/preview`, form))).data;
};