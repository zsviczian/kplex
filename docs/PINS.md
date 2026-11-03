# Pins

Pin a node from its context menu to keep it above the canvas. Pins and their order are shared by your K-Plex canvases; each canvas keeps its own center and navigation history.

Drag a pin by its grip to change its position. The insertion marker shows where it will land. Press Escape to cancel. You can also activate the grip with the keyboard and choose **Move left** or **Move right**. Missing destinations keep their positions, including numbered pin shortcuts.

## Today, this week and this month

Open **Settings → K-Plex → Canvas behavior → Pins** and enable the periods you want. They join the same ordered list as ordinary pins. Their names stay the same while their destinations follow this device’s local date. Returning to Obsidian or activating a pin refreshes its destination after sleep or a time-zone change. A date change never moves your canvas automatically.

**Today** can use the enabled Daily Notes core plugin’s folder and date format. Turn off **Use Daily Notes settings** to enter your own folder and format. Weekly and monthly pins use their configured folders and formats without requiring the Periodic Notes plugin. The settings show each current destination.

The defaults are `YYYY-MM-DD` for days, `GGGG-[W]WW` for weeks and `YYYY-MM` for months. Weekly dates are anchored to the beginning of the week: Monday for ISO weeks, or the first day of your current locale when selected. Use `GGGG` and `WW` for ISO week years/numbers, or `gggg` and `ww` for locale week years/numbers. Near New Year, the week year can differ from the calendar year: January 1, 2021 belongs to ISO week `2020-W53`. Month formats use the first day of the current month. Nested formats such as `YYYY/MM/YYYY-MM-DD` are supported.

K-Plex never creates a note just because a pin is displayed or selected. If the destination is missing, selecting the pin explains how to create it with your usual Daily Notes or periodic-note workflow. This lets your existing creation commands and templates apply. If Daily Notes is unavailable, configure a custom destination or enable it before using its settings.

Ordinary pins remain fixed even when they happen to point at today’s note. Turning off a periodic pin does not remove an ordinary pin at the same path.
