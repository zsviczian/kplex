# Theming K-Plex

K-Plex consumes Obsidian’s interface fonts, surfaces, text, borders, controls, focus and shadow variables. Public K-Plex aliases are fallbacks at their consumers, so inherited `body` overrides and view-specific overrides remain available. Saved graph color choices take precedence where the existing style inheritance selects them. Choose **Default**, or explicitly adopt theme colors, to expose those defaults; see [Colors and appearance](APPEARANCE.md).

## Public appearance tokens

Color tokens accept complete CSS colors, including alpha, rather than RGB/HSL channel tuples. A **Theme color** source names one color variable. Private `--_kplex-*` bindings and unlisted geometry/runtime variables are implementation details.

| Tokens | Native fallback / purpose |
| --- | --- |
| `--kplex-panel`, `--kplex-panel-2` | Primary and secondary Obsidian surfaces. |
| `--kplex-text`, `--kplex-muted`, `--kplex-line`, `--kplex-accent` | Normal/muted text, border and accent. |
| `--kplex-control-bg`, `--kplex-control-border`, `--kplex-control-hover` | Native controls. |
| `--kplex-action-bg`, `--kplex-action-bg-hover`, `--kplex-action-fg`, `--kplex-action-border`, `--kplex-action-focus` | Toolbar action states. |
| `--kplex-action-disabled-opacity` | Numeric disabled opacity, normally Obsidian’s value or 0.5. |
| `--kplex-node-shadow` | A complete `box-shadow` value, normally Obsidian’s small shadow. |
| `--kplex-canvas-background` | Canvas background, then Obsidian’s primary surface. |
| `--kplex-node-fill`, `--kplex-node-text`, `--kplex-node-border`, `--kplex-node-hatch-color` | Secondary surface, normal text, border and muted hatch. |
| `--kplex-central-node-fill`, `--kplex-central-node-border` | Alternate primary surface and accent for the center. |
| `--kplex-gate-stroke-color`, `--kplex-gate-fill-color` | Muted gate outlines/fills. |
| `--kplex-folder-text` | Navigation-item text. |
| `--kplex-tag-fill`, `--kplex-tag-text`, `--kplex-tag-border` | Obsidian tag treatment. |
| `--kplex-url-text`, `--kplex-virtual-text`, `--kplex-inferred-text` | External-link, unresolved-link and muted text. |
| `--kplex-link-color`, `--kplex-link-text`, `--kplex-link-label-background` | Native graph-line/muted blend, normal text and primary label surface. |
| `--kplex-semantic-origin`, `--kplex-semantic-development`, `--kplex-semantic-support`, `--kplex-semantic-challenge` | Purple, green, cyan and orange defaults for the four semantic slots. Saved slot sources override these defaults. |
| `--kplex-compass-parent-color`, `--kplex-compass-child-color`, `--kplex-compass-friend-color`, `--kplex-compass-challenger-color` | North/south/west/east tint defaults; absent values use the corresponding semantic slot. Saved direction fills override these defaults. |
| `--kplex-compass-opacity` | Decimal opacity such as `0.08`, or `8%`, bounded to 0–0.15. Invalid/unit-bearing values inherit 0.07 in either mode. A saved intensity overrides this token, including zero. |

These are appearance inputs. Font metrics, layout constraints, gate geometry and runtime camera variables retain their existing owners. Theme tokens do not reclassify relationships or replace explicit property/tag/lens precedence.

## Plain CSS examples

Save a snippet through Obsidian’s normal CSS-snippet workflow. These examples require no theme-settings plugin:

```css
body {
  --kplex-canvas-background: var(--background-primary);
  --kplex-node-fill: var(--background-secondary);
  --kplex-central-node-border: var(--interactive-accent);
  --kplex-semantic-origin: var(--color-purple);
  --kplex-semantic-development: var(--color-green);
  --kplex-semantic-support: var(--color-cyan);
  --kplex-semantic-challenge: var(--color-orange);
}
body.theme-light { --kplex-compass-opacity: 0.05; }
body.theme-dark { --kplex-compass-opacity: 0.07; }
```

A direction can have its own theme default:

```css
body { --kplex-compass-parent-color: var(--color-purple); }
```

A view-local override can be scoped to `.kplex-app`. Detached menus and native dialogs have their own document/portal context; use inherited `body` variables for shared chrome. Source previews preserve the originating view’s color context. Verify changes in main and popout windows and in both modes. Invalid color references fall back safely and remain repairable; theme authors should still supply valid complete colors.

Tint remains off until enabled in K-Plex settings. Alpha multiplies SVG fill opacity; foreground content retains its own opacity. Forced-colors suppresses the decoration. The sectors describe compass direction, including offscreen centers, rather than exact relationship membership.

## References and deferred integrations

See Obsidian’s [CSS variables](https://docs.obsidian.md/Reference/CSS+variables/CSS+variables) and [Colors](https://docs.obsidian.md/Reference/CSS+variables/Foundations/Colors). The [validation report](validation/native-styling-158-2026-10-15.md) records tested theme fixtures and acceptance gaps.

Explicit counterpart suggestions are available in the named-color editor. Style Settings/Style Manager metadata remains deferred. Native settings, theme defaults and plain snippets are the supported standalone workflow.
