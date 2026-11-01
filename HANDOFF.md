# Standing instructions ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in the issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# Menu targets and CSS compatibility follow-up

Branch: `codex/kplex-creation-navigation`, draft [PR #249](https://github.com/zsviczian/kplex/pull/249).
The maintainer authorized Git/PR publication for the separate Help agent. Do not edit kplex-help,
merge K-Plex or release it without further authorization.

The latest menu fix keeps the selected native file across startup/lazy graph and catalog gaps.
Explicit native availability grants only a detached facade; ordinary search remains catalog-only.
Explicit opens reroot the chosen view, retaining old-editor save/refusal and native identity guards.
Open reuses/reveals a Plex, new tab group creates a separate group, and unresolved links now have
the same submenu through a guarded native link-menu hook. No placeholder file is created.

Final menu evidence: 33 creation/menu checks, 11 editor-navigation checks, 25 localization checks,
10 native destinations, targeted lint and build pass. Native checks verify actual rendered targets,
recent sync, an unrelated active note, partial publication, group separation, popout and sidepanel
ownership. The original failure is preserved in the before-fix receipt. See
`docs/validation/file-menu-targets-2026-11-01.md` and the updated Help-author reference.
The maintainer explicitly requested no full regression cycle; none was run.

Additional requested K-Plex CSS fix replaces three clip-path declarations with equivalent legacy
rectangular clipping. Eighteen area/geometry checks and a real browser hit-test pass; clipping does
not cover recovery controls and native fullscreen releases it. See
`docs/validation/editor-clipping-css-2026-11-01.md`. Source/build is ready for installation;
production was untouched during this follow-up.

Companion work is merged: EA Scripts #6 into main, Excalidraw #3029 into master. Excalidraw's
separately requested two !important fixes were committed directly on master at 763f6ae3 and pushed;
seven focused fullscreen tests and CSS parsing/minification passed. No new branch or full suite.

Earlier accepted K-Plex work includes remembered After saving destinations, reference relocation,
folder reveal and startup placeholder/history recovery. Earlier complete verification at 92b7508
passed 3650 checks; that result is historical, not a claim for this later source. Physical mobile
and Windows remain separate platform acceptance. Excalidraw's earlier full recovery record remains
in its repository; no full regression was rerun for the subsequent dialog or CSS refinements.
