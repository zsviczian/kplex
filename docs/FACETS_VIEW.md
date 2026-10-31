# Facets and canvas-view API: implementation specification

Current preset catalog: only Wu Xing and Local map roles are inherited built-ins. ARC, PARA, GTD horizons, eACCESS, Sensemaking and Publishing pipeline were exported at809510f and are available under presets/facets. Saved definitions remain intact. Latest Dumo main was verified as fa038f0af796a9a6f42e6f8eb91e44c13ba3e067: Wu Xing now defaults to status/emoji assignment, Wood-first clockwise placement and matching phase colors. English IDs remain explicit aliases, and variation-selector emoji aliases reuse the one classifier. Existing saved field/mapping/order values are not rewritten. Centered focus, canonical connectors and diagnostics remain Facets behavior; balance star, perspective and a separate language setting remain future opportunities. The prototype strictly rejects unknown extra list entries; Facets retains its existing known-alias matching rule. The earlier reference assessment and historical assignment follow below.

Implementation status: accepted-main integration, Facets presets, safe shared assignment/Undo, shared advanced rules and the optional section boundary are implemented. Developer/API/end-user guides, the five-preset/custom-State sample vault and authentic native screenshots are included. Native feature, editor, selector/settings, independent-canvas and source-occurrence/relink checks pass against runtime ced2825; final published-head verification/CI is recorded in the PR handoff. Accepted base: 26623c8393bddc0c3bcac39468078ec20ceccbc8. Prior validated head 016919893b13a99867a14336680debb29d1b6f54 remains historical. The requirements below supersede the earlier Wu Xing-only scope. Current contracts: CANVAS_VIEW_API.md and CANVAS_VIEW_DEVELOPER_GUIDE.md; ordered evidence: docs/validation/facets-220-2026-10-25.md. The #222 central Mind Map section extension is implemented against this shared boundary; its final native/CI acceptance is tracked separately. Facets deliberately keeps sections disabled.

## Functional reference: Dumo's fixed Wu Xing prototype

Reviewed [fa038f0af796a9a6f42e6f8eb91e44c13ba3e067](https://github.com/dumodal/kplex-wuxing/commit/fa038f0af796a9a6f42e6f8eb91e44c13ba3e067), including `src/core/plex/wuxing.ts`, the GraphIndex neighborhood/status paths, WuXingGuide, onboarding helper/content and methodology. This is a functional reference, with no fork code/artifact import.

| Reference behavior | Fixed-commit implementation versus proposal | Facets composition |
| --- | --- | --- |
| Local five-phase classification | Implemented: existing neighbors, saved emoji `status`, single unique phase; invalid connected notes counted but excluded from phase groups. Classified focus sits in its phase. | One configured source, exact aliases and explicit diagnostics; focus stays centered with its badge. Empty categories and Unassigned remain reachable. |
| Five relative families | Implemented: a modulo-five phase-pair function populates relative neighborhood roles. Onboarding explains the temporary focused-note reference separately from personal assignment. | Optional explanatory region labels only. Canonical note roles/evidence and stored phases remain intact. No phase-derived semantic edges. |
| Generating/regulating cycles | Implemented: directed phase-to-phase graphics, with outward regulating curves. | Both cycles are noninteractive decorations. Solid generation follows Wood → Fire → Earth → Metal → Water → Wood; dashed regulation skips one phase. Neither supplies relationship endpoints or edit authority. |
| Guide and visual enhancements | Implemented: manual guide with selectable example reference, saved English/Chinese display preference, count-weighted color star, automatic perspective plus manual adjustments and overview framing. | Concise localized preset help now; richer onboarding, balance star, perspective and separate bilingual display preference are future opportunities, not acceptance gates. |
| Central holding area and drag-to-classify | Explicitly proposed in onboarding; not implemented at this SHA. Its read-only fork blocks ontology/section actions. An automatic Wood assignment or persistent first-use default is also not implemented. | Shared explicit assignment preview/Undo exists on #220; no automatic assignment on focus, and no fork-specific metadata writer or action blocklist. |

The phase is a personal classification. The relative role is a model reading against the current focus. Recorded graph evidence remains a separate fact; neither color nor a cycle guide establishes causation. For the ordered cycle, offsets 0/1/2/3/4 mean shares my phase / I generate / I regulate / regulates me / generates me. Reordering visible categories does not reorder this model. Unassigned, conflicting or unavailable focus phases supply no default reference. Configuration and layout do not edit notes or acquire metadata.

Review confirmed that the legacy predicate `this` namespace exposes fixed page attributes and does **not** automatically read Markdown properties such as `this.phase`. E adds explicit opt-in availability-aware evaluation: fixed attributes retain precedence, while other `this` keys read the focused Markdown note through the same field-scoped reader used for candidate `note` properties. Legacy `matches` stays compatible. Unavailable inputs remain unknown under negation; exact cached-field proofs are rechecked before accepting compound results or a final rule projection. No private rule interpreter, parser or metadata owner is introduced.

# PR #220 — Facets and the canvas-view plugin API

Continue PR #220 on its existing branch:
`2026-10-24-canvas-wuxing`

Expand the existing Wu Xing implementation into **Facets**, a configurable categorized-neighborhood view. Wu Xing becomes one editable preset.

Also finalize the internal canvas-view plugin API needed by Compass, Mind Map and Facets, including settings persistence, shared UI contributions, navigation, drag/drop, area controls, canvas labels and optional section-tree presentation.

Deliver implemented, tested interfaces and a developer guide. Prepare the boundary for future downloadable view extensions without building an extension marketplace, remote loader or package installer in this PR.

Preserve the current working implementation and its validation evidence.

## 1. Starting point and integration order

I will first have #219 completed and merged. Integrate its accepted implementation from main before implementing this expanded assignment.

Check GitHub merge status. While #219 remains open, check approximately every 20 minutes using a supported waiting facility. The merge is the start signal; no separate notification, handoff comment or acknowledgment is required.

If the environment cannot maintain the wait, report that limitation once. Do not consume the moving unmerged partner branch.

Once #219 is merged:

- Fetch and normally integrate latest accepted main into this existing branch.
- Preserve #220's work and reconcile conflicts deliberately.
- Reread AGENTS.md, CONTRIBUTING.md, architecture/contracts, both PR discussions and final #219 validation evidence.
- Record the actual accepted base and integration commit.
- Return #220 to draft during this extension.
- Update its title, description, specification and handoff to the Facets scope.

At preparation:

- #219 head: `5754fc571f78f23231ea488a93e2397d477da44e`.
- #220 previously validated head: `016919893b13a99867a14336680debb29d1b6f54`.
- #219 has published its shared relink-feedback correction and native regression evidence. Its PR remains open at this check.

Resolve live state rather than assuming these remain current.

First compose and smoke-test the existing shared infrastructure:

- `plexViewRead`: hierarchy budget fifth/default 0, property provider sixth; preserve both operation budgets and lifetime checks.
- Both view registrations and settings contributions.
- Decorations, literal labels and cross-link limitation contracts.
- Both camera corrections, including rooted/manual/restored/editor safeguards.
- Exact native drag-source occurrence identity and current canonical provenance.
- Additive-only versus legitimately authorized relink behavior.
- Area capability checks and unsupported-mode retirement.
- Generic cross-links and quiet routine settings refresh.
- **The latest #219 shared relationship-save completion fix described below.**

### Important #219 regression: relationship saved, UI stuck updating

A real issue was observed in `kplex-test-small`:

1. In Mind Map, drag `Use cases` to become a parent of `Note A`.
2. Then drag `Use cases` to become a child of `Note A`.
3. The relationship was saved and correctly updated, but K-Plex froze displaying "updating relationships".

#219 diagnosed and corrected the shared completion path. Non-Classic views had been waiting for Compass-only compatibility lists to confirm a completed relationship update.

The accepted correction makes the shared feedback owner complete when the relationship save has been published, without requiring Compass-specific lists to reflect a non-Classic scene.

**Preserve this fix for every canvas view, including Facets.**

- Do not restore Compass-only conditions as universal completion guards.
- Preserve Compass's existing compatibility checks.
- Preserve pending-save, stale-token, document identity, lifecycle and failure handling.
- Do not treat a successful local mutation as published before the actual save/publication completes.
- Do not introduce another polling loop or view-specific relationship completion mechanism.
- Ensure both additive relationship creation and legitimate relinking retire the "updating relationships" state.
- Preserve correct error reporting if a save genuinely fails.

After integrating #219, rerun the parent-to-child reversal scenario and verify the actual relationship, saved metadata, graph presentation and UI completion state.

The correction belongs to shared infrastructure and should be consumed from accepted main. Do not independently reimplement it in Facets.

#219's native evidence is documented in `docs/validation/relink-feedback-219-2026-10-25.md`. Read the final accepted source and report rather than relying solely on this summary.

The latest #219 drag correction also goes beyond payload identity: creation-mode Save can still remove an existing relationship unless additive-only intent reaches the actual writer. Preserve that correction end to end.

This integration order supersedes earlier instructions to deliver #220 solely against the pre-#219 baseline. It does not authorize you to merge either PR.

## 2. Architecture: views supply policy; the host supplies shared behavior

Build on the actual owners:

- `src/core/plex/views/contracts.ts`
- `src/core/plex/views/configuration.ts`
- `src/application/PlexViewSession.ts`
- `src/ui/plexViews/prepareScene.ts`
- `src/ui/plexViews/settingsContributions.ts`
- Shared action, node, editor, menu, layout and drag/drop owners.

Keep projection and layout host-free. They receive bounded facts, validated configuration, session state and measurements; they do not receive App, the plugin instance, mutable GraphIndex, native leaves or the complete settings object.

Host adapters own native effects, lifecycle, source acquisition, menus, document mutation and rendering.

Mandatory reuse:

- `ThoughtNode` and the shared node measurement/style pipeline.
- Existing native editor, content representations and Sidecar.
- Gates, relationship evidence, hover/preview/highlighting and drag payloads.
- Selection, keyboard navigation, modifier actions, context actions, opening, copying, pinning and other applicable base-node behavior.
- Images, icons, typography, semantic styles and lens effects.
- Shared grouping, overflow and accessibility machinery.

A view can declare its normal primary-click policy, physical ports, layout and optional supported features. It must not replace ordinary nodes with its own simplified cards or silently lose shared features.

New badges, section anchors, controls or managers must be implemented as shared components/contributions where another view could use them. Do not copy a component into each view folder.

Prefer focused extractions over adding more view-ID conditionals to PlexGraph. Retain necessary legacy compatibility adapters without starting C15–C26.

## 3. Finalize a coherent, versioned internal API

Provide one documented developer-facing entry point, or a clearly separated pure-policy entry point and host-UI contribution entry point.

Use actual exported TypeScript interfaces. Do not publish invented examples that compile only against a proposed future API.

The contract must cover:

- Definition identity, API compatibility and registration.
- Capability declarations with safe defaults.
- Bounded graph/property/evidence reads and completeness.
- Projection, occurrences, measurements, physical ports and layout.
- Shared node decorations and canvas labels.
- Configuration schemas, migrations and persistence.
- Per-canvas state and lifecycle.
- Context-menu and layout-control contributions.
- Navigation intent.
- Drag/drop targets and shared action requests.
- Optional section-tree data and measured connector anchors.
- Shared relationship-save completion and feedback lifecycle.

Keep API compatibility, settings-schema version and session-state version distinct. A label or implementation version is not a migration strategy.

Use collision-resistant stable IDs for future extensions, with an owner-qualified convention compatible with the actual registry. Preserve existing built-in IDs: `classic`, `mindmap` and `wuxing`.

Reject duplicate registrations and incompatible definitions. Keep optional features optional; omitted capabilities must have documented behavior.

Use narrow, typed capabilities and validated outputs. Registration must not grant an arbitrary view permission to mutate relationships or files.

Document that these boundaries are architectural contracts, not a security sandbox for third-party JavaScript.

No remote downloading/execution, extension marketplace, hot-update service or general plugin-permission framework is part of this assignment.

## 4. Settings persistence and future downloaded extensions

K-Plex owns persistence for view settings through its existing `data.json` and serialized settings writer, using `canvasViewSettings[viewId]` or its compatibility-preserving implementation.

Views declare schemas/defaults/migrations and request scoped updates. They must not read/write K-Plex's settings file directly, maintain a second settings store, or depend on writable files inside their installed extension directory.

Keep these ownership levels explicit:

1. **Shared view-type configuration:** Preset definitions, category rules/colors, defaults and other durable preferences. Persist through K-Plex's existing settings owner.

2. **Per-canvas persistent intent:** Selected view and preset, plus the existing bounded root/area/view state. Persist through the owning workspace/session mechanisms.

3. **Transient runtime state:** Hover, pending gestures, subscriptions, native references, acquired scopes and editor instances. Never serialize them. Preserve existing camera/selection persistence semantics rather than indiscriminately moving transient state into data.json.

4. **Note content:** Category properties remain ordinary vault metadata. They change only through explicit document actions, independently of saving view configuration.

Provide scoped read/update/reset operations that preserve other views and unknown future fields. Nested preset updates must not overwrite concurrent edits to another preset or configuration namespace.

Preserve incoming-settings synchronization, queued writes, stale-update checks and useful save-failure/conflict feedback. Avoid write-back loops and generic "settings changed" notices.

Support validated, versioned, idempotent migrations where this change needs them. Failed migrations preserve the original payload and expose a recoverable error; they must not silently reset user data.

When an extension is missing, disabled or incompatible:

- Retain its settings and bounded saved state as inert data.
- Render a safe available fallback without silently deleting its requested ID or rewriting its settings as another view's configuration.
- Do not execute unknown payloads or attempt destructive downgrades.
- Allow restoration when the compatible definition becomes available again.

Explicit reset/removal must state its scope. Resetting one preset/view must not erase other presets, global settings or note properties.

Inspect current JSON, depth, size and collection limits before designing storage. Do not silently truncate user configuration or remove bounds to accommodate it.

For Facets, preserve stored ID `wuxing` during this increment and migrate the existing Wu Xing settings into an editable preset. Keep workspace restoration, existing mappings and unknown/future payloads compatible.

## 5. Shared UI contribution contracts

### Context menus

Extend the existing canvas context-menu builder through registered contributions.

Provide bounded descriptors for actions, submenus, separators, checked state, visibility, enabled state and an unavailable reason where appropriate.

The host creates the native menu, applies localization/accessibility, captures the owning canvas and dispatches actions through existing lifetime/safety rules.

Keep callbacks attached to the canvas that opened the menu. Recheck identity, capability and revision when an item is invoked; focus changes must not redirect the action to another canvas.

Preserve the common menu entries. Views add their own group rather than replace the menu or intercept all contextmenu events.

Facets contributes:

- Preset → available presets, checked current selection.
- Manage presets… → its native Settings page.

Use the same preset action from the Views and lenses panel. Do not create parallel selection stores.

Node/gate/relationship menus retain their common owners. Add category assignment through a scoped contribution to those owners rather than a replacement menu.

### Canvas headings and labels

Provide a presentation contract for optional canvas heading/caption text, including an explicitly empty value.

Document the distinction between:

- Inherit the normal host presentation.
- Supply view/preset-specific text.
- Deliberately display no caption.

Facets displays the current preset name at the top of the canvas.

Compass retains meaningful relationship captions. Other views may use their name or leave that heading empty.

Keep canvas headings, area labels, physical gate labels and semantic roles separate. Changing "Parent" to a view name must not change relationship meaning.

Support localized built-in copy and literal user-authored labels safely. Do not require user presets or future extensions to add keys to K-Plex's compiled language catalogs.

### Area settings and the cog menu

Use the existing live area-capability mechanism, including `GraphActionPorts.canEditAreas`, rather than hard-coded view names.

Show Area settings only when the current scene supplies meaningful editable area controls. Otherwise hide it in the cog menu and other discovery surfaces; direct action invocation must also decline safely.

When switching to an unsupported view/preset, retire an active area-editing mode, captures and highlights. It must not leave normal keyboard behavior disabled.

Reuse shared area frames, measurement, clipping, scrolling, hover/highlighting, hit-testing, resizing and controls.

Keep area editability, scrollability and drop meaning independent. An area can scroll without being user-resizable, and resizing does not grant write authority.

Facets should expose meaningful region sizing through the shared mechanism. Type/preset defaults belong to shared configuration. Interactive per-canvas area overrides use existing session storage, scoped by preset and stable area ID so one preset cannot inherit another's unrelated overrides.

Preserve Compass's existing settings behavior and Mind Map's measured parent area.

### Bottom-left layout controls

Extend `CanvasViewSettingsContribution.layoutControls` and its existing host renderer rather than creating another toolbar.

Reuse `LayoutControls`, `LayoutSlider`, `LayoutCheckbox` and appropriate shared select/button primitives. Add a bounded control kind only for an actual need.

Controls must target the same validated fields and writer as native Settings. For preset-specific fields, extend addressing narrowly to identify the owning preset. Avoid a second set of mirrored values.

Document whether each control changes shared view/preset configuration or per-canvas state. Settings and live controls must stay synchronized.

Hide an empty control group. Unsupported Compass-specific controls must not appear in another view.

Preserve Mind Map's parent columns and density controls. Expose useful Facets spacing/sizing controls through the same contribution path.

## 6. Navigation: history, pins and F4 are mandatory shared inputs

Every view must honor explicit node destinations from history, pins and F4 search, as well as existing explicit file/link/node navigation and meaningful center drops.

Use the shared action/navigation pipeline with source/intent and the captured owning canvas. A view must not ignore these requests because it has a custom primary-click behavior.

Retain the accepted policies:

- Compass and Facets follow the chosen note as attention/center.
- Mind Map treats explicit destinations as root changes.
- Ordinary Mind Map branch clicks retain the root and toggle the relevant branch.
- Opening an editor remains a distinct action.
- In-scene Find selection/reveal is distinct from explicit F4 destination navigation; preserve their existing semantics.

Keep editor-save/admission guards, history/Footprints, Sidecar and document sync under their current owners. Record accepted navigation once.

A rejected transition must explain the restriction and preserve the current state. Do not silently change roots, discard edits or clear filters to force it.

Preserve modifier behavior, keyboard actions and native document opening through shared node components.

Test all destination sources in multiple canvases and a popout, including a delayed selection after focus changes.

## 7. Optional document sections and section-based connector origins

Distinguish three different features:

- Document section tree: headings within one note.
- Mind Map branch expansion: relationships between notes.
- Bottom-left canvas layout controls.

They must not share state or be confused in the interface.

The accepted #219 baseline declared `sections: false`. The #222 extension explicitly selects the pinned root through `sectionSource: "layout-root"`, composes source-owned rows/provenance and reserves measured outline space. A boolean change alone does not implement section-aware projection or connector routing. Facets deliberately remains unsupported.

Required now:

- Capability-based visibility for the lower-left section-tree control on the relevant node and all corresponding menu/keyboard entry points.
- Safe retirement of section mode on an unsupported view/preset transition.
- Preserve Compass's existing behavior.
- Facets initially hides section expansion.
- A shared, tested section-data/measurement/anchor boundary for a non-Classic view, demonstrated by an executable conformance fixture.

Reuse `src/index/SectionExpansion.ts` and the existing section renderer, parser/evidence rules, folding and lifecycle. Do not add a second heading parser, a private outline application, or section nodes to the persistent index.

The host supplies a bounded, current section snapshot for one explicitly requested document, with section hierarchy, identity, source provenance and availability. Layout consumes measured section rows/anchors.

Section identifiers are scoped to the current document revision; repeated heading names are not unique IDs. Edits, rename, deletion and folding must invalidate or rebind anchors safely.

Desired Mind Map behavior:

- The expanded section tree represents the map root's central structure, even when attention is on another note.
- Left/right branches with proven source-section evidence originate from the appropriate measured section row, on the appropriate physical side.
- Links without reliable root-section provenance use a documented aggregate root/header anchor. Do not guess sections from labels or target filenames.
- Collapsing a section routes applicable connectors to the visible ancestor according to a deterministic policy; collapsing the tree restores root ports.
- Canonical endpoints and relationship evidence remain unchanged. A visual section attachment grants no new relationship mutation authority.
- Multiple genuine declarations require an explicit deterministic provenance policy; do not silently pick the first matching heading.

Provide a typed sub-node/section-anchor reference that the shared renderer resolves against measurements. Do not let view code query private DOM elements or store screen coordinates as canonical graph facts.

Keep section expansion and native editor presentation compatible through explicit shared guards. Do not destroy a live editor to replace it with a tree.

Bound this work to a single root document. Explicit section expansion may use the existing on-demand source operation; ordinary layout and painting may not trigger body reads or parsing.

Shipping the full Mind Map section mode is optional in this assignment.

The capability gating, reusable tested anchor boundary and documentation are required. Enable production Mind Map sections only after the actual source, geometry, folding, navigation and native-editor tests pass. Otherwise retain `sections: false` and identify that production integration as follow-up work.

Do not describe a test-only capability as a shipped feature.

## 8. Facets layout and base behavior

The current attention note appears once at the center.

Its bounded direct neighbors occupy the surrounding category regions. Do not duplicate the focused note inside its assigned category.

Place a small badge immediately outside the central node's top-left edge:

- Assigned category label and configured background.
- Readable foreground through shared color/contrast utilities.
- Conflicting or Unassigned when applicable.
- Neutral technical status when classification cannot currently complete.
- Accessible explanation of the classification.

Implement this as a shared measured node decoration. It must follow editor expansion/resizing, participate in fitting and avoid gates and controls.

Render an ordered, configurable category collection around the center. Support and test 3, 4, 5, 6 and 7 categories. Remove fixed-five assumptions from geometry, classification, configuration and tests.

Keep empty categories visible. Place Conflicting and Unassigned in compact, reachable supplementary regions. Counts describe displayed local notes, excluding the center from peripheral counts.

Use optional decorative cycle guides. Enable them for Wu Xing and default them off for the other supplied presets; circular placement does not imply a workflow.

Maintain the current scope: attention plus bounded direct relationships. Preset changes do not introduce multihop expansion or corpus analysis.

## 9. Presets and configuration

Canvas view: Facets.

Selected preset: Wu Xing, PARA, etc.

Canvas heading: selected preset name.

Presets are configuration inside one registered view, not separate plugin registries.

Expose selection through:

- Canvas context menu → Preset.
- Views and lenses → Canvas view: Facets → Preset.

Manage them under:

Settings → K-Plex → Canvas behavior → Views → Facets.

Reuse existing style/lens manager patterns for add, duplicate, rename, reorder, delete and restore. Do not create another management framework.

A preset contains:

- Stable ID and editable name.
- Classification source/mode.
- Ordered categories with stable IDs, labels, colors and matching rules.
- Explicit assignment values/actions where supported.
- Conflicting and Unassigned colors.
- Layout defaults and guide preferences.

Preset definitions are shared settings. Selected preset is per canvas. Two Facets canvases must simultaneously support different presets.

Switching presets preserves the active note, lenses, filters, unsaved lens draft, Sidecar association and compatible native editor state. Preserve camera intent unless a deliberate fit/navigation operation requires reframing.

Restore selection independently. Deleting an in-use preset requires an explicit replacement; unknown/future IDs require a safe, non-destructive fallback.

Reuse the existing color picker, palette references, theme variables and light/dark color support. Category accents and badges must not replace node/link semantic styling or lens effects.

Each property preset chooses its own field. Do not hard-code `phase` globally. Multiple presets may intentionally share a property.

Ship editable templates:

| Preset | Field | Categories and canonical values |
| --- | --- | --- |
| ACE workflow | ace | Add=add; Connect=connect; Express=express |
| PARA | para | Projects=projects; Areas=areas; Resources=resources; Archives=archives |
| Wu Xing | phase | Water=water; Wood=wood; Fire=fire; Earth=earth; Metal=metal |
| GTD horizons | horizon | Actions=actions; Projects=projects; Areas of focus=areas; Goals=goals; Vision=vision; Purpose and principles=purpose |
| eACCESS | access | Encounters=encounters; Atlas=atlas; Calendar=calendar; Cards=cards; Extras=extras; Sources=sources; Spaces=spaces |

These property names are K-Plex adaptations, not prescribed storage formats of the original methods. Someday/Maybe is separate from the GTD horizons.

Preserve the maintainer's requested ACE Add/Connect/Express terminology and seven-category eACCESS adaptation. Built-in explanatory copy is localized; user labels and raw values are not translated.

Include a custom fixture with `state`: Seed, Research, Draft, Published.

Choosing a preset changes interpretation only. It does not rewrite properties, move files, create tasks or create relationships.

## 10. Classification, availability and lens-style rules

Keep one displayed peripheral occurrence per canonical note in this version.

Property mode:

- One category matches → assigned.
- Multiple distinct categories match → Conflicting.
- Successful evaluation with no match → Unassigned.
- Missing/currently unreliable input → technical unresolved status.

Preserve existing trimmed/exact matching and list behavior during migration. Do not silently change case sensitivity by substituting another helper.

Replace the user-facing Unavailable category:

- `Checking…` for genuinely pending current data.
- `Cannot classify` plus a reason for persistent/unsupported evaluation.

Keep unresolved notes discoverable without representing them as definitely Unassigned. Do not show an indefinite spinner for a permanent condition.

Advanced rules must reuse:

- `src/core/plex/predicate.ts`
- `src/core/plex/predicateParser.ts`
- `src/core/plex/lens.ts`
- `src/lens/GraphLensSimple.ts`
- Relevant condition-editor components currently composed by PlexFilter.
- The existing property/evidence adapters.

Extract a reusable condition editor where needed. Do not copy the complete Lenses panel or introduce another rule language.

Support existing expressions such as:

    note.phase == "water"
    note.state == "draft" && note.priority >= 3
    edge.role == "parent"

Retain the existing meanings and supported fields of node, note, file, this, edge and evidence. `this` identifies the owning canvas's focus. Do not invent unsupported selectors or treat suppressed evidence as an active relationship.

For relationship-dependent categories, evaluate relevant admitted canonical relationships between focus and candidate using explicit any-match semantics. Deduplicate within a category; different matching categories remain Conflicting. Do not pick an arbitrary first relationship.

Do not fabricate a self-edge to classify the center. Explain when a category requires a relationship context that does not apply to that center.

Keep classification rules independent of enabled filtering/styling lenses.

Preserve unknown-input handling, including negation. Missing metadata must not accidentally satisfy a negative condition. Any needed availability-aware extension belongs in the shared predicate owner with compatibility tests.

General numeric/date arithmetic is follow-up scope. Record needed expressions without adding eval, Function, DataviewJS or a private interpreter.

Compile rules per preset revision, not per node render or pointer movement. Read only dependencies for admitted nodes.

## 11. Shared drag/drop adapter and category assignment

Reuse #219's existing drag transport, payloads, hit-testing, previews, captured source identity, actions and lifecycle.

Finalize a view-facing target adapter that distinguishes:

- Explicit navigation target.
- Semantic relationship target.
- Property/category-assignment target.
- Unsupported/decorative target.

Views declare meaning and eligibility; shared host actions execute effects. Do not overload `dropRole` with a category name.

Keep existing support for nodes, native vault files and links. A payload's source does not itself grant authority to remove/relink a relationship.

For writable property presets:

- Moving a visible note from Water to Metal writes the configured field using Metal's explicit canonical assignment value.
- Preserve body text, relationships, location and unrelated metadata.
- The focused note can be assigned while remaining in the center.
- Dropping onto its existing category is a no-op.
- Provide an accessible Assign category action using the same implementation.
- Preview the field/value change, including that it affects other views using the same property.

Every writable category needs a canonical value, even if it recognizes aliases.

For a list field, preserve list shape and unrelated values; replace this preset's recognized memberships with the destination value. Do not discard unknown values or silently coerce an incompatible property type.

Unassigned can clear this preset's recognized assignment when that operation is safe and clearly described. Conflicting is diagnostic, not a writable value.

Rules describe membership; they do not automatically define inverse edits. Computed categories remain read-only unless an explicit safe assignment action is configured. Limit this increment's custom assignment effects to explicit property writes.

Keep tag/note-type compatibility. Their write semantics must use the relevant existing owner when supported; do not treat every classifier source as an arbitrary scalar YAML field.

Protect reserved, incompatible or ontology-sensitive properties through explicit validation and the correct action owner. A category drop must never quietly become a relationship rewrite.

Revalidate source file, owning session, preset/category revision, target and current field at commit time. Preserve the exact occurrence/provenance safeguards from #219 and its additiveOnly propagation.

Native editor dragover and drop remain owned by the native editor.

**Shared relationship-drop completion is also mandatory.** After a successful relationship mutation, each view must receive a completion outcome through the shared save/publication owner. A non-Classic view must never wait for Compass-only compatibility lists.

Retain the accepted #219 fix and add Facets regression coverage for:

- A legitimate relationship relink that changes a note from parent to child.
- An additive link/drop that must preserve an existing relationship.
- A completed save that clears "updating relationships".
- A failed/pending save that retains appropriate feedback.
- Switching or retiring a view while a relationship action is pending.

The new category-property assignment action must use its own appropriate write-completion outcome. Do not misuse the relationship completion callback to acknowledge a property write.

## 12. External drops, safe writes and undo

Accept external sources only when the shared adapter resolves them to a current eligible vault note: another K-Plex canvas, Obsidian file explorer, or a compatible link source such as Dataview.

Do not interpret arbitrary dragged text as authorization to edit a file.

For an already-related note, assignment changes its category in this neighborhood.

For an unrelated note, explain that assignment alone does not connect it to the focus. Allow classification alone; provide the existing explicit relationship composer as a separate connect action.

Do not silently create links, change attention or expand graph scope.

Cross-canvas assignment never removes the source canvas's relationships. Reject unsupported targets for YAML writes while retaining eligible read-only classification.

Use the existing native metadata mutation/save machinery with current identity, dirty-editor and concurrency guards. Never rewrite a whole note from a stale snapshot or bypass an admission guard because a drag was accepted.

Provide a bounded undo/revert for the changed field. Recheck the applied value before undo so it cannot overwrite a later edit. Do not assume programmatic metadata writes automatically enter native editor undo history.

Report success only after the actual write succeeds. Classification follows current published metadata; failed writes must not leave authoritative-looking optimistic membership.

## 13. Developer guide and API reference

Create:

- `docs/CANVAS_VIEW_DEVELOPER_GUIDE.md`
- `docs/CANVAS_VIEW_API.md`

Update existing view architecture/capability documentation and contributor links to avoid contradictory sources. Preserve historical validation evidence.

The guide must explain:

- How to create/register a built-in view using the supported export surface.
- Pure policy versus host/UI contributions and lifecycle.
- Canonical nodes versus occurrences, physical ports and section sub-anchors.
- Shared node components and mandatory base behaviors.
- Settings ownership, schemas, migrations, synchronization and missing extensions.
- Per-canvas state, restoration, navigation and editor restrictions.
- Menus, captions, badges, area capabilities and bottom-left controls.
- Drag/drop target meaning, mutation authority, property assignment and undo.
- **Relationship-save completion and status feedback across all views, including the Compass/non-Classic distinction.**
- Property/rule dependencies, availability, budgets and performance boundaries.
- Section capability gating and the precise state of Mind Map integration.
- Localization, accessibility, popouts and device-specific validation.
- Testing and packaging boundaries; downloadable-extension loading remains future work.

The API reference must identify actual exported interfaces/functions, their defaults, error/unsupported outcomes, ownership and compatibility rules. Clearly mark implemented versus reserved/future capabilities.

Include a small executable example view using the same interfaces and shared components. It must not import Compass/Facets/Mind Map private implementations.

Type-check documentation examples or exercise equivalent source examples in tests. Provide a capability matrix for Compass, Mind Map, Facets and the example.

The example should prove that registration, settings, menus, labels and supported controls work without adding another view-ID branch to the central renderer.

## 14. Performance and scope boundaries

No new parser, index, source scheduler, whole-vault scanner, predicate engine, native editor implementation, global state store or relationship writer.

Retain bounded configuration, expression, graph-read, scene and resource budgets. Dispose view/preset listeners, menus, subscriptions and pending work correctly.

Presentation-only operations—preset selection, colors, layout, filtering, menus, hover and camera—must not trigger note-body reads, semantic rebuilds or vault scans.

Explicit property edits follow normal incremental indexing. Explicit section expansion may use its existing bounded source operation.

Keep required scaling/responsiveness tests and focused no-extra-work assertions. Do not launch an unrelated indexing benchmark or architecture-refactor campaign.

## 15. Checkpoints, acceptance and delivery

Work in reviewable checkpoints:

A. Integrate accepted #219, including its shared relink-feedback correction, and validate the combined baseline.

B. Finalize shared API/persistence/UI contributions and conformance example.

C. Facets presets, centered layout, badges, colors and per-canvas selection.

D. Safe property assignment/drop/undo.

E. Shared rule authoring and classification.

F. Section capability/anchor proof, developer documentation and final validation.

Required coverage:

- Compass, Mind Map and Facets together, including main/popout ownership.
- Shared node behavior and modifier/keyboard/open/preview/editor regressions.
- History, pins, F4 destinations and separate in-scene Find behavior.
- Menu target capture, stale callbacks, availability and cleanup.
- Optional/empty canvas captions without changing semantic roles.
- Meaningful Area settings visibility and retirement of unsupported modes.
- Bottom-left controls and native Settings sharing one configuration owner.
- 3/4/5/6/7 regions, empty/dense scenes, long labels and expanded center editor.
- Badge geometry/colors/contrast and dynamic preset heading.
- Independent presets and restoration in multiple Facets canvases.
- Settings migration, incoming sync, concurrent preset edits, failed saves, missing definitions, future payloads and bounded invalid data.
- Rule match/conflict/unassigned/unknown behavior, including negation and multiple relevant relationships.
- Actual drag-start → native payload → target action → actual file write.
- Scalar/list/conflicting assignments, no-ops, invalid targets and safe undo.
- Cross-view imports preserving source relationships and #219's actual Save fix.
- **Native relationship relink roundtrip: create a parent relationship, move the same note into the child relationship, verify the resulting canonical relationship and persisted metadata, and verify "updating relationships" clears after successful publication.**
- **Run that completion regression against at least one non-Classic view and Compass. Confirm no Compass-only compatibility-list dependency remains in the generic path.**
- **Saved-pending, rejected save, stale publication, view-switch and unmount cases must not falsely report successful completion or leave permanent pending UI.**
- Dirty editor content/caret, native text drops, Sidecar and camera preservation.
- Sections hidden where unsupported; real shared data/anchor proof, duplicate headings, fold routing, revision changes and fallback root anchors.
- Generic cross-links retaining evidence and exact displayed endpoints.
- Registration and contributions without private built-in imports.
- No additional acquisition from presentation and bounded rule work.

Use required Node 22.22.2 and real dependencies. Run repository verification, scanner, production build, exact-final-head CI and applicable exact-build Windows native tests in the authorized disposable environment.

Retain known baseline limitations explicitly. Emulation is not physical-device acceptance. Preserve failure evidence and restore all test-owned resources.

Update #220's specification and API docs to actual behavior. Provide a small sample vault for the five presets plus the custom State example, and authentic screenshots of the implemented UI.

Keep previous validation attributed to its exact source. It does not certify this expanded scope. Report remaining checks and up to three priority manual tests. Do not claim optional Mind Map sections shipped unless they actually did.

In GitHub comments identify yourself as "Zsolt's Codex Agent". Follow the repository's progress and handoff requirements.

This authorizes implementation, commits, pushes and PR/documentation updates on #220 after #219 merges. It does not authorize merging either PR, force-pushing, releasing, installing downloaded code or deploying to a personal vault.

Preset attribution references:

- https://fortelabs.com/blog/para/
- https://gettingthingsdone.com/2011/01/the-6-horizons-of-focus/
- https://www.linkingyourthinking.com/
- https://www.linkingyourthinking.com/download-lyt-kit

The maintainer's supplied drawings are the source for the requested ACE wording and seven-category eACCESS adaptation.


Current area behavior: bottom-edge pointer direction follows the existing declared resizeEdge. All status regions share bounded per-canvas resizing with compact220 defaults and independent160-1200 overrides. The status column sits beyond the measured category envelope with extra spacing. Literal area labels are preserved in the shared accessible controls.

## Responsive area contents and Help editing

Area width uses the shared measured grid: cards automatically fill multiple columns when their measured widths, badge reserves, gaps and padding fit. Narrowing the area returns to fewer columns. No camera scale, classification, property read or semantic rebuild is needed to choose columns. Width remains per-canvas state, separate from saved preset defaults.

The preset Help source occupies a full-width row below its description. It retains the existing detached draft, native preview, Save/Cancel and stale-owner guards.


### Consistent node status presentation

Combined Diagnostics and uncertain focused-note classifications use the shared below-card node status (the same component as Mind Map cycle/preparation labels), rather than colored category chips. Assigned focus categories retain their colored chip. The common node/view badge API declares the status presentation and measures its bottom clearance. Bounded Facets areas paint ordinary connectors only for cards intersecting their scrolling viewport. Routes to hidden rows disappear together with their markers, labels and hit targets. Scrolling restores the same canonical attachments without changing evidence or indexing; a partially clipped card can retain a read-only boundary mark when its gate is outside the viewport.
