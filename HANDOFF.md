# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Inactive — automated feature-correction acceptance complete

Main reviewed the final source against AGENTS.md, CONTRIBUTING.md and architecture/workflow rules, including canonical parser/compiler/source ownership, bounded private publication and exact fences, shared controls, stable persisted keys/commands, localization/environment, owning-document cleanup and touched-function TSDoc. C14 remains accepted; structural refactoring is paused. No next assignment is queued.

Authorized old WIP checkpoint: cc739129d8daa36421b8732e317e600264cf4766. Corrections remain uncommitted on ui-improvements against 8021d6a402e3bcc3485a4fff6f12fd6eb7d6b117. Incoming Git index is preserved. No push/release/personal-vault deployment.

Required full npm run verify:obsidian passed on Node 22.22.2: all architecture/core/lint/indexing/portable/UI/source checks, 234 real Chromium storage tests, the 20,015-owner stress comparison/cancellation case, production build and exact staged native smoke. Built/staged main.js SHA-256 a3b1333ac5acacb9ada0a18f76ae56239a07fdd550b52ee8715a308c0798d52a. Runtime patch SHA-256 31c57e21dd9e6b47565cc248f9553784144bbcdf79b9a4f080376c201a66c6fd.

Exact-build native acceptance passed all 21 desktop workflows: F4 files/URLs/multiple aliases, independent Find/projection/overflow/popout/style, About gestures, existing-target Link/disclosure, four history roles/canonical provenance, tall/wide image paint/history/thumbnail, three captured resizes and Canvas drop/zoom. Device-only rerun passed actual desktop/tablet/phone classification, Find bounds/hints and webview versus iframe selection/geometry/teardown. Desktop guest initialization covers pages/YouTube/Shorts/Vimeo ratios; login/playback remains separate. Native reports retain the earlier mobile element timeout during incomplete primary startup; the corrected driver uses the existing 30-minute startup prerequisite before unchanged interaction deadlines, without production edits. No timing/authority bound was relaxed.

Final cleanup restored mode/window/live settings and original data/enablement bytes. Main repaired a remaining live history-only difference and delayed checks confirmed zero live-setting/byte differences, loaded plugin/one rendered Plex, no owned fixtures/controllers/modal. The final cache is fully hydrated (20,015/20,015); restoring the original extreme center reproduced its explicitly accepted decode-budget warning with no active semantic preparation; do not report strict readiness or normal-note performance from that state. Cache/source data preserved. No build/test drivers or temporary native controllers remain; the loaded plugin retains its normal lifetime.

Durable evidence/retained failures/compatibility rationale and three remaining manual priorities: docs/validation/kplex-feature-corrections-2026-10-04.md. Reports: /private/tmp/kplex-feature-corrections-verify-timer-coalescing/report.json, native-timer-coalescing/report.json (all desktop scenarios pass, overall failed old device startup prerequisite), native-device-ready/report.json (3/3 modes pass). Physical iPad/Android touch/WebView/Canvas trackpad, actual desktop login/video playback, and personal-vault acceptance after maintainer deployment remain unrun—not demonstrated passes.
