# AGENTS.md

## Mission

Develop **K-Plex (Knowledge Plex)** as a dedicated React application inside Obsidian while preserving the relationship semantics, ontology model and useful settings compatibility of classic ExcaliBrain.

K-Plex is not an Excalidraw extension. Excalidraw and Dataview must not be runtime requirements.

The plugin ID is **`k-plex`** so K-Plex can coexist with legacy ExcaliBrain during migration.

## Build contract

Baseline Node.js: **22.22.2**.

```bash
npm i
npm run build
```

Use `npm run dev` for watch-mode development.

A change is not complete if the real repository does not build successfully.

Installable output must be written to `./dist/`:

- `dist/main.js`
- `dist/manifest.json`
- `dist/styles.css`

Do not claim a successful build from a stub-only/type-harness check. When Obsidian APIs are involved, validate against the actual installed `obsidian` type package.

## Code-scanner hygiene

Treat Obsidian's code scanner as part of the compatibility contract. New or touched code should avoid known scanner warnings rather than relying on suppressions.

- Prefer TypeScript's inferred/public API type when it is already correct. Do not add `as SomeType` assertions that do not narrow or change the expression type.
- Do not union literal/string-enum types with the broad `string` primitive (for example `TokenKind | string`); `string` subsumes the narrower string members. Use `string`, a genuinely closed union, or separate parameters/overloads as appropriate.
- Do not use `globalThis` in plugin/UI code. For host globals use `window` or the owning/active window. For DOM created in pop-outs, derive the window from `element.ownerDocument.defaultView` when the operation is window-specific.
- Do not call bare viewport/window scheduling APIs such as `requestAnimationFrame()`. Use the correct owning window (`element.ownerDocument.defaultView ?? window`) and call `viewWindow.requestAnimationFrame(...)`; use the same window for cancellation.
- Remove unused imports, types and locals as part of every change. Do not leave dead type-only imports after refactors.
- Prefer broadly supported CSS primitives within K-Plex's minimum Obsidian version. In grid/flex layouts use `gap` instead of `column-gap` when either expresses the same intent; avoid CSS features the Obsidian scanner reports as only partially supported.
- Prefer Obsidian's own semantic CSS classes and CSS variables wherever practical (`--text-*`, `--background-*`, `--interactive-*`, `--color-*`, tab/modal variables, etc.) instead of hard-coded UI colors or surfaces. K-Plex must inherit community themes naturally; plugin-specific CSS should describe structure/state, while Obsidian theme variables provide the visual tokens.
- Temporary attention/highlight states should be implemented by adding/removing a semantic CSS class and styling that class in `styles.css` with Obsidian theme variables. Do not inject one-off inline colors/borders for these states.
- Do not silence scanner findings with `!important`, blanket casts, or compatibility suppressions unless the underlying issue cannot be solved cleanly and the exception is documented here.

## Obsidian API discipline

This project has already lost time to invented/assumed APIs. Do not guess Obsidian methods.

Rules:

1. Check the installed Obsidian type declarations and current official documentation before using an unfamiliar API.
2. Prefer public typed APIs.
3. Example: `MetadataCache.getFileCache(file)` is valid and `getAllTags(cache)` is exported; do **not** invent `metadataCache.getTags()`.
4. Use Obsidian `Modal` for centered modal dialogs.
5. Use `workspace.getLeaf("window")` for pop-out workflows when supported by the installed API.
6. Use the Obsidian declarative settings API for settings UI.
7. All plugin UI icons must be Lucide icons obtained through Obsidian `getIcon()` (or a thin React wrapper around it). Do not ship hand-coded icon SVGs or unrelated icon libraries.
8. When subclassing Obsidian UI classes (`Modal`, `SuggestModal`, `AbstractInputSuggest`, etc.), do not reuse base-class property names such as `scope` for unrelated local state. Type-check against the installed Obsidian API before release.
9. Moment is host-provided by Obsidian. Do not runtime-import `moment` or call the `moment` export from `obsidian`; production code should use Obsidian's `window.moment` through narrow local typing. Tests may install a Moment test double on `window`.
10. When a vault path is known and a specific type is expected, prefer the narrow synchronous Vault API (`getFileByPath()` / `getFolderByPath()`) over `getAbstractFileByPath()` or adapter-level existence checks.
11. Register long-lived Obsidian/DOM/timer resources through plugin lifecycle helpers where practical, or provide an equally explicit cleanup path. Reload/unload must not leak listeners, timers or detached UI.

## Host UX, privacy and accessibility

- K-Plex is local/offline by default. Do not add telemetry, remote-code loading or network calls without an explicit user-facing reason, opt-in where appropriate, and clear documentation.
- Keep UI copy short, sentence-case and action-oriented. Prefer established Obsidian classes/components before inventing a parallel visual language.
- Settings are user-facing product UI, not a debugging surface. Never expose implementation commentary (for example “instead of expanding the collection in Settings”) as labels or descriptions. Explain the user-visible purpose of a control.
- Do not dump large discovered/configured collections into a settings page. Put large collections behind a searchable/filterable manager or a dedicated subpage, show useful counts/summaries, and avoid nested scroll regions or horizontal scrolling.
- Prefer shallow, task-oriented settings pages. When a settings page mixes distinct jobs (for example canvas, node styling and link styling), use declarative subpages so the landing page remains easy to scan.
- Use semantic interactive elements. Link-like navigation should behave as navigation; buttons should represent actions.
- A control with an Obsidian/styled tooltip must use `aria-label` for its accessible name and **must not also set an HTML `title` attribute**. Native Chromium/Electron `title` tooltips otherwise stack on top of the styled tooltip.
- Portaled menus/popovers must carry portal-safe classes and an explicit stacking level when needed; validate main window, pop-out, click-outside and Escape behavior.
- Desktop mobile emulation is useful for layout only. Validate touch targets, synthesized clicks, scrolling, long-press and focus on a physical phone/tablet before considering mobile interaction work complete.

## Non-negotiable compatibility rules

1. Preserve classic ExcaliBrain ontology semantics unless a deliberate migration/change is documented.
2. Explicit document-property relationships take precedence over inferred/body relationships.
3. Preserve parent / child / left-friend / right-friend / previous / next reconciliation behavior.
4. Preserve support for Markdown notes, attachments, folders, tags, URLs and virtual/unresolved nodes.
5. Preserve legacy style inheritance as closely as possible without relying on Excalidraw rendering.
6. Preserve/migrate legacy persisted settings instead of silently reinterpreting them.
7. Migrate old `hierarchy.friends` to `hierarchy.leftFriends`.
8. If legacy ExcaliBrain is installed and running, automatically import compatible settings the first time K-Plex runs in that vault. Keep a manual import path as well.
9. Folder and tag nodes may be central nodes. Relationship creation/relinking involving folder/tag endpoints stays disabled, except that dragging outward from a folder's child gate is an explicit file-creation gesture for creating a real child file inside that physical folder.
10. A Markdown document property overrides an equivalent relationship discovered in body text. This rule is important for deterministic relinking.

## Documentation contract

`README.md` is strictly end-user-facing. It should explain what K-Plex is, why it exists, how to get started, how to use major features, where to report issues/contribute, and how to support development. Do not add Node/npm build steps, source architecture, cache internals, performance implementation details or developer-only invariants to the README.

- Contributor workflow belongs in `CONTRIBUTING.md`.
- Durable architecture/design notes belong under `docs/`.
- Feature-specific end-user guides may live under `docs/` and be linked from the README.
- Keep the README's first-start indexing notice and existing product screenshots unless deliberately replacing them with newer user-facing imagery.
- Release notes should be written in product language and focus on observable behavior.

## Architecture boundaries

- `src/index/` owns graph construction, relationship semantics, search data, caches and compatibility.
- `src/ui/` owns React presentation and interaction.
- `src/settings.ts` owns settings schema/defaults, persistence compatibility and migration.
- `src/main.ts` owns Obsidian lifecycle, commands, workspace/window/leaf integration and rebuild scheduling.

Do not reimplement relationship classification inside React components. UI code should consume normalized index APIs.

Keep Obsidian-specific side effects behind clear boundaries. Presentational components should not reach deeply into workspace/vault APIs when plugin/index services can perform the operation.

## Performance is a product requirement

The plugin must remain responsive in vaults with 20,000+ files and 100,000+ graph/search entries.

### Startup

Obsidian emits large numbers of file events while initializing a vault. Never trigger a full rebuild for every startup `vault:create` or metadata event.

Required strategy:

- wait until layout is ready and metadata is sufficiently stable before the initial full graph build
- register/coalesce normal rebuild listeners only after startup initialization is under control
- mark the index dirty on changes and skip periodic refreshes when it is clean
- collapse event bursts into at most one rebuild/catch-up rebuild

### Persistent parsing cache

Markdown body parsing is expensive and should not repeat on every startup.

- persist parsed inline-field / external-link body metadata in vault-local storage
- key cache records by path + modification time (or an equivalent safe invalidation key)
- restore the cache before the first graph build
- write cache updates lazily/debounced

### Worker boundary

CPU-heavy Markdown-body text parsing may run in a Web Worker.

Do not attempt to use Obsidian APIs inside the worker. Vault/metadata access, graph mutation and Obsidian object handling remain on the main thread.

### Derived-data caching

Avoid repeated global work while rendering one scene.

Cache or precompute:

- relationship classifications / normalized neighbor views
- node titles
- title-script results
- sort keys
- gate counts where safe
- search-normalized strings

Compile user title scripts once, not per node.

Never call `titleFor()` repeatedly from an `Array.sort()` comparator. Compute titles/sort keys once and sort on the cached keys.

UI-only actions such as pan, zoom, hover, history updates and density changes must not trigger index rebuilds.

### Search

Search must feel immediate in large vaults.

- normalize search text ahead of time
- use exact > prefix > substring > fuzzy ranking
- fuzzy matching is ordered subsequence matching
- search aliases and paths
- reuse previous-query candidate sets for longer prefixes rather than rescanning the entire index on every keystroke
- do not globally sort all search entries at startup just to support query-time ranking

### Instrumentation

Temporary performance instrumentation may be added while diagnosing regressions, but it must be disabled or removed from normal production output once the issue is resolved.

If profiling is needed again, add it behind an explicit development/debug flag and emit copy-friendly string lines. Do not leave high-volume console logging enabled by default.

## Plex layout contract

K-Plex is not a force-directed graph. Spatial meaning is deterministic.

### Zones

- parents: top / center
- children: bottom / center
- friends + previous: left
- challengers + next: right
- siblings: separate right-side peripheral zone

Left and right primary zones should be symmetrical. Siblings are the intentional asymmetry.

The zones must not visually overlap one another in normal use.

Current target defaults:

- parent columns: **2**
- child columns: **5**
- parent max height: **300 px**
- friend/challenger max height: **350 px**
- child max height: **400 px**
- sibling max height: **250 px**
- density: **2**, configurable up to **4**
- max nodes per zone: **100**, configurable up to **300**

Parent columns must not exceed 2. Children may be configured up to 7 columns.

Friends/challengers and siblings may extend upward into otherwise unused parent-area space. They should not be artificially clipped by the parent's vertical boundary.

When their occupied strip fits, Friends/Previous and Challengers/Next are **bottom-aligned** within their shared-height lateral bands and grow upward. A sparse lateral list (including a single node) must stay near the lower edge of the lateral region instead of being centered high in the available band. Overflowing strips remain scrollable; if filtering reduces an overflowed lateral zone to a result set that fits, preserve the same bottom-aligned behavior.

Leave a small vertical gap between the bottom of lateral zones and the start of children; children should sit slightly lower than in the earlier layout.

Siblings:

- move slightly upward relative to the current layout
- render using the persisted `siblingRelativeSize` multiplier, constrained to **30%–85%**
- expanded-view descendants of sibling nodes inherit the same configured multiplier

### Scroll zones

Each major zone has its own maximum height.

When the node list exceeds that height:

- make the zone internally scrollable
- show a funnel/filter control for first-level friend/challenger/sibling/parent/child scroll regions where applicable
- filtering must remove and repack nonmatching items; invisible placeholders that preserve whitespace are a bug
- the count above the funnel shows the total/current visible item count even when the text filter is closed

Expanded-descendant scrollers do not get filter controls.

### Density

Density/compactness affects:

- inter-node spacing
- label truncation / maximum displayed characters
- overall layout density

Density must **not** change node interior padding. Use the tight padding from the compact design at every density.


### Mobile / view-surface rules

- Use only the public `Platform.isMobile` flag. Distinguish phone vs tablet using the shortest CSS-pixel screen dimension; do not rely on undocumented `Platform.isPhone` / `Platform.isTablet` members.
- Phone: the generic K-Plex open action routes to the right sidepanel; command palette should expose only **Open in side panel** among K-Plex surface-opening commands.
- Tablet: **Open graph** opens a normal K-Plex tab and **Open in side panel** remains available; pop-out is desktop-only.
- Touch activation must not depend on a synthesized browser click. A stationary one-finger pointer-up activates the node explicitly; movement owns pan/pinch; long-press owns context menus.
- K-Plex canvas touch gestures stop propagation/default handling so Obsidian Mobile edge/top swipe gestures do not steal pans. Scrollable internal zones remain native scroll surfaces.


### Index lifecycle and mobile memory rules

- Restore the persisted semantic graph snapshot before doing expensive Markdown parsing. IndexedDB generations are activated only after all records are written; cache data is never authoritative.
- Persist parsed-body metadata by path+mtime+parser-version in IndexedDB on every platform so an interrupted cold build can reuse completed parsing. Any IndexedDB store/index schema change requires a database-version bump; silently adding a store name without upgrading the DB leaves existing vault databases permanently unable to create it. On iOS keep only a tiny bounded hot in-memory parser cache; worker parsing remains disabled there to avoid structured-clone duplication of Markdown strings/payloads.
- For a large iOS cold start with no semantic snapshot, prewarm bodies into transactional IndexedDB batches **before** retaining the full semantic graph. Bound concurrent native reads, yield real paint/autorelease windows between I/O waves, keep the prewarm cancellable, then run the authoritative GraphBuilder from durable hits. Do not combine a ten-thousand-file body scan with a simultaneously growing full graph on iOS.
- Persist resolved neighbour maps alongside provenance so warm startup does not replay the full classifier. Keep relationship evidence declaration-compact: retain one original declaration and derive its inverse perspective on demand rather than storing duplicate forward/reverse evidence objects.
- Reject structurally stale or half-bound cached graphs instead of publishing them while a replacement is built; holding old+new full graphs simultaneously is especially dangerous on iOS.
- Perform one initial session index (or accept a fresh restored snapshot), then stop reactive rebuild work while no K-Plex view is open. Vault/metadata events accumulate as a dirty backlog until the next open. On iOS, cancelling the last open Plex must also cancel a first cold build; completed IndexedDB checkpoints remain reusable.
- Large build and resolver loops must cooperate with the host using **time-budgeted slices**, not tiny fixed record-count yields. `setTimeout(0)` should occur only after the current synchronous slice has consumed its budget; yielding every note can turn an otherwise fast iOS pass into tens of seconds of timer overhead. All long work must remain cancellable. Never clear the dirty backlog unless a snapshot was actually published.
- Per-file incremental edits must use the evidence store's path index (`declarationsTouching` / `removeDeclarationsTouching`) rather than scanning every evidence declaration. Full semantic snapshot persistence after small edits should be deferred/coalesced and cancelled when the last K-Plex view closes.
- Cancellation is a first-class incremental-index outcome, never shorthand for “run a full rebuild.” After awaited work, re-check visible demand before any fallback build. Commit graph mutations, semantic fingerprints, search entries and affected-cache invalidation at the same per-file boundary; a cancelled batch must report/retain only genuinely pending paths unless a newer metadata revision makes the conservative backlog necessary.
- Body parsing on the UI thread must remain resumable and time-budgeted **inside a single long physical line**. Avoid regexes whose failed match can rescan an unbounded suffix at each candidate delimiter (especially Markdown labels around URLs); malformed-input regressions must include real URLs and scaling checks. Worker and cooperative-fallback parsers must stay grammar-equivalent, and both cancellation paths must be tested. Checkpoints must be reachable regardless of match/continue branches and must slice long whitespace/delimiter/URL scans; do not rely on an exact modulo index that a branch can jump over.
- After parsing, expensive incremental graph work must be staged against private copy-on-write state and cooperatively sliced before publication. Never insert `await` into partially mutated live graph state. Publish graph/evidence/fingerprint/search/cache effects at one per-file boundary, and keep cancellation after parsing covered by an end-to-end large-note responsiveness test.
- Copy-on-write publication must preserve canonical `GraphPage` identity because relations retain direct page references. Bound and cooperatively compact overlay/evidence chains so edit history cannot retain obsolete graph generations; semantic no-op saves must not create evidence layers.
- Expanded-section parsing/evidence is cached independently from presentation visibility. Folder/tag/node visibility changes must re-project cached section evidence without rereading Markdown, reparsing, dirtying the semantic index, replacing fold state or resetting the camera. Siblings must be structurally re-derived during projection from the current visible parents/settings, and `renderSiblings` must participate in projection invalidation.
- Optimistically created/materialized Markdown files must reconcile complete `folder:/` ancestry and bidirectional file-tree relationships immediately from the `TFile`, including when folder nodes are hidden or the path previously existed only as an unresolved/virtual page. Managed create-event suppression must never be relied on to repair this topology later.
- During iOS pinch, prefer a temporarily simplified scene over GPU/WebView memory pressure: no expensive shadows/filters and relationship SVGs may be temporarily suppressed until the gesture ends.

### Companion sidecar

The sidecar is a **native adjacent Obsidian WorkspaceLeaf**, never a fake nested leaf inside React. It is also an **owned companion leaf**: K-Plex must create the leaf it manages as a sidecar and must never adopt an arbitrary adjacent/recent/pinned user tab. This ownership distinction is critical because sidecar move/close actions may detach the managed leaf; ordinary tabs must never be collateral damage. A pinned/synchronized note tab and a sidecar are separate concepts even when both happen to be adjacent to K-Plex. Opening a sidecar pins synchronization to the K-Plex-created companion; closing it turns that sidecar synchronization off. If the user manually moves a managed sidecar away, keep that document tab open and release/recreate sidecar ownership as needed rather than dragging or closing the moved tab. Detach breaks synchronization but leaves the native tab open. Closing K-Plex must also release ownership without detaching the user's companion document. Sidecar Markdown mode is a persisted K-Plex default (Reading view vs Edit/source mode). Folding K-Plex in sidecar mode hides the complete K-Plex tab-group DOM container, keeps both workspace leaves alive, and mounts the recovery/unfold button on the surviving document tab group; all fold state is ephemeral and must be restored on leaf removal/plugin unload. Sidecar is unavailable when K-Plex itself is hosted in a sidepanel.

Moving an open sidecar between left/right/above/below must preserve the **combined K-Plex + sidecar workspace allocation**, including when another unrelated tab group is present. Measure the tab-group `containerEl` rectangles before the move, keep structural continuity by creating/populating the replacement before detaching the old companion, then re-establish the saved combined bounding rectangle after Obsidian collapses/reparents the old split. A one-shot `flex-basis` correction is acceptable only for the settled workspace branches that participate in that geometry restoration; do not run continuous resize loops or repeatedly rebalance unrelated ancestors. Enumerate DOM children with `Array.from(...)` rather than assuming `HTMLCollection` is iterable under the project TypeScript configuration.

Persisted `sidecarOpen` is restore intent, not merely a mirror of the runtime ownership map. At Obsidian startup, K-Plex must be **non-greedy**: Obsidian restores the workspace groups, and K-Plex only re-associates ownership. Startup code must never call the normal sidecar-open path or create a new workspace split. The remembered `sidecarPosition` is the primary spatial identity: only the document tab-group directly adjacent on that remembered side is eligible (right means right, never a same-file tab below/left). Persist the actual last document/URL shown by the managed sidecar and prefer that exact restored tab inside the remembered-side group; next prefer Obsidian's active/visible tab in that group, then K-Plex navigation history as a legacy fallback. Do not use the graph center as a proxy for sidecar content. Keep a short session-only startup-initialization guard so transient `getMostRecentLeaf()` / `getActiveFile()` values cannot redirect K-Plex before re-association finishes. If two independent tab-groups share that edge or ownership remains ambiguous, adopt neither. Wait briefly for native split geometry/DeferredViews to settle rather than manufacturing a replacement pane. Serialized `WorkspaceLeaf.getViewState()` is authoritative enough to inspect deferred restored files before `FileView.file` hydrates. During an explicit sidecar move, transient zero-size layout events are non-authoritative until the replacement split settles.

### Runtime section outline

Central-note heading expansion remains outside the persistent graph index. Nested headings form a transient foldable outline tree. Section nodes are compact theme-aware outline cards; structural outline edges use a distinct **solid orthogonal folder-tree** geometry: vertical spine from the parent's lower-left structural port, horizontal L-branch into the child's left-center port. Semantic relationships still use normal K-Plex gates. A Markdown central node always exposes the small lower-left fold handle so sections can be unfolded directly; non-Markdown centers must not render that handle. Folding hides descendants and projects their relationships to the nearest visible folded ancestor while preserving the original hidden section as explainability provenance. Fold/unfold must preserve the exact camera and suppress transient ResizeObserver auto-fit long enough for the complete section reflow to settle.

## Expanded view contract

Expanded mode shows children of visible first-level nodes.

- child-of-node display is approximately 50% normal node size
- smaller font
- approximately 70% opacity
- maximum 3 columns × 2 visible rows per first-level node
- overflow is scrollable
- no filter UI in the small expanded-child scroller
- do not reserve descendant space for a first-level node with no children
- when multiple nodes share a row, row height equals the maximum descendant-space requirement among nodes in that row
- sibling-node expanded descendants inherit the configured `siblingRelativeSize` multiplier (30%–85%)

## Gates and connectors

Every visible node has four gates.

Gate semantics:

- hollow = no connected relationships
- filled = relationships exist, even if related nodes are hidden/filtered
- displayed count = relationships represented under the active filter/visibility rules

Connectors must originate/terminate at the relevant gates, never at node centers.

Connector styles:

- `straight`
- `curved` (user-facing wording; do not call it Bézier in settings)

Curved connectors should be broad/flatter rather than excessively bowed.

Relationship labels should sit over a small break in the connector line. Suppress generic labels such as parent, child, friend, challenger and file-tree; show meaningful custom ontology labels.

Optional arrowheads indicate link direction and must preserve legacy direction/reversal semantics.

## Hover behavior

Do not cause the graph to flash as the pointer crosses dense scenes.

- relationship/node/gate highlight delay target: **750 ms**
- hover preview only while Ctrl (Windows/Linux) or Cmd (macOS) is held
- modifier-assisted preview should appear immediately
- normal hover without Ctrl/Cmd must not trigger Obsidian page preview

Use context-appropriate cursors: nodes/links that can be activated use pointer-style feedback; empty canvas uses panning/grab feedback.

## Navigation and state

- clicking a node activates/navigates it
- folders and tags are navigable and may be central
- graph navigation can be synchronized to an active or pinned Obsidian leaf, or decoupled
- if an active file leaf exists at K-Plex startup, use it as center
- otherwise restore the last displayed node
- persist Past nodes/history across sessions
- add command palette action to open K-Plex in a pop-out window
- pinned nodes are persistent bookmarks/quick-access entries displayed beneath the main toolbar

## Search behavior

Search dropdown must support full keyboard interaction:

- Up/Down moves selection
- Enter activates selection
- Escape closes
- clicking the Plex/outside the dropdown closes
- opening a new query after a previous search must be immediate

Use a wide dropdown and do not allow long paths/titles to make results unreadable.


## Display names

Node display names are presentation metadata, not graph identity. `nameFields` is an ordered comma-separated list of frontmatter properties. When `renderAlias`/frontmatter display names are enabled, `titleFor()` uses the first non-empty text value (or first non-empty item from a list) from those fields, then falls back to the file name. Default `nameFields` is `aliases`, preserving historical behavior exactly; configurations such as `title, aliases, backup_names` must fall back in order. Changing display-name settings must refresh labels/search terms without re-indexing semantic graph data. Search should retain the file name and aliases as alternate terms even when another property is the visible title.

## Panning and zoom

- wheel scrolling zooms without requiring another mouse button
- dragging empty Plex space may pan with left, middle/wheel, or right mouse buttons
- context menus must not accidentally fire during right-drag panning
- zoom is hard-capped at 300%; do not expose a separate max-zoom setting

## Drag-connect and relinking

### Add-relationship composer

The create-relationship path uses one React modal and the shared `FuzzySearchInput`; do not reintroduce a second note picker. Both suggesters are closed until the user actually types. Selecting an existing note is a two-step flow: retain the selection, allow ontology edits, then commit with the fixed-width Link action. New-note buttons stay disabled unless the filename is valid and globally unused. The create actions are Markdown, Excalidraw when available, and Placeholder (an unresolved relationship with no file); Placeholder never becomes the Ctrl/Cmd+Enter default. The last successfully used Markdown/Excalidraw create button becomes the next primary CTA and the Ctrl/Cmd+Enter action; fall back to Markdown when Excalidraw is unavailable. Command-palette actions for Parent/Child/Friend/Challenger are gated by a running K-Plex view and are intended to be user-hotkeyable. New Markdown/Excalidraw files resolve their parent through the public `app.fileManager.getNewFileParent(sourcePath, newFilePath?)` API using the relationship origin as `sourcePath`. A newly created Placeholder is deliberately pathless: write/store only its unresolved note name and assign a real folder/path only when the ghost is materialized. Ontology input is fuzzy-searchable, remembers one default per gate role, and a newly typed ontology field becomes a real hierarchy item in settings before the relationship is written.

Dragging outward from a folder node's **child gate** is the primary file-creation gesture for folders. Releasing that drag creates a new Markdown/Excalidraw file directly inside the selected physical folder, publishes only its normal file-tree membership, and does not write a note-to-note ontology/link. Reuse `newNodeDefaultType` for the primary button and Ctrl/Cmd+Enter. Never offer Placeholder in this folder-creation flow because an unresolved note cannot have a physical folder. A secondary drop-on-folder shortcut may exist, but it must not replace or obscure the folder-child-gate gesture.

Double-clicking an unresolved/ghost note materializes that existing semantic node; it must not trigger a full-vault rebuild. If the unresolved link explicitly contains a folder, honor it. Otherwise resolve the new-note folder independently from every semantic parent via `getNewFileParent`; collapse identical folders, create immediately when there is one unambiguous folder and Excalidraw is unavailable, and show a location chooser when parents resolve to different folders. When Excalidraw is available, the same materialization dialog also offers Markdown vs Excalidraw, and Ctrl/Cmd+Enter uses the shared `newNodeDefaultType`. After creation, remap/promote the virtual GraphPage and its relationship evidence to the returned TFile path in memory rather than leaving a duplicate ghost or rebuilding the graph.

File deletion is also incremental. A deleted Markdown `TFile` must dematerialize its existing `GraphPage` into a ghost in place. When a file disappears through an external Vault action, preserve that ghost as the active center instead of treating the event as a K-Plex navigation command. An explicit K-Plex delete action removes the deleted path from navigation history immediately and, if it was central, navigates through the remaining history as specified in the Deletion navigation invariant below. Preserve the ghost even when property cleanup removes its last inbound declaration while it is still needed as the active center. An explicit later placeholder deletion may remove an unreferenced center and then navigate to a sensible fallback. Remove only evidence owned by the deleted file plus its folder/tag membership; preserve inbound declarations from other notes. Physical folder/tag relation-map entries must disappear immediately with their evidence. Ignore trailing `metadataCache.changed` notifications whose `TFile` is no longer the current Vault file, and never let a metadata-only backlog containing only vanished paths escalate into a full-vault rebuild. The node context menu may delete Markdown-backed or ghost nodes, but property references are the only references K-Plex removes automatically. Markdown-body links and inline ontology declarations remain user-authored evidence and must be surfaced in a navigation/evidence review modal rather than rewritten, including plain inline-field values that do not appear in `CachedMetadata.links`. A ghost may be removed from the graph only after no declarations still reference it. The first delete action explains this behavior and records the user's `confirmFileDelete` preference. Every real-file confirmation must also offer an “I understand, don't ask me again” choice that can disable future file-delete prompts immediately; placeholder-only deletion does not need repeated confirmation after the first-use explanation. Real file deletion must use Obsidian's public trash/file-manager API rather than filesystem operations.

If a persisted/active center is genuinely absent after startup reconciliation, walk `navigationHistory` from newest to oldest and select the first path still present in the graph. Only after all history entries fail may K-Plex fall back to `folder:/`. Do not substitute an arbitrary first Markdown file. Seed recent history entries into startup snapshot preview paths so this fallback can resolve promptly.

Connector unlinking is provenance-safe. Direct deletion is allowed only when one frontmatter ontology declaration is the sole editable source of the visible pair; Obsidian `resolvedLinks` entries whose source positions fall inside that same YAML property block (including indented list items below the property key) are mirrored cache views, not additional user declarations. Obsidian may omit source positions for YAML links in `CachedMetadata.links`; in that case, verify that the relevant property block itself resolves to the same target before treating the generic resolved-link evidence as a mirror. Any body link, link in another property, inline ontology, or other competing evidence must fall back to Connection details. Markdown-backed source rows provide line navigation via ephemeral state; reuse the owning K-Plex Sidecar when available, otherwise open a Markdown tab, without mutating unrelated document leaves or persisted scroll state.

### Extension-resolution compatibility

Some upgraded development checkouts may still contain both `src/ui/NewRelatedNoteModal.ts` and the older `.tsx` path. The `.ts` module is canonical; `esbuild.config.mjs` deliberately resolves `.ts` before `.tsx` so the production bundle matches TypeScript. Keep the two files behaviorally synchronized until the legacy `.tsx` copy can be removed from a full-repository distribution.

### Create relationship from gate

Dragging from a gate and releasing on empty Plex opens an Obsidian `Modal`.

The modal provides:

- Markdown target selection
- ontology/document-property dropdown appropriate to the relationship direction
- check/confirm and X/cancel Lucide buttons via `getIcon()`

Only targets not already connected in the relevant way are selectable.

Default relation by gate:

- top → parent
- bottom → child
- left → friend
- right → challenger

Dropping onto a specific target gate must also influence the proposed relationship direction.

If origin is Markdown, write YAML relationship on origin.

If origin is non-Markdown, target must be Markdown and write the inverse relationship on target.

While drag-connecting, only nodes already connected through the origin gate should be visually de-emphasized as invalid/redundant; other valid targets remain available.

Disable drag-linking to/from folder and tag nodes.

### Move an existing direct neighbor

Dragging a node directly connected to the center across top/bottom/left/right regions may propose changing its relationship class.

When rewriting relationship data, prefer adding/updating document properties because document-property relationships override duplicate body relationships.

## Styling

A single configurable **Style property** (default `Note type`) drives K-Plex property-value node styles. Keep legacy `primaryTagField` persisted for ExcaliBrain migration compatibility, but do not present it as a second active K-Plex selector. Explicit property-value styles must override generic central/sibling appearance for the fields they set, and style editors should suggest existing values/tags plus live Lucide icon IDs rather than relying on free-text-only entry.

Continue supporting legacy tag-specific style compatibility where feasible.

## Settings UX

Use grouped declarative settings pages with user-intent names such as:

- Plex behavior
- Ontology
- Visual styling
- Sidecar
- Compatibility

Keep **Visual styling** shallow: Canvas & labels lives on the landing page, while Node styling (including node images and property-value styles) and Link styling (including relationship-specific connector overrides) are dedicated declarative subpages. Keep **Ontology** semantic: relationship fields, editor suggester, and discovered/unassigned fields are separate jobs; styling does not belong there.

Large style/discovery collections use responsive searchable managers with progressive disclosure rather than embedded long lists. Manager modals must fit the viewport without horizontal scrollbars or nested scroll regions. Descriptions must explain user intent, never implementation history or development rationale. Nonfunctional migration-only fields should not be exposed as active settings.

Do not surface UI-owned synchronization state such as the current note-tab link mode in the Settings tab. It may be persisted for restoration, but it is controlled from the live K-Plex UI and may change dynamically as sidecar/link actions occur.

The root K-Plex settings page begins with a compact centered row:

`Buy me a coffee | Read Sketch Your Mind | Join SYM Community`

with links:

- https://ko-fi.com/zsolt
- https://community.sketch-your-mind.com/sym
- https://community.sketch-your-mind.com

Do not place these links inside the Plex behavior page and do not add explanatory marketing copy around them.

Use sliders where a bounded numeric range is meaningful (zone heights, gate radius, etc.) and show the current value next to the slider.

## Naming

Use **K-Plex**, not ExcaliBrain, in user-facing UI and docs except when explicitly discussing compatibility/migration.

Use **nodes**, not "thoughts", in user-facing terminology. Legacy internal names can be migrated gradually, but new UI strings should say nodes.


## Graph predicates and lenses

K-Plex graph filtering is a **presentation-layer operation over the currently materialized Plex**, not a whole-vault graph query engine. Keep the persistent semantic index focused on data required to build and explain the Plex.

- `src/lens/GraphPredicate.ts` owns the declarative predicate AST, dependency discovery and safe evaluator. Do not use `eval`, `Function`, DataviewJS or any other runtime code execution for filters/lenses.
- The supported predicate contexts are deliberately distinct: `node`, `edge`, `evidence`, `note`, `file` and `this` (the current center thought). Do not collapse evidence provenance into resolved-edge fields.
- `note.<property>` must be resolved lazily from Obsidian `MetadataCache`. Do not copy arbitrary frontmatter values into `GraphPage`, `GraphState`, snapshots or IndexedDB just to support lenses.
- K-Plex-native graph properties should be read from the existing graph model. File metadata should come from `TFile`/cached graph fields. Relationship provenance should come from `RelationEvidence`.
- Predicate dependency discovery must remain explicit. Metadata-dependent predicate refreshes are UI/presentation refreshes and must not call `rebuildIndex()` or otherwise couple lens evaluation to semantic graph reconstruction. Adding/changing an arbitrary non-semantic frontmatter property may update discovered-field bookkeeping, but must not emit a semantic graph change.
- Folder/tag visibility is presentation-only. Keep folder topology sourced from `Vault` and tag topology sourced from `MetadataCache` available independently of `showFolderNodes` / `showTagNodes`; those settings must not enter `computeIndexSettingsSignature`, `REINDEX_SETTING_KEYS`, or any toolbar/settings rebuild path.
- The current Keyword / Tag / Note type controls are a compatibility UI over the generic predicate engine. New filtering behavior should compile to the same predicate representation rather than adding another ad-hoc matcher in React.
- Named Graph Lenses reuse this same selector engine. `src/lens/GraphPredicateParser.ts` parses the safe Bases-inspired text syntax into the AST; never execute user-authored scripts. `src/lens/GraphLensSimple.ts` is the user-facing visual-builder adapter: it compiles friendly field/operator/value rows to the same AST-compatible expression syntax and round-trips the common expression subset back into Simple view. Do not create a second evaluator for the visual builder. Active include lenses are unioned, active exclude lenses subtract, style lenses never affect visibility, and with no include lens the current Plex is the baseline.
- The normal lens UX is the Simple builder; Code view is advanced/optional. Relationship-property filtering must be presented as **Relationship property** (`edge.definition`), not as the internal Plex role (`edge.role`). Relevant finite values should be selects and relationship/property/tag values should use suggestions where practical. A saved lens must have an obvious independent enable/disable control.
- Invalid but parseable selectors must fail safely rather than hiding the Plex. In particular, a selector with no graph/property dependency is not a valid lens, and invalid finite edge values such as `edge.role == "working-on"` should produce an explanatory validation error.
- Lens definitions are persisted in `settings.graphLenses` and synchronize across mounted K-Plex views without notifying/rebuilding the semantic index. Style effects live on the same lens definition and selector; matching node styles overlay the rendered node style, while matching relationship/evidence styles overlay the rendered connector style. Later matching style lenses override only the appearance fields they set. Styling must never mutate `GraphIndex` semantics or accept arbitrary CSS.
- While a visibility Quick Filter / Graph Lens is active, gate-count UI may display `shown/total`. This is presentation state only and must not mutate `GraphIndex` gate semantics. Style-only lenses do not activate filtered gate counts.
- The filter panel owns a **Keep layout / Reflow** presentation choice. Keep layout hides nonmatches in place. Reflow rebuilds the currently materialized structured Plex from the surviving relationships so positions compact naturally; it must not deepen traversal or alter semantic index state.
- The toolbar lens/filter popover is portalled above the Obsidian workspace panes so it cannot be occluded by an adjacent companion sidecar. Keep the portal strictly UI-only; graph gesture/event ownership stays inside the K-Plex root.
- Lens evaluation is scoped to the visible/current Plex (normally tens to a few hundred candidate nodes). Do not add whole-vault scans or arbitrary-depth traversal as a side effect of lens evaluation.

## Code-scanner compatibility

Treat the Obsidian code scanner as a release gate, not as post-release cleanup. In particular:

- Do not assign static styles with `element.style.foo = ...`; prefer semantic CSS classes, `setCssStyles`, or `setCssProps`. Dynamic per-frame transforms may remain direct only when they are genuinely runtime values and the scanner accepts them.
- Use Obsidian DOM helpers (`createEl`, `createDiv`, `createSpan`, etc.) rather than `document.createElement` / `ownerDocument.createElement`.
- When a control already exposes an accessible/styled tooltip through `aria-label`, never add `title` as a second tooltip source.
- Do not use `!important` or broad `:has(...)` selectors in plugin CSS. Prefer explicit state classes and normal selector specificity.
- Command names shown in the Command Palette must not repeat the plugin name; Obsidian already displays the owning plugin.
- Keep strict TypeScript boundaries: avoid unnecessary assertions, `any`-typed member access/calls/arguments, and unsafe `JSON.parse`/IndexedDB assignments. Narrow `unknown` with type guards instead.
- Never reject a Promise with a raw unknown value; normalize it to an `Error`.
- Do not leave empty catch blocks, unused catch parameters, unused imports/locals, or stale instrumentation counters. A best-effort catch should either return explicitly or contain a meaningful compatibility/cleanup action.
- Avoid regex constructs that trigger scanner lint (unnecessary escapes or literal control-character ranges). Prefer small string/code-point helpers when validation is clearer than a regex.
- Before packaging a release, re-check for dead imports/variables and for scanner regressions that were fixed in earlier rounds; do not reintroduce them while adding adjacent features.

## Testing expectations

Before returning a patch:

1. run `npm test` when indexing, ontology, provenance, folders, tags, URLs, Date properties or relationship classification changed
2. build against the actual repository and Obsidian typings
3. test startup with an existing K-Plex data file
4. test a large-vault path if the change affects indexing/search/rendering
5. verify Markdown, folder, tag, attachment, URL and virtual-node navigation as relevant
6. verify linked/unlinked leaf behavior for navigation changes
7. verify no new high-volume console logging
8. package only requested modified/new files when the user asks for a patch ZIP

### Relationship explanation navigation and sidecars
- Provenance navigation from **Connection details** should reuse the sidecar belonging to the K-Plex view that opened the dialog when that sidecar is currently available. Do not pick an arbitrary global sidecar or unrelated recent tab.
- Opening provenance in a pinned sidecar is a temporary inspection action; suppress the corresponding sidecar-to-Plex follow event so the graph center does not unexpectedly change.
- Keep the provenance location ephemeral (`setViewState(..., { line })`) and force Markdown source for `.excalidraw.md` evidence.

## Connection editing and optimistic creation

- Connection provenance remains sourced from Markdown/frontmatter evidence. Expose one **Connection details** context-menu entry rather than parallel Explain/Edge Properties commands; do not create a parallel edge-note database.
- Connection details is a read/inspect surface plus an additive ontology-property action. Do not implement a custom inline Markdown editor. **Go to source** hands editing to the real native Obsidian Markdown leaf/editor. Never present this action as changing or overriding an existing ontology source: if explicit ontology already exists, label it **Add ontology…** and preserve every existing body/frontmatter source; if the connection is only inferred, label it **Specify ontology…**.
- Multiple evidence records that resolve to the same physical source occurrence must render once in Connection details, with their evidence signals combined. Generic resolved-link ranges may overlap a narrower frontmatter/body ontology range; in that case prefer the specific ontology range and merge the generic evidence into that block rather than displaying duplicate source text.
- Each displayed source block must show its own evidence evaluation (role + Defined/Inferred, and overridden state where relevant) so users can see how the individual occurrence participates in resolution.
- Connector hover summaries are delayed/on-demand UI. Do not precompute provenance tooltip strings for every rendered edge; resolve the concise evidence summary only after the pointer has remained on a connector for about one second.
- A frontmatter ontology move removes only the selected target from the old property, preserves all other values, then appends to/creates the destination property. Newly created document properties must be inserted at the bottom of the YAML property order.
- K-Plex-created notes are materialized optimistically in the live GraphIndex, together with the new relationship, before awaiting MetadataCache. Persist the Markdown change immediately afterward and let the ordinary incremental metadata path reconcile/enrich the optimistic page. On persistence failure, roll back the optimistic relationship.
- The Create New Node **Open for editing** preference centers the new node and opens the actual file in the native Sidecar source editor after creation.

## Node imagery

- Node imagery is presentation metadata, not semantic graph state. Never add thumbnail/image values or decoded image data to persisted `GraphPage` snapshots.
- Resolve imagery only for currently materialized Plex nodes. Frontmatter comes from MetadataCache; Dataview-style inline fields may reuse the existing parsed-body cache/IndexedDB. Cache only lightweight `{src,path,mode}` results keyed by file mtime/settings.
- Images must load lazily and must not enlarge node layout boxes by default. Image hover previews are a UI concern only and must not invalidate graph layout/indexing.
- A link whose every Obsidian resolved-link occurrence is accounted for solely by the configured thumbnail/node-image fields is presentation-only and must not create an inferred graph child. If another prose/ontology occurrence exists, preserve normal graph semantics.
- Image attachment display is configurable independently from Markdown note image properties.

## Sidecar edge-control invariant

The native companion Sidecar's primary open/close control lives on the K-Plex edge corresponding to the remembered sidecar position (left/right/above/below). It remains present while the Sidecar is closed so reopening does not require returning to the toolbar. The Sidecar itself remains a native Obsidian WorkspaceLeaf.

## K-Plex toolbar interaction invariants

- Toolbar visibility controls for Markdown notes, attachments, folders, tags, URLs, placeholders,
  inferred relationships and aliases live in the Filter / Graph Lenses popover. Do not reintroduce
  a second expanded-toolbar overflow state for these controls.
- The quick filter is a one-condition Graph Lens and must use the same field/operator semantics as
  named lenses, including explicit negative operators such as `does not contain` and `does not have tag`.
- Node ordering is presentation-only. Changing sort order must invalidate/render relation views but
  must not rebuild the semantic index.
- Every K-Plex button inside a `data-kplex-tooltip-scope` participates in delegated long-press
  tooltips. A completed long press must consume the synthesized click so the button action does not run.

## Deletion navigation invariant

Deleting a node is an immediate navigation-history operation even when the deleted Markdown endpoint
survives semantically as a ghost. Remove the deleted path from history before asynchronous relationship
cleanup. If the deleted node is central, navigate newest-to-oldest through the remaining valid history;
if none exists, navigate to `folder:/`. Do not wait for metadata/index reconciliation to move focus.
