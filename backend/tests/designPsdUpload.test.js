const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePsdUploadPair } = require('../controllers/designController');

const psd = { originalname: 'poster.psd', buffer: Buffer.from('8BPSdocument') };
const png = {
  originalname: 'poster-preview.png',
  mimetype: 'image/png',
  buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]),
};

const makeRequest = (files) => ({ files: Object.fromEntries(Object.entries(files).map(([field, file]) => [field, file ? [file] : []])) });

test('PSD upload requires a separate JPG or PNG preview', () => {
  assert.throws(
    () => validatePsdUploadPair(makeRequest({ designFile: psd }), psd),
    /both a PSD template file and its JPG\/PNG preview/
  );
  assert.throws(
    () => validatePsdUploadPair(makeRequest({ designFile: psd, previewImage: { ...png, originalname: 'preview.webp', mimetype: 'image/webp' } }), psd),
    /requires a JPG or PNG preview/
  );
  assert.doesNotThrow(() => validatePsdUploadPair(makeRequest({ designFile: psd, previewImage: png }), psd));
});
