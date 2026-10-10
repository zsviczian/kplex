# AGENTS.md

## Mission

Develop **K-Plex (Knowledge Plex)** as a dedicated React application inside Obsidian. Preserve relationship semantics, ontology and graph/node/link styling when migrating data from its predecessor, [ExcaliBrain](https://github.com/zsviczian/excalibrain). K-Plex is an independent, standalone solution with additional features and no runtime dependency on the legacy plugin, Excalidraw or Dataview.

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

Treat Obsidian's code scanner as part of the compatibility contract. New or touched code must avoid known scanner warnings rather than relying on suppressions.

The repository installs the official `eslint-plugin-obsidianmd` in `eslint.config.mjs`. Run `npm run lint:obsidian`; `npm run verify` includes it. Existing sentence-case warnings are visible legacy work, not permission to add more. Fix touched code's scanner errors and review warnings instead of disabling the recommended rules.

- Prefer TypeScript's inferred/public API type when it is already correct. Do not add `as SomeType` assertions that do not narrow or change the expression type.
- Do not union literal/string-enum types with the broad `string` primitive (for example `TokenKind | string`); `string` subsumes the narrower string members. Use `string`, a genuinely closed union, or separate parameters/overloads as appropriate.
- Do not use `globalThis` in plugin/UI code. For host globals use `window` or the owning/active window. For DOM created in pop-outs, derive the window from `element.ownerDocument.defaultView` when the operation is window-specific.
- Do not call bare viewport/window scheduling APIs such as `requestAnimationFrame()`. Use the correct owning window (`element.ownerDocument.defaultView ?? window`) and call `viewWindow.requestAnimationFrame(...)`; use the same window for cancellation.
- Remove unused imports, types and locals as part of every change. Do not leave dead type-only imports after refactors.
- Prefer broadly supported CSS primitives within K-Plex's minimum Obsidian version. In grid/flex layouts use `gap` instead of `column-gap` when either expresses the same intent; avoid CSS features the Obsidian scanner reports as only partially supported.
- Prefer Obsidian's own semantic CSS classes and CSS variables wherever practical (`--text-*`, `--background-*`, `--interactive-*`, `--color-*`, tab/modal variables, etc.) instead of hard-coded UI colors or surfaces. K-Plex must inherit community themes naturally; plugin-specific CSS should describe structure/state, while Obsidian theme variables provide the visual tokens.
- Temporary attention/highlight states should be implemented by adding/removing a semantic CSS class and styling that class in `styles.css` with Obsidian theme variables. Do not inject one-off inline colors/borders for these states.
- Do not silence scanner findings with `!important`, blanket casts, or compatibility suppressions unless the underlying issue cannot be solved cleanly and the exception is documented here.
- Beware of the post build code in `esbuild.config.mjs` to remove `createElement('Script')` fron the final build as this triggers Obsidian code scanner failure. createElement('Script') originates from react DOM, which contains support for rendering/hoisting `<script>` resources. K-Plex never renders script elements, and community-plugin review rejects bundles that can create them and remove those release from community plugins store. Keep React for the UI, but make those unused internal branches inert in the shipped bundle.

## Obsidian API discipline

This project has already lost time to invented/assumed APIs. Do not guess Obsidian methods.

Rules:

1. Check the installed Obsidian type declarations and current official documentation before using an unfamiliar API.
  - Obsidian CSS: https://docs.obsidian.md/Reference/CSS+variables/CSS+variables
  - Obsidian developer documentation: https://docs.obsidian.md/Home
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

1. Preserve ontology semantics when migrating legacy ExcaliBrain data unless a deliberate migration/change is documented.
2. Explicit document-property relationships take precedence over inferred/body relationships.
3. Preserve parent / child / left-friend / right-friend / previous / next reconciliation behavior.
4. Preserve support for Markdown notes, attachments, folders, tags, URLs and virtual/unresolved nodes.
5. Preserve legacy style inheritance as closely as possible without relying on Excalidraw rendering.
6. Import only legacy graph ontology and graph/node/link appearance, not plugin CSS, commands, hotkeys, navigation history, workspace/editor state or scheduling. Preserve existing K-Plex preferences when importing; loading K-Plex's own data remains separate from foreign-data import.
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

**Current architecture refactoring milestone: C14 accepted; structural refactoring is paused.** Feature work may proceed within the established boundaries. Do not start C15–C26 or retire compatibility facades without an explicitly scoped task. Obsidian remains the only production host; a portable semantic engine does not mean the application and all UI are host-independent. The current ownership and retained seams are documented in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and tracked in [Refactor plan.md](Refactor%20plan.md).

| Responsibility | Current owner and boundary |
| --- | --- |
| Markdown/property grammar and parser DTOs | `src/core/parser/metadata.ts`; inject clock/yield/cancellation. `src/index/fieldParser.ts` retains host merge/link-resolution/runtime compatibility. |
| Normalized identities and source facts | `src/core/graph/model.ts`, `source.ts` and `settings.ts`; plain values with exact opaque IDs and independent semantic/file paths. |
| Evidence, precedence and relationship classification | `src/core/graph/evidence.ts`, `relations.ts` and `resolver.ts`; legacy index modules delegate/re-export. |
| Full and per-source semantic compilation | `src/core/graph/compiler.ts` and `patch.ts`; both production paths use the shared semantic owner. |
| Host facts and file resolution | `src/adapters/obsidian/*SourceCollector.ts`; `GraphBuilder` retains bounded body/cache acquisition, private staging and canonical host binding. |
| Live graph publication, search and caches | `src/index/GraphIndex.ts`; synchronous per-file graph/evidence/fingerprint/cache/search application and notification. Coordination/storage/search extraction remains C15–C17. |
| Predicates, lens evaluation and environment presentation | `src/core/plex/`; lazy property/evidence capabilities and explicit host environment facts. Legacy lens adapters compose the current host. |
| Shared interaction mechanics and migrated feature content | `src/ui/components/`, `src/ui/features/`; caller supplies icons, labels, data and actions. Legacy `src/ui/` still contains host-bound consumers. |
| Settings, native workspace and lifecycle | `src/settings.ts`, `src/main.ts` and Obsidian adapters; preserve persisted compatibility and existing lifecycle/demand ownership. |

New application use cases and pure projection/layout strategies follow the dependency rules in the architecture guide; those folders do not imply the later extractions are complete. Define a narrow semantic port in the consuming layer and implement host effects in its adapter. Do not pass an App, plugin, complete settings object, TFile or mutable graph repository into portable code.

### Rules for feature changes after C14

- Extend the existing parser/compiler/resolver/predicate owners and their contract tests. Never add a second relationship classifier, Markdown grammar, lens evaluator, index scheduler or whole-vault DTO model in UI/adapters.
- Source adapters report facts, exact targets, counts and genuine occurrence provenance; core decides roles, direction, precedence and materialization meaning. Preserve declaration multiplicity, incoming contributions and shared tag/URL lifetimes. Normalized batches are capped at 256 records; that is not a byte or total-memory bound. Stream dense input and retain byte-limited host reads.
- Treat `NodeId` as opaque and case-sensitive. Do not parse it into a path or infer kind/materialization from it. Optional semantic and physical paths remain distinct; the legacy compatibility publication refuses pathless graphs. Readonly views share some metadata and are revision-scoped, not frozen snapshots; reacquire on publication/presentation change.
- Preserve injected clock/yield/lifetime contracts, terminal source-read rejection, finality checks and canonical page identity. Graph/evidence preparation remains private and copy-on-write; never await after partially mutating live published state.
- Preserve C14b's synchronous per-file boundary: apply prepared graph/evidence, hot field cache and fingerprint, invalidate affected caches/search, then notify before another await. Apply callbacks are exactly once, synchronous and expire on publisher return/throw. Semantic no-ops emit no semantic event. Cancellation retains earlier commits and only pending current work; it is not an automatic full rebuild.
- After awaited source work, fence generation/demand plus captured path/mtime/size/current Vault identity. Rename/delete/supersession cannot publish stale data or resurrect materialized files. Keep full-build captured revisions keyed by file identity and preserve optimistic creation during reconciliation.
- Arbitrary note properties and imagery stay lazy and outside persisted semantic state. Keep property reads field-scoped and evidence reads pair-scoped. Presentation-only filtering/styles/sorting/camera/folds do not rebuild semantics or scan the whole vault.
- New condensed/expanded/rotated/mindmap modes belong to projection and layout policy: projection chooses semantic nodes/relationships, layout maps roles to positions and physical gates, rendering consumes the result. Sibling visibility is a projection choice. Preserve current defaults; do not change semantic roles or the index to implement a visual arrangement.
- Compatibility facades keep a finite caller inventory and named retirement checkpoint. Add capabilities for a real consumer; do not enlarge legacy coupling or bypass an import guard to save an extraction. Persisted schema/settings/command changes require an explicit compatibility decision and migration where needed.

### Component reuse for new UI and Plex interactions

- Prefer implementing new UI features as focused, composable components. This applies to user forms, fields, buttons and dialogs, and to Plex elements such as nodes, gates, connectors, overlays and other interaction surfaces. Keep feature content separate from its native Obsidian shell and host effects.
- **Reuse within K-Plex is a key requirement for delivered code logic:** shared behavior drives consistency and reduces feature drift between surfaces and agent sessions. Inspect existing components, hooks, helpers and domain owners before adding code; reuse or extend the appropriate owner rather than copying interaction, validation, rendering or action logic into another consumer.
- When a new behavior has multiple consumers, extract the common logic or component and have those consumers use it. Keep generic interaction mechanics in `src/ui/components/`, domain-specific presentation in `src/ui/features/` where migrated, semantic policy in core and host effects in adapters/composition. Components receive narrow data and action capabilities; they must not acquire plugin state or duplicate graph semantics.
- Keep reusable contracts small and tied to actual project needs. Prefer a focused component for a new feature, but do not force forms with different validation/lifecycle policies into one abstraction or build a speculative component framework. Shared controls must preserve localization, environment-aware hints, accessibility, owning-document behavior and resource cleanup.

### Coding standard: TSDoc and meaningful comments

- Every module file must have a meaningful TSDoc header (`/** ... */`) describing its purpose, architectural layer/responsibility, important contracts and dependencies, and any lifecycle or side-effect ownership. Place it before the module's imports/declarations; update it when ownership or behavior changes.
- Every function must have meaningful TSDoc at its declaration/definition, including private helpers, methods, constructors, React component functions, hooks and callbacks. Explain its purpose and observable behavior; document meaningful parameter/return semantics, side effects, errors, async/cancellation/revision behavior and important invariants where applicable. Use `@param`, `@returns`, `@throws` and `@remarks` when they add useful contract information, rather than repeating TypeScript types.
- Add explanatory comments for non-obvious algorithms, compatibility workarounds, publication/await boundaries, resource cleanup and performance constraints. Explain why the code exists and what must remain true; do not add boilerplate, restate each line or leave comments describing an earlier implementation. Keep documentation in English and update it with the code.
- Enforce this standard for every new module/function. When changing existing code, add/update the affected module header and function documentation; untouched legacy gaps remain documentation debt rather than prompting an unrelated repository-wide rewrite. Review documentation against the actual implementation and callers; passing lint/build does not by itself establish TSDoc coverage or accuracy.

### Refactor migration guardrails

Modules under `src/core/`, `src/application/`, `src/ui/components/`, `src/ui/features/`, `src/lang/` and `src/adapters/obsidian/` follow [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and `npm run check:architecture`. The checker follows type-only, aliased and transitive imports. Portable core/application/lang must not pull in Obsidian, DOM/browser globals, storage, timers, Node APIs or a global plugin escape hatch; inject required capabilities. Portable React components/features may use standard DOM through their owning document/window, but not Obsidian or legacy host modules. Shared components must remain domain-independent. Adapter-to-core imports are allowed; core-to-adapter imports are not. Do not introduce dependency cycles or nonliteral module loading to evade these rules.

Keep relationship classification and evidence precedence in one graph-semantic owner. React components and adapters must not duplicate it. Do not weaken source-text/golden assertions, strict timing bounds, lint or boundary checks to finish a task. Characterize missing behavior before extraction; intentional feature changes need an explained fixture difference and focused behavior coverage. The checker currently has no migrated-edge exception mechanism: document any proposed exception's exact edge, reason, owner and retirement checkpoint for review; documentation alone does not authorize weakening the checker. Run `npm run verify` (architecture checks, restricted host-free core checks, tests and real build) for runtime changes. New core contracts must remain green under `npm run check:core`, which excludes DOM, Node and Obsidian ambient types. When a configured test vault and CLI are available, run `npm run verify:obsidian` for applicable desktop checks; it requires the three explicit test-vault variables documented in `CONTRIBUTING.md`. The portable lane must remain usable without Obsidian. Documentation-only changes need link/content/whitespace checks, not invented runtime test evidence.

Close each refactor checkpoint with the automated commands/results and their limits, followed by at most three prioritized manual checks with the precise expected outcome. If no manual check is needed, say so. Do not call a screenshot or generated fixture a performance or interaction pass; keep unavailable host/device evidence pending in the plan ledger. See section 5 and the action-log template in `Refactor plan.md`.

For CLI runtime inspection through the loaded `app.plugins.plugins["k-plex"]` instance, follow [docs/OBSIDIAN_RUNTIME_TESTING.md](docs/OBSIDIAN_RUNTIME_TESTING.md). This maintenance access is not a production dependency boundary. Reacquire instances after reload and remove temporary test controllers/wrappers.

### Implementation plan, ETA and progress reporting

For **every substantial agent investigation, implementation, validation or multi-step assignment**, use the following user-visible progress protocol as the normal working mode. A task-specific instruction may request more frequent updates; never silently extend the interval.

1. **At the outset, before making changes**, publish a practical, step-by-step **Markdown checklist** (`- [ ]`), including investigation, implementation, validation and delivery. State the **initial estimated time to completion (ETA)**, the starting context/baseline, and any known uncertainty. A rough estimate is acceptable; distinguish forecast from measured evidence. Do not wait for approval unless an essential product decision or safety boundary is unresolved.
2. **While working, report against that same checklist at least once every ten minutes of elapsed wall-clock time.** Mark completed steps `- [x]`, leave outstanding steps `- [ ]`, and identify the current step. Every report must state **what actually changed or was validated, blockers or changed assumptions, the next action, and an updated remaining-time estimate / ETA**. This applies during long builds, tests, debugging and connector delays as well as code editing. If the task finishes sooner than ten minutes, a final report suffices.
3. **Revise the plan and ETA promptly** when discoveries change scope, sequencing or feasibility; do not quietly overrun an earlier estimate. Be factual and compact: checklist progress and meaningful evidence are preferable to repetitive “still working” updates. Do not label unrun tests or pending external validation as complete.
4. **On stopping or handing off**, return the final checklist, completed deliverables and exact saved branch/commit or patch identity, actual commands/results, remaining blockers, and any revised ETA for unfinished work. Keep long-form evidence in the designated handoff/validation records, but **do not substitute silent file edits or background logs for user-visible progress messages**.

For overnight/unattended assignments, continue according to the approved scope without requiring interactive confirmation for decisions that were already settled. If an unforeseen choice cannot be made safely, finish independent work, document the specific blocker, and report it at the next scheduled progress update. Do not promise background execution or notifications that the environment cannot deliver; if its user-visible messaging is unavailable, disclose that limitation before starting and preserve timestamped checkpoint evidence in the agreed handoff surface.

### Mixed agent development and handoffs

The default workflow pairs an **offline development agent** (no Obsidian installation/CLI; dependencies or network may also be limited) with the **main validation agent** (full Node/dependency environment and Obsidian CLI). The offline agent does the bulk of scoped implementation and trace analysis. The main agent prepares the assignment, performs needed live investigations, independently reviews/fixes the return, runs host validation and manages Git/PRs. Neither agent's role is a reason to duplicate production behavior or claim unavailable tests passed. Follow [docs/AGENT_WORKFLOW.md](docs/AGENT_WORKFLOW.md).

- Preserve the standing header in the single root `HANDOFF.md`, overwrite its assignment/result body on each transfer and never archive handoffs. Record exact base/diff identity, scope, architecture owner, acceptance criteria, actual capabilities and direction of transfer. An inactive template does not authorize new work or resume refactoring.
- Offline agents return reviewable uncommitted changes and actual command/results/limits in that file; do not commit/push/create PRs or mark final acceptance unless the maintainer explicitly assigns that authority. If dependencies or Git metadata are absent, say so and provide source hashes/patch identity and runnable reviewer checks; do not substitute stubs/global tooling for the real build.
- When only the equipped environment can answer a question, send a precise bounded probe request. The main agent may gather minimized traces, reproduction steps and source/artifact identities, then hand substantial analysis back to the offline agent. Separate observations from hypotheses and account for scheduling/throttling and incomplete captures. Keep runtime globals/wrappers temporary and remove them independently of test success.
- Main-agent review reruns affected portable checks on required Node and applicable exact-build/native checks, fixes defects, and reports automated evidence plus up to three prioritized manual tests (or none). Required unavailable checks remain pending unless the maintainer explicitly accepts a documented limitation. Changes after testing invalidate affected evidence. Commit/PR/merge/release actions require the applicable maintainer authorization; an earlier assignment's authority is not blanket authority for later handoffs.
- Persist accepted architecture/checkpoint results and limitations in `Refactor plan.md`; preserve feature-specific review evidence in the relevant issue/PR or `docs/validation/` when warranted. Failed/rejected refactor returns also get a plan entry before overwriting. The handoff is never the durable tracker. Do not request manual tests merely because the offline agent cannot run them when the main agent can automate the same assertions.

### Localization readiness

All plugin-owned user-facing copy belongs in language files: captions, commands, menus, settings, help, placeholders, tooltips, ARIA labels, notifications and user-visible errors. Developer console logs and console error messages stay English; localize the user-facing notice separately. Do not translate vault content, stable IDs or persisted keys. The English source catalog and strict typed lookup live under `src/lang/`; the Obsidian adapter supplies `getLanguage()` while portable feature code receives a translator capability. No non-English translations are part of this refactor. Every new or changed user-visible literal must use a catalog key. L01 supplies the whole-source presentation-sink gate in `tests/localization.test.mjs`; review dynamic label sources and interpolation parameters as well, since a sink audit is not general data-flow analysis. Preserve explicitly documented persisted predicate compatibility values separately from translated UI copy. See section 3.6 of `Refactor plan.md`.

### Host environment and shortcut copy

Preserve Obsidian desktop, tablet and phone distinctions and existing profile/command behavior. Use the E00 presentation seam: host-owned facts come from `src/adapters/obsidian/presentationEnvironment.ts`, while portable routing/profile code consumes `PresentationEnvironment`. Keep device class, OS/key convention, keyboard/pointer/touch availability and host feature availability distinct. A tablet can have a keyboard; a desktop can have touch. Future hosts provide their own facts. Do not import Obsidian `Platform` into portable core or newly migrated UI, and do not introduce a mutable global platform singleton.

User-facing shortcut text in tooltips, help, labels and notices must combine catalog copy with `src/core/plex/shortcutPresentation.ts` environment-aware formatting of the actual action. Do not hard-code `Ctrl/Cmd`, `Mod`, `Option`, `Alt` or platform-specific key sequences in new copy; show Command/Option on macOS and Control/Alt on Windows where those keys are relevant. Use the effective binding for host-configurable shortcuts when available; do not claim a fixed sequence when it is unknown. Omit hints for unavailable actions and provide the applicable touch instruction on touch-only surfaces. Test displayed hints against registration/handlers, including macOS/Windows, mobile key conventions and keyboard-equipped phones/tablets. See section 3.7 and E00/L00/L01 of `Refactor plan.md`.

## Performance is a high priority product requirement

The plugin must remain responsive in vaults with 20,000+ files and 100,000+ graph/search entries.

For current scale work use the verified `Synthetic-Scale-v2` fixture described in `CONTRIBUTING.md` and `docs/REFACTOR_BASELINE.md`: about 10% of Markdown files, by **file count**, are 950,000 bytes and include long prose, fenced code and dense links. Its source counts are not runtime index or performance results; record indexing completion, responsiveness and cold/warm measurements separately. Do not combine v1 and v2 timings as one baseline.

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

Parent columns support 1–3; the default remains 2. Children may be configured up to 7 columns.
Horizontal density and the measured parent-area width position friends/challengers and siblings;
child columns, child width and vertical density must never move their horizontal anchors. At
horizontal density 3, adjacent parent/lateral area edges touch. At 4, those areas may overlap by up
to 5% of the parent-area width, capped when necessary to keep thought/expanded-child bodies clear.
Lower horizontal densities retain a positive gap. With challengers present, siblings remain outside
that strip and follow the same adjacent-area spacing policy. Empty parent bands retain the normal
center-based lateral baseline.

Friends/challengers and siblings may extend upward into otherwise unused parent-area space. They should not be artificially clipped by the parent's vertical boundary.

When their occupied strip fits, Friends/Previous and Challengers/Next are **bottom-aligned** within their shared-height lateral bands and grow upward. A sparse lateral list (including a single node) must stay near the lower edge of the lateral region instead of being centered high in the available band. Overflowing strips remain scrollable; if filtering reduces an overflowed lateral zone to a result set that fits, preserve the same bottom-aligned behavior.

The native central-node editor is the deliberate exception: while its oversized center rectangle is active, friend/challenger and sibling strips are vertically centered beside that rectangle so they do not collect around its lower corners. Returning to the normal center restores the standard bottom-aligned lateral layout.

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

- Keep phone/tablet detection centralized in the E00 presentation seam. `readObsidianPresentationEnvironment()` is the Obsidian boundary; its pure adapter-local `classifyDeviceClass()` preserves optional runtime phone/tablet flags before the shortest-side fallback. The remaining `viewProfile.ts` layout helpers are compatibility delegates until C25. Do not add new direct `Platform.isPhone` / `Platform.isTablet` reads elsewhere.
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
- Perform one initial session index (or accept a fresh restored snapshot), then stop reactive rebuild work while no K-Plex view is open. Vault/metadata events accumulate as a dirty backlog until the next open. On iOS, cancelling the last open Plex must also cancel a first cold build; completed neutral source heads and body-cache entries remain reusable; old graph checkpoints are read-only migration inputs.
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

The create-relationship path uses one React modal and the shared `FuzzySearchInput`; do not reintroduce a second note picker. Both suggesters are closed until the user actually types or explicitly opens the ontology disclosure. The ontology disclosure shows the entire role-appropriate list even when its input is empty; normal typing retains fuzzy filtering. Selecting an existing note is a two-step flow: retain the selection, allow ontology edits, then commit with the fixed-width Link action. New-note buttons stay disabled unless the filename is valid and globally unused. The create actions are Markdown, Excalidraw when available, and Placeholder (an unresolved relationship with no file); Placeholder never becomes the Ctrl/Cmd+Enter default. The last successfully used Markdown/Excalidraw create button becomes the next primary CTA and the Ctrl/Cmd+Enter action; fall back to Markdown when Excalidraw is unavailable. Command-palette actions for Parent/Child/Friend/Challenger are gated by a running K-Plex view and are intended to be user-hotkeyable. New Markdown/Excalidraw files resolve their parent through the public `app.fileManager.getNewFileParent(sourcePath, newFilePath?)` API using the relationship origin as `sourcePath`. A newly created Placeholder is deliberately pathless: write/store only its unresolved note name and assign a real folder/path only when the ghost is materialized. Ontology input is fuzzy-searchable, remembers one default per gate role, and a newly typed ontology field becomes a real hierarchy item in settings before the relationship is written.

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

Use **K-Plex** in user-facing UI and current product docs, `Kplex` for named code types/components and `kplex` for CSS classes, custom properties, SVG IDs and canonical command suffixes. ExcaliBrain terminology belongs only to explicit data-migration/compatibility boundaries and their preserved source evidence. Keep supported graph-migration keys and migration fixtures stable; do not register legacy CSS or command aliases; never rebrand user data or rewrite historical validation transcripts as though they tested the new namespace. See [legacy compatibility](docs/LEGACY_COMPATIBILITY.md).

Use **nodes**, not "thoughts", in user-facing terminology. Legacy internal names can be migrated gradually, but new UI strings should say nodes.


## Graph predicates and lenses

K-Plex graph filtering is a **presentation-layer operation over the currently materialized Plex**, not a whole-vault graph query engine. Keep the persistent semantic index focused on data required to build and explain the Plex.

- `src/core/plex/predicate.ts` owns the host-free declarative predicate AST, dependency discovery and safe evaluator; `src/lens/GraphPredicate.ts` is the legacy Obsidian compatibility adapter. Do not use `eval`, `Function`, DataviewJS or any other runtime code execution for filters/lenses.
- The supported predicate contexts are deliberately distinct: `node`, `edge`, `evidence`, `note`, `file` and `this` (the current center thought). Do not collapse evidence provenance into resolved-edge fields.
- `note.<property>` must be resolved lazily from Obsidian `MetadataCache`. Do not copy arbitrary frontmatter values into `GraphPage`, `GraphState`, snapshots or IndexedDB just to support lenses.
- K-Plex-native graph properties and file facts cross as explicit plain node/file facets. Never infer semantic path, kind, extension or case rules from opaque `NodeId`. Arbitrary note properties cross only through the lazy property provider; relationship provenance crosses only through the bounded evidence provider.
- Predicate dependency discovery must remain explicit. Metadata-dependent predicate refreshes are UI/presentation refreshes and must not call `rebuildIndex()` or otherwise couple lens evaluation to semantic graph reconstruction. Adding/changing an arbitrary non-semantic frontmatter property may update discovered-field bookkeeping, but must not emit a semantic graph change.
- Folder/tag visibility is presentation-only. Keep folder topology sourced from `Vault` and tag topology sourced from `MetadataCache` available independently of `showFolderNodes` / `showTagNodes`; those settings must not enter `computeIndexSettingsSignature`, `REINDEX_SETTING_KEYS`, or any toolbar/settings rebuild path.
- The current Keyword / Tag / Note type controls are a compatibility UI over the generic predicate engine. New filtering behavior should compile to the same predicate representation rather than adding another ad-hoc matcher in React.
- Named Graph Lenses reuse this same selector engine. `src/core/plex/predicateParser.ts` parses the safe Bases-inspired text syntax into the AST (`src/lens/GraphPredicateParser.ts` remains a compatibility re-export); never execute user-authored scripts. `src/lens/GraphLensSimple.ts` is the user-facing visual-builder adapter: it compiles friendly field/operator/value rows to the same AST-compatible expression syntax and round-trips the common expression subset back into Simple view. Do not create a second evaluator for the visual builder. Active include lenses are unioned, active exclude lenses subtract, style lenses never affect visibility, and with no include lens the current Plex is the baseline.
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
- Connection details supports inspection, additive ontology and confirmed source-specific frontmatter removal. Removal names one owning note, exact property and target, reauthorizes canonical provenance and captured native identities after approval, and preserves other properties, notes and body evidence. Repeated references to the same target within the selected property are removed together; ambiguous keys or unsupported transforms fail closed. Keep the strict direct-unlink guard unchanged. Date scalar, inferred, inline/body, folder/tag and unavailable sources have no destructive action. Do not implement a custom inline Markdown editor. **Go to source** hands editing to the real native Obsidian Markdown leaf/editor. Additive actions never change or override existing ontology: if explicit ontology already exists, label it **Add ontology…** and preserve every existing body/frontmatter source; if the connection is only inferred, label it **Specify ontology…**.
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
