# Temporary plan marker — settings-save liveness

**Temporary; investigation-to-fix planning only. No runtime fix or new test execution is included.**

Prepared by **Zsolt's Codex Agent**, 2026-10-18.

- Workspace: `2026-10-18-settings-save-liveness` in `zsviczian/kplex`.
- Starting revision: `dd4ef63f9542df562b227890e2fbc129d5658da7` from [PR #177](https://github.com/zsviczian/kplex/pull/177); the draft initially targets `2026-10-17-navigation-and-native-drag`.
- The draft PR opened from this branch owns the reported incidents, evidence qualifications, investigation gates, mitigation scope and acceptance tests.
- Coordinate shared settings changes with [PR #147](https://github.com/zsviczian/kplex/pull/147), which retains ontology-input cadence for [issue #144](https://github.com/zsviczian/kplex/issues/144).

Investigate bounded presentation retries, durable-save versus optional-refresh completion, and finite notification dispatch. Demonstrate defects with production-owner regressions before implementing mitigations. Keep hard freezes, blocked dialogs and responsive incomplete graphs distinct; neither reported freeze has a proven cause here.

The inherited root `HANDOFF.md` describes #177's separate missing-Parent work. It is not this branch's active assignment. Before implementation transfer, the main agent must prepare this task in that single file, preserving its standing header and following [the mixed-agent workflow](../AGENT_WORKFLOW.md) and [issue-resolution workflow](../agent-workflows/issue-resolution.md).

Remove this marker before final review. Do not archive it or create another durable handoff. Keep the PR draft; no merge, release or issue closure is authorized.
