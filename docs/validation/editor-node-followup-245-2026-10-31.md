# Shared editor activation, framing, media and Properties — PR245 follow-up

Baseline: `ad9bf40`, branch `2026-10-31-editor-mobile-navigation-fixes`.
Scope is the four maintainer-requested editor behaviors. Existing icons/controls remain.

## Causes and implementation

- **Modifier-click:** the central attention host interpreted the event directly, while
  occurrence buttons dispatched `editor.expand` without the modifier intent. All corner
  buttons now use that action with a transient `maximize` boolean. The existing save,
  captured occurrence, native incarnation and view-lifetime guards complete before the
  shared camera-preserving maximization owner runs. Failed/stale saves cannot maximize
  a replacement. Existing central URL guests retain their accepted route.
- **Growing parent/Facets areas:** their special toolbar rule moved chrome into the
  document, reserved 36 px and allowed title/buttons to wrap. Clipping the entire overlay
  also forced chrome into the aperture. Document/frame clipping is now separate from
  the existing external toolbar. Its title ellipsizes on one row, its minimum width comes
  from the actual buttons, and its position clears the canvas tools/footer. The native
  document keeps its full dimensions and owning leaf/API. Clipped transparent regions
  do not intercept graph input.
- **Media:** central and occurrence hosts share native file eligibility. The second,
  Markdown/PDF-only check in occurrence restoration is removed; restoration uses the
  host predicate and keeps its native-incarnation guards. Images and audio/video files
  use the existing native `WorkspaceLeaf.openFile` path, with no custom decoder/player.
  Media formats follow [Obsidian's supported formats](https://obsidian.md/help/file-formats).
- **File properties:** the mounted graph publishes its open editor file, otherwise its
  actual root/center, to the existing App/native follower. Graph or Properties focus does
  not replace the editor target. Collapse restores root/center following. The adapter's
  pinned/grouped/hidden pane and stale-load safeguards remain. Native unsupported metadata
  for attachments stays native; this adds no attachment property store.

## Verification

- Node 22.22.2, actual installed Obsidian typings and production build pass.
- **302 focused tests pass**: actual modifier transport and shared actions, all native format
  eligibility, failed/stale save admission, Properties ownership/repair, viewport/area
  geometry, Compass occurrences, real thought DOM/rename/drag, native editor defaults,
  action focus routing and linked-document navigation.
- **132 core tests** and architecture checks pass: 230 migrated roots, 422 reachable files,
  zero violations; shared numeric-control owner audit passes.
- Official `npm run lint:obsidian` and final touched-source scanner pass; `git diff --check`
  passes. No new user-facing copy or localization keys.
- Native macOS/Obsidian **1.15.0**, installer **1.14.0**, existing disposable
  `kplex-test-small`: **15 new acceptance cases** pass. Normal/modifier roots in Compass,
  Mind Map and Facets; actual PNG/H.264 MP4 decoding; maximized media roots; full and
  oversized Excalidraw parent/Facets plus Mind Map child hosts; hit-testing every recovery
  button; same native leaf/API; editor Properties and collapse fallback; Markdown
  scale/fixed behavior through the new clip wrapper.
- Existing native area-growth checks pass in all three views: real dirty Markdown buffers,
  cursor retention, 920×700 resize, real overflowing-area document clipping and native
  save/close. The clipped body retains its buffer/caret while the overlay's chrome stays
  unclipped. Existing editor/PDF/drawing/revisit/
  passive-navigation/popout regression passes seven cases against the same exact build.

Source/artifact and native driver receipts: [receipts](editor-node-followup-245-receipts.json).
Representative native images: [Mind Map parent](editor-node-parent-245-native.png),
[oversized Facets editor](editor-node-facet-oversized-245-native.png).

Full indexing verification is intentionally not repeated for these presentation/native-ownership
changes. Indexing, parsing, graph semantics, source acquisition, scheduling and storage owners
are unchanged. The preceding `ad9bf40` checkpoint has the passing full suite and default
20,015-owner proof in [its record](attachment-metadata-gates-245-2026-10-31.md).

## Reproduction and limits

The new native driver requires the three explicit Small-vault identity variables, a fresh
`KPLEX_HOST_REPORT_DIR`, the existing Excalidraw companion, and an offline MP4 fixture.
For example, generate a one-second black fixture locally:

```text
ffmpeg -f lavfi -i color=c=black:s=32x32:d=1 -an -c:v libx264 -pix_fmt yuv420p -movflags +faststart /tmp/kplex-editor-followup.mp4
KPLEX_EDITOR_VIDEO_FIXTURE=/tmp/kplex-editor-followup.mp4 node scripts/testing/obsidian/editorNodeFollowup.mjs
node scripts/testing/obsidian/editorAreaGrowth.mjs
node scripts/testing/obsidian/editorMobileNavigation.mjs
```

The first native runs exposed the duplicate media gate, narrow/offscreen toolbar collapse and
Find/Footprints covering recovery buttons. Those failures led to the shared-policy and chrome
fixes; final acceptance retains the decoding, no-wrap, hit-test and same-native-host assertions.
An extracted renderer fixture also needed its real Compass occurrence-key/count dependencies
after images became eligible; its style-cache assertion remains unchanged and passes.

The historical M0 `occurrenceEditors.mjs` probe was also attempted. It stops before its
clipping check because it still expects switching between occurrences to be refused for
capacity, whereas save-before-switch already predates this follow-up. Its contract was left
unchanged; it is not counted as passing acceptance. Actual scroll clipping and dirty input
are verified by the current production-view `editorAreaGrowth.mjs` probe instead.

These are desktop macOS native checks with synthetic button activation; physical touch and
Windows codecs are not established. No personal-vault deployment or write, release, merge or
issue closure is included.
