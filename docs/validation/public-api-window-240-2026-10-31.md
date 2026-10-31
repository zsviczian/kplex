# Public API window entry point — 31 October 2026

PR #240 now publishes the existing frozen API root as `window.kplexApi`, with
`window.kplexApi.v1` as the versioned entry point. The plugin-instance alias remains
available. This checkpoint follows `20d76c3` on `2026-10-30-public-api-cli`.

One service is shared by the main window, existing popouts and newly opened popouts.
The Obsidian adapter registers window events through plugin lifecycle helpers and
enumerates existing leaf containers through installed public host types. Closing a
window releases its alias and reference. Unload removes owned aliases before retiring
the API; retained handles continue to return `API_UNAVAILABLE`. Cleanup preserves
deliberate replacements and earlier property descriptors, and rolls back partial
installation failures.

## Actual validation

Windows desktop, Node **22.22.2**, Obsidian **1.14.5**:

- Focused `node --test` lane: **45 passed** across `public-api-window`, `public-api`,
  `public-api-configuration`, `public-canvas` and `public-api-license`.
- `npm run lint:obsidian`: passed.
- `npm run check:architecture`: **9 tests passed**, zero boundary violations.
- `npm run build`: passed actual installed Obsidian types and production bundling.
- `publicApi.mjs`: **9 native scenarios passed**, now entering through the global API.
  Main/popout root identity, independent canvas actions, migration, GraphQL,
  shared Markdown export and reviewed configuration import/readback passed.
- `publicApiLifetime.mjs`: **3 native cases passed**. Unload removes main/popout aliases
  and retires handles; reload republishes a fresh root in main and an already open
  popout; closing a native popout removes its alias while the main API still works.
- Native cleanup preserved settings and plugin-enablement bytes. Repeated passive
  reads/exports recorded zero reads, parses, acquisitions, rebuilds, semantic
  invalidations and `allPages()` calls.

Exact Small-vault runtime artifacts:

| Artifact | SHA-256 |
| --- | --- |
| `main.js` | `1bbc7e792d11c96982368052501a2428a3acc3d43bea347f2e4cd61da8d20c4b` |
| `styles.css` | `0765c64003bd864c0e50bc21900cda4faa3871b5342388b0f7ee96284d03a55e` |
| `manifest.json` | `2822c38463c03ace4f017453679572d462534ce2a9c9558fd7593f259b01bfa1` |

Private machine reports under `%TEMP%`:

- `kplex-pr240-global-api-native-20261031/public-api-240.json`
- `kplex-pr240-global-api-lifetime-close-20261031/public-api-lifetime-240.json`

The deployment helper's older revision label is stale; the artifact hashes above
identify the actual tested runtime. Small was the only deployment target.

## Risk and remaining coverage

This change publishes aliases and owns window-event cleanup; it does not alter
index/source/storage/semantic owners. Aggregate indexing suites were intentionally
omitted. Earlier full verification remains historical evidence, not this checkpoint's
full-suite claim.

Highest-probability remaining failure is a platform-specific popout lifecycle ordering:
repeat enable with a popout already open, close it, reload, then migrate a canvas on
macOS and minimum Obsidian 1.13. On physical mobile, check main-window availability
and plugin disable/re-enable. No touch UI, paint or performance claim is made.
PR #240 remains draft and unmerged.

## Startup regression correction

The initial checkpoint above covered enabling the plugin after layout readiness. The
reported `Cannot read properties of null (reading 'win')` exposed a missing startup
case: Obsidian can leave `workspace.rootSplit` null during plugin `onload`, despite
its installed declaration being non-nullable. Two new tests reproduced that exact
failure before the fix.

The adapter now publishes directly to the application window and waits for
`workspace.onLayoutReady` before traversing existing leaves. Window-open/close
listeners remain registered immediately. The queued readiness callback checks
disposal, so unloading before workspace restoration cannot republish retired aliases.
No index, source, storage or semantic owner changed.

Validation after the correction, Node 22.22.2 / Windows / Obsidian 1.14.5:

- **47 focused API tests passed**, including pre-layout null-root startup and unload
  before the queued layout callback.
- Production build, official Obsidian scanner and architecture checks passed
  (**9 architecture/numeric tests**, zero violations).
- **4 native lifecycle cases passed**, now including a full Small-vault renderer
  reload through workspace restoration, followed by temporary plugin unload/reload,
  existing-popout publication and native popout-close cleanup.
- All **9 native API scenarios passed** again, with all six passive source/index
  work counters zero. Native settings and enablement cleanup passed byte-for-byte.
- The first renderer-reload run passed all four behavior cases but failed the saved
  enablement cleanup assertion: CLI disable/enable removed K-Plex from the saved
  plugin list. The original list was restored exactly. The probe now uses the existing
  temporary plugin lifecycle methods, preserving that list; the rerun passed cleanup.

Corrected `main.js` SHA-256:
`541e9ed8a75b8a015d27ae2398077fd49ada2d7b7027fdcfe8fc785af9a101f9`.
Styles and manifest hashes above are unchanged. The corrected build was installed
only in Small. Private reports under `%TEMP%`:

- `kplex-pr240-global-api-startup-fix-20261031/public-api-lifetime-240.json`
  preserves the initial cleanup failure.
- `kplex-pr240-global-api-startup-fix-r2-20261031/public-api-lifetime-240.json`
  records the passing startup/lifecycle/cleanup rerun.
- `kplex-pr240-global-api-startup-native-20261031/public-api-240.json`
  records the passing API scenarios.

Aggregate indexing suites were intentionally omitted because this correction only
changes alias publication timing. This is actual renderer-startup evidence, not a
whole-process/operating-system cold-start or physical mobile result. Repeat startup
with saved popouts on macOS and minimum Obsidian 1.13; on physical mobile, verify
initial API availability and disable/re-enable cleanup.
