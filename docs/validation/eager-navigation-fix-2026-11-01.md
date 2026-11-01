# Eager maintenance and reference-action fixes — 2026-11-01

## Scope

Maintainer-authorized implementation and PR on `fix/eager-navigation-and-reference-actions`, based on `b64c88a3a11712c23fa75a2ad440adcc9f329c7a`. The branch includes the earlier incoming-property unlink and retained-placeholder source-dialog fixes. Their original acceptance is recorded in [reference-actions-2026-11-01.md](reference-actions-2026-11-01.md); the read-only performance investigation is [eager-navigation-investigation-2026-11-01.md](eager-navigation-investigation-2026-11-01.md).

Testing and fixture mutations are confined to the existing disposable test vaults. Production-vault access for this assignment is observational only. The maintainer separately permits copying `main.js` and `styles.css` there; no production deployment or plugin reload is needed for these acceptance tests.

## Implementation

- The existing source-acquisition owner coalesces affected graph owners in a publication journal. Native events, discovered resolution dependents and repaired changed heads retain one latest observation per path. Storage-only rewrites under the already-acknowledged maintenance revision do not create graph work. The journal is enabled by complete eager publication and is not a second source classifier, scheduler or persisted graph model.
- GraphBuilder captures an exact source/native/metadata receipt after acquisition. Its final atomic commit rejects a newer observation, including equal-stat edits. A successful graph commit acknowledges only its captured prefix; it cannot clear a newer event for that source.
- Eager graph catch-up uses the existing per-file compiler and background priority. Canvas mutations and requested-node preparation keep their higher lanes. Closing demand, policy changes, structural work, replacement and unload retain or cancel the pending work rather than certifying it.
- Full builds capture the maintenance revision before work. Events arriving during the build remain queued. Complete eager authority is renewed only after graph owners have committed, source dependencies have closed and the host coordinator has acknowledged its source epoch. Pending journal entries block complete reads/write readiness and the green complete status.
- Hot body reuse follows the current completed parser token even after source acquisition has cleared its dirty flag. Matching timestamps alone cannot select an older parsed body. Existing neutral/cache inputs remain reusable; navigation does not introduce new body reads.
- Eager startup recovery cannot stop at node vocabulary. The initial coordinator uses the existing progressive builder to complete global relationships after source adoption. Current-node work can preempt that pass, and new events remain in the ordinary backlog. On-demand mode retains its local semantics; a complete current snapshot still takes its existing fast path.
- No settings defaults, storage schemas, ontology classifications, localization strings or public API signatures changed. Refactor milestones C15–C26 remain paused.

## Regression evidence

The unchanged implementation fails the new eager event test: source reconciliation completes while the graph's complete maintenance marker remains old. The corrected test uses real Chromium IndexedDB, native-shaped modify/create/delete/rename events and the production full compiler as an independent oracle. It compares every live fixture's lists, ordering, provenance, titles and gate counts, then requires previously unvisited centers to cause no semantic preparation, source-family replay, body reads or parses.

Additional executable cases cover:

- A newer equal-stat edit during held graph preparation; the old producer cancels and the newer journal entry survives.
- Canvas-style direct source publication before delayed duplicate metadata notifications.
- A current-node request completing ahead of the queued global catch-up task.
- Demand retirement preserving its backlog without publishing a false complete graph.
- Source closure under a changed semantic policy refusing to certify the older policy.
- Partial/checkpoint baselines retaining their existing recovery owner; catch-up is admitted only for a fully hydrated complete eager graph.
- An event arriving after a full candidate was prepared but before it published; the event cannot inherit the candidate's complete marker.

The races exposed an older hot-body selection problem: source maintenance could already hold a newer parser token while GraphBuilder selected an equal-mtime older hot body. The token guard fixes that failure. An earlier overly broad journal recorded source-storage rewrites even with no maintenance change; narrowing it retained the existing optimistic-created-file contract without weakening its assertions. The two isolated no-op source doubles now explicitly declare their absent graph-journal capability; the API fixture supplies an empty journal. No oracle, assertion, timeout or production readiness guard was disabled.

### Follow-up from the maintainer's deployed test

A passive observation of the maintainer's 21:14 deployment confirmed the installed artifact matched the first candidate (`b5b8b0cfa69ba3c08951555fce84ebc81940c8a4d67412c7d08f6af5faebb28a`). Its saved graph load had failed on a missing page chunk. It completed the `source-vocabulary` fallback with `sourceBackedSemantics=true`, `fullSnapshotHydrated=false`, `onDemandPartialState=true` and cached-only API coverage despite a green 11,819/11,819 indicator. Seven navigation requests incurred 904 source-family visits, with no new body reads/parses. No production navigation, reload or test mutation was performed for this observation.

That evidence exposed a missing case in the initial fix: the maintenance journal deliberately cannot certify a node-only baseline. New tests retain the actual startup coordinator, real Chromium IndexedDB, missing/removed graph chunks and an independent full compiler oracle. Both cases failed before the follow-up because eager startup never admitted full relationships. They now require startup to remain incomplete during P4 ingestion, a new foreground destination to finish ahead of held P4 work, full lists/provenance/gate parity after recovery, and zero local preparation/body I/O on later navigation. Existing automatic metadata/storage recovery cases now require genuine complete graph coverage too. Coordinator-only doubles explicitly supply the new completion capability; their notification, cancellation and backlog assertions remain.

Focused Node **22.22.2** checks passed for the event/race cases, complete-graph navigation, affected no-op publication and new recovery cases. Final `npm run verify` is in progress; `%TEMP%/kplex-eager-recovery-verify.log` and its exit receipt are the actual aggregate evidence. Earlier interrupted attempts are not passing final evidence. The first follow-up aggregate found older isolated coordinator doubles that omitted graph completion; those were corrected and the main indexing harness passed before restarting the aggregate.

## Native acceptance

The maintained `eagerStartupRecovery.mjs` lane backs up Small's derived snapshot stores and active/checkpoint pointers, removes a real active page chunk with the plugin disabled and observes a normal plugin reload. It requires complete global recovery, zero unchanged-body reads/parses and six later destinations with no local requests or source-family visits, then restores cache/configuration/workspace. The maintained `eager-navigation` action-workflow lane uses backed-up Small, owned calendar/hub fixtures and actual native event handlers. It awaits natural global readiness; the earlier harness-triggered full baseline was removed because it concealed the startup failure. It asserts global coverage returns after native edits and a canvas relationship write, forbids another full build and captures each actual canvas-card hop's source work and DOM publication time. Neither lane replaces readiness methods or restamps counters. Strict staging verifies exact artifacts. Earlier reference-action workflows are rerun against the same build.

Small preflight: Windows Obsidian **1.14.5**, 98 Markdown files, eager strategy, ready. `kplex-test` did not expose CLI eval in the running application and is not used as a substitute test result. Native staging/scenarios remain pending until final verification succeeds; a shared application-user-data lock will serialize staging, both scenarios and cleanup.

Acceptance limits: native programmatic clicks and the existing canvas mutation owner do not establish physical pointer/drag, touch, macOS, screen-reader or screen-paint acceptance. Live production-vault measurements in the investigation are before-fix evidence, not candidate-build performance claims.

## Delivery

Production/test sources are frozen by SHA-256 in `%TEMP%/kplex-eager-fingerprint.json` before final native staging. The implementation is published for review while extended validation continues. The final update will record aggregate results, exact native artifacts, cleanup and the published PR identity.
