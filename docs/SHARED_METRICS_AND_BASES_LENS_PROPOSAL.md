# Draft specification: shared link metrics and Bases-backed lens filtering

Status: **specification only**. No runtime/host implementation, validation claims or speculative Bases API are introduced by this branch.
Related: [Facets layouts/sharing PR #222](https://github.com/zsviczian/kplex/pull/222), [Facets PR #220](https://github.com/zsviczian/kplex/pull/220), [GQL/query API issue #132](https://github.com/zsviczian/kplex/issues/132), [query-backed nodes issue #29](https://github.com/zsviczian/kplex/issues/29), [shareable presets issue #135](https://github.com/zsviczian/kplex/issues/135).
Initial main baseline: 26623c8393bddc0c3bcac39468078ec20ceccbc8, 2026-10-25.
**Execution order: this PR is intended AFTER [Facets/lens follow-up PR #222](https://github.com/zsviczian/kplex/pull/222) merges.**

## 0. Mandatory first step: latest main BEFORE implementation

1. Inspect the current GitHub main branch, PR #220 and [Facets/lens follow-up PR #222](https://github.com/zsviczian/kplex/pull/222), related open PRs/issues and their final accepted designs. Read AGENTS.md, CONTRIBUTING.md, docs/ARCHITECTURE.md, docs/INDEXING_ARCHITECTURE.md and accepted canvas-view/lens API/docs/source/tests.
2. **Do not start this implementation until #220 AND [#222](https://github.com/zsviczian/kplex/pull/222) have merged into main.** This draft starts as documentation on the current main and intentionally contains no Facets branch code. Do not consume moving unmerged branches.
3. When prerequisites are merged, normally integrate the latest accepted main into this existing remote branch; inspect actual index mode, graph/publication/coverage APIs, predicate grammar, lens filtering ownership, Bases types and native runtime before deciding implementation details. Reconcile this draft with the accepted API, record the starting main SHA, and update the PR plan.
4. Recheck latest main again before final verification/handoff. No direct writes to main, no force-push, no merge or release without separate authorization.
5. **Bases public API feasibility is a gating investigation**, not an invitation to invent a headless query API. Preserve the independently useful metrics work if Bases needs a later decision; report the blocker and request maintainer direction before shipping a weakened substitute.

Follow the repository mixed-agent/native validation procedures. The branch is an implementation workspace only after the prerequisites and feasibility checks.

## 1. Product objective

Extend **existing K-Plex lenses and Facets rules** with meaningful read-only link statistics, and let a lens constrain the **already admitted local K-Plex neighborhood** to the evaluated note identities from a chosen Obsidian Base/view when supported by documented public APIs.

Keep the K-Plex model: bounded hundreds of real ThoughtNode cards, focused note, existing graph relationships, hover/evidence, editor/Sidecar, Find/history/pins and shared lens Keep/Reflow modes.

**No dedicated Base rendering mode, duplicate index, whole-vault Atlas/Ideaverse clone, 3D view, arbitrary global ranking/scoring system or new GQL/query language.** The separate Facets follow-up owns layouts, presets and portable lens/Facets JSON exchange. This PR owns **data capabilities** only.

## 2. Shared counts and graph-statistics read capability

### First inspect what already exists

Trace actual GraphIndex/GraphBuilder, canonical publication, source/evidence, all-role gate counts, cached relation readers, source revisions, local-vs-complete scope and existing lens predicates. Distinguish:

- Whole-vault known node vocabulary vs complete relationship/source coverage.
- Published physical notes vs virtual, unresolved, folder/tag/URL endpoints.
- **Authored incoming/outgoing links** (source document wrote a reference) vs **resolved semantic parent/child/friend roles** (ontology meaning may reverse spatial direction).
- Body wikilinks, explicit configured relation-property links, ordinary other-property references, inferred inverse edges, deduplicated pair semantics and hidden evidence.
- Full indexing and warm snapshots vs on-demand preparation/hydration.

Prefer existing count/provenance/caches and narrow read adapters. A static GraphIndex.allPages() catalogue is **not** proof of complete adjacency, nor evidence that a node has no incoming links. Do not scan the entire vault merely because a lens asks for a metric.

### Minimum first contract

Expose a small **read-only, revision-scoped and coverage-aware metrics capability** usable by the existing predicate engine and Facets advanced rules, with:

- Verified incoming authored **note links**, outgoing authored note links, and unique linked neighbors/degree, with clear deduplication rules and self-link exclusion. Make the counting universe explicit (which evidence kinds and node kinds count).
- If affordable from existing evidence, separate semantic relation counts by role as an additional metric, clearly distinguished from raw incoming/outgoing link direction; never count a derived inverse as an additional authored link.
- Each value has **scope, provenance/meaning, validity revision and completeness**. When partial, provide a certified lower bound only where it can be proven; otherwise report unavailable, never exact zero by assumption.
- No automatic numerical “importance,” Idea Emergence levels, logarithmic weight formula, vault-wide score or persisted per-note popularity ranking. Later local-relative ranking may be built from admitted scene counts but needs an explicit population/completeness definition and approval.

Prefer a narrow read port in the existing core graph/predicate contract; implement through GraphIndex's accepted source/evidence owner and existing lens read boundary, not by giving portable predicates the plugin or App. Keep opaque NodeIds opaque and exact.

### Predicate behavior

Offer user-friendly comparisons such as "incoming authored links at least 5" and "outgoing authored links less than 3" in the **same existing Simple and Code predicate controls** used by lenses and Facets.

Only advertise concrete expression paths/operators the accepted grammar can actually parse. Extend the existing parser/predicate evaluator in one place as needed, with shared Simple/Code parity and localization; no second expression language or repeated full neighborhood counting on every render.

When only a **certified minimum** is known:
- lowerBound 7 makes "count >= 5" provably true and "count < 5" provably false;
- lowerBound 2 cannot decide "count < 5" or "count >= 5" without completion;
- negating an unknown condition must remain unknown, not silently true.

Do not fabricate exact zeros for missing on-demand scopes. A rule needing complete counts says Checking/Unavailable. Keep privacy-aware hidden-count presentation and lens Keep/Reflow semantics intact; metrics respect the authorized source/visibility policy and must not leak sensitive hidden notes through a visible metric. Distinguish full-graph from visible-subset statistics in labels.

### Performance

- Use current accepted graph/source snapshots, fine-grained invalidation, existing publication revisions and bounded lazy reads. Avoid O(vault size) work on hover, lens toggle, presentation/color/layout/camera or every search keystroke.
- Index changes only through normal incremental publication. If a metric cannot be served without costly hydration in on-demand mode, return unavailable until accepted preparation provides it. No forced full index/startup hydration, cache format migration or new scheduler without separately approved evidence.
- Multiple lenses and Facets canvases share values safely without per-view duplicated global caches.
- Bound admitted metric queries and temporary computations with current identity/file/stat/policy fences.
- Characterize cold/warm/on-demand resource impact with instrumentation before expanding source demand.

## 3. Bases-backed lens: functional contract

**Desired UX:** in the existing lens editor, select **"Matches Base view"**, choose a .base file and named view/configuration within it, and apply its evaluated result as a read-only filter over K-Plex's current graph neighborhood.

Example: current note has 70 related nodes; chosen Base view returns 20 files; K-Plex displays their intersection (plus focused note under existing lens policy), preserving exact relationship identities and the other lenses.

Lens options:
- Choose named Base file/view, show understandable source status and result count.
- Include or exclude matching files (exclude must not treat missing/unavailable Base results as "nothing matches").
- Reuse lens ordering, enable/disable, Keep/Reflow and composition with other conditions; do not copy filtering UI.
- Retain canonical K-Plex node identities when matching evaluated TFile results. No automatic connection creation, node materialization, note mutation, navigation or category assignment.
- Refresh membership on Base data/config changes through documented lifecycle and published revision; preserve focus/editor.
- Missing/disabled/deleted/unavailable Base shows a warning/unknown state and retains configuration for later restoration.

## 4. Bases API feasibility gate — REQUIRED BEFORE implementation

Official starting source: [Obsidian: Build a Bases view](https://docs.obsidian.md/plugins/guides/bases-view).

The official API supports registering a custom BasesView and receiving evaluated rows via BasesView.onDataUpdated() and this.data. **It has not been demonstrated that an arbitrary named .base file/view can be queried headlessly from another plugin view via a public supported API.** Do not assert such an API exists.

Before writing a connector:
1. Read the **installed** Obsidian type declarations and official docs for Plugin.registerBasesView, BasesView, QueryController, BasesViewConfig and the real update/data lifecycle. Determine whether a public API can produce evaluated results for an arbitrary named Base view without mounting it.
2. Trace actual K-Plex lens stages and workspace/view ownership; inspect [Nick Milo's Bases adapter](https://github.com/nickmilo/ideaverse-maps/blob/8f819faaa21ff733ed1cc5bda8c006b919a7d373/src/bases.js) only as a functional reference.
3. Publish a compact feasibility result: **supported direct named-view query**, **supported only while a BasesView is mounted**, or **no public supported bridge**. Include exact API members and a small live disposable-vault receipt when possible. A CLI command or internal/private Bases evaluator does not prove a supported in-plugin API.
4. If direct named-view evaluation is supported, implement it through a public type-checked host adapter and accepted K-Plex lens-membership port.
5. If only mounted BasesView updates are supported, propose an opt-in lifecycle-bound registered BasesView observer/provider. Be explicit filtering works only with a mounted/participating Base. **Ask the maintainer to accept the narrower behavior before substituting it for the requested named-Base UX.**
6. If no safe supported path exists, keep Bases blocked/documented, finish the independently useful metrics where feasible and request direction. Do not reverse-engineer Bases grammar, register hidden fake views, or parse .base files to execute filters privately.

Use native Obsidian APIs and current K-Plex plugin lifetimes. No external network or personal vault access.

## 5. Result-set adapter and lens ownership

If feasibility succeeds, keep a thin read-only provider translating **evaluated Base entries to a revision-scoped canonical file-ID membership set**:

- Owner = exact Base file and view identity plus native-view incarnation; data version and source availability explicit.
- Membership backed by current TFile identity/path; handle rename, deletion, reused path and stale async delivery without borrowing another canvas/session.
- Never copy note content, property payload, formulas, credentials or private query state into K-Plex's semantic index/persisted snapshot.
- No extra metadata/body parsing, semantic rebuilding or full-vault file reads caused by a lens toggle. Obsidian owns Base query evaluation; K-Plex consumes resulting identities.
- Reuse the existing lens pipeline and persistent lens writer. No second lens registry, universal script engine or GQL implementation.
- Respect Base's own filters, formulas and view configuration when obtaining evaluated candidates; duplicate file references deduplicate.
- Base result readiness is independent of K-Plex on-demand graph coverage. File membership does not imply that all graph relationships have been prepared.
- Filter only already-admitted K-Plex neighboring nodes; **do not turn arbitrary Base results into unlinked graph nodes** in this Option A.
- Provider disposal, disabled Bases, closed view (if mounted-only), new/changed Base config, tab/popout lifecycle and delayed events revoke/refresh membership. Unknown membership never silently becomes an empty result or a stale definitive answer.

See [#132](https://github.com/zsviczian/kplex/issues/132) for later broad query/overlay concepts. Full GQL, synthetic nodes and a K-Plex Bases rendering view are separate work.

## 6. Shared UI and configuration

Keep metrics and Bases membership available as **lens predicates** and therefore to Facets rules through the shared evaluator; no new canvas-view plugin.

- Reuse lens Simple/Code controls, filter/authoring components, save/reconciliation, native searchable pickers, help and error states. Identify the owning Base file/view unambiguously, not just by stale path/label.
- Preserve portable lens/Facets package contracts from the preceding PR: export/import references to unavailable metric/Base providers as **inert validated declarative configuration**, with missing-dependency warnings; never export a private Base result set or local path by default without explicit review.
- Type-check against installed Obsidian, localize UI in all catalogs and preserve popout/main-view ownership.
- Provide concise provenance/coverage explanations, e.g. "At least N incoming links; exact total unavailable until indexing completes," not noisy debug information.

## 7. Acceptance and validation

### Metrics
1. Exact authored incoming/outgoing/unique-neighbor semantics tested across body links, ontology properties, multiple declarations, inverse inference, hidden/ignored evidence, self-links, duplicate targets, rename/delete and non-document types.
2. Full-index and on-demand partial fixtures prove exact vs lower bounds vs unavailable; negative comparisons and NOT cannot falsely match.
3. Existing lenses and Facets yield equivalent results for the same metrics, with Simple/Code parity and honest unknown semantics.
4. Repeated lenses, toggles, Find, camera/layout switches, popouts and source changes reuse prepared cache work; no body reads/scans/global index passes from presentation-only actions.
5. Bound CPU/cost on realistic existing fixture; no indexer importance score.

### Bases (after API feasibility)
6. A selected supported Base view returns exact TFiles; lens intersection shows matching **already-related** notes with canonical identities and original roles.
7. Base query/view/config updates, rename/delete, disabled Bases, missing file, mounted-view closure, stale results and popouts are handled truthfully.
8. Two canvases using different Bases/lenses remain independent; Base updates never change editor content, attention, pins, history, source index or relationships.
9. Unavailable/partial Base results never silently become empty/false exclusion or complete answers. No private APIs.
10. Portable lens/Facets configuration retains safe declarative references and missing-source warnings.

Run Node 22.22.2, npm run verify, real production build, Obsidian scanner, focused actual-Bases fixture and applicable exact-build native checks in **authorized disposable vaults**. Distinguish real API observations from simulations; report missing checks honestly. Restore resources and give up to three priority manual checks.

## 8. Out of scope and handoff

- Idea Emergence Level 1–5 weights/ranking and any new persisted global importance calculation.
- Independent whole-vault index/cache/parser or mandatory eager hydration.
- Private Bases querying, CLI fallback, fake hidden views or external code downloads.
- Arbitrary Base-result notes inserted into the Plex, new custom Bases visualization, full GQL/CLI API, 3D/Ideaverse.
- Facets layouts, guides, diagnostics dock or preset JSON UI (owned by the earlier Facets/lens PR).

Finish only after an accepted public-API path and actual native behavior are verified for Bases, or document the blocking decision and keep the affected part draft. Provide a concise implementation/limitation summary, real validation receipts and an updated PR description. No merge/release authorization. GitHub comments identify the writer as **Zsolt's Codex Agent**.
