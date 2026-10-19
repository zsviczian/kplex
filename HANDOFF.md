# Standing instructions ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# PR #187 validated implementation checkpoint

Main validation agent. #186 merged as 1076068; main integrated without rewrite into 2026-10-19-plex-sync-footprints at 42209ee. User requested implementation of existing draft #187, then a smaller Footprints glyph. Keep #187 draft, issues #31/#59 open. No merge/release, branch deletion, raw evidence publication or personal-vault access.

Implemented native view-owned KplexDocumentSession, scalar native workspace center/sync/target/preferences, independent managed/ordinary native-open routing and completion fences, exact leaf/file/URL pending follow across remounts, scoped commands and existing ambiguity picker. sidecarLeaves remains the sole managed inventory. Global pins/history retain their writer/semantics. Memory-only PlexFootprints records accepted repeated visits and survives same-view migration. Shared FloatingLayer/collection window/icons/saved-row owners supply bounded disclosure, hidden-anchor dismissal and Zen/editor suspension. All eight locales maintained. User-requested glyph is 14 px vs Find's 15 px, with shared canvas button styling.

Full verify:obsidian fourth run PASSED on Node22.22.2: verify, architecture/core/lint, indexing harness, 1148 primary +187 browser +334 source +642 browser-storage tests, production build and exact Small-vault smoke. Earlier failed controls/fixture migrations are preserved. Final URL/publication/disclosure65pass; affected migrated-fixture133pass; latest icon/action browser19pass and scanner rerun. All27 touched native scripts pass Node --check. An earlier native candidate passed11 scenarios, including exact pair restart and popout/main migration; final committed-head native acceptance is next, not yet claimed. Current Small deployment is the full-verification build from the dirty implementation tree.

Next: commit/push this validated implementation checkpoint, rebuild/stage exact committed source only in Small, then run native plex-sessions, menu-anchor, sidecar-folding, sidebar-follow, display-modes and affected interaction lanes serially. Do not overlap native and browser drivers. New native session driver includes exact full serialized leaf-ID inventory, rename/delete/recreate safety, supported node types, command origin, zero-work interval and Zen portal retirement. Preserve failed trials and cleanup receipts. Reuse nativeDocumentSessions helper for scoped fixture isolation/restoration. Do not run comparative performance tests.

Then update docs/validation/plex-sync-footprints-187-2026-10-19.md and draft PR with actual results/limits, append Refactor plan.md as bytes (existing invalid UTF8 must remain), replace this body while preserving standing header raw bytes, commit/push final evidence/tooling checkpoint. Temporary edit scripts and PR seed removed. Private evidence backup is LOCALAPPDATA/KplexValidation/plex-sync-footprints-187-2026-10-19; refresh/check manifest after all final lanes, retain TEMP originals, do not publish or create an archive.

Environment: C:/Users/viczi/GitHub/kplex. Node TEMP/kplex-node-v22.22.2/node.exe; npm CLI C:/nvm4w/nodejs/node_modules/npm/bin/npm-cli.js. Target KPLEX_TEST_VAULT_NAME=kplex-test-small, KPLEX_TEST_VAULT_PATH=C:/Obsidian/kplex-test-small, KPLEX_TEST_CONFIG_DIR=C:/Obsidian/kplex-test-small/.obsidian. Fresh private KPLEX_HOST_REPORT_DIR for each native lane. Mac, physical phone/tablet/WebView and screen-reader acceptance remain pending. No subagents authorized.