# Creation and navigation batch — 2026-11-01

The maintainer authorized a K-Plex checkpoint commit, branch push and draft PR on 2026-11-01 so a separate agent can document these features in K-Plex Help. Companion Excalidraw and EA Scripts changes remain local and uncommitted. Merge and release are not authorized. See [the help-authoring reference](../help-authoring/creation-navigation-features.md) for the observable behavior and version gate.

## Branches and scope

| Repository | Branch | Base |
| --- | --- | --- |
| K-Plex | `codex/kplex-creation-navigation` | `ec3c07dbc68fbfa68eb36e65f84dada83514256c` |
| Excalidraw plugin | `codex/kplex-integration-followup` | `ebb7916b9b17008033f685c509b61875001341bf` |
| EA Scripts | `codex/kplex-creation-navigation` | `08ea7b50e52f84876e4a9cd0e4273599be621ba3` |

The Excalidraw branch starts after merged [Excalidraw PR #3028](https://github.com/zsviczian/obsidian-excalidraw-plugin/pull/3028). Its timer/lifecycle work is preserved.
EA Scripts was initially at `a7a627b`; the branch was fast-forwarded to current main before
regenerating Mindmap Builder, preserving already-shipped Mermaid import/export.

- [#217](https://github.com/zsviczian/kplex/issues/217): native K-Plex submenu on Obsidian file-menu events (explorer, tabs and resolved links), with reuse/new tab/right split/sidepanel/desktop window destinations. Phone/tablet choices retain existing device routing. Native tabs show the centered filename with the brain-circuit icon. New surfaces await their mounted navigation consumer before centering the requested file.
- [#208](https://github.com/zsviczian/kplex/issues/208): related-note, folder-child and placeholder-materialization forms share a template dropdown. Explicit blank selection and complete template paths are retained. Successful drawing creation remembers the selection in the existing serialized settings writer. New behavior requires `verifyMinimumPluginVersion("2.29.1")`; older companions retain their prior creation path.
- The public EA boundary adds read-only live `templateFilePath` and `getDrawingFilePath(filename, foldername?)`, reusing `getListOfTemplateFiles()`, disposable `getAPI()` workbenches and deterministic `create({exactPath, templatePath})`. New-version creation no longer reads private companion settings. Empty destination means vault root; compatibility/extension settings determine the suffix. Workbenches are destroyed on success or failure.
- Excalidraw's missing-file dialog exposes folder and filename controls, refuses collisions, preserves chooser cancellation and updates the clicked link when the selected destination changes. Template scans exclude similarly prefixed sibling folders and return null when unconfigured.
- [#224](https://github.com/zsviczian/kplex/issues/224): optional Trackpad navigation pans with ordinary wheel deltas and zooms with pinch/modifiers. Default wheel zoom, native editor/list scrolling, focal anchoring and zoom limits remain available. The preference is presentation-only, without semantic invalidation.
- Mindmap Builder's floating input subscribes to its exact drawing API and hides in view mode, restoring in edit mode without changing the docking preference. Rebinding/close retire the subscription. The script-store artifact is rebuilt as `v26.11.01` so a resident older runtime is replaced.
- K-Plex `CODING_STANDARDS.md` is the canonical cross-cutting guide, referenced by AGENTS/CONTRIBUTING. It includes explicit timer/window ownership, cancellation, compatibility and validation requirements. Existing architecture/indexing contracts remain in their established guides.

All new K-Plex copy has the eight maintained translations; Excalidraw's new validation message has its five maintained translations. Plugin manifests and dependency versions are unchanged.

## Executed focused checks

- Production builds pass in all three repositories. Excalidraw library generation passes with existing fork-contract warnings; changed Excalidraw runtime files have no targeted ESLint findings.
- `node --test tests/creation-navigation.test.mjs tests/related-note-composer.test.mjs tests/viewport-fit.test.mjs tests/display-modes.test.mjs tests/action-surface-ui.test.mjs tests/ui-components.test.mjs`: 143 passed at the affected checkpoint. The later warm-view regression and dropdown/failure checks pass in `creation-navigation.test.mjs` (8 cases).
- `node --test tests/excalibrain-migration.test.mjs tests/creation-navigation.test.mjs`: 78 passed at the settings/readiness checkpoint. Native reload independently establishes durable persistence, rather than treating this fixture roundtrip as a real unload/reload.
- Mindmap Builder Vitest: 106 passed in 15 files, including existing Mermaid/preset/text-container cases. Its production build and plugin script-store catalog checks pass.
- EA Scripts typecheck: 363 errors, exactly identical to an archived clean checkout of base `08ea7b5` with the same dependencies. Full lint reports existing workspace backlog; new floating-visibility files are checked separately. No source errors are hidden by weakening the checks.
- Excalidraw focused creation/template plus PR #3028 timer/migration regression checks: 25 passed. A pre-fix template-scan run fails the sibling-prefix regression; the fixed source passes. Final bundle checks: 5 passed. Final feature mapping: all 12 groups mapped, with 9 explicit remaining obligations; mapping is discovery, not behavioral coverage.
- The initial canonical-temp Excalidraw fast run passed 565/569. Three failures reference missing fork fixture `tests/obsidian/unit/coreRegression.test.tsx`; one is the existing host protocol-4 versus local protocol-2 declaration mismatch. The initial macOS run also rejected `/var`'s symlinked temporary path; using a canonical temporary directory removes those environmental failures without changing guards.
- The initial Excalidraw `test:regression:portable` stopped at that host-contract mismatch. After selecting matching fork `80df3c48f`, Excalidraw fast tests pass **569/569**. The final production and library builds have no TypeScript diagnostics; generated library declarations include both new public members; changed runtime lint passes. No fork source or declared dependency was changed to conceal the earlier mismatch. The final plugin is 5,048,620 bytes (194,260 bytes below 5 MiB).

## Native macOS acceptance

The K-Plex native scenario passed on Obsidian 1.15.0, installer 1.14.0:

1. Explorer/tab/link native menu callbacks and actual tab caption.
2. Fixed-scale two-axis wheel pan and modifier zoom without navigation.
3. Independent ordinary tab, right split and real popout centers.
4. Actual disable/enable with non-default trackpad/template-path preferences and an unknown-key sentinel, checking loaded settings and on-disk JSON.

The first test attempt exposed cleanup defects in the new test driver; both its artifacts and configuration were restored. A subsequent attempt reproduced a warm-split navigation loss. Waiting for the exact view's readiness fixed that production defect; the final run passes all four groups and cleanup. No assertion was weakened.

[Sanitized native receipt](creation-navigation-2026-11-01.native.json) records source and artifact hashes. The final rebuilt `main.js`, manifest and stylesheet exactly match those tested bytes. Staging backups are private temporary files, outside every repository and vault. Original Small-vault artifacts, settings, enablement and workspace were restored; all owned fixture folders were removed. No personal vault was used.

Native menu/wheel activation is programmatic. It does not establish physical trackpad input, mobile touch or perceived paint. The installed Small-vault companion predates 2.29.1, so positive template creation remains a coordinated-companion native gate. The repository-local Excalidraw vault was prepared with real binaries/settings. The maintainer completed the one-time opening/trust prerequisite. The initial sibling fork was stale; a clean isolated checkout of remote master `80df3c48f215d71e0f703874cc05eb2c8fca834d` provides protocol 4 and the core regression fixture. Native acceptance was rerun against that checkout without changing the existing fork worktree or the plugin dependency declaration.

The full regression attempt recorded **187 passed, 5 failed and 40 blocked** cases. Failures include concurrent native host requests in popout interactions, stale local Extras (converter 2.2.2 versus required 3.0.0), a missing file-explorer creation action, and geometry-popout cleanup. The device matrix was blocked after cleanup failed. This is a failed full-native run, without a baseline-pass claim. [Sanitized full-native receipt](creation-navigation-2026-11-01.excalidraw-native.json) retains the failure identities; raw reports remain under `.test-work/reports/native-e5a115df-75d7-490e-a1cd-32db91e98ff2` in the plugin checkout.

Guarded recovery separately proved the retained task was done, no PDF/print root remained, the service override was restored, and its empty/disconnected popout was no longer registered. The stale window object still reported `closed: false`; only that exact settled controller and its exact fixture were retired. No application restart or forced window teardown was used.

The final native preparation used matching Extras `e37c06f` (converter 3.0.0), with both companion checkouts isolated under `/private/tmp/`. It rebuilt/froze the corrected autocomplete metadata and installed verified artifacts. A focused real-host probe then passed all four creation groups: live template file/folder discovery and sibling exclusion; live compatibility/extension settings and explicit vault root; applying actual template text and refusing an occupied exact path; and editable folder/name controls creating the requested Markdown destination. Cleanup passed. [Final-build creation receipt](creation-navigation-2026-11-01.creation-api-native.json) records artifact hashes. The runtime is still 2.29.0 and correctly rejects the 2.29.1 version guard; this does not establish positive gated K-Plex UI acceptance.

Local artifact integration is temporary. To reproduce matching type/runtime builds use `EXCALIDRAW_FORK_ROOT=/private/tmp/excalidraw-kplex-native`; the matching Extras checkout is `/private/tmp/excalidraw-extras-kplex-native`. These do not advance the maintainer's existing fork/Extras branches. The existing exact package declaration/lockfile still require a coordinated published-package handoff before release readiness. The full native/device matrix has not been rerun after the final metadata correction and matching Extras preparation.

Mindmap Builder's actual floating modal also passed a separate native probe in the disposable Small vault with Excalidraw 2.28.1: edit/view/edit toggles, switching to Markdown and back, and a repeated mode toggle. Cleanup restored settings/workspace and removed owned fixtures and script resources. Only the help renderer was stubbed for offline operation; toolbar/lifecycle behavior ran current source. Its durable receipt lives in EA Scripts at `src/scripts/mindmap-builder/floating-visibility-2026-11-01.native.json`. No physical-input or paint claim is inferred.

## Broad checks and delivery status

The complete K-Plex verify command retains the independently reproduced `bound editor admission ... unsupported` failure. The identical test fails from archived untouched base `ec3c07d`; its production owner and expected assertion remain unchanged. Later serial browser and source groups are run independently so this baseline failure does not conceal their outcomes. Final counts: verify 1804/1805 (that baseline failure); independent browser group 452/452; source group 357/357; source/browser IndexedDB group 856/856. The latter includes the complete 20,015-owner large-vault case. No cases were skipped or assertions relaxed.

Outstanding acceptance: resolve or explicitly accept the K-Plex baseline failure and EA Scripts workspace backlog; complete failed/blocked Excalidraw full-native/device acceptance with matching dependencies; test the positive 2.29.1 companion/template dropdowns in all three K-Plex creation dialogs; separately check physical trackpad and mobile input. These changes are implemented and reviewable, but are not described as release-ready.

## Draft publication checkpoint

The Excalidraw native recovery is still in progress. Fresh locked dependency installs and builds now establish the current Extras converter; corrected native-menu, PDF-text and transport handling have removed the original infrastructure blockers. Successful focused reruns are retained in the plugin repository. The full device matrix and positive K-Plex template acceptance on an actual Excalidraw 2.29.1+ build remain pending; the original 187/5/40 result is historical, not current acceptance.

The initial checkpoint started at `ec3c07d`. Newer main `2aaf6d3` (PR #248) is now integrated, preserving its cleanup and occurrence-editor fixes. The only manual conflict was the npm test command: both new test entries are retained. The six-file integration set, including the previously failing occurrence-editor contracts, passes **143/143**. Historical base failures above remain as evidence of the original checkpoint; they are not claimed to persist after this integration.

Publication recheck: production build, architecture/numeric controls (9 checks, zero violations), core checks (132/132), and the affected five-file test set (120/120) pass. The initial sandboxed browser tests could not bind localhost (`EPERM`); the identical authorized rerun passed all 120. A type-only React import removes the shared template control’s lint warning. The broader confirmed baseline occurrence-editor failure remains recorded above.

## Complete verification after current-main integration

`npm run verify` completed its available test phases on source checkpoint
`9ff6db6` using Node 22.22.2: architecture/numeric checks **9/9**, core **132/132**,
main tests **1,841/1,841**, browser tests **452/452**, source contracts **357/357**,
and source/browser **855 passed, 1 failed**. The 20,015-owner cached-publication
case passed. The failed case was `dense active URL alias preparation remains
cooperative and cancels privately`: it measured **59.4 ms** against the unchanged
**50 ms** bound while native/build work also ran. This is a failed full verify,
not a green acceptance result; its final build stage was not reached. The explicit
post-integration production build and ESLint checks had already passed.

The identical timing case passes in an isolated rerun with the same assertion:
`node --test --test-name-pattern='dense active URL alias preparation remains cooperative and cancels privately' tests/on-demand-indexing.test.mjs`
(**1/1 passed**, no skipped cases). Its test and URL-index implementation are
unchanged by this feature batch. Concurrent load is a possible explanation, not
an established cause; the full-run failure remains recorded. No limit, assertion
or test selection in the maintained full command was weakened.

The maintainer-authorized draft PR is [#249](https://github.com/zsviczian/kplex/pull/249).
Its Help-authoring reference is ready for the separate Help agent. Native
Excalidraw acceptance is still being repaired and rerun; the companion changes
and EA Scripts remain uncommitted, and no merge/release readiness is claimed.

## Startup placeholder follow-up

The separately reported early-placeholder navigation freeze is fixed at
`97a10b1`. Both regressions failed before the change; affected checks pass
135/135 and the production build passes. Strict native acceptance holds global
publication at zero pages and verifies the placeholder's own preview, source
connection, toolbar, pins and loading-history recovery. Original Small settings
and enablement bytes are restored. The verified main.js was deployed under the
maintainer's artifact-only production authorization; after manually reloading,
the maintainer confirmed both workflows work. See the
[focused validation record](placeholder-startup-navigation-2026-11-01.md) and
its sanitized native receipt. Complete K-Plex verification is being rerun.

All 40 formerly blocked Excalidraw device profiles now pass their targeted native
rerun. Full Excalidraw acceptance remains pending after a separate text-tool
fixture timing correction; the original 187/5/40 result is historical.

Final K-Plex `npm run verify` after the placeholder fix passes **3,650/3,650**:
architecture 9, core 132, main 1843, browser 453, source 357 and source/browser 856.
ESLint and final production build pass. Both the unchanged URL-alias scheduling
bound and the 20,015-owner case pass in this complete run. The historical timing
miss remains recorded above; no assertion or bound was changed. The final build's
main.js SHA-256 is unchanged from the strict native/production-tested artifact.
