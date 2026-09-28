# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

### Current transfer

**State: issue #14 follow-up interaction fixes; ready for main-agent review and native validation.**

- Sender → recipient: offline development agent → main validation agent.
- Scope: preserve the reviewed central-editor design while fixing desktop same-leaf navigation for Markdown/Excalidraw, synchronizing followed links back to the Plex center, repairing Excalidraw toolbar layout at non-100% Plex zoom, and disabling full-Plex expansion in the dedicated sidepanel surface.
- Base/source identity: the maintainer-supplied `repository.zip` from 2026-09-28, explicitly described as the reviewed/validated main-agent version. No Git metadata is available in this offline environment.
- Reference material: the previously supplied `obsidian-hover-editor-master.zip`, the maintainer's captured central-editor DOM, and `excalidraw-plugin-styles.css`.
- Environment limitation: this agent has no Obsidian CLI/runtime. `npm ci` failed in this container with npm's `Exit handler never called!` error and left dependencies incomplete. Consequently the real build/lint/test gates remain main-agent tasks. TypeScript syntax transpilation of the three touched TS/TSX files passed.

## Final product/design contract

### 1. Normal central node remains the default

K-Plex starts with the normal compact central thought. The embedded editor is opt-in for Markdown-backed central files.

- `embedCentralNode` defaults to `false`.
- Legacy ExcaliBrain's persisted `embedCentralNode` value must **not** automatically enable K-Plex's native editor because the two settings have different semantics.
- Already initialized K-Plex vaults preserve the user's own `embedCentralNode` preference.
- Manual legacy settings import also preserves the current K-Plex central-editor preference instead of overwriting it from ExcaliBrain.
- Non-Markdown centers (folders, tags, URLs, attachments, etc.) remain normal nodes; the native central editor is currently a Markdown-backed feature. Excalidraw drawings are supported because they are Markdown-backed files.

### 2. Entry/exit controls live on the central node/editor, not the main toolbar

There is no central-node editor toggle in the main K-Plex toolbar.

Normal central node:

- A small `file-text` action is placed slightly outside the top-right corner of a Markdown central node.
- The action is intentionally visually subordinate to the thought and uses Plex styling rather than Markdown/editor chrome.
- Pressing it replaces the normal center with the embedded native editor.

Embedded central editor:

- Its compact control strip is positioned above/outside the document surface at the top-right.
- Controls use small Lucide/Obsidian icons and Plex visual styling.
- The right-most `rectangle-ellipsis` action restores the normal central node.
- The collapse action must work in both normal editor size and expanded/full-Plex size and must restore the graph camera cleanly.

### 3. Reading/edit mode is remembered and reused across central nodes

The central editor has one remembered Markdown mode:

- `source` = edit mode.
- `preview` = reading mode.

Requirements:

- The current mode is stored in `settings.centralNodeMarkdownMode`.
- Switching reading/edit mode in one central node updates that preference immediately.
- The next central file opened in the editor uses the remembered mode.
- The preference persists across K-Plex sessions.
- Settings exposes the same preference as **Central node editor → Default Markdown mode**.
- Default for a new/invalid setting is `source`.
- The mode control shows `book-open` when edit mode is active (action = show reading view) and `square-pen` when reading mode is active (action = edit note).

The embedded editor must not steal Obsidian editor focus simply because K-Plex rendered it. Its native leaf becomes active when the user actually interacts/focuses inside it.

### 4. Excalidraw uses the same remembered reading/edit intent

For an Excalidraw-backed Markdown file, K-Plex must treat the remembered central Markdown mode as the semantic reading/edit intent:

- `preview` → Excalidraw view mode (`setViewModeEnabled(true)`).
- `source` → Excalidraw edit mode (`setViewModeEnabled(false)`).

The Excalidraw drawing can finish mounting after `WorkspaceLeaf.openFile()` resolves, so this cannot be a one-shot immediate call. The adapter waits for the actual Excalidraw view and `excalidrawAPI`, then reapplies the requested K-Plex mode after Excalidraw's own mount-time restoration has completed.

Detection is defensive and should continue to work while the view is transitioning:

- current native view type from `leaf.getViewState().type` (`markdown` / `excalidraw`),
- Excalidraw Automate `isExcalidraw()` when available,
- `.excalidraw.md` path fallback,
- `excalidraw-plugin` frontmatter fallback.

The Excalidraw integration must remain safe when the Excalidraw plugin/Automate API is absent.

### 5. Excalidraw drawing/Markdown representation toggle

For an Excalidraw-backed file, the embedded editor adds one extra top-right action:

- When currently showing the drawing, show `text` (action = show Markdown).
- When currently showing Markdown, show `palette` (action = show Excalidraw drawing).

The current representation is read from `leaf.getViewState().type`.

The representation switch uses Excalidraw's command:

`obsidian-excalidraw-plugin:toggle-excalidraw-view`

The embedded leaf is activated immediately before invoking that command so the Excalidraw command targets the correct leaf. Obsidian's public types do not expose `App.commands`, so this host-specific command bridge stays narrowly typed inside `embeddedMarkdownLeaf.ts` rather than leaking into React/UI code.

After the representation changes, K-Plex reapplies the remembered reading/edit mode and resizes the native view.

### 6. Excalidraw automatically zooms to fit after opening/switching to drawing view

Once the Excalidraw Automate API and scene are available, K-Plex runs the equivalent of:

`ea.viewZoomToElements(false, ea.getViewElements(), 0.1)`

This happens after an Excalidraw file settles into drawing view and after toggling from Markdown back to drawing view. The operation is best-effort because the API can briefly exist before the scene is fully ready.

### 7. Native editor must not be transformed with the graph camera

Native editor/canvas views are hosted **above** the transformed graph camera rather than as children of the scaled camera DOM. This is a core requirement, not incidental implementation detail.

Reason: CSS transforms applied to the graph camera cause host canvases such as Excalidraw to calculate pointer/canvas coordinates incorrectly at K-Plex zoom levels other than 100%, producing visible offsets.

Final approach:

- The graph still reserves a center rectangle in scene/layout coordinates.
- The actual native editor is rendered in a separate overlay in viewport coordinates.
- `PlexGraph` manually synchronizes the overlay's `left`, `top`, `width`, and `height` from the current graph camera and center-node geometry whenever the camera changes.
- The embedded native leaf itself is never scaled by the camera transform.
- Resize notifications are forwarded to the native view when the overlay changes size.

Do not regress this by moving the native editor DOM back under `.excalibrain-camera` or another transformed ancestor.

### 8. Embedded native leaf architecture follows Hover Editor's host seam

Obsidian has no public API to mount a `WorkspaceLeaf` into an arbitrary plugin DOM node. The implementation intentionally mirrors the narrow pattern used by obsidian-hover-editor:

- create an isolated `WorkspaceSplit`,
- create/insert one `WorkspaceLeaf`,
- report the real owning workspace root/container through the split,
- mount only the split DOM into the K-Plex editor host,
- detach the leaf and clean up observers/listeners on teardown.

All of this host-specific behavior is contained in `src/adapters/obsidian/embeddedMarkdownLeaf.ts`. React uses only its controller interface.

The adapter tracks embedded leaves in a `WeakSet` so K-Plex can distinguish these leaves from ordinary workspace leaves where necessary.

### 9. Excalidraw native fullscreen must behave like a normal Obsidian leaf

This is separate from K-Plex's own expanded/full-Plex editor mode.

Excalidraw's fullscreen manager relies on Obsidian workspace DOM ancestry. In particular it walks toward a `.workspace-split` and marks the active ancestry with `excalidraw-visible`. A synthetic nested split that advertises itself as the visible DOM workspace root causes Excalidraw to hide the real host split, making the K-Plex content disappear.

Final DOM contract:

- Keep the synthetic `WorkspaceSplit` object model needed by the native leaf.
- Mark its DOM with K-Plex-specific classes (`kplex-embedded-workspace-root`, `kplex-embedded-workspace-split`).
- Remove the synthetic wrapper's `workspace-split` DOM class so Excalidraw's ancestry walk reaches the **real** Obsidian workspace split containing K-Plex.
- Preserve normal workspace root/container reporting through `getRoot()` / `getContainer()`.

When Excalidraw enters its own fullscreen mode:

- Excalidraw adds `excalidraw-visible` to the K-Plex central-editor overlay ancestry.
- A `MutationObserver` on the overlay detects that state.
- K-Plex temporarily gives the overlay true full-window fixed geometry (`0,0,100vw,100vh`) and a fullscreen z-index.
- The small K-Plex central-editor toolbar is hidden during Excalidraw native fullscreen.
- If React/layout writes a newer normal Plex rectangle while native fullscreen is active, remember that updated rectangle and immediately reassert fullscreen geometry; exit must restore the latest Plex geometry, not stale pre-resize values.
- On native fullscreen exit or disposal, restore the prior K-Plex overlay geometry and notify the native view of resize.

The `MutationObserver.observe(...)` call must remain guarded by both a non-null host and observer so it compiles under strict TypeScript nullability.

### 10. K-Plex expanded/full-Plex editor mode keeps visible graph context

The editor's maximize control does **not** enter browser/native fullscreen. It expands the central editor to nearly fill the Plex while leaving a small visual margin that communicates the user is still editing inside K-Plex.

Final geometry:

- width: approximately viewport width minus 36 px, with a lower bound,
- height: approximately viewport height minus 60 px, with a lower bound,
- the graph camera is centered and set to scale `1` while expanded,
- the previous graph camera is saved before expansion and restored on normal restore/collapse,
- graph auto-fit is suppressed during the transition so it cannot immediately override the intended expanded geometry,
- ordinary K-Plex zoom/layout controls are hidden while the central editor is expanded.

The top-right editor buttons should sit close to the upper Plex toolbar edge; the full-Plex editor may therefore use more vertical space than the first implementation while retaining the small margin. Full-Plex expansion is available only on normal leaf/pop-out Plex surfaces. The dedicated K-Plex sidepanel exposes only normal-center ↔ embedded-editor switching; it must not render the maximize/restore control or enter expanded editor mode.

### 11. Surrounding graph layout reserves the editor rectangle

The editor is part of Plex layout semantics even though its DOM is rendered as a viewport overlay.

`buildScene(...)` accepts an explicit center-node size override. When present:

- parent rows move farther upward based on editor height,
- left/right friends and challengers move outside the wider editor,
- siblings move farther to the right,
- friends/challengers are centered around the editor's horizontal midline rather than accumulating around its lower corners,
- siblings are also vertically centered around the editor midline,
- child placement begins below the taller editor.

This layout behavior is covered by the migration/layout test in `tests/excalibrain-migration.test.mjs`.

### 12. Navigation while editor is expanded must rebind controls to the current file/view

When navigation history changes the active center while the editor is expanded:

- the native view must change to the new center file,
- reading/edit state must still use the remembered central mode,
- the top-right controls must act on the **new current embedded leaf/view**, never a stale controller or stale Excalidraw API,
- Excalidraw post-open work must be cancelled/ignored if it belongs to an older file.

Current implementation enforces this through several layers:

- `CentralNodeEditor` is keyed by the current central file path in `PlexGraph`, so a center-file change recreates the editor component/controller cleanly.
- `CentralNodeEditor` keeps navigation/file callbacks in refs so the host leaf event callback always resolves against the current file.
- `embeddedMarkdownLeaf.ts` uses `openSequence` + `currentFile` checks around asynchronous Excalidraw mount/setup; stale async work exits without touching a newer view.
- controller disposal disconnects the fullscreen observer, unregisters the workspace event, invalidates pending async work, detaches the leaf, and removes the synthetic split.

### 13. Native editor controls must retain their own DOM focus

Activating the synthetic leaf must make it Obsidian's active leaf **without forcing focus back into the editor surface**. This is required for native child controls such as Markdown's Cmd/Ctrl+F find field: once Obsidian focuses that input, K-Plex must not steal focus during the input's focus event.

The embedded controller therefore uses `setActiveLeaf(leaf, { focus: false })` for ordinary pointer/focus activation. Commands that explicitly require focus on the embedded leaf (for example the Excalidraw representation toggle) may still request focus locally at the point of command execution.

### 14. Default embedded-link navigation stays inside the editor and also recenters the Plex

Following an internal link from the central editor must replace the document in the same embedded leaf **and** make that destination the Plex center. It must not create a normal workspace tab for the default same-tab action.

- Markdown reading mode: the ordinary unmodified internal-link click is handled in the embedded leaf.
- Markdown source/Live Preview: an ordinary unmodified internal-link click is handled in the embedded leaf.
- The adapter must still handle reading-mode clicks when Obsidian has already marked the DOM event `defaultPrevented`; that flag alone is not evidence that navigation is complete.
- Any modified Markdown click (Cmd/Ctrl, Shift, or Alt/Option) remains available to Obsidian for its native alternate/new-tab behavior.
- The adapter delegates actual navigation to the hosted leaf's `openLinkText(...)` seam so relative links, subpaths, aliases and native link behavior remain owned by Obsidian rather than by a parallel K-Plex resolver.
- After same-leaf navigation settles, the adapter reads the embedded leaf's current file and notifies `CentralNodeEditor`; `PlexGraph`/`App` then activate the corresponding graph page so parents/friends/challengers/children update around the new center.
- Excalidraw's configured `active-pane` internal-link action is routed through the same hosted-leaf path. K-Plex installs one shared, reversible wrapper around Excalidraw Automate's global `onLinkClickHook`, delegates any pre-existing hook first, and resolves `LinkClickAction` through `ea.plugin.settings.modifierKeyConfig`. Multiple simultaneous K-Plex views share the wrapper safely and teardown restores the prior hook when the last router leaves.
- `new-tab` and `new-pane` also need explicit routing because Excalidraw's native leaf resolver receives the synthetic embedded leaf as its origin and can otherwise replace the K-Plex host tab. For these two actions K-Plex asks Excalidraw Automate for the destination leaf using the real owning K-Plex `hostLeaf`, then opens the link there. This preserves Excalidraw's modifier mapping and adjacent-pane/tab policy while keeping K-Plex open.
- `popout-window`, `md-properties`, external URLs and other non-internal-link actions remain native and are not intercepted.

### 15. Excalidraw stays in native layout; only the editor viewport follows Plex zoom

The native Excalidraw view must remain outside the transformed Plex camera. K-Plex therefore positions and sizes the editor overlay directly in viewport coordinates as the graph camera changes, but it does not transform the Excalidraw canvas or rewrite Excalidraw's rem-based UI sizing tokens.

Final approach:

- `PlexGraph` updates only the editor overlay rectangle (`left`, `top`, `width`, `height`) from the Plex camera.
- Excalidraw owns the size and layout of its own top toolbar, right tray and bottom controls. K-Plex does not inject zoom-derived button/icon custom properties.
- The Excalidraw canvas, SVG layer, text editor layer and native view root remain completely untransformed, preserving the reviewed pointer-coordinate fix at non-100% Plex zoom.
- Native Excalidraw fullscreen continues to use the fullscreen geometry bridge; no special UI-token reset is required.

## UI/interaction summary

For a normal Markdown center:

1. The central thought renders normally.
2. A small `file-text` button is slightly outside its upper-right corner.
3. Pressing it opens the embedded native editor.

For an embedded Markdown center, the top-right editor-local toolbar may contain:

1. Excalidraw representation toggle (`text` / `palette`) — only for Excalidraw-backed files.
2. Reading/edit toggle (`book-open` / `square-pen`).
3. Expand/restore (`maximize-2` / `minimize-2`).
4. Return to normal central node (`rectangle-ellipsis`).

The editor-local controls are not part of the global K-Plex toolbar.

## Persistence/migration requirements

Relevant settings:

- `embedCentralNode: boolean`
  - default `false`,
  - existing initialized K-Plex value preserved,
  - legacy ExcaliBrain import must not implicitly enable this K-Plex feature.
- `centralNodeMarkdownMode: "preview" | "source"`
  - default/fallback `source`,
  - changed immediately by the local reading/edit control,
  - used for each subsequent central editor file,
  - available in Settings as the default Markdown mode,
  - manual ExcaliBrain import preserves the current K-Plex value.
- `centerEmbedWidth` / `centerEmbedHeight`
  - continue to provide the configured base sizing inputs; the editor clamps the practical normal size and expanded/full-Plex mode uses viewport-derived dimensions.

Do not couple `centralNodeMarkdownMode` to the sidecar Markdown mode; these are separate UI surfaces and preferences.

## Key implementation files

- `src/adapters/obsidian/embeddedMarkdownLeaf.ts`
  - native split/leaf host,
  - active-leaf/focus bridge that does not steal child-control focus,
  - same-leaf Markdown internal-link routing,
  - Markdown reading/edit switching,
  - Excalidraw detection and representation switching,
  - Excalidraw view/edit synchronization,
  - Excalidraw zoom-to-fit,
  - native Excalidraw fullscreen DOM/geometry compatibility,
  - async cancellation and cleanup.
- `src/ui/CentralNodeEditor.tsx`
  - React host for the native leaf,
  - editor-local control strip,
  - local state for current mode/document representation/status,
  - ResizeObserver forwarding,
  - collapse/maximize/navigation callbacks.
- `src/ui/PlexGraph.tsx`
  - determines editor eligibility,
  - reserves center-node dimensions,
  - hosts the untransformed viewport overlay,
  - synchronizes overlay geometry with the camera,
  - publishes the camera-derived Excalidraw UI chrome scale,
  - expanded/full-Plex camera save/restore,
  - mounts/rekeys `CentralNodeEditor`,
  - exposes the normal-node corner action.
- `src/ui/layout.ts`
  - center-size override and relationship-zone positioning around a large editor.
- `src/ui/ThoughtNode.tsx`
  - generic small corner action used by the normal central node.
- `src/ui/App.tsx`
  - persists editor enabled state and remembered central Markdown mode.
- `src/settings.ts`
  - settings schema/defaults/migration and default-mode settings UI.
- `src/lang/*.ts`
  - localized labels/tooltips for the feature.
- `styles.css`
  - central editor overlay/native host geometry,
  - compact Plex-style editor toolbar,
  - normal-node corner button,
  - native fullscreen state,
  - edit-mode cursor boundary,
  - Excalidraw toolbar-only zoom scaling,
  - expanded/full-Plex presentation.
- `tests/excalibrain-migration.test.mjs`
  - validates opt-in migration/default-mode behavior and the center-size layout contract.
- `tests/support/excalibrainMigration.mjs`
  - migration assertions preserving K-Plex-specific central editor settings.

## Host/API constraints that must remain explicit

- Obsidian does not publicly expose arbitrary `WorkspaceLeaf` embedding; the `WorkspaceSplit` / `WorkspaceLeaf` construction is a deliberate, isolated host seam modeled after Hover Editor.
- Do not invent public Obsidian APIs to replace this seam without verifying installed type declarations and runtime behavior.
- `Workspace.setActiveLeaf(...)` is the typed focus path currently used for the embedded leaf.
- Excalidraw's representation toggle is exposed as a command; `App.commands` is therefore accessed only through a narrow local type bridge.
- Excalidraw Automate can live on the owning pop-out window; resolve it from `mountEl.ownerDocument.defaultView` first and fall back to the main `window` only when necessary.
- All scheduling/observers should use the owning window when practical, matching `AGENTS.md` pop-out/window rules.

## Validation already encoded in repository tests

`tests/excalibrain-migration.test.mjs` checks that:

- legacy ExcaliBrain's embed preference does not enable K-Plex's editor,
- the central Markdown mode defaults/falls back to `source`,
- `preview` is preserved,
- initialized K-Plex vaults preserve their own central-editor toggle,
- a large center override is honored,
- parents move upward,
- lateral relationships move outside a wider editor,
- friends/challengers and siblings remain vertically centered beside the editor.

These tests are useful but do not replace real Obsidian/Excalidraw runtime validation.

## Required main-agent validation / local tasks

Run these against the real repository with Node **22.22.2**, complete dependencies, and the configured Obsidian test vault.

### Automated

1. `npm run build`
   - Confirm the reported `embeddedMarkdownLeaf.ts` `MutationObserver.observe(...)` nullability error is gone.
   - Confirm no new Obsidian type errors from the internal command bridge / WorkspaceSplit seam.
2. `npm run verify`
3. `npm run verify:obsidian` when the configured Obsidian CLI/test vault is available.
4. Review `npm run lint:obsidian` output for touched-code scanner findings; do not introduce new suppressions.

### Native Markdown central editor

1. Start from a normal Markdown central node and confirm the small `file-text` action sits slightly outside the top-right corner and does not disrupt gates/counts/node activation.
2. Open the editor and confirm the global K-Plex toolbar has no central-editor toggle.
3. Toggle edit → reading, navigate to another Markdown central node, and confirm it opens in reading mode.
4. Toggle reading → edit, navigate again, and confirm it opens in edit mode.
5. Reload K-Plex/Obsidian and confirm the remembered mode persists.
6. Confirm clicking/focusing inside the embedded editor makes it the active Obsidian editor, while merely rendering/navigating the Plex does not unexpectedly steal editor focus.
7. Press Cmd/Ctrl+F in a Markdown source editor, then click/type in the native find field. Confirm the field retains focus and accepts text normally.
8. In source/Live Preview and Reading View, ordinary-click an internal link and confirm the destination replaces the embedded document and recenters the Plex rather than opening a normal workspace tab.
9. In document-properties/YAML properties mode, ordinary-click internal-link property values and confirm the same embedded-leaf + Plex navigation.
10. Cmd/Ctrl+click the same Markdown links and confirm K-Plex does not intercept them; Obsidian should perform its native alternate/new-tab action. Confirm Shift/Alt/Option combinations remain native as well.
11. Confirm native editor keyboard shortcuts, text selection, scrolling, links, properties, and source/reading behavior otherwise work as in a normal Obsidian leaf.

### K-Plex expanded/full-Plex editor

1. Expand a Markdown center and confirm the editor nearly fills the Plex but retains the intended small graph margin.
2. Confirm the editor-local controls stay just above the document and close to the top Plex toolbar edge.
3. Confirm parents move upward and friends/challengers/siblings remain visually centered beside the enlarged center rather than dropping toward its lower corners.
4. Restore and confirm the previous graph camera/zoom/pan returns.
5. Expand again and press `rectangle-ellipsis`; confirm the editor collapses directly to the normal central node and the graph camera is sane.
6. While expanded, navigate backward/forward through K-Plex history to several different center files. Confirm the displayed file and all top-right actions always operate on the currently displayed file/view.

### Excalidraw central editor

Requires the Obsidian Excalidraw plugin with `window.ExcalidrawAutomate` available.

1. Set the remembered central mode to **reading** and open an Excalidraw file as the center.
   - It must settle in Excalidraw **view mode**, not edit mode.
2. Set the remembered mode to **edit** and open another Excalidraw center.
   - It must settle in Excalidraw **edit mode**.
3. Confirm the representation action appears only for Excalidraw-backed notes.
4. Drawing → Markdown:
   - action shows `text` while drawing is active,
   - command targets the embedded leaf,
   - the Markdown representation opens and retains the remembered source/preview mode.
5. Markdown → drawing:
   - action shows `palette` while Markdown is active,
   - drawing view opens,
   - remembered view/edit mode is reapplied after mount,
   - the scene zooms to fit using the 0.1 margin.
6. Change K-Plex graph zoom away from 100% and interact with the Excalidraw canvas.
   - Pointer/drawing coordinates must remain aligned; there must be no transform-derived canvas offset.
7. Resize the K-Plex view/pop-out and repeat zoom/drawing interactions.
8. At several Plex zoom levels below 100%, confirm Excalidraw's native top/tray/bottom toolbar remains correctly anchored and usable even though its UI chrome keeps Excalidraw's native size. Drawing/select/drag pointer coordinates must remain aligned.
9. Confirm K-Plex expanded/full-Plex mode and Excalidraw native fullscreen do not leave stale overlay geometry or toolbar positioning.
10. Test in a pop-out window if supported; Automate/API resolution and ResizeObserver/MutationObserver behavior must use the owning window correctly.

### Excalidraw native fullscreen

This is the highest-risk host-integration area and should be tested separately from K-Plex's own expand/restore control.

1. Open an Excalidraw center in drawing view.
2. Trigger Excalidraw's **native fullscreen** control from inside the drawing.
3. Confirm the K-Plex/Obsidian surface does not disappear and Excalidraw fills the window like a normal workspace leaf.
4. Confirm the K-Plex editor-local toolbar is hidden during native Excalidraw fullscreen.
5. Exit native fullscreen and confirm the editor returns to exactly the current Plex rectangle.
6. Repeat while the K-Plex editor is in its expanded/full-Plex state.
7. While native fullscreen is active, resize the Obsidian window, then exit; confirm the restored Plex rectangle reflects the current layout rather than stale pre-resize coordinates.
8. Enter/exit native fullscreen multiple times to check for leaked `excalidraw-visible` state, stuck fixed positioning, stale z-index, or detached observers.
9. Navigate to a different center after exiting and confirm fullscreen/control behavior is bound to the new embedded view.

### Regression checks

1. Non-Markdown central nodes remain normal nodes and do not show an unusable editor action.
2. Section-expansion controls continue to behave normally when the central editor is not active; editor mode must not conflict with section expansion.
3. Normal graph pan/zoom, hover, drag, context menus, gates, history, search, and filters still work after entering/exiting editor mode.
4. Main window and pop-out behavior remain consistent.
5. Tablet/touch smoke test the small corner action and editor-local toolbar; controls must remain tappable and not trigger graph pan/drag underneath.

## Acceptance criteria

Issue #14 is ready to close only when the main agent confirms all of the following in the real host:

- normal central node is the default presentation;
- the small outside `file-text` action opens the native editor and `rectangle-ellipsis` restores the normal node;
- reading/edit mode is remembered across navigation and persisted;
- Excalidraw obeys that same remembered view/edit intent after its API mounts;
- Excalidraw drawing/Markdown switching targets the embedded leaf and preserves mode;
- Excalidraw zooms to fit after drawing view becomes ready;
- graph zoom other than 100% does not offset Excalidraw interactions;
- K-Plex expanded/full-Plex mode preserves a small graph margin and restores camera state;
- friends/challengers/siblings remain centered beside the large editor;
- navigation-history changes while expanded never leave controls bound to a stale view;
- Excalidraw native fullscreen enters/exits correctly without making K-Plex disappear and restores the current overlay geometry;
- Markdown Cmd/Ctrl+F find accepts keyboard input without K-Plex stealing focus;
- edit-mode central editors no longer inherit the Plex hand cursor over their default surface;
- ordinary Markdown link navigation remains in the embedded central leaf instead of opening a new tab;
- Excalidraw remains correctly anchored and usable at non-100% Plex zoom without any canvas pointer offset;
- build/verify/scanner checks pass in the full repository environment.

## Offline-agent implementation / validation result — 2026-09-28

### Final navigation behavior in the current implementation

- Desktop Markdown central-editor navigation treats an **unmodified primary click** as the K-Plex same-editor navigation gesture in both Reading View and Live Preview/source mode. The destination is opened on the synthetic embedded leaf and then reported back to K-Plex so the graph center and surrounding relationships move with the editor.
- The same unmodified-click interception covers native document-properties/YAML link controls by recognizing `data-href`, `data-link-data-href`, and `data-link-path` link surfaces in addition to normal Markdown internal links.
- Any Markdown click with Cmd/Ctrl, Shift, or Alt/Option is left to Obsidian. Cmd/Ctrl+click is therefore no longer consumed by K-Plex and can perform Obsidian's native alternate/new-tab action.
- Desktop Excalidraw routing uses Excalidraw Automate's view-scoped `registerViewLinkClickHook()` integration API. K-Plex neither replaces the process-wide `onLinkClickHook` nor reads `ea.plugin.settings`.
- Excalidraw resolves platform-specific modifier settings and supplies the semantic `action` (`active-pane`, `new-tab`, `new-pane`, etc.) to K-Plex. This keeps Excalidraw as the single owner of its navigation rules.
- K-Plex intercepts Excalidraw internal links whose configured action resolves to `active-pane`, `new-tab`, or `new-pane`. `active-pane` opens inside the embedded central leaf and navigates the Plex. `new-tab` / `new-pane` resolve their destination from Excalidraw Automate using the real K-Plex host leaf, then open the link in that returned workspace leaf so K-Plex is not replaced. For `new-tab`, K-Plex first makes the real host leaf active with `focus: false`: Excalidraw Automate ultimately implements that action with `workspace.getLeaf("tab")`, whose tab-group choice follows the active workspace leaf rather than the synthetic embedded origin. This re-anchors tab creation without stealing DOM focus or changing Excalidraw's configured modifier semantics.
- `popout-window`, `md-properties`, external URLs and other actions continue through Excalidraw unchanged.
- Each mounted K-Plex editor owns one scoped registration and disposer. Multiple embedded drawings therefore remain isolated without mutating another integration's global hook.
- Mobile remains intentionally untouched because Markdown, Excalidraw, and Plex node navigation were already validated as correct on iOS/tablet.
- The previously implemented editor interaction/layout behavior remains in place: Markdown find can keep DOM focus; edit-mode editors do not inherit the Plex hand cursor; Excalidraw itself owns toolbar sizing while K-Plex only sizes/positions the untransformed editor viewport; native Excalidraw fullscreen uses the geometry bridge; sidepanel editor mode does not offer full-Plex expansion.

### Offline validation completed

- `src/adapters/obsidian/embeddedMarkdownLeaf.ts` passes a TypeScript `transpileModule` syntax check with the repository's installed TypeScript runtime.
- Excalidraw modifier resolution was checked against the current upstream `src/utils/modifierkeyHelper.ts`: exact Shift / Ctrl-or-Cmd / Alt-or-Option / Meta-or-Ctrl rule matching with `defaultAction` fallback.
- Excalidraw Automate's public `getLeaf(origo, targetPane)` API was checked against current upstream API documentation; K-Plex uses it with the real host leaf for `new-tab` and `new-pane`.
- Reviewed the supplied host report that iOS/tablet link navigation already behaves correctly; desktop interception remains disabled on mobile.

### Validation blocked in this environment

- `npm run build` cannot reach project type-checking because this extracted workspace has incomplete dependency contents. TypeScript reports missing type-definition packages for `codemirror`, `eslint`, `estree`, `json-schema`, `json5`, `node`, `react`, `react-dom`, and `tern`.
- `npm run lint:obsidian` cannot run because the extracted workspace does not contain the ESLint executable.
- No Obsidian CLI/runtime is available to this agent.

### Required local-agent validation

1. Run `npm run build`, `npm run lint:obsidian`, and the normal repository verification commands in the full Node 22.22.2/dependency environment.
2. Desktop Markdown Reading View: ordinary-click internal wikilinks and Markdown links. Confirm the embedded editor changes file, no extra workspace tab opens, and the Plex center/relationships navigate to the same destination.
3. Desktop Markdown Live Preview/source: ordinary-click the same link cases and confirm the same embedded-leaf + Plex navigation behavior. Then Cmd/Ctrl+click and confirm K-Plex does not intercept it and Obsidian performs the native new-tab/alternate action. Include relative links, aliases, heading/block subpaths, and unresolved/create-link cases where Obsidian supports them.
4. Document properties/YAML properties mode: ordinary-click internal-link property values (single and list values) and confirm they navigate inside the embedded editor + Plex. Repeat with Cmd/Ctrl+click and confirm native Obsidian alternate/new-tab behavior is preserved.
5. Excalidraw: test the modifier combination currently configured to resolve to `active-pane`; confirm the linked internal file opens inside the K-Plex embedded editor and the Plex follows it. Change the Excalidraw `active-pane` modifier rule and repeat to verify K-Plex follows settings rather than a hard-coded gesture.
6. Excalidraw: test gestures configured as `new-tab` and `new-pane`. For `new-tab`, test both a destination that is not currently open and one that already has a workspace tab: a missing tab must be created beside the real K-Plex host without replacing K-Plex, while an existing destination must retain Excalidraw's normal reveal/reuse behavior. Confirm `new-pane` still opens in the requested real workspace target and follows Excalidraw's own adjacent-pane/reuse behavior where configured.
7. Excalidraw: test `popout-window`, `md-properties`, and an external URL. Confirm K-Plex does not intercept those actions and Excalidraw behaves normally.
8. Open two K-Plex views with embedded Excalidraw centers, follow `active-pane` / `new-tab` / `new-pane` links in each, close one, then repeat in the other. Confirm routing remains bound to the correct embedded view and no stale global Automate hook remains.
9. Re-run the same Markdown and Excalidraw link smoke tests on iOS/tablet and confirm the already-correct mobile behavior is unchanged.
10. Retest the existing high-risk editor integrations after these navigation changes: graph zoom/pointer alignment, Excalidraw tray anchoring, K-Plex expanded mode, native Excalidraw fullscreen, history navigation while expanded, and sidepanel normal/editor mode switching. Confirm Excalidraw UI chrome remains natively sized; only the editor viewport should follow Plex zoom.
### Follow-up fix — Excalidraw `new-tab` routing

The host report after the previous handoff confirmed Markdown routing, Excalidraw `active-pane`, `new-pane`, and `popout-window` behavior, plus the CSS simplification, but found one remaining desktop defect: Excalidraw `new-tab` replaced the K-Plex tab when the destination was not already open.

The adapter now re-anchors the workspace's active-leaf context to the real K-Plex `hostLeaf` immediately before asking Excalidraw Automate for a `new-tab` leaf. This is intentionally limited to `new-tab`; `new-pane` keeps the previously validated Excalidraw-origin path. The embedded Excalidraw leaf remains synthetic, so it must not be allowed to determine the tab group used by Obsidian's `workspace.getLeaf("tab")`.

No CSS was changed in this follow-up. The maintainer already reported that removing the ineffective Excalidraw UI-token scaling had no negative effect.

Offline validation remains limited by the extracted dependency tree: `npm run build` stops before project type-checking because the local `node_modules` is missing multiple type packages, and the local TypeScript package contents are absent. The required host check is therefore the `new-tab` case above in a full Node 22.22.2 + Obsidian environment.


### Main-agent integration correction — view-scoped Excalidraw contract

A host runtime report showed `ExcalidrawView.onLinkOpen()` receiving a custom event whose `detail.nativeEvent` was null. The coordinated Excalidraw change now creates a same-realm fallback mouse event before invoking the legacy hook or navigation path, eliminating both the null hook argument and the subsequent modifier dereference.

Excalidraw Automate now exposes `registerViewLinkClickHook()` with the already-resolved pane action and `viewZoomToFit()`. Excalidraw view state also accepts one-shot `mode: "view" | "edit"` and `zoomToFit: true` options. K-Plex consumes these capabilities when present, keeps its prior optional mode/zoom fallback for older releases, and no longer installs a global hook wrapper or duplicates Excalidraw's settings schema.

The workspace origin for Excalidraw `new-tab` / `new-pane` routing remains the real K-Plex `hostLeaf`, not the synthetic embedded drawing leaf. The adapter now documents this distinction directly next to the `ea.getLeaf(hostLeaf, action)` call. For `new-tab`, K-Plex still re-anchors Obsidian's active-leaf context to that same real host leaf before asking Excalidraw Automate for the target.

#### Required local-agent validation

1. Restart Obsidian once so the staged K-Plex and Excalidraw bundles load; the current long-running Obsidian process did not expose its CLI socket even though CLI is enabled.
2. In embedded Excalidraw, exercise the ordinary/default link action that previously produced `Cannot read properties of null (reading 'metaKey')`; confirm there is no console error.
3. With Excalidraw `LinkClickAction.defaultAction` set to `new-tab`, open a link whose destination is not already open. Confirm K-Plex remains open and the destination appears in a new tab in the real K-Plex tab group.
4. Repeat with a destination already open and confirm Excalidraw's reuse/reveal behavior is preserved.
5. Re-test configured `active-pane`, `new-pane`, and `popout-window` modifier combinations to confirm the nullable-event handling did not change normal mouse-event routing.

### Main-agent automated validation — 2026-09-28

- K-Plex architecture checks, core checks, Obsidian ESLint, 107 repository tests, six Chromium UI tests, and the production build pass under Node 22.22.3. The browser tests require an unsandboxed Chromium process; their sandbox-only `status === null` failures were environmental and passed outside the sandbox.
- Excalidraw `npm run build` and `npm run lib` pass. The production build reports only the repository's existing circular-dependency warnings, with no new TypeScript diagnostics.
- K-Plex deliberately does not add `obsidian-excalidraw-plugin` as a dev dependency in this checkpoint. The npm registry's current `latest` is `1.9.14`, while the checked-out package metadata is `2.2.5` and the plugin release line is `2.28.x`; the generated package also points `types` at a missing `lib/index.d.ts`. Until a separately coordinated npm/library-packaging release provides a reliable public contract, K-Plex keeps a narrow optional capability interface and performs runtime feature detection.
- Targeted ESLint passes for every changed Excalidraw file except `ExcalidrawView.ts`, whose repository-local targeted run still reports only its existing unrelated unsafe-`any` backlog; no diagnostic points at the changed lines.
- Both exact build triples were staged in `kplex-test` and verified byte-for-byte by SHA-256. K-Plex `main.js` is `9b9f3651f68442f9254ba8a3f7e6190174ad19b5107437998cac0367261009d1`; Excalidraw `main.js` is `97c9901c536042ce7eed822dad51013fe6a98cff6b4fc56a2efc745a3832a7ff`.
- Native runtime assertions remain pending because the already-running Obsidian process does not answer any CLI command. Restarting Obsidian is required before the prioritized manual checks above.

### Main-agent follow-up — initial Excalidraw mode and minimum version

The initial view-state integration now sets Excalidraw's requested view/edit mode in the scene's first app state rather than waiting for the first `onChange` callback. This prevents the drawing's persisted mode from winning the initial render when K-Plex's remembered editor mode is **reading**. The first-load callback retains its one-shot synchronization as a defensive completion step and still owns explicit zoom-to-fit.

K-Plex requires Excalidraw `2.28.0` for the view-scoped link hook, one-shot view state, and semantic zoom integration. Before using that contract, the embedded-leaf adapter calls Excalidraw Automate's `verifyMinimumPluginVersion("2.28.0")`. An older bridge receives one localized notice per loaded bridge and follows the existing limited-compatibility open/mode/zoom path; K-Plex does not install partial view-scoped routing against it.

Automated validation under Node 22.22.3 passed K-Plex architecture and core checks, Obsidian ESLint, all 108 portable repository tests, all six Chromium UI tests, localization coverage, and production build. The Chromium tests again required an unsandboxed browser process. Excalidraw production and library builds pass with only the repository's pre-existing circular-dependency warnings. Full Excalidraw lint remains red from existing repository-wide unsafe-`any` debt; targeted output contains no finding on the new initial-mode lines.

The exact build triples were restaged and matched byte-for-byte in `kplex-test`. K-Plex `main.js` is `3621535d6391b3d877bcc1c8fffe7df4f7414d34d53518d19c621e61bf07a4db`; Excalidraw `main.js` is `d6c4740eef07bec079d001c064932c81a09f73cd29bc4a0fb2c2718deb78c53d`. Obsidian CLI remains unavailable while the existing application process is running, so native verification still requires an application restart.

#### Prioritized native checks

1. Restart Obsidian, set K-Plex's central editor default to **reading**, and open `Synthetic-Scale-v2/ExcalidrawNote.md`. Confirm the first visible drawing state is Excalidraw view mode and remains there after loading settles.
2. Switch the remembered mode to **edit**, navigate away and back, and confirm the drawing initializes and remains in edit mode.
3. For the minimum-version branch, temporarily run an Excalidraw build older than `2.28.0` or temporarily raise `MINIMUM_EXCALIDRAW_INTEGRATION_VERSION`, open an Excalidraw-backed center, and confirm the localized compatibility notice appears once while the drawing still opens without a crash. Restore the validated bundles afterward.
