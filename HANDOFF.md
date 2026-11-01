# Standing instructions ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in the issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# Creation and navigation batch

K-Plex implementation and current-main integration are pushed on
`codex/kplex-creation-navigation`; source checkpoint `9ff6db6`, draft
[PR #249](https://github.com/zsviczian/kplex/pull/249). The maintainer explicitly
authorized this publication so a separate agent can update K-Plex Help. This
agent must not touch kplex-help. Merge, release and automatic refactoring remain
unauthorized. Excalidraw and EA Scripts changes remain local and uncommitted.

Implemented #217/#208/#224, canonical coding standards, public drawing-template
integration and the companion Mindmap Builder view-mode visibility change. See
[the Help-authoring reference](docs/help-authoring/creation-navigation-features.md)
for exact proposed workflows, labels, defaults and the Excalidraw 2.29.1+ gate.

See [the validation record](docs/validation/creation-navigation-2026-11-01.md)
for exact revisions, native artifact identities, historical failures and limits.
Current-main integration fixes the previously reproduced occurrence-editor
baseline case; the affected integration set passes 143/143, production build and
lint pass. Complete verify passes architecture 9, core 132, main 1841, browser 452,
source 357, and 855/856 source-browser cases including 20,015 owners. The remaining
case misses its unchanged 50 ms scheduling bound at 59.4 ms during concurrent
native/build work; its isolated rerun passes 1/1. This does not turn full verify
green. Do not weaken the bound or claim that concurrent load is a proven cause.

The equipped agent is still repairing/retesting Excalidraw CLI infrastructure and
all 40 native device profiles. The original five failed paths now pass focused
and repeated desktop runs; complete native acceptance remains pending. Positive
K-Plex template acceptance on a 2.29.1+ companion and physical mobile input are
also pending. Companion source starts after merged Excalidraw PR #3028 and
preserves that work. EA Scripts typecheck failures match its clean base; native
floating-toolbar visibility and the public creation APIs have focused receipts.

Help agent: document proposed, unreleased behavior in the separate Help repository
under its own instructions. Implementation reviewer: retain the exact test limits,
complete companion/device gates, and obtain any additional publication authority
before changing the companion Git histories or proposing merge/release.
