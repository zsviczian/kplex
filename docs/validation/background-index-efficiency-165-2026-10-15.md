# Background indexing efficiency — PR #165

Ship the duplicate-read correction and truthful progress reporting. **Defer the optional receipt.**
Its correctness failures, whole-vault size exclusion and loss of eligibility after edits decide that
outcome independently of timings. Keep this PR draft for maintainer review; do not merge or release.

## Delivered behavior

- During an uncertain resolver wave, authenticate the selected resolution family once in its existing
  canonical comparison. Body/metadata integrity, exact source selection, physical identity, host and
  policy fences remain. Changed selections, optional alias maintenance and uncertain/corrupt data
  retain conservative validation. No durable format, schema, cache purge or scheduling change.
- Continue existing source progress notifications after graph hydration. Compilation, saving, URL
  work and local readiness keep their established precedence. Five fixed-size aggregate counters
  distinguish inventory/build/catalog starts from successfully activated saves through unload.

The correction is independently reviewable at `d0d16fb`. M is merged main `8df393a` (#163);
measured A contains the correction plus progress/reporting. Native measurements do not isolate
reporting's CPU cost from the duplicate-read correction. With explicit maintainer approval,
`9af675e` subsequently integrates main `b29833c` (#168) into this draft branch. The PR-specific
runtime changes remain limited to the same six files; upstream drawing behavior is preserved.
Measurements remain bound to the frozen #163 M/A builds, not the later combined tree.

## Resource results

Three valid observations per arm, through genuine drain **plus 610 seconds quiet**:

| Observation | Renderer CPU s | Transactions | Requests | Observed drain s |
| --- | ---: | ---: | ---: | ---: |
| A1 | 337.078 | 437,355 | 1,000,806 | 1025.877 |
| M1 | 374.500 | 457,395 | 1,040,902 | 1027.176 |
| M2 | 313.750 | 452,316 | 1,012,121 | 1006.515 |
| A2 (replacement) | 321.047 | 425,738 | 948,221 | 1067.599 |
| A3 | 315.734 | 437,882 | 1,001,890 | 1068.155 |
| M3 | 316.015 | 456,319 | 1,038,747 | 1083.841 |

| Median resource/work | M | A | Observed change |
| --- | ---: | ---: | ---: |
| IDB transactions | 456,319 | 437,355 | -4.2% |
| IDB requests | 1,038,747 | 1,000,806 | -3.7% |
| Read-write transactions | 186,147 | 186,594 | +0.2% |
| Source chunk reads | 123,333 | 103,256 | -16.3% |
| Source digest calls | 450,351 | 390,120 | -13.4% |
| Source hash-input UTF16 units | 829,613,548 | 656,378,120 | -20.9% |
| Inclusive renderer CPU s | 316.015 | 321.047 | +1.6% |
| Observed drain s | 1,027.176 | 1,067.599 | +3.9% |

This proves **less read/authentication/hash work**, not a native CPU/startup speedup. CPU median is
1.6% higher and drain 3.9% longer; pair directions differ and ranges overlap (CPU M 313.750–374.500s,
A 315.734–337.078s; drain M 1,006.515–1,083.841s, A 1,025.877–1,068.155s). Three observations,
nonadjacent replacement, host-order variation and unisolated reporting/probe cost limit attribution.
Read-write transactions do not decrease (+0.24% observed median), and every arm still performs one
full compilation/save with no catalog/checkpoint. All reuse/check 20,088 bodies with **zero fresh
Vault.read calls, parses or source repairs**. Source posting reads fall with chunk reads (16.3%).
Controlled fixtures below independently prove the removed duplicate resolution decoding; native
counts mode does not measure decoded-record totals or physical disk bytes. Snapshot/binding/source-
receipt hashing is absent from shipping A; the existing vault rolling signature is not separately counted.

| Memory observation, decimal MB | M median (range) | A median (range) |
| --- | ---: | ---: |
| Sampled heap maximum | 2081.4 (1638.9–2312.9) | 1661.5 (1175.0–1922.2) |
| Sampled process RSS maximum | 3037.7 (2653.8–3207.2) | 2410.0 (1933.4–2865.5) |
| Main-realm live heap after two GC collections | 405.5 (405.4–406.7) | 406.7 (406.1–406.7) |

Sampled heap/RSS maxima are lower at their medians, with overlapping ranges; these are not true
peaks or attributable allocation savings. Retained main heap is effectively unchanged (A median
1.21 MB higher); it excludes other worker isolates. Peak source decode reservation is **183,261 bytes
in every run**. No retained-memory improvement is established. All raw-stream controls pass:
foreground/throttling/PID, fixed visible center/demand, common driver/probe, static inputs, zero quiet
violations/overflow/pending work and successful cleanup. Observed heartbeat maxima M 402.8–485.6ms /
A 386.8–414.3ms are task gaps after the first CLI sample, not trusted input or paint latency.


Real Chromium/IndexedDB AB/BA/AB fixtures independently reproduce the algorithmic reduction at
32/64/128 owners. At 128 owners: resolver-wave transactions **2,698→2,570 (4.7% fewer)**,
resolution authentications **256→128 (50% fewer)** and digest calls **2,816→2,432 (13.6% fewer)**.
Clean-restart transactions 905 and peak decode reservation 5,277 bytes are unchanged; zero fresh body
reads, parsing or source repairs are introduced. No additional inventory/build/catalog/save is scheduled
by the correction. These are operation counts, not CPU or energy.

One small 89-owner creation/restart/prose-edit/two-restart lifecycle records M/A CPU 9.109/8.515s,
transactions 6,416/6,415, body reads/parses 2/2 and complete writes 1/1 including initial creation.
This single ordered observation does not establish a small-vault CPU or memory benefit.

## Conditions and interpretation

The native comparison completes three observations per M/A arm in order **A–M / M–A / A–M**. Frozen test-only builds share
the same counts probe (`cfad37cb…`) and actual production build options. The first B–A–M group was
already running when the maintainer superseded the nine-trial receipt plan. It finished unchanged;
only the remaining M/A pairs followed. One middle A observation lost focus, finished and
was excluded in full; one bounded replacement A followed. This breaks strict adjacency of that pair.
All B outcomes and exclusions are preserved separately.

Every restart atomically stages the selected artifact while unloaded, then performs a native vault
window reload. Same public synthetic fixture, configuration, source heads/revisions and sorted
per-owner fingerprints are checked before/after outside timing. Actual host compiler encounter
order and raw graph commitments differ across reloads and remain recorded; they are semantically
relevant, not normalized away. This is a matched static-input restart comparison, not proof of identical
ordered graph payloads. All arms retain their ordinary startup fallback and source validation.

The fixture has 20,088 Markdown files,108,217 nodes and197,561 declarations. The 20,000 generated
notes plus 88 public help notes total 9,062,067 bytes; the largest is 37,623 bytes. Common preferences:
Eager indexing, background URLs, responsive pacing,60s update interval, the public command-palette
center, remote images off. No personal vault was accessed. Hardware: i9-12900,24 logical processors,
68,448,301,056bytes RAM, Windows build10.0.26200x64; Node22.22.2 driver; Obsidian1.14.4,
Electron43.3.0/Node24.18.1/Chrome150.0.7871.212 host. This is not a lower-powered/mobile result.

Ready/drain are observed polling milestones (about 1s CLI cadence), not exact paint/phase timestamps.
CPU is cumulative user+system for the verified selected renderer, including its worker threads,
host and observer work, from before reload through **genuine drain plus 610s quiet**. Profile-only CPU
is also retained. Other Electron processes, energy and plugin-exclusive CPU are not measured. Source,
semantic work, scheduled persistence and observed transactions/promises must drain; no unexplained
inventory/build/catalog/save may occur in the quiet window. No deadlines, pacing or throttling change.
Foreground focus and ordinary background throttling are checked throughout. Heartbeat gaps are
inclusive browser-task observations, not input/paint latency. Six exact-shipping-build foreground
scenarios separately pass with source inventory held and zero foreground broad flush calls.

IDB transactions/requests are actual API operations, not physical disk/WAL bytes. Hash UTF16 units
measure argument volume, not bytes allocated or retained. This covers the source repository SHA256
boundary (payloads, manifests and observations), plus B-only framed receipt hashes; existing vault
rolling signatures and engine-internal hashing are not separately counted. Counts mode omits detailed
payload-size/decode observers; zero there means **unmeasured**, not no decoding. The production
source repository supplies peak decode reservation. Sampled heap/RSS maxima are not true peaks;
two forced collections outside primary timing observe live main-realm heap, not every worker or
plugin-exclusive retained memory. No attributable allocation, peak-memory or retained-memory win
is claimed. Three repetitions support an observed directional comparison, not statistical significance.

## Rejected receipt experiment

The rejected prototype and three failing provenance probes remain at
[`9124f5b`](https://github.com/zsviczian/kplex/commit/9124f5b4a523932ea468e9d73ffdbda2fddbeedd).
It is absent from production and from active test registration. Its prior40-case green suite did
**not** establish correctness: same-stat YAML, ordinary wiki-link and body-tag edits can be certified
against stale host-owned metadata despite fresh body reads. A real second-connection source
replacement held across final promotion also reproduced stale proof; a final scalar sequence fence
fixed that separate race in the preserved prototype without another whole-vault pass.

Eligibility requires every Markdown file ≤128KiB and bounded decoded content. A disposable mixed
vault with 163,840-byte prose and196,813-byte Excalidraw-shaped Markdown compiles normally but
cannot create a receipt. The cap was not raised and no owner was omitted. For both prose and semantic
edits: creation→restart succeeds; normal patch/five-minute save retires eligibility; two more restarts
do not restore it. No extra full build was forced to manufacture renewal.

On an existing graph/source cache, protocol2 first creation through ordinary startup costs 569.735s renderer CPU,826,340 transactions/
1,678,868 requests, two complete source passes and one build/save; genuine drain 2,034.741s plus
610.352s quiet. The completed warm B trial **fails strict retention** after host encounter order changes:
820.656s CPU,826,275 transactions/1,678,730 requests,20,088 extra fresh reads/parses, two complete
source passes and a build/save; drain 2,149.901s plus 610.989s quiet. This is observed fallback cost,
not successful retention or a paired receipt speedup. Small lifecycle B similarly adds 89 fresh reads
and one extra complete save (CPU 10.750s,9,197 transactions). No further B trial/design work is required.

## Validation, evidence and follow-up

Final combined-tree verification passes on **Node 22.22.2** at `9af675e` (approved integration of
main `b29833c`): architecture7/core128/general838/UI63/portable334/browser525, official lint, installed types,
real production build and exact-artifact Windows native smoke, **zero failures/skips/captured JS errors**.
Main SHA-256: `4cb08ded50af580470c6049b3e10a88d9f0d356399368442379e0515fa8f2711`.
Six repeated exact-combined-build foreground scenarios pass with inventory held, zero broad flushes,
controller removal and configuration-byte restoration. The cleaned restart driver also passes a
small-vault functional reload; none of these is a new benchmark. Both authorized vaults end loaded
with all three verified uninstrumented artifacts, original on-demand settings and enablement bytes,
expected 20,088/88 Markdown files and no owned controllers/probes. Workspace-byte restoration is
**not** proven. The reversible awake lease is released.

Integrated-head CI attempt1 failed in Chromium startup before the existing hotkey-search assertions;
its log and the previous cleanup-head failure/retry are preserved separately. Local combined-tree
checks pass without changing assertions/deadlines. Current GitHub CI remains a separate acceptance
requirement; a prior-head success is not substituted for a final-head pass.

[Compact measurements](background-index-efficiency-165-samples.json) retain all arm results,
raw-report checksums, source/artifact/probe identities and limitations. [Evidence and reproduction
index](background-index-efficiency-165-evidence.md) identifies the verified raw archive, rejected tests,
fixture sources/checksums and reproducible procedures. Failed setup, controls and exploratory builds
remain evidence, outside accepted denominators. No raw evidence was deleted or published. Temporary planning and receipt-only tooling are removed; reusable work-count, profile,
identity, restart/drain and retained-memory tools remain.

**Highest-value follow-up (not implemented):** measure repeated source-reader lease/head-selection transaction work inside the existing source
validation owner. A still has about 166,342 median pin/release-store transactions—38% of 437,355 total—
plus 103k source-chunk reads. The body-reconciliation phase itself lasts roughly 11 minutes and follows existing metadata/build work.
These counts identify substantial remaining storage work; they are not exclusive wait/CPU attribution.
Isolate that cost before proposing bounded reader reuse. No implementation or new scheduler,
provenance/receipt architecture is included here.

Remaining acceptance: (1) lower-powered desktop/full-process restart resource and responsiveness;
(2) physical iOS/Android startup/navigation/suspend-resume and memory headroom; (3) macOS changed-
source/interrupted-validation and cleanup. Windows automation does not establish those outcomes.
