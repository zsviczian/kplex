# Public API #240: main refresh and risk-based validation

PR #239 was merged with maintainer authorization at `9c117e6`. The existing
`2026-10-30-public-api-cli` branch merges that main checkpoint at `d0b27d8`.
Runtime correction `4663cce` aligns public Markdown with the merged native preview.
#240 remains draft and unmerged. Only the disposable Small vault received this build;
the personal reference vault retains the previously deployed #239 build.

## Merge decisions and risk

Four conflicts affected package commands, export documentation, App props and PlexGraph.
All API and main test commands remain present. Native breadcrumb/PNG/all-view Markdown controls
and clipped-row rendering changes are retained. Public Mind Map export shares the native
capture, including ontology decisions, and uses its visible-ontology default explicitly.
The native probe first caught an all-labels versus visible-labels mismatch; it passed after
that correction. No assertion was weakened. Native PNG is available, but API PNG remains
truthfully unavailable; adding that API capability is outside this refresh.

The merge changes canvas publication/rendering/export integration, not indexing, source
acquisition, cache schemas or relationship classification. Focused boundary, API, configuration,
scene, export and native lifetime checks were selected. Expensive aggregate indexing suites
were intentionally omitted. Earlier full verification is historical evidence at the
[previous checkpoint](public-api-cli-240-2026-10-30.md), not an exact-head full-suite claim.

## Completed checks

- Node 22.22.2; architecture/numeric controls: 9 passed, zero boundary violations.
- Official `lint:obsidian` and actual installed-type `npm run build`: passed.
- 141 focused tests passed: public API, configuration, canvas registry, license, shared Markdown,
  PNG core/browser, viewport, ontology presentation and the native-shaped ontology editor.
- After the visibility correction, all 38 API/canvas/Markdown tests and production build passed again.
- Exact-build `publicApi.mjs`: all nine native scenarios passed on Windows / Obsidian 1.14.5.
  Independent main/popout roots/views/filters, targeted actions, Facets preset readback,
  public/native Markdown bytes, genuine GraphQL, configuration validation and confirmed one-shot
  disabled-lens import/readback, and popout-to-main session identity all passed.
- Passive reads and exports observed zero reads, parses, acquisitions, rebuilds, semantic
  invalidations and `allPages()` calls. Unknown/pending coverage remained explicitly incomplete.
- `publicApiLifetime.mjs`: both unload/reload cases passed; retained API/configuration handles
  release host ports and stay retired while the new API serves configured ontology.
- Both native probes completed cleanup and preserved settings/enablement bytes.

Exact production SHA-256:

| Artifact | SHA-256 |
| --- | --- |
| main.js | `43a2aee2175821366821a69f3b7a1c4679f6249d34019db919c1e0488643fc24` |
| styles.css | `0765c64003bd864c0e50bc21900cda4faa3871b5342388b0f7ee96284d03a55e` |
| manifest.json | `2822c38463c03ace4f017453679572d462534ce2a9c9558fd7593f259b01bfa1` |

Local receipts: `%TEMP%/kplex-pr240-refresh-native-r2-20261031`,
`%TEMP%/kplex-pr240-refresh-lifetime-20261031`. The initial failed export comparison remains
under `%TEMP%/kplex-pr240-refresh-native-20261031`; its cleanup also passed.

## Recommended acceptance, in priority order

Use the prepared Small vault for write/reload probes; see [CLI examples](../CLI.md).

1. **P0 — Canvas targeting and editor safety.** Open two canvases with different roots, views
   and filters. Enumerate IDs, inspect both snapshots/context, then navigate or select a view
   using one explicit ID. Repeat while its editor has an unsaved change. Expect only the named
   canvas to change, the normal native save/refusal behavior, and matching root/view/revision
   readback; the other canvas must remain unchanged. Omitting an ID with multiple eligible
   canvases must report ambiguity.
2. **P0 — Configuration durability and stale reviews.** Export a representative preset/lens,
   validate it and inspect a preview before confirming once. Verify exact durable readback
   after reload; dependency lenses remain disabled and notes/ontology are untouched. Change
   the reviewed target before applying a second preview: expect stale rejection with no partial
   write. A saved-but-refresh-pending receipt must not be replayed as an unsaved operation.
3. **P1 — Read/export and window lifecycle.** Try ontology, bounded graph/GraphQL reads and
   strict-completeness reads while indexing is incomplete: configured ontology stays available,
   partial coverage is honest, and strict reads fail explicitly. Compare public Mind Map Markdown
   with the native preview at its visible-ontology default, including a selected subtree, folds
   and filters. Move a popout back to main: canvas identity/root persist; after plugin reload,
   old API handles return `API_UNAVAILABLE` and fresh handles work. Prioritize macOS here.

Minimum Obsidian 1.13, physical mobile and real two-device Sync remain distinct release checks.
No actual-paint or comparative performance result is claimed. Broaden indexing validation if
subsequent changes touch index/source/storage/semantic owners or introduce unexplained work.
