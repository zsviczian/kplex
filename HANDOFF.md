# C09 handoff — narrow graph reads and one production consumer

## Assignment and workflow

C08P is accepted after main-agent review; its persisted result is in `Refactor plan.md` and `docs/validation/C08P-2026-09-26.md`. **C09 is the next Strong candidate for an agent without Obsidian access.** Implement C09 only. This document is transient: overwrite it for the next assignment, do not archive it or turn it into an ongoing log. The refactor plan is the definitive tracker.

Read `AGENTS.md`, `docs/ARCHITECTURE.md`, C08/C08P/C09 in `Refactor plan.md`, and the relevant production callers before editing. Return uncommitted changes for the main agent to review, fix and validate in Obsidian. Do not commit, publish, open issues or deploy to a vault. Mark C09 **Review**, not Done, when delivering; host acceptance remains the main agent's responsibility.

## Outcome

Introduce the smallest host-free graph read capability justified by a real existing consumer. Migrate one cohesive production read path to it. That path consumes opaque `NodeId` / plain `GraphNodeView` data, does not read `TFile`, mutable neighbour maps or the plugin instance, and preserves existing observable output. The legacy `GraphIndex` remains the production facade and semantic owner. Record other concrete-index consumers explicitly; do not claim the whole graph/UI is portable.

C08 established `src/core/graph/model.ts` and `settings.ts`, plus the bounded legacy mapper in `src/adapters/obsidian/graphContracts.ts`. They are foundations, not existing production read ports. C08P stabilized hydration/coordinator lifetime; preserve those guarantees without redesigning indexing.

## Practical checkpoints

1. **Inventory and select.** Inspect actual reads in `src/ui/layout.ts`, `src/lens/GraphLens.ts`, `src/ui/PlexGraph.tsx`, search and adjacent callers. Record each capability and its semantic/presentation ownership. Select one bounded real path and explain why it can cross the seam now. A coherent subpath of a large consumer is acceptable; an unused interface/demo is not. Keep C10's lazy property/provider and predicate extraction separate.
2. **Characterize.** Capture current output/ranking/ordering/filter behavior for the selected path before moving it. Include relevant missing/unresolved nodes and every kind that the path actually supports. Preserve semantic role/precedence logic; do not move classification into UI or recreate it in the adapter.
3. **Define and implement only what is used.** Place a narrow read contract in the lowest portable layer that needs it. Legacy facade/Obsidian adapter maps existing objects at the boundary; portable modules must not import legacy GraphIndex/types/settings or Obsidian transitively. Separate semantic relations from today's presentation-filtered neighbourhood APIs. Do not call a filtered query “raw graph.” Avoid a speculative universal graph API or unused methods for later checkpoints.
4. **Migrate the production call site.** Wire the actual runtime path, using the interface and C08 views. Keep IDs exact/opaque: no case folding, URL/path/kind parsing in core. Physical path terms and file facets come from host mapping. Do not expose `GraphPage`, `TFile`, live maps or global plugin discovery through a port.
5. **State validity and cost.** State how mapped views remain valid across full/preview publication, incremental per-file commits, optimistic edits, rename/delete and presentation refresh for the selected path. Readonly shared arrays are not frozen snapshots. Use existing notification/publication boundaries or a justified bounded in-memory revision mechanism; do not add persisted revision keys or copy/cache every graph node. Never reread Markdown, rebuild the index or allocate a second full-vault DTO graph just to support reads/rendering.
6. **Verify and deliver.** Run Node 22.22.2 `npm run verify` and inspect all results, including real Obsidian typings/build. Test the new consumer with a plain fake read model in a clean process, without Obsidian, window shims or host-object fixtures. Also preserve the existing compatibility/golden tests through the legacy production adapter. Test changed output and stale-view behavior, not merely method presence/source text. Search the migrated path for concrete-index/host reach-through. Update durable architecture documentation and the definitive plan, recording remaining consumers and limits.

## Boundaries and guardrails

- No graph semantic change, new URL-referrer feature, view/layout strategy, parser pool, normalized source producer, snapshot delta/schema change, worker/iOS policy change or search redesign. The C08P roadmap remains assigned to C11–C17.
- Preserve localized/platform-aware UI copy and device routing. Avoid unrelated literal migration or styling.
- Keep C08P metadata/preview/full hydration bounded, terminal outcomes immutable, sampled progress active, late publication guarded and unload settlement immediate. Do not disable the watchdog or loosen cancellation/atomic-publication assertions to make extraction pass.
- Do not weaken architecture/core restrictions. A core module must compile with ES2021 and no DOM/Node/Obsidian ambient types. Add no blanket allowlist/suppression.
- Obsidian is optional for your environment. Do not invent host evidence. `docs/OBSIDIAN_RUNTIME_TESTING.md` describes the main-agent CLI lane through the installed `app.plugins.plugins["k-plex"]` instance; this is maintenance access, not a portable production dependency boundary.
- A missing browser executable can block the browser DOM lane independently of Obsidian. Report the exact failure and completed checks; do not silently bypass tests or claim a full pass.

## Reviewer acceptance

A real production read path uses the narrow interface and returns unchanged output. Its portable behavior runs with plain IDs/data and no host module. Mapping validity/invalidation is explicit and bounded. Existing semantics, hydration/watchdog behavior, persistence bytes and large-vault query/body-read/build counts remain unchanged. No dead scaffold or parallel classifier was introduced. Remaining concrete consumers are inventoried honestly.

The main agent will run the full portable suite and exact-build Obsidian checks for the changed workflow, review performance risk, and return at most three prioritized manual checks (or explain why none are needed). After validation is confirmed, the main agent commits and moves on; C10 is the next Strong offline-agent candidate.

## External agent delivery — fill this section in place

- Selected consumer/path and inventory of remaining concrete consumers:
- Before/after behavior and production wiring:
- Contract/adapter ownership and view validity/invalidation rules:
- Files changed and why:
- Automated commands/results, environment and failures/limits:
- Required main-agent host assertions and any proposed prioritized manual checks:
- Persistence/settings/semantic compatibility and performance risks:
- Refactor-plan summary/action-log entry updated; C09 status:
- Open concerns or deliberately deferred work:
