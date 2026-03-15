<script setup lang="ts">
import { ref, nextTick, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { Type, Search, Loader2, Info, X, Upload, Image as ImageIcon, Star } from 'lucide-vue-next';
import CanvasSelection, { CropData } from '../components/CanvasSelection.vue';
import { useAppStore } from '../stores/appStore';
import type { ReferenceImageAsset } from '../stores/appStore';
import { generateImage, ASPECT_RATIO_VALUES, getSupportedAspectRatios, getSupportedResolutions } from '../services/geminiService';
import type { GenerationParams, AspectRatio, Resolution, GenerationModel, ThinkingLevel } from '../services/geminiService';

const props = withDefaults(defineProps<{
  isActive?: boolean;
  isShortcutSuspended?: boolean;
}>(), {
  isActive: false,
  isShortcutSuspended: false,
});

const store = useAppStore();

const prompt = ref('');
const model = ref<GenerationModel>('gemini-3.1-flash-image-preview');
const isAutoRatio = ref(true);
const aspectRatio = ref<AspectRatio>('16:9');
const resolution = ref<Resolution>('2K');
const isAutoResolution = ref(true);
const isGenerating = ref(false);
const errorMsg = ref('');
const useSearchGrounding = ref(false);
const thinkingLevel = ref<ThinkingLevel>('Minimal');

const ALL_RESOLUTION_STEPS: { label: string; value: Resolution; px: number; flashOnly?: boolean }[] = [
  { label: '512', value: '512', px: 512, flashOnly: true },
  { label: '1K', value: '1K', px: 1024 },
  { label: '2K', value: '2K', px: 2048 },
  { label: '4K', value: '4K', px: 4096 },
];

const supportedAspectRatios = computed(() => getSupportedAspectRatios(model.value));
const supportedResolutions = computed(() => getSupportedResolutions(model.value));
const activeImageNode = computed(() => store.nodes.find(n => n.id === store.activeNodeId) || null);
const primaryReference = computed(() => store.referenceImages[0] || null);
const secondaryReferences = computed(() => store.referenceImages.slice(1));
const implicitPrimaryReference = computed<ReferenceImageAsset | null>(() => {
  const activeNode = activeImageNode.value;
  if (!activeNode?.blobBase64) return null;

  return createReferenceAsset(activeNode.blobBase64, 'implicit-node', {
    sourceUri: activeNode.sourceUri ?? null,
    sourceNodeId: activeNode.id,
  });
});
const displayedPrimaryReference = computed(() => primaryReference.value || implicitPrimaryReference.value);
const isPrimaryReferenceImplicit = computed(() => !primaryReference.value && !!implicitPrimaryReference.value);
const hasSelectionZone = computed(() => selectionNaturalW.value > 0 && selectionNaturalH.value > 0);
const isPrimaryReferenceFullImageFallback = computed(() =>
  isPrimaryReferenceImplicit.value && !hasSelectionZone.value
);
const activeParentImageNode = computed(() => {
  const current = activeImageNode.value;
  if (!current?.parentId) return null;
  return store.nodes.find(n => n.id === current.parentId) || null;
});

function normalizeAspectRatioForModel(value: AspectRatio, currentModel: GenerationModel): AspectRatio {
  const supported = getSupportedAspectRatios(currentModel);
  if (supported.includes(value)) return value;

  let closest = supported[0];
  let minDiff = Infinity;
  for (const candidate of supported) {
    const diff = Math.abs(ASPECT_RATIO_VALUES[candidate] - ASPECT_RATIO_VALUES[value]);
    if (diff < minDiff) {
      minDiff = diff;
      closest = candidate;
    }
  }
  return closest;
}

function normalizeResolutionForModel(value: Resolution, currentModel: GenerationModel): Resolution {
  const supported = getSupportedResolutions(currentModel);
  if (supported.includes(value)) return value;

  const currentStep = ALL_RESOLUTION_STEPS.find(step => step.value === value);
  if (currentStep) {
    const nextSupported = ALL_RESOLUTION_STEPS.find(step => supported.includes(step.value) && step.px >= currentStep.px);
    if (nextSupported) return nextSupported.value;
  }

  return supported[supported.length - 1];
}

function autoResolutionFromPx(longestSidePx: number, currentModel: GenerationModel): Resolution {
  const supported = getSupportedResolutions(currentModel);
  for (const step of ALL_RESOLUTION_STEPS) {
    if (!supported.includes(step.value)) continue;
    if (longestSidePx <= step.px) return step.value;
  }
  return supported[supported.length - 1];
}

const RESOLUTION_STEPS = computed(() =>
  ALL_RESOLUTION_STEPS.filter(step => supportedResolutions.value.includes(step.value))
);

const selectionNaturalW = ref(0);
const selectionNaturalH = ref(0);
const isHoldingParentPreviewKey = ref(false);
const isShowingParentPreview = ref(false);
const suppressParentPreviewUntilKeyup = ref(false);
const activeCropData = ref<CropData | null>(null);
const canvasView = ref({ zoom: 1, zoomPercent: 100, canPan: false });

const canvasRef = ref<any>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const refFileInput = ref<HTMLInputElement | null>(null);
const THUMBNAIL_MAX_SIDE = 256;

function handleSelectionPx(w: number, h: number) {
  selectionNaturalW.value = w;
  selectionNaturalH.value = h;
}

function handleCanvasView(state: { zoom: number; zoomPercent: number; canPan: boolean }) {
  canvasView.value = state;
}

function zoomInCanvas() {
  canvasRef.value?.zoomIn?.();
}

function zoomOutCanvas() {
  canvasRef.value?.zoomOut?.();
}

function resetCanvasView() {
  canvasRef.value?.resetView?.();
}

function createReferenceId() {
  return `ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createReferenceAsset(
  dataUrl: string,
  kind: ReferenceImageAsset['kind'],
  options: {
    sourceUri?: string | null;
    sourceNodeId?: string | null;
  } = {},
): ReferenceImageAsset {
  return {
    id: createReferenceId(),
    dataUrl,
    sourceUri: options.sourceUri ?? null,
    sourceNodeId: options.sourceNodeId ?? null,
    kind,
  };
}

function cloneReferenceAsset(reference: ReferenceImageAsset): ReferenceImageAsset {
  return { ...reference };
}

function getFileSourceUri(file: File | null | undefined): string | null {
  const rawPath = (file as (File & { path?: string }) | null | undefined)?.path;
  if (!rawPath) return null;

  const normalizedPath = rawPath.replace(/\\/g, '/').replace(/^\/+/, '');
  return encodeURI(`file:///${normalizedPath}`);
}

function buildModificationBox(crop: CropData | null) {
  if (!crop) return null;

  return {
    x: crop.x,
    y: crop.y,
    w: crop.w,
    h: crop.h,
    originalWidth: crop.originalWidth,
    originalHeight: crop.originalHeight,
  };
}

async function createThumbnailDataUrl(sourceDataUrl: string, maxSide = THUMBNAIL_MAX_SIDE): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      const longestSide = Math.max(img.naturalWidth, img.naturalHeight);
      if (!Number.isFinite(longestSide) || longestSide <= 0 || longestSide <= maxSide) {
        resolve(sourceDataUrl);
        return;
      }

      const scale = maxSide / longestSide;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(sourceDataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => resolve(sourceDataUrl);
    img.src = sourceDataUrl;
  });
}

const displayedResolution = computed<Resolution>(() => {
  if (!isAutoResolution.value) return normalizeResolutionForModel(resolution.value, model.value);
  const longestSide = Math.max(selectionNaturalW.value, selectionNaturalH.value);
  if (longestSide < 1) return normalizeResolutionForModel(resolution.value, model.value);
  return autoResolutionFromPx(longestSide, model.value);
});

watch(model, (nextModel) => {
  aspectRatio.value = normalizeAspectRatioForModel(aspectRatio.value, nextModel);
  resolution.value = normalizeResolutionForModel(resolution.value, nextModel);
});

function resetTransientSelectionState() {
  activeCropData.value = null;
  selectionNaturalW.value = 0;
  selectionNaturalH.value = 0;
}

function resetParentPreviewState() {
  isHoldingParentPreviewKey.value = false;
  isShowingParentPreview.value = false;
  suppressParentPreviewUntilKeyup.value = false;
}

function handleCrop(data: CropData) {
  const sourceNode = activeImageNode.value;
  store.prependReferenceImage(createReferenceAsset(data.base64, 'crop', {
    sourceUri: sourceNode?.sourceUri ?? null,
    sourceNodeId: sourceNode?.id ?? null,
  }));
  activeCropData.value = data;
}

async function compositeImage(baseImg64: string, overlayImg64: string, crop: CropData): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = crop.originalWidth;
    canvas.height = crop.originalHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) return reject(new Error('Canvas ctx null'));

    const baseImg = new Image();
    baseImg.onload = () => {
      ctx.drawImage(baseImg, 0, 0);
      const overlayImg = new Image();
      overlayImg.onload = () => {
        ctx.drawImage(overlayImg, crop.x, crop.y, crop.w, crop.h);
        resolve(canvas.toDataURL('image/png'));
      };
      overlayImg.onerror = reject;
      overlayImg.src = overlayImg64;
    };
    baseImg.onerror = reject;
    baseImg.src = baseImg64;
  });
}

async function onGenerate() {
  if (!prompt.value) return;

  if (canvasRef.value?.hasActiveSelection) {
    canvasRef.value.finalizeCrop();
    await nextTick();
  }

  isGenerating.value = true;
  errorMsg.value = '';

  try {
    const activeNode = activeImageNode.value;
    const generationReferences: ReferenceImageAsset[] = store.referenceImages.length === 0 && activeNode?.blobBase64
      ? [createReferenceAsset(activeNode.blobBase64, 'implicit-node', {
          sourceUri: activeNode.sourceUri ?? null,
          sourceNodeId: activeNode.id,
        })]
      : store.referenceImages.map(reference => cloneReferenceAsset(reference));

    const safeAspectRatio = normalizeAspectRatioForModel(aspectRatio.value, model.value);
    let effectiveResolution = normalizeResolutionForModel(resolution.value, model.value);

    if (safeAspectRatio !== aspectRatio.value) {
      aspectRatio.value = safeAspectRatio;
    }

    if (effectiveResolution !== resolution.value) {
      resolution.value = effectiveResolution;
    }

    if (isAutoResolution.value && activeNode?.blobBase64) {
      if (activeCropData.value) {
        const longestSide = Math.max(activeCropData.value.w, activeCropData.value.h);
        effectiveResolution = autoResolutionFromPx(longestSide, model.value);
      } else {
        const img = canvasRef.value?.imageRef ?? null;
        if (img) {
          const longestSide = Math.max((img as HTMLImageElement).naturalWidth, (img as HTMLImageElement).naturalHeight);
          effectiveResolution = autoResolutionFromPx(longestSide, model.value);
        }
      }
    }

    const params: GenerationParams = {
      apiKey: store.apiKey,
      prompt: prompt.value,
      model: model.value,
      aspectRatio: safeAspectRatio,
      resolution: effectiveResolution,
      referenceImages: generationReferences.map(reference => reference.dataUrl),
      useSearchGrounding: useSearchGrounding.value,
      thinkingLevel: model.value === 'gemini-3.1-flash-image-preview' ? thinkingLevel.value : undefined,
    };

    const generationWorkspaceId = store.activeWorkspaceId;
    const generationParentId = store.activeNodeId;
    const generationCropData = activeCropData.value;
    const generationBaseNodeBlob = activeImageNode.value?.blobBase64;

    const resultBase64 = await generateImage(params);

    let finalBase64 = resultBase64;

    if (generationCropData && generationBaseNodeBlob) {
      finalBase64 = await compositeImage(generationBaseNodeBlob, resultBase64, generationCropData);
      if (store.activeWorkspaceId === generationWorkspaceId) {
        activeCropData.value = null;
      }
    }

    const finalResultThumbnailBase64 = await createThumbnailDataUrl(finalBase64);

    store.addNode({
      id: Date.now().toString(),
      parentId: generationParentId,
      blobBase64: finalBase64,
      prompt: prompt.value,
      model: model.value,
      createdAt: Date.now(),
      sourceUri: null,
      modificationBox: buildModificationBox(generationCropData),
      referenceSnapshots: generationReferences,
      geminiResultBase64: resultBase64,
      finalResultThumbnailBase64,
    }, generationWorkspaceId || undefined);

    prompt.value = '';
    store.clearReferenceImages();
  } catch (e: any) {
    console.error(e);
    errorMsg.value = e.message || 'Generation failed';
  } finally {
    isGenerating.value = false;
  }
}

function triggerUpload() {
  fileInput.value?.click();
}

function onFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const reader = new FileReader();
  const sourceUri = getFileSourceUri(file);
  reader.onload = async (loadEvent) => {
    const base64 = loadEvent.target?.result as string;
    const thumbnail = await createThumbnailDataUrl(base64);

    store.addNode({
      id: Date.now().toString(),
      parentId: store.activeNodeId,
      blobBase64: base64,
      prompt: 'Media Upload',
      model: 'Local',
      createdAt: Date.now(),
      sourceUri,
      modificationBox: null,
      referenceSnapshots: [],
      geminiResultBase64: null,
      finalResultThumbnailBase64: thumbnail,
    });
  };
  reader.readAsDataURL(file);
}

function triggerRefUpload() {
  refFileInput.value?.click();
}

function onRefFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const reader = new FileReader();
  const sourceUri = getFileSourceUri(file);
  reader.onload = (loadEvent) => {
    const base64 = loadEvent.target?.result as string;
    if (store.referenceImages.length < 14) {
      store.addReferenceImage(createReferenceAsset(base64, 'upload', { sourceUri }));
    }
  };
  reader.readAsDataURL(file);
}

function isTypingTarget(target: EventTarget | null) {
  const el = target instanceof HTMLElement ? target : null;
  if (!el) return false;
  return el.isContentEditable || !!el.closest('input, textarea, select, [contenteditable="true"]');
}

function canUseParentShortcut(target: EventTarget | null) {
  return props.isActive
    && !props.isShortcutSuspended
    && !isGenerating.value
    && !isTypingTarget(target)
    && !!activeParentImageNode.value;
}

function handleGlobalKeyDown(e: KeyboardEvent) {
  const key = e.key.toLowerCase();
  const isSpace = e.code === 'Space' || e.key === ' ';

  if (key === 'a') {
    if (!canUseParentShortcut(e.target)) return;
    e.preventDefault();
    isHoldingParentPreviewKey.value = true;
    if (!e.repeat && !suppressParentPreviewUntilKeyup.value) {
      isShowingParentPreview.value = true;
    }
    return;
  }

  if (!isSpace) return;
  if (!canUseParentShortcut(e.target)) return;
  if (!isHoldingParentPreviewKey.value || !isShowingParentPreview.value || !activeParentImageNode.value) return;

  e.preventDefault();
  suppressParentPreviewUntilKeyup.value = true;
  isShowingParentPreview.value = false;
  resetTransientSelectionState();
  store.setActiveNode(activeParentImageNode.value.id);
}

function handleGlobalKeyUp(e: KeyboardEvent) {
  if (e.key.toLowerCase() !== 'a') return;
  resetParentPreviewState();
}

function handleWindowBlur() {
  resetParentPreviewState();
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeyDown);
  window.addEventListener('keyup', handleGlobalKeyUp);
  window.addEventListener('blur', handleWindowBlur);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeyDown);
  window.removeEventListener('keyup', handleGlobalKeyUp);
  window.removeEventListener('blur', handleWindowBlur);
});

watch(() => props.isActive, (isActive) => {
  if (!isActive) {
    resetParentPreviewState();
  }
});

watch(() => props.isShortcutSuspended, (isShortcutSuspended) => {
  if (isShortcutSuspended) {
    resetParentPreviewState();
  }
});

watch(() => store.activeNodeId, () => {
  resetTransientSelectionState();
  isShowingParentPreview.value = false;
  canvasView.value = { zoom: 1, zoomPercent: 100, canPan: false };
});
</script>

<template>
  <main v-show="isActive" class="flex-1 relative bg-[#111] overflow-hidden flex flex-col">
    <div
      class="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-surface/80 backdrop-blur-md px-4 py-2 rounded-full border border-border flex items-center gap-4 text-sm shadow-xl tooltip-container">
      <template v-if="isShowingParentPreview && activeParentImageNode">
        <span class="text-[11px] text-textMuted tracking-wide">
          Parent Preview: release <span class="text-textMain font-semibold">A</span> to return,
          press <span class="text-textMain font-semibold">Space</span> to restore this version
        </span>
      </template>
      <template v-else>
        <button
          class="w-6 h-6 rounded-full border border-border text-textMuted hover:text-primary hover:border-primary transition-colors text-xs flex items-center justify-center"
          @click="zoomOutCanvas"
          :disabled="!activeImageNode">
          -
        </button>
        <span class="text-textMuted text-xs min-w-[72px] text-center">Zoom: {{ canvasView.zoomPercent }}%</span>
        <button
          class="w-6 h-6 rounded-full border border-border text-textMuted hover:text-primary hover:border-primary transition-colors text-xs flex items-center justify-center"
          @click="zoomInCanvas"
          :disabled="!activeImageNode">
          +
        </button>
        <button
          class="text-[11px] transition-colors"
          :class="canvasView.zoomPercent === 100 ? 'text-textMuted opacity-40 cursor-default pointer-events-none' : 'text-textMuted hover:text-primary opacity-100'"
          :disabled="canvasView.zoomPercent === 100"
          @click="resetCanvasView">
          Reset
        </button>
        <div class="w-px h-4 bg-border"></div>
        <span
          class="text-[11px] transition-colors"
          :class="canvasView.canPan ? 'text-textMuted opacity-100' : 'text-textMuted opacity-40'">
          Ctrl+drag to pan
        </span>
        <div class="w-px h-4 bg-border"></div>
        <button
          class="hover:text-primary transition-colors flex items-center gap-1 text-xs"
          :class="{ 'text-primary': useSearchGrounding }"
          @click="useSearchGrounding = !useSearchGrounding"
          title="Enable Google Search Grounding to let the AI fetch realtime data for prompt accuracy.">
          <Search :size="12" /> Search Grounding
          <Info :size="10" class="opacity-50 inline-block" />
        </button>
      </template>
    </div>

    <div class="flex-1 flex overflow-hidden p-8 items-center justify-center">
      <template v-if="activeImageNode">
        <div class="relative w-full h-full">
          <CanvasSelection
            :key="activeImageNode.id"
            ref="canvasRef"
            :imageSrc="activeImageNode.blobBase64"
            :preview-src="isShowingParentPreview && activeParentImageNode ? activeParentImageNode.blobBase64 : null"
            :targetRatio="isAutoRatio ? 'auto' : aspectRatio"
            :availableRatios="supportedAspectRatios"
            @cropped="handleCrop"
            @update:ratio="r => aspectRatio = r"
            @update:selection-px="handleSelectionPx"
            @update:view="handleCanvasView" />
        </div>
      </template>
      <template v-else-if="!isGenerating">
        <div
          class="w-full h-full border border-dashed border-border hover:border-primary transition-colors cursor-pointer rounded-xl flex items-center justify-center text-textMuted flex-col gap-2 relative"
          @click="triggerUpload">
          <ImageIcon :size="48" class="opacity-20" />
          <p class="text-sm">No project loaded. Click to browse or drop media.</p>
          <input type="file" ref="fileInput" class="hidden" accept="image/*" @change="onFileSelected" />
        </div>
      </template>
      <template v-else>
        <div class="flex flex-col items-center gap-4">
          <Loader2 :size="48" class="animate-spin text-primary opacity-80" />
          <p class="text-sm text-primary animate-pulse font-medium">Nano Banana generating...</p>
        </div>
      </template>
    </div>
  </main>

  <aside v-show="isActive" class="w-80 bg-surface border-l border-border flex flex-col relative">
    <div
      v-if="errorMsg"
      class="absolute top-0 left-0 w-full bg-red-900/40 text-red-200 text-xs p-2 z-50 break-words border-b border-red-500/50">
      {{ errorMsg }}
      <button
        @click="errorMsg = ''"
        class="float-right font-bold ml-2 cursor-pointer text-red-100 hover:text-white">&times;</button>
    </div>

    <div class="p-4 border-b border-border font-medium text-sm flex items-center gap-2">
      <Type :size="16" class="text-primary" /> Prompt Engine
    </div>

    <div class="p-4 flex flex-col gap-4 flex-1 overflow-y-auto">
      <div class="flex flex-col gap-2">
        <label class="text-xs text-textMuted font-medium uppercase tracking-wider">Models</label>
        <select
          v-model="model"
          class="bg-background border border-border rounded p-2 text-sm focus:outline-none focus:border-primary">
          <option value="gemini-3-pro-image-preview">Nano Banana Pro (3.0 Pro)</option>
          <option value="gemini-3.1-flash-image-preview">Nano Banana 2 (3.1 Flash)</option>
        </select>
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-xs text-textMuted font-medium uppercase tracking-wider">Aspect Ratio</label>
        <div class="grid grid-cols-5 gap-1">
          <button
            @click="isAutoRatio = !isAutoRatio"
            class="col-span-2 bg-background border border-border rounded py-1 text-xs transition-colors"
            :class="{ 'border-primary text-[#000] bg-primary font-bold': isAutoRatio }">Auto Snap</button>
          <template v-for="r in supportedAspectRatios" :key="r">
            <button
              @click="aspectRatio = r; isAutoRatio = false"
              class="bg-background border border-border rounded py-1 text-[10px] transition-colors leading-tight"
              :class="{ 'border-primary text-primary': aspectRatio === r && !isAutoRatio, 'text-primary/40': aspectRatio === r && isAutoRatio }">{{ r }}</button>
          </template>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-xs text-textMuted font-medium uppercase tracking-wider">Resolution</label>
        <div class="grid grid-cols-5 gap-1">
          <button
            @click="isAutoResolution = true"
            class="col-span-1 bg-background border border-border rounded py-1 text-xs transition-colors"
            :class="{ 'border-primary text-[#000] bg-primary font-bold': isAutoResolution }">Auto</button>
          <button
            v-for="step in RESOLUTION_STEPS"
            :key="step.value"
            @click="resolution = step.value; isAutoResolution = false"
            class="bg-background border border-border rounded py-1 text-xs transition-colors"
            :class="{ 'border-primary text-primary': displayedResolution === step.value && !isAutoResolution, 'text-primary/40': displayedResolution === step.value && isAutoResolution }">{{ step.label }}</button>
        </div>
      </div>

      <div v-if="model === 'gemini-3.1-flash-image-preview'" class="flex flex-col gap-2">
        <label class="text-xs text-textMuted font-medium uppercase tracking-wider">Thinking Level</label>
        <div class="grid grid-cols-2 gap-1">
          <button
            @click="thinkingLevel = 'Minimal'"
            class="bg-background border border-border rounded py-1 text-xs transition-colors"
            :class="{ 'border-primary text-[#000] bg-primary font-bold': thinkingLevel === 'Minimal' }">Minimal</button>
          <button
            @click="thinkingLevel = 'High'"
            class="bg-background border border-border rounded py-1 text-xs transition-colors"
            :class="{ 'border-primary text-[#000] bg-primary font-bold': thinkingLevel === 'High' }">High</button>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <label class="text-xs text-textMuted font-medium uppercase tracking-wider">Reference Limits ({{ store.referenceImages.length }}/14)</label>
          <button
            @click="triggerRefUpload"
            class="text-xs bg-surfaceHover hover:bg-primary/20 hover:text-primary transition-colors px-2 py-1 rounded border border-border flex items-center gap-1"
            title="Upload Reference Image">
            <Upload :size="12" /> Add
          </button>
          <input type="file" ref="refFileInput" class="hidden" accept="image/*" @change="onRefFileSelected" />
        </div>
        <div class="flex flex-col gap-3">
          <div
            class="relative rounded-xl border p-2 transition-colors"
            :class="isPrimaryReferenceFullImageFallback
              ? 'border-orange-400/70 bg-orange-400/10'
              : displayedPrimaryReference
                ? 'border-yellow-400/70 bg-yellow-400/10'
                : 'border-yellow-400/40 bg-background/40'">
            <div class="flex items-center justify-between mb-2">
              <div
                class="flex items-center gap-2"
                :class="isPrimaryReferenceFullImageFallback ? 'text-orange-300' : 'text-yellow-300'">
                <Star :size="12" class="fill-current" />
                <span class="text-[11px] font-semibold uppercase tracking-[0.2em]">
                  Ref 1 {{ isPrimaryReferenceImplicit ? 'Auto' : 'Primary' }}
                </span>
              </div>
              <button
                v-if="primaryReference"
                @click="store.removeReferenceImage(0)"
                class="bg-surface hover:bg-red-500/20 text-red-500 rounded-full p-1 transition-colors">
                <X :size="12" />
              </button>
            </div>

            <div
              class="rounded-lg border border-dashed overflow-hidden"
              :class="isPrimaryReferenceFullImageFallback
                ? 'border-orange-300/50 bg-black'
                : displayedPrimaryReference
                  ? 'border-yellow-300/40 bg-black'
                  : 'border-yellow-300/30 bg-background/60'">
              <div v-if="displayedPrimaryReference" class="h-24 flex items-center justify-center">
                <img
                  :src="displayedPrimaryReference.dataUrl"
                  :title="displayedPrimaryReference.sourceUri || displayedPrimaryReference.kind"
                  class="w-full h-full object-contain opacity-90" />
              </div>
              <div
                v-else
                class="h-24 flex items-center justify-center text-center px-4 text-xs text-textMuted/70">
                Draw the modification zone on the canvas to set Reference 1.
              </div>
            </div>
            <p
              class="mt-2 text-[11px]"
              :class="isPrimaryReferenceFullImageFallback ? 'text-orange-100/90' : 'text-yellow-100/80'">
              <template v-if="isPrimaryReferenceImplicit">
                Using the full active image automatically because no explicit Ref 1 was provided yet.
              </template>
              <template v-else>
                This slot is the main region to modify and is used first during generation.
              </template>
            </p>
          </div>

          <div v-if="secondaryReferences.length > 0" class="flex gap-2 overflow-x-auto pb-2 custom-scroll">
            <div
              v-for="(img, idx) in secondaryReferences"
              :key="img.id"
              class="relative shrink-0 w-16 h-16 rounded border border-border group">
              <img :src="img.dataUrl" :title="img.sourceUri || img.kind" class="w-full h-full object-cover rounded opacity-80" />
              <button
                @click="store.removeReferenceImage(idx + 1)"
                class="absolute -top-2 -right-2 bg-surface hover:bg-red-500/20 text-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <X :size="12" />
              </button>
            </div>
          </div>
          <div
            v-else
            class="text-xs text-textMuted/50 italic border border-dashed border-border rounded p-4 text-center">
            Additional references are optional.
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-2 mt-4 flex-1">
        <label class="text-xs text-textMuted font-medium uppercase tracking-wider">Prompt</label>
        <textarea
          v-model="prompt"
          :disabled="isGenerating"
          class="flex-1 bg-background border border-border rounded p-3 text-sm resize-none focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
          placeholder="Describe your vision..."></textarea>
      </div>
    </div>

    <div class="p-4 border-t border-border bg-background/50">
      <button
        @click="onGenerate"
        :disabled="isGenerating"
        class="w-full bg-primary hover:bg-primaryHover text-[#000] font-semibold py-3 flex justify-center items-center gap-2 rounded shadow-[0_0_15px_rgba(250,204,21,0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
        <Loader2 v-if="isGenerating" :size="20" class="animate-spin" />
        {{ isGenerating ? 'Generating...' : 'Generate Art' }}
      </button>
    </div>
  </aside>
</template>

<style>
.custom-scroll::-webkit-scrollbar {
  height: 4px;
}

.custom-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.custom-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
