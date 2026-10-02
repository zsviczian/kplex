# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---
# Offline assignment — SI4-R1 durable source-local repair

Implement only the first recovery package tracked in `docs/INDEX_SETTINGS_INDEPENDENCE_DESIGN.md`.
The source ZIP represents branch `indexing-optimization-v2` at commit `5db49f3`. Git access is not
required. Return changed files uncommitted and replace this assignment with a concise results handoff.

## Scope

The active production implementation is limited to:

- `src/index/IndexedDbCache.ts`
- `src/index/SourceLocalDependencies.ts`
- `src/index/SourceRepository.ts`

Add or change focused IndexedDB tests and their test support as needed. Do not change
`sourceAcquisition.ts`, contributor discovery, cached semantic readers, settings/UI behavior,
high-degree limits, the global contributor catalog, or C15–C26.

## Required implementation

1. Make the repair format an additive **v8-to-v9** database upgrade. An exact database created by
   commit `d61dc7f` has the v8 source-local rows/owners/key counts and a four-field dependency-state
   record, but no repair store or `pending` field. Upgrade it without deleting or rewriting accepted
   source heads, chunks, postings, body cache, graph snapshots, contributor data, source-local rows,
   owners or key counts. Create the repair store and migrate the state to `pending: 0`. Fresh databases
   must also receive the complete current schema.
2. Complete the bounded repair protocol already present in the three files. Source-local rows are
   staged in bounded transactions. Source head, selected owner and repair journal become authoritative
   atomically. Old-count decrements and new-count increments resume exactly once in batches after
   cancellation, transaction failure or process restart. Lookups remain pending while any selected
   repair is incomplete and never return a partial owner set.
3. Reclaim abandoned, superseded and cancelled staging rows in bounded batches. `cleanupRevision()`
   must reclaim an unselected retired revision but must never delete the selected head/owner revision
   or either side of an active repair.
4. Preserve tombstone behavior, cross-connection CAS/fences and byte-for-byte unrelated heads. Repeated
   dependency keys from one source may use the current row-count representation, but lookup must return
   that selected source once and repair/count validation must remain exact.
5. Keep the existing `>256` active-owner backpressure behavior and its 20,015-owner test unchanged.
   High-degree continuation belongs to SI4-R3.

## Required real IndexedDB coverage

- Exact v8 fixture upgrade to v9, with all pre-existing accepted records preserved and `pending: 0`.
- A single source large enough to cross several staging and repair batches.
- Interruption before staging, between staging pages, after atomic head/owner/journal activation, during
  old-row decrement, during new-row increment, and before final journal retirement.
- Reopen/restart resumption, cancellation followed by retry, tombstone replacement, abandoned staging
  cleanup and `cleanupRevision()` safety.
- Two connections/readers proving old authority before activation, pending rather than partial data
  during repair, and exact new authority after completion.
- Repeated identical dependency keys and unchanged unrelated source heads.

Do not weaken existing assertions, timer bounds or compatibility fixtures. A fault that cannot be
injected through the existing test seam should receive the smallest repository-owned injection seam;
do not add a general framework.

## Verification

Use Node 22.22.2 or newer within Node 22 and run:

- focused new/changed tests while developing
- `npm run check:architecture`
- `npm run check:core`
- `npm run lint:obsidian`
- `npm run test:sources`
- `npm run test:sources:browser`
- `npm run verify`

Report exact commands, pass/fail counts and genuine environment blockers. This package requires no
native Obsidian claim or manual maintainer test.
