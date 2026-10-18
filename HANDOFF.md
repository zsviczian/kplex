# Standing instructions ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# PR182 implementing: live settings reconciliation

Maintainer authorized merging181 without waiting forCI, then182, then pause.
181 mergedmain c0cd100; existing182branch2026-10-18-live-settings-sync integrated
that main through8b0fdbd without rewriting and pushed. Keep182draft/no merge or
release; do not start141/147. No subagents/personal vault/comparative performance.
Only disposableSmall authorized native destination; foreground allowed.

Confirmed no onExternalSettingsChange callback and whole live-snapshot writes.
Implemented primary public callback (installed1.13 types, introduced1.5.7), detached
bounded reads/coalescing/unload guards, same settings disk queue and fresh preflight.
Root deltas are explicit; coherent appearance/library, hierarchy, actions and scalar
owners conflict by remote epoch. No recursive merge, schema or other sync backend.
Received snapshots update own migration/action/appearance owners without saving.
Captured data during accepted writes is retained and rebased by coherent domains.
Native declarative rows retain Obsidian's renderer; transient handler keys fence
stale scalar events. Public SettingTab.update verified in actual host: refreshes
current page/search. Theme same-ID changes invalidate activation; inactive metadata
preserves active drafts. Real semantic effects use existing index owner; no mixed
presentation fallback. Foreground workspace/navigation not replayed. Three new
feedback strings translated all8locales.

Checkpoint evidence:12 deterministic Chromium tests through actual plugin methods
pass. Includes two instances/both directions/noecho, sameID/A-B-A, held reads/writes,
queued undo, failed storage/future containers, slow refresh, stale actions/scalars,
startup before consumers and no unhandled event-save refusal. Earlier97affected
appearance/action tests and33sync/localization passed before final startup guards.
Real build/installed types pass (kplex-182-checkpoint-build.log). Lint first found
four unsafe array member accesses; narrowed unknown containers, nextlint passes.
Full verify and actual native external-file callback delivery are STILL PENDING.

Next: reusable exact native external-file lane onSmall, all settings/index regression
checks, final review/report/marker removal, committed/pushed checkpoints and pause.
Do not claim minimum-host/macOS-Windows Sync/physical-device acceptance from Windows
or controlled two-instance harness. Keep raw evidence private, preserve original
configuration/workspace/fixtures and HANDOFF standing header. No active native
controller; browser tests drained. InstalledSmall remains prior181build untilstage.
