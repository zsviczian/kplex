# Standing instructions ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# PR182 validation checkpoint

181 is merged as c0cd100; branch2026-10-18-live-settings-sync includes main
through8b0fdbd, then runtime checkpointc0f10e9. Maintainer: finish182 then pause;
keep draft, do not merge/release/start141 or147. No personal vault, subagents or
comparative performance. Only Small native target authorized.

Sixteen production-boundary Chromium settings cases pass, including exact read-back
after a durable write rejects, two-instance/noecho, stale owners, native events,
dirty modal, pending writes and detached accepted baseline. Real build/types pass.
Fifty combined action/sync cases passed before the new sixteenth case. Both negative
controls fail correctly and restore source. Full attempts preserved: indexing
compiled inventory omitted new files; then nine action stubs omitted Notice. Both
corrected, focused tests green. Native corrected earlier candidate passes5cases:
actual external-file callback, all3views, native controls, semantic update/torn
recovery and exact config restore. Source changes since that trial REQUIRE final
native repetition. No final full-chain pass claimed yet.

Next: final npm run verify, exact staging, external-settings native lane in actual
on-demand and eager sessions; existing styleOperations lane; cleanup/sanity/private
evidence backup and final report/PR. Reusable native lane now also asserts actual
rendered stationary parents and native editor focus/caret. Keep raw failures and
private config backups; never archive HANDOFF or publish evidence. Source report:
docs/validation/live-settings-sync-182-2026-10-18.md (pending final validation).

Minimum host, real macOS-Windows Sync and physical mobile remain unavailable.
No active native controller; browser tasks drained. Do not run native while full
browser verification is active.
