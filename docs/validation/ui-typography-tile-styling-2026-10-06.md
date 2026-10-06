# Typography configuration tile styling — validation

U7 implementation and automated acceptance complete. [Exact evidence](ui-typography-tile-styling-2026-10-06.json) records the tested source, installed build, responsive measurements and cleanup audit. Maintainer accepts U6 functionality and requests a consistent settings row. Changes remain uncommitted on `ui-improvements-batch-2`, base `5091f88abb69f660c900fed1dd0d41c7b738af81`; C15–C26 remain paused.

## Delivered appearance

Font size and Node width use the existing two-row rail group, matching the horizontal/vertical and parent/child pairs. The wrapping checkbox is a narrower 64px tile beside this pair and stretches to its full height. Its centered multiline caption shares the sliders' font size, spacing, uppercase styling and color. The tile reuses the same background, border, radius and shadow as the sliders. The whole typography group wraps within the existing responsive configuration panel.

Only JSX structure and CSS change in production. Setting keys, global typography persistence, graph geometry and default-hidden configuration behavior remain unchanged.

## Acceptance

The full `npm run verify:obsidian` attempt passes architecture7/core67/Node226/UI17/portable322 and 293/294 actual-IndexedDB checks, without skips. It fails the unchanged exact-pair unrelated-source race case, so the aggregate is not an all-green pass. The complete affected file passes43/43 on an isolated unchanged rerun. The cause of the initial failure is not established. Separately, production settings24, installed types, official scanner, the real build and exact installed-plugin smoke pass; the staging report records these distinct outcomes. Scanner reports zero errors and one retained legacy `Workspace.activeLeaf` warning at `src/main.ts:3134`.

Exact-build native acceptance passes60/60: 54 desktop workflows and a separate exact-build six-check desktop/tablet/phone-emulation run. A native capture of the installed desktop controls was also visually inspected. In each device class, actual controls pass stacked/equal-width rails, a narrower full-two-row-height wrap tile, a multiline caption, and matching caption/surface styles. All six sliders and the wrapping tile remain inside the Plex viewport. No captured JavaScript errors or CLI timeouts in the accepted run. A prior native run failed its long-title two-line fixture at the saved8px base size: the60-character sample fit one line. The driver now explicitly selects12.4px through Settings for that sample and still restores original preferences exactly; the production source is unchanged. The failed trial and its successful cleanup are retained separately. The first device-only continuation passed desktop/tablet checks, then timed out at the phone CLI transition; cleanup restored desktop/settings/window state. Its unchanged-build retry retains the original30-second CLI limit and is recorded separately.

All270 frozen source/test/build inputs match. Rebuilt, staged, native-tested and installed artifacts agree:

| Artifact | SHA-256 |
| --- | --- |
| `main.js` | `c8386ecabbc11431a1bdfca17b5d4f2f60eaea9b2ecbd393ff6d5349855174bf` |
| `manifest.json` | `e3bb9a35215af97f6a3394cf7fc8f7d2142bae06de94bb112fef5a05819cda62` |
| `styles.css` | `d4d2318f7d97444cca209c6d0a90c071e3b78408f010cc1a186ef6820df40ef7` |

Settings/enablement bytes, fixtures/views/controllers, mobile state, window bounds/minimum and original throttling restore. The final passive audit finds ready desktop, Note A, 13 original notes, original persisted profile/typography, hidden configuration, no previews and no pending source/semantic owners. Prior U6 functional evidence remains historical; this report records the new exact build.

Physical touch/WebView outcomes remain separate from desktop emulation; this correction changes appearance and retains the existing checkbox handler. No large native vault, personal-vault deployment or Git publication is needed.
