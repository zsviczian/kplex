# Standing instructions ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in the issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# Frontmatter Markdown URL labels (#259) — accepted for publication

Direction: implementation/validation complete; maintainer authorized publication and merge after the residual-risk assessment. Branch `fix/259-frontmatter-link-labels`, clean starting main `190669355396a515cfeb8a72dfa77acc5f263193`; the previous ontology branch is preserved. Retain the original contributor commit as ancestry and publish the tested replacement tree. No release or production-vault deployment is authorized by this step. C15–C26 remain paused.

Implemented: readable frontmatter Markdown URL captions through full/source-patch/cached compilation, shared first-meaningful URL naming/search aliases, independent owner publication/edit/removal, preserved internal note names and existing strict cache formats. Literal property parsing now shares its caption scanner without changing legacy target DTOs. Regression tests cover old failure, existing bare URL nodes, nested values, unchanged real IndexedDB replay, malformed-input bounds and cancellation. A maintained native driver covers actual rendered cards/search/native property updates and both cache reload strategies.

Actual evidence and limits are in [the validation record](docs/validation/frontmatter-url-labels-259-2026-11-03.md) and [native receipt](docs/validation/frontmatter-url-labels-259-2026-11-03.json). Node22.22.2. **`npm run verify` passes (exit0)**: release/architecture/core/official lint, indexing tests,1,971 main,466 browser UI,359 portable source and894 real IndexedDB tests, including the unchanged20,015-owner no-I/O/cancellation regression, then the real installed-type production build. The first full run exposed eight missing-helper harness failures; its dependency was fixed without weakening assertions. The intermediate native gate incorrectly required Eager-only global source authority in local mode; the corrected mode-specific lane passes. Native Windows Obsidian1.14.5 proves labels/edit/removal/search, Eager source authority, completed URL discovery in both modes, zero source reads/parses and URL-owner reads, zero Eager full builds. Usable label:895.9ms Eager/394.7ms local; completed mode-appropriate work:7,565.2ms/900.5ms. Settings/enablement bytes, inventory and workspace restore. The final aggregate build matches the native-tested main.js `4b83b059af3784801892cf29dddac20b4dde3a7f257b31de55731f71fe7379ed`; all three artifact/source hashes match the receipt. Full source self-review covers canonical owners, bounded/cancellable processing, coherent publication, unchanged strict cache DTOs, documentation and absence of UI-copy changes; no unresolved coding-standard findings. Independent maintainer review remains the next step.

Next: publish and merge the tested replacement into #259, verify its exact head, switch to main and fetch, then implement draft PR #272 on its existing branch. Original #259 head: `6f9d4ff7a6020db8594fdcdf2adbbc4eb094802b`; preserve its ancestry without reapplying the unsafe lexical-label implementation. Production vault remains read-only and untouched. Windows evidence does not imply Android/macOS/popout or large-vault native acceptance. The highest-value optional platform check is the originally reported Android frontmatter-caption/restart/search workflow. No functional/code work remains pending for #259.
