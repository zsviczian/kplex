# Challenger/center drop preview and common controls — validation

Implementation and automated acceptance complete. Changes remain uncommitted on `ui-improvements-batch-2`, base `5091f88abb69f660c900fed1dd0d41c7b738af81`. C15–C26 remain paused.

## Delivered behavior

Relationship drop previews render as pointer-transparent viewport overlays above camera panels. Clipping keeps their border visible at the viewport edge; a subtle theme-accent fill lights the area without changing thought rendering or capture. Challenger feedback follows the same existing role decision as its eventual drop. External file drops onto the center or navigation background preview the center; relationship gestures retain their original action.

Area filters, Sidecar controls, the detached Sidecar unfold button and the central-editor toolbar share Search/Find, configuration and Zoom button dimensions, colors, borders, hover and focus rules. Toggle controls share an accent state and accessible pressed state. Mobile sizing follows the existing toolbar target size. Thought gates and native embedded-editor controls retain their specialized interaction shapes.

## Evidence

Focused real-Chromium routing and CSS checks pass, including center/background/unindexed physical-file navigation, all four relationship roles, partially/fully clipped previews, opaque panels, pointer transparency, light/dark style parity and cleanup. Installed Obsidian types, scoped lint and the production build pass.

All 52 native desktop workflows pass on the exact installed build. Common normal/hover styles pass for all four area filters, Sidecar, Find, configuration and Zoom; editor toolbar parity passes in normal/maximized views. Actual host-payload DOM drops preview center navigation and all four relationship commits. Five cancellation/outside boundaries clear feedback. A separate six-point trusted body probe crosses Challenger, follows its pointer with stable 12.4px font/capture and clears on cancel. The clean separate device-emulation matrix passes6/6 with settings, bounds and desktop mode restored.

## Retained corrections and failures

The prior build created a Challenger preview behind camera panels with a partly clipped border; this supports the layering correction without claiming every reported user gesture was reproduced. The focused unindexed-center test initially conflated physical file availability with graph materialization; its host double now models those separately.

The desktop run completed 52 workflows and five emulation checks before the final phone web-routing activation hit a CLI timeout; cleanup passed and no JavaScript errors were captured. A device-only retry passed all six checks but lost a read-only cleanup response, leaving mobile mode and phone bounds. Desktop mode/bounds were explicitly restored. The driver now retries only that read-only state query on ETIMEDOUT and records its baseline. A clean unchanged-production-build device run passes all six checks and complete restoration, without timeouts. No mutation, production action guard or deadline was weakened.

## Full verification and restoration

Full `npm run verify:obsidian` passes architecture7/core67/Node225/UI17/portable322/actual-IDB294, no failures or skips; all 24 production settings scenarios, installed types, the real production build and exact installed smoke pass. Scanner: zero errors and one retained `Workspace.activeLeaf` warning at main.ts:3134. The browser lane takes 520.641s, a test execution duration. Its unchanged-limits 20,015-owner publication/count/cancellation fixture passes; this is functional coverage, not a native startup, paint or mobile benchmark.

All 270 frozen runtime/test/build inputs match. Rebuilt, staged and native-tested artifact digests match exactly. Final audit confirms 13 original notes, Note A center, desktop/ready, restored H4/V4/parent2/child4 profile, original bounds/throttling, no configuration sliders, drop previews, owned fixtures/controllers or pending graph owners.

[Exact evidence](ui-controls-and-drop-preview-2026-10-06.json) retains the desktop run with failed emulation continuation, failed cleanup retry, clean separate device acceptance, before/after drag probes and final reconciliation.

| Artifact | SHA-256 |
| --- | --- |
| main.js | `ea87ebd701351ea541b68655a29d30c51887c8a540b90b7a374fc0db059284c2` |
| manifest.json | `e3bb9a35215af97f6a3394cf7fc8f7d2142bae06de94bb112fef5a05819cda62` |
| styles.css | `acebdc00bc5f00d53186883cf63add7283ec4707c75e01546845429524a7f62b` |

## Manual coverage

Actual OS File Explorer drag delivery onto the center and Challenger remains a manual check; expect navigation and the Challenger composer respectively, with visible previews. Physical Android/iOS touch feedback remains separate coverage. Desktop emulation and host-payload DOM events establish layout/routing rather than physical touch or OS drag delivery. No personal-vault deployment, native 20k performance test or repository publication was performed.
