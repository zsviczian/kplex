# SI3 neutral source repository — Accepted

This is the accepted SI3 persistence contract and historical contributor prototype record. The live SI4 route now uses the additive durable source-local dependency index and requested cached neighborhood/degree preparation; see [implemented indexing architecture](INDEXING_ARCHITECTURE.md) and [the independence design](INDEX_SETTINGS_INDEPENDENCE_DESIGN.md). The rejected S2b all-owner experiment remains excluded. The old global contributor bootstrap and cached preparation wrappers have been removed from application acquisition and retained only in test fixtures; repository APIs and stores required to read historical derived data are deliberately preserved for compatibility under the accepted [SI5 retirement audit](validation/settings-independent-indexing-si5-closeout-audit-2026-10-04.md). Settings never select source validity or schedule a full graph rebuild for valid facts.

## Ownership and the transitional graph path

`src/index/SourceFacts.ts` defines the versioned storage vocabulary and strict frame/body codecs. It reuses the canonical parser's property-value, reference and payload iterators. `src/index/SourceRepository.ts` owns immutable source transactions, manifests, head selection, dependency queries, reader leases and bounded storage-degraded facts. It does not access Vault, select policy, classify relationships or serialize GraphState.

`src/adapters/obsidian/sourceAcquisition.ts` owns observed file incarnations/events, MetadataCache readiness, legacy migration, inventory and host resolution. It calls the existing exported `resolveObsidianReferenceTarget()` and Date collector. No path/basename guesser, Date grammar or semantic classifier is added.

`KplexIndexedDbCache` remains the single connection owner. It also owns narrowly scoped, temporary existing-database handles used only to retire an ended contributor reader after normal-handle failure; they cannot make the normal writer available. Incremental `GraphBuilder` calls acquisition **before semantic no-op suppression**. A complete semantic rebuild uses neutral facts for body reuse but leaves source activation to the independent inventory after authoritative publication; it does not wait for a source write per note. `GraphIndex` also starts inventory after complete snapshot hydration. Preview/checkpoint hydration does not claim source completeness. The C14 publication callback remains synchronous; private source staging and graph preparation are asynchronous and separately fenced. Staging can add private-path latency; no latency improvement is claimed.

## SI4a selected-head read capability — Accepted

[Cached-source replay](CACHED_SOURCE_REPLAY.md) documents the fact inventory, missing host inputs, bounded owner scope and later GraphIndex read consumers. `readSelected()` holds one selected head and its family leases across serialized family visits, preserving the existing hash/frame/posting validation. It returns a finite ready/pending/stale/cancelled/invalid-family/storage-unavailable result. Expected durable sequence, source incarnation and host observations are independent of semantic policy. Final multi-owner validation reads at most 256 selected heads in one transaction and rechecks local masks and caller fences after the await.

Reader release uses the original connection and is initiated synchronously on repository close; success awaits release before its final fence. Release failure remains conservative orphan protection, not a new crash-reclamation guarantee. Evicted unsaved facts mask posting results as well as head reads. Known incomplete posting queries fail rather than certify empty relationships. The v5 posting vocabulary still cannot certify bounded exact pair coverage, structural/URL referrer completeness or absence after a missing lookup row; every discovered list is explicitly candidate-only.

`SourceReplay.ts` reconstructs normalized facts without Markdown IO/parsing or source-head writes. `CachedSourceSemantics.ts` composes the portable scope preparer under source/host/policy revisions. The Obsidian acquisition adapter supplies only missing revision-fenced current entity/structural/presentation facts. SI4a changed no live GraphIndex route, database schema, graph snapshot format or C14 publication owner. Its accepted validation is recorded in the linked replay document; the separate SI4b1 prototype below remains rejected; C1 does not change replay authority.

## SI4b1 exact discovery — rejected lifecycle; C2-S1 summary prerequisite accepted

[Contributor discovery](SOURCE_CONTRIBUTOR_DISCOVERY.md) records the rejection, delivered C1 slice,
positive/negative proof obligations, and proposed replacement index. The internal prototype returns
finite conservative direct-incidence owner covers plus separate host facts, or closed non-ready
results. Existing `querySources()` and SI4a `discover()` remain candidate-only. No settings,
publication, search, gates or UI consumers use the new path.

The unaccepted `sourceDependencies` prototype retains its two immutable catalog slots in database
v7. A SHA-256-committed bucket manifest detects omitted lookup pages/rows. S2 now retains old root
commitments and owner evidence in a separate durable journal before mutation. Head activation and
explicit repair selection are atomic across connections; open repair tickets mask public discovery. **Neither C1 nor C2-S1 replaces this full-rebuild lifecycle:** edits
and new sessions still require all-owner replay before exact readiness. Fusing owner summaries into
the four-family replay reduces one 20,000-owner catalog build from 140,000 to 80,000 family visits,
not to four visits per edit. Host reacquisition is additional work. This remains an SI4b1 blocker,
not an SI5-only performance limitation.

### C2-S1 persisted owner summaries — accepted prerequisite, no local transaction protocol

`SourceRepository` was unchanged by S1; the S2 changes below now own the repair protocol. The discovery layer now selects derivative root
format 2, with an independent original commitment for each owner's sorted key pages. It binds those
pages to the exact source revision/durable sequence and authenticates them under the existing root.
`readOwnerSummary()` and source-owner discovery require all original summary pages and final head/
root fences. A missing owner is pending/missing, not authoritative absence; a selected owner with a
missing summary lookup is invalid. No whole-source-family or Markdown read is needed to read an
intact selected summary, but whole colliding hash buckets are still authenticated within query caps.

Summary preparation shares `readSelected()` through the canonical replay's awaited observer. It
never opens a second pin or rewrites a head; cancellation and late family/head failures release the
existing lifetime and expose no summary. Independent 8 MiB owner-key reservations do not replace the
repository's aggregate decode, replay-join or body-reconstruction guards. Zero family visits for a
summary lookup or deletion delta does not mean zero durable lease/head/root transactions.

`prepareContributorOwnerDelta()` computes private removed/added/affected key sets from explicitly
validated old/new states. It neither retires tickets nor activates an index. Public summary reads
still require a current selected root. S2 adds a separate pinned historical reader and durable repair
state; it is not a public-read bypass. Complete changed-host closure and S3 local source/host/root
selection plus authenticated tree-path reclamation remain outstanding. SourceId,
NodeId and path facets remain distinct; source and host owners are not merged. The full protocol and
executable A-adds-B/unchanged-C counterexample are in the discovery document.

### C2-S2a durable owner repair — accepted narrower prerequisite

`SourceContributorJournal.ts` contains strict version-1 storage envelopes only; `SourceRepository`
owns their transactions. Once a catalog exists, the source begin transaction writes UNKNOWN with
an opaque writer ticket, original selected head and original root pointer, before family staging.
It preserves the first anchor across repeated edits and records each immediate predecessor. The
existing source activation transaction checks predecessor/head/ticket, selects the new head or
explicit absence, updates repair selection, and settles only C1's staging ticket. The repair ticket
remains unknown, or later known after separately fenced preparation. It never makes queries ready.

Full old root records are shared in two fixed `meta` anchors; each owner stores only a digest/build
reference. Historical owner-summary reads pin the slot persistently and authenticate original pages
through the same discovery readers. Both owner pins and reader leases prevent slot reclamation.
A complete explicit all-owner bootstrap may clear the repair journal at its existing global CAS;
known-impact preparation may not. This preserves the explicit global repair route without adding
S3 local publication. A fixed dirty-owner-count ceiling is intentionally avoided because it could
block source persistence, then prevent that full repair. Disk journal rows scale with dirty owners,
not with total root size per owner; per-record/read limits and storage quota remain explicit.

Recovery enumerates up to 64 dirty IDs per call without scanning unchanged heads. A journal row is
at most 2 MiB encoded; impact payloads are at most 256 KiB. There are two historical-read reservations
per repository, taken before opening storage. Active and unreleased retired readers share this bound;
a failed retirement cannot create an unbounded retry queue. C1 source-family leases, source-memory
bounds, retained rename bodies and tombstone authority remain separate. Historical root leases
are not expired by a timer. The correction below adds acknowledged deletion and deterministic
live-instance retry; a lost process with unavailable storage can still leave a conservative pin.

The host adapter has one active plus one coalesced pending journal observation and uses the existing
retry timer. `flush()` also drains observed host writes but does not prove host coverage or retire
impact tickets. Event work synchronously invalidates local host authority before awaiting storage.
Date/Daily input validation remains reversible; its durable host UNKNOWN is not silently erased by
restoring the setting. Before source-head activation, unfinished host journaling causes unsaved
backpressure rather than a new durable head without the corresponding repair fence.

The accepted S2a single-owner API certifies impact only under the unchanged original canonical
host capability and with no open host ticket. The excluded S2b terminal-group API, described historically below,
was a rejected small-catalog changed-host resolver/structural/Date/Daily experiment. It reobserved
all admitted owners and is not accepted incremental closure. Incomplete or stale transitions still
stay UNKNOWN; the correction adds no new certified mutation class. See the discovery contract for the C→Alias counterexample,
exact CAS, scopes and pending validation. No source/body/graph format,
canonical parser/compiler/resolver, GraphIndex, settings or UI consumer is changed.

### C1 deletion capability and authoritative completion — focused main-agent validation recorded

A tombstone immediately masks its owner, then uses an identity-current pending-deletion capability
to pin a masked disk head **only as CAS input**. Previously its own `unsaved` mask prevented that pin,
so a disk-only deletion could never settle. `includeTombstone` is not the new capability: ordinary
readers, including retained-body readers, cannot bypass an evicted unsaved mask. Selection still
pins existing family revisions; expected-head and exact dirty-ticket checks still govern activation.

If a newer unsaved payload was evicted, the older disk body's families cannot be retained for a
rename. A coalesced delete can drop retention but never restore it. A stale retry snapshot cannot
delete a newer pending request. After any awaited activation/absence transaction, only the still
current request may clear its memory/unsaved mask; an older writer must not clear a newer deletion.

Cancelling an absence predicate is not an authoritative observation of the owner's current state.
Stop retrying that predicate, but leave its unsaved mask and durable dirty ticket until a fresh valid
replacement or absence operation repairs them. A stale request cannot consume another writer's
newer ticket. An authoritative missing-head deletion rechecks absence and settles its ticket in the
same transaction. Crash recovery therefore remains owner-specific when a fresh authoritative
presence/absence operation exists, not a timer-based cleanup of arbitrary dirty control records.

`acquisition.reconcile()` can return while an event-side tombstone is queued. A caller requiring
durable completion must await `repository.flush()` and require `true`; failure/backpressure remains
non-ready. Flush is a fence for this repository's known work, not proof of a complete host inventory,
remote writer completion or exact contributor coverage. C1's browser lifecycle test uses that fence
rather than sleeping or deleting masks. C1's prior main-agent browser/native validation is recorded
in `Refactor plan.md`. This return preserves those cases; the main-agent real-Chromium run passed
30/30 IndexedDB tests on the reviewed tree. Portable tests alone would not establish durability.

A tombstone itself visits zero source families. It selects one head, owns at most four family-revision
leases, and affects only that source's families; later retained-body reads and retired-chunk cleanup
are separate work. No new lease expiry, source codec, host freshness rule or semantic owner is added.
See the discovery document for the next C2/C3 implementation gates and unchanged full-rebuild limits.

## Database compatibility: accepted v5, existing v6 and additive v7 journal

The existing vault-local database name is retained. The version-4-to-5 upgrade creates all new stores/indexes in the one IndexedDB upgrade transaction. It preserves `meta`, `pages`, `evidence`, `bodies` and `snapshotChunks`, graph schemas 1–3, active/checkpoint meanings and body parser version 2.

| Store | Primary key | Indexes / purpose |
| --- | --- | --- |
| `sourceHeads` | `sourceId` | Selected complete or tombstone manifest for a physical binding |
| `sourceChunks` | `[sourceId, revision, family, index]` | `sourceRevision`, `sourceFamilyRevision`; immutable JSON fact frames |
| `sourcePostings` | `[sourceId, revision, family, index]` | Same revision indexes plus composite `lookup` on `[kind,key,sourceId,revision,family,index]` |
| `sourceDependencies` (created in v6) | `[slot,bucket,index]` | Existing derivative generations and format-2 summaries are preserved |
| `sourceImpacts` (v7, review) | typed owner tuple string | `rootSlot` protects the original catalog slot; one current ticket per dirty owner |
| `meta` (existing) | `key` | Adds `sourceLease` on `[sourceId,revision]`; source sequence and persistent lease records are separate from graph pointers; v6 also adds catalog root/build/mutation control records |

Old derivative root format 1 is rejected without resetting an already-created v6 database. Explicit
bootstrap can replace only the derivative root/pages with format 2; accepted source/body/graph records
are not rewritten. The v5→v6 upgrade itself is unchanged. Main-agent real-Chromium migration and
preservation checks passed; the overall SI4b1 migration/lifecycle is still not accepted.

Version domains remain distinct: database **6** in the unaccepted prototype (accepted SI3/SI4a used **5**), derivative root **2**, owner summary **1**, source-fact format **1**, source-fact compiler **1**, immutable body parser **2**, host-resolution format **1**, graph-snapshot schemas **1/2/3**, and the unchanged semantic/settings signature versions. Unsupported source versions reject that source, not other heads or graph stores.

Failed opens/upgrades, blocked/time-limited opens and failed transactions invalidate the owning handle/readiness promise. Late connections are closed. Retry delays are 1, 5 and then 30 seconds. A newer database's `VersionError` makes this process persistence-unavailable; it never deletes or downgrades the database. Source and legacy methods share this owner, including synchronous transaction-open failures.

## Stored families and privacy boundary

A complete source selects exactly four independently manifested families:

| Family | Retained inputs |
| --- | --- |
| `values` | All reference-bearing frontmatter values, physical inline values and exceptional inline-map parser membership. Exact original/normalized field names, identity/location/syntax, once-per-value payload chunks and lexical candidates with final markers. Plain inline parser values remain available for later parser-input replay. |
| `body-urls` | Established parser URL, optional label and genuine line facts. No complete Markdown text. |
| `metadata` | Aliases, tags, containing folder, name-only field discovery and genuine MetadataCache link/embed spellings and coordinates. |
| `resolution` | Current host target per lexical candidate/literal; resolved/unresolved aggregate host counts; current Date/Daily Notes facts from the existing host collector. |

Arbitrary non-reference frontmatter values, general property objects, K-Plex settings, selected roles and image flags are not mirrored. A reference-bearing property's original value is retained only as the accepted explanation input. Inline payload storage serves both provenance and immutable parser replay: the original value is not stored again for every candidate. Aggregate resolved-link maps do not invent missing lexical spellings or positions.

Lexical candidates are deduplicated only by exact lexical identity, **before resolved-target deduplication**. `[[Alias]]` and `[[Target]]` therefore both survive even when the host currently maps them to the same file. Current target selection is a separate resolution family. The SI2 compiler-facing frames are unchanged; this storage vocabulary is not a second semantic interpretation path.

The v7 upgrade creates `sourceImpacts` and the `meta.sourceImpactSlot` index in the upgrade
transaction, without rewriting any existing v5/v6 record. `meta` later holds a journal-enabled
marker, at most two shared original root anchors and active historical-reader leases. Derivative
root format 2 and source-fact versions do not change. Newer databases are rejected, never reset.
The main-agent real-Chromium run passed the actual-v6 upgrade and retained v5 compatibility cases,
as well as the journal fault/concurrency suite. This accepts the journal prerequisite only; it does
not certify changed-host closure or the indexing lifecycle.

## Head validity and atomicity

Heads carry an opaque physical incarnation, observed path/mtime and actual size/ctime when available, immutable family revisions/counts/digests, source revision, host session/revision/environment digest and a positive durable sequence. A tombstone contributes no dependencies. A complete empty family has an explicit final chunk, not a missing record.

Writers capture a previous-head expectation and stage immutable revision-scoped chunks/postings in bounded transactions. Producers and codecs validate exact allowlists and frame finality before staging; activation atomically checks that all declared chunk and posting counts committed. A subsequent read validates hashes, contents, contiguous payload/candidate frames and regenerated postings before reuse. Valid unchanged families can retain their immutable revisions while resolution alone is replaced.

For a single-chunk disk family, the chunk and first byte/record-bounded posting page share one readonly transaction. A decode-budgeted preview determines that page's exact range; it grants no authority. Normal SHA/frame/posting/final-manifest validation and selected-head/lease fences still run before reuse. Remaining posting pages, multi-chunk families and memory fallback retain their ordinary read path. Invalid previews fall back to the original failure classification, and every terminal path releases the decode reservation.

One short transaction rechecks the expected head and family counts, increments `source-sequence` and selects the complete head. Same-source work has one active and one replaceable pending producer; an obsolete independent writer loses the compare-and-swap. A canceled or unloaded writer cannot select a head after its fence fails. Intentionally canceled transactions are distinguished from unexpected aborts, which enter storage-degraded recovery.

Disk and live publication are **not one transaction**. A committed head can become older than the current Vault observation before live publication; the caller must reject live publication and reconcile again. Conversely, storage failure can retain validated neutral facts in memory and let the separately validated live graph proceed with unsaved status and no durable sequence. This does not start a graph-wide failure/rebuild loop.

`querySources()` returns invalidation dependencies, not semantic contributions. It filters postings against currently selected family revisions and masks disk entries with current unsaved/tombstoned views. Its consumers must validate a source/family before interpretation. Staged/retired revisions do not both contribute.

## Bounds, flush and cleanup

Ordinary chunks target **256 KiB** and at most **256 records**. Payload pieces retain the canonical **16,384 UTF-16-code-unit** bound. An indivisible identity record may travel alone, subject to a **4 MiB encoded ceiling** and the stricter decode reservation. No record is silently truncated. An active batch also flushes on the next cooperative step after approximately one second, and every family flushes its final chunk before activation.

The repository reserves at most **8 MiB simultaneously for encoded/decoded chunk representations** across its active reads. Frame identity/deduplication tracking and reconstructed parser-body assembly have their own explicit **8 MiB** guards; these are not included in the chunk-reservation metric or a total-process heap claim. Oversized/unsupported inputs return closed reason codes while the established live graph path remains available.

There are at most two source writer lanes and one tombstone transaction task. Producers await chunk and posting transactions; they do not accumulate an unbounded promise queue. Transaction watchdogs are five seconds. Existing platform Markdown read concurrency/byte limits stay in GraphBuilder; standalone inventory loads one body at a time. `flush()` waits for active/latest writers, attempts bounded unsaved retries and reports success only when no known unsaved source or pending observed host journal write remains. It does not settle repair tickets. Unload aborts work and does not promise an awaited final flush.

Reader leases reside in `meta`, allowing cleanup to coordinate across connections. A reader pins all selected revisions atomically with head selection. Cleanup accepts an explicitly known retired revision and atomically refuses head references, persistent leases, active local writers or uncertain catalog state. New staging revisions use unique IDs and are never passed to this retired-revision cleanup before activation. Normal replacements and final tombstones attempt reclamation after pins are released. Crash/failed-release reader leases are deliberately **not expired by a wall-clock guess**: a suspended WebView may still own them. Consequently orphan staging and crash-pinned revisions can remain indefinitely. No destructive whole-database reset or unproven stale-owner collector is included.

## Inventory, migration and host invalidation

Startup after authoritative publication reconciles current Markdown files against heads. A different process/session epoch validates families and re-resolves cached lexical inputs through Obsidian. Valid neutral body inputs are preferred to body-v2; a valid legacy body plus ready MetadataCache migrates without a Vault read or parser invocation. Only actual body misses are read/parsed. Legacy body-v2 has no trustworthy size: its record is not upgraded by inventing one; a new head records size observed from the current TFile.

Missing MetadataCache is `pending-metadata`, not a successfully empty source. One damaged source/family is repaired independently; intact body inputs can survive corruption of metadata/resolution. Damage to graph pages/evidence/snapshot chunks does not delete neutral sources. Already validated current-session heads can use the cheap inventory head check; corruption introduced later without a source/host change is detected on the next full inspection/new session, not by an always-on integrity scrub.

Vault create/modify/rename/delete and MetadataCache changed/resolved events advance the independent source/host fences, even when the graph suppresses semantic work. Observed equal-mtime/equal-size content edits bypass hot, neutral and legacy bodies; GraphBuilder also captures the adapter's per-file revision around awaits. Metadata-only/target-only changes preserve parser inputs. Observed pure moves can temporarily retain the tombstoned old binding's validated body until the new binding is acquired, then clear/reclaim the old family references.

When narrow impact cannot be proven, one coalesced inventory replays cached lexical references rather than implementing custom resolution. A 30-second inventory poll notices Date-property registry / Daily Notes configuration changes for which this adapter has no reliable public configuration event. Their narrow descriptor is hashed; its values do not appear in diagnostic output. No K-Plex ontology/image/presentation setting enters source validity.

## Explicit limitations and validation boundary

Storage-degraded encoded facts use a **16 MiB aggregate memory cache** (and a bounded per-writer preparation buffer). Eviction retains the unsaved source ID but not all evicted payloads and masks an older disk head for that source. Later acquisition may therefore need that source's body again; a source larger than the bound may have no complete memory view. This is an accepted bounded SI3 limitation, not proof of zero-reacquisition under prolonged storage failure or SI5 memory acceptance. Unsaved IDs remain visible so eviction cannot falsely advance durable progress. The existing live graph remains the current publication owner, not a fallback source repository.

Unobserved equal-stat edits while the process is stopped cannot be detected from body-v2 or path/mtime/size/ctime alone; no unavailable content hash is fabricated. A rename performed while no TFile incarnation is observed can similarly require ordinary per-path reacquisition. Conservatively retained crash leases need a separately proven reclamation policy. Large-vault host-event replay and private-path staging latency remain unmeasured.

Diagnostics expose only fixed versions, counts, chunk/byte totals, sequence ranges, bounded decode counters, closed family/reason codes and storage state. `activated` counts heads validated/activated by this instance, not an unverified whole-vault total; `empty` is an activation counter. `unsaved` is independent of older durable progress. Paths, filenames, property names, raw targets/payloads/settings and raw exceptions are excluded from exported diagnostics. The host acquisition counters are aggregate-only.

Run `npm run test:sources` for production-codec/storage-unavailable, host acquisition and actual GraphBuilder integration tests. Run `npm run test:sources:browser` for real Chromium migration, immutable writes, faults, CAS/pins, corruption, new-process restart and VersionError tests. `KPLEX_TEST_BROWSER` (or `KPLEX_CHROMIUM`) selects the executable. The browser suite fails if the browser is absent or administratively blocked; it does not replace real IndexedDB with a mock.

Main-agent acceptance used Node 22.22.3: the complete `npm run verify` lane, all 15 focused source tests, nine real-Chrome IndexedDB scenarios, official lint and the production build passed. The exact installed bundle passed the strict Obsidian migration suite in the 20,015-note `kplex-test` vault. One owned note was acquired, survived plugin reload with zero source Vault reads/parses, and was removed; the test vault returned to ready with no captured errors. The [SI3 validation report](validation/settings-independent-indexing-si3-2026-09-29.md) records hashes, corrections and limits. Physical-device and whole-vault inventory throughput acceptance remain SI5 work.

### S2b terminal changed-host group — preserved historical experiment, absent from this package

The following describes the rejected prototype, not a current callable API.
`storeContributorHostImpact()` was a separate explicit repair operation. It hashes one bounded
host proof and small per-source member references before opening a single `sourceImpacts` +
`sourceHeads` + `meta` transaction. The transaction verifies every captured journal authority,
selected source head, original shared root-anchor bytes, global dependency revision/sequence,
zero staging dirtiness, exact journal membership count and the live host completion fence. Only
then are all source member references and the terminal host row marked KNOWN atomically. A
source omitted from the group, concurrent ticket/head/root change or transaction abort cannot
expose a complete smaller group. Member data and digests are both compared during revalidation.

The journal envelope stays version 1, database version stays **7**, and derivative root format
stays **2**. The impact field holds additive version-2 `complete-host-impact` or
`host-transition-member` bodies under existing size limits; no store, index or upgrade changes
are required. The old unchanged-host version-1 impact API remains separate. Historical pins and
all tickets survive the new write. No source/body/graph data or root is deleted/reselected.
`validateContributorHostImpact()` rechecks the complete group without source-family replay.
The discovery layer additionally requires its original live completion seal and authenticated
historical pages; a disk KNOWN status alone never grants authority after reopen or unload.


### Contributor root-lease retirement correction — returned, not accepted

The incoming abort/quota failure closed the normal cache connection before journal-reader cleanup.
The old release path then tried the closed handle and forgot its in-memory ticket on error/abort,
leaving a disk pin with no deterministic live-instance retry. This correction changes **only the
historical contributor reader's retirement**, not source-family leases or semantic proof authority.
Database **v7**, derivative root format **2**, and the persisted `{ key, impactSlot }` lease envelope
are unchanged. No destructive store reset, migration, or root publication is added.

The repository now retains the exact lease and its `active` state. Every escaped historical `page`
capability checks that state before reading and after awaited transaction work. Callback completion
or repository close ends the capability *before* retirement; cleanup cannot race with a still-valid
late page callback. A final journal CAS still uses the original transaction owner and original
current/ticket fences. Cleanup on a fresh handle cannot turn a failed normal operation into KNOWN.

`SourceContributorLease.ts` owns a bounded, storage-only deletion transaction. It reads the exact
key in `meta` and compares the complete original envelope. It queues deletion only on an exact
match; a different slot, malformed or extended envelope remains protected. Absence is idempotent.
**Only transaction completion** acknowledges deletion/absence. Request success, error, abort,
synchronous exception and timeout cannot discard the repository's retirement ticket.

A retirement attempt first uses the original handle. On failure it can make one cleanup-only open
through `KplexIndexedDbCache`, at the exact existing database name and version. Upgrade/creation is
aborted; a newer version, blocked open or unavailable storage yields failure. A late open closes
its eventual handle. All successful temporary handles close after the deletion transaction, even
on failure. Normal connection state, unavailable/newer-database state and writer backoff are not
reset. The open and each transaction have owned five-second *operation* timeouts; they abort/stop
work and retain the pin, never infer a reader's death from elapsed time. An attempt has at most one
original transaction and one fresh open/transaction; it does not immediately loop on failure.

Failed cleanup retains at most two retired/active tickets per repository. Concurrent attempts share
the same promise. `retryRetiredContributorLeases()` snapshots this bounded queue and retries only
ended readers once; it returns false while any ended ticket remains. The next journal read and
`flush()` invoke it, providing a deterministic later reclamation boundary after storage recovery.
`close()` invalidates readers and starts cleanup but does not promise an awaited durable flush.
No persistent scan or background retry timer is introduced. A normal source `flush()` result still
means no known unsaved source/host work; it does **not** certify that every lease was reclaimed.
Use the explicit retirement result when that distinction matters. Additional journal admission
fails closed rather than accumulating more pins when both retirement slots remain occupied.

This is **live-owner recovery**, not cross-process orphan reclamation. A different connection can
observe the pin but may not delete it without proof of its owner's ended lifetime. If the owning
process is lost while all deletion attempts fail, its in-memory retirement authority is lost and
the disk pin stays conservative. Persisting a retirement intention safely through an unavailable
database, or proving a crashed owner using a supported cross-context lifetime protocol, remains a
separate design task. No crash-reclamation guarantee, wall-clock expiry, active-reader eviction or
newer-database adoption is claimed.

The new portable tests exercise actual production cleanup/retry control flow through explicitly
controlled event ports; they are not IndexedDB atomicity evidence. Real Chromium tests retain the
original no-KNOWN-prefix/zero-lease assertion after abort/quota and add failed-cleanup retention,
two-connection active-reader protection, explicit later reclamation, aborted-deletion/flush retry,
escaped page-capability cancellation, and missing/older/newer database behavior. In this return all
81 source tests and architecture checks pass. Chromium assertions remain **pending** because all
four suite launches fail at `ERR_BLOCKED_BY_ADMINISTRATOR`. Real build/lint are dependency-blocked;
see HANDOFF and the action log for exact checks. The main agent must validate the lease slice
independently; none of this accepts the retained atlas, supplies a 20,000-owner locality result,
or completes C2-S3/C3.
