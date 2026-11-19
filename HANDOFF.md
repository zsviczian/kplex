# Standing instructions ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in the issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.






---

# Active status: 0.4.5 release material prepared

Runtime checkpoint: e225456 on main. The maintainer authorized committing and merging the inactive-tab performance branch, returning to main and fetching. No release or tag was requested.

The maintainer explicitly approved pushing source main. Keep the Help-vault update local until the release is live; no release or tag is authorized.

Implemented and validated:
- Live inactive effort now also gates automatic current/visible-note preparation. Zero effort retains pending observations without recurring retry timers; focus resumes the existing owners. Initial preparation and admitted cache saves retain their agreed exceptions.
- Repeated native identity observations preserve newer previews. Partial recovery cannot replace a complete displayed neighborhood before source closure; real relationship edits still update the canonical graph without renewing write proof.
- Stationary connectors no longer replay arrival fades on follow/focus changes. Actual root/view transitions retain their animation.
- Node22.22.2 checks completed: core137; main2517 with one Chromium bundle-startup failure before its scenario ran; the unchanged case passed on rerun. All remaining gates passed separately: browser610, source393, real IndexedDB1096 and the real production build. The failed aggregate remains recorded as failed. Focused indexing coverage374 also passed.
- Exact-artifact Windows Small coverage passed24 native scenes/72 autosaves across both strategies, all three layouts and Paused/full effort. Paused cases admitted zero Markdown reads/parses. Four actual app:reload renderer cycles passed: two unchanged, pending save, unchanged after repair. All four admitted zero full builds/global inventories/reads/parses; only the pending-save cycle wrote one replacement snapshot.
- The20,015-owner persisted-graph regression passed. Windows functional evidence is not Mac production-vault or physical-mobile acceptance.

Help checkpoint: kplex-help main commit68f584e follows the release-material commit9c976b8; both remain local for publication after the release is live. Final consumer copy is written as Release0.4.5, with November20,2026 explicitly supplied by the maintainer. Version and daily-note chains, living indexing/style/navigation guides, a genuine desktop background-effort screenshot and the bundled current main executable are updated. Manifest remains0.4.4; authoring/deployment did not prepare a release version.

Help acceptance and publication:
- Static audit passed180 notes,1,998 links,34 tables,21 release versions and18 journal days. Native reading views render the release/date/strategy guide and the actual screenshot. Release-to-guide/date/previous-version navigation and the twelve-child limit passed.
- The maintainer confirmed that journal entries deliberately use earlier/later as Parent/Child. The authoring guide, templates, agent guidance and consumer explanations now preserve that settled choice without asking again on routine updates. Read-only native checks passed all18 journal days under Parent/Child and all21 release versions under Previous/Next. The earlier native Previous assertion tested an incorrect documentation expectation, not an index defect; settings remain unchanged.
- Native cleanup restored the original plugin settings, appearance and enablement bytes and the preexisting live layout/history. The original live recent-file list already contained Release0.4.5 while its disk workspace was older; Obsidian subsequently persisted that history. Leave the resulting workspace-only diff uncommitted.
- GitHub's latest release was0.4.4 at authoring. Before publishing the Help update, verify the actual0.4.5 release date/scope against the final copy. Do not publish the Help commit or create a release/tag without maintainer instruction.

Known follow-ups: repeat the corrected split-pane/idle workflow on the maintainer's Mac. A separate dense newly-created incoming-contributor first-open stall also reproduces on b9044c7 and remains unresolved; the warm prose scenario deliberately settles fixture creation before measurement. Earlier #309 YouTube-ID normalization and previously recorded cache/URL-pass latency are not claimed fixed by this patch.
