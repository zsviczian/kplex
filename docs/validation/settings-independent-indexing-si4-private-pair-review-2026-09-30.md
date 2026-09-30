# SI4 private requested-pair review — 2026-09-30

This review covers the offline return identified by input archive SHA-256
`f458d6c83b2c3eb5c9426f238775d4f5c8d479e0e8c514edef7d8db15cfa251c`.
The return changed 13 files from that archive. It adds a private exact-pair reader and
tests; it does not route settings, GraphIndex, search, gates, explanations or edits.
The uncommitted rejected all-owner S2b experiment remains in the working tree and is
not accepted by this review. C15–C26 remain paused.

The reader composes authenticated complete-direct discovery, exact selected heads,
canonical cached semantic preparation and final root/journal/host/policy/demand
fences. Source-owned structure is replaced by the certificate's ordered host facts
once. Empty and host-only covers use the canonical compiler and still receive final
host and journal checks. The result is a point-in-time **pair** proof only. No public
consumer or publication path exists, so there is no new native user workflow to test.

The initial real Chromium run found one failed parity assertion. The actual and
expected edge objects had equal keys and values but different property insertion
order (`parentType` versus `leftFriendType`). The browser helper compared their
`JSON.stringify()` output. The review changed only the test's pair-view projection
to sort edge property keys; all values, evidence/provenance fields, duplicates and
directed decisions remain compared. The focused 19-case browser suite then passed.

Main-agent environment: Node 22.22.3 with installed repository dependencies and
real Chromium. `npm run test:sources` passed 102/102; architecture 7/7, core 6/6,
Obsidian lint and the real production build passed. The full Chromium source suite
passed 75/75 on the confirming run. A prior aggregate run passed its assertions but
failed when an older IndexedDB suite removed its disposable Chromium profile
(`ENOTEMPTY`); that suite passed 11/11 in isolation before the confirming full run.
`npm run verify` did **not** pass: after architecture/core/lint and 24 production
settings-independence scenarios, the unchanged URL-heavy timer asserted a 69.0 ms
gap against its strict 50 ms bound. A standalone indexing rerun stopped at another
unchanged strict timer (list-whitespace, 98.3 ms against 45 ms). No timer/golden was
relaxed or treated as a pass.

To check independence from rejected S2b, a disposable clean extraction of committed
HEAD `140398f` was given only the pair files, two test-fixture additions,
`CachedSourceSemantics`' additive structure mode and the `isHostCurrent()` method.
It passed 21/21 portable pair tests, 19/19 real IndexedDB assertions and the real
production build. One isolated Chromium run had a disposable-profile `ENOTEMPTY`
teardown error; a repeat passed 20/20 including its parent suite. This proves the
private slice does not require S2b's all-owner reobserver; it does not accept S2b,
certify changed-host BREF-1, or make SI4b1/SI4b2/SI4c complete.

Review disposition: the private pair logic and targeted tests are sound at the
stated clean-host boundary, but there is no commit or formal SI4 checkpoint yet.
The mixed rejected S2b working tree must be separated before repository acceptance;
the aggregate `verify` timer remains a recorded unresolved gate. No maintainer
manual test is useful for this private, uncalled code. SI5 retains exact-build
latency, memory and device acceptance for the eventual public route.
