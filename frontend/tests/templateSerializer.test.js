import test from 'node:test';
import assert from 'node:assert/strict';
import { deserializeTemplate, duplicateTemplate, getElementPermissionOptions, normalizeTemplate, serializeCanvas, validateTemplate } from '../src/utils/templateSerializer.js';

test('normalizes legacy phase-one objects into versioned logical canvas coordinates', () => {
  const template = normalizeTemplate({
    width: 1600,
    height: 600,
    background: { color: '#ffffff' },
    objects: [{ id: 'title', type: 'text', position: { x: 800, y: 200 }, dimensions: { width: 400, height: 80 }, text: 'Happy birthday' }],
  });
  assert.equal(template.version, 1);
  assert.deepEqual(template.canvas, { width: 1600, height: 600, backgroundColor: '#ffffff' });
  assert.equal(template.elements[0].x, 800);
  assert.equal(template.elements[0].y, 200);
  assert.deepEqual(template.elements[0].permissions, {
    editable: true, movable: true, resizable: true, rotatable: true, replaceable: false, deletable: true,
  });
});

test('validates template element count and normalizes placeholder permissions', () => {
  const template = normalizeTemplate({
    canvas: { width: 1600, height: 600 },
    elements: [{ id: 'photo', type: 'image', x: 100, y: 50, width: 400, height: 400, replaceable: true, src: '/api/files/abc' }],
  });
  assert.equal(validateTemplate(template).valid, true);
  assert.equal(template.elements[0].permissions.replaceable, true);
  assert.equal(validateTemplate({ elements: Array.from({ length: 501 }, () => ({ type: 'text' })) }).valid, false);
});

test('duplicate template generates a new template and unique element ids', () => {
  const original = normalizeTemplate({ name: 'Birthday', elements: [{ id: 'title', type: 'text', text: 'Hello' }] });
  const copy = duplicateTemplate(original);
  assert.equal(copy.name, 'Birthday - Copy');
  assert.notEqual(copy.id, original.id);
  assert.notEqual(copy.elements[0].id, original.elements[0].id);
  assert.equal(copy.elements[0].text, original.elements[0].text);
});

test('serializes Fabric-like objects into ordered app-owned elements', () => {
  const objects = [
    {
      id: 'title', name: 'Title', editorType: 'text', type: 'textbox', left: 800, top: 200, angle: 0,
      width: 500, height: 100, opacity: 1, visible: true, locked: false, editable: true,
      fontFamily: 'Impact', fontSize: 60, baseFontSize: 60, fontWeight: '700', fontStyle: 'italic', underline: true, fill: '#ffffff', text: 'Happy Birthday', textAlign: 'justify', lineHeight: 1.4, charSpacing: 3,
      permissions: { editable: true, movable: false, resizable: true, rotatable: true, deletable: false },
      getScaledWidth: () => 500, getScaledHeight: () => 100,
    },
    {
      id: 'photo', name: 'Photo', editorType: 'image', type: 'image', left: 1000, top: 80, angle: 0,
      width: 400, height: 400, scaleX: 1, scaleY: 1, cropX: 10, cropY: 20, cropZoom: 1.5,
      opacity: 1, visible: true, locked: false, editable: true, replaceable: true,
      templateSrc: '/api/files/0123456789abcdef01234567',
      source: 'ai-generated', prompt: 'A floral bakery illustration', imageRole: 'background',
      getSrc: () => 'http://localhost:5000/api/files/0123456789abcdef01234567', getScaledWidth: () => 400, getScaledHeight: () => 400,
    },
  ];
  const canvas = {
    backgroundColor: '#ffffff', backgroundImage: { templateSrc: '/api/files/abcdefabcdefabcdefabcdef', getSrc: () => 'http://localhost:5000/api/files/abcdefabcdefabcdefabcdef', scaleX: 1, scaleY: 1 },
    getWidth: () => 1600, getHeight: () => 600, getObjects: () => objects,
  };
  const serialized = serializeCanvas(canvas, { id: 'template-001', name: 'Birthday' });
  assert.equal(serialized.canvas.width, 1600);
  assert.deepEqual(serialized.elements.map((element) => element.id), ['title', 'photo']);
  assert.equal(serialized.elements[0].x, 800);
  assert.equal(serialized.elements[0].text, 'Happy Birthday');
  assert.equal(serialized.elements[0].fontFamily, 'Impact');
  assert.equal(serialized.elements[0].fontWeight, '700');
  assert.equal(serialized.elements[0].fontStyle, 'italic');
  assert.equal(serialized.elements[0].underline, true);
  assert.equal(serialized.elements[0].textAlign, 'justify');
  assert.equal(serialized.elements[0].lineHeight, 1.4);
  assert.equal(serialized.elements[0].letterSpacing, 3);
  assert.equal(serialized.elements[0].movable, false);
  assert.equal(serialized.elements[0].permissions.deletable, false);
  assert.equal(serialized.elements[1].cropZoom, 1.5);
  assert.equal(serialized.elements[1].replaceable, true);
  assert.equal(serialized.elements[1].src, '/api/files/0123456789abcdef01234567');
  assert.equal(serialized.elements[1].source, 'ai-generated');
  assert.equal(serialized.elements[1].prompt, 'A floral bakery illustration');
  assert.equal(serialized.elements[1].imageRole, 'background');
  assert.equal(serialized.background.src, '/api/files/abcdefabcdefabcdefabcdef');
});

test('deserializes canvas dimensions and basic shape elements', async () => {
  const objects = [];
  const canvas = {
    backgroundColor: '',
    clear() { objects.length = 0; },
    setDimensions({ width, height }) { this.width = width; this.height = height; },
    add(object) { objects.push(object); },
    getObjects: () => objects,
    discardActiveObject() {},
    requestRenderAll() {},
  };
  const template = await deserializeTemplate({
    version: 1,
    canvas: { width: 1600, height: 600, backgroundColor: '#fff' },
    background: { type: 'color', color: '#fff' },
    elements: [{ id: 'frame', type: 'rectangle', x: 50, y: 40, width: 220, height: 100, rotation: 0, opacity: 1, visible: true, locked: true, editable: false, fill: '#eee' }],
  }, canvas);
  assert.equal(canvas.width, 1600);
  assert.equal(canvas.height, 600);
  assert.equal(template.elements[0].id, 'frame');
  assert.equal(objects[0].locked, true);
  assert.equal(objects[0].selectable, false);
});

test('customer permissions allow only explicitly permitted Fabric operations', () => {
  const options = getElementPermissionOptions({
    id: 'customer-name', type: 'text', x: 20, y: 30, rotation: 0, opacity: 1,
    visible: true, locked: false, editable: true,
    permissions: { editable: false, movable: true, resizable: false, rotatable: false, deletable: false },
  }, true);
  assert.equal(options.editable, false);
  assert.equal(options.selectable, true);
  assert.equal(options.lockMovementX, false);
  assert.equal(options.lockScalingX, true);
  assert.equal(options.lockRotation, true);
  assert.equal(options.locked, false);
  const locked = getElementPermissionOptions({ id: 'logo', type: 'image', locked: true, permissions: { editable: true, movable: true, resizable: true, rotatable: true } }, true);
  assert.equal(locked.selectable, false);
  assert.equal(locked.evented, false);
});