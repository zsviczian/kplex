# Open a Templater daily note as Excalidraw

Replace only the second `<%* ... %>` block (the metadata-change handler) in the
daily-note template with the block below. Keep its frontmatter, DNP expressions
and drawing data unchanged. This proposal has not been applied to Zsolt's Brain.

It waits until Templater finishes and the specific note has an editor, then passes
that editor directly to Excalidraw. It does not execute an active-editor command.
An existing Excalidraw view is left alone. Listeners retire before conversion, or
after a 30-second cleanup deadline if the note is never opened. That deadline is
not a delay before switching. Creating without opening will not open a new tab.

```javascript
<%*
const dailyFile = app.vault.getFileByPath(tp.file.path(true));
let armed = false;

tp.hooks.on_all_templates_executed(() => {
  if (armed || !dailyFile) return;
  armed = true;
  const ea = ExcalidrawAutomate;
  const owner = app.workspace.containerEl.ownerDocument.defaultView;
  const refs = [];
  let stopped = false;
  let timeout = null;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    for (const [emitter, ref] of refs) emitter.offref(ref);
    if (timeout !== null) owner.clearTimeout(timeout);
  };

  const trySwitch = () => {
    if (stopped) return;
    if (app.vault.getFileByPath(dailyFile.path) !== dailyFile) {
      stop();
      return;
    }
    const leaf = app.workspace.getLeavesOfType("markdown")
      .find(candidate => candidate.view.file === dailyFile);
    if (!leaf) {
      if (app.workspace.getLeavesOfType("excalidraw")
        .some(candidate => candidate.view.file === dailyFile)) stop();
      return;
    }
    if (!ea.isExcalidrawFile(dailyFile)) return;
    const view = leaf.view;
    stop();
    void ea.toggleViewMode(view).catch(error => {
      console.error("Daily note: could not switch its editor to Excalidraw", error);
    });
  };

  refs.push([app.metadataCache, app.metadataCache.on("changed", file => {
    if (file === dailyFile) trySwitch();
  })]);
  refs.push([app.workspace, app.workspace.on("file-open", file => {
    if (file === dailyFile) trySwitch();
  })]);
  refs.push([app.workspace, app.workspace.on("layout-change", trySwitch)]);
  timeout = owner.setTimeout(stop, 30_000);
  trySwitch();
  return stop;
});
%>
```

This handles the view-opening timing, not the other DNP template expressions.
Templater must be enabled, and Excalidraw must expose the documented
`isExcalidrawFile(file)` and `toggleViewMode(view)` automation methods. A native
test of the already-rendered callback is not a full Templater/DNP integration test.
