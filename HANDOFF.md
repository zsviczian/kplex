# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Online SI5 result — desktop closeout; physical devices pending

## Independent checkpoints and authorization

SI4 accepted `323b260127e4fb81e1d3697d4ee8b0282f8cdb12`; pre-instrumentation SI5 implementation `62c728393440aa3dfb57869ece83c4060092bcba`; posting batching `ea41d4b4484b9957d8700cf44920809912ca1ee4`; wait attribution `0f58ea606dbd406f0b100f49c7374d470027c039`; progress/retry labels `b48643c62fb5a21d105f6f5db38c4025223ca785`; final narrow correction **`9d8b5c9cb3e5fd7e42edc7d3a65684eda241ee5e`**. The implementation was committed independently before the final closeout documentation checkpoint (use `git log -1` for that documentation SHA). Online CLI/Git/development authority applies. No push/release; C15–C26 remain paused.

## Implemented and actually validated

[Exact timings/counters/commands/CLI limitations](docs/validation/settings-independent-indexing-si5-merged-selection-2026-10-04.md), [aggregate evidence](docs/validation/settings-independent-indexing-si5-merged-selection-2026-10-04.json), and [final settings-route/retirement audit](docs/validation/settings-independent-indexing-si5-closeout-audit-2026-10-04.md).

Clean dependency verification reads state/owner/repair/head atomically, removes 40,030 readonly boundaries per clean 20,015-owner restart. Memory/unsaved/deletion masking, post-await durable activation, malformed heads, owner revision/sequence/version, repair/upgrade/cancellation/unload/storage and final freshness checks remain. Inspections 80,060→40,030, head gets 100,111 unchanged, dependency checks/selections 40,030, four complete owner walks preserved.

Focused 29/29; full verify architecture 7/core 62/Node 144/UI 7/portable 317/browser 202, 24 production settings scenarios, official lint and actual build/types pass. Six serial foreground plugin-restart runs, zero source reads/parses/reacquisitions/repairs/rewrites/full builds, unchanged head digests/settings, no CLI reconnects. **106 evidence checks** pass. Final matched staging and normal-production smoke with opt-in absent: strict-ready, one app/current center/canonical command, no captured JS errors, private owners 0, all controllers/opt-in removed. Original settings/community enablement byte-identical after all runs; source/test blobs match committed inputs. Restore of the original excluded synthetic center leaves live status updating; historical strict-ready is not current authority.

Candidate 70.346/68.258/80.791 seconds, median 70.346; prior-build same-UX controls 67.339/72.540/69.144, median 69.144; earlier wait baseline 64.592. **No overall speedup demonstrated** (candidate 1.202 seconds higher than current control; sequential overlapping ranges, observer overhead unisolated). Reconciliation 7.028–7.945 versus 9.017–9.611; retain verified narrow atomic work reduction without claiming lower total latency. Remaining host validation/family authentication and variable hydration are measured, not inferred from total time. No further automatic optimization.

## Frozen device candidate

| Artifact | SHA-256 |
| --- | --- |
| `main.js` | `094b520cb267567086fab211b460fd05b7bd02eb1d3f196a736688426b8cec89` |
| `manifest.json` | `e3bb9a35215af97f6a3394cf7fc8f7d2142bae06de94bb112fef5a05819cda62` |
| `styles.css` | `e9da76ff7840cea44b77912963977f1fe2ab762b69a9853d047712d7b3270494` |

Final `dist/` and disposable kplex-test installed bytes match. Frozen device archive `/private/tmp/kplex-si5-device-candidate-9d8b5c9.zip` contains the exact three artifacts (ZIP SHA-256 `b8416760417a4ecf7c2c7742e5bc5c7b1fb2f8117ed3a120f400c48b2a1de197`). Fresh prior-artifact/config backup `/private/tmp/kplex-si5-merged-selection-before-2026-10-04`; candidate and control raw directories `/private/tmp/kplex-si5-merged-selection-warm-2026-10-04` and `/private/tmp/kplex-si5-merged-selection-control-2026-10-04`. Final smoke/staging/logs `/private/tmp/kplex-si5-merged-selection-*`. Only disposable vault touched. No personal vault opened/read.

Native tasks run independently and retain aggregate progress/completion. Individual CLI 30s, polls 5s, reconnect 10s, no outer readiness deadline, production watchdog unchanged. Exact test window foregrounded before every setup/reload/preflight/timed run with normal throttling; no concurrent browser/native workload. Matched native disable/enable avoids CLI configured-enabled-but-instance-absent staging state. No lost-read fault-injection proof; actual reconnects 0. Standard synchronous generic wrapper not rerun; actual full verification and applicable native assertions/commands are explicitly recorded. Historical native fault/popout artifacts remain separately identified in audit.

## Remaining task — maintainer physical validation

**SI5 remains open for physical iPad and Android outcomes**, using the [frozen checklist](docs/validation/settings-independent-indexing-si5-device-checklist.md): real settings/navigation latency and touch, suspension/termination/sync/reopen, dormant-field edit/replay, correct current-policy gates/provenance/search/edit eligibility and reusable source progress. Copy the three exact artifacts together; matching version alone is insufficient. Use a disposable device vault and return pass/fail/unmeasured per workflow with model/OS/Obsidian/build/fixture/diagnostics/video. Missing or failed required outcome remains open; desktop DOM/timers/heap or emulation is not physical paint/touch/memory evidence.

Desktop implementation/regression/truthful-progress/warm-attribution and final audit exits are complete. Extreme cold is accepted; synthetic 20k hub decode-budget and separate high-node profile excluded. Do not reopen architecture, dense-hub/projection/database/cache/memory/cold redesign or add a new automatic optimization gate. Once required device outcomes pass, record exact evidence and close the two aggregate SI5 acceptance checkboxes. Any device failure receives its smallest scoped correction with affected validation before changing this frozen build. No release acceptance yet.
