# Mind Map Markdown export — implementation brief

**Specification-only draft.** This branch contains a design brief; no runtime code or validation yet. Based on accepted `main@9e203ed` (0.3.1). An agent must refresh against latest main before starting, read AGENTS.md / CONTRIBUTING.md and current view/session contracts, implement on this branch, and leave the PR draft until validated.

## User outcome
From the **Mind Map** canvas, use a discoverable **Export → Copy Markdown** or **Save Markdown** action to export the **currently constructed/expanded hierarchy**, preserving its node order and Obsidian links. The result must be pasteable into [EA-scripts Mindmap Builder](https://github.com/zsviczian/ea-scripts/tree/main/src/scripts/mindmap-builder), as well as readable ordinary Markdown.

## Contract and technical direction
- Read the actual current K-Plex Mind Map session's root, occurrences and committed projected hierarchy: **do not walk GraphIndex afresh or expand additional generations**. Export selected canvas only; multiple Plexes may have different roots, views, filters, and folds.
- Follow the exact source format supported by [Mindmap Builder markdownExport.js](https://github.com/zsviczian/ea-scripts/blob/main/src/scripts/mindmap-builder/markdownExport.js) and [markdownImport.js](https://github.com/zsviczian/ea-scripts/blob/main/src/scripts/mindmap-builder/markdownImport.js). A root header `# ...`, indented `- ...` children, vault-native `[[file|alias]]` links, optional `field:: ...` relationship annotation. Verify imported hierarchy, not only string snapshots. Mindmap Builder has advanced syntax for block-id crosslinks and submaps; handle faithfully where scene data permits, or explicitly omit with a warning (never silently invent or flatten these).
- Preserve K-Plex occurrence vs canonical node identity. Repeated occurrences and cycles must serialize deterministically, terminate safely, and round-trip when supported. Distinguish branch structure from crosslinks; don't turn decorative/cycle edges into invented parent-child claims. Missing/ghost/unresolved identities need safe, unambiguous text and an explicit warning.
- Source Markdown links through Obsidian's actual link formatting/path preferences where possible. Escape headings, aliases, pipes and special Markdown characters correctly; avoid exposing unsupported private selectors.
- No write to source notes or relationships. Save to a user-selected destination via existing Obsidian UX, with overwrite confirmation. Clipboard uses the correct owning window; support popouts and avoid stale session reads.
- Shared host-agnostic export formatter may later be reused by public API; **no CLI/API implementation in this PR**.

## Acceptance
- Export whole currently expanded Mind Map and selected subtree; clearly specify which the UI action exports (prefer whole current root by default).
- Test roots, deep and wide trees, balanced left/right order, collapsed branches, duplicate occurrences, cycles, placeholders, wikilinks/aliases, mobile/popup where feasible.
- Round-trip representative output through **real Mindmap Builder parser**; verify links, labels, tree and submap/crosslink handling in tests.
- Zero additional Markdown reads/parses/acquisition/index rebuilds from export; bounded memory/time and cancellation. No saved settings/graph mutation.
- Run repository-required type, build, scanner, tests and native export checks; report tests actually run.

## Out of scope
Pixel/image export (separate PR); exporting an entire vault graph; importing Markdown into K-Plex; editing graph/note content; public API and CLI.