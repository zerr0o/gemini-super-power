<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { Brush, Check, Download, Loader2, Settings, Image as ImageIcon, GitBranch, Layers, X, FolderOpen, Plus, Pencil, Trash2 } from 'lucide-vue-next';
import GenerationView from './views/GenerationView.vue';
import HistoryGraph from './components/HistoryGraph.vue';
import NodeInspector from './components/NodeInspector.vue';
import LayerMaskWorkspace from './components/LayerMaskWorkspace.vue';
import { useAppStore } from './stores/appStore';
import { buildBranchLayerStack, buildBranchPsdExport, buildLayerExportBundle, saveBranchPsdExport, saveLayerExportBundle } from './services/layerExport';

type AppTab = 'generation' | 'history' | 'tools' | 'masks' | 'settings';

const activeTab = ref<AppTab>('generation');
const store = useAppStore();

const showRenameModal = ref(false);
const renameInput = ref('');
const renameInputEl = ref<HTMLInputElement | null>(null);
const showDeleteModal = ref(false);
const quickExportState = ref<'idle' | 'saving' | 'saved' | 'error'>('idle');
let quickExportResetTimer: ReturnType<typeof setTimeout> | null = null;

type AppUpdateStatus = 'unsupported' | 'disabled' | 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'up-to-date' | 'error';

interface AppUpdateState {
   enabled: boolean;
   status: AppUpdateStatus;
   currentVersion: string;
   availableVersion: string | null;
   progress: number | null;
   message: string;
   feedUrl: string | null;
}

const activeImageNode = computed(() => store.nodes.find(node => node.id === store.activeNodeId) || null);
const appUpdateState = ref<AppUpdateState>({
   enabled: false,
   status: 'disabled',
   currentVersion: '0.0.0',
   availableVersion: null,
   progress: null,
   message: 'Auto update status unavailable.',
   feedUrl: null,
});
const isCheckingForUpdates = computed(() =>
   appUpdateState.value.status === 'checking' || appUpdateState.value.status === 'downloading'
);
const canCheckForUpdates = computed(() =>
   !!window.ipcRenderer?.invoke && !isCheckingForUpdates.value
);
const canInstallUpdate = computed(() =>
   !!window.ipcRenderer?.invoke && appUpdateState.value.status === 'downloaded'
);
const updateStatusLabel = computed(() => {
   switch (appUpdateState.value.status) {
      case 'unsupported': return 'Dev Only';
      case 'disabled': return 'Disabled';
      case 'idle': return 'Ready';
      case 'checking': return 'Checking';
      case 'available': return 'Found';
      case 'downloading': return 'Downloading';
      case 'downloaded': return 'Ready To Install';
      case 'up-to-date': return 'Up To Date';
      case 'error': return 'Error';
      default: return 'Unknown';
   }
});
const updateStatusClass = computed(() => {
   switch (appUpdateState.value.status) {
      case 'downloaded':
         return 'border-green-400/35 bg-green-400/10 text-green-300';
      case 'up-to-date':
         return 'border-emerald-400/35 bg-emerald-400/10 text-emerald-300';
      case 'checking':
      case 'downloading':
      case 'available':
         return 'border-primary/35 bg-primary/10 text-primary';
      case 'error':
         return 'border-red-400/35 bg-red-400/10 text-red-300';
      case 'disabled':
      case 'unsupported':
         return 'border-border bg-background/60 text-textMuted';
      default:
         return 'border-border bg-background/60 text-textMain';
   }
});

function sanitizeFileNameSegment(value: string | null | undefined, fallback: string) {
   const sanitized = (value || '')
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 48);

   return sanitized || fallback;
}

function buildQuickExportFileName() {
   const workspaceName = sanitizeFileNameSegment(store.activeWorkspace?.name, 'workspace');
   const promptName = sanitizeFileNameSegment(activeImageNode.value?.prompt, 'image');
   return `${workspaceName}-${promptName}.png`;
}

function triggerBrowserDownload(fileName: string, dataUrl: string) {
   const link = document.createElement('a');
   link.href = dataUrl;
   link.download = fileName;
   document.body.appendChild(link);
   link.click();
   document.body.removeChild(link);
}

async function exportActiveNodePng() {
   const node = activeImageNode.value;
   if (!node) return;

   quickExportState.value = 'saving';
   const fileName = buildQuickExportFileName();

   try {
      const stack = await buildBranchLayerStack(store.nodes, store.activeNodeId, store.activeWorkspace?.name || 'workspace');
      const dataUrl = stack.finalCompositeDataUrl || node.finalResultBase64 || node.blobBase64 || '';
      if (!dataUrl) {
         quickExportState.value = 'error';
         return;
      }

      const savedPath = await window.ipcRenderer?.invoke('desktop:save-file', {
         title: 'Export Current PNG',
         defaultPath: fileName,
         filters: [{ name: 'PNG Image', extensions: ['png'] }],
         contents: dataUrl,
         encoding: 'data-url',
      });

      if (!savedPath && !window.ipcRenderer) {
         triggerBrowserDownload(fileName, dataUrl);
      }

      if (savedPath === null) {
         quickExportState.value = 'idle';
         return;
      }

      quickExportState.value = 'saved';
   } catch {
      quickExportState.value = 'error';
   }

   if (quickExportResetTimer) {
      clearTimeout(quickExportResetTimer);
   }

   quickExportResetTimer = setTimeout(() => {
      quickExportState.value = 'idle';
   }, 1800);
}

const psdExportState = ref<'idle' | 'saving' | 'saved' | 'error'>('idle');
const layerExportState = ref<'idle' | 'saving' | 'saved' | 'error'>('idle');

async function exportPsd() {
   if (!activeImageNode.value) return;
   psdExportState.value = 'saving';
   try {
      const psd = await buildBranchPsdExport(store.nodes, store.activeNodeId, store.activeWorkspace?.name || 'workspace');
      await saveBranchPsdExport(psd);
      psdExportState.value = 'saved';
   } catch {
      psdExportState.value = 'error';
   }
   setTimeout(() => { psdExportState.value = 'idle'; }, 1800);
}

async function exportLayerPackage() {
   if (!activeImageNode.value) return;
   layerExportState.value = 'saving';
   try {
      const bundle = await buildLayerExportBundle(store.nodes, store.activeNodeId, store.activeWorkspace?.name || 'workspace');
      await saveLayerExportBundle(bundle);
      layerExportState.value = 'saved';
   } catch {
      layerExportState.value = 'error';
   }
   setTimeout(() => { layerExportState.value = 'idle'; }, 1800);
}

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

async function refreshAppUpdateState() {
   if (!window.ipcRenderer?.invoke) return;
   const nextState = await window.ipcRenderer.invoke('app-updater:get-state');
   if (nextState) {
      appUpdateState.value = nextState as AppUpdateState;
   }
}

async function checkForAppUpdates() {
   if (!window.ipcRenderer?.invoke || isCheckingForUpdates.value) return;
   const nextState = await window.ipcRenderer.invoke('app-updater:check');
   if (nextState) {
      appUpdateState.value = nextState as AppUpdateState;
   }
}

async function installDownloadedUpdate() {
   if (!window.ipcRenderer?.invoke || !canInstallUpdate.value) return;
   await window.ipcRenderer.invoke('app-updater:install');
}

function formatUpdateProgress(progress: number | null) {
   if (typeof progress !== 'number' || !Number.isFinite(progress)) return '--';
   return `${Math.round(progress)}%`;
}

onMounted(() => {
   if (!window.ipcRenderer?.invoke) {
      appUpdateState.value = {
         enabled: false,
         status: 'unsupported',
         currentVersion: 'dev',
         availableVersion: null,
         progress: null,
         message: 'Auto updates are available only inside the Electron desktop app.',
         feedUrl: null,
      };
      return;
   }

   void refreshAppUpdateState();
   window.ipcRenderer.on('app-updater:state', (_event, nextState) => {
      appUpdateState.value = nextState as AppUpdateState;
   });
});
</script>

<template>
   <div class="h-screen w-screen flex flex-col bg-background text-textMain overflow-hidden relative">

      <Transition name="splash-fade">
        <div
          v-if="!store.isHydrated"
          class="fixed inset-0 z-[2000] bg-background flex flex-col items-center justify-center gap-6 select-none">
          <h1 class="text-4xl font-black tracking-[0.25em] uppercase">
            <span class="text-white">GEMINI</span>
            <span class="text-primary ml-2">SUPER POWER</span>
          </h1>
          <div class="splash-spinner"></div>
          <p class="text-xs text-textMuted tracking-widest uppercase animate-pulse">Loading workspace...</p>
        </div>
      </Transition>

      <header
         class="h-10 bg-surface border-b border-border flex items-center justify-between px-4 app-region-drag select-none shrink-0">
         <div class="flex items-center gap-4">
            <div class="text-[10px] font-bold tracking-[0.2em] text-textMuted flex items-center">
               GEMINI <span class="text-primary ml-1">SUPER POWER</span>
            </div>
            <div class="w-px h-4 bg-border"></div>

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

         <div data-tour="export" class="flex items-center gap-1.5 app-region-no-drag">
            <button
               class="h-7 px-2.5 rounded-lg border text-[10px] uppercase tracking-[0.16em] transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-default"
               :class="quickExportState === 'saved'
                  ? 'border-green-400/40 bg-green-400/15 text-green-300'
                  : quickExportState === 'error'
                     ? 'border-red-400/40 bg-red-400/15 text-red-300'
                     : 'border-border bg-primary/10 text-primary hover:bg-primary/20'"
               :disabled="!activeImageNode || quickExportState === 'saving'"
               @click="exportActiveNodePng"
               title="Export the active image as a PNG">
               <Check v-if="quickExportState === 'saved'" :size="12" />
               <Download v-else :size="12" />
               {{ quickExportState === 'saving' ? 'Exporting' : quickExportState === 'saved' ? 'Saved' : quickExportState === 'error' ? 'Retry' : 'PNG' }}
            </button>
            <button
               class="h-7 px-2.5 rounded-lg border text-[10px] uppercase tracking-[0.16em] transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-default"
               :class="psdExportState === 'saved'
                  ? 'border-green-400/40 bg-green-400/15 text-green-300'
                  : psdExportState === 'error'
                     ? 'border-red-400/40 bg-red-400/15 text-red-300'
                     : 'border-border text-textMuted hover:bg-primary/10 hover:text-primary'"
               :disabled="!activeImageNode || psdExportState === 'saving'"
               @click="exportPsd"
               title="Export as layered PSD">
               <Check v-if="psdExportState === 'saved'" :size="12" />
               <Loader2 v-else-if="psdExportState === 'saving'" :size="12" class="animate-spin" />
               <Layers v-else :size="12" />
               {{ psdExportState === 'saving' ? '...' : psdExportState === 'saved' ? 'Saved' : psdExportState === 'error' ? 'Retry' : 'PSD' }}
            </button>
            <button
               class="h-7 px-2.5 rounded-lg border text-[10px] uppercase tracking-[0.16em] transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-default"
               :class="layerExportState === 'saved'
                  ? 'border-green-400/40 bg-green-400/15 text-green-300'
                  : layerExportState === 'error'
                     ? 'border-red-400/40 bg-red-400/15 text-red-300'
                     : 'border-border text-textMuted hover:bg-primary/10 hover:text-primary'"
               :disabled="!activeImageNode || layerExportState === 'saving'"
               @click="exportLayerPackage"
               title="Export layer package folder">
               <Check v-if="layerExportState === 'saved'" :size="12" />
               <Loader2 v-else-if="layerExportState === 'saving'" :size="12" class="animate-spin" />
               <FolderOpen v-else :size="12" />
               {{ layerExportState === 'saving' ? '...' : layerExportState === 'saved' ? 'Saved' : layerExportState === 'error' ? 'Retry' : 'Layers' }}
            </button>
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
            <button class="p-2 rounded-lg hover:bg-surfaceHover transition-colors"
               :class="{ 'text-primary': activeTab === 'masks' }" @click="activeTab = 'masks'" title="Layer Mask Studio">
               <Brush :size="20" />
            </button>
            <div class="flex-1"></div>
            <button class="p-2 rounded-lg hover:bg-surfaceHover transition-colors text-textMuted"
               :class="{ 'text-primary': activeTab === 'settings' }" @click="activeTab = 'settings'" title="Settings">
               <Settings :size="20" />
            </button>
         </aside>

         <GenerationView
            :is-active="activeTab === 'generation'"
            :is-shortcut-suspended="showRenameModal || showDeleteModal" />

         <main v-show="activeTab === 'history'" class="flex-1 relative bg-[#111] overflow-hidden flex flex-col">
            <div class="flex-1 flex overflow-hidden p-8">
               <HistoryGraph :nodes="store.nodes" :activeNodeId="store.activeNodeId"
                  @select="id => { store.setActiveNode(id); activeTab = 'generation'; }" />
            </div>
         </main>

         <main v-show="activeTab === 'tools'" class="flex-1 relative bg-[#111] overflow-hidden flex flex-col">
            <div class="flex-1 flex overflow-hidden p-8">
               <NodeInspector />
            </div>
         </main>

         <main v-show="activeTab === 'masks'" class="flex-1 relative bg-[#111] overflow-hidden flex flex-col">
            <div class="flex-1 flex overflow-hidden p-8">
               <LayerMaskWorkspace />
            </div>
         </main>

         <main v-if="activeTab === 'settings'" class="flex-1 relative bg-[#111] overflow-hidden flex flex-col">
            <div class="flex-1 flex overflow-hidden p-8">
               <template v-if="activeTab === 'settings'">
                  <div class="w-full h-full flex flex-col gap-6 max-w-2xl mx-auto pt-8">
                     <h2 class="text-2xl font-semibold mb-4 text-textMain border-b border-border pb-2">Application
                        Settings</h2>
                     <div class="flex flex-col gap-2">
                        <label class="text-xs text-textMuted uppercase tracking-wider font-semibold">Gemini API
                           Key</label>
                        <input data-tour="api-key" type="password" spellcheck="false" :value="store.apiKey"
                           @input="(e) => store.setApiKey((e.target as HTMLInputElement).value)"
                           class="bg-background border border-border focus:border-primary rounded p-3 focus:outline-none transition-colors"
                           placeholder="AIzaSy..." />
                        <p class="text-xs text-textMuted mt-1">Required to generate and modify images with Nano Banana 2
                           and Pro models.</p>
                        <div class="mt-3 rounded-xl border border-border bg-surface p-4 text-sm text-textMuted flex flex-col gap-3">
                           <div>
                              <p class="text-xs uppercase tracking-[0.2em] text-textMuted font-semibold">How to create a Google AI Studio key</p>
                              <ol class="mt-2 leading-relaxed flex flex-col gap-1 list-decimal list-inside">
                                 <li>
                                    Open
                                    <a href="https://aistudio.google.com/app/api-keys" target="_blank" rel="noreferrer"
                                       class="text-primary hover:underline">Google AI Studio API Keys</a>.
                                 </li>
                                 <li>Sign in with your Google account.</li>
                                 <li>Click <span class="text-textMain font-medium">Create API key</span>.</li>
                                 <li>Copy the generated key and paste it into the field above.</li>
                              </ol>
                           </div>
                           <p class="text-xs text-textMuted/80">
                              Keep this key private. Anyone with it can use your Google AI quota.
                           </p>
                        </div>
                     </div>

                     <div class="flex flex-col gap-2">
                        <label class="text-xs text-textMuted uppercase tracking-wider font-semibold">Application Updates</label>
                        <div class="rounded-xl border border-border bg-surface p-4 flex flex-col gap-4">
                           <div class="flex items-start justify-between gap-4">
                              <div class="min-w-0">
                                 <p class="text-sm font-semibold text-textMain">Gemini Super Power {{ appUpdateState.currentVersion }}</p>
                                 <p class="mt-1 text-xs text-textMuted leading-relaxed">{{ appUpdateState.message }}</p>
                              </div>
                              <span
                                 class="shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium"
                                 :class="updateStatusClass">
                                 {{ updateStatusLabel }}
                              </span>
                           </div>

                           <div class="grid grid-cols-2 gap-3 text-xs">
                              <div class="rounded-lg border border-white/8 bg-background/50 px-3 py-2">
                                 <p class="text-textMuted uppercase tracking-[0.16em]">Target Version</p>
                                 <p class="mt-1 text-textMain">{{ appUpdateState.availableVersion || '--' }}</p>
                              </div>
                              <div class="rounded-lg border border-white/8 bg-background/50 px-3 py-2">
                                 <p class="text-textMuted uppercase tracking-[0.16em]">Feed</p>
                                 <p class="mt-1 text-textMain truncate" :title="appUpdateState.feedUrl || ''">{{ appUpdateState.feedUrl || 'GitHub Releases' }}</p>
                              </div>
                           </div>

                           <div
                              v-if="appUpdateState.status === 'downloading' || appUpdateState.status === 'downloaded'"
                              class="rounded-lg border border-white/8 bg-background/50 p-3 flex flex-col gap-2">
                              <div class="flex items-center justify-between text-xs text-textMuted">
                                 <span>Download Progress</span>
                                 <span>{{ formatUpdateProgress(appUpdateState.progress) }}</span>
                              </div>
                              <div class="h-2 rounded-full bg-background overflow-hidden">
                                 <div
                                    class="h-full rounded-full bg-primary transition-[width] duration-200"
                                    :style="{ width: `${Math.max(0, Math.min(100, appUpdateState.progress ?? 0))}%` }" />
                              </div>
                           </div>

                           <div class="flex items-center gap-2">
                              <button
                                 @click="checkForAppUpdates"
                                 :disabled="!canCheckForUpdates"
                                 class="px-3 py-2 rounded-xl border text-xs transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                                 :class="canCheckForUpdates
                                    ? 'border-border text-textMuted hover:border-primary hover:text-primary'
                                    : 'border-border text-textMuted/60'">
                                 <Loader2 v-if="isCheckingForUpdates" :size="13" class="animate-spin" />
                                 <Download v-else :size="13" />
                                 Check Now
                              </button>
                              <button
                                 @click="installDownloadedUpdate"
                                 :disabled="!canInstallUpdate"
                                 class="px-3 py-2 rounded-xl border text-xs transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                                 :class="canInstallUpdate
                                    ? 'border-primary bg-primary/10 text-primary hover:bg-primary/20'
                                    : 'border-border text-textMuted/60'">
                                 <Check :size="13" />
                                 Install & Restart
                              </button>
                           </div>

                           <p class="text-[11px] text-textMuted/80 leading-relaxed">
                              Auto updates check automatically on app launch and download in the background. Releases are configured for <span class="text-textMain">GitHub Releases</span>, so publishing requires a valid <span class="text-textMain">GH_TOKEN</span> and the renamed repository to exist on GitHub.
                           </p>
                        </div>
                     </div>
                  </div>
               </template>
            </div>
         </main>

         <Teleport to="body">
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
                        class="text-text border-b border-border pb-0.5">{{ store.activeWorkspace?.name }}</strong>?
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

.tab-fade-enter-active { transition: opacity 0.12s ease, transform 0.12s ease; }
.tab-fade-leave-active { transition: opacity 0.08s ease; }
.tab-fade-enter-from { opacity: 0; transform: translateY(6px); }
.tab-fade-leave-to { opacity: 0; }

.splash-fade-leave-active { transition: opacity 0.4s ease; }
.splash-fade-leave-to { opacity: 0; }

.splash-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(250, 204, 21, 0.15);
  border-top-color: rgba(250, 204, 21, 0.7);
  border-radius: 50%;
  animation: splash-spin 0.8s linear infinite;
  will-change: transform;
}

@keyframes splash-spin {
  to { transform: rotate(360deg); }
}
</style>
