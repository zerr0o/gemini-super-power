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

  // Skip if target not found
  if (!targetRect.value) {
    isTransitioning.value = false
    if (index < onboardingSteps.length - 1) {
      goToStep(index + 1)
    } else {
      close()
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
  if (e.key === 'Escape') { e.preventDefault(); close(); return }
  if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next(); return }
  if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); return }
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
