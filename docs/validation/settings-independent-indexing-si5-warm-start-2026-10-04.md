# SI5 warm-start measurements — 2026-10-04

**Before-correction evidence.** The proposed minimal consolidation below has since been implemented and retested; [current correction report](settings-independent-indexing-si5-minimal-warm-correction-2026-10-04.md) records results and further unimplemented candidates. The original timings/counters here remain unchanged.

The implementation checkpoint is **`62c728393440aa3dfb57869ece83c4060092bcba`**, committed before instrumentation. The diagnostic/progress changes are uncommitted. No optimization, push or release was performed. [Machine-readable phase/counter evidence](settings-independent-indexing-si5-warm-start-2026-10-04.json) preserves raw floating-point timings, exact operations, owner overlaps, retained-memory reply and failed/excluded attempts; repetitive label streams are summarized with first/last/count/monotonic checks. Original full label streams remain at the recorded temporary paths.

## Scope and verdict

The maintainer accepts the previous extreme-vault cold behavior. The ~20,000-contributor hub `decode-budget` result is a known stress limit outside the SI5 critical path. The earlier bounded canonical projection proposal is withdrawn from this closeout; no projection redesign, new storage layer, increased memory limit or further cold optimization is planned. Physical iPad/Android validation and final SI5 audit remain pending.

**Warm restart is dominated by source-authority validation.** The final exact-build foreground pilot observes strict readiness at **77,540.7 ms** from before disable/enable. The production callback records strict readiness at **77,369.2 ms from onload**. Source authority arrives at **70,871.3 ms from onload**, requested semantics at **70,916.2 ms**, then full snapshot completion at **77,368.6 ms**. This accounts for the delay rather than inferring it from a total-minus-six-seconds subtraction.

The five owner loops all visit the **same 20,015 current owners**. Three perform substantial validation; coordinates and resolution dirty-flag reconciliation are inexpensive. Dependency checks occur **40,030 times**. Three core validation loops issue **120,090 source-head point reads**, with requested semantics adding 36 for **120,126 total**. The host-comparison phase authenticates durable facts, including **484,178 posting point reads**. No Markdown reads, parses, reacquisitions, source repairs, source rewrites or full graph builds occur.

## Environment, identity and method

Node 22.22.2; installed Obsidian types 1.13.0; Obsidian 1.14.4 (installer 1.14.0); Darwin 23.5.0; Apple M1, eight logical CPUs, 8 GiB RAM. Disposable `kplex-test` has 20,015 Markdown notes, 20,016 physical files and 207 folders. Snapshot contains 20,709 pages, 20,709 relation records and 715,032 evidence records. An existing `Welcome.md` center avoids the excluded hub. This is a **warm plugin disable/enable**, not a whole Obsidian process launch.

| Final installed artifact | SHA-256 |
| --- | --- |
| main.js | `3e9f586b2fd5b8cc506d2ff08fde4e889d4c9304fc4585186a49872e90f45833` |
| manifest.json | `e3bb9a35215af97f6a3394cf7fc8f7d2142bae06de94bb112fef5a05819cda62` |
| styles.css | `e9da76ff7840cea44b77912963977f1fe2ab762b69a9853d047712d7b3270494` |

Driver checks exact installed/build hashes, unchanged streaming source-head digest, settings and enabled list. Native forwarding wrappers preserve original return/request/promise identity, control flow and ordering. They measure operation counts, not individual request latency or bytes. Detailed diagnostics require an explicit opt-in before enable; normal startup retains only phase progress. Owner identities stay private and are discarded at strict readiness or unload. No high-volume console logging, network access or diagnostic persistence was added to production.

The final pilot passes **79/79 foreground samples**, with zero hidden/document-unfocused/window-unfocused samples; normal background throttling remains enabled. `caffeinate -d -i` prevents idle sleep only. No timing comparison includes background trials. Instrumentation overhead has not been independently measured by a matched uninstrumented A/B, so these results establish work attribution, not a claimed speedup.

## Exact final-build phase timings

Milliseconds below are relative to onload, displayed to 0.1 ms; JSON retains native precision. Source and hydration lanes overlap: **do not sum lanes**. `source-authority` is an await of source work; source `complete` is idle while hydration finishes, not 6.498 seconds of additional validation.

| Lane | Phase | Start ms | End ms | Elapsed ms | Processed / denominator |
| --- | --- | ---: | ---: | ---: | ---: |
| hydration | metadata | 29.0 | 78.3 | 49.3 | 0 / — |
| hydration | preview | 78.3 | 462.6 | 384.3 | 0 / — |
| source | source-inventory | 403.5 | 406.5 | 3.0 | 0 / — |
| source | source-coordinates | 406.5 | 411.2 | 4.7 | 20,015 / 20015 |
| source | dependency-upgrade-validation | 411.2 | 12146.2 | 11735.0 | 20,015 / 20015 |
| hydration | preview-search | 462.6 | 644.6 | 182.0 | 0 / — |
| hydration | source-authority | 644.6 | 70872.0 | 70227.4 | 0 / — |
| source | host-metadata-comparison | 12146.2 | 58390.9 | 46244.7 | 20,015 / 20015 |
| source | host-retired-owner-check | 58390.9 | 58839.2 | 448.3 | 0 / — |
| source | source-reconciliation | 58839.2 | 70549.0 | 11709.8 | 20,015 / 20015 |
| source | source-retired-owner-check | 70549.0 | 70865.2 | 316.2 | 0 / — |
| source | dependency-completion | 70865.2 | 70866.5 | 1.3 | 0 / — |
| source | resolution-reconciliation | 70866.5 | 70870.0 | 3.5 | 20,015 / 20015 |
| source | dependency-final-validation | 70870.0 | 70871.3 | 1.3 | 0 / — |
| source | complete | 70871.3 | 77369.2 | 6497.9 | 0 / — |
| hydration | requested-semantics | 70872.0 | 70917.1 | 45.1 | 0 / — |
| hydration | pages | 70917.1 | 72551.7 | 1634.6 | 20,709 / — |
| hydration | relations | 72551.7 | 74143.4 | 1591.7 | 20,709 / — |
| hydration | preview-search | 74143.4 | 74434.8 | 291.4 | 0 / — |
| hydration | evidence | 74434.8 | 77368.0 | 2933.2 | 715,032 / — |
| hydration | promote | 77368.0 | 77368.6 | 0.6 | 0 / — |
| hydration | complete | 77368.6 | 77369.2 | 0.6 | 0 / — |

Host inventory enumeration is independently marked at **47.8–78.1 ms (30.3 ms)**. Node vocabulary comes with the page restore on this valid-cache path; standalone `node-vocabulary`, `file-rebind`, full resolution and legacy authoritative-search phases do not run. Resolution reconciliation is a 20,015-owner dirty-flag walk (3.5 ms), with zero repairs. Two `preview-search` intervals are distinct preview and full search preparation.

The 70,227.4 ms source-authority await contains approximately 11,735.0 ms dependency validation, 46,244.7 ms host comparison, 11,709.8 ms source reconciliation and 764.5 ms in two retired-owner scans, plus small bookkeeping. Some dependency work starts before preview availability. After requested-semantic refresh ends, snapshot completion takes **6,451.7 ms**. The expensive host phase includes durable chunk/posting authentication and selection/lease bookkeeping; its inclusive elapsed time cannot be assigned exclusively to MetadataCache or to posting I/O without another measurement.

## Availability milestones

| Exact production callback | Milliseconds from onload |
| --- | ---: |
| onload | 0.0 |
| settings-loaded | 12.7 |
| layout-ready | 26.9 |
| host-inventory-start | 47.8 |
| host-inventory-end | 78.1 |
| preview-available | 644.6 |
| source-authority | 70871.3 |
| source-authority-await-ended | 70872.2 |
| first-requested-scope-authoritative | 70916.2 |
| requested-semantics-refresh-ended | 70916.9 |
| snapshot-complete | 77368.6 |
| strict-ready | 77369.2 |

Final disable ends at 27.1 ms and enable at 121.4 ms from the native origin. Onload begins 79.8 ms after that origin. Therefore exact source authority/requested semantics/strict callbacks occur at **70,951.1 / 70,996.0 / 77,449.0 ms** from before disable/enable. Independent 100 ms native polling observes them at **71,013.5 / 71,013.6 / 77,540.7 ms**; these observations are upper bounds, not contradictory callback clocks.

Preview availability is an internal milestone at 644.6 ms from onload (724.4 ms from native origin). The requested-center DOM first appears at **791.3 ms**. Actual paint, interaction and first *usable* Plex were not measured; a visible preview is not authoritative semantics. A fresh enabled plugin exposes a new trace; strict readiness freezes completed measurements, while live status can subsequently change.

## Exact iterations and operations

| Source phase | Processed | Unique owners | Source-head get | MetadataCache getFileCache calls during phase | Cached physical comparisons | Dependency checks |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Coordinates | 20,015 | 20,015 | 0 | 0 | 0 | 0 |
| Dependency upgrade/validation | 20,015 | 20,015 | 40,030 | 560 | 0 | 20,015 |
| Host comparison | 20,015 | 20,015 | 40,030 | 20,015 | 20,015 | 0 |
| Source reconciliation | 20,015 | 20,015 | 40,030 | 20,015 | 20,015 | 20,015 |
| Resolution dirty flags | 20,015 | 20,015 | 0 | 0 | 0 | 0 |

Every pair of these five owner sets intersects in exactly **20,015 owners**. This directly confirms repeated whole-vault walks, rather than extrapolating from elapsed time. Dependency and reconciliation each perform 40,030 inspections; host comparison performs 20,015, yielding **100,075 inspect calls**. Each retired-owner phase performs 80 paged reads returning 20,036 heads (21 beyond current Markdown owners); both together return 40,072 heads. Source-head getAll/getAllKeys totals are each 161: 160 paged calls plus initial cache metadata.

Host comparison additionally reads 20,015 source chunks and 484,178 source postings, and issues 40,026 `meta.add` / 40,026 `meta.delete` calls for existing selection/lease bookkeeping. These are **not source-head/chunk rewrites**. Pages perform 20,015 comparisons against cached `TFile.stat`; total cached physical comparisons across source/graph are 60,045. Adapter physical-stat I/O is zero. Reacquisition and repair counts are zero in every phase.

Wrapped host/IDB calls are globally counted in the active time window and assigned to the current phase. They are not exclusive caller attribution. In particular, **101,299 MetadataCache calls**, including 60,046 during full search preparation, do not by themselves prove additional Kplex source-owner validation passes. Explicit owner hooks establish the five Kplex walks. Snapshot chunks: pages 118, relations 118, evidence 699 (935 total). Cached body reads total 25; these are not Markdown file reads or source body reacquisitions.

| Measured wrapper operation | Total |
| --- | ---: |
| `markdownInventoryCalls` | 4 |
| `idb.meta.get` | 80,136 |
| `idb.sourceHeads.getAll` | 161 |
| `idb.sourceHeads.getAllKeys` | 161 |
| `idb.pages.get` | 251 |
| `idb.meta.put` | 4 |
| `sourceInspectionCalls` | 100,075 |
| `idb.sourceHeads.get` | 120,126 |
| `metadataCacheLookups` | 101,299 |
| `idb.bodies.get` | 25 |
| `dependencyChecks` | 40,030 |
| `idb.sourceLocalDependencyOwners.get` | 80,064 |
| `idb.sourceLocalDependencyRepairs.get` | 80,060 |
| `idb.meta.add` | 40,032 |
| `idb.sourceChunks.get` | 20,027 |
| `idb.sourcePostings.get` | 484,199 |
| `idb.meta.delete` | 40,032 |
| `sourceHeadPageCalls` | 160 |
| `dependencyInventoryChecks` | 2 |
| `idb.sourceLocalDependencyRepairs.getAllKeys` | 2 |
| `idb.sourceLocalDependencyRepairs.count` | 2 |
| `idb.sourceLocalDependencyKeys.get` | 4 |
| `idb.snapshotChunks.get` | 935 |

Absent operations equal zero: Markdown `read`/`cachedRead`, adapter `stat`, source `acquire`/`loadBody`, source-head/chunk writes. Source counters `checked`, `reusedBodies`, `legacyBodies`, `vaultReads`, `parses`, `repaired`, `resolutionRefreshes`, `pendingMetadata`, `failures` are all zero. Semantic counters: requested 2, prepared 1, published 1, cancelled 0, pending 1, dependency visits 12, full builds 0. `pending` is a lifetime count of preparation outcomes, not a remaining queue length; strict-ready is confirmed independently.

## Repeat measurements and excluded attempts

Three earlier foreground runs use `main.js` SHA `8e5203b7cf88ba3506ea0d5d434ef507b13e95d0bc10176ed60803b065838e48`, before the read-only main accessor, additional counter forwarding and reconnect driver changes. Their production work/phase hooks are the same. They pass source-head/settings/foreground checks; all four valid runs have identical operation totals and five-owner overlap sets. Keep the three-run series and final-build pilot distinct.

| Earlier run | Strict-ready observed from native origin ms | Source authority from onload ms | Requested semantics from onload ms | Valid foreground samples |
| --- | ---: | ---: | ---: | ---: |
| 1 | 78277.6 | 72569.4 | 72606.2 | 80 / 80 |
| 2 | 84107.8 | 78695.9 | 78728.7 | 86 / 86 |
| 3 | 82804.9 | 77172.3 | 77202.6 | 84 / 84 |

The earlier strict-ready median is **82,804.9 ms**. Host comparison takes 49,761.3–53,787.9 ms; source-authority await 72,154.2–78,304.6 ms; post-requested snapshot completion approximately 5.25–5.56 seconds. Historical 72.974/74.267/77.422-second restarts and the separately settled 6.018-second snapshot pilot are context, not a matched preimplementation baseline. No speedup percentage is inferred.

- First representative setup fails its then-existing 240-second preflight: saved center alone does not reliably select the live view; no timed restart is collected. Source/cache converges, but the live demand remains the excluded hub. Cleanup passes.
- Retry finishes at 82,430.6 ms but is **excluded**: 20 of 84 samples lose document/window focus. No hidden sample and no throttling change; cleanup passes.
- The final autonomous setup waits indefinitely rather than killing plugin work. Its initial navigation notification precedes target page availability and is ignored. One existing `notifyNavigation("Welcome.md")` call after the target exists unblocks preflight, **before the timed interval**. The final driver now waits for page availability before that notification. This setup correction is not a startup optimization.

All attempts remain in machine-readable evidence, including their failures. Original settings/enabled files are byte-identical after cleanup; exact fresh backup is `/private/tmp/kplex-si5-warm-before-2026-10-04`. Never restore an older backup over later user changes.

## Truthful progress and autonomous CLI strategy

Actual source stages and hydrated record counts replace the broad “Loading index from cache” label. Owner denominators are the captured 20,015 notes; percentages are floored from completed work. Pages/relations/evidence have no invented percentage. The final run captures **729 changed labels** with per-phase monotonic counts; evidence progresses through 36,864, 73,728, 109,568 … 715,032 records. Notifications are throttled to 250 ms at existing batch/owner checkpoints, with no extra timer or graph revision.

`getStartupDiagnostics()` on plugin main exposes live phase/progress/status and retained aggregate trace. Detailed traces require opt-in before enable. The driver starts a deferred native task and polls every five seconds. Each CLI process retains its 30-second limit; a failed read is recorded, followed by a ten-second retry delay. **There is no outer readiness timeout**, no automatic plugin reload/cancel on lost reads, and no change to production hydration watchdogs. Obsidian can continue on its own. A new command reads the same task/report later. Initial task submission and final cleanup still require a responsive CLI; retained data lasts only until plugin unload/application exit.

No actual CLI disconnect occurs in the final pilot; retry behavior is implemented but not claimed as a fault-injection pass. After driver exit, a separate CLI process reads the frozen 22-phase report and the same source/requested/strict milestones. Its live `status.strictReady` is false because exact original settings restore the excluded Reference-center demand; the completed trace correctly remains frozen. Historical milestones and current status are deliberately separate.

## Commands and validation

All builds/tests use Node 22.22.2 via the PATH prefix below. Full verification passes architecture 7, core 62, Node 138, UI 7, portable 317 and browser 192 tests, real installed Obsidian type-check and production build. The existing 20,015-owner browser regression passes in 403,747.4 ms; browser lane totals 540,952.9 ms. Sandbox Chromium failed to start in the first attempt; the authorized unsandboxed verification passes. This is a host-process limitation, not a plugin failure.

```bash
PATH=/Users/zsviczian/.local/share/fnm/node-versions/v22.22.2/installation/bin:$PATH npm run verify > /private/tmp/kplex-si5-warm-verify-native.log 2>&1
PATH=/Users/zsviczian/.local/share/fnm/node-versions/v22.22.2/installation/bin:$PATH npm run build > /private/tmp/kplex-si5-warm-accessor-build.log 2>&1
PATH=/Users/zsviczian/.local/share/fnm/node-versions/v22.22.2/installation/bin:$PATH npm run lint:obsidian > /private/tmp/kplex-si5-warm-accessor-lint.log 2>&1
PATH=/Users/zsviczian/.local/share/fnm/node-versions/v22.22.2/installation/bin:$PATH node scripts/run-indexing-tests.mjs > /private/tmp/kplex-si5-warm-accessor-indexing.log 2>&1
```

Final `node --check scripts/testing/obsidian/startup.mjs` and `git diff --check` also exit 0 after documentation/preflight edits.

All commands above exit 0. Full verify precedes the final read-only accessor addition; affected build/lint/indexing checks pass afterward, including O(1) report access without vault enumeration. Focused diagnostics tests pass 2/2, including owner-set release, immutable completed reports and no opt-out detailed retention. Production work algorithms/fences are unchanged; no repeat of the unchanged nine-minute browser lane is claimed after the accessor addition.

Earlier three-run command uses `KPLEX_HOST_REPORT_DIR=/private/tmp/kplex-si5-warm-start-2026-10-04-foreground` and `KPLEX_SI5_RESTART_RUNS=3`. Final pilot command:

```bash
PATH=/Users/zsviczian/.local/share/fnm/node-versions/v22.22.2/installation/bin:$PATH \
KPLEX_TEST_VAULT_NAME=kplex-test \
KPLEX_TEST_VAULT_PATH=/Users/zsviczian/Obsidian/kplex-test \
KPLEX_TEST_CONFIG_DIR=/Users/zsviczian/Obsidian/kplex-test/.obsidian \
KPLEX_HOST_REPORT_DIR=/private/tmp/kplex-si5-warm-start-2026-10-04-autonomous \
KPLEX_SI5_WARM_CENTER=Welcome.md \
KPLEX_SI5_RESTART_RUNS=1 \
caffeinate -d -i node scripts/testing/obsidian/startup.mjs
```

Final pilot exits 0; earlier series exits 0. Setup/focus-excluded attempts exit 1. Retained reply after driver exit:

```bash
obsidian vault=kplex-test eval 'code=JSON.stringify(app.plugins.plugins["k-plex"].getStartupDiagnostics())' > /private/tmp/kplex-si5-warm-after-cli.txt
```

Exit 0; frozen trace remains available. The setup-only steering used the existing plugin's `notifyNavigation("Welcome.md")` after verifying that the page was available, outside the measured interval.

The final run was already executing the earlier preflight text when the on-disk driver was corrected; the manual notification supplied that same existing navigation operation after hydration. No extra steering or validation driver runs inside the measured interval.

## Smallest proposed correction — not implemented

Merge `upgradeRestartLocalDependencies()` into the existing `reconcileRestartHostInventory()` owner loop and reuse that loop's top-level source inspection. Dependency processing must still visit missing-MetadataCache owners, retain structural/Markdown ordering, and finish before existing deferred `markResolutionDependents()` fan-out. Preserve the later source-reconciliation pass as the authority/freshness fence for this first correction.

This removes **one 20,015-owner traversal and one duplicated top-level inspect/head read per owner**, without introducing a new architecture, database, cache or persisted validation certificate. It preserves actual dependency checks, durable host authentication, cancellation, head/inventory/event freshness and publication fences. The dependency work moves into host comparison, so **do not predict an 11.735-second saving**. This also does not claim to eliminate the largest durable-fact authentication cost.

After maintainer review, implement only that consolidation, run existing offline alias/path/metadata drift, source corruption, cancellation and race regressions, then repeat the same foreground warm probe on the exact candidate. Expect one fewer owner pass and 20,015 fewer duplicated source inspections/head reads with zero new I/O or source rewrites; measure actual elapsed gain. If more work is justified, report that evidence separately before expanding scope. Then obtain physical iPad/Android checklist results and perform the final SI5 acceptance/retirement audit. SI5 is not yet marked complete.
