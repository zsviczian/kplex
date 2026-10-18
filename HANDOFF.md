# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# PR177 feature checkpoint and focused missing-Parent follow-up

Main validation agent. Existing branch2026-10-17-navigation-and-native-drag,
feature checkpoint1941b48c13a9eea2ff2dc4b6f156b55bfbd8f54d pushed. Commit/push authorized; PR177
stays DRAFT, no merge/release. No personal vault; Small only. No comparative
performance tests while HandBrake encodes. All native/browser lanes serial;
no CLI probes during native polling. No native or browser driver currently active.

Feature implementation complete: Tag/Note Type choices, single selector/conflicts,
conversion/YAML unlink, central tag and cross-Plex/native-link drops; doubled
Note Type tag connector style. Central-folder physical moves share final checks
with confirmation/Alt bypass. Adjacent tabs and native-leaf-local center modes.
Shared native style sliders/values/inheritance and relationship-search hint, all8
locales. Finite initial/local-ready/source-ready watchdog (maximum3); actual
GraphIndex/IDB old-owner control fails on8f65dd5 and passes candidate. Confirmed
native scalar lifetime bug is fixed: accepted persistence finishes without touching
retired Settings controls; later detached events cannot submit another save.
Real Chromium red/green plus all13 appearance/adoption/concurrency cases pass.
None of this establishes the reported complete application freeze eliminated.

Full verify1792334769085 PASS Node22.22.2: architecture7/core130/lint/Node1058/
UI142/source334/browser608/build/native smoke. Final driver+architecture27 PASS.
Exact native structural12(1792336059640), layout6(1792336113646), styles15
(1792336147532), outbound6(1792336154825), Sidecar gate-close8(1792336187780),
reference closed4(1792336195363)/Properties open4(1792336205664) PASS.
Native Sidecar custom-editor1792336216068 FAILED after3 passed checks (Save,
stationary Parent/plugin restart, actual timer receipt): synthetic recovery fixture
could not reach genuine idle within its prerequisite deadline. Combined Sidecar+
Properties1792336295440 FAILED after successful Save/Settings close: fixture Parent
never reconciled before reload. Both clean up and restore exact configuration.
These failures remain open, not passes/exclusions. All raw evidence private.

NEXT: update PR body, then focused investigation. Evidence backup is verified at
%LOCALAPPDATA%/KplexValidation/structural-drops-177-20261018-1792336531810:
583files/36,151,035bytes, sourceZIP541 CRCs/hashes; MANIFEST
ba61eb5d95513393ae661ee6ca351023bd5dfdacd5e86e6421ff623ba38f7937. CI in progress.

then a separate focused causal investigation of combined Sidecar+Properties
missing Parent. Its native failure receipt has current frontmatter/resolved target,
local ready/upToDate true, sourceReady false, no source-backed startup, no active
semantic work/on-demand tasks, but zero Parents for the demanded center. This is
an actual reproduction of the stale/incomplete graph symptom; the full app remained
responsive. Do not hide this behind passing freeze controls or add a blind polling
loop/full rebuild. Inspect existing metadata acquisition/publication/demand owners.
No rejected receipt/reader-sharing experiment, broad benchmark or refactor.

Sanity1792336350349 PASS107files/88Markdown, exact artifacts, no controllers/dialogs,
desktop and original CLI capture false. Main0ea42b2b1a627b5d61a3f0fb19ebc6e66a5f5fb4c1644287779e169c397eda07;
CSS9664241e9e87f357ebfa57fcfe5477a5b8f592db4e4bbbb53f65db680dd6a7c0;
manifest19d9ecce5557733e0ff0f2e27155e635c30158c3cfa6fbca0f11c16e4dedfd2c.
Build8f65dd5.dirty; runtime source unchanged since full verification began.
Windows11/Obsidian1.14.4 installer1.14.0, Electron43.3.0/Chrome150.0.7871.212/
nativeNode24.18.1. Mac/minimumhost/physicalmobile/IME/OSdrag/Bases tag-cell and
full affected process restart remain separate acceptance. Report and ledger retain
prior Properties Parent failures and unreproduced Save/Settings-close freezes.

Report docs/validation/navigation-and-native-drag-2026-10-18.md; ledger
Refactor plan.md. Private launcher %TEMP%/kplex-structural-drops-run.mjs pins
Node22.22.2 PATH and Small variables. Private backup script
%TEMP%/kplex-structural-drops-preserve.mjs <exact40commit> verifies source ZIP/CRC
and per-file hashes outside Temp. Keep originals and previous backups, publish
nothing raw. Never archive HANDOFF. Recheck final source and Git status before
writing. Use private evidence to trace only owned synthetic fixture data.
