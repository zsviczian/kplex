# Stationary restored-center startup investigation (PR183)

## Scope and source identity

The maintainer requested investigation **and implementation** on 2026-10-18,
superseding the draft PR's investigation-only stopping point. Work stays on
`2026-10-18-startup-center-investigation` at
`d10cb46b43cb079df424f45bcb2f8c3af14adbd8`; its runtime matches
`e95d3db9752de165bae52ebe21646f73acd00849`. No newer-main runtime was silently
merged. No commit, push, PR edit, merge or release is part of this delivery.

The maintainer authorized read-only diagnostics in the reference vault and
replacement of its K-Plex `main.js`. No diagnostic command writes notes, settings,
workspace or enablement files. Normal renderer reloads exercise existing plugin
startup/cache owners. The original bundle was backed up outside the vault.

## Reproduction and earliest divergence

Native macOS Obsidian, actual Eager strategy and Responsive pacing, 11,839 Markdown
files. The selected center is the maintainer-identified use-case note with 37
expected children. No navigation was issued during observation. These are vault
**renderer reloads**, not full-process restarts or plugin disable/enable tests.
Host: Obsidian 1.14.4 (installer 1.14.0), Darwin 23.5.0; verification uses Node
22.22.2 and the installed Obsidian 1.13.0 type package. Small has 74 Markdown files.

A test-only, non-minified build of the frozen baseline installed passive wrappers
before plugin construction. Table times are monotonic milliseconds after that
module-footer installation, not OS process-start time. It preserves original synchronous values, exceptions
and Promise identity, and never calls graph readers, acquires demand, resets
caches or repairs the center. Timing includes observer overhead and ordinary host
scheduling; it is not paint latency, CPU time or a controlled performance benchmark.

| Baseline run | Observation |
| --- | --- |
| First observed reload | Native file/search catalog 2.348–2.429 s; initial preview has only four adjacent entries. Three global structural attempts return null; fourth succeeds at 9.570 s. Local baseline ready at 10.004 s, requested host cover ends at 10.761 s, first ordinary UI neighborhood read with 37 children at 10.765 s. |
| Reload interrupted at 6.867 s | Rendered scene still has one node. Renderer reload issued without navigation. |
| Following stationary reload | Global structural attempts start at 2.388, 3.703 and 5.212 s. Their host-link collection returns false at 3.625, 5.212 and 6.611 s; structural collection had returned a context. The still-demanded center owner drains at 6.612 s and watchdog returns incomplete. |
| Same failing run, no interaction | Ordinary UI reads still show zero children at 14.506 s; DOM still one node at 53.498 and 70.432 s. No center task resumes in that interval. |
| Same run, later saved-preview handoff | Saved preview publishes at 72.142–72.147 s; first ordinary UI neighborhood read with 37 children at 72.167 s. Later DOM count is 41. Source validation remains ongoing. |

The failing run retains 116 events with no omissions. The healthy comparison
overflows its bounded rolling trace, but preserves the early segment containing
first availability. Raw traces and original bundle stay private under the local
task report directory; no note paths, contents or settings dumps are committed.
The initial observed bundle SHA-256 is
`beeed6c68f5a82b63302aaee208ed9cc998ef1267b10137531d32b4cce11f0dc`;
the original installed bundle is
`16352a22e3389d50512a3e71d8647b4274c5c9a8984fee4a607d40a073360f25`.

## Causal interpretation

`ensureOnDemandCenter()` originally waited for the whole-vault structural
baseline before acquiring its center body or compiling its full local host cover.
`GraphBuilder` correctly refuses an inconsistent host-link family; its ordinary
collector finality checks must stay. At this boundary a null baseline did not
retire the existing demand/generation/policy tokens, so the center task's finalizer
did not re-admit it. The initial watchdog also finished pending. The next useful
publication was the broad saved preview over a minute later.

This distinguishes a foreground continuation gap from an index deadlock: background
cache/source owners continued and eventually made the scene useful. A new
`acquireSemanticDemand()` calls the center owner again even if the requested center
previously drained, explaining the source-level difference made by navigation.
Actual away/back navigation is kept to synthetic/disposable fixtures to avoid
persisting navigation preferences in the personal vault.

The native trace proves host-link collection rejected each private pass while
loaded host observations were changing. It does not identify every internal
collector rejection branch. A controlled regression changes an actual host link
map during its finality check, proves rejection, and verifies the existing baseline
producer retries the changed observation.

A separate real React regression proves a visibility lifetime defect: PlexGraph
marked an **attempt** complete before its awaited check settled. A hide/reveal
after a pending check disposed the readiness subscription and refused to re-arm.
That defect is demonstrated synthetically; it is not claimed as the observed
native run's initiating cause.

There is no evidence here that rapid restart deleted a cache or persisted a
misleading temporary graph. The observed failing startup had no complete snapshot
save and later reused its saved preview. Broader cache differences across
full-process interruptions remain a separate unproven hypothesis.

## Change and retained boundaries

- The existing coalesced center owner first prepares a bounded read-only body/host
  cover in the current-node lane. It does not await optional saved-preview
  arbitration or the all-vault baseline. Normal baseline and canonical per-file
  patching follow through their existing owners.
- Body acquisition reuses the source adapter's cache/native/parser path, reading
  only the requested center. Optional parser persistence uses existing write-behind;
  no source head, schema, relationship classifier or scheduler is added.
- Private preparation retries changed source/host observations within the existing
  live owner. Unchanged missing/guarded input does not create a polling loop.
  Demand, native identity/stat, policy and cancellation fences remain required.
- The finite P1 phase is coalesced per center independently of its canonical
  task's broad waits. Real input events can refresh a sparse startup cover while
  that canonical task still awaits the same baseline. Unrelated host events keep
  the published readonly cover; affected events retire its map/demand token.
  Host finality remains required during compilation and publication. No global
  source-certificate renewal or additional scheduler is introduced.
- Finite readability does not claim global baseline/source completeness or grant
  relationship-write authority. Exact current saved incidence keeps its precedence.
- View startup recovery is consumed only by a completed, still-current visible
  check. Pending and retired completions remain eligible on reveal.

## Validation

- Before the index fix, both strict production-owner regressions fail after their
  eight-second bound: zero center body reads, zero children, global baseline held.
  The React visibility regression likewise fails before its flag correction.
- Focused corrected tests cover exact identities of 37 unresolved children from
  frontmatter/body, warm parsed-body reuse, held source/baseline work, and no
  unrelated reads or semantic write authority. Additional cancellation/finality
  and full verification results are recorded at closeout below.
- Observer contracts run on Node 22.22.2 and test output/Promise/throw identity,
  getter/thenable non-assimilation, bounded retention/privacy, expiry and exact
  wrapper teardown. These doubles validate the tooling, not Obsidian startup.

The first complete verification attempt reached 1,068 Node tests, with 1,066
passing and two structural-move failures. Their production modules were unchanged.
On macOS, the temporary stub directory's `/var` alias and `/private/var` real path
made esbuild include two Obsidian test modules: exported `TFolder` instances failed
the imported class's `instanceof`, and exported notices differed from the modal's
notice singleton. Canonicalizing the test directory with `realpathSync()` fixes
both without production changes or relaxed assertions; all 22 structural-drop
tests pass. The complete suite is rerun after that harness correction.

An earlier development control ran the new P1 preflight after baseline readiness
as well, producing 176/190 passes with 14 postbaseline continuity/handover failures.
Restricting it to prebaseline work preserves those existing owners; this guard is
intentional. The final focused and full checks retain their original postbaseline
oracles. No deadline, semantic golden or authority assertion was relaxed.

That rerun passed architecture/core/lint, all 1,068 Node tests, 145 UI browser
tests and 334 portable source tests, then finished the source-browser suite with
626 passes and two failures. Both failures exposed fixture ordering assumptions:
the cancellation test now drains genuine foreground owners before isolating late
source authority, and the ontology race explicitly admits the real P2 baseline
under the held P1 preview. Every state-identity, provenance, no-read and source-head
assertion remains. Independent review also found and fixed a missing policy token
in baseline cancellation; a held actual-builder regression proves an old-policy
baseline cannot publish even when invalidation leaves its generation unchanged.
The focused six cases pass; final complete verification follows these corrections.
The complete startup/foreground pair then passes 104/104 cases on the final policy
fence. The added policy regression was not separately run red; its pre-fix premise
comes from source review. This differs from the two primary held-baseline controls,
which were actually observed failing before the implementation.

Independent source review covered the complete diff against AGENTS.md,
CONTRIBUTING.md and the architecture/workflow contracts: existing parser/compiler
and priority owners, finite readonly versus durable semantic authority, opaque
identities, native stat/event and policy/demand fences, lifetime cleanup and TSDoc.
No new user-visible copy, host API, storage schema, network destination or CSS is
introduced. C14 remains paused; this is a scoped startup correction.

Focused reproduction commands (Node 22.22.2; discovered Chromium required):

```sh
node --test --test-concurrency=1 --test-name-pattern='stationary dense|stationary plain-link host waves|finite center preview|local baseline retries|semantic policy invalidation' tests/foreground-startup-indexeddb.test.mjs
node --test tests/center-recovery.test.mjs
node --test tests/startup-center-observer.test.mjs
```

Two pre-existing watchdog expectations now explicitly assert the intended earlier
read-only cover and retained body-URL/count continuity. Their readiness and finite
follow-up checks remain strict; no deadline or semantic golden was relaxed.

## Native observation tooling and cleanup

`scripts/testing/obsidian/startupCenterObserver.mjs` exports a self-contained
`installStartupCenterObserver({GraphIndex, GraphBuilder, HostMetadataPreview},
window, optionalFingerprint)` for a **test-only non-minified build footer**. The
callback may return a validated aggregate SHA-256 of an ordinary neighborhood
result; it must not acquire graph data. Use actual bundled constructors, install
before plugin construction, and use frozen source overrides when comparing an
older revision. The observer is not imported by production.

The candidate footer hashes the multiset of each ordinary returned role's exact
endpoint path, role, definition, direction and relation type. Only SHA-256 leaves
the diagnostic callback. A separate, explicitly requested read of the mature
baseline supplies the comparison oracle after the passive failure campaign;
it is not counted as a passive startup event. Candidate timing acceptance uses
only subsequent ordinary UI reads, never a diagnostic read that could prime them.

Capture `window.kplexStartupCenterObserver.snapshot()` through a bounded CLI eval
and save the returned scalar JSON outside the vault. It stops recording after
180 seconds, caps its trace at 640 events/1 MiB, reports omissions and retains an
early prefix plus recent tail and first rejection context. Capture before any
interaction, and label subsequent recovery actions separately. No passive capture
can establish actual paint or physical-device behavior.

Always call `window.kplexStartupCenterObserver?.dispose()` independently of
assertion success, replace the observed artifact with a normal build atomically,
and check that both the global and observer code are absent from normal runtime.
The baseline wrappers were disposed and the original `main.js` restored before
verification. Settings, workspace and community-plugin bytes still matched their
pre-investigation SHA-256 values after the baseline campaign.

## Closeout

The first candidate passes complete `npm run verify` (7 architecture, 130 core,
1,068 Node, 145 UI browser, 334 portable source and 629 IndexedDB browser tests,
plus official lint and the production build). The exact-build Small smoke passes
command registration, rendered K-Plex and no captured JavaScript errors. Its normal
bundle is `069c733874de79afaa8c48d8b139bda0298a2d4f2bb72c5402fba54ab9196260`.
These checks are candidate evidence, not final native acceptance.

Native candidate 1 **fails the intended early-availability target**. Its observed
bundle is `d10a5a6637a7098a467afc29b400c162b7d9b6f4212bacb24a7e024d265b1d7c`.
The first cover publishes at 2.842 s with five neighbors; a subsequent host event
retires it. The broad center task remains pending on the global baseline, so a
replacement demand call joins that task instead of compiling another P1 cover.
Interruption at 7.014 s finds three DOM nodes. The next reload first returns the
expected 3 parents/37 children at 10.793 s. Their primary relationship fingerprint
matches the mature baseline, but the timing requirement is unmet.

`HostMetadataPreviewResult.incomplete=true` describes every successful readonly
preview; it is not a rejection flag. The observer's void-return encoding is also
not a failure. The initial interpretation was corrected by inspecting the local
scope's actual presence and neighbor count in the same trace. Native focus and
visibility are true. The candidate's wrappers were disposed and the original
personal-vault bundle atomically restored after this run.

The native-shaped sparse-host-wave test actually fails on candidate 1, then
passes with the independent finite phase. It holds the real global builder,
first publishes two parents/no children, loads current plain-link host maps for
three parents/37 children, retains the same broad task and demand, and verifies
the full cover. An unrelated metadata event preserves its identity without extra
P1 work; actual center removal produces 36 children. Per-center preparation stays
coalesced, no unrelated bodies are read, and editing authority remains false.
Nine focused cases and the complete 105-case startup/foreground pair pass, plus
real typecheck and touched-source lint.

Candidate 2 source GraphIndex SHA-256 is
`58e969df37204fb8250796645d43165bd644c47886b474b1eec453226faf90aa`;
its observed bundle is
`c5cdf0da7769ed35ce1a0dc6d8d3c9a041c8d624b72dbfb3c88433c88014a104`.
Native first ordinary reads contain 3 parents/37 children at **3.811 s**, then
**3.325 s** after interruption at **7.035 s**. Both have global baseline readiness
and source authority false. Both match the mature baseline primary relationship
fingerprint `0c630afea0a5d0e3d4d34ce93c432203d686262046bdeb986c798f7493d2518d`.
The cover stays available at capture and no subsequent primary-role reads regress;
the second trace has zero omitted events. The window is visible and focused.
Later sibling enrichment follows current settings and is outside that primary
relationship fingerprint.

The repeated interruption at 7.021 s also passes: first complete primary reads at
3.669 s and 3.318 s, still before global baseline/source readiness, with identical
fingerprints, availability at capture and zero later regressions. Across all four
starts the full primary neighborhood appears in 3.318–3.811 s. Exact private
summaries are `candidate2-summary.json` and `candidate2-repeat-summary.json` under
`/private/tmp/kplex183-startup/`. No navigation, additional semantic demand,
diagnostic neighborhood read or repair was issued during those captures.

The optional canvas screenshot was rejected by automatic approval review because
it could export personal-vault content. It was not captured or retried through an
alternative route. DOM role counts and aggregate relationship fingerprints supply
native acceptance; no visual screenshot or paint-latency claim is made.

Candidate 2 wrappers were explicitly disposed and the original personal bundle
atomically restored before final verification. No production code changed after
native acceptance. These are sequential host observations, not a randomized
performance comparison or evidence of full-process/mobile startup.

## Final verification, normal bundle and cleanup

Final `npm run verify` exits **0** on the frozen candidate 2 source: architecture
7/7, core 130/130, Node 1,068/1,068, UI browser 145/145, portable source 334/334 and
real IndexedDB browser **630/630**, plus official Obsidian lint, installed-package
typecheck and the production build. No skips, cancellation or failed tests are
reported by those suites. The large 20,015-owner case retains its original exact
metadata/evidence/gate/degree, no-I/O, work-count and cancellation assertions. Its
cached-publication phase takes 318.679 s in this run. That is a test observation,
not a native startup measurement. No bounds or assertions were changed to obtain it.

The main agent invokes the actual full command through the required shared
`runPortableVerification(process.cwd())` helper, on Node 22.22.2. The complete log
is `/private/tmp/kplex183-startup/verify-final.log`. A 553-file receipt hashes the
source, tests, build inputs and artifacts; all still match after native closeout:

| Identity | SHA-256 |
| --- | --- |
| Verified input/artifact receipt | `880ec93a4821c95bcad8a4afddbf7fc701d30f32b9fd1285ea61a5a8b425e374` |
| Normal `dist/main.js` | `a47c87da51086d65acbad8286bf4e66e7aa93b79e04e03b75fbb0c8c49476414` |
| `dist/manifest.json` | `19d9ecce5557733e0ff0f2e27155e635c30158c3cfa6fbca0f11c16e4dedfd2c` |
| `dist/styles.css` | `433605d6f9a88b23e4ac35940de23afd2b37faf7102d3e978a077259ff281801` |

The standard `runObsidianVerification` runner validates the explicit Small vault
and CLI-reported path, stages those exact three artifacts, enables K-Plex, checks
registered commands and rendered `.kplex-app`, and finds no captured JavaScript
errors. Its injected verification callback validates the preceding successful
full-verification receipt and every hashed input; it does not claim to rerun npm
inside that subsequent native stage. The report is `strict-final/report.json` in
the private task directory. The personal vault receives **only normal main.js**
through an atomic replacement. Both installed main.js hashes match the table.

An initial normal-bundle DOM probe hits a bounded 30-second CLI eval timeout before
its final capture is saved. A subsequent read-only reconnect returns promptly with
the expected 3 parents/37 children and no observer. The exact timeout cause is not
established; it is not presented as proof of a plugin freeze or dismissed as a
proven transport-only problem. The first driver did not save incremental samples,
so that attempt supplies no valid early-availability timing.

The unchanged normal artifact then passes two complete, incrementally captured
pairs with explicit foreground/visibility checks and the same bounded native
deadlines. Polling observes actual rendered DOM, without graph acquisition or
repair. Times below are first successful samples **from the reload command**,
including CLI/startup overhead and polling, rather than the observer-footer clock:

| Normal pair | Initial start | After interruption | Interruption renderer age |
| --- | --- | --- | --- |
| First | 6.804 s | 3.961 s | 7.066 s |
| Repeat | 6.612 s | 5.595 s | 7.087 s |

All four starts render the exact 3-parent/37-child primary counts and retain them
through capture. All sampled windows are foreground/visible, the final P1 owner
is loaded, and the temporary observer is absent. Status remains **Reading cached
index metadata** at the final captures: early usefulness precedes global startup
completion. These coarse DOM samples are not paint measurements. Private normal
captures are `production-rapid-first-pass.json` and `production-rapid-report.json`.

The smoke test normalizes pre-existing Small appearance defaults and changes its
active workspace. Cleanup restores its original live layout through the typed
`Workspace.changeLayout()` API, drains the existing settings queue, then restores
the exact backed-up settings/workspace bytes. A later independent audit verifies
both vaults' original data.json, workspace.json and community-plugins.json hashes,
all Small content bytes (74 Markdown files), exact deployed artifact hashes and
zero changed verification inputs. No personal note-write command was issued.
The personal canvas is left foreground with all primary nodes visible. Original
personal main.js remains backed up outside the vault.

`src/` and normal `dist/main.js` contain no observer hook. The temporary global and
staging file are absent; the rejected screenshot file does not exist. Final
`git diff --check` is clean. Changes remain uncommitted on the identified PR branch;
no push, PR update, merge or release occurred. C14 structural refactoring remains
paused. One highest-value manual follow-up remains: a true full-application exit
and reopen, interrupted again after 5–10 seconds, should retain the same complete
stationary center without navigation. Renderer reload evidence does not exercise
process-exit cache/save behavior. Physical mobile is not claimed by this desktop
startup correction.


## Main reconciliation and merge validation

The maintainer subsequently authorizes committing, reconciling current main and
merging PR183 immediately after local acceptance, without waiting for GitHub CI.
The earlier uncommitted-delivery statement describes the initial closeout only.
Implementation checkpoint `e847a50` preserves that accepted fix. Integration
`e2e391ffe895c2ce6ae3bf7aafea1a247930adc9` incorporates main
`658793fe16896f2ae02f7e531ede5d1849077b2e`, including #181 crosslink preview and
#182 incoming-settings reconciliation.

Conflicts are limited to HANDOFF, the append-only Refactor plan ledger and the
package test command. Both feature histories and both new suite registrations are
preserved. Runtime PlexGraph merges cleanly; compared with incoming main it has
only the startup-recovery callback and module-comment changes. GraphIndex and
source acquisition remain byte-identical to the accepted implementation. Main and
offline read-only source reviews confirm separate recovery/hover visibility
lifetimes and synchronous semantic-policy invalidation on incoming settings.
No new parser, scheduler, cache schema or semantic authority is introduced.

Full `npm run verify` via `runPortableVerification` on Node22.22.2 exits **0**:
architecture7, core130, Node1069, UI165, portable source334 and real IndexedDB632,
with zero failures/skips, official lint, installed typings and production build.
The unchanged 20,015-owner oracle passes; its cached-publication observation is
113.467 s, not a comparative native timing claim. Complete log:
`/private/tmp/kplex183-startup/verify-merged.log`.

The merged 558-file input/artifact receipt is
`f3d09d8a8e592be3bf40ad8a0f647b23f4a35ce3e61f01fb5ada7c6f4aa36131`.
Merged main.js SHA256 is
`a709657e06d8f893d185fbc933967266e50007424ccbab751e1410c8c286ff68`;
styles.css is `0135225519ad680cace5c7a35e8eab8388a3c6e6a8ead1a10a49f337324b106a`;
manifest identity is unchanged from the preceding table. The standard exact-build
Small runner validates that complete successful receipt before staging. Command
registration, actual rendered K-Plex and captured-JavaScript-error checks pass.
Original Small settings/workspace/enabled-list bytes and all78 content files
(74Markdown) are restored/unchanged; deployed artifacts match. The independent
closeout audit confirms all558 verified inputs remain unchanged. Private reports:
`strict-merged/report.json`, `merged-small-cleanup.json` and
`merged-closeout-audit.json` under the same private task directory.

This reconciliation does not redeploy the personal vault: its prior accepted
startup artifact and timings above remain separately identified. The merged build
has exact Small smoke acceptance plus full portable regression coverage; no new
personal-vault startup timing or full-process/mobile claim is made. Git publication
and final merge identity are recorded on PR183; no release/tag is created.
