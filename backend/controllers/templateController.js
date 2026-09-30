const mongoose = require('mongoose');
const Template = require('../models/Template');
const { saveUpload, deleteFileByUrl } = require('../services/fileStorage');
const {
  MAX_ASSET_BYTES,
  parseTemplateJson,
  validateImageUpload,
  duplicateTemplateJson,
} = require('../services/templateService');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const sendError = (res, error, fallbackStatus = 500) => res.status(error.status || fallbackStatus).json({ success: false, message: error.message || 'Template request failed' });

const listPublishedTemplates = async (_req, res) => {
  try {
    const templates = await Template.find({ status: 'published' })
      .select('name description status templateJson.canvas previewImage createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ success: true, data: templates });
  } catch (error) { sendError(res, error); }
};

const getPublishedTemplate = async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid template ID' });
  try {
    const template = await Template.findOne({ _id: req.params.id, status: 'published' }).lean();
    if (!template) return res.status(404).json({ success: false, message: 'Published template not found' });
    res.json({ success: true, data: template });
  } catch (error) { sendError(res, error); }
};

const listAdminTemplates = async (_req, res) => {
  try {
    const templates = await Template.find()
      .select('name description status templateJson.canvas previewImage createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ success: true, data: templates });
  } catch (error) { sendError(res, error); }
};

const getAdminTemplate = async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid template ID' });
  try {
    const template = await Template.findById(req.params.id).lean();
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, data: template });
  } catch (error) { sendError(res, error); }
};

const storePreview = async (file) => {
  if (!file) return '';
  await validateImageUpload(file);
  return saveUpload(file);
};

const createTemplate = async (req, res) => {
  let previewImage = '';
  try {
    const templateJson = parseTemplateJson(req.body.templateJson);
    const name = String(req.body.name || templateJson.name).trim().slice(0, 120);
    if (!name) return res.status(400).json({ success: false, message: 'Template name is required' });
    templateJson.name = name;
    templateJson.description = String(req.body.description || templateJson.description || '').slice(0, 1000);
    if (req.file) previewImage = await storePreview(req.file);
    const template = await Template.create({
      name,
      description: templateJson.description,
      templateJson,
      previewImage,
      status: 'draft',
      createdBy: req.admin.id,
    });
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    if (previewImage) await deleteFileByUrl(previewImage).catch(() => {});
    sendError(res, error, 400);
  }
};

const updateTemplate = async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid template ID' });
  let previewImage = '';
  try {
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    const templateJson = parseTemplateJson(req.body.templateJson || template.templateJson);
    const name = String(req.body.name || template.name).trim().slice(0, 120);
    if (!name) return res.status(400).json({ success: false, message: 'Template name is required' });
    templateJson.name = name;
    templateJson.description = String(req.body.description ?? template.description ?? '').slice(0, 1000);
    template.name = name;
    template.description = templateJson.description;
    template.templateJson = templateJson;
    if (req.body.status && ['draft', 'published', 'archived'].includes(req.body.status)) template.status = req.body.status;
    if (req.file) {
      previewImage = await storePreview(req.file);
      template.previewImage = previewImage;
    }
    await template.save();
    res.json({ success: true, data: template });
  } catch (error) {
    if (previewImage) await deleteFileByUrl(previewImage).catch(() => {});
    sendError(res, error, 400);
  }
};

const deleteTemplate = async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid template ID' });
  try {
    const template = await Template.findByIdAndDelete(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, message: 'Template deleted' });
  } catch (error) { sendError(res, error); }
};

const publishTemplate = async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid template ID' });
  try {
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    template.status = req.body.status === 'archived' ? 'archived' : 'published';
    await template.save();
    res.json({ success: true, data: template });
  } catch (error) { sendError(res, error); }
};

const duplicateTemplate = async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid template ID' });
  try {
    const source = await Template.findById(req.params.id).lean();
    if (!source) return res.status(404).json({ success: false, message: 'Template not found' });
    const name = String(req.body.name || `${source.name} - Copy`).trim().slice(0, 120);
    const templateJson = duplicateTemplateJson(source.templateJson, name);
    const duplicate = await Template.create({
      name,
      description: source.description,
      templateJson,
      previewImage: source.previewImage,
      status: 'draft',
      createdBy: req.admin.id,
    });
    res.status(201).json({ success: true, data: duplicate });
  } catch (error) { sendError(res, error, 400); }
};

const uploadTemplateAsset = async (req, res) => {
  try {
    const metadata = await validateImageUpload(req.file);
    const url = await saveUpload({ ...req.file, mimetype: `image/${metadata.format === 'jpeg' ? 'jpeg' : metadata.format}` });
    res.status(201).json({ success: true, data: { url } });
  } catch (error) { sendError(res, error, 400); }
};

const updateTemplatePreview = async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid template ID' });
  let previewImage = '';
  try {
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    previewImage = await storePreview(req.file);
    template.previewImage = previewImage;
    await template.save();
    res.json({ success: true, data: { previewImage } });
  } catch (error) {
    if (previewImage) await deleteFileByUrl(previewImage).catch(() => {});
    sendError(res, error, 400);
  }
};

module.exports = {
  listPublishedTemplates,
  getPublishedTemplate,
  listAdminTemplates,
  getAdminTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  publishTemplate,
  duplicateTemplate,
  uploadTemplateAsset,
  updateTemplatePreview,
};