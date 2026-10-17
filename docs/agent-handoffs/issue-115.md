# Temporary plan-only handoff for issue #115

Prepared by Zsolt's Codex Agent on 2026-10-12. P2 investigation-to-fix handoff; no confirmed rendering cause yet.

- Issue: https://github.com/zsviczian/kplex/issues/115
- Prior assessment: https://github.com/zsviczian/kplex/issues/115#issuecomment-6109391537
- Base: `main@b2abcbaf15ed3c6c52fecd84dd225ca7265be361`
- Workspace: `2026-10-12-issue-115-label-sharpness`

The associated draft PR holds the updated source assessment, probe matrix and acceptance. Distinguish transient motion from persistent idle text blur. Current ElementMotion already uses fill:none and releases completed effects; do not invent a stale-fill diagnosis. Measure owning-window transforms, active effects, zoom and display scaling, then make only an evidenced correction. No global GPU disabling or unrelated typography redesign.

Before offline transfer, put the plan and actual captured visual/runtime evidence in the single root `HANDOFF.md`, preserving its standing header. Supply evidence locally. Follow `AGENTS.md`, `CONTRIBUTING.md`, `docs/AGENT_WORKFLOW.md` and `docs/agent-workflows/issue-resolution.md`; offline access to GitHub/Obsidian is not assumed.

Return uncommitted changes, actual checks and architecture/reuse/TSDoc self-review, or a precise host-probe request if no cause is established. Coordinate camera/render changes with the maintainer's active #140 without duplicating it. Native pixels and device behavior require their own evidence; DOM assertions alone cannot prove sharpness.

Remove this temporary file before final review. Keep draft until validation or explicit limitation acceptance. Do not claim a fix without reproduction, close the issue merely because this PR exists, merge or release without authorization.
