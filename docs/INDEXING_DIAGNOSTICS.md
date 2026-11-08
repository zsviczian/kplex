# Unified diagnostics and indexing history

**Copy index diagnostics** and **Report bug** use one synchronous capture and safe projection.
The former copies raw JSON; the latter wraps exactly that JSON in the existing support-report
Markdown heading and fenced block, preserving the native preview and clipboard controls.
Separate invocations naturally have different capture times. Neither command starts indexing,
opens storage, records readiness or waits for historical loading.

## Canonical JSON, version 2

| Section | Contents |
| --- | --- |
| `plugin` | Fixed plugin ID, installed `manifestVersion` and embedded `buildId`, separately |
| `index` | Status, graph, hydration, sources, recovery, decisions and `cache` |
| `index.cache` | Saved generations, pending/active persistence with remaining delay, latest writer outcome |
| `environment` | Host/API/installer versions, OS, device, locale, theme and permitted installed-plugin metadata |
| `indexingPreferences` | Allowlisted indexing/pacing and related preferences |
| `startup` | Admission, progress, timing availability, aggregate source/semantic work and bounded detailed phases |
| `session` | Bounded finite session events, capture availability and omission summary |
| `indexingActivity` | Current lifetime's existing schema-1/capture-1 numeric activity summary |
| `indexingHistory` | Compact prior lifetimes, schema/statistics version 1, availability, bounds and omissions |
| `truncation`, `limits` | Explicit deterministic omissions and the combined export budget |

Identity and environment are not repeated inside the index. Current activity's `settings.build`
moves to `plugin.buildId`; every historical session retains its own manifest and build values.
For example, an installed manifest `0.4.1` and embedded build `0.4.2` remain distinct.

Both formats fit **48 KiB including the Markdown wrapper**. Current scalar state is readable;
large numeric activity and historical summaries occupy compact JSON lines. Historical dictionaries
appear once through the current activity's `columns`, or once in history if current activity is
unavailable. A prior session never repeats the complete support report or its dictionaries.

Trimming first removes older healthy historical summaries, then older exceptional summaries;
current state/activity take priority. If necessary, oldest session events, excess plugin metadata
and older detailed startup rows follow. Counts disclose every omission. Export trimming never
changes recorder state or persisted history. A report can contain fewer sessions than storage.

## Rolling history and durability

One existing IndexedDB `meta` key, `indexing-history`, holds compact evolving session rows.
There is no database schema upgrade, vault file, installation identifier, networking or upload.
An explicit purge of the index database also removes this local diagnostic history.
Retention is bounded to the current lifetime plus **16 previous lifetimes**, and **96 KiB** of
ASCII JSON. Oldest rows are evicted, preferentially retaining the two most recent failures or
interruptions when possible within both bounds. No counters are joined across lifetimes/builds.

Each row contains manifest/build identities, UTC start/checkpoint timestamps, termination status,
aggregate counters, reason ordinals, phase durations, the last global explanation, up to four
recent outcomes, incomplete/active work and the compact cache-save pending/active/writer receipt.
This preserves a failed or stalled cache writer even if graph preparation already settled.
Elapsed measurements use the existing monotonic
recorder; wall time only describes historical observations and ordering. A missing normal-unload
marker is **`interrupted-or-unknown`**, which does not assert that Obsidian crashed.

The write policy is deliberately bounded:

- Start loading/merging asynchronously at plugin startup, with an initial lifetime marker.
- Allow one early checkpoint at first strict readiness, so fast development reloads retain useful
  results even before five minutes have elapsed.
- Retain an observed failure promptly, at most once per five minutes, so a quick restart does not
  lose the failure between the initial marker and the periodic checkpoint.
- Thereafter checkpoint at most every **five minutes**, only for changed or still-active/stalled
  work. One timer also covers indexing with no progress or phase transitions. Idle wakes do not write.
  Each completed checkpoint resets that timer, including an early readiness/failure checkpoint.
- Backgrounding flushes only an already-due checkpoint. Normal unload attempts one final checkpoint;
  durability never relies on unload. `Reload app without saving` may omit normal unload entirely.

Existing coarse boundaries only set a dirty flag. File/progress loops do not serialize or write
history. Writes are serialized/coalesced to one pending and one latest checkpoint. A native atomic
read/merge/write preserves another lifetime's newer rows. Diagnostic connections open only an
existing supported database, have a one-second abort deadline and close after completion. Their
failure cannot change index storage health, retry admission, source acquisition or graph behavior.

Historical export reads immutable, already-loaded memory. `loading`/`unavailable` remains explicit
when needed. Persisted rows are re-projected through fixed shapes, finite numeric categories,
strict timestamp/version/build grammars and size/count bounds; malformed rows are rejected.
Unknown fields, paths, contents, ontology/property names, URLs, queries, identifiers and raw errors
cannot become history. Installed-plugin/theme metadata is allowed only in the current support
report and is never copied into historical sessions.

## Local build identities

`npm run build` remains the deterministic release/scanner build: identity is the manifest version,
with identical behavior in clean/dirty Git checkouts and source archives. Release workflows keep
using that command. No timestamp, dynamic Git metadata or generated-code fingerprint enters it.

Use **`npm run build:local`** for optimized local vault deployment. It uses production minification,
React hardening and bundle settings, but the existing esbuild `define` injects a bounded identity:
`VERSION+12hex[.dirty].local.YYYYMMDDTHHmmssSSSZ`, or
`VERSION+source-archive.local.YYYYMMDDTHHmmssSSSZ`. Never publish these artifacts as releases.
`npm run dev` refreshes the same local identity on each actual watch rebuild without causing an
extra rebuild. There is no bundle self-hash or post-compilation identity insertion.

## History/export overhead checks

Representative supplied diagnostic samples combined with 80 installed plugins,
32 session events, startup rows and 16 prior sessions produced Markdown exports
of 48,865, 48,858 and 48,730 bytes, within the 49,152-byte combined limit.
They retained four, two and two prior sessions with explicit omission counts;
the corresponding persisted histories remained 28.5–32.4 KB. Export omissions
did not remove persisted sessions.

Amplified checks measured about 1.12 ms per statistical checkpoint, approximately
124 KB retained heap per controller with 16 prior sessions (including its recorder
and closures), and 0.575 ms mean / 0.9 ms p95 for 100 real Chromium IndexedDB
writes of a 32,668-byte history. A simulated idle day performed 288 safeguard
wakes with zero writes; a million coarse dirty notifications also performed zero
writes. These are isolated diagnostic measurements, not whole-vault startup CPU
or physical-mobile measurements. Native indexing/restart acceptance is separate.

## Restart acceptance

Usable graph readiness and durable complete-cache activation are distinct. Reports expose both.
Intervening note-patch batches retain an earlier pending cache-save deadline; closing the last
Plex preserves a completed graph's save, while partial graphs retain cancellation. Reloading before
a write commits can still require recovery: no unload-time synchronous full-vault flush is added.
After coherent initial hydration/reconciliation, the coordinator consumes any required startup
snapshot immediately, including a save queued by an early foreground patch. It adds no scheduled
wait and does not block navigation on storage. An unchanged restored snapshot needs no rewrite;
partial/source-backed views cannot flush a complete generation. Ordinary later edits retain the
existing five-minute coalescing bound because a complete large-vault snapshot is expensive.
An unchanged metadata patch with unchanged physical stamps and no new discovered fields does
not schedule another snapshot or cancel a valid writer. Physical-only edits, including an
equal-mtime size change, still require persistence. The retained deadline also spans an active writer. A newer patch still cancels obsolete output,
but its replacement save does not wait another full edit-idle interval. Only the current writer
can clear its completed deadline; a retired writer cannot clear a newer scheduled retry.
The full snapshot includes the entire graph, including URL and virtual nodes, rather than just
Markdown files. Its per-path page records support requested-center startup; bulk page/evidence
chunks support full restoration. Rewriting both representations is substantial maintenance in a
large graph. Individual source inputs remain independently durable in the existing source store;
no-op metadata notifications must not request another full snapshot simply to renew their receipt.
Follow [the restart acceptance procedure](../CONTRIBUTING.md#indexing-and-persistence-acceptance),
including two unchanged **Reload app without saving** cycles and post-0.4.1 targeted regressions.

A closed saved source inventory may reuse exact activation-bound native observation
checksums on restart. The cheap comparison must not be confused with a source-family
audit: unchanged owners are neither authenticated again nor replayed. A finite offline
edit set uses existing source-local repair and compatible-snapshot patching. Legacy,
missing or invalid reuse proof takes ordinary authenticated recovery once; reports
must show its actual admission and settlement. The diagnostic history is independent
of these index reuse records and cannot grant index readiness.

Restart certificate reads use bounded sixteen-owner waves in one readonly transaction;
validation, ordering and the number of records read remain unchanged.

Graph usability and the activity indicator are separate. A usable graph may still
have metadata validation, URL restoration or cache persistence running. The
indicator retains its updating appearance for that active work and turns green
after settlement and cache-save completion. A delayed complete-cache save has a
steady orange indicator and an explicit pending-save line. This distinguishes
usable relationships from durable restart data without shortening the normal
write-coalescing interval or blocking navigation.
The scheduled-save line explains its five-minute upper bound. Scheduling, writer start and
writer completion notify the existing status subscribers, so an idle canvas cannot retain a
stale pending label. While URL/source/cache work remains, the tooltip shows those activities
without an additional unqualified ready line. The green ready state follows complete settlement.

Parsed native metadata is not proof that Obsidian's aggregate link maps have
finished loading. Where the guarded native `isCacheClean()` capability is
available, the existing source owner waits on the public `resolved` event before
comparing restart inputs. Intermediate resolver closes recheck that capability;
unload cancels the listener and settles the wait. This uses no polling timer,
transaction, parsing or foreground-priority lease. The tooltip reports **Waiting
for Obsidian link resolution**, and recovery reports the fixed `native-resolution`
phase. Cached graph presentation remains independently usable.

A complete, current header/input comparison can discharge unchanged initial
per-file resolver notifications. Notification cardinality alone does not turn
them into changed sources. Actual body modifications, new incarnations, moves,
replay damage and changed cached inputs retain ordinary selective repair and its
dependency fan-out. This does not equate temporarily empty native maps with
deleted relationships.
After startup, a known metadata/resolver notification compares the selected source's current
canonical families with its authenticated stored facts before rewriting an equal activation.
That bounded equality check preserves the original source observation and does not scan other
notes. Real body events, changed physical stamps, metadata/resolution changes, damaged families
and new incarnations retain the ordinary repair path.
`recovery.source.metadataComparison` records only the last equality outcome and fixed family
code, so another repair can be distinguished from an equal notification without recording its note.

Full graph publication, including snapshot recovery and progressive cold startup,
uses exact per-source publication receipts to consume the coordinator's covered
startup-create backlog. A newer same-source observation remains queued. A
completed graph with only covered startup bookkeeping can become current without
another whole-vault patch pass. Watch both full-build starts and subsequent
per-file batch sizes when diagnosing prolonged startup work.

The single tracked body-free startup baseline does not consume a snapshot retry
when no foreground task is pending and no file has committed. Actual foreground
commits, reentrant publications and source, identity or policy changes retain the
ordinary rejection fences and bounded retry path.

## Deferred startup

With pre-open preparation disabled and no opened Plex, status is **Waiting for K-Plex to open**
(`deferred`), with readiness false. Passive diagnostics do not enumerate files, hydrate cache data or
admit work. Startup diagnostics include the captured persisted device class, `beforeView` preference
the session’s `mode` and the `admitted` flag. The `index-admitted` timing mark separates deferred time from actual preparation;
source/hydration inactivity watchdogs start only when their existing phase begins.

## Initial-center recovery

A node-only source recovery publication retains existing fenced cached/local
center reads before replacing the global facade. Their native-file, source and
policy guards continue to apply, and they grant no new write authority. A
stationary center must not lose body-only connections while global source
validation is pending, including at an intermediate presentation notification.

Each newly mounted visible Plex checks its initial stationary Markdown center after
three seconds. Progress events do not postpone the check. An incomplete check may
get one check when its local baseline becomes ready and one when the existing
global source owner becomes ready. Already-observed milestones do not repeat;
there are at most three checks and no polling loop. The `local-ready` trigger
does not claim global source or write authority. Navigation, hiding, closing and window retirement fence or cancel
the check. Existing foreground readers and demand owners perform any repair;
the watchdog does not start a full build or write notes.

The existing persisted decision history and both diagnostic exports include
`center-watchdog:*` entries. Their optional `centerCheck` contains the trigger,
outcome, source-readiness flags, active-work flag, before/after coverage and three
five-number count vectors: `presented`, `before` and `after`. Vector order is
parents, children, left friends, right friends, siblings. Counts describe the
display-limited neighborhood before lenses and section expansion. `durationMs`
includes awaited work and is not CPU time or paint latency.

`canonical` denotes the existing current complete-center proof. `local`, `cached`,
`preview` and `missing` describe progressively different read coverage, not write
authority. `repaired` means role counts changed; `repainted` means a presentation
notification was needed; neither alone proves complete coverage. A `checking`
entry without completion can identify work still awaiting its existing owner,
or a completion no longer present in the bounded history. Entries are historical;
use the report's current active-work counters to distinguish those situations.
Counts cannot detect every same-count relationship substitution or explain a host
that has not yet supplied the missing metadata.

No center path, filename, tag, URL, note content or raw error is retained. The
decision history stays capped at 20 entries and protects its latest two
non-healthy center entries from later background traffic. Collection uses the
existing diagnostic storage queue, without a new database schema or settings
writer. After an incomplete startup, use **Copy index diagnostics** or **Report
bug** before restarting again. Repair remains a bounded safeguard, not a claim
that every intermittent startup failure has been eliminated.

## Collection and privacy

Use the reviewed build normally for several hours to a day, then use **Copy index diagnostics** or **Report bug**. Review the copied text before sharing it. Record symptoms, build changes and plugin reloads separately. Copying never uploads a report or resets the capture. Several reports from one session overlap; they are not independent samples. No debug-console setup or profiling is needed.

The `indexingActivity` capture lasts for one plugin lifetime. Reload, process termination and mobile process eviction reset that current recorder; compact checkpoints survive in `indexingHistory` as described above. The separate bounded startup-decision history, including center checks, also uses existing diagnostic storage. Only fixed categories, counts, durations and public build/mode metadata enter the activity recorder. It retains no note/drawing content, paths, names, URLs, property values, custom field names, queries, raw exceptions/stacks or source identities. Existing disclosed theme/plugin metadata remains subject to the existing support-report policy.

The current-session recorder creates no timers, polling, watchers, I/O, network or CPU/heap sampling. Its history wrapper owns only the bounded checkpoint timer and diagnostic metadata operations described above. `processed()`/per-file/parser/link/evidence/IDB loops add no new instrumentation. Coarse pass/phase/invalidation boundaries sample already maintained numeric counters; detailed owner/overlap profiling stays opt-in and separate.

## Retention and interpretation

The current recorder uses one fixed 1,024-cell Float64 store (8,192 backing bytes), eight Uint32 totals, fixed tokens/scalars and static dictionaries. The backing size is not its complete retained-memory cost; container/dictionary/clock overhead must be measured. Its current-session additional-state target remains 32 KiB. Separately, rolling history retains at most the decoded bounded session summaries plus one pending/latest checkpoint; the 96 KiB storage limit is an encoded-byte bound, not a JavaScript heap measurement.

- 25 hourly slots retain the previous full 24 hours plus the current partial hour. Slots rotate only on real coarse activity. Explicit copy projects the relevant window without mutating it; long idle jumps visit at most 25 slots.
- Lifetime totals, first-observed startup milestones, two active pass rows, 16 recent completed rows and a separate last-global-pass explanation survive local churn. Old detail rotates; lifetime totals do not. Two active-detail slots are a real cap: overflow increments omissions and makes outcome coverage explicitly capacity-limited.
- Start counts belong to the start hour. Outcomes and whole-interval counter observations belong entirely to the completion hour. No work is prorated across hours. Passes and lanes may overlap: their counter deltas and elapsed times are **not exclusive work or CPU** and must not be summed as such.
- A visit/check is not a unique note. Unknown/reset/absent counters become null, not zero. Saturation at `2^32 - 1` sets an explicit flag; it never wraps. These summaries do not measure physical storage bytes, CPU, energy, exclusive waits or paint.
- Monotonic session-relative milliseconds establish order. Detected clock rollback clamps ordering; long observed gaps are recorded without claiming suspend or continuous execution. Zero observations in an hour do not prove continuous idle or zero CPU.
- The current activity object is at most 8 KiB; the complete copied report remains at most 48 KiB including the Markdown wrapper. At activity capture, oldest recent detail is omitted first, then phase aggregate detail, then oldest displayed hour rows if necessary. Explicit omission counters preserve interpretation. Core totals, startup and last-global explanation remain. Recorder state is not truncated by copying.

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
| `settings` | Actual session indexing mode, actual URL strategy, live pacing mode | Build identity is canonical at `plugin.buildId`, and separately retained in each historical session. Pending preferences remain separate from actual strategy; no runtime bundle hash or private label. Missing facts are null. |
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

Accelerated 24/48-hour tests cover retention, rollover, idle gaps, overlap, cancellation, privacy,
saturation, disposal and event storms. They do not establish 24 hours of real-device use. A real
120.34-minute Windows On-demand session now passes five natural edit/drain/capture checkpoints,
240 foreground samples and 235 unchanged-idle controls. A temporary test-owned display-awake
lease prevents the existing host timeout and is released during cleanup; failed focus controls
remain preserved. The aged-session actual Settings/main/popout report lane also passes.
Independent amplified overhead measurements remain separate from native timing observations.
Actual 24-hour, macOS and physical-mobile acceptance remain unrun. Folder-wave resource gains
cannot pay for diagnostic overhead. See [the PR validation report](validation/local-folder-diagnostics-174-2026-10-17.md)
for measured results, exact conditions and remaining platform checks.
