# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.



---

# Inactive — browser indexing performance checkpoint accepted locally

Branch `fix-browser-indexing-performance`, base `2a1fbb1`; implementation/tests/docs are uncommitted.
No offline assignment or process remains active. Root independently reviewed the storage/compiler
return and scoped source-publication URL task boundary, then completed all required local gates.

Final frozen runtime/test inputs319, SHA
`2931af7a9668103e30c022dd04486a83a23bd977761e085cca8fc3a60d2be122`.
Full verification passes architecture7/core88/aggregate496/UI20/portable333/browser417, zero
failures/skips, installed scanner/types/production build and exact-build native render/error smoke.
Both original performance cases pass locally. Controlled uninstrumented CPU4 gap54.0→35.5 ms;
native dense active-URL/canonical/search/cancel/retry/alias scenarios pass, maxgap34.9 ms.
Native cached ontology/inference/image/navigation checks pass without measured reads/parses/
acquisitions/full builds; warm source head unchanged. Original test-vault settings/workspace/window/
platform/throttling and configuration bytes restored with delayed SHA verification;73 notes,
no owned fixtures/controllers/hooks, owned sleep inhibitor stopped.

The actual GitHub Ubuntu run remains unproven. Neither local transaction reduction nor CDP
throttling establishes that the Linux deadline/timer failures are fixed. Preserve the unchanged
CI guards and rerun that environment after maintainer-authorized publication. No commit/push/PR/
merge was requested for this branch. C15–C26 remain paused; no further optimization queued.
Durable results, failed native-driver setup attempts, risks and receipts are in
[Refactor plan.md](Refactor%20plan.md) and
[validation record](docs/validation/browser-indexing-performance-2026-10-09.md).
