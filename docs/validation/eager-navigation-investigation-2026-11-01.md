# Eager calendar navigation investigation — 2026-11-01

## Scope and identity

Investigation requested by the maintainer, with read-only access to the live large vault and explicit authorization to navigate the current calendar graph. No production source changes, deployment, reload, rebuild, forced application restart, note edits or preference changes were performed. Normal canvas navigation can persist its ordinary history/last-center state. Prior uncommitted reference-action fixes remain unchanged.

Repository baseline: `main` at `b64c88a3a11712c23fa75a2ad440adcc9f329c7a`, with the existing reference-action patch. Installed K-Plex 0.4.0 `main.js` SHA-256: `d54054fa8f5bddbb1159f368571669b638cdc4464a135e5ccdc3e0f464dac4bf`, matching the previously verified local build. Windows, Obsidian 1.14.5; CLI driver and focused test used Node 22.22.2. No personal note contents are retained here; the calendar dates identify the measured hops.

The supplied diagnostic report showed eager/responsive indexing, 11,819/11,819 indexed Markdown files, 110,487 graph nodes and an authoritative graph. Live passive status confirmed `ready`, `upToDate: true` and the same Markdown count. The live vault inventory also includes attachments and other non-Markdown files, so its larger total is not an indexing discrepancy.

## Observed navigation

Starting at January 31, the probe clicked the actual rendered calendar parent cards through January 30, 29, 28, 27, 25 and 24. It then revisited the visible January 25 child. Input was a programmatic DOM click, not a physical pointer test. Each sample used the foreground, visible renderer with its original background-throttling policy; no timer policy or index readiness was bypassed.

Mutation observations distinguish the new center appearing from its surrounding nodes becoming available. These are DOM publication measurements, not a screen-paint guarantee. CPU sampling and temporary pass-through timing wrappers observed existing operations; all wrappers, observers and debugger attachment were removed afterward.

| Destination | New center visible | Full local scene visible | Initial center preparation | Blocking candidate-degree preparation |
| --- | ---: | ---: | ---: | ---: |
| January 30 (Zagreb) | 21 ms | 723 ms | Not separately timed | Not separately timed |
| January 29 | 20 ms | 724 ms | 175 ms | Not separately timed |
| January 28 | 16 ms | 513 ms | 154 ms | Not separately timed |
| January 27 | 17 ms | 1,539 ms | 194 ms | 1,301 ms; 85 source replays / 340 family visits |
| January 25 | 16 ms | 540 ms | 233 ms | 275 ms; 12 source replays / 48 family visits |
| January 24 | 19 ms | 782 ms | 260 ms | 497 ms; 21 source replays / 84 family visits |
| January 25, revisited | 29 ms, complete scene | 29 ms | None | None |

The first-visit surface initially contained only two nodes. Each later publication changed coverage from `cached`, unprepared and pending to a complete prepared local scope. Revisiting January 25 ran neither `prepareSemanticScope` nor any observed neighborhood/degree preparation.

Across these clicks the retained counters for Vault body reads (126), parses (68), full builds (1), complete snapshot saves (2), source inventory passes (3) and source maintenance revision (203) did not change. CPU traces were predominantly idle/awaiting work rather than a long synchronous graph layout. A repeatable approximately 62–67 ms Obsidian save-related task appeared around 2.3 seconds after navigation, after the measured scene was available; it does not explain the initial pause.

These observations reproduce a substantial 0.51–1.54 second first-visit delay, not a several-second pause on every hop. They should not be inflated to the larger reported duration. Slower storage, greater relationship fan-out or a different foreground state could make the same path slower, but those explanations were not independently established here.

## Why the green eager index still waits

Two mechanisms combine:

1. **The complete graph no longer passes the current-authority fast path.** Live values were `sourceBackedSemantics: false`, full/current semantic policy `2/2`, full/current host source revision `22892/22892`, but full/current **source-maintenance revision `20/203`**. `hasCurrentCanonicalCenter()` and `ensureSemanticScope()` require the maintenance revisions to match. A not-yet-centered calendar note still existed in `state.pages` with seven neighbors but failed `hasCurrentCanonicalCenter()`. This is a validity decision, not missing indexed notes.
2. **The fallback blocks the useful scene on broader supplementary work.** `prepareSemanticScope()` obtains the direct center/parent compilation, then awaits `prepareRequestedCandidateDegrees()` before installing the scope and emitting its scene. The latter discovers the union of contributing owners and replays their cached source families to establish exact raw degrees and gates. On January 27 that second pass expanded to 85 notes and consumed most of the 1.54-second delay, even though the direct center was prepared in 194 ms. It is cached IndexedDB replay, not reparsing note bodies.

Relevant implementation anchors:

- `src/index/GraphIndex.ts`: `hasCurrentCanonicalCenter()`, `startSemanticDemand()`, `ensureSemanticScope()`, `prepareSemanticScope()`, `commitPreparedFile()`, `publishIncrementalFile()` and `acknowledgeHostPresentation()`.
- Full publication/rebuild paths set `fullSemanticMaintenanceRevision`. Ordinary incremental file publication and host-presentation acknowledgement do not renew it. The latter updates the host-source revision separately.
- `src/index/CachedRequestedCandidateDegrees.ts`: `prepare()` authenticates a complete union of owners, then compiles their facts for degree/gate inputs.
- `src/index/GraphIndex.ts`: `hasPendingSemanticPreparation()` checks current demand. A prepared current center can therefore turn the indicator green while a different unvisited center would still require a new local scope.
- `src/main.ts`: `computeIndexStatusFacts()` uses that demanded-scope readiness together with completed initial indexing and drained pending work; green does not promise every future navigation is an in-memory graph read.

The retained diagnostics cannot reconstruct the exact historical event sequence that advanced maintenance from 20 to 203. Therefore the precise event that retired global reuse remains unproven. The live revision mismatch, selected fallback, repeated cached replay and publication dependency are directly observed and traced in source.

## Recommended implementation and acceptance

The primary fix should retain or re-establish complete eager-graph authority after **proven, fully reconciled incremental source changes**, with affected-input invalidation. Do not simply ignore the maintenance revision or restamp an old graph: resolver/topology, policy, pending metadata, deletion and replacement fences protect correctness.

The fallback should also avoid withholding the direct usable scene for unrelated candidate-degree work where the view contract allows later enrichment. Connection-count sorting and exact gate totals need explicit treatment; missing proof must remain pending rather than becoming zero or silently changing ordering. Reusing valid per-candidate degree/gate proofs can reduce repeated source replay without changing those semantics.

Before implementing, extend the complete-eager navigation regression to cover local source maintenance and successful incremental reconciliation, then navigate to an unrelated previously unvisited center. Require exact graph/evidence/alias/degree/gate parity and no unnecessary source replay. Add a held candidate-degree case for whichever first-publication contract is chosen, retaining stale-source and cancellation safeguards. Validate the candidate build in a disposable vault, not this live vault.

## Checks, cleanup and evidence

Focused existing contract check passed on Node 22.22.2:

```text
node --test --test-name-pattern="navigation and a superseded scope retry preserve complete graph" tests/source-startup-indexeddb.test.mjs
1 test passed; 0 failed
```

That test proves a freshly current full graph performs no partial scope/source work on navigation. It does not cover the live post-maintenance mismatch; no such passing regression is claimed. No aggregate suite or build was rerun for this investigation-only documentation change.

Private local evidence remains outside the repository: `%TEMP%/kplex-brain-navigation-{zagreb,jan29,jan28,jan27,jan25,jan24,warm25}.json` and matching `.cpuprofile` files. The focused test log is `%TEMP%/kplex-brain-contract-test.log`. Final cleanup confirmed the observation controller absent, debugger detached and all five observed methods restored to their original prototype ownership. No diagnostic API or instrumentation was added to the shipped plugin.

Final checklist: investigation, live measurements, source attribution, focused contract check, collector cleanup and evidence delivery complete. Runtime fix remains a recommendation; no performance improvement is claimed.
