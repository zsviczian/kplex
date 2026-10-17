# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Inactive: PR #154 fix/merge attempt cancelled by maintainer

The user requested committing the current sorting correction, then aborting all further
fix/merge work. No active offline assignment or automatic continuation. Main owns only
checkpoint commit/push, cancellation/cleanup and returning to main. Do not implement a new
pair/display design, run performance trials, approve/merge154 or release anything.

Sorting correction preserves unrelated/removal-only role order and sorts only appended-to
roles. Focused79 and installed TypeScript checks pass on Node22.22.2. Full verification v4
was explicitly interrupted before native staging; do not report its partial run as passed.
Earlier prototype acceptance/evidence remains separate and local. No indexing benchmark
completed. Pair-level filtering versus directional labels remains unresolved; the maintainer
will likely create a separate PR. Durable status is in Refactor plan and the validation report.
