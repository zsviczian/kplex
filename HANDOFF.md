# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Offline implementation assignment: SI2 neutral reference candidates and shared policy selection

## Checkpoint and base

Implement **SI2 only** from [`docs/INDEX_SETTINGS_INDEPENDENCE_DESIGN.md`](docs/INDEX_SETTINGS_INDEPENDENCE_DESIGN.md), especially sections 5.1–5.3 and the checkpoint table. The accepted implementation base is commit `790c179` (`Decouple graph snapshots from presentation settings`). This handoff-only commit may sit on top of that base.

SI0+SI1 are accepted. Do not revisit their architecture unless SI2 exposes a correctness defect that cannot be fixed within this assignment. Read the accepted validation report at [`docs/validation/settings-independent-indexing-si0-si1-2026-09-29.md`](docs/validation/settings-independent-indexing-si0-si1-2026-09-29.md), [`docs/SETTINGS_PRESENTATION_OWNERSHIP.md`](docs/SETTINGS_PRESENTATION_OWNERSHIP.md), [`docs/INDEXING_ARCHITECTURE.md`](docs/INDEXING_ARCHITECTURE.md), and [`docs/NORMALIZED_SOURCE_CONTRACT.md`](docs/NORMALIZED_SOURCE_CONTRACT.md) before changing source contracts.

## Objective

Make source collection independent of the currently configured ontology and image-field policies. Collect neutral reference candidates from frontmatter and inline fields once, then use one canonical policy-selection path for both full compilation and incremental patching.

An unassigned candidate must survive collection but remain dormant. Replaying the same fact stream under another valid policy must be sufficient to activate, move, or deactivate its relationship without reparsing the note. SI2 does not yet persist those neutral facts across restarts and does not yet remove the current settings-triggered semantic rebuild path.

## Required behavior

### Neutral source facts

- Represent reference candidates from every eligible frontmatter and inline field without embedding the field's current ontology role or current image-selector status in the raw fact.
- Preserve the exact field spelling, normalized field key, source surface, literal target, subpath, physical occurrence identity, and available source location.
- Keep lexical and host-resolved targets explicit. The adapter/host resolves paths; portable core code must not guess Obsidian resolution.
- Reuse the established parser grammar, including `iterateLinkReferencesFromValue()` and existing inline occurrence handling. Do not reinterpret every plain string as a link.
- Deduplicate repeated discoveries of the same target within one physical value occurrence as the current contract requires, while preserving multiplicity and order between separate physical occurrences.
- Store shared payload once per original reference-bearing value occurrence. Do not repeat a large nested raw value for every target extracted from it.
- Continue collecting property-name discovery facts even when a property has no value.
- Do not introduce an arbitrary property database or a complete frontmatter mirror.

### Shared interpretation

- Add one canonical, portable policy-selection operation used by both the full compiler and incremental patch path.
- Apply exact and normalized ontology assignment semantics, configured ordering, multiplicity, frontmatter precedence, inline behavior, and conflict handling at interpretation time rather than collection time.
- Keep image-only suppression exact. The same neutral candidates must support current thumbnail/node-image policy without configuring the producer. Preserve the existing distinctions among image-only values, prose plus image values, and ontology plus image values.
- A dormant candidate must create no visible or searchable node, ghost node, URL node, ontology evidence, tag ownership, or URL ownership.
- Select a candidate before materializing its source/target-dependent graph artifacts. In particular, do not let `compiler.ts` call node materialization or `patch.ts` seed a target entity merely because a dormant fact exists.
- Full builds and per-file patches must interpret the same fact stream through the same selector and produce equivalent graph/evidence outcomes for the same final settings.

### Fingerprints and bounded processing

- Update semantic source fingerprinting so a change to a reference candidate in an unassigned field is detected.
- The fingerprint must be independent of the currently configured ontology and image fields.
- Unrelated arbitrary non-reference values must not perturb the semantic fingerprint.
- Do not duplicate large shared payloads merely to fingerprint each extracted target.
- Preserve the existing batch size, yield, cancellation, revision/finality, and publication fences. A record-count batch is not a sufficient byte bound by itself; avoid introducing a second whole-vault DTO or an unbounded per-file expansion.

## Areas that require special attention

Trace all affected producers and consumers before editing. At minimum review:

- `src/core/graph/source.ts`: the present occurrence/provenance model and configured-field identity.
- `src/adapters/obsidian/ontologySourceCollector.ts`: it currently receives configured field names and only visits those fields.
- `src/adapters/obsidian/metadataSourceCollector.ts`: note/primary/image selectors and presentation-link collection.
- `src/core/graph/compiler.ts`: `consumeOntology` presently uses `configuredFieldName` and may materialize nodes before assignment is known.
- `src/core/graph/patch.ts`: ontology and presentation-link targets may be seeded before policy selection.
- `src/index/GraphBuilder.ts`: configured semantic field sets and settings-dependent semantic fingerprints.

The current `SourceProvenance.configuredFieldName` and configured collector identities are symptoms of the dependency SI2 removes. Choose clear source types for a physical field-value occurrence, its shared payload, and its extracted reference candidates. Exact names and layout are implementation decisions, but raw candidates must not carry their current role/selector as identity.

## Scope boundaries

Do not implement:

- SI3 IndexedDB source persistence, source heads, schema migration, or startup restore.
- SI4 demand-driven reinterpretation, read-facade integration, or elimination of settings-triggered semantic rebuilds.
- SI5 performance/lifecycle/device work or performance claims.
- General C15–C26 refactoring work, unrelated UI/settings changes, or broad graph rewrites.
- A production shadow graph or a second whole-vault source representation. Shadow comparisons belong in tests.

SI2 may still perform a semantic rebuild after an ontology or image selector changes. Its value is that the rebuild can consume neutral in-memory facts correctly; durable restart reuse arrives in SI3 and responsive settings adaptation in SI4. Record this limitation explicitly.

## Required automated acceptance coverage

Add or update portable tests that prove all of the following:

1. Collector output is identical under two different ontology/image policies and contains unassigned frontmatter and inline candidates, including dense nested reference values.
2. Replaying one fact stream under different policies produces the expected parent/friend/challenger activation, movement, deactivation, and image selection, matching a clean compiler under each final policy.
3. Existing full-build and incremental-patch graph, evidence, multiplicity, and search oracles remain unchanged.
4. Dormant candidates produce no nodes, ghosts, URL nodes, evidence, tag ownership, or URL ownership.
5. Duplicate exact/normalized assignments, configured order, array order, physical multiplicity, frontmatter precedence, and conflicting inline cases retain their accepted behavior.
6. Image-only, prose-plus-image, and ontology-plus-image suppression remain exact, with image policy applied during interpretation rather than collection.
7. Shared payload is represented once per physical value occurrence even when it yields many targets; batch, cancellation, revision, and finality tests still pass.
8. Neutral fingerprints change when reference candidates in unassigned fields change, remain independent of current role/image selectors, ignore unrelated non-reference property values, and avoid payload duplication.
9. Full and patch collection remain bounded and do not create a second whole-vault DTO or whole-frontmatter mirror.
10. Tests and documentation state the expected SI2 limitation: no durable source persistence/restart reuse and semantic setting changes may still schedule a rebuild pending SI3/SI4.

Treat the accepted compiler/patch fixtures as the behavior oracle. If a proposed neutral representation would change existing graph semantics, first establish whether the difference is an actual pre-existing defect; do not silently redefine behavior inside this checkpoint.

## Offline verification

Use Node `v22.22.2` when available and record the actual Node/npm versions. Run at least:

```text
npm run verify
git diff --check
```

Run narrower tests during development as useful. Record every unavailable dependency, browser check, native-host check, and skipped command as pending rather than passed. Do not claim native Obsidian, IndexedDB lifecycle, mobile, or performance validation from portable tests.

Update affected architecture/source-contract documents and add an action-log entry to `Refactor plan.md`, but mark SI2 **Review**, not accepted. Do not commit. Return the implementation and tests as uncommitted changes for the main agent.

Before returning, overwrite this assignment body below the standing header with:

- concise implementation summary and principal design decisions;
- complete changed-file list;
- exact commands, versions, and pass/fail/skip results;
- known limitations and review concerns;
- focused main-agent runtime validation instructions;
- the precise final `git status --short`.

## Planned main-agent validation after return

The main agent will independently review the source boundaries and run the exact repository verification plus `npm run verify:obsidian:migration`. Native checks will include:

- comparing a clean build and patch result on the large fixture under identical final settings;
- creating owned notes with currently unassigned frontmatter and inline references, confirming no dormant graph artifacts, then assigning/moving/removing the field policy and comparing each result with a clean build;
- exercising image-only, prose-plus-image, and ontology-plus-image fixtures;
- confirming cancellation/publication behavior and checking Obsidian errors;
- restoring settings and deleting all validation-owned notes.

The accepted SI0+SI1 host observation was 20,015 Markdown files, 20,703 nodes, and 715,032 declarations. These counts describe that fixture and are not a semantic hash or a required SI2 outcome if the fixture changes.

No maintainer manual test is planned merely for SI2 because it adds no UI or durable storage path. The main agent must reassess that after reviewing the returned implementation.
