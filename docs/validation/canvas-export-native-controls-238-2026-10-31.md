# Shared native export controls — PR #238

The filename inputs and descriptions are removed from both export dialogs. The system save dialog receives a safe suggested filename through the existing native handoff. `suggestedArtifactFilename` shares sanitization between Markdown and PNG; native adapter validation remains intact.

Successful Copy now closes its modal and displays `new Notice(...)` with the existing localized success message. Failed copy leaves the dialog open for retry. Both dialogs call the same `StyleEditorModal.clipboardFeedback` handler; `ClipboardSession` still owns trusted activation and retired callbacks.

## UI audit

- Both extend the existing `StyleEditorModal` and use its scrolling body, fixed footer and shared action-row styles.
- Settings rows, dropdowns, toggles and buttons are native Obsidian components. PNG resolution uses the existing shared `numberSlider` wrapper around Obsidian's slider.
- Markdown preview uses Obsidian `TextAreaComponent` and the existing shared `kplex-package-source` style.
- PNG preview uses native `markdown-rendered` / `image-embed` markup and Obsidian's image styles. No plugin image-preview CSS or checkerboard is added.
- All export-specific spacing, filename, image-preview and checkerboard CSS is removed. Scrollbar/chevron/footer spacing belongs to the existing shared modal shell. Export modal class names remain only as stable identifiers; they have no CSS rules.

## Risk assessment and checks

This affects export presentation, native copy feedback and pure filename suggestion. Indexing, source acquisition, persistence, scheduling and graph semantics are untouched. The shared shell has other consumers, so affected appearance/control checks were included. No aggregate indexing suite was run. The commit skips the aggregate CI workflow for the same reason; it does not change that workflow or its assertions.

- Production build and Obsidian lint: passed.
- Focused export unit/browser tests: 25 passed. Actual PNG pixels, filename safety, clipboard lifetime and Markdown compatibility remain covered.
- Existing appearance/control browser checks: 33 passed. The new shared-feedback test passes success/close/Notice, failed-copy retry and ignored callbacks after dismissal. Its test-only class/method names were corrected before the passing focused rerun.
- `npm run check:core`: 130 passed.
- Native PNG matrix: all 18 view/theme/zoom Save/Copy combinations passed, including notice/close behavior, no filename controls, transparent PNGs, unchanged canvas state and zero source/index work. That development run then rejected a changing unfinished popout capture; cleanup passed. A focused rerun passed all eight UI/popout/lifetime/editor cases with cleanup, without changing production guards or deadlines.
- Native Markdown: six cases passed with cleanup, including main/popout Copy close and Notice, system Save bytes, central menu, palette, fold/subtree and filter behavior.
- Native Markdown screenshot was visually reviewed. Filename controls are absent; preview/footer use the shared layout. PNG native sizing and body overflow assertions pass.

[Exact artifact/source/driver receipts](canvas-export-native-controls-238-2026-10-31.json). Raw focused logs and native images are under `/private/tmp/kplex-export-native-ui-*`.

## Deployment

The exact native-tested build is deployed to the authorized reference vault. Changed `main.js` and `styles.css` were fully staged and atomically renamed; the identical manifest was skipped. No backups were made. Settings and enablement bytes remain unchanged, the captured K-Plex view was restored, and both export commands are registered.

`main.js` SHA256: `4d1ab0dea25dda246c7849d8372e9817121d876f7f0204c3105b88239b7bf855`.

`styles.css` SHA256: `283377bded131545f57adf5f4730a4697203bf2fca66d6f17eb066d9bf32d65a`.

Existing minimum-host, other operating systems, physical mobile and OS destination/overwrite-picker acceptance remain separate. The native download probe selects an owned synthetic destination. This UI follow-up does not change the image service's scene/capture limitations.
