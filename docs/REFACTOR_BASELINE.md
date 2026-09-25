# Refactor baseline — C00

Recorded 2026-09-25 from branch `kplex-refactor`, commit `9b8e8c0`. The working tree was clean before this checkpoint. This document records existing behavior and test coverage; it does not propose implementation changes.

## Reproducible build and test lane

- Node: **22.22.2** from `/Users/zsviczian/.local/share/fnm/node-versions/v22.22.2/installation/bin`. The default shell selected Node 18.14.0, which is outside the package engine range.
- `npm test`: **pass**, reporting indexing 1–33/P1–P17, section expansion 34–50, cache/predicate/incremental 51–59, creation/imagery 60–66, additive ontology 67–68, and placeholder/materialization groups.
- `npm run build`: **pass** against installed Obsidian typings. The build produced `dist/main.js`, `dist/manifest.json` and `dist/styles.css`.
- `tests/indexing.test.mjs` transpiles a selected source list into a temporary CommonJS harness. It combines behavioral assertions with many source-text assertions and installs Obsidian/UI stubs plus a fake `window`. This suite cannot prove that extracted modules are host-independent or that the real desktop UI works. C01 must map and replace source-placement checks deliberately.
- No architecture checker, separate DOM interaction suite, portable-core import test, or automated Obsidian test runner exists yet.

## Test vault and host availability

The registered vault `kplex-test` is at `/Users/zsviczian/Obsidian/kplex-test`. Its plugin directory contains `main.js`, `manifest.json` and `styles.css` for `k-plex` version 0.0.5, plus plugin data. It currently contains one Markdown file, so it is suitable for a smoke test but not a large-vault baseline. The initially installed `main.js` checksum differed from this checkout; the exact built `main.js` was staged on 2026-09-25 and the previous copy was backed up under `/private/tmp/kplex-c00-h90ffebw/main.js`. The staged and built SHA-256 both equal `9072d8e3cd8bc8c5050ba082fe20f4da70cc0f83a3d79b09fa2f56df0e3f9df1`. Manifest and stylesheet were already identical. Plugin data was preserved.

Obsidian CLI is now registered at `/usr/local/bin/obsidian` and connects to the explicitly selected test vault. It reports Obsidian **1.14.2 (installer 1.14.0)** and an enabled K-Plex plugin with registered commands. After staging the exact build and enabling the plugin, `obsidian vault=kplex-test command id=k-plex:excalibrain-start` succeeded. `dev:dom selector=.excalibrain-app total` returned **1**, and DOM text contained K-Plex, its relationship zones, the `Welcome` center and one child. `dev:errors` reported **No errors captured**. `dev:console level=error` did not provide console evidence because the debugger was not attached; its output said so despite a zero exit status.

The CLI screenshot command wrote `/private/tmp/kplex-c00-active.png`, but the image showed the separate Welcome Markdown window rather than the active K-Plex view found through DOM inspection. It is **not** counted as a K-Plex visual pass. The basic desktop render smoke test passed; visual geometry, interaction, pop-out, console capture and performance checks remain pending. C02b should select the correct target window and assert screenshot content, not merely the command's exit code.

The test vault is outside the repository's current writable workspace roots. Future automation must check its write permissions before staging artifacts and must target this vault explicitly. A personal/default vault must never be used as an implicit fallback.

## Invariant-to-evidence map

| Current behavior to preserve | Automated evidence now | Host/device evidence still needed |
| --- | --- | --- |
| Markdown ontology, all relationship roles and directions, explicit vs inferred, frontmatter over conflicting body evidence, hidden relationships and explainability | Compatibility fixture assertions 1–33 and `RelationEvidence`/`RelationResolver` tests inside `tests/indexing.test.mjs`; fixture README lists source forms | Open representative relationship details and source navigation in the test vault. |
| Folder and tag topology, URL nodes, unresolved/virtual targets, Daily Notes Date resolution and attachment navigation | Fixture and visibility assertions; full-vs-incremental comparisons for structural nodes | Exercise each node kind as center in Obsidian; attachment behavior needs a host smoke check. |
| Search order, aliases/display names, title-field fallback and sort behavior | Search, title and patch assertions in the indexing suite | Search dropdown keyboard/focus and rename behavior in the live UI. |
| Graph publication, per-file patches, cancellation, rename, semantic no-op and dirty backlog on hidden views | Runtime P-series tests, including cancelled staged patch, canonical page identity, rename and hidden-surface coordinator assertions | Startup burst, hide/reveal, close last view and reload; large-vault and physical iOS work remain unmeasured. |
| Persisted snapshot/cache and settings compatibility | Warm cache and restore tests in the indexing suite; `IndexSnapshot.ts` and `IndexedDbCache.ts` | Reload the pre-existing test-vault plugin data, then cold/warm/interrupted runs on a disposable large fixture. |
| Structured Plex layout, gate meanings, filters/lenses, sections and sibling scale | `buildScene`/section/lens assertions; sibling size endpoints 30% and 85% are exercised | Inspect zones, scroll packing, gate counts, filtering and section fold/camera in main window and pop-out. |
| Explicit deletion command navigates immediately; external file disappearance preserves a ghost without commanding navigation | Source checks for history cleanup/fallback and command order; incremental ghost tests | Delete through K-Plex and separately through the Vault in a disposable fixture; inspect history and remaining references. |
| Sidecar ownership, linked/pinned leaves, modal/popover behavior, keyboard and touch | Source assertions protect some Sidecar and UI call paths; no dedicated real-DOM interaction suite | Native Sidecar, modal/body portal, focus/Escape, pop-out and physical phone/tablet checks. |

The automated suite covers substantial semantics but does not fully cover every host interaction above. A test reporting PASS is not evidence for a listed pending host/device check.

## Instruction conflicts resolved from the current implementation

1. `AGENTS.md` previously treated all file deletion as non-navigating in one long paragraph, while its later deletion invariant and `src/main.ts::deleteNode()` navigate immediately after an explicit K-Plex delete. The `tests/indexing.test.mjs` source checks also enforce immediate history cleanup and fallback before asynchronous property cleanup. The instructions now distinguish an external Vault deletion event from the explicit K-Plex delete command. This is an instruction correction, not a runtime behavior change.
2. An expanded-view bullet said sibling descendants always use `0.85`, while the layout contract, `src/ui/layout.ts::siblingScale()` and `src/ui/PlexGraph.tsx` use the configured `siblingRelativeSize` (30%–85%). The indexing test checks the endpoint effect on sibling nodes. The bullet now reflects the configurable implementation. Physical rendering of expanded sibling descendants is still pending.

If host observation later disagrees with either conclusion, record a separate product decision before changing semantics.

## Extraction inventory

| Area | Current seam or repeated mechanic | Refactor implication |
| --- | --- | --- |
| Search/selection | `FuzzySearchInput.tsx` already shares keyboard/selection/portal mechanics between graph search and relationship creation; it imports `ObsidianIcon`. | C03–C05 should remove the transitive host dependency and preserve consumer-specific defaults. |
| Tooltip/touch | `LongPressTooltip.ts` has one document-scoped delegated tooltip and click-suppression owner. | A new action primitive must reuse it, with no second gesture handler. |
| Floating UI | `FuzzySearchInput`, `PlexFilter` and `RelationPopover` each manage positioned/portaled content and dismissal to different degrees. | C04 should compare owner-document, stacking and focus needs before sharing mechanics. |
| Settings/managers/dialogs | `settings.ts` has native declarative pages and searchable managers; dialogs are split between Obsidian `Modal` and React content. | C06/C07 are conditional. Do not replace native settings to force reuse. |
| Core data | `types.ts::GraphPage` holds `TFile`; `GraphState` holds mutable page/evidence maps. | C08 introduces host-free read contracts while preserving existing persisted IDs. |
| Indexing | `GraphBuilder` collects Obsidian data and compiles evidence; `GraphIndex` publishes, patches, persists, searches and resolves titles. | C11–C18 must split collection, compilation, publication and presentation one behavior at a time. |
| Predicate/lens | `GraphPredicateEngine` directly takes `App`; `GraphLens` takes concrete `GraphIndex`. | C09/C10 need a lazy property provider and narrow read/evidence interface. |
| Layout/expansion | `layout.ts` already exports `PlexScene`; `PlexGraph.tsx` performs substantial filtering and expanded-child derivation. | C19/C20 should evolve the existing scene and distinguish projection from orientation/layout. |
| Lifecycle/host actions | `main.ts` owns startup, dirty revisions, view demand, Sidecar, navigation and mutations. | C15 and C21–C24 need scoped services, with the plugin retaining composition/lifecycle. |

Representative direct or transitive host imports occur in `GraphBuilder`, `GraphIndex`, `IndexSnapshot`, `IndexedDbCache`, `MetadataParser`, `fieldParser`, `SectionExpansion`, `GraphPredicate`, `PlexGraph`, `App`, `ObsidianIcon` and the modal classes. `RelationResolver` has no Obsidian import but calls `window.setTimeout`; the parser does likewise. This is an initial seam inventory, not a complete dependency graph. C02's checker must establish that graph mechanically.

## Performance baseline procedure

The current `kplex-test` vault cannot produce representative large-vault numbers. Use a separate disposable test-vault copy or generated fixture with at least 20,000 files and 100,000 graph/search entries. Record the fixture generator/revision, device and OS, Obsidian version, K-Plex build hash, settings and cache state. Preserve the same fixture and settings for before/after comparisons.

Measure cold first build, warm snapshot restore, one prose-only edit, one semantic Markdown edit, rename, hide/reveal catch-up, search query extension, lens toggle and presentation-only pan/zoom/sort. Record wall-clock completion **and** browser-task/paint responsiveness where available; count body reads, full vs incremental builds, cache hits, maximal synchronous slice and memory/peak footprint, especially on iOS. Use several runs and report spread rather than one number. Record the exact start/stop event for each timing. Do not write high-volume permanent logs or include private vault contents in committed results.

Timing tolerances and before/after numbers remain **pending** until the baseline is measured in a capable host. As invariant checks, presentation-only actions must cause zero semantic rebuilds; a per-file edit must not scan all evidence or reread the entire vault; fresh warm restore must not reparse every body. Desktop emulation does not stand in for physical mobile memory/touch validation.

## C00 status and next evidence

C00 is **Review**: repository build/tests, code inventory and instruction conflicts are recorded; CLI connectivity and an exact-build desktop render smoke test pass. Representative geometry/interaction and large-vault performance measurements are still outstanding. Use C02b's host runner when available, or perform controlled checks against the exact built plugin in `kplex-test`. Record those results here and in the plan action log before marking C00 Done. Portable C01 characterization can proceed independently while host checks wait, but no semantic extraction should be accepted as complete without its applicable host baseline.
