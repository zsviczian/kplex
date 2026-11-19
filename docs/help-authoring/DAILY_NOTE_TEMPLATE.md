# Release-day daily note template

Use the actual publication date and the vault's configured Daily Notes filename. This is reader-facing journal content, not a validation report. Several releases on one day belong in one note.

```markdown
---
tags:
- kplex-help/example
- kplex/dates
Guide:
- '[[Release days - <Month YYYY>]]'
---
# <YYYY-MM-DD>

This release was published on this day. Follow its changes or visit the nearest journal entry.

- K-Plex <version>

earlier:: [[<nearest earlier existing daily note>]]
later:: [[<nearest later existing daily note>]]
```

On the release page add `released on:: [[YYYY-MM-DD]]`. The Help ontology maps `released on` to Friend. Journal entries deliberately use Parent/Child: `earlier/later` is a Parents pair, and `later` is a Child field. The earlier day is a Parent; the later day is a Child. Preserve this established mapping without asking the maintainer to reconsider it on each update. Do not add a second Date property solely to duplicate the released-on link. Omit absent chain endpoints and update both neighbors when inserting a date. Keep the independent release-version Previous/Next sequence intact. Existing non-release demonstration days remain in the chronological chain, with their original meaning preserved.

Verify the whole journal chain after edits, including multiple releases on one day, real calendar navigation, source inspection and the twelve-child limit in each hub. Historical dates come from GitHub's published_at metadata. A future version's date needs an authoritative release or explicit maintainer input.

Keep the release-to-day declaration as the single physical source. The daily note can name its versions as plain text and rely on the incoming released-on Friend edge for navigation; avoid duplicating it with another Friend property or body link when demonstrating direct single-source navigation.
