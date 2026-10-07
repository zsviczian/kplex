# Warm count continuation correction — 2026-10-06

Status: desktop correction accepted after full verification and exact reference deployment. C15–C26 remain paused. Changes remain uncommitted on `indexing-fixes` (base `2a450b9`).

## Reproduction and measured cause

The maintainer deployed `9873e820…` and still saw incomplete gate counts. The completed-work observer was present. Aggregate native inspection found source verification at 711 owners, one selected source reader, no transaction/writer/priority work, then the existing inactivity watchdog timed out. Restarting K-Plex reproduced a separate pause behind two host-preview priority owners while Obsidian reported its reference document hidden.

Temporary aggregate observers captured a zero-delay preview callback waiting **48,107 ms**. Its stack led through the preview metadata collector checkpoint. Bringing Obsidian forward made the document visible; subsequent repository continuations completed (8,412 yields, 1,332 ms summed wait, 21 ms maximum), while SHA-256 work completed normally (25,956 calls, 966 ms total, 4 ms maximum). Source verification advanced beyond the previous stop to 1,793 owners. The current rendered gate labels became numeric through the existing fallback path.

These are instrumented overlapping activity observations, not a performance baseline. Observer promise forwarding and stack capture add overhead; method durations overlap and must not be summed. The foreground activation changed visibility, while document focus remained false. This establishes timer continuation starvation; it does not establish exact source parity from labels alone. Observers and temporary globals were removed independently after capture.

## Correction and invariants

`yieldToHostTask()` posts an owning-window MessageChannel event task for a cooperative CPU continuation. Each call closes both transient ports and clears handlers on completion or failure. It retains no queue; channel failure rejects. Hosts without MessageChannel retain the previous timer fallback. The caller retains cancellation/freshness authority and rechecks it after awaiting.

The existing repository, graph/compiler, hydration, requested-preview, contributor and parser host owners use this helper at 32 reviewed CPU boundaries. Slice budgets and priority checkpoints remain. Actual debounce, watchdog, retry, polling, external-work waits and the explicit WebKit paint delay keep their timers. This changes continuation dispatch, not scheduling priorities, source schemas, semantic policy or completeness requirements. No raw host backlinks are promoted to editing authority.

## Development verification and review

Node 22.22.2 focused contracts passed 34/34, final helper contracts 4/4, installed-types checking and scoped ESLint. Two real Chromium/IndexedDB tests passed: production source reads finish with timer callbacks withheld, both native ports close, and a repository closed after posting rejects the pending body read. The dense-source completed-work regression also passed.

Main review corrected three explicit test-transpile dependency lists to include the new helper. The monotonic search cancellation test now cancels on actual native MessageChannel delivery, preserving its null-result/no-prefix/one-yield assertions. One URL-heavy timer-response run failed at 51.3 ms against the unchanged 50 ms limit before the old reference workload was confirmed settled; the strict full indexing fixture passed after a passive probe confirmed readiness. The exact cause of the single failed sample is not attributed. No production code or timing threshold changed for that rerun. Full verification retains failed attempts separately.

## Reference protection and acceptance

The maintainer authorizes replacing only `main.js` in **Zsolt’s Brain (2025)** and reloading; notes remain read-only. Baseline has 20,046 vault files, including 11,815 Markdown notes. Before deployment, aggregate path/mtime/size digest is `0aae89cbc4281f10d0018d0872aa582b7fca8c755a943ab2bb00121cc2b17b4e`. Plugin settings hash is `918ec711…`; CSS and manifest hashes are `0d75bb3b…` and `e3bb9a35…`. No personal fixtures, source corruption, settings edits or throttling overrides are permitted.

Final `npm run verify:obsidian` passes on Node **22.22.2**: architecture7/core67/Node241/UI17/portable sources322/real IndexedDB305, no skips; settings24, installed types, zero scanner errors and one unchanged activeLeaf warning, production build and exact small-vault render smoke. All272 frozen source/test/build fingerprints match. Failed earlier harness runs remain separately recorded.

Verified main.js `0ad6a47ce29064b992bb0ee2b92e65e8947305bfc9c9a1c5527d319e59a5dec7` is deployed to the reference vault. Loaded runtime proof observes its actual native MessageChannel and both closed ports while hidden. At the first poll, source authority is still false and graph hydration is running, yet native folder membership/counts already match **26 Projects children / 5 StoryOS children**. The second poll reports source authority ready, complete hydration (110,731 page records and281,980 evidence records), status ready and all20 rendered count labels numeric while the document remains hidden, focused=false and original throttling=true. No Markdown reads/parses/repairs/failures or full semantic builds occur. This is functional hidden-window convergence, not a comparable performance measurement. The cache settled between old failure and new deployment, so there is no equal-cache timing delta.

After restoration, the window is visible/unminimized, document.hidden=false, source is ready, and semantic tasks/inventory/transactions/readers/writer lanes/priority owners are all zero. The semantic diagnostics `pending` field records a cumulative earlier pending outcome, not live work; the actual task map is empty. Temporary controllers, wrappers and globals are absent. All20,046 file revisions and11,815 notes, saved center, settings, CSS and manifest match their predeployment hashes. Only main.js was copied. Folder assertions used native/current graph APIs without navigating the saved UI center.

[Exact evidence](warm-task-continuations-2026-10-06.json) retains input/artifact hashes, all acceptance polls, protection audit and failed development attempts.

Remaining highest-value manual check: physical Android/iOS warm start followed by background/foreground resume, expecting eventual numeric gates and responsive navigation. Desktop/Chromium cannot prove native WebView suspension or touch behavior. Popout lifecycle was not separately exercised for this dispatch correction. W5's native foreground driver previously failed OS-focus prerequisites; it is not relabeled a W6 pass. W6 desktop native coverage is the exact small-vault smoke and personal-vault read-only checks above.
