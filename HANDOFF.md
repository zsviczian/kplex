# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Attachment rename rendering — main validation complete

State: scoped fix reviewed, automated validation passed and maintainer confirms the issue solved;
no active implementation assignment.
Repo main/base63c4a623aa83976ec76033fd25dc11ed861e0beb. Maintainer authorizes committing the verified correction on main; no push or PR requested. C15–C26 remain paused.

Canonical-one/DOM-two original live failure traced to mutable rename paths colliding as React
keys across independently memoized scenes. PlexGraph captures scene path/occurrence keys for
base nodes, expanded strips and child connector namespaces without altering canonical pages,
semantics, actions, indexing or schemas. Focused regression fails with predecessor/path-only
candidate and passes with final capture through stale-scene rebuild, handover, collapse and teardown.

Main independently reviewed return. Final Node22.22.2 full verify/build passes7/69/292/18/333/410,
scanner0errors/one unchanged warning; mandatory20,015-owner case passes. Frozen278 inputs
`86d39d498cde…`; exact main `c08c0cde9310…` passes serial native smoke and real FileManager
rename/collapse/re-expansion in disposable kplex-test-small. Native predecessor fixture settles
correctly: persistent failure evidence comes from original live capture and browser schedule.
Original graph now has one screenshot child and zero duplicate thought paths. Production untouched.

Test fixture/center/save/throttle and exact settings/enablement bytes restored. Initial console
cleanup failed due CLI console interception; final async captured-original restoration passes,
zero test globals/fixtures/debugger remain. No native warning-capture or performance claim.

Durable result: [validation report](docs/validation/attachment-rename-render-lifetime-2026-10-07.md),
[exact evidence](docs/validation/attachment-rename-render-lifetime-2026-10-07.json) and Refactor plan.md.
Maintainer acceptance closes the reported bug. The documented manual check was actual editor
image context-menu Rename followed by collapse/re-expand, expecting one moving child. No new touch workflow or physical-device claim.
