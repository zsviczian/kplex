# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---
# Main-agent validation pending — SI4-R2

No offline task is active. Do not start SI4-R3.

Branch: `indexing-optimization-v2`

Candidate: `67503a4`

Automated review passes: source 308/308, real Chromium/IndexedDB 164/164, architecture 7/7, core 60/60, aggregate Node 133/133, UI browser 7/7, lint with one pre-existing warning, production build and whitespace.

Remaining acceptance:

1. Restore Obsidian CLI attachment and run `npm run verify:obsidian` against the configured disposable `kplex-test` vault.
2. With the exact installed build, run live alias/target create→rename→delete→recreate; confirm no routine full indexing. Leave the vault idle for more than 30 seconds and confirm no indexing work. Change and restore Date/Daily Notes settings; confirm one cached reconciliation with no unchanged body reads/parses.
3. If these pass, mark SI4-R2 accepted and replace this handoff with one substantial SI4-R3 assignment. If one fails, record the exact native trace and correct only the reproduced SI4-R2 defect.
