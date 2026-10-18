# Live settings synchronization — draft task marker

Prepared by **Zsolt's Codex Agent**, 2026-10-18.

**Status: planning only. No runtime fix is implemented by this commit.**
The accompanying draft PR is the implementation specification and acceptance checklist.

- Repository: `zsviczian/kplex`.
- Workspace: `2026-10-18-live-settings-sync`; target: `main`.
- Starting revision: `43967682719b94f2de6ec111c715ce794e862bd9`, including merged PR #177.
- Objective: apply externally received K-Plex settings to live settings and open Plex views, without restarting or writing an old settings snapshot back over the received data.
- Detection: use Obsidian's public `Plugin.onExternalSettingsChange()` and `loadData()`. The proposed `vault.on('modify')` hook is not a reliable configuration-folder watcher; do not depend on it for `.obsidian/plugins/k-plex/data.json`.
- Reuse the existing settings migration, serialized persistence boundary, settings-effect classifier, appearance ownership, native controls and presentation/semantic publishers. Do not create a second settings writer or index scheduler.
- Adoption alone must not save settings, echo synchronized data, recreate themes, or replay startup/workspace restoration. Local saves must reconcile against the latest accepted data and preserve unrelated incoming changes.
- Cover same-theme-ID changes, stale editors, queued and in-flight writes, duplicate notifications, invalid/future data, startup/unload, and real two-device convergence. Immediate live adoption does not provide atomic cross-device conflict resolution.

Read `AGENTS.md`, `CONTRIBUTING.md`, `docs/ARCHITECTURE.md`, `docs/AGENT_WORKFLOW.md`, the draft PR, and related PRs #179 and #147 before implementation. Coordinate overlapping settings changes without modifying those branches or resuming their separate assignments.

The inherited root `HANDOFF.md` is not this assignment. Before an actual agent transfer, put the scoped assignment and minimized evidence in that single transfer document, preserving its standing header. Do not publish personal settings dumps, vault paths, credentials or unrelated plugin data.

Remove this temporary marker before final implementation review. Replace the planning PR body with actual changes, validation and remaining limitations; do not merge or release without authorization.

## Planning validation

Source, API, dependency and workflow review; marker content/link/whitespace review and remote read-back. Runtime tests, production build, native event delivery and two-device synchronization acceptance remain pending.
