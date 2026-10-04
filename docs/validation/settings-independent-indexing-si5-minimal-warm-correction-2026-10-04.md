# SI5 minimal warm-restart correction — 2026-10-04

**Implemented and validated:** combine restart dependency upgrade and host comparison in one owner traversal, reusing the existing top-level inspection. The later source-reconciliation/freshness pass stays intact. There is no database/cache/projection redesign, memory increase, cold-start optimization or change to the accepted synthetic dense-hub stress limit.

The exact reduction is **five owner walks → four**, **100,075 inspect calls → 80,060**, **120,126 source-head point reads → 100,111**. Every remaining owner walk visits the same 20,015 owners. Actual dependency/host-fact authentication is retained, with zero Markdown reads, parses, reacquisitions, repairs, source rewrites or full builds. No further optimization or commit/push/release was made. The pre-instrumentation checkpoint remains `62c728393440aa3dfb57869ece83c4060092bcba`; the correction and diagnostics are uncommitted.

[Exact machine-readable results](settings-independent-indexing-si5-minimal-warm-correction-2026-10-04.json) include all phases/counters, retained diagnostics, cleanup assertions and label summaries. [Before measurements](settings-independent-indexing-si5-warm-start-2026-10-04.md) remain unchanged as historical evidence.

## Change and correctness checks

`ObsidianSourceAcquisition.reconcileRestartHostInventory()` now accepts the existing structural order and walks `markdown.entries()`. A complete saved source first ensures its local dependencies using the shared top-level inspection; host comparison then uses that inspection. It also upgrades owners whose MetadataCache is pending. Existing cooperative checkpointing is retained; pending-cache owners still notify real progress. All owner upgrades finish before the existing deferred `markResolutionDependents()` fan-out. Cancellation is checked after awaits; missing/degraded storage, recreation, offline drift, tombstones, authority completion and publication fences retain their existing routes.

Removed `upgradeRestartLocalDependencies()` and its caller. No clean-path validation result is persisted or cached across sessions. Dependencies are still verified again by the later reconciliation, and retired-owner scans are retained. This first correction removes repeated traversal/inspection rather than claiming the whole former 11.735-second dependency phase disappears.

Two new real-IndexedDB regressions pass:

- Legacy owners upgrade before offline alias/target fan-out, including an owner with missing MetadataCache; that missing cache cannot grant authority. After metadata settles, the unresolved referrer repairs and only the new target body is read/parsed.
- A resolver event inside the dependency await cancels the captured pass before host comparison; source authority stays closed, then a fresh pass converges.

Existing offline create/rename/delete/recreate, corrupted owner/source, missing acceleration, partial repair/process restart, cancellation and known/uncertain maintenance cases also pass. An initial focused test run failed because the newly added host fixture lacked alias resolution; the fixture was corrected to use the same explicit alias resolver as the existing restart test. Production correction was unchanged; the final full suite passes both tests.

## Exact build and native procedure

Environment and vault are unchanged: Node 22.22.2, Obsidian 1.14.4, installed types 1.13.0, Apple M1/eight logical CPUs/8 GiB RAM, Darwin 23.5.0, disposable `kplex-test` with 20,015 Markdown notes. Existing `Welcome.md` is the representative center. These are plugin disable/enable restarts, not whole application launches. No concurrent validation driver/browser tests ran in the native timed windows.

| Installed artifact | SHA-256 |
| --- | --- |
| main.js | `3a8e2110c90d3c3b35d2ed70d61b468ed896613c5a312952e37e9ceb2daa21f0` |
| manifest.json | `e3bb9a35215af97f6a3394cf7fc8f7d2142bae06de94bb112fef5a05819cda62` |
| styles.css | `e9da76ff7840cea44b77912963977f1fe2ab762b69a9853d047712d7b3270494` |

Exact installed/build hashes match. Fresh backup of all artifacts/settings/enablement: `/private/tmp/kplex-si5-minimal-before-2026-10-04`. Stage report: `/private/tmp/kplex-si5-minimal-stage.json`. Three runs pass **82/82, 85/85 and 80/80 foreground samples**; no hidden/unfocused samples and normal background throttling stays enabled. Source-head digests/settings are unchanged in each measured interval. Final original `data.json` and enabled list are byte-identical to the fresh backup; wrappers/controllers/opt-in are removed. Candidate build remains installed in the disposable test vault.

The passive driver now additionally counts existing `localDependencySelection`, `settleLocalDependencyWork` and repository-runtime `yield` calls. Forwarding preserves the original promise/request identity. These extra counters have no exclusive elapsed timing and their overhead has not been independently measured. Wrapped host/IDB calls are temporal/global attribution; owner/physical comparison hooks are Kplex-owned. Source and hydration lanes overlap and must not be summed.

## Timings and comparison

Strict-ready is observed at **80,137.3 / 83,119.2 / 78,468.6 ms** from before disable/enable; median **80,137.3 ms**. The earlier three-run diagnostic series median is **82,804.9 ms**, an observed difference of **2,667.6 ms**. Their ranges overlap and the separate final-build before pilot was **77,540.7 ms**, faster than any current trial. This is **not sufficient to establish a reliable latency improvement or causal speedup percentage**. The exact owner/read reduction is established. Warm restart remains roughly 78–83 seconds.

The merged dependency/host phase takes 57,864.2–60,115.5 ms; source reconciliation takes 12,297.8–16,566.2 ms. Optional hydration after requested-semantic refresh ends takes 5,208.0–5,974.4 ms. Source authority remains the dominant cost. The combined phase does not separate dependency time from host authentication, and the longer reconciliation in run 2 is not assigned a cause without measurement.

| Run | Onload offset from native origin ms | Center DOM from native origin ms | Preview from onload ms | Source authority from onload ms | Requested semantics from onload ms | Strict callback from onload ms | Strict observed from native origin ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 137.5 | 650.0 | 473.1 | 73908.1 | 73950.4 | 79926.5 | 80137.3 |
| 2 | 116.9 | 562.3 | 425.3 | 77265.6 | 77309.7 | 82984.6 | 83119.2 |
| 3 | 99.2 | 1062.7 | 872.4 | 73081.0 | 73119.7 | 78328.7 | 78468.6 |

The native origin is before plugin disable/enable; onload milestones have a different origin. Add the onload offset to compare clocks. Native readiness/DOM polling uses 100 ms intervals and is an upper bound. DOM presence is not actual paint, touch or first usable interaction.

All phase elapsed times below are in milliseconds, shown to 0.1 ms; JSON preserves raw precision. `source-authority` is overlapping await time; source `complete` is idle while hydration finishes, not additional validation. `preview-search` occurs once for preview and once after full relations. Standalone node-vocabulary/full-resolution/file-rebind phases do not run on this valid-cache path.

| Lane | Phase | Run 1 ms | Run 2 ms | Run 3 ms |
| --- | --- | ---: | ---: | ---: |
| hydration | metadata | 57.5 | 50.6 | 43.8 |
| hydration | preview | 341.4 | 320.5 | 770.8 |
| hydration | preview-search | 25.8 | 16.1 | 28.5 |
| source | source-inventory | 2.6 | 2.6 | 4.5 |
| source | source-coordinates | 6.0 | 4.3 | 5.5 |
| source | host-metadata-comparison | 60115.5 | 59510.8 | 57864.2 |
| hydration | source-authority | 73435.5 | 76840.8 | 72209.2 |
| source | host-retired-owner-check | 435.7 | 430.7 | 465.3 |
| source | source-reconciliation | 12297.8 | 16566.2 | 13505.1 |
| source | source-retired-owner-check | 478.3 | 310.7 | 370.8 |
| source | dependency-completion | 6.7 | 14.1 | 1.1 |
| source | resolution-reconciliation | 6.0 | 6.0 | 5.7 |
| source | dependency-final-validation | 109.7 | 6.4 | 0.8 |
| source | complete | 6018.4 | 5719.0 | 5247.7 |
| hydration | requested-semantics | 42.2 | 44.4 | 38.4 |
| hydration | pages | 1486.5 | 1228.5 | 1097.7 |
| hydration | relations | 1547.5 | 1684.2 | 1319.6 |
| hydration | preview-search (full search) | 231.2 | 249.6 | 279.8 |
| hydration | evidence | 2708.5 | 2511.0 | 2510.3 |
| hydration | promote | 0.6 | 0.2 | 0.4 |
| hydration | complete | 1.4 | 0.6 | 0.9 |

## Exact counters

Counts below are identical in all three native runs. Before counters refer to the prior final-build pilot; all earlier valid baseline runs have those same totals. Source coordinates, merged dependency/host comparison, source reconciliation and resolution dirty flags each process **20,015 unique owners**. Each of their six pairwise intersections contains **20,015 owners**. Only two of the four loops perform substantial validation.

| Operation | Before | After | Delta |
| --- | ---: | ---: | ---: |
| `sourceInspectionCalls` | 100,075 | 80,060 | -20,015 |
| `idb.sourceHeads.get` | 120,126 | 100,111 | -20,015 |
| `dependencyChecks` | 40,030 | 40,030 | +0 |
| `idb.sourceLocalDependencyOwners.get` | 80,064 | 80,064 | +0 |
| `idb.sourceLocalDependencyRepairs.get` | 80,060 | 80,060 | +0 |
| `idb.sourceChunks.get` | 20,027 | 20,027 | +0 |
| `idb.sourcePostings.get` | 484,199 | 484,199 | +0 |
| `sourceHeadPageCalls` | 160 | 160 | +0 |
| `idb.sourceHeads.getAll` | 161 | 161 | +0 |
| `idb.sourceHeads.getAllKeys` | 161 | 161 | +0 |
| `metadataCacheLookups` | 101,299 | 101,299 | +0 |
| `idb.meta.add` | 40,032 | 40,032 | +0 |
| `idb.meta.delete` | 40,032 | 40,032 | +0 |
| `idb.snapshotChunks.get` | 935 | 935 | +0 |

Merged phase: 40,030 inspections, 60,045 head reads, 20,015 dependency checks, 40,030 local-dependency selections, 40,030 local-owner reads, 40,030 repair reads, 40,030 dependency-state reads, 20,015 source-chunk reads, **484,178 posting reads**, **20,015 repository yields**, 40,026 lease adds and 40,026 lease deletes. Source reconciliation: 40,030 inspections/head reads, 20,015 checks, 40,030 selections/owner/repair/state reads. Each retired-owner scan returns 20,036 heads in 80 pages; these include 21 retired/non-current entries beyond the Markdown count. Cached physical comparisons remain 60,045 across merged source comparison, source reconciliation and page hydration; physical-stat I/O is zero.

Total newly measured calls: **40,030 settlements, 80,060 local-dependency selections, 20,027 repository yields**. The merged metadata walk accounts for 20,015 yields; requested-semantic reads account for the remaining 12. Clean startup makes **two local selections per dependency check**, visible both in direct call counts and the owner/repair/state request counts. Actual repair counters remain zero. The function `settleLocalDependencyWork()` first reads selection, then clean `ensureLocalDependencies()` reads it again.

All source counters are zero; full builds zero. Semantic lifetime counters are requested 2, prepared 1, published 1, pending 1, cancelled 0, dependency visits 12. The pending value counts outcomes, not remaining queue length; readiness has independent fences. Cached body gets remain 25, distinct from Markdown reads/body reacquisitions. Source-head/chunk/posting writes remain zero; meta lease bookkeeping writes are retained. Global MetadataCache calls remain 101,299, which does not prove additional Kplex source-owner walks.

Progress remains phase-specific with real counts/percentages; 767 / 763 / 731 label changes have monotonic counts within phases. After CLI driver exit, retained report is frozen with **21 phases**, **zero private owner sets**, no controller/opt-in. Original Reference-center settings can reintroduce the excluded dense-hub demand: live status is then updating while historical strict-ready milestones correctly stay frozen. This is not a new warm-restart failure.

## CLI limitation and recovery

Staging encountered a lost `plugin:disable` response. The temporary helper's default SIGTERM timeout left its CLI client waiting; only that client was killed. Fresh bounded eval reported `pluginPresent:false`, proving the native disable had finished, with the candidate not yet copied. Staging resumed with a SIGKILL-bounded CLI and a presence check; exact artifact/settings/enablement checks passed. Obsidian was not restarted and native work was not cancelled.

The actual warm probe keeps native tasks/results in plugin memory, uses a 30-second SIGKILL client limit, polls every five seconds and retries failed reads after ten seconds, without an outer readiness timeout. No CLI read loss occurred inside the three measured restarts; this staging recovery is separate evidence rather than a timed fault-injection result. Initial submission/cleanup still require responsive CLI access; unload/application exit discards retained memory. Production hydration watchdog is unchanged.

## Commands and verification

Executed from `/Users/zsviczian/GitHub/kplex` with Node 22.22.2:

```bash
PATH=/Users/zsviczian/.local/share/fnm/node-versions/v22.22.2/installation/bin:$PATH npm run verify > /private/tmp/kplex-si5-minimal-verify.log 2>&1
PATH=/Users/zsviczian/.local/share/fnm/node-versions/v22.22.2/installation/bin:$PATH node scripts/run-indexing-tests.mjs > /private/tmp/kplex-si5-minimal-indexing-final.log 2>&1
PATH=/Users/zsviczian/.local/share/fnm/node-versions/v22.22.2/installation/bin:$PATH npm run lint:obsidian > /private/tmp/kplex-si5-minimal-lint-final.log 2>&1
PATH=/Users/zsviczian/.local/share/fnm/node-versions/v22.22.2/installation/bin:$PATH node /private/tmp/kplex-si5-stage-minimal.mjs
```

Full verify exits 0: architecture 7/core 62/Node 138/UI 7/portable 317/browser **194**, installed Obsidian typings and production build. Existing 20,015-owner case takes 397,163.9 ms; full browser lane 525,490.0 ms. During review, the pending-MetadataCache progress callback was preserved; final build and affected indexing/lint checks include that change. No second unchanged full browser run is claimed. Temporary staging helper validates explicit vault paths, copies only the three generated artifacts and preserves settings/enablement. Initial staging failed with ETIMEDOUT; retry exits 0.

Native warm command:

```bash
PATH=/Users/zsviczian/.local/share/fnm/node-versions/v22.22.2/installation/bin:$PATH \
KPLEX_TEST_VAULT_NAME=kplex-test \
KPLEX_TEST_VAULT_PATH=/Users/zsviczian/Obsidian/kplex-test \
KPLEX_TEST_CONFIG_DIR=/Users/zsviczian/Obsidian/kplex-test/.obsidian \
KPLEX_HOST_REPORT_DIR=/private/tmp/kplex-si5-minimal-warm-2026-10-04 \
KPLEX_SI5_WARM_CENTER=Welcome.md \
KPLEX_SI5_RESTART_RUNS=3 \
caffeinate -d -i node scripts/testing/obsidian/startup.mjs > /private/tmp/kplex-si5-minimal-warm.log 2>&1
```

Exits 0; representative preflight succeeds without manual navigation steering. `node --check scripts/testing/obsidian/startup.mjs` and `git diff --check` pass. Post-driver bounded eval reads `getStartupDiagnostics()` plus owner-set/controller/opt-in cleanup; reply stored in `/private/tmp/kplex-si5-minimal-retained.json`. All machine-readable assertions pass, including original settings/enabled bytes and four owner overlaps.

## Why unchanged mtime is not dependency authority

Physical reuse already compares stored `head.physical.mtime` with cached `file.stat.mtime`, plus path/size/ctime when present. This avoids rereading/parsing unchanged input. `ensureLocalDependencies()` instead checks the selected durable source revision/sequence against its local owner, owner format/order and pending repair work. An existing source's resolution facts can change when another note is created/renamed or gets an alias, while the referring note's mtime stays unchanged; that can update its selected source revision. Filesystem timestamps also do not validate an absent/corrupt/stale local dependency derivative. Mtime is therefore useful input to reuse, not a substitute for these authority checks. It is reasonable to consolidate repeated clean storage reads while preserving those checks.

## Additional possibilities — identified, not implemented

| Candidate | Measured evidence | Smallest next change and required protection |
| --- | --- | --- |
| **1. Remove duplicated clean local-dependency selection** | 80,060 selection calls for 40,030 checks; owner/repair/state each read twice per check. | Reuse the clean no-repair selection inside existing `ensureLocalDependencies()`; reread after actual repair. Preserve exact source-head/sequence checks, pending journal/global state, cancellation and concurrent-write semantics. Potentially removes 40,030 three-store readonly selections (120,090 requests); time gain must be measured. Keep both validation passes until their distinct freshness role is proven redundant. |
| **2. Batch existing contiguous posting reads** | Host comparison reads 484,178 postings using point requests in already bounded batches. | Use one bounded key-range getAll per contiguous batch in the existing family reader. Validate exact length/order/every posting and existing checksums/digests/frame/final-head/lease fences; preserve the same record/byte budgets. Test missing/extra/wrong posting, source replacement and cleanup races. This reduces request/callback count, not authenticated work or storage schema. Exclusive posting latency is not measured, so no promised saving. |
| **3. Investigate unconditional family-reader yields** | Host comparison yields 20,015 times: one per metadata owner/chunk. Existing family-reader code yields after every chunk. | Measure scheduler wait separately before considering elapsed-budget cooperative yields at existing boundaries. Preserve bounded CPU slices, mobile responsiveness, cancellation and real progress. A yield count is not proof that these timers consume the dominant time; no yield removal is authorized or implemented here. |

Candidate 1 is the smallest next code change; candidate 2 targets the largest remaining request count. Do not skip host validation, remove leases, raise memory limits or introduce cached validation certificates to obtain a faster number. Validate one correction at a time and repeat exact-build foreground warm measurements. Once the bounded warm decision is settled, the maintainer's physical iPad/Android checklist and final SI5 settings-route/retirement/evidence audit remain. SI5 is not marked complete and C15–C26 remain paused.
