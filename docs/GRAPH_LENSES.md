# Views and lenses

Graph Lenses let you define reusable filters and styles for the **currently visible K-Plex canvas**. A lens can show, hide or style matching notes and relationships without changing your notes or turning K-Plex into a deep whole-vault graph query tool.

If you only need a temporary title/tag/type filter, use **Quick Filter**. Use a Graph Lens when you want a reusable rule, relationship-aware filtering, evidence-aware filtering, or visual styling.

## Open the lens panel

Select **Views and lenses** (the funnel button) in the K-Plex toolbar.

**Canvas view** selects the view of the canvas that opened this panel. Compass is currently the only available view, so the dropdown is disabled. Each canvas keeps its own choice. View selection is separate from saved lenses and does not change their filters or enabled state.

A view that cannot retain an open node editor is unavailable until that editor is closed; a rejected choice leaves the current view selected.

The panel contains:

- **Canvas view** for this canvas’s view;
- **Quick Filter** for temporary keyword/tag/note-type filtering;
- **Keep layout / Reflow** presentation choice;
- **Graph Lenses** for saved reusable rules.

Click **+** beside Graph Lenses to create a new lens.

## Create a lens

A lens has four main choices:

1. **Name** — a human-readable name such as `Working-on`.
2. **Scope** — what kind of graph item the rule evaluates.
3. **Effect** — what happens when something matches.
4. **Conditions** — the field/operator/value rules that define a match.

The normal editor is **Simple** mode, inspired by the Obsidian Bases filter builder. You do not need to write query syntax.

## Scope

### Note

Use Note scope when the thing you care about is a note or other visible node.

Typical uses:

- notes with a particular tag;
- notes with a particular Note type;
- notes inside a folder;
- notes whose property has a given value;
- notes matching a path or title condition.

### Relationship

Use Relationship scope when the thing you care about is the resolved connection between two visible nodes.

Typical uses:

- Parent, Child, Friend or Challenger connections;
- custom ontology/relationship properties such as `working-on`;
- inferred versus explicitly defined relationships.

For example, to show only relationships created with the `working-on` property:

**Relationship → Show matching → Relationship property → is → working-on**

### Evidence

Use Evidence scope when you care about the specific source that caused a relationship to exist.

This is useful when the same two notes may be related for more than one reason.

Examples:

- relationships declared through `activity-context-for`;
- relationships coming specifically from body ontology;
- relationships coming from frontmatter;
- relationships whose declaration points to the current center note.

Evidence-aware lenses are one of the main differences between Graph Lenses and a normal file filter: they can distinguish *why* a connector exists, not only which two notes are connected.

## Effects

### Show matching

Keeps matching items visible and filters out nonmatches.

If more than one Show lens is active, their matches are combined: an item can survive by matching any active Show lens.

### Hide matching

Removes matching items from the visible canvas.

Hide lenses subtract from whatever would otherwise be visible.

### Style matching

Does not hide anything. It changes the appearance of matching items.

Depending on the scope, style lenses can change things such as:

- node fill;
- node border;
- node text;
- connector color;
- connector width;
- solid/dashed line style;
- relationship label color/visibility.

Multiple style lenses can apply at the same time. If two active style lenses change the same appearance property, the later lens takes precedence for that property.

## Turn lenses on and off

Each saved lens has an **eye** control.

- open eye = active;
- crossed-out eye = off.

Turning a lens off keeps the definition but stops applying it. You do not need to delete a lens just because you temporarily do not want it.

Use **Turn all off** when you want to return quickly to the unfiltered canvas while keeping your saved lenses.

## Keep layout versus Reflow

Filtering can be displayed in two ways.

### Keep layout

Hidden items disappear, but surviving nodes keep their original positions.

Use this when spatial context matters and you want to see where the surviving nodes belong within the original canvas.

### Reflow

K-Plex lays out the surviving relationships as though they were the only items in the canvas.

Use this when a large graph has been reduced to a focused subset and you want a compact working view.

Both modes show the same filtered result. Only the presentation changes.

## Gate counts while filtering

When a visibility filter is active, gate counts can use **shown/total** notation.

For example:

`2/12`

means two relationships through that gate are currently shown out of twelve total relationships.

This keeps hidden structure visible as context even when the graph itself has been filtered down.

## Combining conditions

Simple mode can combine conditions with **all** or **any** logic.

Use **all** when every condition must match. For example:

- Note has tag `project`
- Note property `Status` is `Active`

Use **any** when matching any one of the conditions is enough.

## Suggestions

Where K-Plex knows the available values, the Simple builder offers suggestions instead of requiring exact typing. This is particularly useful for:

- relationship properties;
- tags;
- Note types;
- known note-property names;
- finite relationship/evidence categories.

## Code mode

Simple mode is the recommended interface. **Code** mode is available for advanced expressions that are awkward to build visually.

Code mode uses a safe, declarative, Bases-inspired expression language. It does **not** execute JavaScript.

Examples include:

```text
file.hasTag("meeting")
```

```text
note["Status"] == "Active"
```

```text
edge.definition.equals("working-on")
```

```text
evidence.fieldName == "activity-context-for"
```

Use Code mode only when you need it. The common cases should be expressible in Simple mode.

## Example lenses

### Highlight all `working-on` relationships

- Scope: **Relationship**
- Effect: **Style matching**
- Relationship property: **is** `working-on`
- Choose a connector color/width/style

### Show only project notes

- Scope: **Note**
- Effect: **Show matching**
- Tag: **has** `project`

### Hide archived notes

- Scope: **Note**
- Effect: **Hide matching**
- Property: `Status`
- Operator: **is**
- Value: `Archived`

### Show relationships declared through one ontology field

- Scope: **Evidence**
- Effect: **Show matching**
- Evidence field: **is** `activity-context-for`

## Quick Filter and Graph Lenses together

Quick Filter remains a temporary local filter. Active Graph Lenses are then applied as reusable rules.

A common workflow is:

1. enable one or more lenses to define the perspective;
2. use Quick Filter for a temporary keyword/tag/type refinement;
3. choose Keep layout or Reflow depending on whether you want context or compactness.

## Troubleshooting

### The lens hides everything

Check that the scope matches what you are trying to filter.

For example, `working-on` is usually a **Relationship property**, not a Parent/Friend/etc. relationship role. In Simple mode choose:

**Relationship → Relationship property → is → working-on**

### I want the lens saved but not active

Use the eye control instead of deleting it.

### I want to see the remaining nodes more compactly

Turn on **Reflow**.

### I want to know whether hidden connections still exist

Look at the gate count. While a visibility filter is active it can show **shown/total**.

### I only need a quick title/tag filter

Use Quick Filter rather than creating a persistent lens.
