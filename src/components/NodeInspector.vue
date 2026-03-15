<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import { Check, Copy, Download, Image as ImageIcon, Layers, Link2, Sparkles } from 'lucide-vue-next';
import { useAppStore } from '../stores/appStore';
import type { ImageDimensions } from '../stores/appStore';
import {
  buildBranchLayerStack,
  buildBranchPsdExport,
  buildLayerExportBundle,
  buildNodeLineage,
  saveBranchPsdExport,
  saveLayerExportBundle,
} from '../services/layerExport';
import { formatImageSize, resolveNodeFinalImageSize, resolveNodeGeneratedImageSize } from '../services/imageDimensions';

const store = useAppStore();

const activeImageNode = computed(() => store.nodes.find(node => node.id === store.activeNodeId) || null);
const lineage = computed(() => buildNodeLineage(store.nodes, store.activeNodeId));
const rootNode = computed(() => lineage.value[0] || null);
const parentNode = computed(() => {
  if (!activeImageNode.value?.parentId) return null;
  return store.nodes.find(node => node.id === activeImageNode.value?.parentId) || null;
});
const referenceSnapshots = computed(() => activeImageNode.value?.referenceSnapshots ?? []);

const exportMode = ref<'bundle' | 'psd' | null>(null);
const exportStatus = ref('');
const exportError = ref('');
const generatedImageSize = ref<ImageDimensions | null>(null);
const finalImageSize = ref<ImageDimensions | null>(null);
const promptCopyState = ref<'idle' | 'copied' | 'error'>('idle');
let promptCopyResetTimer: ReturnType<typeof setTimeout> | null = null;

const workspaceName = computed(() => store.activeWorkspace?.name || 'workspace');
const stackSummary = ref<Awaited<ReturnType<typeof buildBranchLayerStack>> | null>(null);

watchEffect(async () => {
  if (!store.activeNodeId) {
    stackSummary.value = null;
    return;
  }

  try {
    stackSummary.value = await buildBranchLayerStack(store.nodes, store.activeNodeId, workspaceName.value);
  } catch {
    stackSummary.value = null;
  }
});

watchEffect(async () => {
  const node = activeImageNode.value;
  if (!node) {
    generatedImageSize.value = null;
    finalImageSize.value = null;
    return;
  }

  generatedImageSize.value = await resolveNodeGeneratedImageSize(node);
  finalImageSize.value = await resolveNodeFinalImageSize(node);
});

function formatDate(value: number) {
  return new Date(value || 0).toLocaleString();
}

function shorten(value: string | null, max = 72) {
  if (!value) return 'None';
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3)}...`;
}

function getReferencePreview(reference: typeof referenceSnapshots.value[number]) {
  if (reference.dataUrl) return reference.dataUrl;
  if (!reference.sourceNodeId) return '';

  const sourceNode = store.nodes.find(node => node.id === reference.sourceNodeId) || null;
  return sourceNode?.finalResultBase64 || sourceNode?.blobBase64 || '';
}

function isLegacyNode() {
  const node = activeImageNode.value;
  if (!node) return false;
  return !!node.parentId && (!node.modificationBox || !node.finalResultBase64);
}

function clearMessages() {
  exportStatus.value = '';
  exportError.value = '';
}

function handleExportFailure(error: unknown) {
  const message = error instanceof Error ? error.message : 'Export failed.';
  if (message.toLowerCase().includes('cancelled')) {
    exportStatus.value = 'Export cancelled.';
    exportError.value = '';
    return;
  }

  exportError.value = message;
}

async function copyPrompt() {
  const prompt = activeImageNode.value?.prompt || '';
  if (!prompt) return;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(prompt);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = prompt;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    promptCopyState.value = 'copied';
  } catch {
    promptCopyState.value = 'error';
  }

  if (promptCopyResetTimer) {
    clearTimeout(promptCopyResetTimer);
  }

  promptCopyResetTimer = setTimeout(() => {
    promptCopyState.value = 'idle';
  }, 1600);
}

async function exportLayerPackage() {
  if (!activeImageNode.value) return;

  exportMode.value = 'bundle';
  clearMessages();

  try {
    const bundle = await buildLayerExportBundle(store.nodes, store.activeNodeId, workspaceName.value);
    const outputPath = await saveLayerExportBundle(bundle);
    exportStatus.value = `Layer package exported to ${outputPath}`;
  } catch (error) {
    handleExportFailure(error);
  } finally {
    exportMode.value = null;
  }
}

async function exportPsd() {
  if (!activeImageNode.value) return;

  exportMode.value = 'psd';
  clearMessages();

  try {
    const psd = await buildBranchPsdExport(store.nodes, store.activeNodeId, workspaceName.value);
    const outputPath = await saveBranchPsdExport(psd);
    exportStatus.value = `PSD exported to ${outputPath}`;
  } catch (error) {
    handleExportFailure(error);
  } finally {
    exportMode.value = null;
  }
}
</script>

<template>
  <div class="node-inspector-scroll w-full h-full min-h-0 overflow-y-auto pr-2 pb-8 flex flex-col gap-6 max-w-6xl mx-auto pt-8">
    <div class="flex items-end justify-between gap-6 border-b border-border pb-4">
      <div>
        <h2 class="text-2xl font-semibold text-textMain">Node Inspector</h2>
        <p class="text-sm text-textMuted mt-1">Inspect the active node, its references, and export the branch as layered assets.</p>
      </div>

      <div v-if="activeImageNode" class="flex flex-wrap gap-2">
        <button
          @click="exportLayerPackage"
          :disabled="exportMode !== null"
          class="px-4 py-2 rounded-xl border border-border bg-surface hover:border-primary hover:text-primary transition-colors text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          <Layers :size="16" />
          {{ exportMode === 'bundle' ? 'Exporting...' : 'Export Layer Package' }}
        </button>
        <button
          @click="exportPsd"
          :disabled="exportMode !== null"
          class="px-4 py-2 rounded-xl bg-primary text-black font-semibold hover:bg-primary/90 transition-colors text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          <Download :size="16" />
          {{ exportMode === 'psd' ? 'Building PSD...' : 'Export PSD' }}
        </button>
      </div>
    </div>

    <template v-if="activeImageNode">
      <div v-if="exportStatus" class="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">
        {{ exportStatus }}
      </div>
      <div v-if="exportError" class="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        {{ exportError }}
      </div>

      <div v-if="isLegacyNode()" class="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        This node predates the richer metadata. Export still works, but some layers may fall back to full-frame snapshots.
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-[1.35fr_0.65fr] gap-6">
        <section class="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-xs uppercase tracking-[0.2em] text-textMuted">Active Branch</p>
              <h3 class="text-lg font-semibold mt-1">{{ workspaceName }}</h3>
            </div>
            <div class="text-right">
              <p class="text-xs uppercase tracking-[0.2em] text-textMuted">Layer Stack</p>
              <p class="text-lg font-semibold">{{ lineage.length }} layers</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="rounded-xl border border-border bg-background/60 overflow-hidden">
              <div class="aspect-[4/3] bg-black flex items-center justify-center">
                <img :src="activeImageNode.finalResultBase64 || activeImageNode.blobBase64" class="w-full h-full object-contain" />
              </div>
              <div class="p-3">
                <p class="text-xs uppercase tracking-[0.2em] text-textMuted">Final Output</p>
                <p class="text-sm mt-1">Current full image</p>
                <p class="text-xs text-textMuted mt-1">{{ formatImageSize(finalImageSize) }}</p>
              </div>
            </div>

            <div class="rounded-xl border border-border bg-background/60 overflow-hidden">
              <div class="aspect-[4/3] bg-black flex items-center justify-center">
                <img
                  v-if="activeImageNode.geminiResultBase64"
                  :src="activeImageNode.geminiResultBase64"
                  class="w-full h-full object-contain" />
                <div v-else class="text-xs text-textMuted px-4 text-center">No raw Gemini patch stored for this node.</div>
              </div>
              <div class="p-3">
                <p class="text-xs uppercase tracking-[0.2em] text-textMuted">Gemini Result</p>
                <p class="text-sm mt-1">Raw model output before compositing</p>
                <p class="text-xs text-textMuted mt-1">{{ formatImageSize(generatedImageSize) }}</p>
              </div>
            </div>

            <div class="rounded-xl border border-border bg-background/60 overflow-hidden">
              <div class="aspect-[4/3] bg-black flex items-center justify-center">
                <img
                  v-if="rootNode"
                  :src="rootNode.finalResultBase64 || rootNode.blobBase64"
                  class="w-full h-full object-contain" />
                <div v-else class="text-xs text-textMuted px-4 text-center">No root node available.</div>
              </div>
              <div class="p-3">
                <p class="text-xs uppercase tracking-[0.2em] text-textMuted">Root Image</p>
                <p class="text-sm mt-1">Base of the exported branch</p>
              </div>
            </div>
          </div>
        </section>

        <section class="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4">
          <div class="flex items-center gap-2 text-textMain">
            <Sparkles :size="16" class="text-primary" />
            <h3 class="font-semibold">Export Summary</h3>
          </div>

          <div class="grid grid-cols-2 gap-3 text-sm">
            <div class="rounded-xl border border-border bg-background/60 p-3">
              <p class="text-xs uppercase tracking-[0.2em] text-textMuted">Document</p>
              <p class="mt-1">{{ stackSummary ? `${stackSummary.documentWidth} x ${stackSummary.documentHeight}` : '...' }}</p>
            </div>
            <div class="rounded-xl border border-border bg-background/60 p-3">
              <p class="text-xs uppercase tracking-[0.2em] text-textMuted">References</p>
              <p class="mt-1">{{ referenceSnapshots.length }}</p>
            </div>
            <div class="rounded-xl border border-border bg-background/60 p-3">
              <p class="text-xs uppercase tracking-[0.2em] text-textMuted">Parent</p>
              <p class="mt-1 font-mono text-xs break-all">{{ parentNode?.id || 'Root node' }}</p>
            </div>
            <div class="rounded-xl border border-border bg-background/60 p-3">
              <p class="text-xs uppercase tracking-[0.2em] text-textMuted">Model</p>
              <p class="mt-1">{{ activeImageNode.model }}</p>
            </div>
          </div>

          <div class="rounded-xl border border-border bg-background/60 p-4 text-sm text-textMuted leading-relaxed">
            The export uses the active branch from root to the selected node. Patch layers keep their saved crop position when possible; legacy nodes fall back to full-frame snapshots.
          </div>
        </section>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section class="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4">
          <div class="flex items-center gap-2">
            <ImageIcon :size="16" class="text-primary" />
            <h3 class="font-semibold">Node Metadata</h3>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-xs uppercase tracking-[0.2em] text-textMuted">Node ID</p>
              <p class="mt-1 font-mono break-all">{{ activeImageNode.id }}</p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-[0.2em] text-textMuted">Generated At</p>
              <p class="mt-1">{{ formatDate(activeImageNode.createdAt) }}</p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-[0.2em] text-textMuted">Source URI</p>
              <p class="mt-1 break-all">{{ activeImageNode.sourceUri || 'None' }}</p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-[0.2em] text-textMuted">Root Node</p>
              <p class="mt-1 font-mono break-all">{{ rootNode?.id || 'None' }}</p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-[0.2em] text-textMuted">Generated Layer Size</p>
              <p class="mt-1">{{ formatImageSize(generatedImageSize) }}</p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-[0.2em] text-textMuted">Final Image Size</p>
              <p class="mt-1">{{ formatImageSize(finalImageSize) }}</p>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between gap-3">
              <p class="text-xs uppercase tracking-[0.2em] text-textMuted">Prompt</p>
              <button
                class="shrink-0 px-2.5 py-1 rounded-lg border border-border bg-background/60 text-[11px] text-textMuted hover:text-primary hover:border-primary transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-default"
                :disabled="!activeImageNode.prompt"
                @click="copyPrompt">
                <Check v-if="promptCopyState === 'copied'" :size="12" class="text-green-300" />
                <Copy v-else :size="12" />
                {{ promptCopyState === 'copied' ? 'Copied' : promptCopyState === 'error' ? 'Retry' : 'Copy' }}
              </button>
            </div>
            <div class="mt-2 rounded-xl border border-border bg-background/60 p-4 whitespace-pre-wrap text-sm leading-relaxed">
              {{ activeImageNode.prompt || 'No prompt recorded.' }}
            </div>
          </div>
        </section>

        <section class="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4">
          <div class="flex items-center gap-2">
            <Layers :size="16" class="text-primary" />
            <h3 class="font-semibold">Modification Box</h3>
          </div>

          <template v-if="activeImageNode.modificationBox">
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div class="rounded-xl border border-border bg-background/60 p-3">
                <p class="text-xs uppercase tracking-[0.2em] text-textMuted">X</p>
                <p class="mt-1">{{ activeImageNode.modificationBox.x }}</p>
              </div>
              <div class="rounded-xl border border-border bg-background/60 p-3">
                <p class="text-xs uppercase tracking-[0.2em] text-textMuted">Y</p>
                <p class="mt-1">{{ activeImageNode.modificationBox.y }}</p>
              </div>
              <div class="rounded-xl border border-border bg-background/60 p-3">
                <p class="text-xs uppercase tracking-[0.2em] text-textMuted">Width</p>
                <p class="mt-1">{{ activeImageNode.modificationBox.w }}</p>
              </div>
              <div class="rounded-xl border border-border bg-background/60 p-3">
                <p class="text-xs uppercase tracking-[0.2em] text-textMuted">Height</p>
                <p class="mt-1">{{ activeImageNode.modificationBox.h }}</p>
              </div>
              <div class="rounded-xl border border-border bg-background/60 p-3">
                <p class="text-xs uppercase tracking-[0.2em] text-textMuted">Original Width</p>
                <p class="mt-1">{{ activeImageNode.modificationBox.originalWidth }}</p>
              </div>
              <div class="rounded-xl border border-border bg-background/60 p-3">
                <p class="text-xs uppercase tracking-[0.2em] text-textMuted">Original Height</p>
                <p class="mt-1">{{ activeImageNode.modificationBox.originalHeight }}</p>
              </div>
            </div>
          </template>
          <div v-else class="rounded-xl border border-dashed border-border bg-background/40 p-4 text-sm text-textMuted">
            No modification box was stored for this node.
          </div>
        </section>
      </div>

      <section class="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4">
        <div class="flex items-center gap-2">
          <Link2 :size="16" class="text-primary" />
          <h3 class="font-semibold">Reference Snapshots</h3>
        </div>

        <div v-if="referenceSnapshots.length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div
            v-for="reference in referenceSnapshots"
            :key="reference.id"
            class="rounded-xl border border-border bg-background/60 overflow-hidden">
            <div class="aspect-[4/3] bg-black flex items-center justify-center">
              <img v-if="getReferencePreview(reference)" :src="getReferencePreview(reference)" class="w-full h-full object-contain" />
              <div v-else class="text-xs text-textMuted px-4 text-center">Preview unavailable.</div>
            </div>
            <div class="p-3 text-sm flex flex-col gap-2">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs uppercase tracking-[0.2em] text-textMuted">{{ reference.kind }}</span>
                <span class="text-[11px] text-primary font-mono">{{ reference.sourceNodeId || 'external' }}</span>
              </div>
              <p class="break-all text-textMuted">{{ shorten(reference.sourceUri) }}</p>
            </div>
          </div>
        </div>
        <div v-else class="rounded-xl border border-dashed border-border bg-background/40 p-4 text-sm text-textMuted">
          No reference snapshots were saved for this node.
        </div>
      </section>
    </template>

    <template v-else>
      <div class="rounded-2xl border border-dashed border-border bg-surface/40 p-8 text-center text-textMuted">
        No image node selected to inspect.
      </div>
    </template>
  </div>
</template>

<style scoped>
.node-inspector-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(250, 204, 21, 0.68) rgba(255, 255, 255, 0.05);
}

.node-inspector-scroll::-webkit-scrollbar {
  width: 10px;
}

.node-inspector-scroll::-webkit-scrollbar-track {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
  border-radius: 999px;
}

.node-inspector-scroll::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(250, 204, 21, 0.88), rgba(245, 158, 11, 0.62));
  border: 2px solid rgba(12, 12, 12, 0.72);
  border-radius: 999px;
}

.node-inspector-scroll::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(253, 224, 71, 0.96), rgba(249, 115, 22, 0.72));
}
</style>
