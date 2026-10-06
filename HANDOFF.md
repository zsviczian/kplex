# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Current return — W6 desktop accepted/inactive

Branch indexing-fixes, base2a450b9; changes uncommitted, no publicationauthority, C15–C26 paused. Completed W6 corrects measured hidden zero-timer continuation starvation using disposable owning-window MessageChannel tasks at32 existing CPU boundaries. Real delay timers, source/semantic proof, slice budgets, priority ownership and lifetime fences remain. Read the durable [validation](docs/validation/warm-task-continuations-2026-10-06.md) and [evidence](docs/validation/warm-task-continuations-2026-10-06.json).

Main independently reviewed documentation/ownership, corrected three explicit test-transpile dependencies and actual-message cancellation targeting. Failed harness attempts and a51.3ms sample against unchanged50ms guard are retained; strict rerun and finalfullrun passed. Final verify:obsidian7/67/241/17/322/305, settings24, actualtypes/scanner/build/exactsmallsmoke passes onNode22.22.2, no skips. All272 frozeninputs match.

Main0ad6a47c is installed/loaded in the explicitly authorized reference vault. Actualnativeports close; whilehidden withoriginalthrottling, foldermembership/counts26/5 precede authority and then source/graphready plus20numericlabels converge withzero bodyreads/parses/repairs/fullbuilds. Final noactivework/controllers/wrappers, windowvisible/unminimized/documentvisible, note/file revisions/settings/center/CSS/manifest unchanged. Only main.js copied; no notes modified, no personalfixtures/faultinjection/throttling override.

Highestvalue remainingmanualcheck: physicalAndroid/iOS warm/background/resume for nativeWebView lifecycle; popout not separately exercised. EarlierW5 foregrounddriverfocus failures remain documented, not a W6 pass. No automatic follow-on/refactor/publication work.
