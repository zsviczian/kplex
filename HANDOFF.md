# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---
# Offline assignment — finish SI4-R2 production scheduling and O(1) status maintenance

Do not start SI4-R3, SI5 or C15–C26.

## Base and objective

- Branch/package baseline: `indexing-optimization-v2` at `bfe52c5`.
- The prior R2 return is preserved at `1fbcf18`; keep its bounded resolver-wave and incremental folder-create behavior.
- Finish SI4-R2 by correcting two native-production defects below. Ordinary create/modify/rename/delete/recreate waves must converge automatically with work proportional to affected sources.

## Native evidence to reproduce in tests

After a normal Markdown create in a ready disposable vault, ten seconds later source acquisition was:

```text
localDependenciesReady=false
localDependencyAuthorityReady=true
enabled=true
inventory=null
pendingKnownFiles=1
pendingResolutionKeys=5
knownImpactTasks=0
requested=false
timer=null
uncertainResolution=false
localInventoryCompletionPending=false
resolutionBackpressure=false
GraphIndex building=false, rebuildQueued=false
```

The likely missed transition is the early return from `reconcileKnownImpacts()` when `retryDeferredResolutionImpacts()` retains a retryable `dependency-pending`, `unsaved`, `superseded`, storage or I/O result. Existing browser tests repeatedly call `reconcile()` and therefore mask production scheduler liveness.

The same native create also produced this K-Plex-owned call path:

```text
vault.getMarkdownFiles
  at getIndexStatus
  at notifyIndexStatus
  at the Markdown create listener
```

`cachedMarkdownFileCount` is cleared before the notification, so create/delete/recreate traverse and allocate the complete Markdown list only to update the progress denominator.

## Required implementation

1. Make retryable deferred local impacts schedule a bounded later reconciliation automatically. Preserve cancellation, unload behavior, event coalescing, terminal high-degree backpressure and the uncertain-event cached-fact fallback. Do not busy-loop or retain an unbounded per-event queue.
2. Maintain the already-known Markdown status count exactly in O(1) across Markdown create, delete and extension-changing rename. A genuinely unknown initial count may be established once. Do not weaken progress/status correctness.
3. Add a production-scheduler regression that enables normal inventory scheduling, emits native create/metadata/resolved, modify, rename, delete and recreate waves, advances real timers, and waits for readiness without calling `reconcile()` or `flush()` to drive progress. Assert that every wave closes then reopens readiness and repairs proven referrers.
4. Count K-Plex calls to `getMarkdownFiles`, `getFiles`, structural traversal, durable-head paging and unrelated source inspection/visit/acquisition/write. Known waves must perform zero such whole/unrelated work. Status updates are included in this count. The host's own internal Vault sorting is not K-Plex work.
5. Keep regressions for an uncovered `metadata:resolved` event performing exactly one cached-fact pass with zero unchanged body reads/parses, unchanged idle polling doing no work, and empty-folder plus two sequential Markdown creates producing folder/search/parent convergence without `full-rebuild:*`.

Do not replace the source repository, add another catalog/proof format, relax fail-closed readiness, remove cardinality limits assigned to R3, or change the 50 ms stale-wave retirement without new host evidence.

## Validation and return

Run the strongest available subset and report exact counts/failures:

```bash
fnm exec --using=22.22.2 npm run test:sources
fnm exec --using=22.22.2 npm run test:sources:browser
fnm exec --using=22.22.2 npm run verify
git diff --check
```

Return uncommitted changes with:

- changed files and behavior;
- the automatic-retry mechanism and why it cannot spin or strand work;
- exact scheduler/locality/status-count assertions;
- actual validation results and environment limitations;
- any remaining Obsidian-only checks for the main validation agent.
