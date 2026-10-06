# Reference reload and source-work progress — validation

Follow-up W5 on `indexing-fixes`, base `2a450b9`. Implementation and automated source-progress acceptance are complete; reference-vault verification remains pending permission. C15–C26 remain paused. This report extends, rather than replaces, the [earlier warm/folder acceptance](warm-folder-counts-2026-10-06.md).

## Reference observation

The maintainer explicitly requested a reload of the personal reference vault after reporting remaining `…` labels. Before reload, its installed `main.js` SHA-256 was `3217fba5331e854c04092f912ca6df996767fa2faaf070e71a421b421c51bb9f`, exactly the earlier accepted build. It had no certified source dependencies or canonical requested scope, one host preview, and many unknown/lower-bound gate labels.

The requested reload selected a stale complete snapshot. Its targeted saved preview initially displayed numbers, including pages whose saved physical revision no longer matched current files. Those old numbers therefore could not become current count proofs. Startup then validated current host metadata and persisted source inputs. Whole-file progress stopped at 706 checked owners; the 90-second inactivity watchdog eventually timed out in `source-authority` and started a fallback full build. The fallback reused cached bodies with no Markdown reads/parsing in the sampled interval. No JavaScript errors were captured.

The renderer was hidden during the observations, including immediately after a window-focus request. Hidden timer throttling and dense source work can lengthen cooperative operations; the probes do not prove which exact operation caused this particular inactivity interval. No methods were wrapped and no temporary controller was installed in the reference vault. Its code, notes and settings were not written by the agent, and throttling was not changed. The requested reload is the only exception to the earlier no-reload constraint; normal plugin startup/cache work follows from that action.

The earlier claim that both issues were completely fixed was too broad. Trusted warm incidence and native folder membership are covered by W1–W4. A stale restart still needs current incoming-contributor closure: MetadataCache backlinks alone cannot prove body/plain-value ontology, alias changes or Date-property interpretation. The correction does not disguise unknown totals as current saved numbers.

## Bounded correction

The source repository already validates chunks/posting batches, hashes finite family input and commits dependency staging/count pages. Previously none of that advanced the restore watchdog until an entire source finished. A dense source could continue doing real work longer than the inactivity interval.

An optional, aggregate completed-work callback now reports those existing work boundaries outside transaction callbacks. The cache forwards it to GraphIndex, which updates `lastProgressAt` only during a running `source-authority` phase. Observer exceptions are isolated; when no observer is supplied, reporting skips additional currentness checks. Bare yields, blocked I/O, null scanner steps and cancelled/closed work do not manufacture progress. The existing timeout duration, timers, yielding, storage/schema, source-readiness and editing authority are unchanged. No new scheduler or incoming-coverage lane is introduced.

## Focused checks

The actual Chromium/IndexedDB regression passes with a 600-declaration source: exact parsed fields, ordered occurrences and URLs; completed dense work across a simulated cooperative clock exceeding 90 seconds; no heartbeat during frozen first-chunk I/O or bare continuations; activation/dependency closure preserved when the observer throws; and no late callbacks after close. Initial test-oracle failures compared JSON object key order; the final comparison sorts object keys recursively while preserving array/provenance order and exact values.

The deterministic GraphIndex watchdog fixture passes with whole-file and dense-chunk progress separated by 60-second intervals. A further 90 seconds without actual work still times out, and late progress cannot rewrite terminal diagnostics. Installed Obsidian typing and scoped scanner checks pass.

## Final evidence and scope

[Exact evidence](warm-reload-source-progress-2026-10-06.json) records all outcomes. Full `verify:obsidian` passes architecture7/core67/Node237/UI17/portable322/actual-IndexedDB304 without skips, settings24, installed types, scanner zero errors/one retained activeLeaf warning, production build and exact-installed smoke. All270 frozen inputs match. Built/staged/native main SHA-256: `9873e820c92747cd67f93c7b1f8418c70c45b69562d090820d9bd1783899a1c2`; styles/manifest are unchanged from W4.

One exact-build native warm restart passes with source authority ready, unchanged source heads, zero Markdown reads/parses/repairs/full builds, and rendered center. Its document/window focus samples failed, so elapsed time is not a comparable performance result.

The additional six-scenario foreground driver failed its focus prerequisite twice, including after native application activation. Neither run exercised a scenario. Both removed controllers/fixtures, restored configuration bytes and converged source authority. These are recorded failures, not passes. W4's earlier six-scenario acceptance belongs to its earlier artifact and is not counted as acceptance of this build.

Final passive small-vault audit confirms13 original notes, no fixture/controller/build/hydration/pending-priority work and source authority ready. The reference vault still has the earlier3217fba5 build; main/styles/manifest/settings byte hashes match its pre-reload capture. Its old build remains in fallback indexing with source authority pending. No correction or diagnostic controller was installed there.

The new build has not been installed in the personal reference vault. Its outcome on that exact vault remains unverified until the maintainer authorizes the plugin-bundle write as an exception to the read-only constraint. Physical Android/iOS outcomes and native large-vault latency are not claimed.
