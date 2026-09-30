const test = require('node:test');
const assert = require('node:assert/strict');
const { buildDesignFilter } = require('../controllers/designController');

test('public design list hides PSD drafts but allows published templates and raster designs', () => {
  const filter = buildDesignFilter({ baseUrl: '/api/designs', query: { category: 'category-id' } });
  assert.equal(filter.isActive, true);
  assert.equal(filter.category, 'category-id');
  assert.deepEqual(filter.$or, [
    { 'template.type': { $ne: 'psd' } },
    { 'template.status': 'published' },
  ]);
});

test('admin design list includes active PSD drafts for layer configuration', () => {
  assert.deepEqual(
    buildDesignFilter({ baseUrl: '/api/admin', query: {} }),
    { isActive: true }
  );
});