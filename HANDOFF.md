# C13b handoff — portable evidence/resolver and semantic types

## Assignment and workflow

Implement **C13b only**, from the main-agent C13a acceptance commit on `kplex-refactor`. Record the actual starting revision/dirty state, or explicitly unavailable Git metadata in a ZIP. This is a **Strong offline-agent candidate**: implementation and portable tests do not require Obsidian. Read `AGENTS.md`, `Refactor plan.md` sections 3–5/C08/C11–C16, `docs/ARCHITECTURE.md`, `docs/NORMALIZED_SOURCE_CONTRACT.md`, `docs/INDEXING_ARCHITECTURE.md` and the C13a validation report.

This single `HANDOFF.md` is transient and overwritten, never archived. Return uncommitted changes and complete the result below. Mark C13b **Review**, not Done. Main agent reviews/fixes, runs mandatory portable and applicable native checks, persists acceptance in the refactor plan and commits after validation. Do not implement C13c, C14 or new worker-pool behavior. Parent C13 remains Pending until the full production compiler is also portable.

## Outcome

Move `RelationEvidence`/`RelationResolver` algorithms and only their required semantic types into portable core with explicit cooperative clock/yield/cancellation capabilities. The existing production compiler, incremental overlays and explanation consumers must use the new single owner through compatibility facades. Preserve evidence compactness, original declaration ownership/multiplicity, inverse views, role classification, frontmatter precedence and all publication-independent behavior.

## Practical checkpoints and verification

- [ ] **Inventory first.** Trace every caller of `RelationEvidence`, `RelationResolver`, `GraphState`, `types.ts` relation enums/models, and `SectionExpansion`. List pure algorithms, SDK-bearing types and actual host timer/clock reads. Inventory store fork layering, tombstones, path-indexed access/removal, rename, declaration IDs/counts, reverse views and mutation callers before moving anything.
- [ ] **Narrow semantic types.** Extract only enums, roles, evidence, relation flags and resolver input/output types actually required. Preserve numeric `RelationType`/`LinkDirection` values and serialized field names. No type-only `TFile`, legacy `GraphPage`, settings/plugin/UI or Obsidian import may reach core. Use a small generic/plain resolver target or explicit host-free port; keep file binding in the legacy/adapter owner. Retain stable legacy exports/signatures where callers need them. Do not move all of `types.ts`, duplicate full GraphPage models, replace reference binding with a copied vault, or force a new persistence shape.
- [ ] **Move evidence algorithms intact.** Keep one authoritative `RelationEvidenceStore`, precedence/application owner and declaration representation. Preserve compact pair buckets, pair/path indexes, copy-on-write fork/read-through/tombstone/flatten behavior, ID sequence and counts. Keep original declarations separate from generated inverse views; never emit additional mirrored records. Do not change global/path-scoped removal or rename semantics while moving them. No new O(all-evidence) small-edit operation or per-read whole-store array.
- [ ] **Move resolver/classifier intact.** Preserve role vectors, inferred-friends option, defined versus inferred rules, conflicts, directional hidden evidence, full/pair/cooperative resolution and target reference identity. Keep all current classifying consumers on the same implementation, including SectionExpansion. Compiler role assignment and normalized-source ingestion stay C13c, not a second classifier in an adapter.
- [ ] **Inject cooperative runtime.** Portable resolution requires explicit clock/yield/lifetime policy, preserving the current 7 ms budget, batch cancellation checkpoints, progress notifications and checks before/after awaited yields. A host compatibility wrapper may keep current signatures and select `performance.now()`/renderer timer. Core has no browser global, default timer or hidden scheduler. Publication remains outside the resolver; cancellation must not publish private partial state.
- [ ] **Explanation compatibility.** Preserve exact existing roles, decisions, suppression reasons, summaries and source labels returned by legacy explanation APIs. Prefer retaining unchanged user-copy formatting in the compatibility facade over broadening localization work into C13b. Core owns decisions/reasons once; a formatter must not reclassify evidence. Add no new user-facing literals or localization/host branding changes. L01 remains the separately tracked whole-source copy migration.
- [ ] **Explicit identity boundaries.** Existing path-keyed declaration APIs use explicit semantic paths, not opaque IDs interpreted as paths. Keep case-sensitive/path-index behavior and source ownership stable; never derive kind/file/path from ID strings or invent basename resolution. Document any retained path-keyed compatibility API and its C13c binding owner. Do not claim a pathless full compiler from resolver-only work.
- [ ] **Production wiring and portability enforcement.** Update legacy facades/callers to delegate to the portable owner; remove implementation copies. Add restricted-core type/runtime and architecture coverage; no allowlist broadening merely to hide a legacy import. Keep `GraphBuilder`, GraphIndex publication, settings, parser workers, cache and snapshots at their current owners. The parser extraction is already accepted; do not rewrite it.
- [ ] **Independent behavioral parity.** Compare frozen accepted C13a evidence/resolver outputs or actual accepted implementation against new output, not only two helpers that can share a bug. Cover frontmatter/inline conflicts, multi-role conflicts, reverse/inverse views, hidden/self/index exclusions at their existing owners, tag/file/Date/URL declarations, inferred-friends toggle, duplicate provenance/multiplicity, source ownership and exact explanations. Keep existing graph/evidence/scene goldens and strict timing thresholds unchanged.
- [ ] **Store and scheduling tests.** In a clean process without Obsidian/window/DOM shims, exercise add/fork/replace/remove/rename/flatten and path-indexed queries. Prove base-store isolation, tombstones, count/ID stability and coherent inverse views. Fake clock/yield tests prove budget, post-await cancellation and progress callbacks. Full/cooperative/pair results agree with accepted output; bound the test sizes and measure representative dense graphs without changing thresholds to pass.
- [ ] **Required checks.** Node **22.22.2**, clean `npm ci`, `npm run verify`, real installed Obsidian types/build, official lint and `git diff --check`. Wire new tests into mandatory scripts. Report exact versions/results and all failures/unavailable lanes. Native acceptance remains with main agent; do not claim physical-device or actual UI performance from fake schedulers/fixtures.

## Guardrails and pending owners

No settings/defaults/schema/version/cache/persistence/UI/CSS/command/localization changes. No evidence semantic simplification, speculative normalization, snapshot format migration, broad file renaming, worker-pool change or incremental publication redesign. Console diagnostics remain English. Move code intact before simplifying; explain any unavoidable deviation with an independent parity test.

C13c still owns full compiler/source materialization and host file binding. C14 owns incremental compilation/publication; C15 demand/revision coordination; C16 cache/storage orchestration. Current create/delete-during-build and physical iOS performance work stays explicitly pending. Preserve GraphState's private-at-build/publish boundary and source-revision compatibility fences. C18/C20b/C22 retain imagery/section/editing host parser facades. No new persistent resources belong to the portable owner.

## Result — fill in on delivery

- Actual starting revision/branch/dirty state or unavailable Git metadata:
- Inventory and extracted semantic/evidence/resolver types/owners; retained facades/callers:
- Production wiring and exact host clock/yield/binding seam ownership:
- Store overlay/index/declaration/inverse/multiplicity parity and independent oracle evidence:
- Classification/precedence/explanation parity and normalized identity limits:
- Clean-process portability, fake scheduling/cancellation and scaling results:
- Exact Node/dependency versions, commands/results, failures and unavailable lanes:
- Persisted keys/schemas/policy changed (expected none):
- Residual seams and rollback scope:
- Up to three prioritized reviewer checks with precise expected outcomes:
- Status: **C13b Review**, parent C13 Pending; next proposed slice C13c (Strong offline candidate).
