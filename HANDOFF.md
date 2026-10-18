# Standing instructions â€” preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# PR177 — final creation/layout checkpoint

Branch2026-10-17-navigation-and-native-drag, base41fd2f8. No subagents. Keep draft;
commit/push authorized; no merge/release or personal-vault access. Small only.
No comparative performance tests while HandBrake encodes. No native driver active.

Delivered: common CreationCompletionSelect in folder/related dialogs; native
styling; exact-folder duplicates; materialization suggestions initially closed;
one context-only Simplified layout checkbox below columns, using LayoutCheckbox
shared with Wrap and existing device/surface writer. Native setter feedback is
guarded. Startup ba8ad7e remains unchanged. All8 locale labels reused.

Full baseline1792341320441 passes; final affected1792343479987 passes7/130/lint/
206/build/native smoke after last runtime change. Final main SHA3fbbe208b0498657a6f11d7b3d71655e15416ececce38d34315e2e9bdb790670;
CSS433605d6f9a88b23e4ac35940de23afd2b37faf7102d3e978a077259ff281801.
Folders1792343825848 passes12; layout1792344017489 passes7 including context
isolation and zero source/index work. Four visual captures1792344082616; wide
light/narrow dark inspected. Sanity1792344084125 restores107files/88Markdown,
exact artifacts, no controllers/dialogs, desktop and CLI capture off.

Raw failures remain private, including initial native setter feedback, driver
setup/selector/root/overlay errors and1 unattributed acquisition in earlier
1792343791614. Final strict guarded counts pass, not a universal efficiency claim.
Visual failed close lookups were repaired via owned Cancel; final cleanup verified.
No runtime/test changes since final successful build except native driver fixes.
Whole-app Settings-close freeze remains unreproduced; do not claim it fixed.
macOS/minimum host/physical mobile and existing OS-gesture gaps remain.

Next: diff check, commit/push this validated checkpoint; verify private backup
outside Temp pinned to exact commit (exclude HANDOFF, retain originals); record
its manifest and update draft PR body. Prior backup1792340626104 still verified.
Do not publish raw evidence. Remote41fd2f8 CI is green; new head CI not yet known.
Report: docs/validation/navigation-and-native-drag-2026-10-18.md. Source owner and
limitations in Refactor plan.md. No further implementation authorized by handoff.