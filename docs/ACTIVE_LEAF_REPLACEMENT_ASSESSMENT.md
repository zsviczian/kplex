# Deprecated `Workspace.activeLeaf`: assessment and replacement

## Scope and intent

This assessment is based on the supplied K-Plex repository (7 October 2026). Its only production read of `workspace.activeLeaf` was in `src/main.ts`, `trackKplexMenu`, formerly around line 3204. This was **deliberate**: when a native `Menu` is dismissed via Escape, the captured K-Plex pane must regain focus rather than Obsidian switching to an unrelated document tab. This is especially relevant when a native `onHide` callback runs *before* K-Plex's window-capture Escape listener. Normal dismissal, selecting a menu item and outside clicks must **not** force focus back to K-Plex.

The code already captures `active-leaf-change` into `recentLeafHistory`. That history supports navigation to the last *document* leaf; it is not an accurate menu *owner* identifier. History can hold a different recent leaf, its entries may predate the current activation, and it deliberately excludes null activation events. `lastDocumentLeaf`, `getActiveFile()`, and `getMostRecentLeaf()` likewise answer a different question.

## What Obsidian actually promises

- `Workspace.activeLeaf` is deprecated/discouraged and can be null. It describes the currently focused leaf, not a stable owner for a particular UI gesture. Official declaration: <https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts>.
- `Workspace.getActiveViewOfType(T)` returns the *currently active view of a specific class*, or null. It is appropriate for inspecting an active Markdown editor, but a menu can outlive the active view; two K-Plex view classes must be checked separately, and focus can shift while the menu is open. <https://docs.obsidian.md/Plugins/Editor/Editor> and <https://obsidian-developer-docs.pages.dev/Reference/TypeScript-API/Workspace/getActiveViewOfType>.
- `Workspace.getLeaf(...)` is for choosing/creating a navigation destination, not for recovering the pane that initiated a context menu. An invocation can choose another leaf or create a new one. `getMostRecentLeaf()` is recent main-area/root focus, not the identity of the initiating view. <https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts>.
- The public `active-leaf-change` event carries `WorkspaceLeaf | null`, but it is a workspace state event, **not** an event-specific ownership token. <https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts>. An older forum report documents sidebar surprises with `getActiveViewOfType()`, `getLeaf()`, and `getMostRecentLeaf()` (Obsidian 0.14.6; this is historical evidence, not proof that modern versions remain broken): <https://forum.obsidian.md/t/workspace-getactiveviewoftype-does-not-return-markdownview-docked-in-sidebar/37743>.

## Implemented design: pass the origin, do not infer it

Every current native K-Plex menu originates from React `KplexApp` or `PlexGraph`, **both of which already receive `hostLeaf` from `BaseKplexView.renderReact()`**. All six menu call sites now pass that existing `WorkspaceLeaf` explicitly:

- `src/ui/App.tsx`: three `showKplexMenuAtMouseEvent(...)` calls.
- `src/ui/PlexGraph.tsx`: three `showKplexMenuAtPosition(...)` calls.
- `src/main.ts`: both presentation methods forward the leaf to `trackKplexMenu(...)`, which captures it in `activeKplexMenuLeaf`. The one deprecated read is removed.

`Menu.onHide`, `justClosedKplexMenu`, and the short next-task release window retain the **original** leaf even if Obsidian changes focus while handling Escape. The existing check for a connected K-Plex / sidepanel view still blocks restoration of closed or replaced views. No new leaf is created and the independent document navigation history is unchanged.

**Why not build an internal `activeLeaf` mirror?** That is viable if a future feature truly needs a general last-activated leaf. It must record `null` events, initialize carefully during layout restoration, validate detachment, and document what it means when a pop-out or sidebar is focused. Here such a mirror would duplicate state and remain less precise than the view that actually raised the menu. Likewise, typed active-view APIs would still infer a current pane at menu setup rather than preserve the origin of the action.

## Validation scenarios

| Scenario | Expected behavior | Automated coverage |
| --- | --- | --- |
| K-Plex menu opens while Obsidian reports another active tab | Escape focuses the exact K-Plex menu owner | `tests/relationship-actions.test.mjs` |
| Main graph and sidepanel both exist; each opens a menu | Escape returns focus to whichever surface opened that menu | Same test |
| Pop-out owning document receives the menu | Listener attach/remove stays on that document; focus uses the passed owner | Same test, simulated document |
| Host changes focus during native menu hide | Capture survives until the Escape listener runs | Existing menu callback regression, updated |
| Select an action/outside-click to dismiss | No spurious focus restoration | Existing native dismissal test |
| Old menu hide fires after another menu opens | Old callback does not release or overwrite new menu | Existing re-entrancy test |
| Host view detached while menu is open | Escape does not focus the detached host | Added regression |
| No generic active leaf available | Source remains independent of `workspace.activeLeaf` and `getLeaf` | Throw-on-access test double |

### Required Obsidian acceptance checks (not covered by Node tests)

1. **Desktop tabs + split panes:** Open two K-Plex tabs and a Markdown tab; open node, gate, history, sync and sidecar-position menus from each graph. Check Escape restores the initiating tab, whereas selecting an action or clicking elsewhere follows normal Obsidian focus behavior.
2. **Sidebar and window identity:** Open K-Plex in a sidepanel and a desktop pop-out alongside a main-window graph. Open menus in each, including a menu whose native handler hides it before K-Plex's Escape capture listener. Verify only the owning pane/window receives focus and no listeners persist after close/unload.
3. **Mobile/restore/lifecycle:** On iOS/Android, long-press/context menus in a sidepanel; then close the pane while a menu is open. Reload with multiple restored panes. Confirm no focus is redirected to a detached pane and no unexpected tab is created.

Node tests can validate callback ownership and type-safe propagation; they **cannot** prove native focus ordering, pop-out keyboard dispatch, or platform-specific sidebar focus. Validate on a disposable Obsidian vault with the actual plugin build and installed host APIs.

## Offline validation of this patch (7 October 2026)

- **Passed:** Parsed all changed TS/TSX source files with the installed global TypeScript parser; no syntax diagnostics.
- **Passed:** Verified that all six menu presentation calls supply `hostLeaf` and that `src/main.ts` no longer accesses `workspace.activeLeaf`.
- **Passed:** Exercised production menu methods extracted from `src/main.ts` in an isolated Node harness: other active pane, graph/sidepanel focus restoration, pop-out-style owning document, early native hide, ordinary hide, detached host and event listener cleanup.
- **Passed:** `node --check tests/relationship-actions.test.mjs`.
- **Blocked (not a pass):** The required npm dependencies cannot be installed in this environment because `registry.npmjs.org` cannot resolve. Accordingly `npm test`, `npm run lint:obsidian`, `npm run build` and a real Obsidian host test were **not** completed. `tsc --noEmit --skipLibCheck` reports missing project type definitions. The runtime is Node 22.16.0; AGENTS.md requires 22.22.2. Run `npm ci && npm run verify` using Node 22.22.2+ and the official Obsidian type package before merging, followed by the native checks above.
