# ExcaliBrain / K-Plex indexing compatibility fixture

This folder is a deliberately small **golden-vault fixture** for testing ExcaliBrain-compatible indexing in K-Plex plus the runtime-only central-note section-expansion layer.

It covers:

- current Obsidian Properties/Bases frontmatter;
- legacy Dataview full-line, parenthesized, and square-bracket inline fields;
- wikilinks and Markdown links, including aliases;
- external URL nodes and URL aliases;
- note type and tags;
- flat and hierarchical tag indexing;
- folder-tree indexing;
- explicit ontology and inferred relationships;
- reciprocal ordinary links;
- conflicting ontology, including K-Plex frontmatter-over-body precedence;
- multi-value ontology fields;
- frontmatter Date properties mapped through Daily Notes configuration;
- resolved and unresolved/placeholder daily-note dates;
- Previous / Next;
- Hidden relationships;
- a **central-note section expansion** mode that reparses only the central Markdown note at runtime.

The baseline/global index remains **note-level**. The section-expansion cases do **not** require section-by-section vault indexing.

---

# 1. Folder layout

```text
TESTFILES/
├── README.md
└── Vault/
    ├── Note A.md
    ├── Note B.md
    ├── Note C.md
    ├── Note D.md
    ├── Note E.md
    ├── Note F.md
    ├── Note G.md
    ├── Note H.md
    ├── Note X.md
    ├── Note Y.md
    └── Daily/
        └── 2026/
            └── 09/
                ├── 20260918.md
                └── 20260919.md
```

Two daily-note targets are intentionally **not** present:

```text
Daily/2026/09/20260920.md
Daily/2026/10/20261001.md
```

Those are placeholder-date fixtures and should be represented as unresolved/virtual daily-note targets rather than silently discarded.

`Note A` is the primary semantic test hub. The other notes are intentionally small endpoints so failures are easy to diagnose.

The existing nested `Daily/2026/09` structure is also the folder-indexing fixture; no extra files are needed merely to test the file tree.

---

# 2. Assumed ExcaliBrain-compatible configuration

The expected relationship behavior is based on the [ExcaliBrain repository](https://github.com/zsviczian/excalibrain), especially:

- `src/constants/constants.ts` — default hierarchy field names;
- `src/excalibrain-main.ts` — folder nodes, tag nodes, folder tree, tag tree;
- `src/graph/Pages.ts` — ordinary-link and URL inference;
- `src/graph/Page.ts` — Dataview ontology extraction, tag-to-page relationships, hidden relations, relationship conflict resolution;
- `src/graph/URLParser.ts` — external URL extraction and aliases;
- `src/utils/dataview.ts` — extraction from Dataview values and Date-to-daily-note conversion;
- `src/Settings.ts` — default inference, note-type, folder/tag display settings.

Use the normal ExcaliBrain inference defaults, with `Challenger` included as a right-friend ontology field.

```yaml
inferAllLinksAsFriends: false
inverseInfer: false
showInferredNodes: true
renderAlias: true
showURLNodes: true
showFolderNodes: true
showTagNodes: true
showFullTagName: true
primaryTagField: "Note type"

hierarchy:
  parents:
    - Parent
    - Parents
    - up
    - u
    - North
    - origin
    - inception
    - source
    - parent domain
  children:
    - Children
    - Child
    - down
    - d
    - South
    - leads to
    - contributes to
    - nurtures
  leftFriends:
    - Friends
    - Friend
    - Jump
    - Jumps
    - j
    - similar
    - supports
    - alternatives
    - advantages
    - pros
  rightFriends:
    - opposes
    - disadvantages
    - missing
    - cons
    - Challenger
  previous:
    - Previous
    - Prev
    - West
    - w
    - Before
  next:
    - Next
    - n
    - East
    - e
    - After
  hidden:
    - hidden
```

For note-type styling tests, configure at least:

```yaml
tagStyleList:
  - "#project"
  - "#person"
```

`showFolderNodes`, `showTagNodes`, and `showFullTagName` affect presentation. Folder and tag entities should still be represented in the index independently of whether they are currently displayed.

---

# 3. Daily Notes assumptions

## Obsidian default versus configured filenames

A frontmatter Date property stores an ISO date such as:

```yaml
date: 2026-09-18
```

The stored property value does **not** contain the Daily Notes filename and does not change when the user customizes Daily Notes naming.

Obsidian's Daily Notes plugin separately provides:

- **Date format** — how the daily-note filename is generated;
- **New file location** — the base folder into which daily notes are placed.

With the default Daily Notes naming, a date such as `2026-09-18` normally corresponds to `2026-09-18.md` in the configured daily-note location. Users may customize the format, including using `/` in the date format to create nested folders.

The effective daily-note target is conceptually:

```text
<New file location>/<date rendered with Date format>.md
```

with empty components omitted.

## Fixture-specific Daily Notes configuration

This fixture intentionally uses a non-default configuration so an implementation cannot pass by merely appending `.md` to the ISO date:

```text
New file location: Daily
Date format: YYYY/MM/YYYYMMDD
```

Therefore:

```text
2026-09-18 -> Daily/2026/09/20260918.md
2026-09-19 -> Daily/2026/09/20260919.md
2026-09-20 -> Daily/2026/09/20260920.md   (does not exist)
2026-10-01 -> Daily/2026/10/20261001.md   (does not exist)
```

Assume the following Obsidian properties are configured as **Date** properties:

```text
date
review-date
follow-up-date
milestone-date
```

The first two resolve to real files. The last two deliberately do not.

### Expected date indexing

For each Date property, K-Plex should:

1. parse the ISO Date-property value as a date;
2. read the vault's Daily Notes **Date format** and **New file location**;
3. compute the effective target path;
4. store first-class graph evidence for that target even though the YAML contains no wikilink;
5. resolve to the real Markdown note when it exists;
6. otherwise create/retain an unresolved or virtual daily-note node;
7. preserve provenance such as `sourceKind: date-property` and the originating field name;
8. not synthesize physical folders merely because an unresolved target path contains `/` components.

Until K-Plex has a dedicated setting for the semantic role of Date properties, this fixture assumes date-derived links behave like ordinary inferred outgoing links:

```text
source note -> daily note = Child — INFERRED
reverse view              = Parent — INFERRED
```

A future setting could map date-derived links to Parent, Friend, Previous, etc. without requiring the vault to be reparsed if provenance is retained.

References:

- Obsidian Daily Notes: https://obsidian.md/help/plugins/daily-notes
- Obsidian Properties / Date: https://obsidian.md/help/properties#Date

---

# 4. Frontmatter, Bases, and legacy Dataview syntax

Current Obsidian Properties stores note properties in YAML frontmatter. Quoted wikilinks and lists of quoted wikilinks are used here for Bases/Properties-compatible internal-link metadata.

Examples:

```yaml
Parent: "[[Note B|B via YAML wikilink alias]]"

Children:
  - "[[Note C|C via YAML list wikilink alias]]"

tags:
  - person
  - fixture
```

Legacy Dataview syntax is retained because classic ExcaliBrain uses Dataview metadata and many existing vaults use these forms:

```markdown
Child:: [[Note C]]

Text before (Friend:: [[Note D]]) text after.

Text before [Challenger:: [[Note E]]] text after.
```

The fixture also tests multiple values inside one inline field:

```markdown
(Friend:: [[Note D]], [[Note X]]) but [[Note Y]] is outside the field.
```

Expected:

```text
Note D = Friend — DEFINED
Note X = Friend — DEFINED
Note Y = Child — INFERRED
```

`Note C` contains one deliberate legacy-only YAML value:

```yaml
Friend: "[D via frontmatter Markdown-link alias](Note%20D.md)"
```

Classic ExcaliBrain's Dataview value reader scans string-valued ontology fields for Markdown links. Current Obsidian Properties does not treat Markdown formatting in a property as a native internal-link value. This test therefore distinguishes **legacy ExcaliBrain compatibility** from **current Bases-native behavior**.

References:

- Obsidian Properties: https://obsidian.md/help/properties
- Obsidian Bases syntax: https://obsidian.md/help/bases/syntax
- Dataview — Adding Metadata: https://blacksmithgu.github.io/obsidian-dataview/annotation/add-metadata/
- Dataview — Data Types: https://blacksmithgu.github.io/obsidian-dataview/annotation/types-of-metadata/

---

# 5. Baseline whole-note indexing: Note A

In normal/indexed mode, all body relationships in `Note A.md` belong to **Note A**, regardless of heading boundaries. Heading-aware redistribution is only for the optional runtime expansion described later.

| Target | Source syntax | Expected relation from Note A | Source |
| --- | --- | --- | --- |
| **Note B** | YAML `Parent: "[[Note B\|...]]"` plus conflicting body `Child:: [[Note B]]` | **Parent — DEFINED** | frontmatter ontology wins; body conflict remains explainable |
| **Note C** | pre-heading `Child:: [alias](Note%20C.md)` | **Child — DEFINED** | Dataview full-line ontology + Markdown link |
| **Note H** | pre-heading ordinary `[[Note H\|...]]`, H links back | **Left Friend — INFERRED** | reciprocal ordinary links |
| **https://source.com/ontology-full-line** | pre-heading `source:: [alias](...)` | **Parent — DEFINED** | full-line ontology |
| **Note D** | `(Friend:: [[Note D\|...]], [[Note X\|...]])` | **Left Friend — DEFINED** | inline multi-value ontology |
| **Note X** | same Friend field | **Left Friend — DEFINED** | second value of same inline ontology |
| **Note Y** | ordinary link later in same sentence | **Child — INFERRED** | link outside Friend field |
| **Note E** | `[Challenger:: [[Note E\|...]]]` | **Right Friend / Challenger — DEFINED** | square-bracket inline ontology |
| **Note F** | ordinary `[alias](Note%20F.md)` | **Child — INFERRED** | one-way ordinary Markdown link |
| **Note G** | both `Parent::` and `Child::` | **Left Friend — DEFINED presentation** | conflicting explicit ontology |
| **https://source.com/ontology-inline** | `(source:: [alias](...))` | **Parent — DEFINED** | inline ontology |
| **https://source.com/inferred** | ordinary aliased URL | **Child — INFERRED** | ordinary external URL |
| **https://youtu.be/excalibrain-fixture-video** | image/embed URL | **Child — INFERRED** | ordinary external embed URL |

Expected whole-note semantic graph:

```text
Parents — DEFINED
  Note B
  Source URL full-line ontology alias
  Source URL inline ontology alias

Children
  Note C                               DEFINED
  Note F                               INFERRED
  Note Y                               INFERRED
  Source URL inferred alias            INFERRED
  https://youtu.be/excalibrain-fixture-video  INFERRED

Left Friends
  Note D                               DEFINED
  Note X                               DEFINED
  Note G                               DEFINED presentation of conflict
  Note H                               INFERRED reciprocal-link friend

Right Friends / Challengers
  Note E                               DEFINED
```

Aliases should not alter target identity. With alias rendering enabled:

```text
https://source.com/ontology-full-line -> Source URL full-line ontology alias
https://source.com/ontology-inline    -> Source URL inline ontology alias
https://source.com/inferred           -> Source URL inferred alias
```

---

# 6. Conflict and inference fixtures

## A ↔ G: conflicting explicit ontology

`Note A` contains both:

```markdown
Parent:: [[Note G|G declared as parent]]
Child:: [G declared as child](Note%20G.md)
```

Classic ExcaliBrain accumulates both defined role categories and resolves the visible pair laterally.

Expected:

```text
A ↔ G = Left Friend / Friend — DEFINED presentation
```

It should not be rendered simultaneously as both Parent and Child.

## A → F: one-way ordinary link

Expected:

```text
A sees F as Child — INFERRED
F sees A as Parent — INFERRED
```

## A ↔ H: reciprocal ordinary links

A links to H before the first heading. H links back to A.

Expected:

```text
A sees H as Left Friend — INFERRED
H sees A as Left Friend — INFERRED
```

---


# 7. K-Plex frontmatter precedence

## X → Y: deliberate deviation from ExcaliBrain

`Note X` deliberately contains both:

```yaml
Parent: "[[Note Y|Y via frontmatter precedence]]"
```

and, in the Markdown body:

```markdown
Child:: [[Note Y|Y deliberately conflicting body child]]
```

K-Plex intentionally deviates from classic ExcaliBrain here. Expected K-Plex result:

```text
X sees Y as Parent — DEFINED
frontmatter Parent evidence = USED
body Child evidence         = OVERRIDDEN (retained for explainability)
ordinary link evidence      = retained
```

The precedence rule applies at resolution time for the same declaring note and target. The body declaration must remain in the evidence store so **Explain relationship** can show why it lost. Body-field evidence should also retain line and source-range offsets so later source-aware editing and central-section expansion can reuse the same provenance without changing the persistent index model.

---

# 8. Note type and tag metadata

The fixture tests three note-type forms:

```text
Note A: Dataview body field     Note Type:: #project
Note B: YAML with hashtag       Note type: "#person"
Note C: YAML without hashtag    Note type: "project"
```

Expected K-Plex normalization:

```text
"#project" and "project" -> same logical note type
"#person"  and "person"  -> same logical note type
```

A hashtag inside an ordinary text property is not itself what makes the value an Obsidian tag. When a note type is intended to behave as an Obsidian tag, the corresponding tag should also be present in the special `tags:` property or in body tag syntax.

`Note A` deliberately includes body tags:

```markdown
#project #body-tag #taxonomy/body/leaf
```

`Note D` deliberately includes a hierarchical frontmatter tag:

```yaml
tags:
  - fixture
  - taxonomy/frontmatter/leaf
```

These are used by the tag-tree tests below.

---

# 9. Tag indexing

Classic ExcaliBrain represents tags as graph nodes with paths such as:

```text
tag:fixture
tag:taxonomy
tag:taxonomy/body
tag:taxonomy/body/leaf
tag:taxonomy/frontmatter
tag:taxonomy/frontmatter/leaf
```

Nested tags create a defined `tag-tree` hierarchy. A note is a defined child of each **explicit exact tag** attached to that note; the tag hierarchy itself provides the connection through parent tag prefixes.

## Required flat-tag cases

Examples already present in the fixture include:

```text
#fixture
#project
#person
#body-tag
#daily-note
```

Expected examples:

```text
tag:body-tag
  Child — DEFINED: Note A

tag:project
  Child — DEFINED: Note A     (body #project)
  Child — DEFINED: Note C     (frontmatter tags: project)

tag:person
  Child — DEFINED: Note B
```

Most fixture notes also carry the exact `fixture` tag, so `tag:fixture` should have multiple file children. Tests need not assert the complete child count if additional fixture notes are later added; they should assert at least several known members such as A, B, C, and D.

## Hierarchical body tag

`Note A` contains:

```markdown
#taxonomy/body/leaf
```

Expected tag-tree structure:

```text
tag:taxonomy
  └─ tag:taxonomy/body
      └─ tag:taxonomy/body/leaf
          └─ Note A
```

All tree relations are **DEFINED** with source/type `tag-tree`.

## Hierarchical frontmatter tag

`Note D` contains:

```yaml
tags:
  - taxonomy/frontmatter/leaf
```

Expected:

```text
tag:taxonomy
  └─ tag:taxonomy/frontmatter
      └─ tag:taxonomy/frontmatter/leaf
          └─ Note D
```

`tag:taxonomy` is shared by both branches.

### Important assertion

A hierarchical tag should not be flattened into unrelated strings. The index should preserve both:

1. the full exact tag assigned to the note; and
2. the prefix tag hierarchy used for navigation.

`showFullTagName` may change the displayed label of a tag node but not its canonical graph identity.

---

# 10. Folder indexing

Classic ExcaliBrain represents the vault's physical file tree as graph nodes:

```text
folder:/
folder:Daily
folder:Daily/2026
folder:Daily/2026/09
```

The fixture already contains a useful nested folder hierarchy because of its Daily Notes files.

Expected defined `file-tree` relationships:

```text
folder:/
  └─ folder:Daily
      └─ folder:Daily/2026
          └─ folder:Daily/2026/09
              ├─ Daily/2026/09/20260918.md
              └─ Daily/2026/09/20260919.md
```

Additionally, Markdown notes stored at the vault root are direct defined children of `folder:/`, for example:

```text
folder:/
  ├─ Note A.md
  ├─ Note B.md
  ├─ Note C.md
  └─ ...
```

Required assertions:

1. every real folder in the vault has exactly one canonical folder node;
2. nested folders are linked parent/child with **DEFINED** `file-tree` relationships;
3. every real file is a child of its containing physical folder;
4. root-level files are children of `folder:/`;
5. unresolved/virtual daily-note targets such as `Daily/2026/10/20261001.md` do **not** require creation of synthetic physical folder nodes such as `folder:Daily/2026/10` unless K-Plex deliberately introduces a separate virtual-folder concept;
6. renaming/moving a file or folder should eventually update these canonical paths rather than leaving duplicate stale folder/file nodes.

Folder indexing is structural and independent of Markdown heading-section expansion.

---

# 11. Resolved and placeholder Date-property links

## Existing daily-note targets

`Note B` contains:

```yaml
date: 2026-09-18
review-date: 2026-09-19
```

Expected targets:

```text
Daily/2026/09/20260918.md
Daily/2026/09/20260919.md
```

Both files exist.

Baseline expected semantic relationship:

```text
Note B -> each daily note = Child — INFERRED
Daily note -> Note B      = Parent — INFERRED
```

## Placeholder date in existing folder

`Note B` also contains:

```yaml
follow-up-date: 2026-09-20
```

Computed target:

```text
Daily/2026/09/20260920.md
```

No such file exists.

Expected:

```text
virtual/unresolved daily-note node exists
Note B -> virtual target = Child — INFERRED
provenance identifies follow-up-date / date-property
```

This case verifies unresolved-date handling when the containing physical folder does exist.

## Placeholder date in nonexistent month folder

`Note C` contains:

```yaml
milestone-date: 2026-10-01
```

Computed target:

```text
Daily/2026/10/20261001.md
```

Neither the file nor `Daily/2026/10` physical folder exists.

Expected:

```text
virtual/unresolved daily-note target exists
Note C -> virtual target = Child — INFERRED
no physical folder:Daily/2026/10 is required
```

This distinguishes virtual-note resolution from physical folder-tree indexing.

---

# 12. External URL indexing

The fixture includes four URL patterns.

## Full-line ontology with alias

```markdown
source:: [Source URL full-line ontology alias](https://source.com/ontology-full-line)
```

Because `source` is a Parent field:

```text
Note A -> exact URL = Parent — DEFINED
alias = Source URL full-line ontology alias
```

## Parenthesized inline ontology with alias

```markdown
(source:: [Source URL inline ontology alias](https://source.com/ontology-inline))
```

Expected:

```text
Note A -> exact URL = Parent — DEFINED
alias = Source URL inline ontology alias
```

## Ordinary aliased URL

```markdown
[Source URL inferred alias](https://source.com/inferred)
```

Expected:

```text
Note A -> exact URL = Child — INFERRED
alias = Source URL inferred alias
```

## Embed URL

```markdown
![](https://youtu.be/excalibrain-fixture-video)
```

Expected:

```text
Note A -> exact URL = Child — INFERRED
```

`Note B` also has a raw URL in a YAML ontology property:

```yaml
source: "https://source.com/frontmatter"
```

Expected:

```text
Note B -> https://source.com/frontmatter = Parent — DEFINED
```

Classic ExcaliBrain also creates origin URL nodes such as `https://source.com` and `https://youtu.be`. Origin-node behavior is secondary in this fixture; the primary assertions are exact URL identity, role, and alias.

---

# 13. Future enhancement fixture: expand the central Markdown note into heading sections

This section describes a **planned K-Plex enhancement**, not a requirement for global vault indexing.

## Design constraint

No section-by-section global index is required.

The normal index should continue treating a Markdown file as one note. Only when the user explicitly expands the **current central Markdown note** should K-Plex read that note's current Markdown text, split it into heading sections, and create transient section nodes for the expanded view.

Only the central node is eligible for this expanded internal-document view, and only when the central node represents a Markdown file.

Folder nodes, tag nodes, URL nodes, unresolved nodes, attachments, and non-central Markdown notes are not eligible for section expansion.

## Relationship ownership while collapsed

When `Note A` is not expanded, its relationships are exactly the whole-note relationships documented in section 5. Heading boundaries do not affect the persistent/global graph.

## Relationship ownership while expanded

When `Note A` is expanded:

- YAML/frontmatter relationships remain attached to the central Note A node;
- body relationship evidence appearing **before the first Markdown heading** remains attached to the central Note A node;
- each heading section becomes a transient child node of Note A;
- relationship evidence found inside a section is rendered from that section's own gates rather than Note A's gates;
- inbound relationships from other vault notes still target the real Note A file unless there is a future explicit heading/block-link feature;
- structural file-folder and note-tag relationships remain attached to the real Note A file node and are not redistributed to sections;
- collapsing the note discards the transient section nodes and restores the ordinary whole-note presentation without reindexing the vault.

The fixture deliberately puts meaningful relationship cases both before and after the first heading to make this behavior testable.

## `Note A` pre-heading region

Everything from the end of YAML through the line immediately before:

```markdown
## Friend and challenger cases
```

belongs to the central node in expanded mode.

Expected **semantic** central-node gates from content/frontmatter:

```text
Parents
  Note B                                   DEFINED   YAML Parent
  https://source.com/ontology-full-line   DEFINED   pre-heading source::

Children
  Note C                                   DEFINED   pre-heading Child::

Left Friends
  Note H                                   INFERRED  pre-heading ordinary reciprocal link
```

In addition, the central node has three transient structural child section nodes:

```text
Friend and challenger cases
Inference and conflict cases
External URL cases
```

These section-node child relationships are runtime structure for the expanded document view, not persistent vault ontology.

## Section: `Friend and challenger cases`

Source content:

```markdown
(Friend:: [[Note D]], [[Note X]]) ... [[Note Y]] ...
[Challenger:: [[Note E]]]
```

Expected section gates:

```text
Left Friends
  Note D   DEFINED
  Note X   DEFINED

Children
  Note Y   INFERRED

Right Friends / Challengers
  Note E   DEFINED
```

Those four targets should no longer be shown on the **central Note A semantic gates** while the section-expanded view is active; they are shown on the section node's gates.

## Section: `Inference and conflict cases`

Expected section gates:

```text
Children
  Note F   INFERRED

Left Friends
  Note G   DEFINED presentation of explicit Parent + Child conflict
```

Again, these are section relationships only while expanded.

## Section: `External URL cases`

Expected section gates:

```text
Parents
  https://source.com/ontology-inline   DEFINED

Children
  https://source.com/inferred          INFERRED
  https://youtu.be/excalibrain-fixture-video  INFERRED
```

URL aliases remain available on the section-level relationship exactly as they are in whole-note mode.

## Parsing boundary

`Note A.md` keeps the original three same-level headings for the redistribution cases above. `Section Tree.md` adds a dedicated nested-heading fixture that verifies runtime outline semantics without changing the persistent index.

The runtime parser must preserve Markdown heading hierarchy by heading level. For example:

```text
# Root One
  ## Child A
    ### Grandchild
  ## Child B
# Root Two
```

The expanded view initially exposes the full outline. Folding `Root One` hides `Child A`, `Grandchild` and `Child B`; semantic relationships declared in those hidden descendants are projected onto visible `Root One` for display, while explanation provenance still identifies the original hidden section. Folding is view state only and must never create or mutate persistent graph pages.

## Suggested transient section identity

The exact runtime ID is implementation-specific. Tests should identify a section by at least:

```text
central file path + heading text + source range/heading occurrence
```

rather than assuming the heading text alone is globally unique.

Example conceptual identity:

```text
Note A.md :: Friend and challenger cases :: <source range>
```

Do not add these transient section nodes to the persistent global page index.

---

# 14. Suggested automated assertions

A robust test should assert role, relation type, target identity, provenance, and alias where relevant.

## Whole-note Note A

At minimum:

```json
{
  "parents": [
    { "path": "Note B.md", "type": "defined" },
    { "url": "https://source.com/ontology-full-line", "type": "defined", "alias": "Source URL full-line ontology alias" },
    { "url": "https://source.com/ontology-inline", "type": "defined", "alias": "Source URL inline ontology alias" }
  ],
  "children": [
    { "path": "Note C.md", "type": "defined" },
    { "path": "Note F.md", "type": "inferred" },
    { "path": "Note Y.md", "type": "inferred" },
    { "url": "https://source.com/inferred", "type": "inferred", "alias": "Source URL inferred alias" },
    { "url": "https://youtu.be/excalibrain-fixture-video", "type": "inferred" }
  ],
  "leftFriends": [
    { "path": "Note D.md", "type": "defined" },
    { "path": "Note X.md", "type": "defined" },
    { "path": "Note G.md", "type": "defined" },
    { "path": "Note H.md", "type": "inferred" }
  ],
  "rightFriends": [
    { "path": "Note E.md", "type": "defined" }
  ]
}
```

## Additional parser/index assertions

1. `Note A`'s `Note Type:: #project` is discovered.
2. `Note B`'s YAML `Note type: "#person"` is discovered.
3. `Note C`'s YAML `Note type: "project"` normalizes to the same logical form as `#project`.
4. frontmatter `tags:` and body `#tags` both reach the tag index.
5. hierarchical body and frontmatter tags create prefix tag-tree nodes.
6. aliases do not change internal-link or URL target identity.
7. `%20` in Markdown-link destinations resolves correctly.
8. parenthesized and square-bracket fields parse correctly mid-sentence.
9. multiple values inside one inline ontology field are all captured.
10. `Note Y` remains outside the preceding Friend field.
11. conflicting A ↔ G explicit roles resolve to one lateral/friend presentation.
12. reciprocal ordinary A ↔ H links resolve to inferred friend.
13. Previous and Next create opposite reverse roles.
14. Hidden evidence is indexed but filtered from Note F's normal visible neighbourhood.
15. the legacy YAML Markdown-link field C → D is either supported intentionally or reported explicitly as unsupported; it must not silently change role.

### K-Plex precedence assertions

P1. X → Y resolves as Parent — DEFINED because conflicting frontmatter ontology takes precedence over body ontology from the same declaring note and target.
P2. X → Y explainability retains the overridden body Child evidence, the active frontmatter Parent evidence, and the ordinary-link evidence.

## Date assertions

16. `2026-09-18` resolves to `Daily/2026/09/20260918.md`.
17. `2026-09-19` resolves to `Daily/2026/09/20260919.md`.
18. `2026-09-20` resolves to a virtual `Daily/2026/09/20260920.md` target.
19. `2026-10-01` resolves to a virtual `Daily/2026/10/20261001.md` target.
20. raw ISO date values are not treated as filenames directly.
21. date-derived edges retain date-property provenance and originating field name.
22. the missing October target does not force creation of a physical `folder:Daily/2026/10` node.

## Folder assertions

23. `folder:/ -> folder:Daily` is a DEFINED file-tree relationship.
24. `folder:Daily -> folder:Daily/2026` is DEFINED.
25. `folder:Daily/2026 -> folder:Daily/2026/09` is DEFINED.
26. both existing daily-note files are children of `folder:Daily/2026/09`.
27. root-level notes such as `Note A.md` are children of `folder:/`.

## Tag assertions

28. `tag:body-tag -> Note A` is DEFINED.
29. `tag:project` includes Note A and Note C as file children.
30. `tag:person -> Note B` is DEFINED.
31. `tag:taxonomy -> tag:taxonomy/body -> tag:taxonomy/body/leaf -> Note A` is preserved.
32. `tag:taxonomy -> tag:taxonomy/frontmatter -> tag:taxonomy/frontmatter/leaf -> Note D` is preserved.
33. canonical tag identity is independent of `showFullTagName` display formatting.

## Expanded-central-note assertions

These section-expansion assertions are part of the automated K-Plex feature baseline. The persistent/global index remains note-level; assertions 34–42 exercise only the runtime central-note expansion layer. The indexing/explainability suite now covers assertions 1–42 plus P1–P2.

34. expanding a non-Markdown or non-central node is unavailable/no-op.
35. expanding Note A creates exactly three transient section nodes for this fixture.
36. section nodes are runtime-only and do not enter the persistent global page index.
37. frontmatter and pre-heading B/C/H/full-line-source relationships stay on Note A.
38. D/X/Y/E move to the `Friend and challenger cases` section gates.
39. F/G move to the `Inference and conflict cases` section gates.
40. inline-source/inferred-URL/YouTube move to the `External URL cases` section gates.
41. folder and tag relationships remain attached to the real Note A file node.
42. collapsing Note A removes transient section nodes and restores the whole-note relationship presentation without rebuilding the vault index.

## Nested outline / folding assertions

43. expanding `Section Tree.md` produces five transient sections and no persistent section pages.
44. `Root One` and `Root Two` are outline roots.
45. `Child A` and `Child B` are direct children of `Root One`.
46. `Grandchild` is a child of `Child A`.
47. parent/child IDs are stable within the transient expansion result and reflect Markdown heading levels.
48. with all expandable sections unfolded, all five section nodes are visible.
49. folding `Root One` leaves only `Root One` and `Root Two` visible in that subtree/root set.
50. semantic relationships from hidden descendants are projected to the folded ancestor for rendering, while the edge retains the hidden section as its explainability source.

---

# 15. Expected reverse/secondary relationships summary

```text
Note B
  Child: Note A                                  DEFINED
  Child: Note C                                  DEFINED
  Parent: https://source.com/frontmatter        DEFINED
  Child: Daily/2026/09/20260918.md              INFERRED date-property
  Child: Daily/2026/09/20260919.md              INFERRED date-property
  Child: Daily/2026/09/20260920.md (virtual)    INFERRED date-property

Note C
  Parent: Note A                                 DEFINED
  Parent: Note B                                 DEFINED
  Friend: Note D                                 DEFINED legacy YAML Markdown link
  Child: Daily/2026/10/20261001.md (virtual)     INFERRED date-property

Note D
  Friend: Note A                                 DEFINED
  Friend: Note C                                 DEFINED
  Next: Note F                                   DEFINED

Note E
  Challenger/right friend: Note A                DEFINED
  Previous: Note F                               DEFINED

Note F
  Parent: Note A                                 INFERRED
  Previous: Note D                               DEFINED
  Next: Note E                                   DEFINED
  Hidden: Note X                                 indexed/source-side hidden

Note G
  Friend: Note A                                 DEFINED presentation of conflict

Note H
  Friend: Note A                                 INFERRED

Note X
  Friend: Note A                                 DEFINED

Note Y
  Parent: Note A                                 INFERRED
```

This summary describes the ordinary whole-note index. The optional expanded-central-note view temporarily redistributes only **Note A's outgoing body evidence after the first heading** to transient section nodes as described above.

## Cache / incremental-update assertions

51. a persisted semantic page snapshot includes resolved neighbour data and can restore the relationship presentation without replaying the full relationship classifier.
52. the restored Note A → Note B relationship remains Parent — DEFINED after fast neighbour hydration.
53. patching a single changed Markdown file through the runtime incremental path preserves the expected relationship semantics without rebuilding the vault.
54. one original relationship declaration is stored once in memory while both directional perspectives remain queryable; K-Plex must not retain duplicate forward/reverse evidence objects merely for convenience.


### 2026-10-06 explicit layout expectation

The scene baseline updates only the horizontal positions of friends, challengers and siblings for the maintainer-requested parent-area-driven density policy. Parent/child/center coordinates and every semantic page, declaration, neighborhood, edge, style and search result remain unchanged. The default H2 side anchors are now ±392.775 and the sibling anchor 665.775; dedicated density tests separately verify H3 touching, H4 overlap, parent1–3 and child-independent horizontal placement.
