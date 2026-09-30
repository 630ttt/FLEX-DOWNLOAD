const test = require('node:test');
const assert = require('node:assert/strict');
const customerController = require('../controllers/customerController');

test('admin customer controller should expose update and delete handlers', () => {
  assert.equal(typeof customerController.updateCustomerByAdmin, 'function');
  assert.equal(typeof customerController.deleteCustomerByAdmin, 'function');
});
