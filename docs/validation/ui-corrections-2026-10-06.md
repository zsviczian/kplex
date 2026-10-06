# Plex UI corrections — validation

Implementation and automated acceptance complete; reviewable changes remain uncommitted. No commit, push, PR or release was performed for this UI batch.

Branch `ui-improvements-batch-2`, base `5091f88abb69f660c900fed1dd0d41c7b738af81`. Existing U2 feature changes remain uncommitted. This follow-up changes presentation and gesture lifetime inside their existing owners; C15–C26 remain paused.

## Delivered behavior

- Parent columns support 1–3, including persisted profile sanitization. Friends, challengers and siblings follow parent/center width. Horizontal density 3 touches adjacent area edges; 4 permits up to 5% parent-area-width overlap, capped by thought-body clearance. Lower values leave positive gaps. Child columns and vertical density do not change lateral horizontal anchors.
- Explicit React layout drafts survive unrelated prepared-settings publications and retire only after their exact save completes. Superseded node animations are cancelled before geometry measurement; finished effects retain no transforms. FLIP offsets account for camera scale. Configuration gestures use direct layout without node animation or auto-fit. Expanded mini viewports stop at their band's bottom; actively dragged thoughts do not retain detached mini strips.
- Relationship gestures ignore obsolete child capture loss while the viewport still owns that pointer. Shared draggable dialogs release document interception on matching capture loss or owning-window blur. Real Chromium cases prove later graph pointer moves remain available.
- The lower-left `sliders-horizontal` toggle starts closed. Opening mounts four sliders; closing removes them from the rendered DOM. Find's filter button toggles its own filter off, restores the prior Quick Filter/layout, supports replacement terms and allows clearing with a blank Find query. Manual filter edits retire Find ownership.

## Reproduction and retained failures

The original current-config `Note A.md` small-vault trusted slider probe sampled 30 movements at 240 ms intervals across both axes. Camera scale differs between the separate before/after runs (0.717 versus 1) but remains fixed within each; this comparison establishes effect retention and input continuity, not equal rendered extents or paint timing. The U2 build retained up to seven effects per node (89 total) and transient scaling; several successive input positions retained old values. The corrected build's equivalent probe has zero node effects, stable 12.4 px font and camera, and monotonic values at every position. These are observable geometry/input outcomes, not a compositor paint benchmark or proof of every reported white-line artifact. Settings bytes were restored.

Trusted native body and gate probes crossed Parent and Child bands before the fix without reproducing the exact reported stall. Portable regressions do reproduce obsolete capture loss and interrupted-dialog interception; both corrected lifetimes pass. The isolated friend's larger appearance is consistent with retained animation scale, but its specific reported sequence was not reproduced.

The first native acceptance trial reached the new parent3 assertion; its oracle incorrectly counted only `Parent-*` notes, then the topmost partial row. Captured rectangles show a saved parent3 profile and three nodes in each complete row, with two in the farthest row of 17 parents. The corrected oracle measures the complete row nearest the center, because unfiltered parents grow upward.

Retries using the same fixture paths also inherited retained exact-pair mutation evidence: a target appeared already linked to the gate although the recreated Hub frontmatter lacked that link. Pointer capture and connector movement were present, and the hit target was correct. Each driver run now creates a fresh uniquely named owned fixture folder. No production source owner or guard was changed, and this UI acceptance does not claim to fix repeated delete/recreate endpoint evidence lifetime. Failed trials and successful cleanup are preserved in the evidence JSON.

## Verification

Exact-build native acceptance passes **56/56**: 50 desktop workflows and six desktop/tablet/phone-emulation checks. The driver verifies parent1–3 complete rows and current-surface saved profiles, H3 touching, H4 overlap bounded by 5%, child1→7 lateral invariance, default-hidden/unmounted configuration, Find second-press off/replacement/blank-query off, and 30 slow held-pointer samples at 240 ms intervals with animation speed 1. Every sweep sample has zero node animation effects, stable geometry/camera and monotonic values; latest profiles persist and full semantic rebuild delta is zero. Device viewports are observed at 1200×875, 900×875 and 390×844; four sliders fit when shown and begin absent. Native run spans 04:39:03–04:40:10 UTC, without CLI timeouts. Settings/enablement bytes, owned notes/views/controllers/wrappers, mobile mode, bounds and throttling restore.

Independent corrected-build body and gate crossing probes each pass six actual pointer samples after the broader acceptance run. Body capture/font/geometry remain stable; gate capture and distinct connector positions remain present. They are separate probes, not additional entries in the 56-scenario count.

Focused geometry/profile/localization/environment, 36 relationship-action cases, 16 actual Chromium UI/animation cases, installed-type checking and scoped official lint pass. Final `npm run verify:obsidian` passes architecture7/core67/Node225/UI16/portable322/actual-IDB294, no skips, all 24 production settings scenarios, installed Obsidian declarations, real build and exact installed command/DOM/error smoke. Scanner: zero errors and one retained `Workspace.activeLeaf` deprecation warning at main.ts:3134. Aggregate spans 04:42:18–04:52:04 UTC; browser lane526.815s is verification execution, not product latency. Node22.22.3, Obsidian1.14.4/installer1.14.0, installed declarations1.13.0, TypeScript5.9.3, React/ReactDOM19.3.0 and official scanner0.4.2. All269 frozen runtime/test/build inputs match at closeout, and final rebuilt/staged/native-tested artifact digests match exactly.

The unchanged-limits 20,015-owner actual-IDB case passes canonical/count/cancellation checks: API publication160,820.3ms, sampled heap454,257,024 bytes, estimated combined retention685,201,826 bytes. This is functional scale evidence, not a native startup, paint or mobile performance benchmark. Final passive audit finds13 original Markdown notes, Note A center, original H4/V4/parent2/child3 profile, desktop mode, hidden configuration with zero sliders, ready index, no pending semantic/hydration/build owner, no test fixtures/controllers and original throttling.

[Exact evidence](ui-corrections-2026-10-06.json) preserves successful runs, probes, failed trials, full-suite counts, identity reconciliation and cleanup. Only disposable `kplex-test-small` is used. No native 20k timing or personal-vault deployment.

Exact native artifacts:

| Artifact | SHA-256 |
| --- | --- |
| main.js | `877bec62633123130fc0ca6bd893f212e33639173a8716a3a0fa4d3dad508df8` |
| manifest.json | `e3bb9a35215af97f6a3394cf7fc8f7d2142bae06de94bb112fef5a05819cda62` |
| styles.css | `1414b46271065e0b42a75e7a527c05759e0574e02edd732db1a645abca18f13b` |

The first aggregate stopped at the historical scene snapshot. Its exact diff contains ten lateral `x` values only, matching the requested parent-width policy. Those explicit golden coordinates were updated; every semantic page/declaration/neighborhood/search, edge/style and other coordinate remains unchanged. The complete indexing fixture then passes. This is an intentional product expectation update, not relaxation of the semantic oracle.

## Remaining physical checks

1. Repeat the original failed-link drag sequence, then cross both Parent and Child bands; confirm the body/connector follows the pointer and node sizes remain stable. Its exact stall has not been reproduced by automation.
2. On physical Android/iOS, toggle configuration, slowly adjust both density axes, turn Find filtering on/off and interrupt/restart a filter-header drag. Desktop device emulation proves layout/routing, not native touch/WebView behavior.
3. Drag a real File Explorer note onto the center and each relationship area. Existing DOM DragEvents use the actual host payload/handlers, but do not establish real OS drag delivery.
