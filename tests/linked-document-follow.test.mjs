/**
 * Tests the actual App observation callback and plugin passive synchronization methods against
 * bounded native workspace doubles. Exact destination identity and asynchronous follow retirement
 * are host contracts; native Excalidraw representation/focus acceptance belongs to the serial CLI lane.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

/** Extract a real plugin method or App follow callback without invoking native plugin startup. */
function production(name, dependencies = {}, filename = "src/main.ts") {
  const source = ts.createSourceFile(filename, readFileSync(new URL(`../${filename}`, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  let expression;
  /** Preserve the production implementation and its asynchronous boundaries verbatim. */
  function visit(node) {
    if (ts.isMethodDeclaration(node) && node.name.getText(source) === name) {
      const text = node.getText(source);
      expression = `${node.modifiers?.some(item => item.kind === ts.SyntaxKind.AsyncKeyword) ? "async " : ""}function ${name}${text.slice(text.indexOf("("))}`;
    }
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) expression = node.initializer.getText(source);
    ts.forEachChild(node, visit);
  }
  visit(source); assert(expression, name);
  const compiled = ts.transpileModule(`const implementation = ${expression};`, {compilerOptions: {target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.None}}).outputText;
  return Function(...Object.keys(dependencies), `${compiled}; return implementation;`)(...Object.values(dependencies));
}

/** Suspend one native open independently from its immediately published destination state. */
function deferred() { let resolve; const promise = new Promise(/** Retain one externally controlled native completion boundary. */ done => { resolve = done; }); return {promise, resolve}; }

/** Provide native file identity, leaf attachment and managed adjacency explicitly. */
function fixture() {
  const files = new Map(), leaves = new Set(), opens = [], modes = [];
  const host = {}, pageFile = {path: "A.md"}, otherFile = {path: "B.md"};
  files.set(pageFile.path, pageFile); files.set(otherFile.path, otherFile); leaves.add(host);
  const leaf = {file: otherFile, state: {type: "markdown", state: {file: otherFile.path, mode: "source"}},
    /** Read the real destination representation exposed to the production methods. */
    getViewState() { return this.state; },
    /** Publish native target state synchronously, then honor an explicitly paused completion. */
    async openFile(file, options) {
      opens.push({leaf: this, file, options});
      /** Model native destination publication on either side of its completion boundary. */
      const publish = () => { this.file = file; this.state = {type: "markdown", state: {file: file.path, mode: "source"}}; };
      if (!this.publishAfterAwait) publish();
      const pause = this.pause; this.pause = null; if (pause) await pause;
      if (this.publishAfterAwait) publish();
    },
    /** Capture mode requests without introducing representation policy into the host double. */
    async setViewState(state) { modes.push(state); this.state = state; },
  };
  leaves.add(leaf);
  const context = {unloading: false, writes: 0, lastDocumentLeaf: null,
    settings: {documentSyncMode: "pinned", sidecarMarkdownMode: "preview"},
    app: {vault: {getFileByPath: /** Resolve only current canonical native file identities. */ path => files.get(path) ?? null}, workspace: {revealLeaf: /** Explicit Open may reveal without adding another navigation mutation. */ async () => {}}},
    sidecarLeaves: new Map([[host, leaf]]), passiveSidecarSyncRequests: new WeakMap(),
    syncKplexToLeafEnabled: /** Preserve the tested off/recent/pinned eligibility boundary. */ () => context.settings.documentSyncMode !== "off",
    targetNoteLeaf: /** Supply an exact existing linked destination, with no inferred creation. */ () => context.target ?? leaf,
    validateSidecarLeaf: /** Resolve only this host's owned companion. */ owner => context.sidecarLeaves.get(owner) ?? null,
    leafIsAttached: /** Let each test retire exact native leaf ownership. */ candidate => leaves.has(candidate),
    adjacentPosition: /** This fixture owns a stable right-adjacent managed companion. */ () => "right",
    fileForLeaf: /** Report the loaded native file incarnation, independently from its string path. */ candidate => candidate?.file ?? null,
    webViewerUrlForLeaf: /** Expose native URL identity only for actual Web Viewer representations. */ candidate => candidate?.state.type === "webviewer" ? candidate.state.state.url : null,
    saveSettings: /** Count only persistence requested by actual production completion paths. */ async () => { context.writes++; },
    /** Companion notifications need no React surface in this bounded host-contract test. */
    notifySidecar() {},
    findRecentDocumentLeaf: /** One-shot commands receive the same explicitly supplied native target. */ () => context.target ?? leaf,
    /** The fixture already controls canonical attachment and target resolution. */
    validateLinkedDocumentLeaf() {}, linkedDocumentLeaf: leaf,
    ensureSidecarLeaf: /** Explicit provenance inspection uses the owned companion supplied by the fixture. */ () => leaf,
    leafDisplaysPage: production("leafDisplaysPage"),
    retirePassiveSidecarRequestsForLeaf: production("retirePassiveSidecarRequestsForLeaf"),
    openPageInSidecarLeaf: production("openPageInSidecarLeaf", {isWebViewerAvailable: /** Web Viewer availability is an explicit host capability, not part of identity comparison. */ () => true}),
    syncPageToDocumentLeaf: production("syncPageToDocumentLeaf"), syncSidecarToPage: production("syncSidecarToPage"),
  };
  return {context, host, leaf, files, leaves, opens, modes, page: {path: "opaque:A", file: pageFile}, other: {path: "opaque:B", file: otherFile}};
}

test("same exact linked file preserves Markdown/drawing representation in recent and pinned modes", /** Invoke both passive production routes and reject reopening or mode/persistence side effects. */ async () => {
  for (const mode of ["recent", "pinned"]) for (const type of ["markdown", "excalidraw"]) {
    const state = fixture(); state.context.settings.documentSyncMode = mode;
    state.leaf.file = state.page.file; state.leaf.state = {type, state: {file: state.page.file.path}};
    await state.context.syncPageToDocumentLeaf(state.page); await state.context.syncSidecarToPage(state.host, state.page);
    assert.equal(state.opens.length, 0); assert.equal(state.modes.length, 0); assert.equal(state.context.writes, 0);
    assert.equal(state.leaf.getViewState().type, type);
  }
});

test("passive follow still updates a genuinely different-file companion while preserving its originating drawing leaf", /** Distinguish the observed destination from a separately managed follower requiring real navigation. */ async () => {
  const state = fixture(), origin = {file: state.page.file, state: {type: "excalidraw"}};
  state.leaves.add(origin); state.context.target = origin;
  await state.context.syncPageToDocumentLeaf(state.page); await state.context.syncSidecarToPage(state.host, state.page);
  assert.equal(state.opens.length, 1); assert.equal(state.opens[0].leaf, state.leaf);
  assert.equal(state.leaf.file, state.page.file); assert.equal(state.modes[0].state.mode, "preview");
  assert.equal(state.context.writes, 1); assert.equal(origin.state.type, "excalidraw");
});

test("different canonical file identity opens even when an obsolete loaded incarnation has the same path", /** Prevent path equality from concealing deletion/recreation of the native file identity. */ async () => {
  const state = fixture(); state.leaf.file = {path: state.page.file.path};
  await state.context.syncPageToDocumentLeaf(state.page);
  assert.equal(state.opens.length, 1); assert.equal(state.opens[0].file, state.page.file);
});

test("off, unload, detached destinations and noncanonical targets reject passive document opens", /** Independently retire eligibility, plugin lifetime, destination and canonical file ownership. */ async () => {
  for (const condition of ["off", "unload", "detach", "replace-file"]) {
    const state = fixture();
    if (condition === "off") state.context.settings.documentSyncMode = "off";
    if (condition === "unload") state.context.unloading = true;
    if (condition === "detach") state.leaves.delete(state.leaf);
    if (condition === "replace-file") state.files.set(state.page.file.path, {path: state.page.file.path});
    await state.context.syncPageToDocumentLeaf(state.page); assert.equal(state.opens.length, 0);
  }
});

test("a newer A-to-B request retires A's awaited mode and persistence work", /** Hold the original native completion while a newer exact target fully synchronizes. */ async () => {
  const state = fixture(), pause = deferred(); state.leaf.pause = pause.promise;
  const older = state.context.syncSidecarToPage(state.host, state.page);
  await state.context.syncSidecarToPage(state.host, state.other);
  const modes = state.modes.length, writes = state.context.writes;
  pause.resolve(); await older;
  assert.equal(state.leaf.file, state.other.file); assert.equal(state.modes.length, modes);
  assert.equal(state.context.writes, writes); assert.equal(state.context.settings.sidecarLastFilePath, state.other.file.path);
});

test("duplicate same-target observations preserve an in-flight companion's source/preview completion", /** Model a native file-open echo before the configured initial Markdown mode has completed. */ async () => {
  const state = fixture(), pause = deferred(); state.leaf.pause = pause.promise;
  const pending = state.context.syncSidecarToPage(state.host, state.page);
  await state.context.syncSidecarToPage(state.host, state.page);
  assert.equal(state.opens.length, 1); assert.equal(state.modes.length, 0);
  pause.resolve(); await pending;
  assert.equal(state.modes.length, 1); assert.equal(state.modes[0].state.mode, "preview");
  assert.equal(state.context.writes, 1);
});

test("explicit same-file source inspection retires an older passive preview completion", /** Reproduce native state publication before await, then preserve the later deliberate source request. */ async () => {
  const state = fixture(), pause = deferred(); state.leaf.pause = pause.promise;
  const pending = state.context.syncSidecarToPage(state.host, state.page);
  await production("openMarkdownInSidecar").call(state.context, state.host, state.page.file, 7, true);
  const writes = state.context.writes;
  assert.equal(state.leaf.state.state.mode, "source");
  pause.resolve(); await pending;
  assert.equal(state.leaf.state.state.mode, "source");
  assert.deepEqual(state.modes.map(item => item.state.mode), ["source"]);
  assert.equal(state.context.writes, writes);
});

test("same-target observations before native file publication share one pending open", /** Reproduce the real native late-publication seam and preserve configured companion mode. */ async () => {
  const state = fixture(), pause = deferred(); state.leaf.pause = pause.promise; state.leaf.publishAfterAwait = true;
  const pending = state.context.syncSidecarToPage(state.host, state.page);
  assert.equal(state.leaf.file, state.other.file);
  await state.context.syncSidecarToPage(state.host, state.page);
  assert.equal(state.opens.length, 1);
  pause.resolve(); await pending;
  assert.equal(state.leaf.file, state.page.file); assert.equal(state.leaf.state.state.mode, "preview");
  assert.equal(state.context.writes, 1);
  // Completed matching requests do not conceal a later native navigation away from their target.
  state.leaf.file = state.other.file;
  await state.context.syncSidecarToPage(state.host, state.page);
  assert.equal(state.opens.length, 2);
});

test("a rejected native open releases pending ownership so the same target can retry", /** Preserve native error propagation without permanently suppressing a later valid follow request. */ async () => {
  const state = fixture(), original = state.leaf.openFile;
  state.leaf.openFile = /** Fail only the first native request; later calls use the unchanged host fixture. */ async function () {
    this.openFile = original;
    throw Error("Native open rejected");
  };
  await assert.rejects(state.context.syncSidecarToPage(state.host, state.page), /Native open rejected/);
  await state.context.syncSidecarToPage(state.host, state.page);
  assert.equal(state.opens.length, 1); assert.equal(state.leaf.state.state.mode, "preview");
  assert.equal(state.context.writes, 1);
});

test("explicit native opens retire only their managed destination's passive completion", /** Keep other Sidecar owners live while testing every explicit same-file native open route. */ async () => {
  for (const route of ["openInDocumentLeaf", "syncMostRecentTabWithKplex", "openPageInSidecarLeaf", "openSection", "setDocumentSyncMode", "relinkDocumentLeafToMostRecent"]) {
    const state = fixture(), pause = deferred(), otherHost = {}, otherLeaf = {};
    const otherLease = {leaf: otherLeaf};
    state.context.sidecarLeaves.set(otherHost, otherLeaf);
    state.context.passiveSidecarSyncRequests.set(otherHost, otherLease);
    state.leaf.pause = pause.promise;
    const pending = state.context.syncSidecarToPage(state.host, state.page);
    if (route === "openInDocumentLeaf") await production(route).call(state.context, state.page.file);
    if (route === "syncMostRecentTabWithKplex") await production(route).call(state.context, state.page);
    if (route === "openPageInSidecarLeaf") await state.context.openPageInSidecarLeaf(state.leaf, state.page);
    if (route === "setDocumentSyncMode") {
      state.context.isManagedSidecarLeaf = /** Report ownership from this fixture's exact managed inventory. */ leaf => [...state.context.sidecarLeaves.values()].includes(leaf);
      await production(route).call(state.context, "pinned", state.page);
    }
    if (route === "relinkDocumentLeafToMostRecent") await production(route).call(state.context, state.page);
    if (route === "openSection") {
      class TFile {}
      Object.setPrototypeOf(state.page.file, TFile.prototype);
      state.context.app.vault.getAbstractFileByPath = /** Resolve the exact source file for the production section route. */ path => state.files.get(path);
      await production(route, {TFile}).call(state.context, {transient: {sourcePath: state.page.file.path, subpath: "#Heading"}});
      assert.equal(state.opens.at(-1).options.eState.subpath, "#Heading");
    }
    const modes = state.modes.length, writes = state.context.writes;
    pause.resolve(); await pending;
    assert.equal(state.modes.length, modes, route); assert.equal(state.context.writes, writes, route);
    assert.equal(state.context.passiveSidecarSyncRequests.get(otherHost), otherLease, route);
  }
});

test("rename, replacement, detachment and unload fence late passive Markdown-mode writes", /** Mutate one captured ownership fact during the real awaited open and reject subsequent effects. */ async () => {
  for (const condition of ["rename", "replace-file", "replace-leaf", "detach-leaf", "detach-host", "unload"]) {
    const state = fixture(), pause = deferred(); state.leaf.pause = pause.promise;
    const pending = state.context.syncSidecarToPage(state.host, state.page);
    if (condition === "rename") state.page.file.path = "Renamed.md";
    if (condition === "replace-file") state.files.set(state.page.file.path, {path: state.page.file.path});
    if (condition === "replace-leaf") state.context.sidecarLeaves.set(state.host, {});
    if (condition === "detach-leaf") state.leaves.delete(state.leaf);
    if (condition === "detach-host") state.leaves.delete(state.host);
    if (condition === "unload") state.context.unloading = true;
    pause.resolve(); await pending;
    assert.equal(state.modes.length, 0, condition); assert.equal(state.context.writes, 0, condition);
  }
});

test("a changed native destination after await cannot receive the preceding file's mode", /** Retain the leaf while changing its loaded file, distinguishing identity from attachment alone. */ async () => {
  const state = fixture(), pause = deferred(); state.leaf.pause = pause.promise;
  const pending = state.context.syncSidecarToPage(state.host, state.page);
  state.leaf.file = state.other.file; state.leaf.state = {type: "markdown", state: {file: state.other.file.path}};
  pause.resolve(); await pending;
  assert.equal(state.modes.length, 0); assert.equal(state.context.writes, 0);
});

test("same URL and empty targets remain idempotent without changing native view state", /** Exercise native target equality for non-file companions without parsing opaque graph identities. */ async () => {
  for (const page of [{url: "https://example.com", path: "opaque:url"}, {path: "opaque:folder"}]) {
    const state = fixture(); state.leaf.file = null;
    state.leaf.state = page.url ? {type: "webviewer", state: {url: page.url}} : {type: "empty"};
    await state.context.syncSidecarToPage(state.host, page);
    assert.equal(state.opens.length, 0); assert.equal(state.modes.length, 0); assert.equal(state.context.writes, 0);
  }
});

test("explicit Open, one-shot sync and Go-to-source retain same-file navigation and source mode", /** Guard the deliberate navigation routes against accidental adoption of passive no-op policy. */ async () => {
  const state = fixture(); state.leaf.file = state.page.file;
  await production("openInDocumentLeaf").call(state.context, state.page.file);
  await production("syncMostRecentTabWithKplex").call(state.context, state.page);
  await production("openMarkdownInSidecar").call(state.context, state.host, state.page.file, 7, true);
  assert.equal(state.opens.length, 3); assert.equal(state.opens[0].options.active, true);
  assert.equal(state.modes.at(-1).state.mode, "source");
});

test("App document follow retains companion propagation while rejecting embedded and owning Plex leaves", /** Execute the actual App callback to retain real companion propagation and reject self-observation. */ () => {
  class FileView {}
  const state = fixture(), observed = [], view = new FileView(); view.leaf = state.leaf;
  const plugin = {isKplexLeafVisible: /** This test observes one visible native K-Plex surface. */ () => true,
    app: {workspace: {getActiveViewOfType: /** Reacquire the exact native active view after each test mutation. */ () => view}},
    shouldFollowDocumentFile: /** Approve only the captured canonical fixture file. */ file => file === state.page.file,
    index: {get: /** Resolve the fixture's exact published graph page. */ () => state.page}};
  const follow = production("followFile", {plugin, hostLeaf: state.host,
    activate: /** Capture production activation arguments, including whether document propagation is suppressed. */ (...args) => observed.push(args), FileView,
    isEmbeddedMarkdownLeaf: /** Mark the deliberately synthetic leaf used by the self-observation case. */ leaf => leaf === "embedded"}, "src/ui/App.tsx");
  follow(state.page.file); assert.deepEqual(observed, [[state.page, true]], "other destinations retain ordinary synchronization");
  view.leaf = state.host; follow(state.page.file); view.leaf = "embedded"; follow(state.page.file);
  assert.equal(observed.length, 1);
});
