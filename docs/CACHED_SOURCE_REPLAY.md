# SI4a cached-source replay — Accepted

SI4a prepares private **source-owned** semantics. It does not change GraphIndex settings dispatch,
live publication, snapshot compatibility, search membership or UI reads. The optional private pair
composition described below is returned for review, not covered by the earlier SI4a acceptance. SI4b1 discovery retains a rejected lifecycle; its C2-S1 owner-summary prerequisite is accepted as an isolated slice. SI4b2 publication, SI4c consumers and SI5 remain pending.

## Investigation before implementation

| SI3 family / fact | Normalized input and limitations |
| --- | --- |
| values: reference-value / reference-payload / reference-candidate | Physical value identity, shared explanation payload, original lexical target and finality. Join reference-resolution by exact value ID/ordinal, then deduplicate by host-selected NodeId exactly as the reference collector does. Null resolutions do not open normalized value frames. Never rescan payload text. |
| values: inline-value / inline-payload | Plain physical/map inline values. The canonical SourceBodyDecoder reconstructs finite cached parser inputs for presentation selectors and exact inline field-name coordinates; no Markdown parser is called. |
| body-urls: body-url | Existing URL/label/line observation; reuse the metadata adapter's URL normalization, including malformed URL and origin behavior. |
| metadata: alias / tag / field-name | Alias/tag metadata and name-only discovery. Inline discovery coordinates come from physical value headers. |
| metadata: file-parent | A path, not a container entity/topology snapshot. It cannot recreate a folder's children or its exact entity ID. |
| metadata: host-literal | Genuine link/embed spellings and locations; dependency input only, not an additional semantic declaration. |
| resolution: reference-resolution | Exact target/null and aggregate host count for each stored lexical candidate. A target is not a materialized entity fact. |
| resolution: literal-resolution | Host binding of a genuine metadata literal; dependency input only, not a second body-link declaration. |
| resolution: host-link | Resolved/unresolved aggregate target/count; reuse host-link normalization, never infer a lexical spelling or location. |
| resolution: date-property | Already normalized Daily Notes target and genuine field/raw-value provenance; no Date grammar is rerun. |

Storage does **not** contain full entity/file facets, folder topology, the exact getAllTags structural
input (merged semantic tags are not interchangeable), arbitrary non-reference frontmatter values,
or current note-type/primary-tag selector results. A narrow, revision-fenced host supplement
provides these from current in-memory host facts and cached inline inputs. Missing metadata is pending,
not an empty source. No App, TFile, plugin or GraphState enters portable code.

## Selection, evidence and the v5 query gap

`readSelected()` selects one head and all family revisions atomically with persistent leases. Independent visits
would permit mixing heads; replay therefore uses a single multi-family read lifetime. Expected source
revision/durable sequence, exact physical incarnation/stats and host epoch/revision/environment are
independent of semantic policy. A new policy may read the same head. An observed source/host change,
head replacement, cancellation or policy supersession rejects private preparation. Unsaved payloads
mask disk heads; evicted unsaved payloads must mask posting queries too. Family hashes/counts/finality
and regenerated postings are checked before any result is returned.

ReferencePolicySelector, NormalizedGraphCompiler, NormalizedSourcePatchPreparer and the canonical
evidence/resolver remain the sole semantic owners. Frontmatter overrides a conflicting inline role
from the same declaring endpoint, not evidence declared by the opposite endpoint. Inverse perspectives
are resolver reads, not extra persisted declarations. A changed field can therefore change a pair
whose other endpoint is the requested center.

Field postings discover declaring source owners; target/literal postings discover incoming owners;
explicitly include both physical endpoint owners and union/deduplicate them before replay. Replaying a
dense owner once per pair is forbidden. A scope may compile several deduplicated owners together so
all their competing declarations are resolved by the full compiler, but its coverage remains exactly
those owners, not the whole graph.

**v5 cannot prove bounded exact pair completeness.** It has no pair index, structural tag/folder
postings, body-URL/origin referrer postings, or authenticated lookup-completeness manifest. A removed
lookup row can hide its owner before that owner's family is validated. Family postings are a broad
fallback, not bounded pair discovery, and themselves cannot prove absence under corruption. URL-origin
and tag-ancestor contributions can be owned by third-party documents; incoming unresolved literals can
differ from a resolved ID. Candidate query success therefore never certifies a complete neighborhood,
gate count, absence of a relationship, or edit eligibility. SI4b needs an independently reviewed index
and real-browser migration/integrity evidence; SI4a changes no schema.

## Clean-host requested-pair composition — review only

`CachedRequestedPairReader` composes the complete-direct certificate from contributor discovery
with cached preparation for exactly two distinct endpoint identities. It pins each selected head's
revision/sequence, captures each owner once, feeds the certificate's ordered structural stream once,
and finally revalidates the certificate plus policy, demand and host currentness. The full coverage
and pair-local finality argument is in [the contributor-discovery contract](SOURCE_CONTRIBUTOR_DISCOVERY.md).
A ready result is explicitly `complete-pair`, not a complete graph, neighborhood, gate or search read.
There is no production caller or publication callback; all exposed readers remain unchanged.

The additive fifth argument to `CachedSourceSemanticReader.prepare()` is an explicit canonical
structural stream, not a completeness token. Omitted structure preserves the accepted SI4a behavior,
including rejection of an empty owner request. Supplied structure replaces every per-owner structural
supplement: the first replay emits that stream once, without changing any record's original source
or contribution ownership. Subsequent owners still replay their four selected families once each.
This avoids duplicating genuine tag memberships. It never scans a host inventory to fill the stream.

Only this explicit mode permits zero owners. A structural-only/empty cover uses the same canonical
compiler, exact-ID canonical entity seeding and a finalized (possibly empty) read. It creates no dummy
source. Structural inputs are bounded at 1,024 records and share the 32 MiB scope estimate; selected
owners retain the 256-owner bound. Missing materialized entity facts and incorrect IDs fail closed.
The requested-pair wrapper, not this generic reader, authenticates an empty cover against the complete
root/negative pages and all journal masks. `isHostCurrent()` closes the final synchronous host fence
even when there are no source host callbacks; it does not replace asynchronous root validation.

Portable parity/fence tests pass using a declared catalog-coordinate fixture and real memory-source
replay. The main agent subsequently ran the real IndexedDB pair tests against the isolated clean base;
see [the isolation review](validation/settings-independent-indexing-si4-isolation-2026-09-30.md).
No SI4b1/b2/c acceptance, changed-host BREF-1 certification or SI5 performance claim follows. Earlier SI4a results remain evidence for that earlier exact build.

## Finite SI4b/c read-consumer inventory

| Consumer | Current semantic access requiring later revision-aware migration |
| --- | --- |
| GraphIndex.getNeighborhood / neighbours / relationView | Center roles, parent-derived siblings, hidden/inferred filtering and cached relation views. |
| GraphIndex.gateStats / neighbourCount / gateNeighbourPaths | Visible counts versus unfiltered gate occupancy and edit targets. |
| GraphIndex.search / rebuildSearchIndex / presentation search refresh | Active materialized/synthetic membership, aliases/titles, search ordering; dormant facts must stay absent. |
| GraphIndex.explainRelationship / state.evidence.between | Pair declarations, inverse views and canonical precedence explanations. |
| GraphIndex.isConnected / semanticParentPages / visibleRelationshipsWithin | Edit/relink eligibility, ghost creation parents and cross-link layout. |
| GraphIndex.sortNeighbours / presentation predicate adapter / lens evaluation | Connection counts, source evidence, lazy properties and expression/filter inputs. |
| SectionExpansion | Cached body/heading preparation, section-local evidence, center siblings, explanations and reprojection. |
| ui/PlexGraph.tsx / ui/layout.ts | Center/expanded neighborhoods, cross-links, gates, parent/sibling links, connections ordering and direct neighbour reads. |
| ui/PlexFilter.tsx / ui/ContentPane.tsx / main.ts | Direct neighbour reads for filtering, content/navigation and creation/edit workflows. |
| GraphBuilder / IndexSnapshot / GraphIndex mutation and hydration paths | Direct neighbour maps during private builds, serialization, startup seeding, rename/delete and synchronous publication. These are internal writers/readers, not permission to switch public queries now. |

The portable resolver's own neighbour-map writes remain canonical. None of these consumers is migrated
by SI4a. A source-level contract test guards the existing hierarchy/image settings route.

## Implemented capability and result contract

`ObsidianSourceAcquisition.captureForReplay()` captures the already acquired Markdown source's
physical incarnation/stats, session/host revision and Date/Daily Notes environment. It requires current
MetadataCache and a clean observed source, and copies the two finite presentation selectors. A new
session must first refresh resolution through SI3 acquisition; replay never silently reacquires a
source. `prepareCachedSemantics()` captures each distinct requested owner once and composes the
internal reader. Neither method is called by live settings routing or UI code in SI4a.

`CachedSourceSemanticReader.discover()` unions `field`, `target`, `literal` and `family` queries with
at most 256 distinct owners. Callers supply normalized field keys; literal/target tokens remain exact.
It returns `candidates` with `coverage: "candidates-only"`, never a semantic count. A known incomplete
lookup discards its partial candidate list. `prepare()` accepts explicit requests and an independent
monotonic policy revision/current callback, copies finite compiler settings, and feeds
`NormalizedSourceScopePreparer`. That portable owner composes the accepted patch preparer and full
compiler; no role/precedence/resolution algorithm is duplicated. Its exact-ID entity port is invoked
only after canonical policy selection.

`CachedSourceReplay` joins the four selected stored families by explicit value ID and ordinal, checks
cross-family lexical spelling/subpath/finality and keeps shared payloads once per physical value. It
uses `SourceBodyDecoder` for cached inline reconstruction, not a Markdown parser. The Obsidian
supplement reuses the structural patch collector, metadata collector's finite `presentation` family,
`hostLinkRecord()` and `normalizedBodyUrl()`. Full folder topology is not inferred from `file-parent`:
the default entry point supplies only the source entity and genuine host tag memberships. A caller
with coherently supplied canonical structural facts can include them explicitly, as the full-topology
oracle test does. No source-owned result certifies that external structural contributions are complete.

Read outcomes are closed: `ready`, `pending-acquisition`, `stale`, `cancelled`, `invalid-family`, and
`storage-unavailable`. Pending metadata, tombstones and evicted unsaved inputs are never empty ready
sources. Errors carry stable reasons and optionally the affected family/source, not partial
compilations or raw exceptions. A ready preparation carries `coverage: "source-owners"`, policy revision,
selected heads (including physical and host observations), saved/unsaved status and durable sequences.
The caller must revalidate at any later publication boundary; SI4a has no publication callback.

Each read holds one selected-head lease across all family visits, including reused family revisions.
Failure poisons that read even if the consumer ignores a failed visit. Late/concurrent visits cannot
escape the callback lifetime. Release uses the original connection, is initiated synchronously on
unload, shares one release promise, and has a five-second watchdog. A release/storage failure retains
conservative orphan protection rather than authorizing unsafe cleanup. Success rechecks the head and
host after awaited release. Final multi-source validation reads at most 256 selected heads in one
transaction and rechecks memory overlays and caller/policy/host fences after the await. Read-only here
means **no source-head/fact write**; persistent reader-lease bookkeeping still writes `meta`.

## Bounds and explicit limits

Stored chunks and posting transactions retain their existing 256-record/256 KiB targets and encoded
record/decode ceilings. Replay batches have at most 256 records and a 256 KiB estimated-byte target;
an indivisible identity can travel alone up to the 8 MiB guard. Ignored, duplicate and null bindings
still count toward cooperative checks (every 32 steps or elapsed slice budget). Each owner visits each
family exactly once; duplicate owner requests are deduplicated before collection.

The resolution/inline-name join reservation is capped at an estimated 8 MiB per source, separately
from repository decode and `SourceBodyDecoder` reservations. A semantic request has at most 256 owners
and at most 32 MiB of estimated normalized input before rejection. These are input/reservation caps,
**not total JavaScript heap or latency guarantees**: the canonical compiler/evidence representation has
its own overhead and selected declaration multiplicity. Oversized requests fail closed; they do not
split into inconsistent policy fragments. No whole-vault or pair-scoped performance claim is made.

The Node tests compare full live-collector compilation with storage replay under multiple policies,
including a separately supplied complete structural fixture. Exact node IDs, materialization, metadata,
directed flags and every declaration/provenance field are compared. Only generated evidence keys and
producer-specific ownership revision labels are projected out; source ownership/multiplicity remain
exact and selected durable revision stamps are asserted separately. A separate record-level oracle compares
field-name provenance (including line/start/end), physical value IDs, reference payloads and candidates
without semantic projection. No accepted golden or threshold
is changed. Real IndexedDB tests additionally cover multi-connection head replacement, persistent pin
cleanup, durable fault rejection, dependency union and two-policy reuse. Execution/host prerequisites
and the main-agent acceptance evidence are recorded in
[the SI4a validation report](validation/settings-independent-indexing-si4a-2026-09-30.md).

## SI4b1-C2-S1 neutral observer and summaries — accepted prerequisite, no publication route

[Contributor discovery](SOURCE_CONTRIBUTOR_DISCOVERY.md) records the retained full-rebuild lifecycle,
the validated focused C1 correction and this smaller C2 prerequisite. Incremental C2 is still not
implemented. `CachedSourceReplay.read(request, runtime, consume, observe?)` adds one optional neutral
stored-fact observer; existing call sites, `CachedSourceSemanticReader.prepare()` in its default owner-only mode and candidate-only
`discover()` retain their accepted semantics and return contracts. No live consumer is connected.

The observer runs once per already chunk/posting-validated batch, before canonical consumption. Its
promise is awaited under the same selected read and lease; false cancels and exceptions reject the
read. It cannot mutate or retain supplied records, publish a prefix, open another lifetime or assume
a final callback. Family framing/counts/digests, the remaining families, normalized finality and final
source/host fences after lease release can still reject all observed work. Caller/host cancellation
is rechecked around its await. The repository remains the sole pin/decode-reservation owner.

`SourceContributorSummary.summarizeContributorOwner()` uses that observer plus the ordinary normalized
sink to collect the exact neutral dependency set in **four family visits**, including lexical/null/
dormant bindings and targets hidden by normalized deduplication. It changes no canonical parser,
resolver, reference ordering, provenance or declaration multiplicity. It reserves encoded key strings,
UTF-16 storage and bookkeeping under a separate 8 MiB/owner budget. This is not a total-process heap
budget. It returns no summary on cancellation, missing frames, terminal family corruption, host/head
supersession or exhausted reservation. Unsaved ready reads keep `sequence=null` and cannot authorize
durable catalog selection.

The twelve new portable tests include exact before/after normalized batch/work equality, observer
backpressure/cancellation/faults, late commitment failure, source/head supersession, a legacy seven-
visit key-set oracle, opaque-ID/path separation, paged summary integrity, delta/absence handling,
budgets and the unchanged-C host-revision counterexample. The five-policy full-compiler oracle now
uses actual fused summaries to populate its explicit catalog port. The fixture setup deliberately
runs an independent normalized oracle; its work is not claimed as the bootstrap's four-visit count.
All **52 source tests** and **30 real-Chromium IndexedDB tests** pass on the reviewed tree. The
real-browser cases cover observer leases, summary durability, old-root rejection, corruption and
interrupted staging. The full aggregate `verify` still fails the unchanged URL-heavy timer assertion;
the exact-build Obsidian command/render/error smoke passes. This validates the isolated prerequisite,
not incremental catalog maintenance.

The exact old/new union is only a source-local delta plan. The adapter still increments a global host
revision after an edit: an unchanged C head cannot be replayed under the new host observation without
a certified transition. Do not delete that guard or reuse an old epoch to make a local index look
ready. Persisted key sets also lack the source-relative binding descriptors needed for complete fresh-
session resolver/Date/topology validation. Same-session host-impact/root transactions remain C2;
fresh-session validation, hot-key/long-ID continuation and terminal scope closure remain C3.

A direct cover is not a sibling, transitive, gate-count or global-search certificate. The accepted
256-owner/32 MiB one-shot preparer must not be bypassed by partial graph publication. SI4b2 remains
blocked until incremental maintenance, host authority and terminal composition have their own
applicable automated/native acceptance. Prior accepted SI4a validation does not approve this extension.
