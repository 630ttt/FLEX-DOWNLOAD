import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPsdEditPayload, findFirstEditablePsdLayer, isEditablePsdLayer, shouldUseTextEditingForPsdLayer } from '../src/utils/psdCustomization.js';

test('editable PSD layers include image layers even when they were uploaded later', () => {
  assert.equal(isEditablePsdLayer({ id: 'photo', type: 'image', editable: true }, {}), true);
  assert.equal(isEditablePsdLayer({ id: 'photo', type: 'image', editable: true, image: null }, { photo: new File(['x'], 'photo.png', { type: 'image/png' }) }), true);
  assert.equal(isEditablePsdLayer({ id: 'title', type: 'text', editable: true }, {}), true);
  assert.equal(isEditablePsdLayer({ id: 'background', type: 'image', editable: false }, {}), false);
});

test('PSD customization payload preserves text, image, and adjustment edits together', () => {
  const payload = buildPsdEditPayload({
    textValues: { title: 'Yamini Flex' },
    imageFiles: { photo: new File(['x'], 'photo.png', { type: 'image/png' }) },
    imageAdjustments: { photo: { zoom: 1.5, offsetX: 0.2 } },
    textStyles: { title: { fontFamily: 'Arial', fontSize: 42 } },
  });

  assert.deepEqual(payload.textValues, { title: 'Yamini Flex' });
  assert.deepEqual(payload.imageFiles, { photo: { fileName: 'photo.png', mimeType: 'image/png' } });
  assert.deepEqual(payload.imageAdjustments, { photo: { zoom: 1.5, offsetX: 0.2 } });
  assert.deepEqual(payload.textStyles, { title: { fontFamily: 'Arial', fontSize: 42 } });
});

test('OCR-backed text values switch image layers into text editing mode', () => {
  assert.equal(shouldUseTextEditingForPsdLayer({ id: 'label', type: 'image', editable: true }, { label: 'Yamini Flex' }), true);
  assert.equal(shouldUseTextEditingForPsdLayer({ id: 'label', type: 'image', editable: true }, {}), false);
  assert.equal(shouldUseTextEditingForPsdLayer({ id: 'title', type: 'text', editable: true }, {}), true);
});

test('first editable PSD layer is selected automatically when the editor opens', () => {
  const layers = [
    { id: 'background', type: 'image', editable: false },
    { id: 'photo', type: 'image', editable: true },
    { id: 'title', type: 'text', editable: true },
  ];

  assert.equal(findFirstEditablePsdLayer(layers).id, 'photo');
});
