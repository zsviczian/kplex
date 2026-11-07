# Pins

Pin a node from its context menu to keep it above the canvas. Pins and their order are shared by your K-Plex canvases; each canvas keeps its own center and navigation history.

Pins start in a compact, locked mode. Select the **pencil** at the beginning of the row to show reorder grips and remove buttons; select it again to hide them and prevent reordering or removal from the row. Editing is local to each open canvas. In both modes, drag a pin's body with the mouse or swipe with touch to scroll horizontally.

While editing, drag a pin by its grip to change its position. The pin follows your pointer with an accent outline, other pins dim, and the insertion marker shows where it will land. Press Escape to cancel. You can also activate the grip with the keyboard and choose **Move left** or **Move right**. Turning editing off cancels an unfinished drag. Missing destinations keep their positions, including numbered pin shortcuts.

## Calendar and journal gaps

Select the **calendar** at the beginning of the row to choose a Daily Notes date. Dots mark existing notes. Browse months, enter an exact date, or use the arrow keys in the calendar and press Enter to choose. The calendar follows the enabled Core Daily Notes plugin's folder and format, including nested date folders. Existing notes in additional journal subfolders retain their actual paths. Selecting a missing day opens a creation confirmation and uses the configured Daily Notes template. Hide the button under **Canvas behavior → Pins → Show calendar in pins row**.

For historical notes, Core Daily Notes expands `{{date}}` and `{{time}}` using the creation time. `{{title}}` follows the selected filename.

For a daily note without an earlier or later daily-note connector, its node menu offers **Connect to previous daily note…** or **Connect to next daily note…** in every canvas view. K-Plex finds the nearest existing note in that direction, skipping missing journal days, and opens the normal link dialog with that file selected. Review the proposed file and ontology before saving. Each direction remembers its own ontology field; you can use Parent/Child fields as well as Previous/Next. Choosing a menu action alone never writes a relationship or creates intervening days.

## Today, this week and this month

Open **Settings → K-Plex → Canvas behavior → Pins** and enable the periods you want. They join the same ordered list as ordinary pins. Their names stay the same while their destinations follow this device’s local date. Returning to Obsidian or activating a pin refreshes its destination after sleep or a time-zone change. A date change never moves your canvas automatically.

**Today** can use the enabled Daily Notes core plugin’s folder, date format and template. Confirmed creation applies that template just as Daily Notes does, including its date and time tokens. If no dedicated folder is configured, Obsidian’s default new-note location is used. Turn off **Use Daily Notes settings** to enter your own folder and format. Weekly and monthly pins use their configured folders and formats without requiring the Periodic Notes plugin. The settings show each current destination.

The defaults are `YYYY-MM-DD` for days, `GGGG-[W]WW` for weeks and `YYYY-MM` for months. Weekly dates are anchored to the beginning of the week: Monday for ISO weeks, or the first day of your current locale when selected. Use `GGGG` and `WW` for ISO week years/numbers, or `gggg` and `ww` for locale week years/numbers. Near New Year, the week year can differ from the calendar year: January 1, 2021 belongs to ISO week `2020-W53`. Month formats use the first day of the current month. Nested formats such as `YYYY/MM/YYYY-MM-DD` are supported.

Selecting a missing periodic pin opens a confirmation with its exact destination. Choose **Create note** to create the Markdown note and follow it in the canvas, or **Cancel** to leave it missing. **After saving** chooses whether to open it in the Sidecar, a new tab, the canvas editor or a popout, or **Do not open** to follow it without opening a native editor. This preference is remembered independently from ordinary note creation. Merely displaying a periodic pin never creates a file. If Daily Notes is unavailable, configure a custom destination or enable it before using its settings.

Ordinary pins remain fixed even when they happen to point at today’s note. Turning off a periodic pin does not remove an ordinary pin at the same path.
