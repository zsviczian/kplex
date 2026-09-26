# Inspecting the running plugin with Obsidian CLI

Use an explicitly selected disposable vault. Agents without Obsidian run `npm run verify` and leave host evidence pending. Deploy the exact build with `npm run verify:obsidian` and the three test-vault variables in [CONTRIBUTING.md](../CONTRIBUTING.md). Inspect installed syntax with `obsidian help`, then confirm the target:

```bash
obsidian vault=kplex-test vault info=path
obsidian vault=kplex-test eval 'code=JSON.stringify({loaded:!!app.plugins?.plugins?.["k-plex"]})'
```

`app.plugins.plugins["k-plex"]` is the live plugin instance created from the installed `main.js`. Its methods are implemented in `src/main.ts`; its `index` is the live `GraphIndex`. This does not execute/import working-tree TypeScript. Build and install changes, then reload the plugin before testing them.

The community-plugin registry is an internal Obsidian API used here for maintenance tests. Keep this access in CLI/test code: portable core/UI code must not discover the plugin through `app.plugins`, `window` or another global escape hatch. No permanent debug global is needed. Prefer existing diagnostic/query methods. Private fields can be reached in the current bundle for narrowly scoped fault injection, but are not a supported API.

## Hydration and readiness probes

```bash
obsidian vault=kplex-test eval 'code=JSON.stringify(app.plugins.plugins["k-plex"].index.getSnapshotHydrationDiagnostics())'
obsidian vault=kplex-test eval 'code=(()=>{const p=app.plugins.plugins["k-plex"];return JSON.stringify({hydration:p.index.getSnapshotHydrationDiagnostics(),pending:p.index.hasPendingSnapshotHydration(),authoritative:p.index.isFullSnapshotHydrated(),nodes:p.index.size,status:p.getIndexStatus()})})()'
```

Diagnostics return a copy containing run number, phase, last active phase, epoch-millisecond timestamps, exact page/relation/evidence counters and outcome. Phases include `metadata`, `preview`, `pages`, `file-rebind`, `relations`, `preview-search`, `evidence`, `resolve`, `authoritative-search` and `promote`. Terminal outcomes are `complete`, `failed`, `cancelled` and `timed-out`; `idle` means no restore started. Terminal records preserve the last actual work timestamp and phase; late work cannot rewrite them.

Every five seconds the watchdog checks for **90 seconds without observable work**, including metadata/preview reads. Search/resolver loops also signal sampled progress. This is not a 90-second startup limit. A suspended or synchronously blocked event loop delays the check until it can run again. Timeout invalidates the run, releases the public wait and lets startup rebuild. A preview remains non-authoritative. Diagnostics remain `timed-out` after a successful fallback rebuild: inspect readiness separately.

Poll short serializable probes instead of leaving CLI eval awaiting a potentially stuck promise. `waitForSnapshotHydration()` is useful inside a bounded test controller. A green indicator alone does not prove equality: compare cardinality, representative search and relationship evidence with the same fixture.

## Reload, fault injection and cleanup

Reacquire the plugin after every reload or `app.emulateMobile(true/false)` call. Old references belong to an unloaded instance. For cancellation tests retain an old index only in a temporary controller until its terminal outcome is asserted, then release it. Unload must settle the hydration wait, stop its watchdog and prevent startup/build continuations from scheduling or publishing replacement work.

To force a stalled read, temporarily wrap one snapshot cache read/iterator with a controllable unresolved promise. Retain the original method and release function in a test-only controller. Restore the method before the fallback build; wait the real inactivity window; assert unsuccessful hydration, authoritative fallback, full graph equality and green readiness. Release the old read and verify it changes neither the graph object nor terminal diagnostics. Always restore methods/timers and delete controllers, even after failure. Never ship artificial delays/test globals.

For comparable timer/restore measurements, record `document.hidden`, `document.visibilityState` and focus. A visible native window can still have a hidden/occluded renderer; foreground the selected test window and let visibility settle before starting. Do not compare foreground timings with background-throttled runs or treat suspended timers as a strict wall-clock deadline.

Device layout checks use the `obsidian-device-emulation` skill, `app.emulateMobile(true/false)` and actual viewport sizes. Capture and restore original mode/dimensions. Desktop emulation does not establish native iOS/Android memory, touch or keyboard behavior.

Record revision/dirty state, artifact SHA-256 hashes, fixture identity, host/mode, elapsed time, body-read/full-build/patch counts and sampled heap where relevant. Heap samples describe JavaScript heap, not total process/device peak memory. Do not log vault contents. Save evidence in a report and summarize acceptance in `Refactor plan.md`.

CLI eval can print `Error:` with exit code zero: assert the payload as well as the process status. Missing host/CLI evidence remains unavailable, never silently passed.

## SDK access and comparable large-graph probes

CLI `eval` can have Electron's `require` rather than the plugin loader's special `require("obsidian")`; resolving the SDK there may fail. If a maintenance comparison needs real SDK exports, use a temporary plugin method that closes over the installed SDK imports, and call it through the loaded plugin instance. Do not invent replacements for native classes or tag semantics. Remove the method/imports, rebuild, redeploy and check both source and final bundle for the temporary prefix before acceptance. Standard index diagnostics do not require such an accessor.

For large graph comparisons, use cooperative chunks and remove generated evidence IDs while retaining declaration multiplicity. Count-only or topology-only equality misses repeated source declarations. Compare the actual accepted implementation against the candidate with the same host/cache/file inputs when an earlier-window or across-reload facet hash differs; do not silently redefine the expected result. Record the earlier probe's failure and the evidence that resolves the checkpoint.

On macOS, a native window's `focus()` can leave its renderer occluded. `osascript -e 'tell application "Obsidian" to activate'` is useful inside a bounded local test driver; wait for visibility to settle. Record readiness and `document.hidden` at start/end and during timer samples. Wait for authoritative hydration before a warm rebuild measurement. Separate capture/probe work from timed builds; repeated full graph allocations and overlapping probes can distort heap and timing. Reload the disposable vault when a fresh renderer is needed, allow CLI command-registration delay, and reacquire the plugin afterwards. Heap samples are not physical-device peak memory or actual-paint measurements.

For a native test-vault probe on macOS, application activation can still select a different/occluded window. If `document.hidden` remains true, the test harness may use Electron's existing `@electron/remote` capability to call `app.focus({steal: true})` and focus the exact CLI-selected window. This is test-only maintenance access; never add it to production modules. Wait for renderer visibility to settle and record actual hidden samples rather than treating a successful focus call as proof. Suspended/background timers and initialization waits are excluded from foreground performance comparisons.

After a custom `plugin:disable`/`plugin:enable` test deployment, reopen the registered K-Plex start command; disabling can remove its views, and no visible demand can legitimately pause hydration. The standard native runner already opens the command. If a diagnostic must finish while the selected renderer is occluded, capability-check Electron's background-throttling getter/setter, preserve the actual previous boolean, temporarily disable it only for that diagnostic, and restore it in cleanup. Exclude that run from normal foreground/performance evidence. Keep cleanup independent of comparison assertions so a failed probe does not leave test globals or altered throttling behind.
