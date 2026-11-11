# Standing instructions ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in the issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# PR #297 unified tag styles — implementation for review

Branch: `2026-11-10-note-type-tag-workflow`. Previous development checkpoints: `b334c20` (original note-type workflow) and `c1f1d1c` (configuration shortcut, conversion and native form cleanup). The maintainer approved replacing the two style families with one, using explicit note-type attributes over tag attributes when migrating conflicts. Current unification changes are uncommitted; do not merge/release/close issues or reintroduce hidden compatibility overrides.

## Implementation

- One canonical `tagNodeStyles` dictionary, one leading `#` in settings/editor names. The selected note type reads that same entry with higher precedence, inheriting its matching prefix appearance before explicit exact attributes. Configuring properties or a partial exact style cannot erase that inheritance. Exact tags use direct dictionary lookup without enumerating the style collection (regression-tested). Ordinary tag matching retains prefix/priority behavior, with case-insensitive identity. Matching prefixes remain additive under the existing preference and are deduplicated.
- `core/contracts/tagStyle.ts` owns the pure linear migration and shared tag matching/key normalization. Root settings and every supported saved theme merge retired noteTypeStyles into tagNodeStyles. Explicit type values win; tag-only fields, label prefixes, unknown attributes and priority are preserved. The retired dictionary is deleted, not aliased or shadowed. Theme schema advances to 2; version 1 is input-only. Unknown/unsupported themes retain the existing read-only raw-data safeguard and do not repeatedly trigger startup migration writes.
- The native Edit node style form has no Style type or conversion control. Label prefix, appearance and Node details are always available in the same shared editor. The Set note type settings icon opens this same tag definition and preserves the note draft. Name collisions/stale drafts remain guarded; appearance/defaults Save atomically through the existing queue.
- Note-type property definitions remain outside appearance themes and apply only to the selected type. Migration changes settings only, never note metadata or text. No cache schema, source authority, ontology or scheduler changes.
- Updated the eight maintained locales, current user guides, UI component rules and settings ownership documentation. Existing shared Obsidian controls/classes remain the UI owners; no new CSS classes or skin were added.
- Maintained regression/native fixtures now construct the unified runtime shape. Legacy two-dictionary input remains explicitly exercised at the migration boundary. Finite compile inventories include the shared module; no deadlines/oracles were weakened.

## Actual validation

Windows, Node 22.22.2, Obsidian 1.14.5.

- Focused migration/persistence/UI suite: 242/242 passed. Touched-owner lint, installed Obsidian types, portable core, architecture and build:local passed. Final guarded source was rebuilt with the installed types/core/architecture checks passing.
- Final exact-build Small native note-type suite: 20/20 passed, cleanup verified. Includes shortcut draft preservation, all three views, native Properties, reviewed partial/stale/cancel repairs, unified editor, light 900px/dark 420px geometry, popout, durable V1-to-V2 migration and unsupported-theme retention without write echo. Two consecutive unchanged plugin reloads used full-snapshot hydration with zero full builds, Markdown reads and parses. Files/stamps remained unchanged during settings migration. These are plugin reloads, not whole-app restarts or physical mobile acceptance.
- Final-artifact maintained native style-operation matrix: 15 cases passed; configuration bytes restored. Covers delayed/failed/duplicate writes, Cancel, rename/delete, manager/settings refresh failures and reload, using the unified registry.
- Read-only production-settings simulation: Zsolt's Brain has 34 tag styles and 1 type style; migration yields 35 unified entries, retains all explicit attributes and all 3 saved themes (schema 2), and leaves input unchanged. No same-tag attribute conflicts were present. That simulation itself performed no production writes; the later authorized deployment is recorded below.
- Full verification latest completed functional stage: 2,197/2,197 passed, plus startup admission 58, source convergence 15 and settings independence 27. Full browser stage: 549/550 passed; one saved-history fixture directly constructed the retired runtime dictionary and therefore omitted its selected style. Corrected to one valid runtime registry; all 7 affected saved-list cases passed without changing behavior assertions. Do not call that aggregate command a pass.
- Source contracts: 362/362 passed. IndexedDB/source-browser batch: 1,030 passed / 1 failed before its test body when Chromium did not load the bundle within the unchanged startup deadline. The entire unchanged affected foreground-startup file passed 70/70 on rerun. The 20,015-owner canonical graph/gates/evidence/degree/no-I/O/cancellation oracle passed. Do not call the original storage batch a pass. Final affected migration/theme/color regressions passed 97/97 after the direct-lookup and selected-prefix refinements (104/104 including saved lists passed immediately before the latter refinement).
- Installed types, final touched-owner lint, deterministic production build and build:local passed after the final refinement. Final native artifact recheck passed all 20 cases, with cleanup and current dist hashes verified; the final-artifact style-operation matrix passed 15 cases with configuration bytes restored. Competing native runs were respected by waiting on the shared host lock, without interruption or bypass. The validated main.js was deployed to Zsolt?s Brain and hash-verified; styles.css already matched. The running deployment had already reloaded K-Plex when the maintainer?s no-reload steering was checked. Subsequent production deployments are copy-only unless a reload is explicitly requested. Local deployment receipt: 2026-11-11-297-brain-deployment-Jk75st.
- Earlier failed checks retained locally: first full attempt exposed old direct modal callback arguments in the settings-independence fixture; next attempt had 2,179 passed/1 failed because the finite presentation test compiler omitted tagStyle.ts. Updated inventories; the affected presentation suite passed 40/40 and the later functional stage passed all 2,197. Initial focused run had four obsolete split-family fixtures and one Chromium pre-body bundle-load timeout; corrected focused run passed all 242. No product source workaround or timeout weakening was used.

Reports/logs/screenshots stay ignored under managed `.test-work/validation` with the 14-day policy. Native final run: `2026-11-11-297-native-YdSv8N`; style operations: `2026-11-11-297-unified-style-operations-d72Op1`; focused: `2026-11-11-297-unified-styles-LxzjEC`; complete-functional/browser aggregate: `2026-11-11-297-unified-full-verify-LShQsV`.

## Remaining steps / delivery

Implementation and all affected acceptance are complete on Windows, with corrected fixtures and the unchanged Chromium-file rerun distinguished above. Final native artifacts match dist. Keep changes uncommitted for review. Zsolt?s Brain now has the validated unification build (main.js updated; styles.css already matched). Behavioral testing used the disposable vault; production received only the authorized deployment and normal plugin migration.

Native macOS and physical mobile remain untested. The deliberate compatibility change is that the merged winning attribute now applies to ordinary tag use too (for example, a blue type background replaces a conflicting yellow tag background). The maintainer explicitly accepted that rule. Existing tag prefix priority remains significant. No notes are rewritten, and no migration/duplicate-style UI remains.
