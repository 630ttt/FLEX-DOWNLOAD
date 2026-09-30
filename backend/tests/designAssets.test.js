const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  validateMasterFile,
  validatePreviewFile,
  validatePsdPreviewFile,
} = require('../services/designAssets');

const makeFile = (originalname, mimetype, buffer) => ({ originalname, mimetype, buffer });

const validPng = () => makeFile(
  'preview.png',
  'image/png',
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0])
);

const validJpeg = () => makeFile(
  'preview.jpg',
  'image/jpeg',
  Buffer.from([0xff, 0xd8, 0xff, 0xe0])
);

const validWebp = () => {
  const buffer = Buffer.alloc(12);
  buffer.write('RIFF', 0, 'ascii');
  buffer.write('WEBP', 8, 'ascii');
  return makeFile('preview.webp', 'image/webp', buffer);
};

test('accepts PSD as a master and browser formats as previews', () => {
  const psd = makeFile('master.psd', 'application/octet-stream', Buffer.from('8BPSxxxx'));
  assert.equal(validateMasterFile(psd), 'psd');
  assert.equal(validatePreviewFile(validPng()), true);
  assert.equal(validatePreviewFile(validJpeg()), true);
  assert.equal(validatePreviewFile(validWebp()), true);
});

test('PSD previews are JPG or PNG while normal raster previews still accept WebP', () => {
  assert.equal(validatePsdPreviewFile(validPng()), true);
  assert.equal(validatePsdPreviewFile(validJpeg()), true);
  assert.throws(() => validatePsdPreviewFile(validWebp()), /JPG or PNG/);
  assert.equal(validatePreviewFile(validWebp()), true);
});

test('validates disk-spooled PSD and preview files using only their headers', (context) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'design-upload-test-'));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const psdPath = path.join(directory, 'master.psd');
  const previewPath = path.join(directory, 'preview.png');
  fs.writeFileSync(psdPath, Buffer.concat([Buffer.from('8BPS'), Buffer.alloc(1024 * 1024)]));
  fs.writeFileSync(previewPath, Buffer.concat([validPng().buffer, Buffer.alloc(1024 * 1024)]));
  assert.equal(validateMasterFile({ originalname: 'master.psd', path: psdPath }), 'psd');
  assert.equal(validatePsdPreviewFile({ originalname: 'preview.png', mimetype: 'image/png', path: previewPath }), true);
});

test('rejects invalid master signatures and unsupported master formats', () => {
  assert.throws(
    () => validateMasterFile(makeFile('master.psd', 'application/octet-stream', Buffer.from('bad!'))),
    /PSD file is invalid/
  );
  assert.throws(
    () => validateMasterFile(makeFile('master.pdf', 'application/pdf', Buffer.from('%PDF'))),
    /must be a valid PSD, PNG, JPG, or WebP/
  );
});

test('rejects PSD files, mismatched extensions, and invalid bytes as previews', () => {
  assert.throws(
    () => validatePreviewFile(makeFile('master.psd', 'application/octet-stream', Buffer.from('8BPSxxxx'))),
    /Preview must be a valid PNG, JPG, or WebP/
  );
  assert.throws(
    () => validatePreviewFile(makeFile('preview.jpg', 'image/jpeg', Buffer.from('not an image'))),
    /Preview must be a valid PNG, JPG, or WebP/
  );
  assert.throws(
    () => validatePreviewFile(makeFile('preview.png', 'image/jpeg', validPng().buffer)),
    /content type does not match/
  );
});
