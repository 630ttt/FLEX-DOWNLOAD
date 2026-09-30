import { Circle, FabricImage, Path, Rect } from 'fabric';

const PLACEHOLDER_SVG = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="#e8ece9"/></svg>',
)}`;

export const FRAME_MASK_LIBRARY = [
  { id: 'mask-circle', name: 'Circle', category: 'frames-basic', maskShape: 'circle', tags: ['circle', 'round', 'basic'], width: 260, height: 260, premium: false },
  { id: 'mask-oval', name: 'Oval', category: 'frames-basic', maskShape: 'oval', tags: ['oval', 'ellipse', 'basic'], width: 300, height: 220, premium: false },
  { id: 'mask-rectangle', name: 'Rectangle', category: 'frames-basic', maskShape: 'rect', tags: ['rectangle', 'box', 'basic'], width: 300, height: 220, premium: false },
  { id: 'mask-rounded', name: 'Rounded rectangle', category: 'frames-basic', maskShape: 'rounded', tags: ['rounded', 'soft', 'basic'], width: 300, height: 220, premium: false },
  { id: 'mask-square', name: 'Square', category: 'frames-basic', maskShape: 'square', tags: ['square', 'basic'], width: 240, height: 240, premium: false },
  { id: 'mask-heart', name: 'Heart', category: 'frames-creative', maskShape: 'heart', tags: ['heart', 'love', 'creative'], width: 260, height: 240, premium: false },
  { id: 'mask-star', name: 'Star', category: 'frames-creative', maskShape: 'star', tags: ['star', 'creative'], width: 260, height: 260, premium: false },
  { id: 'mask-flower', name: 'Flower', category: 'frames-creative', maskShape: 'flower', tags: ['flower', 'creative'], width: 260, height: 260, premium: false },
  { id: 'mask-arch', name: 'Arch', category: 'frames-creative', maskShape: 'arch', tags: ['arch', 'creative'], width: 260, height: 320, premium: false },
  { id: 'mask-polaroid', name: 'Polaroid', category: 'frames-creative', maskShape: 'polaroid', tags: ['polaroid', 'photo', 'creative'], width: 280, height: 320, premium: false },
  { id: 'mask-wedding-oval', name: 'Wedding oval', category: 'frames-wedding', maskShape: 'oval', tags: ['wedding', 'gold', 'oval'], width: 280, height: 340, premium: false },
  { id: 'mask-festival-star', name: 'Festival star', category: 'frames-festival', maskShape: 'star', tags: ['festival', 'star'], width: 280, height: 280, premium: false },
  { id: 'mask-traditional-arch', name: 'Traditional arch', category: 'frames-traditional', maskShape: 'arch', tags: ['traditional', 'indian', 'arch'], width: 280, height: 360, premium: false },
  { id: 'mask-mandala-circle', name: 'Mandala circle', category: 'frames-mandala', maskShape: 'circle', tags: ['mandala', 'circle'], width: 300, height: 300, premium: false },
];

export function buildClipPath(maskShape, width, height) {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  switch (maskShape) {
    case 'circle':
    case 'square': {
      const radius = Math.min(w, h) / 2;
      return new Circle({ radius, originX: 'center', originY: 'center', left: 0, top: 0 });
    }
    case 'oval': {
      return new EllipseCompat(w / 2, h / 2);
    }
    case 'rect':
      return new Rect({ width: w, height: h, originX: 'center', originY: 'center', left: 0, top: 0 });
    case 'rounded':
      return new Rect({ width: w, height: h, rx: Math.min(28, w * 0.12), ry: Math.min(28, h * 0.12), originX: 'center', originY: 'center', left: 0, top: 0 });
    case 'heart':
      return new Path('M 0 -0.42 C -0.22 -0.78 -0.55 -0.55 -0.55 -0.18 C -0.55 0.12 -0.28 0.38 0 0.62 C 0.28 0.38 0.55 0.12 0.55 -0.18 C 0.55 -0.55 0.22 -0.78 0 -0.42 Z', {
        originX: 'center',
        originY: 'center',
        scaleX: w * 0.9,
        scaleY: h * 0.9,
      });
    case 'star':
      return new Path('M 0 -0.5 L 0.12 -0.15 L 0.48 -0.15 L 0.2 0.08 L 0.32 0.45 L 0 0.22 L -0.32 0.45 L -0.2 0.08 L -0.48 -0.15 L -0.12 -0.15 Z', {
        originX: 'center',
        originY: 'center',
        scaleX: w,
        scaleY: h,
      });
    case 'flower':
      return new Circle({ radius: Math.min(w, h) / 2, originX: 'center', originY: 'center' });
    case 'arch':
      return new Path(`M ${-w / 2} ${h / 2} L ${-w / 2} ${h * 0.1} Q 0 ${-h * 0.55} ${w / 2} ${h * 0.1} L ${w / 2} ${h / 2} Z`, {
        originX: 'center',
        originY: 'center',
      });
    case 'polaroid': {
      const innerW = w * 0.88;
      const innerH = h * 0.72;
      return new Rect({ width: innerW, height: innerH, originX: 'center', originY: 'center', top: -h * 0.06, left: 0 });
    }
    default:
      return new Rect({ width: w, height: h, originX: 'center', originY: 'center', left: 0, top: 0 });
  }
}

function EllipseCompat(rx, ry) {
  return new Path(`M ${-rx} 0 A ${rx} ${ry} 0 1 0 ${rx} 0 A ${rx} ${ry} 0 1 0 ${-rx} 0`, {
    originX: 'center',
    originY: 'center',
    left: 0,
    top: 0,
  });
}

export function syncFrameClipPath(image) {
  if (!image || image.editorType !== 'framed-image') return;
  const w = image.frameWidth || image.getScaledWidth();
  const h = image.frameHeight || image.getScaledHeight();
  const clip = buildClipPath(image.frameShapeId || 'rect', w, h);
  clip.absolutePositioned = false;
  image.clipPath = clip;
  image.objectCaching = false;
}

export async function createFramedImagePlaceholder({
  frameShapeId = 'rect',
  frameWidth = 280,
  frameHeight = 280,
  left = 0,
  top = 0,
  borderSource = '',
  resolveUrl = (src) => src,
}) {
  const image = await FabricImage.fromURL(resolveUrl(PLACEHOLDER_SVG), { crossOrigin: 'anonymous' });
  image.set({
    left,
    top,
    originX: 'left',
    originY: 'top',
    frameShapeId,
    frameWidth,
    frameHeight,
    frameLeft: left,
    frameTop: top,
    editorType: 'framed-image',
    templateSrc: '',
    replaceable: true,
    isPlaceholder: true,
    cropZoom: 1,
    objectPosition: { x: 0.5, y: 0.5 },
    objectCaching: false,
    borderSource,
  });
  syncFrameClipPath(image);
  image.set({
    scaleX: frameWidth / (image.width || 1),
    scaleY: frameHeight / (image.height || 1),
  });
  return image;
}

export function fitImageIntoFrameMask(image, { zoom = 1, position = { x: 0.5, y: 0.5 } } = {}) {
  const source = image.getElement();
  const sourceWidth = source?.naturalWidth || image.width || 1;
  const sourceHeight = source?.naturalHeight || image.height || 1;
  const frameWidth = Math.max(1, image.frameWidth || image.getScaledWidth());
  const frameHeight = Math.max(1, image.frameHeight || image.getScaledHeight());
  const frameLeft = image.frameLeft ?? image.left ?? 0;
  const frameTop = image.frameTop ?? image.top ?? 0;
  const frameRatio = frameWidth / frameHeight;
  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;
  if (sourceWidth / sourceHeight > frameRatio) cropWidth = sourceHeight * frameRatio;
  else cropHeight = sourceWidth / frameRatio;
  cropWidth /= zoom;
  cropHeight /= zoom;
  const cropX = Math.max(0, (sourceWidth - cropWidth) * position.x);
  const cropY = Math.max(0, (sourceHeight - cropHeight) * position.y);
  const scale = frameWidth / cropWidth;
  const displayWidth = cropWidth * scale;
  const displayHeight = cropHeight * scale;
  image.set({
    originX: 'left',
    originY: 'top',
    left: frameLeft + (frameWidth - displayWidth) / 2,
    top: frameTop + (frameHeight - displayHeight) / 2,
    width: cropWidth,
    height: cropHeight,
    cropX,
    cropY,
    scaleX: scale,
    scaleY: scale,
    frameWidth,
    frameHeight,
    frameLeft,
    frameTop,
    cropZoom: zoom,
    objectPosition: position,
    objectCaching: false,
  });
  syncFrameClipPath(image);
  image.setCoords();
}
