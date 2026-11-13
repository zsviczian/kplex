# Native creation and Templater

## Explicit templates

The creation forms share **Markdown** and **Excalidraw** tabs with a searchable
**Template** control inside the selected tab. Each tab lists only its own kind
and remembers its template choice while switching. Excalidraw is shown only when
its companion is available; related-node creation also offers **Placeholder**.
**After saving** stays above the tabs, and the native top-right close button
dismisses the form. Folder creation and materialization offer only real file types.
The last explicitly selected type tab opens next time, including after cancelling.
Forms that cannot offer that type show a supported fallback without erasing the
remembered choice. Before the first explicit selection, the existing physical-type
and template defaults still apply.

Set **Ontology → Relationship behavior → Markdown template folder** with the shared
folder suggester. Typing offers matching vault folders; an empty value disables
Markdown template discovery, while `/` selects the vault root. The Markdown tab
lists files from that source; Excalidraw uses its public template catalogue.
Full paths distinguish duplicate names. Listing
visits at most 4,096 Markdown-source folder entries; drawing choices retain the
existing public companion catalogue. Listing reads no template content or graph sources;
search and browse execute nothing. A selected entry retains its native file,
revision and creation kind. The selected tab supplies its matching creation action.
Markdown-only operations cannot select a drawing.

The execution contract is explicit selection before automatic creation templates:

- **No K-Plex template** preserves existing external automation. An explicit blank
  drawing preserves the existing blank-drawing choice and remembered drawing paths.
- A selected Markdown template is read only when saving, with a 1 MiB limit. Plain
  Markdown is copied as text. Core Templates variables `{{title}}`, `{{date}}` and
  `{{time}}`, including date/time format arguments, use the chosen note and one
  captured local clock; configured core date/time formats are respected.
- Templater code requires the enabled native parser, running-configuration and
  task-lifecycle methods.
  Unsupported executable templates are refused before creating a file. Supported
  execution calls the native parser once with the selected template and exact
  created target, including the native active-file context. A template may rename
  or move that same native file; a replacement file never inherits its write.
  It does not duplicate folder/regex matching or concatenate an
  automatic template. Native task completion follows the actual output write.
- The existing creation receipt substitutes this explicit execution only for the
  exact file returned by the accepted create operation. Unrelated creations keep
  their automatic handler. A foreign creation winning the same path is delegated
  back to its native handler. Concurrent owned creations keep independent receipts.
  Templater creation handlers share a per-engine queue while these receipts are
  active: its mutable parser context cannot safely evaluate two creations at once.
  Native automatic handlers still run once and admitted work drains before the
  temporary hook is restored. Reloading K-Plex joins that same admission queue
  until the previous native work finishes; it does not start a competing parser.
  This does not coordinate separate manual Templater
  commands or work scheduled by a template after its native task completes.
- Excalidraw templates stay behind the versioned public companion API; their
  drawing paths never enter the plain Markdown creator. Configured Daily Notes
  remain on their existing separate template flow.

Before creation and after awaited work, native template/target identity, template
revision, source-folder preference and operation lifetime are revalidated. Parser
failures retain the created file and failed receipt; property writes cannot skip
that barrier or execute the parser again on a retry. Concurrent text is never
overwritten by delayed template output. Arbitrary active-editor commands and later
timers in template scripts retain the limitations described below.

## Automatic creation barrier

K-Plex waits for automatic template processing before writing a new file's display
name, aliases or relationship properties. The same barrier covers regular related
notes, notes created inside folders, placeholder materialization, drawing creation,
external copies and configured core Daily Notes. Reversed property ownership uses
the rendered new note rather than racing commands in its YAML frontmatter.

An unresolved name matching the configured Daily Notes format offers a **Daily note**
choice in the normal creation dialog. It uses the configured daily folder and template;
the Markdown and Excalidraw choices retain their ordinary behavior. Calendar, Today and
daily-placeholder creation share the template-completion barrier and open a newly
created drawing in Excalidraw only after that exact file's template has finished.

Deleting a centered note preserves surviving incoming declarations while referrers
update. If Obsidian then replaces its full file path with one unambiguous unresolved
spelling, the canvas follows that published placeholder instead of an empty old path.
This changes navigation only; it neither rewrites the referring notes nor renews source
or relationship-write authority.

Obsidian can change its shared inferred property widget when it parses a newly created
note. Those hints do not represent a user changing a property type. Where the native
type-info API is available, K-Plex infers unassigned Date values from each source's
actual value and observes explicit assignments separately. Creating a text-valued DNP
therefore cannot invalidate other notes' Date interpretations. Explicit type changes
and removal of an explicit assignment still repair the affected field holders.

`FileCreationAutomation` is an optional Obsidian adapter. It observes the enabled
Templater engine's static `on_file_creation` promise before native creation starts.
It delegates exactly once, retains the native handler's receiver and result, and
awaits only the receipt belonging to the actual returned file. Templater remains
responsible for enabled flags, ignored folders, folder/regex matching, parsing and
its initial delay. No extra parser execution or guessed completion delay is added.
Foreign template execution stays outside indexing mutation-priority scopes, so
navigation and background checkpoints can advance while a template is pending.
The actual metadata writes and graph publication retain mutation priority afterward.
This follows the [Templater creation handler](https://github.com/SilentVoid13/Templater/blob/master/src/core/Templater.ts)
and was exercised with the actual installed 2.26.0 binary.

This is a guarded unpublished integration point. With no enabled Templater, creation
continues directly. An unsupported handler fails before creation; a missing receipt
after creation preserves a recoverable file and refuses subsequent property writes.
Concurrent creations share one interception, wait independently, and restore the
original method when they finish. Plugin unload rejects waits and retires interception
without cancelling Templater's independent work. A waiting notice reports progress;
it never grants permission to write. File rename follows identity; deletion or
replacement fails rather than writing into a different note.

Template completion does not mean every future asynchronous user command is finished.
An arbitrary timer or a template callback invoking an **active-editor** command still
needs an explicit target if it must act on a particular note. K-Plex cannot infer that
target or safely focus/open an editor against the selected completion preference.
The [file-targeted view example](snippets/daily-note-excalidraw-view.md) addresses that
separate concern. Other plugins without an observable completion contract, unrelated
later edits and user scripts that never settle are not covered by this adapter.

Coverage: executable adapter tests include delayed admission, YAML/body evaluation,
concurrency, failure/recovery, unload, rename/replacement, absent/unsupported integration
and missing receipts. The native `template-lifecycle` lane runs real folder, regex and
core Daily Notes templates and writes an inverse property on the created note. Native
lanes require a prepared disposable vault and an actual staged Templater executable;
they never install or execute a template in a production vault.
