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

- Sender → recipient: offline development agent → main validation agent.
- Kind: implementation / return review.
- Objective and user-visible expected behavior: make index-indicator status reflect the actual startup phase instead of showing `0 of …` during IndexedDB hydration; make the startup incomplete-index guidance a persisted one-time callout and add the requested “Hover the index indicator to see current status” guidance.
- Base/source identity: user-provided `repository(20260927-153637).zip`; Git metadata is absent from the archive, so no commit/branch identity is available and the input was treated as the authoritative base.
- Actual capabilities: Node 22.16.0 / npm 10.9.2; global TypeScript 5.8.3; no installed repository packages; no browser package/runtime validated; no network use; no Git metadata; no Obsidian CLI/runtime.

### Scope and architecture

- `ExcaliBrainPlugin.getIndexStatus()` now reports explicit phases: `loading-cache`, `preparing`, `checking-cache`, progressive `indexing`, `updating`, and `ready`. File counts are shown only in the progressive indexing label, so IndexedDB hydration no longer presents a misleading `0 of total` status.
- `GraphIndex` emits once when background snapshot hydration completes so visible status can leave “loading index from cache” immediately even when the graph itself did not otherwise change at that boundary.
- The startup guidance uses new persisted setting `startupIndexInfoBubbleSeen`. It is set and saved when the guidance is first claimed, implementing the strict “display only once” interpretation: after the first presentation it does not return on later Obsidian sessions, whether it was manually dismissed or disappeared because indexing became ready.
- The startup message now reads: `Indexing in progress. Graph and search results are incomplete. Hover the index indicator to see current status.` Bundled locale catalogs were updated exhaustively for the new phase strings and guidance text.
- No semantic indexing/cache format was changed. No Obsidian API additions were introduced.

### Acceptance and validation ownership

Offline checks completed:

- `node tests/indexing.test.mjs` passed all existing indexing fixture groups after temporarily exposing the globally installed TypeScript module only to the test harness. New assertions cover cache-loading status, progressive `x of y` status, ready status, and persistence/one-time behavior of the startup callout.
- `node --test tests/localization.test.mjs` passed **18/18** localization tests with the same temporary TypeScript-only harness link.
- Direct TypeScript compilation of `src/lang/*.ts` with global TypeScript 5.8.3 passed; all new status keys format successfully for `en`, `de`, `es`, `fr`, `ja`, `nl`, `ru`, and `zh-TW`.
- Syntax transpilation of every touched TypeScript/TSX source passed via global TypeScript 5.8.3.
- `node --check tests/indexing.test.mjs` passed.

Unavailable/incomplete checks:

- `npm ci --offline` failed because `yocto-queue-0.1.0.tgz` is not present in the local npm cache. The repository also requires Node `>=22.22.2 <23`, while this agent has Node 22.16.0. Therefore `npm run verify`, official Obsidian lint, the real repository build, and exact installed-Obsidian type validation were not run here and must not be inferred from the portable checks.
- No Obsidian CLI/runtime or physical iPad is available to this agent.

Main-agent required validation:

1. On required Node 22.22.2 with dependencies installed, run `npm ci`, `npm run verify`, and `npm run verify:obsidian`. Confirm zero new `eslint-plugin-obsidianmd` findings in touched code and a successful real production build.
2. Warm startup with a populated IndexedDB cache, preferably on physical iPad as well as desktop: while hydration is active, hover/tap the indicator and verify it says the localized equivalent of `Status: loading index from cache` with no `0 of …` line; verify it transitions away from cache-loading without reopening the tooltip.
3. Cold startup after removing the semantic cache: verify the indicator progresses through preparation into `Status: indexing x of y files`, `x` increases as progressive publication advances, then reaches `Status: index ready`.
4. Stale warm cache with one or more changed Markdown files: verify the status can report `checking cached index for changes` before becoming ready, without presenting stale file-count progress as active indexing.
5. One-time callout: set/remove `startupIndexInfoBubbleSeen` so it is false, start K-Plex while indexing is incomplete, confirm the message includes `Hover the index indicator to see current status`, then restart Obsidian and confirm the callout does not return. Also confirm ordinary later runtime re-indexing never reopens it.
6. Physical touch check on iPad: tapping the status indicator still pins/unpins the detail bubble correctly and the one-time guidance does not interfere with the existing click/touch interaction.

### Recipient return

- Changed files: `src/main.ts`, `src/settings.ts`, `src/index/GraphIndex.ts`, `src/ui/App.tsx`, all eight bundled locale files under `src/lang/`, and `tests/indexing.test.mjs`; this `HANDOFF.md` is also updated for transfer.
- No temporary repository files, test symlinks, generated build output, or dependency folders remain in the returned tree.
- Next recipient: main validation agent for exact-build/lint/native review and the targeted warm/cold/iPad scenarios above.

## Main-agent acceptance — fill after independent review

- Review fixes and final source/installed artifact identities:
- Required automated/native evidence and remaining coverage limits:
- Prioritized manual tests/results or explicit maintainer acceptance of limitations:
- Durable tracker/report/issue/PR updated:
- Repository action authorized/performed and remaining action:
- Final state: accepted/inactive or named pending work; no automatic refactor resume.
