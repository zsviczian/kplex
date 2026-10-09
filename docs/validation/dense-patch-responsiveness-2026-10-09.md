# Dense URL patch timer investigation

Base main: `79a665afe65d47d981c7ea031355047542fe6ae5`. The maintainer authorized investigation
and a separate fix branch, now `fix-dense-patch-responsiveness`. Structural refactoring remains
paused at C14. No timer limit, scheduler policy or publication boundary changes.

## Symptom and measurement limits

PR #102 GitHub verification attempts 1 and 2 failed at `tests/indexing.test.mjs:3890`:
longest recurring zero-delay timer gaps of 63.1 and 62.5 ms exceeded the unchanged 50 ms limit.
The same guard failed on earlier main/PR builds. The test patches a note containing 10,000
URLs with distinct hosts, after priming the parsed-body cache in an Eager session. It then checks
canonical graph identity, complete URL publication, cancellation and retry.

This is a dense note update after parsing, separate from cached URL-owner restoration and the
90-second inactivity timeout. Timer gaps include synchronous work, microtasks, garbage collection
and process scheduling. They are not exclusive CPU measurements or actual paint/input latency.
Local macOS results on pinned Node 22.22.2 do not reproduce the GitHub Ubuntu environment.

The unmodified baseline indexing fixture passed locally. A targeted inspector profile measured
`publishIncrementalFile` at 29.63 ms versus 0.07 ms for graph overlay `commitPatchState`.
Garbage collection accumulated 50.67 ms across the complete profiled patch; that is not one
indivisible pause. Inspector overhead makes this attribution evidence, not a performance baseline.

## Attribution and bounded correction

Three serial runs without the CPU profiler measured atomic publication at 25.41–26.12 ms,
with `patchSearchIndex` at 15.56–16.62 ms as its largest measured component. One longest
heartbeat interval, 420.90–456.60 ms relative to probe start, contains publication at
422.60–448.00 ms. The interval also contains surrounding work; it cannot be equated exactly
to publication CPU.

Source tracing identifies avoidable work for about 20,000 URL/origin endpoints. Search-entry
construction calls `titleFor`, allocating signatures and cache entries, even though configured
note display fields explicitly exclude URLs and their title is the existing label. These local
measurements support reducing that work. They do not establish the cause of the entire CI gap.

`GraphIndex.makeSearchEntry` now selects the identical URL label directly. When aliases are
empty and the supplied name equals the effective title, it also avoids the temporary Set and
intermediate arrays. Explicit policy/name overrides, exact-case deduplication before lowercasing,
alias order and canonical page references remain unchanged. Ordinary notes retain the existing
title owner/current cache and proposed-policy field lookup. All publication remains synchronous.

No new staging seam, persisted state, classifier, whole-graph model, scheduler budget or weakened
guard is introduced. Affected module/function TSDoc documents the exact title/cache behavior.
Root reviewed the complete source/test diff and current callers against the architecture,
publication, identity and documentation rules.

Five independent previous-algorithm oracle tests pass against bundled production GraphIndex:
URL aliases/case variants/empty strings, explicit name and policy overrides, ordinary note field
and alias titles, and 20,000 URL/origin entries with zero title-owner calls/cache allocations.
Actual TypeScript/Obsidian declarations, touched official scanner and whitespace checks pass.
The normal aggregate test script includes the new suite.

## Matched serial local measurements

The temporary driver uses the same fixture, method timing wrappers and Node version before
and after. The first two baseline runs preceded additional bounded heartbeat-window capture;
the final driver was used for baseline run three and all correction runs. Runs are serial, without deliberate CPU load, clock manipulation or scheduler changes. Instrumentation
forwards actual compiled methods and remains outside production source. Existing guarded fixture
assertions run unchanged.

| Metric | Before median, 3 runs | After median, 3 runs |
| --- | ---: | ---: |
| Longest timer gap | 35.693 ms | 26.472 ms |
| Atomic `publishIncrementalFile` | 25.496 ms | 16.809 ms |
| `patchSearchIndex` | 16.176 ms | 7.526 ms |

Before gaps: 36.079, 35.033 and 35.693 ms. After: 26.472, 26.001 and 26.543 ms.
All pass the unchanged 50 ms guard and remaining fixture assertions. Median longest gap is
about 26% lower; search-entry duration is about 53% lower. These sequential measurements are
not randomized statistics, cross-platform guarantees or remote CI acceptance.

Receipt: `/private/tmp/kplex-dense-timer-comparison.json`; detailed traces:
`/private/tmp/kplex-dense-timer-detailed-{1,2,3,after-1,after-2,after-3}.json`.

## Full verification and exact-build native comparison

Final 319-input freeze:
`c33593820d50d97395bf6287762e20ce499aee9058c638ee55d5a6b564ec2ff3`,
recorded in `/private/tmp/kplex-dense-final-freeze.json`. Full `verify:obsidian` passed on
pinned Node 22.22.2: architecture 7, core 86, aggregate 492, UI 20, portable source 333 and
browser IndexedDB 410 tests, with zero failures or skips. Actual TypeScript, official scanner,
production build and native plugin registration/render/error smoke checks passed.
The browser lane includes the 20,015-owner cache publication and lifetime regressions.
Receipt: `/private/tmp/kplex-dense-full-verify/report.json` and corresponding log.

Final `main.js` SHA256: `cf1c2179626f730491696813da805d279e01c58ca78d44db1eabc8c192c91892`.
CSS SHA256: `05c59fe68c56784fb3e727056b7e27aee65f7f595d7145e4710b75f660dacc55`.
Manifest SHA256: `19799fff9ae459130d707901e7c0d98b3e14a8567881a393f07d457c2fa8ec1c`.
Plugin version stays 0.1.0. The installed disposable-vault artifacts match these exact hashes.

The matched native search-helper comparison passed using unchanged driver/input/settings,
canonical page references and vocabulary digest. Its five final 20,000-entry samples take
3.2, 1.8, 1.3, 1.4 and 1.3 ms: median 8.1 → 1.4 ms, title-cache entries 20,000 → 0.
Foreground visibility, focus and throttling were observed in both runs. Detached repositories
and leases/controllers were retired; no notes or settings changed. This is an allocation/helper
benchmark, not complete editing or paint latency.
Receipt: `/private/tmp/kplex-dense-native-comparison.json` and
`/private/tmp/kplex-dense-search-native-after/report.json`.

The separate exact-build native regression passed in foreground Obsidian 1.14.4 using the
real Vault, MetadataCache, source acquisition and production compiler/index in the disposable
73-note `kplex-test-small` vault. An owned synthetic note added 10,000 distinct-host URLs.
The prepared patch completed in 369.8 ms across cooperative work, with a largest recurring
heartbeat gap of 28.4 ms. This single native sample has no matched full-patch baseline and is
not an exclusive CPU or paint measurement.

All five scenarios passed: dense publication, 41,060 canonical relationship-target checks and
URL search, cancellation before publication with identical live state/no leaked URL, retry,
and URL alias update/display-label parity. Live settings stayed unchanged. The detached index,
main-index lease, owned note and temporary controller were removed; the vault returned to
73 notes. Native `dev:errors` reported no captured errors.
Receipt: `/private/tmp/kplex-dense-native-publication-2/report.json`.

The first native publication attempt failed before setup because the temporary driver's injected
JavaScript contained an incorrectly escaped newline. No controller or note was created; cleanup
verified 73 notes and zero owned files/controllers. The failed receipt remains at
`/private/tmp/kplex-dense-native-publication/report.json`. The temporary harness escaping and
async rejection handling were corrected, the injected script was parsed before execution, and a
fresh run passed. Production source was unchanged.
Linux GitHub CI cannot be claimed fixed until the exact new branch runs there. No push/PR/merge
was requested for this fix, and the existing CI guard remains intact.

## Native baseline and retained failure

Fixed synthetic detached pages exercise the actual installed GraphIndex search helper in
foreground Obsidian 1.14.4. Baseline `main.js` SHA:
`24e21ab49242b700125cae6367207d2edab8bcbe113b5287acb3cd184f00d032`.
Five 20,000-entry samples take 11.6, 10.6, 8.0, 8.1 and 6.5 ms. Each populates 20,000 title-cache
entries and produces the identical expected search digest. This isolates the helper's allocations,
not complete editing, paint or physical-device performance.

The detached repository was destroyed, the exact main-index lease released and the controller
removed. No notes or settings changed. Accepted baseline:
`/private/tmp/kplex-dense-search-native-before-2/report.json`.

The first attempt failed before probe mutation because the CLI reported that the `vault` command
was unavailable. A secondary cleanup assertion read an uncaptured baseline. Its failed receipt
remains at `/private/tmp/kplex-dense-search-native-before/report.json`. A read-only help check
confirmed registration, cleanup was guarded for an absent baseline, and a fresh retry passed.
The accepted driver was reused unchanged after final build; no failure was relabeled a pass.


## Accepted local checkpoint and remaining limitation

Original effective settings, workspace, window bounds/minimum size, desktop state and background
throttling were restored. Raw data/community-plugin/hotkey configuration hashes and the absence
of the original types configuration passed delayed readback. The vault has 73 notes and no probe
controllers or owned notes. The task-owned sleep inhibitor was stopped. Receipt:
`/private/tmp/kplex-dense-final-cleanup/report.json`.

Final source-freeze comparison and `git diff --check` pass. Temporary probe identifiers were
searched in `src/` and built `dist/main.js`; none remain. Root reviewed all changed source,
tests, script registration and documentation. The allocation correction is accepted locally and
remains uncommitted on `fix-dense-patch-responsiveness`. No remote CI, push, PR or merge was
performed for this branch.

The highest-value remaining validation is the exact branch's unchanged 50 ms guard on GitHub
Ubuntu CI when publication is authorized. Local measurements establish less avoidable work,
not complete causal attribution or universal timing guarantees. Physical-device performance is
unmeasured. No new manual touch/UI gate is needed for this internal allocation-only change;
search/title policy and publication/cancellation risks already have automated and native coverage.


## Publication authorization

The maintainer subsequently authorized commit, branch publication/push, PR creation and merge,
then return to updated main. The exact previously tested source remains unchanged. GitHub
Ubuntu CI results will be recorded in the PR before merge; the earlier local-only limitations
above describe the investigation checkpoint, not the later authorization status.


## GitHub Linux verification result

Published implementation commit: `83b05f9e54f598ceb2c67b6f297f8cb792e7aac7`, PR #104.
[GitHub Actions run 37975361229](https://github.com/zsviczian/kplex/actions/runs/37975361229)
ran on Ubuntu 24.04 with Node 22.22.2 and completed with failure after 31 minutes 13 seconds.
The original indexing fixture/50 ms dense-update guard passed, along with architecture, core,
scanner, aggregate, UI and portable source lanes. Browser IndexedDB results: 408 passed,
2 failed, 0 skipped. The final CI build did not run because the browser lane failed; the exact
runtime source already passed the local full build and native acceptance above.

Remaining failures, with unchanged bounds:

- `tests/on-demand-indexing.test.mjs:667`: dense source patch with active private URL lane
  recorded a 70.6 ms heartbeat gap against 50 ms.
- `tests/source-high-degree-publication.test.mjs:196`: the 20,015-owner case reached its
  large-case deadline during cached publication; full test duration was 841.265 seconds.

These are separate from the original Node fixture failure. No matched Ubuntu baseline was run,
so this record does not establish whether their cause is existing work, environment or regression.
The local full/native passes do not erase the CI failures. Thresholds and scheduler budgets remain
unchanged. The maintainer's authorized merge delivers the reviewed allocation correction, with
these remaining Linux performance failures explicitly recorded in the PR. Further performance
investigation is a separate follow-up, not silently included in this publication task.

Downloaded failure evidence: `/private/tmp/kplex-dense-ci-failed.log`; machine-readable result:
`/private/tmp/kplex-dense-ci-result.json`. Publication-note edits change documentation only;
verified runtime/test inputs remain identical to the 319-input freeze.
