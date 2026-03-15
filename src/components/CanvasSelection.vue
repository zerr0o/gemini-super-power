<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { Check, Plus, Star, X as XIcon } from 'lucide-vue-next';

import { ASPECT_RATIO_VALUES } from '../services/geminiService';
import type { AspectRatio } from '../services/geminiService';
import type { LayerMaskPayload } from '../stores/appStore';
import { createAlphaMaskCanvas, createMaskCanvas, loadCachedImage, renderLayerComposite } from '../services/layerRendering';

const props = withDefaults(defineProps<{
  imageSrc: string;
  targetRatio: 'auto' | AspectRatio;
  availableRatios: readonly AspectRatio[];
  previewSrc?: string | null;
  overlaySrc?: string | null;
  overlayOpacity?: number;
  hasExplicitPrimaryReference?: boolean;
  canAddSecondaryReference?: boolean;
  liveLayers?: MaskEditableLayer[] | null;
  liveDocumentWidth?: number | null;
  liveDocumentHeight?: number | null;
  maskEditEnabled?: boolean;
  maskTargetNodeId?: string | null;
  maskBrushRadius?: number;
  maskBrushHardness?: number;
  maskBrushMode?: 'hide' | 'reveal';
  maskViewEnabled?: boolean;
}>(), {
  previewSrc: null,
  overlaySrc: null,
  overlayOpacity: 0.5,
  hasExplicitPrimaryReference: false,
  canAddSecondaryReference: true,
  liveLayers: null,
  liveDocumentWidth: null,
  liveDocumentHeight: null,
  maskEditEnabled: false,
  maskTargetNodeId: null,
  maskBrushRadius: 56,
  maskBrushHardness: 0.72,
  maskBrushMode: 'hide',
  maskViewEnabled: false,
});

export interface CropData {
  base64: string;
  originalWidth: number;
  originalHeight: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type CropConfirmAction = 'replace-primary' | 'add-secondary';

export interface CanvasViewState {
  zoom: number;
  zoomPercent: number;
  canPan: boolean;
}

export interface MaskEditableLayer {
  nodeId: string;
  left: number;
  top: number;
  width: number;
  height: number;
  sourceDataUrl: string;
  layerMask?: LayerMaskPayload | null;
}

export interface MaskEditorState {
  canUndo: boolean;
  hasMask: boolean;
  isDirty: boolean;
  targetNodeId: string | null;
}

const emit = defineEmits<{
  (e: 'cropped', data: CropData, action: CropConfirmAction): void;
  (e: 'update:ratio', ratio: AspectRatio): void;
  (e: 'update:selectionPx', w: number, h: number): void;
  (e: 'update:view', state: CanvasViewState): void;
  (e: 'mask-updated', payload: { nodeId: string; mask: LayerMaskPayload | null }): void;
  (e: 'mask-state-change', state: MaskEditorState): void;
}>();

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.1;

const containerRef = ref<HTMLDivElement | null>(null);
const imageRef = ref<HTMLImageElement | null>(null);
const liveCompositeCanvasRef = ref<HTMLCanvasElement | null>(null);

const mode = ref<'idle' | 'draw' | 'drag' | 'resize-nw' | 'resize-ne' | 'resize-se' | 'resize-sw' | 'pan'>('idle');
const startPos = ref({ x: 0, y: 0 });
const currentPos = ref({ x: 0, y: 0 });
const boxMetrics = ref({ x: 0, y: 0, w: 0, h: 0 });
const initialBox = ref({ x: 0, y: 0, w: 0, h: 0 });
const initialPan = ref({ x: 0, y: 0 });
const zoom = ref(1);
const panOffset = ref({ x: 0, y: 0 });
const naturalSize = ref({ width: 0, height: 0 });
const containerSize = ref({ width: 0, height: 0 });
const isMaskPainting = ref(false);
const maskCanvas = ref<HTMLCanvasElement | null>(null);
const alphaMaskCanvas = ref<HTMLCanvasElement | null>(null);
const hasDirtyMask = ref(false);
const maskPointerPreview = ref<{ x: number; y: number; inside: boolean } | null>(null);
const selectedLayerImage = ref<HTMLImageElement | null>(null);
const staticUnderlayCanvas = ref<HTMLCanvasElement | null>(null);
const staticOverlayCanvas = ref<HTMLCanvasElement | null>(null);
const selectedLayerRenderCanvas = ref<HTMLCanvasElement | null>(null);
const currentMaskNodeId = ref<string | null>(null);
const currentMaskDataUrl = ref<string | null>(null);

let resizeObserver: ResizeObserver | null = null;
let liveCompositeFrame: number | null = null;
let liveCompositeRenderToken = 0;
let liveCompositeCacheToken = 0;
let lastMaskPoint: { x: number; y: number } | null = null;
let isAlphaMaskDirty = true;
const maskUndoStack: HTMLCanvasElement[] = [];

function parseRatio(r: string) {
  if (r === 'auto') return 0;
  return ASPECT_RATIO_VALUES[r as AspectRatio] || 1;
}

function findClosestRatio(w: number, h: number): AspectRatio {
  const currentR = w / h;
  const supportedRatios: readonly AspectRatio[] = props.availableRatios.length > 0 ? props.availableRatios : ['1:1'];
  let closest = supportedRatios[0];
  let minDiff = Infinity;
  for (const name of supportedRatios) {
    const diff = Math.abs(ASPECT_RATIO_VALUES[name] - currentR);
    if (diff < minDiff) {
      minDiff = diff;
      closest = name;
    }
  }
  return closest;
}

function getImageRenderBox(
  naturalWidth: number,
  naturalHeight: number,
  containerWidth: number,
  containerHeight: number,
) {
  const imgRatio = naturalWidth / naturalHeight;
  const contRatio = containerWidth / containerHeight;

  let w = containerWidth;
  let h = containerHeight;
  let x = 0;
  let y = 0;

  if (imgRatio > contRatio) {
    h = w / imgRatio;
    y = (containerHeight - h) / 2;
  } else {
    w = h * imgRatio;
    x = (containerWidth - w) / 2;
  }
  return { x, y, w, h };
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

const renderBox = computed(() => {
  if (naturalSize.value.width < 1 || naturalSize.value.height < 1 || containerSize.value.width < 1 || containerSize.value.height < 1) {
    return null;
  }

  return getImageRenderBox(
    naturalSize.value.width,
    naturalSize.value.height,
    containerSize.value.width,
    containerSize.value.height,
  );
});

const zoomPercent = computed(() => Math.round(zoom.value * 100));
const canPan = computed(() => zoom.value > 1.001);
const selectedMaskLayer = computed(() =>
  props.liveLayers?.find(layer => layer.nodeId === props.maskTargetNodeId) || null
);
const selectedMaskLayerIndex = computed(() =>
  props.liveLayers?.findIndex(layer => layer.nodeId === props.maskTargetNodeId) ?? -1
);
const shouldRenderLiveComposite = computed(() =>
  !!props.liveLayers?.length
  && !!props.liveDocumentWidth
  && !!props.liveDocumentHeight
  && !!selectedMaskLayer.value
  && props.maskEditEnabled
);

const stageStyle = computed(() => {
  const box = renderBox.value;
  if (!box) return { display: 'none' };

  return {
    left: `${box.x}px`,
    top: `${box.y}px`,
    width: `${box.w}px`,
    height: `${box.h}px`,
    transform: `translate(${panOffset.value.x}px, ${panOffset.value.y}px) scale(${zoom.value})`,
    transformOrigin: 'top left',
  };
});

function emitViewState() {
  emit('update:view', {
    zoom: zoom.value,
    zoomPercent: zoomPercent.value,
    canPan: canPan.value,
  });
}

function cloneCanvas(source: HTMLCanvasElement) {
  const clone = document.createElement('canvas');
  clone.width = source.width;
  clone.height = source.height;
  const ctx = clone.getContext('2d');
  if (ctx) {
    ctx.drawImage(source, 0, 0);
  }
  return clone;
}

function pushMaskUndoSnapshot() {
  if (!maskCanvas.value) return;
  maskUndoStack.push(cloneCanvas(maskCanvas.value));
  if (maskUndoStack.length > 24) {
    maskUndoStack.shift();
  }
}

function emitMaskState() {
  emit('mask-state-change', {
    canUndo: maskUndoStack.length > 0,
    hasMask: !!currentMaskDataUrl.value || hasDirtyMask.value,
    isDirty: hasDirtyMask.value,
    targetNodeId: selectedMaskLayer.value?.nodeId || null,
  });
}

function serializeMaskCanvas(canvas: HTMLCanvasElement): LayerMaskPayload | null {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let hasVisibleMaskChange = false;
  for (let i = 0; i < imageData.length; i += 4) {
    if (
      imageData[i] !== 255
      || imageData[i + 1] !== 255
      || imageData[i + 2] !== 255
      || imageData[i + 3] !== 255
    ) {
      hasVisibleMaskChange = true;
      break;
    }
  }

  if (!hasVisibleMaskChange) {
    return null;
  }

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
    updatedAt: Date.now(),
  };
}

function syncAlphaMaskCanvas() {
  if (!maskCanvas.value) {
    alphaMaskCanvas.value = null;
    isAlphaMaskDirty = false;
    return;
  }

  if (!isAlphaMaskDirty && alphaMaskCanvas.value) return;
  alphaMaskCanvas.value = createAlphaMaskCanvas(maskCanvas.value);
  isAlphaMaskDirty = false;
}

function clearLiveCompositeCaches() {
  staticUnderlayCanvas.value = null;
  staticOverlayCanvas.value = null;
  selectedLayerImage.value = null;
  selectedLayerRenderCanvas.value = null;
  liveCompositeCacheToken += 1;
}

function scheduleLiveCompositeRender() {
  if (liveCompositeFrame !== null) return;

  liveCompositeFrame = requestAnimationFrame(() => {
    liveCompositeFrame = null;
    void renderLiveComposite();
  });
}

function updateLayoutMetrics() {
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect();
    containerSize.value = { width: rect.width, height: rect.height };
  }

  if (imageRef.value) {
    naturalSize.value = {
      width: imageRef.value.naturalWidth,
      height: imageRef.value.naturalHeight,
    };
  }

  panOffset.value = clampPan(panOffset.value);
}

async function loadMaskEditorState() {
  const layer = selectedMaskLayer.value;
  if (!layer) {
    maskCanvas.value = null;
    alphaMaskCanvas.value = null;
    currentMaskNodeId.value = null;
    currentMaskDataUrl.value = null;
    isAlphaMaskDirty = false;
    maskUndoStack.length = 0;
    hasDirtyMask.value = false;
    clearLiveCompositeCaches();
    emitMaskState();
    scheduleLiveCompositeRender();
    return;
  }

  const nextMaskDataUrl = layer.layerMask?.dataUrl ?? null;
  if (
    maskCanvas.value
    && currentMaskNodeId.value === layer.nodeId
    && currentMaskDataUrl.value === nextMaskDataUrl
  ) {
    emitMaskState();
    scheduleLiveCompositeRender();
    return;
  }

  maskCanvas.value = await createMaskCanvas(layer.layerMask ?? null, layer.width, layer.height);
  isAlphaMaskDirty = true;
  currentMaskNodeId.value = layer.nodeId;
  currentMaskDataUrl.value = nextMaskDataUrl;
  maskUndoStack.length = 0;
  hasDirtyMask.value = false;
  clearLiveCompositeCaches();
  emitMaskState();
  scheduleLiveCompositeRender();
}

async function rebuildLiveCompositeCaches() {
  const layer = selectedMaskLayer.value;
  const layers = props.liveLayers;
  const documentWidth = props.liveDocumentWidth;
  const documentHeight = props.liveDocumentHeight;
  const selectedIndex = selectedMaskLayerIndex.value;
  const box = renderBox.value;

  if (
    !shouldRenderLiveComposite.value
    || !layer
    || !layers
    || !documentWidth
    || !documentHeight
    || !box
    || selectedIndex < 0
  ) {
    clearLiveCompositeCaches();
    return;
  }

  const targetWidth = Math.max(1, Math.round(box.w));
  const targetHeight = Math.max(1, Math.round(box.h));
  const cacheToken = ++liveCompositeCacheToken;

  const underlayLayers = layers.slice(0, selectedIndex);
  const overlayLayers = layers.slice(selectedIndex + 1);
  const [underlayCanvas, overlayCanvas, layerImage] = await Promise.all([
    underlayLayers.length > 0
      ? renderLayerComposite(underlayLayers, documentWidth, documentHeight, {
          targetWidth,
          targetHeight,
        })
      : Promise.resolve(null),
    overlayLayers.length > 0
      ? renderLayerComposite(overlayLayers, documentWidth, documentHeight, {
          targetWidth,
          targetHeight,
        })
      : Promise.resolve(null),
    loadCachedImage(layer.sourceDataUrl),
  ]);

  if (cacheToken !== liveCompositeCacheToken) return;

  staticUnderlayCanvas.value = underlayCanvas;
  staticOverlayCanvas.value = overlayCanvas;
  selectedLayerImage.value = layerImage;
}

function clampPan(nextPan: { x: number; y: number }, nextZoom = zoom.value) {
  const box = renderBox.value;
  if (!box || nextZoom <= 1) {
    return { x: 0, y: 0 };
  }

  const minX = box.w - box.w * nextZoom;
  const minY = box.h - box.h * nextZoom;
  return {
    x: clamp(nextPan.x, minX, 0),
    y: clamp(nextPan.y, minY, 0),
  };
}

function getDefaultZoomAnchor() {
  const box = renderBox.value;
  if (!box) return null;
  return {
    x: box.x + box.w / 2,
    y: box.y + box.h / 2,
  };
}

function setZoom(nextZoom: number, anchor = getDefaultZoomAnchor()) {
  const box = renderBox.value;
  if (!box) return;

  const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
  if (Math.abs(clampedZoom - zoom.value) < 0.001) return;

  const resolvedAnchor = anchor || getDefaultZoomAnchor();
  if (!resolvedAnchor) return;

  const anchorInViewport = {
    x: resolvedAnchor.x - box.x,
    y: resolvedAnchor.y - box.y,
  };

  const contentX = (anchorInViewport.x - panOffset.value.x) / zoom.value;
  const contentY = (anchorInViewport.y - panOffset.value.y) / zoom.value;

  zoom.value = clampedZoom;
  panOffset.value = clampPan({
    x: anchorInViewport.x - contentX * clampedZoom,
    y: anchorInViewport.y - contentY * clampedZoom,
  }, clampedZoom);

  emitViewState();
}

function zoomIn() {
  setZoom(Number((zoom.value + ZOOM_STEP).toFixed(2)));
}

function zoomOut() {
  setZoom(Number((zoom.value - ZOOM_STEP).toFixed(2)));
}

function resetView() {
  zoom.value = 1;
  panOffset.value = { x: 0, y: 0 };
  emitViewState();
}

function drawMaskCursor(ctx: CanvasRenderingContext2D) {
  const pointer = maskPointerPreview.value;
  if (!pointer?.inside || !renderBox.value || !selectedMaskLayer.value) return;

  const docScale = renderBox.value.w / Math.max(1, naturalSize.value.width);
  const cursorRadius = props.maskBrushRadius * docScale;
  ctx.save();
  ctx.beginPath();
  ctx.arc(pointer.x, pointer.y, cursorRadius, 0, Math.PI * 2);
  ctx.strokeStyle = props.maskBrushMode === 'hide'
    ? 'rgba(255, 110, 110, 0.95)'
    : 'rgba(255, 255, 255, 0.92)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.restore();
}

async function renderLiveComposite() {
  const canvas = liveCompositeCanvasRef.value;
  const box = renderBox.value;
  const layer = selectedMaskLayer.value;
  if (!canvas || !box) return;

  const pixelWidth = Math.max(1, Math.round(box.w));
  const pixelHeight = Math.max(1, Math.round(box.h));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!shouldRenderLiveComposite.value || !layer || !props.liveLayers || !props.liveDocumentWidth || !props.liveDocumentHeight) {
    return;
  }

  const renderToken = ++liveCompositeRenderToken;

  if (!selectedLayerImage.value) {
    await rebuildLiveCompositeCaches();
    if (renderToken !== liveCompositeRenderToken) return;
  }

  syncAlphaMaskCanvas();

  const drawScaleX = canvas.width / props.liveDocumentWidth;
  const drawScaleY = canvas.height / props.liveDocumentHeight;
  const drawLeft = Math.round(layer.left * drawScaleX);
  const drawTop = Math.round(layer.top * drawScaleY);
  const drawWidth = Math.max(1, Math.round(layer.width * drawScaleX));
  const drawHeight = Math.max(1, Math.round(layer.height * drawScaleY));

  if (staticUnderlayCanvas.value) {
    ctx.drawImage(staticUnderlayCanvas.value, 0, 0, canvas.width, canvas.height);
  }

  if (selectedLayerImage.value && alphaMaskCanvas.value) {
    if (
      !selectedLayerRenderCanvas.value
      || selectedLayerRenderCanvas.value.width !== drawWidth
      || selectedLayerRenderCanvas.value.height !== drawHeight
    ) {
      selectedLayerRenderCanvas.value = document.createElement('canvas');
      selectedLayerRenderCanvas.value.width = drawWidth;
      selectedLayerRenderCanvas.value.height = drawHeight;
    }

    const selectedCtx = selectedLayerRenderCanvas.value.getContext('2d');
    if (selectedCtx) {
      selectedCtx.clearRect(0, 0, drawWidth, drawHeight);
      selectedCtx.drawImage(selectedLayerImage.value, 0, 0, drawWidth, drawHeight);
      selectedCtx.globalCompositeOperation = 'destination-in';
      selectedCtx.drawImage(alphaMaskCanvas.value, 0, 0, drawWidth, drawHeight);
      selectedCtx.globalCompositeOperation = 'source-over';
    }
  }

  if (props.maskViewEnabled && maskCanvas.value) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.94)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (staticUnderlayCanvas.value || staticOverlayCanvas.value || selectedLayerRenderCanvas.value) {
      ctx.save();
      ctx.globalAlpha = 0.18;
      if (staticUnderlayCanvas.value) {
        ctx.drawImage(staticUnderlayCanvas.value, 0, 0, canvas.width, canvas.height);
      }
      if (selectedLayerRenderCanvas.value) {
        ctx.drawImage(selectedLayerRenderCanvas.value, drawLeft, drawTop, drawWidth, drawHeight);
      }
      if (staticOverlayCanvas.value) {
        ctx.drawImage(staticOverlayCanvas.value, 0, 0, canvas.width, canvas.height);
      }
      ctx.restore();
    }

    ctx.drawImage(
      maskCanvas.value,
      drawLeft,
      drawTop,
      drawWidth,
      drawHeight,
    );
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.72)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      drawLeft + 0.5,
      drawTop + 0.5,
      drawWidth - 1,
      drawHeight - 1,
    );
  } else {
    if (selectedLayerRenderCanvas.value) {
      ctx.drawImage(selectedLayerRenderCanvas.value, drawLeft, drawTop, drawWidth, drawHeight);
    }
    if (staticOverlayCanvas.value) {
      ctx.drawImage(staticOverlayCanvas.value, 0, 0, canvas.width, canvas.height);
    }
  }

  drawMaskCursor(ctx);
}

function getLocalPoint(clientX: number, clientY: number) {
  const box = renderBox.value;
  const containerRect = containerRef.value?.getBoundingClientRect();
  if (!box || !containerRect) return null;

  const xInContainer = clientX - containerRect.left;
  const yInContainer = clientY - containerRect.top;

  return {
    x: clamp((xInContainer - box.x - panOffset.value.x) / zoom.value, 0, box.w),
    y: clamp((yInContainer - box.y - panOffset.value.y) / zoom.value, 0, box.h),
    xInContainer,
    yInContainer,
  };
}

function getDocumentPoint(clientX: number, clientY: number) {
  const localPoint = getLocalPoint(clientX, clientY);
  const box = renderBox.value;
  if (!localPoint || !box || naturalSize.value.width < 1 || naturalSize.value.height < 1) return null;

  return {
    localX: localPoint.x,
    localY: localPoint.y,
    docX: (localPoint.x / box.w) * naturalSize.value.width,
    docY: (localPoint.y / box.h) * naturalSize.value.height,
  };
}

function getMaskPoint(clientX: number, clientY: number) {
  const layer = selectedMaskLayer.value;
  const editableMask = maskCanvas.value;
  const point = getDocumentPoint(clientX, clientY);
  if (!layer || !editableMask || !point) {
    maskPointerPreview.value = null;
    return null;
  }

  const inside = (
    point.docX >= layer.left
    && point.docX <= layer.left + layer.width
    && point.docY >= layer.top
    && point.docY <= layer.top + layer.height
  );

  maskPointerPreview.value = {
    x: point.localX,
    y: point.localY,
    inside,
  };

  if (!inside) return null;

  return {
    x: ((point.docX - layer.left) / Math.max(1, layer.width)) * editableMask.width,
    y: ((point.docY - layer.top) / Math.max(1, layer.height)) * editableMask.height,
  };
}

function emitSelectionPx() {
  const box = renderBox.value;
  if (!imageRef.value || !box || boxMetrics.value.w < 1 || boxMetrics.value.h < 1) {
    emit('update:selectionPx', 0, 0);
    return;
  }

  const scaleX = imageRef.value.naturalWidth / box.w;
  const scaleY = imageRef.value.naturalHeight / box.h;
  emit('update:selectionPx', Math.round(boxMetrics.value.w * scaleX), Math.round(boxMetrics.value.h * scaleY));
}

function stampMaskBrush(x: number, y: number) {
  const editableMask = maskCanvas.value;
  if (!editableMask) return;

  const ctx = editableMask.getContext('2d');
  if (!ctx) return;

  const hardness = Math.min(0.99, Math.max(0, props.maskBrushHardness));
  const innerRadius = props.maskBrushRadius * hardness;
  const gradient = ctx.createRadialGradient(x, y, innerRadius, x, y, props.maskBrushRadius);

  if (props.maskBrushMode === 'hide') {
    gradient.addColorStop(0, 'rgb(0, 0, 0)');
    gradient.addColorStop(1, 'rgb(255, 255, 255)');
  } else {
    gradient.addColorStop(0, 'rgb(255, 255, 255)');
    gradient.addColorStop(1, 'rgb(0, 0, 0)');
  }

  ctx.save();
  ctx.globalCompositeOperation = props.maskBrushMode === 'hide' ? 'darken' : 'lighten';
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, props.maskBrushRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  isAlphaMaskDirty = true;
}

function paintMaskBetweenPoints(from: { x: number; y: number }, to: { x: number; y: number }) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const spacing = Math.max(1, props.maskBrushRadius * 0.35);
  const steps = Math.max(1, Math.ceil(distance / spacing));

  for (let step = 0; step <= steps; step += 1) {
    const t = steps === 0 ? 0 : step / steps;
    stampMaskBrush(
      from.x + ((to.x - from.x) * t),
      from.y + ((to.y - from.y) * t),
    );
  }
}

async function persistMask() {
  const layer = selectedMaskLayer.value;
  const editableMask = maskCanvas.value;
  if (!layer || !editableMask || !hasDirtyMask.value) return;

  const serializedMask = serializeMaskCanvas(editableMask);
  currentMaskNodeId.value = layer.nodeId;
  currentMaskDataUrl.value = serializedMask?.dataUrl ?? null;
  emit('mask-updated', {
    nodeId: layer.nodeId,
    mask: serializedMask,
  });
  hasDirtyMask.value = false;
  emitMaskState();
}

function startMaskPainting(e: MouseEvent) {
  const layerPoint = getMaskPoint(e.clientX, e.clientY);
  if (!layerPoint || !maskCanvas.value) {
    scheduleLiveCompositeRender();
    return;
  }

  pushMaskUndoSnapshot();
  isMaskPainting.value = true;
  lastMaskPoint = layerPoint;
  stampMaskBrush(layerPoint.x, layerPoint.y);
  hasDirtyMask.value = true;
  emitMaskState();
  scheduleLiveCompositeRender();
}

function startPan(e: MouseEvent) {
  if (!canPan.value) return;
  mode.value = 'pan';
  startPos.value = { x: e.clientX, y: e.clientY };
  initialPan.value = { ...panOffset.value };
}

function handleMouseDown(e: MouseEvent) {
  if (!renderBox.value) return;

  if (e.ctrlKey && canPan.value) {
    startPan(e);
    return;
  }

  if (props.maskEditEnabled && selectedMaskLayer.value) {
    startMaskPainting(e);
    return;
  }

  const point = getLocalPoint(e.clientX, e.clientY);
  if (!point) return;

  mode.value = 'draw';
  startPos.value = { x: point.x, y: point.y };
  currentPos.value = { x: point.x, y: point.y };
  boxMetrics.value = { x: point.x, y: point.y, w: 0, h: 0 };
}

function startDrag(e: MouseEvent) {
  if (e.ctrlKey && canPan.value) {
    startPan(e);
    return;
  }

  mode.value = 'drag';
  startPos.value = { x: e.clientX, y: e.clientY };
  initialBox.value = { ...boxMetrics.value };
}

function startResize(corner: string, e: MouseEvent) {
  if (e.ctrlKey && canPan.value) {
    startPan(e);
    return;
  }

  mode.value = `resize-${corner}` as typeof mode.value;
  startPos.value = { x: e.clientX, y: e.clientY };
  initialBox.value = { ...boxMetrics.value };
}

function handleMouseMove(e: MouseEvent) {
  if (mode.value === 'pan') {
    panOffset.value = clampPan({
      x: initialPan.value.x + (e.clientX - startPos.value.x),
      y: initialPan.value.y + (e.clientY - startPos.value.y),
    });
    scheduleLiveCompositeRender();
    return;
  }

  if (props.maskEditEnabled && selectedMaskLayer.value) {
    const layerPoint = getMaskPoint(e.clientX, e.clientY);
    if (isMaskPainting.value && layerPoint) {
      if (!lastMaskPoint) {
        lastMaskPoint = layerPoint;
      }

      paintMaskBetweenPoints(lastMaskPoint, layerPoint);
      lastMaskPoint = layerPoint;
      hasDirtyMask.value = true;
      emitMaskState();
    }

    scheduleLiveCompositeRender();
    if (isMaskPainting.value || layerPoint || maskPointerPreview.value) {
      return;
    }
  }

  const box = renderBox.value;
  if (mode.value === 'idle' || !box) return;

  if (mode.value === 'draw') {
    const point = getLocalPoint(e.clientX, e.clientY);
    if (!point) return;
    currentPos.value = { x: point.x, y: point.y };
    updateDrawBox();
    return;
  }

  if (mode.value === 'drag') {
    const dx = (e.clientX - startPos.value.x) / zoom.value;
    const dy = (e.clientY - startPos.value.y) / zoom.value;

    boxMetrics.value = {
      ...boxMetrics.value,
      x: clamp(initialBox.value.x + dx, 0, box.w - initialBox.value.w),
      y: clamp(initialBox.value.y + dy, 0, box.h - initialBox.value.h),
    };
    return;
  }

  if (mode.value.startsWith('resize-')) {
    handleResize(e, box);
  }
}

function handleMouseLeave() {
  if (props.maskEditEnabled) {
    maskPointerPreview.value = null;
    scheduleLiveCompositeRender();
  }
}

async function handleMouseUp() {
  if (isMaskPainting.value) {
    isMaskPainting.value = false;
    lastMaskPoint = null;
    await persistMask();
    scheduleLiveCompositeRender();
    return;
  }

  if (props.maskEditEnabled) {
    mode.value = 'idle';
    scheduleLiveCompositeRender();
    return;
  }

  if (mode.value === 'idle') return;

  if (mode.value === 'draw' && boxMetrics.value.w > 20) {
    if (props.targetRatio === 'auto') {
      const closest = findClosestRatio(boxMetrics.value.w, boxMetrics.value.h);
      emit('update:ratio', closest);
      snapBoxToRatio(ASPECT_RATIO_VALUES[closest]);
    }
  } else if (mode.value.startsWith('resize-')) {
    if (props.targetRatio === 'auto') {
      const closest = findClosestRatio(boxMetrics.value.w, boxMetrics.value.h);
      emit('update:ratio', closest);
      snapBoxToRatio(ASPECT_RATIO_VALUES[closest]);
    }
  }

  mode.value = 'idle';
}

function updateDrawBox() {
  let w = Math.abs(currentPos.value.x - startPos.value.x);
  let h = Math.abs(currentPos.value.y - startPos.value.y);

  if (w < 1 || h < 1) return;

  let targetR: number;
  if (props.targetRatio === 'auto') {
    const closest = findClosestRatio(w, h);
    targetR = ASPECT_RATIO_VALUES[closest];
    emit('update:ratio', closest);
  } else {
    targetR = parseRatio(props.targetRatio);
  }

  if (w / h > targetR) {
    w = h * targetR;
  } else {
    h = w / targetR;
  }

  const x = startPos.value.x < currentPos.value.x ? startPos.value.x : startPos.value.x - w;
  const y = startPos.value.y < currentPos.value.y ? startPos.value.y : startPos.value.y - h;

  boxMetrics.value = { x, y, w, h };
  emitSelectionPx();
}

function handleResize(e: MouseEvent, renderBoxValue: { w: number; h: number }) {
  const dx = (e.clientX - startPos.value.x) / zoom.value;
  const dy = (e.clientY - startPos.value.y) / zoom.value;
  let { x, y, w, h } = initialBox.value;

  if (mode.value === 'resize-se') {
    w += dx;
    h += dy;
  } else if (mode.value === 'resize-nw') {
    w -= dx;
    h -= dy;
    x += dx;
    y += dy;
  } else if (mode.value === 'resize-ne') {
    w += dx;
    h -= dy;
    y += dy;
  } else if (mode.value === 'resize-sw') {
    w -= dx;
    h += dy;
    x += dx;
  }

  const absW = Math.max(1, Math.abs(w));
  const absH = Math.max(1, Math.abs(h));

  let r: number;
  if (props.targetRatio === 'auto') {
    const closest = findClosestRatio(absW, absH);
    r = ASPECT_RATIO_VALUES[closest];
    emit('update:ratio', closest);
  } else {
    r = parseRatio(props.targetRatio);
  }

  if (w / h > r) w = h * r;
  else h = w / r;

  if (mode.value === 'resize-nw') {
    x = initialBox.value.x + (initialBox.value.w - w);
    y = initialBox.value.y + (initialBox.value.h - h);
  } else if (mode.value === 'resize-ne') {
    y = initialBox.value.y + (initialBox.value.h - h);
  } else if (mode.value === 'resize-sw') {
    x = initialBox.value.x + (initialBox.value.w - w);
  }

  if (w < 20) w = 20;
  if (h < 20) h = 20;

  if (x < 0) {
    w -= (0 - x);
    x = 0;
  }
  if (y < 0) {
    h -= (0 - y);
    y = 0;
  }
  if (x + w > renderBoxValue.w) w = renderBoxValue.w - x;
  if (y + h > renderBoxValue.h) h = renderBoxValue.h - y;

  boxMetrics.value = { x, y, w, h };
  emitSelectionPx();
}

function snapBoxToRatio(targetR: number) {
  let { x, y, w, h } = boxMetrics.value;
  if (w / h > targetR) {
    w = h * targetR;
  } else {
    h = w / targetR;
  }
  boxMetrics.value = { x, y, w, h };
  emitSelectionPx();
}

function handleWheel(e: WheelEvent) {
  if (!renderBox.value) return;

  const containerRect = containerRef.value?.getBoundingClientRect();
  if (!containerRect) return;

  const anchor = {
    x: e.clientX - containerRect.left,
    y: e.clientY - containerRect.top,
  };

  const nextZoom = e.deltaY < 0
    ? zoom.value + ZOOM_STEP
    : zoom.value - ZOOM_STEP;

  setZoom(Number(nextZoom.toFixed(2)), anchor);
}

function finalizeCrop(action: CropConfirmAction = 'replace-primary') {
  const box = renderBox.value;
  if (!imageRef.value || !box) return;
  if (boxMetrics.value.w < 20 || boxMetrics.value.h < 20) return;

  const natW = imageRef.value.naturalWidth;
  const natH = imageRef.value.naturalHeight;
  const scaleX = natW / box.w;
  const scaleY = natH / box.h;

  const realX = Math.round(boxMetrics.value.x * scaleX);
  const realY = Math.round(boxMetrics.value.y * scaleY);
  const realW = Math.round(boxMetrics.value.w * scaleX);
  const realH = Math.round(boxMetrics.value.h * scaleY);

  const canvas = document.createElement('canvas');
  canvas.width = realW;
  canvas.height = realH;
  const ctx = canvas.getContext('2d');

  ctx?.drawImage(imageRef.value, realX, realY, realW, realH, 0, 0, realW, realH);

  emit(
    'cropped',
    {
      base64: canvas.toDataURL('image/png'),
      originalWidth: natW,
      originalHeight: natH,
      x: realX,
      y: realY,
      w: realW,
      h: realH,
    },
    action,
  );

  cancelCrop();
}

function cancelCrop() {
  boxMetrics.value = { x: 0, y: 0, w: 0, h: 0 };
  mode.value = 'idle';
  emit('update:selectionPx', 0, 0);
}

function undoMaskStroke() {
  const previousMask = maskUndoStack.pop();
  const layer = selectedMaskLayer.value;
  if (!previousMask || !layer) return;

  maskCanvas.value = cloneCanvas(previousMask);
  isAlphaMaskDirty = true;
  hasDirtyMask.value = false;
  currentMaskNodeId.value = layer.nodeId;
  currentMaskDataUrl.value = serializeMaskCanvas(maskCanvas.value)?.dataUrl ?? null;
  emit('mask-updated', {
    nodeId: layer.nodeId,
    mask: serializeMaskCanvas(maskCanvas.value),
  });
  emitMaskState();
  scheduleLiveCompositeRender();
}

function resetMaskStroke() {
  const layer = selectedMaskLayer.value;
  if (!layer) return;

  if (maskCanvas.value) {
    pushMaskUndoSnapshot();
  }

  maskCanvas.value = document.createElement('canvas');
  maskCanvas.value.width = layer.width;
  maskCanvas.value.height = layer.height;
  const ctx = maskCanvas.value.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.fillRect(0, 0, maskCanvas.value.width, maskCanvas.value.height);
  }

  isAlphaMaskDirty = true;
  hasDirtyMask.value = false;
  currentMaskNodeId.value = layer.nodeId;
  currentMaskDataUrl.value = null;
  emit('mask-updated', {
    nodeId: layer.nodeId,
    mask: null,
  });
  emitMaskState();
  scheduleLiveCompositeRender();
}

function selectAll() {
  if (props.maskEditEnabled) return;
  const box = renderBox.value;
  if (!imageRef.value || !box) return;

  boxMetrics.value = { x: 0, y: 0, w: box.w, h: box.h };
  mode.value = 'idle';
  const closest = findClosestRatio(imageRef.value.naturalWidth, imageRef.value.naturalHeight);
  emit('update:ratio', closest);
  emit('update:selectionPx', imageRef.value.naturalWidth, imageRef.value.naturalHeight);
}

function handleImageLoad() {
  updateLayoutMetrics();
  emitViewState();
  scheduleLiveCompositeRender();
}

watch(() => props.targetRatio, (newR) => {
  if (newR !== 'auto' && boxMetrics.value.w > 0 && mode.value === 'idle') {
    snapBoxToRatio(parseRatio(newR));
  }
});

watch(() => props.imageSrc, () => {
  resetView();
  cancelCrop();
  maskPointerPreview.value = null;
  clearLiveCompositeCaches();
  scheduleLiveCompositeRender();
});

watch(
  () => [
    props.maskTargetNodeId,
    selectedMaskLayer.value?.layerMask?.updatedAt ?? 0,
    props.liveLayers?.length ?? 0,
  ],
  async () => {
    if (isMaskPainting.value) return;
    await loadMaskEditorState();
  },
  { immediate: true },
);

watch(
  () => [
    props.maskTargetNodeId,
    props.maskEditEnabled,
    props.liveDocumentWidth,
    props.liveDocumentHeight,
    props.liveLayers?.map(layer => `${layer.nodeId}:${layer.sourceDataUrl.length}:${layer.layerMask?.updatedAt ?? 0}`).join('|') ?? '',
    renderBox.value?.w ?? 0,
    renderBox.value?.h ?? 0,
  ],
  async () => {
    await rebuildLiveCompositeCaches();
    emitMaskState();
    scheduleLiveCompositeRender();
  },
  { immediate: true },
);

watch(
  () => [
    props.maskViewEnabled,
    props.maskBrushRadius,
    props.maskBrushHardness,
    props.maskBrushMode,
  ],
  () => {
    emitMaskState();
    scheduleLiveCompositeRender();
  },
  { immediate: true },
);

watch(
  () => [zoom.value, panOffset.value.x, panOffset.value.y],
  () => {
    emitViewState();
    scheduleLiveCompositeRender();
  },
  { immediate: true },
);

onMounted(() => {
  resizeObserver = new ResizeObserver(() => {
    updateLayoutMetrics();
    scheduleLiveCompositeRender();
  });
  if (containerRef.value) {
    resizeObserver.observe(containerRef.value);
  }
  updateLayoutMetrics();
  scheduleLiveCompositeRender();
  if (imageRef.value?.complete) {
    handleImageLoad();
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  if (liveCompositeFrame !== null) {
    cancelAnimationFrame(liveCompositeFrame);
  }
});

defineExpose({
  finalizeCrop,
  cancelCrop,
  selectAll,
  undoMaskStroke,
  resetMaskStroke,
  imageRef,
  zoomIn,
  zoomOut,
  resetView,
  zoomPercent,
  hasActiveSelection: computed(() => boxMetrics.value.w > 20 && boxMetrics.value.h > 20),
  canUndoMask: computed(() => maskUndoStack.length > 0),
});
</script>

<template>
  <div
    ref="containerRef"
    class="relative w-full h-full overflow-hidden touch-none select-none"
    @mousedown.prevent="handleMouseDown"
    @mousemove.prevent="handleMouseMove"
    @mouseup.prevent="handleMouseUp"
    @mouseleave.prevent="handleMouseLeave(); handleMouseUp()"
    @dblclick.prevent="selectAll"
    @wheel.prevent="handleWheel">

    <img
      ref="imageRef"
      :src="imageSrc"
      class="absolute w-px h-px opacity-0 pointer-events-none"
      draggable="false"
      @load="handleImageLoad" />

    <template v-if="renderBox">
      <div v-if="previewSrc" class="absolute inset-0 z-10 pointer-events-none overflow-hidden">
        <div class="absolute" :style="stageStyle">
          <img :src="previewSrc" class="w-full h-full object-fill shadow-2xl rounded" draggable="false" />
        </div>
      </div>

      <div class="absolute z-0" :style="stageStyle">
        <canvas
          v-if="shouldRenderLiveComposite"
          ref="liveCompositeCanvasRef"
          class="absolute inset-0 w-full h-full pointer-events-none shadow-2xl rounded">
        </canvas>
        <img
          v-else
          :src="imageSrc"
          class="w-full h-full object-fill pointer-events-none shadow-2xl rounded"
          draggable="false" />
        <img
          v-if="overlaySrc"
          :src="overlaySrc"
          class="absolute inset-0 w-full h-full object-fill pointer-events-none rounded"
          :style="{ opacity: overlayOpacity }"
          draggable="false" />

        <div
          v-if="!props.maskEditEnabled && boxMetrics.w > 0"
          class="absolute border-2 border-primary z-20 cursor-move"
          :style="{ left: boxMetrics.x + 'px', top: boxMetrics.y + 'px', width: boxMetrics.w + 'px', height: boxMetrics.h + 'px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)' }"
          @mousedown.stop="startDrag">

          <div v-if="mode === 'idle'" class="absolute -bottom-14 left-1/2 -translate-x-1/2 flex gap-2" style="isolation: isolate;">
            <template v-if="hasExplicitPrimaryReference">
              <div class="relative">
                <button
                  @mousedown.stop.prevent="finalizeCrop('replace-primary')"
                  class="bg-primary hover:bg-primaryHover text-[#000] p-2 rounded-full shadow-[0_4px_15px_rgba(250,204,21,0.4)] transition-colors pointer-events-auto"
                  title="Replace Ref 1 with this selection">
                  <Check :size="18" stroke-width="3" />
                </button>
                <span class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-300 text-[#000] flex items-center justify-center shadow pointer-events-none">
                  <Star :size="10" class="fill-current" />
                </span>
              </div>
              <button
                @mousedown.stop.prevent="finalizeCrop('add-secondary')"
                class="p-2 rounded-full shadow-[0_4px_15px_rgba(59,130,246,0.25)] transition-colors pointer-events-auto"
                :class="canAddSecondaryReference
                  ? 'bg-sky-400 hover:bg-sky-300 text-[#04111f]'
                  : 'bg-surface text-textMuted border border-border opacity-50 cursor-not-allowed'"
                :disabled="!canAddSecondaryReference"
                :title="canAddSecondaryReference
                  ? 'Keep Ref 1 and add this selection as an extra reference'
                  : 'Reference limit reached. Remove one before adding another'">
                <Plus :size="18" stroke-width="3" />
              </button>
            </template>
            <button
              v-else
              @mousedown.stop.prevent="finalizeCrop('replace-primary')"
              class="bg-primary hover:bg-primaryHover text-[#000] p-2 rounded-full shadow-[0_4px_15px_rgba(250,204,21,0.4)] transition-colors pointer-events-auto"
              title="Set this selection as Ref 1">
              <Check :size="18" stroke-width="3" />
            </button>
            <button @mousedown.stop.prevent="cancelCrop" class="bg-surface hover:bg-red-500 hover:text-white text-textMuted border border-border p-2 rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.5)] transition-colors pointer-events-auto" title="Cancel Selection">
              <XIcon :size="18" stroke-width="3" />
            </button>
          </div>

          <div class="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-black cursor-nwse-resize rounded-full pointer-events-auto" @mousedown.stop="startResize('nw', $event)"></div>
          <div class="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-black cursor-nesw-resize rounded-full pointer-events-auto" @mousedown.stop="startResize('ne', $event)"></div>
          <div class="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-black cursor-nesw-resize rounded-full pointer-events-auto" @mousedown.stop="startResize('sw', $event)"></div>
          <div class="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-black cursor-nwse-resize rounded-full pointer-events-auto" @mousedown.stop="startResize('se', $event)"></div>
        </div>
      </div>
    </template>
  </div>
</template>
