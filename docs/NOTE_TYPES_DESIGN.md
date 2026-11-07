# Note types, node details, navigation, and templates

Status: proposal for maintainer and issue-reporter review. This document changes no runtime behavior and is not approval to implement the entire scope at once.

Prepared by Zsolt's Codex Agent on 2026-11-07.

Related: [#209](https://github.com/zsviczian/kplex/issues/209), [#271](https://github.com/zsviczian/kplex/issues/271), [#284](https://github.com/zsviczian/kplex/issues/284), [#252](https://github.com/zsviczian/kplex/issues/252). Coordinate with [#223](https://github.com/zsviczian/kplex/pull/223), the separate Bases-backed lens proposal.

## 1. Recommendation

Keep one configurable **Note type property**, with optional profiles for how its values look and navigate. Preserve existing inline types. Add a compact node-details editor and one contextual template picker. Let templates and schema plugins own note structure.

A profile can supply appearance, displayed fields, an optional navigation home, and a suggested Markdown template. It must not define required properties, default property values, validation, inheritance, or another property editor. Displaying `birthday` must never create a `birthday` property.

Keep the user-facing term **Note type**. Rename the vague **Node style property** label to **Note type property**, retaining the existing setting key and configured value. A user can select `class`, `fileClass`, `type`, or `note type`; K-Plex does not require a particular spelling. Explain that other tools may call this a class. Renaming the whole feature to class would suggest schema responsibilities that this proposal deliberately leaves elsewhere.

No bulk note migration, matching-tag requirement, or new persistent semantic node kind is required for this design. Navigable type targets still require real navigation/UI engineering; this is not a claim of zero regression risk.

## 2. Verified baseline and prototype assessment

Investigation baseline: main at [`ef2e352`](https://github.com/zsviczian/kplex/commit/ef2e352a56762cf226bd5e3bfbe7673f47e5a07f). Prototype: [`9640afb`](https://github.com/zsviczian/kplex/commit/9640afba7dcd79343e181f574d355f3debda7820) on `2026-11-06-note-type-node-properties`, one commit ahead of that baseline. Leave that branch untouched as a source of reusable work.

Main already reads the configured type from frontmatter, falling back to already-parsed inline fields. Plain `class: Person` can select a node style without a `#Person` tag. The missing capability in #271 is global type navigation, not storage or styling. Current styling takes the first selected value and supports legacy normalization; that is not a complete multi-class model.

The prototype has useful implementation boundaries: requested-field-only cached frontmatter reads, bounded inert values, preservation of `0` and `false`, settings changes that avoid semantic invalidation, and layout tests across Compass, Mind Map, and Wu Xing. Preserve those contracts where applicable.

Its editor is a poor fit for the sketch: a searchable type manager opens another editor, and each property consumes separate setting rows for its name and visibility/actions. There is no live node preview. It also makes per-type configuration the entry point, whereas #209's serial-number filenames need a global `title` detail without adopting types. These are static source findings, not the result of running the branch in Obsidian.

Do not merge the entire prototype and then repair it. Reuse the bounded read service, formatting, measurement, and tests selectively after the revised UX is accepted. Check the mismatch between case-insensitive style lookup and exact profile lookup before reuse.

Pinned source references:

- [GraphPresentation.ts](https://github.com/zsviczian/kplex/blob/ef2e352a56762cf226bd5e3bfbe7673f47e5a07f/src/index/GraphPresentation.ts): cached type/tag presentation facts and inline fallback.
- [presentation.ts](https://github.com/zsviczian/kplex/blob/ef2e352a56762cf226bd5e3bfbe7673f47e5a07f/src/core/graph/presentation.ts) and [style.ts](https://github.com/zsviczian/kplex/blob/ef2e352a56762cf226bd5e3bfbe7673f47e5a07f/src/index/style.ts): normalization and style precedence.
- [tagNoteType.ts](https://github.com/zsviczian/kplex/blob/ef2e352a56762cf226bd5e3bfbe7673f47e5a07f/src/adapters/obsidian/tagNoteType.ts): existing tag/type write coupling, replacement choices, and safety checks.
- [Prototype editor](https://github.com/zsviczian/kplex/blob/9640afba7dcd79343e181f574d355f3debda7820/src/ui/NoteTypePropertiesModal.ts), [detail service](https://github.com/zsviczian/kplex/blob/9640afba7dcd79343e181f574d355f3debda7820/src/core/plex/nodeProperties.ts), and [tests](https://github.com/zsviczian/kplex/blob/9640afba7dcd79343e181f574d355f3debda7820/tests/node-properties.test.mjs).

## 3. Obsidian and ecosystem facts

**Bases can query body tags.** `file.tags` includes body and frontmatter tags, and `file.hasTag("person")` also matches nested tags such as `#person/friend`. Arbitrary Dataview-style inline fields are a different matter: Bases' note properties come from frontmatter. Therefore, the existing inline workflow remains useful, but a tag query cannot always distinguish a primary type from an incidental tag. Sources: [Bases syntax](https://help.obsidian.md/bases/syntax), [functions](https://help.obsidian.md/bases/functions), and [tags](https://help.obsidian.md/tags).

**`class` is an ordinary property name; `cssclasses` controls note CSS.** Multiword values such as `Big idea` and `Podcast episode` are valid text. A slash in ordinary text does not create tag hierarchy. Hashtags inside an ordinary text property do not become tags. Source: [Properties](https://help.obsidian.md/properties).

For example, this is a valid optional frontmatter workflow, not a migration requirement:

```yaml
---
class: Person
tags:
  - person/friend
cssclasses:
  - people-note
---
```

A Bases filter can use `note["class"] == "Person"`, or `list(note["class"]).contains("Person")` when the vault intentionally uses both scalar and list values. The CSS property is unrelated to K-Plex type membership.

The legacy workflow also remains supported:

```text
note type:: #person
#person/friend
```

Here the explicit inline field supplies the K-Plex type and the hashtags remain tags. A Bases `file.hasTag("person")` filter finds the tag family, including notes carrying only a nested tag. That is broader than exact primary-type membership.

**Fileclass already supplies schema management.** Its public documentation describes class options, resolved schemas, multiple binding mechanisms, and a versioned public API. It records Base mappings as `baseFile`/`baseView`; multiple classes may use different views in one Base. This provides a possible read-only integration seam, not permission to duplicate its schema or query engines. Sources: [schema](https://mdelobelle.github.io/fileclass/schema/), [views](https://mdelobelle.github.io/fileclass/views/), [API](https://mdelobelle.github.io/fileclass/cli/). Metadata Menu remains relevant to inline-field workflows: [fileClasses](https://mdelobelle.github.io/metadatamenu/fileclasses/).

**Templates and automation already own note initialization.** Core Templates inserts content/properties; Templater adds executable automation; QuickAdd adds capture and creation workflows. K-Plex should select and coordinate supported templates rather than recreate these products. Sources: [Templates](https://help.obsidian.md/plugins/templates), [Templater settings](https://silentvoid13.github.io/Templater/settings.html), [QuickAdd Template Choice](https://quickadd.obsidian.guide/docs/Choices/TemplateChoice/).

## 4. One profile editor; display fields are not a schema

Extend the existing note-type appearance configuration into one editor with compact sections. Do not introduce a parallel style store or another chain of nested manager dialogs.

```text
Person                                     [Preview]

Appearance       Existing node-style controls

Node details     [Use default fields]
                 Property          Visible       Actions
                 nickname             on         move / delete
                 company              on         move / delete
                 email               off         move / delete
                 + Add property

Navigation       Home: People.base              [choose]
                 Show type/home above matching notes: off

Creation         Suggested Markdown template: Person.md

                                      Cancel     Save
```

The preview uses the selected matching note when available, otherwise clearly labeled example values. Reordering or editing a row preserves keyboard focus. Reuse the native controls and responsive patterns in [UI_RULES.md](https://github.com/zsviczian/kplex/blob/ef2e352a56762cf226bd5e3bfbe7673f47e5a07f/UI_RULES.md); do not build an unrelated visual language.

Provide the same compact details editor at the default-node level. Existing installations start with details off. A default `title` field solves #209 without any type configuration. A type can inherit those fields or provide its own ordered list; an explicitly empty custom list means no details.

Keep the node's existing primary label. Render enabled, present values as smaller secondary text in configured order. Missing values create no empty rows; `0` and `false` are real values. Use explicit line/character budgets, safe scalar/list formatting, and accessible full values. No HTML, arbitrary expressions, or interactive property editing inside the node.

First implementation reads frontmatter through the bounded cache adapter. Preserve inline type selection, but do not imply that arbitrary inline detail fields are supported. Any later inline-caption support must reuse existing parsed evidence, not add body reads during rendering. Measure secondary text before placement in every supported view; test gates, hit boxes, zoom, export, and editor-node exclusions.

## 5. Type hubs: navigable collections outside the semantic index

A type hub is a typed navigation target identified by the configured selector and its resolved value. It has its own icon and namespace, distinct from both `#person` and a file named `Person.md`.

Search lists types; pins and history preserve typed target identity. Centering `Person` opens the vault-wide collection of matching notes. Normal quick/lens filtering then narrows that collection. Show visible versus known membership counts where filters apply; never advertise a local neighborhood as all members.

Implement hubs and membership connectors in the presentation/navigation layer. Do not manufacture `TFile` objects, fake file paths, semantic parent relationships, backlinks, or persisted graph pages merely to reuse tag behavior. Do not make arbitrary detail properties part of the semantic index. If current navigation interfaces need a typed target union, make that explicit and test its callers rather than routing fake paths through existing code.

A global collection still needs global membership evidence. Use the existing catalog and presentation facts, with explicit revision and coverage. Cache the projection by relevant revisions. On-demand mode may require bounded preparation through an existing owner; expose pending/incomplete coverage and retain known-good results. No new independent full-vault scanner, scan-on-every-search, forced full semantic hydration, or render-time parsing.

Before implementation, trace search, pins, history, layout, export, navigation restoration, metadata update, rename/delete, and plugin teardown. Prove that membership publication cannot race index publication. Large-vault measurements are required for this slice; calling it a view does not make its cost disappear.

Initial scope retains the existing principal-type resolution. Preserve multi-value properties and other plugins' schema declarations; do not silently collapse or rewrite them. Full multi-class navigation and multiple style inheritance are deferred. The UI must state this limitation, especially when Fileclass has multiple bindings. Preserve existing normalization/style behavior, retain raw value/source provenance for safe writes, and reject ambiguous identities rather than silently merging them. Case-insensitive style fallback must not be mistaken for Bases equality or new class inheritance.

## 6. A type home satisfies navigation without writing parents

A profile may point to an existing `.base` file or Markdown MOC as its **home**. It is optional; a hub works without one. Mapping a home does not change membership to the arbitrary results of that Base.

When enabled for a profile, show a compact type/home card in the north area of matching notes:

```text
[Type icon] Person                 <- browse the type collection
[Base icon] People.base   [open]   <- open the existing home
        |
     Type: Person                 <- derived, read-only connector
        |
   Sir John Michael Doe Jr.
```

Use explicit type labeling and a distinguishable connector. It is contextual membership, not an authored Parent ontology. The type label centers the collection; the home action opens the actual file using established file-opening behavior. Do not silently repurpose an ordinary Base/file node's existing click behavior. Real parents remain independent. Deduplicate presentation carefully if the same home file is already present, preserving both actions and the real relationship evidence.

This addresses #284's north-side access without inserting `up`/parent links into thousands of notes. It intentionally proposes a type/home card rather than pretending that every typed note contains an authored Base relationship.

Start with manual home mapping. An optional Fileclass adapter may resolve home mappings through the documented public API (`getSchema`, after checking API version and returned option shapes). Explicit K-Plex override wins. Never inspect guessed private plugin indexes, call mutating schema APIs, or infer a home from a coincidentally named file. Provider removal/unavailability must degrade to an explained unavailable mapping; users can retain an explicit manual mapping.

Preserve Base view identity when available. Opening a specific named view is a capability gate: use a verified supported route or open the Base and explain the fallback. Do not promise an unverified `openBaseView` or headless Obsidian query API.

Fileclass's folder/tag/bookmark/Base bindings can produce different memberships from K-Plex's configured explicit type property. Do not advertise exact parity. A future provider-backed collection would need its own accepted coverage and refresh contract. #223 owns the separate question of applying actual Base results to lenses; this proposal neither duplicates its evaluator work nor waits for it to offer a simple home link.

## 7. Creation: one contextual Template control

Reuse one shared template component across related-note creation, folder-note creation, and placeholder materialization. Generalize the existing [DrawingTemplateSelect](https://github.com/zsviczian/kplex/blob/ef2e352a56762cf226bd5e3bfbe7673f47e5a07f/src/ui/features/DrawingTemplateSelect.tsx), preserving its existing drawing behavior.

```text
Name       John Doe
Folder     People/
Create as  Markdown
Template   Person                  [choose]
Type       Person                  [change]
```

There is one Template row. `Create as` determines whether it lists Markdown or Excalidraw templates. The type is an optional compact value/action, revealed when types are in use or through an optional-details disclosure; do not add a mandatory class dropdown for everyone. A note started from a type hub can inherit that type as visible creation intent.

A profile's Markdown template is a suggestion, not a restricted template list. Apply it only while the template choice remains automatic. An explicit different template or **No K-Plex template** choice stays sticky when the type changes. Clearly explain that external folder automation may still run; this option does not promise a literally blank note.

Selecting a static template may infer its type when there is no explicit user/context type. Inference is one-way: inferred type changes must not trigger a template-selection loop. Track intent/provenance, not just the final string value.

An Excalidraw template remains selected by drawing purpose. A type's Markdown template never replaces or filters drawing templates. Preserve the user's selections separately when switching file kind. Type metadata can apply to either Markdown-backed note kind, while caption rendering still respects existing editor/drawing node behavior.

Unmaterialized placeholders have no document properties to initialize. Offer type/template choices when creating the actual file through the same creation factory, not as pretend metadata on a nonexistent file.

### Property ownership and conflicts

Templates own initial document properties and body content. Profiles own display configuration and optional navigation/default suggestions. K-Plex may write the explicitly selected type field and its already-supported creation metadata; it must not synthesize all displayed properties.

Where both template and selected type are statically known, show an inline mismatch before Create and require a choice: use the template's type or keep the explicitly selected type. Keep the template unchanged. For dynamic output, wait for supported automation to complete, then check again. Missing type can be filled; a conflicting/ambiguous type cannot be silently overwritten. Preserve a created file on failure and offer recovery without creating a duplicate or deleting user automation output.

### Template execution is a release gate

Preserve the exact creation barrier in [TEMPLATE_CREATION.md](https://github.com/zsviczian/kplex/blob/ef2e352a56762cf226bd5e3bfbe7673f47e5a07f/docs/TEMPLATE_CREATION.md): create once, await the supported per-file automation receipt, revalidate file identity, then apply K-Plex metadata and relationship writes. No sleeps, quiet-time guessing, duplicate Templater invocation, or process-wide setting changes.

Explicit template precedence must be demonstrated, not assumed. In the inspected [Templater source](https://github.com/SilentVoid13/Templater/blob/28c1ff7c7f0e535692dc829b3ed46f70a25d0c66/src/core/Templater.ts), on-create checks body length excluding frontmatter. A frontmatter-only chosen template can therefore still enter folder/regex template selection. Nonempty Markdown normally follows in-place parsing instead. This is inspected implementation behavior, not a stable public API contract.

The supported provider route must guarantee that an explicitly selected template is the initial template owner and is processed at most once. Test frontmatter-only and empty templates as well as ordinary body templates. If a provider/version combination cannot guarantee precedence, block that combination with a useful explanation while retaining existing automatic creation. Never silently append both templates or replace the user's selected one.

Limit initial rendering to a declared surface: plain Markdown and explicitly tested core-style title/date/time substitutions. Do not invent a public Core Templates renderer or interpret QuickAdd syntax. Templater execution is conditional on the existing supported adapter and verified ownership; arbitrary executable templates and unrelated asynchronous plugin writes are not blanket guarantees.

## 8. Tagging, typing, and reconnecting

Distinct targets remove the primary ambiguity: a tag target is a tag, and a type hub is a type. Show an action preview, such as **Add tag #person** or **Set note type to Person**. A derived membership edge must not accept ordinary relationship reconnect operations.

Preserve existing tag-target Tag/Note type choices and legacy write semantics initially. Changing those globally would be a separate behavior migration. New property-backed type actions must not invent a matching tag. Legacy inline `note type:: #person` remains a tag-bearing representation; do not remove its tags or change nested tags as a side effect of browsing or editing display settings.

Ship hubs read-only first. Enable write gestures only after provenance-aware mutation tests exist. A type edit must know whether the source is frontmatter, inline, both, or ambiguous. Never silently add a higher-priority YAML value to shadow an inline field. Duplicate fields, unsupported lists, stale source identity, or unclear ownership should refuse the mutation and offer opening the note. Do not route plain multiword classes through the existing tag-name validator.

No implicit subclass relationships: `Person/friend` as ordinary class text is an exact value. `#person/friend` remains a hierarchical tag. K-Plex does not generate schema inheritance from either spelling.

## 9. Visibility without grid-driven architecture

Keep the current nine-toggle layout. Type search/pins are navigation features, not another file-content category. The optional **Show type/home above matching notes** control belongs with the profile/navigation feature, default off; it does not require a tenth top-level toggle. A centered type hub remains navigable when contextual type/home cards are hidden.

Treat attachment refinement as an independent small enhancement, not a way to repair symmetry after adding types. Keep **Attachments** as the master toggle and add an accessible disclosure for **Images / PDFs / Other attachments**. These are exhaustive extension-based display filters, not new indexed node kinds or guesses about an image being an icon. This directly supports keeping PDFs visible while hiding embedded images.

Preserve old saved lenses as all attachment subcategories enabled. Master off remembers the selection for re-enable; a partial selection is visible. Enable all explicitly enables every subcategory; Disable all disables the master. Keep file-node visibility rules consistent. A home action on a type card is a navigation action, not a backdoor for reintroducing hidden attachment nodes.

## 10. Compatibility with Ideaverse Maps

The inspected [Ideaverse Maps scanner](https://github.com/nickmilo/ideaverse-maps/blob/5ac493e6c71e4102328acf633082da544c3d3654/src/scan.js) separates frontmatter property links from body links, reads body/frontmatter tags, and defaults its dimensions to `up`, `related`, and `collections`. It also uses link evidence in its scoring. There is no basis for treating every MOC or collection as a K-Plex type.

Preserve those authored conventions and allow an ordinary MOC as a type home. Do not rewrite `up`, `related`, `collections`, tags, or authored links to manufacture type membership. That avoids changing the graph evidence another tool consumes. A vault may use collections and types side by side; configuring `class` must not hijack `collections`.

This is data-model compatibility based on source inspection, not a claim that the two plugins have been runtime-tested together. Bases query interpretation and any future direct adapter remain separate capabilities.

## 11. Delivery slices, guardrails, and acceptance

Keep this design PR draft until the interaction model is reviewed. Implement small independently reviewable slices rather than one cross-cutting merge:

1. **Node details (#209):** default and per-type compact editor, preview, bounded cache reads, layout correctness. Reuse safe prototype parts. Does not depend on type hubs or templates.
2. **Read-only type navigation (#271/#284):** typed search/pins/history, truthful global membership, optional north type/home card, manual home mapping. Optional Fileclass mapping follows a separate capability-tested adapter.
3. **Creation (#252):** one contextual picker, optional type intent, Markdown suggestion rules, template conflict/ownership tests through the existing creation barrier. No dependency on a schema editor.
4. **Mutation and refinements:** safe type assignment/drop as a separately validated follow-up; attachment subfilters separately. Do not delay the core issue fixes for these.

For every slice, follow current AGENTS.md, CONTRIBUTING.md, CODING_STANDARDS.md, UI_RULES.md, and validation retention policy. No changes to parsing, semantic cache format, or index publication ownership are authorized by calling a feature presentation-only. Any demonstrated need to cross those boundaries requires a new explicit design decision.

Required regression coverage includes:

- Legacy inline and YAML types, absent fields, multiword values, nested tags, list/duplicate-field safety, and unchanged style precedence.
- Default details without types; hidden/missing/zero/false values; focus/save/cancel; long values; Compass/Mind Map/Wu Xing geometry; image/export/central-editor behavior.
- Cold/warm/on-demand catalogs, partial coverage, incremental type changes, rename/delete, multiple views, stale asynchronous results, pin/history restoration, and bounded large-vault work.
- Plain and properties-only templates; folder and regex automation; explicit none; type/template mismatch; dynamic rename/failure; double-click Create; same-path replacement; Markdown/Excalidraw switching; no duplicate execution.
- Provider absence/disable/version mismatch; unavailable home or Base view; actual parent plus mapped home; unchanged graph link/ontology counts when only contextual navigation is toggled.
- Old settings/lenses and unknown settings keys preserved; no new note writes or body reads from rendering/profile edits.

Priority manual acceptance: (1) reproduce #209's ID-plus-title use case with no types; (2) compare legacy inline Person and YAML multiword classes through search/pins/home navigation; (3) create Markdown and Excalidraw notes under real folder automation, including a properties-only template and a dynamic rename.

Do not close the four feature issues merely because this proposal exists. Acceptance needs implementation evidence and maintainer review.

## 12. Boundaries and feedback requested

Out of scope: a K-Plex schema system, required-field insertion/completeness scoring, class inheritance, automatic note migration, general Bases evaluation, arbitrary plugin workflow execution, automatic class changes inferred from ordinary tagging, and a broad indexing refactor.

Feedback should focus on concrete workflows: whether global/default details solve the serial-number case; whether the north type/home card provides the desired Base/MOC access; whether multiple simultaneous classes are essential for the first navigation release; and which actual Markdown template/automation combinations must work. Include a small sanitized example where possible. The related draft PR body is the shared place to discuss the integrated interaction model.
