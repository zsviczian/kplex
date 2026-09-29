# SI0/SI1 settings and prepared presentation

**Implementation status:** SI0/SI1 accepted after independent review, exact Node 22.22.2 verification and native Obsidian validation. This describes the bounded presentation-decoupling checkpoint, not acceptance of the broader [settings-independent source-index design](INDEX_SETTINGS_INDEPENDENCE_DESIGN.md). SI2–SI5 and C15–C26 are not implemented here. See the [validation report](validation/settings-independent-indexing-si0-si1-2026-09-29.md).

## Ownership and effects

`src/core/graph/settingsPolicy.ts` is the portable, canonical settings-impact owner. It compares immutable, allowlisted per-key projections. Object keys are canonicalized; meaningful array order and multiplicity are retained. No comparison retains caller-owned mutable arrays or dictionaries. Custom ontology names, selector values and style dictionary keys remain private values, not diagnostic keys.

`KplexPlugin.saveSettings()` captures a projection before awaiting persistence and compares it with its previous save projection. Its historical `reindex` boolean is a compatibility parameter, not an invalidation decision. All controls and managers use this boundary, including early-return declarative branches and imports replacing the whole settings object. Semantic changes immediately invalidate in-flight semantic work, then schedule the conservative settings rebuild. The presentation path is independent and does not invoke a builder, per-file patch, Vault body read or parser.

| Policy | Inputs | Effects in SI1 |
| --- | --- | --- |
| Semantic | `hierarchy.hidden`, `parents`, `children`, `leftFriends`, `rightFriends`, `previous`, `next`; `inferAllLinksAsFriends`; `inverseInfer` | Conservative semantic invalidation remains. Source collection/fingerprints still depend on configured ontology. |
| Image suppression | `thumbnailProperty`, `nodeImageProperty` | Semantic invalidation plus visible imagery invalidation. These selectors alter suppression of image-only generic links, not merely their appearance. |
| Selected presentation facets | `showFullTagName`; `baseNodeStyle.maxLabelLength`; `noteTypeField`; `primaryTagField`; `tagStyleList` | Refresh only changed name/limit/type/style facets from cached inputs. Tag-name changes also refresh search. |
| Display/search | `renderAlias`, `nameFields`, retained `nodeTitleScript` input | Rebuild prepared search entries and clear display-title cache; preserve filename, alias and path alternatives. No new title-script execution is introduced. |
| Styling | Base/central/inferred/virtual/sibling/URL/attachment/folder/tag node styles; `tagNodeStyles`, `noteTypeStyles`, `displayAllStylePrefixes`; base/inferred/folder/tag/hierarchy link styles | Publish current styling and notify presentation subscribers without rebuilding search or relationships. Style dictionaries include their existing label overrides. |
| Cached imagery | `attachmentImageDisplay` | Clear the node-visual cache and notify presentation subscribers; existing visible-node resolver owns batched body-cache reads. |
| View/layout | Visibility, siblings, sort, lenses, exclusions, background, connectors, graph depth, item limits, columns/heights, sizing, layout profiles, autozoom, embedding, animation | Render notification, no semantic invalidation. `hierarchy.exclusions` is discovery UI policy, not ontology compilation. |
| Other workflow preferences | Existing persisted workflow keys outside the finite policy projection | Remain persisted. A caller requesting a notification receives a presentation-only notification; existing workflow-specific subscriptions remain in place. |

`PRESENTATION_KEYS`, `HIERARCHY_ROLES`, `VIEW_KEYS` and `SETTING_DIAGNOSTIC_KEYS` are the exact code inventories. The view projection is intentionally finite, not a replacement settings framework. Existing workflow commands calling `index.notify()` directly remain legacy revision consumers; they are not the settings-only path.

### Mutation entry points

| Caller | Route and responsibility |
| --- | --- |
| `settings.ts`: `KplexSettingTab.setControlValue()` | Generic ontology, tag/type/alias/title, style and view controls, including all specialized early-return branches, call `saveSettings()`. The separate `REINDEX_SETTING_KEYS` list is removed. |
| `KplexSettingTab.openNoteTypeStyleEditor()` | Add/edit/rename/remove `noteTypeStyles` through modal callbacks, then save. |
| `KplexSettingTab.openLegacyTagStyleEditor()` | Add/edit/rename/remove both `tagNodeStyles` and the ordered `tagStyleList`; preserves existing rename precedence, then save. |
| `KplexSettingTab.openOntologyLinkStyleEditor()` and style controls in `getSettingDefinitions()` | Save dictionary/base-style mutations through the same classifier. Custom property keys never become diagnostic keys. |
| `LegacySettingsImportModal.onOpen()` import handler | Existing bounded `importExcaliBrainGraphSettings()` result replaces settings, then `saveSettings(true)` classifies the actual change. An appearance-only import cannot force rebuilding through the old boolean. |
| `main.ts`: `onload()`/layout-ready first-run import | Capture the already-normalized own settings before import; run first-use foreign import through `saveSettings()`. The separate pre-index `kplexInitialized` bookkeeping write is not an appearance mutation. |
| `main.ts`: ontology assignment/default-field and other direct plugin saves | Existing calls now pass through classification even when their boolean is false. Actual hierarchy changes remain semantic. |
| `ui/App.tsx`: toolbar alias toggle, view/layout controls and lens saves; `ui/PlexGraph.tsx`: area-height gestures | Existing `saveSettings()` calls reuse the canonical boundary. Camera/folds remain view-local, not indexed settings. |
| `GraphIndex.refreshDisplayNames()` | Retained synchronous alias/name/title compatibility method. No production settings control bypasses the full settings refresh through this method; existing direct tests/callers remain supported. Retire with SI4 display-query migration. |

## Saved signature compatibility

`computeIndexSettingsSignature()` now delegates to the portable encoder. The serialized **signature format** changes, not graph schema 3, IndexedDB version 4, body-cache version 2, or the persisted settings format.

| Input | Decision |
| --- | --- |
| Current `{schema:1, signatureVersion:2, hierarchy, inferAllLinksAsFriends, inverseInfer, thumbnailProperty, nodeImageProperty}` | Compare named semantic policy. Exact JSON member order is irrelevant; arrays remain ordered. Equal policy is compatible. |
| Legacy `{schema:1, hierarchy, inferAllLinksAsFriends, inverseInfer, showFullTagName, noteTypeField, primaryTagField, tagStyleList, maxLabelLength}` | Recognized. Presentation differences remain compatible; report `signature-format-changed`, then adapt current presentation before any preview/publication. |
| Same legacy object with optional string `excalibrainFilepath` | Recognized retired-policy upgrade. Nonempty values require the reconciliation plan described below. Empty/absent values have no retired target. |
| Recognized hierarchy object | Requires seven string-list roles. Accepts optional string-list `exclusions` and historical `friends`; `friends` supplies missing `leftFriends`. Exclusions do not change graph validity. |
| Hierarchy/inference or retained image-policy difference | Incompatible: `semantic-settings-changed`, with only static changed-key names. |
| Invalid JSON, wrong shape/type/schema/version, unknown top-level/hierarchy member | Incompatible: `signature-format-unknown`. Never throws or exports raw input. |

Legacy signatures did **not** record image selectors. The decoder uses the historical defaults (`thumbnail`, `node-image`) as their comparison baseline; a current nondefault selector rejects the legacy graph conservatively. This cannot reconstruct whether an older binary once used nondefault image selectors while writing a signature that omitted them. SI0 explicitly characterizes that historical under-invalidation; the new signature fixes future writes, not unknowable provenance. Review confirmed this limitation against the deployed historical signature writer; no claim of retroactive proof is made.

New signatures omit all presentation keys. Persisted legacy presentation fields are still readable but not treated as current runtime truth. The same comparator is used for active and checkpoint candidates. Existing freshness preference, corruption fallback, watchdog, resumable completed-source sets and structural fallback remain; newly awaited targeted preview preparation is attributed to the existing `preview-search` watchdog phase and reports progress.

### Retired exclusion reconciliation

`src/index/LegacySnapshotPolicy.ts` retains a compatible saved generation while identifying sources that could have been affected by the old exclusion. It checks the formerly excluded Markdown entity, host-resolved/unresolved inbound references, configured property references and Date targets. Property extraction and Date interpretation reuse existing parser/collector owners. It never reads or parses Markdown itself.

Valid hot/durable bodies are requested in batches of 64. A source with missing body or MetadataCache inputs is conservatively dirty, rather than assumed unaffected. The plan can therefore include many sources when an old body cache is cold. Affected sources are removed from trusted fingerprints/completed checkpoint paths and passed to **ordinary upgrade-semantic reconciliation**. That later reconciliation may read missing bodies. It is explicitly not settings-only presentation work and is reported as `retired-policy-reconcile`; an empty plan is `retired-policy-no-affected-sources`. File identity/stat/source-revision fences reject obsolete plans. Unsupported non-Markdown/folder topology still takes the established structural fallback. The unused older file-chunk restore facade conservatively rejects a nonempty retired exclusion instead of ignoring it.

## Cached presentation preparation and publication

`src/index/GraphPresentation.ts` owns selected presentation preparation. Pure normalization/tag-selection rules are shared with the compiler in `src/core/graph/presentation.ts`; there is no second property grammar or relationship classifier.

Preparation obtains only the selected frontmatter values from Obsidian `MetadataCache`, plus mtime-valid hot or durable `ParsedBodyMetadata` records when inline values are required. Durable validation retains the existing parser-version rule. Frontmatter's first matching note-type value takes precedence over inline input; primary-tag compatibility collects the historical frontmatter and inline candidates. Type normalization, raw tag order, first matching style-prefix precedence and canonical tag identity remain unchanged.

Missing required cache inputs yield explicit `pending` status (`getPresentationStatus(page)`) for type/style facets. The prepared facade clears an untrustworthy value to null/empty while the status distinguishes it from known-empty. No semantic work is scheduled and no Markdown fallback occurs. A detached file yields pending input instead of an infinite retry while semantic indexing is deferred. Later ordinary source commits refill the facade from their valid parsed-body input. Missing data alone does not trigger a body-cache warmer.

The provider stages lightweight facet records and optionally search entries, not another graph, and releases each 64-source body batch before the next request. It yields cooperatively. Final fences cover repository publication, source revision, exact file identity/path/mtime/size, current policy and plugin lifetime. A newer request wins; obsolete preparation is discarded/retried. No page mutation occurs across an await. Facets, applied presentation settings, title/search caches and notifications publish synchronously. Source patches reapply the already-prepared policy at their existing synchronous commit boundary, preserving canonical `GraphPage` identity.

Every saved-state publication, including targeted previews and page-only previews before evidence promotion, prepares current facets first. Cold progressive startup preserves bounded seed search and does not prefetch the entire durable body cache just to prepare the structural preview. A full rebuild and final restored state also pass through the presentation owner. Normal presentation refresh does not replace neighbor maps, evidence storage or relationship caches.

`GraphIndex.subscribePresentation()` is separate from `subscribe()`/`getSemanticRevision()`. `App` subscribes only while the host leaf is visible and reuses its visibility catch-up path. `getViewSettings()` overlays the last coherently prepared presentation policy on live workflow/view preferences. In `PlexGraph`, section Markdown/evidence acquisition depends on semantic/source revisions; presentation notifications reproject the already cached section evidence without reading Markdown. The existing visible-node imagery provider remains a finite asynchronous facade; its source/lifetime and main-window/pop-out behavior still require native validation.

## Finite presentation-field reader inventory

The synchronous page fields remain intentionally compatible until SI4. New runtime consumers must read the prepared facade or repository queries, never hydrate-and-display raw persisted values.

| Reader/adapter | Fields and purpose | Later owner |
| --- | --- | --- |
| `GraphIndex`: `suggestionCatalog`, `makeSearchEntry`, `patchSearchIndex`, `displayNameFromConfiguredFields`, `titleFor` | Prepared `name`/`noteType`, aliases and selected search display; semantic URL/filename names retain existing source ownership. | SI4 presentation/search queries |
| `GraphIndex` immediate creation/rename/dematerialization/materialization helpers | Construct/update names, clear selected facets on dematerialization, seed limits for existing workflow publication. These remain synchronous repository operations, not persisted-facet authority. | SI4 prepared page/entity boundary |
| `index/style.ts`: `tagStyle`, `noteTypeStyle`, `resolveNodeStyle` | `primaryStyleTag`, `styleTags`, `noteType` plus current prepared dictionaries; explicit type override still wins. | SI4 style-query facade |
| `adapters/obsidian/graphContracts.ts`: `graphNodeView` and settings adapter | Copies all five facade fields into portable views; historical compiler settings adapter still includes presentation values. | SI4 adapter retirement |
| `core/plex/predicate.ts`: node/label property evaluation, through `predicateContracts.ts` | `name`, `noteType` from the prepared node view. | SI4 revision-aware predicate facade |
| `settings.ts`: `nodeStyleValueSuggestions`; `ui/NoteTypeModal.ts`: `onOpen` | Current prepared `noteType` suggestions; modal settings metadata is still host-owned. | SI4 presentation catalog |
| `index/SectionExpansion.ts`: `clonePage`, build/project helpers | Copies facade fields into transient scene pages; clears type/style on heading nodes. Cached reprojection re-clones current center; targets retain canonical page references. | SI4 view-local prepared projection |
| `ui/PlexGraph.tsx` | Target `name` in section evidence signature and heading/explanation captions; receives `semanticRevision` separately from presentation rerenders. | SI4 scene/evidence revisions |
| `ui/layout.ts`, `ui/ThoughtNode.tsx`, expanded-child rendering | Repository titles and resolved style label limits, not raw saved pages. | Existing layout/presentation owner; SI4 input facade |
| `GraphBuilder`: clones/binders/materializers; `core/graph/compiler.ts` | Compiler still creates these fields as finite compatibility output. Published state is corrected by the provider. Configured selectors still participate in fingerprints/collection. | SI2 neutral facts, SI4 compiler cleanup |
| `IndexSnapshot.ts`; `IndexedDbCache.ts` byte estimator/validation | Encode/decode all five legacy fields; no rendering or new acquisition. | Later schema/facade retirement, not SI1 |

## Neighbor-map reader inventory for SI4

No semantic map/ontology contract is changed by this patch. The following are the direct or wrapping consumers to migrate deliberately, not through a broad SI1 rewrite.

| Consumer | Existing semantic use | Later owner |
| --- | --- | --- |
| `main.ts`: relation-creation/relink continuation | `origin.neighbours.get(target.path)` preserves existing link direction. | SI4 repository relationship query |
| `GraphIndex`: progressive seed selection/search, `renameFile`, `dematerializeFile` | Direct iteration/mutation for seed hops and coherent canonical target cleanup. | SI4 prepared transaction/revision boundary |
| `GraphIndex`: neighbor sorting, relation-view cache, role/gate enumeration, neighborhood/sibling projection, connection/structural checks | Direct `size`, iteration, `has` and reverse-target queries; public `neighbours()`/`getNeighborhood()` wrap them. | SI4 revision-aware relationship facade |
| `GraphBuilder`: clone/copy/materialize/bind, empty-tag and unused-URL pruning | Private staged relation maps and canonical target rebinding/publication. | SI4 compiler/transaction boundary |
| `IndexSnapshot.ts`: serialization and hydration | Persisted relation views and canonical target rebinding. | Later persistence interpretation boundary |
| `SectionExpansion.ts`: `resolveNeighbourhood`, build and cached projection | Transient center/section map construction and membership checks for cached evidence. | SI4 view-local relationship view |
| `core/graph/resolver.ts` | Canonical resolved-map writes and explanation lookup. Remains the sole semantic resolver. | Existing resolver, SI4 revision input seam |
| `ui/ContentPane.tsx`, `ui/PlexFilter.tsx`, `ui/PlexGraph.tsx`, `ui/layout.ts` | Public `index.neighbours()`/neighborhood calls for related notes, local filter scope, depth-two expansion and child reserve. No newly introduced raw map reads. | SI4 query consumers |

## Diagnostics, schema and rollback

Local diagnostics remain last-20, path-free, with aggregate numeric fields. The optional `changedKeys` contains only the static allowlist. `sanitizeIndexDiagnostics()` validates history on storage read/write and the repository getter; `createIndexDiagnosticsReport()` sanitizes it again before export. Arbitrary properties, custom property/style names, setting values, raw signatures and signature hashes are not copied. No telemetry, logs, user-facing strings or persisted arbitrary frontmatter were added.

New relevant reasons are `signature-format-changed`, `signature-format-unknown`, `semantic-settings-changed`, `presentation-settings-adapted`, `presentation-inputs-pending`, and the two retired-policy plan outcomes. Signature adaptation diagnostics supplement, rather than replace, candidate-selected/restored/failure decisions. Pending status is runtime-only; no schema field is added to persisted pages.

A downgrade may reject format-2 signature strings using the old binary's exact comparison and rebuild a disposable graph snapshot. Parsed-body schema, DB stores, persisted settings and user documents remain unchanged. Preserve ordinary backups; do not delete a personal vault cache to validate rollback. The historical `excalibrainFilepath` token is allowlisted only in the compatibility decoder and existing migration seams, never as a revived command or setting.

## Explicit limits

SI2's configured-only ontology omission is executable characterization, not fixed: unassigned frontmatter/inline reference candidates do not yet enter compilation. SI4 still owns neutral reinterpretation, revision-aware facade migration and removal of presentation selectors from collection/fingerprints. A later **file edit** may therefore do more semantic work after a selector change; the settings-only change itself does not schedule that work. Image-suppression policy and Date/host-resolution dependencies remain their existing semantic responsibilities.

Production-method tests use the repository's transpile/Obsidian harness and are supplemented by real declarations/build, exact installed desktop restore/reload, native migration, main-window/pop-out subscription and large-fixture work-counter probes. These checks do not prove physical-mobile memory, lifecycle or actual-paint performance. SI5 retains those release gates.
