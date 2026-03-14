<script setup lang="ts">
import { ref } from 'vue';
import { Settings, Image as ImageIcon, GitBranch, Layers, Type, Search, Loader2, Info, X, Upload } from 'lucide-vue-next';
import CanvasSelection, { CropData } from './components/CanvasSelection.vue';
import HistoryGraph from './components/HistoryGraph.vue';
import { useAppStore } from './stores/appStore';
import { generateImage, GenerationParams } from './services/geminiService';

const activeTab = ref('generation');
const store = useAppStore();

const prompt = ref('');
const model = ref<'gemini-3-pro-image-preview' | 'gemini-3.1-flash-image-preview'>('gemini-3-pro-image-preview');
const isAutoRatio = ref(true);
const aspectRatio = ref<'16:9'|'1:1'|'9:16'|'4:3'|'3:4'>('16:9');
const resolution = ref<'1K'|'2K'|'4K'>('2K');
const isGenerating = ref(false);
const errorMsg = ref('');
const useSearchGrounding = ref(false);

async function onGenerate() {
  if (!prompt.value) return;
  isGenerating.value = true;
  errorMsg.value = '';
  
  try {
    const params: GenerationParams = {
      apiKey: store.apiKey,
      prompt: prompt.value,
      model: model.value,
      aspectRatio: aspectRatio.value,
      resolution: resolution.value,
      referenceImages: store.referenceImages,
      useSearchGrounding: useSearchGrounding.value
    };
    
    const resultBase64 = await generateImage(params);
    
    // If we have an active crop composite data, we should combine the returned base64 with the original image
    let finalBase64 = resultBase64;

    if (activeCropData.value && activeImageNode()) {
       finalBase64 = await compositeImage(activeImageNode()!.blobBase64, resultBase64, activeCropData.value);
       // Clear crop data after use
       activeCropData.value = null;
    }
    
    store.addNode({
      id: Date.now().toString(),
      parentId: store.activeNodeId,
      blobBase64: finalBase64,
      prompt: prompt.value,
      model: model.value,
      createdAt: Date.now()
    });
    
  } catch (e: any) {
    console.error(e);
    errorMsg.value = e.message || 'Generation failed';
  } finally {
    isGenerating.value = false;
  }
}

const activeImageNode = () => store.nodes.find(n => n.id === store.activeNodeId);

const activeCropData = ref<CropData | null>(null);

function handleCrop(data: CropData) {
  store.addReferenceImage(data.base64);
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
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-background text-textMain overflow-hidden select-none">
    <header class="h-8 bg-surface border-b border-border flex items-center justify-between px-4 app-region-drag">
      <div class="text-xs font-semibold tracking-widest text-textMuted">BOLDBRUSH <span class="text-primary">SUPERPOWER</span></div>
      <div class="flex items-center gap-2 app-region-no-drag">
         <span class="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded cursor-pointer transition-colors hover:bg-primary/40">node info</span>
      </div>
    </header>

    <div class="flex flex-1 overflow-hidden">
      <aside class="w-14 bg-surface border-r border-border flex flex-col items-center py-4 gap-4">
        <button class="p-2 rounded-lg hover:bg-surfaceHover transition-colors" :class="{ 'text-primary': activeTab === 'generation' }" @click="activeTab = 'generation'" title="Generation">
           <ImageIcon :size="20"/>
        </button>
        <button class="p-2 rounded-lg hover:bg-surfaceHover transition-colors" :class="{ 'text-primary': activeTab === 'history' }" @click="activeTab = 'history'" title="Graph History">
           <GitBranch :size="20"/>
        </button>
        <button class="p-2 rounded-lg hover:bg-surfaceHover transition-colors" :class="{ 'text-primary': activeTab === 'tools' }" @click="activeTab = 'tools'" title="Tools & Layers">
           <Layers :size="20"/>
        </button>
        <div class="flex-1"></div>
        <button class="p-2 rounded-lg hover:bg-surfaceHover transition-colors text-textMuted" :class="{ 'text-primary': activeTab === 'settings' }" @click="activeTab = 'settings'" title="Settings">
           <Settings :size="20"/>
        </button>
      </aside>

      <main class="flex-1 relative bg-[#111] overflow-hidden flex flex-col">
        <div class="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-surface/80 backdrop-blur-md px-4 py-2 rounded-full border border-border flex items-center gap-4 text-sm shadow-xl tooltip-container">
           <span class="text-textMuted text-xs">Zoom: 100%</span>
           <div class="w-px h-4 bg-border"></div>
           <button class="hover:text-primary transition-colors flex items-center gap-1 text-xs" :class="{'text-primary': useSearchGrounding}" @click="useSearchGrounding = !useSearchGrounding" title="Enable Google Search Grounding to let the AI fetch realtime data for prompt accuracy.">
              <Search :size="12" /> Search Grounding <Info :size="10" class="opacity-50 inline-block"/>
           </button>
        </div>

        <div class="flex-1 flex overflow-hidden p-8" :class="{'items-center justify-center': activeTab === 'generation'}">
            <!-- GENERATION VIEW -->
            <template v-if="activeTab === 'generation'">
              <template v-if="activeImageNode()">
                 <CanvasSelection 
                    :imageSrc="activeImageNode()!.blobBase64" 
                    :targetRatio="isAutoRatio ? 'auto' : aspectRatio" 
                    @cropped="handleCrop" 
                    @update:ratio="r => aspectRatio = r"
                 />
              </template>
              <template v-else-if="!isGenerating">
                <div class="w-full h-full border border-dashed border-border hover:border-primary transition-colors cursor-pointer rounded-xl flex items-center justify-center text-textMuted flex-col gap-2 relative" @click="triggerUpload">
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
               <HistoryGraph 
                  :nodes="store.nodes" 
                  :activeNodeId="store.activeNodeId" 
                  @select="id => { store.setActiveNode(id); activeTab='generation'; }"
               />
            </template>
            <!-- TOOLS / METADATA VIEW -->
            <template v-else-if="activeTab === 'tools'">
               <div class="w-full h-full flex flex-col gap-6 max-w-2xl mx-auto pt-8">
                 <h2 class="text-2xl font-semibold mb-4 text-textMain border-b border-border pb-2">Node Inspector</h2>
                 <template v-if="activeImageNode()">
                   <div class="bg-surface border border-border rounded p-4 flex flex-col gap-4">
                      <div>
                         <label class="text-xs text-textMuted uppercase tracking-wider font-semibold">Node ID</label>
                         <p class="text-sm font-mono mt-1">{{ activeImageNode()?.id }}</p>
                      </div>
                      <div>
                         <label class="text-xs text-textMuted uppercase tracking-wider font-semibold">Model Used</label>
                         <p class="text-sm text-primary mt-1">{{ activeImageNode()?.model }}</p>
                      </div>
                      <div>
                         <label class="text-xs text-textMuted uppercase tracking-wider font-semibold">Generated At</label>
                         <p class="text-sm mt-1">{{ new Date(activeImageNode()?.createdAt || 0).toLocaleString() }}</p>
                      </div>
                      <div>
                         <label class="text-xs text-textMuted uppercase tracking-wider font-semibold">Prompt</label>
                         <div class="text-sm mt-1 bg-background p-3 rounded border border-border whitespace-pre-wrap">
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
                 <h2 class="text-2xl font-semibold mb-4 text-textMain border-b border-border pb-2">Application Settings</h2>
                 <div class="flex flex-col gap-2">
                    <label class="text-xs text-textMuted uppercase tracking-wider font-semibold">Gemini API Key</label>
                    <input type="password" spellcheck="false"
                           :value="store.apiKey" 
                           @input="(e) => store.setApiKey((e.target as HTMLInputElement).value)" 
                           class="bg-background border border-border focus:border-primary rounded p-3 focus:outline-none transition-colors" 
                           placeholder="AIzaSy..." />
                    <p class="text-xs text-textMuted mt-1">Required to generate and modify images with Nano Banana 2 and Pro models.</p>
                 </div>
               </div>
            </template>
        </div>
      </main>

      <aside class="w-80 bg-surface border-l border-border flex flex-col relative">
        <div v-if="errorMsg" class="absolute top-0 left-0 w-full bg-red-900/40 text-red-200 text-xs p-2 z-50 break-words border-b border-red-500/50">
          {{ errorMsg }}
          <button @click="errorMsg = ''" class="float-right font-bold ml-2 cursor-pointer text-red-100 hover:text-white">&times;</button>
        </div>
        
        <div class="p-4 border-b border-border font-medium text-sm flex items-center gap-2">
           <Type :size="16" class="text-primary"/> Prompt Engine
        </div>
        
        <div class="p-4 flex flex-col gap-4 flex-1 overflow-y-auto">
           <div class="flex flex-col gap-2">
             <label class="text-xs text-textMuted font-medium uppercase tracking-wider">Models</label>
             <select v-model="model" class="bg-background border border-border rounded p-2 text-sm focus:outline-none focus:border-primary">
                <option value="gemini-3-pro-image-preview">Nano Banana Pro (3.0 Pro)</option>
                <option value="gemini-3.1-flash-image-preview">Nano Banana 2 (3.1 Flash)</option>
             </select>
           </div>

           <div class="flex flex-col gap-2">
             <label class="text-xs text-textMuted font-medium uppercase tracking-wider">Aspect Ratio</label>
             <div class="grid grid-cols-3 gap-1">
                <button @click="isAutoRatio = !isAutoRatio" class="bg-background border border-border rounded py-1 text-xs transition-colors" :class="{'border-primary text-[#000] bg-primary font-bold': isAutoRatio}">Auto Snap</button>
                <button @click="aspectRatio = '16:9'; isAutoRatio = false" class="bg-background border border-border rounded py-1 text-xs transition-colors" :class="{'border-primary text-primary': aspectRatio === '16:9' && !isAutoRatio, 'text-primary/50': aspectRatio === '16:9' && isAutoRatio}">16:9</button>
                <button @click="aspectRatio = '4:3'; isAutoRatio = false" class="bg-background border border-border rounded py-1 text-xs transition-colors" :class="{'border-primary text-primary': aspectRatio === '4:3' && !isAutoRatio, 'text-primary/50': aspectRatio === '4:3' && isAutoRatio}">4:3</button>
                <button @click="aspectRatio = '1:1'; isAutoRatio = false" class="bg-background border border-border rounded py-1 text-xs transition-colors" :class="{'border-primary text-primary': aspectRatio === '1:1' && !isAutoRatio, 'text-primary/50': aspectRatio === '1:1' && isAutoRatio}">1:1</button>
                <button @click="aspectRatio = '3:4'; isAutoRatio = false" class="bg-background border border-border rounded py-1 text-xs transition-colors" :class="{'border-primary text-primary': aspectRatio === '3:4' && !isAutoRatio, 'text-primary/50': aspectRatio === '3:4' && isAutoRatio}">3:4</button>
                <button @click="aspectRatio = '9:16'; isAutoRatio = false" class="bg-background border border-border rounded py-1 text-xs transition-colors" :class="{'border-primary text-primary': aspectRatio === '9:16' && !isAutoRatio, 'text-primary/50': aspectRatio === '9:16' && isAutoRatio}">9:16</button>
             </div>
           </div>
           
           <div class="flex flex-col gap-2">
             <label class="text-xs text-textMuted font-medium uppercase tracking-wider">Resolution</label>
             <div class="grid grid-cols-3 gap-2">
                <button @click="resolution = '1K'" class="bg-background border border-border rounded py-1 text-xs transition-colors" :class="{'border-primary text-primary': resolution === '1K'}">1K</button>
                <button @click="resolution = '2K'" class="bg-background border border-border rounded py-1 text-xs transition-colors" :class="{'border-primary text-primary': resolution === '2K'}">2K</button>
                <button @click="resolution = '4K'" class="bg-background border border-border rounded py-1 text-xs transition-colors" :class="{'border-primary text-primary': resolution === '4K'}">4K</button>
             </div>
           </div>

           <div class="flex flex-col gap-2">
             <div class="flex items-center justify-between">
                <label class="text-xs text-textMuted font-medium uppercase tracking-wider">Reference Limits ({{ store.referenceImages.length }}/14)</label>
                <button @click="triggerRefUpload" class="text-xs bg-surfaceHover hover:bg-primary/20 hover:text-primary transition-colors px-2 py-1 rounded border border-border flex items-center gap-1" title="Upload Reference Image">
                   <Upload :size="12" /> Add
                </button>
                <input type="file" ref="refFileInput" class="hidden" accept="image/*" @change="onRefFileSelected" />
             </div>
             <div v-if="store.referenceImages.length > 0" class="flex gap-2 overflow-x-auto pb-2 custom-scroll">
                <div v-for="(img, idx) in store.referenceImages" :key="idx" class="relative shrink-0 w-16 h-16 rounded border border-border group">
                   <img :src="img" class="w-full h-full object-cover rounded opacity-80" />
                   <button @click="store.removeReferenceImage(idx)" class="absolute -top-2 -right-2 bg-surface hover:bg-red-500/20 text-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X :size="12" />
                   </button>
                </div>
             </div>
             <div v-else class="text-xs text-textMuted/50 italic border border-dashed border-border rounded p-4 text-center">
                Draw selection rect on canvas to add reference image.
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
           <button @click="onGenerate" :disabled="isGenerating" class="w-full bg-primary hover:bg-primaryHover text-[#000] font-semibold py-3 flex justify-center items-center gap-2 rounded shadow-[0_0_15px_rgba(250,204,21,0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
               <Loader2 v-if="isGenerating" :size="20" class="animate-spin" />
               {{ isGenerating ? 'Generating...' : 'Generate Art' }}
           </button>
        </div>
      </aside>
    </div>
  </div>
</template>

<style>
.app-region-drag { -webkit-app-region: drag; }
.app-region-no-drag { -webkit-app-region: no-drag; }
</style>
