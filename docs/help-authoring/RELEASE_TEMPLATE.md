# Release-note template (copy into K-Plex Help)

Maintain **two distinct states**: an explicitly marked proposed/draft release page, and a published-history page built from an actual GitHub release. Do not imply merged code is already released or guess tag/date. Retain original GitHub prose for historical versions when useful and label it as such.

```markdown
---
aliases:
- K-Plex <version> release notes
tags:
- kplex-help/release-notes
- kplex/<released-or-unreleased>
Guide:
- '[[Release notes]]'
Previous:
- '[[<previous release page>]]'
Next:
- '[[<next release page>]]'
Explains:
- '[[<existing feature guide>]]'
- '[[<evergreen use case>]]'
---
# K-Plex <version> — <human-readable release theme>

<Reader need and the useful outcome of this update.>

> [!warning] Draft — not released
> Remove this callout **only** after verifying the published GitHub tag.

## What you can accomplish
<One short reader-facing paragraph.>

### <Outcome, not UI setting>
<What changed and how it improves work.> See [[<feature guide>]].
<!-- Screenshot opportunity: add genuine screenshot after local Obsidian capture. -->

## Reliability and polish
<Observable fixes only; avoid internal jargon and unverified performance claims.>

## Sources
- <Published GitHub release URL, OR merged PR links while drafting>

## Original published notes (historical archive only)
<Exact published release text when importing older history; attribute and link source.>
```

Replace sequence placeholders with the actual adjacent release pages in version order. Omit `Previous` if there is no earlier page and `Next` if there is no later page; never create a link to a nonexistent page. Explicitly labeled drafts participate in the sequence without changing their release status. Update the previous page's `Next` and, when inserting between existing pages, the next page's `Previous` in the same edit. Chronological release links belong only in `Previous`/`Next`, never `Related`/`Friend`.

Follow [Links and Markdown tables](README.md#links-and-markdown-tables): short note names unless ambiguous, including sequence and ontology lists; never use an aliased wikilink in a table.

Validate the entire archive's reciprocal sequence and endpoints, YAML and link targets before finishing. See [Release sequence navigation](README.md#release-sequence-navigation) for the rules and a 0.2.4 ↔ 0.3.0 example. Preserve historical body text when fixing navigation metadata.

Before publishing: confirm exact numeric version/tag/date and actual shipped scope, links to real help pages, image display, and whether source release text is reproduced or editorially condensed. `Explains` connects the release to the guides and real-life use cases it makes possible; individual evergreen use cases should **not** carry "shipped next release" banners. Maintain an indexed Release notes hub. Use the existing `kplex-help/release-notes` tag so styling can be applied without inventing a separate ontology.

Keep original published release text intact and attributed. Add a brief reader-facing introduction before publication metadata; the introduction should help a user decide whether to read this version. Group release-to-feature links through subject hubs if direct semantic children would exceed twelve.
