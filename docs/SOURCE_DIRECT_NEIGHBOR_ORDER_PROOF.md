# SI4 direct-neighbor encounter order — bounded v4 input return

**Status (2026-09-30): reviewed private input; SI4b1 remains open.** The
previously reviewed pair-birth characterization is now backed by a bounded contributor-catalog v4
coordinate and an uncalled private direct-order preparer. Portable tests can exercise that preparer
only by injecting an explicit test host-order-validity capability. Production supplies no such
capability yet, so the production path remains non-ready without an order prefix. The accepted
finite raw-degree, URL-name and relation/gate certificates keep their existing scope. No
settings/UI/public route is added; SI4b1/SI4b2/SI4c/SI5 remain open and C15–C26 remain paused.

## Question and answer

For **one exact center** and one finite, complete direct-neighbor candidate set, what original order
must survive so that equal-key ties agree with a fresh full GraphBuilder/GraphIndex?

It is the **first emitted declaration of each unordered pair**, before final suppression, restricted
to pairs that eventually produce the center's directed relation. It is not the first surviving,
active, winning or center-forward declaration. Configured-field reconciliation sorts declarations
*inside* a pair; it does not reorder the pair map. Filtering removes entries, and GraphIndex's stable
fallback preserves their remaining order.

V2/v3 source/catalog contracts do not encode the full host maps' cross-owner enumeration. Two
independently acquired clean inputs can have identical original source payloads, structural facts
and v3 Markdown ordinals, yet produce different full direct tie orders. Contributor catalog v4 now
adds that missing acquisition coordinate in bounded authenticated pages. What remains missing for a
production ready result is a native authority that proves the same host ordering is still current
after the last await. A settings-time host/inventory scan, cached-graph copy or deterministic
substitute sort remains outside the contract.

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

## Which coordinates now participate?

[SourceReplay](../src/index/SourceReplay.ts) still validates the complete stored owner frame. Its
private SI4 phase projection can emit only resolved host, unresolved host, or Markdown-phase records
while retaining the existing decoder/finality checks. [CachedRequestedDirectOrder](../src/index/CachedRequestedDirectOrder.ts)
uses that seam only for the finite selected source set; it does not replay every host-map owner.

| Authority | What it now supplies | Boundary |
| --- | --- | --- |
| Original catalog structural fact `order` | Exact file-tree/tag structural emission sequence, including canonical tag expansion/deduplication | Structural order is independent of host-map and Markdown owner order. |
| Original framed source-family order | Within-owner host target enumeration, selected neutral value/target sequence and original ordinals, Dates and body URLs | It does not identify where the owner appeared in either whole host map. |
| V3+ authenticated `markdownOrdinal` | Per-file Markdown-phase owner order, combined with existing local record identities | V2 cannot authorize this coordinate; it does not encode host owner order. |
| V4 `hostLinkOwnerOrder` pages | Complete resolved and unresolved outer-owner permutations, including empty and non-Markdown owners, with independent compact root commitments | This is an acquisition coordinate, not native proof that host order is still current later. Unsupported non-Markdown owners make direct-order preparation non-ready. |
| Selected heads, source revisions, semantic/physical refs and host capability | Exact selected source incarnation/content and existing lifetime fences | A nonce/revision is not by itself evidence that outer-map order cannot change invisibly. |

The private reader combines these coordinates as **structure → all selected resolved-host owners in
original host order → all selected unresolved-host owners in original host order → all selected
Markdown owners in original Markdown order**. Local record order remains owned by the existing
replay/compiler. SourceId denotes ownership; NodeId denotes exact semantic identity; physical path
selects the host file incarnation. None is repurposed as an ordinal.

Within one owner, the original body-URL sequence still orders canonical URL-origin child emissions;
the body parser's duplicate policy remains authoritative. No URL-title ordinal, source head sequence,
path sort or structural traversal order is promoted into a host-order substitute.

### Executable counterexamples

The [portable suite](../tests/source-direct-neighbor-order.test.mjs) uses fresh, independently
owned full GraphBuilder/GraphIndex instances. V2/v3 cases remain counterexamples. Every v4 case also
runs the private direct-order preparer with an explicit **test-only** host-validity capability, then
binds its canonical compilation through the existing GraphIndex and compares both raw direct-map
order and all equal-key visible role lists to the fresh full oracle. The ordinary requested-neighborhood
reader remains a control for its narrower relation/gate contract.

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
* Under v4, the bounded preparer reproduces the fresh full raw direct-neighbor order and every
  equal-key visible role list across all eight sort modes plus the hidden/suppressed/duplicate/
  reciprocal/field/image/inference/Date/body/URL-origin cases. A relation-free center is a ready
  negative under the test capability without inventing a source-order prefix. Without that explicit
  host-validity capability, the production reader returns `host-catalog-stale` before discovery or
  preparation and exposes neither a certificate nor ordered prefix.

Additional cases cover duplicate/reciprocal declarations, both directed perspectives, all four
inference-policy combinations, field reconciliation, inactive inline evidence, directed hidden
support, image-only removal with surviving/deleted pairs, inferred visibility and dormant activation.
The test with the actual full host collector changes only its outer-map order while holding the
fixture revision fixed: terminal `finalize()` rejects, and a fresh collector sees the new sequence.
That proves the collector's order-sensitive digest behavior, **not** a native MetadataCache event
sequence, atomicity guarantee or an existing persistent order observation.

## Returned implementation — bounded v4 coordinate and private canonical preparation

### Acquisition and storage

The production [ObsidianHostLinkSourceCollector](../src/adapters/obsidian/hostLinkSourceCollector.ts)
remains the only owner-order oracle. Ordinary whole-map collection and source-scoped reads do **not**
allocate owner-order arrays. Only explicit contributor-catalog acquisition calls `captureOwnerOrder()`.
That capture walks actual JavaScript own-property order for the complete resolved map and then the
complete unresolved map, records empty owners before target iteration, keeps non-Markdown owners,
and performs a terminal second scan under the same source-revision/currentness fence. Any digest
change, cancellation, malformed occurrence count or capture-budget failure returns no coordinate.
The transient capture is capped at 100,000 owners combined and an exact 8 MiB UTF-8 JSON owner-path
budget; it is never truncated.

Contributor catalog v4 persists the two complete permutations as `host-order` logical rows, up to
256 owners per row, plus one deterministic `host-order-rank` row per owner. Every logical page has a
domain-separated Merkle leaf/proof; the compact root stores only the per-family Merkle root, page/
owner/byte counts and unsupported-owner count. Existing physical dependency-page commitments still
authenticate each rank/page bucket and negative lookup. Empty families are explicit all-zero
manifests. Strict decoding rejects malformed page/rank coordinates, duplicate exact selected rows and
bad Merkle paths. Rebuild activation remains the existing atomic dependency-build boundary, so stale,
failed, aborted or over-budget work never replaces the prior accepted root. V2/v3 roots remain readable
for their previously accepted capabilities and genuine downgrade fixtures strip both v4 root fields
and both v4-only row kinds.

The executable scale case persists **20,000 resolved plus 20,000 unresolved owners**, reconstructs
both full permutations from logical pages, verifies 40,000 durable rank rows, and keeps the active v4
root below the existing 1 MiB limit. Its selected-owner white-box check resolves one rank and one
logical page while reading strictly fewer physical pages than the 79-page resolved coordinate. No
limit increase, path truncation, settings-time live host scan or settings-time full-coordinate
reconstruction is used.

### Private direct-order preparation

`SourceContributorDiscovery.discoverDirectOrder()` requires the same explicit host-order-validity
capability before it reads or exposes any order coordinate. Under that capability it first obtains
the existing complete direct contributor/negative certificate and binds it to the same v4 root/build.
For each selected source path it reads only the exact resolved/unresolved rank keys, authenticates only
the referenced logical pages against the v4 Merkle roots, and derives the selected host permutations.
Selected sources with no rank are returned in an explicit per-phase negative set. The private caller
must replay those sources for that host phase and prove they emit **zero** host-link records; a missing
selected rank therefore cannot silently drop real host evidence. Markdown order still comes from the
existing authenticated ordinal coordinate. The method conservatively returns `dependency-pending` if
any complete host-family coordinate contains a non-Markdown owner because there is no canonical
persisted source replay for that owner. Query work is finite selected-rank/page work; it neither scans
the live host maps, reconstructs the whole persisted permutation nor replays unselected source owners.

The uncalled `CachedRequestedDirectOrderReader` captures each exact selected source incarnation, adds
only identity-seeding entity facts needed for dormant owners, then feeds the **existing canonical
compiler** in full-builder phase order: authenticated structural facts, selected resolved-host owner
records, selected unresolved-host owner records, then each selected source's Markdown families in
authenticated Markdown order. Phase projection changes emission only; SourceReplay still validates the
complete stored frame. `NormalizedSourceScopePreparer` supplies extra ordered phase reads to the same
accepted compiler rather than implementing another classifier, evidence store, resolver or sorter.
There is no sibling closure, graph copy, public route or all-owner source replay. Existing memory/read
bounds fail closed without publishing partial order.

After compilation the reader compares replayed selected stamps to the discovered stamps, awaits the
existing contributor revalidation, then performs a final **non-awaited** currentness fence. A test can
inject `CachedDirectOrderHostValidity` to exercise the algorithm. Production has no implementation of
that authority, so the constructor without it immediately returns non-ready `host-catalog-stale`.

### Precise remaining native host contract

Before this private input can become a production-ready ordered certificate, native/online evidence
must justify a host-order validity capability with all of these properties:

1. It covers the complete own-property owner permutation of both `MetadataCache.resolvedLinks` and
   `MetadataCache.unresolvedLinks`, including owner insertion/deletion/reordering, empty owners and
   non-Markdown owners, plus owner-local target/count changes relevant to the collector digest.
2. The acquisition fence and event/revision/currentness mechanism guarantee that the v4 coordinate
   came from one coherent host observation and that any later change capable of altering those two
   permutations or their local host-link records invalidates the capability **synchronously enough
   that the final non-awaited check cannot return ready on stale order**.
3. The authority remains valid through the final publication fence without a query-time enumeration
   of the whole live host map. If Obsidian does not expose such a contract, production direct-order
   readiness must remain unavailable rather than inferred from source-head equality or a plausible
   event pattern.

This is separate from the still-pending native selected scalar/alias MetadataCache completion and
physical-revision evidence. The portable test capability is not evidence for either native contract.

### Finality and fail-closed behavior

Missing/corrupt/duplicate/truncated/out-of-order v4 coordinate rows, wrong root/build/head, stale
selected sources, unsupported owners, policy/demand supersession, cancellation or host-currentness
failure return non-ready **without an order prefix**. Empty/negative direct scopes still require the
same authenticated root/host finality. The previous accepted root remains usable after aborted rebuilds.
Older v2/v3 roots retain relation/URL-title/degree behavior at their accepted versions but cannot
authorize v4 direct order.

## Returned scope and validation

This is an offline return, not acceptance. Portable evidence on Node **22.16.0** (below the required
>=22.22.2 lane) is: focused direct-order **34/34**, contributor-catalog **9/9**, host-link collector
**1/1**, and full portable source **304/304**. With the actually installed global TypeScript 5.8.3
exposed temporarily at the local package path, architecture is **7/7** with 60 migrated roots, 113
reachable files and 0 violations. Targeted full-project diagnostics for the changed SI4 files show no
internal errors; the only changed-file diagnostic is the absent local `obsidian` package. The core
TypeScript compile stage also completes.

Real Chromium/IndexedDB cases were added for v4 write/reopen, empty coordinates, legacy v2/v3
downgrade, missing/corrupt/duplicate/truncated/out-of-order coordinate data, wrong root/build/head,
transaction abort before activation, previous-root preservation and unchanged source/body stores.
This environment blocks Chromium navigation with `net::ERR_BLOCKED_BY_ADMINISTRATOR`, so all eight
browser-suite bootstraps fail before IndexedDB assertions execute; they are pending, not passes.
The normal `verify` command stops at architecture because the ZIP has no local `typescript`; the
architecture command itself passes when temporarily pointed at the installed global TypeScript.
`check:core` runtime is **36 pass/3 fail**: two missing-`esbuild` suite imports plus one unrelated
normalized-source assertion reproduced **6 pass/1 fail** from the untouched input. `npm test` is
**77 pass/7 fail** for the same missing local `esbuild`/`typescript` causes plus that baseline
assertion. Obsidian lint has no local `eslint`; production build lacks local Obsidian/React dependency
types. Exact commands and reviewer instructions are in [HANDOFF.md](../HANDOFF.md).

Independent review must rerun the required Node/dependency/browser/build lanes, inspect the v4 fault
matrix and legacy compatibility, and capture the native host-order/currentness contract above before
any production order route is considered. No native Obsidian claim, SI4 checkpoint acceptance,
settings/public routing, hot continuation, changed-host S2b, sibling ordering, SI5 or C15–C26 work is
part of this return.
