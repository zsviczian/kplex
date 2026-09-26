# C13a handoff — portable parser grammar and cooperative runtime

## Assignment and workflow

Implement **C13a only**, from the main-agent C12c acceptance commit on `kplex-refactor`. Confirm the actual starting revision and dirty state; a ZIP may lack Git metadata. This is a **Strong offline-agent candidate** and requires no installed Obsidian. Read `AGENTS.md`, `Refactor plan.md` sections 3–5/C11–C16, `docs/ARCHITECTURE.md`, `docs/NORMALIZED_SOURCE_CONTRACT.md`, `docs/INDEXING_ARCHITECTURE.md`, `docs/OBSIDIAN_RUNTIME_TESTING.md`, and the C12c validation report.

This single `HANDOFF.md` is transient and overwritten, never archived. Return uncommitted modifications and record actual results below. Mark C13a **Review**, not Done; parent C13 remains Pending. The main agent reviews/fixes, runs portable and applicable native checks, recommends only necessary prioritized manual tests, persists acceptance in the refactor plan and commits after validation. Do not implement C13b/C13c or publish/commit this handoff.

## Outcome

Move the accepted Markdown/property parsing algorithms and plain parser data types into the portable core, with explicit cooperative clock/yield/cancellation capabilities. Production workers, fallback parsing, collectors and compatibility consumers must use that same owner through narrow forwarding facades. Keep host metadata acquisition/merge/resolution in an Obsidian adapter or named legacy compatibility facade. Preserve every current parser behavior and worker serialization constraint.

C13 has three accepted substeps: C13a parser, C13b evidence/resolver, C13c full compiler. This delivery must not claim a host-free graph compiler. Worker-pool benchmarking remains a separate measured follow-up; do not add workers or change iOS policy here.

## Practical checkpoints and verifications

- [ ] **Inventory before edits.** Trace every `fieldParser` import, `MetadataParser` worker/fallback path, SectionExpansion cancellation, GraphBuilder/cache usage and compatibility link extractor. Record current exports, DTO owners and worker `toString()` serialization. Distinguish body grammar/property-reference enumeration from host linkpath resolution and `CachedMetadata` acquisition.
- [ ] **Move plain types and pure grammar intact.** Place a cohesive module under `src/core/` with no direct/transitive Obsidian, legacy host types, Node, DOM/window or storage dependency. Move synchronous body grammar and property-reference iterator without rewriting scans/regexes, normalization, URL labels, physical line/offset rules, nested-value traversal or within-value deduplication. Keep the worker core function self-contained when serialized: no newly captured module helper or constant. Keep numeric/persisted keys unchanged.
- [ ] **Inject the cooperative runtime.** Portable cooperative parsing receives a narrow clock/yield capability and lifetime/cancellation callback; it must never use a browser global/default timer. Preserve time budgets, forced scan boundaries, error identity/message and checks before/after awaited yields. Obsidian chooses the owning runtime and existing platform policy. Keep the existing `parseBodyMetadataCooperative(content, shouldContinue, budgetMs)` compatibility signature in the host facade if callers need it; it delegates to the portable algorithm. Do not create a scheduler or background work.
- [ ] **Keep actual host work outside core.** `App`, `CachedMetadata`, `TFile`, `getFirstLinkpathDest` and host-dependent metadata merging/resolution belong outside core. If a plain merge helper is extracted, pass explicit plain facts and prove it preserves frontmatter position removal, alias/tag rules and source-owned array sharing. A host facade importing the new parser is allowed; a core parser importing the facade is not. Do not duplicate parser algorithms between old/new files.
- [ ] **Production wiring.** `MetadataParser` worker source and fallback use the new owner. Update adapter collectors and callers only as necessary; retain compatibility exports for unchanged editing/imagery/section consumers. Update test harness module inclusion and architecture root declarations as required without weakening forbidden edges. Document exact retained legacy facade callers and C13b/C13c/C18/C20b/C22 removal owners.
- [ ] **Independent parity.** Add a clean-process test that imports/runs the portable module with no Obsidian stub, DOM, window shim or plugin instance. Compare against frozen accepted C12c parser outputs or an actual frozen pre-extraction oracle, not only two new algorithms that could share a regression. Use the compatibility fixture plus CRLF, inline syntax variants, YAML boundaries, escaped/encoded links, malformed URLs, Markdown URL whitespace, dense URLs, large code blocks, extra-long paragraphs and malformed multi-megabyte lines. Preserve the existing strict parser and heartbeat thresholds; do not edit goldens to accommodate a move.
- [ ] **Cooperative/cancellation proof.** Fake clock/yield tests prove no yield before budget unless a forced boundary applies, checks after awaited yield and cancellation through dense character scans. Run worker serialization in an isolated realm with no module closure; compare exact synchronous/cooperative/worker outputs and cancellation behavior. Runtime absence must be explicit rather than silently falling back to a browser global.
- [ ] **Mandatory acceptance preparation.** Required Node **22.22.2**, clean `npm ci`, `npm run verify`, real installed Obsidian types/build, official lint and `git diff --check`. Add new clean-process tests to mandatory scripts. Report command versions and actual failures/unavailable lanes; no stub-only build claims. Do not change strict timing thresholds or suppress lint. Native test-vault validation stays with the main agent; do not claim host/device passes from fixtures.

## Guardrails and pending owners

No settings/schema/version/default/UI/CSS/command/localization/URL canonicalization changes. No parser simplification, new worker pool, persisted shards/cache migration, scheduler changes, graph classification or broader rename cleanup. Console diagnostics remain English; no new product copy should be needed.

Preserve cached-body shapes and cache keys, current worker/cooperative strategy and byte/read budgets. Keep long-file safety meaningful: bounded scan steps, not merely an async function around a blocking regex. Never hide a portable-to-host edge behind type-only imports. Current GraphBuilder remains host-bound through file binding, acquisition and scheduling until C13c. C13b owns evidence/resolver types and injected resolution scheduling; C14/C15 own incremental publication/revision coordination; C16 owns storage/cache orchestration. C00 physical-device/cold-performance coverage remains open.

## Result — fill in on delivery

- Starting revision/branch/dirty state or unavailable Git metadata:
- Inventory and moved parser/type/runtime owners; exact compatibility callers retained:
- Production worker/fallback/collector wiring; serialized worker closure proof:
- Independent grammar/provenance/whitespace and large-file parity results:
- Cooperative budget, cancellation and clean-process no-host evidence:
- Exact Node/dependency versions, commands/results and unavailable/failing lanes:
- Persisted keys/schemas/policy changed (expected none):
- Residual host seams, their owners and rollback scope:
- Up to three prioritized reviewer checks with exact expected outcomes:
- Status: **C13a Review**, parent C13 Pending; next proposed slice C13b (Strong offline candidate).
