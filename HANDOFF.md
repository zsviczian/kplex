# C11 handoff — normalized source contract and fixture producers

## Assignment and workflow

Implement **C11 only**, after accepted C10. C11 is a **Strong offline-agent candidate** and a contract/fixture checkpoint; production collection/compiler adoption starts in C12/C13. Read `AGENTS.md`, `Refactor plan.md` (handoff workflow, sections 3/4, C11–C17), `docs/ARCHITECTURE.md`, `docs/INDEXING_ARCHITECTURE.md`, and C08P/C09/C10 acceptance reports. Check branch/status and record the actual starting commit; expected branch is `kplex-refactor`.

This single transient `HANDOFF.md` is overwritten per assignment, never archived. Record your result below, update C11 to **Review** in the definitive refactor plan, and deliver uncommitted source changes. The main agent reviews/fixes, validates and requests any necessary prioritized manual checks before committing acceptance. Do not claim unavailable host/device checks passed or mark the checkpoint Done yourself. No Obsidian installation is needed for this contract/fixture implementation.

## Outcome and boundaries

Specify the host-free **normalized input facts** required by the existing semantic compiler, with faithful source identity/revision/kind, semantic metadata, typed source occurrences, target identity/resolution and provenance. Supply small deterministic fixture producers. Records do not own relationship classification/precedence: preserve facts that the existing compiler/resolver needs to make those decisions. Host link resolution stays source-relative and adapter-owned; host Date/Moment/property-registry behavior supplies normalized targets with original provenance.

C11 must not move or replace production `GraphBuilder`, resolver, event coordinator, search, cache or snapshot algorithms. It must not introduce a parallel classifier/compiler or eagerly materialize another full-vault graph/input array. The contract is unused by production until explicit C12 adoption; describe that truthfully. Do not claim the portable semantic engine is complete because portable records exist.

## Practical checkpoints and verifications

- [ ] **Inventory actual source families.** Trace `src/index/GraphBuilder.ts`, `MetadataParser.ts`, `fieldParser.ts`, `RelationEvidence.ts`, `RelationResolver.ts`, `GraphState.ts`, `GraphIndex.ts`, relevant `main.ts` collection/metadata hooks and existing test fixtures. Record where each current evidence source kind originates and which facts it consumes: Obsidian resolved links, unresolved links, frontmatter/inline ontology, body URLs, Date properties, file tree, tag tree and URL origin. Include property-versus-body collisions, image-only link exclusion, mirrored occurrences, hierarchy exclusions and inverse declarations. Every current family needs a mapping/owner, not just a generic catch-all blob.
- [ ] **Define minimal classified contracts.** Place semantic input contracts in `src/core/graph/` or genuinely shared values in `src/core/contracts/`. Use the existing opaque `NodeId` and explicit independent paths/facets; never derive file/path/kind/case from an ID. No imports of legacy `GraphPage`, `RelationEvidence`, `App`, `TFile`, host enums or `GraphIndex`, even transitively. Prefer explicit plain unions/types over `unknown`, generic dictionaries, whole host metadata or speculative APIs. Preserve original definition/property, occurrence kind, raw value and location (line/offset/range as actually available); distinguish physical location from resolved semantic identity.
- [ ] **Specify state and resolution correctly.** Missing, deleted, unresolved and materialized entities are distinct. Source-relative Obsidian link resolution is a producer capability, not a global basename rule in core. Ambiguous names, case-distinct paths, headings/subpaths, links to later batches and missing targets must preserve today's target identity and provenance. Shared URLs have one existing URL target identity and separate declaring-note occurrences/referrers; do not collapse declarations into one owner or implement feature request #26's UI during this checkpoint.
- [ ] **Specify bounded iteration and validity.** Define bounded batches/streams and explicit snapshot/batch/source revision validity. Explain who owns a coherent read boundary, how later target references are complete, when records become stale, and what prevents stale/mixed-source publication. Do not interpret a file mtime alone as a complete host revision guarantee. Supply small tests for later-batch references, replacement/deletion and stale-generation rejection at the contract/test seam. No new production scheduler/publisher is required here. Record limits for potentially dense single-file occurrences; do not disguise an unbounded per-file array as a bounded whole-vault stream.
- [ ] **Create real fixture producers.** Use `tests/fixtures/excalibrain-indexing/` Markdown and its existing graph baseline/readme as the compatibility source. Produce representative normalized facts/provenance for every mapped family and verify correspondence to source occurrences, not merely hand-written expected output agreeing with itself. Fixture parsing/file IO belongs in test or explicit adapter code, not portable core. Also add a small opaque/pathless/case-distinct ID fixture whose semantic paths and source origins differ from IDs. No copying of the large Obsidian vault into the repository and no dependency on installed Obsidian/CLI.
- [ ] **Prove fidelity without reclassification.** Include separate sources sharing one URL, duplicate/mirrored and overridden occurrences, ambiguous names/subpaths, unresolved and deleted targets, Date targets, file/tag membership and image-only exclusions. Golden assertions cover input facts/provenance and source multiplicity; the old compiler/evidence baseline remains authoritative for final meaning. Do not weaken or rewrite graph golden tests to accept changed behavior. Record how C12 will map facts into the existing authoritative compiler incrementally.
- [ ] **Run mandatory portable checks.** Verify Node **22.22.2**, install lockfile dependencies, run `npm run verify` and `git diff --check`. Add the new clean-process/fixture tests to mandatory scripts; core ES2021/no-DOM/no-Node typing and transitive architecture checks must pass. Fixture producer tests must load/run with no Obsidian module/window shim. A stub-only type harness is not the real repository build. Missing network/dependencies must be reported as an environment limitation, not a pass.

## Preserve these accepted seams

C08P restore/watchdog/cancellation guarantees; C09 exact opaque search activation and revision-valid ranked views; C10 parser/operators/raw numeric edge fields, independent semantic/file time/path facts and lazy cached properties/evidence. Do not add arbitrary frontmatter to source records or snapshots for lenses. Keep node imagery/decoded assets out of semantic persistence. No schema/settings-key/default/migration, grammar, ranking, URL canonicalization, classifier precedence, command ID, native UI, CSS or device routing changes.

`docs/INDEXING_ARCHITECTURE.md` assigns parser pools, semantic contribution persistence, latest-wins compilation, snapshot deltas and maintained secondary indexes to later measured checkpoints. C11 may make the per-file contribution ownership/revision contract compatible with that roadmap; it must not implement those optimizations. C14/C15 should later reproduce create/delete-during-build stale publication using the observation recorded in C10, rather than papering over it in source contracts.

No translations are requested. New user-facing captions/help/notifications/errors must be localized; console diagnostics remain English. This checkpoint should not introduce UI copy. Avoid permanent debug globals, service locators or speculative generic host APIs.

## Main-agent acceptance after delivery

The reviewer audits every source-family mapping and fixture against actual current collection code, runs the real portable lanes and verifies no production semantic/persistence path changed. If this remains an unused contract/fixture checkpoint, no new native manual check is expected. If production code is touched, explain why and leave exact-build Obsidian/graph equality evidence pending for the reviewer; do not expand into C12 without approval.

C12 is the next **Scoped** offline-agent candidate, subdivided by source family. A C12a handoff should start with file/container/tag facts and no body parsing, retaining one authoritative compiler. Do not prepare a broad all-at-once collector/compiler rewrite in this assignment.

## Delivery — fill in before returning

- Starting branch/commit and initial dirty state (or explicit ZIP/no-Git limitation):
- Inventory: each source kind, existing collector/host API, consumed facts, normalized mapping and future owner:
- Added contract/modules and whether any production consumer uses them (expected: none yet):
- Batch/stream limits, single-dense-file behavior, reference completeness and revision/publication validity:
- Fixture sources/producers and independently verified provenance/multiplicity:
- Preserved graph/settings/snapshot behavior and any reviewer decision needed:
- Added clean-process/fixture/revision tests and mandatory-script integration:
- Node/dependency versions, exact attempted commands and pass/fail/unavailable evidence:
- Host/physical-device checks (expected: unavailable/unnecessary for unused contract):
- Persisted keys/schemas changed (expected: none):
- Remaining legacy collection/read consumers and retirement checkpoints:
- Cleanup/lifetime owner and rollback scope:
- Prioritized reviewer checks and expected outcomes:
- C11 status: **Review**, pending main-agent acceptance.
