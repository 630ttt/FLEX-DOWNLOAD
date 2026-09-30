const path = require('path');
const fs = require('fs');

const PREVIEW_TYPES = {
  '.jpg': { mime: 'image/jpeg', matches: (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  '.jpeg': { mime: 'image/jpeg', matches: (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  '.png': { mime: 'image/png', matches: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  '.webp': { mime: 'image/webp', matches: (buffer) => buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' },
};

const getExtension = (file) => path.extname(file?.originalname || '').toLowerCase();
const isPsd = (file) => getExtension(file) === '.psd';

const readUploadHeader = (file, length = 12) => {
  if (Buffer.isBuffer(file?.buffer)) return file.buffer.subarray(0, length);
  if (!file?.path) return Buffer.alloc(0);
  const header = Buffer.alloc(length);
  const descriptor = fs.openSync(file.path, 'r');
  try {
    const bytesRead = fs.readSync(descriptor, header, 0, length, 0);
    return header.subarray(0, bytesRead);
  } finally {
    fs.closeSync(descriptor);
  }
};

const validateMasterFile = (file) => {
  if (!file?.buffer && !file?.path) throw new Error('Design master upload is empty');
  const extension = getExtension(file);
  if (extension === '.psd') {
    if (readUploadHeader(file, 4).toString('ascii', 0, 4) !== '8BPS') {
      throw new Error('The uploaded PSD file is invalid or incomplete');
    }
    return 'psd';
  }
  if (!PREVIEW_TYPES[extension] || !PREVIEW_TYPES[extension].matches(readUploadHeader(file))) {
    throw new Error('Design master must be a valid PSD, PNG, JPG, or WebP file');
  }
  return extension.slice(1);
};

const validatePreviewFile = (file) => {
  if (!file?.buffer && !file?.path) throw new Error('Preview image upload is empty');
  const type = PREVIEW_TYPES[getExtension(file)];
  if (!type || !type.matches(readUploadHeader(file))) {
    throw new Error('Preview must be a valid PNG, JPG, or WebP image');
  }
  if (file.mimetype && file.mimetype !== type.mime && file.mimetype !== 'application/octet-stream') {
    throw new Error('Preview image content type does not match its file extension');
  }
  return true;
};

const validatePsdPreviewFile = (file) => {
  if (!['.jpg', '.jpeg', '.png'].includes(getExtension(file))) {
    throw new Error('A PSD template requires a JPG or PNG preview image');
  }
  return validatePreviewFile(file);
};

const isBrowserPreviewMetadata = (file) => {
  if (!file) return false;
  const extension = path.extname(file.filename || '').toLowerCase();
  return Boolean(PREVIEW_TYPES[extension] && /^image\/(jpeg|png|webp)$/i.test(file.contentType || ''));
};

module.exports = { getExtension, isPsd, readUploadHeader, validateMasterFile, validatePreviewFile, validatePsdPreviewFile, isBrowserPreviewMetadata };
