# Show useful properties below node names

Keep a serial number or short name as the title while seeing what the note is about. Configure extra lines separately for each note type, using the same **Node style property** that selects property-value styles.

1. Open **Settings → K-Plex → Visual styling → Node styling → Node properties**.
2. Search for a known note type and open it, or choose **Add note type** and enter its value.
3. Add property names such as `title`, `company` or `status`. Enable **Show on node** for the fields you want to see.
4. Use the arrow buttons to choose their display order. Delete a row to remove it from this configuration.
5. **Save** to update the canvas. **Cancel** leaves the saved setup unchanged.

For example:

```yaml
---
Note type: requirement
title: Improve response time for returning customers
status: In progress
---
```

For the `requirement` type, configure `title` and `status` as visible. A note named `ER12345.md` retains its existing title and shows those two values below it in smaller text. The same configuration works in Compass, Mind Map and Facets, including repeated occurrences of a note.

Choose up to 16 unique fields per type. Displayed values come from cached YAML properties: text, numbers, booleans and lists of simple values. Empty values add no blank lines; complex objects are omitted. Long text is shortened visually to fit the node; hover a value to see its field name and retained text. Display is bounded to 512 characters per line and 16 list items. A hidden row keeps its configuration but contributes no displayed text. Note types without configured visible values keep their existing appearance.

These are display preferences. They do not add missing properties, change note text, replace the main title, create connections or modify ontology. Properties inside an expanded note editor remain part of the normal document rather than an extra caption. If metadata is temporarily unavailable, its extra lines may appear once Obsidian has the note's current properties.
