# Startup index stability — 2026-09-28

## Change and design boundary

A complete IndexedDB graph no longer becomes unusable merely because Markdown notes were added or deleted before the next delayed snapshot write. Startup captures the vault signature, file paths, and folder paths in one tree traversal, restores the graph, and reconciles note-only changes through the existing per-source patch boundary. Modified Markdown files remain per-file work. A partial checkpoint can also resume after Markdown edits/additions/deletions: changed completed paths are removed from its completed set and processed again. The active complete generation and partial checkpoint remain separately activated.

Mixed additions and deletions (possible rename), folder changes, attachment path changes, semantic settings changes, and corrupt/unavailable storage remain conservative rebuild cases. An event-only journal cannot detect changes made while Obsidian is closed; the one startup inventory pass is retained for correctness. Repeated checkpoint writes reuse one vault signature while their build's source revision remains current.

A local IndexedDB metadata record holds the last 20 decisions with timestamps, reason codes, and added/removed/modified counts. It never stores note paths or content. `getIndexDiagnostics()` retains the current session history if IndexedDB is unavailable. No IndexedDB store/index or semantic-settings signature changed; no database-version bump or settings migration was required.

A short-lived startup listener fence records changes while the saved graph is loading. Events before the synchronous inventory capture are already covered; events after it remain queued for reactive patching or structural fallback. The event revision is checked again after asynchronous reconciliation so a late change cannot be discarded when the restored graph becomes ready.

## Portable and exact-build verification

- Node 22.22.3 `npm run verify` passed outside the tool sandbox: architecture, restricted core, official Obsidian lint, indexing fixture, 111 aggregate Node tests, seven browser DOM tests, and production TypeScript/build.
- The indexing fixture restores a saved complete graph after one new Markdown source, patches that source, and matches a fresh full graph exactly. It also covers Markdown deletion, attachment fallback, real Obsidian's `/` root identity, and a stale partial checkpoint with a changed completed note plus a newly added note. The checkpoint resumed only unfinished/changed paths and matched a fresh full graph. Startup revision cases cover changes before and after inventory capture, with both fresh and stale generations.
- `npm run verify:obsidian` passed on the named disposable `kplex-test` vault with Obsidian 1.14.2 (installer 1.14.0), macOS 14.5 and 20,015 Markdown files. Installed/built `main.js` SHA-256: `d6b6844d3aeede2da3a3f233a8ac0d9b76caad82383fd3f01dc113d7afbf829a`. The exact-build runner opened a rendered K-Plex view and captured no JavaScript errors. Runner report: `/var/folders/b1/2dys0jfs7bq73whkl2qnyyym0000gn/T/kplex-obsidian-Rd8Vx7/report.json`.
- Native restart probe on that exact build: created one temporary test note after the active generation, confirmed the live index was ready at 20,016 files and the saved generation still predated the note, then disabled/enabled the plugin before the delayed snapshot write. Diagnostics reported `complete-snapshot-stale`, `complete-markdown-delta` with `added: 1`, and `per-file-reconcile-complete` with `added: 1`. It returned to ready at 20,016 files without a `full-rebuild` decision. The probe note was deleted; the vault returned to 20,015 Markdown files and ready status. The renderer was initially hidden and its large hydration stalled until Obsidian was activated; this was excluded from performance timing.

## Failure found during host validation

The first native run incorrectly rejected an otherwise fresh saved graph as `folder-structure-changed` and began a cold build. Its durable diagnostics identified the cause: real Obsidian reports the root `TFolder.path` as `/`, while the persisted graph uses `folder:/`. The fixture had reported an empty root path. The inventory now normalizes only the root's comparison identity and preserves the old signature hash. A `/` root regression case was added; the corrected exact build passed the host runner and restart probe. The first runner's plugin-enable CLI timed out while that avoidable cold build was active, so it is a failed intermediate check, not acceptance evidence.

## Remaining coverage

1. **Physical iOS cold resume:** interrupt a first large build after a checkpoint, edit one completed Markdown note while closed, and reopen. Expect a partial checkpoint restore, the changed source processed again, stable memory, and responsive touch. Desktop Obsidian cannot establish iOS WebView behavior.
2. **Mixed path batch:** rename or move notes while Obsidian is closed and inspect diagnostics on restart. Expect the conservative structural fallback until link-map delta reconciliation is designed and verified for alias/path resolution. This is a known remaining full-build case.

No complete cold-build wall-clock improvement is claimed. The native restart probe establishes avoidance of a full rebuild for one new Markdown path; it does not measure every vault configuration.
