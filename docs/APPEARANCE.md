# Colors and appearance

A fresh K-Plex installation follows Obsidian’s theme. Open **Settings → K-Plex → Visual styling → Colors** to change colors. No companion plugin is required.

## Save named K-Plex themes

Open **Settings → K-Plex → Visual styling**. Select a theme from **Theme** to apply it. Color and style changes are saved to that theme, including changes made from a graph’s background menu or lens editor.

**Manage themes** opens the same searchable manager used for node and link styles. Open a row to preview, rename or delete it; opening a row does not activate it. **Create theme** starts with **Copy current theme**, which identifies the source, or **Start from defaults**. Copies are independent. Search and **Show more** keep large libraries manageable.

Each theme keeps two sections:

| Section | Saved appearance |
| --- | --- |
| Base styling | Canvas color and complete standard node/link styles, including their native or legacy baseline. |
| Semantic styling | Custom property/tag/link styles, tag priority, named Light/Dark pairs, semantic assignments, directional tint and lens colors. |

Ontology, label sources, device typography profiles, layout/navigation, image permissions and lens expressions, enabled state, order and non-color lens styling stay shared. Switching themes changes colors only on existing lenses; it never recreates a deleted lens.

A fresh installation starts with **Default theme**. This theme follows Obsidian’s live native colors and cannot be renamed, deleted or reset. The first saved appearance change creates and selects **Custom theme**. Opening, cancelling or saving unchanged creates nothing.

Existing appearances are saved once as **User theme**, selected initially. **Default base + my semantic colors** keeps an independent copy of the semantic styling and restores native base colors. **Default theme** supplies factory base styling and built-in semantic defaults. Successful first-run ExcaliBrain import receives the same User-theme protection. The migration message can be dismissed.

Deleting the active theme asks for confirmation and switches to **Default theme** in the same save. Failed storage leaves the theme and selection intact. Deleting another theme preserves the active appearance.

An editor belongs to the theme that opened it. After switching themes, an old draft remains read-only for **Discard draft**, including after switching back. A Save already accepted ahead of the switch finishes in order.

## Reset selected theme colors

Select **Reset colors** beside the theme dropdown. Review the affected colors and Light/Dark preview, then confirm:

| Scope | Result |
| --- | --- |
| Base colors only | Restore native canvas and standard node/link colors. Keep custom semantic styling. This is the default choice. |
| Semantic colors only | Clear color overrides in custom rules, semantic assignments, directional tint and lenses. Keep base assignments. |
| All colors | Apply both resets. |

Resets preserve rule names, matching keys, tag order, icons, fonts, sizes, shapes, line styles and other non-color fields. Directional tint keeps its enabled state and intensity. Named palette entries and other saved themes are kept. Use **Named colors** for explicit palette deletion and replacement.

Custom rules may still override base colors after a base-only reset. A base field that follows a semantic color retains that reference; resetting its semantic assignment can change the resulting color. Defaults remain live references rather than sampled copies of today’s colors.

## Choose a color source

Canvas, standard styles, custom node/link styles, style lenses, semantic colors and directional tint share these choices:

| Source | Behavior |
| --- | --- |
| **Default** | Inherit the next applicable style or native theme color. |
| **Fixed color** | Keep one literal color in both modes. RGB, opacity and hex/RGB(A) text can be edited independently. |
| **Named color** | Follow a saved pair’s Light or Dark variant. |
| **Theme color** | Follow an Obsidian or custom CSS color variable, such as `--interactive-accent`. Names are case-sensitive. |

Zero opacity is transparent. It is different from **Default**. Changing RGB preserves the current alpha; opening an editor does not convert a reference to a fixed color. Unsupported old literals remain intact until you deliberately replace them.

Theme and named-color choices open a searchable list with small Light/Dark swatches. Search for a variable name, or choose **Custom variable** to enter another CSS color variable. Your current custom variable also appears in the list with its preview. A question mark means that color could not be resolved in the preview. Choosing a swatch keeps the variable or named-color reference.

In a style, lens or tint editor, **Use color** updates its local draft. Select **Save** in the containing editor to keep the change. **Cancel** discards that draft. Opening, cancelling and saving an unchanged color make no settings write.

Custom node styles support **Border width**, **Gate radius** and **Font size** sliders with visible values, in pixels. Use the adjacent reset icon to inherit the base value. Zero border width hides the border. These fields are saved with the selected theme alongside the style’s colors and icon. Link style editors use the same controls for line width and label size. In the relationship-style manager, select **All relationship fields**, then search for the field you want to configure.

## Tag and Note Type links

Ordinary tag links use **Colors → Standard colors → Tag link**. A tag that is also
the note's selected **Note Type** inherits that link style with twice its line
width. Customize this separately under **Link styling → Note Type tag links**;
the existing link editor supports colors, width, line style, arrowheads and labels.
**Reset** restores inheritance, including the doubled width. The override belongs
to the selected K-Plex theme and uses the same named/native color sources.

Assign a tag through a connector or tag drop and choose **Tag** or **Note Type**.
The tag stays in the note's YAML `tags` list; Note Type additionally uses the
configured **Style property**. Replacing a different type requires an explicit
choice; the old type can remain as an ordinary tag. Connector context menus also
offer conversion. This does not change the ontology or create a second kind of
indexed tag relationship. If legacy property data cannot safely be represented as
one type/tag, edit that property before replacing it.

## Manage named colors

Select **Named colors** under **Visual styling → Colors** to edit the selected theme’s palette. Add a name and separate **Light** and **Dark** variants, then select **Save**. Each variant has its own RGB, opacity, text and reset controls; **Reset both variants** returns to the opening pair. Search and **Show more** keep larger palettes manageable.

Renaming keeps existing references. Duplicating creates an independent pair. Deleting a used color requires a replacement, including **Default**, and applies that replacement to its configured uses together. Counts describe uses in the selected theme, rather than the number of visible nodes. Other saved themes keep their own palettes. If another editor adds a use while deletion is open, reopen the confirmation to review it.

Select **Suggest dark from light** or **Suggest light from dark** to propose the opposite variant. The suggestion mirrors lightness while keeping hue, saturation and opacity. It changes only the local draft, and some colors near middle lightness will barely change. Adjust the result before saving; a suggestion cannot guarantee contrast for every use.

Generated RGBA text shows two alpha decimals. Saved untouched colors retain their exact values, and typing does not rewrite the active text field.

## Preview both modes

Standard styles show separate Light and Dark color strips; individual properties show paired swatches beside **Edit color**. Node strips are ordered background, text, border, gate outline, gate fill. Link strips are line and label.

The Light and Dark cards show a synthetic note, gates, connector and label using the selected sources. Tint editors include the tint over the canvas. Editing a preview does not switch Obsidian’s appearance or change notes.

**Estimated** means the alternate theme context could not be reproduced completely. Treat it as a preview, especially with community themes, snippets, translucent surfaces or high-contrast settings. Contrast figures describe the sample’s composited colors; patterned fills and uncertain surfaces can make a single figure unavailable.

## Preserve existing styles or adopt theme colors

Existing and imported literal colors stay as explicit choices, including colors that matched an older factory default. They can continue to override theme colors.

To adopt native colors, select **Use theme colors for standard styles…**, review the affected slots and preview, then confirm **Use theme colors**. This clears standard color overrides and the canvas color. Geometry, custom styles, lenses and named colors are preserved. You can also select **Default** for one standard field at a time.

If there are no standard color overrides, the dialog explains that theme colors are already in use and has nothing to clear. Its preview shows the resulting standard appearance, not every custom style in your vault.

A newer or unsupported saved color format is read-only. Other settings can still be saved without rewriting that color data. Releases predating theme/named color sources cannot interpret those references. Preserve a settings backup and convert affected fields to fixed colors before downgrading if their appearance must remain available.

## Directional background tint

Open **Visual styling → Colors → Directional background tint**. It is off by default. Enable **Show directional tint**, choose sources if desired and select **Save**.

| Direction | Compass meaning |
| --- | --- |
| North | Parents |
| East | Challengers and next |
| South | Children |
| West | Friends and previous |

The four sectors meet at the rendered center and cover the viewport while panning, zooming and navigating. They stay independent of empty, filtered or collapsed lists. Siblings keep their own relationship role; wide rows can cross a diagonal. Tint is an orientation cue, not an exact membership boundary or a drop target.

Save and Cancel remain visible while the directional-tint controls scroll. Turning the toggle on previews the draft; choose **Save** to apply it to the Plex.

**Tint intensity** accepts whole percentages from 0–15%. **Use default intensity** follows a theme override, then 7% in either mode. An explicit zero hides tint. Source alpha and intensity multiply, leaving text, nodes and controls at their normal opacity. Decorative tint is suppressed in forced-colors mode.

For CSS snippets and theme-author tokens, see [Theming K-Plex](THEMING.md).

## Settings received from another device

K-Plex applies settings received through Obsidian Sync without restarting or moving
your current Plex center. An unrelated local preference change keeps the received
appearance. Indexing strategy changes still take effect after restarting Obsidian.

If another device changes the appearance while an editor is open, K-Plex keeps
your draft visible and asks you to reopen the editor before reapplying it. Incoming
settings do not save themselves back. Simultaneous edits to the same settings on
different devices remain subject to Obsidian Sync's conflict resolution.

## Labels

Use **Visual styling → Labels** for frontmatter display names, their field order and full tag names. Node and link geometry remain on their respective styling pages.
