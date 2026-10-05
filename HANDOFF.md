# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Current return — completed implementation and automated/native validation

Verified follow-up base `bce447a`, publication branch `ui-improvements`. The maintainer has authorized committing and pushing the complete verified batch, creating a PR targeting `main` with closing references for #71, #70, #69, #68, #67, #64, #62, #63 and #50, then switching the local checkout to `main`. Merge/release and personal-vault deployment are outside that authorization. General native checks use maintainer-provided `kplex-test-small`; reserve `kplex-test` for scale-specific work. C14 and SI5 remain unchanged.

Latest full `verify:obsidian` passes, including 13 Chromium UI regressions, 273 actual Chromium IndexedDB cases, strict scale/authority limits, official lint, real build and installed smoke. Report/log `/private/tmp/kplex-toolbar-label-verify/report.json` and sibling log. Exact native-tested/built/staged main `2eeaf1fb…`, styles `37efdfe8…`, manifest unchanged. All 253 frozen runtime/test/driver files match `/private/tmp/kplex-followup/toolbar-label-source-hashes.json`.

Latest `/private/tmp/kplex-toolbar-label-native-final/report.json` passes 31 desktop scenarios. It checks toolbar margin/search contraction before wrapping, actual nested label settings, long-node spacing with unchanged compact baseline, fixed regular row heights (26/54 px), forced two-line text, history left-edge preservation and wrap-following footer (40/52 px). Earlier wide-font native wrap assertions assumed an already-fitting title must wrap; the final fixture deliberately constrains wrapped width. Failed reports and correction are documented, with successful cleanup. Earlier focused Find/menu follow-up also passes both theme/focus states (15.91:1 light / 12.19:1 dark), final editor ellipsis at both sizes, menu Escape and preserved Find state.

Final small-vault read confirms desktop mode, index ready at original 13 files and no owned controller/fixture/web-source artifacts. Native settings restoration and original enablement byte restoration pass. No active test process remains. Earlier separate desktop/tablet/phone emulation passes without a source seed; physical touch/iPad trackpad/mobile WebView remains distinct. The device matrix was not repeated for this desktop follow-up.

Implementation also retains the earlier relationship/cache corrections: complete incidence precedes sparse endpoint reads; pair updates survive scoped/full fallback swaps until actual publication absorbs matching semantics/provenance; native menu cancellation retains owning Plex through the Escape dispatch task. No head restamp, cache clear, source-authority weakening, limit increase or new indexing optimization.

Durable evidence/failure history: `docs/validation/kplex-relationship-followup-2026-10-05.md` and `Refactor plan.md`. README documents the label settings path and history wrapping. Remaining manual priorities: physical iPad/phone interactions; authenticated webview login/remote playback; original personal-vault Scratchpad/attachment/exact-URL save and immediate unlink plus projected Find after maintainer deployment. These environments are not established by desktop/emulation and synthetic scale checks.
