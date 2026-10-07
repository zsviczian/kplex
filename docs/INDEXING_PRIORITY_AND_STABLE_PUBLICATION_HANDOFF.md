# K-Plex indexing priority and stable-publication handoff

## Purpose

This handoff is for implementing a focused indexing/runtime-stability correction in K-Plex. The work is based on user-observed behavior plus a static review of the supplied repository.

The goals are:

1. make the scheduler follow an explicit five-level priority model;
2. reduce visible churn while web-link inventory is discovered;
3. prevent a correct foreground/local graph from being replaced by an incomplete background representation;
4. prevent node styling from disappearing while presentation inputs are temporarily pending;
5. ensure pending presentation data repairs itself automatically without requiring navigation/editor gymnastics.

This is primarily a **correctness and perceived-stability** task. Do not turn it into a general indexing rewrite.

Read `AGENTS.md`, `CONTRIBUTING.md`, the current `HANDOFF.md`, and the relevant indexing architecture documents before editing. Preserve existing source/revision/publication fences and the current Obsidian/iOS safety constraints.

---

# 1. User-observed problems

## 1.1 Web-link discovery is too visually chatty

The user observed a URL that occurs roughly 300 times in the vault. During URL discovery, the graph flickered significantly as incoming URL relationships appeared.

The desired UX is not to redraw the Plex for every newly discovered URL owner. Background URL discovery should be allowed to progress internally and persist its cache continuously, while the visible graph receives **coalesced, stable updates**.

A reasonable target is a maximum background publication cadence of about **one graph/presentation update every 5 seconds**, plus immediate publication at important boundaries such as completion or a foreground user action.

The 5-second value is a UX batching target, not permission to delay user-driven changes by five seconds.

## 1.2 Correct local graph loses nodes during background hydration/indexing

Observed sequence:

1. user navigates to a node;
2. the local graph loads correctly;
3. background hydration/indexing continues;
4. nodes that were already displayed suddenly disappear;
5. they do not return by themselves;
6. navigating away and back causes the graph to become correct again.

This is a correctness failure. Background progress at the same vault/settings revision must not make an already-correct visible graph less complete.

## 1.3 Correct tag-based node styling disappears later

Observed sequence:

1. user navigates to a node;
2. the center and children receive the correct styling derived from tags;
3. several seconds later the styling disappears;
4. it does not reliably return automatically;
5. even after the full index reports ready, styling may remain wrong;
6. switching to the editor/Markdown representation, switching back, navigating away/back, etc. eventually causes styling to reappear.

This indicates both a **regression-on-pending** problem and an **eventual-refresh** problem.

---

# 2. Findings from the current implementation

## 2.1 The scheduler already supports five priority lanes

`src/index/ForegroundWorkScheduler.ts` already defines:

```ts
export type IndexWorkPriority = 0 | 1 | 2 | 3 | 4;
```

Its behavior is cooperative:

- a task owns a priority using `begin()` / `run()`;
- lower-priority work calls `checkpoint(priority)`;
- a checkpoint waits while **strictly higher-priority** owners are active;
- work at the same priority does not preempt other work at that priority.

This means the required hierarchy can be implemented using the existing scheduler. A new scheduler is not required.

The important current limitation is that broad background work and URL work commonly checkpoint at priority `3`, so they behave as peers.

## 2.2 Current desired foreground lanes are already mostly visible in the code

Examples in `GraphIndex.ts`:

- mutation APIs use `withForegroundPriority()` whose default is priority `0`;
- current semantic demand uses priority `1`, e.g. `acquireSemanticDemand()` and `ensureSemanticScope()`;
- visible host/neighborhood/gate work commonly uses priority `2`;
- `startBackgroundUrlIndex()` explicitly owns priority `3`;
- many whole-index/snapshot/background operations also currently use `checkpoint(3)`.

The principal scheduler change is therefore to give whole-vault/background acceleration its own lower lane, P4.

## 2.3 URL owners are persistently cached and restored cheaply

This is useful context and should be preserved.

`GraphIndex.restoreUrlIndex()` reads compact URL-owner records from IndexedDB. For each record it validates:

- file still exists;
- file is Markdown;
- `mtime` matches;
- size matches;
- there is no current-session invalidating URL-owner event.

When those checks pass, it calls `publishUrlOwner()` from the compact cached URL facts instead of rereading/reparsing the Markdown file.

`startBackgroundUrlIndex()` then skips owners whose file identity, mtime, size and event token still match.

Do not regress this behavior.

## 2.4 URL publication is currently very chatty

`GraphIndex.publishUrlOwner()` currently performs URL-state publication and then calls `emitPresentation()` from the per-owner commit path. Its `finally` also calls `emitPresentation()`.

`startBackgroundUrlIndex()` also calls `emitPresentation()` after each discovery group and again at completion/finalization.

So a high-degree URL may cause a large number of visible notification/layout cycles while its owners are discovered.

This is a concrete code-level explanation for the reported flicker.

Also note: simply throttling one call site is not enough. URL owner commits mutate `urlState`, search facets and URL-related caches. The batching design must define the boundary at which the **currently displayed relation projection** is allowed to observe those changes.

## 2.5 Eager local-to-durable handover can retire foreground state before replacement is ready

The strongest suspicious path for the disappearing-node report is `GraphIndex.retryDemandedSemanticScopes()`.

When Eager source dependencies become available, the current code clears local foreground structures before asynchronously requesting durable semantic scopes:

```ts
this.onDemandBaselineRevision++;
this.onDemandHostScopes.clear();
this.onDemandCachedScopes.clear();
this.onDemandIndexed.clear();
this.onDemandGateRevisions.clear();
this.onDemandUnavailableCounts.clear();
...
for (const path of retry) void this.ensureSemanticScope(path);
```

At the same time, `usesLocalForeground()` is a global strategy predicate. Once durable source authority becomes available, readers may stop treating the local foreground path as active even though the requested durable replacement for the visible center is not yet published.

This creates a plausible handover sequence:

```text
correct local graph
    ↓
source authority becomes available
    ↓
local read proof/scopes are retired
    ↓
replacement semantic scope is still preparing
    ↓
visible graph temporarily regresses or loses nodes
```

This is a **likely root-cause path** based on static analysis. Reproduce it in a deterministic test before/while implementing the fix, but the architectural correction should be implemented regardless: replacement must be certified before retirement of the coherent visible predecessor.

## 2.6 Presentation pending currently writes known-empty style values

This is a concrete correctness bug.

In `src/index/GraphPresentation.ts`, `presentationFacetsForPage()` calculates `tagsPending`. When styling inputs are pending it currently returns:

```ts
{ primaryStyleTag: null, styleTags: [] }
```

while also reporting:

```ts
styleTags: "pending"
```

Likewise, pending note type currently returns `noteType: null`.

`applyPreparedPresentation()` then executes:

```ts
Object.assign(page, fields);
```

Therefore `pending` is currently capable of erasing a previously valid presentation value.

That contradicts the intended semantic meaning of pending. Pending means **replacement value is not known yet**, not **the known value is empty**.

The source comment even says:

> `null plus pending never asserts a known-empty value`

but the implementation does in fact assign the null/empty fields to the page.

The same pattern is also used from incremental publication paths such as `commitPreparedFile()` because it consumes `presentationFacetsForPage()` output and assigns the returned facets.

## 2.7 Presentation pending is not part of the global ready condition

`main.ts` computes index readiness from graph/cache/search/semantic state. Per-page `presentationStatuses` are not part of the global `upToDate` condition.

Therefore it is possible for the UI to say the index is ready while a page's style presentation is still pending or has been incorrectly overwritten by empty values.

Do not necessarily make the whole-vault index wait forever for every presentation input, but visible/demanded presentation must be correct and self-repairing.

## 2.8 Metadata events do not guarantee a pending style will be retried to completion

There are existing metadata `changed` and `resolve` listeners and targeted visible refresh paths. However, pending presentation is currently represented mainly in a `WeakMap<GraphPage, PresentationStatus>`, which is not an enumerable retry queue.

The reported need to enter the editor/Markdown representation and navigate repeatedly is consistent with a missing reliable completion path: some later Obsidian activity happens to make the required metadata/body input available and causes another refresh.

The fix must therefore do two things:

1. **never regress a valid style merely because new inputs are pending**;
2. **automatically retry pending visible presentation when the needed inputs become current**.

---

# 3. Required scheduler priority model

Implement and document the scheduler hierarchy exactly as follows:

```text
P0  mutations / explicit actions
 │
P1  current node / requested semantic graph
 │
P2  visible neighborhood / gates
 │
P3  web-link inventory
 │
P4  full graph hydration / full indexing / maintenance
 ▼
```

Lower number = higher priority.

## 3.1 Meaning of each lane

### P0 — mutations / explicit actions

User-initiated operations that intentionally change persistent graph/vault state and must reflect immediately.

Examples include relationship create/relink/delete, creating a related note, writing relationship metadata, or another explicit mutation whose completion the user is directly waiting for.

Do not interpret “explicit actions” as every UI click. The key property is direct, user-requested state change or equally urgent explicit operation.

### P1 — current node / requested semantic graph

Work necessary to make the currently requested center semantically correct.

Navigation must never wait behind URL inventory or whole-vault indexing.

### P2 — visible neighborhood / gates

Work required to complete or repair what is already visible around the requested center: visible neighbors, gates, host previews and targeted visible-source repair.

### P3 — web-link inventory

Independent URL/web-link owner discovery, restoration/validation work and its background compilation/publication.

P3 must yield to P0/P1/P2.

P3 must preempt P4.

### P4 — full graph hydration / full indexing / maintenance

Whole-vault acceleration and non-interactive maintenance, including broad graph hydration/indexing and low-priority cache maintenance.

P4 runs only when P0–P3 are not demanding the scheduler.

---

# 4. Scheduler implementation requirements

## 4.1 Add named priorities

Avoid spreading more raw `0`, `1`, `2`, `3`, `4` literals.

Introduce named constants or an enum-like object close to `ForegroundWorkScheduler`, for example conceptually:

```ts
INDEX_PRIORITY.MUTATION = 0
INDEX_PRIORITY.CURRENT_NODE = 1
INDEX_PRIORITY.VISIBLE_NEIGHBORHOOD = 2
INDEX_PRIORITY.WEB_LINK_INVENTORY = 3
INDEX_PRIORITY.FULL_INDEX = 4
```

Names may differ, but call sites should make their intent obvious.

## 4.2 Preserve P0/P1/P2 behavior

Do not accidentally lower current foreground correctness work while moving background work.

Existing P0/P1/P2 call sites are broadly consistent with the target architecture and should be preserved unless a concrete misclassification is found.

## 4.3 Keep URL discovery at P3

`startBackgroundUrlIndex()` already owns `run(3)` and its URL-specific parsing/alias preparation uses P3 checkpoints.

Retain that conceptual lane, using the new named constant.

## 4.4 Move whole-vault/background acceleration to P4

Audit whole-graph work such as:

- snapshot page/evidence hydration;
- broad Eager source/inventory work;
- remaining-vault portion of progressive full indexing;
- full rebuild work that is not part of a demanded local repair;
- snapshot persistence/orphan cleanup/other low-priority maintenance.

These should checkpoint/own P4 so that an active URL inventory at P3 pauses them.

The startup behavior should effectively become:

```text
cached URL-owner restore
        ↓
requested/local graph becomes usable
        ↓
P3 URL inventory completes, while yielding to P0/P1/P2
        ↓
P4 whole-vault hydration/indexing/maintenance continues
```

If a user navigates during any background work:

```text
P4 full index
   ↓ paused by P3
P3 URL inventory
   ↓ paused by P1/P2
P1/P2 local visible graph
   ↓ completes
P3 resumes
   ↓ completes
P4 resumes
```

This is the required ordering.

## 4.5 Do not blindly replace every `checkpoint(3)` with `checkpoint(4)`

This is important.

`ForegroundWorkScheduler.checkpoint()` waits on all strictly higher active lanes. A P1 owner that calls a P4 checkpoint from inside its own lifetime would see the active P1 owner — itself — and can self-deadlock.

Therefore classify by **work lifetime**, not by search-and-replace.

Some shared helpers are used by both foreground and background operations. They need caller-specific checkpoint capabilities rather than a single global priority.

Examples to review carefully:

- `KplexIndexedDbCache` currently receives one constructor-level `backgroundCheckpoint` callback. URL-owner reading and full snapshot/maintenance work need different priorities after this change. Consider making the callback priority-aware or allowing individual operations to receive an override.
- `ObsidianSourceAcquisition` documents that its optional checkpoint is used only by background inventory/optional background owners, specifically to avoid foreground self-deadlock. Preserve that invariant if moving its broad inventory to P4.
- `GraphBuilder` already accepts a caller-supplied checkpoint. Full rebuild callers can supply P4 while foreground/local callers retain their appropriate foreground runtime.

Add tests that would fail if a foreground owner waits on its own priority through a nested lower-priority checkpoint.

---

# 5. Stable-publication invariant

Scheduling priority alone is not enough. Introduce and test this invariant:

> **At an unchanged vault/source/settings revision, background work must never make the actively displayed Plex less complete than the coherent foreground representation it is replacing.**

Background work may add information progressively. It must not remove already-valid visible information merely because a replacement is still incomplete.

Removal/change is allowed when one of the following is true:

1. there is a genuine newer vault/source observation proving the old information stale;
2. settings changed and the new policy intentionally changes the result;
3. a new coherent replacement has been fully prepared and is atomically promoted.

This applies to:

- node presence;
- relationship presence;
- relationship role;
- gate counts/coverage;
- tag-derived styling;
- note type/presentation facets;
- other visible presentation that is already known-good.

Think of **work priority** and **publication authority** as separate dimensions.

---

# 6. Workstream A — reduce URL publication chatter

## Problem

Per-owner URL discoveries currently generate too many presentation notifications and cache invalidations. A high-degree URL can visibly relayout/flicker hundreds of times during background discovery.

## Required behavior

Background URL discovery should process and persist owners continuously, but the active visible graph should receive coalesced publications.

Target behavior:

- background URL discoveries: at most approximately one visible graph publication per **5 seconds**;
- final discovery completion: flush immediately;
- explicit foreground mutation/current visible source update: flush immediately or through the relevant foreground publication path;
- unload/destroy: cancel any pending flush timer safely;
- URL progress/status may continue updating independently from graph-layout publication if useful.

The 5-second cadence should be implemented as a **maximum batching window**, not as an artificial delay on foreground correctness.

## Suggested design

Create one URL presentation/publication coalescer owned by `GraphIndex`.

During background owner commits:

1. continue updating durable URL owner facts and cache bookkeeping;
2. collect touched URL/page paths in a pending set;
3. avoid per-owner `emitPresentation()`;
4. avoid globally invalidating current relation/presentation caches for every owner when that invalidation can be deferred safely;
5. request one scheduled URL presentation flush.

At a flush boundary:

1. atomically expose the accumulated visible URL relation changes for the current presentation lifetime;
2. invalidate URL-sensitive relation/count caches once;
3. patch any visible/search facets that are intentionally part of the same publication boundary;
4. emit one presentation notification;
5. clear the touched set.

### Important nuance: mutable `urlState`

`composeUrlRelations()` reads `urlState`, so throttling only `emitPresentation()` may still allow intermediate URL state to become visible if an unrelated event causes a re-render/cache miss.

The implementation must explicitly prevent the **current displayed relation projection** from walking every intermediate owner state.

A minimally invasive option is to keep the current rendered relation view cached while background URL commits accumulate, and invalidate/recompute it only on the coalesced flush. New navigation may use the freshest available URL state immediately; the already displayed scene should remain stable until the next batch publication.

If that cannot be made reliable with existing relation-view caching, introduce an explicit working-vs-published URL presentation boundary rather than relying on notification throttling alone.

Do not copy the entire graph for every owner merely to achieve batching.

## Recommended first-publication behavior

For a cold requested URL center, do not leave the user staring at an empty graph for five seconds if the first useful result is already available.

A good policy is:

- publish the first useful demanded URL result promptly;
- then coalesce further background growth to the 5-second window;
- flush immediately at completion.

## URL acceptance tests

Add deterministic tests covering at least:

1. **High-degree URL batching**
   - 300 owners reference one URL.
   - Instrument presentation notifications / visible relation-view invalidations.
   - Assert they are coalesced rather than approximately one per owner.
   - Avoid a real 5-second wall-clock test; expose/inject the coalescer timing boundary or use controlled timers.

2. **No loss of URL facts**
   - final URL neighborhood contains all owners;
   - evidence/provenance and gate counts remain correct;
   - IndexedDB persistence remains current.

3. **Completion flush**
   - final batch is visible immediately when discovery completes even if the timer window has not elapsed.

4. **Foreground URL change is not delayed**
   - a current user-visible edit/mutation affecting URL incidence becomes visible without waiting for the background batch timer.

5. **Navigation during URL scan**
   - P1/P2 work completes while URL inventory is active;
   - P3 resumes afterward;
   - no deadlock and no lost progress.

6. **Unload cleanup**
   - pending URL flush timers/listeners are released and no late publication occurs after index destruction.

---

# 7. Workstream B — fix disappearing nodes during Eager handover

## Problem

A correct local/foreground graph may be retired when durable Eager source authority becomes available, before a complete replacement for the current center has actually been published.

The visible graph can therefore regress during a handover that should be an optimization-only transition.

## Primary code path to fix

Review `GraphIndex.retryDemandedSemanticScopes()` together with:

- `usesLocalForeground()`;
- `acquireSemanticDemand()`;
- `ensureOnDemandCenter()` / local scope structures;
- `ensureSemanticScope()` and semantic-scope publication;
- `semanticPage()` / `semanticRelationSource()` read preference;
- any full-state/snapshot promotion that can change the backing representation of the active center.

The current sequence clears local state first and starts replacement work afterward. Reverse that ownership model.

## Required two-phase handover

The handover should be:

```text
coherent local foreground graph
          │
          ├──────── remains readable ─────────────┐
          │                                       │
          ▼                                       │
prepare durable/source-backed replacement         │
          │                                       │
          ▼                                       │
replacement passes current revision/policy fences │
          │                                       │
          ▼                                       │
atomic read-authority switch ◄────────────────────┘
          │
          ▼
retire old local fallback for that scope
```

Do not globally clear a coherent demanded local scope merely because durable source dependencies became available.

## Separate acquisition strategy from read fallback

`usesLocalForeground()` currently mixes several concerns:

- whether new local foreground work should be acquired;
- whether local scopes are still valid/readable;
- whether the durable/full route should be preferred.

Those concepts need to be separated enough to support handover.

Conceptually distinguish:

1. **may build new local foreground work?**
2. **does a retained local scope remain a valid coherent read fallback?**
3. **is a durable replacement for this demanded center certified and ready to become read authority?**

Once durable authority becomes available, K-Plex may stop starting new temporary local acquisitions, but an already-published coherent local scope should remain readable until its replacement is ready.

## Scope-local retirement, not global retirement

Prefer retiring foreground state per demanded center/scope after successful replacement.

Avoid clearing all of:

- `onDemandHostScopes`;
- `onDemandCachedScopes`;
- `onDemandIndexed`;
- gate/read proof state;

as a prerequisite for starting replacement preparation.

If a replacement fails, is dependency-pending, or is superseded, retain the previous coherent display state.

## Write authority can be stricter than display authority

It is acceptable for a retained fallback to remain **read-only** during an uncertain handover.

For example:

```text
display authority: coherent previous local scope
mutation authority: only current/certified source-backed scope
```

Do not solve correctness by allowing stale data to authorize writes.

## Full-state promotion guard

Any whole-state promotion (`this.state = next`, hydrated snapshot promotion, etc.) that can affect the active center must obey the same principle: a background replacement must be current and coherent for what it claims to replace.

A complete full rebuild can atomically replace the old graph. A partial/in-progress background candidate cannot first erase visible information and repair it later.

## Disappearing-node acceptance tests

Add a deterministic Eager regression test reproducing the user's sequence:

1. hold broad source authority/inventory so Eager initially serves the demanded center from local foreground preparation;
2. demand center `A` with known visible children/relationships;
3. assert the local graph is correct;
4. allow durable source authority to become available but hold the requested replacement before final publication;
5. trigger the current `retryDemandedSemanticScopes()` transition;
6. while replacement is held, repeatedly read `getNeighborhood(A)`;
7. assert the previously visible valid nodes/relations do **not** disappear;
8. release replacement preparation;
9. assert handover occurs once and final graph is correct;
10. assert no navigation-away/back is necessary.

Also cover:

- replacement failure retains prior coherent read view;
- superseded replacement cannot publish;
- an actual newer file edit is allowed to remove a relation immediately when that newer observation proves it gone;
- navigation to another center still receives P1 priority while the handover/background work is pending.

A useful general test assertion is:

> with no source/settings revision change, successive background-only publications for the current center must not reduce its certified visible neighborhood before an atomic replacement is ready.

---

# 8. Workstream C — fix styling regression and automatic recovery

## Problem 1: pending is treated as empty

`presentationFacetsForPage()` currently maps a pending style input to:

```ts
primaryStyleTag: null
styleTags: []
status.styleTags = "pending"
```

and pending note type to `noteType: null`.

This allows an asynchronous/background presentation pass to erase a known-good style even though it has no replacement information.

## Required semantic rule

Use three distinct meanings:

```text
READY(value)      → publish value
READY(empty)      → publish empty/null and intentionally clear old value
PENDING           → do not change the previously published value
```

Pending is not empty.

## Required implementation direction

When style tags are pending, `presentationFacetsForPage()` should return the status but **omit** the style fields from the returned `PreparedPageFacets` object.

Conceptually:

```ts
{
  status: { styleTags: "pending" }
  // no primaryStyleTag field
  // no styleTags field
}
```

Likewise for note type:

```ts
{
  status: { noteType: "pending" }
  // no noteType field
}
```

`applyPreparedPresentation()` already assigns only the fields present in the prepared object after extracting `status`, so omitting unknown fields gives it the correct “retain old known-good value” behavior.

Audit other direct consumers, especially `commitPreparedFile()`, to ensure they do not synthesize empty values for pending facets.

When a later preparation is **ready and genuinely empty**, it must still be able to clear the old style/note type. Do not make old styles sticky forever.

## Problem 2: pending presentation needs an automatic retry owner

Preserving old style fixes regression, but not the case where a page starts without a valid prepared style and remains pending.

Add a bounded targeted retry mechanism for visible/demanded pending presentation.

Suggested approach:

- track pending presentation by path/revision in an enumerable structure, not only a `WeakMap` status;
- record exactly which facet is pending (`noteType`, `styleTags`);
- fence the pending request by current file identity/mtime/size, metadata object/revision, settings/presentation revision and index lifetime;
- on relevant `metadataCache.changed` / `metadataCache.resolve`, body-cache availability, or current source publication, retry only affected visible/demanded pages;
- perform the retry at P2 when it affects the visible neighborhood;
- publish only if the same page/source/settings observation is still current;
- when ready, update the fields, mark status ready and emit one presentation update;
- if still pending, retain the current valid visible value and wait for the next genuine input event rather than polling aggressively.

Do not use repeated polling of all pages.

## Metadata `resolve` deserves special attention

The current `metadataCache.resolve` handlers call `refreshVisibleHostMetadataPreviews()`, but do not necessarily schedule the same deeper visible Markdown refresh path used after a `changed` event.

Verify whether a `resolve` event that makes previously missing presentation input available actually causes `presentationFacetsForPage()` to run again for the active page.

If not, wire pending-presentation completion directly to the appropriate targeted refresh instead of relying on incidental navigation/editor activity.

## Visible-ready semantics

Do not make the whole-vault “Index ready” state depend forever on every hidden page having optional presentation inputs.

However, the active/current visible Plex should not be considered presentation-complete while its required style facets are pending and have no valid previous value.

At minimum expose this in diagnostics and ensure the automatic P2 retry completes it. If the existing status model has a natural place for a visible-presentation-pending state, use it without conflating it with semantic relationship failure.

## Styling acceptance tests

Add tests for at least:

1. **Known-good style survives pending refresh**
   - page begins with a valid `primaryStyleTag`/`styleTags`;
   - presentation preparation is forced into `pending` because metadata/body input is temporarily unavailable;
   - apply the prepared result;
   - assert previous style remains unchanged;
   - assert status is pending.

2. **Known empty clears styling**
   - later inputs become ready and prove no matching style;
   - assert old style is cleared;
   - this proves “pending retains” did not become “never clear”.

3. **Ready replacement changes styling**
   - later ready input selects another style;
   - assert new style is published.

4. **Pending note type follows the same semantics**
   - a pending note type must not erase a previously valid note type.

5. **Automatic retry after metadata availability**
   - active page begins pending;
   - fire the relevant metadata/current-source event that supplies the missing data;
   - assert styling becomes correct automatically without navigation/editor mode changes.

6. **No stale late publication**
   - pending retry starts for revision N;
   - file/settings change to revision N+1 before completion;
   - N may not publish over N+1.

7. **Eager full-ready case**
   - reproduce a fully indexed Eager graph with a visible styled page;
   - exercise background presentation/hydration paths;
   - assert style never disappears merely because a cache/metadata input is pending.

---

# 9. Cross-cutting publication rules

Implement these rules explicitly and protect them with tests.

## Rule 1 — newer proven source beats old state

A genuine newer file/settings/source revision can add, change or remove visible graph information immediately through the appropriate foreground lane.

## Rule 2 — incomplete replacement does not beat coherent state

A pending/incomplete background representation cannot erase a coherent older representation at the same relevant source/settings revision.

## Rule 3 — prepare first, switch second

For representation handovers:

```text
prepare → validate current fences → atomically switch → retire predecessor
```

Never:

```text
retire predecessor → await preparation → eventually repair UI
```

## Rule 4 — pending is unknown, not empty

Presentation and other optional data should preserve valid previously published values until a current ready result proves a replacement, including a known-empty replacement.

## Rule 5 — rendering frequency is independent of acquisition frequency

K-Plex may acquire/cache hundreds of URL owners quickly without forcing hundreds of visible graph updates.

---

# 10. Suggested code areas to inspect/change

Primary files/functions from the supplied repository:

### Scheduler

- `src/index/ForegroundWorkScheduler.ts`
- `GraphIndex.withForegroundPriority()`
- all `workScheduler.run(...)` and `workScheduler.checkpoint(...)` call sites

### URL inventory/publication

- `GraphIndex.restoreUrlIndex()`
- `GraphIndex.publishUrlOwner()`
- `GraphIndex.startBackgroundUrlIndex()`
- `GraphIndex.refreshUrlOwner()`
- `GraphIndex.retireUrlOwner()`
- `GraphIndex.publishUrlSearch()`
- `GraphIndex.composeUrlRelations()`
- `GraphIndex.relationView()` / relation-view cache invalidation
- `KplexIndexedDbCache.readUrlOwners()`

### Eager foreground/durable handover

- `GraphIndex.usesLocalForeground()`
- `GraphIndex.retryDemandedSemanticScopes()`
- `GraphIndex.acquireSemanticDemand()`
- `GraphIndex.ensureOnDemandCenter()` and related local scope maps
- `GraphIndex.ensureSemanticScope()` / semantic scope publication
- `GraphIndex.semanticPage()`
- `GraphIndex.semanticRelationSource()`
- full/snapshot promotion paths where `this.state` changes

### Presentation/styling

- `src/index/GraphPresentation.ts`
  - `presentationFacetsForPage()`
  - `prepareGraphPresentation()`
  - `applyPreparedPresentation()`
- `GraphIndex.commitPreparedFile()`
- `GraphIndex.refreshPresentationSettings()`
- `GraphIndex.preparePresentationPublication()`
- `GraphIndex.getPresentationStatus()`
- metadata `changed` / `resolve` handlers in `src/main.ts`
- visible targeted refresh path (`scheduleVisibleMetadataRefresh()`, `refreshVisibleMarkdownPath()`, `refreshVisibleHostMetadataPreviews()`)

### Full background priority

Audit:

- `restorePersistedSnapshot()` and snapshot page/evidence iteration;
- `rebuildProgressively()` remaining-vault phase;
- `rebuild()` when used as broad background work;
- `startPersistedSourceInventory()` / broad source inventory;
- snapshot persistence and orphan cleanup;
- constructor-level checkpoint callbacks in `KplexIndexedDbCache` and `ObsidianSourceAcquisition`.

---

# 11. Existing tests worth preserving/extending

Do not replace existing coverage. Extend it.

Relevant current tests include:

- `tests/foreground-work-scheduler.test.mjs`
- `tests/on-demand-indexing.test.mjs`
  - foreground navigation preemption of URL scan;
  - Eager foreground notes before global inventory closes;
  - progressive URL discovery;
  - URL cache restore/current-owner fences;
  - ordinary source publication vs lower-priority URL repair;
- `tests/source-high-degree-publication.test.mjs`
- `tests/presentation-environment.test.mjs`
- snapshot/startup/source-priority tests under `tests/`.

Add narrow regressions for the three user-reported failures instead of relying only on broad integration suites.

---

# 12. Required scheduler test matrix

Extend `foreground-work-scheduler.test.mjs` or add equivalent production-level scheduling tests for this exact hierarchy.

Required ordering:

```text
P0 > P1 > P2 > P3 > P4
```

At minimum verify:

1. P4 pauses while P3 is active.
2. P3 pauses while P2 is active.
3. P3 pauses while P1 is active.
4. P4 remains paused while either P1/P2/P3 remains active.
5. P0 preempts all lower lanes.
6. after foreground release, work resumes in priority order without losing private progress.
7. same-priority work does not wait on itself.
8. a foreground call path cannot self-deadlock through an incorrectly supplied lower-priority checkpoint.
9. `close()` still wakes paused tasks and lifetime fences prevent late publication.

A representative scenario should prove:

```text
P4 starts and makes progress
P3 starts → P4 pauses
P1 starts → P3 pauses
P1 finishes → P3 resumes, P4 stays paused
P3 finishes → P4 resumes
```

---

# 13. Diagnostics requested

Add enough aggregate diagnostics to validate behavior without logging vault content.

Useful measurements:

- scheduler active counts by P0–P4 (already available);
- pause count by lane if straightforward;
- URL owners processed vs number of URL presentation flushes;
- max pending URL touched paths in a batch;
- foreground-to-durable handover starts/completions/failures;
- count of retained fallback scopes awaiting replacement;
- visible presentation pending count;
- presentation retries/completions/superseded retries.

Do not add telemetry or persistent user-content diagnostics.

---

# 14. Acceptance criteria

The implementation is complete only when all of the following are true.

## Scheduler

- [x] P0/P1/P2/P3/P4 have named, documented semantics.
- [x] URL inventory owns P3.
- [x] whole-vault hydration/indexing/maintenance owns P4.
- [x] P4 actually pauses while P3 is active.
- [x] current node/visible graph work preempts both P3 and P4.
- [x] no nested priority self-deadlock is introduced.

## URL stability

- [x] background URL discovery no longer emits a visible update per owner/group at high frequency.
- [x] high-degree URLs update the visible scene in stable batches.
- [x] maximum background presentation window is approximately 5 seconds.
- [x] completion flushes immediately.
- [x] current user-visible URL changes are not delayed behind the batching window.
- [x] final URL graph/evidence/counts/search/cache are identical in correctness to unbatched discovery.

## Disappearing nodes

- [x] local foreground state is not retired before replacement is current and ready.
- [x] the active neighborhood cannot shrink solely because same-revision background hydration advanced.
- [x] failed/pending replacement retains a coherent readable predecessor.
- [x] successful replacement handover is atomic from the reader/UI point of view.
- [x] no navigate-away/back workaround is required.

## Styling

- [x] pending style input does not write `primaryStyleTag: null` / `styleTags: []` over known-good styling.
- [x] pending note type does not erase a known-good note type.
- [x] a later ready-empty result can intentionally clear old presentation.
- [x] a later ready replacement can change it.
- [x] visible pending presentation retries automatically when required metadata/body/source input becomes available.
- [x] no editor-mode/navigation workaround is required.
- [x] late stale retries cannot publish over newer file/settings observations.

## Repository validation

- [x] `npm test` passes.
- [x] `npm run build` passes under the Node version required by `AGENTS.md`.
- [x] run the repository's required verification/lint commands from `AGENTS.md` / `CONTRIBUTING.md`.
- [x] no new Obsidian scanner errors/warnings are introduced in touched code.
- [x] perform native Obsidian validation for the three user scenarios below.

---

# 15. Required native/manual validation scenarios

Use a test vault large enough that background work remains active long enough to observe transitions.

## Scenario A — high-degree URL

Create/use a URL referenced by hundreds of notes.

Expected:

- the URL graph does not flicker for every discovered owner;
- counts/relations grow in visibly stable batches;
- navigation remains responsive;
- final count is exact;
- reopening Obsidian reuses unchanged URL-owner cache without rereading those note bodies.

## Scenario B — Eager local-to-full transition

Start Eager mode with a cold/stale full index and navigate immediately to a node with several known children/relations.

Expected:

- local graph appears quickly;
- URL inventory/background work yields to it;
- while URL/full work continues, already-valid local nodes do not disappear;
- durable handover is visually seamless;
- final graph remains correct without navigating away and back.

## Scenario C — tag styling during and after hydration

Use center/children whose node style is selected from tags / primary tag settings.

Expected:

- correct styling appears when known;
- background hydration/presentation work never clears it merely because an input is temporarily pending;
- if styling input is initially unavailable, it appears automatically once metadata/body input becomes available;
- behavior remains correct after the full index reports ready;
- no switch-to-Markdown/editor/navigation workaround is needed.

---

# 16. Non-goals

Keep this assignment bounded.

Do not:

- redesign ontology semantics;
- change relationship precedence rules;
- replace IndexedDB caching;
- introduce whole-vault polling for presentation completion;
- make hidden optional presentation inputs block the entire index forever;
- solve URL flicker by simply hiding all URL progress until indexing is complete;
- delay user mutations by the 5-second URL batch window;
- remove existing progressive indexing behavior;
- trade the disappearing-node bug for stale mutation authority.

---

# 17. Implementation principle summary

The target architecture can be summarized in two rules.

## Work priority

```text
P0  mutations / explicit actions
 │
P1  current node / requested semantic graph
 │
P2  visible neighborhood / gates
 │
P3  web-link inventory
 │
P4  full graph hydration / full indexing / maintenance
 ▼
```

## Publication authority

```text
CURRENT COHERENT VISIBLE GRAPH
            │
            │ remains authoritative for reads
            ▼
BACKGROUND REPLACEMENT PREPARES
            │
            ├─ pending/fails/superseded → keep current graph
            │
            └─ current + complete
                    ↓
              atomic handover
                    ↓
              retire predecessor
```

For presentation facets:

```text
READY(value) → replace
READY(empty) → clear
PENDING      → retain previous valid value and schedule targeted retry
```

For URL discovery:

```text
acquire/cache continuously
        ↓
coalesce background visible publication
        ↓
~5 s maximum batch window
        + immediate foreground/completion flush
```

These changes should make the system feel both faster and more trustworthy: foreground work always wins, background work progresses without thrashing the UI, and background optimization can no longer make a correct visible graph temporarily worse.


# 2026-10-07 implementation progress

Prior implementation round checkpointed as `1527b6e`. This correction remains uncommitted. C15–C26 are not part of this work.

- [x] Capture the live read-only formatting failure at the exact checkpoint artifact. Native metadata had the drawing tag on all 27 visible Card children; a repeat observation found none had the selected drawing style despite index-ready status.
- [x] Add named scheduler priorities, detached pause counters, caller-specific compact URL-cache iteration checkpoints, and broad source-work lifetime injection. Focused scheduler/acquisition tests and complete production caller verification pass.
- [x] Implement pending facet omission, ready-empty replacement, native tag presentation input, and selected input/file/policy fences. Presentation/compiler focused checks pass.
- [x] Integrate finite visible presentation demand and metadata changed/resolve retries. Real Chromium/IndexedDB GraphIndex coverage: 16/16, including automatic body-input recovery, sparse candidates/UI clones, hidden release, multiple surfaces, finite facade reacquisition and stale/unload rejection.
- [x] Finish production P4 ownership/caller checkpoints and urgent P2 URL repair priorities; audit shared callbacks for self-deadlock. Focused priority/source/host checks pass 64/64. Aggregate review additionally fixed cancelled P1 restore leases; held metadata/pages/body reads no longer block replacement P4 hydration.
- [x] Finish URL batching and local-to-durable handover regressions, including current display projection, identity-only resolver progress and failure/supersession retention. Complete On-demand browser file: 50/50.
- [x] Run full required verification/build and exact-artifact native checks. In the reference vault, deploy only main.js/styles.css, preserve notes/settings/enablement, observe all 27 Cards through background activity without editor gestures, and verify ordinary/URL navigation.
- [x] Record final evidence, limitations, cleanup and manual recommendations in the validation report and Refactor plan.

Current validation: [priority/stability report](validation/indexing-priority-and-stable-publication-2026-10-07.md). Focused passing tests do not establish native acceptance.

Latest review also closes two actual native follow-up failures: current folder structural proof now
certifies its numerical parent/child totals, and a certified full graph outranks stale sparse native
previews during navigation. Progressive completion invalidates partial count views; late source
observations are not prematurely certified. Five controlled real-browser selection/coverage cases
pass. Gate nine's full verification and disposable native scenarios passed before this final
selection change; gate ten and production navigation acceptance must certify the final artifact.
The reference's 27 drawings are correctly formatted without editor-mode changes. A focus-lost
replay is excluded; final foreground validation awaits desktop focus. Notes remain unchanged.

## Resumption after maintainer process termination

- [x] Recover branch/source state and confirm no remaining Obsidian/owned browser/test processes.
- [x] Attribute the remaining dense URL patch failure using a private production-module profile.
- [x] Avoid repeated canonical URL parsing during relation-cache invalidation; preserve non-URL
  scoped selection. Existing dense patch regression passes its unchanged50ms bound; independent
  read-only identity review confirms no authority/evidence/projection change.
- [x] Complete the final exact repository gate/build (gate15; sole heavy lane, Obsidian closed).
- [x] Reopen Obsidian and complete exact-build native recovery/foreground/URL checks.
- [x] Validate27 automatic Card styles, no same-revision scene loss, numeric gates and the named
  production navigation sequence; preserve notes/settings/enablement and clean all test resources.
- [x] Finish the acceptance record and final checklist. No C15–C26 or next-round Git authority.

Failed gate14 (405/406 browsers) and its55.4ms isolated replay remain failures. The narrow fix does
not relax50ms assertions or replace the synchronous compiler/publication boundary. Completed older
native artifacts are useful prior evidence but do not certify this final source.

## Scoped delivery evidence and remaining performance limit

Final Node 22.22.2 verification/build and exact small-vault staging pass;406/406 browser checks,
strict50ms dense URL bound unchanged. Native recovery5/5, held-background foreground6/6, URL
mutation/warm-cache and300-owner stability/oracles pass. Reference final main5ceb3068… passes
27 automatic Card styles/no-loss hydration and URL/Cohort/StoryOS/revisit numerical navigation;
notes/preferences and every test resource are preserved/cleaned. See the linked validation record.

The final reference Card styling appears at0.777seconds; **all numerical gates take43.593seconds**
after ready-host plugin enable in saved Eager mode. Thus the earlier V2 few-second count-loading
objective is still open. Checked criteria here certify the focused handoff's correctness/stability,
not that broader latency objective, whole-process startup, continuous focus/paint or physical mobile
acceptance. These limitations and prioritized follow-up checks are recorded in the validation report.

## Maintainer amendment: active-indexing responsiveness (2026-10-07)

The earlier desktop navigation acceptance covered settled indexing. It does not close the newly reported1–2minute freeze selecting the Obsidian URL from Scratchpad while eager indexing runs. Reopen that timing condition. Add a live indexing throttle preference with a responsiveness-favoring default, preserving immediate foreground navigation/edits and eventual eager/background completion. Address repeated URL read projection work as well as background pacing. Validate the actual rendered URL-node activation during active inventory/indexing, record UI-task/DOM timing separately from actual paint, and retain exact read-only reference-vault cleanup. Current implementation and pending checks are tracked in [the throttle validation report](validation/indexing-throttle-and-url-responsiveness-2026-10-07.md).


Throttle amendment automated delivery: final exact verification/build passes410 browser cases and
small native smoke; active Eager/On-demand URL and scroll correctness pass on the same final build.
Reference notes/settings/enablement/center and every temporary resource are preserved/restored.
The [throttle report](validation/indexing-throttle-and-url-responsiveness-2026-10-07.md) retains
failed/excluded earlier attempts, atomic deployment guidance and exact minimized evidence.
Continuous-foreground pointer/paint responsiveness is still pending, not inferred from passive
synchronous tasks or synthetic DOM completion. The earlier few-second startup count objective
also remains open. No additional implementation or structural refactor is queued automatically.


Maintainer follow-up: production UI responsiveness is accepted during warm cache loading. The
misleading URL0/0 progress message now distinguishes preparation and actual restored-note count
until discovery totals are known. Status-only targeted checks/build/native observation pass;
no scheduling/indexing semantics or defaults changed. Factory On-demand/Responsive and saved
reference Eager/Responsive are confirmed. Quantified native focus/paint remains unmeasured.
