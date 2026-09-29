# SI3 neutral source repository — Accepted

This is the accepted SI3 implementation contract. SI4 demand-driven interpretation and SI5 lifecycle/performance acceptance are not implemented. The existing hierarchy/image settings route still rebuilds semantic graph state; neutral acquisition can be reused along that route.

## Ownership and the transitional graph path

`src/index/SourceFacts.ts` defines the versioned storage vocabulary and strict frame/body codecs. It reuses the canonical parser's property-value, reference and payload iterators. `src/index/SourceRepository.ts` owns immutable source transactions, manifests, head selection, dependency queries, reader leases and bounded storage-degraded facts. It does not access Vault, select policy, classify relationships or serialize GraphState.

`src/adapters/obsidian/sourceAcquisition.ts` owns observed file incarnations/events, MetadataCache readiness, legacy migration, inventory and host resolution. It calls the existing exported `resolveObsidianReferenceTarget()` and Date collector. No path/basename guesser, Date grammar or semantic classifier is added.

`KplexIndexedDbCache` remains the single connection owner. Incremental `GraphBuilder` calls acquisition **before semantic no-op suppression**. A complete semantic rebuild uses neutral facts for body reuse but leaves source activation to the independent inventory after authoritative publication; it does not wait for a source write per note. `GraphIndex` also starts inventory after complete snapshot hydration. Preview/checkpoint hydration does not claim source completeness. The C14 publication callback remains synchronous; private source staging and graph preparation are asynchronous and separately fenced. Staging can add private-path latency; no latency improvement is claimed.

## Version-5 database and compatibility

The existing vault-local database name is retained. The version-4-to-5 upgrade creates all new stores/indexes in the one IndexedDB upgrade transaction. It preserves `meta`, `pages`, `evidence`, `bodies` and `snapshotChunks`, graph schemas 1–3, active/checkpoint meanings and body parser version 2.

| Store | Primary key | Indexes / purpose |
| --- | --- | --- |
| `sourceHeads` | `sourceId` | Selected complete or tombstone manifest for a physical binding |
| `sourceChunks` | `[sourceId, revision, family, index]` | `sourceRevision`, `sourceFamilyRevision`; immutable JSON fact frames |
| `sourcePostings` | `[sourceId, revision, family, index]` | Same revision indexes plus composite `lookup` on `[kind,key,sourceId,revision,family,index]` |
| `meta` (existing) | `key` | Adds `sourceLease` on `[sourceId,revision]`; source sequence and persistent lease records are separate from graph pointers |

Version domains remain distinct: database **5**, source-fact format **1**, source-fact compiler **1**, immutable body parser **2**, host-resolution format **1**, graph-snapshot schemas **1/2/3**, and the unchanged semantic/settings signature versions. Unsupported source versions reject that source, not other heads or graph stores.

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

## Head validity and atomicity

Heads carry an opaque physical incarnation, observed path/mtime and actual size/ctime when available, immutable family revisions/counts/digests, source revision, host session/revision/environment digest and a positive durable sequence. A tombstone contributes no dependencies. A complete empty family has an explicit final chunk, not a missing record.

Writers capture a previous-head expectation and stage immutable revision-scoped chunks/postings in bounded transactions. Producers and codecs validate exact allowlists and frame finality before staging; activation atomically checks that all declared chunk and posting counts committed. A subsequent read validates hashes, contents, contiguous payload/candidate frames and regenerated postings before reuse. Valid unchanged families can retain their immutable revisions while resolution alone is replaced.

One short transaction rechecks the expected head and family counts, increments `source-sequence` and selects the complete head. Same-source work has one active and one replaceable pending producer; an obsolete independent writer loses the compare-and-swap. A canceled or unloaded writer cannot select a head after its fence fails. Intentionally canceled transactions are distinguished from unexpected aborts, which enter storage-degraded recovery.

Disk and live publication are **not one transaction**. A committed head can become older than the current Vault observation before live publication; the caller must reject live publication and reconcile again. Conversely, storage failure can retain validated neutral facts in memory and let the separately validated live graph proceed with unsaved status and no durable sequence. This does not start a graph-wide failure/rebuild loop.

`querySources()` returns invalidation dependencies, not semantic contributions. It filters postings against currently selected family revisions and masks disk entries with current unsaved/tombstoned views. Its consumers must validate a source/family before interpretation. Staged/retired revisions do not both contribute.

## Bounds, flush and cleanup

Ordinary chunks target **256 KiB** and at most **256 records**. Payload pieces retain the canonical **16,384 UTF-16-code-unit** bound. An indivisible identity record may travel alone, subject to a **4 MiB encoded ceiling** and the stricter decode reservation. No record is silently truncated. An active batch also flushes on the next cooperative step after approximately one second, and every family flushes its final chunk before activation.

The repository reserves at most **8 MiB simultaneously for encoded/decoded chunk representations** across its active reads. Frame identity/deduplication tracking and reconstructed parser-body assembly have their own explicit **8 MiB** guards; these are not included in the chunk-reservation metric or a total-process heap claim. Oversized/unsupported inputs return closed reason codes while the established live graph path remains available.

There are at most two source writer lanes and one tombstone transaction task. Producers await chunk and posting transactions; they do not accumulate an unbounded promise queue. Transaction watchdogs are five seconds. Existing platform Markdown read concurrency/byte limits stay in GraphBuilder; standalone inventory loads one body at a time. `flush()` waits for active/latest writers, attempts bounded unsaved retries and reports success only when no known unsaved source remains. Unload aborts work and does not promise an awaited final flush.

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
