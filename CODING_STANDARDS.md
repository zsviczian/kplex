# Coding standards and mandatory practices

This is the canonical home for cross-cutting coding requirements in K-Plex.
Preserve existing behavior, use root-cause fixes, and keep changes scoped.
[AGENTS.md](AGENTS.md) owns architecture, subsystem contracts and agent workflows;
[CONTRIBUTING.md](CONTRIBUTING.md) owns setup, build and native acceptance commands.
Existing subsystem requirements in those guides remain mandatory.

## Timers, window ownership and asynchronous work

- In Obsidian host modules, use `window.setTimeout()` / `window.setInterval()` and matching main-window cancellation for coordination, persistence, retries and promise settlement that must survive a popout closing. Portable core receives clock/yield/cancellation capabilities; never introduce browser globals there.
- Short index-pacing rests use `scheduleBackgroundIdle` from the Obsidian adapter. Its private nonblocking atomic wait avoids hidden-renderer timer clamping where supported, with owning-window timer fallback. Keep retry/debounce/deadline timers on the normal timer owner; never use blocking atomic waits, polling or global Electron throttling changes for pacing.
- DOM creation, focus, events, observers, portals and rendering belong to the owning document/window. Disposable UI timers may use that window; capture it and cancel through the same object, even after migration.
- Clean up resources when their owner retires; use Obsidian registration helpers or explicit idempotent cleanup. Canceling a timer must also settle any pending promise so finally blocks release resources.
- Recheck captured file, view, generation and demand identities after asynchronous work before publishing or writing. Preserve atomic source/index publication and native ownership fences.
- Use owning-window animation frames for rendering, never as the sole persistence or cleanup clock. A frame callback is not evidence of paint.

## Native note creation and template automation

Route K-Plex physical file creation/copying through `createFileWithAutomation` (the
low-level native creator and configured Daily Notes creation share its adapter).
Await the captured Templater creation receipt before display-name, alias or relationship
property writes. A folder/regex template can be delayed before its pending set is
populated, so an empty set, a quiet interval or a fixed delay cannot authorize writes.
Do not duplicate Templater's matching rules or execute its parser a second time.
Retain exact native identities after asynchronous work and on partial-file recovery.
Wait for foreign template/user code outside mutation-priority scopes: a template
may itself need navigation or source preparation. Acquire mutation priority only
after that barrier for the actual metadata writes and graph publication.
The optional guarded host seam and its limits are documented in
[template creation](docs/TEMPLATE_CREATION.md); no graph scheduling belongs there.

## Compatibility and validation

- Preserve settings (including unknown keys), command IDs, persisted graph/schema contracts and public APIs. Settings additions need defaults, validation and the existing serialized writer; renamed data needs an explicit migration.
- Every behavior change needs executable tests of observable outcomes and affected workflows. Capture failing regression evidence before fixing where practical. Never weaken accepted goldens, time bounds, architecture or lint gates to make a change pass.
- Run focused checks while iterating, then `npm run verify` (including the real build and installed Obsidian types). Use exact-build native checks for affected workspace/UI/integration behavior and record unavailable environments honestly. Source checks and desktop emulation do not establish native or physical-device acceptance.
- Keep new tests in the executed command inventory. Settings/persistence checks must include non-default data, unknown-key preservation and actual reload where relevant.

### Mandatory indexing and persistence acceptance gates

These gates apply to startup, hydration, indexing, source authority, scheduling,
cache selection/persistence and index-status changes. They are completion and
release requirements, not optional follow-up recommendations. Passing unit tests
or making one expensive step faster does not establish that the workflow is fixed.

1. **Establish the regression boundary.** Compare the last known good released
   tag, the branch base and the uncommitted changes separately. Identify the
   responsible trigger and owner from evidence. Distinguish a suspected cause
   from a demonstrated cause; do not blame a release, branch, user action or
   "normal background work" without tracing the actual admission. Preserve a
   failing end-to-end regression before fixing the behavior where practical.
2. **Define acceptance before editing.** Record the affected user workflow,
   baseline timings/work counts and the required result. Distinguish first paint,
   current-view authority, global settlement and durable cache activation. A fast
   first paint, fast pair preparation or a ready indicator cannot substitute for
   a settled, restartable index. An existing maintainer latency requirement is
   the acceptance target; do not silently replace it with a weaker target.
3. **Require repeated unchanged restarts.** After settling and verifying cache
   activation, perform at least two consecutive unchanged warm restarts with
   the exact candidate artifact. Cover the actual reported restart boundary;
   distinguish closing/reopening a canvas, plugin reload and application/vault
   restart. Also cover closing/reopening while a cache save is pending. Record
   which fast path was taken, not merely that the final graph looks correct.
4. **Unchanged input must reuse unchanged work.** A cheap native inventory/stamp
   comparison may detect changes made while the plugin was absent. It must not
   become per-note source-family authentication, body reads/parses, source
   rewriting, semantic replay, full rebuild or URL-index regeneration just to
   rediscover that nothing changed. Exercise changed-file, alias, folder,
   ontology, Date-registry and Daily Notes invalidation separately; each must
   have a demonstrated scope and must settle without repeating on the next
   unchanged restart. Do not remove freshness checks, restamp stale graphs as
   current, or serialize mixed-policy state to satisfy this gate.
   Test parsed native metadata with aggregate link resolution still pending,
   including intermediate native completion events and repeated unchanged
   per-file resolver notifications. Cached graph hydration and stationary
   body-defined connections must remain available without auditing temporarily
   empty maps. Keep source authority and exact-pair writes separately fenced.
   Supersede the restart header proof with an actual coordinate-only CAS. Require
   a fresh proof under the replacement root without a global source audit; cover
   repeated races, disposal and changed-source sequences separately.
   Prose-only autosaves must preserve displayed node identities, positions,
   visibility and connections while replacement input is pending. Cover both
   the center and incoming relationship contributors, with delayed body parsing
   and native metadata notifications. A merely observed contributor cannot
   replace an acquired body-defined relationship with a thinner host preview.
   Verify genuine link/ontology edits, deletion, rename, policy changes and demand
   retirement separately; presentation continuity must never renew write proof.
5. **Prove durable reuse.** Assert the activated generation, its actual settings
   and source/host validity fences, and reuse after reload. A settings/topology
   mismatch must not recur indefinitely against the same old snapshot after
   successful reconciliation. Verify write failure/retry and that no-op events,
   render notifications, visibility changes or debounce resets cannot starve
   persistence. Shutdown must not be the primary save boundary. If persistence
   fails, report that failure separately from graph readiness.
   A coherent completed initial graph must start its required snapshot save without an edit-idle
   wait. Reuse an unchanged saved generation; never flush an incomplete/source-backed view as a
   complete snapshot. Later edits may coalesce normally without postponing existing cache debt.
   Hold independent startup-source validation past complete graph hydration, then let it enqueue
   an actual late graph repair. Its first required cache save must activate without an edit-idle
   delay. Recheck policy, source, maintenance and structural ownership before consuming that handoff.
6. **Validate the whole workload.** Measure all startup/background passes and
   their admissions, reads, parses, repairs, rebuilds and writes, including work
   continuing after first paint. Exercise idle/wake, foreground interaction during
   recovery and a representative large persisted graph. Never present reduced
   cost in one phase as proof that redundant phases were eliminated. Concurrent
   operations must appear together in status; cycling one label between owners
   is not adequate progress reporting.
   Hold the initial owner after hydration but before source closure/repair and
   invoke the actual periodic/reactive catch-up handler. It must join that owner,
   never start a competing full writer. Exercise coordinator bookkeeping before
   repair admission, genuine edits before/during repair and native structure
   changes separately. Successful full recovery must retire only the dirty
   source observations it actually published, preserving newer same-file edits.
7. **Use comparable evidence.** Compare baseline and candidate under the same
   vault/fixture, settings, cache condition and host visibility. Record actual
   file/source counts and platform. Clearly distinguish production observations,
   disposable-vault tests and synthetic microbenchmarks. A small-vault result
   cannot establish production-vault latency. Production notes remain read-only
   unless the maintainer authorizes a specific mutation; repeat destructive
   cases only in an approved disposable vault.
8. **Verify the final revision and report failures honestly.** Run the affected
   regressions, complete mandatory verification and exact-build native scenarios
   against the final source. A later source edit invalidates affected results.
   Keep assertions and deadlines unchanged. Record a failed aggregate command
   even when an unchanged rerun passes; identify the rerun and all remaining
   gates explicitly instead of describing the original command as successful.
   Hash-check the tested, staged and deployed artifacts and independently verify
   observer, fixture, database and settings cleanup.
   A native driver exiting successfully after observing eventual readiness is
   not a performance acceptance result. Assert the allowed full-build, global
   source-inventory, body-read/parse and follow-up batch counts explicitly.
9. **Do not declare completion with missing evidence.** "Fixed", "regression
   resolved" and "ready to merge/release" require the gates above for the claimed
   workflow. Deployment for observation is an intermediate experiment and must be
   described as such. Keep unavailable platform/workflow acceptance explicitly
   unfinished. Only the maintainer may waive a named gate; an agent cannot grant
   itself an exception or classify an unexplained expensive pass as necessary.

Follow the restart acceptance procedure in [CONTRIBUTING.md](CONTRIBUTING.md#indexing-and-persistence-acceptance).

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

Follow [UI_RULES.md](UI_RULES.md) for required shared form/modal components,
icon actions, tooltip ownership, typography, full-width authored fields and visual
acceptance. New local styling must not bypass these shared owners.

- K-Plex is local/offline by default. Do not add telemetry, remote-code loading or network calls without an explicit user-facing reason, opt-in where appropriate, and clear documentation.
- Keep UI copy short, sentence-case and action-oriented. Prefer established Obsidian classes/components before inventing a parallel visual language.
- Settings are user-facing product UI, not a debugging surface. Never expose implementation commentary (for example “instead of expanding the collection in Settings”) as labels or descriptions. Explain the user-visible purpose of a control.
- Do not dump large discovered/configured collections into a settings page. Put large collections behind a searchable/filterable manager or a dedicated subpage, show useful counts/summaries, and avoid nested scroll regions or horizontal scrolling.
- Prefer shallow, task-oriented settings pages. When a settings page mixes distinct jobs (for example canvas, node styling and link styling), use declarative subpages so the landing page remains easy to scan.
- Use semantic interactive elements. Link-like navigation should behave as navigation; buttons should represent actions.
- A control with an Obsidian/styled tooltip must use `aria-label` for its accessible name and **must not also set an HTML `title` attribute**. Native Chromium/Electron `title` tooltips otherwise stack on top of the styled tooltip.
- Portaled menus/popovers must carry portal-safe classes and an explicit stacking level when needed; validate main window, pop-out, click-outside and Escape behavior.
- Desktop mobile emulation is useful for layout only. Validate touch targets, synthesized clicks, scrolling, long-press and focus on a physical phone/tablet before considering mobile interaction work complete.

## Documentation contract

`README.md` is strictly end-user-facing. It should explain what K-Plex is, why it exists, how to get started, how to use major features, where to report issues/contribute, and how to support development. Do not add Node/npm build steps, source architecture, cache internals, performance implementation details or developer-only invariants to the README.

- Contributor workflow belongs in `CONTRIBUTING.md`.
- Durable architecture/design notes belong under `docs/`.
- Feature-specific end-user guides may live under `docs/` and be linked from the README.
- Keep the README's first-start indexing notice and existing product screenshots unless deliberately replacing them with newer user-facing imagery.
- Release notes should be written in product language and focus on observable behavior.

### Validation evidence and retention

Follow [the validation artifact policy](docs/VALIDATION_ARTIFACTS.md): executable tests
and concise PR results are the default durable evidence. Raw reports/logs, complete
diagnostic JSON, hashes for every input, deployment receipts and transient captures
belong in ignored managed storage, not product documentation or Git history.
New committed validation records require explicit maintainer approval, a retention
reason and a review date; agents must not approve their own exceptions. Do not force-add
ignored output or weaken the commit gate to publish a report. Stage reviewed paths
explicitly, and run `npm run check:validation` before committing. Age-based retention
does not extend the validity of results after affected code changes.

## Naming

Use **K-Plex** in user-facing UI and current product docs, `Kplex` for named code types/components and `kplex` for CSS classes, custom properties, SVG IDs and canonical command suffixes. ExcaliBrain terminology belongs only to explicit data-migration/compatibility boundaries and their preserved source evidence. Keep supported graph-migration keys and migration fixtures stable; do not register legacy CSS or command aliases; never rebrand user data or rewrite historical validation transcripts as though they tested the new namespace. See [legacy compatibility](docs/LEGACY_COMPATIBILITY.md).

Use **canvas** for the visual surface, **K-Plex canvas** where ambiguous, and **Compass** for the current directional view. Preserve internal `classic` IDs, code/CSS/command identifiers, product branding and historical evidence. Native **Obsidian Canvas** and `.canvas` files remain distinct. Shared Canvas behavior owns navigation/editor defaults/visibility; **Views → Compass** owns its layout and area-tint contribution.

Use **nodes**, not "thoughts", in user-facing terminology. Legacy internal names can be migrated gradually, but new UI strings should say nodes.

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

## Numeric settings and configuration controls

Every numeric preference must use a bounded slider with a permanently visible current value. A hover tooltip alone is insufficient. Do not use numeric text boxes, number inputs or private slider implementations for settings/configuration. Reuse `src/ui/numberSlider.ts` for native Obsidian Settings rows and `src/ui/components/LayoutSlider.tsx` for React surfaces; both share latest-value async delivery. Optional numeric overrides reuse `src/ui/styleNumberSlider.ts`, showing the effective inherited value and an explicit reset action instead of an empty field. Preserve limits, units, keyboard accessibility, draft Save/Cancel and existing queued writers. Never persist an inherited default merely by opening a dialog. Predicate expressions, property values and other literal text remain text; they are not numeric preference controls.

The numeric-control source audit and negative fixtures run with `npm run check:architecture`. Extend their inventory for a new surface and keep all numeric settings on these shared components. Validate permanent readouts, inheritance/reset, bounds and final-value delivery when changing a numeric control.

## Coding standard: TSDoc and meaningful comments

- Every module file must have a meaningful TSDoc header (`/** ... */`) describing its purpose, architectural layer/responsibility, important contracts and dependencies, and any lifecycle or side-effect ownership. Place it before the module's imports/declarations; update it when ownership or behavior changes.
- Every function must have meaningful TSDoc at its declaration/definition, including private helpers, methods, constructors, React component functions, hooks and callbacks. Explain its purpose and observable behavior; document meaningful parameter/return semantics, side effects, errors, async/cancellation/revision behavior and important invariants where applicable. Use `@param`, `@returns`, `@throws` and `@remarks` when they add useful contract information, rather than repeating TypeScript types.
- Add explanatory comments for non-obvious algorithms, compatibility workarounds, publication/await boundaries, resource cleanup and performance constraints. Explain why the code exists and what must remain true; do not add boilerplate, restate each line or leave comments describing an earlier implementation. Keep documentation in English and update it with the code.
- Enforce this standard for every new module/function. When changing existing code, add/update the affected module header and function documentation; untouched legacy gaps remain documentation debt rather than prompting an unrelated repository-wide rewrite. Review documentation against the actual implementation and callers; passing lint/build does not by itself establish TSDoc coverage or accuracy.

## Localization readiness

All plugin-owned user-facing copy belongs in language files: captions, commands, menus, settings, help, placeholders, tooltips, ARIA labels, notifications and user-visible errors. Developer console logs and console error messages stay English; localize the user-facing notice separately. Do not translate vault content, stable IDs or persisted keys. The English source catalog and strict typed lookup live under `src/lang/`; the Obsidian adapter supplies `getLanguage()` while portable feature code receives a translator capability. **Maintain every supported language in the same change whenever user-facing copy is added or changed:** English, German, French, Spanish, Dutch, Japanese, Traditional Chinese and Russian. Preserve each key's parameters, plural forms and meaning across the catalogs. Existing English-fallback allowances are legacy compatibility, not permission to omit translations for new work; an English-only delivery requires explicit maintainer authorization. Every new or changed user-visible literal must use a catalog key. L01 supplies the whole-source presentation-sink gate in `tests/localization.test.mjs`; review dynamic label sources and interpolation parameters as well, since a sink audit is not general data-flow analysis. Preserve explicitly documented persisted predicate compatibility values separately from translated UI copy. See section 3.6 of `Refactor plan.md`.

## Host environment and shortcut copy

Preserve Obsidian desktop, tablet and phone distinctions and existing profile/command behavior. Use the E00 presentation seam: host-owned facts come from `src/adapters/obsidian/presentationEnvironment.ts`, while portable routing/profile code consumes `PresentationEnvironment`. Keep device class, OS/key convention, keyboard/pointer/touch availability and host feature availability distinct. A tablet can have a keyboard; a desktop can have touch. Future hosts provide their own facts. Do not import Obsidian `Platform` into portable core or newly migrated UI, and do not introduce a mutable global platform singleton.

User-facing shortcut text in tooltips, help, labels and notices must combine catalog copy with `src/core/plex/shortcutPresentation.ts` environment-aware formatting of the actual action. Do not hard-code `Ctrl/Cmd`, `Mod`, `Option`, `Alt` or platform-specific key sequences in new copy; show Command/Option on macOS and Control/Alt on Windows where those keys are relevant. Use the effective binding for host-configurable shortcuts when available; do not claim a fixed sequence when it is unknown. Omit hints for unavailable actions and provide the applicable touch instruction on touch-only surfaces. Test displayed hints against registration/handlers, including macOS/Windows, mobile key conventions and keyboard-equipped phones/tablets. See section 3.7 and E00/L00/L01 of `Refactor plan.md`.

## Localization reference formatting

For an interpolated English entry, declare `referenceParams` with the names of literal note,
path, property, tag, alias or other content references; use `[]` for counts, shortcuts and
descriptive labels. The shared formatter adds one pair of double quotes and normalizes existing
template-owned quote wrappers across locales. Pass raw values, including a tag's `#` prefix,
and do not prequote caller data. When one consumer mixes a property name with a source-kind
label, use separate catalog keys so the source metadata can distinguish them.
