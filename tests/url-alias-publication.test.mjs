/** URL owner alias deltas match an independent legacy oracle and preserve atomic source/task boundaries. */
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { MessageChannel } from 'node:worker_threads';
import { webcrypto } from 'node:crypto';
import { contributorBrowserBundle } from './support/contributorBrowserFixture.mjs';
const bundle = await contributorBrowserBundle(['src/index/GraphIndex.ts', 'src/adapters/obsidian/urlIdentity.ts', 'src/index/ForegroundWorkScheduler.ts']);

/** Real repository/compiler/cache owners, with controlled native files and controllable CPU clock only. */
function fixture() {
  let ticks = false, clock = 0;
  const w = { performance: { now: () => ticks ? clock += 8 : 0 }, MessageChannel, crypto: webcrypto, setTimeout, clearTimeout };
  vm.runInContext(bundle, vm.createContext({ window: w, performance: w.performance, URL, Date, TextEncoder, TextDecoder, structuredClone, setTimeout, clearTimeout }));
  const M = w.sourceModules, files = new Map(), metadata = new Map(), root = new w.ContributorFolder(), reads = [];
  const events = { on: () => ({}), offref() {} };
  const app = { saveLocalStorage() {}, vault: { ...events, getName: () => 'url-alias-delta', getFileByPath: p => files.get(p) ?? null,
    getFiles: () => [...files.values()], getMarkdownFiles: () => [...files.values()], getRoot: () => root, getFolderByPath: p => p === '' ? root : null,
    cachedRead: async file => { reads.push(file.path); return ''; } }, metadataCache: { ...events, getFileCache: f => metadata.get(f.path) ?? null, resolvedLinks: {}, unresolvedLinks: {} } };
  const settings = { indexingMode: 'on-demand', hierarchy: { hidden: [], parents: [], children: [], leftFriends: [], rightFriends: [], previous: [], next: [], exclusions: [] },
    inferAllLinksAsFriends: false, inverseInfer: false, showFullTagName: true, tagStyleList: [], baseNodeStyle: { maxLabelLength: 30 }, maxItemCount: 30,
    pinnedNodes: [], excludeFilepaths: [], nameFields: '', noteTypeField: 'Type', primaryTagField: 'Style' };
  const index = new M.GraphIndex({ app, settings, getIndexSourceRevision: () => 0 }, app);
  index.indexedDb.putUrlOwners = async () => true;
  /** Native source identities feed actual canonical publication. */
  const add = (path, text = '') => {
    let file = files.get(path);
    if (!file) { file = new w.ContributorFile(path); file.parent = root; root.children.push(file); files.set(path, file); metadata.set(path, { frontmatter: {} }); }
    return { file, body: M.parseBodyMetadata(text) };
  };
  /** Minimal canonical page facts suffice when directly testing private alias stages without graph mutation. */
  const page = target => {
    if (!index.urlState.pages.has(target)) index.urlState.pages.set(target, { path: target, url: target, name: target, aliases: [], neighbours: new Map(), file: null });
    return index.urlState.pages.get(target);
  };
  return { M, index, add, page, window: w, files, metadata, reads, advanceClock: () => { ticks = true; }, close: () => index.destroy() };
}

/** Hold exactly one real task dispatch, restoring native channels before subsequent compiler slices. */
function holdNextHostTask(f) {
  const original = f.window.MessageChannel;
  let entered, deliver, posted = 0, closed = 0;
  const reached = new Promise(resolve => { entered = resolve; });
  /** Task transport double controls dispatch only; production lifetime and CPU work stay intact. */
  class HeldChannel {
    /** Expose the two disposable ports consumed by the actual host continuation helper. */
    constructor() {
      this.port1 = { onmessage: null, onmessageerror: null, close: () => { closed++; } };
      this.port2 = { onmessage: null, onmessageerror: null, close: () => { closed++; },
        postMessage: () => { posted++; deliver = () => this.port1.onmessage?.(); entered(); } };
    }
  }
  f.window.MessageChannel = HeldChannel;
  return { reached, get posted() { return posted; }, get closed() { return closed; },
    /** Delivery resumes only after native transport is restored, keeping later slices independent. */
    release() { f.window.MessageChannel = original; deliver?.(); },
  };
}

/** Independent old algorithm: clone contributors, delete→reinsert owner, then ordered unique flatten. */
function legacyOracle() {
  const contributors = new Map(), targetsByOwner = new Map();
  return {
    contributors, targetsByOwner,
    /** Controlled inputs use canonical targets; canonicalization cases assert explicit expected paths separately. */
    apply(owner, references) {
      const next = new Map();
      for (const target of targetsByOwner.get(owner) ?? []) { const map = new Map(contributors.get(target)); map.delete(owner); next.set(target, map); }
      for (const reference of references) {
        const map = next.get(reference.url) ?? new Map(contributors.get(reference.url));
        map.set(owner, [...new Set([...(map.get(owner) ?? []), ...(reference.label ? [reference.label] : []), ...(reference.aliases ?? [])])]); next.set(reference.url, map);
      }
      const targets = new Set(), facets = new Map();
      for (const [target, map] of next) {
        if (map.has(owner)) targets.add(target);
        if (map.size) contributors.set(target, map); else contributors.delete(target);
        const aliases = [...new Set([...map.values()].flat())]; facets.set(target, { aliases, name: aliases[0] ?? target });
      }
      if (targets.size) targetsByOwner.set(owner, targets); else targetsByOwner.delete(owner);
      return facets;
    },
  };
}

/** Preserve contributor insertion order and record arrays, rather than comparing only sorted labels. */
function stateValue(index) {
  return JSON.parse(JSON.stringify({ owners: [...index.urlAliasOwners].map(([target, map]) => [target, [...map]]),
    targets: [...index.urlOwnerTargets].map(([owner, targets]) => [owner, [...targets]]),
    facets: [...index.urlAliasFacets].map(([target, facet]) => [target, facet.aliases, [...facet.labels]]),
    pages: [...index.urlState.pages].map(([target, page]) => [target, page.name, page.aliases]) }));
}

/** Apply only the production private stage/commit and compare every affected facet with the old owner model. */
async function apply(f, oracle, owner, references) {
  for (const reference of references) f.page(reference.url);
  const prepared = await f.index.prepareUrlAliasOwners(owner, references, () => true); assert(prepared);
  const expected = oracle.apply(owner, references);
  // Canonical compilation may replace the private page aliases between stage and commit.
  for (const target of prepared.keys()) { const page = f.page(target); page.aliases = ['compiler-mutated']; page.name = 'compiler-mutated'; }
  f.index.publishUrlAliasOwners(owner, prepared);
  for (const [target, facet] of expected) { const page = f.page(target); assert.deepEqual([...page.aliases], facet.aliases); assert.equal(page.name, facet.name); }
  assert.deepEqual(JSON.parse(JSON.stringify([...f.index.urlAliasOwners].map(([target, map]) => [target, [...map]]))), [...oracle.contributors].map(([target, map]) => [target, [...map]]));
  assert.deepEqual(JSON.parse(JSON.stringify([...f.index.urlOwnerTargets].map(([owner, targets]) => [owner, [...targets]]))), [...oracle.targetsByOwner].map(([owner, targets]) => [owner, [...targets]]));
}

test('delta publication matches independent legacy alias order for empty/duplicate/replaced/removed/reinserted owners', async () => {
  const f = fixture(), oracle = legacyOracle(), target = 'https://shared.example/item', other = 'https://shared.example/other';
  try {
    for (const [owner, references] of [
      ['NoLinks.md', []],
      ['Empty.md', [{ url: target }]],
      ['A.md', [{ url: target, label: 'winner', aliases: ['duplicate', 'winner', ''] }, { url: target, label: 'second', aliases: ['duplicate'] }, { url: other, label: 'other' }]],
      ['B.md', [{ url: target, label: 'winner', aliases: ['third', 'duplicate'] }]],
      ['A.md', [{ url: target, label: 'replacement', aliases: ['third'] }]],
      ['B.md', []], ['A.md', []], ['Empty.md', []],
      ['B.md', [{ url: target, label: 'reinserted' }]],
      ['C.md', [{ url: target }]], ['B.md', []], ['C.md', []],
    ]) await apply(f, oracle, owner, references);
    assert.equal(f.index.urlAliasOwners.size, 0); assert.equal(f.index.urlOwnerTargets.size, 0); assert.equal(f.index.urlAliasFacets.size, 0);
  } finally { f.close(); }
});

test('new append never copies or flattens contributor collections; duplicate labels reuse authoritative facet array and Set', async () => {
  const f = fixture(), target = 'https://shared.example/item';
  try {
    f.page(target);
    const first = await f.index.prepareUrlAliasOwners('Owner0', [{ url: target, label: 'same' }], () => true);
    f.index.publishUrlAliasOwners('Owner0', first);
    const contributors = f.index.urlAliasOwners.get(target), facet = f.index.urlAliasFacets.get(target); let visits = 0;
    for (const key of [Symbol.iterator, 'entries', 'values', 'forEach']) contributors[key] = () => { visits++; throw new Error('Existing contributor traversal forbidden'); };
    for (let n = 1; n < 1500; n++) {
      const prepared = await f.index.prepareUrlAliasOwners(`Owner${n}`, [{ url: target, label: 'same' }], () => true);
      f.index.publishUrlAliasOwners(`Owner${n}`, prepared);
      assert.equal(f.index.urlAliasOwners.get(target), contributors, 'No contributor-map copy for any append');
      assert.equal(f.index.urlAliasFacets.get(target).aliases, facet.aliases, 'Repeated label output stays shared');
      assert.equal(f.index.urlAliasFacets.get(target).labels, facet.labels, 'Membership set stays shared');
    }
    const beforeArray = facet.aliases, beforeSet = facet.labels;
    const prepared = await f.index.prepareUrlAliasOwners('New', [{ url: target, label: 'same', aliases: ['same'] }], () => true);
    assert.equal(prepared.get(target).appendAliases, beforeArray); assert.equal(visits, 0);
    f.page(target).aliases = ['compiler-only'];
    f.index.publishUrlAliasOwners('New', prepared);
    assert.equal(f.page(target).aliases, beforeArray); assert.equal(f.index.urlAliasFacets.get(target).labels, beforeSet); assert.equal(visits, 0);
    const different = await f.index.prepareUrlAliasOwners('Different', [{ url: target, label: 'new' }], () => true);
    assert.notEqual(different.get(target).appendAliases, beforeArray);
    f.index.publishUrlAliasOwners('Different', different);
    assert.deepEqual([...f.page(target).aliases], ['same', 'new']); assert.deepEqual([...beforeArray], ['same']); assert.equal(visits, 0);
  } finally { f.close(); }
});

test('prepared label membership and aliases remain private until commit, including cancelled many-target final derivation', async () => {
  const f = fixture(), oracle = legacyOracle(), target = 'https://shared.example/item';
  try {
    await apply(f, oracle, 'A', [{ url: target, label: 'old' }]);
    const before = stateValue(f.index), oldSet = f.index.urlAliasFacets.get(target).labels;
    const prepared = await f.index.prepareUrlAliasOwners('B', [{ url: target, label: 'new' }], () => true);
    assert.deepEqual(stateValue(f.index), before); assert.equal(oldSet.has('new'), false);
    assert(prepared); f.advanceClock();
    let calls = 0, alive = true; const original = f.index.workScheduler.checkpoint;
    const references = Array.from({ length: 640 }, (_, n) => ({ url: `https://many.example/${n}`, label: `label${n}` }));
    f.index.workScheduler.checkpoint = async (...args) => { calls++; if (calls > 1 + 640 / 32) alive = false; return original.apply(f.index.workScheduler, args); };
    assert.equal(await f.index.prepareUrlAliasOwners('Cancelled', references, () => alive, f.M.INDEX_WORK_PRIORITY.visibleNeighborhood), null);
    assert(calls > 1 + 640 / 32, 'Cancellation happens in final materialization after all reference slices');
    assert.deepEqual(stateValue(f.index), before); assert.equal(oldSet.has('new'), false);
  } finally { f.close(); }
});

test('canonical URLs and repeated unlabeled append restore facets after real compiler publication without mutating displayed snapshots', async () => {
  const f = fixture();
  try {
    const a = f.add('A.md', '[Winning](https://SHARED.example:443/)'); await f.index.publishUrlOwner(a.file, a.body, 0, undefined, true);
    f.index.flushUrlPublication();
    const target = 'https://shared.example', displayed = f.index.publishedUrlState.pages.get(target), aliases = [...displayed.aliases];
    const authoritative = f.index.urlAliasFacets.get(target).aliases;
    const b = f.add('B.md', 'https://shared.example/'); await f.index.publishUrlOwner(b.file, b.body, 0, undefined, true);
    assert.equal(f.index.urlState.pages.get(target).aliases, authoritative);
    assert.deepEqual([...f.index.urlState.pages.get(target).aliases], ['Winning']); assert.equal(f.index.urlState.pages.get(target).name, 'Winning');
    assert.deepEqual([...displayed.aliases], aliases); assert.equal(displayed.name, 'Winning');
    f.index.flushUrlPublication(); assert.deepEqual([...f.index.publishedUrlState.pages.get(target).aliases], ['Winning']);
    assert.notEqual(f.index.publishedUrlState.pages.get(target).aliases, authoritative);
  } finally { f.close(); }
});

test('destroy and persistent purge release aggregate facet state and reject late prepared commits through production fences', async () => {
  for (const stop of ['destroy', 'purge']) {
    const f = fixture();
    try {
      const a = f.add('A.md', '[Winning](https://shared.example/item)'); await f.index.publishUrlOwner(a.file, a.body, 0, undefined, true);
      assert(f.index.urlAliasFacets.size);
      const b = f.add('B.md', '[Late](https://shared.example/item)'), original = f.index.prepareUrlAliasOwners;
      let entered; const started = new Promise(resolve => { entered = resolve; }); let resume; const gate = new Promise(resolve => { resume = resolve; });
      f.index.prepareUrlAliasOwners = async function(...args) { const result = await original.apply(this, args); entered(); await gate; return result; };
      const task = f.index.publishUrlOwner(b.file, b.body, 0, undefined, true); await started;
      if (stop === 'destroy') f.index.destroy();
      else { f.index.indexedDb.purgeAndClose = async () => true; assert(await f.index.purgePersistentIndexCache()); }
      assert.equal(f.index.urlAliasFacets.size, 0); resume(); await task;
      assert.equal(f.index.urlAliasFacets.size, 0); assert.equal(f.index.urlAliasOwners.get('https://shared.example/item')?.has('B.md') ?? false, false);
    } finally { f.close(); }
  }
});

test('atomic source publication finishes search and notification before its independent URL CPU turn', async () => {
  const f = fixture(); let held, unsubscribe;
  try {
    const a = f.add('A.md', 'https://old.example/item');
    await f.index.publishUrlOwner(a.file, a.body, 0);
    const previousPage = f.index.urlState.pages.get('A.md'); assert(previousPage);
    f.index.state.pages.set('A.md', previousPage);
    const current = f.M.parseBodyMetadata('[Current](https://new.example/item)');
    a.file.stat.mtime++; f.index.fieldCache.set('A.md', { mtime: a.file.stat.mtime, body: current });
    let prepared = 0, notifications = 0;
    const prepare = f.index.prepareUrlAliasOwners;
    /** Count actual independent derivation; forwarding retains all alias and compiler contracts. */
    f.index.prepareUrlAliasOwners = function (...args) { prepared++; return prepare.apply(this, args); };
    unsubscribe = f.index.subscribe(() => { notifications++; });
    held = holdNextHostTask(f);
    let committed = false;
    f.index.publishIncrementalFile({ sourcePath: 'A.md', touchedPagePaths: new Set(['A.md']), semanticChanged: true },
      /** Real publisher owns the one synchronous prepared-state application. */
      () => { committed = true; f.index.state.pages.set('A.md', { ...previousPage, neighbours: new Map(previousPage.neighbours) }); });
    const task = f.index.urlOwnerTasks.get('A.md'); assert(task, 'URL task is registered synchronously');
    assert(committed); assert.equal(notifications, 1);
    assert.equal(f.index.searchEntryByPath.get('A.md').page, f.index.state.pages.get('A.md'));
    assert.equal(f.index.urlOwners.has('A.md'), false, 'Old URL authority retires inside source commit');
    assert.equal(f.index.refreshUrlOwner('A.md', false), task, 'A concurrent refresh joins the registered owner');
    await held.reached;
    assert.equal(held.posted, 1); assert.equal(prepared, 0, 'No URL derivation shares the source turn');
    assert.equal(f.index.urlReadActive, 1, 'Native read admission remains reserved during the release');
    assert.equal(f.index.workScheduler.diagnostics().active.reduce((sum, count) => sum + count, 0), 0,
      'Independent task boundary holds no semantic scheduler lease');
    held.release(); await task;
    assert.equal(held.closed, 2, 'Both transient ports close');
    assert.equal(prepared, 1); assert.deepEqual(f.reads, [], 'Exact acquired body needs no new native read');
    assert.equal(f.index.urlReadActive, 0); assert.equal(f.index.urlOwnerTasks.size, 0);
    assert(f.index.publishedUrlState.pages.has('https://new.example/item'));
    assert.equal(f.index.urlAliasFacets.get('https://new.example/item').aliases[0], 'Current');
  } finally { held?.release(); unsubscribe?.(); f.close(); }
});

test('source-publication URL task rechecks revision, identity, event, purge and unload after release', async () => {
  for (const invalidation of ['revision', 'identity', 'event', 'purge', 'destroy']) {
    const f = fixture(); let held;
    try {
      const a = f.add('A.md', '[Stale](https://stale.example/item)');
      const revision = { mtime: a.file.stat.mtime, size: a.file.stat.size };
      let stalePreparations = 0;
      const prepare = f.index.prepareUrlAliasOwners;
      /** Automatic retries may prepare current facts, but cannot derive the captured stale body. */
      f.index.prepareUrlAliasOwners = function (owner, urls, ...args) {
        if (urls.some(reference => reference.url === 'https://stale.example/item')) stalePreparations++;
        return prepare.call(this, owner, urls, ...args);
      };
      held = holdNextHostTask(f);
      const task = f.index.refreshUrlOwner('A.md', false, undefined, { file: a.file, body: a.body, revision }, false, true);
      await held.reached;
      assert.equal(stalePreparations, 0);
      if (invalidation === 'revision') a.file.stat.mtime++;
      else if (invalidation === 'identity') f.files.set('A.md', new f.window.ContributorFile('A.md'));
      else if (invalidation === 'event') f.index.urlOwnerEvents.set('A.md', 1);
      else if (invalidation === 'purge') { f.index.indexedDb.purgeAndClose = async () => true; assert(await f.index.purgePersistentIndexCache()); }
      else f.index.destroy();
      held.release(); await task;
      while (f.index.urlOwnerTasks.size) await Promise.all([...f.index.urlOwnerTasks.values()]);
      assert.equal(stalePreparations, 0, `${invalidation} rejects derivation before private staging`);
      assert.equal(f.index.urlAliasFacets.has('https://stale.example/item'), false);
      assert.equal(f.index.publishedUrlState.pages.has('https://stale.example/item'), false);
      assert.equal(f.index.urlReadActive, 0); assert.equal(held.closed, 2);
    } finally { held?.release(); f.close(); }
  }
});
