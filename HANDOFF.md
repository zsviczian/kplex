# C10 handoff — lazy properties and portable predicate/lens evaluation

## Assignment and workflow

Implement **C10 only**, after accepted C09. C10 is a **Strong offline-agent candidate**: no Obsidian installation/CLI is required for implementation and portable validation. Read `AGENTS.md`, `Refactor plan.md` (workflow, C10 and invariants), `docs/ARCHITECTURE.md`, and the C09 acceptance report before editing. Check branch/status and record your actual starting commit; expected branch is `kplex-refactor`.

This is the single transient handoff. Update its delivery section in place; do not archive it or create another running log. The definitive tracker is `Refactor plan.md`. Deliver reviewable uncommitted source changes, update C10 to **Review**, and summarize attempted/passed/unavailable checks truthfully. Do not mark Done or commit acceptance: the main agent reviews, fixes, tests the exact build in Obsidian, and reports any prioritized manual checks. Accepted results persist in the refactor plan before this file is overwritten for the next assignment.

## Outcome

The production Quick Filter / Graph Lens predicate and lens evaluation must run through host-free data/contracts and a lazy property provider. Core evaluation must not import `App`, `TFile`, `GraphIndex`, legacy `GraphPage`, plugin state or mutable neighbour maps, even transitively. Obsidian remains responsible for cached metadata and physical file facts. Keep existing expressions, comparisons, filtering/style/evidence semantics and persisted settings byte-compatible.

C09's read port is deliberately **search-only**. Do not pretend it already exposes evidence or neighborhoods. Add only the narrow property/evidence capabilities required by the real C10 callers, using the established C08/C09 boundary patterns. Preserve C09 search and C08P termination/lifetime guarantees.

## Practical checkpoints and verifications

- [ ] **Inventory the real path before changing it.** Read `src/lens/GraphPredicate.ts`, `GraphPredicateParser.ts`, `GraphLens.ts`, `GraphLensSimple.ts`, `SimplePlexFilter.ts`, and their production callers in `src/ui/App.tsx`, `PlexGraph.tsx`, `layout.ts`, `PlexFilter.tsx` and `main.ts`. Trace frontmatter refresh separately from semantic indexing. Read existing predicate/lens fixtures in `tests/indexing.test.mjs`. Record actual consumers and compatibility-delegate retirement owners.
- [ ] **Extract contracts and computation.** Use classified folders such as `src/core/plex/` for portable predicate/parser/lens behavior, `src/core/graph/` or `contracts/` for consumed read contracts, and `src/adapters/obsidian/` for host mapping. Preserve grammar/AST/operator behavior first. `node.path`, `file.path`, `this`, edge source/target paths and folder tests need explicit semantic path data; never infer a path/kind/case from opaque NodeId. C08 file facets omit basename/ctime/size: expose only needed additional plain facts without silently losing their existing semantics or equating file mtime with semantic page mtime.
- [ ] **Provide properties lazily.** Host code resolves cached frontmatter/required file facts for a requested candidate and field. No Markdown body reads, full-frontmatter copies, whole-vault scans, new graph-wide DTO store, generic property collection during indexing, or eager loading of all referenced properties for every visible node. Preserve missing/null/scalar/list behavior, field-name lookup and file-kind rules. Frontmatter remains host cache data, not persisted GraphNodeView state. No property refresh may request a new semantic rebuild solely to reevaluate a lens.
- [ ] **Isolate evidence access.** Replace `GraphLens.ts` concrete `index.explainRelationship()` reach-through with a narrow adapter returning plain decision/evidence values only when an evidence-scope candidate is evaluated. Preserve active/suppressed evidence, suppression reason, relation kind/direction/definition and exact field values. This is a bounded read seam; do not extract the resolver or redesign evidence storage. Do not treat presentation-filtered neighbors as raw adjacency.
- [ ] **Integrate real production callers.** Construct host providers at composition boundaries, migrate actual Quick Filter / Graph Lens evaluation and preserve labels, center context and current-Plex candidate scope. Narrow compatibility delegates/re-exports may remain for unmigrated callers, but they must use the extracted implementation rather than maintaining a second evaluator. Track remaining concrete consumers. Metadata-only property changes must still refresh visible affected evaluations through existing dependency-driven notifications; hidden views catch up on reveal. Keep graph visibility, filtered gate-count mode, Keep layout/Reflow and style precedence intact.
- [ ] **Prove behavior in a fresh process.** Plain IDs/data and fake providers must exercise the actual portable implementation without Obsidian/window stubs. Cover missing/null/scalar/list/negative operators, exact versus case-normalized comparisons, tags/folder/file facts, `this`, parser round trips/errors and dependency collection. Cover include union, exclude subtraction, multiple ordered style lenses (later fields win), disabled/invalid lenses, style-only visibility/count behavior, and active/suppressed evidence. Include opaque/pathless/case-distinct IDs with independent path facets. Provider-call counters must show unrequested properties and evidence are not read; short-circuit and unrelated candidate paths must remain lazy. Preserve existing characterization tests rather than merely rewriting them to agree with the new code.
- [ ] **Run required portable checks.** Verify Node **22.22.2**, install lockfile dependencies, run `npm run verify` and `git diff --check`. Include new clean-process tests in the mandatory scripts. Restricted core ES2021/no-DOM/no-Node type checks and architecture transitive checks must pass. Build against real installed Obsidian types, not invented APIs or stub-only proof. Do not weaken boundary rules, timer assertions or existing tests to hide failures; record unrelated failures with evidence.

## Guardrails

No settings-key/default/migration, snapshot/schema, graph identity/role/URL semantics, search ranking, modal/CSS/device routing or command-ID changes. No generic service locator, global plugin discovery, speculative all-purpose graph API, permanent debug globals or new dependency without a demonstrated need. Do not copy vault data into the portable layer. Do not implement C11–C18 optimizations from `docs/INDEXING_ARCHITECTURE.md` during C10.

Every newly introduced user-facing caption/help/notification/error must use localization. Console diagnostics remain English. Preserve existing parser/validation output compatibility when mechanically moving code; identify remaining localization work and its owner rather than rewriting unrelated copy. Environment-specific modifier labels remain supplied by the existing presentation environment.

## Main-agent host acceptance after delivery

The reviewer installs the exact built artifacts using `npm run verify:obsidian` in the explicitly selected disposable `kplex-test`. Use `docs/OBSIDIAN_RUNTIME_TESTING.md` for `app.plugins.plugins["k-plex"]` inspection and cleanup; working-tree TypeScript is not the live plugin. Missing CLI/device access is unavailable evidence, never a silent pass.

Prioritize: (1) change an arbitrary frontmatter property used by an open filter/lens and confirm immediate reevaluation without a new full graph build; (2) verify include/exclude composition, style-only appearance without visibility/count changes, and Keep layout/Reflow in the reference graph; (3) verify evidence-scope matching including suppressed evidence and center `this` semantics. Compare saved expressions/settings with baseline. Choose at most three manual checks only for behavior not established by automation; physical devices are needed if native touch/keyboard mechanics unexpectedly change. Test on current large vault using only currently materialized candidates; do not claim C00 physical-device performance is closed.

## Delivery — fill in before returning

- Starting branch/commit and initial dirty state:
- Selected production consumers and complete call path:
- Added/extracted portable contracts/modules and lazy host providers:
- Preserved semantics and any reviewer decision needed:
- Remaining compatibility delegates/concrete readers and named retirement checkpoints:
- Dependency-driven property refresh versus semantic rebuild behavior:
- Added behavior/provider-call/clean-process tests:
- Node/dependency versions, exact commands, pass/fail/unavailable evidence:
- Host/physical-device checks performed (or explicitly unavailable):
- Persisted keys/schemas changed (expected: none):
- Cleanup/lifetime owner and rollback scope:
- Prioritized reviewer host/manual checks and expected outcomes:
- C10 status: **Review**, pending main-agent acceptance.
