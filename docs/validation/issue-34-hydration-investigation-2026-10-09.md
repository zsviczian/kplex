# Issue #34 — current-build hydration investigation

[Issue #34](https://github.com/zsviczian/kplex/issues/34) records a real indefinitely pending
partial restore in the older `82b6e51` snapshot path. This investigation tests current main
`2d0ce7b8daa9715b5d3e7c8e2ef57d0d353d880d` after merged [PR #94](https://github.com/zsviczian/kplex/pull/94).
A current pre-watchdog lifetime gap is reproduced and fixed on `fix-startup-cache-stall`.
Full verification, six native fault cases, large-vault ready/search acceptance and restoration
pass. The maintainer accepted the fix and authorized publication and issue closure on2026-10-09.

## Identity and procedure

Disposable synthetic `kplex-test`: 20,015 Markdown files, Obsidian 1.14.4 desktop/macOS.
The Date-role feature's accepted Node 22.22.2 full verification/build supplies the exact artifacts;
source/test/build inputs remained unchanged after that run. Artifact replacement was prepared
and hash-checked beside the destination, then atomically renamed after unloading the plugin.
Original settings, enabled list, hotkeys/types existence, workspace, desktop state, window
bounds/minimum and background-throttling value were backed up. No caches or original notes
were deleted or corrupted. Native probes run serially with bounded individual CLI calls.

- main.js: `85358c635afe393c71225b6b0f544526bfc38fd31ec7c783a4834f3d2860d591`
- styles.css: `05c59fe68c56784fb3e727056b7e27aee65f7f595d7145e4710b75f660dacc55`
- manifest.json: `19799fff9ae459130d707901e7c0d98b3e14a8567881a393f07d457c2fa8ec1c`

The original native matrix attempted requested-center role/strength comparison, but did not
complete that optional parity capture; no parity pass is claimed. The fix acceptance checks
actual mode-specific readiness, all physical file membership, search vocabulary and healthy
cache progress. Global state/evidence digests are not asserted equal across acquisition modes.

## Readiness contract and source review

Current On-demand startup intentionally certifies local demanded scopes, rather than requiring
whole-vault semantic hydration. Eager source-backed startup can also become green with
`fullSnapshotHydrated=false`: `adoptInitialSourceIndex` uses neutral-source closure, current
requested semantics and complete node/search catalog publication. Global evidence materialization
is not mandatory when optional graph acceleration is absent or incompatible. The indicator
checks coordinator completion, pending/dirty work, failures, semantics and search vocabulary;
it does not require the optional saved graph's hydration flag. Thus false full hydration alone
is not the older defect. The corrected matrix checks local baseline readiness in On-demand,
and source dependency authority/no active inventory in Eager, plus all physical file membership.

Read-only review confirms the existing 90-second **inactivity** watchdog with five-second
polling. Timeout/cancel settles public waits, invalidates late publication and retires leases.
Existing tests cover seven held phases, timeout boundaries, genuine progress, late completion/
rejection, supersession, source-authority observers and unload. The accepted full suite passed
these production-method checks; they were not weakened or replaced for this investigation.

A separate unreproduced shape remains possible: repeatedly incomplete source inventories can
advance healthy-owner progress while one unavailable metadata owner prevents dependency closure.
Such active retry progress is different from #34's zero-work hydration stall. Recovery can also
await external source I/O outside the hydration watchdog. Neither hypothesis is a reproduced
current defect or authorization for a scheduling change.

## Initial observations

The old large-vault installation was advancing cached-note checks when first opened. The
current staged On-demand build reports hydration `idle`, pending=false and a local baseline.
Its red status is explicitly **Discovering web links**, with the count steadily advancing.
This does not reproduce indefinitely pending hydration. The initial arbitrary ten-minute outer
harness cap was judged too short for that healthy background pass; the driver was stopped
before any matrix mutation/controller began, the partial attempt retained, and only that
investigation cap extended. Production watchdog and regression timing bounds are unchanged.

Reports/probe sources/backups: `/private/tmp/kplex-issue34/`.

## Publication CI observation

The accepted local full suite passed. GitHub CI nevertheless fails the unchanged `<50ms`
URL-heavy post-parse patch guard: PR job37937877549 at57.7ms, merged-main job37937960456
at53.1ms, and a single strict PR rerun at64.9ms. Prior main8858259 job37908703105 failed
that same guard at63.6ms, before Date changes. Read-only diff review found no new URL-scaled
scan, allocation or scheduling path; a small Date policy/provenance comparison does not prove
zero overhead. Runner scheduling/GC is consistent with these observations, but the cause is
unresolved. Remote verification remains failed. No guard weakening or hidden retries were used.

## Reproduced URL-cache lifetime gap

A controlled-I/O probe bundles unmodified production `GraphIndex` and `KplexIndexedDbCache`,
constructs the actual index, and retains actual URL enumeration, restoration, publication, public
snapshot restore and destroy methods. It holds either cache-page acquisition or a publication
predecessor. All four cases (both holds × eager/on-demand) remain pending after 95 seconds of
virtual inactivity: diagnostics idle, pending hydration false, no watchdog timers/catalog reads.
Actual destroy does not settle the public restore. Releasing I/O settles it and prevents URL
publication, but still reads the snapshot catalog after unload; eager also restarts metadata
hydration diagnostics. This demonstrates a current startup-lifetime defect before the existing
watchdog, rather than recreating the historical partial-snapshot state.

The native large-vault cache restore kept advancing. Attempt5 ended on a30-second CLI eval
deadline at15,458 restored owners; a follow-up observed18,359 owners and no temporary
controllers. Healthy progression is not a stalled cache read. Temporary probe/results are at
`/private/tmp/kplex-issue34-url-characterization.mjs` and `.json`; source hashes are recorded.
No timing guard was weakened. Issue #34 remains open while the fix is validated.

## Scoped implementation and review

Branch `fix-startup-cache-stall` retains `GraphIndex` as the cache/publication lifetime owner.
A shared URL-cache attempt uses the existing 90-second inactivity/five-second polling policy.
Completed storage pages, owners and genuinely advancing private slices renew progress; repeated
unchanged prefixes do not. Timeout settles the optional cache wait, records `url-cache-stalled`,
retires that cache publication's queue position and exact leases, and permits independent URL
discovery. Unload/purge settle waits and prevent later catalog work. Public supersession cancels
only its own wait and preserves shared healthy acquisition. External I/O is not forcibly aborted;
its eventual callbacks remain fenced.

A second production-method reproduction showed On-demand catalog/finite preview was likewise
unbounded after URL restoration. That finite path now reuses the existing snapshot watchdog,
including pending/terminal diagnostics and preview/search lease retirement. No global hydration,
inventory, grammar, schema, setting or semantic-policy change is introduced. An entirely blocked
synchronous renderer cannot execute timers; this patch bounds asynchronous inactivity.

Final focused 22 lifetime cases pass alongside 17 scheduler and 7 architecture tests. Actual
installed Obsidian type-check and touched official scanner pass. The offline browser runner
could not bind localhost (`EPERM`), so browser acceptance belongs to the equipped full lane.
Root independently reviewed the entire source/test diff, lifetime fences, atomic publication,
owner identity, progress semantics, cleanup and affected TSDoc. Earlier retry-test fixture CPU/
scheduler-pacing failures were retained; corrected cases exercise actual alias work and policy
retry without relaxing their expected timeout.

Frozen 314 source/test/build inputs:
`50eebfbc74ef376e9cc7ee7e919548883db000815df5767293c3d653ce049218`.
The first full attempt selected Node 18 in the escalated login shell and failed before build/
staging. The corrected lane explicitly pins Node 22.22.2 and child PATH and passed at
14:52:49 UTC: full architecture/core/lint/types/build, all 410 browser-backed tests, existing
seven held hydration phases, staging and native open smoke. Source inputs remain equal to
the freeze. Native driver identities are recorded separately.

The old large-vault URL pass eventually completed 20,015/20,015. Reference/Note A reached
actual green/local readiness after navigation settled. Dense Scale-000000/hub demands showed
terminal local host-count-cover unavailability; this observation is separate from a pending
hydration stall and was not suppressed. The optional old-build representative parity capture
did not finish and is not a pass: its index was unloaded and controller detached. Prior old-build
matrix capture verified physical membership of every Markdown file; it is baseline evidence,
not acceptance of the fix. New exact-build native results follow.


## Exact-build native acceptance

Both disposable vaults receive the same verified build, `main.js` SHA256
`7bbcf028ddbcd091ee6292b55e5a43dfb08081b161ae8fc94a3beb79a86933a0`.
CSS and manifest hashes remain those listed above; source freeze is unchanged.
Full receipt: `/private/tmp/kplex-issue34-full-verify-2/report.json`.

In `kplex-test-small` (73 Markdown files), the driver holds actual completed cache-page or
catalog results behind a gate, retains the actual public restore and destroy methods, and
uses real elapsed time without changing the production watchdog:

| Native case | Elapsed | Result |
| --- | ---: | --- |
| On-demand URL inactivity | 90,048 ms | Timeout diagnostic; catalog/fallback continued |
| On-demand URL unload | 1,054 ms | Public wait settled; zero later catalog reads |
| On-demand catalog inactivity | 90,039 ms | Existing hydration timeout; late result fenced |
| On-demand catalog unload | 42 ms | Public wait settled; late result fenced |
| Eager URL inactivity | 90,116 ms | Timeout diagnostic; catalog/fallback continued |
| Eager URL unload | 1,048 ms | Public wait settled; zero later catalog reads |

Unload elapsed values include time since the held operation started, not only destroy duration.
After late result delivery, unload state remained unchanged and URL owner counts did not
change. Eager timeout legitimately promotes graph fallback, so its pre-timeout graph state
is not expected to remain unchanged. Native owner counts are a weaker oracle than the focused
production-method regressions' exact owner object identity; neither is overstated.
Purge, exact queue/lease retirement and uncached discovery also pass in production-method
regressions. No native cache purge or note modification was needed.

The original driver completed all six assertions, then failed during an immediate CLI call
following mobile emulation reload. Its overall report remains **failed**, not relabeled:
`/private/tmp/kplex-issue34-native/report.json`. A first recovery assumed mobile state and
failed; that receipt is also retained. The independent corrected continuation
`recovery-2.json` passes: actual mobile emulation observed, bounded read-only CLI reconnect,
return to desktop, ready 73/73 with no pending hydration and no captured errors. This validates
reload/emulation lifecycle, not physical-device touch behavior.

Small-vault preferences, original configuration-file bytes/existence, workspace, bounds,
minimum size, background throttling and desktop state are restored. Delayed independent
SHA readback passes: `delayed-configuration-readback.json`. Temporary native controllers are
removed. The tested build intentionally remains installed.

Large-vault exact-build acceptance currently records:

- On-demand local readiness while healthy cached URL progress advances for 110,576 ms,
  reaching 5,215 owners without `url-cache-stalled` (total duration exceeds90 seconds).
- All 20,015 physical Markdown files present with exact native `TFile` identity.
- Actual unload during that shared cache restoration settles both public and shared waits,
  returns false, closes the old index and retires its URL owners/priority leases.
- Eager restart completed at 15:47 UTC with ready 20,015/20,015, visible green indicator,
  completed/nonpending hydration, source dependency authority and no active inventory. All
  physical files are present with exact native identity, and vault-file search returns the
  original Reference/Note A center. The finite center role/strength capture is recorded,
  but global or cross-mode semantic digest parity is not claimed.
  The original driver hit its 30-second CLI response limit at 7,962 owners. Its receipt
  remains failed; a subsequent read found 10,177 owners, and the same native run continues
  without reload in `large-fixed-continuation.json`. Only failed read-only observations
  reconnect; mutations are not retried blindly. A mistaken diagnostic method name in one
  follow-up eval was corrected; that read-only error did not alter plugin state.

Large receipts: `/private/tmp/kplex-issue34/large-fixed.json`. No caches or original notes
were deleted. This fix addresses asynchronous cache inactivity/lifetime, not the separate
healthy large-vault loading duration or dense-center host-count-cover limitation.


## Separate healthy URL-cache performance observation

The maintainer asked why cached web-link loading was extremely slow. Source review finds
per-owner canonical URL patch replay, not direct installation of a ready graph:
`GraphIndex.restoreUrlIndex` → `publishUrlOwner` → `GraphBuilder.patchUrlReferences`.
Evidence forks compact at depth 8 in `compactPublishedPatchLayers`; `compactCooperative`
visits the accumulated pair buckets and recreates the complete evidence store. In addition,
`reconcilePreparedUrlOriginsCooperative` revisits each touched URL's contributor declarations,
and alias preparation copies that URL's contributor map. The generator puts three shared
links in each note, drawn from 48 URL targets, so contributor buckets grow heavily.

Observed On-demand startup loads 5,215 owners in 110.576 seconds (about47/s); later Eager
samples advance approximately150 owners per15 seconds (about10/s). Modes/start conditions
are different, and these are functional probe samples, not a controlled performance benchmark.
The graph-size-dependent compaction and shared-target reconciliation are strong cost candidates
from source review, not measured exclusive attribution. No current storage timing trace proves
IndexedDB is the dominant cost. A follow-up should measure time/work separately for page reads,
compaction, alias contribution copies, origin reconciliation, compilation and host yields before
choosing a bounded restore/publication correction. Preserve provenance, shared origins, owner
identity, atomic publication and foreground priority. Do not weaken watchdog or scheduling
bounds to hide this cost. No performance optimization is part of the #34 lifetime fix.


## Final acceptance and restoration

The independent large continuation passed at 15:47 UTC without any additional CLI failures.
The original failed driver receipt remains separate. Actual hydration ended `complete` with
20,771 page/relationship progress records and 715,036 evidence progress records; these are
hydration diagnostic counters, not an assertion of global cross-mode semantic equality.
URL owners restored/checked 20,015/20,015, zero URL/cache-write failures. No captured JavaScript
errors. The run included metadata validation, cached-note verification, reconciliation and
search preparation after URL restoration; no healthy-progress shortcut was used.

`/private/tmp/kplex-issue34/cleanup.json` passes: original runtime preferences and On-demand
mode, workspace, desktop state, window bounds/minimum and background throttling restored;
20,015 files retained, settings closed, no temporary controllers. Native enable completed.
Exact configuration-file bytes/existence restored after queued writes settled. The verified
new build intentionally remains installed in both disposable vaults; derived cache updates are
retained. Final independent delayed readback verifies both vaults' configuration and all three
installed artifact hashes against the accepted build (`final-delayed-readback.json`).

**Acceptance:** current #34 lifetime gaps reproduced and fixed; real build and all applicable
automated/native checks pass. No prioritized outstanding manual tests are required for this
asynchronous lifetime change. Physical-device touch/paint performance and exclusive cost
attribution are not claimed. The separate dense-center count-cover and healthy URL restoration
performance observations remain follow-ups. Existing remote CI timing-guard failures are
recorded above; local full verification passes without weakening that guard.
