# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---


## Current transfer

**State: prepared for offline implementation.**

- Sender → recipient: main validation agent → offline development agent.
- Kind: combined **SI0 characterization/diagnostics + SI1 presentation ownership** checkpoint.
- Objective: stop presentation settings from rejecting or rebuilding an otherwise semantically compatible saved graph, and establish executable regression/diagnostic contracts for the later settings-independent source-index work.
- Base branch/revision: `indexing-optimization-v2` at `8b2b49c440c16f1fd7f95b4c7e6c2d101bd94815`.
- Initial working tree: `Refactor plan.md` modified and `docs/INDEX_SETTINGS_INDEPENDENCE_DESIGN.md` untracked. These are the main agent's design deliverables for this task and form part of the intended change. No runtime source was dirty when this assignment was prepared.
- Commit authority: none. Return uncommitted changes. The main validation agent reviews, host-validates, records acceptance and commits only after the required evidence or an explicit maintainer decision.

## Why SI0 and SI1 are combined

SI0's signature/settings characterization, caller inventory and work counters are direct prerequisites for SI1. Shipping characterization without applying the bounded presentation correction would create an artificial review boundary, while SI1 remains reversible under the existing graph snapshot and body-cache formats.

Do **not** include SI2. Neutral collection of unassigned property references changes `core/graph/source.ts`, collectors, compiler input and full/patch equivalence. That is the next recommended offline chunk after this one passes online review. Combining SI2 here would mix presentation migration with a new source-fact contract and make rollback/native diagnosis too broad.

This task intentionally advances only the presentation/settings portion needed by the product correction. It does not resume the general C15–C26 refactor.

## Required reading and current evidence

Read completely before editing:

- `AGENTS.md`
- `CONTRIBUTING.md`
- `docs/AGENT_WORKFLOW.md`
- `docs/INDEX_SETTINGS_INDEPENDENCE_DESIGN.md`, especially sections 2–4, 7.3, 9–12
- `docs/INDEXING_ARCHITECTURE.md`
- `docs/NORMALIZED_SOURCE_CONTRACT.md`
- relevant contracts and action log in `Refactor plan.md`

The supplied diagnostic report contains multiple runs. The current/latest run restored a checkpoint successfully. The earlier `semantic-settings-changed` belongs to an earlier run. Commit `98a93e0` removed `excalibrainFilepath` from the exact JSON settings signature around ten minutes before that rejection, which is a concrete upgrade-trigger candidate but is not proven without the installed build and saved signature.

Current known code facts:

- `computeIndexSettingsSignature()` includes semantic policy and presentation fields in one exact `JSON.stringify()` value.
- `GraphIndex.restoreIndexedDbSnapshot()` rejects candidates before page streaming when neither string equals the current one.
- `REINDEX_SETTING_KEYS` and the persisted signature cover different sets.
- legacy tag-style rename/add/remove changes `tagStyleList` through `saveSettings(false)`, which can leave the session apparently fine and reject the graph after restart.
- `showFullTagName`, `tagStyleList`, `noteTypeField`, `primaryTagField` and `baseNodeStyle.maxLabelLength` currently participate in compiled/persisted page fields even though their desired ownership is presentation.
- `thumbnailProperty` and `nodeImageProperty` affect image-only link suppression but are absent from the signature/reindex-key list. Characterize this under-invalidation; do not misclassify it as harmless styling.
- existing parsed-body cache entries contain all parsed inline fields and URLs. SI1 may reuse valid body-cache data and Obsidian `MetadataCache`; it must not read or parse Markdown to refresh presentation facets.

## Product decisions for this checkpoint

1. Presentation changes must preserve compatible snapshot/source work and must not schedule `rebuildIndex()`, `GraphIndex.rebuild()`, progressive cold ingestion or per-file semantic patching.
2. Ontology hierarchy changes and the two inference switches remain semantic in SI1. Keep their conservative current invalidation until SI2–SI4 supply neutral facts and scoped reinterpretation. Do not make them appear fixed by weakening the signature.
3. Image-field changes are not presentation-only because they affect generic inferred-link suppression. SI0 must cover them. SI1 may introduce a typed `semantic-policy` impact for them or retain conservative semantic invalidation; it must not silently ignore them.
4. A legacy settings-signature format change is distinct from a user semantic-settings change. Decode recognized legacy JSON locally and compare named, allowlisted fields. Unknown or malformed formats remain conservative and get a distinct path-free reason.
5. Custom ontology field names and settings values are private. Diagnostics may export static built-in keys such as `hierarchy.leftFriends`, `inverseInfer` and `tagStyleList`; never export custom field names, values, raw signatures or their hashes.
6. No persisted settings key, command ID, graph evidence meaning, parser grammar, ontology precedence, relationship classification, node identity or snapshot/IndexedDB schema changes are authorized in this checkpoint.
7. Existing schema-3 graph snapshots remain supported. A compatible old snapshot must be adapted to current presentation after hydration rather than accepted with visibly stale names/styles/label limits.
8. Keep one canonical setting-impact classifier used by settings UI/managers and startup compatibility. A boolean `saveSettings(reindex)` may remain temporarily as a compatibility facade, but it must not remain the source of truth for invalidation.

## SI0 deliverables: characterization, inventory and diagnostics

### A. Executable regressions

Add focused production-method tests that demonstrate the pre-change failures and protect the final behavior:

1. A snapshot saved with identical semantic policy but different `showFullTagName`, `tagStyleList`, `noteTypeField`, `primaryTagField` and maximum-label presentation values remains a restore candidate. After restoration, its presentation facets reflect current settings rather than stale persisted values.
2. Legacy recognized signatures, including a signature with `excalibrainFilepath`, are classified by named fields. A format-only/removed-field difference is not reported as a user semantic change. A real hierarchy or inference difference is rejected.
3. Unknown/malformed signature input takes the conservative incompatible path with a distinct reason; it never throws or mutates settings/cache metadata.
4. Changing a legacy tag-style entry/list in-session cannot create a delayed next-restart graph rejection.
5. Style/name/tag-label/label-limit/type-selector changes call zero full/progressive rebuilds, zero per-file semantic patches, zero Vault body reads and zero parser calls when required cache/MetadataCache inputs are valid.
6. Characterize image-property changes with image-only, prose-plus-image and ontology-plus-image references. Assert the currently accepted suppression result and the selected invalidation category. Do not “fix” it by treating it as style-only.
7. Record the current configured-only ontology omission: an unassigned frontmatter/inline reference candidate is absent from compilation input. This is a named expected limitation for SI2, not behavior to change or a test to skip in this checkpoint.
8. Preserve current equal-settings canonical graph/evidence/search output and existing snapshot fallback/checkpoint behavior.

Prefer behavior tests over new source-string assertions. Use production methods where practical. Do not weaken timing guards or regenerate semantic goldens to fit a change.

### B. Settings/read-consumer inventory

Return a concrete inventory in `HANDOFF.md`, and put durable implemented ownership in `docs/ARCHITECTURE.md` or the indexing design document where appropriate:

- every caller that can mutate the affected settings, including manager modals/import paths rather than only generic setting rows;
- every runtime reader of `GraphPage.name`, `noteType`, `primaryStyleTag`, `styleTags` and `maxLabelLength` that depends on compiled presentation state;
- every direct semantic read of `GraphPage.neighbours` relevant to a future SI4 revision-aware boundary;
- exact legacy-signature formats/fields accepted by the compatibility decoder;
- remaining settings that still require semantic invalidation after SI1, including the reason.

Do not broaden the production change merely to eliminate every future SI4 reader. This inventory is the handoff to later work.

### C. Path-free diagnostics

Extend the bounded local diagnostic model only as needed to distinguish:

- recognized signature-format change;
- changed allowlisted semantic keys;
- presentation differences adapted after restore;
- unknown/incompatible signature format.

If adding `changedKeys`, validate/sanitize it when reading old IndexedDB diagnostic history and again before clipboard export. Keep the last-20 bound. Include counts/timing only where cheaply available. Do not add telemetry, filenames, custom field names, setting values, raw signature JSON, or high-volume logging.

Add test counters/spies for body reads, parser calls and build/patch entry points. Production reporting may expose bounded aggregate counters if they materially improve the user diagnostics and remain path/content-free; do not add permanent instrumentation solely to satisfy a test.

## SI1 deliverables: presentation ownership and settings effects

### A. Typed setting-impact classifier

Introduce narrowly named projections and comparison results, along these lines but adapted to existing owners:

- semantic policy: hierarchy roles plus inference/image-suppression inputs still requiring semantic work;
- presentation policy: tag display, label limits, style field selectors/list/order, alias/title/search inputs and visual style dictionaries;
- view-only policy: visibility, lenses, sort, layout, folds/camera where already handled outside the semantic graph.

The classifier returns explicit effects such as semantic invalidation, presentation-facet refresh, search-term refresh, node-visual refresh and render notification. Do not use a single `reindex` boolean internally.

Settings objects are mutated in place by existing UI. Compare against an immutable last-applied projection or pass an explicit pre-mutation snapshot through a narrow API. Ensure manager callbacks, generic declarative settings, import/migration application and direct plugin callers cannot bypass classification. Preserve persisted settings/default/migration compatibility and unknown keys.

### B. Snapshot compatibility

Replace exact string equality with a versioned, explicit signature decoder/comparator:

- newly written signatures contain only the fields that truly determine the schema-3 semantic graph under SI1;
- recognized legacy signatures can be compared field by field;
- presentation-only differences permit restore and trigger presentation adaptation;
- hierarchy/inference and any retained image-suppression semantic difference remain incompatible;
- `excalibrainFilepath` removal is recognized as a format/retired-policy difference, with a documented reconciliation decision rather than being silently ignored;
- current active/checkpoint candidate ordering, fallback, watchdog, generation fencing and corruption behavior remain unchanged.

Do not bump IndexedDB or snapshot schema in SI1 unless implementation evidence proves it unavoidable. If it is unavoidable, stop and return the exact migration need instead of slipping it into this checkpoint.

### C. Presentation projection/refresh

Remove these values from semantic snapshot validity and compiler truth where the existing data allows a safe bounded migration:

- tag display name (`showFullTagName`);
- maximum label length;
- legacy tag-style list/prefix selection;
- note-type/style-property selection and primary-tag compatibility selection.

Use a single presentation owner or focused provider rather than adding fixes in each React consumer. Reuse existing `MetadataCache`, field parser DTOs and `KplexIndexedDbCache.getBodies()` batching. No Vault read or parser fallback is allowed on a settings-only refresh. A missing required body-cache entry must produce an explicit incomplete/pending outcome for that facet; it must not silently schedule semantic indexing or claim an empty value. Frontmatter can use current cached metadata; inline style values use valid parsed-body data.

Refresh only consumers that need the changed facet, and keep search invalidation separate from relationship invalidation. Preserve:

- frontmatter-over-inline selection behavior;
- tag-style list order and prefix precedence;
- note-type normalization and explicit style override behavior;
- full/short tag display behavior and canonical tag identity;
- alternate filename/alias/path search terms;
- canonical `GraphPage` identity and C14b's synchronous publication rules;
- main-window/pop-out ownership and hidden-view catch-up.

It is acceptable to retain deprecated presentation fields in schema-3 pages for decoding compatibility, but new runtime reads must not treat stale persisted values as current truth. Document the finite compatibility callers and later retirement owner.

If converting `noteType`/style facets to an asynchronous provider would require a broad SI4 consumer migration, implement the smallest coherent cache/provider boundary and retain a synchronous prepared-value facade. Do not perform IndexedDB reads from React render, publish partial mutations across awaits, or introduce a second complete graph. Return any remaining bounded consumer migration explicitly rather than hiding it.

### D. In-session and restart behavior

For each affected setting, the same classifier/refresh path must work:

- immediately after changing it in Settings or a style manager;
- after importing compatible legacy appearance settings;
- after restoring a semantically compatible active snapshot;
- after restoring a semantically compatible checkpoint;
- after plugin disable/enable or reload.

No changed or new user-facing string is expected. If one is necessary, use the existing language catalog and update every locale according to repository localization rules.

## Explicit exclusions

Do not implement in this transfer:

- neutral collection/persistence of unassigned property reference candidates (SI2/SI3);
- ontology role reinterpretation from cached neutral facts (SI4);
- per-source IndexedDB heads/chunks/postings or DB version 5 (SI3);
- global inference demand-driven preparation (SI4);
- a new parser, resolver, classifier, search engine, layout/projector or settings framework;
- generic storage/refactor checkpoints C15–C26;
- performance claims based only on unit timers or desktop mobile emulation;
- release notes, version bumps, commit, push, PR, merge or deployment to a personal vault.

Do not remove hierarchy/inference compatibility checks merely to make the presentation tests green. Do not persist arbitrary frontmatter. Do not add fallback Markdown reads for missing body-cache presentation data.

## Architecture and code-quality requirements

- Extend the canonical parser/compiler/resolver/settings/GraphIndex owners. Do not create a second semantic classifier or property grammar.
- Portable modules stay free of Obsidian, DOM/browser globals, IndexedDB, Node APIs and plugin recovery. Host adapters supply MetadataCache/body storage.
- Preserve exact opaque `NodeId`, separate semantic/physical paths, evidence multiplicity, incoming contributions, shared tag/URL lifetimes and source-relative host resolution.
- Awaited presentation preparation remains private and revision/lifetime checked; publication is coherent and synchronous. No consumer sees mixed old/new policy state.
- New or changed modules/functions require meaningful module TSDoc/function TSDoc and comments explaining compatibility/invalidation boundaries.
- Inspect every touched caller and remove unused imports/types. Keep scanner-compatible DOM/style patterns.
- Update documentation to describe implemented behavior only. Do not mark SI0/SI1 accepted in `Refactor plan.md`; the main agent owns acceptance after independent validation.

## Offline verification

Check and report the actual Node/npm versions, dependency state, Git metadata, browser availability and network limits before claiming results.

When dependencies and the required runtime are available, run:

```bash
node --version
npm run check:architecture
npm run check:core
npm test
npm run lint:obsidian
npm run build
npm run verify
git diff --check
```

Run focused new tests during development. The final claimed aggregate must use repository Node `22.22.2` or be clearly marked non-authoritative. A stub/transpile-only check is partial evidence. No Obsidian CLI/native result may be claimed by the offline agent.

At minimum, tests must cover:

- recognized legacy/current signature parsing and compatibility decisions;
- presentation-only versus semantic setting classification;
- active and checkpoint restore under presentation differences;
- adapted tag names/label limits/tag styles/note-type facets after restore;
- in-session manager/generic setting paths;
- search refresh separation;
- zero build/patch/read/parse calls for settings-only changes with valid inputs;
- image-field invalidation category;
- unknown signature and corrupt snapshot fallback;
- unload/supersession during awaited presentation preparation;
- equal-settings graph/evidence/search oracle parity.

Do not weaken existing strict assertions or timing limits. If a baseline timing test fails unchanged in the offline environment, demonstrate that against the untouched base and return both results.

## Required return in this HANDOFF

When implementation is complete, preserve the standing header and replace this assignment body with a concise but complete return addressed to the main validation agent. Include:

1. **State and identity:** `returned for main-agent review`, actual base/diff identity, initial and final dirty files, and whether the supplied design-doc changes were preserved.
2. **Implementation:** final setting-impact categories, signature formats/compatibility table, presentation provider/cache behavior, all production callers migrated, retained compatibility facades and explicit SI2/SI4 limitations.
3. **Changed files:** grouped by production, tests and docs.
4. **Actual verification:** exact commands, Node/npm/browser/dependency versions, pass/fail counts, failures, reruns and unavailable lanes. Never relabel a skip as a pass.
5. **Privacy/schema/compatibility:** persisted keys/schema/DB/version changes (expected none), diagnostics fields/sanitization, legacy snapshot behavior and downgrade/rollback considerations.
6. **Consumer inventory:** remaining direct presentation-field and neighbor-map readers with their later owner.
7. **Required main-agent review:** exact source risks to inspect and any suspected defects.
8. **Online validation and commit instructions:** the scenarios below, exact expected observations, cleanup, evidence to record, and the statement that commit follows only after review and required validation/accepted limitations.

## Required online-agent validation after return

The offline return should refine these based on the implementation. The main validation agent must independently inspect the full diff and then:

1. Use Node `22.22.2`, installed lockfile dependencies and the real Obsidian declarations. Run `npm run verify`, `git diff --check`, and exact-build `npm run verify:obsidian` in the explicitly configured disposable `kplex-test` vault. Run `npm run verify:obsidian:migration` because compatible legacy appearance import/settings application is affected.
2. Capture exact source/build/staged hashes, Obsidian/OS versions, index readiness, graph/evidence counts and captured JavaScript errors. Reacquire plugin/index references after every reload.
3. With a ready large-vault graph, record baseline counters and then change, one at a time: `showFullTagName`, maximum label length, legacy tag-style list/order, style property (`noteTypeField`), primary-tag compatibility selector, alias/name fields and representative style values. Expected: correct visible/search/style result, zero full/progressive builds, zero per-file semantic patches, zero Vault body reads and zero parser calls. Repeat after plugin reload and inspect diagnostics.
4. Restore deliberately constructed recognized legacy active/checkpoint signatures, including the retired `excalibrainFilepath` member and presentation differences. Expected: compatible graph restore plus current presentation adaptation. Change one hierarchy role and each inference switch separately. Expected in SI1: conservative semantic incompatibility/rebuild remains, with the correct allowlisted changed-key diagnostic.
5. Test an unknown/malformed signature and a missing/corrupt graph chunk. Expected: safe conservative fallback, distinct reason codes, no exception, no raw signature/value leakage and unchanged candidate fallback/watchdog behavior.
6. Exercise image-field behavior with image-only and prose-plus-image fixtures. Expected: accepted suppression parity and the implemented semantic-policy invalidation route; no claim that SI1 makes it presentation-only.
7. In main window and a temporary pop-out, change a presentation setting while one view is hidden and then reveal it. Expected: both views converge on the same current presentation without mixed settings, camera/fold reset, duplicate graph or detached listeners. Clean up the pop-out, temporary notes/settings and diagnostic controllers in `finally`.
8. Review memory and responsiveness on the 20k fixture as observations. SI1 must not retain a second complete graph. This checkpoint does not claim physical iOS/Android acceptance of the full redesign; request a device check only if the implementation introduces a new lifecycle/memory risk that automation cannot cover.
9. Update `Refactor plan.md` with accepted results, limitations, rollback scope and the next checkpoint. Update implemented architecture docs. Then commit the complete accepted SI0+SI1 change if authorized; do not commit on a failed required gate without an explicit maintainer acceptance of the recorded limitation.

## Next recommended chunk after acceptance

Prepare **SI2 alone** for the next offline-agent transfer: introduce settings-neutral reference candidates and shared selection while preserving full/per-source semantic parity. Keep SI3 persistence separate so the online agent can first prove the neutral source vocabulary and compiler behavior against the accepted oracle. If SI2 reveals that the proposed source record cannot be persisted within the byte/provenance bounds, revise the SI3 design before implementing storage rather than silently expanding SI2.
