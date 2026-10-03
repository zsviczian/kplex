# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Offline return — SI4-R3 high-degree completion implementation

SI4-R3 implementation is returned for main-agent review. Scope stayed on SI4-R3 only; SI5 and C15–C26 were not started, and the retired process-wide contributor catalog was not restored or widened.

## Implementation summary

### 1. High-degree source-local dependency lookup

`NeutralSourceRepository.lookupLocalDependencies()` now treats `SOURCE_MAX_BATCH_RECORDS` as a continuation/page size rather than a completeness limit.

- Removed terminal cardinality backpressure for >256 dependency keys, >256 active owners on a key, and >256 selected owners.
- Snapshots the caller key list before the first continuation point, then captures one source-local derivative revision/global source-sequence fence before lookup.
- Reads dependency-key count state in 256-key pages and rechecks that same fence between pages.
- Reads each dependency membership in 256-row IndexedDB cursor pages. Each membership row is checked against its local owner and selected source head in the same read transaction.
- Rechecks cancellation after every page and after every continuation yield, before count comparison, so cancellation cannot escape as a corrupt-count result.
- Preserves per-key active-count validation and the existing final `validateLocalDependencies()` / paged `validateSelections()` head, source-revision and sequence fence over the complete union.
- Preserves deterministic owner order (`owner.order`, then source ID) and returns no partial prefix on failure.
- Adds lookup work counters for keys, key pages, membership pages, rows, owners, continuation yields, retained peak owner items and estimated retained bytes.

The browser regression now constructs 20,015 valid active owner/head/membership rows for one hot key, requires exact first/last/order/count completion and work-counter/page agreement, then separately cancels at the first continuation yield and requires a whole-result `cancelled` outcome with no prefix. That browser test is present but could not execute on this host; see validation limitations below.

### 2. Production source-local discovery continuation

`SourceLocalContributorDiscovery` no longer converts large finite source-local requests into permanent pending at the old endpoint/key/structural-fact cardinality limits.

- Caller request arrays are snapshotted before the first await so later cooperative yields cannot mix caller mutations into one request.
- Dependency-key validation/projection and scope/certificate hashing continue in 256-item slices with host-current checks.
- Aggregate key-count and aggregate key-byte terminal limits were removed; a pathological single dependency key still uses the existing source-record byte safety bound.
- Structural direct-incidence facts are collected only from proven source owners and explicitly requested host endpoints/literals, with a yield every 256 visited facts. The old 1,024-host-fact terminal cap is removed.
- Certificate selection hashing is incremental in 256-item slices instead of one giant high-degree `JSON.stringify`.
- Existing R2 dependency-invalid repair scheduling remains intact.
- No whole-vault Markdown enumeration, unrelated durable-head scan or global contributor-catalog bootstrap was added.

### 3. Cached semantic / neighborhood / gate / candidate continuation

The cached production semantic path now continues through the old 256-owner, 32-endpoint/parent/candidate, 1,024-structural-fact, 4,096-relation and 8,192-node cardinality boundaries.

- `ObsidianSourceAcquisition.prepareCachedSemantics()` no longer pre-rejects >256 owners and yields during large capture loops.
- `CachedSourceSemanticReader` snapshots request/structure array membership and semantic policy before its first cooperative owner-loop yield, no longer uses owner/fact cardinality as completeness, yields during large owner/structure work, and retains pathological single-record byte protection rather than a cumulative streamed-work cap.
- `CachedRequestedNeighborhoodReader` no longer rejects the semantic parent frontier at 32. Large scope equality, cover containment, selected-source equality and owner capture are checked cooperatively; the two-pass canonical compiler and final contributor revalidation remain in place.
- `projectCachedCenterGates()` scans the complete requested center relation set with 256-relation/time-slice continuation while retaining path/identity validity and a pathological single-path byte guard.
- `CachedRequestedCandidateDegreeReader` snapshots all candidate refs and semantic policy before the first await, then validates/captures/scans in cooperative slices. The 32-candidate, 4,096-candidate-relation and 8,192-compiled-node terminal limits are removed while policy-size and pathological single-identity safety checks remain.
- The retired `SourceContributorDiscovery` implementation was deliberately left unchanged; its old explicit global-catalog limits are not production authority for the accepted source-local design.

## Regression coverage added/updated

- Real IndexedDB fixture: 20,015-owner hot dependency lookup, exact order/count/work counters, and cancellation between pages with no prefix.
- Production source-local browser fixture:
  - 257 proven owners on one center;
  - 33 candidate raw-degree inputs;
  - >1,024 structural facts for a requested root folder;
  - 8,193 center relations and >8,192 compiled nodes;
  - assertions against valid-source body rereads/parses and unrelated Markdown/durable-head inventory work during the requested semantic read.
- Portable cached semantic replay: 257 real owners complete with cooperative continuation and exact source count/order; cancellation at the first high-degree continuation yield returns no `sources` or `compilation` prefix.
- Portable host-only structural compilation: 1,025 facts complete while a pathological single fact still fails the decode budget.
- Portable gate projection: 4,097 relations complete; pathless/colliding/pathological-path inputs remain fail-closed.
- Portable candidate raw-degree parity: 4,097 relations and 8,193 whole-owner nodes match the full-compiler oracle instead of returning cardinality backpressure.
- Added a 257-candidate mutation regression proving the full caller candidate snapshot is captured before the first continuation yield.
- Existing cancellation, source/head mutation, policy/demand/host/root/journal fences and malformed-input tests remain in the portable source suite.

## Files changed

- `src/adapters/obsidian/sourceAcquisition.ts`
- `src/adapters/obsidian/sourceLocalContributorDiscovery.ts`
- `src/index/CachedCenterGateProjection.ts`
- `src/index/CachedRequestedCandidateDegrees.ts`
- `src/index/CachedRequestedNeighborhood.ts`
- `src/index/CachedSourceSemantics.ts`
- `src/index/SourceRepository.ts`
- `tests/source-candidate-degrees.test.mjs`
- `tests/source-local-dependencies-indexeddb.test.mjs`
- `tests/source-replay.test.mjs`
- `tests/source-requested-neighborhood-portable.test.mjs`
- `tests/source-requested-pair-portable.test.mjs`
- `HANDOFF.md`

## Validation actually run

Host environment: Node `v22.16.0`, npm `10.9.2`; the project-required Node `22.22.2` is not installed here. The supplied package contains no `node_modules`. A temporary local symlink to the globally installed TypeScript `5.8.3` was used only where ESM resolution required a local `typescript` package; it was removed before packaging.

### Passing

1. Focused R3 portable source tests:

```bash
node --test tests/source-replay.test.mjs tests/source-candidate-degrees.test.mjs tests/source-requested-neighborhood-portable.test.mjs tests/source-requested-pair-portable.test.mjs
```

Result: **134 passed, 0 failed**.

2. Full portable source suite after the final snapshot/cancellation fixes:

```bash
npm run test:sources
```

Result: **312 passed, 0 failed**; about 29 seconds on this host.

An earlier concurrently orchestrated full-suite invocation hit an external 180-second tool timeout. The affected suites were then run individually and passed, and a fresh standalone `npm run test:sources` completed with exit 0 and the 312/312 result above.

3. Architecture check, with only the temporary local TypeScript resolution symlink described above:

```bash
npm run check:architecture
```

Result: **7 passed, 0 failed**; `Architecture: 61 migrated roots, 120 reachable files, 0 violations`.

4. Strict TypeScript check of the changed index-layer modules:

```bash
/opt/nvm/versions/node/v22.16.0/bin/tsc --noEmit --pretty false \
  --strictNullChecks --noImplicitAny --noImplicitReturns \
  --target ES2021 --module ESNext --moduleResolution Bundler --skipLibCheck --lib DOM,ES2021 \
  src/index/SourceRepository.ts \
  src/index/CachedSourceSemantics.ts \
  src/index/CachedCenterGateProjection.ts \
  src/index/CachedRequestedNeighborhood.ts \
  src/index/CachedRequestedCandidateDegrees.ts
```

Result: **exit 0, no diagnostics**.

5. Syntax/transpile validation:

- `node --check` passed for every modified `.mjs` test.
- TypeScript `transpileModule(..., reportDiagnostics:true)` reported no parse diagnostics for every modified `.ts` file.

6. Whitespace check against the untouched supplied package:

```bash
git diff --no-index --check /mnt/data/kplex_r3_base /mnt/data/kplex_r3_retry
```

Result: exit 1 because the trees intentionally differ, with **no whitespace-error output**. The supplied ZIP has no `.git`, so normal repository `git diff --check` is unavailable.

### Environment-blocked / baseline-limited

1. Real Chromium / IndexedDB:

```bash
npm run test:sources:browser
```

Result: **0 passed, 9 failed**. Eight lanes failed while Chromium tried to navigate to the local test harness with:

```text
net::ERR_BLOCKED_BY_ADMINISTRATOR
```

The source-local lane hit an `ENOTEMPTY` temporary-profile cleanup error in that combined run. It was immediately rerun alone and then failed at the same `net::ERR_BLOCKED_BY_ADMINISTRATOR` navigation step. Therefore the new real-IDB 20,015-owner test and production-local high-degree browser regression are **implemented but their test bodies were not executed on this host**. Their page/retained-work counters must be treated as pending measurement, not as browser-validated evidence.

2. Broader project validation under the incomplete dependency tree:

- A direct `npm run verify` attempt could not proceed normally because local package dependencies are absent; without the temporary TypeScript resolution shim, `check:architecture` cannot resolve the `typescript` package.
- `npm run check:core` was also attempted in this environment. Two test files cannot load the missing `esbuild` package. One `normalized-source-contract` assertion also fails under Node `22.16.0`; that exact assertion was rerun against the untouched supplied baseline and failed identically (`expected "Never There"`, `actual "Assets/picture.png"`), so it is not an R3 regression.
- `npm run build` was attempted and cannot type-check because the normal React/ReactDOM/Obsidian dependency/type packages are absent.
- `npm run lint:obsidian` was attempted and cannot start because `eslint` is absent.

These are environment limitations, not passes. No dependency tree was added to the return package.

3. No Obsidian CLI/native/device checks were run by this offline agent.

## Main-agent validation requested

Use the full dependency environment and required Node 22.22.2. The most important pending checks are:

```bash
fnm exec --using=22.22.2 npm run test:sources
fnm exec --using=22.22.2 npm run test:sources:browser
fnm exec --using=22.22.2 npm run verify
git diff --check
```

For the real-IDB 20,015-owner test, capture the emitted `SOURCE-LOCAL HOT-KEY MEASUREMENT` diagnostic and confirm:

- outcome `ready`, exact 20,015 owners and exact order;
- multiple membership pages and cooperative yields;
- cancellation at the first continuation yield returns only `cancelled`, never a prefix;
- final source/head/revision/sequence fences remain green;
- measured peak items/estimated bytes and page/row/owner counters are reasonable;
- production-local >256/>1,024/>4,096/>8,192/>32 regressions complete with zero valid-source body rereads/parses and no unrelated Markdown/head inventory work.

Do not mark SI4 accepted until those unrestricted browser/Node-22.22.2 checks are reviewed.
