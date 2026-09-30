# SI4 clean-package isolation — 2026-09-30

The source package is based on committed `indexing-optimization-v2` HEAD
`140398f55cc24aea17166b361c09a83fa96fd7dc`, which includes accepted C2-S2a.
Before isolation, the exact mixed working tree was preserved as
`/private/tmp/kplex-s2b-mixed-preserved-2026-09-30.zip`, SHA-256
`b601f6ddd65ed803216cf515927d518ee709d287fa1f16043e123ab20db9f0f2`.
The source package itself has no Git metadata; its ZIP checksum is reported with
the handoff and cannot be embedded in the ZIP without changing it.

Only the validated SI4 historical-lease correction and private clean-host pair
reader were overlaid on that committed base. The lease slice consists of
`SourceContributorLease.ts`, acknowledged deletion and retry ownership in
`SourceRepository.ts`, and the cleanup-only existing-database port in
`IndexedDbCache.ts`. The pair slice consists of `CachedRequestedPair.ts`, the
additive explicit-structure/empty mode in `CachedSourceSemantics.ts`, and the
synchronous `SourceContributorDiscovery.isHostCurrent()` observation. Both slices
retain their portable and browser test fixtures. The new real-IDB lease suite
tests aborted deletion, later exact retry and database-version safety without
calling S2b's rejected host-impact group.

The S2b all-owner `contributorHostTransitions` atlas, resolution-observation
adapter, observation DTOs, changed-host acquisition/frontier changes, terminal
`storeContributorHostImpact` group, optional summary observer and three S2b-only
test suites are absent. Their investigation, locality counterexample and missing
host-relevance premise remain recorded in the contributor contract and refactor
ledger as **historical rejected evidence**, not callable production APIs. The
accepted S2a journal, neutral source storage and unchanged-host proof remain.
No public settings route, GraphIndex consumer, query publication, schema or
source-head format changed in this isolation.

Validation used Node 22.22.3 and the installed real repository dependencies.
`npm run test:sources` passed **93/93**; architecture **7/7** and core **6/6**
passed; Obsidian lint and the real TypeScript/esbuild production build passed.
`npm run test:sources:browser` passed **67/67** in real Chromium, including the
clean-base requested-pair and isolated lease fault tests. `npm run verify` did
**not** pass: after architecture/core/lint and 24 production settings-independence
scenarios, the unchanged URL-heavy graph-patch timer measured 57.7 ms against
its strict 50 ms bound. The timer, golden and implementation were not altered.

The package is a clean next-development base, not SI4b1 acceptance. Pair
preparation still requires a complete current journal-free root and one policy;
it cannot certify a neighborhood, exact gate counts, search or edits. Actual
host changes remain UNKNOWN without a complete affected-referrer premise.
There is no new live user workflow to test manually. Native, performance and
device acceptance belong to the later public SI4/SI5 route.
