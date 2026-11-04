# Daily-note Sidecar automation investigation

Follow-up: [the authoring/template validation record](authoring-ui-templates-278-2026-11-04.md)
documents the later generic creation barrier. That protects property writes across
Templater-created notes; the active-editor command issue described here remains a
separate file-targeting concern.

The user's template registers a one-shot metadata-change listener, removes it
when the daily file changes, then invokes the global Excalidraw view-toggle
command. That command acts on the active editor, not the file that emitted the
metadata event. It can report acceptance while doing nothing with K-Plex active.

K-Plex delegates configured daily-note creation to core Daily Notes. Its Sidecar
opens inactive, completes layout, then receives focus for the explicit Sidecar
completion choice. The template's metadata callback can run before that focus
handoff. Removing the listener makes that missed conversion permanent. This
explains why the same automation works when creating from an active editor.
The inspected template uses an event listener, rather than a delayed timer.

## Native evidence

Serial `daily-automation` lane, Windows Obsidian 1.14.5, Node 22.22.2,
installed Excalidraw 2.29.0, disposable `kplex-test-small` only. Receipt
`kplex-278-native-h7Vk4j`, completed 2026-11-04 16:28:46 UTC.

| Case | Actual outcome |
| --- | --- |
| Metadata callback invokes global command with canvas active | Command accepted; target remains Markdown |
| Same callback with Sidecar active | Target becomes Excalidraw |
| Explicit `toggleViewMode(sidecar.view)` with canvas active | Correct target becomes Excalidraw |
| Proposed snippet with existing inactive Markdown Sidecar | Correct target becomes Excalidraw |
| Proposed snippet before editor opens | Opens no unwanted editor; converts the later Markdown Sidecar |

Native fixture, exact configuration bytes, plugin enablement and workspace layout
were restored. Baseline: 117 files, including 98 Markdown files. A preceding
three-case reproduction (`kplex-278-native-LCcNhg`) independently passed the
first three cases. The companion JSON retains artifact hashes and actual results.

## Reviewable remedy and limits

[Replacement template block](../snippets/daily-note-excalidraw-view.md) waits for
template completion and the specific note's editor, then calls the documented
Excalidraw API with that editor. It retires its listeners before conversion and
has a bounded cleanup deadline. It does not depend on which leaf is active or
open an editor when none was requested. An already-open drawing stays a drawing.

No K-Plex or Excalidraw runtime change was made for this investigation. Production
template, notes, settings and workspace remain unchanged; nothing was redeployed.
Existing inactive Sidecar opening is intentional and was not globally reordered
to accommodate an active-editor command in a template.

Templater is absent from Small. These tests execute the already-rendered callback
and proposed block with hook delivery supplied by the fixture; they do **not**
claim full Templater/DNP integration or macOS/mobile acceptance. The installed
production Templater's template-complete hook was inspected read-only. The remaining
manual check is to apply the replacement block after review, create the daily note
in Sidecar on the user's Mac, and confirm the complete DNP processing and conversion.
The production template has not been edited automatically.

Only test-driver/documentation changes follow the previously verified production
build. Syntax and whitespace checks passed. The expensive indexing aggregate was
not rerun: these changes do not enter runtime indexing, scheduling or storage.
The separately recorded indexing recovery issue remains unresolved.
