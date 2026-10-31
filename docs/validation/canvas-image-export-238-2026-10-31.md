# Canvas image export — PR #238

## Implementation

The toolbar, canvas context menu and stable published command `kplex-export-canvas-png` open the same PNG preview for Compass, Mind Map and Facets. Copy and native save use the prepared image. Scope and resolution changes reuse immutable captured presentation, preserving camera, navigation, selection, scroll, editor and per-canvas sessions. All eight locales include the new copy.

The [implementation contract](../proposals/CANVAS_IMAGE_EXPORT.md) records service ownership and limits. The [native feasibility gate](canvas-image-export-238-feasibility-2026-10-30.md) preceded implementation: actual Chromium HTML/SVG rasterization succeeded at different views/themes/zooms, including off-camera content, fonts and a real bitmap. No second graph projection, indexing pass, layout engine, node renderer or public API was introduced.

## Focused evidence

Host: macOS Darwin 23.5.0, Node 22.22.2, Obsidian 1.15.0 / installer 1.14.0, prepared disposable `kplex-test-small`. [Native receipt](canvas-image-export-238-native-2026-10-31.json) records artifact, source and driver hashes. Local raw logs/images are under `/private/tmp/kplex-image-timeout-native`; they contain owned synthetic content only.

- 18 real UI copy/save combinations: Compass, Mind Map, Facets × light/dark × 50/100/200% camera zoom. Native PNG clipboard dimensions match the preview; real DownloadItem output bytes equal the preview exactly. World-scene dimensions remain unchanged across zoom levels. Each isolated interval records zero Markdown reads, parses, source acquisitions, index rebuilds and semantic-settings refreshes, with the same published semantic stamp.
- Native toolbar, canvas context menu and command-palette execution pass. Independent native popout copy/save uses its actual owning document/window and `Other.png`, preserving both canvases. Preparation cancellation leaves no modal or source-state change. An actual embedded Markdown editor retains its identity, text, nonempty selection, scroll, binding and camera after export.
- Final native scope/guard acceptance passes: collapsing Alpha removes its constructed Deep descendant and reduces PNG width; a Bravo quick filter constrains both the actual scene and image bounds. Explicit viewport scope uses exact source viewport dimensions without changing camera. An invalid filename is rejected. A CSS change retires prepared output and disables copy/save with stale feedback. Together with the matrix, UI, popout, cancel and editor checks, all 24 native cases pass; cleanup passes.
- Two supplemental native configurations pass on the same corrected artifact: compact balanced and left-facing Mind Maps (40/12 spacing) in owned popouts requested at 540 × 620. Their PNGs are 1,368 × 376 and 1,064 × 680 pixels, byte-identical to the visually reviewed pre-correction outputs. Native copy/save, zero source/index work and cleanup pass in each. Their variant-driver hashes and cases are included in the native receipt.
- Nine pure checks pass, including deterministic early-timeout ownership: finite raster budget, immutable Blob clipboard gesture/retirement, deadlines and cancellation/timer cleanup, safe filenames, owning-window clipboard, desktop download URL cleanup and mobile sharing capability rejection.
- Eight real-Chromium checks pass during development: actual off-camera HTML/SVG pixels, loaded bitmap, Compass polygon order, visible internal scroll clip, explicitly separate viewport, immutable snapshot after source removal, zoom normalization, limits/cancel/teardown, omitted opaque iframe content, external-font no-fetch, independent document ownership and cooperative large-DOM traversal. An 800-card fixture yields browser tasks, stays below element/string caps and satisfies the existing 250 ms responsiveness assertion. This is a bounded synthetic check, not a measured 20,000-file-vault performance claim.
- Native exported PNGs were visually reviewed for all three built-ins during feasibility and implementation, including corrected Compass direction order, thumbnails, connector arrows, card text and Facets regions/guides. Direct native pixel comparison results and the single stale-compositor sample are recorded in the feasibility note.

## Full verification

Full `npm run verify:obsidian`: passed. Architecture 9, core 130, main 1,711, browser 427, source 357 and IndexedDB 855 tests all pass, with zero failures or skips. Scanner and production build pass. Exact-build staging hashes match the built artifact; native smoke opens K-Plex with no captured JavaScript errors. [Full receipt](canvas-image-export-238-full-verification.json).

The successful verifier ran from 2026-10-31T00:21:34.025Z to 2026-10-31T00:46:47.707Z. It verified clean commit `0f10137`, including the timeout-owner correction and its deterministic regression. Final `main.js` SHA256 is `470cb303c547f1b5885fa456ddf2aee467165fe4b3fbe5debefa7b1bd0050ae4`. All 24 final native cases pass against this exact fully verified/staged artifact, with cleanup passed. Linux CI for the corrected runtime is tracked by [the runtime verification run](https://github.com/zsviczian/kplex/actions/runs/41149737146); its current status is reported on the PR.

## Timeout ownership correction

Runtime CI on `6b13883` passed, but the receipt-only follow-up run exposed an early native timer callback: after 14.8 ms of a 15 ms test timeout, wall-clock comparison classified the timeout as source retirement. Timeout callbacks now explicitly retain timeout ownership before aborting; both synchronous checks and rejected waits report the limit reason. A deterministic regression invokes the callback before the wall-clock deadline and verifies the exact limit reason and cleanup. All nine pure export checks and the real build pass without extending any deadline or weakening an assertion. Full verification and all 24 exact-build native cases pass for this correction. The preceding artifact’s successful CI and failed receipt-only follow-up remain linked on the PR as development history.

## Development findings and corrections

Visual native review found Compass polygon children had been cloned in reverse order; production traversal now preserves native DOM order, with a browser regression assertion. The first browser run also exposed two harness defects (CSS whitespace comparison and the wrong cleanup method); both were corrected, the exact owned Chromium/server processes and profile were retired, and the subsequent suite passes.

Early popout probes sometimes exported before native document migration/initialization settled. The final fixture explicitly waits for the actual popout document, ready view, loaded fonts and settled semantic preparation, then tests the unchanged production ownership guards. Temporary boolean/mutation diagnostics were removed from source and bundle before final acceptance. The scanner caught an untyped cross-realm error-name check; the catch binding is explicitly `unknown`.

The first full run passed architecture, core and scanner checks, then stopped with 1,709/1,710 main tests passing. The extracted display-toolbar fixture did not define the scene/failed-state values newly read by the export button. Its narrow fixture now supplies those values; all 23 focused display/export checks pass. An initial sandboxed browser invocation could not bind its loopback server; rerunning with the required local-test permissions passes without changing assertions or deadlines.

The synchronous feasibility cloner's transport-timeout experiment is retained as a failed scratch method, not counted as production acceptance. Production capture yields bounded traversal batches and owns cancellation, deadlines, streams, decoded image/canvas cleanup and preview URLs.

## Limits and remaining acceptance

Whole canvas includes the currently painted scene outside the viewport. It retains internal scrolling areas' current visible clip rather than unrolling hidden rows, and the UI warns about hidden scrolling content. Filters and collapsed branches remain in effect. This limitation is explicit in the UI and implementation contract.

Large images reduce resolution to fit an 8-million-pixel / 8192-side desktop budget (4 million on mobile), without changing scope. Capture/string/font budgets and 20-second capture/raster lifetimes bound work; synchronous browser rendering calls still cannot be preempted, and this is not an exact peak-memory guarantee. Programmatic/unreadable fonts can fall back. Unavailable/tainted/unloaded bitmaps and opaque embeds/media are omitted. Warnings disclose these cases. No remote font acquisition or opaque document extraction is attempted.

The desktop download handler selects an owned temporary destination, proving native handoff and exact bytes; it does not automate the OS destination/overwrite picker. Minimum-host 1.13, Windows/Linux native output, physical Android/iOS share sheets/touch and arbitrary community-theme effects remain unvalidated.

Prioritized remaining manual checks: (1) destination/overwrite flow on the minimum supported desktop host, (2) physical Android/iOS copy/share capability and cancellation, (3) complex community-theme/custom-font presentation in main and popout windows. None replaces the automated checks available on this host.
