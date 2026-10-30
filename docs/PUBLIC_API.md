# Public K-Plex API, version 1

K-Plex exposes its existing ontology, indexed relationships and open canvases to trusted local scripts and plugins. The entry point is the loaded plugin instance:

```js
const plugin = app.plugins.plugins["k-plex"];
const api = plugin?.api?.v1;
if (!api) throw new Error("K-Plex API v1 is unavailable");
const capabilities = api.capabilities();
```

Implementation status: source implementation is present on draft PR #240. Focused API/configuration checks have run; complete repository verification and exact-build native acceptance remain pending. This reference describes implemented contracts, not release acceptance. The original [implementation brief](proposals/PUBLIC_API_CLI_V1.md) records scope and delivery gates.

`plugin.api.version` is `1`; `plugin.api.versions` lists supported versions. This protocol is independent of the internal [Canvas-view API](CANVAS_VIEW_API.md). The community-plugin registry is Obsidian's host access convention, not a portable dependency for K-Plex application code. Reacquire the API after plugin reload. Retained old handles return `API_UNAVAILABLE` and release their host capabilities.

The API runs locally inside Obsidian. It creates no HTTP server, MCP server or network listener. It is a trusted automation interface, not a sandbox: an Obsidian `eval` caller already has host privileges. Markdown creation and editing remain with Obsidian; this API supplies no note or relationship CRUD.

## Results and revisions

Every public operation returns an envelope. Reads are synchronous; explicit actions return a promise:

```text
// Success
{ok: true, value, revision: {semantic, source, configuration}, coverage, truncated}
// Failure
{ok: false, error: {code, message}, revision: {semantic, source, configuration}}
```

Revisions are session-local observations, not durable cross-device sequence numbers. A canvas also carries its own revision. A returned DTO is detached from plugin settings, graph pages, native leaves and React state. Canonical node IDs are exact and case-sensitive; use the separate `path` and `file.path` fields when those are present. Do not derive a path or node kind from an ID.

Read options include `expectedRevision`, `requireComplete` and an optional synchronous `isCancelled()` callback. A stale revision fails explicitly. `requireComplete` never waits for indexing or starts additional work; incomplete or truncated results fail with `INDEX_INCOMPLETE`.

Coverage distinguishes configuration, global, local, cached and unknown scopes. A complete ontology definition list is not proof of complete graph coverage. Search readiness, neutral-source readiness, one prepared neighborhood and complete global relationship coverage are separate facts. Empty or missing partial results cannot prove a whole-vault negative.

## Discover ontology and indexed knowledge

| Method | Input and result |
| --- | --- |
| `capabilities()` | Supported operations, limits and optional exporter availability. |
| `status(options?)` | Current indexing phase, known file counts, mode, hydration, search readiness, source readiness and coverage. Unknown total counts remain `null`. |
| `coverage({id?, ...options}?)` | Current global or exact-node coverage certificate. |
| `ontology({includeDiscovered?, limit?, ...options}?)` | Configured physical fields, roles, inverse partners, each field's own description, and configured/discovered flags. Discovery is opt-in and can be incomplete. |
| `ontologyGuide({format?, includeDiscovered?, limit?, ...options}?)` | JSON or Markdown ontology guidance, including exact-property syntax. Missing descriptions supply no invented meaning. |
| `node({id, ...options})` | One indexed node, or `null`, with explicit node kind, resolution and optional file facts. |
| `search({query, limit?, ...options})` | Bounded ranked search of the currently published vocabulary. Returns `items`, `scanned` and `truncated`. |
| `neighbors({id, role?, limit?, ...options})` | Bounded canonical relationships from one indexed node, independent of canvas lenses and visibility controls. |
| `evidence({sourceId, targetId, limit?, ...options})` | Bounded pair-specific decisions, actual source provenance, overridden evidence and reconciled roles. |

Ontology is available once settings are loaded, before graph hydration finishes. Descriptions belong to physical fields; the two members of an inverse pair may have independent text. Unassigned discovered properties are inventory, not relationship definitions. Either endpoint can author one physical property; K-Plex does not automatically write a reciprocal property in the other note.

Graph reads use published facts. They do not trigger source acquisition, Markdown reads/parsing, targeted hydration or semantic rebuilding. A pending or cached neighborhood is reported as such. Canonical roles are `parent`, `child`, `left`, `right`, `previous` and `next`; evidence retains explicit/inferred authority and source identity. Optional siblings in a visual projection do not become fabricated canonical declarations.

Default graph pages contain at most 40 results; the maximum is 200. Search text is bounded to 512 characters. Search and neighborhood inspection have an 8,192-entry work budget and can truncate before examining all candidates. Ontology has a separate 2,048-field cap. Pair evidence defaults to 128 decisions and allows at most 512. Output is limited to 1,048,576 encoded characters, with a separate structural guard. Check `api.limits` and the envelope's truncation/coverage fields rather than assuming every result is exhaustive. Version 1 has no unbounded traversal or cursor that bypasses these caps.

## Read and control a specific canvas

```js
const canvases = api.canvases();
if (!canvases.ok) throw new Error(canvases.error.code);
const canvasId = canvases.value[0]?.id;
const snapshot = api.canvas({canvasId});
const markdown = api.context({canvasId});
```

Canvas IDs belong to native canvas sessions. They expire when that canvas closes or the plugin reloads. Supply an explicit `canvasId` whenever more than one canvas is open; omission returns `AMBIGUOUS_CANVAS` instead of selecting the focused or most recent surface.

Canvas discovery allows at most 64 open registrations and fails explicitly beyond that inventory. A snapshot bounds its own projection to 2,048 occurrences, 4,096 connections, 256 areas and 256 decorations, plus bounded text/points and at most 128 active lens summaries. Omitted tails report `truncated`; a scene snapshot is not an unbounded export.

`canvas()` reads the committed visual model already produced by that canvas. It includes view/root/attention, selected preset, active lenses, quick/area filters, folds, selection, occurrence identities and bounds, area scroll/viewport facts, camera, connections, decorative guides and coverage. The API does not rerun a classifier or layout. `foldState` distinguishes actual branch expansion, central section expansion and unfolded groups; `folds` remains the concise list of explicitly collapsed branch occurrences.

The snapshot carries `semanticRevision`, `sourceRevision` and `configurationRevision` stamped when its render frame was committed. The envelope carries the current API revisions and that canvas's revision coordinate. `scenePending` is true when the frame is stale against current publications, the requested scene/scope is still pending, or a transition has not settled. Its coverage cannot certify completeness while pending. `motionPending` additionally reports scene motion or an unflushed camera write. Camera values describe committed transforms, not a promise that pixels have painted. A canvas expected-revision check includes `expectedRevision.canvas`; ordinary graph reads use semantic/source/configuration coordinates.

Three scopes remain distinct:

- The canonical graph contains indexed semantic nodes and relationships.
- The materialized scene contains occurrences admitted by one view. A node can have multiple visual occurrences; sections and groups are not canonical note nodes.
- `included` and `inViewport` report filter inclusion and current visible placement separately. Offscreen or clipped occurrences are not absent graph nodes.

Connections have explicit `semantic`, `structural` or `decorative` kinds. Decorative Facets guides never become relationship evidence. `context()` projects the same bounded scene into Markdown for an agent; it does not export note bodies.

Explicit actions use the existing native save/editor/session owners and affect only the selected canvas:

```js
await api.navigate({canvasId, path: "Existing note.md"});
await api.selectView({canvasId, viewId: "mindmap"});
await api.selectPreset({canvasId, presetId: "map-roles"});
```

Navigation requires an existing physical vault file already available in the filename catalog. It does not create or materialize a missing note. View selection uses registered view IDs (`classic`, `mindmap`, `wuxing` for Compass, Mind Map and Facets). Preset selection is available only where the current view supplies that enabled, unambiguous choice. Actions can legitimately start the same bounded view demand as their interactive equivalents.

Action receipts contain `status: "accepted" | "completed"`, the canvas ID and its observed revision. `accepted` means the existing owner accepted the request; asynchronous native save/navigation or React scene admission can still be pending. `completed` reports the requested metadata observed at return, not paint or animation completion. Immediate refusal and retirement return explicit failures. Reacquire `canvas()` and verify the desired attention/root/view/preset together with `scenePending` before treating the final visual transition as observed. Never infer a completed navigation from an accepted receipt alone.

## Portable configuration

Configuration methods use the same [portable package format, validator, privacy checks and import planner](PORTABLE_PRESETS.md) as the native Facets/lens UI. They do not edit `data.json` directly.

```js
api.configuration.list({offset: 0, limit: 100});
api.configuration.export({kind: "facets", id: "map-roles", lensIds: []});
api.configuration.export({kind: "lens", id: "my-lens", allowPrivate: true});
api.configuration.validate(packageJson);
```

`list()` pages presets, lenses and palette identities independently using the same offset/limit, with separate totals and an aggregate `truncated` flag. The maximum page is 200. Export is explicit per definition. Lens enabled state is excluded from packages. Selected dependencies and privacy consent are explicit; `allowPrivate` defaults to false. The validator returns its canonical structured `valid`/`invalid` result within the API envelope.

Import requires a reviewed, expiring capability and a second explicit confirmation:

```js
const preview = api.configuration.preview(packageJson, {
  targetId: "reviewed-copy",
  replace: false,
  lensIds: [],
  replacePalette: [],
});
if (!preview.ok) throw new Error(preview.error.code);

// Inspect preview.value.package, choices, privacy and target identity first.
const saved = await api.configuration.apply({
  previewId: preview.value.previewId,
  confirm: true,
});
```

Only 16 previews are retained per API instance; a preview expires after five minutes, and applying it consumes it. The returned package and choices are detached: editing them cannot change the retained plan. A changed choice requires a new preview. Replacing an installed target requires `replace: true` with its exact identity. Dependency lenses are opt-in and imported disabled; colliding dependency lenses must be imported separately. Palette replacement is opt-in.

The preview captures target, dependency, palette, incoming-settings and appearance ownership, and the queued writer checks those owners again before acceptance. Receiving a different configuration and then the original values does not revive an old review. Stale/invalid previews, capacity failures and rejected saves publish no partial configuration. Unrelated entries remain mergeable. Import never selects a canvas view/preset, automatically enables a lens, edits notes or changes ontology/index policy.

A successful apply returns `state: "saved"`, `refreshPending`, `verified`, the observed configuration revision and exact target readback. `refreshPending: true` means persistence succeeded but display refresh is pending; do not replay the old import. `verified: false` means the accepted save could not be verified against current live state, for example after a later settings receipt, an unavailable readback or API teardown. When readback is unavailable, the receipt's revision and readback are `null`. Reacquire the current API and inspect the target. A failed apply requires a fresh preview before retrying.

## GraphQL

`query()` executes actual GraphQL through bundled GraphQL.js, using the same read operations:

```js
const result = api.query({
  query: `query Knowledge($id: ID!) {
    ontology { fields { name role partner description configured discovered } }
    node(id: $id) { id name kind path }
    neighbors(id: $id, limit: 20) {
      items { targetId role relationType definition }
      truncated
      coverage { scope complete pending }
      revision { semantic source configuration }
    }
  }`,
  variables: {id: "Existing note.md"},
  operationName: "Knowledge",
});
```

The outer result is the normal API envelope. GraphQL execution then supplies `value.data` and optional `value.errors`; inspect both. Field errors retain their machine code in `extensions.code`. Variables, aliases, fragments and schema introspection are supported. Actions are explicit JavaScript methods: no GraphQL mutation or subscription API is registered. Request-level `requireComplete` applies to each requested read's actual scope: configured ontology can succeed before graph completion, while incomplete graph reads produce field errors. An explicit discovered-ontology completeness request also requires a complete discovery certificate. The outer envelope's global coverage remains informative and does not veto a configuration-only query.

The transport is constructed lazily. Queries are bounded to 16,384 characters and 4,096 tokens, with depth 20, expanded-selection and execution cost 65,536, bounded variable structures, normal per-read page/work limits and the shared output cap. Graph/canvas root reads reserve their worst-case work before execution; aliases share the total budget. Search also has a 262,144-character inspection budget. Repeated aliases and fragments consume those budgets. All resolvers run synchronously within a revision frame; there is no uncontrolled recursive graph traversal or asynchronous hydration. Use `capabilities()` and schema introspection for discovery instead of assuming a handwritten query language.

## Errors and optional exports

Machine codes include `API_UNAVAILABLE`, `INVALID_ARGUMENT`, `NOT_FOUND`, `AMBIGUOUS_CANVAS`, `INDEX_INCOMPLETE`, `LIMIT_EXCEEDED`, `STALE_REVISION`, `CANCELLED`, `CONFIRMATION_REQUIRED`, `WRITE_FAILED`, `UNAVAILABLE` and `UNSUPPORTED`. Messages are developer diagnostics; code is the stable discriminator.

Image export and Mind Map Markdown export remain explicit follow-ups to their independent shared exporter PRs (#237 and #238). Version 1 advertises those capabilities as unavailable until their services are integrated; it contains no duplicate capture or export engine. See [Obsidian CLI usage](CLI.md) for direct invocation and readback examples.

GraphQL.js is bundled under its MIT license. Its full installed copyright and permission notice is retained in the generated JavaScript through the adapter's legal-comment block, alongside the bundler's existing third-party legal comments.
