# Temporary authoring and workspace bundle handoff

**TEMPORARY — implementation plan only; no runtime changes or completed fixes.**

Prepared by Zsolt's Codex Agent following the maintainer's November 12, 2026 decisions.
Branch: `2026-11-12-authoring-workspace-bundle`.
Accepted starting point: `main@a560655902d00ed0ac23462d7c8d464ab0e165fd` (merged PR #301).
The draft PR on this branch owns the detailed implementation and acceptance plan.

## Included issues

| Issue | Intended outcome |
| --- | --- |
| [#290](https://github.com/zsviczian/kplex/issues/290#issuecomment-6823099803) | Preserve explicit Challenger evidence when an unresolved target becomes a file. Reproduce first. |
| [#299](https://github.com/zsviczian/kplex/issues/299#issuecomment-6823104567) | Permit an explicit relationship where only inferred evidence exists, without duplicate declarations. The reported cause remains unconfirmed. |
| [#184](https://github.com/zsviczian/kplex/issues/184#issuecomment-6823118065) | Verify and fix singleton connector labels only if the current reproduction fails. |
| [#124](https://github.com/zsviczian/kplex/issues/124) | Allow the existing command-palette tab action on phones; preserve the sidebar as the generic/default destination. |
| [#118](https://github.com/zsviczian/kplex/issues/118) | Release Sidecar ownership on unpin/Off/Recent while retaining the same native document tab and adjacent group. |
| [#33](https://github.com/zsviczian/kplex/issues/33) | Optional reciprocal document-property writes through existing paired ontology and mutation owners, with truthful partial-failure handling. |
| [#252](https://github.com/zsviczian/kplex/issues/252) | One searchable Template picker combining configured-folder Markdown templates and existing Excalidraw templates, with explicit type/creation semantics. |

## Execution boundaries

Implement in independently reviewable stages: relationship regression fixtures; phone/Sidecar workspace behavior; reciprocal writes and unified template selection. An already-passing reproduction needs evidence, not an invented runtime fix. Current sync-mode code already releases Sidecar ownership; verify all relevant UI/lifecycle paths before modifying it.

Use the existing shared controls, native creation barrier, relationship writer and semantic owners. Retain exact-file identity, cancellation, settings compatibility and existing Excalidraw template selections. Template discovery must not execute templates or admit semantic indexing work. Define supported template execution and exactly-once precedence before writing the adapter; do not promise compatibility with arbitrary template plugins or restore the withdrawn note-type/template coupling.

Reciprocal writes are opt-in, default off, and scoped to explicit K-Plex authoring operations. Do not mirror all vault relationships, manufacture missing targets, edit Markdown sections, or maintain a background synchronization service. Surface failures between the two file writes without claiming atomic rollback.

Excluded: #250's separate view-coverage investigation; #292, #198 and #77 follow-up reports; deferred #133 privacy, including node properties from #297; rejected #125 section authoring; unrelated draft #223; structural refactoring, broad indexing optimization and releases.

## Handoff and acceptance

Read [AGENTS](../../AGENTS.md), [CONTRIBUTING](../../CONTRIBUTING.md), [coding standards](../../CODING_STANDARDS.md), [UI rules](../../UI_RULES.md), [issue resolution](../agent-workflows/issue-resolution.md), [mixed-agent workflow](../AGENT_WORKFLOW.md), [template creation](../TEMPLATE_CREATION.md) and [validation retention](../VALIDATION_ARTIFACTS.md).

Keep the root `HANDOFF.md` as the sole transient local assignment/return. The offline agent returns uncommitted changes unless separately authorized. The validation agent independently checks the final diff and exact artifact. Use Node 22.22.2, actual installed Obsidian types, focused regressions and applicable repository/native gates. Apply all mandatory indexing/persistence acceptance gates when the actual changes affect those owners; do not weaken them or claim physical-device coverage from emulation.

Remove this temporary file before final review; do not archive it. Keep the PR in draft and the implementation issues open until their actual acceptance is established. Merge and release require separate authorization.
