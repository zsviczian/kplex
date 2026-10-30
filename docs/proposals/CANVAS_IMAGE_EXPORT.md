# Canvas image export — implementation brief

**Specification-only draft. No runtime feature code or tests yet.** Starting point: K-Plex 0.3.1, main at `9e203ed`. Before implementation refresh from current main, read AGENTS.md, CONTRIBUTING.md, actual view/renderer contracts, and relevant tests.

## Outcome
Add an **Export image** UI action to every K-Plex canvas (Compass, Mind Map, Facets) with **Copy PNG** and **Save PNG**. Aim to capture the entire **currently constructed scene**—including materialized off-viewport content—while respecting fold/filters. A *viewport screenshot* is a distinct secondary scope. Do not silently expand hidden branches or build the full graph.

## Implementation feasibility gate
- Inspect actual mixed HTML/SVG rendering, transform/camera, connectors, labels, decorations, CSS/theme, fonts, images and multiple windows. Prove a native sample PNG of the rendered scene at different zoom levels **before** choosing a capture pipeline. Obsidian `dev:screenshot` alone captures the window, not the desired independent canvas.
- Reuse committed scene/layout and existing renderer, avoiding a second layout/classification or indexing pass. Verify potential offscreen DOM/raster/SVG solutions on the actual supported Electron host; avoid unverified screenshot APIs.
- If faithful whole-scene export cannot be delivered safely, document the blocker and offer explicitly named viewport PNG instead, with a follow-up plan; do not mislabel a cropped screenshot as full scene.
- Include rendered edges/labels/decorations, safe crop padding, background/theme, sensible max pixel/count limits; errors should be actionable, non-freezing and cancellable. SVG export is optional only if faithful without duplicating rendering.
- Target the specific owning canvas and document, including popouts; preserve camera, selection, editor, scroll and foreground tabs. No remote service, unrelated-window capture, note edits or settings mutation.
- Make the exporter a reusable service for a future public API, but do not implement a public API or CLI in this PR.

## Acceptance
1. UI export works for all three views in light/dark themes; saving and clipboard actions work with supported host semantics.
2. Test Compass, Mind Map, Facets at zoom 50%, 100%, 200%; offscreen scene bounds, folded and filtered content, labels, scroll/clip and simultaneous canvases/popouts.
3. Image matches the current committed K-Plex presentation. No hidden note bodies or other tabs leak.
4. Zero additional Markdown reads/parses, source acquisition, semantic indexing/rebuilds; bounded resource usage and disposed temporary DOM.
5. Real build, Obsidian scanner, architecture/behavioral checks and native tests; report exactly what passed.

**Out of scope:** Mindmap Builder Markdown export (separate PR), new graph layout engine, automatic expansion, HTTP service, public API/CLI.