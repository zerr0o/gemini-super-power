<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import type { ImageNode } from '../stores/appStore';
import { useAppStore } from '../stores/appStore';
import { Trash2 } from 'lucide-vue-next';

// Use the store
const store = useAppStore();

const props = defineProps<{
  nodes: ImageNode[];
  activeNodeId: string | null;
}>();

const emit = defineEmits<{
  (e: 'select', id: string): void;
}>();

const svgContainer = ref<HTMLDivElement | null>(null);

// Pan & Zoom state
const pan = ref({ x: 50, y: 50 });
const zoom = ref(1);
const isPanning = ref(false);
const startPan = ref({ x: 0, y: 0 });

const isDeleteMode = ref(false);
const nodeToDelete = ref<string | null>(null);

function handleNodeClick(nodeId: string) {
  if (isDeleteMode.value) {
     nodeToDelete.value = nodeId;
  } else {
     emit('select', nodeId);
  }
}

function confirmDeleteNode() {
  if (nodeToDelete.value) {
     store.deleteNodeAndChildren(nodeToDelete.value);
  }
  nodeToDelete.value = null;
}

function handleWheel(e: WheelEvent) {
  const zoomFactor = 0.05;
  if (e.deltaY < 0) {
    zoom.value = Math.min(2, zoom.value + zoomFactor);
  } else {
    zoom.value = Math.max(0.2, zoom.value - zoomFactor);
  }
}

function handleMouseDown(e: MouseEvent) {
  isPanning.value = true;
  startPan.value = { x: e.clientX - pan.value.x, y: e.clientY - pan.value.y };
}

function handleMouseMove(e: MouseEvent) {
  if (!isPanning.value) return;
  pan.value = {
    x: e.clientX - startPan.value.x,
    y: e.clientY - startPan.value.y
  };
}

function handleMouseUp() {
  isPanning.value = false;
}

function centerOnNode(nodeId: string) {
  const node = laidOutNodes.value.find(n => n.id === nodeId);
  if (!node || !svgContainer.value) return;
  const rect = svgContainer.value.getBoundingClientRect();
  pan.value = {
    x: (rect.width / 2) - (node.x + 140 / 2) * zoom.value,
    y: (rect.height / 2) - (node.y + 180 / 2) * zoom.value
  };
}

function resetView() {
  if (!svgContainer.value || laidOutNodes.value.length === 0) {
    zoom.value = 1;
    pan.value = { x: 50, y: 50 };
    return;
  }

  const rect = svgContainer.value.getBoundingClientRect();
  const NODE_W = 140;
  const NODE_H = 180;
  const PADDING = 60;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of laidOutNodes.value) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + NODE_W);
    maxY = Math.max(maxY, node.y + NODE_H);
  }

  const graphW = maxX - minX + PADDING * 2;
  const graphH = maxY - minY + PADDING * 2;
  const fitZoom = Math.min(rect.width / graphW, rect.height / graphH, 1);

  zoom.value = Math.max(0.2, fitZoom);
  pan.value = {
    x: (rect.width / 2) - ((minX + maxX) / 2) * zoom.value,
    y: (rect.height / 2) - ((minY + maxY) / 2) * zoom.value,
  };
}

function focusActiveNode() {
  if (props.activeNodeId) centerOnNode(props.activeNodeId);
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  if (e.key === 'r' || e.key === 'R') {
    e.preventDefault();
    resetView();
  } else if (e.key === 'f' || e.key === 'F') {
    e.preventDefault();
    focusActiveNode();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  if (props.nodes.length > 0) {
    nextTick(() => {
      const target = props.activeNodeId || props.nodes[props.nodes.length - 1].id;
      centerOnNode(target);
    });
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

// Layout Calculation
interface LayoutNode extends ImageNode {
  x: number;
  y: number;
}

const nodeStructureKey = computed(() =>
  props.nodes.map(n => `${n.id}:${n.parentId ?? ''}`).join('|')
);

const nodePositions = computed(() => {
  void nodeStructureKey.value;
  const positions = new Map<string, { x: number; y: number }>();
  const childrenMap = new Map<string, string[]>();
  const allIds = new Set<string>();

  for (const n of props.nodes) {
    allIds.add(n.id);
    childrenMap.set(n.id, []);
  }

  const rootIds: string[] = [];
  for (const n of props.nodes) {
    if (n.parentId && allIds.has(n.parentId)) {
      childrenMap.get(n.parentId)!.push(n.id);
    } else {
      rootIds.push(n.id);
    }
  }

  const NODE_W = 140;
  const NODE_H = 180;
  const GAP_X = 40;
  const GAP_Y = 80;

  const subtreeWidth = new Map<string, number>();
  function calcWidth(id: string): number {
    const children = childrenMap.get(id) || [];
    if (children.length === 0) {
      subtreeWidth.set(id, NODE_W);
      return NODE_W;
    }
    let width = 0;
    children.forEach((childId, i) => {
      width += calcWidth(childId);
      if (i < children.length - 1) width += GAP_X;
    });
    const finalWidth = Math.max(NODE_W, width);
    subtreeWidth.set(id, finalWidth);
    return finalWidth;
  }

  rootIds.forEach(r => calcWidth(r));

  let globalStartX = 0;
  function assignPosition(id: string, startX: number, depth: number) {
    const width = subtreeWidth.get(id)!;
    positions.set(id, {
      x: startX + (width / 2) - (NODE_W / 2),
      y: depth * (NODE_H + GAP_Y),
    });

    const children = childrenMap.get(id) || [];
    let childrenTotalWidth = 0;
    children.forEach((childId, i) => {
      childrenTotalWidth += subtreeWidth.get(childId)!;
      if (i < children.length - 1) childrenTotalWidth += GAP_X;
    });

    let childStartX = startX;
    if (childrenTotalWidth < width) childStartX += (width - childrenTotalWidth) / 2;

    children.forEach(childId => {
      assignPosition(childId, childStartX, depth + 1);
      childStartX += subtreeWidth.get(childId)! + GAP_X;
    });
  }

  rootIds.forEach(r => {
    assignPosition(r, globalStartX, 0);
    globalStartX += subtreeWidth.get(r)! + GAP_X;
  });

  return positions;
});

const laidOutNodes = computed(() => {
  const positions = nodePositions.value;
  return props.nodes.map(n => {
    const pos = positions.get(n.id) || { x: 0, y: 0 };
    return { ...n, x: pos.x, y: pos.y } as LayoutNode;
  });
});

const connections = computed(() => {
  const lines: { x1: number, y1: number, x2: number, y2: number }[] = [];
  const posMap = new Map<string, {x: number, y: number}>();
  laidOutNodes.value.forEach(n => posMap.set(n.id, {x: n.x, y: n.y}));
  
  const NODE_W = 140;
  const NODE_H = 180;

  laidOutNodes.value.forEach(n => {
    if (n.parentId && posMap.has(n.parentId)) {
      const parent = posMap.get(n.parentId)!;
      lines.push({
        x1: parent.x + NODE_W / 2,
        y1: parent.y + NODE_H,
        x2: n.x + NODE_W / 2,
        y2: n.y
      });
    }
  });
  return lines;
});

</script>

<template>
  <div data-tour="history" class="relative w-full h-full overflow-hidden bg-background cursor-grab active:cursor-grabbing border border-border/20 rounded-lg shadow-inner bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')]"
       ref="svgContainer"
       @mousedown="handleMouseDown"
       @mousemove="handleMouseMove"
       @mouseup="handleMouseUp"
       @mouseleave="handleMouseUp"
       @wheel.prevent="handleWheel">
       
       <div class="absolute inset-0 origin-top-left will-change-transform"
            :style="{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }">
            
            <svg class="absolute inset-0 overflow-visible pointer-events-none" style="width: 10000px; height: 10000px;">
                <path v-for="(conn, i) in connections" :key="i"
                      :d="`M ${conn.x1} ${conn.y1} C ${conn.x1} ${conn.y1 + 40}, ${conn.x2} ${conn.y2 - 60}, ${conn.x2} ${conn.y2}`"
                      fill="none"
                      stroke="#4B5563"
                      stroke-width="2"
                      stroke-dasharray="4, 4"
                      class="opacity-60" />
            </svg>
            
            <div v-for="node in laidOutNodes" :key="node.id"
                 class="absolute flex flex-col items-center bg-surface border rounded shadow-lg transition-colors cursor-pointer group hover:z-50"
                 :class="{ 
                    'border-primary shadow-[0_0_20px_rgba(250,204,21,0.2)] z-10': activeNodeId === node.id && !isDeleteMode, 
                    'border-border/50 z-0 hover:border-text/50': activeNodeId !== node.id && !isDeleteMode,
                    'border-red-500/50 hover:border-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] z-50': isDeleteMode
                 }"
                 :style="{ left: node.x + 'px', top: node.y + 'px', width: '140px', height: '180px' }"
                 @click.stop="handleNodeClick(node.id)">
                 
                 <div class="h-28 w-full bg-black flex items-center justify-center relative p-1 pointer-events-none rounded-t overflow-hidden">
                    <img :src="node.finalResultThumbnailBase64 || node.finalResultBase64 || node.blobBase64" class="max-w-full max-h-full object-contain rounded-sm" draggable="false" />
                 </div>
                 
                 <!-- Hover Image Popout (zoom-independent size) -->
                 <div
                    class="hidden group-hover:flex absolute z-50 bg-black border border-primary rounded-xl shadow-[0_10px_60px_rgba(0,0,0,1)] items-center justify-center pointer-events-none"
                    :style="{
                      width: `${320 / zoom}px`,
                      height: `${320 / zoom}px`,
                      left: `${(140 - 320 / zoom) / 2}px`,
                      top: `${(180 - 320 / zoom) / 2}px`,
                    }">
                    <img :src="node.finalResultBase64 || node.blobBase64" class="max-w-full max-h-full object-contain rounded-lg p-2" draggable="false" />
                 </div>
                 <div class="flex-1 w-full p-2 flex flex-col gap-1 justify-center bg-surfaceDark border-t border-border/50">
                    <p class="text-[11px] text-text font-medium truncate" :title="node.prompt">{{ node.prompt || 'Base Image' }}</p>
                    <p class="text-[9px] text-textMuted uppercase flex justify-between">
                       <span>{{ node.model.split('-')[0] }}</span>
                       <span v-if="node.parentId" class="text-primary opacity-80">Modified</span>
                       <span v-else class="text-green-400 opacity-80">Root</span>
                    </p>
                 </div>
            </div>
       </div>
       
       <!-- HUD controls -->
       <div class="absolute bottom-4 right-4 flex gap-2 z-40">
          <button @click="isDeleteMode = !isDeleteMode; nodeToDelete = null" 
                  class="border px-3 py-1.5 rounded-md text-xs shadow-lg transition-colors flex items-center gap-2"
                  :class="isDeleteMode ? 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/40' : 'bg-surface border-border text-textMuted hover:text-white'">
            <Trash2 :size="14" />
            <span v-if="isDeleteMode">Delete Mode Active</span>
            <span v-else>Clean Graph</span>
          </button>
          
          <button @click="focusActiveNode" class="bg-surface border border-border text-textMuted px-3 py-1.5 rounded-md text-xs hover:text-white shadow-lg transition-colors flex items-center gap-2" title="Focus active node (F)">
            Focus Active Node
            <kbd class="ml-1 px-1.5 py-0.5 rounded bg-background/60 border border-border/50 text-[10px] text-textMuted">F</kbd>
          </button>
          <button @click="resetView" class="bg-surface border border-border text-textMuted px-3 py-1.5 rounded-md text-xs hover:text-white shadow-lg transition-colors flex items-center gap-2" title="Fit entire graph (R)">
            Reset View
            <kbd class="ml-1 px-1.5 py-0.5 rounded bg-background/60 border border-border/50 text-[10px] text-textMuted">R</kbd>
          </button>
       </div>

       <!-- Node Deletion Modal -->
       <Teleport to="body">
         <div v-if="nodeToDelete" class="fixed inset-0 z-[999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 app-region-no-drag select-text">
           <div class="bg-surface border border-red-500/30 p-6 rounded-xl shadow-[0_0_40px_rgba(239,68,68,0.15)] w-full max-w-sm flex flex-col gap-4" @click.stop>
             <div class="flex items-center gap-3 text-red-500">
                <Trash2 :size="24" />
                <h2 class="text-lg font-bold">Delete Branch</h2>
             </div>
             <p class="text-sm text-textMuted leading-relaxed">
               Are you sure you want to permanently delete this generated logic and <strong class="text-red-400">all of its descendants</strong>? This cannot be fully undone.
             </p>
             <div class="flex justify-end gap-3 mt-4">
               <button @click.stop="nodeToDelete = null" class="px-4 py-2 rounded-lg text-text hover:bg-surfaceHover transition-colors border border-border text-sm">Cancel</button>
               <button @click.stop="confirmDeleteNode" class="px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 text-sm">Delete Branch</button>
             </div>
           </div>
         </div>
       </Teleport>
       
  </div>
</template>
