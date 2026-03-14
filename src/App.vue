<script setup lang="ts">
import { ref, nextTick, computed } from 'vue';
import { Settings, Image as ImageIcon, GitBranch, Layers, Type, Search, Loader2, Info, X, Upload, FolderOpen, Plus, Pencil, Trash2 } from 'lucide-vue-next';
import CanvasSelection, { CropData } from './components/CanvasSelection.vue';
import HistoryGraph from './components/HistoryGraph.vue';
import { useAppStore } from './stores/appStore';
import { generateImage, GenerationParams, AspectRatio, Resolution } from './services/geminiService';

const activeTab = ref('generation');
const store = useAppStore();

const prompt = ref('');
const model = ref<'gemini-3-pro-image-preview' | 'gemini-3.1-flash-image-preview'>('gemini-3.1-flash-image-preview');
const isAutoRatio = ref(true);
const aspectRatio = ref<AspectRatio>('16:9');
const resolution = ref<Resolution>('2K');
const isAutoResolution = ref(true);
const isGenerating = ref(false);
const errorMsg = ref('');
const useSearchGrounding = ref(false);

// Resolution steps — 512 is Flash-only
const ALL_RESOLUTION_STEPS: { label: string; value: Resolution; px: number; flashOnly?: boolean }[] = [
  { label: '512', value: '512', px: 512, flashOnly: true },
  { label: '1K',  value: '1K',  px: 1024 },
  { label: '2K',  value: '2K',  px: 2048 },
  { label: '4K',  value: '4K',  px: 4096 },
];

/** Given the pixel size of the longest side of the selection, pick the next higher tier (max 4K). */
function autoResolutionFromPx(longestSidePx: number): Resolution {
  for (const step of ALL_RESOLUTION_STEPS) {
    if (longestSidePx <= step.px) return step.value;
  }
  return '4K';
}

// Available steps filtered by model
const RESOLUTION_STEPS = computed(() =>
  ALL_RESOLUTION_STEPS.filter(s => !s.flashOnly || model.value === 'gemini-3.1-flash-image-preview')
);

// Reactive natural pixel dims of the current canvas selection (updated live via emit)
const selectionNaturalW = ref(0);
const selectionNaturalH = ref(0);

function handleSelectionPx(w: number, h: number) {
  selectionNaturalW.value = w;
  selectionNaturalH.value = h;
}

/** Returns the auto-computed resolution from the current selection size, or the manual one. */
const displayedResolution = computed<Resolution>(() => {
  if (!isAutoResolution.value) return resolution.value;
  const longestSide = Math.max(selectionNaturalW.value, selectionNaturalH.value);
  if (longestSide < 1) return resolution.value; // No selection yet, keep current
  return autoResolutionFromPx(longestSide);
});


async function onGenerate() {
   if (!prompt.value) return;

   // 1. If we have an active selection box, validate it automatically first
   if (canvasRef.value?.hasActiveSelection) {
      canvasRef.value.finalizeCrop();
      // Small delay to ensure the crop state is updated in Pinia (reactive)
      await nextTick();
   }

   isGenerating.value = true;
   errorMsg.value = '';

   try {
      // If no references provided but we have an active image, use the full image as implicit reference
      const activeNode = activeImageNode();
      const implicitRef = store.referenceImages.length === 0 && activeNode?.blobBase64
         ? [activeNode.blobBase64]
         : null;

      // Auto-resolution: pick the tier that covers the longest side of what we'll generate
      let effectiveResolution = resolution.value;
      if (isAutoResolution.value && activeNode?.blobBase64) {
         // If we have a crop, use its natural pixel dimensions; otherwise use full image dimensions
         if (activeCropData.value) {
            const longestSide = Math.max(activeCropData.value.w, activeCropData.value.h);
            effectiveResolution = autoResolutionFromPx(longestSide);
         } else {
            // Load image to get naturalWidth/Height
            const img = canvasRef.value?.imageRef ?? null;
            if (img) {
               const longestSide = Math.max((img as HTMLImageElement).naturalWidth, (img as HTMLImageElement).naturalHeight);
               effectiveResolution = autoResolutionFromPx(longestSide);
            }
         }
      }

      const params: GenerationParams = {
         apiKey: store.apiKey,
         prompt: prompt.value,
         model: model.value,
         aspectRatio: aspectRatio.value,
         resolution: effectiveResolution,
         referenceImages: implicitRef ?? store.referenceImages,
         useSearchGrounding: useSearchGrounding.value
      };

      // Capture the exact workspace context we started in so we don't dump the result into a different one if user switches tabs
      const generationWorkspaceId = store.activeWorkspaceId;
      const generationParentId = store.activeNodeId;
      const generationCropData = activeCropData.value;
      const generationBaseNodeBlob = activeImageNode()?.blobBase64;

      const resultBase64 = await generateImage(params);

      // If we have an active crop composite data, we should combine the returned base64 with the original image
      let finalBase64 = resultBase64;

      if (generationCropData && generationBaseNodeBlob) {
         finalBase64 = await compositeImage(generationBaseNodeBlob, resultBase64, generationCropData);
         // Clear crop data after use if we are still in the same workspace
         if (store.activeWorkspaceId === generationWorkspaceId) {
            activeCropData.value = null;
         }
      }

      store.addNode({
         id: Date.now().toString(),
         parentId: generationParentId,
         blobBase64: finalBase64,
         prompt: prompt.value,
         model: model.value,
         createdAt: Date.now()
      }, generationWorkspaceId || undefined);

   } catch (e: any) {
      console.error(e);
      errorMsg.value = e.message || 'Generation failed';
   } finally {
      isGenerating.value = false;
   }
}

const activeImageNode = () => store.nodes?.find(n => n.id === store.activeNodeId);

const activeCropData = ref<CropData | null>(null);

const canvasRef = ref<any>(null);

function handleCrop(data: CropData) {
   // Always insert crop at the beginning (priority 1)
   store.referenceImages.unshift(data.base64);
   // Keep only 14 max
   if (store.referenceImages.length > 14) {
      store.removeReferenceImage(14); // Remove last
   }
   activeCropData.value = data; // store the active crop boundaries for auto-compositing
}

// Helper to composite image
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
            // Draw the newly generated patch strictly over the selected region bounds
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


const fileInput = ref<HTMLInputElement | null>(null);

function triggerUpload() {
   fileInput.value?.click();
}

function onFileSelected(e: Event) {
   const file = (e.target as HTMLInputElement).files?.[0];
   if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
         store.addNode({
            id: Date.now().toString(),
            parentId: store.activeNodeId,
            blobBase64: e.target?.result as string,
            prompt: 'Media Upload',
            model: 'Local',
            createdAt: Date.now()
         });
      };
      reader.readAsDataURL(file);
   }
}

const refFileInput = ref<HTMLInputElement | null>(null);

function triggerRefUpload() {
   refFileInput.value?.click();
}

function onRefFileSelected(e: Event) {
   const file = (e.target as HTMLInputElement).files?.[0];
   if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
         const base64 = e.target?.result as string;
         if (store.referenceImages.length < 14) {
            store.addReferenceImage(base64);
         }
      };
      reader.readAsDataURL(file);
   }
}

const showRenameModal = ref(false);
const renameInput = ref('');
const renameInputEl = ref<HTMLInputElement | null>(null);
const showDeleteModal = ref(false);

function handleRenameWorkspace() {
   if (!store.activeWorkspaceId) return;
   const currentName = store.workspaces.find(w => w.id === store.activeWorkspaceId)?.name || '';
   renameInput.value = currentName;
   showRenameModal.value = true;
   nextTick(() => {
      renameInputEl.value?.focus();
      renameInputEl.value?.select();
   });
}

function confirmRename() {
   if (store.activeWorkspaceId && renameInput.value.trim()) {
      store.renameWorkspace(store.activeWorkspaceId, renameInput.value.trim());
   }
   showRenameModal.value = false;
}

function handleDeleteWorkspace() {
   if (!store.activeWorkspaceId) return;
   showDeleteModal.value = true;
}

function confirmDelete() {
   if (store.activeWorkspaceId) {
      store.deleteWorkspace(store.activeWorkspaceId);
   }
   showDeleteModal.value = false;
}
</script>

<template>
   <div class="h-screen w-screen flex flex-col bg-background text-textMain overflow-hidden relative">
      <header
         class="h-10 bg-surface border-b border-border flex items-center justify-between px-4 app-region-drag select-none shrink-0">
         <div class="flex items-center gap-4">
            <div class="text-[10px] font-bold tracking-[0.2em] text-textMuted flex items-center">
               BOLDBRUSH <span class="text-primary ml-1">SUPERPOWER</span>
            </div>
            <div class="w-px h-4 bg-border"></div>

            <!-- Workspace Selector -->
            <div class="flex items-center gap-2 app-region-no-drag">
               <FolderOpen :size="14" class="text-textMuted" />
               <select :value="store.activeWorkspaceId"
                  @change="e => store.setActiveWorkspace((e.target as HTMLSelectElement).value)"
                  class="bg-transparent text-xs text-text border-none focus:outline-none focus:ring-0 cursor-pointer hover:text-primary transition-colors pr-2">
                  <option v-for="ws in store.workspaces" :key="ws.id" :value="ws.id" class="bg-surface text-text">{{
                     ws.name }}</option>
               </select>

               <div class="flex gap-1 ml-2 border-l border-border pl-2">
                  <button @click="store.createWorkspace('New Session ' + (store.workspaces.length + 1))"
                     class="text-textMuted hover:text-green-400 p-1.5 rounded transition-colors" title="New Workspace">
                     <Plus :size="13" />
                  </button>
                  <button @click="handleRenameWorkspace"
                     class="text-textMuted hover:text-blue-400 p-1.5 rounded transition-colors"
                     title="Rename Workspace">
                     <Pencil :size="13" />
                  </button>
                  <button @click="handleDeleteWorkspace"
                     class="text-textMuted hover:text-red-400 p-1.5 rounded transition-colors" title="Delete Workspace">
                     <Trash2 :size="13" />
                  </button>
               </div>
            </div>
         </div>

         <div class="flex items-center gap-2 app-region-no-drag">
            <span
               class="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded cursor-pointer transition-colors hover:bg-primary/40">node
               info</span>
         </div>
      </header>

      <div class="flex flex-1 overflow-hidden">
         <aside class="w-14 bg-surface border-r border-border flex flex-col items-center py-4 gap-4">
            <button class="p-2 rounded-lg hover:bg-surfaceHover transition-colors"
               :class="{ 'text-primary': activeTab === 'generation' }" @click="activeTab = 'generation'"
               title="Generation">
               <ImageIcon :size="20" />
            </button>
            <button class="p-2 rounded-lg hover:bg-surfaceHover transition-colors"
               :class="{ 'text-primary': activeTab === 'history' }" @click="activeTab = 'history'"
               title="Graph History">
               <GitBranch :size="20" />
            </button>
            <button class="p-2 rounded-lg hover:bg-surfaceHover transition-colors"
               :class="{ 'text-primary': activeTab === 'tools' }" @click="activeTab = 'tools'" title="Tools & Layers">
               <Layers :size="20" />
            </button>
            <div class="flex-1"></div>
            <button class="p-2 rounded-lg hover:bg-surfaceHover transition-colors text-textMuted"
               :class="{ 'text-primary': activeTab === 'settings' }" @click="activeTab = 'settings'" title="Settings">
               <Settings :size="20" />
            </button>
         </aside>

         <main class="flex-1 relative bg-[#111] overflow-hidden flex flex-col">
            <div
               class="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-surface/80 backdrop-blur-md px-4 py-2 rounded-full border border-border flex items-center gap-4 text-sm shadow-xl tooltip-container">
               <span class="text-textMuted text-xs">Zoom: 100%</span>
               <div class="w-px h-4 bg-border"></div>
               <button class="hover:text-primary transition-colors flex items-center gap-1 text-xs"
                  :class="{ 'text-primary': useSearchGrounding }" @click="useSearchGrounding = !useSearchGrounding"
                  title="Enable Google Search Grounding to let the AI fetch realtime data for prompt accuracy.">
                  <Search :size="12" /> Search Grounding
                  <Info :size="10" class="opacity-50 inline-block" />
               </button>
            </div>

            <div class="flex-1 flex overflow-hidden p-8"
               :class="{ 'items-center justify-center': activeTab === 'generation' }">
               <!-- GENERATION VIEW -->
               <template v-if="activeTab === 'generation'">
                  <template v-if="activeImageNode()">
                     <CanvasSelection ref="canvasRef" :imageSrc="activeImageNode()!.blobBase64"
                        :targetRatio="isAutoRatio ? 'auto' : aspectRatio" @cropped="handleCrop"
                        @update:ratio="r => aspectRatio = r" @update:selection-px="handleSelectionPx" />
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
               </template>

               <!-- HISTORY VIEW (DAG GRAPH) -->
               <template v-else-if="activeTab === 'history'">
                  <HistoryGraph :nodes="store.nodes" :activeNodeId="store.activeNodeId"
                     @select="id => { store.setActiveNode(id); activeTab = 'generation'; }" />
               </template>
               <!-- TOOLS / METADATA VIEW -->
               <template v-else-if="activeTab === 'tools'">
                  <div class="w-full h-full flex flex-col gap-6 max-w-2xl mx-auto pt-8">
                     <h2 class="text-2xl font-semibold mb-4 text-textMain border-b border-border pb-2">Node Inspector
                     </h2>
                     <template v-if="activeImageNode()">
                        <div class="bg-surface border border-border rounded p-4 flex flex-col gap-4">
                           <div>
                              <label class="text-xs text-textMuted uppercase tracking-wider font-semibold">Node
                                 ID</label>
                              <p class="text-sm font-mono mt-1">{{ activeImageNode()?.id }}</p>
                           </div>
                           <div>
                              <label class="text-xs text-textMuted uppercase tracking-wider font-semibold">Model
                                 Used</label>
                              <p class="text-sm text-primary mt-1">{{ activeImageNode()?.model }}</p>
                           </div>
                           <div>
                              <label class="text-xs text-textMuted uppercase tracking-wider font-semibold">Generated
                                 At</label>
                              <p class="text-sm mt-1">{{ new Date(activeImageNode()?.createdAt || 0).toLocaleString() }}
                              </p>
                           </div>
                           <div>
                              <label
                                 class="text-xs text-textMuted uppercase tracking-wider font-semibold">Prompt</label>
                              <div
                                 class="text-sm mt-1 bg-background p-3 rounded border border-border whitespace-pre-wrap">
                                 {{ activeImageNode()?.prompt }}
                              </div>
                           </div>
                        </div>
                     </template>
                     <template v-else>
                        <p class="text-textMuted">No image node selected to inspect.</p>
                     </template>
                  </div>
               </template>

               <!-- SETTINGS VIEW -->
               <template v-else-if="activeTab === 'settings'">
                  <div class="w-full h-full flex flex-col gap-6 max-w-2xl mx-auto pt-8">
                     <h2 class="text-2xl font-semibold mb-4 text-textMain border-b border-border pb-2">Application
                        Settings</h2>
                     <div class="flex flex-col gap-2">
                        <label class="text-xs text-textMuted uppercase tracking-wider font-semibold">Gemini API
                           Key</label>
                        <input type="password" spellcheck="false" :value="store.apiKey"
                           @input="(e) => store.setApiKey((e.target as HTMLInputElement).value)"
                           class="bg-background border border-border focus:border-primary rounded p-3 focus:outline-none transition-colors"
                           placeholder="AIzaSy..." />
                        <p class="text-xs text-textMuted mt-1">Required to generate and modify images with Nano Banana 2
                           and Pro models.</p>
                     </div>
                  </div>
               </template>
            </div>
         </main>

         <aside v-if="activeTab === 'generation'" class="w-80 bg-surface border-l border-border flex flex-col relative">
            <div v-if="errorMsg"
               class="absolute top-0 left-0 w-full bg-red-900/40 text-red-200 text-xs p-2 z-50 break-words border-b border-red-500/50">
               {{ errorMsg }}
               <button @click="errorMsg = ''"
                  class="float-right font-bold ml-2 cursor-pointer text-red-100 hover:text-white">&times;</button>
            </div>

            <div class="p-4 border-b border-border font-medium text-sm flex items-center gap-2">
               <Type :size="16" class="text-primary" /> Prompt Engine
            </div>

            <div class="p-4 flex flex-col gap-4 flex-1 overflow-y-auto">
               <div class="flex flex-col gap-2">
                  <label class="text-xs text-textMuted font-medium uppercase tracking-wider">Models</label>
                  <select v-model="model"
                     class="bg-background border border-border rounded p-2 text-sm focus:outline-none focus:border-primary">
                     <option value="gemini-3-pro-image-preview">Nano Banana Pro (3.0 Pro)</option>
                     <option value="gemini-3.1-flash-image-preview">Nano Banana 2 (3.1 Flash)</option>
                  </select>
               </div>

               <div class="flex flex-col gap-2">
                  <label class="text-xs text-textMuted font-medium uppercase tracking-wider">Aspect Ratio</label>
                  <div class="grid grid-cols-5 gap-1">
                     <!-- Auto Snap spans 2 cols to be distinct -->
                     <button @click="isAutoRatio = !isAutoRatio"
                        class="col-span-2 bg-background border border-border rounded py-1 text-xs transition-colors"
                        :class="{ 'border-primary text-[#000] bg-primary font-bold': isAutoRatio }">Auto Snap</button>
                     <template v-for="r in (['1:1','1:4','1:8','2:3','3:2','3:4','4:1','4:3','4:5','5:4','8:1','9:16','16:9','21:9'] as const)" :key="r">
                        <button @click="aspectRatio = r; isAutoRatio = false"
                           class="bg-background border border-border rounded py-1 text-[10px] transition-colors leading-tight"
                           :class="{ 'border-primary text-primary': aspectRatio === r && !isAutoRatio, 'text-primary/40': aspectRatio === r && isAutoRatio }">{{ r }}</button>
                     </template>
                  </div>
               </div>

               <div class="flex flex-col gap-2">
                  <label class="text-xs text-textMuted font-medium uppercase tracking-wider">Resolution</label>
                  <div class="grid grid-cols-5 gap-1">
                     <button @click="isAutoResolution = true"
                        class="col-span-1 bg-background border border-border rounded py-1 text-xs transition-colors"
                        :class="{ 'border-primary text-[#000] bg-primary font-bold': isAutoResolution }">Auto</button>
                     <button v-for="step in RESOLUTION_STEPS" :key="step.value"
                        @click="resolution = step.value; isAutoResolution = false"
                        class="bg-background border border-border rounded py-1 text-xs transition-colors"
                        :class="{ 'border-primary text-primary': displayedResolution === step.value && !isAutoResolution, 'text-primary/40': displayedResolution === step.value && isAutoResolution }">{{ step.label }}</button>
                  </div>
               </div>

               <div class="flex flex-col gap-2">
                  <div class="flex items-center justify-between">
                     <label class="text-xs text-textMuted font-medium uppercase tracking-wider">Reference Limits ({{
                        store.referenceImages.length }}/14)</label>
                     <button @click="triggerRefUpload"
                        class="text-xs bg-surfaceHover hover:bg-primary/20 hover:text-primary transition-colors px-2 py-1 rounded border border-border flex items-center gap-1"
                        title="Upload Reference Image">
                        <Upload :size="12" /> Add
                     </button>
                     <input type="file" ref="refFileInput" class="hidden" accept="image/*"
                        @change="onRefFileSelected" />
                  </div>
                  <div v-if="store.referenceImages.length > 0" class="flex gap-2 overflow-x-auto pb-2 custom-scroll">
                     <div v-for="(img, idx) in store.referenceImages" :key="idx"
                        class="relative shrink-0 w-16 h-16 rounded border border-border group">
                        <img :src="img" class="w-full h-full object-cover rounded opacity-80" />
                        <button @click="store.removeReferenceImage(idx)"
                           class="absolute -top-2 -right-2 bg-surface hover:bg-red-500/20 text-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <X :size="12" />
                        </button>
                     </div>
                  </div>
                  <div v-else
                     class="text-xs text-textMuted/50 italic border border-dashed border-border rounded p-4 text-center">
                     Draw selection rect on canvas to add reference image.
                  </div>
               </div>

               <div class="flex flex-col gap-2 mt-4 flex-1">
                  <label class="text-xs text-textMuted font-medium uppercase tracking-wider">Prompt</label>
                  <textarea v-model="prompt" :disabled="isGenerating"
                     class="flex-1 bg-background border border-border rounded p-3 text-sm resize-none focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                     placeholder="Describe your vision..."></textarea>
               </div>
            </div>

            <div class="p-4 border-t border-border bg-background/50">
               <button @click="onGenerate" :disabled="isGenerating"
                  class="w-full bg-primary hover:bg-primaryHover text-[#000] font-semibold py-3 flex justify-center items-center gap-2 rounded shadow-[0_0_15px_rgba(250,204,21,0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  <Loader2 v-if="isGenerating" :size="20" class="animate-spin" />
                  {{ isGenerating ? 'Generating...' : 'Generate Art' }}
               </button>
            </div>
         </aside>
         <!-- Modals -->
         <Teleport to="body">
            <!-- Rename Workspace Modal -->
            <div v-if="showRenameModal"
               class="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 app-region-no-drag">
               <div
                  class="bg-surface border border-border p-8 rounded-2xl shadow-2xl w-full max-w-md flex flex-col gap-6 scale-up-center"
                  @click.stop>
                  <div class="flex items-center justify-between">
                     <h2 class="text-xl font-bold text-text flex items-center gap-2">
                        <Pencil :size="20" class="text-primary" /> Rename Project
                     </h2>
                     <button @click="showRenameModal = false" class="text-textMuted hover:text-white transition-colors">
                        <X :size="20" />
                     </button>
                  </div>

                  <div class="flex flex-col gap-2">
                     <label class="text-[10px] text-textMuted font-bold uppercase tracking-widest pl-1">Project
                        Name</label>
                     <input v-model="renameInput" @keyup.enter="confirmRename" @keyup.esc="showRenameModal = false"
                        type="text"
                        class="w-full bg-background border border-border rounded-xl px-4 py-3 text-text focus:outline-none focus:border-primary transition-all text-base select-text"
                        placeholder="e.g. Cinematic Exterior Shot" ref="renameInputEl" />
                  </div>

                  <div class="flex justify-end gap-3 pt-2">
                     <button @click="showRenameModal = false"
                        class="px-6 py-2.5 rounded-xl text-text hover:bg-surfaceHover transition-colors text-sm font-medium">Cancel</button>
                     <button @click="confirmRename"
                        class="px-6 py-2.5 rounded-xl bg-primary text-black font-bold hover:bg-primary/90 transition-all text-sm shadow-lg shadow-primary/10">Save
                        Changes</button>
                  </div>
               </div>
            </div>

            <!-- Delete Workspace Modal -->
            <div v-if="showDeleteModal"
               class="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 app-region-no-drag">
               <div
                  class="bg-surface border border-red-500/20 p-8 rounded-2xl shadow-[0_20px_80px_rgba(0,0,0,0.8)] w-full max-w-md flex flex-col gap-6 scale-up-center"
                  @click.stop>
                  <div class="flex items-center gap-4 text-red-500">
                     <div class="bg-red-500/10 p-3 rounded-full">
                        <Trash2 :size="28" />
                     </div>
                     <div>
                        <h2 class="text-xl font-bold">Delete Project</h2>
                        <p class="text-xs text-red-500/60 uppercase tracking-widest font-bold">Irreversible Action</p>
                     </div>
                  </div>

                  <p class="text-sm text-textMuted/80 leading-relaxed px-1">
                     Are you sure you want to permanently delete <strong
                        class="text-text border-b border-border pb-0.5">{{
                           store.activeWorkspace?.name }}</strong>?
                     All history and generated nodes will be wiped from the local database.
                  </p>

                  <div class="flex justify-end gap-3 pt-4">
                     <button @click="showDeleteModal = false"
                        class="px-6 py-2.5 rounded-xl text-text hover:bg-surfaceHover transition-colors border border-border text-sm font-medium">Cancel</button>
                     <button @click="confirmDelete"
                        class="px-6 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 text-sm">Delete
                        Forever</button>
                  </div>
               </div>
            </div>
         </Teleport>

      </div>
   </div>
</template>

<style>
.app-region-drag {
   -webkit-app-region: drag;
}

.app-region-no-drag {
   -webkit-app-region: no-drag;
}

.scale-up-center {
   animation: scale-up-center 0.15s cubic-bezier(0.390, 0.575, 0.565, 1.000) both;
}

@keyframes scale-up-center {
   0% {
      transform: scale(0.95);
      opacity: 0;
   }

   100% {
      transform: scale(1);
      opacity: 1;
   }
}

/* Custom scrollbar for reference list */
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
