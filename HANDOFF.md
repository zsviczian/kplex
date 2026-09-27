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

**State: implementation complete — main validation required.**

- Sender → recipient: offline development agent → main validation agent.
- Kind: implementation / return review.
- Objective: make the red/green index status dot reveal current index progress on hover and on click/touch. The detail shows “x of y files indexed” plus “Status: indexing” or “Status: index ready”.
- Base/source identity: user-provided `repository(20260927-133123).zip`; Git metadata is absent from the supplied archive.
- Actual capabilities: Node 22.16.0, npm 10.9.2, global TypeScript 5.8.3; project dependencies were not installed; no Obsidian CLI/runtime; offline npm cache is incomplete; no network use. A temporary local `node_modules/typescript` symlink to the global TypeScript install was used only to run portable tests and is not part of the returned files.

### Scope and architecture

- `ExcaliBrainPlugin.getIndexStatus()` now reports readiness plus published Markdown-source counts (`indexedFiles` / `totalFiles`). Ready state is normalized to total/total.
- `GraphIndex.indexedMarkdownFileCount()` exposes the existing semantic-fingerprint count, so progress reflects Markdown sources already represented by the published semantic index rather than graph node count.
- `ExcaliBrainApp` subscribes status rendering to both coordinator readiness changes and progressive index publications, allowing the count to increase during cold progressive startup.
- The dot is now a semantic button. Hover/focus opens transient details; click/tap pins the detail bubble until the dot is clicked again, Escape is pressed, or an outside pointer press dismisses it. Inspecting the detailed status replaces the one-time startup incomplete-index guidance so the two callouts do not stack.
- The same behavior is available on the empty pre-first-graph cold-start screen and on the normal toolbar.
- `InfoBubble` now permits an informational bubble with no action row; existing onboarding/startup bubbles retain their dismiss action.
- English and all bundled locales include the indexed-file progress copy and shorter ready/indexing status lines.
- The visual dot remains 9px; CSS adds an 8px invisible interaction perimeter without changing the compact toolbar footprint.

### Acceptance and validation ownership

Local/offline checks actually run:

- `node --check tests/indexing.test.mjs` — passed.
- `node --check tests/localization.test.mjs` — passed.
- `node --test tests/indexing.test.mjs` — passed, including the unchanged indexing fixture/goldens plus new status-count assertions.
- `node --test tests/localization.test.mjs` — 18/18 passed; all bundled locale catalogs remain exhaustive and the user-copy localization gate passed.
- `node --test tests/architecture.test.mjs` — 7/7 passed.
- `node scripts/check-architecture.mjs` — passed: 48 migrated roots, 89 reachable files, 0 violations.
- TypeScript `transpileModule` syntax diagnostics on all 12 modified TS/TSX source files — passed. This is syntax-only and is not a substitute for the repository build.

Unavailable/failed locally and exact reviewer reruns:

- `npm ci --offline --ignore-scripts` — unavailable: npm cache is missing `yocto-queue-0.1.0`; npm also reports the local Node 22.16.0 does not satisfy the required `>=22.22.2 <23`. No online install was attempted.
- `node --test tests/ui-components.test.mjs` — unavailable because project dependency `esbuild` is not installed.
- Full `npm run verify`, `npm run lint:obsidian`, and real `npm run build` were therefore not claimable locally. On the required Node 22.22.2 environment, run a clean `npm ci`, then `npm run verify` and `npm run verify:obsidian`. Review any Obsidian scanner warning introduced by the touched React/CSS; do not accept a stub-only type check as build evidence.

Native/manual checks for the main validation agent:

1. Cold-start with no cached index and a vault large enough to observe progressive indexing. Hover the red dot before and after first graph publication. Expected: the bubble is available even on the empty startup surface, then the count rises as published Markdown sources increase; status remains “indexing”.
2. Let indexing finish. Expected: dot turns green; detail reads total/total and “Status: index ready”.
3. Desktop mouse: hover opens the detail and leaving the dot closes a hover-only detail. Click the dot and move away. Expected: clicked detail remains pinned; clicking the dot again, clicking elsewhere, or Escape dismisses it.
4. Physical phone/tablet: tap the red and green dot. Expected: the same detail opens reliably from the enlarged hit area and remains pinned until dismissed. Long-press tooltip behavior must remain compatible with the existing delegated K-Plex tooltip contract.
5. While the one-time startup incomplete-index guidance is visible, inspect the status dot. Expected: detailed status replaces it; two bubbles must not overlap/stack.
6. Repeat in a pop-out window if available. Expected: owner-document portal placement, outside-click dismissal and Escape focus restoration behave like the main window.

### Recipient return

- Changed project files are limited to the status/progress implementation, reusable bubble behavior, localized copy, regression tests, CSS, and this handoff.
- No temporary diagnostics or runtime hooks were added. The local TypeScript symlink is excluded from the return archive.
- Next recipient: main validation agent for exact build/lint/browser/native Obsidian review.

## Main-agent acceptance — fill after independent review

- Review fixes and final source/installed artifact identities: accepted after main-agent corrections. `totalFiles` is cached and invalidated by Markdown create/delete/extension-changing rename events, avoiding a full-vault allocation on every progressive publication. Hidden K-Plex leaves no longer rerender for each progressive publication and catch up when revealed. Escape dismissal now suppresses the immediately restored focus event so a pinned detail does not reopen. Meaningful TSDoc was added around the new callbacks, and rendered regression coverage now includes an actionless `InfoBubble`. Strict Obsidian staging used source revision `85fecddc4eae1bf879e0d8ea80fcccc660ba244e` plus the dirty working tree. Source and installed hashes matched: `main.js` `1751036e87331c7244da098e5a2bef9201d1325921affb2b1ff84e12eb47ffa8`, `manifest.json` `e3bb9a35215af97f6a3394cf7fc8f7d2142bae06de94bb112fef5a05819cda62`, and `styles.css` `f6692f67bda5c9e76622bef75727bd739ee34224127aa7f970071d39b4bb7f74`.
- Required automated/native evidence and remaining coverage limits: `npm run verify` passed (architecture 7/7 with 48 migrated roots, 89 reachable files and 0 violations; core 58/58; application Node tests 105/105; rendered browser tests 6/6; Obsidian lint; typecheck/production build). `npm run verify:obsidian` passed against `kplex-test`; report: `/var/folders/b1/2dys0jfs7bq73whkl2qnyyym0000gn/T/kplex-obsidian-AuW3Xp/report.json`. Native CLI checks observed progressive cold-start counts increasing in the 20,014-file vault, red/indexing and forced green/ready copy, hover-only and pinned behavior, outside dismissal, no startup-bubble stacking, live count updates, main-window and popout owner-document placement, and Escape dismissal with focus restoration. Desktop phone emulation at 390x875 rendered the bubble fully inside the viewport (`[30,168,350,235.96875]`) and passed click/Escape behavior. No captured JavaScript errors remained. Desktop emulation cannot prove physical touch activation or long-press behavior.
- Prioritized manual tests/results or explicit maintainer acceptance of limitations: one physical-device check remains recommended before merge: on a phone, and on a tablet if readily available, tap and long-press both red and green status dots. Confirm the enlarged target opens/pins reliably, outside tap dismisses, and the existing delegated long-press tooltip still behaves normally. This is the only coverage that CLI desktop emulation cannot provide.
- Durable tracker/report/issue/PR updated: this feature handoff contains the reviewed evidence; no refactor checkpoint or architecture decision changed. Persist the result in the feature PR/issue when opened.
- Repository action authorized/performed and remaining action: review fixes and validation are present as uncommitted working-tree changes. No commit, push, or PR action was requested in this transfer.
- Final state: implementation accepted subject only to the recommended physical touch/long-press check; refactoring remains paused.
