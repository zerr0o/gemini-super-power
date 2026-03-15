<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import { Brush, Layers } from 'lucide-vue-next';
import LayerMaskStudio from './LayerMaskStudio.vue';
import { useAppStore } from '../stores/appStore';
import { buildBranchLayerStack } from '../services/layerExport';

const store = useAppStore();

const activeImageNode = computed(() => store.nodes.find(node => node.id === store.activeNodeId) || null);
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
</script>

<template>
  <div class="w-full h-full min-h-0 overflow-y-auto pr-2 pb-8 flex flex-col gap-6 max-w-6xl mx-auto pt-8">
    <div class="flex items-end justify-between gap-6 border-b border-border pb-4">
      <div>
        <h2 class="text-2xl font-semibold text-textMain">Layer Mask Studio</h2>
        <p class="text-sm text-textMuted mt-1">Edit saved layer masks from the active branch in a dedicated workspace.</p>
      </div>

      <div v-if="stackSummary" class="flex items-center gap-3 text-sm text-textMuted">
        <div class="rounded-xl border border-border bg-background/60 px-3 py-2 flex items-center gap-2">
          <Layers :size="14" class="text-primary" />
          {{ stackSummary.layers.length }} layers
        </div>
        <div class="rounded-xl border border-border bg-background/60 px-3 py-2 flex items-center gap-2">
          <Brush :size="14" class="text-primary" />
          {{ workspaceName }}
        </div>
      </div>
    </div>

    <template v-if="activeImageNode && stackSummary">
      <LayerMaskStudio
        :stack="stackSummary"
        :active-node-id="store.activeNodeId" />
    </template>

    <div v-else class="rounded-2xl border border-dashed border-border bg-surface/40 p-8 text-center text-textMuted">
      Select an image node with a branch to start editing masks.
    </div>
  </div>
</template>
