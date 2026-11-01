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

`npm run build` passes against the real repository types. Complete `npm run verify` passes: architecture **9/9**, core **132/132**, main
**1,843/1,843**, browser **453/453**, source **357/357**, source/browser
**856/856**, ESLint and the final production build. This is **3,650 passing
checks, zero failures**. The unchanged scheduling-bound check and the 20,015-owner
case pass. No assertion or time limit was weakened. The final build hash matches
the artifact exercised natively and confirmed in production.

## Exact-build native acceptance and production confirmation

The strict macOS/Obsidian **1.15.0** Small-vault run passes. It constructs a
separate disposable index after warm setup and holds its existing P1 scheduler
lease so background global publication cannot mask startup. Real native metadata,
bounded preview compilation, React rendering and action dispatch remain active.
At placeholder acceptance, global graph pages are **0**, the placeholder is absent
from global state, and startup readiness is **false**. Its own host preview,
connected source note, toolbar and pins are present. Available history then
recovers an intentionally loading surface. The placeholder remains uncreated.

[The sanitized native receipt](placeholder-startup-2026-11-01.native.json) records
exact artifact hashes. All owned fixture files, views, scheduler leases and the
disposable index were retired. Original settings and community-plugin enablement
bytes were verified unchanged. This uses programmatic native clicks and a
synthetic scheduling hold; it does not establish physical mobile acceptance.

Earlier fixture attempts were rejected because their helpers allowed canonical
global publication. A setup request also exceeded its tooling deadline; its
settled cleanup was confirmed before its owned Node result collector was retired.
Obsidian was never force-closed. Those attempts are not counted as acceptance.

The same verified K-Plex `main.js` was subsequently copied to the maintainer's
production plugin folder under explicit artifact-only authorization. Existing
CSS and manifest already matched, so they required no write. The original three
artifacts were backed up outside the vault. No production note, setting or cache
was changed, and the agent did not reload the plugin or application. Excalidraw
was untouched. After manually reloading K-Plex, the maintainer confirmed:
**“Both work correctly”** (history navigation and clicking the placeholder).

Source checkpoint: `97a10b15a010d0add16f65c8d03ab76cbc90d723`. Verified runtime:
`main.js` SHA-256
`d10ee1c54c285978f91a5719268ddf409f6b262b791097dbb8d5db24f2f695ca`.
The complete portable verification passed after this source checkpoint; subsequent
commits only record acceptance and testing guidance.
