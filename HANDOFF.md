# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---
# No offline assignment — maintainer decision required

Delivery 1 remains unaccepted. Do not start Delivery 2 or C15–C26.

The returned v5 compact codec, final-inventory retry and diagnostics pass the complete automated suite, but the exact 20,015-source Obsidian run still fails `decode-budget`. The deterministic regression modeled the wrong bound.

Native aggregate evidence after the one final-inventory retry:

- 20,015/20,015 source heads validated; 0 Markdown reads, 0 parses, 0 repairs, 0 failures.
- Failed inactive generation: 20,501 pages, 108,995,381 bytes and 557,044 rows; no root activated.
- Bucket 137 reached the hard 256-page cap with only 1,224,876 bytes / 11,979 records. Bucket 961 had 248 pages. The failure is page fragmentation and hot-bucket page count, not the 128 MiB aggregate-byte bound.
- `dependencyCatalogAttempts: 2`, `dependencyCatalogReason: "decode-budget"`; no catalog became current.
- The reload also refreshed all 20,015 resolution families and wrote 183,715,567 source bytes before attempting the catalog. Even a page-count fix would retain a costly whole-vault startup path.

Per the delivery plan's repeated-blocker rule, no second codec/page-cap correction is assigned automatically. The maintainer must choose between:

1. a bounded writer/compaction correction that fills hot-bucket pages without increasing query or mobile memory bounds, while accepting the whole-vault startup catalog; or
2. the recommended design correction: remove the process-wide contributor-catalog bootstrap from the production settings route and use a durable source-local dependency index maintained on source activation, with host-sensitive reconciliation kept separate.

The rejected external implementation and its tests have been removed from the working tree. Only this review evidence remains uncommitted. This is not an active implementation handoff; a source-local replacement, if selected, starts from the committed Delivery 1 baseline and replaces its process-wide bootstrap rather than layering on v5.
