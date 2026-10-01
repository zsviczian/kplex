# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Inactive — delivery plan reset, 2026-10-01

The maintainer has **not sent** the `7b7b3ca` private foreground-composition assignment. That assignment is withdrawn. Do not implement it or send the previously exported `repository.zip` as a current task.

Read the [updated SI0–SI5 design and fixed completion plan](docs/INDEX_SETTINGS_INDEPENDENCE_DESIGN.md#11-fixed-completion-plan) and the active SI delivery tracker in [Refactor plan.md](Refactor%20plan.md). SI0–SI3/private SI4a are accepted; the live settings correction is still incomplete. C15–C26 remain paused.

**Next owner: main validation agent.** After maintainer review of the revised design (including the explicit equal-key tie proposal), complete delivery 1's finite native preflight and prepare one integrated production-settings assignment. Reuse the accepted implementation at `9b8116a`; do not start another private proof-only slice. This inactive document authorizes no offline implementation, Git operation or release. No new ZIP is needed until an implementation handoff is ready.
