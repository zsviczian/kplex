# Normalized source contract (C11)

C11 defined the host-free input vocabulary that later checkpoints feed into the existing K-Plex semantic compiler. Production C12 adoption is complete: C12a supplies structural facts, C12b supplies aggregate host-link and ontology facts, and C12c supplies Date, body URL/origin, presentation-link, semantic metadata and discovery facts, while `GraphBuilder`, `RelationEvidence` and `RelationResolver` remain the authoritative compiler/resolver. C13 owns compiler/parser extraction; source-boundary adoption does not make the legacy compiler portable. `GraphIndex`, the event coordinator in `main.ts`, search, cache and snapshot algorithms remain on their existing owners.

The runtime contract is `src/core/graph/source.ts`. It carries source facts, not resolved relationship meaning. In particular it does **not** contain ontology roles, inference direction, `RelationType`, precedence decisions or inverse evidence. Those remain authoritative in the existing compiler/resolver until C13 moves that code intact.

## Current source-family inventory and future ownership

| Existing evidence/source family | Current collector / host fact | Facts currently consumed | C11 normalized mapping | Future owner |
| --- | --- | --- | --- | --- |
| `file-tree` | `ObsidianStructuralSourceCollector` walks `Vault.getRoot()` / `TFolder.children`; GraphBuilder creates file/folder pages | Exact physical child path, file/folder kind/name, direct parent container | `entity` + `file-tree`; identity, semantic/physical path and kind are independent | C12a Obsidian structural collector; C13 compiler creates the same defined child evidence |
| `tag-tree` | `ObsidianStructuralSourceCollector` uses host `getFileCache()` + `getAllTags()`; C12c incremental metadata supplies parsed tags to compiler `ensureTagPath()` | Raw tag membership, hierarchical tag segments, declaring tag/member identity | `semantic-metadata(tag)` + `tag-tree` with `tag-child` or `entity-member` | C12a structural/full membership and C12c parsed patch tags retain distinct accepted contribution semantics |
| `obsidian-link` | `ObsidianHostLinkSourceCollector` reads `MetadataCache.resolvedLinks[source][target]` | Exact host-resolved target path and aggregate occurrence count | `obsidian-link` with `occurrenceCount` and adapter-owned target identity | C12b production adapter; C13 later consumes the same fact in the host-free compiler |
| `unresolved-link` | `ObsidianHostLinkSourceCollector` reads `MetadataCache.unresolvedLinks[source][target]`; compiler `ensureVirtual()` materializes the placeholder | Source path, unresolved target spelling/path and count; K-Plex index file is excluded as a source by the compiler | `unresolved-link` pointing to an explicit `unresolved` entity | C12b production adapter |
| `frontmatter-ontology` | existing metadata merge/parser feeds `ObsidianOntologySourceCollector`; shared property-link grammar enumerates literal refs | Original configured property name, normalized field name, raw property value, exact host-selected/unresolved/URL target | `frontmatter-ontology`; no role is stored in the record | C12b production adapter; current GraphBuilder applies hierarchy roles and C13 later extracts that compiler |
| `inline-ontology` | `parseBodyMetadataCore()` emits `InlineFieldOccurrence`; `ObsidianOntologySourceCollector` resolves each target | Actual inline field name plus configured field identity, normalized field, raw value, line and character range, target | `inline-ontology` preserving those physical locations | C12b production adapter; current GraphBuilder applies role mapping/precedence |
| `body-url` | `parseBodyMetadataCore().urls` | Declaring Markdown source, literal URL, optional label, line | `body-url` with one shared URL target identity, separate source occurrence, physical provenance, and optional successfully parsed origin target | C12c production adapter; C13 extracts current inferred link evidence |
| `url-origin` | `ObsidianMetadataSourceCollector` parses `new URL(bodyUrl).origin`; GraphBuilder keeps one derived origin→URL declaration while at least one body referrer exists | Body URL target and parsed origin; source multiplicity is consulted for lifetime but not collapsed into one URL owner | **No independent source record.** `body-url.origin` is the normalized input; `url-origin` stays a compiler-derived relation | C13; C14 owns incremental derived-lifetime behavior |
| `date-property` | `MetadataTypeManager` identifies Date properties; host Moment + Daily Notes folder/format render the target | Original property name/value plus normalized Daily Notes target path and whether it is materialized | `date-property` with `resolvedBy: daily-notes`; original property provenance is retained | C12c production adapter. Date/Moment/property-registry behavior remains in the Obsidian adapter; C13 only sees the normalized target |
| presentation-only image reconciliation | `ObsidianMetadataSourceCollector` emits configured visual references and demand-only exact host counts; GraphBuilder reconciles them | Configured field name/surface, resolved target and count; decoded image bytes are not used | `presentation-link` occurrence beside the generic host-link summary | C12c production adapter; C13 keeps the existing “remove generic inferred link only when all occurrences are visual” rule |
| aliases / note type / style-tag inputs | `mergeFileMetadata()` supplies `ObsidianMetadataSourceCollector` with configured note-type/primary-tag inputs | Alias values, tags, configured note type and primary-tag-field source values | `semantic-metadata`; preserve separate frontmatter/inline values and surfaces; only graph-relevant metadata is allowed | C12c production adapter; arbitrary frontmatter remains outside semantic records |
| property discovery | `ObsidianMetadataSourceCollector` inspects frontmatter keys and physical inline occurrence names | Original/normalized field names and surface, including non-ontology fields, without arbitrary values | `field-name`; compiler retains existing rebuild-count / patch-discovery policy | C12c production adapter; C13 compiler extraction |

`RelationEvidenceStore` currently stores only original declarations. Reverse/inverse views are generated by `between()` from the original declaration; normalized source records likewise do not emit mirrored inverse declarations. `RelationResolver.applyOntologyPrecedence()` remains the sole owner of frontmatter-over-conflicting-inline precedence, and `classifyRelation()` remains the owner of visible role classification. C11 does not duplicate either algorithm.

### Existing collisions and exclusions that must survive collection

- A host-resolved ordinary link can point to the same target as a frontmatter/inline ontology occurrence. Both inputs must survive; defined/inferred meaning is resolved later.
- Conflicting frontmatter and body ontology occurrences remain separate records with their original property/value/location. C11 does not suppress the body occurrence.
- Multiple inline declarations for the same pair remain separate occurrences. The compatibility fixture contains duplicate/conflicting declarations intentionally.
- Hidden declarations are still ontology source facts. The existing compiler excludes self-links and the configured K-Plex index target and treats hidden evidence as directional; those are compiler rules, not normalized-source rules.
- Reverse relationship evidence is virtual and remains compiler-owned; a producer must not emit an extra inverse source occurrence.
- Presentation/image fields are represented only as link-reconciliation facts. Image decoding, resource URLs and node imagery stay out of semantic persistence.
- `url-origin` is derived from successfully parsed body URL origins; malformed URLs keep their raw URL node and omit origin evidence. A shared URL has one URL identity and one derived origin relation, while every declaring note keeps its own `body-url` occurrence/referrer.

## Identity, resolution and provenance

`NodeId` remains opaque. `SourceEntityRef` carries `id`, `kind`, materialization `state`, optional `semanticPath` and optional `physicalPath` as independent facts. A producer may therefore represent case-distinct paths with different IDs, an unresolved semantic target without a file, a deleted/pathless identity, or an ID whose text has no relationship to a path.

`SourceRecordBase.contribution` identifies a physical per-note contribution when it differs from the semantic declaring node. For example, tag membership declares tag→note but is withdrawn/recomputed with the member note. C12 producers must populate this owner/revision for those facts; tag hierarchy itself remains structural. This does not prescribe persistence or change current withdrawal algorithms.

Entity state has four explicit values:

- `materialized`: the coherent read contains the semantic entity (a host file when that kind has one);
- `unresolved`: a semantic target identity exists but no backing entity resolves for this declaration;
- `missing`: the producer has no entity for the identity in this coherent read (distinct from a deliberate unresolved placeholder);
- `deleted`: a newer source revision says a previously observed identity was removed.

`SourceTargetRef` keeps the raw declared target/subpath apart from the exact entity chosen by the producer. This is the contract for ambiguous names, headings/subpaths, source-relative Obsidian resolution, case-distinct paths and links to records that arrive in a later batch. The Obsidian adapter is responsible for `getFirstLinkpathDest`/metadata-cache semantics. Portable core must not add a global basename/case rule.

`SourceProvenance.definition` preserves the existing evidence/property definition label when the producer already exposes one; `fieldName` keeps the original physical property presentation while `normalizedFieldName` is only a lookup key, not a relationship role. C12b additionally carries `configuredFieldName` for ontology facts so a physical inline spelling can remain distinct from the configured assignment label and the compiler can preserve multiple configured role-group assignments without teaching the adapter semantic roles.

Metadata/property provenance includes its frontmatter/inline/body/host surface where available. Preserve competing note-type/primary-tag values rather than selecting frontmatter precedence in a source producer. `field-name` facts preserve current discovery inputs without carrying unrelated values.

Physical source location is similarly independent. Inline ontology can carry one-based line plus zero-based character range. Body URLs currently have line information and the fixture producer supplies a verified range. Frontmatter provenance currently has the property and raw value but production does not own a reliable body character range for it. Resolved/unresolved host link maps are aggregate source→target counts; C11 therefore does not invent per-link locations for those summaries.

## Bounded iteration and validity

A normalized read is a sequence of `NormalizedSourceBatch` objects, each limited to **256 records** by the contract. A dense single Markdown file is allowed to span as many batches as necessary; there is intentionally no `FileContribution.occurrences[]` container that can become a hidden unbounded full-file/full-vault allocation. The repeated `source` + `sourceRevision` and, where different, `contribution` owner/revision supply later contribution keys if measurement justifies persistence. **The 256-record cap bounds record count, not payload bytes.** Raw values/labels may be long; C12/C13 must retain existing byte-limited reads and avoid copying a dense field value once per target. A record-count cap alone is not a memory/performance guarantee and must not be reported as one.

The producer owns two different revision concepts:

1. `SourceRevision` is the opaque revision of one declaring source. An Obsidian adapter may include mtime/size in how it constructs the token, but mtime alone is not asserted to be a complete host revision guarantee.
2. `SourceReadBoundary` contains an opaque collection generation and coherent snapshot revision for the whole read.

Within one coherent boundary, `sequence` is the batch validity/ordering token: batch content cannot be revised in place. If a producer observes changed content, replacement or deletion, it must mint a new generation/snapshot boundary rather than reuse a sequence number from the old read. `acceptSourceBatch()` is only a contract-seam validator. It accepts sequential batches from one boundary and rejects mixed boundaries, sequence gaps, batches after finality and oversized batches. `sourceReadCanPublish()` becomes true only after a final batch **and** only if the adapter still reports the same generation/snapshot boundary. A producer must supply complete entity facts for materialized referenced targets before finality (and explicit unresolved/missing/deleted state for absent endpoints). An early batch may reference an exact target identity whose `entity` fact appears later. The cursor checks only sequence/boundary/finality, **not record contents or entity completeness**; `sourceReadCanPublish()` is a necessary stream-validity condition, not sufficient proof that a compiler result is valid. C12 producers/C13 compiler must enforce completion before graph publication, without assuming batch-local target order. Fixture tests verify endpoint fact completion, including Date placeholders. Replacement/deletion during collection must mint a newer boundary; the older complete stream is stale and cannot publish.

C11 does not define how Obsidian captures a coherent boundary or schedule/retry work. C12 must capture the host facts; C14/C15 later own latest-wins compilation/publication/demand coordination. The create/delete-during-build observation recorded during C10 remains a C14/C15 validation case rather than being hidden inside these records.

## Fixture producers and coverage

`tests/support/normalizedSourceFixture.mjs` is a test-only adapter. It reads the existing `tests/fixtures/excalibrain-indexing/Vault` Markdown/filesystem and emits normalized records without Obsidian, DOM or a window shim. The test compares declaring-source/target multisets and record multiplicity for all directly normalized legacy evidence families with the authoritative `graph-baseline.json`, and separately checks source text/ranges rather than accepting a hand-written record list.

A second tiny fixture under `tests/fixtures/normalized-source/` covers source-relative same-basename resolution, headings/subpaths, an unresolved target, a configured thumbnail link that is both a host-link and a `presentation-link`, separate notes referring to one shared URL identity, and opaque/pathless/case-distinct identity examples. It is not part of the production compatibility vault and therefore cannot change the existing graph golden.

The tiny fixture producer intentionally materializes test records and uses a limited fixture grammar/resolver, deterministic test IDs and injected Date configuration. It is **not** a production parser, Obsidian resolution oracle, revision capture implementation or memory benchmark. Do not reuse its basename rules/hash IDs, regex grammar or full arrays in C12. Mandatory existing legacy-parser/graph tests remain authoritative. Reviewer checks also cover URL labels, missing Date entity facts, per-target host count aggregation across headings, competing note-type surfaces, unrelated field names without values, malformed URLs, and a 600-occurrence CRLF source split across bounded batches.

The fixture producer is not a new semantic compiler. It does not classify ontology roles, apply frontmatter precedence, infer relation direction, create reverse declarations or decide final graph meaning. The legacy compiler/evidence golden remains authoritative through C12/C13.

## C12 adoption path

C12 should migrate one source family at a time into the existing authoritative `GraphBuilder` path:

1. C12a: file/container/tag entities and hierarchy facts, with exact before/after graph/evidence equality;
2. C12b: resolved/unresolved host link summaries and frontmatter/inline ontology occurrences, retaining one classifier/resolver — accepted production adapters in full and incremental paths; C12b validation records main-agent/native evidence;
3. C12c: Date, body URL/origin, presentation-link reconciliation, graph-relevant metadata and discovery facts — accepted in full and cooperative incremental compilation.

At every slice, normalized records should be consumed incrementally/batch-wise rather than retained as a second whole-vault DTO array. Parser pools, persisted semantic shards, delta logs, incremental publication and secondary-index redesign remain assigned to C13–C17 as documented in `docs/INDEXING_ARCHITECTURE.md`.


## C12c completeness and retained host seams

Full and incremental compilation use `ObsidianMetadataSourceCollector` with metadata, relation and discovery-only families. Date registry/Daily Notes/Moment and source-relative presentation resolution live in `createObsidianMetadataSourceHost`. Body URL records retain declaring-note occurrences and optional origins; the compiler owns origin evidence and lifetime. The visual-target record carries `hostOccurrenceCount` obtained only for that source/target. A per-note compiler map retains visual/host counts until reconciliation and then dies; there is no duplicate whole-vault resolved-link map.

Inline semantic and visual values come from the established `inlineFields` map, while discovery comes from physical occurrence names. These surfaces can differ in accepted cached inputs; the collector must not silently substitute one for the other or invent positions for map-owned values. Aliases/tags remain string facts. Configured note-type/primary-tag values use plain scalar/array projections; unsupported object/nested entries carry `{unsupported: true}` without retaining their contents or host instances. The non-null marker preserves legacy frontmatter precedence: an unsupported frontmatter object blocks inline fallback and unwraps to no note type. Null/undefined still allow the existing nullish fallback. Other arbitrary property values never cross as semantic metadata.

| Retained compatibility seam | Exact current use | Retirement owner |
| --- | --- | --- |
| `GraphBuilder` `getFileCache` / `mergeFileMetadata` | Full and patch metadata acquisition and semantic fingerprints; values feed collectors | C13c portable compiler input/binding; C15 coordinates revisions |
| Vault read/cachedRead, field cache, `MetadataParser`, IndexedDB `getBodies` | Existing byte/read-bounded full and patch body acquisition; C13a parser grammar/runtime now portable | C16 cache/storage orchestration; acquisition policy remains host-side |
| `TFile`, live GraphPage file binding and host materialization | Existing compiler pages and legacy consumers; targets carry explicit facts | C13 portable compiler output plus adapter binding |
| `Platform`, renderer `window.setTimeout`, time-budget checks | Parser runtime bridge plus remaining graph cooperative scheduling | C13a injected parser runtime complete; C15 scheduler/remaining graph policy |
| Plugin `getIndexSourceRevision()` and build lifetime callback | Family/file fences before and after awaits | C15 coordinator; C14 publication contract |
| Fingerprints and incremental tag/URL cleanup | Work avoidance and current contribution lifetimes; discovery no-op uses field-only collector | C14 shared incremental compilation; C16 cached signatures |
| Lazy imagery, section expansion, relationship editing compatibility extractor | Existing non-compiler host resolution consumers | C18, C20b, C22 respectively |

C13a extraction status: body grammar, parser DTOs, field normalization and property-reference enumeration now live in `src/core/parser/metadata.ts`. The portable cooperative parser receives explicit clock/yield/lifetime capabilities and does not select a browser timer. `src/index/fieldParser.ts` remains the host compatibility facade for metadata merge, linkpath resolution and the historical renderer-thread cooperative signature. `GraphBuilder` retains `mergeFileMetadata` until C13c; `GraphIndex`/`main.ts`/`SectionExpansion` retain host link extraction until C18/C22/C20b respectively; `MetadataParser` and `SectionExpansion` retain the renderer runtime bridge. C13b owns evidence/resolver extraction and does not remove parser facade calls. Cache/body acquisition stays C16 and coordination stays C14/C15.

C12 completes source collection, not a new scheduler, an atomic whole-vault snapshot, a persisted contribution cache or host-free compilation. Collector count caps remain 256, not byte caps. Existing read budgets and source/file/revision fences remain; C14/C15 retain create/delete-during-build and publication validation.
