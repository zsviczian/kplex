# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---
# Offline return — SI4-R2 locality correction

## Changed files

- `src/adapters/obsidian/sourceAcquisition.ts`
- `tests/support/contributorBrowserFixture.mjs`
- `tests/source-local-dependencies-indexeddb.test.mjs`
- `tests/source-replay.test.mjs`
- `HANDOFF.md`

## Production behavior

- Acquisition now has a source-local hot lane after startup/restart authority closes. Known create/modify/metadata/alias/rename/delete work is held in bounded `Set`/`Map` state and processes only the changed `TFile`, old binding, and referrers authenticated by source-local dependency keys.
- Startup/restart, unscoped resolver waves, environment drift, or invalid local fan-out use the existing whole-inventory lane. Known events retain local lookup authority while semantic publication is fenced; unknown promotion now also advances `maintenanceRevision`, the fence consumed by GraphIndex.
- Startup captures stable source/Markdown coordinates. Hot maintenance reuses a moved owner's coordinates and appends a new owner without rebuilding whole-vault structural order.
- The 30-second timer is observation-only after readiness: it compares captured Date-property vocabulary and Daily Notes settings. With no token change it does not enumerate Vault files, inspect/visit repository sources, page heads, read bodies, or write.
- Deferred fan-out is coalesced by unique dependency key, synchronous events share one per-file fan-out task, and rename/delete tombstones wait until all events arriving during that task have captured old durable alias/path evidence. Cancellation leaves unvisited hot work queued.
- Local count-journal completion is retried directly without rediscovering source inventory. Existing R1 repair, restart reconciliation, resolver-neutral relative/subpath tokens, tombstones, and terminal high-degree backpressure remain on the same repository paths.

## Locality regression contract

The real-IDB fixture now records `getMarkdownFiles`, `getFiles`, root traversal, head pages, repository inspections, family visits, writes, local lookups/ensures/completions, body reads, and parses. New/expanded cases use 256 unrelated durable Markdown owners and assert after readiness:

- metadata/alias, create, rename, delete, recreate: `0` full Markdown enumerations, `0` structural-root traversals, `0` durable-head pages, and `0` unrelated inspections/visits/writes;
- 100 synchronous known events: exactly `1` source-local fan-out lookup, no whole-inventory work, no unrelated work, no body read/parse;
- 20 synchronous unscoped `resolved` events: one maintenance-fence increment and one cached-fact uncertain pass (`1` Markdown enumeration, `1` root traversal, `1` head page in the 258-owner fixture), with zero unchanged body reads/parses;
- unchanged idle poll: zero inventory enumeration, inspections, visits, writes, reads, and parses;
- invalid local lookup: second maintenance-fence increment, semantic readiness remains closed until uncertain reconciliation; portable GraphIndex integration additionally proves `isSemanticWriteReady()` and relationship storage candidates fail closed after `promoteUnknownFanout()`.

These counter assertions are implemented but could not be runtime-measured here because Chromium navigation is blocked by administrator policy before the test page starts. They remain the first main-agent automated check, not a claimed pass.

## Validation performed

Environment: Node `v22.16.0`; repository requires `>=22.22.2 <23`, so the requested Node floor was unavailable.

- `npm run test:sources` — **PASS**, 308/308, 0 failed, final run `19.417s`.
- Focused `node --test tests/source-acquisition.test.mjs tests/source-replay.test.mjs` — **PASS**, 21/21, including the GraphIndex maintenance-fence promotion assertions.
- `npm run test:sources:browser` — **BLOCKED**, 0/9 execute: every lane fails before test code at Chromium navigation with `net::ERR_BLOCKED_BY_ADMINISTRATOR`. A final focused run of `tests/source-local-dependencies-indexeddb.test.mjs` reaches the same blocker after the production TypeScript bundle transpiles; `file://` navigation is blocked identically.
- `npm run check:architecture` with a temporary symlink to the globally installed TypeScript 5.8.3 — **PASS**, 7/7 architecture tests; `61` migrated roots, `120` reachable files, `0` violations. The symlink was removed.
- `npm run verify` — **BLOCKED** in the supplied ZIP environment: no local dependencies. Initial run stops at missing `typescript`; `npm ci` did not complete before the execution transport timeout and its partial `node_modules` was removed. With only the temporary TypeScript shim, `check:core` reaches tests but lacks `esbuild`; its separate normalized-source assertion failure reproduces unchanged on the pristine input ZIP and is not introduced by this return.

## Main-agent verification still required

1. Run `npm run test:sources:browser` in the normal Chromium/IndexedDB environment and inspect the new locality counters above. This is the required automated acceptance gate before calling SI4-R2 complete.
2. Run `npm run verify` under Node 22.22.2+ with the lockfile dependencies installed.
3. If those pass, perform only the normal native Obsidian SI4-R2 smoke: live alias/path create/rename/delete/recreate, idle-after-readiness, Date/Daily Notes drift, and stale semantic publication/write fencing. No additional offline architecture work is requested unless those checks expose a defect.
