# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---
# Offline assignment — finish SI4 source-local settings independence

Complete the current uncommitted source-local dependency implementation and Delivery 2 together so SI4 can close. Stay within `docs/INDEX_SETTINGS_INDEPENDENCE_DESIGN.md`; C15–C26 and repairs to the rejected global contributor-catalog design remain out of scope.

## Preserve

- Keep the production settings path independent of `SourceContributorDiscovery.rebuild()` and the process-wide contributor catalog.
- Keep revision-bound source-local dependency rows, atomic selected-owner/head activation, request-scoped semantic preparation, authenticated empty results, and settings changes with zero Markdown reads/parses/reacquisitions/full builds when valid facts exist.
- Keep database changes additive. The current work is still uncommitted, so correct the v8 design directly rather than adding v9.
- Retain the review fixes already present in the working tree, including browser migration fixtures and the temporary indexing build manifest entries for both new modules.

## Defects to resolve

1. `npm run verify` fails the existing P15 timer gate: `URL-heavy post-parse graph patch blocked timers for 51.7 ms` and `62.7 ms`. Source-local projection currently performs one-shot large-key work, including sorting/materializing/digesting the complete key set. Activation also updates every changed key count in one transaction. Make large single-source projection, staging, activation and cleanup byte/record bounded and cooperative without weakening the timer assertion.
2. Abandoned or superseded staged `sourceLocalDependencies` revisions are not reclaimed by `cleanupRevision()`. Repeated failed/cancelled writes must not grow durable stale rows or make a small active lookup hit backpressure.
3. Clean-restart adoption checks only each source's physical/environment fields. If a target, alias, path or resolution input changed while the plugin was closed, an unchanged referrer can retain a stale resolution family. Compare a narrow durable/current host inventory and reconcile affected source-local dependencies before declaring readiness. An exactly unchanged restart must still reuse heads without rewriting every resolution family.
4. A live modify/delete event increments the global host revision; the next reconciliation rewrites unrelated source heads. The browser review reproduced B.md changing after an A.md event. Known-impact edit/create/rename/delete must update the changed source and proven affected dependencies only. Uncertain fan-out must use one coalesced cached-fact reconciliation, with no unchanged-body reads/parses and no global catalog rebuild.
5. Any requested node/tag/URL-origin dependency with more than 256 active owners is permanently `backpressure`. Replace the one-shot cap with bounded continuation to eventual completion. Never publish a partial neighborhood, gate, degree or title result. Cancellation/supersession must discard partial work and release leases/state.

## Required coverage

- Preserve full-compiler parity for Friend↔Challenger, dormant fields, both inference switches, both image selectors, tags, URLs, structural relations, gates, siblings, labels, search and provenance.
- Add real IndexedDB cases for a large single source, interruption at each staged/activation boundary, stale-row cleanup, retry, and concurrent selected readers.
- Add restart cases for unchanged vault reuse and offline target/alias/create/rename/delete changes affecting unchanged referrers.
- Add live event cases proving unrelated heads remain byte-for-byte unchanged where impact is known and uncertain events converge without Markdown reads/parses of unchanged notes.
- Replace the 20,015-owner test that expects permanent backpressure with deterministic bounded continuation to a correct final result. Include cancellation and supersession during continuation.
- Keep the production settings route free of Markdown inventory enumeration after readiness, source-head writes, resolution-family refreshes, the global catalog and full builds.

## Verification

Run, with Node 22.22.2 or newer within Node 22:

- `npm run check:architecture`
- `npm run check:core`
- `npm run lint:obsidian`
- `npm run test:sources`
- `npm run test:sources:browser`
- `npm run verify`

Return the implementation uncommitted. Report exact commands/results and remaining environment blockers. Do not claim native Obsidian acceptance; the main agent will run exact-build settings, event, restart and large-vault scenarios.
