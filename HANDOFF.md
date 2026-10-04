# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Online SI5 result — unchanged-build wait attribution

Posting correction checkpoint **`ea41d4b4484b9957d8700cf44920809912ca1ee4`** is clean. [Wait attribution](docs/validation/settings-independent-indexing-si5-wait-attribution-2026-10-04.md) and its JSON capture the unchanged installed `c9cc8a49…` build. Three foreground warm restarts pass 64.523 / 64.592 / 67.665 seconds, median 64.592. Test-only bounded timing wrappers preserve original promises; host yields total 0.165 / 0.152 / 0.165 seconds, transaction intervals 36.776 / 35.870 / 37.344 seconds. Unwrapped remainder includes lease release/other work, not CPU-only. No optimization implemented.

Four full owner walks remain; all zero source-work counters remain. 10/10 driver tests, 18 evidence assertions, restored configuration/enablement and removed wrappers/controller/opt-in, zero private owner sets, 21 frozen phases. Full production verify/build remains exact posting checkpoint with 199 browser tests. Untimed navigation notification was lost before view listener subscription; recovered before measured runs. Driver now gates listener and selected center; subsequent native validation needed. CLI reconnects zero; individual 30-second cap, bounded polls and no outer native deadline remain. Live status after restoring excluded hub settings is updating; completed measurements are historical.

Next performance proposal, **not implemented**: combine clean local-dependency selection and fresh head validation into one bounded readonly transaction, preserving overlay/repair/version/revision/cancellation/storage/freshness fences. Review before implementation. Do not remove yields or later freshness pass based only on owner overlap.

Current user UX request: two identical cache-check rounds in a now-closed personal vault. No old trace available, no personal vault opened/read, retry cause unknown. Next independent checkpoint should distinguish “Checking note metadata”, “Checking cached notes” and “Rechecking cached notes” for a repeated reconciliation. Preserve true counts/percentages. Validate and commit separately from this diagnostic checkpoint.

SI5 remains open for physical iPad/Android and final settings-route/retirement/evidence audit. Extreme cold accepted, 20k hub decode-budget outside critical path; no architecture/cache/projection/memory/cold redesign, C15–C26 paused. No push/release. Explicit online development/CLI/Git authority applies.
