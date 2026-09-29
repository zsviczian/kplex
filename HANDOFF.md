# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Offline assignment — SI3 durable neutral source repository

## Status, base and recommended chunk

Implement **SI3 only** from [the settings-independence design](docs/INDEX_SETTINGS_INDEPENDENCE_DESIGN.md), especially §§5.3, 6, 8–11 and the SI3 checkpoint row. Work from accepted commit **`ce7c038`** on branch `indexing-optimization-v2`. SI0–SI2 are accepted; their architecture and exact validation are recorded in:

- [normalized source contract](docs/NORMALIZED_SOURCE_CONTRACT.md)
- [SI2 validation report](docs/validation/settings-independent-indexing-si2-2026-09-29.md)
- [indexing architecture](docs/INDEXING_ARCHITECTURE.md)
- [settings/presentation ownership](docs/SETTINGS_PRESENTATION_OWNERSHIP.md)
- [refactor plan](Refactor%20plan.md)

The next reasonable chunk is **SI3 alone**. Do not combine SI3 with SI4. SI3 changes IndexedDB schema, migration, atomic source activation and recovery. SI4 changes live interpretation, revision-aware reads and settings behavior. Keeping them separate makes persistence failures distinguishable from policy/read-consistency failures.

Return the changes uncommitted with this file rewritten as a precise implementation return. Mark the result **Review**, never Accepted. Record the exact base available to you, every changed file, environment/tool versions, every command and its actual result, skips, limitations and any host evidence needed from the main agent.

## Product objective

Create a durable, settings-neutral per-source fact repository so acquired Markdown facts survive restart and can later be reinterpreted without rereading unchanged files. Durable progress is the set of complete activated source heads, independent of ontology, image-property and presentation settings.

This checkpoint is infrastructure. Keep the current settings-triggered semantic rebuild route and current graph snapshot acceleration until SI4 proves their replacement. Do not describe the product as settings-independent after SI3: a settings edit may still invoke the old full semantic path, although that path should be able to reuse durable source acquisition where integration is safe.

## Required investigation before editing

Trace and document the current ownership and failure behavior of:

- `src/index/IndexedDbCache.ts`, including DB version 4, stores `meta`, `pages`, `evidence`, `bodies`, `snapshotChunks`, active/checkpoint pointer schemas 1–3, `BODY_CACHE_VERSION = 2`, open/upgrade/error/reset paths, batching and cleanup.
- `GraphBuilder`/`GraphIndex` acquisition, body-cache reuse, MetadataCache readiness, startup event fencing, source fingerprinting, cancellation and publication revisions.
- SI2 neutral records, value/payload/candidate framing, shared payload ownership, complete `final` markers, source policy selection and host-resolved versus lexical target fields.
- existing browser IndexedDB harnesses, persistence tests, native migration verification and diagnostic-report allowlists.

Do not mechanically persist the current SI2 host-resolved candidate as timeless source truth. Lexical reference facts and current host resolution have different validity. Another file's create, rename, move, delete or alias change can alter resolution without changing the source file. Design the repository so lexical acquisition remains reusable and host resolution/postings can be refreshed independently through Obsidian's resolver. Preserve unresolved/literal reverse dependencies and exact targets. Core must not implement basename/path guessing.

## Required implementation

### 1. IndexedDB version and compatibility

- Recheck the implementation base, then upgrade the vault-local database from version 4 to **version 5**.
- Add focused stores equivalent to the proposed `sourceHeads`, `sourceChunks` and `sourcePostings`. Store names may change only if the code makes a clearer ownership boundary and the design docs are updated.
- Create all version-5 stores/indexes in one upgrade transaction. Preserve the existing body cache and graph snapshot stores. Do not delete or rewrite unrelated stores during upgrade.
- Keep graph snapshot schemas 1–3 explicitly readable as the existing optional acceleration. Do not silently change schema-3 meaning. A graph-snapshot failure must not invalidate neutral source heads.
- Handle an older binary opening a newer DB gracefully: report persistence unavailable for that process without deleting the database or breaking in-memory indexing.

### 2. Versioned source records and strict codecs

- Define explicit runtime-validated codecs/types for source heads, immutable chunks and postings. Distinguish DB version, source-fact format/compiler versions, body-parser version, graph-snapshot schema and semantic policy version.
- A head identifies the exact physical source identity/revision, observed path/mtime/size when known, completeness by required fact family, immutable chunk/posting manifest, relevant host observation/resolution revision and monotonically increasing durable sequence.
- Represent a successfully acquired empty source distinctly from missing, incomplete, corrupt and tombstoned records.
- Preserve SI2 reference framing and terminal markers. Reject missing/malformed chunks or truncated/post-final frames. Invalidate only the affected source/family.
- Persist the finite normalized facts needed by the accepted source contract. Do not mirror arbitrary frontmatter/property objects, settings values, note text or values that are not required inputs. Shared payloads are stored once.
- Do not fabricate unavailable metadata. In particular, legacy body records do not contain a trustworthy file size.

### 3. Atomic per-source activation

For each bounded source batch:

1. Capture physical source identity/revision plus relevant host observation revision.
2. Prepare immutable neutral chunks and postings privately with source and cancellation fences.
3. Write revision-scoped staging records in bounded transactions. Staging data remains invisible to readers.
4. Activate the complete manifest and head in one short transaction only after all required chunks/postings exist and validate.
5. Serialize replacement per source and compare the expected previous head so an obsolete writer cannot replace a newer revision.
6. After every await, revalidate current Vault identity/revision before live publication. A valid older disk head may remain durable, but must not be claimed as the current live source.

IndexedDB and in-memory publication cannot be one transaction. Model both directions explicitly:

- disk activation followed by live invalidation leaves a valid older durable head and the source dirty for retry;
- storage failure may still permit a validated in-memory commit, marked unsaved, without discarding its facts or starting a vault-wide rebuild.

Posting queries must filter through the currently activated head so old and staged revisions cannot both contribute. Cleanup must never delete a head-referenced, reader-pinned or in-flight revision. If catalog reads are uncertain, perform no deletion.

### 4. Bounded work, backpressure and interruption

- Retain the 256-record stream bound and existing platform read-byte/concurrency and cooperative scheduling constraints.
- Start from the design's 256 KiB encoded chunk target. Enforce both record and byte budgets, including an explicit simultaneous decode budget for oversized values.
- Flush a bounded pending batch at its size/byte cap, after roughly one second of active acquisition, and before reporting a successful durable stop.
- Do not assume unload awaits an asynchronous final flush. An interruption may lose only the unactivated bounded batch; activated heads remain valid.
- Apply producer backpressure when storage is slow. Do not introduce an unbounded write queue or serialize the whole graph on source progress.
- Cancellation, unload and supersession must prevent stale head activation and stale live publication.

### 5. Startup inventory, migration and selective repair

- Startup compares the captured vault inventory against valid activated heads and schedules only missing, stale, incomplete, corrupt or tombstoned sources. There is no whole-vault completion manifest rewritten per file.
- Reuse a valid legacy body record and current MetadataCache facts to construct the neutral source record without another Vault read or Markdown parse. A stale/missing body reacquires only that source. If required metadata is still pending, do not record a complete empty source.
- Preserve startup metadata stabilization and the event fence. Do not infer lexical spellings from aggregate resolved-links maps when MetadataCache does not provide them.
- Repair a missing/malformed chunk for one source without discarding unrelated heads. Corrupt graph pages/evidence/snapshot chunks likewise must not delete source facts.
- Rename/move/delete handling must preserve exact identity/latest-writer semantics, including tombstone/cleanup behavior and source-relative unresolved references.
- Host target/alias changes must be able to refresh resolution/postings without rereading or reparsing the unchanged source. When narrow impact cannot be proven, bounded re-resolution of cached lexical candidates is acceptable.

### 6. Storage unavailable and diagnostics

- Keep the same fact/interpretation boundary in memory when IndexedDB is unavailable. Continue correct live indexing, report unsaved status and retry with bounded backoff. A process restart may reacquire because persistence was unavailable; do not report this as a settings invalidation.
- Failed opens, upgrades and transactions must clear unusable handles/readiness promises. Do not leave a closed connection reporting ready.
- Diagnostics may expose version, family/reason codes, counts, byte/chunk totals, durations and durable sequence ranges. They must not expose file paths, filenames, property names, reference text, note contents, settings values or raw exceptions containing those values.
- Use stable allowlisted reason codes. Keep development fault injection and test controllers out of production output.

## Scope boundaries

Do not implement:

- SI4 settings dispatch, demand-driven reinterpretation, policy-revision UI/read migration, or removal of the current settings-triggered rebuild path;
- SI5 performance acceptance, physical-mobile lifecycle policy, memory tuning claims or release readiness;
- a second semantic classifier, graph journal, whole-vault DTO, duplicate permanent graph, custom Markdown parser, custom Obsidian path resolver or new public API;
- broad C15–C26 refactoring, UI redesign, settings-key/default migration, commands, CSS or unrelated cleanup.

Preserve the synchronous accepted publication boundary and existing semantic resolver. Any necessary integration should remain narrow and reversible. If SI3 cannot safely provide one planned source family from current accepted facts, stop short of inventing data and document the exact gap.

## Mandatory tests and acceptance evidence

Add production-module tests, not parallel test-only implementations. Real browser IndexedDB coverage must supplement any mocks. Exercise at least:

1. Cold version-5 creation and version-4 upgrade preserve bodies and graph snapshot stores while adding current stores/indexes.
2. Fault injection before chunks, between chunks, before head activation and during activation leaves the old head readable, staging invisible and retry safe.
3. Activated A/B plus interrupted C survives a new cache instance with A/B durable and only C pending.
4. Missing/malformed chunk or posting invalidates/repairs only its source/family.
5. Codec/privacy checks reject arbitrary property mirrors, incomplete reference frames and post-final records.
6. Valid legacy body plus ready MetadataCache migrates/acquires with zero Vault reads and zero Markdown parses; one stale/missing source alone is reacquired; absent size is not fabricated.
7. Ontology, image-property and presentation changes do not invalidate neutral source heads; source-fact format changes do.
8. Create/rename/move/delete/alias changes refresh target resolution/postings without body parsing and without losing lexical candidates.
9. Concurrent replacement and cancellation prove expected-head/latest-writer behavior and no stale activation after unload/supersession.
10. Quota/open/transaction failure continues correct in-memory indexing, never claims false durable progress and recovers through bounded retry.
11. Batch/chunk byte limits, oversized payload decode limits, flush deadline and storage backpressure are deterministic under fake time/fault control.
12. Existing graph active/checkpoint restore remains compatible and optional; damaging a graph snapshot does not remove source heads.
13. Newer-DB `VersionError` leaves the DB intact and falls back safely.
14. Diagnostics expose only allowlisted aggregate fields and reason codes.
15. Fresh-process restart restores activated source facts and selective dirty work rather than reacquiring every Markdown file.

Update architecture docs and `Refactor plan.md` with **Review** status and actual limitations. Document changed public functions/classes using the repository convention. Do not mark SI3 accepted, remove the transitional warning or claim settings-change latency improvements.

## Offline validation

Use the repository-required Node range (`>=22.22.2 <23`) if available and record exact versions. Run, as available:

```text
git diff --check
npm run verify
```

Also run the narrow source-repository and real-browser IndexedDB suites directly so their results are visible. A missing Node version, dependency, browser, network, Git history or Obsidian runtime must be recorded as unavailable; do not replace it with a stub or count a skipped lane as passed.

## Main-agent validation after return

The main agent will independently:

- review the migration, codecs, source/host validity split, bounded writes and all failure paths;
- run the exact Node 22.22.x aggregate verification and focused real-Chromium IndexedDB tests;
- run strict native migration/build verification in Obsidian;
- probe restart reuse with read/parser counters, partial interruption, one-source corruption/repair, storage-unavailable behavior and graph-cache damage;
- exercise create/rename/move/delete/alias resolution refresh without source parsing;
- verify source/installed artifacts, error capture, cleanup and Git diff/status before acceptance;
- decide whether a physical-device interruption test is needed now or remains an SI5/release gate.

Do not commit, push, create a PR, merge, release, publish or mutate a real user vault.
