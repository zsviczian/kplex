# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.


---

# No active transfer — URL slowdown accepted locally

Root reviewed the four bounded corrections and completed the full required checks, production
build, exact native subset comparison, complete20,015-owner ordered graph equivalence, real
90-second timeout/unload regressions in both modes and original test-vault cleanup.
Final source freeze87dcf44fa7022a982d40ff60c9109c49f2c54f6bfa2cab855918ddde674dfc04;
main24e21ab49242b700125cae6367207d2edab8bcbe113b5287acb3cd184f00d032.
No pending offline work or native test controllers. Durable evidence/limitations live in
`docs/validation/url-cache-performance-2026-10-09.md` and `Refactor plan.md`.

PR95 merged and issue34 closed before this branch. The maintainer authorized URL
correction commit/publication/PR/merge from `fix-url-cache-slowdown`, then switching/fetching main.
C14 accepted; structural refactoring remains paused. No schema/settings/priority/threshold change.
