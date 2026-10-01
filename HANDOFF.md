# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Assignment — Delivery 1: working settings independence

Work from the supplied repository ZIP. There is no Git metadata; do not run Git commands or report commits. Return the modified repository as a ZIP and overwrite this assignment with your implementation summary and online validation instructions.

Read `AGENTS.md`, `CONTRIBUTING.md`, and [section 11 of the indexing design](docs/INDEX_SETTINGS_INDEPENDENCE_DESIGN.md#11-fixed-completion-plan). Implement **Delivery 1 only**. C15–C26 remain paused.

## Required result

Connect the accepted settings-neutral source repository and cached semantic preparation to the live application. Changing ontology roles, either inference setting, or either image-property selector must prepare and publish the current requested Plex from cached facts. With valid source coverage, a settings change must perform:

- zero Markdown body reads;
- zero parser calls;
- zero source reacquisitions;
- zero cold/full graph builds; and
- no reset of durable source progress.

This delivery must produce a real production path. Do not return another uncalled reader, proof-only API, catalog format, or design document in place of integration.

## Implementation scope

1. Replace the semantic-settings rebuild route in `main.ts:saveSettings()` with one revisioned preparation request owned through `GraphIndex`. Preserve the existing SI1 presentation-only path.
2. Reuse the existing source repository, dependency lookups, canonical compiler/resolver, and useful logic from the private pair/neighborhood/gate/degree/URL/direct-order readers. Consolidate overlapping replay and finality work; do not build or retain a second complete graph or invoke several independent full-scope compilations for one view.
3. Prepare and atomically publish one coherent current-policy result for the visible center: direct relationships, parents/children, sibling witnesses, gate totals, requested expansion, titles/aliases, search membership, provenance/explanations, and relationship-edit eligibility. Navigation must prepare newly requested scopes.
4. Capture semantic policy, presentation policy, source/dependency generation, host observation, demand, and selected metadata revisions before asynchronous work. Recheck them after awaits and immediately before publication. S1→S2→S3 may publish only S3. While preparation is pending, retain the last coherent view as updating and reject stale relationship writes.
5. If required dependency data is absent, bootstrap it explicitly from valid cached facts. This bootstrap must be separate from a settings event and must not reread Markdown. Missing/incomplete data stays pending; it is never treated as an authenticated empty result.
6. For candidates equal under all existing configured sort keys, use exact entity ID as the final deterministic tie-break in both full and scoped paths. Preserve sort modes/directions, roles, counts, evidence, title selection, URL-label precedence, and sibling meaning.
7. Add bounded work, cooperative yielding, cancellation, and useful counters for body reads, parses, source acquisition, full builds, dependency visits, and prepared/published revisions.

## Boundaries

- Do not implement Delivery 2 edit/rename/delete maintenance or Delivery 3 restart/performance cleanup beyond what is required to keep this delivery buildable.
- A source or host change racing preparation may return an explicit updating/pending state for later online validation. It must not silently publish stale data or fall back to a full rebuild.
- Do not add a generic proof framework, another persistence generation, an all-owner observer, a new parser/classifier/sorter, or unrelated refactoring.
- Preserve existing persisted data and v4 compatibility. Do not remove private code until its production replacement is integrated and tested.

## Automated acceptance

Add tests that exercise the production settings route and compare the prepared/published result with a fresh full `GraphBuilder`/`GraphIndex` oracle under the same final settings:

- move Friend→Challenger; add, remove, and reactivate a dormant frontmatter and inline field;
- toggle both inference settings with reciprocal, explicit, hidden, Date, URL, and image-only evidence;
- verify direct lists, siblings, gates, expansion, search, explanations, titles/aliases, and edit eligibility share one revision;
- verify deterministic equal-key order in every existing sort mode in both full and scoped paths;
- verify navigation, cancellation, S1→S2→S3 supersession, corrupt/missing dependency data, and source/host invalidation after an await;
- assert the zero-read/parse/reacquisition/full-build counters for valid settings-only changes; and
- assert bounded requested work without all-owner replay before the first correct normal view.

Run the focused tests while developing, then run `npm run verify` once on the final candidate if the required Node version and dependencies are available. Report exact commands, versions, results, failures, and unavailable browser/build checks. A skipped or unavailable check is pending, not passed. Leave no trailing whitespace or conflict markers.

## Return

Overwrite this assignment body with:

- the production behavior implemented;
- changed files and key decisions;
- acceptance cases passed and still pending;
- actual test/build results and environment limits;
- exact online Obsidian scenarios needed for final review; and
- any concrete blocker, including the failing case and the smallest resolution.

Do not create new subgates. If a host-only fact prevents completion, finish all independent production integration and return one precise online probe rather than starting another proof-only subsystem.
