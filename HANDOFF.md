# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

### Handoff template

#### Current transfer

**State: inactive — template only; no implementation or investigation assignment is issued.** Replace the body from this section onward when a concrete assignment is selected.

- Sender → recipient: specify offline development agent or main validation agent.
- Kind: implementation / investigation / trace analysis / host probe / return review.
- Objective and user-visible expected behavior or investigation question:
- Base commit/branch and initial dirty files: record actual values; state when Git metadata is absent.
- Input/diff/patch/source identity and prior evidence links:
- Actual capabilities: Node/npm, installed packages, browser, network, Git; Obsidian/CLI only for equipped recipient.

#### Scope and architecture

- Existing owners/contracts, callers and required reading:
- Allowed changes, excluded work and preserved behavior:
- Product decisions, compatibility/schema/default/command effects:
- Invalidation, lifetime, cancellation/publication and workspace/device risks:
- Practical independently reviewable steps:

#### Acceptance and validation ownership

- Offline portable/build/browser checks and expected assertions:
- Pending main-agent exact-build/native scenarios and expected assertions:
- Physical/manual checks, priority, expected outcome and why automation cannot cover them (or none):
- Required environment/fixture/settings and source/artifact identities:
- Cleanup requirements and owner; accepted limitations are assignment-specific:

#### Debug/trace packet or host probe request — when relevant

- Minimal reproduction and question distinguishing the hypotheses:
- Build/source/fixture identity, relevant environment and phase/revision/readiness:
- Actual observations/trace excerpts and expected versus observed behavior:
- Larger minimized trace path/attachment and hash; ensure the recipient receives it:
- Harness effects (scheduling, gates, emulation, throttling, timing units), failures/incomplete capture:
- Observations versus hypotheses, requested analysis/output or precise additional host probe:
- Temporary diagnostics and restoration/removal status:

#### Recipient return — replace placeholders with actual results

- Changed files/actions and relevant diff/source identity:
- Findings and implementation decisions; separate inference from verified runtime observations:
- Actual commands, versions, outcomes and evidence paths:
- Failed/unavailable checks, precise reason and reviewer rerun instructions:
- Scope deviations/remaining risks and any compatibility-facade caller/retirement changes:
- Temporary files/hooks/settings and cleanup status:
- Next recipient and requested action (main review, bounded host probe, more offline analysis):

## Main-agent acceptance — fill after independent review

- Review fixes and final source/installed artifact identities:
- Required automated/native evidence and remaining coverage limits:
- Prioritized manual tests/results or explicit maintainer acceptance of limitations:
- Durable tracker/report/issue/PR updated:
- Repository action authorized/performed and remaining action:
- Final state: accepted/inactive or named pending work; no automatic refactor resume.

---

<<insert handoff content here>>