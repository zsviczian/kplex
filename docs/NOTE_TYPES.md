# Note types, node details and optional properties

A note type is a tag selected as a note's primary type and node style. The normal tag node remains searchable, navigable and pinnable. Other tags keep their usual meaning.

The default selector is `Note type`. Change its name under **Settings → K-Plex → Visual styling → Node styling → Note type property** if your vault uses another name.

```yaml
---
Note type: person
tags:
  - person
  - person/friend
title: Sir John Michael Doe Jr.
nickname: Johnny
company: Microsoft
---
```

An inline selector is also valid:

```markdown
note type:: #person
```

Nested tag names such as `person/friend` are supported. Enter one valid tag; a value such as `Big idea` needs an explicit replacement, for example `big-idea`. K-Plex does not invent tag names.

## Set or clear a note type

Right-click a physical Markdown node and choose **Set note type…**. Save updates the configured YAML selector and adds the matching YAML tag in one write. Other tags and properties are preserved.

When changing a YAML type, **Remove old tag … from YAML tags** is off by default. Enable it to remove that exact old membership. Nested tags and tags in the body remain. Changing `person` to `project` therefore normally keeps `person`, `person/friend` and other existing tags, and adds `project`.

**Clear** prepares an empty selector draft; **Save** applies it. Old tags are kept unless you choose removal. An existing inline selector becomes active again after its YAML override is removed. The dialog checks this note and explains that fallback; it does not edit body text. If the inline check cannot finish safely, open the note to clear its type manually.

## Show properties under node names

Open **Node styles** on the same Settings page, then edit or add the style for a note type. Its **Node details** section contains the ordered property list, **Show on node** toggles and a live sample from a matching note. Appearance and details share one Save; Cancel discards both drafts.

For the example above, show `nickname` and `company`, or keep an ID filename such as `ER12345.md` and show its `title` property underneath. The main node label stays unchanged. Compass, Mind Map and Facets measure the extra lines before placing nodes and their gates.

Configure up to 16 unique property names. Existing cached YAML text, numbers, booleans and simple lists are displayed; `0` and `false` remain visible. Missing/empty values add no blank line, and complex objects are omitted. Text is limited to 512 characters per line and 16 list items, with visual ellipsis and a hover description. Inline body properties are not part of this display. Type matching ignores case and an optional leading `#`.

These are optional defaults, not required fields. Viewing a note or changing its type never inserts them. To add them explicitly, right-click the note and choose **Add missing note-type properties…**. Review its missing fields and confirm. Only absent YAML keys are added with empty values; existing keys, including null, empty, `0` and `false`, remain untouched. Hidden display fields can also be initialized. Repair a missing YAML type/tag first if needed, then recheck.

## Review existing notes

Choose **Review note types** on the Node styling Settings page or in the Command Palette. This manually checks cached YAML and groups findings:

| Finding | Fix |
| --- | --- |
| Invalid note-type value | Choose a valid replacement. Each included note receives both the replacement selector and its matching YAML tag in one write. |
| Present as property but not as tag | Add the exact missing YAML tag, preserving the selector's spelling and representation. A child tag alone does not satisfy parent membership. |
| Notes missing configured properties | Add only the listed absent fields, preserving every existing value. |
| Needs manual inspection | Open notes with ambiguous selectors or unsupported YAML data; these are not bulk-repaired. |

Each group shows a distinct-note count. **View notes** lists clickable paths and missing-field details without editing anything. **Fix…** opens a file-level preview with inclusion controls. Uncheck any notes to exclude them, then apply. **Recheck** refreshes the report after edits.

Progress distinguishes changed, unchanged, skipped, failed and unprocessed notes. A multi-file operation is sequential, not globally atomic: Cancel stops pending files and keeps earlier successful changes. Files that changed since preview are skipped or reported for inspection. Each selected file is revalidated before its native write.

Coverage shows checked notes, unavailable metadata and notes without a YAML selector. The scan does not read Markdown bodies, and a missing YAML selector does not make a valid inline-only type an error. No recurring scan or automatic cleanup is installed.

## Open the native Properties sidebar

With Obsidian's **Properties view** core plugin enabled, right-click a physical Markdown node and choose **Show file properties**. This uses Obsidian's own File properties sidebar action with that exact file. Obsidian controls placement, focus, pinning and editing. Attachments, folders, tags, placeholders and section-only nodes do not offer the action.
