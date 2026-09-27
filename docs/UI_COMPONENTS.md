# Portable UI components

C03a introduces one deliberately small host-free interaction primitive: `src/ui/components/ActionButton.tsx`.

## `ActionButton`

`ActionButton` is for an ordinary icon action with four inputs: an accessible `label`, an `icon` React slot, optional native `disabled`, and an ordinary `onClick` callback. It always renders a real `<button type="button">` with the existing `excalibrain-icon-button` class and a `kplex-action-button` token hook, and uses the label as its `aria-label`. It does not implement toggle/pressed state, menus, async/busy behavior, shortcuts, navigation policy, or host effects.

The component owns no icon library. The icon is React content supplied by the caller. In the current Obsidian composition, `App.tsx` continues to create `ObsidianIcon` elements and passes them into the slot, so Lucide acquisition remains on the host side of the portable component boundary. `ActionButton` does not import Obsidian, `ObsidianIcon`, plugin/settings modules, host globals, or DOM helpers.

C03a migrates only the adjacent **Navigate back** and **Navigate forward** actions. `App.tsx` still owns their history callbacks, disabled predicates, icon names and 17 px icon size. The local legacy `ToolButton` remains in `App.tsx` for the alias toggle, expanded-view toggle, connector-style toggle, and settings action. Those controls intentionally remain outside this slice; later C03/reviewer work owns any further migration rather than broadening this primitive now.

## Tooltip ownership

`ActionButton` intentionally renders no HTML `title` and installs no pointer, touch, or long-press listener. The existing document-scoped `LongPressTooltip.ts` remains the single gesture owner for buttons under `[data-kplex-tooltip-scope]` and reads the button's ARIA label. This keeps tooltip and long-press click-suppression behavior centralized instead of creating a second tooltip path inside the reusable component.

## DOM behavior lane

`tests/ui-components.test.mjs` is a separate DOM-capable lane invoked by `npm test` (and therefore `npm run verify`). It uses the existing React, React DOM and esbuild dependencies to bundle the real production component into a temporary page, then renders that page in a headless Chromium-family browser. No new npm test dependency is introduced, so the lockfile does not change for the harness. The runner discovers common Chrome/Chromium executable locations or accepts `KPLEX_TEST_BROWSER`. Keeping this lane in a separate browser process avoids attaching React UI tests to the indexing fixture's fake `window`.

The lane verifies rendered native DOM behavior rather than matching component source text: label and icon-slot rendering, the preserved CSS class, enabled click firing once, native disabled click suppression, `type="button"` form safety, and absence of `title`/a second tooltip. The simple headless `--dump-dom` runner does not inject trusted physical Enter/Space key events, so it does not claim keyboard-input proof. `ActionButton` relies on an unmodified native `<button>` with no custom keyboard interception; the reviewer-owned live Obsidian check remains the evidence for physical keyboard, focus, and touch/long-press behavior.

## Host token seam

The reviewer added only the migrated action hook and its values to `styles.css`. The Plex shell currently uses its own dark palette even under a light Obsidian theme. Foreground, background, hover, border and disabled opacity therefore map to the **existing rendered values** so this extraction does not recolor two buttons while the rest of the toolbar remains dark. Focus uses Obsidian's `--interactive-accent` so keyboard focus is visible. The component imports no host CSS or theme API; a later shell theme migration can change this mapping without changing its behavior.

| Token | Current host mapping | Purpose |
| --- | --- | --- |
| `--kplex-action-fg` | `var(--eb-text)` | Current icon/foreground color. |
| `--kplex-action-bg` | `rgba(255, 255, 255, .055)` | Current action surface. |
| `--kplex-action-bg-hover` | `rgba(255, 255, 255, .11)` | Current hover surface. |
| `--kplex-action-border` | `rgba(255, 255, 255, .09)` | Current border. |
| `--kplex-action-focus` | `var(--interactive-accent)` | Obsidian theme-aware focus outline. |
| `--kplex-action-disabled-opacity` | `.28` | Current disabled opacity. |

The values live on `.excalibrain-app` in each owning document, including pop-outs. If an action button later appears in a body portal, its portal root must receive the same token scope; this checkpoint migrates only the two in-tree navigation buttons.

## `FloatingLayer`

C04a adds `src/ui/components/FloatingLayer.tsx` as a host-free owner-document floating-layer primitive and migrates only the Plex Filter panel. The component takes the open state, anchor and panel refs, an explicit inside-root resolver, a dismissal callback, an explicit portal-target policy, positioning values, and a render function for the panel content. It derives the active `Document` and `Window` only from the anchor's `ownerDocument`; it does not read global `document`/`window`, Obsidian APIs, plugin state, or `.excalibrain-app`.

The primitive owns the mechanics that were previously local to `PlexFilter`: React portal creation, fixed positioning below the trigger, viewport width/left/max-height clamping, resize and captured-scroll refresh, outside-pointer detection, Escape dismissal, Escape focus restoration to the trigger, and cleanup of document/window listeners plus its `ResizeObserver`. A handled Escape is consumed so Obsidian's workspace shortcut does not also switch tabs. The explicit inside-root list is the containment contract: the current Plex Filter supplies its trigger and panel; a future consumer may also supply a separate nested portal root so interaction there remains inside. Outside-pointer dismissal does not refocus the trigger, leaving the pointer target free to receive focus. Owner-window `pagehide` tears down listeners and observation even if React does not get an ordinary unmount first; a render after the anchor changes owner document also rebinds those resources to the new document.

`PlexFilter` still owns all filter/domain state, panel content, existing `kplex-filter-panel` / `kplex-filter-portal` classes, `data-kplex-tooltip-scope`, theme/CSS behavior, and `registerOpenFilterPanel()`. In particular, the filter-specific `body.kplex-filter-panel-open` class remains outside the generic primitive because it coordinates Obsidian tooltip stacking rather than generic floating-layer mechanics. Its registration also follows the trigger's owner document after a render in a new window. The panel's production positioning values are passed explicitly (560 px preferred width, 300 px minimum width, 8 px viewport margin, 6 px trigger gap, 180 px minimum max-height), preserving the pre-extraction formula without hard-coding Plex policy into the reusable component.

### Why the other floating consumers remain distinct

`FuzzySearchInput` is not migrated in C04a. It owns input focus, result visibility, keyboard selection/dismissal, retained selection behavior, result scrolling, and two distinct portal policies (`viewport` body vs `.excalibrain-app`). Its floating result list can choose above/below placement and sizes itself from the search shell/app geometry. Those are suggester policies rather than the Plex Filter's modal-like panel policy; C05 is the planned checkpoint for making that suggester host-free and can consume the proven mechanics without moving ranking or selection into `FloatingLayer`.

`RelationPopover` is also not migrated. It is currently host-bound through the plugin, Vault and relationship mutation APIs, auto-focuses its note search input, uses its own window-level Escape listener, and is positioned from caller-provided graph coordinates rather than an anchor element. Folding those behaviors into C04a would hard-code relationship/modal policy into the primitive. If a later C04b review finds a small shared mechanic worth adopting before C05, it should remain a separate consumer migration rather than expanding this primitive's responsibilities.

### C04a DOM behavior lane

`tests/ui-components.test.mjs` renders the real `FloatingLayer` in a Chromium-family browser. The test covers body portal placement, the preserved position formula, resize and captured-scroll repositioning, trigger/panel/nested-portal inside pointers, one-shot outside dismissal without forced trigger focus, Escape dismissal with trigger focus restoration, listener/observer cleanup on close, owner-window `pagehide` and unmount, and a second-document/iframe case proving both portal placement and outside-pointer listeners follow the anchor's owning document. These checks remain separate from the indexing suite's fake `window`. Obsidian main-window/pop-out stacking, theme appearance, Sidecar/modal interaction and physical touch remain reviewer-owned host checks.

## `FuzzySuggester`

C05a extracts the production fuzzy-input interaction into `src/ui/components/FuzzySuggester.tsx`. The portable component owns input focus state, caller-ordered result rendering, keyboard selection, match highlighting, selected-row scrolling, outside-pointer dismissal, IME-safe Enter handling, and the existing app-relative or owner-body floating geometry. Callers still own result production/ranking and all domain actions. The component accepts its icon as a React slot and contains no Obsidian import, plugin/global access, or host-specific selector default. App-mode selectors are explicit composition inputs; viewport mode derives its portal, `Document`, `Window`, `ResizeObserver`, resize/scroll listeners, and teardown from the rendered shell's owning document/window. A rerender after an owner-document move rebinds those resources, and owner-window `pagehide`, close, and unmount release them.

C04's `FloatingLayer` is intentionally not reused here. Its contract is a fixed below-anchor panel with document-capture Escape dismissal and trigger-focus restoration. The suggester has two different geometry policies, may open above in viewport mode, and handles Escape on the input while deliberately retaining input focus. Reusing `FloatingLayer` would therefore require broadening that primitive with suggester-specific placement and keyboard policy rather than sharing a small mechanical seam.

The old `src/ui/FuzzySearchInput.tsx` path remains a thin Obsidian-facing compatibility facade. It injects the existing 16 px `ObsidianIcon`, preserving the default `search` icon and named icons such as the modal's `tags`, and retains `fuzzyFilterStrings` as caller-side ranking policy. The exact remaining facade consumers are `src/ui/SearchBox.tsx` (toolbar search) and `src/ui/NewRelatedNoteModal.ts` plus its synchronized compatibility twin `src/ui/NewRelatedNoteModal.tsx` (note and ontology fields). C25 is the planned retirement point for this facade after those host compositions can supply icon slots directly.

The toolbar configuration remains open-on-focus and app-portaled inside `.excalibrain-app`, with its topbar-relative placement. The related-note modal remains closed until typing and portals to the owning document body, allowing above-field placement when lower viewport space is insufficient. Enter still chooses only an available result unless a caller explicitly supplies `onEnterWithoutResult`; Ctrl/Cmd+Enter remains a separate caller callback, and an Enter delivered during IME composition does not choose a result. Existing CSS hooks, class names, strings and public facade props are unchanged.

The browser DOM lane renders the production `FuzzySuggester` directly. It covers both consumer policies, caller result order, icon-slot rendering, app/body portal ownership and geometry, above placement, focus/request and clear/reopen behavior, inside/outside dismissal, Arrow Up/Down and selected-row scrolling, Enter/Escape/Ctrl-or-Cmd+Enter policy, disabled/empty states, composition Enter, and a second-document move followed by rerender to verify portal/listener ownership follows the moved shell. Native Obsidian main/pop-out stacking and physical touch/keyboard delivery remain reviewer-owned checks.

Physical-phone review found one extra viewport condition: the software keyboard can shrink `visualViewport` while `window.innerHeight` stays unchanged. The body-portalled suggester now clamps its result list to the visible viewport and responds to its resize/scroll events; the browser lane exercises that resize against the production component. The Obsidian-owned `NewRelatedNoteModal` shell applies `fitMobileModalToViewport` so **Add Child** fills the usable phone screen and its content scrolls above the keyboard. That helper is intentionally outside the portable component and is not a blanket policy for other modals. C07 surveys other K-Plex dialogs, while physical keyboard/touch confirmation remains the C05 exit gate.

## `collectionWindow`

C06 shares one headless operation across the native relationship-style, note-type-style and unassigned-ontology managers: bound an already-filtered/ordered list and calculate the next **Show more** count. The first two retain 12 initial rows and increments of 20; unassigned ontology retains 16 and increments of 24. Callers retain search, sorting, status/empty copy, row rendering, validation and mutations. The helper introduces no React or Obsidian dependency. The touched **Show more** captions use `collection.showMore` in the English catalog through a host translator. C07's broader dialog-content extraction is deferred because the current native shells have different validation/action/async policies; no shared content primitive or converted dialog is claimed.
