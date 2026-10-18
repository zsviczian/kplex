/**
 * Node-only integration for App's actual fold/fullscreen delegation and the native local-menu
 * request owner. The real ActionManager proves host fallback with an explicit surface and no
 * graph center; native group geometry, focus and recovery-button interaction remain host lanes.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import ts from "typescript";
import {loadPortableModules} from "./support/portableTypeScript.mjs";

const {exports: {ActionManager, ACTION_CATALOG, surfaceAction}} = loadPortableModules([
  "src/application/ActionManager.ts", "src/core/plex/actions.ts", "src/ui/surfaceActionImplementation.ts",
]);
const foldId = "view.sidecar.collapse-plex";
const app = ts.createSourceFile("src/ui/App.tsx", readFileSync(new URL("../src/ui/App.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

/** Retain the exact production callback, with TypeScript annotations removed by the real compiler. */
function expression(text, dependencies = {}) {
  const compiled = ts.transpileModule(`const selected = ${text};`, {compilerOptions: {target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.None}}).outputText;
  return Function(...Object.keys(dependencies), `${compiled};return selected;`)(...Object.values(dependencies));
}

/** Locate one real App declaration rather than reproducing its surface implementation inventory. */
function declaration(name) {
  let found;
  /** App-local declarations have stable source owners even when unrelated layout code moves. */
  const visit = node => { if (ts.isVariableDeclaration(node) && node.name.getText(app) === name) found = node; ts.forEachChild(node, visit); };
  visit(app); assert(found, name); return found;
}

/** Return the actual App implementation if it still shadows a host-owned action. */
function implementation(id) {
  return declaration("appImplementations").initializer.properties.find(node => ts.isPropertyAssignment(node)
    && ts.isStringLiteral(node.name) && node.name.text === id);
}

/** Extract a native local-menu method without loading Obsidian or a browser runtime. */
function menuMethod(name, dependencies = {}) {
  const source = ts.createSourceFile("src/ui/ActionMenuModal.ts", readFileSync(new URL("../src/ui/ActionMenuModal.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const owner = source.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === "ActionMenuModal");
  const method = owner.members.find(node => ts.isMethodDeclaration(node) && node.name.getText(source) === name);
  assert(method, name);
  const text = method.getText(source);
  return expression(`function ${name}${text.slice(text.indexOf("("))}`, dependencies);
}

/** Surface-local intent falls through to the registered host operation, never a legacy collapse callback. */
function fixture() {
  const calls = [], legacy = [], pending = [], hostLeaf = {};
  const manager = new ActionManager({readCommandContext: /** These tests supply explicit local ownership. */ () => ({sharedCenter: null}),
    resolveSidecarFold: /** The host resolves an exact native pair independently of graph state. */ () => ({state: "resolved", target: {id: "pair", windowId: "main"}}),
    validateSidecarFold: /** This captured native incarnation remains live for the accepted interaction. */ target => target.id === "pair" && target.windowId === "main",
    implementations: {[foldId]: {availability: /** Native pair facts are owned by the host, not this empty graph. */ () => ({state: "enabled"}),
      execute: /** Record the finite accepted action context without any graph/file capability. */ context => { calls.push(context); return {status: "completed"}; }}},
  });
  const implementations = {}, appFold = implementation(foldId);
  if (appFold) implementations[foldId] = expression(appFold.initializer.getText(app), {
    uiAction: surfaceAction, hostLeaf, surface: "leaf",
    plugin: {collapsePlexForSidecar: /** Detect an obsolete App owner instead of silently fabricating host fallback. */ () => legacy.push(hostLeaf), isSidecarOpen: /** The native pair is eligible in this regression. */ () => true},
  });
  const snapshot = {mounted: true, visible: true, windowId: "main", center: null, selected: null, focusRegion: "graph", interactionRevision: 0, historyBack: false, historyForward: false, editorAvailable: false};
  const release = manager.registerSurface({id: "owning-plex", generation: 4, readSnapshot: /** Reacquire the exact mounted surface facts. */ () => snapshot, implementations});
  const actions = {dispatch: /** Match the existing surface dispatcher ownership while retaining its returned task for assertion. */ request => { pending.push(manager.dispatch({...request, surfaceId: "owning-plex"})); }};
  return {manager, calls, legacy, pending, actions, release};
}

test("actual fold button and toolbar intent reach the host owner with no graph center", async () => {
  const f = fixture();
  try {
    const runAction = expression(declaration("runAction").initializer.getText(app), {actions: f.actions});
    let button;
    /** Inspect the real fold button and invoke its production handler through the real toolbar intent. */
    const visit = node => {
      if (ts.isJsxElement(node) && node.openingElement.tagName.getText(app) === "button"
        && node.openingElement.attributes.properties.some(attribute => ts.isJsxAttribute(attribute) && attribute.name.text === "onClick" && attribute.initializer?.getText(app).includes(foldId))) button = node;
      ts.forEachChild(node, visit);
    };
    visit(app); assert(button, "native fold button missing");
    const attributes = button.openingElement.attributes.properties;
    assert(attributes.some(attribute => attribute.name?.text === "type" && attribute.initializer?.text === "button"));
    assert(!attributes.some(attribute => attribute.name?.text === "title"), "shared accessible tooltip must not duplicate an HTML title");
    const click = attributes.find(attribute => attribute.name?.text === "onClick").initializer.expression;
    expression(click.getText(app), {runAction})();
    assert.equal((await f.pending[0]).status, "completed"); assert.equal(f.legacy.length, 0);
    assert.equal(f.calls.length, 1); assert.equal(f.calls[0].surfaceId, "owning-plex");
    assert.equal(f.calls[0].request.source, "toolbar"); assert.deepEqual(f.calls[0].target, {kind: "none"});
    assert.deepEqual(f.calls[0].sidecarFold, {state: "resolved", target: {id: "pair", windowId: "main"}});
  } finally { f.release(); f.manager.dispose(); }
});

test("actual local menu retains the host fold action and its exact surface without a selected node or center", async () => {
  const f = fixture();
  try {
    const menu = {surfaceId: "owning-plex", manager: f.manager,
      readCapturedTargets: /** Folding does not need a graph or selected node. */ () => ({center: null, selected: null}),
      request: menuMethod("request"),
    };
    const items = menuMethod("getItems", {ACTION_CATALOG}).call(menu);
    assert.deepEqual(items.map(item => item.id), [foldId]);
    const request = menu.request(items[0]); assert.equal(request.surfaceId, "owning-plex"); assert.equal(request.source, "local-menu");
    assert.equal((await f.manager.dispatch(request)).status, "completed");
    assert.equal(f.legacy.length, 0); assert.equal(f.calls.length, 1); assert.equal(f.calls[0].surfaceId, "owning-plex");
    assert.deepEqual(f.calls[0].sidecarFold, {state: "resolved", target: {id: "pair", windowId: "main"}});
    assert.equal(f.manager.check({id: "view.sidecar.toggle", source: "toolbar", surfaceId: "owning-plex"}).state, "disabled", "other action eligibility is not broadened");
  } finally { f.release(); f.manager.dispose(); }
});

test("fullscreen delegates synchronous group restoration before moving content and retains existing availability", async () => {
  const property = implementation("view.fullscreen.toggle"), sequence = [], hostLeaf = {};
  const modes = {fullscreenAvailable: true, zen: true, fullscreen: false,
    /** Model only the real controller boundary whose call order this App regression protects. */
    toggleFullscreen() { sequence.push("fullscreen"); this.fullscreen = !this.fullscreen; },
  };
  const plugin = {restorePlexFoldBeforeReveal: /** Revealing never redirects focus or changes the center at this boundary. */ leaf => { assert.equal(leaf, hostLeaf); sequence.push("restore"); }};
  const action = expression(property.initializer.getText(app), {uiAction: surfaceAction, plugin, hostLeaf, displayModes: modes});
  assert.equal(action.availability({}).state, "enabled"); await action.execute({});
  assert.deepEqual(sequence, ["restore", "fullscreen"]); assert.equal(modes.zen, true); assert.equal(modes.fullscreen, true);
  await action.execute({}); assert.deepEqual(sequence, ["restore", "fullscreen", "restore", "fullscreen"]); assert.equal(modes.fullscreen, false);
  modes.fullscreenAvailable = false; assert.equal(action.availability({}).state, "disabled");
  plugin.restorePlexFoldBeforeReveal = /** A failed safe reveal must not move content into fullscreen afterward. */ () => { throw Error("retired native owner"); };
  await assert.rejects(action.execute({}), /retired native owner/); assert.equal(sequence.length, 4);
});
