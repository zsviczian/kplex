/** Behavior of the production wheel, public companion boundary and native file-menu dispatch. */
import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import ts from "typescript";

function moduleAt(path, dependencies = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  const result = {exports: {}};
  Function("module", "exports", "require", output)(result, result.exports, name => dependencies[name] ?? {});
  return result.exports;
}
function method(path, name, dependencies = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let text;
  function visit(node) {
    if (ts.isMethodDeclaration(node) && node.name.getText(tree) === name) text = node.getText(tree);
    ts.forEachChild(node, visit);
  }
  visit(tree); assert(text, name);
  const output = ts.transpileModule(`class Subject {${text}}`, {compilerOptions: {target: ts.ScriptTarget.ES2022}}).outputText;
  return Function(...Object.keys(dependencies), `${output}; return Subject.prototype.${name};`)(...Object.values(dependencies));
}
const {wheelCamera} = moduleAt("src/ui/components/wheelCamera.ts");
test("trackpad scroll pans in both axes at a fixed zoom; wheel mode and modifier/pinch preserve anchored zoom", () => {
  const camera = {x: 10, y: 20, scale: 1.5}, point = {x: 200, y: 150};
  const scroll = {deltaX: 8, deltaY: 12, deltaMode: 0, ctrlKey: false, metaKey: false};
  assert.deepEqual(wheelCamera(camera, scroll, point, true, 3, 600), {x: 2, y: 8, scale: 1.5});
  for (const mode of [false, true]) for (const modifier of ["ctrlKey", "metaKey"]) {
    const next = wheelCamera(camera, {...scroll, [modifier]: true}, point, mode, 3, 600);
    assert(next.scale < camera.scale);
    assert(Math.abs((point.x-next.x)/next.scale - (point.x-camera.x)/camera.scale) < 1e-10);
    assert(Math.abs((point.y-next.y)/next.scale - (point.y-camera.y)/camera.scale) < 1e-10);
  }
  assert(wheelCamera(camera, scroll, point, false, 3, 600).scale < camera.scale);
  assert.equal(wheelCamera(camera, {...scroll, deltaY: -1e6}, point, false, 3, 600).scale, 3);
  assert.equal(wheelCamera(camera, {...scroll, deltaY: 1e6}, point, false, 3, 600).scale, 0.3);
  assert.equal(wheelCamera(camera, {...scroll, deltaMode: 1}, point, true, 3, 600).y, 20-12*16);
  assert.equal(wheelCamera(camera, {...scroll, deltaMode: 2}, point, true, 3, 600).y, 20-12*600);
});

test("template selectors require EA 2.29.1 and preserve blank, valid and removed choices", () => {
  const previous = globalThis.window;
  const bridge = {verifyMinimumPluginVersion: version => {assert.equal(version, "2.29.1"); return true;},
    templateFilePath: "Templates", getAPI() {}, getDrawingFilePath() {}, getListOfTemplateFiles: () => [{path: "Templates/A.md"}, {path: "Templates/B.md"}]};
  globalThis.window = {ExcalidrawAutomate: bridge};
  try {
    const {drawingTemplateOptions} = moduleAt("src/adapters/obsidian/drawingTemplates.ts");
    assert.equal(drawingTemplateOptions(null).selected, "Templates/A.md");
    assert.equal(drawingTemplateOptions("").selected, "");
    assert.equal(drawingTemplateOptions("Templates/B.md").selected, "Templates/B.md");
    assert.equal(drawingTemplateOptions("Removed.md").selected, "Templates/A.md");
    bridge.verifyMinimumPluginVersion = () => false;
    assert.equal(drawingTemplateOptions(null), null);
    delete globalThis.window.ExcalidrawAutomate;
    assert.equal(drawingTemplateOptions(null), null);
  } finally {globalThis.window = previous;}
});

test("creation uses a disposable EA, exact format/root and the chosen template, then remembers a successful choice", async () => {
  const template = {path: "Templates/T.md"}, file = {path: "New.excalidraw"}, calls = [], disposed = [];
  const create = method("src/main.ts", "createNewFileInFolder", {
    normalizePath: path => path, MANAGED_CREATED_PATH_TTL_MS: 1000,
    drawingAutomation: () => ({getDrawingFilePath: (name, folder) => {assert.equal(folder, ""); return name+".excalidraw";},
      getAPI: () => ({create: async args => {calls.push(args); args.validateBeforeCreate(); return file.path;}, destroy: () => disposed.push(true)})}),
  });
  const owner = {app: {vault: {getFileByPath: path => path === template.path ? template : file}}, translator: key => key, managedCreatedPaths: new Map(),
    settings: {lastDrawingTemplatePath: null, sentinel: {preserved: true}}, ensureFolderPath: async () => {},
    rememberManagedCreatedFile: value => value, saveSettings: async () => calls.push("save")};
  assert.equal(await create.call(owner, "New", "excalidraw", "", undefined, "Templates/T.md"), file);
  assert.equal(calls[0].exactPath, "New.excalidraw"); assert.equal(calls[0].templatePath, "Templates/T.md");
  assert.equal(owner.settings.lastDrawingTemplatePath, "Templates/T.md"); assert.deepEqual(owner.settings.sentinel, {preserved: true});
  assert.equal(disposed.length, 1);
});

test("native file-menu actions capture the clicked file and offer only supported device surfaces", () => {
  class File {}
  let listener, device = "desktop";
  const actions = [], opened = [];
  const {registerFileMenus} = moduleAt("src/adapters/obsidian/fileMenu.ts", {
    obsidian: {TFile: File}, "./presentationEnvironment": {readObsidianPresentationEnvironment: () => ({device})},
    "./nativeSubmenu": {addNativeSubmenu: (_menu, _title, _icon, populate) => populate({addItem: configure => {
      const item = {setTitle(value) {this.title = value; return this;}, setIcon() {return this;}, onClick(callback) {actions.push({title: this.title, callback}); return this;}};
      configure(item);
    }})},
  });
  const plugin = {translator: key => key, registerEvent: () => {}, app: {workspace: {on: (event, callback) => {assert.equal(event, "file-menu"); listener = callback;}}}, openFileInKplex: (...args) => opened.push(args)};
  registerFileMenus(plugin); const file = new File();
  listener({}, file); assert.equal(actions.length, 5); actions[1].callback(); assert.deepEqual(opened, [[file, "tab"]]);
  actions.length = 0; device = "tablet"; listener({}, file); assert.equal(actions.length, 4);
  actions.length = 0; device = "phone"; listener({}, file); assert.deepEqual(actions.map(action => action.title), ["fileMenu.sidepanel"]);
  actions.length = 0; listener({}, {}); assert.equal(actions.length, 0);
});

test("explicit new-tab/right/window actions allocate the requested native surface and focus the captured file", async () => {
  const open = method("src/main.ts", "openFileInKplex", {KplexView: class {}, KplexSidepanelView: class {}, readObsidianPresentationEnvironment: () => ({device: "desktop"}), KPLEX_VIEW_TYPE: "plex", KPLEX_SIDEPANEL_VIEW_TYPE: "sidebar"});
  for (const [target, type] of [["tab", "tab"], ["split", "split"], ["window", "window"]]) {
    const file = {path: "A.md"}, calls = [], leaf = {setViewState: async state => calls.push(state)};
    const owner = {app: {vault: {getFileByPath: () => file}, workspace: {getMostRecentLeaf: () => null, getLeaf: value => {assert.equal(value, type); return leaf;}}},
      rememberDocumentLeaf() {}, focusInKplex: async (...args) => calls.push(args)};
    await open.call(owner, file, target); assert.deepEqual(calls.at(-1), [file.path, leaf]);
    assert.equal(calls[0].type, "plex");
  }
});


test("a warm new Plex waits for its mounted navigation consumer before focusing the file", async () => {
  let ready;
  const pending = new Promise(resolve => {ready = resolve;});
  class View {waitUntilReady() {return pending;}}
  const open = method("src/main.ts", "openFileInKplex", {KplexView: View, KplexSidepanelView: class {},
    readObsidianPresentationEnvironment: () => ({device: "desktop"}), KPLEX_VIEW_TYPE: "plex", KPLEX_SIDEPANEL_VIEW_TYPE: "sidebar"});
  const file = {path: "Chosen.md"}, focused = [], leaf = {view: new View(), setViewState: async () => {}};
  const owner = {app: {vault: {getFileByPath: () => file}, workspace: {getMostRecentLeaf: () => null, getLeaf: () => leaf}},
    rememberDocumentLeaf() {}, focusInKplex: async (...args) => focused.push(args)};
  const work = open.call(owner, file, "split");
  await new Promise(resolve => setImmediate(resolve)); assert.equal(focused.length, 0);
  ready(); await work; assert.deepEqual(focused, [[file.path, leaf]]);
});

test("template dropdown retains complete paths for duplicate names and exposes an explicit blank choice", () => {
  const changes = [];
  const {DrawingTemplateSelect} = moduleAt("src/ui/features/DrawingTemplateSelect.tsx", {
    react: {createElement: (type, props, ...children) => ({type, props, children})},
  });
  const tree = DrawingTemplateSelect({choices: {root: "Templates", selected: "Templates/B/Same.md", files: [{path: "Templates/A/Same.md"}, {path: "Templates/B/Same.md"}]},
    value: "Templates/B/Same.md", disabled: false, translate: key => key, onChange: value => changes.push(value)});
  const select = tree.children[1];
  assert.equal(select.props.value, "Templates/B/Same.md");
  assert.deepEqual(select.children.map(option => option.props.value), ["", "Templates/A/Same.md", "Templates/B/Same.md"]);
  assert.deepEqual(select.children.slice(1).map(option => option.children[0]), ["A/Same.md", "B/Same.md"]);
  select.props.onChange({target: {value: ""}}); assert.deepEqual(changes, [""]);
});

test("a rejected drawing write destroys its private workbench and retains the last successful template", async () => {
  let destroyed = 0;
  const create = method("src/main.ts", "createNewFileInFolder", {
    normalizePath: path => path, MANAGED_CREATED_PATH_TTL_MS: 1000,
    drawingAutomation: () => ({getDrawingFilePath: () => "New.md", getAPI: () => ({create: async () => {throw Error("write rejected");}, destroy: () => destroyed++})}),
  });
  const owner = {settings: {lastDrawingTemplatePath: "Existing.md"}, managedCreatedPaths: new Map(), ensureFolderPath: async () => {}, app: {vault: {getFileByPath: () => ({})}}};
  await assert.rejects(create.call(owner, "New", "excalidraw", "", undefined, "NewTemplate.md"), /write rejected/);
  assert.equal(owner.settings.lastDrawingTemplatePath, "Existing.md"); assert.equal(destroyed, 1); assert.equal(owner.managedCreatedPaths.size, 0);
});
