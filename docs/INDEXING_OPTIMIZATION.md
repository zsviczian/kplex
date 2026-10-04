**K-Plex warm startup is much slower than the inherent problem requires.** The strongest result from the code and the repository’s current SI5 measurements is that **graph construction is not the main bottleneck**.

On the ~20k-note validation vault, a clean warm startup is roughly **60–80 seconds** under controlled conditions. Of that:

- **52–58s** is spent in `host-metadata-comparison`.
- Another **7–8s** is spent in `source-reconciliation`.
- Actual snapshot hydration—pages, relations, search, and **715k evidence records**—is roughly **6–13s**.
- Vault inventory and initial preview are only a few hundred milliseconds.

So K-Plex currently spends most of warm startup **proving that its cached data is trustworthy**, not rebuilding the graph.

### What Dataview does differently

https://github.com/blacksmithgu/obsidian-dataview

I inspected Dataview's current `FullIndex`, `LocalStorageCache`, and worker importer implementation. Its warm-start philosophy is much simpler:

1. Get all Markdown files.
2. For every file, concurrently request its cached `PageMetadata` from IndexedDB.
3. If the cache version matches and the cache is newer than `file.stat.mtime`, **trust it**.
4. Rebuild the inexpensive in-memory tag/link/page indices from that cached metadata.
5. Only stale/missing files are read and parsed; those go through a small worker pool.
6. Cleanup of obsolete cached records happens **after** the index becomes usable.

Dataview therefore treats persistent metadata as a **warm-start cache**, rather than something that must be exhaustively authenticated before use. Its 0.5.19 release specifically introduced IndexedDB caching to drastically reduce repeated startup cost. [GitHub](https://github.com/blacksmithgu/obsidian-dataview/blob/master/CHANGELOG.md?utm_source=chatgpt.com)

K-Plex has stronger requirements—ontology inference, provenance, source independence, offline change detection, dependency selection, resolution semantics—but I don't think those requirements justify putting almost all validation in the critical path.

### Prioritized optimization opportunities

The impact estimates below are **not additive**; several approaches attack the same work.

| Rank | Opportunity | Expected contribution | Why |
|---|---|---:|---|
| **1** | **Add a true trusted warm-snapshot path and move source-authority certification off the critical path** | **~50–60s; potentially 70–85% of current warm startup** | This attacks the dominant 60–67s source-authority phase. If snapshot schema, vault signature, K-Plex semantic version/signature, relevant environment and source generation all match, hydrate the graph and declare it usable immediately. Validate source/provenance in the background. |
| **2** | **Batch/vectorize source-authority validation instead of doing thousands of serialized per-owner IndexedDB transactions** | **~25–45s** if validation must remain blocking | Current warm runs perform ~100k source-head reads, ~40k dependency checks/selections and ~40k lease add/delete pairs. Measured IndexedDB transaction waiting alone accounts for roughly **46–52s** across the two main source passes. Work in batches of perhaps 128–256 owners with shared read transactions / bulk reads. |
| **3** | **Eliminate the second complete source-validation walk when nothing changed during the first** | **~7–8s** | `host-metadata-comparison` already establishes a large amount of authority, then `source-reconciliation` walks all ~20k Markdown owners again. Capture an epoch/generation fence before pass 1; if no relevant event/repository generation changed, reuse its certification and only revisit owners invalidated during the pass. |
| **4** | **Make relation evidence/provenance lazy** | **~3–9s** | The usable graph already exists in persisted pages/relations. Restoring **715,032 evidence records** before strict-ready is expensive and usually unnecessary for navigation. Load evidence when an inspect/edit/explain operation actually needs it, or hydrate it after graph-ready. |
| **5** | **Optimize snapshot representation for direct hydration** | **~2–4s** | Schema 3 currently effectively walks persisted page data once for pages and again for relations. Store compact node data and adjacency independently, or use IDs/ordinals so relationships can be bulk-bound. Also add a bulk evidence loader instead of repeatedly executing `addDeclarationRecord()` with array-copying. |
| **6** | **Persist or lazily build the search projection** | **<1s normally** | Search is visible work but not a significant current bottleneck. Useful later, not where I would spend time now. |
| **7** | **Cold: use multiple parser workers on desktop** | **Potentially 20–40% of parse-heavy cold startup** | K-Plex's Markdown parser is effectively serial. Dataview uses two workers. A bounded 2–4 worker desktop pool should improve true cold indexing considerably without changing semantics. Mobile should remain more conservative. |
| **8** | **Cold: batch graph compilation after publishing the initial neighborhood** | **Potentially 15–30% of remaining cold processing** | The progressive cold path currently patches the graph note-by-note. That's excellent for first-useful-result latency but expensive for the remaining 20k notes. After center + immediate neighborhood are visible, process the rest in batches—e.g. 32–128 sources—and publish periodically. |

### #1 is the architectural change I would pursue

I would distinguish three startup modes rather than treating everything as either “cache” or “rebuild”:

**Fast warm:** K-Plex has a committed compatible snapshot whose vault/environment/source-generation fingerprint still matches. Load nodes + relations + search and become usable. Source authentication and provenance verification continue afterward.

**Verified warm:** Something makes the snapshot trustworthy enough to reuse but not enough to skip source certification—unclean shutdown, host/parser version change, uncertain source generation, etc. Perform the authority check, but use the batched design from #2.

**Cold:** No valid snapshot. Keep the current progressive strategy, but parallelize parsing and batch the long tail.

The warm manifest should probably include more than Dataview's simple timestamp check: vault path/mtime/size signature, K-Plex parser/index schema, relevant Obsidian version/environment signature, semantic/settings fingerprint, source-repository generation/root, and a clean committed-snapshot marker. This preserves K-Plex's stronger guarantees without paying for exhaustive authentication on **every** startup.

One important distinction: I would **not literally copy Dataview's `Promise.all()` over 20k IndexedDB requests**. K-Plex has substantially heavier records and must support mobile. The lesson from Dataview is the **trust model and critical-path design**, not unbounded concurrency.

### The most important code areas

The bottleneck is concentrated around:

- `src/adapters/obsidian/sourceAcquisition.ts` — the two large warm authority/reconciliation walks.
- `src/index/SourceRepository.ts` — per-owner source head/dependency/lease/authentication transactions.
- `src/index/GraphIndex.ts` — currently waits for `source-authority` **before** completing full snapshot hydration.
- `src/index/RelationEvidenceStore.ts` — expensive reconstruction of hundreds of thousands of evidence declarations.

I would **not** currently optimize `VaultInventory`, search indexing, extra yielding, or small snapshot chunk sizes. The measurements show those are rounding errors beside source authority.

### My target

For a clean, unchanged 20k-note vault, I think a realistic architectural target is:

**~2–5 seconds to a fully navigable warm graph**, with source/provenance validation finishing asynchronously.

Potentially less later, but I would first aim for that. Going from ~70 seconds to ~60 seconds through more IndexedDB micro-optimizations would miss the larger issue: **K-Plex currently makes background integrity work part of foreground startup.**

The biggest objection to this proposal is correctness after offline changes. I think that objection is valid—but it argues for a robust fast-warm fingerprint + safe verified-warm fallback, rather than re-authenticating 20,000 owners on every clean restart.