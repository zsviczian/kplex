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

test("explicit new-tab/tab-group/window actions allocate the requested native surface and focus the captured file", async () => {
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

const creationDestinations=moduleAt('src/core/plex/createdNoteDestination.ts');
/** Destination preferences survive unavailable contexts without being rewritten by rendering. */
test('new-file destinations migrate the old toggle and filter only unsupported native targets',()=>{
 const {CREATION_AFTER_SAVING_ACTIONS,sanitizeCreationAfterSaving,creationAfterSavingActions,effectiveCreatedNoteDestination}=creationDestinations;
 assert.deepEqual(creationAfterSavingActions({desktop:true,sidepanel:false,another:true,editable:true}),CREATION_AFTER_SAVING_ACTIONS);
 assert.deepEqual(creationAfterSavingActions({desktop:false,sidepanel:true,another:false,editable:true}),['return','follow','editor','editor-maximized','tab']);
 assert.equal(sanitizeCreationAfterSaving(undefined,true),'sidecar');assert.equal(sanitizeCreationAfterSaving(undefined,false),'return');
 assert.equal(sanitizeCreationAfterSaving('editor-maximized',true),'editor-maximized');
 assert.equal(sanitizeCreationAfterSaving('run-script'),'return');
 assert.equal(effectiveCreatedNoteDestination('sidecar',{desktop:true,sidepanel:true}),'tab');
 assert.equal(effectiveCreatedNoteDestination('window',{desktop:false,sidepanel:false}),'tab');
});

/** Rendering a fallback must never replace the remembered preference or trigger settings work. */
test('creation opening control persists a user selection once and never persists context fallbacks',()=>{
 const control=method('src/main.ts','createdNoteCompletionControl',creationDestinations),saved=[];
 const p={settings:{newNodeAfterSaving:'sidecar',editNewNodeAfterCreate:true,future:{kept:true}},createdNoteContext:()=>({sidepanel:true,desktop:false}),saveSettings:async(...args)=>saved.push(args)};
 const rendered=control.call(p);assert.equal(rendered.value,'tab');assert.equal(p.settings.newNodeAfterSaving,'sidecar');assert.equal(saved.length,0);
 rendered.onChange('sidecar');assert.equal(saved.length,0,'Unsupported choices cannot enter the writer');
 rendered.onChange('editor-maximized');rendered.onChange('editor-maximized');
 assert.equal(saved.length,1);assert.deepEqual(saved[0],[false,false]);assert.deepEqual(p.settings.future,{kept:true});
});

/** Native group placement uses the captured Plex parent, independent of the most recent unrelated tab. */
test('new-file tabs use the Plex group or the most recent main group from the sidepanel',async()=>{
 const open=method('src/main.ts','openCreatedNoteInTab',{KPLEX_SIDEPANEL_VIEW_TYPE:'sidepanel'});
 const file={},plexParent={},mainParent={},otherParent={},root={},calls=[];
 const plex={parent:plexParent,view:{getViewType:()=> 'plex'}},main={parent:mainParent},sidepanel={parent:otherParent,view:{getViewType:()=> 'sidepanel'}};
 const leaf={openFile:async(...args)=>calls.push(['open',...args])};
 const p={app:{workspace:{rootSplit:root,getMostRecentLeaf:given=>{assert.equal(given,root);return main},iterateAllLeaves:run=>[plex,{parent:plexParent},main,{parent:otherParent}].forEach(run),createLeafInParent:(parent,index)=>{calls.push(['create',parent,index]);return leaf},revealLeaf:async given=>{assert.equal(given,leaf)}}}};
 await open.call(p,file,plex);assert.deepEqual(calls[0],['create',plexParent,2]);assert.equal(p.lastDocumentLeaf,leaf);
 calls.length=0;await open.call(p,file,sidepanel);assert.deepEqual(calls[0],['create',mainParent,1]);
 assert.deepEqual(calls[1],['open',file,{active:true}]);
});

/** Narrow native doubles keep execution/identity observable without starting Obsidian or an index. */
function createdOpeningFixture(){
 const file={path:'New.md'},page={path:file.path,file},document={},host={view:{containerEl:{ownerDocument:document}}},session={centerPath:'Origin.md'},calls=[];
 const p={settings:{},unloading:false,host,session,calls,file,page,liveFile:file,
  app:{vault:{getFileByPath:()=>p.liveFile}},documentSession:leaf=>leaf===host?session:null,
  createdNoteContext:()=>({desktop:true,sidepanel:false}),index:{get:()=>page,insertCreatedFile:()=>assert.fail('Unexpected admission')},
  openCreatedNoteInTab:async(...args)=>calls.push(['tab',...args]),openFileInPopout:async(...args)=>calls.push(['window',...args]),
  openSidecar:async(...args)=>calls.push(['sidecar',...args]),focusAssociatedEditor:leaf=>calls.push(['focus',leaf]),
  notifyNavigation:(path,leaf,reroot)=>{assert.equal(leaf,host);session.centerPath=path;calls.push(['navigate',path,reroot])},
  actionSurfaceHosts:new Map([['unrelated',{leaf:{}}],['own',{leaf:host}]]),
  actionManager:{readSnapshot:()=>({centerOccurrence:{node:{identity:file.path,path:file.path,kind:'file'},occurrenceId:'new-center'}}),prepare:request=>{calls.push(['prepare',request]);return calls.filter(x=>x[0]==='prepare').length===1?{state:'rejected'}:{state:'accepted',run:async()=>calls.push(['run'])}}},
  waitForCreatedEditor:async()=>calls.push(['wait'])};return p;
}
const openCreated=method('src/main.ts','openCreatedNote',{...creationDestinations,actionNodeRef:page=>({identity:page.path,path:page.path,kind:'file'}),Notice:class{constructor(){assert.fail('Unexpected opening timeout')}}});
for(const destination of ['none','sidecar','tab','window','editor','editor-maximized'])test('created file routes exactly once to '+destination,async()=>{
 const p=createdOpeningFixture();await openCreated.call(p,p.page,p.host,destination);
 if(destination==='none')assert.deepEqual(p.calls,[]);
 else if(destination==='editor'||destination==='editor-maximized'){
  assert.deepEqual(p.calls.map(x=>x[0]),['navigate','prepare','wait','prepare','run']);
  for(const [,request]of p.calls.filter(x=>x[0]==='prepare')){assert.equal(request.surfaceId,'own');assert.equal(request.target.occurrenceId,'new-center');assert.equal(request.args.maximize,destination==='editor-maximized');}
  assert.equal(p.calls[0][2],true,'An editor destination explicitly admits the created note as a root');
 }else assert.deepEqual(p.calls.map(x=>x[0]),destination==='sidecar'?['sidecar','focus']:[destination]);
});
for(const change of ['file-replaced','view-replaced','window-migrated','navigated-away','dismissed','unloaded'])test('pending creation editor refuses '+change,async()=>{
 const p=createdOpeningFixture();let valid=true;
 p.waitForCreatedEditor=async()=>{p.calls.push(['wait']);
  if(change==='file-replaced')p.liveFile={...p.file};if(change==='view-replaced')p.host.view={containerEl:{ownerDocument:{}}};
  if(change==='window-migrated')p.host.view.containerEl.ownerDocument={};if(change==='navigated-away')p.session.centerPath='Other.md';
  if(change==='dismissed')valid=false;if(change==='unloaded')p.unloading=true;};
 await openCreated.call(p,p.page,p.host,'editor',()=>valid);
 assert(!p.calls.some(x=>x[0]==='run'),'A later owner cannot inherit editor opening');
 assert.equal(p.calls.filter(x=>x[0]==='prepare').length,1);
});

/** A materialization dialog does not navigate or attempt to create the same placeholder twice. */
test('placeholder completion omits Create another and Follow node without replacing a remembered Follow preference',()=>{
 const control=method('src/main.ts','createdNoteCompletionControl',creationDestinations),writes=[];
 const p={settings:{newNodeAfterSaving:'follow'},createdNoteContext:()=>({desktop:true,sidepanel:false}),saveSettings:async()=>writes.push(true)};
 const value=control.call(p,undefined,{another:false,follow:false});
 assert.deepEqual(value.choices,['return','sidecar','editor','editor-maximized','tab','window']);assert.equal(value.value,'return');
 assert.equal(p.settings.newNodeAfterSaving,'follow');assert.equal(writes.length,0);
 value.onChange('follow');value.onChange('another');assert.equal(writes.length,0);
 value.onChange('return');assert.equal(p.settings.newNodeAfterSaving,'return');assert.equal(writes.length,1);
});

/** The editor route must wait for the displayed file, rather than editing a stale center/selection. */
test('new-file editor waits for an exact displayed center occurrence before preparing an action', async () => {
  const p = createdOpeningFixture();
  let reads = 0;
  p.actionManager.readSnapshot = () => ({centerOccurrence: ++reads === 1
    ? {node: {identity: 'Old.md', path: 'Old.md'}, occurrenceId: 'old'}
    : {node: {identity: p.file.path, path: p.file.path}, occurrenceId: 'new'}});
  await openCreated.call(p, p.page, p.host, 'editor');
  assert.equal(p.calls[1][0], 'wait');
  assert(p.calls.filter(row => row[0] === 'prepare').every(([, request]) => request.target.occurrenceId === 'new'));
  assert.equal(p.calls.filter(row => row[0] === 'run').length, 1);
});

/** Compile the real graph snapshot port; no DOM query or inferred node ID grants editor authority. */
function displayedCenterReader(dependencies) {
  const path = 'src/ui/PlexGraph.tsx';
  const source = ts.createSourceFile(path, readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let initializer;
  /** Locate only the production port property. */
  function visit(node) {
    if (ts.isPropertyAssignment(node) && node.name.getText(source) === 'readCenterOccurrence') initializer = node.initializer.getText(source);
    ts.forEachChild(node, visit);
  }
  visit(source); assert(initializer);
  const output = ts.transpileModule(`const read = ${initializer};`, {compilerOptions: {target: ts.ScriptTarget.ES2022}}).outputText;
  return Function(...Object.keys(dependencies), `${output}; return read;`)(...Object.values(dependencies));
}

test('new-file displayed-center port refuses pending, repeated and unrelated occurrences', () => {
  const page = {path: 'New.md'}, node = {page}, deps = {pathChangedThisRender: false, viewFailed: false, sceneTransitioning: false,
    scene: {nodes: [node]}, activePath: page.path, classic: {}, sceneNodeKeys: new Map([[node, 'center-exact']]),
    occurrenceKey: () => 'portable-exact', actionNodeRef: value => ({identity: value.path, path: value.path})};
  assert.equal(displayedCenterReader(deps)().occurrenceId, 'center-exact');
  assert.equal(displayedCenterReader({...deps, classic: null})().occurrenceId, 'portable-exact');
  for (const key of ['pathChangedThisRender', 'viewFailed', 'sceneTransitioning']) assert.equal(displayedCenterReader({...deps, [key]: true})(), null);
  assert.equal(displayedCenterReader({...deps, activePath: 'Old.md'})(), null);
  assert.equal(displayedCenterReader({...deps, scene: {nodes: [node, node]}})(), null);
});

/** A selected native file can precede lazy graph publication; explicit navigation must still win. */
test('file-menu focus uses native availability without awaiting whole-index readiness and reroots the exact surface', async () => {
  const focus = method('src/main.ts', 'focusInKplex');
  const file = {path: 'Selected.md'}, page = {path: file.path, file}, session = {}, host = {}, calls = [];
  const p = {app: {vault: {getFileByPath: path => path === file.path ? file : null}, workspace: {revealLeaf: async leaf => calls.push(['reveal', leaf])}},
    index: {get: () => undefined, getVaultSearchPage: path => path === file.path ? page : undefined},
    documentSession: leaf => leaf === host ? session : null,
    ensureIndexReady: async () => calls.push(['global-readiness']), notifyNavigation: (...args) => calls.push(['navigate', ...args])};
  await focus.call(p, file.path, host);
  assert.deepEqual(calls, [['reveal', host], ['navigate', file.path, host, true]]);
});

/** A chosen file may be replaced while its leaf is being revealed; never navigate its replacement. */
test('file-menu focus rejects native replacement during reveal', async () => {
  const focus = method('src/main.ts', 'focusInKplex');
  const file = {path: 'Selected.md'}, host = {}, session = {}; let current = file, navigated = false;
  const p = {app: {vault: {getFileByPath: () => current}, workspace: {revealLeaf: async () => {current = {...file};}}},
    index: {get: () => ({path: file.path, file}), getVaultSearchPage: () => ({path: file.path, file})},
    documentSession: () => session, ensureIndexReady: async () => {}, notifyNavigation: () => {navigated = true;}};
  await focus.call(p, file.path, host); assert.equal(navigated, false);
});


/** The actual native menu method emits file-menu only for resolved links. */
function missingLinkMenuFixture() {
  class File {constructor(path) {this.path = path;}}
  const source = new File('Source.md'), clicked = new File('Clicked.md'), files = new Map([[source.path, source], [clicked.path, clicked]]);
  const opened = [], disposers = [], calls = [], handlers = new Map();
  const workspace = {on: (name, handler) => {handlers.set(name, handler); return handler;},
    handleLinkContextMenu(menu, path, sourcePath, leaf) {assert.equal(this, workspace); calls.push([path, sourcePath, leaf]); if (files.has(path)) handlers.get('file-menu')(menu, files.get(path)); return true;}};
  const original = workspace.handleLinkContextMenu;
  const {registerFileMenus} = moduleAt('src/adapters/obsidian/fileMenu.ts', {obsidian: {TFile: File, normalizePath: value => value, parseLinktext: value => ({path: value.split('#')[0]})},
    './presentationEnvironment': {readObsidianPresentationEnvironment: () => ({device: 'desktop'})},
    './nativeSubmenu': {addNativeSubmenu: (menu, _title, _icon, populate) => {menu.groups++; populate(menu);}}});
  const plugin = {app: {workspace, vault: {getFileByPath: path => files.get(path) ?? null}, metadataCache: {getFirstLinkpathDest: path => files.get(path) ?? null}},
    translator: key => key, registerEvent() {}, register: dispose => disposers.push(dispose), openFileInKplex: async (...args) => opened.push(args)};
  registerFileMenus(plugin);
  /** Collect the same leaf callbacks exposed to the native submenu. */
  const menu = () => ({groups: 0, actions: [], addItem(configure) {const item = {setTitle(value) {this.title = value; return this;}, setIcon() {return this;}, onClick(run) {this.run = run; return this;}}; configure(item); this.actions.push(item); return this;}});
  return {source, clicked, workspace, original, files, opened, disposers, calls, handlers, menu};
}

test('unresolved link menus capture the native link instead of the workspace file and never create it', async () => {
  const f = missingLinkMenuFixture(), menu = f.menu();
  assert.equal(f.workspace.handleLinkContextMenu(menu, 'Folder/Missing#Heading', f.source.path), true);
  assert.equal(menu.groups, 1); assert.equal(menu.actions.length, 5);
  await menu.actions.find(item => item.title === 'fileMenu.tab').run();
  assert.equal(f.opened[0][0].path, 'Folder/Missing'); assert.equal(f.opened[0][0].source, f.source); assert.equal(f.opened[0][1], 'tab');
  assert.equal(f.files.has('Folder/Missing'), false);
});

test('resolved link hook does not duplicate file-menu and a placeholder materialized before clicking uses its native file', async () => {
  const f = missingLinkMenuFixture(), resolved = f.menu(); f.workspace.handleLinkContextMenu(resolved, f.clicked.path, f.source.path);
  assert.equal(resolved.groups, 1); await resolved.actions[0].run(); assert.equal(f.opened[0][0], f.clicked);
  const missing = f.menu(); f.workspace.handleLinkContextMenu(missing, 'Later', f.source.path); f.files.set('Later', f.clicked);
  await missing.actions[0].run(); assert.equal(f.opened[1][0], f.clicked);
});

test('unresolved link menu rejects retired sources, empty anchors and external schemes', async () => {
  const f = missingLinkMenuFixture(), menu = f.menu(); f.workspace.handleLinkContextMenu(menu, 'Missing', f.source.path);
  f.files.set(f.source.path, {path: f.source.path}); await menu.actions[0].run(); assert.equal(f.opened.length, 0);
  for (const value of ['#Heading', 'https://example.com', 'obsidian://open']) {
    const rejected = f.menu(); f.workspace.handleLinkContextMenu(rejected, value, f.source.path); assert.equal(rejected.groups, 0);
  }
});

test('unresolved native hook cleanup restores its own method and leaves later wrappers as inert passthroughs', () => {
  const f = missingLinkMenuFixture(); f.disposers[0](); assert.equal(f.workspace.handleLinkContextMenu, f.original);
  const g = missingLinkMenuFixture(), retained = g.workspace.handleLinkContextMenu;
  const later = (...args) => retained.apply(g.workspace, args); g.workspace.handleLinkContextMenu = later;
  g.disposers[0](); assert.equal(g.workspace.handleLinkContextMenu, later);
  const menu = g.menu(); later(menu, 'Missing', g.source.path); assert.equal(menu.groups, 0); assert.equal(g.calls.length, 1);
});


/** Native menu selection supplies availability even before the search catalog itself is hydrated. */
test('file-menu availability facade admits only an explicitly supplied current native file and publishes nothing', () => {
  const read = method('src/index/GraphIndex.ts', 'getVaultSearchPage');
  const file = {path: 'Selected.md'}, page = {path: file.path, file}; let current = file, facades = 0;
  const index = {get: () => undefined, currentPhysicalSearchPage: () => undefined, app: {vault: {getFileByPath: () => current}},
    hostFileSearchPage: value => {assert.equal(value, file); facades++; return page;}};
  assert.equal(read.call(index, file.path), undefined, 'Ordinary search retains catalog-only behavior');
  assert.equal(read.call(index, file.path, file), page); assert.equal(facades, 1);
  current = {...file}; assert.equal(read.call(index, file.path, file), undefined); assert.equal(facades, 1);
  assert.equal(read.call(index, 'Other.md', file), undefined); assert.equal(facades, 1);
});
