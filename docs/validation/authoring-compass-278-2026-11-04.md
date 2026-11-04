# PR #278 validation

This is the pre-UX-review baseline. The subsequent [UX follow-up record](authoring-compass-278-ux-2026-11-04.md) supersedes its implementation descriptions and identifies the current validation artifacts.

This implements #277, #273, #274, #275, #276 and #256, plus the requested pin drag feedback.
Work remains uncommitted on `2026-11-03-issue-277-creation-links-compass`, based on local
merge `c0e6166` of accepted main after #270. PR #278 stays draft. Production vaults were
not accessed or changed. The temporary planning scaffold has been removed.

## Implementation boundaries

- Eligible, observed folder create/name waves retain bounded native identity/membership proof
  for one resolver close. Raw modification deadlines remain unchanged. Physical coverage is
  independent of source readiness; conservative recovery can regain it through the existing
  background scheduler's read-only native/canonical tree audit. Unknown/imported topology,
  missing events, replacements and failed structural work remain conservative.
- Folder drags open structural choices using the existing folder picker and native move adapter.
  Creating notes retains its established composer; folder operations never author ontology.
- A shared selected-field editor owns nested ontology dialogs, draft preservation, focus and
  retirement. Saved role changes/deletion revalidate the parent selection.
- Shared direction disclosure names the physical owner, property and target. Selected-source
  reversal saves/publishes the replacement before invoking the canonical remover. Native file,
  selected-role and provenance fences reject stale consent. Completed retries also require
  observed physical absence of the original property, not just missing graph provenance.
  An exception after the replacement is saved retains both declarations, blocks another Save,
  and offers explicit refresh followed by an idempotent completion retry.
- External Files drops copy through browser File/Vault APIs after per-file confirmation.
  Existing native-file/node-link/editor drops keep their original routes. No dependency, cache
  schema, parser, public API or release metadata changed.
- Compass orientation is a validated type-wide presentation option, default off. Geometry,
  ports, tint and labels share its interpretation; ontology and text remain unchanged.
- Pin mechanics keep the existing threshold/order/persistence contracts. The source follows
  the pointer with an accent outline, peers dim and the insertion destination is emphasized.

## Automated checks

Pinned Node 22.22.2, installed dependencies and Obsidian declarations. The final frozen
`npm run verify` passed with exit code 0: release checks, architecture scans, core contracts,
official lint, custom indexing harness, every test lane, installed typecheck and production build.
No failed, skipped or cancelled tests.

| Executed lane | Passed |
| --- | ---: |
| Architecture/numeric | 9 |
| Core contracts | 133 |
| Main regressions | 2057 |
| Browser UI | 486 |
| Source contracts | 360 |
| Real Chromium IndexedDB | 900 |

All 974 source/test/build inputs retained SHA-256 `45b718934543c673f829d55a9600a8366ef1928153c58d71e0ae959ae327db24`
throughout the run. The resulting production artifact hashes exactly match all eight native
acceptance lanes below. Full log: `%TEMP%/kplex-278-verify5.log`.

The 20,015-owner publication fixture passed the existing work guard: 8,187,369 owner checks,
one direct canonical pass, zero optional passes and two cancellation yields. Cached publication
measured 378.8 seconds; peak JS heap 486,863,251 bytes, combined reservation peak 685,201,826
bytes. This is a recorded fixture measurement, not a controlled paired timing comparison or
production-vault speedup claim.

Focused checks passed: 42 source-folder scenarios (including real IndexedDB finality and
held hydration with actual pin settings saves), 25 reversal contracts, 18 external-copy
contracts, Compass geometry/configuration contracts, six actual-browser authoring cases,
four camera/tint lifecycle cases, and preserved migration/source-removal/drop/completion tests.
All added tests are registered in the executed aggregate scripts.

Earlier full runs exposed incomplete legacy extracted-method/module fixtures. Their imports,
native drag data, role-correct defaults and connected view containers were repaired; existing
assertions, negative controls and deadlines were preserved. Newly proven native folder waves
have separate positive cases; unknown nonempty nested topology still falls back.

## Exact-build native results

Windows, Obsidian 1.14.5, Node 22.22.2. Existing disposable `kplex-test-small`, configuration
`.obsidian`, baseline 117 files / 98 Markdown files. Each lane froze and hash-verified its build,
held the application-user-data lock, and restored settings, enablement, layout and owned files.
All seven primary lanes and the supplementary real-popout import lane passed with exact baseline inventory and configuration bytes restored.

| Artifact | SHA-256 |
| --- | --- |
| `main.js` | `e6f16d7b1a61d65dfe8be40006d44c9ee1fa88a7d732a5f4783657ab328256c9` |
| `styles.css` | `384a5d3d541be4ecf3fbe4ff2f2c1eac17d3ca774959d980fb6026832887dc8d` |
| `manifest.json` | `8c65b0d38a506f8fa9fc3311b81ea22bcda48e0209e9190483752c1f20834326` |

| Lane | Actual result |
| --- | --- |
| Folders | Trusted Files create/name, 450 ms delayed naming, nested/repeated folders and later file creation. At 122 and 223 files: five source inspections, zero head pages/inventory passes, one read/parse, no full builds, complete physical coverage. |
| Structural | Trusted folder-gate drag, inert Cancel, real subfolder and visible hierarchy, native folder move with exact child bytes preserved, no ontology writes. |
| Authoring | Exact physical ontology/pair/role on creation, linking, relink and details; Cancel/Save draft/focus preservation; saved role/removal disables stale selections without replacing the target; reversed existing/new links; selected declaration reversal preserves unrelated properties/body. |
| Imports | Main and real popout: trusted native Files payload contains both filesystem inputs; directories are rejected explicitly. Cancellation copies nothing; binary and Markdown bytes preserved; post-copy link failure/retry retains one exact copy; captured origin survives unrelated document opening; external originals unchanged. |
| Compass | All six roles and mixed Arabic/Hebrew text in main/popout, mirrored labels, trusted physical Right key and right-gate drag, one-sided composition, persisted reload. Orientation switch performs zero source work/full builds. |
| Pins | Reorder, keyboard alternative, Escape, History grab scroll, popout blur, view close/migration cancellation, calendar rollover, symbolic activation, missing destinations and reload/unknown-key preservation. Held gestures show moving source, accent outline, dimmed peers and insertion marker; zero source reads/semantic rebuilds. |
| Lifetime | Native popout close and main-to-popout migration retire parent/child authoring; stale child Save writes neither vocabulary nor connections. Closing an unconfirmed popout import retires both batch/composer and copies nothing. |

The final-build receipt locations are in HANDOFF. Real-popout filesystem imports passed on
the same final build. A separate held-drag screenshot was visually inspected in the native dark theme; changing
window focus during the first capture correctly canceled that attempt without persistence.
Computed state and screenshots establish feedback presentation, not GPU/physical-device timing.

## Added #277 Daily Note diagnostic

The supplied diagnostic describes source recovery/hydration, not a measured full graph rebuild:
zero full graph/catalog starts, no body reads/parses, and cached body reuse. The timing alone
does not establish that enabling/reordering Today caused it. Actual pin saves during a held
IndexedDB hydration retain the same hydration owner and start no full build/source inventory;
native periodic reorder/rollover likewise performs no source reads or semantic rebuilds.

## Remaining limits and highest-value review

1. Repeat native Files naming/Sync traffic and periodic pins on macOS Obsidian 1.15, where the
   reported diagnostic originated. Windows bounded-work evidence is not a macOS elapsed-time claim.
2. Cross-file reversal cannot be atomic across two Vault writes. Saved/pending states deliberately
   retain partial results for explicit refresh/retry. Test the selected source in an ordinary vault
   backup before applying it broadly to unusual custom properties.
3. Physical phone/tablet touch/IME and Finder-origin drag initiation remain device checks. Browser
   and trusted Chromium Files transport do not prove every operating system's drag initiation.

The folder audit may still perform one cooperative native-tree traversal after uncertain topology.
It does not claim all populated folder renames/imports are local, nor a large-vault speedup benchmark.
