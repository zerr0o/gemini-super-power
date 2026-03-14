<script setup lang="ts">
import { ref, computed } from 'vue';
import { Check, X as XIcon } from 'lucide-vue-next';

const props = defineProps<{
  imageSrc: string;
  targetRatio: 'auto' | '16:9' | '1:1' | '9:16' | '4:3' | '3:4';
}>();

export interface CropData {
  base64: string;
  originalWidth: number;
  originalHeight: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

const emit = defineEmits<{
  (e: 'cropped', data: CropData): void;
  (e: 'update:ratio', ratio: '16:9' | '1:1' | '9:16' | '4:3' | '3:4'): void;
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const imageRef = ref<HTMLImageElement | null>(null);

const mode = ref<'idle' | 'draw' | 'drag' | 'resize-nw' | 'resize-ne' | 'resize-se' | 'resize-sw'>('idle');
const startPos = ref({ x: 0, y: 0 });
const currentPos = ref({ x: 0, y: 0 });
const boxMetrics = ref({ x: 0, y: 0, w: 0, h: 0 });
const initialBox = ref({ x: 0, y: 0, w: 0, h: 0 });

const availableRatios = {
  '16:9': 16/9,
  '4:3': 4/3,
  '1:1': 1,
  '3:4': 3/4,
  '9:16': 9/16
};

function parseRatio(r: string) {
  if (r === 'auto') return 0;
  return availableRatios[r as keyof typeof availableRatios] || 1;
}

function findClosestRatio(w: number, h: number): keyof typeof availableRatios {
  const currentR = w / h;
  let closest = '1:1' as keyof typeof availableRatios;
  let minDiff = Infinity;
  for (const [name, val] of Object.entries(availableRatios)) {
    const diff = Math.abs(val - currentR);
    if (diff < minDiff) {
      minDiff = diff;
      closest = name as keyof typeof availableRatios;
    }
  }
  return closest;
}

function getImageRenderBox(img: HTMLImageElement, containerRect: DOMRect) {
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const contRatio = containerRect.width / containerRect.height;
  
  let w = containerRect.width;
  let h = containerRect.height;
  let x = 0;
  let y = 0;
  
  if (imgRatio > contRatio) {
    h = w / imgRatio;
    y = (containerRect.height - h) / 2;
  } else {
    w = h * imgRatio;
    x = (containerRect.width - w) / 2;
  }
  return { x, y, w, h };
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function handleMouseDown(e: MouseEvent) {
  if (!imageRef.value || !containerRef.value) return;
  // If clicking outside the box, start drawing new box
  mode.value = 'draw';
  const rect = containerRef.value.getBoundingClientRect();
  const renderBox = getImageRenderBox(imageRef.value, rect);

  let mx = e.clientX - rect.left;
  let my = e.clientY - rect.top;
  mx = clamp(mx, renderBox.x, renderBox.x + renderBox.w);
  my = clamp(my, renderBox.y, renderBox.y + renderBox.h);

  startPos.value = { x: mx, y: my };
  currentPos.value = { ...startPos.value };
  boxMetrics.value = { x: mx, y: my, w: 0, h: 0 };
}

function startDrag(e: MouseEvent) {
  mode.value = 'drag';
  startPos.value = { x: e.clientX, y: e.clientY };
  initialBox.value = { ...boxMetrics.value };
}

function startResize(corner: string, e: MouseEvent) {
  mode.value = `resize-${corner}` as any;
  startPos.value = { x: e.clientX, y: e.clientY };
  initialBox.value = { ...boxMetrics.value };
}

function handleMouseMove(e: MouseEvent) {
  if (mode.value === 'idle' || !containerRef.value || !imageRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  const renderBox = getImageRenderBox(imageRef.value, rect);

  if (mode.value === 'draw') {
    let mx = clamp(e.clientX - rect.left, renderBox.x, renderBox.x + renderBox.w);
    let my = clamp(e.clientY - rect.top, renderBox.y, renderBox.y + renderBox.h);
    currentPos.value = { x: mx, y: my };
    updateDrawBox();
  } else if (mode.value === 'drag') {
    const dx = e.clientX - startPos.value.x;
    const dy = e.clientY - startPos.value.y;
    let nx = initialBox.value.x + dx;
    let ny = initialBox.value.y + dy;
    
    nx = clamp(nx, renderBox.x, renderBox.x + renderBox.w - boxMetrics.value.w);
    ny = clamp(ny, renderBox.y, renderBox.y + renderBox.h - boxMetrics.value.h);
    
    boxMetrics.value.x = nx;
    boxMetrics.value.y = ny;
  } else if (mode.value.startsWith('resize-')) {
    handleResize(e, renderBox);
  }
}

function handleMouseUp() {
  if (mode.value === 'idle') return;
  
  if (mode.value === 'draw' && boxMetrics.value.w > 20) {
     if (props.targetRatio === 'auto') {
        const closest = findClosestRatio(boxMetrics.value.w, boxMetrics.value.h);
        emit('update:ratio', closest);
        // Box will snap to this ratio automatically on next prop update if we trigger updateDrawBox?
        // Actually, let's artificially snap it right now.
        snapBoxToRatio(availableRatios[closest]);
     }
  } else if (mode.value.startsWith('resize-')) {
     if (props.targetRatio === 'auto') {
        const closest = findClosestRatio(boxMetrics.value.w, boxMetrics.value.h);
        emit('update:ratio', closest);
        snapBoxToRatio(availableRatios[closest]);
     }
  }

  mode.value = 'idle';
}

function updateDrawBox() {
  let w = Math.abs(currentPos.value.x - startPos.value.x);
  let h = Math.abs(currentPos.value.y - startPos.value.y);
  
  if (w < 1 || h < 1) return;

  let targetR: number;
  if (props.targetRatio === 'auto') {
    const closest = findClosestRatio(w, h);
    targetR = availableRatios[closest];
    emit('update:ratio', closest);
  } else {
    targetR = parseRatio(props.targetRatio);
  }

  if (w / h > targetR) {
    w = h * targetR;
  } else {
    h = w / targetR;
  }

  const x = startPos.value.x < currentPos.value.x ? startPos.value.x : startPos.value.x - w;
  const y = startPos.value.y < currentPos.value.y ? startPos.value.y : startPos.value.y - h;

  boxMetrics.value = { x, y, w, h };
}

function handleResize(e: MouseEvent, renderBox: any) {
  const dx = e.clientX - startPos.value.x;
  const dy = e.clientY - startPos.value.y;
  let { x, y, w, h } = initialBox.value;

  if (mode.value === 'resize-se') {
    w += dx; h += dy;
  } else if (mode.value === 'resize-nw') {
    w -= dx; h -= dy; x += dx; y += dy;
  } else if (mode.value === 'resize-ne') {
    w += dx; h -= dy; y += dy;
  } else if (mode.value === 'resize-sw') {
    w -= dx; h += dy; x += dx;
  }
  
  const absW = Math.max(1, Math.abs(w));
  const absH = Math.max(1, Math.abs(h));

  let r: number;
  if (props.targetRatio === 'auto') {
    const closest = findClosestRatio(absW, absH);
    r = availableRatios[closest];
    emit('update:ratio', closest);
  } else {
    r = parseRatio(props.targetRatio);
  }

  if (w / h > r) w = h * r;
  else h = w / r;
  
  // Re-adjust x/y based on constrained w/h to keep pinned opposite corner
  if (mode.value === 'resize-nw') {
     x = initialBox.value.x + (initialBox.value.w - w);
     y = initialBox.value.y + (initialBox.value.h - h);
  } else if (mode.value === 'resize-ne') {
     y = initialBox.value.y + (initialBox.value.h - h);
  } else if (mode.value === 'resize-sw') {
     x = initialBox.value.x + (initialBox.value.w - w);
  }

  // Simple clamps to container
  if (w < 20) w = 20;
  if (h < 20) h = 20;

  if (x < renderBox.x) { w -= (renderBox.x - x); x = renderBox.x; }
  if (y < renderBox.y) { h -= (renderBox.y - y); y = renderBox.y; }
  if (x + w > renderBox.x + renderBox.w) w = renderBox.x + renderBox.w - x;
  if (y + h > renderBox.y + renderBox.h) h = renderBox.y + renderBox.h - y;

  boxMetrics.value = { x, y, w, h };
}

function snapBoxToRatio(targetR: number) {
  let { x, y, w, h } = boxMetrics.value;
  if (w / h > targetR) {
    w = h * targetR;
  } else {
    h = w / targetR;
  }
  boxMetrics.value = { x, y, w, h };
}

function finalizeCrop() {
  if (!imageRef.value || !containerRef.value) return;
  if (boxMetrics.value.w < 20 || boxMetrics.value.h < 20) return;
  
  const canvas = document.createElement('canvas');
  canvas.width = boxMetrics.value.w;
  canvas.height = boxMetrics.value.h;
  const ctx = canvas.getContext('2d');
  
  const natW = imageRef.value.naturalWidth;
  const natH = imageRef.value.naturalHeight;
  
  const containerRect = containerRef.value.getBoundingClientRect();
  const renderBox = getImageRenderBox(imageRef.value, containerRect);

  const scaleX = natW / renderBox.w;
  const scaleY = natH / renderBox.h;

  const boxInImageX = boxMetrics.value.x - renderBox.x;
  const boxInImageY = boxMetrics.value.y - renderBox.y;

  const realX = Math.round(boxInImageX * scaleX);
  const realY = Math.round(boxInImageY * scaleY);
  const realW = Math.round(boxMetrics.value.w * scaleX);
  const realH = Math.round(boxMetrics.value.h * scaleY);

  ctx?.drawImage(imageRef.value, realX, realY, realW, realH, 0, 0, canvas.width, canvas.height);
  
  const b64 = canvas.toDataURL('image/png');
  emit('cropped', {
     base64: b64,
     originalWidth: natW,
     originalHeight: natH,
     x: realX,
     y: realY,
     w: realW,
     h: realH
  });
  
  cancelCrop();
}

function cancelCrop() {
  boxMetrics.value = { x: 0, y: 0, w: 0, h: 0 };
  mode.value = 'idle';
}

// Watch for external ratio change to snap existing box
import { watch } from 'vue';
watch(() => props.targetRatio, (newR) => {
   if (newR !== 'auto' && boxMetrics.value.w > 0 && mode.value === 'idle') {
      snapBoxToRatio(parseRatio(newR));
   }
});

defineExpose({
  finalizeCrop,
  hasActiveSelection: computed(() => boxMetrics.value.w > 20 && boxMetrics.value.h > 20)
});
</script>

<template>
  <div class="relative w-full h-full flex items-center justify-center overflow-hidden touch-none"
       ref="containerRef"
       @mousedown.prevent="handleMouseDown"
       @mousemove.prevent="handleMouseMove"
       @mouseup.prevent="handleMouseUp"
       @mouseleave.prevent="handleMouseUp"
       >
    
    <img ref="imageRef" :src="imageSrc" class="max-w-full max-h-full object-contain pointer-events-none select-none shadow-2xl rounded" draggable="false" />
    
    <!-- Crop Overlay -->
    <div v-if="boxMetrics.w > 0" 
         class="absolute border-2 border-primary z-20 cursor-move"
         :style="{ left: boxMetrics.x + 'px', top: boxMetrics.y + 'px', width: boxMetrics.w + 'px', height: boxMetrics.h + 'px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)' }"
         @mousedown.stop="startDrag">
         
         <!-- Validation Buttons -->
         <div v-if="mode === 'idle'" class="absolute -bottom-14 left-1/2 -translate-x-1/2 flex gap-2" style="isolation: isolate;">
            <button @mousedown.stop.prevent="finalizeCrop" class="bg-primary hover:bg-primaryHover text-[#000] p-2 rounded-full shadow-[0_4px_15px_rgba(250,204,21,0.4)] transition-colors pointer-events-auto" title="Confirm Selection">
               <Check :size="18" stroke-width="3" />
            </button>
            <button @mousedown.stop.prevent="cancelCrop" class="bg-surface hover:bg-red-500 hover:text-white text-textMuted border border-border p-2 rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.5)] transition-colors pointer-events-auto" title="Cancel Selection">
               <XIcon :size="18" stroke-width="3" />
            </button>
         </div>

         <!-- Resize Handles -->
         <div class="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-black cursor-nwse-resize rounded-full pointer-events-auto" @mousedown.stop="startResize('nw', $event)"></div>
         <div class="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-black cursor-nesw-resize rounded-full pointer-events-auto" @mousedown.stop="startResize('ne', $event)"></div>
         <div class="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-black cursor-nesw-resize rounded-full pointer-events-auto" @mousedown.stop="startResize('sw', $event)"></div>
         <div class="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-black cursor-nwse-resize rounded-full pointer-events-auto" @mousedown.stop="startResize('se', $event)"></div>
    </div>
  </div>
</template>
