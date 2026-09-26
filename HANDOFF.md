# C12a handoff — file, folder and tag source collection

## Assignment and workflow

Implement **C12a only**, following accepted C11. This is a **Scoped offline-agent candidate**: implementation and portable verification can run without Obsidian; the main agent owns exact-build host validation. Read `AGENTS.md`, `Refactor plan.md` sections 3–5 and C11–C17, `docs/ARCHITECTURE.md`, `docs/NORMALIZED_SOURCE_CONTRACT.md`, `docs/INDEXING_ARCHITECTURE.md`, and the C08P/C10/C11 validation reports first. Expected branch: `kplex-refactor`. Record the actual starting commit and dirty state. If the supplied ZIP has no Git metadata, say so; do not invent a revision.

This single transient document is overwritten for every handoff, never archived. The refactor plan is the definitive tracker. Return **uncommitted** changes; mark C12a **Review**, not Done, and record results below. The main agent reviews/fixes, reproduces checks, performs applicable Obsidian validation, recommends any necessary prioritized manual checks, and commits only after acceptance. Parent C12 remains incomplete until C12b and C12c also pass.

## Outcome and scope

Extract the current **full-build file/container/tag collectors** into explicit Obsidian adapter modules. The actual production `GraphBuilder` must consume bounded C11 normalized records for these families and continue owning page/evidence construction and relationship semantics. Move working collection behavior intact first. Do not implement a second classifier, replace the compiler, or claim the full graph is portable.

Keep link summaries, ontology, Date, body URL/origin and presentation-image reconciliation on their existing collectors until C12b/C12c. Existing parser/cache reads, metadata enrichment and incremental patch semantics stay authoritative. In particular, enrichment currently overlaps the structural tag collector; trace and preserve evidence-store deduplication rather than adding duplicate declarations or casually removing that path. This slice does not extract patch/publication coordination (C14), demand scheduling (C15), storage (C16), search (C17), or the parser worker pool.

## Practical checkpoints

- [ ] **Trace ownership before editing.** Inspect `GraphBuilder.build()`, `addVaultTree()`, `addTagTree()`, `createPage()`, `addEvidencePair()`, `ensureTagPath()`, full/incremental metadata enrichment, and the current tests' host doubles. List the migrated reads and the exact remaining legacy reads. Cover root `folder:/`, nested containers, Markdown vs attachment names, exact paths/casing, file stats, hierarchical tags and membership.
- [ ] **Create a narrow host collector.** Place Vault/MetadataCache access under `src/adapters/obsidian/`. Accept only needed host capabilities/configuration and current-run/cancellation/yield inputs; avoid passing the whole plugin or exporting GraphPage/mutable state from the collector. Reuse C11 plain records. No host object may enter a record. Do not derive a path or kind from opaque IDs; the Obsidian mapper may explicitly choose existing identity for compatibility.
- [ ] **Consume records in production.** Adapt the authoritative `GraphBuilder` structural build path to consume entity/file-tree/tag-tree facts and call its existing creation/evidence helpers. The collector supplies raw facts; compiler owns relation role/type/direction, tag normalization/exclusions and deduplication. Remove the migrated direct host reads from that structural path. Do not simply create an unused adapter or wrap an unchanged host-reading GraphBuilder method.
- [ ] **Preserve provenance and contribution ownership.** Tag membership declares tag→note but its physical contribution belongs to the member note/revision. Populate C11's contribution owner where it differs from the semantic source. Preserve target resolution/state, semantic and physical paths, file facets and source revisions. Tag hierarchy remains structural. Do not copy arbitrary frontmatter or image data. Property discovery and note-type/style value selection remain in the current enrichment path for C12b/C13.
- [ ] **Keep iteration bounded and cooperative.** Emit/consume at most 256 records per batch, allowing one dense note to span batches. Do not retain a second whole-vault records array, recursively clone host metadata, or build a map of every tag's full member list if streaming can preserve behavior. Preserve cooperative checkpoints and recheck cancellation/current-run after awaited work. Record count alone does not bound bytes; preserve existing body-read budgets and avoid dense raw-value copies. Prefer a fixture with one note carrying >256 tags over a large repository fixture.
- [ ] **Make validity honest.** Bind batches to one read boundary and sequence/finality; trace how existing host revision/current-run checks invalidate an in-flight read across awaits. Do not label file mtime alone a coherent MetadataCache snapshot. If more revision wiring is necessary for this slice, keep it minimal, document ownership and preserve dirty work; do not invent a parallel coordinator or alter latest-wins/event policy. Final cursor validity is necessary, not a completeness validator: materialized target facts must be complete before publication, even when referenced before their entity batch. Preserve existing stale/cancelled build behavior.
- [ ] **Prove exact compatibility.** Keep the old compatibility graph/evidence/scene golden unchanged. Compare all actual entity fields and evidence declarations/decisions, not merely counts. Verify file/tag hidden visibility still retains topology, attachment names keep extensions, shared nested tags do not add duplicate hierarchy, and materialized paths/case/kind/stats are explicit. Include cancellation at awaited yields, later-batch targets, a dense tag source and no body/parser calls in the structural collector. Existing full/incremental tag behavior must still pass.
- [ ] **Run mandatory checks.** Required Node **22.22.2**, clean `npm ci`, `npm run verify`, `git diff --check`. Wire new meaningful tests into mandatory scripts. Production build must use installed real Obsidian types; test doubles are not host validation. New core code must pass ES2021/no-DOM/no-Node typing and architecture checks. Do not reuse the C11 tiny fixture producer's regex grammar, basename resolver/hash IDs or materialized arrays in production. Report unavailable dependencies/host/Git checks accurately.
- [ ] **Prepare host acceptance.** Document which production collector paths changed, body read/cache counters expected unchanged, rollback scope and cleanup owner. Main agent will use `kplex-test` and exact-build CLI checks for full graph/evidence equality, centered folder/tag navigation, hidden topology and reload; selective temporary-note tag edits/deletion may be needed to verify overlap with the retained incremental path. Follow `docs/OBSIDIAN_RUNTIME_TESTING.md`; no permanent window globals or host shims in production. Physical-device checks are requested only where changed behavior cannot be covered by portable/native automation.

## Guardrails and deferred work

No persisted settings/snapshot/cache schema or ID policy change. No user-facing feature, URL referrer UI (#26), layout/view strategy, localization copy, CSS, modal routing or keyboard policy change. Keep diagnostics English and remove temporary instrumentation before delivery. Preserve C08P watchdog/late-publication guarantees, host storage ownership, iOS read/parser policy and demand-driven indexing.

C10 observed a create/delete race during an in-flight full build; reproduction and coordination fixes belong to C14/C15. Do not hide it by deleting evidence, resetting caches or redefining C12a acceptance. If this slice exposes it, record the evidence and retain the pending work requirement.

## Result — fill in on delivery

- Starting branch/commit/dirty state (or unavailable Git metadata):
- Migrated production entry points, new modules and exact remaining host collectors:
- Record/facet/provenance/contribution mappings and compiler ownership:
- Batch/byte limits, revision/current-run checks and cancellation behavior:
- Exact graph/evidence/scene comparisons and dense/overlap tests:
- Node/dependency versions and exact commands/results; failures or unavailable lanes:
- Host/physical-device evidence (offline work normally unavailable; do not claim passed):
- Persisted keys/schemas changed (expected none):
- Cleanup owner, rollback scope, remaining facade consumers and retirement checkpoints:
- Prioritized reviewer checks with precise expected outcomes (maximum three):
- C12a status: Review; parent C12 remains incomplete. Next after acceptance: C12b (Scoped offline-agent candidate for resolved/unresolved links and ontology facts).
