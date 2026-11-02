# Incoming unlink and placeholder deletion — 2026-11-01

This is the original reference-action checkpoint. The maintainer subsequently authorized a combined fix branch and PR; current delivery evidence is in [eager-navigation-fix-2026-11-01.md](eager-navigation-fix-2026-11-01.md).

## Patch identity and scope

Working tree on `main`, based on `b64c88a3a11712c23fa75a2ad440adcc9f329c7a` (0.4.0). No commit, push, PR, merge or release was requested. This checkpoint changes the native source-review/deletion owners, not graph classification, storage schemas or settings defaults.

The reported workflows are:

1. Note B declares a property link to A. From A's center, **Unlink connection** must offer B's actual property instead of a details dialog with only Hide.
2. An unresolved link in a note's Markdown body keeps its placeholder alive. **Delete placeholder…** must explain this and offer native source-note navigation, preserving body text.

## Implementation

- `RelationshipExplanationModal` prepares only an incomplete inspected pair, then refreshes its canonical source actions. Ready and structural pairs stay passive. Closed/superseded generations and active confirmations cannot be interrupted by a late preparation result. The existing declaration writer and exact source/field/target confirmation remain authoritative.
- Deletion source discovery supplements target-wide incidence with canonical evidence from its known neighbor pairs. It does not scan the vault or introduce another relationship classifier.
- Delete consent retains canonical/native identity across read-facade refreshes. Recreated physical files and replaced canonical targets remain protected.
- A retained placeholder triggers source reinspection and the existing remaining-references dialog, rather than ignoring the removal refusal. Newly discovered references receive manual navigation only. Failed/oversized previews offer known source notes without granting deletion or rewriting Markdown.
- Existing localized dialog copy and controls are reused; no new strings, settings or dependencies were added.

## Regression evidence

- The unchanged modal from HEAD fails the new opposite-center regression with **Declared property missing from the opposite center**; the fixed module passes the identical test. The fixture covers an authoritative declaring-note view and an incomplete opposite-note preview, exact property coordinates, Cancel, confirmation, and cleanup.
- Before the deletion fix, known-pair reference discovery returned an empty source list and refreshed-facade deletion returned `unavailable` before opening its dialog. Both regression cases pass with the fix.
- A failed source preview originally rejected with no explanatory dialog. Its regression now verifies a source-note action, no confirmation/trash, unchanged text and zero metadata patches.
- Additional coverage exercises late/incomplete reference discovery, native dialog source navigation, stale confirmations, independent evidence, canonical replacement, source rename/replacement, unload and target recreation.

The first aggregate run also exposed pre-existing test setup omissions: the indexing harness did not emit the imported `createdNoteDestination` module, and three creation cases expected implicit opening after the default changed to Return. The harness now emits the existing module. The opening-order cases explicitly select Tab and execute the real completion owner, retaining their original ordering assertions. No golden, deadline or production creation policy was weakened.

## Validation results

Windows, Node **22.22.2**, installed dependencies and Obsidian typings. The production build passed after the final preview-error handling. The affected three-suite run passed 166 tests before the final preview-error case; the subsequent focused eight-case deletion run passed, including that case and recreated-file/unload safeguards.

The final `npm run verify` exited **0** on Node **22.22.2**: release metadata, 9 architecture/numeric checks, 132 core checks, official Obsidian lint, 1,883 main tests, 455 browser/UI tests, 357 source tests, 856 real IndexedDB/source-browser tests and the final TypeScript/production build all passed. This includes the unmodified 20,015-independent-owner acquisition/cached-publication case. `git diff --check` also passed. The aggregate log is `%TEMP%/kplex-reference-final.log`; its exit receipt and six-file SHA-256 freeze were checked before staging.

Exact-build native verification passed on Windows, Obsidian **1.14.5**, in `C:\Obsidian\kplex-test-small` with its explicit `.obsidian` configuration. The strict repository runner hash-verified and staged the current build, enabled the plugin and verified its actual command, mounted app and absence of captured JavaScript errors. Staging receipt: `%TEMP%/kplex-reference-stage-HbJ6D5/report.json`.

A temporary focused controller reused the repository's `actionWorkflows.mjs` transport, fixture ownership and restoration lane. Its two actual reference scenarios passed; the lane's historical `folder-creation` selector is only a cleanup-mode routing detail, not a claim of folder-creation coverage. Receipt: `%TEMP%/kplex-reference-native-581baefd3739484a832d1c021a090556/report.json`.

- From both A and B centers, source inspection offered B's exact property, confirmation named B/A/field, and Cancel preserved the link. Real Unlink dispatch committed from both centers, with A unchanged and B's unrelated property/body retained.
- Deleting an unresolved body-linked placeholder opened the remaining-references dialog, named its source note, and its Open action opened that native Markdown note. The body bytes remained unchanged and the unresolved placeholder remained present.
- Final cleanup reported zero owned fixtures and dialogs, original file inventory restored, temporary controller removed and configuration byte restoration verified.

The focused native probe prepares each freshly created/restored property pair before dispatch, just as the maintained native action driver does. It verifies both directional native workflows; the incomplete opposite-preview failure and asynchronous generation/confirmation races are established separately by the failing-before browser regression. Native actions and DOM button clicks are programmatic; they do not establish physical pointer/context-menu, mobile, macOS or accessibility acceptance. Recommended manual spot check: use the connector's actual context menu from the non-declaring center, then delete a body-linked placeholder and open its source.

Earlier native attempts are retained in temporary reports: malformed temporary fixture newlines/request shape and an unsafe metadata wait were corrected in the probe; a later restored fixture needed authoritative pair publication before another dispatch. One attempt lost foreground while closing a native modal. Deferred dialog detachment, zero remaining fixtures and restored inventory were independently confirmed, its owned controller removed, and retained configuration backups restored and byte-verified before the successful run. No production guard was bypassed, rejected mutation retried or application force-closed.

Validated source/build SHA-256 identities:

| File | SHA-256 |
| --- | --- |
| `src/main.ts` | `efd8a1775471b0486eb9a9854252f74544f678832c5a997867ff90f2fd2be402` |
| `src/ui/RelationshipExplanationModal.ts` | `260361158c683d934ec9b713e52b0cfe8b5f32822a1c6629fd4d3099328aa1af` |
| `dist/main.js` (same as staged) | `d54054fa8f5bddbb1159f368571669b638cdc4464a135e5ccdc3e0f464dac4bf` |
| `dist/manifest.json` (same as staged) | `5de7cf4abc1d611e4edd9a27a12473f38af3843bbb8c9fa590a22d029e49a2e3` |
| `dist/styles.css` (same as staged) | `8e7a4ed3c8b6d8941e020d3766c030d7ed072830a4c408e5eb91815f03437e2a` |

Temporary logs, source-fingerprint receipts and native controllers remain outside the repository. No validation code or diagnostic globals were added to the shipped plugin.
