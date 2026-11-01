# Native K-Plex menu targets — 2026-11-01

## Reproduction and change

The maintainer reported Open doing nothing and other destinations showing the last workspace file.
A controlled native probe reproduced the wrong center while hiding only the selected file's live
index lookup. The menu correctly captured the clicked TFile, but focusInKplex waited for global
readiness and then required a published graph page. Early availability could lack a filename-catalog
entry too. A new tab retained its initial workspace fallback when that navigation was discarded.
The old native case inserted its selected file into the index, hiding this regression.

Explicit menu navigation now validates the native file, uses an optional detached availability
facade even before catalog hydration, and reroots the exact selected surface. Normal search retains
its catalog-only contract. New native views receive the requested center in their initial state.
The old editor must still save before a root changes; failed saves, retired lifetimes and native
replacement retain the existing refusal behavior. No indexing, scheduler, compiler or storage
algorithm is changed. The two new menu-focus regressions were executed before the fix; sparse
availability failed and native replacement remained protected.

Open to the right is now **Open in new tab group**, translated in all eight catalogs. It creates
an actual separate native group. A feature-detected wrapper around Obsidian's native
handleLinkContextMenu adds the missing placeholder submenu in editor and reading views; public
file-menu still owns resolved files. Obsidian 1.15 emits no file-menu for an unresolved link, so
there is no native link-menu event to subscribe to for this case. The wrapper preserves the native
menu, avoids duplicate resolved-file entries, revalidates the captured source and opens a newly
materialized link's actual file. Unload restores its own wrapper or leaves a later wrapper with an
inert passthrough and no retained plugin reference. No copied editor grammar or DOM parsing is used.

## Focused validation

The maintainer explicitly requested **no full regression cycle**. No npm test/verify aggregate,
full indexing suite, full native suite or device matrix was run.

- Final creation/navigation checks: 33/33 pass.
- Affected editor navigation/refusal checks: 11/11 pass, including three new sparse-destination
  cases for save success, save refusal and native replacement after the await.
- Localization checks: 25/25 pass. Touched-module ESLint and the actual production build pass.
- Ten native macOS cases pass in the disposable Small vault: each of the five destinations for
  both a sparse native file and a placeholder. An unrelated Markdown note is active and recent
  document synchronization remains enabled. Assertions check the actual rendered selected node,
  exact center, separate tab group, real popout document, sidepanel type and absence of a newly
  created placeholder file. Fixtures, settings bytes, enablement, layout and throttling are restored.

[Before-fix native receipt](file-menu-targets-2026-11-01.before.native.json) records a completed probe
with correct=false. [Fixed native receipt](file-menu-targets-2026-11-01.native.json) records all ten
passes and exact artifact hashes. The maintained creation-navigation scenario now retains the sparse
menu-target regression and native unresolved-link construction. The final targeted commands were:

```sh
node --test tests/creation-navigation.test.mjs
node --test --test-name-pattern='Compass|Mind Map|navigation requests|unindexed menu target' tests/linked-document-follow.test.mjs
node --test tests/localization.test.mjs
npm run build
```

These native checks invoke real host Menu callbacks and construct link menus through the native
workspace method; they do not claim physical OS pointer/touch acceptance. Windows and physical mobile
remain separate platform checks. Production was untouched. The K-Plex Help repository was untouched;
its separate author can use the updated creation-navigation help reference.
