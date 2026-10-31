# K-Plex code quality review — 2026-10-31

## Scope and baseline

Maintainer-requested light cleanup on `cleanup/code-quality-review-2026-10-31`, starting at `main@ec3c07dbc68fbfa68eb36e65f84dada83514256c`. C15–C26 remain paused. No release, merge, persistence migration or second graph owner is introduced.

The repository-wide audit inventoried 433 TypeScript/TSX files (103,358 lines), checked imports/references, TypeScript unused declarations, exact duplicate function bodies, CSS class producers and the package test inventory. Targeted semantic review traced compiler/resolver ownership, synchronous file publication, on-demand generation fences, snapshot restoration and gate-count presentation. This is a static review plus regression validation, not a claim that every path or platform has been exhaustively exercised.

## Completed cleanup

- Remove `ContentPane.tsx` and `RelationPopover.tsx`: neither has a production importer or dynamic loader. The current central editor and native `RelationModal` own those workflows. Preserve the persisted `showContentPane` field/default and historical validation receipts.
- Remove 41 selectors exclusive to those retired surfaces and the superseded private mini-slider. Retain shared native relationship-modal styles and dynamically generated role/surface classes.
- Reuse `ActionButton` for Find's filter action and Footprints' copy/reset actions. DOM classes, labels, button type, disabled behavior and click ownership remain the same. Its narrow additional contract forwards pressed state and the native React click event; no listeners or lifetime owner are added.
- Share finite predicate choices between lens and preset editors. Keep center-relative path and indexed note-type suggestions with their existing callers. Declared roles still exclude derived siblings and include hidden relations.
- Remove one write-only ontology control reference and avoid retaining an unused materialization-location constructor property. Constructor arguments and initialization behavior are preserved.
- Register four previously omitted portable diagnostic suites in the normal test lane: storage comparison plans, owned IndexedDB filesystem inventory, offline checkpoint codec and consumer probe contracts (27 cases). Historical PR207 variant suites remain separate because they require exact old Git objects rather than the current production implementation.
- Correct a stale scene-admission test inherited from accepted main: PNG is now supported by the native format owner. Preserve the rejection matrix with a missing-file case and add positive PNG/MP4 and negative ZIP scene contracts, including exact occurrence, canonical identity and unchanged attention.
- Correct native gate-probe cleanup: close its owned Sidecar, release its canvas demand and restore prior navigation before deleting fixture documents. Three portable contracts exercise the actual finalizer, including close failure and an originally empty navigation pointer. Production readiness predicates and native deadlines remain unchanged.
- Reopen the registered K-Plex start command after the foreground harness restarts the plugin, so real visible demand can start unrelated background acquisition. Two orchestration contracts cover normal restart and independent cleanup after a failed start command. No index work or readiness is injected.

## Findings retained deliberately

| Finding | Assessment |
| --- | --- |
| Large `GraphIndex`, plugin composition root and view modules | Maintenance risk remains, but extracting coordinators or retiring facades would resume the paused structural refactor. No broad extraction in this cleanup. |
| Apparently unused indexing helpers/fields | Several are read by characterization or native diagnostics (`semanticSourceSignature`, `rebuildQueued`, `restoredVaultSignature`, requested-order reader). The unused private legacy snapshot reader and its helper family need a scoped cache-format retirement review. Unused-local output alone is insufficient removal evidence. |
| Similar source-reference/host-identity helpers | Small exact duplicates occur across current and retained source collectors. Consolidation would cross semantic/compatibility boundaries for little benefit; preserve existing owners. |
| Dynamic CSS role names | Literal class searches miss generated role/surface names. Preserve those selectors. No wholesale CSS deduplication or theme/cascade rewrite. |
| Algorithmic and semantic concerns | No confirmed semantic bug or non-polynomial algorithm was identified in the traced critical paths. Large-vault work and retained legacy implementations warrant separate measured investigation; no speculative indexing change is made. |

## Validation

Required runtime: Node 22.22.2; actual installed Obsidian types are used by the production build.

| Check | Result |
| --- | --- |
| Focused shared UI/Footprints/presentation/relationships/numeric architecture | 126 passed |
| Predicate browser/rules/localization | 37 passed |
| Newly registered diagnostic cases | 27 passed |
| Editor/scene contracts after stale fixture correction | 51 passed |
| Ontology modal browser contracts after private-field lookup removal | 30 passed |
| Native cleanup/event harness contracts | 11 passed, including three added finalizer cases |
| Host runner/restart/finalizer contracts after demand correction | 44 passed, including two added restart cases |
| Real production build and official Obsidian scanner | Passed in final uninterrupted verification |
| Full `npm run verify` at production checkpoint `d79f0f7` | Passed: release, architecture 9, core 132, main 1,827, browser 452, sources 357, real IndexedDB 856, production build |
| Native hydration | Passed: 739 pages / 2,111 declarations, ordered oracle parity, zero added body reads/parses, cancellation and late-publication rejection; cleanup passed |
| Native editor save/gate continuity | Passed: three prose saves, zero badge/scene mutations, real link remove/add publication; cleanup passed |
| Native filtered gates | Six cases passed: Keep/Reflow × crosslinks on/off, clear filter, presentation-only; complete cleanup |
| Native foreground live updates | Passed with real unrelated P3 body held: native creation, Vault search, local semantics, recent synchronization and composer selection; genuine drain and complete cleanup |
| Overall Small restoration | Original Eager profile, 117 files, zero K-Plex canvases, exact settings/workspace/enabled-plugin bytes, all controllers retired, no fixture files remaining |
| Final-head CI | Required PR check; its final state is reported on the PR |

New browser assertions cover pressed-state updates, native clipboard event ownership, exact finite-choice ordering, declared-versus-derived role vocabulary, caller-owned note types and return to free text. Existing indexing, durability, supersession, hydration, relation precedence and gate-count tests remain intact, with unchanged deadlines and assertions.

The first full attempt stopped in the main lane before browser/source/IndexedDB lanes. Its failing test and editor-admission implementation were byte-identical to `main@ec3c07d`; the cleanup had not touched either. Current main's native format-policy test already explicitly accepts PNG/MP4 and rejects ZIP. The scene contract now follows that accepted ownership boundary while retaining missing/hidden/recreated/mismatched/native-refused rejection coverage. The obsolete media expectation changed; no production guard or test deadline changed.

The second attempt exposed a missed test consumer of the removed write-only `descriptionControl` field. The caret test now queries both mounted textareas by their existing accessible labels instead of retaining an unused production field solely for inspection. Every focus/caret, partner-switch, independent-draft and saved-output assertion is unchanged; all 30 ontology modal browser cases pass. Production behavior was not adjusted for this correction.

Native preflight first rejected a relative configuration path, then a reloaded session with no visible canvas/readiness. Neither is counted as acceptance. A retained, normally opened Small session supplied the required readiness. Two gate-probe attempts passed functional assertions but failed cleanup: closing its native editor alone left semantic demand/navigation pointing at retired fixture documents. Passive inspection showed no active source work but pending semantic preparation. Releasing owned UI and restoring prior navigation before deletion fixed that test-resource ordering; the final native run and independent restoration passed with unchanged assertions/deadlines. The harness-only follow-up happened after full verification; its 11 focused contracts pass and final PR CI covers the complete tree.

The foreground harness first refused the Eager profile, then failed to reach its real P3 hold after restart. Its original restart sequence enabled the plugin without reopening visible canvas demand. The registered start command fixes that harness prerequisite; the final run passed in an actual temporary desktop On demand/background/Responsive session. It uses the existing workspace-ready variant, with no claim for the separate original early-workspace case. All original preferences were restored afterward. The combined runner/finalizer follow-up passed 44 portable cases. Production `src/`, stylesheet, manifest, build configuration and lockfile remain identical to the fully verified `d79f0f7` checkpoint; later changes affect test tooling, test registration and records only.

Native validation used only the existing disposable Small vault, explicit target/configuration checks, exact artifact hashes and serial drivers. All four final runs and overall restoration passed. The [curated receipt](code-quality-review-2026-10-31.json) records exact hashes, coverage, retained failures and limits without publishing vault contents or private raw profiles. Native `dev:errors` retained one SettingsConflictError at 15:46:43, before this validation; no newer entry was observed. No production vault deployment was performed.

## Maintainer verification

Highest-probability remaining risk is UI/theme interaction rather than semantic publication. Check: (1) Find filter pressed/disabled states and Footprints copy/reset; (2) lens/preset finite selectors and free-text switching; (3) actual phone/tablet touch and popout focus with the maintainer's theme. Windows/browser results do not substitute for physical mobile, macOS or minimum-host acceptance. The PR must remain open and unmerged pending maintainer verification.
