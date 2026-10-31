# K-Plex public API and CLI v1 — implementation brief

**Implemented in PR #240; complete repository verification and exact-build Windows native acceptance pass.** The [validation record](../validation/public-api-cli-240-2026-10-30.md) records results and remaining platform limits. This brief preserves the original scope and delivery gates. The implemented access convention, operation contracts, bounds and CLI usage are documented in the [public API reference](../PUBLIC_API.md) and [CLI guide](../CLI.md). Baseline scope began at K-Plex 0.3.1 `main@9e203ed`; the existing PR branch has since been refreshed and includes the ontology-description dependency. Related [#132](https://github.com/zsviczian/kplex/issues/132).

Exporter status: PR #237 has merged, and #240 integrates its existing committed-scene
capture and Mind Map Markdown formatter through `api.v1.exportMarkdown`. This read-only operation
returns Markdown, warnings and canvas identity/revision; it performs no clipboard or file-save
action. The shared native image exporter is integrated through merged PR #239; image export through the public API remains deferred. The gates
below remain the original specification; implemented details, acceptance and platform limits are tracked
in the current references above.

## Why
Make the semantic knowledge K-Plex *already* owns useful to trusted agents, scripts and other plugins: ontology meanings, reconciled graph relationships/evidence, and the **actual selected visual canvas**. Obsidian already handles Markdown CRUD; avoid duplicating it.

## Proposed public capability v1
A single versioned, typed, discoverable API at `window.kplexApi.v1`, shared across the main window and popouts with plugin-owned cleanup. Distinct from the existing internal `CANVAS_VIEW_API_VERSION`. Describe capabilities and return structured revision, coverage, truncation and errors.

### Read operations
1. **Ontology** works from loaded settings even before graph hydration: configured physical field names, role/direction, inverse pairing, descriptions, explicit syntax guidance and configured-vs-discovered distinction. Reuse the separate ontology-description PR's internal projection when merged. Agent-readable JSON/Markdown guide; do not invent meaning for undocumented fields.
2. **Graph**: index readiness/coverage, exact node lookup, bounded search/neighbors, canonical roles/relationships, per-pair evidence and provenance on explicit request. Respect explicit vs inferred authority, ghost/folder/tag/URL identities and source freshness. Partial knowledge cannot prove a whole-vault negative.
3. **Canvas**: list open canvases with session-scoped IDs; snapshot an explicit canvas's committed scene (focus/root, view, lens/preset, visible occurrences, category/area, fold/filter/selection, connections, bounds/camera/viewport, coverage). Distinguish **canonical graph**, **materialized scene**, and **visible viewport**, and semantic links from decorative guides. Never rerun the view's classifier or layout.

### Explicit action operations
- Navigate a specific canvas to an *existing* note; select view and active preset where supported. With multiple surfaces return AMBIGUOUS_CANVAS instead of guessing.
- List/export/validate/preview/apply Facets and lens packages through the **existing** portable JSON validator and queued settings writer. No automatic lens enable, silent replacement, data.json edit, orphan settings or unconfirmed mutations; report changed revision and verify application.
- Once *independent* canvas image and Mindmap Markdown export PRs merge, expose their shared services through this API; don't implement duplicate capture/export engines.

### GraphQL
Implement **read-only actual GraphQL** over a minimal typed schema with variables/introspection for ontology, graph, and canvas reads (one model). Keep actions as explicit methods, not GraphQL mutations in v1. Constrain nesting, depth, costs, output sizes, traversal, pages, cancellation and revision coherence. No uncontrolled recursive query, arbitrary note body export, vault-wide scans, or second index. If testing uncovers an unacceptable GraphQL dependency/runtime overhead, document a concrete alternative before changing the contract, rather than silently replacing it with invented query syntax.

**Index policy:** default queries currently published/indexed facts and report true coverage; `requireComplete` fails explicitly if required readiness cannot be demonstrated. No default request triggers vault-wide indexing, hydration, source reads/parses or rebuilds. Settings-based ontology data remains accessible while hydration continues. Optional targeted hydration belongs to future explicitly bounded operations.

### Obsidian CLI
Official CLI `eval` calls the public JS API inside Obsidian; give documented, reliable machine-readable invocation examples with error envelopes, timeouts/output budgets and mutation read-back. Do not assume plugins can register new parameterized `obsidian kplex:*` commands. A separate `kplex` executable wrapper is deferred pending validated demand. Arbitrary eval grants host privileges: public API isn't a sandbox. No HTTP, MCP server, remote model calls, network listener or telemetry.

## Delivery gates
A. Versioned service + ontology and bounded graph reads + minimal GraphQL schema.
B. Session-owned canvas snapshots, context Markdown, navigation/view commands.
C. Configuration read/validate/apply and CLI usage examples.
D. Wire approved exporter services when available; they are independent and should not block A–C.

## Acceptance
- Settings/ontology available before graph index, including descriptions if installed. Partial/unknown index results marked clearly.
- Two open Plexes with different roots/views/filters return independent snapshots and isolated action effects.
- Query cost caps and repeated use demonstrate zero unintended Markdown reads, parsing, acquisition, indexing/rebuilds; no indiscriminate `allPages()` materialization.
- Evidence/source identities and role reconciliation remain authoritative; stale revisions/failed writes produce clear errors and no partial setting application.
- API lifecycle unload/reload, popouts, CLI eval, native compatibility and test coverage. Run required type/build, Obsidian scanner, architecture and relevant native lanes. Record checks actually run.

**Out of scope:** note/relationship CRUD, unrestricted graph analytics, provider overlays from #132, an extra indexer, full note bodies by default, independent CLI runtime, HTTP services, auto-generated ontology meaning. **Dependencies:** ontology-description feature for richer guidance; image/Markdown exporters for optional export actions.
