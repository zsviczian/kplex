## Problem and resulting behavior

Describe the concrete trigger, previous behavior and resulting behavior.

## Validation

List exact commands and native workflows, their outcomes and any unresolved
failures or unavailable acceptance. Distinguish first-run failures from reruns.
Identify the tested revision/artifact and platform. Do not attach routine raw logs
or diagnostics to Git; use the repository's managed validation storage.

## Indexing and persistence acceptance

Required when startup, hydration, indexing, source authority, scheduling, cache
selection/persistence or index status is affected. Otherwise replace this section
with a specific explanation of why it does not apply. Follow the
[mandatory gates](../CODING_STANDARDS.md#mandatory-indexing-and-persistence-acceptance-gates).

- [ ] The released baseline, branch base and candidate were compared under matching conditions; causal findings are distinguished from hypotheses.
- [ ] A regression reproduces the reported user workflow and checks the required fast path and work counts.
- [ ] The correct cache generation activated after reconciliation; two unchanged restarts reused it without repeating settings/topology mismatches or unnecessary whole-vault work.
- [ ] Pending-save close/reopen, save failure/retry, no-op events, idle/wake and foreground work during recovery were checked.
- [ ] First paint, current-view authority, full settlement and durable cache activation were measured separately on a representative persisted graph.
- [ ] Concurrent status activities remain visible together; the UI does not imply durable cache completion prematurely.
- [ ] Mandatory verification and affected exact-build native lanes cover the final source, with unchanged assertions/deadlines and all failures/reruns reported accurately.
- [ ] Tested, staged and deployed artifact hashes match where deployment applies; independent cleanup and production-vault authorization were verified.

Name any unfinished gate explicitly. A maintainer waiver must name the gate and
reason; it must not be inferred from permission to deploy an experimental build.
