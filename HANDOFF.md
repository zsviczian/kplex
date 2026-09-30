# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Assignment — SI4 direct-neighbor encounter-order proof

**Direction/state:** main validation agent → offline development agent. Work on branch indexing-optimization-v2 at the exact reviewed commit supplied in the forwarding prompt. Verify that base, update your checkout from origin, and keep SI4b1/SI4b2/SI4c/SI5 open. C15–C26 remain paused.

**Repository authority for this assignment:** the maintainer explicitly authorizes the offline agent to commit its completed update to indexing-optimization-v2 and push that same branch. Return the commit SHA and actual validation results. Do not create a PR, merge or release. This authorization overrides the standing default of returning uncommitted work for this one assigned update.

## Accepted baseline and problem

The [private candidate-degree review](docs/validation/settings-independent-indexing-si4-candidate-degrees-review-2026-09-30.md) accepted finite exact raw map sizes only: Node 22.22.3 source 269/269, real Chromium/IndexedDB 145/145, architecture/core/lint/build and full verify pass. The new reader is uncalled. No settings-independent production route or complete visible-list certificate exists.

A full GraphBuilder accepts all host links before per-file Markdown work. Cached canonical replay can interleave a source's host link and other facts before the next owner. A fresh GraphIndex characterization shows tied direct candidates B and A in full order [B,A] but cached order [A,B], even when their titles and raw degrees agree. The structural catalog order and v3 Markdown URL-label ordinal do not prove this neighbor encounter order. This missing premise blocks exact stable sorting, independently of degrees.

## Bounded task

1. Trace the production full-builder batch phases, canonical compiler/evidence resolution, binder neighbor-map insertion, GraphIndex.relationView and stable sort for **one exact center's direct neighbors**. Identify exactly which accepted record/evidence order affects equal-key ties, including host links, selected property/inline declarations, structural edges, reciprocal declarations, duplicate edges, inferred/hidden suppression and both directions. Use fresh full GraphBuilder and GraphIndex as oracle; do not create a replacement sorter/classifier.
2. State an invariant for one finite, complete direct-neighbor candidate set under one current root, clean host, semantic policy and live demand. Assume equal comparator keys are supplied for the tie test; do not implement titles or a presentation selector. Determine the minimum settings-neutral acquisition coordinate or original-phase record identity needed to replay or certify full-builder encounter order. Keep SourceId, NodeId and physical/semantic paths distinct. Explain why structural order, per-owner order and v3 Markdown ordinal are each insufficient or sufficient for specific record families. Do not invent an event-order guarantee from host doubles.
3. If the invariant can be proved and bounded, implement only an **uncalled private** direct-neighbor order input/certificate. Preserve existing source/body/graph data and original relation/URL-title/degree certificates. Authenticate positive and negative support; validate root, all selected heads, journal, host/source observations, policy and demand after the final await. Reject incomplete/hot scopes without an order prefix. No full graph copy, settings-time inventory scan/reparse, UI/search/settings route, sorting facade or publication.
4. If the current source/catalog contracts cannot prove the order, stop at a precise smallest missing-contract design and production characterization tests. Do not return a plausible but unauthenticated order or expand into sibling lists/continuation to force a ready result. Sibling witness replacement/merge order is a later separate task.
5. Add focused portable full-index parity/counterexample tests. If any persisted derivative format changes, cover v2/v3 coexistence, genuine IndexedDB reopen/upgrade/abort/missing-page and no source/body rewrites in real Chromium. Keep all existing strict goldens and timer bounds. Document the accepted scope and limits in a focused SI4 proof, add an unaccepted return entry to Refactor plan.md, and overwrite this handoff body with changed files, actual checks and online reviewer instructions.

## Exclusions and return

The native selected scalar/alias MetadataCache completion and physical-revision trace remains a separate online prerequisite in an explicitly configured disposable vault. Do not implement scalar/absence title reads. Candidate-degree hot continuation, sibling order, complete visible lists, changed-host S2b, public/settings routing, SI5 and C15–C26 are outside this assignment.

Read AGENTS.md, CONTRIBUTING.md, docs/INDEX_SETTINGS_INDEPENDENCE_DESIGN.md, docs/SOURCE_CANDIDATE_DEGREE_PROOF.md, docs/SOURCE_CONTRIBUTOR_DISCOVERY.md and docs/AGENT_WORKFLOW.md. Use Node >=22.22.2 <23 with real dependencies if available. Run source, architecture, core, Obsidian lint, build, real-browser and full verify lanes that apply; record unrun lanes as pending. At completion, commit and push your reviewed work on indexing-optimization-v2, then report its SHA. The online agent will pull that branch, independently review the exact commit and run the available validation. No maintainer manual workflow is expected for an uncalled private slice.
