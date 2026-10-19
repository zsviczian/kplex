# Live indexing and external materialization: PR #172

Windows implementation checkpoints are validated; #172 remains draft and #161 remains open.
No indexing-efficiency improvement is demonstrated or claimed.
The accepted main runtime is `d40a339` (also unchanged by merged #169 at `9381c38`).
It was integrated into the existing implementation branch without rewriting history at `612a0c8`.
Baseline `main.js` SHA-256: `fbe9eaa3ba01e0b9c9634ddb5b82fc62503fb3d90da27be025547560182c1c85`.
Node 22.22.2; Windows / Obsidian 1.14.4; Excalidraw 2.29.0. Only the authorized disposable
`kplex-test-small` was accessed: 107 files / 88 Markdown before and after each pilot.

## First causal checkpoint

| Symptom / variant | Baseline result | First confirmed boundary / bounded correction |
| --- | --- | --- |
| A: externally created note absent from Find | Reproduced: live `TFile` and metadata, no physical or visible search hit while the actual coordinator's local-baseline publication was held; present after release. | Reactive unmanaged Markdown creation omits provisional availability when startup, a hidden surface or an active coordinator prevents immediate insertion. Use the existing physical availability owner. |
| B: stationary center remains incomplete | Reproduced in real IndexedDB: unrelated U patch held at its parser; A demand ends without an A read. After U drains, all task maps are empty but A remains inferred. Release/reacquire immediately produces explicit `Child`. | A center blocked by `building` is not retried when that owner finishes. Candidate retains only unmet live demand and wakes it from existing completion boundaries; focused regressions pass. |
| #161: no prior ghost navigation | Reproduced with actual Create EX and trusted pointer input: pinned tab becomes the native child while the graph remains on Starting. The reusable native lane independently fails exact lookup after successful explicit precreation and pinned-target controls. | A published local parent scope renders an exact native child that `index.get(childPath)` cannot retrieve. Fix the read-selection owner; do not bypass lookup in the UI or confer write authority. |
| #161: prior ghost navigation | Independently reproduced: ghost/back navigation works; actual Create EX retains explicit `Child`, but the first trusted click still leaves graph and pinned file inconsistent. | Same exact-lookup omission; distinct from the stationary body-processing defect. |
| #161: tab reveal / repeated cycles | Tab reveal repairs navigation in the first pilot; four complete cycles then agree on graph/pinned identities. Relations remain inferred in that run, so this is not a semantic acceptance pass. | Preserve this control separately from first-click success; verify four full correct cycles after the fixes. |
| #161: later `Parent::` drawing edit | Reproduced: actual saved drawing and native metadata contain both links, but the stationary graph shows both as inferred children; no parent, hot body or active center task remains. | Consistent with the confirmed liveness failure. Require explicit parent above / child below and solid links after an actual drawing save. |
| C: excessive invalidation after small changes | Two actual Eager pilots reproduce folder-plus-note source globalization; an existing-folder note stays local. Baseline main has the same operation counts. A many-minute delay is not reproduced in Small. | The new folder makes the resolver wave uncovered; its natural close advances the host revision and requires whole-vault cached-source validation. Preserve that contract; narrower causal proof is separate work. |

The discovery pilot held a forced **On-demand local-baseline** publication. It does not establish
the required unrelated P3/P4 hold, Eager restart, or startup listener-handover acceptance; those
remain validation work. A restart-required Eager setup and two drawing-save setup controls are
retained and excluded. The drawing harness now waits for the actual scene update before saving.
No latency or native resource improvement is claimed from these functional pilots.

## Checkpoint A: provisional discovery

Unmanaged Markdown creates retain the existing idle-visible insertion path. Otherwise they call
`updateHostFileAvailability()` so native filenames can be discovered and selected independently
of unrelated graph work. The managed-create early return, dirty-source revision, per-file patch
backlog and source/write validation owners are preserved. No body read, canonical relationship
publication, scheduler, persistence format or source-validation change is introduced.

Checkpoint A is committed at `7f2f2f2`; its full GitHub CI
[39011260178](https://github.com/zsviczian/kplex/actions/runs/39011260178) passes.
Node 22.22.2 `node tests/indexing.test.mjs` passed, including actual reactive-listener/GraphIndex
cases for startup handover, hidden demand and a held On-demand coordinator, plus rename,
deletion, replaced native identity and managed materialization controls. Exact-build native
acceptance is pending. Older-publication search continuity is covered by checkpoint B below.

## Checkpoint B: demand completion and endpoint continuity

The production build passed full verification and exact-build native acceptance in Small.
Checkpoint B `40c4f84` also passes full GitHub CI
[39014152315](https://github.com/zsviczian/kplex/actions/runs/39014152315).
`main.js` SHA-256: `c720a9f6e678fd35f2c1bec3b6218f9d62216c4b12ca0982805e961c844f9006`.

- Build-blocked centers retain a demand-revision marker. Existing build/patch completion and
  exact task retirement readmit only the still-live request, with fresh policy/baseline tokens.
  Release, purge and destroy retire the marker. There is no timer, polling loop or new scheduler.
- Exact lookup can borrow a native neighbor from an active local scope, fenced by its current
  source/policy, captured file identity and full stat revision. This read grants no complete-center
  or relationship-write authority. Selecting that neighbor admits missing physical membership
  through the existing insertion owner before its ordinary body patch.
- A full publication captured before a native create must not erase that file's filename entry.
  Only finite event additions survive until canonical membership catches up; deleted, renamed or
  replaced identities are pruned. No additional Vault enumeration is introduced.
- Independent review found a second masking boundary: retained requested semantic scopes could
  replace the corrected physical Find entry with an old ghost. A real IndexedDB regression failed
  with zero Find results while exact lookup succeeded. Vault-file search now preserves the exact
  current event identity ahead of stale replacement/suppression. Matching semantic identity still
  supplies its name and aliases; ordinary semantic search and source validation are unchanged.

The existing On-demand test owner passes 103/103 cases, including 17 added demand, identity,
older-publication and retained-scope regressions. The final search regression also passes in an
isolated serial run. An earlier source-startup run and general-suite run each failed while Chromium
was still loading their bundle, without a JavaScript error; each exact test passes in isolation.
Both failed full receipts remain evidence, and no startup/assertion deadline was relaxed.
The final Node 22.22.2 `verify:obsidian` run passes architecture/core, official Obsidian lint,
906 general tests, 128 UI tests, 334 portable source tests, all 560 source-browser cases,
installed typings, production build and exact-artifact native staging/smoke. Legacy lint warnings
remain; this checkpoint adds no new UI copy or scanner suppression.

The native Excalidraw driver has an `issue161` scenario for both actual Create EX variants, four
complete cycles each, fixed pinned-target and disabled-follow controls, endpoint uniqueness,
and the stationary explicit Parent/Child edit. Its baseline fails the exact-lookup assertion after
successful precreation and pinned-target controls. The final lane passes two complete runs:
4/4 independent ghost-history variants, 16/16 full navigation cycles and 4/4 later explicit
Parent/Child edits. Every cycle checks rendered role, solid styling and exact native identity;
first-click graph/pinned agreement needs no repair click or tab visit. No settled folder-root
fallback occurs. Fixed-pin, tab-reveal, disabled-follow and endpoint-uniqueness controls pass.
Both runs restore all wrappers, drawings, workspace, settings and exact configuration bytes;
no captured JavaScript errors. Two earlier successful runs before the per-cycle assertions were
strengthened are retained separately, not counted in these final denominators.

These are correctness corrections, not demonstrated CPU, storage or latency improvements.
No global source-validation, background-admission, parser, cache schema or persistence change
is included in this checkpoint.

## Held background discovery and explicit navigation

The native foreground owner now has a `live-updates` scenario. It reloads an actual On-demand /
background-URL / Responsive session and holds the real unrelated URL owner's `cachedRead`,
with scheduler diagnostics showing P3 active. While that read remains held, visible Find can
select a new external note and its stationary center obtains an explicit Child relationship.
The public recent-tab sync command likewise centers a second real new document and completes
its local relationship. Releasing P3 does not overwrite the newer explicit navigation.

The actual Add child composer also selects a naturally created **physical-only** target: Plex
is hidden during creation, the target is absent from canonical pages at query time, and the
existing-note selection occurs before P3 release. The narrower default search scope was a source
lead, not a reproduced failure here; no composer runtime change is justified by this test.
No direct materialization/insertion helper substitutes for external creation in these controls.

The standalone pilot and the integrated native scenarios pass, with exact artifact hashes,
foreground checks, drained observed requests and no broad build/catalog/snapshot write in the
observed interval. The reusable lane records create, host metadata, Find and explicit-sync
milestones separately. API/DOM completion is not actual paint or trusted pointer latency.
In the final controlled run, native metadata was ready 99 ms after file creation; Find was
requested at 236 ms, showed the result at 249 ms, centered it at 299 ms and had the explicit
relationship at 349 ms. The explicit recent-tab command completed its center/relationship check
in 148 ms. These are single-run observations within a declared 15-second foreground bound.
All were observed before releasing the unrelated P3 read.

The existing inventory-held foreground lane also passes all six scenarios, including actual
relationship add/remove and visible edits, with zero foreground broad flush calls. One earlier
run failed its initial-DOM setup before any scenario; a diagnostic replay and the final rerun
pass. Its exact cause was not captured. The driver now awaits the established native surface
readiness owner before its initial notification, rather than assuming reveal registered React's
navigation subscription. The failed receipt and successful replay are preserved; no production
change or relaxed assertion is attributed to that setup failure.

## Small-change invalidation: inherited cost, separate follow-up

The bounded causal pilot uses actual Eager restarts, a fixed visible center, natural Vault and
metadata events, and the existing counts-only resource observer. Each interval ends after active
source/repository/cache/graph queues and observed transactions drain continuously for 400 ms.
The link-free probe has no large legitimate fan-in. Two B runs (`40c4f84`) and one accepted-main
runtime control (`d40a339`, unchanged by `9381c38`) produce identical operation counts:

| Natural change | Source checks | IDB transactions / requests | Source digests | Whole-source inventory passes |
| --- | ---: | ---: | ---: | ---: |
| Note in existing folder | 2 | 77 / 197 | 58 | 0 |
| New folder, immediately followed by note | 92 | 1,527 / 2,925 | 1,499 | 1 |
| New folder alone | 0 | 31 / 53 | 31 | 0 |
| Note after that folder has settled | 2 | 77 / 197 | 58 | 0 |

Checks include repeats, not distinct notes. Each note interval has one source-acquisition fresh
read and one parse; folder-only has neither. Full build, node catalog and snapshot/checkpoint
writes are zero in every interval. Digest input is about 15.5k UTF-16 units for a local note and
2.22m for folder-plus-note. These are actual operation counts, not physical storage bytes.

| Natural change | Main: drain / native CPU | B: drain range / native CPU range (2 runs) |
| --- | ---: | ---: |
| Note in existing folder | 1.646 s / 0.282 s | 1.570–1.620 s / 0.218–0.234 s |
| Folder plus note | 8.025 s / 3.250 s | 5.861–7.349 s / 1.922–2.860 s |
| Folder alone | 0.933 s / 0.219 s | 0.875–0.959 s / 0.109–0.250 s |
| Note after settled folder | 1.619 s / 0.250 s | 1.619–1.684 s / 0.188–0.344 s |

Native CPU is selected-renderer user+system time, including host/other activity. Elapsed time
includes pacing, storage awaits and the stable-drain guard; their difference is not exclusive I/O.
Inputs, policy and settled authority match, but persistent-cache bytes/history were not restored
between builds. These few sequential timing observations establish no speedup. Sampled heap
maxima span 281.5–304.3 MiB on main and 270.1–295.2 MiB on B; RSS spans 732.5–754.8 and
691.1–741.5 MiB respectively. They are process observations, not allocation totals, isolated graph
memory or demonstrated memory savings. Counts mode does not measure family decoding totals.

The causal tape identifies the first invalidator in both B runs: the folder create marks the wave
uncovered; known file create/metadata events follow, then the natural `resolved` cannot consume
fully known proof. `markContributorHostChange("resolution", true)` advances host revision 0→1.
The following pass checks cached sources instead of compiling/re-reading all Markdown. Separating
folder creation from the note lets the later fully known file wave remain local.

**Highest-value follow-up:** prove a narrowly complete new-empty-folder creation wave within
the existing source-acquisition owner, before allowing source-local maintenance. Ambiguous,
concurrent, expired, extra-close, rename/delete or incomplete waves must retain conservative
validation. That is a new correctness-proof task; #172 preserves the current folder-uncertainty
contract and tests. The observed amplification does not prove those checks can safely be skipped.

This pilot excludes scheduled 30-second polling and five-minute orphan maintenance, and does not
measure the 610-second quiet window, a large-vault lifecycle or lower-powered devices. #172 does
not change background admission/invalidation or claim total-work savings. All fixtures, wrappers,
settings, actual session mode and exact configuration bytes restore; inventory returns to 107.

## Evidence and remaining acceptance

Private verified copies are retained outside temporary storage at
`%LOCALAPPDATA%/kplex-validation/pr-172/baseline-d40a339/` and
`%LOCALAPPDATA%/kplex-validation/pr-172/baseline-native-issue161/`, with per-file SHA-256 manifests.
The latter contains the exact reusable driver/helper and its expected failing native receipt.
Raw originals and failed controls remain intact. No archive or raw traces are published.
Checkpoint B's exact source/build, four native receipts, full/failed verification logs and focused
regressions are copied privately to `pr-172/checkpoint-b/`: all 37 manifest entries were verified.
Manifest SHA-256: `df70c0ae235336840c7ff67a7c47a6f72a2d66c48bb265ae7d3fc08e251cb4bd`.
The held-P3/composer, Eager three-arm controls, baseline staging/restoration and failed native
setup receipt are retained at `pr-172/checkpoint-c-native/`: 34 files verified; manifest SHA-256
`3ed86bcc4a79e477d504219fc98fc3c84997526ba3ffc0354748db4f776f9842`.

The held-P3, composer, actual Eager restart and bounded invalidation observations above are
completed. Stationary cancellation/lifetime,
rename/delete/replacement and hidden-demand cases have automated coverage; these do not replace
every native popout/suspend workflow. Linux, macOS and
physical mobile acceptance remain unrun. No personal vault access, receipt, reader sharing,
new scheduler/schema, release or automatic merge is authorized.
