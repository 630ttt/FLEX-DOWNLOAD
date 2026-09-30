const test = require('node:test');
const assert = require('node:assert/strict');
const { duplicateTemplateJson, parseTemplateJson } = require('../services/templateService');

const sampleTemplate = (elements = []) => ({
  version: 1,
  id: 'template-1',
  name: 'Birthday Banner',
  canvas: { width: 1600, height: 600, backgroundColor: '#ffffff' },
  background: { type: 'color', color: '#ffffff' },
  elements,
});

test('accepts structured Template JSON and preserves logical coordinates and order', () => {
  const parsed = parseTemplateJson(sampleTemplate([
    { id: 'title', type: 'text', x: 800, y: 200, width: 500, height: 100, rotation: 0, opacity: 1, visible: true, locked: false, editable: true, text: 'Happy Birthday' },
    { id: 'photo', type: 'image', x: 1000, y: 80, width: 400, height: 400, rotation: 0, opacity: 1, visible: true, locked: false, editable: true, replaceable: true },
  ]));
  assert.equal(parsed.canvas.width, 1600);
  assert.equal(parsed.elements[0].x, 800);
  assert.equal(parsed.elements[1].replaceable, true);
});

test('rejects duplicate IDs, external image URLs, invalid dimensions and non-replaceable empty images', () => {
  assert.throws(() => parseTemplateJson(sampleTemplate([
    { id: 'same', type: 'text', x: 0, y: 0, width: 10, height: 10, text: 'A' },
    { id: 'same', type: 'text', x: 0, y: 0, width: 10, height: 10, text: 'B' },
  ])), /unique/);
  assert.throws(() => parseTemplateJson(sampleTemplate([
    { id: 'remote', type: 'image', x: 0, y: 0, width: 10, height: 10, src: 'https://example.test/photo.png' },
  ])), /file store/);
  assert.throws(() => parseTemplateJson(sampleTemplate([
    { id: 'spoofed', type: 'image', x: 0, y: 0, width: 10, height: 10, src: 'https://example.test/api/files/0123456789abcdef01234567' },
  ])), /file store/);
  assert.throws(() => parseTemplateJson(sampleTemplate([
    { id: 'bad', type: 'text', x: 0, y: 0, width: -2, height: 10, text: 'No' },
  ])), /width/);
  assert.throws(() => parseTemplateJson(sampleTemplate([
    { id: 'empty', type: 'image', x: 0, y: 0, width: 10, height: 10 },
  ])), /replaceable/);
});

test('template duplication assigns a new template ID and fresh IDs to nested elements', () => {
  const original = sampleTemplate([{ id: 'group', type: 'group', x: 0, y: 0, width: 100, height: 100, elements: [{ id: 'inner', type: 'text', x: 0, y: 0, width: 20, height: 20, text: 'Hi' }] }]);
  const duplicate = duplicateTemplateJson(original);
  assert.notEqual(duplicate.id, original.id);
  assert.notEqual(duplicate.elements[0].id, original.elements[0].id);
  assert.notEqual(duplicate.elements[0].elements[0].id, original.elements[0].elements[0].id);
  assert.equal(duplicate.status, undefined);
});