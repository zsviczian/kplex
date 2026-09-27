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

**State: accepted and validated; committed for pull request to close issue #36.**

- Sender → recipient: main validation agent → maintainer.
- Kind: validation report / pull request.
- Objective: implement GitHub issue #36, “Draggable desktop dialogs to reveal the Plex behind forms,” starting with the Add Link / Add Child (`NewRelatedNoteModal`) flow while preserving native Obsidian modal lifecycle and all existing mobile/tablet behavior.
- Base commit/branch: `main` at `4d4e0e103d0421298df2146015d21df05758fb0c`.
- Environment & capabilities: Node v22.22.2, npm 10.9.7, global TypeScript 5.8.3, Obsidian CLI 1.14.2 (installer 1.14.0), native test vault `/Users/zsviczian/Obsidian/kplex-test`.

### Scope and implementation reviewed

- `src/ui/components/DraggableDialog.ts`: host-free owner-document drag mechanic. It accepts only dialog/handle DOM elements and owns pointer geometry, edge clamping, resize re-clamping, and cleanup; no Obsidian/plugin dependency or global state.
- `src/ui/NewRelatedNoteModal.ts` and legacy compatibility copy `src/ui/NewRelatedNoteModal.tsx`: opts into dragging through the native title shell only when `readObsidianPresentationEnvironment(...).device === "desktop"`. Byte identity is preserved between the two files.
- `styles.css`: theme-neutral CSS hooks for `.kplex-draggable-dialog.is-positioned`, grab/grabbing cursors, and cursor reset for interactive children. No hard-coded colors or `!important` rules.
- `tests/indexing.test.mjs`: source-regression assertions for desktop-only gating, title-shell integration, owner-document pointer capture, and window-teardown cleanup.
- `tests/ui-components.test.mjs`: headless browser test for form focus preservation, background pointer event isolation, edge clamping, resize clamping, interactive title control exclusion, reopen cleanup, and pop-out document boundary isolation.

### Main-agent validation results

1. **`npm run verify` on Node v22.22.2**:
   - `check:architecture`: PASS (7/7 tests, 36 migrated roots, 77 reachable files, 0 violations).
   - `check:core`: PASS (58/58 tests).
   - `lint:obsidian`: PASS (eslint `src/**/*.{ts,tsx}` with 0 errors and 0 warnings).
   - `test`: PASS. `run-indexing-tests.mjs` passed all assertion sets without tripping cooperative timing guards on this environment; 101/101 unit/collector/contract tests passed; 5/5 browser behavior tests in `ui-components.test.mjs` passed (including `DraggableDialog owner-document browser behavior` in ~888ms).
   - `build`: PASS (`tsc --noEmit --skipLibCheck && node esbuild.config.mjs production`).

2. **`npm run verify:obsidian` in native test vault `kplex-test`**:
   - PASS. Artifact hashes verified and staged (`dist/main.js`, `dist/manifest.json`, `dist/styles.css`).
   - Plugin reload, command registration, rendered `.excalibrain-app` K-Plex view verified with no captured JavaScript errors.

3. **Live Obsidian pointer & modal runtime verification**:
   - Opening Add Child modal starts in native centered layout (`is-positioned: false`, no inline `--kplex-dialog-*` coordinates).
   - Pointerdown on title without movement does not activate positioning.
   - Pointer drag past 3px threshold moves dialog, sets `--kplex-dialog-left` / `--kplex-dialog-top`, and preserves input focus and typed text.
   - Interactive controls in title (`select` role dropdown) are excluded from drag initiation and remain operable without moving the modal.
   - Viewport edge clamping verified against 8px margin (`left: 8px, top: 8px` at top-left; `left: 308px, top: 687px` at bottom-right in 996x795 viewport).
   - Window resize re-clamps dialog within visible viewport.
   - Escape closes the modal cleanly.
   - Reopening returns to native centered positioning with no stale drag coordinates (`leftVar: "", topVar: ""`).

4. **Dialog-scope review for future rollout**:
   - Inspected `RelationModal` and `RelationshipExplanationModal`. Both use native Obsidian `Modal` with plain text titles and standard lifecycle. Both are confirmed as strong candidates for the next rollout step once the maintainer accepts the current baseline.

### Recommended manual check

1. Open K-Plex in desktop Obsidian, trigger **Add child** (or **Add parent/friend/challenger**), drag the dialog by its header text to inspect the canvas behind it, change the relationship role dropdown in the title, and close the dialog via Escape or confirm. Expected: smooth dragging, operable role dropdown, and centered layout upon reopen.

### Next action

Pull request submitted to close issue #36. Ready for maintainer merge.
