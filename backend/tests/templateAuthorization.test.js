const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');
const jwt = require('jsonwebtoken');
const adminTemplateRoutes = require('../routes/adminTemplateRoutes');

test('template admin API rejects missing and customer tokens before reaching handlers', async () => {
  const secret = 'template-route-test-secret';
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = secret;
  const app = express();
  app.use('/api/admin/templates', adminTemplateRoutes);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/admin/templates`;
  try {
    const missing = await fetch(baseUrl);
    assert.equal(missing.status, 401);
    const customerToken = jwt.sign({ id: 'customer-1', type: 'customer' }, secret);
    const customer = await fetch(baseUrl, { headers: { Authorization: `Bearer ${customerToken}` } });
    assert.equal(customer.status, 401);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});