# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# Final indexing checkpoint — reviewed and verified

Direction: main validation closeout after offline implementation and independent review. Branch
`indexing-fixes`, implementation base `1527b6ebf9644c035fe845303971d0eb30cc641f`. The maintainer
explicitly authorizes commit, push, PR and returning the local checkout to main. No active agent,
repository or native-driver wait; no new implementation assignment. C15–C26 remain paused.

The cumulative branch fixes early local/count publication and independent cached URL acquisition,
then adds priority/stable publication, visible presentation repair, automatic drawing formatting,
Responsive/Balanced/Faster background pacing, visible-row counts/cross-links and truthful URL-cache
progress. Existing semantic, provenance, revision and lifecycle owners remain authoritative.
Factory defaults are On-demand/Responsive; actual reference preferences are Eager/Responsive.

Exact final-source `npm run verify` and real build pass on Node22.22.2: architecture7/core69/Node292/
UI17/portable333/browser410, zero browser failures/skips/cancellations, scanner0errors/one unchanged
warning. Mandatory20,015-owner fixture passes. Frozen271 inputs `db4ed1d3…`; six extra configuration
hashes unchanged. Main `56aa837741e7…` matches the tested/deployed artifact. The unmodified native
runner passes command/DOM/error checks in the disposable small vault on that exact build.

Production-reference qualitative UI acceptance is confirmed by the maintainer. Serial prior
Eager/On-demand reference functionality and the final warm-label/counter check pass. Continuous
focus/paint timing is unavailable and remains excluded; physical mobile, high-degree full-scene
filter/section performance and the broader few-second startup target remain open. Failed/excluded
observations are retained. Final cleanup preserves notes/current center/settings/enablement,
removes all temporary controllers/foreground leases and resumes background work.

Durable final checks, identities, cleanup and three prioritized manual checks are in
[the throttle report](docs/validation/indexing-throttle-and-url-responsiveness-2026-10-07.md),
[exact evidence](docs/validation/indexing-throttle-and-url-responsiveness-2026-10-07.json), and
[progress](Refactor%20plan.md). Git actions follow the current explicit authorization; no merge,
release or further automatic optimization is assigned.
