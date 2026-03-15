<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { Check, Plus, Star, X as XIcon } from 'lucide-vue-next';

import { ASPECT_RATIO_VALUES } from '../services/geminiService';
import type { AspectRatio } from '../services/geminiService';

const props = withDefaults(defineProps<{
  imageSrc: string;
  targetRatio: 'auto' | AspectRatio;
  availableRatios: readonly AspectRatio[];
  previewSrc?: string | null;
  overlaySrc?: string | null;
  overlayOpacity?: number;
  hasExplicitPrimaryReference?: boolean;
  canAddSecondaryReference?: boolean;
}>(), {
  previewSrc: null,
  overlaySrc: null,
  overlayOpacity: 0.5,
  hasExplicitPrimaryReference: false,
  canAddSecondaryReference: true,
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

const emit = defineEmits<{
  (e: 'cropped', data: CropData, action: CropConfirmAction): void;
  (e: 'update:ratio', ratio: AspectRatio): void;
  (e: 'update:selectionPx', w: number, h: number): void;
  (e: 'update:view', state: CanvasViewState): void;
}>();

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.1;

const containerRef = ref<HTMLDivElement | null>(null);
const imageRef = ref<HTMLImageElement | null>(null);

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

let resizeObserver: ResizeObserver | null = null;

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
  const box = renderBox.value;
  if (mode.value === 'idle' || !box) return;

  if (mode.value === 'pan') {
    panOffset.value = clampPan({
      x: initialPan.value.x + (e.clientX - startPos.value.x),
      y: initialPan.value.y + (e.clientY - startPos.value.y),
    });
    return;
  }

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

function handleMouseUp() {
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

function selectAll() {
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
}

watch(() => props.targetRatio, (newR) => {
  if (newR !== 'auto' && boxMetrics.value.w > 0 && mode.value === 'idle') {
    snapBoxToRatio(parseRatio(newR));
  }
});

watch(() => props.imageSrc, () => {
  resetView();
  cancelCrop();
});

watch(
  () => [zoom.value, panOffset.value.x, panOffset.value.y],
  () => emitViewState(),
  { immediate: true },
);

onMounted(() => {
  resizeObserver = new ResizeObserver(() => updateLayoutMetrics());
  if (containerRef.value) {
    resizeObserver.observe(containerRef.value);
  }
  updateLayoutMetrics();
  if (imageRef.value?.complete) {
    handleImageLoad();
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});

defineExpose({
  finalizeCrop,
  selectAll,
  imageRef,
  zoomIn,
  zoomOut,
  resetView,
  zoomPercent,
  hasActiveSelection: computed(() => boxMetrics.value.w > 20 && boxMetrics.value.h > 20),
});
</script>

<template>
  <div
    ref="containerRef"
    class="relative w-full h-full overflow-hidden touch-none select-none"
    @mousedown.prevent="handleMouseDown"
    @mousemove.prevent="handleMouseMove"
    @mouseup.prevent="handleMouseUp"
    @mouseleave.prevent="handleMouseUp"
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
        <img :src="imageSrc" class="w-full h-full object-fill pointer-events-none shadow-2xl rounded" draggable="false" />
        <img
          v-if="overlaySrc"
          :src="overlaySrc"
          class="absolute inset-0 w-full h-full object-fill pointer-events-none rounded"
          :style="{ opacity: overlayOpacity }"
          draggable="false" />

        <div
          v-if="boxMetrics.w > 0"
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
