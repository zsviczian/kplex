# C14a handoff — portable per-source semantic patch preparation

This is the single transient handoff. Overwrite it for the next assignment; do not archive it. `Refactor plan.md` remains the definitive tracker. The main agent reviews/fixes the returned work, runs applicable native checks, reports prioritized manual tests, and commits after acceptance.

## Starting point

Use `kplex-refactor` from the accepted C13c commit containing this document. Record the actual revision/branch/dirty state; if the ZIP has no Git metadata, state that explicitly. Read `AGENTS.md`, the C13/C14 sections of `Refactor plan.md`, `docs/ARCHITECTURE.md`, `docs/NORMALIZED_SOURCE_CONTRACT.md`, `docs/INDEXING_ARCHITECTURE.md` and C13b/C13c validation evidence.

**Next is C14a, a Scoped offline-agent candidate.** C13a–C13c now provide portable parser/evidence/resolver/full compiler with actual Obsidian full-build delegation. C14 is split into C14a shared semantic patch preparation and C14b coherent publication/host integration acceptance. C14 stays Pending until both pass, including its applicable physical iOS gate. Do not implement C15/C16 or the deferred worker experiment.

## Objective and boundary

Extract the semantic preparation of an existing Markdown source's update over normalized facts. Reuse the full compiler's meaning, evidence/classification and explicit identity contracts; wire the real `GraphBuilder.patchMarkdownFiles()` path through that owner. Preserve current private staging and **per-file** commit behavior. Host acquisition, physical binding, revision checks, search/cache invalidation and publication remain at their existing owners in this slice. A completed semantic patch is data that the host binds/commits only after current-revision checks; it is not permission to mutate the published graph across awaits.

Do not hand off all of C14 as one broad rewrite. This slice may introduce a narrow preparation result/read port and exact compatibility delegates. It must be buildable and used by production, with the remaining publication extraction named C14b. No alternate unused patch compiler, whole-vault portable copy or generic plugin-shaped port.

## Practical checkpoints

- [ ] **Inventory and independent baseline.** Trace `patchMarkdownFiles`, private overlay maps, `createPatchState`, `resolvePatchEvidencePair`, `commitPatchState`, compaction, semantic signatures/no-op paths, declaration removal, metadata/discovery, tag/URL cleanup, canonical target binding and GraphIndex's `onFileCommitted`/invalidation/search/persistence. Capture accepted behavior before edits; do not derive the oracle from the new compiler alone.
- [ ] **Narrow portable preparation contract.** Consume C11 normalized facts plus only required semantic settings and stable read/identity information. No Obsidian/GraphPage/TFile/plugin/App/UI imports, including type/transitive imports, and no hidden clock/browser timer. Keep exact IDs independent of explicit paths/kinds/materialization. Obsidian binds actual files and legacy path-keyed evidence outside core. If current graph access is required, use a scoped stable read port rather than cloning all nodes/evidence into another model.
- [ ] **One semantic implementation.** Share role assignment, self/index exclusions, frontmatter/inline rules, Date/body URL/ontology facts, alias/tag/type/style/discovery projection and visual-only suppression with the accepted full compiler. Extract reusable helpers intact before changing logic. Do not duplicate the full compiler or leave equivalent active full/patch semantic copies behind a new facade. Preserve English explanation copy; L01 remains its localization owner.
- [ ] **Private local staging and bounded lookup.** Keep C13b copy-on-write evidence forks, endpoint indexes, tombstones, IDs/counts, multiplicity, inverse views, canonical target references and bounded compaction. Use path/identity-indexed declaration lookup for one changed source. No O(all-evidence) small edit, per-read whole-store arrays, all-graph resolution or replacement graph clone. Preserve current overlay depth/flattening policy until a separate measured change is justified.
- [ ] **Contribution lifetimes.** Distinguish original declarations, physical contribution ownership and derived shared tag/URL-origin facts. A shared URL has one URL-origin declaration even when several notes declare it. Removing one contribution cannot remove another note's relationship or a still-used origin/hierarchy node. C13c's ownership of the first derived declaration does not by itself encode all dependent contributions: inspect and preserve existing cleanup/rederivation rules rather than treating every derived edge as file-owned. Keep first-meaningful URL label and existing tag naming/style behavior.
- [ ] **No-op semantics.** Prose/unrelated-property/format-only changes must not publish semantic events or force graph rebuilding. Keep field discovery-only updates, fingerprints and mtime/fact reconciliation correct; do not use semantic no-op as permission to mutate published metadata before a revision fence. Preserve actual bounded signature/cache behavior, with storage orchestration still C16.
- [ ] **Cancellation and explicit outcomes.** Inject current-generation/clock/yield policy; check before/after awaited acquisition, normalization, staging and resolution. Rejection is terminal for a preparation run. Distinguish prepared/no-op/cancelled versus genuine rebuild-required outcomes without changing coordinator policy. Preserve pending work on cancellation; cancellation is not an automatic full rebuild. No optimistic creation, rename/delete/latest-wins scheduler redesign in C14a; retain current compatibility routes and characterize them for C14b.
- [ ] **Production wiring.** Existing full compilation and actual Markdown patch path consume the shared semantic owner. Host per-file staging/commit still gates graph changes, signatures and existing callbacks at the current boundary. Preserve public method signatures/delegates where consumers need them, and document every residual seam's exact caller and C14b/C15/C16 owner. Keep snapshots/cache/settings/defaults/UI/commands/platform policy unchanged.
- [ ] **Tests.** In a clean process without SDK/browser shims, compare full versus prepared patch results to the actual accepted implementation/frozen baseline for ontology conflicts, duplicate provenance, Hidden, Date, shared/malformed URLs/origins, visual-only versus mixed links, aliases/tags/type/unsupported markers, discovery/no-op paths and opaque/pathless/case-distinct IDs. Test base isolation, canonical references, cancellation at successive awaits, terminal rejected input, resume, stale source revisions and high-degree notes. Add meaningful checks for no whole-store iteration on a small edit and unchanged scaling bounds. Preserve existing goldens and strict timing tests.
- [ ] **Required acceptance lanes.** Node **22.22.2**, clean `npm ci`, full `npm run verify`, real installed Obsidian declarations/build and `git diff --check`. Wire new tests into mandatory scripts and indexing harness imports. Do not relax timing guards or claim stubs/disposable transpilation as the real build. Report exact versions, failures and unavailable lanes honestly. Leave native/physical acceptance to the main agent.
- [ ] **Delivery.** Mark C14a Review, parent C14 Pending; append the durable summary in the plan and fill the result below. Leave changes uncommitted for review. Keep this handoff transient.

## C13c lessons and native review

C13c review fixed terminal rejected batches, delimiter-safe identity keys, first-meaningful URL labels, pathless/explicit tag identities and synthetic-ID collisions. The Obsidian structural adapter now supplies canonical tag IDs/paths while preserving raw spelling in provenance. Legacy binding yields cooperatively; compatibility validation inspects nodes rather than all declarations. Preserve these guardrails.

On return the main agent will rerun required checks and exact-build native high-degree edits, cancellation, semantic no-ops and patch/full parity. Accepted clean vault: **20,701 nodes, 1,225,746 directed neighbor entries, 715,030 original declarations**, complete canonical declaration SHA-256 **`587e33e9a4eba5e6804f7348c39aa293dbe5ca0f7c8c1c4330520569be85bb57`**. Generated IDs omitted, recursively sorted object keys, canonical records sorted, hash concatenated without separators. Investigate mismatches against the actual accepted implementation with identical inputs; do not relax the baseline.

Follow `docs/OBSIDIAN_RUNTIME_TESTING.md`: plugin inspection through `app.plugins.plugins['k-plex']` is a maintenance tool; require readiness **and full hydration**, fence captured-state identity across awaits, and reopen K-Plex after disable/enable. Temporary SDK accessors/globals must be removed from source and final artifact. Restore original throttling even on failure; diagnostic timings do not establish foreground performance. C00 cold/physical matrix remains open. C14b retains the complete publication/optimistic-create/rename/delete/latest-wins matrix and physical iOS acceptance; this slice must not silently close it.

## Guardrails and rollback

No schema/cache/version/settings/default/UI/CSS/command/localization/worker/platform changes, new persistence, or demand coordinator. Move accepted algorithms before simplifying. Do not weaken architecture rules or allow portable imports of legacy models. Rollback should restore the shared semantic preparation/delegates/tests/wiring without any user-data migration.

## Result — fill in on delivery

- Actual starting revision/branch/dirty state or unavailable Git metadata:
- Inventory, portable preparation contract and shared full/patch semantic owner:
- Exact identity/read/binding design and production delegation:
- Private staging, indexed work, derived contribution lifetimes and no-op behavior:
- Independent accepted comparison; full/patch, cancellation/stale/resume and scaling evidence:
- Exact Node/npm/dependency versions; commands/results/failures/unavailable lanes:
- Persisted schemas/settings/policies changed (expected none):
- Remaining C14b/C15/C16 seams, rollback and up to three prioritized reviewer checks:
- Status: C14a Review; C14 Pending:
