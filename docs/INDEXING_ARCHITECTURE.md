# K-Plex indexing architecture

K-Plex deliberately separates **what the vault says** from **how K-Plex resolves that evidence into a visible graph**.

## Pipeline

```text
Vault tree / tag tree / Obsidian links / frontmatter / body fields / Date properties / URLs
                                  │
                                  ▼
                          RelationEvidence[]
                     (with source provenance)
                                  │
                                  ▼
                         RelationResolver
                 precedence + relationship truth table
                                  │
                                  ▼
                        resolved GraphState
                                  │
                       atomic snapshot swap
                                  │
                                  ▼
                         GraphIndex queries
                   neighbourhood / search / explain
```

The main boundaries are:

- `fieldParser.ts` — one canonical parser for legacy Dataview-style body fields and body URLs.
- `MetadataParser.ts` — parsing abstraction used by the builder; no duplicated parser grammar.
- `RelationEvidence.ts` — immutable relationship evidence and source provenance.
- `RelationResolver.ts` — precedence and ExcaliBrain-compatible relationship classification.
- `GraphState.ts` — one graph snapshot.
- `GraphBuilder.ts` — collects all vault evidence and builds a complete private snapshot.
- `GraphIndex.ts` — publishes snapshots atomically and serves neighbourhood/search/explanation queries.

## Frontmatter precedence

K-Plex intentionally differs from classic ExcaliBrain here.

If the **same declaring note** has a frontmatter ontology relationship and a conflicting body ontology relationship to the **same target**, frontmatter wins.

Example:

```yaml
---
Parent: "[[B]]"
---
```

```md
Child:: [[B]]
```

The visible result is `B = Parent — DEFINED`.

The important architectural rule is that the body `Child` evidence is **not deleted during collection**. Both declarations enter `RelationEvidenceStore`. `RelationResolver.applyOntologyPrecedence()` marks the body declaration overridden when resolving the pair. Explainability can therefore show:

```text
USED        Frontmatter ontology · Parent — Defined
OVERRIDDEN  Body ontology · Child — Defined
```

If frontmatter and body declare the **same** role, both may remain active because there is no conflict. Conflicts wholly within one source tier continue through the normal ExcaliBrain-compatible classifier.

## Evidence provenance

Evidence records retain enough context to answer “why is this relationship here?” and to support future source-aware editing:

- source and target paths;
- semantic role;
- defined/inferred type;
- link direction;
- source kind (`frontmatter-ontology`, `inline-ontology`, `obsidian-link`, `date-property`, etc.);
- ontology/property field name;
- raw field value where available;
- body line number and source-range offsets where available;
- original declaring note, target and role before the inverse view is generated.

Right-clicking a visible graph connector exposes this information through **Explain relationship**.

## Body fields

The parser supports the legacy Dataview forms exercised by `tests/fixtures/excalibrain-indexing`:

```md
Parent:: [[B]]
(Parent:: [[B]])
[Parent:: [[B]]]
**Parent**:: [[B]]
- Parent:: [[B]]
Text (Friend:: [[B]], [[C]]) and [[D]] remains an ordinary link.
```

Multiple inline fields on one physical line are parsed independently. YAML/frontmatter, fenced code and inline code are excluded from body-field parsing.

## Date properties

Obsidian properties configured as type **Date** are mapped through the enabled Daily Notes configuration using Obsidian's Moment formatter, so customized Daily Notes formats are honored rather than being limited to a small token subset. Existing daily notes resolve to physical Markdown files; missing dates become virtual targets. The Date-property name and raw value remain provenance on the inferred relationship.

This is different from interpreting every ISO-looking string as a date: K-Plex checks the Obsidian property type registry first.

## Snapshot publication, demand gating, and startup persistence

`GraphBuilder` constructs a graph privately. `GraphIndex` publishes only a fully collected and resolved state. Rebuilds are generation-scoped and cancellable, so stale partial work cannot replace the live graph. `main.ts` tracks a dirty revision and clears the backlog only when a build actually publishes the revision it started from.

Automatic edit indexing is **visibility-demand gated**. An Obsidian K-Plex tab can remain mounted while hidden behind another tab; that does not count as visible demand. Hidden surfaces retain the dirty backlog but do not automatically parse/build, persist a new snapshot, or run the graph React subscription. Revealing a K-Plex surface catches up from the accumulated dirty revision. Explicit commands and the documented once-per-session startup path are separate from this automatic edit policy.

Folder and tag **node visibility is presentation state, not an index mode**. Their structural topology is maintained from Obsidian's in-memory `Vault` tree and `MetadataCache`, without Markdown body reads. `showFolderNodes` and `showTagNodes` must therefore never participate in the semantic-settings signature or schedule a rebuild; hiding them only filters already-materialized nodes, and revealing them reuses the same graph immediately.

The resolved semantic graph is persisted in **IndexedDB as a transactional, generation-scoped chunked snapshot**. The active metadata record is written only after the new page/evidence generation is complete, so interrupted writes cannot make a partial generation authoritative. A cheap vault signature plus semantic-settings signature decides whether the restored snapshot is already fresh. A full restored generation whose physical file bindings/tree no longer match the vault is rejected before evidence/relation hydration instead of being retained beside a replacement build; an already-published bounded preview may remain non-authoritative while the rebuild starts.

IndexedDB is always treated as an optimization. Opening the database has a short deadline and bounded retry backoff: if WebView storage is blocked or slow, startup proceeds using vault reads rather than waiting indefinitely, and a late stale connection is closed. Page/evidence hydration is chunked, time-sliced, and generation checked. Deferred snapshot/orphan maintenance is cancelled when there is no visible K-Plex demand.

Progressive snapshot hydration is also bounded against a *stalled* asynchronous read. `GraphIndex` records its current restore phase (including metadata and targeted preview reads), last active phase, terminal outcome and sampled page/relation/evidence/search/resolver progress. Unload immediately settles the hydration wait and stops its watchdog; cancelled startup continuations do not rebuild. If a run makes no phase/progress for 90 seconds, an inactivity watchdog invalidates that hydration generation and releases startup as an unsuccessful restore; the existing coordinator then rebuilds authoritatively. The already-published preview may remain usable while this happens, but it is never considered the complete graph. If the abandoned IndexedDB operation later resumes, generation checks prevent it from publishing over newer state. This is deliberately an inactivity bound rather than a total-startup deadline so legitimately large snapshots may continue as long as they are making progress.

Runtime inspection and fault-injection procedure: [Obsidian runtime testing](OBSIDIAN_RUNTIME_TESTING.md).

A durable per-file body parse cache is keyed by file path + mtime. On large iOS cold starts K-Plex can prewarm that compact cache in bounded checkpoints before retaining the full graph, so an interrupted first run resumes rather than rereading every body. Desktop cold builds overlap a small, byte-capped number of native file reads; parsing remains bounded and publication is still atomic. Worker parsing is disabled on iOS to avoid structured-clone duplication.

Semantic no-op detection uses a compact per-file fingerprint kept independently of the hot parsed-body LRU and persisted with page snapshot records. This allows prose-only or unrelated frontmatter edits to stay no-ops even after a warm restore or after the hot body entry has been evicted.


## Presentation predicates are not graph indexing

The visible Plex can be filtered through a declarative predicate engine without broadening the persistent graph snapshot. The existing Keyword / Tag / Note type controls compile to that generic predicate representation. Named Graph Lenses parse a safe Bases-inspired expression syntax into the same AST; style rules will reuse that selector layer.

Predicate contexts are separated by meaning:

- `node.*` — K-Plex node fields already present in the semantic graph;
- `edge.*` — the resolved relationship shown in the Plex;
- `evidence.*` — provenance retained in `RelationEvidence`;
- `note.*` — arbitrary Markdown frontmatter resolved lazily from Obsidian `MetadataCache`;
- `file.*` — physical file metadata;
- `this.*` — the current center thought.

Arbitrary frontmatter **values are not copied into `GraphPage`, graph snapshots or IndexedDB** for filtering. A predicate that references `note.status`, for example, reads that value from Obsidian's already-parsed metadata cache when evaluating the currently visible Plex. Predicate dependency tracking tells the UI when such cached metadata can affect the current view. That refresh path is separate from semantic graph reconstruction.

The incremental semantic fingerprint likewise distinguishes graph-relevant frontmatter values from arbitrary presentation metadata. Ontology fields, aliases/tags, note type/style fields and Date properties remain semantic inputs. Unrelated property names and values do not participate in the semantic fingerprint. A newly seen non-semantic property name may update the lightweight discovered-field catalogue, but that bookkeeping does not emit a semantic graph change or re-resolve relationship evidence.


Named lenses are persisted presentation rules with three target scopes: **node**, **edge**, and **evidence**. Include lenses are combined by union; exclude lenses subtract from that result. With no active include lens, the already-materialized Plex is the baseline. The central node remains visible. Evidence selectors evaluate retained relationship decisions, including `evidence.active` and `evidence.suppressionReason`, without discovering additional graph depth.

The expression parser supports property comparisons, `and` / `or` / `not`, parentheses, bracket notation for property names with spaces, and safe helpers such as `file.hasTag("meeting")`, `file.inFolder("Projects")`, and `.contains(...)`. It produces the predicate AST directly and has no `eval`, `Function`, JavaScript callback, or Dataview execution path.

This layer is intentionally not a whole-vault or arbitrary-depth graph query API. K-Plex keeps the bounded, structured Plex model; a separate graph-query API can be considered independently in the future.

## Compatibility fixture

Run:

```bash
npm test
```

The golden fixture is `tests/fixtures/excalibrain-indexing`.

The current automated baseline covers README assertions **1–33 plus P1–P6**, including parsing, explicit/inferred reconciliation, K-Plex frontmatter precedence, Previous/Next, Hidden, note type, folders, tags, URLs, Date → Daily Notes, placeholders, explanation provenance, malformed-delimiter parser regression, idempotent/shared-lifetime derived URL-origin patching, stale derived-node search cleanup, and tag-aware incremental patch equivalence.

Assertions **34–50** cover the runtime-only central-note section outline, including nested heading structure, folding, projection of hidden descendant relationships to the nearest visible folded section, and restoration of the unchanged note-level persistent index after collapse.

## Planned work avoidance (not implemented by C08P)

The definitive checkpoint ledger is [Refactor plan.md](../Refactor%20plan.md), section C08P. Preserve these assigned opportunities through subsequent extractions:

- C11/C12: compact per-file normalized semantic contributions; no new persistence yet.
- C13: benchmark two desktop parser workers with byte/file limits; keep the existing iOS worker policy.
- C14: latest-wins per-source compilation with atomic per-file commit; supersession does not imply a full rebuild.
- C16: extract current snapshot/cache bytes and transactions first; evaluate semantic shards and checkpoint-plus-delta persistence separately with migration, compaction and fallback designs.
- C17 (or measured C13 follow-up): maintained search/secondary indexes to avoid redundant whole-graph passes without sacrificing atomic publication or increasing retained memory unnecessarily.

These are measured follow-up design opportunities, not shipped capabilities or permission to redesign the index before its boundaries are extracted.
