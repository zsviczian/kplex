# Tag-backed note types: practical implementation brief

Status: draft specification for review and an implementation agent. No feature code has been changed in this branch.

Related: [#209](https://github.com/zsviczian/kplex/issues/209), [#271](https://github.com/zsviczian/kplex/issues/271); supersedes the broad [draft PR #286](https://github.com/zsviczian/kplex/pull/286). [#284](https://github.com/zsviczian/kplex/issues/284) is declined; [#252](https://github.com/zsviczian/kplex/issues/252) remains separate.

## Product rule

**A K-Plex note type is a tag selected for a special purpose: identifying the note's primary type and its node appearance.** Keep the ExcaliBrain inheritance, existing tag nodes, hierarchical tags, search, pinning and tag drag-and-drop. Do not introduce separate class nodes, virtual type hubs, Base-parent mappings, or arbitrary-property-based classification.

The configured note-type *field name* remains editable for existing vaults (default `Note type`). Its **value** must identify a valid tag. Keep the persisted setting key `noteTypeField` and existing style dictionary identities. Existing inconsistent notes may remain readable until the user repairs them; new writes must maintain the invariant.

Illustrate the same type in either supported authoring format:

Markdown body:

```markdown
note type:: #person
#person/friend
```

YAML (using the configured note-type property name):

```yaml
---
Note type: person
tags:
  - person
  - person/friend
---
```

YAML tag values have no leading `#`. Hierarchical tags use `/`. The note-type selector is a singular primary role; all other tags retain their normal meaning. Case/spelling normalization for comparisons must follow the existing supported tag grammar; preserve the user's unrelated tags.

## 1. Fix Set note type from the node context menu

**Observed source defect:** [`NoteTypeModal.ts`](https://github.com/zsviczian/kplex/blob/447af1543c7ccaf72ca72c1a4b15c973642baea0/src/ui/NoteTypeModal.ts) currently writes/deletes only `fm[settings.noteTypeField]` and calls `plugin.rebuildIndex(false, true, "note-type")`. It never updates `tags`. By contrast, existing [tag/Note Type drop helpers](https://github.com/zsviczian/kplex/blob/447af1543c7ccaf72ca72c1a4b15c973642baea0/src/adapters/obsidian/tagNoteType.ts) already support native tag membership, conflict detection and field preservation. Reuse those owners, extending them only for the new old-tag removal choice.

### User flow

Current note:

```yaml
---
Note type: person
tags: [person, person/friend, work]
---
```

The user chooses **Set note type…** and selects `project`.

```text
Set note type
Note type             [ #project              v ]
Current type           #person
[x] Add #project to tags            (always, explanatory text; no additional checkbox required)
[ ] Remove old tag #person from YAML tags
                                       Cancel    Save
```

The actual UI should avoid a redundant checked control for the automatic new-tag action: one concise explanatory sentence plus a single **Remove old tag #person** checkbox, default **off**. Show the checkbox only when the selected type differs and the old exact tag exists in YAML. For notes with no old type, simply explain that Save updates both fields. Accept `person` or `#person` as entry, suggest existing tag names including hierarchical paths, validate before Save, and write canonical YAML `Note type: person` plus `tags: [person]` without a hashtag in either YAML value.

On Save with the removal checkbox off, the YAML contains `Note type: project` and tags `[person, person/friend, work, project]`. With removal on, tags become `[person/friend, work, project]`. Removal affects the **exact old YAML tag only**; it does not remove nested tags or body tags. If the old type tag occurs elsewhere in Markdown, explain that it remains a tag in the note.

The existing **Clear** action clears the note-type selector; offer the same *keep old tag by default* behavior and optional exact-old-YAML-tag removal. If an inline `note type:: #person` is present, clearing only the YAML property would expose that inline selector again: detect and disclose this before claiming Clear has removed the primary type; do not silently rewrite the body. If reliable inline detection is unavailable, require opening the note to resolve the ambiguity.

### Write contracts

- Share one tag/type mutation owner across context menu and structural tag drop; use `appendTagMembership`, `removeTagMembership` and source-aware `noteTypeSelection` where applicable. Keep the existing drop's **Tag vs Note Type** choice and its distinct replacement semantics.
- Ensure the target tag and configured note-type field are saved together through one native `FileManager.processFrontMatter` mutation. No partial changes when a target is invalid, tags are unsupported, or the original note/file/settings changed while the dialog was open.
- Reject invalid new tags (spaces, empty segments, malformed hierarchy, extra `#`, unsupported syntax). Never silently convert multiword class values to tags or flatten a multi-valued property.
- Preserve field spelling, unrelated YAML fields, other tags, custom styling and existing tag membership semantics. Do not remove the old tag unless explicitly selected; never remove body tags.
- Let the existing per-file metadata/index observation update presentation and membership. Investigate whether the current explicit `rebuildIndex` call is needed; avoid an avoidable full rebuild. Demonstrate correct result with the normal incremental path.
- Protect duplicate submissions, stale file identity, concurrent frontmatter edits, unsupported values and failure/retry without duplicate tags.

## 2. Settings label and explanation

Replace the visible **Style property** label with **Note type property**. Update its description and nearby help to explain, in plain text:

> A note type is a tag selected as the note's primary type. It controls node styling. In Markdown, use `note type:: #person`. In YAML, use `Note type: person` and include `person` in `tags`. Hierarchical tags such as `person/friend` are supported. Replace `Note type` in these examples with your configured field name.

Retain the setting value and persisted key; don't rename configuration schemas, existing imported styles or user notes. Audit related labels in the node-style manager (which currently distinguishes property-value styles and legacy tag-prefix styles) for misleading language, while preserving distinct legacy style matching and precedence. Update all eight language catalogs according to repository localization rules. Examples should remain legible at narrow Settings widths.

## 3. Node details for #209

Reuse the substance of the original [#209](https://github.com/zsviczian/kplex/issues/209) suggestion: a compact configuration of document-property names **per tag-backed note type**, each with an on-node visibility toggle and display order. Show existing property values underneath the node's current primary label in smaller text. Do not replace the filename/title and do not make another required-property/schema subsystem.

Proposed single type editor:

```text
#person — Node style and details
Appearance       [existing icon, colors, sizes...]
Node details
  Property             Show       Actions
  title                 [x]       up/down/delete
  company               [x]       up/down/delete
  status                [ ]       up/down/delete
  [+ Add property]
  [compact node preview]
                                        Cancel  Save
```

Integrate details with the existing type/style experience, avoiding stacked manager/editor chains and verbose per-row Settings controls. Use the actual shared native modal/forms in `UI_RULES.md`. The unmerged prototype `2026-11-06-note-type-node-properties` at `9640afba` has reusable bounded cache reads, safe formatting and geometry tests, but **do not adopt its cumbersome editor**. Key configurations consistently using the normalized tag identity and preserve imported styles where feasible.

Node details are read from existing cached YAML properties on the rendered notes, with bounded size/line count; missing or empty values add no line, and `0`/`false` remain visible. Avoid body reads, new indexing work and storing arbitrary properties in graph semantic state. Measure and render in Compass, Mind Map and other supported views; test titles, connectors/gates, zoom, focus and embedded-editor cases.

Add a separate node context action, **Add missing note-type properties**, available when the note's type has configured fields. Preview which configured fields are missing and add only those YAML keys as empty editable values using the existing native frontmatter writer. Preserve existing values (including empty/null where already present), frontmatter ordering where supported, and unrelated metadata. Keep node-display toggles separate from the set of fields eligible for initialization: a configured but hidden field may still be added explicitly. This action changes only the selected physical note; no automatic property addition when viewing, tagging or switching type.

## 4. Maintenance: Review note types

Add a manual command and lightweight manager under the Note type settings: **Review note types**. It scans Markdown files *on demand* using Obsidian's metadata cache, in bounded/yielding batches. No recurring background scanner, independent graph index, full-index rebuild or per-note body read.

Show a filtered list of YAML notes with these conditions:

1. **Missing tag:** the configured note-type property contains a valid tag name, but the exact tag is absent from the note's YAML `tags` list (a child tag is not identical to its parent). Offer **Add missing tag**.
2. **Invalid type value:** a non-empty type value cannot represent a valid single tag (e.g. `Big idea`, a malformed `person//friend`, an unsupported list/object or ambiguous duplicate selectors). Offer **Open note** / **Change note type** for an explicit correction; no automatic slugging, class conversion or data loss.
3. **Unavailable metadata:** report skipped/pending files separately rather than claiming an empty clean result. Inline-only `note type:: #person` notes are valid and not flagged for lacking a YAML property.

Use the current configured field name, native tag grammar and exact YAML membership checks. Preserve the distinction between a body tag discovered by Obsidian and an explicit YAML tag needed for consistent frontmatter. A valid `Note type: person` with only `person/friend` in YAML should be reported as missing the exact `person` entry.

Display file path, current type, problem and proposed edit, with an individual Fix action and an optional reviewed **Fix selected valid missing tags** operation. Never auto-fix invalid values. Before each write, re-read native frontmatter, check file identity/current field/tag status and skip changed or unsupported files. Provide progress, cancel for not-yet-written files, completion counts and a recheck action; changes already committed remain intact. Do not silently edit the user vault on opening the report.

## Out of scope and compatibility decision

- No `class: Person` -> Base-parent mapping (#284), Fileclass integration, automatic Base navigation, new class system or type nodes. Existing tag nodes already provide browsing, search, pinning and drag-and-drop membership; see #271.
- No Markdown template picker, Excalidraw-template coupling or creation automation changes (#252). Keep that issue independent.
- No wholesale rewrite of existing notes, semantic indexing redesign, new relationship classifier or tag hierarchy changes.
- Existing vault data that contradicts the intended tag-backed model remains readable where currently supported. New **Set note type** writes enforce the invariant; Review note types offers an explicit path to repair old YAML inconsistencies. A future removal of legacy property-only styles would require its own migration decision.

## Validation / acceptance

- [ ] Regression reproduces Set note type's missing-tag bug and verifies one atomic metadata write, matching YAML type/tag and normal incremental display refresh.
- [ ] Same tag / new tag / hierarchical tag / case variants; keep-or-remove old exact tag; preserve nested/body tags; Clear and inline-shadowing cases; stale dialog/concurrent edits; malformed tags and YAML; no partial/duplicate writes.
- [ ] Existing tag drop, tag unlink, note-type demotion, tag center, pin and search unchanged; source/semantic graph and relationship evidence unaffected except actual tag-membership edits.
- [ ] Property-detail display and add-missing-field action, with existing values untouched, no index/body work from display-only changes and correct layouts.
- [ ] Review note types detects missing/invalid/ambiguous, skips inline-only, reports unknown cache coverage and only fixes explicitly approved valid missing tags; large-vault bounded work.
- [ ] All UI forms meet `UI_RULES.md`, light/dark, narrow/mobile, popout, focus, keyboard, Save/Cancel and localization requirements.
- [ ] Run focused type/tag/property/geometry tests, applicable host integration, build and scanner checks. Because this touches actual note metadata and tag relationships, assess full indexing/restart gates per current AGENTS/CODING_STANDARDS/CONTRIBUTING; do not claim performance or host validation without measured evidence.

Practical manual scenarios: (1) change a person note to project while preserving or removing the old YAML tag; (2) show `title` beneath an ID filename and add a missing configured field; (3) review and repair a small set of inconsistent YAML note types while leaving inline-only notes untouched.
