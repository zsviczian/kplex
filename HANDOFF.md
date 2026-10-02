# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---
# Offline return — SI4-R2 native-event locality correction

Do not start SI4-R3 or C15–C26.

## Implementation

- `src/adapters/obsidian/sourceAcquisition.ts`
  - Added constant-size resolver-wave causal state. Known `TFile` create/rename/modify/delete/metadata events mark one covered wave; folder/non-file causes poison that wave.
  - The first `metadata:resolved` closing a fully known live wave is consumed without advancing the global host/maintenance fence. A later/uncovered resolved event retains the existing coalesced uncertain lane.
  - State is single-wave only (`known`, `uncovered`, generation, one retirement timer), not per-event. The timer only retires stale causal proof if the traced host close never arrives; it is not the coverage decision. `close()` cancels it.
- `src/index/GraphIndex.ts`
  - Extracted path-local folder-page and file-tree-edge materialization helpers from per-file membership reconciliation.
  - Added `insertCreatedFolder(TFolder)` to materialize only the root-to-created-folder ancestry, file-tree evidence, search membership, caches and snapshot persistence without structural inventory traversal.
- `src/main.ts`
  - Ready/full-snapshot folder creates now use `insertCreatedFolder()` when no rebuild is in flight instead of adding the structural `vault:create` backlog reason. Markdown create + metadata events therefore remain on the existing per-file patch lane.
- Regressions:
  - `tests/source-acquisition.test.mjs`: covered native close, later unscoped resolved, and folder/non-file uncertainty.
  - `tests/source-local-dependencies-indexeddb.test.mjs`: exact native create/rename/modify(alias)/delete/recreate sequences; locality counters/readiness/referrer repair; synchronous waves; event during reconciliation; folder uncertainty; unload; later unscoped resolved.
  - `tests/indexing.test.mjs`: empty-folder ancestry/search materialization plus the observed empty-folder + two-Markdown-create coordinator sequence with no `vault:create` structural reason and no full rebuild.

## Changed files

- `HANDOFF.md`
- `src/adapters/obsidian/sourceAcquisition.ts`
- `src/index/GraphIndex.ts`
- `src/main.ts`
- `tests/indexing.test.mjs`
- `tests/source-acquisition.test.mjs`
- `tests/source-local-dependencies-indexeddb.test.mjs`

No SI4-R3 or C15–C26 implementation was changed.

## Actual validation

- `NODE_PATH=$(npm root -g) node --test tests/source-acquisition.test.mjs` — **PASS, 11/11**.
- `NODE_PATH=$(npm root -g) npm run test:sources` — **PASS, 310/310**.
- `node --check tests/indexing.test.mjs` and `node --check tests/source-local-dependencies-indexeddb.test.mjs` — **PASS**.
- `NODE_PATH=$(npm root -g) node tests/indexing.test.mjs` — the new folder materialization/coordinator assertions execute and pass, then the suite hits the existing P15 performance gate: `URL-heavy post-parse graph patch blocked timers for 70.4 ms` (`<50 ms` required). The pristine supplied archive fails the same assertion on this host at **70.4 ms**. A diagnostic run with only that threshold temporarily changed to `<500 ms` completed all indexing fixtures: **assertions 1–68 + P1–P17 PASS**. The checked-in `<50 ms` assertion was restored immediately.
- Architecture: with a temporary symlink to the preinstalled TypeScript 5.8.3 (removed afterward), `npm run check:architecture` — **PASS, 7/7; 61 migrated roots, 120 reachable files, 0 violations**. `tsc -p tsconfig.core.json` also exits **0** with that compiler.
- `npm run test:sources:browser` — **BLOCKED/FAIL, 0/9 executed successfully**: every real-Chromium file aborts at harness startup with `Chromium page blocked: net::ERR_BLOCKED_BY_ADMINISTRATOR`. The new IndexedDB/native-event regression therefore still requires a permitted Chromium run.
- `npm run check:core` — cannot complete in the archive environment: `esbuild` is not installed for two test files; the remaining portable lane also exposes the supplied baseline `normalized-source-contract` assertion (`Assets/picture.png` vs `Never There`), which reproduces unchanged in the pristine archive. The command's initial core TypeScript compile itself passed when TypeScript was supplied as above.
- `npm run lint:obsidian` — **BLOCKED**, `eslint: not found` (exit 127).
- `npm run build` — **BLOCKED**, dependency/type packages are absent (`obsidian`, React, etc.; exit 2), so no new `dist` was produced.

## Environment limitations / main-agent validation

The archive contains no `node_modules` and no Git metadata. Host Node is **22.16.0**, below the repository engine requirement `>=22.22.2 <23`. `npm ci --ignore-scripts --offline` cannot hydrate dependencies because the cache is incomplete (`yocto-queue` missing); a normal install did not complete in this environment. No Obsidian CLI/runtime is available.

Main-agent validation remains required with the repository Node/dependency baseline and permitted Chromium/Obsidian 1.14.4:

1. Run `npm run test:sources`, `npm run test:sources:browser`, `npm run check:architecture`, `npm run check:core`, `npm run lint:obsidian`, the normal indexing/full test lane, and a real `npm run build`.
2. Re-run the native 1.14.4 traces for create/rename/modify/delete/recreate and verify the exact R2 counters: zero full Markdown enumeration, zero durable-head paging, zero unrelated repository inspection/visit/acquisition/write, readiness close/reopen, and correct referrer convergence.
3. Re-run the empty-folder + two-Markdown-create trace and verify no `full-rebuild:*` decision is recorded while folder pages/parent evidence/search and both Markdown notes converge.
4. Retain the resolved-only uncertain case as one coalesced cached-fact pass with zero unchanged Markdown body reads/parses.
