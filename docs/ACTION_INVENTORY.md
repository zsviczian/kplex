# Action inventory and compatibility boundary

This inventory records the bounded feature assignment in `ACTION_MANAGER_IMPROVEMENT.md`. Structural C15–C26 work remains paused. `src/core/plex/actions.ts` is the portable metadata owner; `src/application/ActionManager.ts` resolves fresh surface/shared-command targets and accepts execution. Host effects remain in existing plugin services. App and PlexGraph retain their state and projection/camera policies.

The catalog contains fixed actions, not commands generated from files, fields, edges or saved history. A descriptor with no mounted/capable implementation is unavailable. Publication controls Obsidian discovery independently of local shortcuts. Commands use the public registration API with no global default hotkeys.

## Preserved commands

All IDs below are **local Obsidian IDs**; Obsidian owns the existing `k-plex:` prefix. All remain published on upgrade. Ordinary commands dispatch through the manager after a pure check. Ontology commands retain `editorCheckCallback` and a short-lived invocation token for the supplied editor/cursor field.

| Existing command | Catalog action | Canonical operation / target |
| --- | --- | --- |
| `kplex-start` | `surface.open-tab` | `activateView`; native surface opening |
| `kplex-rebuild-index` | `index.rebuild` | `rebuildIndex`; existing indexing owner |
| `kplex-copy-index-diagnostics` | `index.copy-diagnostics` | Existing diagnostics clipboard operation |
| `kplex-open-popout` | `surface.open-popout` | Existing window-opening path; device capability retained |
| `kplex-open-sidepanel` | `surface.open-sidepanel` | `activateSidepanel` |
| `kplex-search` | `search.focus` | App search focus; suitable surface ownership |
| `kplex-add-child` | `relationship.create-center.child` | `openRelationModal`; shared command center |
| `kplex-add-parent` | `relationship.create-center.parent` | Same composer; shared command center |
| `kplex-add-friend` | `relationship.create-center.left` | Same composer; semantic friend role |
| `kplex-add-challenger` | `relationship.create-center.right` | Same composer; semantic challenger role |
| `kplex-sync-tab-from-plex` | `document.sync-from-center` | `syncMostRecentTabWithKplex`; shared center |
| `kplex-sync-plex-from-tab` | `center.sync-from-document` | `syncKplexWithMostRecentTab`; explicit document policy |
| `kplex-focus-active-note` | `center.focus-active-note` | Existing active-note focus policy |
| `kplex-ontology-select` | `ontology.assign.select` | Editor field chooser → `assignFieldToOntology` |
| `kplex-ontology-parent` | `ontology.assign.parent` | Supplied editor field → parent assignment |
| `kplex-ontology-child` | `ontology.assign.child` | Supplied editor field → child assignment |
| `kplex-ontology-left` | `ontology.assign.left` | Supplied editor field → friend assignment |
| `kplex-ontology-right` | `ontology.assign.right` | Supplied editor field → challenger assignment |
| `kplex-ontology-previous` | `ontology.assign.previous` | Supplied editor field → previous assignment |
| `kplex-ontology-next` | `ontology.assign.next` | Supplied editor field → next assignment |
| `kplex-ontology-hidden` | `ontology.assign.hidden` | Supplied editor field → hidden assignment |
| `kplex-ontology-excluded` | `ontology.assign.excluded` | Supplied editor field → excluded assignment |

Seven newly default-published commands are `kplex-actions`, `kplex-configure-actions`, `kplex-focus-graph`, `kplex-history-back`, `kplex-history-forward`, `kplex-toggle-pin` and `kplex-open-pins`. Other configurable actions are publishable with their catalog's stable IDs, initially unpublished. Composer session entries have no host command.

## Preserved local mappings

The compatibility exports in `internalHotkeys.ts` remain available. Migration reads **raw persisted data before merging defaults**, uses the existing legacy sanitizer and translates `null` to explicit `[]`. Legacy Latin letters/digits become physical `KeyX`/`DigitN` bindings, matching the historical matcher. Named keys remain logical. Unknown legacy entries are bounded compatibility data and never dispatch.

| Legacy action | Catalog action | Existing local default |
| --- | --- | --- |
| `moveUp` | `selection.move.up` | ArrowUp |
| `moveDown` | `selection.move.down` | ArrowDown |
| `moveLeft` | `selection.move.left` | ArrowLeft |
| `moveRight` | `selection.move.right` | ArrowRight |
| `sectionUp` | `selection.section.up` | Alt+ArrowUp |
| `sectionDown` | `selection.section.down` | Alt+ArrowDown |
| `sectionLeft` | `selection.section.left` | Alt+ArrowLeft |
| `sectionRight` | `selection.section.right` | Alt+ArrowRight |
| `activate` | `node.activate` | Enter; established neighbor activation/center rename compatibility |
| `focusSearch` | `search.focus` | F4 |
| `focusFind` | `find.focus` | Mod+F |
| `addParent` | `relationship.create-center.parent` | Mod+ArrowUp |
| `addChild` | `relationship.create-center.child` | Mod+ArrowDown |
| `addFriend` | `relationship.create-center.left` | Mod+ArrowLeft |
| `addChallenger` | `relationship.create-center.right` | Mod+ArrowRight |

`Mod` resolves from the environment's platform convention. New logical mnemonic defaults do not replace explicit migrated/user mappings. Disabled bindings and false publication survive subsequent loads. Fresh installs enable crossing sections at arrow boundaries; any existing saved settings object is an upgrade and preserves the previous boundary behavior.

## Interaction dispositions and retained owners

“Configurable” means a catalog action reachable from local action/help/settings and, where metadata allows, a published command. A local graph shortcut needs actual graph ownership; visibility or the workspace's active leaf is insufficient. Native protocols are not configurable global graph actions.

| Pointer/control meaning | Disposition / catalog route | Canonical owner and consumed route |
| --- | --- | --- |
| Click node; select/reveal displayed occurrence; section jump | Configurable `node.activate`, `selection.move.*`, `selection.section.*`, `selection.center`, `nodes.open` | PlexGraph occurrence selection/reveal; App `activate`; projected rows only |
| Double-click/open file, URL, unresolved node or heading | Configurable `node.open`, `node.edit` | Existing notes/URLs center and ensure the managed sidecar via `openSidecar`; sections retain `openSection`, ghosts retain deliberate materialization, and `node.edit` keeps its document-opening policy |
| Open existing tab/new tab/adjacent pane/pop-out/browser/web viewer | Configurable `node.open.focus-tab`, `node.open.{new-tab,split,window,browser,web-viewer}` | `focusOpenFileTab`, `openFileInNewTab`, `openFileInAdjacentPane`, `openFileInPopout`, `openUrlInBrowser`, `openUrlInWebViewer`; owning leaf/document and device predicates retained |
| Node context menu, rename, note type, copy link, delete | Configurable `node.context-menu`, `node.rename`, `node.note-type`, `node.copy-link`, `node.delete` | Existing context menu/RenameNoteModal/note-type dialog/delete service; delete requires selection or explicit target |
| Node/gate Add note; create parent/child/friend/challenger/previous/next | Configurable `relationship.create-center.*`, `relationship.create-selected.*` | `RelationModal` and canonical `createRelationToPage`; center and selected origins remain distinct |
| Drag connection; choose target; visible connection mode | Configurable `relationship.connect`, `relationship.connect-visible` plus retained pointer gesture | Existing relation composer and graph gesture policy; roles are semantic, never a previous/next-to-physical-gate cast |
| Connection details, relink, unlink | Configurable `relationship.details`, `relationship.relink`, `relationship.unlink` | Existing evidence picker/RelationshipExplanationModal and canonical writers; inferred-only evidence is inspectable, not fabricated removable data |
| Create/return, create another, follow, edit, cancel | Session `composer.{submit,another,follow,edit,cancel}` | Existing composer submit/close callbacks, captured origin and explicit saved/pending outcomes; no global commands |
| Search input and Find control | Configurable `search.focus`, `find.focus` | App search focus and PlexGraph Find disclosure; search selection remains a native list operation |
| Back/forward buttons and history footer | Configurable `history.back`, `history.forward`, `history.open` | App history cursor and complete searchable picker; missing history never materializes a file |
| Pin/unpin, pinned footer, ordered slots | Configurable `pin.toggle`, `pin.add`, `pin.remove`, `pins.open`, `pin.open-slot.1`…`.9` | Existing pin persistence and App activation/picker; saved slots are resolved before hydration/filtering |
| Expand/fold center Markdown sections or heading descendants | Configurable `sections.{toggle,fold-all,unfold-all}`, `section.{toggle-level,fold-descendants,unfold-descendants}` | PlexGraph's existing transient section projection/fold sets; not ontology tree folding |
| Depth, aliases, connectors, areas, filter/lens/sort/visibility controls | Configurable `view.depth.toggle`, `view.aliases.toggle`, `view.connectors.toggle`, `view.areas.toggle`, `view.{filters.open,lens.choose,sort.choose,visibility.open}` | Existing App toolbar setting callbacks and native filter disclosure; presentation-only effects |
| Layout controls, zoom, fit, pan | Configurable `view.layout-controls`, `view.zoom-in`, `view.zoom-out`, `view.fit`, `view.pan.*` | Existing PlexGraph `applyCamera`, `fit` and layout disclosure; no second camera model |
| Embedded editor, sidecar, sync menu, move/detach/fold sidecar | Configurable `editor.focus`, `view.center-editor.toggle`, `view.sidecar.*`, `view.sync.choose` | Existing embedded editor and managed companion-leaf operations; position literals remain left/right/above/below |
| Action menu/help/preferences | Configurable `actions.open`, `keyboard.help`, `actions.configure` | Catalog-generated command palette, separate read-only KeyboardHelpModal and native settings; palette launch captures center separately from strict selection |
| Native button Enter/Space, link activation, slider arrows, menu traversal, Tab | Native widget protocol | Widget/native Scope owns delivery; graph dispatcher does not expand into these contexts |
| Editor caret, clipboard, undo, composition/dead/AltGraph input | Native editor/input protocol | Existing editor/suggester; only explicit focus-transfer actions may participate in owned editor regions |
| Suggestion acceptance before composer submit | Session/native protocol | Existing suggester acceptance consumes its event; it cannot also submit |
| Shortcut recording | Native isolated recorder protocol | Settings recorder; action dispatch is suspended during recording |

Pointer drag/resize/touch suppression remains in the scene implementation. Those mechanics do not become action-manager state. Context-menu and toolbar callbacks must converge on the same manager operation/target/outcome where configurable; direct calls to the canonical service must be audited for parity before delivery sign-off.

## Acceptance and evidence boundary

Foundation tests are in `tests/action-foundation.test.mjs`. They cover command/catalog identity, cheap availability, shared/local targets, strict selection, capture and generation checks, run/cancel/session guards, malformed arguments, outcomes, migration, exact chord/ambiguity policy and public command diffs. They do not establish native Scope precedence, global-hotkey retention, keyboard layout transport, physical-device touch or complete operation availability. Those remain in the assignment's exact-build Obsidian H01–H28/platform acceptance lane.

No fallback plugin discovery, global graph-key capture, second semantic classifier, second history engine, bulk relationship writer or host hotkey-file editing is introduced by these contracts.

## Laptop-friendly fresh defaults

The legacy migration table above describes preserved existing bindings. Fresh defaults use / search, ? read-only help, R rename, 0 select center, M node menu, Ctrl/Cmd+Shift+G graph focus and Ctrl/Cmd+Shift+E associated editor focus. No fresh default requires a function key, Home or ContextMenu key. Saved bindings and explicit disables survive; Reset adopts the current default. Printable-only chords, including Shift punctuation, are registered and compiled only for the graph region.
