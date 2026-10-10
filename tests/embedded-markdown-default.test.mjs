/**
 * Exercises the real embedded native-leaf controller with bounded host/DOM doubles. These tests
 * cover cached Excalidraw opening policy, explicit toggles and asynchronous lifetime fences;
 * they do not claim native Excalidraw interception, keyboard routing or rendered focus acceptance.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { loadPortableModules } from "./support/portableTypeScript.mjs";

const modules = loadPortableModules(["src/adapters/obsidian/embeddedMarkdownLeaf.ts"], {
  obsidian: `
    exports.Platform = { isMobile: false };
    exports.FileView = class FileView {};
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
        return { getViewType: () => type, scope: {},
          excalidrawAPI: type === "excalidraw" ? {} : undefined,
          onResize: () => { this.app.resizes++; }, setEphemeralState() {} };
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
        await this.setViewState({type: "markdown", active: false, state: {file: file.path}});
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
    this.ownerDocument = document; this.isConnected = true; this.children = [];
    const classes = new Set();
    this.classList = { add: (...values) => values.forEach(value => classes.add(value)),
      remove: (...values) => values.forEach(value => classes.delete(value)), contains: value => classes.has(value) };
  }
  /** Replace child ownership exactly as the synthetic split mount does. */
  replaceChildren(...children) { this.children = children; }
  /** No fullscreen overlay participates in these initial-representation contracts. */
  closest() { return null; }
  /** Mark the synthetic split detached on disposal. */
  remove() { this.isConnected = false; }
}

/** Capture asynchronous native request completion independently of its immediate view replacement. */
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }

/** Mount the actual adapter with explicit current metadata and a view-scoped Excalidraw bridge. */
function fixture({ frontmatter, path = "Drawing.excalidraw.md", bridgePresent = true } = {}) {
  const priorWindow = globalThis.window;
  const listeners = new Map(), observers = new Set(), files = new Map();
  const document = { hasFocus: () => true,
    addEventListener: (name, listener) => listeners.set(listener, name),
    removeEventListener: (name, listener) => listeners.delete(listener) };
  const window = { document, Element: NativeElement,
    setTimeout: callback => setTimeout(callback, 0),
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
    metadata: frontmatter,
    metadataCache: { getFileCache: () => app.metadata === undefined ? null : {frontmatter: app.metadata} },
    vault: { getFileByPath: target => files.get(target) ?? null },
    workspace: { createContainer: () => new NativeElement(document),
      setActiveLeaf() {}, getActiveViewOfType: () => null, offref() {} } };
  const bridge = {
    verifyMinimumPluginVersion: () => true,
    registerViewLinkClickHook: () => { app.hooks++; return () => { app.hooks--; }; },
    viewZoomToFit: () => { app.zooms++; },
    setViewModeEnabled: enabled => app.viewModes.push(enabled),
    isExcalidraw: () => app.embeddedLeaf.getViewState().type === "excalidraw",
    /** Toggle only the exact current embedded view, preserving the adapter-owned mode restoration. */
    async toggleViewMode(view) {
      assert.equal(view, app.embeddedLeaf.view, "toggle must target the exact current embedded view");
      const state = app.embeddedLeaf.getViewState();
      await app.embeddedLeaf.setViewState({ ...state, type: state.type === "markdown" ? "excalidraw" : "markdown" });
      return app.embeddedLeaf.view;
    },
  };
  if (bridgePresent) window.ExcalidrawAutomate = bridge;
  globalThis.window = window;
  const file = { path }; files.set(path, file);
  const changes = [], mount = new NativeElement(document), host = {};
  const controller = modules.exports.mountEmbeddedMarkdownLeaf(app, host, mount, undefined, undefined, view => changes.push(view));
  /** Restore global ownership and prove controller teardown removes its document leases. */
  function cleanup() {
    controller.dispose(); assert.equal(listeners.size, 0); assert.equal(observers.size, 0);
    assert.equal(app.hooks, 0); globalThis.window = priorWindow;
  }
  return { app, file, controller, changes, cleanup };
}

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
