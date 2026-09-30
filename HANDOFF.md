# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Assignment — SI4 finite candidate raw-degree input

**Direction/state:** main validation agent → offline development agent. Use the reviewed commit and standard repository.zip supplied with this handoff; the archive has no Git metadata. Start from the clean exported tree. Return changes uncommitted. SI4b1/SI4b2/SI4c/SI5 are still open; C15–C26 remain paused.

## Accepted baseline and purpose

The bounded private URL-title input slice is accepted after Node 22.22.3 source 228/228, architecture 7/7, core 60/60, lint/build, and serial real Chromium/IndexedDB 131/131. Aggregate verify still fails the unchanged 50 ms URL-heavy timer (57.7 ms in the reviewed run). See docs/validation/settings-independent-indexing-si4-url-title-review-2026-09-30.md. The source and body store, v3 derivative order and existing private center-gate/relationship certificates are the baseline; do not rework them opportunistically.

The next independent missing input for exact visible-list sorting is each finite candidate's **raw canonical neighbor-map size**. GraphIndex.sortNeighbours uses page.neighbours.size for Connections ascending/descending, including relations hidden from a visible view. The existing center/parent cover may omit unrelated incident pairs, so its over-cover compilation cannot supply this degree. This assignment closes only that finite candidate-degree premise, or returns a precise counterexample if it cannot be closed safely.

## Work

1. Trace the actual full GraphBuilder → binding → GraphIndex path for raw neighbor-map size. Characterize directed/inferred/hidden/structural/tag/URL relations, duplicate declarations, semantic-path collisions, zero-degree negatives and stable encounter order. Use a fresh full GraphIndex as oracle; do not create a second relationship classifier, degree selector or alternate sort implementation.
2. State an explicit invariant for one finite exact candidate set under a single current root, clean host, captured semantic policy and live demand. Determine whether complete per-candidate contributor incidence plus canonical replay yields each full-build raw degree without retaining a second full graph. Prove both positive and negative coverage, including candidate pairs with declarations from either endpoint. Distinguish one candidate's complete incidence from the already accepted center/parent relation cover. If the existing discovery cannot prove the invariant, stop at a documented smallest missing contract and characterization tests; do not label a partial count ready.
3. If the proof is sound, implement an **uncalled private** finite candidate-degree input. Bound candidate count, owners, pages, decoded bytes and work; return pending/backpressure for hot ranges. Preserve exact NodeId/SourceId/physical/semantic identity, current selected heads, root/journal, host/source observations, policy and demand through the final await. A changed root or any open source/host ticket, including known unrelated impact, must prevent ready. Return only exact candidate IDs with raw degrees and a distinct certificate. No sorting, title selection, visibility filtering, top-N, graph publication or production caller.
4. Add meaningful portable full-builder/GraphIndex parity and negative/fault/fence tests. If production storage changes, include real IndexedDB reopen/abort/corruption coverage; otherwise explain why the existing derivative format suffices. Keep v2/v3 relation and URL-title behavior intact. Protect source/head/body writes and settings-time reads/parses/inventory scans with explicit guards. Do not weaken any existing golden or timing bound.
5. Update the focused SI4 proof/design docs and append an **unaccepted return** in Refactor plan.md. Replace this handoff body with actual results, changed files, environment/version limits, pending checks and precise main-agent validation instructions. Record unavailable tests as pending, not passed.

## Exclusions and separate online prerequisite

The native MetadataCache completion/physical-revision trace for selected scalar/alias values is still pending in an explicitly configured disposable Obsidian vault. Do not infer it from doubles or implement a scalar/absence title reader. Hot-range continuation, complete visible lists, changed-host S2b, settings/UI/search routing, SI5 and C15–C26 are outside this package. Do not turn this private input into a user-visible independence claim.

## Review/return bar

Read AGENTS.md, CONTRIBUTING.md, docs/INDEX_SETTINGS_INDEPENDENCE_DESIGN.md, docs/SOURCE_CENTER_GATE_PROOF.md, docs/SOURCE_CONTRIBUTOR_DISCOVERY.md and docs/AGENT_WORKFLOW.md. Use the repository's required Node >=22.22.2 <23 and actual dependencies where available; report version/tool limitations candidly. Run npm run test:sources, npm run check:architecture, npm run check:core, npm run lint:obsidian, npm run build and applicable real-browser checks. Attempt npm run verify without changing the strict timing gate. The online agent will independently review code and source/IndexedDB results, then decide whether a native check is applicable. No maintainer manual test is expected for an uncalled private slice.
