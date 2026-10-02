# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---
# Offline assignment — SI4-R2 known-impact host maintenance

## Baseline and scope

- Branch: `indexing-optimization-v2`
- Accepted baseline: `b32e3c5` (`Complete durable source-local repair`)
- Governing plan: `docs/INDEX_SETTINGS_INDEPENDENCE_DESIGN.md`, section 11, package **SI4-R2**.
- Implement SI4-R2 as one substantial package. SI4-R3, SI5 and refactor checkpoints C15–C26 are out of scope.

## Objective

Connect the accepted v9 source-local dependency/repair machinery to production host-change maintenance. An ordinary live or restart source change must update the changed source and every proven affected source without a whole-vault contributor-catalog rebuild or rereading unchanged Markdown.

## Required behavior

1. **Known-impact changes stay local.** Modify/create/rename/delete/recreate and metadata/alias/target-resolution changes must derive the affected set from accepted old and new source-local dependencies. Refresh only those sources and demanded graph scopes. Do not scan or rewrite every owner for an ordinary change.
2. **Reference behavior is complete.** Cover resolved and unresolved references, aliases, target creation/removal, relative links and subpath links. A change in target resolution must update inbound relationships as well as the directly changed note.
3. **Restart is recoverable.** Durable dirty work or an interrupted v9 local repair must resume after reopen. Stale activation, deletion resurrection and partial lookup publication remain forbidden.
4. **Uncertain host fan-out converges once.** A host-wide `resolved`/environment event whose exact impact cannot be proven may run one coalesced reconciliation from durable cached facts. It must not reread unchanged bodies, run because settings changed, loop, or rebuild the process-wide contributor catalog.
5. **Production consumers become current.** Existing settings-preparation, graph publication and demanded-view retry paths must observe the repaired source revision. A pending repair may fail closed temporarily; it may not leave a normal supported workflow permanently pending or publish a mixed old/new result.
6. **Work remains bounded and cancellable.** Preserve final revision/demand/lifetime checks, bounded transactions and cooperative yielding. Reuse the accepted source repository, acquisition adapter, local contributor discovery and GraphIndex owners. Do not add another scheduler, semantic classifier, catalog generation or general proof layer.

The existing 20,015-owner backpressure case belongs to SI4-R3 and must remain unchanged in this package. Do not remove caps or claim SI4 complete.

## Acceptance coverage

Add focused portable and real-Chromium/IndexedDB regressions that demonstrate:

- one-source modification changes only its proven impact and performs zero body reads/parses for unchanged notes;
- create, rename, delete and recreate converge live and after restart, including tombstones and cancellation/supersession;
- alias and unresolved-target creation/removal repair inbound referrers;
- relative and subpath references select the correct affected sources;
- an interrupted maintenance transaction resumes exactly once with no partial lookup or stale graph publication;
- multiple host-wide resolution events coalesce into one cached-fact reconciliation with no Markdown rereads and no all-owner contributor-catalog bootstrap;
- unrelated durable heads remain byte-for-byte/selectively reusable;
- all SI4-R1 migration, repair, cleanup and retained high-degree-backpressure tests stay green.

Use counters or narrow test seams to prove locality and body-read/parser behavior. Do not add production debug logging or expose vault content.

## Required validation

Use Node 22.22.2 or newer when available. During development run focused tests. On the final candidate run:

```bash
npm run test:sources
npm run test:sources:browser
npm run verify
```

Record exact pass/fail counts and environment limitations. Do not report blocked or skipped checks as passed. No native Obsidian result is expected from the offline environment; the main agent will run the host scenarios after review.

## Return

Leave the implementation uncommitted. Replace this assignment body with a concise result containing changed files, production behavior, tests run, failures/limitations, and exact native scenarios the main agent must verify.
