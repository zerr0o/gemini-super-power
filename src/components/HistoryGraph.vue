<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ImageNode } from '../stores/appStore';

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

// Layout Calculation
interface LayoutNode extends ImageNode {
  x: number;
  y: number;
}

const laidOutNodes = computed(() => {
  const result: LayoutNode[] = [];
  const nodeMap = new Map<string, ImageNode>();
  const childrenMap = new Map<string, ImageNode[]>();
  
  props.nodes.forEach(n => {
    nodeMap.set(n.id, n);
    childrenMap.set(n.id, []);
  });
  
  const roots: ImageNode[] = [];
  props.nodes.forEach(n => {
    if (n.parentId && nodeMap.has(n.parentId)) {
      childrenMap.get(n.parentId)!.push(n);
    } else {
      roots.push(n);
    }
  });
  
  const NODE_W = 140;
  const NODE_H = 180;
  const GAP_X = 40;
  const GAP_Y = 80;
  
  // Track the lowest X assigned so far at a specific depth so siblings don't overlap globally?
  // We'll just do a simple recursive sum allocator.
  let currentStartX = 0;
  
  function layoutSubtree(node: ImageNode, depth: number): number {
    const children = childrenMap.get(node.id) || [];
    let myX = 0;
    
    if (children.length === 0) {
      myX = currentStartX;
      currentStartX += NODE_W + GAP_X;
    } else {
      const childXPos: number[] = [];
      children.forEach((child) => {
        childXPos.push(layoutSubtree(child, depth + 1));
      });
      myX = (childXPos[0] + childXPos[childXPos.length - 1]) / 2;
      
      // Prevent parent from crashing into the global currentStartX if its children were pushed right but its depth had no other elements?
      if (myX < currentStartX) {
        myX = currentStartX;
        currentStartX += NODE_W + GAP_X;
      }
    }
    
    result.push({
      ...node,
      x: myX,
      y: depth * (NODE_H + GAP_Y)
    });
    
    return myX;
  }
  
  roots.forEach(r => {
    layoutSubtree(r, 0);
  });
  
  return result;
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
  <div class="relative w-full h-full overflow-hidden bg-background cursor-grab active:cursor-grabbing border border-border/20 rounded-lg shadow-inner bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')]"
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
                 class="absolute flex flex-col items-center bg-surface border rounded overflow-hidden shadow-lg transition-colors cursor-pointer hover:border-text/50"
                 :class="{ 'border-primary shadow-[0_0_20px_rgba(250,204,21,0.2)] z-10': activeNodeId === node.id, 'border-border/50': activeNodeId !== node.id }"
                 :style="{ left: node.x + 'px', top: node.y + 'px', width: '140px', height: '180px' }"
                 @click.stop="emit('select', node.id)">
                 
                 <div class="h-28 w-full bg-black flex items-center justify-center overflow-hidden relative group p-1">
                    <img :src="node.blobBase64" class="max-w-full max-h-full object-contain rounded-sm" draggable="false" />
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
       <div class="absolute bottom-4 right-4 flex gap-2 z-50">
          <button @click="zoom = 1; pan = {x: 50, y: 50}" class="bg-surface border border-border text-textMuted px-3 py-1.5 rounded-md text-xs hover:text-white shadow-lg transition-colors flex items-center gap-2">
            Reset View
          </button>
       </div>
  </div>
</template>
