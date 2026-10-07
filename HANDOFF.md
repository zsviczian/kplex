# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# Area-filter autofocus contrast — complete

Direction: main validation closeout of a bounded CSS fix on main. User requests readable text when
opening an area filter and typing without clicking its input. The maintainer now explicitly requests a commit on main. The tested source is unchanged;
no push or further implementation/refactor assignment is requested.

Only styles.css changes behavior: the area field reuses the existing Find field's paired theme
foreground/background in normal and focused states, plus its muted placeholder. Fixed dark
background removed; React autofocus and filtering remain unchanged.

Node22.22.2 checks: two existing browser theme/area-control cases pass; actual stylesheet colors
match representative light/dark tokens with and without programmatic focus; real production build
passes; scanner zero errors/one unchanged activeLeaf warning. No new tests or full indexing suite.
Native disposable small-vault check temporarily applies built CSS, opens the actual area filter
button, and verifies automatic focus with white background/dark text. Temporary style/controller
removed; React filter closure confirmed separately. No notes/settings or production vault changes.

Durable progress and remaining arbitrary community-theme check are recorded in Refactor plan.md.
Logs/results: /private/tmp/kplex-area-filter-{ui-check,build,scanner}.log and
/private/tmp/kplex-area-filter-native-result.json (its immediate closure sample precedes React's
commit; the separate native cleanup read confirms closure). C15–C26 remain paused.
