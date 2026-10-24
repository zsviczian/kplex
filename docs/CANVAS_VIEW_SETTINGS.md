# Canvas terminology and view-specific settings

Prepared by Zsolt's Codex Agent, 2026-10-24. **Implementation in progress; automated/native acceptance is recorded separately.** Opening commit was specification-only.

## Starting point and dependency

This branch was created from accepted `main@659697a686f341497725dfb31e94a8bc2bcf2b25`. The design was reviewed against [PR #215](https://github.com/zsviczian/kplex/pull/215) at `030d0f0558c78b25be0d27fba40caca60b9361cd`, which was not yet merged when this specification was prepared. #215 is now accepted as `main@4b9a4f5127409829acd3abf0b617286902a68d8a`; that main was integrated normally into this branch before implementation.

**Before implementing, fetch and integrate the latest accepted main into this existing branch. Confirm #215 has landed, record the actual base SHA, reread AGENTS.md, CONTRIBUTING.md, docs/ARCHITECTURE.md and the current capability matrix, and reconcile this plan with the accepted code.** Preserve this specification and concurrent edits. Do not implement against the stale planning base, force-push, merge a PR, release or deploy to a personal vault without authorization.

Implement this smaller settings assignment first. The later Mind Map and Wu Xing planning PRs must update from main again after this work lands; adjust their configuration contracts to the actual implementation rather than assuming the proposed names below are existing APIs.

## Outcome

Use **canvas** for K-Plex's visual working surface and **Compass** for its existing directional view. Keep the product name **K-Plex**. Separate controls shared by every canvas from controls belonging to an individual view, and provide a small static contribution mechanism so the next two views can add their own settings without restructuring the settings tab again.

This is a naming/settings-composition change. Preserve current behavior, saved settings, geometry, action IDs, shortcuts, themes, ontology and indexing. Occurrence-based editor hosting remains a separate required task described in [#215's editor specification](https://github.com/zsviczian/kplex/blob/030d0f0558c78b25be0d27fba40caca60b9361cd/docs/PLEX_OCCURRENCE_EDITORS.md); do not expand this PR into that native-host refactor.

## Terminology decisions

| Concept | User-facing wording | Compatibility |
| --- | --- | --- |
| Product | K-Plex | Keep name, plugin ID `k-plex`, repository/package identifiers and branding. |
| K-Plex visual surface | canvas; K-Plex canvas where context is ambiguous | Replace standalone Plex referring to this surface in active UI/help copy. |
| Main behavior settings page | Canvas behavior | Keep existing translation keys where useful; translated values change. |
| Existing view | Compass | Keep internal/serialized definition ID `classic` and fallback behavior. |
| View picker | Canvas view | Compass is the first production option. Add other options only when implemented. |
| Existing Compass background feature | Area tint / directional background, within Compass context | Keep `colorPreferences.compass`, theme tokens and existing color editor ownership. |
| Host's native Canvas feature | Obsidian Canvas; Canvas file where appropriate | Preserve `.canvas`, native type/extension/API names and descriptions of actual Canvas attachments. |

Obsidian already has a [Canvas core plugin and .canvas format](https://help.obsidian.md/plugins/canvas). Audit text by meaning; do not perform an unrestricted Plex-to-Canvas replacement. In a global command list or menu, use wording such as `K-Plex: Open canvas` so the feature is distinguishable from native Canvas. Changing vocabulary is a product-language decision; this PR makes no legal conclusion about names or similarity.

Update all eight shipped language catalogs, tooltips, accessible labels, current command names, empty/error states, relevant Settings search metadata and current end-user documentation in this repository. Preserve historical release/validation records, verbatim quotations, source-code names, file paths, action IDs, workspace view IDs, CSS classes/tokens, stored keys and URLs. Update current contributor instructions that prescribe settings labels or page paths. Do not silently modify the separate kplex-help repository.

## Information architecture

Use native declarative settings pages and existing controls. Suggested page structure:

```text
Settings > K-Plex
  Actions and shortcuts
  Canvas behavior
    Navigation and interaction        [shared]
    Node editor                       [shared defaults; retain actual capability limits]
    Content visibility                [shared]
    Views
      Compass                         [first view-specific page]
        Arrangement and sizing
        Neighbors and expansion
        Area tint                     [existing editor/owner]
      Mind Map                        [registered by its later implementation]
      Wu Xing                         [registered by its later implementation]
  Ontology                            [shared relationship interpretation]
  Visual styling                      [shared themes, colors, node/link appearance]
  ...existing remaining pages
```

Use a `Views` group containing navigable view pages, rather than an extra page containing only another list of pages. The existing view should have a stable name, Compass, rather than Default view: being the default is a selection policy, not the view's identity. Do not add a new startup-default preference merely to perform this rename. Existing per-native-session view selection/restoration remains authoritative.

### Ownership inventory to implement and verify

Inspect all actual consumers before moving a control. Moving its UI location does not move its storage or change its runtime meaning.

| Existing controls/keys | Destination and rule |
| --- | --- |
| `hoverHighlightRequiresAlt`, `gateTooltipRequiresAlt`, `areaOutlineRequiresAlt`, `animationSpeed`, `allowAutozoom`, `mouseInteractionMode`, `startInPopout` | Shared Canvas behavior. View policies can later define when navigation fits; this PR does not change that behavior. Area-only controls describe applicability rather than inventing areas for every view. |
| `confirmFileDelete`, `removeOntologyLinksOnDelete` | Shared navigation/interaction safety. Update existing deep links and focus targets after the page rename. |
| `centralNodeMarkdownMode` | Shared Node editor default, using its current storage and host behavior. Do not advertise arbitrary-node or simultaneous editing as supported. Existing editor/Sidecar default separation stays intact. |
| `showInferredNodes`, `showVirtualNodes`, `showURLNodes`, `showAttachments`, `showFolderNodes`, `showTagNodes`, `showPageNodes`, `excludeFilepaths` | Shared content visibility. Retain semantics, hidden-target rules and existing refresh ownership. |
| `showCrossLinks`, `showNeighborCount`, `groupRelations` where already exposed | Shared, capability-sensitive presentation. Keep toolbar and settings surfaces consistent; avoid creating duplicate preferences. |
| `maxItemCount` | Keep shared in this increment: #215's generic read and scene-admission budgets consume it too. Do not label it Compass-only while it still limits other definitions. Retain its numerical behavior; document any imperfect legacy wording. |
| `parentMaxHeight`, `childMaxHeight`, `friendMaxHeight`, `siblingMaxHeight`, `siblingRelativeSize`, `renderSiblings`, `compactView`, `minLinkLength` | Compass controls. Keep legacy flat storage and precedence. |
| `parentColumns`, `childColumns`, `compactingFactor`, `horizontalCompactingFactor`, `lateralArrangement`, `graphDepth` and existing device/surface `layoutProfiles` | Compass layout/expansion policy. Preserve desktop/tablet/phone and leaf/sidebar/popout rules and toolbar parity. Move controls that exist; do not introduce a second profile manager. |
| `inferAllLinksAsFriends`, `inverseInfer`, `datePropertyRelations` | Shared Ontology page, because these affect canonical relationship interpretation. Preserve their existing semantic invalidation; relocating a control is not permission to make it view-specific. |
| `inverseArrowDirection` | Shared display/link presentation, not ontology mutation. Keep its current meaning. |
| `colorPreferences.compass` and its existing modal | Compass Area tint entry. Reuse appearance owner, light/dark theme resolution, durable save queue and future-schema protections. Do not copy palette values to another namespace or alter theme/reset behavior. |
| Typography, label/image settings, general node/link styles and themes | Retain shared Visual styling. Do not move all central-node appearance keys merely because their legacy names contain central. |

Source: [current settings definitions](https://github.com/zsviczian/kplex/blob/030d0f0558c78b25be0d27fba40caca60b9361cd/src/settings.ts#L2282-L2540), [view scene admission](https://github.com/zsviczian/kplex/blob/030d0f0558c78b25be0d27fba40caca60b9361cd/src/ui/plexViews/prepareScene.ts), and [Classic contribution](https://github.com/zsviczian/kplex/blob/030d0f0558c78b25be0d27fba40caca60b9361cd/src/ui/plexViews/classic/integration.ts). These references describe the reviewed revision; reread accepted main.

## Small internal settings extension

Add a host/UI-side contribution keyed by the existing stable view ID. It supplies a localized page label, settings definitions, validation/defaults and a narrow read/update operation for that view's configuration. Use actual installed `SettingDefinitionItem` types and the existing native Settings lifecycle. Pure projection/layout definitions must not import Obsidian settings types or receive App/plugin/GraphIndex objects.

Classic's contribution delegates to existing flat settings/profile/color owners. New views receive the bounded, versioned `canvasViewSettings[viewId]` namespace described in the implemented interface below. Do not eagerly add empty production preferences for unfinished views.

Choose one authority per field:

- View-type configuration, such as Mind Map spacing or Wu Xing property/value mapping, is vault/plugin configuration shared by instances of that type and applied live through the existing settings writer.
- The selected view, map root, expansion intent, camera, selection and editor bindings belong to their existing native session/workspace or transient owners. Do not copy type configuration into every session's `states` payload.
- Existing #215 per-session area heights retain their current scope; do not shadow one field with both a global and session value without a documented precedence rule.
- Per-canvas overrides of new type configuration are deferred. The UI must say when a change applies to all canvases using that view.

Pass effective configuration to the view through a narrow, explicit channel separate from its session state. The settings PR should deliver the configuration plumbing, not editor hosting, multihop acquisition, arbitrary view actions or a general plugin SDK.

Integrate new namespaces with migration, settings signatures/effect classification, serialized save queue and incoming data.json synchronization. Presentation configuration must not invalidate source facts, reparse bodies, rebuild relationships or reset current canvases. A real note edit keeps its normal index maintenance. Update only the selected field against the latest queued settings; do not replace the whole view map and overwrite another device's edits. Preserve unknown view IDs/future-version payloads with bounded validation and a read-only/unavailable result, not silent reset. Exclude view workflow/configuration from foreign ExcaliBrain imports and appearance-theme capture unless a field already belongs to the established appearance owner.

## Implementation checkpoints

1. Update from accepted main, inventory old settings rows, control keys, commands, search/deep-link paths and consumers. Capture representative legacy settings including per-device overrides.
2. Establish Canvas/Compass wording and native page structure; extract the Compass settings contribution without changing values or behavior.
3. Add the finite registration/configuration channel and prove it with a test-only second view. Its setting must round-trip and reach the effective view input, not just render an inert row. Keep it out of production registration/bundle.
4. Update settings search, direct navigation/focus helpers, gear/context-menu links, localization, current docs and affected tests.
5. Validate and publish the exact shared commit. Record final paths/interfaces/storage ownership for the Mind Map and Wu Xing agents; adjust their drafts before implementation if the contract differs.

## Acceptance and validation

- Every previous control remains reachable exactly once at the intended location. Settings search lands on moved controls in main and Settings popout windows; Back/Escape/focus and modal teardown remain correct.
- Compass is the first named view page; unavailable future views are absent. `classic` IDs, existing action IDs/shortcuts and workspace state round-trip unchanged.
- Existing flat settings, layout/typography profiles, themes, palette reset and external-settings merges retain semantics. No mass migration into a new Compass object.
- A test-only view contributes settings without editing a growing switch statement in `KplexSettingTab`. Invalid/future configuration fails safely and does not discard unknown payloads.
- Editing a type preference updates intended view instances without switching them, changing roots or stealing editor/Sidecar focus. Another type's values are untouched.
- Tests distinguish UI relocation from semantic policy: layout/configuration saves cause zero extra source reads/parses/rebuilds; ontology toggles retain their established effect classification.
- A terminology audit leaves only explained exceptions for standalone Plex; K-Plex branding and native Obsidian Canvas references stay correct in all catalogs.
- Run Node 22.22.2 `npm run verify`, focused settings/localization/external-settings/view-session/browser tests and actual native settings navigation/search/modal checks on the final build. Preserve prior assertions; report unrun lanes honestly.

Highest-value manual check: search for a moved Compass control, change it, navigate Back, reopen Settings in a popout and confirm the saved value and correct focus; then open a real .canvas attachment and confirm its labels remain distinguishable from the K-Plex canvas.

## Scope and handoff

No new view implementation, new semantic policy, occurrence-editor runtime, multihop/corpus readers, external plugin loading, renderer replacement or unrelated refactoring. Keep C15–C26 paused and preserve accepted #215 behavior.

The later view PRs can proceed independently after #218. The Mind Map agent owns M0 for arbitrary-node editing; Wu Xing can implement and validate its complete view using the existing attention-following editor without waiting for M0. A settings carveout alone does not prove arbitrary-node editing, and M0 must remain compatible with existing editor definitions.

At implementation start, update the single HANDOFF.md according to the repository workflow. This durable design is not a second transient session log. Opening-draft validation is source/document review only: no runtime code or build/test pass is claimed.


## Maintainer selector decision

The primary view picker is the **Canvas view** native dropdown at the top of the existing **Views and lenses** panel, above its filtering controls and separated by the existing section border. Compass is first, retains `classic`, and remains visible with a disabled dropdown when it is the only production view. Production options come from the existing closed view registry; test-only fixtures never enter the shipped registration or bundle. The previous standalone view-selector icon is removed.

`App` supplies its exact `documentSession.plexView` to `PlexFilter`. The panel captures that owner when opened; `PlexViewSelector` subscribes to the same owner and submits through its existing `canSelect`/`select`/lifetime guards. It never resolves a globally active canvas. A rejected editor-incompatible transition retains the actual view and explains why; repeated rejection restores the native select value synchronously. An unavailable or retired owner is also explained. There is no optimistic selection store or new transition lifecycle.

Changing a view keeps `PlexFilter` and its existing FloatingLayer mounted. Quick filters, layout mode, enabled/persisted lenses, unsaved lens drafts and child-color/pending-save safeguards remain with their current owners. View selection is not added to the lens schema or type configuration. Other canvases retain their own root/camera/selection/editor/Sidecar ownership. Workspace restoration remains `PlexViewSession`'s existing allowlist and unknown-view fallback.

Validation includes two independent sessions/documents and an actual native main/popout pair, session restoration, native-select accessibility and narrow sizing, blocked transitions, retained drafts and zero extra same-scope acquisition. These are focused correctness/work-boundary checks; no separate performance study is required. Future data demands require an explicit bounded policy.

## Implemented configuration interface (pending final acceptance)

- `core/plex/views/configuration.ts`: `PlexViewConfigurationSchema` declares version1 plus known field defaults/validators; `readViewConfiguration` returns `available` with detached effective values or `unavailable` with invalid/unsupported reason. `editViewConfiguration` updates one supported field against the latest accepted map.
- `PlexViewDefinition.configuration` is the one schema authority. `PlexViewInput.configuration` and layout context carry effective configuration separately from `state`. The host always resolves that channel before generic projection/layout. Invalid/future configuration cannot become a successful empty scene; existing local recovery remains available.
- Persisted `settings.canvasViewSettings[viewId]` is `{version:1, values:{field:value}}`. Effective reads admit at most32 namespaces,64 fields, depth8 and16,384 UTF-16 code units of encoded JSON per namespace, with a bounded traversal. Unknown IDs/fields/metadata and invalid/oversized saved payloads round-trip inertly; unsupported data is read-only rather than silently reset. Only edited fields are materialized. No empty Mind Map/Wu Xing objects are created.
- `ui/plexViews/settingsContributions.ts`: `CanvasViewSettingsRegistry` composes native declarative pages for the existing static view registry. Contributions receive a translator and validated `key(field)` helper; their native controls use `canvasView:<viewId>:<field>`. The Compass contribution delegates to its old flat settings, six device/surface arrangement rows and existing tint action.
- `KplexPlugin.updateCanvasViewSetting(id, field, value)` uses the existing serialized writer and incoming-settings reconciliation. It prepares against the latest accepted map, writes durably before publishing, and refreshes presentation without semantic work. The new namespace alone has explicit field-level merge domains; existing appearance/ontology/other roots retain their atomic behavior. Remote schema/map replacement retires stale field owners; independent fields/types merge, including incoming data captured during an in-flight save.
- Native failed writes retain the committed value. A field-specific local recovery epoch extends the existing received-control keys before native Settings refresh, because the host deliberately retains focused controls with unchanged keys. Only the rejected known field is retired; delayed old handlers cannot save again and unrelated fields keep their owners. No control value or configuration is stored in that UI epoch.
- `viewSettingsRegistry` is the finite host composition root. A test-only second view contributes an actual native setting and consumes its effective layout value; tests construct independent registries. This is an internal boundary, not an external loading SDK.

Type configuration applies to all canvases of that view. Selected view, roots, folds, camera, selected occurrences and editor bindings stay per canvas/session. Existing non-Compass area heights retain their per-session workspace scope. Compass heights remain their existing flat preferences. No field is copied into both type settings and session `states`. Foreign ExcaliBrain imports and appearance-theme capture exclude the new view workflow namespace.

## Authorized delivery sequence

The maintainer's later steer authorizes committing/pushing #218, exact-head automated/native verification and CI, refreshing main normally, then marking ready and merging #218 without another confirmation. Read back the actual merge and post its accepted contract/validation to #220 as Zsolt's Codex Agent. Immediately continue existing #219 branch `2026-10-24-canvas-mindmap`, integrate latest accepted main and begin isolated M0 from `PLEX_OCCURRENCE_EDITORS.md`. #219 implementation/publication is authorized; merging #219/#220, releases and production-vault deployment remain unauthorized. Coordinate shared renderer/session/action/contracts with the Windows partner before M0 changes.

The corrected dependency is explicit: #220 can implement and validate complete Wu Xing after #218 with the existing attention-following native editor, independently of #219/M0. M0 is required for Mind Map's arbitrary-node editing and must preserve existing Compass and non-Classic attention-following definitions without simultaneous API migration. No editor work belongs in #218.
