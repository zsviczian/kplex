# Settings-independent indexing — final acceptance, 2026-10-04

## Outcome and attribution

**SI0–SI5 are accepted and complete.** The maintainer reports: “I have tested on ipad and android, both version passed successfully,” then explicitly requests closure and a PR after the startup wording update. This closes the physical-device gate on maintainer acceptance. PR merge and release are separate actions. C15–C26 remain paused; no further performance or architectural work is queued.

| Acceptance area | Result and evidence |
| --- | --- |
| SI4 settings independence and routine maintenance | Accepted at `323b260127e4fb81e1d3697d4ee8b0282f8cdb12`; all ten original delivery exits. [Exact SI4 evidence](settings-independent-indexing-si4-acceptance-2026-10-03.md). |
| SI5 source-first restart, optional graph recovery, source-local repair, search vocabulary and lifetime | Accepted desktop implementation/regressions and separately identified native scenarios in the [caller/retirement audit](settings-independent-indexing-si5-closeout-audit-2026-10-04.md). |
| Bounded warm investigation, truthful progress and narrow corrections | Completed. [Final candidate/control measurements](settings-independent-indexing-si5-merged-selection-2026-10-04.md) and [106 aggregate assertions](settings-independent-indexing-si5-merged-selection-2026-10-04.json) remain unchanged. |
| Physical iPad | Passed, reported by the maintainer on 2026-10-04. |
| Physical Android | Passed, reported by the maintainer on 2026-10-04. |
| Current settings dispatch and retirement | Audited: valid-fact settings changes do not schedule acquisition/full graph rebuilds; production progressive full-graph writer and superseded acquisition entry points retired. Historical readers/stores/shared contracts and characterization code deliberately retained. |

No device model/OS/Obsidian version, independently verified installed hash, fixture, individual workflow results, numerical latency/memory, diagnostic output or recordings accompanied the device report. These details remain unmeasured/not supplied; the qualitative pass does not establish numerical device targets, fault-injection coverage or exact on-device artifact identity. [The device checklist](settings-independent-indexing-si5-device-checklist.md) preserves the historical procedure and handed-off candidate hashes. No repeat manual device test is required for the following wording-only change.

## Final startup copy

Source parent: `e46dd845db330420ef24fd732ca27a98279b6805`, on `indexing-optimization-v2`. Final runtime changes affect catalog values only; existing indexing test labels follow those values. All eight catalogs (English, German, Spanish, French, Japanese, Dutch, Russian and Traditional Chinese) retain stable keys and interpolation parameters. Source acquisition, repository, publication, scheduling, progress counters and phase boundaries are unchanged.

| Previous English copy | Accepted copy |
| --- | --- |
| Loading index from cache | Restoring saved graph |
| Checking note metadata | Validating note metadata |
| Checking cached notes | Verifying cached notes |
| Rechecking cached notes | Processing pending changes |
| Validating dependency inventory | Finalizing note dependencies |
| Checking reference resolution | Finalizing link resolution |
| Preparing requested Plex semantics | Applying current ontology & settings |
| Loading cached nodes | Loading cached nodes |
| Loading cached relationships | Loading cached relationships |
| Preparing search | Preparing search |
| Loading relationship evidence | Loading relationship evidence |
| Publishing the index | Publishing full graph |

The cache fallback key retains the existing status prefix: `Status: restoring saved graph`. Per-note phases still use real `{processed} / {total}` and percentage; record-only phases still show actual activity counts. Counts are monotonic within each pass. Pending-change processing names a repeated reconciliation pass, without changing its authority checks.

## Final copy-build validation

[Machine-readable exact-build evidence](settings-independent-indexing-si5-acceptance-2026-10-04.json) includes source input hashes, both supplemental attempts, cleanup and raw report/log/probe hashes. Runtime/test inputs were verified in the working tree on parent `e46dd84` and remain unchanged at commit; subsequent edits only finish acceptance documentation.

Commands actually completed, with Node `22.22.2` selected through `PATH=/Users/zsviczian/.local/share/fnm/node-versions/v22.22.2/installation/bin:$PATH`:

```bash
node --test tests/localization.test.mjs tests/startup-diagnostics.test.mjs
node scripts/run-indexing-tests.mjs
KPLEX_TEST_VAULT_NAME=kplex-test \
KPLEX_TEST_VAULT_PATH=/Users/zsviczian/Obsidian/kplex-test \
KPLEX_TEST_CONFIG_DIR=/Users/zsviczian/Obsidian/kplex-test/.obsidian \
KPLEX_HOST_REPORT_DIR=/private/tmp/kplex-si5-wording-verification-2026-10-04 \
npm run verify:obsidian
node /private/tmp/kplex-si5-wording-final-smoke.mjs
node /private/tmp/kplex-si5-wording-normal-restart.mjs
obsidian vault=kplex-test dev:errors
```

| Command / lane | Actual result |
| --- | --- |
| Focused localization/startup | 21/21 pass. All eight catalogs/parameters/fallbacks, privacy and phase/pass behavior remain valid. |
| Indexing runner | Existing indexing/cache/creation/relationship scenarios and all 24 production settings-independence scenarios pass. |
| `verify:obsidian`, including full `verify` | Pass: architecture 7, core 62, Node 144, UI 7, portable-source 317, real IndexedDB browser 202; no failed/skipped tests, no lint warnings. Actual installed Obsidian types and production build pass. Counts are per lane, with overlapping coverage rather than unique-test totals. |
| Required exact-build native runner | Pass: registered canonical start command, rendered K-Plex DOM and no captured JavaScript errors. Report interval 10:29:06.646–10:39:39.911 UTC; DOM assertion 204 ms is not paint, usability or strict-ready latency. |
| First supplemental smoke | **Failed**, retained. It changed the saved center after an existing view was opened, did not certify the actual expected center before readiness acceptance, and observed hydration `timed-out`, `fullBuilds: 1`, absent expected center and then strict-ready. Source counters were zero; cleanup passed. It is not a zero-build restart pass. The watchdog cause was not independently isolated. |
| Corrected supplemental normal restart | **Pass**, same artifacts: select representative `Welcome.md` before matched native disable/enable, wait for its actual DOM center and strict-ready. All source counters and full builds zero, one rendered app, current command, diagnostics disabled, zero private owner sets. Loaded plugin returns all eight requested English messages. Both lanes complete; cumulative semantic `pending: 1` is an event count, not current non-ready state. |
| Cleanup / final errors | No CLI reconnects in supplemental attempts, no errors captured afterward, temporary controllers and diagnostic opt-in absent. `data.json` and `community-plugins.json` byte-identical to pre-verification backup. Only disposable test artifacts/configuration used. |

The successful controlled restart is functional evidence; it does not explain the preceding watchdog outcome or establish a new speedup. No production correction followed these checks. The final native report’s strict-ready state precedes restoration of the original saved synthetic center; it is historical test evidence, not a claim of current readiness for that excluded center.

| Final artifact | SHA-256 (built and installed bytes match) |
| --- | --- |
| `main.js` | `40e03413e32020ee855c712b8df2a2170ee20f6ed6627b62b34f9f501d2754a6` |
| `manifest.json` | `e3bb9a35215af97f6a3394cf7fc8f7d2142bae06de94bb112fef5a05819cda62` |
| `styles.css` | `e9da76ff7840cea44b77912963977f1fe2ab762b69a9853d047712d7b3270494` |

Raw full log `/private/tmp/kplex-si5-wording-verify.log`; required report `/private/tmp/kplex-si5-wording-verification-2026-10-04/report.json`; supplemental reports `/private/tmp/kplex-si5-wording-final-smoke.json` (failed) and `/private/tmp/kplex-si5-wording-normal-restart.json` (passed). Fresh pre-verification plugin/config backup: `/private/tmp/kplex-si5-wording-before-2026-10-04`. Native Obsidian 1.14.4 (installer 1.14.0), Darwin 23.5.0. No timing performance claim is attached to this wording-only build.

## Retained scope and measurement limits

The pre-instrumentation implementation is preserved independently at `62c728393440aa3dfb57869ece83c4060092bcba`; the last narrow transaction correction is `9d8b5c9cb3e5fd7e42edc7d3a65684eda241ee5e`. The handed-off pre-copy `main.js` hash is `094b520cb267567086fab211b460fd05b7bd02eb1d3f196a736688426b8cec89`. Its device-candidate record is not relabeled as a physical test of the new catalog build.

Final measured candidate warm plugin restarts were 70.346 / 68.258 / 80.791 seconds (median 70.346), with same-UX controls 67.339 / 72.540 / 69.144 (median 69.144); the earlier wait-attribution median was 64.592. **No overall warm-restart speedup demonstrated.** Verified transaction boundaries fall by 40,030 and reconciliation measured 7.028–7.945 versus 9.017–9.611 seconds. All 100,111 head reads, 40,030 dependency checks, four owner walks and freshness/lease/family checks remain. Sequential, overlapping runs and unisolated observer overhead do not establish causality; desktop DOM/timers/JS heap do not prove actual paint, touch or device peak memory. Copy changes were not rebenchmarked as a performance optimization.

Extreme synthetic cold behavior is accepted. The ~20k-contributor hub `decode-budget` outcome and separate high-node stress profile remain documented limits outside the SI5 critical path. No larger memory caps, bounded canonical projection redesign, new cache/database/framework, scheduler change or additional cold optimization is part of this closeout.

Native long work remains in a deferred renderer-owned controller, with short CLI progress/completion polls. Individual CLI commands can time out or disconnect while Obsidian continues; a lost read alone does not prove a production fault. The prior measured lane used 30-second individual CLI caps, five-second polls and ten-second reconnect waits, with no outer readiness deadline; production watchdogs remained unchanged. Exact test-window foreground and normal throttling matter for timings. The final desktop copy smoke is a functional check, not a new performance baseline. Only the explicitly configured disposable `kplex-test` vault is used; no personal vault is opened or read.

## Manual checks and completion

No further manual test is required for this copy-only closeout. Maintainer device passes, automated/native checks and the final audit close the delivery checkboxes. Any newly reported regression receives a scoped issue; acceptance does not erase historical failures or imply merge/release approval.
