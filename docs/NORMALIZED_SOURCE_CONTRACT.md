# Normalized source contract (C11)

C11 defines the host-free input vocabulary that later checkpoints can feed into the existing K-Plex semantic compiler. It is deliberately **unused by production in C11**. `GraphBuilder`, `RelationEvidence`, `RelationResolver`, `GraphState`, `GraphIndex`, the event coordinator in `main.ts`, search, cache and snapshot algorithms are unchanged. C12 owns collection adoption and C13 owns compiler adoption.

The runtime contract is `src/core/graph/source.ts`. It carries source facts, not resolved relationship meaning. In particular it does **not** contain ontology roles, inference direction, `RelationType`, precedence decisions or inverse evidence. Those remain authoritative in the existing compiler/resolver until C13 moves that code intact.

## Current source-family inventory and future ownership

| Existing evidence/source family | Current collector / host fact | Facts currently consumed | C11 normalized mapping | Future owner |
| --- | --- | --- | --- | --- |
| `file-tree` | `GraphBuilder.addVaultTree()` walks `Vault.getRoot()` / `TFolder.children` and creates file/folder pages | Exact physical child path, file/folder kind/name, direct parent container | `entity` + `file-tree`; identity, semantic/physical path and kind are independent | C12a Obsidian structural collector; C13 compiler creates the same defined child evidence |
| `tag-tree` | `addTagTree()` uses `MetadataCache.getFileCache()` + `getAllTags()`; incremental metadata also uses parsed page tags and `ensureTagPath()` | Raw tag membership, hierarchical tag segments, declaring tag/member identity | `semantic-metadata(tag)` + `tag-tree` with `tag-child` or `entity-member` | C12a; it must inventory the overlapping rebuild/patch paths so one normalized membership is not accidentally emitted twice |
| `obsidian-link` | `MetadataCache.resolvedLinks[source][target]` | Exact host-resolved target path and aggregate occurrence count | `obsidian-link` with `occurrenceCount` and adapter-owned target identity | C12b. Resolution stays source-relative/host-owned; core never implements a basename resolver |
| `unresolved-link` | `MetadataCache.unresolvedLinks[source][target]`; `ensureVirtual()` materializes a semantic placeholder | Source path, unresolved target spelling/path and count; K-Plex index file is excluded as a source | `unresolved-link` pointing to an explicit `unresolved` entity | C12b |
| `frontmatter-ontology` | `mergeFileMetadata()` + configured hierarchy fields + `extractLinksFromValue()` | Original configured property name, normalized field name, raw property value, resolved target | `frontmatter-ontology`; no role is stored in the record | C12b; C13 applies current hierarchy role mapping and precedence |
| `inline-ontology` | `parseBodyMetadataCore()` emits `InlineFieldOccurrence`; `extractLinksFromValue()` resolves each target | Original field name, normalized field, raw value, line and character range, target | `inline-ontology` preserving those physical locations | C12b; C13 applies current role mapping/precedence |
| `body-url` | `parseBodyMetadataCore().urls` | Declaring Markdown source, literal URL, optional label, line | `body-url` with one shared URL target identity, separate source occurrence, physical provenance, and optional successfully parsed origin target | C12c; C13 creates current inferred link evidence |
| `url-origin` | `GraphBuilder` parses `new URL(bodyUrl).origin` and keeps one derived origin→URL declaration while at least one body referrer exists | Body URL target and parsed origin; source multiplicity is consulted for lifetime but not collapsed into one URL owner | **No independent source record.** `body-url.origin` is the normalized input; `url-origin` stays a compiler-derived relation | C13; C14 owns incremental derived-lifetime behavior |
| `date-property` | `MetadataTypeManager` identifies Date properties; host Moment + Daily Notes folder/format render the target | Original property name/value plus normalized Daily Notes target path and whether it is materialized | `date-property` with `resolvedBy: daily-notes`; original property provenance is retained | C12c. Date/Moment/property-registry behavior remains in the Obsidian adapter; C13 only sees the normalized target |
| presentation-only image reconciliation | `suppressPresentationOnlyImageLinks()` compares configured thumbnail/node-image link counts with `resolvedLinks` counts | Configured field name/surface, resolved target and count; decoded image bytes are not used | `presentation-link` occurrence beside the generic host-link summary | C12c; C13 keeps the existing “remove generic inferred link only when all occurrences are visual” rule |
| aliases / note type / style-tag inputs | `mergeFileMetadata()` plus configured note-type/primary-tag/tag-style fields | Alias values, tags, configured note type and primary-tag-field source values | `semantic-metadata`; preserve separate frontmatter/inline values and surfaces; only graph-relevant metadata is allowed | C12 by the family that already reads the source; arbitrary frontmatter remains outside semantic records |
| property discovery | `recordDiscoveredFields()` / cooperative variant inspect frontmatter keys and inline occurrences | Original/normalized field names and surface, including non-ontology fields, without arbitrary values | `field-name`; compiler retains existing rebuild-count / patch-discovery policy | C12b/C13 |

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

`SourceProvenance.definition` preserves the existing evidence/property definition label when the producer already exposes one; `fieldName` keeps the original property presentation while `normalizedFieldName` is only a lookup key, not a relationship role.

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
2. C12b: resolved/unresolved host link summaries and frontmatter/inline ontology occurrences, retaining one classifier/resolver;
3. C12c: Date, body URL/origin input and presentation-link exclusion facts, then remove the corresponding legacy collection reads.

At every slice, normalized records should be consumed incrementally/batch-wise rather than retained as a second whole-vault DTO array. Parser pools, persisted semantic shards, delta logs, incremental publication and secondary-index redesign remain assigned to C13–C17 as documented in `docs/INDEXING_ARCHITECTURE.md`.
