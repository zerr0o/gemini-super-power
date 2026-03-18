# Onboarding Tutorial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an interactive guided tour that teaches new users the app workflow and best practices (especially mask usage).

**Architecture:** Custom `OnboardingTour.vue` component using Teleport to body, with a declarative step array in `src/data/onboardingSteps.ts`. Highlights target elements via box-shadow cutout, positions tooltips dynamically. Tab/sidebar switching via callback props from App.vue. Persistence via localStorage.

**Tech Stack:** Vue 3, TypeScript, Tailwind CSS 4, Lucide icons. Zero new dependencies.

**Spec:** `docs/superpowers/specs/2026-03-18-onboarding-tutorial-design.md`

---

### Task 1: Create step data structure and definitions

**Files:**
- Create: `src/data/onboardingSteps.ts`

- [ ] **Step 1: Create `src/data/` directory and step data file**

```ts
// src/data/onboardingSteps.ts
import type { Component } from 'vue'
import { Settings, Type, Move, Image, GitBranch, Brush, Layers, Download } from 'lucide-vue-next'

export interface OnboardingStep {
  target: string
  tab?: string
  sidebarTab?: string
  title: string
  description: string
  icon?: Component
  media?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  optional?: boolean
}

export const onboardingSteps: OnboardingStep[] = [
  {
    target: '[data-tour="api-key"]',
    tab: 'settings',
    title: 'Set up your API key',
    description: 'First, paste your Gemini API key here. You can get one free from Google AI Studio.',
    icon: Settings,
    position: 'left',
  },
  {
    target: '[data-tour="prompt"]',
    tab: 'generation',
    sidebarTab: 'prompt',
    title: 'Describe what you want',
    description: 'Enter your prompt here. Be specific about what to change — and what NOT to change: "don\'t change background", "don\'t change position", "don\'t change anything except the hat".',
    icon: Type,
    position: 'left',
  },
  {
    target: '[data-tour="canvas"]',
    tab: 'generation',
    title: 'Draw your edit zone',
    description: 'Select the area you want to modify. Only this region will be regenerated.',
    icon: Move,
    position: 'right',
  },
  {
    target: '[data-tour="references"]',
    tab: 'generation',
    sidebarTab: 'prompt',
    title: 'Use references',
    description: 'Ref 1 can be the selection itself. If left empty, it auto-falls back to the active image. Add more references to guide style or content.',
    icon: Image,
    position: 'left',
  },
  {
    target: '[data-tour="history"]',
    tab: 'history',
    title: 'Branch your history',
    description: 'Each generation creates a new node. Try different prompts from the same starting point to explore variations — it\'s a tree, not a line.',
    icon: GitBranch,
    position: 'bottom',
  },
  {
    target: '[data-tour="mask-brush"]',
    tab: 'generation',
    sidebarTab: 'mask',
    title: 'Blend with masks (essential!)',
    description: 'After generating, use the mask brush to hide the hard edges around your edit zone. This removes the "frame effect" and keeps only the main element with a smooth progressive blend. X to toggle Hide/Reveal, Z to preview.',
    icon: Brush,
    position: 'left',
  },
  {
    target: '[data-tour="mask-studio"]',
    tab: 'masks',
    title: 'Refine masks across layers',
    description: 'For fine control, use the dedicated Mask Studio. Edit masks for any layer in your branch.',
    icon: Layers,
    position: 'bottom',
    optional: true,
  },
  {
    target: '[data-tour="export"]',
    tab: 'generation',
    title: 'Export your work',
    description: 'Export as PNG, a layer package with manifest, or a multi-layer PSD for Photoshop.',
    icon: Download,
    position: 'bottom',
  },
]
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx vue-tsc --noEmit 2>&1 | head -20`
Expected: No errors related to `onboardingSteps.ts`

- [ ] **Step 3: Commit**

```bash
git add src/data/onboardingSteps.ts
git commit -m "feat(onboarding): add step data definitions for guided tour"
```

---

### Task 2: Add `data-tour` attributes to target elements

**Files:**
- Modify: `src/App.vue:423` (API key input), `src/App.vue:316-361` (export buttons)
- Modify: `src/views/GenerationView.vue:1653` (prompt textarea), `src/views/GenerationView.vue:1398-1409` (references section), `src/views/GenerationView.vue:1486` (mask sidebar)
- Modify: `src/components/CanvasSelection.vue:1359` (root div)
- Modify: `src/components/HistoryGraph.vue:260` (root div)
- Modify: `src/components/LayerMaskWorkspace.vue:29` (root div)

- [ ] **Step 1: Add `data-tour="api-key"` to the API key input in App.vue**

At `src/App.vue:423`, the `<input type="password">` for the API key — add the attribute:

```html
<!-- Before -->
<input type="password" spellcheck="false" :value="store.apiKey"

<!-- After -->
<input data-tour="api-key" type="password" spellcheck="false" :value="store.apiKey"
```

- [ ] **Step 2: Add `data-tour="export"` to the export buttons container in App.vue**

At `src/App.vue:316`, the export buttons wrapper `<div>` — add the attribute:

```html
<!-- Before -->
<div class="flex items-center gap-1.5 app-region-no-drag">

<!-- After -->
<div data-tour="export" class="flex items-center gap-1.5 app-region-no-drag">
```

- [ ] **Step 3: Add `data-tour="prompt"` to the textarea in GenerationView.vue**

At `src/views/GenerationView.vue:1653`:

```html
<!-- Before -->
<textarea
  v-model="prompt"

<!-- After -->
<textarea
  data-tour="prompt"
  v-model="prompt"
```

- [ ] **Step 4: Add `data-tour="references"` to the references section in GenerationView.vue**

At `src/views/GenerationView.vue:1398`, the `v-show` div containing "Reference Limits". Add the attribute:

```html
<!-- Before (line 1398) -->
<div v-show="activeSidebarTab === 'prompt'" class="flex flex-col gap-2">
  <div class="flex items-center justify-between">
    <label class="text-xs text-textMuted font-medium uppercase tracking-wider">Reference Limits

<!-- After -->
<div data-tour="references" v-show="activeSidebarTab === 'prompt'" class="flex flex-col gap-2">
```

- [ ] **Step 5: Add `data-tour="mask-brush"` to the mask sidebar section in GenerationView.vue**

At `src/views/GenerationView.vue:1486`:

```html
<!-- Before -->
<div v-show="activeSidebarTab === 'mask'" class="flex flex-col gap-2">

<!-- After -->
<div data-tour="mask-brush" v-show="activeSidebarTab === 'mask'" class="flex flex-col gap-2">
```

- [ ] **Step 6: Add `data-tour="canvas"` to CanvasSelection root div**

At `src/components/CanvasSelection.vue:1359`:

```html
<!-- Before -->
<div
  ref="containerRef"
  class="relative w-full h-full overflow-hidden touch-none select-none"

<!-- After -->
<div
  ref="containerRef"
  data-tour="canvas"
  class="relative w-full h-full overflow-hidden touch-none select-none"
```

- [ ] **Step 7: Add `data-tour="history"` to HistoryGraph root div**

At `src/components/HistoryGraph.vue:260`:

```html
<!-- Before -->
<div class="relative w-full h-full overflow-hidden bg-background cursor-grab

<!-- After -->
<div data-tour="history" class="relative w-full h-full overflow-hidden bg-background cursor-grab
```

- [ ] **Step 8: Add `data-tour="mask-studio"` to LayerMaskWorkspace root div**

At `src/components/LayerMaskWorkspace.vue:29`:

```html
<!-- Before -->
<div class="w-full h-full min-h-0 overflow-y-auto

<!-- After -->
<div data-tour="mask-studio" class="w-full h-full min-h-0 overflow-y-auto
```

- [ ] **Step 9: Add `defineExpose` to GenerationView for sidebar tab switching**

At `src/views/GenerationView.vue`, the `setSidebarTab` function already exists at line 302. Add `defineExpose` after the function definitions (e.g., around line 340, after `resetSelectedMask`):

```ts
defineExpose({ setSidebarTab })
```

- [ ] **Step 10: Verify compilation**

Run: `npx vue-tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 11: Commit**

```bash
git add src/App.vue src/views/GenerationView.vue src/components/CanvasSelection.vue src/components/HistoryGraph.vue src/components/LayerMaskWorkspace.vue
git commit -m "feat(onboarding): add data-tour attributes and defineExpose for tour targets"
```

---

### Task 3: Build OnboardingTour.vue component — overlay and cutout

**Files:**
- Create: `src/components/OnboardingTour.vue`

This task creates the component with the overlay, cutout highlight, and positioning logic. The tooltip content is added in Task 4.

- [ ] **Step 1: Create the component skeleton with overlay and cutout**

```vue
<!-- src/components/OnboardingTour.vue -->
<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { onboardingSteps } from '../data/onboardingSteps'

const props = defineProps<{
  modelValue: boolean
  setActiveTab: (tab: string) => void
  setSidebarTab: (tab: string) => void
  showOnStartup: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'update:showOnStartup', value: boolean): void
}>()

const currentStepIndex = ref(0)
const targetRect = ref<DOMRect | null>(null)
const tooltipVisible = ref(false)
const isTransitioning = ref(false)

const currentStep = computed(() => onboardingSteps[currentStepIndex.value])
const totalVisibleSteps = computed(() => {
  let count = 0
  for (const step of onboardingSteps) {
    if (!step.optional || document.querySelector(step.target)) count++
  }
  return count
})

const visibleStepNumber = computed(() => {
  let count = 0
  for (let i = 0; i <= currentStepIndex.value; i++) {
    const step = onboardingSteps[i]
    if (!step.optional || document.querySelector(step.target)) count++
  }
  return count
})

const cutoutStyle = computed(() => {
  if (!targetRect.value) return { display: 'none' }
  const pad = 8
  return {
    position: 'fixed' as const,
    top: `${targetRect.value.top - pad}px`,
    left: `${targetRect.value.left - pad}px`,
    width: `${targetRect.value.width + pad * 2}px`,
    height: `${targetRect.value.height + pad * 2}px`,
    boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
    borderRadius: '12px',
    border: '2px solid var(--color-primary)',
    pointerEvents: 'none' as const,
    zIndex: 999,
    transition: 'top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease',
    animation: 'highlight-pulse 2s ease-in-out infinite',
  }
})

function getTooltipPosition(): Record<string, string> {
  if (!targetRect.value) return { display: 'none' }

  const rect = targetRect.value
  const pad = 8
  const tooltipW = 340
  const tooltipH = 220
  const gap = 16
  const pos = currentStep.value?.position || 'bottom'

  let top = 0
  let left = 0

  if (pos === 'bottom') {
    top = rect.bottom + pad + gap
    left = rect.left + rect.width / 2 - tooltipW / 2
  } else if (pos === 'top') {
    top = rect.top - pad - gap - tooltipH
    left = rect.left + rect.width / 2 - tooltipW / 2
  } else if (pos === 'left') {
    top = rect.top + rect.height / 2 - tooltipH / 2
    left = rect.left - pad - gap - tooltipW
  } else if (pos === 'right') {
    top = rect.top + rect.height / 2 - tooltipH / 2
    left = rect.right + pad + gap
  }

  // Clamp to viewport
  const vw = window.innerWidth
  const vh = window.innerHeight
  if (left < 12) left = 12
  if (left + tooltipW > vw - 12) left = vw - 12 - tooltipW
  if (top < 12) top = 12
  if (top + tooltipH > vh - 12) top = vh - 12 - tooltipH

  return {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    width: `${tooltipW}px`,
    zIndex: '999',
  }
}

const tooltipStyle = computed(() => getTooltipPosition())

async function updateTargetRect() {
  const step = currentStep.value
  if (!step) return

  const el = document.querySelector(step.target)
  if (el) {
    targetRect.value = el.getBoundingClientRect()
  } else {
    targetRect.value = null
  }
}

async function goToStep(index: number) {
  if (isTransitioning.value) return
  if (index < 0 || index >= onboardingSteps.length) return

  isTransitioning.value = true
  tooltipVisible.value = false

  // Small delay for tooltip fade-out
  await new Promise(r => setTimeout(r, 100))

  currentStepIndex.value = index
  const step = onboardingSteps[index]

  // Switch tab if needed
  if (step.tab) {
    props.setActiveTab(step.tab)
  }

  // Switch sidebar tab if needed
  if (step.sidebarTab) {
    props.setSidebarTab(step.sidebarTab)
  }

  // Wait for DOM to update (nextTick + rAF for v-if elements like settings)
  await nextTick()
  await new Promise(r => requestAnimationFrame(r))
  await new Promise(r => requestAnimationFrame(r))

  await updateTargetRect()

  // Skip if target not found and step is optional
  if (!targetRect.value && step.optional) {
    isTransitioning.value = false
    goToStep(index + 1)
    return
  }

  // If target not found and not optional, skip silently
  if (!targetRect.value) {
    isTransitioning.value = false
    if (index < onboardingSteps.length - 1) {
      goToStep(index + 1)
    }
    return
  }

  // Wait for cutout animation
  await new Promise(r => setTimeout(r, 300))

  tooltipVisible.value = true
  isTransitioning.value = false
}

function next() {
  if (currentStepIndex.value < onboardingSteps.length - 1) {
    goToStep(currentStepIndex.value + 1)
  } else {
    close()
  }
}

function prev() {
  if (currentStepIndex.value > 0) {
    goToStep(currentStepIndex.value - 1)
  }
}

function close() {
  tooltipVisible.value = false
  targetRect.value = null
  emit('update:modelValue', false)
}

function handleKeydown(e: KeyboardEvent) {
  if (!props.modelValue) return
  if (e.key === 'Escape') { close(); return }
  if (e.key === 'ArrowRight' || e.key === 'Enter') { next(); return }
  if (e.key === 'ArrowLeft') { prev(); return }
}

let resizeTimer: ReturnType<typeof setTimeout> | null = null
function handleResize() {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(updateTargetRect, 200)
}

watch(() => props.modelValue, (visible) => {
  if (visible) {
    currentStepIndex.value = 0
    goToStep(0)
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', handleResize)
  if (resizeTimer) clearTimeout(resizeTimer)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-[999] app-region-no-drag">
      <!-- Overlay (captures clicks) -->
      <div class="fixed inset-0" @click="close"></div>

      <!-- Cutout highlight -->
      <div v-if="targetRect" :style="cutoutStyle"></div>

      <!-- Tooltip -->
      <Transition name="tour-tooltip">
        <div
          v-if="tooltipVisible && targetRect"
          :style="tooltipStyle"
          class="bg-surface border border-border rounded-2xl shadow-2xl p-5 scale-up-center"
          @click.stop>

          <!-- Header with icon -->
          <div class="flex items-center gap-3 mb-3">
            <div v-if="currentStep?.icon" class="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <component :is="currentStep.icon" :size="18" class="text-primary" />
            </div>
            <h3 class="text-base font-bold text-textMain">{{ currentStep?.title }}</h3>
          </div>

          <!-- Description -->
          <p class="text-sm text-textMuted leading-relaxed mb-4">{{ currentStep?.description }}</p>

          <!-- Progress dots -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="flex gap-1.5">
                <div
                  v-for="i in totalVisibleSteps"
                  :key="i"
                  class="w-2 h-2 rounded-full transition-colors"
                  :class="i <= visibleStepNumber ? 'bg-primary' : 'bg-border'">
                </div>
              </div>
              <span class="text-[11px] text-textMuted">Step {{ visibleStepNumber }} of {{ totalVisibleSteps }}</span>
            </div>
          </div>

          <!-- Navigation -->
          <div class="flex items-center justify-between mt-4 pt-3 border-t border-border">
            <button
              @click="close"
              class="text-textMuted text-sm underline hover:text-textMain transition-colors">
              Skip tour
            </button>
            <div class="flex items-center gap-2">
              <button
                v-if="currentStepIndex > 0"
                @click="prev"
                :disabled="isTransitioning"
                class="px-3 py-1.5 text-sm text-textMuted hover:text-textMain transition-colors disabled:opacity-40">
                Back
              </button>
              <button
                @click="next"
                :disabled="isTransitioning"
                class="bg-primary text-black font-semibold rounded-lg px-4 py-2 text-sm hover:bg-primaryHover transition-colors disabled:opacity-40">
                {{ currentStepIndex === onboardingSteps.length - 1 ? 'Done' : 'Next' }}
              </button>
            </div>
          </div>

          <!-- Show on startup checkbox (last step only) -->
          <label
            v-if="currentStepIndex === onboardingSteps.length - 1"
            class="flex items-center gap-2 mt-3 pt-3 border-t border-border cursor-pointer">
            <input
              type="checkbox"
              :checked="showOnStartup"
              @change="$emit('update:showOnStartup', ($event.target as HTMLInputElement).checked)"
              class="accent-primary" />
            <span class="text-xs text-textMuted">Show this tutorial on startup</span>
          </label>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<style>
@keyframes highlight-pulse {
  0%, 100% { border-color: rgba(250, 204, 21, 0.5); }
  50% { border-color: rgba(250, 204, 21, 1); }
}

.tour-tooltip-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.tour-tooltip-leave-active { transition: opacity 0.1s ease; }
.tour-tooltip-enter-from { opacity: 0; transform: scale(0.95); }
.tour-tooltip-leave-to { opacity: 0; }
</style>
```

- [ ] **Step 2: Verify compilation**

Run: `npx vue-tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/OnboardingTour.vue
git commit -m "feat(onboarding): create OnboardingTour component with overlay, cutout, and tooltip"
```

---

### Task 4: Integrate OnboardingTour into App.vue

**Files:**
- Modify: `src/App.vue:1-3` (imports), `src/App.vue:13-19` (state), `src/App.vue:244-262` (onMounted), `src/App.vue:268-279` (splash transition), `src/App.vue:364-393` (sidebar + GenerationView), `src/App.vue:587` (before closing Teleport)

- [ ] **Step 1: Add imports and state in App.vue script**

At `src/App.vue:3`, add to the imports:

```ts
import { GraduationCap } from 'lucide-vue-next'  // add to existing lucide import
import OnboardingTour from './components/OnboardingTour.vue'
```

After line 21 (after `quickExportResetTimer`), add:

```ts
const showTour = ref(false)
const showOnboardingOnStartup = ref(
  localStorage.getItem('boldbrush_show_onboarding') !== 'false'
)
const generationViewRef = ref<InstanceType<typeof GenerationView> | null>(null)

function setShowOnboardingOnStartup(value: boolean) {
  showOnboardingOnStartup.value = value
  localStorage.setItem('boldbrush_show_onboarding', String(value))
}

function onSplashAfterLeave() {
  // For existing users upgrading (they have nodes but no localStorage key yet), skip the tour
  const lsKey = localStorage.getItem('boldbrush_show_onboarding')
  if (lsKey === null && store.nodes.length > 0) {
    localStorage.setItem('boldbrush_show_onboarding', 'false')
    showOnboardingOnStartup.value = false
    return
  }
  if (showOnboardingOnStartup.value) {
    showTour.value = true
  }
}
```

- [ ] **Step 2: Add `@after-leave` to the splash Transition**

At `src/App.vue:268`:

```html
<!-- Before -->
<Transition name="splash-fade">

<!-- After -->
<Transition name="splash-fade" @after-leave="onSplashAfterLeave">
```

- [ ] **Step 3: Add `ref` to GenerationView and update `isShortcutSuspended`**

At `src/App.vue:391-393`:

```html
<!-- Before -->
<GenerationView
  :is-active="activeTab === 'generation'"
  :is-shortcut-suspended="showRenameModal || showDeleteModal" />

<!-- After -->
<GenerationView
  ref="generationViewRef"
  :is-active="activeTab === 'generation'"
  :is-shortcut-suspended="showRenameModal || showDeleteModal || showTour" />
```

- [ ] **Step 4: Add Tutorial button in sidebar (above Settings)**

At `src/App.vue:384` (just before the `<div class="flex-1">` spacer), add:

```html
<button class="p-2 rounded-lg hover:bg-surfaceHover transition-colors text-textMuted"
  :class="{ 'text-primary': showTour }" @click="showTour = true" title="Tutorial">
  <GraduationCap :size="20" />
</button>
```

- [ ] **Step 5: Mount OnboardingTour component before closing Teleport**

At `src/App.vue:587` (just before `</Teleport>` closing tag), add:

```html
<OnboardingTour
  v-model="showTour"
  :set-active-tab="(tab: string) => activeTab = tab as AppTab"
  :set-sidebar-tab="(tab: string) => generationViewRef?.setSidebarTab(tab as 'prompt' | 'mask')"
  :show-on-startup="showOnboardingOnStartup"
  @update:show-on-startup="setShowOnboardingOnStartup" />
```

- [ ] **Step 6: Verify compilation**

Run: `npx vue-tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 7: Manual test — run `npm run dev`**

Verify:
1. App starts, splash fades, tour auto-launches (fresh localStorage)
2. Tutorial button visible in sidebar above Settings
3. Clicking Tutorial button launches tour
4. Steps navigate correctly with Next/Back
5. Tab switching works (Settings → Generation → History → Generation → Masks → Generation)
6. Sidebar tab switches to mask for step 6
7. Escape closes tour
8. Arrow keys and Enter navigate
9. "Show on startup" checkbox on last step persists to localStorage
10. After unchecking and restarting, tour does not auto-launch
11. For existing users (set `boldbrush_show_onboarding` to null in devtools, ensure workspace has nodes), tour should NOT auto-launch

- [ ] **Step 8: Commit**

```bash
git add src/App.vue
git commit -m "feat(onboarding): integrate tour into App.vue with sidebar button, auto-launch, and shortcuts"
```

---

### Task 5: Polish and edge cases

**Files:**
- Modify: `src/components/OnboardingTour.vue`

- [ ] **Step 1: Test window resize behavior**

Resize the Electron window during a tour step. Verify the cutout and tooltip reposition correctly.

- [ ] **Step 2: Test rapid clicking**

Click Next rapidly. Verify no visual glitches (the `isTransitioning` guard should prevent double-navigation).

- [ ] **Step 3: Test missing target elements**

Open the tour with no workspace/nodes loaded. Steps targeting mask-related elements may have no valid target. Verify those steps are skipped gracefully.

- [ ] **Step 4: Test tooltip viewport clamping**

On each step, verify the tooltip doesn't overflow the window edges. If it does, adjust the `getTooltipPosition` logic with tighter clamping or flip logic.

- [ ] **Step 5: Fix any issues found and commit**

```bash
git add src/components/OnboardingTour.vue
git commit -m "fix(onboarding): polish edge cases — resize, rapid clicks, missing targets"
```

---

### Task 6: Final verification

- [ ] **Step 1: Run type check**

Run: `npx vue-tsc --noEmit`
Expected: Clean pass

- [ ] **Step 2: Full manual test pass**

Walk through the complete Testing Plan from the spec:
- Tour launches on first app start (clear `boldbrush_show_onboarding` from localStorage, clear IDB)
- Tour does NOT auto-launch for existing users upgrading
- Tour does NOT launch when "Show on startup" was unchecked
- Tutorial sidebar button launches tour from any tab
- Tab switching works correctly for each step
- Tooltip positioning doesn't overflow viewport
- Escape closes the tour
- Keyboard navigation (arrows, Enter)
- Skipped steps when target element is missing
- "Show on startup" checkbox persists across app restarts

- [ ] **Step 3: Commit final state**

```bash
git add -A
git commit -m "feat(onboarding): complete interactive tutorial with best practices and mask workflow guidance"
```
