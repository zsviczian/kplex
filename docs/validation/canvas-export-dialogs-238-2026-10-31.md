# Export dialog follow-up — PR #238

The [shared native-controls follow-up](canvas-export-native-controls-238-2026-10-31.md) removes filename fields and export-specific CSS, and changes successful Copy to close with an Obsidian Notice. The evidence below describes the preceding UI.

## Changes

Runtime checkpoint: `d8f6e8a379f6eb8bc488b8040bc35f0dd407968b`, on the existing `2026-10-30-canvas-image-export` branch.

Both native export dialogs now leave space between their final filename setting and action footer. The scrolling body reserves room at the right edge; the scope dropdown also reserves space for its chevron. The footer reuses the existing wrapping action-row layout and separates button icons from their labels.

PNG export adds **Transparent background**, with a checkerboard preview. It removes the canvas background and Compass tint; node, connector and Facets region styling remains intact. The reusable raster service accepts the option without reading the live canvas again. The toggle is disabled during a pending save/share handoff.

Completed captures now retain their frozen presentation when live scene or theme settings refresh. Changing scope, scale or background reuses that capture and does not incorrectly disable output. Capture-time scene/style/camera/scroll checks remain strict; cancellation, canvas teardown and owning-window migration still retire output. The help text explicitly describes the opening-time capture. This intentionally replaces the previous rule that a CSS change retired already prepared output.

Markdown help says **Excalidraw MindMap Builder**. **MindMap Builder** is a native anchor to `https://community.sketch-your-mind.com/mindmap`. All eight locales include the new strings and localized link placement. Markdown formatting, link generation and export destinations are unchanged.

## Reproduction and focused checks

The previous deployed artifact (`main.js` SHA256 `470cb303c547f1b5885fa456ddf2aee467165fe4b3fbe5debefa7b1bd0050ae4`) reproduced the reported failure in disposable Small: change `showCrossLinks`, publish presentation, then select viewport and whole canvas. The original guard rejected the frozen snapshot as changed. Merely publishing presentation without an actual setting change did not reproduce it.

Focused command:

```sh
node --test --test-concurrency=1 tests/canvas-image-export.test.mjs tests/canvas-image-export-browser.test.mjs tests/localization.test.mjs tests/mindmap-markdown-export.test.mjs
```

All 50 tests passed, zero failures/skips. A separate rerun of the final browser pixel fixture passed all nine checks. It decodes actual PNGs for both scopes, toggles opaque → transparent → opaque, verifies background alpha 255 → 0 → 255 and unchanged opaque blue node pixels. Scanner and production build passed during development; the final full verification is recorded below.

## Exact-build native acceptance

Host: macOS Darwin 23.5.0, Node 22.22.2, Obsidian 1.15.0 / installer 1.14.0. Only the prepared disposable `kplex-test-small` vault receives synthetic fixtures. [Native receipt](canvas-export-dialogs-238-native-2026-10-31.json) records exact source, driver and artifact hashes.

`npm run verify:obsidian:canvas-image`: **27 cases passed; cleanup passed**.

- All 18 Compass/Mind Map/Facets × dark/light × 50/100/200% zoom combinations pass real trusted Copy PNG and native DownloadItem output. Saved bytes equal the prepared preview. Nine combinations use transparent output and verify zero alpha in encoded background pixels. Each interval records zero reads, parses, source acquisitions, index rebuilds and semantic refreshes, with unchanged source canvas state and published semantics.
- A presentation change after capture followed by viewport → whole canvas retains byte-identical output and enabled actions. A CSS refresh after completed capture also preserves output; a CSS change during unfinished capture still rejects it with disabled output.
- Measured filename/footer gaps are 20 CSS pixels in both dialogs. The PNG dropdown has an 8-pixel body inset, adequate chevron padding and no horizontal body overflow. Native screenshots of both dialogs were visually reviewed after allowing a fresh frame; the Markdown product label and exact anchor target also pass DOM assertions.
- Existing native toolbar/menu/palette, popout copy/save ownership, cancellation, collapsed/filtered bounds, explicit viewport dimensions, unsafe filename rejection and editor text/selection/scroll/binding preservation continue to pass.

The first development run completed every functional case but its final CLI poll hit the unchanged 15-second transport deadline; cleanup succeeded. It is not counted as passing overall acceptance. The final exact-build rerun passed normally without changing production timing or test deadlines. The first Markdown screenshot was a stale compositor frame; the driver now waits briefly before diagnostic screenshots. PNG export itself does not use native screenshots.

Raw logs and synthetic screenshots: `/private/tmp/kplex-export-polish-native-final`. Development focused logs: `/private/tmp/kplex-export-polish-focused.log` and `/private/tmp/kplex-export-polish-browser.log`.

## Full verification and deployment

The maintainer explicitly requested focused validation rather than a full indexing run for this follow-up, then requested immediate deployment. The full run was stopped during its 20,015-owner persistence fixture. Completed groups passed with zero failures/skips: architecture 9, core 130, main 1,711, browser 428 and source 357. The IndexedDB group and final aggregate verifier were not completed and are not claimed as passing. Only this run’s verified process group and owned temporary Chromium profile were stopped/removed.

Deployment uses the exact artifact from the passing 27-case native receipt and production build. No additional clipboard-alpha experiment was run; native PNG clipboard dimensions, preview alpha and exact saved bytes are covered by the completed native acceptance. The authorized reference-vault deployment completed successfully without backups. Only changed `main.js` and `styles.css` were atomically replaced; the unchanged manifest was skipped. Installed hashes match the native receipt. Settings and community-plugin enablement bytes are unchanged, the captured K-Plex view was preserved, both export commands are registered, startup is complete and the temporary deployment controller is removed.

Deployed `main.js` SHA256: `08010fadf53b00ca2383d08f0969102a6010366135de9fefdfe71981bdffd3ee`. Deployed `styles.css` SHA256: `03e90f5b0efe526dcb7684d7978df39774cfe795e7d9cb3cad183d44f7e9196d`.

## Remaining acceptance

The existing whole-scene internal-scroll limitation and resource budgets remain unchanged; see the [implementation contract](../proposals/CANVAS_IMAGE_EXPORT.md). Minimum-host 1.13, native Windows/Linux output, physical mobile sharing/touch, OS destination/overwrite interaction and arbitrary community-theme effects remain separate acceptance environments. The native test's owned DownloadItem handler selects its synthetic destination. macOS native output does not certify other hosts.
