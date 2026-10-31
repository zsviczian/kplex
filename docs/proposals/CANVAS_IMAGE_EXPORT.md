# Canvas image export

PR #238 uses the existing branch, refreshed after merging #237 (`f99aa39`). Native feasibility preceded implementation; see the [investigation](../validation/canvas-image-export-238-feasibility-2026-10-30.md).

## User workflow

Compass, Mind Map and Facets offer **Export image** in the canvas toolbar, canvas context menu and command palette. The stable published command is `kplex-export-canvas-png`; the internal action is `view.export.image`.

The native dialog previews the prepared PNG and offers **Copy PNG** and **Save PNG**, 1×/2×/3× resolution, **Transparent background**, and two explicit scopes:

- **Whole canvas** (default): existing painted scene bounds, including content outside the camera viewport, with crop padding.
- **Current viewport**: the current canvas framing, excluding surrounding Obsidian controls.

Transparent output removes the canvas background and Compass tint while retaining node, connector and Facets region styling. The saved/copied PNG contains alpha pixels.

Both scopes preserve filters, collapsed branches, current styles, decoded thumbnails, SVG connectors/labels, Compass tint and Facets regions. Whole canvas retains internal scrolling areas' current clip and scroll position; hidden rows are not unrolled. The dialog warns when scrolling areas contain additional hidden content. Neither scope expands branches or constructs a different graph.

Both export dialogs reuse `StyleEditorModal`, Obsidian `Setting` controls and the shared clipboard-success feedback handler. There are no export-specific layout or preview CSS rules. Markdown uses Obsidian `TextAreaComponent` with the existing shared source-preview style; PNG uses native `markdown-rendered` / `image-embed` markup. Successful copy closes the modal and displays an Obsidian `Notice`; failure leaves the modal open. Filenames are suggested only to the native save dialog, where the user can edit them.

Desktop save hands the prepared PNG to the native download destination flow. Mobile save uses file sharing only when the host advertises that capability; otherwise it is unavailable. Copy is similarly capability-detected. Success text distinguishes system handoff from a confirmed file write.

## Rendering and ownership

`captureCanvasImage` accepts the exact source element and lifetime guard, not a plugin, graph or source reader. It captures immutable strings/geometry from existing rendered HTML/SVG, resolves computed and pseudo-element styles, preserves internal scroll offsets and embeds available local fonts and decoded bitmap pixels. It yields between bounded batches. A source mutation or camera/scene/style change retires an unfinished capture. Once captured, its pixels remain frozen: live presentation/theme refreshes do not invalidate later scope, resolution or background changes. Canvas/document teardown, migration, cancellation and disposal still retire output.

`renderCanvasPng` accepts that immutable snapshot and an owning document. Chromium rasterizes a self-contained SVG `foreignObject` into a detached canvas. This reuses the native HTML/SVG renderer rather than implementing another node renderer or layout engine. Scope/resolution/background changes reuse the captured data. The existing pure Compass polygon helper extends tint to full-scene bounds.

`CanvasImageExportModal` owns preview resources, asynchronous generations and cancellation. The shared `ClipboardSession<Blob>` starts clipboard writing in the actual button gesture. `pngExport` owns document-scoped ClipboardItem, desktop download and optional mobile sharing. Portable allocation/filename policies live under `src/core/plex/export/`. These services can support a later public API; this PR adds no public API or CLI.

The source canvas, camera, selection, scroll offsets, native editor and per-canvas session are never written by the export services. Concurrent canvases retain separate snapshots, modal lifetimes and actual documents/windows.

## Resource and fidelity limits

- Desktop raster: at most 8 million pixels and 8192 pixels per side; mobile: 4 million pixels. Resolution reduces to fit without substituting a viewport crop, with a visible warning.
- Capture: at most 24,000 elements / 16 million serialized characters; mobile: 8,000 / 8 million. Capture and raster each have a 20-second deadline, cancellation and explicit cleanup. Bitmap copies are at most 1024 pixels per side. Font resources are limited to 24 faces, 3 MB per resource and 6 million serialized characters.
- Capture yields after approximately 8 ms of traversal work; browser-native style, image decode and encoding calls cannot be preempted. Budgets reduce allocations but are not a guarantee of an exact process-memory ceiling.
- No remote resource fetch is introduced. Only local `app:`, `blob:` or `data:` font resources are embedded. CSSOM-unavailable/programmatic fonts may fall back, with a warning. Opaque iframe/webview/media and unavailable/tainted/not-yet-decoded bitmap content are omitted, with a warning. Internal editor scroll content retains its current clip.
- Arbitrary community-theme effects and custom CSS remain a fidelity risk. The service snapshots browser-resolved paint, not all possible browser document behavior. It exports PNG pixels, never hidden HTML or vault metadata.

## Validation

Run `npm run verify:obsidian:canvas-image` after exact-build staging in the explicitly selected disposable Small vault. The committed driver checks all three views, both themes, 50/100/200% zoom, native clipboard, exact preview-to-file bytes, menu/toolbar/palette, independent popout copy/save, cancellation, frozen scope round trips after presentation/style changes, actual PNG transparency, dialog spacing/help links and actual native editor preservation. It observes reads, parses, acquisitions, rebuilds and semantic refreshes, and restores its owned fixtures/settings/workspace/clipboard/observers.

The real-browser suite exercises off-camera pixels, SVG paint, loaded bitmaps, clip/scroll, frozen snapshots, zoom invariance, omitted opaque content, external-font no-fetch, independent document ownership, cooperative traversal and allocation/cancellation limits. Pure tests cover raster policy, filenames, Blob clipboard state and native handoff capability/cleanup. Full repository and exact-build host verification remain required; final receipts belong under `docs/validation/`.

Minimum-host, Windows/Linux native output, physical Android/iOS sharing and physical touch remain separate acceptance environments. macOS desktop evidence does not certify them.
