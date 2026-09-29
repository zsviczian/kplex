# Snapshot fallback after the desktop zero-page restore

The reported 0.0.5 diagnostics showed an active schema-3 snapshot pointer and a newer partial checkpoint pointer. Both recent startups selected the stale complete generation, entered page hydration, loaded zero pages, reported `hydration-incomplete`, and began cold progressive indexing. `invalidActive: false` validates the pointer record only; it does not verify its chunks. The old report cannot identify the failed IndexedDB operation or prove whether the checkpoint remains readable.

The additional Android/iOS/desktop reports separate two more behaviors. Android hydrated 110,632 pages and 281,828 evidence records from a fresh active snapshot in about 19 seconds, stayed ready at 11,808 Markdown files, and handled later changes with five per-file patch decisions. iOS hydrated all 110,633 saved pages but rejected the snapshot after detecting 28 added physical files and seven modified Markdown files; the old broad `unsupported-physical-change` reason cannot distinguish a non-Markdown addition from an unresolved file binding. Both iOS and desktop then logged repeated `cold-progressive` decisions roughly every ten seconds after metadata changes. Those events invalidated the global source revision used by cold ingestion, restarting progress instead of retaining the per-file backlog.

## Change and evidence

- A failed preferred generation now tries the other settings-compatible saved generation against the same captured vault inventory. A checkpoint remains non-authoritative and resumes unfinished sources. This path does not reread Markdown bodies or recapture inventory before the second attempt.
- Snapshot streams report path-free failure codes for unavailable storage, missing or malformed chunks, malformed page/evidence records, read errors, and cancellation. Diagnostics prefix the saved generation and phase, for example `active-pages-missing-chunk`.
- Orphan cleanup reads both pointers together and skips deletion when metadata is unavailable or malformed. A transient pointer read must not make its referenced generation appear orphaned.
- The fixture reproduces a complete generation that fails before its first page, verifies checkpoint restoration and retained completed-source set, and checks the decision sequence. A separate storage fixture verifies that cleanup deletes nothing when pointer reads are uncertain.
- A settled checkpoint remains recognized by the startup coordinator, even if it hydrates before that coordinator checks its task.
- Cold ingestion now cancels only for its own generation or an exact in-flight source revision failure. Unrelated sync/metadata changes stay in the coordinator's per-file backlog for a follow-up patch. A fixture adds a synced note after the builder captures its Markdown list, verifies that the current pass completes, patches the new note, and compares the graph with a fresh full build.
- Physical fallback diagnostics now distinguish `non-markdown-file-added` and `missing-file-binding` from the old generic `unsupported-physical-change`. The exact iOS trigger cannot be recovered from the older report.

## Verification

Node 22.22.3 `npm run verify:obsidian` passed architecture, core contracts, official Obsidian lint, indexing and browser suites, production build, and exact installed host render in disposable `kplex-test`. Obsidian 1.14.2 registered the start command, rendered K-Plex, and captured no JavaScript errors. Installed `main.js` SHA-256: `61d09097d22b74bcfff930258528abf3917e2377a433ef9a8b58f2f078916e7b`. `git diff --check` passed.

An initial host attempt stopped before render because the disposable vault was left in mobile emulation, which intentionally hides the desktop graph-tab command. The vault was returned to desktop mode and the final exact-build run passed. This was a test setup issue, not a plugin startup error.

## Limits and follow-up

The maintainer's main-vault cache was not read or changed. The reported checkpoint's chunks may already be damaged or incompatible; the saved metadata alone cannot prove it will restore. If both generations fail, K-Plex still performs a cold build. Additions of non-Markdown files, unresolved file bindings, folder changes and ambiguous rename batches remain conservative structural rebuild cases. Ask the maintainer to copy a fresh diagnostics report after installing the new build if a restart again begins cold. Physical iPad/Android interruption and memory behavior remain unverified by desktop CLI tests.
