# Checkpoint retry after a near-complete desktop reload

The maintainer let Android and iOS finish indexing, then installed the new build and restarted both devices. Android and iOS retained their ready indexes across plugin sync, app restart and a newly synchronized diagnostics note. Desktop continued cold ingestion despite incoming sync changes. After reloading Obsidian near 11,000 of 11,809 Markdown files, desktop restored the saved checkpoint at 6,217 completed files and showed 6,640 indexed files when diagnostics were copied.

The desktop report confirms a readable checkpoint and explains the lost work. The last activated checkpoint had 6,217 completed paths. A later checkpoint returned `snapshot-write-cancelled` at 05:30:42 UTC, about one minute before the reload. The old scheduler reset its committed-source counter and advanced its interval even when persistence failed, so it did not attempt to save those later sources again promptly. An earlier `checkpoint-write-failed` record lacks enough detail to identify whether storage or cancellation caused that separate failure. The corrupted old complete generation still reports `active-pages-missing-chunk`; fallback to the readable checkpoint worked.

## Change

- A checkpoint write now reports whether its metadata pointer activated. Failed writes retain the accumulated commit count and successful-checkpoint interval. The builder retries after 15 seconds, doubling the delay up to five minutes after repeated failures. Ingestion continues between attempts.
- Future diagnostics report the attempted `completedMarkdownFiles`, `durationMs`, and fixed failure codes for unavailable storage, quota, cancellation or other write errors. Old support-history records are copied through a strict field and reason-code allowlist before clipboard export.
- A successfully committed pointer is counted as saved even if cancellation arrives immediately after the metadata transaction. The next restore still validates its vault and source signatures.

## Verification and limits

A deterministic scheduler regression simulates 620 committed sources: the first checkpoint attempt fails at commit 500 and the next occurs at 550, after the modeled 15-second backoff. Snapshot storage and support-history fixtures check failure coding and path sanitization. Node 22.22.3 `npm run verify:obsidian` passed architecture, core, scanner lint, indexing/browser suites, production build and exact installed render in disposable `kplex-test`. Obsidian 1.14.2 registered the plugin command, rendered K-Plex and captured no JavaScript errors. Installed `main.js` SHA-256: `e7ce1b66c86949d82c1a10619750ce149b900a23dfe1726d761a09e1e170b545`.

After the exact build was installed, a foreground native CLI probe confirmed the test vault was ready, visible and idle at 20,015 indexed Markdown files. One explicit complete-snapshot write returned `true` in **7,812 ms**; the persisted decision recorded `complete-saved` with `durationMs: 7,691`. The temporary probe was removed. This fixture has about 20,700 graph nodes and is not a timing proxy for the maintainer's roughly 110,000-node vault.

Checkpoint writes still serialize the full partial graph and may take tens of seconds. A reload before a retry activates, persistent storage failure, or the deliberate skip when fewer than 500 sources remain can still leave a gap. This fix was not tested by interrupting an actual large native checkpoint write; the deterministic failure/retry fixture and exact-build host smoke are the available evidence. The maintainer's main vault was not accessed or changed.
