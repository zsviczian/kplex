# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---
# Offline assignment — replace the global settings catalog with source-local dependencies

Complete one substantial Delivery 1 correction. Delivery 2 beyond the source-local maintenance needed here, SI5 acceptance and C15–C26 remain out of scope.

## Problem to remove

The committed Delivery 1 route makes settings preparation depend on rebuilding a process-wide contributor catalog. In the 20,015-source native vault it validates and refreshes every resolution family, writes 183,715,567 source bytes, then fails before activation because one fragmented bucket reaches 256 pages. Do not repair the v5 codec, increase the page cap or add another whole-vault catalog format. The rejected v5 return has been removed.

## Required implementation

Replace the production settings dependency path with a durable source-local lookup maintained by source activation/replacement/deletion.

- Reuse the existing neutral source heads, immutable family chunks, source postings, summaries/journal where useful, canonical semantic compiler/resolver, semantic policy revisions and Delivery 1 consumer/publication routing. Do not create a second graph or classifier.
- Trace the actual production settings request from `saveSettings()` through `GraphIndex` and its readers. Remove the requirement that `bootstrapSemanticDependencies()` complete a vault-wide `SourceContributorDiscovery.rebuild()` before a requested scope can become current.
- Serve field, target, literal and incoming/outgoing contributor lookup from revision-bound source-local records. Candidates must be filtered by the activated head so replacement and deletion cannot leak obsolete postings. Structural/tag/URL support and authenticated empty results must remain correct.
- Maintain the lookup with the same source lifecycle that activates a source revision. An ordinary source replacement or tombstone must change only that source's memberships plus directly affected derived scopes. Preserve crash, cancellation, stale-writer and concurrent-reader safety.
- Keep host-sensitive resolution freshness separate from settings policy. A settings-only change must not refresh every resolution family or start host reconciliation. If current host evidence is unavailable, report the affected scope pending; do not claim empty/current and do not start a full build. Implement only the bounded host handling required for the clean-host settings scenarios; record broader uncertain-host reconciliation for Delivery 2.
- Remove obsolete production bootstrap/retry state and diagnostics introduced solely for the global catalog route. Existing private/legacy catalog code may remain only when a real compatibility/test caller still requires it; do not add a parallel production path.
- Reuse durable data across plugin reload. Startup may compare inventory/heads, but a new process epoch alone must not rewrite every unchanged resolution family or rebuild a vault-wide dependency generation before settings preparation.
- Keep all work byte/record bounded, cooperative and mobile-safe. No source/vault paths, property names or values may enter diagnostics.

## Required regression coverage

1. Production settings route: Friend↔Challenger, dormant field add/remove, both inference switches and both image selectors publish correct requested relationships without Markdown reads, parses, source reacquisition or a full build.
2. Assert settings-only preparation performs no all-source enumeration, global contributor rebuild, resolution-family refresh or source-head write.
3. Navigation/supersession retains the committed Delivery 1 behavior: new scopes prepare on demand and S1→S2→S3 can publish only S3.
4. Source replacement and tombstone tests prove activated-head filtering, no stale memberships and work proportional to the changed source/affected dependencies.
5. Restart/reopen tests prove unchanged durable lookups are reused and genuine missing/corrupt source-local data fails closed without deleting unrelated sources.
6. Compare scoped results with the established full-compiler oracle for roles, evidence/provenance, gates, siblings, labels and search membership. Do not weaken existing bounds, timers or golden expectations.
7. Include a 20,015-source deterministic regression showing the settings path remains bounded without constructing a global catalog; it must model skewed/hot dependencies rather than only uniform rows.

## Return

Return the implementation uncommitted. Update this handoff with the files changed, final architecture, compatibility decisions, actual test commands/results and any checks blocked by the offline environment. Do not claim native Obsidian acceptance.
