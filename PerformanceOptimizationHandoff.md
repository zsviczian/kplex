# K-Plex performance optimization handoff

Prepared for Sol on 2026-09-23. Review baseline: `main`, commit `511f06725924c8097110767bbf1d2122c163430c` (`fix code scanner findings`). The working tree was clean before this review. This deliverable is analysis only; no production source or committed tests were changed.

## Recommendation

Start by removing unnecessary work around indexing, then bound the work that remains. The highest-value changes are:

1. Separate index status notifications from graph invalidation. Currently an edit can trigger whole-index UI work before the indexing debounce expires, even when parsing ultimately reports no semantic change.
2. Distinguish an open K-Plex leaf from a visible K-Plex surface. Hidden tabs still qualify for reactive indexing and keep their React subscriptions active.
3. Make the canonical parser linear on malformed input and cooperatively cancellable when it runs on the main thread. Worker parsing already exists; adding another worker is not the first fix.
4. Keep ordinary edits incremental with tag nodes enabled, retain compact per-file semantic fingerprints independently of the body LRU, and fix accumulating derived URL evidence.
5. Apply real time and memory budgets inside large-file collection, hydration, search-index preparation, and persistence—not only between files or fixed-size batches.

Do these as independently measurable checkpoints. Preserve the existing ontology classifier, declaration-compact evidence, IndexedDB checkpoints, and iOS memory safeguards.

## Evidence and limits

Read [AGENTS.md](AGENTS.md), [CONTRIBUTING.md](CONTRIBUTING.md), the indexing architecture document, all indexing modules, the relevant lifecycle/scheduling code, and the UI subscribers/section-expansion paths.

[Issue #2](https://github.com/zsviczian/kplex/issues/2), opened September 22, reports that Obsidian freezes after a large paste with K-Plex enabled, including when K-Plex is not visible. At review time it has no comments and gives no plugin version, platform, vault size, pasted sample, duration, or distinction between a hidden leaf and a closed leaf. The findings below explain plausible routes to that symptom; they do **not** establish a reproduced root cause for that user's environment.

Validation performed:

- `npm test`: all reported fixture groups passed, through assertions 67–68.
- `npm run build`: passed against the actual installed dependencies and Obsidian typings.
- Used installed Node **22.22.3**. The shell's default was Node 18.14.0; do not use that default for implementation validation.
- Ran temporary parser benchmarks and additional probes using the existing fixture harness. Temporary harness files were removed. No runtime instrumentation was added.
- No Obsidian/Electron profiler session, real IndexedDB integration test, or physical iOS/Android test was available. Build and fixture success do not validate UI responsiveness or mobile memory behavior.

### Measured parser behavior

Direct calls to the current canonical `parseBodyMetadataCore`, TypeScript-transpiled without changing the algorithm; Apple M1, macOS arm64, Node 22.22.3; median of three calls per input after 30 small warm-up parses. These are synchronous CPU durations, not browser frame or worker round-trip measurements.

| Input, one line unless noted | Size | Median |
| --- | ---: | ---: |
| Repeated unmatched `(` | 4,000 characters | 21.78 ms |
| Repeated unmatched `(` | 8,000 characters | 86.41 ms |
| Repeated unmatched `(` | 16,000 characters | 304.87 ms |
| Repeated unmatched `(` | 32,000 characters | 1,218.16 ms |
| Repeated unmatched `[a` | 4,000 characters | 23.03 ms |
| Repeated unmatched `[a` | 32,000 characters | 1,296.69 ms |
| Ordinary prose without metadata | 1 MiB | 29.62 ms |
| Ordinary prose without metadata | 4 MiB | 124.75 ms |
| One payload line inside a fenced JSON block | 4 MiB plus fence | 0.14 ms |

The unmatched-delimiter growth is approximately quadratic. The existing fenced-block fast path is effective and should be preserved. Do not generalize these numbers into an end-to-end speedup prediction.

Additional fixture probes confirmed:

- Repeated semantic patches of one note containing the same new external URL produced **1, 2, 3, then 4** `url-origin` declarations for the same origin/URL pair. That new pair had no resolved origin-to-URL neighbor after any of those patches.
- Clearing the hot body cache, then making a prose-only edit, produced one semantic index emission. The no-op optimization depends on the previous hot entry.
- For a store with 100,001 pairs and only one pair touching the queried node, `RelationEvidenceStore.from()` took a median **3.86 ms** across seven calls; `declarationsTouching()` took less than **0.001 ms**. Both are fixture-level measurements; the important distinction is global versus local traversal.

## Current execution paths

**Startup:** layout ready → restore IndexedDB preview/full snapshot → register normal dirty listeners → metadata stabilization where needed → reconcile changed Markdown files or build → prepare search entries → emit → delayed snapshot persistence. Large iOS cold starts prewarm parsed bodies before retaining the full graph.

**Ordinary edit:** `metadataCache.changed` → dirty path/revision → immediate index-status notification → 1.1–2.4 second debounce → incremental Markdown patch, unless tag nodes or structural reasons force a full build → graph emission when semantic inputs changed → bookmark refresh and another index notification → status notification → delayed persistence.

**UI side effects:** status and graph notifications share `renderRevision`; that revision refreshes filter suggestions, neighborhoods, and expanded sections. React work can therefore precede parsing, repeat after it, and run in a hidden mounted leaf.

**Worker boundary:** production uses `MetadataParser.ts`, which serializes the canonical `parseBodyMetadataCore` into a worker. iOS, unavailable workers, and worker errors use the synchronous parser. `MetadataParseWorker.ts` is an unreferenced older implementation; do not optimize it by mistake.

## Findings and implementation requirements

### F1 — High: status notifications trigger global UI work outside the debounce

**Evidence:** [main.ts](src/main.ts), `scheduleRebuild` at 390, `notifyIndexStatus` at 1041, and `refreshBookmarkedEntryPoints` ending at 1552; [App.tsx](src/ui/App.tsx), subscriptions at 93–100 and `PlexFilter` at 327; [PlexFilter.tsx](src/ui/PlexFilter.tsx), suggestions at 198; [PlexGraph.tsx](src/ui/PlexGraph.tsx), neighborhood at 620 and section effect at 865.

Every metadata event calls `notifyIndexStatus`, even if the dirty status has not changed. Both status and semantic index subscriptions increment the same `renderRevision`. Filter suggestions respond by allocating `allPages()`, visiting every page, sorting option sets, and requesting center evidence. This happens even when the filter popover is closed. Expanded sections also rebuild on that revision.

The builder's semantic-no-op check cannot prevent this earlier work. Even after a no-op patch, `performRebuild` refreshes bookmarks, whose implementation unconditionally calls `index.notify()`. Existing no-op tests exercise `GraphIndex` directly and miss this plugin/UI path.

**Implement:**

- Give the status indicator its own subscription/state; emit only when its observable status changes. Status must not increment graph or section revisions.
- Separate semantic changes, presentation changes, and search-entry-point changes. Refresh bookmarks on bookmark changes or only notify when their resulting entry-point list differs.
- Move whole-index suggestion catalogs into an index-owned cache, updated from published changes. Alternatively, initially compute them lazily when the panel opens, sliced and cached by a real catalog revision. Retain whole-vault suggestion behavior without scanning the vault during every render.
- Route metadata-only lens refreshes to affected materialized nodes and relevant properties. The current frontmatter-dependent listener refreshes on every Markdown change.
- Stabilize effective view-settings identity until settings/profile changes. Verify this alongside revision splitting so object identity does not continue forcing scene layout.

**Accept when:** a prose-only edit produces no graph-layout rebuild, section parse, or global suggestion scan; status changes still display promptly. A burst produces one meaningful pending-status transition, not one graph invalidation per event. Test through the plugin scheduler and mounted UI, not only `GraphIndex.patchMarkdownPaths`.

### F2 — High: “not visible” and “closed” have different indexing behavior

**Evidence:** [main.ts](src/main.ts), 390–426, 539–542, interval at 213; [KplexView.tsx](src/ui/KplexView.tsx), 39–64.

`openKplexViews` changes only on view open/close. Switching tabs, collapsing a sidebar, or folding a sidecar does not close its leaf. Those leaves still allow background patches/full rebuilds and retain UI subscriptions. Once initialization is complete and **all leaves are actually closed**, the scheduler already defers reactive work. Desktop/Android's initial session indexing may intentionally continue while closed.

**Implement:** maintain view lifetime and visible demand separately. For normal automatic updates, accumulate dirty paths while no K-Plex surface is visible; resume once when a surface becomes visible. Suspend expensive hidden-view rendering independently of whether another visible K-Plex view needs the shared index. Keep explicit rebuild commands working and preserve the authorized once-per-session startup policy.

Determine visibility through a small host integration boundary, verified against installed Obsidian typings and actual behavior. A visible split pane may be inactive; `activeLeaf === kplexLeaf` is insufficient. Cover main-window tabs, sidepanels, native sidecar fold/unfold, popouts, and mobile. Avoid frequent whole-DOM polling or changing the shared persistence owner to a popout.

**Accept when:** after initialization, large pastes with all K-Plex surfaces hidden cause only bounded dirty bookkeeping. Showing one surface consumes the backlog once. Closing versus hiding, multiple visible views, and manual rebuild have explicit tests. If demand-gated behavior is adopted, update the guide's open/closed wording to distinguish it from visibility.

### F3 — High: pathological parser complexity and uncancellable synchronous fallback

**Evidence:** [fieldParser.ts](src/index/fieldParser.ts), `maskInlineCode` at 95, `balancedClose` at 114, delimiter loop at 216, URL-label regex at 251; [MetadataParser.ts](src/index/MetadataParser.ts), 27–92.

Each unmatched opening delimiter can make `balancedClose` scan the remaining line again. This explains the measured quadratic growth. `maskInlineCode` also spreads every visible line into a character array and rejoins it even when there is no backtick. On iOS and fallback paths, `async parse()` runs the entire parser synchronously before its promise resolves. A yield between files cannot interrupt that work.

`destroy()` rejects pending worker requests, but the blanket `.catch(() => parseBodyMetadata(content))` then reparses their retained content on the main thread. Cancellation can therefore cause the expensive work it was meant to stop. Closing a view cancels the graph generation but does not cancel a pending worker job.

**Implement:**

- Replace repeated suffix scans with an amortized-linear delimiter scanner or equivalent precomputed matching strategy. Preserve nested brackets, escapes, multiple inline fields, ignored Markdown regions, and provenance.
- Avoid per-character arrays for ordinary lines; use exclusion ranges or allocate masking storage only when needed. Preserve position conventions and add Unicode/CRLF fixtures before changing offset handling.
- Use one resumable parser core shared by worker and fallback drivers. The fallback must yield within long lines as well as between lines, using elapsed-time/character checkpoints. Do not solve this with a fixed file-size cutoff that silently loses relationships.
- Separate cancellation/disposal from genuine worker failure. Abort must discard work without invoking fallback. On genuine failure, use the bounded fallback. Add a job/run identity and stop obsolete jobs; merely sending a cancel message to a synchronously blocked worker will not interrupt its current task.
- Audit the Markdown URL-label regex and comment/inline-code masking against malformed long lines as part of the same complexity tests. The delimiter benchmark does not isolate those additional costs.
- Keep the current iOS worker prohibition unless a separate real-device memory study justifies changing it.

**Accept when:** malformed input scales approximately linearly as size doubles; cancellation prevents further fallback parsing/publication; the longest synchronous fallback slice meets the proposed budget below. Worker and fallback outputs match all parser fixtures. Bump parser-cache version if output/grammar changes, and invalidate semantic snapshots when those changes alter graph results.

### F4 — High: cooperative yielding does not bound a large note or restore batch

**Evidence:** [GraphBuilder.ts](src/index/GraphBuilder.ts), 182–195, resolved-link loops at 286/300, enrichment at 314, patch at 389, metadata at 523; [GraphIndex.ts](src/index/GraphIndex.ts), prewarm at 289 and search preparation at 927; [IndexedDbCache.ts](src/index/IndexedDbCache.ts), chunk iteration at 204.

The builder yields between source files, but a single source can contain thousands of links, fields, or URLs. Removal, metadata application, semantic JSON serialization, and pair resolution can all run synchronously for that note. Chunk restoration processes up to 12 desktop chunks before returning to another read: with locally written chunk sizes, that can mean 6,144 page records or 12,288 evidence records, and page records have unbounded neighbor counts. Search preparation is another synchronous full-page loop.

`markHostOpportunity()` resets the budget after `cachedRead()`. A cached read can resolve without a new browser task, so an `await` there is not proof of a paint/input opportunity. Existing async yield helpers also create promise/microtask overhead per item even when no host yield occurs. Optimize that overhead only after the missing hard bounds are fixed.

**Implement:**

- Budget inner link/field/URL/pair loops and one very large persisted page, not just outer file/chunk loops. Prepare search entries in a cancellable private structure and publish them with the graph revision they describe.
- Use genuine task yields once a CPU budget is exhausted on desktop as well as mobile. Do not infer a host yield solely from an API returning a promise. Avoid resetting the CPU budget after already-resolved I/O promises.
- Pass cancellation into IndexedDB iteration and check between bounded chunks/CPU slices. Currently hydration cancellation is mainly checked after a complete phase, and the iterator has no cancellation argument.
- Bound prewarm/read/write batches by estimated bytes as well as record counts. Four unusually large notes can exceed a memory budget that four ordinary notes do not. The iOS 24 ms pause currently occurs after a lookup batch, not after every native-read group; tune pauses with real-device measurements.

**Safety prerequisite:** incremental patches currently mutate the published `this.state` in place. Do not insert `await` into evidence-removal/relation-resolution loops and expose half-updated pairs. Stage a file's delta and resolved results privately, then commit a consistent revision; ensure cancellation retains pending dirty paths and invalidates any already-committed derived caches. If a high-degree commit itself is too large, design explicit versioned reads/staged adjacency replacement rather than pretending it is a cheap atomic operation. Avoid cloning the entire graph per edit.

**Accept when:** a single link-heavy note, a high-degree folder/tag/URL-origin page, and a large restore all obey the slice budget. Cancellation at each stage leaves either the previous consistent revision or a fully committed delta, with pending work retained.

### F5 — High for tag users: tag display forces every ordinary edit into a full build

**Evidence:** [main.ts](src/main.ts), `canIncrementalPatch` at 568–570; [GraphBuilder.ts](src/index/GraphBuilder.ts), tag tree at 255 and membership handling in `patchMarkdownFiles`/`applyMetadata`.

The `!this.settings.showTagNodes` condition disables incremental indexing even for edits unrelated to tags. Full rebuilds repeat graph allocation, evidence collection/resolution, search preparation, and eventual snapshot writing. Tag nodes default to off, so this is not evidence that every user encounters the path.

**Implement in two steps:** first allow no-op/tag-unchanged patches when the existing tag topology is still valid. Then add local tag membership/ancestor maintenance with reference counts or equivalent ownership. Create newly needed ancestor nodes, remove genuinely unreferenced derived nodes, and update affected neighbors/search catalogs. Do not simply delete the guard: current patch code looks up existing tag pages and does not create a missing tag tree.

Structural create/delete/rename can remain full rebuilds for the first checkpoint. A later local structural delta is worthwhile for large imports/sync bursts, but must cover renamed link targets, unresolved-node promotion, folders, and inbound evidence before replacing that safe fallback.

**Accept when:** with tags enabled, a prose edit and an alias edit never invoke the full builder; adding/removing nested tags matches a clean rebuild. Shared ancestors and tags used by other notes remain intact.

### F6 — Medium/high: no-op detection disappears with the hot cache

**Evidence:** [GraphBuilder.ts](src/index/GraphBuilder.ts), `FieldCacheEntry` at 22, signature at 129, LRU at 153, previous-entry check at 410/436; [IndexedDbCache.ts](src/index/IndexedDbCache.ts), body record at 31.

The previous semantic signature exists only in the body-cache entry. The cache holds at most 48 iOS, 160 other-mobile, or 1,200 desktop files. A restored snapshot does not restore those signatures. Thus many first edits after startup, or edits outside the recent working set, remove/rebuild evidence even when only prose changed. The temporary eviction probe confirmed this.

The signature also JSON-serializes the complete parsed body, including occurrence positions and arbitrary inline fields. Moving an otherwise unchanged declaration or changing an unrelated inline property can trigger semantic graph work. Copying that entire serialized string into a permanent per-file map would improve hit rate by spending too much memory.

**Implement:** keep compact, versioned graph-input fingerprints separately from the bounded body LRU, optionally persisting them with a compatible snapshot. Distinguish graph topology/presentation inputs from provenance positions and discovery metadata. A provenance-only change must update explanation/navigation locations without unnecessarily re-resolving unchanged relationships. Preserve a safe equality/collision policy; do not treat an unverified short hash as authoritative.

Fingerprint all inputs actually used by collection, including relevant link counts for presentation-only image suppression and relevant settings. Do not serialize arbitrary frontmatter for lenses. Cached body data may still retain the inline fields needed by imagery and field discovery.

Capture file revision/mtime/size before reading, validate it after asynchronous parse work, and never label old content with a newer `file.stat.mtime`. Current build, patch, and prewarm paths read the mutable stat again after awaits. An intervening edit can otherwise turn a stale body into an apparent cache hit and cause repeated repair work or stale output. Use per-path revision tracking so an unrelated new event does not force every completed path through the next catch-up pass.

**Accept when:** prose-only edits remain no-ops after restore and LRU eviction; moved declarations preserve correct source locations; a second edit during parsing cannot publish/cache old content under the new revision.

### F7 — High for long sessions: URL-origin declarations accumulate during incremental edits

**Evidence:** [GraphBuilder.ts](src/index/GraphBuilder.ts), file-owned source kinds at 36, patch removal at 450–460, pair resolution at 483–498, URL-origin creation at 607–614; [RelationEvidence.ts](src/index/RelationEvidence.ts), `addDeclarationRecord` at 267.

Each semantic patch re-adds URL-origin evidence declared by the origin URL rather than by the note. File-owned removal does not remove it, and the store appends declarations without deduplication. The patch's affected-pair resolver resolves only pairs involving the edited note, so a newly introduced origin/URL pair is not resolved. This is both accumulating index work/memory and a discrepancy from full-build behavior.

Removed URL/virtual references also need lifecycle accounting: patches can leave derived nodes/search entries behind, and stale origin declarations keep otherwise-unused URLs connected.

**Implement:** give shared derived origin/URL relationships explicit idempotent ownership/refcounts, and resolve the actual set of changed pairs, including pairs that do not touch the Markdown source. Release derived nodes only when no physical identity, declaration, or shared dependency requires them. Do not merely add `url-origin` to the file-owned source-kind set: its declarer is still the origin, and multiple notes can use the same URL.

**Accept when:** 100 semantic saves of the same URL-bearing note do not grow evidence/page counts; two notes sharing a URL keep the origin relation when one removes it; a newly introduced URL origin is immediately navigable; incremental results match a clean build after additions/removals.

### F8 — Medium, low-risk first fix: some local evidence queries still scan the entire store

**Evidence:** [RelationEvidence.ts](src/index/RelationEvidence.ts), `from` at 166 and `pairsByPath`; [GraphIndex.ts](src/index/GraphIndex.ts), `evidenceFrom` at 258 and frontmatter removal at 1098; consumers in [PlexFilter.tsx](src/ui/PlexFilter.tsx) and [SectionExpansion.ts](src/index/SectionExpansion.ts).

`from(sourcePath)` iterates every pair despite the existing path index. `applyFrontmatterRelationshipRemoval` also uses the global `removeDeclarations` method for a single source/target/field. Repeated F1-triggered renders multiply those unnecessary scans.

**Implement:** use `pairsByPath` for `from`, preserving directional Hidden behavior and inverse perspectives through `between`. Use a pair-scoped or path-scoped removal for targeted relationship edits. Maintain deterministic ordering where callers depend on it.

**Accept when:** unrelated graph growth does not increase the number of pairs visited for a fixed local query/edit. Run inverse, Hidden, precedence, removal, and explanation fixtures. Prefer traversal-count assertions over brittle wall-clock thresholds.

### F9 — Medium/high: section expansion bypasses the worker and repeats parsing

**Evidence:** [SectionExpansion.ts](src/index/SectionExpansion.ts), `scanHeadings` at 45 and `buildCentralSectionExpansion` at 204–335; [PlexGraph.tsx](src/ui/PlexGraph.tsx), 865–894.

After a body read, section expansion scans headings synchronously, parses each section with the direct synchronous parser, and scans the complete link list for each heading. It also scans global evidence through F8. The React cleanup boolean prevents installing a stale result but does not cancel the work. F1 can retrigger this path while indexing is merely pending, including in a hidden leaf.

**Implement:** fix invalidation first. Cache one transient expansion per relevant center file/semantic revision; reuse parsed body occurrences and line/range information where safe. Assign ordered links to section ranges in a single sweep rather than O(headings × links) traversal. Share the canonical resumable parsing service, and make heading/projection work cancellable and sliced. If local parser caching misses, parse once rather than independently per heading.

Keep section nodes outside persistent graph snapshots. Preserve heading boundaries, folded projection, provenance, camera, and bounded-list scroll positions.

**Accept when:** status-only changes and unrelated-note edits do not rebuild the outline; collapsing/changing center stops obsolete work; large heading/link counts scale with input and relationships, not their product.

### F10 — High on iOS: stale restore still publishes and retains a full graph

**Evidence:** [GraphIndex.ts](src/index/GraphIndex.ts), `restoreFullIndexedDbSnapshot` at 452, structural comparison at 496, publications at 538/561, patch-plan flags at 565–567.

The restore detects structural mismatch or missing file bindings but still hydrates relations/evidence and publishes the full graph. The mismatch disables incremental reconciliation, so startup then builds another full graph while the stale one remains live. This contradicts the guide's stale-snapshot memory invariant. A small initial neighborhood preview is a separate concern; the expensive issue is promotion/retention of a known-invalid full state.

**Implement:** reject a known structurally invalid/half-bound full restore before relation/evidence hydration and publication, release its allocations, and enter the authoritative build path. Reuse valid parsed-body checkpoints. Keep any permitted preview explicitly bounded/non-authoritative and prevent failed/partial hydration from being persisted or treated as ready. Also avoid retaining a partially mutated live patch across cancellation without consistent cache invalidation (F4).

**Accept when:** create/delete/rename between sessions causes early rejection of the incompatible snapshot. On a large iOS vault, profiling shows no simultaneous retained stale full graph plus replacement full graph. Missing bindings, interrupted hydration, and close/reopen preserve a recoverable dirty backlog.

### F11 — Medium: persistence needs byte budgets and stronger lifecycle control

**Evidence:** [GraphIndex.ts](src/index/GraphIndex.ts), persistence cancellation at 350, destruction at 358, snapshot write at 825, scheduling at 863 and 968; [IndexedDbCache.ts](src/index/IndexedDbCache.ts), writes at 269, cleanup at 399, body write-behind at 469.

Good existing choices include streamed record generators, activation of a completed generation, five-minute edit persistence deferral, and a separate per-file body cache. Preserve those.

Remaining costs/risks:

- IndexedDB work is asynchronous, but record creation and structured cloning at `put` still occur on the caller's thread. Fixed counts do not bound a high-degree page or a large parsed body.
- Pages, including full relation lists, are persisted both as individual records for preview lookup and in chunks for bulk restore. That is intentional functionality with a storage/clone cost; measure it before redesigning.
- Closing the last view calls `cancelPendingPersistence`, but that does not cancel an orphan-cleanup timer or a cleanup already running. `destroy()` does not advance the build/persistence generation, so clearing scheduled timers alone is insufficient to cancel work already awaiting I/O. Closing an IDB connection is not an abort protocol for all queued work.
- `open()` caches a promise resolving to null after error/blocked. A transient failure can disable durable hits for the entire session; a subsequently successful blocked request also needs its connection lifetime handled.

**Implement:** use time/byte-capped serialization and transactions, generation/revision checks before activation, and explicit lifecycle cancellation throughout maintenance. Recheck demand/revision before scheduling work after an awaited task. Define a bounded retry policy for a failed DB open without a tight retry loop; close late stale connections. Keep schema migration/version bumps explicit.

As a later optimization, consider compact point-lookup records or a path-to-chunk directory to avoid duplicate full page payloads. Demonstrate that this preserves fast bounded preview reads and lowers actual I/O/memory. Consider delta snapshot generations only after the simpler fixes: they add compaction and crash-recovery complexity.

**Accept when:** edit/close/unload during snapshot writing cannot activate an obsolete or incomplete generation; maintenance stops according to demand/lifetime policy; transient DB failure recovers or degrades without repeated heavy retries. Interrupted cold parsing remains resumable on iOS.

## Implementation sequence for Sol

| Checkpoint | Work | Why this order |
| --- | --- | --- |
| 1 | Add debug-only phase/counter instrumentation and regression repros | Separate UI work, parser time, storage waits, and startup work before tuning. |
| 2 | F1 + F8 | Remove known repeated/global work with limited semantic risk. |
| 3 | F2 + parser cancellation portion of F3 | Make hidden-state behavior predictable and prevent cancellation-triggered parsing. |
| 4 | Parser algorithm/resumable core in F3; section invalidation in F9 | Address measured pathological work and direct main-thread parsing. |
| 5 | F7; per-file revision validation and fingerprints in F6 | Stop long-session growth and make local updates reliably local. |
| 6 | F5 | Enable incremental tag-aware updates with clean-build equivalence tests. |
| 7 | F4 + remaining F9 | Bound heavy notes/hydration and safely stage patch deltas. |
| 8 | F10 + F11 | Complete memory-safe restore and persistence lifecycle work. |

F10 can move earlier if physical iOS testing shows memory termination. Keep each checkpoint reviewable and do not mix it with broad renaming, unrelated layout changes, or a new graph architecture.

After these checkpoints, profile before considering further work: bounded concurrent desktop cold reads (currently largely serial), precomputed normalized field lookups in `applyMetadata`, lazy unsorted gate counts separate from sorted neighbor lists, cached/top-k sibling selection, or off-thread search preparation. `relationView` currently classifies each edge repeatedly and sorts complete role lists even for count queries; `getNeighborhood` sorts a complete sibling candidate set before truncation. These are plausible secondary costs, not measured first priorities. Search already pre-normalizes entries, limits results, and reuses prefix candidates; do not replace those working optimizations speculatively.

## Measurement and acceptance plan

### Development instrumentation

Use an explicit development/debug flag, one copyable string per event, and no note content or filenames by default. Record:

- Event burst size, demand state, dirty-path count, chosen incremental/full path, full-build reason, catch-up count, and cancellation reason.
- Read latency, worker send/receive wall time, synchronous parser/fallback time, fingerprint time, evidence collection/removal/resolution, search preparation, publication, and UI commit/layout durations separately.
- Hot/durable cache hits, parsed bytes, declaration/pair/page counts, changed-pair count, suggestion scans, outline rebuilds, and no-op outcomes.
- Snapshot serialization/clone cost versus transaction completion time, bytes/records per batch, peak in-flight read/parse bytes, and retained cache/evidence growth.
- Browser task/input delay and frame gaps. A promise completion, animation-frame callback, storage completion, and actual paint measure different things. Use traces plus visual interaction; do not label a task yield “paint completed.”

### Proposed targets, to calibrate on actual devices

- Target roughly **4–8 ms** of synchronous indexing work per slice during interaction; establish a measured desktop throughput mode if needed. Current builder budgets of 7–13 ms are a starting point, not proof of a bound.
- Investigate every K-Plex-attributable task above **50 ms** in the paste/edit trace. Large-file fallback must not contain a single uninterruptible full-file parse.
- After initialization, no automatic parse/build/global UI scan with zero visible demand. Explicit commands and agreed initial-session startup work are documented exceptions.
- One-file changes visit that file's affected declarations/pairs, not all graph evidence. An unrelated metadata event must not invalidate every graph view.
- Parser time should grow approximately linearly over doubling input sizes; use scaling and work counters for CI, and wall-clock distributions for device profiling.
- Record median/p95/max latency and peak memory against this baseline. Do not promise a percentage speedup before measuring. Improving responsiveness can trade a little total completion time for much shorter blocking intervals.

### Automated tests to add

1. Parser malformed delimiters, huge ordinary lines, fenced payloads, comments, inline code, emoji/CRLF positions, worker/fallback equivalence, worker failure, and disposal during parse.
2. Plugin scheduler integration: event bursts, hidden/open/closed demand, tag-node mode, prose no-op, per-path revision changes during read/parse, catch-up coalescing, and manual rebuild.
3. UI invalidation: status-only updates never rebuild layout/catalogs/sections; closed filter panels do not scan all pages; unrelated metadata does not refresh a materialized lens scene.
4. Incremental/full-build equivalence: tag topology, URL-origin ownership, removed derived nodes, image-link suppression, virtual target promotion, frontmatter/body precedence, Hidden and inverse perspectives.
5. Real IndexedDB/browser tests: DB upgrade, transient open failure, interrupted generation, cancellation/unload during hydration/write, byte-heavy records, warm restore, structural mismatch, and durable parser reuse. The current fixture's Obsidian doubles and absence of a real browser DB do not cover these.

### Manual matrix

Use a small vault and a generated vault of **20,000+ files / 100,000+ graph-search entries**, with both ordinary sparse notes and deliberately high-degree notes. Include long paths, many aliases/tags/URLs, and files with many headings. Separate text bytes from graph density; both can dominate different phases.

- Paste 1–10 MiB ordinary prose, malformed delimiter text, linked Markdown, and a fenced drawing payload. Repeat with a visible graph, hidden tab, collapsed sidebar, folded sidecar, and all K-Plex leaves closed after initialization.
- Test cold start, parser-cache-only restart, fresh snapshot, a few changed notes, structural changes, missing/corrupt cache, and storage unavailability.
- Test tags on/off, expanded sections on/off, high-degree folder/tag centers, active frontmatter lenses, and multiple views/popouts.
- Keep typing, scrolling, opening notes, and switching views while indexing. Capture input delay and frame gaps as well as completion time.
- Close/reopen mid-read, mid-parse, mid-patch, mid-restore, and mid-persistence. Unload/reload the plugin with worker jobs pending.
- Run on desktop Electron and physical iOS/Android. iOS must separately validate peak memory, resumable prewarm, and absence of WebView termination; desktop mobile emulation is insufficient.

For every checkpoint: run `npm test` and `npm run build` under Node 22, retain the existing compatibility fixtures, and add only tests relevant to its new behavior. For final release, run the repository's scanner checks and the affected manual workflows. Remove/disable temporary diagnostics before shipping.

## Guardrails and documentation follow-up

- Keep vault/MetadataCache APIs and graph mutation on the main thread. Move only pure parsing/computation across the established worker boundary. A worker containing the complete graph would introduce another large representation and a much wider protocol.
- Do not replace task yielding with `await Promise.resolve()`, increase debounce indefinitely, silently skip large files, disable provenance, or restore full per-file body retention on iOS. Those approaches hide costs or break the contract.
- Preserve explicit-over-inferred and frontmatter-over-conflicting-body precedence, inverse relationships, folders/tags/attachments/URLs/virtual nodes, Date properties, and source navigation. Keep cache data disposable and authoritative data in the vault.
- Do not change DOM scheduling/window ownership casually. Use verified host APIs and the correct owning window for view work; shared persistent data remains plugin-owned.
- Update [docs/INDEXING_ARCHITECTURE.md](docs/INDEXING_ARCHITECTURE.md) during implementation. Its persistence section still describes plugin-directory chunk files and says iOS does not retain durable parsed bodies; the active code uses IndexedDB on all platforms. Distinguish atomic full-build publication from incremental updates and progressive restore.
- Keep this handoff at the requested repository root. Durable implementation architecture belongs under `docs/`; do not move these internals into the end-user README.

The review's strongest conclusion is that parser offloading alone cannot solve the reported class of freezes: indexing notifications currently provoke UI work, some local changes become full builds, and large individual inputs bypass the effective granularity of cooperative scheduling. Fixing those paths should precede a broader worker or storage redesign.
