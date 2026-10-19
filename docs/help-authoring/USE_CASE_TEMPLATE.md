# Evergreen use-case template (copy into K-Plex Help)

Lead with a *recognizable situation* and the *outcome in the user's life*. A use case is not a list of features or a mandated taxonomy. Do not force a difficult "why does each note belong" exercise: connecting, changing and removing links should feel lightweight and reversible.

```markdown
---
aliases:
- <Outcome-focused alternate title>
Note type: Use case
tags:
- kplex-help/example
- kplex/use-cases
Parent:
- '[[07 Use cases/Use cases]]'
Explains:
- '[[<existing feature guide>]]'
- '[[<another existing guide>]]'
Friend:
- '[[<closely related use case>]]'
---
# <Memorable title: e.g. Never start a project with a blank page>

**The situation:** <Everyday need or frustration of an Obsidian user.>

**The outcome:** <What is easier or possible when finished.>

## Try it with a real example
<One concrete project, research or personal-life story.>

## Ways to make it happen
### <Workflow 1>
<Simple actions using K-Plex and existing Obsidian notes.>
### <Workflow 2>
<Alternative path: e.g. two Plexes, Obsidian Bases/file explorer, dragging.>
### <Workflow 3>
<Serendipitous approach, e.g. Wander, where meaningful.>

## Why this changes the workflow
<Outcome, reduced friction, reusability; not a feature inventory.>

**Done when:** <Small, observable outcome; not a perfect organization demand.>

## Explore further
- [[<related use case>]]
- [[<feature guide>]]
```

Rules:
- **Always** set frontmatter `Note type: Use case` exactly, checking live vault conventions.
- Keep the article evergreen: **no** "Next release", unpublished-version announcements, or dated status tables in the use-case page. Release-specific history belongs in the versioned release archive, which can point back here via `Explains`.
- Reuse existing `Parent`, `Explains`, `Friend` ontology fields and actual target paths. Preserve the landing page's structural links; avoid duplicate guidance.
- Keep examples grounded in supported behavior. The reference example is [Never start a project with a blank page](https://github.com/zsviczian/kplex-help/blob/2026-10-19-help-use-cases/07%20Use%20cases/Never%20start%20a%20project%20with%20a%20blank%20page.md); check the newest Help branch before copying.
