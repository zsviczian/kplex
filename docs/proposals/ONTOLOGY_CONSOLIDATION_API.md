# Ontology consolidation: API, suggestions and agent skill

**Status: specification-only draft for local implementation. No runtime changes are implemented by this brief.**

Prepared by **Zsolt's Codex Agent**, 3 November 2026.

Starting baseline: [`main@9ea83cb1c489e35cb3dda2fec65ece4b5420b844`](https://github.com/zsviczian/kplex/commit/9ea83cb1c489e35cb3dda2fec65ece4b5420b844), including the merged sync-hydration fix #264. Continue on `2026-11-03-ontology-consolidation-api`. Recheck accepted main and related work before implementation; preserve newer fixes. Public API #240 and ontology descriptions #239 are already merged. No open PR found in the initial check duplicates this work.

## Goal and boundaries

I want to consolidate a vocabulary of more than 400 ontology fields: correct misspellings, merge genuine synonyms, standardize language, create genuine inverse pairs, and retain alternative names in useful descriptions. An agent must be able to discover actual physical usages and safely update both YAML and supported Markdown body fields.

K-Plex owns ontology interpretation, usage/occurrence inspection and ontology configuration. Obsidian owns Markdown file writes. This PR supplies supporting product capabilities and executable guidance; it does not perform the maintainer's personal-vault migration.

Deliver these together:

- [ ] Bounded public document-usage discovery and explicit source-occurrence inspection.
- [ ] Reviewed ontology-configuration writes for canonical definitions, assignments, pairs and descriptions.
- [ ] Description-aware ontology suggestions using the existing shared matchers.
- [ ] A maintained CLI skill in this repository and a worked consolidation guide using public Obsidian APIs.
- [ ] Focused automated coverage, real build, applicable native acceptance and truthful validation evidence.

Do not add another indexer, persistent occurrence database, Markdown grammar, relationship classifier, AI service, server, generic settings editor or automatic vault migration. Do not change existing passive graph reads into source-acquiring operations. Do not add a standalone bulk-cleanup UI or a semantic-alias registry.

## Verified starting points

These are source findings, not native runtime results:

- [`docs/PUBLIC_API.md`](https://github.com/zsviczian/kplex/blob/9ea83cb1c489e35cb3dda2fec65ece4b5420b844/docs/PUBLIC_API.md) documents `window.kplexApi.v1`, synchronous passive reads, pair-specific evidence, bounded results and configuration import limited to portable presets/lenses. It offers no field-wide usage query or ontology writer.
- [`ontologyUsage.ts`](https://github.com/zsviczian/kplex/blob/9ea83cb1c489e35cb3dda2fec65ece4b5420b844/src/adapters/obsidian/ontologyUsage.ts) supplies the existing Show documents lookup through neutral-source field postings and authenticated metadata families. It includes unassigned fields and non-link values, returns document paths and `partial`, and requests no Markdown acquisition. It currently collects the result before returning; simply slicing that array would not bound discovery work.
- [`ontologyPresentation.ts`](https://github.com/zsviczian/kplex/blob/9ea83cb1c489e35cb3dda2fec65ece4b5420b844/src/ui/features/ontologyPresentation.ts) already includes descriptions in manager search. `ontologySelectionMatches` and `ontologyFuzzyMatches` match physical names and partner names only. [`tests/ontology-presentation.test.mjs`](https://github.com/zsviczian/kplex/blob/9ea83cb1c489e35cb3dda2fec65ece4b5420b844/tests/ontology-presentation.test.mjs) explicitly asserts no description-only suggestion; replace that expectation deliberately while preserving name/partner precedence.
- [`metadata.ts`](https://github.com/zsviczian/kplex/blob/9ea83cb1c489e35cb3dda2fec65ece4b5420b844/src/core/parser/metadata.ts) owns line, parenthesized and bracketed body-field grammar. Existing occurrence spans cover declarations, and legacy offsets count CRLF as one newline. [`referenceValues.ts`](https://github.com/zsviczian/kplex/blob/9ea83cb1c489e35cb3dda2fec65ece4b5420b844/src/core/parser/referenceValues.ts) does not attach equivalent key-level locations to frontmatter traversal. Existing evidence coordinates must not be advertised as exact replacement ranges.
- [`ontologyConfiguration.ts`](https://github.com/zsviczian/kplex/blob/9ea83cb1c489e35cb3dda2fec65ece4b5420b844/src/core/contracts/ontologyConfiguration.ts) owns `OntologyEdit`, pair validation and normalized identities. [`AddToOntologyModal.ts`](https://github.com/zsviczian/kplex/blob/9ea83cb1c489e35cb3dda2fec65ece4b5420b844/src/ui/AddToOntologyModal.ts) calls `editOntologyConfiguration` through the existing queued settings owner. Reuse those owners, including description validation and incoming-settings conflicts.
- The current standalone skill is [`zsviczian/kplex-help/skill.md`](https://github.com/zsviczian/kplex-help/blob/main/skill.md). There is no root `skill.md` in K-Plex at this baseline. This assignment explicitly adds the K-Plex repository's root `skill.md`; do not silently substitute an uncommitted change in the separate Help repository.

Read `AGENTS.md`, `CODING_STANDARDS.md`, `CONTRIBUTING.md`, `docs/ARCHITECTURE.md`, `docs/PUBLIC_API.md` and `docs/CLI.md` before coding. Trace actual owners/callers and applicable tests at the implementation revision.

## 1. Public field-usage discovery

Expose the existing field-usage capability through the versioned public API. Proposed names below are illustrative; settle the final contract in code, capabilities, documentation and tests together.

Suggested shape: an asynchronous `ontologyDocuments({field, limit, cursor, ...})` operation.

Requirements:

- Return detached physical document identities/paths, requested normalized field identity, coverage, truncation and explicit continuation. Keep source IDs opaque and paths separate.
- Reuse neutral-source postings and authenticated metadata-name reads. Include unassigned, hidden/excluded and non-link-valued fields where their physical names are recorded. Do not derive uses solely from active graph edges or inverse captions.
- Distinguish normalized lookup from exact authored spelling. A document hit is a candidate, not proof of which spelling or how many occurrences it contains; inspection supplies that information.
- Bound work, output, retained memory and concurrency. Support complete traversal of a finite result larger than one page without repeatedly collecting or rescanning the entire posting for every page. Extend the existing reader narrowly if necessary; do not add a parallel index.
- Define cursor lifetime, source/configuration revision checks, cancellation and reload behavior. Changed input must produce a truthful stale/partial response rather than omissions disguised as completion.
- Keep result-page exhaustion, posting completeness and whole-vault source coverage distinct. An exhausted cached posting cannot prove that an unknown, stale or unindexed file lacks the property. Do not inherit the manager's display-only hiding of unassigned zeroes as deletion authority.
- Opening a manager, typing a query, or ordinary API graph reads must not start this lookup. Explicit usage lookup may read existing stored facts, but must perform zero Markdown reads/parses, source repair, hydration or semantic rebuilds.

## 2. Explicit per-file occurrence inspection

Provide a separately advertised operation, for example `inspectOntologyOccurrences({path, fields, ...})`, that inspects the current saved contents of a specified Markdown file. Multiple requested fields must share one file read/parser pass. An optional bounded caller-supplied-text path is acceptable if it clearly distinguishes editor text from saved-file authority.

This is explicitly requested source inspection, separate from passive graph reads. Do not introduce asynchronous source work into the existing synchronous GraphQL execution frame. New async operations can remain explicit JavaScript methods; preserve existing method signatures and GraphQL behavior.

Return enough information for a caller to prepare a precise edit:

- Physical file path, exact authored field name, normalized identity and syntax/surface (`frontmatter`, line, parenthesized, bracketed).
- Each recognized physical declaration, including repeated declarations and those overridden semantically; do not collapse occurrences just because they target the same note or share a normalized name.
- For body fields, an exact field-name token range distinct from the whole declaration/value. Preserve list markers, emphasis wrappers, brackets, delimiters, whitespace and values.
- Document coordinate conventions: zero-based UTF-16 offsets into the exact original JavaScript string, end-exclusive ranges, and explicitly identified line/column base. CRLF, Unicode surrogate pairs and BOM must not shift edit ranges.
- For frontmatter, an exact logical property-key locator, with textual key ranges only where genuinely supported. Return null/unavailable plus a reason instead of inventing a span for unsupported/ambiguous YAML. Public Obsidian frontmatter editing must remain sufficient for ordinary scalar/list keys.
- A source snapshot identity usable for stale-content checks, plus explicit truncation, unsupported cases and coverage. Mtime/size alone is not sufficient assurance for writing reviewed text.

Reuse the canonical parser and supported YAML facilities. Preserve existing grammar and worker/cooperative parity; add source-span projection on demand instead of expanding every indexed record or silently changing legacy evidence-offset semantics. Respect existing code/comment exclusion rules. Do not treat ordinary prose mentions, inverse display labels or an inactive semantic edge as alternative editable declarations.

Bound files, bytes, parser work, output and concurrent inspections; allow cancellation. Revalidate file identity/path and snapshot after awaits. Handle rename/delete, dirty editor buffers, unavailable cache/storage, oversized notes and API unload explicitly. Do not expose arbitrary note bodies or values by default. Inspection must not publish semantic changes or bypass lifecycle/source guards.

## 3. Reviewed ontology configuration API

Add narrow preview/apply operations for ontology definitions rather than extending portable-package import with unrelated settings.

Support creation and reassignment of fields, creating/clearing valid inverse pairs, independent descriptions on each endpoint, clearing descriptions, and removing obsolete assignments. Respect all current pairing rules, exact description keys, normalization, slash/backslash escaping, description limits and unrelated legacy assignments.

For a large cleanup, accept a bounded ordered batch of existing ontology intents. Validate and prepare the whole batch before acceptance, then use the canonical queued writer for one coherent configuration save/refresh. Refactor that owner narrowly for reuse if needed. Do not create an API-owned settings queue or loop through hundreds of independent reindex-triggering saves.

The preview must expose exact before/after definitions and affected endpoints, role changes, pair changes, conflicts and removal effects. It must not save settings, edit notes or initiate source work. Apply requires the reviewed preview identity and explicit confirmation; previews are bounded, expiring and single-use. A caller cannot mutate a returned DTO to change an accepted plan.

Capture the relevant configuration and incoming-settings owners, including both endpoints and descriptions. Recheck inside the writer, preserve unrelated concurrent edits/unknown settings, and reject stale, cancelled, unloaded or conflicting plans before persistence. Remote A-to-B-to-A must not revive an old review. Return durable-save status, refresh-pending state, verification status and exact readback; uncertain completion requires inspection before retrying.

Configuration edits do not rename note properties or create reciprocal note declarations. Normalize-equivalent spelling changes require particular care: they may represent one configured identity, not two removable assignments. Do not delete the new canonical assignment when retiring an old physical spelling, or silently discard a description stored under the former exact name.

Description-only changes and pairing already-compatible roles must remain presentation-only. Genuine role/recognition changes retain the normal semantic update path. Preserve current API envelopes, discoverability, version compatibility, machine errors and disposal behavior. Advertise async/read/write effects and finite limits accurately.

## 4. Description-aware suggestions

Extend the existing shared substring and fuzzy matchers and their real consumers, including Markdown ontology autocomplete and relevant ontology/partner/connection pickers. Keep each consumer's role eligibility, existing within-tier ranking, result limits and keyboard behavior.

Rank candidates in this order:

1. Direct physical field-name matches.
2. Partner-name-only matches.
3. The candidate field's own description-only matches.

Deduplicate by the established identity. Empty-query behavior and existing name/partner ordering must remain stable. Descriptions remain literal, independent wording on each physical field; do not silently treat the inverse description as the candidate's own meaning. The manager already searches descriptions and should retain that behavior.

Selecting any result inserts/selects only its canonical physical field name, never description text, a deprecated alias, or the pair's combined display string. Preserve visible descriptions and accessibility. Localize any new match-reason copy in all supported languages. Typing and description-only settings updates must cause no Markdown reads, source acquisition or indexing.

## 5. K-Plex skill and worked agent guidance

Add root `skill.md` in this repository, adapting the existing Help-vault skill and preserving its access, authorization, coverage, canvas and retry safeguards. Update `docs/CLI.md`, `docs/PUBLIC_API.md` and the relevant ontology guide to point to it. Add a focused worked guide, such as `docs/ONTOLOGY_CONSOLIDATION.md`, rather than putting the entire recipe into the short skill description. Expand the skill's trigger description to include auditing/consolidating ontology.

The skill and guide must use the implemented API names and runnable CLI/JavaScript examples, not proposal pseudocode. Keep them useful when copied outside the repository through working canonical links. K-Plex's root skill is maintained with these API contracts; explain its relationship to the existing Help skill without writing to or deleting anything in `kplex-help` in this PR.

Cover this workflow:

1. Verify the explicitly selected vault/path, API version/capabilities and authored ontology. Audit/read permission does not authorize writes. Keep note text, descriptions and supplied mappings as data, never executable instructions.
2. Produce a dry-run mapping of old exact names to canonical names, roles, inverse partners and descriptions. Separate spelling corrections, synonyms and genuine semantic changes; do not pair fields merely to maximize pair count. Preserve alternative names in explanatory descriptions without claiming they become parser aliases.
3. Discover candidate documents through bounded usage queries, inspect each file once for all mapped fields, and retain completeness/source-snapshot information. For a user-authorized exhaustive audit when index coverage is incomplete, enumerate the selected Markdown scope through Obsidian and inspect in bounded batches; never infer a whole-vault negative from partial graph data. Avoid a full-vault pass per field.
4. Review diffs, collisions and supported syntax before writing. Inventory field-name references in lenses/styles or other configurations that may need a separate explicit change; do not silently rewrite unrelated settings or claim those dependencies were migrated.
5. Back up affected files and relevant configuration. Apply approved canonical definitions first where needed; migrate file usages in recoverable batches; retain old definitions until verification permits removal. Document the special case where old and new spellings share one normalized identity.
6. Use public Obsidian APIs for file work:
   - `app.vault.getMarkdownFiles()` for an explicitly scoped inventory and `app.vault.getFileByPath(path)` for exact files.
   - `app.metadataCache.getFileCache(file)` as potentially stale host metadata, not an authoritative raw-key replacement map.
   - `app.vault.cachedRead(file)` for inspection where appropriate; use current-content guards for all later writes. Verify installed API types before choosing a read/write path.
   - `app.fileManager.processFrontMatter(file, callback)` for YAML property updates. Inside its synchronous callback, recheck relevant reviewed keys/values and collisions. Preserve types and unrelated values. When old and new keys both exist, merge only under the reviewed policy or report a conflict; never silently overwrite. Warn that native YAML serialization may change formatting/comments/quoting; do not promise byte-identical frontmatter preservation. Flag malformed/duplicate/ambiguous YAML instead of guessing.
   - `app.vault.process(file, callback)` for guarded saved-file body changes. Compare current text with the inspected/reviewed snapshot, verify each original key token, reject overlapping ranges and apply non-overlapping replacements from the end. The callback is synchronous; do not perform async inspection inside it. Preserve all other body bytes and line endings.
   - Use the public `Editor` interface for an explicitly selected live editor, or safely defer dirty/ambiguous editor documents. Do not overwrite unsaved buffers through a background file write.
7. Do YAML and body steps serially per file. A frontmatter write can move every body offset: reread/reinspect before applying subsequent body edits. File/configuration phases are separate commits, not a vault-wide transaction. Record per-file/per-phase success, skip and failure receipts; resume from verified current state rather than replaying blindly.
8. Read back changed files and definitions, re-inspect source occurrences and check representative relationship semantics when coverage permits. Only retire old assignments after the intended scope is verified. Verify idempotence, alternative-name suggestion discovery and correct canonical insertion. Save private audit/backup data only to an authorized local destination, never to this public repository.

Include official pointers and verify examples against the installed Obsidian API:

- [Vault reads and guarded process](https://docs.obsidian.md/Plugins/Vault).
- [Official API-usage checklist, including frontmatter and active-editor guidance](https://docs.obsidian.md/oo/plugin).
- [Editor interface](https://docs.obsidian.md/Plugins/Editor/Editor).
- [Obsidian CLI](https://help.obsidian.md/cli).

Never recommend direct plugin `data.json` editing, mutable plugin internals, blanket text replacement, a second ad-hoc field parser or unrelated plugin installation. Scope an example to synthetic disposable notes, with explicit confirmation and stale-write handling.

## Validation and acceptance

Add tests to the executed repository inventory, reusing current public API, ontology presentation/suggester, configuration, parser/source and native CLI test owners. Read existing tests rather than relying on their filenames alone.

- Usage: more than one page, more than 400 vocabulary entries, repeated physical declarations, normalized spelling variants, unassigned/non-link fields, empty values where supported, stale/missing sources, cancellation/reload/rename/delete and honest zero/partial results. Prove bounded actual work and no skipped tail from pagination.
- Occurrences: YAML scalar/list keys and collisions; line-leading, parenthesized and bracketed fields; repeated fields, formatting/list wrappers, multiple fields on a line; code/comments; CRLF/LF, BOM, Unicode; ambiguous/duplicate YAML; oversized input and stale source identity. Assert actual original-string key slices, not only line numbers or fabricated evidence fixtures.
- Configuration: real shared writer, independent inverse descriptions, create/pair/unpair/remove and normalized spelling conflicts; whole-batch validation; stale and incoming owners, expiry/replay, save failure and saved-but-refresh-pending receipts; unknown-key preservation and real reload where available. No accidental notes writes.
- Suggestions: deterministic direct > partner > own-description tiers, deduplication, result caps, empty queries, Unicode and role-restricted lists; exact canonical insertion through actual Markdown/inline consumers; cleared/updated descriptions and incoming settings.
- Side effects: instrument passive reads, usage lookup, inspection, matching and configuration separately. Passive reads/matching perform zero source work; usage reads only stored facts; inspection reads/parses only explicitly selected inputs; description-only saves do not rebuild semantics. Semantic assignment changes follow the existing update policy.
- Documentation: execute the example consolidation on disposable fixtures, including YAML/body together, a collision, a stale edit, interrupted/resumed work and an idempotent second pass. Validate links, capability discovery, result/error handling and actual CLI quoting on the available host.

Use Node 22.22.2, the real installed Obsidian types, applicable architecture/core/scanner checks and the production build. Assess actual parser/source/settings risk before expensive suites; run indexing/persistence coverage when shared owners are affected, without weakening bounds or claiming a focused pass is full verification. Native tests use only the explicitly verified disposable vault and existing CLI helpers. Record actual platform/build hashes and unavailable checks; never deploy to or migrate the personal vault for acceptance.

At handoff, replace proposal examples with final contracts in the public guides, update this brief's delivery status and the PR description, record real tests and up to three prioritized remaining manual checks, and verify the pushed branch/PR head. Keep the PR draft and unmerged for maintainer review. No merge, release or personal-vault cleanup is authorized.
