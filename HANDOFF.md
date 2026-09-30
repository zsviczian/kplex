# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Assignment — SI4 exact selected-title input proof

**Direction/state:** main validation agent → offline development agent. One bounded, design-first SI4 slice under `docs/INDEX_SETTINGS_INDEPENDENCE_DESIGN.md`. The standard `repository.zip` is generated after the reviewed commit; its commit ID and SHA-256 are supplied with it. The archive has no `.git`. C15–C26 remain paused.

## Starting point

The clean base has private requested-pair, requested-neighborhood relation and center-gate readers. The center's pre-top-N gate totals are certified under a clean current root, semantic policy, presentation policy and live demand. No production caller or settings route exists. The full sorted visible lists remain uncertified: selected target titles and raw candidate degrees can differ from the partial center/parent compilation. Changed-host BREF-1 and hot-range continuation are also open; rejected S2b remains absent. Read `docs/SOURCE_CENTER_GATE_PROOF.md`, `docs/SOURCE_CONTRIBUTOR_DISCOVERY.md` and the SI4 design before editing.

Main-agent Node 22.22.3 evidence: source 151/151; all six serial real Chromium suites 111/111; architecture 7/7, core 60/60, Obsidian lint and production build pass. Full `npm run verify` still fails the unchanged strict URL-heavy timer at 59.7 ms versus 50 ms. No new user-visible path or maintainer manual test exists. See `docs/validation/settings-independent-indexing-si4-center-gates-review-2026-09-30.md`.

## One next reasonable SI4 chunk

Before code, inventory exact title inputs and callers of `GraphIndex.titleFor()`, `displayNameFromConfiguredFields()`, `sortNeighbours()` and the active `GraphBuilder`/MetadataCache binding. Prove whether one **exact candidate ID** at current root/host/source head can return an authenticated, finite selected-presentation result: aliases in canonical order, `nameFields` first-match behavior (including scalar/array values, normalized keys and `position` exclusion), explicit field absence versus pending metadata, base name and current synthetic URL/tag label support. Preserve `renderAlias` and the deliberate no-execution behavior of `nodeTitleScript`. Show which facts are durable, which must come from live MetadataCache, and what event/revision/negative-evidence fence makes the latter safe after startup, edits and policy changes.

If the current contracts close, implement a **private exact-ID selected-title input/read capability** with bounded bytes/work and semantic/presentation/source/host/demand finality. Reuse or extract the existing canonical title selector; do not create a second title policy. Compare against a fresh full-bound `GraphIndex.titleFor()` under the same final settings for aliases, duplicate and dormant scalar fields, arrays, missing metadata, tag/URL synthetic names, field-order changes and cancellation at the final await. Valid settings-only requests must read/parse zero Markdown bodies and write zero source heads. Missing or unproven facts return pending/unsupported, never an invented empty title.

If exact title inputs or absence cannot be proved, return the precise missing host/source observation contract and the smallest sound correction. Do not claim complete sorted lists: raw candidate degrees, global stable encounter order and hot-range continuation remain separate. Do not wire UI, `GraphIndex`, settings, search, editing or publication, and do not add an all-owner scan, generic frontmatter mirror, second semantic engine, changed-host S2b or C15–C26 work. SI4b1/SI4b2/SI4c/SI5 remain open.

## Return and review

Return uncommitted changes and overwrite this body with changed files, proof/missing premise, actual versions/checks and minimum main-agent probe. Run available source, real Chromium, architecture/core/lint, full verify and production build; unavailable prerequisites and failed lanes remain pending. The main agent will independently review and run required real-dependency/Chromium checks, then decide whether any native validation applies before commit or further handoff.
