# Standing instructions ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in the issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# PR #297 implementation and UI follow-up for review

Branch: `2026-11-10-note-type-tag-workflow`. The requested pre-refinement checkpoint is committed as `b334c20` (tag-backed note types, node details, reviewed repairs and native Show file properties). Current UI follow-up is deliberately uncommitted. No push, merge, release or issue closure was requested.

## Current changes

- Edit node style contains an explicit Convert to note type icon beside Style type for existing Tag styles. The same dialog reveals Node details: ordered properties, visibility and preview. The conversion is reversible until Save. One serialized durable Save moves only the selected style/priority entry, preserves appearance, unknown fields and unrelated styles, and optionally saves its properties. It changes no notes. Existing destination types, stale sources and conflicting property drafts are rejected instead of overwritten; Cancel and failed writes preserve saved state.
- Set note type has a settings icon for its valid selected draft. It opens that specific type's existing style/property editor in the same owning document and focuses its property controls. The unsaved selector draft remains intact underneath.
- Node/link appearance forms now use native Obsidian Setting columns, shared formOptionGroup, full-width long fields, existing paired color controls and dimension controls. Intro spacing and color/range columns are aligned. No new CSS class names were introduced. UI_RULES documents the shared owners; README and NOTE_TYPES describe direct configuration and conversion.
- Shared KplexInputSuggest extends native AbstractInputSuggest for tag, style-name and icon inputs. It retains native skin/filtering/keyboard behavior while refreshing only an already-open focused anchor on owning-window/modal geometry changes. Owner-realm border-box observers/listeners are released on close/pagehide. Selection uses the owning document's Event. No timers, scans or graph work were added.
- All eight maintained locales include the new accessible action labels and conversion/conflict copy. Regression fixtures include the new shared native owner; isolated color fixtures now model actual native Setting geometry instead of relying on a removed plugin grid.

## Actual validation

Windows, Node 22.22.2, Obsidian 1.14.5. Latest follow-up evidence:

- 198/198 focused browser/regression cases passed. Touched-owner ESLint, installed Obsidian types, portable-core types, architecture and build:local passed.
- Final exact-build disposable Small native suite passed all 18 cases, including initial popup placement, actual tag selection, draft-preserving configuration shortcut, type/tag writes, Clear/inline fallback, details in three views, native Properties, tag/search/pins, explicit defaults, reviewed/excluded repairs, partial failure, stale preview, cancellation, warm reload, popout ownership, inline style conversion and native layout. Cleanup passed. Configuration source acquisitions: zero; added full builds: zero. Conversion left note stamps unchanged.
- Light 900px and dark 420px native screenshots inspected. Popup remains anchored and within the resized window; colors and sliders align, long inputs span their rows, intro spacing is present. Native narrow desktop/popout evidence does not establish physical mobile keyboard behavior.
- Failure history preserved in ignored managed runs: missing native Setting geometry caused an isolated Facets fixture failure; after modeling the actual host structure, affected coverage passed. A private native test opening an editor from a detached settings tab lacked its live color scope; the driver now passes its actual popout document. Shared anchor regression exposed the need for border-box observation when modal padding changes. Corrected final checks all passed. Competing native host locks were respected; no competing process was terminated or bypassed.
- Full indexing aggregates were intentionally not repeated for this isolated UI follow-up under AGENTS risk-based validation. No indexing, storage or semantic owner changed. Baseline b334c20 previously passed 2,194 functional, 544 browser and 362 source-contract cases. Its IndexedDB aggregate had 1,030 passed / 1 pre-body Chromium bundle-load timeout; the affected unchanged startup file passed 92/92 on rerun. Do not report that aggregate invocation as passing. The baseline 20,015-owner performance oracle passed; 20,088-entry native review completed without extra full builds.

Routine reports, screenshots, logs and deployment backups remain in ignored managed `.test-work/validation` runs under the 14-day policy, not Git. Final native run: `2026-11-11-297-native-flqIjl`; focused run: `2026-11-11-297-style-settings-5Tzd1R`.

## Deployment and remaining review

The final UI follow-up was rebuilt with build:local and deployed to Zsolt's Brain: only main.js and styles.css changed, both hash-verified, and K-Plex was reloaded successfully. No production notes were edited. Deployment receipt: ignored managed run `2026-11-11-297-brain-deployment-EG2QxC`.

Native macOS and physical mobile remain untested. Native Properties uses guarded unpublished Obsidian support and is omitted when unavailable. Bulk repairs preserve earlier successful files after cancellation/failure. Conversion does not assign note types to existing notes; this is explicitly previewed before Save.

Suggested review: open an imported Tag style, use the conversion icon beside Style type and configure its visible fields before Save; verify Cancel/undo first. From Set note type, use the settings icon and confirm it opens the selected type while preserving the unsaved selector. Review appearance in the user's own theme on Mac after sync. Current follow-up remains uncommitted for this review.
