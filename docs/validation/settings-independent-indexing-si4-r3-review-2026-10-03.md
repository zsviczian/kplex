# SI4-R3 return review — 2026-10-03

**Verdict: incomplete; not accepted.** The exact 13-file return from base `67cea09` is checkpointed at `56a6e68` on `indexing-optimization-v2`. Accepted implementation remains SI4-R2 at `831e345`. The next correction builds on the returned code. SI5 and C15–C26 remain pending/paused.

## Useful delivered behavior

Real Chromium/IndexedDB confirms that the 20,015-owner source-local lookup completes in 79 membership pages with 78 cooperative yields, exact ordered owner count and no result prefix on cancellation. The source-local production path also traverses the former owner/candidate/structural/relation limits in smaller fixtures. No database upgrade, alternate semantic implementation or global contributor-catalog bootstrap was introduced.

Lookup diagnostic:

```json
{"owners":20015,"projected":20015,"scans":79,"work":{"keys":1,"keyPages":1,"pages":79,"rows":20015,"owners":20015,"yields":78,"peakItems":20015,"peakBytes":5822160},"cancelYields":1,"outcome":"ready","cancelled":"cancelled"}
```

The reported bytes are the return's estimate, not measured heap or the complete retained memory footprint.

## Blocking findings

1. **All-owner validity scans are repeated at record granularity.** `CachedSourceSemanticReader.prepare()` supplies a compiler/replay `current()` callback that invokes every captured owner's `host.isCurrent()`. Neighborhood and candidate-degree owners also scan all captured hosts in their parent callback. Replay/compiler invoke these callbacks throughout record processing. Removing the owner cap exposes quadratic owner work; slicing outer loops does not correct it. The scope preparer's `sourceIds.includes()` is another linear membership check per source. Keep cheap policy/demand/host-generation cancellation on the hot path, check the active source locally, and cooperatively revalidate all selected inputs before final publication.
2. **Aggregate retained-memory protection was removed without replacement.** Lookup retains every full head, discovery retains structural facts plus serialized deduplication keys, and replay retains owner callbacks/stamps, preparation inputs and the compiled scope. Former aggregate byte guards became single-record/path guards. `peakBytes` counts only a fixed 256 bytes plus source ID/revision lengths per head; it omits head/family fields, key/count maps, page entries, returned arrays, captured hosts, structural facts and compiled graphs. Batches/yields constrain scheduling and temporary page sizes, not the complete retained footprint. Measure/account for required final scope state separately from transient duplicated state; bound/release transient buffers and retain an explicit safe memory policy that still admits the target case. Do not introduce a generic spill/proof framework merely to satisfy this review.
3. **20,015-owner final semantics and production publication are untested.** The large lookup fixture clones one template's manifests into synthetic heads and does not give each owner independently replayable source facts. Its 20,015 rows test lookup only. The replay fixture uses 257 real owners; no high-degree settings test reaches GraphIndex publication and the complete view/degree/gate/search/edit path. Add one independently replayable large-owner case through the existing production path, plus work-growth assertions and cancellation/finality checks. Full native SI4 acceptance remains pending.

## Deterministic work-growth probe

Using the existing production `replayFixture`, acquire empty owners, wrap each captured host's `isCurrent()` to count calls, then call `prepareCachedSemantics()` once. No product code is modified by the probe.

| Owners | Host validity calls | Elapsed ms |
| --- | ---: | ---: |
| 128 | 1,409,664 | 711 |
| 256 | 5,606,144 | 2,598 |
| 512 | 22,358,016 | 14,202 |
| 1,024 | 89,298,944 | 60,349 |

Counts demonstrate quadratic growth. Timings include instrumentation and concurrent verification; they are diagnostic, not native performance measurements. Empty sources are sufficient to expose the issue.

Reproduce in a local `.mjs` file using the repository's fixture:

```js
import { M, replayFixture, policy, presentation, runtime } from "./tests/support/cachedSourceFixture.mjs";
for (const count of [128, 256, 512, 1024]) {
  const f = replayFixture();
  try {
    const ids = Array.from({ length: count }, (_, i) => `Owner-${i}.md`);
    for (const id of ids) {
      f.add(id, "");
      await f.acquisition.acquire(f.files.get(id), M.parseBodyMetadata(""));
    }
    const capture = f.acquisition.captureForReplay.bind(f.acquisition);
    let checks = 0;
    f.acquisition.captureForReplay = async (...args) => {
      const result = await capture(...args);
      if (result.outcome === "ready") {
        const live = result.request.host.isCurrent;
        result.request = { ...result.request, host: { ...result.request.host,
          isCurrent: () => { checks++; return live(); } } };
      }
      return result;
    };
    const result = await f.acquisition.prepareCachedSemantics(ids, policy(), presentation, runtime());
    console.log({ count, outcome: result.outcome, checks });
  } finally { f.close(); }
}
```

## Independent verification and review corrections

Required Node 22.22.2 with the full locked dependency tree: architecture **7/7**, core **60/60**, aggregate Node **133/133**, UI browser **7/7**, portable sources **312/312**, lint exit 0 with the existing `CachedRequestedDirectOrder.ts:183` warning, real production build exit 0, and whitespace clean.

The initial full browser run reports **164/168 passing**: two actual failing subtests plus their parent-suite failures. The new large-center fixture expects 8,193 total neighbors but production correctly includes 8,193 virtual references plus the folder parent (8,194). The unchanged legacy-catalog browser test expects the old early parent-frontier backpressure; the reader now reaches the retained catalog's `unsupported-scope` boundary. Main-agent corrections assert the exact virtual/folder membership and update the legacy test consistently with the returned portable test. The sequential focused rerun of both affected browser files passes **65/65**. No production code was changed during review; the unaffected browser files passed in the full run. `npm run verify` was not rerun wholesale after the test-only corrections, and passing these tests does not establish R3 acceptance.

Initial sandbox-only browser attempts could not listen on localhost; the actual browser results above come from unrestricted runs. Obsidian CLI currently cannot find the application. No fresh native acceptance or physical-device evidence is claimed. No maintainer manual test is needed before the implementation correction.
