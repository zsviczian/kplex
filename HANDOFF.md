# Standing instructions ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# PR183 main reconciliation — main validator active

The maintainer explicitly authorizes reconciling and merging PR183, without waiting
for GitHub CI, then switching to main and fetching. Implementation checkpoint:
`e847a50`; incoming main: `658793f` (#181 and #182). C14 remains paused.

- [x] Commit previously accepted startup fix and its regression/native evidence.
- [x] Preserve both new test entries and all append-only feature ledger records.
  Runtime PlexGraph changes merge cleanly: #181 hover projection and #183 recovery
  own separate effects; #182 settings reconciliation remains intact.
- [ ] Independently review combined runtime and run full npm run verify on Node22.22.2.
- [ ] Run applicable exact-build Small native smoke, restore original config/content.
- [ ] Publish reviewed PR result and merge without waiting for GitHub CI.
- [ ] End on synchronized main and fetch; mark this handoff inactive.

Prior startup acceptance and caveats remain in
[the validation report](docs/validation/startup-center-investigation-2026-10-18.md).
Its artifact hashes and test counts describe the pre-reconciliation build, not the
new combined build. Personal-vault access remains read-only except authorized
main.js deployment. No personal note/settings writes or screenshots are needed.
Small testing/deployment remains authorized. No new feature or refactoring queued.
