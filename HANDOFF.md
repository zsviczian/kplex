# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

### Current transfer

**State: main-agent review and automated/native validation complete; changes remain uncommitted.**

- Sender → recipient: offline development agent → main validation agent.
- Kind: implementation / return review.
- Objective: migrate all plugin-owned user-facing English copy to `src/lang/en.ts` without changing displayed English wording, while preserving vault content, persisted keys/IDs, machine-readable shortcut tokens and developer-console diagnostics. Add the L01 whole-source localization enforcement gate.
- Base commit/branch: unavailable; the supplied repository ZIP contains no Git metadata. The preserved input tree is `/mnt/data/original_repo`; the implementation tree is `/mnt/data/work_repo`.
- Input identity: `repository(20260927-075426).zip` supplied by the maintainer in this conversation.
- Actual capabilities: Node v22.16.0, npm 10.9.2, global TypeScript 5.8.3, Git 2.47.3 and Chromium are present. Project `node_modules` is absent. Network/package cache is insufficient for an offline install. Obsidian CLI/runtime is unavailable by assignment.

### Scope and implementation

- `src/lang/en.ts` is now the single source for plugin-owned commands, menus, settings, help, placeholders, tooltips, ARIA labels, notices and user-visible errors migrated in this pass.
- Settings, host commands/notices, React UI, native Obsidian modals, content panes, graph/filter controls, relationship dialogs and accessibility copy now consume the injected translator rather than hard-coded English.
- Shortcut modifier presentation now receives localized labels (`Shift`, `Command`, `Control`, `Option`, `Alt`) while machine-readable shortcut syntax and host registration tokens remain unchanged.
- Relationship explanations and ontology-precedence suppression reasons are stable semantic codes in portable core; the UI maps those codes to localized English. The relation fixtures were updated to assert the stable reason data.
- Graph Lens parser/semantic validation now returns structured issues rather than portable-core English error sentences; the UI maps those issues through the English catalog. End-of-expression uses a locale-neutral `null` sentinel.
- Blank/malformed persisted Graph Lens names stay blank in sanitized data and use the localized `filter.untitledLens` display fallback at the UI boundary.
- Persisted/vault-facing ontology field defaults such as `Parent`, `Child` and `Note type`, stable IDs/keys, URLs/paths, user/vault content and developer console diagnostics intentionally remain untranslated per `AGENTS.md`.
- `tests/localization.test.mjs` now recursively scans production TS/TSX UI sinks and fails if literal user-facing copy is reintroduced outside `src/lang/en.ts`. Existing source-regression assertions in `tests/indexing.test.mjs` were updated to require localization keys instead of hard-coded English.
- Canonical `src/ui/NewRelatedNoteModal.ts` and legacy `.tsx` compatibility copy remain byte-identical.

### Offline validation performed

- `NODE_PATH=/opt/nvm/versions/node/v22.16.0/lib/node_modules node --test tests/localization.test.mjs` → PASS, 13/13. Includes strict catalog/fallback/interpolation checks, shortcut presentation checks, host adapter check and the new whole-source user-copy gate.
- `NODE_PATH=/opt/nvm/versions/node/v22.16.0/lib/node_modules node tests/indexing.test.mjs` → PASS on rerun: indexing assertions 1–68, P1–P17, section expansion, predicate/lens, incremental runtime patch, creation/imagery and placeholder/ghost materialization all pass. One earlier run hit the existing cooperative-parser timing guard at 47.9 ms; the immediate rerun passed unchanged.
- `NODE_PATH=/opt/nvm/versions/node/v22.16.0/lib/node_modules node --test tests/presentation-environment.test.mjs tests/parser-core.test.mjs` → PASS, 14/14.
- With a temporary local symlink exposing the already-installed global TypeScript package as `node_modules/typescript` (removed immediately after): `node --test tests/architecture.test.mjs` → PASS, 7/7; `node scripts/check-architecture.mjs` → PASS, 34 migrated roots / 75 reachable files / 0 violations; global `tsc -p tsconfig.core.json` → PASS.
- Global TypeScript `transpileModule` syntax validation over all 29 modified `.ts`/`.tsx` files → PASS.
- Static translator-key reference audit → PASS: 807 English catalog keys and no unknown literal key passed to `translate`/`translator` calls.
- Direct UI-literal audit (`setText`, `setTitle`, `setName`, `setDesc`, `setButtonText`, `setPlaceholder`, `setTooltip`, `Notice`, visible object labels/text/placeholders/titles, JSX text/ARIA/title/placeholder) → zero production literals outside `src/lang/en.ts`; this logic is now covered by the committed localization test.
- Temporary validation symlink/node_modules directory was removed. No generated build artifacts or temporary diagnostics remain in the project tree.

### Unavailable / pending validation

- Required engine is Node `>=22.22.2 <23`; this agent has Node 22.16.0. Do not treat local engine-sensitive results as the exact-build acceptance lane.
- `npm ci --offline --ignore-scripts` was attempted and failed. npm reported the engine mismatch and `ENOTCACHED` because `yocto-queue-0.1.0.tgz` is not available in the local cache. No dependency tree was left behind.
- Consequently full `npm run verify`, ESLint with the repository plugin, real Obsidian typings/build/esbuild lanes, and the production Obsidian runner were not available here and remain pending, not skipped/passed.
- Obsidian CLI/runtime validation was not performed, per the maintainer's explicit offline-agent constraint.
- Git commit/branch identity and `git diff --check` against a repository index are unavailable because the supplied ZIP has no `.git` metadata.

### Main-agent validation tasks

1. Use exact Node 22.22.2 with a clean dependency install (`npm ci` or the repository-prescribed clean install), then run `npm run verify`. Expected: architecture/core/lint/tests/build all pass, including `tests/localization.test.mjs` and the updated indexing fixtures.
2. Run the repository's Obsidian validation lane (`npm run verify:obsidian`) in the equipped environment. Expected: no command/menu/settings/dialog rendering regression and no runtime localization-key failures.
3. Perform a focused native UI smoke across commands, Settings (including node/link style managers and ontology discovery), Filter / Graph Lenses (including invalid-expression feedback), create/link/delete/materialize/rename dialogs, relationship explanations, notices, tooltips and ARIA-visible controls. Expected: displayed English wording remains equivalent to the pre-migration UI, with no raw catalog keys, blank labels, or English emitted from portable semantic code.
4. Confirm platform shortcut copy on macOS and Windows conventions (and, where available, mobile/hardware-keyboard surfaces). Expected: localized modifier names match the effective convention; machine shortcut registration remains unchanged.
5. Review the structured reason/validation DTO changes (`RelationshipSummary`, `EvidenceSuppressionReason`, `PredicateParseIssue`, `GraphLensValidationIssue`) for any external caller not represented by the supplied source/tests. Expected: all presentation formatting remains at the UI/localization boundary.

### Cleanup / remaining risk

- No schema, settings key/default, command ID, cache/storage format, network behavior or vault-content migration was intentionally changed.
- No non-English locale was added; English remains the source/fallback catalog.
- No Obsidian-host-only probes or temporary instrumentation were added.
- Main validation agent should review and validate the returned uncommitted diff before any commit/PR action.

## Main-agent acceptance

Reviewed on Node **22.22.2 / npm 10.9.7** with clean dependencies and real Obsidian **1.14.2**. The main agent corrected the label-table type errors, localized physical position parameters, strengthened the sink gate with negative fixtures, required caller-owned suggestion copy, documented touched module/function responsibilities and preserved saved suppression-reason predicates at the host compatibility boundary. Accepted-English parser/explanation comparisons and saved-lens evaluation regressions were added.

Required portable checks/build and exact-build native install/open passed. Native desktop/tablet/phone copy checks and the complete fixture-import/style-manager/persistence/reload lane passed. Baseline device/window state and test settings were restored; test-owned notes/controller were removed; the index settled. No required manual test remains for this unchanged-English localization scope. An optional physical-phone keyboard/visual smoke is described in the review report; emulation is not a physical touch/WebView pass.

See [durable review evidence](docs/validation/L01-2026-09-27.md) and [machine-readable results](docs/validation/L01-2026-09-27.json). Structural refactoring remains paused after C14. No commit, PR or subsequent assignment was requested or performed.
