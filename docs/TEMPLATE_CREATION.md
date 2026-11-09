# Native creation and Templater

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
