# SI4 private center gates and the remaining visible-list premise

Status: bounded private implementation reviewed, not SI4 acceptance or public routing.
This extends the [settings-independent design](INDEX_SETTINGS_INDEPENDENCE_DESIGN.md) and the
[private relation cover](SOURCE_CONTRIBUTOR_DISCOVERY.md). C15–C26 remain paused.

The subsequent [selected-title proof](SOURCE_SELECTED_TITLE_PROOF.md) returns a missing-contract
result, not a new reader: live selected scalar/absence inputs lack a source-bound completion
observation, and even complete URL support can replay in a different order from the full builder.
These title limitations do not widen or change the accepted center-gate certificate.

The subsequent [finite candidate-degree input](SOURCE_CANDIDATE_DEGREE_PROOF.md) is a **reviewed private
slice** for the small union that fits current complete-incidence bounds. It does not change
the gate certificate or recover missing full-builder tie order. The URL-specific title premise was
separately closed by the [reviewed URL input](SOURCE_URL_TITLE_PROOF.md), not by a scalar/alias reader.

## Before-code invariant

For **one exact requested center ID**, let R be the authenticated, current, journal-free contributor
root, H its clean host observation, S one captured semantic policy, V one captured visibility policy,
and D the still-live demand. A successful center-gate preparation must equal `GraphIndex.gateStats`
on an independently full-compiled, full-bound graph under S and V, **before** top-N, lenses, section
expansion, optimistic edits or scene filtering. Each gate's `hasAny` includes non-hidden semantic
relations to hidden targets and inferred relations even when inferred nodes are hidden. Each
`visibleCount` counts unique **semantic target paths**, not declarations, IDs or rendered cards.

All center relations must be complete, not a prefix. Required physical entity facts must be current,
exact-ID facts from H; an absent fact is not a virtual file. A missing compiled center is not proof of
an absent graph entity, so the gate request must fail rather than return four zeros. R, all selected
heads, H, the empty journal, S, V and D must survive the final awaited revalidation. No partial counts
or compilation escape a failure. Nothing is published, acquired or repaired by this request.

This invariant deliberately does **not** promise the sorted `getNeighborhood` lists. Those require
the additional contracts below. Gate counting needs neither candidate titles nor candidate degrees.

## Existing input and consumer inventory

The named methods below remain unchanged in `src/index/GraphIndex.ts`.

| Owner/read | Exact inputs and behavior | Existing consumers |
| --- | --- | --- |
| `getNeighborhood(path)` | `get` has exact-path then lowercase-path fallback; the private request instead uses an exact ID. An existing center is returned even when its own visibility filter is false. Uses six sorted `neighbours` role lists, `maxItemCount` and `renderSiblings`. Parents/children are individually truncated. Left then previous and right then next are concatenated **after per-role sorting**, then truncated; there is no merged re-sort. | `PlexGraph` memo keyed by index, active path and render revision; `SectionExpansion` reads current siblings during initial and cached reprojection. |
| `relationView(page)` | Full `page.neighbours` insertion order, hidden flag, canonical classifier under `inferAllLinksAsFriends`, current target visibility and `showInferredNodes`; role-specific type definitions and direction. Counts paths per physical gate and across gates; sorts each of six role arrays. Caches by page plus its existing view signature; full-policy oracle instances must not reuse stale caches. | `neighbours`, `gateStats`, `neighbourCount`. |
| `gateStats(page)` | The above four **pre-top-N** gate counts and fills. `hasAny` precedes all target/inferred visibility filtering. `left` combines left/previous paths and `right` combines right/next paths. Hidden relations contribute neither fill nor count. | `layout.makeNode` for every displayed noncenter and `buildScene` for the center. Not sufficient to certify all rendered nodes' gates. |
| `gateNeighbourPaths(page, gate)` | Non-hidden, classified semantic relationships; ignores node-kind, excluded-path and inferred-visibility filters. Deduplicates target paths across the gate's roles. This is not a visible count. | `main.ts` relationship creation validation; `RelationModal` blocked-target selection; `PlexGraph` connection dragging. No editing permission is granted by this work. |
| `isVisiblePage(page)` | `excludeFilepaths` prefix comparison against the explicit semantic path; file presence/extension; folder/tag flags; URL truthiness. A virtual page is fileless, non-folder, non-tag and URL-less. Virtual pages are subject to **both** `showVirtualNodes` and `showPageNodes`. Attachments use physical extension `!== "md"`; URL visibility is separate. | `relationView`, `visibleRelationshipsWithin`, search, and `SectionExpansion`. |
| `sortNeighbours(items)` | Stable natural `Intl.Collator(undefined, {numeric:true, sensitivity:"base"})` title ordering/ties. Eight modes: name asc/desc, modified asc/desc, created asc/desc, connections asc/desc, plus the switch's no-primary fallback for an unknown value. Modified uses file mtime then page mtime then zero; created uses file ctime then zero. Connections uses **raw neighbour-map size**, including hidden/nonvisible relationships, not `neighbourCount` or evidence multiplicity. Every recognized mode uses title as tie-breaker, then original input order. | `relationView`, final sibling sorting, and `SectionExpansion`. |
| `titleFor` | Prepared presentation policy, `renderAlias`, ordered `nameFields`, aliases and base name. Configured fields read MetadataCache only, normalize keys, skip `position`, use first matching key and recursively first nonempty string in arrays. `alias`/`aliases` use the canonical alias list. Non-string values are not titles. Legacy `nodeTitleScript` is retained in cache keys but never executed. Tag names depend on `showFullTagName`; URL base names may depend on third-party first meaningful labels. | Sorting; layout labels/size; search and numerous native/UI labels. |

`neighbours` additionally supplies `ContentPane`, `PlexFilter` suggestions, the descendant menu in
`PlexGraph`, and layout child expansion/spacing. `neighbourCount` is used by layout for each node.

### Siblings are not the entire semantic parent frontier

The authenticated neighborhood reader closes **all semantic parents**, without target visibility,
inferred filtering, sorting or top-N. `getNeighborhood` instead enumerates only the displayed,
sorted, top-N parents, and each such parent's entire visible sorted child list. Its occupied set is
only the center and the **displayed top-N** direct lists, not all semantic neighbors. A direct target
omitted by top-N can therefore reappear as a sibling. Siblings are keyed by target **path**; later
witnesses replace direction/definition/page while any defined witness upgrades the relation type.
Only after this merge does final sibling sorting/top-N run. An authenticated parent range with no
other child is a genuine negative; an unread parent range is not.

### `PlexGraph` is broader than this invariant

`PlexGraph` can replace the persistent neighborhood with cached section projection and optimistic
relinking, then apply predicate/lens reflow, layout, zone filtering and shown counts. Layout reads
gates/titles/counts for **all** displayed pages, expanded children, sibling witness links and
`visibleRelationshipsWithin` cross-links. Later shown-count overlays do not redefine the four
`GraphIndex` totals. Visual metadata resolution, central editors, explanations, predicates, search,
edit eligibility, those other nodes' gates, all cross-links and publication are outside this slice.

## What the present contracts do and do not close

The clean root's complete center/semantic-parent incidence is sufficient for canonical role
classification, suppressed/hidden decisions and complete sibling **witness relations**. The exact-ID
`SourcePatchReadPort` already supplied to the private reader must observe the same clean H (not an
old published graph from another host revision). Additional bounded reads of its physical entity
facts supply file existence/extension for the center and every non-hidden, classified target. No
Markdown, arbitrary properties, alias selection or degree is needed for center gate counts.
Synthetic tag/URL/unresolved materialization comes from the canonical current-policy compilation,
not a stale node cache. Duplicate declarations and same-target role contributions are resolved by
the canonical compiler; counts deduplicate semantic paths. Distinct IDs colliding on a center or
incident target path are **unsupported**, including hidden collisions: the legacy binder keys
neighbors by path and could replace an earlier relation, so counting an ID map and deduplicating
only its totals would not prove parity. This is not an identity-alias resolution capability. Missing physical facts fail closed; pathless graphs are unsupported for this
legacy path-count contract. Root/journal/host failures still invalidate the entire preparation.

The full visible lists are **not certified** by the current contracts:

1. **Exact target presentation inputs.** `SourceEntityFact` contains identity/name/file facts, not
   the target's complete aliases or selected non-reference title-property values. Replaying a source
   because it points at B does not replay B's own metadata. `SourcePatchReadPort.entity` returning
   `undefined` also has no authoritative metadata-negative meaning. A target with a dormant scalar
   `Display: ...` may change sort order while center/parent relation facts stay identical. A URL's
   base label may have an earlier third-party owner outside the selected center/parent cover.
2. **Complete candidate degrees.** A candidate's `neighbours.size` in the over-cover compilation
   may omit third-party relations not touching the center or its semantic parents. Counting that
   partial map is not connection-count sorting, even when every displayed center edge is correct.
   Degree ties still need titles and stable encounter order. Querying a candidate's complete
   incidence is possible individually, but is not part of the current two-pass certificate. The
   separate finite-union degree reader has been reviewed; it does not widen this certificate.
3. **Bounded continuation.** Before top-N one needs every visibility/sort candidate, and for sibling
   sorting every child of the selected displayed parents. The catalog caps combined endpoints at
   32, owners at 256, host facts at 1024, query pages at 256 and decoded scope bytes at 32 MiB.
   There is no resumable, root-pinned candidate-degree/metadata continuation. A hot range must stay
   pending/backpressured; neither the first 32 targets nor the first N displayed parents can stand
   in for a complete input to sorting/totals.

### Remaining authenticated contracts (not implemented by the gate reader)

A finite exact-ID **selected presentation read** should return an explicit ready/pending/unsupported
result, immutable canonical title inputs (including complete alias and first-match selected-field
absence/type information, or a canonical already-selected title) and canonical synthetic base-name
support/order. Reuse the already available same-H exact-ID physical time facets, not another time store. It must carry the exact source-head/host/root and
presentation revision it observed, plus a final currentness check. It must use only selected metadata
and authenticated neutral facts; do not persist a generic frontmatter mirror or infer missing as
empty. Reuse the existing title selection semantics rather than introducing another title engine.

The reviewed finite-degree input closes only an admitted small union. A larger
**candidate-incidence/degree continuation** must bind the exact candidate set to one R/H/S,
authenticate every positive **and negative** completed range, use canonical raw maps with valid
legacy binding (not filtered roles), and stay pending until all ranges finish. Original full-builder
encounter order requires a separate proof even when every raw degree is complete.
Chunked reads must retain the same root/selected-head/journal/host/demand proof across chunks. It may
stream/discard candidate compilations and keep bounded keys; it must not retain another full graph,
scan every source owner, silently switch roots or cap the candidate set before comparison. When the
union fits today's bounds, existing direct contributor discovery can supply the incidence; larger
ranges need an explicit continuation before claiming top-N exactness.

These are separate from changed-host impact. S2b is not revived; a changed host remains UNKNOWN.


## Returned private implementation

`CachedRequestedNeighborhoodReader.prepareCenterGates` captures visibility flags/excluded prefixes
and a separate presentation revision before its first await. It shares the original, at-most-two-pass
semantic closure and every captured source host callback with the unchanged relation-only method.
It intentionally retains the complete semantic-parent cover rather than adding another optimized
center-only discovery path. Thus a hot parent range can still backpressure this smaller gate request.

`CachedCenterGateProjection` reads each required physical identity at most once, checks explicit
source/entity identity, kind, materialization, semantic/physical/file paths and the actual extension,
and retains only small visibility facts. Synthetic visibility comes from canonical nodes. It calls
`classifyRelation` for all six roles, never resolves ontology independently, never sorts or applies
top-N, and counts unique target paths per gate. A hidden center still owns gates; a missing compiled
center fails. An actual empty root container can prove four zeros. Pathless or colliding identity
scopes fail closed instead of emulating a legacy binding that is not proved.

Additional admission limits are 4,096 incident relations, 1 MiB of estimated unique center/incident
path storage, 256 excluded prefixes and 64 KiB of estimated prefix storage (two bytes per UTF-16 code
unit for these string budgets). Paths of hidden relations are included in collision/budget checks.
These supplement, not replace, existing contributor, replay and parent limits. The relation loop
checks demand and yields through the injected runtime even for hidden/non-parent relations. There
is no retained work queue or partial-ready result. Reported gate work counts all visited incident
relations and actual physical entity calls, including a physical center.

Projection runs **before** the final awaited contributor revalidation. Root generation/digest,
selected source heads/sequences, all journal masks, clean host, captured source-host callbacks,
semantic policy, presentation policy and demand must still be current after that await. No sorted
lists, other-node gates, edit eligibility or publication escape. A separate `complete-center-gates`
certificate names the presentation revision and embeds the unchanged relation certificate, whose
`gateTotals` remains `not-certified`; `visibleLists` is explicitly `not-certified`. The old `prepare`
method and every existing production consumer remain unmodified in behavior.

## Evidence and review boundary

The added gate cases in `tests/source-requested-neighborhood-portable.test.mjs` use independently
full-collected canonical compilations. `requestedCenterGateFixture.mjs` binds those with the actual
production `GraphBuilder` into a fresh actual `GraphIndex`; it does not implement a substitute
visibility/sort/count oracle. Host file lookup is doubled, and each index is destroyed. Comparisons
check both the independent full semantic neighborhood and every full GraphIndex center gate.

Cases cover dormant role/image policies, inferred/hidden conflicts, third-party tag/URL origins,
no-other-child and empty-center negatives, every visibility flag, prefixes, all eight sort modes,
top-N independence, duplicate declarations, physical center **and target** failures, missing/hot
ranges, count/path/prefix caps, cancellation while yielding and final awaited source/root/journal/
host/policy/demand mutations. Characterization cases demonstrate displayed-parent versus semantic
frontiers, top-N-omitted direct children reappearing as siblings, and left/previous concatenation.
Full versus under-covered actual GraphIndex views exhibit missing target aliases, arbitrary scalar
titles and candidate degrees. Valid cached runs guard against Markdown reads/parses, source-head
writes, source acquisition, full host collection and cold/full source builds.

The real IndexedDB suite adds 15 browser subcases using the same full-oracle functions, actual
repository operations for journal faults and separately compared gate values (object insertion
order is not semantic equality). The offline environment blocked Chromium before assertions.
Main-agent review on Node 22.22.3 with real dependencies passes source 151/151 and all six real
Chromium suites 111/111 when run serially, including those 15 cases. Architecture 7/7, core 60/60,
Obsidian lint and production build pass. Full `verify` still fails the unchanged strict URL-heavy
timer at 59.7 ms against 50 ms. See [the review](validation/settings-independent-indexing-si4-center-gates-review-2026-09-30.md).
No SI4b1/SI4b2/SI4c/SI5 checkpoint, changed-host certification, live settings path or native user test
is claimed. C15–C26 remain paused.
