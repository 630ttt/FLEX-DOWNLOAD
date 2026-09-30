const test = require('node:test');
const assert = require('node:assert/strict');
const { interpretEdits, validateValues } = require('../services/ai/editService');

test('mock provider returns structured text and color edits from instructions', async () => {
  const result = await interpretEdits({
    instructions: 'Change the name to Yamini Flex, change the description to Premium Flex Printing, add a 20% discount and make the background blue.',
    values: { phone: '7801016470' },
  });

  assert.equal(result.provider, 'mock');
  assert.equal(result.edits.name, 'Yamini Flex');
  assert.equal(result.edits.description, 'Premium Flex Printing');
  assert.equal(result.edits.offer, '20% off');
  assert.equal(result.edits.colors.background, '#2563eb');
  assert.equal(result.edits.phone, '7801016470');
});

test('submitted values reject invalid colors, phone characters, and oversized text', () => {
  assert.throws(() => validateValues({ colors: { background: 'blue' } }), /Invalid background color/);
  assert.throws(() => validateValues({ phone: 'call me' }), /Phone number contains unsupported characters/);
  assert.throws(() => validateValues({ description: 'x'.repeat(241) }), /description is too long/);
});

test('instructions are length-limited and provider output fields are constrained', async () => {
  await assert.rejects(
    interpretEdits({ instructions: 'x'.repeat(1201), values: {} }),
    /1200 characters or fewer/
  );
  assert.deepEqual(validateValues({ unknown: 'ignored' }), {});
});
