# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---
# Offline implementation — SI4-R2 native-event locality correction

Do not start SI4-R3 or C15–C26.

## Native failures to correct

Obsidian 1.14.4 emits these production event sequences:

- create: `vault:create(TFile)` → `metadata:changed(TFile)` → `metadata:resolved`;
- rename: `vault:rename(TFile)` → `metadata:resolved`;
- modify: `vault:modify(TFile)` → `metadata:changed(TFile)` → `metadata:resolved`;
- delete: `vault:delete(TFile)` → `metadata:resolved`.

The resolved event followed the known event within 0–1 ms in the native trace. The current acquisition listener treats every resolved event as unscoped. In a ready four-Markdown-file vault, one known rename therefore performed one full Markdown enumeration plus unrelated repository inspections, visits and acquisitions. Body parses remained zero, but the known-event locality contract failed.

Creating an empty fixture folder followed by two Markdown files also made the graph coordinator record `full-rebuild:metadata:changed|vault:create|vault:create-markdown`.

## Required implementation

1. Use bounded causal state to distinguish a resolver wave already covered by known `TFile` events from a genuinely unscoped `metadata:resolved` wave. A covered wave must remain on the existing source-local hot lane. Do not rely only on a millisecond timeout, retain one entry per event, or weaken readiness/write fencing.
2. Preserve the uncertain lane: `metadata:resolved` without complete known-event coverage must still advance the maintenance fence once and run one coalesced cached-fact reconciliation with zero unchanged body reads/parses. Folder or non-file events must not be declared covered without proof.
3. Correct the observed folder/create graph dispatch so an empty folder plus ordinary Markdown creation does not force a whole-graph rebuild. Preserve folder nodes, parent relations, file materialization, aliases, unresolved-target transitions, search and evidence. Use existing incremental owners where possible.
4. Add production-like regressions that emit the exact native sequences above after source-local authority is ready. For create, rename, modify/alias, delete and recreate assert zero full Markdown enumeration, zero durable-head paging and zero unrelated inspection/visit/acquisition/write. Assert the changed source and proven referrers converge, maintenance readiness closes/reopens, and no `full-rebuild` decision occurs. Keep the existing resolved-only uncertain-pass and idle-poll tests.
5. Cover synchronous bursts, events arriving during reconciliation, cancellation/unload and a known wave followed by a later genuinely unscoped resolved event. Keep all state bounded and retain R1 repair and R3 backpressure behavior.

Run focused tests during development, then `npm run test:sources`, `npm run test:sources:browser`, architecture/core, lint and build when available. Return changes uncommitted with actual results and limitations. The main agent will run full and native validation.
