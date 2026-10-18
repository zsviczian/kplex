# Standing instructions ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# PR148 release metadata — accepted, inactive

Maintainer authorizes implementation/immediate merge148 after183, no GitHub CI
wait, then main+fetch. Branch2026-10-12-issue-129-release-metadata includes main28dbdbf
at integration42fe00d3fade0ef0dcdd1693e86e68879de68c01. All code work is complete;
main validator owns only final authorized Git publication/merge. C14 remains paused.

- [x] Root package/lock version0.1.3 and AGPL-3.0-only; explicit README grant.
  Obsidian1.13.0 retained. LICENSE and all341 dependency records unchanged.
- [x] Restore nine historical version-map entries from actual published/tagged
  manifests, all minimum1.13.0; remove unsupported1.0.0 and plan-only marker.
- [x] Shared metadata owner/CLI used by verify and release before attestation,
  with strict stable/v/prerelease selection and exact shipped-manifest validation.
- [x] Independent architecture/TSDoc/workflow/source review and focused58/58 tests.
  Trailing-newline and implicit GitHub-output writes corrected before input freeze.
- [x] Full Node22.22.2 npm run verify via shared helper passes7/130/1127/165/334/632
  groups, zero failures/skips/cancellation, official lint/real typings/build.
- [x] Actual built-artifact no-publish stable/beta and wrong-tag/no-write checks pass.
  All565 inputs frozen, canonical digest560c3bd41bc3a66d2768673dc814001d5dd82d18f559a8e79f66a01a5e0b564d.

Durable source/artifact identity, public historical provenance, actual commands and
limits: docs/validation/release-metadata-129-2026-10-18.md. Private evidence under
/private/tmp/kplex148-release-evidence/. No native/vault mutation or release/tag.
No manual test needed for this scope. No further implementation/refactoring queued.
