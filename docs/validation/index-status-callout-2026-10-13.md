# Indexing status — one dedicated callout

The status marker no longer has an `aria-label` that feeds a second tooltip. It uses `aria-labelledby` and the existing clipped accessible-name class, retaining the live localized status as its screen-reader name. Hover and keyboard focus retain the existing InfoBubble. A completed stationary long press opens that same callout through the shared gesture owner; it does not create a generic tooltip. Synthesized-click suppression, drag cancellation, double-tap summary and keyboard summary activation remain intact.

`IndexStatusIndicator` owns its callout listener and removes it on teardown. `LongPressTooltip` recognizes the explicit `data-kplex-tooltip="callout"` owner, excludes it from generic hover hints and delivers its long-press event in the owning window's realm. Other controls retain their ordinary hover/long-press behavior. No CSS, localization, indexing semantics or persisted settings were changed.

## Identity and verification

Branch `PR-cleanup`, HEAD `186aec3aa6565a7014897b206c1f8cc0e9b9dba1`; this fix and earlier validation changes remain uncommitted. No commit/push/merge/release actions occurred.

Node 22.22.2; macOS Obsidian 1.14.4 (installer 1.14.0). Production build and targeted official scanner lint pass. Six real-browser shared-tooltip checks pass, including the dedicated-callout exception and touch click guard. A separate real-browser check mounts the actual status component extracted from production source with its real gesture owner; incomplete status has one callout, no competing tooltip, correct accessible name, keyboard summary activation, double-tap activation and clean unmount. The component check is registered in `npm test`. Extended indexing/performance suites were not repeated for this focused UI change.

Deployed only the three built plugin artifacts to the CLI-confirmed `kplex-test-small`. `data.json` was preserved during staging. Final source/build and installed `main.js` match SHA-256 `ed2743d0381700e620014f17543b9174dd8fa4a754bcd7cc283531849d2a4859`. Manifest/CSS hashes remain unchanged from the [risk-test checkpoint](risk-based-regression-2026-10-13.md). No production vault was probed or changed.

## Native observations and limits

The installed-build probe passed three assertions: accessible name with no `aria-label`/`title`; a single dedicated hover callout after the generic tooltip delay; and a single dedicated long-touch callout with release/click suppression. Hover used trusted Electron pointer motion. Long-touch used synthetic pointer events on the actual native React/DOM; physical Android acceptance remains with the maintainer.

The first native keyboard-focus observation did not obtain its expected callout after Escape focus restoration. A subsequent attempt found the indicator hidden (`getClientRects().length === 0`). Further native UI changes were avoided while the maintainer was conducting the manual tests; keyboard and double-tap behavior were verified with the isolated actual-component browser check. These native attempts are not reported as fully passing runs.

Both native attempts captured the already tracked ResizeObserver undelivered-notification burst. The original #25 error gate remains unresolved; this change does not suppress those notifications or claim to resolve them. Temporary native test controllers were removed. This focused probe created no notes and did not rearrange panes.

## Receipts

- Build: `/private/tmp/kplex-index-callout-build-final.log`.
- Lint: `/private/tmp/kplex-index-callout-lint.log`.
- Six tooltip checks: `/private/tmp/kplex-index-callout-browser.log`.
- Actual-component check: `/private/tmp/kplex-index-callout-component-r3.log`.
- Exact staging: `/private/tmp/kplex-index-callout-stage.json`.
- First native observations: `/private/tmp/kplex-index-callout-native-first.json`.
- Second native attempt: `/private/tmp/kplex-index-callout-native.json`.
- Native driver/controller: `/private/tmp/kplex-index-callout-runner.mjs`, `/private/tmp/kplex-index-callout-native.js`.

The isolated component fixture's first two launches failed its module-ready handshake; the fixture now exports a real module namespace and passes. No production assertion was weakened to obtain that result.
