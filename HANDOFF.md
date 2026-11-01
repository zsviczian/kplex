# Standing instructions ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in the issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# Creation/navigation batch and startup placeholder fix

K-Plex source checkpoint `97a10b1` is pushed on
`codex/kplex-creation-navigation`, draft
[PR #249](https://github.com/zsviczian/kplex/pull/249). The maintainer explicitly
authorized Git/PR publication for the separate Help agent. Do not touch
kplex-help. Merge/release and structural refactoring remain unauthorized.
Excalidraw and EA Scripts changes remain local and uncommitted; Excalidraw source
preserves merged PR #3028.

Implemented #217/#208/#224, canonical coding standards, optional trackpad
navigation and the shared drawing-template dropdown with its Excalidraw 2.29.1+
gate. The companion changes add public creation APIs; Mindmap Builder hides its
floating toolbar in Excalidraw view mode. Start with
`docs/help-authoring/creation-navigation-features.md` and the batch validation
record. Actual positive template acceptance requires the released version gate;
physical mobile input remains separate acceptance.

The new startup-placeholder failure is fixed at `97a10b1`. Both regressions fail
before the fix; affected checks pass 135/135; production build passes. Strict
native Small acceptance holds global state at zero pages and startup readiness
false while checking the placeholder's own preview, connected source, toolbar,
pins and loading-history recovery. Settings/enablement bytes and owned cleanup
pass. See `docs/validation/placeholder-startup-navigation-2026-11-01.md` and its
sanitized native receipt.

The exact verified K-Plex main.js was deployed under explicit artifact-only
production authorization. Existing CSS and manifest already matched. The
maintainer manually reloaded K-Plex and confirmed both history navigation and
clicking the placeholder work. No production notes, settings, cache, navigation or
runtime reload were changed by this agent. Excalidraw was untouched there.

Complete K-Plex verification is running: architecture 9, core 132, main 1843,
browser 453 and source 357 pass; source/browser scale cases remain pending. The
historical full-run 59.4 ms/50 ms scheduling miss and unchanged isolated pass are
preserved in the batch record; no bound was weakened. Current main 2aaf6d3 (#248)
was integrated at 9ff6db6 and resolves the earlier occurrence-editor baseline
failure.

All 40 previously blocked Excalidraw device profiles pass their targeted rerun;
the original five failed paths pass focused/repeated native runs. A later text-
tool fixture timing correction still needs complete native acceptance. App-wide
native work is held while production is open. Do not restart the shared app,
emulate devices or deploy companion builds into production to bypass that limit.
