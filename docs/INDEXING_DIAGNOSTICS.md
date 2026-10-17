# Indexing activity diagnostics

PR #174 implementation reference (schema 1, capture 1; draft acceptance). Both **Copy index diagnostics** and **Report bug** include the shared, bounded `indexingActivity` summary. Explicit report capture reads retained scalar health without recording readiness or starting work. Windows native main/popout export acceptance has passed. Two foreground-soak attempts stop on failed focus prerequisites; the required real two-hour acceptance remains unproven. No actual 24-hour device run has been completed. No efficiency claim follows from the schema alone.

## Collection and privacy

Use the reviewed build normally for several hours to a day, then use **Copy index diagnostics** or **Report bug**. Review the copied text before sharing it. Record symptoms, build changes and plugin reloads separately. Copying never uploads a report or resets the capture. Several reports from one session overlap; they are not independent samples. No debug-console setup or profiling is needed.

Capture lasts for one plugin lifetime. Reload, process termination and mobile process eviction reset it. There is no cross-session diagnostic identifier or persistent diagnostic log. Only fixed categories, counts, durations and public build/mode metadata enter the new recorder. It retains no note/drawing content, paths, names, URLs, property values, custom field names, queries, raw exceptions/stacks or source identities. Existing disclosed theme/plugin metadata remains subject to the existing support-report policy.

The default recorder creates no timers, polling, watchers, heartbeat, I/O, network, CPU/heap sampling or background maintenance. `processed()`/per-file/parser/link/evidence/IDB loops add no new instrumentation. Coarse pass/phase/invalidation boundaries sample already maintained numeric counters; detailed owner/overlap profiling stays opt-in and separate.

## Retention and interpretation

One fixed 1,024-cell Float64 store (8,192 backing bytes), eight Uint32 totals, fixed tokens/scalars and static dictionaries own the new state. The backing size is not its complete retained-memory cost; container/dictionary/clock overhead must be measured. The hard additional-state target is 32 KiB.

- 25 hourly slots retain the previous full 24 hours plus the current partial hour. Slots rotate only on real coarse activity. Explicit copy projects the relevant window without mutating it; long idle jumps visit at most 25 slots.
- Lifetime totals, first-observed startup milestones, two active pass rows, 16 recent completed rows and a separate last-global-pass explanation survive local churn. Old detail rotates; lifetime totals do not. Two active-detail slots are a real cap: overflow increments omissions and makes outcome coverage explicitly capacity-limited.
- Start counts belong to the start hour. Outcomes and whole-interval counter observations belong entirely to the completion hour. No work is prorated across hours. Passes and lanes may overlap: their counter deltas and elapsed times are **not exclusive work or CPU** and must not be summed as such.
- A visit/check is not a unique note. Unknown/reset/absent counters become null, not zero. Saturation at `2^32 - 1` sets an explicit flag; it never wraps. These summaries do not measure physical storage bytes, CPU, energy, exclusive waits or paint.
- Monotonic session-relative milliseconds establish order. Detected clock rollback clamps ordering; long observed gaps are recorded without claiming suspend or continuous execution. Zero observations in an hour do not prove continuous idle or zero CPU.
- The new compact object is at most 8 KiB; the complete copied report remains at most 32 KiB. At capture, oldest recent detail is omitted first, then phase aggregate detail, then oldest displayed hour rows if necessary. Explicit omission counters preserve interpretation. Core totals, startup and last-global explanation remain. Recorder state is not truncated by copying.

## Shared field dictionary

Both exports receive the same owned `indexingActivity` object and shared projection. Eight fixed weak admission slots admit only the eight latest deeply frozen captures constructed by this module, without strongly retaining those report objects. Both synchronous export paths use the same fresh capture. Older captures become unavailable; this is a copy-boundary safety check, not persistent authority. Unknown objects, getters, proxies and `toJSON` cannot become a diagnostic input. JSON roundtrips do not preserve that internal brand. No persisted trust format is introduced.

`columns` supplies fixed public dictionaries and column order for numeric rows. Categories are fixed ordinal values, not vault IDs. Every row below resets with the plugin lifetime; no user-supplied keys are retained.

The legacy detailed `on-demand-center-patched` marker occurs inside a per-file patch loop and is deliberately excluded from default capture. Its default milestone remains null. Requested-scope publication supplies the coarse semantic-readiness boundary instead.

| Field | Owner, unit and aggregation | Limits/privacy/interpretation |
| --- | --- | --- |
| `schemaVersion`, `captureVersion` | Recorder/projection public integer versions | Unknown external objects/versions are unavailable. |
| `status`, `ageMs`, `windowStartMs` | Recorder lifecycle and injected monotonic clock, milliseconds | Session-relative; no wall clock or persistent session/vault ID. |
| `clock`, `clockRegressions`, `longObservationGaps` | Recorder coarse-boundary clock observations | Gaps are not proof of sleep, CPU or continuous coverage. |
| `saturated`, `outcomeCoverage` | Fixed recorder capacity/counter guards | Capacity-limited outcomes are incomplete observations, not successful zero work. |
| `totals` | Starts and complete/incomplete/cancelled/failed/superseded outcomes; coarse cause and unrecognized-category counts | Fixed counters; starts include work whose detail could not fit; omitted outcomes are disclosed. |
| `causes`, `pendingCause` | Fixed reason histogram plus first/coalesced cause mask since pass admission | Triggering observations, not a proven root cause. Unknown values increment a finite unknown category. |
| `milestones` | First actually observed known startup boundary, milliseconds after construction | Remains after readiness; absent milestones are null. No synthetic time-to-idle. |
| `phases` | Source/hydration lanes: current phase/open elapsed, transition counts, closed elapsed sums/maxima | Existing finite phase vocabulary; close on actual pass termination; elapsed includes awaits and lanes overlap. |
| `hours` | Hour index; local/global/unknown starts, completed/cancelled/incomplete-or-failed observations; source check/read/parse and build/save interval deltas | Fixed 25 rows; completion-time deltas are nonexclusive. No inferred per-hour CPU. |
| `recent`, `active`, `lastGlobal` | Kind/scope/start/elapsed/outcome/first cause/selection reason/coalesced mask; nine source and five session-work interval deltas; flags | 16 / 2 / 1 bounded rows. Last global is independent of local churn. Active rows have no fabricated outcome. |
| Source work columns | Acquisition's existing `checked`, `reusedBodies`, `legacyBodies`, `vaultReads`, `parses`, `repaired`, `resolutionRefreshes`, `pendingMetadata`, `failures` | Counter deltas across pass intervals; no identity sets or parallel per-file counters. |
| Session work columns | StartupDiagnostics' existing source inventory/full build/node catalog starts and activated complete/checkpoint saves | Saves count activation, not an attempted write. Lifetime owners remain authoritative. |
| `settings` | Public static build identity; actual session indexing mode, actual URL strategy, live pacing mode | Pending preferences remain separate from actual strategy; no runtime bundle hash or private label. Missing facts are null. |
| `current` | Already retained pending/source/hydration/semantic/build-blocked, persistence and scheduler scalar counts, plus current existing work counters | Read only on explicit capture through passive owners. Unsupported facts remain null; ready does not mean no background work. |
| `omitted` | Rotated/capacity/report-recent/report-phase/report-hour/expired-hour counts | Copy omissions and retained-state expiry are distinct; copying never erases history. |
| `work`, `duration`, `hoursBasis`, `columns` | Fixed public interpretation strings and dictionaries | No arbitrary labels, coercions, schema keys or private values. |

### Current health column owners

`ACTIVITY_CURRENT_COLUMNS` is the one ordering authority. The first 14 columns retain the initial
schema prefix; nine source counters and five session-work counters follow. The appended health
columns add no continuously maintained counters: explicit copy reads existing sizes, flags and
lifetime totals only. `StartupDiagnostics.captureActivity()` fills its own five session counters
by dictionary name; the index leaves those slots null. Missing facts remain null.

| Columns | Existing O(1) owner/fact | Interpretation |
| --- | --- | --- |
| `pendingKnown`, `knownImpactTasks`, `sourceActive` | Source acquisition's pending-known set size, impact-task count and inventory-promise flag | Pending-known owners can remain dormant in On-demand mode; this is not proof of active CPU work. |
| `hydrationActive`, `semanticActive`, `buildBlocked` | Hydration task flag, semantic-preparation task map size and build-blocked demand map size | `semanticActive` and `scopeTasks` intentionally expose the same existing task count under the stable prefix and appended health name. No scope validation/iteration occurs. |
| `repoWrites`, `repoDeleteTask` | Repository admitted writer-lane map size and delete-task flag | A lane can await storage or hold a pending replacement; neither value measures transactions or physical I/O. |
| `cacheWrites`, `cacheWriterActive` | Queued-body map size and existing body-writer flag | The ordinary queue retains in-flight batches until commit; no new writer/flush is started. |
| `schedulerMutation`, `schedulerCurrent`, `schedulerVisible`, `schedulerUrl`, `schedulerBackground`, `schedulerWaiting` | Existing scheduler aggregate lane counts/waiter size | Awaited/paced work is included; no CPU, idle or exclusive-wait claim. |
| `demandedCenters`, `scopeTasks`, `onDemandTasks`, `gateTasks` | Demand-count, semantic-preparation, On-demand and gate-task map sizes | Counts only, without paths, map iteration or acquisition. |
| `handoverStarts`, `handoverCompletions`, `handoverFailures` | Existing local-read handover lifetime totals | Starts need not equal completions while work is pending. |
| `semanticRequested`, `semanticPrepared`, `semanticPublished`, `semanticCancelled`, `semanticPendingObservations` | Existing semantic-preparation lifetime totals | Pending observations are cumulative admissions, not the current pending-task count. |
| `fullBuildAdmissions` | Existing GraphIndex full-build admission total | Includes progressive and private rebuilds; distinct from `fullBuildStarts`, which counts the complete GraphBuilder compiler entry. |
| `urlActive`, `urlProcessed`, `urlTotal` | Existing independent URL progress/task/publication scalars | URL work is not local semantic readiness; actual URL strategy is currently background even if a pending preference differs. |

The report uses the index's constructor-captured Eager/On-demand strategy, not a pending setting.
Pacing comes from the live scheduler. These passive getters never read a file/revision, enumerate
the vault, open storage, drain queues, compute status, freeze startup diagnostics or schedule work.

## Illustrative long-session readings

The examples below explain schema 1; they are **not measured native reports**. The selected-field
JSON fragment is incomplete for readability, not an alternative schema or an import format. Decode
all numeric rows using their own exported `columns` dictionaries; do not assume that ordinal values
are names or source identities. [The recorder tests](../tests/indexing-activity.test.mjs) remain the
executable authority for the accelerated scenarios.

Consider their serial fixture: a global `host-inventory` pass starts at 0 ms and completes at
500 ms after observing 88 checks. Its `firstCause` is `uncovered-non-file`, while its
`selectionReason` is `unscoped-resolved`. Then one local `local-maintenance` pass runs at each
hour from 1 through 24, lasting 25 ms and observing two checks, one fresh read and one parse.
There are no overlapping passes in this illustration. The two-hour row below is an intermediate
reading of that same schedule; the existing test directly asserts the 24/48-hour boundaries.

| Selected reading | At 2 h + 25 ms | At 24 h + 25 ms | At 48 h, with no activity since hour 24 |
| --- | --- | --- | --- |
| `ageMs` | 7,200,025 | 86,400,025 | 172,800,000 |
| `windowStartMs` | 0 | 0 | 86,400,000 |
| `totals`: `starts` / `complete` | 3 / 3 | 25 / 25 | 25 / 25 |
| Hour indices in `hours` before byte-budget omissions | 0 through 2 | 0 through 24 | 24 through 48 |
| `recent` rows / `omitted.rotated` | 3 / 0 | 16 / 9 | 16 / 9 |
| `omitted.oldHours` | 0 | 0 | 24 |
| `lastGlobal`: `startMs` / `checked` | 0 / 88 | 0 / 88 | 0 / 88 |

At the 24-hour boundary, selected fields would read:

```json
{
  "schemaVersion": 1,
  "captureVersion": 1,
  "ageMs": 86400025,
  "windowStartMs": 0,
  "outcomeCoverage": "complete",
  "totals": [25, 25, 0, 0, 0, 0, 25, 0],
  "omitted": { "rotated": 9, "capacity": 0, "oldHours": 0 }
}
```

The totals row decodes as 25 starts, 25 complete outcomes and 25 cause observations; the other
outcomes and unrecognized-category count are zero. This says nothing about CPU or storage bytes.
In an overlapping workload, adding pass-level reads or elapsed times would count shared intervals
more than once. A native capture's `current` queue/task fields describe the copy instant separately
from cumulative totals; dormant `pendingKnown` entries alone do not establish active work.

At 48 hours, startup's `strict-ready` milestone remains 500 ms and `lastGlobal` still explains the
old global pass, even though hour 0 is outside the displayed window and its pass has left `recent`.
It does **not** indicate a new global rebuild or identify a proven root cause. Copying alone leaves
`longObservationGaps` unchanged at zero in this fixture; the next actual coarse activity records
the observed long gap. Empty hour rows do not establish continuous idle, sleep or zero CPU.

Treat these other states explicitly:

- If a sampled counter falls from 10 to 0 during a pass, that pass's `checked` delta is `null`
  and its `flags` column records the counter reset. It is not ten negative checks or zero work.
- If more than two passes overlap, `omitted.capacity` increases and `outcomeCoverage` becomes
  `capacity-limited`. Recorded outcomes are incomplete observations, even after those passes end.
- `omitted.rotated` describes completed-pass ring eviction. `omitted.reportRecent`,
  `omitted.reportPhaseLanes` and `omitted.reportHours` describe copy-size omissions, which do
  not alter retained history. Neither category resets lifetime totals or `lastGlobal`.
- Reloading K-Plex starts a fresh lifetime: totals restart, old pass rows disappear and
  `lastGlobal` is initially `null`. An old copied report remains a historical document;
  without a persistent session identifier, do not subtract reports across a reload.

## Validation gates

Accelerated 24/48-hour tests cover retention, rollover, idle gaps, overlap, cancellation, privacy, saturation, disposal and event storms. They do not establish 24 hours of real-device use. Windows native copy/report acceptance and the separate amplified overhead measurements have passed; the required real two-hour native soak remains unproven after foreground-prerequisite failures. Those failed controls are preserved with successful cleanup; no focus oracle is weakened. Actual 24-hour, macOS and physical-mobile acceptance remain unrun. Folder-wave resource gains cannot pay for diagnostic overhead. See [the PR validation report](validation/local-folder-diagnostics-174-2026-10-17.md) for measured results and remaining platform checks.
