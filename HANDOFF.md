# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

## Current transfer

**State: returned for main-agent review.**

- Sender → recipient: offline development agent → main validation agent.
- Kind: coordinated K-Plex / Obsidian Excalidraw integration change.
- Objective: replace K-Plex's command-palette/leaf-activation workaround for switching an embedded Excalidraw drawing between Excalidraw and Markdown with a view-targeted Excalidraw Automate API.
- K-Plex base identity: user-supplied `repository.zip`, SHA-256 `3c332117cbcdae04becacb8554f3718ae3151012f3401be0dc898173b488f15f`, plus the previously returned `kplex-excalidraw-view-sync-fix.zip`, `kplex-excalidraw-initial-leaf-activation-fix.zip`, and `kplex-excalidraw-initial-activation-command-fix.zip` applied in order to reproduce the state the maintainer tested immediately before this assignment. The supplied archive has no Git metadata.
- Coordinated Excalidraw base identity: user-supplied `obsidian-excalidraw.zip`, SHA-256 `de60f589b1cf7dee8c7eaab6672365912dd3eedde5bab413a8f69bac25c63811`.
- Actual capabilities: no Obsidian runtime/CLI. Container Node is `v22.16.0`, npm `10.9.2`, global TypeScript `5.8.3`. Dependency installation was attempted for both repositories but `npm ci --ignore-scripts` timed out, so real builds/lint remain pending.

## Final design

The representation switch is now owned by Excalidraw and is explicitly targeted at the native view object that K-Plex hosts. K-Plex no longer tries to make a synthetic leaf look like the active workspace leaf long enough for Excalidraw's command-palette command to find it.

The coordinated Excalidraw change adds `ExcalidrawAutomate.toggleViewMode(view: View): Promise<View | null>`. It accepts either:

- a live `ExcalidrawView` for an Excalidraw-backed file, in which case Excalidraw performs its normal save/decompression/Markdown transition; or
- a live `MarkdownView` whose file is an Excalidraw drawing, in which case Excalidraw saves the Markdown view and switches that exact leaf back to `ExcalidrawView`.

The API rejects unrelated/stale views and Excalidraw compatibility-mode views with `null`. It does not inspect or depend on `workspace.activeLeaf`, command palette routing, or DOM focus. The built-in Excalidraw toggle command is also routed through the same API so there is one transition implementation.

K-Plex now calls this API with `leaf.view`. The existing DOM mutation observer remains responsible for reflecting externally initiated representation changes in the K-Plex top-right icon. K-Plex still reapplies its remembered reading/edit mode, Excalidraw link routing, zoom-to-fit and resize state after a successful transition.

All delayed leaf-activation repair introduced by the prior workaround has been removed: no 0/25/75 ms activation timers, no synthetic `setEphemeralState({ focus: true })`, and no command invocation from K-Plex. The ordinary interaction-time `setActiveLeaf(leaf, { focus: false })` remains so native editor shortcuts route to the hosted leaf when the user actually interacts with it; it is not part of representation switching and does not move DOM focus.

## Changed K-Plex files

- `src/adapters/obsidian/embeddedMarkdownLeaf.ts`
  - Extends the narrow runtime Excalidraw Automate bridge with `toggleViewMode(view)`.
  - Uses the exact embedded native view as the representation-switch target.
  - Removes Excalidraw command-manager invocation, transition polling, repeated active-leaf timers and ephemeral-focus repair.
  - Preserves external view-state observation, reading/edit mode reconciliation, link routing, zoom-to-fit and normal interaction-time leaf activation.
- `HANDOFF.md`
  - Replaced the rejected activation-workaround handoff with this coordinated two-repository design and validation packet.

## Coordinated Excalidraw files expected with this transfer

The separate Excalidraw patch contains `src/shared/ExcalidrawAutomate.ts`, `src/view/ExcalidrawView.ts`, `src/core/managers/CommandManager.ts`, `src/shared/Dialogs/SuggesterInfo.ts`, and `src/shared/Dialogs/Messages.ts`. Apply/review that patch before validating the K-Plex runtime behavior. K-Plex's current minimum integration version remains `2.28.0`; the new API is intended to ship as part of that coordinated integration boundary.

## Validation performed offline

- Read K-Plex `AGENTS.md` / `CONTRIBUTING.md` and Excalidraw `AGENTS.md` / `CONTRIBUTING.md` before editing.
- Searched both repositories for the existing Excalidraw/Markdown transition owners. The new EA method reuses Excalidraw's existing `ExcalidrawView.openAsMarkdown()`, plugin Markdown transition and `setExcalidrawView()` paths rather than reproducing lifecycle behavior in K-Plex.
- Parsed all modified TypeScript files with the installed TypeScript parser; no syntax diagnostics were reported.
- A restricted K-Plex `tsc --noResolve` pass reaches only expected unavailable-host/dependency diagnostics (`obsidian`, the local integration module under `--noResolve`, and Obsidian's `HTMLElement.setCssStyles` extension); no new syntax/type-flow diagnostic from the changed code appeared.
- `npm ci --ignore-scripts` was attempted in both repositories and timed out in this environment. Therefore `npm run verify` / K-Plex real build and Excalidraw `npm run code`, `npm run lib`, and `npm run build` are **pending**, not passed.

## Required main-agent validation

1. **Build/integration gate:** with the normal Node/dependency environment, run Excalidraw `npm ci`, `npm run code`, `npm run lib`, and `npm run build`; then run K-Plex `npm ci` and `npm run verify`. Validate K-Plex against an Excalidraw build that actually contains the new `toggleViewMode()` API.
2. **First-render toggle regression (desktop + physical iOS/mobile):** open an Excalidraw-backed central editor node and do not click the canvas first. K-Plex **Show Markdown** must work on the first press; **Show Excalidraw drawing** must switch back on the first press. Repeat after navigating to another central file. No activation timers or extra canvas click should be required.
3. **State/focus synchronization regression:** switch representation externally using Excalidraw's own control and the command palette and confirm the K-Plex icon follows the actual view. After switching to Markdown, Cmd/Ctrl+F and Cmd/Ctrl+B must target the embedded editor; also regression-check remembered reading/edit mode, Excalidraw link routing, zoom-to-fit and fullscreen.

## Reviewer attention

- `toggleViewMode()` is a new public Excalidraw Automate API. The Excalidraw patch updates its TSDoc, SuggesterInfo entry and upcoming release notes as required by that repository's agent guide. No new user-visible localized string was introduced.
- `ExcalidrawView.openAsMarkdown()` now awaits its own `setMarkdownView()` transition so `toggleViewMode()` resolves only after the replacement Markdown view is installed. Existing callers that intentionally ignore the promise keep the same user-visible behavior.
- The K-Plex bridge deliberately feature-checks `toggleViewMode` in addition to the existing semantic version check. If the runtime Excalidraw build does not expose it, the K-Plex button leaves the current representation unchanged instead of falling back to the rejected command/activation hack.

## Next recipient

Main validation agent: review both patches as one coordinated change, run the real build/lint lanes, then validate first-render switching and mobile behavior against the same Excalidraw artifact.
