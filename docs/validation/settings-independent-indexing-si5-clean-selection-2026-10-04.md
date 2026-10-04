# SI5 clean dependency-selection reuse — 2026-10-04

**Historical baseline:** selection reuse is committed at `80a14ecaff42daa657c0e86aa04ff4ecd46046fc`. The [separate posting-batching follow-up](settings-independent-indexing-si5-posting-batching-2026-10-04.md) owns current results; original measurements and candidate state below are retained.

The previous diagnostics, truthful progress and first owner-loop correction were checkpointed **before this edit** as **`8cd10b7d6746d607f8214ad192670a0b9a370778`**. This correction is a separate nine-line production diff in `SourceRepository.ts`, plus two real-IndexedDB tests and its evidence/docs. The native measurements below were collected against an uncommitted candidate based on that clean checkpoint; this independently validated change forms the next checkpoint. No push/release, posting-reader optimization, scheduling change, architectural redesign or memory increase.

[Machine-readable exact timings/counters/cleanup](settings-independent-indexing-si5-clean-selection-2026-10-04.json); [immediate committed baseline](settings-independent-indexing-si5-minimal-warm-correction-2026-10-04.md); [original attribution](settings-independent-indexing-si5-warm-start-2026-10-04.md).

## Outcome and limits

**Duplicate storage work is removed; an overall latency improvement is not demonstrated.** Every clean `ensureLocalDependencies()` call now uses one local owner/repair/state selection instead of two. Across the 20,015-note warm restart: **80,060 → 40,030 selections**, **40,030 fewer readonly selection transactions**, **120,090 fewer IDB reads**. Source-head inspection, version/order/sequence checks, pending repair recovery and final authority/freshness fences remain.

Three native foreground runs reach strict-ready at **82,149.4 / 81,286.0 / 84,857.4 ms** from before disable/enable, median **82,149.4 ms**. The immediate baseline median is **80,137.3 ms**: this candidate's observed median is **2,012.1 ms higher**. Ranges overlap, and these are sequential series rather than randomized paired runs, so no causal latency regression or speedup is established. Do not describe this as a faster warm start or SI5 performance acceptance. The storage-work reduction is exact, with zero new source/Markdown I/O, parses, repairs, rewrites or full builds.

The merged dependency/host phase remains dominant at **64,190.8–66,056.7 ms**, versus baseline **57,864.2–60,115.5 ms**. Source reconciliation is **8,957.2–9,259.6 ms**, versus baseline **12,297.8–16,566.2 ms**. The host-phase increase is recorded, not assigned to timers, posting I/O or GC without exclusive timing. Post-requested hydration is **6,288.1 / 6,341.4 / 8,362.8 ms**. These measurements do not explain the system-level timing shift causally.

## Minimal implementation and safety

In `ensureLocalDependencies()`, read `localDependencySelection()` first. If it has no repair, reuse it and proceed to the existing head inspection. If repair exists, run unchanged `settleLocalDependencyWork()`, then reread because settlement can replace/remove the owner. That repair helper retains its own fresh selection, so genuine repair paths can do one more read than the old unconditional route; warm clean paths do one fewer. After a legacy owner upgrade, the existing reread remains. No selection is persisted or cached between calls/owners/sessions.

Other callers of settlement (source replace/tombstone) are unchanged. Existing source revision/sequence, format version, structural/Markdown order, malformed-state/journal, storage failure and cancellation checks are retained. This is not mtime-only authority; physical statistics already govern input reuse and cannot authenticate local derivatives or other-file resolution changes.

New real-IndexedDB tests prove:

- A clean current owner uses one selection, still performs the head inspection, avoids settlement and changes neither source head nor owner. Global closure remains ready.
- Production source replacement between selection and head inspection rejects the old captured owner with `dependency-invalid`; a fresh check then converges.

Existing abandoned/private backfill, selected count repair, interrupted repair/process restart, legacy owner upgrade, stale/corrupt owner, offline path/alias/create/delete/recreate, missing MetadataCache/fan-out and cancellation cases pass. No correctness or cache corruption failure is hidden by the unchanged-mtime shortcut.

## Exact artifact and environment

Same disposable `kplex-test`, Node 22.22.2, Obsidian 1.14.4, installed types 1.13.0, Apple M1/eight logical CPUs/8 GiB RAM, Darwin 23.5.0. Vault: 20,015 Markdown notes, 20,016 physical files, 207 folders. Valid snapshot: 20,709 pages/relations and 715,032 evidence rows. Existing `Welcome.md` avoids the excluded synthetic hub. Measurements are plugin restarts, not whole application launch/paint/physical-device timing.

| Installed artifact | SHA-256 |
| --- | --- |
| main.js | `b79dc7839fa9d0b94768858b75a1a55285681c8978d6279a2599d054bf492364` |
| manifest.json | `e3bb9a35215af97f6a3394cf7fc8f7d2142bae06de94bb112fef5a05819cda62` |
| styles.css | `e9da76ff7840cea44b77912963977f1fe2ab762b69a9853d047712d7b3270494` |

Exact build/install hashes pass. Fresh predeployment artifacts/settings/enablement backup: `/private/tmp/kplex-si5-clean-selection-before-2026-10-04`. Full verification completes before native timed work; no other test driver runs concurrently. Same production-path instrumentation/driver as committed baseline; no new timing hooks. Native foreground samples **84/84, 83/83, 86/86** all pass, with normal background throttling enabled. `caffeinate -d -i` prevents idle sleep only.

## Exact phases and availability

Times below are milliseconds. Exact callbacks are relative to onload; native origin is immediately before plugin disable/enable. Add the onload offset to compare origins. DOM/strict polling uses 100 ms intervals and gives upper bounds, not paint or interaction latency.

| Run | Onload offset from native origin ms | Center DOM from native origin ms | Preview from onload ms | Source authority from onload ms | Requested semantics from onload ms | Strict callback from onload ms | Strict observed from native origin ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 293.5 | 890.7 | 493.6 | 75501.3 | 75547.6 | 81838.2 | 82149.4 |
| 2 | 75.6 | 605.3 | 482.3 | 74825.0 | 74855.9 | 81198.0 | 81286.0 |
| 3 | 65.3 | 458.5 | 365.8 | 76349.9 | 76398.2 | 84761.8 | 84857.4 |

Phase durations retain raw precision in JSON and are rounded here to 0.1 ms. Source/hydration lanes overlap; do not sum them. `source-authority` is await time, source `complete` is idle while hydration finishes. Standalone vocabulary/full-resolution/file-rebind phases do not run on this valid-cache path.

| Lane | Phase | Run 1 ms | Run 2 ms | Run 3 ms |
| --- | --- | ---: | ---: | ---: |
| hydration | metadata | 60.5 | 44.0 | 47.8 |
| hydration | preview | 338.2 | 395.3 | 283.3 |
| hydration | preview-search | 59.9 | 7.5 | 6.6 |
| source | source-inventory | 3.8 | 2.7 | 2.6 |
| source | source-coordinates | 7.6 | 4.4 | 4.1 |
| source | host-metadata-comparison | 64851.6 | 64190.8 | 66056.7 |
| hydration | source-authority | 75008.1 | 74343.0 | 75984.6 |
| source | host-retired-owner-check | 407.4 | 696.3 | 586.1 |
| source | source-reconciliation | 9259.6 | 8957.2 | 9015.3 |
| source | source-retired-owner-check | 528.7 | 548.0 | 313.4 |
| source | dependency-completion | 1.8 | 0.8 | 1.0 |
| source | resolution-reconciliation | 4.0 | 3.3 | 3.2 |
| source | dependency-final-validation | 0.8 | 0.7 | 1.6 |
| source | complete | 6336.9 | 6373.0 | 8411.9 |
| hydration | requested-semantics | 46.1 | 30.9 | 48.0 |
| hydration | pages | 1767.7 | 1388.5 | 1535.8 |
| hydration | relations | 1538.0 | 1872.5 | 2223.5 |
| hydration | preview-search (full) | 311.0 | 358.0 | 261.3 |
| hydration | evidence | 2670.7 | 2722.0 | 4341.5 |
| hydration | promote | 0.7 | 0.4 | 0.5 |
| hydration | complete | 2.3 | 0.4 | 0.8 |

## Exact counter comparison

These principal counters are identical in all three new runs. The metadata state, owner and repair reads each fall by **40,030**, totaling **120,090** requests. Four owner walks and all six 20,015-owner pairwise overlaps remain. Each dependency/host and reconciliation pass still checks 20,015 owners; two checks per owner remain as distinct freshness boundaries.

| Counter | Immediate baseline | New candidate | Delta |
| --- | ---: | ---: | ---: |
| `dependencyChecks` | 40,030 | 40,030 | +0 |
| `localDependencySelectionCalls` | 80,060 | 40,030 | -40,030 |
| `localDependencySettlementCalls` | 40,030 | 0 | -40,030 |
| `idb.meta.get` | 80,136 | 40,106 | -40,030 |
| `idb.sourceLocalDependencyOwners.get` | 80,064 | 40,034 | -40,030 |
| `idb.sourceLocalDependencyRepairs.get` | 80,060 | 40,030 | -40,030 |
| `sourceInspectionCalls` | 80,060 | 80,060 | +0 |
| `idb.sourceHeads.get` | 100,111 | 100,111 | +0 |
| `idb.sourcePostings.get` | 484,199 | 484,199 | +0 |
| `repositoryYieldCalls` | 20,027 | 20,027 | +0 |
| `idb.meta.add` | 40,032 | 40,032 | +0 |
| `idb.meta.delete` | 40,032 | 40,032 | +0 |
| `sourceHeadPageCalls` | 160 | 160 | +0 |
| `idb.snapshotChunks.get` | 935 | 935 | +0 |

Each of the two substantive source passes performs **20,015** local selections/owner/repair/state reads, instead of 40,030. Total owner reads include four requested-semantic reads. Head reads remain 100,111, inspect calls 80,060. Metadata host authentication still reads 484,178 postings, 20,015 chunks and yields 20,015 times; total postings 484,199 and repository yields 20,027 include requested semantics. Both 80-page retired-owner scans remain and each returns 20,036 heads. Cached physical comparisons remain 60,045; adapter stat I/O zero.

All source counters and source write/acquisition/Markdown/stat-I/O counters are zero; full builds zero. Semantic counters remain requested 2/prepared 1/published 1/pending 1/cancelled 0/dependency visits 12; pending is an outcome count, not an outstanding queue. Global MetadataCache calls are **101,297 / 101,299 / 101,299** and cached body gets **24 / 25 / 25**. These incidental host/cache counts vary slightly; they are not Markdown reads or additional Kplex owner-pass proof. Wrapped calls are temporal/global counts, not exclusive CPU/transaction latency.

Real progress captures **777 / 768 / 796** changed labels, monotonic within each phase. Native source-head digests/settings are unchanged for every restart. Original settings and enabled list restore byte-identically. Wrappers/controllers/opt-in are removed, and a post-driver bounded read confirms **21 frozen phases, zero private owner sets**. Historical strict-ready remains frozen; restoring the original Reference-center settings can leave live status updating on the excluded hub. Candidate remains installed in the disposable vault; no personal vault was touched.

## Commands, validation and CLI distinction

```bash
PATH=/Users/zsviczian/.local/share/fnm/node-versions/v22.22.2/installation/bin:$PATH npm run verify > /private/tmp/kplex-si5-clean-selection-verify.log 2>&1
```

Exit 0: architecture 7/core 62/Node 138/UI 7/portable 317/browser **196**, installed Obsidian typing and production build. Existing 20,015-owner case passes in 423,257.5 ms; browser lane totals 600,918.3 ms. This is one full verification on final production source, not a stub-only result. New tests and all affected repair/race cases pass. `git diff --check` passes.

Temporary exact-vault staging command:

```bash
PATH=/Users/zsviczian/.local/share/fnm/node-versions/v22.22.2/installation/bin:$PATH node /private/tmp/kplex-si5-stage-clean-selection.mjs > /private/tmp/kplex-si5-clean-selection-stage-retry.log 2>&1
```

The first staging attempt mixed native `disablePlugin()` with CLI `plugin:enable`, which reported **already enabled** although the instance was absent: configured enablement and loaded-instance state differ. This is distinct from a long-running startup timeout. Candidate files had been copied; retry uses matched native disable/enable tasks with retained completion/error flags, then verifies the actual instance and exact settings/enablement bytes. Retry exits 0; all staging controllers are removed and no read reconnect is required. Stage report: `/private/tmp/kplex-si5-clean-selection-stage.json`; initial failure log: `/private/tmp/kplex-si5-clean-selection-stage.log`. No application restart or configuration reset.

Native three-run command:

```bash
PATH=/Users/zsviczian/.local/share/fnm/node-versions/v22.22.2/installation/bin:$PATH \
KPLEX_TEST_VAULT_NAME=kplex-test \
KPLEX_TEST_VAULT_PATH=/Users/zsviczian/Obsidian/kplex-test \
KPLEX_TEST_CONFIG_DIR=/Users/zsviczian/Obsidian/kplex-test/.obsidian \
KPLEX_HOST_REPORT_DIR=/private/tmp/kplex-si5-clean-selection-warm-2026-10-04 \
KPLEX_SI5_WARM_CENTER=Welcome.md \
KPLEX_SI5_RESTART_RUNS=3 \
caffeinate -d -i node scripts/testing/obsidian/startup.mjs > /private/tmp/kplex-si5-clean-selection-warm.log 2>&1
```

Exit 0. Representative preflight succeeds without manual steering. Per-CLI calls remain SIGKILL-bounded at 30 seconds; native tasks are autonomous, poll every five seconds/retry failed reads after ten seconds, with no outer readiness limit or production watchdog change. No read loss occurs inside these three measured runs. Post-driver `getStartupDiagnostics()`/cleanup reply is recorded in `/private/tmp/kplex-si5-clean-selection-retained.json`; all machine-readable assertions pass.

## Commit boundary and next scope

Commit independently validated work **before adding the next behavior change**. The preceding checkpoint `8cd10b7…` protects the prior fix, and this verified read-reduction correction is the next independent checkpoint, with lack of warm-latency improvement explicitly recorded. Do not claim SI5 complete: physical iPad/Android and final retirement/settings-route/evidence audit remain.

The largest remaining measured request count is the **484,178 host-metadata posting point reads**. A subsequent candidate could use bounded contiguous range reads inside the existing family reader, preserving exact length/order/every-posting validation, frame/digest/head/lease checks and byte/record limits. That change is **not implemented** here. Scheduler wait from 20,015 metadata-family yields is also unmeasured; do not remove yields based on counts alone or assert that they explain the increased host-phase time. Further instrumentation/optimization requires a scoped next step, not another indexing architecture.

The maintainer's acceptance of existing extreme cold behavior and exclusion of the 20k dense-hub `decode-budget` stress case remain. No synthetic projection redesign, memory-limit increase or cold optimization; C15–C26 stay paused.
