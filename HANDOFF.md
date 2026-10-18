# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# PR #177 appearance checkpoint and stationary-startup follow-up

Branch2026-10-17-navigation-and-native-drag; parent a9e5a8620afdd2ba772b6483d1f1c3a2afaa21cc.
Regular validated commits/pushes authorized; PR177 remains draft, Closes157/Refs175.
No merge/release/personal vault. No comparative performance tests (HandBrake).
Native/browser drivers serial, prepared kplex-test-small only; foreground permitted.

Appearance checkpoint is validated: shared native searchable color-source chooser
with existing Light/Dark swatches for theme/current custom variables and named
pairs; existing node-style border-width/gate-radius controls, all eight locales,
exact/inherited source/legacy records and field-level merge. No production indexing
change in this checkpoint. Full verify1792321482318 PASS Node22.22.2: architecture7/
core130/lint/Node1048/UI135/source334/browser602, actual build/native smoke.
Native color28 (1792322740105), style15 (1792322777292) and focused single-Plex
Properties-closed/open Save+restart2each (1792322856204/1792322867808) PASS.
Sanity1792322883091 restores107 files/88Markdown, exact config, no controllers/
modals, desktop, opening CLI capture false. No driver currently running.
Artifacts: main32704b03fb222562073caccf1722c713dbc266403ad5d3cd694e586426619d7a,
CSS9664241e9e87f357ebfa57fcfe5477a5b8f592db4e4bbbb53f65db680dd6a7c0,
manifest19d9ecce5557733e0ff0f2e27155e635c30158c3cfa6fbca0f11c16e4dedfd2c.
Build carries a9e5a86.dirty; runtime source unchanged after full validation.

Commit/push this validated checkpoint, preserve verified private evidence/source
backup outside Temp without publishing/deleting originals, update PR description.
Existing prior backup1792320576325 remains; HANDOFF must never be archived.

LATEST USER: current build still starts with few central children and remains
stationary/incomplete until away/back. They explicitly authorize a pragmatic
watchdog that rechecks the visible center after a few seconds, repairs incomplete
coverage and records diagnostics in the existing index diagnostics report.
Root has acknowledged: bounded, current-center-scoped, lifecycle-owned; record
before/after proof/outcome, cancel on navigation/close, no full-vault rebuild or
polling loop. Preserve appearance as a separate commit. Continue causal investigation
of restore-to-visible-demand/publication race in disposable fixtures only.

Existing positive cases do NOT fix/reproduce either startup symptom or style Save
freeze. Four held-source-authority/demand-before-after/offline-Parent/policy cases
now pass in foreground-startup-indexeddb. Native source trace in styleOperations
reference-only mode is test-only and records function names, no note payload.
The failed first source-count guard crossed fixture startup; waiting local drain
passes0 acquisitions during Save. Supplied diagnostic attachment reports Eager,
non-authoritative saved-preview/source-authority, demanded center1 and no active
local scope task; no color-induced semantic cause is established. Its device field
says macos; current native validation is Windows. User confirms only one Plex,
Properties perhaps open. Do not infer a new source format/reader-sharing design.

Relevant owners: GraphIndex.acquireSemanticDemand/ensureOnDemandCenter/
ensureSemanticScope/publishHostMetadataPreview/retryDemandedSemanticScopes;
PlexGraph's demand effect and memoized neighborhood; App's index/presentation
subscriptions and pending-document handover; existing index diagnostic decision
contracts/sanitization/export. Inspect completion proofs before choosing a bounded
retry. Keep source authority/epoch/identity and no-write safeguards.

Remaining platform/workflow gaps stay in feature report. C14 accepted/paused.
