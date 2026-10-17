# Temporary plan-only handoff for issue #144

Prepared by Zsolt's Codex Agent on 2026-10-12. P1 bug handoff; no measured performance fix yet.

- Issue: https://github.com/zsviczian/kplex/issues/144
- Base: `main@b2abcbaf15ed3c6c52fecd84dd225ca7265be361`
- Workspace: `2026-10-12-issue-144-ontology-input`

The associated draft PR contains the assessment and execution/validation plan. Keep ontology typing local and responsive, coalesce committed changes, and preserve correct final semantic publication. The legacy saveSettings boolean does not force a full rebuild; do not diagnose a rebuild storm from it. Measure input, persistence and semantic work separately, including the reported background/source-failure conditions.

Before offline transfer, place the current PR plan and required evidence in the single root `HANDOFF.md`, retaining its standing header. Supply input locally and follow `AGENTS.md`, `CONTRIBUTING.md`, `docs/AGENT_WORKFLOW.md` and `docs/agent-workflows/issue-resolution.md`. Do not assume offline GitHub or Obsidian access.

Reuse declarative controls, the settings queue/classifier and current semantic scheduler. Coordinate shared edits with #143 / PR #146 and the maintainer's active #140; do not rewrite their fixes or add a second settings/scheduling framework. Return uncommitted changes, actual checks/measurements and architecture/reuse/TSDoc self-review for independent main-agent validation and authorized publication.

Remove this temporary file before final review. Keep draft status until applicable checks or explicit limitation acceptance; no claimed latency improvement without comparable measurements, no unrelated feature work, and no issue closure, merge or release solely because this PR exists.
