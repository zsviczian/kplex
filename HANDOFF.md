# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Current handoff — U10 filter right-edge alignment delivered

Branch `ui-improvements-batch-2`, base `5091f88abb69f660c900fed1dd0d41c7b738af81`; U2–U10 accepted by the maintainer. Publication is explicitly authorized: commit and push this branch, open a PR against `main`, then switch the local checkout to `main`. C15–C26 remain paused.

The shared filter toolbar's right inset is now zero. Filter button edges match each scroll area's right edge; the open field extends leftward, preserving U9's six-pixel above-region gap, focused-panel stacking and node clipping. No node geometry/settings/filtering/indexing changes.

Full `verify:obsidian` passes 7/67/226/17/322/296 without skips, settings 24, installed types/scanner/build/exact smoke. Scanner zero errors/one retained legacy warning. Native 62/62 (56 desktop + 6 emulation) passes: zero right-edge offset in all five areas, 6 px vertical clearance, interactive overflow and unchanged clipping. No captured errors/timeouts; exact settings/enablement and owned fixture/view/controller/window/mobile/throttling restoration. All 270 inputs and artifacts match: main `8b3fea71…` unchanged from U9, styles `0d75bb3b…`. Final audit confirms ready desktop, original notes/center/layout/typography, hidden controls and no previews/pending owners.

[Validation](docs/validation/area-filter-alignment-2026-10-06.md) and [exact evidence](docs/validation/area-filter-alignment-2026-10-06.json) retain final acceptance. Tracker marks U10 complete. No additional manual check required for this one-value CSS correction; physical touch/WebView remains separate from desktop emulation. No personal-vault deployment or native large-vault timing claim.
