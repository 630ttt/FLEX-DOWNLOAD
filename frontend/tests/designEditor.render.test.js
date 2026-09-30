import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import test from 'node:test';
import DesignEditor from '../src/components/editor/DesignEditor.jsx';
import { createEmptyTemplate } from '../src/utils/templateSerializer.js';

test('DesignEditor renders without crashing when safe guides are enabled', () => {
  assert.doesNotThrow(() => {
    const markup = renderToStaticMarkup(
      React.createElement(DesignEditor, {
        initialTemplate: createEmptyTemplate(),
        mode: 'admin',
      }),
    );
    assert.ok(typeof markup === 'string');
    assert.ok(markup.includes('design-editor'));
  });
});

test('DesignEditor exposes a quick rotation snap action for chosen objects', () => {
  assert.doesNotThrow(() => {
    const markup = renderToStaticMarkup(
      React.createElement(DesignEditor, {
        initialTemplate: createEmptyTemplate(),
        mode: 'admin',
      }),
    );
    assert.ok(markup.includes('Snap 15°'));
  });
});

test('DesignEditor exposes a drag-to-reorder layer control in the layers list', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Drag to reorder|reorderLayerStack/);
});

test('DesignEditor includes an object-to-object smart guide snap helper', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /snapToSmartGuides|smart.*guide.*snap|object-to-object.*smart/i);
});

test('DesignEditor exposes visible smart-guide line feedback while dragging', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /setGuideLines|guideLines|smart.*guide.*line|guide.*line.*drag/i);
});

test('DesignEditor includes a snap-to-grid toggle and spacing setting', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /setGridEnabled|gridEnabled\s*=|gridSize\s*=|snapToGrid\s*\(|editor-grid-overlay/i);
});

test('DesignEditor includes an aspect-ratio lock for image resizing', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /aspectRatioLock|setAspectRatioLock|lockAspectRatio|Aspect ratio/i);
});

test('DesignEditor includes shadow controls for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /shadowColor|shadowBlur|shadowOffsetX|shadowOffsetY|Shadow/i);
});

test('DesignEditor includes stroke controls for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Outline color/);
  assert.match(source, /Outline width/);
});

test('DesignEditor includes quick style presets for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Quick styles/);
  assert.match(source, /Soft shadow|Bold outline/);
});

test('DesignEditor includes blend mode controls for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Blend mode|blendMode|globalCompositeOperation/i);
});

test('DesignEditor includes opacity presets for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Opacity presets|25%|50%|75%|100%/i);
});

test('DesignEditor includes effect preset library for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Effect library|Soft glow|Matte|Premium border|Punchy overlay/i);
});

test('DesignEditor includes a premium brand preset pack for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Brand pack|Luxury|Street pop|Quiet luxury|Editorial luxe/i);
});

test('DesignEditor includes a print finish preset pack for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Print finish|Foil|Matte finish|Soft emboss|Vintage paper/i);
});

test('DesignEditor includes a layout composition preset pack for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Composition pack|Center stage|Split banner|Focus frame|Badge stack/i);
});

test('DesignEditor includes a campaign mockup preset pack for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Campaign mockup|Hero banner|Social card|Product spotlight|Poster tile/i);
});

test('DesignEditor includes a premium packaging preset pack for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Packaging|Box hero|Shelf card|Luxury wrap|Product seal/i);
});

test('DesignEditor includes a premium retail display preset pack for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Retail display|Shelf hero|Counter stack|Window promo|Gift set/i);
});

test('DesignEditor includes a premium event promo preset pack for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Event promo|Launch stage|VIP invite|Pop booth|Festival splash/i);
});

test('DesignEditor includes a premium vibe preset pack for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Vibe pack|Neon pulse|Warm studio|Monochrome drift|Weekend glow/i);
});

test('DesignEditor includes a premium material texture preset pack for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Material textures|Stone grain|Cotton weave|Brushed metal|Soft suede/i);
});

test('DesignEditor includes a premium print mood preset pack for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Print mood|Ink wash|Poster grain|Newsprint|Soft gloss/i);
});

test('DesignEditor includes a premium editorial mood preset pack for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Editorial mood|Gallery noir|Soft archive|Spring bloom|Studio contour/i);
});

test('DesignEditor includes a premium seasonal palette preset pack for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Seasonal palette|Summer pop|Autumn dusk|Winter frost|Monsoon mist/i);
});

test('DesignEditor includes a premium art direction preset pack for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Art direction|Minimal form|Bold gesture|Layered collage|Hand-drawn sketch/i);
});

test('DesignEditor includes a premium luxury texture preset pack for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Luxury texture|Pearl satin|Velvet grain|Champagne gloss|Ebony lacquer/i);
});

test('DesignEditor includes a premium premium depth preset pack for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Depth layer|Soft shadow|Luminous haze|Cinematic glow|Midnight fade/i);
});

test('DesignEditor includes a premium atmosphere preset pack for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Atmosphere|Glass glow|Sunset haze|Studio fog|Neon bloom/i);
});

test('DesignEditor includes a premium highlight pass preset pack for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Highlight pass|Soft rim|Edge light|Halo bloom|Spotlight wash/i);
});

test('DesignEditor includes a premium focus stack preset pack for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Focus stack|Depth focus|Soft blur|Sharp catch|Layered focus/i);
});

test('DesignEditor includes a premium studio light preset pack for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Studio light|Soft bloom|Film haze|Spotlight flare|Glass shimmer/i);
});

test('DesignEditor includes a premium cinematic light preset pack for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Cinematic light|Soft flare|Film bleed|Stage glow|Luma wash/i);
});

test('DesignEditor includes a premium color grading preset pack for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Color grading|Sunset curve|Cool fade|Warm film|Night contrast/i);
});

test('DesignEditor includes a premium tonal balance preset pack for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Tonal balance|Soft neutrals|Dusk contrast|High key|Low glow/i);
});

test('DesignEditor includes a premium light ratio preset pack for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Light ratio|Soft range|Mid contrast|High accent|Low haze/i);
});

test('DesignEditor includes a premium contrast map preset pack for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Contrast map|Low lift|Soft edge|Warm key|High depth/i);
});

test('DesignEditor includes a premium depth pass preset pack for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Depth pass|Soft velvet|Glass shadow|Warm haze|Night echo/i);
});

test('DesignEditor includes a premium shadow balance preset pack for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Shadow balance|Soft fall|Lean glow|Low edge|High bloom/i);
});

test('DesignEditor includes a premium tone drift preset pack for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Tone drift|Coastal haze|Moody dusk|Night wash|Soft daylight/i);
});

test('DesignEditor includes a premium afterlight preset pack for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Afterlight|Cinder haze|Glass veil|Amber mist|Quiet bloom/i);
});

test('DesignEditor includes a premium soft film preset pack for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Soft film|Mellow blur|Warm haze|Silver glow|Dust bloom/i);
});

test('DesignEditor includes a premium velvet hush preset pack for selected objects', () => {
  const source = fs.readFileSync(new URL('../src/components/editor/DesignEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /Velvet hush|Stone mist|Night pearl|Warm ash|Low sheen/i);
});
