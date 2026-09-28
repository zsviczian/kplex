# Issue #2 indexing performance validation — 2026-09-28

## Scope and environment

- Disposable named vault: `kplex-test`, with 20,015 Markdown files including the existing Synthetic-Scale-v2 fixture. Tests used Obsidian CLI against that explicit vault on macOS with Obsidian 1.14.2 and Node 22.22.3.
- The issue describes creating an empty note, pasting 8,246 words (44,369 characters), and an Obsidian freeze while K-Plex is enabled. The CLI reproduction created an empty note and used `Vault.modify()` with generated text of exactly those counts. This exercises the real Obsidian vault/metadata and K-Plex index paths; it does not synthesize an editor clipboard event.
- Test-only method wrappers counted full builds and per-file patches. They were restored in `finally`. Temporary probe notes and unreferenced graph placeholders were removed. A test-only IndexedDB complete-cache pointer was backed up before the controlled checkpoint/reload experiment, then restored; the temporary checkpoint pointer and backup record were removed.

## Before and after: one large paste

| Live observation, visible K-Plex | Previously installed build | Candidate build |
| --- | ---: | ---: |
| Empty note creation | 97 ms | 113 ms |
| `Vault.modify()` completed after start | 126 ms | 146 ms |
| Saved characters / words | 44,369 / 8,246 | 44,369 / 8,246 |
| Full builds caused by note creation | at least one, observed `building=true` | zero |
| Per-file patches counted | not instrumented | one |
| Index after 4.5 seconds | still updating; backlog contained `vault:create` | ready; 20,016 of 20,016 Markdown files indexed |
| Largest interval gap during the 4.5-second renderer sample | 106 ms | 120 ms |

The interval samples include Obsidian and CLI activity, and their small difference does not establish a rendering-speed gain. The material improvement is removal of a full 20,000-file rebuild for a single newly created Markdown note. The file content survived the save in both probes; the reported empty-note loss after a real editor freeze was not reproduced by `Vault.modify()`.

## Interrupted large-vault checkpoint

- A complete 20,015-file graph snapshot write took 37.2 seconds. A controlled cold progressive pass was cancelled after 100 per-file commits; the center seed brought the completed count to 101. The partial graph contained the full structural baseline and 463,688 evidence declarations. Writing its separate checkpoint took 31.0 seconds.
- With the complete-cache pointer temporarily removed, plugin reload restored the checkpoint non-authoritatively, reported 101 completed Markdown files, and continued indexing from that state. Index progress reached 234 files shortly after restore. The automatic checkpoint advanced durable progress to 774 files. The controlled run was stopped at 1,293 indexed files.
- The saved complete-cache pointer was restored and the plugin reloaded. Final authoritative warm state was 20,703 nodes, 715,032 evidence declarations, 20,015 indexed Markdown files, with ready status. The renderer was occluded during the final warm restore; background throttling was temporarily disabled solely to finish that cleanup check and then restored to its original `true` value. That cleanup duration is not performance evidence.
- Because a checkpoint serializes the entire current graph, the first write now waits two minutes of ingestion and later intervals grow to four and five minutes. No IndexedDB store/index or persisted semantic format changed; the new metadata key is separate from the complete active generation.

## Automated and host checks

- `npm run verify` passed on Node 22.22.3: architecture/core contracts, official Obsidian lint, indexing fixtures, browser DOM tests and the real production build.
- `npm run verify:obsidian` passed its exact-build deployment/render/no-captured-error smoke check on `kplex-test`. The indexing fixture now covers a real partial graph restore and completion against the uninterrupted golden graph, a new Markdown path arriving during another patch, and the reported paste dimensions.
- Final exact-build report: Git base `ec8d2541e7ffd97c82fceaa56e68071d57bc6d7f` with uncommitted changes; installed and built `main.js` SHA-256 `d064fbaa0a2dc1e4a93b78ee865b160f0c1ea5f0c8788e0f93170e25b4d5b12f`. `manifest.json` and `styles.css` matched their built hashes. The runner found a rendered K-Plex view and no captured JavaScript errors.
- On that exact final build, the K-Plex tab remained mounted but hidden behind `Welcome.md`. Creating and saving another 44,369-character/8,246-word note performed **zero full builds and zero patches while hidden**. Revealing K-Plex completed **one patch, zero full builds** and reached ready status in **97 ms**; `Vault.read()` confirmed the full content. The test note and its unreferenced graph placeholder were removed.
- `npm run fixture:large -- --verify .../Synthetic-Scale-v2` could not verify the generator inventory because that folder already contains one extra `ExcalidrawNote.md` outside the generated manifest. It was left untouched. Runtime file/index/evidence counts and the test-owned probe paths were checked separately; the fixture's full content hash is not claimed reverified in this run.
- The controlled checkpoint/restart and detailed visible/hidden paste probes ran on the preceding candidate bundle, before a seed-center publication fix and a guard against writing a checkpoint within 500 files of completion. The final exact build passed the portable checkpoint-resume regression (including an unfinished new center) and Obsidian deployment smoke test. Its full 20,000-file interrupted run was not repeated.

## Limits and prioritized manual checks

1. **Desktop editor paste:** In the named disposable vault, paste comparable text through Obsidian's actual editor into a new note with K-Plex visible, then hidden. Confirm input stays responsive, the note saves fully, and reopening K-Plex shows the note. CLI `Vault.modify()` cannot prove clipboard/editor behavior.
2. **Physical iOS cold start:** Interrupt a first-ever large-vault build after a checkpoint, restart, and verify resumed progress, memory stability and responsive touch. Desktop CLI and emulation cannot establish WebView memory or touch behavior.

No claim is made for a complete cold-build wall-clock speedup; the controlled run was deliberately stopped after verifying checkpoint restore and further durable progress.
