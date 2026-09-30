import { Circle, FabricImage, Line, Rect, Textbox } from 'fabric';
import { PREMIUM_FONT_FAMILIES } from '../catalog/premiumFonts';

const ELEMENT_TYPES = new Set(['text', 'image', 'decoration', 'framed-image', 'frame-border', 'rectangle', 'circle', 'line', 'shape', 'group']);

const BASE_FONT_FAMILIES = ['Arial', 'Arial Black', 'Calibri', 'Cambria', 'Comic Sans MS', 'Consolas', 'Courier New', 'Georgia', 'Impact', 'Lucida Sans', 'Palatino Linotype', 'Segoe UI', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana'];
export const FONT_FAMILIES = [...new Set([...BASE_FONT_FAMILIES, ...PREMIUM_FONT_FAMILIES])];
const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
const normalizeFontFamily = (value) => FONT_FAMILIES.find((font) => font.toLowerCase() === String(value || '').toLowerCase()) || String(value || 'Arial');
const normalizeFontWeight = (value) => {
  const weight = String(value || '400').toLowerCase();
  if (weight === 'normal' || weight === '400') return '400';
  if (weight === 'bold' || weight === '700') return '700';
  return ['500', '600'].includes(weight) ? weight : '400';
};
export const createId = (prefix = 'element') => globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const createEmptyTemplate = ({ id = createId('template'), name = 'Untitled template', width = 1200, height = 800, backgroundColor = '#f4f3ee' } = {}) => ({
  version: 1,
  id,
  name,
  description: '',
  canvas: { width, height, backgroundColor },
  background: { type: 'color', color: backgroundColor },
  elements: [],
});

export const applyTextOverflow = (object, overflow = 'wrap', frameHeight = object.height) => {
  object.overflow = overflow;
  object.frameWidth = Math.max(1, Number(object.frameWidth ?? object.width) || 300);
  object.set('width', object.frameWidth);
  object.frameHeight = Math.max(1, Number(frameHeight) || object.height || 80);
  object.baseFontSize = Math.max(1, Number(object.baseFontSize || object.fontSize) || 48);
  object.set('fontSize', object.baseFontSize);
  object.clipPath = null;
  object.initDimensions?.();
  if (overflow === 'wrap') {
    object.frameHeight = Math.max(object.frameHeight, object.height || 0);
  } else if (overflow === 'shrink') {
    while (object.height > object.frameHeight && object.fontSize > 8) {
      object.set('fontSize', object.fontSize - 1);
      object.initDimensions?.();
    }
  } else if (overflow === 'clip') {
    object.clipPath = new Rect({ width: object.width, height: object.frameHeight, originX: 'center', originY: 'center' });
  }
  object.setCoords?.();
  return object;
};

const permissionDefaults = (element) => ({
  editable: element.permissions?.editable ?? (element.editable !== false),
  movable: element.permissions?.movable ?? (element.movable !== false),
  resizable: element.permissions?.resizable ?? (element.resizable !== false),
  rotatable: element.permissions?.rotatable ?? (element.rotatable !== false),
  replaceable: element.type === 'image' && (element.permissions?.replaceable ?? element.replaceable === true),
  deletable: element.permissions?.deletable ?? (element.deletable !== false),
});

const migrateLegacyElement = (element) => ({
  ...element,
  x: element.x ?? element.position?.x ?? 0,
  y: element.y ?? element.position?.y ?? 0,
  width: element.width ?? element.dimensions?.width ?? 240,
  height: element.height ?? element.dimensions?.height ?? 80,
  rotation: element.rotation ?? 0,
  opacity: element.opacity ?? 1,
  fontWeight: element.fontWeight ?? '400',
  fontStyle: element.fontStyle ?? 'normal',
  color: element.color ?? '#17212b',
  textAlign: element.textAlign ?? 'left',
  crop: element.crop ?? { x: 0, y: 0, width: 0, height: 0 },
  scale: element.scale ?? { x: 1, y: 1 },
});

export const normalizeTemplate = (input = {}) => {
  const legacy = !input.canvas && (input.width || input.objects);
  const sourceElements = input.elements || input.objects || [];
  const seen = new Set();
  const elements = sourceElements.map((rawElement) => {
    const element = migrateLegacyElement(rawElement || {});
    const type = ELEMENT_TYPES.has(element.type) ? element.type : 'text';
    const permissions = permissionDefaults({ ...element, type });
    let id = String(element.id || createId(type));
    if (seen.has(id)) id = createId(type);
    seen.add(id);
    const normalized = {
      id,
      type,
      name: String(element.name || (type === 'text' ? 'Text' : type === 'image' ? 'Image' : type)).slice(0, 100),
      x: clamp(element.x, -12000, 12000),
      y: clamp(element.y, -12000, 12000),
      width: clamp(element.width, 1, 12000),
      height: clamp(element.height, 1, 12000),
      rotation: clamp(element.rotation, -3600, 3600),
      opacity: clamp(element.opacity ?? 1, 0, 1),
      visible: element.visible !== false,
      locked: element.locked === true,
      editable: element.editable !== false && permissions.editable,
      movable: permissions.movable,
      resizable: permissions.resizable,
      rotatable: permissions.rotatable,
      deletable: permissions.deletable,
      permissions,
    };
    if (type === 'text') Object.assign(normalized, {
      text: String(element.text || ''),
      fontFamily: normalizeFontFamily(element.fontFamily),
      fontSize: clamp(element.fontSize || 48, 1, 1000),
      baseFontSize: clamp(element.baseFontSize || element.fontSize || 48, 1, 1000),
      fontWeight: normalizeFontWeight(element.fontWeight),
      fontStyle: String(element.fontStyle || 'normal'),
      underline: element.underline === true,
      color: String(element.color || '#17212b'),
      textAlign: ['left', 'center', 'right', 'justify'].includes(element.textAlign) ? element.textAlign : 'left',
      lineHeight: clamp(element.lineHeight || 1.2, 0.5, 5),
      letterSpacing: clamp(element.letterSpacing || 0, -100, 1000),
      overflow: ['wrap', 'shrink', 'clip'].includes(element.overflow) ? element.overflow : 'wrap',
    });
    if (type === 'image') Object.assign(normalized, {
      src: String(element.src || ''),
      source: element.source === 'ai-generated' ? 'ai-generated' : '',
      prompt: String(element.prompt || '').slice(0, 1500),
      imageRole: String(element.imageRole || '').slice(0, 80),
      crop: {
        x: clamp(element.crop?.x, 0, 12000),
        y: clamp(element.crop?.y, 0, 12000),
        width: clamp(element.crop?.width || element.width, 1, 12000),
        height: clamp(element.crop?.height || element.height, 1, 12000),
      },
      scale: { x: clamp(element.scale?.x || 1, 0.01, 100), y: clamp(element.scale?.y || 1, 0.01, 100) },
      objectPosition: {
        x: clamp(element.objectPosition?.x ?? 0.5, 0, 1),
        y: clamp(element.objectPosition?.y ?? 0.5, 0, 1),
      },
      cropZoom: clamp(element.cropZoom || 1, 1, 100),
      replaceable: element.replaceable === true,
    });
    if (['rectangle', 'circle', 'line', 'shape'].includes(type)) Object.assign(normalized, {
      fill: element.fill || '#d74c32',
      stroke: element.stroke || '',
      strokeWidth: clamp(element.strokeWidth || 0, 0, 100),
    });
    if (type === 'group') normalized.elements = Array.isArray(element.elements) ? element.elements : [];
    return normalized;
  });

  const oldBackground = legacy ? input.background : null;
  const canvas = input.canvas || { width: input.width, height: input.height, backgroundColor: oldBackground?.color };
  const bg = input.background || {};
  const backgroundImage = bg.src ? { type: 'image', src: bg.src, scale: bg.scale } : bg.image?.src ? bg.image : null;
  return {
    version: 1,
    id: String(input.id || createId('template')),
    name: String(input.name || 'Untitled template').slice(0, 120),
    description: String(input.description || '').slice(0, 1000),
    canvas: {
      width: clamp(canvas.width || 1200, 100, 12000),
      height: clamp(canvas.height || 800, 100, 12000),
      backgroundColor: String(canvas.backgroundColor || bg.color || '#f4f3ee'),
    },
    background: backgroundImage
      ? { type: 'image', src: String(backgroundImage.src), scale: backgroundImage.scale || { x: 1, y: 1 } }
      : { type: 'color', color: String(bg.color || canvas.backgroundColor || '#f4f3ee') },
    elements,
  };
};

export const validateTemplate = (input) => {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { valid: false, errors: ['Template must be an object'] };
  if (!Array.isArray(input.elements || input.objects || [])) errors.push('Template elements must be an array');
  if ((input.elements || input.objects || []).length > 500) errors.push('Template cannot contain more than 500 elements');
  try {
    const template = normalizeTemplate(input);
    return { valid: errors.length === 0, errors, template };
  } catch (error) {
    return { valid: false, errors: [...errors, error.message] };
  }
};

export const serializeCanvas = (canvas, metadata = {}) => normalizeTemplate({
  ...metadata,
  canvas: {
    width: canvas.getWidth(),
    height: canvas.getHeight(),
    backgroundColor: typeof canvas.backgroundColor === 'string' ? canvas.backgroundColor : '#f4f3ee',
  },
  background: canvas.backgroundImage
    ? { type: 'image', src: canvas.backgroundImage.templateSrc || canvas.backgroundImage.getSrc(), scale: { x: canvas.backgroundImage.scaleX || 1, y: canvas.backgroundImage.scaleY || 1 } }
    : { type: 'color', color: canvas.backgroundColor || '#f4f3ee' },
  elements: canvas.getObjects().filter((object) => {
    const id = String(object.id || '');
    return !id.startsWith('selection-outline') && !id.startsWith('image-frame-guide');
  }).map((object) => {
    const common = {
      id: object.id,
      name: object.name,
      type: object.editorType || (object.type === 'i-text' ? 'text' : object.type),
      x: object.left || 0,
      y: object.top || 0,
      width: object.frameWidth || object.getScaledWidth(),
      height: object.frameHeight || object.getScaledHeight(),
      rotation: object.angle || 0,
      opacity: object.opacity ?? 1,
      visible: object.visible !== false,
      locked: object.locked === true,
      editable: object.permissions?.editable ?? object.editable !== false,
      movable: object.permissions?.movable !== false,
      resizable: object.permissions?.resizable !== false,
      rotatable: object.permissions?.rotatable !== false,
      deletable: object.permissions?.deletable !== false,
      permissions: permissionDefaults({
        type: object.editorType,
        editable: object.editable,
        movable: object.permissions?.movable,
        resizable: object.permissions?.resizable,
        rotatable: object.permissions?.rotatable,
        deletable: object.permissions?.deletable,
        replaceable: object.replaceable,
        permissions: object.permissions,
      }),
    };
    if (common.type === 'text') return {
      ...common,
      text: object.text || '',
      fontFamily: object.fontFamily || 'Arial',
      fontSize: object.baseFontSize || object.fontSize || 48,
      baseFontSize: object.baseFontSize || object.fontSize || 48,
      fontWeight: object.fontWeight || '400',
      fontStyle: object.fontStyle || 'normal',
      underline: object.underline === true,
      color: object.fill || '#17212b',
      textAlign: object.textAlign || 'left',
      lineHeight: object.lineHeight || 1.2,
      letterSpacing: object.charSpacing || 0,
      overflow: object.overflow || 'wrap',
    };
    if (common.type === 'image') return {
      ...common,
      src: object.templateSrc || object.getSrc?.() || '',
      source: object.source === 'ai-generated' ? 'ai-generated' : '',
      prompt: String(object.prompt || '').slice(0, 1500),
      imageRole: String(object.imageRole || '').slice(0, 80),
      crop: { x: object.cropX || 0, y: object.cropY || 0, width: object.width || 0, height: object.height || 0 },
      scale: { x: object.scaleX || 1, y: object.scaleY || 1 },
      objectPosition: object.objectPosition || { x: 0.5, y: 0.5 },
      cropZoom: object.cropZoom || 1,
      replaceable: object.replaceable === true,
    };
    if (common.type === 'decoration') return {
      ...common,
      src: object.templateSrc || object.getSrc?.() || '',
      decorationId: object.decorationId || object.catalogId || '',
      catalogId: object.catalogId || object.decorationId || '',
      scale: { x: object.scaleX || 1, y: object.scaleY || 1 },
      flipX: object.flipX === true,
      flipY: object.flipY === true,
      tintColor: object.tintColor || '',
    };
    if (common.type === 'framed-image') return {
      ...common,
      src: object.templateSrc || object.getSrc?.() || '',
      catalogId: object.catalogId || '',
      frameShapeId: object.frameShapeId || 'rect',
      borderSource: object.borderSource || '',
      linkedFrameId: object.id,
      crop: { x: object.cropX || 0, y: object.cropY || 0, width: object.width || 0, height: object.height || 0 },
      scale: { x: object.scaleX || 1, y: object.scaleY || 1 },
      objectPosition: object.objectPosition || { x: 0.5, y: 0.5 },
      cropZoom: object.cropZoom || 1,
      replaceable: object.replaceable === true,
      flipX: object.flipX === true,
      flipY: object.flipY === true,
    };
    if (common.type === 'frame-border') return {
      ...common,
      src: object.templateSrc || object.getSrc?.() || '',
      catalogId: object.catalogId || '',
      linkedFrameId: object.linkedFrameId || '',
      scale: { x: object.scaleX || 1, y: object.scaleY || 1 },
    };
    return { ...common, fill: object.fill || '', stroke: object.stroke || '', strokeWidth: object.strokeWidth || 0 };
  }),
});

export const getElementPermissionOptions = (element, userMode = false) => {
  const permission = element.permissions || permissionDefaults(element);
  const locked = element.locked === true;
  return {
    id: element.id,
    name: element.name,
    editorType: element.type,
    locked,
    editable: !locked && (!userMode || (element.editable && permission.editable)),
    permissions: permission,
    replaceable: element.replaceable === true,
    selectable: !locked && (!userMode || (element.editable && permission.editable) || permission.movable || permission.resizable || permission.rotatable || permission.replaceable),
    evented: !locked,
    lockMovementX: locked || (userMode && !permission.movable),
    lockMovementY: locked || (userMode && !permission.movable),
    lockScalingX: locked || (userMode && !permission.resizable),
    lockScalingY: locked || (userMode && !permission.resizable),
    lockRotation: locked || (userMode && !permission.rotatable),
    hasControls: !locked && (!userMode || (permission.resizable || permission.rotatable)),
    opacity: element.opacity,
    visible: element.visible,
    left: element.x,
    top: element.y,
    angle: element.rotation,
  };
};

const configurePermissions = (object, element, userMode) => {
  object.set(getElementPermissionOptions(element, userMode));
  object.setCoords();
  return object;
};

export const deserializeTemplate = async (input, canvas, { userMode = false, resolveImage = (src) => src } = {}) => {
  const template = normalizeTemplate(input);
  canvas.clear();
  canvas.setDimensions({ width: template.canvas.width, height: template.canvas.height });
  canvas.backgroundColor = template.canvas.backgroundColor;
  if (template.background.type === 'image' && template.background.src) {
    const background = await FabricImage.fromURL(resolveImage(template.background.src), { crossOrigin: 'anonymous' });
    background.set({
      scaleX: template.background.scale?.x || template.canvas.width / background.width,
      scaleY: template.background.scale?.y || template.canvas.height / background.height,
      selectable: false,
      evented: false,
    });
    background.templateSrc = template.background.src;
    canvas.backgroundImage = background;
  }
  for (const element of template.elements) {
    let object;
    if (element.type === 'text') object = applyTextOverflow(new Textbox(element.text, {
      width: element.width,
      fontFamily: element.fontFamily,
      fontSize: element.baseFontSize || element.fontSize,
      fontWeight: element.fontWeight,
      fontStyle: element.fontStyle,
      underline: element.underline,
      fill: element.color,
      textAlign: element.textAlign,
      lineHeight: element.lineHeight,
      charSpacing: element.letterSpacing,
      editable: !userMode || (element.editable && !element.locked),
    }), element.overflow, element.height);
    else if (element.type === 'image' && element.src) {
      object = await FabricImage.fromURL(resolveImage(element.src), { crossOrigin: 'anonymous' });
      object.set({
        cropX: element.crop.x,
        cropY: element.crop.y,
        width: element.crop.width,
        height: element.crop.height,
        scaleX: element.scale.x,
        scaleY: element.scale.y,
        frameWidth: element.width,
        frameHeight: element.height,
        frameLeft: element.x,
        frameTop: element.y,
        cropZoom: element.cropZoom,
        objectPosition: element.objectPosition,
        templateSrc: element.src,
        source: element.source,
        prompt: element.prompt,
        imageRole: element.imageRole,
      });
    } else if (element.type === 'decoration' && element.src) {
      object = await FabricImage.fromURL(resolveImage(element.src), { crossOrigin: 'anonymous' });
      object.set({
        scaleX: element.scale?.x || 1,
        scaleY: element.scale?.y || 1,
        flipX: element.flipX === true,
        flipY: element.flipY === true,
        templateSrc: element.src,
        decorationId: element.decorationId || element.catalogId || '',
        catalogId: element.catalogId || element.decorationId || '',
        tintColor: element.tintColor || '',
        editorType: 'decoration',
        objectCaching: false,
      });
    } else if (element.type === 'framed-image') {
      const { fitImageIntoFrameMask, syncFrameClipPath, createFramedImagePlaceholder } = await import('./frameMaskFactory');
      if (element.src) {
        object = await FabricImage.fromURL(resolveImage(element.src), { crossOrigin: 'anonymous' });
        object.set({
          editorType: 'framed-image',
          frameShapeId: element.frameShapeId || 'rect',
          catalogId: element.catalogId || '',
          borderSource: element.borderSource || '',
          templateSrc: element.src,
          frameWidth: element.width,
          frameHeight: element.height,
          frameLeft: element.x,
          frameTop: element.y,
          replaceable: element.replaceable === true,
          cropZoom: element.cropZoom || 1,
          objectPosition: element.objectPosition || { x: 0.5, y: 0.5 },
          flipX: element.flipX === true,
          flipY: element.flipY === true,
          objectCaching: false,
        });
        fitImageIntoFrameMask(object, { zoom: element.cropZoom || 1, position: element.objectPosition || { x: 0.5, y: 0.5 } });
      } else {
        object = await createFramedImagePlaceholder({
          frameShapeId: element.frameShapeId || 'rect',
          frameWidth: element.width,
          frameHeight: element.height,
          left: element.x,
          top: element.y,
          borderSource: element.borderSource || '',
          resolveUrl: resolveImage,
        });
        object.set({
          editorType: 'framed-image',
          catalogId: element.catalogId || '',
          replaceable: true,
          isPlaceholder: true,
        });
        syncFrameClipPath(object);
      }
    } else if (element.type === 'frame-border' && element.src) {
      object = await FabricImage.fromURL(resolveImage(element.src), { crossOrigin: 'anonymous' });
      object.set({
        scaleX: element.scale?.x || 1,
        scaleY: element.scale?.y || 1,
        templateSrc: element.src,
        catalogId: element.catalogId || '',
        linkedFrameId: element.linkedFrameId || '',
        editorType: 'frame-border',
        selectable: false,
        evented: false,
        objectCaching: false,
      });
    } else if (element.type === 'image') object = new Rect({ width: element.width, height: element.height, fill: '#e8ece9', stroke: '#87928e', strokeDashArray: [8, 5] });
    else if (element.type === 'rectangle' || element.type === 'shape') object = new Rect({ width: element.width, height: element.height, fill: element.fill, stroke: element.stroke || null, strokeWidth: element.strokeWidth });
    else if (element.type === 'circle') object = new Circle({ radius: Math.min(element.width, element.height) / 2, fill: element.fill, stroke: element.stroke || null, strokeWidth: element.strokeWidth });
    else if (element.type === 'line') object = new Line([0, 0, element.width, element.height], { stroke: element.stroke || element.fill, strokeWidth: element.strokeWidth || 2 });
    if (!object) continue;
    configurePermissions(object, element, userMode);
    canvas.add(object);
  }
  canvas.discardActiveObject();
  canvas.requestRenderAll();
  return template;
};

export const duplicateTemplate = (input, name = `${input.name || 'Template'} - Copy`) => {
  const template = normalizeTemplate(input);
  return normalizeTemplate({
    ...template,
    id: createId('template'),
    name,
    elements: template.elements.map((element) => ({ ...element, id: createId(element.type) })),
  });
};