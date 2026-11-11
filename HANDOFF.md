# Standing instructions ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in the issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.






---

# Completed note-type and node-property implementation

The maintainer approved committing, pushing and merging [PR #297](https://github.com/zsviczian/kplex/pull/297). The PR contains the final scope, validation outcomes, corrected failed-check history and remaining platform limitations.

The implementation unifies tag/type styles with a clean theme migration; shares atomic note-type/tag/property writes; provides native property display, configuration and reviewed repairs; clarifies document-property terminology; and defaults property text to 12px while preserving saved choices. No source/cache scheduler or graph-semantic schema changes were introduced.

Final source validation: 91 focused checks and 24 exact-build Windows Obsidian cases passed, together with lint, installed types, portable core, architecture and build:local. Earlier broad verification and its corrected fixture reruns completed all remaining gates; the two failed aggregate commands are documented in the PR. Mac and physical-mobile acceptance remain unperformed.

The latest 12px/copy refinement is not deployed to production. An earlier revision was copied to Zsolt's Brain without reloading K-Plex. Future production deployment must use build:local, copy only the authorized plugin artifacts and leave the running plugin loaded unless the maintainer asks for a reload. Raw validation/deployment records remain ignored and managed by the retention policy.
