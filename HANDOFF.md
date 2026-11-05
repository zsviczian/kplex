# Standing instructions ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in the issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# Accepted / inactive implementation

Maintainer authorized commit, push, PR creation and merge on 2026-11-05. Branch: 2026-11-04-source-recovery-progress; base: 71e9ab4. Implementation acceptance is complete; GitHub PR state records publication. No release or production deployment requested.

Accepted scope: avoid duplicate cached-source selections during conservative recovery while retaining exact native/source/sequence fences and coordinate CAS; correct extracted browser-fixture helper imports; enforce validation storage/retention through agent rules, pre-commit/CI checks and bounded local cleanup; retire five expired, unreferenced raw JSON reports. Raw evidence stays in ignored managed storage, not Git.

Validation: prior unchanged recovery source passed 122 real IndexedDB cases and 360 source contracts plus the custom indexing harness and exact-build native Small retry (99 owners, one selection each, zero Markdown reads/parses, subsequent edit and no extra full build; exact state restored). Final 18 policy tests, all 26 ui-components cases, release/architecture, official source lint, installed types and production build passed before publication. Policy tests also passed with the CI base environment inherited; pre-commit explicitly checks the index. PR description owns detailed actual commands/results and CI status. No additional dated validation document.

Limits: the original Mac storage-unavailable event is not reproduced or claimed fixed. Mac production throughput and physical-mobile acceptance remain unverified. The maintainer authorized this merge with those disclosed limits. No personal-vault content/settings/template changes. Preserve all freshness/publication safeguards.

No active implementation assignment remains. The publication handler must finish the authorized PR merge and synchronize local main. No automatic follow-up implementation or refactor resume.
