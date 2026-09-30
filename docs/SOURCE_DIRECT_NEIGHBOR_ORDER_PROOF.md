# SI4 direct-neighbor encounter order — missing-contract return

**2026-09-30: unaccepted, proof/characterization return. No order reader or certificate is
implemented.** Base: `dd58feefb4a8bfe6ad54bb5f4b3e4ed86e397378` on
`indexing-optimization-v2`. SI4b1/SI4b2/SI4c/SI5 remain open; C15–C26 remain paused.
The new tests have syntax validation only in the returning environment, not execution or
required-runtime acceptance. See the current [handoff](../HANDOFF.md) for actual checks.

Read with the [settings-independent design](INDEX_SETTINGS_INDEPENDENCE_DESIGN.md),
[contributor coverage contract](SOURCE_CONTRIBUTOR_DISCOVERY.md),
[candidate-degree proof](SOURCE_CANDIDATE_DEGREE_PROOF.md),
[URL-title order proof](SOURCE_URL_TITLE_PROOF.md), and
[selected-title limitations](SOURCE_SELECTED_TITLE_PROOF.md).

## 1. Scope and result

The question is the encounter-order tie breaker for **one exact center's direct neighbors**,
not a visible scene, sibling/expanded order, top-N, continuation or search. Candidate identities
and a complete finite candidate set are supplied. Their selected title/scalar inputs and primary
sort keys are assumed valid at the same observation; this return does not implement or certify
those inputs. Correct candidate raw degrees do not supply this remaining tie breaker.

The full-build oracle orders pairs by their **first insertion into the private unordered-pair
evidence store**, not by the first currently visible, active, highest-precedence or center-facing
witness. A later reciprocal declaration can use a position established by directional hidden
evidence that originally had no inverse view. Declaration sorting within an existing bucket does
not move that bucket.

Current source facts preserve an owner's local host-target sequence, and derivative v3 captures
Markdown inventory order separately from structural order. Neither supplies the relative source
positions in the full collector's whole resolved-link and unresolved-link maps. Consequently a
clean, complete contributor cover and successful canonical replay are insufficient to certify
full direct-list order. The narrow missing premise is an authenticated, settings-neutral **host
acquisition-order binding** to the same root/host observation, plus reconstruction of the actual
full phase schedule. There is no safe reason to add a ready order certificate before that premise
exists.

This is a source-level missing-contract argument with executable characterization cases, not a
claim that an Obsidian event sequence has been observed. The tests construct two independent,
static admissible host snapshots. They do not simulate an unreported mutation at one observation.

## 2. Exact full-build trace

The oracle is `GraphBuilder.build()` followed by the real binder and a fresh `GraphIndex`.
`tests/support/selectedTitleFixture.mjs::fullTitleIndex()` exercises that path. The per-owner
`hostOracle()` in the cached-source fixture is useful for semantic comparisons but is **not**
an independent full encounter-order oracle. A helper that sorts relations before comparing them
also cannot demonstrate this property.

| Stage and canonical owner | Order relevant to this proof |
| --- | --- |
| [GraphBuilder](../src/index/GraphBuilder.ts), `build`, `collectStructuralSources` | Accept the complete structural stream first. Keep its read open until final structural validation. Structural document traversal is not substituted for Markdown inventory order. |
| [Structural collector](../src/adapters/obsidian/structuralSourceCollector.ts) and compiler | File-tree and tag-tree occurrences can create the earliest pair bucket. Compiler-derived tag ancestors use the canonical tag rules and deduplication; source/contribution ownership is retained. Entity creation alone does not order a neighbor map. |
| [Host-link collector](../src/adapters/obsidian/hostLinkSourceCollector.ts), `scan`, `sourceEntries` | Scan the whole resolved map, then the whole unresolved map. Within each, enumerate own source properties and then own target properties in the host object's actual enumeration order. This is not path sorting. The source-scoped variant cannot observe the outer position of its source. |
| Host finalization | Rescan the order-sensitive digest and fence the captured revision before closing the host read. This transient full-read check does not persist a queryable source rank. `readHostLinkSignatureEntries()` sorts a local signature; that signature is not the collector's encounter schedule. |
| GraphBuilder, `collectMarkdownSources` | Capture `getMarkdownFiles()` and consume files in that sequence. Batched/overlapping body I/O does not change the file consumption loop. For each file: metadata, neutral references, then Date/body-URL relations. |
| [Reference collector](../src/adapters/obsidian/ontologySourceCollector.ts) and [reference values](../src/core/parser/referenceValues.ts) | Physical value headers/payloads/candidates retain their occurrence sequence. The canonical policy selector selects assignments; dormant candidates do not create evidence. Distinct physical occurrences survive; repeated destinations are deduplicated only within one value. |
| [Metadata collector](../src/adapters/obsidian/metadataSourceCollector.ts), `collectRelations` | Visit Date fields/flattened values in their original order, then body URLs in parser order. The compiler adds a body-URL source/target pair before its optional URL-origin/target pair, with canonical shared-origin deduplication. |
| [Compiler](../src/core/graph/compiler.ts), `finish` | Reconcile configured reference declaration order **within each pair**, finalize metadata, remove presentation-only host declarations, then resolve. This does not reorder pair keys. Self-links and ignored stale host entries create no pair. |
| [Evidence store](../src/core/graph/evidence.ts), `writePair`, `entries` | A standalone `Map` retains first insertion of an unordered pair. Reciprocal/duplicate declarations replace the value at the existing key. Entries enumerate pair keys in that order, yielding each available directed perspective. Hidden evidence has no inverse. |
| [Resolver](../src/core/graph/resolver.ts), `resolveEvidenceStoreCooperativeByKey` | Clear fresh neighbor maps; apply canonical precedence and evidence decisions for each directed entry; insert a relation when a role or hidden flag survives. No neighbor re-sort occurs. |
| GraphBuilder, `bindCompiledGraph` | Bind canonical pages, then copy each compiled neighbor map in iteration order. Explicit semantic/physical facets govern binding. Whole-node creation order is not a substitute for pair order. |
| [GraphIndex](../src/index/GraphIndex.ts), `relationView`, `sortNeighbours` | Iterate the center's map, omit hidden relations, apply visibility and canonical role/inference classification, append each direct-role list in encounter order, then sort through the existing facade. |

`sortNeighbours()` decorates each list item with its encounter index and computed title, times and
raw connection count. After its selected primary comparison, it compares titles and finally uses
`a.index - b.index`. Thus the final tie rule is explicit; it is not merely reliance on the engine's
stable `Array.sort`. Descending primary order does not reverse equal-key encounter indices.
No new comparator or presentation selector belongs in the source layer.

### Which evidence may establish the position?

A hidden declaration A → Center can create the A/Center bucket without creating a Center → A
perspective. If another declaration later supplies Center → A, that relation takes the old bucket
position, even if Center → B had a visible witness earlier. Ranking only center-facing evidence
is therefore wrong. Both directions and original declaration identity matter.

Conflicting inline ontology remains stored when frontmatter overrides it. A reciprocal or repeated
declaration appends to the same pair and does not move it. The compiler's temporary configured-field
keys order declarations/definitions inside that bucket; they are compiler-local and are cleared at
finalization. They are not a durable, settings-neutral pair-order coordinate.

Image-only suppression is different from inactive precedence decisions: it removes the selected
`obsidian-link` declarations. If another declaration remains, the pair retains its first host-phase
position, even when that earliest host declaration was removed. If the bucket becomes empty, the
standalone store deletes it and it contributes no final neighbor. In this fresh full path suppression
runs after collection; there is no subsequent reinsertion phase to simulate. Copy-on-write patches,
snapshot restore, rename and progressive startup have their own histories and are not proved here.

## 3. Finite invariant

Fix exact center ref C, complete finite candidate set Q, one current complete derivative root R,
its clean host observation H, an immutable semantic-policy snapshot S and live demand D. Every
source/host journal must be closed, including KNOWN tickets. Retain the established exact physical
facts and path-injective legacy-binding eligibility; do not silently map pathless or colliding
identities into the full GraphIndex oracle. SourceId, NodeId, semantic path and physical path are
separate inputs, even when this Obsidian fixture gives some of them equal strings.

Let E(H,S) be the fresh full collector stream expanded by the **canonical compiler** into original
declaration insertion events. For an unordered pair p, let k(p) be the position of the first event
that actually creates its standalone evidence bucket. Neutral dormant values, entity facts,
ignored stale entries and self-links do not create such an event. Hidden and subsequently
suppressed declarations can create one. k is policy-dependent; raw acquisition coordinates must
not be confused with a previously selected graph's k.

Let N(C,H,S) contain exactly those directed C relations retained by the canonical full resolver
after final suppression. The required order law is:

> The fresh full neighbor-map sequence for C is the restriction of increasing k(p) to pairs whose
> C perspective belongs to N(C,H,S). A direct-role list is a stable subsequence of that sequence
> before sorting. When the actual primary and secondary title comparisons tie, the public direct
> list preserves that subsequence's relative order.

Proof: first pair insertion orders the evidence `Map`; later nonempty writes do not move keys;
within-pair declaration ordering does not move keys; final empty-bucket deletion only removes keys;
the resolver emits each surviving C perspective in the remaining pair sequence; the binder copies
that sequence. Visibility/classification only restrict each direct-role sequence, and the existing
sorter's explicit encounter-index tie breaker retains its relative order. The lexical endpoint
normalization used to identify an unordered pair does not sort the sequence of pairs.

A future finite certificate needs **complete original neutral incidence**, not a winning-witness
list. It must account for both declaring endpoints, reciprocal and hidden declarations, dormant
references, image/host counts, shared URL-origin and tag-ancestor contributions, and authenticated
negative support for omitted owners/candidates. Existing conservative tag-family closure remains
necessary when tags participate. A selected-head check over only returned positive owners cannot
prove absence. A complete candidate-degree union is not automatically an order proof either.

Under that coverage premise, reconstructing the original relative coordinates of all relevant
insertion events is enough: unrelated nonincident events may occupy gaps but cannot swap two
relevant first insertions. Replaying selected owners in catalog order does not establish those
coordinates. Never use a SourceId/NodeId/path sort to guess them.

## 4. Smallest missing acquisition contract

[SourceFacts](../src/index/SourceFacts.ts) stores `host-link` records with state, target and count.
[Source acquisition](../src/adapters/obsidian/sourceAcquisition.ts), `resolution`, writes each owner's
resolved targets and then unresolved targets in their local enumeration order. The new local-target
case deliberately protects that existing information: **not all host order is missing**.

The absent part is the position of that source in each complete host map. The two map source
orders are independent. Structural `order`, durable source commit sequence, random source identity,
compiler-generated evidence ID and v3 `markdownOrdinal` do not encode those positions.

The permutation cases create A.md, B.md and Center.md in the same Markdown order with the same
neutral facts. One static host's resolved-map source order is A, B; the other's is B, A. Both sources
link to Center, and both candidate titles, file times and raw degrees tie. The tests require the
actual full parent list to follow the respective host order for every existing sort mode. They
compare all four real per-source family payloads and, for v3, the same Markdown ordinals. They do
**not** claim the independent roots, epochs or random physical identities are byte-identical, nor
that root authentication is unnecessary. Those opaque labels cannot be interpreted as missing
order coordinates.

The previously reviewed mixed-phase A-property/B-host counterexample remains in
`tests/source-candidate-degrees.test.mjs`: full B,A versus per-owner replay A,B even with exact equal
degrees. The new source-permutation cases isolate a stronger information gap. Merely changing
per-owner replay to run all host records before all property records is still insufficient.

A narrowly scoped future acquisition design must provide, at minimum:

1. **A root-bound full host-order observation.** Bind exact eligible source identities to separate
   resolved-map and unresolved-map source positions (or an equivalent authenticated global record
   sequence). Retain the already available local target ordering and original record identity.
   Authenticate completeness/absence and reject stale or incompatible observations. Cover every
   host source the full compiler can accept; do not infer an unsupported Markdown-only guarantee
   from the current source-storage layout.
2. **The actual phase merge.** Keep structural order independent, then resolved and unresolved host
   phases, then v3 Markdown order with original per-file reference/Date/body occurrence order.
   Preserve canonical selection, generated structural subevents and multiplicity. A raw record's
   identity must remain associated with its selected source revision/physical observation, not a
   UI title or active relation. Local ordinals from distinct producers are not globally comparable.
3. **Acquisition-time coherence, query-time bounds.** Capture/validate the order only during explicit
   acquisition, under the same host/root coherence premise as the selected facts. An order digest
   without positions cannot reconstruct the stream. A demand read must neither enumerate live whole
   maps/inventories to repair the missing data nor reacquire sources, rebuild roots, parse bodies,
   rewrite source/body/graph data, retire journals or publish graph state.

This is a minimum **contract proposal**, not a schema patch, event-order guarantee, accepted design
or order-certificate implementation. No new derivative format or database version is selected here.
The native guarantee needed to seal this observation must be investigated explicitly; a source
revision callback or host double is not evidence that every real map replacement/reordering is
reported before the reader's final fence.

Once that contract exists, a private finite reader still needs whole-scope owner/record/byte/work
bounds and complete value-frame finality. Missing/hot/corrupt/incomplete/colliding inputs must discard
the whole result, not return a prefix or fall back to an all-owner graph. It must pin R and all
selected heads, revalidate root integrity/mutation sequence, positive and negative support and all
journal masks after the final awaited work, then synchronously recheck host/source capabilities,
S and D. An empty result needs those same negative and host fences. Existing certificate types
must not be relabeled as order authority, and no production caller should be added as part of that
private proof.

## 5. Characterization and review limits

[The new suite](../tests/source-direct-neighbor-order.test.mjs) uses existing real-production bundles
and fixture helpers. It specifies ten top-level cases: the v2/v3 source permutations, preserved local
target order, opposite hidden first insertion, physical versus configured-field order, mixed
resolved/unresolved/property/inline/Date/body-URL phases, image suppression, reciprocal/duplicate
and suppressed evidence, folder-center structure, and third-party URL-origin membership under
reordered structural document traversal. Cases reuse actual `GraphBuilder.build()`, the binder,
`RelationEvidenceStore`, precedence and `GraphIndex.neighbours()`/`titleFor()`; no test-local sorter,
classifier or title selector replaces them. Sources are static before each full build. Every created
index and source fixture is released.

The new suite is registered in `npm run test:sources`, hence also in `npm test` and `verify`.
Existing degree, selected-title, URL-title, neighborhood, browser, timing, golden and architecture
checks are unchanged. There is no new reader to fault-inject; existing fail-closed reader checks
remain required regression checks, not evidence for a nonexistent order certificate. These finite
fixtures are not native event, durable transaction, large-vault performance or device tests.

Returning environment: Node v22.16.0 and npm 10.9.2, no complete checkout/project dependencies or
Obsidian runtime. Node syntax validation and local content checks are possible; required Node
>=22.22.2 <23, production type checking/build and real execution of this suite are pending. The
historical 269/269 source and 145/145 browser results belong to the base's main-agent degree review,
not this return. No current pass count is claimed.

Review on the required runtime with real dependencies:

```sh
node --test tests/source-direct-neighbor-order.test.mjs
npm run test:sources
npm run test:sources:browser
npm run verify
```

Independently verify the expected phase/evidence ordering and the lack of runtime/schema/routing
changes before acceptance. Keep the separate scalar/alias MetadataCache completion-versus-physical
revision probe pending in the equipped agent's disposable vault; it is not solved by this ordering
argument and is not needed to pretend that valid supplied tie keys have been re-certified here.
No maintainer manual/device test is requested for this proof-only return.

## 6. Unaccepted return entry for the plan ledger

The following entry is supplied for insertion in `Refactor plan.md`, **not represented as already
inserted there**. The API-only return preserves that large existing ledger rather than replacing
unverified historical content; completing its append remains a reviewer action.

> 2026-09-30 — SI4 direct-neighbor encounter-order missing-contract return, unaccepted. Base
> dd58feefb4a8bfe6ad54bb5f4b3e4ed86e397378. Traced full collection through first unordered-pair
> insertion, final suppression, canonical resolution, binding and GraphIndex's explicit tie index.
> Per-owner host-target order and v3 Markdown ordinals do not authenticate whole host-map source
> order; hidden/opposite and subsequently suppressed witnesses can establish the surviving position.
> Added production characterization cases and registered the source lane; no reader/certificate,
> format, runtime or consumer route changes. Local syntax/content checks only; required-runtime
> execution/build/browser checks and independent review pending. See SOURCE_DIRECT_NEIGHBOR_ORDER_PROOF.md
> and the transient HANDOFF for exact limits. SI4b1/SI4b2/SI4c/SI5 remain open; C15–C26 remain paused.
