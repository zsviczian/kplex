# Contributing to K-Plex

Thanks for helping improve K-Plex.

K-Plex is a deterministic spatial knowledge graph for Obsidian, not a generic force-directed network. Contributions should preserve its semantic layout, legacy data-migration guarantees and large-vault responsiveness.

## Setup

Use Node.js **22.22.2** for acceptance checks. If your environment cannot provide it or install dependencies, record the limitation and return runnable checks for the validation agent; results from another runtime do not replace the required lane.

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

`npm run check:architecture` checks migrated-layer imports and its negative fixtures. `npm run check:core` type-checks the host-free core with no DOM/Node ambient types and runs clean-process core contract tests. `npm run lint:obsidian` runs the official Obsidian ESLint plugin. `npm run verify` runs the architecture and core lanes, Obsidian lint, all non-host tests, then the production build. No Obsidian installation is needed for these commands. The C03 button DOM test needs a local Chrome/Chromium-family executable; set `KPLEX_TEST_BROWSER` to its absolute path if discovery fails. The full/incremental semantic engine is portable, while legacy host binding and much of the application/UI remain migration seams; see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and the checkpoint ledger in [Refactor plan.md](Refactor%20plan.md). Review every Obsidian lint warning and avoid introducing new ones. L00 established the English catalog; L01 migrates legacy copy and enforces known presentation sinks with negative fixtures.

SI3 source storage has two focused lanes: `npm run test:sources` exercises production codecs, storage-degraded facts, host acquisition and GraphBuilder integration; `npm run test:sources:browser` exercises real Chromium IndexedDB, including a fresh browser-process restart. Both are included in `npm test`. The same `KPLEX_TEST_BROWSER` setting selects Chromium (`KPLEX_CHROMIUM` is also accepted). Missing or administratively blocked browser access fails that lane, rather than substituting a mock. See [the source repository contract](docs/SOURCE_REPOSITORY.md) for current Review limitations.

For a desktop integration smoke test, enable **Settings → General → Command line interface** in Obsidian and use a disposable development vault with K-Plex installed. Set all three variables to that vault's actual identity and absolute paths:

```bash
export KPLEX_TEST_VAULT_NAME=kplex-test
export KPLEX_TEST_VAULT_PATH=/absolute/path/to/kplex-test
export KPLEX_TEST_CONFIG_DIR=/absolute/path/to/kplex-test/.obsidian
npm run verify:obsidian
```

The strict host lane checks the CLI-reported vault path before changing anything, runs `verify`, then disables K-Plex, copies this build's three installable artifacts into the test vault, checks hashes, enables it and asserts a rendered K-Plex view with no captured JavaScript errors. It preserves plugin `data.json` and creates no bundle backup. It writes `report.json` in a printed temporary directory, or `KPLEX_HOST_REPORT_DIR` if set. A missing CLI, wrong vault, failed build or failed assertion returns nonzero. The portable `verify` lane never invokes Obsidian. CLI commands target the named vault explicitly; do not use a personal/default vault for test deployment.

For live plugin/index diagnostics, CLI fault injection, reload-safe references and evidence capture, see [Obsidian runtime testing](docs/OBSIDIAN_RUNTIME_TESTING.md).

After staging the verified build, `npm run verify:obsidian:si4` uses the same three disposable-vault variables to run native settings acceptance. It checks installed artifact hashes, waits for actual startup/source readiness, then tests saved ontology/inference/image policies, rendered gates/labels, siblings, search/provenance and stale writes with zero body reads/parses/acquisitions or full builds. The default requires at least 20,015 Markdown files; `KPLEX_SI4_REQUIRED_FILES=0` selects a small-vault harness check. It restores settings, owned fixtures, wrappers, demand and renderer throttling; `si4-native.json` records actual results in `KPLEX_HOST_REPORT_DIR`. This functional diagnostic does not replace SI5 foreground, restart, popout or physical-device acceptance.

To verify ExcaliBrain settings migration, use the same three explicitly configured disposable-vault variables and run `npm run verify:obsidian:migration`. This strict lane runs full verification and stages the exact build, selects `tests/fixtures/excalibrain-migration/data.json` through the real import dialog, compares complete compatible settings/ontology/style dictionaries and persisted data, navigates the rendered Node styling and Link styling pages, checks all imported style entries and their editors, preserves alpha/order on an unchanged legacy-style save, renders temporary styled notes/links, and checks import survival after plugin reload. It writes `migration-report.json` beside the normal host report. It restores pre-test settings, removes only test-owned notes and releases its temporary controller independently of assertions; cleanup failures fail the run. The vault must be a playground, not a personal vault, and existing test paths are rejected.

The migration test uses the installed host's owning settings document because Settings may open in a popout. It closes the nearest plugin modal, not an enclosing settings window, and on macOS focuses the selected renderer before initialization waits. It does not change background-throttling policy or claim performance/device parity. Missing Obsidian/CLI or failed host assertions are failures; the fixture-based migration/resolver/manager-model tests remain part of `npm test` without Obsidian. The scripted file-input event exercises the actual importer but does not automate the operating system's file picker.

To create a reproducible large synthetic input for performance work, run `npm run fixture:large -- --out /absolute/path/to/a/new-test-vault-folder --files 20000`. The generator copies the small indexing compatibility fixture and adds 20,000 deterministic notes. About 10% of all Markdown files are exactly 950,000 bytes, mixing very long paragraphs, large fenced code and dense real links; ordinary notes add shared note hubs and URLs. A default fixture is about 1.9 GB of Markdown, so allow adequate disk space and index time. The generator refuses to replace an existing folder. Check it with `npm run fixture:large -- --verify /absolute/path/to/that-folder`. Keep generated vault contents out of Git and use the same verified fixture and settings for before/after runs. Manifest link/declaration counts describe source input; measure actual K-Plex index counts separately.

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

### Current architecture and feature placement

**C14 is accepted and refactoring is paused.** The production full and incremental paths now share a portable semantic engine. Obsidian remains the production host; coordination, storage, search implementation and much of the graph-to-UI/application path still have named legacy seams. Do not start C15–C26 just to deliver a feature or claim those planned extractions already exist. Read [AGENTS.md](AGENTS.md), [architecture](docs/ARCHITECTURE.md) and the definitive [refactor tracker](Refactor%20plan.md) before changing ownership.

| Change | Extend the current owner |
| --- | --- |
| Markdown/property grammar | `src/core/parser/metadata.ts`; host merge/resolution remains in adapters/legacy facades. |
| A relationship source | Obsidian source collectors supply normalized facts; `src/core/graph/compiler.ts`, `patch.ts`, `evidence.ts` and `resolver.ts` own compilation, precedence and meaning. |
| Graph reads or search | Narrow contracts in `src/core/graph/read.ts`; GraphIndex still implements production search and publication. Map only returned data, not the whole vault. |
| Lens or predicate behavior | Existing `src/core/plex/predicate.ts`, `predicateParser.ts` and `lens.ts`; lazy field/pair providers, one AST/evaluator. |
| A new view mode | Projection chooses semantic nodes/relationships, layout maps roles to positions and physical gates, rendering consumes that result. Keep current modes/defaults and sibling visibility separate from graph semantics. |
| Shared UI behavior | Existing `ActionButton`, `FloatingLayer`, `FuzzySuggester` and collection helpers under `src/ui/components/`; caller supplies icons, text, results and actions. Feature content lives in `src/ui/features/` where migrated. |
| Vault/workspace/native effects | Obsidian adapters and existing composition in `src/main.ts`/native shells. A new port is defined in its consuming layer, not by passing the plugin to portable code. |
| Copy, shortcuts or device routing | `src/lang/`, `src/core/plex/shortcutPresentation.ts` and `PresentationEnvironment`; host adapters supply language/device/input/capability facts. |

Portable core/application/lang cannot import Obsidian, legacy host modules, DOM/browser globals, storage or Node APIs; inject clock/yield/lifetime and other required capabilities. Portable React mechanics/features can use standard DOM in their owning document/window, but not Obsidian APIs or global plugin discovery. Shared components contain no graph policy. Adapter-to-core imports are allowed; core-to-adapter imports, cycles and transitive host leaks fail architecture checks. Preserve canonical owners and finite compatibility-facade caller lists rather than creating duplicate classifiers, parsers, evaluators or schedulers.

Treat `NodeId` as exact opaque identity; never derive path, case rules, kind or materialization from it. Semantic and physical paths are separate optional facets. Readonly views can share revision-scoped metadata; they are not frozen snapshots. Normalized source batches retain exact target/occurrence/ownership facts and at most 256 records, with terminal rejection/finality/revision fences. Stream dense input: a record-count cap does not bound payload bytes or justify a second whole-vault DTO array. Preserve provenance multiplicity, incoming declarations and shared tag/URL lifetimes. See [normalized source contracts](docs/NORMALIZED_SOURCE_CONTRACT.md).

### Mixed agent development

Most implementation and substantial trace analysis is assigned to an **offline development agent without Obsidian CLI access**. The **main validation agent with CLI and full dependencies** prepares work, supplies live reproduction/debug evidence, reviews and fixes returned changes, performs applicable native validation and manages the repository. Limited dependency/network access is recorded separately from absence of Obsidian; `npm run verify` itself needs no running Obsidian.

Follow [the mixed agent workflow](docs/AGENT_WORKFLOW.md). `HANDOFF.md` is the single transient bidirectional assignment/results document: preserve its standing header and overwrite its body for each transfer, never archive it or use it as an ongoing log. Each assignment includes base/diff identity, scope and acceptance criteria; an investigation can include minimized debug traces and requested analysis. The offline agent returns uncommitted changes, actual tests, failures and pending host checks. The main agent independently validates the exact returned code, fixes defects and reports automated results and up to three prioritized manual checks, or states none are needed.

Missing host/device checks remain pending; a skip is not a pass. Any maintainer-accepted limitation must be explicit. Once required validation is confirmed, repository actions follow the maintainer's authorization; an offline implementation return does not authorize a commit, PR, merge or release. Refactor outcomes persist in `Refactor plan.md`; feature evidence belongs in the issue/PR or a reviewed validation report, with architecture decisions linked from the plan when relevant. No new assignment automatically resumes the paused refactor.

### Localization and environment rules

Every new or changed plugin-owned user-facing string must use the English catalog and typed translator: labels, commands, help, menus, placeholders, tooltips, ARIA names, notifications and visible errors. Console diagnostics stay English. Preserve stable keys/IDs and user-authored vault content; use named parameters and the established plural/fallback rules. Translations remain outside this scope. The L01 presentation-sink gate runs in `npm test`; review dynamic labels and interpolation values in addition to its AST checks. See [localization](docs/LOCALIZATION.md).

Use `PresentationEnvironment` rather than new direct Platform/global checks in portable code. Desktop/tablet/phone, OS/key convention, hardware keyboard, pointer/touch and host-action availability are independent facts; unknown keyboard presence does not mean absent. Format catalog shortcut parameters from the actual available binding (Command/Option on macOS, Control/Alt on Windows where applicable), omit unknown/unavailable hints and preserve touch instructions. Desktop emulation tests layout/routing; physical touch, keyboard delivery and platform lifecycle still need their own evidence.

### Relationship semantics are spatial semantics

The core layout is deterministic:

- parents: north/top
- children: south/bottom
- friends / previous: west/left
- challengers / next: east/right
- siblings: separate peripheral region

Changing a relationship's semantic role or precedence is a graph-contract change. A deliberately selected rotated/mindmap layout can map the same roles to different positions and physical gates without changing graph meaning; preserve the existing views' spatial defaults and test the new layout contract independently.

### Preserve legacy compatibility

ExcaliBrain compatibility is limited to graph ontology and graph/node/link appearance. Use `importExcaliBrainGraphSettings` for first-run and manual imports; use `migrateAndMergeSettings` for K-Plex's own persisted data. Do not import plugin CSS, commands/hotkeys, navigation, workspace/editor preferences or scheduling. K-Plex commands are registered once with canonical IDs; old shortcuts must be reassigned rather than aliased.

Before changing settings, ontology or graph reconciliation:

1. review the portable compiler/evidence/resolver owners, normalized source collectors, `src/settings.ts`, `src/index/GraphBuilder.ts` and `src/index/GraphIndex.ts`; legacy evidence/resolver files are compatibility facades
2. assume users may have legacy ExcaliBrain data/settings
3. prefer additive settings with defaults
4. add explicit migration logic for renamed/reshaped data
5. preserve explicit-over-inferred relationship precedence
6. keep old ontology field names meaningful
7. preserve K-Plex's deliberate rule that conflicting frontmatter ontology overrides body ontology for the same declaring note/target, while retaining the overridden evidence for explainability

Folder and tag nodes may be central, but structural folder/tag connections are not editable with drag-linking. Dragging outward from a folder's child gate is the specific file-creation exception: create a real child file and its file-tree membership, not a note-to-note ontology link.

### Keep the UI on top of normalized graph APIs

React components should not independently classify relationships or rescan the vault.

- adapters collect host facts; portable compiler/evidence/resolver modules own graph meaning
- GraphBuilder acquires bodies and privately stages/binds results; GraphIndex owns publication, current search and affected-cache refresh
- settings compatibility stays in `src/settings.ts`; existing snapshot/body-cache orchestration stays behind its current index/IndexedDB seams
- Obsidian lifecycle/workspace integration remains host-owned; define narrow consuming-layer ports for new migrated use cases
- React renders normalized read results and invokes supplied actions; arbitrary note properties and relationship evidence stay lazy, field- and pair-scoped respectively
- filtering/styles/order/camera/fold state never trigger a semantic rebuild, whole-vault property scan or persisted frontmatter/image expansion

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
- atomic neutral source heads as cold-build progress; preserve read compatibility for legacy graph checkpoints, never resume old semantic results under changed policy, and do not restore the retired full-graph progress writer
- skipped periodic refresh when nothing changed

Incremental preparation stays private and copy-on-write with canonical page identity preserved. C14b publication synchronously applies graph/evidence, hot field cache and fingerprint, refreshes affected caches/search, then notifies per committed file before another await. The prepared-state callback is exactly once and expires when its publisher returns or throws. Semantic no-ops retain zero semantic events. Cancellation preserves committed files and pending current work; it does not automatically request a full rebuild.

Fence awaited work with generation/demand and captured path/mtime/size/current Vault file identity; full-build revisions are keyed by file identity. Supersession, rename and deletion cannot publish stale state or resurrect files. Preserve optimistic creation and incremental create/materialize/dematerialize/rename/deletion behavior. Keep restored previews non-authoritative, hydration progress/watchdog/late-work cancellation intact and demand loss resumable; never clear dirty work before publication. See [indexing architecture](docs/INDEXING_ARCHITECTURE.md).

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
- while the native central-node editor reserves an oversized center rectangle, vertically center friend/challenger and sibling strips beside that rectangle; the normal compact center keeps the standard bottom-aligned lateral layout
- siblings use the configured `siblingRelativeSize` (30%–85%, default 85%) and sit slightly higher
- sibling expanded descendants inherit the same configured multiplier
- density uses the same tight node interior padding at every setting

When overflow requires a scroll zone, first-level zones expose a funnel/name filter. Filtering must repack matching nodes rather than hiding nonmatches in place.


## Mobile and workspace-surface checks

- Use the centralized `readObsidianPresentationEnvironment()` boundary and its pure adapter-local classifier. It preserves available runtime phone/tablet facts before a shortest-side fallback; do not add direct Platform checks in portable code or duplicate classification elsewhere.
- Phone command palette: only the K-Plex sidepanel opener is offered among surface-opening commands. Generic/ribbon open also routes to sidepanel.
- Tablet: normal graph tab and sidepanel are both available; pop-out is desktop-only.
- A touch tap is handled from the pointer stream directly because preventDefault/pan ownership can suppress synthesized click events. Verify tap navigation, one-finger pan, two-finger pinch and long-press context menus together.
- Sidecar is a real adjacent, K-Plex-owned Obsidian `WorkspaceLeaf`; never adopt an arbitrary pinned/recent/user tab because it is nearby. During startup only re-associate eligible restored remembered-side/content ownership; do not manufacture a split. Moving the managed document away releases ownership and leaves it open. Closing K-Plex leaves the companion document open; Sidecar fold hides only the K-Plex tab group and leaves the recovery control on the companion edge. Preserve combined workspace allocation on moves and keep Sidecar unavailable inside the sidepanel. See the detailed ownership/restoration invariants in `AGENTS.md`.

## Section-outline checks

- central Markdown expansion is runtime-only; no heading may enter `GraphIndex`
- nested heading levels create parent/child outline structure
- section nodes and outline connectors are visually distinct from semantic graph relations; structural connectors use vertical-spine + horizontal L branches that enter the child at its left-center edge, never the semantic top gate; density 4 should collapse these branches/gaps aggressively rather than merely scaling the ordinary graph spacing
- Markdown central nodes expose the same lower-left fold square even before section expansion; non-Markdown central nodes do not
- delayed metadata/index updates may move/add nodes but must preserve graph camera and bounded-list scroll positions; only explicit navigation/initial display may recenter
- relationship creation uses the shared fuzzy-search component, with both suggesters closed until typing; selecting an existing note leaves ontology editable and commits through a stable-width Link action. New-note actions require a valid globally-unused filename; the last successfully used Markdown/available Excalidraw action supplies the primary shortcut (Markdown fallback, never Placeholder). User-hotkeyable Add parent/child/friend/challenger commands require a running K-Plex view; new files honor `FileManager.getNewFileParent(...)`, and custom ontology values persist as hierarchy fields/defaults. Format visible shortcut text through the environment/catalog seam.
- connector unlinking remains provenance-safe: direct removal is limited to a sole editable frontmatter ontology declaration plus mirrored resolved-link entries inside its YAML block (including lists). A positionless generic cache entry is a mirror only after verifying the block resolves to the same target. Other body/property/inline or competing evidence opens **Connection details**. Its source navigation uses ephemeral line state, prefers the originating view's owned Sidecar, and never recenters the Plex or mutates unrelated leaves; fall back to a Markdown tab.
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

Use **K-Plex** in user-facing strings, `Kplex` for named types/components, and `kplex` for runtime CSS/SVG/command namespaces. Update selector producers, DOM queries, browser/host tests and current documentation together. Retain legacy identifiers only at documented data-migration boundaries; never rename saved user content or fabricate new terminology in historical validation evidence. The namespace regression gate is `tests/terminology.test.mjs`; it rejects legacy CSS and command aliases. `tests/index-diagnostics-contract.test.mjs` checks the report-facing GraphIndex methods and reproduces the two TS2339 errors when those declarations are removed. This focused type test does not replace the full build.

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
- actual automated commands, runtime/dependency versions, outcomes and coverage limits; distinguish portable, browser, native and physical-device evidence
- at most three prioritized outstanding manual tests with workflow/target/expected result and why automation cannot cover them, or state that none are needed
- confirmation that `npm run verify` and the real build succeed, plus applicable exact-build host checks by the validation agent; unavailable checks remain named and pending
- architecture ownership, invalidation/lifetime effects, compatibility/migration decisions, cleanup and relevant contract documentation

Keep accepted goldens, timing bounds, import checks and lint rules strict. Intentional product behavior changes require an explained expected-output difference and appropriate regression coverage, not blanket fixture regeneration. Documentation-only contributions use content/link/whitespace checks; do not report unrun runtime suites as evidence. Host validation is tied to exact source/artifact identities and must be rerun when affected code changes.

If the requested deliverable is a patch ZIP, include **only modified/new files** in their repository-relative paths.

### Explain relationship navigation
When changing provenance navigation, preserve host-view ownership: an open sidecar for that K-Plex view is preferred over creating another tab, and using the sidecar for inspection must not implicitly recenter K-Plex.

### SI5 native restart validation

After exact-build staging, run `npm run verify:obsidian:si5` with the same three disposable test-vault variables and an explicit `KPLEX_HOST_REPORT_DIR`. The default scenario creates owned notes, saves an ontology change, reloads, removes/corrupts optional graph acceleration, damages one requested source chunk and simulates an offline edit. Missing/corrupt graph cases also assert global virtual/URL search, aliases and inline type suggestions outside requested scopes. Its small-fixture setup may seed complete acceleration after an earlier fault run; measured restarts start on the newly loaded instance. It restores settings, wrapped Vault methods, owned notes and original throttling. Back up the test vault/cache before fault injection; never use a personal vault. Run native drivers serially; do not overlap manual CLI probes with their polling.

Set `KPLEX_SI5_RESTART_ONLY=true` for three warm restarts of an existing large fixture; it does not seed a fixture build. The report records named hardware, exact hashes, readiness, source/build counters, renderer visibility, heap samples and total CLI/restart elapsed time; `progress.json` identifies the active phase between completed probes. These are functional restart measurements, not actual-paint or physical-device acceptance. The [SI5 report](docs/validation/settings-independent-indexing-si5-progress-2026-10-03.md) and [device procedure](docs/validation/settings-independent-indexing-si5-device-checklist.md) retain historical validation procedures; [final SI5 acceptance](docs/validation/settings-independent-indexing-si5-acceptance-2026-10-04.md) records completed feature acceptance and its measurement limits.

Keep Obsidian in the foreground throughout comparable runs. The driver shows the application before
focusing the test window, retains its original background throttling, and samples document visibility,
document/window focus and renderer JS heap during readiness. Its `foreground.comparable` field is
false if any sample is hidden, unfocused or has throttling disabled; exclude that run from performance
comparisons. Large restart-only cases also compare a bounded cursor digest of all selected source
heads, so zero Markdown reads cannot conceal source restamping. Native functional completion and
sampled heap are separate from paint latency and process/device peak memory.

`KPLEX_SI5_RESTART_RUNS=1` or `2` can replace an excluded run without repeating valid runs. The
default remains three; acceptance still needs three comparable runs of the same condition/build.


### SI5 high-node fixture

The existing 20k/large-file fixture and a high-node fixture exercise different workloads. Generate
an isolated high-node fixture with `node scripts/testing/generate-high-node-vault.mjs --out /absolute/new/disposable-directory`
and verify it with `node scripts/testing/generate-high-node-vault.mjs --verify /absolute/new/disposable-directory`.
Generation refuses an existing output. The default supplies 20,000 Markdown files, 80,000 distinct
body-linked placeholders, 8,000 distinct URLs, 259,000 source link occurrences, 160 dormant property
names and a hub referenced by 19,999 owners. These are deterministic **source-input counts**;
measure actual graph nodes/evidence in Obsidian, including structural nodes/cache mirrors. Fixture
verification is not startup, latency, memory or device acceptance. Keep it separate from the existing
large-vault cold/warm baseline; never merge its files into a personal vault or compare profiles as one
condition. `--files` permits small harness fixtures while preserving the proportions.

### Bounded SI5 warm-start attribution

The maintainer's 2026-10-04 scope accepts the existing extreme-vault cold behavior and records the
20k-contributor hub `decode-budget` result as a stress limit outside the critical path. Do not pursue
bounded canonical projections, memory-limit changes or further cold optimization for this closeout.

After verification and exact-build staging, run the dedicated production-path probe serially:

```bash
PATH=/Users/zsviczian/.local/share/fnm/node-versions/v22.22.2/installation/bin:$PATH \
KPLEX_TEST_VAULT_NAME=kplex-test \
KPLEX_TEST_VAULT_PATH=/Users/zsviczian/Obsidian/kplex-test \
KPLEX_TEST_CONFIG_DIR=/Users/zsviczian/Obsidian/kplex-test/.obsidian \
KPLEX_HOST_REPORT_DIR=/private/tmp/kplex-si5-warm-start \
KPLEX_SI5_WARM_CENTER=Welcome.md \
KPLEX_SI5_RESTART_RUNS=3 \
caffeinate -d -i node scripts/testing/obsidian/startup.mjs
```

`caffeinate` applies only while the child runs on macOS; it prevents display/system idle sleep and
changes neither renderer throttling nor timing bounds. Require a settled existing cache and actual
foreground throughout. The optional existing center temporarily avoids the excluded hub; its setup waits
for both the page and the view navigation listener before the existing navigation notification, then verifies the actual selected center. The driver
restores the exact original `data.json`, verifies the enabled list and removes all wrappers/controllers.
The native test opts in to `window.kplexStartupDiagnosticsEnabled` before enable and restores its
previous value. Normal operation retains phase progress but no detailed owner/timing trace. Private
owner identities are discarded on strict readiness or unload; reports contain counts and overlap only.

Phase timestamps are relative to `onload`; native elapsed timestamps start immediately before
plugin disable/enable. Hydration and source lanes overlap and must not be summed. IDB counters count
requests issued, not disk bytes or transaction latency; paged head counters separately count returned
owners. Physical revision comparisons use existing `TFile.stat` values; adapter stat I/O is a separate
counter. Wrapped host/IDB calls count global operations in the time window, temporally attributed to
the current phase; they are not exclusive caller or latency attribution. DOM-center availability is observed at 100 ms intervals, not actual paint or interaction latency.
Requested-scope publication and source authority have separate milestones from strict graph/search
readiness. Percentages use the captured pass denominator and are floored; unknown totals show activity
and actual record counts. Progress notifications are throttled to 250 ms without adding timers or
advancing graph revisions. Each pass resets progress only at its own phase boundary.

The dedicated startup probe retains the 30-second individual CLI process timeout, but has no outer
readiness deadline following the maintainer's 2026-10-04 instruction. Obsidian runs independently;
CLI polling occurs every five seconds and reconnects ten seconds after a failed read. A lost CLI
response neither reloads the plugin nor cancels the native measurement. The production hydration
watchdog is unchanged. Failed focus samples still exclude the trial from timing comparisons.

Read the passive report at any time without starting new work:

```bash
obsidian vault=kplex-test eval 'code=JSON.stringify(app.plugins.plugins["k-plex"].getStartupDiagnostics())'
```

Its current phase/progress, completed phase intervals, owner overlap and aggregate counters stay in
plugin memory for that enable lifetime. The native probe adds actual operation counts to the same
report; no console logging or diagnostic persistence is required. A fresh plugin enable starts a fresh
trace. Completed timings freeze at strict-ready, while live status can subsequently change, including
after restoring a previously unsupported synthetic center. The final pilot had no actual CLI
disconnect; retry behavior is implemented, not fault-injection validated. Initial submission and final
cleanup still require a responsive CLI. See the [measured warm report](docs/validation/settings-independent-indexing-si5-warm-start-2026-10-04.md).
Retain CLI errors separately from terminal plugin failure. Report measurements and a minimal
proposed correction before implementing any warm-start optimization.


The first [minimal warm correction and native retest](docs/validation/settings-independent-indexing-si5-minimal-warm-correction-2026-10-04.md)
combine dependency upgrade/host comparison while retaining the later freshness pass. The driver also
counts existing local-dependency selections/settlements and repository yields through passive forwarding.
Do not treat file mtime as dependency authority: physical statistics already govern source reuse;
local derivatives require exact source revision/sequence and repair/version validation, and other-file
resolution changes can update source facts without changing the referring file's mtime. Report one
candidate's actual work/timing deltas before extending the correction.


The next [clean dependency-selection correction and native retest](docs/validation/settings-independent-indexing-si5-clean-selection-2026-10-04.md)
was developed after checkpointing the prior fix at `8cd10b7d6746d607f8214ad192670a0b9a370778`. It removes
120,090 IDB reads across a clean 20,015-note restart while retaining source-head/repair/freshness
checks. Its median is 82.149 seconds versus 80.137 seconds immediately before; no overall latency
improvement is demonstrated. Keep each independently validated correction in its own commit before
adding another behavior change. Posting batching is validated separately below; scheduling remains unchanged.

When staging, distinguish configured enablement from a loaded plugin instance. After native
`app.plugins.disablePlugin()`, CLI `plugin:enable` can report “already enabled” while
`app.plugins.plugins["k-plex"]` is absent. Use matched native disable/enable operations with retained
completion/error state and bounded polls; verify the actual instance and installed artifact hashes.
Preserve and byte-compare the original settings and community-plugin enablement list. A configured-state
mismatch is a staging issue, not a slow-start timeout; neither requires resetting Obsidian configuration.


The [bounded posting-read correction and native results](docs/validation/settings-independent-indexing-si5-posting-batching-2026-10-04.md)
use one count-limited primary-key range request per existing byte/record-bounded batch, with every
posting/digest/frame and source-head/lease/freshness/cancellation check retained. Three foreground
restarts pass at 66.170/65.324/74.123 seconds (median 66.170, prior 82.149); posting requests fall from
484,199 point reads to 20,027 bounded range reads. Full verify passes 199 browser tests and the actual
production build. These are sequential observations, not randomized paired or physical-device tests.
Existing yields remain; measure their exclusive wait cost before changing scheduling. Preserve a clean
checkpoint between independently validated corrections.

Optional `KPLEX_SI5_MEASURE_WAITS=true` enables native-test-only passive promise observation of
repository yields, transactions and digests. It preserves original promises/results and adds bounded
histograms and disjoint interval membership; callbacks/aggregation have unisolated overhead.
Transaction durations include callback/commit/microtask latency, not exclusive disk time; the
unwrapped remainder includes other work/waits, not CPU alone. Probe starts after enable returns;
snapshot-cache transactions are not included. See [wait attribution and proposed correction](docs/validation/settings-independent-indexing-si5-wait-attribution-2026-10-04.md).
Measured yields do not justify scheduling changes. Keep diagnostic-driver and subsequent UX/behavior
changes in separate commits. No next optimization until the measured proposal is reviewed.

Startup progress labels distinguish note metadata, cached-note validation and repeated reconciliation
with **Processing pending changes**. Metadata comparison is **Validating note metadata**, initial
source reconciliation is **Verifying cached notes**, and requested semantic preparation is
**Applying current ontology & settings**. Diagnostic progress includes the one-based lane/phase `pass`;
counts restart at the actual pass boundary. This also works without detailed opt-in. The
[controlled retry validation](docs/validation/settings-independent-indexing-si5-progress-labels-2026-10-04.md)
records the exact test-only MetadataCache miss recipe, failed untimed background setup and successful
foreground retry. Do not use fault-injected or browser-overlapping elapsed times as warm baselines.

The maintainer-approved [merged dependency/head selection and exact retest](docs/validation/settings-independent-indexing-si5-merged-selection-2026-10-04.md)
follows the independent phase-label checkpoint `b48643c62fb5a21d105f6f5db38c4025223ca785`. Clean checks
select owner/state/journal/head atomically, then honor overlays, intervening source activation,
cancellation and unload. Repair and legacy upgrade retain rereads. Compare with the same optional
wait probe enabled, keeping the test renderer in the foreground and all other test workloads stopped.
Head requests and dependency checks are distinct from transaction boundaries: consolidation does
not remove their validation or the later freshness pass. The [closeout audit](docs/validation/settings-independent-indexing-si5-closeout-audit-2026-10-04.md)
inventories current settings routes, retired writers and deliberately retained compatibility seams.
The maintainer reports successful physical iPad and Android tests; the [device checklist](docs/validation/settings-independent-indexing-si5-device-checklist.md) retains the procedure and qualitative acceptance record. [SI5 is closed](docs/validation/settings-independent-indexing-si5-acceptance-2026-10-04.md); no further automatic optimization or refactor work is queued.
