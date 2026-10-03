# SI5 implementation and validation — 2026-10-03

SI4 is finalized at `323b260127e4fb81e1d3697d4ee8b0282f8cdb12` on `indexing-optimization-v2`. All ten original SI4 Delivery 1/2 exits are accepted. The maintainer authorized that commit and SI5 implementation, with Obsidian CLI testing and later manual iOS/Android testing. No push or release was made.

**SI5 remains in progress; the maintainer authorizes an interim SI5a checkpoint commit. This is a candidate report, not SI5 acceptance or readiness for physical-device sign-off.** The five original Delivery 3 boxes remain open. Required desktop consumer coverage and scale measurements must finish before the maintainer's device runs can close the remaining gates. C15–C26 remain paused.

## Implemented behavior

- Durable-source discovery starts before optional graph hydration. A recognized older-policy active graph supplies acceleration only; current requested scopes compile neutral facts. Old-policy partial checkpoints are not resumed as current semantics. Mixed/source-backed graphs cannot overwrite complete acceleration.
- Missing/invalid graph metadata or chunks recover a physical/host-link baseline through the existing collector and source maintenance owner. Physical readiness is separate from complete semantic graph hydration. Source adoption resumes offline/missing work; unavailable storage does not fabricate readiness.
- Requested source-family corruption queues the exact owner through normal source maintenance. A validated replacement automatically retries demanded semantics. Unrelated heads stay unchanged; another independent corruption at the same physical revision remains repairable. Intact neutral/body-v2 input is preferred over a genuine Markdown read/parse miss.
- Production full-graph progress persistence, its timers and the builder's post-commit pause hook are removed. Neutral source heads own progress. Legacy graph checkpoint reading and complete acceleration writing remain. The historical writer lives only in `tests/support/legacyGraphCheckpointWriter.mjs`; no database schema/store or user data is deleted.
- Search preparation uses one monotonic clock for cooperative slicing/cancellation. Unload releases the retired index's graph, search entries, body cache and visual/relation caches without mutating independently held published pages. The retention regression proves ownership release, not a root cause or measured resolution of the native memory issue.

## Exact-build verification

Pinned Node **22.22.2**, installed Obsidian types **1.13.0**, Obsidian **1.14.4** (installer 1.14.0), macOS Darwin **23.5.0**, **Apple M1 / 8 logical CPUs / 8 GiB RAM**.

The full `npm run verify:obsidian` lane passed at 12:28:25–12:38:02 UTC before the unload ownership correction. It includes architecture **7**, core **60**, aggregate Node **133**, UI **7**, portable sources **314**, real Chromium/IndexedDB **181**, strict settings/indexing oracles/timing bounds, zero scanner warnings, actual TypeScript/production build and exact-build native smoke. Its `main.js` hash is `73fbc976803327b74fac4abfde42e269a618320cd6857174103fcc1e14d1a08d`.

After the unload correction, affected checks passed again: strict indexing/settings (24 production settings scenarios), all five restore-watchdog phases plus late completion/rejection/unload, the seven new real-IDB restart/fault cases, the official scanner with zero warnings and the actual build. Exact final-build small-vault staging/render smoke passed with no captured JavaScript errors. The full earlier suite is not mislabeled as a run on the later artifact.

| Final artifact | SHA-256 |
| --- | --- |
| `main.js` | `acc9cda48ec37b16d27994a10c6611a8e71721f9a6745cba222d1c49b968e729` |
| `manifest.json` | `e3bb9a35215af97f6a3394cf7fc8f7d2142bae06de94bb112fef5a05819cda62` |
| `styles.css` | `e9da76ff7840cea44b77912963977f1fe2ab762b69a9853d047712d7b3270494` |

The new browser cases cover changed-policy restart; missing graph, invalid graph metadata, missing graph chunks and offline edit; unavailable storage; and two independent requested-source corruptions with automatic source-local scheduler convergence. Canonical neighborhood/provenance/gates/siblings parity, unchanged valid heads and zero full builds are asserted. A production regression also proves that 620 ingestion commits spanning more than two minutes cause no graph-progress writes.

## Native small-vault acceptance of the implemented paths

The final serial run passed at **13:40:21–13:40:38 UTC** with four Markdown files (two original files plus two owned fixtures), foreground renderer and original background throttling enabled. [Machine-readable results and retained attempts](settings-independent-indexing-si5-native-2026-10-03.json).

| Case | CLI/restart elapsed | Source reads / parses | Result |
| --- | --- | --- | --- |
| Saved ontology, older-policy acceleration | 1,702 ms | 0 / 0 | Current Challenger relationship and write authority; valid heads unchanged. |
| Missing graph acceleration | 1,713 ms | 0 / 0 | Source-backed physical baseline; current requested view and unchanged heads. |
| Corrupt graph metadata | 1,686 ms | 0 / 0 | Same recovery; invalid graph never grants current authority. |
| One missing requested values chunk | 1,621 ms | 0 / 0 | Exactly one owner repaired from compatible body-v2; unrelated head unchanged; automatic current-policy retry. |
| Edit while plugin disabled | 1,711 ms | 1 / 1 | Only the changed source acquired; latest unresolved target appears after reopening. |

All cases record zero measured full builds. Sampled renderer JS heap spans approximately **85–105 MB**. These elapsed values include CLI and polling overhead; they are **not request-to-paint or presentation latency**. Aggregate Vault wrappers can also observe Obsidian's own reads; source-acquisition counters identify K-Plex's work separately.

The driver seeds complete optional acceleration only during small disposable-fixture setup when a preceding fault run left a partial baseline. Warm measurements begin on the newly loaded index. Restart-only large runs never use that fixture-seeding build. Controller lifetime checks, original settings/method/throttling restoration and owned-note cleanup run independently of comparison success.

## Retained failures and limits

- A concurrently run strict URL timing check observed 82.7 ms against the unchanged 50 ms bound. Quiet strict verification subsequently passed. The bound and golden outputs were not relaxed.
- Early browser fixture failures were missing actual Vault lookup/default settings and a nested-script newline error; corrected fixtures pass the seven production real-IDB cases.
- Earlier large runs on `73fbc…` failed with CLI `ETIMEDOUT`. The first two also observed 82/64 source repairs and Markdown reads during adoption; those observations are retained and their cause is not established. A later trial completed one warm restart in **219,539 ms** with zero source reads/parses/acquisitions/full builds, 20,709 hydrated pages and 715,032 evidence declarations, then timed out before completing all three runs. Its sampled renderer JS heap was **2,937,050,500 bytes**, not plugin-only or process/device peak memory.
- On the final `acc9…` build with the deferred driver, reopening the large test vault failed preflight at **13:42:30–13:46:30 UTC**: graph status was ready at 20,015 files but source dependency authority remained pending. It recorded **651 checked/reused bodies, 650 cached resolution refreshes, zero Markdown reads/parses/repairs/failures and zero full builds**. A subsequent aggregate probe observed an advanced global host fence and ongoing inventory with no pending known-source queue, resolver-key backlog or backpressure. No three comparable warm runs completed. This is an unresolved production adoption failure, not a waived CLI-only failure or permission to extend the deadline.
- Repeated small-vault driver attempts exposed setup assumptions: no visible K-Plex view paused graph maintenance, and a source-backed partial baseline correctly refused to save complete acceleration. The driver now opens demand before fixture maintenance and explicitly seeds its small fixture. CLI evaluations also timed out despite later ready-state probes. Deferring asynchronous test work until after the initial CLI response produced the passing five-case run; this does not establish the cause of every historical timeout.
- The earlier SI4 native hydration-watchdog fallback followed by renderer SIGTRAP/EXC_BREAKPOINT remains historical evidence. No out-of-memory cause is established. See the [SI4 acceptance report](settings-independent-indexing-si4-acceptance-2026-10-03.md).

## Cleanup and remaining acceptance

Small-vault cleanup restores and compares **all 14 original IndexedDB stores**, restores the original enabled-plugin list and removes the originally absent K-Plex directory. The vault has its original two Markdown files, no owned fixtures/test controllers and original throttling. The personal brain vault was not modified. Large-vault settings, methods and throttling are restored by each completed driver cleanup; native evidence records any failed attempt separately. The final large preflight failed before installing wrappers/settings/fixtures. Its reopened test window was then closed to stop the heavy test workload, retaining valid completed source progress and the staged final plugin; its original enabled-plugin configuration is preserved.

Remaining desktop work is full body-only virtual/URL search and suggestion vocabulary after graph-cache loss, complete large restart/sync/interruption convergence, storage-degraded native coverage, and the section 12 deterministic dense/high-node/high-degree foreground latency, cancellation, retained-memory/storage measurements and main-window/popout workflows. Current requested neighborhoods are canonical, but that does not establish complete global catalog coverage.

Warm adoption still performs source-local durable host-metadata comparison and local-owner verification across the inventory. The large runs need separate work/timing attribution for those passes and optional graph hydration. Do not describe zero Markdown reads as constant-time startup.

After those desktop gates pass, the maintainer's **physical iPad and Android** interruption/resume, memory and touch tests follow the [device checklist](settings-independent-indexing-si5-device-checklist.md). No device result, timing percentage, finish date, acceptance waiver or SI5 completion is inferred from the current checks.

## SI5a checkpoint follow-up

The final native driver, including the probe/controller cancellation guard, passes all five small-vault cases again on the same `acc9…` production artifact. Original fourteen-store/cache/configuration cleanup passes again. The maintainer authorizes an SI5a implementation checkpoint and continued large-vault convergence work. This records the existing known failures without accepting SI5. Foreground measurements must record visibility/focus throughout; background-throttled intervals are excluded from comparable performance evidence.
