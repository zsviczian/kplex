# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Accepted — fullscreen/Zen publication

Root independently reviewed issue#83 implementation on fullscreen-mode based at d137338. Full mandatory verification/build/exact staging and native render smoke pass at310-input freezeSHAaa344052491dd1944e2bb3c537090fa9215b1407bf7b75d62ec28b1f4ee17383; no production edits after freeze. Initial extracted camera fixture corrected without weaker assertions; root46/46 relationship tests pass.

The maintainer now reports successful testing (“It works as expected”) and explicitly authorizes commit/push/PR/merge/main synchronization. Dedicated display-driver attempt1 stopped at the locked-session prerequisite before scenarios; do not claim those cases passed. Independent final audit confirms73notes/0ownedresources/originalgeometry/desktop mode/exactartifacts and original fresh pre-staging configuration bytes. Docs/validation/fullscreen-zen-2026-10-09.md and Refactor plan.md retain this evidence/limitation distinction.

Root owns publication, then issue#2 investigation. No further offline edits authorized to this feature; C15–C26 remain paused.
