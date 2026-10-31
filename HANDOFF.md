# Standing instructions ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in the issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# PR239 accepted implementation; PR240 next

State: main-agent validation complete for available Windows/portable lanes; both PRs remain draft/unmerged.
Identity: existing branch 2026-10-30-ontology-descriptions, following f526c1548ce45e4cc8cbc69b63eea30bba819adf (main909343a incorporated). Final commit/push is main-agent-owned.

Implemented optional exact-physical-field descriptions with independent inverse wording, the existing atomic settings writer, all native/React ontology surfaces and eight catalogs. Pure core/contracts/ontologyReadModel is the API handoff. Description edits/receipts never change semantic policy or enter source refresh. Alias/prototype/caret/conflict/retry regressions included.

Node22.22.2: complete npm run verify PASS; architecture/core/official Obsidian ESLint/actual types/build PASS. Regression batches1698/425/357/855 all PASS. Exact-build native smoke PASS on Obsidian1.14.5. Native descriptions PASS (three writes, zero reads/parses/acquisitions/rebuilds/invalidations, semantic revision unchanged); narrow manager12 cases PASS; actual plugin reload retains both descriptions and physical YAML evidence. All cleanup PASS.

Earlier harness inventory omission and browser pre-assertion startup timeout were retained and resolved by correction/full rerun without relaxed bounds. Broad native fixture initially had dependency-invalid derived cache; existing purge/reload regenerated98 source heads while preserving notes/settings/trust/workspace. All final native lanes passed afterward.

Durable evidence and artifact hashes: docs/validation/ontology-descriptions-239-2026-10-30.md. Physical mobile/macOS/two-device Sync remain separate checks. No release or PR merge authorized.

Next: main agent publishes existing PR239, then switches to existing 2026-10-30-public-api-cli, refreshes main and carries239 dependency without a PR merge, per explicit unsupervised progression. Reuse this header and overwrite this body for the API assignment.
