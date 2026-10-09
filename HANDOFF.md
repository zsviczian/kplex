# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Accepted/inactive — PR #82 integration

Root merged Action Manager PR#85 into main0c79af2, fetched/fast-forwarded localmain and cleanly merged it into PR82 indexing-status-stuck. Offline/root independent review finds no material status-hook defect; touched documentation now explains hidden terminal readiness. Runtime headf9b62d3/freeze308SHAce009519… passes full7architecture/69core/416general/20UI/333portable/410Chromium/scanner0/types/build/exactstage. Native seven controlled production-React readiness/visibility/mode cases pass, exact original descriptors/subscription counts restore and controller retires. Actualpost-probe ready6/73 matchesDOM.

Audit73notes/0ownedresources/closedSettings/originaldesktopgeometry/exactartifacts/drainedqueues. Fresh17,104-byte dataSHA91752945…/enablement/hotkeys{} restored/readback; no subsequentreload. Durable report docs/validation/indexing-status-integration-2026-10-09.md/json + Refactorplan. CI unchangedP15 wall-clock bound failures56.2/60.9/65.3/63.2ms against<50ms remain recorded as a separate follow-up; no new queued work or measured cause found, no gate relaxation. Root has explicit authority to commit/push/merge82 and synchronize main; no new assignment, structuralrefactor, release or personal-vault deployment.
