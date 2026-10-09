# Fullscreen and Zen modes — issue #83

## Reviewed implementation

Branch `fullscreen-mode`, base `d137338310b62cc121b3cabd90e982a44540ef6f`; uncommitted implementation of [issue #83](https://github.com/zsviczian/kplex/issues/83). Structural checkpoints C15–C26 remain paused.

The native view owns independent session-only display modes. Desktop fullscreen temporarily places the same mounted content node in a document-owned viewport overlay, retaining the exact original insertion position and native workspace geometry. The overlay uses Obsidian theme variables and stays below native popovers/dialogs. Zen hides the toolbar/pins, Find and history while keeping bottom-right controls available. Unified actions supply both controls and optional shortcut/command configuration; no default shortcut is introduced.

Ordinary mode toggles retain the graph root and camera without automatic Fit. The native view releases workspace/pagehide callbacks and restores owned DOM on active-leaf changes, close/unload and cross-document migration. Migration unmounts the source React root synchronously before adopting fullscreen content into the moved pane. Existing migration remount behavior remains; same-root preservation applies to ordinary toggles. Bare graph Escape follows existing transient/native/custom binding priorities, then exits Zen before fullscreen.

## Exact verification

Node22.22.2, Darwin23.5.0, Obsidian1.14.4 (installer1.14.0), installed Obsidian1.13.0 declarations. Disposable vault `kplex-test-small`,73 Markdown files. Frozen310 build inputs SHA256 `aa344052491dd1944e2bb3c537090fa9215b1407bf7b75d62ec28b1f4ee17383`; native drivers are hashed separately.

- Full `npm run verify:obsidian` passes7 architecture,69 core,421 general,20 UI/motion,333 portable-source and410 Chromium tests, indexing fixtures, repository Obsidian lint, real typecheck and production build.
- Installed artifacts match the build exactly; native startup/render smoke has no captured errors.
- Focused offline runs108/108 and38/38 overlap and are not additive; root relationship-action fixture check passes46/46.
- First full attempt failed because an extracted camera callback fixture lacked the new display-resize ref. The fixture now supplies that ref; original navigation/scale assertions are unchanged. No production correction was needed.

| Artifact | SHA256 |
| --- | --- |
| `main.js` | `f163cd020cf5c9fa8e1eab9b4d882b86a42bbfd4e37b4bf344f0bf8ca5567d3a` |
| `manifest.json` | `19799fff9ae459130d707901e7c0d98b3e14a8567881a393f07d457c2fa8ec1c` |
| `styles.css` | `05c59fe68c56784fb3e727056b7e27aee65f7f595d7145e4710b75f660dacc55` |

## Native acceptance

The maintainer tested the feature, reported “It works as expected,” and explicitly authorized commit/push/PR/merge on2026-10-09. Delivery is accepted on that manual report plus the passing full verification/build/native render smoke. The report does not enumerate platforms or every lifecycle case; no additional automated display-mode or physical-device cases are claimed. The dedicated driver remains available for later regression runs. Attempt1 stopped at the locked-session prerequisite before any display scenario. Configuration bytes and native workspace baseline were restored; no native errors were captured. This attempt is not feature acceptance. Independent final audit confirms73 notes,0 owned files/controllers/dialogs/sessions/guards/overlays, restored desktop mode and1440×875 window bounds (minimum200×150), main window/document active and exact build/installed artifact hashes. Settings17,104bytesSHA91752945… plus enablement/hotkeys match the fresh pre-staging backup byte-for-byte; no reload follows this readback.

The prepared, unexecuted native scenario suite is designed to record trusted Electron input, four independent combinations with open/closed sidebars, same graph/camera/selection/center/history, original pane geometry/workspace serialization, heavy-entry-point counts, explicit Fit, Escape/palette stacking, active-leaf changes, two-way popout migration, view close and plugin unload/reload. Tablet/phone checks use actual presentation classification and restore emulation/window geometry/configuration.

## Limits and remaining manual coverage

Fullscreen is explicitly desktop-only. Zen tablet/phone emulation would prove layout and availability, not physical touch activation or the mobile WebView; that dedicated run did not execute. Trusted renderer input is not physical keyboard, screen-reader or paint-latency acceptance. Check Zen's toggle and toolbar restoration once on a physical phone/tablet; no indexing/scheduling performance claim is made.
