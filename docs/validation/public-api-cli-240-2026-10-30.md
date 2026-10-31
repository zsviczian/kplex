# Public API and Obsidian CLI v1 — PR #240

## Implementation and dependency ownership

The existing `2026-10-30-public-api-cli` branch contains the versioned trusted local API at
`app.plugins.plugins["k-plex"].api.v1`. Its narrow application ports reuse the existing index,
ontology read model, native document sessions, portable-package validator/planner and queued
settings writer. No second index, relationship classifier, settings writer, source acquisition
path, remote service or listener was added. C14's structural-refactoring pause remains in force.

The branch includes the validated ontology-description dependency from PR #239 (`6ce6b5b`).
It was refreshed again when PR #237 merged to main (`f99aa39`). Public `exportMarkdown()`
delegates to that PR's committed-scene capture and Mind Map Markdown formatter; native preview
and public export share the same capture function. Image export #238 remains unmerged and is
advertised as unavailable. Neither #239 nor #240 has been merged by this implementation task.

GraphQL.js 16.14.2 is an exact bundled dependency. The schema is constructed on first query.
Actual GraphQL variables, fragments, aliases and standard introspection use the same passive
read operations. Query input, expanded selections, root work, resolvers, output and per-reader
work are bounded. The installed MIT copyright/permission notice is retained in the bundle.

Canvas identity belongs to an existing native document session. Metadata and scene publishers
advance only after React or camera-transform commits; stale source/semantic/configuration frames
report pending and cannot certify completeness. Scenes retain separate canonical identities,
visual occurrences, filter inclusion and viewport placement. Groups, outlines and decorative
connections receive no invented semantic authority. Public actions use existing captured native
preflight and report accepted/completed readback honestly.

## Validation results

Full `npm run verify:obsidian` passed on Windows, Node 22.22.2 and Obsidian 1.14.5
(installer 1.14.5), including actual installed Obsidian types, the production build, official
scanner and exact-build native smoke. No tests were skipped. The
[machine-readable receipt](public-api-cli-240-summary.json) records final artifacts and
native source/driver hashes.

| Lane | Passed |
| --- | ---: |
| Architecture/numeric controls | 9 |
| Core | 130 |
| Main regressions | 1,749 |
| Browser | 425 |
| Sources | 357 |
| IndexedDB/browser persistence | 855 |

The unchanged 20,015-owner cached-publication regression passed exact metadata, evidence,
gate and degree assertions plus cancellation and zero I/O. This is backend correctness evidence,
not actual paint or a comparative performance claim. The complete run lasted from
2026-10-30 22:44:48 UTC to 23:14:43 UTC. It began at `618c5f4` with implementation changes
uncommitted; runtime source remained frozen throughout. The follow-up commit records those
changes and validation metadata without changing the verified runtime afterward.

Focused tests cover early configured ontology, real GraphQL introspection and budgets, complete
versus partial coverage, canonical graph/evidence privacy, arbitrary node kinds, stale revisions,
cancellation, configuration transactions and write failures, preview expiry/ABA ownership,
disabled imports, native retirement receipts, bounded scene projection and canvas migration leases.

Final native feature acceptance passed on Windows with Node 22.22.2 and Obsidian 1.14.5
(installer 1.14.5), using only the explicit disposable `kplex-test-small` vault (117 files,
98 Markdown). Two main canvases and a popout returned independent roots, views and filters.
Targeted navigation/view actions, genuine GraphQL, configuration export/validation and a confirmed
one-shot queued lens import passed; the imported lens remained disabled and durable readback
verified. Repeated passive reads and shared Markdown exports observed exactly zero Vault reads,
parses, acquisitions, rebuilds, semantic invalidations and `allPages()` calls. Public Markdown
bytes matched the actual native preview. Captured Facets preset selection verified readback;
popout-to-main migration preserved the canvas ID, root, preset and readable scene. The existing
smoke-test canvas was preserved alongside the three probe-owned canvases. Source/index work
caused by explicit setup/actions was
outside the passive interval. Cached/unknown incomplete coverage was reported honestly.

A separate official-CLI unload/reload probe passed: retained API/configuration handles rejected
with `API_UNAVAILABLE`, released their host ports, and remained retired after a fresh API appeared.
Settings and plugin enablement bytes were preserved. All final native probes passed against the
same artifact staged by full verification:

| Artifact | SHA-256 |
| --- | --- |
| `main.js` | `6af8a99a0587b903b1608f71a7593bb300caf76a4bc9ee4c6a7c4d0343a1fce3` |
| `manifest.json` | `2822c38463c03ace4f017453679572d462534ce2a9c9558fd7593f259b01bfa1` |
| `styles.css` | `79bcd8ec38fdc0dd629f2cf52416094a97b958e8d558fa8c8ac1eef5869758ca` |

Reproduce serially with the explicit Small-vault variables in CONTRIBUTING.md:
`npm run verify:obsidian`, `npm run verify:obsidian:public-api`, then
`npm run verify:obsidian:public-api-lifetime`, each with a fresh report directory. The final local
raw receipts are under `%TEMP%/kplex-pr240-full-r6`, `%TEMP%/kplex-pr240-native-final` and
`%TEMP%/kplex-pr240-lifetime-final`; the committed summary omits local destination paths.

## Investigation notes

The first native probe incorrectly expected a refused mutation inside a successful GraphQL
envelope; the service correctly returned outer `UNSUPPORTED`. The assertion was corrected.
An initial staging run also captured plugin enablement before the CLI's asynchronous configuration
save settled; subsequent runs preserved exact enablement bytes. A second setup waited for all
deferred semantics even with no canvas demand. Passive inspection showed pending-but-inactive
work, so setup now waits for active work to settle and independently verifies incomplete coverage.
No source-read or timing guard was weakened.

An early full run was stopped to avoid allocating every wide variable entry before the GraphQL
structural guard. A regression now verifies that values beyond the finite budget are never read.
Another run was stopped when #237 merged, so its approved exporter could be integrated before
the final frozen-source run. These interrupted runs are not reported as successful verification.

The next complete run exposed nine viewport-fixture failures with the same missing
`committedCamera` dependency. That fixture extracts production callback bodies into an explicit
test environment. Its environment now includes the three new publication refs, and a new case
checks that publication observes the already-written DOM transform and a detached committed
camera, while later unflushed intent leaves that camera unchanged. All 30 viewport cases pass;
no production behavior or existing assertion was removed to resolve the failure.

The subsequent run was interrupted for a source-review correction: legacy Compass keyboard
reconciliation keys differ from public occurrence identities. Selection now resolves through
the existing scene-key map, with a bounded pure regression covering opaque keys and expanded
rows. The corrected public-canvas/API/viewport lanes passed all 56 cases before the final restart.

That run passed all 1,749 main regressions, then exposed the same missing camera refs in the
separate Chromium Compass-underlay fixture. Both extracted-callback consumers were inventoried;
the browser fixture now supplies the actual production closure dependencies too. Its existing
pixel-error, zero-measurement, frame-count and teardown assertions remain unchanged.

## Remaining validation boundaries

Native evidence covers Windows desktop 1.14.5. macOS window lifecycle, minimum supported Obsidian
1.13, physical Android/iOS input and real two-device Sync remain separate acceptance environments.
No paint, animation-completion or comparative startup-performance claim is made. Dense reads
can explicitly truncate or fail their budget; partial absence never proves a whole-vault negative.
The API performs no clipboard or file-save effect for Markdown export; those native UI operations
remain owned by #237. #238 image integration is a follow-up after its shared service merges.

Highest-probability manual checks are native editor-save/navigation refusal during a targeted
action, popout teardown/migration on macOS, and physical mobile canvas controls while the graph
is incomplete. Test main-window and popout workflows separately; Windows automation does not
stand in for those environments.
