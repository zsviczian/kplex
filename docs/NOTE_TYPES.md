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

You can also define the note type in the note text:

```markdown
note type:: #person
```

Nested tag names such as `person/friend` are supported. Enter one valid tag; a value such as `Big idea` needs an explicit replacement, for example `big-idea`. K-Plex does not invent tag names.

## Set or clear a note type

Right-click a physical Markdown node and choose **Set note type…**. Saving sets the note-type document property and adds the selected tag to the tags document property. Other tags and properties are preserved.

**Remove old tag … from the tags document property** is off by default. Enable it to remove that exact old tag. Nested tags and tags in the note text remain. Changing `person` to `project` therefore normally keeps `person`, `person/friend` and other existing tags, and adds `project`.

**Clear** removes the note-type document property after you save. Old tags are kept unless you choose removal. If the note text contains `note type:: #person`, K-Plex will use `person` after you clear the document property. Edit that line in the note text to remove this type too. The dialog checks for this situation but does not edit the note text. If the text cannot be checked, open the note to check or remove its type manually.

## Show properties under node names

Open **Node styles** on the same Settings page, then edit or add the style for a note type. Its **Node details** section contains the ordered property list, **Show on node** toggles and a live sample from a matching note. Appearance and details share one Save; Cancel discards both drafts.

For a direct shortcut, open **Set note type**, choose a valid type and click the **Configure note type** settings icon. It opens that selected type's properties and appearance without saving the note-type draft. Close the settings editor to return to that draft.

Each tag has one style, shown with its `#` prefix. Ordinary tags use it through the existing primary-tag and prefix-matching rules; selecting the tag as the note type gives that same style priority. Its matching prefix rule supplies inherited appearance, and explicit attributes in its exact style take precedence. Property lists still belong to the exact selected type. **Label prefix** and **Node details** are available in the same editor. Property defaults and displayed fields apply only when that tag is the selected note type.

Existing tag and note-type styles migrate automatically, including saved themes. Where both define an attribute, the explicit note-type value wins; tag attributes fill the gaps. Prefixes, unknown style attributes and matching priority are retained. The old duplicate definitions are removed, and no notes are changed. A merged value also applies to ordinary tag use?for example, a former blue note-type background replaces a conflicting yellow tag background.

For the example above, show `nickname` and `company`, or keep an ID filename such as `ER12345.md` and show its `title` property underneath. The main node label stays unchanged. Compass, Mind Map and Facets measure the extra lines before placing nodes and their gates.

Configure up to 16 unique property names. Text, numbers, booleans and simple lists from document properties are displayed; `0` and `false` remain visible. Missing/empty values add no blank line, and complex objects are omitted. Text is limited to 512 characters per line and 16 list items, with visual ellipsis and a hover description. Fields in the note text are not part of this display. Type matching ignores case and an optional leading `#`. **Property font size** under Visual styling controls the text size for all nodes; the default is 12px.

These are optional defaults, not required fields. Viewing a note or saving its type alone does not add them. **Set note type** lists the defined properties and offers **Save type and add missing properties** when needed. You can also right-click the note and choose **Add missing note-type properties…**. Review its missing fields and confirm. Only absent document properties are added with empty values; existing values, including null, empty, `0` and `false`, remain untouched. Hidden display fields can also be added. Set a valid note type and its matching tag first if needed, then recheck.

## Review existing notes

Choose **Review note types** on the Node styling Settings page or in the Command Palette. This checks document properties and groups findings:

| Finding | Fix |
| --- | --- |
| Invalid note-type value | Choose a valid replacement. Each included note receives the new type and its matching tag in its document properties. |
| Present as property but not as tag | Add the exact missing tag to the tags document property, preserving the type property's value. A child tag alone does not satisfy parent membership. |
| Notes missing configured properties | Add only the listed absent fields, preserving every existing value. |
| Needs manual inspection | Open notes with ambiguous types or unsupported property values; these are not changed in bulk. |

Each group shows a distinct-note count. **View notes** lists clickable paths and missing-field details without editing anything. **Fix…** opens a file-level preview with inclusion controls. Uncheck any notes to exclude them, then apply. **Recheck** refreshes the report after edits.

Progress distinguishes changed, unchanged, skipped, failed and unprocessed notes. A multi-file operation is sequential, not globally atomic: Cancel stops pending files and keeps earlier successful changes. Files that changed since preview are skipped or reported for inspection. Each selected file is revalidated before its native write.

Coverage shows checked notes, unavailable information and notes without a note-type document property. Types defined only in the note text are not checked or treated as errors. The review runs only when requested and does not change notes automatically.

## Open the native Properties sidebar

With Obsidian's **Properties view** core plugin enabled, right-click a physical Markdown node and choose **Show file properties**. This uses Obsidian's own File properties sidebar action with that exact file. Obsidian controls placement, focus, pinning and editing. Attachments, folders, tags, placeholders and section-only nodes do not offer the action.
