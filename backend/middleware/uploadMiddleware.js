const multer = require('multer');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const storage = multer.memoryStorage();
const diskStorage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, os.tmpdir()),
  filename: (_req, file, callback) => callback(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
});
const allowedExtensions = new Set([
  '.jpeg', '.jpg', '.png', '.webp', '.gif', '.pdf', '.ai', '.psd',
  '.cdr', '.eps', '.svg', '.tif', '.tiff', '.zip',
]);

const fileFilter = (req, file, cb) => {
  const isAllowed = allowedExtensions.has(path.extname(file.originalname).toLowerCase());
  if (isAllowed) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Allowed: images, PDF, AI, PSD, CDR, EPS, SVG, TIFF, ZIP'));
  }
};

const createUpload = (maxFileSize = 30 * 1024 * 1024) => multer({
  storage,
  fileFilter,
  limits: { fileSize: maxFileSize },
});

const upload = createUpload();
upload.withMaxFileSize = createUpload;
upload.withDiskStorage = () => multer({ storage: diskStorage, fileFilter });

module.exports = upload;
