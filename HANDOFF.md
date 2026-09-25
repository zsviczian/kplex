# Temporary handoff: C03a portable action button

**Status:** Ready for external agent. **Base implementation commit:** `65b6a55` on `kplex-refactor`; start from the branch HEAD containing this file. **Checkpoint:** C03, scoped offline slice C03a. **Final reviewer:** the maintainer's main agent with Obsidian access.

This is the one transient handoff file. Overwrite it at the next handoff; do not archive it. `Refactor plan.md` is the definitive tracker. Read `AGENTS.md`, the plan's sections 3.4, 3.6, 3.7, 4.4 and C03, plus `docs/ARCHITECTURE.md` and `docs/LOCALIZATION.md`. Do not mark C03 Done or edit its plan status. Return a reviewable changed-file set or branch and fill in the report below.

## Goal and exact scope

Extract **one host-free native action-button primitive** in `src/ui/components/` and migrate **only** the adjacent **Navigate back** and **Navigate forward** buttons in `src/ui/App.tsx`. These are the matched pair: both are ordinary icon actions with a label, disabled state and click callback. Keep their position, icon names and 17px icon size, disabled predicates, history callbacks, CSS class and English accessible labels unchanged. The existing local `ToolButton` must remain for the other toolbar controls; do not migrate toggles, menus, graph controls or `ThoughtNode` fold buttons in this slice.

The new component must render a real `<button type="button">` with an accessible label, native `disabled`, one icon slot supplied as React content and an ordinary click callback. Accept only props needed by this pair; it does not need toggle/pressed, async/busy or menu semantics. The portable component must not import `obsidian`, `ObsidianIcon`, the plugin, settings, `window` globals or DOM helpers. Compose the existing `ObsidianIcon` in `App.tsx` and pass it into the icon slot; Obsidian remains the icon source. Preserve the existing `excalibrain-icon-button` styling hook and let `App.tsx` own navigation intent.

Use L00's catalog for both labels: keep `toolbar.navigateBack` and add one `toolbar.navigateForward` entry with the unchanged English text **Navigate forward** and translator context. Pass the translated strings into the primitive. Do not add an HTML `title`: the existing document-scoped `LongPressTooltip.ts` delegates from buttons inside `[data-kplex-tooltip-scope]` and uses the ARIA label. Do not add a second tooltip or long-press listener. These two actions have no displayed shortcut; do not invent one. Leave console diagnostics in English.

Create `docs/UI_COMPONENTS.md` describing this implemented primitive, the icon-slot boundary, who owns the delegated tooltip, and the remaining legacy `ToolButton`. Record the **proposed** minimal `--kplex-*` token mapping for its foreground, background/border, focus and disabled states, based on the existing toolbar selectors in `styles.css` and Obsidian theme variables. **Do not edit `styles.css` in C03a**: the main reviewer will apply and validate the host CSS/token seam against the real light/dark/community theme and pop-out. This is intentionally a scoped handoff, not the whole C03 exit.

## Offline acceptance

- Add a small DOM-capable behavior lane invoked by `npm test` and `npm run verify`; choose the lightest suitable harness, update the lockfile if adding a dev dependency, and document the choice in `docs/UI_COMPONENTS.md`. Test the rendered primitive rather than matching source text: the action fires once for an enabled click, disabled never fires, the label and icon slot render, `type="button"` prevents accidental form submission, and the output has no `title`/second tooltip. Cover native keyboard activation if the harness supports it; leave physical keyboard/touch evidence to the reviewer.
- Run `npm run check:architecture`; the new component and all reachable imports must remain in the portable `components` layer. Keep the graph/index fixture suite separate from the DOM harness; do not attach React UI tests to its fake `window`.
- On Node **22.22.2**, run `npm run verify` (architecture, official Obsidian ESLint, aggregate tests and actual TypeScript/production build) and `git diff --check`. Report exact pass/fail, warning counts and any unavailable dependencies. Do not weaken architecture/lint/tests, and do not claim a stubbed render proves the live plugin.
- Preserve stable command IDs, navigation history behavior, persisted settings/data, view routing and all other controls. No graph/index changes, icon-library changes, broad restyling, general design system or new native shell code.

## Reviewer-owned C03 completion

The main agent will review the full returned diff, reproduce the pinned build/tests, implement/review the smallest host CSS token mapping, and stage the exact build in `kplex-test` via `verify:obsidian`. It will check both navigation actions, enabled/disabled state, focus/tooltip behavior, main window and pop-out, then use desktop tablet/phone emulation for layout and request physical mobile long-press validation if this slice affects touch behavior. Desktop emulation is not physical touch proof. The reviewer alone updates C03's durable ledger/status and commits the accepted checkpoint after required validation.

## External agent report — fill in before return

- Result and branch/commit or uncommitted changed-file set; starting revision:
- Files changed and why; exact two controls migrated:
- Primitive API and host-free import-boundary result (roots/reachable/violations):
- Catalog keys, existing English/ARIA/icon/disabled/click behavior preserved:
- DOM harness and behavioral cases; how tooltip ownership is kept single:
- Proposed host CSS token map and any visual uncertainty:
- Node/npm versions; commands, exact pass/fail/warning results; build and diff check:
- Obsidian, pop-out, theme and physical-touch checks unavailable to you:
- Remaining legacy `ToolButton` callers and who owns their later migration:
- Highest-probability regression, prioritized reviewer checks and open questions:
