# Temporary handoff: C05a host-free fuzzy suggester

**Status:** Ready for external agent. **Base revision:** `9190241` on `kplex-refactor` (accepted C04). **Checkpoint:** C05, scoped offline slice C05a. **Final reviewer:** the main agent with Obsidian access.

This is the single transient handoff file; overwrite it at the next handoff, do not archive it. `Refactor plan.md` is the definitive tracker. Read `AGENTS.md`, the plan's temporary-handoff workflow and C05 entry, `docs/ARCHITECTURE.md`, and `docs/UI_COMPONENTS.md`. Return **uncommitted** changes and fill in the report below. Do not mark C05 Done in the plan.

## Goal and scope

Extract the existing `src/ui/FuzzySearchInput.tsx` interaction into a host-free `src/ui/components/` React suggester. Make the portable component a real production dependency through a small compatibility export/wrapper at the old import path; do not build an unused parallel component. Remove its transitive `ObsidianIcon` dependency by passing an icon node/render slot from the legacy Obsidian-facing wrapper. The wrapper should preserve the current default search icon and named `tags` icon. Avoid global host/plugin access and host-specific CSS selectors as defaults inside the portable component. Its result data, ranking and domain actions remain caller-owned. Existing `fuzzyFilterStrings` may stay behind the old export or move to a small pure helper with that export retained; it must not become the portable component's data policy.

Inspect the **actual** consumers before editing: `src/ui/SearchBox.tsx` (toolbar search) and canonical `src/ui/NewRelatedNoteModal.ts` plus its compatibility twin `.tsx` (note and ontology fields). Keep both modal files synchronized if touched. Preserve the old public props/import path while live consumers still use it; document the exact remaining facade consumers and planned C25 retirement in `docs/UI_COMPONENTS.md`. Do not migrate the native `Modal` shell, relationship commits, note creation, graph search, translations or CSS/theme rules in this slice.

Preserve these different policies: toolbar results open on focus and portal within the nearest K-Plex app; the modal note/ontology fields stay closed until typing and portal to their owning document body so they escape modal clipping. Modal results may open above the field when lower space is insufficient. Keep current app-relative and viewport geometry, clipping, width, max-height, z-index, keyboard selection and selected-row scrolling. Existing `focusRequest`, clearing/reopening, disabled, empty-list, outside-pointer, mouse selection and blur semantics must remain. Escape dismisses a visible result list while leaving the input focused; it must not also trigger a host shortcut. Ctrl/Cmd+Enter remains a caller action; in the modal, **Link** stays a separate commit action and **Placeholder** never becomes the default create action. Avoid selecting a result when Enter is used to confirm an in-progress IME composition.

Review C04's `src/ui/components/FloatingLayer.tsx` before implementation. Reuse its owner-document portal/lifecycle mechanics only if they can preserve the suggester's distinct placement and Escape/input-focus policy with a small, explicit API; do not shoehorn the suggester into C04's fixed below-anchor formula or document-capture Escape behavior. If reuse would require broad redesign, keep the suggester's specialized positioning/dismissal in its own host-free component and explain the decision in the report. Resolve `Document`, `Window`, `ResizeObserver` and listeners from the shell/input's owning document, including after an owner-document move and rerender; release listeners/observers on close, unmount and owning-window teardown. No host import may be reachable from the new component.

## Offline acceptance

- Extend the real-browser DOM lane in `tests/ui-components.test.mjs` (or a focused equivalent invoked by `npm test`) to render the **production portable component**, not a mock. Exercise app-root and owner-body portal modes, positioning/repositioning and a second document/pop-out-like case; inside and outside pointer; focus/request/blur and clear/reopen; Arrow Up/Down, selected-row scroll, Enter, Escape, Ctrl/Cmd+Enter, empty and disabled states, and composition/IME Enter. Assert result order is the caller's order. Use observables rather than source-text tests.
- Characterize both production consumer configurations in the test or an equally direct contract test: toolbar open-on-focus versus modal closed-until-typing, no default Enter creation, and distinct Ctrl/Cmd+Enter callback. Preserve exact existing CSS hooks, class names, user-visible strings and prop behavior. Any genuinely new display string must use the English catalog; console diagnostics stay English.
- On Node **22.22.2**, run `npm run verify` and `git diff --check`. Report actual test totals, lint warnings, build result and unavailable prerequisites. The architecture checker must include the new `src/ui/components/` module and show **zero** host-boundary violations. Do not weaken checker rules or fixtures.
- Keep command IDs, persisted keys, graph/index/lens semantics, ranking algorithms and modal creation defaults unchanged. No new dependency or broad stylesheet change is expected.

## Reviewer-owned C05 completion

The main agent will review the entire diff and consumer call graph, rerun the pinned portable lane, fix defects and stage the exact bundle into the named `kplex-test` vault. Real Obsidian checks will cover toolbar search and note/ontology modal fields: keyboard selection/IME, focus/dismissal, result portal position/stacking in main window and pop-out, empty/disabled/busy behavior, and phone/tablet emulation. The reviewer will request a physical-device touch/keyboard check only for behavior that host automation cannot establish, record prioritized manual tests and the actual automated results in `Refactor plan.md`, then commit C05 only after validation is confirmed.

## External agent report — fill in before return

- Starting revision/branch and changed-file set:
- Portable component API, icon injection and remaining compatibility facade:
- C04 `FloatingLayer` reuse decision and owner-document/cleanup evidence:
- Toolbar versus modal behaviors preserved; canonical `.ts` / `.tsx` status:
- Browser DOM cases, exact pass/fail counts and any test prerequisites:
- Architecture roots/reachable files/violations; Node/npm versions; `npm run verify`, lint warnings, production build and `git diff --check`:
- Obsidian main/pop-out/mobile/physical checks unavailable to you:
- Highest-probability regression, prioritized reviewer checks, unresolved questions and rollback scope:
