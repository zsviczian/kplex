/**
 * Runs the production relationship commit, navigation camera and pointer-drop callbacks with bounded host doubles.
 * Source extraction isolates native shells without replacing the behavior under test.
 */
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import test from "node:test";
import ts from "typescript";

// The real convergence adapter is exercised with host events, not replaced by an immediate success.
const metadataTemp = mkdtempSync(join(tmpdir(), "kplex-created-metadata-"));
process.on("exit", () => rmSync(metadataTemp, { recursive: true, force: true }));
await build({ stdin: { contents: 'export * from "./src/adapters/obsidian/relationshipMetadataWrite"; export { normalizeFieldName } from "./src/core/contracts/fieldName";', resolveDir: fileURLToPath(new URL("..", import.meta.url)) },
  outfile: join(metadataTemp, "observer.mjs"), bundle: true, platform: "node", format: "esm" });
const { writeRelationshipMetadata, SavedRelationshipPendingError: ActualSavedPendingError, normalizeFieldName: actualNormalizeFieldName }
  = await import(pathToFileURL(join(metadataTemp, "observer.mjs")));

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

/** Extract shared chip eligibility/menu callbacks with canonical gate membership supplied by the index port. */
function historyFixture(targetKind="history") {
  const origin=page("Origin.md"),target=page("Target.md"),menus=[],actions=[],blocked=new Map();
  class Menu {
    constructor(){this.items=[];}
    addItem(configure){const item={setTitle(value){this.title=value;return this;},setIcon(){return this;},onClick(callback){this.click=callback;return this;}};configure(item);this.items.push(item);return this;}
  }
  const ownerDocument={elementFromPoint:()=>({closest:()=>({dataset:targetKind==="pinned"?{kplexPinnedPath:target.path}:{kplexHistoryPath:target.path}})})};
  const dependencies={Menu,index:{get:path=>path===origin.path?origin:path===target.path?target:undefined,gateNeighbourPaths:(current,gate)=>{assert.equal(current,origin);return blocked.get(gate)??new Set();}},translate:key=>key,hostLeaf:{},clearHoverIntent:()=>{},
    plugin:{showKplexMenuAtPosition:(menu,coordinates,document)=>{assert.equal(document,ownerDocument);assert.deepEqual(coordinates,{x:30,y:40});menus.push(menu);},openRelationModal:options=>actions.push(options)}};
  dependencies.relationshipDropRoles=productionFunction("src/ui/PlexGraph.tsx","relationshipDropRoles",dependencies);
  dependencies.historyRelationshipTarget=productionFunction("src/ui/PlexGraph.tsx","historyRelationshipTarget",dependencies);
  dependencies.openHistoryRelationshipMenu=productionFunction("src/ui/PlexGraph.tsx","openHistoryRelationshipMenu",dependencies);
  return {origin,target,menus,actions,ownerDocument,dependencies,blocked};
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

for(const [gate,role] of [["top","parent"],["bottom","child"],["left","left"],["right","right"]]){
  test(`gate ${gate} drop on pinned chip retains exact ${role} fixed-target routing`,()=>{
    const {origin,target,menus,actions,ownerDocument,dependencies}=historyFixture("pinned");
    const connectDrag={pointerId:7,originPath:origin.path,gate,moved:true};let remainingDrag=connectDrag;
    const up=productionFunction("src/ui/PlexGraph.tsx","up",{...dependencies,clearHistoryDragHover:()=>{},semanticRoleForGate:productionFunction("src/ui/PlexGraph.tsx","semanticRoleForGate",{}),
      areaResizeDrag:{current:null},finishAreaSettingsDismiss:()=>{},pendingGateLongPress:{current:null},connectDrag,setConnectDrag:value=>{remainingDrag=value;},suppressActivateUntil:{current:0}});
    up({pointerId:7,pointerType:"mouse",clientX:30,clientY:40,currentTarget:{ownerDocument}});
    assert.equal(remainingDrag,null);assert.equal(menus.length,0);assert.equal(actions.length,1);
    assert.equal(actions[0].origin,origin);assert.equal(actions[0].fixedTarget,target);assert.equal(actions[0].semanticRole,role);assert.equal(actions[0].mode,"create");
  });
}

test("pinned chooser omits canonical duplicate roles and rejects unwritable or self endpoints",()=>{
  const {origin,target,menus,actions,ownerDocument,dependencies,blocked}=historyFixture("pinned");
  blocked.set("top",new Set([target.path]));
  assert.equal(dependencies.openHistoryRelationshipMenu(origin,30,40,ownerDocument,"parent"),false);
  assert.equal(actions.length,0);assert.equal(menus.length,0);
  assert.equal(dependencies.openHistoryRelationshipMenu(origin,30,40,ownerDocument),true);
  assert.deepEqual(menus[0].items.map(item=>item.title),["role.child","role.friend","role.challenger"]);
  menus[0].items[0].click();assert.equal(actions[0].fixedTarget,target);assert.equal(actions[0].semanticRole,"child");
  assert.equal(dependencies.openHistoryRelationshipMenu(target,30,40,ownerDocument),false);
  for(const flag of ["isFolder","isTag"]){target[flag]=true;assert.equal(dependencies.openHistoryRelationshipMenu(origin,30,40,ownerDocument),false);delete target[flag];}
  target.file.extension="png";assert.equal(dependencies.openHistoryRelationshipMenu(origin,30,40,ownerDocument,"child"),true,"Markdown origin can link an attachment target");
  origin.file.extension="png";assert.equal(dependencies.openHistoryRelationshipMenu(origin,30,40,ownerDocument),false,"Two non-Markdown endpoints cannot persist a property");
});

/** Capture transfers retain the active viewport gesture when an older child emits loss for the same pointer. */
test("retired child capture cannot cancel a viewport-owned node drag",()=>{
  let cancelled=0,cleared=0,resized=0;
  const nodeDrag={pointerId:7,path:"Dragged.md"},viewport={hasPointerCapture:id=>id===7};
  const lost=productionFunction("src/ui/PlexGraph.tsx","lostPointerCapture",{
    connectDrag:null,nodeDrag,cancel:()=>cancelled++,clearHistoryDragHover:()=>cleared++,finishAreaResize:()=>{resized++;return false},setAreaHoverIfChanged:()=>{},
  });
  lost({pointerId:7,target:{},currentTarget:viewport});
  assert.equal(cancelled,0,"The current capture owner still receives motion; stale child loss cannot retire it");
  assert.equal(cleared,0);assert.equal(resized,0);
  viewport.hasPointerCapture=()=>false;lost({pointerId:7,target:viewport,currentTarget:viewport});
  assert.equal(cancelled,1,"Actual viewport capture loss must terminate the matching node drag");
});

test("actual originating gate capture loss cancels its connector while unrelated pointers preserve it",()=>{
  let cancelled=0;const viewport={hasPointerCapture:()=>false};
  const lost=productionFunction("src/ui/PlexGraph.tsx","lostPointerCapture",{
    connectDrag:{pointerId:7},nodeDrag:null,cancel:()=>cancelled++,clearHistoryDragHover:()=>{},finishAreaResize:()=>false,setAreaHoverIfChanged:()=>{},
  });
  lost({pointerId:8,target:{},currentTarget:viewport});assert.equal(cancelled,0);
  lost({pointerId:7,target:{},currentTarget:viewport});assert.equal(cancelled,1);
});

/** Existing drag ownership wins over area hover/resize across both relationship bands and controls. */
for(const kind of ["node","connector"]){
  test(`active ${kind} drag continues through parent and child areas without yielding to resize or hover`,()=>{
    const origin=page("Dragged.md");
    const ownerDocument={elementFromPoint:()=>({closest:()=>null})};
    const viewport={current:{getBoundingClientRect:()=>({left:20,top:30})}},camera={current:{x:10,y:15,scale:2}};
    const original=kind==="node"?{path:origin.path,pointerId:7,offsetX:5,offsetY:7,startClientX:40,startClientY:50,x:0,y:0,moved:false}
      :{originPath:origin.path,gate:"left",pointerId:7,startClientX:40,startClientY:50,current:{x:0,y:0},moved:false};
    let current=original;
    const pendingAreaHeight={current:null},areaResizeFrame={current:null},areaResizeDrag={current:null},historyDragHover={current:null};
    const dependencies={viewport,camera,areaResizeDrag,pendingAreaHeight,areaResizeFrame,historyDragHover,
      index:{get:()=>origin,gateNeighbourPaths:()=>assert.fail("Ordinary area motion must not scan chip roles")},
      connectDrag:kind==="connector"?original:null,nodeDrag:kind==="node"?original:null,
      updateAreaSettingsDismiss:()=>{},touchLongPress:{current:null},cancelTouchLongPress:()=>assert.fail("Mouse movement cannot cancel a touch hold"),
      setConnectDrag:update=>{current=typeof update==="function"?update(current):update},setNodeDrag:update=>{current=typeof update==="function"?update(current):update},
      areaSettingsMode:true,areaHoverAt:()=>assert.fail("Active drag must not transfer to area hover"),setAreaHoverIfChanged:()=>assert.fail("Active drag must not resize/hover an area"),
    };
    for(const name of ["toWorld","semanticRoleForGate","relationshipDropRoles","historyRelationshipTarget","clearHistoryDragHover","updateHistoryDragHover"])
      dependencies[name]=productionFunction("src/ui/PlexGraph.tsx",name,dependencies);
    const move=productionFunction("src/ui/PlexGraph.tsx","move",dependencies);
    const points=[[100,100],[150,10],[200,-120],[250,250],[300,500],[350,100]];
    for(const [clientX,clientY]of points){
      move({pointerId:7,pointerType:"mouse",clientX,clientY,currentTarget:{ownerDocument},target:{closest:()=>({className:"kplex-zone-scroll"})}});
      const world={x:(clientX-30)/2,y:(clientY-45)/2};
      if(kind==="node"){assert.equal(current.x,world.x-5);assert.equal(current.y,world.y-7)}else assert.deepEqual(current.current,world);
      assert.equal(current.moved,true);assert.equal(pendingAreaHeight.current,null);assert.equal(areaResizeFrame.current,null);
    }
    const last=current;move({pointerId:8,pointerType:"mouse",clientX:500,clientY:500,currentTarget:{ownerDocument}});
    assert.equal(current,last,"A different pointer cannot update or retire the owning drag");
  });
}

for(const rejection of ["self","duplicate","folder"]){
  test(`rejected pinned ${rejection} gate release does not fall through to an unfixed composer`,()=>{
    const {origin,target,actions,menus,ownerDocument,dependencies,blocked}=historyFixture("pinned");
    if(rejection==="self")target.path=origin.path;
    if(rejection==="duplicate")blocked.set("top",new Set([target.path]));
    if(rejection==="folder")target.isFolder=true;
    const connectDrag={pointerId:7,originPath:origin.path,gate:"top",moved:true};let remainingDrag=connectDrag;
    const up=productionFunction("src/ui/PlexGraph.tsx","up",{...dependencies,clearHistoryDragHover:()=>{},semanticRoleForGate:productionFunction("src/ui/PlexGraph.tsx","semanticRoleForGate",{}),
      areaResizeDrag:{current:null},finishAreaSettingsDismiss:()=>{},pendingGateLongPress:{current:null},connectDrag,setConnectDrag:value=>{remainingDrag=value;},suppressActivateUntil:{current:0}});
    up({pointerId:7,pointerType:"mouse",clientX:30,clientY:40,currentTarget:{ownerDocument}});
    assert.equal(remainingDrag,null);assert.equal(actions.length,0);assert.equal(menus.length,0);
  });
}

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
      isOnDemandMode: () => false,
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
        isOnDemandMode: () => false,
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
      isOnDemandMode: () => false,
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
    index:{isOnDemandMode:()=>false,getSemanticPreparationFailure:()=>relationshipFailure,getSearchVocabularyFailure:()=>searchFailure,
      getUrlAliasUpgradeProgress:()=>progress,getSnapshotHydrationDiagnostics:()=>null,
      getUrlIndexProgress:()=>({active:false,failed:false,processed:5,total:5})},
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

/** Local readiness reports acquired owners and exposes unavailable inputs without global certification. */
test("on-demand status distinguishes local readiness from complete-vault indexing", async () => {
  let unavailable = false;
  const context = {
    initialIndexComplete: true, indexDirty: false, rebuildTask: null, rebuildTimer: null,
    cachedMarkdownFileCount: 100, translator: key => key,
    index: {
      isOnDemandMode: () => true, hasLocalBaseline: () => true, hasPendingSnapshotHydration: () => false,
      hasPendingSemanticPreparation: () => false, hasPendingSearchVocabulary: () => false,
      hasUnavailableLocalCounts: () => unavailable, indexedMarkdownFileCount: () => 2,
      isCheckpointSaving: () => false, getSnapshotHydrationDiagnostics: () => null,
      getUrlIndexProgress: () => ({ active: false, failed: false, processed: 100, total: 100 }),
    },
  };
  const compute = productionFunction("src/main.ts", "computeIndexStatusFacts", {});
  const status = productionFunction("src/main.ts", "getIndexStatus", {});
  let facts = await compute.call(context, 100);
  context.computeIndexStatusFacts = () => facts;
  assert.deepEqual(facts, { upToDate: true, phase: "ready", indexedFiles: 2, totalFiles: 100 });
  assert.equal((await status.call(context)).label, "indexing.localReady");
  unavailable = true;
  facts = await compute.call(context, 100);
  assert.equal(facts.upToDate, false);
  assert.equal(facts.phase, "incomplete");
  assert.equal((await status.call(context)).label, "indexing.localUnavailable");
});

/** URL preparation reports actual restored counts without an invented zero-total scan or withholding local readiness. */
test("URL discovery status is independent of ready local graphs and clears after actual work settles", async () => {
  let localActive = false, url = { active: true, failed: false, processed: 0, total: 0, restored: 0 };
  const context = {
    initialIndexComplete: false, indexDirty: false, rebuildTask: null, rebuildTimer: null,
    cachedMarkdownFileCount: 100, translator: (key, params) => JSON.stringify({ key, params }),
    index: {
      isOnDemandMode: () => true, hasLocalBaseline: () => true,
      hasPendingSnapshotHydration: () => false, hasPendingSemanticPreparation: () => localActive,
      hasActiveSemanticPreparation: () => localActive, hasPendingSearchVocabulary: () => false,
      hasUnavailableLocalCounts: () => false, isCheckpointSaving: () => false,
      indexedMarkdownFileCount: () => 2, getSnapshotHydrationDiagnostics: () => null,
      getUrlIndexProgress: () => url,
    },
  };
  const compute = productionFunction("src/main.ts", "computeIndexStatusFacts", {});
  const status = productionFunction("src/main.ts", "getIndexStatus", {});
  let facts = await compute.call(context, 100);
  context.computeIndexStatusFacts = () => facts;
  assert.equal(facts.phase, "ready", "Optional discovery cannot withhold local readiness");
  assert.deepEqual(JSON.parse((await status.call(context)).label), {
    key: "indexing.urlsPreparing",
  });
  url = { active: true, failed: false, processed: 0, total: 0, restored: 42 };
  assert.deepEqual(JSON.parse((await status.call(context)).label), {
    key: "indexing.urlsRestoring", params: { restored: 42 },
  });
  url = { active: true, failed: false, processed: 0, total: 0, restored: 75 };
  assert.deepEqual(JSON.parse((await status.call(context)).label), {
    key: "indexing.urlsRestoring", params: { restored: 75 },
  }, "The label tracks the actual restored count");
  url = { active: true, failed: false, processed: 4, total: 100, restored: 75 };
  assert.deepEqual(JSON.parse((await status.call(context)).label), {
    key: "indexing.urlsProgress", params: { processed: 4, total: 100 },
  });
  url = { active: false, failed: true, processed: 99, total: 100, restored: 75 };
  assert.equal(JSON.parse((await status.call(context)).label).key, "indexing.urlsIncomplete");
  url = { active: false, failed: false, processed: 100, total: 100, restored: 75 };
  assert.equal(JSON.parse((await status.call(context)).label).key, "indexing.localReady");
  localActive = true;
  facts = await compute.call(context, 100);
  assert.equal(facts.upToDate, false);
  assert.equal(JSON.parse((await status.call(context)).label).key, "indexing.localPreparing");
});

test("pre-restore file events update temporary availability while preserving backlog revision fences", async () => {
  class TFile { constructor(path) { this.path = path; this.extension = "md"; } }
  class TFolder { constructor(path) { this.path = path; } }
  const vaultEvents = new Map(), metadataEvents = new Map(), updates = [], cleanup = [], topology = [];
  const context = { preRestoreListenerCleanup: null, preRestoreChanged: false, indexDirtyRevision: 0,
    preRestoreReasons: new Map(), preRestoreMarkdownPaths: new Map(),
    app: { vault: { on: (kind, callback) => { vaultEvents.set(kind, callback); return kind; }, offref: kind => vaultEvents.delete(kind) },
      metadataCache: { on: (kind, callback) => { metadataEvents.set(kind, callback); return kind; }, offref: kind => metadataEvents.delete(kind) } },
    index: { invalidateHostStructure: () => topology.push(context.indexDirtyRevision),
      updateHostFileAvailability: (...args) => updates.push([context.indexDirtyRevision, ...args]),
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
  assert.deepEqual(topology, [0, 1, 2, 3, 4, 5], "Each pre-restore topology observation closes native count proof before deferred refresh");
  cleanup[0](); assert.equal(vaultEvents.size, 0); assert.equal(metadataEvents.size, 0);
});

/** An ordinary host edit advances its source fence before starting asynchronous visible preparation. */
test("visible metadata preview captures the event's new source revision", async () => {
  const handlers = new Map(), file = { path: "Visible.md", extension: "md", stat: { mtime: 2, size: 20 } };
  const captures = [], visible = [], presentation = [];
  const context = { reactiveIndexListenersRegistered: false, indexDirtyRevision: 0,
    app: { vault: { on: () => ({}), getFileByPath: path => path === file.path ? file : null },
      metadataCache: { on: (kind, callback) => { handlers.set(kind, callback); return {}; } } },
    registerEvent: () => {}, pruneManagedMetadataWrites: () => {}, managedMetadataWrites: new Map(),
    renameMetadataSuppressions: new Map(), dirtyMarkdownPaths: new Set(),
    scheduleRebuild: () => { context.indexDirtyRevision++; },
    scheduleVisibleMetadataRefresh: path => visible.push(path),
    index: { refreshVisibleHostMetadataPreviews: (path, prior) => { captures.push([path, context.indexDirtyRevision, prior]); return true; },
      refreshVisiblePresentation: path => { presentation.push([path, context.indexDirtyRevision]); return Promise.resolve(); } },
  };
  await productionFunction("src/main.ts", "registerReactiveIndexListeners", {}).call(context);
  handlers.get("changed")(file);
  assert.deepEqual(captures, [[file.path, 1, 0]], "the preview captures the new revision and exact previous known-event revision");
  assert.deepEqual(visible, [file.path]);
  context.managedMetadataWrites.set(file.path, Date.now() + 10000);
  handlers.get("changed")(file);
  assert.deepEqual(captures[1], [file.path, 1, 1], "managed writes refresh presentation without scheduling a duplicate dirty batch");
  assert.deepEqual(presentation, [[file.path, 1], [file.path, 1]], "Ordinary and managed events repair finite optional facets after their source fence");
});

/** React portal capture runs before the native header drag helper, so its host must retain focus. */
test("portaled filter heading preserves form focus while bare Plex space focuses the shell", () => {
  let focused = 0, dismissed = 0;
  const down = productionFunction("src/ui/App.tsx", "handlePlexPointerDown", {
    plugin: { dismissKplexMenu: () => dismissed++ }, rootRef: { current: { focus: () => focused++ } },
  });
  down({ target: { closest: selector => selector.includes(".kplex-filter-panel") ? {} : null } });
  assert.equal(focused, 0, "Portal capture must not steal the filter input's focus before dragging");
  down({ target: { closest: () => null } });
  assert.equal(focused, 1, "Bare Plex focus policy remains available");
  assert.equal(dismissed, 2);
});


/** Select the real scene-recenter layout effect, including its navigation/editor preservation guards. */
function cameraLayoutEffect(dependencies) {
  const source = ts.createSourceFile("PlexGraph.tsx", readFileSync(new URL("../src/ui/PlexGraph.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback;
  const visit = node => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "useLayoutEffect"
      && node.arguments[0]?.getText(source).includes("const shouldRecenter")) callback = node.arguments[0].getText(source);
    ts.forEachChild(node, visit);
  };
  visit(source); assert(callback, "Real layout effect must own navigation recentering");
  const output = ts.transpileModule(`const selected = ${callback};`, { compilerOptions: { target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.None } }).outputText;
  return Function(...Object.keys(dependencies), `${output}\nreturn selected;`)(...Object.values(dependencies));
}

test("navigation with autofit disabled recenters without resetting manual scale", () => {
  const camera = { x: 63, y: -44, scale: 1.73 }, calls = [];
  const dependencies = {
    viewport: { current: { clientWidth: 800, clientHeight: 600, querySelectorAll: () => [], ownerDocument: { defaultView: { matchMedia: () => ({ matches: false }) } } } },
    sceneMotion: { cancelAll: () => {} }, preserveCameraOnNextLayout: { current: false },
    centralEditorAvailabilityRef: { current: false }, centralEditorAvailable: false, centralEditorSize: null,
    centralEditorSizeKeyRef: { current: "" }, previousNodeRects: { current: new Map([["prior", {}]]) },
    pathChangedThisRender: true, settings: { allowAutozoom: false, animationSpeed: 0 },
    fit: () => { calls.push("fit"); Object.assign(camera, { scale: 0.4, x: 90, y: 120 }); },
    applyCamera: update => Object.assign(camera, typeof update === "function" ? update(camera) : update),
    flushCameraTransform: () => calls.push("flush"), syncCentralEditorOverlay: () => {},
  };
  cameraLayoutEffect(dependencies)();
  assert.deepEqual(camera, { x: 400, y: 300, scale: 1.73 }); assert.deepEqual(calls, ["flush"]);
  // Enabled autofit still uses the complete graph bounds, while explicit editor restore keeps its camera.
  dependencies.settings.allowAutozoom = true; dependencies.previousNodeRects.current = new Map([["prior", {}]]);
  cameraLayoutEffect(dependencies)(); assert.equal(camera.scale, 0.4); assert.deepEqual(calls, ["flush", "fit", "flush"]);
  Object.assign(camera, { x: 99, y: 88, scale: 2.1 }); dependencies.preserveCameraOnNextLayout.current = true;
  cameraLayoutEffect(dependencies)(); assert.deepEqual(camera, { x: 99, y: 88, scale: 2.1 });
  dependencies.settings.allowAutozoom = false; dependencies.pathChangedThisRender = false;
  dependencies.previousNodeRects.current = new Map([["prior", {}]]); dependencies.preserveCameraOnNextLayout.current = false;
  cameraLayoutEffect(dependencies)(); assert.deepEqual(camera, { x: 99, y: 88, scale: 2.1 }, "Metadata layout updates retain the full camera");
});


/** Supply real convergence logic with controlled native metadata events and a newly persisted file. */
function createdMetadataFixture({ extension = "md", displayField = "aliases", initialCache = null } = {}) {
  const target = page(`Created.${extension}`); target.file.extension = extension;
  target.file.basename = "Created"; target.file.stat = { mtime: 1, size: 0 };
  const file = target.file, origin = page("Origin.md"), writes = [], events = [], notices = [];
  let cache = initialCache, body = "", frontmatter = {}, pairCaptured = false;
  const host = () => ({ refs: new Set(), on(name, callback) { const ref = { name, callback }; this.refs.add(ref); return ref; }, offref(ref) { this.refs.delete(ref); },
    emit(name, ...args) { for (const ref of [...this.refs]) if (ref.name === name) ref.callback(...args); } });
  const metadataCache = Object.assign(host(), { getFileCache: selected => selected === file ? cache : null });
  const vault = Object.assign(host(), { getFileByPath: path => path === file.path ? file : path === origin.path ? origin.file : null,
    cachedRead: async selected => { assert.equal(selected, file); return body; } });
  const context = { app: { vault, metadataCache, fileManager: {
    getNewFileParent: () => ({ path: "/" }),
    processFrontMatter: async (selected, mutate) => {
      assert.equal(selected, file); const next = structuredClone(frontmatter); mutate(next); frontmatter = next;
      const nextBody = Object.keys(next).length ? JSON.stringify(next) : "";
      if (nextBody !== body) { file.stat.mtime++; file.stat.size = nextBody.length; body = nextBody; }
      writes.push(structuredClone(next)); events.push("native-write");
    },
  } }, relationshipWriteCancels: new Set(), managedMetadataWrites: new Map(), unloading: false,
    pruneManagedMetadataWrites: () => {}, configuredDisplayNameField: () => displayField,
    translator: key => key, validateRelatedNoteName: () => ({ valid: true, existing: null, stem: "Created" }),
    createNewFileInFolder: async () => file,
    index: { withForegroundPriority: async work => work(), insertCreatedFile: () => target, get: path => path === target.path ? target : origin },
    prepareRelationshipMutation: async () => {
      assert(cache && JSON.stringify(cache.frontmatter) === JSON.stringify(frontmatter), "Exact pair cannot capture a cache preceding creation writes");
      pairCaptured = true; events.push("capture-pair"); return [origin, target];
    },
    writeRelationship: async () => { assert(pairCaptured); events.push("write-relation"); },
    publishSavedRelationship: async () => events.push("publish-relation"),
  };
  for (const method of ["mutateCreatedNodeMetadata", "writeCreatedNodeDisplayName", "writeCreatedNodeAlias", "createNewRelatedFileForOrigin", "linkNewRelatedFile"])
    context[method] = productionFunction("src/main.ts", method, { writeRelationshipMetadata, normalizeFieldName: actualNormalizeFieldName,
      Notice: class { constructor(message) { notices.push(message); } } }).bind(context);
  return { context, file, origin, writes, events, notices, metadataCache, vault,
    observe() { cache = { frontmatter: structuredClone(frontmatter) }; events.push("cache-body-observed"); metadataCache.emit("changed", file, body, cache); },
    cancel() { for (const stop of [...context.relationshipWriteCancels]) stop(); },
    clean() { assert.equal(metadataCache.refs.size, 0); assert.equal(vault.refs.size, 0); assert.equal(context.relationshipWriteCancels.size, 0); },
  };
}

/** Advance only explicit promises; no elapsed-time or quiet-window authority enters these tests. */
const nextCreatedStep = () => new Promise(resolve => setImmediate(resolve));

for (const kind of ["markdown", "excalidraw"]) test(`${kind} gate creation waits for display and alias cache/body observations before exact linking`, async () => {
  const f = createdMetadataFixture({ displayField: kind === "markdown" ? "aliases" : "Title" });
  const previousWindow = globalThis.window; globalThis.window = { setTimeout, clearTimeout };
  let operation;
  try {
    let finished = false;
    operation = f.context.createNewRelatedFileForOrigin(f.origin, "Display title", kind, "User alias").then(file => { finished = true; return file; });
    await nextCreatedStep(); assert.equal(f.writes.length, 1); assert.equal(finished, false);
    assert(!f.events.includes("capture-pair")); f.observe(); await nextCreatedStep();
    assert.equal(f.writes.length, 2); assert.equal(finished, false, "A second alias write must receive its own final cache/body observation");
    f.observe(); const file = await operation;
    assert.equal(file, f.file); f.clean();
    await f.context.linkNewRelatedFile(f.origin, "child", file, "Children", "User alias", "Display title");
    assert.deepEqual(f.events, ["native-write", "cache-body-observed", "native-write", "cache-body-observed", "capture-pair", "write-relation", "publish-relation"]);
  } finally { f.cancel(); await operation?.catch(() => {}); globalThis.window = previousWindow; f.clean(); }
});

test("new blank Markdown waits for its first cache while legacy non-Markdown drawing keeps physical binding", async () => {
  const previousWindow = globalThis.window; globalThis.window = { setTimeout, clearTimeout };
  const blank = createdMetadataFixture({ displayField: null }); let operation;
  try {
    let finished = false;
    operation = blank.context.createNewRelatedFileForOrigin(blank.origin, "Blank", "markdown").then(file => { finished = true; return file; });
    await nextCreatedStep(); assert.equal(blank.writes.length, 1); assert.deepEqual(blank.writes[0], {}); assert.equal(finished, false);
    blank.observe(); assert.equal(await operation, blank.file); blank.clean();
    const drawing = createdMetadataFixture({ extension: "excalidraw", displayField: "aliases" });
    assert.equal(await drawing.context.createNewRelatedFileForOrigin(drawing.origin, "Drawing", "excalidraw", "Alias"), drawing.file);
    assert.equal(drawing.writes.length, 0); drawing.clean();
  } finally { blank.cancel(); await operation?.catch(() => {}); globalThis.window = previousWindow; blank.clean(); }
});

test("created-node presentation writers retain no-op inheritance and reject rename before relationship capture", async () => {
  const previousWindow = globalThis.window; globalThis.window = { setTimeout, clearTimeout };
  const f = createdMetadataFixture(); let operation;
  try {
    // These same observed writers are used by folder-child and ghost materialization callers.
    assert.equal(await f.context.writeCreatedNodeAlias(f.file, ""), ""); assert.equal(f.writes.length, 0);
    operation = f.context.writeCreatedNodeDisplayName(f.file, "Original").catch(error => error);
    await nextCreatedStep(); f.file.path = "Renamed.md"; f.vault.emit("rename", f.file, "Created.md");
    const error = await operation; assert(error instanceof ActualSavedPendingError); assert.equal(error.message, "note.savedMetadataPending");
    assert(!f.events.includes("capture-pair")); f.clean();
  } finally { f.cancel(); await operation?.catch(() => {}); globalThis.window = previousWindow; f.clean(); }
});


for (const consumer of ["folder", "ghost"]) test(`${consumer} creation also awaits shared display metadata before index materialization`, async () => {
  const previousWindow = globalThis.window; globalThis.window = { setTimeout, clearTimeout };
  const f = createdMetadataFixture(); let operation;
  try {
    f.context.index.insertCreatedFile = (file, aliases) => { f.events.push(["insert", file.path, aliases]); return page(file.path); };
    let finished = false;
    if (consumer === "folder") {
      const create = productionFunction("src/main.ts", "createNewNodeInFolder", { normalizePath: value => value, normalizeFieldName: actualNormalizeFieldName, Notice: class {} });
      operation = create.call(f.context, { isFolder: true, path: "folder:Owned" }, "Folder display", "markdown").then(value => { finished = true; return value; });
    } else {
      f.context.rememberNewNodeDefaultType = async kind => f.events.push(["default", kind]);
      f.context.index.renameFile = (oldPath, file) => { f.events.push(["rename", oldPath, file.path]); return true; };
      f.context.openInDocumentLeaf = async file => f.events.push(["open", file.path]);
      const materialize = productionFunction("src/main.ts", "materializeGhostPage", {});
      operation = materialize.call(f.context, { path: "Ghost", name: "Ghost display" }, "Created", "markdown", "").then(value => { finished = true; return value; });
    }
    await nextCreatedStep(); assert.equal(finished, false); assert.deepEqual(f.events, ["native-write"]);
    f.observe(); const result = await operation; assert(result); f.clean();
    if (consumer === "folder") assert.deepEqual(f.events, ["native-write", "cache-body-observed", ["insert", f.file.path, ["Folder display"]]]);
    else assert.deepEqual(f.events, ["native-write", "cache-body-observed", ["default", "markdown"], ["rename", "Ghost", f.file.path], ["open", f.file.path]]);
  } finally { f.cancel(); await operation?.catch(() => {}); globalThis.window = previousWindow; f.clean(); }
});
