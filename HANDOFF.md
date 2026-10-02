# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---
# Offline results — SI4-R1 durable source-local repair

Implemented only SI4-R1. SI4-R2, SI4-R3 and C15–C26 were not changed.

## Files changed

Production:
- `src/index/IndexedDbCache.ts`
- `src/index/SourceLocalDependencies.ts`
- `src/index/SourceRepository.ts`

Focused/compatibility IndexedDB tests:
- `tests/source-local-dependencies-indexeddb.test.mjs`
- `tests/source-indexeddb.test.mjs`
- `tests/source-contributor-indexeddb.test.mjs`
- `tests/source-contributor-journal-indexeddb.test.mjs`
- `tests/source-contributor-lease-indexeddb.test.mjs`
- `tests/source-url-title-indexeddb.test.mjs`
- `tests/source-candidate-degrees-indexeddb.test.mjs`

## Implementation summary

- Bumped IndexedDB to v9. The v8-to-v9 upgrade adds only `sourceLocalDependencyRepairs` and migrates an exact four-field v8 source-local state to the five-field state with `pending: 0`; accepted v8 rows and unrelated stores are not rewritten. Fresh databases still create the complete schema.
- Completed bounded durable source-local repair. Private staging rows use a same-revision journal; cleanup first claims that journal as a durable reclaim marker, then deletes at most 256 rows per transaction while persisting its cursor. This fences a concurrent stager on another connection and makes cleanup itself restartable.
- Source-head/owner/journal activation remains atomic. Selected old-count decrements and new-count increments update key counts and the repair cursor in the same bounded transaction; old rows are deleted only with their committed decrement. The global `pending` fence remains nonzero until journal retirement, so lookups return pending rather than any partial owner set.
- `cleanupRevision()` now protects the selected source-head revision, selected local owner, both sides of an active selected repair, live staging and leases before deleting anything. Direct recovery can still reclaim abandoned backfill staging under the current source head when no local owner has selected those rows.
- Added only narrow source-local phase checkpoints for real-IDB interruption tests; no general fault framework was introduced.
- Added real-IDB coverage for exact v8 migration, >3 staging/repair batches, all six required interruption phases, cancellation/retry, transaction abort rollback, real Chromium process restart, two-connection staging fencing, repeated keys/count exactness, tombstone behavior, abandoned/backfill staging reclamation, `cleanupRevision()` safety and unrelated-head preservation. The existing 20,015-owner backpressure test body and limit are unchanged.
- Updated existing IndexedDB version/compatibility assertions from current v8 to current v9; old-version fixtures remain old versions, including the exact v8 fixture.

## Verification performed

Environment: Node `v22.16.0`, npm `10.9.2`; repository requires Node `>=22.22.2 <23`. The required Node lane is therefore unavailable here. The supplied ZIP had no installed dependencies. An attempted dependency install (`rm -rf node_modules && npm ci --ignore-scripts --prefer-offline --no-audit --no-fund`) could not complete because registry fetches returned `EAI_AGAIN`, leaving an incomplete package tree.

- `node --test tests/source-local-dependencies-indexeddb.test.mjs` — **BLOCKED/FAIL**, 0 pass / 1 fail. Chromium starts, but navigation to the harness's local `127.0.0.1` server is denied by managed browser policy: `net::ERR_BLOCKED_BY_ADMINISTRATOR`. Test code does not execute.
- `npm run check:architecture` — **PASS**, 7/7 tests; `Architecture: 61 migrated roots, 120 reachable files, 0 violations`.
- `npm run check:core` — **FAIL**, 36 pass / 3 fail after the TypeScript phase. Two failures are dependency-environment failures because the incomplete install has no usable `esbuild` package (`core-contracts.test.mjs`, `relation-core.test.mjs`). The third is the pre-existing `normalized-source-contract.test.mjs` assertion (`Assets/picture.png` vs `Never There`); `node --test tests/normalized-source-contract.test.mjs` reproduces it unchanged in the untouched input repository at 6 pass / 1 fail.
- `npm run lint:obsidian` — **BLOCKED/FAIL** before linting: `eslint: not found` because dependencies could not be installed.
- `npm run test:sources` — **PASS**, 306/306 tests.
- `npm run test:sources:browser` — **BLOCKED/FAIL**, 0 pass / 9 fail; every real-Chromium suite is stopped at harness navigation by `net::ERR_BLOCKED_BY_ADMINISTRATOR`.
- `npm run verify` — **FAIL** at `check:core` after `check:architecture` passes 7/7; subsequent verify stages do not run. The same missing-`esbuild` failures and reproduced baseline normalized-source assertion are reported.

Supplemental checks:
- focused no-emit TypeScript check of `SourceRepository.ts` + `SourceLocalDependencies.ts` — **PASS**;
- production browser bundle including `SourceRepository.ts` transpiles successfully — **PASS** (741,018 bytes);
- `node --check` on all changed browser test files — **PASS**.

## Main-agent follow-up

Run the required commands under Node 22.22.2+ with a complete dependency tree and an unrestricted real Chromium lane. In particular, the new SI4-R1 real-IndexedDB tests have compiled but could not execute in this environment, so their runtime result remains pending rather than passed. No native Obsidian validation is required for this package.
