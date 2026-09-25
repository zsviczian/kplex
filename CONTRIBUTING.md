# Contributing to K-Plex

Thanks for helping improve K-Plex.

K-Plex is a deterministic spatial knowledge graph for Obsidian, not a generic force-directed network. Contributions should preserve its semantic layout, ExcaliBrain compatibility model and large-vault responsiveness.

## Setup

Use Node.js **22.22.2** where possible.

```bash
npm i
npm run verify
```

For watch-mode development:

```bash
npm run dev
```

Build output must appear in `dist/` and contain:

- `dist/main.js`
- `dist/manifest.json`
- `dist/styles.css`

The plugin ID is `k-plex`.

Do not consider a change complete until it builds against the real installed Obsidian typings. A local stub harness is useful for fast checks but is not authoritative.

`npm run check:architecture` checks migrated-layer imports and its negative fixtures. `npm run verify` runs that lane, all non-host tests, then the production build. No Obsidian installation is needed for these commands. The current legacy graph/UI is not yet portable; see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and the checkpoint ledger in [Refactor plan.md](Refactor%20plan.md). A separate CLI-driven test-vault lane is planned for C02b.

## Documentation

`README.md` is the public, end-user-facing introduction and usage guide. Keep build commands, internal architecture, performance invariants and implementation notes out of the README.

- Put contributor workflow and development requirements in `CONTRIBUTING.md`.
- Put durable technical/design documentation in `docs/`.
- Put end-user feature guides in `docs/` when a README section would become too detailed.
- Release notes should describe user-visible changes and workflows rather than internal implementation details.
- Keep the first-start indexing notice and product screenshots near the top of the README.

The detailed end-user lens guide lives in `docs/GRAPH_LENSES.md`.

## Before changing Obsidian integration

Read the current Obsidian API/type declarations first.

Do not assume an API exists because it sounds plausible. In particular, use public typed helpers such as `getFileCache()` / `getAllTags()` rather than inventing metadata methods.

UI conventions:

- use Obsidian `Modal` for centered modal workflows
- use Obsidian's declarative settings API for settings pages
- use Lucide icons through `getIcon()` for plugin UI icons
- prefer typed workspace APIs for leaves/windows/pop-outs
- treat Moment as an Obsidian host global: production `src/` code must not runtime-import `moment` or call `import { moment } from "obsidian"`; use `window.moment` through narrow local typing, and install a test double on `window` in Node tests

## Design principles

### Relationship semantics are spatial semantics

The core layout is deterministic:

- parents: north/top
- children: south/bottom
- friends / previous: west/left
- challengers / next: east/right
- siblings: separate peripheral region

A contribution that changes where a relationship appears is a graph-contract change, not merely a visual tweak.

### Preserve legacy compatibility

Before changing settings, ontology or graph reconciliation:

1. review `src/settings.ts`, `src/index/GraphBuilder.ts`, `src/index/RelationEvidence.ts`, `src/index/RelationResolver.ts` and `src/index/GraphIndex.ts`
2. assume users may have legacy ExcaliBrain data/settings
3. prefer additive settings with defaults
4. add explicit migration logic for renamed/reshaped data
5. preserve explicit-over-inferred relationship precedence
6. keep old ontology field names meaningful
7. preserve K-Plex's deliberate rule that conflicting frontmatter ontology overrides body ontology for the same declaring note/target, while retaining the overridden evidence for explainability

Folder and tag nodes may be central, but structural folder/tag connections are not editable with drag-linking.

### Keep the UI on top of normalized graph APIs

React components should not independently classify relationships or rescan the vault.

- evidence collection belongs in `GraphBuilder`; precedence/classification belongs in `RelationResolver`; graph queries belong in `GraphIndex`
- indexing/relationship logic belongs in `src/index/`
- persistence/migration belongs in `src/settings.ts`
- Obsidian lifecycle/workspace integration belongs in `src/main.ts`
- React components render and interact with normalized data

## Performance rules

K-Plex is expected to work in vaults with tens of thousands of files and over 100,000 graph/search entries.

Performance regressions are considered functional bugs.

### Avoid full rebuild storms

Do not rebuild on every startup `vault:create`/metadata event.

Changes that touch indexing should preserve:

- IndexedDB as the durable index/parser cache; do not put large index payloads in local storage. Bump the IndexedDB database version whenever stores/indexes change so existing vault databases receive the migration.
- on large iOS cold starts, body-cache prewarming must happen in bounded transactional batches before the full graph is retained; keep it cancellable and resumable
- declaration-compact evidence storage (one original declaration; inverse perspectives derived on demand)
- rejecting structurally stale/half-bound snapshots before publication, so a replacement build does not coexist with a misleading full cached graph
- `npm test` compatibility-fixture coverage (`tests/fixtures/excalibrain-indexing`)
- startup metadata stabilization
- event coalescing/debouncing
- dirty-index checks
- path-indexed evidence updates for single-file edits; do not scan the complete evidence store when provenance already identifies the touched path
- time-budgeted cooperative yielding on large collectors/resolvers; do not yield every note on iOS
- deferred/coalesced snapshot writes, cancelled when the final K-Plex view closes
- skipped periodic refresh when nothing changed

### Reuse caches

Do not reread/reparse every Markdown body on every startup.

The persistent body metadata cache should be reused when the file modification time is unchanged.

When adding new expensive derived data, ask whether it can be:

- cached per node
- cached per relationship view
- pre-normalized once for search
- persisted safely between sessions

### Do not repeat expensive work inside render loops

Bad patterns include:

- calling `titleFor()` repeatedly inside a sort comparator
- scanning the full graph for every node render
- compiling user scripts per node
- rebuilding the graph because camera/history/UI state changed

Compute expensive values once and pass/cache them.

### Worker use

CPU-heavy Markdown text parsing may be offloaded to a Web Worker.

Do not call Obsidian APIs from the worker. Keep vault/metadata access and graph mutation on the main thread.

### Search

Search should use pre-normalized data and ordered-subsequence fuzzy matching with ranking roughly:

1. exact
2. prefix
3. full substring
4. fuzzy subsequence

Reuse the previous query's matching candidate set for longer query prefixes when possible.

### Debug logging

Do not leave temporary indexing/performance instrumentation enabled in production.

If you need to profile a regression, gate detailed string-only logs behind a development/debug flag and remove/disable them before merging.

## Current Plex layout requirements

Default settings:

| Setting | Default | Range / notes |
| --- | ---: | --- |
| Parent columns | 2 | max 2 |
| Child columns | 5 | max 7 |
| Parent height | 300 px | own scroll region |
| Friend/challenger height | 350 px | shared setting for left/right |
| Child height | 400 px | own scroll region |
| Sibling height | 250 px | separate region |
| Density | 2 | changes spacing/truncation, not padding; max 4 |
| Max nodes per zone | 100 | configurable up to 300 |

Layout rules:

- left/right primary zones should be symmetrical
- siblings are the deliberate asymmetry
- lateral and sibling regions may extend into unused parent vertical space
- lateral/sibling bottoms must not overlap the child region
- leave a small gap before children
- when a friend/challenger strip fits within its lateral band, bottom-align it and let it grow upward; sparse lists must not be vertically centered or stranded near the top
- overflowing lateral lists remain scrollable; if filtering reduces an overflowed friend/challenger zone to a result set that fits, bottom-align the filtered results too
- siblings render at 85% normal scale and sit slightly higher
- sibling expanded descendants inherit the 0.85 multiplier
- density uses the same tight node interior padding at every setting

When overflow requires a scroll zone, first-level zones expose a funnel/name filter. Filtering must repack matching nodes rather than hiding nonmatches in place.


## Mobile and workspace-surface checks

- Do not use undocumented `Platform.isPhone` / `Platform.isTablet`; use `Platform.isMobile` plus shortest-screen-side classification.
- Phone command palette: only the K-Plex sidepanel opener is offered among surface-opening commands. Generic/ribbon open also routes to sidepanel.
- Tablet: normal graph tab and sidepanel are both available; pop-out is desktop-only.
- A touch tap is handled from the pointer stream directly because preventDefault/pan ownership can suppress synthesized click events. Verify tap navigation, one-finger pan, two-finger pinch and long-press context menus together.
- Sidecar is a real adjacent Obsidian `WorkspaceLeaf`; never mount a faux workspace leaf inside React. Sidecar controls are derived from **pinned-tab adjacency**, not only from whether K-Plex originally created the leaf. Moving an attached pinned tab away must not clear the pin. Closing K-Plex must leave the companion document leaf open. Sidecar fold hides only the K-Plex tab group and must leave an unfold control on the companion group's relevant edge.

## Section-outline checks

- central Markdown expansion is runtime-only; no heading may enter `GraphIndex`
- nested heading levels create parent/child outline structure
- section nodes and outline connectors are visually distinct from semantic graph relations; structural connectors use vertical-spine + horizontal L branches that enter the child at its left-center edge, never the semantic top gate; density 4 should collapse these branches/gaps aggressively rather than merely scaling the ordinary graph spacing
- Markdown central nodes expose the same lower-left fold square even before section expansion; non-Markdown central nodes do not
- delayed metadata/index updates may move/add nodes but must preserve graph camera and bounded-list scroll positions; only explicit navigation/initial display may recenter
- relationship creation uses the shared fuzzy-search component, with both suggesters closed until typing; selecting an existing note must leave ontology editable and commit through a stable-width Link action; new-note actions require a valid globally-unused filename, Markdown is the default Ctrl/Cmd+Enter action, user-hotkeyable Add parent/child/friend/challenger commands are active only while K-Plex is running, new files honor Obsidian `FileManager.getNewFileParent(...)`, and custom ontology values become persisted hierarchy fields/defaults
- connector unlinking must remain provenance-safe: direct removal is limited to a single frontmatter ontology declaration plus mirrored resolved-link cache entries whose positions are inside that same YAML property block (including block-list items); because Obsidian may omit source positions for YAML links, a positionless generic resolved-link entry may count as the same declaration only after the YAML property block itself is verified to resolve to that target; body links, links in other properties, or other ambiguous cases route through Explain relationship, whose Markdown-backed evidence rows navigate in a new Markdown tab using ephemeral line state
- fold/unfold is view state only
- folded descendants' semantic relations project upward to the visible folded ancestor
- explanation provenance still identifies the actual hidden declaring section

## Expanded view

Expanded mode shows children beneath first-level nodes.

Preserve these rules:

- ~50% child node size
- ~70% opacity
- smaller font
- 3 columns × 2 visible rows max per first-level node
- overflow scrolls; no filter in these small scrollers
- nodes with no children reserve no expanded space
- row height is based on the largest descendant cluster in the row

## Gates, lines and labels

- gates sit outside node bounds
- hollow gate = no relationships
- filled gate = relationships exist even when hidden/filtered
- without a global filter, the count near a gate shows the normal visible relationship count; with a Quick Filter / Graph Lens active, use `shown/total` (for example `0/12`) so filtering does not erase relationship context
- connectors originate at the correct gate
- connector setting is **Straight** or **Curved** in user-facing UI
- curved lines should be broad and relatively flat
- arrowheads may express direction
- custom ontology labels may be shown over a small break in the line
- suppress generic labels such as parent/child/friend/challenger/file-tree

Hover behavior:

- relationship/node highlight delay target: **750 ms**
- normal hover does not open note preview
- Ctrl/Cmd + hover opens Obsidian preview immediately

## Navigation and history

Test all navigation changes against these expectations:

- Markdown, folder and tag nodes can become central
- clicking nodes navigates
- background drag pans and uses a panning cursor
- activatable nodes use a pointer-like cursor
- wheel zoom works without another mouse button
- left/middle/right drag on empty Plex may pan
- K-Plex can synchronize to a linked/pinned Obsidian leaf or remain decoupled
- startup center = active file leaf when available, otherwise last displayed node
- Past nodes/history persists across restarts
- pinned nodes are persistent quick-access bookmarks beneath the toolbar
- command palette includes opening K-Plex in a pop-out window

## Search interaction checklist

When touching search, verify:

- focus opens instantly
- Up/Down visibly moves selected result
- Enter activates the selection
- Escape closes the result list
- clicking the Plex/outside search closes it
- typing after a previous completed search remains responsive
- large paths/titles remain readable
- fuzzy ordered-subsequence matches work and rank below stronger matches

## Relationship editing checklist

### New relationship from a gate

Verify:

- modal is an Obsidian `Modal`
- default relationship matches source gate
- target gate can refine/invert the offered direction
- already-connected targets are excluded
- folder/tag targets are disabled
- Markdown origin writes YAML on origin
- non-Markdown origin requires Markdown target and writes inverse relation on target
- confirm/cancel icons use `getIcon()`

### Relink an existing direct neighbor

Verify moving a direct neighbor across top/bottom/left/right regions proposes the corresponding relation change.

Write/update frontmatter rather than trying to rewrite arbitrary body text. Frontmatter relationship values intentionally take precedence.

## Settings UX checklist

Settings should be grouped into pages (Graph, Ontology, Compatibility, Appearance, etc.).

The root K-Plex settings page begins with a compact centered link row:

[Buy me a coffee](https://ko-fi.com/zsolt) | [Read Sketch Your Mind](https://community.sketch-your-mind.com/sym) | [Join SYM Community](https://community.sketch-your-mind.com)

Keep that row concise; do not add extra explanatory text around it.

For bounded numeric settings, prefer a slider plus current-value display over an oversized number field.

## Naming and copy

Use **K-Plex** in user-facing strings.

Use **node** rather than **thought** in new user-facing UI/copy. "ExcaliBrain" should appear only when discussing legacy compatibility/migration.

Use **Curved**, not **Bézier**, in settings text.

## Manual regression test matrix

Before submitting a significant change, test the relevant subset of:

- cold start in a small vault
- warm start with a persisted IndexedDB semantic snapshot and per-file parser cache
- large vault (20k+ files), including an iOS/tablet cold-start pass where practical
- Markdown central node
- folder central node
- tag central node
- attachment / URL / virtual nodes
- parent/child/friend/challenger/sibling layouts
- scroll-zone filters and repacking
- global quick filter plus named Graph Lenses: node/edge/evidence scopes, visual Simple builder and advanced Code view, obvious on/off toggles, relationship-property suggestions, multiple include lenses (union), excludes, style effects using the same selectors, Keep/Reflow filtered layout modes, lazy frontmatter refresh, persistence across K-Plex views, and safe handling of invalid selectors
- empty-canvas click/touch clears transient connector/node/gate highlights
- expanded view and overflow
- straight and curved connectors
- arrow direction
- gate counts/fill state
- note-tab synchronization: unlinked, linked to most recent tab, pinned to one fixed tab, plus both one-shot sync directions
- companion sidecar open/move/detach behavior, including adjacency/control visibility for left, right, above and below splits
- mobile sidepanel first-open behavior
- touch tap, one-finger pan, long-press menu and two-finger pinch over both bare canvas and nodes
- pop-out window
- persistent history
- pinned nodes
- search keyboard controls
- Ctrl/Cmd hover preview
- drag-create relationship
- drag-relink direct neighbor
- legacy ExcaliBrain settings import

## Pull requests / patches

Include:

- what changed
- whether legacy compatibility is affected
- whether indexing/search/rendering performance is affected
- manual test steps
- confirmation that `npm run build` succeeds

If the requested deliverable is a patch ZIP, include **only modified/new files** in their repository-relative paths.

### Explain relationship navigation
When changing provenance navigation, preserve host-view ownership: an open sidecar for that K-Plex view is preferred over creating another tab, and using the sidecar for inspection must not implicitly recenter K-Plex.
