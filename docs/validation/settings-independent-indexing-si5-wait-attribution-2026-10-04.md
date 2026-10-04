# SI5 warm restart: wait attribution — 2026-10-04

## Result and scope

The unchanged posting-batching production build completes three foreground warm restarts in **64,523.3 / 64,592.3 / 67,664.5 ms**, median **64,592.3 ms**. No optimization was added. The previous same-build median was 66,170.2 ms; these sequential measurements with additional observers do not demonstrate a new improvement.

The 20,015 host-comparison repository yields consume only **165.2 / 152.0 / 165.4 ms** of observed latency. Removing yields is unsupported by this evidence. Host comparison spends **36,776.3 / 35,870.0 / 37,343.5 ms** within observed repository transaction intervals, **837.7 / 851.9 / 881.4 ms** in digest intervals and **9,815.7 / 9,317.3 / 9,964.8 ms** outside those measured waits. The latter includes unwrapped lease-release transactions, inventory checkpoints, synchronous validation, scheduling and other work; it is **not CPU-only**.

Four full owner walks remain: source coordinates, host comparison, source reconciliation and resolution reconciliation, with all six pairwise overlaps exactly 20,015. The two validation walks each perform 20,015 dependency checks. Reconciliation protects later host/physical freshness, so overlap alone does not justify deleting it. The coordinate and resolution walks each take only 3–7 ms on this fixture.

SI5 remains open for physical iPad/Android and final settings-route/retirement/evidence audit. Accepted extreme cold behavior and the synthetic 20k-hub `decode-budget` stress limit remain outside the critical path. No scheduling, architecture, memory, cache/schema or projection changes.

## Exact build and measurement semantics

Parent checkpoint **`ea41d4b4484b9957d8700cf44920809912ca1ee4`**, installed `main.js` SHA-256 **`c9cc8a491b4294de9f7d04781069ea983131029b682aec02b778ba0f17d7b4bf`**. Only the native test driver/helper/tests were edited before this measurement; no production rebuild/deployment occurred. The other artifact hashes and exact aggregate measurements are in the [JSON evidence](settings-independent-indexing-si5-wait-attribution-2026-10-04.json). Environment/fixture match the [posting baseline](settings-independent-indexing-si5-posting-batching-2026-10-04.md): M1/8 GiB, Obsidian 1.14.4, 20,015 Markdown owners, 20,709 pages/relations, 715,032 evidence records, representative existing center.

The opt-in `KPLEX_SI5_MEASURE_WAITS=true` adds bounded, test-only passive observers around the existing repository `transaction`, `runtime.yield` and `runtime.digest` calls. Each forwards the **original** return value/promise and rejection. There are no substituted timers or authority decisions. Observation adds clock/aggregation calls and promise callbacks; its overhead is not separately isolated. Fixed histograms, at most 128 groups/phase cells, no per-call samples or owner identities. Each phase receives eight disjoint buckets: yield bit 1, transaction bit 2, digest bit 4. Inclusive call-duration sums may overlap; membership buckets count the union once. All measured source-phase overlaps here are zero.

The transaction helper resolves after both its IDB callback and transaction completion. Its duration includes dispatch, callback work, commit and promise scheduling, not exclusive disk time. Digests include encoding/hash/continuation latency, not isolated hash CPU. The probe starts **after enable returns** (197.7 / 138.4 / 111.1 ms from disable/enable origin); earlier work and snapshot-cache transactions are unwrapped. Phase durations in the following table use production diagnostics relative to `onload` and can overlap across source/hydration lanes. Do not sum them.

## Milestones (ms from immediately before disable/enable)

| Observation | Run 1 | Run 2 | Run 3 |
| --- | ---: | ---: | ---: |
| Disable completed | 41.0 | 24.9 | 25.3 |
| Enable returned | 197.7 | 136.9 | 111.0 |
| Wait probe started | 197.7 | 138.4 | 111.1 |
| Requested Plex center present in DOM | 954.5 | 954.9 | 501.8 |
| Source authority observed | 57,969.5 | 57,717.2 | 60,460.8 |
| Requested semantics authority observed | 57,969.7 | 57,829.0 | 60,585.8 |
| Final strict-ready observed | 64,523.3 | 64,592.3 | 67,664.5 |

DOM presence is sampled every 100 ms, not actual paint/touch usability. Requested semantics and source authority have exact production milestone timestamps as well as sampled observations in the JSON. Post-requested preparation lasts **6,590.8 / 6,842.5 / 7,167.4 ms** from the exact requested-authority milestone to exact strict-ready. Node vocabulary, resolution and authoritative-search phases are absent on this valid snapshot route; no duration is invented for them.

## Production phases (elapsed ms)

| Lane / actual phase | Run 1 | Run 2 | Run 3 |
| --- | ---: | ---: | ---: |
| hydration / metadata | 73.2 | 52.6 | 42.0 |
| hydration / preview | 382.3 | 660.4 | 310.7 |
| source / source-inventory | 3.1 | 3.3 | 4.4 |
| source / source-coordinates | 6.5 | 5.3 | 5.7 |
| source / host-metadata-comparison | 47,594.9 | 46,191.2 | 48,355.1 |
| hydration / preview-search | 209.1 | 16.8 | 21.2 |
| hydration / source-authority | 56,998.6 | 56,842.7 | 59,960.3 |
| source / host-retired-owner-check | 696.7 | 749.8 | 394.1 |
| source / source-reconciliation | 8,380.5 | 9,540.5 | 10,864.1 |
| source / source-retired-owner-check | 591.2 | 358.2 | 328.6 |
| source / dependency-completion | 1.6 | 2.1 | 1.7 |
| source / resolution-reconciliation | 3.5 | 3.3 | 5.1 |
| source / dependency-final-validation | 0.8 | 0.9 | 0.8 |
| source / complete | 6,629.8 | 6,881.2 | 7,215.5 |
| hydration / requested-semantics | 38.0 | 38.2 | 47.9 |
| hydration / pages | 1,899.8 | 1,219.0 | 1,428.8 |
| hydration / relations | 1,537.5 | 2,033.1 | 2,071.7 |
| hydration / preview-search (second) | 376.6 | 291.7 | 315.0 |
| hydration / evidence | 2,773.8 | 3,297.3 | 3,347.7 |
| hydration / promote | 0.5 | 0.5 | 1.8 |
| hydration / complete | 2.2 | 0.7 | 2.0 |

`source-authority` in hydration is an overlapping **wait** for the source lane. `source / complete` records the lane idle after authority, not another whole-vault pass. Metadata/preview begin before the wait observer and retain their production timings. Host inventory start/end durations are **41.5 / 20.1 / 22.9 ms**.

## Transaction/call attribution

Host comparison, all runs: **40,030** head-only read transactions, **20,015** dependency-selection read transactions, **20,015** reader-pin write transactions, **20,015** chunk read transactions, **20,015** posting range transactions, **60,045** digests, **20,015** yields.

| Host-comparison observed call latency (ms) | Run 1 | Run 2 | Run 3 |
| --- | ---: | ---: | ---: |
| transaction:readonly:sourceHeads | 7,233.5 | 6,929.2 | 7,446.3 |
| transaction:readonly:meta,sourceLocalDependencyOwners,sourceLocalDependencyRepairs | 4,145.9 | 4,387.6 | 4,494.0 |
| transaction:readwrite:meta,sourceHeads | 10,570.1 | 10,547.1 | 10,530.7 |
| transaction:readonly:sourceChunks | 5,514.4 | 5,135.8 | 5,530.6 |
| transaction:readonly:sourcePostings | 9,312.4 | 8,870.3 | 9,341.9 |
| digest:sha256 | 837.7 | 851.9 | 881.4 |
| yield:timer | 165.2 | 152.0 | 165.4 |

Host yield minimum is 0 ms at the host clock resolution; maxima **5.3 / 2.0 / 7.5 ms**. Of 20,015 observations, **20,004 / 20,006 / 20,006** are at most 0.25 ms; averages **0.00825 / 0.00759 / 0.00826 ms**. Full bucket counts and every other call group/min/max are retained in JSON. Do not assume a generic four-millisecond timer clamp applies to these measured yields.

Reconciliation performs **40,030** head transactions and **20,015** dependency-selection transactions per run: measured transaction intervals **7,829.4 / 8,968.4 / 10,160.8 ms**, **20,015** digests **205.6 / 206.8 / 235.2 ms**, outside measured waits **345.5 / 365.3 / 468.1 ms**, and **no repository yields**.

Global issued requests per run: **100,111 source-head gets**, **40,106 meta gets**, **40,034 local-owner gets**, **40,030 repair gets**, **20,027 source-chunk gets**, **20,027 bounded posting range reads**, **935 snapshot-chunk gets**, **40,032 lease adds and deletes each**. Dependency checks/selections **40,030**, settlement **0**, inspections **80,060**. MetadataCache lookups **101,299**, of which 20,015 reconciliation and 20,575 host-phase lookups (includes concurrent UI activity); temporal attribution is not exclusive ownership. Physical revision comparisons **60,045**, actual adapter-stat I/O **0**. Four Markdown inventory calls; zero Markdown read/cachedRead, parsing, reacquisition, repair, source rewrite or full graph build.

Each measured startup contains **one** host-comparison and **one** source-reconciliation phase. The maintainer reported two identically named cache checks in a now-closed personal vault. Its previous in-memory report is unavailable; no personal vault was opened or read. Reconciliation can retry after events change its captured inventory revision or when metadata is incomplete, but the actual reason in that closed run is **unknown**. A distinct retry label is a separate UX correction, not evidence of an extra optimization.

## Smallest next opportunity — proposed, not implemented

Combine the **clean local-dependency selection and its fresh source-head validation** into one bounded readonly transaction per owner inside `ensureLocalDependencies()`. Today those are consecutive separate transactions; the caller also retains its own earlier inspection. This targets transaction overhead in the measured bottleneck without removing either whole-vault freshness pass or adding a cache. It could remove 40,030 transaction boundaries per clean restart, but no latency saving is claimed before implementation/retest.

Preserve memory/unsaved/tombstone overlays, source revision/sequence validation, owner version/order, repair journal/state, cancellation and storage failures; legacy upgrade/actual repair still reread after writes. Preserve final host/physical checks. Do not reuse an old caller inspection across awaits as current authority. If the boundary cannot preserve those contracts narrowly, leave the implementation unchanged. This proposal requires review before optimization; yield removal and lease weakening are rejected.

## Commands, assertions and limitations

```bash
PATH=/Users/zsviczian/.local/share/fnm/node-versions/v22.22.2/installation/bin:$PATH \
KPLEX_TEST_VAULT_NAME=kplex-test \
KPLEX_TEST_VAULT_PATH=/Users/zsviczian/Obsidian/kplex-test \
KPLEX_TEST_CONFIG_DIR=/Users/zsviczian/Obsidian/kplex-test/.obsidian \
KPLEX_HOST_REPORT_DIR=/private/tmp/kplex-si5-waits-warm-2026-10-04 \
KPLEX_SI5_WARM_CENTER=Welcome.md \
KPLEX_SI5_RESTART_RUNS=3 KPLEX_SI5_MEASURE_WAITS=true \
caffeinate -d -i node scripts/testing/obsidian/startup.mjs
```

Exit **0**, three passes; foreground **66/66, 66/66, 69/69** samples, normal background throttling enabled, CLI reconnects **0**. Fresh backup `/private/tmp/kplex-si5-waits-before-2026-10-04`. Original settings and community-plugin list preserved; source-head streaming hashes unchanged each run. **18 aggregate evidence assertions** pass, including interval arithmetic, zero pending/rejected/throwing observers, owner overlaps, source work and cleanup. Driver/helper tests **10/10** pass using `node --test tests/obsidian-runner.test.mjs`; `node --check scripts/testing/obsidian/startup.mjs` and `git diff --check` pass. Full production verify/build remains the exact posting checkpoint (199 browser tests); no production edit required repeating it for this driver-only measurement.

Untimed preflight initially stalled: its navigation notification fired before the new view subscribed, and the active excluded synthetic hub replaced the requested representative center. Two short aggregate CLI checks were made only during that untimed setup; no timed restart had begun. Once the listener existed, the existing navigation notification selected the representative center and allowed preflight to finish. The driver now waits for a listener and verifies the actual selected center before readiness. This fixed driver path needs a subsequent native run; the three timings used the older preflight plus that manual recovery. No task was cancelled/restarted and no timeout was increased.

CLI retains its individual 30-second cap, five-second polls and ten-second reconnect delay, with no outer readiness deadline; native work continues independently. This series had **no actual CLI timeout/disconnect**. Initial submission/cleanup still require a responsive CLI. Timing wrappers/opt-in/controller were removed; private owner sets **0**, retained report frozen with **21** phases. Restoring original excluded hub settings makes live status `updating`; historical strict-ready measurements remain valid, not current readiness guarantees.

Manual risk: when the next candidate is authorized, validate interruption, source replacement and repair during the consolidated read, then retest the same foreground artifact. Physical mobile remains separate. For the progress-label correction, check a production restart that retries and distinguish metadata comparison from cache rechecking; the closed personal run cannot be reconstructed.
