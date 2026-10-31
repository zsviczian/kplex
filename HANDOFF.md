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

State: accepted/inactive for implementation and Windows validation. Main validation agent to maintainer for review and merge authorization. No automatic refactor continuation.

Identity: EXISTING branch 2026-10-30-public-api-cli. PR239 was implemented, fully validated and pushed as 6ce6b5b; it remains draft/unmerged. PR240 includes that dependency and latest main f99aa39 (merged PR237), via 618c5f4. Development agents returned uncommitted work; root reviewed, corrected and delivered it on the same branch. No PR was merged by this task.

Outcome: versioned trusted API, early ontology/descriptions/inverse discovery, bounded canonical graph/evidence/search reads, actual read-only GraphQL, truthful coverage, committed per-canvas snapshots/context, targeted native actions, and canonical configuration preview/confirmed queued import/readback. Public Markdown export reuses merged #237's exact scene capture/formatter; image #238 remains unavailable. Official Obsidian CLI eval calls the same API. No additional indexing pass, default source read/hydration, duplicate settings writer, classifier, listener or remote service. C14 remains paused.

Independent review covered lifecycle/owning-document and session leases, immutable settings ownership and ABA guards, revision coherence, canonical-vs-occurrence identity, bounded work/output, literal authored text, privacy, existing components, meaningful documentation and scanner/layer direction. Review fixes include pure keyboard-key to public-occurrence translation, group/decorative authority, finite scene/variable metadata, and complete callback-fixture dependencies. No existing assertion or timing/work bound was weakened.

Validation: Node 22.22.2, Windows 10.0.26200, Obsidian 1.14.5/installer 1.14.5, disposable Small vault only. Fullverify: architecture 9/core 130/main 1,749/browser 425/sources 357/IndexedDB 855, no skips; actual installed types, scanner, production build and exact-build native smoke pass. The existing 20,015-owner cached-publication regression passes exact metadata/evidence/gates/degrees, cancellation and zero IO. Final native API and reload probes pass on the same artifact: independent main/popout roots/views/filters/actions, Facets preset readback, stable canvas migration identity, Markdown bytes equal native preview, confirmed disabled-lens import with readback, zero passive reads/parses/acquisitions/rebuilds/semantic invalidations/allPages, old handles retired and host ports released. Configuration/enablement bytes and baseline layout restored.

Durable records: docs/validation/ontology-descriptions-239-2026-10-30.md; docs/validation/public-api-cli-240-2026-10-30.md; docs/validation/public-api-cli-240-summary.json. API/CLI usage and architecture ownership are documented. Runtime was frozen during the successful full run; later changes are validation documentation and native-driver robustness only.

Remaining: macOS window lifecycle, Obsidian 1.13 minimum-host acceptance, physical mobile input and actual two-device Sync. Highest-probability manual checks: editor-save refusal during targeted navigation, macOS popout teardown/migration, physical mobile controls under incomplete indexing. No paint or comparative startup-performance claim. Keep both PRs draft/unmerged until the maintainer authorizes the next repository action. No implementation work remains pending in this handoff.
