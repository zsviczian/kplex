# SI4 direct-neighbor encounter order — missing-contract proof

**Status (2026-09-30): reviewed characterization/design finding.** This slice stops at the
assignment's missing-contract branch. It adds production-oracle tests, not an order input reader,
certificate, source codec or public route. The accepted [finite raw-degree input](SOURCE_CANDIDATE_DEGREE_PROOF.md),
[URL-name input](SOURCE_URL_TITLE_PROOF.md) and original relation/gate certificates keep their existing
scope. SI4b1/SI4b2/SI4c/SI5 remain open; C15–C26 remain paused.

## Question and answer

For **one exact center** and one finite, complete direct-neighbor candidate set, what original order
must survive so that equal-key ties agree with a fresh full GraphBuilder/GraphIndex?

It is the **first emitted declaration of each unordered pair**, before final suppression, restricted
to pairs that eventually produce the center's directed relation. It is not the first surviving,
active, winning or center-forward declaration. Configured-field reconciliation sorts declarations
*inside* a pair; it does not reorder the pair map. Filtering removes entries, and GraphIndex's stable
fallback preserves their remaining order.

Current source/catalog contracts do not encode the full host maps' cross-owner enumeration. Two
independently acquired clean inputs can have identical original source payloads, structural facts
and v3 Markdown ordinals, yet produce different full direct tie orders. Thus no general order
certificate can be derived from those facts. A settings-time host/inventory scan, a cached-graph
copy or a deterministic substitute sort would evade, not solve, the missing contract.

## Production trace: fresh full build only

The owners below are the implementation being characterized, not a proposed replacement pipeline.

| Stage | Actual order relevant to the center |
| --- | --- |
| [GraphBuilder.build](../src/index/GraphBuilder.ts), `collectStructuralSources`, `collectHostLinkSources`, `collectMarkdownSources` | Initial complete structural batch stream; complete host-link stream and its final check; then each Markdown file in `getMarkdownFiles()` order; final structural validation; compiler finish; legacy binding. Batched body IO does not change the file-consumption order. |
| [ObsidianStructuralSourceCollector](../src/adapters/obsidian/structuralSourceCollector.ts), `scan` | Folder-stack traversal and each folder's original `children` sequence; file-tree edge before the child's entity fact. Tag memberships then follow Markdown inventory and original tag occurrence order. The final scan validates the structural stream. |
| [ObsidianHostLinkSourceCollector](../src/adapters/obsidian/hostLinkSourceCollector.ts), `scan`, `sourceEntries` | **All** `resolvedLinks` owners/targets, then **all** `unresolvedLinks` owners/targets. Both levels use actual own-property enumeration, not structural/Markdown/lexical order. Numeric-looking keys follow JavaScript's enumeration rules. Aggregate counts are not repeated lexical occurrences. |
| GraphBuilder's per-file collectors | Metadata, neutral reference values/targets, then relation collection containing Date-derived records and body URLs. Selected frontmatter/inline references are consumed in their original neutral value/target stream. Date and body-URL families retain their separate later phases. |
| [NormalizedGraphCompiler](../src/core/graph/compiler.ts), `acceptBatch`, `consumeRecord`, `addEvidence`, `addHidden` | Captured policy selects neutral records. Only actual canonical emissions can establish a pair; dormant values, ignored records, self-links and deduplicated expansions cannot reserve a position. Tree/tag, ordinary link, selected ontology, Date and URL-origin emissions use the same canonical owner. |
| Compiler `finish`, `rememberReferenceOrder`, `compareDeclarationOrder` | Reconcile selected-reference declaration arrays, finalize metadata, remove image-only host declarations, then resolve evidence. Reference order keys contain the source's first reference sequence, configured field order, surface, value/target ordinals and assignment order. These keys are **not** pair-map insertion keys. |
| [RelationEvidenceStore](../src/core/graph/evidence.ts), `addPair`, `addHidden`, `writePair`, `orderDeclarationsCooperative`, `entries` | A standalone insertion-ordered map stores unordered pair buckets. Appending duplicate/reciprocal evidence and sorting a bucket do not move its key. Removing some declarations preserves a nonempty bucket's position; an empty bucket is deleted. `entries()` emits each pair's existing directed perspectives in pair-map order. |
| [Resolver](../src/core/graph/resolver.ts), `resolveEvidenceStoreCooperativeByKey` | Start fresh neighbor maps. Apply canonical ontology precedence/resolution and insert each directed relation with a role, including hidden, in the evidence store's pair order. A hidden declaration has no invented inverse. |
| GraphBuilder `bindCompiledGraph` | Bind exact NodeIds and independently checked semantic/physical facets. Iterate each compiled neighbor map and `set` the corresponding legacy target path in the same order. Unsupported/missing/path-colliding bindings must not masquerade as a proof. |
| [GraphIndex](../src/index/GraphIndex.ts), `relationView`, `sortNeighbours` | Walk raw neighbor insertion order, apply hidden/target/inferred visibility and canonical `classifyRelation`, and append each role's candidates. Sort by configured primary key, natural title, then original array index. All eight modes retain equal-key encounter order. |

A canonical pair key's lexical endpoint normalization does **not** lexically sort pair-map iteration.
Compiler-generated evidence sequence IDs express one compilation's emissions, not stable source or
node identity. Incremental copy-on-write layering, removal/reinsertion across builds, compaction and
sibling witness replacement/merge have different questions; this proof does not cover them.

### Why the earliest winning declaration is not enough

Frontmatter on either endpoint can suppress conflicting inline evidence without deleting the pair.
An earlier inline declaration still establishes the pair position. Exact duplicate assignments may
retain multiple evidence records but produce one map entry. Reciprocal host declarations also share
one unordered pair and combine direction through canonical resolution; counts do not duplicate it.

Image-only reconciliation may remove the very first host declaration. If another declaration survives,
the pair keeps its original position. If none survives, the pair disappears; full finish adds no later
records that could recreate it. Hidden evidence from A to the center can establish a pair before B,
even though it supplies no reverse relation by itself. A later center-to-A ordinary declaration then
appears before B in the center's map. Hidden-only opposite evidence produces no center entry; a
center-owned hidden entry remains raw but disappears from visible direct lists.

Inferred visibility and node filters only restrict the final sequence. They do not authorize a
recomputation from visible or active evidence. Policy selection, by contrast, happens before emission:
an unselected dormant value cannot establish an early pair at all.

## Conditional invariant for one finite direct scope

Fix a root `R`, clean complete host observation `H`, captured semantic policy `S`, live demand `D`,
an exact center reference `c`, and finite candidate references `C`. Supply equal comparator inputs
for the tie test; this slice implements no title/scalar/alias selector. Let `T(R,H)` be the complete
original normalized full-builder stream, including its phase and local record identities. Completeness is not a caller-chosen
prefix: every neighbor in the claimed direct scope must be covered, with all raw hidden/inferred
and suppression support retained until canonical filtering.

Apply the existing decoder/compiler under `S`. For an unordered pair `p`, let `birth(p)` be the
position of its **first actual evidence insertion** in that fresh compilation, including the
canonical within-record expansion position. This definition precedes final declaration sorting,
image removal and ontology suppression. Define `F(c,p)` to mean that final canonical resolution
produces a role-bearing directed relation from `c` to the other endpoint.

Then the raw direct map of `c`, restricted to `C`, is the subsequence of pair births for which
`F(c,p)` holds and the exact other endpoint is in `C`. Each visible role list is a further canonical
restriction of that subsequence. With equal comparator keys, the production stable sort preserves
it. A pair's first declaration can come from **either** endpoint or from structural/generated
contribution owners; a center-only or outgoing-only source selection is insufficient.

Proof: each new unordered key enters the fresh evidence map once. Later additions and bucket-array
reconciliation retain its position; finish only deletes empty buckets. Resolver traversal inserts
qualifying directed entries into fresh maps in that remaining order. Exact injective binding keeps
that order. `relationView` restricts it; `sortNeighbours` returns the original index for a tie.
No independent classifier or sorting algorithm is needed to state or test this invariant.

Replaying a bounded selection would establish this invariant only if its **complete support** preserves
all emissions and suppression inputs that affect those pairs and preserves their order relative to
one another. Use the existing complete neutral incidence/discovery contract and whole selected-owner
facts, including opposite, structural/generated and dormant/negative support, not final visible
edges or first-winning witnesses. Preserve original global coordinates when irrelevant owners are
omitted. Every required materialized endpoint must bind exactly. This is a necessary replay premise,
not a new assertion that a gate or degree certificate already proves ordered completeness.

SourceId denotes source ownership; NodeId denotes the exact semantic entity. Physical identity/path
selects the host file incarnation; semantic path is a separately validated compatibility facet.
None is an ordinal, and none may be derived from another. In particular, path sorting or durable
head sequence/creation order is not an original acquisition phase coordinate. The existing pathful,
path-injective legacy binding restriction remains; opaque/pathless portable identity is not coerced
into a legacy path to obtain an order.

## Which existing coordinates help?

[SourceReplay](../src/index/SourceReplay.ts) preserves original local facts but replays one whole owner:
local structure if needed, resolution/host links, metadata, reference values, presentation counts,
Dates, body URLs. [CachedSourceSemanticReader](../src/index/CachedSourceSemantics.ts) can supply explicit
structure once, but still compiles each selected owner in turn. Merely permuting those owners cannot
restore full global phases.

| Existing authority | Sufficient part | Missing part |
| --- | --- | --- |
| Original catalog structural fact `order` | Exact file-tree/tag structural emission sequence, including canonical tag expansion/deduplication | Host-map outer order and per-file Markdown inventory order are different observations. |
| Structural source-row `order` (v2/v3 ordinary contributor selection) | Stable contributor selection in that catalog's structural traversal | Not the full builder's host or Markdown owner order; nested folders exhibit the distinction. |
| Original framed source-family order | Within-owner host target enumeration; selected neutral value/target sequence and original ordinals; Date and body-URL sequences | Does not identify where that owner appeared in either whole host map. Nor does it turn a whole-owner replay into a phase-aware replay. |
| V3 authenticated `markdownOrdinal` | Per-file Markdown-phase order, combined with existing local record identities; the accepted URL-label purpose remains valid | Not either host-map owner order, not all-host-before-Markdown, and not pair birth when earlier host/structural evidence exists. V2 does not supply this Markdown coordinate. |
| Selected heads, source revisions, semantic/physical refs and host capability | Selection, identity, content and lifetime fences under their existing contracts | They do not carry the missing order permutation. A nonce, revision or count is not a decoding of that permutation. |

Within one owner, the original body-URL sequence also orders canonical URL-origin child emissions;
the body parser's duplicate policy remains authoritative. Across owners, v3 Markdown order supplies
that phase's owner coordinate. No URL-title ordinal is promoted to a complete-neighbor certificate.

### Executable counterexamples

The new [portable suite](../tests/source-direct-neighbor-order.test.mjs) uses fresh, independently
owned full GraphBuilder/GraphIndex instances. The cached path uses the existing requested-neighborhood
reader, canonical compiler and actual binder/GraphIndex. Its existing `ready` means its original
relation/gate contract, **not ordered-list readiness**. Explicit request-order diagnostics use the
unchanged semantic reader, never emit a certificate and never substitute for the full oracle.

* In all eight sort modes, B's incoming host link precedes A's incoming selected property in the full
  build: `[B,A]`. Whole-owner replay yields `[A,B]`, even with an explicitly supplied Markdown-order
  request list. Actual candidate raw degrees are both 2, modification/creation inputs are equal,
  and the test supplies one constant title key.
* For both resolved and unresolved host families, and both v2/v3 roots, changing only outer owner
  enumeration flips the full tie order. Each independently acquired fixture has exactly equal source
  family payloads, structural records and existing source-row order/Markdown coordinates. Cached
  order is unchanged. These are two clean static inputs, **not** a claim of silent native mutation;
  independent lifecycle/head nonces are deliberately not equated.
* An incoming resolved B link and the center's outgoing unresolved Ghost link share a lateral list.
  Full resolved-before-unresolved gives `[B,Ghost]`; whole-owner replay gives `[Ghost,B]`. A separate
  Markdown-only nested-folder case is repaired by an explicit original Markdown request order; the
  host-before-Markdown case is not. Local host targets, structure, tags, Date/body and URL-origin
  cases characterize where original order already suffices.

Additional cases cover duplicate/reciprocal declarations, both directed perspectives, all four
inference-policy combinations, field reconciliation, inactive inline evidence, directed hidden
support, image-only removal with surviving/deleted pairs, inferred visibility and dormant activation.
The test with the actual full host collector changes only its outer-map order while holding the
fixture revision fixed: terminal `finalize()` rejects, and a fresh collector sees the new sequence.
That proves the collector's order-sensitive digest behavior, **not** a native MetadataCache event
sequence, atomicity guarantee or an existing persistent order observation.

## Smallest missing contract — design only

The information deficit is an **original host phase/owner coordinate plus its currentness authority**.
The least additional reusable coordinate is a root/head-bound rank for each participating owner in
**each** whole host family: resolved-owner rank and unresolved-owner rank, paired with the already
stored owner-local target record position. Equivalently, store an original full host-record locator.
The two owner permutations can differ, so one shared owner rank is not a general substitute. Fixed
phase tags distinguish structure, resolved, unresolved and Markdown; existing structural order and,
where available, v3 Markdown ordinals cover the other cross-owner coordinates. Canonical expansion
within a record stays with the compiler; do not persist policy-selected roles or winning evidence.

This is an informational minimum, **not a chosen schema or a claim of a byte-minimal encoding**.
Relative positions suffice mathematically, but omitted owners/records must be authenticated, not
renumbered according to a settings-time selection. A concrete future contract must provide:

1. **Acquisition identity and completeness.** During explicit acquisition, observe the same complete
   original host sequence as the full collector. Bind owner rank/local record identity to the exact
   SourceId, source head/incarnation, SourceEntityRef and host observation. Commit the family and
   original owner/record coverage, including empty/absent owners and endpoint incidence needed for
   negative support. Authenticate unique ranks and complete original membership, not merely surviving
   lookup rows. Cover every accepted host owner; if an accepted non-Markdown owner has no stored
   source representation, it is unsupported, not silently absent. Empty maps and ignored stale-owner
   entries need explicit producer semantics; filtered output alone does not prove complete input.
2. **Order-sensitive host currentness.** Capture and terminally validate the actual sequence under
   one coherent host observation, as the full collector does with its initial/final digest. A future
   read capability must certify that observation after its last await, or reject. Current per-owner
   map facts, signatures, clean journal stamps and v3 inventory validation cannot be relabelled as
   this authority. Do not promise that a reorder necessarily raises a particular native event; that
   host contract must be established independently. An unobserved reorder cannot be repaired by a
   source-head equality check. Query-time global host-map/inventory enumeration is not allowed.
3. **Canonical phase-preserving consumption.** A future bounded private consumer must feed the
   existing canonical owner a phase-preserving stream (or obtain original pair-birth observations
   from that owner). Existing whole-owner replay has no such cross-owner phase contract. Do not add
   a parallel role classifier, sort final evidence IDs, take the first surviving declaration, copy
   the full graph or invoke a new presentation sorter. Work must be bounded to complete supported
   direct incidence and existing authenticated coordinates, not an all-owner settings replay.

No new paged index, atlas, host-event implementation or replay facade is commissioned by this return.
A smallest follow-up should first settle those contracts and their bounded canonical seam. It should
not use sibling closure or a hot-range continuation implementation to manufacture a ready result.

### Finality and fail-closed requirements for any later reader

Before any order certificate, independently authenticate positive **and negative** contributor
support, structural order pages, original local source framing and the new host coordinate coverage.
At termination, **after the final await**, validate the same root selection/identity, every selected
head and exact source/physical observation, complete host capability including order currentness,
all source/host journal fences, captured policy and live demand. Even a known unrelated open impact
remains blocking under the current clean-host contract. Empty candidate/negative scopes still need
root/host/journal finality; empty output is not self-authenticating.

Missing/corrupt coordinates, missing original ranges, stale heads, wrong identities, unclosed negative
support, changed policy/demand, unsupported host owners or a hot/incomplete scope must return non-ready
**without an order prefix**. Bounded private work can be discarded, never published as a partial proof.
An older root remains valid only for its original capabilities: neither v2 nor v3 gains general order
readiness by being readable. A future additive derivative must preserve them and reject order demands
without original authority; source/body/graph/journal schemas and accepted certificates must not be
rewritten merely to attach an ordinal.

## Returned scope and validation

Only a new test module, its source-lane registration and documentation change. No `src/`, source/body
bytes, persistence format, certificate shape, policy route, UI/search surface or existing assertion/
timer changes. Test-only guards trap body IO/parsing, source/head/body writes, inventory and fallback
scans/rebuilds during cached work, including caught calls; readers/indexes/fixtures are retired.
Source frames and saved catalog envelopes in these portable fixtures are not real-IDB or native
MetadataCache evidence. No performance, device, complete-list or production-readiness result is claimed.

The offline run supplies **32/32** focused cases and **301/301** portable source tests on Node 22.16.0
with actual global TypeScript 5.8.3, not the required Node >=22.22.2 <23/installed-dependency acceptance
lane. Architecture/core type checks pass under that limitation; other failures and exact commands are
recorded in the [return ledger](../Refactor%20plan.md) and transient [handoff](../HANDOFF.md). All eight
existing real-browser suites fail at administratively blocked Chromium navigation, before IndexedDB
subcases. They are pending, not skips or passes; browser policy was not changed. Because no derivative
format is changed here, no new upgrade suite is added. Any later persisted coordinate requires genuine
Chromium v2/v3 coexistence, reopen/upgrade/abort/missing-page and no-source/body-rewrite validation.

Independent review must verify the unordered-pair birth premise, especially opposite hidden and
removed-first-host cases, and rerun the focused/source and repository acceptance lanes with required
Node/dependencies. The native selected scalar/alias MetadataCache completion and physical-revision
trace remains its separately configured disposable-vault prerequisite, not evidence supplied here.
No maintainer manual workflow is necessary for this uncalled tests/design return. Scalar/absence
reads, sibling order, hot continuation, changed-host S2b, complete visible lists, settings routing,
publication, SI5 and C15–C26 remain outside the assignment.
