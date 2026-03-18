# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Requirements

- Node.js 20+
- npm
- A Google AI Studio API key (entered in Settings tab or via `VITE_GEMINI_API_KEY` in `.env`)

## Build & Run Commands

```bash
npm run dev          # Start Vite dev server + Electron (development mode)
npm run build        # Type-check (vue-tsc) + Vite build + electron-builder (NSIS installer)
npm run build:dir    # Same but unpacked output (no installer)
npm run publish      # Build + publish to GitHub Releases (see Publish section)
npm run preview      # Preview production Vite build
```

There is no test framework configured. There are no lint or format commands.

## Publish

The publish script reads tokens from `.env.publish.local` first, then `.env.publish`, falling back to the terminal environment. Create `.env.publish.local` with `GH_TOKEN=<token>` (needs release upload permissions).

## Architecture

Electron desktop app for iterative Gemini AI image generation with branching history, layer masks, and multi-format export (PNG, layer package, PSD).

**Stack**: Electron 30 + Vue 3 + TypeScript + Pinia + Tailwind CSS 4 + Vite

### Process Model

- **Main process** (`electron/main.ts`): Window management, native file dialogs via IPC, auto-updater
- **Preload** (`electron/preload.ts`): Exposes `window.ipcRenderer` via contextBridge
- **Renderer** (`src/`): Vue 3 SPA with Pinia store

### IPC Channels

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `desktop:save-file` | renderer→main | Single file save with dialog (base64/data-url/utf8) |
| `desktop:save-directory-files` | renderer→main | Multi-file folder export |
| `app-updater:get-state` | renderer→main | Get auto-update status |
| `app-updater:check` | renderer→main | Trigger update check |
| `app-updater:install` | renderer→main | Install downloaded update |

### State Management (`src/stores/appStore.ts`)

Central Pinia store managing:
- **Workspaces**: Top-level containers, each holding a tree of ImageNodes and reference images
- **ImageNodes**: Tree structure linked by `parentId` — represents generation history as a branching graph
- **Hydration**: Auto-loads from IndexedDB on startup; includes migration from legacy flat-array format
- **Persistence**: Debounced (500ms) IndexedDB saves with in-flight tracking

### Blob Storage (`src/services/blobStore.ts`)

Two-tier IndexedDB strategy to keep metadata compact:
- **Metadata store** (`boldbrush_workspaces`): Workspace JSON with `$blob:uuid` references for large data
- **Blob store** (`boldbrush-blobs`): Native Blob objects by UUID
- Base64 strings >50KB are automatically extracted to blob refs on save and resolved on load

### Key Source Layout

| Path | Role |
|------|------|
| `src/views/GenerationView.vue` | Main canvas + prompt + generation UI (~2000 lines) |
| `src/components/CanvasSelection.vue` | Canvas mask painting with brush controls (~1450 lines) |
| `src/components/HistoryGraph.vue` | Node tree graph visualization |
| `src/components/NodeInspector.vue` | Node metadata inspector |
| `src/components/LayerMaskStudio.vue` | Branch-wide mask editing workspace |
| `src/services/geminiService.ts` | Gemini API calls (Flash & Pro models, references, aspect ratios) |
| `src/services/layerExport.ts` | Export logic: PNG, layer package (folder + manifest), PSD |
| `src/services/layerRendering.ts` | Canvas compositing, mask application, image LRU cache (60 items) |
| `src/services/psdBinaryHelpers.ts` | PSD binary format construction |
| `src/workers/psdAssembler.worker.ts` | Off-thread PSD assembly |

### UI Tabs (in `src/App.vue`)

1. **Generation** — Canvas with prompt, reference images, mask editing
2. **History** — Interactive node tree for branch navigation
3. **Tools** — Node inspector (metadata, references, layers)
4. **Masks** — Dedicated LayerMaskStudio
5. **Settings** — API key input, auto-update status

### Styling

Tailwind v4 with custom dark theme tokens defined in `src/style.css`:
- Background `#0a0a0a`, surface `#171717`, primary `#facc15` (yellow), border `#333333`
- Electron drag regions via `.app-region-drag` / `.app-region-no-drag`

### TypeScript

Strict mode enabled with `noUnusedLocals` and `noUnusedParameters`. Target ES2020, bundler module resolution.

### Generation Data Flow

1. User draws selection on canvas, picks references, enters prompt
2. `generateImage()` calls Gemini API → returns base64 image
3. New ImageNode created as child of active node (tree branch)
4. Blobs extracted, workspace JSON + blobs saved to IndexedDB (debounced)
5. Export builds layer stack from node lineage, composites with masks, outputs PNG/PSD

### Export Formats

- **Quick PNG**: Single composited image
- **Layer Package**: Folder of per-layer PNGs + `manifest.json`
- **PSD**: Multi-layer Photoshop file assembled in Web Worker

### Keyboard Shortcuts

**History navigation** (Generation view):
- `A` (hold): Preview lineage
- `Up`/`Down` (while holding `A`): Move through active branch
- `Space` (while holding `A`): Jump to previewed node

**Mask editing**:
- `X`: Toggle brush mode (Hide/Reveal)
- `Z`: Toggle Mask View / Live View
- `Ctrl+Z`: Undo last mask stroke
- `Ctrl+drag`: Pan canvas when zoomed

### Pixel Density Overlay

Generation view includes a pixel-density heatmap panel (bottom-right, closed by default). Computed per layer from generated pixel dimensions vs layer coverage area. Opacity adjustable via slider. See `src/services/pixelDensity.ts`.

### Troubleshooting

- **`spawn EPERM` during build**: Rerun with elevated permissions outside the desktop sandbox
- **Auto updates not triggering**: Must be an installed packaged build (not dev server), published version must be semver-newer, release assets must be uploaded correctly
- **History missing after crash**: Workspace data only persists after successful IndexedDB save; nodes lost during a failed save are not recoverable
