# PR #153 final indexing performance report

The maintainer accepts the measured tradeoff: **46.7% shorter warm URL reconstruction** with
**2,653,124 additional retained bytes** (2.65 MB, 7.8% of the measured graph slice). Optimization
work is closed. This report supersedes the experimental checkpoint reports; their complete
measurements, failed attempts and source identities are preserved in the verified archive below.

## Aggregate result and measurement scope

The matched comparison is hydration checkpoint A [`a162044`](https://github.com/zsviczian/kplex/commit/a162044)
against accepted runtime B5 [`cacefe5`](https://github.com/zsviczian/kplex/commit/cacefe5).
**A already includes the earlier no-op and hydration fixes; this is not a timing comparison with
the PR's original base.** Each condition uses the same real, current URL-owner facts, actual
source identities, settings and foreground native host. Even-numbered pairs reverse run order.

| Observation | A | B5 | Interpretation |
| --- | ---: | ---: | --- |
| Warm URL reconstruction, median of three unwrapped trials | 25,895.8 ms | 13,807.2 ms | 46.7% shorter; ranges do not overlap |
| Individual elapsed samples | 25,895.8 / 26,791.2 / 25,575.6 ms | 15,438.1 / 13,807.2 / 11,305.7 ms | All samples retained; substantial candidate variation |
| Retained graph bytes, median of five collected pairs | 34,200,172 | 36,853,296 | +2,653,124 bytes; every paired difference positive |
| Largest synchronous display flush, median of three unforced runs | 32.2 ms | 35.3 ms | +3.1 ms; candidate batches contain more paths |
| Largest heartbeat gap, median of those runs | 49.5 ms | 42.8 ms | Mixed paired changes and overlapping ranges; GC still matters |
| Selected-origin working adjacency entries visited | 31,996,000 | 0 | Separate counted lifetimes; display materialization remains |

The aggregate gate contains 28 native index lifetimes and 22 exact-artifact stages, with no
excluded sample. Timed body reads/parses are zero; ordered graph/evidence, source and physical
identity checks pass. Collected diagnostic roots release after disposal. Forced-GC heap trials,
unforced pause trials and low-instrumentation timings are separate experiments. Inclusive method,
flush and GC intervals overlap and must not be summed as exclusive CPU time.

The Windows vault contains 20,088 Markdown notes, 20,107 files and 15 folders including root.
Its deterministic `Indexing-performance-153` fixture supplies 20,000 notes (8.83 MB), 8,000 child URL
targets and 259,000 source link occurrences; it is not `Synthetic-Scale-v2`. The measured graph has
**16,069 total pages: 8,040 URLs and
8,029 Markdown owners**, with 16,127 declarations and shared-origin degree 8,000.

URL-owner rows are warm/current. Graph snapshots, body cache, neutral source heads and dependency
inventory are absent in each isolated trial namespace. Seeding and physical/digest checks occur
outside API timing. This measures URL reconstruction plus current-owner closure, not full plugin
startup, application restart, ordinary full-graph hydration, paint or process peak. On-demand
global source authority remains intentionally uncertified outside requested scopes.

Environment: Windows 10.0.26200, Intel i9-12900, 68.45 GB RAM; Obsidian 1.14.4 (installer 1.14.0),
Electron 43.3.0 / Chrome 150.0.7871.212 / host Node 24.18.1. Driver/build Node is 22.22.2;
the separate browser lane uses Chrome 153. Results do not establish another platform's behavior.

## Changes and supporting measurements

These independently measured checkpoints explain the implementation. Their timings concern
different workloads and cannot be added to produce an aggregate startup gain.

| Change | Measured evidence |
| --- | --- |
| Avoid unchanged-source adjacency/evidence publication work | Native no-op patch 76.9 → 23.1 ms; 513 neighbor copies → 0; one evidence compaction → 0 |
| Validate hydration policy at task/publication boundaries | 4,096-record/256-field workload: 17,230 → 4,893 signature calls; 533.9 → 241.5 ms inclusive hydration |
| Share replace-only URL facets and retain compiler-local alias membership | 4,096-owner alias/tag/style copies → 0; distinct-label membership scans 8,390,655 → 0; native 255.8 → 36.1 ms; repeated-label control essentially unchanged |
| Restore the saved preview independently of URL replay | Native Eager 460.5 → 43.9 ms; On-demand 492.2 → 52.1 ms in the controlled URL-replay hold |
| Bound private URL adjacency deltas and published-target retention | Fixed 4,096-owner working copies 8,394,750 → 0; 12,285 changed keys replayed, largest replay two; fixed display work unchanged |
| Compact sparse positive evidence replacements conservatively | 64 edits over 4,097 originals: 32,776 copied declarations → 8; endpoint changes retain full fallback; native group timing has overlapping ranges |
| Append evidence only during exclusive private compiler ownership | Native dense pair: 134,225,920 prefix copies → 0; 16,385 arrays → 1; warm rebuild median 1,085.7 → 759.7 ms |
| Reuse already-published URL search vocabulary | Fixed 4,096-owner duplicate general URL rows 4,097 → 0; independently measured graph retention −1.52 MB and largest-flush median 49.7 → 35.4 ms |
| Use the private adjacency subclass's native delta storage | Separate Maps 8,042 → 0; independently measured graph retention −0.83 MB; component controls support the storage effect |

The last two memory reductions compare their immediate predecessors, not A. They do not eliminate
the aggregate retained-memory premium. A separate 64-replacement native exercise verifies exact
search/canonical state after every edit: all 65 observed published origin maps reduce to one current
map at collection boundaries, then zero after disposal. Whole-renderer heap still rises by 1.79 MB
over that short exercise; this is not proof of a flat process heap or hours-long leak freedom.

## Architectural decisions and limits

The existing semantic/compiler, GraphBuilder staging, GraphIndex publication and IndexedDB owners
remain in place. C14 stays accepted; C15–C26 remain paused. No schema, settings, command, dependency,
source-authority or publication-cadence change is introduced. Cleanup changes no production code.

Private URL adjacency may adopt only an independently authorized immediate delta (maximum 1,024
replay keys); depth/retention bounds and cooperative fallback prevent unbounded generation chains.
Displayed and ordinary adjacency remain native Maps. Published-target retention is bounded per
current path, not a byte bound; readable metadata remains revision-scoped rather than frozen.

Sparse evidence maintenance admits only bounded positive overrides: 32 pairs, 256 current plus
shadowed declaration entries, 64 KiB scalar strings, eight layers/256 examined keys. Tombstones,
active indexes and unknown/oversized values retain the full compactor. Private compiler append
ownership seals irreversibly before output, forks, ordering/index exposure or rejection. Ordinary
copy-on-write, declaration multiplicity, order and retained generations remain protected.

Publication stays synchronous and atomic across graph/evidence/fingerprint/search/cache effects.
Cancellation, settings changes/reentry, file identity, rename/delete and supersession fences remain.
Saved preview completion does not grant complete URL or global source authority. Exact warm heads
add no reads; an older/missing source head can require one genuine validation read/parse.

## Evidence and reproduction

The [immutable evidence archive](https://github.com/zsviczian/kplex/blob/0b4ea8d82cab46ea744cacb6478a0fa2139aa734/pr-153-performance-evidence.zip)
contains all committed checkpoint reports/raw receipts, failed/preliminary attempts, source/test/tool
snapshots and retained local measurement/verification output. Its [reproduction guide and verifier](https://github.com/zsviczian/kplex/tree/0b4ea8d82cab46ea744cacb6478a0fa2139aa734)
provide exact revisions, fixture/cache instructions, per-file hashes and original source references.
The archive was downloaded from GitHub and all **1,312 entries / 49,597,930 payload bytes** verified
before source-tree removal. Original vault configuration payloads, dependency/build trees and the
transient handoff are excluded; configuration restoration receipts and artifact hashes remain.
Keep `pr-153-performance-evidence`: its parent history retains the baseline source commits after a squash merge.

ZIP SHA-256: `e65804e3134bfa62039d2598f3f78f18f5c5f46ca6bf41bbc64e58bf604f09d2`.
Evidence source: `cc0aacd01a0ab9b3497c18f8b85e0398fe61e8dc`; aggregate baseline `a162044`, runtime `cacefe5`.
Fixture content SHA-256: `50b8cb12ef83c3cd62f1605390fe6ff793079a9f6e37e471e59d0060cf287cd0`.
Accepted `main.js` SHA-256: `0e0d599107d4efbd565a215f8544716831fd044a830317d362ac3f14a67dc9f4`.
Manifest 0.1.3 and stylesheet hashes are recorded in the archive; release metadata is unchanged.

Retained portable benchmarks cover no-op patches, hydration, preview, facets, aliases, adjacency,
search and evidence maintenance/append under `scripts/testing/`. Native equivalents share bounded
controllers and fixture cleanup under `scripts/testing/obsidian/`; `largeUrlReplay.mjs`,
`largeUrlMemory.mjs`, `largeUrlStorage.mjs` and `urlUpdateRetention.mjs` support scale/retention checks.
The staging-only counter is removed because `url-adjacency-work.mjs` covers that workload plus
publication/display work. Test-lane registration and behavioral/work-count regressions remain.

## Final validation and deferred work

Fresh post-cleanup `node scripts/testing/obsidian/verify.mjs` passes on Node 22.22.2:
architecture **7**, host-free core **128**,
indexing/general **824**, UI **63**, portable sources **334**, real browser/IndexedDB **495**;
zero failures/skips. Official Obsidian lint, actual installed-type checks, production build and
exact-artifact native staging/render/error smoke pass. Subsequent
`node scripts/testing/obsidian/foreground.mjs` passes all **six native foreground cases**.
The final artifact hashes match B5; original workspace, configuration bytes and native throttling
are restored. Final whitespace, archive-coverage, source-hash, local-link and unrelated-diff checks
pass. The cleanup leaves runtime code, regressions and test registration unchanged. No further
performance trial or optimization was performed during closeout. The
[complete fresh verification receipts](https://github.com/zsviczian/kplex/blob/bde8c4c0373bee5081d226811be3879009d33018/final-verification.zip)
are separately archived and verified from GitHub (11 entries; ZIP SHA-256
`6fddab7e5f7a5c1be7e615b59a1c7b3c716f06a7d56c08ffbdce1406de737d56`).

Deferred opportunities are recorded for a separately scoped, measured task: ordinary adjacency
copying on growing graphs; lower retained URL representation cost; synchronous search/display
flush work; and broader startup/process-peak/long-session attribution. Cross-owner URL write
batching remains deferred: a cache-only experiment reduced 512 → 86 transactions and 61.1 → 32.2 ms,
while measured production pipeline time was 859 ms with overlapping work. That smaller isolated
gain does not justify new generation/stale-write/close/purge queue fencing in this PR.

Remaining acceptance gaps, in priority order:

1. Physical iOS/Android: cold/warm startup and shared-URL navigation in a realistic disposable
   vault; check actual touch/paint responsiveness, eventual closure and memory termination.
2. macOS: exact-build warm restart plus sync/offline edits and rename/delete during cache loading;
   verify navigation remains available and stale sources cannot reappear, including a popout.
3. Longer sessions: repeated hub/alias replacement/removal and hide/reveal/popout use, checking
   stable graph/search counts and settled memory. The 64-edit Windows probe is bounded evidence.

Windows automation does not replace these checks, establish mobile memory safety, or diagnose #93.
