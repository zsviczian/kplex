# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Online result — indexing settings independence closed

## Status and authorization

SI0–SI5 are accepted. SI4 is finalized at `323b260127e4fb81e1d3697d4ee8b0282f8cdb12`; SI5’s last narrow implementation correction is `9d8b5c9cb3e5fd7e42edc7d3a65684eda241ee5e`, followed by desktop/device-candidate documentation at `e46dd845db330420ef24fd732ca27a98279b6805`. The maintainer reports successful physical iPad and Android testing on 2026-10-04 and requests final startup copy changes, closure and a PR. Online development, CLI, commit/push/PR authority applies. Merge and release are separate actions; C15–C26 remain paused.

## Final checkpoint

Requested startup wording is updated across all eight locale catalogs, with stable keys/placeholders and unchanged progress/indexing behavior. Current acceptance/build/commands/results and qualitative device evidence limits are in the [final acceptance report](docs/validation/settings-independent-indexing-si5-acceptance-2026-10-04.md). The [design checkboxes](docs/INDEX_SETTINGS_INDEPENDENCE_DESIGN.md#11-fixed-completion-plan), [plan ledger](Refactor%20plan.md), architecture and contributor/runtime instructions reflect completion. Earlier reports keep their exact hashes, counters, unsuccessful trials and unmeasured cases.

The [warm candidate/control report](docs/validation/settings-independent-indexing-si5-merged-selection-2026-10-04.md) still shows no overall warm speedup: medians 70.346 seconds candidate versus 69.144 seconds same-UX control, with 40,030 fewer transaction boundaries and all four owner walks retained. The [retirement audit](docs/validation/settings-independent-indexing-si5-closeout-audit-2026-10-04.md) confirms valid-fact settings do not schedule source/full rebuilds. Historical readers/stores/shared contracts and characterization seams are deliberately retained.

Extreme cold is accepted; synthetic 20k dense-hub/high-node stress limits remain excluded. No projection/database/cache redesign, larger memory limits, further cold/scheduler optimization or structural refactor is queued. No personal vault is opened/read; final native checks use only disposable `kplex-test`.

## Handoff state

Inactive: no agent assignment or further manual test is pending. Final verification and exact-build/native checks passed and are recorded in the acceptance report, including the retained failed supplemental setup and successful controlled restart. Commit/PR creation is authorized; no agent implementation task remains. Once opened, use `gh pr view indexing-optimization-v2 --repo zsviczian/kplex` for current PR status; merge/release are not part of this handoff.
