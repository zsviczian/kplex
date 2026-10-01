# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Offline correction — Delivery 1 native scale failure

Do not start Delivery 2. Correct the Delivery 1 contributor-catalog scale failure found in the exact-build `kplex-test` vault.

## Reproduced failure

- The graph snapshot restored and all 20,015 settings-neutral source heads became active.
- Source acquisition used cached bodies: 0 Markdown reads, 0 parses, 0 repairs and 0 failures.
- `bootstrapContributorCatalog()` still returned `pending` / `decode-budget`; no catalog became current.
- Toggling and restoring `inverseInfer` through `saveSettings()` performed no full build or source work, but both requests remained `dependency-pending`; K-Plex stayed in **updating**.
- The original setting was restored. Exact-build `verify:obsidian` and all portable/browser/build checks had passed before this runtime scenario.

## Required correction

1. Add a deterministic large-catalog regression that reproduces the native `decode-budget` result using realistic source, host-fact, bucket/page and host-order cardinality. Identify which active-root field exceeds the bound.
2. Keep the active dependency root bounded by moving or compacting the oversized manifest data behind authenticated pages/rows already owned by the contributor store. Do not solve this by raising an arbitrary byte cap, dropping facts/order, replaying every source at settings time, or adding another graph.
3. Preserve v2/v3/v4 reads, atomic activation, previous-root survival on failure, corruption rejection and storage cleanup. Add real IndexedDB reopen/abort/corruption coverage for any persisted representation change.
4. After the final source activation, complete catalog bootstrap once and retry pending current-policy scopes automatically. A failed build must not cause an unbounded retry loop; expose the aggregate terminal reason in diagnostics.
5. Prove a settings toggle and restoration publish the current requested scope with 0 Markdown reads, 0 parses, 0 source reacquisitions and 0 full builds after the large catalog is ready.

Keep C15–C26 and Delivery 2 out of scope. Return the implementation and actual focused/source/browser/core/lint/build results uncommitted for online review and native rerun.
