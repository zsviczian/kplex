# PR #278 UX follow-up validation

This is the earlier UX artifact. The subsequent shared-form, mobile-shell and Daily
Notes template work is tracked in [UI harmonization validation](ui-harmonization-278-2026-11-04.md).
This report does not establish acceptance of those later changes.

Implementation is uncommitted on `2026-11-03-issue-277-creation-links-compass`, based on `c0e6166`. This record covers the maintainer's subsequent UX review. The earlier [baseline report](authoring-compass-278-2026-11-04.md) describes an older artifact and is not current follow-up acceptance.

**Status: implementation and available Windows validation complete; uncommitted for review.** No production vault has been accessed or modified. Only the existing disposable `kplex-test-small` is used, with explicit path/config identity, serialized native lanes, artifact verification and exact configuration restoration. PR #278 remains draft; no commit, push, merge, release or issue closure is authorized by this handoff.

## Delivered behavior

- Missing periodic pins ask before creating the displayed Markdown path. The shared opening selector remembers a separate periodic preference: do not open, Sidecar, new tab, popout and the other supported native destinations. Cancel creates nothing. The confirmation rechecks the pin's resolved period/path and originating canvas before writing.
- Obsidian Files folder drops and **Open in K-Plex** open the captured physical folder. Native folder identity, replacement, root and delayed navigation are fenced separately from note handling.
- Empty folder-gate drags open shared **Create note / Create subfolder** tabs directly, defaulting to notes and remembering the last tab. Separate drafts survive switching. Move is no longer part of this creation form.
- Real file/folder nodes expose **Move** with the shared folder picker. The existing physical move adapter calls `app.fileManager.renameFile`; collisions, descendants, replaced endpoints and stale consent remain rejected. Direct folder-to-folder gate moves remain supported.
- Connection source actions share one row: **Edit: "field"**, **Go to source**, **Flip owner**. Flip confirmation shows fixed **Current relationship / After saving** previews and only Cancel/Save. A subsequent Save first observes a pending durable result, then uses the existing idempotent writer. Replacement remains saved before original removal.
- External imports use one direct form, one common destination and one child ontology for a flat batch. Folder parents use physical containment without YAML ownership controls. Directory drops on physical folders preserve hierarchy and empty directories. Copies retain exact bytes; originals are kept. Partial copies retain native receipts so retry does not duplicate them. Imports are bounded to 256 files, 32 MiB/file, 128 MiB/batch, 2,048 entries and 32 path levels; oversized/unreadable inventories fail before copying.
- Shared fuzzy suggestions dismiss on Tab while preserving ordinary native focus traversal and typed drafts. This avoids a stale folder suggestion overlay covering Move.

## Index diagnostic and reproduced cause

The supplied macOS diagnostic had 11,827 Markdown files and 110,541 graph nodes. At capture the graph was authoritative/ready; the recorded interval included a full-build admission and superseded startup hydration. Zero Markdown disk reads/parses were recorded in the reported global passes. That does not prove every file was reread or that a daily pin caused rebuilding.

A source-backed real-IndexedDB regression reproduced the actual admission defect: a complete physical inventory was present while initial semantic startup remained incomplete, yet `vault:create` still queued competing global work. The create listener now accepts the existing exact local folder/attachment path when physical inventory is complete and no private build, snapshot hydration, structural task, purge or shutdown owns it. It does not cancel/relabel semantic startup. Uncertain or privately building state keeps the conservative fallback.

Before-fix reproduction: source-folder suite **40 passed / 2 failed** (one failed child plus its parent). Restoring the fix: source-folder plus startup ownership **76/76 passed**, without weakening assertions or negative controls.

## Validation ledger

Pinned Node **22.22.2**, installed Obsidian types and the production build passed before native staging. The mandatory final `npm run verify` **passed** on 976 unchanged frozen source/test/build inputs, SHA-256 `595c21b5003b8bbc2cdf7560916b164ba26a574330100ad7c77c3a39aca83354`, log `%TEMP%/kplex-278-ux-verify-final2.log`. It completed at 2026-11-04 08:36:57 UTC with exit 0. Release metadata, architecture/numeric checks, core checks, official lint, custom indexing harness, all test groups, installed-type checking and the production build passed.

Focused final affected coverage passed **138/138**; source-folder/startup ownership passed **76/76**. An initial aggregate run stopped on an old source assertion expecting the deliberately removed combined folder chooser. Its replacement asserts the shared tabbed note composer and separately captured native Move route. The custom indexing harness then passed unchanged behavioral/negative controls before the new frozen full run. Original failure and recovery logs are retained in the JSON.

All native lanes below passed with final JavaScript. Each staged run checked explicit Small vault identity, froze and hash-verified installed artifacts, held the shared app-user-data lock and restored original settings/enablement/layout with exact data bytes. Baseline: **117 files / 98 Markdown files**. No whole-application restart or production-vault fallback was used.

| Native lane | Actual acceptance | Receipt suffix |
| --- | --- | --- |
| Folders | Trusted Files create/name, 450 ms delayed naming, nested/repeated folders; at 122/223 files exactly 5 inspections, zero head pages/source inventory passes, one read/parse for the later real note, physical coverage complete | `pViec7` |
| Structural | Direct note form, Cancel, remembered subfolder tab/reload, FileManager move and incoming wiki-link update; 560 px native visual hold | `zcCQSx` |
| Authoring | Selected ontology/drafts/focus, inverse owner, fixed before/after confirmation, induced post-save publication failure and safe second-Save completion | `6zHYkB` |
| Imports | Trusted real filesystem payload; one form/shared child field, Cancel, direct single-file form, exact-copy retry, recursive hierarchy/empty folders, original bytes unchanged | `bB02rN` |
| Popout imports | Same copy/retry/directory acceptance in a genuine separate document/window | `Sbo44E` |
| Compass | Existing role geometry, gate/keyboard routing, bidi text, independent main/popout state, reload and zero source work for orientation | `TSQgk2` |
| Pins | Existing order/one-write/keyboard/rollover/reload, Escape, actual blur, close/migration cancellation and held visual feedback | `pJihZZ` |
| Lifetime | Native close/migration retires parent and ontology child; stale popout import Submit copies nothing | `XNrNSP` |
| Periodic | Explicit Cancel/confirmation for day/week/month; do not open/Sidecar/tab/popout, exact destination and remembered choice across reload | `SBLdGw` |
| Folder navigation | Actual Files context-menu entry and native Files drag source/trusted canvas drop open the captured folder | `fvK2uR` |

Receipts are `%TEMP%/kplex-278-native-<suffix>/authoring-compass-<lane>-278.json`; the summarized results, hashes and cleanup are preserved in the companion JSON. Native pin blur initially failed because `BrowserWindow.blur()` alone did not establish Chromium focus loss on Windows. A real focus transfer plus observed DOM blur canceled without saving; production pin cancellation logic required no change.

Native screenshots were inspected for the fixed ownership preview/action row, periodic confirmation/opening choice, folder tabs at 560 px, and the common import form. This caught and corrected a narrow/unstyled child-relationship field. Only import-modal-scoped CSS changed after the earlier native lanes; affected main/popout imports and structural narrow coverage were repeated with final CSS. All lanes use the same final JavaScript. A narrow desktop screenshot is not physical-mobile acceptance.

Final independently rebuilt artifacts:

- `main.js`: `9efd0cc26380f0b0f7cf6f9965be93785315175fbe5176476f715423f4eb107a`
- `styles.css`: `5a6e024d3bf2a53ec12eb4b50fa57447419974d285eb38fe58a76aec364f7f90`
- `manifest.json`: `8c65b0d38a506f8fa9fc3311b81ea22bcda48e0209e9190483752c1f20834326`

The rebuilt JavaScript matches every native lane, and final CSS matches the affected main/popout imports and structural/narrow lane. Frozen inputs were independently compared after verification and are unchanged.

| Completed automated group | Passed | Failed / skipped |
| --- | ---: | ---: |
| Architecture/numeric | 9 | 0 / 0 |
| Core contracts | 133 | 0 / 0 |
| Main regressions | 2,067 | 0 / 0 |
| Browser UI | 492 | 0 / 0 |
| Source contracts | 360 | 0 / 0 |
| Real Chromium IndexedDB | 900 | 0 / 0 |
| **Total** | **3,961** | **0 / 0** |

The unchanged 20,015-owner stress fixture passed 8,187,369 owner checks, one direct canonical pass, zero optional passes and two cancellation yields. Cached publication took 402.47 seconds; peak JS heap was 425,751,626 bytes and combined reservation peak 685,201,826 bytes. These are one shared-host run's results, not a controlled elapsed-time comparison or production-vault speedup claim.

All available Windows automated/native acceptance is complete. macOS, physical-mobile and OS drag initiation remain explicitly unavailable; the checks below are review recommendations, not claimed passes.

## Remaining platform and scope limits

Windows Obsidian 1.14.5 evidence does not establish macOS 1.15, physical mobile, OS Explorer/Finder drag initiation, or production-vault CPU/warm-hydration performance. Native external drops use trusted Chromium Files transport from real owned filesystem fixtures, not an assertion that Explorer initiated the gesture. Periodic creation uses the configured path and canonical Markdown creation; third-party Periodic Notes templates/hooks are not invoked. Bulk copy/link operations can be partially durable after cancellation or failure; committed copies remain visible and retries retain their identities. Conservative structural recovery remains possible for uncertain or imported topology.

## Review risk and remaining manual checks

Residual regression risk is **moderate**, concentrated in the expanded import/create/move interaction surface and macOS host behavior. Existing graph semantics, persistence schema and parser contracts are unchanged. The physical-create fast path has conservative ownership/topology gates and a failing-before/passing-after real-IDB regression. File/property mutations still cross native asynchronous boundaries; cancellation cannot roll back a write already accepted by Obsidian, and a partially imported batch intentionally keeps completed copies.

Prioritized checks when the unavailable environments are available:

1. **macOS 1.15 + Sync activity:** create/name a folder during warm source adoption, then navigate. Expected: complete physical inventory takes the bounded local create path; incomplete/private ownership remains truthful and converges without lost nodes. No production timing improvement is established by Windows results.
2. **Physical mobile:** create through both folder tabs, inspect ownership before/after, and choose periodic opening. Expected: readable labels and reachable controls above the keyboard, retained drafts/choice, and no extra flip/configure step.
3. **Actual Finder/Explorer drag initiation:** drop a file batch and a nested folder onto a physical K-Plex folder. Expected: one destination confirmation, preserved binary bytes/hierarchy/empty folders, no original-file removal, no ownership reversal controls and no duplicate copy on explicit retry.
