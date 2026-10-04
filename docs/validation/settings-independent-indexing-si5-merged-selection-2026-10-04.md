# SI5 dependency/head transaction consolidation — 2026-10-04

## Result and checkpoint

Implementation commit **`9d8b5c9cb3e5fd7e42edc7d3a65684eda241ee5e`** follows the separate progress-label checkpoint **`b48643c62fb5a21d105f6f5db38c4025223ca785`**. The original pre-instrumentation implementation remains preserved at **`62c728393440aa3dfb57869ece83c4060092bcba`**. No push/release or broader architectural work.

The candidate removes **40,030 readonly transaction boundaries** per clean 20,015-owner startup. All **100,111 head requests**, **40,030 dependency checks/selections**, family authentication, leases, yields and later freshness passes remain. Inspections fall **80,060 → 40,030** because dependency verification no longer calls a separate head-inspection transaction.

Three candidate foreground warm plugin restarts: **70,345.8 / 68,258.4 / 80,790.8 ms**, median **70,345.8 ms**. The earlier wait-attribution baseline was **64,592.3 ms** on the older `c9cc8a49…` build. Because the candidate was slower, three additional controls used the prior verified **same-progress-UX** `bd1e24ae…` build with this same driver: **67,339.1 / 72,540.0 / 69,143.9 ms**, median **69,143.9 ms**. Candidate median is **1,201.9 ms higher** than the current control and **5,753.5 ms higher** than the earlier baseline. **No overall warm-start speedup is demonstrated.** Series are sequential, not randomized paired trials; the ranges overlap. Neither a causal regression nor a causal speedup is inferred.

Clean reconciliation measured **7,027.9–7,945.3 ms** in the candidate versus **9,017.1–9,610.9 ms** in the controls. Retain the verified narrow transaction/work reduction, with this localized observation and the unfavorable overall measurements visible. Do not claim that fewer transactions establish lower total latency. Stop further automatic performance changes and use the exact retained candidate for the remaining physical-device gate.

## Production change and correctness

`NeutralSourceRepository.localDependencySelection()` optionally reads dependency state, local owner, repair journal and the fresh complete source head in **one readonly transaction**. `ensureLocalDependencies()` accepts that result only after current/unload checks and only when no memory/unsaved/pending-deletion overlay masks the disk head. A bounded activation counter forces ordinary fresh inspection if this repository durably activates a source during the await, including a tombstone. This preserves the pre-existing real head-replacement regression rather than weakening it.

Malformed/missing/incomplete/exceptional heads retain normal inspection and reason handling. Owner revision/sequence/version/order, journal state, storage failure and cancellation checks remain. Actual repair, legacy upgrade and order/activation writes retain their rereads and in-transaction fences. No cache, schema, architecture, memory-limit, scheduler, authority, watchdog or semantic-policy change. Caller inspection and later host/source/resolution freshness validation remain; no old caller inspection is treated as fresh authority across awaits.

Focused real-IndexedDB tests **29/29** pass, including atomic authority inputs, no head/owner rewrite, intervening replacement, post-await cancel/unload/overlay/tombstone, owner/head sequence mismatch and damaged/missing heads. Existing repair, legacy upgrade, storage failure, process restart, concurrent staging and 20,015-owner cases remain green. Full `npm run verify` passes architecture **7**, core **62**, Node **144**, UI **7**, portable source **317**, browser source **202**, **24 production settings-independence scenarios**, official lint and actual production build against installed Obsidian typings. No skipped/failing tests in these completed lanes.

## Exact build, fixture and observation semantics

| Artifact | SHA-256 |
| --- | --- |
| `main.js` | `094b520cb267567086fab211b460fd05b7bd02eb1d3f196a736688426b8cec89` |
| `manifest.json` | `e3bb9a35215af97f6a3394cf7fc8f7d2142bae06de94bb112fef5a05819cda62` |
| `styles.css` | `e9da76ff7840cea44b77912963977f1fe2ab762b69a9853d047712d7b3270494` |

Final `dist/` and installed disposable-vault bytes match these three hashes. Frozen ZIP `/private/tmp/kplex-si5-device-candidate-9d8b5c9.zip`, SHA-256 `b8416760417a4ecf7c2c7742e5bc5c7b1fb2f8117ed3a120f400c48b2a1de197`, contains only these exact three files; contents verified. The control used `main.js` **`bd1e24ae6946eaa8a5d4fab3b36587e8be423b7f41a820a11a30c124b194d2ad`** from the fresh predeployment backup; manifest/styles unchanged. Its verified source is parent `b48643c`. Candidate measurements occurred before the implementation commit; the [JSON evidence](settings-independent-indexing-si5-merged-selection-2026-10-04.json) records that dirty measurement parent, committed source/test input hashes, frozen artifacts and raw report hashes. No production changes followed verification.

Apple M1, 8 logical processors, 8 GiB RAM, Darwin 23.5.0; Node 22.22.2; Obsidian 1.14.4, installer 1.14.0; installed types 1.13.0. Same deterministic fixture: **20,015 Markdown owners, 20,016 physical files, 207 folders, 20,709 pages/relations and 715,032 evidence records**. Existing representative `Welcome.md` center, not the excluded synthetic hub.

These are **warm plugin disable/enable restarts inside foreground Obsidian**, not full application/process/device restarts. All candidate samples **72/72, 70/70, 78/78**, and control samples in JSON, are visible/focused with normal background throttling. Sampling does not prove no focus transition occurred between samples. No browser suite or other native driver overlapped timed trials.

The same opt-in `KPLEX_SI5_MEASURE_WAITS=true` probe forwards original promises/results and passively observes transactions, digests and yields. Fixed histograms and bounded groups avoid per-call samples/owner identities. Its overhead is unisolated. It starts after enable returns; earlier enable work and snapshot-cache transactions are unwrapped. Transaction intervals include request/callback/commit/promise scheduling, not exclusive disk I/O. Membership zero includes unwrapped work/waits, not CPU alone. Concurrent lanes and inclusive timings must not be summed.

## Candidate milestones — ms from before disable/enable

| Observation | Run 1 | Run 2 | Run 3 |
| --- | ---: | ---: | ---: |
| Disable completed | 39.7 | 35.1 | 32.6 |
| Enable returned | 184.8 | 179.1 | 175.2 |
| Wait probe began | 184.8 | 179.2 | 175.3 |
| Center present in DOM | 524.1 | 593.9 | 574.7 |
| Source authority observed | 63,974.5 | 61,607.0 | 67,376.4 |
| Requested semantics authoritative observed | 63,976.9 | 61,607.0 | 67,482.9 |
| Final strict-ready observed | 70,345.8 | 68,258.4 | 80,790.8 |

DOM presence is sampled every 100 ms and is **not actual paint or first touch-usable Plex latency**. Source/requested authority have exact production milestones below; counters such as semantic `pending` are cumulative events, not a current pending-scope count. The final status/authority checks are the readiness proof.

| Exact milestone from onload (ms) | Run 1 | Run 2 | Run 3 |
| --- | ---: | ---: | ---: |
| settings-loaded | 10.1 | 21.3 | 32.1 |
| layout-ready | 24.1 | 34.9 | 44.6 |
| host-inventory-start | 42.6 | 67.1 | 67.7 |
| host-inventory-end | 69.8 | 95.5 | 94.8 |
| preview-available | 388.8 | 442.5 | 417.8 |
| source-authority | 63,700.2 | 61,430.2 | 67,201.3 |
| first-requested-scope-authoritative | 63,739.5 | 61,470.2 | 67,324.6 |
| snapshot-complete | 70,173.0 | 68,131.8 | 80,593.2 |
| strict-ready | 70,173.7 | 68,132.7 | 80,594.0 |

## Candidate production phases — elapsed ms

| Lane / actual phase | Run 1 | Run 2 | Run 3 |
| --- | ---: | ---: | ---: |
| hydration / metadata | 43.9 | 58.1 | 47.8 |
| hydration / preview | 300.1 | 318.7 | 305.4 |
| hydration / preview-search | 18.7 | 28.2 | 17.4 |
| hydration / source-authority | 63,311.8 | 60,988.2 | 66,790.3 |
| source / source-inventory | 2.3 | 3.2 | 2.5 |
| source / source-coordinates | 8.1 | 6.0 | 7.4 |
| source / host-metadata-comparison | 54,673.5 | 52,211.9 | 58,186.5 |
| source / host-retired-owner-check | 901.7 | 476.5 | 748.9 |
| source / source-reconciliation | 7,027.9 | 7,945.3 | 7,397.9 |
| source / source-retired-owner-check | 691.6 | 350.3 | 423.3 |
| source / dependency-completion | 2.0 | 1.6 | 2.1 |
| source / resolution-reconciliation | 3.3 | 12.7 | 13.9 |
| source / dependency-final-validation | 0.9 | 0.7 | 0.8 |
| source / complete | 6,473.5 | 6,702.6 | 13,392.8 |
| hydration / requested-semantics | 39.2 | 39.8 | 117.3 |
| hydration / pages | 1,439.1 | 1,503.6 | 1,319.8 |
| hydration / relations | 1,501.4 | 1,649.4 | 1,407.7 |
| hydration / preview-search (pass 2) | 251.8 | 311.5 | 1,331.8 |
| hydration / evidence | 3,240.3 | 3,195.9 | 9,207.9 |
| hydration / promote | 0.5 | 0.8 | 0.6 |
| hydration / complete | 0.7 | 0.9 | 0.8 |

Hydration's source-authority phase waits for the source lane; it overlaps validation. Source-lane `complete` records idle time after authority, not another owner traversal. Snapshot metadata/preview/search begin before full source authority. Node-vocabulary, resolution-hydration and authoritative-search-preparation phases are **absent on this valid-snapshot route**; no artificial duration/percentage is assigned. Exact milestones, preview availability, executed search phases and every control phase remain in JSON.

## Exact work and transaction measurements

Each candidate and control has **four complete owner walks**, each **20,015 / 20,015**, with all six pairwise overlaps **20,015**: coordinates, host metadata comparison, source reconciliation, resolution reconciliation. Coordinates/resolution walks are small; the two validation walks each perform **20,015 dependency checks**. They are distinct freshness responsibilities; overlap alone does not justify removing the later pass.

| Per restart | Current control | Candidate |
| --- | ---: | ---: |
| Host head-only readonly transactions | 40,030 | 20,015 |
| Host dependency-selection transactions | 20,015 (three stores) | 20,015 (four stores including head) |
| Reconciliation head-only readonly transactions | 40,030 | 20,015 |
| Reconciliation dependency-selection transactions | 20,015 (three stores) | 20,015 (four stores including head) |
| Inspection calls | 80,060 | 40,030 |
| Head gets | 100,111 | 100,111 |
| Dependency checks / selections | 40,030 / 40,030 | 40,030 / 40,030 |
| Clean repair-settlement calls | 0 | 0 |
| MetadataCache lookups | 101,299 | 101,299 |
| Cached physical revision comparisons | 60,045 | 60,045 |
| Adapter-stat I/O | 0 | 0 |
| Source-chunk gets / posting range reads | 20,027 / 20,027 | 20,027 / 20,027 |
| Repository yields | 20,027 | 20,027 |
| Snapshot chunk gets | 935 | 935 |
| Lease meta adds / deletes | 40,032 / 40,032 | 40,032 / 40,032 |
| Markdown read/cachedRead, parses, acquisitions, repairs, rewrites, full builds | 0 | 0 |

Both conditions issue **40,106 meta gets**, **40,034 local-owner gets**, **40,030 repair gets**, and four Markdown-inventory calls. Physical comparisons use cached Vault identity/stats, not physical disk stat I/O. MetadataCache temporal counts include concurrent UI lookups; they are not exclusive source-method ownership. All heads/settings are unchanged by the streaming before/after verification. Exact head/owner request counts, unique-owner totals, processed denominators, operation counts and wait histograms are retained without exporting note contents or owner identities.

| Candidate observed wait intervals (ms) | Run 1 | Run 2 | Run 3 |
| --- | ---: | ---: | ---: |
| host-metadata-comparison / transaction | 42,339.8 | 39,804.1 | 45,091.7 |
| host-metadata-comparison / digest | 932.6 | 915.9 | 974.0 |
| host-metadata-comparison / yield | 184.8 | 176.8 | 173.6 |
| host-metadata-comparison / outside wrapped waits | 11,216.3 | 11,315.1 | 11,947.2 |
| source-reconciliation / transaction | 6,435.9 | 7,313.6 | 6,745.7 |
| source-reconciliation / digest | 199.8 | 216.9 | 214.4 |
| source-reconciliation / yield | 0.0 | 0.0 | 0.0 |
| source-reconciliation / outside wrapped waits | 392.2 | 414.9 | 437.8 |

| Same-UX control phases (ms) | Run 1 | Run 2 | Run 3 |
| --- | ---: | ---: | ---: |
| host-metadata-comparison | 49,582.1 | 53,766.8 | 51,813.3 |
| source-reconciliation | 9,017.1 | 9,610.9 | 9,128.6 |

The remaining long warm work is measured in **host metadata/family authentication**, followed by reconciliation and snapshot hydration. Candidate host comparison takes **52.212–58.187 seconds**. The third run's evidence hydration alone is **9.208 seconds**, versus **3.240/3.196 seconds** in the other two, despite unchanged snapshot records. Do not infer GC, exclusive disk time, CPU or scheduler cause from that variation. There is no unexplained generic 68-second cache-load bucket anymore.

The next possible investigation would attribute unwrapped lease release and existing reader-pin/chunk/posting transactions more precisely, then consider narrowly bounded batching only if justified. Head/lease/repair authority cannot be dropped because physical mtime matches. This is **not an additional SI5 prerequisite or an implemented optimization**; no new architecture/database/cache/projection framework, yield removal or memory increase is proposed here.

## Commands, cleanup and CLI limitations

```bash
PATH=/Users/zsviczian/.local/share/fnm/node-versions/v22.22.2/installation/bin:$PATH \
node --test tests/source-local-dependencies-indexeddb.test.mjs

PATH=/Users/zsviczian/.local/share/fnm/node-versions/v22.22.2/installation/bin:$PATH \
npm run verify

PATH=/Users/zsviczian/.local/share/fnm/node-versions/v22.22.2/installation/bin:$PATH \
KPLEX_TEST_VAULT_NAME=kplex-test \
KPLEX_TEST_VAULT_PATH=/Users/zsviczian/Obsidian/kplex-test \
KPLEX_TEST_CONFIG_DIR=/Users/zsviczian/Obsidian/kplex-test/.obsidian \
KPLEX_HOST_REPORT_DIR=/private/tmp/kplex-si5-merged-selection-warm-2026-10-04 \
KPLEX_SI5_WARM_CENTER=Welcome.md \
KPLEX_SI5_RESTART_RUNS=3 KPLEX_SI5_MEASURE_WAITS=true \
caffeinate -d -i node scripts/testing/obsidian/startup.mjs
```

Control: the identical third command with `KPLEX_HOST_REPORT_DIR=/private/tmp/kplex-si5-merged-selection-control-2026-10-04`, after verified prior-artifact staging. Temporarily copied the prior **generated** artifacts into `dist/` to preserve the unchanged driver's installed/build hash assertion, then restored the retained candidate bytes. No source/dependency edit for the control.

Staging and final normal-production smoke used pinned Node with temporary reviewed scripts:

- `/private/tmp/kplex-si5-stage-merged-selection.mjs`
- `/private/tmp/kplex-si5-stage-selection-control.mjs`
- `/private/tmp/kplex-si5-restage-merged-selection.mjs`
- `/private/tmp/kplex-si5-merged-selection-final-smoke.mjs`
- `/private/tmp/kplex-si5-merged-selection-retained.mjs`
- `obsidian vault=kplex-test dev:errors` — **No errors captured**, after candidate measurements and after final staging/smoke.
- `python3 /private/tmp/kplex-si5-build-merged-evidence.py` — **101 evidence assertions**, plus five final artifact/blob/normal-smoke/cleanup checks (**106 total** in JSON).

Fresh backup: `/private/tmp/kplex-si5-merged-selection-before-2026-10-04` contains the prior three artifacts, original `data.json` and original community-plugin enablement list. Raw candidate/control reports remain in their explicit directories; retained report and stage/smoke/verification logs are in `/private/tmp/kplex-si5-merged-selection-*`. Only the disposable test vault was touched; no personal vault was reopened/read.

All six timed runs and the final normal-production smoke pass. Final smoke has **diagnostic opt-in absent**, strict-ready, one rendered app/current center/canonical command, zero source work/full builds, private owner sets zero, no errors and complete controller cleanup. Original settings/enablement bytes remain identical after all attempts; final installed/dist/candidate hashes and committed source/test blobs are verified. Restoring the original excluded synthetic center makes live status updating; historical frozen strict-ready is not current authority.

Every individual CLI read has a **30-second process cap**, polls every **five seconds**, reconnects after **ten seconds** if necessary. Native work runs independently with retained completion/error/progress; there is **no outer readiness deadline** and production watchdogs are unchanged. Actual reconnects in these six runs: **zero**. Recovery logic exists but no lost-read fault injection is claimed. CLI enablement state can differ from loaded-instance state after native disable; staging uses matched deferred native disable/enable and checks the actual instance. Foreground the exact renderer before preflight/reload and every timed run; background app/window throttling is a real measurement limitation.

The generic `npm run verify:obsidian` wrapper was not rerun on this checkpoint: it repeats the unchanged full suite and uses synchronous configured-state CLI staging. Full verification was run once on the final source; its applicable native artifact/command/DOM/error assertions were performed with matched native lifecycle staging and the final normal smoke, plus the stricter independent warm probe. This is the exact procedure executed, not a claim that the generic wrapper or new native fault/popout lanes were run. Historical accepted fault/popout evidence is explicitly identified in the [closeout audit](settings-independent-indexing-si5-closeout-audit-2026-10-04.md).

## Remaining SI5 gate

The bounded desktop investigation and settings-route/retirement audit are complete. SI5 remains **open** for the maintainer's physical iPad/Android [checklist](settings-independent-indexing-si5-device-checklist.md): real settings/navigation latency, touch, interruption/suspension/sync/reopen, correct provenance/search/edit readiness and retained source progress. Use the three exact candidate hashes above. Do not equate desktop DOM/timers/JS heap with physical paint, touch or device peak memory.

Extreme synthetic cold is accepted; the 20k hub `decode-budget` and separate high-node profile remain documented excluded stress limits. No further cold/dense-hub optimization, memory increase, C15–C26 or automatic architectural work. A failed/unmeasured required device result remains open; no implicit waiver or release acceptance.
