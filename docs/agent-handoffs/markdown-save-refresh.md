# Markdown-save refresh — temporary draft-PR marker

**Status:** Implementation planning only; no runtime fix is included.

Prepared by Zsolt's Codex Agent on 2026-10-18.

The associated draft PR owns the maintainer's report, technical assessment,
implementation plan and acceptance criteria. Ordinary Markdown saves must not
rebuild the Plex scene or replay node motion when neither graph semantics nor
consumed presentation inputs have changed. Necessary source/provenance updates
and genuine property, heading, styling, sorting or relationship changes remain live.

- Workspace: `2026-10-18-markdown-save-refresh`.
- Starting main: `8f702d9c6dfcb70921a1bd5c15087af70e7f2156`; PR target: `main`.
- Also inspected [PR #177](https://github.com/zsviczian/kplex/pull/177) at
  `dd4ef63f9542df562b227890e2fbc129d5658da7`; it was not merged at preparation.
- Reuse the existing semantic/provenance fingerprints and no-op patch safeguards.
  Trace presentation notifications, dependency refresh and actual scene/motion work
  rather than assuming every wiggle is a full index rebuild.
- Coordinate shared presentation code with
  [PR #179](https://github.com/zsviczian/kplex/pull/179); settings-save liveness is
  a separate assignment, not part of this fix.

Follow [the draft-PR workflow](../agent-workflows/issue-resolution.md) and
[the mixed-agent workflow](../AGENT_WORKFLOW.md). Recheck current main, #177 and
this branch before implementation. Continue this same branch and PR. Use the
single root `HANDOFF.md` for an actual implementation transfer; this marker is
not a second handoff. Remove this temporary file before final review, without
archiving it. Keep the PR in draft until implementation and validation are complete.
