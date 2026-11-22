# Standing instructions ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in the issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.






---

# Connection ontology editing: publication handoff

State: implementation and automated validation complete. Maintainer explicitly requested commit and merge to main, then switch to main and fetch. No new assignment or refactor resume.

Branch: feat/change-connection-ontology; base 33c420013a574108b7aba22bcfa7888f863f1565.

Scope: precise single-YAML or matching reciprocal ontology replacement, including Markdown owners linked to attachments; six-direction Define/Add/Change; inferred context-menu Define; compact details action toolbar and source groups; staged Hide setup without an extra confirmation; current metadata property API; body-ontology YAML-only editing hint in all eight locales. Preserve Markdown body, unrelated values and exact source/native identity guards.

Validation on Node 22.22.2: release/architecture/core/lint and full indexing passed. Initial npm run verify stopped on six missing finite fixture prerequisites after 2546 general passes; fixtures corrected and all six rerun green (details 26, reciprocal 34). Remaining npm test lanes passed 620 browser, 393 portable source and 1104 real IndexedDB/source tests, without skips. Final appearance callback regression suite passed 64 tests. Local and production builds passed. Latest body-hint details/localization suite passed 58/58, scoped lint and production build passed. Validation commit gate and diff checks pass.

Evidence remains ignored/managed: .test-work/validation/2026-11-22-connection-ux-LO6nUI and .test-work/validation/2026-11-22-body-ontology-hint-NoULTT. Do not claim the original aggregate verify invocation passed.

Recorded limitation: final native light/dark/narrow/main/popout acceptance remains pending while the maintainer uses the PC; their explicit publication request follows disclosure of this limitation. macOS and physical mobile remain untested. Do not take PC control without coordinating a window. Native lane verify:obsidian:ontology-change is prepared, not run on the final artifact; rebuild build:local before deferred exact-build Small-vault testing. The existing managed staging wrapper freezes/restores artifacts/config/layout under the shared host lock.

Production Zsolt's Brain remains read-only except separately authorized main.js/styles.css deployment. No production files or settings were changed and no deployment was performed. Current dist is the latest production build and is not committed.
