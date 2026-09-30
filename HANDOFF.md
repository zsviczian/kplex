# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Assignment — SI4b1 exact contributor discovery — Prepared for offline agent

## Transfer and identity

**Prepared by the Obsidian-equipped validation agent for the offline implementation agent.** Branch `indexing-optimization-v2`; accepted implementation base `3644a64 Add cached source replay and scoped semantic preparation`. This assignment is a separate handoff-only commit following that base; its initial dirty set contained only `HANDOFF.md`. The SI4a accepted implementation, tests and validation report are committed at the implementation base; no implementation changes are included in this handoff. Do not claim a new Git HEAD if your archive omits `.git`. Return a changes-only, uncommitted diff and overwrite this body with actual results and precise online verification/commit instructions.

SI0–SI3 and SI4a are accepted. The current product still rebuilds derived semantics for hierarchy/inference/image changes. SI4a privately replays explicitly selected source owners with the canonical compiler. Its `discover()` returns **candidates-only** because v5 postings cannot prove absent owners or cover structural/URL contributors. Your task is the next independently reviewable chunk: **SI4b1 exact, integrity-checked contributor discovery**. SI4b2 derived publication and SI4c settings/read-consumer routing will be separate assignments. Do not implement those now or claim settings-change latency is fixed.

## Objective and architecture owner

Build a bounded internal capability that takes a finite pair/neighborhood dependency request and returns either (a) a complete, revision-fenced set of all source owners able to contribute to it, or (b) an explicit non-ready result. The result must be sufficient for a future SI4b2 caller to pass each owner exactly once to `CachedSourceSemanticReader.prepare()` without silently missing an opposite-endpoint or third-party declaration. “No relationship” is a valid ready answer only when absence is genuinely certified. Reuse the accepted `SourceRepository`, source fact codecs, normalized collectors and source replay seam; do not duplicate relationship classification, grammar, resolution or graph publication.

Investigate and explicitly specify the dependency universe before coding. It includes both endpoint owners, incoming lexical/host-resolved references, relevant field owners, genuine host links, tags and ancestor/folder topology, URL/body-URL origin and referrer owners, and Date/Daily Notes observations where they can affect the requested result. Separate source-owned dependencies from host-only structural facts. Source IDs/NodeIds are opaque and case-sensitive, semantic/physical paths remain distinct, and target materialization cannot be inferred from a posting.

A successful query needs a checkable closed-world certificate covering **present and absent** contributors. A lookup of v5 postings plus selected-family validation is insufficient: deleting a lookup row can hide its owner before its family is read. Design a migration/integrity mechanism that detects missing, malformed, stale or partially migrated query data and returns pending/invalid rather than an empty ready set. The host structural catalog needs an equivalent current-revision/completeness fence; stored parent paths alone are not topology. If exact bounded negative proof cannot be established with the chosen data structure, return the precise impossibility/cost tradeoff and a narrower implementation for review instead of claiming completeness.

## Scope and required behavior

- Allowed production owners: `src/index/SourceFacts.ts`, `SourceRepository.ts`, `IndexedDbCache.ts`, a focused internal discovery module, and narrowly required `src/adapters/obsidian/*SourceCollector.ts` / `sourceAcquisition.ts` host supplement. Update the source repository/replay architecture docs and plan Review entry. Add targeted portable and real IndexedDB tests. Use an additive, migration-safe store/version only if proven necessary; preserve existing source heads, graph snapshots and durable user data.
- Keep active heads and dependency-index activation atomic across connections. Incomplete migration/rebuild, interrupted writes, source rename/delete/recreate, unsaved/evicted facts, offline host changes, corrupt rows and process restart must never yield a false complete answer. Retired revisions remain protected by existing reader leases; any new cleanup or lease ownership needs explicit tests. Bound transactions, batches, byte budgets, memory and queue depth; avoid per-query whole-vault scans and pair-by-pair dense-source replay.
- Return an explicit scope identity/coverage, dependency/catalog generation and exact selected source/host stamps that a later publisher can revalidate. Distinguish source-policy changes from source/host facts; do not index configured semantic roles as source facts. Policy-only reinterpretation must reuse unchanged heads/index entries.
- Preserve SI4a's private preparation and v5 candidate API for compatibility until the new exact path is accepted. Do not wire settings, GraphIndex neighborhood/search/gates/edit eligibility, UI, startup snapshot replacement or C14 publication. No new user-facing copy or commands.
- Include a work/cost inventory for 20,000+ files / 100,000+ graph entries. Distinguish one-time migration/acquisition from per-query work. Avoid unbounded source or graph mirrors, and document failure/repair behavior instead of silently falling back to a full source parse.

## Acceptance evidence to return

1. A matrix of every contributor kind, where its neutral fact lives, how the exact lookup reaches it (including third-party owners), how absence is certified, and what invalidates its certificate. Show actual counterexamples for missing v5 postings, opposite-endpoint precedence, tag/folder and URL-origin contributors.
2. Focused full-compiler equality tests for finite complete scopes under baseline, dormant-field activation, Friend→Challenger, inverse inference and imagery policies. Assert exact IDs, materialization, directed roles, declaration multiplicity/provenance and candidate work once per owner. Compare the same request after policy-only change without source-head/index rewrite.
3. Real IndexedDB migration and fault cases: old database, clean upgrade/restart, partial migration, missing/corrupt index row or manifest, cross-connection concurrent replacement, pin/cleanup, rename/delete/recreate, unsaved eviction and unrelated intact-source survival. A missing lookup must never produce a ready empty set. Keep failures finite and sanitized.
4. Run `git diff --check`, `npm run verify`, `npm run test:sources` and `npm run test:sources:browser` on available **real** dependencies and required Node (22.22.2+). State actual versions/results and unrun prerequisites, never substitute a stub or archive fixture for the production build. Independently review TSDoc on changed functions, architecture import boundaries and schema compatibility. Return exact changed-file manifest/source identity and no generated bundles or vault contents.

The online agent will review the full diff, fix bounded defects, rerun the required Node/build/browser gate, and use the exact built artifact in the disposable Obsidian test vault. Native probes will check upgraded storage, current structural/catalog revision, two-note opposing and third-party tag/URL contributors, negative-result corruption handling, unchanged source heads on policy-only queries, no added Vault reads/parses, and cleanup. Physical iOS/Android performance remains SI5; do not request a maintainer manual test merely because your environment lacks Obsidian.

## Why this is one chunk

SI4b1 has a single correctness boundary: certified discovery of the complete source-owner scope. Combining it with derived graph publication or settings/read-consumer routing would make a missing-contributor defect hard to isolate and could expose incomplete semantics as current. After SI4b1 acceptance, the next reasonable assignment is SI4b2 revision-aware derived publication, followed by SI4c settings/read consumers and SI5 lifecycle/performance.
