# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Assignment — SI4 URL label source-order proof and derivative coordinate

**Direction/state:** main validation agent → offline development agent. One bounded SI4 slice under `docs/INDEX_SETTINGS_INDEPENDENCE_DESIGN.md`. The standard `repository.zip` is generated after the reviewed commit; its commit ID and SHA-256 are supplied with it. The archive has no `.git`. C15–C26 remain paused.

## Starting point

The reviewed selected-title return found that the full builder streams Markdown in `vault.getMarkdownFiles()` order, while `SourceContributorDiscovery` orders owners by structural document traversal. A two-file nested/root fixture proves that a complete discovered URL-support cover can choose the opposite first meaningful label. See `docs/SOURCE_SELECTED_TITLE_PROOF.md` and its main-agent review. No title reader exists. The separate native MetadataCache completion/absence probe remains main-agent owned and pending; do not implement selected scalar-property reads in this chunk.

Main-agent Node 22.22.3 checks: new characterization 35/35, source 186/186, architecture 7/7, core 60/60, Obsidian lint and production build pass. Prior unchanged browser/runtime base passed 111/111 serial Chromium cases. Full `npm run verify` still fails the unchanged URL-heavy timer (70.9 ms versus 50 ms). Obsidian CLI is installed but Obsidian was not running, so no native event-order result is supplied. No maintainer manual test applies to the current documentation/test-only result.

## One next reasonable SI4 chunk

First prove the exact source encounter ordering that determines a URL node's canonical first meaningful label in `GraphBuilder.collectMarkdownSources()` and `NormalizedGraphCompiler`, including full-build phase order, per-file record order, duplicate references, empty labels and independent origin support. Compare it with the existing v2 contributor catalog's structural `source.order`. Decide whether a finite Markdown encounter ordinal attached to each exact SourceId is sufficient. The documented nested/root counterexample must fail without the new coordinate and match the full builder with it; do not change the full builder's user-visible label order merely to match the catalog.

If sufficient, add a versioned, authenticated derivative-catalog coordinate captured during existing catalog acquisition from the same current host/inventory boundary. Keep structural fact order separate. Validate exactly one ordinal per selected Markdown source, uniqueness/completeness and root/host/head/journal currentness; reject old/corrupt/missing ordinals for URL-title authority. Preserve existing v2 relation discovery on old roots where safe, without turning a presentation settings edit into source acquisition or an eager all-owner rebuild. No source-head/body format migration, settings-time `getMarkdownFiles()` scan or parser call is permitted. A version/schema change must preserve durable source/body data and pass real IndexedDB upgrade/reopen/fault tests.

Then add only a **private bounded URL-title input/read proof** if complete supporting-owner coverage plus the authenticated order and canonical compiler establish parity with a fresh full `GraphIndex.titleFor()` under the same final policy. Fail closed on hot support, missing negative pages, host/source/policy/demand supersession or any open journal. Tests must cover structural versus Markdown order, duplicate and missing labels, all supporting owners, source insertion/deletion/rename, old v2 roots, corruption, cancellation and zero Markdown reads/parses/head writes on settings-only requests. If an ordinal is insufficient or safe old-root coexistence cannot be proved, return the precise missing contract and smaller correction instead of a partial reader.

Keep scalar/alias MetadataCache observations, candidate degrees, sorted visible lists, UI/settings/search/edit/public publication, changed-host S2b and C15–C26 out of scope. Do not add a second label/semantic policy or scan all owners at query time. SI4b1/SI4b2/SI4c/SI5 remain open.

## Return and review

Return uncommitted changes and replace this body with changed files, proof, format/upgrade decision, exact checks/results and minimum main-agent probe. Run available source, real Chromium IndexedDB, architecture/core/lint, full verify and production build with actual versions; failed or unavailable lanes remain pending. The main agent independently reviews and runs the real-dependency/browser checks, captures the separate native MetadataCache trace when an explicit disposable vault is available, and decides whether any native test applies before commit or further handoff.
