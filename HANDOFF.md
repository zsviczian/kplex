# Standing instructions ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# Sequential work closeout

147 merged60d2239;179 mergedb4c144a.149 native investigation saved850da4e:24main+26popout visual samples/44focused tests, no persistent idle blur, remains draft/115open. Needs affected device/version/DPI/zoom and idle recording, no speculative rendering patch.

176 main integration22a19d3, bounded Gate1/test checkpointfc227c1, Node fixture correction8e94ed8; final clean full/native468d27c passes architecture7/core130/main1127/UI184/sources334/browser639, lint/build/native smoke. CI468green. Later closeout docs only. Native Small107/88:0fullbuild/0snapshotwrite/freshread/parse/repair on prepared complete warm cache, observed drain16.783s, no comparative improvement claimed. Ordered untimed canonical oracle differs in page/evidence order and8combinedlabel fields despite equal215/1568counts; no count/sorted shortcut. No production change/receipt/readersharing/schema/scheduler work.43real-IDB reuse guards pass; Node fixture sources retired/paused/joined through real owners with all strict spies preserved,24settings/stronger1second control pass.

Final artifact23b25a1bf7bb4873563769986828fc2efe6e51d17cf44020f2bf0a456950f54e remains installedSmall. Original config/workspace/followowners and On-demand mode restored aftersmoke;0controllers/pending settings, CLIdebuggeroff. Private67file/15784852B backup verified, originals retained, no publication; report docs/validation/warm-start-rebuilds-176-2026-10-19.md pins manifest/full-log/artifact hashes and all limits. Source frozen after468; final docs push/authorized176merge next, then main/fetch. No release/branchdeletion/personalvault. Stop Gate1 no-go; further production optimization requires a current causal reproduction/new scope.
