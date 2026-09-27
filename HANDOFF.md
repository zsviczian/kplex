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

**State: main-agent review and local validation complete; changes remain uncommitted. Physical-device checks listed below remain pending.**

- Objective: GitHub feature request #32, file-backed node **Open** submenu, plus the maintainer's pair-preserving adjacent-pane requirement.
- Branch/base: `open-from-context-menu`, `4d4e0e103d0421298df2146015d21df05758fb0c`.
- Environment: macOS, Node 22.22.2, installed Obsidian API package 1.13.0, Obsidian CLI/runtime 1.14.2 (installer 1.14.0), disposable `kplex-test` vault.
- Main agent reviewed the complete change against AGENTS.md, CONTRIBUTING.md, docs/ARCHITECTURE.md and docs/AGENT_WORKFLOW.md. No commit/push/PR was performed.

### Review findings and corrections

1. The original untyped `MenuItem.setSubmenu()` failed real lint/build validation. The subsequent click-to-replace-menu workaround compiled but broke the requested hover interaction. Runtime inspection confirmed `setSubmenu` exists in Obsidian 1.14.2. `src/adapters/obsidian/nativeSubmenu.ts` now isolates its narrow optional declaration and delegates hover, keyboard/touch navigation and cleanup to native Obsidian. If the capability is absent, localized actions appear as a flat group; no misleading click-to-replace submenu is used.
2. `getLeaf("split")` used global active-leaf state and could insert between Plex and its Sidecar. Adjacent opening now receives the originating `hostLeaf`. `src/adapters/obsidian/adjacentFileLeaf.ts` splits beyond the pair on its existing axis: right of a horizontal pair, below a vertical pair. With no Sidecar it splits to the right of the originating Plex. Temporary split geometry is fenced by the existing Sidecar ownership guard until layout settles. A follow-up maintainer check exposed a zero-width pane with a left Sidecar: pixel flex bases retained by Sidecar movement consumed the full split. `ensureAdjacentFileLeafSize` now shares the outer anchor's existing allocation only when the new pane has no usable extent, using the existing native sizing helper and leaving nonzero allocations/other panes alone.
3. **Focus open tab** excludes graph surfaces but includes actual native file tabs, including Sidecars and deferred file tabs. It reveals an existing matching leaf without creating a duplicate.
4. Added executable adapter regression tests for native submenu delegation/fallback and all four split-anchor choices. The indexing harness also executes the actual main.ts sizing method for collapsed width/height, unchanged nonzero sizes and unrelated split boundaries. Updated production wiring guards and the indexing test harness's real-module inventory.

### Final implementation and architecture review

- `PlexGraph.tsx` builds the localized menu and delegates workspace effects. Reusable native submenu/split helpers live at the Obsidian adapter boundary; main.ts owns native file-opening effects and Sidecar lifetime.
- Phone: new tab and conditional existing-tab focus. Tablet: adds adjacent pane. Desktop: additionally permits pop-out. Existing environment policy determines capabilities.
- New strings are catalogued in `src/lang/en.ts`; no settings schema, stable commands, semantic index/parser/compiler rules or durable user data changed.
- New modules and affected functions/callbacks have TSDoc. Native menus use the existing owning-document display/dismissal path. No custom DOM/CSS menu implementation, permanent global test API or lifecycle resources were added.

### Automated validation

- `npm ci` on Node 22.22.2: passed with real project dependencies.
- `npm run verify:obsidian`: passed. This runs the full `npm run verify` before staging the exact build and checking native startup.
  - Architecture: 7/7 tests; 35 migrated roots, 76 reachable files, zero violations.
  - Core lane: 58/58.
  - Official Obsidian ESLint and production TypeScript/bundle build: passed.
  - Indexing fixture groups: passed.
  - Aggregate Node tests: 103/103; browser UI tests: 4/4.
  - Exact dist artifacts installed/reloaded in `kplex-test`; registered command, rendered graph and no captured JavaScript errors: passed.
- Host runner evidence: `/private/tmp/kplex-open-width/report.json`; full lane output: `/private/tmp/kplex-open-width.log`. These are local transient artifacts, not included in repository exports. The report contains exact source/staged bundle hashes.
- Follow-up sizing change: full `verify:obsidian` passed on the exact updated build. Newly added sizing regression cases additionally passed in `node scripts/run-indexing-tests.mjs` after the full lane.
- `git diff --check`: passed.

### Focused Obsidian runtime validation

- Desktop native submenu model contains a genuine submenu. For observable hover assertions only, native menus were temporarily switched to Obsidian's DOM-menu mode on those ephemeral menu instances. Trusted CDP pointer movement opened the child while the parent remained connected, showing focus/new-tab/adjacent/pop-out choices. Selecting **Open** retained the parent; selecting **Open in new tab** created one file tab and dismissed the menus.
- Closed-file availability changed from focus=false to focus=true after opening it in a Sidecar. Focus revealed that exact Sidecar and did not increase file-tab count.
- Pop-out action opened the requested file in a different owning document. Test-created window/leaf was closed.
- Right Sidecar: actual workspace order was Plex → same Sidecar → new file pane; managed identity, linked leaf and pinned synchronization remained intact.
- Follow-up size validation: reproduced pre-fix left Sidecar → Plex → new pane widths of 326/326/0 px. After the fix, all four positions had nonzero dimensions and retained ownership. Repeating right→left movement with explicit pixel bases gave a new pane width of 85.6 px within a deliberately crowded three-group test workspace; it shared the 166.3 px outer anchor allocation rather than remaining collapsed. Normal native allocations were left unchanged.
- Left/above/below Sidecars: each retained the same managed and linked leaf, original adjacent position and pinned synchronization after opening the outer file pane. Test panes were detached.
- Tablet emulation at 900×875: native child menu contained new-tab + adjacent-pane and retained its parent; no pop-out.
- Phone emulation at 390×875: native selection navigated within the phone menu to **Open in new tab**, with native **Open** back navigation. Child scroll was attached and the parent menu remained connected; no adjacent/pop-out actions.
- Sizing harness: background throttling was temporarily disabled to let main-window animation frames settle while a pop-out was present, then restored. Between repeated scenarios, test-created pixel bases were cleared to establish fresh native allocation; no production sizing policy was overridden during the measured operation. Test-created leaves were removed. The earlier placement/linkage tests did not assert width; the follow-up explicitly measures dimensions.
- Harness caveat: reusing a hidden phone Menu instance produced an invalid probe, so that result was discarded and the real context-menu event was repeated on a fresh instance. The fresh-instance result passed. Desktop emulation is not physical touch/WebView proof.
- Cleanup: test leaves/Sidecars/pop-out removed, temporary wrapper/global removed, original graph center restored, mobile emulation disabled, CDP viewport override cleared, native desktop window restored to 996×795. Final `dev:errors`: no errors captured.

### Prioritized remaining manual checks

1. **Desktop, quick confirmation:** hover **Open**, select **Open in adjacent pane** with a left Sidecar after moving it from the right, and confirm the new right-hand pane is visible and the pair stays together and Sidecar follows subsequent graph navigation. Automated host assertions passed; this confirms the maintainer's visible native-menu experience.
2. **Physical phone/tablet:** long-press a file node, enter **Open**, select an action, and dismiss/back out. Confirm touch selection works once and does not close the parent prematurely. Phone must omit adjacent/pop-out; tablet must omit pop-out. Desktop mobile emulation passed but cannot establish native touch/WebView behavior.

No further manual indexing/performance tests are needed for this workspace-only change. Retain the private submenu bridge as the single owner rather than duplicating casts or replacing native hover with a separate menu. Commit/PR actions await maintainer instructions.
