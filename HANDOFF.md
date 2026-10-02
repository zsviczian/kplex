# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---
# Offline assignment — consolidated SI4-R2 locality correction

## Baseline and scope

- Branch: `indexing-optimization-v2`
- Baseline: `5160f7a` (`Checkpoint incomplete SI4 host maintenance return`)
- Governing plan: `docs/INDEX_SETTINGS_INDEPENDENCE_DESIGN.md`, SI4-R2.
- Correct the current SI4-R2 implementation as one package. Keep its useful resolver-token, restart-repair and GraphIndex-fence work. Do not start SI4-R3, SI5 or C15–C26.

## Blocking defect

After local authority is ready, every ordinary file/metadata event still enters the full `reconcile()` path. That path calls `getMarkdownFiles()`, rebuilds structural order, inspects every Markdown source and pages every durable head. The 30-second idle poll repeats the same work with no change. Existing tests prove zero unchanged body reads, but they do not prove local maintenance cost.

SI4-R2 requires ordinary work proportional to the changed source and proven referrers.

## Required correction

1. Split acquisition maintenance into two explicit lanes:
   - **cold/uncertain lane:** first startup/restart adoption and one coalesced host-wide resolver/environment reconciliation may traverse cached inventory;
   - **known-impact lane:** after authority is ready, process only changed source IDs, old bindings and source-local referrers discovered from their dependency keys.
2. Ordinary modify/create/rename/delete/metadata/alias events must not enumerate the complete Markdown inventory, rebuild whole-vault structural order, inspect unrelated sources or page every durable head. Maintain or reuse the minimum source/order coordinates needed by the affected set.
3. An idle timer with no changed host/environment token must perform no source enumeration, inspections, family visits or writes. If polling is needed for Date/Daily Notes drift, use a cheap preflight and enter the uncertain lane only when that observation changes.
4. Coalesce known-event bursts in bounded keyed state. Do not retain one unbounded `pendingResolutionImpacts` array entry per event or replay the same source/key repeatedly.
5. `promoteUnknownFanout()` must advance the same maintenance fence consumed by GraphIndex so relationship writes and in-flight semantic publication fail closed immediately.
6. Preserve cancellation, restart recovery, R1 journal atomicity, relative/subpath/alias correctness and the existing 20,015-owner terminal backpressure boundary. Do not introduce another catalog, scheduler or semantic owner.

## Required regressions

Use a fixture with at least 256 unrelated durable Markdown owners and instrument production seams after initial readiness.

- A one-source metadata/alias modification may inspect/visit/write only the changed source and proven referrers. Assert no full `getMarkdownFiles`/structural-order/head-page pass and zero unrelated source inspections.
- Create, rename, delete and recreate have the same bounded locality property while retaining the current relative/subpath/alias results.
- An idle poll with no observation change performs zero source/inventory work.
- A burst of known events coalesces to bounded unique source/key work.
- A burst of unscoped `resolved` events causes exactly one uncertain cached-fact pass, zero unchanged Markdown reads/parses and no retry loop.
- Forced local-impact invalidity promotes to uncertain maintenance, immediately rejects stale GraphIndex publication and makes relationship writes non-ready.
- Existing R1/R2 interruption, restart, tombstone, unrelated-head, no-partial-lookup and 20,015-owner tests remain green.

Tests must measure inventory enumeration, repository inspections/visits and writes. Body-read counters alone are insufficient.

## Validation

Use Node 22.22.2 or newer when available. Run focused tests during development, then on the final candidate:

```bash
npm run test:sources
npm run test:sources:browser
npm run verify
```

Record exact results and limitations. Do not claim blocked checks as passed. Native Obsidian validation remains with the main agent after this corrected automated locality contract passes.

## Return

Leave changes uncommitted. Replace this assignment body with a concise result: changed files, final production behavior, measured locality evidence, tests run, limitations, and only the native scenarios still requiring main-agent verification.
