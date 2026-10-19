# Modifier hover highlighting — PR #170

PR #158 was merged with maintainer approval at `b9d3527`. Local `main` was fetched/fast-forwarded before creating `2026-10-16-alt-hover-highlight`. Runtime implementation: `a16719e21efe89ed798ec0a712f4d6b9df53d591`. No release or merge of #170.

## Requested rerun on kplex-test-small

The original runtime/artifacts remain unchanged. **Touch acceptance now passes. Gate setup is corrected; all five gate/filter display cases pass, but the strict no-source-work assertion still fails. Keep PR #170 draft.**

- Retried the original gate driver: same partial2/13-file setup cancellation, with complete fixture cleanup. The readable `GraphIndex.get()` facade could return a prepared foreground page absent from the canonical patch state. Three owned notes demonstrate `readableBefore=true` / `canonicalBefore=false`. Setup now unconditionally calls the existing idempotent `insertCreatedFile()` owner and verifies all exact canonical file identities. It does not force a build, change runtime behavior or relax any gate/resource assertion.
- The original touch retry passed reload readiness but stopped on its explicit debugger-owner guard. The vault's CLI console-capture debugger was already attached; DevTools was closed and no other test controller existed. Releasing that idle CLI attachment with the installed `dev:debug off` command allows the **unchanged touch driver** to pass8 trusted touch-range cases, saved-value reload, pane geometry and all cleanup/restoration checks. Earlier reload-readiness failures were not reproduced; their cause is not retroactively established.
- Two runs with corrected gate setup pass Keep/Reflow × cross-links on/off and clear-filter display expectations. Both then fail the unchanged source/revision assertion on clearing the filter: source revision stays fixed, semantic revision advances by1, and acquisition `checked` advances by1. Fresh reads/parses, rebuild calls, body reads and requested-neighborhood/degree/pair preparation calls stay0. This proves extra validation/publication activity, not a full rebuild or incorrect gate display. Whether it is necessary On-demand readmission or redundant work remains unproven; no production change or weakened assertion is included.
- Node22.22.2 `node --test tests/obsidian-runner.test.mjs` passes20 tests, including a regression that executes the actual gate binding block with a foreground-only readable page. Both native drivers pass syntax checks; diff checks pass. The existing full2,003-test/CI evidence remains tied to the unchanged runtime; this is a native-harness/test/documentation change.
- Final restoration passes loaded desktop/106 files, exact runtime settings, original layout/bounds, four configuration files byte for byte, no owned notes/controllers, unchanged artifact hashes and the original CLI debugger state. The test-owned debugger is released; the pre-existing CLI capture is explicitly restored.

New evidence is local and unpublished at `%LOCALAPPDATA%/kplex-validation/pr-170/retest-2026-10-16/`:29 checksum-verified files, exact drivers, unchanged-failure controls, two corrected-setup runs, original-module source trace and the harness patch. `SOURCE-RECEIPT.json` SHA-256 `f8f7af6b46e763ba5c21abacb40bdbdbb6cce5f8d30bc41aa4a87f7e4db314fc`. Private pre-test configuration/runtime snapshots remain in `%TEMP%/kplex-170-retest/private-*`; touch reports containing baseline settings are marked private in the manifest. Previous evidence remains unchanged.

## Behavior and ownership

**Settings → K-Plex → Plex behavior → Navigation & interaction → Require modifier for hover highlighting** is off by default. Off retains the existing 750 ms delay. On requires the localized alternate modifier (Alt on Windows, Option on macOS) and activates immediately, including pressing the key while already hovering. Releasing it or leaving clears the hover highlight. Nodes, gates and connectors share one surface-owned `HoverHighlight` owner. Window blur, document hiding, navigation, policy change and teardown cancel pending activation. Drag-owned highlights, touch gestures, keyboard selection, previews and evidence tooltips keep their own owners.

The Boolean is a global workflow preference, outside themes and semantic/presentation policy inventories. Strict migration defaults malformed/missing values to false; restart preserves true and foreign appearance imports cannot change it. The existing settings writer and ordinary presentation notification update visible views. No new scheduler, classifier, index policy, CSS, dependency, manifest or note-writing path. All eight locales use the existing environment-aware shortcut formatter.

## Actual validation

Windows 10.0.26200; Node22.22.2; Obsidian1.14.4 / installer1.14.0. Only the authorized disposable `C:/Obsidian/kplex-test-small` was used, baseline106 files.

| Check | Result |
| --- | --- |
| `node scripts/testing/obsidian/verify.mjs` / strict `verify:obsidian` | Pass:2,003 tests (7 architecture,128 core,880 general,125 UI,334 source,529 source-browser), no failures/skips/cancellations; official lint, installed Obsidian types, real production build and exact-build native smoke |
| Focused checks |36 localization/typography/hover and70 migration/hover pass; included in the full run |
| CI at `a16719e` |[Verify passed](https://github.com/zsviczian/kplex/actions/runs/38911615521/job/117008585519) |
| `node scripts/testing/obsidian/hoverHighlight.mjs` |7 cases pass with actual Settings navigation/toggle/durable on-off saves and trusted native input: node/gate/connector in main and popout, stationary press/release, modifier held on entry, leave cancellation, and restored default delayed hover |
| Work in tested Settings/hover intervals |0 Vault reads/cached reads, parses, acquisitions, semantic refreshes and search rebuilds. Separately recorded popout setup also0. These are operation counts, not CPU/allocation benchmarks |
| Final restoration |Loaded desktop plugin,106 files, no owned notes/controllers, original settings keys match and all four pre-staging configuration files restored byte for byte; validated artifacts retained; late workspace autosave followed by final byte restoration |

Native8 and the final restoration match strict verification's artifacts: `main.js` SHA-256 `d59587875f14614c4d579e49033743d6f2a4f251acae1b1d7a14281d4931b200`; CSS `c2e1338506d26072552539de355c34dfb07641a3fc22863934cef014e085c3d6`; manifest `19d9ecce5557733e0ff0f2e27155e635c30158c3cfa6fbca0f11c16e4dedfd2c`. The full invocation began before the checkpoint commit and records base `b9d3527`/dirty; the source receipt verifies canonical runtime bytes against `a16719e`. Later changes affect only the native probe and documentation.

## Failed controls and acceptance gaps

- Initial full verification hit an existing menu test's Chromium page-loading timeout before its assertions. An unchanged focused retry and complete full rerun pass.
- Native1–4 exposed the probe's redundant refocusing immediately before key delivery, which correctly cleared the hover candidate through blur. Native5 selected a semantically connected gate whose connections were hidden; the final fixture explicitly tests its visible left connector. Native6 started popout navigation before the view's existing readiness promise. Native7 passes all functional cases but fails diagnostic-listener cleanup after closing its popout. Scoped recovery restores106 files; the final probe releases listeners before closing their owner and Native8 passes cleanup. Temporary React-state inspection is removed.
- A capture-listener experiment did not fix the probe failure and was reverted. Its exact patch and receipts remain local. Production stays at `a16719e`.
- **Initial broader native touch lane: failed; superseded by the successful rerun above.** Desktop mobile-emulation transitions left K-Plex disabled; readiness timed out before any touch case, and automatic reload/layout/debugger-restoration assertions failed. The same artifact was explicitly re-enabled; desktop settings/layout and original configuration subsequently restore. No runtime load error was captured. The cause is unproven; this is not physical-mobile acceptance.
- **Initial broader native gate lane: setup failure; corrected setup and remaining resource failure are recorded above.** Both attempts stop during direct fixture-patch preparation before gate assertions: a partial patch cancels while index generation advances, without observed source/policy/metadata changes. The second attempt follows startup completion; its cause remains unproven. Both remove their owned fixture folders/leaves and restore settings. No semantic-engine or driver assertion change is included to hide this failure.

Keep #170 draft while the remaining gate no-source-work assertion is investigated or explicitly accepted. macOS Option/menu/popout and physical mobile touch/hardware-keyboard behavior also remain separate acceptance. Do not infer these passes from desktop emulation or portable tests.

## Reproduction and evidence

Follow CONTRIBUTING's explicit small-vault identity variables, run `npm run verify:obsidian`, then serially `npm run verify:obsidian:hover-highlight`, `npm run verify:obsidian:interaction-touch` and `npm run verify:obsidian:interaction-gates`, each with a fresh report directory. The hover driver owns only `__kplex_hover_A.md` / `__kplex_hover_B.md`, rejects collisions, verifies installed artifact hashes and restores settings, workspace and configuration.

Raw logs, all eight hover trials and their exact drivers, failed broader lanes, recoveries, reverted experiment, source receipt and checksums are preserved locally at `%LOCALAPPDATA%/kplex-validation/pr-170/alt-hover-2026-10-16/` (58 verified files; `MANIFEST.json`). `SOURCE-RECEIPT.json` SHA-256: `e1b361d0bce88497acdf32ea678e6c27b427b5ccc3b48879198574259df732bb`. Original `%TEMP%/kplex-alt-hover-*` receipts remain. Private pre-staging configuration backups stay separate at `%TEMP%/kplex-alt-hover-baseline`; the raw touch report also contains a configuration baseline and is marked private in the manifest. Nothing has been archived publicly or uploaded.
