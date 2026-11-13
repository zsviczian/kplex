# Standing instructions ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in the issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.






---

# Current result: compact creation UI and startup optimization

Checkpoint committed first as requested: ae558b7ccf0cc817b11779b78a30c52710ca1f90 on 2026-11-12-authoring-workspace-bundle. Follow-up changes remain uncommitted. No push/merge/production deployment. Final normal local build is installed only in approved Small.

## Implemented and reviewed

Shared KplexModal now owns exact body-portal suggestion identity and popup-first Escape. Template pointer selection no longer invalidates its parent. Explicit popup dismissal restores committed template text without blur. Shared FormField/Select gives Name/Alias/Folder/Action growing inline inputs; shared CreationTypeTabs gives responsive Template/create-action row, selected-type status and independent drafts. Ineligible physical-property direction is hidden. All3 creation surfaces use the shared owners. Last-tab preference and partial-file recovery remain intact. All8 locales and affected docs updated. Long unbroken-title wrapping has executable regression coverage.

Startup: built-in translation catalogs prepare only the requested exact/base locale, lazily once into owned immutable snapshots. English does not validate unused languages. Explicit injected maps still fully validate every time. Main keeps early native views/API/commands/source fences and tab instance, while Settings registration moves after workspace readiness through one cancellable main-window task. Explicit navigation flushes registration; unload/exact-owner/error/retry/once guards are covered. No GraphIndex, source acquisition, semantic policy, cache schema or persistence policy changes.

## Source/build acceptance

Node22.22.2. Architecture/core/Obsidian lint and native harness77 PASS. Focused source342 and startup/localization41 PASS. Actual installed Obsidian types, release/local/profile builds PASS.

Aggregate attempts retained honestly: x20L1Z stopped on stale intentional UI static contracts; pfN3IR stopped on finite fixture's missing real FolderPathInput dependency. Only feature-specific expectations/closed dependency inventory changed; semantic goldens preserved. Final aggregate startup-full-verification-current-U0MyX4 passed source/indexing2380/2380 and browser574/575, then stopped on Chromium document-loading timeout in canvas-view-selector. Unchanged failed case rerun passed2721ms. Every unreached gate then passed in startup-full-remaining-gates-kWJhCu: source owners362/362, source/browser owners1032/1032, release/local builds. Original aggregate invocation remains FAILED, not retroactively passed.

Runtime inputs stayed unchanged, hash8fc9fad21bf5c1d82de7baa7048f731fcdf8593a5d4df691223260b0933acc4b. Frozen exact final local artifact in startup-full-remaining-gates-kWJhCu/native-candidate:
- main8215af06e9e4c544f80e5e980003d06efdd361ad85a0f603b97cd3880ef43a01
- CSS8188d204efa48384c616c32f8e7a546c82e5548b4136eeb525c06341922e3909
- manifestdd5c24bca596d39dcfeda4adaac6649fdaa3d2a3cfd905b315c63c64f28b2efb

## Exact-build native UI acceptance

creation-compact-native-nJGupX PASS: all3 forms in main and real popout; light1160/dark360 geometry; real pointer template selection and popup-first Escape; independent type drafts, unavailable fallback, actual Markdown template, Settings folder autocomplete and last-tab preference across actual plugin reload. Excalidraw availability injected for UI only. Actual wide/narrow screenshots reviewed. Long-title English/German900/360 browser cases4/4 PASS (creation-long-title-fixed-SIYsai).

Independent native restoration PASS: exact layout/settings/MRU/inventory/windows/configuration bytes and native leaf states, including File Properties retargeting after layout writers. No dialogs/controllers/owned fixtures remained. Original98Markdown/117physical files, ready98/98, no active work or pending save. No physical mobile/macOS acceptance claimed.

## Startup measurements and limits

User report: Brain20462files, plugin load3402ms, indexing acceptable. Small98Markdown/117physical files is a functional phase test and does not reproduce that production latency. Source0.4.3 and branch base7ad3d43 both eagerly validate bundled locales and synchronously addSettingTab; lang/index.ts has no released-to-base change. Measured contributors are not proof of the whole3.4s cause.

Same Small configuration bytes (36771bytes, SHA25623c11db79e8c65f94765d0e61b5eef1b8476b49378e76d07726c541de6933b0b):
- Clean app-reload baseline35eEDI: constructor60.3/54.2ms, onload140/100.3ms, translator40.7/41.2ms, definitions44.5/42.3ms, loadData46/6.8ms.
- Final actual app reload npRKvc: constructor0.4/0.5ms, onload23.3/93.8ms, translator0.1/0ms, loadData11.3/81.1ms. Settings definitions absent from initiation receipts, Settings registered after readiness. Both renderer timeOrigins changed. Module eval27.6/39.9ms versus baseline19.5/17.9ms; do not hide this noise.
- Warm enables final pChKfT host289/242/260ms versus baselineSPNqlV283/205/241ms: no overall warm-enable improvement demonstrated, because loadData increased to128-133ms. Constructor0.3-0.7ms and translator0.1ms; definitions excluded from initiation. Do not claim all plugin-load timings improved.
- Portable matched English translation construction31.19ms ->0.002ms, first English0.168ms; de/ru first8.5/9ms then cached<0.001ms.

Test-only profile candidateQWmkwQ main1ed1b68b415ebc1e4418770523ce67c2dbb06023addcbce93f79b289a74fe41a uses matched baseline CSS for timing control; product TS499 source hashes match8GHKos, only later product CSS wrapping differs. Profiler preserves calls/awaits, bounds128events, owns/removes its controller. Each final profiler restored exact normal executable/config/workspace and verified no profile controller. Earlier app-baselineiFQm8U audit failed on removal of dormant unregistered false Templater ribbon entry; raw bytes preserved; fresh canonical baseline35eEDI passed. Retain earlier failure.

## Restart/cache safety acceptance

startup-final-native-restart-Ow6D1J PASS against final normal artifact: existing authoringWorkspaceRestart driver created owned custom ontology/topology, naturally activated complete saved graph, then2consecutive unchanged actual Obsidian app:reload cycles. Both retained active generation/settings signature and full-snapshot route, with ZERO sourceInventoryPasses/fullBuildStarts/nodeCatalogStarts/completeSnapshotSaves/checkpointSaves, vaultReads/parses/repairs/resolutionRefreshes, semantic full builds/dependency replay, repository source activations and URL reads.

Pending-save application reload recovered added owner pair with4changed/dependent checks, zero reads/parses/full builds/inventory passes, and exactly1complete save activating a new matching-policy generation. Next unchanged app reload reused it with all zero-work assertions. Driver cleanup and independent outer native/config/inventory/MRU/windows/artifact audit PASS. Final readiness98/98, no work/save pending. Application renderer reload retained Electron process; do not describe this as a full process termination/launch or physical paint measurement.

Shared Obsidian user-data lock was respected. Waited for external Excalidraw runner per user's instruction; never killed/overrode its process/lock or closed its window. User closed foreign vault; actual single Small window3 verified before final measurements/reloads.

## Remaining scope limits

Production Brain20k load-time improvement, physical phones/tablets and macOS remain UNVERIFIED. Broad source/IndexedDB cases cover invalidation/failure/retry/late repair; native acceptance here covers Small custom ontology/topology and pending-save restart, not every production-scale/idle-wake combination. No claim of production3.4s resolution or release readiness beyond this evidence. Further production deployment/restart/mutation needs its own authorized scope.

Validation output remains managed ignored14-day storage, no new committed report. Final independent audit w1qpZD passed all507runtime input hashes and equality of dist/frozen/installed artifacts; normal Settings registered, no profiler/probe/restart controllers, only Small window3, original98Markdown/117physical files and ready/no-pending-work. Validation prune/check and git diff --check PASS. No new commit unless requested.
