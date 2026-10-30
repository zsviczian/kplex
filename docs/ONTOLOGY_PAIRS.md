# Paired ontology fields

Configure fields and pairs under **Settings → K-Plex → Ontology → Manage ontology**. A pair gives a connection a natural label from either endpoint while notes keep ordinary property names.

Fresh installations pair the built-in inverse fields: Parent/Child, Parents/Children, up/down, u/d, North/South, Previous/Next, West/East, w/e and Before/After. Other aliases remain independent. Existing saved configurations and ExcaliBrain imports retain their assignments.

For example, select **Add field**, enter `replies to`, choose **Previous**, and enter `replied by` in **Pair with**. Select **Create “replied by” as paired field** from the suggestions, or enable **Create paired field**. The preview shows `replies to` as Previous and `replied by` as Next; Save creates both assignments together. To pair existing fields, choose an eligible property from the suggestions. You can create a new partner for an existing field in the same way, without first adding that property to a note.

In **Add connection ontology** or **Specify connection ontology**, select **Create ontology…** in **Note property** to define a field without leaving the connection workflow. The field editor keeps the connection's relationship role and also lets you choose or create a reciprocal partner. Save selects the new field in the connection dialog; confirm that dialog separately to add the property to the note. Cancelling the field editor keeps the previous selection. Saving a vocabulary definition alone does not edit notes.

The manager shows each pair once. **Show** filters by direction or state while keeping both names visible, with the selected direction first. Search matches either field name. Friend/Friend and Challenger/Challenger pairs are supported. **Unassigned** contains discovered metadata that has no ontology assignment; **Excluded metadata** and **Hidden** are separate assignments. Discovery can be incomplete. **Rescan discovered fields** explicitly scans for more metadata and can take time in a large vault; opening or searching the manager does not rescan.

Either note can declare the relationship. In Note B:

```markdown
replies to:: [[Note A]]
```

Or in its YAML properties:

```yaml
---
replies to: "[[Note A]]"
---
```

Alternatively, Note A can contain `replied by:: [[Note B]]`, or the same `replied by` key in YAML. You need only one declaration. K-Plex never automatically writes a matching property in the other note. If you write both, both remain evidence even though the connector wording appears once.

From Note B the connection reads **replies to**; from Note A it reads **replied by**. Enable relationship labels in **Visual styling → Link styling** or the relevant relationship style to display them. Captions do not rename properties: connection details, edits, unlinking, exact-field filters and field styles still use the original declaring field.

| Field direction | Partner direction |
| --- | --- |
| Parent | Child |
| Child | Parent |
| Previous | Next |
| Next | Previous |
| Friend | Friend |
| Challenger | Challenger |

Hidden and Excluded fields cannot form pairs. A field can have only one partner. Self-pairs, chains, reversed duplicates and conflicting roles are rejected. Invalid form changes stay local, with feedback; the last valid saved configuration remains active.

Manager rows and Markdown's **Add/change ontology** action open the same editor. Existing property names are read-only: changing a vocabulary assignment never renames properties in notes. For an existing pair, choose which field to edit. Changing its direction previews both old and new assignments and requires **Save both directions**. Use **Clear pairing** before moving only one endpoint, or before choosing Hidden/Excluded. Clearing or replacing a pair keeps the former partner as an ordinary assignment. Cancel leaves configuration unchanged.

Use **Description** to explain a field's meaning and when to use it. Descriptions are optional plain text, up to 1,000 characters. **Paired field description** has independent wording for the inverse property, including when creating both fields together. Save applies both descriptions with the assignments; Cancel discards the draft. Clear a description and save to remove only that wording. Changing or clearing a pair retains the descriptions of fields that remain configured.

The manager and ontology suggestions show descriptions alongside the physical field names and inverse roles. Long descriptions are shortened visually while their full text remains available to assistive technology. Descriptions do not alter field selection, relationship meaning, note contents or indexing.

**Remove assignment…** names the selected field and requires confirmation. It removes only that vocabulary assignment, retaining the other endpoint's assignment and all note properties. If the field is present in the discovered inventory, it can appear as Unassigned again. Removing an assignment can change how the graph interprets existing properties.

Markdown ontology suggestions and the related-note composer show the physical field prominently, with its partner underneath. Both fields remain independently selectable, including same-role pairs. Search can match the partner; direct-name matches come first and partner-only matches are marked. Selecting a suggestion inserts or writes only its primary physical field, never the pair's display text.

In a field editor, select **Show documents** to inspect documents that use that physical property, including unassigned properties. Filter by words in the filename or folder path. **Copy as Markdown** copies every filtered result as a bulleted list of note links, including results beyond **Show more**. Each row has separate actions to open the document in K-Plex or in a new Obsidian tab. Inspecting uses does not save your ontology draft.

This list reads existing indexed field names only; it does not scan or parse notes. It can be incomplete during indexing, when a source has changed, or when cached data is unavailable. Select **Refresh** to check the currently indexed results again. A paired field has its own list: reciprocal wording does not mean that both properties are authored in a document.

While cleaning up properties, use **Refresh counts** in **Manage ontology** to recount indexed documents for all fields matching the current role filter and search, including entries beyond **Show more**. An unassigned field is hidden when the lookup returns zero matches, even if coverage is incomplete. Assigned fields remain visible at zero. A lookup that throws an error leaves the field visible without inventing a zero count. Visible partial counts are marked as incomplete. Checked counts are labelled as document counts, distinct from historical discovery occurrences.

Refreshing **Show documents** also shares that field's count with the open manager. Counts are checked only on these explicit actions; opening the manager, typing and ordinary graph updates do not start a recount. These display-only results last for the open manager session and do not change configuration or the discovery index. Reopen **Manage ontology** and use **Refresh counts** again for a new cleanup session.

Ordinary unpaired entries continue to work. Enter literal slashes and backslashes normally in the editor; K-Plex escapes its internal settings representation. Existing list ordering and defaults are retained. Notes always use ordinary physical property names.

Existing K-Plex settings and ExcaliBrain imports preserve literal slash/backslash names through a versioned, lossless settings migration. They are never guessed to be pairs. The syntax version and escaped representation are saved through normal settings persistence; no notes or source grammar are changed.

Pairing fields that already have compatible assignments changes presentation without reindexing. Adding a newly recognized field or changing an assignment's direction retains the normal indexing update.
