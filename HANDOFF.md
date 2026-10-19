# Standing instructions ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# PR #187 newest-first and Markdown-copy follow-up returned

Main validation agent. Existing branch 2026-10-19-plex-sync-footprints. Newest-first 9d9a66c; clipboard 3a48f0e; clean validated runtime 39abfbc23190f3318b80b97f4cd76c8271f1c41a (later report/handoff only). Prior full implementation/runtime95d82fd and delivery2aa2a96 remain documented. User requested newest-first Footprints and explicit Markdown-copy header button. Keep PR draft and issues #31/#59 open; no merge/release, raw archive/publication or personal-vault access.

Delivered newest-first bounded projection without reversing the chronological store, visual Home/End/arrows, stable older-reader/focus anchoring and memoized visible-row resolution. Explicit Copy as Markdown snapshots all visits in displayed order, including repeats/non-rendered entries. Full tags, wiki links for notes/attachments/placeholders/folders, Markdown URL links and cached source-section facets. Existing folder/tag coordinate owners are reused; opaque IDs are not paths. ClipboardSession mechanically extracts common same-turn/pending/denial/retirement mechanics for Footprints and the retained support-report compatibility facade. Owner-document clipboard, truthful feedback, duplicate exclusion and retired callbacks. All eight locales. No source/index scheduler change; C14 refactoring remains paused.

Clean-head verify:obsidian PASSED: 1149 primary, 189 browser, 334 source, 642 browser-storage, architecture/core/official lint/real build/exact Small smoke. Final unchanged native retry 15passed on identical staged main.js 5da3070f56a0012d3cd9404eab6961c99a6180cc3c54f403183453b3bb5079ed, including main/popout real clipboard forwarding and restart. Focused38 plus shared browser/dialog9 passed earlier. Disclosure/copy/reset interval zero semantic demands/reads/rebuilds/settings saves. This is work-count evidence, no comparative performance claim.

Preserved controls: superseded newest-first full after1149primary (user added copy); missing ClipboardSession in legacy harness inventory (fixed, harness passes); native baseline had plugin disabled on disk after staging (exact cleanup/durable recovery, new fail-fast baseline guard); final immediate-after-stage trial failed Native A follow before copy, cleaned/restored; unchanged retry 15passed. This last cause remains unknown; no sync fix is claimed. Existing intermittent native popout getZoomFactor exception and macOS/physical-phone/tablet/WebView/screen-reader gaps remain documented. Highest-value manual checks: immediate post-reload pair follow, then copy/focus on physical mobile and popout teardown.

Latest native baseline/fixture/config cleanup completed; no old baseline replayed. Small only. TEMP originals retained. Durable private backup LOCALAPPDATA/KplexValidation/plex-sync-footprints-187-2026-10-19 verifies 265 entries; manifest SHA256 8c76393bcef208007a3f9af5a026404d4016bff21ecb3dc0f94bd2e74b51f136. Prior manifest preserved. Do not create/publish archive or delete originals. No unrelated apps or personal vaults used.

Ready for maintainer review. Final remote CI is reported in PR, not inferred from local checks. No further autonomous runtime work pending. Windows nativeCLI, Node22.22.2, build/lint/browser/GitHub capabilities verified; no delegated agent active.
