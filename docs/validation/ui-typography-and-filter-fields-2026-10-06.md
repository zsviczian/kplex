# Plex typography, area fields and Find — validation

Implementation and automated acceptance complete. [Exact evidence](ui-typography-and-filter-fields-2026-10-06.json) retains the tested build, reports, corrections and restoration audit. Changes remain uncommitted on `ui-improvements-batch-2`, base `5091f88abb69f660c900fed1dd0d41c7b738af81`. C15–C26 remain paused.

## Delivered behavior

Area-filter fields retain their full width and overflow their panel. The node list remains independently clipped and scrollable. Expanded Find removes its redundant magnifier; dismissal remounts and focuses the trigger, including keyboard and pop-out workflows.

Configure Plex layout now exposes six rails and a wrapping checkbox. The two new rails control base font size and regular-node maximum width. Font size is a new global plugin setting under **Visual styling → Node styling → Node appearance**, validated to 8–28px with a 12.4px default that preserves the current appearance. Role and explicit style proportions remain intact; camera zoom still scales the canvas. Larger text grows node and expanded-descendant row geometry. Two-line height includes the painted font even when a custom style is below the renderer's historical minimum.

Width and wrapping reuse `baseNodeStyle.maxWidth` and `wrapNodeLabels`; central/explicit style maxima remain separate. Global typography shares the plugin settings; density and columns retain their existing per-device/surface profiles. Typography drafts survive publication, cancel layout motion and preserve the camera, then persist after 180ms. Retirement flushes only an unstarted debounce, preserving an already active save.

## Evidence and retained corrections

Focused Node 35/browser 2 checks, installed Obsidian types and scoped lint pass. The font regression covers defaults, malformed/bounded input, presentation-only classification, regular/central/expanded row growth, non-overlap and small custom fonts at a large global size. Chromium verifies full-width interactive overflow while node clipping remains intact, and hidden Find trigger/dismissal focus.

Final corrected-build native acceptance passes 60/60 (54 desktop + 6 desktop/tablet/phone-emulation), with typography geometry/Settings/persistence parity, no full semantic rebuilds, all four area hit tests, shared normal/hover styling, slow density motion and existing relationship workflows. Narrow labels measure 160×26px at 12.4px text; wider wrapped labels measure 500×98px at 24px text. Settings changes also update the Plex controls and persist through the same appearance owner.

- New English catalog keys initially required matching entries in all seven typed locales; the translations are present.
- The browser field test exposed missing host box-sizing; the field now declares border-box sizing explicitly.
- The initial Parent fixture was too wide to overflow. The native probe temporarily narrows each panel and restores its exact width, leaving graph geometry/settings untouched.
- A normal-style assertion compared a hovered Restore button with unhovered Zoom. The probe clears trusted hover before comparing normal styles; hover tests remain separate.
- A run passed all 54 desktop workflows but failed the original-settings-byte assertion during teardown. The typography owner avoids duplicate retirement persistence, and the driver waits for actual settings-write promises before restoring bytes; its passive wrapper preserves original promise identity/results and is independently restored on every outcome. Subsequent 60-check acceptance restores settings/enablement/fixtures/views/controllers/window/mobile/throttling state.
- Final review found small custom fonts could exceed their raw-font two-line box at large base size. The height calculation now covers both raw and painted line boxes. The 17-case focused geometry lane passes. The prior aggregate was intentionally stopped before its expensive publication fixture; it is not an accepted final run.

## Final aggregate and identity

`npm run verify:obsidian` passes architecture7/core67/Node226/UI17/portable322/actual-IndexedDB294, without skips, plus 24 production settings scenarios, installed Obsidian types, the real production build and installed-plugin smoke. Official scanner lint reports zero errors and one retained legacy `Workspace.activeLeaf` warning at `src/main.ts:3134`. The 20,015-owner actual-IndexedDB fixture is functional scale evidence, not a native-vault timing claim.

All 270 frozen implementation/test/build inputs match the accepted native and aggregate build. Rebuilt, staged and installed artifacts match:

| Artifact | SHA-256 |
| --- | --- |
| `main.js` | `c02d3331e4a91e72467c1bb70d1e6f8cb628dd08559f6f4f0dc681a5d44e8ed8` |
| `manifest.json` | `e3bb9a35215af97f6a3394cf7fc8f7d2142bae06de94bb112fef5a05819cda62` |
| `styles.css` | `a9adf1ed12c39675715ace3c8a58f018de247d6cab1dc9c42a2ec134e4592961` |

Native cleanup restores settings/enablement bytes, fixtures, views/controllers, mobile state, window bounds/minimum and original background throttling. A separate final audit confirms desktop/ready, Note A, 13 original Markdown notes, original H4/V4/parent2/child4 profile and typography parity with persisted settings, hidden configuration, zero drop previews/fixtures/controllers/pending semantic or hydration owners. Native capture reports no errors or CLI timeouts. Earlier failed setup/restoration trials and the intentionally aborted pre-correction aggregate remain separate from acceptance.

## Manual coverage

Physical Android/iOS activation of the new font/width rails and wrapping checkbox remains separate from desktop emulation. Confirm readable two-line labels and saved preferences after reopening. No personal-vault deployment, native 20k performance claim or Git publication was performed.
