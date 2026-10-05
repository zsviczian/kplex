/**
 * Runs the production relationship commit and pointer-drop callbacks with bounded host doubles.
 * Source extraction isolates native shells without replacing the behavior under test.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

/** Compile a production callback/method; class-field arrows capture the supplied owning instance. */
function productionFunction(path, name, dependencies) {
  const source = ts.createSourceFile(path, readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) expression = node.initializer.getText(source);
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) expression = node.getText(source);
    if (ts.isMethodDeclaration(node) && node.name.getText(source) === name) expression = `async function ${name}${node.getText(source).slice(node.getText(source).indexOf("("))}`;
    if (ts.isPropertyDeclaration(node) && node.name.getText(source) === name && node.initializer) expression = `function (...args) { return (${node.initializer.getText(source)})(...args); }`;
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert(expression, `${path} must define ${name}`);
  const output = ts.transpileModule(`const selected = ${expression};`, { compilerOptions: { target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.None } }).outputText;
  return Function(...Object.keys(dependencies), `${output}\nreturn selected;`)(...Object.values(dependencies));
}

/** Minimal Markdown-backed graph page retaining exact endpoint paths and canonical identity. */
function page(path) { return { path, file: { path, extension: "md" }, neighbours: new Map() }; }

/** Native Escape cancellation keeps the host visible; selection and superseded hide callbacks never steal focus. */
test("shared menu Escape restores its Plex and releases owning-document listeners", async () => {
  const listeners=new Map(),doc={addEventListener:(kind,fn)=>listeners.set(kind,fn),removeEventListener:(kind,fn)=>{if(listeners.get(kind)===fn)listeners.delete(kind);}};
  doc.defaultView=doc;
  doc.setTimeout=setTimeout;doc.clearTimeout=clearTimeout;
  const host={view:{containerEl:{isConnected:true},getViewType:()=>"plex"}},other={view:{getViewType:()=>"image"}};
  const workspace={activeLeaf:host,setActiveLeaf(leaf){this.activeLeaf=leaf;}};
  const context={app:{workspace},activeKplexMenu:null,activeKplexMenuDocument:null,activeKplexMenuLeaf:null,kplexMenuOutsidePointerDown:()=>{}};
  for(const name of ["dismissKplexMenu","trackKplexMenu","showKplexMenuAtPosition","kplexMenuEscapeKeyDown"])context[name]=productionFunction("src/main.ts",name,{KPLEX_VIEW_TYPE:"plex",KPLEX_SIDEPANEL_VIEW_TYPE:"sidepanel"}).bind(context);
  const makeMenu=()=>({hidden:0,onHide(fn){this.callback=fn;},hide(){this.hidden++;workspace.activeLeaf=other;this.callback?.();}});
  const first=makeMenu();first.showAtPosition=function(){this.callback?.();};await context.showKplexMenuAtPosition(first,{x:0,y:0},doc);
  assert.equal(context.activeKplexMenu,first,"Show's initial hide must not discard the displayed menu lifetime");
  let prevented=0,stopped=0;context.kplexMenuEscapeKeyDown({key:"Escape",preventDefault:()=>prevented++,stopImmediatePropagation:()=>stopped++});
  assert.equal(workspace.activeLeaf,host);assert.equal(first.hidden,1);assert.equal(listeners.size,0);assert.equal(prevented,1);assert.equal(stopped,1);
  workspace.activeLeaf=host;const second=makeMenu();await context.trackKplexMenu(second,doc);
  first.callback();assert.equal(context.activeKplexMenu,second,"Old hide callback cannot dispose a replacement menu");
  second.hide();assert.equal(workspace.activeLeaf,other,"Native action dismissal must not restore the host");await new Promise(done=>setTimeout(done,5));assert.equal(listeners.size,0);assert.equal(context.activeKplexMenu,null);
  workspace.activeLeaf=host;const third=makeMenu();await context.trackKplexMenu(third,doc);
  third.hide();context.kplexMenuEscapeKeyDown({key:"Escape",preventDefault:()=>{},stopImmediatePropagation:()=>{}});
  assert.equal(workspace.activeLeaf,host,"Earlier host hide cannot retire cancellation before our Escape listener");await Promise.resolve();assert.equal(listeners.size,0);
});

for (const role of ["parent", "child", "left", "right"]) {
  test(`existing-target ${role} Link prepares the exact pair and awaits saved canonical publication`, async () => {
    const staleOrigin = page("Origin.md"), staleTarget = page("Target.md"), origin = page(staleOrigin.path), target = page(staleTarget.path);
    const frontmatter = {}, events = [];
    const context = { translator: key => key, index: {
      withForegroundPriority: async work => work(),
      prepareRelationshipPair: async (...paths) => { events.push(["prepare", ...paths]); return true; },
      isSemanticWriteReady: () => true, get: path => path === origin.path ? origin : target,
      gateNeighbourPaths: current => { assert.equal(current, origin); return new Set(); }, isConnected: () => false,
    }, managedMetadataWrites: new Map(), pruneManagedMetadataWrites: () => {}, allOntologyFields: () => ["custom ontology"],
      referenceForPage: (current, storage) => { assert.equal(current, target); assert.equal(storage, origin.file); return "[[Target]]"; },
      mutateRelationshipMetadata: async (file, fields, update) => { assert.equal(file, origin.file); events.push(["write"]); update(frontmatter); },
    };
    for (const name of ["prepareRelationshipMutation", "publishSavedRelationship", "writeRelationship"]) context[name] = productionFunction("src/main.ts", name,
      { normalizeFieldName: value => value.toLowerCase().trim(), SavedRelationshipPendingError: class extends Error {} });
    const commit = productionFunction("src/main.ts", "createRelationToPage", { Notice: class {} });
    await commit.call(context, staleOrigin, role, staleTarget, "custom ontology");
    assert.deepEqual(frontmatter, { "custom ontology": ["[[Target]]"] });
    assert.deepEqual(events, [["prepare", origin.path, target.path], ["write"], ["prepare", origin.path, target.path]]);
  });
}

test("existing-target Link refuses unavailable exact pair authority before any write", async () => {
  const origin = page("Origin.md"), target = page("Target.md");
  const context = { translator: key => key, index: { withForegroundPriority: async work => work(), prepareRelationshipPair: async () => false },
    writeRelationship: () => assert.fail("An unready pair must not mutate the vault"),
    prepareRelationshipMutation: productionFunction("src/main.ts", "prepareRelationshipMutation", {}) };
  const commit = productionFunction("src/main.ts", "createRelationToPage", { Notice: class {} });
  await assert.rejects(commit.call(context, origin, "child", target, "children"), /relation.preparingRelationship/);
});

/** The actual UI catches keep saved outcomes truthful and never announce an early commit. */
for (const shell of ["composer", "details"]) {
  test(`saved pending ${shell} notice preserves its message and leaves the dialog uncommitted`, async () => {
    class SavedRelationshipPendingError extends Error {}
    const notices = [], commits = [], error = new SavedRelationshipPendingError("Saved; graph pending");
    const Notice = class { constructor(message) { notices.push(message); } };
    if (shell === "composer") {
      const link = productionFunction("src/ui/NewRelatedNoteModal.ts", "linkExisting", {
        Notice, SavedRelationshipPendingError, busy: false, selectedTarget: page("Target.md"), origin: page("Origin.md"), role: "child",
        prepareField: async () => "Children", setBusy: () => {}, onCommitted: () => commits.push("committed"), onClose: () => commits.push("closed"),
        plugin: { translator: key => key, createRelationToPage: async () => { throw error; } },
      });
      await link();
    } else {
      const confirm = productionFunction("src/ui/RelationModal.ts", "confirm", { Notice, SavedRelationshipPendingError });
      await confirm.call({ busy: false, canSave: () => true, updateSaveButton: () => {}, close: () => commits.push("closed"),
        semanticRole: "child", selectedField: "Children", options: { mode: "relink", fixedTarget: page("Target.md"), origin: page("Origin.md"), onCommitted: () => commits.push("committed") },
        plugin: { translator: key => key, relinkCentralNeighbour: async () => { throw error; } },
      });
    }
    assert.deepEqual(notices, [error.message]); assert.deepEqual(commits, []);
  });
}

/** Extract the shared history endpoint/menu callbacks with exact injected native policy owners. */
function historyFixture() {
  const origin=page("Origin.md"),target=page("Target.md"),menus=[],actions=[];
  class Menu {
    constructor(){this.items=[];}
    addItem(configure){const item={setTitle(value){this.title=value;return this;},setIcon(){return this;},onClick(callback){this.click=callback;return this;}};configure(item);this.items.push(item);return this;}
  }
  const ownerDocument={elementFromPoint:()=>({closest:()=>({dataset:{kplexHistoryPath:target.path}})})};
  const dependencies={Menu,index:{get:path=>path===origin.path?origin:path===target.path?target:undefined},translate:key=>key,hostLeaf:{},clearHoverIntent:()=>{},
    plugin:{showKplexMenuAtPosition:(menu,coordinates,document)=>{assert.equal(document,ownerDocument);assert.deepEqual(coordinates,{x:30,y:40});menus.push(menu);},openRelationModal:options=>actions.push(options)}};
  dependencies.historyRelationshipTarget=productionFunction("src/ui/PlexGraph.tsx","historyRelationshipTarget",dependencies);
  dependencies.openHistoryRelationshipMenu=productionFunction("src/ui/PlexGraph.tsx","openHistoryRelationshipMenu",dependencies);
  return {origin,target,menus,actions,ownerDocument,dependencies};
}

for(const [gate,role] of [["top","parent"],["bottom","child"],["left","left"],["right","right"]]){
  test(`gate ${gate} drop on history opens the exact ${role} fixed-target composer directly`,()=>{
    const {origin,target,menus,actions,ownerDocument,dependencies}=historyFixture();
    const connectDrag={pointerId:7,originPath:origin.path,gate,moved:true};let remainingDrag=connectDrag,cleared=0;
    const up=productionFunction("src/ui/PlexGraph.tsx","up",{...dependencies,clearHistoryDragHover:()=>cleared++,semanticRoleForGate:productionFunction("src/ui/PlexGraph.tsx","semanticRoleForGate",{}),
      areaResizeDrag:{current:null},finishAreaSettingsDismiss:()=>{},pendingGateLongPress:{current:null},connectDrag,setConnectDrag:value=>{remainingDrag=value;},suppressActivateUntil:{current:0},touchPointers:{current:new Map()},viewport:{current:{classList:{remove(){}}}}});
    up({pointerId:7,pointerType:"mouse",clientX:30,clientY:40,currentTarget:{ownerDocument}});
    assert.equal(remainingDrag,null);assert.equal(cleared,1);assert.equal(menus.length,0,"A physical gate already specifies the role");
    assert.equal(actions.length,1);assert.equal(actions[0].origin,origin);assert.equal(actions[0].fixedTarget,target);assert.equal(actions[0].semanticRole,role);assert.equal(actions[0].mode,"create");
  });
}

test("node-body drop on history retains the four-role chooser against the exact endpoint",()=>{
  const {origin,target,menus,actions,ownerDocument,dependencies}=historyFixture();
  assert.equal(dependencies.openHistoryRelationshipMenu(origin,30,40,ownerDocument),true);
  assert.equal(menus.length,1);assert.deepEqual(menus[0].items.map(item=>item.title),["role.parent","role.child","role.friend","role.challenger"]);
  assert.equal(actions.length,0,"A body drop still needs explicit role selection");
  for(const item of menus[0].items)item.click();
  assert.deepEqual(actions.map(action=>action.semanticRole),["parent","child","left","right"]);
  for(const action of actions){assert.equal(action.origin,origin);assert.equal(action.fixedTarget,target);assert.equal(action.mode,"create");}
  target.isFolder=true;assert.equal(dependencies.openHistoryRelationshipMenu(origin,30,40,ownerDocument,"child"),false,"Ineligible history folders cannot select a composer endpoint");
});

/** Ordinary startup backlog waits for the initial owner's final cache/delta decision. */
test("reactive startup backlog cannot rebuild a partial cache preview before hydration settles", async () => {
  let hydrating = true, closeHydration; const events = [];
  const closed = new Promise((resolve) => { closeHydration = resolve; });
  const context = {
    unloading: false, layoutReady: true, initialIndexTask: null, initialIndexComplete: false,
    indexDirty: true, indexDirtyRevision: 1, preRestoreUncoveredChanges: false,
    indexBacklogReasons: new Set(["startup:stale-snapshot"]), dirtyMarkdownPaths: new Set(), metadataStabilized: true,
    rebuildTask: null, rebuildTimer: null,
    index: {
      size: 3, hasPendingStructuralMaintenance: () => false, hasPendingSnapshotHydration: () => hydrating,
      waitForSnapshotHydration: async () => { events.push("wait"); await closed; hydrating = false; return { restored: true, fresh: false }; },
      hasSourceBackedStartup: () => false, isFullSnapshotHydrated: () => !hydrating, hasIncrementalRestorePatch: () => true,
      reconcileRestoredSnapshot: async () => { assert.equal(hydrating, false); events.push("patch-real-delta"); return { reconciled: true, patched: 1 }; },
      rebuild: () => assert.fail("A valid warm delta must not start from zero"),
    },
    refreshBookmarkedEntryPoints: async () => {}, notifyIndexStatus: () => {}, hasVisibleKplexSurface: () => true,
    scheduleRebuild: () => assert.fail("Handled delta must not schedule a duplicate build"), pruneMissingDirtyMarkdownPaths: () => {},
  };
  context.ensureInitialIndex = productionFunction("src/main.ts", "ensureInitialIndex", { Platform: { isIosApp: false } });
  const perform = productionFunction("src/main.ts", "performRebuild", {});
  const task = perform.call(context, false, false, "interval", false);
  await Promise.resolve();
  assert.deepEqual(events, ["wait"]); assert.equal(context.initialIndexComplete, false); assert.equal(context.rebuildTask, null);
  closeHydration(); await task;
  assert.deepEqual(events, ["wait", "patch-real-delta"]); assert.equal(context.initialIndexComplete, true);
  assert.equal(context.indexDirty, false); assert.equal(context.indexBacklogReasons.size, 0);
});

/** A view may own cold startup before the cooperative physical catalog installs warm hydration. */
for (const outcome of ["fresh", "stale", "failed", "sources", "sources-pending"]) {
  test(`late ${outcome} startup hydration never joins its own initial task`, { timeout: 2000 }, async () => {
    let releaseMetadata, releaseHydration, hydrating = false, hydrated = false, sourceBacked = false;
    const metadata = new Promise(resolve => { releaseMetadata = resolve; });
    const hydration = new Promise(resolve => { releaseHydration = resolve; });
    const events = [];
    const context = {
      unloading: false, layoutReady: true, initialIndexTask: null, initialIndexComplete: false,
      indexDirty: true, indexDirtyRevision: 0, preRestoreUncoveredChanges: false,
      indexBacklogReasons: new Set(["startup:no-snapshot"]), dirtyMarkdownPaths: new Set(), metadataStabilized: false,
      metadataStabilityPromise: null, rebuildTask: null, rebuildTimer: null,
      index: {
        size: 0, hasPendingStructuralMaintenance: () => false, hasPendingSnapshotHydration: () => hydrating,
        hasSourceBackedStartup: () => sourceBacked, isFullSnapshotHydrated: () => hydrated,
        hasPhysicalBaseline: () => hydrated || sourceBacked, hasRestoredCheckpoint: () => false,
        hasIncrementalRestorePatch: () => false,
        waitForSnapshotHydration: async () => {
          events.push("hydrate"); await hydration; hydrating = false;
          hydrated = outcome === "fresh" || outcome === "stale";
          sourceBacked = outcome.startsWith("sources"); context.index.size = 3;
          // The normal host restore classifier already closes a fresh snapshot's empty backlog.
          if (outcome === "fresh") { context.indexDirty = false; context.indexBacklogReasons.clear(); }
          return { restored: hydrated, fresh: outcome === "fresh" };
        },
        adoptStartupSources: async () => { events.push("adopt"); return outcome === "sources"; },
        noteBuildDecision: () => {},
        rebuild: async () => { events.push("full"); hydrated = true; return true; },
        rebuildProgressively: async () => { events.push("progressive"); hydrated = true; return true; },
      },
      waitForMetadataCacheStability: async () => { events.push("metadata"); await metadata; },
      refreshBookmarkedEntryPoints: async () => {}, notifyIndexStatus: () => {}, hasVisibleKplexSurface: () => true,
      scheduleRebuild: () => assert.fail("This settled startup needs no additional rebuild"),
      pruneMissingDirtyMarkdownPaths: () => {}, startupGraphSeedPaths: () => [],
    };
    for (const name of ["ensureInitialIndex", "performRebuild", "adoptInitialSourceIndex"]) {
      context[name] = productionFunction("src/main.ts", name, { Platform: { isIosApp: false } });
    }
    const task = context.ensureInitialIndex();
    assert.deepEqual(events, ["metadata"]);
    hydrating = true; releaseMetadata();
    // No native sleeps: drain the finite coordinator continuation until it reaches the restore.
    for (let turn = 0; turn < 6; turn++) await Promise.resolve();
    assert.deepEqual(events, ["metadata", "hydrate"]);
    assert.equal(context.rebuildTask, null); assert.equal(context.initialIndexComplete, false);
    releaseHydration(); await task;
    const expected = outcome === "fresh" ? [] : outcome === "stale" ? ["full"]
      : outcome === "failed" ? ["progressive"] : ["adopt"];
    assert.deepEqual(events, ["metadata", "hydrate", ...expected]);
    assert.equal(context.initialIndexComplete, outcome !== "sources-pending");
    assert.equal(context.indexDirty, outcome === "sources-pending");
    if (outcome.startsWith("sources")) assert.equal(hydrated, false, "Source adoption cannot claim full graph hydration");
    if (outcome === "sources-pending") {
      assert.equal(context.initialIndexTask, null, "Failed adoption must release startup for a later real attempt");
      assert(context.indexBacklogReasons.has("startup:partial-restore-incomplete"));
    } else assert.equal(context.indexBacklogReasons.size, 0);
  });
}

/** Pending coverage does not imply a renderer task is still running after a bounded request fails. */
test("settled semantic failure exposes incomplete status while real active work retains updating status", async () => {
  let active = false;
  const context = {
    initialIndexComplete: true, indexDirty: false, rebuildTask: null, rebuildTimer: null,
    index: {
      hasPendingSnapshotHydration: () => false, hasPendingSemanticPreparation: () => true,
      hasActiveSemanticPreparation: () => active, hasPendingSearchVocabulary: () => false,
      isCheckpointSaving: () => false, indexedMarkdownFileCount: () => 2,
    },
  };
  const facts = productionFunction("src/main.ts", "computeIndexStatusFacts", {});
  assert.deepEqual(await facts.call(context, 2), { upToDate: false, phase: "incomplete", indexedFiles: 2, totalFiles: 2 });
  active = true;
  assert.deepEqual(await facts.call(context, 2), { upToDate: false, phase: "updating", indexedFiles: 2, totalFiles: 2 });
});

/** Alias maintenance reports search work/failure without masquerading as relationship loading or readiness. */
test("optional alias progress and failure use distinct status copy while relationship failures retain priority", async () => {
  let phase="updating", progress={phase:"repair",processed:2,total:5}, searchFailure=null, relationshipFailure=null;
  const context={
    cachedMarkdownFileCount:5,
    computeIndexStatusFacts:()=>({upToDate:false,phase,indexedFiles:5,totalFiles:5}),
    index:{getSemanticPreparationFailure:()=>relationshipFailure,getSearchVocabularyFailure:()=>searchFailure,
      getUrlAliasUpgradeProgress:()=>progress,getSnapshotHydrationDiagnostics:()=>null},
    translator:(key,params)=>JSON.stringify({key,params}),
  };
  const status=productionFunction("src/main.ts","getIndexStatus",{});
  let result=await status.call(context);
  assert.deepEqual(JSON.parse(result.label),{key:"index.statusUpdatingSearchAliases",params:{processed:2,total:5}});
  assert.equal(result.upToDate,false);assert.equal(result.indexedFiles,5);
  progress={phase:"vocabulary",processed:0,total:null};
  assert.equal(JSON.parse((await status.call(context)).label).key,"index.statusUpdatingSearchVocabulary");
  phase="incomplete";progress=null;searchFailure="url-alias-vocabulary-unavailable";
  assert.equal(JSON.parse((await status.call(context)).label).key,"index.statusSearchIncomplete");
  relationshipFailure="decode-budget";
  assert.equal(JSON.parse((await status.call(context)).label).key,"index.statusRelationshipLimit");
});

test("pre-restore file events update temporary availability while preserving backlog revision fences", async () => {
  class TFile { constructor(path) { this.path = path; this.extension = "md"; } }
  class TFolder { constructor(path) { this.path = path; } }
  const vaultEvents = new Map(), metadataEvents = new Map(), updates = [], cleanup = [];
  const context = { preRestoreListenerCleanup: null, preRestoreChanged: false, indexDirtyRevision: 0,
    preRestoreReasons: new Map(), preRestoreMarkdownPaths: new Map(),
    app: { vault: { on: (kind, callback) => { vaultEvents.set(kind, callback); return kind; }, offref: kind => vaultEvents.delete(kind) },
      metadataCache: { on: (kind, callback) => { metadataEvents.set(kind, callback); return kind; }, offref: kind => metadataEvents.delete(kind) } },
    index: { updateHostFileAvailability: (...args) => updates.push([context.indexDirtyRevision, ...args]),
      updateHostFolderAvailability: async (...args) => updates.push([context.indexDirtyRevision, ...args]) }, register: callback => cleanup.push(callback) };
  const install = productionFunction("src/main.ts", "installPreRestoreChangeFence", { TFile, TFolder });
  await install.call(context);
  const file = new TFile("Created.md");
  vaultEvents.get("create")(file);
  file.path = "Renamed.md"; vaultEvents.get("rename")(file, "Created.md");
  vaultEvents.get("delete")(file);
  assert.deepEqual(updates, [[1, "Created.md", file], [2, "Created.md", file], [3, "Renamed.md"]]);
  assert.equal(context.preRestoreChanged, true);
  assert.equal(context.preRestoreReasons.get("vault:rename"), 2);
  assert.equal(context.preRestoreMarkdownPaths.get("Renamed.md"), 3);
  const folder = new TFolder("NewFolder");
  vaultEvents.get("create")(folder); folder.path = "MovedFolder"; vaultEvents.get("rename")(folder, "NewFolder");
  vaultEvents.get("delete")(folder);
  assert.deepEqual(updates.slice(3), [[4, "NewFolder", folder], [5, "NewFolder", folder], [6, "MovedFolder"]]);
  cleanup[0](); assert.equal(vaultEvents.size, 0); assert.equal(metadataEvents.size, 0);
});

/** An ordinary host edit advances its source fence before starting asynchronous visible preparation. */
test("visible metadata preview captures the event's new source revision", async () => {
  const handlers = new Map(), file = { path: "Visible.md", extension: "md", stat: { mtime: 2, size: 20 } };
  const captures = [], visible = [];
  const context = { reactiveIndexListenersRegistered: false, indexDirtyRevision: 0,
    app: { vault: { on: () => ({}), getFileByPath: path => path === file.path ? file : null },
      metadataCache: { on: (kind, callback) => { handlers.set(kind, callback); return {}; } } },
    registerEvent: () => {}, pruneManagedMetadataWrites: () => {}, managedMetadataWrites: new Map(),
    renameMetadataSuppressions: new Map(), dirtyMarkdownPaths: new Set(),
    scheduleRebuild: () => { context.indexDirtyRevision++; },
    scheduleVisibleMetadataRefresh: path => visible.push(path),
    index: { refreshVisibleHostMetadataPreviews: path => { captures.push([path, context.indexDirtyRevision]); return true; } },
  };
  await productionFunction("src/main.ts", "registerReactiveIndexListeners", {}).call(context);
  handlers.get("changed")(file);
  assert.deepEqual(captures, [[file.path, 1]], "the preview must not capture the revision invalidated later in the same callback");
  assert.deepEqual(visible, [file.path]);
  context.managedMetadataWrites.set(file.path, Date.now() + 10000);
  handlers.get("changed")(file);
  assert.deepEqual(captures[1], [file.path, 1], "managed writes refresh presentation without scheduling a duplicate dirty batch");
});
