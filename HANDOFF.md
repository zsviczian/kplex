# Temporary handoff: C04a owner-document floating layer

**Status:** Ready for external agent. **Base implementation commit:** `ed9fb26` on `kplex-refactor`; start from the branch HEAD containing this file. **Checkpoint:** C04, scoped offline slice C04a. **Final reviewer:** the main agent with Obsidian access.

This is the one transient handoff file. Overwrite it at the next handoff; do not archive it. `Refactor plan.md` is the definitive tracker. Read `AGENTS.md`, the plan's temporary-handoff workflow, verification matrix and C04/C05 descriptions, `docs/ARCHITECTURE.md`, and `docs/UI_COMPONENTS.md`. Do not mark C04 Done or edit its plan status. Return an uncommitted, reviewable changed-file set and fill in the report below.

## Goal and bounded scope

Extract the **mechanics** of one working floating layer from `src/ui/PlexFilter.tsx` into a small host-free hook/component under `src/ui/components/`. Migrate **only the Plex Filter panel** as the production consumer. This is a mechanical extraction first: preserve its existing trigger, panel contents, open state, positioning formula (viewport clamping, width, top and max height), owner-document body portal, inside/outside pointer behavior, Escape dismissal, body-class registration, CSS classes, tooltip scope and stacking. Keep `registerOpenFilterPanel()` and the filter-specific `kplex-filter-panel-open` body class owned by `PlexFilter`, since they control Obsidian tooltip layering rather than generic floating behavior.

The extracted API must take the anchor/trigger, panel content or ref, open state, dismissal callback and any positioning/portal policy it needs **explicitly**. Derive document and window from the anchor's `ownerDocument`; do not read global `document`/`window`, plugin state, Obsidian APIs or `.excalibrain-app` inside the portable component. Keep host CSS and theme classes on the `PlexFilter` side. Use an explicit list of inside roots (trigger, panel and optional nested portal root) so a pointer inside a nested portal does not count as an outside click. Return focus to the trigger when Escape dismisses the panel; an outside pointer should be free to focus its actual target. Clean up document/window listeners, observers and scheduled work on close, unmount and owning-window teardown. Do not add a second tooltip owner or duplicate HTML `title` attributes.

**Host baseline before extraction:** In the staged C03 build at desktop 1440×875, opening the filter places `.kplex-filter-portal` directly under the trigger's owning document body, sets `aria-expanded=true` and `body.kplex-filter-panel-open`, and computes a 560 px fixed panel clamped inside the viewport. Escape from a focused select closes the panel and clears that body class, but focus falls to `BODY`; restoring focus to the trigger on Escape is the one intentional accessibility correction in this slice. Do not interpret those sample coordinates as a fixed layout requirement.

Inspect `src/ui/FuzzySearchInput.tsx` and `src/ui/RelationPopover.tsx` **only to document their different focus/modal policies** and confirm the API does not hard-code Plex Filter policy. Do not migrate either one in C04a. In particular, do not move fuzzy ranking/selection, graph lens state, relationship mutation, native modal behavior, or user-facing copy. Keep `PlexFilter` in its legacy location; only the extracted reusable mechanics are a migrated architecture root. If a genuine second-consumer difference demands a broader API, record it for a later C04b review rather than redesigning this slice.

## Offline acceptance

- Extend the existing browser DOM lane in `tests/ui-components.test.mjs` or add a similarly small separate browser test. Render the **real extracted primitive** with a test consumer in a real DOM. Assert owner-document portal placement (including an iframe/second document), trigger/panel/nested-portal inside clicks staying open, outside pointer closing once, Escape closing and returning focus, position refresh after resize and captured scroll, and listener/observer cleanup after close and unmount. Assertions should observe DOM behavior, not source text. Keep browser tests separate from the indexing suite's fake `window`.
- Preserve the existing `PlexFilter` production behavior and exact existing CSS hooks. Do not change `styles.css` unless required to preserve the current panel appearance; if a CSS edit is necessary, explain its scope and leave theme/pop-out visual acceptance to the reviewer. Any new or changed user-visible string must use the English catalog; console diagnostics remain English.
- Run on Node **22.22.2**: `npm run verify` (architecture checker, official Obsidian ESLint, all tests and real production build) and `git diff --check`. Report actual test totals, warnings, failures and unavailable prerequisites. The new `src/ui/components/` module and its reachable imports must have **zero** host-boundary violations. Do not weaken the checker, fixtures or lint rules.
- Preserve command IDs, settings, persisted data, graph/index/lens semantics, filter values, search behavior and all other popovers. Do not add dependencies merely for this slice unless the existing DOM harness genuinely cannot test it.

## Reviewer-owned C04 completion

The main agent will inspect the full returned diff, rerun the pinned portable lane, fix defects, stage the exact bundle into `kplex-test` and test the actual filter trigger/panel in the main window and a pop-out. Host checks include inside/outside pointer, Escape/focus restoration, scroll/resize reposition, tooltip visibility above the panel, Sidecar/modal stacking where applicable, light/dark styling, cleanup after close/reload and phone/tablet emulation. Physical touch remains a separate required check if pointer handling changed; desktop emulation is not physical-touch proof. The reviewer decides whether a second consumer is needed as C04b before marking C04 Done.

## External agent report — fill in before return

- Starting revision/branch and returned changed-file set:
- Primitive API, owner-document/portal policy and exact `PlexFilter` code moved:
- Preserved positioning, dismissal, focus, body-class and tooltip behavior:
- Why `FuzzySearchInput` and `RelationPopover` remain distinct; any proposed C04b:
- Browser DOM cases and exact pass/fail results, including second-document and cleanup evidence:
- Architecture roots/reachable files/violations; Node/npm versions; `npm run verify`, lint warnings, build and `git diff --check`:
- Obsidian main/pop-out/theme/Sidecar/physical-touch checks unavailable to you:
- Highest-probability regression, prioritized reviewer checks, unresolved questions and rollback scope:
