/** Resource/guard contracts for the native event driver; fake host cleanup is not native acceptance. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url), ts = require('typescript');
const text = readFileSync(new URL('../scripts/testing/obsidian/indexingEventConvergence.mjs', import.meta.url), 'utf8');
const tree = ts.createSourceFile('native.mjs', text, ts.ScriptTarget.Latest, true);
const scenario = tree.statements.find(/** Extract the exact controller rather than reproducing cleanup logic. */item => ts.isFunctionDeclaration(item) && item.name?.text === 'scenario');
assert(scenario);

/** Fail real fixture creation at a selected ordinal and count every independent cleanup capability. */
function cleanupFixture(failAt, failDelete = false, outsideFolder = false, hiddenFolderChild = false) {
  const files = new Map(), folders = new Map(), calls = { disable: 0, enable: 0, layout: 0, data: 0, deletes: 0 };
  const layout = { main: { type: 'split' } };
  const demand = [], forbidden = [], document = { hidden: false, hasFocus: () => true, querySelector: () => null };
  let visible = false, viewReady = false;
  const leaf = { view: { containerEl: { ownerDocument: document }, async waitUntilReady() { assert(visible); demand.push('view-ready'); viewReady = true; } } };
  const noForcedWork = name => () => { forbidden.push(name); throw Error('Forced '+name); };
  const p = { initialIndexComplete: true, layoutReady: true, rebuildTimer: null, settingsWriteQueue: Promise.resolve(),
    async activateView(surface) { assert.equal(surface, 'leaf', 'Fixture demand explicitly avoids popout preferences'); demand.push('activate-leaf'); visible = true; },
    isKplexLeafVisible: value => visible && value === leaf,
    index: { isOnDemandMode: () => false, hasPendingSemanticPreparation: () => false,
      rebuild: noForcedWork('rebuild'), flushSourceRepository: noForcedWork('flushSourceRepository'),
      sourceAcquisition: { hasSemanticDependencies: () => true, getActivityState: () => ({}), flush: noForcedWork('flush'), reconcile: noForcedWork('reconcile') },
      indexedDb: { getActivityState: () => ({ queuedBodies: 0, writerActive: false }) },
      getSourceRepositoryDiagnostics: () => ({ unsaved: 0 }), getUrlIndexProgress: () => ({ complete: true, active: false, failed: false }) } };
  let created = 0;
  const app = { plugins: { plugins: { 'k-plex': p },
    /** Restoration must continue even if removing an owned file fails. */ async disablePlugin() { calls.disable++; },
    /** Preserve the original equipped fixture instance after reload. */ async enablePlugin() { calls.enable++; } },
    setting: { isOpen: false }, workspace: { getLayout: () => layout, onLayoutReady() {}, getLeavesOfType: type => type === 'k-plex-react-view' && visible ? [leaf] : [],
      /** The exact captured workspace, not a generated default, is restored. */ async changeLayout(value) { assert.equal(value, layout); calls.layout++; } },
    metadataCache: { getFileCache: () => ({}) }, vault: {
      getName: () => 'kplex-test-small', getFiles: () => [...files.values()],
      getFileByPath: path => files.get(path) ?? null, getFolderByPath: path => folders.get(path) ?? null,
      adapter: { getBasePath: () => 'C:\\Obsidian\\kplex-test-small',
        /** Count exact original configuration restoration independently of fixture removal. */ async write(path, value) { assert.equal(path, '.obsidian/plugins/k-plex/data.json'); assert.equal(value, 'original bytes'); calls.data++; } },
      /** A synthetic folder retains actual parent membership for cleanup identity checks. */ async createFolder(path) { assert(viewReady, 'Real view readiness must precede fixture writes'); demand.push('folder-write'); const folder = { path, children: [] }; folders.set(path, folder); return folder; },
      /** Fail at the specified real creation boundary, after earlier resources have been admitted. */ async create(path) {
        assert(viewReady); demand.push('note-write');
        if (created++ === failAt) throw Error('Owned creation failure');
        const parent = folders.get(path.slice(0, path.lastIndexOf('/'))), file = { path, parent };
        files.set(path, file); parent.children.push(file); return file;
      },
      /** Preserve object identity and expose a separately injected cleanup failure. */ async delete(item, force = false) {
        calls.deletes++;
        if (files.has(item.path)) {
          if (failDelete) throw Error('Owned deletion failure');
          files.delete(item.path); item.parent.children = item.parent.children.filter(file => file !== item);
        } else { assert.equal(force, true, 'Native Windows folder cleanup uses the guarded force API'); folders.delete(item.path); }
      },
    } };
  const win = { restore() {}, show() {}, focus() {}, isFocused: () => true, webContents: { focus() {} } };
  const remote = { app: { focus() {} }, getCurrentWindow: () => win };
  const fs = {
    /** Resolve only synthetic fixture paths; a separate case redirects the folder outside Small. */
    realpathSync(value) { return outsideFolder && path.basename(value).startsWith('Kplex210-Events-')
      ? path.join('C:\\Outside', path.basename(value)) : path.resolve(value); },
    /** Hidden entries would prohibit force deletion just like visible native children. */
    readdirSync() { return hiddenFolderChild ? ['.unexpected-child'] : []; }
  };
  const run = new Function('require', 'window', 'document', 'performance', `return (${scenario.getText(tree)})`)(
    /** Admit only the exact focus and physical-target guard capabilities used by the scenario. */name => {
      if (name === 'node:fs') return fs; if (name === 'node:path') return path;
      assert.equal(name, '@electron/remote'); return remote;
    },
    { setTimeout: callback => { queueMicrotask(callback); return 1; } },
    document, performance);
  const controller = { closed: false, vaultPath: 'C:\\Obsidian\\kplex-test-small', configRelative: '.obsidian', originalData: 'original bytes' };
  return { app, controller, files, folders, calls, run, demand, forbidden };
}

test('Markdown-only setup establishes explicit normal canvas demand and readiness before native writes',async()=>{
  const f = cleanupFixture(0);
  assert.deepEqual(f.app.workspace.getLeavesOfType('k-plex-react-view'), [], 'Starting layout has no Plex demand');
  await assert.rejects(f.run(f.app, f.controller), /Owned creation failure/);
  assert.deepEqual(f.demand, ['activate-leaf', 'view-ready', 'folder-write', 'note-write']);
  assert.deepEqual(f.forbidden, [], 'Actual scenario setup does not replace native demand with builder/flush work');
  assert.equal(f.calls.layout, 1, 'Captured original layout is independently restored');
  assert.equal(f.controller.progress.cleaned, true);
});

for (const at of [0, 1, 2]) test(`native setup failure after ${at} admitted notes restores fixture/configuration/workspace`, /** Run the real scenario finally path on partial setup. */ async () => {
  const f = cleanupFixture(at);
  await assert.rejects(f.run(f.app, f.controller), /Owned creation failure/);
  assert.equal(f.files.size, 0); assert.equal(f.folders.size, 0);
  assert.deepEqual({ disable: f.calls.disable, enable: f.calls.enable, layout: f.calls.layout, data: f.calls.data },
    { disable: 1, enable: 1, layout: 1, data: 2 });
  assert.equal(f.controller.progress.cleaned, true);
  assert.equal(f.controller.progress.phaseAtExit, 'fixture-preparation');
  assert.deepEqual(f.controller.progress.events, []);
  assert.deepEqual(f.controller.progress.writes, []);
});

test('native cleanup failure remains failed while independent configuration and workspace restoration continue', /** A teardown error is retained rather than turned into a successful report. */ async () => {
  const f = cleanupFixture(1, true);
  await assert.rejects(f.run(f.app, f.controller), /Event convergence cleanup:.*Owned deletion failure/);
  assert.equal(f.files.size, 1, 'Failed resource is explicitly retained, not falsely claimed removed');
  assert.equal(f.controller.progress.cleaned, false);
  assert.equal(f.controller.progress.phaseAtExit, 'fixture-preparation');
  assert.equal(f.calls.disable, 1); assert.equal(f.calls.enable, 1); assert.equal(f.calls.layout, 1); assert.equal(f.calls.data, 2);
});

for (const issue of ['escape', 'hidden-child']) test(`physical folder ${issue} prevents recursive deletion and still restores independent state`, /** Native-looking emptiness cannot authorize an escaped or physically nonempty target. */ async () => {
  const f = cleanupFixture(1, false, issue === 'escape', issue === 'hidden-child');
  await assert.rejects(f.run(f.app, f.controller), /Owned folder physical target/);
  assert.equal(f.files.size, 0); assert.equal(f.folders.size, 1);
  assert.equal(f.controller.progress.cleaned, false);
  assert.equal(f.calls.disable, 1); assert.equal(f.calls.enable, 1);
  assert.equal(f.calls.layout, 1); assert.equal(f.calls.data, 2);
});

test('failure after warm hooks restores prototype registration and dependency wrappers', /** Exercise the late finally path after actual hook installation, before delivering any fake event. */ async () => {
  const f = cleanupFixture(99), p = f.app.plugins.plugins['k-plex'];
  const original = f.app.workspace.onLayoutReady;
  Object.setPrototypeOf(f.app.workspace, { onLayoutReady: original });
  delete f.app.workspace.onLayoutReady;
  const ensure = async () => 'ready';
  p.index.getSourceAcquisitionCounters = () => ({});
  p.index.sourceAcquisition.repository = { ensureLocalDependencies: ensure };
  const activate = p.activateView;let activations = 0;
  p.activateView = async (...args) => { if (activations++ === 0) return activate(...args); throw Error('Owned warm activation failure'); };
  let retired = 0;
  f.controller.probeFactory = () => ({ snapshot: () => ({ observed: true }), stop: () => { retired++; } });
  for (const owner of [f.app.vault, f.app.metadataCache]) {
    owner.on = () => ({}); owner.offref = () => {};
  }
  const enable = f.app.plugins.enablePlugin;
  f.app.plugins.enablePlugin = async () => { await enable(); f.app.workspace.onLayoutReady(() => {}); };
  await assert.rejects(f.run(f.app, f.controller), /Owned warm activation failure/);
  assert.equal(f.files.size, 0); assert.equal(f.folders.size, 0);
  assert.equal(f.app.workspace.onLayoutReady, original);
  assert.equal(Object.hasOwn(f.app.workspace, 'onLayoutReady'), false, 'Prototype ownership is restored');
  assert.equal(p.index.sourceAcquisition.repository.ensureLocalDependencies, ensure);
  assert.equal(retired, 1); assert.equal(f.controller.progress.observation.observed, true);
  assert.equal(f.controller.progress.cleaned, true);
});

test('native event acceptance does not force reconciliation, resolver closure or source readiness', /** Inspect actual call expressions, not string comments or helper names. */ () => {
  const forbidden = [];
  /** Native file writes and observations may schedule product work only through real host owners. */
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && ['flush', 'reconcile', 'trigger'].includes(node.expression.name.text)) forbidden.push(node.expression.getText(tree));
    ts.forEachChild(node, visit);
  }
  visit(scenario); assert.deepEqual(forbidden, []);
  assert.match(text, /Explicit disposable Small required/);
  assert.match(text, /validateTarget/);
});
