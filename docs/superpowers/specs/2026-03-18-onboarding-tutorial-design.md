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
| `src/stores/appStore.ts` | Add `showOnboardingOnStartup: boolean` flag (global, persisted in IDB) |
| `src/App.vue` | Mount `OnboardingTour`, add "Tutorial" button in sidebar, trigger tour after hydration |

### Step Data Structure

```ts
// src/data/onboardingSteps.ts
import type { Component } from 'vue'

export interface OnboardingStep {
  target: string              // CSS selector for the highlight element
  tab?: string                // Tab to activate before showing this step
  title: string
  description: string
  icon?: Component            // Lucide icon component (optional)
  media?: string              // Future: path to mp4/image asset
  position: 'top' | 'bottom' | 'left' | 'right'
  optional?: boolean          // If true, step is skipped if target not found
}

export const onboardingSteps: OnboardingStep[] = [
  // ... 8 steps as defined in the table above
]
```

### OnboardingTour.vue Component

**Props:**
- `modelValue: boolean` — v-model controlling visibility

**Emits:**
- `update:modelValue` — close the tour

**Internal state:**
- `currentStep: number` — index of active step
- `targetRect: DOMRect | null` — bounding rect of current target element
- `showCheckbox: boolean` — "Show on startup" checkbox state (bound to store flag)

**Rendering (Teleport to body):**

1. **Overlay layer** — `fixed inset-0 z-[1000]` transparent div catching clicks (closes/blocks interaction)
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
   - "Step N of 8" text
   - Navigation: Back / Next buttons, Skip link
   - On last step: "Show on startup" checkbox + "Done" button

**Positioning logic:**
- Read target element's `getBoundingClientRect()`
- Apply 8px padding around the cutout
- Position tooltip based on `step.position` preference with fallback:
  - If tooltip would overflow viewport, try opposite side, then left/right
- Recalculate on window resize (debounced)

**Tab switching:**
- Before showing a step, if `step.tab` differs from current active tab, switch tab programmatically via store and wait one `nextTick` for DOM to update before reading target rect

**Transitions:**
- Between steps: tooltip fades out (0.1s), cutout animates position/size (0.3s ease via CSS `transition`), tooltip fades in (0.15s) with `scale-up-center`
- Tab switch inserts before cutout animation

**Keyboard:**
- `Escape` → close tour
- `ArrowRight` / `Enter` → next step
- `ArrowLeft` → previous step

### Store Changes

In `appStore.ts`:

```ts
// Global onboarding flag (not per-workspace)
const showOnboardingOnStartup = ref(true)
```

Persisted alongside workspace data in IndexedDB under a dedicated key (e.g., `boldbrush_settings`) to keep it separate from workspace state. Loaded during `hydrate()`.

### App.vue Integration

**Sidebar button:**
- New "Tutorial" button positioned above the Settings tab button
- Icon: `GraduationCap` from Lucide
- Click handler: sets tour visible = true (does not switch tabs — the tour manages tabs itself)

**Auto-launch:**
- After `store.isHydrated` becomes true and splash screen fades out, if `store.showOnboardingOnStartup` is true, start the tour after a short delay (~500ms) to let the UI settle

**Tour mount:**
```vue
<OnboardingTour v-model="showTour" />
```

## Styling

All styling uses existing design tokens and patterns:

- **Overlay**: `bg-black/60 backdrop-blur-md` (matches existing modals)
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

- Verify tour launches on first app start (no prior IDB data)
- Verify tour does NOT launch when "Show on startup" was unchecked
- Verify Tutorial sidebar button launches tour from any tab
- Verify tab switching works correctly for each step
- Verify tooltip positioning doesn't overflow viewport
- Verify Escape closes the tour
- Verify keyboard navigation (arrows, Enter)
- Verify skipped steps when target element is missing
- Verify "Show on startup" checkbox persists across app restarts
