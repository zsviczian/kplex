# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---


# Inactive — issue #34 startup cache lifetime fix accepted

Branch `fix-startup-cache-stall`, base `2d0ce7b`. The reproduced URL-cache and finite
On-demand catalog/preview lifetime gaps are fixed. The maintainer authorized commit/push/PR/merge and #34 closure. No offline assignment or
refactor checkpoint is active. The next authorized task is a separate URL performance fix.

The date feature was published through merged [PR #94](https://github.com/zsviczian/kplex/pull/94),
and #81 closed with the requested release 0.1.1/PR comment. No release-version bump was made.

Main independently reviewed the lifetime/publication/progress contracts and accepted the
unchanged source freeze of 314 inputs, SHA256
`50eebfbc74ef376e9cc7ee7e919548883db000815df5767293c3d653ce049218`.
Node 22.22.2 full verification/build/staging passes, including all 410 browser-backed tests and
actual Obsidian types/scanner. Focused 46 cases pass (22 lifetime, 17 scheduler, 7 architecture).
Exact main.js SHA256 `7bbcf028ddbcd091ee6292b55e5a43dfb08081b161ae8fc94a3beb79a86933a0`.

Six real-time small-vault native timeout/unload cases pass, late results remain fenced, and
independent emulation/desktop recovery reaches ready 73/73. Original driver/recovery failures
are retained rather than relabeled. Large On-demand healthy progress exceeds 90 seconds and
actual unload settles shared/public waits. Same-build Eager restart finishes with visible
ready 20,015/20,015, completed hydration, full canonical physical membership and search. Its
original CLI timeout receipt remains failed; independent same-run continuation passes.

Both vaults' configuration bytes/existence, preferences, workspace, dimensions, throttling and
desktop state are restored, with controllers removed. Tested artifacts remain installed.
No required manual tests remain for this async lifetime change. Physical-device touch/paint,
exclusive performance attribution and global cross-mode semantic parity are not claimed.

Accepted evidence and limitations belong to
[the durable investigation](docs/validation/issue-34-hydration-investigation-2026-10-09.md)
and [Refactor plan.md](Refactor%20plan.md). Healthy URL reconstruction cost, dense-center
count-cover limits and existing remote CI timing-guard failures remain separately documented.
Do not weaken timing bounds or automatically pursue a performance optimization/C15–C26.
