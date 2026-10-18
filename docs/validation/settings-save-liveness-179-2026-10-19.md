# Settings-save liveness (#179)

## Causal checkpoint

Baseline main `60d2239`, integrated without rewriting at `3bc489c`. Node22.22.2,
installed production types/dependencies, real Chromium/IndexedDB and native Windows
Obsidian1.14.4. No personal vault, comparative performance campaign or new archive.
Native uses the previously validated installed `1137fc1` bundle (production source
identical to this baseline), SHA-256
`96ae2f09efce197dfacecf0fa29760f1867bcd719b6714979283752f5e453cee`.

Four bounded baseline regressions fail through actual production owners:

- GraphIndex presentation notification revisits a removed/re-registered subscriber
  16 times in one dispatch. The test stops re-registering at16 to remain safe.
- A subscriber's nested notifications enter recursively to depth4; the defensive
  test caps nesting. No particular real subscriber is proved to cause a freeze.
- Actual preparation with controlled source-currentness invalidation completes65
  attempts rather than a finite retry outcome. Normal private facet/search owners
  run; a forwarding fault rejects each completed search and advances source input.
- The real queued appearance writer and native-shaped style editor remain locked
  after durable Save while optional refresh is held. This is a blocked editor,
  not evidence of a starved renderer.

A native actual Settings/Node-style/Border `--h1-color` probe holds an earlier
facet-and-search preparation, then submits the parent style Save. After300ms:
**1 write, durable style present, editor pending, 25 task heartbeats**, earlier
preparation still held. Releasing the holds lets it finish. Five native checks
pass, including restoration; this is an observation control, not fix acceptance.
The first attempt held search after changing only label length, which does not
request search preparation; that failed prerequisite is preserved. The corrected
probe changes full-tag display, exercising both facets and search.

Raw logs remain private in Temp (`kplex-179-owner-red.log`,
`kplex-179-durable-red.log`, `kplex-179-native-baseline-*`,
`kplex-179-native-overlap-*`). No raw traces are committed or published.

## Bounded correction selected

Keep optional settings adaptation in GraphIndex: at most8 attempts, a64ms retry
window after allowing an initial attempt and one retry, real host-task yields,
unchanged source/policy/identity finality and coherent old publication on exhaustion.
Later explicit valid input can retry. No automatic
rebuild or source-read workaround. Make presentation dispatch snapshot-based and
non-recursive, retaining stronger/keyed work while suppressing redundant feedback.

Keep the one settings writer. After disk and coherent live-settings publication,
bound editor waiting on optional refresh. Retain at most one optional refresh
flight and one coalesced newer obligation; consume failure and fence teardown.
A deadline is saved/refresh-pending, never cancellation or replay of disk writes.
Existing pending feedback and modal controls remain the UX owner.

These are validated safeguard candidates. The original whole-application freezes
remain unproven; no Sidecar/Properties/root-cause claim follows from these faults.
Scalar coalescing and mixed-effect classification remain unimplemented leads.

## Acceptance

The bounded owner regressions pass, and the surrounding105 editor/presentation/
external-settings/ontology cases pass before the final snapshot-specific addition.
An overlap regression first caught an unnecessary second semantic refresh after a
workflow save; separate semantic-obligation revision tracking corrects it without
changing the existing oracle. The corrected overlap/unload checks3 pass. All23
localization checks pass; the generic saved/pending notice is translated in8 locales.
Real production build and official lint pass at the earlier candidate; full final
verification and exact native candidate acceptance remain pending. Keep #179 draft.

The completion lease waits at most200ms after durable/live publication. A held
native operation remains one owned flight, with one coalesced newer obligation;
no disk replay/cancellation or independent refresh task per edit. Repeated newer
intent has an8-attempt convergence bound, then remains truthfully pending for
explicit retry/reload. Unload fences follow-up effects and consumes late errors.
Default copy-on-write, theme fencing, failed/uncertain storage and native modal
submission ownership retain their existing owners and regression coverage.

Only presentation notifications change: snapshot/removal semantics, isolated
optional-subscriber errors and nonrecursive key/stronger-kind coalescing. Same
publication feedback deduplicates; at most4 synchronous rounds precede one bounded
host-task continuation for actual newer work. Semantic per-file publication is not
made asynchronous.

A separate uncommitted private/compiler-preparation cap was rejected during owner
review: returning null would enter existing missing-cache recovery paths. It is
restored to the exact baseline, not shipped. Private source SHA-256:
`219d426ee872163784e5dc3c43b83091f4f3d020374636e6ba251e0bee27c96a`.
No new source outcome protocol or #176 redesign is introduced. The one source-
restore caller of optional settings adaptation now distinguishes its typed pending
outcome from cache damage. A real IndexedDB regression proves retained body-only
relations, zero source-recovery admission/body reads, and later valid display
convergence. Compiler/source preparation retry contracts themselves remain a
separate limitation; no whole-renderer-freeze resolution is claimed.


First full verification at `941ddda` stops in the Node test group:1098 pass/29
fail, all from the narrow migration host lacking `window.setTimeout` (or no window).
The browser host already supplies real timers. The Node fixture now supplies real
`setTimeout`/`clearTimeout` rather than a production fallback or synchronous fake;
all88 migration/runner tests pass without changing their assertions. Native drawing
cleanup now acquires ownership only after checking the companion returned the
exact requested test path. Production source is unchanged by these corrections.
The failed log remains private (`kplex-179-full-final.log`); the corrected full run
uses `kplex-179-full-retry.log`. Acceptance remains pending until it completes.
