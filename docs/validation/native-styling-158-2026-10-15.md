# Native styling and Idea Compass — PR #158

Implementation and Windows acceptance are complete; the PR remains draft for review and the platform checks below. No merge, release or issue closure is authorized. Runtime checkpoint: [`701fd62`](https://github.com/zsviczian/kplex/commit/701fd62), based on main `867ef55` integrated through `689399d`. C14 remains accepted; C15–C26 remain paused.

## Delivered behavior

- Native Obsidian surfaces, typography, controls, borders and shadows; inherited public overrides remain usable. Fresh graph defaults follow the theme. Existing and imported literal colors remain explicit until deliberate adoption.
- Shared Default / Fixed / Named / Theme sources across standard/custom styles, lenses, canvas and tint. Named pairs retain stable IDs, separate Light/Dark values and alpha. Partial text/IME, reset, Cancel, failure recovery, concurrent edits and atomic in-use replacement are covered.
- Colors and Labels have separate native subpages. Standard styles show 13 paired palette strips; fields and parent editors show paired swatches. Relationship color labels explain Parents/North, Children/South, Friends–Previous/West and Challengers–Next/East without changing semantic IDs.
- Explicit two-way counterpart suggestions mirror HSL lightness and retain hue, saturation and exact alpha. Generated alpha text is rounded to two decimals without normalizing untouched stored values. Suggestions require explicit Save and cannot guarantee perceptual contrast.
- Directional tint is off by default. Four viewport polygons meet at the rendered center, follow the existing camera and exact center-motion samples, remain non-interactive and disappear under forced-colors. Intensity inherits theme/mode defaults or an explicit 0–15% override; source alpha multiplies tint only.

[User guide](../APPEARANCE.md) · [Public theme tokens](../THEMING.md) · [Architecture and ownership](../ARCHITECTURE.md#appearance-and-native-color-editors) · [Evidence and reproduction](native-styling-158-evidence.md).

## Decisions and correctness

Live paint resolves preserved source identities in the actual document after existing style/lens precedence. It never uses harvested RGB as persisted state or a rendering dependency. Preview-only CSS harvesting uses loaded readable local styles in a script-free, resource-blocked isolated document, informed by Excalidraw's StylesManager. Bounds are 8 MiB estimated UTF-16 CSS,128 sheets / 30,000 rules, 32 ancestors, 64 tokens and 16 expressions per sample. One visible Settings page shares a cached snapshot; palette-only updates reuse it. Frames, listeners and pending work belong to the editor/page lifetime.

Maintainer testing exposed actual Settings paths missing from the initial sampler/direct-method coverage. Native subpages detach the tab root, and CSS refresh can replace the subpage underneath an open draft. The tab now separates its transient action-page/lazy-opening guard from the stable owning Settings document used for previews. Attached roots retain explicit local context. The exact declarative row path and refresh lifetime now have browser/native regression protection. No instruction to leave the editor and switch appearance is required. A theme color without a distinct counterpart can use the same value in both modes.

Each usage card owns its sampled panel backdrop and source-alpha layer. A before-control proves the old transparent counterpart could reveal the active modal. Contrast is calculated against the displayed sample; uncertain translucent backing and patterned fills cannot certify a scalar contrast. A white/black fixture deliberately reports 21.0/1.0 for black text and 13.5/1.2 after a 25% red overlay; these are accuracy controls, not readability acceptance.

All durable appearance writes reuse the serialized settings queue: validate/capture latest fields, persist, then publish only unchanged owners. Deleted optional root colors are copied explicitly. Palette replacement is settings-only. Foreign imports preserve local appearance preferences. Unsupported newer color formats retain raw payloads and read-only behavior; no schema upgrade or cache purge is introduced.

A real-IDB preparation race found duplicate source-facet preparation and stale final paint. The existing finality boundary now permits only paint-policy drift and rebinds current paint synchronously. Source/generation/physical identity and mixed-policy retry fences remain. No separate compiler, classifier, scheduler or broad architecture refactor is added.

## Validation

Windows 10.0.26200; Node 22.22.2; Obsidian 1.14.4; Electron 43.3.0 / Chromium 150.0.7871.212. Formal native acceptance used authorized disposable `kplex-test-small` (88 files; restored local graph11). An observational CSS/preview check used authorized `testvault` (514 files), preserving its existing installed build, open Settings session and configuration hashes. No personal vault was accessed.

| Check | Result |
| --- | --- |
| Final `verify:obsidian` | **1,963 pass**:7 architecture /128 core /859 general /106 UI /334 source /529 source-browser; no failures/skips/cancellations. Official lint, installed types, actual production build and exact-artifact native smoke pass |
| Exact native color/Compass |19 cases pass, including actual Settings row clicks,13 dual strips, paired field editing, alpha, replacement/adoption, source identity, mode and motion |
| Exact native style operations |14 cases pass, including storage failure, concurrency, durable refresh recovery and window ownership |
| Legacy migration |6 matching-build cases pass, including complete imported appearance/ontology, alpha/order, native managers, rendered notes/links and reload |
| Actual theme matrix |9 combinations pass: Default/Minimal/Things × main/popout/actual Settings, with real native light/dark parity and scoped snippet checks |
| Foreground interaction |6 matching-build scenarios pass while inventory is held; zero broad flush calls and normal native foreground/throttling |
| Cleanup | All four baseline configuration files compare byte-for-byte; original runtime keys and saved workspace restore; owned notes/controllers/frames are absent, local graph ready11/88, awake lease released without power-plan change |
| Remote CI | Full verification passes for implementation `701fd62`; the documentation closeout is tracked in the PR checks |

Exact final SHA-256:

```text
4fbd918a6cf7637986c6cdc6b8fca65ae56582081aa4084d7cae346264fc4dc5  main.js
45cc1d7da17b9282bf8eec1930cc31c5565e03fac2ee6406b05061f46d030655  styles.css
19d9ecce5557733e0ff0f2e27155e635c30158c3cfa6fbca0f11c16e4dedfd2c  manifest.json
```

The actual **Obsidian gruvbox** check resolves `--color-green` to `#98971a` in both modes, with Light/Dark panel backgrounds `#f9f5d7` / `#282828`. Current isolated preview content paints both cards; a shared source color does not mean either theme context is missing. This preserves the existing installed plugin/session rather than deploying over open Settings. The first diagnostic trials incorrectly mixed current preview code and the older installed translator; the matching current translator resolves that setup failure. Configuration hashes are unchanged and the diagnostic does not request note content.

Portable coverage includes literal/reference equality, future-data preservation, import isolation, queue races, failed saves, semantic cycles, selected-source repair, paired samples, resource blockade, bounds, cancellation, viewport clipping, real animation timing and lifecycle. Geometry covers1,200 generated cases; 70 browser motion comparisons retain the original effect. 28 integrated positions have maximum observed apex error 0.0000201 CSS px; native observations reach 0.0000305176px. These are DOM/math checks, not actual paint or FPS measurements.

For tested paint/mode changes, forwarding counters observe zero note reads/parses/acquisitions, semantic/search refreshes, visual invalidations and neighborhood lookups, while center/camera DOM remains. The expanded theme matrix completes each new native view's first activation before measuring. An earlier control included two initial popout-demand lookups and is preserved as failed; work was not relabelled as a timing improvement. Empty/300-node and native settled cases schedule zero plugin-follow frames during the observed idle window. No native CPU, retained-memory, allocation, energy or startup-speed improvement is claimed.

## Checkpoints and failed controls

| Checkpoint | Source |
| --- | --- |
| Native chrome / isolated sampler | `8a33627` |
| Color contracts / durable drafts | `2d0232d` |
| Shared editors / paint boundary | `4f52c12` |
| Palette / adoption / style integration | `25ab5fa` |
| Viewport Compass | `3ad76f6` |
| Actual Settings subpage ownership | `60fa70e` |
| Counterparts / alpha / transparent previews | `f9d765d` |
| Paired Settings strips / navigation | `a68c59d` |
| CSS-refresh lifetime / actual-view matrix | `24af90b` |
| Complete finite form-fixture ports | `289af15` |
| Distinct accessible field actions / final fixture cleanup | `701fd62` |

Raw successful and failed controls remain outside the PR tree, indexed separately. The verified final supplement has 3,953,297 bytes / 237 entries, SHA-256 `437eef0034c44a7e887a705d8eadab7316e6e14ab29fd4c499c1b522293bf9aa`; exact inventory, CRCs and all 236 per-file checksums pass. A–D archives are independently reverified and retained. Durable copies are local and unpublished; no evidence archive was uploaded. They include genuine before-fix races/compositing failures, native setup errors, browser setup failures before domain assertions, and E2's missing finite fixture compile entry. The compile inventory/attached-root double and non-browser CSS/timer ports are corrected. Final full 1 preserves16 fixture-port failures; full 2 preserves one source bundle-load timeout before assertions, with its unchanged direct control passing. Frozen full 3 passes all 1,963 tests. Some browser setup timeouts remain intermittent; no claim is made that every historical timeout was root-caused. Implementation CI is green. The browser harness keeps its original deadline, owns one explicit navigation and requires the loaded/focused intended document. No domain assertion was removed to accept a failed trial.

## Remaining acceptance and deferred scope

1. Physical iOS/Android: native picker, two-way suggestions, touch/scroll/focus, narrow settings/modal layouts, theme change, hide/resume and motion cleanup.
2. macOS/Electron: Settings/popout migration, native picker/focus, Escape/close, overlapping durable saves and unload. Windows evidence does not establish macOS behavior.
3. Minimum Obsidian 1.13 runtime and visual acceptance: installed1.13 typings pass, but runtime tests use1.14.4. Review the actual preferred community theme, high contrast, gate/selection distinctions and composited colors. Pinned CSS fixtures do not reproduce theme scripts/plugins or every selector context.

Style Settings/Style Manager metadata is explicitly deferred; neither plugin is needed. Plain public CSS snippets remain supported. No companion-state synchronization, presets, extra layout mode or further performance optimization is included. Theme-script-only/inaccessible/over-budget alternate contexts remain Estimated, and a preview cannot guarantee contrast for arbitrary imagery or patterned/translucent surfaces. Keep the PR draft for review.
