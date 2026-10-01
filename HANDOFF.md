# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Online validation hold — Delivery 1

Do not start Delivery 2 or send another package to the offline agent yet.

The Delivery 1 implementation has passed independent code review, focused production-oracle tests, the real Chromium/IndexedDB lane and the production build. Review fixes cover non-root folders and new relationships to disconnected notes.

Exact-build Obsidian validation remains pending because the running application is not accepting CLI connections. After Obsidian is restarted:

1. Run `npm run verify:obsidian` against the disposable `kplex-test` vault.
2. Verify Friend→Challenger, dormant-field activation/removal, both inference toggles and both image selectors update the current Plex without body reads, parser calls, source acquisition or a full build.
3. Verify navigation, S1→S2→S3 supersession, expanded sections, search, explanations and relationship creation to an unrelated note in the main window and one popout.
4. Race one settings change with a selected-note modification; stale preparation and writes must be rejected while the last coherent view remains visible.

If these pass, record Delivery 1 native acceptance and replace this hold with the larger Delivery 2 offline assignment from section 11 of `docs/INDEX_SETTINGS_INDEPENDENCE_DESIGN.md`.
