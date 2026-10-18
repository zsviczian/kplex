# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# Navigation, native drag and creation destinations: completed

Main-agent closeout, 2026-10-18. #174 merged at
8f702d9c6dfcb70921a1bd5c15087af70e7f2156; main was fetched before creating
2026-10-17-navigation-and-native-drag. Draft PR: #177.
Runtime/test source: ac22f45600e6835fb22f849dcf3e82b86f5f8f88; later closeout edits are documentation only.
User authorizes checkpoint commits/pushes. Do not merge/release this feature PR
without new authorization. C14 remains accepted; structural refactoring is paused.

Completed: native note/attachment/URL/placeholder drags and plain tag text,
cross-Plex drops; #157 tag hierarchy and Find tag/folder/type icons; #175 overlap
correction and six independent combined-left layout preferences; one compact
folder input for creation/materialization, default placeholder aliases and
Ctrl/Cmd-double-click selection. Existing duplicate/relink, touch/gate, pinned
document, styling and lifecycle owners are preserved. No indexing compiler,
scheduler, schema, receipt or personal-vault work is introduced.

Full clean-source verify:obsidian passes: architecture 7/7, core 130/130,
Node 1,013/1,013, UI 131/131, source 334/334 and browser 598/598, without skips
or cancellations. Obsidian lint,
installed-types build and exact native staging/render/error smoke pass.
Final ac22f45 native reruns all pass: Find's eight queries/six navigations, eight folder
workflows plus actual reload, ten combined layout/drag cases, fourteen legacy
interaction assertions and touch/range/reload/geometry emulation. Resource guards
record zero source read/parse/acquisition/build/snapshot work in presentation and
typing intervals; normal navigation/writes remain separate. Final cleanup confirms
107 files/88 Markdown, no owned dialogs/controllers, desktop and console capture
restored. All offline source reviews are complete; no agent implementation pending.

A confirmed percent-literal relocation defect is corrected and native-tested:
wiki stays literal, Markdown decodes once and native cache proof must agree.
Native relocation moves three space references and preserves three percent references
plus all surrounding bytes. All 49 composer tests pass. Ambiguous/oversized proof,
unsupported quoting and percent-escape-looking wiki destinations fail closed.

Known separate limitation: the existing cross-link toggle refreshes On-demand
coverage; its native gate/filter revision guard remains failing, not weakened.
Main's same source path was inspected, with no native baseline claim or unrelated
fix. Ordinary moving noncentral placeholder double-click retains a documented
source-level baseline hazard. Physical OS cross-window dragging, macOS/minimum-host
and real phone/tablet acceptance remain pending. No further scope is authorized.

Durable results: docs/validation/navigation-and-native-drag-2026-10-18.md.
Private backup: %LOCALAPPDATA%/KplexValidation/navigation-native-drag-177-20261018
(403 files; per-file checksums verified, Temp originals retained; no publication).
Manifest SHA-256: 4c3c98f4bba8b008021468a0823c7056763021c91b15ff61156a83d0f2b55c39.
HANDOFF is transient and excluded from the source archive. Final commit and CI
status are recorded in the PR. Await maintainer review; no implementation is pending.
