# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Inactive — reopened V2 desktop regression accepted

Main independently reviewed the returned diff against AGENTS/CONTRIBUTING/architecture, including canonical ownership, opaque identities, current/cached/write authority, physical/policy/publication fences, bounded scope retention, mutable policy checkpoints, TSDoc/localization, settings compatibility and cleanup. No source/schema/C15–C26 expansion.

Final exact main.js `65bceafc178d368b51210a8783ae2f3786d83643096f432ffdcfc4723c73d08e`; all280 frozen inputs unchanged. RequiredNode22.22.2 full verification7/67/248/17/322/341 passes, no failures/skips/cancellations, fixture24/types/scanner/build/exact native smoke. Actual saved-Eager vault reload/cached named navigation and temporary On-demand current local named sequence pass. Reference notes/configuration/enablement unchanged, original saved Eager restored, only main.js deployed; both final instances ready and all temporary probes/wrappers/controllers removed.

Durable results, failed checks/corrections, target misses and cache/current/process/mobile limitations are recorded in Refactor plan.md and docs/validation/on-demand-indexing-v2-2026-10-06.{md,json}; design in INDEXING_OPTIMIZATION_V2.md. Persistent On-demand process-start and physical device timing remain unmeasured. V2 is checkpointed before the new URL-indexing assignment; prior checkpointe97696f already committed under explicit authorization. No automatic refactor resume or new assignment.
