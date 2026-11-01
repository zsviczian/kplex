/**
 * Tests the actual App observation callback and plugin passive synchronization methods against
 * bounded native workspace doubles. Exact destination identity and asynchronous follow retirement
 * are host contracts; native Excalidraw representation/focus acceptance belongs to the serial CLI lane.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import {build} from "esbuild";
const sessionBuild = await build({entryPoints:["src/ui/KplexDocumentSession.ts"],bundle:true,write:false,platform:"node",format:"esm"});
const {KplexDocumentSession} = await import('data:text/javascript;base64,' + Buffer.from(sessionBuild.outputFiles[0].text).toString('base64'));
const actionBuild=await build({entryPoints:['src/application/ActionManager.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {ActionManager}=await import('data:text/javascript;base64,'+Buffer.from(actionBuild.outputFiles[0].text).toString('base64'));
const actionNodeRef = page => ({identity:page.path,path:page.path,kind:page.file?"file":"ghost"});
import {loadPortableModules} from "./support/portableTypeScript.mjs";
const {exports: {DoubleTapGesture}} = loadPortableModules(["src/ui/components/DoubleTapGesture.ts"]);

/** Extract a real plugin method or App follow callback without invoking native plugin startup. */
function production(name, dependencies = {}, filename = "src/main.ts") {
  dependencies = {isEmbeddedMarkdownLeaf: leaf => Boolean(leaf?.embedded), nativeLeafId: (_workspace, leaf) => leaf?.id ?? null, ...dependencies};
  if (name === "activate" && filename === "src/ui/App.tsx") {
    dependencies.pendingEditorNavigation ??= {current:null};
    if (dependencies.documentSession) {dependencies.documentSession.plexView ??= {};dependencies.documentSession.plexView.editors ??= {bindings:[]};}
  }
  const source = ts.createSourceFile(filename, readFileSync(new URL(`../${filename}`, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  let expression;
  /** Preserve the production implementation and its asynchronous boundaries verbatim. */
  function visit(node) {
    if (["searchDestination", "graphDestination"].includes(name) && ts.isJsxAttribute(node) && node.name.getText(source) === "onActivate"
      && node.parent.parent.tagName.getText(source) === (name === "searchDestination" ? "SearchBox" : "PlexGraph")) expression = node.initializer.expression.getText(source);
    if (name === "centerPublication" && ts.isVariableDeclaration(node) && node.name.getText(source) === "refresh"
      && node.initializer && ts.isArrowFunction(node.initializer)
      && node.initializer.getText(source).includes("const trackedFile")) expression = node.initializer.getText(source);
    if (name === "navigationRequest" && ts.isCallExpression(node)
      && node.expression.getText(source) === "plugin.subscribeNavigation"
      && ts.isArrowFunction(node.arguments[0])) expression = node.arguments[0].getText(source);
    if (name === "presentationPublication" && ts.isCallExpression(node)
      && node.expression.getText(source) === "plugin.index.subscribePresentation"
      && ts.isArrowFunction(node.arguments[0])) expression = node.arguments[0].getText(source);
    if (name === "hostGeometryEffect" && ts.isCallExpression(node) && node.expression.getText(source) === "useEffect"
      && node.arguments[0]?.getText(source).includes("ResizeObserver")
      && node.arguments[0]?.getText(source).includes("setHostWidth")) expression = node.arguments[0].getText(source);
    if (ts.isPropertyAssignment(node) && node.name.getText(source) === '"node.open"'
      && ts.isCallExpression(node.initializer) && ["graphOpen", "graphOpenAvailability"].includes(name)) {
      expression = node.initializer.arguments[name === "graphOpen" ? 0 : 1].getText(source);
    }
    if (ts.isMethodDeclaration(node) && node.name.getText(source) === name) {
      const text = node.getText(source);
      expression = `${node.modifiers?.some(item => item.kind === ts.SyntaxKind.AsyncKeyword) ? "async " : ""}function ${name}${text.slice(text.indexOf("("))}`;
    }
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) {
      const value = node.initializer;
      expression = ts.isCallExpression(value) && value.expression.getText(source) === "useCallback" ? value.arguments[0].getText(source) : value.getText(source);
    }
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
    syncKplexToLeafEnabled: /** Preserve the tested off/recent/pinned eligibility boundary. */ () => context.session.preferences.documentSyncMode !== "off",
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
  const session = context.session = new KplexDocumentSession(context.settings, "host", () => {context.writes++;});
  session.preferences.documentSyncMode="pinned";session.linkedDocumentLeaf=leaf;
  context.documentSession = owner => (!owner || owner===host) && !session.disposed ? session : null;
  context.nativeDocumentRequests=new WeakMap();
  context.isManagedSidecarLeaf = candidate => [...context.sidecarLeaves.values()].includes(candidate);
  context.documentSyncTargetLeaf = () => context.target ?? leaf;
  context.syncPageToDocumentLeaf = production("syncPageToDocumentLeaf");
  context.setDocumentSyncMode=production("setDocumentSyncMode");
  context.deleteSidecarOwner=owner=>{context.sidecarLeaves.delete(owner);session.retire();};
  return {context, session, host, leaf, files, leaves, opens, modes, page: {path: "opaque:A", file: pageFile}, other: {path: "opaque:B", file: otherFile}};
}

/** Two actual session owners share only native/index host capabilities and the global saved settings. */
function twoPlexFixture() {
  const a=fixture(),b=fixture();
  for(const [oldPath,file] of [...b.files]) {b.files.delete(oldPath);file.path=`Other-${oldPath}`;b.files.set(file.path,file);a.files.set(file.path,file);}
  const sessions=new Map([[a.host,a.session],[b.host,b.session]]),context=a.context;
  a.host.view={};b.host.view={};
  for(const leaf of b.leaves)a.leaves.add(leaf);
  context.sidecarLeaves.set(b.host,b.leaf);
  context.documentSession=host=>!context.unloading&&sessions.get(host)&&!sessions.get(host).disposed&&a.leaves.has(host)?sessions.get(host):null;
  context.targetNoteLeaf=host=>sessions.get(host)?.linkedDocumentLeaf??null;
  context.getDocumentSyncMode=production("getDocumentSyncMode");
  context.syncKplexToLeafEnabled=production("syncKplexToLeafEnabled");context.syncLeafToKplexEnabled=production("syncLeafToKplexEnabled");
  context.documentSyncTargetLeaf=production("documentSyncTargetLeaf");
  context.deleteSidecarOwner=host=>{context.sidecarLeaves.delete(host);sessions.get(host)?.retire();context.passiveSidecarSyncRequests.delete(host);};
  context.shouldFollowDocumentFile=production("shouldFollowDocumentFile");
  return {a,b,context,sessions};
}

test("two Plex pairs navigate and change sync mode independently without mutating shared defaults",async()=>{
  const {a,b,context}=twoPlexFixture(),before=JSON.stringify(context.settings),pause=deferred();a.leaf.pause=pause.promise;
  const opening=context.syncPageToDocumentLeaf(a.page,a.host);
  await context.setDocumentSyncMode(b.host,"off");pause.resolve();await opening;
  assert.equal(a.leaf.file,a.page.file);assert.equal(b.opens.length,0);assert.equal(a.modes.length,1);
  assert.equal(a.session.preferences.documentSyncMode,"pinned");assert.equal(b.session.preferences.documentSyncMode,"off");
  assert.equal(context.sidecarLeaves.get(a.host),a.leaf);assert.equal(context.sidecarLeaves.has(b.host),false);
  assert.equal(JSON.stringify(context.settings),before,"Live modes are native-view state, never other devices' global settings");
  assert.equal(a.session.preferences.sidecarLastFilePath,a.page.file.path);assert.equal(b.session.preferences.sidecarLastFilePath,"");
});

test("native follow admits exact target leaves even when two panes display the very same TFile",()=>{
  const {a,b,context}=twoPlexFixture();context.startupInitializing=false;a.leaf.file=a.page.file;b.leaf.file=a.page.file;
  assert.equal(context.shouldFollowDocumentFile(a.page.file,a.host,a.leaf),true);
  assert.equal(context.shouldFollowDocumentFile(a.page.file,a.host,b.leaf),false);
  assert.equal(context.shouldFollowDocumentFile(a.page.file,b.host,b.leaf),true);
  assert.equal(context.shouldFollowDocumentFile(a.page.file,{},a.leaf),false);
});

test("Recent target resolution excludes another pair's managed Sidecar",()=>{
  const {a,b,context}=twoPlexFixture();
  context.deleteSidecarOwner(a.host);a.session.preferences.documentSyncMode="recent";
  context.recentLeafHistory=[a.leaf,b.leaf];context.pruneRecentLeafHistory=()=>{};
  context.isDocumentLeafCandidate=(leaf,host)=>Boolean(leaf?.getViewState)&&(!context.isManagedSidecarLeaf(leaf)||context.sidecarLeaves.get(host)===leaf);context.leafIsVisible=()=>true;context.leafViewIsLoaded=()=>true;
  context.app.workspace.getMostRecentLeaf=()=>b.leaf;context.app.workspace.iterateAllLeaves=callback=>[a.leaf,b.leaf].forEach(callback);
  context.findRecentDocumentLeaf=production("findRecentDocumentLeaf");
  assert.equal(context.findRecentDocumentLeaf(a.host),a.leaf);
  context.recentLeafHistory=[b.leaf];a.session.lastDocumentLeaf=null;context.lastDocumentLeaf=b.leaf;
  assert.equal(context.findRecentDocumentLeaf(a.host),a.leaf,"Fallback traversal cannot steal B's managed companion");
});

test("a closed/reopened native Plex rejects old completion while its non-cancellable open drains before the replacement",async()=>{
  const {a,context,sessions}=twoPlexFixture(),pause=deferred();a.leaf.pause=pause.promise;a.leaf.publishAfterAwait=true;
  const previous=context.syncSidecarToPage(a.host,a.page);a.session.dispose();a.host.view={replacement:true};
  const replacement=new KplexDocumentSession(context.settings,"replacement",()=>{context.replacementWrites=(context.replacementWrites??0)+1;});
  replacement.linkedDocumentLeaf=a.leaf;replacement.preferences.documentSyncMode="pinned";sessions.set(a.host,replacement);
  const next=context.syncSidecarToPage(a.host,a.other);assert.equal(a.opens.length,1);
  pause.resolve();await Promise.all([previous,next]);assert.equal(a.leaf.file,a.other.file);
  assert.equal(a.modes.length,1);assert.equal(a.context.writes,0);assert.equal(context.replacementWrites,1);
});

test("ordinary native destinations share the same serialized route and late stale owners cannot publish",async()=>{
  const {a,b,context}=twoPlexFixture(),pause=deferred();context.deleteSidecarOwner(a.host);context.deleteSidecarOwner(b.host);
  a.leaf.pause=pause.promise;a.leaf.publishAfterAwait=true;context.documentSyncTargetLeaf=()=>a.leaf;
  const first=context.syncSidecarToPage(a.host,a.page,a.leaf),next=context.syncSidecarToPage(b.host,b.page,a.leaf);
  assert.equal(a.opens.length,1);pause.resolve();await Promise.all([first,next]);
  assert.equal(a.leaf.file,b.page.file);assert.equal(a.modes.length,0);assert.equal(a.opens.length,2);
  assert.equal(a.context.writes,0);assert.equal(b.context.writes,1);
});

test("ordinary same-target requests from two Plex owners join one native open without reapplying representation",async()=>{
  const {a,b,context}=twoPlexFixture(),pause=deferred();context.deleteSidecarOwner(a.host);context.deleteSidecarOwner(b.host);
  a.leaf.pause=pause.promise;a.leaf.publishAfterAwait=true;context.documentSyncTargetLeaf=()=>a.leaf;
  const first=context.syncSidecarToPage(a.host,a.page,a.leaf),second=context.syncSidecarToPage(b.host,a.page,a.leaf);
  pause.resolve();await Promise.all([first,second]);assert.equal(a.opens.length,1);assert.equal(a.modes.length,0);assert.equal(a.leaf.file,a.page.file);
});

test("ordinary pinned URL navigation shares target equality and exact source-leaf follow admission",async()=>{
  const state=fixture(),url="https://example.com/kplex-187",page={file:null,url};state.context.sidecarLeaves.delete(state.host);
  state.leaf.file=null;state.leaf.state={type:"webviewer",state:{url:"https://example.com/previous"}};
  await state.context.syncPageToDocumentLeaf(page,state.host);assert.equal(state.leaf.state.state.url,url);assert.equal(state.modes.length,1);
  await state.context.syncPageToDocumentLeaf(page,state.host);assert.equal(state.modes.length,1,"Same URL observation cannot reopen the native representation");
  state.context.startupInitializing=false;state.context.syncLeafToKplexEnabled=()=>true;state.context.indexedUrlPathForLeaf=()=>url;
  const follow=production("getDocumentFollowUrl");assert.deepEqual(follow.call(state.context,state.host,state.leaf),{path:url,url});
  assert.equal(follow.call(state.context,state.host,{...state.leaf}),null);
});

test("pending native follow captures a leaf as well as the canonical file and rejects a same-file target replacement",()=>{
  const {a,b,context}=twoPlexFixture();context.startupInitializing=false;a.leaf.file=a.page.file;b.leaf.file=a.page.file;
  const intent=production("captureDocumentFollow").call(context,a.page.file,a.host);assert.equal(intent.leaf,a.leaf);assert.equal(intent.revision,a.session.revision);
  a.session.linkedDocumentLeaf=b.leaf;
  assert.equal(context.shouldFollowDocumentFile(a.page.file,a.host,intent.leaf),false,"Matching file paths and unchanged host epochs do not authorize another native leaf");
});

test("same exact linked file preserves Markdown/drawing representation in recent and pinned modes", /** Invoke both passive production routes and reject reopening or mode/persistence side effects. */ async () => {
  for (const mode of ["recent", "pinned"]) for (const type of ["markdown", "excalidraw"]) {
    const state = fixture(); state.context.session.preferences.documentSyncMode = mode;
    state.leaf.file = state.page.file; state.leaf.state = {type, state: {file: state.page.file.path}};
    await state.context.syncPageToDocumentLeaf(state.page,state.host); await state.context.syncSidecarToPage(state.host, state.page);
    assert.equal(state.opens.length, 0); assert.equal(state.modes.length, 0); assert.equal(state.context.writes, 0);
    assert.equal(state.leaf.getViewState().type, type);
  }
});

test("passive follow still updates a genuinely different-file companion while preserving its originating drawing leaf", /** Distinguish the observed destination from a separately managed follower requiring real navigation. */ async () => {
  const state = fixture(), origin = {file: state.page.file, state: {type: "excalidraw"}};
  state.leaves.add(origin); state.context.target = origin;
  await state.context.syncPageToDocumentLeaf(state.page,state.host); await state.context.syncSidecarToPage(state.host, state.page);
  assert.equal(state.opens.length, 1); assert.equal(state.opens[0].leaf, state.leaf);
  assert.equal(state.leaf.file, state.page.file); assert.equal(state.modes[0].state.mode, "preview");
  assert.equal(state.context.writes, 1); assert.equal(origin.state.type, "excalidraw");
});

test("different canonical file identity opens even when an obsolete loaded incarnation has the same path", /** Prevent path equality from concealing deletion/recreation of the native file identity. */ async () => {
  const state = fixture(); state.leaf.file = {path: state.page.file.path};
  await state.context.syncPageToDocumentLeaf(state.page,state.host);
  assert.equal(state.opens.length, 1); assert.equal(state.opens[0].file, state.page.file);
});

test("off, unload, detached destinations and noncanonical targets reject passive document opens", /** Independently retire eligibility, plugin lifetime, destination and canonical file ownership. */ async () => {
  for (const condition of ["off", "unload", "detach", "replace-file"]) {
    const state = fixture();
    if (condition === "off") state.context.session.preferences.documentSyncMode = "off";
    if (condition === "unload") state.context.unloading = true;
    if (condition === "detach") state.leaves.delete(state.leaf);
    if (condition === "replace-file") state.files.set(state.page.file.path, {path: state.page.file.path});
    await state.context.syncPageToDocumentLeaf(state.page,state.host); assert.equal(state.opens.length, 0);
  }
});

test("a newer A-to-B request retires A's awaited mode and persistence work", /** Hold the original native completion while a newer exact target fully synchronizes. */ async () => {
  const state = fixture(), pause = deferred(); state.leaf.pause = pause.promise;
  const older = state.context.syncSidecarToPage(state.host, state.page);
  const newer = state.context.syncSidecarToPage(state.host, state.other);
  pause.resolve(); await Promise.all([older, newer]);
  assert.equal(state.leaf.file, state.other.file); assert.equal(state.modes.length, 1);
  assert.equal(state.context.writes, 1); assert.equal(state.session.preferences.sidecarLastFilePath, state.other.file.path);
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
  const explicit = production("openMarkdownInSidecar").call(state.context, state.host, state.page.file, 7, true);
  pause.resolve(); await Promise.all([pending, explicit]);
  const writes = state.context.writes;
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

test("App navigation shares one managed Sidecar open across both passive routes", /** Reproduce the production App dispatch overlap while native file publication is still pending. */ async () => {
  const state = fixture(), app = appFollowFixture(), pause = deferred();
  state.leaf.pause = pause.promise; state.leaf.publishAfterAwait = true;
  const completions = [];
  app.state.plugin.syncPageToDocumentLeaf = /** Retain the actual linked route's completion for assertion. */ page => {
    const task = state.context.syncPageToDocumentLeaf(page,state.host); completions.push(task); return task;
  };
  app.state.plugin.syncSidecarToPage = /** Retain the actual managed route without replacing its request owner. */ (_host, page) => {
    const task = state.context.syncSidecarToPage(state.host, page); completions.push(task); return task;
  };
  app.state.activate(state.page);
  const count = state.opens.length;
  pause.resolve(); await Promise.all(completions);
  assert.equal(count, 1, "One center request must not open its pinned managed companion twice");
  assert.equal(state.leaf.file, state.page.file); assert.equal(state.leaf.state.state.mode, "preview");
  assert.equal(state.context.writes, 1);
  assert.equal(state.session.lastDocumentLeaf, state.leaf, "Delegation preserves the linked destination's native recent-leaf bookkeeping");
});

test("linked routing cannot bypass a managed Sidecar's supersession fences", /** A newer completion must own representation and persistence even when the older request came from linked-tab sync. */ async () => {
  const state = fixture(), pause = deferred(); state.leaf.pause = pause.promise;
  const old = state.context.syncPageToDocumentLeaf(state.page,state.host);
  const newer = state.context.syncSidecarToPage(state.host, state.other);
  pause.resolve(); await Promise.all([old, newer]);
  assert.equal(state.leaf.file, state.other.file);
  assert.equal(state.modes.length, 1); assert.equal(state.context.writes, 1);
});

test("rapid Sidecar targets wait for the native open and skip superseded queued files", /** Obsidian may coalesce overlapping opens; only the last queued target may start after the current native operation. */ async () => {
  const state = fixture(), pause = deferred(), latestFile = {path: "C.md"};
  state.files.set(latestFile.path, latestFile); state.leaf.pause = pause.promise; state.leaf.publishAfterAwait = true;
  const first = state.context.syncSidecarToPage(state.host, state.page);
  const middle = state.context.syncSidecarToPage(state.host, state.other);
  const latest = state.context.syncSidecarToPage(state.host, {path: "opaque:C", file: latestFile});
  const before = state.opens.length;
  pause.resolve(); await Promise.all([first, middle, latest]);
  assert.equal(before, 1, "Native opens on one managed leaf must not overlap");
  assert.deepEqual(state.opens.map(open => open.file), [state.page.file, latestFile]);
  assert.equal(state.leaf.file, latestFile); assert.equal(state.modes.length, 1); assert.equal(state.context.writes, 1);
});

test("A-to-B-to-A finishes its original native mode without reopening A", /** Returning to the in-flight target must inherit initial representation work that its retired request can no longer apply. */ async () => {
  const state = fixture(), pause = deferred(); state.leaf.pause = pause.promise;
  const first = state.context.syncSidecarToPage(state.host, state.page);
  const middle = state.context.syncSidecarToPage(state.host, state.other);
  const latest = state.context.syncSidecarToPage(state.host, state.page);
  pause.resolve(); await Promise.all([first, middle, latest]);
  assert.equal(state.opens.length, 1); assert.equal(state.leaf.file, state.page.file);
  assert.equal(state.leaf.state.state.mode, "preview"); assert.equal(state.modes.length, 1);
  assert.equal(state.context.writes, 1);
});

test("the next Sidecar target does not wait for an earlier settings write", /** Serialize only native representation work; slow unrelated persistence cannot hold the foreground document queue. */ async () => {
  const state = fixture(), disk = deferred();
  state.context.saveSettings = /** Keep the first write pending independently of the completed native open. */ async () => {
    state.context.writes++; if (state.context.writes === 1) await disk.promise;
  };
  const first = state.context.syncSidecarToPage(state.host, state.page);
  for (let i = 0; i < 4; i++) await Promise.resolve();
  assert.equal(state.context.writes, 1);
  const next = state.context.syncSidecarToPage(state.host, state.other);
  for (let i = 0; i < 4; i++) await Promise.resolve();
  const opens = state.opens.length;
  disk.resolve(); await Promise.all([first, next]);
  assert.equal(opens, 2, "Completed native opening must release the queue before disk persistence");
  assert.equal(state.leaf.file, state.other.file);
});

test("queued Sidecar work retires before opening on unload, detach, rename or explicit supersession", /** Recheck native ownership and canonical identity after the predecessor releases its queue slot. */ async () => {
  for (const condition of ["unload", "detach", "rename", "explicit"]) {
    const state = fixture(), pause = deferred(); state.leaf.pause = pause.promise;
    const first = state.context.syncSidecarToPage(state.host, state.page);
    const next = state.context.syncSidecarToPage(state.host, state.other);
    if (condition === "unload") state.context.unloading = true;
    if (condition === "detach") state.leaves.delete(state.leaf);
    if (condition === "rename") state.other.file.path = "Renamed.md";
    if (condition === "explicit") state.context.retirePassiveSidecarRequestsForLeaf(state.leaf);
    pause.resolve(); await Promise.all([first, next]);
    assert.equal(state.opens.length, 1, condition); assert.equal(state.modes.length, 0, condition);
    assert.equal(state.context.writes, 0, condition);
  }
});

test("a rejected native predecessor releases the newest queued Sidecar target", /** A real failure keeps its caller's rejection but cannot strand a later foreground navigation. */ async () => {
  const state = fixture(), pause = deferred(), open = state.leaf.openFile;
  state.leaf.openFile = /** Reject the first native operation after the newer target has queued. */ async function () {
    this.openFile = open; await pause.promise; throw Error("Native predecessor failed");
  };
  const first = state.context.syncSidecarToPage(state.host, state.page);
  const next = state.context.syncSidecarToPage(state.host, state.other);
  // The queued target initially displays; move away before completion to require an actual retry.
  state.leaf.file = state.page.file;
  pause.resolve();
  const results = await Promise.allSettled([first, next]);
  assert.equal(results[0].status, "rejected"); assert.equal(results[1].status, "fulfilled");
  assert.equal(state.leaf.file, state.other.file); assert.equal(state.opens.length, 1);
  assert.equal(state.modes.length, 1); assert.equal(state.context.writes, 1);
});

test("a superseded Sidecar file-open echo cannot become a new center intent", /** Suppress only the exact known native operation; unrelated manual files and explicit retirement still remain eligible. */ async () => {
  const state = fixture(), pause = deferred(), manual = {path: "Manual.md"}; state.files.set(manual.path, manual);
  state.context.startupInitializing = false;
  state.context.syncLeafToKplexEnabled = /** Follow remains enabled independently of the pending native operation. */ () => true;
  state.leaf.pause = pause.promise;
  const first = state.context.syncSidecarToPage(state.host, state.page);
  const latest = state.context.syncSidecarToPage(state.host, state.other);
  state.leaf.file = state.page.file; // The still-opening native operation publishes its older file.
  const eligible = production("shouldFollowDocumentFile").call(state.context,state.page.file,state.host,state.leaf);
  state.leaf.file = manual;
  assert.equal(production("shouldFollowDocumentFile").call(state.context,manual,state.host,state.leaf), true);
  state.leaf.file = state.page.file;
  state.context.retirePassiveSidecarRequestsForLeaf(state.leaf);
  assert.equal(production("shouldFollowDocumentFile").call(state.context,state.page.file,state.host,state.leaf), true);
  pause.resolve(); await Promise.all([first, latest]);
  assert.equal(eligible, false, "The older native echo must not retire the newest graph navigation");
  assert.equal(state.modes.length, 0); assert.equal(state.context.writes, 0);
});

test("passive native opening skips an already correct Markdown mode while explicit opening reapplies it", /** Avoid redundant host state work after a genuine file change without weakening deliberate representation requests. */ async () => {
  const state = fixture(); state.session.preferences.sidecarMarkdownMode = "source";
  await state.context.syncSidecarToPage(state.host, state.page);
  assert.equal(state.opens.length, 1); assert.equal(state.modes.length, 0);
  await state.context.openPageInSidecarLeaf(state.leaf,state.page,undefined,state.host);
  assert.equal(state.opens.length, 2); assert.equal(state.modes.length, 1);
});

test("explicit native opens retire only their managed destination's passive completion", /** Keep other Sidecar owners live while testing every explicit same-file native open route. */ async () => {
  for (const route of ["openInDocumentLeaf", "syncMostRecentTabWithKplex", "openPageInSidecarLeaf", "openSection", "setDocumentSyncMode", "relinkDocumentLeafToMostRecent"]) {
    const state = fixture(), pause = deferred(), otherHost = {}, otherLeaf = {};
    const otherLease = {leaf: otherLeaf};
    state.context.sidecarLeaves.set(otherHost, otherLeaf);
    state.context.passiveSidecarSyncRequests.set(otherHost, otherLease);
    state.leaf.pause = pause.promise;
    const pending = state.context.syncSidecarToPage(state.host, state.page);
    let explicit;
    if (route === "openInDocumentLeaf") explicit = production(route).call(state.context,state.page.file,state.host);
    if (route === "syncMostRecentTabWithKplex") explicit = production(route).call(state.context,state.page,state.host);
    if (route === "openPageInSidecarLeaf") explicit = state.context.openPageInSidecarLeaf(state.leaf,state.page,undefined,state.host);
    if (route === "setDocumentSyncMode") {
      state.context.isManagedSidecarLeaf = /** Report ownership from this fixture's exact managed inventory. */ leaf => [...state.context.sidecarLeaves.values()].includes(leaf);
      explicit = production(route).call(state.context,state.host,"pinned",state.page);
    }
    if (route === "relinkDocumentLeafToMostRecent") explicit = production(route).call(state.context,state.host,state.page);
    if (route === "openSection") {
      class TFile {}
      Object.setPrototypeOf(state.page.file, TFile.prototype);
      state.context.app.vault.getAbstractFileByPath = /** Resolve the exact source file for the production section route. */ path => state.files.get(path);
      explicit = production(route, {TFile}).call(state.context,{transient:{sourcePath:state.page.file.path,subpath:"#Heading"}},state.host);
    }
    assert.equal(state.opens.length, 1, "Explicit native work waits for the non-cancellable earlier open");
    pause.resolve(); await Promise.all([pending, explicit]);
    assert(state.modes.length <= 1, route);
    if (route === "openSection") assert.equal(state.opens.at(-1).options.eState.subpath, "#Heading");
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
  await production("openInDocumentLeaf").call(state.context,state.page.file,state.host);
  await production("syncMostRecentTabWithKplex").call(state.context,state.page,state.host);
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
    observeDocumentFollow: /** The dedicated owner receives eligible files even before publication. */ file => observed.push(file), FileView,
    isEmbeddedMarkdownLeaf: /** Mark the deliberately synthetic leaf used by the self-observation case. */ leaf => leaf === "embedded"}, "src/ui/App.tsx");
  follow(state.page.file); assert.deepEqual(observed, [state.page.file]);
  view.leaf = state.host; follow(state.page.file); view.leaf = "embedded"; follow(state.page.file);
  assert.equal(observed.length, 1);
});

/** Execute the actual App follow owners with independently controlled visibility, eligibility and publication. */
function appFollowFixture() {
  const files = new Map(["A.md", "B.md", "C.md"].map(path => [path, {path}]));
  const pages = new Map([...files].map(([path, file]) => [path, {path, file}]));
  const state = {actionNodeRef,documentSession:{centerPath:null,revision:0,pendingFollow:null,persist(){},footprints:{accept(){}}},visible: true, mode: "recent", current: files.get("B.md"), renderPath: "A.md", activates: [], companions: [], demands: [], releases: [],
    demandCounts: new Map(), ephemeral: new Set(), borrowedFrom: new Map(), graphActionPorts: {current: null}, wander: {pause() {}}, wasLeafVisibleRef: {current: true},
    pendingDocumentDemandRef: {current: null},
    pendingDocumentFollowRef: {current: null}, pendingFileExplorerDropRef: {current: null},
    activePathRef: {current: "A.md"}, activePageRef: {current: pages.get("A.md")}, activeFileRef: {current: files.get("A.md")}, hostLeaf: {}};
  const plugin = state.plugin = {
    settings: {navigationHistory: ["A.md"]}, saveSettings: /** Settings persistence is independent from demand publication in this test. */ async () => {},
    app: {vault: {getFileByPath: /** Resolve a real current file incarnation. */ path => files.get(path) ?? null}},
    index: {get: /** A neighboring preview may be borrowed until its owning center's final lease disappears. */ path => {
      const borrowedOwner = state.borrowedFrom.get(path);
      // Acquiring this endpoint does not synchronously move the previous center's preview into its own scope.
      if (borrowedOwner) return state.demandCounts.get(borrowedOwner) ? pages.get(path) : undefined;
      return state.ephemeral.has(path) && !state.demandCounts.get(path) ? undefined : pages.get(path);
    },
      acquireSemanticDemand: /** Count exact-center acquisition and its precise release lifetime. */ path => {
        state.demands.push(path); state.demandCounts.set(path,(state.demandCounts.get(path)??0)+1);
        state.onAcquire?.(path);
        return /** Retire only this acquired missing-center demand. */ () => {
          state.releases.push(path); state.demandCounts.set(path,(state.demandCounts.get(path)??0)-1);
        };
      }},
    isKplexLeafVisible: /** Hidden state must not be confused with file ownership. */ () => state.visible,
    shouldFollowDocumentFile: /** Represent off and pinned/recent ownership independently from index readiness. */ file => state.mode !== "off" && state.current === file,
    getDocumentFollowFile: /** Resolve the current eligible native file when the sidebar itself has acquired focus. */ () => state.mode === "off" ? null : state.current,
    captureDocumentFollow: /** The native target and epoch survive while the actual App owns partial-index admission. */ file => state.mode === "off" || state.current !== file ? null : {file,leaf:state.hostLeaf,revision:state.documentSession.revision},
    syncPageToDocumentLeaf: /** Capture companion propagation without native timing in this App test. */ page => state.companions.push(["document", page]),
    syncSidecarToPage: /** Keep separately managed companions observable on same-file echoes. */ (host, page) => state.companions.push(["sidecar", page]),
  };
  const dependencies = {...state, plugin, nodeId: id => id, translate: key => key,
    Notice: class {constructor(message){(state.notices??=[]).push(message)}}, activatePendingDocumentUrl(){},
    releasePendingDocumentDemand: production("releasePendingDocumentDemand", state, "src/ui/App.tsx"),
    setNavigationOrigin: /** Observe the exact motion policy supplied to the graph. */ origin => { state.origin = origin; },
    setActivePath: /** A visible render reads only the latest native requested path. */ path => { state.renderPath = path; },
    setHistoryCursor: /** Cursor changes are retained by the tested App activation but are immaterial to its demand ownership. */ () => {}};
  const activate = production("activate",dependencies,"src/ui/App.tsx");
  dependencies.restoreAcceptedDocumentCenter=production("restoreAcceptedDocumentCenter",dependencies,"src/ui/App.tsx");
  state.activate = activate;
  dependencies.activate = /** Observe the real activation arguments without replacing its demand handover or native synchronization logic. */ (page,...args) => {
    state.activates.push([page.path,...args]); activate(page,...args);
  };
  state.flush = production("activatePendingDocumentFollow", dependencies, "src/ui/App.tsx");
  state.releaseDemand = dependencies.releasePendingDocumentDemand;
  state.handover = production("acknowledgeDocumentDemandHandover",dependencies,"src/ui/App.tsx");
  state.observe = production("observeDocumentFollow", {...dependencies, activatePendingDocumentFollow: state.flush}, "src/ui/App.tsx");
  state.presentation = production("presentationPublication", {...dependencies, activatePendingDocumentFollow: state.flush,
    forcePaint: () => { state.paintRenders = (state.paintRenders ?? 0) + 1; },
    forceRender: /** Observe the actual render-only publication after pending settlement. */ () => { state.presentationRenders = (state.presentationRenders ?? 0) + 1; }}, "src/ui/App.tsx");
  state.reconcile = production("reconcileDocumentFollowVisibility", {...dependencies, activatePendingDocumentFollow: state.flush, observeDocumentFollow: state.observe,
    forceRender: /** Count visible geometry catch-up without synthesizing a plugin visibility notification. */ () => { state.visibilityRenders = (state.visibilityRenders ?? 0) + 1; }}, "src/ui/App.tsx");
  return {state, files, pages, dependencies};
}

/** Publication remaps only a surface's accepted ghost identity, independently from shared last-active settings. */
test("centered ghost materialization preserves two Plex centers without navigation or document events",()=>{
  const f=appFollowFixture(),ghost={path:"Projects/Ghost",file:null};f.pages.set(ghost.path,ghost);
  const other={activePathRef:{current:"A.md"},activePageRef:{current:f.pages.get("A.md")},activeFileRef:{current:f.files.get("A.md")}};
  const center={activePathRef:{current:ghost.path},activePageRef:{current:ghost},activeFileRef:{current:null}};
  f.state.plugin.settings.lastActivePath="A.md";let refreshes=0;
  const bind=refs=>production("centerPublication",{...refs,plugin:f.state.plugin,hostLeaf:f.state.hostLeaf,
    activatePendingDocumentFollow(){},activatePendingDocumentUrl(){},setActivePath:path=>{refs.renderPath=path;},forceRender:()=>refreshes++},"src/ui/App.tsx");
  const centerPublication=bind(center),otherPublication=bind(other);
  const oldPath=ghost.path,file={path:"Other/Ghost.md"};f.files.set(file.path,file);f.pages.delete(oldPath);
  ghost.path=file.path;ghost.file=file;f.pages.set(file.path,ghost);
  centerPublication();otherPublication();
  assert.equal(center.activePathRef.current,file.path);assert.equal(center.activeFileRef.current,file);
  assert.equal(other.activePathRef.current,"A.md");assert.equal(other.renderPath,undefined);
  assert.deepEqual(f.state.plugin.settings.navigationHistory,["A.md"]);assert.equal(f.state.plugin.settings.lastActivePath,"A.md");
  assert.equal(f.state.companions.length,0);assert.equal(f.state.activates.length,0);assert.equal(refreshes,2);
});

/** Replacement pages and unrelated publications do not inherit the earlier accepted center's authority. */
test("center remapping rejects retired ghost objects, native replacements and unrelated publications",()=>{
  for(const mode of ["replacement-page","replacement-at-old-path","replacement-file","unrelated"]){
    const f=appFollowFixture(),ghost={path:"Projects/Ghost",file:null},refs={activePathRef:{current:"Projects/Ghost"},activePageRef:{current:ghost},activeFileRef:{current:null}};
    f.pages.set(ghost.path,ghost);let moves=0;
    const publish=production("centerPublication",{...refs,plugin:f.state.plugin,hostLeaf:f.state.hostLeaf,
      activatePendingDocumentFollow(){},activatePendingDocumentUrl(){},setActivePath:()=>moves++,forceRender(){}},"src/ui/App.tsx");
    const file={path:"Other/Ghost.md"};
    if(mode!=="unrelated"){
      f.pages.delete(ghost.path);ghost.path=file.path;ghost.file=file;f.files.set(file.path,file);f.pages.set(file.path,ghost);
      if(mode==="replacement-page")f.pages.set(file.path,{path:file.path,file});
      if(mode==="replacement-at-old-path")f.pages.set("Projects/Ghost",{path:"Projects/Ghost",file:null});
      if(mode==="replacement-file")f.files.set(file.path,{path:file.path});
    }
    publish();assert.equal(refs.activePathRef.current,"Projects/Ghost");assert.equal(moves,0);
  }
});

/** Explicit navigation continues through the established activation route, including its intentional sync/history effects. */
test("ordinary navigation requests still activate after local identity remapping support",()=>{
  const f=appFollowFixture(),requested=[];
  const request=production("navigationRequest",{plugin:f.state.plugin,activate:(...args)=>requested.push(args)},"src/ui/App.tsx");
  request("B.md");request("missing.md");
  assert.deepEqual(requested,[[f.pages.get("B.md"),true]]);
});

test("native URL follow retains hidden/unpublished intent, fences owner changes and accepts exactly once",()=>{
  const {state,pages}=appFollowFixture(),leaf={},url="https://example.com/pending";
  let native={path:null,url};state.visible=false;
  state.plugin.getDocumentFollowUrl=(_host,source)=>source===leaf?native:null;
  const dependencies={...state,plugin:state.plugin,activate:state.activate,restoreAcceptedDocumentCenter(){},
    releasePendingDocumentDemand:state.releaseDemand};
  const complete=production("activatePendingDocumentUrl",dependencies,"src/ui/App.tsx");
  const observe=production("observeDocumentUrl",{...dependencies,activatePendingDocumentUrl:complete},"src/ui/App.tsx");
  observe(leaf);const intent=state.documentSession.pendingUrl;assert.equal(intent.leaf,leaf);
  state.visible=true;complete();assert.equal(state.documentSession.centerPath,null);assert.deepEqual(state.demands,[]);
  native={path:"opaque:url",url};pages.set(native.path,{path:native.path,url,file:null});complete();complete();
  assert.equal(state.documentSession.centerPath,"opaque:url");assert.equal(state.documentSession.pendingUrl,null);
  assert.deepEqual(state.plugin.settings.navigationHistory,["A.md","opaque:url"]);
  state.activePathRef.current="A.md";state.documentSession.pendingUrl=intent;state.documentSession.revision++;complete();
  assert.equal(state.documentSession.pendingUrl,null);assert.equal(state.documentSession.centerPath,"opaque:url");
  state.documentSession.pendingUrl={...intent,revision:state.documentSession.revision};native={path:"other:url",url:"https://example.com/newer"};complete();
  assert.equal(state.documentSession.pendingUrl,null);assert.deepEqual(state.demands,[]);
  native={path:"canonical:root",url:"https://example.com"};pages.set(native.path,{path:native.path,url:"https://example.com/",file:null});observe(leaf);
  assert.equal(state.documentSession.centerPath,"canonical:root","Verified native source follows the existing canonical URL mapping");
});

test("hidden follow retains only the newest native identity and settles immediately on reveal without user motion", /** Hidden observations cannot activate or render the old/intermediate scenes. */ () => {
  const {state, files} = appFollowFixture(); state.visible = false;
  state.observe(files.get("B.md")); state.current = files.get("C.md"); state.observe(state.current); state.flush();
  assert.equal(state.renderPath, "A.md"); assert.equal(state.activates.length, 0);
  assert.equal(state.pendingDocumentFollowRef.current, files.get("C.md"));
  state.visible = true; state.flush();
  assert.deepEqual(state.activates, [["C.md", true, true, "follow"]]); assert.equal(state.origin, "follow");
});

test("missing index entries keep the native path while hydration and rapid switches retire obsolete follow", /** Missing targets never force a history/folder activation, and an old publication cannot win. */ () => {
  const {state, files, pages} = appFollowFixture(), b = pages.get("B.md"), c = pages.get("C.md");
  pages.delete("B.md"); pages.delete("C.md");
  state.observe(files.get("B.md")); assert.equal(state.renderPath, "B.md"); assert.equal(state.activates.length, 0);
  state.current = files.get("C.md"); state.observe(state.current); assert.equal(state.renderPath, "C.md");
  pages.set("B.md", b); state.flush(); assert.equal(state.activates.length, 0);
  pages.set("C.md", c); state.flush(); assert.deepEqual(state.activates, [["C.md", true, true, "follow"]]);
});

test("missing-center demand is acquired once only when visible and released on supersession, settlement, hiding and teardown", /** The empty App surface retains an exact semantic request without creating a second scheduler or leaking a hidden lease. */ () => {
  const {state, files, pages} = appFollowFixture(), c = pages.get("C.md");
  pages.delete("B.md"); pages.delete("C.md"); state.visible = false; state.observe(files.get("B.md"));
  assert.equal(state.demands.length,0); state.visible = true; state.flush(); state.flush(); assert.deepEqual(state.demands,["B.md"]);
  state.current=files.get("C.md");state.observe(state.current);assert.deepEqual(state.releases,["B.md"]);assert.deepEqual(state.demands,["B.md","C.md"]);
  state.visible=false;state.flush();assert.deepEqual(state.releases,["B.md","C.md"]);state.visible=true;state.flush();
  pages.set("C.md",c);state.flush();assert.deepEqual(state.releases,["B.md","C.md"]);state.handover("C.md");assert.deepEqual(state.releases,["B.md","C.md","C.md"]);
  state.current=files.get("B.md");state.observe(state.current);state.releaseDemand();state.releaseDemand();assert.deepEqual(state.releases,["B.md","C.md","C.md","B.md"]);
});

test("App-to-graph handover preserves preview-backed pages without a zero-demand gap", /** The fixture destroys preview readability on final release, exposing premature settlement cleanup. */ () => {
  const {state,files,pages}=appFollowFixture(),page=pages.get("B.md");pages.delete("B.md");state.ephemeral.add("B.md");state.observe(files.get("B.md"));
  pages.set("B.md",page);state.flush();state.flush();assert.equal(state.plugin.index.get("B.md"),page);assert.equal(state.demandCounts.get("B.md"),1);
  state.handover("obsolete.md");assert.equal(state.demandCounts.get("B.md"),1);
  const releaseGraph=state.plugin.index.acquireSemanticDemand("B.md");state.handover("B.md");
  assert.equal(state.demandCounts.get("B.md"),1);assert.equal(state.plugin.index.get("B.md"),page);
  releaseGraph();assert.equal(state.plugin.index.get("B.md"),undefined);
});

test("presentation-only native preview publication settles a missing follow before graph handover", /** Host previews and on-demand local scopes publish without a semantic event. */ () => {
  const {state,files,pages}=appFollowFixture(),page=pages.get("B.md");pages.delete("B.md");state.observe(files.get("B.md"));
  assert.equal(state.pendingDocumentFollowRef.current,files.get("B.md"));assert.equal(state.activates.length,0);
  pages.set("B.md",page);state.presentation({kind:"presentation"});
  assert.equal(state.pendingDocumentFollowRef.current,null);assert.deepEqual(state.activates,[["B.md",true,true,"follow"]]);
  assert.equal(state.plugin.settings.lastActivePath,"B.md");assert.equal(state.presentationRenders,1);assert.equal(state.demandCounts.get("B.md"),1);
  const releaseGraph=state.plugin.index.acquireSemanticDemand("B.md");state.handover("B.md");releaseGraph();
  assert.equal(state.demandCounts.get("B.md"),0);
});

test("presentation catch-up reconciles a hidden native file when reveal geometry precedes its visibility notification", /** React's old path must not remain empty merely because refs advanced while the drawer was hidden. */ () => {
  const {state,files}=appFollowFixture();state.visible=false;state.observe(files.get("B.md"));assert.equal(state.renderPath,"A.md");
  state.visible=true;state.presentation({kind:"presentation"});assert.equal(state.renderPath,"B.md");assert.equal(state.pendingDocumentFollowRef.current,null);
  assert.deepEqual(state.activates,[["B.md",true,true,"follow"]]);
});

test("owning ResizeObserver reconciles the newest native file on geometry reveal without a graph root or plugin visibility event", /** Native layout events may precede settled drawer geometry; the stable native view container must remain observed through an empty App. */ () => {
  const {state,files}=appFollowFixture(),widths=[],observers=[];state.visible=false;
  /** Record only the native observer's listener lifetime and observed element; geometry policy stays in production. */
  class ResizeObserver {
    constructor(callback) { this.callback=callback;this.targets=[];this.disconnected=false;observers.push(this); }
    observe(target) { this.targets.push(target); }
    disconnect() { this.disconnected=true; }
  }
  const ownerWindow={ResizeObserver},content={ownerDocument:{defaultView:ownerWindow},getBoundingClientRect:/** Supply settled native geometry independently from visibility event delivery. */ ()=>({width:state.visible?390:0})};
  state.hostLeaf.view={containerEl:content};
  const effect=production("hostGeometryEffect", {hostLeaf:state.hostLeaf,rootRef:{current:null},window:ownerWindow,
    displayModes:{getSnapshot:/** Retain the native pane width outside fullscreen. */ ()=>({fullscreen:false})},
    setHostWidth:/** Capture only geometry read by the production effect. */ width=>widths.push(width),reconcileDocumentFollowVisibility:state.reconcile},"src/ui/App.tsx");
  const cleanup=effect();assert.equal(observers.length,1);assert.deepEqual(observers[0].targets,[content]);
  state.observe(files.get("B.md"));state.current=files.get("C.md");state.observe(state.current);
  assert.equal(state.renderPath,"A.md");assert.equal(state.activates.length,0);
  state.visible=true;observers[0].callback();
  assert.equal(state.renderPath,"C.md");assert.deepEqual(state.activates,[["C.md",true,true,"follow"]]);assert.equal(widths.at(-1),390);
  observers[0].callback();assert.equal(state.activates.length,1,"repeat geometry observations do not duplicate activation");
  cleanup();assert.equal(observers[0].disconnected,true);
});

test("an already-readable borrowed target obtains its own demand before the previous graph releases its preview", /** Readability from a neighboring center does not guarantee synchronous publication of the requested center's own scope. */ () => {
  const {state,files,pages}=appFollowFixture(),page=pages.get("B.md");state.ephemeral.add("B.md");state.borrowedFrom.set("B.md","A.md");
  const releasePreviousGraph=state.plugin.index.acquireSemanticDemand("A.md");assert.equal(state.plugin.index.get("B.md"),page);
  state.visible=false;state.observe(files.get("B.md"));state.visible=true;state.flush();
  assert.equal(state.demandCounts.get("B.md"),1,"App must lease even an already-readable native target");
  releasePreviousGraph();assert.equal(state.plugin.index.get("B.md"),undefined,"the previous scope owns its borrowed endpoint until this center's asynchronous preview publishes");
  state.flush();assert.equal(state.demandCounts.get("B.md"),1,"the requested center stays demanded through an intervening missing read");
  const releaseGraph=state.plugin.index.acquireSemanticDemand("B.md");state.handover("B.md");
  assert.equal(state.demandCounts.get("B.md"),2,"the App lease remains until this graph's exact native center is readable");
  assert.equal(production("waitingForDocument",{pendingDocumentFollowRef:state.pendingDocumentFollowRef,navigationOrigin:state.origin,
    activeFileRef:state.activeFileRef,plugin:state.plugin},"src/ui/App.tsx"),true,"a settled follow cannot fall back to unrelated history during preview handover");
  state.borrowedFrom.delete("B.md");state.presentation({kind:"presentation"});assert.equal(state.plugin.index.get("B.md"),page);
  state.handover("B.md");assert.equal(state.demandCounts.get("B.md"),1);
  releaseGraph();assert.equal(state.plugin.index.get("B.md"),undefined);
});

test("a synchronous preview publication and graph acknowledgment during acquisition retire only the temporary App lease", /** Acquisition may reenter settlement before returning its cleanup capability. */ () => {
  const {state,files,pages}=appFollowFixture(),page=pages.get("B.md");pages.delete("B.md");let releaseGraph;
  state.onAcquire=/** Publish exactly once during the temporary acquisition, then model the child's independent owner. */ path=>{
    state.onAcquire=null;pages.set(path,page);state.presentation({kind:"presentation"});
    releaseGraph=state.plugin.index.acquireSemanticDemand(path);state.handover(path);
  };
  state.observe(files.get("B.md"));assert.equal(state.pendingDocumentFollowRef.current,null);assert.equal(state.pendingDocumentDemandRef.current,null);
  assert.equal(state.demandCounts.get("B.md"),1);assert.deepEqual(state.releases,["B.md"]);
  releaseGraph();assert.equal(state.demandCounts.get("B.md"),0);
});

test("pending native identity rejects an obsolete same-path graph page until its current file incarnation publishes", /** Execute the render projection rather than accepting a path-only hydration match. */ () => {
  const file = {path: "B.md"}, pendingDocumentFollowRef = {current: file}, obsolete = {path: "B.md", file: {path: "B.md"}};
  assert.equal(production("exactPage", {indexedPage: obsolete, pendingDocumentFollowRef}, "src/ui/App.tsx"), undefined);
  const current = {...obsolete, file};
  assert.equal(production("exactPage", {indexedPage: current, pendingDocumentFollowRef}, "src/ui/App.tsx"), current);
});

test("off, pinned mismatch, stale file incarnations and explicit navigation reject delayed passive follow", /** Revalidate eligibility/identity at settlement rather than replaying a remembered native event unconditionally. */ () => {
  for (const condition of ["off", "pinned-other", "replacement", "explicit"]) {
    const {state, files} = appFollowFixture(); state.visible = false; state.observe(files.get("B.md"));
    if (condition === "off") state.mode = "off";
    if (condition === "pinned-other") { state.mode = "pinned"; state.current = files.get("C.md"); }
    if (condition === "replacement") files.set("B.md", {path: "B.md"});
    if (condition === "explicit") state.pendingDocumentFollowRef.current = null;
    state.visible = true; state.flush(); assert.equal(state.activates.length, 0, condition);
  }
});

test("same-file observations preserve deliberate motion while still propagating to other linked companions", /** A native echo is an idempotent document observation, not a second center navigation. */ () => {
  const {state, files} = appFollowFixture(); state.current = files.get("A.md"); state.observe(state.current);
  assert.equal(state.activates.length, 0); assert.equal(state.origin, undefined);
  assert.deepEqual(state.companions.map(([owner, page]) => [owner, page.path]), [["document", "A.md"], ["sidecar", "A.md"]]);
});

test("central native Open reuses the visible main tab and excludes sidebar, embedded, Sidecar and popout destinations", /** Validate the production workspace selection owner independently from its graph action. */ async () => {
  for (const existing of [true, false]) {
    const root = {}, file = {path: "A.md"}, opens = [], reveals = [], created = [];
    /** Supply only the native identities consumed by the production destination selector. */
    const leaf = (id, options = {}) => ({id, visible: true, root, ...options,
      getRoot() { return this.root; }, async openFile(target, options) { opens.push({id, target, options}); }});
    const main = leaf("main"), sidebar = leaf("sidebar", {document: false}), embedded = leaf("embedded", {embedded: true}), sidecar = leaf("sidecar", {sidecar: true}), popout = leaf("popout", {root: {}}), hidden = leaf("hidden", {visible: false});
    const all = [sidebar, sidecar, embedded, hidden, popout, ...(existing ? [main] : [])];
    const context = {unloading: false, recentLeafHistory: [...all, sidecar, embedded, sidebar], lastDocumentLeaf: null,
      app: {vault: {getFileByPath: /** Resolve exact requested native identity. */ () => file}, workspace: {rootSplit: root,
        getMostRecentLeaf: /** Sidebar focus cannot choose the native destination by itself. */ () => sidebar,
        iterateRootLeaves: /** Expose native candidates in deliberately adversarial order. */ callback => all.forEach(callback),
        getLeaf: /** Require a new tab when no eligible main-root destination exists. */ kind => { created.push(kind); return leaf("created"); },
        revealLeaf: /** Capture explicit native reveal without simulating a sidebar. */ async destination => { reveals.push(destination.id); }}},
      validateLinkedDocumentLeaf() {},
      isDocumentLeafCandidate: /** Exclude the already established host-owned special leaves. */ destination => destination.document !== false && !destination.embedded && !destination.sidecar,
      leafIsVisible: /** Hidden background siblings are not the current underlying tab. */ destination => destination.visible,
      retirePassiveSidecarRequestsForLeaf: /** Explicit open supersedes only its accepted destination. */ destination => { context.retired = destination; }};
    await production("openFileInMainTab").call(context, file);
    assert.deepEqual(opens.map(value => value.id), [existing ? "main" : "created"]);
    assert.deepEqual(created, existing ? [] : ["tab"]); assert.deepEqual(reveals, [existing ? "main" : "created"]);
    assert.equal(opens[0].target, file); assert.equal(opens[0].options.active, true);
  }
});

test("stationary central double taps open in the main tab on a sidepanel and consume synthetic duplicates", /** Run the real gesture owner and graph action, preserving first-tap activation and default ghost behavior. */ () => {
  const file = {path: "A.md"}, page = {path: file.path, file}, requests = [], opened = [], activated = [];
  const folderPrompts=[];
  const dependencies = {plugin: {openFileInMainTab: /** Capture the central explicit native destination. */ target => opened.push(target),
    openPage: /** Explicit modifier opening owns its native folder prompt, independent of Sidecar availability. */ (target,doc,options)=>folderPrompts.push({target,doc,options})},
    viewport:{current:{ownerDocument:{}}},hostLeaf:{},
    activePath: page.path, surface: "sidepanel", graphActionPage: /** Use the graph's accepted exact target in this finite action fixture. */ context => context.page,
    onActivate: /** Capture the first accepted touch selection/activation. */ target => activated.push(target),
    onOpen: /** Existing unresolved nodes keep their deliberate materialization route. */ target => opened.push(["ghost", target]),
    onOpenInSidecar: /** Noncentral content retains owned Sidecar routing. */ target => opened.push(["sidecar", target]),
    navigationOccurrence: {current: null}};
  const open = production("graphOpen", dependencies, "src/ui/PlexGraph.tsx");
  const available = production("graphOpenAvailability", dependencies, "src/ui/PlexGraph.tsx");
  const touchDependencies = {index: {get: /** Return the currently accepted central page. */ () => page},
    touchDoubleTap: {current: new DoubleTapGesture()}, suppressSyntheticClickUntil: {current: 0}, suppressNativeDoubleClickUntil: {current: 0},
    runNodeAction: /** The touch owner dispatches once through the same graph implementation used by menus/keyboard. */ (id, target) => {
      requests.push(id); if (id === "node.open") { assert(available({page: target,request:{id}})); open({page: target, request:{id}, target: {kind: "node"}}); }
      else dependencies.onActivate(target);
    }};
  touchDependencies.activateOccurrence=production("activateOccurrence",{viewDefinition:{hierarchy:undefined},runNodeAction:touchDependencies.runNodeAction},"src/ui/PlexGraph.tsx");
  const complete = production("completeTouchTap", touchDependencies, "src/ui/PlexGraph.tsx");
  /** Supply only the owning document hit query consumed by a stationary completed tap. */
  const event = timeStamp => ({timeStamp, clientX: 100, clientY: 120, currentTarget: {ownerDocument: {elementFromPoint: () => null}}});
  complete(page, event(10)); complete(page, event(150));
  assert.deepEqual(requests, ["node.activate", "node.open"]); assert.deepEqual(opened, [file]); assert.deepEqual(activated, [page]);
  assert(touchDependencies.suppressNativeDoubleClickUntil.current > Date.now()); assert(touchDependencies.suppressSyntheticClickUntil.current > Date.now());
  const noncentral = {path: "B.md", file: {path: "B.md"}}, ghost = {path: "Missing"};
  assert.equal(available({page: noncentral,request:{id:"node.open"}}), false); assert.equal(available({page: ghost,request:{id:"node.open"}}), false);
  open({page: ghost,request:{id:"node.open"}, target: {kind: "node"}}); open({page: noncentral,request:{id:"node.open"}, target: {kind: "node"}});
  assert.deepEqual(opened.slice(1), [["ghost", ghost], ["sidecar", noncentral]]);
  const modifier={page:ghost,request:{id:"node.open",args:{chooseFolder:true}},target:{kind:"node"}};
  assert.equal(available(modifier),true);open(modifier);
  assert.deepEqual(folderPrompts,[{target:ghost,doc:dependencies.viewport.current.ownerDocument,options:{chooseFolder:true,preserveCenter:false,hostLeaf:dependencies.hostLeaf}}]);
});

test('opt-in activate-editor primary opening captures its exact occurrence and retirement prevents a late editor request',async()=>{
 const page={path:'B.md',file:{path:'B.md'}},requests=[],legacy=[],notices=[];let current=true,eligible=true;
 const dependencies={viewDefinition:{hierarchy:{primary:'activate-editor'}},supportsBoundEditor:()=>eligible,viewSession:{capture:()=>()=>current},actionNodeRef,
  actionSurfaceId:'owned-canvas',runNodeAction:(...args)=>legacy.push(args),plugin:{actionManager:{dispatch:async request=>{requests.push(request);return{status:'completed'}}}},
  Notice:class{constructor(message){notices.push(message)}},translate:key=>key,translateActionText:(_translate,key)=>key};
 const primary=production('activateOccurrence',dependencies,'src/ui/PlexGraph.tsx');
 primary(page,'B1',true);await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(requests.map(request=>[request.id,request.surfaceId,request.target.occurrenceId,request.target.node.identity]),[['node.activate','owned-canvas','B1','B.md'],['editor.expand','owned-canvas','B1','B.md']]);
 primary(page,'B2',false);assert.deepEqual(legacy,[['node.activate',page,'B2']],'Modifiers retain ordinary activation without requesting an editor');
 requests.length=0;primary(page,'B1',true);current=false;await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(requests.map(request=>request.id),['node.activate'],'Retired view cannot open an editor after accepted navigation settles');
 current=true;eligible=false;primary(page,'B2',true);assert.equal(requests.length,1);assert.deepEqual(legacy.at(-1),['node.activate',page,'B2']);assert.deepEqual(notices,[]);
});

test('legacy opt-in expand primary still toggles its exact branch while center policy uses accepted destination action',()=>{
 const page={path:'B.md'},branch={canExpand:true,expanded:false},requests=[],selected=[];
 const dependencies={viewDefinition:{hierarchy:{primary:'expand'}},scene:{nodes:[{page,occurrenceId:'B1',branch}]},occurrenceKey:node=>node.occurrenceId,
  selection:{select:id=>selected.push(id)},runNodeAction:(...args)=>requests.push(args)};
 const primary=production('activateOccurrence',dependencies,'src/ui/PlexGraph.tsx');
 primary(page,'B1',true);assert.deepEqual(requests,[['branch.toggle',page,'B1']]);assert.deepEqual(selected,['B1']);
 branch.expanded=true;primary(page,'B1',true);assert.deepEqual(requests.at(-1),['branch.toggle',page,'B1']);assert.equal(requests.length,2,'Repeated click delegates folding to the existing guarded action');
 branch.canExpand=false;primary(page,'B1',true);assert.equal(requests.length,3,'An expanded branch can still request a guarded fold');
 branch.expanded=false;primary(page,'B1',true);assert.equal(requests.length,3,'Leaf click does not start acquisition or create an editor');
 primary(page,'B1',false);assert.deepEqual(requests.at(-1),['node.activate',page,'B1'],'Modifier route keeps explicit attention navigation');
 dependencies.viewDefinition.hierarchy.primary='center';primary(page,'B1',true);
 assert.deepEqual(requests.at(-1),['node.activate',page,'B1','destination'],'Centering reuses navigation/root/editor preflight');
});

test('history navigation explicitly requests the selected saved node as the rooted map destination',()=>{
 const A={path:'A.md'},B={path:'B.md'},activations=[],cursors=[];
 const back=production('goHistory',{plugin:{settings:{navigationHistory:['A.md','B.md']},index:{get:path=>path==='A.md'?A:B}},historyCursor:1,setHistoryCursor:value=>cursors.push(value),activate:(...args)=>activations.push(args)},'src/ui/App.tsx');
 back(-1);assert.deepEqual(cursors,[0]);assert.deepEqual(activations,[[A,false,true,'user',true]]);
 const rejected=[];production('goHistory',{plugin:{settings:{navigationHistory:['A.md','B.md']},index:{get:()=>A}},historyCursor:1,setHistoryCursor:value=>rejected.push(value),activate:()=>false},'src/ui/App.tsx')(-1);assert.deepEqual(rejected,[],'An editor-blocked root cannot advance the history cursor');
});

test('color publication never promotes a pending native follow or expands its demand',()=>{
 const {state,files}=appFollowFixture();state.visible=false;state.observe(files.get('B.md'));const demands=[...state.demands],rendered=state.renderPath;
 state.visible=true;state.presentation({kind:'paint'});assert.equal(state.renderPath,rendered);assert.deepEqual(state.demands,demands);assert.equal(state.paintRenders,1);assert.equal(state.presentationRenders,undefined);
 state.visible=false;state.presentation({kind:'paint'});assert.equal(state.paintRenders,1);state.releaseDemand();
});

test('partial native follow records its accepted Footprint once, and an ownership revision cancels delayed acceptance',()=>{
 const {state,files,pages}=appFollowFixture(),session=new KplexDocumentSession({documentSyncMode:'recent'},'test',()=>{});
 state.documentSession.footprints=session.footprints;session.footprints.accept(actionNodeRef(pages.get('A.md')));state.documentSession.centerPath='A.md';
 const pending=pages.get('B.md');pages.delete('B.md');state.observe(files.get('B.md'));for(let i=0;i<5;i++)state.flush();assert.equal(session.footprints.length,1);
 pages.set('B.md',pending);state.flush();for(let i=0;i<5;i++)state.flush();assert.equal(session.footprints.length,2);assert.equal(session.footprints.at(1).node.identity,'B.md');
 const next=pages.get('C.md');pages.delete('C.md');state.current=files.get('C.md');state.observe(state.current);state.documentSession.revision++;pages.set('C.md',next);state.flush();
 assert.equal(session.footprints.length,2);assert.equal(state.renderPath,'B.md');assert.equal(state.documentSession.pendingFollow,null);
});

test('partial startup cannot replace the saved center with an earlier available history tag', () => {
  const pages = new Map([['tag:#Fiction', {path: 'tag:#Fiction'}], ['folder:/', {path: 'folder:/'}]]);
  const plugin = {settings: {lastActivePath: 'Center.md', navigationHistory: ['tag:#Fiction', 'Center.md']},
    index: {get: path => pages.get(path)}, initialIndexComplete: false,
    isNavigationFallbackReady() {return this.initialIndexComplete;}};
  const fallback = production('resolveNavigationFallbackPath');
  assert.equal(fallback.call(plugin, 'Center.md'), null, 'Absence from a partial publication is not proof of deletion');
  pages.set('Center.md', {path: 'Center.md'});
  assert.equal(fallback.call(plugin, 'Center.md'), 'Center.md');
  pages.delete('Center.md'); plugin.initialIndexComplete = true;
  assert.equal(fallback.call(plugin, 'Center.md'), 'tag:#Fiction', 'A genuinely missing center still recovers after readiness');
});

/** Actual F4/App/graph activation callbacks distinguish explicit destination changes from independent occurrence attention. */
test('F4 and center drops reroot only their owning rooted canvas and refuse editor-removing navigation before any side effect',()=>{
 const {state,files,pages}=appFollowFixture(),roots=[],other={root:'Other-root'},view=state.documentSession.plexView={editors:{bindings:[]},definition:{navigation:'rooted'},layoutRoot:()=>view.root??'A.md',setRoot:id=>{roots.push(id);view.root=id;return !view.blocked}};
 state.plugin.index.getVaultSearchPage=id=>pages.get(id);
 let inserts=0;state.plugin.index.insertCreatedFile=file=>{inserts++;const page={path:file.path,file};pages.set(file.path,page);return page};
 const activate=state.activate,search=production('searchDestination',{plugin:state.plugin,activate},'src/ui/App.tsx'),graph=production('graphDestination',{activate},'src/ui/App.tsx');
 search('B.md');assert.equal(view.root,'B.md');assert.equal(state.renderPath,'B.md');assert.equal(other.root,'Other-root');
 graph(pages.get('C.md'));assert.equal(view.root,'B.md','Ordinary occurrence attention never reroots');assert.equal(state.renderPath,'C.md');
 graph(pages.get('A.md'),'destination');assert.equal(view.root,'A.md');assert.equal(state.renderPath,'A.md');
 const before={history:[...state.plugin.settings.navigationHistory],companions:state.companions.length,render:state.renderPath};view.blocked=true;
 graph(pages.get('B.md'),'destination');assert.equal(state.renderPath,before.render);assert.deepEqual(state.plugin.settings.navigationHistory,before.history);assert.equal(state.companions.length,before.companions);assert.deepEqual(state.notices,['actions.root-editor-blocked']);assert.equal(inserts,0);
 files.set('D.md',{path:'D.md'});const cached={path:'D.md',file:files.get('D.md')};state.plugin.index.getVaultSearchPage=()=>cached;
 search('D.md');assert.equal(inserts,0,'Blocked root cannot materialize a provisional native file');view.blocked=false;search('D.md');assert.equal(inserts,1);assert.equal(state.renderPath,'D.md');
 const replacement={...files.get('D.md')};files.set('D.md',replacement);const rootCount=roots.length;graph(cached,'destination');assert.equal(roots.length,rootCount,'Stale native incarnation cannot even request a root');
 view.definition.navigation='attention';graph(pages.get('B.md'),'destination');assert.equal(roots.length,rootCount);assert.equal(state.renderPath,'B.md','Existing attention-following views keep their navigation');
});


test('Compass explicit navigation saves its occurrence editor before accepting only the latest destination',async()=>{
 const f=appFollowFixture();let finish,live=true,calls=0;const view={editors:{bindings:[{id:'native'}]},definition:{},capture:()=>()=>live};
 f.state.documentSession.plexView=view;f.state.graphActionPorts.current={prepareEditorTransition:()=>{calls++;return new Promise(resolve=>finish=resolve)}};
 let activate;const deps={...f.dependencies,pendingEditorNavigation:{current:null},resolveActionPage:(index,ref)=>index.get(ref.identity)??null,activate:(...args)=>activate(...args)};
 activate=production('activate',deps,'src/ui/App.tsx');
 assert.equal(activate(f.pages.get('B.md')),true);assert.equal(activate(f.pages.get('C.md')),true);assert.equal(calls,1);
 assert.equal(f.state.renderPath,'A.md');assert.deepEqual(f.state.companions,[]);view.editors.bindings=[];finish(true);await Promise.resolve();await Promise.resolve();
 assert.equal(f.state.renderPath,'C.md');assert.deepEqual(f.state.plugin.settings.navigationHistory,['A.md','C.md']);assert(f.state.companions.every(([,page])=>page.path==='C.md'));
});
test('Compass save failure, retired lifetime and passive follow cannot remove a bound editor through navigation',async()=>{
 for(const mode of ['failure','retired','follow']){const f=appFollowFixture();let finish,live=true,calls=0;f.state.documentSession.plexView={editors:{bindings:[{id:'native'}]},definition:{},capture:()=>()=>live};
  f.state.graphActionPorts.current={prepareEditorTransition:()=>{calls++;return new Promise(resolve=>finish=resolve)}};
  let activate;const deps={...f.dependencies,pendingEditorNavigation:{current:null},resolveActionPage:(index,ref)=>index.get(ref.identity)??null,activate:(...args)=>activate(...args)};
  activate=production('activate',deps,'src/ui/App.tsx');const accepted=activate(f.pages.get('B.md'),true,true,mode==='follow'?'follow':'user');
  if(mode==='follow'){assert.equal(accepted,false);assert.equal(calls,0);}else{if(mode==='retired')live=false;finish(mode!=='failure');await Promise.resolve();await Promise.resolve();}
  assert.equal(f.state.renderPath,'A.md');assert.deepEqual(f.state.companions,[]);assert.deepEqual(f.state.plugin.settings.navigationHistory,['A.md']);
 }
});

for(const destination of ['C.md','A.md'])test('Mind Map center navigation saves once and accepts the latest '+destination,async()=>{
 const f=appFollowFixture();let finish,calls=0,root='A.md';const completed=[];
 const view={editors:{bindings:[{id:'native-root'}]},definition:{navigation:'rooted'},capture:()=>()=>true,
  layoutRoot:()=>root,setRoot:id=>{assert.equal(view.editors.bindings.length,0,'Save/close precedes reroot');root=id;return true;}};
 f.state.documentSession.plexView=view;
 f.state.graphActionPorts.current={prepareEditorTransition:()=>{calls++;return new Promise(resolve=>finish=resolve)},completeEditorTransition:page=>completed.push(page?.path??null)};
 let activate;const deps={...f.dependencies,pendingEditorNavigation:{current:null},resolveActionPage:(index,ref)=>index.get(ref.identity)??null,activate:(...args)=>activate(...args)};
 activate=production('activate',deps,'src/ui/App.tsx');
 assert.equal(activate(f.pages.get('B.md'),true,true,'user',true),true);
 if(destination==='C.md')view.editors.bindings=[]; // Native close may finish before its navigation continuation.
 assert.equal(activate(f.pages.get(destination),true,true,'user',true),true);
 assert.equal(calls,1);assert.equal(root,'A.md');assert.equal(f.state.renderPath,'A.md');
 view.editors.bindings=[];finish(true);await Promise.resolve();await Promise.resolve();
 assert.equal(root,destination);assert.equal(f.state.renderPath,destination);assert.deepEqual(completed,[destination]);assert.deepEqual(f.state.notices??[],[]);
});

for(const failure of ['save','retired','replaced-file'])test('Mind Map '+failure+' cannot accept a pending center or transfer its editor',async()=>{
 const f=appFollowFixture();let finish,live=true,root='A.md';const completed=[];
 const view={editors:{bindings:[{id:'native-root'}]},definition:{navigation:'rooted'},capture:()=>()=>live,layoutRoot:()=>root,setRoot:id=>{root=id;return true;}};
 f.state.documentSession.plexView=view;f.state.graphActionPorts.current={prepareEditorTransition:()=>new Promise(resolve=>finish=resolve),completeEditorTransition:page=>completed.push(page?.path??null)};
 let activate;const deps={...f.dependencies,pendingEditorNavigation:{current:null},resolveActionPage:(index,ref)=>index.get(ref.identity)??null,activate:(...args)=>activate(...args)};
 activate=production('activate',deps,'src/ui/App.tsx');activate(f.pages.get('B.md'),true,true,'user',true);
 if(failure==='retired')live=false;
 if(failure==='replaced-file')f.files.set('B.md',{...f.files.get('B.md')});
 if(failure!=='save')view.editors.bindings=[];
 finish(failure!=='save');await Promise.resolve();await Promise.resolve();
 assert.equal(root,'A.md');assert.equal(f.state.renderPath,'A.md');assert.deepEqual(f.state.plugin.settings.navigationHistory,['A.md']);assert.deepEqual(completed,[null]);
});


test('passive recent-tab synchronization never creates a native destination when the canvas is alone',async()=>{
 const {context,host,files}=fixture();
 let creates=0,opens=0;
 context.session.preferences.documentSyncMode='recent';
 context.findRecentDocumentLeaf=()=>null;
 context.app.workspace={createLeafBySplit(){creates++;throw Error('Passive native creation');}};
 context.targetNoteLeaf=production('targetNoteLeaf');
 context.syncSidecarToPage=async()=>{opens++;};
 await Promise.all(Array.from({length:20},()=>context.syncPageToDocumentLeaf({file:files.get('B.md'),url:null},host)));
 assert.equal(creates,0);assert.equal(opens,0);
});

/** History must remain usable even if no graph or center is currently available. */
test('loading App dispatches exact saved destinations without a graph action owner',async()=>{
 const target={path:'Previous.md',file:{path:'Previous.md'}},calls=[];
 let current=target,accepted=true;
 const fallback=production('savedDestinationAction',{actionPage:()=>current,activate:(...args)=>{calls.push(args);return accepted}},'src/ui/App.tsx');
 const manager=new ActionManager({readCommandContext:()=>({sharedCenter:null})});
 manager.registerSurface({id:'loading',generation:1,readSnapshot:()=>({mounted:true,visible:true,center:null,selected:null,focusRegion:'toolbar',interactionRevision:0}),implementations:{'node.activate':fallback}});
 const request={id:'node.activate',source:'toolbar',surfaceId:'loading',target:{kind:'explicit',node:actionNodeRef(target)}};
 try{
  assert.equal((await manager.dispatch(request)).status,'completed');
  assert.deepEqual(calls,[[target,true,true,'user',true]],'Recovery reuses native/editor/root admission');
  accepted=false;assert.equal((await manager.dispatch(request)).status,'unavailable');
  const count=calls.length;current=null;
  assert.equal((await manager.dispatch(request)).status,'unavailable');assert.equal(calls.length,count,'Missing targets never navigate');
  current={...target,transient:{kind:'group'}};
  assert.equal((await manager.dispatch(request)).status,'unavailable');assert.equal(calls.length,count);
  current=target;
  const context={request,target:{kind:'node',node:request.target.node,occurrenceId:'graph-occurrence'}};
  assert.equal(fallback.availability(context).state,'disabled');
  assert.equal(fallback.execute(context).status,'unavailable');assert.equal(calls.length,count,'Graph occurrences retain their original owner');
 }finally{manager.dispose()}
});
