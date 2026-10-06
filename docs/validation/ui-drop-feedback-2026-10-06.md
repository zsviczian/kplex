# Configuration styling and drop-area feedback — validation

Implementation and automated acceptance complete. Changes remain uncommitted on `ui-improvements-batch-2`, base `5091f88abb69f660c900fed1dd0d41c7b738af81`. C15–C26 remain paused.

## Delivered behavior

The lower-left configuration button uses Find/zoom's normal, hover, sizing and pressed styles with equal selector specificity, including Obsidian's light theme. Theme-accent area frames preview the existing relationship action for body, gate and eligible File Explorer drags. Body feedback uses existing relink hysteresis; gate feedback retains its fixed role or the inverse hovered gate role. Pinned/history targets keep their chip feedback. Preview frames stay behind thoughts and consume no pointer or drop events.

External previews clear on leave, outside dragover/drop, dragend, window blur, navigation and unload. Child-to-child dragleave does not blink the highlight. These document/window listeners follow the owning viewport and remove themselves on cleanup. Existing relationship routing and write authority are unchanged. The maintainer qualitatively accepts the previous drag and filter fixes.

## Native acceptance

Exact-build acceptance passes **58/58**: 52 desktop workflows and six desktop/tablet/phone-emulation checks, no captured JavaScript errors, no CLI timeouts, settings/enablement/fixtures/views/controllers/device geometry/throttling restored. Normal and trusted hover styles match for configuration, Find and zoom. Four external relationship-area previews and commits pass; all five cancellation/outside boundaries clear feedback without consuming delivery. Trusted gate preview and release cleanup pass. Separate body/gate probes each pass six captured-pointer samples across Parent/Child bands, with stable fonts and continued movement; body previews switch between those roles and cancel clears them.

## Retained failures and corrections

- Initial browser body-preview coordinates extended outside the headless viewport; corrected visible points pass the same production callback assertions.
- Initial native styling exposed the host default button colors overriding the class-only selector. Matching the shared button selector specificity fixes the actual product behavior.
- A native run saved its first parent link but its composer did not close after concurrent publication invalidated exact-pair preparation. The harness now observes publication/source/maintenance revisions across multiple quiet samples and scheduler checkpoints, preserving all production authority guards. The corrected run completes every relationship workflow.
- One corrected-build run passed all 52 desktop workflows but failed strict error capture on an Obsidian `webContents.getZoomFactor` exception. Cleanup passed. An unchanged-build clean retry passes all 58 checks with no captured errors; this does not claim a fix for that host exception.

## Full verification

Full `npm run verify:obsidian` passes architecture7/core67/Node225/UI16/portable322/actual-IDB294, no skips; all 24 production settings cases, installed types, real production build and exact installed smoke pass. Scanner: zero errors and one retained `Workspace.activeLeaf` warning at main.ts:3134. Aggregate spans 2026-10-06T05:51:49.936Z–2026-10-06T06:01:42.988Z; the browser lane takes532.813s, which is test execution rather than product latency. The unchanged-limits 20,015-owner case passes exact publication/count/cancellation checks; API publication164,066.7ms and sampled heap435,667,281 bytes are functional fixture measurements, not native startup/paint/mobile benchmarks.

All269 runtime/test/build inputs match their frozen digests. Final rebuilt, staged and native-tested artifact hashes match exactly. Passive audit finds13 original Markdown notes, Note A center, desktop/ready, current saved H4/V4/parent2/child7 profile, zero configuration ranges/drop previews/fixtures/controllers/pending owners, and original throttling. The initial closeout oracle incorrectly reused U3's historical child3 setting; it now checks the current persisted profile, whose bytes the U4 driver restored. No historical preference is reapplied.

[Exact evidence](ui-drop-feedback-2026-10-06.json) includes accepted runs, probes, failed trials and identity/cleanup reconciliation.

| Artifact | SHA-256 |
| --- | --- |
| main.js | `1d066a3d6eda882f1cc0150f55dc8c1cf9e64afe069d715457f25734aa06831d` |
| manifest.json | `e3bb9a35215af97f6a3394cf7fc8f7d2142bae06de94bb112fef5a05819cda62` |
| styles.css | `46b35a27dcad479e55504f61557ccbbf179bb786e04a8e1bcda9df61fa99decb` |

## Manual coverage

Validate real File Explorer drag delivery onto each highlighted area, and touch-driven body/gate feedback on a physical Android/iOS device. Desktop emulation and real host-payload DOM DragEvents establish layout/routing rather than physical touch or OS drag delivery. No native 20k-vault performance measurement or personal-vault deployment is claimed.
