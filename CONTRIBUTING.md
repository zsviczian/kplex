# Contributing to K-Plex

Thanks for helping improve K-Plex.

K-Plex is a deterministic spatial knowledge graph for Obsidian, not a generic force-directed network. Contributions should preserve its semantic layout, legacy data-migration guarantees and large-vault responsiveness.

## Coding requirements

Read [CODING_STANDARDS.md](CODING_STANDARDS.md) before implementing or reviewing changes. It is the canonical source for timer/window ownership, API discipline, cleanup, scanner compatibility, copy/localization, naming, documentation and validation. Add cross-cutting requirements there; keep contributor workflows and native acceptance commands here. See [AGENTS.md](AGENTS.md) for architecture and subsystem constraints.

## Setup

Use Node.js **22.22.2** for acceptance checks. If your environment cannot provide it or install dependencies, record the limitation and return runnable checks for the validation agent; results from another runtime do not replace the required lane.

```bash
npm i
npm run verify
```

For watch-mode development:

```bash
npm run dev
```

Build output must appear in `dist/` and contain:

- `dist/main.js`
- `dist/manifest.json`
- `dist/styles.css`

The plugin ID is `k-plex`.

### Release metadata

Prepare the next release with one command:

```bash
npm run release:prepare -- 0.2.1
```

This updates both manifests, `package.json`, the lockfile's root versions and `versions.json` together. It preserves locked dependencies and historical minimum versions. Re-running the same version is safe, including after a partially completed bump. It does not build, commit, create a tag or publish.

Review and commit the changes, then push a matching tag such as `0.2.1`. The tag-driven release workflow installs the committed lockfile, builds, validates and publishes the three assets automatically. Local build/upload steps are unnecessary for publishing. Tag the release commit after preparing and committing its metadata.

The project grant is **AGPL-3.0-only**. Keep `LICENSE` verbatim and preserve third-party license records. Root `package.json`, the top-level lockfile and its root package entry share the manifest's numeric release version and package name; the project license agrees between `package.json` and the lockfile's root package entry. Dependency records remain unchanged when correcting metadata. The exact Obsidian dependency and locked version match `minAppVersion` (currently `1.13.0`).

Ordinary builds ship `manifest.json`. Both manifests use the same numeric `x.y.z` version and minimum; `manifest-beta.json` may have a different description. This follows [Obsidian's numeric manifest-version format](https://docs.obsidian.md/Reference/Manifest). Release tags accept one optional lowercase `v`: a tag such as `v0.1.3` selects stable, while `0.1.3-beta-1` or `v0.1.3-rc.1` selects beta. The numeric tag base must match both manifests and npm roots. Prerelease identifiers follow SemVer, including its numeric leading-zero rule; build metadata (`+...`) is unsupported. The shipped manifest keeps the numeric base, so its version agrees with the bundle identity embedded by the ordinary build.

`versions.json` maps published numeric versions and the next intended release to their actual minimum Obsidian versions. Its nine initial entries (`0.0.1`–`0.0.5`, `0.1.0`–`0.1.3`) were checked against both public release assets and tagged manifests; all require `1.13.0`. The preparation command adds the next intended release; do not invent historical releases.

Run `npm run check:release` for a read-only consistency check (included in `npm run verify`). Optional local packaging checks use `npm run build` followed by `node scripts/check-release-metadata.mjs --tag 0.2.1 --prepare-dist`; append a prerelease suffix to select beta. This packaging check validates existing versions and built artifacts; it does not bump versions. Rebuild before checking another channel. The release workflow runs this check before attestation/publication. Malformed metadata/tags or mismatched shipped manifests fail before preparation writes.

Production bundles identify themselves by the committed manifest version. Git commit hashes and dirty-working-tree markers appear only in development builds: production output must remain identical when rebuilt from a checkout or its source archive. Release CI uses the exact Node version from `.nvmrc`, `npm ci`, and the same build/hardening path as local production builds. Release tests cover Git-state independence before publication.

Do not consider a change complete until it builds against the real installed Obsidian typings. A local stub harness is useful for fast checks but is not authoritative.

`npm run check:release` validates shared release metadata. `npm run check:architecture` checks migrated-layer imports and its negative fixtures. `npm run check:core` type-checks the host-free core with no DOM/Node ambient types and runs clean-process core contract tests. `npm run lint:obsidian` runs the official Obsidian ESLint plugin. `npm run verify` runs release metadata validation, the architecture and core lanes, Obsidian lint, all non-host tests, then the production build. No Obsidian installation is needed for these commands. Browser-bearing test lanes run with `--test-concurrency=1` so independent Chromium instances do not compete for startup resources on CI; assertion deadlines and test coverage remain unchanged. The C03 button DOM test needs a local Chrome/Chromium-family executable; set `KPLEX_TEST_BROWSER` to its absolute path if discovery fails. The full/incremental semantic engine is portable, while legacy host binding and much of the application/UI remain migration seams; see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and the checkpoint ledger in [Refactor plan.md](Refactor%20plan.md). Review every Obsidian lint warning and avoid introducing new ones. L00 established the English catalog; L01 migrates legacy copy and enforces known presentation sinks with negative fixtures.

SI3 source storage has two focused lanes: `npm run test:sources` exercises production codecs, storage-degraded facts, host acquisition and GraphBuilder integration; `npm run test:sources:browser` exercises real Chromium IndexedDB, including a fresh browser-process restart. Both are included in `npm test`. The same `KPLEX_TEST_BROWSER` setting selects Chromium (`KPLEX_CHROMIUM` is also accepted). Missing or administratively blocked browser access fails that lane, rather than substituting a mock. See [the source repository contract](docs/SOURCE_REPOSITORY.md) for current Review limitations.

### Desktop CLI setup (Windows and macOS)

Install a CLI-capable Obsidian desktop installer, enable **Settings → General → Advanced → Command line interface**, and complete registration. Keep Obsidian running and the test vault open. Restart the terminal (and an already-running IDE/agent session) after registration so it sees the updated PATH. See [Obsidian's CLI installation and troubleshooting](https://help.obsidian.md/cli).

Use `kplex-test-small` for functional checks and `kplex-test` for scale work. Names alone do not establish a large fixture: record its actual file counts. Both must be disposable vaults, separate from personal notes. Existing prepared vaults need no recloning or configuration reset.

When a new vault is needed, an agent must obtain the user's consent for its new repository/destination, then clone [kplex-help](https://github.com/zsviczian/kplex-help) into a **new** `kplex-test-small` or `kplex-test` directory (`git clone https://github.com/zsviczian/kplex-help <new-directory>`). Alternatively copy the local `../kplex-help` checkout into a new disposable folder, including `.obsidian` and excluding `.git`. Never overwrite an existing vault. The help repository supplies content and plugin settings, not the executable K-Plex bundle. Open the folder as a vault, accept Obsidian's first-open trust prompt for this known source, then close and reopen that vault so enabled plugins initialize. Install/enable K-Plex and any companion required by the selected test; check **Settings → Community plugins** before running the lane. A trust dialog requires native UI interaction and can block CLI tests until accepted.

All native drivers honor `KPLEX_OBSIDIAN_CLI` as an executable path (without enclosing quote characters or extra arguments). With no override they discover standard installations, then fall back to `obsidian` on PATH:

| Platform | Launcher | Shell configuration |
| --- | --- | --- |
| Windows | `Obsidian.com` beside `Obsidian.exe`, commonly under `C:\Program Files\Obsidian` or `%LOCALAPPDATA%\Obsidian`. Use the console launcher to capture output. | PowerShell uses `$env:NAME='value'`; registration updates the user PATH. |
| macOS | `/Applications/Obsidian.app/Contents/MacOS/obsidian-cli` (legacy installs may use `Obsidian`); registration provides `/usr/local/bin/obsidian`. | zsh/bash use `export NAME=value`; registration may request administrator permission. |

Verification launches npm through the current Node executable and `npm-cli.js`, without a shell. Browser tests discover installed Chrome/Chromium/Edge; set `KPLEX_TEST_BROWSER` (or `KPLEX_CHROMIUM`) to an absolute executable path for a nonstandard install. Browser profiles and default reports are temporary. Do not paste shell-specific environment assignments between PowerShell and zsh/bash.

Large Windows `eval` controllers can exceed the native command-line limit. The shared process helper writes long or multiline local test scripts to an owned temporary directory, sends a short single-line CLI eval that reads that exact file, then removes the directory after command completion/failure. This affects test tooling only; it downloads or runs no remote code. Keep driver process deadlines and controller cleanup intact. If CLI requests time out across vaults, check for a pending native dialog first: an Obsidian main-process JSON parsing error blocked requests during Windows setup, and dismissing it restored access. Retry through the shared helper; if access still fails, save work before restarting Obsidian. A timeout alone does not identify its cause.

On this Windows PC, the prepared vaults are `C:\Obsidian\kplex-test-small` and `C:\Obsidian\kplex-test`. Run from the K-Plex source checkout:

```powershell
$env:KPLEX_TEST_VAULT_NAME = 'kplex-test-small'
$env:KPLEX_TEST_VAULT_PATH = 'C:\Obsidian\kplex-test-small'
$env:KPLEX_TEST_CONFIG_DIR = Join-Path $env:KPLEX_TEST_VAULT_PATH '.obsidian'
$env:KPLEX_OBSIDIAN_CLI = 'C:\Program Files\Obsidian\Obsidian.com'
$env:KPLEX_HOST_REPORT_DIR = Join-Path $env:TEMP ('kplex-host-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
& $env:KPLEX_OBSIDIAN_CLI "vault=$env:KPLEX_TEST_VAULT_NAME" vault info=path
npm run verify:obsidian
```

For macOS, substitute your actual paths:

```bash
export KPLEX_TEST_VAULT_NAME=kplex-test-small
export KPLEX_TEST_VAULT_PATH=/absolute/path/to/kplex-test-small
export KPLEX_TEST_CONFIG_DIR="$KPLEX_TEST_VAULT_PATH/.obsidian"
export KPLEX_HOST_REPORT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/kplex-host.XXXXXX")"
obsidian "vault=$KPLEX_TEST_VAULT_NAME" vault info=path
npm run verify:obsidian
```

The strict host lane checks the CLI-reported vault path before changing anything, runs `verify`, then disables K-Plex, copies this build's three installable artifacts into the test vault, checks hashes, enables it and asserts a rendered K-Plex view with no captured JavaScript errors. It preserves plugin `data.json` and creates no bundle backup. It writes `report.json` in a printed temporary directory, or `KPLEX_HOST_REPORT_DIR` if set. A missing CLI, wrong vault, failed build or failed assertion returns nonzero. The portable `verify` lane never invokes Obsidian. CLI commands target the named vault explicitly; do not use a personal/default vault for test deployment.

For live plugin/index diagnostics, CLI fault injection, reload-safe references and evidence capture, see [Obsidian runtime testing](docs/OBSIDIAN_RUNTIME_TESTING.md).

After exact-build staging, `npm run verify:obsidian:mindmap-markdown` checks the central-node menu, published command, Copy Markdown, native download bytes, collapsed/subtree/filter scope and independent main/popout sessions in `kplex-test-small`. Use the same three explicit vault variables and a fresh report directory. It observes zero note reads/parses/acquisitions or actual index rebuilds, preserves canvas/editor state, and restores fixtures, configuration, clipboard and native download observers. Run native lanes serially.

After exact-build staging, `npm run verify:obsidian:canvas-image` checks PNG export in Compass, Mind Map and Facets, light/dark themes and 50/100/200% zoom. Use the same explicit disposable Small vault variables and a fresh report directory. It tests native clipboard, exact preview/download bytes, toolbar/canvas menu/palette, independent popout copy/save, preparation cancellation and an actual embedded editor. It observes zero extra source/index work and restores owned notes, views, settings, clipboard and download handlers. Whole-canvas scope includes painted off-camera content but retains internal scrolling clips; the UI discloses that limit. See [the implementation contract](docs/proposals/CANVAS_IMAGE_EXPORT.md) for resource/fidelity limits. Run this native lane serially; physical-mobile sharing and other host/OS versions require separate acceptance.

For actual Mindmap Builder compatibility, run `npm run verify:obsidian:mindmap-builder` with the enabled Excalidraw companion, `KPLEX_BUILDER_SOURCE_DIR` pointing to the local `ea-scripts/src/scripts/mindmap-builder` directory, and `KPLEX_BUILDER_MARKDOWN_PATH` pointing to the previous probe's `native-export.md`. Use a fresh report directory. The driver bundles local Builder sources offline, replaces only unrelated help/marketing rendering, imports into an owned native Excalidraw drawing, inspects hierarchy/crosslinks/raw wikilinks, re-exports, and restores both plugins' configuration and workspace. It records source hashes. These macOS checks do not establish minimum-host, Windows, Android/iOS share-sheet or physical-touch acceptance.

After exact-build staging, `npm run verify:obsidian:editor-mobile-navigation` checks Mind Map root expansion, editor titles and reachable close/restore controls, native PDF viewers in Compass/Mind Map, actual Excalidraw drawings when the companion is enabled, camera/section restoration on revisits, passive navigation without new tabs, and expanded-editor recovery in a popout. Use the three explicit Small-vault variables above and a fresh `KPLEX_HOST_REPORT_DIR`. `npm run verify:obsidian:rename-mobile-viewport` switches desktop Obsidian through phone/tablet emulation and supplies a controlled 300-pixel keyboard viewport to the real Rename Modal; it verifies visible, reachable Rename/Cancel controls and restores the original mode/configuration. Run native drivers serially. Synthetic activation and desktop keyboard emulation do not establish physical Android/Gboard touch or WebView acceptance.

After exact-build staging, `npm run verify:obsidian:menu-anchor` checks sync and Sidecar menu anchors in `kplex-test-small`, using the same three explicit vault variables and a fresh `KPLEX_HOST_REPORT_DIR`. It delivers trusted pointer and focused-button keyboard input, invokes the published sync command, and checks hidden-toolbar fallback, rapid reopening, Escape/outside dismissal, narrow popout clamping and two-way window migration. A forwarding observer selects Obsidian's inspectable DOM Menu backend without changing coordinates or action choices. The driver restores workspace, settings, display modes, follow owners and configuration bytes. OS-native menu rendering on Windows/macOS and physical touch require separate acceptance.

Run native drivers serially and keep the selected Obsidian window foreground. Native focus helpers call the [macOS-only Electron `app.show()`](https://www.electronjs.org/docs/latest/api/app#appshow-macos) only when available, while still showing/focusing the selected window on Windows. After strict staging passes, use a fresh report directory and the same vault variables for the applicable focused lane. To switch vaults, update **all three** identity/path/config variables. A sandboxed agent may need permission to connect to Obsidian's local IPC and write the selected vault outside its source checkout; an IPC failure inside a sandbox does not establish that Obsidian is closed. A CLI-disabled message requires enabling the host setting, not reinstalling K-Plex. Never resolve a failed preflight by targeting the default/personal vault. Windows PowerShell 5.1 can strip embedded double quotes from direct native `eval` arguments; run complex probes through a Node script with `spawnSync(executable, args)` as the drivers do.

After staging the verified build, `npm run verify:obsidian:si4` uses the same three disposable-vault variables to run native settings acceptance. It checks installed artifact hashes, waits for actual startup/source readiness, then tests saved ontology/inference/image policies, rendered gates/labels, siblings, search/provenance and stale writes with zero body reads/parses/acquisitions or full builds. The default requires at least 20,015 Markdown files; `KPLEX_SI4_REQUIRED_FILES=0` selects a small-vault harness check. It restores settings, owned fixtures, wrappers, demand and renderer throttling; `si4-native.json` records actual results in `KPLEX_HOST_REPORT_DIR`. This functional diagnostic does not replace SI5 foreground, restart, popout or physical-device acceptance.

After exact-build staging, `npm run verify:obsidian:date-properties` checks default Date relationship roles in `kplex-test-small` using the same three explicit vault variables and a fresh `KPLEX_HOST_REPORT_DIR`. It requires the existing `date` property to be typed Date and Daily Notes to be enabled; it changes neither host configuration. Owned daily/meeting/working-on notes exercise all six unconfigured default roles and inverse views, configured Date ontology overriding defaults, Hidden, generic inference independence, scalar-Date mutation refusal and plugin-reload persistence. The current indexing mode is tested by default. Set `KPLEX_DATE_POLICY_MODE=eager` to temporarily select and reload eager indexing for a prepared-cache run; the original mode is restored through a second reload. Eager policy flips must use cached facts without reads, parses, source acquisition or full builds. On-demand calls are recorded separately because its requested-owner path can acquire sources. The driver also inspects the registered declarative dropdown, records named/timed lifecycle CLI failures, restores settings/configuration bytes and deletes its fixtures and observers. It does not click the dropdown, type into editors, close Settings or establish physical-device/paint acceptance. Run native drivers serially.

After exact-build staging, `npm run verify:obsidian:tooltips` checks the shared control hints. Set
`KPLEX_TOOLTIP_NODE_ONLY=true` for focused node/gate acceptance in main, popout and returned
windows: compact browser title retained, accessible full name present, no competing host node
hint, independent gate hint intact. This scope excludes menu/background-editing cases and does
not establish browser-chrome paint or physical-device acceptance. Use the same explicit Small-vault
variables and a fresh report directory; the driver owns no note fixtures and restores workspace state.

After exact-build staging, run the interaction checks serially with the same three vault variables and a fresh `KPLEX_HOST_REPORT_DIR` per command: `npm run verify:obsidian:interaction-touch`, `npm run verify:obsidian:interaction-gates`, and `npm run verify:obsidian:interaction-excalidraw`. The touch lane delivers trusted native range gestures, checks actual pane bounds and bounded scrolling, and verifies saved preferences after reload. The gate lane uses the unchanged compatibility fixture; set `KPLEX_GATE_USE_EXISTING_FIXTURE=true` when its eleven root Markdown fixtures already exist byte for byte, so they are only read and never deleted. It checks Quick lens Keep/Reflow and cross-links against semantic gate sets, with acquisition measured after setup. The Excalidraw lane requires the enabled companion and checks native command/shortcut routing, linked-tab and Sidecar representation, and embedded initial Markdown modes and explicit toggles. These drivers restore their owned state and check artifact hashes. Desktop touch emulation and Electron key delivery do not replace physical Android/iOS or Windows acceptance. The touch driver needs exclusive CDP debugger access: close DevTools and stop an idle CLI-owned console capture with `obsidian "vault=kplex-test-small" dev:debug off` before running it. Never detach a competing live test/debugger owner. Restore the previous CLI capture state afterward. Gate fixture setup binds every owned Markdown file through the existing idempotent insertion owner, because a readable foreground page alone does not prove canonical patch membership.

Set `KPLEX_EXCALIDRAW_SCENARIO=issue161` on the existing Excalidraw interaction command to run
the external materialization regressions. Use an actual On-demand session with background URLs
and Responsive pacing; changing the strategy setting alone does not restart the session. This
scenario follows the installed companion's Create EX dialog, checks both prior-ghost-navigation
variants, a fixed pinned document, four complete navigation cycles, and a stationary drawing
Parent/Child edit with explicit roles and solid links. It uses trusted Electron pointer input and
never substitutes direct K-Plex materialization for external creation. The driver removes its
drawings and restores settings, workspace and configuration bytes even on failure. Run it serially
after exact-build staging; Linux, macOS and physical-device acceptance remain separate.

After exact-build staging, `npm run verify:obsidian:hover-highlight` checks the actual **Canvas behavior** Settings toggle, durable saves, trusted mouse/modifier activation on nodes, gates and connectors in main/popout windows, and restored default delayed hover in `kplex-test-small`. Use the same three explicit vault variables and a fresh report directory. The lane owns six temporary notes, restores settings/workspace/configuration bytes and releases listeners/controllers. Its shared `crosslinkPeek.mjs` fixture also checks disabled-crosslink node/four-gate/incoming previews, stationary and held Alt, both hover settings, zero opacity, enabled-crosslink deduplication, geometry/count stability and independent main/popout previews with blur cleanup. It counts body reads/parses/acquisitions and semantic/search calls during guarded hover intervals, plus settings writes during the new preview intervals; fixture, preference and popout initialization are recorded separately. Windows Electron input does not replace macOS Option/menu or physical-device acceptance. Run native drivers serially. See the [PR181 validation record](docs/validation/alt-hover-crosslinks-181-2026-10-18.md) for results and the combined matrix deferred to PR147.

`npm run verify:obsidian:external-settings` uses the same exact-build, explicit Small-vault variables and fresh report directory. It writes synthetic incoming snapshots to the actual plugin data file from the driver process; it never manually invokes `onExternalSettingsChange`. The lane checks real callback delivery, main/sidebar/popout paint, native Settings refresh and retired handlers, command publication, an unrelated local save, real received ontology policy and stationary rendered parents, native editor focus/caret, and torn-file recovery without echo saves. Counts distinguish settings-file reads from note reads/source work. Three owned notes, settings/workspace/configuration, views and forwarding observers are restored; debounced native layout saves drain before byte restoration. Raw configuration backups stay private. Controlled two-instance ordering in `tests/external-settings.test.mjs` complements this Windows lane; actual two-device Sync, minimum-host and physical mobile acceptance remain separate. See the [PR182 validation record](docs/validation/live-settings-sync-182-2026-10-18.md).

The default uses the current index session. To check the other actual session, set `KPLEX_EXTERNAL_SETTINGS_MODE=eager` or `on-demand`; the driver reloads only the selected disposable plugin before setup and restores/reloads its original settings afterward. Each run also receives the opposite stored mode and proves that receipt alone leaves the active session unchanged. Run the two functional lanes serially; they are not comparative timing benchmarks.

`npm run verify:obsidian:interaction-updates` uses the same exact-build prerequisites and explicit Small-vault variables. It checks the actual area-outline Settings toggle, stationary Alt transitions, scroll transparency, gate-to-gate draft geometry, sibling additions through the relationship composer, actual Bases link dragstart/drop, placeholder materialization during a held build, and native File properties following and overlap recovery in main/popout windows. It owns a bounded synthetic folder, restores workspace/settings/window geometry and checks the original file inventory. Setup rebuilds are excluded from presentation-only resource claims. Run this lane serially; desktop input does not establish physical mobile or macOS acceptance.

For native navigation and creation acceptance, use the same exact staged build, explicit Small-vault variables and a fresh `KPLEX_HOST_REPORT_DIR` for each serial run:

- `KPLEX_UX_FIND_ONLY=true node scripts/testing/obsidian/ux.mjs` checks actual F4 search, typed tags/folders/results, tag hierarchy navigation and type icons. Search-only work is counted separately from normal On-demand navigation.
- `KPLEX_ACTION_WORKFLOW_SCENARIO=folder-creation node scripts/testing/obsidian/actionWorkflows.mjs` checks the direction/ontology row, All vocabulary, effective completion footer, lazy bounded note queries, quick creation, wide shared folder suggestions and partial-path matching, trusted folder selection, placeholder aliases, modifier single-click with the center preserved, durable reference relocation and one real plugin reload. Typing/cancellation guards exclude legitimate creation and source updates.
- `KPLEX_NATIVE_INTERACTION_SCENARIO=navigation-enhancements node scripts/testing/obsidian/interactionUpdates.mjs` checks all six actual layout Settings controls, adjacent toolbar/command tab groups, independent center representation/Markdown modes and native leaf restore, main/sidepanel/pop-out placement, dense independent areas and native outbound link payloads/Markdown drops/cross-Plex actions. Use `layout` or `native-drag` to isolate either section. Synthetic DragEvents exercise actual host handlers; the report identifies trusted desktop gesture evidence separately.
- `KPLEX_NATIVE_INTERACTION_SCENARIO=structural-drops node scripts/testing/obsidian/interactionUpdates.mjs` checks saved-node icons/full tag labels, trusted gate drops in both tag/Markdown directions, actual Tag/Note Type choice, conflicting type keep/replace, connector conversion, separate link styling through Settings, cross-Plex tag parent drops, native host-link delivery, YAML unlink/body evidence, move Cancel, confirmed Markdown/attachment/folder moves, central-folder reverse moves with/without Alt and the empty-space folder-child creation gesture. Physical moves use FileManager and restore captured objects before removing the owned fixture. Presentation/Cancel guards are functional operation checks; writes legitimately trigger existing local indexing. Run serially after exact-build staging in Small. Shared-machine timings are not performance evidence.

The native body-drag subcase requires exclusive CDP ownership, just like the touch
lane. Release only an idle CLI console-capture attachment with `dev:debug off`,
and restore its prior capture state afterward. It uses Chromium's
[`Input.setInterceptDrags`](https://chromedevtools.github.io/devtools-protocol/tot/Input/#method-setInterceptDrags)
and the captured data with `Input.dispatchDragEvent`; start/drop must be trusted
and no synthetic fallback is accepted. Cleanup cancels dragging and releases the
owned debugger. This proves native renderer delivery, not physical OS dragging
between windows/applications. Folder acceptance restores the enablement-list bytes
changed by its deliberate plugin reload, including an initially runtime-enabled
plugin whose saved enablement list excludes it.

These opt-in routes retain their existing driver's configuration/fixture restoration and exact artifact checks. Zero-work assertions cover the isolated presentation or payload intervals, including snapshot writes; they do not claim that navigating to new On-demand scopes or writing notes is free. Physical tablet/phone touch and macOS still require their own acceptance.

After exact-build staging, `npm run verify:obsidian:canvas-settings` checks Canvas behavior/Compass routing, native search/Back/focus, tint ownership in main/popout Settings, contributed type configuration and the Views and lenses selector in Small. Test definitions are injected only into owned sessions. The driver checks blocked transitions, retained lens drafts, independent main/popout choices and native view restoration, trusted select keyboard input and zero extra source work in isolated same-scope/type-configuration intervals. It distinguishes legacy flat-control completion from new type configuration. It restores owned notes, Settings policy, registries, wrappers, settings bytes and native workspace. A native view reload is not a full application restart; physical touch, minimum-host and unrelated #215 restart/combined-editor limitations remain separate.

On macOS, set `KPLEX_CANVAS_SELECTOR_OS_KEYS=true` and coordinate the OS automation participant with the report's bounded `await-native-select-os-keys` phase. The driver has already focused the exact Small-owned select. Deliver **Space**, move **Down** to the expected probe shown in the native menu (currently twice because Mind Map follows Compass), then **Return** through OS keyboard automation, without pointer activation or a property/event fallback. Acceptance requires both a trusted key targeting that select and a trusted native change selecting the expected session view. Renderer-only End injection reached the control but did not select an option on the tested macOS host; do not report that as keyboard acceptance. This follows the existing actions lane's explicit OS-CUA distinction and does not establish physical touch testing.

After exact-build staging, `npm run verify:obsidian:color-styling` exercises actual declarative Settings navigation, paired palette strips/property actions, source/alpha/palette/adoption editing, local counterpart recommendations and Compass controls/motion in `kplex-test-small`. Use the same three explicit vault variables and a fresh `KPLEX_HOST_REPORT_DIR`. The driver verifies artifact hashes, measures source/index/search calls in the tested paint intervals and checks retained center/camera DOM and actual mode changes. It owns two synthetic Compass notes, removes only those fixtures and restores settings, appearance, workspace/configuration bytes and listeners/controllers. Cleanup failure fails acceptance. Programmatic activation and trusted range/Escape input do not establish physical native-picker/touch or minimum-host acceptance; OS-specific results are recorded in the validation report.

The color lane also selects theme variables through the real searchable, paired-swatch chooser. For the focused node-style Save/restart reproduction, set `KPLEX_STYLE_REFERENCE_ONLY=true` on `npm run verify:obsidian:style-operations`. Repeat serially with `KPLEX_STYLE_REFERENCE_PROPERTIES=true` to include a native File properties pane beside the single Plex. This path navigates actual Settings subpages, chooses `--h1-color` for Border, saves border width/gate radius, checks rendered dimensions and durable source identity, then checks a stationary Parent after plugin reload. It also waits for the actual initial-center watchdog diagnostic and exercises missed-presentation recovery in a fresh native Plex tab: a temporary reader wrapper presents an incomplete frame, is restored without notification, and the real timer must restore the Parent and record its before/after counts. If the host has no heading color, a test-owned temporary CSS variable supplies it and is restored. Two owned note fixtures and exact configuration/layout are restored; these functional checks do not reproduce a long real-vault startup or establish a freeze fix. Save counters exclude fixture setup and the restarted plugin lifetime.

Set `KPLEX_STYLE_SIDECAR_GATE_ONLY=true` instead for the gate-radius/Settings-close reproduction. It opens a managed Markdown Sidecar beside a normal central node, uses the actual Node styling slider, then closes Settings. The Windows lane includes trusted slider/title-bar clicks in editing/reading modes, Default-theme copy-on-write, and closing while a queued storage write is held. It restores configuration/workspace independently of assertions. Passing this bounded Small-vault case does not establish resolution of the maintainer's intermittent freeze or acceptance on another OS; it is not a comparative performance test.

To cover the custom node-style editor with Sidecar open, use `KPLEX_STYLE_REFERENCE_ONLY=true` and `KPLEX_STYLE_REFERENCE_SIDECAR=true`. This reuses the heading-color/dimension Save and stationary-restart probe with a managed Markdown companion; the global-slider lane and this editor lane are distinct controls.

`node scripts/testing/obsidian/themePreview.mjs` checks actual main/popout Plexes and the native Settings editor in both host modes. Use the same explicit small-vault variables, exact staged artifacts and a fresh report directory. Optional `KPLEX_THEME_FIXTURES` names a local directory containing pinned `Minimal.css`, `Things.css` and the manifest described in the [evidence index](docs/validation/native-styling-158-evidence.md). The script validates checksums and rejects remote URLs/imports. It retains original native throttling, foregrounds each owner, finishes initial view activation before counting color work, restores mode/configuration/workspace and removes owned sheets/previews/popout/controllers. Run browser/native lanes serially. Reports contain finite colors/counts and host metadata, not note payloads. Full theme plugins/scripts and physical-device behavior remain separate checks.

To verify ExcaliBrain settings migration, use the same three explicitly configured disposable-vault variables and run `npm run verify:obsidian:migration`. This strict lane runs full verification and stages the exact build, selects `tests/fixtures/excalibrain-migration/data.json` through the real import dialog, compares complete compatible settings/ontology/style dictionaries and persisted data, navigates the rendered Node styling and Link styling pages, checks all imported style entries and their editors, preserves alpha/order on an unchanged legacy-style save, renders temporary styled notes/links, and checks import survival after plugin reload. It writes `migration-report.json` beside the normal host report. It restores pre-test settings, compares complete live and durable appearance/library data after reload, removes only test-owned notes and releases its temporary controller independently of assertions; cleanup failures fail the run. The vault must be a playground, not a personal vault, and existing test paths are rejected.

The migration test uses the installed host's owning settings document because Settings may open in a popout. It closes the nearest plugin modal, not an enclosing settings window, and on macOS focuses the selected renderer before initialization waits. It does not change background-throttling policy or claim performance/device parity. Missing Obsidian/CLI or failed host assertions are failures; the fixture-based migration/resolver/manager-model tests remain part of `npm test` without Obsidian. The scripted file-input event exercises the actual importer but does not automate the operating system's file picker.

To create a reproducible large synthetic input for performance work, run `npm run fixture:large -- --out /absolute/path/to/a/new-test-vault-folder --files 20000`. The generator copies the small indexing compatibility fixture and adds 20,000 deterministic notes. About 10% of all Markdown files are exactly 950,000 bytes, mixing very long paragraphs, large fenced code and dense real links; ordinary notes add shared note hubs and URLs. A default fixture is about 1.9 GB of Markdown, so allow adequate disk space and index time. The generator refuses to replace an existing folder. Check it with `npm run fixture:large -- --verify /absolute/path/to/that-folder`. Keep generated vault contents out of Git and use the same verified fixture and settings for before/after runs. Manifest link/declaration counts describe source input; measure actual K-Plex index counts separately.

For the lens color-editor stacking regression, run
`node scripts/testing/obsidian/lensColorStacking.mjs` after staging the exact build, using the same
three Small-vault variables and a fresh `KPLEX_HOST_REPORT_DIR`. It checks fill, border and text
editors, native theme choosers, hit targets, Cancel/Escape and outside dismissal in main and popout
windows. It uses native Electron input, creates no note or saved lens fixtures, and restores
workspace/settings/enablement state. See [the #197 validation record](docs/validation/lens-color-stacking-197-2026-10-21.md).

### Guarded Mac real-data study (PR203)

`npm run test:mac-study` checks the study's target, staging, observation-order and storage-lifetime
guards. `npm run study:mac -- /absolute/private/run.json` runs one serial action. Read the current
`HANDOFF.md` before using it. The study accepts only the explicitly prepared `kplex-test-brain-mac`
copy, or `kplex-test-small` with `smoke: true`; it always requires the protected production path.

The private JSON supplies `vaultName`, `vaultPath`, `configDir`, `productionPath`, `action`,
`reportDir`, and the pinned `source` identity. Measurement additionally requires `artifactDir`.
Storage actions use `checkpoint`. Actions are `inspect`, `checkpoint`, `restore`, `resume-restore`, `resume-checkpoint`, `reset`,
`measure`, `control`, `startup`, and `cleanup`. Keep configurations, row streams, sidecars and reports outside
every Git checkout/worktree and both vaults. The driver and standalone native storage controller
reject Git metadata ancestors, including worktree `.git` files. Do not commit real note paths or raw diagnostics.

Prepare the copy offline before trust: privately back up configuration, empty its enabled
community-plugin list, disable Sync/Publish and external startup writers, and park restored
content/plugin panes. Preserve K-Plex data, property types and the remaining core-plugin policy.
Verify host metadata and the indexing notice have settled before running the driver. Ordinary
`verify:obsidian` enables K-Plex and must not consume this copy's first activation.

The driver validates the CLI path, refuses aliases/shared write targets and production overlap,
stages complete hashed artifacts while stopped, and attaches observation at native layout
registration before startup admission. It changes neither indexing pacing nor background
throttling. Require foreground samples throughout. Native system observations use Obsidian's Electron
`powerMonitor`, not an inferred shell power source. Strict runs default to `requireAc: true` and
require a supported unlocked-session reading before activation. Every native sample retains power,
lock and thermal facts; battery samples, power changes and OS locks qualify comparability even
when window focus stays true. `requireAc: false` declares a different power condition explicitly;
it does not turn a battery diagnostic into an AC acceptance run. Earlier reports without this
coverage remain qualified rather than receiving retroactive power certification.
A hidden control/run is retained and excluded
from foreground timing comparisons, even when its native window reports focus.

Default measurement observes natural source/URL/persistence closure and ten quiet minutes, capped
at 45 minutes; expiry is incomplete, not success. Gaps longer than five seconds restart the observed quiet interval and invalidate strict CPU
eligibility. Samples retain native window/document focus and visibility, original background
throttling and the actual gap. Keep rejected/qualified observations in the evidence set.
Full-build classification must use semantic diagnostics and explicit build decisions: the probe's
`fullBuilds` counts `rebuild()` calls, and both it and `sessionWork.fullBuildStarts` omit the
progressive compiler entry. A zero value alone does not establish that no full build occurred.
A disabled control requires at least one minute; its shorter horizon is not a matched ten-minute
idle comparison. Checkpoint/restore stream all
stores with schema/count/digest checks while K-Plex is off. Reset requires retained test storage;
a blocked deletion stays owned and prevents activation until its real terminal event. Storage
timeouts never authorize another concurrent driver. Decoded value digests must match before an
import clears stores and must match again after the atomic native commit. Fresh report directories
preserve interrupted receipts. Typed-view exports use the base V8 structured serializer, preserving
shared backing buffers; raw V8 bytes are never the equivalence oracle.
Each encoded row is capped at 64 MiB to accommodate observed native snapshot chunks.
Decoded verification yields between bounded batches outside live IDB transactions while
retaining exclusive storage ownership; an oversized frame fails before import opens storage.
`resume-restore` and `resume-checkpoint` only observe an already-retained native job to its terminal
result and check every returned store digest against the declared checkpoint; they never start
another write. Keep the original timeout receipt and use a fresh recovery report directory.
Timed observation retains external CLI timeouts and retries under its unchanged deadline while
the already-armed native sampler continues; other observation errors still abort. `stopAt`
optionally sets an absolute ISO observation deadline within the unchanged 45-minute run cap;
an unfinished ten-minute quiet interval remains incomplete.

`oracle: true` adds bounded existing-target navigation/provenance checks after timing stops;
`oracleTargets` carries the same private sequence to the other arm. `nativeProfile: true` requires
`purpose: "diagnostic"` and captures separate five-second Browser/renderer native stacks plus
a five-second renderer CDP CPU profile. It refuses an existing debugger/DevTools owner and
releases its own profiler/debugger independently of success. `profileAfterMs` selects the phase;
the bounded window must fit the diagnostic deadline. Raw frames remain private.
The same profile option is available for diagnostic `startup` runs. `captureSourceFlags: true`
adds bounded existing-native-object flag counts after reconnect and around capture, capped at
20,000 Markdown objects, without note reads, acquisition or exported identities. It also counts
retained-memory/unsaved overlap, active lanes, pending deletion and retry/readiness flags without
calling stored validity predicates. `lateStartupObservers: true` permits diagnostic forwarding after
CLI reconnect; coverage remains `since-late-attachment`, never pre-admission. `diagnosticEvents: true`
retains at most 128 aggregate fixed-label mask/adoption/reconcile events, with overflow explicit.
`convergenceDiagnostics: true` adds PR206's diagnostic-only bounded source/adoption transitions,
native-event categories and actual #204 private-reclaim versus selected-repair branch counts.
It performs no extra proof reads, source work or scheduler changes. Its 256-event detail limit
and 32 concurrent activation-observer limit expose overflow. Anonymous owner trajectories retain
at most eight weak identities and 128 scalar transitions; startup forwarding remains late.
No owner IDs, method arguments or error text are exported. `resourceCounts: true` records native
transaction/request counters without detailed payload serialization; it cannot be combined with
`detailedResources`. Each option requires `purpose: "diagnostic"`.
Pure diagnostic flag queries retry at most twice under the original run deadline, recording each
transport timeout; functional errors are not retried. Profiler ownership/start failures remain fatal.
A failed startup attempts a full probe snapshot before independent cleanup; an unavailable failure
snapshot remains explicit rather than a successful capture.
Those runs are diagnostic, not acceptance timing. `startup` requires the maintainer to save/close
other vaults first and independently verifies exactly one test window before normal quit/relaunch.
Its external process recorder arms while Obsidian is absent, survives CLI reconnects, and includes
early CPU; native operation counters attached later remain explicitly incomplete. Startup temporarily
saves only K-Plex enablement and restores the original enabled list/data/layout. Supply `checkpoint`
after an immediately preceding verified restore and the same private `startupLayout` receipt for
matched startup arms. `layout-measured.json` captures the ordinary active layout after measurement
and before post-timing navigation. Startup also checks the registry will reopen only the test copy;
completion requires native metadata readiness, the expected center's DOM and natural quiet.
Never invoke it against an application containing another vault.
`detailedResources: true` reuses the existing native transaction/request/family ledger in a separate
diagnostic run; its inclusive method durations and JSON payload estimates are not CPU or disk bytes.
Its phase labels use the last scalar sample's source/hydration progress, with up to one sample
of attribution lag; individual operations never recalculate plugin status.
The phase table is capped at 256 buckets. If `groups.other` contains events, classified native
request/transaction totals are lower bounds; do not infer total operation equality or CPU shares.
Dedicated reader/lease counters have separate coverage and overflow fields.
`availabilityTargets` replays the retained seven-kind sequence during background indexing;
`availabilityAfterMs` selects its start and the bounded workload must fit the diagnostic deadline.
It records provisional gates and DOM/search availability, uses normal navigation with native
document follow off, and makes no complete-semantic, physical-input or paint claim. The driver owns
cancellation and restores layout/settings independently of success.
See the [PR203 record](docs/validation/mac-vault-indexing-203-2026-10-22.md)
for actual coverage and limitations; implementation does not establish native acceptance.
Receipt `status: "complete"` records completion of the requested observation horizon. Check
`validCpu`, `comparable`, process-exit coverage and cleanup independently before accepting timing;
disabled controls use observed elapsed time because their loaded-plugin quiet predicate stays false.

## Documentation

`README.md` is the public, end-user-facing introduction and usage guide. Keep build commands, internal architecture, performance invariants and implementation notes out of the README.

- Put contributor workflow and development requirements in `CONTRIBUTING.md`.
- Put durable technical/design documentation in `docs/`.
- Put end-user feature guides in `docs/` when a README section would become too detailed.
- Release notes should describe user-visible changes and workflows rather than internal implementation details.
- Keep the first-start indexing notice and product screenshots near the top of the README.

The detailed end-user lens guide lives in `docs/GRAPH_LENSES.md`.

Trusted local automation is documented in the [public API reference](docs/PUBLIC_API.md) and
[Obsidian CLI guide](docs/CLI.md). The API uses the existing indexed graph, committed canvas
owners and [portable package validator/writer](docs/PORTABLE_PRESETS.md). It must not introduce
default source acquisition or a second indexing/settings service. Draft implementation and
validation status are recorded in those references and the associated PR; focused tests do not
replace complete verification and exact-build native acceptance.

After `npm run verify:obsidian` stages the exact build in the explicit Small vault, run
`npm run verify:obsidian:public-api` and `npm run verify:obsidian:public-api-lifetime`
serially with fresh `KPLEX_HOST_REPORT_DIR` destinations. Both require the three disposable-vault
variables from the Desktop CLI setup. The API lane checks independent canvases, filters, views,
presets, popout migration, shared Markdown bytes, passive work counters and confirmed
configuration imports; the lifetime lane retains an old handle across plugin disable/enable.
They preserve settings/enablement bytes and do not validate macOS or physical mobile input.

Bundled third-party legal notices use esbuild's retained legal-comment blocks. The GraphQL.js
adapter includes the installed package's complete MIT notice, and
`tests/public-api-license.test.mjs` checks that production minification retains it. Keep this
notice aligned with the installed dependency when updating GraphQL.js; do not remove it from
generated release code.

## Before changing Obsidian integration

Follow [coding standards](CODING_STANDARDS.md#obsidian-api-discipline).

## Design principles

### Current architecture and feature placement

**C14 is accepted and refactoring is paused.** The production full and incremental paths now share a portable semantic engine. Obsidian remains the production host; coordination, storage, search implementation and much of the graph-to-UI/application path still have named legacy seams. Do not start C15–C26 just to deliver a feature or claim those planned extractions already exist. Read [AGENTS.md](AGENTS.md), [architecture](docs/ARCHITECTURE.md) and the definitive [refactor tracker](Refactor%20plan.md) before changing ownership.

| Change | Extend the current owner |
| --- | --- |
| Markdown/property grammar | `src/core/parser/metadata.ts`; host merge/resolution remains in adapters/legacy facades. |
| A relationship source | Obsidian source collectors supply normalized facts; `src/core/graph/compiler.ts`, `patch.ts`, `evidence.ts` and `resolver.ts` own compilation, precedence and meaning. |
| Graph reads or search | Narrow contracts in `src/core/graph/read.ts`; GraphIndex still implements production search and publication. Map only returned data, not the whole vault. |
| Lens or predicate behavior | Existing `src/core/plex/predicate.ts`, `predicateParser.ts` and `lens.ts`; lazy field/pair providers, one AST/evaluator. |
| A new view mode | Projection chooses semantic nodes/relationships, layout maps roles to positions and physical gates, rendering consumes that result. Keep current modes/defaults and sibling visibility separate from graph semantics. |
| Shared UI behavior | Existing `ActionButton`, `FloatingLayer`, `FuzzySuggester` and collection helpers under `src/ui/components/`; caller supplies icons, text, results and actions. Feature content lives in `src/ui/features/` where migrated. |
| Vault/workspace/native effects | Obsidian adapters and existing composition in `src/main.ts`/native shells. A new port is defined in its consuming layer, not by passing the plugin to portable code. |
| Copy, shortcuts or device routing | `src/lang/`, `src/core/plex/shortcutPresentation.ts` and `PresentationEnvironment`; host adapters supply language/device/input/capability facts. |

Portable core/application/lang cannot import Obsidian, legacy host modules, DOM/browser globals, storage or Node APIs; inject clock/yield/lifetime and other required capabilities. Portable React mechanics/features can use standard DOM in their owning document/window, but not Obsidian APIs or global plugin discovery. Shared components contain no graph policy. Adapter-to-core imports are allowed; core-to-adapter imports, cycles and transitive host leaks fail architecture checks. Preserve canonical owners and finite compatibility-facade caller lists rather than creating duplicate classifiers, parsers, evaluators or schedulers.

Treat `NodeId` as exact opaque identity; never derive path, case rules, kind or materialization from it. Semantic and physical paths are separate optional facets. Readonly views can share revision-scoped metadata; they are not frozen snapshots. Normalized source batches retain exact target/occurrence/ownership facts and at most 256 records, with terminal rejection/finality/revision fences. Stream dense input: a record-count cap does not bound payload bytes or justify a second whole-vault DTO array. Preserve provenance multiplicity, incoming declarations and shared tag/URL lifetimes. See [normalized source contracts](docs/NORMALIZED_SOURCE_CONTRACT.md).

### Mixed agent development

Most implementation and substantial trace analysis is assigned to an **offline development agent without Obsidian CLI access**. The **main validation agent with CLI and full dependencies** prepares work, supplies live reproduction/debug evidence, reviews and fixes returned changes, performs applicable native validation and manages the repository. Limited dependency/network access is recorded separately from absence of Obsidian; `npm run verify` itself needs no running Obsidian.

Follow [the mixed agent workflow](docs/AGENT_WORKFLOW.md). `HANDOFF.md` is the single transient bidirectional assignment/results document: preserve its standing header and overwrite its body for each transfer, never archive it or use it as an ongoing log. Each assignment includes base/diff identity, scope and acceptance criteria; an investigation can include minimized debug traces and requested analysis. The offline agent returns uncommitted changes, actual tests, failures and pending host checks. The main agent independently validates the exact returned code, fixes defects and reports automated results and up to three prioritized manual checks, or states none are needed.

Missing host/device checks remain pending; a skip is not a pass. Any maintainer-accepted limitation must be explicit. Once required validation is confirmed, repository actions follow the maintainer's authorization; an offline implementation return does not authorize a commit, PR, merge or release. Refactor outcomes persist in `Refactor plan.md`; feature evidence belongs in the issue/PR or a reviewed validation report, with architecture decisions linked from the plan when relevant. No new assignment automatically resumes the paused refactor.

### Localization and environment rules

Follow [coding standards](CODING_STANDARDS.md#localization-readiness).

### Relationship semantics are spatial semantics

The core layout is deterministic:

- parents: north/top
- children: south/bottom
- friends / previous: west/left
- challengers / next: east/right
- siblings: separate peripheral region

Changing a relationship's semantic role or precedence is a graph-contract change. A deliberately selected rotated/mindmap layout can map the same roles to different positions and physical gates without changing graph meaning; preserve the existing views' spatial defaults and test the new layout contract independently.

### Preserve legacy compatibility

ExcaliBrain compatibility is limited to graph ontology and graph/node/link appearance. Use `importExcaliBrainGraphSettings` for first-run and manual imports; use `migrateAndMergeSettings` for K-Plex's own persisted data. Do not import plugin CSS, commands/hotkeys, navigation, workspace/editor preferences or scheduling. K-Plex commands are registered once with canonical IDs; old shortcuts must be reassigned rather than aliased.

Before changing settings, ontology or graph reconciliation:

1. review the portable compiler/evidence/resolver owners, normalized source collectors, `src/settings.ts`, `src/index/GraphBuilder.ts` and `src/index/GraphIndex.ts`; legacy evidence/resolver files are compatibility facades
2. assume users may have legacy ExcaliBrain data/settings
3. prefer additive settings with defaults
4. add explicit migration logic for renamed/reshaped data
5. preserve explicit-over-inferred relationship precedence
6. keep old ontology field names meaningful
7. preserve K-Plex's deliberate rule that conflicting frontmatter ontology overrides body ontology for the same declaring note/target, while retaining the overridden evidence for explainability

Folder and tag nodes may be central, but structural folder/tag connections are not editable with drag-linking. Dragging outward from a folder's child gate is the specific file-creation exception: create a real child file and its file-tree membership, not a note-to-note ontology link.

### Keep the UI on top of normalized graph APIs

React components should not independently classify relationships or rescan the vault.

- adapters collect host facts; portable compiler/evidence/resolver modules own graph meaning
- GraphBuilder acquires bodies and privately stages/binds results; GraphIndex owns publication, current search and affected-cache refresh
- settings compatibility stays in `src/settings.ts`; existing snapshot/body-cache orchestration stays behind its current index/IndexedDB seams
- Obsidian lifecycle/workspace integration remains host-owned; define narrow consuming-layer ports for new migrated use cases
- React renders normalized read results and invokes supplied actions; arbitrary note properties and relationship evidence stay lazy, field- and pair-scoped respectively
- filtering/styles/order/camera/fold state never trigger a semantic rebuild, whole-vault property scan or persisted frontmatter/image expansion

## Performance rules

K-Plex is expected to work in vaults with tens of thousands of files and over 100,000 graph/search entries.

Performance regressions are considered functional bugs.

### Avoid full rebuild storms

Do not rebuild on every startup `vault:create`/metadata event.

Changes that touch indexing should preserve:

- IndexedDB as the durable index/parser cache; do not put large index payloads in local storage. Bump the IndexedDB database version whenever stores/indexes change so existing vault databases receive the migration.
- on large iOS cold starts, body-cache prewarming must happen in bounded transactional batches before the full graph is retained; keep it cancellable and resumable
- declaration-compact evidence storage (one original declaration; inverse perspectives derived on demand)
- rejecting structurally stale/half-bound snapshots before publication, so a replacement build does not coexist with a misleading full cached graph
- `npm test` compatibility-fixture coverage (`tests/fixtures/excalibrain-indexing`)
- startup metadata stabilization
- event coalescing/debouncing
- dirty-index checks
- path-indexed evidence updates for single-file edits; do not scan the complete evidence store when provenance already identifies the touched path
- time-budgeted cooperative yielding on large collectors/resolvers; do not yield every note on iOS
- deferred/coalesced snapshot writes, cancelled when the final K-Plex view closes
- atomic neutral source heads as cold-build progress; preserve read compatibility for legacy graph checkpoints, never resume old semantic results under changed policy, and do not restore the retired full-graph progress writer
- skipped periodic refresh when nothing changed

Incremental preparation stays private and copy-on-write with canonical page identity preserved. C14b publication synchronously applies graph/evidence, hot field cache and fingerprint, refreshes affected caches/search, then notifies per committed file before another await. The prepared-state callback is exactly once and expires when its publisher returns or throws. Semantic no-ops retain zero semantic events. Cancellation preserves committed files and pending current work; it does not automatically request a full rebuild.

Fence awaited work with generation/demand and captured path/mtime/size/current Vault file identity; full-build revisions are keyed by file identity. Supersession, rename and deletion cannot publish stale state or resurrect files. Preserve optimistic creation and incremental create/materialize/dematerialize/rename/deletion behavior. Keep restored previews non-authoritative, hydration progress/watchdog/late-work cancellation intact and demand loss resumable; never clear dirty work before publication. See [indexing architecture](docs/INDEXING_ARCHITECTURE.md).

### Reuse caches

Do not reread/reparse every Markdown body on every startup.

The persistent body metadata cache should be reused when the file modification time is unchanged.

When adding new expensive derived data, ask whether it can be:

- cached per node
- cached per relationship view
- pre-normalized once for search
- persisted safely between sessions

### Do not repeat expensive work inside render loops

Bad patterns include:

- calling `titleFor()` repeatedly inside a sort comparator
- scanning the full graph for every node render
- compiling user scripts per node
- rebuilding the graph because camera/history/UI state changed

Compute expensive values once and pass/cache them.

### Worker use

CPU-heavy Markdown text parsing may be offloaded to a Web Worker.

Do not call Obsidian APIs from the worker. Keep vault/metadata access and graph mutation on the main thread.

### Search

Search should use pre-normalized data and ordered-subsequence fuzzy matching with ranking roughly:

1. exact
2. prefix
3. full substring
4. fuzzy subsequence

Reuse the previous query's matching candidate set for longer query prefixes when possible.

### Debug logging

Follow [coding standards](CODING_STANDARDS.md#code-scanner-hygiene).

## Current Compass layout requirements

Default settings:

| Setting | Default | Range / notes |
| --- | ---: | --- |
| Parent columns | 2 | 1–3 |
| Child columns | 5 | max 7 |
| Parent height | 300 px | own scroll region |
| Friend/challenger height | 350 px | shared setting for left/right |
| Child height | 400 px | own scroll region |
| Sibling height | 250 px | separate region |
| Density | 2 | changes spacing/truncation, not padding; max 4 |
| Max nodes per zone | 100 | configurable up to 300 |

Layout rules:

- left/right primary zones should be symmetrical
- siblings are the deliberate asymmetry
- lateral and sibling regions may extend into unused parent vertical space
- lateral/sibling bottoms must not overlap the child region
- leave a small gap before children
- when a friend/challenger strip fits within its lateral band, bottom-align it and let it grow upward; sparse lists must not be vertically centered or stranded near the top
- overflowing lateral lists remain scrollable; if filtering reduces an overflowed friend/challenger zone to a result set that fits, bottom-align the filtered results too
- while the native central-node editor reserves an oversized center rectangle, vertically center friend/challenger and sibling strips beside that rectangle; the normal compact center keeps the standard bottom-aligned lateral layout
- siblings use the configured `siblingRelativeSize` (30%–85%, default 85%) and sit slightly higher
- sibling expanded descendants inherit the same configured multiplier
- density uses the same tight node interior padding at every setting

When overflow requires a scroll zone, first-level zones expose a funnel/name filter. Filtering must repack matching nodes rather than hiding nonmatches in place.


## Mobile and workspace-surface checks

- Use the centralized `readObsidianPresentationEnvironment()` boundary and its pure adapter-local classifier. It preserves available runtime phone/tablet facts before a shortest-side fallback; do not add direct Platform checks in portable code or duplicate classification elsewhere.
- Phone command palette: only the K-Plex sidepanel opener is offered among surface-opening commands. Generic/ribbon open also routes to sidepanel.
- Tablet: normal graph tab and sidepanel are both available; pop-out is desktop-only.
- A touch tap is handled from the pointer stream directly because preventDefault/pan ownership can suppress synthesized click events. Verify tap navigation, one-finger pan, two-finger pinch and long-press context menus together.
- Sidecar is a real adjacent, K-Plex-owned Obsidian `WorkspaceLeaf`; never adopt an arbitrary pinned/recent/user tab because it is nearby. During startup only re-associate eligible restored remembered-side/content ownership; do not manufacture a split. Moving the managed document away releases ownership and leaves it open. Closing K-Plex leaves the companion document open; Sidecar fold hides only the K-Plex tab group and leaves the recovery control on the companion edge. Preserve combined workspace allocation on moves and keep Sidecar unavailable inside the sidepanel. See the detailed ownership/restoration invariants in `AGENTS.md`.

## Section-outline checks

After exact-build staging, `npm run verify:obsidian:sections` uses the same three explicit
`kplex-test-small` variables and a fresh `KPLEX_HOST_REPORT_DIR`. It checks the actual central fold
control, preamble/repeated-link placement, stationary inbound ontology add/remove and an inferred
visibility round trip with zero Markdown reads, parser calls or rebuilds during that presentation
interval. Four owned notes, a temporary native tab, settings and wrappers are restored independently
of assertions. This Windows functional lane does not establish mobile/popout acceptance or speedup.

- central Markdown expansion is runtime-only; no heading may enter `GraphIndex`
- nested heading levels create parent/child outline structure
- section nodes and outline connectors are visually distinct from semantic graph relations; structural connectors use vertical-spine + horizontal L branches that enter the child at its left-center edge, never the semantic top gate; density 4 should collapse these branches/gaps aggressively rather than merely scaling the ordinary graph spacing
- Markdown central nodes expose the same lower-left fold square even before section expansion; non-Markdown central nodes do not
- delayed metadata/index updates may move/add nodes but must preserve graph camera and bounded-list scroll positions; only explicit navigation/initial display may recenter
- relationship creation uses the shared fuzzy-search component, with both suggesters closed until typing or explicit ontology disclosure; the disclosure shows all fields for the selected role even with empty input. Selecting an existing note leaves ontology editable and commits through a stable-width Link action. New-note actions require a valid globally-unused filename; the last successfully used Markdown/available Excalidraw action supplies the primary shortcut (Markdown fallback, never Placeholder). User-hotkeyable Add parent/child/friend/challenger commands require a running K-Plex view; new files honor `FileManager.getNewFileParent(...)`, and custom ontology values persist as hierarchy fields/defaults. Format visible shortcut text through the environment/catalog seam.
- connector unlinking remains provenance-safe: direct removal is limited to a sole editable frontmatter ontology declaration plus mirrored resolved-link entries inside its YAML block (including lists). A positionless generic cache entry is a mirror only after verifying the block resolves to the same target. Other body/property/inline or competing evidence opens **Connection details**. Its source navigation uses ephemeral line state, prefers the originating view's owned Sidecar, and never recenters the Plex or mutates unrelated leaves; fall back to a Markdown tab.
- fold/unfold is view state only
- folded descendants' semantic relations project upward to the visible folded ancestor
- explanation provenance still identifies the actual hidden declaring section

## Expanded view

Expanded mode shows children beneath first-level nodes.

Preserve these rules:

- ~50% child node size
- ~70% opacity
- smaller font
- 3 columns × 2 visible rows max per first-level node
- overflow scrolls; no filter in these small scrollers
- nodes with no children reserve no expanded space
- row height is based on the largest descendant cluster in the row

### Relationship grouping

The toolbar's **Group nodes by note type** toggle projects the currently admitted neighborhood;
it preserves the existing per-area node limits and never requests semantic indexing. Markdown
nodes group by Note type; untyped notes, attachments, links, placeholders, tags and folders use
separate classes. Singletons retain their ordinary node. Shared-left layout groups both lateral
areas together while unfolded rows retain their original semantic roles.

`tests/relation-groups.test.mjs` covers projection, exact relation restoration, filtered counts,
gesture callbacks, real layout/React styling and external count geometry in two Chromium documents.
After exact-build staging, run `npm run verify:obsidian:groups` with the three explicit Small-vault
variables and a fresh report directory. It checks actual toolbar activation, classes/styles/counts,
unfolding, navigation, shared-left layout and independent native popouts, and restores its fixtures,
workspace and original configuration bytes. Native DOM clicks are programmatic, not physical touch.
For manual acceptance, repeat these actions on a physical mobile device and during actual
main-window/popout migration. Confirm that the center,
history and linked Sidecar change only on ordinary node navigation, and all groups start folded
on each new center. Group counts describe the admitted, filtered members, not whole-vault totals.

## Gates, lines and labels

- gates sit outside node bounds
- hollow gate = no relationships
- filled gate = relationships exist even when hidden/filtered
- without a global filter, the count near a gate shows the normal visible relationship count; with a Quick Filter / Graph Lens active, use `shown/total` (for example `0/12`) so filtering does not erase relationship context
- connectors originate at the correct gate
- connector setting is **Straight** or **Curved** in user-facing UI
- curved lines should be broad and relatively flat
- arrowheads may express direction
- custom ontology labels may be shown over a small break in the line
- suppress generic labels such as parent/child/friend/challenger/file-tree

Hover behavior:

- relationship/node highlight delay target: **750 ms**
- normal hover does not open note preview
- Ctrl/Cmd + hover opens Obsidian preview immediately

## Navigation and history

Test all navigation changes against these expectations:

- Markdown, folder and tag nodes can become central
- clicking nodes navigates
- background drag pans and uses a panning cursor
- activatable nodes use a pointer-like cursor
- wheel zoom works without another mouse button
- left/middle/right drag on empty Plex may pan
- K-Plex can synchronize to a linked/pinned Obsidian leaf or remain decoupled
- startup center = active file leaf when available, otherwise last displayed node
- Past nodes/history persists across restarts
- pinned nodes are persistent quick-access bookmarks beneath the toolbar
- command palette includes opening K-Plex in a pop-out window

## Sidebar follow acceptance

After exact-build staging with `npm run verify:obsidian`, run
`npm run verify:obsidian:sidebar-follow` with the three explicit disposable
`kplex-test-small` vault variables and a fresh `KPLEX_HOST_REPORT_DIR`. The driver
switches native notes while the sidebar is collapsed, verifies the newest center
on reveal, gates one exact page lookup to check stale-scene suppression and newer
navigation, checks deliberate graph/history animations, sends stationary pointer
tap pairs through the real central-node handlers, and checks main-tab reuse,
empty-workspace tab creation and visible stacked layout captions.

Run again with `KPLEX_SIDEBAR_EMULATE_PHONE=true` and another fresh report directory
for a 390px native mobile-emulation viewport. It restores emulation, window bounds,
workspace, settings bytes, native follow ownership and its own fixture notes and
lookup wrapper independently of assertions. Run native drivers serially. DOM
pointer events and desktop emulation do not prove physical Android/iOS touch,
mobile lifecycle or actual paint latency; check sidebar reveal, central double
taps versus pan/long-press, and the compact rails on a physical phone separately.

## Style operation acceptance

After exact-build staging, run `npm run verify:obsidian:style-operations` with the three explicit
`kplex-test-small` vault variables and a fresh `KPLEX_HOST_REPORT_DIR`. Run native and browser lanes
serially. The driver exercises the real node-style manager/editor with no graph view and an active
on-demand graph, controlled storage and post-save refresh failures, repeated submissions, pending
Cancel/Escape, native Settings subpages in their owning window, imperative appearance retry after failed storage, and durable plugin reload.

Warm startup and drain retired demand before attributing work to styles. Native Markdown file-open
reads remain in the report, separately identified by their actual caller; unknown/plugin reads stay
strict. Settings subpages are siblings of the root tab container in the owning document. The driver
uses the actual native modal backdrop for cleanup, rejects pre-existing style dialogs, and restores
settings, layout, follow ownership, probes and configuration bytes. DOM activation is programmatic;
physical touch and perceived latency remain separate. See the [style validation record](docs/validation/style-operations-2026-10-13.md).

## Sidecar navigation acceptance

After exact-build staging, run `npm run verify:obsidian:sidecar-latency` with the three explicit
`kplex-test-small` vault variables and a fresh `KPLEX_HOST_REPORT_DIR`. Run native drivers serially
with the selected window foreground. The driver warms a synthetic three-note sequence, asserts
local readiness, and records 12 switches each with Sidecar closed, managed Sidecar open, and a
same-size ordinary native pane. It checks one native open per managed switch, same-file/pan/zoom
without native opens/body reads/rebuilds, and latest-target settlement after rapid navigation.

Forwarding wrappers capture separate overlapping API/DOM boundaries, not actual paint; do not
sum them as end-to-end latency. The driver restores fixtures, wrappers, workspace, settings and
follow ownership, checks exact installed/build hashes and restores configuration bytes. Desktop
or tablet emulation cannot establish physical HarmonyOS rendering/touch responsiveness. See the
[Sidecar validation record](docs/validation/sidecar-latency-2026-10-12.md).

## Arrow direction acceptance

After exact-build staging with `npm run verify:obsidian`, run
`npm run verify:obsidian:arrow-direction` with the three explicit disposable
`kplex-test-small` vault variables and a fresh `KPLEX_HOST_REPORT_DIR`. The driver
uses the issue 114 two-note fixture, preserves active inferred explanation
evidence, and checks the defined direction and actual SVG marker from both
centers with inversion and inferred visibility on/off. It repeats policy refresh,
reloads the plugin against warm source data and checks a second native view.
It restores settings bytes, workspace, native ownership and its fixture notes
independently of assertions. Run native drivers serially.

`KPLEX_ARROW_EXPECT_BASELINE=true` characterizes the unfixed `BOTH` direction and
is explicitly reported as baseline reproduction, never candidate acceptance.
Neither mode establishes physical-device interaction or paint latency.

After exact-build staging, run `npm run verify:obsidian:delete-cleanup` with the
three explicit `kplex-test-small` vault variables and a fresh
`KPLEX_HOST_REPORT_DIR`. The owned issue 128 fixture checks ontology-only default
cleanup, selective property removal/hiding, body and inline source navigation,
property-only placeholders, legacy confirmation preferences, cancellation,
partial native write failure and exact target/source replacement fences. It
also exercises the connector's native Hide action, live save-note direction,
both rendered central-note perspectives and inverse inline visibility after warm replay.
Settings, workspace, temporary FileManager wrappers, raw configuration and owned
notes are restored independently of assertions. Run native drivers serially;
native DOM activation does not establish physical touch acceptance.

File deletion through K-Plex uses **Canvas behavior → Remove ontology links when deleting a file**
to choose automatic property cleanup. It defaults on for compatibility. Turning it off keeps
property links unless the user explicitly overrides them in **Review property links**.
Placeholder removal keeps its existing policy. The confirmation's anchor opens the native
settings page and focuses this toggle, cancelling the pending deletion before navigation.
The final deletion-cleanup acceptance lane must cover both toggle states, persistence/import
preservation, a concurrent preference change, settings navigation in main/separate windows,
and source-scoped overrides. All supported locales include this setting and its dialog copy.

The connector's **Hide connection** menu stays active when Hidden fields are empty.
Its native setup prompt offers an unused property name (`hidden`, then `kplex-hidden`
or a numbered alternative), or navigation to **Ontology → Relationship fields → Hidden fields**.
Suggestions read Obsidian's cached property registry and configured/discovered names, without
scanning or reading notes. When that guarded registry is unavailable, use manual settings setup.
Creation requires explicit approval, rechecks collisions on the shared settings disk queue,
persists before publishing the new role and never moves a field from another role. It then
opens the ordinary direction/source confirmation; creating configuration alone writes no note.
Deferred acceptance must cover native settings navigation without a truthy return, regenerated
description anchors, nested pages, collisions, cancellation, concurrent hierarchy edits and
storage/refresh failure. Keep the same source/pair/native identity fences for the final hide write.

## Search interaction checklist

When touching search, verify:

- focus opens instantly
- Up/Down visibly moves selected result
- Enter activates the selection
- Escape closes the result list
- clicking the Plex/outside search closes it
- typing after a previous completed search remains responsive
- large paths/titles remain readable
- fuzzy ordered-subsequence matches work and rank below stronger matches

Vault search uses **F4** and includes every real Vault file type independently of Plex visibility. **Ctrl/Cmd+F** opens the separate current-Plex Find field: no dropdown, literal label/path/alias highlighting, overflow reveal, Enter/Shift+Enter cycling and Escape dismissal without changing the center/history. Check Graph Lens exclusions, area filters, expanded descendants and section projections.

After `npm run verify:obsidian` stages the exact production build, run the native UX regression driver serially:

```bash
PATH=/Users/zsviczian/.local/share/fnm/node-versions/v22.22.2/installation/bin:$PATH \
KPLEX_TEST_VAULT_NAME=kplex-test \
KPLEX_TEST_VAULT_PATH=/Users/zsviczian/Obsidian/kplex-test \
KPLEX_TEST_CONFIG_DIR=/Users/zsviczian/Obsidian/kplex-test/.obsidian \
KPLEX_HOST_REPORT_DIR=/private/tmp/kplex-ux-native \
npm run verify:obsidian:ux
```

The driver rejects mismatched artifacts and preexisting fixture paths. It creates an owned relationship fixture, tall/wide PNGs and a Canvas, then tests Vault search, projected Find, About vault double-click/double-tap, native image fit and collapse history, thumbnail centering, intermediate captured-pointer area resizing, Canvas explorer-drop routing and wheel zoom before pan. A native popout checks Find focus/highlighting/history in its owning document and compares its Find/zoom styling. The driver removes its fixture/views/controller and restores settings bytes, enablement and window geometry/throttling. Native pointer resizing uses Electron input with the held-button modifier; the area-settings menu uses the public DOM mode, and the explorer-drop lane supplies Obsidian's actual internal payload to the real DOM handler. These are functional desktop checks, not paint/performance measurements or physical touch acceptance. Separately test iPad trackpad zoom, phone/tablet double-tap versus long-press and native Canvas controls on physical devices.

Setup temporarily selects the existing `Welcome.md` (override with `KPLEX_UX_SETUP_CENTER`) and calls the normal view-readiness entry point before waiting for strict index readiness, avoiding the separately documented extreme-hub decode limit. The original center is restored during cleanup. After fixture metadata settles, setup seeds a complete graph through the production rebuild coordinator; it requires all three fixture aliases and the expanded relationship to be materialized. This lane validates UI behavior on a complete graph and does not establish warm-vocabulary publication completeness. Fixture reconciliation may take up to 15 minutes in the 20k-note vault; this is a test setup deadline, not a change to production timing limits. Individual CLI reads have a 30-second hard timeout; polling retries transport timeouts and records them separately from native assertion failures. The style assertion compares Find, configuration and zoom dimensions, background, border, color and padding, plus trusted hover styles. Relationship checks assert eligible external area feedback and five outside/cancellation cleanup boundaries; trusted gate feedback and separate captured body/gate crossing probes exercise live pointer routing. Highlights must remain below thoughts and pointer-transparent.

Set `KPLEX_UX_EMULATE_MOBILE=true` to add actual Obsidian mobile emulation at tablet and phone widths after the desktop fixture is cleaned up. This lane records the production adapter's selected device profile, actual viewport dimensions, Find field focus/clipping and keyboard-hint behavior, and restores the original mobile mode and window minimum size. It does not establish physical touch or iPad trackpad acceptance.

## Relationship editing checklist

### New relationship from a gate

Verify:

- modal is an Obsidian `Modal`
- default relationship matches source gate
- target gate can refine/invert the offered direction
- already-connected targets are excluded
- folder/tag targets are disabled
- Markdown origin writes YAML on origin
- non-Markdown origin requires Markdown target and writes inverse relation on target
- creating a physical child saves its additive property even while structural/index refresh makes semantic pair readiness unavailable; test drawing-to-drawing creation with **Open for editing** enabled
- preserve existing properties and template metadata, make retry idempotent, and reject native file replacement/rename before mutation; a saved property may await graph reconciliation without blocking creation completion
- confirm/cancel icons use `getIcon()`

### Relink an existing direct neighbor

Verify moving a direct neighbor across top/bottom/left/right regions proposes the corresponding relation change.

Write/update frontmatter rather than trying to rewrite arbitrary body text. Frontmatter relationship values intentionally take precedence.

## Settings UX checklist

Settings should be grouped into pages (Graph, Ontology, Compatibility, Appearance, etc.).

The root K-Plex settings page begins with a compact centered link row:

[Buy me a coffee](https://ko-fi.com/zsolt) | [Read Sketch Your Mind](https://community.sketch-your-mind.com/sym) | [Join SYM Community](https://community.sketch-your-mind.com)

Keep that row concise; do not add extra explanatory text around it.

For bounded numeric settings, prefer a slider plus current-value display over an oversized number field.

## Naming and copy

Follow [coding standards](CODING_STANDARDS.md#naming).

## Manual regression test matrix

Before submitting a significant change, test the relevant subset of:

- cold start in a small vault
- warm start with a persisted IndexedDB semantic snapshot and per-file parser cache
- large vault (20k+ files), including an iOS/tablet cold-start pass where practical
- Markdown central node
- folder central node
- tag central node
- attachment / URL / virtual nodes
- parent/child/friend/challenger/sibling layouts
- scroll-zone filters and repacking
- global quick filter plus named Graph Lenses: node/edge/evidence scopes, visual Simple builder and advanced Code view, obvious on/off toggles, relationship-property suggestions, multiple include lenses (union), excludes, style effects using the same selectors, Keep/Reflow filtered layout modes, lazy frontmatter refresh, persistence across K-Plex views, and safe handling of invalid selectors
- empty-canvas click/touch clears transient connector/node/gate highlights
- expanded view and overflow
- straight and curved connectors
- arrow direction
- gate counts/fill state
- note-tab synchronization: unlinked, linked to most recent tab, pinned to one fixed tab, plus both one-shot sync directions
- companion sidecar open/move/detach behavior, including adjacency/control visibility for left, right, above and below splits
- mobile sidepanel first-open behavior
- touch tap, one-finger pan, long-press menu and two-finger pinch over both bare canvas and nodes
- pop-out window
- persistent history
- pinned nodes
- search keyboard controls
- Ctrl/Cmd hover preview
- drag-create relationship
- drag-relink direct neighbor
- legacy ExcaliBrain settings import

## Pull requests / patches

Include:

- what changed
- whether legacy compatibility is affected
- whether indexing/search/rendering performance is affected
- actual automated commands, runtime/dependency versions, outcomes and coverage limits; distinguish portable, browser, native and physical-device evidence
- at most three prioritized outstanding manual tests with workflow/target/expected result and why automation cannot cover them, or state that none are needed
- confirmation that `npm run verify` and the real build succeed, plus applicable exact-build host checks by the validation agent; unavailable checks remain named and pending
- architecture ownership, invalidation/lifetime effects, compatibility/migration decisions, cleanup and relevant contract documentation

Keep accepted goldens, timing bounds, import checks and lint rules strict. Intentional product behavior changes require an explained expected-output difference and appropriate regression coverage, not blanket fixture regeneration. Documentation-only contributions use content/link/whitespace checks; do not report unrun runtime suites as evidence. Host validation is tied to exact source/artifact identities and must be rerun when affected code changes.

If the requested deliverable is a patch ZIP, include **only modified/new files** in their repository-relative paths.

### Explain relationship navigation
When changing provenance navigation, preserve host-view ownership: an open sidecar for that K-Plex view is preferred over creating another tab, and using the sidecar for inspection must not implicitly recenter K-Plex.

### SI5 native restart validation

After exact-build staging, run `npm run verify:obsidian:si5` with the same three disposable test-vault variables and an explicit `KPLEX_HOST_REPORT_DIR`. The default scenario creates owned notes, saves an ontology change, reloads, removes/corrupts optional graph acceleration, damages one requested source chunk and simulates an offline edit. Missing/corrupt graph cases also assert global virtual/URL search, aliases and inline type suggestions outside requested scopes. Its small-fixture setup may seed complete acceleration after an earlier fault run; measured restarts start on the newly loaded instance. It restores settings, wrapped Vault methods, owned notes and original throttling. Back up the test vault/cache before fault injection; never use a personal vault. Run native drivers serially; do not overlap manual CLI probes with their polling.

Set `KPLEX_SI5_RESTART_ONLY=true` for three warm restarts of an existing large fixture; it does not seed a fixture build. The report records named hardware, exact hashes, readiness, source/build counters, renderer visibility, heap samples and total CLI/restart elapsed time; `progress.json` identifies the active phase between completed probes. These are functional restart measurements, not actual-paint or physical-device acceptance. The [SI5 report](docs/validation/settings-independent-indexing-si5-progress-2026-10-03.md) and [device procedure](docs/validation/settings-independent-indexing-si5-device-checklist.md) retain historical validation procedures; [final SI5 acceptance](docs/validation/settings-independent-indexing-si5-acceptance-2026-10-04.md) records completed feature acceptance and its measurement limits.

Keep Obsidian in the foreground throughout comparable runs. The driver shows the application before
focusing the test window, retains its original background throttling, and samples document visibility,
document/window focus and renderer JS heap during readiness. Its `foreground.comparable` field is
false if any sample is hidden, unfocused or has throttling disabled; exclude that run from performance
comparisons. Large restart-only cases also compare a bounded cursor digest of all selected source
heads, so zero Markdown reads cannot conceal source restamping. Native functional completion and
sampled heap are separate from paint latency and process/device peak memory.

`KPLEX_SI5_RESTART_RUNS=1` or `2` can replace an excluded run without repeating valid runs. The
default remains three; acceptance still needs three comparable runs of the same condition/build.


### SI5 high-node fixture

The existing 20k/large-file fixture and a high-node fixture exercise different workloads. Generate
an isolated high-node fixture with `node scripts/testing/generate-high-node-vault.mjs --out /absolute/new/disposable-directory`
and verify it with `node scripts/testing/generate-high-node-vault.mjs --verify /absolute/new/disposable-directory`.
Generation refuses an existing output. The default supplies 20,000 Markdown files, 80,000 distinct
body-linked placeholders, 8,000 distinct URLs, 259,000 source link occurrences, 160 dormant property
names and a hub referenced by 19,999 owners. These are deterministic **source-input counts**;
measure actual graph nodes/evidence in Obsidian, including structural nodes/cache mirrors. Fixture
verification is not startup, latency, memory or device acceptance. Keep it separate from the existing
large-vault cold/warm baseline; never merge its files into a personal vault or compare profiles as one
condition. `--files` permits small harness fixtures while preserving the proportions.

### Bounded SI5 warm-start attribution

The maintainer's 2026-10-04 scope accepts the existing extreme-vault cold behavior and records the
20k-contributor hub `decode-budget` result as a stress limit outside the critical path. Do not pursue
bounded canonical projections, memory-limit changes or further cold optimization for this closeout.

After verification and exact-build staging, run the dedicated production-path probe serially:

```bash
PATH=/Users/zsviczian/.local/share/fnm/node-versions/v22.22.2/installation/bin:$PATH \
KPLEX_TEST_VAULT_NAME=kplex-test \
KPLEX_TEST_VAULT_PATH=/Users/zsviczian/Obsidian/kplex-test \
KPLEX_TEST_CONFIG_DIR=/Users/zsviczian/Obsidian/kplex-test/.obsidian \
KPLEX_HOST_REPORT_DIR=/private/tmp/kplex-si5-warm-start \
KPLEX_SI5_WARM_CENTER=Welcome.md \
KPLEX_SI5_RESTART_RUNS=3 \
caffeinate -d -i node scripts/testing/obsidian/startup.mjs
```

`caffeinate` applies only while the child runs on macOS; it prevents display/system idle sleep and
changes neither renderer throttling nor timing bounds. Require a settled existing cache and actual
foreground throughout. The optional existing center temporarily avoids the excluded hub; its setup waits
for both the page and the view navigation listener before the existing navigation notification, then verifies the actual selected center. The driver
restores the exact original `data.json`, verifies the enabled list and removes all wrappers/controllers.
The native test opts in to `window.kplexStartupDiagnosticsEnabled` before enable and restores its
previous value. Normal operation retains phase progress but no detailed owner/timing trace. Private
owner identities are discarded on strict readiness or unload; reports contain counts and overlap only.

Phase timestamps are relative to `onload`; native elapsed timestamps start immediately before
plugin disable/enable. Hydration and source lanes overlap and must not be summed. IDB counters count
requests issued, not disk bytes or transaction latency; paged head counters separately count returned
owners. Physical revision comparisons use existing `TFile.stat` values; adapter stat I/O is a separate
counter. Wrapped host/IDB calls count global operations in the time window, temporally attributed to
the current phase; they are not exclusive caller or latency attribution. DOM-center availability is observed at 100 ms intervals, not actual paint or interaction latency.
Requested-scope publication and source authority have separate milestones from strict graph/search
readiness. Percentages use the captured pass denominator and are floored; unknown totals show activity
and actual record counts. Progress notifications are throttled to 250 ms without adding timers or
advancing graph revisions. Each pass resets progress only at its own phase boundary.

The dedicated startup probe retains the 30-second individual CLI process timeout, but has no outer
readiness deadline following the maintainer's 2026-10-04 instruction. Obsidian runs independently;
CLI polling occurs every five seconds and reconnects ten seconds after a failed read. A lost CLI
response neither reloads the plugin nor cancels the native measurement. The production hydration
watchdog is unchanged. Failed focus samples still exclude the trial from timing comparisons.

Read the passive report at any time without starting new work:

```bash
obsidian vault=kplex-test eval 'code=JSON.stringify(app.plugins.plugins["k-plex"].getStartupDiagnostics())'
```

Its current phase/progress, completed phase intervals, owner overlap and aggregate counters stay in
plugin memory for that enable lifetime. The native probe adds actual operation counts to the same
report; no console logging or diagnostic persistence is required. A fresh plugin enable starts a fresh
trace. Completed timings freeze at strict-ready, while live status can subsequently change, including
after restoring a previously unsupported synthetic center. The final pilot had no actual CLI
disconnect; retry behavior is implemented, not fault-injection validated. Initial submission and final
cleanup still require a responsive CLI. See the [measured warm report](docs/validation/settings-independent-indexing-si5-warm-start-2026-10-04.md).
Retain CLI errors separately from terminal plugin failure. Report measurements and a minimal
proposed correction before implementing any warm-start optimization.


The first [minimal warm correction and native retest](docs/validation/settings-independent-indexing-si5-minimal-warm-correction-2026-10-04.md)
combine dependency upgrade/host comparison while retaining the later freshness pass. The driver also
counts existing local-dependency selections/settlements and repository yields through passive forwarding.
Do not treat file mtime as dependency authority: physical statistics already govern source reuse;
local derivatives require exact source revision/sequence and repair/version validation, and other-file
resolution changes can update source facts without changing the referring file's mtime. Report one
candidate's actual work/timing deltas before extending the correction.


The next [clean dependency-selection correction and native retest](docs/validation/settings-independent-indexing-si5-clean-selection-2026-10-04.md)
was developed after checkpointing the prior fix at `8cd10b7d6746d607f8214ad192670a0b9a370778`. It removes
120,090 IDB reads across a clean 20,015-note restart while retaining source-head/repair/freshness
checks. Its median is 82.149 seconds versus 80.137 seconds immediately before; no overall latency
improvement is demonstrated. Keep each independently validated correction in its own commit before
adding another behavior change. Posting batching is validated separately below; scheduling remains unchanged.

When staging, distinguish configured enablement from a loaded plugin instance. After native
`app.plugins.disablePlugin()`, CLI `plugin:enable` can report “already enabled” while
`app.plugins.plugins["k-plex"]` is absent. Use matched native disable/enable operations with retained
completion/error state and bounded polls; verify the actual instance and installed artifact hashes.
Preserve and byte-compare the original settings and community-plugin enablement list. A configured-state
mismatch is a staging issue, not a slow-start timeout; neither requires resetting Obsidian configuration.

For a maintainer-authorized reference-vault deployment, finish writing each replacement beside its
live destination and verify the staged hash before unloading the plugin. Rename the complete staged
file over the destination atomically; never delete the live artifact first or restart during a direct
overwrite. Verify installed hashes before enabling, then confirm the actual loaded instance. Skip
unchanged artifacts. During long verification pauses, keep K-Plex loaded and pause only background
scheduler lanes; do not leave an open production view pointing to a disabled plugin. Restore every
temporary scheduler lease, controller and preference wrapper after the check.



The [bounded posting-read correction and native results](docs/validation/settings-independent-indexing-si5-posting-batching-2026-10-04.md)
use one count-limited primary-key range request per existing byte/record-bounded batch, with every
posting/digest/frame and source-head/lease/freshness/cancellation check retained. Three foreground
restarts pass at 66.170/65.324/74.123 seconds (median 66.170, prior 82.149); posting requests fall from
484,199 point reads to 20,027 bounded range reads. Full verify passes 199 browser tests and the actual
production build. These are sequential observations, not randomized paired or physical-device tests.
Existing yields remain; measure their exclusive wait cost before changing scheduling. Preserve a clean
checkpoint between independently validated corrections.

Optional `KPLEX_SI5_MEASURE_WAITS=true` enables native-test-only passive promise observation of
repository yields, transactions and digests. It preserves original promises/results and adds bounded
histograms and disjoint interval membership; callbacks/aggregation have unisolated overhead.
Transaction durations include callback/commit/microtask latency, not exclusive disk time; the
unwrapped remainder includes other work/waits, not CPU alone. Probe starts after enable returns;
snapshot-cache transactions are not included. See [wait attribution and proposed correction](docs/validation/settings-independent-indexing-si5-wait-attribution-2026-10-04.md).
Measured yields do not justify scheduling changes. Keep diagnostic-driver and subsequent UX/behavior
changes in separate commits. No next optimization until the measured proposal is reviewed.

Startup progress labels distinguish note metadata, cached-note validation and repeated reconciliation
with **Processing pending changes**. Metadata comparison is **Validating note metadata**, initial
source reconciliation is **Verifying cached notes**, and requested semantic preparation is
**Applying current ontology & settings**. Diagnostic progress includes the one-based lane/phase `pass`;
counts restart at the actual pass boundary. This also works without detailed opt-in. The
[controlled retry validation](docs/validation/settings-independent-indexing-si5-progress-labels-2026-10-04.md)
records the exact test-only MetadataCache miss recipe, failed untimed background setup and successful
foreground retry. Do not use fault-injected or browser-overlapping elapsed times as warm baselines.

The maintainer-approved [merged dependency/head selection and exact retest](docs/validation/settings-independent-indexing-si5-merged-selection-2026-10-04.md)
follows the independent phase-label checkpoint `b48643c62fb5a21d105f6f5db38c4025223ca785`. Clean checks
select owner/state/journal/head atomically, then honor overlays, intervening source activation,
cancellation and unload. Repair and legacy upgrade retain rereads. Compare with the same optional
wait probe enabled, keeping the test renderer in the foreground and all other test workloads stopped.
Head requests and dependency checks are distinct from transaction boundaries: consolidation does
not remove their validation or the later freshness pass. The [closeout audit](docs/validation/settings-independent-indexing-si5-closeout-audit-2026-10-04.md)
inventories current settings routes, retired writers and deliberately retained compatibility seams.
The maintainer reports successful physical iPad and Android tests; the [device checklist](docs/validation/settings-independent-indexing-si5-device-checklist.md) retains the procedure and qualitative acceptance record. [SI5 is closed](docs/validation/settings-independent-indexing-si5-acceptance-2026-10-04.md); no further automatic optimization or refactor work is queued.

### Foreground indexing interaction smoke

After `npm run verify:obsidian` stages the exact build in a disposable vault, run
`npm run verify:obsidian:foreground` with the same explicit `KPLEX_TEST_VAULT_NAME`,
`KPLEX_TEST_VAULT_PATH`, `KPLEX_TEST_CONFIG_DIR` and a new `KPLEX_HOST_REPORT_DIR`.
Prefer `kplex-test-small` for this functional probe; reserve `kplex-test` for scale timings.
Run native drivers serially and keep Obsidian foreground with its original throttling.

The driver pauses the actual source-acquisition checkpoint outside transactions, then exercises
navigation, relationship add/remove, note creation and visible frontmatter edits before releasing
inventory. It asserts canonical saved-pair evidence, zero foreground broad flush calls and eventual
source closure. It owns one fixture folder, removes wrappers/controller/notes, and restores exact
settings and enabled-list bytes. Measurements are inclusive native API/DOM completion, not actual
paint, trusted pointer latency or physical-mobile acceptance. An unsuccessful cleanup is a failed run.
The report refuses installed/build hash mismatches.

Set `KPLEX_FOREGROUND_SCENARIO=live-updates` on that command for the external-discovery and
stationary-completion regression. Use an actual On-demand session with background URLs and
Responsive pacing in `kplex-test-small`. The lane holds a real unrelated P3 URL body read across
visible Find selection, local explicit relationships and the public recent-tab sync action, then
checks active-work drain and navigation continuity after release. Optional
`KPLEX_FOREGROUND_COMPOSER=1` also creates a native file with Plex hidden and selects the
physical-only target through the actual Add child composer without submitting a write. A target
that becomes canonical before query is recorded as a setup exclusion, not a composer pass.
The lane records bounded milestone/resource aggregates, checks foreground ownership and restores
its fixture files, wrappers, workspace, preferences and exact configuration bytes.

For an immutable accepted-baseline functional comparison, set `KPLEX_PROBE_ARTIFACT_DIR` and
`KPLEX_PROBE_BASELINE_REF`; the driver still verifies all installed artifact hashes. The original
early recent-tab case may execute inside the native three-second sidecar/history guard. Keep any
failure visible. A separately labelled `KPLEX_FOREGROUND_WORKSPACE_READY=true` variant waits for
that existing guard while the unrelated P3 read remains held; its pass does not erase the original
early-startup failure or establish availability during workspace reassociation. Neither variant
changes the15-second foreground assertion deadline or production scheduling.

### Controlled indexing CPU workloads

For the PR #201 controlled CPU workloads, run `node scripts/testing/obsidian/indexingCpu.mjs`
after exact-build staging in the explicitly configured disposable Small vault. Use a fresh
`KPLEX_HOST_REPORT_DIR` for every serial run. `KPLEX_CPU_SCENARIO=restore` tests unchanged
initial discovery notifications and warm opening; the default `reconstruction` creates and
removes an owned subtree. `KPLEX_CPU_OWNERS` accepts 32, 64, 128 or 256; every tenth owner has
a long paragraph. Both lanes wait for source/URL/cache/snapshot drain and a matched idle tail,
and record CPU/backlog at 30 seconds from workload start.
`KPLEX_CPU_OBSERVERS=false` omits work observers for overhead controls; `KPLEX_CPU_DETAILED=true`
adds the existing detailed resource observer and must be matched across comparisons. Use
`KPLEX_CPU_PROFILE=true` for separate bounded renderer-JavaScript sampling runs, excluded from
CPU acceptance; these samples omit Browser/GPU/Utility work and parser workers.
The five-millisecond diagnostic completed on the tested Windows host; an earlier one-millisecond
attempt timed out and remains recorded. Ordinary CPU comparisons do not enable profiling. Preserve
foreground/focus and original throttling. Reports contain private configuration receipts.
These controlled workloads are not a full application restart, Synthetic-Scale-v2 acceptance,
physical-device evidence or proof of the original Mac thermals. See the
[PR #201 validation record](docs/validation/indexing-cpu-201-2026-10-21.md) for actual results.

The separate Windows fresh-process acceptance lane is
`node scripts/testing/obsidian/indexingFresh.mjs`. Follow its
[pre-collection protocol](docs/validation/indexing-cpu-201-windows-protocol.md).
It is pinned to the existing Small vault and the recorded A/F artifacts; it never
builds them. Set the three explicit vault variables, a nonexistent direct TEMP
`KPLEX_HOST_REPORT_DIR` named `kplex-pr201-resume...`, and `KPLEX_CPU_FRESH_BASELINE_DIR` to the previously
verified baseline `dist` folder. Only after the maintainer confirms all other
vaults saved/closed, set `KPLEX_CPU_FRESH_RESTART_CONFIRMED=only-kplex-test-small`.
The driver independently verifies one Small window before every graceful quit.
It backs up configuration/artifacts and the original database, restores the
common logical checkpoint in a preparation process, then proves new Browser and
renderer identities. It runs the disabled-plugin control and three alternating
warm pairs serially, retaining timestamped CPU/presence/memory/scalar samples and
actual maintenance events for 600 seconds after completion. Preparation and app
startup are separate from warm activation; physical storage equality is not
claimed. Private traces and failed arms remain in the report folder. Focused
guard/observer/cancellation tests run in the ordinary non-host test lane.

### Local folder wave validation

After exact-build staging, run `npm run verify:obsidian:folder-wave -- <fresh-absolute-report-directory>`
with the three explicit disposable `kplex-test-small` vault variables. The driver requires the
107-file baseline used by the matched fixture and refuses collisions before mutation. Run native,
browser and resource lanes serially with the original foreground/throttling policy.

Set `KPLEX_NATIVE_QUIET_SECONDS=610` for the post-drain quiet control (`0` omits it). Optional
`KPLEX_NATIVE_ARTIFACT_DIR`, `KPLEX_NATIVE_SOURCE_ROOT` and `KPLEX_NATIVE_RUNTIME_REF` identify pinned
builds. The driver uses natural folder/file/metadata events, observes actual qualification and
fallback, and exercises an owned ordinary note, a valid native Excalidraw drawing and a native
create/fill/rename sequence. The latter models the event pattern; it does not test Templater internals.
Missing Excalidraw acceptance produces a partial result (exit 2), not a pass.

Exact fixture/configuration restoration is required. Private reports include configuration backups;
do not publish them without review. Current inputs are matched, but database histories are not
restored or claimed identical. Source digests, storage calls, sampled memory and inclusive renderer
CPU have distinct meanings; operation reductions alone do not establish a universal speedup.

### Cached-source reader validation

Use Node 22.22.2 and `node scripts/testing/cached-source-read-batching.mjs characterize` for finite
real-IndexedDB production-reader counts, dense/legacy/shared-revision controls and corrupt-family
recovery. `full` runs 64/128/256-owner comparisons with three alternating 128-owner pairs. The
accepted baseline is pinned inside the driver; it refuses unrelated runtime differences. Each
arm owns a disposable Chromium profile/database, complete lease release, later edit/reclamation
and a real browser restart/reopen. Run serially without builds, suites or native indexing.
Receipts remain private in the printed task-owned temporary directory.

Detailed native transaction/request/lease/hash/decode counts are separate from lightweight CDP
renderer CPU timing. The fixture invokes production acquisition/repository methods with synthetic
host doubles and without GraphIndex's optional background checkpoint. Browser/storage-process CPU,
full application scheduling, physical cache equivalence and OS process birth/exit coverage are not
established. Transaction creation-to-terminal-event lifetimes include queueing/dispatch and do not
measure exclusive write-lock time. See the [PR205 report](docs/validation/cached-source-read-batching-205-2026-10-23.md).

After exact-build staging, `node scripts/testing/obsidian/cachedSourceReads.mjs` uses the three
explicit Small-vault variables and fresh `KPLEX_HOST_REPORT_DIR`. It reads sixteen existing bounded
cached metadata sources through the production helper, verifies exact facts/heads and restores
diagnostic methods. `KPLEX_CACHED_READ_FAIL_AFTER_FIRST=1` deliberately fails after one read to test
wrapper/controller cleanup; expect a failed scenario with successful cleanup. Immutable baseline
artifacts require `KPLEX_PROBE_ARTIFACT_DIR` plus `KPLEX_PROBE_BASELINE_REF`; this does not bypass
installed-artifact/vault guards or stage a build. Native totals are diagnostic, not CPU attribution.

For PR212's complete warm-reconciliation comparison, use Node 22.22.2 and
`node scripts/testing/warm-source-selection.mjs compare`. It pins accepted `d48f766` (merged #211/#213), alternates
three 128-owner pairs, and keeps 32/256-owner and small dense/legacy/shared-revision controls.
Each bounded profile has actual restart/edit/reopen and independent semantic checks; diagnostics
run separately from timing, and failed/adverse receipts remain in the printed temporary directory.
After exact-build Small-vault staging, `KPLEX_CACHED_READ_SELECTION=1` on the existing native reader
driver additionally checks the shared dependency/head observation and exact protected metadata.
The [PR212 integration report](docs/validation/warm-source-selection-212-main-integration-2026-10-24.md) records the measured
scope, fallback costs, identities and acceptance limits. Neither lane permits a new large vault.

### Passive indexing diagnostics validation

The native verifier allows 35 minutes for the complete serial portable suite. This aggregate
limit includes the established large IndexedDB case's 14-minute deadline plus the other suites;
individual test and native CLI deadlines are unchanged. A wrapper timeout is a failed verification,
even if a Windows child process continues; let that owned child finish before starting another lane.

See [the schema and collection guide](docs/INDEXING_DIAGNOSTICS.md) for retention, privacy and
interpretation. `npm run verify:obsidian:support-report` exercises the actual Report bug controls
and registered Copy index diagnostics command in the main window and a popout. Its programmatic
command dispatch is distinct from trusted keyboard activation; physical-device clipboard remains
separate acceptance. Use a fresh `KPLEX_HOST_REPORT_DIR` and the explicit Small-vault variables.

Run `npm run bench:indexing-activity` on Node 22.22.2, serially after native/resource lanes, for
the actual recorder versus no-op CPU, sampled allocations, retained-data observations and explicit
copy cost. Amplified updates are not native indexing throughput; native timing noise cannot prove
zero overhead. Do not enable detailed profiling or add per-file instrumentation to fill missing
fields. Accelerated 24/48-hour tests validate bounded retention, not a day of real-device use.

### Fullscreen and Zen acceptance

After `npm run verify:obsidian` stages the exact build, run
`npm run verify:obsidian:display-modes` with the same explicit disposable
`kplex-test-small` vault variables and a fresh `KPLEX_HOST_REPORT_DIR`. Keep Obsidian
unlocked and run native drivers serially. The driver checks all four mode combinations
with open/closed sidebars, retained graph/camera/selection/history, Escape priority, native
palette stacking, active-leaf changes, two-way popout migration, view close and plugin reload.
It restores the original workspace, dimensions, emulation state and configuration bytes.

Fullscreen is desktop-only and covers the owning Obsidian viewport; it does not invoke OS
or browser fullscreen. Tablet/phone emulation checks Zen geometry and this availability
constraint. Physical-device touch, screen readers and paint latency remain separate manual
checks. A failed cleanup or an installed/build hash mismatch invalidates acceptance.

### Native Sidecar folding acceptance

After exact-build staging, run `npm run verify:obsidian:sidecar-folding` with all three explicit
disposable `kplex-test-small` vault variables and a fresh `KPLEX_HOST_REPORT_DIR`. Run native and
browser lanes serially. The lane exercises the published toggle and trusted native shortcut,
keyboard/button recovery, actual ambiguity picker, whole-group tab ownership, four edges,
disjoint/overlapping pairs, safe topology refusal, migration, content representation and stale
controls. Clean transition counters distinguish presentation effects from source/index work.
It creates a bounded owned content folder for drawing/PDF/Canvas checks; original fixture bytes,
settings, native bindings and workspace are restored and verified. Driver/helper snapshots and
hashes accompany the report. A missing prerequisite or cleanup failure is not acceptance.

Run `npm run verify:obsidian:sidecar-folding-persistence` separately with the same explicit vault
variables and a new private report directory. It verifies saved native layout, live plugin disable
and enabled/disabled native renderer reloads. `KPLEX_FOLD_NATIVE_RESIZE=true` adds an actual trusted
native divider drag for asymmetric allocation. `KPLEX_FOLD_FORCE_RENDERER_CRASH=true` deliberately
interrupts only the verified disposable renderer and reloads it with K-Plex disabled, using a
main-process recovery timer and exact webContents/process guards. Use that flag only where the
maintainer authorized interruption of the selected disposable vault. Original configuration and
workspace backups remain private; originals are restored independently of assertion success.
Without the required interruption/asymmetry coverage, the driver reports partial acceptance
(exit 2), rather than treating ordinary reload as crash recovery.

The [folding report](docs/validation/safe-plex-folding-173-2026-10-17.md) records actual results and
remaining restart, desktop drag, OS and physical-tablet gates. Serialized normal native dimensions
alone do not prove interruption safety. Keep folding transient: no saved zero dimensions, native
flex mutation, semantic invalidation or note writes. Unsupported direct three-group/nested partial
pairs remain expanded; an existing hidden session always retains recovery.

### Native long-paste regression

After the full `verify:obsidian` lane stages the exact build, run
`npm run verify:obsidian:large-paste` with the same explicit disposable small-vault variables
and a fresh `KPLEX_HOST_REPORT_DIR`. Keep Obsidian unlocked and close Settings before the run.
The driver uses native Electron paste into its own Markdown editor, checks the editor model,
registered ontology-suggester calls and renderer heartbeat while Plex is hidden and visible,
then checks typing, saved text and plugin reload. It restores clipboard, workspace and
configuration bytes and removes its note, wrappers and controller independently of success.
Set `KPLEX_LARGE_PASTE_INPUT` to a local diagnostic Markdown file to reproduce a supplied
paragraph; its content is not written to the report or committed as a fixture. This desktop
check does not prove physical-device behavior, actual paint timing or full application restart.

### Wander and shared navigation acceptance

After exact-build staging, run `npm run verify:obsidian:wander` with the three explicit disposable `kplex-test-small` vault variables and a fresh `KPLEX_HOST_REPORT_DIR`. The driver checks installed hashes, attachment candidate eligibility, actual shared center keyframes, retained camera scale, selection before navigation, normal history, trusted pointer pause/play, manual-center resume, native read/edit auto-pause, priority Escape, entry Zen restoration, fullscreen independence, Stop during anticipation, animation-off/reduced-motion and two-way popout session retirement. Its context-menu assertion selects Obsidian's DOM menu backend for observable trusted input; native OS menu behavior remains a separate check. It restores settings/workspace and removes only its own fixtures, controller and wrappers even on failure.

`tests/wander.test.mjs` covers route backtracking/exhaustion, bounded weighted recency, stale preflight rejection, single-callback generation fencing, cycle pacing/readiness, actual occurrence geometry, selection ownership and real Chromium controls/motion. The controls use `LayoutSlider` and shared Plex button CSS, with computed-style parity checked against real graph zoom buttons. Native keyframe/geometry assertions do not establish perceived paint, physical touch or every device lifecycle; validate those separately.

## Independent document sessions and Footprints

After `npm run verify:obsidian` stages the exact build, run
`npm run verify:obsidian:plex-sessions` with the three explicit disposable
`kplex-test-small` vault variables and a fresh `KPLEX_HOST_REPORT_DIR`.
The lane checks two native pairings, same-file leaf identity, held opens,
Excalidraw shown as Markdown, repeated visits, reset, bounded rows, source-work
counts, rename/recreation, native duplication, popout migration and actual
renderer restart. It restores configuration/workspace and removes only its
owned fixture subtree. Run it serially with other native/browser drivers.
Private output includes configuration backups and must not be published.

Existing native drivers use `nativeDocumentSessions.mjs` to capture scalar
native state and disable/restore each actual owner explicitly. Changing global
sync defaults alone does not change live views. The lexical test wrapper adds
no production global or settings writer. macOS and physical-device interaction
remain separate acceptance; work counts are not comparative resource timings.

## Shared control hints and canvas menu acceptance

After exact-build staging, run `npm run verify:obsidian:tooltips` with the three explicit disposable
`kplex-test-small` vault variables and a fresh `KPLEX_HOST_REPORT_DIR`. The driver checks every-hover
delay (including warm transitions), themed tooltip rectangles, bottom-to-top flipping, shared range
help, portalled controls, canvas accessible naming without a hover tooltip, and two-way popout
ownership. It also exercises the actual native canvas menu in its public DOM backend: display-mode
toggles, Settings, native color Save/Cancel and the owning-view support entry point. Item selection
uses trusted Electron input; context opening is a DOM event, and support's existing entry point is
wrapped to avoid clipboard/external effects. It restores the saved background, layout, display state,
wrappers and temporary global. Missing host, failed assertions or cleanup fail the lane. Run native
drivers serially. Physical touch and subjective paint remain separate from native geometry checks.

`tests/control-tooltips.test.mjs` checks the compiled shared owner in real Chromium;
`tests/canvas-menu.test.mjs` checks callback/draft/lifetime contracts with finite native-component
doubles. Both are in `npm test`; the installed Obsidian typings and native lane remain authoritative
for real host component behavior.

## Remote node image consent acceptance

After exact-build staging with `npm run verify:obsidian`, run
`npm run verify:obsidian:remote-images` with the three explicit disposable
`kplex-test-small` vault variables and a fresh `KPLEX_HOST_REPORT_DIR`.
The driver serves tiny images from an owned loopback origin and counts actual image requests.
It checks denied initial/navigation/expanded/hover rendering, local vault images, a fresh
no-consent popout, opt-in in both documents, opt-out plus native metadata refresh, and saved
opt-in after plugin reload. It restores preferences, native follow ownership, workspace and
configuration bytes and removes only its own fixtures, probe and server, even on failure.
Installed/build hash mismatch or failed cleanup fails the lane. Run native drivers serially.
Physical-device networking remains separate; opt-out cannot undo requests already sent.

`tests/remote-node-images.test.mjs` uses real Chromium, React and IndexedDB with finite
Obsidian input doubles and a controlled loopback image server. It checks supported resolver
forms, local fallback, both inline cache paths, held reads across revocation/off-on/unload,
the actual settings save method's zero-semantic-work boundary, and actual DOM/network output
in two documents. New permission copy uses the existing English fallback until translations
are reviewed. No third-party image source is contacted by either lane.

## Native rename identity acceptance

After exact-build staging, run `npm run verify:obsidian:rename` with the three explicit
disposable `kplex-test-small` vault variables and a fresh `KPLEX_HOST_REPORT_DIR`.
Run browser/native lanes serially. The driver checks synchronous retained incidence and
settled visible labels through FileManager and K-Plex's actual rename action/modal, with
automatic link updates on/off, filename/alias labels, moves, case-only spelling, duplicate
basenames, pins/history and warm plugin reload in eager and on-demand modes. It restores
its fixture subtree, wrappers, workspace, follow ownership and original configuration bytes.
DOM modal activation is programmatic; Linux, OS rename UI, popout migration, full application
restart and physical mobile touch remain separate acceptance. See the
[rename validation record](docs/validation/rename-identity-2026-10-11.md).

## Navigation and embedded drawing fit acceptance

For label sharpness, stage the exact build with `npm run verify:obsidian`, then run
`npm run verify:obsidian:label-sharpness` with the three explicit Small-vault variables,
`KPLEX_SHARPNESS_EXPECT_AUTO=true` and a fresh private `KPLEX_HOST_REPORT_DIR`.
The driver captures actual Electron pixels at adjacent scroll positions, graph zoom 1/1.25/0.83,
and a long expanded outline before/after native middle-button panning and idle settlement.
Set `KPLEX_SHARPNESS_POPOUT=true` for the owning popout window. Captures and fixture/settings
cleanup are mandatory; visual inspection of the PNGs complements geometry/state assertions.
This proves the observed host only, not universal glyph sharpness, frame latency or physical touch.
`KPLEX_SHARPNESS_CONTROLS=true` is an investigation-only reversible CSS control; leave it off
for acceptance. Run native and browser lanes serially; retain failed observations privately.

For focused Markdown autosave continuity, use the same exact-build disposable-vault
setup and run `scripts/testing/obsidian/adaptiveFit.mjs` with
`KPLEX_MARKDOWN_SAVE_ONLY=true` and a fresh `KPLEX_HOST_REPORT_DIR`. Keep
`KPLEX_MARKDOWN_SAVE_OBSERVE_ONLY` false for acceptance; true records a baseline
without asserting the no-op contract. The shared owner restores fixtures/settings/
workspace and snapshots the serialized helper. It checks native Sidecar and central
source-editor autosaves, intermediate parent roles, DOM/focus and real parent
removal. Functional work counts are not controlled CPU/memory benchmarks. See the
[PR180 validation record](docs/validation/markdown-save-continuity-180-2026-10-18.md)
for the deferred combined matrix and platform limits.

After exact-build staging, run `npm run verify:obsidian:adaptive-fit` with the three explicit
disposable `kplex-test-small` vault variables and a fresh `KPLEX_HOST_REPORT_DIR`. The driver
uses ordinary native frontmatter changes and source/index publication to check central-node
centering, late-neighbor fitting, manual zoom/pan/wheel preservation, explicit Fit renewal,
new-navigation renewal and auto-fit-off scale preservation. Bounded list viewports supply fit
extents; offscreen overflow rows do not enlarge the fit. It owns and removes one fixture folder,
restores preferences/workspace/native follow ownership and checks errors and installed hashes.

`verify:obsidian:embedded-zoom` additionally checks untouched reading drawings at changed Plex zoom,
matched native fit references, manual API zoom/pan, trusted native panning and pointer mapping at
non-unit Plex zoom, and edit/disabled exclusions. It retains the opening/maximize/native preference
matrix. Native Excalidraw/Canvas surfaces remain untransformed; never move these views inside the
graph's scaled camera. Run native drivers serially. Geometry and Electron input do not prove
physical touch or perceived paint.

`tests/viewport-fit.test.mjs` compiles actual fit math, the native resize coordinator and graph
camera/layout callbacks. `tests/embedded-markdown-default.test.mjs` checks native-controller wiring
and cleanup with finite host doubles; native lanes remain authoritative for real geometry.

After exact-build staging, `npm run verify:obsidian:ontology-pairs` uses the three explicit
Small-vault variables and a fresh `KPLEX_HOST_REPORT_DIR`. It exercises the actual Settings
textarea and optional native pairing editor, stationary directional captions, independent
main/split/popout perspectives, physical-field styling and original-source reverse creation/unlink.
It also checks transient/folded section captions. Source/semantic/snapshot counters start only
after controlled readiness; the pair-only interval must do no such work. The driver owns its
notes/dialogs/leaves and restores preferences/configuration bytes. Run native/browser lanes
serially. This is functional Windows host evidence, not a comparative performance, physical
mobile or actual-paint result. Run `npm run verify:obsidian:ontology-pair-reload` separately with
a fresh report directory for persisted raw pairs, signature stability and original YAML evidence
after disabling/enabling the plugin and explicitly reopening its unloaded view. That lane restores the native layout and exact configuration
bytes; it does not claim a whole-application restart or warm-snapshot throughput result.

`npm run verify:obsidian:ontology-startup-updates` uses the same exact build and explicit Small
variables. It temporarily selects Eager through a real plugin reload, creates five owned notes,
and admits a controlled progressive startup with the tested note as its saved center. Normal
foreground leases hold continuations at actual atomic source commits, following native Vault
enumeration rather than assuming name/creation order. Vault/FileManager edits ordinary YAML/inline
ontology; both changed owners must commit before the remaining source, with the stationary SVG
already updated while startup remains held. It restores the original strategy through reload,
native layout/preferences/configuration and owned fixtures. Independent readers are untouched;
holds retire before teardown. This is controlled startup admission, not an application restart
or benchmark.

After exact-build staging, `npm run verify:obsidian:ontology-input` now routes to the unified
manager/editor lane described below. It uses explicit Save/Cancel; the former textarea's
idle/blur submission is retained only in compatibility tests, not exposed as a second editor.
Set `KPLEX_ONTOLOGY_INPUT_MODE=eager` or `on-demand` to select an actual reloaded session;
the driver restores the original saved mode/session and configuration afterward. The
[PR147 record](docs/validation/ontology-input-147-2026-10-18.md) documents the historical textarea lane.

For settings-save liveness, set `KPLEX_STYLE_REFERENCE_ONLY=true` and
`KPLEX_STYLE_LIVENESS=assert` on `verify:obsidian:style-operations`, after staging
the exact build in Small. The existing reference/size editor lane then holds an
earlier facet/search preparation and its later optional refresh while asserting
durable Save, a dismissible editor, task heartbeats and stationary center. Use
`observe` only to capture a baseline pending-editor observation; it is not fix
acceptance. Holds are released in cleanup independently of assertions. Run the
ordinary style-operation lane separately as a quiet/storage-failure control.

Set `KPLEX_STYLE_REFERENCE_SIDECAR=true` with the reference lane to keep a managed
Markdown Sidecar open. Add `KPLEX_STYLE_EXCALIDRAW_SIDECAR=true` for a real drawing
created by the enabled companion, explicitly displayed as Markdown; the lane
asserts this representation and records the companion version. The same drawing
option works with `KPLEX_STYLE_SIDECAR_GATE_ONLY=true` for actual global gate-radius
slider/Settings-close coverage. It never substitutes a plain Markdown note for
that drawing case. All generated files remain probe-owned and are removed.

### Unified ontology manager acceptance

After exact-build staging, `npm run verify:obsidian:ontology-descriptions` uses the
same explicit Small-vault variables to exercise independent field and inverse
descriptions through the native editor and manager. It checks Cancel, edit and
clear, exactly one write per accepted edit, unchanged semantic revision and zero
Markdown reads, parses, source acquisitions, rebuilds or semantic invalidations.
It restores settings, layout and configuration bytes without creating notes.
`verify:obsidian:ontology-pair-reload` additionally checks that both authored
descriptions survive plugin reload. Run native lanes serially; these checks do
not establish physical mobile input, macOS or two-device Sync acceptance.

`npm run verify:obsidian:ontology-manager` (also reached by `verify:obsidian:ontology-input`)
uses the exact staged build and the three explicit Small-vault variables above. It opens actual
Ontology Settings and the shared native manager/editor, checks role orientation and partner search,
symmetric pairs, Hidden/Excluded separation, Cancel with operation counters, one-write pair-wide
role changes, pair-only unpairing, two-new-name creation, assignment removal and the Hidden deep link.
The existing `verify:obsidian:ontology-pairs` lane uses the manager for its stationary caption/style
and zero-semantic-work checks. Pair reload and incoming-settings lanes remain separate. Run native
lanes serially. These are functional checks, not comparative performance or physical-device evidence.

Set `KPLEX_ONTOLOGY_MANAGER_NARROW=true` for an actual 440-pixel native Settings-window
viewport with long synthetic field names. The driver temporarily lowers that owned window's
minimum size and restores its minimum/bounds before closing it. It waits for visible native
owners at both initial and no-Plex openings, and detaches native geometry before reporting it.
Its fixture restoration uses the queued settings path before restoring original file bytes.
The incoming-settings lane also verifies a dirty ontology draft against real hierarchy receipt.

`npm run verify:obsidian:ontology-usage` checks the field editor's **Show documents** extension
against existing native source facts. It seeds two owned scalar/inline-field documents before
observing the read-only interval, then uses actual Settings, keyword filtering, the native
clipboard, new document tabs and ordinary Plex navigation. It asserts zero note reads, parses,
source acquisitions/replacements and settings writes while listing/filtering/copying. Explicit
navigation is tested separately because opening a Plex may legitimately request its neighborhood.
The driver restores its document fixtures, layout and configuration. The real-IDB usage regression
also verifies unchanged selected source heads and acquisition counters without a semantic graph.

This lane also cleans the two fixture properties, verifies that **Show documents → Refresh**
updates the manager while retaining an assigned zero-use field, removes that assignment and opens
the Unassigned manager with the historical stale discovery entry. **Refresh counts** must remove
that entry without note reads, parser work, acquisitions, source replacements or settings writes.
The discovery rescan is fixture setup only; the tested recount never runs that operation.

Set `KPLEX_ONTOLOGY_USAGE_PARTIAL_ZERO=true` to exercise the partial-zero regression. For the
final fixture-field lookup only, the driver delegates to the real posting lookup, then reports
incomplete coverage. Zero-result Unassigned rows must still disappear, with the same strict
zero-source-work assertions. The wrapper is restored on every exit; no production index state
or stored facts are altered by this fault injection.


### Startup source recovery

After full verification/exact-build staging in `kplex-test-small`, run
`npm run verify:obsidian:startup-source-recovery` with the three explicit test-vault variables
and a fresh `KPLEX_HOST_REPORT_DIR`. Back up the exact Small database before fault injection.
The bounded probe reopens initial coordinator flags on an already settled source-backed eager
native index, withholds metadata for one owned note, and lets real reconciliation fail. Restoring
the genuine native metadata and delivering its existing changed event must complete adoption
automatically, retain the published scene and leave no unsaved mask or new full build. The probe
forwards original promises, caps retained attempt outcomes, restores method descriptors, deletes
its note and reloads the plugin with original settings bytes. This controlled recovery lane does
not establish fresh-process route selection, physical interaction or CPU improvement; use the
separate guarded application-startup study for those startup observations.

### Startup admission

After exact-build staging in the explicitly configured `kplex-test-small`, run
`npm run verify:obsidian:startup-admission`. The shared controlled-probe driver verifies artifact
hashes and vault identity. Close existing main/sidebar Plex tabs first; when automating, capture
and restore the original workspace around this prerequisite. The scenario reloads the plugin, exercises the real Indexing Settings
switches and strategy dropdowns for all three devices, observes a ten-second dormant interval and native file/metadata edits, then opens main
and sidebar Plexes concurrently. It checks stationary connections, close/reopen reuse, enabled
Eager pre-open startup and a live inactive Plex. It restores original configuration/layout and
removes its two owned notes. The retained-heap sample reuses `startupRetainedMemory.mjs` outside
startup timing; renderer-wide memory/CPU are not plugin-exclusive costs.

An explicitly staged immutable prior build can run only the matched startup observation with
`KPLEX_STARTUP_POLICY_BASELINE=true`, `KPLEX_PROBE_ARTIFACT_DIR` and `KPLEX_PROBE_BASELINE_REF`.
Use an identical fixture and saved settings, and label actual cache conditions. This finite native
lane does not establish full application restart, macOS or physical phone/tablet acceptance.

Native desktop drivers that request a strategy set `indexingModeDesktop`. Drivers supporting
explicit older-build baselines also set the retired global `indexingMode`; only the device field
owns current production startup. Reports read the actual index strategy, not a pending saved edit.
Direct isolated GraphIndex fixtures retain their explicit legacy constructor input.


## Internal Plex view validation

The [canvas-view API reference](docs/CANVAS_VIEW_API.md) and [developer guide](docs/CANVAS_VIEW_DEVELOPER_GUIDE.md) document the public pure/host entries, captured settings/session ownership, measured rendering, availability-aware predicates, shared targets and optional section snapshots. Executable columns and section-conformance policies import those entries; section conformance is included in the host-free check. Central source selection is explicit: Compass follows attention, Mind Map follows its pinned root, and Facets keeps sections disabled. Production integrations need their own source/folding/navigation/editor tests and exact-build native acceptance. The [sample vault](tests/fixtures/facets-vault/README.md) contains the five supplied presets plus custom State. Keep final exact-head/native evidence separate from implementation and browser conformance in the [validation record](docs/validation/facets-220-2026-10-25.md).

Compass, Mind Map and Wu Xing are registered production views. Their validation reports retain exact source/runtime attribution and host limits. `wuxing` and `wuxing-browser` cover classification, property lifetime, measured regions and production rendering; `plex-view-classic` protects the
pre-extraction membership/caps and 16-case exact geometry golden; contract/session
checks exercise bounded cached reads, malformed output, unknown state, independent
lifetimes and editor compatibility. `plex-view-probe` mounts the actual shared
Chromium renderer with a test-only non-Classic definition, including arbitrary
areas, repeated occurrences, Find, grouping, selection, preference restoration,
action cancellation and failure recovery. All belong to normal `npm run verify`.

After exact-build `verify:obsidian` staging in backed-up Small, run
`npm run verify:obsidian:plex-views` with the three explicit test-vault variables
and a fresh report directory. Back up the native workspace and establish a usable
main-pane width before interaction checks: expanded test sidebars can leave a
42px graph with zero-width Find controls. Public sidebar collapse methods may
prepare this disposable fixture; restore its original layout afterward. Record
actual viewport/main-pane dimensions rather than counting clipped controls as a
pass. It temporarily replaces one test session's static
registry with the portable test definition, then restores it. Two serial lanes
check the native editor/caret through dirty switches/failure and independent
Plex/Sidecar pairs separately. Both check same-scope zero-source-work switches,
immediate prepared-action cancellation and popout/main remount. The editor lane
also checks incompatible-view blocking. The combined editor-plus-two-pairs
control remains a documented limitation reproduced on accepted main; see the
[validation report](docs/validation/plex-view-plugins-215-2026-10-24.md). It uses existing controlled-probe transport,
owns a timestamped fixture folder and restores settings/layout/resources in
`finally`. No production registry, global debug API or new vault is installed.
Run existing sessions/groups/actions/workflow/sections lanes serially for Classic
regressions. Native automation and desktop mobile emulation do not establish
physical Windows, phone or tablet input acceptance.


### Occurrence-editor prerequisite acceptance

After exact-build staging in backed-up Small, run
`npm run verify:obsidian:occurrence-editors` with the three explicit disposable-vault
variables and a fresh report directory. The test-only opt-in definition uses the actual
shared actions, scene, native Markdown controller and existing session. It checks root R,
attention A/C and editor B1, duplicate B2/capacity one, genuinely dirty text/nonempty
selection/focus through resize/reflow/scroll clipping, exact filtering, rejected-save and
authoritative-removal recovery, bounded intent restoration, main/popout migration,
external Vault rename/deletion/recreation and durable teardown. It awaits actual source
maintenance settlement before reopening a saved document; it does not retry a rejected
action. Production definitions remain unchanged until their own feature registers them.

Run browser/native drivers serially and retain failed samples. The earlier FileManager
rename producer stalled at the native cache-clean gate; Vault.rename exercises external
mutation separately and does not turn that workflow into a pass. This lane's view
recreation is not a whole-application restart, native Electron input is not physical
mobile/Windows acceptance, and simultaneous editors are unsupported. See the
[interim report](docs/validation/occurrence-editors-219-2026-10-25.md) for evidence,
restoration and remaining checks.


### Production Mind Map acceptance

After exact-build staging in backed-up Small, run `npm run verify:obsidian:mindmap` with the three explicit test-vault variables and a fresh report directory. Run `KPLEX_MINDMAP_LANE=navigation`, `editor` and `sessions` serially. The navigation lane checks root parent/peer context, trusted branch expansion, actual SVG bottom-child/outward-peer gates, current-node selector entry, history/pin rerooting and bottom-left density rails through the shared durable type-settings writer. The editor lane uses the real registered definition, canonical diamonds/cycles, Find, trusted native primary input, dirty editor/caret/focus, actual spacing/resize, camera and branch/root/filter/selector guards, migration, durable close and bounded native-view restoration. The session lane uses production Compass/Mind Map in actual main/popout documents, captured selectors, a retained draft and independent roots/cameras/main-window Sidecar association/restoration. A separate fresh-popout Sidecar creation attempt remained empty and is not counted as passing; the session lane does not certify that workflow. All test-owned notes/leaves/settings/layout/wrappers are restored. No test definition or production debug API is installed.

`tests/mind-map-source-demand.test.mjs` uses actual GraphIndex, source acquisition and Chromium IndexedDB in both modes to prove unprepared branch preparation and cancellation of held native/canonical covers. This is distinct from portable DTO tests and native editor acceptance. Existing scaling guards remain enabled. Native-view recreation is not whole-application restart; physical touch/Windows and the documented M0 FileManager cache gate remain separate limits. See [the current evidence](docs/validation/mind-map-219-2026-10-25.md); a written driver is not a passing receipt.

For the focused native HTML source-identity/actual additive Save/occurrence-editor text-drop proof, use `KPLEX_MINDMAP_LANE=interactions KPLEX_MINDMAP_DRAG_ONLY=true` with the same disposable Small variables and a fresh report directory. This runs the existing real drag transport and shared composer/editor in a test-only definition; it is separate from the full parent-area/navigation lane. After native popout migration, check that Obsidian’s `activeDocument` still has a live window before a later modal probe. A retired host document requires a disposable-renderer reload; preserve that failed sample, and do not treat reload as an application fix or a whole-app restart test.


### Numeric settings controls

Numeric preferences use sliders with an always-visible value. Native Settings use `src/ui/numberSlider.ts`; React controls use `LayoutSlider`; optional overrides use the existing `styleNumberSlider` inheritance wrapper. Keep bounds, units, explicit reset and draft/save ownership. Numeric text inputs and private slider implementations fail the source audit in `npm run check:architecture`. See `AGENTS.md` for the standing UI rule.

### Focused scroll visibility validation

For connector clipping or navigation-paint changes, stage the exact build in the existing disposable Small vault, then run `node scripts/testing/obsidian/scrollVisibility229.mjs` with the three explicit test-vault variables and a fresh `KPLEX_HOST_REPORT_DIR`. It owns a small structural folder and checks native route identity, bounded animations and card pixels, restoring configuration/workspace and removing all fixtures. If the renderer remains occluded, `KPLEX_229_OCCLUDED_DIAGNOSTIC=true` temporarily disables and restores that window’s original background-throttling flag for functional pixel diagnosis only; do not treat that lane as foreground or performance acceptance. See the [#229 validation record](docs/validation/scroll-visibility-229-2026-10-31.md).

### File creation and navigation acceptance

`node --test tests/creation-navigation.test.mjs tests/related-note-composer.test.mjs tests/viewport-fit.test.mjs`
checks version-gated drawing templates, destination forwarding, creation recovery and camera behavior.
The shared template control is used by related-note creation, folder-child creation and placeholder
materialization. Excalidraw 2.29.1 is required for the public template/path boundary; older companions
retain their existing creation path. Template selection is remembered after a drawing is created.

After exact-build staging in the existing disposable Small vault, run
`npm run verify:obsidian:creation-navigation` with the three explicit test-vault variables and a fresh
`KPLEX_HOST_REPORT_DIR`. It checks real file/tab/link menus, native tab captions, independent tab/split/
popout destinations, wheel pan and modified zoom, and non-default preferences plus an unknown-key
sentinel across actual plugin reload. The scenario restores settings, workspace and owned fixtures.
The existing Excalidraw companion supplies its public native Menu constructor; positive template
creation additionally requires the new companion build. Native programmatic wheel events do not
establish physical trackpad or mobile touch acceptance.
