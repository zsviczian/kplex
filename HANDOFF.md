# Standing instructions ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in the issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# PR #278 implementation return

Implementation completed on 2026-11-03-issue-277-creation-links-compass, tested base c0e6166. Maintainer authorized commit/push/merge on 2026-11-04; merge handoff in progress. No release or explicit issue closure; no delegation. Production read-only except authorized K-Plex main.js/styles.css deployment. Testing only disposable vaults.

Current completed follow-up: native shared UI/layout for Facets preset, color sources, ontology property selection, Markdown export and dependent Today pin fields. Generic Templater receipt barrier covers all native creation and exact-file recovery. Template execution stays outside mutation-priority scopes; property writes/publication remain prioritized afterward. Existing source-gate/RTL/modifier defaults, structural folder/import UX, shared mobile native modal shell, CTA/Pins repairs and sanitized index recovery diagnostics are retained.

Actual final-build validation: 423 focused tests passed (93 UI/adapter + 242 contracts + 88 scheduler/event convergence), zero failed/skipped; real installed-type production build, portable types, lint, architecture and numeric-control audits passed. Five serial native lanes passed: template-lifecycle (actual Templater2.26.0), ontology-export, pin-settings, controls, preset-ui; exact settings/enablement/layout/117-file98-Markdown baseline restored. Suspended templates did not block P1/P4 or trigger full semantic builds. Current main.js 770fd253b59a2a255a4d4fbf656d15ac66394efe1a23cdf45f8aaea25bb1836e; styles.css 78514221527af91cbd2088b4d055c34d9e766abb788ce6e792787a39d26bb35a; manifest unchanged 8c65b0d38a506f8fa9fc3311b81ea22bcda48e0209e9190483752c1f20834326.

Current evidence: [authoring UI/templates](docs/validation/authoring-ui-templates-278-2026-11-04.md), matching JSON/source inventory/screenshots; [integration seam](docs/TEMPLATE_CREATION.md), [UI rules](UI_RULES.md). Older source-gate/diagnostic evidence: docs/validation/source-gate-recovery-diagnostics-278-2026-11-04.md. Earlier full aggregate results remain historical artifact-specific evidence, not a new full-suite pass.

Residual limits: one unexplained disposable renderer crash during repeated enable/reload staging, recovered by reloading only Small, not reproduced in repeated/final runs; cause remains unknown. Mac/physical mobile untested. Guarded unpublished Templater handler validated2.26.0; future timers/global active-editor commands require explicit targeting. Production personal template untouched. Initial callback investigation docs/validation/daily-note-sidecar-automation-2026-11-04.md is superseded by the full Templater follow-up for creation coordination, but its active-editor target finding remains valid.

Original unexpected full-index-recovery fragility is NOT resolved: docs/validation/index-recovery-observation-2026-11-04.md. Do not bypass stale-input fences or equate new diagnostics with a recovery fix. The new P0 correction protects creation-template waits only.

Production deployment completed 2026-11-04T18:45:24.2621248Z: exact main.js/styles.css hashes verified, prior files backed up, manifest unchanged. Receipt .test-work/brain-ui-deployment.json and durable validation JSON. No production reload or template/settings/manifest/workspace edits. Mac Sync/load not verified. Prioritized manual checks: Mac theme/layout; personal file-targeted Sidecar template; physical keyboard/scroll reachability. Full detailed results and remaining limits are in the current validation report.
