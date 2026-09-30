const test = require('node:test');
const assert = require('node:assert/strict');
const rejectPsdCustomerUploads = require('../middleware/rejectPsdCustomerUploads');

const invoke = (files) => {
  const response = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  let continued = false;
  rejectPsdCustomerUploads({ files }, response, () => { continued = true; });
  return { response, continued };
};

test('rejects PSD customer uploads by extension and file signature', () => {
  for (const file of [
    { originalname: 'template.psd', buffer: Buffer.from('not a PSD') },
    { originalname: 'renamed.jpg', buffer: Buffer.from('8BPSdocument') },
  ]) {
    const { response, continued } = invoke([file]);
    assert.equal(response.statusCode, 400);
    assert.match(response.body.message, /administrator design management/);
    assert.equal(continued, false);
  }
});

test('allows ordinary customer artwork uploads', () => {
  const { response, continued } = invoke([
    { originalname: 'customer.png', buffer: Buffer.from([137, 80, 78, 71]) },
  ]);
  assert.equal(response.statusCode, 200);
  assert.equal(continued, true);
});