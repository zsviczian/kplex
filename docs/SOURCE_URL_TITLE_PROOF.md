# SI4 URL-title encounter-order proof and derivative coordinate

**Status: bounded private implementation independently reviewed; not SI4b1 acceptance.**
The [main-agent review](validation/settings-independent-indexing-si4-url-title-review-2026-09-30.md)
passed the required Node, build and real IndexedDB lanes. The offline-only evidence below is retained
as an accurate account of the return environment.
This closes only the source-order premise identified in the reviewed
[selected-title finding](SOURCE_SELECTED_TITLE_PROOF.md), under the existing current-source and
same-session host capability. It introduces an uncalled private URL-name input reader. It does
not establish selected scalar/alias MetadataCache observations, candidate degrees, stable visible
lists, incremental catalog maintenance, publication or settings-time graph independence.
SI4b1/SI4b2/SI4c/SI5 remain open; C15–C26 remain paused.

## 1. The actual canonical encounter stream

The oracle is a fresh `GraphBuilder.build()` and `GraphIndex.titleFor()`, not a locally reconstructed
label selector. Their implementations are unchanged.

`GraphBuilder.build()` accepts the initial structural batches, then **all host-link batches**,
then `collectMarkdownSources()`, then structural finalization, compiler finalization and binding.
`collectMarkdownSources()` captures `vault.getMarkdownFiles()`. Body lookups and bounded read groups
may overlap IO, but compiler consumption loops over each `batchFiles` array in that original
inventory order. It does not consume results in Promise completion, path-sorted or structural order.
For each file it consumes semantic metadata, neutral property references, then Date/body-URL
relations. The structural finalization validates the topology boundary; it supplies no alternative
meaningful URL-label policy.

Only `NormalizedGraphCompiler.consumeBodyUrl()` writes the preferred URL-label map. Its first
truthy label different from the target's URL wins. A missing/empty label, or a label equal to the
URL, does not reserve the map entry and cannot prevent a later meaningful label from winning.
Once a meaningful label exists, later body references do not replace it. Ordinary reference and
host-link phases can materialize a URL with its raw URL fallback; they do not reserve a preferred
label. Structural document/container/tag facts are not alternative URL-label suppliers. Thus
interleaving the selected owners' canonical host/reference records differently from the full
all-host-links phase cannot change this particular URL-name decision. It does not prove general
relation or neighbor ordering.

Per-file order is the order of the **canonical parser output**, not a new scan of link spellings.
Both parser implementations retain the first occurrence of each exact raw URL across the body.
On each line, however, they first build `aliasByUrl` by scanning Markdown links from left to right:
the last same-URL link on that line replaces the label, even when empty. The first retained URL
occurrence then receives that line's final label. Consequently:

- A bare first occurrence followed by a labeled duplicate on a later line stays unlabeled.
- Two differently labeled links on the first line yield the last same-line label at the first
  retained occurrence. An empty final same-line label erases an earlier label.
- Whitespace-only labels are empty after the parser's existing trimming. An equal-URL label is
  retained by the parser but does not win the compiler's meaningful-label decision.

`SourceReplay` visits stored `body-urls` in original family/page/record order, using the same host
`normalizedBodyUrl()` as live metadata collection. It neither sorts nor reparses that stream.
Therefore a second per-record derivative ordinal is unnecessary.

Origins are independent endpoints. `consumeBodyUrl()` can materialize an origin and its
origin-to-path relation without copying the path's label to the origin. The origin can subsequently
receive a meaningful label from its own direct body occurrence. The origin's complete support cover
must include child-path owners as well as owners directly naming the origin; retaining only an
arbitrarily selected labeled owner would not prove presence, fallback or completeness.

## 2. Why one Markdown ordinal per exact SourceId is sufficient

For a requested canonical URL, restrict the full body-record stream to all records capable of
supporting or labeling that endpoint. Removing other owners preserves this ordered subsequence.
For the label-map state, an irrelevant record leaves the state unchanged; an unmeaningful matching
record leaves it unchanged; the first meaningful matching record fills it; every later matching
record leaves it unchanged. Induction over the ordered subsequence therefore gives the same label.
If no meaningful label exists, the unchanged compiler supplies the URL fallback. Independent origin
support obeys the same rule, with child labels excluded by the existing compiler.

The existing contributor summaries conservatively include all neutral property URL candidates,
body URL targets and origins, independent of current relationship settings. Discovery reads the
complete requested membership range, the selected source rows and their original summaries.
Replaying this entire finite cover in ascending **Markdown encounter ordinal**, with unchanged
per-file body order, preserves the full builder's decision. The canonical compiler still decides
whether a policy-selected property-only URL exists at all; a missing compiled node is not a
fabricated URL title.

The reviewed counterexample is unchanged: inventory order is `Nested/First.md`, `Root.md`, with
`First label` and `Second label` respectively. Structural traversal emits the root document before
descending into the nested folder. V2 discovery returns root then nested and selects `Second label`.
V3 title discovery returns nested then root and selects `First label`, exactly matching the fresh
full index. Ordinary relation discovery **still returns root then nested**. The original v2
characterization is retained, not rewritten to expect a new full-builder policy.

Exact SourceId is not inferred from NodeId, a path, durable sequence or lexical sorting. Acquisition
joins the structural entity to its selected source request, then persists the coordinate on that
exact source row/head. Opaque-identity tests deliberately make those identities different.

## 3. Acquisition and authenticated format

`ObsidianSourceAcquisition.contributorDiscovery()` opts into `markdownOrderVersion: 1`. Construction
and query do not enumerate files. Its existing explicit `collect()` now snapshots the Markdown
array, maps actual `TFile` objects to zero-based ordinals, and passes the ordinal alongside each
canonical structural document fact. Structural emission remains unchanged. It rejects duplicate
files, non-Markdown/non-`TFile` entries, registry identity mismatch and documents outside the captured
inventory. The array is copied so a host-reused mutable array cannot silently rewrite the snapshot.

Collection remains inside the same session/host revision. After canonical structural finalization,
it requires the exact document count, a second inventory with identical per-position file identity,
current file registry identity and the existing finalized structural boundary. Equal-length
substitution and enumeration reordering fail, not just additions/deletions. The temporary ordinal
map has an explicit 8 MiB reservation estimate; construction and final equality validation yield
and check cancellation every 256 entries. The writer accounts for an additional 64 bytes per v3
source in its existing 8 MiB identity budget. All-owner work occurs only in explicit acquisition.

The derivative root/page content is now **format 3**. A v3 source row has exactly the existing
`kind`, `key`, `order`, `head`, `source`, `summary` fields plus `markdownOrdinal`. `order` continues to
mean structural document encounter order. `markdownOrdinal` must be a nonnegative safe integer.
The writer requires one ordinal for every document, none for other structural facts, and global
uniqueness. At completion, all ordinals must be below the exact document count; together these
checks prove the complete permutation `[0, sourceCount)`. Source and entity identities must also
remain unique. An invalid stream cannot activate the root.

The coordinate is inside the original authenticated source-row page and its bucket commitment;
the version and all bucket commitments are authenticated by the root digest. URL-title discovery
checks every selected ordinal, its range and selected uniqueness. Its certificate adds a
`markdownOrder` vector aligned with the exact selected source stamps, strictly increasing and
included in `selectionIdentity`. Final revalidation checks that vector and the unchanged root.
Global completeness is proved by the writer, not by scanning all owners at query time. These are
internal capability/integrity checks, not credentials against an attacker able to forge a whole
new root and all trusted commitments.

**Database version stays 7. Source-head, family, body, graph, journal and owner-summary formats do
not change.** The existing additive v5/v6-to-v7 upgrade is not modified. V2 roots retain their exact
strict row shape and remain relation-readable when their existing host/head/root/journal fences
close. Legacy producers without the order opt-in can still build relation-only v2 roots. A v2 root
cannot authorize a URL-title read, including an empty range: it returns `dependency-pending` before
lookup/replay. Missing/invalid v3 ordinals never fall back to structural order. Unsupported versions
remain invalid. There is no automatic migration or query-triggered rebuild; explicit acquisition
may replace only the derivative root/pages, using the existing atomic two-slot activation.

## 4. Private bounded input, not a second title system

`CachedRequestedUrlTitleReader.prepare()` requests exactly one materialized URL with its explicit
semantic path and no physical path. It captures finite semantic policy before the first await,
discovers complete support in Markdown order, captures those exact selected source requests, and
uses the existing `CachedSourceSemanticReader`/canonical compiler. Every owner retains the same
four-family replay contract. Structural facts retain their separate structural order.

It returns only a detached `{ entity, name, url }` input, work counts and a
`complete-url-title-input` certificate. It returns neither an over-cover compilation nor a partially
selected title. The compiled node must be the exact requested materialized URL, with no physical
file/path and no aliases. For this canonical node class, the unchanged
`GraphIndex.displayNameFromConfiguredFields()` has no file properties or aliases to select, so
`titleFor()` falls back to the compiled name. Configured scripts remain unexecuted by the existing
facade. The reader contains no duplicate label or presentation selector and has no production caller.

The existing finite discovery/replay limits remain: at most 256 source owners and 1,024 host facts,
256 dependency pages, bounded query keys, the 8 MiB dependency decode budget and the cached semantic
scope budget. Hot support returns backpressure rather than a prefix. Every committed page of each
selected bucket and each selected original summary is required; a missing page cannot prove an
empty colliding range. Missing URLs return pending/missing without a name.

Currentness is independent across caller demand, policy revision, captured physical/source host
observations, session/host environment, selected durable heads and root coordinates. After compiler
work, discovery revalidation repeats root/journal/head checks; the reader checks demand/policy and
the synchronous host fence again after the final awaited operation. `readDependencyRoot()` still
blocks on **any open source or host ticket, including known-impact tickets for unrelated owners**.
The reader acquires/rebuilds nothing and never turns an unknown journal into ready coverage.

This inherits the existing session observation boundary; it does not prove native delivery of
unreported mutations or invent a stable cross-session inventory. A new host session or observed
create/delete/rename invalidates the old capability. Explicit reacquisition can capture a new
permutation; this is not incremental repair. The separate source-bound MetadataCache completion
and scalar-absence problem remains pending and cannot be inferred from these URL-only tests.

## 5. Evidence and remaining gates

The new portable suite has **42 passing cases**, using actual acquisition, parser, source replay,
compiler, full GraphBuilder and fresh GraphIndex. Catalog storage envelopes are explicit memory
doubles, not IndexedDB evidence. Coverage includes the unchanged v2 counterexample, canonical
same-line/later-line duplicate and empty labels, property fallback, independent origins/all owners,
opaque SourceIds, hot support, malformed persisted/writer coordinates, missing negative pages,
final root/head/host/policy/demand fences, cancellation and lease cleanup. Production host collection
is tested for structural/Markdown separation, duplicates, missing/substituted/reordered/shared-array
inventories, non-document entries and cooperative cancellation. Insert/delete/rename reject an old
reader without a scan; explicit fresh acquisition then matches a fresh full title with new ordinals.
Settings-only guards count even caught forbidden IO/parser/inventory/acquisition calls and compare
unchanged source accounting and derivative bytes.

`tests/source-url-title-indexeddb.test.mjs` defines **19 real Chromium subcases**, using native
IndexedDB and production repository/acquisition code: full-title parity/zero source writes, v2
reopen and explicit v3 replacement, genuine v5 upgrade with source/body preservation, malformed and
missing pages/ordinals, aborted dependency-page transaction with old-root recovery, mutations and
final open/known journals, heads, policy and demand. These cases are **not execution-validated here**:
the installed Chromium's managed policy blocks the harness origin before initialization. No mock
IndexedDB replacement or policy bypass was used.

Offline environment: Node 22.16.0, npm 10.9.2, actual global TypeScript 5.8.3, Chromium
144.0.7559.96, Git 2.47.3 without archive Git metadata; no Obsidian runtime/CLI. Node is below the
required 22.22.2 baseline. Dependencies are not installed; offline install fails with `ENOTCACHED`
and registry DNS is unavailable. Portable runtime bundling uses the actual global TypeScript via a
temporary local link, not stubs for production type checking. Exact final command results and the
minimum main-agent checks from that return are recorded in the dated offline entry in `Refactor plan.md`.
The required-runtime browser/build gates subsequently passed in the independent review. Aggregate
`verify` remains red on the unchanged URL-heavy timing gate. This result authorizes no public
consumer or expansion into the paused work.
