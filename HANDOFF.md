# Standing instructions ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in the issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# Creation outcomes follow-up

Current branch: `codex/kplex-creation-navigation`, draft [PR #249](https://github.com/zsviczian/kplex/pull/249).
The maintainer authorized commit/push and PR updates for the separate Help agent. Do not touch
kplex-help, merge or release. Companion Excalidraw/EA Scripts work remains local/uncommitted;
Excalidraw retains merged PR #3028.

This follow-up replaces the editing toggle with one remembered After saving list in related-note,
folder-child and placeholder creation. Placeholder options omit Create another/Follow node;
Sidecar is excluded in a sidepanel and popouts on mobile. Native tabs honor the invoking group
or most recent main group. The exact displayed-center snapshot port lets new-file editor actions
retain strict occurrence/native identity checks. Folders now share file-node reveal delegates and
captured native replacement guards. Existing explicit placeholder relocation is proven for the
maintainer's nested path, including body/embed/property links and aliases/subpaths.

The maintainer explicitly requested focused checks only. Current evidence: 45/45 affected tests,
25/25 localization, eight exact-build macOS native cases, touched lint, portable type compilation,
import boundaries and production build pass. No full regression was run for this follow-up.
See `docs/validation/creation-after-saving-2026-11-01.md` and its sanitized native receipt.
The separate Help agent should start with `docs/help-authoring/creation-navigation-features.md`.
No production deployment or vault modification was performed for this follow-up.

Historical prior checkpoint `92b7508`: complete K-Plex verify 3650/3650 and the startup-placeholder
fix at `97a10b1` were accepted. That older main.js was deployed under artifact-only authorization;
the maintainer confirmed placeholder clicks/history work. Those full-suite results do not apply
to this later runtime source checkpoint. Companion Excalidraw acceptance reached 600/600 fast and
357/357 native, including all 40 device profiles, with zero failed/blocked/missing cases.

Remaining release/platform limits: actual Excalidraw 2.29.1+ template-dropdown acceptance,
published fork dependency handoff, Windows and physical mobile touch. The current additional
maintainer request concerns Excalidraw New File dialog width, folder dropdown activation and
standard mobile-modal keyboard clearance; finish it using focused validation.
