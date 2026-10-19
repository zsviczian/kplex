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
- '[[11 Release notes/Release notes]]'
Explains:
- '[[<existing feature guide>]]'
- '[[07 Use cases/<evergreen use case>]]'
---
# K-Plex <version> — <human-readable release theme>

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

Before publishing: confirm exact numeric version/tag/date and actual shipped scope, links to real help pages, image display, and whether source release text is reproduced or editorially condensed. `Explains` connects the release to the guides and real-life use cases it makes possible; individual evergreen use cases should **not** carry "shipped next release" banners. Maintain an indexed Release notes hub. Use the existing `kplex-help/release-notes` tag so styling can be applied without inventing a separate ontology.
