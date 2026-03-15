<script setup lang="ts">
import { ref, nextTick, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { Brush, ChevronDown, ChevronUp, Eye, EyeOff, Type, Search, Loader2, Info, RotateCcw, Undo2, X, Upload, Image as ImageIcon, Star } from 'lucide-vue-next';
import CanvasSelection, {
  type CropConfirmAction,
  type CropData,
  type MaskEditableLayer,
  type MaskEditorState,
} from '../components/CanvasSelection.vue';
import { useAppStore } from '../stores/appStore';
import type { ImageDimensions, LayerMaskPayload, ReferenceImageAsset } from '../stores/appStore';
import { generateImage, ASPECT_RATIO_VALUES, getSupportedAspectRatios, getSupportedResolutions } from '../services/geminiService';
import type { GenerationParams, AspectRatio, Resolution, GenerationModel, ThinkingLevel } from '../services/geminiService';
import { getImageDimensionsFromDataUrl, resolveNodeFinalImageSize } from '../services/imageDimensions';
import { buildBranchLayerStack, buildNodeLineage, type BranchLayerStack } from '../services/layerExport';
import { renderLayerComposite } from '../services/layerRendering';
import { buildPixelDensitySummary } from '../services/pixelDensity';

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

const branchLayerStack = ref<BranchLayerStack | null>(null);
const lineagePreviewImages = ref<Record<string, string>>({});
const lineagePreviewThumbnails = ref<Record<string, string>>({});
const activeSidebarTab = ref<'prompt' | 'mask'>('prompt');
const isMaskEditorEnabled = ref(false);
const selectedMaskLayerNodeId = ref<string | null>(null);
const maskBrushMode = ref<'hide' | 'reveal'>('hide');
const maskBrushRadius = ref(56);
const maskBrushHardness = ref(0.72);
const isMaskViewEnabled = ref(false);
const maskEditorState = ref<MaskEditorState>({
  canUndo: false,
  hasMask: false,
  isDirty: false,
  targetNodeId: null,
});

const supportedAspectRatios = computed(() => getSupportedAspectRatios(model.value));
const supportedResolutions = computed(() => getSupportedResolutions(model.value));
const activeImageNode = computed(() => store.nodes.find(n => n.id === store.activeNodeId) || null);
const activeLineageNodes = computed(() => buildNodeLineage(store.nodes, store.activeNodeId));
const activeLineageCurrentIndex = computed(() => Math.max(0, activeLineageNodes.value.length - 1));
const activeLineageMaskVersion = computed(() =>
  activeLineageNodes.value.map(node => `${node.id}:${node.layerMask?.updatedAt ?? 0}`).join('|')
);
const displayedCanvasImageSrc = computed(() =>
  branchLayerStack.value?.finalCompositeDataUrl || activeImageNode.value?.blobBase64 || ''
);
const primaryReference = computed(() => store.referenceImages[0] || null);
const secondaryReferences = computed(() => store.referenceImages.slice(1));
const hasExplicitPrimaryReference = computed(() => !!primaryReference.value);
const canAddSecondaryReference = computed(() => store.referenceImages.length < 14);
const implicitPrimaryReference = computed<ReferenceImageAsset | null>(() => {
  const activeNode = activeImageNode.value;
  const implicitImageSrc = displayedCanvasImageSrc.value;
  if (!activeNode || !implicitImageSrc) return null;

  return createReferenceAsset(implicitImageSrc, 'implicit-node', {
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
const previewLineageIndex = ref<number | null>(null);
const previewLineageNode = computed(() => {
  if (previewLineageIndex.value === null) return null;
  return activeLineageNodes.value[previewLineageIndex.value] || null;
});
const previewLineageImageSrc = computed(() => {
  const previewNode = previewLineageNode.value;
  if (!previewNode) return null;

  return lineagePreviewImages.value[previewNode.id]
    || previewNode.finalResultBase64
    || previewNode.blobBase64;
});
const previewLineageLabel = computed(() => {
  const previewNode = previewLineageNode.value;
  const previewIndex = previewLineageIndex.value;
  if (!previewNode || previewIndex === null) return '';

  if (previewIndex === 0) return `Root ${previewIndex + 1}/${activeLineageNodes.value.length}`;
  if (previewIndex === activeLineageCurrentIndex.value) return `Current ${previewIndex + 1}/${activeLineageNodes.value.length}`;
  return `Node ${previewIndex + 1}/${activeLineageNodes.value.length}`;
});
const isShowingLineageTimeline = computed(() =>
  isShowingParentPreview.value && activeLineageNodes.value.length > 1
);
const workspaceName = computed(() => store.activeWorkspace?.name || 'workspace');
const editableMaskLayers = computed<MaskEditableLayer[]>(() =>
  (branchLayerStack.value?.layers ?? []).map(layer => ({
    nodeId: layer.nodeId,
    left: layer.left,
    top: layer.top,
    width: layer.width,
    height: layer.height,
    sourceDataUrl: layer.sourceDataUrl,
    layerMask: layer.layerMask ?? null,
  }))
);
const availableMaskLayers = computed(() =>
  branchLayerStack.value ? [...branchLayerStack.value.layers].reverse() : []
);
const selectedMaskLayer = computed(() =>
  branchLayerStack.value?.layers.find(layer => layer.nodeId === selectedMaskLayerNodeId.value) || null
);
const canEditMasks = computed(() => availableMaskLayers.value.length > 0);
const selectedMaskLayerLabel = computed(() => {
  const layer = selectedMaskLayer.value;
  if (!layer) return 'No layer selected';
  if (layer.index === 0) return 'Root layer';
  return `${layer.name} · ${layer.width}x${layer.height}`;
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
const activeImageFinalSize = ref<ImageDimensions | null>(null);
const isDensityOverlayEnabled = ref(false);
const densityOverlaySrc = ref<string | null>(null);
const densitySummary = ref<Awaited<ReturnType<typeof buildPixelDensitySummary>> | null>(null);
const densityOverlayOpacity = ref(0.7);
const isDensityPanelCollapsed = ref(true);

const workAreaSize = computed(() => {
  if (activeCropData.value) {
    return {
      width: activeCropData.value.w,
      height: activeCropData.value.h,
    };
  }

  if (selectionNaturalW.value > 0 && selectionNaturalH.value > 0) {
    return {
      width: selectionNaturalW.value,
      height: selectionNaturalH.value,
    };
  }

  if (activeImageFinalSize.value) {
    return {
      width: activeImageFinalSize.value.width,
      height: activeImageFinalSize.value.height,
    };
  }

  return null;
});

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

function formatDensity(value: number | null | undefined) {
  if (!value || !Number.isFinite(value)) return '--';
  return `${value.toFixed(value >= 10 ? 1 : 2)}x`;
}

function formatOpacity(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatMaskLayerOption(layer: BranchLayerStack['layers'][number]) {
  const promptLabel = layer.prompt?.trim() || (layer.index === 0 ? 'Base Image' : 'Untitled layer');
  return `#${layer.index + 1} · ${promptLabel}`;
}

function syncSelectedMaskLayer() {
  const stack = branchLayerStack.value;
  if (!stack || stack.layers.length === 0) {
    selectedMaskLayerNodeId.value = null;
    return;
  }

  if (selectedMaskLayerNodeId.value && stack.layers.some(layer => layer.nodeId === selectedMaskLayerNodeId.value)) {
    return;
  }

  selectedMaskLayerNodeId.value = stack.layers[stack.layers.length - 1].nodeId;
}

function syncMaskEditorEnabledFromSelection() {
  const hasSavedMask = !!selectedMaskLayer.value?.layerMask?.dataUrl;
  isMaskEditorEnabled.value = hasSavedMask;
  if (hasSavedMask) {
    canvasRef.value?.cancelCrop?.();
    resetTransientSelectionState();
  } else {
    isMaskViewEnabled.value = false;
  }
}

function setSidebarTab(nextTab: 'prompt' | 'mask') {
  activeSidebarTab.value = nextTab;
  if (nextTab !== 'mask' && isMaskEditorEnabled.value) {
    setMaskEditorEnabled(false);
    return;
  }

  if (nextTab === 'mask') {
    syncMaskEditorEnabledFromSelection();
  }
}

function setMaskEditorEnabled(nextValue: boolean) {
  isMaskEditorEnabled.value = nextValue;
  if (!nextValue) {
    isMaskViewEnabled.value = false;
    return;
  }

  activeSidebarTab.value = 'mask';
  canvasRef.value?.cancelCrop?.();
  resetTransientSelectionState();
}

function handleMaskUpdated(payload: { nodeId: string; mask: LayerMaskPayload | null }) {
  store.setNodeLayerMask(payload.nodeId, payload.mask);
}

function handleMaskStateChange(state: MaskEditorState) {
  maskEditorState.value = state;
}

function undoMaskStroke() {
  canvasRef.value?.undoMaskStroke?.();
}

function resetSelectedMask() {
  canvasRef.value?.resetMaskStroke?.();
}

function getNodePreviewImage(
  node: { id: string; finalResultThumbnailBase64?: string | null; finalResultBase64?: string | null; blobBase64: string },
) {
  return lineagePreviewThumbnails.value[node.id]
    || lineagePreviewImages.value[node.id]
    || node.finalResultThumbnailBase64
    || node.finalResultBase64
    || node.blobBase64;
}

function getLineageNodeRole(index: number) {
  if (index === 0) return 'Root';
  if (index === activeLineageCurrentIndex.value) return 'Current';
  return `Step ${index + 1}`;
}

function clampIndex(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function removePrimaryReference() {
  if (!primaryReference.value) return;
  store.removeReferenceImage(0);
  activeCropData.value = null;
  selectionNaturalW.value = 0;
  selectionNaturalH.value = 0;
}

function showLineagePreview(index: number) {
  const maxIndex = activeLineageCurrentIndex.value;
  previewLineageIndex.value = clampIndex(index, 0, maxIndex);
  isShowingParentPreview.value = true;
}

function hideLineagePreview() {
  previewLineageIndex.value = null;
  isShowingParentPreview.value = false;
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
  const area = workAreaSize.value;
  const longestSide = area ? Math.max(area.width, area.height) : 0;
  if (longestSide < 1) return normalizeResolutionForModel(resolution.value, model.value);
  return autoResolutionFromPx(longestSide, model.value);
});

watch(model, (nextModel) => {
  aspectRatio.value = normalizeAspectRatioForModel(aspectRatio.value, nextModel);
  resolution.value = normalizeResolutionForModel(resolution.value, nextModel);
});

watch(
  () => activeImageNode.value?.id || null,
  async (_nodeId, _previousNodeId, onCleanup) => {
    let cancelled = false;
    onCleanup(() => {
      cancelled = true;
    });

    if (!activeImageNode.value) {
      activeImageFinalSize.value = null;
      return;
    }

    const size = await resolveNodeFinalImageSize(activeImageNode.value);
    if (!cancelled) {
      activeImageFinalSize.value = size;
    }
  },
  { immediate: true },
);

watch(
  () => [
    store.activeNodeId,
    store.nodes.length,
    activeLineageMaskVersion.value,
  ],
  async (_state, _previousState, onCleanup) => {
    let cancelled = false;
    onCleanup(() => {
      cancelled = true;
    });

    if (!store.activeNodeId) {
      branchLayerStack.value = null;
      selectedMaskLayerNodeId.value = null;
      return;
    }

    try {
      const nextStack = await buildBranchLayerStack(store.nodes, store.activeNodeId, workspaceName.value);
      if (!cancelled) {
        branchLayerStack.value = nextStack;
        syncSelectedMaskLayer();
      }
    } catch {
      if (!cancelled) {
        branchLayerStack.value = null;
        selectedMaskLayerNodeId.value = null;
      }
    }
  },
  { immediate: true },
);

watch(
  () => [
    branchLayerStack.value?.activeNodeId ?? null,
    branchLayerStack.value?.documentWidth ?? 0,
    branchLayerStack.value?.documentHeight ?? 0,
    branchLayerStack.value?.layers.map(layer => `${layer.nodeId}:${layer.layerMask?.updatedAt ?? 0}`).join('|') ?? '',
  ],
  async (_state, _previousState, onCleanup) => {
    let cancelled = false;
    onCleanup(() => {
      cancelled = true;
    });

    const stack = branchLayerStack.value;
    if (!stack) {
      lineagePreviewImages.value = {};
      lineagePreviewThumbnails.value = {};
      return;
    }

    try {
      const imageEntries: Array<[string, string]> = [];
      const thumbnailEntries: Array<[string, string]> = [];

      for (let index = 0; index < stack.layers.length; index += 1) {
        const layer = stack.layers[index];
        const compositeDataUrl = index === stack.layers.length - 1
          ? stack.finalCompositeDataUrl
          : (await renderLayerComposite(
              stack.layers.slice(0, index + 1),
              stack.documentWidth,
              stack.documentHeight,
            )).toDataURL('image/png');

        if (cancelled) return;

        imageEntries.push([layer.nodeId, compositeDataUrl]);
        thumbnailEntries.push([layer.nodeId, await createThumbnailDataUrl(compositeDataUrl)]);
      }

      if (!cancelled) {
        lineagePreviewImages.value = Object.fromEntries(imageEntries);
        lineagePreviewThumbnails.value = Object.fromEntries(thumbnailEntries);
      }
    } catch {
      if (!cancelled) {
        lineagePreviewImages.value = {};
        lineagePreviewThumbnails.value = {};
      }
    }
  },
  { immediate: true },
);

watch(
  () => [
    store.activeNodeId,
    store.nodes.length,
  ],
  async (_state, _previousState, onCleanup) => {
    let cancelled = false;
    onCleanup(() => {
      cancelled = true;
    });

    if (!store.activeNodeId) {
      densityOverlaySrc.value = null;
      densitySummary.value = null;
      return;
    }

    const summary = await buildPixelDensitySummary(store.nodes, store.activeNodeId);
    if (!cancelled) {
      densitySummary.value = summary;
      densityOverlaySrc.value = summary?.overlayDataUrl || null;
    }
  },
  { immediate: true },
);

function resetTransientSelectionState() {
  activeCropData.value = null;
  selectionNaturalW.value = 0;
  selectionNaturalH.value = 0;
}

function resetParentPreviewState() {
  isHoldingParentPreviewKey.value = false;
  hideLineagePreview();
  suppressParentPreviewUntilKeyup.value = false;
}

function handleCrop(data: CropData, action: CropConfirmAction = 'replace-primary') {
  const sourceNode = activeImageNode.value;
  errorMsg.value = '';
  const cropReference = createReferenceAsset(data.base64, 'crop', {
    sourceUri: sourceNode?.sourceUri ?? null,
    sourceNodeId: sourceNode?.id ?? null,
  });

  if (action === 'add-secondary' && hasExplicitPrimaryReference.value) {
    if (!canAddSecondaryReference.value) {
      errorMsg.value = 'Reference limit reached. Remove one before adding another.';
      return;
    }

    store.addReferenceImage(cropReference);
    return;
  }

  store.setPrimaryReferenceImage(cropReference);
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
    const generationBaseImage = displayedCanvasImageSrc.value || activeNode?.blobBase64 || null;
    const generationReferences: ReferenceImageAsset[] = store.referenceImages.length === 0 && activeNode && generationBaseImage
      ? [createReferenceAsset(generationBaseImage, 'implicit-node', {
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
    const generationBaseNodeBlob = generationBaseImage;

    const resultBase64 = await generateImage(params);
    const generatedImageSize = await getImageDimensionsFromDataUrl(resultBase64);

    let finalBase64 = resultBase64;
    let finalImageSize = generatedImageSize;

    if (generationCropData && generationBaseNodeBlob) {
      finalBase64 = await compositeImage(generationBaseNodeBlob, resultBase64, generationCropData);
      finalImageSize = {
        width: generationCropData.originalWidth,
        height: generationCropData.originalHeight,
      };
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
      generatedImageSize,
      finalImageSize,
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
    const imageSize = await getImageDimensionsFromDataUrl(base64);
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
      generatedImageSize: imageSize,
      finalImageSize: imageSize,
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
    && activeLineageNodes.value.length > 1;
}

function handleGlobalKeyDown(e: KeyboardEvent) {
  const key = e.key.toLowerCase();
  const isSpace = e.code === 'Space' || e.key === ' ';
  const isArrowUp = e.key === 'ArrowUp';
  const isArrowDown = e.key === 'ArrowDown';
  const isUndo = (e.ctrlKey || e.metaKey) && !e.shiftKey && key === 'z';
  const isBrushModeToggle = key === 'x';

  if (isUndo && isMaskEditorEnabled.value && !isTypingTarget(e.target)) {
    if (maskEditorState.value.canUndo) {
      e.preventDefault();
      undoMaskStroke();
    }
    return;
  }

  if (
    key === 'z'
    && !e.ctrlKey
    && !e.metaKey
    && !e.altKey
    && !e.repeat
    && props.isActive
    && !props.isShortcutSuspended
    && activeSidebarTab.value === 'mask'
    && !isTypingTarget(e.target)
  ) {
    e.preventDefault();
    isMaskViewEnabled.value = !isMaskViewEnabled.value;
    return;
  }

  if (
    isBrushModeToggle
    && !e.ctrlKey
    && !e.metaKey
    && !e.altKey
    && !e.repeat
    && props.isActive
    && !props.isShortcutSuspended
    && activeSidebarTab.value === 'mask'
    && !isTypingTarget(e.target)
  ) {
    e.preventDefault();
    maskBrushMode.value = maskBrushMode.value === 'hide' ? 'reveal' : 'hide';
    return;
  }

  if (key === 'a') {
    if (!canUseParentShortcut(e.target)) return;
    e.preventDefault();
    isHoldingParentPreviewKey.value = true;
    if (!e.repeat && !suppressParentPreviewUntilKeyup.value) {
      showLineagePreview(activeLineageCurrentIndex.value - 1);
    }
    return;
  }

  if (isArrowUp || isArrowDown) {
    if (!canUseParentShortcut(e.target)) return;
    if (!isHoldingParentPreviewKey.value || suppressParentPreviewUntilKeyup.value) return;

    const currentPreviewIndex = previewLineageIndex.value ?? Math.max(0, activeLineageCurrentIndex.value - 1);
    const nextIndex = isArrowUp
      ? currentPreviewIndex - 1
      : currentPreviewIndex + 1;

    e.preventDefault();
    showLineagePreview(nextIndex);
    return;
  }

  if (!isSpace) return;
  if (!canUseParentShortcut(e.target)) return;
  if (!isHoldingParentPreviewKey.value || !isShowingParentPreview.value || !previewLineageNode.value) return;

  e.preventDefault();
  const targetNode = previewLineageNode.value;
  if (!targetNode) return;
  suppressParentPreviewUntilKeyup.value = true;
  hideLineagePreview();
  resetTransientSelectionState();
  store.setActiveNode(targetNode.id);
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

watch(canEditMasks, (nextValue) => {
  if (!nextValue) {
    activeSidebarTab.value = 'prompt';
    setMaskEditorEnabled(false);
  } else {
    syncSelectedMaskLayer();
  }
});

watch(() => selectedMaskLayerNodeId.value, () => {
  if (activeSidebarTab.value === 'mask') {
    syncMaskEditorEnabledFromSelection();
  }
});

watch(() => store.activeNodeId, () => {
  resetTransientSelectionState();
  resetParentPreviewState();
  canvasView.value = { zoom: 1, zoomPercent: 100, canPan: false };
  maskEditorState.value = {
    canUndo: false,
    hasMask: false,
    isDirty: false,
    targetNodeId: null,
  };
});
</script>

<template>
  <main v-show="isActive" class="flex-1 relative bg-[#111] overflow-hidden flex flex-col">
    <div
      class="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-surface/80 backdrop-blur-md px-4 py-2 rounded-full border border-border flex items-center gap-4 text-sm shadow-xl tooltip-container">
      <template v-if="isShowingParentPreview && previewLineageNode">
        <span class="text-[11px] text-textMuted tracking-wide">
          {{ previewLineageLabel }}: <span class="text-textMain font-semibold">Up/Down</span> to navigate,
          release <span class="text-textMain font-semibold">A</span> to return,
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
          <div
            v-if="isShowingLineageTimeline"
            class="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-[132px] max-h-[calc(100%-3rem)] rounded-2xl border border-border bg-surface/88 backdrop-blur-md shadow-xl p-3">
            <div class="absolute left-[29px] top-10 bottom-5 w-px bg-gradient-to-b from-primary/40 via-border to-primary/20 pointer-events-none"></div>
            <div class="timeline-scroll relative flex flex-col gap-3 max-h-[calc(100vh-14rem)] overflow-y-auto pr-1">
              <button
                v-for="(node, index) in activeLineageNodes"
                :key="node.id"
                class="relative flex items-start gap-3 text-left transition-colors rounded-xl p-1"
                :class="previewLineageNode?.id === node.id
                  ? 'bg-primary/10'
                  : node.id === activeImageNode.id
                    ? 'bg-white/5'
                    : 'hover:bg-white/5'"
                @mouseenter="isHoldingParentPreviewKey ? showLineagePreview(index) : null">
                <div class="relative shrink-0 pt-0.5">
                  <div
                    class="w-11 h-11 rounded-xl overflow-hidden border shadow-lg bg-black"
                    :class="previewLineageNode?.id === node.id
                      ? 'border-primary shadow-[0_0_18px_rgba(250,204,21,0.26)]'
                      : node.id === activeImageNode.id
                        ? 'border-green-400/60'
                        : 'border-border'">
                    <img :src="getNodePreviewImage(node)" class="w-full h-full object-cover" draggable="false" />
                  </div>
                  <span
                    class="absolute -right-1 -top-1 w-3 h-3 rounded-full border border-[#111]"
                    :class="previewLineageNode?.id === node.id
                      ? 'bg-primary'
                      : node.id === activeImageNode.id
                        ? 'bg-green-400'
                        : 'bg-surfaceHover'">
                  </span>
                </div>
                <div class="min-w-0 flex-1 pt-0.5">
                  <p
                    class="text-[10px] uppercase tracking-[0.18em]"
                    :class="previewLineageNode?.id === node.id
                      ? 'text-primary'
                      : node.id === activeImageNode.id
                        ? 'text-green-300'
                        : 'text-textMuted'">
                    {{ getLineageNodeRole(index) }}
                  </p>
                  <p class="mt-1 text-[11px] leading-snug text-textMain line-clamp-2">
                    {{ node.prompt || (index === 0 ? 'Base Image' : 'Untitled node') }}
                  </p>
                </div>
              </button>
            </div>
          </div>

          <CanvasSelection
            :key="activeImageNode.id"
            ref="canvasRef"
            :imageSrc="displayedCanvasImageSrc"
            :preview-src="isShowingParentPreview && previewLineageNode && previewLineageNode.id !== activeImageNode?.id ? previewLineageImageSrc : null"
            :overlay-src="!isShowingParentPreview && !isMaskEditorEnabled && isDensityOverlayEnabled ? densityOverlaySrc : null"
            :overlay-opacity="densityOverlayOpacity"
            :targetRatio="isAutoRatio ? 'auto' : aspectRatio"
            :availableRatios="supportedAspectRatios"
            :has-explicit-primary-reference="hasExplicitPrimaryReference"
            :can-add-secondary-reference="canAddSecondaryReference"
            :live-layers="editableMaskLayers"
            :live-document-width="branchLayerStack?.documentWidth || null"
            :live-document-height="branchLayerStack?.documentHeight || null"
            :mask-edit-enabled="isMaskEditorEnabled"
            :mask-target-node-id="selectedMaskLayerNodeId"
            :mask-brush-radius="maskBrushRadius"
            :mask-brush-hardness="maskBrushHardness"
            :mask-brush-mode="maskBrushMode"
            :mask-view-enabled="isMaskViewEnabled"
            @cropped="handleCrop"
            @mask-updated="handleMaskUpdated"
            @mask-state-change="handleMaskStateChange"
            @update:ratio="r => aspectRatio = r"
            @update:selection-px="handleSelectionPx"
            @update:view="handleCanvasView" />

          <div
            class="absolute bottom-4 right-4 z-30 rounded-2xl border border-border bg-surface/88 backdrop-blur-md shadow-xl p-3 flex flex-col gap-3 transition-all"
            :class="isDensityPanelCollapsed ? 'w-auto min-w-[180px]' : 'w-[250px]'">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-[11px] uppercase tracking-[0.2em] text-textMuted">Pixel Density</p>
                <p v-if="!isDensityPanelCollapsed" class="text-[11px] text-textMuted/80 mt-1">Generated size divided by covered layer area.</p>
              </div>
              <div class="flex items-center gap-2">
                <button
                  class="shrink-0 px-2.5 py-1 rounded-full border text-[11px] transition-colors"
                  :class="isDensityOverlayEnabled
                    ? 'border-primary bg-primary text-[#000] font-semibold'
                    : 'border-border text-textMuted hover:border-primary hover:text-primary'"
                  @click="isDensityOverlayEnabled = !isDensityOverlayEnabled">
                  {{ isDensityOverlayEnabled ? 'On' : 'Off' }}
                </button>
                <button
                  class="w-7 h-7 rounded-full border border-border text-textMuted hover:text-primary hover:border-primary transition-colors flex items-center justify-center"
                  :title="isDensityPanelCollapsed ? 'Open density panel' : 'Hide density panel'"
                  @click="isDensityPanelCollapsed = !isDensityPanelCollapsed">
                  <ChevronUp v-if="isDensityPanelCollapsed" :size="14" />
                  <ChevronDown v-else :size="14" />
                </button>
              </div>
            </div>

            <div v-if="!isDensityPanelCollapsed" class="rounded-xl border border-white/8 bg-background/50 p-2.5 flex flex-col gap-3">
              <div class="flex flex-col gap-1.5">
                <div class="flex items-center justify-between text-[11px] text-textMuted">
                  <span>Overlay Opacity</span>
                  <span>{{ formatOpacity(densityOverlayOpacity) }}</span>
                </div>
                <input
                  v-model.number="densityOverlayOpacity"
                  type="range"
                  min="0.2"
                  max="0.95"
                  step="0.05"
                  class="w-full accent-yellow-400 disabled:opacity-40"
                  :disabled="!isDensityOverlayEnabled" />
              </div>

              <div class="flex items-center justify-between text-[11px] text-textMuted">
                <span>Visible Range</span>
                <span>{{ densitySummary ? `${formatDensity(densitySummary.minDensity)} to ${formatDensity(densitySummary.maxDensity)}` : 'Calculating...' }}</span>
              </div>
              <div
                class="h-2 rounded-full border border-white/10"
                style="background: linear-gradient(90deg, rgb(239,68,68) 0%, rgb(249,115,22) 38%, rgb(250,204,21) 52%, rgb(74,222,128) 100%);">
              </div>
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-red-300/90">&lt; 1x</span>
                <span class="text-yellow-200/90">1x</span>
                <span class="text-green-300/90">&gt; 1x</span>
              </div>
            </div>
          </div>
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

    <div class="px-4 pt-4 border-b border-border bg-background/35">
      <div
        role="tablist"
        aria-label="Generation sidebar sections"
        class="flex items-end gap-1.5">
        <button
          role="tab"
          :aria-selected="activeSidebarTab === 'prompt'"
          class="rounded-t-xl border border-b-0 px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 -mb-px"
          :class="activeSidebarTab === 'prompt'
            ? 'bg-surface border-border text-textMain shadow-[0_-1px_0_rgba(250,204,21,0.22)_inset]'
            : 'border-transparent text-textMuted hover:text-primary hover:bg-surfaceHover/40'"
          @click="setSidebarTab('prompt')">
          <Type :size="15" :class="activeSidebarTab === 'prompt' ? 'text-primary' : ''" />
          Prompt Engine
        </button>
        <button
          role="tab"
          :aria-selected="activeSidebarTab === 'mask'"
          class="rounded-t-xl border border-b-0 px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 -mb-px disabled:opacity-40 disabled:cursor-not-allowed"
          :class="activeSidebarTab === 'mask'
            ? 'bg-surface border-border text-textMain shadow-[0_-1px_0_rgba(250,204,21,0.22)_inset]'
            : 'border-transparent text-textMuted hover:text-primary hover:bg-surfaceHover/40'"
          :disabled="!canEditMasks"
          @click="setSidebarTab('mask')">
          <Brush :size="15" :class="activeSidebarTab === 'mask' ? 'text-primary' : ''" />
          Layer Mask
        </button>
      </div>
    </div>

    <div class="p-4 flex flex-col gap-4 flex-1 overflow-y-auto">
      <div v-show="activeSidebarTab === 'prompt'" class="flex flex-col gap-2">
        <label class="text-xs text-textMuted font-medium uppercase tracking-wider">Models</label>
        <select
          v-model="model"
          class="bg-background border border-border rounded p-2 text-sm focus:outline-none focus:border-primary">
          <option value="gemini-3-pro-image-preview">Nano Banana Pro (3.0 Pro)</option>
          <option value="gemini-3.1-flash-image-preview">Nano Banana 2 (3.1 Flash)</option>
        </select>
      </div>

      <div v-show="activeSidebarTab === 'prompt'" class="flex flex-col gap-2">
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

      <div v-show="activeSidebarTab === 'prompt'" class="flex flex-col gap-2">
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

      <div v-show="activeSidebarTab === 'prompt' && model === 'gemini-3.1-flash-image-preview'" class="flex flex-col gap-2">
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

      <div v-show="activeSidebarTab === 'prompt'" class="flex flex-col gap-2">
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
                @click="removePrimaryReference"
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

      <div v-show="activeSidebarTab === 'mask'" class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <label class="text-xs text-textMuted font-medium uppercase tracking-wider">Layer Mask</label>
          <button
            @click="setMaskEditorEnabled(!isMaskEditorEnabled)"
            :disabled="!canEditMasks"
            class="px-2.5 py-1 rounded-full border text-[11px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            :class="isMaskEditorEnabled
              ? 'border-primary bg-primary text-[#000] font-semibold'
              : 'border-border text-textMuted hover:border-primary hover:text-primary'">
            {{ isMaskEditorEnabled ? 'On' : 'Off' }}
          </button>
        </div>

        <div class="rounded-xl border border-border bg-background/50 p-3 flex flex-col gap-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-[11px] uppercase tracking-[0.2em] text-textMuted">Live Brush</p>
              <p class="mt-1 text-xs text-textMuted/80">
                Paint directly on the generation canvas. <span class="text-textMain">X</span> switches Hide/Reveal, <span class="text-textMain">Z</span> toggles Mask/Live View, <span class="text-textMain">Ctrl+drag</span> pans, and <span class="text-textMain">Ctrl+Z</span> undoes the last stroke.
              </p>
            </div>
            <Brush :size="16" :class="isMaskEditorEnabled ? 'text-primary' : 'text-textMuted/50'" />
          </div>

          <div class="rounded-xl border border-white/8 bg-surface/40 p-3 flex flex-col gap-3">
            <div class="flex items-center justify-between text-[11px] text-textMuted">
              <span>Branch Layers</span>
              <span>{{ branchLayerStack ? `${branchLayerStack.layers.length} total` : '0 total' }}</span>
            </div>

            <select
              v-model="selectedMaskLayerNodeId"
              :disabled="!canEditMasks"
              class="bg-background border border-border rounded p-2 text-sm focus:outline-none focus:border-primary disabled:opacity-40 disabled:cursor-not-allowed">
              <option v-if="!availableMaskLayers.length" :value="null">No layer available</option>
              <option
                v-for="layer in availableMaskLayers"
                :key="layer.nodeId"
                :value="layer.nodeId">
                {{ formatMaskLayerOption(layer) }}
              </option>
            </select>

            <div class="text-[11px] text-textMuted/80 rounded-lg border border-white/8 bg-background/60 px-3 py-2">
              {{ selectedMaskLayerLabel }}
            </div>

            <div class="flex items-center justify-between gap-3">
              <span class="text-[11px] uppercase tracking-[0.2em] text-textMuted">Brush Mode</span>
              <span class="inline-flex items-center rounded-full border border-border bg-background/60 px-2 py-1 text-[10px] font-medium text-textMuted">
                Shortcut
                <span class="ml-1.5 rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">X</span>
              </span>
            </div>

            <div class="inline-flex rounded-xl border border-border overflow-hidden">
              <button
                class="px-3 py-1.5 text-xs transition-colors min-w-[92px]"
                :class="maskBrushMode === 'hide' ? 'bg-primary text-[#000] font-semibold' : 'bg-background text-textMuted hover:text-primary'"
                :disabled="!isMaskEditorEnabled"
                @click="maskBrushMode = 'hide'">
                Hide
              </button>
              <button
                class="px-3 py-1.5 text-xs transition-colors min-w-[92px]"
                :class="maskBrushMode === 'reveal' ? 'bg-primary text-[#000] font-semibold' : 'bg-background text-textMuted hover:text-primary'"
                :disabled="!isMaskEditorEnabled"
                @click="maskBrushMode = 'reveal'">
                Reveal
              </button>
            </div>

            <div class="grid grid-cols-1 gap-3">
              <div class="rounded-xl border border-white/8 bg-background/60 p-3">
                <div class="flex items-center justify-between text-[11px] text-textMuted">
                  <span>Brush Radius</span>
                  <span>{{ maskBrushRadius }} px</span>
                </div>
                <input
                  v-model.number="maskBrushRadius"
                  type="range"
                  min="4"
                  max="256"
                  step="1"
                  class="w-full mt-2 accent-yellow-400 disabled:opacity-40"
                  :disabled="!isMaskEditorEnabled" />
              </div>

              <div class="rounded-xl border border-white/8 bg-background/60 p-3">
                <div class="flex items-center justify-between text-[11px] text-textMuted">
                  <span>Brush Hardness</span>
                  <span>{{ Math.round(maskBrushHardness * 100) }}%</span>
                </div>
                <input
                  v-model.number="maskBrushHardness"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  class="w-full mt-2 accent-yellow-400 disabled:opacity-40"
                  :disabled="!isMaskEditorEnabled" />
              </div>
            </div>

            <div class="grid grid-cols-3 gap-2">
              <button
                class="px-2.5 py-2 rounded-xl border text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                :class="isMaskViewEnabled
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-textMuted hover:border-primary hover:text-primary'"
                :disabled="!isMaskEditorEnabled"
                @click="isMaskViewEnabled = !isMaskViewEnabled">
                <Eye v-if="isMaskViewEnabled" :size="13" />
                <EyeOff v-else :size="13" />
                {{ isMaskViewEnabled ? 'Mask View' : 'Live View' }}
                <span class="rounded border border-current/30 px-1.5 py-0.5 text-[10px] leading-none">Z</span>
              </button>

              <button
                class="px-2.5 py-2 rounded-xl border text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                :class="maskEditorState.canUndo
                  ? 'border-border text-textMuted hover:border-primary hover:text-primary'
                  : 'border-border text-textMuted/60'"
                :disabled="!isMaskEditorEnabled || !maskEditorState.canUndo"
                @click="undoMaskStroke">
                <Undo2 :size="13" />
                Undo
              </button>

              <button
                class="px-2.5 py-2 rounded-xl border text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                :class="isMaskEditorEnabled
                  ? 'border-border text-textMuted hover:border-primary hover:text-primary'
                  : 'border-border text-textMuted/60'"
                :disabled="!isMaskEditorEnabled || !selectedMaskLayer"
                @click="resetSelectedMask">
                <RotateCcw :size="13" />
                Reset
              </button>
            </div>

            <div class="flex items-center justify-between text-[11px]">
              <span :class="maskEditorState.hasMask ? 'text-primary' : 'text-textMuted/70'">
                {{ maskEditorState.hasMask ? 'Mask active on this layer' : 'No saved mask on this layer' }}
              </span>
              <span :class="isMaskEditorEnabled ? 'text-textMuted' : 'text-textMuted/60'">
                {{ isMaskEditorEnabled ? 'Canvas brush armed' : 'Canvas brush idle' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-show="activeSidebarTab === 'prompt'" class="flex flex-col gap-2 mt-4 flex-1">
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

.timeline-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(250, 204, 21, 0.45) transparent;
}

.timeline-scroll::-webkit-scrollbar {
  width: 6px;
}

.timeline-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.timeline-scroll::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(250, 204, 21, 0.72), rgba(245, 158, 11, 0.32));
  border-radius: 999px;
}

.timeline-scroll::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(253, 224, 71, 0.84), rgba(249, 115, 22, 0.46));
}
</style>
