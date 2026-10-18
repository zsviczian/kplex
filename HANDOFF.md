# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# PR #177 relationship-composer follow-up: validated, ready for commit/push

Existing branch `2026-10-17-navigation-and-native-drag`, baseline54fef0c.
Keep draft; Closes157/Refs175; no merge/release/personal-vault access. No further
implementation or broad performance work. The feature report and latest ledger
entry hold the delivered scope, native results and remaining limitations.

Direction/ontology now share one row with All; known fields retain their assigned
role and new fields require an explicit role. Completion/edit controls occupy a
compact footer and show the effective configured result. FuzzySuggester lazy
providers own visibility gating/memoization for Find and the note composer. The
composer reuses physical-file search; no indexing/storage/scheduler change.

Full verify PASS on requiredNode22.22.2:7/130/lint/1032/131/334/598 plus realbuild
and native smoke. Native folder/composer10+reload, full action8/51native keys,
Find8queries/6navigations and actual new/existing-modal visual inspection PASS.
Source/test changes are complete; only native-driver fixes followed full verify.
Failed setup/driver controls are retained, including absent fixture, suggestion-
first Escape, and the former premature property-existence wait. Saved-file proof
and exact-target metadata wait preserve the original deadline; two arrival gaps
were observed without production writer failure.

Private raw prefix `%TEMP%/kplex-composer-feedback-`: verify1792312440827,
folders1792313724282, actions1792313842792, find1792313880908,
preview1792313914841, sanity1792313974005.json. Current exact staged main SHA
bed178e785babad2d2070097fbd291fd1a85cfe78d6add0be5e626b1838d4555.
Final sanity restores107files/88Markdown, configuration, no controllers/dialogs,
desktop and captureFALSE. Do not publish/delete raw evidence or archive HANDOFF.

Next: final diff/check; commit/push this scoped checkpoint; record exact final CI
and append-only private evidence backup in PR. Do not create another code change
just to record CI. Physicalmobile/macOS/minimum-host/OSdrag acceptance, native
large-vault latency savings, the separate gate/filter failure and original
unreproduced freeze remain limitations. Preserve previous evidence backups.
