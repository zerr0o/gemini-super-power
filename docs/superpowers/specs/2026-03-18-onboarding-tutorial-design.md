# Onboarding Tutorial — Design Spec

## Overview

Add an interactive guided tour to Gemini Super Power that teaches new users the app workflow and best practices. The tour highlights UI elements one at a time with tooltips containing instructions, prompting tips, and workflow advice.

Central best practice emphasis: **use masks systematically** to remove the "frame effect" created by zone-based edits, keeping only the main modified element with a progressive blend.

## Goals

- Onboard new users with a step-by-step interactive tour
- Teach the generation → mask → export workflow
- Embed prompt engineering tips directly in context (e.g., "don't change background")
- Highlight mask usage as essential, not optional
- Zero external dependencies — built entirely on existing patterns

## Tour Steps

| # | Target element | Tab | Title | Content |
|---|---|---|---|---|
| 1 | Settings API key input | settings | **Set up your API key** | First, paste your Gemini API key here. You can get one free from Google AI Studio. |
| 2 | Prompt textarea | generation | **Describe what you want** | Enter your prompt here. Be specific about what to change — and what NOT to change: "don't change background", "don't change position", "don't change anything except the hat". |
| 3 | Canvas / selection area | generation | **Draw your edit zone** | Select the area you want to modify. Only this region will be regenerated. |
| 4 | Reference slots | generation | **Use references** | Ref 1 can be the selection itself. If left empty, it auto-falls back to the active image. Add more references to guide style or content. |
| 5 | History graph tab / node tree | history | **Branch your history** | Each generation creates a new node. Try different prompts from the same starting point to explore variations — it's a tree, not a line. |
| 6 | Mask brush controls (sidebar) | generation | **Blend with masks (essential!)** | After generating, use the mask brush to hide the hard edges around your edit zone. This removes the "frame effect" and keeps only the main element with a smooth progressive blend. X to toggle Hide/Reveal, Z to preview. |
| 7 | Layer Mask Studio tab | masks | **Refine masks across layers** | For fine control, use the dedicated Mask Studio. Edit masks for any layer in your branch. *(optional step — skippable)* |
| 8 | Export buttons (header) | generation | **Export your work** | Export as PNG, a layer package with manifest, or a multi-layer PSD for Photoshop. |

## Architecture

### New Files

| File | Purpose |
|---|---|
| `src/components/OnboardingTour.vue` | Tour component — overlay, cutout, tooltip, navigation |
| `src/data/onboardingSteps.ts` | Declarative step definitions array |

### Modified Files

| File | Change |
|---|---|
| `src/stores/appStore.ts` | No changes needed — onboarding flag lives in App.vue via localStorage |
| `src/App.vue` | Mount `OnboardingTour`, add "Tutorial" button in sidebar, trigger tour after splash `@after-leave`, pass `setActiveTab`/`setSidebarTab` props, add `showTour` to `isShortcutSuspended`, add `app-region-no-drag` on overlay, add `data-tour="api-key"` on settings API key input, add `data-tour="export"` on header export buttons |
| `src/views/GenerationView.vue` | Add `data-tour` attributes on prompt textarea, reference slots, mask sidebar controls. Add `defineExpose({ setSidebarTab })` to expose sidebar tab switching |
| `src/components/CanvasSelection.vue` | Add `data-tour="canvas"` on root canvas element |
| `src/components/HistoryGraph.vue` | Add `data-tour="history"` on graph container |
| `src/components/LayerMaskWorkspace.vue` | Add `data-tour="mask-studio"` on root element |

### Step Data Structure

```ts
// src/data/onboardingSteps.ts
import type { Component } from 'vue'

export interface OnboardingStep {
  target: string              // CSS selector using data-tour attributes
  tab?: string                // Tab to activate before showing this step
  sidebarTab?: string         // Sidebar sub-tab to activate (e.g., 'mask' for step 6)
  title: string
  description: string
  icon?: Component            // Lucide icon component (optional)
  media?: string              // Future: path to mp4/image asset
  position?: 'top' | 'bottom' | 'left' | 'right'  // Default: 'bottom'
  optional?: boolean          // If true, step is skipped if target not found
}

// Target selectors use data-tour attributes added to each target element:
// Step 1: [data-tour="api-key"]         — App.vue settings section
// Step 2: [data-tour="prompt"]          — GenerationView.vue textarea
// Step 3: [data-tour="canvas"]          — CanvasSelection.vue canvas
// Step 4: [data-tour="references"]      — GenerationView.vue ref slots
// Step 5: [data-tour="history"]         — HistoryGraph.vue graph container
// Step 6: [data-tour="mask-brush"]      — GenerationView.vue mask sidebar
// Step 7: [data-tour="mask-studio"]     — LayerMaskWorkspace.vue root
// Step 8: [data-tour="export"]          — App.vue header export buttons

export const onboardingSteps: OnboardingStep[] = [
  // ... 8 steps as defined in the table above
]
```

### OnboardingTour.vue Component

**Props:**
- `modelValue: boolean` — v-model controlling visibility
- `setActiveTab: (tab: string) => void` — callback to switch the main app tab (since `activeTab` is local to App.vue)
- `setSidebarTab: (tab: string) => void` — callback to switch GenerationView's sidebar sub-tab (exposed via `defineExpose`)

**Emits:**
- `update:modelValue` — close the tour

**Internal state:**
- `currentStep: number` — index of active step
- `targetRect: DOMRect | null` — bounding rect of current target element
- `showCheckbox: boolean` — "Show on startup" checkbox state (bound to store flag)

**Rendering (Teleport to body):**

1. **Overlay layer** — `fixed inset-0 z-[999]` transparent div catching clicks (closes/blocks interaction). Uses `z-[999]` to sit below existing modals (`z-[1000]`) in case they overlap.
2. **Cutout highlight** — Absolutely positioned div over the target element with:
   - `box-shadow: 0 0 0 9999px rgba(0,0,0,0.6)` for the darkened surround
   - `backdrop-filter: blur(8px)` on the overlay (not on the cutout)
   - Yellow pulsing border (`border-primary`, CSS `pulse` animation)
   - `border-radius` matching the target element
   - `pointer-events: none` so the target remains visible but not interactive
3. **Tooltip** — Positioned relative to the cutout, containing:
   - Step title (bold)
   - Description text with inline tips
   - Optional Lucide icon
   - Progress dots (active = yellow, inactive = muted)
   - "Step N of M" text (M = count of visible/non-skipped steps, dynamically computed)
   - Navigation: Back / Next buttons, Skip link
   - On last step: "Show on startup" checkbox + "Done" button

**Positioning logic:**
- Read target element's `getBoundingClientRect()`
- Apply 8px padding around the cutout
- Position tooltip based on `step.position` preference with fallback:
  - If tooltip would overflow viewport, try opposite side, then left/right
- Recalculate on window resize (debounced)

**Tab switching:**
- `App.vue` passes a `setActiveTab` callback prop to `OnboardingTour` (since `activeTab` is a local ref in App.vue, not in the store)
- Before showing a step, if `step.tab` differs from current active tab, call `setActiveTab(step.tab)` and wait `nextTick` + `requestAnimationFrame` for DOM to fully render (important for the Settings tab which uses `v-if`, not `v-show`)
- If `step.sidebarTab` is set, call `props.setSidebarTab(step.sidebarTab)` to switch GenerationView's internal sidebar tab (e.g., to 'mask' for step 6). GenerationView exposes this via `defineExpose({ setSidebarTab })` (consistent with CanvasSelection which already uses `defineExpose`). App.vue holds a template ref to GenerationView and passes the function down.

**Transitions:**
- Between steps: tooltip fades out (0.1s), cutout animates position/size (0.3s ease via CSS `transition`), tooltip fades in (0.15s) with `scale-up-center`
- Tab switch inserts before cutout animation

**Keyboard:**
- `Escape` → close tour
- `ArrowRight` / `Enter` → next step
- `ArrowLeft` → previous step

### Store Changes

The `showOnboardingOnStartup` flag lives in `App.vue` as a local ref (not in the Pinia store), since it is only needed by App.vue and OnboardingTour:

```ts
// In App.vue <script setup>
// Synchronous read — no async hydration race
const showOnboardingOnStartup = ref(
  localStorage.getItem('boldbrush_show_onboarding') !== 'false'
)

function setShowOnboardingOnStartup(value: boolean) {
  showOnboardingOnStartup.value = value
  localStorage.setItem('boldbrush_show_onboarding', String(value))
}
```

Persisted via `localStorage` (matching the `apiKey` pattern in appStore), not IndexedDB. Written to localStorage whenever the checkbox value changes.

**New installs vs. existing users:** The localStorage key `boldbrush_show_onboarding` does not exist on first run, so `getItem` returns `null` and `!== 'false'` evaluates to `true` (tour shown). For existing users upgrading, the key also won't exist yet. To avoid annoying power users, the `@after-leave` callback on the splash screen checks: if the localStorage key is absent AND hydrated workspaces contain nodes, skip the tour and write `'false'` to localStorage. Only truly new users (no workspaces, no localStorage key) see the auto-launch.

### App.vue Integration

**Sidebar button:**
- New "Tutorial" button positioned above the Settings tab button
- Icon: `GraduationCap` from Lucide
- Click handler: sets tour visible = true (does not switch tabs — the tour manages tabs itself)

**Auto-launch:**
- Use `@after-leave` on the splash screen `<Transition>` to trigger the tour reliably after the splash has fully faded out (rather than a time-based delay)
- If `store.showOnboardingOnStartup` is true, set `showTour = true` in the `@after-leave` callback

**Shortcut suspension:**
- Add `showTour` to the existing `isShortcutSuspended` expression: `:is-shortcut-suspended="showRenameModal || showDeleteModal || showTour"` to prevent GenerationView keyboard shortcuts from conflicting with tour navigation

**Tour mount:**
```vue
<OnboardingTour
  v-model="showTour"
  :set-active-tab="(tab: AppTab) => activeTab = tab"
  :set-sidebar-tab="(tab: string) => generationViewRef?.setSidebarTab(tab)"
/>
```

## Styling

All styling uses existing design tokens and patterns:

- **Overlay**: `bg-black/60 backdrop-blur-md app-region-no-drag` (matches existing modals, prevents Electron title bar drag)
- **Tooltip**: `bg-surface border border-border rounded-2xl shadow-2xl p-5`
- **Tooltip entrance**: `scale-up-center` animation (already defined in App.vue)
- **Primary button (Next/Done)**: `bg-primary text-black font-semibold rounded-lg px-4 py-2`
- **Secondary (Back)**: `text-text-muted hover:text-text-main`
- **Skip link**: `text-text-muted text-sm underline`
- **Progress dots**: `w-2 h-2 rounded-full` — active: `bg-primary`, inactive: `bg-border`
- **Highlight border pulse**: new CSS animation:
  ```css
  @keyframes highlight-pulse {
    0%, 100% { border-color: var(--color-primary); opacity: 0.7; }
    50% { border-color: var(--color-primary); opacity: 1; }
  }
  ```
- **Cutout transition**: `transition: top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease`

## Behavior Edge Cases

- **Target not found**: If `document.querySelector(step.target)` returns null, skip the step silently and advance to the next one
- **Window resize**: Debounced recalculation (200ms) of target rect and tooltip position
- **Tour closed mid-way**: Current step is not persisted — tour always restarts from step 1
- **Multiple rapid clicks**: Disable Next/Back buttons during transition (300ms debounce)

## Future Evolution

- **Media support**: The `media` field in step data is already defined. When ready, add a `<video>` or `<img>` element inside the tooltip, rendered conditionally when `step.media` is set
- **i18n**: Step content can be extracted to locale files when multi-language support is needed
- **Conditional steps**: The `optional` flag can be extended to a `condition` function for dynamic step inclusion

## Testing Plan

- Verify tour launches on first app start (no prior IDB data, no `boldbrush_show_onboarding` localStorage key)
- Verify tour does NOT auto-launch for existing users upgrading (workspaces with nodes exist, no localStorage key yet)
- Verify tour does NOT launch when "Show on startup" was unchecked (localStorage key = 'false')
- Verify Tutorial sidebar button launches tour from any tab
- Verify tab switching works correctly for each step
- Verify tooltip positioning doesn't overflow viewport
- Verify Escape closes the tour
- Verify keyboard navigation (arrows, Enter)
- Verify skipped steps when target element is missing
- Verify "Show on startup" checkbox persists across app restarts
