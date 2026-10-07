# Background indexing throttle and active URL navigation

Status: maintainer confirms the production UI is responsive during cache loading. The status-copy follow-up is verified and deployed; quantified continuous-foreground/paint timing remains unmeasured.

The maintainer reported a 1–2 minute freeze when selecting the Obsidian URL from Scratchpad during eager indexing. The previous priority/stability round navigated after indexing settled; its successful navigation results did not cover this condition. The reference vault remains read-only except authorized K-Plex JavaScript/CSS deployment and indexing preferences. C15–C26 remain paused.

## Changes

- **Settings → Indexing config → Background indexing speed**: Responsive (recommended, default), Balanced, Faster. Changes apply immediately, without rebuilding semantics or invalidating source caches. Missing/invalid saved values become Responsive; legacy graph imports preserve this local preference.
- The existing scheduler shares one work/idle window across P3 URL inventory and P4 background/index/cache work: Responsive6/24 ms, Balanced 12/12 ms, Faster 24/4 ms. These are cooperative admission windows, not hard limits on individual synchronous operations. Navigation, mutations and visible-node completion remain P0–P2 and bypass pacing. Foreground admission cancels the idle timer; resumed background tasks recheck priority. Unload cancels timers and wakes continuations; caller freshness/lifetime fences remain authoritative. Checkpoints remain outside IDB transactions and synchronous per-file publication.
- URL read composition now retains one weak projection inside the existing relation-cache lifetime. Roles/gates/neighborhood reads reuse its map and identity instead of rebuilding the same high-degree evidence repeatedly. Source/host revision, URL publication and exact native file/cache observations invalidate reuse, including unnotified edits and negative proof. Presentation facets remain live. No URL grammar, relationship classifier, persistent schema or source authority changes.

## Initial live investigation

Exact installed baseline main.js: `5ceb30688fdf74cd78f2a2024951334a098b8f7de3c8f31741aa5ea48279ceda`. Reference eager indexing was active, independent URL discovery already complete with11815warm restored owners and zero URL Markdown reads. Thus waiting for URL body discovery alone did not explain ongoing visible work.

A bounded temporary10second profile recorded11.5205seconds inclusive host elapsed,4360URL compositions costing6562.4ms,1,375,561semantic-page lookups,1,311,069URL evidence checks and3,936,668owner checks. A single neighborhood read composed the same URL six times. A50ms heartbeat fired14times, maximum excess delay1588.3ms. Nested timing totals overlap; wrappers add unisolated overhead, and this is not actual paint or whole-process CPU measurement. The final sample was foreground/visible, but continuous focus was not captured, so it is diagnostic evidence rather than a comparable performance benchmark. All wrappers/timers were removed. Notes/settings were not changed.

## Verification so far

- Scheduler/settings/localization51tests pass; host-preview28tests pass; architecture7passes, lint zeroerrors/one existing activeLeaf warning, actual production build passed in offline review.
- Two new actual-Chromium URL regressions pass:240physical referrers plus origin, repeated role/gate reads perform no further pair composition, live labels retained; unnotified file/metadata edits and publication retire reuse.
- First standalone dense URL timing test failed65ms versus its existing50ms limit while Obsidian and another test competed. Limit unchanged; isolated required full verification pending. Early focused browser invocation was sandbox-blocked before execution; rerun with local browser/server permission succeeded. Initial new fixtures incorrectly counted the derived URL-origin parent and expected an unsupported URL to remain materialized; corrected expected behavior, production semantics unchanged.

## Remaining acceptance

- Required complete verify/build, frozen source/artifact identities.
- Exact-build disposable smoke and foreground/background preemption.
- Read-only reference Scratchpad → URL via rendered node click while eager indexing is active, heartbeat/DOM/count observations, progressive URL completion, cleanup and exact note/settings/enablement preservation. Repeat on-demand where practical. Do not certify active-indexing responsiveness from settled navigation.
- Physical pointer/paint and mobile performance remain separate from synthetic click/DOM/timer observations.

## Main independent review corrections

The first complete verification run passed architecture7/core69/Node288/UI17/portable333/browser408 plus build. Two concrete independent review findings then required corrections: the real synchronous per-file publisher only deleted a relation-cache entry, so its affected URL memo also needs retirement; and a live display-name-field change needs the role-sort signature updated. Both new real-Chromium regressions pass. A second complete run checks the corrected frozen source (`9681d1858a2ac43a2b8a58be2c64b12c5e82cd2158dff167498302255b186bc4`,271inputs); no test limit or oracle was weakened. The mandatory scale test is repeated only because of these concrete source corrections. No native/browser-heavy overlap is scheduled for final validation.

## Native failure retained; visible-row correction required

The corrected frozen source passed the complete verify command: architecture7/core69/Node288/UI17/portable333/browser410 and actual build. Exact main `3b797d1bbed9a21650cbbc8a5f2ab1311c6e07390dba55b4b4a58fcb3ba6ebd3` passed disposable staging/smoke and all six eager foreground operations while background acquisition was held: navigation4.4ms, folder27.7ms, add439.4ms, unlink68.3ms, creation5.8ms, edit87.5ms. These do not prove sustained large-vault responsiveness.

The serial read-only reference run rendered the URL center in66.7ms during eager indexing and38.9ms during on-demand discovery. URL incidence closed with233 physical referrers,232 parent-role nodes and four URL children, including case normalization and no self-edge. However, the continuously foreground on-demand run delayed a50ms heartbeat by1572ms, failing the existing1000ms bound. The eager run lost continuous focus and is excluded from a comparable timing result. Both settings modes restored11815 URL owners with zero URL body reads. Closure took about two minutes; instant center rendering is separate from inventory closure and subsequent gate/presentation work.

The failed report remains at `/private/tmp/kplex-throttle-reference-active-20261007.json`; its on-demand failure capture records active P2 presentation work after URL discovery completed. All cleanup checks pass: note path/stat digest, exact settings/enablement bytes, original center, prototype wrappers, timers and controller. The authorized new JS/CSS remain installed. No note was edited.

A second bounded diagnostic profile recorded one2593ms long task. URL composition464calls/1349ms and relation-view239calls/2539ms are nested inclusive timings with diagnostic overhead, not additive CPU times. Layout currently requests neighbour/gate counts for every positioned node before visible-row culling, including all232 URL parents with their own large incidence. This accounts for synchronous hidden-row work; the next correction defers these reads until actual rendering while preserving section-specific gate semantics. The profile ended hidden/unfocused, so it establishes the synchronous task/call pattern, not a foreground benchmark. All profile wrappers were removed. Reference K-Plex is temporarily paused with saved settings suppressed for isolated verification, then restored during native retest.

## Visible-row correction and bounded candidate investigation

Optional deferred-count geometry preserves default layout callers and all node positions. The production Plex renderer projects current gates only for regular nodes that intersect their scroll viewport, including partially clipped rows; transient section gates retain their section-owned totals. Clipped offscreen DOM remains present and scroll/filter/drag geometry is unchanged. The unused legacy total is retained without a semantic read during rendered projection, so an existing host count proof can take its fast path. Graph-depth-two expansion and cross-links still have their existing incidence-dependent geometry; this correction does not certify them as count-free.20 layout tests, installed-types and targeted lint pass.

The candidate main `572459ec76a64a1249aa0f669bc5a32a0827e511f75de3380bf7478673099299` rendered the URL in58ms and retained233 physical referrers/232 parents/four URL children. Maximum heartbeat excess892ms is **excluded** because continuous document focus was absent. Exact cleanup passes. The focused retry failed its ten-second focus preflight and also cleaned up exactly. macOS reports Obsidian frontmost, but Electron reports neither visible, focusable vault window focused. A desktop-tool inspection timed out; no GUI success is inferred.

Repeated visible presentation admissions also caused1018 retries for11 demanded paths in that candidate. The final correction retains the demand Set when exact GraphPage-object membership is unchanged; new page incarnations, actual visibility transitions, initial repair and native/source availability callbacks remain active. Types/targeted lint pass. Existing portable UI fixtures do not mount the production PlexGraph, so no copied-hook or regex assertion is presented as runtime coverage. Final frozen271-input identity is `238afe5643b906529836d59f46069fe82b280ca36406669535fe9e1e95c8b49d`; full verification/native acceptance remain pending.

## Final complete verification

The final frozen source passed `npm run verify`: architecture7, core69, Node291, UI17, portable333 and actual Chromium410; actual installed Obsidian types, official lint (zero errors, one unchanged activeLeaf deprecation warning) and production build pass. The browser lane took626.250seconds and its20,015-owner cached-publication fixture passed. No timing bounds or semantic oracles were widened. Source identity remained unchanged through completion. Log: `/private/tmp/kplex-throttle-verify-visible-20261007.log`.

Final artifacts: main `bdfd04ae5ba1b74315f8fd191c50fcbe6f50e013a7f6a2728ff4bd87d29198bf`; unchanged CSS `0d75bb3b4dd6a863319116b54b3d1b9f31d21d03ee8c8d24963aa0e344ebf01c`; unchanged manifest `e3bb9a35215af97f6a3394cf7fc8f7d2142bae06de94bb112fef5a05819cda62`. The unmodified repository native staging/smoke runner passes against that exact build in `kplex-test-small`. Its verify callback authenticates the already completed source-matched full gate, avoiding another costly suite repetition. Native report: `/private/tmp/kplex-throttle-native-stage-final-20261007/report.json`.

The maintainer reloaded the reference vault during verification, retiring temporary runtime state and selecting Scratchpad. The main agent reacquired the new instance and captured that current center/settings as the restoration baseline; note-stat digest and enabled-list bytes remain unchanged. The final reference test is serial after full verification, uses only authorized JS/CSS deployment and temporary indexing preferences, and separates functional correctness from timing acceptance when real continuous focus is unavailable.

Both final indexing-mode functional runs pass:233 physical referrers,232 parent-role nodes, four URL children, case identity, no self-edge and15 newly revealed parent rows with zero unknown counts. Visible presentation attempts fall to172(on-demand)/182(eager), with zero active/pending at capture. Both warm URL inventories restore/check11815 owners with zero URL body reads. Continuous focus remains absent; timer excess1097.7/1122.9ms is excluded, not accepted. Native report status is `functional-passed-timing-unavailable`, process exit1; every note/settings/enablement/center/prototype/controller cleanup check is true. Report: `/private/tmp/kplex-throttle-reference-final-20261007.json`.

A separate ten-second passive PerformanceObserver (no method wrappers) during URL navigation and active eager preparation records synchronous tasks551/62/87/739ms. URL inventory is complete. This is actual task blocking, separate from background timer/focus effects; it does not establish paint or trusted pointer latency. Observer/settings wrapper removed, Scratchpad/settings restored. Report: `/private/tmp/kplex-throttle-final-longtasks-20261007.json`. The source still computes optional cross-links for all positioned parents before rendering filters edges to the actual visible set. The next bounded correction reuses the existing cross-link owner on visible rows, while retaining full-scene edge/count behavior for active global filtering. The earlier full passing build is preserved as a distinct candidate, not responsiveness acceptance.


## Clipped cross-link candidate and deployment correction

Ordinary unfiltered scenes now reuse the existing cross-link owner with only the actual clipped visible rows. Structural sibling edges and pair de-duplication remain intact; active global filtering and section expansions retain their prior full-scene policy. The focused regression compares exact visible edge output with the former full-scene output and checks the queried source/target membership after scrolling.21 layout tests, installed-types and targeted lint pass. No second classifier/scheduler, authority or schema change.

Candidate main `e7311fab28182436a6aad8729486e94b8b72f17664354513efd7a3e27f9b0eea` passes a serial active-Eager reference test:233 physical referrers,232 parent-role nodes, four URL children, case identity/no self-edge,15 newly revealed rows with zero unknown counts.11815 URL owners restore and validate with zero URL body reads. Presentation demand settles at11 paths,181 attempts/169 completed/12 superseded, zero active/pending.

The passive PerformanceObserver records27 tasks of at least50ms over90.791seconds, maximum292ms, versus551/739ms in the earlier ten-second predecessor observation. These are sequential observations under different phase windows, not paired benchmarks or whole-process attribution. Synthetic click dispatch is2.5ms and first URL-center DOM36.3ms;50ms heartbeat maximum excess470.2ms. **All comparable foreground timings remain excluded** because continuous document/window focus is absent. Functional report status is `functional-passed-timing-unavailable`, exit1; no bound is widened. Report: `/private/tmp/kplex-throttle-reference-crosslinks-candidate-20261007.json`.

The maintainer observed an unavailable plugin following reload. Earlier verification held K-Plex disabled for long periods; direct artifact overwrites could also expose an incomplete file to an external restart. The corrected reference workflow writes the complete replacement beside the live artifact, verifies its hash, briefly disables K-Plex, atomically renames the staged file over the destination, verifies the installed hash, then enables and checks the actual loaded instance. There is no delete gap and unchanged CSS is skipped. Heavy verification now retains a P2 scheduler lease to pause only P3/P4 while the plugin remains loaded; normal saves are not suppressed during that pause. Brief native scenarios still suppress test-only preference persistence and restore the original instance/settings afterward.

The earlier candidate staging attempt failed because the maintainer's application restart retired the private baseline controller. No artifact was deployed by that attempt. The failure is preserved in `/private/tmp/kplex-throttle-reference-crosslinks-preflight-failed-20261007.json`; a fresh actual-instance baseline precedes the successful run. All successful-run cleanup checks pass: note path/stat digest, exact settings/enabled-list bytes, original center, prototype methods, timers/observer/controller. Only authorized JS/CSS remain installed.

Final271-input source identity: `df95946bd08cb8ca96a2e8ade4423301a475e2b19275e994d632db607bf294df`. Required isolated `npm run verify` is running in `/private/tmp/kplex-throttle-verify-crosslinks-20261007.log`; the preceding410-browser full gate remains evidence for its preceding source only.


## Final cross-link source verification and exact smoke

Final `npm run verify` exits0 on Node22.22.2: architecture7/core69/Node292/UI17/portable333/Chromium410, no skipped/cancelled browser cases, actual installed Obsidian types, scanner0errors/one unchanged activeLeaf warning, real production build. The mandatory20,015-owner cached-publication fixture passes in254.382seconds; browser lane599.708seconds.271 frozen source/test/package inputs remain `df95946b…`; six additional build/config/manifest hash observations remain unchanged. No timing limit, semantic oracle, import guard or scanner rule was relaxed.

Build output is byte-identical to the native-tested cross-link candidate: main `e7311fab28182436a6aad8729486e94b8b72f17664354513efd7a3e27f9b0eea`, CSS `0d75bb3b4dd6a863319116b54b3d1b9f31d21d03ee8c8d24963aa0e344ebf01c`, manifest `e3bb9a35215af97f6a3394cf7fc8f7d2142bae06de94bb112fef5a05819cda62`(0.0.5). Full log: `/private/tmp/kplex-throttle-verify-crosslinks-20261007.log`.

The unmodified repository native runner passes on that exact build in the disposable small vault: command registration, rendered K-Plex DOM and no captured JavaScript errors. Its source/config-matched verify callback authenticates the completed full gate instead of repeating the ten-minute suite. Report: `/private/tmp/kplex-throttle-native-stage-crosslinks-20261007/report.json`. Native host1.14.4(installer1.14.0). Final serial On-demand reference validation follows this completed gate; it does not overlap browser work.


## Final On-demand reference and cleanup

The post-gate serial On-demand reference run passes the same233physical-referrer/232parent-role/four-child oracle, case identity/no self-edge, and15 newly revealed numeric rows. All11815 URL owners restore/validate with zero URL body reads. Local index status is ready with four selected notes; scheduler lanes settle to zero at capture, presentation11demanded/209attempts/204completed/5superseded/zero pending or active.30 passive long tasks over107.681seconds peak163ms. Dispatch4.2ms, first URL-center DOM50.4ms and heartbeat excess758.6ms are **excluded** from comparable timing because continuous focus is absent. Functional status remains `functional-passed-timing-unavailable`, exit1, not overall responsiveness acceptance. Report: `/private/tmp/kplex-throttle-reference-crosslinks-final-20261007.json`.

Every native cleanup assertion is true. A separate post-cleanup audit confirms original Scratchpad/Eager state, Responsive default, loaded final artifact, unchanged note path/stat digest/settings/enabled-list bytes, no validation globals or P0–P2 leases, and normal P4 indexing resumed. Main/CSS/manifest match the completed build; only authorized JS/CSS deployment occurred. No notes were written. Audit: `/private/tmp/kplex-throttle-final-audit-20261007.json`. The six foreground operations from the earlier3b797d1b… build remain predecessor evidence; they are not attributed to this source.

[Minimized exact evidence](indexing-throttle-and-url-responsiveness-2026-10-07.json) records source/artifact identity, test counts, functional outcomes, failed/excluded conditions and cleanup without private note paths/content. Required exact-source checks are complete; no further heavy run or source correction is queued. Changes remain uncommitted. No C15–C26 or persistent schema changes.

## Remaining manual acceptance

1. Keep the reference K-Plex window focused and use the pointer to navigate from a note to the high-degree URL during Eager and On-demand indexing with Responsive. Expect usable interaction and progressively current numeric gates. Continuous focus could not be established through the native harness; passive tasks and synthetic DOM completion do not certify pointer/paint latency.
2. On physical Android/iOS, check cold/warm loading and background resume while indexing. Expect responsive interaction and retained numbers/drawing styling. Physical touch/WebView scheduling is not desktop emulation.
3. Exercise global filtering and expanded sections on a high-degree center. Expect established edge/count behavior and usable scroll/navigation. These full-scene paths intentionally retain their policy; this ordinary clipped-view correction does not certify their responsiveness.

The preceding broader few-second all-local-count startup target remains open. Cooperative pacing provides idle time at existing checkpoints; it cannot hard-bound one synchronous operation. No1–2minute block is observed in these bounded final task windows, but unavailable foreground performance is explicitly pending rather than accepted.


## Maintainer acceptance and URL cache-loading copy

The maintainer confirms the UI is now responsive in the production vault while cache loading is
active. This is qualitative production acceptance; earlier excluded native focus/paint timings
remain excluded. The remaining concern is misleading “Discovering web links —0 /0 notes” during
warm URL-cache restoration.

The factory defaults are **On-demand + Responsive**, preserving the maintainer's earlier request;
actual saved reference settings are **Eager + Responsive**. No default or saved setting changed.
The displayed status now uses “Preparing web link index” before any restored count is available,
then “Loading cached web links — N notes loaded” while the inventory total is unknown. Once a
positive scan total exists, the existing processed/total discovery message applies. Failure,
local readiness and hydration-label precedence are unchanged. This is localized presentation only;
no indexing, scheduling, cache, authority or relationship behavior changed.

Main independent review and checks pass:56 focused production-method/localization cases,
architecture7/zero violations, touched lint0errors/one existing activeLeaf warning, and the real
production build against installed Obsidian types. Source/test aggregate `db4ed1d3b827fd0c93c72b856c8c9a1c4e3aa03e55ca266ab905a6b08fa2a6b8`;
main `56aa837741e7bf9a7068640dc4af64eb2f4efe4df8a07a36ca0d9e28cf2c2c06`. The earlier410-browser/full graph gate certifies its earlier
artifact; it is not reattributed to this copy change. Large semantic/performance fixtures were not
repeated for the bounded status-only branch.

Atomic main.js-only deployment preserves notes, actual center/mode/throttle, exact settings and
community-plugin bytes, restores saveData and removes the observation controller/timer. The first
20second status observation timed out; its cleanup passed and its failure is retained at
`/private/tmp/kplex-url-status-native-first-failed-20261007.json`. A subsequent read-only capture
on the loaded warm instance passes: actual restored count1565→1566→1572 while total remains
unknown, live status matches each count, and rendered control advances1534→1566. No0/0 label,
zero URL body reads, Eager/Responsive preserved and no test controller. Follow-up report:
`/private/tmp/kplex-url-status-native-followup-20261007.json`. No startup/paint latency is inferred
from this functional observation. The verified copy build is installed; no Git action was taken.


## Final commit verification

At the maintainer's request to commit, push, create a PR and return locally to main, the complete
`npm run verify` gate was repeated on the final status-copy source. Node22.22.2, frozen271 inputs
`db4ed1d3b827fd0c93c72b856c8c9a1c4e3aa03e55ca266ab905a6b08fa2a6b8`, and the six additional
build/config hashes remain unchanged. Architecture7/core69/Node292/UI17/portable333/Chromium410
pass with zero browser failures/skips/cancellations. Browser duration597.029seconds; the mandatory
20,015-owner publication fixture passes in251.190seconds. Scanner0errors/one unchanged warning;
the real installed-types production build succeeds. The final main remains byte-identical to the
installed status-copy artifact `56aa837741e7bf9a7068640dc4af64eb2f4efe4df8a07a36ca0d9e28cf2c2c06`.

The unmodified native runner passes against that exact artifact in `kplex-test-small`, serially
after the gate: command registration, rendered K-Plex and no captured JavaScript errors.
Obsidian1.14.4(installer1.14.0). Its authenticated source/config gate callback reuses the completed
full suite rather than repeating it. Full log and smoke report:
`/private/tmp/kplex-commit-verify-20261007.log` and
`/private/tmp/kplex-commit-native-stage-20261007/report.json`.

Final reference cleanup verifies unchanged note path/stat digest, current center, exact settings
and enablement bytes, loaded matching artifact, no temporary controllers or P0–P2 leases, and
resumed P4 work. Only the temporary background pause was released; the current user-selected
center was preserved. Audit: `/private/tmp/kplex-commit-reference-cleanup-20261007.json`.
The maintainer authorizes the Git checkpoint and PR; merging/releasing is outside this request.
Earlier failed/excluded timing observations and outstanding mobile/global-filter/startup limits
remain unchanged. No C15–C26 work is started.
