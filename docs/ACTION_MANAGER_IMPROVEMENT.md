# K-Plex action and hotkey management

**Implementation design and delivery handoff**  
**Research date:** 8 October 2026  
**Baseline:** [`zsviczian/kplex` — `main` HEAD](https://github.com/zsviczian/kplex/tree/main), verified on 8 October 2026 at [`67ee400`](https://github.com/zsviczian/kplex/commit/67ee400b56c7706d795412d6f6631b365d15c394); manifest version `0.1.0`, minimum Obsidian version `1.13.0`  
**Status:** implemented on the `action-manager` working branch. Original action manager, native settings integration and keyboard usability checkpoints are accepted; the final Option/typing-selection follow-up is accepted. See [Refactor plan](../Refactor%20plan.md) and [validation evidence](validation/keyboard-type-selection-2026-10-08.md). The final recorder/badge polish passes full software verification; native acceptance awaits unlock ([record](validation/recorder-polish-2026-10-08.md)). The design below records its baseline; maintainer follow-ups document later behavior changes.

**Read map:** [Current code](#2-evidence-and-current-code-assessment) · [Architecture](#5-small-architecture-with-explicit-ownership) · [Targets and focus](#7-target-resolution-surfaces-and-focus) · [Action catalog](#9-action-catalog-and-command-publication) · [Keyboard workflows](#11-end-to-end-keyboard-workflows) · [Migration](#12-preferences-conflict-management-and-migration) · [Implementation plan](#15-implementation-sequence-and-bounded-review-points) · [Tests](#16-verification-plan)

## 1. Decision and intended outcome

Introduce a small, typed **Action Manager** around K-Plex's existing operations. An action is a user intent, not a keyboard event. Give each intent one stable identity, one eligibility check, one target policy, and one execution path. Local shortcuts, Obsidian commands, the local action menu, toolbar buttons, and context-menu entries become adapters to that path.

Keep the current graph index, relationship writers, React state ownership, view shells, search implementation, and layout algorithms. This is an incremental unification, not a replacement application framework.

The user-facing result must support this loop without a mouse:

> Find an idea → inspect its neighborhood → select a node → open or edit it → add another idea or connection → continue from the new idea or return to the original → revisit pins and history.

The other essential loop is:

> Keep writing in an Obsidian note → invoke “K-Plex: Add child” → create a child of the K-Plex center, not the editor's note → return to writing unless explicitly choosing to follow or edit the new node.

### Confirmed design basis

The following two decisions are foundational to this design and were explicitly confirmed by the repository owner on **8 October 2026**. They are implementation requirements, not alternatives awaiting a decision:

1. **Existing Add child/parent/friend/challenger commands remain center-based.** A highlighted neighbor or the active editor's note must not silently replace the K-Plex center as their target. Creation from the selected node is a separate, explicitly named action family. Preserve the existing command IDs and target semantics; see Sections 4.1, 7.1 and 9.
2. **Local shortcuts require actual focus in an eligible K-Plex interaction region.** Visibility alone, a last-used surface, or an active leaf without the relevant focus does not activate them. Background use—including Add child/friend while writing in another leaf—remains available through published Obsidian commands and hotkeys assigned in Obsidian. Do not introduce a visibility-based global keyboard interceptor; see Sections 4.2, 7 and 8.

### 1.1 Architectural decisions

1. **One action catalog, two independently configured delivery channels.** K-Plex stores local bindings. Obsidian stores shortcuts for published commands. Publishing an action does not assign a global shortcut.
2. **No “global whenever K-Plex is visible” key listener.** Background use comes through registered Obsidian commands, not a competing plugin-wide keyboard interceptor.
3. **Preserve all 22 existing Obsidian command IDs and all 15 existing local action mappings.** New capabilities are additive; intentional navigation improvements have an explicit migration policy.
4. **Distinguish the center, keyboard selection, editor cursor, and explicit menu target.** They are not interchangeable meanings of “active.”
5. **Decide whether an event is owned synchronously; execute asynchronously afterward.** A promise must never decide whether the browser/editor also processes the original keypress.
6. **Keep execution policy in code, preferences in settings.** Users can change shortcuts and command publication, but cannot turn off capability checks or bypass mutation validation.
7. **Offer a searchable K-Plex action menu.** Every supported operation needs a keyboard route, but not every operation needs a default shortcut or a permanently visible Obsidian command.
8. **Add per-surface action routing without implementing independent Plex sessions.** Current shared center/history behavior remains a separate concern; this project does not silently implement issue #31.

### 1.2 What this delivery includes

The full delivery comprises the shared catalog and engine, configurable command publication, local shortcut management, focus/event ownership, migration, local action and target pickers, keyboard access to existing UI operations, selected-node relationship actions, keyboard connection workflows, and explicit creation continuation behavior. Section 15 divides that delivery into reviewable increments.

### 1.3 What it deliberately excludes

Do not replace indexing or scheduling, redesign relationship storage, add a graph-wide undo system, create a macro/scripting engine, implement arbitrary key sequences, or resume the paused broad architecture work in `HANDOFF.md`. Also exclude full multi-selection mutation, independent multi-Plex sessions, breadcrumb ancestry, new ontology semantics, and an automatic hardware-keyboard detector. Provide sensible extension points for those features without building them here.

---

## 2. Evidence and current-code assessment

### 2.1 Baseline and review method

The implementation baseline is the current [`main` branch of `zsviczian/kplex`](https://github.com/zsviczian/kplex/tree/main). The repository owner confirmed that the code reviewed for this design is an export of this main head. GitHub branch metadata was checked on 8 October 2026 and identifies the reviewed head as:

- **Commit:** [`67ee400b56c7706d795412d6f6631b365d15c394`](https://github.com/zsviczian/kplex/commit/67ee400b56c7706d795412d6f6631b365d15c394)
- **Commit time:** 8 October 2026, 05:45:18 UTC.
- **Change:** merge of [PR #80](https://github.com/zsviczian/kplex/pull/80), “Add configurable Plex keyboard navigation and native hotkey settings.”

Repository-relative paths, symbols and current-code observations below refer to this revision of `main`, except where a file or behavior is explicitly proposed as new. Main-branch links provide convenient navigation; the fixed commit link above preserves the exact design baseline. Line ranges are navigation aids and will move during implementation. If `main` advances before delivery, inspect the relevant changes and reconcile this handoff with the newer code without discarding intervening work. External findings are linked in Section 18; issue status is a snapshot of the live open-issue search on the research date.

Read `AGENTS.md`, `CONTRIBUTING.md`, and the current `HANDOFF.md` again before editing. In particular, preserve portable-core boundaries, native Obsidian modal shells, declarative settings, localization, owner-document handling, and the separation between workflow settings and semantic indexing.

### 2.2 Existing foundations worth retaining

| Existing owner | Observed behavior | Design treatment |
|---|---|---|
| [`src/core/plex/internalHotkeys.ts`](https://github.com/zsviczian/kplex/blob/main/src/core/plex/internalHotkeys.ts) | Fifteen named actions; exact modifiers; `Mod` platform mapping; one binding or `null`; unknown saved entries survive; defaults are cloned. | Extend this policy rather than creating a second unrelated keymap. Keep compatibility exports while migrating callers. |
| [`src/core/plex/keyboardNavigation.ts`](https://github.com/zsviczian/kplex/blob/main/src/core/plex/keyboardNavigation.ts) | Pure spatial selection over the displayed projection; within-section movement and separate section jumps; no index acquisition. | Retain the algorithm and add only the explicit boundary-navigation option in Section 10. |
| [`src/ui/internalHotkeyScope.ts`](https://github.com/zsviczian/kplex/blob/main/src/ui/internalHotkeyScope.ts) | Concrete native `Scope` registrations and cleanup. | Make this the native local-key adapter for the common dispatcher. |
| [`src/ui/usePlexKeyboardNavigation.ts`](https://github.com/zsviczian/kplex/blob/main/src/ui/usePlexKeyboardNavigation.ts) | Surface-local occurrence selection; mode/focus guards; native and DOM delivery; repeat suppression for creation. | Keep selection and reveal mechanics; remove action-name dispatch from this hook after the shared adapter owns it. |
| [`src/ui/internalHotkeySettings.ts`](https://github.com/zsviczian/kplex/blob/main/src/ui/internalHotkeySettings.ts) | Native shortcut recorder, duplicate checks, disable/reset, owner-window modifier labels. | Expand into the action manager settings UI; do not discard the recorder. |
| [`src/ui/KplexView.tsx`](https://github.com/zsviczian/kplex/blob/main/src/ui/KplexView.tsx) | Native `ItemView` scope, React mount/unmount, pop-out migration, readiness handling. | Register a surface adapter and release it with the view/root lifecycle. |
| [`src/main.ts`](https://github.com/zsviczian/kplex/blob/main/src/main.ts) | Existing commands, node opening, pinning, document synchronization, relation composers and canonical writers. | Wrap these services; do not reimplement them inside actions. |
| [`src/core/graph/settingsPolicy.ts`](https://github.com/zsviczian/kplex/blob/main/src/core/graph/settingsPolicy.ts) | Allowlisted settings effects separate semantic, presentation and workflow changes. | New action preferences must remain outside semantic signatures and invalidation. |

### 2.3 Concrete gaps

**Action dispatch is split.** `main.ts` registers Obsidian commands separately from the local registry. `App.tsx` separately handles search/find through native scope registration and React capture. `usePlexKeyboardNavigation.ts` dispatches other local actions. Toolbar and context-menu operations call still other callbacks. There is useful shared behavior underneath, but no common action contract above it.

**Command targeting and UI targeting are different.** `commandCentralPage()` uses `settings.lastActivePath`, requires an open K-Plex view, and excludes folders and tags. The four global creation commands instantiate `NewRelatedNoteModal` directly without the originating `hostLeaf`. Graph-local creation uses the displayed center and passes `hostLeaf` through `openRelationModal()`. Unification must retain the intended center target while fixing missing surface/focus context.

**Selection is not the creation target today.** In `PlexGraph.tsx`, the keyboard `add` callback reads `persistentNeighborhood?.center`. Highlighting a neighbor does not make it the origin of `Mod+Arrow` creation. Do not silently change that behavior when introducing selected-node actions.

**Embedded-editor mode disables more than editor shortcuts.** The `normalMode` expression passed to keyboard navigation includes `!settings.embedCentralNode`. Consequently, graph navigation is disabled even when focus is on the graph rather than inside the embedded editor. Replace this blanket condition with actual focus ownership and capability checks.

**The current center is a navigation dead end for plain arrows.** `moveKeyboardSelection()` only crosses sections when its `betweenSections` argument is true. The center is a one-node section. New keyboard users therefore need Alt+Arrow before ordinary movement can begin. Section 10 makes improvement explicit rather than disguising it as refactoring.

**Key meaning is partly implicit.** `internalEventKey()` prefers `event.code` for Latin letter/digit positions, while settings store only a `key` string. This is useful for some Option-modified shortcuts, but conflates logical characters and physical positions. Preserve existing behavior during migration and make the distinction visible for new bindings.

**A duplicate runtime match currently resolves by registry order.** `resolveInternalHotkey()` returns the first match. Configuration UI rejects some duplicates, but imported, future, or platform-equivalent combinations still need a deterministic runtime safety rule.

**There is no central completion/focus contract.** `finishNewRelatedNode()` broadcasts navigation and optionally opens a sidecar/document. It cannot represent “create another under the same origin” separately from “follow the new node,” nor should every background command automatically take over focus.

**Current navigation is not independent per view.** `App.tsx` holds local state and a local history cursor, but persists `lastActivePath` and `navigationHistory` in shared settings. `subscribeNavigation()` broadcasts to mounted subscribers. A surface registry alone will not make these independent sessions.

### 2.4 Important implementation seams

Use these existing operations as adapters or delegate targets:

| Concern | Existing symbols / locations |
|---|---|
| Commands and editor ontology | `main.ts` initial registration around 228–301; `registerOntologyCommands()` around 3107 |
| Context and search | `commandCentralPage()`, `rememberLeafActivation()`, `searchTargetLeaf()`, `requestSearchFocus()` |
| Surface activation/history | `App.tsx`: `activate()`, `goHistory()`, toolbar setters, pin/history rendering |
| Node opening | `focusInKplex()`, `openPage()`, `openInDocumentLeaf()`, `openSection()` |
| Pinning and note metadata | `togglePinned()`, `openNoteTypeModal()`, rename modal entry points |
| Relation composition | `openRelationModal()`, `NewRelatedNoteModal`, `RelationModal` |
| Ontology policy | `ontologyFieldsForRole()`, `defaultOntologyField()`, `inverseRelationshipRole()`, `rememberRelationshipOntology()` |
| Canonical relationship writes | `createRelationToPage()`, `relinkCentralNeighbour()`, `addOntologyToConnection()` |
| Creation variants | `openCreateInFolderModal()`, `createNewRelatedFileForOrigin()`, `linkNewRelatedFile()`, `createWebLinkRelatedPage()`, `createPlaceholderRelatedPage()` |
| Saved-write publication | `prepareRelationshipMutation()`, `publishSavedRelationship()`, `SavedRelationshipPendingError` |
| Removal and evidence | `deleteNode()`, `directFrontmatterUnlinkCandidate()`, `unlinkFrontmatterEvidence()` and existing connection-details menus |
| Native menus | `showKplexMenuAtPosition()` and existing tracked-menu lifecycle |

**Duplicate composer files:** at the reviewed `main` head, `src/ui/NewRelatedNoteModal.ts` and `.tsx` are byte-identical. Imports are extensionless. Before editing, prove which path the installed TypeScript/esbuild configuration resolves. Make the active implementation authoritative and resolve the duplicate in a narrowly documented cleanup; do not leave two diverging composer implementations. This is a specific delivery check, not permission for broad file reorganization.

---

## 3. Research conclusions

### 3.1 TheBrain: adopt the interaction principles, not an unverified keymap

The useful patterns are fast relationship creation, clear separation between navigation and editing, keyboard access to pins, and customization of commands. Historical support guidance documents Mac creation shortcuts with an extra modifier to avoid interfering with text-navigation keys; a separate support discussion documents numbered pin shortcuts. Those are product/version-specific examples, not safe Obsidian-wide defaults. [TB3], [TB4]

There is a version trap in this research. The vendor now presents TheBrain 15 and archives earlier versions. A moderator's January 2026 reply describes evolving v15-beta shortcuts, no fixed F1–F12 defaults at that time, and customization through **Settings → Keyboard Shortcuts**. It does not establish the final October 2026 default keymap. Do not market an imported “TheBrain 15 preset” based on old F6/F7/F8 lists. [TB1], [TB2]

For K-Plex, the design implication is to make the interaction sequence fast and discoverable, then let users bind familiar keys. Do not copy Ctrl+number pin shortcuts over Obsidian tab commands. The vendor's power-user material explicitly includes keyboard access to pins, supporting their treatment as first-class navigation actions here. [TB5]

Representative shortcuts actually supported by the reviewed references:

| Reference context | Shortcut examples | Lesson for K-Plex |
|---|---|---|
| Historical macOS support correction | Cmd+Shift+Up / Left / Down for parent / jump / child creation | Preserve native text-navigation chords; make relationship creation explicit. [TB3] |
| TheBrain 10 beta support discussion | Ctrl+1, Ctrl+2, etc. for ordered pins, customizable | Model pin slots as actions, but leave their global bindings to the user. [TB4] |
| January 2026 v15-beta moderator reply | Ctrl+Alt+Arrow navigation cited as an example; no finalized function-key map | Prefer configurable actions over claiming a current preset from historical defaults. [TB2] |

The large TheBrain 14 PDF manual could not be retrieved successfully in this review. No claims below depend on having read that PDF. The accessible official HTML and support discussions are the evidence used.

### 3.2 Mindmap Builder: creation continuation and input ownership

The reviewed script contains named actions, configurable key/code/modifier data, input/Excalidraw/global scopes, and guards for node requirements and suggestion ownership. Its creation family distinguishes Enter-based add, sibling insertion, and add-plus-follow/focus/zoom variants. Navigation, pinning, folding, branch clipboard operations, and view controls also have explicit actions. [MM1]

Examples from the reviewed script's default action table:

| Operation family | Script examples |
|---|---|
| Creation in its input | Enter: add; Alt+Enter / Alt+Shift+Enter: next/previous sibling |
| Creation continuation | Mod+Alt+Enter: add and follow; Mod+Enter: follow and focus; Mod+Shift+Enter: follow and zoom |
| Navigation | Alt+Arrows; Shift or Mod variants add zoom/focus behavior |
| Structure and editing | Mod+Arrows: ordering/promote; Alt+1/2/3: branch/level/recursive folding |
| Other actions | Alt+P: positional pin; Alt+C/X/V: branch clipboard, distinct from normal text clipboard |

These examples describe Mindmap Builder's reviewed scopes, not proposed global K-Plex assignments. [MM1]

Borrow **explicit continuation intent**, shared shortcut labels, code-owned capabilities, and suggestion-first Enter/Escape handling. Do not borrow a visibility-based global scope, private host hotkey-manager dependencies, or assumptions that a graph is a tree. Mindmap Builder's “pin” fixes a node's layout position; K-Plex's pin is a navigation bookmark. Promote/demote or sibling insertion cannot be copied into a multi-parent graph without defining the parent relationship.

### 3.3 Excalidraw: shared action identity and fresh execution context

Excalidraw's action definitions combine identity, labels, execution, eligibility and presentation metadata. Its manager reads current state at execution time, accepts UI/keyboard/API sources, and cancels ambiguous keyboard matches rather than selecting one arbitrarily. [EX1], [EX2]

Borrow those principles. Do not transplant its element-state reducer, canvas history model, React `PanelComponent` ownership, application object, or telemetry. K-Plex needs a typed invocation facade over existing effects, not a new canvas application architecture.

### 3.4 Obsidian: respect the host's command model

Official plugin guidance distinguishes ordinary conditional commands from editor-specific commands; availability must be checked again on execution, not only when listing commands. It also advises against shipping plugin global default hotkeys and recommends uppercase letters in native hotkey registrations for non-Latin layouts. [OB1]

The core palette already supports fuzzy command search, recent commands, pinned commands and shortcut display. Keep names concise and searchable; the K-Plex-local action menu complements rather than replaces it. [OB2], [OB3]

The public API provides `Plugin.addCommand()`, `Plugin.removeCommand()` since 1.7.2, `Scope`, and keymap scope lifecycle methods. Dynamic publication therefore does not require private command deletion. `removeCommand()` takes the local command ID without the plugin prefix. Native key listeners use `false` for handled/default-prevented events. [OB4]

**Publication is not a separate palette-visibility flag.** Under the public command model, unregistering removes the command from host command availability, including its use through a global assigned shortcut. This design does not promise “hidden from the palette but still globally bindable” as a separate supported state. K-Plex must not edit `.obsidian/hotkeys.json` or synchronize local shortcuts into it.

### 3.5 Accessibility implication

Character-only shortcuts should be limited to actual component focus and be switchable/remappable. This also protects speech input from accidental activation. The W3C guidance explicitly covers character sequences as well as individual characters. Use normal Tab traversal and native widget keyboard behavior; do not solve navigation by trapping focus inside the graph. [A11Y1]

---

## 4. Non-negotiable behavioral contracts

### 4.1 Four independent concepts

- **Graph center:** the idea whose neighborhood is displayed.
- **Keyboard selection:** a rendered occurrence being inspected without recentering.
- **Document/editor target:** the file or field supplied by an explicitly editor-oriented command.
- **Explicit operation target:** the captured origin/endpoint of a menu, composer or connection operation.

Mouse hover may preview a node, but must not silently change the target of a keyboard mutation. A highlighted duplicate occurrence and its underlying note are different identities: use occurrence ID for visual focus, canonical node identity for operations.

### 4.2 “Running” and “active”

For the existing creation commands, “K-Plex is running” means at least one live K-Plex view exists, as today. A hidden tab or collapsed sidepanel can still provide a valid command center. Mere plugin enablement with no view does not authorize mutation against an old persisted path. Opening K-Plex or focusing the active note remains an explicit action.

A **local shortcut** requires actual focus within an eligible K-Plex interaction region. A view being visible, selected as a leaf, or last used is insufficient.

### 4.3 Command checking is cheap and pure

Availability checks may inspect small in-memory snapshots, the existing current-center lookup and capability flags. They must not open views, change focus, save settings, scan the vault, hydrate indexes, create notices, or start a promise that does those things. Recheck at execution. Targeted acquisition belongs to the executed operation, not `checkCallback(true)`.

### 4.4 Successful dispatch is not necessarily a saved mutation

An action can open a dialog without changing a note. A submitted mutation can save successfully while index publication remains pending. A fulfilled `Promise<void>` from an old service can also mean an early return after a notice. Model these separately; never infer “committed” merely because a delegated promise resolved.

### 4.5 No hidden changes to relationship semantics

Route create/connect/relink/unlink through the existing mutation boundary. Preserve YAML/body authority, storage-owner choice, inverse-role policy, inferred-link restrictions, virtual-node handling and source-local updates. The input mechanism must not choose a different persistence policy.

---

## 5. Small architecture with explicit ownership

```text
                  ONE IMMUTABLE ACTION CATALOG
             labels · IDs · capabilities · target policy
                    defaults · publication metadata
                               │
       ┌───────────────────────┼─────────────────────────┐
       │                       │                         │
 Obsidian commands       Local key adapter        UI / local action menu
 add/remove/check        Scope + owned DOM        toolbar/context buttons
       │                       │                         │
       └───────────────────────┴─────────────────────────┘
                               │
                         ACTION MANAGER
                resolve → check → accept → execute
                   outcome → focus / announcement
                               │
             ┌─────────────────┼──────────────────┐
             │                 │                  │
       Application ports   Surface ports     Composer session ports
       existing main.ts    current App /    existing native modals
       operations          PlexGraph state  and canonical writers
```

### 5.1 Proposed ownership and files

Keep the first implementation compact. Split further only when a file has a real second responsibility.

| File / owner | Responsibility |
|---|---|
| **New:** `src/core/plex/actions.ts` | Portable action IDs, metadata, invocation/target/outcome types, bounded catalog construction and pure capability helpers. No host, React, DOM, plugin or translation-module imports. |
| **Evolve:** `src/core/plex/internalHotkeys.ts` | Binding normalization, matching, conflict analysis, default projection and legacy migration. Existing exports may temporarily delegate here. |
| **New:** `src/application/ActionManager.ts` | Registry with attached implementations, context resolution through injected snapshots/ports, eligibility, single-flight ownership and results. No Obsidian or UI imports. |
| **New:** `src/adapters/obsidian/actionCommands.ts` | Native command registration diff, ordinary/editor callback adapters and stable host IDs. |
| **Evolve:** `src/ui/internalHotkeyScope.ts` | Native key transport and focus-owned lifecycle; one accepted-event dispatcher shared with the local DOM transport. |
| **New:** `src/ui/usePlexActions.ts` | Register current surface callbacks/snapshots; coordinate App, graph selection and focus adapters. Keep latest values in refs. |
| **New:** `src/ui/ActionMenuModal.ts` | Native modal shell with a searchable action list; reuse current fuzzy controls. It may share list rendering with a small node-target picker. |
| **Evolve:** `src/ui/internalHotkeySettings.ts` | Searchable actions-and-shortcuts manager, recorder, publication controls, migration notices. |
| **Existing:** `main.ts`, `App.tsx`, `PlexGraph.tsx`, view/composer/menu owners | Construct adapters and replace intent callbacks with dispatch. Retain existing operation implementations and React state. |

`src/application/` is already recognized by `scripts/check-architecture.mjs`, even though the reviewed `main` head does not yet contain that directory. Use its existing boundary rules rather than exempting new modules from architecture checks.

The catalog stores translation **identifiers**, not translated labels. Validate those identifiers against the language layer in an allowed UI/adapter assembly file. Do not import `src/lang` into portable Plex code merely to type a label.

### 5.2 State stays where it is

Do not move React state into the manager. App keeps history cursor, panels, search and view settings; PlexGraph keeps selection, camera, displayed nodes and transient modes; native modals keep their form state. Each exposes narrow, stable callbacks and a `readSnapshot()` function.

The manager owns only action registrations, active surface/session registrations, compiled preferences, and in-flight action bookkeeping. It does not own an authoritative graph, a second history list, an editor model, or a copy of the full plugin settings.

### 5.3 Surface registration

Register each mounted React surface with an opaque `SurfaceId` and generation. Associate its host `WorkspaceLeaf` in the Obsidian/UI adapter, not in portable types. Do not require an undocumented leaf-ID property.

A surface supplies:

- A synchronous snapshot: mounted/visible state, center reference, selected occurrence/reference, relevant mode and capability flags, history availability, current focus region and interaction revision.
- UI operations: focus graph/search/find/editor, move/select/reveal an occurrence, activate a node, step history, open a panel and update camera.
- A cancellation/disposal signal and an action-preferences subscription.

Use fresh-ref callbacks to avoid stale closures. Registration cleanup must remove only its own generation; an old React unmount must not deregister a newly migrated surface.

`KplexView.waitUntilReady()` currently resolves after requesting a React render. Add a separate adapter-ready acknowledgement if an action needs mounted callbacks. Do not use arbitrary delays, await a full index, or treat a closed view as successfully ready.

### 5.4 Operations stay behind small ports

Construct application ports in the existing host assembly. Examples are `openRelationComposer`, `togglePin`, `openNode`, `openConnectionDetails`, `assignEditorField`, and `openSurface`. These delegate to existing methods with resolved references and `hostLeaf`.

Do not expose the whole plugin, `GraphIndex`, `WorkspaceLeaf`, React setters, or DOM events to the portable manager. Do not create one enormous new switch that reproduces the logic currently in `main.ts`.

---

## 6. Common action contract

The following is a design sketch, not a drop-in source file. Derive the complete ID/argument map from the implemented catalog; keep unsafe casts out of call sites.

```ts
type ActionSource =
  | "obsidian-command"  // The public callback does not distinguish palette vs hotkey.
  | "local-hotkey"
  | "local-menu"
  | "toolbar"
  | "context-menu"
  | "composer"
  | "internal";

type FocusRegion =
  | "graph" | "search" | "find" | "pins" | "history" | "toolbar"
  | "embedded-editor" | "sidecar-editor" | "native-control"
  | "composer" | "action-menu" | "external";

type NodeRef = Readonly<{
  identity: string; // Existing canonical node identity, not a display alias.
  kind: "file" | "url" | "ghost" | "folder" | "tag" | "section";
  path: string;
}>;

type TargetRequest =
  | { kind: "none" }
  | { kind: "center" }
  | { kind: "selected" }
  | { kind: "selected-or-center" }
  | { kind: "explicit"; node: NodeRef; occurrenceId?: string }
  | { kind: "edge"; origin: NodeRef; target: NodeRef; evidenceId?: string }
  | { kind: "editor-field"; editorInvocationId: string };

type Availability =
  | { state: "enabled" }
  | { state: "preparable"; reasonKey: string } // Execution can acquire targeted data.
  | { state: "disabled"; reasonKey: string };

type ActionOutcome =
  | { status: "completed" } // Non-writing operation finished.
  | { status: "opened"; sessionId: string }
  | { status: "committed"; affected: readonly NodeRef[] }
  | { status: "saved-pending"; affected: readonly NodeRef[]; reasonKey: string }
  | { status: "cancelled" }
  | { status: "unavailable"; reasonKey: string }
  | { status: "failed"; reasonKey: string; diagnosticId?: string };

type ActionMetadata<Id extends string> = Readonly<{
  id: Id;
  labelKey: string;
  descriptionKey: string;
  category: "navigation" | "nodes" | "relationships" | "view" | "tools";
  keywordKeys: readonly string[];
  target: TargetRequest["kind"];
  localContexts: readonly FocusRegion[];
  repeat: "allow" | "coalesce" | "deny";
  effect: "read" | "ui" | "workflow" | "vault-write" | "semantic-setting";
  command?: {
    id: string; // Local Obsidian command ID, e.g. kplex-add-child.
    kind: "ordinary" | "editor";
    defaultPublished: boolean;
  };
}>;

// Implementations attach to metadata at assembly, not to persisted preferences.
interface ActionImplementation<Args, Context, Ports> {
  availability(context: Context, args: Args): Availability;
  execute(context: Context, args: Args, ports: Ports): Promise<ActionOutcome>;
}
```

The concrete action request must be a discriminated union, or an equivalent generic map, so `history.step` accepts a delta while `relationship.create-center.child` cannot accidentally receive an edge-deletion payload. User preferences cannot supply arbitrary executable arguments. Fixed variants are generated from a small, typed role/slot list.

### 6.1 Metadata versus implementation

A catalog entry describes the operation. Its attached implementation provides eligibility and execution through ports. The manager must reject duplicate action IDs, duplicate published command IDs, missing implementations, and bindings to nonexistent runnable actions.

An action's `checked` state, when needed for a toggle, comes from the same snapshot used for eligibility. Its toolbar label, tooltip, local-menu row, shortcut setting and command name derive from the same metadata. Do not force buttons to render through the manager; the manager provides presentation data, not React components.

### 6.2 Results and notifications

Use one localized error/notice owner per execution. Do not add a manager notice on top of a service that already presents the same failure. During migration, a delegating adapter may return `completed` for an old non-writing operation, but a writing workflow needs an explicit commit signal before it can return `committed`.

For the relation composer, extend the existing commit callback to carry the affected/created node and a saved-versus-published state. For methods that currently return `Promise<void>` with early notices, add a small result type at the relevant public boundary or have their adapter consume an explicit result. This is a targeted change, not a rewrite of storage internals.

`SavedRelationshipPendingError` maps to `saved-pending`, not `failed`. Do not retry creation automatically. Offer a targeted refresh/reconciliation action and explain that the content was saved.

### 6.3 Dispatch and concurrency

Execution order:

1. Resolve a current snapshot and target from the request.
2. Validate arguments and availability without side effects.
3. Accept or reject synchronously; acquire any single-flight operation/session guard.
4. For an accepted key event, consume it immediately.
5. Execute, performing targeted data acquisition only now if needed.
6. Revalidate captured identities immediately before mutation through the existing writer.
7. Report an explicit outcome; apply the operation's navigation/focus intent.
8. Release guards in `finally`, including thrown errors, cancellation and view disposal.

Use single-flight keys for modal openings and writes: for example, surface + composer family, or the captured origin/target pair. Opening a composer releases the short dispatch guard but transfers exclusivity to its session until close. Holding a key must not create twenty modals or files. Do not globally serialize independent actions behind a long index operation.

Repeated selection movement may update at keyboard-repeat speed. Camera reveal can be coalesced to one animation frame. For asynchronous history/centering, retain only the latest intended navigation destination within that surface rather than replaying a long stale queue. Do not debounce unrelated explicit commands by an arbitrary time window.

This action manager is not a second scheduler. Relationship operations retain their existing foreground-priority entry points. Background hydration is not a prerequisite for opening the action menu, moving through already displayed nodes, or starting an eligible composer.

### 6.4 Concrete synchronous acceptance API

Expose two deliberate entry points. `prepare()` is synchronous and used by the keyboard adapter. `dispatch()` is a convenience for buttons/commands without local key ownership to decide.

```ts
type PreparedAction =
  | { state: "rejected"; reasonKey: string }
  | {
      state: "accepted";
      run(): Promise<ActionOutcome>; // Starts once; repeated calls return the same promise.
      cancel(): void;                // Releases an unused preparation guard.
    };

// Keyboard adapter, after scope/matching/ambiguity checks:
const prepared = manager.prepare(request);
if (prepared.state === "accepted") {
  acceptedEvents.add(nativeEvent);
  nativeEvent.preventDefault();
  nativeEvent.stopPropagation();
  void prepared.run();
  return false;
}
// The adapter separately applies the owned-disabled/no-op consumption rule.
```

`prepare()` resolves and freezes the invocation context, rechecks eligibility and takes the short single-flight guard. It does not open a dialog, start I/O or execute the operation. Run or cancel the prepared action in the same synchronous adapter turn; it is not a reusable authorization token or a public scripting API. `run()` catches errors and releases/transfers its guard exactly once. The mutation service still revalidates captured file/evidence identities before committing.

`dispatch(request)` internally performs prepare-then-run and returns the outcome promise; it also represents rejected requests as an unavailable outcome. A key handler must not call an asynchronous `dispatch()` first and then wait for a result before deciding whether to suppress the event.

---

## 7. Target resolution, surfaces and focus

### 7.1 Required resolver rules

| Invocation | Target and surface rule |
|---|---|
| Local shortcut | Explicit owning surface. Center/selection comes from that surface's fresh snapshot. Never another surface. |
| Toolbar button | Explicit owning surface and the same target policy as its action. |
| Node/edge context menu | Explicit captured node or edge. Do not substitute current center after the menu opens. |
| Existing Obsidian Add child/parent/friend/challenger | Preserve `commandCentralPage()` semantics: shared `settings.lastActivePath` is the origin and a live K-Plex view is required. Resolve a suitable surface separately for dialog/focus ownership. The editor's active note is not a fallback. |
| New center-oriented Obsidian commands | Use the same shared command-center rule while K-Plex has shared navigation semantics. |
| New selected-node Obsidian commands | Require a valid selected occurrence in the resolved surface. Never silently fall back to center. |
| Editor ontology commands | Use the editor passed to `editorCheckCallback` and the field at its cursor. Never infer that field from the graph. |
| Focus active note / sync commands | Preserve their explicitly document-oriented policies. These are intentionally different from Add child. |
| Local action menu | Capture the launching surface/target context before the modal takes focus; revalidate the captured identity on execution. |

The difference between current local-center and shared command-center behavior is a compatibility boundary, not two hidden implementations. Express it in one resolver. When independent sessions are implemented later, change that one policy under dedicated tests.

### 7.2 Choosing a host surface for a global command

For a command without an explicit surface, choose deterministically:

1. A live K-Plex surface associated with the invocation's current workspace context.
2. The most recently deliberately interacted-with K-Plex surface in the invocation window.
3. A visible live surface in that window, ordered by last interaction and then registration order.
4. A hidden live surface in that window, in the same order.
5. A single remaining live surface in another window.

For ambiguous multiple cross-window candidates, do not guess: execute an owner-selection prompt for a foreground UI action, or report the ambiguity for an operation that cannot safely prompt. Checking remains side-effect-free and can return `preparable` for a promptable action. Show the center's name in the composer regardless of which host surface is selected.

A global command that only mutates or toggles state need not reveal the selected surface. Commands explicitly named Focus/Search/Open do reveal their target surface. Prefer a surface displaying the command center when candidates otherwise tie, but never change the command origin to match an arbitrarily chosen view.

Record meaningful focus/interaction through existing leaf-change handling and owner-document focus events. This ledger is metadata only: no document-wide key capture and no assignment to Obsidian's active leaf. Do not repurpose or weaken `rememberLeafActivation()` and linked-document validation to implement the ledger.

The public Obsidian command callback supplies no original `KeyboardEvent`; do not invent one or claim to distinguish palette invocation from a globally assigned shortcut. Resolve from the current/recorded workspace and window context. When context is genuinely unavailable, use the explicit ambiguity policy rather than a hardcoded main window.

### 7.3 Freeze intent, refresh validity

At execution acceptance, capture origin, selected/explicit target, surface generation, invocation focus and continuation intent. A dialog title must show the captured origin, for example **Add child to Project Alpha**.

Do not reread `settings.lastActivePath` to choose the origin at submit time. If the user navigates from A to B while an A-origin dialog is open, submitting still concerns A or explicitly fails; it never silently concerns B.

Canonical path alone is insufficient for a delayed write if a file was deleted and recreated at that path. The host adapter can retain the current `TFile` identity for the bounded operation session and revalidate it against the vault. For a rename of the same file, update the displayed path through existing rename handling; for deletion/replacement, stop and explain. Do not introduce a permanent second file-identity index.

### 7.4 Focus policies

Treat **navigation intent** and **focus intent** separately.

| Operation outcome | Navigation | Focus |
|---|---|---|
| Select a visible node | No recentering | Keep graph focus and reveal selection. |
| Activate a neighbor | Existing centering/history behavior | Remain in the originating graph unless the operation explicitly opens an editor. |
| Create and return | Stay at captured origin | Return to invoking control/editor when still valid. |
| Create another | Stay at captured origin | Keep composer open; focus empty name input. |
| Create and follow | Activate created node | Focus graph on the new center. |
| Create and edit | Follow using existing editing workflow | Focus the intended sidecar/document editor. |
| Cancel a modal | No mutation/navigation | Restore invoker if valid. |
| Background pin/toggle | No implicit recentering | Do not reveal or focus K-Plex. |

Store focus-restoration handles in the UI adapter, not settings. Validate document, connected element, surface generation and interaction revision before restoring. If the user deliberately moved elsewhere while asynchronous work finished, do not steal focus back. A closed/migrated view invalidates old handles. When a graph-invoked modal closes and its original node no longer exists, focus the surviving graph root, not an arbitrary editor.

Existing “edit after create” preferences remain effective for the compatibility submit action. Explicit “create and return/another/follow/edit” actions override that preference for that invocation only.

---

## 8. Keyboard ownership and event arbitration

### 8.1 Ownership is a region and mode, not a leaf boolean

Use a small code-owned context model. At minimum distinguish graph, native controls, search/find inputs, embedded/sidecar editor, suggestions, native modal, local action menu, connection target mode and shortcut recorder.

Priority is structural:

```text
shortcut recorder / topmost native modal or menu
    → focused suggestion or form widget
        → focused text editor / native control
            → eligible K-Plex region actions
                → Obsidian parent scope / normal browser behavior
```

Do not implement this as a large numeric `keyPriority` contest. Widgets retain their standard Enter/Escape/Arrow behavior. Reusable user intents such as submitting a relation can call the engine; moving a caret, accepting a suggestion and traversing a native list do not need catalog entries.

### 8.2 One dispatcher, multiple carefully bounded transports

Native Scope callbacks and a surface-root DOM listener may remain necessary, especially for sidepanel focus. They must call **the same dispatcher**, not separate switches. Normalize a React event to its `nativeEvent` before deduplication.

Store accepted native events in a `WeakSet` or `WeakMap`. Mark before asynchronous work. A subsequent delivery of the same event must not execute again. Do not mark an event merely because an unrelated, ineligible surface observed it.

For local binding transport:

- Retain the native view scope and concrete action bindings. The later maintainer-approved typing selection uses graph-only key-null fallbacks for exactly unmodified/Shift keys after concrete actions, with explicit original-event parent delegation on decline; never add an all-modifier graph capture.
- Ensure an eligible native scope is active while an owned K-Plex region actually has focus, including a sidebar whose workspace active leaf is still an editor. A narrowly focus-leased child `Scope`, parented to the view scope, is the supported mechanism when the view scope alone is not active.
- Push that lease on real owned focus, release on leaving the region/view/window, modal takeover, disposal or migration, and never leave a visibility-based lease active. Do not push above an already open modal merely because a React render occurred.
- Keep the concrete registration set appropriate to the current focus region. For example, do not register graph `Mod+Arrow` actions for an embedded-editor focus lease.
- The DOM fallback is attached to the owning surface root, not the whole document. It covers local delivery gaps; it is not a second global shortcut system.
- Store and unregister exact native handler handles. Remove old registration sets before swapping in a newly compiled configuration.

The existing `KplexView.scope` should not retain a second independent set of legacy handlers after migration. Test native ordering in real Obsidian; a jsdom event test cannot prove host-scope precedence.

### 8.3 Matching and consumption rules

1. Reject already consumed events, composition, dead keys, modifier-only events, invalid/detached owners and unsupported target regions.
2. Read a current context snapshot; obtain candidates from the compiled chord/context table.
3. Apply exact platform-normalized modifiers, key mode, target policy and eligibility.
4. Zero matches: pass through, except a deliberately reserved interaction-protocol key in its owning mode.
5. One match: accept and consume synchronously; execute once.
6. Multiple applicable matches: execute none, consume within the owning local context, and emit a deduplicated configuration diagnostic. Never choose by insertion order.

An owned boundary action such as “history back” with no previous entry or movement at an edge is a handled no-op. In particular, Backspace must not fall through to an unrelated host/browser navigation action. A graph creation shortcut on an ineligible node should be consumed with a clear reason in graph context, but must be completely absent from an editor context.

For native Scope callbacks, return `false` when handled and `undefined` when genuinely passed through. Explicitly call `preventDefault()` and `stopPropagation()` in the common accepted-event path. Do not rely on a fulfilled async callback or an arbitrary truthy return to suppress a key.

Global command callbacks do not expose the same event token. Deduplication between a native local binding and the parent Obsidian command therefore depends on correct scope ownership/consumption, not a time-based engine debounce. Include same-chord local/global tests as a release gate.

### 8.4 Editors, composition and international layouts

Never intercept standard text navigation, selection, clipboard, undo, redo or native editor search through graph-only bindings. Native controls, contenteditable regions, CodeMirror, sidecars, links and accessible composite widgets keep their keys. Inspect the event path with cross-window-safe checks; do not assume every target is an `HTMLElement` from the main window.

Preserve the existing explicit search escape hatch: F4 can focus K-Plex search from its embedded editor. `Mod+F` inside an editor remains that editor's find. F3/Shift+F3 are explicit focus-transfer actions, not a license to intercept all editor keystrokes. These transfers are disabled while composition, a suggestion requiring the key, or a topmost unrelated modal owns input.

Reject `event.isComposing`, `key === "Dead"`, and AltGraph input for action shortcuts. Use `getModifierState("AltGraph")` where available; do not treat Hungarian AltGr character entry as an intentional Ctrl+Alt command. Preserve ordinary Mac Option text entry. Test both logical and physical bindings on non-US layouts rather than claiming that `event.code` solves every layout problem.

### 8.5 Recording mode

The shortcut recorder is an explicit temporary mode. It may use a native capture scope to record arbitrary chords, but must explain what is being recorded, ignore composing/dead/modifier-only events, allow Escape to cancel, and release on blur/close/unmount/window migration. Recording must never invoke the action being configured.

For keys used as recorder controls, provide a separate explicit “Use Escape as shortcut” choice or equivalent non-conflicting UI; otherwise Escape remains cancellation. Modifier-only shortcuts and multi-stroke sequences are outside this delivery.

---

## 9. Action catalog and command publication

### 9.1 Catalog rules

Use stable, nonlocalized internal IDs. Keep the host ID as explicit metadata rather than deriving existing IDs from a new naming convention. A parameterized family such as “create relation” can share one implementation while exposing a finite set of named variants.

Every implemented user operation must have one of these dispositions:

- **Configurable action:** available in the local menu/settings, with optional local bindings and a publishable command when it can resolve its required context.
- **Session protocol action:** submit/cancel/choose within an existing dialog or connection session. Uses common dispatch where appropriate, but is not independently publishable without a live session.
- **Native widget behavior:** caret movement, suggestion traversal, Tab, button Enter/Space, slider adjustment. Remains with the widget and is not a global command.

Do not register one command per note, pin, history item, ontology field or graph edge. Those are parameters selected by pickers. Fixed pin slots are a small bounded exception.

### 9.2 Preserve the existing host command contract

These 22 local command IDs must survive unchanged. Their full host IDs have the existing `k-plex:` plugin prefix. Migration must not create an additional visible compatibility alias for each.

| Existing local Obsidian ID | Proposed internal action ID | Publication on upgrade |
|---|---|---|
| `kplex-start` | `surface.open-tab` | On |
| `kplex-rebuild-index` | `index.rebuild` | On |
| `kplex-copy-index-diagnostics` | `index.copy-diagnostics` | On |
| `kplex-open-popout` | `surface.open-popout` | On |
| `kplex-open-sidepanel` | `surface.open-sidepanel` | On |
| `kplex-search` | `search.focus` | On |
| `kplex-add-child` | `relationship.create-center.child` | On |
| `kplex-add-parent` | `relationship.create-center.parent` | On |
| `kplex-add-friend` | `relationship.create-center.left` | On |
| `kplex-add-challenger` | `relationship.create-center.right` | On |
| `kplex-sync-tab-from-plex` | `document.sync-from-center` | On |
| `kplex-sync-plex-from-tab` | `center.sync-from-document` | On |
| `kplex-focus-active-note` | `center.focus-active-note` | On |
| `kplex-ontology-select` | `ontology.assign.select` | On |
| `kplex-ontology-parent` | `ontology.assign.parent` | On |
| `kplex-ontology-child` | `ontology.assign.child` | On |
| `kplex-ontology-left` | `ontology.assign.left` | On |
| `kplex-ontology-right` | `ontology.assign.right` | On |
| `kplex-ontology-previous` | `ontology.assign.previous` | On |
| `kplex-ontology-next` | `ontology.assign.next` | On |
| `kplex-ontology-hidden` | `ontology.assign.hidden` | On |
| `kplex-ontology-excluded` | `ontology.assign.excluded` | On |

Retain editor callbacks for the nine ontology commands. Preserve phone/tablet/pop-out capability checks for surface-opening commands. Adding a common descriptor must not make an unavailable desktop command appear on a phone.

Existing host command names can be clarified through their localization keys, but IDs must not change. “Add child” should explain in its description/settings help that it operates on the Plex center. Selected-node variants must say **selected node** in the visible label.

### 9.3 New action families required for keyboard coverage

The following is the required catalog surface. Families may generate several descriptors from typed data; do not copy operation logic for each variant.

| Family / representative IDs | Target / behavior | New publication default |
|---|---|---|
| `actions.open`, `actions.configure`, `keyboard.help` | Local action menu, action settings, generated shortcut help | On only for `actions.open` and `actions.configure` |
| `graph.focus`, `editor.focus` | Explicit focus transfer to the Plex or its existing editor/sidecar | On for `graph.focus`; other off |
| `selection.move.{up,down,left,right}` | Select/reveal a displayed occurrence | Off; commands require graph-context origin, including a palette opened from that graph |
| `selection.section.{up,down,left,right}`, `selection.center` | Section jump or return selection to center | Off; same context restriction |
| `node.activate`, `node.open`, `node.rename`, `node.edit` | Distinct centering/opening/renaming/editing intents | Off |
| `node.context-menu`, `node.copy-link`, `node.note-type`, `node.delete` | Same operations and safety checks as current node menus | Off |
| `node.open.{new-tab,split,window,browser,web-viewer}` | Explicit supported open destinations from the existing node menu; device/file-type predicates retained | Off |
| `nodes.open` | Searchable visible-node picker; selection and activation are explicit separate outcomes | Off |
| `sections.toggle`, `sections.fold-all`, `sections.unfold-all` | Current center's Markdown section projection; no graph-wide semantic folding | Off |
| `section.toggle-level`, `section.fold-descendants`, `section.unfold-descendants` | Existing transient section operations for a selected/explicit heading occurrence | Off |
| `search.focus`, `find.focus` | Vault search versus search/filter within the displayed Plex | Existing search on; find off |
| `history.back`, `history.forward`, `history.open` | Existing traversal plus complete searchable history picker | On for back/forward; picker off |
| `pin.toggle`, `pin.add`, `pin.remove`, `pins.open`, `pin.open-slot.{1..9}` | Toggle selected-or-center; idempotent explicit add/remove; searchable pins; fixed ordered slots | On for toggle and picker; others off |
| `relationship.create-center.{parent,child,left,right,previous,next}` | Create/connect from center with role preselected | Four existing on; previous/next off |
| `relationship.create-selected.{parent,child,left,right,previous,next}` | Same composer, strict selected-node origin | Off |
| `relationship.connect`, `relationship.connect-visible` | Pick an existing target, or keyboard-select one in the displayed graph | Off |
| `relationship.details`, `relationship.relink`, `relationship.unlink` | Pick or capture a connection, then use existing details/writer rules | Off |
| `view.depth.toggle`, `view.aliases.toggle`, `view.connectors.toggle` | Wrap the corresponding current toolbar operations | Off |
| `view.filters.open`, `view.lens.choose`, `view.sort.choose`, `view.visibility.open` | Expose existing filter/lens/sort/visibility UI through keyboard-accessible controls | Off |
| `view.areas.toggle`, `view.layout-controls`, `view.zoom-in`, `view.zoom-out`, `view.fit`, `view.pan.{direction}` | Area/layout controls and camera operations through existing camera state | Off |
| `view.center-editor.toggle`, `view.sidecar.toggle`, `view.sync.choose` | Existing embedded-editor, sidecar and document-sync capabilities | Off |
| `view.sidecar.position`, `view.sidecar.detach`, `view.sidecar.collapse-plex` | Current sidecar move/detach/fold controls; explicit owning surface | Off |
| `surface.open-*`, `index.*`, `ontology.assign.*` | Existing host actions brought into the same menu/catalog | As in Section 9.2 |

`node.open` must preserve the distinction between opening an existing file/URL and materializing a ghost. A ghost-open action is potentially mutating and must present the existing creation choice, not classify itself as a harmless file read. Folder/tag navigation is not file editing.

`relationship.details/relink/unlink` can use an explicit edge from a context menu. Invoked from a node/command, they first offer a connection picker anchored to that node, with direction, ontology and endpoint labels. They must not guess which of several connections the user means. Inferred evidence without a directly removable declaration should offer the existing inspection/explanation, not a fabricated unlink operation.

The catalog is an inventory to complete, not permission to invent absent features. For a listed view operation whose current control combines several choices, the first action may open that existing keyboard-accessible control. A later dedicated shortcut variant is optional. Every current mouse-only meaningful operation must be audited against the inventory before sign-off.

**Additional identity/target rules:** `node.activate/open/rename/edit`, `pin.toggle`, and connection-start actions use selected-or-center only where that fallback is stated in their labels/help. `node.delete` requires an explicit target or a valid selection, never a silent no-selection center fallback. `pin.add/remove` are idempotent and target an explicit pin/node; a stale remove request must not toggle it back on. Section-folding actions target current transient section state and do not pretend that arbitrary ontology branches form a tree.

Camera actions share the existing `applyCamera()` and `fit()` effects. Keep current zoom increments/clamps. Unbound directional pan actions can move by a fixed viewport-space step converted by the existing camera transform; do not reuse node-selection arrows as pan keys or introduce a second camera model.

For new published actions, use literal command IDs recorded in the catalog. Reserve `kplex-actions`, `kplex-configure-actions`, `kplex-focus-graph`, `kplex-history-back`, `kplex-history-forward`, `kplex-toggle-pin`, and `kplex-open-pins` for the newly default-published actions. Other new command IDs can initially follow `kplex-action-` plus a hyphenated internal ID, but materialize and test them as stable metadata; later label/internal organization changes must not rename saved host IDs.

### 9.4 Relation roles are semantic, not screen directions

Reuse the existing six-value `RelationshipRole`: `parent`, `child`, `left`, `right`, `previous`, `next`. User-facing `left` means **friend**, and `right` means **challenger**. Previous/next are separate semantic relations, even where rendering shares a physical gate.

The composer already supports all six roles, but `RelationModalOptions.semanticRole` and some older adapters use four-value `GateRole`. Extend the **creation** adapter contract to accept `RelationshipRole`; keep relink/gate-specific APIs narrow where required. A discriminated create-versus-relink options union avoids widening every physical-gate API. Do not cast `previous` to `GateRole` to satisfy the compiler.

### 9.5 Live publication using public APIs

Maintain a map of commands actually registered by this adapter. After a committed preferences change, calculate a diff:

- Add newly published commands with `plugin.addCommand()`.
- Remove newly unpublished commands with `plugin.removeCommand(localId)`.
- Do not re-register every existing command on every React render or unrelated settings save.
- Re-register only where host-visible metadata genuinely changes, such as an application language reload.
- Never register `hotkeys` defaults for these global commands.

Use ordinary `checkCallback` for ordinary actions and `editorCheckCallback` for editor-only actions. Both preliminary and execution calls ask the manager for eligibility. On the execution call, dispatch through the same manager with a fresh snapshot. Catch asynchronous errors inside the manager; do not return a promise from a boolean availability callback.

Conceptually:

```ts
checkCallback: (checking) => {
  const request = makeCommandRequest(actionId);
  const availability = manager.check(request);
  if (availability.state === "disabled") return false;
  if (!checking) void manager.dispatch(request);
  return true;
}
```

`dispatch()` must re-resolve and recheck; the preceding call is not an authorization token. For editor actions, keep the supplied editor/view in a short-lived host invocation adapter and resolve the cursor field again during execution.

The action preferences UI must say:

> Published actions appear in Obsidian commands and can receive global hotkeys in Settings → Hotkeys. Turning publication off makes that command unavailable there. Local K-Plex bindings are independent.

Preserve stable IDs and never delete or rewrite the user's host hotkey assignments. **Retention across remove/re-add is a real-host acceptance test**, not a guarantee established solely by the API declaration. If a supported host version fails that test, document the host limitation and do not silently overwrite hotkey data. Keep the publication mechanism public-API-only.

An optional convenience link to Obsidian's Hotkeys settings may use the already isolated settings-opening bridge with a safe explanatory fallback. Do not add an unguarded private `hotkeyManager` dependency to read, assign or “repair” host bindings.

---

## 10. Default keyboard experience

### 10.1 Preserve existing assignments

The legacy local action keys map as follows. This mapping is also the migration dictionary.

| Legacy ID | New action ID | Existing default |
|---|---|---|
| `moveUp`, `moveDown`, `moveLeft`, `moveRight` | `selection.move.{direction}` | Arrow keys |
| `sectionUp`, `sectionDown`, `sectionLeft`, `sectionRight` | `selection.section.{direction}` | Alt+Arrow keys |
| `activate` | `node.activate` | Enter |
| `focusSearch` | `search.focus` | F4 |
| `focusFind` | `find.focus` | Mod+F |
| `addParent` | `relationship.create-center.parent` | Mod+Up |
| `addChild` | `relationship.create-center.child` | Mod+Down |
| `addFriend` | `relationship.create-center.left` | Mod+Left |
| `addChallenger` | `relationship.create-center.right` | Mod+Right |

These are local defaults, not proposed global Obsidian shortcuts. In text editors, Mod+Arrow retains text navigation. On macOS/iOS, `Mod` follows the host's Command convention; elsewhere it follows Control, using the existing environment adapter.

### 10.2 Add a small discoverable set

| Default local binding | Action | Eligible context |
|---|---|---|
| `.` | K-Plex actions | Bare graph |
| F1 | Keyboard help | Graph and non-editing K-Plex regions; never an unrelated modal |
| F2 | Rename selected node, or center when no selection | Bare graph; supported real-file target only |
| F3 | Focus graph | K-Plex-owned regions, including its editor when not composing |
| Shift+F3 | Focus current embedded/sidecar editor | K-Plex-owned regions when such an editor exists |
| Home | Select center | Bare graph; not a history-root command |
| `P` | Pin/unpin selected node, otherwise center | Bare graph |
| `B` | Open pins picker | Bare graph |
| `H` | Open history picker | Bare graph |
| Backspace / Shift+Backspace | Plex history back / forward | Bare graph; handled at history boundaries |
| `C` | Connect selected node or center to an existing node | Bare graph; opens target picker/composer |
| Mod+Enter | Open selected node, otherwise center | Bare graph; existing open/materialization policy |
| Shift+F10 / ContextMenu key | Node context menu | Bare graph, anchored to selected occurrence or center |

Leave previous/next creation, deletion, unlink, index rebuild, bulk actions and most view toggles unbound. They remain reachable through `.` or a published command. “Keyboard accessible” must not become “every key performs a surprising mutation.”

New defaults must not displace a migrated binding. When adding a default would conflict with an explicit existing assignment, leave the new action unbound and list it in the migration summary. Resetting all bindings is an explicit user operation, never a side effect of updating the plugin.

Users can turn off all character-only shortcuts without disabling F-keys, arrows or published commands. Do not implement automatic type-to-search in this delivery: it conflicts with mnemonic graph actions and international input. F4 and the search control provide a deliberate entry point.

### 10.3 Easier directional movement, explicitly migrated

Add one preference: **Cross sections at arrow-key boundaries**.

- **Fresh installation:** enabled.
- **Upgrade with existing settings:** disabled to preserve current behavior; explain the new option in shortcut help.
- **Enabled behavior:** try the existing within-section movement first. At a boundary, use the existing directional section-jump policy. This lets a plain arrow leave the center and traverse the visible graph naturally.
- **Disabled behavior:** retain the current rule; Alt+Arrow is required to leave a section.
- Alt+Arrow always requests a section jump, regardless of the setting.

Do not change the spatial scoring, add graph queries, or navigate to invisible nodes to implement this. Preserve a deterministic tie-break, preferably projection encounter order. Selection reveals through the existing overflow-scroll/camera path rather than relayout on every key.

Keep Enter's existing compatibility behavior: a neighboring node activates/centers; the existing center-file path can open rename. Provide explicit `node.open`, `node.rename` and `node.edit` actions so users can choose predictable alternatives without changing the existing Enter assignment. A later change to Enter semantics needs its own migration, not this refactor.

### 10.4 Selection and accessibility

Retain one graph focus anchor rather than inserting hundreds of SVG nodes into the Tab order. Add a clear visual selection ring distinct from hover and center styling. Supply an accessible selected-node description containing title, relation/section and available primary action; use a stable referenced description/live region without pretending an arbitrary graph is a tree.

Do not add `role="application"` to the whole view as a shortcut to screen-reader support. Keep native toolbar buttons, search fields, pin lists, history lists and dialogs operable by Tab/Shift+Tab. The local visible-node picker is the linear, searchable alternative to spatial navigation.

When selection disappears due to a user filter or center change, retire the occurrence selection and fall back to center for non-strict actions. When a captured mutation target disappears, do **not** substitute center: keep the captured identity and validate or cancel. Background hydration must not repeatedly steal selection or focus. Preserve current occurrence IDs where the projection permits it.

### 10.5 Pins and history

The pins picker lists all saved pins, not only a visible toolbar subset. It supports fuzzy title/path search, Enter to navigate, an explicit open-in-editor action, and an accessible remove-pin action. Its operation rows call the manager with the chosen pin as an explicit target.

Optional slots 1–9 refer to saved pin order. They are not the first nine currently filtered or loaded rows. A missing/unresolved pin does not cause slot 3 to open slot 4. Show the missing entry and offer removal; preserve identity and order through lazy hydration. No default Ctrl+number global assignments are installed.

The history picker exposes the existing bounded history, not only the footer's last fourteen entries. Back/forward call the same `goHistory()` adapter as the toolbar. Do not introduce an independent engine history or rewrite the current deduplicated-history semantics here. When a history item is deleted or unavailable, report that entry and allow explicit movement onward; never silently create a ghost while traversing history.

History is a sequence of visited nodes, not a breadcrumb tree. Do not label its first entry a session root or infer ancestry for issue #59.

---

## 11. End-to-end keyboard workflows

### 11.1 Search and act

F4 focuses the existing vault search without changing the center. Search result navigation stays with its fuzzy widget. Enter uses the existing activation path. Escape first closes suggestions, then returns focus to the invoking graph/control. An action-menu entry can open a **visible nodes** picker for a keyboard/screen-reader-friendly list of the current displayed projection.

Keep vault search and Plex find distinct. Plex find changes the displayed filter/search state as today; native editor find stays native. Search results and empty-state messaging must retain existing partial-index/URL-inventory qualifications. Starting a search or opening an action menu must not trigger a full-vault semantic acquisition just to compute eligibility.

### 11.2 Create a relationship from the center

1. Invoke an existing `Mod+Arrow` local shortcut or the corresponding published command.
2. Resolve and freeze the center under Section 7.
3. Open the existing native relation composer with the role preselected, origin visible, owner context attached, and the name field focused.
4. Choose an existing note or create a supported new note/URL/placeholder using the current rules. Alias and ontology remain accessible by normal Tab navigation.
5. Submit with an explicit continuation intent.

Do not implement a separate “keyboard creation” dialog. The same composer is used by gate clicks, toolbar/menu actions, local shortcuts and global commands. Folder-child creation remains the physical-file-in-folder exception. Keep legacy global creation's folder/tag exclusion; expose folder creation through an explicitly eligible local/selected action rather than changing the old command unexpectedly.

### 11.3 Create from a selected node

Use `.` and choose **Add child to selected node**, or assign that action a shortcut. The selected-node family has a strict selection target; it never quietly becomes center creation.

Reusing the selected node as origin must not first center it. The dialog identifies it clearly. After completion, navigation follows the explicit continuation intent. This avoids a forced center/history transition merely to add one related idea.

### 11.4 Creation continuation

Add a compact accessible completion-mode selector to the existing composer. Provide these intents:

| Intent | Effect after a confirmed save |
|---|---|
| `configured` | Preserve current submit behavior, including the existing edit-after-create preference. |
| `return` | Close and return to the invocation context; no automatic following. |
| `another` | Keep the same origin/role/ontology/type, clear target/name/alias, focus name input. |
| `follow` | Close, activate the resulting node, focus the graph. |
| `edit` | Open the resulting supported note in the existing intended editor/sidecar workflow. |

Keep `Mod+Enter` as the compatibility submit action. Add **Mod+Shift+Enter** for submit-and-another, provided no suggestion/widget owns it. The other intents are available through the mode selector and configurable session shortcuts; avoid assigning every Enter modifier combination by default.

Plain Enter remains the focused widget's behavior: accept an open suggestion first, activate a focused button, or perform an explicitly documented form-submit behavior. It must never both choose a target and save the relationship from one event. `Escape` dismisses suggestions before closing the modal. Composing text never submits.

Replace `triggerPrimaryAction()`'s DOM-button `.click()` dispatch with a shared submit callback/session action used by the actual button as well. This removes keyboard dependence on a CSS selector and ensures busy/validation handling is identical. Keep native button semantics.

The `another` loop preserves only useful configuration; it must not retain the previous target, alias or target-specific validation state. A failed save keeps user input. A saved-but-pending result must not clear input and issue another mutation automatically; show its saved status and require an explicit next step. Closing during a write cancels pending focus/navigation, not a write already committed to disk.

For linking an existing note, “follow” means follow that chosen target. “Edit” is available only for targets the existing editor workflow can edit. The dialog must not offer a meaningless edit intent for a URL, folder or tag.

### 11.5 Connect two existing nodes

Provide two front ends to the same operation:

**Picker route — required default.** `C` captures selected-or-center as origin and opens an existing-target picker/composer. Show origin, role and target separately. Search can reuse the current allowed-note search; pins/history tabs are filtered through the same endpoint capability rules. Choosing a target populates the composer but does not save until confirmation. Roles and ontology fields remain selectable from the keyboard.

**Visible-graph route — required additional action, unbound by default.** “Connect using visible nodes” enters a transient connection-target mode. Freeze the origin, show a persistent mode banner, use arrows to select a different displayed node, and use Enter to open the same composer with a fixed target. F4 opens a target picker within this session; it must not navigate the graph behind the session. Escape cancels and restores the prior selection.

Use the existing create path with `fixedTarget` for a new connection. Do not invent a `mode: "connect"` value for `RelationModalOptions`, and do not use relink for every new edge. Existing-relationship handling remains the writer's decision; if the operation would move/replace a relation, show the existing appropriate confirmation/details workflow.

There is no need to synthesize pointer drags or fake mouse events. Keyboard target selection is another source of two endpoints. The final operation calls the same existing relation writer.

### 11.6 Inspect, change and remove a connection

A selected-node action opens a connection picker. Rows identify the other node, semantic relation and available evidence/storage owner. Enter opens the existing connection-details UI; explicit actions choose relink/add ontology/unlink as supported. A captured edge menu skips the picker.

Do not bind bare Delete to note deletion or unlink by default. Those are different operations with different confirmation requirements. An inferred edge may not have a directly removable frontmatter declaration. Deletion and unlink must keep the existing source ownership and confirmation rules, including explicit endpoint names.

### 11.7 Open a contextual menu without a mouse

Use Shift+F10 or the ContextMenu key. Obtain a screen position from the selected occurrence's current element/geometry in the owning document and call `showKplexMenuAtPosition()`. If the occurrence is offscreen, reveal it first; if absent, use the graph focus anchor. Use the same menu construction/action descriptors as pointer invocation.

Opening the menu freezes its explicit target. Native menu keyboard handling owns subsequent arrows/Enter/Escape. It must not leak those events into graph navigation.

### 11.8 Why sibling creation is not a default action here

In a tree, creating a sibling often means “use my parent.” A Plex node can have multiple parents or only inferred parent relations. Do not copy Mindmap Builder's Alt+Enter sibling operation with an arbitrary first parent.

The supported route is to choose the intended parent, then add its child, including through repeated `another` creation. A future dedicated sibling action must select/confirm a shared parent and storage policy. This is explicitly deferred, not an unimplemented assumption inside the current action engine.

---

## 12. Preferences, conflict management and migration

### 12.1 Settings model

Store user choices in one versioned workflow settings object. Keep a bounded forward-compatible record for unknown future actions; do not execute unknown entries.

```ts
type LocalBinding = Readonly<{
  match: "key" | "code";
  value: string; // e.g. "ArrowDown", "p", "KeyP", "Digit1"
  modifiers: readonly ("mod" | "ctrl" | "meta" | "alt" | "shift")[];
}>;

type ActionPreferencesV1 = {
  version: 1;
  // Absent entry = catalog default. Empty array = explicitly disabled.
  localBindings: Record<string, readonly LocalBinding[]>;
  // Absent entry = descriptor default, false = explicitly unpublished.
  publishedCommands: Record<string, boolean>;
  characterShortcutsEnabled: boolean;
  crossSectionAtBoundary: boolean;
  legacyUnknown?: Record<string, unknown>; // Preserved, never executed.
};
```

Multiple bindings per action are supported, but each is a single chord. Bound user-editable arrays and strings defensively; use a reasonable limit such as four bindings per action and reject oversized/imported input with a useful message. Do not persist callbacks, target identities, selected nodes, focus state, native scope objects, availability or mutation permissions.

New preference keys must not enter the semantic settings signature or trigger index hydration. Save through the existing workflow persistence path, then emit a dedicated action-preferences notification so controls/keymaps update. Do not call `index.notify()` merely to refresh shortcut labels.

### 12.2 Logical versus physical keys

For new bindings, the recorder offers **Character/key** versus **Physical key position**. Prefer logical keys for mnemonic new defaults; use named non-printing keys for navigation. Physical mode stores `event.code` explicitly and is labeled as layout-dependent position rather than a character promise.

Existing Latin-letter/digit bindings migrate to physical `KeyX`/`DigitN` matching because that is what the current matcher effectively does. Existing named keys such as ArrowDown and F4 migrate to logical named-key matching. Preserve modifiers, explicit disablement and the existing default behavior of malformed legacy entries.

Normalize modifier order and platform equivalents when compiling, not through string comparison of display labels. Caps Lock does not create a new binding. An explicit Shift modifier does. Reject redundant/contradictory modifier descriptions after platform resolution with an explanation.

Native registration is a transport projection: uppercase Latin letters where the public Obsidian API expects them, but always verify the actual event against the canonical local binding. Physical/non-Latin delivery must be exercised in the real host and supported by the owned DOM route; do not silently claim a binding works merely because a display pill was recorded. Do not synthesize a second key event to make a transport match.

### 12.3 Conflict categories

| Conflict | Required behavior |
|---|---|
| Same chord, same overlapping local contexts, different actions | Reject saving until resolved; offer replace/unbind existing action. |
| Equivalent modifiers on a platform, such as Mod versus Ctrl on Windows | Treat as the same chord for that platform. |
| Logical/physical bindings that can match the same actual event | Warn during recording with observed layout facts; reject confirmed overlap; runtime ambiguity always cancels. |
| Same chord in disjoint modes, such as graph Enter and composer Enter | Allowed; show context labels. |
| Collision with immutable native widget protocol, such as text caret arrows or Tab traversal | Do not allow expanding the action into that widget context. |
| Collision with a migrated user binding | Keep the user's assignment; leave the new default unbound. |
| Potential collision with an Obsidian/global/OS shortcut | Clearly distinguish “not checked” from “no conflict”; show host-settings guidance and require real-host testing for problematic chords. |

Do not promise exhaustive cross-plugin/OS conflict detection. No inspected public API contract establishes a complete global shortcut-inspection service. The core deliverable checks K-Plex's own active contexts thoroughly without depending on `app.hotkeyManager` internals. A later optional read-only compatibility adapter can improve visibility, but cannot be required for correct operation.

Within a focused graph, a valid local binding takes precedence over an identically assigned parent-scope host command. Outside that graph context, the local binding does not participate. Explain this distinction in settings.

### 12.4 Settings UI

Add a top-level **Actions and shortcuts** section, replacing the isolated local-hotkeys presentation with a searchable manager. Follow the repository's declarative settings requirements. Suggested columns/details:

```text
Action / category / description
Local shortcuts: [binding pills]  [+] [disable] [restore]
Local context: Graph only / K-Plex focus / Composer only
Obsidian command: [Published toggle]  [Manage in Obsidian]
Target: Plex center / Selected node / Editor field / Explicit selection
Status: Available / Needs a target / Unavailable on this device
```

Filters: text/category, locally bound, published, changed from defaults and conflicts. Provide per-action reset, reset local bindings, reset publication and a separate explicit reset-all choice. Never reset host-managed shortcuts.

Keep capabilities and context maximums read-only. There is no dropdown that turns a graph-only shortcut into “all of Obsidian.” Global reach comes from the publication toggle. The local menu and help remain available through plugin settings even when the user unpublishes every command.

Display effective local bindings on tooltips/help/menu rows from one formatter, including platform modifiers. Do not show a local shortcut as though it were the user's global Obsidian binding. When external bindings are unknown, say they are managed in Obsidian rather than showing invented values.

### 12.5 Migration algorithm

1. Detect the absence of `actionPreferences.version`. Determine fresh installation from the raw persisted `loadData()` result before merging defaults; an existing saved settings object is an upgrade, even when it has no explicit hotkeys. Do not infer freshness from the absence of the new property alone.
2. Sanitize the existing `internalHotkeys` with its existing rules.
3. Map the fifteen known IDs through Section 10.1. Preserve configured values and translate legacy `null` to `[]`.
4. Preserve legacy unknown entries in a compatibility/unknown bucket without executing them or discarding them during saves.
5. Preserve all existing command IDs and publication-on defaults. There was no prior publication preference to infer from host hotkeys.
6. Apply new defaults only where they do not conflict with migrated bindings. Record skipped defaults for the user, not as an error that prevents startup.
7. Set `crossSectionAtBoundary` false for upgrades and true only for a fresh installation. Default character-shortcut support to on, but give it a visible disable switch.
8. Compile and validate the new preferences before persistence. Do not mutate the original settings object until validation succeeds.
9. Save once through the workflow-only path; then swap the compiled runtime preferences, update native registrations/publication and notify presentation subscribers.
10. Keep a migration marker and compatibility data for at least one release; rerunning startup must not restore defaults over explicit `[]` or `false` values.

Once version 1 exists, absent entries inherit only safe catalog defaults; explicit disabled entries stay disabled. Unknown newer-version preferences must be retained and reported rather than destructively rewritten by an older plugin.

The importer for **ExcaliBrain** settings must continue to exclude commands, hotkeys and workspace/history state. A new K-Plex-native preferences importer, if delivered, validates only its own schema and previews conflicts; it is not a reason to broaden the foreign importer.

### 12.6 Applying settings safely

Serialize action-preference updates and tag them with a revision so a slow earlier save cannot overwrite a later one. Maintain separate desired and actually registered publication state when applying a host registration diff; report a registration error instead of displaying false success.

On persistence failure, retain the last committed runtime configuration and the editable draft. On partial native-registration failure, reconcile using stable IDs and the last known actual set, then offer retry/reload guidance. Never retry by editing the user's hotkey file. Do not rebuild the semantic index to recover a keymap failure.

---

## 13. Open-issue inputs and scope boundaries

The live query returned 22 open issues. None was a dedicated specification for an action manager, but the following requests or regressions materially affect this design. “Covered” here means a design requirement or regression test, not that the issue is fixed or should be closed automatically.

| Issue | Relevant input | Required response in this delivery |
|---|---|---|
| [#16 — Multi-Operations][I16] | Operate consistently on multiple selected items and relationships. | Keep target resolution and mutation entry points extensible. Do not implement bulk writes or pass an array into single-node writers and call that batch support. A future batch action needs preview, ownership, partial-failure and confirmation policy. |
| [#20 — Show all related notes on focus][I20] | Focused-node exploration and configurable focus triggers. | Keyboard selection needs comparable highlighting and reveal access. Do not conflate pointer hover with keyboard mutation target. Automatic rearrangement of all related nodes remains separate. |
| [#31 — Multiple K-Plex tabs][I31] | Preserve a working Plex while exploring another; a comment also requests mobile support. | Introduce per-surface routing, snapshots and lifecycle identities now. Preserve existing shared navigation; do not claim independent sessions. Do not make the adapter desktop-only. |
| [#35 — Tablet dialogs with physical keyboards][I35] | Windowed dialog preference, Enter/Escape/focus, reliable capability handling. | Keep native modal shells and existing environment seam. Exercise physical keyboards and software keyboards. Dialog presentation policy is separate; never infer hardware keyboard presence from screen size or lack of a visible software keyboard. |
| [#59 — Breadcrumb trail][I59] | Jump back through a rooted navigation path and redefine root. | Expose history actions and a picker, but do not equate deduplicated history with ancestry. Future root/breadcrumb actions can attach to the catalog without changing key transport. |
| [#24][I24] and [#51][I51] — Excalidraw/Markdown switching | K-Plex interaction can interfere with a separate view's mode switch. | Add regression tests with a background Plex and explicit Excalidraw/Markdown view changes. Commands must not implicitly re-open or resynchronize an unrelated editor. This review does not establish those issues' root cause. |
| [#54 — Sidebar preload][I54] | Hidden/sidebar navigation should reflect the intended note without another tap. | Focus/search actions must reveal the intended surface and wait for its adapter, not render an old target or use a fixed delay. Full preload behavior remains with existing visibility/navigation code. |
| [#77 — Child creation with other plugins][I77] | Creation confirmation is unavailable or obscured in some Linux/Android combinations. | A keyboard submit path must call the same semantic callback as the button, and the button must remain reachable/visible. Add plugin-interaction tests; do not claim that a hotkey alone fixes layout/CSS interference. |
| [#33 — Inverse ontologies in created notes][I33] | Optional explicit reverse declarations. | Keep persistence policy inside canonical writers. Do not introduce an inverse-write option only for keyboard creation. Implementing the requested storage policy is out of scope. |
| [#66 — Add alias to a link][I66] | Context-menu alias editing; issue has no detailed body. | Catalog supports an explicit edge-target action when the feature exists. Current composer alias entry must remain keyboard-accessible; do not invent a new link-alias persistence model here. |
| [#9 — Custom siblings][I9] and [#61 — Synonym/antonym fields][I61] | Evolving semantic groups and their visual placement. | Separate semantic role from physical direction. Do not add the proposed ontology types or hardcode new containers in the action manager. |
| [#65 — Bases in editor node][I65] | More embedded editor/content types. | Focus ownership must treat embedded interactive content as an editor/control boundary, not assume every center is a Markdown canvas. No Bases rendering implementation is included. |

Other open indexing/rendering issues remain outside the action-manager scope. Nevertheless, the acceptance suite must exercise partial hydration because shortcuts must not become another source of full-index work or unstable selection.

---

## 14. Special cases and safety boundaries

### 14.1 Target capability matrix

Resolve capabilities through the current service rules, with this matrix as an acceptance guide rather than a new competing ontology implementation.

| Target | Navigate/select | Open/edit | Create/connect/mutate |
|---|---|---|---|
| Real Markdown note | Yes when displayed/resolvable | Existing document/sidecar editing | Existing ontology writers and validation |
| Excalidraw note | Yes | Existing plugin-aware opener/editor | Respect supported file type and current creation rules |
| Attachment | Yes | Existing file opener; do not assume Markdown editing | Only existing supported storage/inverse-write paths |
| URL node | Yes when available | Explicit external/open behavior | Existing URL relationship rules; no Markdown editor intent |
| Ghost/virtual note | Yes | Materialization is an explicit mutation workflow | Revalidate names, creation locations and current writer support |
| Folder | Yes | Not a Markdown note | Existing child-in-folder exception only; no invented ontology write to a folder |
| Tag | Yes | Not a Markdown note | Existing restrictions; no file mutation against a tag path |
| Transient heading/section occurrence | Yes while displayed | Existing `openSection()` and subpath behavior | Resolve a supported underlying file explicitly; never write to the transient occurrence ID |
| Missing pin/history target | Keep identifiable entry | Explain or perform targeted resolution when genuinely unresolved | Never turn a history visit into implicit file creation |

For current section operations, preserve the `PlexGraph.tsx` menu behaviors around `expandSections`, `foldAllSections`, `foldOneLevel` and descendant folding; do not substitute Mindmap Builder tree folding for these source-section projections.

An absent index entry during hydration is not proof that a file was deleted. Cheap host existence facts may distinguish missing from not-yet-indexed; targeted resolution is an executed action. Rendering the picker or checking command availability must not eagerly hydrate every unresolved row.

### 14.2 Multiple surfaces without a session rewrite

A surface-specific selection move, focus change, camera change, picker or composer opening affects only that surface. Existing global center broadcasts continue to behave as before. Local activation continues through that App's existing `activate()` function; global navigation continues through the existing explicit service where appropriate.

Do not accidentally broadcast local focus/search actions just because `subscribeNavigation()` exists. Conversely, do not replace a global navigation broadcast with a local one and imply that this is merely action wrapping. Any intentional change to shared center/history behavior needs its own tests and release note.

### 14.3 Sidecars and external editors

`editor.focus` may focus the existing editor/sidecar associated with the chosen Plex surface. It must not choose an unrelated recent file leaf. If none exists, offer an explicit Open/Edit action rather than creating an editor as a hidden effect of “focus.”

F3's local editor-to-graph transfer is supported inside K-Plex-owned embedded content. A separate native sidecar/document leaf is not permission to attach graph shortcut listeners to arbitrary editors. From such a leaf, the user can invoke the published **Focus graph** command or assign it a global hotkey in Obsidian. This preserves the host's ownership model while keeping the full workflow keyboard accessible.

### 14.4 Cancellation and partial writes

Before a write starts, cancellation prevents it. After a write is committed, cancellation only suppresses pending UI effects; it does not imply rollback. A file created before a relationship-write failure may already exist. Report that partial outcome with a route to the file/recovery; do not reissue the whole “create file” operation on a blind retry.

The existing writer still owns metadata convergence and source-level correctness. Action single-flight guards prevent accidental duplicate requests; they are not database transactions and do not replace writer concurrency safeguards.

### 14.5 Privacy and diagnostics

No telemetry or external service is needed. A local debug trace may record action ID, source, availability code, duration, surface kind and outcome, but must not copy note text, user ontology values, file names or search queries into exported diagnostics by default. Focus handles, editor handles and captured targets are ephemeral and released on session disposal.

### 14.6 No invented undo

Leave editor Undo/Redo with the editor. Do not publish a “K-Plex undo” action unless there is a genuine, tested inverse-operation implementation for the affected mutation. The existence of an action engine or Excalidraw's action result type does not make K-Plex file operations transactionally undoable.

---

## 15. Implementation sequence and bounded review points

Implement all increments for the full keyboard-management delivery. Each increment should leave a runnable plugin and have a clear reviewable diff. Do not report the facade-only first increment as completion of the requested keyboard workflow.

### A. Establish inventory and compatibility tests

**Work:** enumerate all `addCommand`, scope registrations, keydown handlers and meaningful toolbar/context-menu operations. Classify each as configurable action, session protocol or native widget behavior. Record current command IDs, existing shortcuts, center/selection behavior and current composer completion behavior in tests. Resolve the duplicate composer-source question.

**Likely files:** tests, a compact checked-in action inventory, and the duplicate composer cleanup only if required.

**Exit:** a failing test would detect changed legacy command IDs, changed explicit disabled shortcuts, changed center-target creation, or a native widget accidentally reclassified as a graph action.

### B. Introduce the catalog and manager, wrapping existing commands

**Work:** add portable types/metadata and the manager; attach implementations through existing host callbacks. Add ordinary/editor command adapters but initially publish the same existing 22 commands. Route those commands through the manager. Keep operation logic and settings behavior unchanged.

**Likely files:** `actions.ts`, `ActionManager.ts`, `actionCommands.ts`, `main.ts`, new action/command tests.

**Exit:** existing commands work identically from both graph and external editors; eligibility is pure; all existing IDs are unchanged; errors are handled once; no architecture boundary exemptions.

### C. Register surfaces and consolidate local keyboard delivery

**Work:** register fresh-ref surface ports; unify search/find and navigation bindings in one dispatcher; keep the existing selection/reveal state owner; implement mode ownership, native/DOM deduplication and lifecycle cleanup. Replace the blanket embedded-editor navigation exclusion with actual focus checks. Add the optional boundary-crossing preference without changing upgraded defaults.

**Likely files:** `usePlexActions.ts`, `internalHotkeys.ts`, `internalHotkeyScope.ts`, `usePlexKeyboardNavigation.ts`, `KplexView.tsx`, `App.tsx`, `PlexGraph.tsx` and tests.

**Exit:** no second action resolver remains in App; graph keys work beside an embedded editor but do not affect its text; sidepanel and pop-out ownership pass host tests; old listeners are released.

### D. Add action settings, migration and live publication

**Work:** versioned preference model, multi-binding recorder, local conflict compiler, publication toggles, per-action reset and dedicated preference notifications. Apply the fifteen-action migration and protect the twenty-two host IDs. Add the searchable settings manager and localization.

**Likely files:** `settings.ts`, existing settings UI, `internalHotkeySettings.ts`, language files, command adapter and migration tests. Modify settings-effect tests, not semantic-index code.

**Exit:** disable/publish/reset persists correctly; existing host bindings survive the supported remove/re-add lifecycle test; no full index rebuild or semantic signature change follows shortcut editing; UI matches actual registration state.

### E. Complete keyboard routes and continuation workflows

**Work:** local action menu; pins/history/visible-node/connection target pickers using shared list primitives; missing action wrappers; selected-node creation; keyboard connection session; context-menu invocation; explicit composer continuation/result callbacks and keyboard submit. Convert toolbar/context-menu intent callbacks to dispatch without changing their visual layout.

**Likely files:** `ActionMenuModal.ts`, at most one shared target-picker shell if useful, App/graph/menu owners, active composer, creation adapter types and focused mutation-boundary results.

**Exit:** every required keyboard journey in Section 16 works without a mouse; UI and keyboard operations use the same action definition and underlying writer; selected-node versus center creation is visible and deterministic.

### F. Host validation, cleanup and documentation

**Work:** run the full checks and real-host matrix; remove dead legacy dispatch branches; generate shortcut help from effective preferences; update user-facing help and release notes. Record results and remaining platform limitations in the implementation handoff.

**Exit:** final acceptance checklist passes or explicitly identifies a supported-platform blocker. Do not call a jsdom-only run full keyboard validation. Do not retain a temporary direct callback path just because it makes one test pass.

### 15.1 Avoid recursion during callback conversion

When replacing a button callback with `dispatch()`, preserve a separate implementation callback for the manager's port. The port must not call the newly converted button callback and re-enter `dispatch()` recursively. Name the implementation by its operation, not by a DOM event, and test that one UI gesture produces exactly one service invocation.

### 15.2 Scope-control rules for the implementation agent

Do not move index, source acquisition, relationship-writing, layout or editor code into new packages. Do not add a dependency-injection framework, state-management library, command scripting DSL, or general event bus. The existing scheduler and architecture rules are sufficient.

When wrapping an existing action reveals a bug outside this boundary, document it and add a reproduction. Fix only what is necessary for action/focus safety and consistent entry-point behavior, with a narrow test. Do not bundle speculative issue fixes into the hotkey redesign.

---

## 16. Verification plan

### 16.1 Automated coverage

Extend existing `tests/internal-hotkeys.test.mjs` and `tests/ui-components.test.mjs`. Add focused manager, publication and migration tests, and explicitly include new test files in `package.json`'s existing test command; this repository does not discover all new tests automatically.

| Area | Required assertions |
|---|---|
| Catalog completeness | Unique action and command IDs; implementation for every runnable descriptor; all old IDs preserved; valid localization keys; no unsupported role/gate cast. |
| Typed dispatch | Action-specific arguments checked; unknown or malformed action requests rejected; persisted data cannot supply executable callbacks/capability overrides. |
| Availability | No save, focus, modal, vault scan or indexing work during `checking`; execution rechecks after target changes. |
| Target resolution | Local surface never falls back to another; legacy global create uses shared center, not active editor; strict selected actions never become center actions. |
| Invocation capture | Modal origin remains A after center changes to B; deleted/recreated file at same path is rejected; same-file rename is handled explicitly. |
| Event ownership | Same native event through Scope + DOM + React executes once; rejected surface does not mark another's event handled. |
| Modes | Editor, native button, link, slider, combobox, menu, modal and shortcut recorder retain their keys; suggestion acceptance does not also submit. |
| Bindings | Exact modifiers; Mod platform resolution; logical/physical distinction; Caps Lock; malformed input; AltGraph/dead/composition rejection. |
| Conflicts | Same-context collision rejected; disjoint modes allowed; imported ambiguity executes neither action; new defaults never displace user mappings. |
| Repeat/concurrency | Holding create opens one composer; holding submit saves once; movement can repeat; latest navigation supersedes stale queued UI work. |
| Lifecycle | Unmount, migration and close release listeners, sessions and focus handles; old generation cleanup cannot remove new registration. |
| Results | Early-return legacy writer not reported committed; saved-pending is not retried; one error notice; partial file-create failure is recoverable. |
| Preferences | Legacy null → empty bindings; absent versus disabled preserved; unknown entries retained; migration idempotent; save failure does not install draft state. |
| Publication | Stable add/remove diff; editor callback kind preserved; correct unprefixed removal ID; unpublishing does not disable local action; duplicate registrations absent. |
| Settings effects | Action-preference changes leave semantic signature and source acquisition untouched; dedicated UI notification updates help/keymaps. |
| Pins/history | Saved-order slots stable through filtering/hydration; missing slot does not shift; picker is not limited to the footer subset; history never materializes missing files. |
| UI parity | Button, menu, local key and published command invoke the same operation with the same target/result policy, except explicitly documented legacy target context. |

### 16.2 Real Obsidian acceptance scenarios

Use a disposable test vault with A, B, C, two parents of one child, duplicate aliases, a URL, an attachment, a folder, a tag, a ghost, a heading node, pins, enough history and enough neighbors to exercise overflow. Add an Excalidraw note where available.

| ID | Scenario | Expected result |
|---|---|---|
| H01 | K-Plex centered on A; external Markdown editor on B; invoke published Add child. | Composer says A; saved relationship concerns A; B is not implicitly changed. |
| H02 | Repeat H01 with “create and return.” | Invoking editor resumes focus; graph/document is not forcibly reopened or followed. |
| H03 | Repeat with explicit “create and edit.” | New note opens in the intended supported editor workflow; focus transfer is deliberate. |
| H04 | Select neighbor C while center is A; run legacy Add child, then selected-node Add child. | First targets A; second targets C. No hidden pre-centering for the second. |
| H05 | Open an A-origin composer, then change Plex center before submitting. | Captured origin remains A; UI clearly names A. |
| H06 | Delete or replace a captured origin/target before submit. | Safe failure, retained input, no write to a different file that reused its path. |
| H07 | Enter in an open target/ontology suggester, then Enter/Mod+Enter again. | First accepts only the suggestion; subsequent intentional submit executes once. |
| H08 | Hold Mod+Arrow and then hold submit. | One composer/session and one mutation; no duplicate files. |
| H09 | Add three children with submit-and-another, then follow the fourth. | First three share original parent; origin does not drift; fourth becomes center only on explicit follow. |
| H10 | Use C/picker and visible-graph connection routes; repeat for friend/challenger and previous/next. | Same underlying relationship semantics; no physical-gate reinterpretation or duplicate writer. |
| H11 | Inspect/relink/unlink a connection with multiple evidence sources and an inferred-only edge. | Correct storage/evidence choice; unavailable removal is explained rather than fabricated. |
| H12 | Focus graph with embedded central editor enabled, then focus editor and use arrows, Mod+Arrow, Mod+F, copy/paste and undo. | Graph navigation works only on graph; editor behavior remains native. |
| H13 | Use F4 from embedded editor, then Escape; use explicit Focus graph command from a separate native editor leaf. | Intended focus transfers work; no global graph-key interception is installed. |
| H14 | Focus toolbar buttons, pin buttons, sliders, native menus and filter inputs; use Enter/Space/arrows/Tab. | Native control semantics win; no graph movement or accidental pin/mutation. |
| H15 | Click/focus the sidepanel while the workspace active leaf remains a document editor. | Local graph shortcuts still work once; the editor does not receive graph-owned keys. |
| H16 | Assign the same chord to a local action and a published/core Obsidian command. Test graph and external editor focus. | Local action alone wins in its owning context; host command alone operates outside it. |
| H17 | Publish an action, assign a global key in Obsidian, unpublish, republish, restart. | Publication state and command ID stable; actual host binding-retention behavior recorded and verified. |
| H18 | Disable all local character keys; unpublish most or all commands; reload. | Choices persist; settings still provide a recovery route; no defaults silently return. |
| H19 | Move the view to/from a pop-out repeatedly, open/close pickers, then close the window. | No duplicate execution, stale focus, orphaned scope or retained old-document handler. |
| H20 | With multiple mounted surfaces, navigate/select in one and invoke a background command. | Selection/focus routing follows Section 7; legacy shared navigation behavior is not misrepresented as independent sessions. |
| H21 | Navigate overflow rows, filter away selection, undo the filter and wait for background hydration. | Selection is visible and stable where valid; retired occurrence selection is not spuriously resurrected. |
| H22 | Use pin slot 3 with pin 2 unresolved/deleted; use a filtered pins picker and more than nine pins. | Slot meanings do not shift; all pins remain searchable; missing entries are explicit. |
| H23 | Back/forward at both history boundaries; open a deleted history item. | No unrelated browser navigation and no implicit ghost materialization. |
| H24 | Reconfigure shortcuts while cold-start hydration is incomplete. | No semantic rebuild, full-vault scan or settings-triggered hydration spike. |
| H25 | Create from folder, tag, attachment, URL, ghost and heading contexts. | Capability-specific behavior; only existing supported mutations, including folder-child exception. |
| H26 | Switch an unrelated Excalidraw note between Markdown and drawing while K-Plex is open/backgrounded. | Action/focus code does not force the view back or reopen the file. |
| H27 | Force save failure, delayed publication and close-during-write. | Accurate failed versus saved-pending state; no automatic duplicate retry or late focus theft. |
| H28 | Traverse the entire workflow with keyboard and screen reader: search, selection/picker, context menu, create, pins, history, exit. | Labels/target/origin are announced; controls reachable; no Tab trap. |

### 16.3 Platform and input matrix

Run the core scenarios on Windows/Linux with Control conventions and macOS with Command/Option conventions. Exercise a Hungarian or other AltGr layout, a non-Latin layout, an IME composition session, Caps Lock, dead keys and remapped physical bindings. Test desktop tabs, sidebar and pop-out independently.

For mobile, verify phone touch/software-keyboard behavior is not regressed and test a physical tablet with and without an external keyboard. Desktop mobile emulation cannot establish hardware keyboard detection, native key delivery, software-keyboard occlusion or real focus behavior. Record unavailable hardware as an unverified acceptance item, not as a pass.

Where OS/window-manager keys cannot reach Obsidian, show accurate guidance and permit rebinding; do not claim the plugin can override keys reserved outside the application.

### 16.4 Commands to run in the implementation environment

Use the repository-prescribed Node version and real installed Obsidian types, then run:

```sh
npm run check:architecture
npm run check:core
npm run lint:obsidian
npm test
npm run build
# Or run the aggregate after focused development checks:
npm run verify

# In the configured disposable Obsidian test environment:
npm run verify:obsidian
npm run verify:obsidian:ux
```

Extend host tests for this action assignment; passing existing unrelated host tests is not a substitute for H01–H28. Follow the repository's validation ownership and test-vault requirements. Do not change user vault data during automated validation.

### 16.5 Performance acceptance

These are proposed acceptance targets, **not measured results**:

- No vault enumeration, IndexedDB reads or semantic acquisition during a simple key match or command availability check.
- A compiled chord/context lookup and a bounded surface snapshot rather than scanning every action and the full graph on every keydown.
- For a representative desktop test, aim for key match/eligibility/acceptance below 5 ms at the 95th percentile, measured separately from layout, file I/O and host rendering. Record the actual hardware, sample and results; do not hide regressions behind the target.
- Selection movement operates on the existing displayed projection. Coalesce reveal/paint work, not mutation semantics.
- Repeated view mounting/migration does not increase live local listeners, scopes or action callbacks after disposal.

---

## 17. Delivery checklist and final decisions

The implementation is complete only when:

- [ ] All existing command IDs and explicit local binding choices survive migration.
- [ ] Every meaningful action in scope is reachable from the keyboard, even when it has no default shortcut.
- [ ] Published commands and local shortcuts dispatch through one action definition and eligibility policy.
- [ ] Background center commands work from another leaf without retargeting to that editor.
- [ ] Selected-node actions are explicitly named and never silently become center actions.
- [ ] Users can publish/unpublish eligible actions independently of local bindings, through public command APIs.
- [ ] Search, pins, history, node opening, creation, connection editing and view controls have tested keyboard routes.
- [ ] Embedded editors, native controls, suggestions and dialogs retain their keyboard ownership.
- [ ] Real-host tests establish native scope precedence, exactly-once delivery, migration cleanup and command hotkey retention.
- [ ] Save outcomes distinguish completion, cancellation, failure, commitment and pending graph publication.
- [ ] Action preferences do not trigger semantic invalidation or full indexing.
- [ ] New tests are included in the repository's test scripts; build/lint/architecture checks pass against real dependencies.
- [ ] Shortcut help, settings and tooltips are generated from effective action metadata and localized consistently.
- [ ] The final handoff records changed files, compatibility decisions, exact test results and any unverified physical-device scenarios.

### Decisions that should not be reopened during implementation without a concrete blocker

**Global keys belong to Obsidian.** Local keys belong to an actually focused K-Plex region. Visibility alone is never a keyboard scope.

**The manager is a facade over existing operations.** It is not a new graph store, reducer, scheduler, history engine or rendering framework.

**Existing Add commands retain center semantics.** Selected-node creation is a separate explicit action family.

**Native interaction protocols stay native.** A common action engine does not require routing every caret movement, Tab press or suggestion highlight through the catalog.

**Independent Plex sessions and bulk relationship operations remain separate features.** This design prepares clean boundaries without claiming to deliver them.

### Review limitations

This handoff is based on static inspection of the K-Plex code identified in Section 2.1 as the reviewed `main` head, live GitHub issue/source reads, and official web documentation. The repository-baseline clarification and confirmation of the two foundational decisions do not constitute a new implementation or runtime validation. No plugin implementation, TypeScript build, automated test suite, Obsidian desktop session, mobile session or hardware-keyboard test was run for this design. The local container had Node 22.16.0, whereas the repository specifies 22.22.2, and installed project dependencies were absent. These are review-environment facts, not predicted blockers for the implementation agent.

TheBrain's final current default keymap and Obsidian's retention of custom hotkey assignments through dynamic unregister/re-register were not experimentally verified. The design avoids relying on the former and makes the latter a release acceptance test.

---

## 18. Sources and traceability

### Repository evidence

**[K1] K-Plex repository — reviewed `main` head:** [`zsviczian/kplex`, branch `main`](https://github.com/zsviczian/kplex/tree/main), commit [`67ee400b56c7706d795412d6f6631b365d15c394`](https://github.com/zsviczian/kplex/commit/67ee400b56c7706d795412d6f6631b365d15c394), verified through GitHub branch metadata on 8 October 2026; version `0.1.0`. Principal inspected sources are listed in Sections 2.2–2.4; architecture and validation constraints come from [`AGENTS.md`](https://github.com/zsviczian/kplex/blob/main/AGENTS.md), [`CONTRIBUTING.md`](https://github.com/zsviczian/kplex/blob/main/CONTRIBUTING.md), [`HANDOFF.md`](https://github.com/zsviczian/kplex/blob/main/HANDOFF.md), [`package.json`](https://github.com/zsviczian/kplex/blob/main/package.json), [`tsconfig.json`](https://github.com/zsviczian/kplex/blob/main/tsconfig.json), [`scripts/check-architecture.mjs`](https://github.com/zsviczian/kplex/blob/main/scripts/check-architecture.mjs), and [existing hotkey/UI tests](https://github.com/zsviczian/kplex/tree/main/tests). These findings refer to the reviewed repository revision; proposed additions are explicitly identified in the design.

### External implementation references

**[MM1] Mindmap Builder script.** Inspected the user guide/header, action constants and defaults around lines 1840–1970, matching/configuration/scope helpers around 1990–2200, and related lifecycle notes. Retrieved from `master`; observed Git blob SHA `22c586bcf31e94fcf135e7b90beab6aedc0d3283`. A blob SHA identifies the file content, not a repository commit. Findings here concern the reviewed source rather than a promise about every released script version.

**[EX1] Excalidraw action manager.** Reviewed registration, keyboard matching, source-aware execution, fresh-state reads and UI integration in `packages/excalidraw/actions/manager.tsx`.

**[EX2] Excalidraw action types.** Reviewed `Action`, `ActionSource`, results, predicates and UI metadata in `packages/excalidraw/actions/types.ts`; observed Git blob SHA `cd1305a7fe128abaa8d5cb5b4d66c018309ea795`.

### Official Obsidian references

**[OB1] Obsidian developer guide — Commands.** Ordinary and editor callbacks, conditional checks, default-hotkey guidance and native letter-key registration. Reviewed the official documentation repository; observed Git blob SHA `acbe71b1b8883b0c1fa451d9892a18762be02542`.

**[OB2] Obsidian Help — Command palette.** Fuzzy search, command use and pinned commands.

**[OB3] Obsidian Help — Hotkeys.** User-owned assignments, multiple bindings and layout caveats.

**[OB4] Official Obsidian API declarations.** Reviewed `Plugin.addCommand`, `Plugin.removeCommand`, `Scope`, `Keymap` and `KeymapEventListener`. Current upstream declarations are research evidence; implementation must still compile against the repository's installed `obsidian` 1.13.0 dependency and support its manifest minimum.

### TheBrain references

**[TB1] TheBrain Archive.** Vendor page distinguishing the current product from archived earlier versions.

**[TB2] TheBrain moderator discussion — v15 function keys.** January 2026 beta-era statement about customization and evolving defaults. Used as a version qualification, not as final current-keymap evidence.

**[TB3] TheBrain support discussion — Create Child/Parent/Jump.** Historical modifier choices and text-editing conflicts; not a K-Plex default prescription.

**[TB4] TheBrain support discussion — Hotkeys for pins.** Historical numbered-pin shortcut support and customization.

**[TB5] TheBrain — Power User Secrets.** Vendor material including keyboard shortcuts for pins.

### Accessibility

**[A11Y1] W3C — Understanding Character Key Shortcuts, SC 2.1.4.** Focus-only operation and disable/remap mechanisms for character shortcuts.

### Live issue review

Issue links in Section 13 refer to the live open-issue search on **8 October 2026**. They are requirements/reproduction inputs, not verified diagnoses. Review their latest state before implementing a related change or proposing issue closure.

[MM1]: https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/master/ea-scripts/Mindmap%20Builder.js.md
[EX1]: https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/actions/manager.tsx
[EX2]: https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/actions/types.ts
[OB1]: https://github.com/obsidianmd/obsidian-developer-docs/blob/main/en/Plugins/User%20interface/Commands.md
[OB2]: https://obsidian.md/help/plugins/command-palette
[OB3]: https://obsidian.md/help/hotkeys
[OB4]: https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts
[TB1]: https://www.thebrain.com/products/thebrain/oldversions
[TB2]: https://forums.thebrain.com/post/for-v15-are-the-function-keys-still-support-13751734
[TB3]: https://forums.thebrain.com/post/create-childparentjump-8259505
[TB4]: https://forums.thebrain.com/post/suggestion-hotkey-for-saved-reports-and-pins-5238-9899490
[TB5]: https://www.thebrain.com/blog/power-user-secrets
[A11Y1]: https://w3c.github.io/wcag/understanding/character-key-shortcuts.html
[I9]: https://github.com/zsviczian/kplex/issues/9
[I16]: https://github.com/zsviczian/kplex/issues/16
[I20]: https://github.com/zsviczian/kplex/issues/20
[I24]: https://github.com/zsviczian/kplex/issues/24
[I31]: https://github.com/zsviczian/kplex/issues/31
[I33]: https://github.com/zsviczian/kplex/issues/33
[I35]: https://github.com/zsviczian/kplex/issues/35
[I51]: https://github.com/zsviczian/kplex/issues/51
[I54]: https://github.com/zsviczian/kplex/issues/54
[I59]: https://github.com/zsviczian/kplex/issues/59
[I61]: https://github.com/zsviczian/kplex/issues/61
[I65]: https://github.com/zsviczian/kplex/issues/65
[I66]: https://github.com/zsviczian/kplex/issues/66
[I77]: https://github.com/zsviczian/kplex/issues/77

## Maintainer follow-up: laptop keyboard defaults (8 October 2026)

This follow-up supersedes the proposed function-key/Home defaults above. Fresh defaults use `/` for Vault search, `?` for a separate read-only shortcut reference, `R` for rename, `0` for center selection and `M` for the node menu. `Ctrl/Cmd+Shift+G` focuses the graph and `Ctrl/Cmd+Shift+E` its associated editor. The local palette remains on `.` and is named **K-Plex command palette**. Printable-only shortcuts are canvas-owned; search fields, native controls and embedded editors retain normal typing. Existing saved shortcuts and explicit disables are preserved; Reset adopts the new defaults. Legacy F4 migration remains compatible.

`Ctrl/Cmd+Enter` on an existing note centers it and ensures its owned native sidecar is open. It reuses an already open sidecar, without toggling it. Section/ghost operations retain their established navigation/materialization behavior; sidecars remain unavailable for sidepanel-hosted Plex. Keyboard selection uses a stronger theme-accent ring and halo. Every catalog action now has a short behavior description. Keyboard help lists current bound shortcuts with read-only native chips; its explicit Configure shortcuts button opens native settings. Selecting a command in the palette executes that command.

### Maintainer follow-up: native palette/reference formatting

The executable K-Plex command palette and read-only keyboard reference use native complex suggestion rows, with action title/description on the left and effective shortcut chips in the right auxiliary area. Keyboard-reference heading/search and Configure shortcuts remain fixed while only results scroll. The palette retains the native fuzzy prompt shell and choice lifecycle. Formatting changes do not alter settings/defaults, command identities, dispatch/target capture, or help's read-only contract.


### Maintainer follow-up: Option defaults and typing selection

The later preference replaces fresh printable action defaults with Alt/Option plus the same keys. Physical key codes retain usability when macOS Option emits a different character; labels show human-readable keycaps. Saved overrides and explicit disables remain authoritative. Unmodified graph typing becomes an independent view-local exact-phrase selection session over displayed occurrence labels, across all areas. It never filters nodes or queries the vault. Tab/Shift+Tab cycle, Escape clears and Backspace edits; native controls/editors and connection-session acceptance keep their own protocols. Final source/build/native validation is tracked in Refactor plan.md.

### Maintainer follow-up: recorder and typing-badge polish (8 October 2026)

The typing phrase/count sits at the top-left, matching the Find magnifier’s top/right inset. Long phrases ellipsize before reaching the magnifier. Shortcut recording uses native Setting/Dropdown/Button components with a distinct capture area and wrapped native footer. Selecting physical/logical matching returns focus to capture. New recordings start physical; saved custom bindings retain their semantics.

Shift/Option modifier keydowns are intermediate chord state. Explicitly modified physical positions may capture and match an OS Dead character; logical Dead, ordinary/Shift-only accent typing, IME and AltGraph retain native ownership. Graph dispatch alone may execute these physical Dead chords; editors, search, Find and native controls preserve accents even when a focus action shares that code. The selected-mode description explains physical versus character matching. Acceptance evidence is tracked in the final polish entry of Refactor plan.
