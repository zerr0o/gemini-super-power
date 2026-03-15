<script setup lang="ts">
import { nextTick, ref } from 'vue';
import { Settings, Image as ImageIcon, GitBranch, Layers, X, FolderOpen, Plus, Pencil, Trash2 } from 'lucide-vue-next';
import GenerationView from './views/GenerationView.vue';
import HistoryGraph from './components/HistoryGraph.vue';
import NodeInspector from './components/NodeInspector.vue';
import { useAppStore } from './stores/appStore';

type AppTab = 'generation' | 'history' | 'tools' | 'settings';

const activeTab = ref<AppTab>('generation');
const store = useAppStore();

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

         <GenerationView
            :is-active="activeTab === 'generation'"
            :is-shortcut-suspended="showRenameModal || showDeleteModal" />

         <main v-if="activeTab !== 'generation'" class="flex-1 relative bg-[#111] overflow-hidden flex flex-col">
            <div class="flex-1 flex overflow-hidden p-8">
               <template v-if="activeTab === 'history'">
                  <HistoryGraph :nodes="store.nodes" :activeNodeId="store.activeNodeId"
                     @select="id => { store.setActiveNode(id); activeTab = 'generation'; }" />
               </template>
               <template v-else-if="activeTab === 'tools'">
                  <NodeInspector />
               </template>

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
</style>
