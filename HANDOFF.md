# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Online SI5 result — minimal correction implemented and retested

## Scope and checkpoint

Pre-instrumentation implementation checkpoint **`62c728393440aa3dfb57869ece83c4060092bcba`** remains HEAD. Diagnostics/progress and the maintainer-authorized minimal correction are uncommitted. No push/release or further optimization. C15–C26 remain paused; explicit online Git/CLI/development authorization overrides standing offline restrictions.

Existing extreme-vault cold behavior is accepted. The 20k-contributor hub `decode-budget` result is a known stress limit outside the critical path. No projection redesign, new database/cache/architecture, memory increase or further cold optimization. Physical iPad/Android and final SI5 audit remain pending.

## Implemented, measured and validated

[Exact correction, phase timings, counts, commands, CLI limitations and next candidates](docs/validation/settings-independent-indexing-si5-minimal-warm-correction-2026-10-04.md); [machine-readable results](docs/validation/settings-independent-indexing-si5-minimal-warm-correction-2026-10-04.json). The [original measurement report](docs/validation/settings-independent-indexing-si5-warm-start-2026-10-04.md) remains historical baseline evidence.

`upgradeRestartLocalDependencies()` is removed; its work is merged into `reconcileRestartHostInventory()` using the existing top-level inspection. Missing-MetadataCache owners still upgrade, all upgrades precede deferred resolution fan-out, cancellation and pending progress are preserved, and the later freshness reconciliation is unchanged.

Installed build **`3a8e2110…`** passes three native foreground restarts: **80,137.3 / 83,119.2 / 78,468.6 ms**, median **80,137.3 ms** versus earlier three-run median **82,804.9 ms**. Ranges overlap and the separate prior pilot was faster; no reliable causal latency improvement is established. The exact reduction is **five owner walks → four**, inspections **100,075 → 80,060**, source-head point reads **120,126 → 100,111**. Every remaining loop visits the same 20,015 owners. All source read/parse/reacquisition/repair/rewrite/full-build counters stay zero. Dependency checks remain 40,030; source correctness/authentication is not skipped.

Merged dependency/host phase takes 57.864–60.116 seconds; later source reconciliation 12.298–16.566 seconds; post-requested hydration 5.208–5.974 seconds. Native foreground samples 82/82, 85/85, 80/80 all valid; normal throttling remains on. Original source-head digests/settings/enablement are unchanged and byte restoration passes. Fresh backup `/private/tmp/kplex-si5-minimal-before-2026-10-04`; candidate stays installed in disposable kplex-test. No personal-vault changes.

Full verify passes architecture 7/core 62/Node 138/UI 7/portable 317/browser **194**, installed Obsidian types and production build. Two new browser tests protect legacy-owner upgrades before fan-out with missing metadata, and cancellation during dependency await. Existing offline alias/path/create/delete/recreate, corruption, repair/process-restart and storage cases pass. Final affected indexing/lint checks pass. Do not repeat unchanged expensive browser tests merely to accumulate passes.

## Additional opportunities — not implemented

1. **Smallest next:** reuse the clean no-repair local-dependency selection inside `ensureLocalDependencies()`. Direct counters confirm **80,060 selections for 40,030 checks**, reading owner/repair/state twice per check. Retain rereads after actual repairs, exact source-head/sequence, pending journals and concurrency/cancellation fences. Potentially remove 40,030 readonly selections/120,090 requests; actual time saving is unmeasured.
2. **Largest request-count candidate:** existing metadata-family batches issue **484,178 posting point reads**. Bounded contiguous key-range reads could reduce requests while checking every posting/length/order/digest/frame and retaining original leases/budgets. Require corruption/cleanup/head-replacement race tests, then exact-build warm measurements; no schema/framework.
3. **Measure before scheduling changes:** host-family validation issues **20,015 repository yields**. Count is confirmed; timer wait cost is not. Investigate exclusive scheduling delay before considering cooperative elapsed budgets. Preserve responsiveness/mobile/cancellation/progress; do not remove yields blindly.

Do not infer that unchanged file mtime grants dependency authority. `mtime`/size/ctime are already used for physical reuse. Dependency ownership checks source revision/sequence/version and repairs; other-file resolution changes can revise source facts without changing this note's mtime. Missing/corrupt/stale derivatives also cannot be authenticated by filesystem timestamps.

## CLI strategy and actual limitation

Retained `main.ts.getStartupDiagnostics()` remains readable after CLI exit, with **21 frozen phases, zero private owner sets**, no controller/opt-in. Completed milestones are historical; restoring the original Reference-center settings can leave live status updating on the excluded hub.

During staging, `plugin:disable` lost its response and default SIGTERM did not end the waiting client. Only that CLI client was killed; fresh bounded eval confirmed the native disable had finished before candidate copying. Retried staging with SIGKILL-bounded calls/presence check passed. Obsidian was not restarted or its native work cancelled. No lost read occurred inside measured restarts. Driver uses 30-second CLI cap, five-second polls/ten-second reconnect, no outer readiness deadline; production watchdog unchanged. Initial submission/cleanup still require responsive CLI. Next correction requires maintainer review of these measured candidates; physical devices and final SI5 acceptance remain open.
