# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Inactive — foreground-first indexing accepted

Base `961da6dca8cfa24a3e32107647f88ab238e6a545`, branch `foreground-first-indexing`. Main validation agent completed implementation, independent review and exact-build host validation for `docs/INDEXING_OPTIMIZATION.md`. The maintainer reports successful main-vault testing on desktop, Android phone and iOS and authorizes commit then PR. No further implementation or manual acceptance gate remains. C14 ownership is retained; **C15–C26 remain paused**. Merge/release are not assigned.

Final `verify:obsidian` passes architecture7/core67/Node196/UI13/portable322/real-IDB294 with zero skips, indexing/settings fixtures, installed types, real build and exact-artifact native smoke. Official lint has zero errors and one retained legacy `activeLeaf` warning. Native paused acquisition5/5, desktop UX31/31 and actual-IDB20,015-owner exact-oracle stress pass within unchanged memory ceilings. Final main SHA-256 `201413f513efdb386a128037c7c2d2e4aaa1a956fc5192a2894ff2b5cb59ae01`; all269 tested runtime/test/build inputs remain unchanged.

One comparable20k warm restart passes64/64 foreground samples under normal throttling: Find58.5ms, host preview1.224s, cached graph4.179s and source authority62.492s after onload. Strict ready62.675s from disable/enable versus baseline89.950s; no statistical or causal total-speedup claim. No source reads/parses/repairs/full builds; unchanged source heads. Test vault configuration, visible center and original throttling restored; no fixtures/controllers/active inventory/scheduling owners remain.

[Validation](docs/validation/foreground-first-indexing-2026-10-05.md), [candidate evidence](docs/validation/foreground-first-indexing-candidate-2026-10-05.json), [baseline](docs/validation/foreground-first-indexing-baseline-2026-10-05.json) and `Refactor plan.md` record contracts, failures, results and qualitative maintainer acceptance. Dedicated popout migration under hydration and quantitative native cold/mobile profiling remain optional follow-ups, not claimed passes. Existing parser workers/concurrency, source schema, canonical grammar and memory budgets are retained. This inactive handoff does not authorize new work or resume refactoring.
