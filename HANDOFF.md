# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Assignment — SI4 private visible-center and gate-input proof

**Direction/state:** main validation agent → offline development agent. One design-first, bounded SI4 slice under `docs/INDEX_SETTINGS_INDEPENDENCE_DESIGN.md`. The delivered `repository.zip` is the standard `npm run repo:export` source archive; it has no `.git`. The committed base hash and ZIP SHA-256 are supplied with it. C15–C26 remain paused.

## Starting point

The clean base contains the reviewed private requested-pair and requested-neighborhood readers. The neighborhood reader certifies complete **relations** touching one center and its canonical semantic parents at a clean current root under one policy. It has no production caller. It does not certify visible pages, sorting, top-N lists or gate totals. The rejected S2b all-owner host transition remains absent; real changed-host impact stays UNKNOWN.

Main-agent review on Node 22.22.3 with real dependencies: source 122/122; six real Chromium suites 96/96 when run serially, including all new neighborhood subcases; architecture 7/7, core 60/60, Obsidian lint and production build pass. One missing browser-bundle entry was fixed. The default parallel browser command stalled and was stopped. Full `npm run verify` still fails the unchanged strict URL-heavy timer (53.3 ms against 50 ms); do not call it green or relax the timer. See `docs/validation/settings-independent-indexing-si4-neighborhood-review-2026-09-30.md`. No native user-facing path or maintainer manual test exists yet.

## One next reasonable chunk

First inventory the exact existing inputs and consumers of `GraphIndex.getNeighborhood()`, `relationView()`, `gateStats()`, `gateNeighbourPaths()`, `isVisiblePage()`, `sortNeighbours()` and the `PlexGraph` view. State a before-code invariant for **one requested center** under one captured semantic and presentation policy. Determine whether the current authenticated center/parent relation cover, plus finite additional exact-ID source/host reads, can reproduce the currently visible parent/child/friend/sibling lists and the center's four gate `hasAny`/`visibleCount` values. Distinguish semantic parents from displayed/top-N parents, hidden targets from hidden relations, inferred visibility, node-kind/excluded-path filters, sibling witnesses, sort modes (especially connection count), target metadata and duplicate target paths. Apply top-N only after exact visibility/sort/total inputs are known. Do not turn a missing target property or negative range into an empty/zero result.

If those inputs close under current contracts and bounds, implement a **private** projection/preparation with the final root/head/host/journal/semantic-policy/presentation-policy/demand fences. Compare it against an independently prepared full-current-policy `GraphIndex` view and full canonical semantic oracle, including dormant field changes, inferred/hidden conflicts, third-party tag/URL support, no-other-child, visibility and sorting. Exercise pending/hot ranges, empty center, supersession and final awaited mutation; assert zero Markdown reads/parses, source-head writes and cold/full source builds on a policy-only request with valid facts.

If exact visible lists or center gate statistics cannot be proved, return the smallest missing authenticated metadata/range/continuation contract and a sound smaller correction. Explicitly leave other displayed nodes' gate counts, cross-links, search, edit eligibility and publication outside this chunk unless a separate finite proof establishes them. Do not wire `GraphIndex`, settings/UI routing or public consumers; do not revive S2b, scan all owners, add a second semantic engine or resume C15–C26. SI4b1/SI4b2/SI4c and SI5 remain open.

## Return and review

Keep the work uncommitted and overwrite this handoff body with the exact changed-file inventory, proof or missing premise, actual test/build results and minimum main-agent probe. Run available source, real-browser, architecture/core/lint, full verify and build lanes with exact versions; mark unavailable or failed lanes honestly. The main agent will review, run the required real dependencies/Chromium and decide whether any native test is applicable before committing or preparing another handoff.
