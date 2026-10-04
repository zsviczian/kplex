# SI5 implementation and validation — 2026-10-03

## Revised SI5 scope — maintainer decision, 2026-10-04

The implementation was committed **before instrumentation** as `62c728393440aa3dfb57869ece83c4060092bcba`. Diagnostics/progress and the first warm correction are independently committed at `8cd10b7d6746d607f8214ad192670a0b9a370778`; subsequent corrections are separate checkpoints. No push/release. C15–C26 remain paused.

The active closeout is now **understand warm restart → make progress truthful → propose the smallest evidence-based warm-restart correction → close SI5**. The synthetic ~20,000-contributor hub `decode-budget` rejection is a known stress limit outside the critical path; bounded canonical projections, another indexing architecture and increased memory limits are explicitly deferred. Realistic requested notes have hundreds of links, with roughly a thousand an extreme case. The separately generated high-node stress profile is also outside this bounded investigation.

The maintainer accepts the existing extreme-vault cold behavior for SI5. No more cold-start optimization or three-run cold timing gate is required here. Timestamp clarification: the retained cold report observed 4,969 / 20,015 owners across 111 foreground samples before a **30-second individual CLI command timeout**; it does not establish that 4,969 completed within 30 seconds. Markdown reads/parses/repairs remained zero. This distinction does not change the maintainer's acceptance.

Warm restart remains the measured concern: 72.974 / 74.267 / 77.422 seconds with valid durable sources versus a separate settled explicit restore pilot at 6.018 seconds. Neither the total nor that subtraction establishes a cause. Instrument the actual production phases, owner walks and operations first; report exact results and a minimal proposed correction **before implementing an optimization**. Physical iPad/Android checks remain separate maintainer work after the warm investigation; prior desktop/device evidence is retained without making every historical synthetic gate a new prerequisite.

## Wait attribution measured — 2026-10-04

[Exact wait/phase results and proposed minimal correction](settings-independent-indexing-si5-wait-attribution-2026-10-04.md) follow posting checkpoint **`ea41d4b4484b9957d8700cf44920809912ca1ee4`** on the unchanged `c9cc8a49…` production artifact. Three foreground restarts pass **64.523 / 64.592 / 67.665 seconds**. Host comparison's 20,015 yields total only **0.165 / 0.152 / 0.165 seconds**; observed repository transactions account for **36.776 / 35.870 / 37.344 seconds**. Removing yields is unsupported. All four owner walks and zero source work remain. Detailed disjoint timing, histogram/counter evidence and 18 assertions are in the linked report/JSON. No optimization implemented; the next narrow proposal combines clean dependency selection with fresh head validation within one readonly transaction, preserving repair/overlay/freshness fences. Review before implementation.

The maintainer reported repeated identical cache-check labels in a now-closed production vault; its old in-memory trace cannot be recovered and the cause is unknown. Distinct phase/retry wording is the next separate UX correction. SI5 still awaits physical mobile and final audit; accepted cold and hub limits are unchanged.

## Bounded posting reads implemented and retested — 2026-10-04

Posting batching follows the separate clean checkpoint **`80a14ecaff42daa657c0e86aa04ff4ecd46046fc`**. [Current correction/results](settings-independent-indexing-si5-posting-batching-2026-10-04.md) and [exact evidence](settings-independent-indexing-si5-posting-batching-2026-10-04.json) own the current state. Each existing byte/record-bounded posting batch uses one exact primary-key range read capped at its expected count. Returned count and every posting/digest/frame still validate; head/lease/freshness/cancellation checks, decode limits and yields remain. No schema, architectural, cache, memory-limit or scheduling change.

Three foreground restarts pass **66.170 / 65.324 / 74.123 seconds**, median **66.170 seconds**, versus immediate baseline **82.149 seconds**, observed **15.979 seconds lower**. Sequential series are not randomized paired trials; no exclusive I/O/scheduler cost or pre-implementation speedup is claimed. Posting requests **484,199 point reads → 20,027 bounded range reads**, **464,172 fewer requests**. Host comparison specifically **484,178 → 20,015**. Four complete owner walks, 40,030 dependency checks/clean selections, 80,060 inspections, 100,111 head reads and 20,027 repository yields remain. Zero source/Markdown reads, parses, reacquisitions, repairs, rewrites or full builds.

Host comparison **47.024–56.329 seconds**, reconciliation **9.228–9.701 seconds**, post-requested hydration **6.077 / 7.364 / 6.700 seconds**. Full verify passes **199 browser tests** and actual build; focused posting tests **16/16**. Three new regressions protect bounded contiguous batches/family isolation, holes/malformed rows and head-replacement/cleanup/cancellation during range reads. Foreground **68/68, 67/67, 76/76** samples valid; all **20 evidence assertions**, hash/config/head preservation and controller/owner-set cleanup pass; timed CLI reconnects zero. Candidate measurements form a new independent checkpoint, no push/release.

The exclusive wait cost of the remaining metadata-family yields is still unmeasured; no scheduling correction is implemented. SI5 remains open for physical iPad/Android and final correctness/retirement/settings-route audit. Extreme cold is accepted and 20k hub/high-node redesign stays outside the critical path.

## Previous clean dependency-selection correction — 2026-10-04

The prior diagnostic/progress and owner-loop fix was checkpointed **before the new edit** at **`8cd10b7d6746d607f8214ad192670a0b9a370778`**. [Current correction/results](settings-independent-indexing-si5-clean-selection-2026-10-04.md) and [exact evidence](settings-independent-indexing-si5-clean-selection-2026-10-04.json) record the previous correction. Clean dependency checks reuse one owner/repair/state selection; actual repair and legacy upgrade retain rereads, and current source-head/sequence, cancellation and freshness fences remain. Selections fall **80,060 → 40,030**, clean settlement calls **40,030 → 0**, removing **120,090 IDB reads**. Four whole-owner walks, 40,030 dependency checks, 80,060 inspections and 100,111 head reads remain. Zero source/Markdown I/O, parses, reacquisitions, repairs, rewrites or full builds.

Three foreground runs pass at **82.149 / 81.286 / 84.857 seconds**, median **82.149 seconds**, versus immediate baseline **80.137 seconds**. The observed median is **2.012 seconds higher**; ranges overlap and runs are sequential, so no causal speedup/regression is established. Host comparison still dominates at **64.191–66.057 seconds**. Source reconciliation takes **8.957–9.260 seconds**, post-requested hydration **6.288–8.363 seconds**. Record these changes without attributing them to unmeasured timer, posting-I/O or GC costs. Warm performance is not closed by fewer requests alone.

Full verify passes including **196 browser tests** and actual production build; two new real-IDB regressions protect single clean selection and intervening head replacement. All 18 native/evidence assertions pass, including foreground, unchanged heads/settings/enablement, zero source work, monotonic phase progress and controller/owner-set cleanup. Native disable with CLI enable exposed configured-enabled versus loaded-instance state; matched native lifecycle staging recovered without app/config reset. Timed polling had no lost read. This independently validated change was subsequently committed at `80a14ecaff42daa657c0e86aa04ff4ecd46046fc` before posting batching, with no push/release.

At that checkpoint, posting batching (484,178 host-metadata point reads) and exclusive yield-cost measurement were unimplemented; posting batching is now measured above and scheduling remains unchanged. No architectural, dense-hub, memory-limit or cold-start work is reopened. Physical iPad/Android and final correctness/retirement/settings-route audit remain pending; SI5 remains open.

## Previous owner-loop correction — 2026-10-04

[Correction/results](settings-independent-indexing-si5-minimal-warm-correction-2026-10-04.md) and [exact evidence](settings-independent-indexing-si5-minimal-warm-correction-2026-10-04.json) record the previous checkpoint. Dependency upgrade and host comparison share one traversal/inspection; later freshness reconciliation remains. Four 20,015-owner loops replace five, inspect calls fall from 100,075 to 80,060, head point reads from 120,126 to 100,111. Zero source reads/parses/reacquisitions/repairs/rewrites/full builds. All three foreground runs pass at **80.137 / 83.119 / 78.469 seconds**, median **80.137 seconds**. Earlier three-run median was 82.805 seconds, but ranges overlap and the separate prior pilot was faster; no reliable latency speedup is claimed.

Full verify passes including **194 browser assertions** and production build; new missing-cache legacy/fan-out and cancellation regressions pass. Settings/enablement byte restoration, source-head digests, wrappers/controllers, owner-set release and retained trace checks pass. One lost staging-disable response recovered by inspecting native state with a fresh bounded CLI read; measured restart polling had no read failure. Correction/diagnostics were later committed at `8cd10b7d6746d607f8214ad192670a0b9a370778` before the selection-reuse edit.

Candidates identified at that checkpoint: reuse clean dependency selection (80,060 calls for 40,030 checks); batch 484,178 metadata posting point reads within existing bounded batches; measure the cost of 20,015 metadata-family yields before changing scheduling. The first is implemented and measured in the follow-up above; posting/scheduling candidates remain unimplemented. Preserve current-source/repair/cancellation/lease/byte-budget fences and remeasure one change at a time. Unchanged `file.stat.mtime` already enables physical reuse but cannot by itself authenticate derivative state or other-file resolution changes. Physical iPad/Android and final SI5 audit remain open; no dense-hub/cold redesign is reopened.

## Before-correction warm-start investigation — 2026-10-04

[Exact phase/counter report](settings-independent-indexing-si5-warm-start-2026-10-04.md) and [machine-readable evidence](settings-independent-indexing-si5-warm-start-2026-10-04.json) supersede the unmeasured warm-start attribution below. Final foreground pilot: 77,540.7 ms strict-ready; dependency validation 11,735.0 ms, host comparison 46,244.7 ms, reconciliation 11,709.8 ms. Five loops visit the same 20,015 owners; dependency checks run twice per owner. Snapshot completion after requested semantics is 6,451.7 ms. No source I/O/parsing/repair/rewrite/full build. Full verification and affected final-accessor checks pass.

Progress now names actual source/hydration stages and shows real completed counts/percentages. Plugin memory preserves reports across CLI process exit; polling reconnects after failed reads without cancel/reload or an outer readiness deadline. Proposed next change is merging the existing dependency-upgrade and host-comparison owner loops with shared top-level inspection, preserving actual dependency work and later freshness reconciliation. **Not implemented yet**: maintainer review of measurements/proposal comes first. Physical-device validation and final audit remain pending; the historical projection redesign below is deferred outside SI5.

## Historical assessment — superseded scope, retained evidence

SI4 is finalized at `323b260127e4fb81e1d3697d4ee8b0282f8cdb12` on `indexing-optimization-v2`. All ten original SI4 Delivery 1/2 exits are accepted. The maintainer authorized that commit and SI5 implementation, with Obsidian CLI testing and later manual iOS/Android testing. No push or release was made.

**SI5 remains in progress; the maintainer-authorized SI5a interim is committed at `e50dd521550e09d12de2b155018dce9cb8026201`. SI5b is committed at `7bd14cf` with its known limitations. This is a candidate report, not SI5 acceptance or readiness for physical-device sign-off.** The five original Delivery 3 boxes remain open. Required desktop consumer coverage and scale measurements must finish before the maintainer's device runs can close the remaining gates. C15–C26 remain paused.

## Current progress and next decision

| Work in the existing SI5 finish plan | Current outcome |
| --- | --- |
| Source-first startup and global vocabulary recovery | Implemented; exact production verify and five small native recovery faults pass. |
| Three comparable warm restart samples | Complete: 72.974 / 74.267 / 77.422 s; median 74.267 s. No matched pre-implementation restart baseline. |
| Desktop main/popout | Reference-neighborhood independent centers/current policy/cameras/demand release pass. Other consumer workflows and paint remain open. |
| Dense/high-node work | Native 20k hub repeatedly fails `decode-budget` before publication. Separate 108k-target/259k-occurrence source fixture generated/verified; actual host counts/performance unmeasured. |
| Cold, acquisition/sync interruption and storage | Small/browser recovery coverage passes; large cold CLI observation fails during source authority. Full native interruption/storage and three cold samples remain open. |
| Physical iOS/Android and acceptance audit | Pending desktop readiness; all five aggregate Delivery 3 boxes stay open. |

The next scope decision is the proposed bounded requested-projection correction described at the end
of this report. Source/adoption attribution remains a separate observed bottleneck. No cap, deadline,
golden, schema, device gate or performance failure is waived. Current candidate remains uncommitted.

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

The reviewed large-convergence correction is committed as **SI5b `7bd14cf`**. The known
cold preflight failure and missing third comparable warm result remain explicit; this commit does
not accept SI5. The maintainer also approves source-first startup with global vocabulary recovery.

| Planned work | Status | Next action |
| --- | --- | --- |
| SI4 settings independence and ordinary maintenance | Complete, `323b260` | No further SI4 validation |
| SI5a source-backed startup, selective recovery and writer retirement | Committed, `e50dd52` | Retain existing regression coverage |
| SI5b canonical host reuse and large warm functional convergence | Committed, `7bd14cf` | Keep cold timing failure visible |
| Source-first startup and full virtual/URL search/suggestion recovery | Uncommitted implementation passes full verification and small native faults | Complete exact-build large foreground validation; retain performance limits |
| Desktop startup/sync/interruption/storage/foreground scale acceptance | Incomplete | Exact-build cold run, three comparable warm runs, dense/high-node cases and popout teardown |
| Physical iOS/Android | Pending desktop readiness | Maintainer follows device checklist |
| Final SI5 retirement/evidence audit and acceptance | Pending | Close original five exits only from required results |

This is the existing finish plan. No extra prerequisite checkpoint, percentage or finish date is added.


## Approved source-first startup — implemented candidate, native timing still open

SI5b is committed at `7bd14cf252dd5e61be36e56d369ecd54bf275cdd`. The following approved
startup change is a separate **uncommitted working-tree candidate**, not another accepted SI5 gate.

GraphIndex now keeps the bounded preview visible, waits for neutral-source authority and prepares
available requested current-policy scopes before reading complete snapshot pages/relations/evidence.
A compatible cached graph also stays acceleration for these requested consumers. Complete global
cache search still loads afterward; this first change does **not** remove complete hydration from
global readiness or implement missing-cache body-only virtual/URL search/suggestion recovery.
No new store, catalog, parser, classifier or scheduler is introduced. The existing watchdog retains
its 90-second inactivity bound and advances only from completed source work/compiler continuations.

The first native pilot exposed an early resolver wave cancelling `flush()`. Treating that transient
result as missing authority discarded the available full cache. The correction waits for the existing
source scheduler's readiness callback, with one restore-owned observer cancelled by the existing
watchdog/policy/unload lifetime; it preserves subsequent complete cache loading. Real-browser tests
drive that resolver event without manual reconciliation and cover immediate observer release.

| Candidate | Actual verification |
| --- | --- |
| First ordering build `1e752bc9…` | Full `npm test`: Node 133 / UI 7 / portable sources 314 / real-browser IDB 186; strict indexing/settings and large 20,015-owner exact publication pass. Architecture 7, core 60, zero-warning scanner, actual types/build pass as separate verification commands. |
| Corrected build `0f60a717…` | Affected startup/IDB 14, strict indexing/settings plus seven watchdog phases, architecture and zero-warning scanner pass; actual types/build and exact-build native command/render/error smoke pass. Full suite was not redundantly repeated after this local retry correction. |
| Corrected small native | All five cases pass: policy/cache restarts have zero acquisition counters; source corruption repairs exactly one owner from body-v2 without body reads/parses; offline edit reads/parses exactly one owner. Every case has zero full builds. |

First build SHA-256: `1e752bc983eed4f8366a907e578187f0db4a1224380ac051d18b11619d8e8fa4`.
Corrected SHA-256: `0f60a71706e702464c7d57e2d12ba0e78722ff3b402873d9de99fabc79c12806`.
Manifest/CSS hashes remain unchanged. Aggregate acquisition counters do not count every inventory
head/family visit; zero body IO/writes must not be described as zero startup validation work.

Both large attempts remain failures in the existing machine-readable evidence. First build misses
the unchanged 240-second preflight after 17,251 checked owners, with zero reads/parses/repairs/
resolution writes/failures/full builds. All 241 foreground samples pass; sampled renderer JS heap
peaks at 1,482,723,839 bytes. Its early transient fallback is the corrected defect above. Corrected
build stops on a 30-second CLI `eval` timeout; all 41 samples are unfocused and timing is excluded.
That is neither a passing cold measurement nor a proved crash/memory diagnosis. A later serial probe
finds corrected source authority ready, all 20,015 owners checked/reused, complete acceleration
(20,709 pages / 715,032 declarations), one current requested publication with 12 dependency visits,
no readiness observer/inventory and zero reads/parses/rewrites/full builds. Its hydration diagnostic
span is 275,596 ms, not a comparable foreground startup/paint measurement. Functional convergence
is established; cold/three-comparable-warm timing acceptance is not. Old SI5b warm timings cannot
be combined with a different build to satisfy that requirement.

Development failures are retained: the sandbox initially denied the browser localhost listener; two
new fixtures initially omitted their injected assertion helper; a strict URL-heavy 51.9 ms timer
assertion failed while checks overlapped. Required access/fixture corrections and serial reruns pass
with unchanged thresholds. No golden, deadline, cap or memory allowance changed.

Cleanup passes: all fourteen original small stores/config restored and compared, temporary plugin
and fixtures/controllers removed, two original files and original throttling. Large is source-ready
with complete acceleration, 20,015 original files, no fixtures/controllers/waiter, original throttling;
its test window is closed and verified build/valid progress retained. Personal vault untouched.

**Proceed:** finish global neutral-fact search/suggestion recovery and the associated consumer
readiness split, then validate exact-build cold and three comparable warm runs, acquisition/sync
interruption/storage failure, dense/high-node foreground latency/memory and main-window/popout
teardown. The maintainer's physical iOS/Android tests follow desktop readiness. Final retirement/
evidence audit closes the original five SI5 exits only when all required outcomes pass.


## Global node recovery candidate — exact build `9c9a2545…`

The maintainer asks to continue the plan without committing. This uncommitted candidate extends the
existing canonical compiler with an explicit node projection. It restores global body-only virtual/URL
nodes, first meaningful URL labels, aliases, tags, inline type/style facets and suggestions after optional
graph-cache loss. It retains no global relationship evidence. Physical preview, requested semantic
readiness and complete search vocabulary remain distinct; only complete, current node metadata/search
publishes atomically. No new storage schema/catalog/journal/parser/classifier or scheduler is introduced.

Normal edits preserve shared URL labels and lifetime through the existing local contributor/compiler
owners. A byte-bounded changed-owner backlog supplies conservative old synthetic endpoint candidates;
its exact borrowed membership retires with synchronous publication. Rename/deletion masks source
readers immediately and captures old candidates privately under the existing tombstone writer pin.
Corrupt/oversized retired incidence remains pending and requests exceptional node-only recovery.
Policy, source, physical/host, publication, generation and restore-run cancellation fences reject late
private work. The restore watchdog keeps its original inactivity deadline.

`main.js` is `9c9a2545a0b1bc2ba4c97bb4502fc3ad88966907bcbaf5feb77378b01ad239c3`;
manifest/CSS hashes are unchanged. Node 22.22.2 `npm run verify` passes: architecture 7, core 62,
strict indexing/settings (24 settings scenarios and seven existing watchdog phases), Node 135, UI 7,
portable sources 317, real Chromium/IndexedDB 192, actual installed Obsidian types and production
build. A local restore-run fence was added during the long full run; the final browser policy/restore
terminal-rejection cases and actual final types/build pass afterward, with the scanner rechecked
with zero warnings. Focused retirement regressions pass 26/26. Required goldens, caps and deadlines
are unchanged. The exact machine evidence retains failed development/staging attempts.

The 20,015-owner browser regression publishes once with exact semantic/provenance, gates, siblings,
degrees and no body I/O; cancellation takes two yields. Cached publication is 240,773.3 ms,
sampled peak JS heap 537,621,630 bytes, combined reservation peak 719,667,320 bytes. This is
supported completion, not native paint latency or device peak memory acceptance.

Exact native smoke passes. All five small native scenarios pass: changed saved ontology, missing
and corrupt optional graph acceleration, one damaged source and offline edit. Missing/corrupt graph
cases also assert a remote alias, body-only URL/virtual target and inline type suggestion outside
requested scopes. Valid source heads remain unchanged; acquisition counters are zero except the
single damaged owner (legacy body reuse, no Vault parse) and offline owner (one read/parse).
Native renderer-related Markdown reads are reported separately and are not claimed as zero.
Cleanup restores/compares all fourteen original stores/configuration, removes the originally absent
temporary plugin and all fixtures/controllers, retains two original Markdown files and original throttling.

The new large native cold preflight fails the unchanged 240-second readiness bound at 18,881 checked
owners, zero body I/O, source repairs/resolution rewrites/full builds, and sampled peak JS heap
867,676,745 bytes. All 241 samples are document/window-unfocused (visible, original throttling true),
so this run is **excluded from comparable performance evidence**. No warm run starts. A later probe
finds all 20,015 sources ready, 20,709 pages and 715,032 evidence declarations hydrated, current
requested publication (12 dependency visits), and zero body I/O/resolution rewrites/full builds.
This is eventual functional convergence, not a cold timing pass.

Native CLI application/window focus calls did not activate the window. Computer-use fallback is
blocked by pending macOS Accessibility and Screen Recording permissions. The immediate manual
step is to bring **kplex-test** Obsidian to the foreground and keep it active while exact-build cold
and three comparable warm measurements run. No further security permission is necessary if the
maintainer activates the window manually. If a comparable cold failure survives the consolidated
source-first correction, the design's repeated-blocker rule requires a concrete alternative/cost
report before further work on that assumption.

Large settings and enabled-plugin files compare byte-for-byte with their backups. All 20,015 original
Markdown files remain; no test fixtures/controllers, inventory or readiness observer remains, and
original throttling is true. The verified build and valid source progress remain installed; the test
window is left open for manual foreground activation. Personal vault is untouched.

The original SI5 exits remain open. Main-window/popout scale, interrupted acquisition/sync and physical
iOS/Android coverage remain required before acceptance; physical testing is not yet requested.


## Timing baseline and resumed foreground runs

The maintainer closes excalidraw-test and foregrounds kplex-test. Native checks confirm document/window
focus true, visibility and original throttling before the new serial run. Two exact `9c9a2545…` warm
restarts pass at **72,974 ms** and **74,267 ms**. All 73/75 respective foreground samples are valid;
selected-head digests are unchanged, body acquisition/parser/resolution writes/full builds are zero,
the center renders, and full acceleration hydrates. Sampled renderer heap peaks are 942,614,130 and
974,579,133 bytes, not process/device peak memory.

The third run reaches the existing 240-second readiness timeout after Obsidian becomes hidden and
unfocused: 62 hidden and 63 unfocused samples out of 123; original throttling remains enabled. It is
excluded. Source authority and the current requested publication are already ready with zero source
work/full builds. A post-driver probe sees optional hydration still in preview-search, 20,709 pages/
relations and zero evidence loaded. That location is observed; the hidden interval prevents causal
latency attribution. The driver restores settings/methods/throttle and removes controllers. No third
comparable result or three-run median is claimed. Bring the window back to foreground for one
replacement run; the existing one-run replacement option preserves the first two valid results.

There is **no matched pre-implementation full-restart baseline** for this procedure. The historical
[C08P warm restore report](C08P-2026-09-26.md) measures three explicit snapshot restores after startup
has settled: accepted HEAD `04f04eb` is **6.569 / 5.801 / 4.735 seconds**, median **5.801 seconds**;
the accepted C08P final build is **6.159 / 5.745 / 5.487 seconds**, median **5.745 seconds**. Those
measure the restore call through full hydration, not plugin/app restart, neutral-source authority or
first paint. They also use Obsidian 1.14.2 and the earlier 20,013-file/20,701-node fixture, rather than
the present 1.14.4 / 20,015-file/20,709-node state. These values are historical references, not
interchangeable with the SI5 restart timings.

The nearest same-procedure implementation reference is SI5b's two valid foreground restarts,
**90.475 / 90.902 seconds**. SI5b already contains indexing-independence implementation, so it is
not a pre-implementation baseline; its third comparable sample is also absent. No speedup percentage
or performance acceptance is inferred. Next separate source/requested/presentation/hydration work
and cold versus warm readiness. If a pre-implementation A/B claim is needed, replay a matched
procedure/settings/fixture on an isolated legacy-compatible cache instead of using the current DB
with an older binary or treating the historical 5.8-second number as full startup.


## Three foreground warm runs complete; explicit restore attributed

The replacement warm restart passes on exact `9c9a2545…` at **77,422 ms**, with all 77 foreground
samples valid. Together with 72,974 and 74,267 ms, the three same-build samples have a **74,267 ms
median / 77,422 ms maximum**. Each preserves selected-head digests and performs zero source body
reads/parses/acquisitions, resolution rewrites or full builds. Maximum sampled renderer heap across
the three is **980,683,923 bytes**; this remains renderer sampling, not process/device peak memory.
The excluded hidden third attempt remains recorded. This closes the three warm sample requirement,
not all SI5 performance acceptance.

A separate foreground explicit snapshot restore after settled startup passes at **6,018 ms**, with
all seven focus samples valid. Inclusive wrappers attribute 2,723 ms to page/relation cursor calls,
2,945 ms to evidence, 235 ms to presentation preparation, 4.2 ms to 14 cached body requests and
0.5 ms to source flush. Overlapping calls must not be summed as wall-clock work. Source acquisition,
parser, resolution rewriting and full builds remain zero. This one-run pilot is close to the
historical explicit-restore reference; it does not provide a matched three-run A/B or explain
all restart time.

The first cold attribution attempt fails during harness setup because the native `eval` command has
not registered 200 ms after app reload. No timing wrappers/controller are installed and no cold
performance result is claimed. The temporary probe now retries that specific registration failure
for at most 15 seconds within the original absolute 240-second deadline. Later source authority and
full hydration settle with all 20,015 valid owners and no body IO; unobserved foreground conditions
exclude that elapsed duration. CLI activation still cannot consistently establish focus; independent
desktop functional checks continue rather than waiting for activation. No production change, commit,
push, deadline/cap adjustment or device-readiness claim is added by these probes.


## Desktop independent views pass; dense-hub rejection remains

Native main-window/popout functional checks on the exact candidate pass with separate owning
Documents, independent centers, both requested demands and three current-policy scope publications.
An inference change preserves both cameras and centers; source reads/parses/repairs and full builds
remain zero. Closing the popout releases only its demand and retains the main center/demand. Settings,
zoom, temporary controller and owned popout are cleaned up; original throttling remains enabled.
This does not cover settings-popout interaction, hidden-view navigation, folds, relationship edits,
actual paint latency or physical devices.

The initial second-center choice selects a real scale hub. Its requested neighborhood repeatedly
rejects with **`decode-budget`** and no publication. A separate existing-method attribution reproduces
that rejection **inside requested-neighborhood preparation, before candidate-degree or URL-title
preparation**, with zero body IO/parser/repair/resolution/full-build work. The 68.772-second diagnostic
interval is unfocused and is not performance evidence. The driver itself completes successfully as
an attribution probe; the hub **product workflow fails**. Settings/source authority and the original
main view remain ready after demand cleanup. The automated 20,015-owner completion result does not
waive this different native fixture rejection. The narrower reference-neighborhood two-window test
passes; retained setup/timeout attempts remain in machine-readable evidence.

A separate deterministic high-node fixture generator now supplies the required source-input profile:
20,000 real notes, 80,000 body-linked placeholder targets, 8,000 URLs, 259,000 link occurrences,
160 dormant property names and 19,999 hub contributors. Focused fixture tests pass **3/3**, checking
repeatable content identity, inventory/manifest corruption, changed bytes and refusal to overwrite.
Actual host node/evidence counts and native foreground latency/memory remain unmeasured. The
existing 20k/large-file timings stay tied to their original fixture and build.


## Cold foreground attempt and required correction decision

With actual foreground verified, the revised cold probe retries one native command-registration
miss and then runs with **111 valid focus samples**, normal background throttling and temporary
`caffeinate -d -i` assertions limited to the child process. It fails on the unchanged **30-second
CLI command timeout** while source authority is still pending: 4,969 owners checked/reused, zero
body reads/parses/repairs/resolution rewrites/full builds, no full optional pages/evidence loaded.
The wrappers/controller are restored/removed. The existing 240-second readiness limit is unchanged;
this early harness failure is not a four-minute readiness pass or an automatically waived host fault.

A later aggregate observation finds all 20,015 sources ready, no inventory/scope tasks/controllers,
20,709 pages and 715,032 evidence, with zero body work. Hydration's recorded start→complete phase
stamp difference is **259,523 ms**, but the continuous focus trace ended at the CLI failure, so this
is later convergence evidence rather than a comparable accepted cold timing. Source/requested
readiness already precedes optional hydration in production; the observed delay is in source
authority/host startup, not the separately measured six-second warm full snapshot restore. The
relative contributions of Obsidian startup, source validation, storage and synchronous work still
require attribution. Original settings/enablement remain byte-identical; no caps are raised.

The hub failure is independently reproduced after successful direct discovery of **20,000 source
owners and four host facts**. Canonical neighborhood preparation rejects with `decode-budget` before
publishing and before degree/URL-title work. This repeats the original scale/retained-state blocker
on the actual native fixture despite the prior consolidated continuation/memory correction. Per the
[design's repeated-blocker rule](../INDEX_SETTINGS_INDEPENDENCE_DESIGN.md#transparent-progress-and-cost-control),
report an alternative instead of assigning another cap/codec adjustment on the same assumption.

**Historical proposal — withdrawn from the SI5 critical path by the maintainer on 2026-10-04; do not implement for this closeout.** The bounded warm report above owns the active next step.

**Former recommended next delivery:** change the existing requested-consumer path to bounded canonical
projections: retain exact center incidence, compact parent/sibling/degree accumulation, and pair-local
provenance through existing readers, without retaining a complete over-cover graph for every
contributor. Preserve canonical classification, source multiplicity, exact counts, shared lifetime,
current-policy edit checks and all terminal publication fences. The tradeoff is a changed requested
consumer contract and potentially more streamed reads; this needs one integrated implementation and
native review, including this actual 715,032-declaration hub and the verified high-node fixture.
No separate parser/classifier/catalog/journal, new schema or higher time/memory cap is proposed.
Attribute/batch existing source adoption independently; do not assume projections fix cold authority.
This proposal is **not implemented** and needs the maintainer's scope decision before replacing the
current full-compilation contract. Physical iOS/Android remains premature.

The high-node fixture is now generated and every file byte/inventory/manifest verified at 20,000
files, 8,831,230 Markdown bytes and content SHA-256
`50b8cb12ef83c3cd62f1605390fe6ff793079a9f6e37e471e59d0060cf287cd0`.
No files were added to either running test vault. Focused generator checks pass 3/3; the previously
recorded full runtime verification belongs to the unchanged production source/artifact, before this
new tooling-only addition. No new whole-working-tree aggregate verify run is claimed.
