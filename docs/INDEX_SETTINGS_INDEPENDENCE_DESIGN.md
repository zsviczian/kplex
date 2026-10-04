# Settings-independent source indexing

## Revised SI5 scope — maintainer decision, 2026-10-04

The implementation was committed **before instrumentation** as `62c728393440aa3dfb57869ece83c4060092bcba`. Diagnostics/progress and the first warm correction are independently committed at `8cd10b7d6746d607f8214ad192670a0b9a370778`; subsequent corrections are separate checkpoints. No push/release. C15–C26 remain paused.

The active closeout is now **understand warm restart → make progress truthful → propose the smallest evidence-based warm-restart correction → close SI5**. The synthetic ~20,000-contributor hub `decode-budget` rejection is a known stress limit outside the critical path; bounded canonical projections, another indexing architecture and increased memory limits are explicitly deferred. Realistic requested notes have hundreds of links, with roughly a thousand an extreme case. The separately generated high-node stress profile is also outside this bounded investigation.

The maintainer accepts the existing extreme-vault cold behavior for SI5. No more cold-start optimization or three-run cold timing gate is required here. Timestamp clarification: the retained cold report observed 4,969 / 20,015 owners across 111 foreground samples before a **30-second individual CLI command timeout**; it does not establish that 4,969 completed within 30 seconds. Markdown reads/parses/repairs remained zero. This distinction does not change the maintainer's acceptance.

Warm restart remains the measured concern: 72.974 / 74.267 / 77.422 seconds with valid durable sources versus a separate settled explicit restore pilot at 6.018 seconds. Neither the total nor that subtraction establishes a cause. Instrument the actual production phases, owner walks and operations first; report exact results and a minimal proposed correction **before implementing an optimization**. Physical iPad/Android checks remain separate maintainer work after the warm investigation; prior desktop/device evidence is retained without making every historical synthetic gate a new prerequisite.

## Current status and delivery reset — 2026-10-01

**Objective:** maintain a durable, settings-neutral index with work proportional to changed notes or requested relationships. Adding/moving ontology must reuse that index, perform zero Markdown reads/parses for valid facts, and make the requested Plex usable without a full-vault rebuild.

**Actual baseline:** branch `indexing-optimization-v2`, accepted SI4 commit `323b260`. All ten original Delivery 1/2 exits are closed by the [SI4 report](validation/settings-independent-indexing-si4-acceptance-2026-10-03.md). SI5 implementation is active: source-backed startup/cache recovery, selective source repair and production graph-progress writer retirement are under online validation. SI5a is committed at `e50dd52`; SI5b is committed at `7bd14cf` as an interim checkpoint and source-first startup is approved; large warm functional convergence passes, with three comparable warm restart samples now passing (74.267 s median), while cold foreground preflight remains open. Its five delivery exits and required scale/device evidence remain open. No percentage or finish date is inferred from tests or commits.

This reset supersedes the execution sequence of SI4b1/C1/C2/S1/S2/S2b/C3 and the unsent foreground-composition handoff. Those names remain historical evidence, not additional gates. C15–C26 remain paused at the **Portable semantic engine / C14** scope boundary. The fixed remaining delivery sequence is in [section 11](#11-fixed-completion-plan): two production SI4 deliveries, then SI5. No runtime implementation is authorized by this documentation change alone.

### Why the work expanded, and what changes now

The original design combined three substantial requirements in SI4: avoid rereading notes, avoid blocking on a full cached-graph reconstruction, and preserve the existing consumers' semantics. The first has a straightforward foundation: neutral facts plus per-source persistence, delivered by SI2/SI3. The latter two require dependency lookup, bounded preparation and publication into the live app. They do not require a general proof framework for every possible Obsidian mutation.

Later work repeatedly exposed one missing input, built a separate private reader/proof, and postponed integration. In particular, it demanded exact reproduction of incidental host-map encounter order and complete local impact proofs for every host change. The original section 5.3 already permits a cooperative cached-reference refresh when host impact is uncertain. Making bounded inverse-host proofs a universal prerequisite was an added constraint. Accepting more private inputs did not resolve the production integration or ordinary-edit lifecycle. Main-agent task selection and the initial SI4 sizing caused this drift; passing tests does not justify continuing it.

### Expected everyday operation

For a Friend→Challenger change: look up the changed field's indexed occurrences; invalidate the affected derived relationships; reinterpret the requested neighborhood with the existing resolver; publish its coherent result. Keep source records and parsing progress. For inference changes, change the policy revision and prepare only demanded scopes. For a note edit, replace that source's facts and update its dependency memberships. This is the implementation to finish; the additional machinery must justify its place in these operations.

### Lean implementation decisions

1. **Keep one durable source repository and one semantic implementation.** Reuse SI2/SI3 acquisition, immutable source chunks, selected heads, tombstones, body reuse, postings, and the existing compiler/resolver. Settings never mutate source validity. Keep derived relationships disposable and bounded. Do not replace these foundations or add a second full graph.
2. **Use an ordinary settings-neutral dependency index.** Its job is to locate source owners for fields and incoming/outgoing targets, including structural/tag/URL support. Maintain it with source activation and source-local deltas. Existing contributor summaries, journal and checksums can be reused; no new Merkle format, general authenticated-tree framework or independent certificate family is a prerequisite. A raw `querySources()` candidate lookup alone still cannot prove completeness: missing acquisition, structural/generated support, pending writes and changed dependencies must be accounted for before reporting a complete result. A schema change needs a concrete missing production operation, not an abstract proof requirement.
3. **Compose one request with one readiness decision.** Use one captured policy and dependency generation to prepare the center, gates, siblings, titles and requested expansion; then publish synchronously through GraphIndex. Reuse useful private reader logic, but consolidate overlapping replay/finality work rather than invoking seven separately certified readers and retaining their graphs. Bound memory by records/bytes, yield cooperatively, cancel obsolete demand. Large scopes must continue in bounded batches and eventually finish; a permanent backpressure result is not completion.
4. **Make ordinary edits local; allow explicit host reconciliation.** An edit with known dependencies replaces that source's facts/index memberships and invalidates affected derived entries. Alias, rename, topology or host-configuration changes with uncertain fan-out may trigger one coalesced, cancellable pass over cached references/MetadataCache under section 5.3. Such a pass must not reread unchanged bodies, discard valid source heads or rebuild the complete interpreted graph. A settings-only event cannot trigger it. If ordinary edits routinely fall into a whole-vault pass, delivery 2 fails. Keep possibly affected scopes updating until reconciliation completes; unrelated scopes may stay ready only when their dependencies are known disjoint.
5. **Use the host's lifecycle, then test it.** Observe Vault/MetadataCache events before async work; record dirty sources and a monotonic host generation; capture requested cached fields with their file identity/revision and completion observation; check those observations after awaits and before publication. A file mtime alone is not metadata completion, and a missing cache is not an empty property. The main agent must test the relevant actual event sequences before enabling the route. If an event gap is observed, close it with a narrow demand-time validation or explicit pending/reconciliation path. Do not make implementation depend on proving an undocumented universal host guarantee.
6. **Proposed narrow compatibility adjustment: deterministic final ties.** Keep configured sort keys, directions, titles, raw-degree meaning, semantic roles, evidence and counts unchanged. When all existing user-visible sort keys are equal, use a stable exact entity-ID tie-break instead of JavaScript host-map insertion order. Apply it consistently in full and scoped paths. This can reorder equal-key neighbors/siblings and change which tied item falls at a top-N boundary; it is an explicit product-visible design proposal, not a claimed byte-preserving refactor. It does not authorize changing URL-label precedence, sibling witness meaning or evidence ownership. The maintainer reviews this proposal before runtime implementation; if declined, record the retained-order cost in the same delivery, not an unbounded new research sequence.
7. **Keep presentation separate.** Reuse SI1's provider and cache invalidation. Read selected title/alias/style properties once per requested node, with a presentation revision; do not persist a frontmatter mirror or make a cosmetic update rebuild relationships. Retain the existing URL-label behavior using already available source-order inputs. Any remaining metadata observation gap belongs to the native check in delivery 1, not another offline proof-only assignment.

The proposed tie rule removes the need to prove that Obsidian's global object enumeration remains identical merely to order otherwise equal results. Existing v4 data can remain readable during transition, but the private direct-order reader and owner-order format are not mandatory future production dependencies. Local checksums/frame validation and crash-safe activation remain required; this reset is not permission to ignore corruption or to treat an incomplete result as current.

### Disposition of work already delivered

| Existing work | Decision / completion owner |
| --- | --- |
| SI0/SI1 diagnostics and presentation separation | Keep; regression coverage in every delivery. |
| SI2 neutral facts / shared selector; SI3 storage / migration / recovery | Keep as the foundation. Extend only for a demonstrated production read or local update. |
| SI4a cached replay; private pair/neighborhood/gate/degree/URL inputs | Reuse algorithms and oracle tests in delivery 1's production request owner. Consolidate unused wrappers by delivery 2. Private readiness is not SI4 acceptance. |
| Owner summaries, journal, historical leases and delta helper | Reuse for delivery 2's actual source/index transaction and crash recovery. The helper alone does not implement local activation. |
| V4 host-order pages and direct-order reader | Retain compatibility while the tie proposal is reviewed. If adopted, stop requiring exact live host-order proofs and retire unused runtime paths in delivery 2; do not delete source/body data. |
| Rejected S2b all-owner observer and universal BREF-1 locality proof | Remain excluded. Use the section 5.3 fallback for genuine uncertain host changes. |
| One-shot caps, permanently pending hot scopes, uncalled proof APIs | Development limitations to close or remove in delivery 2; not acceptable shipping behavior. |
| Broader refactor C15–C26, new parser/layout/second-host work | Deferred outside SI0–SI5. |

Accepted evidence remains in the [SI3 review](validation/settings-independent-indexing-si3-2026-09-29.md), [SI4a review](validation/settings-independent-indexing-si4a-2026-09-30.md), and private [neighborhood](validation/settings-independent-indexing-si4-neighborhood-review-2026-09-30.md), [gate](validation/settings-independent-indexing-si4-center-gates-review-2026-09-30.md), [selected-title](validation/settings-independent-indexing-si4-selected-title-review-2026-09-30.md), [URL-title](validation/settings-independent-indexing-si4-url-title-review-2026-09-30.md), [degree](validation/settings-independent-indexing-si4-candidate-degrees-review-2026-09-30.md), and [direct-order](validation/settings-independent-indexing-si4-direct-order-input-review-2026-09-30.md) reports. These reports describe their exact historical slices, not the reset's unimplemented production behavior. Older proof documents remain implementation evidence; this delivery reset takes precedence over their future-work recommendations.

Original investigation and architecture brief, 2026-09-29. Sections 1–10 retain the original requirements, subject to the explicit decisions above; baseline code findings are historical.

**Original design baseline (historical; current implementation status is above).** Reviewed on `indexing-optimization-v2` at `8b2b49c440c16f1fd7f95b4c7e6c2d101bd94815`, initially clean. The maintainer requires ordinary ontology and presentation changes to preserve indexed source data. This document proposes the implementation and acceptance sequence; it does not resume C15–C26, claim a fix, or authorize a release.

Read with [AGENTS.md](../AGENTS.md), [CONTRIBUTING.md](../CONTRIBUTING.md), [the refactor ledger](../Refactor%20plan.md), [current indexing architecture](INDEXING_ARCHITECTURE.md), and [the mixed agent workflow](AGENT_WORKFLOW.md). Existing architecture documents describe the shipped implementation; the target below is deliberately different. `HANDOFF.md` carries the current assignment/return or an explicit inactive state. This brief is self-contained enough to prepare the next scoped Sol assignment when the maintainer selects it.

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

### Original code paths at the September 29 design baseline

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

Historical proposal: IndexedDB version **5**. The current SI implementation already uses database version **7**; do not rerun this proposal as a new migration. Recheck actual stores before implementation. Keep the vault-local database and main-plugin ownership. Add focused stores alongside the current stores:

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

## 11. Fixed completion plan

The five product checkpoints remain SI1–SI5, with SI0 characterization. The three remaining deliveries below are work packages within those checkpoints, not a new hierarchy of prerequisite gates. **Private helpers, passing unit tests and design findings cannot close a production delivery.**

| Checkpoint | Current state | Required outcome / closing evidence |
| --- | --- | --- |
| SI0 / SI1 | Accepted | Characterization/diagnostics and presentation-only independence; keep their existing tests green. |
| SI2 | Accepted | Settings-neutral facts including dormant candidates; shared full/patch selection. |
| SI3 | Accepted | Durable per-source facts, source-local acquisition/repair and reuse of legacy bodies. |
| SI4 | Accepted (`323b260`) | All ten original Delivery 1/2 exits pass on the exact final artifact. [Evidence](validation/settings-independent-indexing-si4-acceptance-2026-10-03.md). |
| SI5 | Bounded warm-restart investigation | Implementation `62c7283`; diagnostics/first correction `8cd10b7d6746d607f8214ad192670a0b9a370778`. Truthful progress and two minimal corrections validated; [selection reuse](validation/settings-independent-indexing-si5-clean-selection-2026-10-04.md) removes 120,090 IDB reads but demonstrates no latency gain (82.149 s median versus 80.137 s). Cold behavior accepted; 20k hub outside critical path. Physical devices and final audit remain pending. |

### SI4 recovery packages after the incomplete maintenance return

The 2026-10-02 maintenance return combined storage repair, host-impact reconciliation and high-degree
semantic continuation. It stopped after approximately 15 hours with those concerns interleaved and
without the required regression coverage. The exact return is retained in Git as the explicitly
unaccepted checkpoint `d1c00ea`. Work now proceeds in the following three substantial packages. These
are the fixed implementation sequence for finishing SI4, not additional product checkpoints or a
resumption of C15-C26.

| Package | State | Acceptance boundary |
| --- | --- | --- |
| SI4-R1 — durable source-local repair | **Accepted (`b32e3c5`)** | Additive v8-to-v9 migration, bounded staging/count repair, interruption/restart/cleanup/concurrent-reader coverage, and no partial lookup publication. Existing high-degree backpressure remains unchanged. |
| SI4-R2 — known-impact host maintenance | **Accepted (`831e345`)** | Known create/modify/rename/delete/recreate waves remain source-local, native `metadata:resolved` closes are coalesced, transient dependency misses retry automatically, empty folders/materialized children converge without a graph rebuild, and a known Markdown denominator is maintained in O(1). The production-scheduler regression drives no manual reconciliation and all 310 source/167 browser tests pass. |
| SI4-R3 — high-degree completion and SI4 acceptance | **Accepted (`323b260`)** | Linear validity and memory guards, complete 20,015-owner GraphIndex publication, runtime consolidation and all original Delivery 1/2 exits pass. Full verify: 314 portable/174 browser; final native settings in both vaults and real maintenance/drift/idle scenarios pass. [Evidence](validation/settings-independent-indexing-si4-acceptance-2026-10-03.md). |

SI4-R1/R2 remain accepted; R3 and the final online corrections are committed at `323b260`. Both original delivery checklists below are evaluated and closed together. No additional SI4 package is active. SI5 is the subsequent restart/scale/device acceptance delivery; supported high-degree completion is not its latency/memory/device verdict.

### Remaining deliveries and acceptance checklist

The original Delivery 1/2 checkboxes are closed by the final [acceptance report](validation/settings-independent-indexing-si4-acceptance-2026-10-03.md) and [machine-readable exact-artifact evidence](validation/settings-independent-indexing-si4-native-2026-10-03.json). Broader restart, persistence retirement, performance and device claims require SI5; its checklist remains open.

**Delivery 1 — Working settings independence (SI4).** Offline owner: one integrated implementation covering `main.ts` settings dispatch, GraphIndex preparation/publication, and existing Plex/layout/expansion, gate, search, explanation and edit consumers. Online owner: native preflight and exact-build settings scenarios. Reuse the accepted source/replay/reader algorithms and SI1 presentation. Bootstrap missing dependency data once from cached facts outside the settings path. This is a development milestone; SI4/release remains open until delivery 2.

- [x] In the actual app, Friend→Challenger, dormant-field add/remove, both inference toggles and image-selector changes produce correct relationships, gates, siblings, labels, search membership and provenance under one policy.
- [x] With valid facts, each settings-only scenario records **0 body reads, 0 parses, 0 source reacquisitions, 0 cold/full-build calls**, unchanged source completion and no all-owner replay before the first correct normal view in the large fixture.
- [x] Navigation and expansion prepare new scopes; S1→S2→S3 publishes only S3. Consumers do not read stale raw neighbor maps, and relationship edits revalidate policy/source readiness.
- [x] Selected title/alias metadata has a tested completion/freshness observation; the tie decision is implemented consistently in full/scoped paths. No independent missing-title/order proof assignment remains.
- [x] Required portable/browser/build checks and native settings scenarios pass. Until delivery 2 handles a source mutation, the integrated development path reports affected scopes updating and rejects stale writes; it cannot silently fall back to a full build or claim SI4 complete.

**Historical review (2026-10-01), superseded by original Delivery 1/2 acceptance on 2026-10-03:** the Delivery 1 production implementation and automated oracle coverage are present, but two exact-build 20k-vault attempts fail and Delivery 1 is not accepted. The consolidated correction added a v5 compact codec and a one-shot final-inventory retry; all automated lanes pass. Native source validation completes for 20,015 heads with 0 Markdown reads/parses/repairs/failures, then the retry still returns `decode-budget`. The failed generation had 20,501 pages, 108,995,381 bytes and 557,044 rows; one bucket reached the 256-page cap with only 1,224,876 bytes. The deterministic regression modeled aggregate bytes and missed native hot-bucket fragmentation. The same reload refreshed every resolution family and wrote 183,715,567 source bytes before the catalog attempt. Per the repeated-blocker rule below, stop assigning codec/cap corrections automatically. The recommended design decision is to remove the process-wide contributor-catalog bootstrap from the settings route and use the source-local durable dependency index required by the lean decisions above; a bounded writer correction is smaller but retains the costly whole-vault startup path. Delivery 2 and C15–C26 remain blocked pending the maintainer's choice.

**Delivery 2 — Routine maintenance and consolidation (SI4).** Offline owner: source/index activation, dirty-work reconciliation, tombstones, bounded continuation and consolidation of migrated private readers. Online owner: real edit/event/fault scenarios. Reuse repository, summary/journal and canonical semantics. Depends on delivery 1.

- [x] An ordinary known-impact edit replaces the changed source's facts/index memberships and revisits affected dependencies, **not every owner**. Editing dormant candidates survives a semantic no-op and later field activation. One edit does not rebuild the whole catalog.
- [x] Create/rename/delete/recreate, attachments/folders, aliases/unresolved targets, tag/URL support and Date configuration converge correctly, including races with settings/sync. Uncertain host fan-out uses one coalesced cached-data reconciliation; it never starts merely because settings changed and never rereads unchanged bodies.
- [x] High-degree/long-key and non-Markdown-owner cases make progress in bounded batches. A genuine missing dependency is reported explicitly; arbitrary caps cannot leave supported vaults permanently pending.
- [x] Crash/concurrent-write tests reject stale activation/resurrection; cancelled work and repeated settings/navigation leave bounded caches/leases and no retained second full graph. Remove unused wrappers/prototype runtime paths after their replacement consumers pass; preserve required stored-data compatibility.
- [x] Required automated and native maintenance checks pass. Deliveries 1 and 2 together close SI4; no unresolved normal-workflow pending state is hidden by the clean-host test.

**Active 2026-10-04 closeout interpretation:** [Warm restart has been measured](validation/settings-independent-indexing-si5-warm-start-2026-10-04.md), truthful progress and the [first owner-loop consolidation](validation/settings-independent-indexing-si5-minimal-warm-correction-2026-10-04.md) were checkpointed at `8cd10b7d6746d607f8214ad192670a0b9a370778` before the next edit. [Clean selection reuse](validation/settings-independent-indexing-si5-clean-selection-2026-10-04.md) is independently validated: 120,090 fewer IDB reads, preserved source-head/repair/freshness fences, four owner walks remain. Native median **82.149 seconds** versus immediate baseline **80.137 seconds**, so no latency gain is demonstrated. Posting batching and exclusive yield-cost measurement remain unimplemented. The maintainer accepts existing extreme-vault cold behavior and excludes the synthetic 20k hub/high-node redesign from the SI5 critical path. Section 12 is historical stress/reference coverage; its excluded cases do not reopen this scope. Physical-device checks and final correctness/retirement/settings-route audit remain required; SI5 is open.

**Delivery 3 — Restart, scale and release acceptance (SI5).** Offline owner: startup adoption/resume, optional derived-cache handling, cleanup and regressions in one package. Online owner: exact-build native measurements, main-window/pop-out checks and maintainer physical-device procedures. Depends on accepted SI4.

- [ ] Restart after settings changes or during acquisition/sync adopts valid source heads and resumes missing/dirty work. Inventory/stat comparison is allowed; warm adoption cannot routinely replay every source family merely because the session changed.
- [ ] Missing/corrupt graph acceleration restores requested views from facts; one corrupt source chunk repairs that source; unavailable storage remains explicit. Legacy body/graph migration preserves reusable work and user data.
- [ ] Retire superseded full-graph progress persistence and remaining unused SI4 runtime prototypes through explicit compatibility cleanup; update implemented architecture/instructions.
- [ ] Under the explicit 2026-10-04 scope decision, measure valid-cache foreground warm restart, report truthful phase progress and review/validate the smallest correction; then complete physical iPad/Android interruption/resume and representative workflows (hundreds of links, roughly a thousand at an extreme). Retain prior desktop/main-window/pop-out evidence and excluded synthetic stress failures visibly. Existing extreme-vault cold behavior is accepted; section 12’s synthetic dense-hub/high-node redesign and further cold optimization are outside this closeout.
- [ ] Record all acceptance outcomes and build identities, confirm no live settings route still schedules a source/full-graph rebuild for valid facts, and mark SI5 complete only when these outcomes pass.

**Delivery 1 main-agent preflight (part of the delivery, not a separate external handoff):** confirm the configured disposable vault and exact build; record native cache/event completion for selected fields and source changes; select the existing production seams; record the caller list and the tie decision. Native readiness cannot remain an unspecified task assigned to an offline agent. The last review had no test-vault environment variables set; that does not establish that no test vault exists. If native setup is unavailable, report that exact external dependency and continue independent implementation only; do not claim native acceptance or issue successive proof-only assignments.

These packages are deliberately larger than recent handoffs. Delivery 1 must return an executable settings scenario, delivery 2 an executable edit/reconciliation scenario, delivery 3 an executable restart/scale scenario. A blocking discovery is recorded against that delivery with its concrete failing case, proposed resolution and cost impact; it does not automatically spawn another named checkpoint. Native event gaps can change the implementation, but cannot silently relax correctness.

### Transparent progress and cost control

- Track only the checkpoint table and three delivery checklists above. For each return record base/commit, changed production behavior, acceptance cases passed/remaining, actual verification, and the next delivery. Preserve historical logs; stop adding a top-level progress paragraph for every helper.
- Target **one substantial offline implementation return and one online review per delivery**. One consolidated correction return is allowed when the review finds defects. If the same blocker survives that correction, stop assigning work on that assumption and report the smallest alternative plus tradeoffs to the maintainer. This is a review/decision trigger, not permission to ship a failure.
- Freeze the scope to the original user outcomes. No separate order/gate/title certificate project, generic catalog framework, additional cache generation or unrelated refactor. Any proposed extra work must identify a reproducible failure in one of the three delivery exits and why an existing owner cannot handle it.
- During development run focused tests; run the required full verification once on the final review candidate, and rerun affected checks when code changes. Do not repeatedly run the unchanged full suite or reproduce accepted proofs merely to increase evidence counts. Real-build/native gates remain mandatory when applicable.
- Record available token usage and actual elapsed effort per delivery when supplied by the agent/runtime. Historical total tokens, billed cost and active engineering time are **unknown** from this repository; commit/test counts cannot reconstruct them. The three-return target is a planning constraint, **not a reliable time/cost estimate or guarantee**. No new tool/library or token budget is needed for this documentation reset.
- Commit each reviewed delivery or explicitly labelled interim before importing another external return, following maintainer authority. Keep the next assignment in the single HANDOFF; an inactive handoff authorizes no work. No export is needed until an implementation assignment is ready.

**Finish means:** the original settings sequence works in the live application and after restart, edits maintain the index without routine global work, required consumers agree on a current revision, and the named performance/device tests pass. It does not mean every potential optimization, every C15–C26 refactor, or every theoretical host mutation has been solved.

## 12. Acceptance matrix

### Behavioral and adversarial tests

All relevant source-fact replay/derived results must equal a clean compile under the **same final settings**, including declarations, multiplicity, active/overridden decisions, directions, active node set, gate totals, labels/styles and search. Preserve existing goldens except an explicitly approved presentation change. The proposed deterministic equal-key tie rule must have its own before/after test and be applied to both full and scoped paths; it must not normalize away semantic differences, labels, evidence or counts.

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

## 14. Original review performed for this document — 2026-09-29

Read repository guidance, the refactor plan's contracts/checkpoints/history, current indexing/source/architecture notes, concrete collection/compiler/settings/persistence/coordinator paths and relevant Git history. Converted the supplied timestamps directly and compared the signature-removal commit with the reported sequence. No personal vault, running Obsidian instance, cache or installed plugin was accessed or modified.

This delivery changes documentation only. Runtime tests, builds, performance runs and physical-device validation were not run and are not claimed. Documentation link/content/whitespace checks are the applicable validation. No manual test is needed to accept the document itself; all implementation gates above remain future work.

## 15. Delivery-reset review — 2026-10-01

Reviewed the original settings/work contracts, live settings dispatch, per-source postings/query behavior, contributor bootstrap/summary/journal boundaries, private-read limitations and the SI action log at `7b7b3ca`. Replaced the open-ended SI4 execution sequence with three production deliveries; selected existing machinery for reuse/consolidation and explicitly proposed the narrow sort-tie compatibility adjustment. Restored the original uncertain-host cached-reference fallback; source completeness and final publication checks remain required. The unsent private foreground-composition handoff is withdrawn and inactive. No runtime code, persisted format, sort behavior or release status changes in this documentation update. Validation is documentation link/content/whitespace checking only; no runtime test or manual test is needed for these edits.
