# C13c handoff — portable full compiler

This is the single transient handoff. Overwrite it for the next assignment; do not archive it or use it as an ongoing log. `Refactor plan.md` is the definitive tracker. The main agent reviews the returned changes, fixes findings, runs applicable native checks, reports prioritized manual tests if needed, and commits only after acceptance.

## Starting point and objective

Work on `kplex-refactor` from the accepted C13b commit containing this document. Record the actual revision, branch and dirty state before editing; if the supplied ZIP has no Git metadata, state that explicitly. Read `AGENTS.md`, `Refactor plan.md` sections 3–6 and C13/C14, `docs/ARCHITECTURE.md`, `docs/NORMALIZED_SOURCE_CONTRACT.md`, `docs/INDEXING_ARCHITECTURE.md` and the C12/C13 validation reports.

**C13a and C13b are accepted. C13c is a Strong offline-agent candidate.** Move full graph semantics over normalized source facts into a portable compiler and wire the actual Obsidian full-build path through it. Preserve behavior and current output. C13 remains Pending until this returned production path passes main-agent acceptance. Do not mark the parent Done yourself or implement later checkpoints.

C13b now owns one evidence store/precedence/application implementation and one resolver/classifier. Numeric enums and legacy imports remain stable. Its renderer scheduling wrapper is outside core. Existing explanation English copy was moved intact and independently compared; L01 owns its catalog/reason-format separation. Do not broaden that copy migration here.

## Bounded scope and ownership

The extraction starts in `src/index/GraphBuilder.ts`: inventory full `build()`, source-family ingestion/finalization, entity creation, role assignment, target/materialization rules, source exclusions, metadata/discovery projection, image-only link reconciliation, tags, Date/URL/origin derivation and final resolution. Trace shared full/patch helpers before changing them. `GraphState`, `GraphIndex`, snapshot hydration and `SectionExpansion` currently remain legacy consumers.

- Portable core owns graph meaning: normalized facts to entities, original declarations, metadata/discovery and resolved relationships. Reuse accepted parser/evidence/resolver implementations; no second classifier or mirrored declarations.
- Obsidian owns source acquisition, CachedMetadata/body merge, physical file lookup and `TFile` binding, source-relative resolution, Date/Daily Notes/registry behavior, cache/storage and worker selection. Existing normalized collectors already provide resolved targets and provenance. Core must not recover these capabilities from a plugin/App or read arbitrary properties.
- Inject explicit time/yield/lifetime policy. Host code selects platform budgets and the renderer clock/timer. Full results remain private until the existing publication boundary accepts them. Keep source/generation/file revision fences before and after awaits and at finalization.
- C14 owns incremental staging/publication extraction and shared contribution cleanup; C15 demand/revision coordination; C16 body/cache/snapshot orchestration; C18 presentation ownership. Retain narrow named compatibility delegates as needed, with explicit retirement owners. Do not pretend incremental/publication work is already portable.

## Practical checkpoints and verifications

- [ ] **Inventory and baseline.** Map every full-build semantic helper, source family, legacy field and binding caller. Capture accepted output independently before moving code. Use actual accepted implementation or a frozen pre-move oracle; comparing two new helpers is insufficient. Record expected schemas/settings/output ordering and retained host seams.
- [ ] **Small portable input/output boundary.** Consume C11 normalized facts and narrow semantic settings projections. Define only mutable compiler types actually needed, with plain data and explicit identity. Do not import `GraphPage`, `TFile`, App, plugin/settings/UI or adapters into core, including type/transitive imports. Do not copy the full legacy model or pass an unrestricted plugin-shaped port. Host file objects bind only in the adapter, preserving existing target reference identity for legacy callers.
- [ ] **Opaque identity proof.** Preserve exact `NodeId`, explicit kinds, resolution/materialization, optional semantic/physical paths and contribution ownership independently. Compile the compatibility and opaque-ID/pathless/case-distinct fixtures. Never infer path/kind/extension/basename from ID strings or reject a valid pathless fact solely because legacy pages require paths. If C13b's path-keyed resolver/store needs an explicit identity binding/generalization, isolate and document it, preserve the legacy API/serialized fields, and test accepted and opaque outputs independently. An opaque ID must not be smuggled into a field claimed to be its semantic path.
- [ ] **Move working semantics intact.** Preserve configured ontology assignment, frontmatter/inline precedence, inferred-friend option, Hidden directionality, self/index exclusions, unresolved materialization, duplicate provenance, original declaration IDs/counts and inverse views. Preserve physical/tag hierarchy, Date facts, body URLs with aliases/locations, malformed URLs without invented origins, shared URL origins/lifetime, field discovery, metadata surface precedence and image-only suppression. Keep array/order/null/unsupported-marker behavior covered by existing fixtures. Do not simplify accepted grammar or normalization.
- [ ] **Bounded streaming.** Keep bounded collector batches and read-window/family finalization behavior. Do not retain a second whole-vault source array, clone full host link maps, scan all evidence for each record, or add per-read whole-store arrays. Preserve pending target facts when entities arrive later and coherent-read fences when a producer becomes stale. Preserve accepted durable body read/file/byte limits in host orchestration.
- [ ] **Production wiring.** Actual Obsidian `GraphBuilder.build()` must delegate semantic compilation to the portable owner. No unused alternate compiler or test-only path. Remove full-path implementation copies, while retaining named shared delegates for the existing incremental owner until C14. Document exact remaining seams and callers. Keep cache keys/versions/snapshot bytes/settings/defaults/command IDs/UI and platform policy unchanged.
- [ ] **Cooperative/cancellation proof.** Fake runtime tests cover yields, progress and cancellation after awaited input, source batch/finalization and resolver yield; stale generations cannot publish partial state. Successful full results match accepted output. Keep current source/publication policy; do not conceal unresolved create/delete-during-build behavior under a new scheduler or false acceptance claim.
- [ ] **Mandatory checks.** Required Node **22.22.2**, clean `npm ci`, full `npm run verify`, installed actual Obsidian typecheck/build and `git diff --check`. Register tests in mandatory scripts. Update the indexing harness's explicit transpilation list when imports move: C13b review caught this missing wiring. Keep strict goldens/timing bounds/lint active; do not use stubs as a real build claim. Clean-process tests must import actual portable modules without Obsidian/window/DOM/Node host shims. Extend architecture rules without permissive legacy allowlists.
- [ ] **Delivery and tracking.** Set C13c to Review in the plan, append a concise durable implementation summary and fill the result below with actual evidence, unavailable lanes and residual owners. Leave changes uncommitted for main-agent review. No native/physical test claim from offline fixtures.

## Main-agent acceptance on return

The main agent reruns required portable/build checks, then exact-build native acceptance in `kplex-test`. Accepted clean graph: **20,701 nodes / 1,225,746 directed neighbor entries / 715,030 original declarations**, complete canonical declaration SHA-256 **`587e33e9a4eba5e6804f7348c39aa293dbe5ca0f7c8c1c4330520569be85bb57`** (generated IDs omitted, recursively sorted object keys, canonical records sorted, hash concatenated without separators). Do not replace or relax a mismatching baseline; investigate against the actual accepted compiler on the same live inputs. File mtimes/order can vary between reloads, so an unexplained whole-page hash mismatch is not semantic proof either way.

Native checks include representative all-kind/source-family behavior, actual body/metadata edits and full/patch parity, shared URLs/large files, cancellation, foreground warm observation and cleanup. Use `docs/OBSIDIAN_RUNTIME_TESTING.md` for plugin inspection. Readiness **and full hydration** must settle before authoritative capture; assert captured-state identity across awaits. After disable/enable, explicitly open K-Plex to restore demand. Do not run dependent probes after a failed precondition. Temporary SDK accessors/test globals must be removed from source and final artifact; restore original throttling even on failure. Diagnostic throttle runs are semantic evidence only. C00 cold/native-device matrix and physical iOS performance remain open; do not change worker policy or add the two-worker experiment in this extraction.

## Guardrails and rollback

No UI/CSS/command/localization/settings/defaults/cache-schema/version/persistence changes, worker pool, new scheduler or incremental publication redesign. Console diagnostics remain English. Moving unchanged English explanation copy is not completion of L01. Preserve private graph publication, source ownership, compact evidence, target binding and cleanup. Rollback should restore compiler/delegates/adapter wiring/tests/docs without a persisted-data migration.

## Result — fill in on delivery

- Actual revision/branch/initial dirty state or unavailable Git metadata:
- Inventory, extracted compiler types/algorithms and production delegation:
- Exact normalized input/opaque identity/host binding design:
- Retained host/shared incremental seams with removal owners:
- Independent accepted oracle/actual-implementation comparison and source-family coverage:
- Streaming/read budgets, fake scheduling/cancellation/stale-generation proof:
- Exact Node/npm/dependency versions, commands/results and failures/unavailable lanes:
- Persisted keys/schemas/settings/policies changed (expected none):
- Residual risks, rollback scope and up to three prioritized reviewer checks:
- Status: C13c Review; parent C13 Pending until main-agent acceptance:
