import { FabricImage } from 'fabric';
import { resolveCatalogAssetUrl } from '../catalog/designElementCatalog';
import {
  createFramedImagePlaceholder,
  fitImageIntoFrameMask,
  syncFrameClipPath,
} from './frameMaskFactory';

const DEFAULT_ELEMENT_PERMISSIONS = {
  editable: false,
  movable: true,
  resizable: true,
  rotatable: true,
  deletable: true,
  replaceable: false,
};

const DEFAULT_FRAME_PERMISSIONS = {
  editable: true,
  movable: true,
  resizable: true,
  rotatable: true,
  deletable: true,
  replaceable: true,
};

export function centerObjectOnCanvas(canvas, object, { jitter = 0 } = {}) {
  if (!canvas || !object) return;
  const w = object.getScaledWidth();
  const h = object.getScaledHeight();
  const spread = jitter > 0 ? (Math.random() - 0.5) * jitter : 0;
  object.set({
    originX: 'left',
    originY: 'top',
    left: (canvas.getWidth() - w) / 2 + spread,
    top: (canvas.getHeight() - h) / 2 + spread,
  });
  if (object.editorType === 'framed-image') {
    object.frameLeft = object.left;
    object.frameTop = object.top;
    syncFrameClipPath(object);
  }
  object.setCoords();
}

export function syncLinkedFrameBorder(canvas, framedImage) {
  if (!canvas || !framedImage?.id) return;
  const border = canvas.getObjects().find(
    (item) => item.editorType === 'frame-border' && item.linkedFrameId === framedImage.id,
  );
  if (!border) return;
  const fw = framedImage.frameWidth || framedImage.getScaledWidth();
  const fh = framedImage.frameHeight || framedImage.getScaledHeight();
  const left = framedImage.frameLeft ?? framedImage.left ?? 0;
  const top = framedImage.frameTop ?? framedImage.top ?? 0;
  border.set({
    left,
    top,
    angle: framedImage.angle || 0,
    scaleX: fw / (border.width || 1),
    scaleY: fh / (border.height || 1),
    flipX: framedImage.flipX || false,
    flipY: framedImage.flipY || false,
  });
  border.setCoords();
}

export async function insertCatalogElement({
  canvas,
  asset,
  createId,
  resolveImageUrl,
  maxSize = 220,
}) {
  const url = await resolveCatalogAssetUrl(asset);
  const graphic = await FabricImage.fromURL(resolveImageUrl(url), { crossOrigin: 'anonymous' });
  const source = graphic.getElement();
  const sourceWidth = source?.naturalWidth || graphic.width || 1;
  const sourceHeight = source?.naturalHeight || graphic.height || 1;
  const scale = Math.min(maxSize / sourceWidth, maxSize / sourceHeight, 1);
  graphic.set({
    id: createId('decor'),
    name: asset.name,
    editorType: 'decoration',
    catalogId: asset.id,
    decorationId: asset.id,
    templateSrc: url,
    locked: false,
    editable: false,
    replaceable: false,
    recolorable: asset.recolorable !== false,
    objectCaching: false,
    scaleX: scale,
    scaleY: scale,
    permissions: { ...DEFAULT_ELEMENT_PERMISSIONS },
  });
  centerObjectOnCanvas(canvas, graphic, { jitter: 48 });
  canvas.add(graphic);
  canvas.setActiveObject(graphic);
  canvas.bringObjectToFront(graphic);
  return graphic;
}

export async function insertCatalogFrame({
  canvas,
  asset,
  createId,
  resolveImageUrl,
}) {
  const fw = asset.width || 280;
  const fh = asset.height || 280;
  const left = (canvas.getWidth() - fw) / 2;
  const top = (canvas.getHeight() - fh) / 2;
  let borderSource = '';
  if (asset.type === 'frame-border') {
    borderSource = await resolveCatalogAssetUrl(asset);
  }
  const framed = await createFramedImagePlaceholder({
    frameShapeId: asset.maskShape || 'rect',
    frameWidth: fw,
    frameHeight: fh,
    left,
    top,
    borderSource,
    resolveUrl: resolveImageUrl,
  });
  framed.set({
    id: createId('frame'),
    name: asset.name,
    catalogId: asset.id,
    permissions: { ...DEFAULT_FRAME_PERMISSIONS },
  });
  canvas.add(framed);
  if (borderSource) {
    const border = await FabricImage.fromURL(resolveImageUrl(borderSource), { crossOrigin: 'anonymous' });
    border.set({
      id: createId('frame-border'),
      name: `${asset.name} border`,
      editorType: 'frame-border',
      linkedFrameId: framed.id,
      catalogId: asset.id,
      templateSrc: borderSource,
      left,
      top,
      originX: 'left',
      originY: 'top',
      scaleX: fw / (border.width || 1),
      scaleY: fh / (border.height || 1),
      selectable: false,
      evented: false,
      objectCaching: false,
    });
    canvas.add(border);
    canvas.bringObjectToFront(border);
  }
  canvas.setActiveObject(framed);
  canvas.bringObjectToFront(framed);
  if (borderSource) {
    const border = canvas.getObjects().find((o) => o.linkedFrameId === framed.id);
    if (border) canvas.bringObjectToFront(border);
  }
  return framed;
}

export async function fillFramedImageFromSource(framedImage, source, resolveImageUrl) {
  const replacement = await FabricImage.fromURL(resolveImageUrl(source), { crossOrigin: 'anonymous' });
  const frameWidth = framedImage.frameWidth || framedImage.getScaledWidth();
  const frameHeight = framedImage.frameHeight || framedImage.getScaledHeight();
  const frameLeft = framedImage.frameLeft ?? framedImage.left ?? 0;
  const frameTop = framedImage.frameTop ?? framedImage.top ?? 0;
  replacement.set({
    id: framedImage.id,
    name: framedImage.name,
    editorType: 'framed-image',
    frameShapeId: framedImage.frameShapeId,
    catalogId: framedImage.catalogId,
    borderSource: framedImage.borderSource,
    templateSrc: source,
    replaceable: true,
    isPlaceholder: false,
    permissions: framedImage.permissions,
    frameWidth,
    frameHeight,
    frameLeft,
    frameTop,
    angle: framedImage.angle,
    flipX: framedImage.flipX,
    flipY: framedImage.flipY,
    cropZoom: framedImage.cropZoom || 1,
    objectPosition: framedImage.objectPosition || { x: 0.5, y: 0.5 },
    objectCaching: false,
  });
  fitImageIntoFrameMask(replacement, {
    zoom: replacement.cropZoom,
    position: replacement.objectPosition,
  });
  return replacement;
}
