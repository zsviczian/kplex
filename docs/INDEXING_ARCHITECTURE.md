# K-Plex indexing architecture

K-Plex deliberately separates **what the vault says** from **how K-Plex resolves that evidence into a visible graph**.

## Pipeline

```text
Vault tree / tag tree / Obsidian links / frontmatter / body fields / Date properties / URLs
                                  │
                                  ▼
                          RelationEvidence[]
                     (with source provenance)
                                  │
                                  ▼
                         RelationResolver
                 precedence + relationship truth table
                                  │
                                  ▼
                        resolved GraphState
                                  │
              atomic full swap / atomic source commits
                                  │
                                  ▼
                         GraphIndex queries
                   neighbourhood / search / explain
```

The main boundaries are:

- `src/core/parser/metadata.ts` — host-free canonical grammar for legacy Dataview-style body fields, body URLs and property-value references, with explicit cooperative runtime capabilities.
- `src/index/fieldParser.ts` — narrow Obsidian compatibility facade for metadata merge/linkpath resolution and the historical cooperative signature; it contains no duplicate grammar.
- `MetadataParser.ts` — production worker/fallback boundary using the portable owner; the legacy `MetadataParseWorker` class delegates here and contains no parser copy.
- `src/core/graph/evidence.ts` — host-free immutable relationship evidence, compact copy-on-write store, provenance and precedence; `src/index/RelationEvidence.ts` is the legacy re-export facade.
- `src/core/graph/resolver.ts` — host-free ExcaliBrain-compatible classification/resolution/explanation owner with injected cooperative clock/yield/lifetime; `src/index/RelationResolver.ts` supplies the renderer runtime for the historical signature.
- `GraphState.ts` — the published graph repository state; full replacements are private-first, while per-source commits are atomic.
- `GraphBuilder.ts` — collects all vault evidence for complete private builds and can also create the low-cost structural/link baseline used by cold progressive startup.
- `GraphIndex.ts` — owns full-snapshot publication, progressive cold-start publication, snapshot persistence, and neighbourhood/search/explanation queries.

C13b keeps explicit semantic paths as the compatibility key for evidence declarations and neighbour maps. These paths are not opaque IDs and core does not infer file/kind/basename semantics from them. Original declarations remain stored once; reverse/inverse perspectives are generated on read, hidden evidence remains directional, and declaration IDs/multiplicity survive forks, rename and compaction. C13c now compiles full semantics into portable nodes over normalized facts; its host adapter cooperatively binds legacy `GraphPage`/file targets. Publication remains outside the resolver and incremental preparation/publication remains C14a/C14b.

## Frontmatter precedence

K-Plex intentionally differs from classic ExcaliBrain here.

If the **same declaring note** has a frontmatter ontology relationship and a conflicting body ontology relationship to the **same target**, frontmatter wins.

Example:

```yaml
---
Parent: "[[B]]"
---
```

```md
Child:: [[B]]
```

The visible result is `B = Parent — DEFINED`.

The important architectural rule is that the body `Child` evidence is **not deleted during collection**. Both declarations enter `RelationEvidenceStore`. `RelationResolver.applyOntologyPrecedence()` marks the body declaration overridden when resolving the pair. Explainability can therefore show:

```text
USED        Frontmatter ontology · Parent — Defined
OVERRIDDEN  Body ontology · Child — Defined
```

If frontmatter and body declare the **same** role, both may remain active because there is no conflict. Conflicts wholly within one source tier continue through the normal ExcaliBrain-compatible classifier.

## Evidence provenance

Evidence records retain enough context to answer “why is this relationship here?” and to support future source-aware editing:

- source and target paths;
- semantic role;
- defined/inferred type;
- link direction;
- source kind (`frontmatter-ontology`, `inline-ontology`, `obsidian-link`, `date-property`, etc.);
- ontology/property field name;
- raw field value where available;
- body line number and source-range offsets where available;
- original declaring note, target and role before the inverse view is generated.

Right-clicking a visible graph connector exposes this information through **Explain relationship**.

## Body fields

The parser supports the legacy Dataview forms exercised by `tests/fixtures/excalibrain-indexing`:

```md
Parent:: [[B]]
(Parent:: [[B]])
[Parent:: [[B]]]
**Parent**:: [[B]]
- Parent:: [[B]]
Text (Friend:: [[B]], [[C]]) and [[D]] remains an ordinary link.
```

Multiple inline fields on one physical line are parsed independently. YAML/frontmatter, fenced code and inline code are excluded from body-field parsing.

## Date properties

Obsidian properties configured as type **Date** are mapped through the enabled Daily Notes configuration using Obsidian's Moment formatter, so customized Daily Notes formats are honored rather than being limited to a small token subset. Existing daily notes resolve to physical Markdown files; missing dates become virtual targets. The Date-property name and raw value remain provenance on the inferred relationship.

This is different from interpreting every ISO-looking string as a date: K-Plex checks the Obsidian property type registry first.

## Snapshot publication, demand gating, and startup persistence

Normal authoritative rebuilds still construct a complete graph privately and atomically replace the published state. **Cold startup is the deliberate exception:** `GraphBuilder` first creates a structure + host-link baseline, then ingests the preferred center note and its bounded child-note neighborhood through the same atomic per-source patch boundary. `GraphIndex` publishes that useful non-authoritative neighborhood immediately, installs a bounded working search index, and progressively commits the remaining Markdown sources with batched UI notifications. Search entries grow with those commits and are rebuilt once at completion so folders, tags, attachments and virtual nodes are all included. The partial graph is never persisted as the authoritative snapshot and `main.ts` does not mark initial indexing complete until `GraphIndex.isFullSnapshotHydrated()` is true. Rebuilds remain generation-scoped and cancellable, so a cancelled partial graph stays usable but is retried instead of being mistaken for complete. `main.ts` tracks a dirty revision and clears the backlog only when a build actually publishes the revision it started from.

During cold Markdown ingestion, an unrelated sync or metadata event no longer invalidates the builder generation. The coordinator retains changed Markdown paths and its dirty revision, then patches those sources after the current pass reaches a complete graph. GraphBuilder still checks the exact file identity/path/mtime/size before each per-file publication, so a file changed during its own read cannot publish stale content. An explicit cancellation or an in-flight source read that becomes stale may still end the pass; the next attempt can use its saved checkpoint. Unsupported structural changes remain conservative full-build cases.

Automatic edit indexing is **visibility-demand gated**. An Obsidian K-Plex tab can remain mounted while hidden behind another tab; that does not count as visible demand. Hidden surfaces retain the dirty backlog but do not automatically parse/build, persist a new snapshot, or run the graph React subscription. Revealing a K-Plex surface catches up from the accumulated dirty revision. Explicit commands and the documented once-per-session startup path are separate from this automatic edit policy.

Folder and tag **node visibility is presentation state, not an index mode**. Their structural topology is maintained from Obsidian's in-memory `Vault` tree and `MetadataCache`, without Markdown body reads. `showFolderNodes` and `showTagNodes` must therefore never participate in the semantic-settings signature or schedule a rebuild; hiding them only filters already-materialized nodes, and revealing them reuses the same graph immediately.

The resolved semantic graph is persisted in **IndexedDB as a transactional, generation-scoped chunked snapshot**. The active metadata record is written only after the new page/evidence generation is complete, so interrupted writes cannot make a partial generation authoritative. A vault signature plus semantic-settings signature decides whether the restored snapshot is already fresh. Startup captures the signature, file inventory and folder paths in one Vault tree pass. If no compatible saved generation exists, it skips that pass and starts the normal cold builder.

A complete generation remains reusable after edits to existing Markdown files and after note-only additions or deletions in unchanged folders. K-Plex compares the saved physical paths with the one captured inventory, restores the graph, materializes added notes, dematerializes deleted notes, and patches only added/modified Markdown sources. Source commits use the normal graph/search/cache publication boundary. Simultaneous additions and deletions are treated as a possible rename; folder changes and attachment path changes still require a structural rebuild because inbound resolution or non-Markdown topology may have changed. This deliberately keeps uncertain deltas out of the fast path.

During a large cold progressive build, K-Plex also writes a separate `checkpoint` generation after a substantial interval and at least 500 newly committed Markdown sources. It serializes the coherent structural baseline, current graph/evidence and the exact set of completed Markdown paths while source ingestion is paused. Its metadata activates only after all chunks finish. A complete `active` generation remains intact; a partial checkpoint is never marked authoritative. On restart, a compatible complete generation is preferred unless the checkpoint is fresh and the complete generation is stale. If the preferred generation fails validation or hydration, restore tries the other compatible generation against the same captured vault inventory before starting cold ingestion. A checkpoint is usable after edits to completed Markdown files or note-only additions/deletions in unchanged folders: changed/deleted sources are removed from its completed set, the physical delta is reconciled, and unfinished/changed sources are ingested. Settings changes and unsupported structural deltas still reject it. A completed build writes a new active generation and retires the checkpoint.

The startup coordinator recognizes a validated checkpoint even if its hydration task completed before the coordinator checks it. That settled partial state continues through the resumable builder; a settled failed preview takes the cold path.

The first checkpoint is due after two minutes and 500 new committed sources; a restored checkpoint keeps its saved creation time as the starting point, so reopening does not restart that clock. Successful later intervals grow to four and then five minutes. Independently, 2,000 new commits trigger a save after at least one minute, bounding work lost during fast indexing runs that end before the timer fires. A failed or cancelled checkpoint retains its accumulated committed-source count and retries after 15 seconds, doubling the retry delay up to five minutes if failures continue. Failed writes never advance the successful-checkpoint interval. A checkpoint is skipped when fewer than 500 Markdown sources remain, because the complete snapshot will follow soon. A full checkpoint reserializes the graph and can itself take tens of seconds on a large vault, so spacing these writes limits their effect on total indexing time. Per-file body cache writes continue independently and remain useful if a graph checkpoint is rejected. Diagnostics include the attempted completed-source count and write duration without paths.

While a progressive checkpoint is being serialized and written, `GraphIndex` publishes a transient saving state. The index indicator shows “saving index to cache” and keeps the completed-file count visible in its hover/click details. The state clears after success or failure, so the paused counter is explained without treating a checkpoint as completed indexing.

Warm startup uses that IndexedDB generation progressively too: targeted page/evidence reads publish the remembered/active center plus one relationship hop before full snapshot hydration finishes. That preview remains navigable and searchable while the complete generation streams in; it is never treated as authoritative until hydration succeeds.

IndexedDB is always treated as an optimization. Opening the database has a short deadline and bounded retry backoff: if WebView storage is blocked or slow, startup proceeds using vault reads rather than waiting indefinitely, and a late stale connection is closed. Page/evidence hydration is chunked, time-sliced, and generation checked. Deferred snapshot/orphan maintenance is cancelled when there is no visible K-Plex demand.

Orphan cleanup reads both snapshot pointers in one metadata transaction. If that read fails or either pointer is malformed, cleanup does nothing; a transient IndexedDB error must never turn a referenced generation into an apparent orphan. Snapshot stream failures produce path-free reason codes such as `active-pages-missing-chunk` and `checkpoint-evidence-read-error`. Metadata presence alone does not prove that all referenced chunks can be read.

Progressive snapshot hydration is also bounded against a *stalled* asynchronous read. `GraphIndex` records its current restore phase (including metadata and targeted preview reads), last active phase, terminal outcome and sampled page/relation/evidence/search/resolver progress. Unload immediately settles the hydration wait and stops its watchdog; cancelled startup continuations do not rebuild. If a run makes no phase/progress for 90 seconds, an inactivity watchdog invalidates that hydration generation and releases startup as an unsuccessful restore; the existing coordinator then rebuilds authoritatively. The already-published preview may remain usable while this happens, but it is never considered the complete graph. If the abandoned IndexedDB operation later resumes, generation checks prevent it from publishing over newer state. This is deliberately an inactivity bound rather than a total-startup deadline so legitimately large snapshots may continue as long as they are making progress.

Runtime inspection and fault-injection procedure: [Obsidian runtime testing](OBSIDIAN_RUNTIME_TESTING.md).

The local IndexedDB metadata store also keeps the last 20 index decisions as reason codes, timestamps and counts, without vault paths or note content. `GraphIndex.getIndexDiagnostics()` exposes a copy for CLI inspection. It records cache selection/rejection, restore/reconcile outcomes, full versus progressive build decisions and snapshot write results. If IndexedDB is unavailable, the current session still retains its diagnostics in memory.

The startup inventory pass is required to detect changes made while Obsidian or K-Plex was closed; an event journal alone cannot prove that no sync or external edit occurred. Reusing the complete graph and patching the measured delta avoids reopening every Markdown body. A full structural baseline from Obsidian metadata would avoid body reads but still traverse and resolve the whole vault; it remains the fallback for unsupported topology changes. A future extension could compare cached Obsidian link maps with saved link evidence for mixed add/delete or rename batches, then patch only affected declarers. That requires a bounded correctness test for alias/path resolution before replacing the current conservative fallback.

Startup temporarily records vault and metadata changes while the saved generation is inspected and hydrated. The synchronous inventory walk captures its current source revision. Events before that revision are already covered by the inventory and can be discarded; later events stay in the per-file backlog after restore. This closes the gap before normal reactive listeners register, including when preview hydration yields to the host.

A durable per-file body parse cache is keyed by file path + mtime. On large iOS cold starts K-Plex now publishes the center + child neighborhood first, then prewarms the remaining compact body cache in bounded checkpoints before continuing progressive semantic ingestion. This preserves a useful first paint while retaining the low-memory/resumable checkpoint strategy that avoids rereading every body after interruption. Desktop full rebuilds may still overlap a small, byte-capped number of native file reads; parsing remains bounded. Worker parsing is disabled on iOS to avoid structured-clone duplication.

Semantic no-op detection uses a compact per-file fingerprint kept independently of the hot parsed-body LRU and persisted with page snapshot records. This allows prose-only or unrelated frontmatter edits to stay no-ops even after a warm restore or after the hot body entry has been evicted.

Incremental publication has one synchronous repository boundary per committed Markdown source, and cold progressive startup intentionally reuses that same boundary. Private staging may await parsing, portable preparation, evidence cleanup and cooperative binding, but once `GraphIndex` accepts a `PatchFileCommit` it applies the staged graph/fingerprint/cache state, patches affected search entries and invalidates affected presentation caches before subscriber callbacks run. The builder cannot continue to another awaited source until that boundary returns. Source revision fences include the exact path and current vault identity as well as mtime/size, so a file renamed or deleted during any await cancels the stale source instead of publishing it. Earlier committed sources remain published; cancellation does not itself request a full rebuild. Demand/backlog scheduling remains a separate `main.ts` concern for C15.

A newly created Markdown note is materialized as one file-tree endpoint and placed in the per-file patch backlog. Creation during an in-flight startup pass is reconciled after that pass; it does not by itself schedule another full-vault scan. A changed source revision cancels and retries a visible cold pass after the current task settles. Folder and non-Markdown structural changes still use the full structural path.


## Presentation predicates are not graph indexing

The visible Plex can be filtered through a declarative predicate engine without broadening the persistent graph snapshot. The existing Keyword / Tag / Note type controls compile to that generic predicate representation. Named Graph Lenses parse a safe Bases-inspired expression syntax into the same AST; style rules will reuse that selector layer.

Predicate contexts are separated by meaning:

- `node.*` — K-Plex node fields already present in the semantic graph;
- `edge.*` — the resolved relationship shown in the Plex;
- `evidence.*` — provenance retained in `RelationEvidence`;
- `note.*` — arbitrary Markdown frontmatter resolved lazily from Obsidian `MetadataCache`;
- `file.*` — physical file metadata;
- `this.*` — the current center thought.

Arbitrary frontmatter **values are not copied into `GraphPage`, graph snapshots or IndexedDB** for filtering. A predicate that references `note.status`, for example, reads that value from Obsidian's already-parsed metadata cache when evaluating the currently visible Plex. Predicate dependency tracking tells the UI when such cached metadata can affect the current view. That refresh path is separate from semantic graph reconstruction.

The incremental semantic fingerprint likewise distinguishes graph-relevant frontmatter values from arbitrary presentation metadata. Ontology fields, aliases/tags, note type/style fields and Date properties remain semantic inputs. Unrelated property names and values do not participate in the semantic fingerprint. A newly seen non-semantic property name may update the lightweight discovered-field catalogue, but that bookkeeping does not emit a semantic graph change or re-resolve relationship evidence.


Named lenses are persisted presentation rules with three target scopes: **node**, **edge**, and **evidence**. Include lenses are combined by union; exclude lenses subtract from that result. With no active include lens, the already-materialized Plex is the baseline. The central node remains visible. Evidence selectors evaluate retained relationship decisions, including `evidence.active` and `evidence.suppressionReason`, without discovering additional graph depth.

The expression parser supports property comparisons, `and` / `or` / `not`, parentheses, bracket notation for property names with spaces, and safe helpers such as `file.hasTag("meeting")`, `file.inFolder("Projects")`, and `.contains(...)`. It produces the predicate AST directly and has no `eval`, `Function`, JavaScript callback, or Dataview execution path.

This layer is intentionally not a whole-vault or arbitrary-depth graph query API. K-Plex keeps the bounded, structured Plex model; a separate graph-query API can be considered independently in the future.

## Compatibility fixture

Run:

```bash
npm test
```

The golden fixture is `tests/fixtures/excalibrain-indexing`.

The current automated baseline covers README assertions **1–33 plus P1–P6**, including parsing, explicit/inferred reconciliation, K-Plex frontmatter precedence, Previous/Next, Hidden, note type, folders, tags, URLs, Date → Daily Notes, placeholders, explanation provenance, malformed-delimiter parser regression, idempotent/shared-lifetime derived URL-origin patching, stale derived-node search cleanup, and tag-aware incremental patch equivalence.

Assertions **34–50** cover the runtime-only central-note section outline, including nested heading structure, folding, projection of hidden descendant relationships to the nearest visible folded section, and restoration of the unchanged note-level persistent index after collapse.

## Planned work avoidance (not implemented by C08P)

The definitive checkpoint ledger is [Refactor plan.md](../Refactor%20plan.md), section C08P. Preserve these assigned opportunities through subsequent extractions:

- C11/C12: compact per-file normalized semantic contributions; no new persistence yet.
- Measured parser-worker benchmarking remains a separate follow-up after the C13 boundary work; C13a preserves the existing worker count and iOS fallback policy.
- C14: latest-wins per-source compilation with atomic per-file commit; supersession does not imply a full rebuild.
- C16: extract current snapshot/cache bytes and transactions first; evaluate semantic shards and checkpoint-plus-delta persistence separately with migration, compaction and fallback designs.
- C17 (or measured C13 follow-up): maintained search/secondary indexes to avoid redundant whole-graph passes without sacrificing atomic publication or increasing retained memory unnecessarily.

These are measured follow-up design opportunities, not shipped capabilities or permission to redesign the index before its boundaries are extracted.

C13c full compilation is accepted with exact same-input accepted-compiler parity. The host owns physical file binding, body/cache acquisition and platform runtime selection; the portable owner has terminal read rejection, exact identity mapping and cooperative resolution. Source/legacy binding checks remain across awaits. C13W is a separate deferred worker experiment; C13 acceptance does not claim that experiment or physical/cold performance completion.
