const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 1000, default: '' },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
  templateJson: { type: mongoose.Schema.Types.Mixed, required: true },
  previewImage: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
}, { timestamps: true });

templateSchema.index({ status: 1, updatedAt: -1 });

module.exports = mongoose.model('Template', templateSchema);