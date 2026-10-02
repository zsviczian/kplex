# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---
# Offline return — SI4-R2 known-impact host maintenance

## Status

SI4-R2 is implemented on the supplied `b32e3c5`-based repository. The accepted R1 repair/journal remains the storage authority; no process-wide contributor catalog was restored and the 20,015-owner terminal backpressure behavior is unchanged for SI4-R3.

## Files changed

- `src/index/SourceLocalDependencies.ts`
- `src/index/SourceRepository.ts`
- `src/adapters/obsidian/sourceAcquisition.ts`
- `src/index/GraphIndex.ts`
- `tests/source-acquisition.test.mjs`
- `tests/source-contributor-summary.test.mjs`
- `tests/source-local-dependencies-indexeddb.test.mjs`
- `tests/source-replay.test.mjs`
- `HANDOFF.md`

## Implementation

- Extended the existing source-local derivative with resolver-neutral lexical memberships for unresolved, alias, relative and subpath candidates. Accepted R1 owners remain readable and are upgraded in place to the new projection from selected durable `values`/`metadata`; source heads are not rewritten. Appended memberships publish through the existing R1 selected-count repair journal, including interruption/reopen recovery and closed-world lookup fencing.
- Live create/modify/rename/delete/metadata events capture current plus durable path/alias evidence before the changed source or old binding can replace it. Bounded local lookups mark only proven referrers `resolutionDirty`; transient lookup states are retried after R1 inventory closure and newly discovered referrers are repaired in the same reconcile pass. Rename/delete tombstones wait for that impact capture while remaining immediately visible to repository `flush()` ownership.
- Startup reconciliation upgrades accepted R1 local owners once from durable cached facts, compares current MetadataCache/physical facts with selected durable metadata, and repairs offline create/rename/delete/recreate plus affected inbound owners. Unchanged referrers are replayed from durable facts; unchanged Markdown is not reread. Storage-unavailable current-process heads retain the existing degraded-mode behavior instead of being misclassified as offline recreation.
- Unscoped `metadataCache.resolved` waves and Date/Daily Notes environment drift are coalesced into one cached-fact maintenance wave. Known source events do not advance the global resolver host revision; the reversible legacy environment validator contract is preserved. No settings change triggers source acquisition or a global contributor-catalog bootstrap.
- Added a host-maintenance revision consumed by GraphIndex semantic preparation/publication. A host change immediately fences relationship writes and stale asynchronous scope publication; the last coherent view may remain readable while repair is pending. Current demanded scopes retry through the existing inventory-ready path after repaired source/local-dependency authority is closed.
- Preserved the accepted R3 boundary: the 20,015-owner hot-key lookup still rejects with `backpressure` before row scanning; no cardinality cap was removed or converted into an unbounded operation.

## Validation and environment

Final candidate checks:

- `node --version` -> `v22.16.0` (**below** the repository baseline `22.22.2`; this environment did not provide a newer Node).
- `npm run test:sources` -> **PASS: 308 tests, 308 passed, 0 failed**.
- `npm run test:sources:browser` -> **PASS: 162 tests, 162 passed, 0 failed**, including R1 migration/repair/restart/cleanup, R2 live/restart target+alias+relative/subpath cases, and the retained 20,015-owner terminal-backpressure case.
- `npm run verify` -> **FAIL / environment+baseline blocked**. `check:architecture` completed first with **7/7 tests passed, 0 architecture violations**. `check:core` then reported **39 tests, 36 passed, 3 failed**: `tests/core-contracts.test.mjs` and `tests/relation-core.test.mjs` cannot import missing package `esbuild`; `tests/normalized-source-contract.test.mjs` has the pre-existing assertion `expected 'Never There', actual 'Assets/picture.png'`. Running `node --test tests/normalized-source-contract.test.mjs` against the untouched supplied repository reproduces that assertion unchanged (**6 passed, 1 failed**). Because `verify` short-circuits at `check:core`, `lint:obsidian`, the general `npm test`, and `npm run build` were not reached in this environment.
- Dependency/network limitation: the supplied ZIP has no installed dependency tree. A temporary local TypeScript link was used only in the working validation environment and is not part of the return ZIP. `timeout 15s npm ping` reached `PING https://registry.npmjs.org/` and timed out with exit 124, so missing packages could not be installed here.
- Browser capability: `/usr/bin/chromium` is available. The container has a managed `URLBlocklist=["*"]`; the browser tests were run with a temporary localhost allow policy owned by the test wrapper, and the original managed policy was restored after the run.
- Git: the supplied archive has no `.git` metadata and no Git operation was used.
- Native Obsidian: not available in this offline environment, as expected by the assignment.

Focused evidence from the new browser regressions:

- live alias add/remove/restore and target create/rename/delete/recreate converge through source-local repair; alias-only changes perform **0 Markdown reads/parses** and create/recreate reads/parses only the changed target;
- offline create/rename/delete/recreate repairs inbound relative/subpath and alias references after reopen; unchanged referrers/unrelated notes are not body-read, and the unrelated selected head remains reusable;
- accepted R1-owner resolver-token upgrade resumes exactly once after interruption and does not rewrite source heads or create global contributor-catalog rows;
- multiple unscoped resolver events coalesce behind one maintenance fence in the portable acquisition test, with zero body reads/parses in the cached/degraded seam;
- stale GraphIndex demanded-scope preparation is rejected after a host event, relationship writes fail closed, and the last coherent page remains readable until current repair publishes.

## Native scenarios for the main validation agent

1. **Live target lifecycle/locality:** use `Folder/Ref.md` containing both `[[../Target#Heading]]` and `[[AliasTarget#^block]]`, plus an unrelated Markdown note. Create `Target.md` with alias `AliasTarget`, remove/restore the alias, rename to `Renamed.md`, delete it, then recreate `Target.md`. After each event verify inbound relationships/gates/search/explanation follow Obsidian resolution, unrelated source completion stays reusable, and diagnostics show no unchanged-note body reads/parses or full/global contributor-catalog bootstrap.
2. **Offline restart lifecycle:** with the same fixture, close Obsidian between offline create -> rename -> delete -> recreate mutations. On each reopen verify tombstones and inbound relative/subpath/alias resolution converge before relationship writes are enabled; unchanged referrer/unrelated bodies must not be reread.
3. **Resolver/environment coalescing:** trigger a burst that causes multiple host `resolved` observations, then exercise a Date-property/Daily Notes interpretation change. Verify one bounded cached-fact maintenance wave per coalesced observation, zero unchanged Markdown body reads/parses, no settings-triggered acquisition/global catalog bootstrap, and eventual demanded-view/write readiness.
4. **Publication race:** keep a demanded Plex visible, start settings/demand preparation, then mutate/rename its referenced target before the preparation publishes. Verify stale preparation never publishes, relationship editing/storage candidates fail closed while repair is pending, the prior coherent read view may remain visible, and the repaired demanded scope becomes current without a full rebuild.

SI4-R3 and SI5 remain pending; this return does not claim SI4 complete.
