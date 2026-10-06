# Warm on-demand counts and folder navigation — validation

W1–W4 implementation and automated acceptance complete on `indexing-fixes`, base `2a450b9a3560b88ba501e56587c5dae89a2453e8`. Changes remain uncommitted; C15–C26 remain paused. [Exact evidence](warm-folder-counts-2026-10-06.json) records the frozen source, full verification, native scenarios and restoration audit.

A subsequent maintainer-authorized reference reload exposed a stale-source startup case beyond that acceptance: [W5 follow-up](warm-reload-source-progress-2026-10-06.md). W1–W4 do not establish immediate exact note counts before stale-restart incoming-contributor closure.

## Cause and correction

The host preview accepted only Markdown files, so a folder center could not publish native membership while canonical source preparation was pending. Separately, unrelated MetadataCache observations retired the entire trusted warm navigation snapshot. Partial requested scopes then obscured complete cached incidence and its numeric gate totals.

Folder previews now use Obsidian's native Vault folder tree (`getFolderByPath` / `getRoot`). Folder membership does not belong to Markdown MetadataCache. Existing structural source producers, compiler and gate projection provide direct children and parent/child totals without a recursive vault scan, body read or global backlink prerequisite. Dense membership compiles cooperatively in 64-member chunks; the displayed cover is capped at 300/configured maximum and exact center totals precede truncation. Visible folder endpoints receive optional, independent count-only preparation. Capturing and validating direct native membership remains synchronous O(direct members).

Known, bounded metadata observations at the same physical file revision now retire their source and old/new affected targets while retaining unaffected trusted warm incidence. Current sparse pages keep fresh aliases and metadata; only relationship/count readers borrow unaffected complete warm incidence. Unknown revision jumps, physical edits (including size-only changes), unsafe or oversized metadata, changed aliases, Date-widget properties, topology and semantic-policy changes retain conservative invalidation. Native identity, membership, settings, scope replacement and unload fence awaited folder work; unrelated Markdown revisions do not cancel native membership. Vault topology changes recount demanded folder endpoints, including folder parents of note centers.

These presentation/count proofs do not grant editing authority or complete semantic incidence. Restart-host dependency reconciliation remains required. No cache schema, source acquisition scheduler or relationship classifier changes.

## Verification

`npm run verify:obsidian` passes architecture 7, core 67, Node 237, UI 17, portable source 322 and actual Chromium/IndexedDB 303 tests, with no skips. All 24 production settings scenarios, installed Obsidian types, production build and exact-installed native smoke pass. The official scanner reports zero errors and one retained `Workspace.activeLeaf` warning at `src/main.ts:3142`.

Focused host tests pass 24/24; relationship actions 36/36; warm-start IndexedDB 14/14. The strengthened alias regression preserves the current alias alongside a body-derived attachment child outside the sparse cover. Folder tests include 513-member exact totals, visibility, empty/root/nested folders, membership changes, cancellation and final policy fences. The complete suite also passes the existing 20,015-owner zero-body-I/O publication oracle. This is browser functional scale evidence, not native-vault latency evidence.

Exact-build native foreground testing passes six scenarios with background inventory held: folder tree/numeric gates, navigation, link creation, unlinking, file creation and visible edit. The folder scenario asserts four direct children, two children in the nested folder, rendered center text `4` and absent semantic write authority. Every operation finishes before background release; broad foreground flush calls remain zero. Reported operation durations measure controlled API/DOM assertions, not physical interaction or paint latency.

All 270 implementation/test/build inputs match the frozen fingerprints. Built, staged and native-tested artifacts match: main `3217fba5331e854c04092f912ca6df996767fa2faaf070e71a421b421c51bb9f`, styles `0d75bb3b4dd6a863319116b54b3d1b9f31d21d03ee8c8d24963aa0e344ebf01c`, manifest `e3bb9a35215af97f6a3394cf7fc8f7d2142bae06de94bb112fef5a05819cda62`.

The native driver restores settings bytes/enablement, removes fixtures/controllers/wrappers and resumes source reconciliation. Final passive audit confirms the original 13 Markdown notes, no fixture/controller, no build/hydration/pending priority work and restored source authority.

## Development findings and remaining manual coverage

Two initial aggregate attempts exposed narrow test doubles missing the topology hook. The next browser aggregate passed 302/303 and caught stale aliases from selecting whole warm pages. The correction selects warm incidence only in the relation/count reader; all 303 pass in the final aggregate. These failed attempts are retained in the evidence, rather than counted as acceptance.

The personal reference vault was strictly read-only: one passive aggregate observation, no navigation, reload, settings/file writes, installation or instrumentation. Its aggregate result supported the investigation; it does not certify this build. All deployment and fault injection used `kplex-test-small`. No repeated native 20k-vault run or physical mobile acceptance is claimed.

Recommended manual coverage: warm-start folder navigation on Android/iOS, especially navigating into a folder before background indexing completes; create/rename a visible folder during warm preparation to check membership refresh in the actual device lifecycle. Desktop/API finality tests cover the corresponding invalidation, but do not establish physical WebView outcomes.
