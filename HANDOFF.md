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

State: the maintainer explicitly authorized the current K-Plex checkpoint commit, push and draft PR so a separate agent can update K-Plex Help. Companion Excalidraw and EA Scripts changes remain uncommitted. Do not touch kplex-help in this work. Broad/native acceptance retains the documented remaining gates; merge, release and automatic refactor continuation are not authorized.

Branches: K-Plex `codex/kplex-creation-navigation` at base `ec3c07d`; plugin `codex/kplex-integration-followup` at merged-#3028 base `ebb7916b`; EA Scripts `codex/kplex-creation-navigation` at current-main base `08ea7b5`.

Implemented the approved #217/#208/#224 batch, shared coding standards, public drawing template/path APIs and Mindmap Builder floating-toolbar visibility. The final native Small-vault test passes menu/camera/tab/split/popout and real reload/unknown-key preservation, with exact artifact/config/workspace restoration. Generated Mindmap Builder retains the shipped Mermaid behavior.

See [the validation record](docs/validation/creation-navigation-2026-11-01.md) and its sanitized native receipt for exact source/artifact identities, commands, actual results, prior failed samples and limitations. K-Plex's existing occurrence-editor test failure is independently reproduced on the clean base; Excalidraw fast checks pass 569/569 with the isolated matching fork; its full native attempt has 187 passed, 5 failed and 40 blocked cases plus separately successful guarded recovery and final-build creation checks; EA Scripts' declaration failures exactly match its clean base. Native Mindmap mode toggling and the final public-API/new-file destination probe pass. Positive gated K-Plex template acceptance on 2.29.1+, complete Excalidraw native/device acceptance, the published dependency handoff and physical input remain pending.

Help agent: use [the feature reference](docs/help-authoring/creation-navigation-features.md) and the draft PR to document the proposed behavior in the separate Help repository under its own instructions. Keep Excalidraw 2.29.1+ and unreleased status explicit. Implementation reviewer: complete the documented companion/device gates and review integration with newer main before proposing merge. Do not weaken assertions or substitute partial tests for full acceptance.
