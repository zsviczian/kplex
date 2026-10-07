# K-Plex Indexing Optimization V2 — On-Demand Semantic Indexing Handoff

## 2026-10-06 amendment: URL connections and Eager foreground behavior

This maintainer-requested correction supersedes the historical URL strategy/defaults and the earlier restrictions on a URL store, schema version and parallel URL reads below. The previous implementation discovered only URL search vocabulary; it could display a URL center with no incoming connections and an idle “Preparing local graph” label. V2 ordinary-note acceptance does not cover this URL failure. The preceding implementation is checkpointed at `9ba04cf`.

### Required behavior

- Make **On demand** the default graph strategy, preserving an explicitly saved Eager preference. Eager must prepare visible local graphs and reflect edits promptly during startup, then finish its broader source index in the background. The existing V2 source-backed catalog is retained; full relationship incidence need not be materialized merely to provide global source authority.
- Always discover URLs independently in both graph strategies; remove URL On-demand from the settings UI and migrate the old URL preference. URL discovery must not depend on Obsidian having an external-link index.
- Restore a separate compact per-note URL cache first. Key reusable records by exact physical file revision plus format/parser version. Preserve unchanged owners, replace changed owners, and retire deleted/renamed owners. Cache failure must not erase neutral sources or notes.
- Cold discovery uses bounded concurrent Vault reads and cooperative shared parsing. Publish discovered note-to-URL and origin-to-URL connections incrementally; an open URL center updates as referrers are discovered. Persist partial progress for restart reuse. Avoid compiling unrelated note ontology simply to populate URL relationships.
- While URL discovery is incomplete, show truthful discovery progress and partial counts; never report complete zero counts or idle local preparation as if work were underway. Foreground navigation/edits preempt background discovery.
- Normalize URL scheme/host case and equivalent root slash, preserve path/query/fragment case and raw provenance. `https://Obsidian.md` and `https://obsidian.md/` identify one root. The root is the parent of discovered `/slug1` and `/slug2` URL nodes, with no self-edge.
- URL source/cache facts, canonical graph classification, and local/global coverage remain distinct. URL discovery cannot authorize note-to-note negative evidence or bypass exact relationship-edit preparation.

### Implementation boundaries

- Discover visible body links and URL-bearing frontmatter/inline property values through the existing parser and reference collector. Preserve raw target spelling, physical property/line provenance, configured ontology precedence, hidden relationships, and shared URL lifetimes. Unassigned property URLs receive inferred relationships with a distinct property-web-link source; they do not become explicit editable ontology declarations.
- Store URL-bearing body occurrences and a compact projection of URL-bearing property values in a disposable URL-owner IndexedDB store. Restore these records before graph snapshot hydration. Cached frontmatter remains provisional until current host metadata arrives; native file events and exact physical revisions retire stale owners.
- Compile owner patches privately through the existing canonical source patch preparer. Publish incidence, evidence, aliases, search facets, gate-proof invalidation, and notifications synchronously at the existing per-file publication boundary. Current owner facts replace stale cached positive edges, including a newly proven absence, for read presentation only.
- URL normalization belongs to the Obsidian adapter. Older neutral sources remain unchanged; their URL targets normalize during replay. URL-dependent derived projections must carry the new identity capability, while compatible older non-URL projections retain their existing readiness. Do not restamp source heads or block ordinary notes on a URL derivative upgrade.
- A scan has bounded native read count and byte admission shared with file events. Parser/compiler work remains cooperative on the existing scheduler. Discovery completion requires exact current coverage of every Markdown owner, including notes with no URLs; an unfinished or failed scan cannot certify a complete zero count.

### Action plan and acceptance

- [x] Commit the existing V2 checkpoint.
- [x] Reproduce reference-vault URL failure and inspect Excalibrain URLParser.
- [x] Implement independent incremental URL facts, separate cache, and progressive current URL centers — focused current-owner, mutation, race, warm-reuse and byte-bound checks pass; aggregate/native acceptance pending.
- [x] Implement URL identity equivalence/root hierarchy and focused compatibility tests — adapter/core/replay/projection migration tests pass, preserving lexical provenance and image-only behavior.
- [x] Implement Eager foreground parity, On demand defaults, and clear settings/progress copy — focused Eager startup edits and settings/localization checks pass.
- [ ] Run required verification, disposable cold/warm/edit/delete/rename cases, and exact-build reference URL navigation/restart.
- [ ] Record measurements, limitations, and cleanup; keep reference notes/preferences unchanged.

Initial estimate: 90–150 minutes. Native baseline at exact `65bceafc…` reproduced missing mixed-case root, an empty lowercase root, no active URL scan, and idle “Preparing local graph” for 15 seconds per center with saved On demand/background. Notes and configuration hashes were unchanged. This is functional failure evidence, not a latency benchmark.


Current validation: exact Node22 full verification/build/native smoke passes, including 368 browser cases. Disposable native URL mutations, numerical gates and 15-owner warm URL cache with zero URL body reads pass. Desktop focus checks are currently blocked by the locked session; the maintainer has been asked to unlock. Eager foreground, SI5 recovery and production URL navigation/reload measurements remain pending. The reference vault has not received the new artifact. Estimated remaining work after unlock: 15–25 minutes, subject to native findings. See [validation](validation/url-indexing-and-foreground-2026-10-06.md); no five-second production URL claim is made.

## 1. Assignment

Implement a **bounded V2 indexing mode** that removes the current global warm-start source-certification workload from the normal startup path and allows K-Plex to build semantic relationships **on demand**.

This handoff is intentionally scoped for one equipped local agent with Obsidian CLI / Node tooling to complete in **no more than four hours**. Do not redesign the source repository, merge the existing two source-certification passes, add a new graph/database schema, or pursue parser concurrency work in this assignment.

The implementation should build on the foreground-first work already merged in PR #75 and the current repository architecture.

### Primary goals

1. Add a new top-level **Indexing config** settings page.
2. Add an **On demand** indexing mode alongside the current eager behavior.
3. In On-demand mode:
   - do not start the vault-wide source inventory/certification job at plugin startup;
   - use Obsidian `MetadataCache` and the existing structural graph as the immediate base;
   - process only the Markdown owners needed for the current navigation / visible Plex;
   - persist those per-file parses/source facts so revisiting the same area is faster;
   - preserve existing exact relationship-edit behavior.
4. Separate external URL discovery from semantic relationship indexing:
   - URLs may be discovered only on demand, or
   - the user may allow a background URL/body scan that **does not build the full semantic graph and does not start global source certification**.
5. Add a **Purge index cache** action showing the approximate current K-Plex IndexedDB cache size.

### Explicit product decision

The V2 architecture treats a complete global source certification as **optional maintenance**, not a prerequisite for ordinary startup/navigation in On-demand mode.

The measured ~62-second warm-start source-authority pass is intentionally **not run** in On-demand mode unless a future feature explicitly asks for global authority.

---

## 1.1 Maintainer requirement: early local graph and accurate counts

Added 2026-10-06 after checkpoint `e97696f`. The production vault currently takes many minutes, sometimes 30 minutes, to reach full readiness. That delay is unacceptable for navigation. In On-demand mode, the target is a useful local Plex, including numerical gate counts, within **a few seconds of Obsidian layout/metadata readiness**. Use **5 seconds as the initial measured target** for an ordinary production-vault center and subsequent navigation; record actual measurements and any miss rather than declaring the target achieved from a small fixture or eventual full readiness.

A complete broader semantic index is optional. Local readiness must not depend on `hasSemanticDependencies()`, global source certification, global vocabulary/evidence hydration, unrelated owner reconciliation, or completion of an optional URL scan.

### Count meaning and coverage

- Derive gate counts from the same canonical relationship classifier, visibility policy, and published local graph used to draw the Plex. Count distinct related nodes before viewport, column, fold, or item-limit truncation. Preserve existing shown/total presentation where appropriate.
- Obsidian's resolved/unresolved links, backlinks, frontmatter ontology and direct folder/tag membership supply early host-known relationships. Selected current body/source facts enrich those relationships through the existing canonical patch owner. Do not introduce a second classifier or use the displayed node array as the total.
- Publish the ready center and available numerical gate counts as soon as their local inputs close. Independent neighbor enrichment, optional siblings, URL titles, and unrelated source validation must not withhold already prepared counts.
- Count coverage and write authority are separate. Local graph readiness never grants global negative-evidence authority; edits continue through exact pair preparation. A current complete warm graph can provide complete semantic totals without immediate global source certification.
- A cold or stale graph cannot know body-only incoming declarations from never-indexed unrelated notes using Obsidian metadata alone. Report the coverage honestly: numerical totals are exact for the current host-supported/indexed local graph, while missing body-only coverage is indicated separately. Do not silently label these totals globally certified, invent zeros, or replace available numbers with `…` merely because global certification is disabled.
- Dense hubs exceeding the bounded owner selection remain explicitly partial; the 64-owner cap must not truncate the host graph's available numerical totals. Missing metadata, invalid revisions or genuinely unavailable inputs remain distinct from ordinary optional background work.
- Folder top/bottom counts use complete direct native membership, including members outside the rendered cover. All four gates use the same numerical presentation rules; unsupported semantic side incidence must not be fabricated.

### Execution lanes and invalidation

1. Physical search and a host preview publish first.
2. Reuse a compatible fresh full graph when cheaply available; otherwise publish the structural/host baseline without reading every Markdown body.
3. Canonicalize center-first bounded owners at foreground priority, reusing revision-valid durable bodies/source facts. Replace the preview with the current local graph and count coverage; do not route this through globally gated `ensureSemanticScope()`.
4. Persist exact acquired owners, never the partial graph as a complete snapshot.
5. Optionally run URL discovery as a separate early **background** activity once the local graph is usable. Populate URL vocabulary from valid body-cache hits first, then read misses cooperatively. It must not compile unrelated semantic relationships or delay local readiness. URL owner incidence is added by its on-demand semantic patch; URL titles are enrichment.
6. Metadata/file changes retire the affected local coverage and recanonicalize visible demand. Changing ontology policy invalidates demanded owner policy tokens. Navigation cancellation, unload, purge and stale physical revisions prevent late publication.

### Required evidence

Capture layout/metadata-ready → preview → local canonical publication → numerical gate counts independently from fully certified readiness. Test while global source inventory is disabled or held unfinished. Compare counts against canonical graph results for a controlled complete fixture, including incoming ontology, reciprocal overrides, hidden/inferred relations, attachments, URLs, direct folder members and neighbors. Verify bounded candidate selection does not turn available host totals into rendered-item totals. Include a warm revisit and restart proving durable reuse, plus one strategically selected large/reference-vault run. Reference-vault notes remain strictly untouched; only previously authorized plugin deployment/reload is permitted.

### V2 task list and estimated allocation

- [x] Commit the preceding warm-start fixes and validation records (`e97696f`).
- [x] Add the early local graph/count requirement and coverage design here.
- [x] Settings controls, migration and cache maintenance — focused settings50/50 and storage25/25 pass; final exact-build/native acceptance passed.
- [x] Mode-aware startup/inventory policy — implementation complete; focused eager regressions and final full verification pass.
- [x] Foreground owner canonicalization, local counts, revision fences and partial persistence guard —18 focused real-IndexedDB cases and controlled native count/editing/revisit checks pass, including released-view count cancellation.
- [x] Independent URL scan — focused no-incidence/foreground-preemption and exact native URL acceptance pass.
- [x] Final desktop production regression acceptance — corrected exact build passes full341-browser verification, actual saved-Eager vault reload/cached navigation and current local On-demand named navigation. Distinct timing/authority limits remain explicit. See the [validation record](validation/on-demand-indexing-v2-2026-10-06.md).

Initial implementation/validation estimate: **2½–4 hours**. The four-hour scope cap remains. Progress reports must name completed results, next work and revised ETA; unmet requirements remain explicit.

**Earlier scoped desktop evidence; production acceptance reopened:** controlled small-vault local count closure3.624s, warm restart2.614s, and accepted ordinary-center reference-vault closure3.695s with all24 rendered gate labels numerical and global inventory disabled. This is one accepted reference timing sample after host metadata/layout readiness, not full application cold-launch, actual paint, physical-mobile acceptance or a universal five-second guarantee. Notes/settings/enablement were restored exactly; failed harness/cleanup and excluded focus-lost attempts are retained in the validation record. This preceding V2 checkpoint was committed as `9ba04cf`; the URL correction above remains under validation.

---

## 2. Scope boundary: what this patch must NOT do

Keep the implementation inside the four-hour budget.

Do **not**:

- combine or optimize `host-metadata-comparison` + `source-reconciliation`;
- redesign `SourceRepository`, source leases, dependency projections, or source schemas;
- change IndexedDB schema/version;
- add a new durable graph coverage format;
- add a new URL object store;
- make partial on-demand graphs masquerade as complete graph snapshots;
- implement a global on-demand contributor catalog;
- remove the current eager/full-index mode;
- change relationship semantics, ontology grammar, tag/folder semantics, inference semantics, or edit persistence;
- increase parser/read concurrency;
- touch C15-C26 or unrelated UI work;
- make live switching between eager and on-demand modes fully transactional.

**Settings changes to indexing strategy may require plugin/Obsidian restart for this V2 patch.** This is a deliberate scope reducer.

The maintainer has already observed that combining the two global source passes did not visibly improve performance. Do not spend this assignment on that direction.

---

## 3. Current architecture to reuse

The current code already contains most of the mechanisms needed.

### Startup and lifecycle

`src/main.ts`

Important current flow:

```text
workspace.onLayoutReady()
  -> GraphIndex.primePhysicalSearchCatalog()
  -> GraphIndex.publishHostMetadataPreview(center)
  -> GraphIndex.restorePersistedSnapshot(seedPaths)
  -> registerReactiveIndexListeners()
  -> ensureInitialIndex()
```

Today `ensureInitialIndex()` eventually allows full restore/reconciliation/build behavior even when K-Plex is not visible, except for the existing large-iOS cold-build exception.

V2 should branch this coordinator by indexing mode.

### Immediate host-native preview

`src/index/HostMetadataPreview.ts`

Already provides:

- one-time reverse lookup over `metadataCache.resolvedLinks`;
- bounded incoming/outgoing candidate discovery;
- frontmatter/tag/host-link preview;
- no Markdown body reads;
- no durable source authority;
- explicit incomplete semantics.

This is the correct starting point for On-demand mode.

### Structural baseline

`src/index/GraphBuilder.ts`

Reuse:

```ts
GraphBuilder.buildStructuralBaseline()
```

It builds:

- physical vault nodes;
- folders/tags;
- Obsidian host-resolved links;
- no Markdown-body semantic indexing.

This should become the cold/no-snapshot base for On-demand mode.

### Incremental canonical file patching

`src/index/GraphIndex.ts`

Reuse:

```ts
GraphIndex.patchMarkdownPaths(...)
```

which delegates to:

```ts
GraphBuilder.patchMarkdownFiles(...)
```

This path already:

- parses/acquires exact Markdown owners;
- updates graph state incrementally;
- publishes only after private preparation;
- persists parsed bodies/source facts;
- updates search/affected caches;
- avoids a vault-wide graph rebuild.

This should be the **semantic engine for On-demand mode**.

Do not try to retrofit `ensureSemanticScope()` for V2. Its current requested-neighborhood implementation depends on globally completed source-local dependency authority (`sourceAcquisition.hasSemanticDependencies()`), which is precisely the expensive authority V2 is avoiding.

### Exact relationship edits

`src/adapters/obsidian/sourceAcquisition.ts`

Keep using the existing exact-pair lane:

```ts
prepareRequestedPair(...)
```

It is explicitly designed to work before global incidence inventory and must remain the write-authority path for relationship edits.

### Parsed-body cache

`src/index/GraphIndex.ts`

Reuse/generalize:

```ts
prewarmBodyCache(...)
```

and existing `IndexedDbCache.getBodies()/putBodies()`.

`ParsedBodyMetadata` already contains external URLs. This makes the current body cache the simplest durable backing for separate URL discovery without a database migration.

### Global source inventory to suppress in On-demand mode

`src/adapters/obsidian/sourceAcquisition.ts`

Current global owner:

```ts
enableInventory()
```

It drives the expensive restart source pass.

There are several callers in `GraphIndex.ts`, including snapshot restore and full-build completion. Replace unconditional calls through one mode-aware helper rather than adding scattered checks.

---

## 4. New settings

Add a new top-level settings page before **Compatibility**:

## Indexing config

Use plugin-owned localization keys in `src/lang/en.ts`. Non-English catalogs may rely on English fallback; do not add machine translations.

### 4.1 Indexing mode

Persist:

```ts
export type IndexingMode = "eager" | "on-demand";
```

Add to `KplexSettings`:

```ts
indexingMode: IndexingMode;
```

For this bounded rollout:

```ts
indexingMode: "eager"
```

remains the default.

This preserves current behavior for existing/new users until On-demand mode is validated on large desktop/mobile vaults. The default can be changed later as a product decision without redesigning the implementation.

Suggested copy:

**Indexing mode**

> Choose when K-Plex builds ontology and relationship data. Eager keeps the full semantic index prepared in the background. On demand uses Obsidian metadata immediately and parses only notes needed for the Plex you open.

Dropdown:

- `Eager`
- `On demand`

Add a short note in the description:

> Restart Obsidian after changing this setting.

Do not include `indexingMode` in the semantic graph settings signature. It changes acquisition/lifecycle policy, not graph meaning.

### 4.2 Web link indexing

Persist:

```ts
export type UrlIndexingMode = "on-demand" | "background";
```

Add:

```ts
urlIndexingMode: UrlIndexingMode;
```

Default:

```ts
urlIndexingMode: "on-demand"
```

Suggested copy:

**Web link indexing**

> In On-demand mode, discover web links only when a note is needed, or scan note bodies in the background for a complete URL search vocabulary. The background scan fills the parsed-body cache but does not build the full ontology graph.

Options:

- `On demand`
- `Background scan`

In `eager` mode this setting may be ignored because the full index already processes URLs.

The conservative default is intentional: On-demand mode should not replace one hidden whole-vault job with a different hidden whole-vault job unless the user opts in.

### 4.3 Index cache

Add a group:

**Index cache**

Action:

**Purge index cache**

Description:

> Approximate K-Plex IndexedDB cache size: {size}. Clears cached graph snapshots, parsed note bodies, source facts, URL data, and dependency data. Restart Obsidian after purging.

Use a confirmation modal before deletion.

On success show a localized notice equivalent to:

> K-Plex index cache cleared. Restart Obsidian before continuing to use K-Plex.

The purge action is a maintenance/testing action. It is acceptable for this V2 implementation to close persistent index owners for the remainder of the plugin lifetime and require restart.

---

## 5. Target startup behavior

### 5.1 Eager mode

Preserve the current behavior.

```text
layout ready
 -> physical Find
 -> host preview
 -> restore graph snapshot
 -> current initial-index workflow
 -> global source inventory/certification
 -> full semantic readiness
```

Do not regress current eager behavior.

### 5.2 On-demand mode, fresh full snapshot available

```text
layout ready
 -> physical Find
 -> host preview
 -> restore a finite first-hop cover from the fresh full graph snapshot
 -> publish the body-free host baseline, retaining current cached incidence
 -> graph usable
 -> DO NOT enable global source inventory
 -> optional URL scan only if configured
 -> canonicalize changed/visible owners only when demanded
```

A fresh complete graph snapshot may remain useful without immediately certifying every durable source.

**Implemented bounded restore decision:** the existing full restore path waits for source certification and hydrates all pages/evidence, which conflicts with the early local-readiness requirement. V2 reads the compatible active catalog and only a targeted first-hop snapshot cover. It does not hydrate global source/evidence stores, declare `fullSnapshotHydrated`, or acquire write authority. Current cached pair incidence enriches the host cover and survives unchanged selected-owner recompilation, including known body-only incoming relationships outside the 64-owner limit. Host metadata/resolve observations, physical changes, topology resets and ontology changes retire cached proof. Semantic-only endpoints beyond the finite retained cover still require discovery on demand; this is read acceleration, not a complete live graph.

**Count input bounds:** complete local host covers borrow one metadata owner at a time through the existing collectors/compiler. Eager preview limits remain unchanged. The local path supports up to 2 MiB of estimated metadata per owner with a 2,048-value traversal guard, 8,192 normalized records, and 32 MiB of estimated normalized-record payload. Missing Markdown cache entries or genuine decode/seed/collector/guard failures expose unavailable count coverage; they never silently omit metadata and label the remaining total accurate. Attachments do not require Markdown metadata. Native folder totals retain their independent chunked membership path.

### 5.3 On-demand mode, no usable/fresh full snapshot

Do **not** call `rebuildProgressively()` across all Markdown files.

Instead:

```text
layout ready
 -> physical Find
 -> host preview
 -> buildStructuralBaseline()
 -> publish structural baseline
 -> mark On-demand baseline ready
 -> canonicalize current center + bounded candidate owners
 -> optional URL background scan
```

The structural baseline is a complete physical/host baseline but an intentionally incomplete semantic graph.

Do not set `fullSnapshotHydrated = true` merely to satisfy existing readiness logic.

Introduce an explicit session flag/state such as:

```ts
private onDemandBaselineReady = false;
private onDemandPartialState = false;
```

or an equivalent narrow representation.

`main.ts` should treat this state as sufficient for **initial startup completion in On-demand mode**, while `GraphIndex.isFullSnapshotHydrated()` retains its existing meaning.

### 5.4 Stale prior snapshot in On-demand mode

For this V2 patch, prefer correctness and simplicity:

- if the restored full snapshot is fresh, use it;
- if it is stale, replace it with a fresh structural baseline rather than performing a whole warm semantic reconciliation.

This intentionally discards stale semantic relationships from the live graph and repopulates semantics as the user navigates.

Do not persist this partial semantic baseline as a normal complete graph snapshot.

---

## 6. Mode-aware source inventory

Centralize this decision in `GraphIndex`.

Add a helper similar to:

```ts
private shouldRunGlobalSourceInventory(): boolean {
  return this.plugin.settings.indexingMode === "eager";
}

private enableGlobalSourceInventoryIfConfigured(): void {
  if (this.shouldRunGlobalSourceInventory()) {
    this.sourceAcquisition.enableInventory();
  }
}
```

Replace GraphIndex's unconditional startup/build calls to:

```ts
this.sourceAcquisition.enableInventory();
```

with the helper where the call represents background/global completion.

Do **not** alter explicit targeted source acquisition used by:

- `patchMarkdownPaths`;
- relationship mutation;
- exact pair preparation;
- requested current-file repair.

`sourceAcquisition.start()` remains valid in On-demand mode. `enableInventory()` is the global/background distinction.

### Acceptance invariant

With:

```text
indexingMode = on-demand
urlIndexingMode = on-demand
```

opening Obsidian and never opening/navigating K-Plex must not initiate the vault-wide `source-inventory`, `host-metadata-comparison`, or `source-reconciliation` pass.

---

## 7. On-demand semantic file selection

Add a bounded candidate API to `HostMetadataPreview`.

Suggested method:

```ts
async candidateMarkdownPaths(
  centerPath: string,
  limit = 64,
): Promise<readonly string[]>
```

Reuse the existing backlink structures; do not scan the vault again per navigation.

Order:

1. center path;
2. outgoing resolved Markdown targets;
3. incoming resolved Markdown sources.

Requirements:

- deduplicate;
- include only current Markdown `TFile`s;
- center must always win;
- hard cap at 64 in V2;
- do not recursively expand neighbors-of-neighbors;
- do not perform body reads;
- preserve current disposal/revision fences.

The cap intentionally means dense hubs can remain incomplete. Existing partial/unknown count/status behavior should communicate this rather than forcing global closure.

---

## 8. On-demand semantic canonicalization

Add a GraphIndex owner such as:

```ts
private onDemandTasks = new Map<string, Promise<void>>();
private onDemandIndexed = new Map<
  string,
  { mtime: number; policyRevision: number }
>();
```

Add:

```ts
private ensureOnDemandCenter(centerPath: string): Promise<void>
```

High-level algorithm:

```text
if not on-demand:
  return

coalesce same center task

publishHostMetadataPreview(center) remains first/immediate

ensure structural/on-demand baseline exists

candidatePaths = hostPreview.candidateMarkdownPaths(center, 64)

for each candidate:
  skip when current file mtime + semantic policy revision already indexed this session

patch remaining paths through existing incremental patch owner
  - use durable body cache where valid
  - acquire/persist exact source facts
  - publish incrementally
  - no global source inventory

record path mtime + policy revision
emit canonical graph
```

### Important change to `patchMarkdownPaths`

Current edit-driven `patchMarkdownPaths()` uses fresh acquisition semantics suitable for a changed file.

Do not weaken that behavior globally.

Either add an options object:

```ts
async patchMarkdownPaths(
  paths: readonly string[],
  options: Readonly<{
    useDurableCache?: boolean;
    persistCompleteSnapshot?: boolean;
  }> = {},
): Promise<PatchMarkdownPathsResult>
```

or add a dedicated narrow wrapper for on-demand use.

Defaults must preserve existing edit behavior.

On-demand calls should use:

```ts
useDurableCache: true
```

so a previously visited/persisted file can be canonicalized without another vault read/parse when its `mtime` is unchanged.

### Persistence contract

Every on-demand file should retain the existing durable benefits:

- parsed body in `BODY_STORE`;
- source facts/source head;
- source-local derivative data produced by the ordinary acquisition path where applicable.

That is the persistence that makes the next visit faster.

Do **not** invent a second per-file cache.

---

## 9. Do not persist an incomplete graph as a complete snapshot

This is a critical correctness rule.

When On-demand mode had to build a structural baseline because there was no fresh complete snapshot:

```ts
onDemandPartialState === true
```

must suppress ordinary complete graph snapshot persistence.

`patchMarkdownPaths()` currently schedules snapshot persistence after patches. Guard this in the on-demand partial state.

Example:

```ts
if (!this.onDemandPartialState) {
  this.scheduleSnapshotPersist(SNAPSHOT_EDIT_IDLE_MS);
}
```

Per-file body/source persistence must still occur.

Why:

- existing snapshot metadata does not encode semantic coverage;
- a partial graph written as an active complete snapshot would be trusted as complete on the next restart;
- adding coverage metadata/schema is explicitly out of scope for this four-hour assignment.

The implemented finite first-hop restore in section5.2 also remains partial. It reads acceleration from a complete snapshot without hydrating that complete graph; consequently it does **not** resume complete snapshot persistence. Durable per-owner body/source persistence continues in both restore and cold-baseline paths. A future genuinely complete live restore could permit normal incremental snapshot persistence, but V2 does not perform that restore.

---

## 10. Integrate with visible semantic demand

Current React integration already calls:

```ts
index.acquireSemanticDemand(activePath)
```

from `src/ui/PlexGraph.tsx`.

Do not add another UI lifecycle.

Branch inside `GraphIndex.acquireSemanticDemand()`:

```text
always:
  publish host metadata preview immediately

eager:
  existing ensureSemanticScope()

on-demand:
  ensureOnDemandCenter(path)
```

Do not call `ensureSemanticScope()` from On-demand mode, because its current source-local contributor discovery requires global semantic dependency authority.

Also update the related status/refresh paths:

### `hasPendingSemanticPreparation()`

In On-demand mode, report only actual:

- structural baseline task;
- active on-demand center patch task;
- optionally active URL scan if the status UX intentionally includes it.

Do not return permanently pending merely because `sourceAcquisition.hasSemanticDependencies()` is false.

### `refreshSemanticSettings()`

In On-demand mode:

- invalidate the session `onDemandIndexed` policy tokens;
- recanonicalize currently demanded center(s);
- do not start a whole-vault semantic rebuild or global source inventory.

### File changes

Existing `refreshVisibleMarkdownPath()` and dirty-path patching remain authoritative for changed visible files.

An on-demand cached revision token must include `mtime` and semantic policy revision so revisiting a changed file cannot incorrectly skip canonicalization.

---

## 11. Separate URL/body indexing

Do not build a new URL database.

Generalize the current `prewarmBodyCache()` into a method such as:

```ts
primeBodyAndUrlIndex(...)
```

or keep the existing method and add a URL-publication callback.

The existing flow already:

- batches `getBodies()` lookups;
- reads only cache misses;
- parses with `MetadataParser`;
- writes `ParsedBodyMetadata` to IndexedDB;
- cooperatively yields through `ForegroundWorkScheduler`.

Extend it so every current parsed-body hit/fresh parse can contribute:

```ts
body.urls
```

to a lightweight URL vocabulary in `GraphIndex`.

### URL publication rules

For each discovered URL:

- create/reuse the URL node;
- merge aliases;
- update the search index;
- do **not** infer or publish a file -> URL relationship merely from the global URL scan.

The relationship belongs to the file's semantic patch and appears when that owner is canonicalized on demand.

This keeps URL vocabulary independent from semantic incidence authority.

Existing helper logic around URL insertion/search should be reused; do not duplicate URL normalization/alias rules.

### Background URL mode

When:

```text
indexingMode = on-demand
urlIndexingMode = background
```

start this scan only after:

1. physical search is ready;
2. host preview / structural or restored graph is already usable.

Run it at P3/background priority and retain existing cooperative checkpoints.

It must **not** call:

```ts
sourceAcquisition.enableInventory()
```

and must not call a full graph rebuild.

Expected behavior:

```text
K-Plex usable
  -> background body-cache / URL scan progresses
  -> URL search vocabulary grows
  -> foreground navigation pre-empts scan
  -> scan resumes
```

### URL On-demand mode

When:

```text
urlIndexingMode = on-demand
```

do no whole-vault body scan.

URLs become available as their owning Markdown notes are canonicalized through `ensureOnDemandCenter()`.

---

## 12. Initial On-demand structural baseline

Add a narrow GraphIndex method, for example:

```ts
async initializeOnDemandBaseline(
  seedPaths: readonly string[],
): Promise<boolean>
```

Use the beginning of `rebuildProgressively()` as the model, but stop after structural publication + requested owner patching.

Pseudo-flow:

```text
if current state is a fresh complete restored snapshot:
  return true

cancel pending complete-snapshot persistence

builder = new GraphBuilder(...)

next = await builder.buildStructuralBaseline()

preparePresentationPublication(next, ...)
publish next atomically

onDemandBaselineReady = true
onDemandPartialState = true

choose first valid seed
await ensureOnDemandCenter(seed)

return true
```

Do not copy the remaining-vault loop from `rebuildProgressively()`.

Do not set:

```ts
fullSnapshotHydrated = true
```

for this structural/partial state.

It is valid for `main.ts` to set its own `initialIndexComplete = true` once the On-demand baseline is ready, because in this mode "startup complete" means "ready to service demand", not "every Markdown semantic owner processed".

---

## 13. `main.ts` coordinator change

In `ensureInitialIndex()` introduce an early mode branch after pending snapshot hydration has settled and before warm reconciliation/full progressive rebuild.

Conceptually:

```ts
if (this.settings.indexingMode === "on-demand") {
  const restoredFreshComplete =
    !this.indexDirty &&
    this.index.size > 0 &&
    this.index.isFullSnapshotHydrated();

  if (!restoredFreshComplete) {
    await this.index.initializeOnDemandBaseline(this.startupGraphSeedPaths());
  }

  this.initialIndexComplete = true;
  this.notifyIndexStatus();

  if (this.settings.urlIndexingMode === "background") {
    void this.index.startBackgroundUrlIndex();
  }

  return;
}
```

Exact ordering must preserve existing pending-hydration and unload fences.

Do not wait for the background URL scan before marking startup ready.

### Closed K-Plex behavior

With On-demand + URL On-demand, plugin startup should perform only:

- physical catalog;
- required workspace/sidecar setup;
- persisted snapshot check;
- cheap structural baseline only if needed.

No body parsing, full semantic build, or global source certification should continue merely because the plugin is enabled.

If building the structural baseline proves materially expensive on very large vaults, it may also be deferred until first K-Plex demand as a follow-up; do not expand this assignment unless measurement shows it is necessary.

---

## 14. Cache size estimate

There is no standard browser API for per-IndexedDB-database disk usage. Do not present `navigator.storage.estimate().usage` as the K-Plex cache size because that is origin-wide and may include unrelated Obsidian/plugin storage.

Add a best-effort logical payload estimate to `KplexIndexedDbCache`, for example:

```ts
async estimateStoredBytes(): Promise<number | null>
```

Implementation:

1. open the K-Plex DB;
2. enumerate `db.objectStoreNames`;
3. scan each store with a readonly cursor;
4. add a conservative structured-value estimate:
   - strings: UTF-16 length * 2;
   - number: 8;
   - boolean: 4;
   - arrays/objects: keys + contained values + small fixed overhead;
5. scan one store at a time;
6. never expose keys, paths, or content outside the cache owner;
7. return `null` on unavailable/failed storage.

The cursor naturally returns control between records. Do not use `getAll()` for large source stores.

Label the UI value **Approx.** because IndexedDB internal/index overhead is not included.

Format as B / KB / MB / GB.

Only calculate this when the Indexing config page is displayed. It must not become startup work.

---

## 15. Purge index cache

Add to `KplexIndexedDbCache` a maintenance owner such as:

```ts
async purgeAndClose(): Promise<boolean>
```

Safe bounded V2 behavior:

1. cancel/stop queued body writes;
2. close the K-Plex IndexedDB connection and source repository through the existing cache `close()` path;
3. call:

```ts
indexedDB.deleteDatabase(safeDbName(this.vaultName))
```

4. resolve only on successful deletion;
5. handle `blocked`/error as failure;
6. do not reopen the cache in the same plugin lifetime.

Add a GraphIndex wrapper:

```ts
async purgePersistentIndexCache(): Promise<boolean>
```

Before deletion:

- cancel graph rebuild;
- cancel URL/body prewarm;
- cancel pending snapshot persistence;
- prevent new background source inventory.

After successful deletion:

- mark a session-only `persistentCachePurged` flag;
- return success;
- settings UI updates displayed size to `0 B`;
- show restart-required notice.

Do not attempt to reconstruct `NeutralSourceRepository`/`GraphIndex` live in this assignment.

Existing in-memory graph may remain visible, but canonical indexing/persistence after purge is not guaranteed until restart. The confirmation copy should make this explicit.

### Confirmation

Use a small localized modal:

**Purge K-Plex index cache?**

> This deletes K-Plex's persistent index for this vault. Your notes are not changed. K-Plex will rebuild data as needed after you restart Obsidian.

Buttons:

- `Cancel`
- `Purge cache`

No vault content is deleted.

---

## 16. Index status semantics

Avoid introducing a new "indexing forever" state for On-demand mode.

Recommended semantics:

### On-demand startup ready

Once:

- physical catalog is available; and
- fresh full snapshot **or** structural baseline is published;

the normal K-Plex readiness state should be ready.

### Per-navigation work

While a center is being canonicalized:

- existing incomplete/partial graph affordances remain valid;
- host preview is immediately visible;
- canonical patch replaces it as available.

Do not make the global source-authority state part of On-demand readiness.

### Background URL scan

If shown in status, present it as optional background enrichment, not "K-Plex not ready".

Do not block navigation or relationship actions on it.

---

## 17. Correctness invariants

The implementation is acceptable only if these remain true.

1. **No false global authority.** On-demand mode never sets source-local global readiness merely because selected owners were acquired.
2. **No partial snapshot promoted as complete.**
3. **Host preview remains provisional.** It cannot grant write/negative-evidence authority.
4. **Relationship edits keep exact pair preparation.**
5. **File-event fences remain current.** A body cached under an old mtime cannot be reused as current.
6. **Settings semantics remain canonical.** Changing ontology policy forces demanded owners to be recanonicalized.
7. **Dense hubs may be incomplete.** Do not remove the 64-owner bound to manufacture completeness.
8. **URL vocabulary is not URL incidence.** Background URL scanning may create/search URL nodes, but file↔URL relationships require owner canonicalization.
9. **Eager mode behavior remains unchanged.**
10. **Purge never touches vault notes.**
11. **No private Obsidian API is introduced.**
12. **No new IndexedDB schema/store is introduced.**

---

## 18. Expected files to change

Keep the patch concentrated.

### Required

- `src/settings.ts`
  - new setting types/keys/defaults;
  - Indexing config top-level page;
  - cache size state;
  - purge confirmation/action.

- `src/lang/en.ts`
  - all new user-facing copy.

- `src/main.ts`
  - mode-aware `ensureInitialIndex()` branch;
  - start optional URL scan without awaiting it.

- `src/index/GraphIndex.ts`
  - global-inventory mode helper;
  - on-demand baseline;
  - on-demand center canonicalization;
  - demand-mode branch;
  - background URL/body scan integration;
  - partial-state persistence guard;
  - cache estimate/purge wrappers.

- `src/index/GraphBuilder.ts`
  - only if needed to let on-demand patching use valid durable body-cache input without changing edit semantics.

- `src/index/HostMetadataPreview.ts`
  - bounded candidate Markdown path API.

- `src/index/IndexedDbCache.ts`
  - approximate size estimate;
  - purge-and-close owner.

### Likely tests

Prefer one new focused file plus small extensions:

- `tests/on-demand-indexing.test.mjs`
- `tests/foreground-startup-indexeddb.test.mjs`
- `tests/settings*.test.mjs` / localization tests as required by existing suite.

Avoid broad test refactors.

---

## 19. Implementation sequence — hard four-hour budget

The agent should work in this order.

### 0:00-0:20 — baseline and exact call-site review

- read `AGENTS.md`, `CONTRIBUTING.md`, this file;
- run the fastest relevant existing tests;
- locate every `sourceAcquisition.enableInventory()` in `GraphIndex.ts`;
- confirm current `patchMarkdownPaths`, `acquireSemanticDemand`, `prewarmBodyCache`, and settings action APIs.

Do not begin architectural exploration beyond the code paths listed here.

### 0:20-0:55 — settings + mode-aware global inventory

Implement:

- `indexingMode`;
- `urlIndexingMode`;
- Indexing config settings page;
- centralized global inventory helper;
- replace unconditional background inventory enables.

Add a focused regression proving On-demand mode does not enable global inventory.

### 0:55-2:00 — On-demand structural baseline + bounded owner patching

Implement:

- HostMetadataPreview candidate paths;
- `initializeOnDemandBaseline()`;
- `ensureOnDemandCenter()`;
- branch `acquireSemanticDemand()`;
- durable-cache option for demand patching if required;
- partial-snapshot persistence guard;
- `main.ts` On-demand initial-index branch.

At the two-hour mark the core feature should already work without the separate URL background option.

### 2:00-2:45 — URL/body background facet

Generalize/reuse `prewarmBodyCache()`:

- consume cached/fresh `body.urls`;
- publish URL vocabulary/search incrementally;
- run at P3;
- no relationship incidence;
- no source inventory;
- no startup readiness dependency.

If this work threatens the four-hour cap, keep URL **On demand** correct and implement only the smallest background scan that reuses the existing body prewarm loop. Do not add persistence schema.

### 2:45-3:20 — cache size + purge

Implement:

- approximate size cursor;
- settings display;
- purge confirmation;
- purge-and-close;
- restart-required notice.

Do not attempt live index reconstruction after purge.

### 3:20-4:00 — validation and handoff

Run focused tests first, then the largest existing verification command that fits.

Update `HANDOFF.md` with:

- exact files changed;
- architecture decisions;
- tests/commands and actual results;
- native checks not run;
- any scope item not completed.

Stop at four hours. A correct bounded implementation is preferred over an unfinished broader redesign.

---

## 20. Minimum automated acceptance tests

### A. On-demand startup does not start global inventory

Fixture:

```text
indexingMode = on-demand
urlIndexingMode = on-demand
```

Assert after startup-ready:

- physical search ready;
- usable host/structural graph;
- no `source-inventory` start;
- no `host-metadata-comparison`;
- no `source-reconciliation`;
- zero whole-vault Markdown parsing.

### B. On-demand center parses only bounded candidates

Create:

- center A;
- several outgoing/incoming metadata-linked notes;
- many unrelated notes.

Navigate to A.

Assert:

- A and selected bounded candidates are parsed/acquired;
- unrelated notes are not parsed;
- canonical relationships replace preview relationships;
- task completes without `hasSemanticDependencies()` becoming globally true.

### C. Revisit uses durable cache

Navigate A, then B, then A.

Assert on second A visit:

- unchanged A does not require another vault body read/parse;
- same canonical result;
- no global inventory.

A recreated GraphIndex/IndexedDB test is preferable if it fits: first session indexes A, second session proves A is satisfied from durable body/source data.

### D. Fresh full snapshot remains fast

With a complete compatible snapshot and On-demand mode:

- restore a finite first-hop cover without whole-graph/source hydration;
- retain current cached incidence through unchanged selected-owner patches;
- do not enable global inventory or full-snapshot persistence;
- no full rebuild;
- the local graph remains navigable.

### E. Stale snapshot falls back to structural/on-demand state

Make one semantic note stale.

Assert:

- stale full semantic snapshot is not treated as globally current;
- structural baseline publishes;
- demanded center is patched;
- unrelated Markdown files are not globally reconciled.

### F. Background URL scan is semantic-independent

With:

```text
indexingMode = on-demand
urlIndexingMode = background
```

Assert:

- body scan can process all files;
- URL nodes/search aliases appear;
- no global semantic graph build;
- no source inventory;
- unrelated ontology relationships are not materialized solely by URL scan.

### G. URL On-demand has no hidden scan

With URL mode `on-demand`:

- startup performs no all-body URL scan;
- visiting a URL-bearing note adds its URL vocabulary and relation.

### H. Partial graph snapshot is not persisted as complete

Cold/no-snapshot On-demand session:

- build structural baseline;
- visit one center;
- trigger idle persistence window.

Assert no active complete graph snapshot is written from the partial state.

Body/source cache writes should still exist.

### I. Eager regression

Default/eager mode still invokes the existing full workflow and passes current startup tests.

### J. Purge

Populate IndexedDB.

Assert:

- size estimate > 0 or non-null;
- purge deletes the K-Plex database;
- no vault files changed;
- action reports restart requirement.

---

## 21. Native validation priorities

The equipped local agent has Obsidian CLI access. If time permits, prioritize only these three native checks.

### 1. Warm 20k On-demand restart

Settings:

```text
indexingMode = on-demand
urlIndexingMode = on-demand
```

Measure:

- host Find ready;
- host preview;
- graph/baseline ready;
- confirm no source authority timer/job begins;
- observe Obsidian CPU settles instead of remaining busy for ~60 seconds.

The important result is absence of global source work, not a new strict-readiness benchmark.

### 2. Navigate three notes

Choose A -> B -> A where A/B contain ontology fields and ordinary links.

Verify:

- preview is immediate;
- canonical relationships settle;
- second A is visibly/diagnostically cheaper;
- editing a relationship still saves correctly.

### 3. Background URL option

Enable background URL scan.

Verify:

- K-Plex remains interactive;
- URL search vocabulary grows;
- foreground navigation pre-empts/resumes the scan;
- source certification still does not start.

Do not spend the four-hour implementation window creating a new large-vault benchmark harness.

---

## 22. Suggested diagnostics for the patch

Reuse existing startup diagnostics. Add only bounded counters/milestones if needed:

```text
on-demand-baseline-ready
on-demand-center-requested
on-demand-center-patched
on-demand-owner-count
url-background-start
url-background-complete
```

Do not log paths/content in production diagnostics.

For acceptance, the most important negative evidence is:

```text
source inventory starts = 0
host-metadata-comparison = 0
source-reconciliation = 0
```

during On-demand startup/navigation.

---

## 23. Definition of done

The four-hour assignment is complete when all of the following are true:

- [x] New top-level **Indexing config** settings page exists.
- [x] `indexingMode = eager | on-demand` is persisted; default remains eager.
- [x] `urlIndexingMode = on-demand | background` is persisted.
- [x] On-demand startup does not enable global source inventory.
- [x] On-demand cold/no-snapshot startup publishes a structural baseline instead of indexing every Markdown file.
- [x] Visible navigation canonicalizes only center + bounded host-metadata candidates.
- [x] On-demand canonicalization reuses the durable body cache.
- [x] Relationship edits retain the exact pair preparation path.
- [x] Each demanded owner persists parsed/source data for later reuse.
- [x] Partial On-demand semantic state is not persisted as a complete graph snapshot.
- [x] URL background scan is independent of semantic/global source indexing.
- [x] URL On-demand mode performs no hidden all-vault body scan.
- [x] Index cache page displays an approximate K-Plex IndexedDB size.
- [x] Purge action deletes K-Plex IndexedDB after confirmation and requires restart.
- [x] Eager mode existing behavior remains intact.
- [x] Focused automated tests pass.
- [x] `HANDOFF.md` contains actual results and remaining native limitations.

- [x] Initial5-second local graph/count target demonstrated for the measured ordinary production-vault center, with explicit local coverage and measurement limits.

Desktop implementation acceptance is complete; physical-device and broader-center sampling remain the manual checks in the linked validation record.

---

## 24. Architectural target after V2

The intended steady-state model is:

```text
                         OBSIDIAN STARTUP
                               |
                   +-----------+-----------+
                   |                       |
            Physical catalog          MetadataCache
              (all files)           host relationships
                   |                       |
                   +-----------+-----------+
                               |
                     Immediate host preview
                               |
                 +-------------+-------------+
                 |                           |
        fresh full snapshot             no fresh snapshot
                 |                           |
         finite cached cover          structural baseline
                 |                           |
                 +-------------+-------------+
                               |
                         K-Plex READY
                               |
                    visible/navigation demand
                               |
              center + bounded metadata candidates
                               |
                 durable body/source cache
                     hit             miss
                      |                |
                      |          read + parse note
                      |                |
                      +-------+--------+
                              |
                 canonical incremental patch
                              |
                   persist exact owner data
                              |
               next visit is cheaper/faster

Optional independent lane:

             Background web-link scan
             parsed-body cache + URLs
                    |
               URL vocabulary
                    |
          NO full semantic graph build
          NO global source certification
```

The key architectural shift is simple:

> **K-Plex should pay semantic indexing cost when the user asks a semantic question, not merely because the plugin was enabled.**

Obsidian already owns a strong physical/metadata baseline. K-Plex should layer canonical ontology semantics over that baseline progressively, persist what it learns, and avoid proving global source closure unless a feature genuinely requires global closure.


### Acceptance reopened — production startup and navigation regression

The maintainer's subsequent ordinary Obsidian restart and Cohort → StoryOS → Cohort navigation fail: neighbors are missing and gates regress from numerical counts to ellipses/lower bounds. The earlier 3.695-second reference observation was one temporary runtime **On demand** sample after metadata/layout readiness, not a full application restart or this navigation sequence. It must not be treated as complete production acceptance. The reference vault's saved and active mode is **Eager**, and the installed main.js matches the verified build exactly.

A passive capture shows all 11,815 source owners validated/reused, semantic dependency authority ready, zero reads/parses/repairs/pending metadata/failures, but snapshot hydration still in node vocabulary. No active priority tasks or waiters are reported. Renderer hidden/unfocused excludes a comparable timing claim. This establishes separate pending vocabulary and navigation/coverage questions, not their final cause.

- [x] Diagnose and fix ordinary Eager warm startup and complete cached incidence loss on navigation.
- [x] Verify Finite and Infinite Games and Cohort → StoryOS → Cohort against exact final artifacts, preserving reference notes and saved preferences.
- [x] Distinguish actual vault reload, ready-host plugin reload and temporary-mode evidence; measured On-demand local closure3.760s/navigation2.665s or less meets the target for this foreground warm session. Persistent On-demand process restart/physical devices remain unmeasured.

The reopened desktop regression passes final exact verification and native saved-Eager/current-local On-demand scenarios. Prior failures remain in the validation record. C15–C26 remain paused; V2 remains uncommitted.

#### Confirmed failure paths and corrective design

The native **vault reload** reproduction differs from a plugin reload after metadata is ready. During startup, thousands of host metadata notifications and then a source-resolution revision change cancel the physically unchanged schema-3 snapshot before its full navigable publication. The coordinator falls back to broad startup work. A ready-host plugin reload does not reproduce that wave and therefore cannot establish application-startup acceptance.

Three further paths explain the reported symptoms: releasing the final visible demand deleted its complete semantic scope; optional node-vocabulary compilation repeatedly serialized the complete settings policy inside per-record currentness checks; and count preparation treated a virtual/unresolved endpoint's intentional lack of a `TFile` as unavailable metadata. These must be fixed in their existing owners.

- Retain recently released canonical scopes under an eight-entry, 32 MiB desktop / 8 MiB mobile allowance. Active scopes are outside this allowance. Reuse requires current source, maintenance, policy and coverage proof; stale presentation never authorizes writes.
- Cache the mutable presentation-policy comparison within an existing cooperative slice. Check it after task yields and immediately before publication. Source, generation, publication, maintenance and lifetime tokens remain cheap per-record checks.
- Compile unresolved incoming host contributions through the canonical collectors/compiler. Preserve actual virtual, URL and tag identity using caller-supplied entity facts. Missing metadata for a real Markdown file remains unavailable.
- Decode a trusted physically unchanged complete cache through resolver startup waves. Keep exact physical identity/stat/membership, lifecycle, semantic-policy and publication fences. A wave retires current semantic authority, not readable cached incidence. Show numeric cached totals with an explicit cached-count tooltip; current complete scopes/exact pairs replace them. An incomplete host preview cannot erase the coherent cached graph.
- Preserve an already decoded complete cached vocabulary rather than replacing its incidence with a node-only catalog. Finite first-hop previews may show cached numerical counts only where the complete saved neighbor list is present; truncated neighbor covers remain partial.

The five-second **current local count** target applies to On demand after host layout/metadata readiness. Eager startup must retain useful cached relations/counts without waiting for broad source validation. Cached presentation is an acceleration, never proof of current global absence or permission to edit. Final acceptance must include the maintainer's saved Eager mode with an actual vault reload and the named A → B → A sequence, plus On-demand Finite and Infinite Games including its unresolved neighbor.

#### Final desktop regression evidence

Final main.js `65bceafc…` passes requiredNode22.22.2 verification (7/67/248/17/322/341 tests by lane, no failures/skips/cancellations) and exact native smoke; all280 frozen inputs match. The actual saved-Eager vault reload survives11,049 host observations without the former cold fallback; all displayed gates are numeric by33.966s from the whole reload trigger, with early finite neighboring previews still partial. This is cached presentation, not a five-second current Eager claim.

Temporary On-demand session after host readiness reaches local closure3.760s (four durable owners, zero wrapped reads, no global inventory); Cohort/StoryOS revisits554–566ms, Finite and Infinite Games2.665s with35 direct nodes/144 numerical gate labels. Saved-Eager cached and On-demand current sequences both render every expected direct node. Notes/configuration/enablement are unchanged; only authorized main.js deployed. Both final instances are ready, no temporary wrappers/globals/pending semantic work remain. [Final regression validation](validation/on-demand-indexing-v2-2026-10-06.md) preserves target misses, failed checks, cached authority limits and unmeasured persistent-process/mobile paths.
