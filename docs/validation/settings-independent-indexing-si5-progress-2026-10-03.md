# SI5 implementation and validation — 2026-10-03

SI4 is finalized at `323b260127e4fb81e1d3697d4ee8b0282f8cdb12` on `indexing-optimization-v2`. All ten original SI4 Delivery 1/2 exits are accepted. The maintainer authorized that commit and SI5 implementation, with Obsidian CLI testing and later manual iOS/Android testing. No push or release was made.

**SI5 remains in progress; the maintainer-authorized SI5a interim is committed at `e50dd521550e09d12de2b155018dce9cb8026201`. This is a candidate report, not SI5 acceptance or readiness for physical-device sign-off.** The five original Delivery 3 boxes remain open. Required desktop consumer coverage and scale measurements must finish before the maintainer's device runs can close the remaining gates. C15–C26 remain paused.

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

| SI5a artifact | SHA-256 |
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


## Large-vault convergence correction after SI5a

The SI5a checkpoint is committed; the following correction is a separate working-tree candidate.
No push/release or acceptance of the five SI5 exits is implied.

Aggregate attribution on `acc9…` found source replacement taking 136,881 ms of 145,151 ms measured
acquisition time over 592 observed owners. Those samples were unfocused and establish where work
accumulates, not comparable foreground latency. A global startup host fence forced unchanged owners
through resolution persistence, including local-dependency staging/repair and retirement work.

The correction retains the host fence and compares the canonical resolver/Date producer with a
validated selected resolution family. Equal output keeps exact durable heads. Head-only inspection
avoids reader-lease writes; restart metadata is validated once; elapsed inventory budgets replace
per-owner timer yields. Exact-head body selections and already owned parser inputs remove repeated
body decoding/family reads. Actual changed bindings still replace their source. No store/schema,
parser, relationship classifier, readiness deadline or memory allowance is changed.

An intermediate `42404f29…` build reached all 20,015 owners with zero Markdown reads/parses,
repairs, failures or resolution rewrites. It was still pending at 272,943 ms from trace attachment
and was observed ready with no inventory at 386,735 ms. This fails the existing four-minute
preflight bound. It is diagnostic evidence only: six sampled intervals lost window focus, browser
regressions overlapped part of the run, and bounded sampling ended before the final ready observation.
The subsequent exact-head read reduction is included in final candidate
`6b77bbc320c62f46d8a5116e0e58f8724d8a7c60a9b4c39e12bbb67ae4611bba`.

Required automated checks pass on that candidate: architecture 7, core 60, aggregate Node 133,
UI 7, portable sources 314, real Chromium/IndexedDB 184, strict indexing/settings checks, zero
scanner warnings and actual types/production build. The 20,015-owner publication regression still
passes canonical gates/siblings/degrees/search/provenance and cancellation with no IO. New cases
prove unknown restart waves preserve identical heads, a genuinely changed target updates only its
source, digest equality is bounded and chunk independent, cancellation/replacement/corruption cannot
authenticate equality, read-only head inspection writes no leases, and body validation cannot be reused
across a selected-head change. Exact-build cold foreground preflight still fails at its unchanged four-minute bound: 18,053
owners are validated, with zero reads/parses/repairs/resolution writes/failures/full builds. All 240
samples are visible and document/window focused with original throttling. Sampled renderer JS heap
peaks at 2,206,694,546 bytes; this is not plugin-only/process peak. A later serial probe finds all
20,015 complete, source authority ready, no inventory/backlog/backpressure and no test controllers.

Three warm functional restarts pass with all heads unchanged, zero source work or full builds,
rendered center, complete 20,709-page / 715,032-evidence acceleration, and restored settings/throttling.
Warm-1 (79,364 ms) loses focus and is excluded. Warm-2 (90,475 ms) and warm-3 (90,902 ms) pass all
foreground samples. A one-run replacement (93,553 ms) also loses focus/visibility and is excluded;
three comparable timing runs are not yet established. These remain CLI/readiness timings, not paint.

The cold-start blocker survives the consolidated correction. Do not continue deadline/cap tweaking.
The smallest proposed next change is to prioritize source authority/requested publication before eager
whole-graph/evidence hydration, retaining existing preview/fallback owners and loading optional
acceleration afterward. This is a scheduling proposal, not a proved latency fix. It may reduce storage
contention and live graph retention, but delays complete global search vocabulary; the pending neutral
body-only catalog work must cover that workflow explicitly. It preserves the uncertainty fence and
requires changed-policy/cache-fault/interruption regressions plus a new foreground cold check.
No second contributor catalog, source journal, parser or relationship classifier is proposed.


Final exact-build small native faults pass again on `6b77…`: saved-policy restart 1,701 ms, graph loss
1,786 ms, invalid graph 1,684 ms, one damaged source 1,612 ms and offline edit 1,696 ms. All use zero
full builds. Source damage repairs exactly one owner from body-v2 with zero Markdown reads/parses;
offline edit reads/parses only its owner once. Exact-build command/render/error smoke passes, reusing
the separately completed unchanged full verification rather than repeating it. All fourteen original
small stores are restored and compared again, configuration restored, temporary plugin removed, two
original notes and no fixtures/controllers. The large window is closed after confirming source readiness,
20,015 original Markdown files, zero source/build work in its final warm instance, no fixtures/controllers
and original throttling. Original enablement and valid progress remain; personal vault untouched.

No additional maintainer manual test is needed to review this correction. Resolve the cold-start
scheduling/consumer tradeoff before desktop timing/sync/popout coverage; physical iOS/Android remains
with the maintainer after desktop readiness. Only two warm timing runs are comparable so far; the
excluded replacement is retained, and one further foreground run is pending cooperation/environment.


## Maintainer-approved progress and next steps

The reviewed large-convergence correction is authorized for an **SI5b interim commit**. The known
cold preflight failure and missing third comparable warm result remain explicit; this commit does
not accept SI5. The maintainer also approves source-first startup with global vocabulary recovery.

| Planned work | Status | Next action |
| --- | --- | --- |
| SI4 settings independence and ordinary maintenance | Complete, `323b260` | No further SI4 validation |
| SI5a source-backed startup, selective recovery and writer retirement | Committed, `e50dd52` | Retain existing regression coverage |
| SI5b canonical host reuse and large warm functional convergence | Reviewed; interim commit authorized | Keep cold timing failure visible |
| Source-first startup and full virtual/URL search/suggestion recovery | Approved, starting | Reuse existing owners; validate cancellation and consumer parity |
| Desktop startup/sync/interruption/storage/foreground scale acceptance | Incomplete | Exact-build cold run, three comparable warm runs, dense/high-node cases and popout teardown |
| Physical iOS/Android | Pending desktop readiness | Maintainer follows device checklist |
| Final SI5 retirement/evidence audit and acceptance | Pending | Close original five exits only from required results |

This is the existing finish plan. No extra prerequisite checkpoint, percentage or finish date is added.
