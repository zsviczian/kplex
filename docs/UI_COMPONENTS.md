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
