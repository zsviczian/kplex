# Risk-based regression validation — 2026-10-13

Result: **23 passed, 1 failed acceptance gate, 1 pending** across the supplied 25-item plan. All ten P0 cases passed. Two combined scenarios passed. The popout combined scenario passed its functional assertions but failed the clean-native-error gate with ResizeObserver notifications; do not treat that run as a clean pass.

## Scope and identity

- Supplied plan: PRs #138–#142 and #146. Its draft/unmerged description of #146 is stale relative to this checkout; local HEAD includes the implementation.
- Branch: `PR-cleanup`, HEAD `186aec3aa6565a7014897b206c1f8cc0e9b9dba1`. Changes from this validation remain **uncommitted**. No commit, push, PR, merge or release action occurred.
- Code/test diff SHA-256, excluding this report and HANDOFF: `a08b7129e4dbdd423f15f934f6fd1673841938734464df0824beafb398130c05`.
- Host: macOS/Darwin 23.5.0, Node 22.22.2, Obsidian 1.14.4 / installer 1.14.0.
- Sole write/probe target: CLI-confirmed `/Users/zsviczian/Obsidian/kplex-test-small`. Production vault `Zsolt's Brain (2025)` was not probed or modified. Sibling repositories were not changed.
- Native drivers ran serially. Native APIs, actual Obsidian dialogs, persisted settings/Markdown, rendered nodes and owning-window pointer/keyboard input were checked. This is not physical-device acceptance.

Artifacts deployed at the risk-test checkpoint matched `dist/`:

| File | SHA-256 |
| --- | --- |
| main.js | `99a1d30e0c8c6e1e44e4ce0bf28a521068ee0bbc46ed5fe4667f4c9f17973eec` |
| manifest.json | `0beacdb94adc4a0ec318d69dba87fcb4dc9c1a86784058db341fdefe0dfb4250` |
| styles.css | `e8c9279e8904888aa71d5dd2b01f320d5b32fd10e15feb0b9a9576a34f11cea3` |

The durable [JSON receipt](risk-based-regression-2026-10-13.json) preserves case observations, failures, notifications, artifact identities and restoration facts. Temporary driver sources and raw logs remain under the paths below.

## The 25 requested cases

| # | Priority / area | Result | Evidence and limits |
| --- | --- | --- | --- |
| 1 | P0 — mixed-reference deletion | Pass | Native deletion removes configured Parent and Hidden links; ordinary scalar/list/nested properties, body and inline evidence survive. |
| 2 | P0 — selective property removal | Pass | Only the explicitly selected source/field changes. Unrelated array members, properties and the other note's identical field remain unchanged. |
| 3 | P0 — Hide direction | Pass | Actual connector menu opens directional consent. Switching writable note changes exact from/to disclosure. Original links and opposite note remain intact; both rendered central perspectives are asserted. |
| 4 | P0 — placeholder / cancellation | Pass | Placeholder and remaining-reference evidence survive correctly. Cancel writes nothing; pending consent is also cancelled across plugin reload. |
| 5 | P0 — partial cleanup failure | Pass | Controlled source-write failure preserves failed evidence, reports its owning source, and retains successful changes. Replacement/recreation identity fences also pass. |
| 6 | P0 — create style / render / reload | Pass | Actual manager/editor stores colors; combined probe verifies computed RGB on the central node. Committed style survives native plugin reload. |
| 7 | P0 — edit/delete both style families | Pass | Property and tag operations persist independently, including identical-key isolation, rename and imported alpha/inheritance preservation. Actual property edit changes rendered RGB. |
| 8 | P0 — Cancel / repeated Save | Pass | Unsaved name/color cancellation changes neither live nor durable styles. Duplicate Save reaches storage once; pending Cancel/Escape cannot undo a submitted durable operation. |
| 9 | P0 — style operations during indexing | Pass | A real rebuild is held at a background checkpoint. Save, edit, Delete and navigation finish while it is still pending; release converges. Final combined sample: Save 31.5 ms, Delete 31.3 ms to observed modal close, not paint latency. |
| 10 | P0 — persistence/refresh failures | Pass | Actual settings-write rejection keeps the editor and previous style with not-saved feedback. Separate post-storage presentation/manager failures close with saved/recovery feedback. |
| 11 | P1 — rapid A → B → C → D | Pass | Final deployed driver requires D in the rendered Plex and canonical native Sidecar; late requests cannot override it. |
| 12 | P1 — pending A → B → A | Pass | A genuine native open is held while B then A supersede it. Final A is correct with exactly one native open. |
| 13 | P1 — mode / position / native navigation | Pass | Native Sidecar→Plex and Plex→Sidecar navigation, unlinking, relinking, left positioning and durable mode pass. An additional reopen case exposed and now functionally verifies the repair described below; that expanded lane has a separate notification failure. |
| 14 | P1 — physical Android | Pending | No physical Android access / adb available. No desktop emulation is counted as device latency, touch or drawer acceptance. |
| 15 | P1 — native and K-Plex rename | Pass | Native File Manager and actual K-Plex rename modal preserve a single physical identity and current central/neighbor labels, relationships and title/alias state. |
| 16 | P1 — rename with link updates off | Pass | Old references remain unchanged; any surviving old-coordinate ghost is distinguished from the renamed physical note. |
| 17 | P1 — move / case / duplicate basename | Pass | Folder moves, case-only rename and duplicate-basename targeting preserve exact TFile identity, paths, aliases and relationship ownership. macOS evidence; Linux remains a separate platform check. |
| 18 | P1 — pins / history / search / reload | Pass | Native receipt records current paths in pins/history, immediate vault search and warm reload in both eager and on-demand modes. |
| 19 | P2 — toolbar anchor | Pass | Trusted pointer opens Sync and Sidecar menus next to their controls. Actual passed positions and rectangles are retained. Inspectable Obsidian DOM backend. |
| 20 | P2 — keyboard / command / narrow / popout | Pass | Fourteen native scenarios cover Enter, published command, hidden-toolbar fallback, 500×500 popout clamping, Escape/outside dismissal and both migration directions with retired-menu ownership. Windows OS-native rendering was not tested. |
| 21 | P2 — offline edit / warm restart | Pass | Closed only the disposable vault window, edited owned A externally, reopened a fresh renderer/window, and navigated during initialization. New C relationship replaces B and actual native editor shows latest bytes. Shared Electron process / another test-vault window stayed running; a full application-process restart was not performed. The maintainer explicitly accepted this scenario as sufficient proof on 2026-10-13. |
| 22 | P2 — interrupted foreground preparation | Pass | Full browser checks cover cancelled hydration / late publication / current foreground authority. Native inventory is held while navigation, source mutation and editing complete without a broad foreground flush; release and cleanup converge. Fresh-renderer initialization also accepts rapid A/B/C/A and resolves latest offline content. |
| 23 | Combined — Rename → Navigate → Delete | Pass | Final repair build: native B→B2 rename, rapid linked navigation, actual deletion consent, immediate center/history fallback, no trashed Sidecar target, ontology-only cleanup and unchanged ordinary/body evidence. |
| 24 | Combined — Indexing → Style Save → Navigate | Pass | Actual computed colors, durable settings, final requested center and continued background hold all asserted. Index resumes and converges after release. |
| 25 | Combined — Popout → Menus → Sidecar → Reload | Failed gate | Trusted native menu selection moves Sidecar below, toggles off/pinned, returns to main and reloads with correct mode/position/center; no orphan DOM menu. However 50 `ResizeObserver loop completed with undelivered notifications.` entries fail the strict clean-error gate. Cause remains unclassified; functional success is not clean acceptance. |

## Defect found and patch

The extra move → unlink → relink → reopen path reproducibly lost Sidecar ownership while Obsidian was creating/opening its split. Its layout-change listener interpreted unsettled geometry as an independently moved pane. Retaining ownership through the existing `sidecarMovingHosts` guard stopped that loss, but exposed another prerequisite: pixel bases retained from an earlier move could allocate zero width to the new pane. `openSidecar()` now retains the guard through native layout settling and reuses `ensureAdjacentFileLeafSize()` to repair that allocation. An enclosing move's guard is preserved and exceptions release a newly owned guard.

Before repair: empty managed map, then with the first guard-only patch a retained Sidecar at A with `position: null` while the Plex reached B2. With the final patch: positioned Sidecar follows B2 and the full rename/navigation/delete scenario passes. Maintained native driver also verifies left position, 176 px pane width, latest D, and the held A/B/A's one native open. Its final clean-error gate still fails with the ResizeObserver notifications. The patch is available for review, not asserted release-ready.

The host contract test exercises opening while geometry is pending, sizing before publication, exception cleanup and preservation of an enclosing move. Scanner correction also types the existing Hidden setup modal close capability; it changes no modal behavior.

## Automated checks and test-tool corrections

`npm run verify:obsidian` passed the complete repository verification, production build, exact staging and native open smoke. Lane pass counts are 7 architecture, 94 core, 735 main, 60 browser UI, 334 source contracts and 443 source browser cases (nested accounting; do not sum as distinct product scenarios). The dense 20,015-owner cache/publication checks passed, including read/parse/full-build and cancellation assertions.

That full run used `main.js` hash `6bff98ddaf36957cc1d2b2a7dcb022f5634d7157c5e124509cd080eee916a657`, before the subsequently discovered Sidecar repair. On the final repair: production `npm run build`, `npm run lint:obsidian`, `npm run check:architecture` and 99 checks from `action-host-integration`, `linked-document-follow` and `canvas-menu` pass. The final native Sidecar, combined and foreground receipts use the final artifact. Full Chromium/dense suites were not unnecessarily repeated after the local native-opening change.

Earlier failures were retained and corrected:

- Full verification first found two unsafe-bind lint errors. The canonical compile harness also lacked the newly imported settings-navigation/Hidden setup modules.
- Old assertions/fixtures expected retired deletion copy, visible collapsed override controls, missing host DOM helpers and incomplete local-import preferences. Fixtures now compose the real adapters, open the native disclosure and assert the current approved copy/preference.
- The macOS deletion driver waited for a DOM menu while it had opened an OS-native menu. A finite forwarding wrapper now selects the inspectable backend and restores itself even after failure.
- Rename driver waited for startup readiness before opening the lazily restored application after reload. It now calls the normal activation path first.
- Combined probe initially compared six-digit expected color with the production eight-digit alpha-preserving format, and attempted a rebuild before an existing startup/index task settled. These prerequisites were corrected; functional/indexing assertions remained intact.
- Synthetic popout menu clicks closed the menu without applying the choice. Trusted owning-window pointer selection completed the actual workflow. The functional success and subsequent notification-gate failure are both retained.
- Offline preparation initially demanded a full optional snapshot for a partial on-demand graph. The production guard correctly declined it. The test now waits for actual source-cache reconciliation and tests that durable cache, recording `optionalSnapshotSaved: false`.

## Reported stuck menu

The screenshot of the lingering menu over synthetic A/B2 is the native right-click probe's popup. Renderer-level hide / synthetic web-content Escape did not close that OS popup across later fixture changes. The native Window menu / Escape sequence dismissed it, and the final audit has no menu or modal. Subsequent automated menus use the inspectable DOM backend.

The trusted connector probe captured `(513,419)` at the event, K-Plex anchor and Electron popup in the correct native window. It did not reproduce a zero-coordinate anchor. An earlier screen-coordinate explanation was incorrect: this Obsidian implementation uses client coordinates. No speculative production menu-coordinate change was made. The initial top-left observation's exact input was not captured; it is not independent evidence of a reproduced user-interaction bug.

## Evidence locations

| Run | Receipt / log |
| --- | --- |
| Full verification | `/private/tmp/kplex-risk-20261013-host-r4/report.json`; `/private/tmp/kplex-risk-20261013-verify-r4.log` |
| Deletion — 21 scenarios | `/private/tmp/kplex-risk-20261013-delete-r2/report.json` |
| Styles — 14 scenarios | `/private/tmp/kplex-risk-20261013-style/style-operations-native.json` |
| Rename — both modes | `/private/tmp/kplex-risk-20261013-rename-r2/rename-identity.json` |
| Toolbar — 14 scenarios | `/private/tmp/kplex-risk-20261013-menu/menu-anchor-native.json` |
| Combined indexing + rename | `/private/tmp/kplex-risk-20261013-combined/report-eighth.json`; `/private/tmp/kplex-risk-20261013-combined-r8.log` |
| Popout final native selection | `/private/tmp/kplex-risk-20261013-combined/report-popout-final.json`; `/private/tmp/kplex-risk-20261013-combined-popout-r3.log` |
| Final Sidecar — 38 samples + reopen | `/private/tmp/kplex-risk-20261013-sidecar-final/sidecar-latency-native.json` |
| Offline fresh renderer | `/private/tmp/kplex-risk-20261013-offline/report.json` |
| Foreground — 6 held-inventory scenarios | `/private/tmp/kplex-risk-20261013-foreground/report.json` |
| Final code checks | `/private/tmp/kplex-risk-20261013-rebuild-r2.log`; `/private/tmp/kplex-risk-20261013-lint-final-r2.log`; `/private/tmp/kplex-risk-20261013-sidecar-contracts-r2.log`; `/private/tmp/kplex-risk-20261013-architecture-final.log` |
| Exact staging + final cleanup | `/private/tmp/kplex-risk-20261013-restage-final.json`; `/private/tmp/kplex-risk-20261013-final-restoration.json` |

Combined and offline driver source copies are in their receipt directories. Maintained drivers are under `scripts/testing/obsidian/`. Test-only controls held finite work outside transactions, always released gates/restored wrappers and removed only owned synthetic notes. No production diagnostics were added.

## Restoration and follow-up

Final audit: original 74 Markdown files; no test-owned notes, controllers, menu or modal; no original Markdown mtime changed during this task; local graph reports ready (15 materialized of 74 in on-demand mode). Original `data.json`, `app.json`, enabled-plugin list and workspace were restored byte for byte. The verified repair build remains installed in the disposable vault. Other vault content and plugin binaries were not changed.

Do not recommend release approval from this record: all P0 cases pass, but the combined clean-error gate is still blocked. Prioritized follow-up is (1) attribute and resolve the ResizeObserver notifications during native pane rearrangement, then rerun the two strict failing lanes; (2) physical Android cold/warm/background navigation and drawer/touch acceptance; (3) the plan's Windows native-menu and Linux rename coverage on those hosts. The maintainer accepted the existing #21 restart scenario; no additional full-process restart is required for this checklist. No ETA is asserted for unavailable devices or the unresolved observer cause.

A subsequent [index-status tooltip fix](index-status-callout-2026-10-13.md) has its own build and focused evidence; the risk-test artifact/diff identities above remain historical to that checkpoint.

## Maintainer manual checks

Use the latest repair build and a disposable test vault. Prepare four notes named QA A, QA B, QA C and QA D, linked in a ring (A→B→C→D→A). This avoids changing existing content. Record the Android device model, Obsidian version and tested build. The desktop build is installed in `kplex-test-small`; this does not establish that Android has received it.

### Android — #14

1. Select **Settings → K-Plex → Indexing config → Indexing mode → On demand** and restart Obsidian. Open K-Plex and its companion Sidecar where available; choose **K-Plex pinned to one fixed note tab** in the Sync menu.
2. **Cold app start:** fully stop and reopen Obsidian, then start navigating as soon as the Plex becomes usable. Navigate QA A→B→C→D quickly. The last accepted request must settle on D in both the Plex and linked native note. There must be no late jump back, frozen input or stale previous note presented as current.
3. **Warm navigation:** repeat A→B→C→D five times, then A→B→A five times. Use real touch gestures at your normal fast pace. Final center/note must agree; watch for repeated reopening, flicker, oscillation or missed taps. A deliberately held native open is already covered by the automated case; manual fast tapping need not recreate that exact timing window.
4. **Android drawer:** open K-Plex in the side panel and navigate from native Markdown tabs. Reveal the drawer and verify the current note's Plex. When opening a note from the drawer, check normal drawer dismissal, correct native note and correct center when revealed again. Exercise Android Back, scrolling and the software keyboard; dismissal must not activate an unrelated control or lose the requested note.
5. **Mode and resume:** select **K-Plex not linked to a note tab**, navigate the Plex, and verify it no longer changes the previously linked native note. Relink, navigate again, background Obsidian for about 15 seconds, return and verify the last target remains correct. Rotate portrait/landscape once and check accessible controls and usable content.
6. **Background work:** select **Eager**, restart, and repeat the rapid sequences while indexing is visibly active. Alternatively run **Rebuild index** and navigate during that work. Repeat one Sidecar close/reopen and one drawer dismissal while busy. Input should stay responsive and the final target should converge. If indexing finishes before navigation begins, record that the concurrent-work case was not exercised; use a larger disposable fixture to extend it.
7. Restore the preferred indexing/link mode. Report cold/warm/background results separately, with approximate longest delays and any wrong-target or drawer behavior. Screenshots/video are most useful for a failure; exact stopwatch thresholds are not defined by this plan.

### Desktop — #25

1. In `kplex-test-small`, open one Plex centered on QA A and a linked Sidecar. Verify changing to QA B updates the companion note.
2. Open Developer Tools (macOS **⌘⌥I**, Windows/Linux **Ctrl+Shift+I**) and select **Console**. Clear existing entries and enable **Preserve log**. Inspect the popout's own Console as well after moving the Plex; save its messages before closing that window. Keep the main window's Console available for the return/reload steps.
3. Move the K-Plex tab to a separate window through its tab menu or **Window → Move To New Window**. Verify a rendered center before continuing. Resize that window smaller once.
4. Open the Sync menu. Verify placement beside its button and normal selection/dismissal. Select **K-Plex not linked to a note tab**, then **K-Plex pinned to one fixed note tab**. Open **Move Sidecar**, select **Below**, and verify a usable companion pane. Check Escape and clicking outside each menu; each action should dismiss its own menu.
5. Navigate rapidly QA A→B→C→D, then A→B→A. Both center and linked note must settle on the final target. Move Sidecar to **Left**, unlink/relink, and reopen it if needed. The new companion must have visible space and follow navigation. Move it back to **Below**.
6. Drag the K-Plex tab back to the main window. Check that menus work at their new controls and that the old window has no lingering menu. If the companion remains in the popout, bring its tab back as well and reopen the managed Sidecar from K-Plex. Close the popout when empty.
7. End on QA D with a linked Sidecar. Record the center, Sync mode and Sidecar position. Disable/re-enable K-Plex through **Settings → Community plugins**, reopen the Plex if needed, and verify the recorded mode/position. Navigate once more and check that the linked native note follows correctly.
8. Inspect Console after the moves and reload. Record any burst of `ResizeObserver loop completed with undelivered notifications.`, the action that preceded it and whether visible layout/navigation was affected. Do not count a visually correct flow as a clean-console pass when those notifications persist. Report **functional result** and **console result** separately; the original automated gate remains failed until reviewed.
