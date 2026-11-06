# Feature guide template

Write for someone trying to do something with their notes. Begin with the reader's situation and the outcome. Do not literally ask the template questions in the published article. Keep technical provenance, test results and implementation details in source documentation, not the Help vault.

```markdown
---
aliases:
- <A useful search phrase>
tags:
- kplex-help/how-to
- kplex/<topic>
Guide:
- '[[<existing subject hub>]]'
Friend:
- '[[<a complementary workflow>]]'
Watch out:
- '[[<a relevant boundary or caution>]]'
---
# <What the reader can do>

<Recognizable need or frustration>. <How this feature helps the reader achieve the outcome>.

## Try it

1. <Start from a specific note or example in the Help vault.>
2. <Name the actual control and action.>
3. <Describe the visible result.>

![[<genuine screenshot captured from the app>.png]]

*<What to notice in this screenshot. Identify a desktop-only demonstration if relevant.>*

## Make it fit your work

<Only the variations needed for a meaningful choice. Link to separate feature guides for the rest.>

## If the result is different

<Brief, practical boundary or recovery step. Explain when notes will be changed.>

## Continue with your task

- [[<related feature>|<Why to go there next>]]
- [[<use case>|<An outcome that combines the features>]]
```

Before saving, ask: **What is the user's intent? What does this feature help achieve?** The opening must answer both. Put the opening before illustrations or availability notices. Prefer short prose and three to five steps to a control inventory. A screenshot must show the described feature; an attractive generic graph does not prove a dialog or a mobile interaction.

Follow [Links and Markdown tables](README.md#links-and-markdown-tables). Use short note and asset names unless filename ambiguity requires a path; never put an aliased wikilink inside a table.

Use the existing paired Guide/Explains and Parent/Child ontology. Each note should have at most twelve distinct semantic children, counting incoming Parent/Guide edges as well as its own Child/Explains lists. Group larger sets by reader task. Friend is a useful alternative or companion; Watch out/Challenger is a real caveat; Previous/Next is an intentional sequence. Do not add every relationship merely to fill a direction.

Keep release-specific availability in the release archive and the vault's opening guidance. Do not place source revisions, CI results or authoring instructions in consumer articles. Preserve meaningful limitations, permissions, existing filenames, aliases and external-source attribution.
