# SI5 bounded posting reads — 2026-10-04

Posting batching follows the separately committed selection-reuse checkpoint **`80a14ecaff42daa657c0e86aa04ff4ecd46046fc`**. Measurements were collected on an uncommitted candidate based on that clean parent; this verified correction is an independent checkpoint. [Exact phase/counter/cleanup evidence](settings-independent-indexing-si5-posting-batching-2026-10-04.json); [immediate baseline](settings-independent-indexing-si5-clean-selection-2026-10-04.md).

## Result and limits

Three normal foreground plugin restarts reach strict-ready in **66,170.2 / 65,323.9 / 74,122.6 ms**; median **66,170.2 ms**, immediate baseline **82,149.4 ms**, observed difference **-15,979.2 ms**. Sequential series are not randomized paired trials; report the observed difference without treating it as a matched pre-implementation A/B or proof of exclusive I/O cost. This does not establish physical-device, actual-paint or SI5 release acceptance.

Posting requests change from **484,199 point reads** to **0 point reads + 20,027 bounded range reads** per restart, **464,172 fewer posting requests**. Existing transaction boundaries, every posting comparison/digest and source-head/lease/freshness/cancellation checks remain. Owner walks, dependency checks, source-head reads and repository yields are unchanged. Zero Markdown/source acquisition, parsing, repair, rewrite or full graph build.

The merged dependency/host phase takes **47,023.9–56,329.2 ms**; source reconciliation **9,227.5–9,701.3 ms**. Post-requested hydration **6,076.9 / 7,363.6 / 6,700.0 ms**. Timers, transaction wait and GC are not exclusively timed; request counts do not explain all remaining latency. No scheduler change is included.

## Small implementation and validation

`visitFamily()` uses the existing deterministic byte/record-bounded posting batches. For each disk batch, one `getAll(IDBKeyRange.bound(firstKey, lastKey), batch.length)` reads its contiguous primary-key interval `[sourceId, revision, family, index]`. The explicit count caps malformed key-range results at the same batch length (at most 256); it never requests beyond that batch. The interval isolates source/revision/family. Validate returned length before retaining the existing shape/identity/index/kind/key comparisons and digest. A gap cannot shift records into unchecked slots. No schema, cache, projection, decoding budget, yield, lease or transaction-owner change. Memory fallback still uses its existing bounded map reads.

Three new real-IndexedDB regressions cover 600 records spanning batch/chunk boundaries with exact request intervals; missing first/middle/boundary/last postings, wrong keys and inserted fractional keys, with no partial published result and lease cleanup; and paused range reads during cross-connection head replacement/cleanup or cancellation, releasing every lease/decode reservation. Existing byte bounds, oversized/empty family, corruption, storage failure, process restart, repairs and source-local authority tests pass.

Focused `node --test tests/source-indexeddb.test.mjs`: **16/16 pass**. Full `npm run verify`: architecture 7/core 62/Node 138/UI 7/portable 317/browser **199**, installed Obsidian types and production build; browser lane **527,588.2 ms**. No tests/golden bounds or memory limits were relaxed. No production edits after verification started. `git diff --check` passes.

## Exact build and foreground procedure

Node 22.22.2; Obsidian 1.14.4 (installer 1.14.0), installed types 1.13.0; Darwin 23.5.0, Apple M1/eight logical CPUs/8 GiB. Same disposable kplex-test: 20,015 Markdown notes, 20,016 physical files, 207 folders; snapshot 20,709 pages/relations and 715,032 evidence rows. Existing Welcome center avoids the excluded dense hub. Same opt-in production instrumentation/driver as the baseline; no new timing hooks or concurrent native/test driver. Background throttling remains enabled.

| Artifact | SHA-256 |
| --- | --- |
| main.js | `c9cc8a491b4294de9f7d04781069ea983131029b682aec02b778ba0f17d7b4bf` |
| manifest.json | `e3bb9a35215af97f6a3394cf7fc8f7d2142bae06de94bb112fef5a05819cda62` |
| styles.css | `e9da76ff7840cea44b77912963977f1fe2ab762b69a9853d047712d7b3270494` |

Fresh predeployment backup `/private/tmp/kplex-si5-posting-before-2026-10-04` preserves all three artifacts, settings and enablement. Matched native disable/enable staging passes exact hashes/settings/enabled-list/controller checks. Configured enablement is not loaded-instance proof. Candidate remains installed only in the disposable vault; no personal-vault changes.

Foreground samples **68/68 / 67/67 / 76/76**, all comparable, with normal throttling. Timed driver CLI reconnects: **0**. No outer readiness timeout; autonomous plugin-memory tasks and bounded 30-second CLI reads, five-second polls/ten-second reconnects remain unchanged. Production hydration watchdog unchanged. Submission/cleanup still need responsive CLI; no new CLI limitation is inferred.

## Exact phases and availability

Milliseconds: native origin immediately before disable/enable; callbacks relative to onload. Add onload offset to compare clocks. DOM/readiness polling at 100 ms is an upper bound, not paint or first interaction. Phase lanes overlap; do not sum. Source-complete duration is idle while hydration finishes. Standalone node-vocabulary/full-resolution/file-rebind work does not run on this valid-cache path.

| Run | Onload offset from native ms | Center DOM from native ms | Preview from onload ms | Source authority from onload ms | Requested authoritative from onload ms | Strict callback from onload ms | Strict observed from native ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 114.2 | 616.4 | 415.9 | 59852.3 | 59888.6 | 65965.5 | 66170.2 |
| 2 | 58.9 | 584.1 | 435.4 | 57857.3 | 57896.5 | 65260.1 | 65323.9 |
| 3 | 122.1 | 970.9 | 750.5 | 67220.3 | 67257.6 | 73957.6 | 74122.6 |

| Lane | Phase | Run 1 ms | Run 2 ms | Run 3 ms |
| --- | --- | ---: | ---: | ---: |
| hydration | metadata | 54.6 | 50.5 | 38.9 |
| hydration | preview | 316.1 | 333.1 | 662.2 |
| hydration | preview-search | 17.4 | 13.6 | 9.8 |
| source | source-inventory | 2.5 | 2.7 | 4.7 |
| source | source-coordinates | 6.2 | 4.1 | 6.4 |
| source | host-metadata-comparison | 49380.6 | 47023.9 | 56329.2 |
| hydration | source-authority | 59436.9 | 57422.2 | 66470.1 |
| source | host-retired-owner-check | 407.5 | 441.9 | 394.5 |
| source | source-reconciliation | 9322.8 | 9227.5 | 9701.3 |
| source | source-retired-owner-check | 315.6 | 727.8 | 310.0 |
| source | dependency-completion | 2.0 | 1.1 | 1.4 |
| source | resolution-reconciliation | 7.2 | 3.4 | 3.3 |
| source | dependency-final-validation | 5.6 | 0.7 | 0.7 |
| source | complete | 6113.2 | 7402.8 | 6737.3 |
| hydration | requested-semantics | 36.0 | 39.0 | 37.5 |
| hydration | pages | 1338.7 | 1474.2 | 1617.1 |
| hydration | relations | 1791.6 | 2390.9 | 2052.8 |
| hydration | preview-search (full) | 277.1 | 357.4 | 248.0 |
| hydration | evidence | 2668.2 | 3139.9 | 2780.4 |
| hydration | promote | 0.6 | 0.5 | 0.4 |
| hydration | complete | 0.5 | 0.5 | 0.8 |

## Exact counter comparison and cleanup

| Counter | Immediate baseline | Candidate | Delta |
| --- | ---: | ---: | ---: |
| `idb.sourcePostings.get` | 484,199 | 0 | -484,199 |
| `idb.sourcePostings.getAll` | 0 | 20,027 | +20,027 |
| `dependencyChecks` | 40,030 | 40,030 | +0 |
| `localDependencySelectionCalls` | 40,030 | 40,030 | +0 |
| `localDependencySettlementCalls` | 0 | 0 | +0 |
| `idb.meta.get` | 40,106 | 40,106 | +0 |
| `idb.sourceLocalDependencyOwners.get` | 40,034 | 40,034 | +0 |
| `idb.sourceLocalDependencyRepairs.get` | 40,030 | 40,030 | +0 |
| `sourceInspectionCalls` | 80,060 | 80,060 | +0 |
| `idb.sourceHeads.get` | 100,111 | 100,111 | +0 |
| `repositoryYieldCalls` | 20,027 | 20,027 | +0 |
| `idb.sourceChunks.get` | 20,027 | 20,027 | +0 |
| `idb.meta.add` | 40,032 | 40,032 | +0 |
| `idb.meta.delete` | 40,032 | 40,032 | +0 |
| `sourceHeadPageCalls` | 160 | 160 | +0 |
| `idb.snapshotChunks.get` | 935 | 935 | +0 |

The complete operation totals per run are retained in JSON; global host/cache incidental counts can vary. IDB counters count issued requests, not bytes or exclusive disk/CPU time. Four whole-owner walks each visit the same 20,015 notes, with all six pairwise overlaps retained. The two substantive freshness boundaries still perform 40,030 dependency checks/clean selections total. Cached physical-stat comparisons remain 60,045; adapter stat I/O zero. Retired-owner scans remain distinct.

Real progress captures **626 / 603 / 695** changed labels; phase counts are monotonic. All **20 assertions** pass, including source-head digests/settings unchanged, original configuration byte-identical, wrappers/controllers/opt-in removed and private owner sets released. Completed trace remains frozen in plugin memory after the CLI exits. Restoring the original Reference-center can leave live state updating on the excluded hub; historical strict-ready callbacks are not current-state guarantees.

## Exact commands

```bash
PATH=/Users/zsviczian/.local/share/fnm/node-versions/v22.22.2/installation/bin:$PATH node --test tests/source-indexeddb.test.mjs > /private/tmp/kplex-si5-posting-focused.log 2>&1
PATH=/Users/zsviczian/.local/share/fnm/node-versions/v22.22.2/installation/bin:$PATH npm run verify > /private/tmp/kplex-si5-posting-verify.log 2>&1
PATH=/Users/zsviczian/.local/share/fnm/node-versions/v22.22.2/installation/bin:$PATH node /private/tmp/kplex-si5-stage-posting.mjs > /private/tmp/kplex-si5-posting-stage.log 2>&1
```

Each exits 0. Before timed work, `osascript -e 'tell application "Obsidian" to activate'` exits 0; the driver independently requires actual visibility/focus throughout. Temporary staging helper uses matched native lifecycle tasks retained in memory and exact test-vault validation. Stage report `/private/tmp/kplex-si5-posting-stage.json`.

```bash
PATH=/Users/zsviczian/.local/share/fnm/node-versions/v22.22.2/installation/bin:$PATH \
KPLEX_TEST_VAULT_NAME=kplex-test \
KPLEX_TEST_VAULT_PATH=/Users/zsviczian/Obsidian/kplex-test \
KPLEX_TEST_CONFIG_DIR=/Users/zsviczian/Obsidian/kplex-test/.obsidian \
KPLEX_HOST_REPORT_DIR=/private/tmp/kplex-si5-posting-warm-2026-10-04 \
KPLEX_SI5_WARM_CENTER=Welcome.md \
KPLEX_SI5_RESTART_RUNS=3 \
caffeinate -d -i node scripts/testing/obsidian/startup.mjs > /private/tmp/kplex-si5-posting-warm.log 2>&1
```

Exit 0. `caffeinate` prevents idle sleep only. Raw full label/progress stream stays in the temporary report; repository JSON retains exact timings/counters and compact monotonic summaries. Post-driver bounded retained-memory/cleanup read: `/private/tmp/kplex-si5-posting-retained.json`.

## Remaining scope

This posting-reader correction is independent of the previous two fixes and should be checkpointed before any next behavior change. The exclusive cost of existing metadata-family yields remains unmeasured; do not remove yields or infer scheduler cause from counts. No new optimization is included. Physical iPad/Android interruption/resume and representative workflow testing, and final settings-route/retirement/evidence audit, remain pending. SI5 is open; extreme cold behavior is accepted, 20k dense-hub decode-budget remains a stress limit outside the critical path. No architecture/projection redesign, memory-limit increase, further cold optimization, push/release or C15–C26 work.
