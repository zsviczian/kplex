# Standing instructions ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# Restored-center investigation only

**State:** prepared; Zsolt's Codex Agent to the investigation agent. This assignment
replaces the inherited PR180/181 sequence on this branch only. It does not authorize
resuming those tasks, fixing the startup bug, or merging any PR.

## Identity and parallel-work boundary

- Repository: `zsviczian/kplex`.
- Workspace: `2026-10-18-startup-center-investigation`; PR target: `main`.
- Frozen source baseline: `e95d3db9752de165bae52ebe21646f73acd00849`, also the
  reported build's source identity. Includes merged #177 and #180.
- Initial changes: this handoff and the temporary
  `docs/agent-handoffs/startup-center-investigation.md` marker only. No runtime,
  fixture or diagnostic change has been made; no new native test has been run.
- Read this branch's draft PR for the full hypothesis, probe and completion matrix.
  Recheck the actual remote head and local dirty files before beginning.
- Use a separate checkout/worktree, build output and report directory. Do not
  update #147, #176, #179, #181 or #182, copy their unmerged code, or edit main.
  Native deployment, debugger access and restart tests on one Obsidian process or
  vault must be serialized even when source analysis proceeds in parallel.

## Question and supplied evidence

Why can a center restored with Obsidian remain empty/incomplete until navigation
away and back, more frequently for busy nodes with many placeholders? Determine
whether facts were unavailable, a publication replaced usable state, a foreground
request lost its continuation, or the UI failed to consume a valid publication.
Do not assume the earlier watchdog hypotheses are the cause.

The maintainer supplied two overlapping captures, not independent reproductions:
macOS, Obsidian API1.14.4, K-Plex0.1.3+e95d3db9752d, actual Eager mode,
background URLs and Responsive pacing, denominator11,839. The later surface is
reported as a tab. Center identity, exact neighborhood shape, focus/visibility,
Sidecar/Properties state and restart method are not established by these reports.

| Session observation | First capture | Second capture |
| --- | ---: | ---: |
| Age, milliseconds | 70,072 | 158,074 |
| Status | loading-cache | loading-cache |
| Graph nodes / published Markdown | 27,206 / 8 | 303 / 10 |
| Hydration phase | metadata | source-authority |
| Demanded centers | 1 | 1 |
| On-demand / semantic-scope / gate tasks | 1 / 0 / 27 | 0 / 0 / 0 |
| Source inventory passes / full build starts | 0 / 0 | 1 / 0 |

The current-run watchdog check ended pending at about6.3s: missing before/after
coverage, zero role vectors, source not ready, work active at entry. Host preview
was first marked at61,623ms, local baseline at67,001ms, center request at67,665ms,
saved preview available at76,464ms. The later source host-metadata comparison is
4,004/11,839; this is NOT the acquisition checked counter, which is10. Background
source/hydration work is still active at the second capture.

No after-navigation or post-source-completion trace was supplied. The node-count
change does not prove deleted data; trace the actual publication/read owners.
Persisted decision history spans older sessions. Missing later receipts and null
optional milestones do not prove an event or patch never occurred. Zero role
vectors do not distinguish an absent center from a center with no shown neighbors.
The raw attachments are not committed or assumed present in the agent checkout;
the PR contains the minimized evidence needed to start synthetic investigation.

## First work package

1. Read the PR, repository instructions, `docs/ARCHITECTURE.md`,
   `docs/AGENT_WORKFLOW.md`, `docs/INDEXING_DIAGNOSTICS.md` and
   `docs/OBSIDIAN_RUNTIME_TESTING.md`. Inspect actual source/tests and the #177
   startup validation record. Preserve its existing host-cover retry and backlog
   fixes rather than rediscovering them as missing.
2. Build a source/await map from native restore and App preview demand through
   GraphIndex acquisition/publication, PlexGraph subscription/render and watchdog
   teardown. Identify every early return and its exact next-wakeup owner.
3. Reuse existing foreground-startup IndexedDB, center-recovery and on-demand
   harnesses. Add small controlled characterization/reproduction cases and a
   bounded opt-in trace, primarily outside production source. Compare dense
   unresolved, equivalent materialized and sparse synthetic neighborhoods.
4. Start with actual Eager + Responsive warm restoration, stationary and visible;
   inspect the center before global readiness rather than waiting away the bug.
   Separately test delayed metadata/local readiness, same-path publication
   replacement, pending hide/reveal, source supersession and cap rejection.
   Use On-demand as an explicit control, not as a substitute session setting.
5. Capture before any recovery action, through readiness or a declared bounded
   observation limit, then before/after ordinary navigation. Include a matched
   no-navigation control so elapsed time alone is not mistaken for recovery.
   Do not reindex, clear caches or force a render during the observation arm.
6. Return the causal timeline, reproducible case, hypothesis verdicts, exact
   commands/artifacts/results/limits, cleanup proof and a narrowly scoped proposal
   for the separate fix PR. Stop; do not implement that fix here.

## Diagnostics and safety

Use opaque per-run view/center/task IDs, monotonic times, finite branch-reason
codes and bounded scalar state. Record acquisition versus join versus retirement,
read-owner/publication changes, actual UI-consumed revision, watchdog arming and
all disposal reasons, and which existing event will resume pending demand.
Exporting/observing must not acquire demand, read bodies, rebuild, call repair,
change a return value or add awaited work to a production critical path. Observe
normal getNeighborhood calls rather than repeatedly querying to diagnose them.
Keep trace storage bounded, report dropped events and preserve the first failure.
No raw paths, note contents, settings dumps, private plugins or persistent IDs.

Use existing startup/resource/native process helpers and actual SDK declarations.
Any essential temporary source hook must be observation-only, explicitly off in
normal builds and independently removable. No new production recorder, timer,
settings flag, scheduling policy, persisted schema, authority shortcut or UI.
No behavioral patch, including an apparently obvious watchdog flag correction.

Use an already authorized disposable vault with all three explicit vault variables
and verify its path before writes. Do not touch the personal vault or reset shared
settings/caches. Check native-test ownership before any install/reload/focus change.
Full-process restart needs a safe exclusive host window; plugin reload is not
full-process evidence. Restore artifacts, settings, workspace, fixtures, wrappers,
timers and debugger ownership independently of success. Keep raw evidence private.

Run focused checks on Node22.22.2 with installed dependencies/Obsidian typings.
Run applicable normal verification and exact-build native checks for any executable
instrumentation delivered. Clearly separate an intentionally failing opt-in repro
from passing observer tests; do not weaken default tests, deadlines or goldens.
An offline agent without a host continues source/production-owner work and returns
an exact bounded capture request; it does not claim macOS/native reproduction.

## Required return

Produce one reviewed `docs/validation/startup-center-investigation-2026-10-18.md`
with a compact evidence table, ordered timeline and first diverging owner, supported
and rejected hypotheses, repro commands, actual checks/limitations and the next
fix's owner/test contract. Include a minimized private evidence manifest with
hashes and failure/cleanup state, not a public raw archive. Keep a validated,
pre-armed capture recipe available if the personal-vault symptom remains elusive.
A synthetic lifecycle defect alone is not confirmation of the reported incident.

Return uncommitted work for independent main-agent review unless separately given
publication authority. Remove the temporary marker before investigation closeout;
keep this root handoff transient. Do not create the subsequent fix PR, change
runtime behavior, mark ready, merge, release or close related issues. The maintainer
will select the fix after reviewing the investigation.
