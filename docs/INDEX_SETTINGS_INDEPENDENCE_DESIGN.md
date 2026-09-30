# Settings-independent source indexing

**Implementation checkpoint (2026-09-30):** SI0–SI3 and SI4a are accepted. SI2 supplies neutral reference acquisition, one full/patch policy selector, settings-neutral reference fingerprints and complete value-frame finality; its protocol is documented in [NORMALIZED_SOURCE_CONTRACT.md](NORMALIZED_SOURCE_CONTRACT.md). SI3 persists those facts per source under the [source repository contract](SOURCE_REPOSITORY.md), with [independent acceptance evidence](validation/settings-independent-indexing-si3-2026-09-29.md). SI4a adds private cached-source replay and source-scoped semantic preparation, with [its contract](CACHED_SOURCE_REPLAY.md) and [validation](validation/settings-independent-indexing-si4a-2026-09-30.md). SI4b/c demand-driven publication/settings routing and SI5 lifecycle/performance work remain unimplemented; the design below is not a claim that settings-independent indexing has shipped.

**Private SI4 pair slice (2026-09-30; review only):** [The clean-host pair contract](SOURCE_CONTRIBUTOR_DISCOVERY.md)
now has a private implementation composing complete direct discovery and cached canonical semantics,
including authenticated empty/structural-only covers. It is scoped to a current complete journal-free
root, one policy and one demand lifetime. Required-Node source, real-browser and production-build
checks pass for the isolated private slice; the aggregate strict timing gate remains unresolved as
recorded in [the isolation review](validation/settings-independent-indexing-si4-isolation-2026-09-30.md).
SI4b1 is not accepted, changed-host BREF-1/topology remain UNKNOWN, and SI4b2 publication and SI4c
routing are not implemented. The rejected all-owner S2b implementation is excluded from this package.

**Private SI4 neighborhood relation slice (2026-09-30; reviewed, not SI4b1 acceptance):**
[The design-first coverage/finality invariant](SOURCE_CONTRIBUTOR_DISCOVERY.md) now has an uncalled
private reader. One final-policy center-incidence compile discovers every semantic parent; a second
combined center/parent lookup closes all parent-child sibling witnesses in the original contributor
order at the same current root/host. It certifies only both directions of center/parent relations,
not a visible scene or exact gate totals (`not-certified`). Existing bounds fail closed without
partial scopes or an all-owner fallback. No retained second graph, changed-host work, GraphIndex
publication or settings/consumer routing is added. Offline source tests pass 122/122, including 29
new cases. Main-agent Node 22.22.3 review passes 122/122 source cases, all 96 real Chromium cases
when run serially (including the 28 new browser subcases), architecture/core, lint and build. The
review fixed one missing browser-bundle entry; the aggregate `verify` still fails the unchanged
50 ms URL-heavy timer at 53.3 ms. See [the neighborhood review](validation/settings-independent-indexing-si4-neighborhood-review-2026-09-30.md).
SI4b1/SI4b2/SI4c and SI5 are not advanced.

**Private SI4 center-gate slice (2026-09-30; reviewed, not SI4b1 acceptance):**
[The center-gate proof](SOURCE_CENTER_GATE_PROOF.md) adds a separate private, finality-fenced result
for the requested center's four pre-top-N gate fills and visible-path counts. It requires exact
current physical facts and rejects missing/hot/colliding scopes. Sorted visible lists remain
uncertified because selected title inputs and complete candidate degrees are not available from
the center/parent relation cover. Main-agent source 151/151, serial real Chromium 111/111,
architecture/core/lint/build pass; full `verify` remains red on the unchanged URL-heavy timer.
There is no production caller, graph publication or settings route.

**SI4 selected-title proof (2026-09-30; reviewed missing-contract finding, no reader):**
[The exact-input inventory and counterexamples](SOURCE_SELECTED_TITLE_PROOF.md) identify two missing
premises: source-bound, bounded live MetadataCache property/absence observations, and authenticated
full-builder source order for synthetic URL label precedence. A complete contributor cover alone
can replay a different first meaningful label because catalog order is structural, not Markdown
inventory order. Characterization tests exercise the actual full builder, catalog writer, replay
and fresh GraphIndex; host-double metadata traces are not native event-order evidence. The smallest
proposed corrections stay in acquisition/host observation and the derivative catalog. No production
selector, title reader, schema, settings/UI/search route or prior certificate is changed. Main-agent
source 186/186, architecture/core/lint/build pass; full verify remains red on the unchanged timer.
Native MetadataCache event-order proof is pending because Obsidian was not running. See
[the review](validation/settings-independent-indexing-si4-selected-title-review-2026-09-30.md).
Sorted lists, candidate degrees, continuation and SI4b1/SI4b2/SI4c/SI5 remain open.

Design review and implementation brief for Sol, 2026-09-29.

**Original design baseline (historical; current implementation status is above).** Reviewed on `indexing-optimization-v2` at `8b2b49c440c16f1fd7f95b4c7e6c2d101bd94815`, initially clean. The maintainer requires ordinary ontology and presentation changes to preserve indexed source data. This document proposes the implementation and acceptance sequence; it does not resume C15–C26, claim a fix, or authorize a release.

Read with [AGENTS.md](../AGENTS.md), [CONTRIBUTING.md](../CONTRIBUTING.md), [the refactor ledger](../Refactor%20plan.md), [current indexing architecture](INDEXING_ARCHITECTURE.md), and [the mixed agent workflow](AGENT_WORKFLOW.md). Existing architecture documents describe the shipped implementation; the target below is deliberately different. `HANDOFF.md` carries the current transient implementation return. This brief is self-contained enough to prepare the next scoped Sol assignment when the maintainer selects it.

## 1. Decision

Make the durable index a record of **source facts independent of K-Plex settings**. Treat classified relationships and node appearance as derived results with separate invalidation rules.

- Moving a property from Friend to Challenger changes the interpretation of its existing occurrences. It must not invalidate their storage, read Markdown, invoke the body parser, or enter the cold-build path.
- Assigning a previously unconfigured property must use already collected reference candidates, including inline occurrences. Collection cannot be restricted to today's ontology.
- Changing inferred-link policy changes relationship interpretation. It may affect many relationships, but must operate on cached facts, with useful foreground results independent of completing whole-vault background work.
- Styling, labels, node visibility, lenses, sorting, layout, folds and camera changes affect presentation. They must not invalidate source facts or relationship compilation.
- Interrupting acquisition preserves every activated source record. Saving that progress must not require serializing the growing graph.

There is unavoidable work when a setting genuinely changes every relationship. The requirement is to avoid source reacquisition and blocking whole-vault reconstruction, not to pretend an O(E) semantic change is O(1). A renamed progress label around the existing multi-minute loop does not satisfy this design.

## 2. What the evidence actually establishes

### The report contains several runs

All times below are UTC on September 29. The exported report was generated at 16:12:21.835.

| Time | Recorded event | Supported conclusion |
| --- | --- | --- |
| 11:10:54.060 | Complete generation creation time | There is metadata for an older complete generation; metadata alone does not establish intact chunks. |
| 15:32:16.159 | `semantic-settings-changed` | Neither saved candidate passed the current serialized settings-signature check in that run. The code reports this before streaming graph pages. |
| 15:32 onward | `cold-progressive`, then checkpoints at 1,873, 3,873 and 5,497 | A new progressive graph pass followed that rejection and saved partial progress. This does not prove every Markdown body was reread or reparsed. |
| 16:00:09.086 | `checkpoint-selected` | A later startup selected the saved partial graph. |
| 16:00:18.637 | `checkpoint-restored`, one modified file | That startup successfully hydrated the checkpoint. The report explicitly says hydration completed with 107,542 pages and 259,220 declarations. |
| 16:00:19.496 | `cold-progressive:startup:stale-snapshot` | The coordinator continued progressive ingestion from its restored partial state. This label alone cannot distinguish a reset from a resume. |
| 16:12:19.535 | `checkpoint-saved`, 7,997 completed files | Saved progress advanced; current publication is 8,040 of 11,809 files. |

The earlier answer's description of the **current report** as zero-page failed hydration with no checkpoint is incorrect. The earlier settings rejection is real; the latest hydration shown here succeeded. Likewise, the historical `active-pages-missing-chunk` is a separate observed stream failure whose underlying cause is not established by this report.

### A concrete upgrade-related trigger exists

Commit `98a93e0787f7fd1e2bd6fdcd162bdda3de5ae20a` was committed at **15:22:18 UTC**, approximately ten minutes before the rejection. Its `IndexSnapshot.ts` diff removes `excalibrainFilepath` from `computeIndexSettingsSignature()`.

The signature is a `JSON.stringify()` result compared as an exact string. An older signature containing that property differs from a new one omitting it, even if the user changed nothing. This is a concrete candidate for the observed rejection. Confirmation requires the saved signature and the installed build identities; neither is present in the report. Commit time is not deployment proof, and an undefined old value could already have been omitted by JSON serialization.

The old exclusion also affected behavior, so removing its signature member cannot simply be declared universally harmless. Migration must account for any formerly excluded file using current metadata/facts. The architectural failure is treating a format/code change or a small semantic delta as invalidation of all collected work.

### Current code paths

| Source | Finding |
| --- | --- |
| `src/index/IndexSnapshot.ts`, `computeIndexSettingsSignature()` | The signature includes hierarchy, both inference switches, full tag names, note-type and primary-tag field selectors, tag-style list, and label length. Several are presentation inputs. |
| `src/index/GraphIndex.ts`, `restoreIndexedDbSnapshot()` | A mismatch rejects both saved candidates before page hydration. Candidate selection filters on the same signature. Legacy restore paths have related checks. |
| `src/settings.ts`, `REINDEX_SETTING_KEYS` | Ontology, inference, tag naming and style-property selectors can schedule reconstruction during the session. This list differs from the snapshot signature. |
| `src/settings.ts`, `openLegacyTagStyleEditor()` | Rename/add/delete changes `tagStyleList`, then calls `saveSettings(false)`. This can create delayed rejection on the next restart. Editing an existing style's color alone need not change that list. |
| `src/main.ts`, `saveSettings()` / `performRebuild()` | A boolean selects notification or a `settings` rebuild reason. That reason is structural for routing purposes and cannot use the ordinary per-file patch branch. |
| `src/adapters/obsidian/ontologySourceCollector.ts` | The collector selects configured fields before emitting occurrences. Dormant property references are absent from normalized compilation input. |
| `src/adapters/obsidian/metadataSourceCollector.ts` | Note-type, primary-tag and image-link inputs are selected using current settings. Date targets depend on host property types and Daily Notes configuration. |
| `src/core/graph/compiler.ts` | Role assignment, inference, presentation-link suppression, tag naming, label length and style-tag selection are mixed into compilation. The core is portable, but its result is still settings-dependent. |
| `src/index/GraphBuilder.ts` | Per-file semantic fingerprints also depend on configured fields. A parsed-body cache hit avoids a body read, but still feeds metadata merge, collection, binding, compilation and publication. |
| `src/index/IndexedDbCache.ts` | DB version is 4; graph schema is 3; body parser-cache version is 2. Bodies are keyed by path with mtime/parser validation, without stored size. Graph snapshots and checkpoints serialize interpreted pages/evidence. |

The body cache already preserves all parsed inline fields and URLs independently of ontology. It is valuable and must be reused. It is not a complete source index: host links/counts, property references, resolution dependencies and host Date inputs are not all durably represented before settings selection.

### Was this caused by iOS work?

The signature and IndexedDB snapshot files first appear in commit `0116a61b950249a38c245681242be1d750b5f4cf`, September 22, titled “improved section breakout. ipad indexing no longer crashes.” The accompanying contracts require compact evidence, stored resolved neighbors, bounded reads, durable body reuse, and no iOS worker cloning or simultaneous old/new full graphs.

That supports a historical connection: persisting the already compiled graph was part of the iPad stabilization work. It does not establish the author's private reasoning. Saving a ready graph is a reasonable acceleration; making it the only complete reusable index is the problematic boundary. iOS memory limits favor compact source records and bounded derivation, and do not require settings-dependent source validity.

The later refactor preserved this behavior intentionally. C08 retained existing settings contracts, C11/C12 deferred persistence and collected only configured semantic inputs, and C16 postponed evaluating normalized shards until after byte-preserving extraction. C18 separated presentation ownership later still. This maintained compatibility but failed to make everyday configuration changes an early acceptance requirement. Passing equal-settings graph-oracle tests could not reveal that omission.

## 3. Required contracts and terminology

Use these distinctions in code, tests and status reporting:

| Layer | Contents | Validity |
| --- | --- | --- |
| Source acquisition | Files, structure, tags, host-link observations, property reference candidates, parsed inline occurrences and body URLs | Source revision, extractor/parser format, host-observation completeness; **never K-Plex ontology or style settings** |
| Host resolution | Exact target bindings, unresolved results, Date target normalization | Source facts plus current host resolution/property-type/Daily Notes revisions |
| Semantic interpretation | Active ontology declarations, inferred roles, precedence, resolved pairs and active synthetic-node lifetimes | Source/resolution revisions plus a narrowly defined semantic-policy revision |
| Presentation | Titles, note-type/style facets, tag prefixes, label truncation, imagery, visibility, lenses, sorting and layout | Relevant metadata/presentation/view revisions |

All persisted layers remain derived caches. The vault and host metadata remain the source of truth. “Source complete” means acquisition covered the validated inventory, not that every possible graph interpretation has been precomputed.

Separate `sourceRevision`, `resolutionRevision`, `semanticPolicyRevision`, `presentationRevision`, and durable commit sequence. A single global `indexDirty` boolean must not represent all five. Preserve source-specific fences as well as plugin lifetime and demand cancellation.

**Non-negotiable tests:** settings changes cannot call `Vault.read`, `cachedRead`, body parsing, source-cache deletion, source-completion reset, or the cold/full source builder when source records are valid. A changed file or genuinely missing/corrupt record may require acquisition for that source; record that independent cause explicitly.

## 4. Settings effects

Replace `saveSettings(reindex: boolean)` as the policy boundary with one canonical typed settings-diff classifier. Existing callers may retain a temporary forwarding signature, but the boolean must not control source validity. Compare the new settings against an immutable last-applied narrow projection, because existing UI handlers mutate settings in place.

Use the same classifier for native settings controls, ontology/style managers, bulk import, commands, relationship-creation helpers, and settings loaded at startup. Audit any live external-settings reload path rather than assuming Obsidian invokes one. A restart must compare explicit versioned projections, not an arbitrary serialization of the complete settings object.

| Change | Required work | Forbidden work |
| --- | --- | --- |
| Colors, fonts, sizes, prefixes, connector styles, `tagStyleList` order/content | Refresh style facets for requested nodes; invalidate presentation caches | Source acquisition, semantic recompilation, graph snapshot rejection |
| `showFullTagName`, label length | Recompute labels; refresh affected search terms where labels participate | Source acquisition or relationship work |
| `noteTypeField`, `primaryTagField` | Refresh requested property/style facets from cached frontmatter/inline values; preserve frontmatter precedence | Treat these selectors as graph semantics |
| Alias/name fields or title expression | Presentation/search revision; scheduled search-term refresh where needed | Relationship recompilation or body scan |
| Visibility, lenses, sort, layout/orientation, node limits, folds/camera | Re-project the current Plex | Any semantic/source invalidation |
| Move an existing ontology field to another role | Invalidate/reinterpret pairs contributed by that field; include competing declarations in both directions | Per-note read/parse or whole-vault collection |
| Assign/remove/hide an ontology field | Activate/deactivate its cached reference candidates; update affected pairs, synthetic-node membership and search | Losing dormant occurrences or synthesizing references the grammar never recognized |
| `inferAllLinksAsFriends`, `inverseInfer` | Invalidate inferred pair interpretation; derive requested neighborhoods under the new policy, finish other caches only as needed | Recollecting all notes or requiring a complete global pass before use |
| `thumbnailProperty`, `nodeImageProperty` | Refresh visual presentation **and** affected image-only-link suppression from retained field references/counts | Silently treating these as purely visual, or reacquiring unchanged sources |
| Property type registry / Daily Notes format, folder or enablement | Refresh Date normalization from affected cached metadata; invalidate affected semantic pairs | Invalidating body parses |
| Parser/extractor behavior change | Explicit format migration, or reacquire only unsupported source families/records | Diagnosing this as a user settings change |
| Explicit repair command | Validate facts and reacquire proven misses; a deliberate force-reread mode must be explicit | Having everyday controls call that mode |

The current image-field selectors are absent from the snapshot signature and reindex-key list despite influencing suppression. Correct both over-invalidation and under-invalidation. Preserve the rule that an image field alone does not create a generic inferred child, while a separate prose or ontology occurrence does.

Do not blindly sort all settings arrays for hashing. Tag-style order is meaningful; duplicate or normalized-equivalent ontology assignments and role-group ordering have characterized behavior. Canonicalize object-key encoding and defaults, preserve meaningful ordering/multiplicity, and change normalization only with parity tests. `hierarchy.exclusions` and legacy `friends` need a caller audit: distinguish source-independent field discovery configuration from compiled roles and apply the existing migration rules.

## 5. Source facts: retain what later settings need

### 5.1 Evolve the existing contract

Do not persist today's `NormalizedSourceRecord` stream unchanged and call it settings-independent. Its producers have already selected configured ontology/style/image fields. Extend `src/core/graph/source.ts` with a source-fact vocabulary and a canonical selection step feeding the existing compiler. Keep one parser, one field normalizer, one relationship classifier and one precedence resolver.

For each physical source retain:

- Exact opaque identity and separate physical/semantic paths, kind, file revision and completeness markers.
- Structural ownership and raw tag membership; aliases where already used for search.
- Host resolved/unresolved link summaries with exact occurrence counts. Retain aggregate observations as aggregates; do not invent occurrence locations.
- **Reference candidates from every frontmatter and inline field**, not just current ontology. Include field spelling, normalized key, source surface, exact literal target/subpath, occurrence identity, and genuine location when available.
- Body URLs with existing label/line/origin semantics.
- Name-only field discovery, including fields with no references.
- Dependency information needed for source-relative resolution and Date normalization.

Enumerate property references using the existing `iterateLinkReferencesFromValue()` grammar. It recursively visits lists/objects but emits recognized wiki/Markdown/URL references; it does not turn every plain string into a note link. Preserve current deduplication within a value/target and multiplicity between physical occurrences. Apply configured-assignment multiplicity during interpretation, not extraction.

Dormant candidates must not create visible/searchable ghosts, URL nodes, ontology evidence or active tag/URL ownership. They become contributions only when the policy selects them, or when a separate existing source family independently makes the same target semantic. This must hold before and after reload.

### 5.2 Keep arbitrary properties lazy

This is a compact reference index, not a frontmatter database for lenses. Do not copy complete frontmatter objects into graph pages, snapshots or generic property-value stores.

- Persist reference-bearing candidate facts and their required provenance. Store a shared value/provenance payload once per original value occurrence, referenced by its candidates; never repeat a large field value for every target.
- Preserve the existing raw-value explanation contract for reference-bearing occurrences. A nested value containing links may require its original serialized value for parity; deduplicate/chunk that specific payload rather than dropping unrelated parts silently. Measure this cost explicitly.
- Property names may be indexed without their values. Arbitrary lens values still come from the lazy field provider.
- Frontmatter note-type/name/style selections use current Obsidian cached metadata. Inline style values reuse the existing settings-neutral parsed-body cache, loaded asynchronously into a bounded presentation cache before rendering.
- Persist no decoded images or resource URLs. A transient section outline stays outside the source index.

The activated source manifest must cover the parsed inline-value payload needed for later selectors, not just currently link-bearing fields. Reuse that existing parser output once, through immutable revision-scoped body chunks or a versioned body reference protected from eviction while referenced. Today's mutable path-keyed body record is not such an immutable reference. Migration can read it, but a new source head must not claim complete coverage while depending on an uncommitted body write. This retains the existing parser-cache scope; it does not introduce a frontmatter mirror. Loss of a required payload is a specific missing source family, never proof of a valid complete source.

The narrow addition to the old “no arbitrary property persistence” rule is **reference candidates in unassigned fields and their necessary provenance**, not a general permission to store all properties. Document that scope in the implemented source contract.

### 5.3 Resolution is independently refreshable

Store lexical candidates separately from their current resolved targets. An unchanged source file may acquire a different target when another note is created, moved, renamed or deleted, aliases change, or host resolution settles.

Maintain reverse dependencies for exact resolved targets and source-relative unresolved/literal references. Let the Obsidian adapter resolve destinations; core must never implement basename or path guessing. If a host change has a proven narrow impact, refresh that dependency set. When affected sources cannot safely be determined, re-resolve cached reference candidates cooperatively; that is allowed to be O(references), but performs no Markdown reads or parses and does not discard acquisition progress.

Host aggregate link maps do not preserve every lexical spelling. Refresh affected source summaries from current MetadataCache rather than pretending they are sufficient lexical facts. Cache absence during startup is `pending`, not a complete empty source. Preserve the startup event fence and metadata stabilization.

Date eligibility depends on Obsidian's property registry, not just ISO-looking text. Maintain field-to-source membership for all discovered names. A property-type change can revisit that field in those sources' cached metadata; Daily Notes changes revisit known Date sources. Keep that host-owned normalization separately versioned and outside body-cache validity. Do not invent a new Obsidian event: verify supported APIs; where no reliable notification exists, compare the narrow host configuration at startup/demand boundaries and on relevant metadata activity.

## 6. Persistence and crash recovery

### 6.1 Per-source activation replaces full-graph progress saves

Proposed IndexedDB upgrade: version **5**, subject to rechecking the implementation base. Keep the vault-local database and main-plugin ownership. Add focused stores alongside the current stores:

| Store | Logical contents |
| --- | --- |
| `sourceHeads` | Current activated source revision, format versions, completeness, chunk manifest and durable sequence; deletion tombstones where needed |
| `sourceChunks` | Immutable revision-scoped fact/provenance/body-input chunks, indexed by source and revision; shared payloads are stored once |
| `sourcePostings` | Revision-scoped field membership, target/literal dependency and source-family lookup entries; indexes serving actual invalidation/query consumers |

Names are proposed implementation names, not additional public APIs. Structural/container facts may use explicit non-document source owners. Distinguish an empty successfully acquired source from a missing/incomplete record.

For each bounded batch:

1. Capture source identity/path/mtime/size and the relevant host observation revision; acquire/parse only on a miss.
2. Prepare immutable neutral facts and any current-policy semantic patch privately, with cancellation and source fences.
3. Write chunks and postings in bounded staging transactions under a new source revision. They are invisible unless `sourceHeads` selects that revision.
4. Activate the head, manifest/completeness and monotonically increasing durable sequence in one short transaction after all chunks are written. Serialize replacement operations per source and compare the expected previous head to reject obsolete writers.
5. After awaits, revalidate the actual current Vault identity and source revision. Use C14b's synchronous publication boundary for accepted live facts, graph/evidence or cache invalidation, fingerprints, search and notifications.

IndexedDB and an in-memory graph cannot share a transaction. If disk activation succeeds but the source changes before live publication, the disk record describes an older revision; reject live publication, retain the dirty source, and revalidate the head at next startup. Never claim the source is current merely because its write succeeded. Conversely, on storage failure, a validated in-memory commit may proceed with explicit unsaved status and retry; failure must not erase its facts or trigger a source rebuild.

Posting queries filter against activated heads, including during an in-flight replacement; old/new candidate postings cannot both count as active. All chunks declared in an activated manifest must validate. Missing or malformed chunks invalidate that source/family, not unrelated source heads. Cleanup never deletes a head-referenced, reader-pinned or in-flight revision and does no deletion when catalog reads are uncertain.

No single whole-vault completion manifest is rewritten on every source. Startup compares the captured inventory against source heads and schedules missing/stale/incomplete records. Durable progress is the set of activated valid heads. Interruptions lose at most the unactivated batch, irrespective of current ontology.

Use both record and byte budgets. Retain the 256-record stream limit, existing platform read-byte/concurrency limits, and cooperative slice scheduling. Start with a 256 KiB encoded chunk target and bounded multi-chunk write batches; measure and tune in the device lane. Oversized single values use chunked provenance payloads with an explicit maximum simultaneous decode budget; a count limit is not a memory bound. Do not add an unbounded write queue when storage falls behind: apply backpressure.

Flush a pending bounded batch on its size/byte cap or short elapsed-work deadline (initial target: one second of active acquisition), and before reporting a successful durable stop. Unload cannot be assumed to await an asynchronous final flush. Physical interruption tests establish the actual retained-progress bound. A slow write should pause that bounded producer without forcing a full-graph serialization.

### 6.2 Retain graph snapshots as optional acceleration

Keep complete resolved snapshots initially for warm startup performance. Use an explicitly new derived snapshot schema (proposed schema 4, distinct from DB version 5), with separate source-coverage/commit information, semantic compiler version and semantic-policy descriptor. Presentation values are disposable; refresh them under current presentation settings. Retain explicit old-format decoders rather than silently changing the meaning of schema 3.

A policy mismatch rejects only that **derived interpretation**, never the neutral source repository. A missing graph chunk likewise falls back to source facts. Do not label either condition `source-index-invalid`.

A snapshot records the exact durable source watermark/coverage from which it was produced. Replay source heads changed since that watermark, including deletions. A coherent snapshot must not claim source writes or live commits that it did not include. Keep the existing generation activation protocol while that snapshot format is used.

Defer/coalesce resolved snapshots, cancel maintenance with demand loss, and bound any compaction by bytes and time. They must no longer be the only durable checkpoint for acquisition, and their serialization must not stop source ingestion for tens of seconds. Pin a coherent revision, or abandon/retry a cheap derived save; do not hold mutable live maps across awaits. Avoid introducing a second permanent graph journal alongside the source heads unless measurement demonstrates a necessary consumer.

### 6.3 Storage unavailable

Use the same fact/interpretation boundary with an in-memory bounded repository and report that persistence is unavailable. Preserve source records for the live session as far as memory policy permits. A later process restart may then require acquisition; that is a storage limitation, not settings invalidation. Retry storage with bounded backoff, never loop through full graph rebuilds because a write failed.

## 7. Derived relationships and foreground responsiveness

### 7.1 One semantic implementation, multiple scopes

Refactor the existing compiler's fact-to-declaration selection into a shared portable owner callable by full compilation, per-source edits and scoped reinterpretation. Feed its declarations into the existing evidence precedence and pair resolver. Do not add a second classifier or implement configuration policy in React.

Maintain lookup access by source, normalized field and candidate target/pair. Keep physical occurrence ownership independent from ontology assignments, and include all competing declarations from both endpoints when resolving an affected pair. Field changes can affect incoming edges on a note whose own source did not change.

Pair access must be truly pair-scoped: do not load and replay an entire dense source once for each incident pair. Index occurrences by pair/target within their source revision and batch shared payload reads. Structural/tag/URL-origin support comes from the existing family ownership rules; it is not inferred from only the two endpoint documents. Verify scoped interpretation against full compilation before routing any production reader to it.

Keep settings-neutral facts once. Resolved relationships and classified evidence are replaceable caches indexed by their actual dependencies. Existing warm graph snapshots can seed these caches. Cache entries contain the policy/dependency versions under which they were produced; a stale entry is never returned as current.

Field-role changes invalidate only pairs reached from the changed field's postings. Policy changes to inference invalidate inferred-pair interpretation globally without eagerly rebuilding every source contribution. Structural file/tag relationships and unaffected explicit-only results remain reusable when their dependencies prove that they are unchanged.

### 7.2 Bounded preparation before synchronous reads

The target includes demand-driven semantic preparation, not only a faster full replay. On a settings change:

1. Publish the new policy revision and affected-cache invalidation synchronously. Do not reset source completion.
2. Prepare the center neighborhood, required gates, expanded nodes and sibling dependencies using cached facts. Read storage and yield before publication, never inside partially mutated live graph state or a React render.
3. Publish one coherent prepared view under one policy revision. All roles, counts, explanations and mutation eligibility for that view use that same revision.
4. Prepare newly requested neighborhoods on navigation. Other derived cache work is optional background work, gated by visible demand and replaceable by a newer policy.

While a requested view is being prepared, retain its last coherent scene with an explicit updating state. Do not combine old relationship maps with new inference flags. Relationship writes must wait for/revalidate the current policy and source revision; navigation and camera gestures remain available. If no compatible scene exists, use the existing loading/partial presentation instead of silently displaying old roles as current.

The preparation limit is based on work/time/bytes, not merely displayed node count. Exact gate totals may require all incident pairs of a high-degree node; siblings may require its parents' child sets. Slice that work, expose incomplete counts as pending, and do not apply `maxItemCount` early in a way that changes totals, filtering or top-N ordering. New navigation cancels obsolete preparation.

This requires an explicit caller migration: `GraphIndex` remains the query/publication facade, but consumers may not bypass cache validity through stale `GraphPage.neighbours`. Audit `main.ts`, `ui/layout.ts`, `ui/PlexGraph.tsx`, `ui/ContentPane.tsx`, `ui/PlexFilter.tsx`, relationship/explanation dialogs, predicate adapters and `index/SectionExpansion.ts`, distinguishing real semantic reads from types/labels. Route real reads through revision-aware capabilities. Keep synchronous APIs only for already prepared data, with an explicit readiness result at the outer caller. Do not hide IndexedDB Promises in synchronous methods.

Retain stable canonical node identity for source patches and the C14b one-shot publication contract. No old and new complete graph may coexist solely to apply settings. Bounded prepared neighborhoods, shared neutral facts and evictable derived entries avoid that memory pattern. Retire obsolete cache layers so policy toggling cannot retain every previous interpretation.

This is the only narrowly scoped read-boundary work advanced from later checkpoints. It is not authorization to replace the full Plex layout engine, redesign all UI or finish C19/C20.

### 7.3 Synthetic nodes, search and presentation

Activating/removing fields can add/remove virtual/URL contributions. Track support by active source family and assignment, preserve independent referrers, and remove a synthetic node only when its remaining support and existing active-center/placeholder rules allow it. File/tag structure is maintained independently of visibility.

Search candidates derive from current materialized entities and active reference families/selected-field postings, not from every dormant candidate or every stale `GraphPage`. Reconcile affected target membership when assignments change. A global field activation may touch many candidates; perform that cache update cooperatively and report search preparation honestly. It requires no note parsing or complete relationship classification.

Move `showFullTagName`, note-type/primary-style selection and label length out of `GraphCompilerSettings` and semantic snapshot truth. Resolve these through a presentation provider using tags and requested cached properties. Preserve exact frontmatter-versus-inline precedence, style-list order, explicit style overrides and alternate alias/path search terms. `GraphNodeView` can expose prepared presentation facets for compatibility, but their ownership/revision must be clear.

Scene, predicate and search caches must include the revisions they actually depend on. Changing style colors must not clear relationship caches. A source edit that changes dormant candidates updates the source repository and field postings even when current semantics are a no-op; it must become visible when that field is assigned later. Current semantic fingerprints cannot suppress that source update.

## 8. Startup, settings races and reconciliation

Startup order:

1. Install the existing startup event fence and capture one current Vault inventory after the established metadata-ready boundary.
2. Open storage with existing timeout/backoff/lifetime guarantees; inspect neutral source coverage separately from optional graph snapshots.
3. Reconcile source heads by identity/path/mtime/size and required metadata observations. Refresh host resolution/configuration dependencies independently. Process changed/missing source records only.
4. If a compatible graph snapshot exists, hydrate it with the existing watchdog and late-callback fencing, then apply source deltas. Otherwise prepare the initial Plex from cached facts. Neither route requires cold acquisition merely because settings differ.
5. Acquire genuinely missing records progressively, prioritizing the active center and its needed neighborhood. Keep valid source records and their durable progress when settings change during this pass.

Per-file stamps are fast change detectors, not a proof against an external edit preserving identical mtime and size. Preserve source/metadata events; retain a content digest when actual bytes are acquired. Do not promise detection of all offline equal-stamp edits without reading bytes. An explicit validation/repair path handles suspicion; do not impose a whole-vault hash pass on every startup.

An S1→S2 settings change during hydration/compilation cancels or invalidates only S1 derived work. It does not cancel successful settings-neutral acquisition. Every awaited derived result checks source dependency revisions, desired policy revision, lifetime and demand before publication. A quick S1→S2→S3 sequence applies S3 without restarting a note pass three times.

Source edits during reinterpretation are handled by source-local latest-wins work. Keep the existing dirty backlog/event fence; retry affected units rather than restarting a global pass for an unrelated event. Rename/delete must invalidate exact bindings and cannot resurrect old materialized files. Folder/attachment changes may require structural and reference re-resolution from metadata/cached facts, not blanket body reacquisition.

Keep the documented once-per-session startup exception and demand cancellation, including physical iOS close/reopen behavior. When the last view closes, stop speculative interpretation, new acquisition and optional graph persistence according to existing ownership rules. Already activated source heads remain reusable. A pending settings policy is applied at the next demand boundary.

## 9. Upgrade and compatibility

Do not erase existing body caches or force all users through a new cold pass merely to install this fix.

1. Upgrade stores/indexes transactionally. Preserve settings, imported ontology/styles, history, pins, lenses and command IDs. All index stores are derived data, but migration must preserve reusable work.
2. Accept compatible old graph snapshots as temporary acceleration after explicit semantic/presentation compatibility evaluation. Decode their signature fields with a known format adapter; do not compare old/new JSON strings or overwrite signatures to make them match.
3. Build neutral source records incrementally from valid legacy body records plus current in-memory MetadataCache/Vault facts. Collect all property references with the existing grammar. This can require one bounded pass over cached metadata, but should require zero body reads when valid legacy body records cover the vault.
4. Legacy body records do not contain size. Record that weaker provenance; do not fabricate a historical size. Reuse under the existing legacy mtime/parser contract, fence against the current file revision, and label the migration's confidence. A stale/missing/unsupported body record is reacquired for that source only. A complete legacy graph alone cannot reconstruct missing dormant candidates.
5. Keep source completeness explicit while migration runs. A request involving unmigrated fields performs targeted record conversion first; it cannot silently assume there were no references. No repeated all-vault migration on settings changes.
6. Strip presentation fields from the new derived-cache validity contract only after the presentation provider replaces their old compiled values. For the removed `excalibrainFilepath` exclusion, reconcile the formerly excluded physical entity/references if necessary; preserve user content.
7. Activate the new format only when its named checkpoint passes migration tests. Retain old caches for a bounded rollback window or remove them through an explicit derived-cache cleanup policy; never delete the database containing new source heads as routine upgrade cleanup.

IndexedDB version upgrades also affect rollback: the old binary opens version 4 explicitly and may receive `VersionError` against a version-5 database. Its graceful storage-unavailable path must be tested; keeping old stores alone does not make an old binary fully cache-compatible. User data must remain intact, but a downgraded binary may lose persistence until upgraded again. If supported warm-cache rollback is required, provide a compatibility release capable of opening the upgraded database; do not implement a destructive database downgrade.

A graph-cache encoder/decoder or compiler-version change may invalidate that acceleration layer. It must not invalidate source records whose own format remains supported. Keep format versions distinct from plugin marketing version and from user settings.

## 10. Diagnostics and user-visible state

Retain bounded local diagnostics, but record decisions at the correct layer:

- `source-cache-hit`, `source-cache-miss`, `source-record-corrupt`, `source-format-upgrade`, `source-revision-changed`.
- `host-resolution-changed`, `date-configuration-changed`.
- `semantic-policy-changed`, `derived-cache-incompatible`, `derived-view-prepared`.
- `presentation-settings-changed`, `source-batch-saved`, `storage-unavailable`.

Report static changed setting keys (for example `hierarchy.leftFriends`, `inverseInfer`, `tagStyleList`), old/new format/compiler versions, work scope/counts, cache hit/miss counts, **actual body reads and parser calls**, acquired/dirty/durable source counts, source-batch write time and derived-preparation time. Distinguish sources resumed from sources acquired in the current run. Add a build identifier so unchanged `0.0.5` cannot conceal incompatible development bundles.

Do not export property names, settings values, filenames, raw signatures, field-value hashes or vault content. Built-in keys can be allowlisted; custom ontology names are values and remain private. For the legacy string signature, compare recognized top-level fields locally and export only the allowlisted difference keys. Unknown legacy fields produce `signature-format-changed/unknown`, not a fabricated user-change diagnosis.

User status distinguishes **Indexing notes**, **Updating relationships**, and **Saving progress**, with localized copy. Source progress must not fall to zero when settings change. Background derived-cache incompleteness is not “notes unindexed.” An updating view must not claim current relationship correctness until its requested dependency set is ready; saving status is not a semantic-completeness signal.

## 11. Implementation checkpoints for Sol

Do not implement this as one unreviewable rewrite. Each row is a separate buildable assignment with strict tests and a returned diff. Main-agent exact-build acceptance remains separate from Sol's portable evidence.

| ID | Deliverable / owners | Exit condition |
| --- | --- | --- |
| SI0 | Characterization and diagnostics: snapshot/settings/coordinator tests; read-consumer inventory; no policy bypass | Reproduce style-change restart rejection, old/new signature-format rejection, dormant-field omission, image-policy invalidation and cached-body rebuild cost. Capture current equal-settings oracle and counters. |
| SI1 | Presentation ownership and central settings effects: `settings.ts`, `main.ts`, graph settings/compiler, GraphIndex/style/search adapters | Style/name/label/type-selector changes work immediately and after restart with zero source/semantic build calls. Explicit legacy-cache adaptation refreshes old presentation facets. No unsafe removal of ontology validity checks yet. |
| SI2 | Neutral source facts and shared selection: `core/graph/source.ts`, parser consumers, source collectors, compiler/patch | Existing full/patch results equal the accepted oracle; unassigned candidates survive, stay inactive, and activate from the same facts under a different policy. Production collection is neutral; shadow comparisons stay test-only. |
| SI3 — Accepted | Per-source storage, migration and recovery: `IndexedDbCache`, codecs, GraphBuilder/GraphIndex acquisition; [implementation contract](SOURCE_REPOSITORY.md) | Crash injection proves atomic heads, bounded durable progress, one-source repair, legacy body reuse and settings-independent source validity. Real IndexedDB tests supplement mocks. Preserve current graph acceleration until its replacement path is proven. |
| SI4 | Settings reinterpretation and revision-aware reads: shared compiler/resolver, GraphIndex facade, settings dispatcher and inventoried consumers | Field/inference/image-policy changes use cached facts; foreground view, gates, search, explanations and edit eligibility agree on one revision. No raw-neighbor bypass, cold/full source build, mixed-policy publication or duplicated full graph. |
| SI5 | Restart/resume and performance acceptance; retire superseded graph-checkpoint dependency | Settings during acquisition, reload and sync preserve activated source progress. Missing derived cache restores from facts. Exact-build large-vault desktop/iOS/Android acceptance meets the work/latency/memory gates. Update implemented architecture/instructions. |

SI1 is a useful bounded correction but not the complete answer to the user's requirement. SI2/SI3 alone are infrastructure. Do not release the redesign as complete until SI4/SI5 meet the behavior contracts. Transitional states remain explicit and must not be described as settings-independent while they still call the old rebuild path.

Only advance the necessary portions of C15 coordination, C16 persistence and C18 presentation ownership. The broader C15–C26 structural refactor remains paused. Proposed source/schema changes are deliberate feature architecture, not a supposedly byte-preserving extraction. On each accepted checkpoint, update the implementation docs, applicable AGENTS/CONTRIBUTING rules and the refactor ledger; preserve historical evidence and distinguish proposals from implemented behavior.

**First Sol assignment:** combine SI0 and SI1 as one presentation-decoupling checkpoint. SI0's characterization and setting-impact inventory directly guard SI1, while SI1 remains reversible under the existing graph snapshot/body-cache formats. Do not add SI2: neutral reference collection crosses the source/collector/compiler boundary and needs its own oracle review before persistence. Use the standing `HANDOFF.md` for the exact assignment and require the offline return to overwrite it with online verification and commit instructions.

## 12. Acceptance matrix

### Behavioral and adversarial tests

All relevant source-fact replay/derived results must equal a clean compile under the **same final settings**, including declarations, multiplicity, active/overridden decisions, directions, active node set, gate totals, labels/styles and search. Preserve existing goldens unless the ownership change requires an explicitly documented presentation-field normalization; never normalize away semantic differences.

1. Assign an initially unconfigured frontmatter field and inline field, including a dense nested reference value; move Friend→Challenger, remove/re-add, toggle hidden and use duplicate/normalized-equivalent assignments. Repeat after closing/restarting. Assert zero body reads/parses for valid facts.
2. Change colors, tag-style names/order, full tag names, max label length, note-type/primary-tag selectors, aliases/name fields, visibility and lenses. Check immediate appearance/search plus restart, with no semantic event or source rebuild.
3. Toggle both inference settings with reciprocal ordinary links, explicit conflicts, hidden/previous/next, Dates and URLs. Confirm tree semantics and inverse perspectives retain accepted behavior. No per-note collector loop may hide beneath “Updating relationships.”
4. Change both image field selectors with image-only, prose-plus-image, ontology-plus-image and repeated-occurrence fixtures. Check exact suppression and provenance without body acquisition.
5. Edit dormant reference candidates while the current graph is a semantic no-op; later activate their field. Reload between those actions. The latest candidate must appear, proving semantic fingerprints do not block source updates.
6. Change settings during body parsing, source staging, head activation, graph hydration, derived preparation and view publication. Supersede S1→S2→S3, close/reopen the last view, unload and release late callbacks. No lost facts, stale publish or rebuild storm.
7. Create/rename/move/delete Markdown, attachments and folders; change an alias or Daily Notes configuration while declaring sources stay unchanged. Verify source-relative resolution, ghost transitions, incoming evidence and shared URL/tag lifetime against a fresh compile.
8. Crash at every source-write/activation boundary; corrupt one chunk, fail one pointer read, inject quota/open/transaction failure and delete the optional graph cache. Completed unrelated source heads remain reusable. Staged postings must not leak into active queries.
9. Upgrade real schema-3/DB-4 fixtures, including an old signature containing `excalibrainFilepath`, stale complete snapshot, usable partial checkpoint and partially populated body cache. Measure actual body misses and test old-binary storage-unavailable rollback without changing user data.
10. Two views/main-window/pop-out demand independent neighborhoods under one policy; hide one, navigate the other and change settings from a settings pop-out. Preserve node identity, cameras, folds, listeners and correct owning-window UI behavior.

### Work and performance gates

Use the existing verified 20k/large-file fixture and add a deterministic high-node-count fixture comparable to the report's approximately 108k nodes/259k declarations. File count alone does not model this workload. Add a high-degree center, many unassigned link-bearing properties and dense provenance values to expose memory/lookup costs.

Hard work bounds for settings-only runs with valid source coverage:

- Markdown body reads = 0; parser calls = 0; source records invalidated/reacquired = 0; cold/full source-build calls = 0.
- A field-role change visits field postings and affected relationship dependencies, not every note or every evidence declaration.
- Global inference changes invalidate policy-dependent caches and prepare requested relationship scopes; they do not serialize/rebuild the entire graph before the first correct view.
- Acquisition durability writes proportional to changed source facts, not to the growing complete graph. Graph-cache damage does not reset durable source count.
- All new long loops yield by elapsed-time budget and remain cancellable. No retained second full graph and no accumulation of old policy generations.

Initial foreground acceptance targets, measured on named reference hardware after source facts are ready: presentation updates within **100 ms desktop / 250 ms physical mobile**; a normal bounded Plex after ontology/inference change within **500 ms desktop / 1 s physical mobile**. These are proposed product gates, **not measured promises**. Record request-to-correct-render, longest main-thread task, navigation cancellation latency, total background work, retained memory and storage bytes separately. High-degree exact counts need their own measured bound and explicit pending UI; they are not covered by a normal-neighborhood promise.

Use at least three comparable foreground runs per condition and report median/tail observations with fixture, settings and build identity. Separate warm fact memory, cold fact hydration, first migration, genuinely cold acquisition and storage-degraded cases. Do not credit diagnostic timers, hidden-renderer delays or emulation as paint/device evidence. If normal configuration still takes minutes, the checkpoint fails; do not ship it as “cached reindexing.”

Required automated lanes: pinned Node per repository instructions; `npm run verify`, actual installed Obsidian typings/build, architecture/core guards, scanner review and real browser IndexedDB fault tests. Main agent runs exact-build `npm run verify:obsidian` in the explicitly configured disposable vault with scenarios beyond basic render smoke. Import-affecting changes also run `verify:obsidian:migration`.

Prioritized physical/manual gates after implementation:

- **P0 — physical iPad:** large-vault ontology/inference switches during active sync, followed by background/termination/reopen. Verify responsiveness, correct final relationships and retained source progress; observe WebView memory/termination behavior.
- **P1 — physical Android:** same interrupted acquisition/resume and settings-change sequence, including unavailable/failed storage where controllable. Verify source coverage and lifecycle behavior rather than desktop-emulated layout.
- **P2 — desktop main window plus pop-out:** interactive setting changes while navigating and editing a relationship; confirm correct current-policy gates/provenance, no stale write and unchanged camera/folds. Automate what the host driver can cover; request only the remaining manual observations.

## 13. Explicitly rejected shortcuts

- Remove the settings-signature check while retaining stale compiled roles/styles.
- Hash fewer settings but continue collecting only today's configured ontology.
- Persist only currently active evidence; it cannot recover a newly assigned field or a suppressed source.
- Rename a full per-note cached-body pass to “reclassification” without measuring its work.
- Save the full growing graph every N files as the only interruption checkpoint.
- Add a generic frontmatter mirror, an unbounded normalized-record array, or a second complete graph to make the redesign convenient.
- Publish mixed old/new policy maps across awaited work, or allow direct neighbor-map consumers to bypass validity.
- Use iOS worker pools, new parser grammar, a new layout engine or the unfinished C15–C26 refactor as prerequisites for this fix.

## 14. Review performed for this document

Read repository guidance, the refactor plan's contracts/checkpoints/history, current indexing/source/architecture notes, concrete collection/compiler/settings/persistence/coordinator paths and relevant Git history. Converted the supplied timestamps directly and compared the signature-removal commit with the reported sequence. No personal vault, running Obsidian instance, cache or installed plugin was accessed or modified.

This delivery changes documentation only. Runtime tests, builds, performance runs and physical-device validation were not run and are not claimed. Documentation link/content/whitespace checks are the applicable validation. No manual test is needed to accept the document itself; all implementation gates above remain future work.
