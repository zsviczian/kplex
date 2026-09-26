# C14b handoff — coherent publication and host integration

This is the single transient handoff. Overwrite it for each assignment; do not archive it. `Refactor plan.md` remains the definitive tracker. Return uncommitted changes and fill the result below for main-agent review. Commit only after the main agent accepts the work and any required manual validation is confirmed.

## Eligibility and starting point

**Host checkpoint: Obsidian CLI access is required for acceptance.** An offline agent may characterize/extract/test the portable publication contract, but must leave unavailable native and physical iOS gates pending. Do not mark C14 or C14b Done based on portable checks alone.

Start from accepted C14a on `kplex-refactor`; record actual HEAD, branch and dirty state. Read `AGENTS.md`, C14 in `Refactor plan.md`, `docs/INDEXING_ARCHITECTURE.md`, `docs/ARCHITECTURE.md`, `docs/NORMALIZED_SOURCE_CONTRACT.md`, `docs/OBSIDIAN_RUNTIME_TESTING.md` and `docs/validation/C14a-2026-09-26.md`.

C14a already routes semantic preparation through `src/core/graph/patch.ts` and the shared full compiler. Preserve its lazy exact-ID entity reads, bounded terminal batch validation, explicit rebuild-required outcomes and existing scoped collectors. C13b copy-on-write evidence/page overlays, indexed lookup, cancellation and strict performance guards remain accepted behavior.

## Scope and practical checkpoints

1. **Characterize publication before changing it.** Trace `GraphBuilder.patchMarkdownFiles`, `commitPatchState`, per-file callbacks, GraphIndex graph/search/cache invalidation, fingerprint updates, semantic events, pending paths, cancellation and full publication. Record which state is private and which state observers can access. Trace every await and preserve existing behavior first.
2. **Extract one narrow commit contract.** Publish graph changes, fingerprints, search and affected-cache invalidation coherently at the existing synchronous per-file boundary. Keep Obsidian files/cache/platform scheduling in the adapter. Do not move the demand coordinator (C15) or storage orchestration (C16), introduce a second graph, scan all evidence for small edits, or alter persistence formats. Preserve committed progress when a later source cancels or requires rebuilding.
3. **Verify revision and lifecycle interactions.** Deterministically pause parse/preparation/binding/commit-adjacent awaits. Supersede edits, lose demand, cancel and resume; retain pending current work. Cover structural create/rename/delete/materialization and optimistic creation during a build. Prevent stale source revisions or renamed/deleted paths from publishing. Cancellation must not become an automatic full rebuild. Subscribers must see graph/search/canonical targets and metadata from one publication.
4. **Use an isolated equal-input oracle.** Compare incremental sequences with a fresh full compilation, keeping optimistic temporary state out of the oracle. Cover duplicate/conflicting ontology, Hidden, Date, tags/shared tag pruning, shared/root/malformed URLs/origins/labels, presentation-only versus mixed links, aliases/type/styles and semantic no-ops. Preserve provenance multiplicity and incoming contributions. Add meaningful observer and adversarial-await tests; retain all existing goldens/timing/lint guards.
5. **Run acceptance lanes.** Required Node **22.22.2**, clean `npm ci`, `npm run verify`, real Obsidian typings/build and `git diff --check`. With authorized `kplex-test`, run exact-build `npm run verify:obsidian` and native mutation/cancel/resume/oracle checks. Require up-to-date status AND full hydration before comparisons; fence captured-state identity across awaits. Execute native tests sequentially so deploy/rebuild/mutations cannot overlap an oracle capture. Treat emulation as layout evidence, not physical iOS evidence.
6. **Retain the physical gate.** Physical iOS large-vault edit/cancel/resume and creation/rename/delete smoke remains required for parent C14. If unavailable, report exact prioritized manual tests and leave C14b Review / C14 Pending. Main agent reviews/fixes the result, reports automated evidence and up to three manual checks, and commits only after the needed validation is confirmed.

## Runtime testing and cleanup

Inspect the loaded plugin with `app.plugins.plugins['k-plex']` as documented in `docs/OBSIDIAN_RUNTIME_TESTING.md`. Reopen K-Plex after plugin enable. Temporary SDK accessors may support private production-builder tests; remove accessors/globals from source and final bundle. Save and restore renderer throttling in `finally`; background/diagnostic timings do not prove foreground performance. Never mutate fixtures or deploy while a comparison is running. Remove temporary notes, force a clean production compilation, then verify authoritative state and the accepted hash.

Accepted clean vault: **20,701 nodes / 1,225,746 directed neighbor entries / 715,030 original declarations**. Canonical complete declaration SHA-256: **`587e33e9a4eba5e6804f7348c39aa293dbe5ca0f7c8c1c4330520569be85bb57`**. Omit generated IDs; recursively sort object keys, sort record JSON strings, hash concatenated without separators, preserving multiplicity. Investigate differences using the actual accepted code with identical inputs rather than weakening the oracle.

## Guardrails and rollback

No unrelated UI/CSS/localization/settings/schema/worker changes. Existing English explanation copy remains L01 work. C00 cold/comparative/physical performance remains pending; C13W worker experiment remains Deferred. Rollback must restore publication delegates/tests without data migration. Do not simplify lifecycle, timers or semaphores without tracing their purpose and proving equivalent behavior.

## Result — fill in on delivery

- Starting HEAD/branch/dirty state; changed files:
- Traced publication/observer ownership and await/revision fences:
- Extracted contract and retained C15/C16 host seams:
- Automated tests, exact versions, failures and unavailable lanes:
- Native incremental/full oracle, observer/latest-wins/cancel/resume/create/rename/delete results:
- Physical iOS results or precise pending manual checks:
- Final fixture/global/hook/throttling cleanup and artifact hashes:
- Risks/limitations, rollback and next recommendation:
- Status: C14b Review; C14 Pending until required acceptance is complete.
