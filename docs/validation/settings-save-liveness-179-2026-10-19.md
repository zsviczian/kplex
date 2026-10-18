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

Keep preparation/publication in GraphIndex: finite retry attempts, a real host-task
yield between attempts, unchanged source/policy/identity finality, coherent old
publication on exhaustion and later explicit/current-input retry. No automatic
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

Implementation and final portable/native acceptance pending. Keep #179 draft.
