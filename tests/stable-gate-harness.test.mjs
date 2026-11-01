/** Exercise the native gate probe's actual finalizer against owned-editor/file dependencies.
 * These portable cleanup contracts do not substitute for actual Obsidian gate acceptance. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../scripts/testing/obsidian/stableGateCounts.mjs', import.meta.url), 'utf8');
const tree = ts.createSourceFile('stableGateCounts.mjs', source, ts.ScriptTarget.Latest, true);
const scenario = tree.statements.find(/** Read the shipped scenario without importing its native entry point. */ node => ts.isFunctionDeclaration(node) && node.name?.text === 'scenario');
const finalizer = scenario.body.statements.find(/** Test independent restoration from the real finally block. */ node => ts.isTryStatement(node)).finallyBlock;

/** Model a native editor that must release a document before its fixture can be removed. */
function fixture(closeFails = false, originalPath = 'Home.md') {
  const events = [], leaf = {detached: false, detach() {this.detached = true;events.push('detach');}}, editor = {closed: false};
  const files = new Map(['Owned-A.md', 'Owned-B.md'].map(/** Retain exact native fixture identities. */ path => [path, {path}]));
  const p = {sidecarLeaves: new Map([[leaf, editor]]), settings: {lastActivePath: 'Owned-A.md'}, layoutReady: true, settingsWriteQueue: Promise.resolve(),
    /** Restore ordinary prior navigation without preparing or rebuilding the index from the harness. */
    notifyNavigation(path) {assert.equal(path, originalPath);this.settings.lastActivePath = path;events.push('navigate-original');},
    /** Only the Sidecar belonging to the probe's own host may be closed. */
    async closeSidecar(host, persist) {
      assert.equal(host, leaf);assert.equal(persist, false);events.push('close-editor');
      if (closeFails) throw Error('native close failed');
      editor.closed = true;this.sidecarLeaves.delete(host);
    }};
  const c = {configRelative: '.obsidian', originalData: JSON.stringify({lastActivePath: originalPath}), originalEnabled: '["k-plex"]', progress: {}};
  const layout = {original: true};
  const app = {plugins: {plugins: {'k-plex': p}, enabledPlugins: new Set(['k-plex']),
    async disablePlugin() {events.push('disable');}, async enablePlugin() {events.push('enable');}},
  workspace: {async changeLayout(value) {assert.equal(value, layout);events.push('layout');}},
  vault: {getFileByPath: path => files.get(path), getFiles: () => [...files.values()],
    /** Refuse to erase a document while its real-world owner could still save it. */
    async delete(file) {
      assert(editor.closed, 'Native editor must close before its file is removed');assert(leaf.detached, 'Owned canvas demand must be released');
      assert.equal(p.settings.lastActivePath, originalPath, 'A retired fixture must not remain the requested scope');
      assert.equal(files.get(file.path), file);events.push('delete');files.delete(file.path);
    },
    adapter: {async write(path, value) {
      assert.equal(value, path.endsWith('data.json') ? c.originalData : c.originalEnabled);events.push(path.endsWith('data.json') ? 'data' : 'enabled-profile');
    }}}};
  const environment = {p, leaf, observer: undefined, releases: [], owned: [...files.values()], prefix: 'Owned-',
    initialFiles: 0, c, app, layout, settled: () => editor.closed && leaf.detached && p.settings.lastActivePath === originalPath,
    /** A portable guard observes the predicate; only native acceptance measures convergence. */
    until: async (read, message) => assert(read(), message), wait: async () => {}, check: assert};
  const run = new Function('environment', `return (async()=>{let {p,leaf,observer,releases,owned,prefix,initialFiles,c,app,layout,settled,until,wait,check}=environment;${finalizer.getText(tree).slice(1, -1)}})()`);
  return {run: () => run(environment), events, files, c};
}

test('gate cleanup closes its owned editor before deleting notes and restores the profile', async () => {
  const f = fixture();await f.run();
  assert.equal(f.files.size, 0);assert.equal(f.c.progress.cleanup.passed, true);
  assert(f.events.indexOf('close-editor') < f.events.indexOf('delete'));
  assert(f.events.includes('enable'));assert.equal(f.events.at(-1), 'enabled-profile');
});

test('a native editor close failure still restores layout, plugin and configuration independently', async () => {
  const f = fixture(true);await assert.rejects(f.run(), /native close failed/);
  assert.equal(f.c.progress.cleanup.passed, false);assert.equal(f.files.size, 2);
  for (const event of ['disable', 'layout', 'data', 'enable', 'enabled-profile']) assert(f.events.includes(event), event);
});

test('cleanup restores an originally empty navigation pointer without inventing a new target', async () => {
  const f = fixture(false, null);await f.run();
  assert.equal(f.files.size, 0);assert.equal(f.c.progress.cleanup.passed, true);
  assert(!f.events.includes('navigate-original'));
});
