# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Offline return — SI4-R2 production scheduling and O(1) status maintenance

Do not start SI4-R3, SI5 or C15–C26 from this return. The scoped SI4-R2 correction is implemented and remains uncommitted for main-agent review.

## Changed files

- `src/adapters/obsidian/sourceAcquisition.ts`
  - Keeps retryable deferred source-local resolution impacts live after an early `reconcileKnownImpacts()` return.
  - Adds one coalesced retry clock with exponential backoff from 350 ms to the existing 30 s poll interval.
  - Reuses `pendingResolutionKeys` as the only work set and re-enters the existing `requestInventory()` scheduler; no per-event queue/catalog/proof format was added.
  - Successful local closure cancels the clock and resets the delay. Unknown fan-out promotion, terminal high-degree backpressure, pause and unload cancel the clock. Cancellation/supersession keeps the existing event/lifetime ownership.
  - The accepted 50 ms native resolver-wave retirement is unchanged.
- `src/main.ts`
  - Treats `cachedMarkdownFileCount === null` as genuinely unknown only.
  - Once established, Markdown create/delete and extension-changing rename update the denominator by `+1/-1` before status publication instead of invalidating it and enumerating the Vault.
- `tests/source-local-dependencies-indexeddb.test.mjs`
  - Adds a production-scheduler regression that enables normal scheduling and does not call `reconcile()`/`flush()` to drive any create/modify/rename/delete/recreate wave.
- `tests/indexing.test.mjs`
  - Adds exact O(1) status-denominator assertions for create, delete, `.txt -> .md`, and `.md -> .txt` rename while retaining the existing unknown-initial-count test.
- `HANDOFF.md`
  - Replaced the assignment body with this measured return.

## Automatic retry/liveness behavior

The reproduced stranded state had retryable `pendingResolutionKeys` but no `requested` flag or timer after the inventory pass returned. The correction leaves those keys in the existing coalesced set and, on retryable `dependency-pending`, `unsaved`, `superseded`, storage-unavailable, read-error or write-error results, owns exactly one later retry timer. When it fires it calls the existing `requestInventory()` path, so normal inventory coalescing/backpressure still owns execution.

The timer cannot spin per event: there is only one timer, it has exponential backoff capped at 30 s, and event cardinality does not allocate work objects. It cannot strand ordinary transient work: a retryable local miss schedules a later production pass even when the current inventory exits with `requested=false`. Successful closure clears/reset the timer; terminal backpressure stops it; uncertain/invalid fan-out still takes the existing cached-fact fallback; pause/unload clear it.

## Exact regression assertions

The new real-browser scheduler regression injects exactly two retryable `dependency-pending` local lookups in each native wave. For **create, modify, rename, delete and recreate** it asserts:

- readiness closes synchronously and reopens from production scheduling using real timers, without a test-driven `reconcile()`/`flush()`;
- the native `metadata:resolved` close remains source-local;
- exactly **3** local dependency lookup attempts occur (event fan-out failure, first scheduled retry failure, automatic later successful retry);
- K-Plex `getMarkdownFiles`, `getFiles`, structural-root traversal and durable-head paging counts are each exactly **0**;
- unrelated inspection, visit, acquisition and write counts are each exactly **0**;
- the unrelated source head remains byte-for-byte unchanged;
- create/recreate read+parse only `Target.md`; modify reads+parses only the changed target; rename/delete read+parse no unchanged body;
- proven relative/subpath and alias referrers repair to the expected document/unresolved targets after every wave.

The status regression starts from a known denominator of **10** and asserts `10 -> 11` on Markdown create, `11 -> 10` on delete, `10 -> 11` on `.txt -> .md`, and `11 -> 10` on `.md -> .txt`, with K-Plex `getMarkdownFiles` count exactly **0** including create/rename status publication and an explicit post-delete `getIndexStatus()` read. The pre-existing unknown-initial-count regression still asserts exactly one Markdown enumeration followed by cached reuse.

Existing regressions for uncovered `metadata:resolved` cached-fact fallback, idle observation-only polling, and empty-folder plus sequential Markdown-create incremental convergence were retained unchanged.

## Validation performed

Environment versions/capabilities:

```text
node v22.16.0
npm  10.9.2
required by package.json: >=22.22.2 <23
fnm: not installed
Chromium: /usr/bin/chromium
Obsidian CLI/runtime: not installed
```

Because `fnm` is unavailable, the requested `fnm exec --using=22.22.2 ...` commands could not be executed exactly. The project dependency install is also incomplete: `npm ci --offline --ignore-scripts` fails with `ENOTCACHED` for `yocto-queue-0.1.0`, and npm reports the Node engine mismatch. Online `npm ci` attempts did not complete/package materialize in this environment. For the portable/source lanes only, the globally installed TypeScript package was temporarily linked into the working copy; that link is not part of the returned patch.

Actual checks:

```text
npm run test:sources
PASS — 310 tests, 310 pass, 0 fail.
(Node 22.16.0; global TypeScript temporarily linked because npm ci is unavailable.)

node tests/indexing.test.mjs
PASS — all indexing fixture groups report PASS, including the new status-count assertions and the retained empty-folder/create regression.

node --test --test-concurrency=1 tests/source-local-dependencies-indexeddb.test.mjs
PARTIAL runtime evidence — with this container's managed Chromium URL blocklist temporarily removed for the focused run and restored afterward, subtest
"production scheduler retries deferred known impacts without manual reconcile and keeps every native wave local"
PASS. The command was deliberately time-bounded before the entire long file completed; the changed subtest completed green first.

npm run test:sources:browser
BLOCKED in the unmodified container — Chromium has managed policy `URLBlocklist: ["*"]`, so all harness pages are denied with `net::ERR_BLOCKED_BY_ADMINISTRATOR` before test assertions. A secondary cleanup `ENOTEMPTY` occurred in one case. This is browser policy, not SI4 assertion evidence.

npm run verify
PARTIAL/FAIL — `check:architecture` passes 7/7 and reports 61 migrated roots, 120 reachable files, 0 violations. `check:core` then cannot load the absent `node_modules/esbuild/index.js` in two test files and also exposes an unrelated normalized-source assertion (`Assets/picture.png` vs `Never There`). The same normalized-source assertion reproduces unchanged against the untouched supplied package (6/7 in that file), so it is a baseline failure, not introduced by this patch. Verify stops before later gates.

npm run build
BLOCKED — TypeScript reports missing installed type libraries (`codemirror`, `eslint`, `estree`, `json-schema`, `json5`, `node`, `react`, `react-dom`, `tern`) from the incomplete dependency tree.

node --check tests/indexing.test.mjs
PASS
node --check tests/source-local-dependencies-indexeddb.test.mjs
PASS
Global TypeScript transpileModule syntax check for both touched `.ts` files
PASS — 0 syntactic diagnostics.

git diff --check (against a temporary Git index seeded from the supplied package)
PASS — no whitespace errors.
```

## Main validation agent follow-up

1. On Node **22.22.2** with the full locked dependency tree, run the requested `npm run test:sources`, `npm run test:sources:browser`, `npm run verify`/build and `git diff --check` gates.
2. Review the retry-clock ownership against native event ordering, especially pause/resume and terminal high-degree backpressure; no R3 cardinality work is included here.
3. In a disposable Obsidian vault, instrument the existing SI4 native create/modify/rename/delete/recreate scenario and confirm readiness reopens without manual reconciliation and K-Plex-owned Markdown/status enumeration remains zero once the denominator is known.
4. Keep SI4-R3, SI5 and C15–C26 paused until this R2 correction is independently accepted.
