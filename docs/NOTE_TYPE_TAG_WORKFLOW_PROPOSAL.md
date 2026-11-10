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

Add a manual command and lightweight manager under Note type settings: **Review note types**. Discover problems *on demand*, using Obsidian's metadata cache in bounded/yielding batches. No recurring background scanner, new graph index, full-index rebuild, or render-time whole-vault/Markdown-body reads.

### Grouped overview and drill-down

Model the dialog after the maintainer's wireframe, with three named sections and one row for each affected note-type value. Each row displays the **value**, **affected-note count**, **View notes** (eye) and **Fix…**. View notes expands to the affected file paths as clickable note links, with the exact issue/missing-field names and individual inclusion checkboxes. Group counts count distinct affected notes, not missing fields; overlapping findings may appear under more than one category.

```text
Note type errors

Invalid note type value
  Big idea                     23 notes       [Fix…]  [View notes]
  another invalid value        12 notes       [Fix…]  [View notes]

Present as property but not as tag
  person                       10 notes       [Fix…]  [View notes]
  book                          3 notes       [Fix…]  [View notes]

Notes missing configured properties
  person                      213 notes       [Fix…]  [View notes]
  book                         32 notes       [Fix…]  [View notes]
```

Use the configured note-type property name and Obsidian's supported tag grammar. Display all file paths in the drill-down; the overview remains compact even in a large vault. Provide search/filter, accurate scanned/skipped coverage, processing progress, cancel for pending files, per-file results and **Recheck**. Opening the dialog or clicking View never edits notes.

### Category A — Invalid note-type value

A non-empty YAML selector value is invalid when it cannot represent one valid tag, e.g. `Big idea`, `person//friend`, or an unsupported multi-valued/complex property. Group **single unambiguous string values** by their exact current value; duplicate selector fields, ambiguous arrays/objects, and unsupported structures appear under a **Needs manual inspection** sub-group and are excluded from automated bulk repair.

**Fix…** for one invalid string value:
1. Prompt for a replacement **valid tag name**, e.g. user types `big-idea` for `Big idea`; validate using the same tag grammar as Set note type. No silent slugging/guessing.
2. Preview all impacted note paths, the old and new note-type value, and the **corresponding tag that will be added to YAML `tags`**. Permit deselecting individual files.
3. On confirmation, for **each selected file in one native frontmatter mutation**, replace the configured YAML note-type property with the chosen canonical tag text **and ensure that same tag is present in YAML `tags`**. These two effects must succeed together or the file is skipped/failed without a partial edit. This is essential: formerly invalid type values generally have no matching tag entry, so changing the selector alone would recreate the same inconsistency.
4. Preserve all other tags, existing properties and body text. Never remove unrelated/legacy tags as a side effect; don't change inline note-type fields or forcibly convert unsupported data. If `tags` already contains the replacement, don't duplicate it. If current YAML is unsupported, or its type changed since preview, skip it for individual inspection.

Example, **one Fix action** for all selected notes:
```yaml
# Before
Note type: Big idea
tags: [research]

# After user explicitly enters big-idea
Note type: big-idea
tags: [research, big-idea]
```

### Category B — Present as property but not as tag

A valid YAML note-type selector value exists, but its **exact tag** is absent from the YAML `tags` property. Group by normalized type value; `person/friend` alone does **not** satisfy an explicit `person` tag. **Fix…** previews the affected files and adds the missing tag to each selected note's YAML `tags`, without changing the valid selector or other tags. This is an explicit **reviewed bulk fix** as well as an individual fix.

### Category C — Notes missing configured properties

For notes with a valid **tag-backed** note type, compare existing YAML frontmatter keys with the type's configured **default node-property list** from section 3. A field is *missing* only when the key is absent; empty, null, `0` and `false` count as present. **Show on node** controls rendering only and does **not** determine whether a configured property is eligible for initialization. Do not call these properties required fields or treat their absent values as schema violations.

Group by note type. **View notes** shows each path and the names of missing fields. **Fix…** previews the set of fields to add and allows the user to select affected files. The batch action adds **only absent keys**, with the same empty editable YAML values supported by the individual **Add missing note-type properties** action. Preserve all existing values and unrelated YAML; never overwrite a field that appeared after preview. For notes that also need invalid-type/tag repair, resolve the type/tag issue first and offer to recheck before fixing properties.

### Shared safety and performance

- Every Fix is explicitly confirmed after a file-level preview; never repair on discovery. No automatic correction of invalid strings without user choosing a valid replacement.
- Re-resolve exact `TFile` identity, configured field, note-type selection, expected original value, supported `tags`, existing/missing fields and vault state immediately before *each* native mutation. Recompute minimal needed edits and skip changed/ambiguous files; never restore older tags/fields from a stale snapshot.
- For invalid-value repair, the new note-type selector and matching tag membership are **one atomic per-file frontmatter write**, not two independent asynchronous operations. A multi-file batch is sequential/bounded and **not** globally atomic: successful files remain changed if the user cancels or later files fail.
- Metadata-cache-only detection cannot prove all body/inline variants: valid inline-only `note type:: #person` notes are not treated as missing YAML, and unknown cache coverage is reported instead of silently classified as clean. Never shadow unsupported inline selectors with new YAML without explicit review.
- Bounded/yielding batched discovery; no duplicate tag insertions, no unintended full-index rebuild or change in ontology relationship semantics. Restore UI state and provide counts for fixed, unchanged, skipped, failed, and pending work.
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
- [ ] Review note types groups invalid values, missing tags and missing configured fields by value/type with counts, viewable note paths and per-note selection; invalid-value bulk Fix prompts for a valid replacement and atomically updates BOTH selector and matching tag per file; valid missing-tag Fix adds membership; missing-fields Fix adds absent empty keys only.
- [ ] Bulk previews, revalidation, uncertain/changed-file skips, cancellation, per-file outcome counts, no duplicate/partial per-file metadata writes, no automatic invalid-value conversions, and bounded large-vault work. Inline-only notes remain valid and cache gaps remain visible.
- [ ] All UI forms meet `UI_RULES.md`, light/dark, narrow/mobile, popout, focus, keyboard, Save/Cancel and localization requirements.
- [ ] Run focused type/tag/property/geometry tests, applicable host integration, build and scanner checks. Because this touches actual note metadata and tag relationships, assess full indexing/restart gates per current AGENTS/CODING_STANDARDS/CONTRIBUTING; do not claim performance or host validation without measured evidence.

Practical manual scenarios: (1) change a person note to project while preserving or removing the old YAML tag; (2) show `title` beneath an ID filename and add a missing configured field; (3) bulk-replace invalid YAML `Note type: Big idea` with user-chosen `big-idea` **and add `big-idea` to each file's `tags` in the same write**; (4) bulk-add missing tags, then review and bulk-add configured empty properties to selected notes, while leaving inline-only notes untouched.
