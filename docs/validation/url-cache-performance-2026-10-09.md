# URL-cache reconstruction performance

Branch `fix-url-cache-slowdown` starts at merged main `591680946bd3e3e709d4ee7cbf2bea6732a0f3c8`.
The maintainer authorized fixing healthy URL restoration cost after merged PR #95 closed #34.
This is separate from the accepted 90-second inactivity/lifetime fix. C15–C26 remain paused.

Final status: implementation reviewed and all local/native gates passed. The maintainer authorized
commit, branch publication, PR creation and merge from `fix-url-cache-slowdown`. Earlier pending sections below
are chronological checkpoints; final acceptance and limits are recorded at the end.

## Baseline identity and coverage

Accepted installed `main.js` SHA256
`7bbcf028ddbcd091ee6292b55e5a43dfb08081b161ae8fc94a3beb79a86933a0`, Obsidian 1.14.4/macOS,
pinned Node 22.22.2, disposable `kplex-test` with 20,015 Markdown files. No cache or note deletion.
The original main index remains loaded; each detached actual GraphIndex restore uses the same
native Vault/MetadataCache/IndexedDB and canonical algorithms, with enumeration limited to the
first N cache owners. The native main index's background lanes are paused by one exact P1 lease
only during each measured case, released between/after. Maximum held case 28.4 seconds, below
the unchanged 90-second inactivity threshold. Native clone methods/prototype wrappers forward
actual work/results and are restored; detached indexes close and globals are removed.

The subset is controlled input, not a full-vault startup or semantic parity claim. The wrapper
records aggregate input/evidence/page/alias hashes without retaining note content in reports.
The semantic oracle preserves multiplicity/provenance and ignores private declaration IDs.
Both measurement drivers record installed hashes, heap samples, real owner counts and native
foreground visibility/focus/throttle; all accepted samples are visible/focused with original
responsive background throttling. Heap samples are not device/process peak memory.

Earlier whole-vault elapsed rates were not continuously sampled for foreground state. A new
preflight found hidden/unfocused background restoration, a significant confound. That does not
establish when earlier runs lost focus, nor justify attributing their entire delay to algorithms.
Those historical timings are not the performance acceptance baseline.

## Measured work

| Native subset | Wall | Page reads | Compaction input pairs | Compaction wall | Contributor records | Iterator-next CPU |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
|1,024 owners|9.322s|80.8ms|495,227|522.9ms|685,996|645.3ms|
|2,048 owners|28.396s|170.4ms|1,976,155|2,979.3ms|2,620,461|2,482.6ms|

These are sequential actual production-method measurements, not randomized performance
experiments or actual paint. Doubled input nearly quadruples repeated compaction/contributor
work. Storage duration is small in these samples. Explicit checkpoint wall sums 6.69/19.66 s
and alias wall 6.14/14.45 s overlap; recursive checkpoints can also overlap. Do not sum them
as exclusive latency/CPU. The original without-checkpoint wrapper 1,024 case takes 9.382 s,
consistent with the second 9.322 s but not a no-instrumentation overhead control.

Portable actual-method512/1,024/2,048 shared-URL input also yields compaction visits
51,384/201,144/795,576. Its independent host/timing doubles make timings a different
condition; use work counts for corroboration rather than comparing runtime speed with native.

Reports/temporary drivers:
`/private/tmp/kplex-url-native-before/`, `/private/tmp/kplex-url-native-attribution-before/`,
`/private/tmp/kplex-url-native-probe.mjs`, `/private/tmp/kplex-url-native-attribution.mjs`,
`/private/tmp/kplex-url-scaling-probe.{mjs,json,log}`. Driver/source hashes live in the reports.

## First approved correction and pending acceptance

Allow bounded exact-child evidence delta adoption into a working URL evidence layer only while
it is exclusively unpublished. Check that ownership at synchronous commit; an awaited stage
cannot assume the layer stayed private while a display flush occurred. Preserve immutability
of every published evidence pointer, IDs/counts/order/tombstones/path indexes, canonical page
identity, multiplicity/provenance and cancellation/publication boundaries. Ordinary Markdown,
published or large/over-limit deltas retain existing fork/swap and depth 8 compaction. Keep
existing 1,024 publication scale, pacing, yields and watchdog limits.

Implementation, paired post-change work/semantic oracles, full build/types/scanner and exact
native lifecycle/large-vault acceptance remain pending. Shared-origin/alias work remains a
separately measured term; this first change is not acceptance of the complete performance task.

## First correction: independent review and measured return

Root reviewed the complete evidence/GraphBuilder/GraphIndex diff and new tests. Exact-child
admission validates parent identity/revision and the existing 1,024 changed-pair limit before
any write. Tombstones preserve pair positions; IDs/counts/path indexes remain equivalent to
ordinary forks. The only production opt-in is the live comparison against published URL
evidence at synchronous commit. Ordinary graph callers retain fork/swap. No schema, ontology,
priority, yield, watchdog or compaction threshold changed. Focused root regressions 32/32 and
real `npm run build` pass on Node 22.22.2. Agent focused checks 70/70, actual types, touched
scanner and architecture pass; full verification is still pending.

Portable paired 2,048 owners compares actual base 5916809 source with the correction. Exact input
and unsorted graph/evidence/IDs/aliases hashes match. Compactions 255 → 0 and traversed compaction
pairs 795,576 → 0; origin records 500,326 remain unchanged. Sequential diagnostic wall 10.299 → 6.607 s
(previous corrected run 7.657 s demonstrates variability), not a native performance result.

Native exact corrected `main.js` SHA256
`88af068b450885647097aa14ead2350fc905dd21b4a205cdac89b5a7233d3006`:

| Owners | Baseline wall | Corrected wall | Compaction pairs | Contributor records |
| --- | ---: | ---: | ---: | ---: |
|1,024|9.322s|7.643s|495,227→0|685,996 unchanged|
|2,048|28.396s|27.265s|1,976,155→0|2,620,461 unchanged|

The same attribution driver/input/semantic hashes match exactly at both sizes. All observed
samples remain foreground with original throttling; cleanup removes controllers and leases,
retains 20,015 files and desktop state. At 2,048 owners alias/checkpoint inclusive wall 16.50/19.87 s
still overlaps; iterator-next CPU 3.03 s. A single sequential observation does not establish a
reliable 4% improvement. This return removes one repeated-work term but does not complete the
performance task. Reports `/private/tmp/kplex-url-native-first-after/report.json` and
`/private/tmp/kplex-url-scaling-paired-{base,current}.json` retain exact identities/results.

Atomic staging completed, but its strict configuration assertion FAILED because plugin reload
serialized existing default values into an originally sparse `data.json`. Parsed effective
settings equal the native baseline exactly; this is not a changed benchmark configuration.
Original bytes remain captured for final cleanup. Keep the failed staging report at
`/private/tmp/kplex-url-first-stage/report.json`; do not relabel it a passed staging run.

## Next bounded correction

The offline implementation now owns generic declared-target/source-kind counts and
selective original-declaration queries in the canonical evidence store. URL origin
reconciliation will retain its current supporting-kind policy and all origin
provenance, multiplicity and insertion order while avoiding unrelated contributor
scans. Summary metadata must be accumulated during existing record-visiting loops;
synchronous publication/adoption must not rescan a dense bucket. Fork, compaction,
rename, removal and cancellation all require equivalence tests. Alias work remains
a separate candidate until this correction is reviewed and measured.

The query index is explicitly activated only by URL-only patch/removal preparation;
ordinary Markdown reconciliation retains its prior scan and full compilation leaves
metadata inactive. This avoids introducing a broad first-edit preparation pass.
Activated descendants inherit metadata through copy-on-write. A child that first
activates/rebuilds its derived index must use fork/swap, rather than replay a broad
index through bounded synchronous adoption.

Preliminary separate-process, GC-assisted Node memory diagnostics use 50,000
synthetic canonical pairs. Ordinary retained heap is 49.74 MB at base and 49.70 MB
with inactive lookup metadata; activated shared-URL evidence is 58.34 MB versus
40.37 MB at base. The additional 17.97 MB is about 360 bytes per pair for this
fixture, not a whole-plugin or mobile peak estimate. Exact declaration digests
match. Source SHA `1d8498b68cde1e994722635168774e92bf4f6d2525587fbd369aaaac2301b0e9`
is preliminary; final-source checks remain pending. Temporary script/reports are
`/private/tmp/kplex-url-evidence-memory.mjs` and
`/private/tmp/kplex-url-evidence-memory-*-preliminary.json`. Construction was
synchronous direct insertion and parallel cases; its time is not URL-restoration
performance acceptance. Final repeats will run serially if timing is reported.

Frozen-first portable work attribution also records 494,136 neighbour entries and
390,144 alias entries copied by 8,143 page clones (53.8 ms synchronous method wall),
and 396,288 labels flattened during alias publication (67.3 ms synchronous method
wall). The 2,048-owner original graph/evidence/IDs/alias digest matches the prior
probe. Extra test-only alias counting affects pacing, so these are work-attribution
observations, not an additional matched performance baseline. No adjacency/alias
change has been made. Report: `/private/tmp/kplex-url-scaling-paired-first-attribution.json`.


## Second correction independently measured

Root reviewed canonical lazy target/kind summaries and cooperative ordered origin queries,
URL-only activation, bounded private adoption, tombstone cleanup, cancellation and TSDoc.
The unchanged driver, identical input and semantic hashes, effective settings, foreground
samples and cleanup were independently compared across all three native reports: PASS.
At 1,024 owners native elapsed was 9.323 → 5.589 seconds; at 2,048, 28.396 → 14.008 seconds.
Broad contributor records fell from 685,996 / 2,620,461 to 8,693 / 17,434; compaction visits
remain zero. Same artifact source is frozen in `/private/tmp/kplex-url-second-freeze.json`
(SHA b6473139df9c7e7b11d0c7198bc5fd8bf572ed232e503c5d157fb03a42094046).
Exact installed main SHA e1290766df65750e6789cc8622eb252be8876a2c26b070d9f17227e21acc9c22;
report `/private/tmp/kplex-url-native-second-after/report.json`. Inclusive scheduler and alias
wall times overlap and are not exclusive CPU attribution or paint timings.

Root's independent 55 focused regressions, production build and 400 seeded mixed-mutation
checks passed on the frozen final source. Offline 81 regressions/types/scanner/architecture
passed. Separate-process final GC-assisted memory reports retain 49.704 MB ordinary versus
49.740 MB base, and 58.919 MB activated URL versus 40.367 MB base, for 50,000 synthetic pairs.
The approximately 18.55 MB additional URL metadata is an explicit tradeoff; neither peak nor
native/mobile whole-plugin memory was measured. Full verification remains pending.

Remaining scaling is still superlinear. The already measured 390,144 alias contributor copies
and 396,288 flatten entries at 2,048 owners justify a third bounded alias correction. Preserve
owner insertion/replacement order and snapshot privacy; no adjacency or scheduling changes.


## Final alias correction and review

GraphIndex now prepares per-owner target/label deltas without cloning shared contributor maps.
New-owner appends consult private aggregate label membership; no-new-label appends reuse the
ordered facet array. Replacement/removal retains ordered contributor flattening and delete/reinsert
winner behavior. Compiler-mutated staged aliases are overwritten from authoritative facets at the
existing synchronous canonical publication. Published alias arrays remain separate flush copies.
Purge/unload retires the additional facet metadata and existing lifetime fences reject late work.

Root reviewed the complete final production/test/package diff against canonical ownership,
opaque identity, unchanged source kinds/policy, cancellation/revision/publication, multiplicity,
shared origin lifetimes, canonical TFile/page binding, cleanup and TSDoc requirements. One review
finding was corrected: final many-target alias derivation now participates in the existing
32-record/6 ms cooperative slice policy. There is no scheduling threshold or cache/settings/schema
change and structural refactoring remains paused. No UI or localization changes are introduced.
The additional aggregate Set uses O(distinct target labels) memory and shares its output array
with working pages. Distinct output-array copying and page adjacency cloning remain possible
superlinear terms; the implementation does not claim every URL/alias operation is linear.

Offline final focused lane passed 86/86, actual types, touched official scanner and architecture
(83 roots, 164 reachable, zero violations). Independent legacy alias oracle covers empty/duplicate,
replacement/removal/reinsert order; 1,500 repeated-label owners prove exact contributor-map,
facet-array and membership-Set identities with zero contributor enumeration. Canonical compiler
reapplication, snapshot privacy, 640-target final-phase cancellation and late purge/unload paths
pass. An initial always-advancing fake clock caused perpetual background pacing in the dense test;
that failed/interrupted receipt is retained. The corrected synthetic cancellation case uses actual
foreground priority without changing production policy. Full verification/native acceptance is
pending on source freeze SHA 467b2593be8a17bde7455cc9365ef69da3b07221610a0a50aded16d432384bbc
(317 inputs, `/private/tmp/kplex-url-final-freeze.json`).

Root independently repeated the final evidence memory diagnostic: ordinary retained heap
49.726 MB versus base 49.740 MB; activated URL 58.915 MB versus base 40.367 MB. Exact declaration
hashes match. These are separate-process GC-assisted synthetic Node measurements, not native
whole-plugin or physical-device peak memory. Reports `/private/tmp/kplex-url-evidence-memory-root-*.json`.


## Third-return full and native results; residual existence query

Root full verification PASS at 17:17:15 UTC on frozen 317-input source: architecture 7,
core 79, scanner, primary 480, UI 20, portable source 333 and browser IndexedDB 410 tests,
zero failures/skips, actual production build and native small-vault render/error smoke.
Report `/private/tmp/kplex-url-final-full-verify/report.json`; main SHA
`ecd7b1aa48f1cda1f7e2d00b1917e041626e964face990dfafa554c1b6b8910f`.
Native same-driver 1,024/2,048 input/semantic/settings/foreground/cleanup comparisons PASS:
9.323/28.396 → 4.669/11.302 seconds, compaction visits zero, iterator records 8,693/17,434.
Added 4,096-owner case completes in 28.166 seconds with 34,871 records and zero compactions;
its input/semantic SHA is retained, but it has no paired pre-change runtime baseline.
Report `/private/tmp/kplex-url-native-final-after/report.json`. Full main-index completion
is still observed separately without another graph allocation or performance-baseline claim.

The added scale case reveals iterator-next time 414.8 → 1,747.4 ms when input doubles,
despite linearly growing yielded records. Source tracing identifies the pruning existence call:
`declarationsTouchingIterator(path).next()` first constructs the complete recursive
`pairKeysForPath()` Set, even for a live first match. A fourth bounded correction will add a
canonical cooperative boolean existence query that checks current buckets lazily, preserving
shadowed tombstones, either endpoint and cancellation, without materializing all keys. Only
URL-only pruning opts in; ordinary Markdown behavior remains unchanged. No scheduler,
threshold, schema, classifier, alias or adjacency changes. This additional source change will
invalidate affected final gates until repeated; third-return passes remain valid historical evidence.


## Fourth-return review and final gate in progress

The normal third-return main index completed all 20,015 cached owners in foreground On demand
mode, with canonical file/page identities, 20,261 URL-graph pages and 150,508 declarations,
visible ready status, no stalled-cache diagnostic and no retained probe controllers. This is a
functional full-vault check, not a matched full-vault performance baseline. Receipt:
`/private/tmp/kplex-url-native-final-large/report.json`.

A generation-fenced streaming hash captured original declaration order, ordered aliases and
relationship entries without allocating a second graph. Private declaration IDs are excluded;
provenance and multiplicity remain. Third-return SHA is
`6b8f51e3b3b6a239d8da951bf91cb5c3dae09902f630e7309571cbf9c1621152`.
Exact driver SHA `03d0bef51dd1548e424d7e665ab37f49d43104972a67d10d3cbdefffba597b28`;
receipt `/private/tmp/kplex-url-native-third-full-hash/report.json`. Repeat on the final build.

Root reviewed the fourth source and all seven new regressions. The lazy canonical existence
query reads exact-current buckets across inherited path keys, preserves tombstone shadowing,
and checks every captured layer revision after awaited dense-negative slices. Cancellation
returns null and aborts private preparation before removing a candidate. Positive queries stop
without a compulsory checkpoint; ordinary Markdown pruning retains the existing iterator.
No retained metadata, sorting/order change or scheduling threshold is added. A 10,000-owner
positive regression visits one candidate; dense-negative cancellation and mutation fencing pass.
Offline 93/93 focused tests, actual types, touched scanner and architecture pass.

Both normal test and core lanes now include the new existence suite. Final 318-input source
freeze SHA `87dcf44fa7022a982d40ff60c9109c49f2c54f6bfa2cab855918ddde674dfc04`
(`/private/tmp/kplex-url-fourth-freeze.json`) is undergoing the complete root verification.
Final native comparison, full graph equality, timeout/unload and cleanup remain pending.

Final-source independent retained-heap diagnostic preserves both original declaration digests:
ordinary 49.704 MB (no activated metadata), URL 58.845 MB versus base 40.367 MB. The approximately
18.48 MB extra in this synthetic 50,000-pair URL store comes from already documented derived
lookup metadata; the fourth query adds no retained structure. Receipts
`/private/tmp/kplex-url-fourth-memory-ordinary.json` and `...-memory-url.json` use the exact frozen
evidence source and pinned Node 22.22.2. This excludes aggregate alias metadata and does not
measure native whole-plugin or physical-device peak memory.


## Final full verification

Root final `verify:obsidian` PASS, 17:32:29–17:44:44 UTC, pinned Node 22.22.2,
Obsidian 1.14.4/macOS. Architecture 7, core 86, main 487, UI 20, portable source 333,
browser IndexedDB 410 tests; zero failures/skips, official scanner, actual production build,
registered command, rendered Plex and no captured JavaScript errors. Large 20,015-owner
browser regression and publication/cancellation/identity lanes pass without guard relaxation.
Source freeze remains exact. Receipt `/private/tmp/kplex-url-fourth-full-verify/report.json`
and log `/private/tmp/kplex-url-fourth-full-verify.log`.

Final main SHA `24e21ab49242b700125cae6367207d2edab8bcbe113b5287acb3cd184f00d032`;
CSS `05c59fe68c56784fb3e727056b7e27aee65f7f595d7145e4710b75f660dacc55` and
manifest `19799fff9ae459130d707901e7c0d98b3e14a8567881a393f07d457c2fa8ec1c`
remain unchanged. Atomic large-vault staging PASS with configuration bytes preserved and no
stage controller: `/private/tmp/kplex-url-fourth-stage/report.json`.


## Final matched native subset acceptance

Same exact attribution driver, original cached input digests, settings, foreground visibility/focus,
responsive throttling and cleanup match across baseline, third and fourth builds. Semantic digests,
owner/page/declaration counts and availability match at every comparable limit. Root comparison
PASS: `/private/tmp/kplex-url-fourth-comparison.json`; native final receipt
`/private/tmp/kplex-url-native-fourth-after/report.json`, driver SHA
`1b22f33403baa744679e1a6fdf388aa64a6e782dba20a2f04f8002de5254c3df`.

| Cached owners | Original baseline | Third build | Final build |
| --- | ---: | ---: | ---: |
| 1,024 | 9.3225 s | 4.6693 s | 4.6164 s |
| 2,048 | 28.3963 s | 11.3023 s | 9.9241 s |
| 4,096 | Not captured | 28.1655 s | 23.5554 s |

The final 2,048-owner subset is approximately 65% faster than the original baseline. These are
single sequential foreground runs, not universal startup/paint/device latency guarantees.
Compaction input visits stay zero. Original iterator records are now zero in URL pruning;
measured iterator-next time 1.8/4.1/12.5 ms covers remaining empty iterator calls, not the new
lazy query's CPU or total restore CPU. The independent 10,000-owner regression proves one
lazy positive candidate and zero whole-degree key-set materialization. Dense negative scans
remain cooperative. Alias/checkpoint wall sums overlap; they cannot be added as exclusive costs.
Residual output-array/page adjacency copying and intentional background pacing are unchanged.
No further performance refactor is included.


## Final normal main-index and full-graph acceptance

Final normal foreground On demand restoration completed all 20,015 owners and published owners,
with zero pending publications, 258 URL pages, 20,261 URL-graph pages and 150,508 declarations.
Every physical Markdown page and owner retains the canonical native TFile identity/revision;
no missing or wrong physical bindings, visible ready status, expected search result, empty
index diagnostics, no captured JavaScript errors or probe controllers. All samples preserve
foreground focus/visibility and original responsive throttling. Receipt
`/private/tmp/kplex-url-native-fourth-large/report.json`. This functional run includes the preceding
controlled subset leases and is not a matched uninterrupted full-vault timing baseline.

Exact streaming driver/full graph result matches the third-return capture: SHA
`6b8f51e3b3b6a239d8da951bf91cb5c3dae09902f630e7309571cbf9c1621152`, 150,508 declarations,
20,261 pages, 20,015 owners. Unsorted declaration order, ordered aliases/relationship entries,
provenance and multiplicity are preserved; private declaration IDs remain excluded. Exact final
artifact verified. Receipt `/private/tmp/kplex-url-native-fourth-full-hash/report.json`.
The paired portable fixture separately checks private IDs and unsorted evidence against baseline.
No claim of full Markdown/source inventory authority follows from URL completion in On demand mode.


## Final lifetime and cleanup acceptance

Both native modes preserve the real 90-second inactivity fallback: On demand90.035s and
Eager90.067s. Snapshot continuation occurs after the bound; late held cache results publish no
new owners. Eager's legitimate snapshot continuation may change the main graph, so timeout
acceptance does not assert that its state pointer stays unchanged. Actual plugin unload settles
held public waits in1.044/1.046s; retired owners remain empty, no catalog continuation occurs,
late results cannot change the retired graph, and priority/lifetime resources close.
All four scenarios and their cleanup PASS on the exact final artifact; no CLI failures or
captured JavaScript errors. Receipt `/private/tmp/kplex-url-final-lifetime/report.json`.
Driver SHA `3a9569f3998357e13c1d73305918b77cb1cec984bcfdbb09748315b428782271`.

Outer final cleanup independently restores both original workspaces, desktop/mobile state,
window bounds/minimum size, responsive throttling, file counts20,015/73 and original
configuration bytes/absence. Three-second delayed readback verifies data/community/hotkeys/types
SHA identities; no probe globals remain. Receipts
`/private/tmp/kplex-url-fourth-cleanup-large/report.json` and `...-cleanup-small/report.json`.
Original large sparse data SHA `1393255274aafa2fe5abe7eb3c2eb006b3ae0b3d42b88b70df871d0d43178a3a`;
small SHA `7168bd26642d06082da37d738d379658c42960438e1a066d511230a2086b8fd1`.
First staging normalization failure and synthetic cancelled-test receipt remain disclosed above;
neither was relabeled as a pass. Source/bundle searches find no temporary native probe prefix.
The task-owned idle-sleep inhibitor has been stopped. Final source freeze and `git diff --check`
remain clean; only reviewed source/tests/package and durable/transient documentation are changed.

All requested desktop checks are complete. Highest-value optional maintainer coverage is a
warm reload of a large shared-URL vault on a physical mobile device, observing readiness and
memory pressure: derived URL lookup metadata adds measured retained heap, while desktop/native
and Node measurements cannot establish physical-device peak memory. Ordinary Markdown retains
no extra activated index. This task changes no touch/UI behavior, persisted schema/settings,
priority policy or timeout/compaction thresholds. No physical-device performance claim is made.
