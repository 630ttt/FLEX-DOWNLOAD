const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const agPsd = require('ag-psd');
const { importPsdTemplate } = require('../services/psdTemplateService');
const Design = require('../models/Design');

test('PSD design records do not require a category', () => {
  const design = new Design({
    title: 'PSD template',
    thumbnail: '/api/files/preview.png',
    fullImage: '/api/files/preview.png',
    sourceFile: '/api/files/master.psd',
    fileType: 'psd',
    template: { type: 'psd', status: 'draft', canvas: { width: 20, height: 10 }, layers: [] },
  });
  assert.equal(design.validateSync(), undefined);
});

test('raster design records continue requiring a category', () => {
  const design = new Design({
    title: 'Raster design',
    thumbnail: '/api/files/preview.png',
    fullImage: '/api/files/preview.png',
  });
  assert.ok(design.validateSync().errors.category);
});

test('imports PSD canvas, text style, layer metadata, and raster assets', async () => {
  const pixels = {
    width: 4,
    height: 3,
    data: new Uint8ClampedArray(4 * 3 * 4).fill(255),
  };
  const psdBuffer = Buffer.from(agPsd.writePsdBuffer({
    width: 4,
    height: 3,
    imageData: pixels,
    children: [{
      id: 17,
      name: 'Customer name',
      left: 1,
      top: 1,
      right: 3,
      bottom: 2,
      opacity: 0.75,
      hidden: true,
      imageData: { width: 2, height: 1, data: new Uint8ClampedArray(8).fill(255) },
      text: {
        text: 'Eeshitha',
        transform: [1, 0, 0, 1, 1, 1],
        style: {
          font: { name: 'Arial' },
          fontSize: 18,
          fauxBold: true,
          fillColor: { r: 20, g: 40, b: 60 },
        },
        paragraphStyle: { justification: 'center' },
      },
    }, {
      id: 18,
      name: 'Background',
      left: 0,
      top: 0,
      right: 4,
      bottom: 3,
      imageData: pixels,
    }, {
      id: 19,
      name: 'Company Logo',
      left: 0,
      top: 0,
      right: 2,
      bottom: 2,
      imageData: { width: 2, height: 2, data: new Uint8ClampedArray(16).fill(200) },
    }, {
      id: 20,
      name: 'Description Text',
      left: 0,
      top: 2,
      right: 4,
      bottom: 3,
      imageData: { width: 4, height: 1, data: new Uint8ClampedArray([20, 30, 40, 255, 20, 30, 40, 255, 20, 30, 40, 255, 20, 30, 40, 255]) },
    }],
  }));
  const storedAssets = [];
  const result = await importPsdTemplate(psdBuffer, {
    saveAsset: async (asset) => {
      storedAssets.push(asset);
      return `/api/files/${asset.originalname}`;
    },
  });

  assert.deepEqual(result.template.canvas, { width: 4, height: 3 });
  assert.equal(result.template.status, 'draft');
  const [layer] = result.template.layers;
  assert.equal(layer.type, 'text');
  assert.equal(layer.name, 'Customer name');
  assert.equal(layer.text, 'Eeshitha');
  assert.deepEqual({ x: layer.x, y: layer.y, width: layer.width, height: layer.height }, { x: 1, y: 1, width: 2, height: 1 });
  assert.ok(Math.abs(layer.opacity - 0.75) < 0.01);
  assert.equal(layer.visible, false);
  assert.equal(layer.editable, true);
  assert.equal(layer.textStyle.fontFamily, 'Arial');
  assert.equal(layer.textStyle.fontSize, 18);
  assert.equal(layer.textStyle.fontWeight, 700);
  assert.equal(layer.textStyle.textColor, '#14283c');
  assert.ok(layer.image.startsWith('/api/files/'));
  const [, background] = result.template.layers;
  assert.equal(background.type, 'background');
  assert.equal(background.editable, false);
  const [, , logo] = result.template.layers;
  assert.equal(logo.type, 'decorative');
  assert.equal(logo.editable, false);
  const rasterText = result.template.layers.find((candidate) => candidate.name === 'Description Text');
  assert.equal(rasterText.type, 'image');
  assert.equal(rasterText.editable, true);
  assert.equal(rasterText.editMode, 'text');
  assert.equal(rasterText.textStyle.textColor, '#102030');
  assert.equal(rasterText.textStyle.estimatedFromRaster, true);
  assert.equal(storedAssets.length, 4);
  const preview = await sharp(result.previewBuffer).metadata();
  assert.equal(preview.width, 4);
  assert.equal(preview.height, 3);
});

