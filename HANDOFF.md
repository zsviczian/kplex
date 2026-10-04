# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Online SI5 result — distinct phase/retry labels validated

## Independent checkpoints and scope

Posting batching **`ea41d4b4484b9957d8700cf44920809912ca1ee4`**; diagnostic-only wait attribution **`0f58ea606dbd406f0b100f49c7374d470027c039`**; the separate current UX correction is validated below (use `git log -1` for its resulting commit SHA). No push/release. Explicit online CLI/Git/development authority applies; C15–C26 paused.

SI5 remains open for physical iPad/Android and the final settings-route/retirement/evidence audit. Extreme cold is accepted; 20k hub decode-budget is outside the critical path. No architecture/cache/database/projection/memory/cold redesign.

## Current UX result

[Exact validation](docs/validation/settings-independent-indexing-si5-progress-labels-2026-10-04.md) and JSON distinguish **Checking note metadata**, **Checking cached notes**, and **Rechecking cached notes** on repeated reconciliation, in all eight catalogs. Bounded one-based phase/pass counting works without detailed opt-in; real denominators and monotonic counts preserved. No source validation, authority, scheduling, cache or watchdog changes.

Installed/final `main.js` hash **`bd1e24ae6946eaa8a5d4fab3b36587e8be423b7f41a820a11a30c124b194d2ad`**. Full verify passes architecture7/core62/Node144/UI7/portable317/browser199, official lint and actual build/types. Focused21/21, runner10/10, native15 assertions. One controlled missing MetadataCache entry produced two genuine complete 20,015-note reconciliation passes with distinct retry copy and final strict-ready. Zero source reads/parses/repairs/full builds, unchanged source heads/settings, original settings/enablement byte-identical after all attempts, no captured errors, one app/center DOM/canonical command. Foreground99/99, normal throttling, reconnects0; controller/wrappers/opt-in removed, private owner sets0, 25 frozen phases retained. Restoring excluded original center makes live status updating; historical strict-ready is not current authority.

Initial **untimed** setup ran hidden/unfocused and hit the existing production hydration watchdog; no trial started. Failure retained, setup stopped and configuration cleaned, foreground matched reload/retest passed. Driver now foregrounds exact test window before preflight as well as timed runs, waits for listener and selected center. Functional injected-retry elapsed 97.361 seconds overlaps browser verification and is not a performance comparison. Individual CLI30s and native autonomous/bounded poll/no outer deadline contracts unchanged. Backup `/private/tmp/kplex-si5-progress-labels-before-2026-10-04`. Only disposable test vault modified.

The maintainer's original identical rounds were in a now-closed personal vault. No old trace is available and its exact retry cause is unknown; no personal vault reopened/read. On its next startup, verify distinct metadata/cache/retry names.

## Measured performance and remaining decision

[Unchanged-build wait attribution](docs/validation/settings-independent-indexing-si5-wait-attribution-2026-10-04.md) applies to the **prior c9cc8a49… artifact**, not this UX build. Three foreground runs 64.523/64.592/67.665 seconds; host yields only0.165/0.152/0.165 seconds, observed transaction intervals36.776/35.870/37.344 seconds. Unwrapped remainder includes lease-release/other work, not CPU-only. Four whole-owner walks and zero source work remain. No yield removal or other optimization added.

Next proposed minimal performance correction, **not implemented**: combine clean local-dependency selection and its fresh source-head validation into one bounded readonly transaction. Preserve overlay/repair/version/revision/cancellation/storage/freshness fences and later validation pass. Review proposal before implementing; no generalized abstraction or new cache. Then retest same foreground condition/build and perform final audit/device checks.
