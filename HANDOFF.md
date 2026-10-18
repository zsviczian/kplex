# Standing instructions ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# PR147 validated closeout; then179/149/176

Latest maintainer authorization: finish147, integrate newer main and merge; then179,149,176 in sequence, each validated completed PR merged. No CI waiting, release, branch deletion, personal-vault access or comparative performance under competing encoding load. No subagents. Node22.22.2; native/browser drivers serial.

147runtime af31fc9/tooling c7cd196; integratedmain658793f through183a948. Fullverify c7 clean passes7/130/1061/177/334/623 groups plus realbuild/lint. Nativeexact main615f388c... ontology7cases in eachactualmode, external6/style15/migration6/Markdown4 pass. Broaderhover stopsmissingnative resolved-link fixturefacts despite parsedlink/physicaltarget; touch9+reloadpass but320pxgeometry317.5pxfails; GatefirstKeep/cross truepass then semantic51->60/source31 guardfails via actualincrementalpatch publications after initialquiet. No oracle/deadlineweakening or unrelatedruntimefix. Allfailuresprivate. Scopednewontologywriter notentered in broaderfailed lanes.

RawoutsideTemp: LOCALAPPDATA/KplexValidation/ontology-input-147-20261018-1792359600964; base169files + supplement6, SHA/CRCverified, originalsretained, unpublished, HANDOFFexcluded. Finalreport docs/validation/ontology-input-147-2026-10-18.md. CurrentSmall107files/88Markdown config/workspace/owners restored, no controllers/dialogs/mobile/debugcapture, candidateinstalledexact.

Next commit/push finaldocs only, confirm runtime/tooling inputs unchanged fromc7; updatePR147actualresults/limitations, ready and authorizedmergewithoutCIwait/no branchdelete. Switchmain/fetch then179existingbranch2026-10-18-settings-save-liveness; integrate resultingmain withoutrewrite, retargetfromold177branch ifneeded. Read current179scope and sourcecausal gates; no full-freezeclaim from illustrativemechanisms.179sharedpost-save liveness differs147typing. Preserve current nativeGate/Markdown publication traces and unresolvedhoverhostfacts. Then149branch2026-10-12-issue-115-label-sharpness, then176branch2026-10-17-warm-start-rebuilds; validate each scope, no speculativepatches/rejectedreceipt/readersharing or broadarchitecture. Only147implementationdone atthishandoff; otherPRruntime notstarted.
