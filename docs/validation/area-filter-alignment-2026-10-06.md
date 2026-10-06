# Area filter right-edge alignment — validation

U10 implementation and automated acceptance complete. [Exact evidence](area-filter-alignment-2026-10-06.json) retains tested inputs, artifacts and restoration. Changes remain uncommitted on `ui-improvements-batch-2`; C15–C26 remain paused.

The shared toolbar's right inset changes from 9 px to zero. Each filter button's outer right edge matches its scroll area's outer right edge. The open input extends leftward, keeping the above-region gap and overflow/hit-testing behavior delivered in U9. No node geometry, settings, filtering or indexing implementation changes.

Existing browser/native assertions compare actual button/panel right edges while retaining vertical clearance, input hit testing and node clipping checks. Full `npm run verify:obsidian` passes architecture 7, core 67, Node 226, UI 17, portable sources 322 and actual IndexedDB browser 296 without skips. Production settings 24, installed types, official scanner, production build and exact installed-plugin smoke pass. Scanner reports zero errors and one retained legacy `Workspace.activeLeaf` warning at `src/main.ts:3134`.

Native acceptance passes 62/62 (56 desktop workflows + six desktop/tablet/phone-emulation checks). All five filter buttons have zero measured offset from their scroll area's right edge. The 6 px vertical clearance, leftward input overflow, field hit testing and node clipping remain correct; the sibling fixture also checks open/closed controls. No captured errors or CLI timeouts. Exact settings/enablement bytes and owned fixture/view/controller/mobile/window/throttling restoration pass.

All 270 implementation/test/build inputs and rebuilt/staged/native artifacts match. Main JavaScript is identical to the accepted U9 build.

| Artifact | SHA-256 |
| --- | --- |
| `main.js` | `8b3fea712d0405761527ddb0b92e9d455b8930ce83f55c214536871df47392d4` |
| `manifest.json` | `e3bb9a35215af97f6a3394cf7fc8f7d2142bae06de94bb112fef5a05819cda62` |
| `styles.css` | `0d75bb3b4dd6a863319116b54b3d1b9f31d21d03ee8c8d24963aa0e344ebf01c` |

The final passive audit confirms ready desktop, original center (`Note A.md`), 13 original Markdown notes, saved layout/typography parity, hidden configuration and no previews/owned fixtures/controllers/pending semantic or hydration owners. No additional manual check is required for this one-value CSS correction. Physical touch/WebView outcomes remain separate from desktop emulation.
