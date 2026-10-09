# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.



---

# Accepted locally — dense note patch search allocation

No active offline assignment. Root independently reviewed the frozen return, registered the
five-test suite, measured the correction and completed full/native verification and cleanup.
Branch: `fix-dense-patch-responsiveness`, base main
`79a665afe65d47d981c7ea031355047542fe6ae5`. The maintainer has now authorized
commit/push/PR/merge and return to updated main.

`GraphIndex.makeSearchEntry` avoids URL title-cache/signature allocation and empty-alias
Set/array work while preserving exact vocabulary, title policy, canonical references and
synchronous atomic publication. Ordinary note title ownership and all cancellation/lifetime
boundaries remain unchanged. C14 structural refactoring remains paused.

Full `verify:obsidian` passed on pinned Node 22.22.2 and frozen 319-input source
`c33593820d50d97395bf6287762e20ce499aee9058c638ee55d5a6b564ec2ff3`.
Real type/scanner/build and all architecture/core/aggregate/UI/source/browser lanes pass.
Exact installed `main.js` SHA:
`cf1c2179626f730491696813da805d279e01c58ca78d44db1eabc8c192c91892`.

Serial local dense-fixture median longest timer gap improves 35.693 → 26.472 ms with the
unchanged guard. Matched native 20,000-entry helper median improves 8.1 → 1.4 ms, allocating
zero URL title-cache entries versus 20,000. Exact-build native dense-note publication, canonical
search/relationships, cancellation, retry and alias updates pass. Original disposable-vault
state/configuration bytes were restored with delayed SHA readback; no probe notes/controllers
remain, no native errors were captured, and the sleep inhibitor was stopped.

Durable findings, retained temporary-harness failures, receipt locations and measurement limits:
[validation record](docs/validation/dense-patch-responsiveness-2026-10-09.md) and
[Refactor plan](Refactor%20plan.md).

Remaining limitation: GitHub Ubuntu CI must verify the published branch. Its original failure
was not reproduced locally; reduced measured allocation work is not proof that the remote timing
failure is resolved. Root owns the authorized repository actions and records CI results in the PR.
No physical-device performance or paint/input latency claim is made.
