# Five Plex UI enhancements — validation

Feature branch `ui-improvements-batch-2`, base `5091f88abb69f660c900fed1dd0d41c7b738af81`.
This is feature work within the accepted architecture. C15–C26 remain paused.

## Behavior and ownership

| Request | Delivered behavior | Existing owner extended |
| --- | --- | --- |
| Draggable filters | Drag the **Filters and lenses** heading; controls retain focus and values. Placement survives scrolling, reclamps on resize, and resets on reopen. | `FloatingLayer` / `DraggableDialog`, with owning-document cleanup |
| Find filter action | Beside **Include paths**, **Filter matching notes** applies the literal trimmed Find term to the existing label-contains Quick Filter and enables Reflow. The center remains visible. | `PlexFind` action capability and App predicate/layout state |
| File drops | Center drops navigate. Drops into Parent/Friend/Challenger/Child areas, including their node bodies, open the shared composer with the center origin and fixed dropped endpoint. | Host file-drag adapter, rendered scene areas, canonical relationship composer |
| Pinned linking | Gate-to-pin drops supply the gate role; body-to-pin drops offer eligible roles. Self, structural and duplicate-role drops stop without falling through to another action. Unpin controls remain separate. | Shared history/pinned hit testing and canonical gate membership |
| Layout controls | Independent horizontal/vertical density and exact parent/child column rails write the current device/surface profile. Compact view and minimum link length affect actual spacing. | Existing settings migration/profile/layout policy plus reusable `LayoutSlider` |

Legacy `compactingFactor` remains the vertical density key. Missing horizontal values inherit the
same profile's former density; explicit split values survive save/reload. Foreign imports preserve
K-Plex's own surface profiles. Stored parent3 normalizes to the established renderer/product cap2.
Ordinary children allow seven columns; miniature descendants honor narrower child settings within
the established three-column/two-visible-row maximum. Normal default gaps stay unchanged; compact
view changes whitespace without shrinking node padding. Horizontal density also controls label
truncation. Expanded footprints and filtered row packing share geometry metrics.

These controls do not invalidate semantics, scan the vault or start C15. No index/compiler/scheduler
owner changed. No new remote service or runtime diagnostics were introduced.

## Verification

Main-agent focused checks: layout/profile/localization/environment 45/45 passed on Node22.22.3.
Returned focused checks include four shared floating/Find Chromium cases, two actual-DOM relationship
routing/cancellation cases, 32 relationship-action cases and production geometry collision matrices.
Actual installed Obsidian declarations are used; a doubled host in geometry tests is not a native pass.

Final `npm run verify:obsidian` **passes** after the native-detected portal-focus correction:
architecture 7, host-free core 67, Node 216, UI 15, portable sources 322, and browser/real-IndexedDB
294; no skips. The 24 production settings-independence scenarios, actual installed types, real build
and exact-build installed command/DOM/error smoke pass. Official scanner: zero errors and one retained
legacy `Workspace.activeLeaf` deprecation warning at `src/main.ts:3134`; no new warning in touched code.

Runtime: Node 22.22.3, Obsidian 1.14.4 / installer 1.14.0, installed Obsidian declarations 1.13.0,
TypeScript 5.9.3, React/ReactDOM 19.3.0 and official scanner 0.4.2. The final aggregate spans
21:03:40–21:13:35 UTC; the browser suite takes 534.826 seconds. This elapsed time is test execution,
not product latency.

Native acceptance uses only disposable `kplex-test-small`, with exact-build hash checks. The existing
UX driver retains its prior scenarios and adds production filter/Find controls, native captured-pointer
pin gestures, rendered file-drop area routing, Settings-driven spacing measurements and a responsive
desktop/tablet/phone matrix. File-drop routing uses a real host payload plus DOM DragEvents; it is not
trusted operating-system drag delivery. Layout measurements normalize the camera and assert no full
semantic rebuild. Tests restore exact settings/enablement bytes, owned fixtures/leaves/controllers,
menu/drag wrappers, mobile mode, window bounds and renderer throttling.

The final native run passes **53/53 scenarios**, comprising 47 desktop workflows and six device-matrix
assertions. All four area drops and four gate-to-pin links commit with canonical role/provenance;
body-to-pin choice/cancel and self/duplicate/folder rejection pass. The native filter drag preserves
field focus, camera and values, retains dragged coordinates while scrolling, and releases positioning
on reopen. Find applies label Contains/Reflow while preserving the center and navigation history.
Captured JavaScript errors are empty, and desktop/device cleanup both pass. Native execution spans
21:02:08–21:03:14 UTC; one recovered CLI timeout is recorded. Final passive cleanup audit confirms
13 original Markdown files, no owned fixture folder/controllers, desktop mode, index ready and
original background throttling enabled.

[Exact validation evidence](ui-enhancements-2026-10-05.json) preserves all 53 scenarios, final suite
counts, 267 frozen runtime/test/build inputs and artifact digests. The final rebuild, staged artifacts
and native-tested artifacts match; no runtime/test input changed through closeout:

| Artifact | SHA-256 |
| --- | --- |
| `main.js` | `5b94a62290ce98c3248bef87885bdb6e958d359ad2acf44c7f0df5caa73099bf` |
| `manifest.json` | `e3bb9a35215af97f6a3394cf7fc8f7d2142bae06de94bb112fef5a05819cda62` |
| `styles.css` | `275dec66cf7af0bf2e7ab7104af87a7b3d08e107abb6dc30304146b40a9b0e61` |

Commands used, with the same explicit disposable target for both native lanes:

```sh
export PATH=/Users/zsviczian/.nvm/versions/node/v22.22.3/bin:$PATH
export KPLEX_TEST_VAULT_NAME=kplex-test-small
export KPLEX_TEST_VAULT_PATH=/Users/zsviczian/Obsidian/kplex-test-small
export KPLEX_TEST_CONFIG_DIR=/Users/zsviczian/Obsidian/kplex-test-small/.obsidian
KPLEX_HOST_REPORT_DIR=/private/tmp/kplex-u2-ux-settled-retry-20261005 \
  KPLEX_UX_EMULATE_MOBILE=true caffeinate -d -i npm run verify:obsidian:ux
KPLEX_HOST_REPORT_DIR=/private/tmp/kplex-u2-final-aggregate-20261005 \
  caffeinate -d -i npm run verify:obsidian
```

The exact build was staged by a full aggregate before UX, then by focused checks/build after the
portal-focus fix. Final full verification ran after UX and produced identical artifacts. Native
drivers ran serially; `caffeinate` prevented sleep without changing renderer throttling.

| Measured change | Horizontal gap | Vertical gap |
| --- | ---: | ---: |
| Baseline H2 / V2 | 33.75 px | 24.297 px |
| H4 / V2 | 19 px | 24.297 px |
| H2 / V0.75 | 33.75 px | 48.594 px |
| Compact view, H2 / V2 | 27.672 px | 19.922 px |
| Minimum link length 6 | 24.297 px | 17.492 px |
| Minimum link length 40 | 57.375 px | 41.305 px |

Measurements use actual rendered short-label child nodes normalized by the camera scale. Node size
remains 116.398×54 px in these comparisons. Child 1 and child 7 render exactly the configured count;
parent 1 and all four rail values agree with the saved current-surface profile. Full semantic rebuild
delta is zero. These are functional geometry assertions, not paint/latency benchmarks.

Device classes are observed after each native mode change, rather than inferred from requested size:

| Desktop emulation | Actual viewport | Controls and filter panel | Web routing / errors |
| --- | --- | --- | --- |
| Desktop | 1200×875 | Four rails fit; filter beside path button; panel 560×447.094 fits | webview / none |
| Tablet | 900×875 | Four rails fit; filter beside path button; panel 560×503.094 fits | iframe / none |
| Phone | 390×844 | Four rails fit; filter beside path button; panel 374×654.594 fits | iframe / none |

The device matrix uses DOM activation and geometry; trusted filter and pinned pointer gestures are
tested in the desktop workflow. Physical touch and mobile WebView acceptance remain separate.

## Retained failures and corrections

- The first aggregate stopped before native staging because five history-action test fixtures lacked
  the newly shared eligibility dependency. They now extract the production helper and provide Markdown
  facets/canonical gate membership, retaining old assertions and adding pinned rejection coverage.
- The first native filter drag moved the panel correctly but focused the Plex shell. React portal
  capture reaches App before the header's native drag listener. App now preserves filter-panel focus;
  an actual production-handler regression and the exact-build native drag both pass.
- A rapid area-link sequence opened the correct Child composer but its initial Link preparation was
  cancelled by optional current-view publication. The driver now waits the existing tracked P0–P3
  owners and stable publication before/after committing. Production admission guards, scheduler and
  semantic owners are unchanged; this is settled UI acceptance, not a rapid-write race claim.
- One retry timed out in CLI `dev:errors clear` before starting scenarios; cleanup passed. The following
  run passes all 53 scenarios with normal test-driver reconnect handling. CLI timeouts are separate from
  JavaScript/product failures. Failed trial reports remain under `/private/tmp/kplex-u2-*`.

No 20k-vault timing was run for this presentation task. Browser stress coverage in the mandatory
aggregate is separate from native small-vault functional evidence. Physical Android/iOS acceptance of
the earlier indexing work does not establish acceptance of these new gestures.

## Outstanding physical interaction checks

1. On Android and iOS, drag the filter heading and adjust both density axes; link a gate/body to a pin.
   Confirm that touch activation, scrolling and focus work without panning the underlying Plex.
2. Drag an actual note from Obsidian's File Explorer onto the center and each relationship area.
   Confirm OS drag delivery selects navigation or the expected fixed-target linking dialog.

These cover native touch/WebView and OS drag delivery that desktop DOM/emulation tests cannot prove.
