# Sync activity and cached graph hydration

Branch: `fix/sync-hydration-backlog`, based on main
`e757239ce41a29934bc8a2b74d598146b2bd7e10`. On 2026-11-03 the maintainer authorized publication and merge after reviewing the residual risks and validation gaps recorded below. That authorization does not add test evidence or establish the remaining platform/production acceptance.
Node: 22.22.2. No schema, settings, release version or background pacing change.

## Observed failure

The supplied macOS 1.15.0 report recorded a roughly 23-minute restore, including
22 minutes waiting for source authority. Later decisions repeated full builds
with creation and startup reasons. Subsequent metadata edits took the ordinary
per-file path; the report does not identify an image edit as the original cause.

A passive Windows production observation at 2026-11-02T20:41:47.931Z found
11,821 Markdown files, 3,325 pending known owners, source reconciliation at
879/11,821, and zero full snapshot page reads or attempts. All Markdown paths
were dirty. The renderer was hidden and unfocused; no source bodies had been
read or parsed. The cache was waiting for the source audit, rather than taking
minutes to deserialize graph records. Raw private evidence remains in
`%TEMP%/kplex-sync-hydration-live-vM99AN/snapshot.json`; it contains vault data
and is intentionally not committed.

## Changes and retained safeguards

- A complete compatible schema-3 Eager cache with a changed physical signature
  may hydrate cached presentation before the source audit. It does not certify
  current relationships or permit stale relationship writes. Source closure and
  the authoritative compiler still establish current semantics. The exact-fresh
  warm route remains unchanged.
- The existing single bounded hydration retry also covers that deferred active
  cache. Real foreground publications must still have matching authenticated
  source fingerprints. Existing lifetime, policy, native identity/stat,
  membership, publication accounting and size bounds remain in force. A native
  test exposed this race after the initial browser regression already passed.
  Before that retry, deferred-cache restoration joins already-running center
  tasks: their metadata awaits can temporarily release scheduler priority between
  structural and file publication. This is a finite join of existing owners,
  with no extra retry, timer or work queue. The exact-fresh route is unchanged.
- A genuinely newer observed revision of the current source-comparison owner is
  reacquired without discarding the validated prefix. Global/topology changes,
  unobserved metadata replacement, equal-stat raw-body edits and lost native
  identity still retire the pass. The complete regression lane caught the
  equal-stat case; its original rejecting assertion was retained, and retry
  admission was narrowed instead.
- Successful full publication retires only its captured generic creation reason.
  Newer creation stays structural; newer metadata remains a per-file backlog.
  Partial or failed publication cannot retire a creation.

The intentional five-minute quiet-period debounce for saving edited snapshots
is preserved. Frequent sync activity can leave the last saved graph physically
stale; this change makes that cache useful without declaring it current.

## Regression evidence

Failing-before logs are private temporary artifacts:

- `kplex-sync-stale-before.log`: complete cache remained behind a held audit.
- `kplex-sync-backlog-before.log`: covered creation caused another full rebuild.
- `kplex-sync-prefix-before.log`: selected-owner event repeated Owner0.
- `kplex-sync-stale-foreground-before.log`: real unchanged foreground publication
  caused changed-vault hydration to fall back to source recovery.

The added tests exercise real GraphIndex/source coordination and IndexedDB, and
production coordinator methods. The final focused hydration/startup run passed
57 tests; the source-event convergence run passed 17 tests. Existing fresh-cache
and changed-source safety assertions remain unchanged. Earlier PR261 extraction
fixtures were repaired by including their real dependencies, without weakening
assertions or accepted goldens.

## Native validation

Maintained scenario: `scripts/testing/obsidian/syncHydration.mjs`, requiring the
explicit disposable `kplex-test-small` target. Staging uses the shared application
user-data lock and hash-verifies built artifacts. It waits for ordinary snapshot
persistence, changes only owned notes offline, holds one unrelated actual audit
read, verifies cached hydration separately from authority and progress counts,
applies a newer edit, and checks final parity plus a real healthy warm reload.

Early native runs failed first on an underestimated fixture persistence wait,
then exposed foreground publication supersession. Those failures are not passes;
each reported successful independent cleanup. Final candidate results and exact
artifact identities are recorded below when the shared native lane completes.

The first final-artifact run (`kplex-sync-hydration-native-nQeV8B`) passed cached
hydration and truthful held-audit progress, but timed out on final convergence.
Retained diagnostics show actual hydration in 7,383 ms, two bounded attempts and
the full-snapshot route. The 58,984 ms `hydratedMs` in that early scenario report
also included waiting for audit entry and must not be interpreted as hydration
duration. The window was hidden when inspected after cleanup, and source
reconciliation was still progressing. This is a failed convergence run, not a
pass. The maintained rerun records actual hydration diagnostics, recovers a
hidden disposable window without changing throttling, and retains the 15-second
cache bound and 90-second convergence bound. It also exposes the held-read release
to the existing deadline cleanup owner.

The next rebuilt artifact (`6508391e...`, `kplex-sync-hydration-native-FJ0q0I`)
exposed the split structural/file center-publication race. It exhausted its one
retry and safely fell back to source recovery while the audit was held. Cleanup
passed. `kplex-sync-center-order-before.log` reproduces this with the genuine
center producer and a real reader; `kplex-sync-center-order-after.log` passes
153 affected foreground/startup/lifetime/source/hydration tests after joining
existing center tasks. The expanded hydration file separately passed 48 tests,
including a changed-source pair that must still reject cached replacement. Its
changed-input fixture updates actual host lexical facts and the canonical parsed
body cache, following the established guard fixture's setup.

## Verification execution

`npm run verify` was executed repeatedly. After repairing the extraction fixture
inventories, the aggregate passed release/architecture/core/lint/indexing and
1,906 main tests. Its browser lane passed 462/463 tests; one Chromium document
remained at `ready: loading`, before the production bundle ran. The unchanged
five-test saved-list file passed on isolated rerun. An earlier aggregate had a
similar startup failure in a different browser file; that unchanged 23-test file
also passed on rerun. Neither aggregate is reported as an uninterrupted green
verification. The final bounded-retry edit was made during the last aggregate;
its affected 57-test lane and complete source/IndexedDB lanes were run afterward.

The final portable source lane passed 357 tests. The 20,015-owner real-IDB case
passed its existing exact-output, source-free, full-build-free, linear-work and
cancellation assertions: 8,187,369 owner checks, one direct canonical pass, no
optional root pass, and two cancellation yields. Its measured publication time
under concurrent validation load was 204,061 ms, not a production navigation
benchmark. No golden or accepted time/work bound was changed.

The complete real-IDB source lane ran 889 tests: 888 passed and its existing
equal-stat raw-modify rejection caught an over-broad owner retry. After narrowing
that admission, the final 101-test lifetime/event-convergence/startup/hydration
run passed, including the unchanged failing assertion and all new regressions.
That final guard change requires a separately rebuilt native candidate; the
earlier artifact's functional results are not attributed to the new binary.

That preceding artifact (`cc9712ae...`) subsequently passed the complete native
workflow in `kplex-sync-hydration-native-w1Ysyi`: actual cache hydration 856 ms,
current graph including the newer edit 9,544 ms, and healthy warm reload plus
three semantic destinations 7,108 ms. Warm work had zero full builds, body reads,
parses or additional semantic requests. One hidden baseline window was recovered;
final visibility/focus were true and original background throttling stayed true.
Cleanup and exact configuration-byte restoration passed. These timings are for
the 102-note functional fixture, not the large production vault.

## Final exact-build result and deployment

[Native receipt](sync-hydration-2026-11-02.json): Windows Obsidian 1.14.5,
Node 22.22.2, `kplex-test-small`, 102 Markdown files. The final run completed at
2026-11-02T22:33:02.430Z with successful independent cleanup and exact settings
and enablement-byte restoration. The window stayed foregrounded without a
recovery, and normal background throttling remained enabled.

| Measurement | Final result |
| --- | --- |
| Complete cached graph hydration while real audit held | 633 ms |
| Current graph including newer edit | 9,084 ms |
| Current recovery source work | One read/parse; one rebuild; no failures/backlog |
| Actual healthy warm reload plus three semantic destinations | 7,525 ms |
| Warm work | Zero full builds, reads, parses, additional semantic requests |
| Held-audit user status | Validating note metadata — 3 / 102 notes (2%) |
| Held-audit authority | Cached graph available; current global coverage false |

The final production build and lint passed. Exact artifact SHA-256:

- `main.js`: `4f7f67b2af446859ac5c2e625cd09d6c4873670637103b3c6fc01b657bdecca2`
- `styles.css`: `d89188385a224f257da98ca48b41ea1e0fe9dd14f67f45012a51b144fb492ab1`
- Unchanged manifest: `8c65b0d38a506f8fa9fc3311b81ea22bcda48e0209e9190483752c1f20834326`

At 2026-11-02T22:33:48.709Z a second passive production snapshot found the old
running process still incomplete: 4,458/11,821 files indexed, 4,496 pending known
owners/graph sources, every Markdown path dirty, zero full-cache attempts/pages,
and hydration timed out in source authority. The source progress was resolution
reconciliation; its counters showed two body reads/parses and zero failures.
The renderer was hidden and unfocused. This confirms that the visible wait was
not large graph-record deserialization; hidden-window pacing can further extend
it. The observation does not establish the exact originating image edit.

Only the validated `main.js` and `styles.css` were copied into production, with
hash verification and backups outside the vault. Manifest, plugin data and
community-plugin configuration hashes were unchanged. No production reload,
restart, note change, navigation or cache mutation was performed. The existing
process continues to use the previous code until a normal reload. Private
production evidence/backups: `%TEMP%/kplex-sync-deployment-0p7zT8/`.

## Limits and remaining validation

Windows native evidence is separate from the user's macOS report. Synthetic
source collisions do not establish physical two-device Sync acceptance. Small
functional timing does not establish 11,821-note production timing. Hidden-window
timer clamping is unchanged. No production notes, settings, caches, navigation,
plugin enablement or application restart are authorized by this task. Only
`main.js` and `styles.css` may be deployed there.

Highest-probability regression: incorrectly accepting a cache during a concurrent
source/topology/policy change. Real-IDB fence tests cover this; manually check a
two-device save/rename wave with an open Plex on Windows and macOS, then verify
that final relationships agree with the edited notes. Mobile and popout behavior
have not been established by this Windows functional lane.
