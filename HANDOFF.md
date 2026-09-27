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

**State: implementation complete; full-environment and Obsidian validation pending.**

- Sender → recipient: offline development agent → main validation agent.
- Kind: implementation / return review.
- Objective: implement issue #18 direct manipulation of configured Plex area heights. Hovering empty Plex space inside a populated parent, child, friend, challenger, or sibling area reveals that area's configured-height frame; the resize edge becomes solid/accented and can be dragged to update the same persisted setting exposed in Settings. Parents/friends/challengers/siblings resize from the top; children resize from the bottom.
- Base identity: source ZIP `repository(20260927-133622).zip`; Git metadata is absent in the supplied archive, so no commit/branch or initial dirty-state check was possible.
- Offline capabilities used: Node `v22.16.0`, npm `10.9.2`, Chromium at `/usr/bin/chromium`, global TypeScript `5.8.3`. No Obsidian CLI/runtime. The repository had no `node_modules`; network/package bootstrap was not used. Repository baseline requires Node `22.22.2`, so exact-build validation belongs to the main agent.

### Scope and implementation

- `src/ui/layout.ts`: added `zoneAreas`/`ZoneAreaBounds`, separate from scroll viewports. Area bounds represent the configured maximum-height rectangle even when content does not overflow; existing `zoneViewports` still appear only when scrolling is needed. The bounds intentionally use the same anchors as the overflow viewport: parents are bottom-anchored, children top-anchored, and lateral/sibling areas use their existing fixed bottom limits.
- `src/ui/PlexGraph.tsx`: added empty-canvas hit testing, hover/active frame state, pointer-captured vertical resizing, live layout revision, min/max clamping matching the Settings sliders, and persistence through `plugin.saveSettings(false)`. Left/right share `friendMaxHeight`. Area resizing takes precedence over empty-canvas panning only when the pointer is on the configured resize edge. Nodes, gates, connector hit paths, expanded clusters, controls and form elements are excluded from the area-hover/resize surface. Camera position is preserved during resize and FLIP node animation is suppressed while the drag is active.
- `styles.css`: added transient dashed/solid area-frame states using Obsidian theme variables only; no hard-coded new colors, `!important`, or SVG/icon assets.
- `HANDOFF.md`: this validation packet.
- No schema/default migration changes; existing persisted height keys remain the single source of truth. No localization strings were added.

### Offline validation actually run

- `npm run build` — **not runnable to completion in this checkout**. It failed immediately at TypeScript resolution because `node_modules` is absent (`obsidian`, `react`, and their typings cannot be resolved). This is an environment/bootstrap failure, not a passing build.
- `node --test tests/architecture.test.mjs` — initially unavailable because local `typescript` was absent. A temporary local symlink to the globally installed TypeScript package was created only for validation; with that in place the architecture test passed **7/7**.
- `node scripts/check-architecture.mjs` — passed: **48 migrated roots, 89 reachable files, 0 violations**.
- TypeScript `transpileModule` syntax/transpile check with TypeScript 5.8.3 — passed for `src/ui/layout.ts` and `src/ui/PlexGraph.tsx`. This is not a substitute for the repository build/typecheck.
- Temporary `node_modules` validation symlink must not be included in the patch and is removed before packaging.

### Main-agent validation tasks

1. Use the repository-required Node `22.22.2`, install the lockfile dependencies, then run `npm run verify` (including architecture, core checks, Obsidian scanner lint, tests, and the real production build against installed Obsidian typings). Treat any new scanner warning/error in the touched files as a defect.
2. In native Obsidian, test each populated area at camera scale 1 and at a non-1 zoom after panning:
   - blank space inside the area shows one faint dashed frame; hovering a node, gate or connector does not show it;
   - approaching the configured resize edge makes the frame solid/more visible and shows the vertical-resize cursor;
   - parent/friend/challenger/sibling drag from the top; child drag from the bottom;
   - dragging changes height continuously without camera jumps, accidental node activation, relationship creation/relink, or canvas pan.
3. Verify setting coupling/persistence:
   - parent updates `parentMaxHeight`; child updates `childMaxHeight`; sibling updates `siblingMaxHeight`; both friend and challenger update the shared `friendMaxHeight`;
   - opening Settings immediately reflects the dragged value; changing the slider still changes Plex behavior; reload/restart preserves the dragged value.
4. Exercise the transition through the overflow threshold in both directions. When content becomes taller than the configured area, the existing bounded scroll zone must appear and its frame/resize edge must stay geometrically aligned. When enlarged enough to fit content, normal non-scroll rendering must return without losing nodes or filters.
5. Regression-check empty-canvas interaction modes (smart/legacy/middle-only), native zone scrollbar dragging, node drag/relink, gate drag, connector hover/context menu, filter controls, and autozoom/fit. The resize gesture should win only on the active horizontal area edge.
6. Validate desktop leaf, pop-out, and sidepanel surfaces because the setting is global while camera/layout profiles differ. On mobile/touch, confirm existing pan/pinch/scroll behavior is unchanged; direct resize discovery is hover-driven and Settings remains the fallback configuration surface.

### Remaining risks / review notes

- Area frames exist only for zones containing at least one node, because an empty relationship set has no horizontal bounds from which to derive a meaningful rectangle. The issue wording was interpreted as “empty pointer space inside an area,” not “an area with zero relationships.”
- Auto-fit continues to fit rendered nodes/scroll viewports rather than sparse configured-area emptiness. This preserves current graph scale; very large configured heights may place part of a transient frame offscreen until the user pans. Review this product choice in native UX before changing fit behavior.
- The main agent should review whether the exact Settings slider min/max values are the desired drag clamps. Current drag clamps intentionally match the visible Settings controls: parent 140–800, friend/challenger 140–800, sibling 120–700, child 160–900.

### Next recipient

Main validation agent: review the implementation, run the exact dependency-backed verification and native Obsidian scenarios above, fix any issues found, and only then accept/commit under normal repository authority.
