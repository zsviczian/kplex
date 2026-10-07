# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Add node style — accepted, handoff inactive

Direction/state: main validation accepted the offline implementation and independently corrected
one native-discovered serialization issue. No next assignment or Git action is authorized.
Base main4a9bde9; changes remain uncommitted. C15–C26 paused; production vault untouched.

Add style now offers Property value / Tag prefix, preserves appearance draft on switching,
normalizes new/renamed tag prefixes to exactly one hashtag, and saves each family to its existing
dictionary. Edit family is fixed; unchanged imported keys/alpha/inheritance/order remain intact.
No new resolver, index behavior, cache schema, CSS or persisted-key migration.

Main fixed unchanged Save adding an empty label-prefix override: absent unchanged fields remain
inherited. Exact JSON and real resolver-inheritance regression pass. Failed first native attempt,
cleanup nuance and second notification-diagnostic failure are retained in feature evidence.
Read-only offline review independently approved the serialization correction and attribution.

Final 278-input hash `65d4c667456f8ab87034ae8492e847cd7280eff8281e6f34d80cf61324dc1ea7` passes
complete npm run verify on Node22.22.2:7/69/297/18/333/410 checks, no browser failures/skips/
cancellations, scanner0errors/one unchanged warning, real production build. Mandatory20,015-owner
publication passes271.810s. Exact main.js `236399f5df626eb52286bbe00ca62107a295b4345b2ef81e8e50e397a206c5cc`
passes serial native smoke and all four actual-form creation/edit/preservation scenarios on
Obsidian1.14.4 in kplex-test-small. The tested artifact remains deployed there. Exact original
settings/enablement bytes restored, dialogs/controllers/wrappers removed/restored; no notes edited.

Existing On-demand settings refresh recomposes local graph scopes (27 notifications observed).
Native actual full-index rebuild calls0 and policy unchanged; do not claim zero local graph work.
Desktop functional acceptance complete; no physical-mobile or performance/paint claim.

Durable progress: [Refactor plan](Refactor%20plan.md).
Feature [report](docs/validation/node-style-kind-2026-10-07.md) and
[evidence](docs/validation/node-style-kind-2026-10-07.json) retain exact checks, failures and limits.
