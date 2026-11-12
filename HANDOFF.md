# Standing instructions ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in the issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.






---

# Neighborhood, authoring, Sidecar and toolbar shortcuts: Windows validation

Branch: `2026-11-11-plex-neighborhood-authoring`. Base/released tag `0.4.3` is
`69a659e97799376395d609ea814b038cb782c2aa`. On 2026-11-12, after functional
confirmation and disclosure of the validation limits below, the maintainer
explicitly requested commit, push, merge to main, related issue closure with PR
references, and fetching main. These GitHub actions are now authorized. Close
#282 only after merge; no release/tag publication was requested.

The authorized work covers #282, #300, #298, #296, #295 and native pin/history
body drags. The user clarified that Rename needs an opt-out toggle for updating
an existing configured display-name property (title, aliases or another name
field). The first supported existing configured field is selected; other aliases
are preserved. No new title property or persisted toggle preference is invented.

Implemented behavior:
- Compass Siblings contains unique second-order neighbors of all displayed direct
  roles, omitting direct/center and actually displayed expanded child occurrences.
  Filtered, editor-owned and section strips retain their existing admission.
- Optional On-demand witness incidence is selected from displayed direct nodes,
  owner/count bounded and deferred behind direct-center publication.
- Excluded Date properties are suppressed by the shared source policy before
  materialization. Existing inline ontology remains authoritative. Signature v5
  invalidates historical graphs with nonempty exclusions once; source facts and
  unknown preferences remain intact.
- Pin/history bodies use the existing native node-link adapter; pin grips retain
  reorder ownership and list gaps retain mouse scrolling.
- Facets accepts 3-12 categories in existing layouts; the thirteenth is refused.
- Published Add relationship / Add previous / Add next commands select All /
  Previous / Next in the shared composer.
- Native Rename preserves FileManager link maintenance and exact file identity
  across the subsequent optional metadata write, including partial-failure retry.
- New copy is maintained in all eight locales; affected architecture/user docs
  and executable regressions are updated.

The user confirmed the six requested workflows and the popout Sidecar fix work.
The additional toolbar enhancements are implemented on this branch:
- New canvas: ordinary click retains a new group; Ctrl/Cmd-click creates a tab in
  the invoking group; Ctrl/Cmd+Alt/Option-click creates an adjacent group;
  Ctrl/Cmd+Alt/Option+Shift-click opens a desktop popout; Alt/Option-click opens
  K-Plex in Obsidian's sidebar (the user's explicit clarification).
- Settings: Ctrl/Cmd-click opens plugin settings, Alt/Option-click toggles the
  existing surface-local area action, and ordinary click retains the menu.
- Modifier hints use all eight locales and actual platform/keyboard facts.
  Mobile popouts are neither dispatched nor advertised. Existing `surface.new-tab`
  command defaults remain unchanged; its finite optional placement argument and
  shared canvas/created-note group allocator preserve the initiating host.
- Only multiline ToolButton labels opt into the shared tooltip owner's measured
  line layout; ordinary hints retain their wrapping, timing and ownership.

Toolbar validation passed 214/214 focused action/placement/localization/terminology
and actual React-button cases, plus 14/14 final toolbar/shared-tooltip browser
checks. Installed-type `build:local`, affected lint, core TypeScript and architecture
checks passed. Windows Obsidian 1.15 native trusted input passed all destinations
and plugin/area/menu choices from main and popout canvases, plus light/dark tooltip
captures including a 420-pixel isolated popout. Screenshots were inspected.
Independent cleanup confirmed the original saved workspace/configuration bytes,
117 files / 98 Markdown, no fixtures, graph nodes, controllers or owned leaves,
no open Settings dialog and no captured errors. All three installed/dist hashes
match; current main.js SHA-256 is
`8a6cb7a764822ae0e7ed30650ec5d0035c9985460beefd513f2bd79e447068b7`.

Managed toolbar evidence: `2026-11-12-toolbar-modifiers-focused-final-1vwQrC`,
`2026-11-12-toolbar-tooltip-final-KcOPI8`,
`2026-11-12-toolbar-modifiers-native-final-upnLTH`, and
`2026-11-12-toolbar-modifiers-final-audit-niiWLG`. Initial failed checks are retained:
the first source run lacked reference metadata and fixture wiring; native harness
attempts incorrectly short-circuited leaf inventory or shrank a multi-group main
window until its button was offscreen. Corrected runs preserve trusted input,
assertions and deadlines. The actual tooltip capture also prompted multiline
formatting before the final build. Index/cache owners remain unchanged by these
toolbar additions, so expensive indexing/restart suites were not repeated.
Native macOS and physical mobile keyboard/touch acceptance remain unavailable.

For the first-open popout Sidecar fix, the native baseline reproduced an
attached empty split whose document still belonged to the main window, so the
initial adjacency check silently rejected opening the note. `syncSidecarToPage`
now publishes the owned request before awaiting existing workspace-layout
settlement, then retains the normal adjacency, ownership, canonical-file and
supersession fences. Ordinary nonadjacent companions retain their refusal.

The Sidecar change passed 83/83 focused follow/attachment/fold regressions,
`eslint src/main.ts`, and `build:local` against real Obsidian declarations.
New cases cover first-open mode, latest queued navigation and retirement during
layout. Exact-build Windows Obsidian 1.15.0 (installer 1.14.5) native input passed
all eight main-window/popout and right/left/above/below combinations: one trusted
button click displayed the actual note content in the selected source/preview
mode. The CLI preflight now reads selected-runtime vault identity directly to
support Obsidian 1.15's renamed vault-info command.

The pre-toolbar Sidecar checkpoint's main.js SHA-256 was:
`079b3368c4123db72086c3ae3ffbfb1753d038bce75d14758a21968d584c8e72`.
The independent final audit verified all three artifact hashes, the original saved
workspace, 117 files / 98 Markdown, restored configuration bytes, no fixture
files/graph nodes/controllers and no captured JavaScript errors. Managed evidence:
`2026-11-12-sidecar-popout-focused-sYHlq9`,
`2026-11-12-sidecar-popout-native-fixed-5Lo3Pv`, and
`2026-11-12-sidecar-popout-final-audit-J0UJPa`. The failing native baseline/trace
and recovered transport/artifact preflight failures remain recorded. This scoped
navigation fix does not change index/cache policy; expensive indexing/restart
gates were not repeated. macOS/mobile Sidecar acceptance remains unavailable.

The original six-feature validation below used Node 22.22.2, real installed
Obsidian declarations and Windows
Obsidian 1.14.5 (runtime Node 24.22.0 / Electron 43.8.3 / Chrome 150). Both production
build and build:local passed. Only disposable Small has the identified local build;
no personal/production vault was deployed. That pre-Sidecar artifact's main.js SHA-256 was
`ba5e0106470eda3c99cd1c8cdad51bd4c0b914f94fe2c7a733b14b5127b8b84c`.

All raw evidence is managed under ignored `.test-work/validation` with the standard
retention policy. No routine report was added under docs/validation.

Completed source gates:
- Released tag and branch base coincide at 0.4.3. The original excluded-Date failure
  was reproduced before the fix; native FileManager filename-only rename also
  demonstrated that the existing display-name property stays unchanged.
- Frozen indexing passed with an explicit executable peripheral-presentation delta.
  Graph/evidence/search/direct lists and direct geometry remain identical.
- Release/core/architecture/lint checks and 2,215 unit tests passed. Corrected UI
  files passed 77/77. The full browser group ran 555 checks, with one Chromium
  bundle-load failure; its unchanged 23-test file rerun passed. Earlier extracted
  fixture binding, seven-category and expanded-sibling assumptions were corrected;
  unchanged color/focus/camera/layout-reuse assertions pass.
- Portable source tests passed 362/362. The full real-IndexedDB lane ran 1,032
  checks (1,027 passed, five preserved failures). Corrected affected reruns passed:
  five alias-priority cases, 204 On-demand/deferred/optional cases, and all four
  high-degree cases, plus explicit 20-, 256- and 257-owner boundary runs.
- The large case found a real redundant optional replay: direct 1 / optional 1.
  The internal scope now retains its mandatory source-owner count and defers
  optional replay above 256 owners, preserving existing small-cover admission.
  Final 20,015-owner acceptance retained the strict single-pass/no-IO/work/memory
  bounds: direct 1 / optional 0, 8,187,369 owner checks, 155,029.7ms measured cached
  publication. This is a real-Chromium GraphIndex fixture, not a native large-vault
  or production-latency result.

Completed exact-build native gates:
- Commands/rename, saved drags, semantics and Facets lanes all passed. Native title
  and alias writes, opt-out, missing-property behavior, actual canvas captions,
  light/wide and dark/narrow visuals and popout Escape were checked. Screenshots
  were inspected. Both saved lists produced intercepted real Chromium link data
  for relationship gates and split Markdown editors; one pin relationship was
  actually saved. All six second-order roles, real created Date exclusion, two
  plugin reloads/unknown-key preservation, twelve regions and the disabled
  thirteenth category were verified.
- Cache activation was natural, not forced. Two consecutive Reload app without
  saving cycles reused the exact persisted generation, graph, settings, semantic
  inputs and source heads. The second remained ready for 610 seconds across two
  maintenance periods with zero reads/parses/repairs/inventories/rebuilds/catalog
  starts/snapshot writes. Sampled foreground control remained valid.
- Two additional reloads began with an actual ordinary save pending, for a backed-
  up README edit and its reversal. Each reused exactly the one changed cached
  owner with zero body reads, parses or rebuilds and naturally activated the
  repaired complete snapshot. README bytes, mtime and ctime were restored.
- The test-owned unreferenced virtual endpoint was explicitly removed through the
  existing guarded API, then its ordinary five-minute save activated naturally.
  A clean reload reused that cache without work. Snapshot write failure/retry,
  no-op deadline preservation and native-metadata/source fences are additionally
  covered by the passing real-IndexedDB/source suites.
- Finally, two graceful whole-application exit/relaunch cycles used the existing
  guarded Windows lifecycle helper. Every observed native process exited, and
  both Browser and renderer lifetimes changed each time. Both startups reused
  the exact persisted cache with zero source checks/reads/parses/repairs,
  inventories, full builds, catalog starts or snapshot writes. These whole-process
  results are separate from the renderer-reload results.

Important failed invocations remain recorded, not described as clean aggregate
passes. Earlier verify attempts stopped at typed callback errors and stale fixture/
signature/command expectations. Later source failures included the demonstrated
large replay, obsolete second-order expectations and a primary retry assertion
that also counted the newly valid optional closure. Primary retries still require
exactly two attempts, plus one distinct bounded optional closure. Native harness
corrections added a paint wait and scrolled an offscreen history source into view.
Two over-broad ad-hoc assertions were preserved: host enumeration order is separate
from saved input identity, and unlinked virtual nodes require explicit cleanup.
No production acceptance bound or deadline was relaxed.

Final independent audit after both whole-process restarts passed: 117 original
files / 98 Markdown, one Small window, exact original data.json/community-plugins/
types bytes and Daily Notes options, no owned graph nodes, controllers or debugger
attachment, no JavaScript errors and no pending cache work. The original workspace
was restored and saved through the public layout API; it survived full-process
relaunch. All three installed artifacts still match dist hashes.

Key managed evidence labels: `neighborhood-admission-final-J2gytJ`,
`neighborhood-native-stage-YPYpBn`, `neighborhood-native-rename-visible-Es9k6z`,
`neighborhood-native-visible-drags-BoGvFm`, `neighborhood-native-semantics-JgC4aw`,
`neighborhood-native-facets-55v9b6`, `neighborhood-native-restart-idle-poOb5n`,
`neighborhood-native-clean-cache-npuzsP`, `neighborhood-native-whole-process-orwtY0`,
and `neighborhood-final-audit-after-process-restarts-mnWeiW` (all dated 2026-11-11).

Remaining acceptance: macOS, physical Android/iOS touch/keyboard interaction,
minimum-host testing, actual OS sleep/resume and native large-vault restart/paint
latency were not performed. Highest-probability manual risks are native drag versus
list scrolling on touch and cross-window drags; repeat rename/IME and owning-window
behavior separately on those platforms. Windows Small and a 20,015-owner browser
fixture do not replace these gates. Full cross-platform release acceptance remains
unfinished. The maintainer has requested merging after these limitations were
reported; that authorization does not turn unperformed checks into passing results
or authorize release publication. The PR must retain these limits and close #282
only after merge.
