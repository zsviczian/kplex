/** Host workflow persistence, menu/surface lifetimes and delayed physical identity use actual production callbacks. */
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const temporary = mkdtempSync(join(tmpdir(), 'kplex-action-host-'));
process.on('exit', () => rmSync(temporary, { recursive: true, force: true }));
await build({ stdin: { contents: 'export * from "./src/core/plex/actionPreferences"; export * from "./src/adapters/obsidian/actionNode"; export * from "./src/application/ActionManager"; export * from "./src/adapters/obsidian/relationshipMetadataWrite"; export * from "./src/core/parser/metadata"; export * from "./src/index/ForegroundWorkScheduler"; export * from "./src/adapters/obsidian/settingsNavigation";', resolveDir: fileURLToPath(new URL('..', import.meta.url)) }, outfile: join(temporary, 'contracts.mjs'), bundle: true, platform: 'node', format: 'esm' });
const contracts = await import(pathToFileURL(join(temporary, 'contracts.mjs')));

/** Extract the real callback with its sync/async contract intact, excluding native startup. */
function method(name, dependencies = {}) {
  const source = ts.createSourceFile('src/main.ts', readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true);
  let expression;
  function visit(node) {
    if (ts.isMethodDeclaration(node) && node.name.getText(source) === name) {
      const text = node.getText(source);
      expression = `${node.modifiers?.some(item => item.kind === ts.SyntaxKind.AsyncKeyword) ? 'async ' : ''}function ${name}${text.slice(text.indexOf('('))}`;
    }
    ts.forEachChild(node, visit);
  }
  visit(source); assert(expression, name);
  const code = ts.transpileModule(`const selected = ${expression};`, { compilerOptions: { target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.None } }).outputText;
  return Function(...Object.keys(dependencies), `${code}; return selected;`)(...Object.values(dependencies));
}
const update = method('updateActionPreferences', { ...contracts, readObsidianPresentationEnvironment: () => ({ keyConvention: 'windows' }), window: {} });
const enqueue = method('enqueueSettingsWrite');
const persist = method('persistSettingsSnapshot');

/** An explicit new-tab request never reuses a Plex or applies the generic startup-surface preference. */
test('new Plex tab creates and reveals a new native tab on every invocation without index work', async () => {
  const create = method('createPlexTab', { KPLEX_VIEW_TYPE: 'kplex-view' }), opened = [], remembered = [];
  const context = { rememberDocumentLeaf: leaf => remembered.push(leaf), app: { workspace: {
    getMostRecentLeaf: () => 'recent-document',
    getLeaf: kind => { assert.equal(kind, 'tab'); const leaf = { setViewState: async state => { leaf.state = state; } }; opened.push(leaf); return leaf; },
    revealLeaf: async leaf => { assert.deepEqual(leaf.state, { type: 'kplex-view', active: true }); leaf.revealed = true; },
  } } };
  await create.call(context); await create.call(context);
  assert.equal(opened.length, 2); assert.notEqual(opened[0], opened[1]);
  assert(opened.every(leaf => leaf.revealed)); assert.deepEqual(remembered, ['recent-document', 'recent-document']);
});

/** A newly opened native split must retain its ownership until geometry has settled. */
test('Sidecar open protects its native split through pending layout and releases on failure', async () => {
  const open = method('openSidecar'), host = {}, leaf = {}, page = {};
  let releaseLayout, notified = false, layoutCalls = 0, repairedSize = false;
  const owner = { sidecarMovingHosts: new Set(),
    ensureSidecarLeaf() { assert(this.sidecarMovingHosts.has(host)); return leaf; },
    async openPageInSidecarLeaf(actualLeaf, actualPage) { assert.equal(actualLeaf, leaf); assert.equal(actualPage, page); assert(this.sidecarMovingHosts.has(host)); },
    waitForWorkspaceLayout() { return ++layoutCalls === 1 ? new Promise(resolve => { releaseLayout = resolve; }) : Promise.resolve(); },
    ensureAdjacentFileLeafSize(actualHost, actualLeaf) { assert.equal(actualHost, host); assert.equal(actualLeaf, leaf); assert(this.sidecarMovingHosts.has(host)); repairedSize = true; },
    async saveSettings() { assert(this.sidecarMovingHosts.has(host)); },
    notifySidecar() { notified = true; }
  };
  const pending = open.call(owner, host, page); await Promise.resolve();
  assert(owner.sidecarMovingHosts.has(host)); assert.equal(notified, false);
  releaseLayout(); await pending; assert.equal(notified, true); assert.equal(repairedSize, true); assert.equal(owner.sidecarMovingHosts.has(host), false);
  owner.openPageInSidecarLeaf = async () => { throw Error('native open failed'); };
  await assert.rejects(open.call(owner, host, page), /native open failed/);
  assert.equal(owner.sidecarMovingHosts.has(host), false);
  owner.sidecarMovingHosts.add(host);
  await assert.rejects(open.call(owner, host, page), /native open failed/);
  assert(owner.sidecarMovingHosts.has(host), 'An enclosing move retains its existing guard');
});

/** Actual native candidate selection is spatial, visible-tab scoped and non-owning. */
test('explicit Sidecar candidates respect all edges, ambiguity, visibility and ownership', () => {
  const doc = {}, otherDoc = {}, host = { view: { containerEl: { ownerDocument: doc }, getViewType: () => 'kplex' } };
  const leaf = (group, side = 'right', kind = 'markdown', visible = true) => ({ group, side, visible, kind, view: { containerEl: { ownerDocument: doc } }, getViewState() { return { type: this.kind }; } });
  const group = {}, active = leaf(group), hidden = leaf(group, 'right', 'markdown', false);
  const owner = { settings: { sidecarPosition: 'right' }, sidecarMovingHosts: new Set(), leaves: [active, hidden],
    leafIsAttached: () => true, isSidecarOpen: () => false, leafGroupElement: item => item.group,
    leafIsVisible: item => item.visible, isKplexLeaf: item => item.kind === 'kplex', isManagedSidecarLeaf: item => !!item.managed,
    fileForLeaf: item => item.kind === 'markdown' ? { path: 'Pane.md' } : null, indexedUrlPathForLeaf: () => null,
    adjacentPosition: (hostLeaf, item) => item.view.containerEl.ownerDocument === hostLeaf.view.containerEl.ownerDocument ? item.side : null,
    app: { workspace: { iterateAllLeaves(callback) { owner.leaves.forEach(callback); } } }
  };
  const candidate = method('getAdjacentSidecarCandidate', { KPLEX_VIEW_TYPE: 'kplex', KPLEX_SIDEPANEL_VIEW_TYPE: 'sidepanel', isEmbeddedMarkdownLeaf: item => !!item.embedded });
  for (const side of ['left', 'right', 'above', 'below']) {
    owner.settings.sidecarPosition = side; active.side = hidden.side = side;
    assert.equal(candidate.call(owner, host), active); assert.equal(active.managed, undefined);
  }
  owner.leaves.push(leaf({}, 'below', 'utility')); assert.equal(candidate.call(owner, host), null, 'A second edge group is ambiguous'); owner.leaves.pop();
  active.managed = true; assert.equal(candidate.call(owner, host), null); active.managed = false;
  active.embedded = true; assert.equal(candidate.call(owner, host), null); active.embedded = false;
  active.kind = 'empty'; assert.equal(candidate.call(owner, host), active);
  active.kind = 'utility'; assert.equal(candidate.call(owner, host), null);
  active.kind = 'markdown'; active.view.containerEl.ownerDocument = otherDoc; assert.equal(candidate.call(owner, host), null);
  active.view.containerEl.ownerDocument = doc; owner.sidecarMovingHosts.add(host); assert.equal(candidate.call(owner, host), null); owner.sidecarMovingHosts.clear();
  owner.startupInitializing = true; assert.equal(candidate.call(owner, host), null); owner.startupInitializing = false;
  host.view.getViewType = () => 'sidepanel'; assert.equal(candidate.call(owner, host), null);
});

/** Explicit attachment owns an existing leaf only after acceptance, preserves reverse content and rolls back failures. */
test('Sidecar attachment uses both initial flows, rejects empty reverse flow and releases stale completion', async () => {
  const host = {}, leaf = {}, file = { path: 'Pane.md' }, page = { file: { path: 'Center.md' } };
  const attach = method('attachAdjacentSidecar', { isWebViewerAvailable: () => true });
  const make = () => ({ settings: { sidecarPosition: 'right', documentSyncMode: 'off', sidecarOpen: false, sidecarLastFilePath: '', sidecarLastUrl: '' },
    sidecarMovingHosts: new Set(), sidecarLeaves: new Map(), currentFile: file, openCalls: 0,
    setSidecarOwner(host, leaf) { this.sidecarLeaves.set(host, leaf); }, deleteSidecarOwner(host) { this.sidecarLeaves.delete(host); },
    getAdjacentSidecarCandidate() { return this.sidecarLeaves.has(host) || this.sidecarMovingHosts.has(host) ? null : leaf; },
    fileForLeaf() { return this.currentFile; }, indexedUrlPathForLeaf: () => null, webViewerUrlForLeaf: () => null,
    app: { vault: { getFileByPath: () => page.file } }, leafIsAttached: () => true, adjacentPosition: () => 'right',
    notifySidecar() {}, async saveSettings() {}, async openPageInSidecarLeaf(actual, center) { assert.equal(actual, leaf); assert.equal(center, page); this.openCalls++; this.currentFile = center.file; },
    async releaseSidecar() { this.sidecarLeaves.delete(host); this.linkedDocumentLeaf = null; this.settings.sidecarOpen = false; }
  });
  let owner = make(); owner.currentFile = null;
  assert.equal(await attach.call(owner, host, 'to-plex'), null); assert.equal(owner.sidecarLeaves.size, 0);
  await attach.call(owner, host, 'to-leaf', page); assert.equal(owner.openCalls, 1); assert.equal(owner.sidecarLeaves.get(host), leaf); assert.equal(owner.settings.documentSyncMode, 'pinned');
  owner = make(); assert.deepEqual(await attach.call(owner, host, 'to-plex'), {file, path:file.path}); assert.equal(owner.openCalls, 0, 'Reverse attachment cannot overwrite native content/mode');
  owner = make(); await attach.call(owner, host, 'to-leaf', {path:'folder:/'}); assert.equal(owner.sidecarLeaves.size, 0, 'A non-document center cannot clear the pane');
  owner = make(); owner.openPageInSidecarLeaf = async () => { throw Error('open failed'); };
  await assert.rejects(attach.call(owner, host, 'to-leaf', page), /open failed/); assert.equal(owner.sidecarLeaves.size, 0); assert.equal(owner.settings.documentSyncMode, 'off'); assert.equal(owner.sidecarMovingHosts.size, 0);
  owner = make(); let finish; owner.saveSettings = () => new Promise(resolve => { finish = resolve; });
  const pending = attach.call(owner, host, 'to-plex'); assert.equal(owner.sidecarLeaves.get(host), leaf);
  assert.equal(await attach.call(owner, host, 'to-leaf', page), null, 'A pending attachment cannot be acquired twice');
  owner.adjacentPosition = () => 'left'; finish(); assert.equal(await pending, null); assert.equal(owner.sidecarLeaves.size, 0); assert.equal(owner.sidecarMovingHosts.size, 0);
});

/** A surface release owns only its current leaf/document menu, including a native-hide timer. */
test('surface disposal retires its menu and listeners without closing another owner or successor', () => {
  const document = () => {
    const listeners = new Set(), timers = new Map(); let sequence = 0;
    const doc = { listeners, timers, addEventListener: (_kind, fn) => listeners.add(fn), removeEventListener: (_kind, fn) => listeners.delete(fn) };
    doc.defaultView = { ...doc, setTimeout: callback => { timers.set(++sequence, callback); return sequence; }, clearTimeout: id => timers.delete(id) };
    return doc;
  };
  const main = document(), popout = document(), leaf = { view: { containerEl: { ownerDocument: main } } }, other = { view: { containerEl: { ownerDocument: main } } };
  const host = { actionSurfaceHosts: new Map(), actionDialogs: new Map(), supportEvents: { record() {} }, kplexMenuOutsidePointerDown() {}, kplexMenuEscapeKeyDown() {},
    activeKplexMenu: null, activeKplexMenuDocument: null, activeKplexMenuLeaf: null, justClosedKplexMenu: null, kplexMenuReleaseTimer: null,
    dismissKplexMenu: method('dismissKplexMenu'), trackKplexMenu: method('trackKplexMenu'), registerActionSurfaceHost: method('registerActionSurfaceHost') };
  const menu = () => ({ hidden: 0, onHide(callback) { this.callback = callback; }, hide() { this.hidden++; this.callback?.(); } });
  let release = host.registerActionSurfaceHost('one', 1, leaf), current = menu(); host.trackKplexMenu(current, main, leaf);
  // Obsidian adopts the container before the source React generation is disposed.
  leaf.view.containerEl.ownerDocument = popout; release();
  assert.equal(current.hidden, 1, 'Migrating source menu must close'); assert.equal(main.listeners.size, 0); assert.equal(main.timers.size, 0);
  const stale = host.registerActionSurfaceHost('one', 2, leaf); release = host.registerActionSurfaceHost('one', 3, leaf);
  current = menu(); host.trackKplexMenu(current, popout, leaf); stale();
  assert.equal(current.hidden, 0, 'Stale registration must preserve its successor');
  const releaseOther = host.registerActionSurfaceHost('other', 1, other); releaseOther(); assert.equal(current.hidden, 0, 'Another leaf must preserve the menu');
  release(); assert.equal(current.hidden, 1); assert.equal(popout.listeners.size, 0);
  leaf.view.containerEl.ownerDocument = main; release = host.registerActionSurfaceHost('one', 4, leaf);
  current = menu(); host.trackKplexMenu(current, popout, leaf); release(); assert.equal(current.hidden, 0, 'Same leaf in another document must preserve its menu'); host.dismissKplexMenu();
  release = host.registerActionSurfaceHost('one', 5, leaf); current = menu(); host.trackKplexMenu(current, main, leaf); current.hide();
  assert.equal(main.timers.size, 1, 'Native hide retains cancellation until the next task'); release();
  assert.equal(main.listeners.size, 0); assert.equal(main.timers.size, 0); assert.equal(host.justClosedKplexMenu, null);
});

/** Exercise the actual main command-association callback independently of native plugin initialization. */
function commandContext(dependencies) {
  const source = ts.createSourceFile('src/main.ts', readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true);
  let expression;
  const visit = node => {
    if (ts.isPropertyAssignment(node) && node.name.getText(source) === 'readCommandContext') expression = node.initializer.getText(source);
    ts.forEachChild(node, visit);
  };
  visit(source); assert(expression, 'main must retain its bounded native command context callback');
  const code = ts.transpileModule(`return ${expression};`, { compilerOptions: { target: ts.ScriptTarget.ES2021 } }).outputText;
  return Function(...Object.keys(dependencies), `return function createContext(){${code}};`)(...Object.values(dependencies));
}

test('native sidebar palette commands use its selected occurrence while legacy center and external editor resolution stay distinct', async () => {
  class KplexView {} class KplexSidepanelView {}
  const owner = {}, otherWindow = {}, mainLeaf = { view: Object.assign(new KplexView(), { containerEl: { ownerDocument: { defaultView: owner } } }) }, sidebar = { view: Object.assign(new KplexSidepanelView(), { containerEl: { ownerDocument: { defaultView: owner } } }) };
  let activeView = sidebar.view,recentLeaf=mainLeaf;
  const node = path => ({ identity:path,path,kind:'file' }), center=node('A'), selected=node('C'), calls=[];
  let mainSnapshot={mounted:true,visible:true,windowId:'own',center,selected:null,focusRegion:'external',commandFocusRegion:'external',interactionRevision:1};
  let sidebarSnapshot={...mainSnapshot,selected:{node:selected,occurrenceId:'C@child'},focusRegion:'graph',commandFocusRegion:'graph',interactionRevision:4};
  const plugin={app:{workspace:{getMostRecentLeaf:()=>recentLeaf,getActiveViewOfType:type=>activeView instanceof type?activeView:null}},actionSurfaceHosts:new Map([['main',{leaf:mainLeaf}],['sidebar',{leaf:sidebar}]]),settings:{lastActivePath:'A'},index:{get:()=>center},actionWindowId:value=>value===owner?'own':'other'};
  mainLeaf.view.leaf=mainLeaf;sidebar.view.leaf=sidebar;
  const contextFactory=commandContext({window:{activeWindow:owner},KplexView,KplexSidepanelView,actionNodeRef:page=>page});
  // The native recent-leaf API deliberately excludes left/right splits. The real active
  // sidebar stays active while its prompt takes DOM focus, and the existing ledger preserves graph origin.
  const read=contextFactory.call(plugin);
  const manager=new contracts.ActionManager({readCommandContext:request=>read(request),implementations:Object.fromEntries(['relationship.create-selected.child','relationship.create-center.child'].map(id=>[id,{availability:()=>({state:'enabled'}),execute:context=>{calls.push([id,context.target.node.path]);return {status:'completed'}}}]))});plugin.actionManager=manager;
  manager.registerSurface({id:'main',generation:1,readSnapshot:()=>mainSnapshot});manager.registerSurface({id:'sidebar',generation:1,readSnapshot:()=>sidebarSnapshot});manager.recordInteraction('sidebar');
  assert.equal(read({}).preferredSurfaceId,'sidebar','native active sidebar must outrank recent main Plex');
  activeView=mainLeaf.view;assert.equal(read({}).preferredSurfaceId,'sidebar','actual sidebar graph DOM focus outranks an ancestor native association');activeView=sidebar.view;
  sidebarSnapshot={...sidebarSnapshot,focusRegion:'external'};
  assert.equal(manager.check({id:'relationship.create-selected.child',source:'obsidian-command'}).state,'enabled');
  await manager.dispatch({id:'relationship.create-selected.child',source:'obsidian-command'});await manager.dispatch({id:'relationship.create-center.child',source:'obsidian-command'});
  assert.deepEqual(calls,[['relationship.create-selected.child','C'],['relationship.create-center.child','A']]);
  activeView=null;recentLeaf={view:{getViewType:()=> 'markdown'}};sidebarSnapshot={...sidebarSnapshot,commandFocusRegion:'external'};
  assert.equal(manager.check({id:'relationship.create-selected.child',source:'obsidian-command'}).state,'enabled','external B retains deterministic last-interacted valid selection C');
  await manager.dispatch({id:'relationship.create-selected.child',source:'obsidian-command'});assert.deepEqual(calls.at(-1),['relationship.create-selected.child','C']);
  assert.equal(manager.check({id:'relationship.create-center.child',source:'obsidian-command'}).state,'enabled','legacy background creation still uses shared A');
  sidebarSnapshot={...sidebarSnapshot,selected:null};assert.equal(manager.check({id:'relationship.create-selected.child',source:'obsidian-command'}).state,'disabled','retired selected occurrence never falls back to center A');
  activeView=sidebar.view;sidebar.view.containerEl.ownerDocument.defaultView=otherWindow;
  assert.notEqual(read({}).preferredSurfaceId,'sidebar','a different owning window cannot inherit the active sidebar association');manager.dispose();
});

/** Test failure/retry against real compiler and serialized host queues; semantic access is forbidden. */
function host(saveData) {
  return { settings: { actionPreferences: contracts.migrateActionPreferences(undefined).preferences, lastActivePath: 'A.md' }, unloading: false,
    translator: key => key, actionPreferenceQueue: Promise.resolve(), settingsWriteQueue: Promise.resolve(), actionPreferenceListeners: new Set(),
    enqueueSettingsWrite: enqueue, updateActionPreferences: update, persistSettingsSnapshot: persist, settingsSnapshotForPersistence: method("settingsSnapshotForPersistence"),
    actionPublisher: { sync: () => ({ failures: [] }) }, saveData,
    index: new Proxy({}, { get() { assert.fail('Workflow persistence must not acquire/invalidate semantic data'); } }) };
}
function draft(current) { return structuredClone(current.settings.actionPreferences); }

test('workflow save failure retains committed memory and permits explicit retry', async () => {
  let fail = true, notifications = 0;
  const current = host(async () => { if (fail) throw new Error('disk failed'); });
  current.actionPreferenceListeners.add(() => notifications++);
  const previous = current.settings.actionPreferences, next = draft(current); next.characterShortcutsEnabled = false;
  await assert.rejects(current.updateActionPreferences(next), /disk failed/);
  assert.equal(current.settings.actionPreferences, previous); assert.equal(notifications, 0);
  fail = false; await current.updateActionPreferences(next);
  assert.equal(current.settings.actionPreferences.characterShortcutsEnabled, false); assert.equal(notifications, 1);
});

test('ordinary pending settings save cannot overwrite a later workflow commit', async () => {
  let release; const gate = new Promise(resolve => { release = resolve; }); const writes = [];
  const current = host(async data => { writes.push(structuredClone(data)); if (writes.length === 1) await gate; });
  const first = current.persistSettingsSnapshot();
  const next = draft(current); next.characterShortcutsEnabled = false;
  const second = current.updateActionPreferences(next), third = current.persistSettingsSnapshot();
  await Promise.resolve(); release(); await Promise.all([first, second, third]);
  assert.equal(writes.at(-1).actionPreferences.characterShortcutsEnabled, false);
  assert.equal(current.settings.actionPreferences.characterShortcutsEnabled, false);
});

test('unsupported future schema remains verbatim and cannot be edited', async () => {
  const writes = [], current = host(async value => writes.push(value));
  current.settings.actionPreferencesFuture = { version: 8, opaque: { choices: [1, 2] } };
  await current.persistSettingsSnapshot();
  assert.equal(writes[0].actionPreferences, current.settings.actionPreferencesFuture);
  assert.equal("actionPreferencesFuture" in writes[0], false);
  await assert.rejects(current.updateActionPreferences(draft(current)), /actions.newerPreferences/);
  assert.equal(writes.length, 1);
});

test('explicit overlap with inherited defaults saves both and survives marked reload and unrelated edits', async () => {
  const writes=[],current=host(async data=>writes.push(structuredClone(data)));
  const next=draft(current);delete next.defaultBindingsVersion;next.localBindings['pin.toggle']=[{match:'code',value:'KeyR',modifiers:['alt']}];
  await current.updateActionPreferences(next);
  assert.equal(writes.length,1);assert.equal(current.settings.actionPreferences.defaultBindingsVersion,1);
  assert.equal(current.settings.actionPreferences.localBindings['node.rename'],undefined,'Inherited default is retained rather than disabled');
  const reloaded=contracts.migrateActionPreferences(writes[0]).preferences;
  assert.equal(contracts.compileActionBindings(reloaded,'windows').resolve({key:'r',code:'KeyR',altKey:true,ctrlKey:false,metaKey:false,shiftKey:false},'graph').state,'ambiguous');
  assert.equal(reloaded.localBindings['node.rename'],undefined);
  const unrelated=structuredClone(reloaded);unrelated.crossSectionAtBoundary=!unrelated.crossSectionAtBoundary;await current.updateActionPreferences(unrelated);
  assert.equal(current.settings.actionPreferences.localBindings['node.rename'],undefined);
  assert.deepEqual(current.settings.actionPreferences.localBindings['pin.toggle'],next.localBindings['pin.toggle']);
  const disabled=draft(current);disabled.localBindings['node.rename']=[];await current.updateActionPreferences(disabled);
  assert.equal(contracts.compileActionBindings(current.settings.actionPreferences,'windows').resolve({key:'r',code:'KeyR',altKey:true,ctrlKey:false,metaKey:false,shiftKey:false},'graph').state,'matched');
  const reset=draft(current);delete reset.localBindings['node.rename'];await current.updateActionPreferences(reset);
  const resetReload=contracts.migrateActionPreferences(writes.at(-1)).preferences;
  assert.equal(resetReload.localBindings['node.rename'],undefined,'Reset restores the inherited shortcut without removing its saved counterpart');
  assert.deepEqual(resetReload.localBindings['pin.toggle'],next.localBindings['pin.toggle']);
  assert.equal(contracts.compileActionBindings(resetReload,'windows').resolve({key:'r',code:'KeyR',altKey:true,ctrlKey:false,metaKey:false,shiftKey:false},'graph').state,'ambiguous');
});

test('malformed and future-generation workflow preferences reject before persistence or publication', async () => {
  const writes=[],current=host(async data=>writes.push(data));
  const invalid=draft(current);invalid.localBindings['pin.toggle']=[{match:'code',value:'UnknownCode',modifiers:['alt']}];
  await assert.rejects(current.updateActionPreferences(invalid),/actions.invalidPreferences/);
  const future=draft(current);future.defaultBindingsVersion=2;await assert.rejects(current.updateActionPreferences(future),/actions.invalidPreferences/);
  assert.equal(writes.length,0);
});

test('host file incarnation rejects delayed delete/recreate despite identical path and kind', () => {
  const first = { path: 'A.md', file: { path: 'A.md' } }, captured = contracts.actionNodeRef(first);
  assert.equal(contracts.resolveActionPage({ get: () => first }, captured), first);
  const replacement = { path: first.path, file: { path: first.path } };
  assert.equal(contracts.resolveActionPage({ get: () => replacement }, captured), null);
  first.file = replacement.file;
  assert.equal(contracts.resolveActionPage({ get: () => first }, captured), null, 'Mutable index page cannot substitute native identity');
});

test('exact pair acquisition rejects replacement after its await without reading replacement graph', async () => {
  const origin = { path: 'A.md' }, target = { path: 'B.md' }; let source = origin;
  const current = { translator: key => key, app: { vault: { getFileByPath: path => path === origin.path ? source : target } },
    index: { prepareRelationshipPair: async () => { source = { path: origin.path }; return true; }, get: () => assert.fail('Stale identity must not acquire replacement graph') } };
  await assert.rejects(method('prepareRelationshipMutation').call(current, origin.path, target.path, origin, target), /relation.preparingRelationship/);
});


test('delete confirmation cannot authorize replacement at the same path', async () => {
  const original = { path: 'A.md', extension: 'md' }, target = { path: original.path, file: original };
  let native = original; const notices = [];
  const current = { app: { vault: { getFileByPath: () => native }, fileManager: { trashFile: () => assert.fail('Replacement must not be trashed') } },
    index: { pages:new Map([[target.path,target]]), get: () => target }, translator: key => key, settings: {removeOntologyLinksOnDelete:true}, captureDeleteNodePreview: async () => ({sources:[],hiddenFields:[],hiddenField:"",removeOntologyLinksOnDelete:true}),
    confirmDeleteNode: async () => { native = { path: original.path, extension: 'md' }; target.file = native; return true; } };
  const outcome = await method('deleteNode', { ...contracts, Notice: class { constructor(value) { notices.push(value); } } }).call(current, target);
  assert.equal(outcome.status, 'unavailable'); assert.equal(notices.length, 1);
});

/** Consent captures cleanup policy; a preference flip must never authorize trash or property writes. */
test('changing automatic cleanup while deletion consent is open cancels the captured action', async () => {
  const file = { path: 'A.md', extension: 'md' }, target = { path: file.path, file }, notices = [];
  const current = { settings: { removeOntologyLinksOnDelete: true }, translator: key => key,
    app: { vault: { getFileByPath: () => file }, fileManager: { trashFile: () => assert.fail('Changed consent must not trash') } },
    index: { pages: new Map([[target.path, target]]), get: () => target },
    captureDeleteNodePreview: async () => ({ sources: [], removeOntologyLinksOnDelete: true }),
    confirmDeleteNode: async () => { current.settings.removeOntologyLinksOnDelete = false; return true; } };
  const result = await method('deleteNode', { ...contracts, Notice: class { constructor(message) { notices.push(message); } } }).call(current, target);
  assert.equal(result.status, 'cancelled');
  assert.deepEqual(notices, ['delete.cleanup.settingsChanged']);
});

test('action settings navigate the native declarative page without acquiring a modal session', () => {
  const paths = []; let opens = 0;
  const current = { manifest: { id: 'k-plex' }, translator: key => key,
    app: { setting: { open: () => opens++, openPagePath: (id, path) => { paths.push([id, path]); return {}; } } },
    openSettings: assert.fail, settingsTab: null };
  current.openSettingsPage = method("openSettingsPage", contracts).bind(current);
  const open = method('openActionSettings').bind(current);
  assert.equal(open(), true); assert.equal(open(), true);
  assert.deepEqual(paths, [['k-plex', ['actions.settingsTitle']], ['k-plex', ['actions.settingsTitle']]]);
  assert.equal(opens, 2);
});

/** Void completion is native success; only an explicit refusal may reopen the root through fallback. */
test('native settings path completion returning undefined preserves the selected subpage', () => {
  let paths = 0, roots = 0;
  const current = { manifest: { id: 'k-plex' }, translator: key => key,
    app: { setting: { open() {}, openPagePath: () => { paths++; } } },
    openSettings: () => roots++, settingsTab: null };
  current.openSettingsPage = method('openSettingsPage', contracts).bind(current);
  assert.equal(method('openActionSettings').call(current), true);
  assert.equal(paths, 1); assert.equal(roots, 0);
});

test('unsupported page navigation retains main settings recovery without a detached editor', () => {
  let opens = 0;
  const current = { app: {}, translator:key=>key, manifest:{id:"k-plex"}, openSettings: () => opens++, settingsTab: { openSettingsPage: () => false } };
  current.openSettingsPage = method("openSettingsPage", contracts).bind(current);
  assert.equal(method('openActionSettings').call(current), false); assert.equal(opens, 1);
});


test('support command stays available without a center or a readable graph during partial startup', /** Exercise the actual native command-context callback and portable dispatch with no live center. */ async () => {
  class KplexView {} class KplexSidepanelView {}
  const owner = {}; let executions = 0;
  const plugin = {
    app: { workspace: { getMostRecentLeaf: /** No native graph has finished opening. */ () => null, getActiveViewOfType: /** No current view owns a center. */ () => null } },
    actionSurfaceHosts: new Map(), settings: { lastActivePath: 'unavailable-center' },
    index: { get: /** A diagnostic recovery command must not depend on this unavailable graph reader. */ () => assert.fail('Support attempted a center lookup') },
    actionWindowId: /** Preserve the actual native window association without a node reference. */ () => 'own',
  };
  const create = commandContext({ window: { activeWindow: owner }, KplexView, KplexSidepanelView, actionNodeRef: assert.fail });
  const read = create.call(plugin);
  const manager = new contracts.ActionManager({ readCommandContext: read, implementations: {
    'support.report-bug': { availability: /** Reporting has no semantic readiness prerequisite. */ () => ({ state: 'enabled' }), execute: /** Count actual execution separately from pure availability checking. */ () => { executions++; return { status: 'completed' }; } },
  } });
  plugin.actionManager = manager;
  const request = { id: 'support.report-bug', source: 'obsidian-command' };
  assert.deepEqual(manager.check(request), { state: 'enabled' }); assert.equal(executions, 0);
  assert.equal((await manager.dispatch(request)).status, 'completed'); assert.equal(executions, 1);
  manager.dispose();
});

/** Host doubles retain canonical property grammar and the actual native metadata convergence observer. */
function deleteFixture(values = {Children:['[[B]]','[[C]]'], arbitrary:{nested:['[[B]]','[[C]]']}, hidden:['[[B]]']}) {
  const source={path:'Owner.md',extension:'md',stat:{mtime:1,size:100}}, nativeTarget={path:'Folder/B.md',extension:'md',stat:{mtime:1,size:20}};
  const target={path:nativeTarget.path,name:'B',file:nativeTarget,url:null},files=new Map([[source.path,source],[nativeTarget.path,nativeTarget]]);
  let frontmatter=structuredClone(values), cache={frontmatter}, body='---\n'+Object.keys(values).map(key=>key+': value').join('\n')+'\n---\n[[B]]\nChildren:: [[B]]';
  const events=()=>({refs:new Set(),on(kind,callback){const ref={kind,callback};this.refs.add(ref);return ref;},offref(ref){this.refs.delete(ref);},emit(kind,...args){for(const ref of this.refs)if(ref.kind===kind)ref.callback(...args);}});
  const vault=Object.assign(events(),{getFileByPath:path=>files.get(path)??null,cachedRead:async()=>body});
  const metadata=Object.assign(events(),{unresolvedLinks:{},getFileCache:()=>cache,getFirstLinkpathDest:raw=>raw==='B'||raw==='Folder/B.md'?files.get(nativeTarget.path)??null:raw==='C'?{path:'C.md'}:null});
  const app={vault,metadataCache:metadata,fileManager:{async processFrontMatter(file,update){await f.beforeNative?.();const next=structuredClone(frontmatter);update(next);frontmatter=next;cache={frontmatter};file.stat.mtime++;const lines=body.split('\n'),tail=lines.slice(lines.indexOf('---',1)+1).join('\n');body='---\n'+JSON.stringify(frontmatter)+'\n---\n'+tail;metadata.emit('changed',file,body,cache);}}};
  const patches=[],notices=[];
  const f={source,target,nativeTarget,files,app,patches,notices,get frontmatter(){return frontmatter;},set frontmatter(value){frontmatter=value;cache={frontmatter};},body:()=>body,setBody:text=>{body='---\n'+JSON.stringify(frontmatter)+'\n---\n'+text;source.stat.mtime++;source.stat.size=body.length;},beforeNative:null};
  const dependencies={...contracts,window:{setTimeout,clearTimeout},Notice:class{constructor(message){notices.push(message);}},SOURCE_DECODE_BUDGET_BYTES:8*1024*1024,
    normalizePath:value=>value.replaceAll('\\','/'),isUnknownRecord:value=>value!==null&&typeof value==='object'&&!Array.isArray(value),
    extractLinksFromValue:(host,value,file)=>contracts.extractLinkReferencesFromValue(value).map(ref=>host.metadataCache.getFirstLinkpathDest(ref.rawTarget,file.path)?.path??ref.rawTarget),
    iterateResolvedLinksFromValue:(host,value,file)=>contracts.extractLinkReferencesFromValue(value).map(ref=>host.metadataCache.getFirstLinkpathDest(ref.rawTarget,file.path)?.path??ref.rawTarget)};
  const context={app,settings:{hierarchy:{hidden:['hidden','Hide also']}},unloading:false,relationshipWriteCancels:new Set(),managedMetadataWrites:new Map(),pruneManagedMetadataWrites(){},
    translator:(key,params)=>key+(params?':'+params.path:''),allOntologyFields:()=>['Children'],referencingMarkdownFiles:()=>[source],
    index:{prepareRelationshipPair:async()=>true,isSemanticWriteReady:()=>true,patchMarkdownPaths:async(paths,options)=>{assert(options.isCurrent());patches.push(...paths);return{outcome:'patched',count:paths.length};}},
    markdownBodyReferenceLines:async()=>[3],remainingBodyReferences:()=>[{path:source.path,line:body.split('\n').indexOf('[[B]]'),label:'body',sourceKind:'obsidian-link'},{path:source.path,line:body.split('\n').indexOf('Children:: [[B]]'),label:'inline',sourceKind:'inline-ontology'}]};
  for(const name of ['captureDeleteNodePreview','valueContainsTarget','referenceMatchesTarget','normalizedNoteReferenceMatches','nonTargetReferenceCounts','stripTargetFromScalar','removeTargetFromValue','frontmatterPropertyLineRange','frontmatterDocumentLineRange','appendHiddenReference','deletionHiddenCoordinates','mutateRelationshipMetadata','removePropertyReferencesToNode']) context[name]=method(name,dependencies).bind(context);
  f.context=context;f.dematerialize=()=>{files.delete(nativeTarget.path);target.file=null;};
  f.run=async(preview)=>{const previous=globalThis.window;globalThis.window={setTimeout,clearTimeout};try{f.dematerialize();return await context.removePropertyReferencesToNode(target,preview,()=>files.get(nativeTarget.path)===undefined);}finally{globalThis.window=previous;}};return f;
}

/** Pre-trash canonical resolution captures short links and limits default cleanup to configured fields, including Hidden. */
test('delete preview defaults ontology and Hidden to Remove while arbitrary nested properties remain Keep',async()=>{
  const f=deleteFixture(),preview=await f.context.captureDeleteNodePreview(f.target);
  assert.deepEqual(preview.sources[0].properties.map(p=>[p.field,p.choice]),[['Children','remove'],['arbitrary','keep'],['hidden','remove']]);
  const beforeBody=f.body().split('---')[2],result=await f.run(preview);
  assert.deepEqual(f.frontmatter,{Children:['[[C]]'],arbitrary:{nested:['[[B]]','[[C]]']}});
  assert.equal(result.issues.length,0);assert(result.remaining.some(item=>item.fieldName==='arbitrary'));assert(result.remaining.some(item=>item.sourceKind==='obsidian-link'));
  assert.deepEqual(f.patches,['Owner.md']);assert.equal(f.body().split('---')[2],beforeBody);assert.equal(f.app.vault.refs.size+f.app.metadataCache.refs.size+f.context.relationshipWriteCancels.size,0);
});

/** Explicit choices affect only the named source/property; Hidden always keeps its original arbitrary links. */
for(const choice of ['remove','hide','keep'])test('explicit arbitrary property '+choice+' preserves unrelated references and body',async()=>{
  const f=deleteFixture({arbitrary:['[[B]]','[[B]]','[[C]]'],other:'untouched'}),preview=await f.context.captureDeleteNodePreview(f.target);
  preview.sources[0].properties[0].choice=choice;preview.hiddenField='Hide also';const result=await f.run(preview);
  assert.deepEqual(f.frontmatter.arbitrary,choice==='remove'?['[[C]]']:['[[B]]','[[B]]','[[C]]']);assert.equal(f.frontmatter.other,'untouched');assert.equal(result.issues.length,0);
  if(choice==='hide')assert.deepEqual(f.frontmatter['Hide also'],['[[Folder/B.md]]','[[B]]']);else assert.equal(f.frontmatter['Hide also'],undefined);
  assert.deepEqual(f.patches,choice==='keep'?[]:['Owner.md']);
});

/** Actual host aggregates may drop .md; Hidden must cover those opaque IDs without rewriting their source links. */
test('deletion Hidden covers captured full and short spellings plus observed native keys only',async()=>{
  const f=deleteFixture({arbitrary:'[[Folder/B.md]]',hidden:'[[C]]'}),resolver=f.app.metadataCache.getFirstLinkpathDest;
  f.app.metadataCache.getFirstLinkpathDest=raw=>raw==='B.md'?f.files.get('Folder/B.md')??null:resolver(raw);
  f.setBody('[[B.md]]\nChildren:: [[B.md]]\n[[Other/B]]');
  const preview=await f.context.captureDeleteNodePreview(f.target);
  assert.deepEqual(preview.sources[0].targetSpellings,['Folder/B.md','B.md']);
  preview.sources[0].properties.find(p=>p.field==='arbitrary').choice='hide';
  f.app.metadataCache.unresolvedLinks['Owner.md']={'Folder/B':1,B:2,'Other/B':1,'Unrelated.md':1};
  const original=f.body().split('\n').slice(3).join('\n'),result=await f.run(preview);
  assert.equal(result.issues.length,0);assert.equal(f.frontmatter.arbitrary,'[[Folder/B.md]]');
  assert.deepEqual(f.frontmatter.hidden,['[[C]]','[[Folder/B.md]]','[[B.md]]','[[Folder/B]]','[[B]]']);
  assert.equal(f.body().split('\n').slice(3).join('\n'),original);assert.deepEqual(f.patches,['Owner.md']);
});

/** Extension equivalence does not authorize a basename that never resolved to the original target. */
test('deletion Hidden never derives a short key from a full target basename',async()=>{
  const f=deleteFixture({arbitrary:'[[Folder/B.md]]'});f.setBody('[[Folder/B.md]]');
  const preview=await f.context.captureDeleteNodePreview(f.target);preview.sources[0].properties[0].choice='hide';
  f.app.metadataCache.unresolvedLinks['Owner.md']={'Folder/B':1,B:1,'Other/B':1};
  const result=await f.run(preview);assert.equal(result.issues.length,0);
  assert.deepEqual(f.frontmatter.hidden,['[[Folder/B.md]]','[[Folder/B]]']);
});

/** Duplicate exact declarations remain additive once, while different .md coordinates cannot short-circuit each other. */
test('deletion Hidden deduplicates exact coordinates while retaining both native and lexical endpoints',async()=>{
  const f=deleteFixture({arbitrary:'[[Folder/B.md]]',hidden:['[[Folder/B]]','[[C]]']});f.setBody('[[Folder/B.md]]');
  const preview=await f.context.captureDeleteNodePreview(f.target);for(const property of preview.sources[0].properties)property.choice=property.field==='arbitrary'?'hide':'keep';
  f.app.metadataCache.unresolvedLinks['Owner.md']={'Folder/B':3};
  const result=await f.run(preview);assert.equal(result.issues.length,0);
  assert.deepEqual(f.frontmatter.hidden,['[[Folder/B]]','[[C]]','[[Folder/B.md]]']);
});

/** Native awaited reads cannot adopt a newly edited body or an unrelated file now owning an approved short spelling. */
for(const hazard of ['body-change','short-rebound','oversized-native-map'])test('deletion Hidden refuses '+hazard+' before assigning any approved property',async()=>{
  const f=deleteFixture({Children:'[[B]]',arbitrary:'[[B]]'}),preview=await f.context.captureDeleteNodePreview(f.target);preview.sources[0].properties.find(p=>p.field==='arbitrary').choice='hide';
  f.beforeNative=()=>{
    if(hazard==='body-change')f.setBody('[[B]]\nChanged body');
    if(hazard==='short-rebound'){const resolver=f.app.metadataCache.getFirstLinkpathDest;f.app.metadataCache.getFirstLinkpathDest=raw=>raw==='B'?{path:'Other/B.md'}:resolver(raw);}
    if(hazard==='oversized-native-map')f.app.metadataCache.unresolvedLinks['Owner.md']={['Unrelated'.repeat(300000)]:1,B:1};
  };
  const result=await f.run(preview);assert(result.issues.some(i=>i.startsWith('delete.cleanup.sourceFailed')));assert.equal(f.patches.length,0);
  assert.deepEqual(f.frontmatter,{Children:'[[B]]',arbitrary:'[[B]]'});assert.equal(f.context.relationshipWriteCancels.size+f.app.metadataCache.refs.size+f.app.vault.refs.size,0);
});

/** Fresh native callback approval fences exact payload, source incarnation and absent target after its await. */
for(const hazard of ['payload','source-replacement','source-rename','target-recreation'])test('delete cleanup refuses '+hazard+' during native awaited read',async()=>{
  const f=deleteFixture({Children:['[[B]]'],arbitrary:'[[B]]'}),preview=await f.context.captureDeleteNodePreview(f.target);
  f.beforeNative=()=>{if(hazard==='payload')f.frontmatter={Children:['[[B]]','[[C]]'],arbitrary:'[[B]]'};if(hazard==='source-replacement')f.files.set('Owner.md',{...f.source});if(hazard==='source-rename'){f.files.delete('Owner.md');f.source.path='Renamed.md';f.files.set(f.source.path,f.source);}if(hazard==='target-recreation')f.files.set('Folder/B.md',{...f.nativeTarget});};
  const result=await f.run(preview);assert.equal(f.patches.length,0);assert.equal(result.issues.length,1);assert.deepEqual(f.frontmatter.Children,hazard==='payload'?['[[B]]','[[C]]']:['[[B]]']);
  assert.equal(f.context.relationshipWriteCancels.size+f.app.metadataCache.refs.size+f.app.vault.refs.size,0);
});

/** Unrelated property edits are preserved because approval compares only the selected field payload. */
test('delete selected property consent permits independent field updates and preserves them',async()=>{
  const f=deleteFixture({Children:'[[B]]',other:'old'}),preview=await f.context.captureDeleteNodePreview(f.target);
  f.beforeNative=()=>{f.frontmatter={...f.frontmatter,other:'new'};};await f.run(preview);assert.deepEqual(f.frontmatter,{other:'new'});
});

/** A saved file whose graph replay is cancelled must be reported pending and never optimistically erase evidence. */
test('delete saved source retains pending status when canonical publication is unavailable',async()=>{
  const f=deleteFixture({Children:'[[B]]'}),preview=await f.context.captureDeleteNodePreview(f.target);
  f.context.index.patchMarkdownPaths=async()=>({outcome:'cancelled',count:0,pendingPaths:['Owner.md']});
  const result=await f.run(preview);assert.deepEqual(f.frontmatter,{});assert(result.issues[0].startsWith('delete.cleanup.sourcePending'));
});

/** Existing one-time/physical confirmation preferences cannot authorize arbitrary property scope. */
for(const hasFile of [false,true])for(const extras of [false,true])test('legacy delete consent '+(hasFile?'physical':'placeholder')+' extras='+extras,async()=>{
  const decisions=[];class Modal{constructor(app,options){decisions.push(options);}onClose(){decisions.at(-1).onCancel();}close(){this.onClose();}open(){this.close();}}
  const context={app:{},relationshipWriteCancels:new Set(),settings:{deletePromptInitialized:true,confirmFileDelete:false},confirmDeleteNode:method('confirmDeleteNode',{DeleteNodeConfirmationModal:Modal}),openRelationshipEvidenceLocation(){}};
  const result=await context.confirmDeleteNode({name:'B',file:hasFile?{}:null},{sources:[{properties:[{ontology:!extras}]}]});
  assert.equal(result,!extras);assert.equal(decisions.length,extras?1:0);
});

/** Preview admission refuses excessive copied payloads before any native trash can be requested. */
test('delete preview rejects an oversized source before native effects',async()=>{
  const f=deleteFixture();f.source.stat.size=9*1024*1024;await assert.rejects(f.context.captureDeleteNodePreview(f.target),/previewTooLarge/);assert(f.files.has('Folder/B.md'));assert.equal(f.patches.length,0);
});

/** Canonical source commits are independent: later native failure does not undo an earlier source or erase failed evidence. */
test('delete retains first source commit when another source native edit fails',async()=>{
 const a=deleteFixture({Children:'[[B]]'}),b=deleteFixture({Children:'[[B]]'});b.source.path='Other.md';b.files.delete('Owner.md');b.files.set(b.source.path,b.source);
 const pa=await a.context.captureDeleteNodePreview(a.target),pb=await b.context.captureDeleteNodePreview(b.target);pa.sources.push(...pb.sources);a.files.set(b.source.path,b.source);
 const originalCache=a.app.metadataCache.getFileCache,originalRead=a.app.vault.cachedRead,originalWrite=a.context.mutateRelationshipMetadata;
 a.app.metadataCache.getFileCache=file=>file===b.source?b.app.metadataCache.getFileCache(file):originalCache(file);a.app.vault.cachedRead=file=>file===b.source?b.app.vault.cachedRead(file):originalRead(file);
 a.context.mutateRelationshipMetadata=async(file,...args)=>{if(file===b.source)throw new Error('native denied');return originalWrite(file,...args);};
 const result=await a.run(pa);assert.deepEqual(a.frontmatter,{});assert.deepEqual(b.frontmatter,{Children:'[[B]]'});assert.deepEqual(a.patches,['Owner.md']);assert.equal(result.issues.length,1);assert(result.issues[0].includes('Other.md'));
});

/** Inspection failures after saving are distinct from an unsaved source and cannot fail a committed deletion. */
for(const hazard of ['read-rejection','source-retirement','source-growth'])test('saved source inspection '+hazard+' is truthfully reported',async()=>{
 const f=deleteFixture({Children:'[[B]]',arbitrary:'[[B]]'}),preview=await f.context.captureDeleteNodePreview(f.target);const patch=f.context.index.patchMarkdownPaths;
 f.context.index.patchMarkdownPaths=async(...args)=>{const result=await patch(...args);if(hazard==='read-rejection')f.app.vault.cachedRead=async()=>{throw new Error('gone');};if(hazard==='source-retirement'){const read=f.app.vault.cachedRead;f.app.vault.cachedRead=async()=>{const content=await read();f.files.delete('Owner.md');return content;};}if(hazard==='source-growth')f.source.stat.size=10*1024*1024;return result;};
 const result=await f.run(preview);assert.deepEqual(f.frontmatter,{arbitrary:'[[B]]'});assert.deepEqual(f.patches,['Owner.md']);assert(result.issues.some(issue=>issue.startsWith('delete.cleanup.inspectFailed')));
});

/** The shared additive writer is used by connection consent, preserves all original sources and closes its observer lifetime. */
for(const hazard of ['success','cancel','replacement','hidden-payload','retired-owner','refreshed-facade','canonical-replacement','priority-scheduler'])test('confirmed connection Hidden '+hazard+' uses exact source consent',async()=>{
 const f=deleteFixture({Children:'[[B]]',arbitrary:['[[B]]','[[C]]']}),owner={path:f.source.path,name:'Owner',file:f.source,url:null};
 f.context.index.pages=new Map([[owner.path,owner],[f.target.path,f.target]]);
 f.context.index.get=path=>path===owner.path?owner:path===f.target.path?f.target:undefined;f.context.index.withForegroundPriority=async work=>work();f.context.publishSavedRelationship=async()=>{};
 const scheduler=hazard==='priority-scheduler'?new contracts.ForegroundWorkScheduler():null;
 if(scheduler){f.context.index.withForegroundPriority=work=>scheduler.run(0,work);f.context.index.prepareRelationshipPair=async()=>{await scheduler.checkpoint(0);return true;};f.context.index.patchMarkdownPaths=async(paths,options)=>{assert.equal(scheduler.diagnostics().active[0],0,'P2 source publication must not wait behind its own P0 write lease');await scheduler.checkpoint(2);assert(options.isCurrent());f.patches.push(...paths);return{outcome:'patched'};};f.context.publishSavedRelationship=()=>scheduler.run(0,()=>scheduler.checkpoint(0));}
 if(hazard==='refreshed-facade'||hazard==='canonical-replacement')f.context.index.prepareRelationshipPair=async()=>{if(hazard==='canonical-replacement')f.context.index.pages.set(owner.path,{...owner});const current=new Map([[owner.path,{...owner}],[f.target.path,{...f.target}]]);f.context.index.get=path=>current.get(path);return true;};
 class Modal{constructor(app,sources,fields,target,decision){this.decision=decision;this.decided=false;}onClose(){if(!this.decided){this.decided=true;this.decision(null);}}close(){this.onClose();}open(){this.decided=true;this.close();this.decision(hazard==='cancel'?null:{sourcePath:'Owner.md',field:'Hide also'});}}
 f.context.hideRelationship=method('hideRelationship',{...contracts,normalizeFieldName:contracts.normalizeFieldName,HideRelationshipModal:Modal,Notice:class{},relationshipMetadataPayload:contracts.relationshipMetadataPayload}).bind(f.context);
 f.beforeNative=()=>{if(hazard==='replacement')f.files.set(f.source.path,{...f.source});if(hazard==='hidden-payload')f.frontmatter={...f.frontmatter,'Hide also':'[[C]]'};};
 const previous=globalThis.window;globalThis.window={setTimeout,clearTimeout};let result;try{result=await f.context.hideRelationship(owner.path,f.target.path,()=>hazard!=='retired-owner');}finally{scheduler?.close();globalThis.window=previous;}
 assert.deepEqual(f.frontmatter.Children,'[[B]]');assert.deepEqual(f.frontmatter.arbitrary,['[[B]]','[[C]]']);
 assert.equal(result.status,hazard==='success'||hazard==='refreshed-facade'||hazard==='priority-scheduler'?'committed':hazard==='cancel'||hazard==='retired-owner'?'cancelled':hazard==='canonical-replacement'?'unavailable':'failed');
 if(hazard==='success'||hazard==='refreshed-facade'||hazard==='priority-scheduler')assert.deepEqual(f.frontmatter['Hide also'],['[[Folder/B.md]]']);assert.equal(f.context.relationshipWriteCancels.size+f.app.metadataCache.refs.size+f.app.vault.refs.size,0);
 if(scheduler){assert.deepEqual(scheduler.diagnostics().active,[0,0,0,0,0]);assert.equal(scheduler.diagnostics().waiting,0);assert.deepEqual(f.patches,['Owner.md']);}
});

/** Native trash awaits cannot dematerialize a replacement file at the original path. */
test('delete native trash await never dematerializes a recreated target',async()=>{
 const file={path:'B.md',extension:'md'},target={path:file.path,name:'B',file},replacement={path:file.path,file:{path:file.path,extension:'md'}};let live=file,current=target;
 const context={app:{vault:{getFileByPath:()=>live},fileManager:{trashFile:async()=>{live=replacement.file;current=replacement;}}},index:{pages:new Map([[target.path,target]]),get:()=>current,dematerializeFile:()=>assert.fail('Cannot dematerialize replacement'),removeVirtualPageIfUnreferencedFromSources:async()=>false},
 settings:{pinnedNodes:[],navigationHistory:[],removeOntologyLinksOnDelete:true},translator:key=>key,captureDeleteNodePreview:async()=>({sources:[],removeOntologyLinksOnDelete:true}),confirmDeleteNode:async()=>true,removeFromNavigationHistory(){},saveSettings:async()=>{},removePropertyReferencesToNode:async()=>({remaining:[],issues:[]})};
 const result=await method('deleteNode',{...contracts,Notice:class{}}).call(context,target);assert.equal(result.status,'committed');assert.equal(current,replacement);assert.equal(replacement.file,live);
});

/** Unloading retires pending delete consent instead of retaining an approval capable of trash. */
test("delete pending consent is plugin owned and unloading cancels before native work",async()=>{
  let modal;class Modal{constructor(app,options){this.options=options;modal=this;}open(){}onClose(){this.options.onCancel();}close(){this.onClose();}}
  const context={app:{},relationshipWriteCancels:new Set(),settings:{deletePromptInitialized:true,confirmFileDelete:true},openRelationshipEvidenceLocation(){}};
  const pending=method("confirmDeleteNode",{DeleteNodeConfirmationModal:Modal}).call(context,{name:"B",file:{}},{sources:[]});
  assert.equal(context.relationshipWriteCancels.size,1);context.unloading=true;for(const cancel of [...context.relationshipWriteCancels])cancel();
  assert.equal(await pending,false);assert.equal(context.relationshipWriteCancels.size,0);modal.close();assert.equal(context.relationshipWriteCancels.size,0);
});

/** Each awaited pre-trash boundary rejects unload, including approval after a preference save. */
for(const phase of ["preview","confirmation"])test("delete unload during "+phase+" cannot trash native target",async()=>{
  const file={path:"B.md",extension:"md"},target={path:file.path,file};
  const context={app:{vault:{getFileByPath:()=>file},fileManager:{trashFile:()=>assert.fail("Unloading must not trash")}},index:{pages:new Map([[target.path,target]]),get:()=>target},translator:key=>key,settings:{removeOntologyLinksOnDelete:true},
    captureDeleteNodePreview:async()=>{if(phase==="preview")context.unloading=true;return {sources:[],removeOntologyLinksOnDelete:true};},
    confirmDeleteNode:async()=>{assert.equal(phase,"confirmation");context.unloading=true;return true;}};
  const result=await method("deleteNode",{...contracts,Notice:class{}}).call(context,target);assert.equal(result.status,"unavailable");
});

/** Detached native approval failure settles once, releases lifetime ownership and never reaches trash. */
test("delete preference persistence rejection cannot approve or strand deletion",async()=>{
  class Modal{constructor(app,options){this.options=options;}onClose(){}close(){this.onClose();}open(){this.close();void this.options.onConfirm(true);}}
  const file={path:"B.md",extension:"md"},target={path:file.path,file};
  const context={app:{vault:{getFileByPath:()=>file},fileManager:{trashFile:()=>assert.fail("Rejected consent must not trash")}},index:{pages:new Map([[target.path,target]]),get:()=>target},
    settings:{deletePromptInitialized:false,confirmFileDelete:true},relationshipWriteCancels:new Set(),openRelationshipEvidenceLocation(){},
    captureDeleteNodePreview:async()=>({sources:[]}),saveSettings:async()=>{throw Error("preference persistence failed");},
    confirmDeleteNode:method("confirmDeleteNode",{DeleteNodeConfirmationModal:Modal})};
  await assert.rejects(method("deleteNode",contracts).call(context,target),/preference persistence failed/);assert.equal(context.relationshipWriteCancels.size,0);
});

/** Individually admitted finite sources cannot accumulate beyond the whole-preview retained-data budget. */
test("delete preview aggregate budget refuses two individually admissible sources before trash",async()=>{
  const f=deleteFixture({Children:"[[B]]"}),other={...f.source,path:"Other.md",stat:{...f.source.stat}};
  const content="---\nChildren: '[[B]]'\n---\n"+"x".repeat(1_200_000);f.source.stat.size=content.length;other.stat.size=content.length;f.files.set(other.path,other);f.app.vault.cachedRead=async()=>content;
  for(const source of [f.source,other]){f.context.referencingMarkdownFiles=()=>[source];assert.equal((await f.context.captureDeleteNodePreview(f.target)).sources.length,1);}
  f.context.referencingMarkdownFiles=()=>[f.source,other];await assert.rejects(f.context.captureDeleteNodePreview(f.target),/previewTooLarge/);
  assert.equal(f.files.get(f.nativeTarget.path),f.nativeTarget);assert.equal(f.target.file,f.nativeTarget);assert.equal(f.patches.length,0);
});

/** Exact pair publication replaces a read facade without replacing the approved canonical endpoint. */
for(const replaceCanonical of [false,true])test('delete cleanup '+(replaceCanonical?'rejects a replaced canonical ghost':'survives refreshed ghost pair facades'),async()=>{
 const f=deleteFixture({Children:'[[B]]',arbitrary:'[[B]]'}),index=f.context.index,canonical=f.target;
 let facade={...canonical},semanticChecks=0,reports=0;index.pages=new Map([[canonical.path,canonical]]);index.get=()=>facade;
 index.dematerializeFile=path=>{assert.equal(path,canonical.path);canonical.file=null;facade={...canonical};return canonical;};
 index.prepareRelationshipPair=async()=>{if(replaceCanonical)index.pages.set(canonical.path,{...canonical});facade={...index.pages.get(canonical.path)};return true;};
 index.isSemanticWriteReady=()=>{semanticChecks++;return true;};
 const patch=index.patchMarkdownPaths;index.patchMarkdownPaths=async(...args)=>{facade={...canonical};return patch(...args);};
 index.removeVirtualPageIfUnreferencedFromSources=()=>assert.fail('Preserved arbitrary references retain ghost');
 f.app.fileManager.trashFile=async()=>{f.dematerialize();};
 Object.assign(f.context.settings,{pinnedNodes:[],navigationHistory:[]});Object.assign(f.context,{confirmDeleteNode:async()=>true,removeFromNavigationHistory(){},saveSettings:async()=>{}});
 const run=method('deleteNode',{...contracts,Notice:class{},RemainingNodeReferencesModal:class{open(){reports++;}}});
 const previous=globalThis.window;globalThis.window={setTimeout,clearTimeout};try{
  const result=await run.call(f.context,facade);assert.equal(result.status,'committed');assert.equal(reports,1);assert.equal(f.files.has(f.nativeTarget.path),false);
  if(replaceCanonical){assert.deepEqual(f.frontmatter,{Children:'[[B]]',arbitrary:'[[B]]'});assert.equal(semanticChecks,0);assert.deepEqual(f.patches,[]);}
  else{assert.deepEqual(f.frontmatter,{arbitrary:'[[B]]'});assert(semanticChecks>0,'Existing writer still requires semantic pair authority');assert.deepEqual(f.patches,['Owner.md']);assert.equal(index.pages.get(canonical.path),canonical);assert.equal(facade.file,null);}
  assert.equal(f.context.relationshipWriteCancels.size,0);
 }finally{globalThis.window=previous;}
});


// Native-host folding uses production methods and the production session owner with small DOM
// ports. Actual native geometry, activation, save-layout and interruption remain separate lanes.
const foldBundle = join(temporary, 'fold-session.mjs');
await build({entryPoints: ['src/ui/PlexFoldSession.ts'], outfile: foldBundle, bundle: true, platform: 'node', format: 'esm', plugins: [{name:'fold-native-ports',setup(builder){
  builder.onResolve({filter:/^obsidian$/},()=>({path:'obsidian',namespace:'fold-ports'}));
  builder.onResolve({filter:/LongPressTooltip$/},()=>({path:'tooltip',namespace:'fold-ports'}));
  builder.onLoad({filter:/.*/,namespace:'fold-ports'},({path})=>({contents:path==='obsidian' ? 'export function setIcon(el){if(el.ownerDocument.failIcon)throw Error("icon failed");}' : 'export function installKplexLongPressTooltips(doc){doc.leases++;let live=true;return()=>{if(live){live=false;doc.leases--;}}}',loader:'js'}));
}}]});
const {PlexFoldSession, plexFoldIdentity} = await import(pathToFileURL(foldBundle));

/** Minimal native structural ports, deliberately without workspace save/open/index capabilities. */
function foldFixture() {
  class Classes extends Set { contains(value){return this.has(value)} remove(value){this.delete(value)} }
  class Element {
    constructor(doc,...classes){this.ownerDocument=doc;this.classList=new Classes(classes);this.children=[];this.parentElement=null;this.attrs=new Map();this.listeners=new Map();this.connected=false;this.extent=400;}
    get isConnected(){return this.parentElement ? this.parentElement.isConnected : this.connected}
    appendChild(child){child.remove();this.children.push(child);child.parentElement=this;return child}
    remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(child=>child!==this);this.parentElement=null;this.connected=false}
    createEl(_tag,options={}){if(this.ownerDocument.failCreate)throw Error('create failed');return this.appendChild(new Element(this.ownerDocument,...(options.cls??'').split(' ').filter(Boolean)))}
    querySelector(){return this.children.find(child=>child.classList.contains('workspace-tab-container'))??null}
    contains(child){for(let node=child;node;node=node.parentElement)if(node===this)return true;return false}
    setAttribute(key,value){this.attrs.set(key,value)} getAttribute(key){return this.attrs.get(key)??null} hasAttribute(key){return this.attrs.has(key)} removeAttribute(key){this.attrs.delete(key)}
    addEventListener(key,fn){this.listeners.set(key,fn)}
    getBoundingClientRect(){return {width:this.extent,height:this.extent}}
  }
  class KplexView {constructor(){this.generation=1;this.zen=true;this.fullscreen=false}getPlexFoldGeneration(){return this.generation}prepareForPlexFold(){this.fullscreen=false}}
  const observers=new Set(),events=new Map(),doc={leases:0,activeElement:null};
  doc.defaultView={addEventListener:(key,fn)=>events.set(key,fn),removeEventListener:(key,fn)=>{if(events.get(key)===fn)events.delete(key)},getComputedStyle:el=>({display:el.classList.contains('kplex-folded-workspace-group')?'none':'flex'}),MutationObserver:class{constructor(callback){this.callback=callback;observers.add(this)}observe(){}disconnect(){observers.delete(this)}}};
  const root=new Element(doc);root.connected=true;const split=root.appendChild(new Element(doc,'workspace-split')),hostGroup=split.appendChild(new Element(doc,'workspace-tabs')),sidecarGroup=split.appendChild(new Element(doc,'workspace-tabs')),recovery=sidecarGroup.appendChild(new Element(doc,'workspace-tab-container'));
  const host={group:hostGroup,view:new KplexView(),attached:true,getViewState:()=>({type:'kplex'})},sidecar={group:sidecarGroup,view:{},kind:'markdown',attached:true,getViewState(){return{type:this.kind}}},sibling={group:sidecarGroup,view:{},attached:true,selected:true};
  const calls=[],owner={unloading:false,collapsedPlexHosts:new Map(),plexFoldRevisions:new WeakMap(),sidecarLeaves:new Map([[host,sidecar]]),sidecarMovingHosts:new Set(),passiveSidecarSyncRequests:new WeakMap(),settings:{documentSyncMode:'pinned',sidecarOpen:true},linkedDocumentLeaf:sidecar,
    leafIsAttached:leaf=>leaf.attached,leafGroupElement:leaf=>leaf.group,splitAxis:()=>owner.axis??'width',adjacentPosition:()=>owner.geometry===false?null:'right',leafTabIsActive:leaf=>!!leaf.selected,translator:key=>key,notifySidecar:()=>calls.push('notify'),onKplexVisibilityMayHaveChanged:()=>calls.push('visibility'),
    app:{workspace:{activeLeaf:host,getActiveViewOfType(){return {leaf:this.activeLeaf}},iterateAllLeaves(fn){[host,sidecar,sibling].forEach(fn)},setActiveLeaf(leaf){calls.push(['focus',leaf]);this.activeLeaf=leaf},async revealLeaf(leaf){calls.push(['reveal',leaf])}}}};
  for(const name of ['advancePlexFoldRevision','setSidecarOwner','deleteSidecarOwner','restoreCollapsedPlex','restorePlexFoldBeforeReveal','isPlexFoldedForSidecar','readPlexFoldCandidate','plexFoldToken','readPlexFoldCandidates','readPlexFoldUnavailableReason','isPlexFoldCandidateCurrent','isPlexFoldSessionValid','reconcilePlexFolds','togglePlexFold','expandPlexFromSidecar'])owner[name]=method(name,{KplexView,ItemView:class{},PlexFoldSession,plexFoldIdentity});
  return {owner,host,sidecar,sibling,root,split,hostGroup,sidecarGroup,recovery,doc,events,observers,calls,Element,KplexView};
}

/** Real pair captures and session transitions are graph-independent and reversible. */
test('native fold toggles with no center, preserves selected sibling, and restores exact captured DOM',async()=>{
  const f=foldFixture(),c=f.owner.readPlexFoldCandidate(f.host),original=c.token;
  assert.equal(c.hostShare,.5);assert.equal(f.doc.leases,0);assert.equal(f.calls.length,0,'Checks have no native effects');
  assert.equal(await f.owner.togglePlexFold(c),true);assert(f.hostGroup.classList.contains('kplex-folded-workspace-group'));assert.equal(f.owner.app.workspace.activeLeaf,f.sibling);assert.equal(f.doc.leases,1);assert.equal(f.recovery.children.length,1);assert(f.host.view.zen);
  const folded=f.owner.readPlexFoldCandidate(f.host);assert.notEqual(folded.token,original);assert.equal(f.owner.isPlexFoldCandidateCurrent(c),false);
  assert.equal(await f.owner.togglePlexFold(folded),true);assert.equal(f.owner.app.workspace.activeLeaf,f.host);assert.equal(f.doc.leases,0);assert.equal(f.recovery.children.length,0);assert.equal(f.events.size,0);assert.equal(f.observers.size,0);assert(!f.hostGroup.classList.contains('kplex-folded-workspace-group'));assert.notEqual(f.owner.readPlexFoldCandidate(f.host).token,original);
});

/** Capture fences survive owner ABA, React lifetime replacement and native ancestor movement. */
test('native fold rejects stale owner, generation, recovery wrapper and whole-split ancestry',async()=>{
  for(const change of [f=>{f.owner.deleteSidecarOwner(f.host);f.owner.setSidecarOwner(f.host,f.sidecar)},f=>f.host.view.generation++,f=>{f.recovery.remove();f.sidecarGroup.appendChild(new f.Element(f.doc,'workspace-tab-container'))},f=>{const outer=f.root.appendChild(new f.Element(f.doc,'workspace-split'));outer.appendChild(f.split)}]){
    const f=foldFixture(),c=f.owner.readPlexFoldCandidate(f.host);change(f);assert.equal(f.owner.isPlexFoldCandidateCurrent(c),false);assert.equal(await f.owner.togglePlexFold(c),false);assert.equal(f.owner.collapsedPlexHosts.size,0);assert.equal(f.doc.leases,0);
  }
});

/** Hidden invalid owners restore before release, while ordinary navigation and unrelated tabs survive. */
test('native fold reconciles detach/replacement/migration without adopting or closing another tab',async()=>{
  for(const change of [f=>{f.sidecar.attached=false},f=>{f.sidecar.kind='empty';f.sidecar.view={}},f=>{const outer=f.root.appendChild(new f.Element(f.doc,'workspace-split'));outer.appendChild(f.split)},f=>{f.host.view.generation++}]){
    const f=foldFixture();await f.owner.togglePlexFold(f.owner.readPlexFoldCandidate(f.host));change(f);assert.equal(f.owner.reconcilePlexFolds(),true);assert.equal(f.owner.collapsedPlexHosts.size,0);assert.equal(f.owner.sidecarLeaves.size,0);assert(!f.hostGroup.classList.contains('kplex-folded-workspace-group'));assert.equal(f.doc.leases,0);assert.equal(f.sibling.attached,true);assert.equal(f.owner.app.workspace.activeLeaf,f.sibling);
  }
  const f=foldFixture();await f.owner.togglePlexFold(f.owner.readPlexFoldCandidate(f.host));f.sidecar.kind='excalidraw';f.sidecar.view={};f.sibling.attached=false;assert.equal(f.owner.reconcilePlexFolds(),false);assert.equal(f.owner.collapsedPlexHosts.size,1);f.owner.restorePlexFoldBeforeReveal(f.host);assert.equal(f.doc.leases,0);
});

/** Failed DOM/focus installation and foreign ownership must never leave a hidden group or lease. */
test('native fold rolls back installation failures and refuses unsafe allocation',async()=>{
  for(const fail of [f=>{f.doc.failCreate=true},f=>{f.doc.failIcon=true},f=>{f.owner.app.workspace.setActiveLeaf=()=>{throw Error('native focus failed')}},f=>{f.hostGroup.setAttribute('data-kplex-fold-owner','foreign')}]){
    const f=foldFixture();fail(f);assert.equal(await f.owner.togglePlexFold(f.owner.readPlexFoldCandidate(f.host)),false);assert.equal(f.owner.collapsedPlexHosts.size,0);assert.equal(f.doc.leases,0);assert(!f.recovery.classList.contains('kplex-fold-recovery-host'));assert.equal(f.recovery.children.length,0);assert(!f.hostGroup.classList.contains('kplex-folded-workspace-group'));
  }
  const f=foldFixture();f.split.appendChild(new f.Element(f.doc,'workspace-tabs'));assert.equal(f.owner.readPlexFoldCandidate(f.host),null);assert.equal(f.owner.readPlexFoldUnavailableReason(f.host),'sidecar.foldUnsupportedLayout');assert.equal(f.calls.length,0);
});

/** Recovery control repair is bounded and retired callbacks cannot unfold a successor. */
test('native recovery repairs a removed button and retires detached DOM, pagehide and old callbacks',async()=>{
  const f=foldFixture();await f.owner.togglePlexFold(f.owner.readPlexFoldCandidate(f.host));const session=f.owner.collapsedPlexHosts.get(f.host),button=session.unfoldButton,callback=button.listeners.get('click');button.remove();[...f.observers][0].callback();assert.equal(button.parentElement,f.recovery);
  f.hostGroup.remove();f.owner.restorePlexFoldBeforeReveal(f.host);assert(!f.hostGroup.classList.contains('kplex-folded-workspace-group'));assert.equal(f.doc.leases,0);session.dispose();callback();assert.equal(f.owner.collapsedPlexHosts.size,0);
  f.split.appendChild(f.hostGroup);await f.owner.togglePlexFold(f.owner.readPlexFoldCandidate(f.host));f.events.get('pagehide')();assert.equal(f.owner.collapsedPlexHosts.size,0);assert.equal(f.doc.leases,0);
});

/** An older accepted reveal cannot focus after a newer complete fold/unfold round trip. */
test('native explicit unfold fences delayed reveal after a newer fold incarnation',async()=>{
  const f=foldFixture();await f.owner.togglePlexFold(f.owner.readPlexFoldCandidate(f.host));let finish;f.owner.app.workspace.revealLeaf=()=>new Promise(resolve=>{finish=resolve});const pending=f.owner.expandPlexFromSidecar(f.host);await Promise.resolve();
  await f.owner.togglePlexFold(f.owner.readPlexFoldCandidate(f.host));f.owner.restorePlexFoldBeforeReveal(f.host);const focusCount=f.calls.filter(call=>Array.isArray(call)&&call[0]==='focus').length;finish();await pending;assert.equal(f.calls.filter(call=>Array.isArray(call)&&call[0]==='focus').length,focusCount);assert.equal(f.doc.leases,0);
});

/** Restoring visibility does not authorize a later completion to override newer native selection. */
test('native explicit unfold preserves a different native tab selected during held reveal',async()=>{
  for (const selectsSynchronously of [false,true]) {
  const f=foldFixture();await f.owner.togglePlexFold(f.owner.readPlexFoldCandidate(f.host));
  let finish;f.owner.app.workspace.revealLeaf=()=>{if(selectsSynchronously)f.owner.app.workspace.setActiveLeaf(f.host,{focus:true});return new Promise(resolve=>{finish=resolve})};
  const pending=f.owner.expandPlexFromSidecar(f.host);assert.equal(f.owner.collapsedPlexHosts.size,0);
  const other={group:f.hostGroup,view:{},attached:true};f.owner.app.workspace.setActiveLeaf(other,{focus:true});
  const focusCount=f.calls.filter(call=>Array.isArray(call)&&call[0]==='focus').length;
  finish();await pending;assert.equal(f.owner.app.workspace.activeLeaf,other);assert.equal(f.calls.filter(call=>Array.isArray(call)&&call[0]==='focus').length,focusCount);
  }
});

/** Hold one real startup boundary; native creation/ownership remains the existing production owner. */
function startupSidecarFixture(boundary='candidate') {
  const f=foldFixture(),owner=f.owner;owner.deleteSidecarOwner(f.host);f.host.view.getViewType=()=> 'kplex';owner.linkedDocumentLeaf=null;
  owner.settings.sidecarOpen=true;owner.sidecarRestoreAttemptedHosts=new Set();owner.sidecarRestoreTask=null;
  owner.isSidecarOpen=host=>owner.sidecarLeaves.has(host);
  let finish,admit;const admitted=new Promise(resolve=>{admit=resolve}),gate=new Promise(resolve=>{finish=resolve});
  owner.waitForWorkspaceLayout=()=>{if(boundary==='layout'){admit();return gate}return Promise.resolve()};
  owner.waitForRestoredSidecarCandidate=()=>{f.candidateCalls++;if(boundary==='candidate'){admit();return gate}return Promise.resolve(f.sidecar)};
  f.saves=0;f.candidateCalls=0;owner.saveSettings=async()=>{f.saves++};owner.fileForLeaf=leaf=>leaf.file??null;
  owner.isManagedSidecarLeaf=leaf=>Array.from(owner.sidecarLeaves.values()).includes(leaf);
  const restore=method('restorePersistedSidecar',{KplexView:f.KplexView,KPLEX_SIDEPANEL_VIEW_TYPE:'sidepanel'});
  return Object.assign(f,{admitted,finish:()=>finish(f.sidecar),start:()=>restore.call(owner,f.host)});
}

/** Startup matching owns no native pane until its opening lifetime survives both awaited boundaries. */
test('native delayed startup Sidecar restore cannot overwrite a newer explicit owner',async()=>{
  const f=startupSidecarFixture(),owner=f.owner,pending=f.start();await f.admitted;
  const replacement={group:f.sidecarGroup,attached:true,view:{},file:{path:'Explicit.md'},getViewState:()=>({type:'markdown'})};
  owner.setSidecarOwner(f.host,replacement);owner.linkedDocumentLeaf=replacement;owner.lastDocumentLeaf=replacement;owner.settings.sidecarLastFilePath='Explicit.md';
  f.finish();await pending;assert.equal(owner.sidecarLeaves.get(f.host),replacement);assert.equal(owner.linkedDocumentLeaf,replacement);assert.equal(owner.lastDocumentLeaf,replacement);assert.equal(owner.settings.sidecarLastFilePath,'Explicit.md');assert.equal(f.saves,0);assert.equal(owner.sidecarRestoreTask,null);
});

/** Unchanged startup restoration must still adopt and persist its one exact existing native leaf. */
test('native delayed startup Sidecar restore retains ordinary unchanged startup adoption',async()=>{
  const f=startupSidecarFixture();f.sidecar.file={path:'Restored.md'};const pending=f.start();await f.admitted;f.finish();await pending;
  assert.equal(f.owner.sidecarLeaves.get(f.host),f.sidecar);assert.equal(f.owner.linkedDocumentLeaf,f.sidecar);assert.equal(f.owner.lastDocumentLeaf,f.sidecar);assert.equal(f.owner.settings.sidecarLastFilePath,'Restored.md');assert.equal(f.owner.settings.documentSyncMode,'pinned');assert.equal(f.saves,1);assert.equal(f.owner.sidecarRestoreTask,null);
});

/** View/root lifetime, ownership ABA and candidate identity remain fenced across actual awaits. */
test('native delayed startup Sidecar restore rejects remount, detached or separately claimed candidates',async()=>{
  for(const change of [f=>f.host.view.generation++,f=>{f.host.view=new f.KplexView()},f=>{f.host.attached=false},f=>{f.sidecar.attached=false},f=>{f.owner.sidecarLeaves.set({},f.sidecar)},f=>{f.owner.setSidecarOwner(f.host,f.sidecar);f.owner.deleteSidecarOwner(f.host)},f=>{f.owner.geometry=false}]){
    const f=startupSidecarFixture(),pending=f.start();await f.admitted;change(f);f.finish();await pending;
    assert.equal(f.owner.sidecarLeaves.has(f.host),false);assert.equal(f.saves,0);assert.equal(f.owner.linkedDocumentLeaf,null);assert.equal(f.owner.sidecarRestoreTask,null);
  }
  const f=startupSidecarFixture('layout'),pending=f.start();await f.admitted;f.host.view.generation++;f.finish();await pending;assert.equal(f.candidateCalls,0,'Retired layout lifetime never starts candidate matching');assert.equal(f.saves,0);
});

/** A hidden-group programmatic owner can replace a conflicting fold without a focus chain. */
test('native overlapping pair folds restore the prior owner before hiding the new owner',async()=>{
  const f=foldFixture(),other={group:f.hostGroup,view:new f.KplexView(),attached:true,getViewState:()=>({type:'kplex'})};await f.owner.togglePlexFold(f.owner.readPlexFoldCandidate(f.host));f.owner.sidecarLeaves.set(other,f.sidecar);f.owner.geometry=false;const candidate=f.owner.readPlexFoldCandidate(other);assert(candidate);f.owner.geometry=true;assert.equal(await f.owner.togglePlexFold(candidate),true);assert.equal(f.owner.collapsedPlexHosts.has(f.host),false);assert.equal(f.owner.collapsedPlexHosts.has(other),true);assert.equal(f.doc.leases,1);f.owner.restorePlexFoldBeforeReveal(other);assert.equal(f.doc.leases,0);
});


/** Existing folded state is a recovery capability even after native topology ceases to qualify. */
test('native invalid topology remains explicitly recoverable before layout reconciliation',async()=>{
  const f=foldFixture();await f.owner.togglePlexFold(f.owner.readPlexFoldCandidate(f.host));f.split.appendChild(new f.Element(f.doc,'workspace-tabs'));const capture=f.owner.readPlexFoldCandidate(f.host);assert(capture?.folded);assert.equal(f.owner.isPlexFoldCandidateCurrent(capture),true);assert.equal(await f.owner.togglePlexFold(capture),true);assert(!f.hostGroup.classList.contains('kplex-folded-workspace-group'));assert.equal(f.doc.leases,0);
});

/** Compose the actual host router and portable dispatcher over the existing structural ports.
 * The picker double supplies only its native shell; candidate selection remains production code. */
function foldRoutingFixture() {
  const f=foldFixture(),{owner}=f,leaves=[f.host,f.sidecar,f.sibling],pickers=[],window=f.doc.defaultView,windows=new Map([[f.doc.defaultView,'main']]);
  window.activeWindow=window;
  class KplexSidepanelView {}
  class Picker {
    constructor(_app,items,title,choose,release){Object.assign(this,{items,title,choose,release});pickers.push(this)}
    open(){this.opened=true} close(){if(this.opened){this.opened=false;this.release()}}
    select(index){const item=this.items[index];assert(!item.disabled);this.choose(item.value);this.close()}
  }
  /** Install only native container/title facts; no graph or editor state is supplied. */
  const connect=pair=>{for(const leaf of [pair.host,pair.sidecar,pair.sibling])leaf.view.containerEl=leaf.group;pair.sidecar.view.getDisplayText=()=>`Companion ${leaves.indexOf(pair.host)}`;};
  connect(f);f.doc.defaultView.document=f.doc;
  Object.assign(owner,{actionSurfaceHosts:new Map(),actionDialogs:new Map(),actionInvocationSequence:0,
    index:new Proxy({}, {get:()=>assert.fail('Fold routing must not read the graph')}),supportEvents:{record:assert.fail},
    actionWindowId:value=>windows.get(value),translator:(key,params)=>params?`${key} ${params.number}`:key});
  owner.app.workspace.iterateAllLeaves=fn=>leaves.forEach(fn);
  owner.app.workspace.getLeavesOfType=type=>leaves.filter(leaf=>type==='kplex'?leaf.view instanceof f.KplexView:leaf.view instanceof KplexSidepanelView);
  for(const name of ['resolvePlexFoldAction','plexFoldTargetCandidate','applyPlexFoldTarget','executePlexFoldAction'])owner[name]=method(name,{window,ItemView:class{},KplexView:f.KplexView,KplexSidepanelView,KPLEX_VIEW_TYPE:'kplex',KPLEX_SIDEPANEL_VIEW_TYPE:'sidepanel',ActionTargetPicker:Picker,Notice:class{constructor(){assert.fail('Unexpected failure notice')}}});
  const id='view.sidecar.collapse-plex',request={id,source:'obsidian-command'};
  owner.actionManager=new contracts.ActionManager({readCommandContext:assert.fail,validateNode:assert.fail,
    resolveSidecarFold:value=>owner.resolvePlexFoldAction(value),validateSidecarFold:value=>owner.plexFoldTargetCandidate(value)!==null,
    implementations:{[id]:{availability:context=>({state:context.sidecarFold.state==='ambiguous'?'preparable':'enabled'}),execute:context=>owner.executePlexFoldAction(context)}}});
  /** Register a real interaction-ledger entry independently of graph readiness. */
  const register=(host,name)=>{owner.actionSurfaceHosts.set(name,{leaf:host,generation:1});owner.actionManager.registerSurface({id:name,generation:1,readSnapshot:()=>({mounted:true,visible:true,windowId:windows.get(host.group.ownerDocument.defaultView),center:null,selected:null,focusRegion:'graph',interactionRevision:0})});};
  register(f.host,'A');
  /** Add an independent native two-group pair, optionally in another owning document. */
  const addPair=(name,otherWindow=false)=>{
    const doc=otherWindow?foldFixture().doc:f.doc;doc.defaultView.document=doc;if(otherWindow)windows.set(doc.defaultView,name);
    const root=new f.Element(doc);root.connected=true;
    const split=root.appendChild(new f.Element(doc,'workspace-split')),hostGroup=split.appendChild(new f.Element(doc,'workspace-tabs')),sidecarGroup=split.appendChild(new f.Element(doc,'workspace-tabs'));
    sidecarGroup.appendChild(new f.Element(doc,'workspace-tab-container'));
    const host={group:hostGroup,view:new f.KplexView(),attached:true,getViewState:()=>({type:'kplex'})},sidecar={group:sidecarGroup,view:{},kind:'markdown',attached:true,getViewState(){return{type:this.kind}}},sibling={group:sidecarGroup,view:{},attached:true,selected:true};
    leaves.push(host,sidecar,sibling);const pair={host,sidecar,sibling,doc,hostGroup,sidecarGroup};connect(pair);owner.setSidecarOwner(host,sidecar);register(host,name);return pair;
  };
  /** Focus unrelated native chrome without changing the explicit-interaction ledger. */
  const unrelated=()=>{f.doc.activeElement=null;owner.app.workspace.activeLeaf=null;};
  const target=host=>({id:owner.readPlexFoldCandidate(host).token,windowId:windows.get(host.group.ownerDocument.defaultView)});
  const dispose=()=>{for(const picker of pickers)picker.close();for(const host of [...owner.collapsedPlexHosts.keys()])owner.restorePlexFoldBeforeReveal(host);owner.actionManager.dispose();};
  return {...f,window,leaves,pickers,register,addPair,unrelated,target,request,dispose,KplexSidepanelView};
}

/** Native focus ownership outranks global recovery and never borrows another eligible pair. */
test('fold routing respects explicit, focused, embedded and participating sibling owners',()=>{
  const f=foldRoutingFixture(),b=f.addPair('B');
  try {
    const expect=host=>assert.equal(f.owner.resolvePlexFoldAction(f.request).target.id,f.target(host).id);
    expect(f.host);for(const leaf of [b.sidecar,b.sibling]){f.owner.app.workspace.activeLeaf=leaf;expect(b.host)}
    f.owner.app.workspace.activeLeaf=f.sibling;f.doc.activeElement=b.hostGroup.appendChild(new f.Element(f.doc));expect(b.host);
    f.doc.activeElement=null;f.owner.sidecarLeaves.delete(b.host);f.owner.app.workspace.activeLeaf=b.host;
    assert.equal(f.owner.resolvePlexFoldAction(f.request).state,'unavailable');
    assert.equal(f.owner.resolvePlexFoldAction({...f.request,surfaceId:'B'}).state,'unavailable');
    const sidepanel={group:b.hostGroup,view:new f.KplexSidepanelView()};sidepanel.view.containerEl=b.hostGroup;f.leaves.push(sidepanel);f.owner.app.workspace.activeLeaf=sidepanel;
    assert.equal(f.owner.resolvePlexFoldAction(f.request).state,'unavailable');
    assert.equal(f.owner.collapsedPlexHosts.size,0);assert.equal(f.calls.length,0);
  }finally{f.dispose()}
});

/** Checks inspect finite native associations only and isolate the invoking document. */
test('fold routing checks are graph-independent and cannot recover a pair from another window',()=>{
  const f=foldRoutingFixture(),other=f.addPair('popout',true);
  try{
    f.unrelated();const before=f.owner.actionManager.readInteractionOrder('A');
    for(let i=0;i<3;i++)assert.equal(f.owner.actionManager.check(f.request).state,'enabled');
    assert.equal(f.owner.actionManager.readInteractionOrder('A'),before);assert.equal(f.pickers.length,0);assert.equal(f.calls.length,0);assert.equal(f.doc.leases,0);
    assert.equal(f.owner.resolvePlexFoldAction({...f.request,windowId:'popout'}).state,'unavailable');
    f.owner.sidecarLeaves.delete(f.host);assert.equal(f.owner.resolvePlexFoldAction(f.request).state,'unavailable');
    f.window.activeWindow=other.doc.defaultView;assert.equal(f.owner.resolvePlexFoldAction(f.request).target.id,f.target(other.host).id);
    assert.equal(f.owner.resolvePlexFoldAction({...f.request,surfaceId:'popout',windowId:'main'}).state,'unavailable');
  }finally{f.dispose()}
});

/** A native hint retained after popout closure cannot strand recovery in the live main window. */
test('fold routing ignores a closed native active-window hint',()=>{
  const f=foldRoutingFixture(),other=f.addPair('retired-popout',true);
  try{
    f.unrelated();other.doc.defaultView.closed=true;f.window.activeWindow=other.doc.defaultView;
    assert.deepEqual(f.owner.resolvePlexFoldAction(f.request),{state:'resolved',target:f.target(f.host)});
    assert.equal(f.owner.actionManager.check(f.request).state,'enabled');assert.equal(f.calls.length,0);
  }finally{f.dispose()}
});

/** Recovery priority uses actual folded sessions and the existing deliberate-interaction ledger. */
test('fold routing prefers the sole folded pair, then unique deliberate recency, then finite ambiguity',async()=>{
  const f=foldRoutingFixture(),b=f.addPair('B');
  try{
    f.unrelated();let route=f.owner.resolvePlexFoldAction(f.request);assert.equal(route.state,'ambiguous');assert.deepEqual(route.targets,[f.target(f.host),f.target(b.host)]);
    f.owner.actionManager.recordInteraction('B');assert.equal(f.owner.resolvePlexFoldAction(f.request).target.id,f.target(b.host).id);
    await f.owner.togglePlexFold(f.owner.readPlexFoldCandidate(f.host));f.unrelated();assert.equal(f.owner.resolvePlexFoldAction(f.request).target.id,f.target(f.host).id);
    f.owner.restorePlexFoldBeforeReveal(f.host);f.unrelated();assert.equal(f.owner.resolvePlexFoldAction(f.request).target.id,f.target(b.host).id);
    f.owner.actionManager.recordInteraction('A');assert.equal(f.owner.resolvePlexFoldAction(f.request).target.id,f.target(f.host).id);
  }finally{f.dispose()}
});

/** Accepted finite tokens survive focus changes but cannot survive a new native incarnation. */
test('fold routing fences owner ABA and never retargets a captured action after window changes',async()=>{
  const f=foldRoutingFixture(),other=f.addPair('popout',true);
  try{
    const old=f.target(f.host),accepted=f.owner.actionManager.prepare(f.request);assert.equal(accepted.state,'accepted');
    f.owner.deleteSidecarOwner(f.host);f.owner.setSidecarOwner(f.host,f.sidecar);
    assert.equal(f.owner.plexFoldTargetCandidate(old),null);assert.equal((await accepted.run()).status,'cancelled');assert.equal(f.owner.collapsedPlexHosts.size,0);
    const current=f.owner.actionManager.prepare(f.request);assert.equal(current.state,'accepted');f.window.activeWindow=other.doc.defaultView;f.owner.app.workspace.activeLeaf=other.host;
    assert.equal((await current.run()).status,'completed');assert(f.owner.collapsedPlexHosts.has(f.host));assert(!f.owner.collapsedPlexHosts.has(other.host));
    f.owner.restorePlexFoldBeforeReveal(f.host);const stale=f.target(other.host);other.host.view.generation++;assert.equal((await f.owner.applyPlexFoldTarget(stale)).status,'cancelled');
  }finally{f.dispose()}
});

/** Native chooser cancellation and selection operate on captured values, never a fresh resolver. */
test('fold routing picker cancellation is inert and selection keeps the exact captured pair',async()=>{
  const f=foldRoutingFixture(),b=f.addPair('B');
  try{
    f.unrelated();assert.equal(f.owner.actionManager.check(f.request).state,'preparable');assert.equal(f.pickers.length,0);
    assert.equal((await f.owner.actionManager.dispatch(f.request)).status,'opened');const cancelled=f.pickers[0];assert.equal(cancelled.items.length,2);cancelled.close();assert.equal(f.owner.actionDialogs.size,0);assert.equal(f.owner.collapsedPlexHosts.size,0);assert.equal(f.calls.length,0);
    assert.equal((await f.owner.actionManager.dispatch(f.request)).status,'opened');const chosen=f.pickers[1],captured=f.target(b.host);
    assert.deepEqual(chosen.items[1].value,captured);f.owner.app.workspace.activeLeaf=f.host;f.owner.actionManager.recordInteraction('A');chosen.select(1);await new Promise(resolve=>setImmediate(resolve));
    assert(f.owner.collapsedPlexHosts.has(b.host));assert(!f.owner.collapsedPlexHosts.has(f.host));assert.equal(f.owner.actionDialogs.size,0);
    f.owner.restorePlexFoldBeforeReveal(b.host);f.unrelated();
    const route={state:'ambiguous',targets:[f.target(f.host),f.target(b.host)]};f.owner.executePlexFoldAction({sidecarFold:route});const stale=f.pickers[2];f.owner.deleteSidecarOwner(b.host);f.owner.setSidecarOwner(b.host,b.sidecar);stale.select(1);await new Promise(resolve=>setImmediate(resolve));assert.equal(f.owner.collapsedPlexHosts.size,0);
  }finally{f.dispose()}
});
