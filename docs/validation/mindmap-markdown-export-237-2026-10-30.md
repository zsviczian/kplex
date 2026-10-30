# Mind Map Markdown export — PR #237

## Implementation

The central and branch node menus expose **Mind Map Markdown export** in Mind Map. The same stable published command opens a preview with whole-map/selected-subtree scope, **Copy Markdown**, and **Save Markdown**. The default is the whole currently constructed map. The committed scene supplies occurrences, admitted filters, fold state, order and semantic links; no graph traversal, body read, extra projection or branch expansion is requested.

The host-free formatter, scene capture adapter and native text-export adapter are separate reusable services. No public API is introduced. All eight supported languages include the new copy. The [implementation contract](../proposals/MINDMAP_MARKDOWN_EXPORT.md) describes ordering, cycle handling, bounds and explicit format limitations.

## Results

Host: macOS Darwin 23.5.0, Node 22.22.2, Obsidian 1.15.0 / installer 1.14.0. The [machine-readable summary](mindmap-markdown-export-237-native-summary.json) records exact artifact/source/driver hashes and results.

- Focused action, terminology, localization and export checks: 78 passed. The final seven compatibility cases also pass, including a 20-level tree and a 257-node wide tree.
- Actual pinned Mindmap Builder importer: hierarchy/order, root-only and subtree shape, collapse, repeated occurrences, ancestor-cycle and semantic crosslinks, metadata-sensitive text, malformed/capped inputs, native-link capture and system-export guards pass. The fixture is the unmodified upstream importer, with source commit and checksum recorded alongside it. Its unused clipboard-paste dependencies are isolated in the test harness.
- Native central-node menu opens the real preview. Trusted pointer activation copies its exact bytes to the owning-window clipboard. The actual native DownloadItem saves identical bytes to a uniquely owned temporary output. No Vault note writer is called.
- Isolated copy/save intervals each record zero body reads, parses, acquisitions, actual index rebuilds or semantic-settings refreshes; the save interval also observes zero coordinator checks and an unchanged published semantic snapshot.
- Native selected collapsed branch exports only itself. Quick-filtered scope omits excluded branches. The published command is checked and executed. Main-window and popout canvases retain independent roots, camera transforms, editor bindings and session state; popout copy uses its own window.
- Actual Builder runs in the enabled Excalidraw companion, imports the UI-exported example, produces six nodes with five branch arrows and three crosslinks, retains every wikilink in native `rawText`, and re-exports Markdown successfully. The resulting native scene contains 23 elements. Its unrelated help renderer alone is replaced to prevent network marketing embeds. Both plugin configurations, owned fixtures, API, workspace and callbacks are retired/restored; cleanup passes.
- Full repository verification and exact-build host smoke: running; final result will be recorded before this draft is marked ready.

The first native compatibility assertion incorrectly expected wikilinks in Excalidraw's separate `link` property. Inspection established that Markdown-backed text stores them in `rawText`; the corrected check verifies all exported targets there. Earlier development probes also caught and corrected explicit node-target routing and Obsidian ButtonComponent icon/text replacement before final acceptance.

## Remaining limits

Builder displays HTML escapes literally. Syntax-sensitive aliases and annotations therefore have an explicit preview warning; ordinary ampersands are preserved. Unsafe link targets become text and warn. Structural outlines, unsupported submaps and root-only self-links are omitted with a warning rather than silently inventing hierarchy. Existing collapsed or incomplete scene content remains collapsed/incomplete.

The native download acceptance selects its owned temporary destination synchronously in Electron's main process. A native macOS destination sheet was observed during development, but automated destination/overwrite interactions are not claimed. Save feedback describes native handoff. Mobile uses Obsidian's feature-detected native text-export capability; its Android/iOS share sheet, minimum-host 1.13, Windows and physical touch remain untested here. Missing native export support disables Save while retaining Copy.

## Reproduction

Run `npm run verify:obsidian` with the three explicit disposable-vault variables in CONTRIBUTING.md, then run `npm run verify:obsidian:mindmap-markdown` with a fresh report directory. Run `npm run verify:obsidian:mindmap-builder` serially with a fresh report directory, local Builder source path and the UI probe's `native-export.md` as documented in CONTRIBUTING.md. No runtime network access or additional companion dependency is added to K-Plex.
