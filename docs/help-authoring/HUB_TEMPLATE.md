# Topic hub template

Use a hub when readers need to choose a task, or when a node would have more than twelve children. Do not create empty categories just to balance the graph.

```markdown
---
tags:
- kplex-help/section
Guide:
- '[[<broader hub>]]'
Child:
- '[[<existing guide>]]'
- '[[<existing guide>]]'
---
# <A reader goal or useful topic>

<The situation that brought the reader here>. Choose the path that matches what you need to do.

## Choose your next step

- **<Need>** ? [[<guide>|<Outcome>]].
- **<Different need>** ? [[<guide>|<Outcome>]].

## Try one small thing

<A safe, concrete action in the demo vault, followed by the result to look for.>
```

Check actual graph children, not just this page's authored list. Reparent affected notes when splitting a hub; otherwise inverse relationships keep the original hub crowded. Keep navigation available in both ordinary Markdown and K-Plex.

Follow [Links and Markdown tables](README.md#links-and-markdown-tables): use short targets unless filenames are ambiguous, and no aliased wikilinks in table cells.
