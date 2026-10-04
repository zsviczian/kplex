# SI5 startup phase and retry labels — 2026-10-04

## Change and limits

Separate checkpoint after wait-attribution commit `0f58ea606dbd406f0b100f49c7374d470027c039`. English progress now reads **Checking note metadata** for host comparison, **Checking cached notes** for first reconciliation and **Rechecking cached notes** for repeated reconciliation. All seven other bundled catalogs contain equivalent translations. Percentages and denominators still come from the actual pass; unknown totals retain actual record counts without percentages.

`StartupDiagnostics` records one-based phase occurrences per lane, independently of detailed opt-in. Its map is bounded to 128 phase keys; no note identities, timers, I/O, authority or scheduling are added. New plugin instances start at pass 1. Frozen detailed traces and disposed lifetimes remain unchanged. `getIndexStatus()` selects the retry label only for a repeated `source-reconciliation` phase.

The maintainer reported two identical labels in a personal vault that has since closed. Its in-memory trace is gone; that run's actual phase sequence and retry cause are **unknown**. No personal vault was reopened or read. Current clean test-vault traces contain one host comparison and one reconciliation; the new retry test deliberately simulates a transient missing MetadataCache entry, not the maintainer's original incident.

No performance optimization. The [unchanged-build wait measurements](settings-independent-indexing-si5-wait-attribution-2026-10-04.md) belong to `c9cc8a49…`; this separate UX build is `bd1e24ae6946eaa8a5d4fab3b36587e8be423b7f41a820a11a30c124b194d2ad`. Do not combine results as one build or infer speed from this functional run.

## Automated and native validation

The [native aggregate evidence](settings-independent-indexing-si5-progress-labels-2026-10-04.json) passes **15 assertions**. Two actual reconciliation passes each processed **20,015 / 20,015** notes, with one injected missing metadata observation. Captured labels include **Checking note metadata**, **Checking cached notes**, and **Rechecking cached notes — 175 / 20,015 notes (0%)**. All observed counts are monotonic within their phase/pass and use the real denominator. At 100 ms observation intervals, a phase's exact 0 or 100% moment can fall between samples; no artificial endpoint is inserted.

Final strict-ready passed; source heads and settings unchanged; all other source counters and full graph builds **0**. Foreground **99/99**, normal throttling, CLI reconnects **0**. Controller/wrappers/opt-in removed, private owner sets **0**, **25** frozen phases retained. One rendered app, representative center DOM and canonical open command registered; **No errors captured.** Configuration and enabled list preserved. Original excluded center restoration leaves live status updating; the completed strict-ready record is historical.

Functional elapsed **97,360.8 ms**, not comparable to clean warm timings: it deliberately requires a second pass and overlaps browser verification. Full `npm run verify` exits **0**: architecture **7**, restricted core **62**, Node **144**, UI **7**, portable sources **317**, real Chromium/IDB **199**, official Obsidian lint and actual production build pass. Browser lane **733,188.5 ms** under overlapping native work; not a startup benchmark. Build uses installed Obsidian 1.13.0 types and Node 22.22.2. Final `dist`/installed artifact bytes match; settings and enablement remain byte-identical to the initial backup after all attempts. Post-edit driver syntax check and 10/10 runner tests also pass. No skip is counted as a pass.

Focused command, Node 22.22.2:

```bash
node --test tests/startup-diagnostics.test.mjs tests/localization.test.mjs
npm run verify
```

Focused **21/21** pass. New tests cover retry count reset/advance, independent lanes, new lifetime reset, normal operation without owner/timing capture and unload. The production `getIndexStatus()` regression also asserts distinct metadata/first/repeated labels with genuine 0/5 and 1/5 progress, and evidence loading without artificial percentage.

The first sandboxed full verification failed to launch browser processes (all seven UI cases failed at browser startup); it did not reveal an assertion regression. Repeated with browser permission; all lanes pass as recorded above. No production edits after full verification began.

Native exact-build staging uses matched deferred disable/enable, bounded CLI polls, hash verification and configuration checks, as documented in CONTRIBUTING. Fresh backup `/private/tmp/kplex-si5-progress-labels-before-2026-10-04`. Commands:

```bash
node /private/tmp/kplex-si5-stage-progress-labels.mjs
node /private/tmp/kplex-si5-restage-progress-labels.mjs
KPLEX_TEST_VAULT_NAME=kplex-test \
KPLEX_TEST_VAULT_PATH=/Users/zsviczian/Obsidian/kplex-test \
KPLEX_TEST_CONFIG_DIR=/Users/zsviczian/Obsidian/kplex-test/.obsidian \
KPLEX_HOST_REPORT_DIR=/private/tmp/kplex-si5-progress-labels-retry-retest-2026-10-04 \
KPLEX_SI5_WARM_CENTER=Welcome.md KPLEX_SI5_RESTART_RUNS=1 \
caffeinate -d -i node /private/tmp/kplex-si5-progress-labels-retry.mjs
```

These temporary scripts extend the repository startup driver's existing controller. For the retry recipe, immediately after acquiring/wrapping the newly enabled plugin, wrap `app.metadataCache.getFileCache` once: return `null` for the representative center **only during the first `source-reconciliation`**; forward all subsequent calls unchanged. Retain the original in `c.originals` so the existing `finally` restores it. At strict readiness assert that the miss fired, that exactly two real source-reconciliation phases were recorded, and that a `Rechecking cached notes` label was observed. Existing source-head digest, configuration, foreground and cleanup assertions stay intact. This is a maintenance-only fault, never production code.

Untimed first attempt: the window was hidden/unfocused; selected-center progress did not settle and the **production hydration watchdog** fired. No measured trial had started, and the CLI did not time out. Stopped only that untimed setup, preserved its failure report, restored configuration/controller, and used a foreground matched reload. The driver now foregrounds the selected test window **before preflight**, as it already did before timed runs, and still waits for both a page/navigation listener and the actual selected center. The retry uses that corrected preflight. No watchdog/deadline/throttling-policy change. Full browser verification overlaps the functional native test; its elapsed time is not a performance result.

## Manual follow-up

On the next normal production-vault startup, metadata comparison and cache checks should have distinct names; if reconciliation repeats it should say **Rechecking cached notes** and restart that pass's actual count. The closed run cannot be diagnosed retrospectively. Physical iPad/Android and the final settings-route/retirement/evidence audit remain open SI5 gates. Accepted cold and the synthetic dense-hub stress limit remain unchanged.
