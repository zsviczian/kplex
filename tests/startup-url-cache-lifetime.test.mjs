/** Production independent URL-cache/saved-preview lifetimes with external I/O holds and unchanged virtual watchdogs. */
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { contributorBrowserBundle } from './support/contributorBrowserFixture.mjs';

const bundle = await contributorBrowserBundle(['src/index/GraphIndex.ts', 'src/index/GraphBuilder.ts', 'src/index/IndexSnapshot.ts']);

/** Keep the real GraphIndex/cache/publication algorithms; replace only host facts and storage acquisition. */
function fixture(mode) {
  let clock = 0, token = 0;
  const timers = new Map();
  const settle = async () => { for (let n = 0; n < 100; n++) await Promise.resolve(); };
  const window = { crypto: webcrypto, performance: { now: () => 0 },
    setTimeout(callback, delay = 0) { const id = ++token; timers.set(id, { callback, at: clock + delay }); return id; },
    clearTimeout(id) { timers.delete(id); } };
  const context = vm.createContext({ window, performance: window.performance, structuredClone, URL, TextEncoder, TextDecoder, DOMException,
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
  const record = { path: file.path, mtime: file.stat.mtime, size: file.stat.size, version: 3, parserVersion: M.SOURCE_BODY_PARSER_VERSION, frontmatter: {}, urls: [], inlineFieldOccurrences: [] };
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

for (const first of ['URL', 'source']) test(`${first}-first complete parsing is shared without a foreground URL storage wait`, async () => {
  const f = fixture('eager'), i = f.index;
  let reads = 0, parses = 0;
  f.app.vault.cachedRead = async () => { reads++; return 'Status:: retained\nLink:: [label](https://example.com/shared)'; };
  const parse = i.metadataParser.parse.bind(i.metadataParser);
  i.metadataParser.parse = async (...args) => { parses++; return parse(...args); };
  i.indexedDb.getBodies = f.M.KplexIndexedDbCache.prototype.getBodies;
  i.sourceAcquisition.observeBeforeStart(f.file, true);
  try {
    const source = () => i.sourceAcquisition.readRequestedBody(f.file, () => true);
    const url = () => i.parseUrlOwnerBody(f.file, false, () => true);
    const firstBody = await (first === 'URL' ? url() : source());
    assert(firstBody);
    if (first === 'source') i.indexedDb.getBodies = async () => { throw Error('Foreground URL must not wait for optional storage'); };
    const secondBody = await (first === 'URL' ? source() : url());
    assert(secondBody);
    assert.equal(secondBody.inlineFields.status[0], 'retained', 'URL sharing retains non-URL inline fields');
    assert.equal(reads, 1); assert.equal(parses, 1);
    assert.equal(i.sourceAcquisition.state(f.file).bodyDirty, true, 'Complete parser reuse grants no source authority');
    assert.equal(i.sourceAcquisition.hasSemanticDependencies(), false);
  } finally { i.destroy(); await f.settle(); assert.equal(f.timers.size, 0); }
});

test('a complete full-build parse is available to URL work before the group publication boundary', async () => {
  const f = fixture('eager'), i = f.index, gate = deferred(), reached = deferred();
  let parses = 0, held = false, task;
  f.app.metadataCache.getFirstLinkpathDest = () => null;
  i.indexedDb.putBodies = async () => true;
  f.app.vault.cachedRead = async () => 'Status:: complete\nParent:: [[Target]]\nhttps://example.com/shared-group';
  const parse = i.metadataParser.parse.bind(i.metadataParser);
  i.metadataParser.parse = async (...args) => { parses++; return parse(...args); };
  i.sourceAcquisition.observeBeforeStart(f.file, true);
  const builder = new f.M.GraphBuilder(i.plugin, f.app, i.fieldCache, i.metadataParser, i.indexedDb,
    () => !i.diagnosticsClosed, new Map(), i.sourceAcquisition);
  const yieldToHost = builder.yieldToHost.bind(builder);
  builder.yieldToHost = async (...args) => {
    if (!held && parses > 0) { held = true; reached.resolve(); await gate.promise; }
    return yieldToHost(...args);
  };
  try {
    task = builder.build({ acquireSources: false }); await reached.promise;
    const body = await i.parseUrlOwnerBody(f.file, false, () => true);
    assert.equal(body.inlineFields.status[0], 'complete');
    assert.equal(body.inlineFields.parent[0], '[[Target]]', 'Sharing retains complete non-URL parser fields');
    assert.equal(parses, 1, 'URL work reuses the completed parse before full graph/source publication');
    assert.equal(i.sourceAcquisition.state(f.file).bodyDirty, true);
    assert.equal(i.sourceAcquisition.hasSemanticDependencies(), false);
    gate.resolve(); assert(await task);
  } finally { gate.resolve(); i.destroy(); await task; await f.settle(); assert.equal(f.timers.size, 0); }
});

for (const change of ['unchanged', 'same-stat source event', 'ctime', 'replacement', 'URL input epoch', 'caller', 'unload']) {
  test(`full-build parser admission rechecks completed input and captured lifetime: ${change}`, async () => {
    const f = fixture('eager'), i = f.index, readGate = deferred(), reached = deferred();
    let reads = 0, parses = 0, writes = 0, caller = true, task, releasePriority = () => {};
    let content = 'Status:: complete\nParent:: [[Target]]\nhttps://example.com/admission';
    f.app.metadataCache.getFirstLinkpathDest = () => null;
    f.app.vault.cachedRead = async () => {
      const captured = content;
      if (++reads === 1) { reached.resolve(); await readGate.promise; }
      return captured;
    };
    i.indexedDb.putBodies = async () => { writes++; return true; };
    // Worker submission ignores the cooperative-checkpoint argument; keep the real parser grammar.
    i.metadataParser.parse = async text => { parses++; return f.M.parseBodyMetadata(text); };
    i.sourceAcquisition.observeBeforeStart(f.file, true);
    const builder = new f.M.GraphBuilder(i.plugin, f.app, i.fieldCache, i.metadataParser, i.indexedDb,
      () => caller && !i.diagnosticsClosed, new Map(), i.sourceAcquisition,
      () => i.workScheduler.checkpoint(4));
    try {
      task = builder.build({ acquireSources: false }); await reached.promise;
      releasePriority = i.workScheduler.begin(3);
      readGate.resolve(); await f.settle();
      if (change === 'unchanged') assert.equal(parses, 0, 'P4 does not submit a parser while higher-priority work owns admission');
      if (change === 'same-stat source event') {
        i.sourceAcquisition.state(f.file).revision++;
      } else if (change === 'ctime') f.file.stat.ctime++;
      else if (change === 'replacement') {
        const replacement = new f.file.constructor(f.file.path);
        f.app.vault.getFileByPath = path => path === replacement.path ? replacement : null;
      } else if (change === 'URL input epoch') {
        const revision = i.sourceAcquisition.getFileRevision(f.file);
        i.sourceAcquisition.retireBodyInput(f.file);
        assert.equal(i.sourceAcquisition.getFileRevision(f.file), revision, 'The optional epoch leaves source observations untouched');
      } else if (change === 'caller') caller = false;
      if (change === 'unload') i.destroy();
      else if (change !== 'replacement') {
        if (change !== 'unchanged') content = 'Status:: current\nParent:: [[Target]]\nhttps://example.com/admission';
        const body = await i.parseUrlOwnerBody(f.file, false, () => true);
        assert.equal(body.inlineFields.parent[0], '[[Target]]');
      }
      releasePriority();
      const result = await task;
      if (change === 'unchanged') {
        assert(result);
        assert.equal(parses, 1, 'A current completed URL parse satisfies the earlier full-build miss');
        assert.equal(reads, 2, 'The already-admitted held native read is not counted as avoided');
        assert.equal(i.fieldCache.get(f.file.path).body.inlineFields.status[0], 'complete');
        assert.equal(i.sourceAcquisition.state(f.file).bodyDirty, true);
        assert.equal(i.sourceAcquisition.hasSemanticDependencies(), false);
      } else assert.equal(result, null, 'A newer input cannot certify the old private build lifetime');
      assert.equal(writes, 0, 'Reusing a completed input adds no full-build body-cache write');
    } finally { readGate.resolve(); releasePriority(); i.destroy(); await task; await f.settle(); assert.equal(f.timers.size, 0); }
  });
}

for (const condition of ['closed source owner', 'stale renamed binding']) {
  test(`independent URL owner settles with ${condition} without a retry spin`, async () => {
    const f = fixture('eager'), i = f.index, path = f.file.path;
    let reads = 0, calls = 0;
    f.app.vault.cachedRead = async () => { reads++; return 'https://example.com/independent'; };
    const refresh = i.refreshUrlOwner.bind(i);
    i.refreshUrlOwner = (...args) => {
      assert(++calls <= 3, 'A permanently unavailable optional source receipt cannot drive retries');
      return refresh(...args);
    };
    if (condition === 'closed source owner') i.sourceAcquisition.close();
    else {
      f.file.path = 'Renamed.md';
      f.app.vault.getFileByPath = candidate => candidate === path ? f.file : null;
    }
    try {
      const task = i.refreshUrlOwner(path, false);
      await f.advance(0); await task;
      assert.equal(calls, 1); assert.equal(i.urlOwnerTasks.size, 0);
      if (condition === 'closed source owner') {
        assert.equal(reads, 1); assert(i.urlOwners.has(path), 'URL discovery remains independent of source acquisition');
        assert.equal(i.sourceAcquisition.getBodyCacheRequest(f.file), null);
      } else {
        assert.equal(reads, 0); assert.equal(i.urlOwners.has(path), false, 'A stale native lookup is retired at admission');
      }
    } finally { i.destroy(); await f.settle(); assert.equal(f.timers.size, 0); }
  });
}

test('unrelated host resolution during a URL read preserves progress and the exact lexical receipt', async () => {
  const f = fixture('eager'), i = f.index, gate = deferred(); let entered = false;
  f.app.vault.cachedRead = async () => { entered = true; await gate.promise; return 'Status:: complete\nhttps://example.com/host-drift'; };
  try {
    const task = i.parseUrlOwnerBody(f.file, false, () => true);
    await f.settle(); assert(entered);
    i.sourceAcquisition.hostRevision++;
    gate.resolve();
    const body = await task;
    assert.equal(body.inlineFields.status[0], 'complete');
    assert(i.sourceAcquisition.getBodyCacheRequest(f.file)?.inputToken);
    assert.equal(i.sourceAcquisition.hasSemanticDependencies(), false);
  } finally { gate.resolve(); i.destroy(); await f.settle(); assert.equal(f.timers.size, 0); }
});

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
    assert.equal(f.catalogReads(), 1, 'Graph catalog starts independently of held URL replay');
    if (held !== 'page') assert.equal(i.urlPendingPublications, 1);
    if (held === 'compiler') assert.equal(i.getWorkPriorityDiagnostics().active[3], 2, 'Cache compiler and discovery own separate leases');
    await f.advance(89999); assert.equal(settled, mode === 'on-demand', 'Finite no-cache preview does not join URL inventory; Eager recovery retains its own task');
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
    const catalogs = f.catalogReads(); assert.equal(catalogs, 1, 'Independent graph catalog starts before retirement');
    if (retirement === 'destroy') i.destroy(); else await i.purgePersistentIndexCache();
    await f.settle(); assert.equal(settled, true); assert.equal((await restore).restored, false);
    assert.equal(await shared, false); assert.equal(await discovery, false);
    assert.equal(f.catalogReads(), catalogs); assert.equal(f.timers.size, 0);
    const diagnostics = JSON.stringify(i.getSnapshotHydrationDiagnostics());
    gate.resolve(); await f.settle(); await f.advance(100000);
    assert.equal(f.catalogReads(), catalogs, 'Late URL I/O cannot start another catalog'); assert.equal(i.urlOwners.size, 0);
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
    const f = fixture(mode), i = f.index, gate = deferred(), catalogGate = deferred(); let reads = 0, oldSettled = false, newSettled = false;
    i.indexedDb.readUrlOwnerPage = async () => { reads++; await gate.promise; return { values: [], exhausted: true }; };
    const catalog = i.indexedDb.readSnapshotCatalog;
    i.indexedDb.readSnapshotCatalog = /** Hold the completed read; retiring a graph request leaves shared URL work healthy. */ async function(...args) {
      const result = await catalog.apply(this, args); await catalogGate.promise; return result;
    };
    const shared = i.restoreUrlIndex(); await f.settle(); assert.equal(reads, 1, 'URL I/O entered before P1 catalog ownership');
    const previous = i.restorePersistedSnapshot().then(value => { oldSettled = true; return value; });
    await f.settle();
    const latest = i.restorePersistedSnapshot().then(value => { newSettled = true; return value; });
    await f.settle(); assert.equal(oldSettled, true); assert.equal((await previous).restored, false);
    assert.equal(newSettled, false); assert.equal(reads, 1); assert.equal(i.restoreUrlIndex(), shared);
    assert.equal(f.catalogReads(), 2, 'Each graph request owns an independent catalog attempt');
    catalogGate.resolve(); await f.settle();
    assert.equal(newSettled, true, 'No-cache classification finishes with URL gate still unresolved');
    gate.resolve(); await f.settle(); await latest;
    assert.equal(f.catalogReads(), 2); assert.equal(i.getIndexDiagnostics().some(d => d.reason === 'url-cache-stalled'), false);
    i.destroy(); await f.settle(); assert.equal(f.timers.size, 0);
  });
}
