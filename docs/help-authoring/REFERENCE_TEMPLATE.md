# Reference article template

Use this for a glossary, shortcut list or choice comparison. Readers need to look something up quickly, not read a feature inventory before finding their answer.

```markdown
---
tags:
- kplex-help/reference
Guide:
- '[[<existing hub>]]'
---
# <What the reader can look up>

<The question or decision that brought the reader here>. <How to use this reference to move forward>.

## Find your answer

| Want to... | Choose or use | What happens |
| --- | --- | --- |
| <Task> | <Actual label or shortcut> | <Visible result> |

## Check your own setup

<Explain saved preferences or platform differences only where they affect the answer.>

## Try it

<A small example, linked to a real feature guide or demonstration.>
```

Use searchable terms and short rows. Keep Windows/macOS shortcut conventions accurate. Link to the shared action and feature guides instead of repeating long instructions. A native keyboard-help screenshot illustrates the reference; it is not evidence of physical mobile keyboard testing.

Follow [Links and Markdown tables](README.md#links-and-markdown-tables): short targets unless filenames are ambiguous, no aliased wikilinks inside tables, and equal column counts in every row. For a descriptive table link, use `[Inspect the source](<Connection details and evidence.md>)`; for the note name itself, use `[[Connection details and evidence]]`.
