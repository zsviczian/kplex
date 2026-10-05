# K-Plex foreground-first indexing performance handoff

## 1. Task recap

Indexing remains too slow on large vaults, including warm startup. The primary product problem is not only total indexing duration: **K-Plex becomes unavailable for useful work while indexing, hydration, or validation is running**.

This is particularly disruptive on mobile, where the expected workflow is often:

1. switch to Obsidian/K-Plex,
2. find a note, navigate the Plex, create a link, or create a node,
3. switch back to another app or note.

K-Plex therefore needs to become **practically usable immediately**, while expensive hydration, validation, source reconciliation, URL extraction, provenance reconstruction, and broader indexing continue in the background.

The requested priorities are:

- “Find in vault” must populate almost immediately.
- The current center node and its first-order relationships must resolve immediately.
- Obsidian `MetadataCache` should be used aggressively for this immediate view:
  - resolved links,
  - backlinks,
  - frontmatter,
  - tags,
  - folders.
- URLs are explicitly allowed to remain incomplete until K-Plex indexing catches up because Obsidian does not provide equivalent URL metadata.
- Navigation, relationship edits, node creation, and similar user actions must pre-empt background indexing.
- A modification affecting the currently visible Plex should receive the same priority.
- Background work should pause cooperatively, service foreground work, and then continue without throwing away completed work.
- Warm startup should be simplified using lessons from Dataview.
- `statusRelationshipLimit` should not be triggered simply because a note belongs to a tag with thousands of members or a very large folder/root folder.
- Correctness, source/provenance rules, ontology semantics, and existing source-local architecture must remain intact.

The objective is primarily **perceived availability and foreground latency**, not merely reducing the final “index fully complete” time.

---

# 2. Main conclusion

The central architectural change should be:

> **Foreground graph availability must no longer depend on full source certification, provenance hydration, URL enrichment, or whole-vault indexing.**

K-Plex should operate in progressively richer states.

A useful mental model is:

### State 1 — Host-ready

Available almost immediately from Obsidian itself.

Can support:

- filename/path search,
- current Markdown center,
- file/folder relationship,
- tags,
- Obsidian links,
- backlinks,
- frontmatter ontology links,
- navigation,
- creating notes,
- editing relationships.

May be incomplete for:

- body URLs,
- URL titles/aliases,
- body-only ontology,
- K-Plex-specific derived semantics,
- complete sibling expansion,
- provenance/evidence inspection.

### State 2 — Graph-ready

A persisted compatible K-Plex graph or a progressively constructed graph is available.

Can support normal graph navigation and most K-Plex semantics.

Source certification and provenance may still be running.

### State 3 — Fully certified

Durable source authority, evidence/provenance, URL vocabulary, search enrichment, source repairs, and all background work are complete.

The UI should not require State 3 for normal navigation.

---

# 3. Performance analysis

## 3.1 Warm startup is dominated by validation, not graph construction

The large-vault diagnostics reviewed during this task showed that the expensive part of a warm startup is primarily **source authority / source reconciliation**, not rebuilding the visible graph.

A representative controlled large-vault warm run was approximately 60–80 seconds, with roughly:

- 52–58 seconds in host/source metadata comparison,
- another ~7–8 seconds in source reconciliation,
- a much smaller amount of time restoring the actual graph,
- page/relation hydration substantially cheaper than source certification.

A previous large-vault run also contained approximately:

- 20.7k pages,
- 20.7k relations,
- ~715k evidence declarations.

This matters because the current startup sequence spends most of its time **proving the persisted graph is valid before allowing it to be fully useful**.

That is the wrong critical path for the desired mobile experience.

---

# 4. Dataview comparison

The relevant Dataview implementation is in:

- `blacksmithgu/obsidian-dataview/src/data-index/index.ts`
- `src/data-import/persister.ts`
- `src/data-import/web-worker/import-manager.ts`

The important concept is not that K-Plex should copy Dataview literally. K-Plex has significantly stronger provenance, ontology, inference, source-independence, and graph requirements.

The useful lesson is Dataview's **warm-start trust model**.

## 4.1 Dataview warm startup

`FullIndex.initialize()` gets the Markdown files and asynchronously calls `reload()` for them.

For a file not already loaded during initial startup:

1. Dataview loads its persisted `PageMetadata` from IndexedDB.
2. It checks:
   - cache version,
   - persisted cache timestamp,
   - file `mtime`.
3. If the cache is current, Dataview immediately calls `finish()` with the cached metadata.
4. Only stale/missing entries are re-read and parsed.
5. `finish()` reconstructs inexpensive in-memory indexes:
   - pages,
   - tags,
   - exact tags,
   - links.
6. Cache cleanup for deleted files happens after the index has become ready.

Dataview uses IndexedDB through `localforage`.

Its file importer also uses a small worker pool—currently two workers—to process files that genuinely need parsing.

## 4.2 Architectural lesson

Dataview treats persisted metadata as something useful enough to **trust first and repair later when required**.

K-Plex currently tends to treat its persisted graph as something that needs substantial source certification before normal operation.

K-Plex should retain its stronger correctness guarantees, but those guarantees should normally be enforced as:

> load → use → certify/repair in background

rather than:

> certify everything → then use.

For K-Plex, the trust boundary can be stronger than Dataview's simple `version + mtime` test.

A trusted warm graph can require:

- active/complete snapshot, not a partial checkpoint,
- compatible graph/index schema,
- compatible semantic settings signature,
- matching physical vault signature,
- no unsupported structural change,
- atomic snapshot generation that was fully committed,
- no required migration that changes graph meaning.

When those conditions hold, the graph should become navigable before source-repository certification.

Source authority remains mandatory eventually. It simply stops being a prerequisite for user interaction.

---

# 5. Existing K-Plex architecture already contains many required pieces

This should be an evolution of the existing architecture, not a new graph system.

Relevant existing pieces include:

- persisted IndexedDB graph snapshots,
- persisted relation data,
- source repository,
- requested semantic scopes,
- source-local preparation,
- progressive cold indexing,
- cooperative builder yields,
- MetadataCache access,
- semantic demand tracking,
- physical search entries,
- incremental Markdown patches,
- startup preview support,
- snapshot checkpoints,
- source/provenance evidence.

The main issue is **ordering and priority**.

Expensive work currently sits in front of useful work too often.

---

# 6. Important code paths

The primary files involved are:

### `src/index/GraphIndex.ts`

Central coordination point for:

- snapshot restore,
- requested semantic scopes,
- source-backed startup,
- graph publication,
- search preparation,
- relationship preparation,
- semantic demand,
- incremental patches.

### `src/index/GraphBuilder.ts`

Long-running graph work and cooperative yielding.

### `src/index/IndexedDbCache.ts`

Snapshot page/evidence iteration and persistence.

### `src/adapters/obsidian/sourceAcquisition.ts`

Source inventory, source authority, requested source preparation, reconciliation and durable source work.

### `src/main.ts`

Startup orchestration, event listeners, dirty scheduling, user-visible status and runtime rebuild scheduling.

### `src/index/CachedSourceSemantics.ts`

Requested source scope memory limits and preparation.

Particularly relevant current limit:

```ts
MAX_CACHED_SCOPE_RETAINED_BYTES = 768 * 1024 * 1024
```

while individual source decode work has a much smaller:

```ts
SOURCE_DECODE_BUDGET_BYTES = 8 * 1024 * 1024
```

The high-degree problem is not simply “the global limit is too small.” Increasing these ceilings is not the desired solution.

---

# 7. Recommended target startup architecture

## Phase A — immediate host-native availability

This should happen directly after `layout-ready`, before durable-source scans or heavy IndexedDB work.

### Immediate Find in vault

Build the first search catalog directly from `app.vault.getFiles()`.

At minimum expose:

- filename,
- path.

Optionally use already-available MetadataCache aliases if doing so remains cheap.

Do **not** wait for:

- K-Plex source repository,
- URL indexing,
- evidence hydration,
- graph snapshot,
- body parsing.

The current search UI should progressively merge better K-Plex results later.

URL entries can appear later.

### Immediate center preview

If K-Plex has a restored/expected center path, build its first-order graph directly from Obsidian metadata.

Use:

- `MetadataCache.getFileCache(file)`
- `getAllTags(cache)`
- `metadataCache.resolvedLinks`
- backlinks
- frontmatter ontology properties
- `TFile.parent`

Create temporary `GraphPage` objects for the center and visible first-order endpoints.

The preview should support:

- center,
- parent folder,
- tag parents,
- direct links,
- backlinks,
- frontmatter ontology relationships.

Body URLs are intentionally missing.

Body-only ontology semantics may also be missing.

This is acceptable because the preview is explicitly provisional.

---

# 8. Important optimization for backlinks

The current prototype implementation derives backlinks by iterating all entries in:

```ts
metadataCache.resolvedLinks
```

and checking which sources point at the center.

That is functionally correct for a temporary implementation but becomes an O(vault) operation on every center change.

The local agent should check the installed Obsidian API/types for a native backlink query such as an available backlink cache API.

If Obsidian does not expose an appropriate bounded method, build a lightweight reverse-link map once from `resolvedLinks` and incrementally update it from MetadataCache events.

Do not make a 20k-file scan part of every navigation action.

---

# 9. Warm startup fast path

This is probably the single highest-value optimization.

The current warm path should be changed so a **fresh compatible active snapshot becomes useful before source-authority reconciliation**.

Conceptually:

```text
layout ready
    |
    +--> filename/path search ready
    |
    +--> host center preview ready
    |
    +--> read active snapshot metadata
            |
            +-- vault signature matches?
            +-- graph settings compatible?
            +-- complete active generation?
                    |
                    YES
                    |
                    +--> hydrate pages + relations
                    +--> publish navigable graph
                    |
                    +--> background:
                         source authority
                         provenance/evidence
                         URL enrichment
                         repairs
                         maintenance
```

Stale or incompatible snapshots can continue using the stronger verified-warm path.

---

# 10. Important remaining warm-start blocker

A partial prototype change already allows a `trustedWarmSnapshot` to skip the blocking source-authority phase before full graph hydration.

However, the current restore code still starts:

```ts
startPersistedSourceInventory()
```

inside the initial:

```ts
Promise.all([
    readSnapshotCatalog(),
    readIndexDiagnostics(),
    startPersistedSourceInventory()
])
```

`startPersistedSourceInventory()` walks durable source head pages until it determines whether source inventory exists/needs work.

This means a supposedly “trusted warm” startup can still perform source-repository work **before it reaches the trusted snapshot decision**.

This needs to be changed.

Recommended order:

1. read graph snapshot catalog,
2. capture cheap physical vault inventory/signature,
3. classify active snapshot,
4. if trusted:
   - publish graph first,
   - start source inventory afterward in background.
5. if not trusted:
   - use the existing verified-warm/source-backed path.

Do not require `startPersistedSourceInventory()` merely to decide whether a physically identical active graph can be displayed.

---

# 11. Progressive graph hydration

A very useful additional boundary is to separate:

1. pages,
2. resolved relations,
3. evidence/provenance.

A schema-3 snapshot already stores resolved relationships in persisted page records.

Therefore:

### Publish after pages + relations

After page records and their persisted relations are hydrated:

- publish a navigable graph,
- prepare enough presentation/search state,
- allow normal navigation.

### Continue evidence hydration privately

Then hydrate the potentially huge evidence store in the background.

For the large test vault this can mean avoiding a foreground wait for hundreds of thousands of evidence declarations.

Evidence is necessary for authoritative editing/explanation/provenance operations, but it should not stop the user from simply navigating.

If an operation requires evidence that has not hydrated yet, that operation should use a **foreground targeted preparation** for its exact pair/scope.

Do not expose partially loaded evidence as authoritative.

---

# 12. Foreground priority scheduler

This is the second major architecture requirement.

Background work must yield to user-visible work.

Suggested priority classes:

### P0 — direct user mutation

Highest priority.

Examples:

- add/remove relationship,
- create node,
- create linked note,
- explicit user edit requiring semantic preparation.

### P1 — navigation / visible center

Examples:

- center changes,
- open Plex,
- requested semantic scope for visible center,
- visible relationship expansion.

### P2 — visible-file modification

Examples:

- `metadataCache.changed` for:
  - current center,
  - current visible neighbor,
  - a node directly affecting current Plex.

### P3 — background indexing

Examples:

- cold-vault indexing,
- full snapshot hydration,
- source reconciliation,
- source inventory,
- URL enrichment,
- graph-wide search vocabulary enrichment.

### P4 — maintenance

Examples:

- evidence persistence,
- orphan cleanup,
- cache cleanup,
- optional migrations.

The important behavior is:

> background tasks pause at safe cooperative boundaries; foreground tasks execute; background tasks then continue from their existing progress.

Do not cancel and restart a 20k-note scan simply because the user navigated.

---

# 13. Existing prototype foreground gate

A partial implementation added a simple shared foreground gate to `GraphIndex`:

```ts
beginForegroundWork()
waitForForegroundIdle()
withForegroundPriority()
```

`GraphBuilder.yieldIfNeeded()` receives an `awaitForegroundIdle` callback.

`IndexedDbCache` chunk iteration also receives a checkpoint callback.

This is a good direction, but it is not yet complete.

The production implementation should evolve this into a coherent scheduling boundary rather than leaving several unrelated ad-hoc callbacks.

Most importantly, foreground priority also needs to affect background work in:

- source inventory,
- source reconciliation,
- source-authority passes,
- search enrichment,
- URL vocabulary work,
- snapshot persistence where appropriate.

Any long-running background loop should have a safe cooperative checkpoint.

Do not put the gate into ordinary foreground patch work itself in a way that produces self-deadlock.

---

# 14. Requested semantic scopes should be foreground work

`ensureSemanticScope(centerPath)` corresponds directly to a visible user demand.

It should execute in the foreground lane.

When the center changes:

1. immediately publish host MetadataCache preview,
2. request the canonical semantic scope at foreground priority,
3. let background vault work pause,
4. publish canonical center scope,
5. resume background work.

The user should never wait for unrelated source owners before a visible center can become authoritative.

---

# 15. Relationship edits must not wait for whole-source reconciliation

A significant stall was identified in the relationship edit path.

`prepareRelationshipPair()` can eventually call:

```ts
await this.sourceAcquisition.flush()
```

before preparing the requested pair.

A broad source flush is inappropriate on the critical path of:

> user clicks “create relationship”.

A partial optimization short-circuits preparation when the selected pair is already covered by current canonical graph authority.

That should be retained.

But the local agent should go further.

For uncertain pairs, prefer:

- pair-local source preparation,
- endpoint-local source preparation,
- explicit owner/source barriers only for contributors relevant to those endpoints,

rather than a global source flush.

A global durability/maintenance fence should only be required when the operation genuinely depends on it.

Acceptance requirement:

> Adding/removing a relationship while background indexing is running must not wait for unrelated vault-wide reconciliation.

---

# 16. File modifications affecting the visible Plex

Visible changes must bypass the normal slow debounce.

Current normal metadata scheduling is optimized for coalescing background updates, but a change to the visible center has different UX requirements.

Recommended sequence on `metadataCache.changed(file)`:

If the changed path affects the active Plex:

1. synchronously refresh the host MetadataCache preview,
2. notify the visible graph,
3. mark the file dirty,
4. queue its canonical incremental patch at foreground/visible priority,
5. use only a very small debounce to collapse Obsidian's burst of events.

A prototype uses approximately 120 ms for this visible-change debounce.

The exact number should be measured rather than treated as fixed policy.

For unrelated files:

- retain the normal background debounce/coalescing behavior.

---

# 17. Startup event-listener gap

This needs careful review.

Currently `registerReactiveIndexListeners()` happens after:

```ts
await snapshotRestoreTask
```

There is a pre-restore change fence that records events during restore, so changes are not simply lost.

However, recorded changes are not the same as **immediately updating a visible Plex**.

Once graph publication becomes earlier than full restore completion, users can interact with the graph while startup background work is still running.

Therefore the startup event architecture should allow:

- visible-center metadata changes,
- user mutations,
- navigation,

to receive foreground treatment even before full snapshot/evidence/source restoration has completed.

Options:

1. register the required foreground subset of listeners before restore and keep the existing broad listeners later, or
2. extend the pre-restore fence so a MetadataCache event affecting a visible host preview refreshes it immediately while also recording the startup change.

Preserve the existing revision/fence behavior so no startup changes are lost.

---

# 18. Find in vault design

The search experience should become progressively enriched.

## Tier 1 — immediate

From `Vault.getFiles()`:

- filename,
- path.

This should be available essentially with the first K-Plex render after layout-ready.

## Tier 2 — host metadata

Can add inexpensive host-known values such as aliases/tags if already available without broad parsing.

## Tier 3 — persisted K-Plex graph

After snapshot page hydration:

- full persisted graph page vocabulary,
- aliases known by K-Plex,
- tags,
- normal graph entities.

## Tier 4 — full semantic enrichment

After background source work:

- URL nodes,
- URL titles,
- body-only discoveries,
- repaired aliases,
- other K-Plex-only vocabulary.

Search must not be globally disabled merely because Tier 4 is incomplete.

A clear internal completeness flag is preferable to making all consumers infer readiness from a generic “index ready” boolean.

---

# 19. High-degree tag/folder relationship-limit problem

This is not primarily a matter of increasing memory limits.

The current requested-scope code can make a center's visible structural parents “complete”.

The relevant pattern in `prepareSemanticScope()` is approximately:

```ts
completeIds = center + visibleParents

for each completeId:
    add every neighbour to requiredIds
```

For a normal parent this is fine.

For:

- `#excalidraw` with thousands of notes,
- a root folder containing almost the entire vault,

this effectively turns:

> show that the center belongs to this tag/folder

into:

> load all members of this tag/folder so sibling incidence is complete.

That can explode requested scope memory and trigger `decode-budget` / relationship-limit behavior.

This is unnecessary for initial center navigation.

---

# 20. Recommended high-degree fix

Separate these concepts:

### Direct structural incidence

To display:

```text
Note A -> #excalidraw
```

K-Plex only needs to know the tag relationship itself.

It does **not** need all 5,000 other notes carrying the tag.

Likewise:

```text
Note A -> root folder
```

does not require materializing every file in the root.

### Sibling derivation

If K-Plex wants to show siblings through that tag/folder, that is a separate enrichment operation.

It may legitimately be expensive.

Therefore:

1. always allow the center and direct structural parent relationship,
2. do not require complete parent incidence as a prerequisite,
3. mark high-degree sibling expansion as deferred,
4. load/stream/paginate it only when needed.

For an ordinary document center:

- direct link relationships should remain usable,
- tag/folder parents should remain usable,
- sibling results through enormous structural parents may temporarily be missing.

That is much better than making the entire note fail with:

> This note exceeds the relationship-loading limit.

If the user explicitly navigates to the tag/folder node itself, it becomes the requested center and can be handled as a high-degree center through:

- bounded batches,
- pagination/streaming,
- an explicit high-degree presentation strategy.

Do not require all children merely to show the node.

---

# 21. Do not solve the relationship limit only in the UI

A partial prototype currently changes status presentation so that if a bounded host preview remains useful, a canonical scope `decode-budget` failure is presented as “relationship incomplete” instead of the hard relationship-limit error.

That is a useful UX fallback but **not the actual fix**.

The algorithm should stop requesting unnecessary structural fanout.

The final implementation should ensure that large structural fanout is not charged against the normal center preparation in the first place.

The UI status change can remain as additional protection.

---

# 22. Cold startup

Cold startup can legitimately take much longer to finish.

It should still become useful almost immediately.

Recommended cold flow:

```text
layout ready
   |
   +--> host filename search
   |
   +--> center MetadataCache preview
   |
   +--> foreground canonicalize center
   |
   +--> background vault indexing
            |
            +--> repeatedly yield for foreground work
```

For the cold process, prioritize work in this order:

1. current center,
2. direct visible neighborhood,
3. recently requested/navigation targets,
4. remaining vault.

There is little value in parsing note 12,351 before servicing a user navigation request for note B.

---

# 23. Dataview-inspired cold throughput

Dataview uses two parser workers.

K-Plex already has a worker parser boundary, so after the foreground architecture is working and profiling shows parsing is still a significant cold-start bottleneck, consider a small bounded parser pool on desktop.

Suggested policy:

- desktop: possibly 2–4 parser workers after measurement,
- Android: conservative,
- iOS: remain conservative due WebView memory pressure.

Do not make additional workers the first optimization.

The much more important change is that cold indexing no longer owns the user's interaction lane.

---

# 24. Progressive evidence/provenance

A persisted page+relation graph should be navigable without waiting for all evidence declarations to load.

However, editing operations sometimes require exact provenance.

The correct behavior is:

```text
navigation:
    use resolved graph

relationship mutation:
    if exact evidence already loaded/current:
        proceed
    else:
        foreground-prepare exact pair/scope
        proceed
```

Do not globally hydrate 700k evidence declarations merely because the user wants to open one center.

---

# 25. Partial implementation already explored

The current offline working copy contains partial, **not fully validated**, changes in five files:

- `src/index/GraphBuilder.ts`
- `src/index/GraphIndex.ts`
- `src/index/IndexedDbCache.ts`
- `src/main.ts`
- `tests/indexing.test.mjs`

The development environment used for this work had unusable/incomplete `node_modules`, so these changes did not receive the required TypeScript/build/Obsidian validation.

Treat them as a prototype/design reference rather than trusted finished production code.

## `GraphBuilder.ts`

Added an optional foreground-idle callback.

At cooperative yield boundaries:

```ts
awaitForegroundIdle()
```

allows background graph work to pause while foreground work exists.

## `IndexedDbCache.ts`

Snapshot chunk iteration gained a cooperative checkpoint before reading the next batch.

This allows long snapshot hydration to yield to foreground work.

## `GraphIndex.ts`

Prototype additions include:

### `primePhysicalSearchCatalog()`

Populates filename/path search from the vault before IndexedDB/source work.

### `publishHostMetadataPreview(centerPath)`

Creates an immediate first-order graph using:

- folder,
- tags,
- resolved links,
- backlinks,
- frontmatter ontology fields.

It intentionally does not parse body URLs.

### `refreshVisibleHostMetadataPreviews(changedPath)`

Refreshes active host previews when a visible file changes.

### Foreground work gate

Prototype methods:

```ts
beginForegroundWork()
waitForForegroundIdle()
withForegroundPriority()
```

### Trusted warm snapshot

A fresh compatible active graph snapshot can bypass source-authority waiting before graph hydration.

### Page/relation publication before evidence

Schema-3 pages and persisted relations can be published as a navigable graph before the evidence store is fully hydrated.

### Relationship pair fast path

If a current authoritative graph already covers an existing pair, the user interaction can avoid waiting for a broad source flush before the first write.

## `main.ts`

Prototype behavior:

- prime Vault search at layout ready,
- publish MetadataCache center preview before snapshot restore,
- detect visible metadata changes,
- use a shorter visible-change debounce,
- soften `statusRelationshipLimit` when a usable host preview exists.

## `tests/indexing.test.mjs`

A warm restore regression was started to ensure a fresh compatible graph can publish without waiting for source authority.

The agent should review and extend these tests rather than assuming they are sufficient.

---

# 26. Risks in the current prototype that must be checked

## Host relationship directions

The temporary host graph reconstructs ontology/link roles outside the canonical compiler.

Verify carefully against existing ontology semantics:

- parent vs child,
- inverse inference,
- `inferAllLinksAsFriends`,
- previous/next,
- left/right,
- Hidden,
- explicit-over-inferred precedence,
- frontmatter-over-ordinary-link precedence,
- relation direction.

The host preview is allowed to be incomplete, but it must not display relationships in the wrong semantic direction.

Use existing graph compiler fixtures as the oracle.

## Backlink performance

Do not retain a full `resolvedLinks` scan on every center change if a better host/native or reverse-index solution is available.

## Search visibility

Ensure the immediate physical search catalog respects the intended existing file visibility/exclusion behavior.

Do not accidentally surface excluded files that normal K-Plex search intentionally hides.

## Trusted snapshot classification

Only the exact safe case should skip blocking certification.

Stale snapshots, structural mismatches, unsupported renames, semantic policy changes requiring recompilation, corrupt generations, etc. must remain on the stronger fallback path.

## Source inventory still starts too early

As described earlier, remove `startPersistedSourceInventory()` from the fast warm critical path.

## Foreground gate coverage

The current prototype gates GraphBuilder and IndexedDB hydration but not every expensive background source operation.

Complete the scheduling model.

---

# 27. Recommended implementation sequence

## Checkpoint 1 — baseline and instrumentation

Before changing more architecture, capture a repeatable baseline with the real Obsidian CLI large vault.

Record at least:

- layout ready,
- host search ready,
- host center preview ready,
- persisted preview ready,
- page+relations graph ready,
- source-authority start/end,
- requested semantic scope ready,
- evidence hydration start/end,
- full index ready.

Also record foreground latency:

- navigation requested → graph update,
- link creation requested → write start/end,
- visible metadata changed → preview updated,
- foreground work requested → background yielded.

Keep these diagnostics aggregate-only.

## Checkpoint 2 — immediate Find in vault

Implement and verify `primePhysicalSearchCatalog()`.

Acceptance:

- filename/path Find results are available before any source-authority scan,
- no URL dependency,
- works cold and warm,
- does not require snapshot existence.

## Checkpoint 3 — immediate center preview

Implement/verify host MetadataCache first-order preview.

Use:

- folder,
- tags,
- direct links,
- backlinks,
- frontmatter ontology.

Acceptance:

- opening K-Plex on a cold large vault immediately produces the center and host-known direct relationships,
- body URL relations may be absent,
- no whole-vault note parsing,
- no durable source flush.

## Checkpoint 4 — warm graph before source authority

Refactor trusted warm restore.

Remove durable source inventory from the initial fast-path dependency.

Acceptance:

For an unchanged compatible vault:

```text
host search
host preview
snapshot pages+relations
navigable graph
```

must all occur before source-authority completion.

Then start source inventory/reconciliation in background.

## Checkpoint 5 — evidence after navigation

Publish the complete persisted page/relation graph before evidence hydration.

Acceptance:

- normal navigation works during evidence hydration,
- provenance-dependent operations use targeted foreground preparation if required,
- no partially loaded evidence becomes authoritative.

## Checkpoint 6 — complete priority scheduler

Convert the prototype gate into a consistent scheduler/priority mechanism.

Background cooperative boundaries should include:

- GraphBuilder,
- snapshot hydration,
- source authority/inventory,
- background semantic reconciliation,
- URL enrichment,
- large search preparation,
- persistence where appropriate.

Acceptance:

While cold or warm background work is active:

- click another center → serviced immediately,
- add relationship → serviced immediately,
- create node → serviced immediately,
- visible edit → serviced immediately,
- background resumes afterward.

## Checkpoint 7 — visible modification lane

Make visible MetadataCache changes refresh host preview immediately and canonicalize at foreground priority.

This must work during startup hydration as well, not only after normal reactive listeners have been registered.

## Checkpoint 8 — relationship mutation path

Remove unnecessary broad `sourceAcquisition.flush()` waits from foreground relationship actions.

Use exact pair/local source preparation.

Verify add and remove operations.

## Checkpoint 9 — high-degree tag/folder scope

Refactor requested semantic scope so direct structural parent relationships do not force complete parent child incidence.

Treat optional sibling expansion separately.

Acceptance:

A note with `#excalidraw` where the tag has many thousands of members:

- opens normally,
- shows the tag parent,
- keeps other direct relationships,
- does not show `statusRelationshipLimit` solely because of the tag fanout.

Repeat with a root folder containing most vault files.

## Checkpoint 10 — cold throughput

Only after the perceived experience is solved:

- profile parser throughput,
- consider bounded worker concurrency,
- consider additional batching/vectorization of source-authority IndexedDB work.

---

# 28. Tests to add or extend

## Warm startup

Fresh compatible snapshot:

- source authority deliberately blocked,
- page/relationship graph must still publish,
- navigation must work,
- host Find must work.

Then release source authority and confirm completion.

## Stale warm startup

Change:

- note mtime,
- vault membership,
- folder structure,
- graph semantic settings.

Verify the trusted path is not incorrectly used.

## Immediate search

With source repository and IndexedDB intentionally blocked:

- filename/path query must return physical vault entries.

Then allow snapshot hydration and verify richer results merge correctly.

## Host center preview

Construct notes with:

- frontmatter parent,
- child,
- left/right,
- previous/next,
- ordinary links,
- backlinks,
- tags,
- nested tags,
- folder membership.

Compare provisional directions with canonical graph results after indexing completes.

## Background pre-emption

Create a controllable long-running builder.

While it is paused/running:

1. request a center,
2. verify background yields,
3. complete center work,
4. verify background resumes from previous progress.

Test nested/overlapping foreground requests.

## Relationship mutations

While background reconciliation is deliberately blocked:

- add relationship,
- remove relationship,
- create linked node.

Verify they do not wait for the unrelated background owner.

## Visible metadata change

While background indexing is active:

- modify center frontmatter,
- modify a visible neighbor,
- modify an unrelated note.

Expected:

- first two update at foreground priority,
- unrelated file remains background work.

## High-degree tag

Generate perhaps:

- 10,000 notes sharing one tag.

Open one ordinary note.

Assert:

- center is prepared,
- tag relation is prepared,
- no hard relationship-limit result,
- K-Plex does not materialize all 10,000 siblings merely to display the center.

## Root folder

Repeat with thousands of files in the vault root.

## Evidence hydration

Create a snapshot with a very large evidence store.

Block evidence iteration after pages/relations.

Verify:

- graph navigation works,
- Find works,
- exact mutation performs targeted prep if needed.

---

# 29. Obsidian CLI validation scenarios

The local agent has the right environment for the validation that could not be completed offline.

Use both:

- a small functional vault,
- a generated 20k+ note scale vault.

The large vault should contain:

- sparse normal notes,
- a tag shared by thousands of notes,
- thousands of files in one folder/root,
- links/backlinks,
- frontmatter ontology,
- URL-heavy notes,
- a few high-degree nodes.

Run at least:

### Warm unchanged

Restart Obsidian/K-Plex without changing the vault.

Measure:

- Find availability,
- host preview,
- persisted graph navigation,
- source-authority completion,
- total full readiness.

### Warm with one changed note

Change a nonvisible note while K-Plex is closed.

Verify:

- rest of graph is immediately usable,
- changed note is reconciled in background.

### Warm with center changed

Change the current center before restart.

Host MetadataCache preview should make it useful while canonical repair runs.

### Cold startup

Delete K-Plex caches while leaving Obsidian MetadataCache available.

The center and filename search should still be immediately usable.

### Interaction during indexing

Repeatedly:

- navigate,
- create note,
- create link,
- remove link,
- edit visible frontmatter.

Measure interaction delay while background work continues.

### Mobile/low-power behavior

Where possible use physical mobile tests.

Desktop emulation is not sufficient for:

- iOS WebView memory behavior,
- process termination,
- interaction latency under constrained CPU.

---

# 30. Suggested performance targets

These are targets to validate/calibrate, not promises.

### Immediate host search

Target:

- available with the first K-Plex render after layout ready,
- ideally well below 500 ms even on a large mobile vault.

### Immediate center preview

Target:

- generally sub-second from K-Plex opening,
- ideally a few hundred milliseconds.

### Warm persisted graph

Target:

- approximately 2–5 seconds for a ~20k-note vault would be a reasonable first architecture goal,
- source/provenance work may continue afterward.

### Foreground scheduling delay

While background indexing runs:

- foreground work should normally begin within one cooperative slice,
- aim for roughly <50 ms scheduling delay,
- actual filesystem/MetadataCache writes may take longer.

Existing mobile slice budgets of approximately 7–13 ms are appropriate starting points.

---

# 31. Validation commands

The repository requires Node 22:

```text
>=22.22.2 <23
```

Start with:

```bash
npm ci
npm run build
```

Focused tests while developing should be followed by:

```bash
npm test
```

Before delivery:

```bash
npm run verify
```

With the proper Obsidian environment also run the applicable native validation, including:

```bash
npm run verify:obsidian
```

and any SI5/indexing-specific native scenarios relevant to this branch.

Do not treat a skipped IndexedDB/browser/native test as a pass.

---

# 32. Diagnostics to retain during development

Add temporary or development-only timing/counters around:

```text
layout-ready
host-search-ready
host-preview-ready
snapshot-catalog-read
vault-inventory-complete
snapshot-relations-ready
navigable-graph-published
source-inventory-start/end
source-authority-start/end
evidence-hydration-start/end
full-index-ready
```

For priority behavior:

```text
foreground-requested
background-paused
foreground-started
foreground-finished
background-resumed
```

For high-degree behavior:

```text
structural-parent-degree
deferred-structural-fanout
requested-sibling-count
semantic-scope-retained-bytes
```

Do not log note contents.

---

# 33. Correctness guardrails

Do not improve startup by weakening core semantic guarantees.

Preserve:

- explicit relationships over inferred relationships,
- frontmatter precedence,
- inverse relation semantics,
- Hidden semantics,
- ontology field configuration,
- source identity,
- source-local provenance,
- publication revision fences,
- MetadataCache/file identity checks,
- folder/tag semantics,
- URL identity semantics,
- attachment handling,
- virtual-node behavior.

The temporary host preview is allowed to be incomplete.

It is **not** allowed to silently become the permanent authoritative semantic graph.

Canonical preparation must replace it when available.

---

# 34. Avoid these shortcuts

Do not:

- simply raise relationship memory limits,
- wait for full source authority before displaying a trusted warm graph,
- make URL completeness block search,
- make evidence hydration block navigation,
- cancel/restart whole indexing jobs for every user action,
- globally flush sources before a local relationship edit,
- scan the entire vault for backlinks on every navigation if a reverse index/native API can avoid it,
- preload every member of a huge tag just to show that the center belongs to the tag,
- report the entire center unusable because optional sibling enrichment exceeded a budget,
- treat a generic timer/debounce as foreground priority.

---

# 35. Recommended final architecture

The desired lifecycle is:

```text
                    ┌─────────────────────────────┐
                    │       Obsidian ready         │
                    └──────────────┬──────────────┘
                                   │
                 ┌─────────────────┴─────────────────┐
                 │                                   │
        Host physical search                Host center preview
        filename/path                       links/backlinks
        immediately                         tags/folder/frontmatter
                 │                                   │
                 └─────────────────┬─────────────────┘
                                   │
                            K-Plex usable
                                   │
                 ┌─────────────────┴─────────────────┐
                 │                                   │
        foreground requests                   background work
        navigation                            snapshot hydration
        mutations                             source authority
        visible edits                         URL enrichment
                 │                            evidence/provenance
                 │                                   │
                 └──── pre-empts/yields ─────────────┘
                                   │
                       progressively richer graph
                                   │
                          fully certified index
```

The important product principle is:

> **Index completeness is a background state. User availability is a foreground state. They should no longer be the same thing.**

---

# 36. Definition of done

This task should be considered successful when all of the following hold:

1. On an unchanged warm large vault, filename/path Find results are available almost immediately.
2. The center and Obsidian-known first-order relations are visible almost immediately.
3. A compatible persisted graph becomes navigable before durable source-authority reconciliation completes.
4. Evidence/provenance hydration does not block ordinary navigation.
5. User navigation pre-empts background indexing.
6. Relationship creation/removal pre-empts background indexing.
7. Node creation pre-empts background indexing.
8. Visible file modifications update the current Plex ahead of unrelated background work.
9. Background work resumes after foreground work and does not restart from zero.
10. URLs/search enrichment can remain temporarily incomplete without disabling normal Find.
11. A huge tag does not make an ordinary member note fail with `statusRelationshipLimit`.
12. A huge folder/root folder does not make an ordinary member note fail for the same reason.
13. Stale/invalid snapshots still fall back to the stronger safe path.
14. Source authority/provenance still eventually converges to the same canonical result as a clean full build.
15. Automated tests, real IndexedDB tests, TypeScript/build, and Obsidian CLI validation all pass.

The main performance win should come from **moving work out of the critical path**, not merely making the same blocking sequence somewhat faster.