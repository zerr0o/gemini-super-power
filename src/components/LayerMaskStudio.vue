<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Brush, Eye, EyeOff, RotateCcw } from 'lucide-vue-next';
import { useAppStore } from '../stores/appStore';
import type { BranchLayerStack } from '../services/layerExport';
import { canvasToDataUrl, createAlphaMaskCanvas, createMaskCanvas, loadCachedImage } from '../services/layerRendering';

const props = defineProps<{
  stack: BranchLayerStack | null;
  activeNodeId: string | null;
}>();

const store = useAppStore();

const layerListRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const renderSurfaceRef = ref<HTMLDivElement | null>(null);
const selectedLayerNodeId = ref<string | null>(null);
const brushMode = ref<'hide' | 'reveal'>('hide');
const brushRadius = ref(56);
const brushHardness = ref(0.72);
const isMaskViewEnabled = ref(false);
const isPainting = ref(false);
const hasDirtyMask = ref(false);
const maskCanvas = ref<HTMLCanvasElement | null>(null);
const layerImage = ref<HTMLImageElement | null>(null);
const pointerPreview = ref<{ x: number; y: number; inside: boolean } | null>(null);
const containerSize = ref({ width: 0, height: 0 });
const loadError = ref('');

let resizeObserver: ResizeObserver | null = null;
let lastBrushPoint: { x: number; y: number } | null = null;
let renderFrame: number | null = null;
let cachedAlphaMask: HTMLCanvasElement | null = null;
let isAlphaMaskStale = true;

const selectedLayer = computed(() =>
  props.stack?.layers.find(layer => layer.nodeId === selectedLayerNodeId.value) || props.stack?.layers[props.stack.layers.length - 1] || null
);

const selectedLayerIndex = computed(() =>
  props.stack?.layers.findIndex(layer => layer.nodeId === selectedLayerNodeId.value) ?? -1
);

const selectedNode = computed(() =>
  store.nodes.find(node => node.id === selectedLayer.value?.nodeId) || null
);

const selectedLayerHasMask = computed(() => !!selectedNode.value?.layerMask?.dataUrl);

const canvasMetrics = computed(() => {
  const layer = selectedLayer.value;
  if (!layer || containerSize.value.width < 1 || containerSize.value.height < 1) {
    return null;
  }

  const scale = Math.min(
    containerSize.value.width / Math.max(1, layer.width),
    containerSize.value.height / Math.max(1, layer.height),
  );
  const drawWidth = Math.max(1, Math.round(layer.width * scale));
  const drawHeight = Math.max(1, Math.round(layer.height * scale));

  return {
    scale,
    drawWidth,
    drawHeight,
    offsetX: Math.round((containerSize.value.width - drawWidth) / 2),
    offsetY: Math.round((containerSize.value.height - drawHeight) / 2),
  };
});

function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || !!el.closest('input, textarea, select, [contenteditable="true"]');
}

function ensureSelectedLayer() {
  const stack = props.stack;
  if (!stack || stack.layers.length === 0) {
    selectedLayerNodeId.value = null;
    return;
  }

  if (selectedLayerNodeId.value && stack.layers.some(layer => layer.nodeId === selectedLayerNodeId.value)) {
    return;
  }

  selectedLayerNodeId.value = stack.layers.find(layer => layer.nodeId === props.activeNodeId)?.nodeId || stack.layers[stack.layers.length - 1].nodeId;
}

function updateContainerSize() {
  if (!renderSurfaceRef.value) return;
  const rect = renderSurfaceRef.value.getBoundingClientRect();
  containerSize.value = {
    width: Math.max(1, Math.round(rect.width)),
    height: Math.max(1, Math.round(rect.height)),
  };
}

function scheduleRender() {
  if (renderFrame !== null) return;

  renderFrame = requestAnimationFrame(async () => {
    renderFrame = null;
    await renderEditor();
  });
}

async function loadSelectedLayerAssets() {
  const layer = selectedLayer.value;
  if (!layer) {
    maskCanvas.value = null;
    layerImage.value = null;
    loadError.value = '';
    scheduleRender();
    return;
  }

  loadError.value = '';

  try {
    layerImage.value = await loadCachedImage(layer.sourceDataUrl || layer.finalResultDataUrl);
    const nodeMask = selectedNode.value?.layerMask ?? layer.layerMask ?? null;
    maskCanvas.value = await createMaskCanvas(nodeMask, layer.width, layer.height);
    isAlphaMaskStale = true;
    cachedAlphaMask = null;
    hasDirtyMask.value = false;
  } catch (error) {
    layerImage.value = null;
    maskCanvas.value = null;
    loadError.value = error instanceof Error ? error.message : 'Unable to load this layer preview.';
  }

  scheduleRender();
}

function drawCheckerboard(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  const tile = 18;
  ctx.save();
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';

  for (let row = 0; row < Math.ceil(height / tile); row += 1) {
    for (let col = 0; col < Math.ceil(width / tile); col += 1) {
      if ((row + col) % 2 === 0) {
        ctx.fillRect(x + (col * tile), y + (row * tile), tile, tile);
      }
    }
  }

  ctx.restore();
}

function drawCursor(ctx: CanvasRenderingContext2D, metrics: NonNullable<typeof canvasMetrics.value>) {
  if (!pointerPreview.value?.inside || !selectedLayer.value || !maskCanvas.value) return;

  const radiusScale = selectedLayer.value.width / Math.max(1, maskCanvas.value.width);
  const cursorRadius = brushRadius.value * radiusScale * metrics.scale;
  ctx.save();
  ctx.beginPath();
  ctx.arc(pointerPreview.value.x, pointerPreview.value.y, cursorRadius, 0, Math.PI * 2);
  ctx.strokeStyle = brushMode.value === 'hide' ? 'rgba(255, 110, 110, 0.95)' : 'rgba(255, 255, 255, 0.92)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.restore();
}

async function renderEditor() {
  const canvas = canvasRef.value;
  const layer = selectedLayer.value;
  const metrics = canvasMetrics.value;
  if (!canvas || !layer || !metrics || !maskCanvas.value || !layerImage.value) return;

  if (canvas.width !== containerSize.value.width || canvas.height !== containerSize.value.height) {
    canvas.width = containerSize.value.width;
    canvas.height = containerSize.value.height;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawCheckerboard(ctx, metrics.offsetX, metrics.offsetY, metrics.drawWidth, metrics.drawHeight);

  if (isMaskViewEnabled.value) {
    ctx.drawImage(maskCanvas.value, metrics.offsetX, metrics.offsetY, metrics.drawWidth, metrics.drawHeight);
  } else {
    if (isAlphaMaskStale || !cachedAlphaMask) {
      cachedAlphaMask = createAlphaMaskCanvas(maskCanvas.value);
      isAlphaMaskStale = false;
    }
    ctx.drawImage(layerImage.value, metrics.offsetX, metrics.offsetY, metrics.drawWidth, metrics.drawHeight);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(cachedAlphaMask, metrics.offsetX, metrics.offsetY, metrics.drawWidth, metrics.drawHeight);
    ctx.globalCompositeOperation = 'source-over';
  }

  ctx.strokeStyle = selectedLayerHasMask.value ? 'rgba(250, 204, 21, 0.72)' : 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(metrics.offsetX + 0.5, metrics.offsetY + 0.5, metrics.drawWidth - 1, metrics.drawHeight - 1);

  drawCursor(ctx, metrics);
}

function getLayerPoint(event: PointerEvent) {
  const canvas = canvasRef.value;
  const layer = selectedLayer.value;
  const metrics = canvasMetrics.value;
  const editableMask = maskCanvas.value;
  if (!canvas || !layer || !metrics || !editableMask) return null;

  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const inside = (
    x >= metrics.offsetX
    && x <= metrics.offsetX + metrics.drawWidth
    && y >= metrics.offsetY
    && y <= metrics.offsetY + metrics.drawHeight
  );

  pointerPreview.value = { x, y, inside };

  if (!inside) return null;

  return {
    x: ((x - metrics.offsetX) / metrics.drawWidth) * editableMask.width,
    y: ((y - metrics.offsetY) / metrics.drawHeight) * editableMask.height,
  };
}

function stampBrush(x: number, y: number) {
  const editableMask = maskCanvas.value;
  if (!editableMask) return;

  const ctx = editableMask.getContext('2d');
  if (!ctx) return;

  const hardness = Math.min(0.99, Math.max(0, brushHardness.value));
  const innerRadius = brushRadius.value * hardness;
  const gradient = ctx.createRadialGradient(x, y, innerRadius, x, y, brushRadius.value);

  if (brushMode.value === 'hide') {
    gradient.addColorStop(0, 'rgb(0, 0, 0)');
    gradient.addColorStop(1, 'rgb(255, 255, 255)');
  } else {
    gradient.addColorStop(0, 'rgb(255, 255, 255)');
    gradient.addColorStop(1, 'rgb(0, 0, 0)');
  }

  ctx.save();
  ctx.globalCompositeOperation = brushMode.value === 'hide' ? 'darken' : 'lighten';
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, brushRadius.value, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  isAlphaMaskStale = true;
}

function paintBetweenPoints(from: { x: number; y: number }, to: { x: number; y: number }) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const spacing = Math.max(1, brushRadius.value * 0.35);
  const steps = Math.max(1, Math.ceil(distance / spacing));

  for (let step = 0; step <= steps; step += 1) {
    const t = steps === 0 ? 0 : step / steps;
    stampBrush(
      from.x + ((to.x - from.x) * t),
      from.y + ((to.y - from.y) * t),
    );
  }
}

async function persistMask() {
  const layer = selectedLayer.value;
  const editableMask = maskCanvas.value;
  if (!layer || !editableMask || !hasDirtyMask.value) return;

  const dataUrl = await canvasToDataUrl(editableMask);
  store.setNodeLayerMask(layer.nodeId, {
    dataUrl,
    width: editableMask.width,
    height: editableMask.height,
    updatedAt: Date.now(),
  });
  hasDirtyMask.value = false;
}

function handlePointerDown(event: PointerEvent) {
  const layerPoint = getLayerPoint(event);
  if (!layerPoint) return;

  isPainting.value = true;
  lastBrushPoint = layerPoint;
  stampBrush(layerPoint.x, layerPoint.y);
  hasDirtyMask.value = true;
  canvasRef.value?.setPointerCapture?.(event.pointerId);
  scheduleRender();
}

function handlePointerMove(event: PointerEvent) {
  const layerPoint = getLayerPoint(event);
  if (!isPainting.value || !layerPoint) {
    scheduleRender();
    return;
  }

  if (!lastBrushPoint) {
    lastBrushPoint = layerPoint;
  }

  paintBetweenPoints(lastBrushPoint, layerPoint);
  lastBrushPoint = layerPoint;
  hasDirtyMask.value = true;
  scheduleRender();
}

async function handlePointerUp(event?: PointerEvent) {
  if (event) {
    pointerPreview.value = pointerPreview.value
      ? { ...pointerPreview.value, inside: false }
      : null;
  }

  if (!isPainting.value) {
    scheduleRender();
    return;
  }

  isPainting.value = false;
  lastBrushPoint = null;
  scheduleRender();
  await persistMask();
}

function handlePointerLeave() {
  pointerPreview.value = null;
  scheduleRender();
}

async function resetMask() {
  const layer = selectedLayer.value;
  if (!layer) return;

  maskCanvas.value = await createMaskCanvas(null, layer.width, layer.height);
  store.setNodeLayerMask(layer.nodeId, null);
  hasDirtyMask.value = false;
  scheduleRender();
}

watch(
  () => props.stack,
  () => {
    ensureSelectedLayer();
  },
  { immediate: true },
);

watch(
  () => [
    selectedLayerNodeId.value,
    props.stack?.activeNodeId ?? null,
    props.stack?.layers.map(layer => `${layer.nodeId}:${layer.sourceDataUrl.length}:${layer.layerMask?.updatedAt ?? 0}`).join('|') ?? '',
  ],
  async () => {
    await loadSelectedLayerAssets();
  },
  { immediate: true },
);

watch(
  () => [brushRadius.value, brushHardness.value, isMaskViewEnabled.value],
  () => scheduleRender(),
);

watch(
  () => selectedNode.value?.layerMask?.updatedAt ?? 0,
  async () => {
    if (isPainting.value) return;
    await loadSelectedLayerAssets();
  },
);

function handleWindowKeyDown(e: KeyboardEvent) {
  const key = e.key.toLowerCase();
  if (
    key !== 'x'
    || e.ctrlKey
    || e.metaKey
    || e.altKey
    || e.repeat
    || isTypingTarget(e.target)
  ) {
    return;
  }

  e.preventDefault();
  brushMode.value = brushMode.value === 'hide' ? 'reveal' : 'hide';
}

onMounted(() => {
  resizeObserver = new ResizeObserver(() => {
    updateContainerSize();
    scheduleRender();
  });

  if (renderSurfaceRef.value) {
    resizeObserver.observe(renderSurfaceRef.value);
  }

  updateContainerSize();
  scheduleRender();
  window.addEventListener('keydown', handleWindowKeyDown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleWindowKeyDown);
  resizeObserver?.disconnect();
  if (renderFrame !== null) {
    cancelAnimationFrame(renderFrame);
  }
});
</script>

<template>
  <section class="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4">
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-2">
        <Brush :size="16" class="text-primary" />
        <h3 class="font-semibold">Layer Mask Studio</h3>
      </div>
      <div v-if="selectedLayer" class="text-xs text-textMuted">
        {{ selectedLayer.width }} x {{ selectedLayer.height }}
      </div>
    </div>

    <template v-if="stack && stack.layers.length > 0">
      <div class="grid grid-cols-1 xl:grid-cols-[220px_1fr] gap-4 min-h-[560px]">
        <div ref="layerListRef" class="rounded-2xl border border-border bg-background/40 p-3 flex flex-col gap-2 overflow-y-auto">
          <button
            v-for="(layer, index) in stack.layers"
            :key="layer.nodeId"
            class="rounded-xl border text-left p-2 transition-colors flex items-center gap-3"
            :class="selectedLayerNodeId === layer.nodeId
              ? 'border-primary bg-primary/10'
              : 'border-border bg-surfaceHover/40 hover:border-primary/50'"
            @click="selectedLayerNodeId = layer.nodeId">
            <div class="relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-border bg-black">
              <img :src="layer.sourceDataUrl" class="w-full h-full object-contain" draggable="false" />
              <span
                v-if="store.nodes.find(node => node.id === layer.nodeId)?.layerMask"
                class="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_10px_rgba(250,204,21,0.5)]">
              </span>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-[10px] uppercase tracking-[0.18em] text-textMuted">
                {{ layer.kind }}
              </p>
              <p class="mt-1 text-sm text-textMain line-clamp-2">
                {{ layer.prompt || (index === 0 ? 'Base Image' : 'Untitled layer') }}
              </p>
            </div>
          </button>
        </div>

        <div class="rounded-2xl border border-border bg-background/40 p-4 flex flex-col gap-4 min-h-0">
          <div class="flex flex-wrap items-center gap-3">
            <div class="inline-flex rounded-xl border border-border overflow-hidden">
              <button
                class="px-3 py-1.5 text-xs transition-colors"
                :class="brushMode === 'hide' ? 'bg-primary text-[#000] font-semibold' : 'bg-background text-textMuted hover:text-primary'"
                @click="brushMode = 'hide'">
                Hide Black
              </button>
              <button
                class="px-3 py-1.5 text-xs transition-colors"
                :class="brushMode === 'reveal' ? 'bg-primary text-[#000] font-semibold' : 'bg-background text-textMuted hover:text-primary'"
                @click="brushMode = 'reveal'">
                Reveal White
              </button>
            </div>

            <button
              class="px-3 py-1.5 rounded-xl border text-xs transition-colors flex items-center gap-2"
              :class="isMaskViewEnabled ? 'border-primary text-primary bg-primary/10' : 'border-border text-textMuted hover:text-primary hover:border-primary/50'"
              @click="isMaskViewEnabled = !isMaskViewEnabled">
              <Eye v-if="isMaskViewEnabled" :size="13" />
              <EyeOff v-else :size="13" />
              {{ isMaskViewEnabled ? 'Mask View' : 'Layer View' }}
            </button>

            <button
              class="px-3 py-1.5 rounded-xl border border-border text-xs text-textMuted hover:text-primary hover:border-primary/50 transition-colors flex items-center gap-2"
              @click="resetMask">
              <RotateCcw :size="13" />
              Reset Mask
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="rounded-xl border border-border bg-background/50 p-3">
              <div class="flex items-center justify-between text-[11px] text-textMuted">
                <span>Brush Radius</span>
                <span>{{ brushRadius }} px</span>
              </div>
              <input v-model.number="brushRadius" type="range" min="4" max="256" step="1" class="w-full mt-2 accent-yellow-400" />
            </div>
            <div class="rounded-xl border border-border bg-background/50 p-3">
              <div class="flex items-center justify-between text-[11px] text-textMuted">
                <span>Brush Hardness</span>
                <span>{{ Math.round(brushHardness * 100) }}%</span>
              </div>
              <input v-model.number="brushHardness" type="range" min="0" max="1" step="0.01" class="w-full mt-2 accent-yellow-400" />
            </div>
          </div>

          <div class="flex items-center justify-between text-xs text-textMuted">
            <span>
              {{ selectedLayerIndex >= 0 ? `Layer ${selectedLayerIndex + 1} / ${stack.layers.length}` : 'No layer selected' }}
            </span>
            <span>
              {{ selectedLayerHasMask ? 'Mask saved' : 'No saved mask yet' }}
            </span>
          </div>

          <div ref="renderSurfaceRef" class="flex-1 min-h-[360px] rounded-2xl border border-border bg-[#121212] overflow-hidden relative mask-editor-surface">
            <canvas
              v-if="!loadError"
              ref="canvasRef"
              class="w-full h-full touch-none select-none"
              @pointerdown.prevent="handlePointerDown"
              @pointermove.prevent="handlePointerMove"
              @pointerup.prevent="handlePointerUp"
              @pointercancel.prevent="handlePointerUp"
              @pointerleave="handlePointerLeave" />
            <div
              v-else
              class="absolute inset-0 flex items-center justify-center text-center px-6 text-sm text-red-200 bg-red-500/10">
              {{ loadError }}
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="rounded-xl border border-dashed border-border bg-background/40 p-6 text-sm text-textMuted">
      Select a node with a branch to start editing layer masks.
    </div>
  </section>
</template>

<style scoped>
.mask-editor-surface {
  background-image:
    linear-gradient(45deg, rgba(255, 255, 255, 0.04) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(255, 255, 255, 0.04) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.04) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.04) 75%);
  background-size: 24px 24px;
  background-position: 0 0, 0 12px, 12px -12px, -12px 0;
}
</style>
