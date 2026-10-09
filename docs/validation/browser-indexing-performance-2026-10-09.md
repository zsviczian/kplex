# Browser indexing performance follow-up

Branch: `fix-browser-indexing-performance`, base main
`2a1fbb1024574b8504e59cf063d18ef8f3d921f9`. The maintainer authorized investigation and
fixes for the two remaining PR #104 Linux browser performance failures. Structural refactoring
remains paused at C14; publication/merge is a separate instruction.

## Failure and measurement boundaries

[GitHub run 37975361229](https://github.com/zsviczian/kplex/actions/runs/37975361229) on
Ubuntu 24.04 / Node 22.22.2 passed the original Node dense-update guard but failed:

- `tests/source-high-degree-publication.test.mjs:196`: the 20,015-owner case hit its unchanged
  840-second outer deadline during cached publication, before final correctness assertions.
- `tests/on-demand-indexing.test.mjs:667`: dense source patch with an active private URL lane
  recorded a 70.6 ms timer gap against the unchanged 50 ms guard.

Neither failure establishes its cause without a matched Linux baseline. Timer gaps include
synchronous work, microtasks, garbage collection and process scheduling; they do not measure
exclusive CPU or actual paint. Local browser results use macOS and pinned Node 22.22.2.
Root runs heavyweight probes serially; temporary instrumentation stays outside production source.

## Unchanged local baseline

The real production/Chromium IndexedDB 20,015-owner case passed all original assertions.
Whole test: 266.012 seconds; cached publication: 122.039 seconds; owner checks: 7,867,137.
Direct/optional passes: 1/0; one publication and two cancellation yields. Exact relationship,
provenance, metadata, degree, gate, search and cancellation checks completed. Reported reservations:
replay peak 405,146,310 bytes; combined peak 685,201,826 bytes. Sampled JavaScript heap peaked
at 576,598,970 bytes; that is not total process memory.

The unchanged active URL-lane case also passed, in 8.366 seconds total. Baseline 319-input
freeze: `c33593820d50d97395bf6287762e20ce499aee9058c638ee55d5a6b564ec2ff3`.
Receipts: `/private/tmp/kplex-browser-perf-high-baseline.log`,
`/private/tmp/kplex-browser-perf-high-baseline.json`,
`/private/tmp/kplex-browser-perf-dense-baseline.log` and
`/private/tmp/kplex-browser-perf-baseline-freeze.json`.

## Attribution, not acceptance timings

A temporary forwarding diagnostic on the unchanged 2,048-owner case passed the original
assertions. Cached publication took 12.451 seconds, including 63,651 repository transactions
with 8.939 seconds of inclusive wall time. Selected reads: 4,095 / 10.691 seconds;
family visits: 16,380 / 5.063 seconds; selection checks: 24,570 / 3.121 seconds.
These nested async spans overlap and must not be summed as CPU time. Transaction wall time
includes storage completion and event scheduling, not exclusive disk IO.

Repository task yields: 16,644 / 0.264 seconds; graph task yields: 1,017 / 0.017 seconds.
Environment checks: 845,712 / 0.321 seconds. The fixture root getter ran only three times,
with duration rounded to zero; a fixture rewrite is not justified by this measurement.
These measurements prioritize storage transaction reduction over task-budget or environment
validation changes. Receipt: `/private/tmp/kplex-browser-perf-high-diagnostic-2048.json`.

The temporary dense diagnostic passed. Its longest timer interval was 7042.10–7073.70 ms
relative to diagnostic start (31.6 ms). Source publication occurred later, 7086.5–7095.4 ms;
the first URL-alias task was dispatched at 7101.6 ms. This sample does not support the
combined source-publication/first-URL-slice hypothesis. Later URL flush took 15.1 ms.
Receipt: `/private/tmp/kplex-browser-perf-dense-diagnostic.json`.

## Current correction and remaining acceptance

The offline implementation agent implemented bounded single-chunk disk-family read coalescing
inside `NeutralSourceRepository`. Root supplied the measurements and reviewed the design:
one chunk and its first existing bounded posting page share a readonly transaction, without
granting authority from the preview. Existing SHA/frame/posting, head-selection, cancellation,
lease-release, memory and per-family finality checks remain required.

Dense-update preparation profiling, source review, regression checks, matched after measurements,
full real verification/build/scanner and applicable exact-build native checks remain pending.
No timing/deadline/memory/work-count guard is relaxed. Linux reproduction and physical-device
performance remain unproven until actual evidence is collected.

## Review checkpoint (19:35 UTC)

Pinned Node 22.22.2 `tsc --noEmit` and the real-IDB source repository suite initially passed
39 tests (zero failures/skips), including six new coalescing regression scenarios. Independent
review found UTF8 byte verification occurring before the existing decode-budget admission;
that allocation was moved under the reservation and an oversized incorrect-byte-count case
was added. The corrected exact source requires a fresh run. No transaction/head/lease check
was removed to obtain the reduction.

A second unchanged dense diagnostic with CPU sampling passed the original timer guard
(26.7 ms). The CPU profile includes storage repair, fingerprint hashing, graph preparation
and evidence Set construction. Its profiler and browser timestamps were not explicitly
aligned, so exact sampled attribution of the longest interval is not yet established.
A short TypeScript check overlapped early profile setup; this run is attribution only.
Receipts: `/private/tmp/kplex-browser-dense.cpuprofile` and
`/private/tmp/kplex-browser-perf-dense-profile-metrics.json`.

## First matched coalescing comparison

The same forwarding diagnostic and 2,048-owner fixture passed after the reviewed budget fix.
Cached publication: 11.240 seconds versus 12.451 seconds before (9.7% lower in this single
local pair). Transactions: 47,271 versus 63,651, exactly 16,380 fewer (25.7%). Family visits
16,380, selected reads/pins/unpins 4,095, exact-head checks 24,570, digests 53,566 and
repository yields 16,644 are unchanged. Additional preview cancellation fences increase
owner checks from 805,274 to 838,034; they were retained. Semantic passes/publication and
reserved memory remain unchanged. This is a small-fixture local comparison, not Linux
acceptance or a universal speedup. Receipt: `/private/tmp/kplex-browser-perf-high-after-2048.json`.

## Aligned dense preparation profile

The untouched baseline ran with a uniquely named approximately 3 ms clock marker before
heartbeat admission. Marker begin/end and 1 ms CPU samples align the profile to the browser
metric timeline within sampling uncertainty. Original assertions passed (28.5 ms longest
interval, 7,094.9–7,123.4 ms relative to metric start). That interval samples URL collector/
compiler work: node creation/reference update, endpoint seeding, URL normalization, fallback
name formatting, evidence insertion and about 4.5 ms of garbage collection. It is not the
source-publication/first-alias task interval. `pairKeysForPath` ran 80,012 times, 28.6 ms
aggregate, maximum 0.6 ms; a large individual Set copy is not supported by this sample.

Source review identifies two avoidable compiler allocations in this measured stage:
`consumeBodyUrl` builds an alias Set even when no aliases were supplied, and eagerly
formats the already-existing source's fallback name for every URL. The offline agent is
correcting these paths without changing scheduling, slice budgets, reference policy or
publication. Actual improvement and new work-count/parity tests remain pending.
Receipts: `/private/tmp/kplex-browser-perf-dense-profile-anchored-metrics.json` and
`/private/tmp/kplex-browser-dense.cpuprofile`.

## Reviewed full-size local comparison

The original uninstrumented 20,015-owner case passes on the reviewed storage correction.
Cached publication: 114.097 seconds versus baseline 122.039 seconds (6.5% lower in this
single local pair); whole test 254.064 versus 266.012 seconds. All original correctness,
no-IO, work-count and cancellation assertions complete. Reserved replay/combined peaks
remain exactly 405,146,310 / 685,201,826 bytes. Owner checks rise to 8,187,369 because
preview fences remain active. Sampled JS heap 419,907,327 bytes is not total process peak.

The corrected exact source repository suite independently passes 39 tests, zero failures/
skips, 12.538 seconds, including the oversized false-byte-count regression added at review.
Receipts: `/private/tmp/kplex-browser-perf-high-after-20015.json`,
`/private/tmp/kplex-browser-perf-high-after-20015.log`, and
`/private/tmp/kplex-browser-perf-source-reviewed.log`.

The original Linux log enters cached publication by 18:58:24 UTC and reaches the deadline
at 19:06:38 UTC; it does not include a completed publication measurement. The local gain
supports retaining coalescing but does not by itself establish that the Linux deadline is fixed.
The timing guard and deadline are unchanged; final Linux acceptance remains pending.

## Final compiler checks and first full gate

Pinned TypeScript and compiler/source-patch tests pass: 33 tests, zero failures/skips.
The original active-URL browser case passes on the reviewed allocation correction (8.5 s
case, 9.474 s process). The same aligned diagnostic passes at 31.2 ms longest interval;
preparation 142.9 ms, collector aggregate 79.4 ms, source publication 9.0 ms. This single
pair versus 28.5 ms before does not establish a timer speedup. Work-count regressions prove
removed redundant allocations; actual Linux timer acceptance remains pending.

The first full verification passes architecture/core, then stops at scanner lint: unsafe
assignment from the iterator's untyped return-value union in the posting preview. Root
replaced direct `.next().value` access with typed `for...of` and early break, which closes
the generator and retains the same first-page behavior. Fresh lint, full verification and
native staging are required on this final correction. No build was installed by the failed run.

## Controlled slower-CPU diagnostic

After clean scanner lint, root ran the same anchored diagnostic on an untouched baseline with
explicit CDP CPU throttle rate 4. It fails the unchanged 50 ms guard at 62.2 ms. The aligned
interval contains synchronous source publication (36.4 ms) and following private URL preparation
before its first real task release. Sampling includes search/cache/facet work, touched-path copying,
URL normalization and the first private alias checkpoint. This is a reproducible controlled stress
case, not evidence that Chrome throttling reproduces Linux or that every Linux failure has this cause.

The allocation-only reviewed code passes the same single stress run (35.5 ms maximum interval);
source publication still takes 35.7 ms and can join the first private URL slice through microtasks.
The interval's position is timing-sensitive. A scoped explicit host-task release is therefore being
added only to URL refreshes launched by source publication, after synchronous completion and
before independent private derivation. Task registration, native read-count/byte admission and
file/event/purge/unload fences remain; no semantic scheduler budget or publication await changes.
Actual correction tests, stress rerun, full verification and native acceptance remain pending.

Receipts: `/private/tmp/kplex-browser-perf-dense-throttled-before-metrics.json`,
`/private/tmp/kplex-browser-perf-dense-throttled-after-metrics.json` and their CPU profiles/logs.


## Task-boundary stress review (19:58 UTC)

Source publication now opts into a real host-task release before its independent URL derivation.
Registration/deduplication and native count/byte admission remain synchronous; the resumed task
rechecks exact file identity, revision, event, purge and unload. No await enters atomic graph,
cache, fingerprint, search or notification application. Other URL refresh callers retain their
existing scheduling.

The instrumented CPU4 run still failed at 59.1 ms, but no first-alias preparation appeared in
that interval: the boundary worked. The interval included 42.3 ms of atomic publication plus
prior helper/copy/GC work, with approximately 6 ms of forwarding overhead. It does not justify
another publication-order change. Root therefore reran the original test with CPU4 throttling
and all original assertions, without CPU sampling or forwarding spans. The untouched baseline
fails at 54.0 ms; the complete correction passes at 35.5 ms. The after case completes in
21.572 seconds. These are single controlled local stress observations, not Linux acceptance.
No guard, fixture size, work count or deadline changed.

Receipts: `/private/tmp/kplex-browser-perf-dense-boundary-throttled-metrics.json`,
`/private/tmp/kplex-browser-perf-dense-unprofiled-before.log` and
`/private/tmp/kplex-browser-perf-dense-unprofiled-after.log`. Fresh focused cancellation checks,
full verification/build and exact-build native checks remain pending.


## Final source review and gate start

Root independently reviewed the final three production files and both new URL task/fence tests.
The offline return passes all seven URL-alias tests (1.176 s), pinned TypeScript and full installed
Obsidian scanner lint, with zero failures/skips/warnings. The typed preview iteration is retained.
Final runtime/test freeze: 319 inputs,
`2931af7a9668103e30c022dd04486a83a23bd977761e085cca8fc3a60d2be122`.
Full verification/native staging starts from this exact source at 19:59 UTC, using fresh receipts
`/private/tmp/kplex-browser-perf-full-verify-final.log` and
`/private/tmp/kplex-browser-perf-full-native-final/report.json`.


## Final full verification and native dense update

Final `verify:obsidian` passes at 20:11:23 UTC on pinned Node 22.22.2 / macOS Darwin23.5:
architecture 7, core 88, aggregate 496, UI 20, portable source 333 and real Chromium/IndexedDB
417 tests; zero failures/skips. Real installed TypeScript, Obsidian scanner and production build
pass. Both original performance cases pass in this full run. The unchanged 20,015-owner case
completes in 265.863 s; cached publication 117.331 s, exact reserved replay/combined peaks
405,146,310 / 685,201,826 bytes, all original semantic/no-IO/cancellation assertions pass.
The earlier focused final pair measured 114.097 s; neither observation proves Linux acceptance.
Native registration/render/error smoke passes on the exact installed artifacts:

- `main.js`: `2de04cf1e97692ef2e6f68827076dc930610fbb4ed78905ab711f71f9374c09c`
- `styles.css`: `05c59fe68c56784fb3e727056b7e27aee65f7f595d7145e4710b75f660dacc55`
- `manifest.json`: `19799fff9ae459130d707901e7c0d98b3e14a8567881a393f07d457c2fa8ec1c`

The exact-build native dense source test passes five scenarios at 20:16:55 UTC: 10,000 URL
relationships/search and canonical page identity, 41,060 canonical relation targets, cancellation
before publication with the same state reference, successful retry, and URL alias/search/display
update. Native source patch takes 387.2 ms inclusively with a 34.9 ms largest heartbeat interval.
The renderer remains visible/focused with original background throttling enabled throughout.
These are API/timer observations, not actual paint or trusted input latency. Cleanup returns73
notes, zero owned fixture notes and no controller; effective live settings remain unchanged.
Receipt: `/private/tmp/kplex-browser-perf-native-publication-production-flow/report.json`.

Two earlier native-driver failures are retained: the first dense patch passes (406.4 ms /29.3 ms
heartbeat), but a subsequent manual source-acquisition setup returns not-current before the
cancellation assertion; a bounded setup-retry attempt later hits a 30 s CLI poll deadline. Both
clean up all owned fixtures/controllers. The successful driver retains all native production
assertions and lets the production patch own acquisition after edits rather than competing with
native source events through manual fixture acquisition. No production source changed between
these attempts. Failed receipts are `/private/tmp/kplex-browser-perf-native-publication-final`
and `/private/tmp/kplex-browser-perf-native-publication-retry`.

Cached-settings native acceptance and exact workspace/configuration restoration remain pending.


## Acceptance and cleanup (20:19 UTC)

The exact-build native cached-settings SI4 check passes on the explicit small vault, including
all ontology/inference/image flips, rendered gates/labels, provenance, alias search, navigation
and latest-policy/cancellation checks. It preserves the warm owner head and performs zero full
builds, Markdown reads, parses or acquisitions during measured settings changes; before/after
source counters match exactly. Fixture-scale functional validation uses `KPLEX_SI4_REQUIRED_FILES=0`;
it is not a 20,015-owner native scale timing. This established driver temporarily disables native
background throttling for functional acceptance and restores it; it is not native performance
acceptance. Receipt: `/private/tmp/kplex-browser-perf-native-si4-final/si4-native.json`.

The original on-demand mode is restored through save/reload. Final independent restoration
passes delayed exact-byte SHA readback of plugin settings, enabled plugins and hotkeys, with
original absent property types preserved. Original effective settings/workspace/window bounds,
minimum dimensions, desktop platform and background throttling are restored;73 notes remain,
zero task-owned notes/controllers/hooks remain. The exact owned sleep inhibitor is stopped.
Receipt: `/private/tmp/kplex-browser-perf-final-cleanup/report.json`.

All319 runtime/test inputs remain identical to the accepted freeze. Root accepts this local
checkpoint; changes stay uncommitted on `fix-browser-indexing-performance`. No CSS/settings,
classifier/schema, scheduler budget, global scheduling policy or test threshold change is included.

The actual Linux CI outcome remains pending: locally eliminating25.7% of transactions in the
2,048-owner probe and passing CPU4 stress does not prove the prior840-second Linux deadline
or70.6 ms Linux gap is resolved. Required next environment coverage is the unchanged full GitHub
Ubuntu lane after authorized publication. Highest-probability regression checks are changing a
dense URL note while native metadata resolves, then cancellation/retry and warm cached ontology
changes. Those automated native workflows now pass. Physical-mobile performance and actual paint
remain unproven; no touch/UI behavior changed and no popout rendering boundary changed.


Final whitespace and diagnostic cleanup checks pass. Temporary probe prefixes are absent from
both `src/` and the actual `dist/main.js`;319-input freeze check reports no changes. All owned
verification/native processes have exited and the sleep inhibitor exited after explicit cleanup.
