# SI3 neutral source repository acceptance — 2026-09-29

**Accepted on `indexing-optimization-v2`**, reviewed from `a9a335a` with the offline SI3 return uncommitted. This checkpoint adds version-5 per-source facts and atomic heads. Ontology and image-policy changes still use the old complete semantic rebuild; demand-driven settings interpretation is SI4, and physical-device/performance acceptance is SI5.

## Review corrections

- Fixed official lint failures in the new repository's decoded-record, eviction and IndexedDB-error paths.
- A bounded storage-degraded cache could evict an unsaved replacement and expose the older disk head. Unsaved source IDs now mask that head; an unavailable catalog reports incomplete queries. A real-Chrome fault test proves selective reacquisition after eviction.
- Initial native migration timed out because the full graph builder awaited per-note source activation. Bounded staging now combines small family chunks into one transaction, while activation retains its separate atomic head transaction. The complete semantic builder leaves persistence to independent inventory. It uses batched body-v2 lookup first and reads neutral bodies only for legacy misses. Full rebuilds pause background inventory until publication/cancellation; incremental patches still acquire before semantic no-op suppression.
- Removed an unrelated fixture PNG replacement from the return. Corrected the repository contract where it had described writer leases and preactivation full readback that the reviewed code no longer uses.

## Automated evidence

Pinned Node **22.22.3** and installed dependencies: `npm run verify` passed on the final source through the strict native runner. This included seven architecture tests (**59 roots, 106 reachable files, zero violations**), 60 core tests, official Obsidian lint, 133 aggregate Node tests, seven UI browser tests, 15 focused source tests, nine real-Chrome IndexedDB scenarios and the actual Obsidian-typings production build. `git diff --check` passed. Browser tests used `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`; the source suite uses a real Chromium IndexedDB, including v4→v5 upgrade, restart, corruption/repair, cross-connection CAS/pins, quota/abort/cancellation, bounded storage fallback and newer-DB refusal.

The first exact-build native attempt after removing awaited activation still failed at the runner's 120-second imported-settings reconciliation limit; its cleanup CLI also timed out under contention. That run is **not credited**. The subsequent body-cache ordering and inventory-pause corrections were rerun through the complete gate. The test-owned migration notes/controller/settings were cleaned before the next attempt.

## Exact native evidence

`npm run verify:obsidian:migration` **passed** in Obsidian **1.14.3** (`kplex-test`, 20,015 Markdown files). It checked installable artifacts, command/render/error smoke, legacy import and persisted styles, note indexing/search, rendered node/link styles, plugin reload and cleanup. The report recorded `settingsRestored`, `notesRemoved`, `controllerRemoved` and `indexSettled` as true. Source and installed `main.js` SHA-256: `87eff2ac18117d9ce7e9726bc3e0726f5b1cbe1fc977ce4696173f3ad00af48e`; manifest: `e3bb9a35215af97f6a3394cf7fc8f7d2142bae06de94bb112fef5a05819cda62`; stylesheet: `e9da76ff7840cea44b77912963977f1fe2ab762b69a9853d047712d7b3270494`.

The installed source inventory reported storage `available`, database version 5, 501 checked/activated observations, 501 reused bodies, zero Vault reads, zero parses and zero failures while the graph was ready. A single owned temporary note then appeared in the graph and advanced acquisition with one Vault read and parse. After plugin reload it remained visible; the new session reported 75 checked/reused bodies with **zero Vault reads and zero parses**. The note was removed. The vault returned to **20,015/20,015 ready**, with no migration or probe notes and no captured JavaScript errors.

## Limits and manual priority

SI3 source persistence is independent of K-Plex ontology/presentation settings, but the product still performs a complete derived graph rebuild for some settings changes. No settings-change latency claim is made. The 16 MiB unsaved memory bound may force selective reacquisition after extended storage failure; orphan staging/crash reader leases may remain until a later reclamation policy; unobserved equal-stat edits cannot be detected without reading content. Background inventory throughput and peak memory on large physical devices are not established by the desktop probe.

**No maintainer manual test blocks this SI3 commit.** The highest-priority later release gate is a physical iPad/Android large-vault interruption and reopen test while source inventory is active, checking retained activated progress, responsiveness and memory. SI5 owns that test alongside whole-vault throughput. This checkpoint does not authorize merge or release of the complete settings-independence redesign.
