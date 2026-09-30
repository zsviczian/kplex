# SI4 finite candidate raw-degree input

**Status (2026-09-30): bounded private implementation independently reviewed.** See the
[main-agent review](validation/settings-independent-indexing-si4-candidate-degrees-review-2026-09-30.md).
The offline-only evidence below is retained as an accurate account of the return environment.
This is an uncalled private input, not a sorted list, public read, incremental catalog or SI4 checkpoint. Read with the
[contributor contract](SOURCE_CONTRIBUTOR_DISCOVERY.md), [center-gate proof](SOURCE_CENTER_GATE_PROOF.md)
and [settings-independent design](INDEX_SETTINGS_INDEPENDENCE_DESIGN.md). SI4b1/SI4b2/SI4c/SI5 stay
open; C15–C26 remain paused. Native selected scalar/alias completion is a separate pending premise.

## Invariant and authority

Let C be a finite nonempty set of exact candidate references (NodeId, kind/state, explicit semantic
and physical facets), R one authenticated current contributor root with **no open source or host
journal ticket**, H the same clean current host, S one captured semantic policy, and D live demand.
For every c in C, a ready input must equal the raw `page.neighbours.size` of that candidate in a fresh
full `GraphBuilder.build` → `bindCompiledGraph` → `GraphIndex` under S and H. The supported legacy
binding requires exact materialization and path-injective, pathful identities. Invalid/pathless or
colliding covered graphs are unsupported; this reader neither repairs identity nor makes an invalid
full graph publishable. Counts are directed map cardinalities, not declarations, visible neighbors,
gate totals, sorted positions or top-N sizes. C is caller supplied; obtaining **every** candidate for
a later complete list is not this reader's job.

A ready result requires complete positive **and negative** candidate incidence, every selected
source head/revision/sequence, physical observation, R/H/S/D and journal freedom through the final
await. A missing candidate is not zero. No count prefix or compilation escapes failure. These are
internal same-H capabilities, not independently signed credentials or permission to publish later.
The read port must supply current canonical facts, never seed from an older published graph.

## Trace of the unchanged production semantics

`GraphBuilder.build` collects structure, then all host links, then consumes Markdown sources in
host inventory order (metadata, references, relations including Dates/body URLs), finalizes
structure, finishes the canonical compiler, and binds the result. `NormalizedGraphCompiler` and
`resolveEvidenceStoreCooperativeByKey` remain the only semantic engine. The binder maps exact node
IDs to pages, then uses the target's semantic path as each bound neighbor-map key. `legacyEvidence`
rejects incompatible resolver/path identities. Thus injective semantic paths preserve canonical
map sizes; deduplicating paths after counting IDs is not a substitute for this binding condition.

`GraphIndex.sortNeighbours` snapshots `connections: item.page.neighbours.size`. Hidden and
otherwise nonvisible entries remain included. Ascending/descending connections use that number,
then natural title comparison, then original encounter order. `neighbourCount` and gate counts are
different values. No sort or visibility policy belongs in the raw-degree input.

| Case | Canonical raw-map consequence; required coverage |
| --- | --- |
| Ordinary resolved/unresolved host links, inference/inverse inference | Canonical directed flags determine membership. Replay the original host-link facts under S; never infer counts from posting frequency. |
| Defined frontmatter, inline, previous/next and reciprocal declarations | Whole pair evidence is resolved together. Defined-role precedence suppresses conflicting inline ontology, including opposite-endpoint declarations. Duplicate assignments/declarations can change provenance but do not create multiple entries for the same target. |
| Hidden | A hidden entry still contributes to its declaring source's raw map. Hidden has no automatically synthesized reverse role: a canonically present unresolved target reached only by hidden evidence can have raw degree zero. |
| Image suppression | Canonical whole-owner image-only reconciliation can remove ordinary-link evidence for that owner's pair. A selected image field may therefore change raw size; neither counting neutral references nor replaying a prefix is sufficient. |
| File/folder, tag tree and tag membership | Include the structural facts touching either endpoint. Tag candidates conservatively select the entire admitted `tag-tree` family; ancestor IDs are canonical opaque IDs, not their semantic paths. |
| Body URL and origin | Include all owners posted to the exact URL/origin, including independent third-party support. Canonical origin dedup affects evidence, not an extra count per declaration. Meaningful label encounter order affects title, not this degree. |
| Dormant fields and Dates | Neutral original candidates and canonical host/Date resolutions retain possible incidence under S. Inactive references do not imply a materialized zero-degree node. |
| Zero, missing and collision | A canonically present node with an empty map is zero; an absent node fails `missing`. Pathless/NUL or duplicate semantic paths fail rather than emulate binder overwrites, even for hidden/noncandidate nodes in the bounded compilation. |

## Why the existing neutral cover suffices for this finite input

For c, let I(c) be the union of source and structural owners posted to its exact neutral node key;
for a tag, also include the existing conservative tag-tree family cover. Discover the single union
I(C), not the center/semantic-parent cover and not separate independently rooted requests.

Every canonical incident declaration comes from an owner of one of its endpoints or a structural
fact joining them. Neutral projection posts original resolved/unresolved candidates, dormant field
references, self identity, Date outputs, body URL targets and canonical origins; structure posts
both endpoints. Therefore every possible incident owner for each c is in I(C), including opposite
endpoint and unrelated third-party declarations. Whole-owner replay preserves duplicates and
owner-local suppression. Inverse evidence, defined-role precedence, pair suppression and raw map
membership are decided only by the existing compiler/resolver. Owners outside I(C) cannot add an
incident pair or change its classification under the same clean H and captured S. Conservative
extra owners can add unrelated pairs but cannot invalidate this incidence completeness argument.

Absence uses the same original bucket manifests, complete page commitments and original owner
summaries as presence. An empty lookup or a dropped page is not silently accepted as an empty
range. Missing/incomplete/corrupt source families also fail. Whole-owner replay and exact entity
seeding must actually materialize c before zero is permitted. Consequently the admitted candidate
maps contain precisely their full-build incident entries, and the path-injective binding check
makes their `.size` equal the full bound sizes. No second classifier, counter or path-count engine
is necessary. This is conditional on the existing complete-root/canonical-host contract, not a
replacement proof for the rejected changed-host observation experiment.

The center/parent relation cover has a different quantifier: it closes relations touching those
centers/parents and sibling witnesses, **not every candidate's unrelated incidence**. The new test
has a visible candidate whose own hidden relation and incoming `Outside.md` relation are absent
from that cover. Reusing its raw map undercounts despite correct center relations and gates.

### Count parity is weaker than encounter-order parity

A full-builder characterization has A declare Center as a child, B link to Center through the host
map, and A/B share title and degree. The full all-host-link phase inserts B before A; cached
per-owner replay inserts A before B. Fresh production `GraphIndex.neighbours` with connection sorting
therefore gives `[B, A]` versus `[A, B]`. Both raw degrees are correct. The test uses the production
binder and sorter on each compilation, not a recreated sort algorithm. Neither structural source
order nor v3 Markdown ordinal alone closes the all-host-link/per-source phase-order premise.
A future exact-list proof must separately preserve the full neighbor/witness encounter coordinate.

## Private implementation and budgets

`CachedRequestedCandidateDegreeReader.prepare` copies C and semantic settings before its first
await, discovers I(C) once, captures each exact SourceId once against the selected head, and invokes
`CachedSourceSemanticReader` once. The supplied structural stream is emitted once in canonical
catalog order, replacing owner supplements. Four original source-family visits per selected owner
are retained. Exact entity seeds compare NodeId, kind/state and both path facets; file facets must
agree with physical paths. SourceId never substitutes for NodeId or either path.

The private bounded compilation is inspected for legacy path injectivity and exact candidate
identity; the only count operation is the canonical map's `.size`. After the last possible path-scan
yield, discovery revalidates scope/selection identity, exact root, heads, journal and host. Source
observations, mutable policy token/currentness and demand are checked again after that await, plus
synchronous host currentness (also for zero-source covers). Any open ticket, **including a known
unrelated impact**, remains non-ready. There is no repair/rebuild/retry or implicit source acquisition.

| Request envelope | Limit / behavior |
| --- | --- |
| Exact candidate set | 1–32; duplicates/empty unsupported, overflow backpressured; no prefix |
| Policy expansion | At most 1,024 entries across hierarchy arrays/tag styles, 64 KiB charged UTF-16 field/selector strings; duplicates preserved |
| Discovery | Existing 256 source owners, 1,024 host facts, 256 total original bucket pages; 256 query keys / 256 KiB key bytes; 8 MiB charged decoded-page work |
| Canonical replay | Existing 256 sources / 1,024 structure facts, 32 MiB aggregate estimated normalized-record bytes; existing per-family framing/decode limits |
| Private graph/output admission | At most 8,192 compiled nodes; at most 4,096 aggregate candidate neighbor entries (a pair counts once for each requested endpoint); 32,768 entity-port reads |
| Identity bookkeeping | 1 MiB request JSON and separately 1 MiB accumulated node ID/semantic/physical strings, charged as UTF-16; cooperative path scan |

Canonical replay already yields and supports cancellation. Local graph limits are checked after its
bounded compilation; they are not an early-stop claim for every intermediate allocation or a mobile
latency/heap measurement. Work can include whole-owner overcoverage and hash-bucket amplification.
There is no retained graph on the reader, queued continuation, all-vault fallback or second published
graph. `work` reports source replays/family visits, compiled nodes, candidate entries and entity reads.
A ready result contains only detached `{id, rawDegree}` inputs in caller order, work accounting, and a
separate `complete-candidate-raw-degrees` certificate carrying C, policy revision and the contributor
proof. Caller order is **not** a claimed graph encounter order.

## Compatibility, evidence and remaining review

No production storage, summary projection, journal, source codec, body format or activation logic
changes. V2 and v3 already contain the complete neutral incidence used here; v3's additional Markdown
coordinate remains exclusively URL-title authority. No new degree posting, schema, migration,
per-owner write or settings-time inventory is justified. Existing abort/upgrade/corruption suites
must continue to run. The new browser suite additionally defines 13 real-IDB subcases: v2/v3 parity
and same-host storage reopen, missing/checksum pages and selected source-chunk loss, and eight final
root/head/journal/policy/demand/host fences. Deliberate fault writes occur only in tests.

Portable evidence: **41 new tests; source suite 269/269**, zero skips, on Node 22.16.0 using actual
TypeScript 5.8.3 and explicit memory/saved-envelope doubles. Full-count expectations use fresh full
GraphBuilder/GraphIndex per semantic policy; opaque-identity and storage-admission tests separately
exercise the capability boundary. Source/head/body-write, read/parse/inventory/rebuild guards count
caught violations and assert reader retirement. Architecture 7/7 and strict portable dependency-tree
type checking pass. These do not replace required-runtime or real dependency validation.

Actual Chromium 144 navigation fails `ERR_BLOCKED_BY_ADMINISTRATOR` before any subcase in all eight
browser suites. The new durable cases are **pending**, not passing. Core runtime has 36 pass/3 fail
(two missing-esbuild imports and an unchanged normalized-source fixture assertion); lint/build and
aggregate verify are not green in that offline environment. See the dated offline return in
`Refactor plan.md` for its commands and limits.
No existing golden, timer, browser policy or production behavior was weakened. Required Node,
dependencies, real Chromium and full `verify` subsequently passed in the main-agent review.
No native consumer is added; no maintainer manual workflow applies to this private input.

Selected scalar/alias completion, stable full encounter order, hot-range continuation, whole visible
lists, changed-host S2b, publication and routing remain separate. The source-bound native metadata
trace still requires an explicitly selected disposable Obsidian vault; this return does not infer it
from host doubles or authorize a scalar/absence reader.
