# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Online return — original SI4 acceptance complete; inactive handoff

All ten original Delivery 1/2 exits are accepted in the working tree on `indexing-optimization-v2`, based on `bf0b3582bb5e39e512d7f282f78393b999d9f6a1`. User authorization superseded the offline restriction: the online agent used Git, Node 22.22.2, installed dependencies, Chromium/IndexedDB and Obsidian CLI and corrected native-discovered defects. No commit/push/release, SI5 implementation or C15–C26 work was performed. Last committed accepted checkpoint remains SI4-R2 `831e345`.

Read [the final original-exit acceptance report](docs/validation/settings-independent-indexing-si4-acceptance-2026-10-03.md), [machine-readable evidence](docs/validation/settings-independent-indexing-si4-native-2026-10-03.json), [design checklist](docs/INDEX_SETTINGS_INDEPENDENCE_DESIGN.md#11-fixed-completion-plan) and the final action-log entry in [Refactor plan.md](Refactor%20plan.md). The earlier scoped R3 report remains historical and does not certify this final artifact.

## Completed and verified

- R3 linear validity, aggregate memory accounting and complete 20,015 independent-owner canonical GraphIndex publication are preserved. Final supported completion: 238,123 ms; sampled heap 571,454,211 bytes; combined retained reservation 719,667,320 bytes under 768 MiB; cancellation exposes no prefix.
- Online corrections cover warm head observations, bounded ordinary visible scope, attachments, publication retries, folder topology/navigation/counting/body reuse, canonical creation and late-unsaved retry ownership. Unused application global-discovery/cached-preparation wrappers are retired to explicit characterization fixtures. Stored-data compatibility remains intact; no schema/settings migration.
- Final `npm run verify:obsidian` passes: architecture 7, core 60, Node 133, UI 7, portable source 314, real-IDB browser 174, unchanged strict timing/oracles, official scanner with no warnings, actual TypeScript/build and native render/no-error smoke. Final TSDoc-only rebuild has identical artifacts.
- `main.js` SHA-256: `d8ae7df70ea58a25f39f21a6fa50a125e210a3e8bc15969b63b92c6f38d7a68b`. Final exact-build native 14-case settings/navigation runs pass in both small and 20,015-note vaults with six distinct owners, zero body/parser/acquisition/inventory/head/full-build work and unchanged ready source completion. The repeatable settings driver is `npm run verify:obsidian:si4` with explicit disposable-vault variables.
- Final native Markdown and attachment create/modify/rename/delete/recreate, dormant edit/activation, nested folder move/delete/recreate, real Date/Daily Notes drift and no-change idle pass. Known file work stays source-local; uncertain folder/configuration reconciliation reuses cached facts.
- Cleanup passes: all owned fixtures/controllers/wrappers/demand removed; original settings/throttling restored. Small vault temporary K-Plex installation removed, original enabled plugins restored and all 14 pre-test cache stores restored and compared. Large vault retains the final enabled build, 20,015 original Markdown files and an index-ready status.

## Next checkpoint and explicit limits

SI4 is complete in the working tree and ready for the authorized Git checkpoint. SI5 is the next scope, but has not started. Its original five acceptance boxes remain open. No new prerequisite/proof package is introduced.

Keep the failed large-restart observation visible: hydration watchdog triggered `full-rebuild:startup:partial-restore-incomplete`, then the renderer crashed with `EXC_BREAKPOINT`/`SIGTRAP` (termination code 5). Cause is not established; do not label it OOM. Final quiet valid-facts native checks passed after reopening only the disposable vault, but that does not accept startup/restart. SI5 must investigate startup/sync/interruption, cache/storage failure and explicit derived-data retirement, comparable named-hardware foreground latency/memory, main-window/popout and physical iPad/Android behavior. Functional tests temporarily disabled background throttling and restored it; no paint/mobile/release acceptance is inferred. No further original SI4 validation is pending.
