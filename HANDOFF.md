# Standing instructions ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in the issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# PR #297 implementation for review

Branch: `2026-11-10-note-type-tag-workflow`. Main base: `447af1543c7ccaf72ca72c1a4b15c973642baea0`; starting PR head: `acad57d39dec476cde8e51b8d07763cbac95c249`. The maintainer requested a checkpoint commit before the next UI refinements. Keep the PR draft; no merge, release or issue closure was requested.

Implemented the tag-backed note-type brief plus the requested **Show file properties** context action. Shared ownership: existing structural native-write queue and observed metadata writer; integrated NodeStyleModal/NodeDetailsFields; cache-only property adapter and shared pre-layout measurement; native KplexModal review UI; finite action catalog. No new graph scheduler, source store, class hub or background scan. Appearance/defaults save atomically; defaults stay outside appearance themes.

- Set/Clear uses one native selector/tag write, valid native tag names, exact optional old YAML membership removal, preserved unrelated data and disclosed inline fallback. Existing tag/drop behavior remains supported.
- Ordered optional fields include visibility, live preview and explicitly reviewed absent-key initialization. No automatic property creation; null/empty/0/false remain present.
- On-demand yielding cached-YAML review has counts, clickable files, exclusion, validated replacement, literal change preview, per-file fences and changed/unchanged/skipped/failed/pending receipts. Ambiguous/unsupported data stays manual. Unknown/cancelled coverage never claims a clean scan.
- Show file properties calls the same guarded native capability as Obsidian's properties:open-local action, with the clicked physical Markdown file. Disabled core support omits the action. Obsidian owns pinning, placement and editing.
- All eight maintained locales updated; user guide is docs/NOTE_TYPES.md. Existing specification now identifies the implementation.

## Actual validation

Node 22.22.2, Windows, Obsidian 1.14.5. Raw logs/screenshots/receipts remain in ignored managed .test-work/validation runs, subject to the standard 14-day retention policy.

- Reproduced the original missing-tag write and unnecessary rebuild before implementation.
- Focused checks: 185 passed on the final implementation, including own-key persistence and cancelled-review safeguards. Installed Obsidian types, portable-core types, architecture and locally identified optimized build passed.
- Exact-build Small native scenario: 14 cases passed (atomic writes, nested/old tags, inline Clear, three views/live edit, native Properties, legacy tag/search/pin/navigation, explicit hidden defaults, selected bulk repairs, preserved selector, partial failure, stale preview, cancellation, warm reload, popout). Zero full rebuilds and zero display-configuration source acquisitions. Light 900px/dark 420px native screenshots inspected. Final refinement rerun also passed all 14 cases; exact candidate main.js SHA-256: 8dbc3a22204eb95837dffaca90c9440726307a23aa3012ed7157b8e24fb5ceeb.
- Existing scale vault: 20,088 Markdown entries reviewed in 4,082ms on the final build, no unavailable caches; all lacked the configured YAML selector and were reported as that coverage limit, not errors. Cache-only details save 94ms, three navigation checks 77/553/78ms, zero configuration source work/full rebuilds. Cleanup verified. This establishes this disposable fixture, not production latency or large-volume repair throughput.
- Full verification completed all test stages: 2,194 functional, 544 browser interaction and 362 source-contract cases passed. IndexedDB stage: 1,030 passed / 1 failed before its test body, because Chromium did not load the production bundle within the unchanged startup limit. The entire affected source-startup-indexeddb file passed on unchanged rerun (92/92). Do not describe the original aggregate invocation as passing. The 20,015-owner high-degree oracle/zero-I/O/performance/cancellation gate passed. Final installed Obsidian types and deterministic production release build both passed. Preserve earlier failed attempts: initial compile inventory omitted new modules; subsequent functional stage was 2,115 passed / 6 failed (old command-count expectations, missing native tag parser fixture and missing menu capabilities). Corrected affected fixtures passed 115 + 46 cases. Initial focused unchanged-Save regression and native SDK disabled-button defect were fixed and rerun. A sandbox-limited browser run failed temporary-file access; elevated rerun passed. Initial native scale driver incorrectly iterated a Map; corrected run passed with cleanup.

## Remaining acceptance / delivery

Implementation and final exact-build native acceptance are complete on Windows. Whitespace and validation-retention checks passed. Final installed types and deterministic production build passed. The maintainer authorized committing this implementation checkpoint before separate UI refinements. No generated validation data should be committed.

Physical mobile keyboard/touch and native macOS remain untested. Narrow desktop/native popout evidence does not establish those platforms. Native Properties uses a guarded unpublished Obsidian capability; missing/incompatible support is intentionally unavailable. Bulk operations retain prior successful files after cancellation/failure.

Suggested maintainer checks: (1) set/change/Clear a real note type and inspect YAML + inline fallback; (2) edit ordered visible details and explicitly initialize missing fields; (3) inspect/exclude/apply a small review group and verify native Properties in a pinned sidebar. The maintainer subsequently authorized deployment: main.js and styles.css were hash-verified in Zsolt's Brain and K-Plex was reloaded. No note content was edited.
