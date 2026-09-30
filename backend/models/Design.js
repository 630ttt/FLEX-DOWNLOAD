const mongoose = require('mongoose');

const templateLayerSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      enum: ['name', 'description', 'phone', 'address', 'price', 'date', 'offer'],
      required: true,
    },
    x: { type: Number, min: 0, max: 100, required: true },
    y: { type: Number, min: 0, max: 100, required: true },
    width: { type: Number, min: 1, max: 100, required: true },
    height: { type: Number, min: 1, max: 100, required: true },
    fontSize: { type: Number, min: 1, max: 500, default: 36 },
    fontFamily: { type: String, trim: true, default: 'sans-serif' },
    fontWeight: { type: String, trim: true, default: '700' },
    color: { type: String, trim: true, default: '#ffffff' },
    align: { type: String, enum: ['start', 'middle', 'end'], default: 'middle' },
  },
  { _id: false }
);

const editableTemplateSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    backgroundImage: { type: String, default: '' },
    width: { type: Number, min: 1, max: 12000, default: 1200 },
    height: { type: Number, min: 1, max: 12000, default: 800 },
    palette: {
      background: { type: String, default: '#172554' },
      primary: { type: String, default: '#f59e0b' },
      text: { type: String, default: '#ffffff' },
    },
    tintOpacity: { type: Number, min: 0, max: 1, default: 0.16 },
    textLayers: { type: [templateLayerSchema], default: [] },
  },
  { _id: false }
);

const aiAnalysisElementSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ['text', 'image', 'logo', 'background', 'decorative', 'unknown'], required: true },
    semanticType: { type: String, trim: true, default: 'unknown' },
    text: { type: String, trim: true, default: '' },
    bbox: {
      x: { type: Number, min: 0, required: true },
      y: { type: Number, min: 0, required: true },
      width: { type: Number, min: 0, required: true },
      height: { type: Number, min: 0, required: true },
    },
    confidence: { type: Number, min: 0, max: 1, required: true },
    fontSize: { type: Number, min: 1, default: null },
    fontFamily: { type: String, trim: true, default: '' },
    fontWeight: { type: String, trim: true, default: '' },
    fontStyle: { type: String, enum: ['normal', 'italic', 'oblique', 'unknown'], default: 'unknown' },
    letterSpacing: { type: Number, default: null },
    lineHeight: { type: Number, min: 1, default: null },
    alignment: { type: String, enum: ['left', 'center', 'right', 'unknown'], default: 'unknown' },
    rotation: { type: Number, min: -360, max: 360, default: 0 },
    textColor: { type: String, match: /^(?:#[0-9a-f]{6})?$/i, default: '' },
    textColorConfidence: { type: Number, min: 0, max: 1, default: 0 },
    fontConfidence: { type: Number, min: 0, max: 1, default: 0 },
    textOpacity: { type: Number, min: 0, max: 1, default: null },
    strokeColor: { type: String, match: /^(?:#[0-9a-f]{6})?$/i, default: '' },
    strokeWidth: { type: Number, min: 0, default: null },
    shadowColor: { type: String, match: /^(?:#[0-9a-f]{6})?$/i, default: '' },
    shadowBlur: { type: Number, min: 0, default: null },
    shadowOffsetX: { type: Number, default: null },
    shadowOffsetY: { type: Number, default: null },
  },
  { _id: false }
);

const aiAnalysisSchema = new mongoose.Schema(
  {
    sourceHash: { type: String, required: true, match: /^[a-f\d]{64}$/i },
    analysisVersion: { type: Number, required: true },
    analyzedAt: { type: Date, default: Date.now },
    imageWidth: { type: Number, min: 1, required: true },
    imageHeight: { type: Number, min: 1, required: true },
    elements: { type: [aiAnalysisElementSchema], default: [] },
  },
  { _id: false }
);

const designSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      required: function categoryRequired() {
        return this.template?.type !== 'psd';
      },
    },
    thumbnail: { type: String, required: true },
    fullImage: { type: String, required: true },
    sourceFile: { type: String, default: '' },
    previewImage: { type: String, default: '' },
    fileType: { type: String, trim: true, lowercase: true, default: '' },
    customizable: { type: Boolean, default: false },
    tags: [{ type: String, trim: true, lowercase: true }],
    sizeOptions: [{ type: String, trim: true }],
    price: { type: Number, default: 0 },
    template: { type: mongoose.Schema.Types.Mixed, default: undefined },
    editableTemplate: { type: editableTemplateSchema, default: undefined },
    aiAnalysis: { type: aiAnalysisSchema, default: undefined },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes to support search/filter APIs efficiently at scale (5k-10k designs)
designSchema.index({ title: 'text', tags: 'text', description: 'text' });
designSchema.index({ category: 1, isActive: 1, createdAt: -1 });

module.exports = mongoose.model('Design', designSchema);
