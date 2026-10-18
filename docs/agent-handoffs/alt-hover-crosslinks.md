# Temporary PR seed: Alt/Option hover crosslinks

Prepared by **Zsolt's Codex Agent**, 2026-10-18.

**Status: implementation handoff only; no runtime change.** The draft PR for this branch owns the implementation plan and acceptance criteria. Remove this temporary marker before final review; do not archive it or replace the root HANDOFF.md with it.

- Workspace: `2026-10-18-alt-hover-crosslinks` in `zsviczian/kplex`.
- Base: `main@8f702d9c6dfcb70921a1bd5c15087af70e7f2156`.
- Requested behavior: Alt/Option + gate hover temporarily reveals and highlights all otherwise eligible crosslinks starting or ending at that gate; Alt/Option + node hover does the same for that node, even with Cross-links disabled.
- The override is presentation-only: restore normal visibility on modifier release/hover retirement, preserve filters and clipping, and do not persist settings, rearrange nodes or acquire/index sources.
- Related, broader request: [#20](https://github.com/zsviczian/kplex/issues/20). This does not implement neighborhood reflow or close that issue.
- Coordinate with unmerged [#177](https://github.com/zsviczian/kplex/pull/177), inspected at `dd4ef63f9542df562b227890e2fbc129d5658da7`; recheck its gate, native-drag and view-lifecycle changes before implementation.

Follow AGENTS.md, CONTRIBUTING.md, docs/ARCHITECTURE.md and docs/agent-workflows/issue-resolution.md. Continue this same branch and PR. Runtime implementation, automated verification and native acceptance remain pending.
