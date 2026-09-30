# SI4b1 contributor discovery — rejected lifecycle; C2-S1 summary prerequisite accepted

**SI4a and the isolated C2-S1 prerequisite are accepted. SI4b1 and incremental C2 are not complete.** This slice implements a
smaller owner-summary boundary permitted by the C2 handoff: one four-family selected read, persisted
and independently authenticated owner-key pages, and exact old/new source-local delta preparation.
It does **not** implement an ordered copy-on-write membership index, a dirty-impact ledger, local
root publication or disjoint-query continuity after an edit. The retained prototype still deletes its
root on every source mutation. No settings, GraphIndex, gate, search, publication or UI route changes.

C1's deletion/retry corrections and the main agent's request/fixture fixes are preserved unchanged.
The main-agent review of this slice is recorded in `Refactor plan.md`.

## Implemented boundary: prepare and authenticate one owner's keys

`SourceContributorSummary.ts` owns policy-neutral dependency projection. `summarizeContributorOwner()`
uses `CachedSourceReplay.read()` once and its optional awaited stored-fact observer. The existing four
family visits supply both normalized incidence and lexical facts otherwise hidden by canonical
resolved-target deduplication. The old three extra lexical traversals are removed from explicit
catalog bootstrap. The canonical compiler, parser, resolver, batches, multiplicity and precedence
are not modified.

| Input | Preserved dependency, not semantic classification |
| --- | --- |
| Canonical normalized entity/target/tree facts | Exact node incidence, including both sides of file/tag structure and third-party URL-origin contributors |
| Reference values, field names and Date provenance | Normalized field keys, independently of current roles or imagery settings |
| Stored reference candidates and genuine host literals | Exact lexical spellings, including dormant/null bindings and two spellings presently resolving to one target |
| Stored reference/literal resolutions | Selected non-null target identities hidden by normalized deduplication |
| Tag membership facts | Exact tag/node incidence plus the existing conservative `tag-tree` family key |

The summary stores version 1, opaque `sourceId`, selected source revision and sequence, the canonical
`SourceEntityRef`, and sorted unique exact JSON-tuple keys. SourceId, NodeId, physical path and semantic
path remain distinct. A self-node key is mandatory. A memory-only selected read retains `sequence=null`;
bootstrap explicitly refuses to turn that into durable authority. Summary collection neither reads
Markdown nor writes a source head. Existing lease bookkeeping still writes `meta` for durable reads.

### Observer lifetime and finality

The observer receives each chunk/posting-validated batch once, before canonical replay consumes it,
and is awaited inside the same selected read. It must not mutate/retain the supplied records or
publish derived state. It owns no task, timer, lease, second replay or separate completion callback.
Returning false cancels; an exception rejects the selected read. Runtime/host fences are checked
around the await. Family framing, terminal digest/counts, all four visits, normalized finality and
the repository's final selected-head checks after lease release must still succeed. Observed bytes
are private work, not early evidence of readiness.

Portable tests compare every normalized batch (excluding only its attempt boundary), exact records,
ordering, finality and work counts with/without observation. A late family failure and a post-work
head supersession discard all observations. The real-browser addition pauses an observer while its
persistent lease exists, activates a competing head through another connection, then requires a
non-ready result and complete lease release. This assertion passed in the main-agent Chromium run.

### Persisted original owner commitments

The **derivative root format is now 2**, not a database/source/graph schema change. `sourceDependencies`
still has the prototype's two slots in database v6. Each source lookup row contains its selected head,
canonical source reference and an original owner-summary manifest: page count, key count, encoded
bytes and a SHA-256 chain. Summary rows use exact `['summary', sourceId]` lookup tuples and contiguous
page indices. The chain binds every page to the exact SourceId, selected source revision, durable
sequence, page index, original key count, byte count and page digest.

Pages contain at most 256 whole keys and fit the existing 256 KiB row/page envelope, accounting for
JSON-escaped owner identities. A too-large indivisible key is non-ready, never split or truncated.
This is **storage paging**, not the missing C3 long-ID or hot-query continuation protocol.

`readOwnerSummary(sourceId)` authenticates the selected root, the source lookup bucket, every original
summary page, strict sorted/unique/self-key coverage, physical-path agreement and the current durable
head. It rechecks root identity after awaited selection validation. It does not scan source heads,
read families, enumerate the host or invoke acquisition. A missing owner row returns pending/missing,
**not certified absence**. A missing summary-page lookup for a selected owner is invalid, not an empty
key set. `discover()` also verifies these original summaries before selecting source owners.

The enclosing bucket manifest independently authenticates queried empty ranges. Removing a page or
lookup row cannot redefine that bucket's original commitment. Portable fault tests additionally
reseal the outer test bucket/root while retaining the original owner commitment: missing, truncated,
reordered, duplicated, wrong-head and wrong-key summary pages still fail. Integrity here is against
omission/corruption under original commitments, not an adversary replacing all producer commitments.
An unrelated empty bucket need not read every owner's summary; its unchanged original membership
commitment is the relevant absence proof.

Old root-format-1 data is `dependency-invalid`; it is not silently interpreted as a summary-capable
root. Explicit bootstrap may replace only derivative data. The v5→v6 additive migration, accepted v5
source heads/chunks/postings, body-v2, graph schemas 1–3, leases, source sequences and newer-database
handling are unchanged. No database reset or source rewrite is used. Real-browser additions cover
an existing v6 database with a v1 root and byte-shape preservation; the existing v5 migration remains.

### Exact private delta, not a publication capability

`prepareContributorOwnerDelta(previous, next)` validates and copies explicit owner states, then
linearly merges the sorted old/new sets into `removedKeys`, `addedKeys` and `affectedKeys` (their
union). Common keys remain affected when only the head/incarnation changes. Missing/corrupt summaries
cannot be supplied as empty states. Absence must be separately proved by an authoritative operation;
the `absent` variant is an explicit caller assertion, not a proof issued by this function.

Deletion merges the old summary with proved absence: **zero family visits**. Recreation supplies a
new selected summary. Rename with different SourceIds is two separately fenced owner operations, not
a guessed path-to-identity conversion. The result has no ready outcome, certificate, apply method,
root-selection method or authority to retire a dirty ticket. Its direct owner keys do not close
structural owners, resolver referrers or other dirty owners.

A snapshot from `readOwnerSummary()` is valid at its returned selection. It does not remain current
after a source/host change. The existing writer deletes the root, so this API cannot recover a usable
old selected summary after that deletion. A future coordinator must preserve the old commitment in
its transaction/journal protocol; this return does not add a hidden historical-root escape hatch.

## Concrete counterexample and the boundary that is still missing

At root R, A has no declaration to B. A query for B does not select A (it may still select B's own
source and host owners). A then adds `Friends:: [[B]]`. Reusing R and validating only its returned
owners cannot discover that A became relevant. B's old negative is wrong even if every selected old
head validates. A's **old** keys cannot bound its unknown **new** keys. A dirty owner therefore blocks
possibly affected negatives until a complete new impact is known.

The new delta test proves B belongs to A's old/new union and C does not. That is source-local evidence,
**not evidence that C's actual query remains usable**. A second executable test demonstrates the
remaining adapter boundary: acquire A, B and C; modify/reacquire only A; C's source head stays exactly
unchanged, but `captureForReplay(C)` supplies the incremented global host revision. Cached replay
correctly rejects C as stale before visiting any family. Retaining an old catalog root cannot fix this.

Merely relaxing that guard is also unsound. For example, C can contain `[[Alias]]`; an alias/file
change in A can change C's host-selected binding while A's own direct key set contains no C key.
Date classification, Daily Notes and structural facts provide other third-party dependencies.
Canonical host/referrer impact closure and a same-session authority linking unaffected old heads to
the new host observation are required. The key-only summaries in this return do not preserve enough
source-relative binding descriptors to prove fresh-session zero-family resolver validation.

**Implemented state machine:**

| State / transition | Actual behavior in this return |
| --- | --- |
| Clean selected root | Existing global host/source fences plus authenticated format-2 buckets and owner summaries |
| Source write begins | Existing owner ticket/global revision advances; root is deleted; exact queries become non-ready |
| New head activates | Existing source-head/ticket CAS; no incremental root or summary selection is added |
| Summary preparation | One private four-family selected read; cancellation/fault/supersession yields no usable summary |
| Private delta preparation | Exact old/new source-local merge; no storage or ticket effects |
| Explicit bootstrap | Full structural inventory and all-owner summaries staged in inactive slot; existing global build/head fences select the complete root |
| Interruption without a source mutation | Incomplete inactive slot cannot replace the previous valid selected root |
| Interruption during a source mutation | Existing dirty/unsaved fences remain; C1 authoritative source repair applies; no disjoint-query continuity is claimed |
| Query completes | Relevant bucket/owner commitments, selected heads and final root/host checks all close; no prefix is ready |

This is the handoff's smaller prerequisite, **not an alternative full-rebuild solution to C2**.

## Required next C2 implementation — proposed, not shipped

Keep source-head/lease/transaction ownership in `SourceRepository`, with separate persisted source
and host owners. Replace the full-generation hash buckets with ordered authenticated copy-on-write
membership and owner-summary trees. Pages commit counts, byte lengths, sorted bounds, child
separators/hashes and format. Validate original path/range coverage, not surviving lookup rows.

| State / transition | Required proof before exposing it to readers |
| --- | --- |
| Clean → unknown dirty | Durable owner-specific ticket selected before any potentially relevant head/host change; retain last valid root but mask unknown impacts |
| Prepare old/new owner | Authenticate old summary/head, produce new summary in four visits (zero for deletion), preserve exact incarnation and caller lifetime |
| Unknown → known impact | Persist complete old/new union **plus** closed host/referrer fan-out, bound to exact head/ticket/host observations; unknown/newer impacts still block |
| Stage changed tree paths | Only changed membership/summary paths, with bounded pages/bytes/transactions, hashing and host calls outside activation |
| Publish | Short CAS compares expected owner head, root, exact dirty ticket and certified host transition; selects head/summary/root and retires only that ticket atomically |
| Separate head commit, if needed | Atomically select an explicit durable repair record and unknown impact; never leave a head/root gap that readers interpret as clean |
| CAS conflict | Rebase the same bounded owner delta against the new root; recheck ownership and impact, never replay all unchanged owners |
| Crash / cancellation | Staged pages remain unselected; durable unknown/known impact remains conservative until authoritative repair; do not infer dead writers from time |
| Reclamation | Root/page pins safe across connections, including interrupted readers; bounded reclamation only after proven non-selection/non-liveness |

Before impact certification, B and potentially C are pending. After a **host-complete** impact excludes
C, C may use the retained root with matching range/owner commitments and a validated host transition,
while B remains pending until new membership selection closes. Query finality must recheck relevant
tickets and root/head/host stamps after awaits. The global `control.dirty`/host-revision equality must
be replaced by this proof, not ignored. Missing old owner state or a corrupt root may require broader
explicit repair; arbitrary corruption has no promised constant-cost recovery.

## C3 and terminal scope closure — still required

Fresh-session validation needs complete canonical structure, source-relative null/resolved lexical
bindings, Date/non-Date field observations and Daily Notes, without reading unchanged source families
or rewriting every unchanged head. Long exact identities need byte-bounded dictionary/continuation
framing, including lone-surrogate-safe comparison after hash candidate selection. A hash is not an
identity. Hot ranges must stream under one root/host/scope identity, with final completeness rather
than a ready prefix; source and new tree pins need explicit cancellation/cleanup ownership.

A prospective terminal API must distinguish private continuation batches from a final certificate.
At every page, validate range order and original commitments; at termination, close all owner/host
selections and relevant dirty impacts. A cancellation/supersession discards private work. The existing
256-owner/32 MiB one-shot semantic preparer is not a paged publication protocol.

Direct incidence is not complete sibling, gate or search behavior. Siblings must close discovered
parents' ranges; exact gate counts and negatives need complete semantic filtering; transitive
traversal needs frontier completion. Global search requires its own complete materialized/synthetic
membership view and canonical collision/order behavior. Neither this slice nor C3 may bypass the
canonical compiler or publish independently prepared partial graphs. SI4b2/SI4c remain blocked.

## Work inventory: implemented costs versus unimplemented targets

These are source inspection and arithmetic, **not 20,000-file/browser latency or heap measurements**.
A 100,000+ entry derived graph is not traversed by these summary/index modules; their interfaces do
not take that graph. This says nothing about the canonical compiler's separate allocations/work.

| Operation | Actual returned code | Full C2/C3 target, not implemented |
| --- | --- | --- |
| Prepare one changed owner's summary | One selected read, **4 family visits**, key reservation/sort; no source-head write or Markdown IO | Same, plus genuine host/referrer fan-out |
| Prepare deletion delta with valid old summary | **0 family visits**, linear old-key merge; no index write | Old-key membership removals on changed tree paths |
| First catalog bootstrap, 20,000 owners | **80,000 family visits**, down from 140,000, plus complete structural inventory and all membership/summary page writes | One bootstrap of ordered summaries/index |
| Exact readiness after one ordinary edit | Still full bootstrap: **80,000 visits**, after required host reacquisition; unrelated queries remain pending | Changed owner **4 visits**, affected paths and actual fan-out only |
| Delete one of 20,000 owners | C1 tombstone **0 visits**; exact readiness still needs **79,996** catalog visits for the remaining 19,999, plus host work | **0 source visits** for deletion, old-summary paths plus actual host/referrer fan-out |
| Read one authenticated owner summary | **0 family visits**; selected owner/summary hash buckets and head/root fences, within existing query caps | Ordered owner path/pages, not all colliding bucket contents |
| Unchanged new session | Host reacquisition remains required; catalog alone then costs **80,000 visits** | C3: **0 unchanged family visits**, bounded complete host validation |
| Hot keys / long identities | Existing caps can still return non-ready; whole-key summary pages do not solve continuation | Terminal paged ranges and byte-bounded exact-ID continuation |
| Split/merge/local crash repair | No ordered tree exists; not measured or implemented | Bounded sibling/path updates and ticketed rebase/repair, not full bootstrap |

The pure delta holds two bounded input summaries, detached array references and three bounded result
lists; its merge is O(old keys + new keys). Summary collection reserves encoded strings, retained
UTF-16 keys and bookkeeping together, up to 8 MiB/owner. This is separate from existing replay join,
body reconstruction and repository decode reservations, not a total-heap promise. Queries reserve
bucket bytes/bookkeeping plus nested summary-key/array bookkeeping before reconstruction; the existing
8 MiB/256-page/256-source limits remain. An owner that cannot fit is explicitly non-ready.

For a **proposed ordered-index sizing example**, assume 20,000 owners × 12 memberships = 240,000 rows,
128 rows/leaf and fan-out 32. Bulk packing gives 1,875 leaves, then 59 and 2 internal pages and a root:
a four-page path. Twelve disjoint old and new keys give 24 membership operations, or 96 search-path
visits before coalescing, excluding owner/host paths, splits/merges and CAS retries. Deletion of twelve
keys gives 48 such visits. These are not implemented or universal write bounds. A 20,000-owner hot
range spans 157 leaves and 79 at-most-256-owner semantic batches; actual encoded bytes can lower leaf
occupancy, and a terminal preparer remains missing. C2 must count split/merge siblings, longer-key
pages, pin writes and crash/CAS repair separately.

The retained prototype still has 1,024 buckets, 256 pages/bucket, at most 256 rows and 256 KiB/page,
128 MiB/generation, two slots and an 8 MiB identity map. No claim of scalable hot-range acceptance is
made. Summary persistence adds rows/bytes and query work; it is a prerequisite, not a free speedup.

## Validation of the isolated prerequisite

`npm run test:sources`: **52/52 pass**, including all four C1 portable regressions, twelve new summary/
observer/delta/fault tests, and discovery-driven five-policy full-compiler equality now populated
with production fused summaries. Policy-only work still asserts zero Markdown reads/parses and no
source-head changes. Portable catalog ports are explicitly not real-IDB transaction evidence.

Five new real-browser scenarios cover measured four-family durable bootstrap/source preservation,
v6 old-root rejection, missing summary-page/empty-range faults, cross-connection observation leases,
and interrupted summary staging. The existing migration, rename/delete/recreate, C1 quota/eviction,
dirty-ticket, cancellation and actual process-restart cases are retained without weakened assertions.
The main agent ran Node 22.22.3 with installed dependencies: architecture 7/7, restricted core 60/60,
official lint, 52/52 source tests, 30/30 real-Chromium IndexedDB tests and the production build passed.
The full `npm run verify` failed at the unchanged URL-heavy timer assertion (163.1 ms in the reviewed
run); this remains a failed aggregate gate, not a pass. Exact-build Obsidian command/render/error smoke
passed in the disposable vault. The offline export's blocked browser and missing dependencies are
recorded in the return entry of `Refactor plan.md`, distinct from main-agent evidence. No timing
threshold or golden was relaxed. C2 per-edit and C3 warm/terminal acceptance remain outstanding.
