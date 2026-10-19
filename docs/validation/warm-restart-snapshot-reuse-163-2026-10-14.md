# Fresh snapshot reuse during startup — PR #163

Runtime checkpoint: `8e32857`; accepted #153 baseline: `ae473fc`, integrated through `3c10ce9`.
The change restores full cached graph availability early. **Fully ready startup remains slow** in
the tested large Eager scenario because cached-source validation still takes about 17–18 minutes.
No further URL, source-throughput, memory, schema or scheduling optimization is included.

## Finding and bounded correction

A genuine application reload selects a complete fresh snapshot, then a body-free structural/host
baseline and five file commits move publication 1→7 before the first full chunk. The existing
`checkpoint` guard correctly rejects the private reader: zero pages/relations/evidence, source
revision 0, policy revision 1. Previously the coordinator abandoned reusable acceleration for
source recovery. A latest-publisher label alone cannot account for the whole publication sequence.

The old candidate stays rejected. One new attempt is allowed only for the physically current
complete active generation after existing P4 admission: at most one actual structural baseline
plus file commits, 256 publications total. Every committed owner's current semantic fingerprint
must match its saved record before any replacement is published. Only the real structural producer
can supply its receipt; unknown/reentrant publishers, checkpoints, missing/changed proof, physical
or policy changes and later interruptions retain conservative rejection. No retry loop or discarded
full private graph is retained, and admission alone does not advance the watchdog clock.

The existing compiler, atomic publication, source/write authority, priority ordering, persistence
guards and On-demand locality remain. Run-scoped first-failure/attempt/route diagnostics export
only finite reason codes and scalars. They never authorize admission or make readiness true.

## Native measurements and limits

Windows 11 build 26200, Obsidian 1.14.4 (installer 1.14.0), Electron 43.3.0; driver Node 22.22.2.
The existing high-node fixture verifies byte-for-byte: 20,000 generated notes, 8,831,230 Markdown
bytes, 80,000 placeholder targets, 8,000 URLs and 259,000 source link occurrences. Digest:
`50b8cb12ef83c3cd62f1605390fe6ff793079a9f6e37e471e59d0060cf287cd0`.
With 88 existing help notes, the genuine compiler/save produces 108,217 graph nodes, 20,088
fingerprints and 197,561 declarations. The visible synthetic hub has 19,999 incoming owners;
these timings are not representative of every vault or center, nor the separate large-prose fixture.

| Renderer-navigation milestone | Diagnostic baseline | Corrected matched profile |
| --- | ---: | ---: |
| Layout ready | 1.566 s | 1.568 s |
| Saved preview | 1.690 s | 2.054 s |
| Complete cached navigation | Not published | 27.242 s |
| Full saved hydration | 0 records; rejected | 30.027 s; 108,217 pages/relations and 197,561 declarations |
| Source authority | 1,028.433 s | 1,027.854 s |
| Product readiness | Not ready at 23m04.9s | 17m07.854s; first observed 17m07.969s |

The baseline's hydration fails at 19m13.8s; its ordinary later compiler/save creates a full graph
but status remains incomplete. It is a failed control, **not a denominator for a native speedup
percentage**. The corrected run retains the existing host-observation invalidation path and one
conservative cached full build. Cached-source host comparison (313.8 s before) and reconciliation
(692.2 s before) dominate authority closure. Source/hydration lanes overlap; do not add them together.

Three sequential production trials (not randomized paired comparisons):

| Trial | Cached navigation observed | Full saved graph observed | First ready observed | Settled idle |
| --- | ---: | ---: | ---: | ---: |
| 1 | 28.855 s | 32.136 s | 17m52.959s | 17m55.137s |
| 2 | 24.500 s | 27.776 s | 17m47.351s | 17m49.542s |
| 3 | 22.418 s | 25.681 s | 17m49.746s | 17m51.939s |
| Median | 24.500 s | 27.776 s | 17m49.746s | 17m51.939s |

Each production trial uses the verified main with detailed profiling disabled, the same Eager /
background-URL / responsive settings and actual visible hub demand. A real complete save precedes
the series. Every run restores all saved records, reaches genuine idle readiness and passes
exact-artifact and observed foreground/throttling checks. Source counters record 20,088 / 20,092 /
20,092 cached-body reuse operations, including repeated checks rather than unique-note counts;
all 20,088 fingerprints remain present. Source reads/parses/repairs and URL-owner reads are zero.
No flags, deadlines or watchdogs were changed to pass.

Production sampled JS-heap maxima are 2,355,792,264 / 1,047,188,720 / 1,048,000,516 bytes;
final samples are 590,683,748 / 536,155,260 / 629,166,100 bytes. Maximum observed timer gaps are
498.7 / 176.1 / 207.9 ms. The matched profile peaks at 2,350,183,696 bytes and ends at 442,582,068;
the failed baseline peaks at 805,255,716 and ends at 413,573,096. Large temporary heap use also
occurs without detailed profiling and is a material mobile acceptance concern. These different
paths and samples do not establish retained overhead or attribute the difference solely to this fix.

These are native `app:reload` **vault-window application reloads; Electron remains running**.
Detailed milestones measure publication, not paint. Normal first-observed milestones have polling
bounds; renderer timer gaps begin only at the first observation. Heap samples are unforced JS
process samples, neither retained-memory measurements nor a proven peak, and completion paths differ.
Aggregate polling and the renderer heartbeat remain in both sets of trials; their overhead is not isolated.

The permitted personal-vault observation corroborates the historical zero-record/source-vocabulary
route, but its old build cannot identify the historical first trigger. Its unfocused 19m45.897s
span is not a controlled benchmark. No personal note contents were accessed or modified; the
personal vault/plugin was not deployed or reloaded. Only aggregate startup diagnostics and
plugin-artifact identities were inspected.

## Verification and reproduction

`npm run verify:obsidian`, Node 22.22.2: architecture 7 / core 128 / general-indexing 825 / UI 63 /
portable sources 334 / real-browser sources 517, no failures/skips; official lint, installed types,
real production build and exact-artifact native smoke pass. Focused 115 and six native foreground
cases pass, with configuration restored. Old negative guards remain; genuine baseline-only,
baseline-plus-file, changed-proof, unrelated/reentrant publication, held URL and watchdog cases
exercise the new path. Post-run audits verify exact production artifacts, loaded/enabled plugins,
normal throttling and no owned controller/heartbeat/staged artifact in either disposable vault.
The large vault's original settings and enabled list match byte-for-byte; all temporary awake leases
are released, and the generated fixture retains its exact digest. No exact workspace-restoration
claim is made because this driver did not capture an original workspace backup. Production main SHA-256:
`e5994ecce833d5e3e17ad3615fec740ffa45aa3e87066e0c58b7f8d501440a0b`.

Run `node scripts/testing/warm-restart-coordinator.mjs --baseline-ref=ae473fc --structural-baseline`,
then without `--baseline-ref`. Three genuine structural-plus-file trials each: 490.3/412.5/398.0 ms
before and 361.9/318.9/309.8 ms after; median 412.5→318.9 ms (22.7%), one recovery admission/catalog
per trial becomes zero, exact canonical adjacency/provenance retained, zero reads/parses. This
512-target work-count fixture is **not whole startup**. File-only mode remains available.

Use `scripts/testing/obsidian/warmRestart.mjs` with all three explicit disposable-vault variables,
an external `KPLEX_HOST_REPORT_DIR` and unique receipt labels. It rejects personal vaults before
filesystem/CLI access. `stage` copies exact main bytes; `prepare` uses the real compiler/save;
`run` verifies changed renderer time origin and observes readiness; `restore-config` verifies
original preference/enabled-list bytes. Cold incomplete setup and first failed candidates are
retained separately from acceptance trials, never relabelled as successful startup.

## Evidence, deferred work and acceptance

[Initial public archive](https://github.com/zsviczian/kplex/tree/3f698ada48cd5cbab0f9b1302644637b2130110e):
36 entries, 2,143,914 ZIP bytes, SHA-256
`0d8e45a5c6d384786ab13c6db23cec778a5cc4f0021d6ed9dcb211e092585729`.
[Supplemental public evidence and reproduction instructions](https://github.com/zsviczian/kplex/tree/0196c1eb8eab0d2bcc3ba2959646a8edb272150a):
122 entries, 5,244,249 ZIP bytes, SHA-256
`c934df0d327c4d1963f4a154b07a941924ef3c5566364f22c389cffe8163724b`.
The maintainer approved this exact supplement separately; the initial ZIP remains unchanged.
Both GitHub-downloaded archives pass complete entry-set, CRC, byte-count and per-file SHA-256
verification. All public checksum entries pass, and the standalone supplemental manifest is
byte-identical to its embedded copy.
The supplement preserves completed and failed native streams, exclusions, source snapshots,
exact builds, fixture/reproduction references, benchmark and verification logs, plus cleanup receipts.
Vault configuration backups and note/cache payloads are excluded; new personal audit receipts stay
local. Raw evidence is preserved separately from the PR tree; no temporary handoff remains.

Deferred opportunities: the measured source-validation tail; memory during cached-to-current full
rebuilds; avoiding redundant bootstrap work without losing foreground availability; larger/later or
unaccounted publication waves; and existing high-fan-in `decode-budget`/incomplete fallback behavior.
These require separate measured proposals. C14 remains accepted; C15–C26 remain paused.

Remaining acceptance: full Electron-process restart on Windows with other vaults safely closed;
macOS restart/edit/rename/delete/popout; physical iOS/Android startup/navigation and memory headroom,
especially large Eager graphs. Windows application reloads do not replace those checks. Keep the PR
draft pending the applicable acceptance or an explicit maintainer waiver; no merge/release is made.
