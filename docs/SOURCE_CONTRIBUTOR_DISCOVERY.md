# SI4b1 contributor discovery — rejected prototype; C1 correction in Review

**SI4a remains accepted. SI4b1 is not accepted.** The two-slot implementation still deletes its
catalog root on every source mutation and cannot reuse its host proof across sessions. This is an
architecture blocker, not an SI5-only optimization. Do not wire SI4b2 publication, settings, gates,
search or UI reads to it. C1 below is a deliberately smaller correction, explicitly permitted by the
correction handoff. It fixes source-deletion lifecycle defects and records the replacement decision;
it does **not** implement incremental indexing or a warm-start certificate.

## Delivered C1: a real lifecycle defect, not just a test delay

`tombstone()` masked its owner with `unsaved.add(sourceId)` before calling `pin(sourceId, true)`.
With no memory overlay, `pin()` rejected that very mask before opening IndexedDB. Thus even a healthy
disk-only source could never reach its tombstone CAS. Awaiting a longer delay or another full catalog
build could not fix it. The browser rename test also lacked a durable completion fence: the event
starts a deletion asynchronously, and `acquisition.reconcile()` does not await that event-side task.

The repository now gives only the **identity-current pending deletion** a private capability to pin
its masked head as CAS input. `includeTombstone` alone cannot bypass an evicted-unsaved mask. Reader
leases, expected-head comparison, caller lifetime and the exact dirty ticket still apply. Normal
readers remain masked throughout; no old catalog is made ready and no database reset is used.

An evicted unsaved payload cannot make an older disk body a rename input. Such a deletion drops family
retention. Coalesced requests can remove retention, never restore it. Retry snapshots check request
identity before removing or acting on an entry. Cancelling an absence observation stops its retry,
but is not proof of presence, absence or durability: the unsaved mask and any durable dirty ticket
remain until an authoritative replacement or new deletion settles them. A completed older writer or
deletion cannot clear a newer request's mask after its await.

The lifecycle test now awaits `repository.flush()` after reconciliation and asserts `true` before
building. A false result is not coerced into success. Five additional real-browser scenarios cover
masked disk deletion, coalesced/missing-owner deletion, evicted unsaved input after quota failure,
cancellation versus another connection's newer ticket, and crash recovery by authoritative absence.
These scenarios are authored but **not executed successfully here**: Chromium navigation is blocked
by administrator policy. Portable regressions exercise the production repository with its explicitly
unavailable storage port; they are not an IndexedDB emulator or durable-transaction evidence.

## Why the architecture needs a different proof format

Retaining the old root without new evidence is unsound. Suppose A acquires a new declaration to B.
An old reverse lookup for B can return no owners, so checking only the heads it selected never even
checks A. A dirty owner's old keys do not bound its unknown **new** keys. Relaxing host-epoch equality
has the same problem after a restart: a formerly unresolved literal can now resolve, a field can
become Date-typed, or a folder/tag topology can change without any old positive result exposing it.

The current generation stamp belongs to every page in the two-slot manifest. Editing some pages
and copying a new global stamp onto the root does not certify the untouched pages, their omissions,
or an uncommitted owner's new keys. Nor can v5 candidate postings prove an empty result after a
lookup row is missing. Clearing dirty counters, guessing crashed writers are dead, and dropping
stamp comparisons are not acceptable repairs.

**Decision for the next implementation:** replace the unaccepted v6 derivative catalog with an
ordered, authenticated, copy-on-write paged index, per-owner neutral summaries, and an explicit dirty
owner/impact ledger. Keep source-head transactions and leases in `SourceRepository`. Persist source
and host owners separately. Do not store roles, edges or a second graph. This decision and the proof
obligations below are a proposed design, **not shipped behavior or a completed correctness proof**.

### Contributor universe to preserve

| Contributor | Canonical neutral input and required closure |
| --- | --- |
| Both endpoints, including opposite declarations | Exact entity identities and every current source owner; union both sides before semantic precedence. Never infer a SourceId from a NodeId or path. |
| Dormant frontmatter/inline fields | Canonical cached reference values, lexical candidates and resolution. Preserve candidates hidden by current resolved-target deduplication. Track normalized field names independently of role settings. |
| Genuine host links/embeds | Canonical host-link normalization, aggregate resolved/unresolved maps, and genuine individual literal bindings with real positions. Never manufacture positions. |
| Tags and ancestors | Canonical structural `tag-tree` facts, including third-party documents. A conservative tag-family cover must have a paged terminal proof, not a permanent 256-owner rejection. |
| Folders and attachments | Complete current structural entities and `file-tree` occurrences. Host owners remain distinct from physical Markdown source owners. |
| Body URLs/origins and property URLs | Existing canonical normalization and all referring owners, including owners that are neither endpoint. Malformed URL behavior remains canonical. |
| Date/Daily Notes | Current host Date and non-Date field classification, Daily Notes configuration and affected owner bindings. Changed classification invalidates affected resolution observations even if roles were previously dormant. |
| Null/unresolved lexical targets | Retain the literal and source-relative resolution dependency even when it emits no current normalized target. New files/renames may change these bindings. |

Positive discovery remains a conservative **owner cover**, not a classification or a minimal owner
set. Selected declarations, provenance multiplicity, inverse inference, imagery and precedence
remain the canonical compiler's responsibility. No existing parser/resolver is duplicated.

## Proposed replacement protocol — implementation required

### Persistent identities and closed pages

Use an authenticated ordered tree (for example, a byte-bounded Merkle B+ tree) with separate roots for
owner summaries and membership tuples. An owner summary binds its typed identity, selected source
head/incarnation/family manifests or host observation, canonical order, and neutral dependency set.
Include enough lexical descriptors to recheck host resolution without reopening unchanged source
families. The membership tree maps an exact typed key to an exact typed owner/version. Owner presence
and the complete sorted key range are separately provable.

Pages carry format/version, count, byte length, sorted bounds, child separators and child hashes.
The root is an original committed producer commitment, not a hash recomputed from whatever lookup
rows happen to remain. Verify page content, ordering and range boundaries, not just a pointer. A
missing page/child/owner is invalid, never an empty range. Hash integrity protects against accidental
omission/corruption under intact root commitments, not a coordinated adversary rewriting every hash.

Frame keys as exact typed tuples; do not concatenate ambiguous delimiters or normalize opaque IDs.
Long identities should be dictionary-owned once, with byte-bounded continuation chunks and exact
comparison after digest selection. JSON-escaped tuple framing preserves lone surrogates rather than
letting UTF-8 replacement conflate distinct strings. Hash collisions select candidates, not identity.
The protocol must not keep all NodeIds/SourceIds in the old 8 MiB build map. Per-record/source codec
limits remain explicit; disk exhaustion remains non-ready, not a promise of unlimited input.

### Local mutation and concurrency

1. Persist an owner-specific dirty ticket before publishing any source change. Initially its impact
   may be unknown. Preserve the last valid tree root; retaining it is not permission to answer a
   query whose coverage may have changed. The dirty ledger is independently part of every proof.
2. Validate only the affected owner's old summary and new canonical facts. Project the dependency
   summary during the accepted four-family replay, using a reviewed batch-observer seam instead of
   the prototype's three extra lexical traversals. No batch observer is implemented by C1.
3. Close the conservative impact as old keys union new keys plus affected host/resolution keys.
   A rename can legitimately affect many referrers; use persisted lexical/host summaries to find and
   validate them. If that set is not known, keep the corresponding impact unknown. Do not claim
   constant work for a real 20,000-owner semantic fan-out.
4. Stage only modified ordered-tree paths and the owner summary with bounded backpressure. Hashing,
   host calls and yields happen outside the short IDB activation transaction. That transaction
   compares the expected source head, selected tree root and exact dirty ticket, then selects the
   new head/summary/root together and retires only that ticket. An alternative separate source-head
   commit must atomically select a durable `needs-repair` record; it cannot leave an uncertified gap.
5. On root CAS conflict, rebase the staged per-owner delta against the newer root, rechecking owner
   expectations. Do not replay all sources. Bounded retry/backpressure is not a starvation guarantee.
   A superseded owner cannot delete another connection's ticket or install its old summary.

Before the new keys are known, an arbitrary negative query may necessarily be pending: the A→B
counterexample proves why. Once a valid impact set exists, queries disjoint from it can use the old
root with a closed dirty-ledger proof; after atomic repair they use the new root. Thus ordinary repair
is proportional to the affected owner/fan-out and index paths, not to all source families. A crash
leaves durable work, not silent emptiness. Do not permanently strand unrelated queries merely because
a recoverable owner needs a small repair, and do not expire unknown impacts by elapsed time.

### Warm session validation without unchanged source replay

A new session must obtain a **new host-validation capability**, not impersonate the previous epoch.
Cooperatively inventory/finalize the canonical physical/structural host data, reconcile heads against
persisted owner summaries, and validate topology, tags, source-relative lexical resolutions, Date/
non-Date classifications and Daily Notes. Read bounded persisted summaries, not the four cached
families of every unchanged source. Reacquire/re-resolve only owners whose physical or host inputs
changed; preserve unchanged source heads and graph snapshots.

This requires an explicit new replay authority binding an unchanged immutable source selection to
freshly validated host observations. SI4a's current `captureForReplay()` deliberately rejects old
session stamps, and current `reconcile()` refreshes observations for every source. **Do not weaken
those guards or claim the existing functions already support the proposed warm path.** Missing Date
inputs or changed classification require the existing authoritative acquisition owner, not invented
Date values. A compact summary must retain dormant field/lexical dependencies before warm validation
can be complete.

The warm operation may be O(N) in host descriptors and lexical resolution observations, while making
**zero unchanged source-family visits**. That distinction is deliberate. It does not detect an offline
content change with identical physical stats and indistinguishable host observations; this is the
existing SI3 limitation, not newly solved content validation. A connection unable to persist even its
dirty marker also needs current shared host events to prevent another process using isolated stale
observations. No guarantee for independently stale host capabilities is claimed.

### Query, negative proof and lifecycle obligations

A query pins a root/host capability and selects every requested membership range. Verify the search
path, all pages intersecting the key range, and the authenticated successor/end boundary. The owner
summary and selected head must agree; consume each owner once. An empty range is valid only after
that full path/boundary proof and the absence of relevant unknown/overlapping dirty impacts.

| Event | Required positive and negative proof; failure remains non-ready |
| --- | --- |
| Local edit/delete/recreate | Last committed owner set plus a closed disjoint-impact proof, or new atomic owner/root selection. Unknown new keys forbid an empty answer. A fresh incarnation cannot inherit an old owner's certificate. |
| Warm restart | New complete host-validation capability binds preserved root/summaries/heads. Persisted epoch equality alone proves neither presence nor absence. |
| Crash before activation | Staged pages are not selected. Durable dirty ticket prevents overlooking that owner's possible new keys; authoritative one-owner presence/absence repairs it. |
| Crash after activation | Head, owner summary, membership root and ticket retirement are one committed selection, or an explicit durable repair state. Readers see one side, not a mixture. |
| Missing/corrupt page or summary | Original path/range/owner commitments fail. Never hash the surviving subset and call it complete. Rebuild the affected proof from canonical facts where possible; corruption of the root or an unavailable old summary can need broader explicit repair. Ordinary edit bounds do not promise local recovery from arbitrary global corruption. |
| Concurrent writer | Root/head/ticket CAS rejects stale staging. Revalidate root, relevant impacts, selected heads and host/policy fences after awaited work; a valid prefix cannot become terminal. |
| Unsaved or evicted payload | Keep the dirty mask even without memory facts. Old disk data can be deletion CAS input, not current content. Authoritative repair is required. |
| Cleanup/unload | Existing family leases remain. New immutable tree pages need root pins safe across connections before any reclamation. Crash/orphan pin policy, disk caps and cleanup limits must be explicit; wall-clock expiration is not proof that a reader died. |

There is a distinction between *streamed work* and *complete results*. Return bounded continuation
batches tied to the same root/host/query identity, but never label a prefix `ready`. A terminal
certificate is issued only when all ranges, owner selections, host facts and final fences close.
Handle hot ranges with continuation rather than truncation or permanent rejection. Cancellation
releases pins and discards private partial semantics. The accepted 256-owner/32 MiB one-shot preparer
cannot simply be called once with 20,000 owners or bypassed with unchecked partial publications.

## Composition boundary before SI4b2

Direct incidence is only the first cover. SI4b2 is blocked until its actual consumer needs have
explicit terminal closure and canonical ordering:

- **Neighborhood and siblings:** first prepare the center's complete direct cover. After canonical
  semantics determines parents, close every parent's direct cover, with policy/subtree fences and
  owner deduplication across pages. A finite center-only certificate is not a sibling certificate.
- **Gates/counts:** a positive existence witness may answer “has any”; exact counts and negative
  existence require the entire relevant range and all semantic filters. Never turn an unfinished
  page sequence into a zero count. Transitive traversal needs explicit visited/frontier completion.
- **Global search:** supply a separate complete paged membership/read view, including policy-dependent
  synthetic entities and canonical order. Pair covers cannot certify its universe. Stable ordering
  and collision behavior must be equal to the accepted compiler, not dependent on tree page order.

A paged private semantic preparation/accumulation protocol is a separate required change, with a
terminal coherence certificate. Repeatedly publishing one-shot `prepare()` batches is not that
protocol. Source ownership remains separate from host facts and semantic policy throughout.

## Work inventory: actual C1 versus proposed replacement

These counts distinguish code inspection/fixture arithmetic from measurements. No 20,000-file
performance benchmark or real-browser success is claimed by this return.

| Operation | Rejected implementation, still present after C1 | Proposed replacement target, not implemented |
| --- | --- | --- |
| First catalog bootstrap, 20,000 Markdown owners | 20,000 × (4 canonical + 3 lexical) = **140,000 family visits**, plus complete host inventory | 20,000 × 4 = **80,000 family visits** once, with fused neutral summary production |
| One ordinary edit; only that owner affected | Catalog invalidated; next build again **140,000 visits** | **4 family visits**, one owner delta and changed tree paths; additional work only for genuine affected host/referrer owners |
| One disk-only tombstone, before any catalog build | Before C1: self-masked and cannot activate. C1: deletion head/CAS path, **0 family visits** | Same source-local retirement, plus old-summary membership removals; **0 source-family visits** |
| Exact catalog readiness after that deletion | Still requires **140,000 visits** to rebuild; C1 does not fix this | Only deleted/affected owner summaries and changed tree paths |
| Unchanged warm restart | Source host observations refreshed; catalog rebuild **140,000 visits** | **0 unchanged source-family visits**; complete bounded host/summary validation remains necessary |

The C1 deletion pins at most the four distinct family revisions of its selected source, releases
those leases, and retains or retires only that source's families. Normal head selection/activation
uses bounded transactions; optional old-family reclamation scales with that source's stored chunks/
postings and existing leases, not with unrelated owners. A retained rename body read later visits its
two body families and is not included in the tombstone's zero-visit count. The source writer limit
remains two, deletion execution one, and the coalesced queue stores dirty IDs/predicates rather than
source payload copies. The unsaved-payload bound remains 16 MiB; existing decode/join caps remain.

For a concrete **proposed index sizing model**, assume 20,000 owners, 12 unique memberships each,
128 rows per leaf and branching factor 32. This is 240,000 rows, 1,875 bulk-packed leaves, 59 then
2 internal pages, and one root: a four-page search path. A changed owner with 12 disjoint old/new keys
makes 24 membership operations, or **96 search-path page visits** before path coalescing in a
no-split/merge fixture, plus owner/host-summary paths. Splits, merges, encoding sizes and contention
need separately counted bounded sibling/path work; 96 is not a measured or universal write bound.
A hot key with 20,000 owners occupies 157 such leaves and can stream in 79 batches of at most 256
owners, rather than failing the old permanent owner cap. Real pages also obey a byte cap, so long
keys can lower rows per page.

For a warm fixture with 20,000 document descriptors and one root descriptor, two validation passes
mean 40,002 descriptor observations. Four lexical bindings per note mean 80,000 resolver comparisons,
plus field-type/Daily Notes validation. These are model inputs, not instrumentation of the existing
collector. Hold bounded tree paths/pages, writer buffers and source batches; do not materialize a
second all-owner identity map or graph. Existing host-owned inventory arrays and compiler allocations
must be counted separately in heap measurements.

The old fixed limits remain in the unaccepted code: 1,024 buckets, 256 pages per bucket, 256 records/
256 KiB per page, 128 MiB generation payload, two slots, 8 MiB identity reservation, and a query cap of
256 sources/256 pages/8 MiB. C1 does not make these limits suitable for a 20,000-file hot-tag/long-ID
vault. They must be replaced or given terminal continuation before architecture acceptance.

## Migration, validation and next bounded slices

The retained prototype's v5→v6 upgrade creates `sourceDependencies` and independent control metadata
without rewriting source heads/families, graph snapshots, body-v2 entries or leases. C1 does not
change schema or that migration. The replacement format needs its own reviewed migration (including
already-created prototype v6 stores), with new derivative data initially non-ready. Do not rewrite
healthy source heads, downgrade unknown database versions, or discard graph snapshots to migrate.

**C2, not implemented:** owner summaries, authenticated ordered pages, local delta transaction/dirty
impact protocol, negative range proofs, concurrent CAS and bounded cleanup. Measure a one-note edit,
rename, delete/recreate, crash repair and unrelated exact query behavior on the 20,000-owner fixture.
Use the canonical replay observer only with record-level equality and unchanged policy oracles.

**C3, not implemented:** fresh host validation over persisted summaries, zero unchanged-family warm
work, long-identity/hot-key continuation, and the neighborhood/gate/search closure contracts above.
C2 and C3 are subdivisions of the **SI4b1 blocker**, not deferrals to SI5. SI4b2 remains blocked until
these obligations and the applicable real-IDB/native gates pass.

C1's actual checks: **40/40 source tests pass**, including unchanged five-policy discovery-driven
full-compiler oracles. The four new portable regressions fail on the supplied baseline (8 old tests
pass, 4 new fail), then pass with the patch. Architecture passes 7/7 and reports 60 migrated roots,
110 reachable files and zero violations. Restricted core type checking and focused strict TypeScript
checking pass using real TypeScript 5.8.3. This is not a production build.

Available Node is 22.16.0 (npm 10.9.2), below the required 22.22.2+ and review Node 22.22.3. Dependency
installation did not complete. `verify` stops at core tests: two test programs cannot import esbuild,
and the normalized fixture's missing original `Assets/picture.png` causes one assertion failure.
Official lint lacks ESLint; full build lacks type packages. Chromium 144 launches, but both real-IDB
suites stop before scenarios with `net::ERR_BLOCKED_BY_ADMINISTRATOR`. No native installation or
exact-build Obsidian validation occurred. The prior main-agent results apply to its earlier tree,
not this correction. A separate isolated indexing run fails the unchanged URL-heavy timer gate at
65.0 ms; the untouched supplied archive also fails at 50.7 ms. Single runs below the required Node
version do not establish a performance regression or its absence. `HANDOFF.md` records reproducible
commands, exact identity and remaining gates.
