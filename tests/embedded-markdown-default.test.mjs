/**
 * Exercises the real embedded native-leaf controller with bounded host/DOM doubles. These tests
 * cover cached Excalidraw representation/zoom preferences, explicit toggles and lifetime fences;
 * they do not claim native Excalidraw interception, keyboard routing or rendered focus acceptance.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { loadPortableModules } from "./support/portableTypeScript.mjs";

const modules = loadPortableModules(["src/adapters/obsidian/embeddedMarkdownLeaf.ts"], {
  obsidian: `
    exports.Platform = { isMobile: false };
    exports.FileView = class FileView {};
    exports.TextFileView = class TextFileView extends exports.FileView {};
    exports.WorkspaceSplit = class WorkspaceSplit {
      /** Mount a detached owning-document container for the real adapter. */
      constructor(workspace) { this.containerEl = workspace.createContainer(); }
      /** Retain the exact synthetic leaf inserted into this isolated split. */
      insertChild(index, leaf) { this.containerEl.children.push(leaf); }
    };
    exports.WorkspaceLeaf = class WorkspaceLeaf {
      /** Publish this exact host leaf to the fixture without native workspace side effects. */
      constructor(app) {
        this.app = app; this.state = {type: "markdown", state: {}};
        this.view = this.makeView(); app.embeddedLeaf = this;
      }
      /** Expose representation-specific native capabilities from the currently requested state. */
      makeView() {
        const type = this.state.type;
        this.app.canvasState.viewModeEnabled = this.state.state?.mode === "view";
        return Object.assign(this.app.textView ? new exports.TextFileView() : {}, { getViewType: () => type, scope: {},
          ...(this.app.textView ? {file:this.app.nativeFile, navigation:true, save:()=>{this.app.saves++;const pending=this.app.nextSave;this.app.nextSave=null;return pending??Promise.resolve();}} : {}),
          excalidrawAPI: type === "excalidraw" ? {getAppState: () => this.app.canvasState} : undefined,
          onResize: () => { this.app.resizes++; }, setEphemeralState() {} });
      }
      /** Return native request state independently from its awaited completion. */
      getViewState() { return this.state; }
      /** Publish native view replacement immediately, then honor an independently suspended completion. */
      async setViewState(state, ephemeral) {
        this.app.requests.push({state, ephemeral}); this.state = state; this.view = this.makeView();
        const pause = this.app.nextRequest; this.app.nextRequest = null;
        if (pause) await pause;
      }
      /** Retain ordinary host file-opening behavior so explicit Markdown requests can be distinguished. */
      async openFile(file) {
        this.app.openFiles.push(file.path);
        await this.setViewState({type: this.app.drawingOnOpenFile ? "excalidraw" : "markdown", active: false, state: {file: file.path}});
      }
      /** Count synthetic leaf retirement for lifecycle assertions. */
      detach() { this.app.detaches++; }
    };
  `,
});

/** Provide only the element/document boundary consumed during controller mounting and teardown. */
class NativeElement {
  /** Associate the native host double with its owning document. */
  constructor(document) {
    this.ownerDocument = document; this.isConnected = true; this.children = []; this.style = {}; this.inert = false;
    this.listeners = new Map();
    const classes = new Set();
    this.classList = { add: (...values) => values.forEach(value => classes.add(value)),
      remove: (...values) => values.forEach(value => classes.delete(value)), contains: value => classes.has(value) };
  }
  /** Replace child ownership exactly as the synthetic split mount does. */
  replaceChildren(...children) { this.children = children; }
  /** Match actual subtree containment used to restore focus after rejected native close. */
  contains(node) { return node === this || this.children.some(child => child === node || child.contains?.(node)); }
  /** Return only the fixture's real overlay boundary used for native fullscreen policy. */
  closest() { return this.overlay ?? null; }
  /** Retain temporary fullscreen geometry in the same element-local shape as the host. */
  setCssStyles(values) { Object.assign(this.style, values); }
  /** Mark the synthetic split detached on disposal. */
  remove() { this.isConnected = false; }
  /** Model exact delegated native input leases without dispatching unrelated workspace input. */
  addEventListener(name, listener) { this.listeners.set(name, listener); }
  /** Remove only the matching native listener during controller teardown. */
  removeEventListener(name, listener) { if (this.listeners.get(name) === listener) this.listeners.delete(name); }
}

/** Capture asynchronous native request completion independently of its immediate view replacement. */
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }

/** Mount the actual adapter with explicit current metadata and a view-scoped Excalidraw bridge. */
function fixture({ frontmatter, path = "Drawing.excalidraw.md", bridgePresent = true, zoomPreference = true, exposeZoomPreference = true, compatibilityOpening = false, embeddedPolicy, manualFrames = false, boundNavigation, activateHost } = {}) {
  const priorWindow = globalThis.window;
  const listeners = new Map(), observers = new Set(), files = new Map();
  const document = { hasFocus: () => true,
    addEventListener: (name, listener) => listeners.set(listener, name),
    removeEventListener: (name, listener) => listeners.delete(listener) };
  const frames = new Map(); let nextFrame = 0;
  const window = { document, Element: NativeElement,
    setTimeout: callback => setTimeout(callback, 0),
    requestAnimationFrame: callback => {
      if (!manualFrames) return setTimeout(callback, 0);
      const id = ++nextFrame; frames.set(id, callback); return id;
    },
    cancelAnimationFrame: frame => manualFrames ? frames.delete(frame) : clearTimeout(frame),
    MutationObserver: class {
      /** Track observer ownership without manufacturing native DOM replacement notifications. */
      constructor(callback) { this.callback = callback; observers.add(this); }
      /** Retain the exact subscribed host node for cleanup assertions. */
      observe(element) { this.element = element; }
      /** Remove this exact observer lease. */
      disconnect() { observers.delete(this); }
    } };
  document.defaultView = window;
  const app = { requests: [], openFiles: [], resizes: 0, detaches: 0, hooks: 0, zooms: 0, viewModes: [],
    canvasState: {width: 300, height: 200, scrollX: 0, scrollY: 0, zoom: {value: 0.55}, viewModeEnabled: false},
    metadata: frontmatter,
    metadataCache: { getFileCache: () => app.metadata === undefined ? null : {frontmatter: app.metadata} },
    vault: { getFileByPath: target => files.get(target) ?? null },
    workspace: { createContainer: () => new NativeElement(document),
      setActiveLeaf(leaf) {app.activeLeaf = leaf;}, getActiveViewOfType: () => null, offref() {} } };
  const bridge = {
    verifyMinimumPluginVersion: () => true,
    registerViewLinkClickHook: () => {
      const owner = app.embeddedLeaf.view; app.hooks++; app.routedView = owner;
      return () => { app.hooks--; if (app.routedView === owner) app.routedView = null; };
    },
    viewZoomToFit: () => { app.zooms++; },
    setViewModeEnabled: enabled => { app.viewModes.push(enabled); app.canvasState.viewModeEnabled = enabled; },
    getExcalidrawAPI: () => app.embeddedLeaf.view.excalidrawAPI,
    isExcalidraw: () => app.embeddedLeaf.getViewState().type === "excalidraw",
    /** Toggle only the exact current embedded view, preserving the adapter-owned mode restoration. */
    async toggleViewMode(view) {
      assert.equal(view, app.embeddedLeaf.view, "toggle must target the exact current embedded view");
      const state = app.embeddedLeaf.getViewState();
      await app.embeddedLeaf.setViewState({ ...state, type: state.type === "markdown" ? "excalidraw" : "markdown" });
      return app.embeddedLeaf.view;
    },
  };
  if (exposeZoomPreference) bridge.plugin = {settings: {zoomToFitOnOpen: zoomPreference}};
  if (compatibilityOpening) { delete bridge.registerViewLinkClickHook; app.drawingOnOpenFile = true; }
  if (bridgePresent) window.ExcalidrawAutomate = bridge;
  globalThis.window = window;
  const file = { path }; files.set(path, file);
  const changes = [], mount = new NativeElement(document), overlay = new NativeElement(document), host = {};
  mount.overlay = overlay;
  const controller = modules.exports.mountEmbeddedMarkdownLeaf(app, host, mount, undefined, undefined, view => changes.push(view), activateHost,
    embeddedPolicy ? /** Read current normal-node intent without retaining a settings snapshot. */ () => embeddedPolicy.enabled && !embeddedPolicy.maximized : undefined, boundNavigation);
  /** Restore global ownership and prove controller teardown removes its document leases. */
  function cleanup() {
    controller.dispose(); assert.equal(listeners.size, 0); assert.equal(observers.size, 0); assert.equal(mount.listeners.size, 0);
    assert.equal(app.hooks, 0); assert.equal(frames.size, 0); globalThis.window = priorWindow;
  }
  /** Advance distinct owning-window frames without depending on operating-system timer resolution. */
  function flushFrames() {
    for (let frame = 0; frame < 3; frame++) {
      const current = [...frames]; frames.clear();
      for (const [, callback] of current) callback(frame);
    }
    assert.equal(frames.size, 0, "drawing frame work must settle within three frames");
  }
  /** Wait for actual opening completion before measuring the new view's initial geometry. */
  async function settleOpening(mode = "preview") {
    const deadline = Date.now() + 1000;
    while (app.hooks !== 1 || app.routedView !== app.embeddedLeaf.view || app.canvasState.viewModeEnabled !== (mode === "preview")) {
      assert(Date.now() < deadline, "drawing opening did not complete");
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    flushFrames();
  }
  return { app, host, file, controller, changes, observers, bridge, overlay, mount, cleanup, flushFrames, settleOpening };
}

test('embedded editor follows live focus routing without replacing its open document', async () => {
  let condensed = false;
  const {app, host, file, controller, cleanup} = fixture({path: 'Note.md', activateHost: () => condensed});
  try {
    await controller.open(file, 'source');
    const leaf = app.embeddedLeaf, view = leaf.view, requests = app.requests.length;
    controller.activate();
    assert.equal(app.activeLeaf, leaf);
    condensed = true;
    controller.activate();
    assert.equal(app.activeLeaf, host);
    condensed = false;
    controller.activate();
    assert.equal(app.activeLeaf, leaf);
    assert.equal(leaf.view, view);
    assert.equal(app.requests.length, requests);
    assert.equal(app.detaches, 0);
  } finally { cleanup(); }
});

test('explicit native close saves the exact editor once before detaching and coalesces pending collapse',async()=>{
 const context=fixture({path:'B.md',bridgePresent:false,boundNavigation:()=>assert.fail('Closing cannot navigate')});
 try{
  context.app.textView=true;context.app.nativeFile=context.file;context.app.saves=0;await context.controller.open(context.file,'source');
  assert.equal(context.app.embeddedLeaf.view.navigation,false,'Bound editor cannot be reused by incidental workspace navigation');
  const held=deferred();context.app.nextSave=held.promise;
  const close=context.controller.close();assert.equal(context.controller.close(),close);assert.equal(context.app.saves,1);assert.equal(context.app.detaches,0);assert.equal(context.mount.inert,true);
  held.resolve();await close;assert.equal(context.app.detaches,1);await context.controller.close();assert.equal(context.app.saves,1);assert.equal(context.app.detaches,1);
 }finally{context.cleanup()}
});

test('saved-buffer guard covers ordinary and isolated native Markdown editors without saving or retargeting',async()=>{
 const context=fixture({path:'B.md',bridgePresent:false});
 try{
  context.app.textView=true;context.app.nativeFile=context.file;context.app.saves=0;await context.controller.open(context.file,'source');
  const embedded=context.app.embeddedLeaf.view,View=embedded.constructor,ordinary=Object.assign(new View(),{file:context.file,getViewType:()=> 'markdown',getViewData:()=> 'saved'});
  let buffer='saved',ordinaryLeaves=[{view:ordinary}];embedded.getViewData=()=>buffer;
  context.app.workspace.iterateAllLeaves=callback=>ordinaryLeaves.forEach(callback);
  assert.equal(modules.exports.markdownBuffersMatchSaved(context.app,context.file,'saved'),true);
  buffer='saved\nbody';ordinary.getViewData=()=> 'saved\nbody';assert.equal(modules.exports.markdownBuffersMatchSaved(context.app,context.file,'saved\r\nbody'),true,'Windows CRLF normalization is not an unsaved content edit');
  buffer='saved';ordinary.getViewData=()=> 'saved';
  ordinary.getViewType=()=> 'excalidraw';
  assert.equal(modules.exports.markdownBuffersMatchSaved(context.app,context.file,'saved'),true,'Existing Markdown-only caller ignores other view types');
  assert.equal(modules.exports.markdownBuffersMatchSaved(context.app,context.file,'saved',true),false,'Strict UUID review refuses an uninspectable native view');
  ordinary.getViewType=()=> 'markdown';
  buffer='unsaved embedded';assert.equal(modules.exports.markdownBuffersMatchSaved(context.app,context.file,'saved'),false);
  buffer='saved';ordinary.getViewData=()=> 'unsaved ordinary';assert.equal(modules.exports.markdownBuffersMatchSaved(context.app,context.file,'saved'),false);
  ordinaryLeaves=[];assert.equal(modules.exports.markdownBuffersMatchSaved(context.app,context.file,'saved'),true);
  embedded.getViewData=()=>{throw Error('Retired native buffer')};assert.equal(modules.exports.markdownBuffersMatchSaved(context.app,context.file,'saved'),false);
  assert.equal(context.app.saves,0);assert.equal(context.app.embeddedLeaf.view,embedded);assert.equal(context.app.detaches,0);
  context.controller.dispose();assert.equal(modules.exports.markdownBuffersMatchSaved(context.app,context.file,'saved'),true,'Disposed isolated leaf is no longer retained or queried');
 }finally{context.cleanup()}
});

test('rejected native save retains its view and allows a later explicit close without a custom writer',async()=>{
 const context=fixture({path:'B.md',bridgePresent:false});
 try{
  context.app.textView=true;context.app.nativeFile=context.file;context.app.saves=0;await context.controller.open(context.file,'source');
  const view=context.app.embeddedLeaf.view;assert.equal(view.navigation,true,'Legacy attention editor navigation remains unchanged');
  context.app.nextSave=Promise.reject(Error('Owned storage failure'));await assert.rejects(context.controller.close(),/Owned storage failure/);
  assert.equal(context.app.embeddedLeaf.view,view);assert.equal(context.app.detaches,0);assert.equal(context.mount.inert,false);assert.equal(context.app.saves,1);
  await context.controller.close();assert.equal(context.app.saves,2);assert.equal(context.app.detaches,1);
 }finally{context.cleanup()}
});

test('explicit close never writes a replaced or removed native file',async()=>{
 for(const replacement of [null,{path:'B.md'}]){
  const context=fixture({path:'B.md',bridgePresent:false});
  try{
   context.app.textView=true;context.app.nativeFile=context.file;context.app.saves=0;await context.controller.open(context.file,'source');
   context.app.vault.getFileByPath=()=>replacement;await context.controller.close();assert.equal(context.app.saves,0);assert.equal(context.app.detaches,1);
  }finally{context.cleanup()}
 }
});

for (const mode of ["source", "preview"]) {
  test(`marked open-md starts explicitly in Markdown ${mode} and retains drawing capability`, /** Require an explicit native Markdown request while preserving separate drawing eligibility. */ async () => {
    const context = fixture({frontmatter: {"excalidraw-plugin": "parsed", "excalidraw-open-md": true}});
    try {
      await context.controller.open(context.file, mode);
      assert.equal(context.controller.getDocumentView(), "markdown");
      assert.deepEqual(context.app.requests, [{state: {type: "markdown", active: false, state: {file: context.file.path, mode}}, ephemeral: {focus: false}}]);
      assert.deepEqual(context.app.openFiles, []); assert.equal(context.app.hooks, 0); assert.equal(context.app.zooms, 0);
      assert.equal(context.controller.isExcalidrawFile(), true);
    } finally { context.cleanup(); }
  });
}

test("false or missing open-md preserves drawing integration mode and fit-on-open state", /** Keep the established integration view state for every disabled initial-Markdown value. */ async () => {
  for (const flag of [false, undefined, 0, ""]) {
    const context = fixture({frontmatter: {"excalidraw-plugin": "parsed", "excalidraw-open-md": flag}});
    try {
      await context.controller.open(context.file, "preview");
      assert.equal(context.controller.getDocumentView(), "excalidraw");
      assert.deepEqual(context.app.requests[0], {state: {type: "excalidraw", active: false, state: {file: context.file.path, mode: "view", zoomToFit: true}}, ephemeral: {focus: false}});
    } finally { context.cleanup(); }
  }
});

test("truthy frontmatter matches Excalidraw semantics while absent or disabled markers do not opt into Markdown", /** Match upstream truthiness using authoritative cached properties rather than filename alone. */ async () => {
  for (const marker of ["parsed", true, false, undefined]) {
    const context = fixture({frontmatter: {"excalidraw-plugin": marker, "excalidraw-open-md": "enabled"}});
    try {
      await context.controller.open(context.file, "source");
      assert.equal(context.controller.getDocumentView(), marker ? "markdown" : "excalidraw");
    } finally { context.cleanup(); }
  }
});

test("ordinary Markdown has no drawing capability even with a stray open-md preference", /** Reject drawing capability on an ordinary native Markdown document. */ async () => {
  const context = fixture({path: "Note.md", frontmatter: {"excalidraw-open-md": true}});
  try {
    await context.controller.open(context.file, "source");
    assert.equal(context.controller.getDocumentView(), "markdown");
    assert.equal(context.controller.isExcalidrawFile(), false);
    assert.deepEqual(context.app.openFiles, ["Note.md"]);
    assert.equal(context.app.requests.at(-1).state.state.mode, "source");
  } finally { context.cleanup(); }
});

test("initial Markdown remains available without Excalidraw and does not invent toggle integration", /** Exercise the Markdown initial preference without a companion plugin bridge. */ async () => {
  const context = fixture({bridgePresent: false, frontmatter: {"excalidraw-plugin": "parsed", "excalidraw-open-md": true}});
  try {
    await context.controller.open(context.file, "preview");
    assert.equal(context.controller.getDocumentView(), "markdown");
    assert.equal(await context.controller.toggleExcalidrawView("source"), "markdown");
    assert.equal(context.app.requests.length, 1);
  } finally { context.cleanup(); }
});

test("explicit drawing and Markdown toggles override the initial preference until navigation back", /** Preserve explicit representation changes and reapply defaults only on another initial open. */ async () => {
  const context = fixture({frontmatter: {"excalidraw-plugin": "parsed", "excalidraw-open-md": true}});
  try {
    await context.controller.open(context.file, "source");
    assert.equal(await context.controller.toggleExcalidrawView("preview"), "excalidraw");
    assert.equal(context.app.hooks, 1); assert.equal(context.app.zooms, 1); assert.deepEqual(context.app.viewModes, [true]);
    assert.equal(await context.controller.toggleExcalidrawView("source"), "markdown");
    assert.equal(context.app.hooks, 0); assert.equal(context.app.requests.at(-1).state.state.mode, "source");
    await context.controller.openUrl("https://example.com");
    await context.controller.open(context.file, "preview");
    assert.equal(context.controller.getDocumentView(), "markdown");
    assert.equal(context.app.requests.at(-1).state.state.mode, "preview");
  } finally { context.cleanup(); }
});

test("cache-not-ready retains the existing drawing path and a later explicit open reads authoritative metadata", /** Reacquire metadata on the later request without eager cache acquisition. */ async () => {
  const context = fixture();
  try {
    await context.controller.open(context.file, "source");
    assert.equal(context.controller.getDocumentView(), "excalidraw");
    context.app.metadata = {"excalidraw-plugin": "parsed", "excalidraw-open-md": true};
    await context.controller.open(context.file, "source");
    assert.equal(context.controller.getDocumentView(), "markdown");
    assert.equal(context.app.requests.at(-1).state.state.mode, "source");
  } finally { context.cleanup(); }
});

test("opening the initial Markdown preference releases the preceding drawing's link-routing hook", /** Ensure the preceding drawing cannot retain a link-routing lease after opening Markdown. */ async () => {
  const context = fixture();
  try {
    await context.controller.open(context.file, "source");
    for (let turn = 0; turn < 10 && context.app.hooks === 0; turn++) await new Promise(resolve => setTimeout(resolve, 1));
    assert.equal(context.app.hooks, 1, "the real post-open integration must have mounted its view-scoped hook");
    context.app.metadata = {"excalidraw-plugin": "parsed", "excalidraw-open-md": true};
    await context.controller.open(context.file, "source");
    assert.equal(context.controller.getDocumentView(), "markdown"); assert.equal(context.app.hooks, 0);
  } finally { context.cleanup(); }
});

test("superseded and disposed asynchronous Markdown opens cannot publish late representation or mode work", /** Retire awaited completion after both superseding navigation and controller disposal. */ async () => {
  for (const retire of ["navigate", "dispose"]) {
    const context = fixture({frontmatter: {"excalidraw-plugin": "parsed", "excalidraw-open-md": true}}), pause = deferred();
    try {
      context.app.nextRequest = pause.promise;
      const pending = context.controller.open(context.file, "source");
      if (retire === "navigate") await context.controller.openUrl("https://example.com");
      else context.controller.dispose();
      const requests = context.app.requests.length, resizes = context.app.resizes, changes = context.changes.length;
      pause.resolve(); await pending;
      assert.equal(context.app.requests.length, requests); assert.equal(context.app.resizes, resizes);
      assert.equal(context.changes.length, changes); assert.equal(context.app.hooks, 0);
      if (retire === "navigate") assert.equal(context.app.embeddedLeaf.getViewState().type, "webviewer");
    } finally { pause.resolve(); context.cleanup(); }
  }
});


for (const preference of [true, false, undefined]) {
  test(`drawing opening preserves native zoom policy when preference is ${String(preference)}`, /** Compare actual adapter requests and completion without manufacturing a host zoom result. */ async () => {
    const context = fixture({zoomPreference: preference});
    // Passing undefined through the fixture's default would choose true; remove the actual host
    // field to model a companion that does not expose the preference.
    if (preference === undefined) delete context.bridge.plugin.settings.zoomToFitOnOpen;
    try {
      await context.controller.open(context.file, "source");
      assert.deepEqual(context.app.requests[0].state.state, {file: context.file.path, mode: "edit", ...(preference === true ? {zoomToFit: true} : {})});
      await new Promise(/** Let the adapter finish its existing post-open watcher before checking fit ownership. */ resolve => setTimeout(resolve, 15));
      assert.equal(context.app.zooms, 0, "modern post-open completion must not issue a second fit");
      const requests = context.app.requests.length;
      await context.controller.setMode("preview");context.controller.resize();context.controller.resize();
      for (const observer of context.observers) observer.callback();
      await new Promise(/** Let observed representation reconciliation finish before counting viewport resets. */ resolve => setTimeout(resolve, 5));
      assert.equal(context.app.zooms, 0, "mode/resize/same representation observations must not reset manual zoom");
      assert.equal(context.app.requests.length, requests, "presentation updates must not reopen the native drawing");
    } finally { context.cleanup(); }
  });
}

test("unavailable companion zoom settings do not invent automatic fit consent", /** Keep a compatible bridge usable while delegating unknown zoom policy to native opening. */ async () => {
  const context = fixture({exposeZoomPreference: false});
  try {
    await context.controller.open(context.file, "source");
    assert.equal(Object.hasOwn(context.app.requests[0].state.state, "zoomToFit"), false);
    await context.controller.toggleExcalidrawView("source");await context.controller.toggleExcalidrawView("source");
    assert.equal(context.app.zooms, 0);
  } finally { context.cleanup(); }
});

test("representation changes and later opens read the live companion preference", /** Do not capture one settings snapshot across explicit or externally observed view replacements. */ async () => {
  const context = fixture({zoomPreference: false});
  try {
    await context.controller.open(context.file, "source");
    assert.equal(Object.hasOwn(context.app.requests[0].state.state, "zoomToFit"), false);
    await context.controller.toggleExcalidrawView("source");await context.controller.toggleExcalidrawView("source");
    assert.equal(context.app.zooms, 0, "disabled preference must preserve saved viewport through an explicit return to drawing");
    context.bridge.plugin.settings.zoomToFitOnOpen = true;
    await context.controller.toggleExcalidrawView("source");await context.controller.toggleExcalidrawView("source");
    assert.equal(context.app.zooms, 1, "enabled preference applies on the next representation opening");
    await context.controller.open(context.file, "preview");
    assert.equal(context.app.requests.at(-1).state.state.zoomToFit, true);
    await new Promise(/** Let the adapter finish its existing post-open watcher before checking fit ownership. */ resolve => setTimeout(resolve, 15));
    context.bridge.plugin.settings.zoomToFitOnOpen = false;
    await context.app.embeddedLeaf.setViewState({type: "markdown", state: {file: context.file.path, mode: "source"}});
    for (const observer of context.observers) observer.callback();await new Promise(/** Let observed representation reconciliation finish before counting viewport resets. */ resolve => setTimeout(resolve, 5));
    await context.app.embeddedLeaf.setViewState({type: "excalidraw", state: {file: context.file.path}});
    for (const observer of context.observers) observer.callback();await new Promise(/** Let observed representation reconciliation finish before counting viewport resets. */ resolve => setTimeout(resolve, 5));
    assert.equal(context.app.zooms, 1, "externally observed drawing replacement must also respect the now-disabled preference");
    await context.controller.open(context.file, "source");assert.equal(Object.hasOwn(context.app.requests.at(-1).state.state, "zoomToFit"), false);
  } finally { context.cleanup(); }
});

for (const preference of [true, false]) {
  test(`compatibility drawing completion fits only with enabled preference: ${preference}`, /** Exercise the real fallback openFile watcher rather than only its request syntax. */ async () => {
    const context = fixture({zoomPreference: preference, compatibilityOpening: true});
    try {
      await context.controller.open(context.file, "preview");await new Promise(/** Let the compatibility completion watcher apply the current opening preference. */ resolve => setTimeout(resolve, 20));
      assert.deepEqual(context.app.openFiles, [context.file.path]);
      assert.equal(context.app.zooms, preference ? 1 : 0);
      assert.equal(context.app.viewModes.at(-1), true);
    } finally { context.cleanup(); }
  });
}

for (const scenario of [
  {name: "normal default override", enabled: true, maximized: false, native: false, fit: true},
  {name: "disabled normal override", enabled: false, maximized: false, native: false, fit: false},
  {name: "disabled override with native fit", enabled: false, maximized: false, native: true, fit: true},
  {name: "maximized saved viewport", enabled: true, maximized: true, native: false, fit: false},
  {name: "maximized native fit", enabled: true, maximized: true, native: true, fit: true},
]) {
  test(`embedded opening policy: ${scenario.name}`, /** Exercise actual native request and representation-fit branches for normal and maximized intent. */ async () => {
    const policy = {enabled: scenario.enabled, maximized: scenario.maximized};
    const context = fixture({embeddedPolicy: policy, zoomPreference: scenario.native});
    try {
      await context.controller.open(context.file, "source");
      assert.equal(context.app.requests[0].state.state.zoomToFit === true, scenario.fit);
      await new Promise(/** Let the bounded post-open watcher complete before counting duplicate fit calls. */ resolve => setTimeout(resolve, 15));
      assert.equal(context.app.zooms, 0, "modern integration fits through its one-shot state only");
      await context.controller.toggleExcalidrawView("source");await context.controller.toggleExcalidrawView("source");
      assert.equal(context.app.zooms, scenario.fit ? 1 : 0, "explicit return to drawing reads the same live opening policy");
    } finally { context.cleanup(); }
  });
}

test("edit and maximized drawing resizes do not apply the normal-node override", /** Preserve excluded native modes and read live policy at subsequent openings. */ async () => {
  const policy = {enabled: true, maximized: false}, context = fixture({embeddedPolicy: policy, zoomPreference: false});
  try {
    await context.controller.open(context.file, "source");
    await new Promise(/** Drain initial completion before changing live editor geometry intent. */ resolve => setTimeout(resolve, 15));
    const count = context.app.requests.length;
    policy.maximized = true;context.controller.resize();await context.controller.setMode("preview");
    for (const observer of context.observers) observer.callback();
    await new Promise(/** Drain representation observers before checking that no viewport reset occurred. */ resolve => setTimeout(resolve, 5));
    assert.equal(context.app.zooms, 0);assert.equal(context.app.requests.length, count);
    await context.controller.open(context.file, "source");assert.equal(context.app.requests.at(-1).state.state.zoomToFit, undefined);
    policy.maximized = false;
    await context.controller.open(context.file, "source");assert.equal(context.app.requests.at(-1).state.state.zoomToFit, true);
  } finally { context.cleanup(); }
});

for (const preference of [false, true]) {
  test(`native fullscreen excludes normal override and follows companion fit: ${preference}`, /** Use the actual fullscreen ancestry marker rather than simulated viewport dimensions. */ async () => {
    const context = fixture({embeddedPolicy: {enabled: true, maximized: false}, zoomPreference: preference});
    try {
      context.overlay.classList.add("excalidraw-visible");
      await context.controller.open(context.file, "source");
      assert.equal(context.app.requests[0].state.state.zoomToFit === true, preference);
      await context.controller.toggleExcalidrawView("source");await context.controller.toggleExcalidrawView("source");
      assert.equal(context.app.zooms, preference ? 1 : 0);
    } finally { context.cleanup(); }
  });
}

test("compatibility completion honors normal-node override with native fit disabled", /** Keep legacy opening fallback on the same narrow policy as modern one-shot requests. */ async () => {
  const context = fixture({embeddedPolicy: {enabled: true, maximized: false}, zoomPreference: false, compatibilityOpening: true});
  try {
    await context.controller.open(context.file, "source");
    await new Promise(/** Let the existing compatibility completion watcher reach its policy-gated fit. */ resolve => setTimeout(resolve, 20));
    assert.equal(context.app.zooms, 1);
  } finally { context.cleanup(); }
});

test("explicit normal-node override remains authoritative when companion preference is unavailable", /** Distinguish a known K-Plex fit choice from an unknown external preference. */ async () => {
  const context = fixture({embeddedPolicy: {enabled: true, maximized: false}, exposeZoomPreference: false});
  try {
    await context.controller.open(context.file, "source");
    assert.equal(context.app.requests[0].state.state.zoomToFit, true);
  } finally { context.cleanup(); }
});

test("actual adapter refits untouched view-mode drawings after resize and direct input retires the opening", /** Exercise live native read/policy and exact mount event wiring, not only the fit coordinator. */ async () => {
  const context = fixture({embeddedPolicy: {enabled: true, maximized: false}, zoomPreference: false, manualFrames: true});
  try {
    await context.controller.open(context.file, "preview");
    await context.settleOpening();
    context.app.canvasState.width = 600;context.controller.resize();
    context.flushFrames();assert.equal(context.app.zooms, 1);
    context.mount.listeners.get("pointerdown")();context.app.canvasState.width = 800;context.controller.resize();
    context.flushFrames();assert.equal(context.app.zooms, 1);
    await context.controller.open(context.file, "preview");await context.settleOpening();
    context.app.canvasState.height = 400;context.controller.resize();context.flushFrames();
    assert.equal(context.app.zooms, 2,"another opening renews untouched drawing fit");
  } finally {context.cleanup();}
});

test("actual adapter preserves API-adjusted viewport and ignores editing or fullscreen resize", /** Manual intent and native modes remain authoritative even without pointer event simulation. */ async () => {
  const context=fixture({embeddedPolicy:{enabled:true,maximized:false},zoomPreference:false,manualFrames:true});
  try {
    await context.controller.open(context.file,"preview");await context.settleOpening();
    context.app.canvasState.scrollX=123;context.app.canvasState.width=600;context.controller.resize();
    context.flushFrames();assert.equal(context.app.zooms,0);
    await context.controller.open(context.file,"source");await context.settleOpening("source");
    context.app.canvasState.width=800;context.controller.resize();context.flushFrames();assert.equal(context.app.zooms,0);
    await context.controller.open(context.file,"preview");await context.settleOpening();
    context.overlay.classList.add("excalidraw-visible");context.app.canvasState.width=1000;context.controller.resize();
    context.flushFrames();assert.equal(context.app.zooms,0);
  } finally {context.cleanup();}
});
