# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# PR177 — validated and pushed startup follow-up

Main validation agent; branch2026-10-17-navigation-and-native-drag. Feature1941b48 and docs dd4ef63 pushed; dd4 CI green. Startup runtime/test
checkpointba8ad7e7b1ad7d714edc2340f330e5f706e723d3 pushed and validated. Commit/push authorized. Keep PR177 DRAFT;
no merge/release, no personal vault access and no comparative performance tests.
Small only. Native/browser lanes serial; no independent CLI probes while polling.
No native/browser driver active. No subagents.

Two follow-up fixes validated: GraphIndex.publishOnDemandHostScope retries only
superseded private preparation under existing demand/finality/budget ownership;
main.finishStartupIndexPreparation joins initialization after restore classification
then queues real remaining visible/complete/live backlog via existing scheduler.
No new scheduler, schema, parser, classifier, polling or source-proof relaxation.

Causal trace1792336984693 reproduces missing Parent: gate0->1 retires first host
cover, ordinary new-target patch needs-rebuild, current task drains with no cover.
Trace1792338821140 attributes writer to actual publishUrlSearch. Exact dd4 source
negative control1792338661957 fails2 Parent cases, passes2 cancellations, restores
candidate bytes. Four real GraphIndex/IDB regressions cover eager/on-demand retry
and cancellation. Trace1792339143489 separately observes dirty startup:no-snapshot
without work after local initialization finishes while Sidecar restore awaits.
Startup regression preserves newer edits and closed/unloaded/incomplete/clean gates.

FINAL full verify:obsidian1792339241307 PASS Node22.22.2: architecture7/core130/
lint/Node1058/UI142/source334/browser612/build/native smoke. All4 changed source
hashes match the run. No private trace instrumentation in source or bundle.
Exact native reference matrix4 each: both1792340401520, Sidecar1792340411889,
Properties1792340422330, closed1792340432438; all PASS, including stationary
Parent/plugin restart, timer receipt, genuine-idle prerequisite and recovery.
Styles15(1792340442402), trusted Sidecar gate-close8(1792340449543), held-P3
foreground live-updates(1792340458120), structural12(1792340462722), layout6
(1792340515852) PASS. Configuration/workspace and owned fixtures restored.
Sanity1792340561280 confirms107files/88Markdown, matching deployed artifacts,
no controllers/dialogs, desktop and opening CLI capture off.

Main b5d453d57bb1b21963a32f161591efb4a951a88dc1093dddf3860c6d8b28c1ef;
CSS9664241e9e87f357ebfa57fcfe5477a5b8f592db4e4bbbb53f65db680dd6a7c0;
manifest19d9ecce5557733e0ff0f2e27155e635c30158c3cfa6fbca0f11c16e4dedfd2c.
Build dd4ef63.dirty, Windows11/Obsidian1.14.4 installer1.14.0/Electron43.3.0.

Earlier raw failures remain private, never relabeled as passed. The reported whole
application Save/Settings-close freeze with normal center and Markdown Sidecar
remains unreproduced; the retired-control guard and these startup fixes do not
prove it solved. Remaining affected full-process/macOS/minimum-host/physical
mobile/touch/IME/OS-drag/Bases-tag-cell acceptance stays pending.

Private durable backup1792340626104 verified outside Temp:685files/38,971,887bytes,
sourceZIP541 entries/CRCs/per-file hashes, HANDOFF excluded. MANIFEST
57c5c60589a7ce06d73d55ed49323eb8cb0d9d8cec1025381351eafe2b8ff8d5.
Originals and prior backups retained; no raw publication. Remote CI forba8ad7e
is running at16:24UTC, not claimed green. Evidence is pinned in the report. Recheck exact remote head/CI on resume; no
uncommitted runtime work or additional benchmark is required. Keep
PR draft and report unreproduced full-app freeze/platform limitations candidly.
Report docs/validation/navigation-and-native-drag-2026-10-18.md; ledger
Refactor plan.md. Private helpers use Node22.22.2 and explicit Small variables.
No further implementation is required solely for closeout; no claimed resource
savings or broader startup/freeze resolution.
