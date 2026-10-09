# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Root review — issue #2 native acceptance pending

Current branch `fix/large-paste-freeze`, based on synced main `25ba53ee300dd9cbe8c48ecba4e1381f993dc445`.
Fullscreen/Zen was committed/pushed/PR#86 squash-merged before this issue. Changes for issue#2
are now authorized for commit/push/PR/merge, with original issue#2 left open for reporter confirmation. C15–C26 remain paused.

The offline ontology-owner matcher/test correction was independently reviewed. The full
verify:obsidian gate passed on pinned Node22.22.2, including actual types/lint/build, complete
portable/browser tests and exact native graph render smoke. Freeze311-input SHA256
7b3454f2ee1b61dc334b768a4de7cc6d882461254c173b7a6a761a01d566f7ae unchanged.
Installed main.js0496ad5f… matches dist. Canonical parser/index/scheduler are unchanged.

The native owner probe measured the supplied30,687-character paragraph at0.1ms; original
4k cost371.3ms. No editor, clipboard or files were changed by that probe. Real paste driver
failed the locked-session/Settings prerequisite before any scenario. Native acceptance is
pending an unlocked session with Settings closed; async readiness question is pending.

Next: run verify:obsidian:large-paste with explicit kplex-test-small target, actual CLI, a fresh
report directory and optional local /private/tmp/kplex-issue2-transcript.md input. Verify hidden
source/Live Preview, visible Plex, repeated paste, following typing, configured parent/inline
suggestion replacement, exact saved text and plugin reload. No public transcript is committed.
No app restart/physical-device/paint guarantee is claimed. Native driver itself remains
scenario-unvalidated until this gate runs. Full verification need only be repeated if relevant
production/test/build inputs change; a native-driver-only repair needs its own exact rerun.

Pre-staging backup /private/tmp/kplex-issue2-prestage-1 captured fresh configuration after
queues drained. Original bytes restored and independently read back, with no later reload.
Final audit:73notes,0owned resources, original workspace branches/desktop/window geometry;
Settings stayed open. A later native run must preserve its fresh current baseline and restore
original pre-staging bytes only after all cleanup/write queues settle.

Durable evidence and failure limits: docs/validation/large-paste-freeze-2026-10-09.md and
Refactor plan.md. PR#86 CI strict unchanged URL-heavy timer failed56.8ms then64.8ms; local
full gates passed. No timer limit was weakened. Stop at accepted issue scope; no broad refactor.
