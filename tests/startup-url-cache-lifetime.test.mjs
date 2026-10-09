/** Production URL-cache/public startup lifetimes with controlled external I/O and a virtual watchdog clock. */
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { contributorBrowserBundle } from './support/contributorBrowserFixture.mjs';

const bundle = await contributorBrowserBundle(['src/index/GraphIndex.ts', 'src/index/IndexSnapshot.ts']);

/** Keep the real GraphIndex/cache/publication algorithms; replace only host facts and storage acquisition. */
function fixture(mode) {
  let clock = 0, token = 0;
  const timers = new Map();
  const settle = async () => { for (let n = 0; n < 100; n++) await Promise.resolve(); };
  const window = { crypto: webcrypto, performance: { now: () => 0 },
    setTimeout(callback, delay = 0) { const id = ++token; timers.set(id, { callback, at: clock + delay }); return id; },
    clearTimeout(id) { timers.delete(id); } };
  const context = vm.createContext({ window, performance: window.performance, structuredClone, URL, TextEncoder, TextDecoder,
    Date: class extends Date { static now() { return clock; } }, setTimeout: window.setTimeout, clearTimeout: window.clearTimeout });
  vm.runInContext(bundle, context);
  const M = window.sourceModules, file = new window.ContributorFile('Owned.md'), root = new window.ContributorFolder();
  root.children = [file]; file.parent = root;
  const metadata = { frontmatter: {} }, files = [file];
  const events = { on: () => ({}), offref() {} };
  const app = { saveLocalStorage() {}, vault: { ...events, getName: () => 'url-lifetime', getFileByPath: path => files.find(f => f.path === path) ?? null,
    getMarkdownFiles: () => files, getFiles: () => files, getRoot: () => root, getFolderByPath: path => path === '' ? root : null,
    cachedRead: async () => '' }, metadataCache: { ...events, getFileCache: () => metadata, resolvedLinks: {}, unresolvedLinks: {} } };
  const settings = { indexingMode: mode, hierarchy: { hidden: [], parents: [], children: [], leftFriends: [], rightFriends: [], previous: [], next: [], exclusions: [] },
    inferAllLinksAsFriends: false, inverseInfer: false, showFullTagName: true,
    tagStyleList: [], baseNodeStyle: { maxLabelLength: 30 }, maxItemCount: 30, pinnedNodes: [], excludeFilepaths: [], nameFields: '', noteTypeField: 'Type', primaryTagField: 'Style' };
  const index = new M.GraphIndex({ app, settings, getIndexSourceRevision: () => 0 }, app);
  let catalogReads = 0;
  index.indexedDb.open = async () => ({});
  index.indexedDb.readSnapshotCatalog = async () => { catalogReads++; return { available: false, active: null, checkpoint: null, invalidActive: false, invalidCheckpoint: false }; };
  index.indexedDb.readIndexDiagnostics = async () => [];
  index.indexedDb.sources.headPage = async () => ({ available: false, heads: [], next: null, invalid: 0 });
  index.indexedDb.getBodies = async () => new Map();
  index.indexedDb.putUrlOwners = async () => true;
  index.indexedDb.purgeAndClose = async () => true;
  assert.equal(index.indexedDb.readUrlOwners, M.KplexIndexedDbCache.prototype.readUrlOwners);
  /** Drain actual scheduled callbacks through a bounded virtual clock; CPU time stays independent. */
  const advance = async delta => {
    const end = clock + delta; let count = 0;
    while (true) {
      const next = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      assert(++count < 10000, 'Virtual timer processing remains bounded');
      clock = next[1].at; timers.delete(next[0]); next[1].callback(); await settle();
    }
    clock = end; await settle();
  };
  const record = { path: file.path, mtime: file.stat.mtime, size: file.stat.size, version: 3, parserVersion: 3, frontmatter: {}, urls: [], inlineFieldOccurrences: [] };
  return { index, app, settings, M, file, record, settle, advance, timers, performance: window.performance, catalogReads: () => catalogReads };
}

for (const phase of ['catalog', 'preview']) for (const retirement of ['timeout', 'destroy', 'supersession']) {
  test(`on-demand: finite ${phase} ${retirement} settles and fences its late continuation`, async () => {
    const f = fixture('on-demand'), i = f.index, gate = deferred(); let entered = false, settled = false;
    i.indexedDb.readUrlOwnerPage = async () => ({ values: [], exhausted: true });
    assert.equal(await i.restoreUrlIndex(), true);
    if (phase === 'catalog') i.indexedDb.readSnapshotCatalog = async () => { entered = true; await gate.promise; return { available: false, active: null, checkpoint: null }; };
    else {
      i.indexedDb.readSnapshotCatalog = async () => ({ available: true, active: { schema: 3, key: 'active', generation: 'owned', createdAt: 1,
        vaultSignature: f.M.computeVaultSignature(f.app), settingsSignature: f.M.computeIndexSettingsSignature(f.settings) }, checkpoint: null });
      i.indexedDb.getPages = async () => { entered = true; await gate.promise; return new Map(); };
    }
    const restore = i.restorePersistedSnapshot([f.file.path]).then(value => { settled = true; return value; });
    await f.settle(); assert(entered); assert.equal(i.hasPendingSnapshotHydration(), true);
    if (retirement === 'timeout') { await f.advance(89999); assert.equal(settled, false); await f.advance(1); }
    else if (retirement === 'destroy') i.destroy();
    else { i.indexedDb.readSnapshotCatalog = async () => ({ available: false, active: null, checkpoint: null }); await i.restorePersistedSnapshot(); }
    await f.settle(); assert.equal(settled, true); assert.equal((await restore).restored, false);
    assert.equal(i.hasPendingSnapshotHydration(), false);
    const state = i.state, diagnostics = JSON.stringify(i.getSnapshotHydrationDiagnostics());
    gate.resolve(); await f.settle(); await f.advance(100000);
    assert.equal(i.state, state); assert.equal(JSON.stringify(i.getSnapshotHydrationDiagnostics()), diagnostics);
    assert.deepEqual(Array.from(i.getWorkPriorityDiagnostics().active), [0, 0, 0, 0, 0]);
    i.destroy(); await f.settle(); assert.equal(f.timers.size, 0);
  });
}

/** External promises deliberately cannot be aborted; their late callbacks still execute. */
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }

for (const mode of ['eager', 'on-demand']) {
  for (const held of ['page', 'publication', 'compiler']) test(`${mode}: inactive cached URL ${held} releases startup, discovery and late work`, async () => {
    const f = fixture(mode), gate = deferred(); let entered = false, settled = false;
    const i = f.index;
    i.indexedDb.readUrlOwnerPage = async () => { entered = true; if (held === 'page') await gate.promise; return { values: [f.record], exhausted: true }; };
    if (held === 'publication') i.urlPublicationLane = gate.promise;
    if (held === 'compiler') {
      f.record.urls = f.M.parseBodyMetadata('https://cache.example').urls;
      const aliases = i.prepareUrlAliasOwners;
      i.prepareUrlAliasOwners = async function(...args) { await gate.promise; return aliases.apply(this, args); };
    }
    const restore = i.restorePersistedSnapshot([f.file.path]).then(value => { settled = true; return value; });
    const discovery = i.startBackgroundUrlIndex();
    await f.settle(); assert(entered);
    if (held !== 'page') assert.equal(i.urlPendingPublications, 1);
    if (held === 'compiler') assert.equal(i.getWorkPriorityDiagnostics().active[3], 2, 'Cache compiler and discovery own separate leases');
    await f.advance(89999); assert.equal(settled, false);
    await f.advance(1); assert.equal(settled, true);
    assert.equal((await restore).restored, false); assert.equal(f.catalogReads(), 1);
    assert.equal(i.hasPendingSnapshotHydration(), false);
    assert.equal(i.getIndexDiagnostics().filter(d => d.reason === 'url-cache-stalled').length, 1);
    assert.equal(await discovery, true, 'Uncached discovery passes abandoned cache publication');
    assert.equal(i.getUrlIndexProgress().complete, true);
    assert.equal(i.urlOwners.size, 1);
    const owner = i.urlOwners.get(f.file.path), restored = i.urlRestoredOwners;
    gate.resolve(); await f.settle();
    assert.equal(i.urlOwners.get(f.file.path), owner, 'Late cached owner cannot replace discovered owner');
    assert.equal(i.urlRestoredOwners, restored);
    assert.equal(i.get('https://cache.example'), undefined, 'Late cache compiler cannot add stale URL semantics');
    assert.equal(i.urlPendingPublications, 0);
    assert.deepEqual(Array.from(i.getWorkPriorityDiagnostics().active), [0, 0, 0, 0, 0]);
    i.destroy(); await f.settle(); assert.equal(f.timers.size, 0);
  });

  for (const retirement of ['destroy', 'purge']) test(`${mode}: ${retirement} settles shared/public waits before external URL I/O`, async () => {
    const f = fixture(mode), gate = deferred(), i = f.index;
    i.indexedDb.readUrlOwnerPage = async () => { await gate.promise; return { values: [f.record], exhausted: true }; };
    let settled = false;
    const restore = i.restorePersistedSnapshot([f.file.path]).then(value => { settled = true; return value; });
    const shared = i.restoreUrlIndex(), discovery = i.startBackgroundUrlIndex();
    await f.settle();
    if (retirement === 'destroy') i.destroy(); else await i.purgePersistentIndexCache();
    await f.settle(); assert.equal(settled, true); assert.equal((await restore).restored, false);
    assert.equal(await shared, false); assert.equal(await discovery, false);
    assert.equal(f.catalogReads(), 0); assert.equal(f.timers.size, 0);
    const diagnostics = JSON.stringify(i.getSnapshotHydrationDiagnostics());
    gate.resolve(); await f.settle(); await f.advance(100000);
    assert.equal(f.catalogReads(), 0); assert.equal(i.urlOwners.size, 0);
    assert.equal(JSON.stringify(i.getSnapshotHydrationDiagnostics()), diagnostics);
    i.destroy();
  });

  test(`${mode}: completed URL pages/owners renew inactivity beyond total 90 seconds`, async () => {
    const f = fixture(mode), i = f.index, first = deferred(), second = deferred(); let reads = 0;
    i.indexedDb.readUrlOwnerPage = async () => { const page = ++reads; await (page === 1 ? first.promise : second.promise); return { values: page === 1 ? [f.record] : [], exhausted: page === 2, lastKey: 'Owned.md' }; };
    let settled = false; const restore = i.restoreUrlIndex().then(value => { settled = true; return value; });
    await f.advance(60000); first.resolve(); await f.settle(); assert.equal(reads, 2);
    assert.equal(i.urlRestoredOwners, 1);
    await f.advance(60000); assert.equal(settled, false, 'Completed work extends the inactivity window');
    second.resolve(); await f.settle(); assert.equal(await restore, true);
    assert.equal(i.getIndexDiagnostics().some(d => d.reason === 'url-cache-stalled'), false);
    i.destroy(); await f.settle(); assert.equal(f.timers.size, 0);
  });

  test(`${mode}: repeating a real completed alias prefix cannot renew inactivity forever`, async () => {
    const f = fixture(mode), i = f.index, attempts = [];
    let cpu = 0, settled = false;
    f.performance.now = () => cpu;
    f.record.urls = f.M.parseBodyMetadata(Array.from({ length: 32 }, (_, n) => `https://cache.example/${n}`).join(' ')).urls;
    i.indexedDb.readUrlOwnerPage = async () => ({ values: [f.record], exhausted: true });
    const aliases = i.prepareUrlAliasOwners;
    /** Real completed alias slices precede a controlled host policy change, forcing the same retry. */
    i.prepareUrlAliasOwners = async function(...args) {
      const references = args[1];
      /** Account CPU only for processed alias records, never scheduler polling. */
      args[1] = (function* () { for (const reference of references) { cpu++; yield reference; } })();
      const prepared = await aliases.apply(this, args);
      const gate = deferred(); attempts.push(gate);
      await gate.promise;
      this.semanticPolicyRevision++;
      return prepared;
    };
    const restore = i.restoreUrlIndex().then(value => { settled = true; return value; });
    await f.settle(); await f.advance(1000); assert.equal(attempts.length, 1);
    for (let n = 0; n < 2; n++) {
      await f.advance(30000); assert.equal(settled, false);
      attempts[n].resolve(); await f.settle(); await f.advance(1000);
      assert.equal(attempts.length, n + 2, 'Real policy supersession retries private compilation');
    }
    await f.advance(35000); assert.equal(await restore, false);
    assert.equal(i.getIndexDiagnostics().filter(d => d.reason === 'url-cache-stalled').length, 1);
    attempts.at(-1).resolve(); await f.settle(); await f.advance(1000);
    assert.equal(i.urlOwners.size, 0);
    assert.deepEqual(Array.from(i.getWorkPriorityDiagnostics().active), [0, 0, 0, 0, 0]);
    i.destroy(); await f.settle(); assert.equal(f.timers.size, 0);
  });

  test(`${mode}: superseded public wait settles while the newest shares healthy URL acquisition`, async () => {
    const f = fixture(mode), i = f.index, gate = deferred(); let reads = 0, oldSettled = false, newSettled = false;
    i.indexedDb.readUrlOwnerPage = async () => { reads++; await gate.promise; return { values: [], exhausted: true }; };
    const previous = i.restorePersistedSnapshot().then(value => { oldSettled = true; return value; });
    await f.settle(); const shared = i.restoreUrlIndex();
    const latest = i.restorePersistedSnapshot().then(value => { newSettled = true; return value; });
    await f.settle(); assert.equal(oldSettled, true); assert.equal((await previous).restored, false);
    assert.equal(newSettled, false); assert.equal(reads, 1); assert.equal(i.restoreUrlIndex(), shared);
    gate.resolve(); await f.settle(); await latest;
    assert.equal(f.catalogReads(), 1); assert.equal(i.getIndexDiagnostics().some(d => d.reason === 'url-cache-stalled'), false);
    i.destroy(); await f.settle(); assert.equal(f.timers.size, 0);
  });
}
