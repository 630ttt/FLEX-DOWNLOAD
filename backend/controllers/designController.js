const Design = require('../models/Design');
const Order = require('../models/Order');
const fs = require('fs');
const { saveUpload, deleteFileByUrl, getFileMetadataByIds } = require('../services/fileStorage');
const { getExtension, isPsd, validateMasterFile, validatePreviewFile, validatePsdPreviewFile } = require('../services/designAssets');
const { getCachedOrAnalyzeDesign } = require('../services/ai/imageAnalysisService');
const { importPsdTemplateFromStoredFile } = require('../services/psdTemplateService');

const FILE_ID_PATTERN = /\/api\/files\/([a-f\d]{24})/i;
const PREVIEW_URL_PATTERN = /\.(?:png|jpe?g|webp)(?:[?#].*)?$/i;

const analyzeUploadedDesign = async (design) => {
  if (design.fileType === 'psd' || design.template?.type === 'psd') return null;
  try {
    return await getCachedOrAnalyzeDesign(design);
  } catch (error) {
    console.warn(
      `Automatic analysis unavailable for design ${design._id}: ${error.message}`
    );
    return null;
  }
};

const getFileId = (value) => String(value || '').match(FILE_ID_PATTERN)?.[1] || '';

const isBrowserPreviewUrl = (value, fileMetadata) => {
  if (!value) return false;
  if (/^https?:\/\//i.test(value) && !getFileId(value)) return PREVIEW_URL_PATTERN.test(value);
  return Boolean(fileMetadata && /^image\/(?:png|jpeg|webp)$/i.test(fileMetadata.contentType || '') && PREVIEW_URL_PATTERN.test(fileMetadata.filename || ''));
};

const normalizeDesignAssets = async (designs) => {
  if (!designs.length) return [];
  const ids = [...new Set(designs.flatMap((design) =>
    ['previewImage', 'thumbnail', 'fullImage', 'sourceFile']
      .map((key) => getFileId(design[key]))
      .filter(Boolean)
  ))];
  const metadata = await getFileMetadataByIds(ids);
  const metadataById = new Map(metadata.map((file) => [String(file._id), file]));

  return designs.map((design) => {
    const candidates = [design.previewImage, design.thumbnail, design.fullImage].filter(Boolean);
    const previewImage = candidates.find((url) => isBrowserPreviewUrl(url, metadataById.get(getFileId(url)))) || '';
    const detectedPsdSource = [design.thumbnail, design.fullImage]
      .find((url) => {
        const file = metadataById.get(getFileId(url));
        return file && (isPsd({ originalname: file.filename }) || /photoshop/i.test(file.contentType || ''));
      }) || '';
    const sourceFile = design.sourceFile || detectedPsdSource || previewImage;
    const sourceMetadata = metadataById.get(getFileId(sourceFile));
    const fileType = design.fileType || (sourceFile
      ? getExtension({ originalname: sourceMetadata?.filename || sourceFile }).slice(1)
      : getExtension({ originalname: metadataById.get(getFileId(previewImage))?.filename || previewImage }).slice(1));

    return {
      ...design,
      sourceFile,
      previewImage,
      fileType,
      customizable: Boolean(
        design.customizable ||
        previewImage ||
        (design.editableTemplate?.enabled && design.editableTemplate?.backgroundImage && design.editableTemplate?.textLayers?.length)
      ),
    };
  });
};

const getUpload = (req, field) => req.files?.[field]?.[0] || null;

const getPsdUpload = (req) => {
  const designFile = getUpload(req, 'designFile');
  if (designFile && isPsd(designFile)) return designFile;
  return [getUpload(req, 'thumbnail'), getUpload(req, 'fullImage')].find(isPsd) || null;
};

const getPsdPreviewUpload = (req) => getUpload(req, 'previewImage') ||
  [getUpload(req, 'thumbnail'), getUpload(req, 'fullImage')].find((file) => file && !isPsd(file)) || null;

const cleanupRequestUploads = async (req) => {
  const files = Object.values(req.files || {}).flat();
  await Promise.all(files.filter((file) => file.path).map((file) => fs.promises.rm(file.path, { force: true }).catch(() => {})));
};

const validatePsdUploadPair = (req, psdUpload) => {
  if (!psdUpload) return;
  const preview = getPsdPreviewUpload(req);
  if (!preview) throw new Error('Upload both a PSD template file and its JPG/PNG preview image.');
  validatePsdPreviewFile(preview);
};

const prepareDesignFiles = async (req, existingDesign = null, generatedPreviewBuffer = null, storedPsdUrl = '') => {
  const designFile = getUpload(req, 'designFile');
  const explicitPreview = getUpload(req, 'previewImage');
  const legacyThumbnail = getUpload(req, 'thumbnail');
  const legacyFullImage = getUpload(req, 'fullImage');
  const legacyFiles = [legacyThumbnail, legacyFullImage].filter(Boolean);
  const legacyPsd = legacyFiles.find(isPsd);
  const sourceUpload = designFile || legacyPsd || null;
  const generatedPreview = generatedPreviewBuffer ? {
    originalname: `${(sourceUpload?.originalname || 'design').replace(/\.[^.]+$/, '')}-preview.png`,
    mimetype: 'image/png',
    size: generatedPreviewBuffer.length,
    buffer: generatedPreviewBuffer,
  } : null;
  const previewUpload = explicitPreview ||
    legacyFiles.find((file) => !isPsd(file)) ||
    (designFile && !isPsd(designFile) ? designFile : null) ||
    generatedPreview;

  const sourceType = sourceUpload ? validateMasterFile(sourceUpload) : '';
  if (previewUpload) validatePreviewFile(previewUpload);

  let normalizedExisting = null;
  let existingPreview = '';
  if (existingDesign) {
    [normalizedExisting] = await normalizeDesignAssets([
      existingDesign.toObject ? existingDesign.toObject() : existingDesign,
    ]);
    existingPreview = normalizedExisting.previewImage;
  }

  const replacePreview = Boolean(
    explicitPreview ||
    generatedPreview ||
    (designFile && !isPsd(designFile)) ||
    (legacyThumbnail && !isPsd(legacyThumbnail)) ||
    (!existingDesign && previewUpload) ||
    (sourceUpload && isPsd(sourceUpload) && !existingPreview && previewUpload)
  );

  if (!existingDesign && !previewUpload || sourceUpload && isPsd(sourceUpload) && !previewUpload && !existingPreview) {
    throw new Error('A PNG, JPG, or WebP preview image is required. PSD files must be uploaded with a preview.');
  }

  let savedPreview = existingPreview;
  if (previewUpload && replacePreview) savedPreview = await saveUpload(previewUpload);

  const updates = {};
  if (sourceUpload) {
    updates.sourceFile = storedPsdUrl || (sourceUpload === previewUpload ? savedPreview : await saveUpload(sourceUpload));
    updates.fileType = sourceType;
  }
  if (existingDesign && normalizedExisting?.sourceFile && !existingDesign.sourceFile) {
    updates.sourceFile = normalizedExisting.sourceFile;
    updates.fileType = updates.fileType || normalizedExisting.fileType;
  }
  if (replacePreview && savedPreview) {
    updates.previewImage = savedPreview;
    updates.thumbnail = savedPreview;
  }

  const fullImageUpload = legacyFullImage && !isPsd(legacyFullImage) ? legacyFullImage : null;
  if (fullImageUpload) {
    updates.fullImage = fullImageUpload === previewUpload && replacePreview
      ? savedPreview
      : await saveUpload(fullImageUpload);
  } else if (!existingDesign || (replacePreview && !existingPreview) || (sourceUpload && isPsd(sourceUpload) && existingDesign.fileType === 'psd')) {
    updates.fullImage = savedPreview;
  }
  if (!existingDesign && savedPreview) {
    updates.previewImage = savedPreview;
    updates.thumbnail = savedPreview;
    updates.fullImage = updates.fullImage || savedPreview;
    updates.sourceFile = updates.sourceFile || savedPreview;
    updates.fileType = updates.fileType || sourceType || getExtension({ originalname: previewUpload.originalname }).slice(1);
  }
  if (existingDesign && !sourceUpload && !previewUpload && !fullImageUpload) return {};
  if (existingDesign && !updates.fileType && replacePreview && previewUpload) {
    updates.fileType = getExtension({ originalname: previewUpload.originalname }).slice(1);
  }

  return updates;
};

const parseEditableTemplate = (value) => {
  if (!value) return undefined;
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Editable template must be a JSON object');
  }
  return parsed;
};

const parsePsdTemplate = (value) => {
  if (!value) return undefined;
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  if (!parsed || typeof parsed !== 'object' || parsed.type !== 'psd' || !Array.isArray(parsed.layers)) {
    throw new Error('PSD template configuration is invalid');
  }
  return parsed;
};

const isAdminRequest = (req) => String(req.baseUrl || '').includes('/admin');

const buildDesignFilter = (req) => {
  const filter = { isActive: true };
  if (!isAdminRequest(req)) {
    filter.$or = [
      { 'template.type': { $ne: 'psd' } },
      { 'template.status': 'published' },
    ];
  }
  if (req.query.category) filter.category = req.query.category;
  if (req.query.search) filter.$text = { $search: req.query.search };
  if (req.query.featured === 'true') filter.isFeatured = true;
  return filter;
};

// @desc  Get paginated designs with search/filter (supports catalogue with 5k-10k designs)
// @route GET /api/designs?page=1&limit=20&category=xxx&search=xxx
const getDesigns = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const adminRequest = isAdminRequest(req);
    const filter = buildDesignFilter(req);

    const sortOptions = {
      latest: { createdAt: -1 },
      popular: { isFeatured: -1, createdAt: -1 },
      'price-asc': { price: 1 },
      'price-desc': { price: -1 },
    };
    const sortBy = sortOptions[req.query.sort] || sortOptions.latest;

    const [designs, total] = await Promise.all([
      Design.find(filter)
        .select(adminRequest
          ? 'title description thumbnail fullImage sourceFile previewImage fileType customizable template category price isFeatured sizeOptions createdAt isActive'
          : 'title description thumbnail fullImage sourceFile previewImage fileType customizable template.type template.status category price isFeatured sizeOptions createdAt')
        .populate('category', 'name slug')
        .sort(sortBy)
        .skip(skip)
        .limit(limit)
        .lean(),
      Design.countDocuments(filter),
    ]);

    const normalizedDesigns = await normalizeDesignAssets(designs);
    res.json({
      success: true,
      data: normalizedDesigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + designs.length < total,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Get single design detail (includes real order count for social proof)
// @route GET /api/designs/:id
const getDesignById = async (req, res) => {
  try {
    const design = await Design.findById(req.params.id).populate('category', 'name slug').lean();
    if (!design) {
      return res.status(404).json({ success: false, message: 'Design not found' });
    }
    if (!isAdminRequest(req) && design.template?.type === 'psd' && design.template.status !== 'published') {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    const orderCount = await Order.countDocuments({ design: design._id });
    const [normalized] = await normalizeDesignAssets([design]);
    res.json({ success: true, data: { ...normalized, orderCount } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Create design
// @route POST /api/admin/designs
const createDesign = async (req, res) => {
  let stagedPsdUrl = '';
  try {
    const { title, description, category, tags, sizeOptions, price, isFeatured } = req.body;
    const psdUpload = getPsdUpload(req);
    validatePsdUploadPair(req, psdUpload);
    if (psdUpload) validateMasterFile(psdUpload);
    if (psdUpload) stagedPsdUrl = await saveUpload(psdUpload);
    let importedPsd = null;
    if (stagedPsdUrl) {
      try {
        importedPsd = await importPsdTemplateFromStoredFile(stagedPsdUrl, { saveAsset: saveUpload });
      } catch (error) {
        await deleteFileByUrl(stagedPsdUrl).catch(() => {});
        stagedPsdUrl = '';
        throw error;
      }
    }
    const imageFields = await prepareDesignFiles(req, null, importedPsd?.previewBuffer, stagedPsdUrl);
    const editableTemplate = parseEditableTemplate(req.body.editableTemplate) || {};
    const template = importedPsd?.template || parsePsdTemplate(req.body.template);
    const templateBackground = getUpload(req, 'templateBackground');
    if (templateBackground) {
      validatePreviewFile(templateBackground);
      editableTemplate.backgroundImage = await saveUpload(templateBackground);
    }

    const design = await Design.create({
      title,
      description,
      ...(category ? { category } : {}),
      ...imageFields,
      tags: tags ? tags.split(',').map((t) => t.trim()) : [],
      sizeOptions: sizeOptions ? sizeOptions.split(',').map((s) => s.trim()) : [],
      price,
      ...(Object.keys(editableTemplate).length > 0 ? { editableTemplate } : {}),
      ...(template ? { template } : {}),
      customizable: true,
      isFeatured: isFeatured === 'true' || isFeatured === true,
    });
    stagedPsdUrl = '';

    const analysis = await analyzeUploadedDesign(design);
    res.status(201).json({
      success: true,
      data: analysis
        ? { ...design.toObject(), aiAnalysis: analysis }
        : design,
    });
  } catch (error) {
    if (stagedPsdUrl) await deleteFileByUrl(stagedPsdUrl).catch(() => {});
    res.status(400).json({ success: false, message: error.message });
  } finally {
    await cleanupRequestUploads(req);
  }
};

// @desc  Update design
// @route PUT /api/admin/designs/:id
const updateDesign = async (req, res) => {
  let stagedPsdUrl = '';
  try {
    const existing = await Design.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Design not found' });
    }

    const updates = { ...req.body };
    const psdUpload = getPsdUpload(req);
    validatePsdUploadPair(req, psdUpload);
    if (psdUpload) validateMasterFile(psdUpload);
    if (psdUpload) stagedPsdUrl = await saveUpload(psdUpload);
    let importedPsd = null;
    if (stagedPsdUrl) {
      try {
        importedPsd = await importPsdTemplateFromStoredFile(stagedPsdUrl, { saveAsset: saveUpload });
      } catch (error) {
        await deleteFileByUrl(stagedPsdUrl).catch(() => {});
        stagedPsdUrl = '';
        throw error;
      }
    }
    Object.assign(updates, await prepareDesignFiles(req, existing, importedPsd?.previewBuffer, stagedPsdUrl));
    updates.customizable = true;
    if (updates.tags) updates.tags = updates.tags.split(',').map((t) => t.trim());
    if (updates.category === '') updates.category = null;
    if (updates.sizeOptions) updates.sizeOptions = updates.sizeOptions.split(',').map((s) => s.trim());
    if (updates.editableTemplate) updates.editableTemplate = parseEditableTemplate(updates.editableTemplate);
    if (importedPsd) updates.template = importedPsd.template;
    else if (updates.template) updates.template = parsePsdTemplate(updates.template);
    else if (req.body.templateAction && existing.template?.type === 'psd') updates.template = existing.template.toObject?.() || existing.template;
    if (updates.template?.type === 'psd') {
      if (req.body.templateAction === 'publish') updates.template.status = 'published';
      if (req.body.templateAction === 'draft') updates.template.status = 'draft';
    }
    const templateBackground = getUpload(req, 'templateBackground');
    if (templateBackground) {
      validatePreviewFile(templateBackground);
      updates.editableTemplate = updates.editableTemplate || existing.editableTemplate?.toObject?.() || existing.editableTemplate || {};
      updates.editableTemplate.backgroundImage = await saveUpload(templateBackground);
    }
    const design = await Design.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!design) {
      return res.status(404).json({ success: false, message: 'Design not found' });
    }
    stagedPsdUrl = '';
    const analysis = await analyzeUploadedDesign(design);
    res.json({
      success: true,
      data: analysis
        ? { ...design.toObject(), aiAnalysis: analysis }
        : design,
    });
  } catch (error) {
    if (stagedPsdUrl) await deleteFileByUrl(stagedPsdUrl).catch(() => {});
    res.status(400).json({ success: false, message: error.message });
  } finally {
    await cleanupRequestUploads(req);
  }
};

// @desc  Delete design
// @route DELETE /api/admin/designs/:id
const deleteDesign = async (req, res) => {
  try {
    const design = await Design.findByIdAndDelete(req.params.id);
    if (!design) {
      return res.status(404).json({ success: false, message: 'Design not found' });
    }
    res.json({ success: true, message: 'Design deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDesigns, getDesignById, createDesign, updateDesign, deleteDesign, normalizeDesignAssets, buildDesignFilter, validatePsdUploadPair };
