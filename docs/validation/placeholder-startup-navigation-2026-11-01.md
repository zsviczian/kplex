# Placeholder navigation during startup

## Report and boundary

The maintainer reported that selecting an unresolved neighbour immediately after
startup replaced the canvas with “Building K-Plex index…”. The toolbar, pins and
nodes disappeared; enabled history entries did nothing. Inspection of the
production vault was read-only: no navigation, rebuild, reload, setting change,
cache change or note write was performed. Its installed K-Plex artifacts matched
the preceding branch build. Excalidraw remained at the installed 2.29.0 version;
this failure does not use the companion drawing-template API.

Production observations showed continuing source reconciliation, an absent
placeholder page and zero live semantic demands or host-preview scopes for the
stalled surface. There was no captured JavaScript exception. No private note
content or production paths are included here.

## Cause and change

A neighbour may initially exist only in its current center's provisional host
preview. Changing center releases that preview. The new center's preview was
restricted to native files, so an unresolved center could become unavailable
before global indexing completed. App then unmounted the graph and its semantic
demand. History rendered available rows but `node.activate` belonged only to the
unmounted graph, leaving its buttons inert.

- App retains its exact accepted center across the provisional startup gap. A
  different center, retired native file or pending native follow cannot borrow
  this fallback; normal authoritative missing-center fallback still applies.
- Observed unresolved host-link targets can acquire their own bounded preview.
  Existing source/fanout/record limits remain in force. Arbitrary missing paths
  are not fabricated, no note is created, and this preview grants no global
  semantic/evidence authority.
- App supplies a saved-destination activation fallback when the graph is absent.
  It resolves the captured target and reuses existing native identity, editor and
  rooted-navigation admission. Graph occurrences retain their graph-owned action.

These paths predate the creation/navigation feature batch. The fix changes the
bounded host preview and App; the graph scheduler and URL-alias timing test are
unchanged.

## Verification at the implementation checkpoint

Node **22.22.2**. Both new placeholder regressions failed before the source fix:
App lost the accepted page; the new placeholder had no own preview after release
of its original center. Both pass after the change. The affected set passes
**135/135**:

```sh
node --test --test-reporter=spec --test-concurrency=1 \
  tests/center-recovery.test.mjs tests/host-metadata-preview.test.mjs \
  tests/linked-document-follow.test.mjs
```

The loading-history case dispatches through the real ActionManager with no center
or graph implementation. It also checks unavailable/transient targets, occurrence
ownership and refused rooted/editor admission. The startup selection case checks
that unrelated/retired file identities and pending follow cannot be retained.

`npm run build` passes against the real repository types. Complete `npm run verify`
is running; architecture **9/9**, core **132/132**, lint and main **1,843/1,843**
have passed. This checkpoint does not claim completed full verification.

A disposable Small-vault native check exercised actual metadata, React nodes,
toolbar/pins, preview ownership and history recovery, preserving settings and
community-plugin configuration bytes. A stricter startup fixture is still being
validated because a navigation/setup helper can complete global indexing. The
first native interaction pass alone is not evidence of the precise startup race.
No production plugin reload or deployment has been performed at this checkpoint.
