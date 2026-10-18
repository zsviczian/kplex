# Source-reader efficiency: PR #169

Decision: **defer the production optimization**. Gate M established a narrow operation-count
opportunity, but did not establish a material net-resource benefit. This PR delivers reusable
measurement protection and a bounded measurement result. Production source readers, scheduling,
validation, persistence formats and runtime behavior are unchanged. The maintainer authorized
merging this measurement/tooling result; implementation continues separately in [PR #172](https://github.com/zsviczian/kplex/pull/172).

## Baseline and method

Accepted main is `d40a339ffce9cc40f332e20c5add2e01422cf847` (merged #171), integrated at
`69fa58a9f4cb2125850ea24ff1019eb0f5673541`. Measurement checkpoint: `0333fc4`.
The control uses all runtime sources from that integration, not the older #165 builds.
Windows 10.0.26200; i9-12900, 24 logical processors, 68.45 GB RAM; Node 22.22.2;
Obsidian 1.14.4, Electron 43.3.0 / Node 24.18.1 / Chrome 150.0.7871.212.

The authorized `kplex-test` fixture has 20,088 Markdown notes / 9,062,067 bytes,
108,217 graph nodes and 197,561 declarations. No Markdown file exceeds 128 KiB.
This is the earlier high-node corpus, **not Synthetic-Scale-v2** or a mixed large-prose/drawing
acceptance fixture. Existing Eager preparation and cache-identity hashing were untimed.
Only disposable vaults were accessed; the personal-vault grant was not used. Fixture provenance
and the pinned generator/public-help sources are in the [#165 evidence index](background-index-efficiency-165-evidence.md);
this control reused that corpus without creating a new destination or copying an old IDB cache.

One diagnostic native vault-window application reload retained the Electron renderer process.
It used the existing pacing, concurrency, foreground window and background throttling, with
bounded aggregate detailed observation. Two short CLI/CDP CPU windows sampled host comparison
and source reconciliation. This diagnostic is not a low-instrumentation M/A performance series.
No candidate was built, and no acceptance threshold or speedup was selected after seeing results.

## Native control

At genuine drain, before the fixed quiet window:

| Observation | Result |
| --- | ---: |
| Reported readiness / genuine drain from navigation | 1,087.799 / 1,089.981 s |
| Selected-renderer CPU through drain / including quiet | 327.968 / 333.968 s |
| IDB transactions: readonly / readwrite | 249,566 / 185,759 |
| Total transactions / request invocations | 435,325 / 996,630 |
| Host-comparison / source-reconciliation transactions | 133,130 / 301,326 |
| Committed source-family leases created / retired | 82,770 / 82,770 |
| Peak simultaneous readers / leases | 1 / 1 |
| Maximum delivered-reader / committed-lease lifetime | 95.8 / 95.8 ms |
| Peak sampled heap / renderer RSS | 1,035,644,340 / 2,782,404,608 bytes |
| Peak source decode reservation | 183,261 bytes |
| Fresh Vault reads / parses / repairs / resolution refreshes | 0 / 0 / 0 / 0 |
| Source digest calls / UTF-16 input units | 388,926 / 654,729,174 |
| Full compilations / full snapshot writes | 1 / 1 |
| Encoded page + snapshot-chunk write payload estimate | 279,044,330 bytes |

The 610.633-second quiet window passed with zero additional IDB transactions, digests, builds or
saves, and no readiness/drain violations. Host presentation-policy lookups continued; quiet does
not mean zero application CPU (6.000 seconds during the window). All foreground samples passed;
actual renderer PID/type matched the native CPU owner. The first new CLI sample was at 12.551 s,
so the maximum 412.3 ms heartbeat gap excludes earlier startup and does not measure paint or
foreground interaction latency. Debugger ownership and temporary observers were restored.
These are one-run observations, not medians, isolated plugin CPU, physical disk bytes, allocation
totals or battery measurements. Probe-interval CPU was 327.187 s, a shorter scope than the
inclusive lifecycle. Sampled heap/RSS may miss peaks and do not establish controlled retained memory.

## Attribution and decision

The initial offline-change barrier performs head-only inspection, dependency verification and
leased metadata replay. Quiet reconciliation can skip body acquisition. An unchanged resolver
wave opens three later reader lifetimes: body reconstruction, metadata inspection and resolution
comparison. The native wave observed exactly 60,264 family pins and 20,088 metadata inspections /
resolution comparisons, approximately 15 transactions per owner. Actual source-family pin/release traffic totals 165,540 transactions (38.0% of all transactions).
Contributor/journal operations are classified separately. That 38% is bookkeeping traffic, not
38% avoidable work, CPU or elapsed time.

Sharing metadata and resolution inside the existing selected reader could remove one pin/release
pair while adding an inter-family readonly head check: **one net transaction per eligible owner**.
For this control, the theoretical count reduction is 20,088 / 435,325 = **4.61%** overall
(6.67% of reconciliation), before fallback costs. It does not remove body acquisition, metadata
or resolution authentication, canonical comparison, hashing, the barrier, compilation or saving.

All metadata inspections together occupied 34.643 seconds of inclusive awaited time, just 3.18%
of startup-to-drain. Even eliminating those inspections completely is an unrealizable best-case
comparison: shared readers must still authenticate metadata and perform another head check.
This describes the observed serial path, not a causal speedup bound under changed contention.
The 135.429-second union of all pin/release/selection waits is also not removable time or CPU.
Nested method durations must not be added.

The two CPU windows attributed only four lifetime-bookkeeping leaf samples each: 6.282 and
6.398 ms of approximately 3.9 seconds (about 0.16%). Host/runtime and idle samples dominate.
This does **not** isolate asynchronous IDB/browser/commit CPU or prove all lease/storage work
cheap. It provides no affirmative evidence of material JavaScript bookkeeping cost. Observer
samples were themselves larger, and its overhead is not isolated. Counts-only fixtures establish
operation behavior; they cannot turn this diagnostic into a native resource comparison.

Gate M therefore does not justify implementation plus an expensive acceptance series. The
hypothesis is **unproven, not conclusively falsified**. No M/A speedup, CPU reduction, allocation
saving or mobile benefit is claimed. Deferred candidate risks include longer lease residence,
extra fallback work, priority inversion and finality mistakes for a small plausible benefit.
Initial, inter-family, post-release, host/policy/physical and memory-mask checks remain intact.
No receipt, schema, lease-expiry/reclamation policy or scheduler change was attempted.

## Regression protection and reproduction

The existing observer adds detailed-only bounded method/committed-lease attribution, disjoint
store classifications, a nonoverlapping wait union and genuine drain checks. Opaque lease keys
stay private (cap 4,096; overflow/unknown retirement fails completeness). Counts mode avoids the
new detailed clocks/argument inspection. Native request, receiver and promise forwarding and
failed-release conservatism are covered by real IndexedDB contracts.

Real Chromium/IndexedDB fixtures, excluding setup, measured:

| Shape | Quiet transactions for N owners | Unchanged resolver-wave transactions |
| --- | --- | --- |
| Single chunk | 7N+9 | 20N+10 |
| Multiple chunks | 7N+9 | 31N+10 |
| Compatible URL-free parser2 | 14N+9 | 30N+10 |

Main independently passed two observer contracts, 18 small shape/wave conditions at 2/4/8
owners and six single-chunk conditions at 32/64/128 owners. The offline return ran 18 detailed
and 18 counts conditions with identical counts. Successful conditions had no new reads/parses/
repairs and fully drained readers, methods, transactions, leases and decode reservations.
Two repeated exact-owner cycles cost 26/48/32 transactions respectively.

Run `node scripts/testing/source-validation-work.mjs --sizes=2,4,8 --profiles=single,multi,parser2
--repeats=2 --mode=detailed` with `KPLEX_BENCHMARK_REPORT` set to a fresh path. The same existing
driver accepts `--mode=counts` and immutable `--baseline-ref`. Its larger all-shape 32/64/128
attempt hit the unchanged 60-second CDP evaluation deadline. The old writer lost the unfinished
condition/stage, so the cause is unknown. The driver now preserves append-only starts/results and
partial failures; deadlines were not weakened. That failed attempt remains evidence, not a pass.

Build the native control with `buildStartupProfile.mjs --baseline-ref=69fa58a9f4cb2125850ea24ff1019eb0f5673541`,
`KPLEX_PROFILE_MODE=detailed`, `KPLEX_PROFILE_CPU=true` and a fresh `KPLEX_PROFILE_OUTPUT`.
For `warmRestart.mjs stage-and-run`, provide the three explicit disposable-vault identity variables,
a fresh report directory/label, `KPLEX_RESTART_MAIN`, `KPLEX_PROFILE_IDENTITY_DIR` and
`KPLEX_RESTART_QUIET_MS=610000`. Source-map corrections preserve production bundle hardening.
The diagnostic main SHA-256 is `eada3b92f89d4fb3fe796a1bef023f84bdb6ddf5e72d7119981981c5c542e905`.
The unsupported Node-inspector attempt is preserved; its startup hook was removed. Actual CLI/CDP
source attribution passed a separate 500-head-read smoke. No runtime profiling hook ships.

## Final verification and restoration

`node scripts/testing/obsidian/verify.mjs` passed on Node 22.22.2: architecture 7, core 128,
general 906, UI/browser 128, portable sources 334 and source/browser 543: **2,046 tests**, zero
failures/skips, Obsidian lint, actual typings and production build. Exact-build native smoke passed
with zero captured JavaScript errors. Runtime main SHA-256: `fbe9eaa3ba01e0b9c9634ddb5b82fc62503fb3d90da27be025547560182c1c85`.
The verified code/tools/tests match checkpoint `0333fc4`; later edits only update documentation
and remove the temporary planning marker. CI for `0333fc4` passed (run `38971221162`); final-head
CI for final head `f794a067032c88699fb25e7ba269e894d2e1a319` passed
([run 38977394989](https://github.com/zsviczian/kplex/actions/runs/38977394989)). This closeout
changes documentation only; its final-head CI result is recorded in the PR checks/description.
No production `src/` diff exists against accepted main.

Both disposable vaults returned to original on-demand configuration and executable/configuration
bytes. Large inventory (20,107 files / 20,088 Markdown), runtime preferences, layout and bounds
match its backup; small inventory is 107 files / 88 Markdown, with pre-smoke workspace bytes restored.
All temporary probes/timers and owned debugger attachment are removed. Private backups and raw
originals remain intact. No manual interaction test is required for a production change here, since
none ships; unmeasured resource/device acceptance remains below.

## Limitations and next work package

No candidate means the candidate safety/race matrix, ordinary-edit lifecycle, alternating
three-pair native acceptance, controlled retained-memory comparison, high-degree interaction
and Synthetic-Scale-v2/mixed-size acceptance were not run. No macOS, lower-powered desktop or
physical iOS/Android resource result is available. These gaps prohibit a production-efficiency
claim; they are not skipped passes. Existing production concurrency protection remains unchanged.

[PR #172](https://github.com/zsviczian/kplex/pull/172) is the next work package: prioritize
external-note discovery/navigation, stationary-center completion and all #161 Excalidraw
materialization/pinned-tab/relationship variants. Establish causal traces before choosing fixes;
retain the existing conservative source/finality rules. Reader sharing and the rejected receipt
remain deferred, and this report demonstrates no production performance improvement.

The measured separate resource lead remains **full compilation and snapshot rewrite during an unchanged
restart**. This control observed a 17.076-second compilation and 13.016-second snapshot write,
including about 279 MB of encoded page/chunk write payload. Determine why existing validated
reuse cannot avoid that work without weakening freshness, adding persistent proof or moving work
past measurement. This is a separate correctness/resource proposal, not implemented here and not
a claim that all 30 seconds or 279 MB are unnecessary. It is a clearer measured storage target
than the narrow reader-bookkeeping change.

## Evidence preservation

Local archive: `handoff/validation/kplex-169-evidence.zip` (Git-ignored, not published),
22,719,434 bytes; **83 verified files / 84 ZIP entries**. SHA-256:
`4f0739d70445593203f3377811737c636dcff1c53a14f05c1e093f77300243f5`.
CRC, entry size and every file SHA-256 passed. Its `MANIFEST.json` and README bind successful/
failed raw reports, append-only observations, CPU profiles/maps, exact artifacts/tools, source
archive at `0333fc4`, verification and restoration receipts. Raw originals remain untouched.
Private configuration backups, vault note/cache payloads and transient handoffs are excluded.
No public download URL or approval to publish is claimed.

On 2026-10-17 the existing archive was reverified (all 84 entries, CRCs, 83 per-file sizes/SHA-256
checks and whole-archive checksum). A byte-identical durable backup is retained outside temporary
storage at `%LOCALAPPDATA%/kplex-validation/pr-169/kplex-169-evidence.zip`, with a verification
receipt beside it. The Git-ignored original archive and all raw originals remain untouched. No
additional consolidation, performance experiment, raw-trace Git addition or publication occurred.

The fixture generator at `62c7283` verified every generated byte and its portable path/content
SHA-256 `50b8cb12ef83c3cd62f1605390fe6ff793079a9f6e37e471e59d0060cf287cd0`.
The archive includes the exact generator and per-file checksums for all 88 public help notes.
Original evidence remains under `%TEMP%/kplex-169-2026-10-16/`; offline detailed/counts reports
are included separately. Failed Node-inspector builds, failed doubling setup and mapping smokes
remain labeled, outside accepted denominators. They were not rerun until favorable or discarded.
