# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# PR #174 — returned for independent review; long-session gate open

State: main-agent implementation/review is complete through pushed runtime checkpoint `d6be473`;
final documentation/link/whitespace/diff checks pass for this closeout checkpoint. No active native/resource lane remains. Runtime checkpoint D2 passes GitHub CI (26m52s, all suites, zero failures/skips); final documentation-head CI is tracked separately. An unfinished run is not a pass.
Branch: `2026-10-17-local-folder-diagnostics`. Main/#173 was merged at `23aa44e` and integrated
without rewriting history at `d4d65cd`. #164 is closed with the requested comment. Independent
checkpoints: D0 `786e91c`, F2 `b4bb401`, F3 `ebe26cc`, D2 `d6be473`.
Keep #174 draft. No merge, release, personal-vault access or raw-evidence publication.

F authenticates one bounded empty-folder wave using existing complete physical ownership and
preserves source/referrer/CAS validation. F3 completes exact current missing-head rename retirement
without erasing newer intent. D adds bounded passive coarse accounting, shared allowlisted captures,
O(1) health, public static build identity and eight-locale disclosure. Canonical ownership, finality,
privacy, retention, exception isolation, reuse, comments and owner-window behavior were reviewed.
No receipt, schema, parser/compiler or scheduler redesign; C14 remains paused.

Actual Node 22.22.2 `verify:obsidian` passes: architecture 7, core 128, main 960, UI 131,
sources 334, browser sources 598; zero failures/skips, installed types/core/lint/build and exact
Windows smoke. Main SHA-256 `d46b370199b0a2b06347266308e539f3a71a9e83459d50934be4b38bbc067ebc`
is the verified precommit artifact at `ebe26cc` plus the archived D2 patch; runtime files match D2.
Individual test deadlines are unchanged. The failed 20-minute aggregate invocation and clean
35-minute rerun remain separate evidence.

38 focused real-IDB cases, #172 held-P3 Find/sync/stationary completion, #161's 28 variants,
final 610-second quiet, ordinary Markdown, actual Excalidraw and create/fill/rename pass. Final
native report/Settings/main/popout lane completes 23 recorded cases; optional real clipboard
writing is pending to preserve non-plain-text formats. Earlier 24-case control includes real writing.
All final fixture/settings/configuration/clipboard cleanup passes. Failed controls remain preserved.

F: suitable for independent review within eligibility. D: revise acceptance before field rollout.
The real two-hour foreground soak remains unproven: one native-focus preflight fails before
fixtures/captures; a setup-only bounded focus-settlement variant reaches one edit/capture and two
unchanged-idle controls before losing focus. Both restore exactly. Pre-existing Explorer-owned
Chrome is foreground; no titles, other-vault data or actual input are read, and no other application
is closed. No focus oracle is weakened/refocused away. The maintainer confirms the machine is in use and explicitly instructs leaving the long foreground test pending.
Next action, only after the maintainer makes a new test window available: run the archived setup-settled
soak driver on the exact reviewed build, unchanged actual mode/policy, for two real hours; preserve
all results and cleanup. Do not call failed/accelerated evidence a native multi-hour pass.

Private durable evidence is verified at `%LOCALAPPDATA%/KplexValidation/pr-174-2026-10-17/final-evidence`:
1,716 files, 103,633,691 bytes; independent re-read of every entry and 1,713 originals passes.
Manifest SHA-256 `4a4cfaf45cdd5c90f73bf7909391984f5fd372ad5db127bfadc10ec75b93f58a`.
No originals are deleted or raw material published; junctions/dependencies/transient handoffs are
excluded. Final documentation is written after manifest verification. See the consolidated report
and `docs/INDEXING_DIAGNOSTICS.md` for source identities, costs, limitations and collection guide.

Prioritized remaining acceptance: uninterrupted Windows two-hour then real 24-hour use; macOS
popout/copy/interrupted folder waves; physical Android/iOS suspend/resume, clipboard and memory.
Estimated next test window: two hours plus setup/cleanup; availability is unknown. Do not resume
unrelated architecture/performance work or merge/release while this gate is unresolved.