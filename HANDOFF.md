# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Offline assignment — SI4a cached-source replay and scoped semantic foundation

## Transfer state and base

**Prepared for the offline development agent.** Work from accepted commit **`da471aa`** on branch `indexing-optimization-v2`. At transfer, only this transient `HANDOFF.md` is dirty. SI0–SI3 are accepted; [SI3 validation](docs/validation/settings-independent-indexing-si3-2026-09-29.md) records the exact Node/browser/Obsidian evidence and its remaining limits. The implementation target remains [the settings-independence design](docs/INDEX_SETTINGS_INDEPENDENCE_DESIGN.md), especially §§3, 7–9 and the SI4 row. Read [the source repository contract](docs/SOURCE_REPOSITORY.md), [normalized source contract](docs/NORMALIZED_SOURCE_CONTRACT.md), [index architecture](docs/INDEXING_ARCHITECTURE.md), `AGENTS.md` and `CONTRIBUTING.md`.

**Recommended next chunk: SI4a alone.** SI4 requires cached-fact replay, selective semantic interpretation, settings dispatch and revision-aware UI/query migration. The first two are substantial offline work and can be tested against the accepted full compiler without changing visible behavior. Do not combine this with the live settings/UI switch, derived-snapshot migration or SI5 performance/device acceptance. Return an uncommitted diff with this file overwritten as an implementation return marked **Review**. Record exact environment, changed files, checks, failures, skips and host evidence needed.

## Problem and objective

SI3 stores settings-neutral source facts, but a hierarchy or image-policy edit still calls the complete `GraphBuilder` through `GraphIndex.rebuild()`. A compatible saved graph still carries an old semantic policy. SI4 must ultimately prepare current relationships from durable facts without reading Markdown, reparsing bodies, rebuilding the whole source graph, or exposing mixed-policy UI state. SI4a creates the reusable **read and semantic preparation seam** needed for that switch; it does not claim to fix the settings workflow yet.

Implement a production path that, given requested source IDs and the current source/host revisions, reads validated SI3 facts and reconstructs the accepted normalized compiler input without `Vault.read`, `cachedRead` or Markdown parsing. It must support selective source discovery through existing `field`, `target`, `literal` and `family` postings, and prepare semantics for requested sources using the **existing** selector/compiler/evidence/resolver. An unchanged source must be replayable under two ontology/image policies from the same stored facts. Define a narrow revision/read result that distinguishes ready, pending acquisition, stale/cancelled, invalid family and storage unavailable. These are internal capabilities, not a public plugin API.

## Required investigation and design decisions before editing

1. Inventory every SI3 stored fact kind and its relationship to `core/graph/source.ts` batches, `ObsidianReferenceSourceCollector`, metadata/host-link collectors, `NormalizedGraphCompiler` and `NormalizedSourcePatchPreparer`. Identify exact facts unavailable from storage. Do not fabricate a source fact or infer a lexical target from aggregate resolved links.
2. Trace `SourceRepository.pin/visit/querySources`, family validation, unsaved masking, reader pins, expected-head/sequence and host resolution epochs. Replayed input must come from one coherent selected head and observed host environment; a settings change may reinterpret it, while a source/host change invalidates the prepared result.
3. Trace existing pair/evidence precedence and incoming declarations. A field reassignment can change a pair even if only the opposite endpoint's source is requested. State how the source-posting query finds every competing contributor, including structural and inferred links, without reading one dense source once per incident pair.
4. Record a finite inventory of current `GraphIndex` semantic read consumers for later SI4b/c. Include center neighborhoods, gate totals, search, explanations, edit eligibility, predicates/lenses, section expansion and direct `GraphPage.neighbours` uses. This is an inventory, not permission to migrate all callers now.

If existing v5 postings cannot support a bounded exact query, make the gap explicit. A small additive indexed format/migration may be proposed, but do not change the database schema or claim pair-scoped performance without a bounded implementation and real-browser migration test. Prefer a source-scoped replay seam that can be accepted independently; leave any unproven pair-specific index for SI4b.

## Implementation boundary

- Place portable selection/semantic work beside the accepted `core/graph` owners. Host/IndexedDB reads stay in `index` or Obsidian adapters. Do not pass `App`, `TFile`, the plugin instance or `GraphState` into portable code.
- Reuse the canonical normalized batch cursor/finality checks, `ReferencePolicySelector`, full compiler, patch preparer and resolver. Do not create a second Markdown grammar, relationship classifier, basename resolver, evidence precedence table or shadow semantic implementation.
- Stream at existing 256-record and byte/cooperative limits. Keep one source/selected revision pinned through replay; release pins on success, rejection, cancellation and unload. Do not load the whole vault or duplicate the complete graph in memory.
- Query postings for candidate **source owners** only, then validate selected heads/families before interpreting. Staged/retired/tombstoned/evicted-unsaved sources must not leak old contributions. An incomplete query must return a pending/incomplete result, not an empty relationship.
- Prepare a private semantic result with source, host and policy revision stamps. Every awaited read/yield must recheck cancellation and revision. No live GraphIndex publication or UI reads are switched in SI4a; existing synchronous C14b per-file publication and settings routing stay intact.
- Preserve exact opaque IDs, original reference candidate spellings, shared payload finality, field normalization, frontmatter/inline precedence, duplicate counts, inferred and inverse perspectives, Date/URL/structural support and synthetic-node lifetimes. Do not promote dormant references into visible nodes or search candidates.
- Add/update meaningful module/function TSDoc, architecture documentation and the `Refactor plan.md` with **Review** status. Do not rewrite historical acceptance evidence.

## Focused acceptance tests

1. Compile the same complete fixture from current host facts and from validated SI3 replay under identical settings; compare exact node identities, materialization, directed relationships, declaration multiplicity/provenance and relevant search inputs. Repeat after assigning a previously dormant frontmatter and inline field, Friend→Challenger, image selector, inference toggles and a Date/URL case. No golden relaxation.
2. Prove one cached source can be reinterpreted under two policies without a Vault read, `cachedRead`, parser call or source-head write. Prove source completion/sequence do not change solely because of policy.
3. Query a changed field and a target/literal dependency with competing contributions from both endpoints. Assert no missing or duplicated declarations. Use a dense-source fixture to bound chunks, bytes and repeated reads per requested scope; do not claim pair-scoped performance from a whole-source-per-pair loop.
4. Reject missing/corrupt family chunks/postings, pending metadata, tombstones, unsaved eviction, newer format, source/host supersession, policy supersession and cancellation without publishing partial semantics. Preserve intact sources and retry only the affected source.
5. Exercise browser IndexedDB source-head selection and reader-pin cleanup for any new repository read path. Existing v4/v5 migration, graph snapshot isolation and failure tests must continue to pass.
6. Add a source-level contract test that production `GraphIndex` still uses its current settings route during SI4a; no premature claim that the product is settings-independent.

Run `git diff --check`, `npm run verify`, `npm run test:sources` and `npm run test:sources:browser` with actual versions/prerequisites where available. An offline environment without required Node/dependencies/Chrome must record those lanes as pending, not passed. Main-agent acceptance will independently review the seam, rerun full/browser checks and use the exact installed Obsidian build to compare representative cached-source interpretation with the current full oracle. Native settings-routing change, foreground latency and physical mobile testing remain later checkpoints.

## Return to the online validation agent

Rewrite only the transient assignment/results below the preserved standing header. State the base/archive identity, full changed-file manifest, actual command outcomes, source/host/policy revision contract, any data gap requiring SI4b, bounded-work evidence and precise native probe requests. Mark SI4a **Review**. Do not commit, push, open a PR, merge, release, publish, mutate a personal vault or describe SI4 as accepted. Recommend the next reasonable chunk after your findings: likely SI4b scoped pair index/derived-cache publication if SI4a's oracle passes, then SI4c settings dispatch and read-consumer migration. The main agent retains commit and native acceptance responsibility.
