# Standing instructions ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# PR147 implementing ontology input commit cadence

Maintainer authorized merge182 without waitingCI, then implement147.182merged
658793fe16896f2ae02f7e531ede5d1849077b2e; mainupdated; existingbranch
2026-10-12-issue-144-ontology-input integratedmain183a948 andpushed, no rewrite.
Keep147draft, no merge/release/personalvault/subagents/comparativeperformance.
Foreground Small authorized; baseline107files/88Markdown. Node22.22.2 available.

Issue144/nativecause confirmed, not a reproducedMacfreeze: Small actual14trusted
char input events to parentfield caused14native callbacks,12writes,12semantic
invalidations/refreshes,35acquisitions afterblur;0parses. Each half-typed value
enters saveSettings beforequeuedstorage. Baselineprivate log
%TEMP%/kplex-147-native-baseline-1792354767115/baseline.json, exactoldinstalled
dbe5317runtime main.js75177091... source identicalmain658793f. Configurationexact
restored; no fixtures; nativeprobe/controllerremoved. No latency/CPUwinclaim.

ChosenboundedUX: keep native textarea in declarative render; seven fields share
one reusable text-draft mechanic.750msidlecommit, blur/pageexitflush; nevercommit
IMEpreedit. Eachfieldbounded1in-flight+latestdraft, no queuepercharacter; native
value/caret staylocal. Dirtydrafts retained onstoragefailure with explicit Retry/
discard; remote/same-fieldconflicts readonly until discard, no oldA-B-Awrite.
Controls/queuedwrites use182 owner/preflight; submitteddurableoperations outlive
rowclosing but pluginunload retires unsubmittedwork/timers/listeners.

Main adds narrow atomic updateOntologyField through existingenqueueSettingsWrite/
settingsForWrite/writeSettingsSnapshot. Validateopeningfield/remoteowner, persist
before livepublication; mergeonlyfinitefield, preserveotherhierarchy/workflow/
style/action/consent roots. Existingsemanticrefresh remainsoutside diskqueue;
saved-refresh-pending not unsavedretry. No index/compiler/parser/schedulerchange.

Next implement focused draft/nativecontrol and atomicwriter, production-boundary
regressions inclfailedstorage/concurrentfields/slowrefresh/remote/unload/IME.
Then realnative typing+finalsemantics, appropriate existingnative lanes/fullverify;
finalreport/removeplanmarker, commitpushcheckpoints. Prior180/181 wider matrix
remains deferred tothisPR; run risk-relevant applicablelanes serially, no broad
comparativebenchmark. Keep evidenceprivate and HANDOFFstandingheader; do notarchiveit.
Platformlimits macOS/physicaltouch remain unlessactuallyvalidated.

Checkpoint:13 ontology Chromium cases PASS; affected94 passed before final3
edgecases/copy updates; latestontology/localization36 PASS. Realbuild/types and
officiallint PASS. Firstbuildsandboxfailed aftertypes, elevatedbuildsuccess;
lintinferred-anyMap corrected. Two negativecontrols red asintended, exactsource
restored. New nativeontologyInput.mjs packagedbutNOTyetexecuted; fullverify pending.
Report docs/validation/ontology-input-147-2026-10-18.md honestcheckpointstatus.
Nextstageexactcommittedcandidate/nativeprobe beforefullfinalverification.
