# Canvas zoom, Vault search and View context menu

Base: `9c117e6` (`main`). Feature branch: `codex/canvas-zoom-search-view-menu`.
Runtime checks use Node 22.22.2 and the installed Obsidian 1.13.0 declarations.
Native Small runs use macOS Obsidian 1.15.0 (installer 1.14.0), with 76 original files.

## Changes and ownership

- Camera input already used refs and animation-frame batching. Desktop movement now leases a
  compositor hint for 160 ms after the latest input, then releases it so idle labels rerasterize
  at the final scale. The owning document supplies timers; unmount/migration releases the lease.
  Coarse-pointer WebViews keep their existing non-promoted rendering policy. Native embedded
  editors remain outside the graph transform. No React scene state, index or persistence changes.
- GraphIndex retains search ownership and all textual prefix candidates. Fuzzy matching jumps
  between matched UTF-16 code units; fields that cannot improve a score are skipped. Native
  eligibility is checked only when a hit could enter the bounded ranked output. Alias/path
  weights, stable ties, stale native identity rejection and URL eligibility are preserved.
- The dropdown was already bounded to 24 rows. A toolbar button rule outranked its row styling;
  portal-safe result selectors now restore transparent, shadow-free rows with faint separators,
  while preserving pointer/keyboard selection feedback.
- The context **View** submenu reads registered definitions and their existing `choices`
  contributions, including inactive views' retained/default state. It supports one or multiple
  choice groups, current-view/subview checks and disabled choices. Selection uses the existing
  native editor preflight, session reducer and captured command lifetime. There is no
  Facets-specific branch, new settings schema or semantic acquisition owner. All eight catalogs
  include the new menu label. See [the contribution contract](../CANVAS_VIEW_API.md#captured-ui-contributions).
- Native Find validation exposed a non-async cleanup callback containing `await`. The callback
  is corrected, with a regression that compiles setup/scenario/cleanup through the actual
  native-document-session wrapper. This is test tooling only.

## Automated checks

Passed:

- `npm run build` — real TypeScript/Obsidian types and production bundle.
- `npm run lint:obsidian` — official Obsidian scanner, no errors or warnings.
- `npm run check:architecture` — nine guard tests, zero boundary violations; numeric-control audit passed.
- `node --test --test-concurrency=1 tests/localization.test.mjs tests/canvas-menu.test.mjs tests/canvas-view-api.test.mjs tests/plex-view-session.test.mjs tests/viewport-fit.test.mjs tests/search-entry-allocation.test.mjs tests/url-search-publication.test.mjs tests/markdown-zoom-preferences.test.mjs` — 133 tests.
- `node --test --test-concurrency=1 tests/canvas-menu.test.mjs tests/canvas-view-api.test.mjs tests/obsidian-runner.test.mjs` — final 70 tests, including the cleanup syntax regression.
- `node --test --test-concurrency=1 tests/vault-search-browser.test.mjs tests/canvas-view-selector.test.mjs tests/canvas-view-api-browser.test.mjs` — 15 real-Chromium tests.
- `node --test --test-concurrency=1 tests/compass-background-browser.test.mjs` — three real-Chromium tests: actual camera callbacks/Compass geometry with 300 elements, zero idle frame work, compositing renewal, owner replacement and disposal.
- `git diff --check`.

Search regression coverage includes 100,000 entries, full prefix candidates and lookup counts;
independent reference ranking covers aliases, paths, stable ties, UTF-16 and stale native files.
Browser search checks 24 rendered rows, inherited CSS, Down/Up/Enter, Escape, outside dismissal,
repeat focus and portal teardown. Menu tests cover production presets, additive plugin choices,
stale revisions/configuration, failed preflight, one-shot callbacks and native submenu fallback.

The expensive `npm test` / `npm run verify` aggregate indexing/storage suites were deliberately
not run. The change does not alter source acquisition, semantic compilation/publication,
index scheduling, persistence or schemas. Focused production search and URL-publication checks
exercise the affected GraphIndex read path. This is not a full-suite acceptance claim.

## Bounded diagnostic comparisons

Search used the actual bundled GraphIndex methods from base and candidate, the same 100,000
normalized synthetic entries, and five queries (`entry`, `entry-9`, `entry-99`, `entry-99999`,
`avkn`). Three alternating pairs retained identical ordered results.

| Arm | Native eligibility checks per chain | Chain elapsed ms, in run order |
| --- | ---: | --- |
| Base | 249,098 | 321.85, 150.86, 115.65 |
| Candidate | 136 | 103.71, 83.85, 70.98 |

These are synthetic synchronous method timings with lightweight native-file lookup ports.
Warm-up/shared-machine effects qualify timing comparisons; they are not Obsidian keystroke-to-paint
measurements. The committed count/ranking regressions provide deterministic evidence.
Private receipt: `/tmp/kplex-search-comparison.json`.

Camera diagnosis used actual production camera callbacks and CSS in headless Chromium, with
600 synthetic DOM nodes and 600 SVG paths, 75 scale updates per arm, and alternating disabled /
enabled compositor leases. Chromium ran with the existing harness's software-rendering flags.

| Arm | Raster tasks per arm | Summed traced raster-task duration ms | Frame interval p95 ms |
| --- | ---: | --- | --- |
| Hint disabled | 444 | 1288.73, 1136.39, 2044.01 | 17.5, 17.5, 17.7 |
| Transient hint | 344 | 166.65, 342.60, 231.61 | 17.6, 17.6, 17.7 |

Raster durations sum traced tasks and may overlap across threads; they are not wall-clock CPU
or GPU time. Frame pacing remained display-limited in this fixture. Every candidate arm ended
with `will-change: auto`. This supports reduced raster work, not a universal native frame-rate
claim. Private receipt: `/tmp/kplex-camera-comparison.json`.

## Native checks and retained failures

The final build was staged in the verified disposable Small vault. SHA-256:

- `main.js`: `608bc5f8fcb8237a9ff621527329c41151a7239fa24f747a740de0e8fd7a687c`
- `styles.css`: `e82031049af4e594b6a62695a894c819590dac41a87ea17839eef2dbed15aaa4`
- `manifest.json`: `2822c38463c03ace4f017453679572d462534ce2a9c9558fd7593f259b01bfa1`

Native OS input opened F4 search, typed a query, moved selection and dismissed results.
Visual inspection confirmed the light rows in the actual Obsidian window. The OS canvas menu
exposed View with Compass, Mind Map and Facets; this alone does not certify nested selection.

The final callback-only native lane passed in main and popout windows. It captured actual
Obsidian Menu instances from the production canvas-context callback, verified three views and
two Facets presets, invoked the registered preset callback, and checked both parent/subview
native checked states after selection. It passed configuration/controller cleanup. This is
programmatic native callback evidence, not OS submenu input acceptance. Private receipt:
`/tmp/kplex-canvas-review-menu-callback/canvas-menu-callback-review.json`.

The full `KPLEX_UX_FIND_ONLY=true` lane failed its native target-focus prerequisite. Its original
cleanup also failed to compile; after the one-line fix, recovery removed all owned notes/leaves,
restored settings/native owners and returned inventory to 76 files. Strict layout equality was
transiently inconsistent, so that run remains failed; a later matching observation is not a pass.
Private report: `/tmp/kplex-canvas-review-find/report.json`.

Two 150-node native source-work probes remain failed: the first overlapped fixture source work;
the second did not establish source quiescence within its unchanged setup deadline. Both cleaned
up successfully. They do not establish a camera-induced source regression or a zero-work pass.
The early menu-only probes also remain failed because their synthetic submenu/owner interaction
did not reveal the children. Each passed cleanup. Private reports remain under
`/tmp/kplex-canvas-review-native*` and `/tmp/kplex-canvas-review-menu*`.

## Remaining acceptance

1. In the maintainer's dense real scene, compare wheel/trackpad zoom and final label sharpness
   in the main window and a popout. Synthetic software raster traces cannot certify perceived
   native GPU latency, memory or the original vault workload.
2. Complete the full native F4 lane and OS nested-view selection, Escape/outside dismissal
   and editor-save rejection, including independent main/popout choices. Portable/browser
   contracts and actual main/popout menu callbacks pass; the recorded full native driver
   prerequisites are not a passing receipt.
3. On a physical phone/tablet, confirm search touch targets, submenu activation and pinch behavior.
   The mobile compositor exclusion remains in place; desktop evidence cannot certify WebView input.
