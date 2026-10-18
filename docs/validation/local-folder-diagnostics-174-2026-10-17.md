# Local folder updates and session diagnostics — PR #174

Implementation and focused Windows validation are complete through `d6be473`. **F: ship within its stated eligibility. D: ship with the platform limitations below.** These are independent review recommendations: the real two-hour Windows soak and aged-session Settings/report checks now pass. Folder savings do not fund diagnostic overhead. Keep the PR draft; do not merge or release.

## Scope and architecture

Baseline is merged main `23aa44eae13797a93890fd1ce1679074d45d9295`, integrated without rewriting
history at `d4d65cd`. D0 (`786e91c`) records passive activity independently of folder handling;
F2 (`b4bb401`) proves bounded folder waves; F3 (`ebe26cc`) completes rapid absent-source rename
retirement. D2 (`d6be473`) integrates shared exports and current health. No personal vault is accessed. No receipt, source schema, reader-sharing experiment,
parser, compiler policy or scheduler redesign is introduced.

F qualifies one genuinely new, initially empty native folder under an established parent in a
settled Eager session. Existing complete physical producers grant an in-memory certificate only
with an unchanged topology epoch. This is physical membership proof, never semantic or durable
source authority. At most 32 direct native file creates join the existing 50 ms per-cause resolver
wave; a pre-rearm guard rejects overdue coverage. Exact membership, native identities, generation
and certificate incarnation must still match at the first close. Ordinary source/referrer/CAS
validation remains intact.

Partial/startup authority, On-demand, unknown/nonempty/nested topology, missing/replayed/replaced
members, overflow, expiry, rename/delete, interruption and extra closes stay conservative. Missing
membership or uncertain structural replacement retires the certificate. Later folder creates
fall back until an existing complete producer grants it again; no build is forced to recover it.
Repeated eligible empty-folder creations can remain local. Fixed local work is identical with 3
versus 120 unrelated Markdown notes in the real-IndexedDB fixture.

D retains fixed categories/scalars at existing coarse boundaries. It adds no per-file/link/evidence/
IDB-operation instrumentation, idle resource, sampling, I/O, upload or persisted identifier. Only
explicit report capture reads existing O(1) health facts and creates a deeply frozen allowlisted
object shared by both exports. Report readers no longer record strict readiness. Detailed profiling
remains opt-in. See the [schema, privacy and collection guide](../INDEXING_DIAGNOSTICS.md).

## Demonstrated folder work reduction

The same frozen driver compares D0 with F2 on disposable Small (107 files / 88 Markdown before
owned fixtures), with Eager indexing, background URLs, Responsive pacing, foreground ownership and retained
background throttling. Current inputs/settings match; database bytes, CAS identities, history and
orphans do not. The eligible new-folder-plus-note interval is:

| Observation | D0, folder fix absent | F2 |
| --- | ---: | ---: |
| Source checks / reused bodies | 92 / 91 | 2 / 1 |
| Fresh reads / parses | 1 / 1 | 1 / 1 |
| Global passes | 1 | 0 |
| IndexedDB transactions / requests | 1,526 / 2,920 | 78 / 202 |
| Source digests / UTF-16 units | 1,499 / 2,219,720 | 58 / 14,359 |
| Inclusive renderer CPU | 2,327 ms | 469 ms |
| Observed drain | 5,977.5 ms | 1,684 ms |
| Sampled heap maximum | 217,649,220 bytes | 254,499,656 bytes |
| Sampled RSS maximum | 614,596,608 bytes | 659,800,064 bytes |

Both have zero full/node-catalog builds and snapshot/checkpoint saves. A bounded F2 repetition
again gives 2 checks, 58 digests, 77 transactions / 197 requests, 406 ms CPU and 1,689.9 ms drain. The
ported reusable F3 acceptance driver keeps 2 checks, 78 transactions / 202 requests and 58 digests;
its 718 ms CPU / 1,619.3 ms drain are separate observations, not pooled with the frozen-driver results.
Ordinary Markdown, a valid drawing loaded by the actual Excalidraw view, and native create/fill/
rename all pass. This event-pattern test does not invoke Templater internals.

These demonstrate avoided amplification for eligible waves, not a universal speedup. One baseline
repetition naturally separates the folder/file waves and already stays local. CPU includes native
host/tooling activity; memory sampling misses peaks and sequential GC/history is not matched.
Higher sampled memory is not attributable to D and no memory/allocation saving is claimed. Request
counts are not physical I/O bytes. Detailed family/decode instrumentation is disabled: its default
zero decode-peak field is unavailable evidence, not zero decoding work.

The dedicated D0/F1/F2 post-drain 610-second controls pass with zero source checks, reads, parses,
digests, builds and saves. Each observes two existing cache-maintenance transactions/requests.
F2 quiet CPU is 1,140 ms over 610.45 s versus D0's 1,360 ms: this difference is not an isolated idle or
D-overhead estimate. Final integrated quiet acceptance also passes over 610.411 s: zero source work, builds, saves or digests; two existing cache transactions and two requests. Inclusive renderer CPU is 2,859 ms, not an isolated diagnostic cost.

## Rejected candidates and the rapid-rename correction

- A full-semantic-snapshot prerequisite excludes actual source-backed Eager startup, where physical
  membership is complete but fullSnapshotHydrated/fullSnapshotFresh are false. It was rejected.
- F1's extra absolute opening-time deadline fails native eligibility: qualification 6 ms, file 47 ms,
  metadata 69 ms, close 70.2 ms, with current membership/generation and the existing timer still live.
  D0 and F1 both perform 92 checks / 1,499 digests. F2 uses the unchanged per-cause deadline, not a
  longer timeout or larger member cap. Deterministic tests reject overdue callback rearming.
- Rapid create-empty → fill → rename initially fails the 90-second genuine-drain gate, leaving one
  pending source, 14 resolution keys and count completion pending despite idle storage/scheduler.
  D0's global recovery masks this existing local API mismatch: repository `absent` is successful
  fenced missing-head retirement, but the adapter accepted only `activated`. F3 accepts either
  outcome only for the current pass, matching the old-path intent and continued native absence. A held
  A → B → C result cannot erase the newer rename. 38 real-IDB tests and the formerly failing native
  sequence pass. No new retry/global recovery or weaker source proof is introduced.

All failed controls, original outcomes and prototype sources remain private and source-pinned.

## Independent diagnostic cost and safety

Node 22.22.2, seven alternating AB/BA repetitions, 200,000 updates per arm and separate allocation/
retained-data/copy observations measure the actual final recorder against a no-op:

| Observation | Final D2 result |
| --- | ---: |
| Added CPU per begin/end pair | 545.7 ns (approximately 0.55 µs) |
| Combined cause/phase/pass/stop sequence | 826.4 ns |
| Fresh / filled owner, post-GC heap+buffers | 8,898–8,916 / 9,017–9,031 bytes |
| Observed diagnostic data-root cut | 16,816 bytes, below 32 KiB target |
| Explicit capture / serialization CPU | 0.141 / 0.031 ms per copy |
| Measured capture fixture | 6,428 bytes |

The data-root cut includes containers, dictionaries, clock/shape headers, 8,224 backing bytes and
eight bounded weak admission tables. It excludes compiled code, loader caches and preexisting
ancestor/global graphs; it is not a hard whole-module or every-engine memory guarantee. An earlier
inconclusive tiny-buffer observation and its corrected measurement are retained separately.

Allocation sampling estimates 1.62–1.79 MB for 50,000 pass pairs, 39.9–42.7 MB for 1,000 explicit captures
and 6.24–6.54 MB for 1,000 serializations. Controls and raw replicates are separate; owner-frame
attribution is unavailable. These are nonzero transient process estimates, not exact allocations.
Projection is below the amplified CPU counter's resolution. Native final-method frequencies are
10 / 13 / 7 / 10 calls over 1.59 / 1.61 / 0.84 / 1.59 s for existing-note / combined / folder-only / later-note
intervals; many repeated milestones read no clock. The forwarding probe measures frequency, not
uninstrumented efficiency. Native diagnostic CPU differences remain inconclusive.

There are 25 hourly slots, 16 recent passes, 2 active rows and an independent last-global record;
startup and saturating lifetime totals survive rotation. Capture stays at most 8 KiB and copied
reports at most 32 KiB, with explicit omissions. Idle adds no recorder clock reads/state changes in
the driver-owned control; source review finds no new idle resource. Unknown/reset/absent facts
remain unavailable. Phase/pass deltas overlap; source timing excludes earlier admission/fan-out
waiting and catalog completion precedes later publication checks. None measures exclusive CPU,
physical disk, paint, continuous execution or device sleep.

## Validation and remaining gates

- Final focused F3 browser/real-IDB 38 / 38, actual main/indexing fixtures, installed types, official
  lint and production build pass. Repeated missing-head/native replacement/held-concurrency,
  hydration/build/purge/unload and conservative cases remain regression protected.
- Final combined `verify:obsidian` passes on Node 22.22.2: architecture 7, core 128, main 960,
  UI 131, sources 334 and browser sources 598, zero failures/skips; installed types, core boundaries,
  official lint, production build and exact-artifact native smoke pass. Main SHA-256:
  `d46b370199b0a2b06347266308e539f3a71a9e83459d50934be4b38bbc067ebc`.
  Runtime checkpoint `d6be473` also passes [GitHub CI](https://github.com/zsviczian/kplex/actions/runs/39042221823/job/117423843294) in 26m52s with the same suite counts and zero failures/skips. The 128-test suite is the portable core lane; the separate indexing-fixture runner also passes.
  Documentation checkpoint `c12c369` also passes [CI](https://github.com/zsviczian/kplex/actions/runs/39044729431/job/117431082810) in 32m8s; runtime/tooling are unchanged.
  The earlier 20-minute outer wrapper expires while its owned child later passes 598 browser tests.
  The clean rerun uses a 35-minute aggregate limit; individual large-case 14-minute and native CLI
  30-second deadlines remain unchanged. The failed wrapper is preserved and is not called a pass.
- Native **Report bug** / **Copy index diagnostics** pass 24 cases covering actual Settings, trusted toolbar/keyboard,
  partial/early/unavailable state, narrow 390 px desktop, sidebar and popout. Both copy commands use
  exactly one owned capture and the expected distinct writer, wrong-owner writes: 0; raw state,
  readiness and guarded effects remain unchanged. Summaries are 4,669 bytes; full index reports are 6,334 bytes.
  The final-artifact repeat completes with 23 recorded cases, 4,677-byte summaries and 6,342-byte index reports. Its optional real clipboard write remains pending to preserve existing non-plain-text formats; distinct-owner intercepted commands still pass. Programmatic native command dispatch is not trusted-keyboard acceptance.
  After the two-hour soak, the same aged session passes 23 recorded cases again: summaries are 4,758 bytes and index reports 6,438 bytes. Actual Settings, main/popout ownership, one capture/write per command, zero wrong-owner writes and reader-only effect checks pass. The optional real write remains pending for the same rich-format preservation reason. All cleanup/configuration checks pass.
- Earlier report controls fail an unowned-debugger assumption and a test comparison that invokes
  Obsidian's forwarding clipboard getter, overwriting interception. The corrected driver uses
  reversible real-window resizing and the original main clipboard capability; supported-format
  backups survive the entire test. Earlier failed receipts do not establish that unexpected writes were restored.
- #172 held-P3 Find/sync/stationary completion passes, including the optional composer lane's actual
  result/exclusions. #161 passes 28 cases: both ghost-history variants, repeated navigation, pinned
  control and subsequent Parent/Child edits. One setup retry first opens the documented visible
  Plex prerequisite; the original failed preflight remains.
- Final integrated 610-second quiet, ordinary Markdown, real Excalidraw and rapid rename acceptance pass with exact fixture/configuration restoration. A focus-lost quiet attempt is excluded and preserved with successful cleanup.
- Accelerated 24/48-hour retention, reset/privacy/overflow/disposal and storm tests pass. These are not a day of native use. Actual 24-hour, macOS and physical Android/iOS acceptance remain unrun.

## Real two-hour Windows session

On the unchanged final artifact, a 120.34-minute On-demand session passes five natural semantic
edits to owned disposable notes at 0/30/60/90/120 minutes. The stationary center, actual selected
mode, background URL policy, Responsive pacing and original background throttling remain intact.
Each edit publishes and reaches actual requested-work/source/cache/lease drain before capture;
dormant disabled On-demand inventory debt is reported separately and never forcibly drained.

| Scheduled minute | Edit, publication and drain completed at | Summary bytes | Active rows |
| --- | ---: | ---: | ---: |
| 0 | 1.585 s | 4,705 | 0 |
| 30 | 1,801.595 s | 4,705 | 0 |
| 60 | 3,601.611 s | 4,731 | 0 |
| 90 | 5,401.634 s | 4,731 | 0 |
| 120 | 7,201.581 s | 4,758 | 0 |

All five captures preserve startup milestones, retained cells and privacy, with one diagnostic
clock read per explicit capture. All 240 passive foreground samples pass; 235 unchanged-idle
controls show zero recorder clock reads and unchanged retained state, excluding explicit captures.
Four controls observe the scheduled later edits. Actual arrays remain 1,024 cells, 8 totals and
2 pass/phase slots. No active pass/phase remains at drain; omissions stay zero. Hour rows grow
from 2 to 4 within the preexisting session; 25-hour rotation is covered separately by accelerated tests.

This tests low-activity ordinary On-demand use, not a native pass storm or all modes. Per-note
On-demand patches deliberately have no hot-loop diagnostic history: current source checks advance
from 24 to 32 between first/last captures, while recorded coarse-pass totals remain unchanged. No full
build, catalog build or snapshot save occurs. The approximately 1.6-second edit-to-capture intervals
include native metadata and drain settlement; they are not isolated indexing time or paint latency.
Between first/last passive samples (7,191.592 s), inclusive renderer CPU is 2,329 ms. Sampled heap
is 372,175,496 initially and 376,962,596 bytes finally; maximum sampled RSS is 775,634,944 bytes. Host, tooling and
unrelated work are included, no control arm is matched, and sampling misses peaks. These do not
establish diagnostic CPU/memory savings, exact allocation or absence of leaks.

Earlier focus failures remain failures: an initial focus preflight; a setup-settled attempt after
one capture/two idle controls while the machine was in use; and a newly authorized retry after
one capture/28 idle controls. The last loses focus around 15 minutes despite no recent user input;
the existing AC display timeout is 900 seconds. The accepted retry owns an Electron
[display-awake lease](https://www.electronjs.org/docs/latest/api/power-save-blocker), released and
verified in cleanup. No OS setting, simulated input, throttle override, foreground assertion or
production code changes. No periodic refocus occurs. Foreground is sampled, not continuously proven;
sleep/suspend semantics remain untested. Every attempt restores fixtures, original mode/settings
and configuration bytes. The accepted run also releases its clock wrapper, controller and wake lease.
The archived private driver/source hashes bind these different conditions; failed trials are not pooled.

## Remaining acceptance and component decision

**F: ship.** Eligible wave work is reduced and conservative/finality counterexamples remain protected.
This does not make every folder operation local. **D: ship.** Independent cost/privacy/boundedness,
real two-hour Windows idle/edit/capture and aged native Settings/main/popout acceptance pass.
These are recommendations for independent review, not authorization to merge or release #174.
No native diagnostic resource saving is claimed and no further code/performance expansion is proposed.

Three remaining platform priorities: (1) actual 24-hour ordinary Windows use with before/after
reports; (2) macOS popout/copy and interrupted folder waves; (3) physical Android/iOS suspend/resume,
clipboard and memory. Expect retained startup/lifetime facts with bounded, truthful recent detail,
correct ownership and no work admitted by copying. Desktop automation and accelerated retention
do not establish those devices. The final repeat intentionally leaves real clipboard writing
pending where existing rich formats cannot be safely restored; the earlier plain-text control passes.

## Reproduction and evidence

Use Node 22.22.2 and the three explicit disposable Small-vault identity/path/configuration variables
from [CONTRIBUTING.md](../../CONTRIBUTING.md). Reuse existing settings/trust. Run lanes serially:
`npm run verify:obsidian`, `npm run verify:obsidian:folder-wave -- <fresh-private-directory>`
(with `KPLEX_NATIVE_QUIET_SECONDS=610` for quiet), `verify:obsidian:support-report`, the existing
foreground live-updates and Excalidraw issue 161 scenarios, then `npm run bench:indexing-activity`.
The benchmark's no-op comparison is separate from normal indexing and explicit copy costs.

Private raw originals remain under the owned temporary evidence roots, including exact artifacts,
source/patch hashes, fixtures, failures and restoration receipts. Frozen F2 patch SHA-256:
`671fd2666c9aa94ee5d6bd8a29b5c8a26308ff06015fc41988bdc423ec81d1bd`.
Frozen matched-driver SHA-256:
`cff57f71ce74aca563dc4d0dcbd415e19e479d37f9499c1314f9924886f9e57a`.
The verified durable copy is outside temporary storage at
`%LOCALAPPDATA%/KplexValidation/pr-174-2026-10-17/final-evidence`: 1,716 files, 103,633,691 bytes.
Every manifest entry passes size/SHA-256 verification; a fresh process rechecks all 1,716 entries and
1,713 original files at 2026-10-17 14:59:52 UTC. The private adjacent `independent-verification.json`
records that result. A later bounded process/input-age setup probe is separately copied and checksum-verified in the adjacent private `focus-availability-addendum`; it contains no application/window content and does not change the primary manifest. `MANIFEST.json` SHA-256:
`4a4cfaf45cdd5c90f73bf7909391984f5fd372ad5db127bfadc10ec75b93f58a`.
It preserves original/rejected sources, source/build/driver identities, measurements, failed controls
and cleanup receipts; excludes junctions/dependencies and transient handoffs. Public source refs
D0/F2/F3/D2 above and the archived source snapshot bind the exact runtime. D2's precommit patch
SHA-256 is `a52fe34a0be2f1ed658be6d12a7194c2c257f840e983f349d7316d528e094e78`;
the exact verified artifact was built at `ebe26cc` with that patch and its static dirty build ID.
Final documentation records the verification after the manifest is made; no runtime changes follow.
Do not publish configuration backups/local metadata, delete originals, or add raw traces to Git.

A second immutable private copy adds the completed soak, its failed predecessor and aged report:
`%LOCALAPPDATA%/KplexValidation/pr-174-2026-10-17/final-evidence-soak-complete`.
All 1,748 files / 105,424,389 bytes pass copy verification and an independent fresh-process
re-read; 1,745 original files also match at 2026-10-17 17:57:54 UTC. Manifest SHA-256:
`d32a6e8df72e67d322966bc2fe817ec3a8bd87f67acd6e3b33e20d249eafb077`.
The original 1,716-entry archive is separately reverified unchanged. Adjacent private verifier/
receipts remain outside Git. Final result/checksum text necessarily follows source-snapshot creation;
no runtime/tooling changes follow. Accepted display-awake driver SHA-256:
`b936e3feddb4a7771b220f13f8fc83702aca5fe57a9e4e4b609985d126afe0c1`.
