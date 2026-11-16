# Standing instructions ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in the issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.






---

# Active status: accepted for commit and merge

Repository: kplex. Branch: 2026-11-15-style-sources-links-mobile-fullscreen. Maintainer explicitly authorized commit and merge and confirmed physical-mobile verification. Preserve the standing instructions above.

Implemented scope:
- Appearance sources in node/connection context menus, navigating to existing standard, tag/note-type, ontology and styling-lens controls (#310).
- Markdown web-link text/alt/title parsing and compatible cached-source upgrades (title portion of #309 only; YouTube video-ID deduplication remains out of scope).
- Mobile side-panel fullscreen ownership/restoration (#124 follow-up), plus external single-click navigation opt-in, disabled by default and restricted to an already-central node.
- Retain compatible cache restoration through bounded, accounted foreground source commits; recover one transient pre-decode storage backoff while retaining source/policy/identity fences and finite retries. Eager preparation maintains edits with canvases closed through the existing coordinator.

Acceptance:
- Final npm run verify passed on Node22.22.2: core137, main2500, UI607, source393, real-IDB1084, plus validation/release checks and the real production build.
- Final exact-artifact native sequence13runs passed: pending-save close/reopen, actual app reloads, ordinary failure/retry deadlines, no-op events, idle/wake, mutations, startup embed/storage fault, style/title UI and phone/tablet emulation.
- Two isolated unchanged Brain app reloads reused the activated generation with zero primary-source checks/reads/parses/repairs, full builds, global source inventories, node catalogs or cache writes. Cached URL replay remains a separate background cost.
- Independent audit matched510 runtime/build inputs and tested/staged/deployed artifact hashes. Original production data.json restored exactly; all note edits preserved and confirmed as maintainer editing/sync activity. No production note-writing commands were issued.
- Maintainer Mac diagnostics confirm no broad rebuild. Latest build212509765Z has the same510 inputs as tested184120030Z: clean requested graph52s; early edit61s, updated snapshot92.5s, URL pass130.2s. These are indexing milestones, not plugin-load timings or a controlled before/after benchmark.
- Maintainer confirmed physical-mobile verification before authorizing merge. Device/OS was not specified; do not claim a complete Android/iOS matrix.
- Earlier failed aggregate runs are preserved in managed ignored storage. Missing extracted-method fixture capabilities were corrected without changing assertions/deadlines; the complete final aggregate passed afterward. No raw validation reports or generated artifacts belong in this commit.

Known follow-ups: cache/URL-pass latency and one recovered Mac source-transaction InvalidStateError remain recorded. The reported run completed an authoritative graph and activated its cache without a full rebuild. No additional broad regression rerun is needed while runtime inputs remain unchanged.

Merge instructions: use a PR against current main, close #310, reference only the completed title portion of #309 and the already-closed #124 follow-up, then switch local checkout to main and fetch. Do not publish a release/tag or modify production vaults as part of merging.
