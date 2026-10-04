# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Online SI5 result — clean dependency-selection reuse validated

## Scope and independent checkpoints

Pre-instrumentation implementation is committed at `62c728393440aa3dfb57869ece83c4060092bcba`. Diagnostics, truthful progress and the first owner-loop correction were committed **before this edit** at **`8cd10b7d6746d607f8214ad192670a0b9a370778`**. The following selection-reuse correction is independently validated and forms the next checkpoint; its measurements were taken on that parent's uncommitted candidate. Resolve the resulting commit with `git log -1`; no push/release. Explicit online Git/CLI/development authority overrides standing offline restrictions. C15–C26 remain paused.

Existing extreme-vault cold behavior is accepted; the 20k-contributor hub `decode-budget` result remains a known stress limit outside the critical path. No projection redesign, new database/cache/architecture, memory increase or cold optimization. SI5 is open; physical iPad/Android and final retirement/settings-route/evidence audit remain pending.

## Implemented and measured

[Exact correction, all phase timings/counters/commands/limitations](docs/validation/settings-independent-indexing-si5-clean-selection-2026-10-04.md); [machine-readable evidence](docs/validation/settings-independent-indexing-si5-clean-selection-2026-10-04.json). [Immediate committed baseline](docs/validation/settings-independent-indexing-si5-minimal-warm-correction-2026-10-04.md) and [original attribution](docs/validation/settings-independent-indexing-si5-warm-start-2026-10-04.md) remain historical.

`ensureLocalDependencies()` reuses the clean local owner/repair/state selection. Actual repair still uses unchanged settlement and a fresh selection; legacy upgrade also retains its reread. Existing source-head revision/sequence, order/version, cancellation and final authority/freshness fences remain. Other settlement callers are unchanged. Repair paths may do one extra selection; clean paths do one fewer. No state is cached between owners or sessions.

Installed `main.js` SHA-256 **`b79dc7839fa9d0b94768858b75a1a55285681c8978d6279a2599d054bf492364`** passes three foreground restarts at **82,149.4 / 81,286.0 / 84,857.4 ms**, median **82,149.4 ms**, versus immediate baseline median **80,137.3 ms**. Observed median is **2,012.1 ms higher**; overlapping sequential series do not establish causal regression or improvement. **Do not claim a warm-start speedup or performance acceptance.**

Exact work reduction: selections **80,060 → 40,030**, clean settlements **40,030 → 0**, **120,090 fewer IDB reads**. Dependency checks 40,030, inspections 80,060, head reads 100,111, posting reads 484,199 and repository yields 20,027 remain. Four owner walks each visit the same 20,015 notes. Merged dependency/host phase is **64.191–66.057 seconds**; reconciliation **8.957–9.260 seconds**; post-requested hydration **6.288–8.363 seconds**. Timer, posting I/O and GC costs are not exclusively attributed. All source reads/parses/reacquisitions/repairs/rewrites/full builds stay zero.

Full `npm run verify` passes architecture 7/core 62/Node 138/UI 7/portable 317/browser **196**, actual installed Obsidian types and production build. New real-IDB tests cover one clean selection with retained head checking and production head replacement between selection/inspection. Existing repair/process-restart, legacy upgrade, corruption, cancellation and offline resolution tests pass. Do not repeat unchanged expensive tests merely to accumulate passes.

Native foreground samples **84/84, 83/83, 86/86** all pass with normal throttling. Source-head digests and original settings/enablement bytes remain unchanged; wrappers/controllers/opt-in are removed, private owner sets released, 21-phase trace frozen and readable after CLI exit. Restoring the original Reference-center can leave live status updating on the excluded hub; historical strict-ready callbacks remain valid. Fresh backup: `/private/tmp/kplex-si5-clean-selection-before-2026-10-04`. Exact build remains installed only in disposable kplex-test; no personal-vault changes.

## CLI strategy and actual limitation

Initial staging mixed native `disablePlugin()` and CLI `plugin:enable`, which reported “already enabled” while the loaded instance was absent. Configured enablement is distinct from loaded-instance state; this was not a startup timeout. Retry with matched native disable/enable tasks retained in memory, bounded status reads and actual instance checks passed. Original configuration remained byte-identical, staging controllers were removed; no app restart or reset.

The native driver retains autonomous tasks and results. Individual CLI reads are capped at 30 seconds, poll every five seconds/reconnect after ten seconds, with no outer readiness deadline or production-watchdog change. No read loss occurred in the three measured runs. Submission/cleanup still require responsive CLI.

## Next opportunities — not implemented

The largest measured request count is **484,178 host-metadata posting point reads**. A separately scoped candidate could use bounded contiguous range reads within the existing family reader, preserving every posting/length/order/digest/frame, head/lease, byte/record and cancellation check. **No posting or scheduling change is implemented here.** The exclusive wait cost of 20,015 metadata-family yields remains unmeasured; do not remove yields blindly or infer they explain the timing shift.

Commit each independently validated correction before adding another behavior change. The prior checkpoint protects the first fix; this checkpoint records exact read savings and lack of latency gain. Physical devices and final SI5 audit remain separate. Unchanged `mtime` already permits physical input reuse but does not authenticate derivatives or other-file resolution changes.
