# Export preview aspect ratio and canvas menu — PR #238

## Changes and risk assessment

The previous preview set both HTML width and height. Obsidian’s native image embed constrained the width while leaving the explicit height intact, distorting wide diagrams. The preview now sets logical width only and preserves the decoded PNG’s intrinsic aspect ratio. Decode-before-replace and stable logical width still prevent transient scale-change jumps. No CSS or new UI components are added.

The bare-canvas context menu uses the existing native submenu adapter for **Export**, containing exactly **Canvas to MindMap Markdown**, **Canvas to image**, and **Breadcrumbs to Markdown**. Node menus no longer offer Markdown export. Published Markdown/PNG commands and the image toolbar control are retained. Breadcrumb copying shares the Footprints formatter and ClipboardSession construction; it reads the current native view’s memory-only trail, newest first, including repetitions. The existing Footprints controls are unchanged. Canvas-menu copy shows truthful Obsidian Notice feedback and retires its pending feedback on unmount.

All four new menu labels are translated in all eight catalogs. Ontology export semantics remain unchanged.

The changed paths are image presentation, native menu composition, and explicit clipboard formatting. There is no indexing, source-acquisition, graph-semantic, persistence or scheduling change. Full indexing/aggregate verification is intentionally omitted under AGENTS.md’s risk-based policy. This follow-up uses focused build/lint/menu/browser/native checks; its commit skips the aggregate CI workflow without changing any workflow or weakening assertions.

## Validation

- `npm run build`: passed against actual installed Obsidian typings on Node 22.22.2.
- `npm run lint:obsidian`: passed.
- Focused `node --test --test-concurrency=1` run over `canvas-menu`, `plex-footprints-ui`, `canvas-image-export`, `canvas-image-export-browser` and `localization`: 51 passed, zero failed. This includes native-submenu/flat-fallback grouping and dispatch, empty-trail disablement, Footprints repetitions/order/link kinds/clipboard failure and retirement, actual PNG transparency/crop/zoom pixels, and all catalogs. An initial sandboxed invocation could not open the local Chromium socket; the permitted browser run passed.
- `npm run check:architecture`: nine checks passed; 220 migrated roots, 409 reachable files, zero violations; numeric controls retain shared ownership.

The exact package passed five native UI cases with cleanup on macOS Obsidian 1.15.0 (installer 1.14.0), Node 22.22.2:

- The actual native Export submenu contains exactly the three requested actions. Markdown opens its preview; breadcrumbs copy the current native-view trail to the real clipboard.
- A wide PNG of 1670 × 454 pixels displays at 518 × 140.8203125 CSS pixels: its intrinsic aspect ratio is preserved within one pixel. The assertion compares displayed proportions with actual decoded PNG dimensions.
- Five dialog measurements while changing 3× → 1× → 2× were identical: 560 × 533.15625 CSS pixels, y = 170.921875. Each scale also passes the aspect-ratio assertion.
- Viewport → whole-canvas switching preserves aspect ratio and enabled actions. Trusted PNG Copy closes the dialog and shows the Notice; current center, camera, session, selection, scroll and editor bindings remain unchanged.

The focused mode (`KPLEX_IMAGE_CURRENT_SCENE_ONLY=true`) uses an already constructed disposable canvas and creates no notes/views or source demand. It restores clipboard and temporary menu observers. A preceding fixture-based smoke attempt failed with “Owned canvas still preparing”; cleanup passed. That failure is retained separately and is not counted as a pass. The focused mode validates the affected UI directly without weakening any capture or fixture assertion. The earlier full image-export matrix remains historical coverage, not a new full-matrix claim.

[Native receipt](export-preview-and-menu-238-2026-10-31.json) records exact artifact/module hashes and all five cases. No new CSS, semantic/schema changes, full indexing run or public API.
