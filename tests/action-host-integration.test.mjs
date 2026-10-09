/** Host workflow persistence and delayed physical identity use actual production callbacks. */
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
await build({ stdin: { contents: 'export * from "./src/core/plex/actionPreferences"; export * from "./src/adapters/obsidian/actionNode"; export * from "./src/application/ActionManager";', resolveDir: fileURLToPath(new URL('..', import.meta.url)) }, outfile: join(temporary, 'contracts.mjs'), bundle: true, platform: 'node', format: 'esm' });
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
    index: { get: () => target }, translator: key => key,
    confirmDeleteNode: async () => { native = { path: original.path, extension: 'md' }; target.file = native; return true; } };
  const outcome = await method('deleteNode', { ...contracts, Notice: class { constructor(value) { notices.push(value); } } }).call(current, target);
  assert.equal(outcome.status, 'unavailable'); assert.equal(notices.length, 1);
});

test('action settings navigate the native declarative page without acquiring a modal session', () => {
  const paths = []; let opens = 0;
  const current = { manifest: { id: 'k-plex' }, translator: key => key,
    app: { setting: { open: () => opens++, openPagePath: (id, path) => { paths.push([id, path]); return {}; } } },
    openSettings: assert.fail, settingsTab: null };
  const open = method('openActionSettings').bind(current);
  assert.equal(open(), true); assert.equal(open(), true);
  assert.deepEqual(paths, [['k-plex', ['actions.settingsTitle']], ['k-plex', ['actions.settingsTitle']]]);
  assert.equal(opens, 2);
});

test('unsupported page navigation retains main settings recovery without a detached editor', () => {
  let opens = 0;
  const current = { app: {}, openSettings: () => opens++, settingsTab: { openActionSettingsPage: () => false } };
  assert.equal(method('openActionSettings').call(current), false); assert.equal(opens, 1);
});
