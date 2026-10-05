/**
 * Runs the production relationship commit and pointer-drop callbacks with bounded host doubles.
 * Source extraction isolates native shells without replacing the behavior under test.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

/** Compile a named production arrow callback or class method with explicit injected dependencies. */
function productionFunction(path, name, dependencies) {
  const source = ts.createSourceFile(path, readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) expression = node.initializer.getText(source);
    if (ts.isMethodDeclaration(node) && node.name.getText(source) === name) expression = `async function ${name}${node.getText(source).slice(node.getText(source).indexOf("("))}`;
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert(expression, `${path} must define ${name}`);
  const output = ts.transpileModule(`const selected = ${expression};`, { compilerOptions: { target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.None } }).outputText;
  return Function(...Object.keys(dependencies), `${output}\nreturn selected;`)(...Object.values(dependencies));
}

/** Minimal Markdown-backed graph page retaining exact endpoint paths and canonical identity. */
function page(path) { return { path, file: { path, extension: "md" }, neighbours: new Map() }; }

for (const role of ["parent", "child", "left", "right"]) {
  test(`existing-target ${role} Link prepares authority, persists ontology and releases endpoint demands`, async () => {
    const staleOrigin = page("Origin.md"); const staleTarget = page("Target.md");
    const origin = page(staleOrigin.path); const target = page(staleTarget.path);
    const frontmatter = {}; const edits = []; const events = []; let ready = false;
    const context = {
      translator: (key) => key,
      index: {
        isSemanticWriteReady: () => ready,
        acquireSemanticDemand: (path) => { events.push(`acquire:${path}`); return () => events.push(`release:${path}`); },
        refreshSemanticSettings: async () => { events.push("prepare"); ready = true; },
        get: (path) => path === origin.path ? origin : target,
        gateNeighbourPaths: (current) => { assert.equal(current, origin); return new Set(); },
        isConnected: () => false,
        applyRelationshipEdit: (...args) => edits.push(args),
      },
      managedMetadataWrites: new Map(), pruneManagedMetadataWrites: () => {}, allOntologyFields: () => ["custom ontology"],
      referenceForPage: (current, storage) => { assert.equal(current, target); assert.equal(storage, origin.file); return "[[Target]]"; },
      app: { fileManager: { processFrontMatter: async (file, update) => { assert.equal(file, origin.file); events.push("write"); update(frontmatter); } } },
    };
    context.writeRelationship = productionFunction("src/main.ts", "writeRelationship", { normalizeFieldName: (value) => value.toLowerCase().trim() });
    const commit = productionFunction("src/main.ts", "createRelationToPage", { Notice: class {} });
    await commit.call(context, staleOrigin, role, staleTarget, "custom ontology");
    assert.deepEqual(frontmatter, { "custom ontology": ["[[Target]]"] });
    assert.deepEqual(edits, [[origin.path, target.path, role, "custom ontology"]]);
    assert.deepEqual(events, ["acquire:Origin.md", "acquire:Target.md", "prepare", "write", "release:Origin.md", "release:Target.md"]);
  });
}

test("existing-target Link reports unavailable authority without writing and releases both demands", async () => {
  const origin = page("Origin.md"); const target = page("Target.md"); const released = [];
  const context = {
    translator: (key) => key,
    index: {
      isSemanticWriteReady: () => false,
      acquireSemanticDemand: (path) => () => released.push(path), refreshSemanticSettings: async () => {},
      get: (path) => path === origin.path ? origin : target,
    },
    writeRelationship: () => assert.fail("An unready pair must not mutate the vault"),
  };
  const commit = productionFunction("src/main.ts", "createRelationToPage", { Notice: class {} });
  await assert.rejects(commit.call(context, origin, "child", target, "children"), /relation.preparingRelationship/);
  assert.deepEqual(released, [origin.path, target.path]);
});

test("gate drop on history offers all four roles against the exact historical endpoint", () => {
  const origin = page("Origin.md"); const target = page("Target.md"); const menus = []; const actions = [];
  class Menu {
    constructor() { this.items = []; }
    addItem(configure) {
      const item = { setTitle(value) { this.title = value; return this; }, setIcon() { return this; }, onClick(callback) { this.click = callback; return this; } };
      configure(item); this.items.push(item); return this;
    }
  }
  const ownerDocument = { elementFromPoint: () => ({ closest: () => ({ dataset: { kplexHistoryPath: target.path } }) }) };
  const viewport = { current: { classList: { remove() {} } } };
  const connectDrag = { pointerId: 7, originPath: origin.path, gate: "bottom", moved: true };
  let remainingDrag = connectDrag;
  const dependencies = {
    Menu, index: { get: (path) => path === origin.path ? origin : path === target.path ? target : undefined },
    translate: (key) => key, hostLeaf: {}, clearHoverIntent: () => {},
    plugin: { showKplexMenuAtPosition: (menu, coordinates, document) => { assert.equal(document, ownerDocument); assert.deepEqual(coordinates, { x: 30, y: 40 }); menus.push(menu); }, openRelationModal: (options) => actions.push(options) },
  };
  dependencies.openHistoryRelationshipMenu = productionFunction("src/ui/PlexGraph.tsx", "openHistoryRelationshipMenu", dependencies);
  const up = productionFunction("src/ui/PlexGraph.tsx", "up", {
    ...dependencies, areaResizeDrag: { current: null }, finishAreaSettingsDismiss: () => {}, pendingGateLongPress: { current: null },
    connectDrag, setConnectDrag: (value) => { remainingDrag = value; }, suppressActivateUntil: { current: 0 }, touchPointers: { current: new Map() }, viewport,
  });
  up({ pointerId: 7, pointerType: "mouse", clientX: 30, clientY: 40, currentTarget: { ownerDocument } });
  assert.equal(remainingDrag, null); assert.equal(menus.length, 1);
  assert.deepEqual(menus[0].items.map((item) => item.title), ["role.parent", "role.child", "role.friend", "role.challenger"]);
  assert.equal(actions.length, 0, "Dropping is not an implicit mutation");
  for (const item of menus[0].items) item.click();
  assert.deepEqual(actions.map((action) => action.semanticRole), ["parent", "child", "left", "right"]);
  for (const action of actions) { assert.equal(action.origin, origin); assert.equal(action.fixedTarget, target); assert.equal(action.mode, "create"); }
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
