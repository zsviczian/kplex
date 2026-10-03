# SI4-R3 integrated correction — 2026-10-03

**Historical scoped report.** This result did not complete the original SI4 Delivery 1/2 exits: native large-vault settings readiness and runtime consolidation still needed validation. The subsequent online acceptance pass fixes warm-head observation reuse, hidden-parent visible scope expansion and attachment-triggered graph rebuilds. The [final original Delivery 1/2 acceptance report](settings-independent-indexing-si4-acceptance-2026-10-03.md) supersedes the build hashes and completion wording here; failed attempts below remain historical facts.

The online correction is uncommitted on `indexing-optimization-v2`, based on `bf0b3582bb5e39e512d7f282f78393b999d9f6a1`. It addresses the [unaccepted R3 review](settings-independent-indexing-si4-r3-review-2026-10-03.md). SI5 and C15–C26 were not started. Required automated checks and scoped native valid-facts settings/navigation/event checks pass; exact evidence and limits are recorded below.

## Implementation

Replay/compiler cancellation now reads captured policy, demand, host, source, maintenance and publication generations rather than scanning every selected host for each record. Replay still validates its active source. Shared complete host validation yields every 256 owners, closes changes to earlier owners during continuations, and performs a synchronous closing sweep after the final awaited storage/discovery fence. GraphIndex checks unnotified settings mutations at cooperative and final fences. Scope membership is a Set. No successful validation is retained across requests.

Retained scope safety is restored using the existing plain-record estimator: UTF-16 fields, complete head/family manifests, physical/observation coordinates, owner captures, structural facts, compiler ownership/index reservations and decoder buffers contribute to the estimate. Required final state is distinguished from temporary decoded pages and certificates. Deduplication retains compact IDs and existing fact/stamp references; selections are compared individually instead of serializing complete arrays. Folder topology revisions are computed once per selected folder, avoiding another repeated whole-child-list hash. Completed neighborhood certificates/owner captures are released before supplemental degree compilation; the required neighborhood compilation is reserved while the degree compilation is live.

The explicit ceilings are 8 MiB for an indivisible lookup/digest decode, 256 records and a 256 KiB target for live pages, 256 MiB for selected lookup heads, 128 MiB for discovery structural state and 768 MiB for combined private preparation reservations. A cursor page can exceed its target by one individually bounded entry. The structural ceiling admits the supported 20,015-owner entity-plus-parent fixture (approximately 122 MiB under its conservative discovery estimate). Pathological aggregate preparation is rejected without publication; the regression uses 1,100 individually permitted owner coordinates whose aggregate exceeds the ceiling. These are conservative reservations, not measured device limits or exact engine heap accounting. Single-owner/body/join guards remain.

There is no database/schema migration, alternate classifier/compiler, spill system, second persistent graph or global contributor catalog. The original main-agent folder-parent and legacy frontier test corrections remain intact.

## Deterministic scaling

`tests/source-replay.test.mjs` counts the actual production host-validity callback at increasing owner counts. The final storage await is also fault-injected to invalidate an already checked owner; it returns stale without a compilation.

| Independent empty owners | Before: validity calls | After: validity calls |
| --- | ---: | ---: |
| 128 | 1,409,664 | 15,872 |
| 256 | 5,606,144 | 31,744 |
| 512 | 22,358,016 | 63,488 |
| 1,024 | 89,298,944 | 126,976 |

After correction the fixture makes exactly 124 checks per owner. Tests enforce a per-owner ceiling and at most 2.05× growth on doubling, rather than relying on elapsed-time thresholds.

## Complete 20,015-owner production regression

`tests/source-high-degree-publication.test.mjs` acquires every owner through the actual writer with independent facts, revisions, chunks and heads in real Chromium IndexedDB. It uses production cached neighborhood/degree preparation and GraphIndex publication. Full canonical live collectors/compiler supply the independent oracle, including folder topology. Test-only evidence normalization removes generated IDs while preserving declarations and provenance multiplicity.

The default 20,015-owner run passes exact complete semantic hashing and published neighborhood/gate/sibling ordering, complete center incidence, untrimmed gate count, selected raw degrees/labels, search, relationship storage inputs and write readiness. It records zero body reads/parses/reacquisitions/full builds. Cancellation between real continuation batches neither publishes nor exposes a prefix and leaves the previous coherent view available. Smaller production tests cover dormant frontmatter/inline add/remove, Friend↔Challenger, both inference toggles, both image selectors, sorting, expansion, explanations, selected metadata freshness and overlapping settings/navigation demands.

| Measurement | Final run |
| --- | ---: |
| Independently replayable owners | 20,015 |
| Validity calls for the complete rich publication path | 11,630,401 |
| Cached request to complete GraphIndex publication | 252,580.9 ms |
| Sampled JavaScript heap peak during cached preparation | 535,842,221 bytes |
| Neighborhood reservation peak | 472,912,756 bytes |
| Combined neighborhood + degree reservation peak | 719,667,320 bytes |
| Owner/head/capture reservation | 248,586,300 bytes |
| Neighborhood structural reservation | 31,186,312 bytes |
| Neighborhood compiler reservation | 167,689,044 bytes |
| Transient decoder/batch reservation | 25,451,100 bytes |
| Atomic publications | 1 |
| Cancellation continuation yields | 2 |

Heap sampling uses Chromium `performance.memory` every 50 ms; it includes the fixture and initial graph and is not total process memory, a physical-device peak, a guaranteed maximum between samples or an actual-paint measurement. The four-minute exact high-degree publication proves supported completion, not SI5 latency/device acceptance. SI5 still requires named-hardware normal/high-degree bounds, responsive UI and physical mobile evidence.

The separate hot-key lookup regression remains exact at 20,015 owners: 770 byte-bounded pages, 769 yields, 20,015 rows, retained-work peak estimate 171,774,458 bytes, and cancellation on the first yield with no prefix. Page count increased from the old count-only 79 pages because full decoded heads/family manifests now contribute to the byte bound.

## Executed verification

Required Node 22.22.2, full installed dependencies, Git, real Chromium, Obsidian CLI and Obsidian 1.14.4 were available. `npm run verify:obsidian` completed the full `npm run verify` lane and staged the exact three build artifacts into the explicitly selected disposable `kplex-test` vault.

| Lane | Result |
| --- | --- |
| Architecture | 7/7 |
| Core | 60/60 |
| Aggregate Node | 133/133 |
| UI Chromium | 7/7 |
| Source portable | 314/314 |
| Source Chromium / real IndexedDB | 170/170 |
| Official Obsidian lint | Exit 0; existing unused `index` warning in `CachedRequestedDirectOrder.ts:183` only |
| Production TypeScript/build | Exit 0, actual installed Obsidian types |
| `git diff --check` | Clean |
| Exact-build native smoke | Pass: registered command, rendered `.kplex-app` containing K-Plex, no captured JavaScript errors |

The native verification subprocess timeout was extended to 20 minutes to accommodate the full 20k regression. Existing latency/watchdog assertions were not relaxed. Chromium profile cleanup retries the helper-process directory-write race.

Earlier attempts are not counted as passes: one unchanged 50 ms URL-heavy patch assertion measured 50.3 ms during concurrent native startup; the old plugin was then paused while portable verification ran. Two integrated large runs returned `decode-budget`, first before releasing duplicate preparation state and then in the old 64 MiB structural allowance. Their corrections are exercised together in the final green full verification. One earlier browser cleanup failed with `ENOTEMPTY` after its semantic assertions passed; bounded cleanup retries resolve that harness race. Temporary production diagnostic prefixes were removed and searched in both `src/` and the final `dist/main.js`.

## Exact native artifact identity

Obsidian 1.14.4, installer 1.14.0; macOS Darwin 23.5.0; Node v22.22.2. Source HEAD is `bf0b3582bb5e39e512d7f282f78393b999d9f6a1` with the uncommitted correction. Built and staged SHA-256 hashes match:

| Artifact | SHA-256 |
| --- | --- |
| `main.js` | `78965ca40044d7bac15c31280634b77783c96068565b9d55b45d4bfb0fa7b521` |
| `manifest.json` | `e3bb9a35215af97f6a3394cf7fc8f7d2142bae06de94bb112fef5a05819cda62` |
| `styles.css` | `e9da76ff7840cea44b77912963977f1fe2ab762b69a9853d047712d7b3270494` |

## Native semantic/event acceptance

The final exact build passes native functional probes in the registered disposable `excalidraw-test` vault (two existing Markdown files plus isolated temporary fixtures). It has the same `main.js` hash as the final full verification. The 20,015-note `kplex-test` vault separately passes exact-build rendered-app smoke; the full independently replayable high-degree semantic oracle runs in real Chromium, not native Obsidian.

Fourteen native settings/navigation observations pass: Friend↔Challenger, dormant add/remove, links-as-friends on/off, forward/inverse inference, explicit image relationship assignment, both image selectors and their precedence, latest navigation and latest overlapping saved policy. They use `saveSettings()` and the production demand/preparation boundary. The navigation probe holds B, releases its demand, publishes C and then releases B's old continuation; B does not resurrect. Counters remain **0 body reads, 0 parses, 0 acquisitions, 0 Markdown enumerations, 0 full builds**, with unchanged source counters. The final native settings/navigation run reports 14 publications across successive variants; only the latest overlapping policy is publishable.

The real Vault/FileManager event sequence passes folder/Markdown creation, target create, alias/property modification, rename, delete and recreation without calling `reconcile()`/`flush()` to drive scheduling. Repository flush is used only as a durability fence. In each measured file wave, Markdown/file enumeration, durable head paging and unrelated source inspections/visits/writes are all zero. Changed fixture bodies are read/parsed as required; referrer repair reuses its unchanged body. Root lookups are recorded separately (3–4 per wave): returning a root pointer is not an inventory scan, and current demanded semantic scopes legitimately need its structural facets. No graph full rebuild is recorded. The rename confirmation was answered **Do not update** to preserve the intended unresolved-reference scenario.

These are functional diagnostics. Temporary Electron background throttling was disabled only for the selected test renderer, with its previous boolean captured and restored. Some samples were hidden; request-to-preparation readings (about 35–462 ms across the fresh and warm variants) are not foreground latency, paint or SI5 performance acceptance. No physical-device or pop-out acceptance is claimed.

Earlier native failures remain visible: the first 20k-vault fixture attempt timed out during an unscoped folder/resolver refresh and cleanup, before settings acceptance. Small-vault probes exposed the actual missing legacy folder coordinate; it is fixed and root/nested production oracle regressions pass. Subsequent fixture setup sometimes exceeded its 60-second readiness timeout while reusing trial cache history. A derived-cache snapshot was taken before a clean-cache functional run; the restored warm-cache recheck also passes all fourteen settings/navigation observations with zero source/full-build work. The restored warm-cache file-event recheck also passes all five waves. Final cleanup restores and compares all 14 cache stores to the pre-reset snapshot, removes test controllers/fixtures and the temporary plugin, restores the original enabled-plugin list and confirms renderer throttling is back to its captured value. The exact build remains enabled in `kplex-test`; its final cleanup probe reports startup indexing at 1,688/20,015 files. This is not a native large-vault ready/performance result and remains part of SI5 startup/scale validation. A last-tab-group harness error, an obsolete resolution DTO filter (`rawTarget` belongs to `target`) and an incorrect explicit-image suppression expectation were corrected in test-only code. None of those failed probes is counted as a passing run. The old root-demand probe also counted a constant-time root lookup as a vault traversal; the final event probe centers the actual native view on its fixture and retains strict inventory/head/unrelated-source assertions.

The machine-readable [native evidence](settings-independent-indexing-si4-r3-native-2026-10-03.json) preserves exact hashes, settings/navigation observations and per-wave locality counters.

## Risk-based follow-up

The most likely remaining failure is warm startup/sync convergence or device memory/latency on unusually large/dense scopes; SI5 must measure desktop main-window/pop-out and physical iPad/Android separately. Cancellation during sync/reload and native touch require their own physical validation. This correction changes no CSS or interaction control. No physical-device result is claimed, and no commit/release was made.
