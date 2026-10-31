# Editor, mobile dialog and revisit fixes — PR245

Base: `main@5ea0eda`. Branch: `2026-10-31-editor-mobile-navigation-fixes`.
Scope: Mind Map root editor expansion, PDF editor nodes, #242, #235, #233, #232, #231 and #216.

## Behavior and ownership

- The existing native editor owner now admits PDF files and offers expansion for occurrence editors, including Mind Map roots. Expansion uses a viewport frame independent of camera motion; it retains the same native leaf/API and normal binding dimensions. Restore returns the saved camera. The header shows the current note title beside the existing localized collapse/minimize control. Its original rectangle-ellipsis icon is retained.
- Automatic document following updates an existing destination; it cannot create a tab/split when none exists. Explicit Open/Sync actions retain creation. This removes a confirmed creation path relevant to #235; the reporter supplied no diagnostic trace proving every cause of their original tab-order symptom.
- Rename remains an Obsidian `Modal` and leases the existing owner-document mobile VisualViewport helper, releasing it on close.
- Each canvas session retains recent view/scope camera, selection, group and section-fold preferences. The LRU is limited to 64 entries and 65,536 UTF-16 units including keys, with an 8,192-unit per-entry payload and at most 256 keys per fold list. These are serialized-payload bounds, not a measured total JavaScript heap bound. No note bodies, native files or whole-vault preference inventory are retained. Closing the canvas/restarting clears this history; it is absent from settings, workspace serialization and IndexedDB. Revisiting an expanded outline reacquires its current source through the existing section owner and filters stale section IDs.
- The self-contained worker and cooperative parser both recognize escaped/balanced square brackets in Markdown URL labels. Cooperative long-label scans retain cancellation checkpoints. Body parser version 4 retires stale parser-3 URL labels; compatible URL-free parser-3 sources and known tombstones remain reusable through existing authentication. No database schema or user-file migration is introduced.
- Connector arrival animations now operate on an inner paint group. A finished `fill: both` opacity animation can no longer override focus dimming on the outer group. Paths and captions dim together, including descendant strips; a focused node’s direct descendants remain visible.

## Checks

- Node **22.22.2**, installed repository dependencies and actual Obsidian declarations.
- Focused parser/worker/cooperative parity and cancellation, memory/LRU/isolation, PDF identity, expanded frame bounds, save/close/navigation, caption focus and section revisit regressions pass.
- `npm run lint:obsidian`, real `npm run build` and `git diff --check` pass.
- Aggregate `npm run verify` completed its release/architecture/core/scanner, main **1,783 tests**, browser/UI **445 tests** and source **357 tests** successfully. Its final real-IndexedDB lane reported **849 passing / 6 failing** of 855: all six were remaining test fixtures hard-coded to current parser 3 (one CAS assertion and five optional-priority observers). Those fixtures now use `SOURCE_BODY_PARSER_VERSION`; rerunning their complete warm-alias/optional-priority group passed **20/20**. The optional migration-guard file was also corrected to exercise current-version inputs rather than fail early on an obsolete version and passed **57/57**. The aggregate command itself exited nonzero; the affected cases passed their explicit reruns. No runtime repair was needed for these stale-version failures.
- The default **20,015-source** high-degree browser/IndexedDB case passed with exact publication/cancellation and zero extra reads/parses/full builds. This scale proof is separate from the 76-file native vault.
- The final direct-descendant focus adjustment has an additional passing browser regression and scanner/build check. Source serialization, parser and storage code were unchanged by that final UI adjustment.

## Native evidence

Actual macOS **14.5**, Obsidian **1.15.0** (installer **1.14.0**), Excalidraw companion **2.28.1**, explicitly selected disposable `kplex-test-small` (**76 files** before/after cleanup). These are functional native checks, not a large-vault timing benchmark.

The committed drivers use scoped CLI transport, exact built/installed artifact hashes, bounded scenarios and independent restoration of owned files, native workspace, settings bytes and mobile mode:

```text
npm run verify:obsidian:editor-mobile-navigation
npm run verify:obsidian:rename-mobile-viewport
```

Exact artifact/source receipts: [native receipts](editor-mobile-navigation-245-receipts.json).

Desktop/native cases: Mind Map root expand/restore/close with title and unchanged native editor; actual rendered PDF pages in Compass and Mind Map; real Excalidraw root expansion with the same native API; folded-outline and exact-camera restoration on revisits; fifteen rapid passive requests with no destination creating zero panes and retaining focus; popout title/expanded controls/close while expanded. Phone/tablet checks use real Obsidian mobile emulation at actual inner widths 420/900 with a controlled 300-pixel visible keyboard viewport. Rename/Cancel are visible and hit-test reachable; viewport listeners release after closing. Final `dev:errors`: no errors captured.

The companion sequence had one earlier unresponsive-renderer/CLI trial. Only the disposable renderer was recovered; its backed-up settings and four owned fixtures were restored, leaving the other vault/main Obsidian process running. An isolated drawing sequence and the complete rerun subsequently passed after the harness waited for native PDF page readiness and explicitly selected the drawing representation. This is an intermittent observation, not evidence that all native lifecycle races have been eliminated. An older representation driver separately refused its missing existing-host prerequisite; it is not counted as passing acceptance.

## Review limits

1. Physical Android/Gboard with a tall keyboard: open Rename, scroll/type, select Rename/Cancel and confirm native touch/focus behavior. Desktop emulation cannot establish this.
2. Rapid drawing editor open/expand/restore/close during camera motion: controls must remain reachable; check the earlier intermittent native stall under the maintainer’s actual companion/version/workspace.
3. Repeat #235’s original tab-reordering workflow. Automatic missing-target creation is prevented, but absent reporter diagnostics leave other plugin/native causes unproven.

No personal-vault deployment, release, merge or issue closure is part of this PR. The PR remains available as a draft for maintainer review while physical-device/intermittent-host limits are outstanding.
