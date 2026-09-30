import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActiveSelection, Canvas, Circle, FabricImage, Line, Rect, Textbox } from 'fabric';
import { api } from '../../api/client';
import { applyTextOverflow, createEmptyTemplate, createId, deserializeTemplate, FONT_FAMILIES, normalizeTemplate, serializeCanvas } from '../../utils/templateSerializer';
import { resolveImageUrl } from '../../utils/designAssets';
import { getCatalogAssetById } from '../../catalog/designElementCatalog';
import {
  fillFramedImageFromSource,
  insertCatalogElement,
  insertCatalogFrame,
  syncLinkedFrameBorder,
} from '../../utils/designElementCanvasOps';
import { fitImageIntoFrameMask, syncFrameClipPath } from '../../utils/frameMaskFactory';
import ElementsLibraryPanel, { DRAG_MIME } from './ElementsLibraryPanel';
import EditorToolRail from './EditorToolRail';
import PremiumFontPicker from './PremiumFontPicker';
import PremiumColorPicker from './PremiumColorPicker';
import './ElementsLibraryPanel.css';
import './EditorToolRail.css';
import './PremiumFontPicker.css';
import './PremiumColorPicker.css';
import './editor-fonts.css';
import './DesignEditor.css';

const DEFAULT_TEMPLATE = createEmptyTemplate();
const MAX_HISTORY_STATES = 100;
const BLEND_MODES = [
  { value: 'source-over', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'darken', label: 'Darken' },
  { value: 'lighten', label: 'Lighten' },
];
const AI_TEXT_FIELDS = [
  { key: 'headline', name: 'Headline', label: 'Headline', maxLength: 120, top: 0.08, height: 0.22, placement: 'top', fontSize: 48, fontWeight: '700' },
  { key: 'description', name: 'Description', label: 'Description', maxLength: 240, top: 0.36, height: 0.28, placement: 'center', fontSize: 28, fontWeight: '400' },
  { key: 'callToAction', name: 'Call to action', label: 'Call to action', maxLength: 100, top: 0.78, height: 0.14, placement: 'bottom', fontSize: 34, fontWeight: '700' },
];
const createDefaultAiTextStyles = () => Object.fromEntries(AI_TEXT_FIELDS.map((field) => [field.key, {
  fontFamily: 'Arial',
  fontSize: field.fontSize,
  fontWeight: field.fontWeight,
  fontStyle: 'normal',
  underline: false,
  textAlign: 'center',
  placement: field.placement,
  color: '#ffffff',
  stroke: '#17212b',
  strokeWidth: 1,
  lineHeight: 1.1,
  letterSpacing: 0,
}]));
const readDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('Could not read this image file.'));
  reader.readAsDataURL(file);
});

const DesignEditor = forwardRef(function DesignEditor({
  initialTemplate = DEFAULT_TEMPLATE,
  onChange,
  onSave,
  onAssetUpload,
  mode = 'admin',
  templateMetadata = {},
}, ref) {
  const canvasElementRef = useRef(null);
  const canvasRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const metadataRef = useRef(templateMetadata);
  const restoringRef = useRef(false);
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const historyFrameRef = useRef(0);
  const smartGuidesRef = useRef(true);
  const imageUploadRef = useRef(null);
  const backgroundUploadRef = useRef(null);
  const templateUploadRef = useRef(null);
  const replaceUploadRef = useRef(null);
  const elementsAccordionRef = useRef(null);
  const layersAccordionRef = useRef(null);
  const copyBufferRef = useRef(null);
  const canvasScrollRef = useRef(null);
  const imageScalingRef = useRef(false);
  const customerZoomFittedRef = useRef(false);
  const previewObjectsRef = useRef(null);
  const gridEnabledRef = useRef(false);
  const gridSizeRef = useRef(24);
  const normalizedInitial = normalizeTemplate(initialTemplate);
  const initialSize = { width: normalizedInitial.canvas.width, height: normalizedInitial.canvas.height };
  const [canvasSize, setCanvasSize] = useState(initialSize);
  const [sizeDraft, setSizeDraft] = useState(initialSize);
  const [zoom, setZoom] = useState(0.7);
  const [libraryMode, setLibraryMode] = useState('elements');
  const zoomRef = useRef(zoom);
  const [selection, setSelection] = useState(null);
  const [layers, setLayers] = useState([]);
  const [historyState, setHistoryState] = useState({ undo: false, redo: false });
  const [smartGuides, setSmartGuides] = useState(mode !== 'customer');
  const [showGuides, setShowGuides] = useState(true);
  const [gridEnabled, setGridEnabled] = useState(false);
  const [gridSize, setGridSize] = useState(24);
  const [aspectRatioLock, setAspectRatioLock] = useState(false);
  const [shadowColor, setShadowColor] = useState('#000000');
  const [shadowBlur, setShadowBlur] = useState(0);
  const [shadowOffsetX, setShadowOffsetX] = useState(0);
  const [shadowOffsetY, setShadowOffsetY] = useState(0);
  const [guideLines, setGuideLines] = useState({ vertical: [], horizontal: [] });
  const [status, setStatus] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [exportScale, setExportScale] = useState(2);
  const [exportFormat, setExportFormat] = useState('png');
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiHeadline, setAiHeadline] = useState('');
  const [aiDescription, setAiDescription] = useState('');
  const [aiCallToAction, setAiCallToAction] = useState('');
  const [aiTextStyles, setAiTextStyles] = useState(createDefaultAiTextStyles);
  const [aiImageRole, setAiImageRole] = useState('full');
  const [aiEditSelected, setAiEditSelected] = useState(false);
  const [aiStyle, setAiStyle] = useState('');
  const [aiWidth, setAiWidth] = useState(512);
  const [aiHeight, setAiHeight] = useState(512);
  const [aiPreview, setAiPreview] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [activeTool, setActiveTool] = useState('photos');

  const CUSTOMER_TOOL_TITLES = {
    photos: 'Photos',
    uploads: 'Uploads',
    text: 'Text',
    elements: 'Elements',
    frames: 'Frames',
    background: 'Background',
    layers: 'Layers',
  };
  const [mobilePanel, setMobilePanel] = useState(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    smartGuidesRef.current = smartGuides;
  }, [smartGuides]);
  useEffect(() => {
    gridEnabledRef.current = gridEnabled;
  }, [gridEnabled]);
  useEffect(() => {
    gridSizeRef.current = gridSize;
  }, [gridSize]);
  useEffect(() => {
    metadataRef.current = templateMetadata;
  }, [templateMetadata]);

  const isDecorativeCanvasObject = (object) => {
    const id = String(object?.id || '');
    return id.startsWith('selection-outline') || id.startsWith('image-frame-guide') || object?.editorType === 'frame-border';
  };
  const removeSelectionOutline = useCallback((canvas) => {
    if (!canvas) return;
    canvas.getObjects().filter(isDecorativeCanvasObject).forEach((outline) => canvas.remove(outline));
    canvas.getObjects().forEach((object) => {
      if (object?.__frameGuide) {
        canvas.remove(object.__frameGuide);
        object.__frameGuide = null;
      }
      if (object?.__selectionOutline) {
        canvas.remove(object.__selectionOutline);
        object.__selectionOutline = null;
      }
    });
  }, []);

  const getImageFrameMetrics = (image) => {
    const displayWidth = image.getScaledWidth();
    const displayHeight = image.getScaledHeight();
    const frameWidth = Math.max(1, image.frameWidth || displayWidth);
    const frameHeight = Math.max(1, image.frameHeight || displayHeight);
    const insetX = (frameWidth - displayWidth) / 2;
    const insetY = (frameHeight - displayHeight) / 2;
    const frameLeft = image.frameLeft ?? (image.left || 0) - insetX;
    const frameTop = image.frameTop ?? (image.top || 0) - insetY;
    return { displayWidth, displayHeight, frameWidth, frameHeight, insetX, insetY, frameLeft, frameTop };
  };

  const syncFrameFromImagePosition = (image) => {
    const metrics = getImageFrameMetrics(image);
    image.frameLeft = metrics.frameLeft;
    image.frameTop = metrics.frameTop;
    image.frameWidth = metrics.frameWidth;
    image.frameHeight = metrics.frameHeight;
  };

  const syncImageFrameGuide = (image) => {
    if (mode === 'customer') return;
    const canvas = canvasRef.current;
    if (!canvas || !image || image.editorType !== 'image' || image.type !== 'image') return;
    const { frameWidth, frameHeight, frameLeft, frameTop } = getImageFrameMetrics(image);
    image.frameLeft = frameLeft;
    image.frameTop = frameTop;
    if (!image.__frameGuide) {
      image.__frameGuide = new Rect({
        left: frameLeft,
        top: frameTop,
        width: frameWidth,
        height: frameHeight,
        fill: 'rgba(110, 20, 35, 0.05)',
        stroke: '#8ec5ff',
        strokeWidth: 2,
        strokeDashArray: [8, 6],
        selectable: false,
        evented: false,
        objectCaching: false,
        id: `image-frame-guide-${image.id}`,
      });
      canvas.add(image.__frameGuide);
    } else {
      image.__frameGuide.set({ left: frameLeft, top: frameTop, width: frameWidth, height: frameHeight });
      image.__frameGuide.setCoords();
    }
    canvas.bringObjectToFront(image);
    if (image.__frameGuide) canvas.sendObjectToBack(image.__frameGuide);
  };

  const syncCustomerImageBounds = (image) => {
    if (!image || image.editorType !== 'image' || image.type !== 'image') return;
    const width = Math.max(1, image.getScaledWidth());
    const height = Math.max(1, image.getScaledHeight());
    image.frameWidth = width;
    image.frameHeight = height;
    image.frameLeft = image.left || 0;
    image.frameTop = image.top || 0;
  };

  const centerCustomerImageOnCanvas = (image) => {
    const canvas = canvasRef.current;
    if (!canvas || !image || image.editorType !== 'image' || image.type !== 'image') return;
    const displayWidth = Math.max(1, image.getScaledWidth());
    const displayHeight = Math.max(1, image.getScaledHeight());
    image.set({
      originX: 'left',
      originY: 'top',
      left: (canvas.getWidth() - displayWidth) / 2,
      top: (canvas.getHeight() - displayHeight) / 2,
    });
    syncCustomerImageBounds(image);
    image.setCoords();
  };

  const centerCanvasInView = useCallback(() => {
    const scroll = canvasScrollRef.current;
    if (!scroll) return;
    if (mode === 'customer') {
      scroll.scrollLeft = 0;
      scroll.scrollTop = 0;
      return;
    }
    scroll.scrollLeft = Math.max(0, (scroll.scrollWidth - scroll.clientWidth) / 2);
    scroll.scrollTop = Math.max(0, (scroll.scrollHeight - scroll.clientHeight) / 2);
  }, [mode]);

  const focusObjectInView = useCallback((object) => {
    const scroll = canvasScrollRef.current;
    if (!scroll || !object) return;
    if (mode === 'customer') {
      centerCanvasInView();
      return;
    }
    centerCanvasInView();
    const frame = scroll.querySelector('.editor-canvas-frame');
    if (!frame) return;
    const zoomLevel = zoomRef.current;
    const scrollRect = scroll.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    const frameOffsetLeft = frameRect.left - scrollRect.left + scroll.scrollLeft;
    const frameOffsetTop = frameRect.top - scrollRect.top + scroll.scrollTop;
    const objectLeft = frameOffsetLeft + (object.left || 0) * zoomLevel;
    const objectTop = frameOffsetTop + (object.top || 0) * zoomLevel;
    const objectWidth = object.getScaledWidth() * zoomLevel;
    const objectHeight = object.getScaledHeight() * zoomLevel;
    const centerX = objectLeft + objectWidth / 2;
    const centerY = objectTop + objectHeight / 2;
    scroll.scrollLeft = Math.max(0, centerX - scroll.clientWidth / 2);
    scroll.scrollTop = Math.max(0, centerY - scroll.clientHeight / 2);
  }, [centerCanvasInView, mode]);

  useEffect(() => {
    zoomRef.current = zoom;
    if (mode === 'customer') {
      window.requestAnimationFrame(() => centerCanvasInView());
    }
  }, [zoom, mode, centerCanvasInView]);

  useEffect(() => {
    if (mode !== 'customer' || customerZoomFittedRef.current) return undefined;
    const scroll = canvasScrollRef.current;
    if (!scroll) return undefined;
    const padding = 56;
    const fitZoom = Math.min(
      (scroll.clientWidth - padding) / canvasSize.width,
      (scroll.clientHeight - padding) / canvasSize.height,
      1,
    );
    const nextZoom = Math.max(0.35, Math.min(1, Number(fitZoom.toFixed(2))));
    customerZoomFittedRef.current = true;
    setZoom(nextZoom);
    window.requestAnimationFrame(() => centerCanvasInView());
    return undefined;
  }, [mode, canvasSize.width, canvasSize.height, centerCanvasInView]);

  const readSnapshot = useCallback(() => canvasRef.current ? serializeCanvas(canvasRef.current, metadataRef.current) : null, []);
  const refreshLayers = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) setLayers(canvas.getObjects().filter((object) => !isDecorativeCanvasObject(object)).map((object) => ({
      id: object.id,
      name: object.editorType === 'text' && (!object.name || object.name === 'Text')
        ? (object.text || 'Text')
        : object.name || (object.editorType === 'image' ? 'Image' : object.editorType),
      type: object.editorType,
      preview: object.editorType === 'text' ? String(object.text || '').replace(/\s+/g, ' ').trim().slice(0, 48) : '',
      editable: object.editorType === 'text' && object.editable !== false && !object.locked,
      visible: object.visible !== false,
      locked: object.locked === true,
    })).reverse());
  }, []);
  const refreshHistoryControls = useCallback(() => setHistoryState({
    undo: historyIndexRef.current > 0,
    redo: historyIndexRef.current < historyRef.current.length - 1,
  }), []);
  const saveSnapshot = useCallback(() => {
    if (restoringRef.current) return;
    const snapshot = readSnapshot();
    if (!snapshot) return;
    const serialized = JSON.stringify(snapshot);
    const index = historyIndexRef.current;
    if (historyRef.current[index] === serialized) return;
    historyRef.current = historyRef.current.slice(0, index + 1);
    historyRef.current.push(serialized);
    if (historyRef.current.length > MAX_HISTORY_STATES) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
    refreshHistoryControls();
    refreshLayers();
    onChangeRef.current?.(snapshot);
  }, [readSnapshot, refreshHistoryControls, refreshLayers]);
  const queueSnapshot = useCallback(() => {
    if (restoringRef.current) return;
    if (historyFrameRef.current) cancelAnimationFrame(historyFrameRef.current);
    historyFrameRef.current = requestAnimationFrame(() => {
      historyFrameRef.current = 0;
      saveSnapshot();
    });
  }, [saveSnapshot]);

  const restoreTemplate = useCallback(async (input) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    restoringRef.current = true;
    try {
      const template = await deserializeTemplate(input, canvas, { userMode: mode === 'customer', resolveImage: resolveImageUrl });
      setCanvasSize({ width: template.canvas.width, height: template.canvas.height });
      setSizeDraft({ width: template.canvas.width, height: template.canvas.height });
      setSelection(null);
      refreshLayers();
      if (mode === 'customer') {
        window.requestAnimationFrame(() => {
          centerCanvasInView();
          canvas.requestRenderAll();
        });
      }
      return template;
    } finally {
      restoringRef.current = false;
    }
  }, [mode, refreshLayers, centerCanvasInView]);

  const snapToGrid = useCallback((target) => {
    if (!target || !gridEnabledRef.current) return false;
    const step = Number(gridSizeRef.current) || 24;
    const snappedLeft = Math.round((target.left || 0) / step) * step;
    const snappedTop = Math.round((target.top || 0) / step) * step;
    if (Math.abs((target.left || 0) - snappedLeft) < 0.001 && Math.abs((target.top || 0) - snappedTop) < 0.001) return false;
    target.set({ left: snappedLeft, top: snappedTop });
    return true;
  }, []);

  useEffect(() => {
    const canvas = new Canvas(canvasElementRef.current, {
      width: normalizedInitial.canvas.width,
      height: normalizedInitial.canvas.height,
      backgroundColor: normalizedInitial.canvas.backgroundColor,
      preserveObjectStacking: true,
      selection: true,
    });
    canvasRef.current = canvas;
    const updateSelection = () => {
      const object = canvas.getActiveObject();
      setSelection(object ? {
        id: object.id,
        type: object.type === 'activeselection' ? 'multiple' : object.editorType,
        count: object.type === 'activeselection' ? object.getObjects().length : 1,
        text: object.text || '',
        left: Math.round(object.left || 0),
        top: Math.round(object.top || 0),
        width: Math.round(object.frameWidth || object.getScaledWidth()),
        height: Math.round(object.frameHeight || object.getScaledHeight()),
        angle: Math.round(object.angle || 0),
        fontFamily: object.fontFamily || 'Arial',
        fontSize: object.baseFontSize || object.fontSize || 48,
        fontWeight: object.fontWeight || '400',
        fontStyle: object.fontStyle || 'normal',
        color: object.fill || '#17212b',
        textAlign: object.textAlign || 'left',
        overflow: object.overflow || 'wrap',
        underline: object.underline === true,
        lineHeight: object.lineHeight || 1.2,
        letterSpacing: object.charSpacing || 0,
        opacity: object.opacity ?? 1,
        blendMode: object.globalCompositeOperation || 'source-over',
        cropZoom: object.cropZoom || 1,
        cropXPosition: object.objectPosition?.x ?? 0.5,
        cropYPosition: object.objectPosition?.y ?? 0.5,
        src: object.editorType === 'image' && object.type === 'image' ? object.templateSrc || object.getSrc?.() || '' : '',
        fill: object.fill || '#d74c32',
        stroke: object.stroke || '#263536',
        strokeWidth: object.strokeWidth || 0,
        visible: object.visible !== false,
        locked: object.locked === true,
        editable: object.editable !== false,
        replaceable: object.replaceable === true,
        permissions: object.permissions || {},
      } : null);
    };
    const normalizeImageAfterTransform = (active) => {
      if (!active || active.editorType !== 'image' || active.type !== 'image') return;
      if (mode === 'customer') return;
      syncFrameFromImagePosition(active);
      const scaledWidth = Math.max(1, active.getScaledWidth());
      const scaledHeight = Math.max(1, active.getScaledHeight());
      const frameWidth = Math.max(1, active.frameWidth || scaledWidth);
      const frameHeight = Math.max(1, active.frameHeight || scaledHeight);
      const resizedFrame = Math.abs(scaledWidth - frameWidth) > 0.75 || Math.abs(scaledHeight - frameHeight) > 0.75;
      if (resizedFrame) {
        active.frameWidth = scaledWidth;
        active.frameHeight = scaledHeight;
        active.frameLeft = active.left || 0;
        active.frameTop = active.top || 0;
      }
      fitImageToFrame(
        active,
        active.frameWidth || scaledWidth,
        active.frameHeight || scaledHeight,
        active.cropZoom || 1,
        active.objectPosition || { x: 0.5, y: 0.5 },
        { mode: 'cover' },
      );
      syncImageFrameGuide(active);
    };
    const changed = () => {
      const active = canvas.getActiveObject();
      if (active?.editorType === 'image' && active.type === 'image') {
        normalizeImageAfterTransform(active);
      } else if (active?.editorType === 'text' && active.type === 'textbox' && (active.scaleX !== 1 || active.scaleY !== 1)) {
        const frameWidth = Math.max(1, active.width * active.scaleX);
        const frameHeight = Math.max(1, (active.frameHeight || active.height) * active.scaleY);
        active.baseFontSize = Math.max(1, (active.baseFontSize || active.fontSize) * active.scaleY);
        active.frameWidth = frameWidth;
        active.set({ width: frameWidth, scaleX: 1, scaleY: 1 });
        applyTextOverflow(active, active.overflow, frameHeight);
      }
      updateSelection();
      refreshLayers();
      queueSnapshot();
    };
    const textChanged = () => {
      const active = canvas.getActiveObject();
      if (active?.editorType === 'text') applyTextOverflow(active, active.overflow, active.frameHeight);
      updateSelection();
      refreshLayers();
      onChangeRef.current?.(readSnapshot());
    };
    const clearSelectionOutline = () => removeSelectionOutline(canvas);
    const handleSelectionFocus = () => {
      updateSelection();
    };
    canvas.on('selection:created', handleSelectionFocus);
    canvas.on('selection:updated', handleSelectionFocus);
    canvas.on('selection:cleared', () => {
      clearSelectionOutline();
      updateSelection();
    });
    canvas.on('object:scaling', () => {
      imageScalingRef.current = true;
    });
    canvas.on('object:modified', (event) => {
      const target = event.target;
      if (mode === 'customer' && target?.editorType === 'image' && target.type === 'image') {
        const action = event.transform?.action || '';
        const movedOrScaled = imageScalingRef.current || ['drag', 'scale', 'rotate', 'resizing'].some((name) => action.includes(name));
        if (!movedOrScaled) {
          updateSelection();
          return;
        }
        syncCustomerImageBounds(target);
        imageScalingRef.current = false;
        target.setCoords();
        canvas.requestRenderAll();
        updateSelection();
        refreshLayers();
        queueSnapshot();
        return;
      }
      if (target?.editorType === 'framed-image') {
        target.frameWidth = target.getScaledWidth();
        target.frameHeight = target.getScaledHeight();
        target.frameLeft = target.left ?? target.frameLeft;
        target.frameTop = target.top ?? target.frameTop;
        syncFrameClipPath(target);
        syncLinkedFrameBorder(canvas, target);
        target.setCoords();
        canvas.requestRenderAll();
        updateSelection();
        refreshLayers();
        queueSnapshot();
        return;
      }
      changed();
    });
    canvas.on('mouse:down', (event) => {
      if (!event.target) setSelection(null);
    });
    canvas.on('object:moving', (event) => {
      const target = event.target;
      const activeCanvas = canvasRef.current;
      if (!target || !activeCanvas) return;
      if (target.editorType === 'framed-image') {
        target.frameLeft = target.left ?? target.frameLeft;
        target.frameTop = target.top ?? target.frameTop;
        syncLinkedFrameBorder(activeCanvas, target);
      }
      if (gridEnabledRef.current) snapToGrid(target);
      if (mode === 'customer' && target.editorType === 'image') {
        setGuideLines({ vertical: [], horizontal: [] });
        return;
      }
      if (!smartGuidesRef.current) {
        setGuideLines({ vertical: [], horizontal: [] });
        return;
      }
      const canvasWidth = activeCanvas.getWidth();
      const canvasHeight = activeCanvas.getHeight();
      const tolerance = 10;
      const centerX = target.left + target.getScaledWidth() / 2;
      const centerY = target.top + target.getScaledHeight() / 2;
      const snapX = Math.abs(centerX - canvasWidth / 2) <= tolerance ? canvasWidth / 2 - target.getScaledWidth() / 2 : target.left;
      const snapY = Math.abs(centerY - canvasHeight / 2) <= tolerance ? canvasHeight / 2 - target.getScaledHeight() / 2 : target.top;
      if (Math.abs(snapX - target.left) > 0.1 || Math.abs(snapY - target.top) > 0.1) {
        target.set({ left: snapX, top: snapY });
      }
      const didSnap = snapToSmartGuides(target, activeCanvas);
      if (!didSnap) setGuideLines({ vertical: [], horizontal: [] });
    });
    canvas.on('mouse:up', () => setGuideLines({ vertical: [], horizontal: [] }));
    canvas.on('text:changed', textChanged);
    canvas.on('text:editing:entered', saveSnapshot);
    canvas.on('text:editing:exited', saveSnapshot);
    canvas.on('object:added', () => {
      refreshLayers();
      queueSnapshot();
    });
    canvas.on('object:removed', () => {
      refreshLayers();
      queueSnapshot();
    });
    historyRef.current = [JSON.stringify(createEmptyTemplate({
      ...metadataRef.current,
      width: canvas.getWidth(),
      height: canvas.getHeight(),
      backgroundColor: canvas.backgroundColor,
    }))];
    historyIndexRef.current = 0;
    refreshHistoryControls();
    restoreTemplate(initialTemplate);
    return () => {
      if (historyFrameRef.current) cancelAnimationFrame(historyFrameRef.current);
      canvas.dispose();
      canvasRef.current = null;
    };
  }, [initialTemplate, normalizedInitial.canvas.height, normalizedInitial.canvas.width, normalizedInitial.canvas.backgroundColor, queueSnapshot, readSnapshot, refreshHistoryControls, refreshLayers, restoreTemplate, saveSnapshot, mode, removeSelectionOutline, centerCanvasInView, focusObjectInView]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (previewMode) {
      previewObjectsRef.current = canvas.getObjects().map((object) => [object, object.selectable, object.evented]);
      canvas.discardActiveObject();
      canvas.selection = false;
      canvas.getObjects().forEach((object) => object.set({ selectable: false, evented: false }));
    } else if (previewObjectsRef.current) {
      previewObjectsRef.current.forEach(([object, selectable, evented]) => object.set({ selectable, evented }));
      previewObjectsRef.current = null;
      canvas.selection = true;
    }
    canvas.requestRenderAll();
  }, [previewMode]);

  const getImageBlob = async ({ format = 'png', scale = 1 } = {}) => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error('Design canvas is not ready');
    const active = canvas.getActiveObject();
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    try {
      const canvasFormat = format === 'jpg' ? 'jpeg' : format;
      const dataUrl = canvas.toDataURL({ format: canvasFormat, multiplier: scale, quality: 0.94 });
      return await (await fetch(dataUrl)).blob();
    } finally {
      if (active) canvas.setActiveObject(active);
      canvas.requestRenderAll();
    }
  };

  useImperativeHandle(ref, () => ({
    getTemplate: readSnapshot,
    getImageBlob,
    loadTemplate: restoreTemplate,
  }), [readSnapshot, restoreTemplate]);

  const downloadImage = async (format = exportFormat) => {
    setStatus(`Exporting ${format.toUpperCase()}...`);
    try {
      const scale = Number(exportScale) || 1;
      let blob;
      if (format === 'pdf') {
        const imageBlob = await getImageBlob({ format: 'png', scale });
        const imageData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Could not prepare PDF export'));
          reader.readAsDataURL(imageBlob);
        });
        const { jsPDF } = await import('jspdf');
        const pageWidth = canvasSize.width * scale * 0.75;
        const pageHeight = canvasSize.height * scale * 0.75;
        const pdf = new jsPDF({ orientation: pageWidth >= pageHeight ? 'landscape' : 'portrait', unit: 'pt', format: [pageWidth, pageHeight] });
        pdf.addImage(imageData, 'PNG', 0, 0, pageWidth, pageHeight);
        blob = pdf.output('blob');
      } else {
        blob = await getImageBlob({ format, scale });
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `yamini-design.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus(`${format.toUpperCase()} exported at ${canvasSize.width * scale} × ${canvasSize.height * scale}.`);
    } catch (error) {
      setStatus(error.message || 'Export failed. Try a smaller export scale.');
    }
  };

  const saveTemplate = async () => {
    if (!onSave) return downloadTemplate();
    setStatus('Saving...');
    try {
      await onSave(readSnapshot(), await getImageBlob({ format: 'png', scale: 1 }));
      setStatus('Saved.');
    } catch (error) {
      setStatus(error.message || 'Save failed. Your editor state is still available.');
    }
  };

  const activeObject = () => canvasRef.current?.getActiveObject() || null;
  const getAssetSource = async (file) => {
    const uploaded = onAssetUpload ? await onAssetUpload(file) : await readDataUrl(file);
    return typeof uploaded === 'string' ? uploaded : uploaded?.url || uploaded?.src || '';
  };
  const getImageAssetSource = async (file, aiMetadata = {}) => {
    if (typeof file !== 'string') return getAssetSource(file);
    if (aiMetadata.source !== 'ai-generated') return file;
    const response = await fetch(resolveImageUrl(file));
    if (!response.ok) throw new Error('Could not load the generated image.');
    const blob = await response.blob();
    const mimeType = blob.type || 'image/png';
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(mimeType)) throw new Error('Generated image must be PNG, JPG, or WebP.');
    return getAssetSource(new File([blob], 'ai-generated-artwork.png', { type: mimeType }));
  };
  const canMutate = (object, action) => {
    if (!object || object.locked) return false;
    if (mode === 'admin') return true;
    return Boolean(object.permissions?.[action]);
  };
  const fitImageToFrame = (image, frameWidth, frameHeight, zoom = 1, position = { x: 0.5, y: 0.5 }, { mode = 'cover' } = {}) => {
    const source = image.getElement();
    const sourceWidth = source?.naturalWidth || image.width || 1;
    const sourceHeight = source?.naturalHeight || image.height || 1;
    const safeFrameWidth = Math.max(1, frameWidth);
    const safeFrameHeight = Math.max(1, frameHeight);

    if (mode === 'contain') {
      const scale = Math.min(safeFrameWidth / sourceWidth, safeFrameHeight / sourceHeight);
      const displayWidth = sourceWidth * scale;
      const displayHeight = sourceHeight * scale;
      const frameLeft = image.frameLeft ?? image.left ?? 0;
      const frameTop = image.frameTop ?? image.top ?? 0;
      image.set({
        left: frameLeft + (safeFrameWidth - displayWidth) / 2,
        top: frameTop + (safeFrameHeight - displayHeight) / 2,
        width: sourceWidth,
        height: sourceHeight,
        cropX: 0,
        cropY: 0,
        scaleX: scale,
        scaleY: scale,
        frameWidth: safeFrameWidth,
        frameHeight: safeFrameHeight,
        frameLeft,
        frameTop,
        cropZoom: 1,
        objectPosition: { x: 0.5, y: 0.5 },
      });
      return;
    }

    const frameRatio = safeFrameWidth / safeFrameHeight;
    let cropWidth = sourceWidth;
    let cropHeight = sourceHeight;
    if (sourceWidth / sourceHeight > frameRatio) cropWidth = sourceHeight * frameRatio;
    else cropHeight = sourceWidth / frameRatio;
    cropWidth /= zoom;
    cropHeight /= zoom;
    image.set({
      width: cropWidth,
      height: cropHeight,
      cropX: Math.max(0, sourceWidth - cropWidth) * position.x,
      cropY: Math.max(0, sourceHeight - cropHeight) * position.y,
      scaleX: safeFrameWidth / cropWidth,
      scaleY: safeFrameHeight / cropHeight,
      frameWidth: safeFrameWidth,
      frameHeight: safeFrameHeight,
      frameLeft: image.frameLeft ?? image.left ?? 0,
      frameTop: image.frameTop ?? image.top ?? 0,
      cropZoom: zoom,
      objectPosition: position,
    });
  };
  const placeCustomerImage = (image, frameLeft, frameTop, frameWidth, frameHeight, { fillFrame = false } = {}) => {
    const source = image.getElement();
    const sourceWidth = source?.naturalWidth || image.width || 1;
    const sourceHeight = source?.naturalHeight || image.height || 1;
    const safeFrameWidth = Math.max(1, frameWidth);
    const safeFrameHeight = Math.max(1, frameHeight);
    let cropWidth = sourceWidth;
    let cropHeight = sourceHeight;
    let cropX = 0;
    let cropY = 0;
    let scale;
    if (fillFrame) {
      const frameRatio = safeFrameWidth / safeFrameHeight;
      if (sourceWidth / sourceHeight > frameRatio) cropWidth = sourceHeight * frameRatio;
      else cropHeight = sourceWidth / frameRatio;
      cropX = Math.max(0, (sourceWidth - cropWidth) / 2);
      cropY = Math.max(0, (sourceHeight - cropHeight) / 2);
      scale = safeFrameWidth / cropWidth;
      const displayWidth = cropWidth * scale;
      const displayHeight = cropHeight * scale;
      image.set({
        originX: 'left',
        originY: 'top',
        left: frameLeft + (safeFrameWidth - displayWidth) / 2,
        top: frameTop + (safeFrameHeight - displayHeight) / 2,
        width: cropWidth,
        height: cropHeight,
        cropX,
        cropY,
        scaleX: scale,
        scaleY: scale,
        frameWidth: safeFrameWidth,
        frameHeight: safeFrameHeight,
        frameLeft,
        frameTop,
        cropZoom: 1,
        objectPosition: { x: 0.5, y: 0.5 },
      });
    } else {
      scale = Math.min(safeFrameWidth / sourceWidth, safeFrameHeight / sourceHeight, 1);
      const displayWidth = sourceWidth * scale;
      const displayHeight = sourceHeight * scale;
      image.set({
        originX: 'left',
        originY: 'top',
        left: frameLeft,
        top: frameTop,
        width: sourceWidth,
        height: sourceHeight,
        cropX: 0,
        cropY: 0,
        scaleX: scale,
        scaleY: scale,
        frameWidth: displayWidth,
        frameHeight: displayHeight,
        frameLeft,
        frameTop,
        cropZoom: 1,
        objectPosition: { x: 0.5, y: 0.5 },
      });
    }
    image.setCoords();
  };
  const addText = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const text = applyTextOverflow(new Textbox('Double click to edit', {
      left: Math.max(24, canvas.getWidth() / 2 - 150),
      top: Math.max(24, canvas.getHeight() / 2 - 30),
      width: 300,
      frameWidth: 300,
      fontFamily: 'Arial',
      fontSize: 48,
      fontWeight: '400',
      fill: '#17212b',
      textAlign: 'center',
      id: createId('text'), name: 'Text', editorType: 'text', locked: false, editable: true,
      permissions: { editable: true, movable: true, resizable: true, rotatable: true, deletable: true, replaceable: false },
      lineHeight: 1.2,
      baseFontSize: 48,
    }), 'wrap', 80);
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.requestRenderAll();
    setStatus('Text added. Double-click it on the canvas to edit.');
    queueSnapshot();
  };
  const addImage = async (file, asBackground = false, aiMetadata = {}) => {
    if (!file) return;
    try {
      const source = await getImageAssetSource(file, aiMetadata);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const selected = activeObject();
      if (!asBackground && selected?.editorType === 'framed-image' && canMutate(selected, 'replaceable')) {
        return replaceSelectedImage(file, aiMetadata);
      }
      const image = await FabricImage.fromURL(resolveImageUrl(source), { crossOrigin: 'anonymous' });
      if (asBackground) {
        image.set({ scaleX: canvas.getWidth() / image.width, scaleY: canvas.getHeight() / image.height, selectable: false, evented: false });
        image.templateSrc = source;
        canvas.backgroundImage = image;
      } else {
        const maxDisplay = mode === 'customer'
          ? Math.min(Math.max(canvas.getWidth(), canvas.getHeight()) * 0.45, 640)
          : 360;
        const scale = Math.min(maxDisplay / image.width, maxDisplay / image.height, 1);
        const frameWidth = image.width * scale;
        const frameHeight = image.height * scale;
        const frameLeft = (canvas.getWidth() - frameWidth) / 2;
        const frameTop = (canvas.getHeight() - frameHeight) / 2;
        image.set({
          id: createId('image'), name: 'Image', editorType: 'image', locked: false, editable: true,
          templateSrc: source,
          source: aiMetadata.source || '',
          prompt: aiMetadata.prompt || '',
          imageRole: aiMetadata.imageRole || '',
          replaceable: true,
          permissions: { editable: true, movable: true, resizable: true, rotatable: true, replaceable: true, deletable: true },
        });
        if (mode === 'customer') {
          placeCustomerImage(image, frameLeft, frameTop, frameWidth, frameHeight);
        } else {
          fitImageToFrame(image, frameWidth, frameHeight, 1, { x: 0.5, y: 0.5 }, { mode: 'contain' });
          syncImageFrameGuide(image);
        }
        canvas.add(image);
        if (mode === 'customer') {
          canvas.sendObjectToBack(image);
          canvas.setActiveObject(image);
        } else {
          canvas.setActiveObject(image);
        }
      }
      canvas.requestRenderAll();
      setStatus(asBackground ? 'Background image added.' : 'Image added.');
      queueSnapshot();
      return true;
    } catch (error) {
      setStatus(error.message || 'Could not add this image.');
      return false;
    }
  };
  const generateAiArtwork = async (event) => {
    event.preventDefault();
    if (aiGenerating || !aiPrompt.trim()) return;
    setAiGenerating(true);
    setAiError('');
    setAiPreview('');
    try {
      const rolePrompts = {
        full: 'Complete banner artwork with clear space for editable typography',
        background: 'Wide decorative banner background, keep the central area uncluttered for editable typography',
        product: 'Commercial product photograph as the main visual subject, composed for a print banner',
        illustration: 'Decorative illustrated banner artwork with clear space for editable typography',
        portrait: 'Portrait or character as the main banner subject, composed with clear space for editable typography',
      };
      const prompt = [rolePrompts[aiImageRole], aiPrompt.trim(), aiStyle].filter(Boolean).join(', ');
      let response;
      if (aiEditSelected) {
        const selected = activeObject();
        const source = selected?.editorType === 'image' && selected.type === 'image'
          ? selected.templateSrc || selected.getSrc?.()
          : '';
        if (!source) throw new Error('Select an image layer with a loaded image before editing it.');
        const imageResponse = await fetch(resolveImageUrl(source));
        if (!imageResponse.ok) throw new Error('Could not load the selected image.');
        const imageBlob = await imageResponse.blob();
        const mimeType = imageBlob.type || 'image/png';
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(mimeType)) {
          throw new Error('Selected image must be PNG, JPG, or WebP.');
        }
        if (imageBlob.size > 15 * 1024 * 1024) throw new Error('Selected image must be 15 MB or smaller.');
        const form = new FormData();
        form.append('prompt', `${prompt}. Change the existing artwork as requested; do not render text, leave room for editable wording.`);
        form.append('steps', '4');
        form.append('image', new File([imageBlob], 'selected-design.png', { type: mimeType }));
        response = await api.post('/ai/edit', form);
      } else {
        response = await api.post('/ai/generate', {
          prompt,
          width: Number(aiWidth),
          height: Number(aiHeight),
          steps: 4,
        });
      }
      setAiPreview(response.data?.imageUrl || '');
      if (!response.data?.imageUrl) throw new Error('The image service returned no preview.');
    } catch (error) {
      setAiError(error.message || 'Unable to generate artwork. Check that the local AI service is running.');
    } finally {
      setAiGenerating(false);
    }
  };
  const useAiArtwork = async () => {
    if (!aiPreview) return;
    const metadata = { source: 'ai-generated', prompt: aiPrompt.trim(), imageRole: aiImageRole };
    const added = await addImage(aiPreview, false, metadata);
    if (!added) return;
    const image = activeObject();
    addAiTextLayers(image ? {
      left: image.left || 0,
      top: image.top || 0,
      width: image.frameWidth || image.getScaledWidth(),
      height: image.frameHeight || image.getScaledHeight(),
    } : null);
    setAiDialogOpen(false);
    setAiPreview('');
    setAiPrompt('');
    setAiHeadline('');
    setAiDescription('');
    setAiCallToAction('');
    setAiStyle('');
    setAiTextStyles(createDefaultAiTextStyles());
    setAiImageRole('full');
    setAiEditSelected(false);
  };
  const updateAiTextStyle = (fieldKey, property, value) => setAiTextStyles((current) => ({
    ...current,
    [fieldKey]: { ...current[fieldKey], [property]: value },
  }));
  const addAiTextLayers = (frame = null) => {
    const values = { headline: aiHeadline, description: aiDescription, callToAction: aiCallToAction };
    const textItems = AI_TEXT_FIELDS.filter((field) => values[field.key].trim());
    if (!textItems.length) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const frameWidth = frame?.width || canvas.getWidth();
    const frameHeight = frame?.height || canvas.getHeight();
    const frameLeft = frame?.left || 0;
    const frameTop = frame?.top || 0;
    const textWidth = frameWidth * 0.84;
    for (const item of textItems) {
      const style = aiTextStyles[item.key];
      const textHeight = frameHeight * item.height;
      const placement = style.placement === 'top' ? 0.08 : style.placement === 'bottom' ? 0.78 : item.key === 'description' ? 0.36 : 0.39;
      const fontSize = Math.max(8, Math.min(frameHeight * 0.3, style.fontSize));
      const text = applyTextOverflow(new Textbox(values[item.key].trim(), {
        left: style.textAlign === 'left' ? frameLeft + frameWidth * 0.08
          : style.textAlign === 'right' ? frameLeft + frameWidth * 0.08 + frameWidth - textWidth
            : frameLeft + (frameWidth - textWidth) / 2,
        top: frameTop + frameHeight * placement,
        width: textWidth,
        frameWidth: textWidth,
        fontFamily: style.fontFamily,
        fontSize,
        baseFontSize: fontSize,
        fontWeight: style.fontWeight,
        fontStyle: style.fontStyle,
        underline: style.underline,
        fill: style.color,
        stroke: style.stroke,
        strokeWidth: style.strokeWidth,
        textAlign: style.textAlign,
        charSpacing: style.letterSpacing,
        id: createId('text'),
        name: item.name,
        editorType: 'text',
        locked: false,
        editable: true,
        permissions: { editable: true, movable: true, resizable: true, rotatable: true, deletable: true, replaceable: false },
        lineHeight: style.lineHeight,
      }), 'shrink', textHeight);
      text.charSpacing = style.letterSpacing;
      canvas.add(text);
      canvas.setActiveObject(text);
    }
    canvas.requestRenderAll();
    queueSnapshot();
  };
  const replaceSelectedWithAiArtwork = async () => {
    if (!aiPreview) return;
    const current = activeObject();
    const frame = current && current.editorType === 'image'
      ? {
          left: current.left || 0,
          top: current.top || 0,
          width: current.frameWidth || current.getScaledWidth(),
          height: current.frameHeight || current.getScaledHeight(),
        }
      : null;
    const replaced = await replaceSelectedImage(aiPreview, { source: 'ai-generated', prompt: aiPrompt.trim(), imageRole: aiImageRole });
    if (!replaced) return;
    addAiTextLayers(frame);
    setAiDialogOpen(false);
    setAiPreview('');
    setAiPrompt('');
    setAiHeadline('');
    setAiDescription('');
    setAiCallToAction('');
    setAiStyle('');
    setAiTextStyles(createDefaultAiTextStyles());
    setAiImageRole('full');
    setAiEditSelected(false);
  };
  const addShape = (type) => {
    const canvas = canvasRef.current;
    if (!canvas || mode !== 'admin') return;
    const options = {
      left: canvas.getWidth() / 2 - 80,
      top: canvas.getHeight() / 2 - 60,
      fill: type === 'line' ? 'transparent' : '#d74c32',
      stroke: type === 'line' ? '#263536' : '',
      strokeWidth: type === 'line' ? 5 : 0,
      id: createId(type), name: type[0].toUpperCase() + type.slice(1), editorType: type,
      locked: false, editable: true,
      permissions: { editable: true, movable: true, resizable: true, rotatable: true, deletable: true, replaceable: false },
    };
    const shape = type === 'circle'
      ? new Circle({ ...options, radius: 65 })
      : type === 'line'
        ? new Line([0, 0, 180, 0], options)
        : new Rect({ ...options, width: 180, height: 120 });
    canvas.add(shape);
    canvas.setActiveObject(shape);
    canvas.requestRenderAll();
    queueSnapshot();
  };
  const addPhotoFrame = () => {
    const asset = getCatalogAssetById('mask-rectangle');
    if (asset) handleCatalogAsset(asset);
  };
  const handleCatalogAsset = async (asset) => {
    const canvas = canvasRef.current;
    if (!canvas || !asset) return;
    try {
      if (asset.type === 'element') {
        await insertCatalogElement({ canvas, asset, createId, resolveImageUrl });
      } else {
        await insertCatalogFrame({ canvas, asset, createId, resolveImageUrl });
      }
      canvas.requestRenderAll();
      queueSnapshot();
      refreshLayers();
      setStatus(`${asset.name} added. Drag it on the canvas to position.`);
    } catch (error) {
      setStatus(error.message || 'Could not add this asset.');
    }
  };
  const handleCanvasAssetDrop = async (event) => {
    event.preventDefault();
    const assetId = event.dataTransfer.getData(DRAG_MIME);
    const asset = getCatalogAssetById(assetId);
    if (asset) await handleCatalogAsset(asset);
  };
  const flipSelection = (axis) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object || object.locked) return;
    const targets = object.type === 'activeselection' ? object.getObjects() : [object];
    targets.forEach((item) => {
      if (axis === 'x') item.set('flipX', !item.flipX);
      if (axis === 'y') item.set('flipY', !item.flipY);
      if (item.editorType === 'framed-image') syncLinkedFrameBorder(canvas, item);
    });
    canvas.requestRenderAll();
    updateSelectionFromObject(object);
    queueSnapshot();
  };
  const replaceSelectedImage = async (file, aiMetadata = {}) => {
    const canvas = canvasRef.current;
    const current = activeObject();
    if (!file || !canvas || !current || !canMutate(current, 'replaceable')) return;
    if (current.editorType === 'framed-image') {
      try {
        const source = await getImageAssetSource(file, aiMetadata);
        const replacement = await fillFramedImageFromSource(current, source, resolveImageUrl);
        const index = canvas.getObjects().indexOf(current);
        canvas.remove(current);
        canvas.insertAt(index, replacement);
        canvas.setActiveObject(replacement);
        syncLinkedFrameBorder(canvas, replacement);
        const border = canvas.getObjects().find((item) => item.linkedFrameId === replacement.id);
        if (border) canvas.bringObjectToFront(border);
        canvas.bringObjectToFront(replacement);
        canvas.requestRenderAll();
        queueSnapshot();
        setStatus('Photo placed inside frame.');
        return true;
      } catch (error) {
        setStatus(error.message || 'Could not place photo in frame.');
        return false;
      }
    }
    if (current.editorType !== 'image') return;
    try {
      const source = await getImageAssetSource(file, aiMetadata);
      const replacement = await FabricImage.fromURL(resolveImageUrl(source), { crossOrigin: 'anonymous' });
      const frameWidth = current.frameWidth || current.width * (current.scaleX || 1) || current.getScaledWidth();
      const frameHeight = current.frameHeight || current.height * (current.scaleY || 1) || current.getScaledHeight();
      const frameLeft = current.frameLeft ?? current.left ?? 0;
      const frameTop = current.frameTop ?? current.top ?? 0;
      replacement.set({
        left: frameLeft,
        top: frameTop,
        angle: current.angle,
        id: current.id,
        name: current.name || 'Photo',
        editorType: 'image',
        templateSrc: source,
        source: aiMetadata.source || current.source || '',
        prompt: aiMetadata.prompt || current.prompt || '',
        imageRole: aiMetadata.imageRole || current.imageRole || '',
        replaceable: true,
        editable: current.editable,
        locked: current.locked,
        permissions: current.permissions,
        frameLeft,
        frameTop,
      });
      if (mode === 'customer') {
        placeCustomerImage(replacement, frameLeft, frameTop, frameWidth, frameHeight, { fillFrame: true });
        syncCustomerImageBounds(replacement);
      } else {
        fitImageToFrame(
          replacement,
          frameWidth,
          frameHeight,
          current.cropZoom || 1,
          current.objectPosition,
          { mode: 'cover' },
        );
      }
      const index = canvas.getObjects().indexOf(current);
      canvas.remove(current);
      canvas.insertAt(index, replacement);
      canvas.setActiveObject(replacement);
      canvas.bringObjectToFront(replacement);
      canvas.requestRenderAll();
      queueSnapshot();
      setStatus('Photo replaced.');
      return true;
    } catch (error) {
      setStatus(error.message || 'Could not replace this photo.');
      return false;
    }
  };
  const getObjectAspectRatio = (object) => {
    if (!object) return null;
    const width = object.frameWidth || object.getScaledWidth?.() || object.width || 0;
    const height = object.frameHeight || object.getScaledHeight?.() || object.height || 0;
    if (!width || !height) return null;
    return width / height;
  };
  const applyQuickStylePreset = (preset) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const presets = {
      minimal: {
        stroke: 'transparent',
        strokeWidth: 0,
        shadowColor: '#000000',
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
      },
      softShadow: {
        stroke: 'transparent',
        strokeWidth: 0,
        shadowColor: '#000000',
        shadowBlur: 18,
        shadowOffsetX: 6,
        shadowOffsetY: 8,
      },
      boldOutline: {
        stroke: '#17212b',
        strokeWidth: 3,
        shadowColor: '#000000',
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
      },
    };
    const style = presets[preset];
    if (!style) return;
    object.set({
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      shadow: style.shadowBlur === 0 && style.shadowOffsetX === 0 && style.shadowOffsetY === 0
        ? null
        : new fabric.Shadow({
          color: style.shadowColor,
          blur: style.shadowBlur,
          offsetX: style.shadowOffsetX,
          offsetY: style.shadowOffsetY,
        }),
    });
    object.setCoords();
    canvas.requestRenderAll();
    setShadowColor(style.shadowColor);
    setShadowBlur(style.shadowBlur);
    setShadowOffsetX(style.shadowOffsetX);
    setShadowOffsetY(style.shadowOffsetY);
    setSelection((current) => ({
      ...current,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
    }));
    queueSnapshot();
  };
  const applyOpacityPreset = (preset) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const next = { '25%': 0.25, '50%': 0.5, '75%': 0.75, '100%': 1 }[preset] ?? object.opacity ?? 1;
    object.set('opacity', next);
    object.setCoords();
    canvas.requestRenderAll();
    setSelection((current) => ({ ...current, opacity: next }));
    queueSnapshot();
  };
  const applyEffectPreset = (preset) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const presets = {
      softGlow: {
        stroke: '#ffffff',
        strokeWidth: 2,
        shadowColor: '#d74c32',
        shadowBlur: 18,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
      },
      matte: {
        stroke: 'transparent',
        strokeWidth: 0,
        shadowColor: '#000000',
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        opacity: 0.82,
      },
      premiumBorder: {
        stroke: '#202a2b',
        strokeWidth: 3,
        shadowColor: '#737d78',
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
      },
      punchyOverlay: {
        stroke: '#f8d4a9',
        strokeWidth: 2,
        shadowColor: '#c97d2d',
        shadowBlur: 14,
        shadowOffsetX: 4,
        shadowOffsetY: 4,
        opacity: 0.9,
      },
    };
    const style = presets[preset];
    if (!style) return;
    object.set({
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity ?? object.opacity ?? 1,
      shadow: style.shadowBlur === 0 && style.shadowOffsetX === 0 && style.shadowOffsetY === 0 ? null : new fabric.Shadow({
        color: style.shadowColor,
        blur: style.shadowBlur,
        offsetX: style.shadowOffsetX,
        offsetY: style.shadowOffsetY,
      }),
    });
    object.setCoords();
    canvas.requestRenderAll();
    setShadowColor(style.shadowColor);
    setShadowBlur(style.shadowBlur);
    setShadowOffsetX(style.shadowOffsetX);
    setShadowOffsetY(style.shadowOffsetY);
    setSelection((current) => ({
      ...current,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
      opacity: style.opacity ?? current.opacity ?? 1,
    }));
    queueSnapshot();
  };
  const applyBrandPreset = (preset) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const presets = {
      luxury: {
        fill: '#f7ebdb',
        stroke: '#a87445',
        strokeWidth: 2,
        shadowColor: '#3b2d23',
        shadowBlur: 18,
        shadowOffsetX: 0,
        shadowOffsetY: 6,
        opacity: 0.96,
      },
      streetPop: {
        fill: '#ff6b45',
        stroke: '#fef4db',
        strokeWidth: 3,
        shadowColor: '#ff8d5b',
        shadowBlur: 16,
        shadowOffsetX: 3,
        shadowOffsetY: 3,
        opacity: 1,
      },
      quietLuxury: {
        fill: '#f4f0ea',
        stroke: '#6e756e',
        strokeWidth: 1,
        shadowColor: '#1f2321',
        shadowBlur: 12,
        shadowOffsetX: 0,
        shadowOffsetY: 2,
        opacity: 0.9,
      },
      editorialLuxe: {
        fill: '#ffffff',
        stroke: '#1b1d1a',
        strokeWidth: 2,
        shadowColor: '#1b1d1a',
        shadowBlur: 10,
        shadowOffsetX: 2,
        shadowOffsetY: 4,
        opacity: 0.98,
      },
    };
    const style = presets[preset];
    if (!style) return;
    const nextFill = style.fill ?? object.fill;
    object.set({
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity ?? object.opacity ?? 1,
      shadow: style.shadowBlur === 0 && style.shadowOffsetX === 0 && style.shadowOffsetY === 0 ? null : new fabric.Shadow({
        color: style.shadowColor,
        blur: style.shadowBlur,
        offsetX: style.shadowOffsetX,
        offsetY: style.shadowOffsetY,
      }),
    });
    object.setCoords();
    canvas.requestRenderAll();
    setShadowColor(style.shadowColor);
    setShadowBlur(style.shadowBlur);
    setShadowOffsetX(style.shadowOffsetX);
    setShadowOffsetY(style.shadowOffsetY);
    setSelection((current) => ({
      ...current,
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
      opacity: style.opacity ?? current.opacity ?? 1,
    }));
    queueSnapshot();
  };
  const applyPrintFinishPreset = (preset) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const presets = {
      foil: {
        fill: '#f4d381',
        stroke: '#d9a423',
        strokeWidth: 2,
        shadowColor: '#6a4a00',
        shadowBlur: 12,
        shadowOffsetX: 0,
        shadowOffsetY: 2,
        opacity: 0.98,
      },
      matteFinish: {
        fill: '#f0ece6',
        stroke: '#514e4a',
        strokeWidth: 1,
        shadowColor: '#000000',
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        opacity: 0.82,
      },
      softEmboss: {
        fill: '#efe7dc',
        stroke: '#7c6d54',
        strokeWidth: 1,
        shadowColor: '#2a241a',
        shadowBlur: 14,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        opacity: 0.94,
      },
      vintagePaper: {
        fill: '#e6d9c5',
        stroke: '#8a6745',
        strokeWidth: 2,
        shadowColor: '#8b6b4b',
        shadowBlur: 8,
        shadowOffsetX: 0,
        shadowOffsetY: 1,
        opacity: 0.9,
      },
    };
    const style = presets[preset];
    if (!style) return;
    const nextFill = style.fill ?? object.fill;
    object.set({
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity ?? object.opacity ?? 1,
      shadow: style.shadowBlur === 0 && style.shadowOffsetX === 0 && style.shadowOffsetY === 0 ? null : new fabric.Shadow({
        color: style.shadowColor,
        blur: style.shadowBlur,
        offsetX: style.shadowOffsetX,
        offsetY: style.shadowOffsetY,
      }),
    });
    object.setCoords();
    canvas.requestRenderAll();
    setShadowColor(style.shadowColor);
    setShadowBlur(style.shadowBlur);
    setShadowOffsetX(style.shadowOffsetX);
    setShadowOffsetY(style.shadowOffsetY);
    setSelection((current) => ({
      ...current,
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
      opacity: style.opacity ?? current.opacity ?? 1,
    }));
    queueSnapshot();
  };
  const applyCompositionPreset = (preset) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const presets = {
      centerStage: {
        angle: 0,
        shadowColor: '#1f2321',
        shadowBlur: 12,
        shadowOffsetX: 0,
        shadowOffsetY: 10,
        opacity: 1,
      },
      splitBanner: {
        angle: 0,
        shadowColor: '#23303a',
        shadowBlur: 10,
        shadowOffsetX: 2,
        shadowOffsetY: 4,
        opacity: 0.94,
      },
      focusFrame: {
        angle: 0,
        shadowColor: '#1e2a2a',
        shadowBlur: 16,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        opacity: 0.96,
      },
      badgeStack: {
        angle: 5,
        shadowColor: '#1e1e1e',
        shadowBlur: 8,
        shadowOffsetX: 2,
        shadowOffsetY: 3,
        opacity: 0.98,
      },
    };
    const style = presets[preset];
    if (!style) return;
    object.set({
      angle: style.angle,
      opacity: style.opacity ?? object.opacity ?? 1,
      shadow: new fabric.Shadow({
        color: style.shadowColor,
        blur: style.shadowBlur,
        offsetX: style.shadowOffsetX,
        offsetY: style.shadowOffsetY,
      }),
    });
    object.setCoords();
    canvas.requestRenderAll();
    setShadowColor(style.shadowColor);
    setShadowBlur(style.shadowBlur);
    setShadowOffsetX(style.shadowOffsetX);
    setShadowOffsetY(style.shadowOffsetY);
    setSelection((current) => ({
      ...current,
      angle: style.angle,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
      opacity: style.opacity ?? current.opacity ?? 1,
    }));
    queueSnapshot();
  };
  const applyCampaignMockupPreset = (preset) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const presets = {
      heroBanner: {
        fill: '#f7f4ed',
        stroke: '#d6c7ac',
        strokeWidth: 2,
        shadowColor: '#1d1b1a',
        shadowBlur: 14,
        shadowOffsetX: 0,
        shadowOffsetY: 8,
        opacity: 1,
      },
      socialCard: {
        fill: '#ffe4cd',
        stroke: '#cf7d38',
        strokeWidth: 2,
        shadowColor: '#a95018',
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowOffsetY: 4,
        opacity: 0.96,
      },
      productSpotlight: {
        fill: '#e6f0f3',
        stroke: '#2a5f74',
        strokeWidth: 2,
        shadowColor: '#224a4d',
        shadowBlur: 12,
        shadowOffsetX: 3,
        shadowOffsetY: 3,
        opacity: 0.97,
      },
      posterTile: {
        fill: '#f7e9e8',
        stroke: '#a66c6a',
        strokeWidth: 2,
        shadowColor: '#5d2a2c',
        shadowBlur: 16,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        opacity: 0.98,
      },
    };
    const style = presets[preset];
    if (!style) return;
    const nextFill = style.fill ?? object.fill;
    object.set({
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity ?? object.opacity ?? 1,
      shadow: new fabric.Shadow({
        color: style.shadowColor,
        blur: style.shadowBlur,
        offsetX: style.shadowOffsetX,
        offsetY: style.shadowOffsetY,
      }),
    });
    object.setCoords();
    canvas.requestRenderAll();
    setShadowColor(style.shadowColor);
    setShadowBlur(style.shadowBlur);
    setShadowOffsetX(style.shadowOffsetX);
    setShadowOffsetY(style.shadowOffsetY);
    setSelection((current) => ({
      ...current,
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
      opacity: style.opacity ?? current.opacity ?? 1,
    }));
    queueSnapshot();
  };
  const applyPackagingPreset = (preset) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const presets = {
      boxHero: {
        fill: '#f8eddd',
        stroke: '#a36a43',
        strokeWidth: 2,
        shadowColor: '#3b2f1f',
        shadowBlur: 14,
        shadowOffsetX: 0,
        shadowOffsetY: 6,
        opacity: 0.97,
      },
      shelfCard: {
        fill: '#fef2df',
        stroke: '#c47b42',
        strokeWidth: 2,
        shadowColor: '#8f4d25',
        shadowBlur: 12,
        shadowOffsetX: 1,
        shadowOffsetY: 3,
        opacity: 0.98,
      },
      luxuryWrap: {
        fill: '#f4eee5',
        stroke: '#4a4a4a',
        strokeWidth: 1,
        shadowColor: '#1d1d1d',
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowOffsetY: 2,
        opacity: 0.93,
      },
      productSeal: {
        fill: '#f6d7b6',
        stroke: '#8d4e25',
        strokeWidth: 3,
        shadowColor: '#6d3a17',
        shadowBlur: 16,
        shadowOffsetX: 0,
        shadowOffsetY: 4,
        opacity: 1,
      },
    };
    const style = presets[preset];
    if (!style) return;
    const nextFill = style.fill ?? object.fill;
    object.set({
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity ?? object.opacity ?? 1,
      shadow: new fabric.Shadow({
        color: style.shadowColor,
        blur: style.shadowBlur,
        offsetX: style.shadowOffsetX,
        offsetY: style.shadowOffsetY,
      }),
    });
    object.setCoords();
    canvas.requestRenderAll();
    setShadowColor(style.shadowColor);
    setShadowBlur(style.shadowBlur);
    setShadowOffsetX(style.shadowOffsetX);
    setShadowOffsetY(style.shadowOffsetY);
    setSelection((current) => ({
      ...current,
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
      opacity: style.opacity ?? current.opacity ?? 1,
    }));
    queueSnapshot();
  };
  const applyRetailDisplayPreset = (preset) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const presets = {
      shelfHero: {
        fill: '#f3e3cf',
        stroke: '#b76b40',
        strokeWidth: 2,
        shadowColor: '#884f23',
        shadowBlur: 16,
        shadowOffsetX: 0,
        shadowOffsetY: 6,
        opacity: 0.96,
      },
      counterStack: {
        fill: '#fdf0cc',
        stroke: '#c88e2f',
        strokeWidth: 2,
        shadowColor: '#7d5825',
        shadowBlur: 12,
        shadowOffsetX: 2,
        shadowOffsetY: 3,
        opacity: 0.97,
      },
      windowPromo: {
        fill: '#fce8ea',
        stroke: '#d66273',
        strokeWidth: 2,
        shadowColor: '#7d2a39',
        shadowBlur: 14,
        shadowOffsetX: 1,
        shadowOffsetY: 3,
        opacity: 0.95,
      },
      giftSet: {
        fill: '#e9f0ea',
        stroke: '#49614d',
        strokeWidth: 2,
        shadowColor: '#253829',
        shadowBlur: 12,
        shadowOffsetX: 0,
        shadowOffsetY: 4,
        opacity: 0.98,
      },
    };
    const style = presets[preset];
    if (!style) return;
    const nextFill = style.fill ?? object.fill;
    object.set({
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity ?? object.opacity ?? 1,
      shadow: new fabric.Shadow({
        color: style.shadowColor,
        blur: style.shadowBlur,
        offsetX: style.shadowOffsetX,
        offsetY: style.shadowOffsetY,
      }),
    });
    object.setCoords();
    canvas.requestRenderAll();
    setShadowColor(style.shadowColor);
    setShadowBlur(style.shadowBlur);
    setShadowOffsetX(style.shadowOffsetX);
    setShadowOffsetY(style.shadowOffsetY);
    setSelection((current) => ({
      ...current,
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
      opacity: style.opacity ?? current.opacity ?? 1,
    }));
    queueSnapshot();
  };
  const applyEventPromoPreset = (preset) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const presets = {
      launchStage: {
        fill: '#f3e7ff',
        stroke: '#8a5dd6',
        strokeWidth: 2,
        shadowColor: '#3d2766',
        shadowBlur: 18,
        shadowOffsetX: 0,
        shadowOffsetY: 7,
        opacity: 0.96,
      },
      vipInvite: {
        fill: '#f5d9c7',
        stroke: '#bb6f42',
        strokeWidth: 2,
        shadowColor: '#6d3b28',
        shadowBlur: 12,
        shadowOffsetX: 1,
        shadowOffsetY: 3,
        opacity: 0.97,
      },
      popBooth: {
        fill: '#e3f4f7',
        stroke: '#206a7d',
        strokeWidth: 2,
        shadowColor: '#204a58',
        shadowBlur: 14,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        opacity: 0.96,
      },
      festivalSplash: {
        fill: '#fff0d2',
        stroke: '#d68f16',
        strokeWidth: 2,
        shadowColor: '#7d4a16',
        shadowBlur: 14,
        shadowOffsetX: 0,
        shadowOffsetY: 4,
        opacity: 0.98,
      },
    };
    const style = presets[preset];
    if (!style) return;
    const nextFill = style.fill ?? object.fill;
    object.set({
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity ?? object.opacity ?? 1,
      shadow: new fabric.Shadow({
        color: style.shadowColor,
        blur: style.shadowBlur,
        offsetX: style.shadowOffsetX,
        offsetY: style.shadowOffsetY,
      }),
    });
    object.setCoords();
    canvas.requestRenderAll();
    setShadowColor(style.shadowColor);
    setShadowBlur(style.shadowBlur);
    setShadowOffsetX(style.shadowOffsetX);
    setShadowOffsetY(style.shadowOffsetY);
    setSelection((current) => ({
      ...current,
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
      opacity: style.opacity ?? current.opacity ?? 1,
    }));
    queueSnapshot();
  };
  const applyVibePreset = (preset) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const presets = {
      neonPulse: {
        fill: '#ff5f6d',
        stroke: '#ffe66d',
        strokeWidth: 2,
        shadowColor: '#ff4f97',
        shadowBlur: 18,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        opacity: 1,
      },
      warmStudio: {
        fill: '#f7d9b8',
        stroke: '#b86b46',
        strokeWidth: 2,
        shadowColor: '#7a5633',
        shadowBlur: 12,
        shadowOffsetX: 1,
        shadowOffsetY: 4,
        opacity: 0.96,
      },
      monochromeDrift: {
        fill: '#e8e6e1',
        stroke: '#2b2d30',
        strokeWidth: 1,
        shadowColor: '#202224',
        shadowBlur: 8,
        shadowOffsetX: 0,
        shadowOffsetY: 2,
        opacity: 0.92,
      },
      weekendGlow: {
        fill: '#dff7f2',
        stroke: '#3aa784',
        strokeWidth: 2,
        shadowColor: '#1a7f65',
        shadowBlur: 14,
        shadowOffsetX: 0,
        shadowOffsetY: 4,
        opacity: 0.97,
      },
    };
    const style = presets[preset];
    if (!style) return;
    const nextFill = style.fill ?? object.fill;
    object.set({
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity ?? object.opacity ?? 1,
      shadow: new fabric.Shadow({
        color: style.shadowColor,
        blur: style.shadowBlur,
        offsetX: style.shadowOffsetX,
        offsetY: style.shadowOffsetY,
      }),
    });
    object.setCoords();
    canvas.requestRenderAll();
    setShadowColor(style.shadowColor);
    setShadowBlur(style.shadowBlur);
    setShadowOffsetX(style.shadowOffsetX);
    setShadowOffsetY(style.shadowOffsetY);
    setSelection((current) => ({
      ...current,
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
      opacity: style.opacity ?? current.opacity ?? 1,
    }));
    queueSnapshot();
  };
  const applyMaterialTexturePreset = (preset) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const presets = {
      stoneGrain: {
        fill: '#d9d3ca',
        stroke: '#6e675c',
        strokeWidth: 1,
        shadowColor: '#3a352f',
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowOffsetY: 2,
        opacity: 0.94,
      },
      cottonWeave: {
        fill: '#f4f0ea',
        stroke: '#a39a8d',
        strokeWidth: 1,
        shadowColor: '#5a5148',
        shadowBlur: 9,
        shadowOffsetX: 1,
        shadowOffsetY: 2,
        opacity: 0.93,
      },
      brushedMetal: {
        fill: '#aab7c3',
        stroke: '#677985',
        strokeWidth: 2,
        shadowColor: '#2d3841',
        shadowBlur: 12,
        shadowOffsetX: 0,
        shadowOffsetY: 3,
        opacity: 0.95,
      },
      softSuede: {
        fill: '#d9c7b0',
        stroke: '#8a6f52',
        strokeWidth: 2,
        shadowColor: '#5b4330',
        shadowBlur: 12,
        shadowOffsetX: 0,
        shadowOffsetY: 3,
        opacity: 0.96,
      },
    };
    const style = presets[preset];
    if (!style) return;
    const nextFill = style.fill ?? object.fill;
    object.set({
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity ?? object.opacity ?? 1,
      shadow: new fabric.Shadow({
        color: style.shadowColor,
        blur: style.shadowBlur,
        offsetX: style.shadowOffsetX,
        offsetY: style.shadowOffsetY,
      }),
    });
    object.setCoords();
    canvas.requestRenderAll();
    setShadowColor(style.shadowColor);
    setShadowBlur(style.shadowBlur);
    setShadowOffsetX(style.shadowOffsetX);
    setShadowOffsetY(style.shadowOffsetY);
    setSelection((current) => ({
      ...current,
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
      opacity: style.opacity ?? current.opacity ?? 1,
    }));
    queueSnapshot();
  };
  const applyPrintMoodPreset = (preset) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const presets = {
      inkWash: {
        fill: '#f1ece5',
        stroke: '#5a5652',
        strokeWidth: 1,
        shadowColor: '#2c2b2a',
        shadowBlur: 9,
        shadowOffsetX: 0,
        shadowOffsetY: 2,
        opacity: 0.93,
      },
      posterGrain: {
        fill: '#f7d7b2',
        stroke: '#8b5c2d',
        strokeWidth: 2,
        shadowColor: '#5a3516',
        shadowBlur: 12,
        shadowOffsetX: 1,
        shadowOffsetY: 3,
        opacity: 0.95,
      },
      newsprint: {
        fill: '#e6dfd1',
        stroke: '#5b534b',
        strokeWidth: 1,
        shadowColor: '#2d2b2b',
        shadowBlur: 8,
        shadowOffsetX: 0,
        shadowOffsetY: 2,
        opacity: 0.9,
      },
      softGloss: {
        fill: '#f4e9f7',
        stroke: '#8a5fc8',
        strokeWidth: 2,
        shadowColor: '#4d2e72',
        shadowBlur: 14,
        shadowOffsetX: 0,
        shadowOffsetY: 4,
        opacity: 0.98,
      },
    };
    const style = presets[preset];
    if (!style) return;
    const nextFill = style.fill ?? object.fill;
    object.set({
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity ?? object.opacity ?? 1,
      shadow: new fabric.Shadow({
        color: style.shadowColor,
        blur: style.shadowBlur,
        offsetX: style.shadowOffsetX,
        offsetY: style.shadowOffsetY,
      }),
    });
    object.setCoords();
    canvas.requestRenderAll();
    setShadowColor(style.shadowColor);
    setShadowBlur(style.shadowBlur);
    setShadowOffsetX(style.shadowOffsetX);
    setShadowOffsetY(style.shadowOffsetY);
    setSelection((current) => ({
      ...current,
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
      opacity: style.opacity ?? current.opacity ?? 1,
    }));
    queueSnapshot();
  };
  const applyEditorialMoodPreset = (preset) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const presets = {
      galleryNoir: {
        fill: '#171c1d',
        stroke: '#d8c4a4',
        strokeWidth: 2,
        shadowColor: '#010101',
        shadowBlur: 18,
        shadowOffsetX: 0,
        shadowOffsetY: 4,
        opacity: 0.96,
      },
      softArchive: {
        fill: '#f1e8dc',
        stroke: '#716c66',
        strokeWidth: 1,
        shadowColor: '#2a2625',
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowOffsetY: 2,
        opacity: 0.92,
      },
      springBloom: {
        fill: '#f8dfe8',
        stroke: '#c35d75',
        strokeWidth: 2,
        shadowColor: '#8a2b44',
        shadowBlur: 14,
        shadowOffsetX: 0,
        shadowOffsetY: 4,
        opacity: 0.97,
      },
      studioContour: {
        fill: '#edf4f2',
        stroke: '#2d2d2d',
        strokeWidth: 1,
        shadowColor: '#4d4d4d',
        shadowBlur: 8,
        shadowOffsetX: 0,
        shadowOffsetY: 2,
        opacity: 0.94,
      },
    };
    const style = presets[preset];
    if (!style) return;
    const nextFill = style.fill ?? object.fill;
    object.set({
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity ?? object.opacity ?? 1,
      shadow: new fabric.Shadow({
        color: style.shadowColor,
        blur: style.shadowBlur,
        offsetX: style.shadowOffsetX,
        offsetY: style.shadowOffsetY,
      }),
    });
    object.setCoords();
    canvas.requestRenderAll();
    setShadowColor(style.shadowColor);
    setShadowBlur(style.shadowBlur);
    setShadowOffsetX(style.shadowOffsetX);
    setShadowOffsetY(style.shadowOffsetY);
    setSelection((current) => ({
      ...current,
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
      opacity: style.opacity ?? current.opacity ?? 1,
    }));
    queueSnapshot();
  };
  const applySeasonalPalettePreset = (preset) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const presets = {
      summerPop: {
        fill: '#ffb84d',
        stroke: '#ff6b3d',
        strokeWidth: 2,
        shadowColor: '#d9485f',
        shadowBlur: 14,
        shadowOffsetX: 0,
        shadowOffsetY: 4,
        opacity: 1,
      },
      autumnDusk: {
        fill: '#d9774c',
        stroke: '#7c3a1b',
        strokeWidth: 2,
        shadowColor: '#503226',
        shadowBlur: 12,
        shadowOffsetX: 0,
        shadowOffsetY: 3,
        opacity: 0.97,
      },
      winterFrost: {
        fill: '#dfeaf7',
        stroke: '#6d9cc7',
        strokeWidth: 1,
        shadowColor: '#456c8f',
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowOffsetY: 2,
        opacity: 0.94,
      },
      monsoonMist: {
        fill: '#d9efe8',
        stroke: '#4f8a7d',
        strokeWidth: 1,
        shadowColor: '#416b62',
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowOffsetY: 2,
        opacity: 0.96,
      },
    };
    const style = presets[preset];
    if (!style) return;
    const nextFill = style.fill ?? object.fill;
    object.set({
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity ?? object.opacity ?? 1,
      shadow: new fabric.Shadow({
        color: style.shadowColor,
        blur: style.shadowBlur,
        offsetX: style.shadowOffsetX,
        offsetY: style.shadowOffsetY,
      }),
    });
    object.setCoords();
    canvas.requestRenderAll();
    setShadowColor(style.shadowColor);
    setShadowBlur(style.shadowBlur);
    setShadowOffsetX(style.shadowOffsetX);
    setShadowOffsetY(style.shadowOffsetY);
    setSelection((current) => ({
      ...current,
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
      opacity: style.opacity ?? current.opacity ?? 1,
    }));
    queueSnapshot();
  };
  const applyArtDirectionPreset = (preset) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const presets = {
      minimalForm: {
        fill: '#f3f0eb',
        stroke: '#2d2d2d',
        strokeWidth: 1,
        shadowColor: '#111111',
        shadowBlur: 8,
        shadowOffsetX: 0,
        shadowOffsetY: 2,
        opacity: 0.94,
      },
      boldGesture: {
        fill: '#f05d5e',
        stroke: '#2b1d1d',
        strokeWidth: 3,
        shadowColor: '#7a2525',
        shadowBlur: 15,
        shadowOffsetX: 2,
        shadowOffsetY: 4,
        opacity: 0.99,
      },
      layeredCollage: {
        fill: '#d9d3f0',
        stroke: '#4c4e8f',
        strokeWidth: 2,
        shadowColor: '#3c3d61',
        shadowBlur: 12,
        shadowOffsetX: 1,
        shadowOffsetY: 3,
        opacity: 0.96,
      },
      handDrawnSketch: {
        fill: '#f8f3ef',
        stroke: '#5f4c3c',
        strokeWidth: 1,
        shadowColor: '#6d5747',
        shadowBlur: 9,
        shadowOffsetX: 0,
        shadowOffsetY: 3,
        opacity: 0.92,
      },
    };
    const style = presets[preset];
    if (!style) return;
    const nextFill = style.fill ?? object.fill;
    object.set({
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity ?? object.opacity ?? 1,
      shadow: new fabric.Shadow({
        color: style.shadowColor,
        blur: style.shadowBlur,
        offsetX: style.shadowOffsetX,
        offsetY: style.shadowOffsetY,
      }),
    });
    object.setCoords();
    canvas.requestRenderAll();
    setShadowColor(style.shadowColor);
    setShadowBlur(style.shadowBlur);
    setShadowOffsetX(style.shadowOffsetX);
    setShadowOffsetY(style.shadowOffsetY);
    setSelection((current) => ({
      ...current,
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
      opacity: style.opacity ?? current.opacity ?? 1,
    }));
    queueSnapshot();
  };
  const applyLuxuryTexturePreset = (preset) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const presets = {
      pearlSatin: {
        fill: '#f5f1ee',
        stroke: '#bca98f',
        strokeWidth: 2,
        shadowColor: '#4b4139',
        shadowBlur: 12,
        shadowOffsetX: 0,
        shadowOffsetY: 3,
        opacity: 0.96,
      },
      velvetGrain: {
        fill: '#6f5268',
        stroke: '#f2d9bd',
        strokeWidth: 2,
        shadowColor: '#291d25',
        shadowBlur: 16,
        shadowOffsetX: 0,
        shadowOffsetY: 4,
        opacity: 0.96,
      },
      champagneGloss: {
        fill: '#f6dfaf',
        stroke: '#a97438',
        strokeWidth: 2,
        shadowColor: '#6d4d17',
        shadowBlur: 15,
        shadowOffsetX: 0,
        shadowOffsetY: 3,
        opacity: 0.98,
      },
      ebonyLacquer: {
        fill: '#2a2d31',
        stroke: '#d7d7d7',
        strokeWidth: 2,
        shadowColor: '#0b0c0d',
        shadowBlur: 14,
        shadowOffsetX: 0,
        shadowOffsetY: 4,
        opacity: 0.97,
      },
    };
    const style = presets[preset];
    if (!style) return;
    const nextFill = style.fill ?? object.fill;
    object.set({
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity ?? object.opacity ?? 1,
      shadow: new fabric.Shadow({
        color: style.shadowColor,
        blur: style.shadowBlur,
        offsetX: style.shadowOffsetX,
        offsetY: style.shadowOffsetY,
      }),
    });
    object.setCoords();
    canvas.requestRenderAll();
    setShadowColor(style.shadowColor);
    setShadowBlur(style.shadowBlur);
    setShadowOffsetX(style.shadowOffsetX);
    setShadowOffsetY(style.shadowOffsetY);
    setSelection((current) => ({
      ...current,
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
      opacity: style.opacity ?? current.opacity ?? 1,
    }));
    queueSnapshot();
  };
  const applyAtmospherePreset = (preset) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const presets = {
      glassGlow: {
        fill: '#ebf7ff',
        stroke: '#8cc7ff',
        strokeWidth: 2,
        shadowColor: '#7aa9ff',
        shadowBlur: 18,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        opacity: 0.97,
      },
      sunsetHaze: {
        fill: '#ffe4d0',
        stroke: '#ff9d76',
        strokeWidth: 2,
        shadowColor: '#ffb385',
        shadowBlur: 20,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        opacity: 0.96,
      },
      studioFog: {
        fill: '#edf1f5',
        stroke: '#b6bec9',
        strokeWidth: 1,
        shadowColor: '#8a94a6',
        shadowBlur: 16,
        shadowOffsetX: 0,
        shadowOffsetY: 8,
        opacity: 0.94,
      },
      neonBloom: {
        fill: '#f7e7ff',
        stroke: '#d76dff',
        strokeWidth: 2,
        shadowColor: '#b64cf9',
        shadowBlur: 22,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        opacity: 0.99,
      },
    };
    const style = presets[preset];
    if (!style) return;
    const nextFill = style.fill ?? object.fill;
    object.set({
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity ?? object.opacity ?? 1,
      shadow: new fabric.Shadow({
        color: style.shadowColor,
        blur: style.shadowBlur,
        offsetX: style.shadowOffsetX,
        offsetY: style.shadowOffsetY,
      }),
    });
    object.setCoords();
    canvas.requestRenderAll();
    setShadowColor(style.shadowColor);
    setShadowBlur(style.shadowBlur);
    setShadowOffsetX(style.shadowOffsetX);
    setShadowOffsetY(style.shadowOffsetY);
    setSelection((current) => ({
      ...current,
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
      opacity: style.opacity ?? current.opacity ?? 1,
    }));
    queueSnapshot();
  };
  const applyDepthLayerPreset = (preset) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const presets = {
      softShadow: {
        fill: '#ffffff',
        stroke: '#d4d5d9',
        strokeWidth: 1,
        shadowColor: '#8f9bb0',
        shadowBlur: 18,
        shadowOffsetX: 0,
        shadowOffsetY: 10,
        opacity: 0.96,
      },
      luminousHaze: {
        fill: '#ebf1ff',
        stroke: '#6ea3ff',
        strokeWidth: 2,
        shadowColor: '#a0c6ff',
        shadowBlur: 24,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        opacity: 0.98,
      },
      cinematicGlow: {
        fill: '#f6d4b8',
        stroke: '#d2702d',
        strokeWidth: 2,
        shadowColor: '#ff9b61',
        shadowBlur: 20,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        opacity: 0.97,
      },
      midnightFade: {
        fill: '#1f2430',
        stroke: '#8fa7c6',
        strokeWidth: 2,
        shadowColor: '#0c1424',
        shadowBlur: 16,
        shadowOffsetX: 0,
        shadowOffsetY: 6,
        opacity: 0.95,
      },
    };
    const style = presets[preset];
    if (!style) return;
    const nextFill = style.fill ?? object.fill;
    object.set({
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity ?? object.opacity ?? 1,
      shadow: new fabric.Shadow({
        color: style.shadowColor,
        blur: style.shadowBlur,
        offsetX: style.shadowOffsetX,
        offsetY: style.shadowOffsetY,
      }),
    });
    object.setCoords();
    canvas.requestRenderAll();
    setShadowColor(style.shadowColor);
    setShadowBlur(style.shadowBlur);
    setShadowOffsetX(style.shadowOffsetX);
    setShadowOffsetY(style.shadowOffsetY);
    setSelection((current) => ({
      ...current,
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
      opacity: style.opacity ?? current.opacity ?? 1,
    }));
    queueSnapshot();
  };
  const applyHighlightPassPreset = (preset) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const presets = {
      softRim: {
        fill: '#ffffff',
        stroke: '#d8e8ff',
        strokeWidth: 2,
        shadowColor: '#8baeff',
        shadowBlur: 14,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        opacity: 0.98,
      },
      edgeLight: {
        fill: '#fcf2d8',
        stroke: '#ffc66f',
        strokeWidth: 2,
        shadowColor: '#ffb64d',
        shadowBlur: 18,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        opacity: 0.97,
      },
      haloBloom: {
        fill: '#ebf7ff',
        stroke: '#7ad9ff',
        strokeWidth: 2,
        shadowColor: '#87d6ff',
        shadowBlur: 22,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        opacity: 0.99,
      },
      spotlightWash: {
        fill: '#f0e5ff',
        stroke: '#b980ff',
        strokeWidth: 2,
        shadowColor: '#b29cff',
        shadowBlur: 20,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        opacity: 0.98,
      },
    };
    const style = presets[preset];
    if (!style) return;
    const nextFill = style.fill ?? object.fill;
    object.set({
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity ?? object.opacity ?? 1,
      shadow: new fabric.Shadow({
        color: style.shadowColor,
        blur: style.shadowBlur,
        offsetX: style.shadowOffsetX,
        offsetY: style.shadowOffsetY,
      }),
    });
    object.setCoords();
    canvas.requestRenderAll();
    setShadowColor(style.shadowColor);
    setShadowBlur(style.shadowBlur);
    setShadowOffsetX(style.shadowOffsetX);
    setShadowOffsetY(style.shadowOffsetY);
    setSelection((current) => ({
      ...current,
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
      opacity: style.opacity ?? current.opacity ?? 1,
    }));
    queueSnapshot();
  };
  const applyFocusStackPreset = (preset) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const presets = {
      depthFocus: {
        fill: '#f6f4ef',
        stroke: '#7c8ca8',
        strokeWidth: 2,
        shadowColor: '#4f5f7d',
        shadowBlur: 16,
        shadowOffsetX: 0,
        shadowOffsetY: 8,
        opacity: 0.96,
      },
      softBlur: {
        fill: '#f1eff6',
        stroke: '#d7b4ff',
        strokeWidth: 2,
        shadowColor: '#c8a5ff',
        shadowBlur: 18,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        opacity: 0.95,
      },
      sharpCatch: {
        fill: '#fff6eb',
        stroke: '#f5a762',
        strokeWidth: 2,
        shadowColor: '#d0772d',
        shadowBlur: 12,
        shadowOffsetX: 0,
        shadowOffsetY: 3,
        opacity: 0.97,
      },
      layeredFocus: {
        fill: '#edf7f4',
        stroke: '#58a695',
        strokeWidth: 2,
        shadowColor: '#2f6f67',
        shadowBlur: 14,
        shadowOffsetX: 0,
        shadowOffsetY: 5,
        opacity: 0.96,
      },
    };
    const style = presets[preset];
    if (!style) return;
    const nextFill = style.fill ?? object.fill;
    object.set({
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity ?? object.opacity ?? 1,
      shadow: new fabric.Shadow({
        color: style.shadowColor,
        blur: style.shadowBlur,
        offsetX: style.shadowOffsetX,
        offsetY: style.shadowOffsetY,
      }),
    });
    object.setCoords();
    canvas.requestRenderAll();
    setShadowColor(style.shadowColor);
    setShadowBlur(style.shadowBlur);
    setShadowOffsetX(style.shadowOffsetX);
    setShadowOffsetY(style.shadowOffsetY);
    setSelection((current) => ({
      ...current,
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
      opacity: style.opacity ?? current.opacity ?? 1,
    }));
    queueSnapshot();
  };
  const applyStudioLightPreset = (preset) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const presets = {
      softBloom: {
        fill: '#fffaf0',
        stroke: '#f7d39a',
        strokeWidth: 2,
        shadowColor: '#f3b566',
        shadowBlur: 20,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        opacity: 0.98,
      },
      filmHaze: {
        fill: '#eff7ff',
        stroke: '#85a8d8',
        strokeWidth: 2,
        shadowColor: '#90baf4',
        shadowBlur: 18,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        opacity: 0.96,
      },
      spotlightFlare: {
        fill: '#f7f0ff',
        stroke: '#b98cff',
        strokeWidth: 2,
        shadowColor: '#a36cff',
        shadowBlur: 24,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        opacity: 0.99,
      },
      glassShimmer: {
        fill: '#ebfdfd',
        stroke: '#7fe4d7',
        strokeWidth: 2,
        shadowColor: '#58d9d0',
        shadowBlur: 16,
        shadowOffsetX: 0,
        shadowOffsetY: 4,
        opacity: 0.97,
      },
    };
    const style = presets[preset];
    if (!style) return;
    const nextFill = style.fill ?? object.fill;
    object.set({
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity ?? object.opacity ?? 1,
      shadow: new fabric.Shadow({
        color: style.shadowColor,
        blur: style.shadowBlur,
        offsetX: style.shadowOffsetX,
        offsetY: style.shadowOffsetY,
      }),
    });
    object.setCoords();
    canvas.requestRenderAll();
    setShadowColor(style.shadowColor);
    setShadowBlur(style.shadowBlur);
    setShadowOffsetX(style.shadowOffsetX);
    setShadowOffsetY(style.shadowOffsetY);
    setSelection((current) => ({
      ...current,
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
      opacity: style.opacity ?? current.opacity ?? 1,
    }));
    queueSnapshot();
  };
  const applyCinematicLightPreset = (preset) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const presets = {
      softFlare: {
        fill: '#fff4d9',
        stroke: '#f5c15a',
        strokeWidth: 2,
        shadowColor: '#ffb84d',
        shadowBlur: 22,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        opacity: 0.99,
      },
      filmBleed: {
        fill: '#f3efe8',
        stroke: '#9a8b74',
        strokeWidth: 2,
        shadowColor: '#8f7d69',
        shadowBlur: 15,
        shadowOffsetX: 0,
        shadowOffsetY: 8,
        opacity: 0.96,
      },
      stageGlow: {
        fill: '#f8eaf7',
        stroke: '#c484d8',
        strokeWidth: 2,
        shadowColor: '#d597f0',
        shadowBlur: 26,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        opacity: 0.98,
      },
      lumaWash: {
        fill: '#ebfff3',
        stroke: '#69d18d',
        strokeWidth: 2,
        shadowColor: '#6fd9a0',
        shadowBlur: 18,
        shadowOffsetX: 0,
        shadowOffsetY: 4,
        opacity: 0.97,
      },
    };
    const style = presets[preset];
    if (!style) return;
    const nextFill = style.fill ?? object.fill;
    object.set({
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity ?? object.opacity ?? 1,
      shadow: new fabric.Shadow({
        color: style.shadowColor,
        blur: style.shadowBlur,
        offsetX: style.shadowOffsetX,
        offsetY: style.shadowOffsetY,
      }),
    });
    object.setCoords();
    canvas.requestRenderAll();
    setShadowColor(style.shadowColor);
    setShadowBlur(style.shadowBlur);
    setShadowOffsetX(style.shadowOffsetX);
    setShadowOffsetY(style.shadowOffsetY);
    setSelection((current) => ({
      ...current,
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
      opacity: style.opacity ?? current.opacity ?? 1,
    }));
    queueSnapshot();
  };
  const applyColorGradingPreset = (preset) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const presets = {
      sunsetCurve: {
        fill: '#f9b38a',
        stroke: '#d45d3d',
        strokeWidth: 2,
        shadowColor: '#e57a4c',
        shadowBlur: 22,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        opacity: 0.98,
      },
      coolFade: {
        fill: '#b9d9ff',
        stroke: '#5a7fc4',
        strokeWidth: 2,
        shadowColor: '#7fa8ee',
        shadowBlur: 20,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        opacity: 0.96,
      },
      warmFilm: {
        fill: '#ffd9af',
        stroke: '#d2782e',
        strokeWidth: 2,
        shadowColor: '#dd9a42',
        shadowBlur: 18,
        shadowOffsetX: 0,
        shadowOffsetY: 6,
        opacity: 0.97,
      },
      nightContrast: {
        fill: '#2d3151',
        stroke: '#a8b6d8',
        strokeWidth: 2,
        shadowColor: '#101827',
        shadowBlur: 16,
        shadowOffsetX: 0,
        shadowOffsetY: 5,
        opacity: 0.96,
      },
    };
    const style = presets[preset];
    if (!style) return;
    const nextFill = style.fill ?? object.fill;
    object.set({
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity ?? object.opacity ?? 1,
      shadow: new fabric.Shadow({
        color: style.shadowColor,
        blur: style.shadowBlur,
        offsetX: style.shadowOffsetX,
        offsetY: style.shadowOffsetY,
      }),
    });
    object.setCoords();
    canvas.requestRenderAll();
    setShadowColor(style.shadowColor);
    setShadowBlur(style.shadowBlur);
    setShadowOffsetX(style.shadowOffsetX);
    setShadowOffsetY(style.shadowOffsetY);
    setSelection((current) => ({
      ...current,
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
      opacity: style.opacity ?? current.opacity ?? 1,
    }));
    queueSnapshot();
  };
  const applyTonalBalancePreset = (preset) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const presets = {
      softNeutrals: {
        fill: '#f0ece7',
        stroke: '#8f7f6b',
        strokeWidth: 2,
        shadowColor: '#b5a796',
        shadowBlur: 14,
        shadowOffsetX: 0,
        shadowOffsetY: 4,
        opacity: 0.98,
      },
      duskContrast: {
        fill: '#4d5366',
        stroke: '#eceaf7',
        strokeWidth: 2,
        shadowColor: '#24273d',
        shadowBlur: 18,
        shadowOffsetX: 0,
        shadowOffsetY: 5,
        opacity: 0.96,
      },
      highKey: {
        fill: '#fffdfb',
        stroke: '#9aa8c7',
        strokeWidth: 2,
        shadowColor: '#dfe6ff',
        shadowBlur: 20,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        opacity: 0.99,
      },
      lowGlow: {
        fill: '#58495e',
        stroke: '#e8d7a5',
        strokeWidth: 2,
        shadowColor: '#2c2534',
        shadowBlur: 16,
        shadowOffsetX: 0,
        shadowOffsetY: 6,
        opacity: 0.95,
      },
    };
    const style = presets[preset];
    if (!style) return;
    const nextFill = style.fill ?? object.fill;
    object.set({
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity ?? object.opacity ?? 1,
      shadow: new fabric.Shadow({
        color: style.shadowColor,
        blur: style.shadowBlur,
        offsetX: style.shadowOffsetX,
        offsetY: style.shadowOffsetY,
      }),
    });
    object.setCoords();
    canvas.requestRenderAll();
    setShadowColor(style.shadowColor);
    setShadowBlur(style.shadowBlur);
    setShadowOffsetX(style.shadowOffsetX);
    setShadowOffsetY(style.shadowOffsetY);
    setSelection((current) => ({
      ...current,
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
      opacity: style.opacity ?? current.opacity ?? 1,
    }));
    queueSnapshot();
  };
  const applyLightRatioPreset = (preset) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const presets = {
      softRange: {
        fill: '#eef2ff',
        stroke: '#8aa0f8',
        strokeWidth: 2,
        shadowColor: '#c4d3ff',
        shadowBlur: 18,
        shadowOffsetX: 0,
        shadowOffsetY: 4,
        opacity: 0.98,
      },
      midContrast: {
        fill: '#5a647e',
        stroke: '#f6e6d8',
        strokeWidth: 2,
        shadowColor: '#1d2435',
        shadowBlur: 16,
        shadowOffsetX: 0,
        shadowOffsetY: 5,
        opacity: 0.95,
      },
      highAccent: {
        fill: '#fff6d4',
        stroke: '#e7b843',
        strokeWidth: 2,
        shadowColor: '#f2c866',
        shadowBlur: 20,
        shadowOffsetX: 0,
        shadowOffsetY: 2,
        opacity: 0.99,
      },
      lowHaze: {
        fill: '#7e8699',
        stroke: '#e9ecf5',
        strokeWidth: 2,
        shadowColor: '#4d5362',
        shadowBlur: 14,
        shadowOffsetX: 0,
        shadowOffsetY: 6,
        opacity: 0.94,
      },
    };
    const style = presets[preset];
    if (!style) return;
    const nextFill = style.fill ?? object.fill;
    object.set({
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity ?? object.opacity ?? 1,
      shadow: new fabric.Shadow({
        color: style.shadowColor,
        blur: style.shadowBlur,
        offsetX: style.shadowOffsetX,
        offsetY: style.shadowOffsetY,
      }),
    });
    object.setCoords();
    canvas.requestRenderAll();
    setShadowColor(style.shadowColor);
    setShadowBlur(style.shadowBlur);
    setShadowOffsetX(style.shadowOffsetX);
    setShadowOffsetY(style.shadowOffsetY);
    setSelection((current) => ({
      ...current,
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
      opacity: style.opacity ?? current.opacity ?? 1,
    }));
    queueSnapshot();
  };
  const applyContrastMapPreset = (preset) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const presets = {
      lowLift: {
        fill: '#f7efe1',
        stroke: '#c79c6b',
        strokeWidth: 2,
        shadowColor: '#d9b892',
        shadowBlur: 18,
        shadowOffsetX: 0,
        shadowOffsetY: 4,
        opacity: 0.98,
      },
      softEdge: {
        fill: '#cfd6db',
        stroke: '#6f7a8a',
        strokeWidth: 2,
        shadowColor: '#8f9bab',
        shadowBlur: 16,
        shadowOffsetX: 0,
        shadowOffsetY: 5,
        opacity: 0.96,
      },
      warmKey: {
        fill: '#f9d7a8',
        stroke: '#d88a4d',
        strokeWidth: 2,
        shadowColor: '#eebd75',
        shadowBlur: 20,
        shadowOffsetX: 0,
        shadowOffsetY: 2,
        opacity: 0.99,
      },
      highDepth: {
        fill: '#4a3d49',
        stroke: '#e9d8c3',
        strokeWidth: 2,
        shadowColor: '#2b1d27',
        shadowBlur: 18,
        shadowOffsetX: 0,
        shadowOffsetY: 6,
        opacity: 0.95,
      },
    };
    const style = presets[preset];
    if (!style) return;
    const nextFill = style.fill ?? object.fill;
    object.set({
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity ?? object.opacity ?? 1,
      shadow: new fabric.Shadow({
        color: style.shadowColor,
        blur: style.shadowBlur,
        offsetX: style.shadowOffsetX,
        offsetY: style.shadowOffsetY,
      }),
    });
    object.setCoords();
    canvas.requestRenderAll();
    setShadowColor(style.shadowColor);
    setShadowBlur(style.shadowBlur);
    setShadowOffsetX(style.shadowOffsetX);
    setShadowOffsetY(style.shadowOffsetY);
    setSelection((current) => ({
      ...current,
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
      opacity: style.opacity ?? current.opacity ?? 1,
    }));
    queueSnapshot();
  };
  const applyDepthPassPreset = (preset) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const presets = {
      softVelvet: {
        fill: '#d9d0f5',
        stroke: '#7b63b7',
        strokeWidth: 2,
        shadowColor: '#a18adf',
        shadowBlur: 20,
        shadowOffsetX: 0,
        shadowOffsetY: 5,
        opacity: 0.97,
      },
      glassShadow: {
        fill: '#dfeafc',
        stroke: '#6b88b8',
        strokeWidth: 2,
        shadowColor: '#97b5db',
        shadowBlur: 16,
        shadowOffsetX: 0,
        shadowOffsetY: 8,
        opacity: 0.96,
      },
      warmHaze: {
        fill: '#f4d5b4',
        stroke: '#b77849',
        strokeWidth: 2,
        shadowColor: '#d29a63',
        shadowBlur: 18,
        shadowOffsetX: 0,
        shadowOffsetY: 6,
        opacity: 0.98,
      },
      nightEcho: {
        fill: '#3d4560',
        stroke: '#dde4f8',
        strokeWidth: 2,
        shadowColor: '#1c2335',
        shadowBlur: 18,
        shadowOffsetX: 0,
        shadowOffsetY: 7,
        opacity: 0.95,
      },
    };
    const style = presets[preset];
    if (!style) return;
    const nextFill = style.fill ?? object.fill;
    object.set({
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity ?? object.opacity ?? 1,
      shadow: new fabric.Shadow({
        color: style.shadowColor,
        blur: style.shadowBlur,
        offsetX: style.shadowOffsetX,
        offsetY: style.shadowOffsetY,
      }),
    });
    object.setCoords();
    canvas.requestRenderAll();
    setShadowColor(style.shadowColor);
    setShadowBlur(style.shadowBlur);
    setShadowOffsetX(style.shadowOffsetX);
    setShadowOffsetY(style.shadowOffsetY);
    setSelection((current) => ({
      ...current,
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
      opacity: style.opacity ?? current.opacity ?? 1,
    }));
    queueSnapshot();
  };
  const applyShadowBalancePreset = (preset) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const presets = {
      softFall: {
        fill: '#f2ebf7',
        stroke: '#7b6b96',
        strokeWidth: 2,
        shadowColor: '#b9a8d0',
        shadowBlur: 18,
        shadowOffsetX: 0,
        shadowOffsetY: 8,
        opacity: 0.97,
      },
      leanGlow: {
        fill: '#f9efe5',
        stroke: '#bf805a',
        strokeWidth: 2,
        shadowColor: '#ddb18a',
        shadowBlur: 16,
        shadowOffsetX: 0,
        shadowOffsetY: 6,
        opacity: 0.96,
      },
      lowEdge: {
        fill: '#e6eaf2',
        stroke: '#6a7b9b',
        strokeWidth: 2,
        shadowColor: '#8fa3c5',
        shadowBlur: 12,
        shadowOffsetX: 0,
        shadowOffsetY: 3,
        opacity: 0.98,
      },
      highBloom: {
        fill: '#f7d6c8',
        stroke: '#d26d5c',
        strokeWidth: 2,
        shadowColor: '#e19b8c',
        shadowBlur: 20,
        shadowOffsetX: 0,
        shadowOffsetY: 5,
        opacity: 0.99,
      },
    };
    const style = presets[preset];
    if (!style) return;
    const nextFill = style.fill ?? object.fill;
    object.set({
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity ?? object.opacity ?? 1,
      shadow: new fabric.Shadow({
        color: style.shadowColor,
        blur: style.shadowBlur,
        offsetX: style.shadowOffsetX,
        offsetY: style.shadowOffsetY,
      }),
    });
    object.setCoords();
    canvas.requestRenderAll();
    setShadowColor(style.shadowColor);
    setShadowBlur(style.shadowBlur);
    setShadowOffsetX(style.shadowOffsetX);
    setShadowOffsetY(style.shadowOffsetY);
    setSelection((current) => ({
      ...current,
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
      opacity: style.opacity ?? current.opacity ?? 1,
    }));
    queueSnapshot();
  };
  const applyToneDriftPreset = (preset) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const presets = {
      coastalHaze: {
        fill: '#ddeaf8',
        stroke: '#6f85ad',
        strokeWidth: 2,
        shadowColor: '#a3bddc',
        shadowBlur: 14,
        shadowOffsetX: 0,
        shadowOffsetY: 7,
        opacity: 0.98,
      },
      moodyDusk: {
        fill: '#d9cfe0',
        stroke: '#5d4668',
        strokeWidth: 2,
        shadowColor: '#8a6d9b',
        shadowBlur: 18,
        shadowOffsetX: 0,
        shadowOffsetY: 6,
        opacity: 0.97,
      },
      nightWash: {
        fill: '#2f3d52',
        stroke: '#dfe9ff',
        strokeWidth: 2,
        shadowColor: '#14212f',
        shadowBlur: 18,
        shadowOffsetX: 0,
        shadowOffsetY: 8,
        opacity: 0.95,
      },
      softDaylight: {
        fill: '#f4e7ce',
        stroke: '#b28d62',
        strokeWidth: 2,
        shadowColor: '#d2b68d',
        shadowBlur: 19,
        shadowOffsetX: 0,
        shadowOffsetY: 5,
        opacity: 0.98,
      },
    };
    const style = presets[preset];
    if (!style) return;
    const nextFill = style.fill ?? object.fill;
    object.set({
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity ?? object.opacity ?? 1,
      shadow: new fabric.Shadow({
        color: style.shadowColor,
        blur: style.shadowBlur,
        offsetX: style.shadowOffsetX,
        offsetY: style.shadowOffsetY,
      }),
    });
    object.setCoords();
    canvas.requestRenderAll();
    setShadowColor(style.shadowColor);
    setShadowBlur(style.shadowBlur);
    setShadowOffsetX(style.shadowOffsetX);
    setShadowOffsetY(style.shadowOffsetY);
    setSelection((current) => ({
      ...current,
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
      opacity: style.opacity ?? current.opacity ?? 1,
    }));
    queueSnapshot();
  };
  const applyAfterlightPreset = (preset) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const presets = {
      cinderHaze: {
        fill: '#d7c9c5',
        stroke: '#7e5d5d',
        strokeWidth: 2,
        shadowColor: '#a9877f',
        shadowBlur: 18,
        shadowOffsetX: 0,
        shadowOffsetY: 6,
        opacity: 0.97,
      },
      glassVeil: {
        fill: '#eef2f7',
        stroke: '#7288a9',
        strokeWidth: 2,
        shadowColor: '#b7c7dd',
        shadowBlur: 20,
        shadowOffsetX: 0,
        shadowOffsetY: 8,
        opacity: 0.99,
      },
      amberMist: {
        fill: '#f5dfc1',
        stroke: '#b97f42',
        strokeWidth: 2,
        shadowColor: '#d9a86d',
        shadowBlur: 16,
        shadowOffsetX: 0,
        shadowOffsetY: 7,
        opacity: 0.98,
      },
      quietBloom: {
        fill: '#eae6ef',
        stroke: '#756a88',
        strokeWidth: 2,
        shadowColor: '#a69bb7',
        shadowBlur: 15,
        shadowOffsetX: 0,
        shadowOffsetY: 5,
        opacity: 0.98,
      },
    };
    const style = presets[preset];
    if (!style) return;
    const nextFill = style.fill ?? object.fill;
    object.set({
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity ?? object.opacity ?? 1,
      shadow: new fabric.Shadow({
        color: style.shadowColor,
        blur: style.shadowBlur,
        offsetX: style.shadowOffsetX,
        offsetY: style.shadowOffsetY,
      }),
    });
    object.setCoords();
    canvas.requestRenderAll();
    setShadowColor(style.shadowColor);
    setShadowBlur(style.shadowBlur);
    setShadowOffsetX(style.shadowOffsetX);
    setShadowOffsetY(style.shadowOffsetY);
    setSelection((current) => ({
      ...current,
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
      opacity: style.opacity ?? current.opacity ?? 1,
    }));
    queueSnapshot();
  };
  const applyVelvetHushPreset = (preset) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const presets = {
      stoneMist: {
        fill: '#e5ded9',
        stroke: '#726d6e',
        strokeWidth: 2,
        shadowColor: '#9c9897',
        shadowBlur: 14,
        shadowOffsetX: 0,
        shadowOffsetY: 6,
        opacity: 0.98,
      },
      nightPearl: {
        fill: '#dfe3ea',
        stroke: '#4f6176',
        strokeWidth: 2,
        shadowColor: '#8397b8',
        shadowBlur: 18,
        shadowOffsetX: 0,
        shadowOffsetY: 8,
        opacity: 0.97,
      },
      warmAsh: {
        fill: '#ebd7c2',
        stroke: '#8e6a4a',
        strokeWidth: 2,
        shadowColor: '#c89c6b',
        shadowBlur: 17,
        shadowOffsetX: 0,
        shadowOffsetY: 7,
        opacity: 0.98,
      },
      lowSheen: {
        fill: '#f2eaf4',
        stroke: '#7e6b87',
        strokeWidth: 2,
        shadowColor: '#b9a7c3',
        shadowBlur: 15,
        shadowOffsetX: 0,
        shadowOffsetY: 5,
        opacity: 0.99,
      },
    };
    const style = presets[preset];
    if (!style) return;
    const nextFill = style.fill ?? object.fill;
    object.set({
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity ?? object.opacity ?? 1,
      shadow: new fabric.Shadow({
        color: style.shadowColor,
        blur: style.shadowBlur,
        offsetX: style.shadowOffsetX,
        offsetY: style.shadowOffsetY,
      }),
    });
    object.setCoords();
    canvas.requestRenderAll();
    setShadowColor(style.shadowColor);
    setShadowBlur(style.shadowBlur);
    setShadowOffsetX(style.shadowOffsetX);
    setShadowOffsetY(style.shadowOffsetY);
    setSelection((current) => ({
      ...current,
      fill: nextFill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
      opacity: style.opacity ?? current.opacity ?? 1,
    }));
    queueSnapshot();
  };
  const updateSelected = (key, value) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    if (key === 'blendMode') {
      const normalized = value === 'normal' ? 'source-over' : value;
      object.set('globalCompositeOperation', normalized);
      object.setCoords();
      canvas.requestRenderAll();
      setSelection((current) => ({ ...current, blendMode: normalized }));
      queueSnapshot();
      return;
    }
    const action = ['left', 'top'].includes(key) ? 'movable'
      : ['width', 'height'].includes(key) ? 'resizable'
        : key === 'angle' ? 'rotatable'
          : ['cropZoom', 'cropXPosition', 'cropYPosition'].includes(key) ? 'replaceable'
            : 'editable';
    if (key === 'shadowColor' || key === 'shadowBlur' || key === 'shadowOffsetX' || key === 'shadowOffsetY') {
      object.set('shadow', new fabric.Shadow({ color: key === 'shadowColor' ? value : shadowColor, blur: key === 'shadowBlur' ? Number(value) : shadowBlur, offsetX: key === 'shadowOffsetX' ? Number(value) : shadowOffsetX, offsetY: key === 'shadowOffsetY' ? Number(value) : shadowOffsetY }));
      object.setCoords();
      canvas.requestRenderAll();
      setSelection((current) => ({ ...current, shadowColor: key === 'shadowColor' ? value : shadowColor, shadowBlur: key === 'shadowBlur' ? Number(value) : shadowBlur, shadowOffsetX: key === 'shadowOffsetX' ? Number(value) : shadowOffsetX, shadowOffsetY: key === 'shadowOffsetY' ? Number(value) : shadowOffsetY }));
      queueSnapshot();
      return;
    }
    if (!canMutate(object, action)) return;
    const numberFields = ['left', 'top', 'width', 'height', 'angle', 'fontSize', 'opacity', 'lineHeight', 'letterSpacing', 'cropZoom', 'cropXPosition', 'cropYPosition', 'strokeWidth'];
    let next = numberFields.includes(key) ? Number(value) || 0 : value;
    const ratio = getObjectAspectRatio(object);
    if (aspectRatioLock && ratio && ['width', 'height'].includes(key)) {
      const currentWidth = object.frameWidth || object.getScaledWidth?.() || object.width || 0;
      const currentHeight = object.frameHeight || object.getScaledHeight?.() || object.height || 0;
      if (key === 'width') {
        next = Math.max(1, next);
        const adjustedHeight = Number((next / ratio).toFixed(2));
        if (object.editorType === 'image' && object.type === 'image') {
          object.frameWidth = next;
          object.frameHeight = adjustedHeight;
        }
        if (object.type === 'rect' || object.type === 'circle' || object.type === 'line') {
          object.set({ width: next, height: adjustedHeight });
        }
        if (object.editorType === 'text') {
          object.frameWidth = next;
          object.frameHeight = adjustedHeight;
        }
      }
      if (key === 'height') {
        next = Math.max(1, next);
        const adjustedWidth = Number((next * ratio).toFixed(2));
        if (object.editorType === 'image' && object.type === 'image') {
          object.frameWidth = adjustedWidth;
          object.frameHeight = next;
        }
        if (object.type === 'rect' || object.type === 'circle' || object.type === 'line') {
          object.set({ width: adjustedWidth, height: next });
        }
        if (object.editorType === 'text') {
          object.frameWidth = adjustedWidth;
          object.frameHeight = next;
        }
      }
      if (object.editorType === 'image' && object.type === 'image' && mode !== 'customer') {
        fitImageToFrame(object, object.frameWidth || currentWidth, object.frameHeight || currentHeight, object.cropZoom || 1, object.objectPosition);
      }
      if (object.editorType === 'text') {
        applyTextOverflow(object, object.overflow, object.frameHeight);
      }
      object.setCoords();
      canvas.requestRenderAll();
      setSelection((current) => ({
        ...current,
        width: Math.round(object.frameWidth || object.getScaledWidth()),
        height: Math.round(object.frameHeight || object.getScaledHeight()),
      }));
      queueSnapshot();
      return;
    }
    if (key === 'fontSize' && object.editorType === 'text') {
      object.baseFontSize = Math.max(1, next);
      applyTextOverflow(object, object.overflow, object.frameHeight);
    } else if (key === 'width' && object.editorType === 'text') {
      object.frameWidth = Math.max(1, next);
      object.set('width', object.frameWidth);
      applyTextOverflow(object, object.overflow, object.frameHeight);
    } else if (key === 'height' && object.editorType === 'text') {
      applyTextOverflow(object, object.overflow, Math.max(1, next));
    } else if (key === 'overflow' && object.editorType === 'text') {
      applyTextOverflow(object, next, object.frameHeight);
    } else if (key === 'width' && object.editorType === 'image' && object.type === 'image') {
      object.frameWidth = Math.max(1, next);
      if (mode === 'customer') {
        const ratio = object.frameWidth / Math.max(1, object.getScaledWidth());
        object.set({ scaleX: (object.scaleX || 1) * ratio, scaleY: (object.scaleY || 1) * ratio });
        syncCustomerImageBounds(object);
      } else {
        fitImageToFrame(object, object.frameWidth, object.frameHeight || object.getScaledHeight(), object.cropZoom || 1, object.objectPosition);
      }
    } else if (key === 'height' && object.editorType === 'image' && object.type === 'image') {
      object.frameHeight = Math.max(1, next);
      if (mode === 'customer') {
        const ratio = object.frameHeight / Math.max(1, object.getScaledHeight());
        object.set({ scaleX: (object.scaleX || 1) * ratio, scaleY: (object.scaleY || 1) * ratio });
        syncCustomerImageBounds(object);
      } else {
        fitImageToFrame(object, object.frameWidth || object.getScaledWidth(), object.frameHeight, object.cropZoom || 1, object.objectPosition);
      }
    } else if (['cropZoom', 'cropXPosition', 'cropYPosition'].includes(key) && (object.type === 'image' || object.editorType === 'framed-image')) {
      const position = { ...(object.objectPosition || { x: 0.5, y: 0.5 }) };
      if (key === 'cropXPosition') position.x = next;
      if (key === 'cropYPosition') position.y = next;
      const cropZoom = key === 'cropZoom' ? Math.max(1, next) : object.cropZoom || 1;
      if (object.editorType === 'framed-image') {
        object.cropZoom = cropZoom;
        object.objectPosition = position;
        fitImageIntoFrameMask(object, { zoom: cropZoom, position });
        syncLinkedFrameBorder(canvas, object);
      } else if (mode !== 'customer') {
        fitImageToFrame(object, object.frameWidth || object.getScaledWidth(), object.frameHeight || object.getScaledHeight(), cropZoom, position);
      }
    } else if (key === 'width' && object.type === 'circle') object.set('radius', Math.max(1, next) / 2);
    else if (key === 'height' && object.type === 'circle') object.set('radius', Math.max(1, next) / 2);
    else if (key === 'color' || key === 'fill') object.set('fill', next);
    else if (key === 'stroke') object.set('stroke', next);
    else if (key === 'letterSpacing') object.set('charSpacing', next);
    else if (key === 'angle') object.set('angle', next);
    else object.set(key, next);
    if (object.editorType === 'text' && ['text', 'fontFamily', 'fontWeight', 'fontStyle', 'underline', 'color', 'textAlign', 'lineHeight', 'letterSpacing'].includes(key)) {
      applyTextOverflow(object, object.overflow, object.frameHeight);
    }
    object.setCoords();
    canvas.requestRenderAll();
    const displayedValue = object.editorType === 'text' && key === 'height' ? object.frameHeight : next;
    setSelection((current) => ({ ...current, [key]: displayedValue }));
    queueSnapshot();
  };
  const alignSelection = (alignment) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object || object.locked) return;
    const width = object.getScaledWidth();
    const height = object.getScaledHeight();
    const snapThreshold = 18;
    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    if (object.editorType === 'framed-image') {
      const fw = object.frameWidth || object.getScaledWidth();
      const fh = object.frameHeight || object.getScaledHeight();
      let frameLeft = object.frameLeft ?? object.left ?? 0;
      let frameTop = object.frameTop ?? object.top ?? 0;
      if (alignment === 'center') {
        frameLeft = (canvasWidth - fw) / 2;
        frameTop = (canvasHeight - fh) / 2;
      } else if (alignment === 'left') frameLeft = 0;
      else if (alignment === 'right') frameLeft = canvasWidth - fw;
      else if (alignment === 'top') frameTop = 0;
      else if (alignment === 'middle') frameTop = (canvasHeight - fh) / 2;
      else if (alignment === 'bottom') frameTop = canvasHeight - fh;
      object.frameLeft = frameLeft;
      object.frameTop = frameTop;
      fitImageIntoFrameMask(object, { zoom: object.cropZoom || 1, position: object.objectPosition || { x: 0.5, y: 0.5 } });
      syncLinkedFrameBorder(canvas, object);
      object.setCoords();
      canvas.requestRenderAll();
      queueSnapshot();
      return;
    }
    if (object.editorType === 'image' && object.type === 'image') {
      const frameWidth = object.frameWidth || width;
      const frameHeight = object.frameHeight || height;
      if (alignment === 'center') {
        object.frameLeft = (canvasWidth - frameWidth) / 2;
        object.frameTop = (canvasHeight - frameHeight) / 2;
      } else if (alignment === 'left') {
        object.frameLeft = 0;
      } else if (alignment === 'right') {
        object.frameLeft = canvasWidth - frameWidth;
      } else if (alignment === 'top') {
        object.frameTop = 0;
      } else if (alignment === 'middle') {
        object.frameTop = (canvasHeight - frameHeight) / 2;
      } else if (alignment === 'bottom') {
        object.frameTop = canvasHeight - frameHeight;
      }
      if (mode === 'customer') {
        const displayWidth = object.getScaledWidth();
        const displayHeight = object.getScaledHeight();
        object.frameWidth = displayWidth;
        object.frameHeight = displayHeight;
        object.frameLeft = object.frameLeft ?? object.left ?? 0;
        object.frameTop = object.frameTop ?? object.top ?? 0;
        if (alignment === 'center') {
          object.set({ left: (canvasWidth - displayWidth) / 2, top: (canvasHeight - displayHeight) / 2 });
        } else if (alignment === 'left') {
          object.set({ left: 0 });
        } else if (alignment === 'right') {
          object.set({ left: canvasWidth - displayWidth });
        } else if (alignment === 'top') {
          object.set({ top: 0 });
        } else if (alignment === 'middle') {
          object.set({ top: (canvasHeight - displayHeight) / 2 });
        } else if (alignment === 'bottom') {
          object.set({ top: canvasHeight - displayHeight });
        }
        syncCustomerImageBounds(object);
      } else {
        fitImageToFrame(object, frameWidth, frameHeight, object.cropZoom || 1, object.objectPosition || { x: 0.5, y: 0.5 }, { mode: 'cover' });
        syncImageFrameGuide(object);
      }
      object.setCoords();
      canvas.requestRenderAll();
      queueSnapshot();
      return;
    }
    const objectCenterX = (object.left || 0) + width / 2;
    const objectCenterY = (object.top || 0) + height / 2;
    if (alignment === 'left') object.set({ left: 0 });
    if (alignment === 'center') object.set({ left: Math.abs(objectCenterX - centerX) <= snapThreshold ? centerX - width / 2 : (canvasWidth - width) / 2 });
    if (alignment === 'right') object.set({ left: canvasWidth - width });
    if (alignment === 'top') object.set({ top: 0 });
    if (alignment === 'middle') object.set({ top: Math.abs(objectCenterY - centerY) <= snapThreshold ? centerY - height / 2 : (canvasHeight - height) / 2 });
    if (alignment === 'bottom') object.set({ top: canvasHeight - height });
    object.setCoords();
    canvas.requestRenderAll();
    updateSelectionFromObject(object);
    queueSnapshot();
  };
  const snapToSmartGuides = (target, canvas) => {
    if (!target || !canvas || !smartGuidesRef.current) {
      setGuideLines({ vertical: [], horizontal: [] });
      return false;
    }
    const tolerance = 12;
    const targetWidth = target.getScaledWidth();
    const targetHeight = target.getScaledHeight();
    const initialLeft = target.left || 0;
    const initialTop = target.top || 0;
    const initialRight = initialLeft + targetWidth;
    const initialBottom = initialTop + targetHeight;
    const initialCenterX = initialLeft + targetWidth / 2;
    const initialCenterY = initialTop + targetHeight / 2;
    let snappedLeft = initialLeft;
    let snappedTop = initialTop;
    let hasLeftSnap = false;
    let hasTopSnap = false;
    const nextGuideLines = { vertical: [], horizontal: [] };

    for (const object of canvas.getObjects()) {
      if (object === target || object.visible === false) continue;
      const objectLeft = object.left || 0;
      const objectTop = object.top || 0;
      const objectRight = objectLeft + object.getScaledWidth();
      const objectBottom = objectTop + object.getScaledHeight();
      const objectCenterX = objectLeft + object.getScaledWidth() / 2;
      const objectCenterY = objectTop + object.getScaledHeight() / 2;

      const xCandidates = [
        { value: objectLeft, delta: Math.abs(initialLeft - objectLeft), axis: 'left' },
        { value: objectRight - targetWidth, delta: Math.abs(initialLeft - (objectRight - targetWidth)), axis: 'right' },
        { value: objectCenterX - targetWidth / 2, delta: Math.abs(initialCenterX - objectCenterX), axis: 'center' },
        { value: objectLeft - targetWidth, delta: Math.abs(initialRight - objectLeft), axis: 'right-edge' },
        { value: objectRight, delta: Math.abs(initialRight - objectRight), axis: 'left-edge' },
      ];
      const bestX = xCandidates.filter((candidate) => candidate.delta <= tolerance).sort((leftCandidate, rightCandidate) => leftCandidate.delta - rightCandidate.delta)[0];
      if (bestX) {
        snappedLeft = bestX.value;
        hasLeftSnap = true;
        nextGuideLines.vertical.push({ position: objectCenterX, from: 0, to: canvas.getHeight(), alignment: bestX.axis });
      }

      const yCandidates = [
        { value: objectTop, delta: Math.abs(initialTop - objectTop), axis: 'top' },
        { value: objectBottom - targetHeight, delta: Math.abs(initialTop - (objectBottom - targetHeight)), axis: 'bottom' },
        { value: objectCenterY - targetHeight / 2, delta: Math.abs(initialCenterY - objectCenterY), axis: 'middle' },
        { value: objectTop - targetHeight, delta: Math.abs(initialBottom - objectTop), axis: 'bottom-edge' },
        { value: objectBottom, delta: Math.abs(initialBottom - objectBottom), axis: 'top-edge' },
      ];
      const bestY = yCandidates.filter((candidate) => candidate.delta <= tolerance).sort((topCandidate, bottomCandidate) => topCandidate.delta - bottomCandidate.delta)[0];
      if (bestY) {
        snappedTop = bestY.value;
        hasTopSnap = true;
        nextGuideLines.horizontal.push({ position: objectCenterY, from: 0, to: canvas.getWidth(), alignment: bestY.axis });
      }
    }

    setGuideLines(nextGuideLines);
    if (hasLeftSnap || hasTopSnap) {
      target.set({ left: snappedLeft, top: snappedTop });
      target.setCoords();
      return true;
    }
    return false;
  };
  const snapSelectionToAngle = (step = 15) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object || object.locked) return;
    const currentAngle = Number(object.angle || 0);
    const normalized = ((currentAngle % 360) + 360) % 360;
    const snapped = Math.round(normalized / step) * step;
    const angle = snapped >= 360 ? 0 : snapped;
    object.set({ angle });
    object.setCoords();
    canvas.requestRenderAll();
    updateSelectionFromObject(object);
    queueSnapshot();
  };
  const toggleFlag = (object, key) => {
    const canvas = canvasRef.current;
    if (!canvas || !object || mode !== 'admin') return;
    const value = !object[key];
    object.set({ [key]: value });
    if (key === 'locked') {
      if (value && object.isEditing) object.exitEditing();
      object.set({ selectable: !value, evented: !value, editable: !value });
    }
    canvas.requestRenderAll();
    setSelection((current) => current?.id === object.id ? { ...current, [key]: value } : current);
    refreshLayers();
    queueSnapshot();
  };
  const changeOrder = (method) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object || object.locked || mode !== 'admin') return;
    canvas[method](object);
    canvas.requestRenderAll();
    refreshLayers();
    queueSnapshot();
  };
  const reorderLayerStack = (draggedId, targetId) => {
    const canvas = canvasRef.current;
    if (!canvas || !draggedId || !targetId || draggedId === targetId) return;
    const objects = [...canvas.getObjects()];
    const draggedIndex = objects.findIndex((object) => object.id === draggedId);
    const targetIndex = objects.findIndex((object) => object.id === targetId);
    if (draggedIndex < 0 || targetIndex < 0) return;
    const [movedObject] = objects.splice(draggedIndex, 1);
    objects.splice(targetIndex, 0, movedObject);
    objects.forEach((object, index) => canvas.moveTo(object, index));
    canvas.requestRenderAll();
    refreshLayers();
    queueSnapshot();
  };
  const distributeSelection = (direction) => {
    const canvas = canvasRef.current;
    const selectionObject = canvas?.getActiveObject();
    if (!canvas || !selectionObject || selectionObject.type !== 'activeselection') return;
    const objects = selectionObject.getObjects();
    if (objects.length < 2) return;
    const sorted = [...objects].sort((left, right) => {
      if (direction === 'vertical') return (left.top || 0) - (right.top || 0);
      return (left.left || 0) - (right.left || 0);
    });
    if (direction === 'horizontal') {
      let cursor = Math.min(...sorted.map((item) => item.left || 0));
      for (const object of sorted) {
        const width = object.getScaledWidth();
        object.set({ left: cursor });
        cursor += width + 12;
      }
    } else {
      let cursor = Math.min(...sorted.map((item) => item.top || 0));
      for (const object of sorted) {
        const height = object.getScaledHeight();
        object.set({ top: cursor });
        cursor += height + 12;
      }
    }
    canvas.requestRenderAll();
    updateSelectionFromObject(selectionObject);
    queueSnapshot();
  };
  const spaceSelectionEvenly = (direction) => {
    const canvas = canvasRef.current;
    const selectionObject = canvas?.getActiveObject();
    if (!canvas || !selectionObject || selectionObject.type !== 'activeselection') return;
    const objects = selectionObject.getObjects();
    if (objects.length < 2) return;
    const sorted = [...objects].sort((left, right) => {
      if (direction === 'vertical') return (left.top || 0) - (right.top || 0);
      return (left.left || 0) - (right.left || 0);
    });
    const totalSpan = direction === 'vertical'
      ? sorted[sorted.length - 1].top + sorted[sorted.length - 1].getScaledHeight() - (sorted[0].top || 0)
      : sorted[sorted.length - 1].left + sorted[sorted.length - 1].getScaledWidth() - (sorted[0].left || 0);
    const gap = Math.max(8, (totalSpan - sorted.reduce((sum, object) => sum + (direction === 'vertical' ? object.getScaledHeight() : object.getScaledWidth()), 0)) / (sorted.length - 1));
    if (direction === 'vertical') {
      let cursor = sorted[0].top || 0;
      for (const object of sorted) {
        object.set({ top: cursor });
        cursor += object.getScaledHeight() + gap;
      }
    } else {
      let cursor = sorted[0].left || 0;
      for (const object of sorted) {
        object.set({ left: cursor });
        cursor += object.getScaledWidth() + gap;
      }
    }
    canvas.requestRenderAll();
    updateSelectionFromObject(selectionObject);
    queueSnapshot();
  };
  const duplicateSelected = async () => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object || object.locked) return;
    if (mode === 'customer') {
      const originals = object.type === 'activeselection' ? object.getObjects() : [object];
      if (!originals.every((item) => canMutate(item, 'deletable'))) return;
    }
    const originals = object.type === 'activeselection' ? object.getObjects() : [object];
    const copies = [];
    for (const original of originals) {
      const duplicate = await original.clone(['id', 'name', 'editorType', 'locked', 'editable', 'permissions', 'replaceable', 'crop', 'scale']);
      duplicate.set({ id: createId(original.editorType), name: `${original.name || 'Element'} copy`, left: (original.left || 0) + 24, top: (original.top || 0) + 24, locked: false, selectable: true, evented: true });
      canvas.add(duplicate);
      copies.push(duplicate);
    }
    const activeSelection = copies.length > 1 ? new ActiveSelection(copies, { canvas }) : copies[0];
    canvas.setActiveObject(activeSelection);
    canvas.requestRenderAll();
    queueSnapshot();
  };
  const createPresetAssetDataUrl = ({ name, colors, label }) => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
        <defs>
          <linearGradient id="grad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="${colors[0]}" />
            <stop offset="100%" stop-color="${colors[1]}" />
          </linearGradient>
        </defs>
        <rect width="1200" height="800" fill="url(#grad)" />
        <circle cx="940" cy="180" r="180" fill="rgba(255,255,255,0.18)" />
        <rect x="120" y="120" width="430" height="240" rx="30" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.35)" />
        <text x="120" y="520" font-size="120" fill="white" font-family="Arial, sans-serif" font-weight="700">${name}</text>
        <text x="120" y="620" font-size="42" fill="rgba(255,255,255,0.88)" font-family="Arial, sans-serif">${label}</text>
      </svg>
    `;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };
  const presetAssets = [
    { name: 'Spring', label: 'Seasonal promo', colors: ['#f4c26a', '#d85f45'] },
    { name: 'Luxury', label: 'Premium look', colors: ['#d9d2c8', '#6e5f53'] },
    { name: 'Fresh', label: 'Bright product', colors: ['#7bd3c7', '#2a8d7f'] },
    { name: 'Night', label: 'Dark promo', colors: ['#1b2430', '#5d74a5'] },
  ];
  const addPresetAsset = async (preset) => {
    try {
      const source = createPresetAssetDataUrl(preset);
      await addImage(source, false, { source: 'asset-library', prompt: preset.label, imageRole: 'full' });
    } catch (error) {
      setStatus(error.message || 'Could not add the preset asset.');
    }
  };
  const deleteSelected = () => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object) return;
    const selected = object.type === 'activeselection' ? object.getObjects() : [object];
    if (!selected.every((item) => canMutate(item, 'deletable'))) return;
    const linkedBorders = selected
      .filter((item) => item.editorType === 'framed-image')
      .flatMap((item) => canvas.getObjects().filter((border) => border.editorType === 'frame-border' && border.linkedFrameId === item.id));
    canvas.discardActiveObject();
    canvas.remove(...selected, ...linkedBorders);
    canvas.requestRenderAll();
    setSelection(null);
    queueSnapshot();
  };
  const togglePermission = (key) => {
    const canvas = canvasRef.current;
    const object = activeObject();
    if (!canvas || !object || mode !== 'admin') return;
    const permissions = { ...(object.permissions || {}), [key]: !object.permissions?.[key] };
    object.set({ permissions });
    if (key === 'editable') object.set('editable', permissions.editable);
    if (key === 'replaceable') object.set('replaceable', permissions.replaceable);
    canvas.requestRenderAll();
    updateSelectionFromObject(object);
    queueSnapshot();
  };
  const updateSelectionFromObject = (object) => setSelection(object ? {
    id: object.id,
    type: object.editorType,
    text: object.text || '',
    left: Math.round(object.left || 0),
    top: Math.round(object.top || 0),
    width: Math.round(object.frameWidth || object.getScaledWidth()),
    height: Math.round(object.frameHeight || object.getScaledHeight()),
    angle: Math.round(object.angle || 0),
    fontFamily: object.fontFamily || 'Arial',
    fontSize: object.baseFontSize || object.fontSize || 48,
    fontWeight: object.fontWeight || '400',
    fontStyle: object.fontStyle || 'normal',
    color: object.fill || '#17212b',
    fill: object.fill || '#d74c32',
    stroke: object.stroke || '#263536',
    strokeWidth: object.strokeWidth || 0,
    textAlign: object.textAlign || 'left',
    underline: object.underline === true,
    lineHeight: object.lineHeight || 1.2,
    letterSpacing: object.charSpacing || 0,
    overflow: object.overflow || 'wrap',
    opacity: object.opacity ?? 1,
    cropZoom: object.cropZoom || 1,
    cropXPosition: object.objectPosition?.x ?? 0.5,
    cropYPosition: object.objectPosition?.y ?? 0.5,
    src: object.editorType === 'image' && object.type === 'image' ? object.templateSrc || object.getSrc?.() || '' : '',
    visible: object.visible !== false,
    locked: object.locked === true,
    editable: object.editable !== false,
    replaceable: object.replaceable === true,
    permissions: object.permissions || {},
  } : null);
  const setBackgroundColor = (color) => {
    const canvas = canvasRef.current;
    if (!canvas || mode !== 'admin') return;
    canvas.backgroundColor = color;
    canvas.backgroundImage = null;
    canvas.requestRenderAll();
    queueSnapshot();
  };
  const applyCanvasSize = () => {
    if (mode !== 'admin') return;
    const width = Math.min(12000, Math.max(100, Number(sizeDraft.width) || 1200));
    const height = Math.min(12000, Math.max(100, Number(sizeDraft.height) || 800));
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setDimensions({ width, height });
    if (canvas.backgroundImage) canvas.backgroundImage.set({ scaleX: width / canvas.backgroundImage.width, scaleY: height / canvas.backgroundImage.height });
    canvas.requestRenderAll();
    setCanvasSize({ width, height });
    setSizeDraft({ width, height });
    queueSnapshot();
  };
  const restoreHistory = async (delta) => {
    const history = historyRef.current;
    const nextIndex = historyIndexRef.current + delta;
    if (nextIndex < 0 || nextIndex >= history.length) return;
    const selectedId = activeObject()?.id;
    historyIndexRef.current = nextIndex;
    refreshHistoryControls();
    await restoreTemplate(JSON.parse(history[nextIndex]));
    historyRef.current = history;
    historyIndexRef.current = nextIndex;
    const restoredObject = canvasRef.current?.getObjects().find((object) => object.id === selectedId);
    if (restoredObject) {
      canvasRef.current.setActiveObject(restoredObject);
      canvasRef.current.requestRenderAll();
    }
    refreshHistoryControls();
    onChangeRef.current?.(readSnapshot());
  };
  const downloadTemplate = () => {
    const snapshot = readSnapshot();
    if (!snapshot) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'yamini-design-template.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importTemplate = async (file) => {
    if (!file) return;
    try {
      await restoreTemplate(JSON.parse(await file.text()));
      historyRef.current = [JSON.stringify(createEmptyTemplate()), JSON.stringify(readSnapshot())];
      historyIndexRef.current = 1;
      refreshHistoryControls();
      setStatus('Template loaded.');
      onChangeRef.current?.(readSnapshot());
    } catch {
      setStatus('That file is not a valid design template JSON.');
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target?.isContentEditable) return;
      const object = activeObject();
      const canvas = canvasRef.current;
      if ((event.key === 'Delete' || event.key === 'Backspace') && object) {
        event.preventDefault();
        deleteSelected();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        restoreHistory(event.shiftKey ? 1 : -1);
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        duplicateSelected();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c' && object) {
        event.preventDefault();
        copyBufferRef.current = object.id;
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        duplicateSelected();
      } else if (event.key === 'Escape' && canvas) {
        event.preventDefault();
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        setSelection(null);
      } else if (object && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        const step = event.shiftKey ? 10 : 1;
        if (object.locked) return;
        const deltaX = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
        const deltaY = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
        event.preventDefault();
        object.set({ left: (object.left || 0) + deltaX, top: (object.top || 0) + deltaY });
        object.setCoords();
        canvasRef.current?.requestRenderAll();
        updateSelectionFromObject(object);
        queueSnapshot();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });
  const selectLayer = (id) => {
    const canvas = canvasRef.current;
    const object = canvas?.getObjects().find((item) => item.id === id);
    if (canvas && object) {
      canvas.setActiveObject(object);
      canvas.requestRenderAll();
      updateSelectionFromObject(object);
    }
  };
  const propertyDisabled = (permission = 'editable') => Boolean(
    selection?.locked ||
    mode === 'customer' && (!selection?.permissions?.[permission] || permission === 'editable' && !selection.editable)
  );

  const handleEditorTool = (toolId) => {
    if (toolId === 'templates') {
      window.location.assign('/templates');
      return;
    }
    if (toolId === 'shapes' && mode === 'admin') {
      addShape('rectangle');
      return;
    }

    setActiveTool(toolId);
    setMobilePanel('tools');

    if (toolId === 'elements') {
      setLibraryMode('elements');
    }
    if (toolId === 'frames') {
      setLibraryMode('frames');
    }
  };

  const renderCustomerLayersList = () => (
    <div className="editor-layers-list">
      {layers.length ? layers.map((layer) => (
        <div
          className={`editor-layer-row${selection?.id === layer.id ? ' is-active' : ''}`}
          key={layer.id}
        >
          <button type="button" className="editor-layer-select" onClick={() => { selectLayer(layer.id); setMobilePanel('properties'); }} title={`Select ${layer.name}`}>
            <span className="editor-layer-kind">{layer.type === 'text' ? 'T' : layer.type === 'image' || layer.type === 'framed-image' ? '▧' : layer.type === 'decoration' ? '✿' : '◇'}</span>
            <span className="editor-layer-label">{layer.name}</span>
          </button>
        </div>
      )) : <p className="editor-empty-layers">Add text or an image to begin.</p>}
    </div>
  );

  return (
    <section className={`design-editor${previewMode ? ' is-preview' : ''}${mode === 'customer' ? ' is-customer-studio' : ''}`} aria-label="Design editor">
      {previewMode && <div className="editor-preview-banner"><strong>Preview</strong><button type="button" onClick={() => setPreviewMode(false)}>Back to editing</button><button type="button" onClick={() => downloadImage('png')}>Export PNG</button></div>}
      {!previewMode && <div className="editor-toolbar">
        <div className="editor-toolbar-group editor-history-actions">
          <button type="button" className="editor-icon-button" aria-label="Undo" title="Undo" disabled={!historyState.undo} onClick={() => restoreHistory(-1)}>↶</button>
          <button type="button" className="editor-icon-button" aria-label="Redo" title="Redo" disabled={!historyState.redo} onClick={() => restoreHistory(1)}>↷</button>
          {mode === 'customer' && <span className="editor-toolbar-hint">Select any layer · drag to move · handles to resize · photo stays where you put it</span>}
          <span className="editor-toolbar-divider" />
          {mode === 'admin' && <>
          <label className="editor-export-setting">Scale<select aria-label="Export scale" value={exportScale} onChange={(event) => setExportScale(Number(event.target.value))}><option value="1">1×</option><option value="2">2×</option><option value="3">3×</option></select></label>
          <label className="editor-export-setting">Format<select aria-label="Export format" value={exportFormat} onChange={(event) => setExportFormat(event.target.value)}><option value="png">PNG</option><option value="jpg">JPG</option><option value="pdf">PDF</option></select></label>
          <button type="button" className={`editor-tool-button${showGuides ? ' editor-tool-primary' : ''}`} onClick={() => setShowGuides((current) => !current)}>{showGuides ? 'Guides on' : 'Guides off'}</button>
          <button type="button" className={`editor-tool-button${gridEnabled ? ' editor-tool-primary' : ''}`} onClick={() => setGridEnabled((current) => !current)}>{gridEnabled ? 'Grid on' : 'Grid off'}</button>
          <label className="editor-export-setting">Grid<select aria-label="Grid spacing" value={gridSize} onChange={(event) => setGridSize(Number(event.target.value))}><option value="8">8px</option><option value="12">12px</option><option value="16">16px</option><option value="24">24px</option><option value="32">32px</option></select></label>
          <button type="button" className="editor-tool-button" disabled={!selection} onClick={snapSelectionToAngle}>Snap 15°</button>
          </>}
          {mode === 'customer' && <>
            <button type="button" className={`editor-tool-button${showGuides ? ' editor-tool-primary' : ''}`} onClick={() => setShowGuides((current) => !current)}>{showGuides ? 'Guides on' : 'Guides off'}</button>
            <button type="button" className="editor-tool-button" onClick={() => setPreviewMode(true)}>Preview</button>
          </>}
          <button type="button" className="editor-tool-button editor-tool-dark" onClick={() => downloadImage()}>Export</button>
          {mode === 'admin' && <button type="button" className="editor-tool-button" onClick={downloadTemplate}>JSON</button>}
          {mode === 'admin' && <button type="button" className="editor-tool-button" onClick={() => templateUploadRef.current?.click()}>Import</button>}
          {mode === 'admin' && <button type="button" className="editor-tool-button" onClick={saveTemplate}>Save</button>}
          {mode === 'admin' && <button type="button" className="editor-tool-button" onClick={() => setPreviewMode(true)}>Preview</button>}
          <input ref={templateUploadRef} type="file" accept="application/json,.json" hidden onChange={(event) => { importTemplate(event.target.files?.[0]); event.target.value = ''; }} />
        </div>
      </div>}
      <div className={`editor-workspace${mode === 'customer' ? ' editor-workspace-with-rail' : ''}`}>
        {!previewMode && mode === 'customer' && (
          <EditorToolRail mode={mode} activeTool={activeTool} onSelect={handleEditorTool} />
        )}
        {!previewMode && <aside className={`editor-panel editor-left-panel${mobilePanel === 'tools' ? ' is-mobile-open' : ''}`}>
          {mode === 'admin' && <>
            <div className="editor-panel-heading"><span>Canvas</span><span>{canvasSize.width} × {canvasSize.height}</span></div>
            <div className="editor-size-fields">
              <label>Width<input type="number" min="100" max="12000" value={sizeDraft.width} onChange={(event) => setSizeDraft((current) => ({ ...current, width: event.target.value }))} /></label>
              <label>Height<input type="number" min="100" max="12000" value={sizeDraft.height} onChange={(event) => setSizeDraft((current) => ({ ...current, height: event.target.value }))} /></label>
            </div>
            <button type="button" className="editor-panel-action" onClick={applyCanvasSize}>Apply size</button>
            <div className="editor-panel-heading editor-layers-heading"><span>Elements</span></div>
            <div className="editor-elements-grid">
              <button type="button" onClick={addText}>Add text</button>
              <button type="button" onClick={() => imageUploadRef.current?.click()}>Add image</button>
              <button type="button" onClick={addPhotoFrame}>Photo frame</button>
              <button type="button" onClick={() => backgroundUploadRef.current?.click()}>Background</button>
              <button type="button" onClick={() => addShape('rectangle')}>Rectangle</button>
              <button type="button" onClick={() => addShape('circle')}>Circle</button>
              <button type="button" onClick={() => addShape('line')}>Line</button>
            </div>
            <div className="editor-panel-heading editor-layers-heading"><span>Asset library</span></div>
            <div className="editor-asset-library">
              {presetAssets.map((preset) => (
                <button key={preset.name} type="button" className="editor-asset-swatch" onClick={() => addPresetAsset(preset)}>
                  <span style={{ background: `linear-gradient(135deg, ${preset.colors[0]}, ${preset.colors[1]})` }} />
                  {preset.name}
                </button>
              ))}
              <label className="editor-upload-tile">
                <span>Upload asset</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { addImage(event.target.files?.[0]); event.target.value = ''; }} />
              </label>
            </div>
            <label className="editor-property-label editor-background-color">Background color<input type="color" defaultValue={normalizedInitial.canvas.backgroundColor} onChange={(event) => setBackgroundColor(event.target.value)} /></label>
            <label className="editor-toggle editor-guides-toggle"><input type="checkbox" checked={showGuides} onChange={(event) => setShowGuides(event.target.checked)} /> Print-safe guides</label>
            <label className="editor-toggle editor-grid-toggle"><input type="checkbox" checked={gridEnabled} onChange={(event) => setGridEnabled(event.target.checked)} /> Snap to grid</label>
            {gridEnabled && <label className="editor-property-label">Grid spacing<input type="number" min="4" max="128" step="4" value={gridSize} onChange={(event) => setGridSize(Math.max(4, Number(event.target.value) || 4))} /></label>}
            <input ref={imageUploadRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { addImage(event.target.files?.[0]); event.target.value = ''; }} />
            <input ref={backgroundUploadRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { addImage(event.target.files?.[0], true); event.target.value = ''; }} />
            <input ref={replaceUploadRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { replaceSelectedImage(event.target.files?.[0]); event.target.value = ''; }} />
            <div className="editor-panel-heading editor-layers-heading"><span>Elements library</span></div>
            <ElementsLibraryPanel
              mode={libraryMode}
              onModeChange={setLibraryMode}
              onAddAsset={handleCatalogAsset}
            />
          </>}
          {mode === 'customer' && (
            <div className="editor-customer-tool-sheet" key={activeTool}>
              <div className="editor-panel-heading editor-customer-tool-sheet__head">
                <span>{CUSTOMER_TOOL_TITLES[activeTool] || 'Tools'}</span>
                <span className="editor-customer-tool-sheet__hint">Canvas is in the center</span>
              </div>

              {(activeTool === 'photos' || activeTool === 'uploads') && (
                <>
                  <p className="editor-customer-hint">Add photos, then drag them anywhere on the canvas.</p>
                  <div className="editor-elements-grid editor-elements-grid--customer">
                    <button type="button" onClick={() => imageUploadRef.current?.click()}>Add image</button>
                    <button type="button" onClick={() => backgroundUploadRef.current?.click()}>Set background</button>
                  </div>
                </>
              )}

              {activeTool === 'background' && (
                <>
                  <p className="editor-customer-hint">Upload a full-canvas background image.</p>
                  <button type="button" className="editor-panel-action editor-panel-action--compact" onClick={() => backgroundUploadRef.current?.click()}>Upload background</button>
                </>
              )}

              {activeTool === 'text' && (
                <>
                  <button type="button" className="editor-panel-action editor-panel-action--compact" onClick={() => { addText(); setMobilePanel('properties'); }}>Add text box</button>
                  {layers.some((layer) => layer.type === 'text' && layer.editable) && (
                    <div className="editor-customer-text-fields">
                      {layers.filter((layer) => layer.type === 'text' && layer.editable).map((layer) => (
                        <button
                          key={layer.id}
                          type="button"
                          className={`editor-text-field-chip${selection?.id === layer.id ? ' is-active' : ''}`}
                          onClick={() => { selectLayer(layer.id); setMobilePanel('properties'); }}
                        >
                          <span className="editor-text-field-chip__label">{layer.name}</span>
                          <span className="editor-text-field-chip__value">{layer.preview || 'Tap to edit'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {(activeTool === 'elements' || activeTool === 'frames') && (
                <ElementsLibraryPanel
                  compact
                  mode={libraryMode}
                  onModeChange={setLibraryMode}
                  onAddAsset={handleCatalogAsset}
                />
              )}

              {activeTool === 'layers' && renderCustomerLayersList()}

              <input ref={imageUploadRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { addImage(event.target.files?.[0]); event.target.value = ''; }} />
              <input ref={backgroundUploadRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { addImage(event.target.files?.[0], true); event.target.value = ''; }} />
              {selection?.replaceable && (activeTool === 'photos' || activeTool === 'uploads') && (
                <button type="button" className="editor-panel-action editor-panel-action--compact" onClick={() => replaceUploadRef.current?.click()}>Replace selected photo</button>
              )}
              <input ref={replaceUploadRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { replaceSelectedImage(event.target.files?.[0]); event.target.value = ''; }} />
            </div>
          )}
          {mode === 'admin' && (
          <details className="editor-left-accordion" ref={layersAccordionRef} open>
            <summary>Layers <span className="editor-left-accordion__count">{layers.length}</span></summary>
          <div className="editor-layers-list">
            {layers.length ? layers.map((layer) => (
              <div
                className={`editor-layer-row${selection?.id === layer.id ? ' is-active' : ''}`}
                key={layer.id}
                draggable={mode === 'admin'}
                title="Drag to reorder"
                onDragStart={(event) => {
                  if (mode !== 'admin') return;
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', layer.id);
                }}
                onDragOver={(event) => {
                  if (mode !== 'admin') return;
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  if (mode !== 'admin') return;
                  event.preventDefault();
                  const draggedId = event.dataTransfer.getData('text/plain') || null;
                  reorderLayerStack(draggedId, layer.id);
                }}
              >
                <span className="editor-layer-drag" aria-label="Drag to reorder" title="Drag to reorder">⋮⋮</span>
                <button type="button" className="editor-layer-select" onClick={() => selectLayer(layer.id)} title={`Select ${layer.name}`}>
                  <span className="editor-layer-kind">{layer.type === 'text' ? 'T' : layer.type === 'image' || layer.type === 'framed-image' ? '▧' : layer.type === 'decoration' ? '✿' : '◇'}</span><span className="editor-layer-label">{layer.name}</span>
                </button>
                {mode === 'admin' && <>
                  <button type="button" className="editor-layer-order" aria-label={`Bring ${layer.name} forward`} onClick={() => {
                    const object = canvasRef.current?.getObjects().find((item) => item.id === layer.id);
                    if (!object) return;
                    canvasRef.current.bringObjectForward(object);
                    canvasRef.current.requestRenderAll();
                    refreshLayers();
                    queueSnapshot();
                  }}>↑</button>
                  <button type="button" className="editor-layer-order" aria-label={`Send ${layer.name} backward`} onClick={() => {
                    const object = canvasRef.current?.getObjects().find((item) => item.id === layer.id);
                    if (!object) return;
                    canvasRef.current.sendObjectBackwards(object);
                    canvasRef.current.requestRenderAll();
                    refreshLayers();
                    queueSnapshot();
                  }}>↓</button>
                  <button type="button" className="editor-layer-flag" aria-label={`${layer.visible ? 'Hide' : 'Show'} ${layer.name}`} onClick={() => toggleFlag(canvasRef.current?.getObjects().find((object) => object.id === layer.id), 'visible')}>{layer.visible ? '●' : '○'}</button>
                  <button type="button" className="editor-layer-flag" aria-label={`${layer.locked ? 'Unlock' : 'Lock'} ${layer.name}`} onClick={() => toggleFlag(canvasRef.current?.getObjects().find((object) => object.id === layer.id), 'locked')}>{layer.locked ? '▣' : '□'}</button>
                </>}
              </div>
            )) : <p className="editor-empty-layers">Add text or an image to begin.</p>}
          </div>
          </details>
          )}
        </aside>}
        <div className="editor-canvas-area">
          {mode === 'customer' && (selection?.type === 'image' || selection?.type === 'framed-image') && !previewMode && (
            <div className="editor-customer-image-bar" aria-label="Image editing">
              <span className="editor-customer-image-bar__label">Editing image</span>
              {selection.replaceable && (
                <button type="button" onClick={() => replaceUploadRef.current?.click()}>Replace</button>
              )}
              <button type="button" onClick={() => alignSelection('center')}>Center on canvas</button>
              <button type="button" className="is-danger" onClick={deleteSelected}>Remove</button>
            </div>
          )}
          {mode === 'admin' && selection && !previewMode && (
            <div className="editor-selection-toolbar editor-selection-toolbar--docked" aria-label="Selection actions">
              <button type="button" onClick={duplicateSelected}>Duplicate</button>
              <button type="button" onClick={() => alignSelection('center')}>Center</button>
              <button type="button" onClick={() => changeOrder('bringObjectForward')}>Forward</button>
              <button type="button" onClick={() => changeOrder('sendObjectBackwards')}>Back</button>
              <button type="button" onClick={() => changeOrder('bringObjectToFront')}>Front</button>
              <button type="button" onClick={() => changeOrder('sendObjectToBack')}>Back layer</button>
              <button type="button" onClick={() => toggleFlag(activeObject(), 'visible')}>{activeObject()?.visible === false ? 'Show' : 'Hide'}</button>
              <button type="button" onClick={() => toggleFlag(activeObject(), 'locked')}>{activeObject()?.locked ? 'Unlock' : 'Lock'}</button>
              <button type="button" onClick={() => alignSelection('left')}>Left</button>
              <button type="button" onClick={() => alignSelection('right')}>Right</button>
              <button type="button" className="is-danger" onClick={deleteSelected}>Delete</button>
            </div>
          )}
          <div
            className="editor-canvas-scroll"
            ref={canvasScrollRef}
            onDragOver={(event) => {
              if (event.dataTransfer.types.includes(DRAG_MIME)) {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'copy';
              }
            }}
            onDrop={handleCanvasAssetDrop}
          >
            <div className="editor-canvas-frame" style={{ width: canvasSize.width * zoom, height: canvasSize.height * zoom }}>
              {showGuides && <div className="editor-safe-guides" aria-hidden="true"><span className="guide guide-vertical" /><span className="guide guide-horizontal" /><span className="guide guide-top" /><span className="guide guide-bottom" /></div>}
              {gridEnabled && <div className="editor-grid-overlay" style={{ '--grid-size': `${gridSize}px` }} aria-hidden="true" />}
              {smartGuides && (guideLines.vertical.length > 0 || guideLines.horizontal.length > 0) && (
                <div className="editor-smart-guide-overlay" aria-hidden="true">
                  {guideLines.vertical.map((line, index) => (
                    <span key={`v-${index}`} className="editor-smart-guide editor-smart-guide-vertical" style={{ left: `${line.position}px`, top: 0, height: `${canvasSize.height}px` }} />
                  ))}
                  {guideLines.horizontal.map((line, index) => (
                    <span key={`h-${index}`} className="editor-smart-guide editor-smart-guide-horizontal" style={{ top: `${line.position}px`, left: 0, width: `${canvasSize.width}px` }} />
                  ))}
                </div>
              )}
              <div className="editor-canvas-scale" style={{ width: canvasSize.width, height: canvasSize.height, transform: `scale(${zoom})` }}>
                <canvas ref={canvasElementRef} aria-label="Design canvas" />
              </div>
            </div>
          </div>
          {!previewMode && <div className="editor-zoom-controls"><span>Zoom</span><input aria-label="Zoom" type="range" min="0.25" max="1.5" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /><output>{Math.round(zoom * 100)}%</output></div>}
        </div>
        {!previewMode && <aside className={`editor-panel editor-right-panel${mobilePanel === 'properties' ? ' is-mobile-open' : ''}`}>
          <div className="editor-panel-heading"><span>{mode === 'customer' ? 'Edit selection' : 'Properties'}</span>{selection && <span>{selection.type}</span>}</div>
          {selection?.type === 'multiple' ? <>
            <p className="editor-selection-empty">{selection.count} elements selected. Drag or transform them together on the canvas.</p>
            {mode === 'admin' && <>
              <div className="editor-alignment-tools">
                <span>Distribute</span>
                <div className="editor-alignment-grid">
                  <button type="button" onClick={() => distributeSelection('horizontal')}>H</button>
                  <button type="button" onClick={() => distributeSelection('vertical')}>V</button>
                </div>
              </div>
              <div className="editor-alignment-tools">
                <span>Space</span>
                <div className="editor-alignment-grid">
                  <button type="button" onClick={() => spaceSelectionEvenly('horizontal')}>H</button>
                  <button type="button" onClick={() => spaceSelectionEvenly('vertical')}>V</button>
                </div>
              </div>
              <div className="editor-selection-actions"><button type="button" onClick={duplicateSelected}>Duplicate</button><button type="button" className="is-danger" onClick={deleteSelected}>Delete</button></div>
            </>}
          </> : selection ? <>
            {selection.type === 'text' && <>
              {(mode === 'admin' || selection.permissions.editable) && <label className="editor-property-label">Text<input value={selection.text} disabled={propertyDisabled()} onChange={(event) => updateSelected('text', event.target.value)} /></label>}
              <PremiumFontPicker
                value={selection.fontFamily}
                disabled={propertyDisabled()}
                onChange={(family) => updateSelected('fontFamily', family)}
              />
              <div className="editor-property-pair">
                <label className="editor-property-label">Size<input type="number" min="1" max="500" value={selection.fontSize} disabled={propertyDisabled()} onChange={(event) => updateSelected('fontSize', event.target.value)} /></label>
                <label className="editor-property-label">Weight<select value={selection.fontWeight} disabled={propertyDisabled()} onChange={(event) => updateSelected('fontWeight', event.target.value)}><option value="400">Regular</option><option value="500">Medium</option><option value="600">Semibold</option><option value="700">Bold</option></select></label>
              </div>
              <div className="editor-property-pair">
                <label className="editor-property-label">Align<select value={selection.textAlign} disabled={propertyDisabled()} onChange={(event) => updateSelected('textAlign', event.target.value)}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option><option value="justify">Justify</option></select></label>
              </div>
              <div className="editor-text-style-toggles">
                <label className="editor-toggle"><input type="checkbox" checked={['700', 'bold'].includes(selection.fontWeight)} disabled={propertyDisabled()} onChange={(event) => updateSelected('fontWeight', event.target.checked ? '700' : '400')} /> Bold</label>
                <label className="editor-toggle"><input type="checkbox" checked={selection.fontStyle === 'italic'} disabled={propertyDisabled()} onChange={(event) => updateSelected('fontStyle', event.target.checked ? 'italic' : 'normal')} /> Italic</label>
                <label className="editor-toggle"><input type="checkbox" checked={selection.underline} disabled={propertyDisabled()} onChange={(event) => updateSelected('underline', event.target.checked)} /> Underline</label>
              </div>
              <div className="editor-property-pair">
                <label className="editor-property-label">Line height<input type="number" min="0.5" max="5" step="0.1" value={selection.lineHeight} disabled={propertyDisabled()} onChange={(event) => updateSelected('lineHeight', event.target.value)} /></label>
                <label className="editor-property-label">Spacing<input type="number" min="0" max="1000" value={selection.letterSpacing} disabled={propertyDisabled()} onChange={(event) => updateSelected('letterSpacing', event.target.value)} /></label>
              </div>
              {mode === 'admin' && <label className="editor-property-label">Overflow<select value={selection.overflow || 'wrap'} disabled={propertyDisabled()} onChange={(event) => updateSelected('overflow', event.target.value)}><option value="wrap">Wrap</option><option value="shrink">Auto-shrink</option><option value="clip">Clip</option></select></label>}
              <PremiumColorPicker
                value={selection.color}
                disabled={propertyDisabled()}
                onChange={(hex) => updateSelected('color', hex)}
              />
            </>}
            <div className="editor-alignment-tools">
              <span>Align on canvas</span>
              <div className="editor-alignment-grid">
                <button type="button" onClick={() => alignSelection('left')}>L</button>
                <button type="button" onClick={() => alignSelection('center')}>C</button>
                <button type="button" onClick={() => alignSelection('right')}>R</button>
                <button type="button" onClick={() => alignSelection('top')}>T</button>
                <button type="button" onClick={() => alignSelection('middle')}>M</button>
                <button type="button" onClick={() => alignSelection('bottom')}>B</button>
              </div>
            </div>
            {['rectangle', 'circle', 'line', 'shape'].includes(selection.type) && <>
              <label className="editor-property-label">Fill<input type="color" value={selection.fill} onChange={(event) => updateSelected('fill', event.target.value)} /></label>
            </>}
            {(selection.type === 'image' || selection.type === 'framed-image') && selection.replaceable && <button type="button" className="editor-panel-action" onClick={() => replaceUploadRef.current?.click()}>Replace Photo</button>}
            {(selection.type === 'image' || selection.type === 'framed-image') && selection.replaceable && <>
              <label className="editor-property-label">Photo zoom<input type="range" min="1" max="3" step="0.1" value={selection.cropZoom} disabled={propertyDisabled('replaceable')} onChange={(event) => updateSelected('cropZoom', event.target.value)} /></label>
              {selection.type === 'framed-image' && <>
                <label className="editor-property-label">Pan horizontal<input type="range" min="0" max="1" step="0.01" value={selection.cropXPosition} disabled={propertyDisabled('replaceable')} onChange={(event) => updateSelected('cropXPosition', event.target.value)} /></label>
                <label className="editor-property-label">Pan vertical<input type="range" min="0" max="1" step="0.01" value={selection.cropYPosition} disabled={propertyDisabled('replaceable')} onChange={(event) => updateSelected('cropYPosition', event.target.value)} /></label>
              </>}
              {mode === 'admin' && <>
                <label className="editor-property-label">Crop horizontal<input type="range" min="0" max="1" step="0.01" value={selection.cropXPosition} onChange={(event) => updateSelected('cropXPosition', event.target.value)} /></label>
                <label className="editor-property-label">Crop vertical<input type="range" min="0" max="1" step="0.01" value={selection.cropYPosition} onChange={(event) => updateSelected('cropYPosition', event.target.value)} /></label>
              </>}
            </>}
            {mode === 'admin' && <>
              <div className="editor-panel-heading editor-layers-heading">Element permissions</div>
              {['editable', 'movable', 'resizable', 'rotatable', ...(selection.type === 'image' ? ['replaceable'] : []), 'deletable'].map((permission) => <label className="editor-toggle" key={permission}><input type="checkbox" checked={permission === 'editable' ? selection.editable : permission === 'replaceable' ? selection.replaceable : selection.permissions[permission] !== false} onChange={() => togglePermission(permission)} /> {permission[0].toUpperCase() + permission.slice(1)}</label>)}
            </>}
            <div className="editor-property-pair">
              {(mode === 'admin' || selection.permissions.movable) && <label className="editor-property-label">X<input type="number" value={selection.left} disabled={propertyDisabled('movable')} onChange={(event) => updateSelected('left', event.target.value)} /></label>}
              {(mode === 'admin' || selection.permissions.movable) && <label className="editor-property-label">Y<input type="number" value={selection.top} disabled={propertyDisabled('movable')} onChange={(event) => updateSelected('top', event.target.value)} /></label>}
            </div>
            <div className="editor-property-pair">
              {(mode === 'admin' || selection.permissions.resizable) && <label className="editor-property-label">Width<input type="number" min="1" value={selection.width} disabled={propertyDisabled('resizable')} onChange={(event) => updateSelected('width', event.target.value)} /></label>}
              {(mode === 'admin' || selection.permissions.resizable) && <label className="editor-property-label">Height<input type="number" min="1" value={selection.height} disabled={propertyDisabled('resizable')} onChange={(event) => updateSelected('height', event.target.value)} /></label>}
            </div>
            {(mode === 'admin' || selection.permissions.rotatable) && <label className="editor-property-label">Rotation<input type="number" min="-360" max="360" value={selection.angle} disabled={propertyDisabled('rotatable')} onChange={(event) => updateSelected('angle', event.target.value)} /></label>}
            {(mode === 'admin' || selection.permissions.rotatable) && <div className="editor-selection-actions"><button type="button" disabled={propertyDisabled('rotatable')} onClick={() => snapSelectionToAngle()}>Snap 15°</button><button type="button" disabled={propertyDisabled('rotatable')} onClick={() => snapSelectionToAngle(90)}>Snap 90°</button></div>}
            {(mode === 'admin' || selection.permissions.editable) && (
              <label className="editor-property-label">Opacity<input type="range" min="0" max="1" step="0.01" value={selection.opacity} disabled={propertyDisabled('editable')} onChange={(event) => updateSelected('opacity', event.target.value)} /></label>
            )}
            {['decoration', 'framed-image'].includes(selection.type) && (
              <div className="editor-selection-actions">
                <button type="button" disabled={propertyDisabled('deletable')} onClick={duplicateSelected}>Duplicate</button>
                <button type="button" disabled={propertyDisabled('resizable')} onClick={() => flipSelection('x')}>Flip H</button>
                <button type="button" disabled={propertyDisabled('resizable')} onClick={() => flipSelection('y')}>Flip V</button>
                <button type="button" disabled={propertyDisabled('deletable')} onClick={() => changeOrder('bringObjectForward')}>Forward</button>
                <button type="button" disabled={propertyDisabled('deletable')} onClick={() => changeOrder('sendObjectBackwards')}>Backward</button>
                <button type="button" disabled={propertyDisabled('deletable')} onClick={() => changeOrder('bringObjectToFront')}>Front</button>
                <button type="button" disabled={propertyDisabled('deletable')} onClick={() => changeOrder('sendObjectToBack')}>Back</button>
                <button type="button" className="is-danger" disabled={propertyDisabled('deletable')} onClick={deleteSelected}>Delete</button>
              </div>
            )}
            {mode === 'admin' && <>
              <div className="editor-opacity-presets">
                <span>Opacity presets</span>
                <div className="editor-opacity-preset-grid">
                  {['25%', '50%', '75%', '100%'].map((preset) => (
                    <button type="button" key={preset} onClick={() => applyOpacityPreset(preset)}>{preset}</button>
                  ))}
                </div>
              </div>
            <label className="editor-property-label">Blend mode<select value={selection.blendMode || 'source-over'} onChange={(event) => updateSelected('blendMode', event.target.value)}>{BLEND_MODES.map((modeOption) => <option key={modeOption.value} value={modeOption.value}>{modeOption.label}</option>)}</select></label>
            <div className="editor-style-presets">
              <span>Quick styles</span>
              <div className="editor-style-preset-grid">
                <button type="button" onClick={() => applyQuickStylePreset('minimal')}>Minimal</button>
                <button type="button" onClick={() => applyQuickStylePreset('softShadow')}>Soft shadow</button>
                <button type="button" onClick={() => applyQuickStylePreset('boldOutline')}>Bold outline</button>
              </div>
            </div>
            <div className="editor-effect-library">
              <span>Effect library</span>
              <div className="editor-effect-preset-grid">
                <button type="button" onClick={() => applyEffectPreset('softGlow')}>Soft glow</button>
                <button type="button" onClick={() => applyEffectPreset('matte')}>Matte</button>
                <button type="button" onClick={() => applyEffectPreset('premiumBorder')}>Premium border</button>
                <button type="button" onClick={() => applyEffectPreset('punchyOverlay')}>Punchy overlay</button>
              </div>
            </div>
            <div className="editor-brand-pack">
              <span>Brand pack</span>
              <div className="editor-brand-preset-grid">
                <button type="button" onClick={() => applyBrandPreset('luxury')}>Luxury</button>
                <button type="button" onClick={() => applyBrandPreset('streetPop')}>Street pop</button>
                <button type="button" onClick={() => applyBrandPreset('quietLuxury')}>Quiet luxury</button>
                <button type="button" onClick={() => applyBrandPreset('editorialLuxe')}>Editorial luxe</button>
              </div>
            </div>
            <div className="editor-finish-pack">
              <span>Print finish</span>
              <div className="editor-finish-preset-grid">
                <button type="button" onClick={() => applyPrintFinishPreset('foil')}>Foil</button>
                <button type="button" onClick={() => applyPrintFinishPreset('matteFinish')}>Matte finish</button>
                <button type="button" onClick={() => applyPrintFinishPreset('softEmboss')}>Soft emboss</button>
                <button type="button" onClick={() => applyPrintFinishPreset('vintagePaper')}>Vintage paper</button>
              </div>
            </div>
            <div className="editor-composition-pack">
              <span>Composition pack</span>
              <div className="editor-composition-preset-grid">
                <button type="button" onClick={() => applyCompositionPreset('centerStage')}>Center stage</button>
                <button type="button" onClick={() => applyCompositionPreset('splitBanner')}>Split banner</button>
                <button type="button" onClick={() => applyCompositionPreset('focusFrame')}>Focus frame</button>
                <button type="button" onClick={() => applyCompositionPreset('badgeStack')}>Badge stack</button>
              </div>
            </div>
            <div className="editor-campaign-pack">
              <span>Campaign mockup</span>
              <div className="editor-campaign-preset-grid">
                <button type="button" onClick={() => applyCampaignMockupPreset('heroBanner')}>Hero banner</button>
                <button type="button" onClick={() => applyCampaignMockupPreset('socialCard')}>Social card</button>
                <button type="button" onClick={() => applyCampaignMockupPreset('productSpotlight')}>Product spotlight</button>
                <button type="button" onClick={() => applyCampaignMockupPreset('posterTile')}>Poster tile</button>
              </div>
            </div>
            <div className="editor-packaging-pack">
              <span>Packaging</span>
              <div className="editor-packaging-preset-grid">
                <button type="button" onClick={() => applyPackagingPreset('boxHero')}>Box hero</button>
                <button type="button" onClick={() => applyPackagingPreset('shelfCard')}>Shelf card</button>
                <button type="button" onClick={() => applyPackagingPreset('luxuryWrap')}>Luxury wrap</button>
                <button type="button" onClick={() => applyPackagingPreset('productSeal')}>Product seal</button>
              </div>
            </div>
            <div className="editor-retail-pack">
              <span>Retail display</span>
              <div className="editor-retail-preset-grid">
                <button type="button" onClick={() => applyRetailDisplayPreset('shelfHero')}>Shelf hero</button>
                <button type="button" onClick={() => applyRetailDisplayPreset('counterStack')}>Counter stack</button>
                <button type="button" onClick={() => applyRetailDisplayPreset('windowPromo')}>Window promo</button>
                <button type="button" onClick={() => applyRetailDisplayPreset('giftSet')}>Gift set</button>
              </div>
            </div>
            <div className="editor-event-pack">
              <span>Event promo</span>
              <div className="editor-event-preset-grid">
                <button type="button" onClick={() => applyEventPromoPreset('launchStage')}>Launch stage</button>
                <button type="button" onClick={() => applyEventPromoPreset('vipInvite')}>VIP invite</button>
                <button type="button" onClick={() => applyEventPromoPreset('popBooth')}>Pop booth</button>
                <button type="button" onClick={() => applyEventPromoPreset('festivalSplash')}>Festival splash</button>
              </div>
            </div>
            <div className="editor-vibe-pack">
              <span>Vibe pack</span>
              <div className="editor-vibe-preset-grid">
                <button type="button" onClick={() => applyVibePreset('neonPulse')}>Neon pulse</button>
                <button type="button" onClick={() => applyVibePreset('warmStudio')}>Warm studio</button>
                <button type="button" onClick={() => applyVibePreset('monochromeDrift')}>Monochrome drift</button>
                <button type="button" onClick={() => applyVibePreset('weekendGlow')}>Weekend glow</button>
              </div>
            </div>
            <div className="editor-material-pack">
              <span>Material textures</span>
              <div className="editor-material-preset-grid">
                <button type="button" onClick={() => applyMaterialTexturePreset('stoneGrain')}>Stone grain</button>
                <button type="button" onClick={() => applyMaterialTexturePreset('cottonWeave')}>Cotton weave</button>
                <button type="button" onClick={() => applyMaterialTexturePreset('brushedMetal')}>Brushed metal</button>
                <button type="button" onClick={() => applyMaterialTexturePreset('softSuede')}>Soft suede</button>
              </div>
            </div>
            <div className="editor-print-mood-pack">
              <span>Print mood</span>
              <div className="editor-print-mood-preset-grid">
                <button type="button" onClick={() => applyPrintMoodPreset('inkWash')}>Ink wash</button>
                <button type="button" onClick={() => applyPrintMoodPreset('posterGrain')}>Poster grain</button>
                <button type="button" onClick={() => applyPrintMoodPreset('newsprint')}>Newsprint</button>
                <button type="button" onClick={() => applyPrintMoodPreset('softGloss')}>Soft gloss</button>
              </div>
            </div>
            <div className="editor-editorial-mood-pack">
              <span>Editorial mood</span>
              <div className="editor-editorial-mood-preset-grid">
                <button type="button" onClick={() => applyEditorialMoodPreset('galleryNoir')}>Gallery noir</button>
                <button type="button" onClick={() => applyEditorialMoodPreset('softArchive')}>Soft archive</button>
                <button type="button" onClick={() => applyEditorialMoodPreset('springBloom')}>Spring bloom</button>
                <button type="button" onClick={() => applyEditorialMoodPreset('studioContour')}>Studio contour</button>
              </div>
            </div>
            <div className="editor-seasonal-palette-pack">
              <span>Seasonal palette</span>
              <div className="editor-seasonal-palette-preset-grid">
                <button type="button" onClick={() => applySeasonalPalettePreset('summerPop')}>Summer pop</button>
                <button type="button" onClick={() => applySeasonalPalettePreset('autumnDusk')}>Autumn dusk</button>
                <button type="button" onClick={() => applySeasonalPalettePreset('winterFrost')}>Winter frost</button>
                <button type="button" onClick={() => applySeasonalPalettePreset('monsoonMist')}>Monsoon mist</button>
              </div>
            </div>
            <div className="editor-art-direction-pack">
              <span>Art direction</span>
              <div className="editor-art-direction-preset-grid">
                <button type="button" onClick={() => applyArtDirectionPreset('minimalForm')}>Minimal form</button>
                <button type="button" onClick={() => applyArtDirectionPreset('boldGesture')}>Bold gesture</button>
                <button type="button" onClick={() => applyArtDirectionPreset('layeredCollage')}>Layered collage</button>
                <button type="button" onClick={() => applyArtDirectionPreset('handDrawnSketch')}>Hand-drawn sketch</button>
              </div>
            </div>
            <div className="editor-luxury-texture-pack">
              <span>Luxury texture</span>
              <div className="editor-luxury-texture-preset-grid">
                <button type="button" onClick={() => applyLuxuryTexturePreset('pearlSatin')}>Pearl satin</button>
                <button type="button" onClick={() => applyLuxuryTexturePreset('velvetGrain')}>Velvet grain</button>
                <button type="button" onClick={() => applyLuxuryTexturePreset('champagneGloss')}>Champagne gloss</button>
                <button type="button" onClick={() => applyLuxuryTexturePreset('ebonyLacquer')}>Ebony lacquer</button>
              </div>
            </div>
            <div className="editor-depth-layer-pack">
              <span>Depth layer</span>
              <div className="editor-depth-layer-preset-grid">
                <button type="button" onClick={() => applyDepthLayerPreset('softShadow')}>Soft shadow</button>
                <button type="button" onClick={() => applyDepthLayerPreset('luminousHaze')}>Luminous haze</button>
                <button type="button" onClick={() => applyDepthLayerPreset('cinematicGlow')}>Cinematic glow</button>
                <button type="button" onClick={() => applyDepthLayerPreset('midnightFade')}>Midnight fade</button>
              </div>
            </div>
            <div className="editor-atmosphere-pack">
              <span>Atmosphere</span>
              <div className="editor-atmosphere-preset-grid">
                <button type="button" onClick={() => applyAtmospherePreset('glassGlow')}>Glass glow</button>
                <button type="button" onClick={() => applyAtmospherePreset('sunsetHaze')}>Sunset haze</button>
                <button type="button" onClick={() => applyAtmospherePreset('studioFog')}>Studio fog</button>
                <button type="button" onClick={() => applyAtmospherePreset('neonBloom')}>Neon bloom</button>
              </div>
            </div>
            <div className="editor-highlight-pack">
              <span>Highlight pass</span>
              <div className="editor-highlight-preset-grid">
                <button type="button" onClick={() => applyHighlightPassPreset('softRim')}>Soft rim</button>
                <button type="button" onClick={() => applyHighlightPassPreset('edgeLight')}>Edge light</button>
                <button type="button" onClick={() => applyHighlightPassPreset('haloBloom')}>Halo bloom</button>
                <button type="button" onClick={() => applyHighlightPassPreset('spotlightWash')}>Spotlight wash</button>
              </div>
            </div>
            <div className="editor-focus-pack">
              <span>Focus stack</span>
              <div className="editor-focus-preset-grid">
                <button type="button" onClick={() => applyFocusStackPreset('depthFocus')}>Depth focus</button>
                <button type="button" onClick={() => applyFocusStackPreset('softBlur')}>Soft blur</button>
                <button type="button" onClick={() => applyFocusStackPreset('sharpCatch')}>Sharp catch</button>
                <button type="button" onClick={() => applyFocusStackPreset('layeredFocus')}>Layered focus</button>
              </div>
            </div>
            <div className="editor-studio-pack">
              <span>Studio light</span>
              <div className="editor-studio-preset-grid">
                <button type="button" onClick={() => applyStudioLightPreset('softBloom')}>Soft bloom</button>
                <button type="button" onClick={() => applyStudioLightPreset('filmHaze')}>Film haze</button>
                <button type="button" onClick={() => applyStudioLightPreset('spotlightFlare')}>Spotlight flare</button>
                <button type="button" onClick={() => applyStudioLightPreset('glassShimmer')}>Glass shimmer</button>
              </div>
            </div>
            <div className="editor-cinematic-pack">
              <span>Cinematic light</span>
              <div className="editor-cinematic-preset-grid">
                <button type="button" onClick={() => applyCinematicLightPreset('softFlare')}>Soft flare</button>
                <button type="button" onClick={() => applyCinematicLightPreset('filmBleed')}>Film bleed</button>
                <button type="button" onClick={() => applyCinematicLightPreset('stageGlow')}>Stage glow</button>
                <button type="button" onClick={() => applyCinematicLightPreset('lumaWash')}>Luma wash</button>
              </div>
            </div>
            <div className="editor-color-grading-pack">
              <span>Color grading</span>
              <div className="editor-color-grading-preset-grid">
                <button type="button" onClick={() => applyColorGradingPreset('sunsetCurve')}>Sunset curve</button>
                <button type="button" onClick={() => applyColorGradingPreset('coolFade')}>Cool fade</button>
                <button type="button" onClick={() => applyColorGradingPreset('warmFilm')}>Warm film</button>
                <button type="button" onClick={() => applyColorGradingPreset('nightContrast')}>Night contrast</button>
              </div>
            </div>
            <div className="editor-tonal-balance-pack">
              <span>Tonal balance</span>
              <div className="editor-tonal-balance-preset-grid">
                <button type="button" onClick={() => applyTonalBalancePreset('softNeutrals')}>Soft neutrals</button>
                <button type="button" onClick={() => applyTonalBalancePreset('duskContrast')}>Dusk contrast</button>
                <button type="button" onClick={() => applyTonalBalancePreset('highKey')}>High key</button>
                <button type="button" onClick={() => applyTonalBalancePreset('lowGlow')}>Low glow</button>
              </div>
            </div>
            <div className="editor-light-ratio-pack">
              <span>Light ratio</span>
              <div className="editor-light-ratio-preset-grid">
                <button type="button" onClick={() => applyLightRatioPreset('softRange')}>Soft range</button>
                <button type="button" onClick={() => applyLightRatioPreset('midContrast')}>Mid contrast</button>
                <button type="button" onClick={() => applyLightRatioPreset('highAccent')}>High accent</button>
                <button type="button" onClick={() => applyLightRatioPreset('lowHaze')}>Low haze</button>
              </div>
            </div>
            <div className="editor-contrast-map-pack">
              <span>Contrast map</span>
              <div className="editor-contrast-map-preset-grid">
                <button type="button" onClick={() => applyContrastMapPreset('lowLift')}>Low lift</button>
                <button type="button" onClick={() => applyContrastMapPreset('softEdge')}>Soft edge</button>
                <button type="button" onClick={() => applyContrastMapPreset('warmKey')}>Warm key</button>
                <button type="button" onClick={() => applyContrastMapPreset('highDepth')}>High depth</button>
              </div>
            </div>
            <div className="editor-depth-pass-pack">
              <span>Depth pass</span>
              <div className="editor-depth-pass-preset-grid">
                <button type="button" onClick={() => applyDepthPassPreset('softVelvet')}>Soft velvet</button>
                <button type="button" onClick={() => applyDepthPassPreset('glassShadow')}>Glass shadow</button>
                <button type="button" onClick={() => applyDepthPassPreset('warmHaze')}>Warm haze</button>
                <button type="button" onClick={() => applyDepthPassPreset('nightEcho')}>Night echo</button>
              </div>
            </div>
            <div className="editor-shadow-balance-pack">
              <span>Shadow balance</span>
              <div className="editor-shadow-balance-preset-grid">
                <button type="button" onClick={() => applyShadowBalancePreset('softFall')}>Soft fall</button>
                <button type="button" onClick={() => applyShadowBalancePreset('leanGlow')}>Lean glow</button>
                <button type="button" onClick={() => applyShadowBalancePreset('lowEdge')}>Low edge</button>
                <button type="button" onClick={() => applyShadowBalancePreset('highBloom')}>High bloom</button>
              </div>
            </div>
            <div className="editor-tone-drift-pack">
              <span>Tone drift</span>
              <div className="editor-tone-drift-preset-grid">
                <button type="button" onClick={() => applyToneDriftPreset('coastalHaze')}>Coastal haze</button>
                <button type="button" onClick={() => applyToneDriftPreset('moodyDusk')}>Moody dusk</button>
                <button type="button" onClick={() => applyToneDriftPreset('nightWash')}>Night wash</button>
                <button type="button" onClick={() => applyToneDriftPreset('softDaylight')}>Soft daylight</button>
              </div>
            </div>
            <div className="editor-afterlight-pack">
              <span>Afterlight</span>
              <div className="editor-afterlight-preset-grid">
                <button type="button" onClick={() => applyAfterlightPreset('cinderHaze')}>Cinder haze</button>
                <button type="button" onClick={() => applyAfterlightPreset('glassVeil')}>Glass veil</button>
                <button type="button" onClick={() => applyAfterlightPreset('amberMist')}>Amber mist</button>
                <button type="button" onClick={() => applyAfterlightPreset('quietBloom')}>Quiet bloom</button>
              </div>
            </div>
            <div className="editor-velvet-hush-pack">
              <span>Velvet hush</span>
              <div className="editor-velvet-hush-preset-grid">
                <button type="button" onClick={() => applyVelvetHushPreset('stoneMist')}>Stone mist</button>
                <button type="button" onClick={() => applyVelvetHushPreset('nightPearl')}>Night pearl</button>
                <button type="button" onClick={() => applyVelvetHushPreset('warmAsh')}>Warm ash</button>
                <button type="button" onClick={() => applyVelvetHushPreset('lowSheen')}>Low sheen</button>
              </div>
            </div>
            </>}
            {mode === 'admin' && <div className="editor-property-pair">
              <label className="editor-property-label">Outline color<input type="color" value={selection.stroke === 'transparent' ? '#263536' : selection.stroke || '#263536'} onChange={(event) => updateSelected('stroke', event.target.value)} /></label>
              <label className="editor-property-label">Outline width<input type="number" min="0" max="50" value={selection.strokeWidth || 0} onChange={(event) => updateSelected('strokeWidth', event.target.value)} /></label>
            </div>}
            {mode === 'admin' && <>
            <div className="editor-property-pair">
              <label className="editor-property-label">Shadow color<input type="color" value={selection.shadowColor || '#000000'} onChange={(event) => { setShadowColor(event.target.value); updateSelected('shadowColor', event.target.value); }} /></label>
              <label className="editor-property-label">Blur<input type="number" min="0" max="50" value={selection.shadowBlur || 0} onChange={(event) => { setShadowBlur(Number(event.target.value)); updateSelected('shadowBlur', event.target.value); }} /></label>
            </div>
            <div className="editor-property-pair">
              <label className="editor-property-label">Offset X<input type="number" min="-50" max="50" value={selection.shadowOffsetX || 0} onChange={(event) => { setShadowOffsetX(Number(event.target.value)); updateSelected('shadowOffsetX', event.target.value); }} /></label>
              <label className="editor-property-label">Offset Y<input type="number" min="-50" max="50" value={selection.shadowOffsetY || 0} onChange={(event) => { setShadowOffsetY(Number(event.target.value)); updateSelected('shadowOffsetY', event.target.value); }} /></label>
            </div>
            <label className="editor-toggle editor-smart-guides-toggle"><input type="checkbox" checked={smartGuides} onChange={(event) => setSmartGuides(event.target.checked)} /> Smart guides</label>
            <label className="editor-toggle editor-grid-toggle"><input type="checkbox" checked={gridEnabled} onChange={(event) => setGridEnabled(event.target.checked)} /> Snap to grid</label>
            {gridEnabled && <label className="editor-property-label">Grid spacing<input type="number" min="4" max="128" step="4" value={gridSize} onChange={(event) => setGridSize(Math.max(4, Number(event.target.value) || 4))} /></label>}
            </>}
            {mode === 'admin' && <div className="editor-layer-actions">
              <button type="button" title="Bring forward" aria-label="Bring forward" disabled={selection.locked} onClick={() => changeOrder('bringObjectForward')}>Forward</button>
              <button type="button" title="Send backward" aria-label="Send backward" disabled={selection.locked} onClick={() => changeOrder('sendObjectBackwards')}>Backward</button>
              <button type="button" title="Bring to front" aria-label="Bring to front" disabled={selection.locked} onClick={() => changeOrder('bringObjectToFront')}>To front</button>
              <button type="button" title="Send to back" aria-label="Send to back" disabled={selection.locked} onClick={() => changeOrder('sendObjectToBack')}>To back</button>
            </div>}
            <div className="editor-selection-actions">
              {mode === 'admin' && <button type="button" disabled={selection.locked} onClick={duplicateSelected}>Duplicate</button>}
              {(mode === 'admin' || selection.permissions.deletable) && <button type="button" className="is-danger" disabled={propertyDisabled('deletable')} onClick={deleteSelected}>Delete</button>}
            </div>
            {mode === 'admin' && <label className="editor-toggle"><input type="checkbox" checked={selection.locked} onChange={() => toggleFlag(activeObject(), 'locked')} /> Locked</label>}
          </> : <>
            <p className="editor-selection-empty">{mode === 'customer' ? 'Select text, a photo, or a layer to edit it here.' : 'Select an object on the canvas or from Layers.'}</p>
            {mode === 'customer' && layers.some((layer) => layer.type === 'text' && layer.editable) && (
              <div className="editor-customer-text-fields editor-customer-text-fields--panel">
                {layers.filter((layer) => layer.type === 'text' && layer.editable).map((layer) => (
                  <button
                    key={layer.id}
                    type="button"
                    className="editor-text-field-chip"
                    onClick={() => selectLayer(layer.id)}
                  >
                    <span className="editor-text-field-chip__label">{layer.name}</span>
                    <span className="editor-text-field-chip__value">{layer.preview || 'Tap to edit'}</span>
                  </button>
                ))}
              </div>
            )}
          </>}
          {mode === 'customer' && selection?.locked && <p className="editor-selection-empty">This element is locked by the template designer.</p>}
          {status && <p className="editor-status" role="status">{status}</p>}
        </aside>}
      </div>
      {mode === 'customer' && !previewMode && (
        <div className="editor-mobile-dock" role="toolbar" aria-label="Mobile editor">
          <button
            type="button"
            className={mobilePanel === 'tools' ? 'is-active' : ''}
            onClick={() => setMobilePanel((current) => (current === 'tools' ? null : 'tools'))}
          >
            Tools
          </button>
          <button type="button" onClick={() => setMobilePanel(null)}>Canvas</button>
          <button
            type="button"
            className={mobilePanel === 'properties' ? 'is-active' : ''}
            onClick={() => setMobilePanel((current) => (current === 'properties' ? null : 'properties'))}
          >
            Properties
          </button>
        </div>
      )}
    </section>
  );
});

export default DesignEditor;