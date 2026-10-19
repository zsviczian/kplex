# Safe native Plex folding - PR #173

**Decision: keep draft.** The implementation fixes confirmed command, focus and ownership failures. Local full verification and persistence recovery pass. Final-artifact folding passes all 36 functional assertions, but its native error gate fails during companion popout closure; acceptance remains incomplete. Keep [#164](https://github.com/zsviczian/kplex/issues/164) open.

## Scope and confirmed findings

Main from merged #172 (`ef301dc07fa6a8754455a6aeb94ae871d2aacd75`) was integrated without rewriting history at `2735550a28b7ad16a68da1df2a0cac4ad9845217`. #161 is closed with the requested [comment referencing #172](https://github.com/zsviczian/kplex/issues/161#issuecomment-6231672379).

The original published command accepted a second invocation without unfolding. With `[Bases | K-Plex] [managed Bases | New tab]`, folding left focus inside the hidden graph; activating the other hidden tab also left it invisible. Closing the exact managed Sidecar already restored the group and remains protected. Three direct equal-width groups measured about 471.67 px each before folding, then the companion **and unrelated third group** became 707.5 px: a real allocation leak.

The stable action/command IDs now toggle one captured native pair. Routing uses explicit/focused Plex, a participating group, sole folded recovery, deliberate interaction recency, then a sole candidate or the existing finite native picker. Explicit absence cannot select another graph; other windows and stale captures cannot become implicit fallbacks. Command checks do not require a graph center.

`collapsedPlexHosts` remains the sole fold inventory. `PlexFoldSession` installs group-level native recovery outside editor scroll content before hiding the complete host group through an owned class/token. Tabs, pin state, selected surviving tab, native dimensions and flex remain native-owned. Restoration precedes release/reveal/fullscreen/remount/teardown; automatic recovery preserves native focus. Delayed explicit reveal cannot steal a later tab selection. A narrow observer repairs recovery-control removal without observing note text.

New folds support **two direct tab groups in an isolated native split with a complete shared edge**, on all four edges. Direct three-group and nested partial-edge layouts are refused visibly. Disjoint isolated branches can fold independently; overlapping pairs restore the prior fold before revalidation. Fullscreen exits before folding; Zen remains independent. Eight locales describe the whole-group scope and unavailable/chooser states.

A separate held-candidate reproduction showed startup restoration overwriting a newer explicit Sidecar owner. Adoption now fences both awaits with the existing ownership revision and exact view/generation, then requires attached, adjacent, unclaimed native identity. Positive unchanged startup restoration remains covered.

Two bounded native prerequisites are retained: ElementMotion discards a declined/null animation acquisition rather than retaining a broken cancellation owner; presentation capabilities ignore a closed popout hint. Neither claims to fix the underlying host animation/window-status behavior. No index, parser, source acquisition, semantic policy, settings schema or scheduler implementation changes.

## Exact-build validation

Node 22.22.2; Windows 10.0.26200; Obsidian 1.14.4 (installer 1.14.0); Electron 43.3.0; host Node 24.18.1; Excalidraw 2.29.0. Only authorized disposable `kplex-test-small`: 107 files / 88 Markdown. No personal vault access.

Final `main.js` SHA-256: `8d20bf308e935f353a9eea24256d44838b33863cd6d99d7b00ed056e7459e8c1`. Installed hashes match the build. The evidence manifest records all three artifacts and exact source/driver snapshots.

| Check | Result |
| --- | --- |
| `npm run verify:obsidian` | Pass: 937 portable, 131 general Chromium, 334 source-contract and 560 source-browser tests; architecture/core, installed types, official scanner, production build, strict staging/open smoke. |
| Native folding | 36 functional cases pass; one physical whole-group drag check unavailable. Overall **failed** native error gate, detailed below. |
| Native persistence | All five checks pass, no captured errors, complete configuration/runtime/inventory restoration. |
| Existing display-mode lane | Pass after correcting its unconditional Mac-only chrome assertion for Windows. Native fullscreen/Zen/window and emulated-layout coverage; not physical touch. |
| Existing Sidecar navigation lane | Pass, 38 samples, configuration restored, no captured errors. Diagnostic API/DOM samples are not perceived paint or a performance claim. |
| Broader action lane | Windows semantic-Mod transport corrected. Thirteen scenario groups pass, including native same-chord local/global exclusion; subsequent physical F1 recorder assertion fails. Overall incomplete. |
| Broader relationship-workflow lane | Stops at `Wrong child target/storage` on both this artifact and the merged-#172 baseline (`c720a9f6...`). This reproduces before the folding changes; the lane remains incomplete. |

The folding matrix exercises the published command and trusted Mod-Shift-F9, Enter/Space, actual picker cancellation/selection from Search, pins, native sibling activation/closure, exact-owner closure/replacement, disjoint/overlapping pairs, all edges, resize/zoom/theme, two-way host migration, managed-companion popout closure, actual Excalidraw/Markdown switching, PDF/Canvas and stale callbacks. Original fixture bytes/configuration are restored; test-owned content, wrappers and controls are removed.

Clean transition intervals record **zero** calls to semantic invalidation/refresh, full rebuild, Markdown patching, snapshot hydration, Vault.read/cachedRead/modify/create and native Leaf.openFile. These bounded counts do not establish CPU, energy, total background savings or paint latency. Setup and ordinary content navigation are excluded. A separate ordinary hidden-note edit retains existing center demand, then naturally drains source/scheduler/snapshot work and displays the new neighbor on stationary reveal, preserving center/history. Folding does not promise to stop legitimate indexing.

Persistence uses a trusted divider drag to establish a **62.0053% / 37.9947%** measured split. Native serialization retains normal dimensions while folded. Live plugin disable, enabled and disabled renderer reloads, and a **forced selected-renderer interruption followed by disabled startup** all preserve reachable groups and allocation. The interruption receipt verifies a changed renderer PID, unchanged selected webContents identity, native `crashed` reason and main-process recovery. An IDs/PIDs-only guard refuses a shared renderer. Ordinary reload is not mislabeled interruption. This does not prove full Electron/process/OS restart.

## Unresolved native error and failed controls

Final-artifact folding runs nine, ten and eleven pass all functional assertions but capture `t.webContents.getZoomFactor is not a function` from Obsidian's `updateStatus` during `managed-companion-popout-close-restores-source-without-closing-siblings`. The error is not suppressed. Recovery, source sibling preservation and cleanup still pass. A complete pre-final-fence build had passed the 36-case matrix cleanly; that is earlier-build evidence only.

Three simple no-fold popout-close trials, three with the same remote proxies, and three with native source focus are clean. A matched matrix control that omits the preceding fold in the companion-migration case is also clean. These controls narrow the trigger; they **do not establish that the exception is unrelated to folding**. Source review finds no K-Plex `getZoomFactor` call or global active-window assignment. Removing the diagnostic child-realm remote proxies also reproduces the exception while preserving all functional and cleanup assertions. Keep this gap open before merge recommendation.

Earlier failures and exclusions remain raw evidence: initially unawaited native startup ownership; Excalidraw intercepting raw representation requests; original help drawing autosave (bytes restored, later owned copies); prematurely destroyed source popout; expired child-realm remote proxy; truthy native iterator callbacks stopping fixture inventory; later fixture branches with zero geometry; ResizeObserver errors including a run before its first case; and an incomplete inert UI import inventory in the first verification. Successful controls use actual initialization/representation owners and void inventory callbacks. No underlying host observer/window bug is claimed fixed.

The broader action driver previously assumed Meta for semantic Mod on Windows. The corrected driver retains explicit Meta recorder probes, optional OS_CUA's macOS-only contract and strict scope/focus assertions. Display-mode correction retains non-Windows chrome exclusion and validates Windows leases/insets. Failed prerequisite runs and subsequent results are preserved rather than relabeled passes.

## Reproduction, evidence and remaining acceptance

Use the three explicit disposable-vault variables in CONTRIBUTING.md, then run serially:

```text
npm run verify:obsidian
npm run verify:obsidian:sidecar-folding
KPLEX_FOLD_NATIVE_RESIZE=true KPLEX_FOLD_FORCE_RENDERER_CRASH=true npm run verify:obsidian:sidecar-folding-persistence
npm run verify:obsidian:display-modes
npm run verify:obsidian:sidecar-latency
```

The third line shows environment assignments conceptually; use the shell-specific syntax. Each native command requires a fresh private `KPLEX_HOST_REPORT_DIR`; open a visible Plex before the display-mode lane. Reusable drivers retain configuration backups and exact artifact/source hashes. Nothing is published from private raw evidence.

Evidence is preserved outside temporary storage at `%LOCALAPPDATA%/KplexValidation/pr-173-2026-10-17/final-evidence/`. `MANIFEST.json` SHA-256: `8c5461f9f5b18f30de8a34df295fa2c458326ea303a0af10ec37017306efbd26`. All 749 listed files and the implementation patch were independently reread and verified for size/SHA-256 (750 entries total). The source snapshot is implementation commit `5e53eb6ac1f7dc48b9ef2a9f729a1536f8efac15`; it includes the exact final build and actual helper variants, failed controls and logs. Private configuration backups/local metadata are included: **do not publish this backup**. Originals remain untouched. Subsequent closeout edits change documentation only.

The prerequisite checkpoint's [CI passed](https://github.com/zsviczian/kplex/actions/runs/39021609835). The implementation checkpoint's [CI is running](https://github.com/zsviczian/kplex/actions/runs/39023891312) at closeout; that is not a final-head CI pass. Local final-source full verification is green, and all 20 native-runner contract tests plus native-tool syntax checks pass after tooling cleanup. PR/branch read-back confirms draft status.

Before acceptance: resolve the popout-close error and broader native-lane failures; validate physical desktop group drag/multi-monitor recovery; then full application interruption/restart and macOS/Linux/physical-tablet touch/orientation. Native Electron input and desktop emulation do not cover those device checks. Phone sidepanel remains ineligible. No release, branch deletion, automatic ready transition or merge is included.
