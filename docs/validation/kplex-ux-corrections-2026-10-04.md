# K-Plex UX corrections — 2026-10-04

Scope: the requested search separation, image/editor presentation and history, About vault activation, area resizing, Canvas explorer drops and zoom updates. The latest styling request makes the top Find magnifier match the bottom-right zoom controls. Existing uncommitted feature work is retained. No commits or releases were made, and this implementation was staged only in the explicitly selected disposable `kplex-test` vault.

## Resulting behavior

- **F4** focuses whole-Vault navigation search, including real attachments and Canvas files regardless of graph visibility. **Ctrl/Cmd+F** opens an independent Find field within the current Plex. Its literal label/path/alias matching highlights projected nodes and relationships, reveals overflow hits and cycles with Enter/Shift+Enter without changing the center or history. It has no results dropdown. Native embedded-editor Find remains available within the editor.
- Find's collapsed magnifier matches the zoom buttons: 30 × 28 px, 7 px corner radius and `rgba(12,17,23,.78)` background. Its wrapper is transparent. The disclosed input, count and close button use the same dark control surface.
- Native image editors center and contain-fit the image within both available dimensions. The collapse action avoids activating the embedded native leaf; disposal transfers active focus to its Plex host before detaching. Tall node thumbnails remain vertically centered.
- About vault opens on double click or two completed stationary touch taps. Single clicks/taps do not open it. Keyboard activation remains available.
- Area height changes sample the latest pointer position once per owning-window animation frame, render during the drag and persist once on release. Camera placement remains stable. Temporary settings overrides preserve the real inherited profile facade; spreading that facade had caused the reported white screen by dropping inherited settings.
- Explorer drops accept a single current real file of any type, including Canvas. Markdown-only relationship gestures retain their narrower adapter. Embedded native editor geometry reads the current center bounds on Plex zoom, so Canvas resizes before a subsequent pan.
- Complete current graph publications no longer start a narrower semantic scope on navigation or superseded-task retries. A production/browser regression checks preserved aliases, outgoing expanded relationships, global search and zero added source work.

## Reproducible checks

`npm run verify:obsidian` runs the complete repository verification, builds production artifacts, stages that exact build and performs native smoke checks. Run the new `npm run verify:obsidian:ux` afterward with the explicit target variables documented in `CONTRIBUTING.md`. Set `KPLEX_UX_EMULATE_MOBILE=true` for desktop Obsidian mobile emulation at tablet/phone widths.

The native UX driver owns only its fixture folder, leaves and controller. It restores settings bytes, plugin enablement and native window state. It compares source/staged artifact hashes and tests rendered Find/zoom style equality, F4 file types, projected Find, About vault, tall/wide native images, collapse history, thumbnail alignment, captured-pointer resize samples and Canvas drop/zoom. Fixture setup uses the production rebuild coordinator to establish a complete graph; this is UI acceptance and does not prove warm source-vocabulary completeness.

## Validation status

- Complete `npm run verify:obsidian` passed on Node 22.22.2 and Obsidian 1.14.4 (installer 1.14.0): architecture/core checks, Obsidian lint, indexing tests, 144 portable tests, 8 UI Chromium tests, 317 source-portable tests, 205 real Chromium IndexedDB tests, production build and native smoke. The 20,015-owner stress case passed; the browser suite took 556.7 seconds. Production checks used the actual installed Obsidian typings.
- Final `npm run verify:obsidian:ux` passed all 15 native/emulation scenarios with no captured JavaScript errors. The popout check uses its live owning document after native window migration. Desktop, tablet and phone classifications were confirmed at actual viewport sizes 1200 × 875, 900 × 875 and 390 × 844; Find focused, fit inside the Plex and had no dropdown. Mobile hints omitted F4.
- Resize samples were parent/friend 170 → 180 → 195 px and child 190 → 200 → 215 px, with unchanged camera and one settings save per release. The native Canvas surface grew from 536 × 446 to 674.77 × 562.06 px on Plex wheel zoom before pan. The measured tall-thumbnail vertical-center error was zero.
- Source/staged artifact hashes match in both final reports: `main.js` `7a1ead5c35648c6c4f90d48d8db06f30f24762c6c0604c82e673be0743cec707`; `styles.css` `5e4f36ac0a71ed466f5c96843e68d2008159016db8b396703afa4b3f6ea81ea9`; `manifest.json` `e3bb9a35215af97f6a3394cf7fc8f7d2142bae06de94bb112fef5a05819cda62` (0.0.5).
- Final Obsidian lint, driver syntax validation and `git diff --check` passed. Settings bytes and plugin enablement were restored. A final native query confirmed desktop mode, original background throttling, K-Plex enabled and no owned fixture/controller/modal/popout remaining.

Durable reports: [complete build/smoke](kplex-ux-build-2026-10-04.json), [native UX and device emulation](kplex-ux-native-2026-10-04.json). Full logs: `/private/tmp/kplex-ux-complete-verify.log`, `/private/tmp/kplex-ux-popout-acceptance.log`, `/private/tmp/kplex-ux-final-lint.log`.

## Limits and follow-up acceptance

Desktop mobile emulation cannot establish physical iPad trackpad, touch activation or mobile WebView behavior. Check double tap versus long press, native image/Canvas controls, real touch resizing and Plex zoom on physical tablet/phone. Find focus/highlighting/style/history passed in the native popout; embedded-editor gestures and popout-to-main migration still need separate acceptance. No deployment to the personal vault is part of these tests.

Earlier native attempts exposed driver setup/readiness assumptions, an obsolete host modal-close selector, OS menus without renderer DOM, injected mouse moves without a held-button modifier and a retired initial popout React root. They are retained in temporary logs rather than represented as product regressions or successful acceptance. The final native driver completed without manual setup interventions. The complete-graph authority problem and inherited-profile white screen were established independently and corrected in production code with regression coverage. The separately documented startup stress-center/source-storage limits remain outside this UI acceptance result.
