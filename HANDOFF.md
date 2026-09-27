# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

### Current transfer

**State: combined commit + working-tree review complete; automated/native emulation checks passed after review fixes. Physical phone/tablet acceptance pending.**

- Sender → recipient: offline development agent → main validation agent.
- Kind: issue #18 follow-up implementation / return review.
- Objective: preserve the desktop hover-to-resize interaction, fix its dashed-boundary discoverability, add a touch-accessible explicit Area settings mode, and convert the top-right settings cog into a two-item native menu.
- Reviewed Git identity: branch `resize-semantic-areas`, HEAD `ed38b49c62703fe0affd572afb60856baf1a0e9e` (`area resize v1`), parent `85fecdd`. Main-agent review includes that commit and the incoming uncommitted follow-up, plus the fixes below. No commit/push was performed.
- Offline base identity: source ZIP `repository(20260927-133622).zip`, SHA-256 `2d2dbe0f28cba25090aa2a2607ec46a03bc808aafc02984cad7cb2e3ae0e35ee`. The supplied archive has no Git metadata, so no branch/commit/dirty-state identity is available.
- Follow-up starting point: the previous issue #18 patch ZIP `kplex-issue-18-area-height-ui.zip`, SHA-256 `2fadb10d64089108e8fa691b0f14359156089a1ff69d284819bafffd4c509603`, was overlaid on the base before this follow-up.
- Offline capabilities used: Node `v22.16.0`, npm `10.9.2`, global TypeScript `5.8.3`. No Obsidian CLI/runtime. The repository has no dependency installation. The repository baseline requires Node `22.22.2`, so exact-build/native acceptance remains with the main validation agent.

### Scope and implementation

- `src/ui/App.tsx`
  - The top-right cog now opens a native Obsidian menu instead of opening Settings directly.
  - Menu items are `Plugin settings` (opens the existing plugin settings page) and `Area settings` (checked while enabled).
  - Area settings is view-local/transient UI state, not a persisted setting.
  - The cog receives the existing `is-on` treatment while Area settings mode is active.
- `src/ui/PlexGraph.tsx`
  - Preserves the desktop selective interaction: empty-space hover inside an area reveals one dashed frame; the resize edge activates and can be dragged.
  - Explicit Area settings mode renders all five area frames simultaneously and gives every frame a persistent stronger resize handle.
  - Touch can start resizing from the handle; the touch hit target is intentionally wider than the visible handle while the explicit mode is enabled.
  - Parents, friends, challengers and siblings resize from the top; children resize from the bottom.
  - Friends and challengers continue to edit the same existing `friendMaxHeight` value.
  - A stationary empty-canvas click/tap disables Area settings mode; an actual canvas drag/pan does not. Resizing one area leaves the mode enabled so multiple areas can be adjusted in sequence.
  - Explicit-mode edge hit testing may win over graph content directly under the visible handle, making the handle usable on touch even when content reaches the boundary. Normal desktop hover mode still requires empty Plex space.
- `src/ui/layout.ts`
  - `zoneAreas` now always contains parent, child, friend, challenger and sibling rectangles, including when a relationship group has zero nodes. This is required so explicit Area settings can display all five boxes on touch devices.
  - Area rectangles keep the established vertical anchors and configured heights; conservative minimum horizontal widths provide a usable hover/touch target while still expanding to contain actual nodes.
  - Existing overflow `zoneViewports` remain independent and are still created only when content needs scrolling.
- `styles.css`
  - Area frames now render above the node/scroll-panel stacking context while remaining `pointer-events: none`; this fixes the faint dashed border being visually hidden by zone panels.
  - Normal hover frames are slightly more visible.
  - Explicit Area settings frames use a more visible dashed border and a 5 px accent resize handle; active/resizing frames become solid/accented.
  - New styling uses Obsidian theme variables only.
- `src/lang/en.ts`, `de.ts`, `es.ts`, `fr.ts`, `ja.ts`, `nl.ts`, `ru.ts`, `zh-TW.ts`
  - Added exhaustive localized catalog entries for `Settings menu`, `Plugin settings`, and `Area settings` so the strict locale contract remains complete.
- `HANDOFF.md`: this transfer packet.

Incoming cumulative modified files relative to the supplied base archive were:
`src/ui/App.tsx`, `src/ui/PlexGraph.tsx`, `src/ui/layout.ts`, `styles.css`, `src/lang/en.ts`, `src/lang/de.ts`, `src/lang/es.ts`, `src/lang/fr.ts`, `src/lang/ja.ts`, `src/lang/nl.ts`, `src/lang/ru.ts`, `src/lang/zh-TW.ts`, and `HANDOFF.md`.

### Offline validation actually run

- `node --test tests/localization.test.mjs` — **passed 18/18** after temporarily exposing the globally installed TypeScript package as local `node_modules/typescript`. This validates catalog completeness, interpolation contracts and the production UI literal sink.
- `node --test tests/architecture.test.mjs` — **passed 7/7** with the same temporary TypeScript symlink.
- `node scripts/check-architecture.mjs` — **passed: 48 migrated roots, 89 reachable files, 0 violations**.
- `npm run check:core` — TypeScript core compilation completed, then the test phase could not complete because the checkout lacks the `esbuild` package. Five parser/runtime subtests ran and passed before the remaining test files failed to import `esbuild`. Treat the command as **failed/incomplete**, not as a pass.
- TypeScript `transpileModule` with TypeScript 5.8.3 — **passed** for every changed TS/TSX source file (`App.tsx`, `PlexGraph.tsx`, `layout.ts`, and all changed locale files). This is syntax/transpile evidence only, not repository typecheck/build evidence.
- `npm run build` — **not runnable to completion in this checkout**. `tsc` fails because installed project dependencies/types are absent (`obsidian`, `react`, `react-dom`, etc.). This is a dependency/bootstrap limitation; no successful build is claimed.
- No Obsidian CLI/runtime, physical iPad, or Android device validation was available.
- The temporary `node_modules/typescript` symlink is validation-only and must not be returned in the patch.

### Main-agent review — 2026-09-27

The combined change preserves the semantic index boundary and existing persisted settings. No new schema/settings were added. The five area rectangles remain presentation geometry independent of overflow panels; friends/challengers share the existing `friendMaxHeight`. All three new menu strings are present in every locale. Review included architecture boundaries, component reuse, localization, environment/owning-document behavior, pointer lifecycle and touched-function documentation.

Review fixes:

- The incoming bubble-phase resize handler could never win over node/gate handlers that consume pointer-down. Resize ownership now begins in the viewport's capture phase, before covered graph content can start another gesture. Native controls are excluded; additional fingers cannot start a pinch/relink during an active height edit.
- A changed height could be discarded without persistence when navigation or surface teardown cleared the drag. Interrupted edits now persist during cleanup. Lost viewport pointer capture also completes/persists the edit, without consuming child-owned captures. Ordinary release/cancel retains the same persistence path.
- Hit-band conversion now uses the actual camera scale, including fit scales below 0.3, instead of shrinking the promised screen-space band at low zoom.
- Extracted the portable `ResizableAreaFrame` component. Explicit editing exposes localized, focusable separator controls with current/min/max heights; Arrow keys and Home/End adjust/persist through the same presentation-setting owner. The component has no Obsidian, index, storage or domain dependency.
- Added meaningful TSDoc to the new/touched interaction and geometry functions. New styling uses theme variables and established CSS primitives.
- Added real geometry regression assertions for empty groups, setting mappings, fixed resize anchors and overflow transitions; added a browser-rendered keyboard/accessibility test of the actual shared frame component.

### Automated validation actually completed

- Required Node `22.22.2`, installed lockfile dependencies.
- `npm run verify:obsidian` **passed**; this includes full `npm run verify`: architecture checks, restricted core compilation/tests, official Obsidian ESLint, indexing/golden and other suites, seven Chromium DOM tests, TypeScript build and production bundle. No tests were skipped. Initial sandbox-only browser execution was blocked; the final host-capable run completed all lanes. An initial new geometry assertion was corrected to compare fixed anchors within `1e-9` world units, accounting for ordinary floating-point arithmetic.
- Strict exact-build staging/open/no-error report: `/var/folders/b1/2dys0jfs7bq73whkl2qnyyym0000gn/T/kplex-obsidian-JKC2Cq/report.json`, Obsidian `1.14.2`. Staged/build SHA-256: `main.js` `4be55472e681ba00899ec843415d9308c880ca4f00fd9d7dcf6db15e09b4ea5e`; `styles.css` `781ca58f217f51be3ba17d1ae2e70648ba4799f9d5af1b05f0f2aae19d0ddc2c`; `manifest.json` `e3bb9a35215af97f6a3394cf7fc8f7d2142bae06de94bb112fef5a05819cda62`. A final build after documentation changes produced the same tested artifact hashes.
- Desktop at `996 × 795`: actual native menu model contains exactly Plugin settings / Area settings, with correct checked state; Plugin settings selects the native K-Plex settings tab. Trusted CDP mouse input tested each area's resize direction, live changes before release, shared friend/challenger geometry, persistence and pan-without-dismissal. No semantic rebuild was scheduled by area editing. Non-unit zoom after panning uses the captured scale correctly. Capture loss, cancellation and surface remount persist interrupted edits. Keyboard edits persist. An empty click exits; remount resets transient mode.
- Desktop selective hover: all five areas reveal only their frame over empty space and expose the resize cursor on the edge; ordinary thought hover reveals no frame. The graph was fitted before the node-hover probe so its target was actually visible.
- Phone emulation `390 × 875`, host `is-phone`; tablet emulation `900 × 875`, host `is-tablet`: trusted CDP touch input tested all five live height updates, correct gesture ownership, release/persistence, continued editing, pan retention and stationary tap exit. A temporary graph-content target with a consuming pointer handler directly over an edge confirmed capture-phase resize wins. This is controlled overlap evidence, not a physical-device touch pass. Temporary targets were removed.
- Popout: a temporary native view rendered all five frames in its own document; its menu belonged to that document and its keyboard height edit worked. The temporary popout was closed. The native sidepanel rendered five controls, kept edit mode isolated from the graph tab, persisted the shared child-height setting, and exited editing through the cog. Its prior visibility was restored.
- `dev:errors`: no captured JavaScript errors after desktop and mobile probes. Original desktop/mobile state, `996 × 795` dimensions and all four original height settings are restored; diagnostic wrappers/globals are removed. `git diff --check` passes. Changes remain uncommitted.

Emulation setup note: the 20,015-note test vault entered the existing large-iOS demand-driven cold-start path with no restored snapshot. A restored view was visible before its full index started; the review explicitly called `ensureIndexReady("area-review")` and waited for the 20,701-page index before touch probes. This setup workaround is not evidence that mobile startup/restart itself passed, and no index/startup policy was changed in this feature. Physical checks below should include normal opening after restart.

### Prioritized remaining maintainer checks

1. **Required — physical phone and iPad/tablet:** open K-Plex normally after restart, enable **Area settings**, and drag each bold handle, including where nodes/gates approach an edge and after zoom/pan. Confirm a continuous height change with no accidental node opening, relink, scroll or pinch. Pan should retain the mode; an empty tap should exit. This verifies native touch/WebView behavior and visual discoverability that desktop emulation cannot establish.
2. **Required — persistence on either physical device:** resize an area, check the matching Settings height, then restart and verify the value remains. Friends and challengers should change together. Ordinary node/gate gestures should work after leaving Area settings.

### Scope notes

- Area settings mode is view-local/transient. Only the existing four height settings persist; no translation files or platform rules are bypassed.
- Empty regions use conservative minimum widths. Fit continues to fit graph content/overflow viewports; large empty-area frames may require panning. Unlimited/automatic area-height mode is outside this patch.
- Host emulation does not prove physical iPad/Android WebView touch, OS keyboard behavior, or memory/performance characteristics. Popout validation covers document ownership/menu/frame/keyboard behavior, not every native mouse workflow.

### Next recipient

Maintainer: perform the two prioritized physical-device checks and report results. Commit/PR actions await separate authorization. Preserve this reviewed evidence until it is transferred into the feature's PR; this handoff remains transient.
