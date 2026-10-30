# Standing instructions ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in the issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# PR240 public API and Obsidian CLI v1

State: implementing. Main validation agent to API/configuration development agents.
Identity: EXISTING branch 2026-10-30-public-api-cli, refreshed main909343a and merged validated PR239 dependency6ce6b5b. PR239 remains draft/unmerged; maintainer explicitly authorized unattended progression to240. No new branches, commits/pushes by development agents, or PR merges.

Read live PR240 specification and AGENTS/CONTRIBUTING/ARCHITECTURE/INDEXING/CANVAS_VIEW_API/PORTABLE_PRESETS. C14 remains paused. Preserve core/index/settings/session ownership; no default indexing, hydration, note reads, allPages materialization, duplicate classifiers or source models.

Ownership:
- api_recon: application publicApiContracts/PublicApi and GraphQL adapter; passive bounded GraphIndex/evidence reads; focused tests and npm test inventory (preserve root dependency install). Send finalized public port/types to root promptly.
- config_api: PublicApiConfiguration using existing validators/exporters/planner/queued writer; focused tests and API/CLI docs. Coordinate types with API agent. Root owns main factory.
- root: package graphql16.14.2 exact install, committed canvas registry/publisher/App/PlexGraph integration, main lifecycle/factory, native tests, complete verify, PR delivery. Do not edit root-owned files without coordination.

Real GraphQL read-only schema, variables/introspection, lazy construction, executeSync coherent reads, caps on input/tokens/expanded fragments/depth/cost/pages/output/work and cancellation. Public envelopes report revisions/coverage/truncation and machine errors. Ontology available from loaded settings before index. Existing settings-owned read model from239. Global readiness must use current whole-graph certificates; local/search readiness cannot imply complete graph. Bound work before overlays/evidence expand; reuse existing search catalog with bounded scan and preserve UI defaults.

Canvas snapshots read only committed owner state, distinguish canonical node vs visual occurrence vs filters/viewport, semantic links vs decorative guides, no classifier/layout rerun. Captured navigation/requestSelection/preset contributions retain existing preflight and exact canvas. Omitted canvas with multiple surfaces is ambiguous.

Configuration uses canonical package validator/exporter/import planner and existing atomic writer. Bounded expiring one-shot preview tokens and confirm:true, stale guards, disabled imported lenses, readback, durable saved/pending results. Dispose all host port closures plus tokens/registrations so old public handles cannot retain unloaded plugin/index.

PR237/238 unmerged specification drafts as initially checked; recheck before delivery, otherwise advertise exports unavailable/follow-up without duplicates. No HTTP/MCP/listeners/telemetry/note CRUD. CLI eval directly calls public API, uses reliable argument arrays/JSON envelopes/deadlines/readback; no separate executable wrapper.

Node22.22.2: C:/Users/viczi/AppData/Local/nvm/v22.22.2/node.exe. Prepend its directory to PATH for child Node commands. Native CLI requires escalation for local IPC, known Small vault C:/Obsidian/kplex-test-small, Obsidian1.14.5,117 files98Markdown. Native/cache fixture is now healthy after explicit derived-cache regeneration. All source/native/browser lanes serial; no parallel browser tests. Root runs fullverify/native exact build.

PR239 full verify+native accepted Windows results and limitations: docs/validation/ontology-descriptions-239-2026-10-30.md. Physical mobile/macOS/two-deviceSync remain separate. Return uncommitted code and actual focused test results, never claim pending root checks passed. No source or test bound weakening. Every new module/function meaningful TSDoc, all UI copy localized across8 catalogs; developer API machine diagnostics stay English and never leak arbitrary note bodies.
