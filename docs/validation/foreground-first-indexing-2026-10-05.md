# Foreground-first indexing — implementation and validation

Implementation and maintainer acceptance are complete. All ten implementation checkpoints were handled within existing owners; the maintainer reports successful main-vault testing on desktop, Android phone and iOS. C15–C26 remain paused. [Exact candidate evidence](foreground-first-indexing-candidate-2026-10-05.json) and [baseline](foreground-first-indexing-baseline-2026-10-05.json) retain hashes, counters and timing semantics.

## Scope and behavior

This feature implements `docs/INDEXING_OPTIMIZATION.md` within the existing GraphIndex, GraphBuilder and source-acquisition owners. Filename/path Find and bounded first-order host previews are independent of durable source work. A complete compatible active schema-3 snapshot publishes pages/relations before source inventory and private evidence hydration. Provisional presentation grants no write or negative evidence authority.

The shared priority boundary accounts direct mutation, navigation, visible changes, background indexing and maintenance. Cooperative pauses occur outside writer lanes and IndexedDB transactions. Background parsers, acquisition owners, builders, chunk reads, search preparation and snapshot waves keep their private progress. Foreground editable pairs acquire only document endpoint facts and retain selected source, physical/cache, policy and host-environment fences.

Requested centers certify direct incidence without certifying every structural parent’s children. A separate optional pass admits bounded parent closures using authenticated count-only derivative reads. Unknown connection degrees sort after known totals; partial gate counts show **≥n** or **…**, with localized availability copy. Neither indication grants complete incidence. Existing memory ceilings, schemas, persisted settings and semantic grammar stay unchanged.

## Review corrections

- Foreground synthetic pruning returns pending until global negative materialization is authenticated; it cannot join the background inventory it pre-empts.
- Pair staging rejects publication supersession, while published pair lifetimes survive unrelated coherent graph promotion. Selected file/cache and host-environment drift still revoke writes.
- Foreground file commits fence late evidence, retire affected older scopes and retain neutral-source recovery after interrupted warm hydration.
- File/folder create, rename and delete update disposable filename/backlink/preview owners during startup and steady state. Old path aliases cannot pass current-TFile eligibility.
- Ordinary MetadataCache changes advance their source revision before starting visible preview work. Exact saved-pair overlays refresh locally after selected observations change; unrelated saved edits remain retained.

- Trusted page-chunk corruption now starts the existing neutral-source recovery path when fast navigation deferred inventory. Evidence failures after navigation retain the coherent graph. Managed metadata events independently fence late captured evidence even when the coordinator dirty revision is unchanged.
- A native saved-link dialog regression exposed stale in-flight pair coalescing. Current physical/cache/event/policy observations alone share tasks; new observations drain the retired finite writer, retain their own input fence and certify independently. Original callers keep their cancellation errors.

## Evidence and validation status

The [clean-base measurement](foreground-first-indexing-baseline-2026-10-05.json) is one comparable foreground run on the existing 20,015-note `kplex-test` vault. Strict readiness was **89.950 s**, source authority **63.861 s**, and the first observed center DOM **2.416 s** after plugin disable/enable began. The persisted preview milestone was **2.210 s** relative to onload. This is a sequential baseline, not a statistical or actual-paint benchmark.

The exact final candidate passes one comparable restart on the same vault, with **64/64** valid foreground samples and normal renderer throttling. No Markdown/source body reads, parsing, repairs or full builds occur; source heads and settings remain unchanged. The timed driver starts immediately before matched plugin disable/enable; diagnostic milestones below are relative to onload.

| Milestone | Candidate after onload |
| --- | ---: |
| Layout ready | 31.3 ms |
| Filename/path Find ready | **58.5 ms** |
| Snapshot catalog read | 186.9 ms |
| Host first-order preview | **1,224.3 ms** |
| Persisted preview available | 1,260.2 ms |
| Complete cached pages/relations navigable | **4,178.6 ms** |
| Private evidence hydration starts / ends | 4,178.6 / 10,447.8 ms |
| Source inventory starts | 4,539.0 ms |
| Source authority | **62,492.3 ms** |
| Requested canonical scope / strict ready | 62,512.0 / 62,512.2 ms |

Measured from disable/enable, first observed center DOM is **254.3ms** versus baseline **2,416.0ms**; strict readiness is **62,675.1ms** versus **89,950.3ms**, and source authority **62,674.2ms** versus **63,860.6ms**. The result demonstrates the intended ordering: physical Find, host preview and navigable cached graph precede certification; evidence runs privately after graph publication and overlaps source work. The baseline has no matching new Find/navigation milestones. One sequential trial per build does not establish a statistical or causal total-speedup claim. Center DOM observation is neither actual paint nor proof that all relationships have rendered.

Focused actual IndexedDB tests cover blocked source/evidence warm availability, exact editable pair preparation, successful promotion and interrupted source-backed recovery; stale mtime/membership/settings and partial checkpoints; 4,096-owner shared tag/root direct scopes and optional ordinary siblings; selected host/environment drift; synthetic-node negative proof; and saved-pair refresh. A 4 MiB single-line workerless parser test proves pause/foreground completion/resume equality and unload cancellation.

Final `npm run verify:obsidian` passes on the corrected runtime: architecture **7**, host-free core **67**, Node **196**, UI **13**, portable sources **322**, real Chromium IndexedDB **294**, with zero failures/skips. Production indexing/settings scenarios, installed Obsidian types, real build, staged artifact hashes and native command/DOM/error smoke pass. Official lint reports zero errors and one retained legacy `Workspace.activeLeaf` deprecation warning.

The 20,015-owner actual-IDB stress passes with 7,867,137 owner checks, one direct canonical pass, zero optional root passes, exact center/evidence/degree/full-oracle comparisons and cancellation after two genuine compiler yields. Cached publication takes 162,357.6ms in this synthetic functional fixture. Observed peak heap is 417,793,800bytes; retained replay reservation 405,146,310bytes and combined bound 685,201,826bytes stay within unchanged limits. This does not measure native startup or paint.

Earlier aggregate attempts exposed old fixtures that assumed direct-center preparation awaited optional siblings or that manually assigned state granted full authority. Their canonical eventual-output comparisons remain, using actual production publication and the separate optional completion boundary. No assertions, memory bounds or test deadlines were relaxed.

The expanded desktop retest passed the document gate and four role commits, then failed attachment post-save dialog completion despite the owned property being saved. Cleanup passed. A second reproduction with bounded passive tracing shows overlapping pair refreshes for the same Markdown owner: cancellation, superseded/unsaved source preparation and a later successful replacement. This failed run is retained as regression evidence. The final correction drains older finite tasks that share document owners through the complete acquire/replay lifetime, checkpoints optional refreshes before active mutations, and leaves unrelated owners independent. Test-only wrappers preserve original Promise identity, record only bounded scalar/owned-fixture state and are removed independently.

The first large candidate preflight was excluded before any timed restart. Native graph hydration and actual source inventory had completed (`restartInventoryChecked`,20,015 coordinates, source authority), but main initial readiness remained pending. The new early physical-search await exposed an initialization handoff in which the initial task could recursively join itself through the hydration guard. The owned untimed probe was cancelled; settings, controller, diagnostic opt-in and original throttling were restored. The correction makes the owning initial task join the hydration task directly, while ordinary reactive callers retain the initial-task guard. Five extracted production coordinator regressions cover fresh, stale, failed and retained-source handoffs; the focused relationship-actions file passes 23/23. The final comparable large trial passes after complete verification of the corrected build.

## Exact-build desktop acceptance

Production `main.js` SHA-256: `201413f513efdb386a128037c7c2d2e4aaa1a956fc5192a2894ff2b5cb59ae01`. Styles remain `37efdfe8399533c2a36335adc672719677adb37adb2777250fc784de8f15cd8e`; manifest remains `e3bb9a35215af97f6a3394cf7fc8f7d2142bae06de94bb112fef5a05819cda62`. All 269 frozen runtime/test/build inputs match final verification (aggregate input digest `633e7eb328a7ef9317f5c5f8c7b6645bd7616527873117a3b5be8a76bbb214a8`). Both disposable vaults contain the accepted artifact hashes; work is uncommitted.

The final paused-acquisition probe passes all five operations: navigation27.7ms, add82.0ms, remove143.3ms, creation5.1ms, visible edit61.8ms. The actual inventory checkpoint remains held for each, zero broad flush calls occur, then background work resumes. Original renderer throttling/focus are retained. Cleanup reaches source closure, removes all owned paths/controllers/wrappers and restores settings/enablement bytes. Inclusive controlled API/DOM timings are not a large-vault or actual-paint claim.

The existing native desktop UX suite passes **31 scenarios** on that exact build, including Find, independent Plex paths, actual pointer gate/history role commits, attachment and case-sensitive URL persistence/publication/immediate unlink, retained prior relationships, image/editor/menu/layout/history behavior. Owned fixtures, settings, enablement, geometry and throttling are restored. Its deliberate test-only no-throttling setting makes it functional evidence, not comparable warm performance. No emulated or physical-mobile test was added to this run.

Two final foreground attempts were excluded before fixtures/actions because native focus activation had not settled; cleanup passed. The driver now waits at most five seconds for genuine document/window focus before any fixture or timing, and the unchanged production artifact passes. No throttling or focus assertion was weakened.

Host regression coverage additionally budgets inline tag text/ancestry and every inspected aggregate target, including irrelevant entries. Oversized metadata enrichment is omitted while center/folder availability remains; canonical background facts later replace the explicitly incomplete preview. The actual GraphIndex priority test proves optional pair refresh and visible patch consumers do not start competing writers during a held mutation.

## Definition-of-done coverage

| Items | Implementation / evidence |
| --- | --- |
| 1–2 immediate Find / host center | Physical catalog before storage, bounded canonical host preview; functional tests and native20k milestones58.5/1,224.3ms pass. |
| 3–4 navigation before source/evidence | Trusted warm page/relation publication at4,178.6ms precedes private evidence and source authority62,492.3ms; blocked actual-IDB tests pass. |
| 5–9 foreground pre-emption / resumption | Scheduler/parser/acquisition/graph/storage safe checkpoints; real-IDB mutation tests and native five-operation pause/resume pass. |
| 10 URL enrichment may remain pending | Filename/path search has independent physical ownership; host preview grants no URL/evidence completeness. |
| 11–12 large tag/root | Actual-IDB 4,096-owner deferred scope and 20,015-owner stress preserve center incidence without unrelated sibling closure. Final stress rerun passes. |
| 13 invalid snapshot recovery | Exact membership/settings/TFile checks, corruption cases and retained neutral-source recovery pass in actual IDB. |
| 14 canonical eventual convergence | Full compiler/parser oracle comparisons and positive/negative pair provenance tests pass; native source closure and final large run pass. |
| 15 verification | Complete aggregate, real build and exact-artifact native acceptance pass. |

The final native audit finds both test vaults ready, original throttling enabled, zero active priority owners/waiters, no acquisition inventory, owned fixtures or controllers. The startup driver restores saved configuration without changing the visible measured center; the main agent additionally restores the original visible center, waits for its canonical scope, then restores the captured settings bytes again to undo recent-history changes. The final configuration hash is recorded in candidate evidence. This cleanup is outside the measurement and does not modify tested runtime/driver inputs.

## Cold throughput decision

The existing parser worker and sequential memory budgets are retained. The 4MiB single-line workerless fixture exercises the actual cooperative parser, yields to foreground work and resumes to the identical canonical result; its approximately110ms inclusive observation includes scheduled waits and is not native cold throughput. The comparable warm trial counts body reads/parses separately. No measured representative cold bottleneck currently justifies a new desktop parser pool or IndexedDB concurrency change. Native cold20k throughput and quantitative physical-mobile scheduling remain unmeasured; no database was cleared to manufacture those results. IO10 closes as a reviewed conditional follow-up rather than an unproven concurrency optimization.

## Native procedure

Run full `verify:obsidian` against `kplex-test-small`, then `verify:obsidian:foreground` and the existing desktop UX driver serially with the same explicit test-vault/config/report variables. The foreground driver pauses the actual acquisition checkpoint outside transactions, exercises navigation/add/remove/create/visible edit, then resumes canonical reconciliation. It owns its fixture folder, restores settings and enablement bytes, and removes its controller/wrappers. Native API/DOM completion is separate from trusted pointer/touch or actual paint.

Reserve the existing large vault for one exact-build warm candidate measurement with `scripts/testing/obsidian/startup.mjs`, `KPLEX_SI5_WARM_CENTER=Welcome.md` and one restart. Do not overlap it with browser/native drivers, change renderer throttling, reset caches or count excluded focus trials.

## Maintainer acceptance — 2026-10-05

The maintainer reports: “Tested on my main vault, tested on desktop, android phone and iOS. All seems to work very well.” This closes the main-vault and physical-device acceptance gate and authorizes a commit and pull request. These are qualitative maintainer results; per-device timings, exact deployed hashes and individual workflow traces were not supplied. They do not change the recorded automated evidence or establish additional numerical performance claims.

No further manual test is required before the requested commit/PR. Dedicated popout migration/rename/delete during hydration and native cold20k profiling remain optional follow-up coverage, not newly claimed passes. C15–C26 remain paused; merge and release are not authorized.
