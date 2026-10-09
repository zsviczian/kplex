/** Canonical private evidence delta consumption and production URL publication/privacy regressions. */
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { MessageChannel } from 'node:worker_threads';
import { webcrypto } from 'node:crypto';
import { contributorBrowserBundle } from './support/contributorBrowserFixture.mjs';

const bundle = await contributorBrowserBundle(['src/index/GraphIndex.ts', 'src/index/GraphBuilder.ts', 'src/core/graph/evidence.ts', 'src/core/graph/relations.ts']);
/** Keep real graph/cache/compiler owners; only native Vault facts are controlled. */
function fixture() {
  const w = { performance: { now: () => 0 }, MessageChannel, crypto: webcrypto, setTimeout, clearTimeout };
  vm.runInContext(bundle, vm.createContext({ window: w, performance: w.performance, URL, Date, TextEncoder, TextDecoder, structuredClone, setTimeout, clearTimeout }));
  const M = w.sourceModules, files = new Map(), metadata = new Map(), root = new w.ContributorFolder();
  const events = { on: () => ({}), offref() {} };
  const app = { saveLocalStorage() {}, vault: { ...events, getName: () => 'private-url-evidence', getFileByPath: p => files.get(p) ?? null,
    getFiles: () => [...files.values()], getMarkdownFiles: () => [...files.values()], getRoot: () => root, getFolderByPath: p => p === '' ? root : null,
    cachedRead: async () => '' }, metadataCache: { ...events, getFileCache: f => metadata.get(f.path) ?? null, resolvedLinks: {}, unresolvedLinks: {} } };
  const settings = { indexingMode: 'on-demand', hierarchy: { hidden: [], parents: [], children: [], leftFriends: [], rightFriends: [], previous: [], next: [], exclusions: [] },
    inferAllLinksAsFriends: false, inverseInfer: false, showFullTagName: true, tagStyleList: [], baseNodeStyle: { maxLabelLength: 30 }, maxItemCount: 30,
    pinnedNodes: [], excludeFilepaths: [], nameFields: '', noteTypeField: 'Type', primaryTagField: 'Style' };
  const index = new M.GraphIndex({ app, settings, getIndexSourceRevision: () => 0 }, app);
  index.indexedDb.putUrlOwners = async () => true;
  /** Actual source identities and canonical parsed body inputs feed the production publisher. */
  const add = (path, text = '', frontmatter = {}) => {
    const file = new w.ContributorFile(path); file.parent = root; root.children.push(file);
    files.set(path, file); metadata.set(path, { frontmatter });
    return { file, body: M.parseBodyMetadata(text) };
  };
  return { M, index, add, files, metadata, close: () => index.destroy() };
}

/** Include declaration IDs, unsorted insertion order, multiplicity and every path index. */
function evidenceValue(store) {
  const declarations = Array.from(store.declarations());
  const paths = new Set(declarations.flatMap(item => [item.declaredByPath, item.declaredTargetPath]));
  return JSON.parse(JSON.stringify({ declarations, count: store.declarationCount, pairs: store.pairCount, nextId: store.nextId,
    touching: [...paths].map(path => [path, Array.from(store.declarationsTouchingIterator(path))]) }));
}

/** Compare canonical graph relationships and aliases without retaining cyclic target objects. */
function graphValue(index) {
  const state = index.urlState;
  return JSON.parse(JSON.stringify({ evidence: evidenceValue(state.evidence), pages: [...state.pages].map(([path, page]) => ({
    path, name: page.name, aliases: page.aliases, neighbours: [...page.neighbours].map(([path, { target, ...relation }]) => [path, relation]),
  })), owners: [...index.urlOwners.keys()] }));
}

/** Add a distinguishable canonical original declaration; IDs are allocated by the real owner. */
function declare(M, store, source, target, definition = source) {
  return store.addPair(source, target, 'child', M.RelationType.INFERRED, M.LinkDirection.TO, { sourceKind: 'body-url', definition });
}

test('bounded immediate private child adoption preserves tombstone/re-add order, duplicates, IDs and indexes', () => {
  const f = fixture(), M = f.M;
  try {
    const privateStore = new M.RelationEvidenceStore(); let ordinary = new M.RelationEvidenceStore();
    const stages = [
      store => { declare(M, store, 'Z', 'target'); declare(M, store, 'A', 'target'); declare(M, store, 'A', 'target', 'duplicate'); declare(M, store, 'B', 'target'); },
      store => { store.removeDeclarationsTouching('Z', () => true); store.removeDeclarationsTouching('A', item => item.definition !== 'duplicate'); declare(M, store, 'C', 'target'); },
      store => { declare(M, store, 'Z', 'target', 're-added'); declare(M, store, 'A', 'target', 'replacement'); },
    ];
    for (const stage of stages) {
      const child = privateStore.fork(), expected = ordinary.fork(); stage(child); stage(expected);
      assert.equal(privateStore.adoptPrivateFork(child, 1024), true); ordinary = expected;
      assert.deepEqual(evidenceValue(privateStore), evidenceValue(ordinary));
    }
    assert.deepEqual(Array.from(privateStore.declarations()).map(item => item.declaredByPath), ['Z', 'A', 'A', 'B', 'C']);
    assert.equal(declare(M, privateStore, 'Last', 'target'), declare(M, ordinary, 'Last', 'target'), 'Next generated ID is unchanged');
  } finally { f.close(); }
});

test('unrelated, non-immediate, changed-base and oversized child rejection mutates neither store', async () => {
  const f = fixture(), M = f.M;
  try {
    for (const kind of ['unrelated', 'grandchild', 'changed-base', 'sorted-base', 'over-limit']) {
      const parent = new M.RelationEvidenceStore(); declare(M, parent, 'B', 'target'); declare(M, parent, 'A', 'target');
      if (kind === 'sorted-base') declare(M, parent, 'B', 'target', 'second');
      let child = parent.fork(); declare(M, child, 'C', 'target');
      if (kind === 'unrelated') child = new M.RelationEvidenceStore().fork();
      if (kind === 'grandchild') child = child.fork();
      if (kind === 'changed-base') declare(M, parent, 'D', 'target');
      if (kind === 'sorted-base') await parent.orderDeclarationsCooperative((a, b) => b.id.localeCompare(a.id), async () => true);
      const beforeParent = evidenceValue(parent), beforeChild = evidenceValue(child);
      assert.equal(parent.adoptPrivateFork(child, kind === 'over-limit' ? 0 : 1024), false, kind);
      assert.deepEqual(evidenceValue(parent), beforeParent); assert.deepEqual(evidenceValue(child), beforeChild);
    }
  } finally { f.close(); }
});

test('adoption writes only changed buckets and never enumerates the accumulated base', () => {
  const f = fixture(), M = f.M;
  try {
    const parent = new M.RelationEvidenceStore(); for (let n = 0; n < 2048; n++) declare(M, parent, `Owner${n}`, 'target');
    const child = parent.fork(); child.removeDeclarationsTouching('Owner3', () => true); declare(M, child, 'New', 'target');
    let writes = 0, reads = 0;
    const write = parent.writePair, read = parent.readPair;
    parent.writePair = function(...args) { writes++; return write.apply(this, args); };
    parent.readPair = function(...args) { reads++; return read.apply(this, args); };
    for (const key of ['allPairKeys', 'pairKeysForPath', 'declarations', 'declarationsTouchingIterator']) parent[key] = () => { throw new Error('Base enumeration forbidden'); };
    assert.equal(parent.adoptPrivateFork(child, 1024), true); assert.equal(writes, 2); assert.equal(reads, 2);
    assert.equal(parent.declarationCount, 2048); assert.equal(parent.pairCount, 2048);
  } finally { f.close(); }
});

test('exact 1024-bucket admission succeeds while 1025 buckets retain an untouched swap candidate', () => {
  const f = fixture(), M = f.M;
  try {
    for (const size of [1024, 1025]) {
      const parent = new M.RelationEvidenceStore(), child = parent.fork();
      for (let n = 0; n < size; n++) declare(M, child, `Owner${n}`, 'target');
      const beforeChild = evidenceValue(child);
      assert.equal(parent.adoptPrivateFork(child, 1024), size === 1024);
      assert.equal(parent.declarationCount, size === 1024 ? 1024 : 0);
      assert.deepEqual(evidenceValue(child), beforeChild);
    }
  } finally { f.close(); }
});

test('ordinary URL builders retain immutable fork/swap without the private ownership capability', async () => {
  const f = fixture(), i = f.index;
  try {
    const a = f.add('A.md', 'https://shared.example/a');
    const initial = i.urlState.evidence, retained = evidenceValue(initial);
    const builder = new f.M.GraphBuilder(i.plugin, i.app, new Map(), i.metadataParser, i.indexedDb, () => true);
    assert(await builder.patchUrlReferences(i.urlState, a.file, a.body, (_, publish) => publish()));
    assert.notEqual(i.urlState.evidence, initial); assert.deepEqual(evidenceValue(initial), retained);
    assert.equal(i.urlState.evidence.depth, 1);
    const published = i.urlState.evidence, retainedPublished = evidenceValue(published);
    let compactions = 0; const compact = f.M.RelationEvidenceStore.prototype.compactCooperative;
    f.M.RelationEvidenceStore.prototype.compactCooperative = async function(...args) { compactions++; return compact.apply(this, args); };
    for (let n = 0; n < 8; n++) await builder.patchUrlReferences(i.urlState, a.file, a.body, (_, publish) => publish());
    assert.equal(compactions, 1, 'Existing depth-eight policy still compacts ordinary fork/swap chains');
    assert.equal(i.urlState.evidence.depth, 1); assert.deepEqual(evidenceValue(published), retainedPublished);
  } finally { f.close(); }
});

test('production URL commits preserve a retained published generation and re-use only unpublished evidence', async () => {
  const f = fixture(), i = f.index;
  try {
    const a = f.add('A.md', '[First](https://shared.example/a)');
    const initial = i.urlState.evidence;
    await i.publishUrlOwner(a.file, a.body, 0, undefined, true);
    assert.notEqual(i.urlState.evidence, initial, 'First lazy activation swaps instead of replaying a full index into an inactive parent');
    assert.equal(initial.targetIndex, null, 'Previously retained inactive evidence is not activated');
    i.flushUrlPublication(); const published = i.publishedUrlState.evidence, retained = evidenceValue(published);
    const b = f.add('B.md', '[Second](https://shared.example/a)');
    await i.publishUrlOwner(b.file, b.body, 0, undefined, true);
    assert.notEqual(i.urlState.evidence, published, 'Published evidence must fork/swap');
    const privateLayer = i.urlState.evidence;
    const c = f.add('C.md', '[Third](https://shared.example/a)');
    await i.publishUrlOwner(c.file, c.body, 0, undefined, true);
    assert.equal(i.urlState.evidence, privateLayer, 'Later private child avoids an additional fork generation');
    assert.deepEqual(evidenceValue(published), retained);
  } finally { f.close(); }
});

test('a presentation flush during preparation is checked live at synchronous URL commit', async () => {
  const f = fixture(), i = f.index;
  try {
    const a = f.add('A.md', '[First](https://shared.example/a)'); await i.publishUrlOwner(a.file, a.body, 0, undefined, true);
    const b = f.add('B.md', '[Second](https://shared.example/a)'), aliases = i.prepareUrlAliasOwners;
    let published, retained;
    i.prepareUrlAliasOwners = async function(...args) {
      const result = await aliases.apply(this, args);
      this.flushUrlPublication(); published = this.publishedUrlState.evidence; retained = evidenceValue(published);
      return result;
    };
    await i.publishUrlOwner(b.file, b.body, 0, undefined, true);
    assert.notEqual(i.urlState.evidence, published); assert.deepEqual(evidenceValue(published), retained);
    assert.equal(i.urlState.evidence.declarationCount > published.declarationCount, true);
  } finally { f.close(); }
});

test('production optimized and ordinary fork/swap preserve unsorted evidence, relations, aliases and shared origin lifetimes', async () => {
  const actual = fixture(), expected = fixture();
  try {
    expected.M.RelationEvidenceStore.prototype.adoptPrivateFork = () => false;
    for (const [path, text, properties] of [
      ['A.md', '[First](https://shared.example/a) [Duplicate](https://shared.example/a)', { Extra: 'https://shared.example/b' }],
      ['B.md', '[Second](https://shared.example/a)', {}],
      ['C.md', 'https://shared.example/c', {}],
      ['A.md', '[Replacement](https://shared.example/d)', {}],
    ]) {
      for (const f of [actual, expected]) {
        let record;
        if (f.files.has(path)) { const file = f.files.get(path); f.metadata.set(path, { frontmatter: properties }); record = { file, body: f.M.parseBodyMetadata(text) }; }
        else record = f.add(path, text, properties);
        await f.index.publishUrlOwner(record.file, record.body, 0, undefined, true);
      }
      assert.deepEqual(graphValue(actual.index), graphValue(expected.index));
    }
    for (const path of ['B.md', 'C.md', 'A.md']) {
      for (const f of [actual, expected]) await f.index.retireUrlOwner(path);
      assert.deepEqual(graphValue(actual.index), graphValue(expected.index));
    }
    assert.equal(actual.index.urlState.pages.has('https://shared.example'), false, 'Last contributing owner retires shared origin');
  } finally { actual.close(); expected.close(); }
});

test('over-1024 URL pair deltas keep constant-time fork/swap publication and existing compaction policy', async () => {
  const f = fixture(), i = f.index;
  try {
    const a = f.add('Large.md', Array.from({ length: 1100 }, (_, n) => `https://shared.example/${n}`).join(' '));
    const initial = i.urlState.evidence, snapshot = evidenceValue(initial);
    await i.publishUrlOwner(a.file, a.body, 0, undefined, true);
    assert.notEqual(i.urlState.evidence, initial); assert.deepEqual(evidenceValue(initial), snapshot);
    assert.equal(i.urlState.evidence.depth, 1); assert.equal(i.urlState.evidence.pairCount, 2200);
  } finally { f.close(); }
});


test('unload before a prepared URL resumes cannot adopt or publish late evidence', async () => {
  const f = fixture(), i = f.index;
  try {
    const a = f.add('A.md', 'https://shared.example/a'), aliases = i.prepareUrlAliasOwners;
    const initial = i.urlState.evidence, retained = evidenceValue(initial);
    let entered, resume; const begun = new Promise(resolve => { entered = resolve; });
    const gate = new Promise(resolve => { resume = resolve; });
    i.prepareUrlAliasOwners = async function(...args) { const prepared = await aliases.apply(this, args); entered(); await gate; return prepared; };
    const task = i.publishUrlOwner(a.file, a.body, 0, undefined, true);
    await begun; i.destroy(); resume(); await task;
    assert.deepEqual(evidenceValue(initial), retained); assert.equal(i.urlOwners.size, 0);
    assert.deepEqual(Array.from(i.getWorkPriorityDiagnostics().active), [0, 0, 0, 0, 0]);
  } finally { f.close(); }
});

test('indexed URL-only and ordinary Markdown origin reconciliation preserve foreign origins, duplicates and exact supporting kinds', async () => {
  for (const supported of [false, true]) for (const override of [false, true]) {
    const fixtures = [fixture(), fixture()];
    try {
      for (let mode = 0; mode < fixtures.length; mode++) {
        const f = fixtures[mode], state = f.index.urlState;
        const builder = new f.M.GraphBuilder(f.index.plugin, f.index.app, new Map(), f.index.metadataParser, f.index.indexedDb, () => true);
        const target = 'https://target.example/item', first = 'https://foreign.example', second = 'https://other.example';
        for (const path of [target, first, second]) builder.addPage(state, builder.createPage({ path, name: path, url: path }));
        for (const [source, kind] of [[first, 'url-origin'], [first, 'url-origin'], [second, 'url-origin'], ['Excluded', 'date-property'], ['Tree', 'tag-tree']])
          state.evidence.addPair(source, target, 'child', f.M.RelationType.INFERRED, f.M.LinkDirection.TO, { sourceKind: kind });
        for (const kind of ['body-url', 'property-url', 'frontmatter-ontology', 'inline-ontology']) {
          if (supported) state.evidence.addPair(`owner-${kind}`, target, 'child', f.M.RelationType.INFERRED, f.M.LinkDirection.TO, { sourceKind: kind });
          // Opposite declarations never count as references to this URL.
          state.evidence.addPair(target, `reverse-${kind}`, 'child', f.M.RelationType.INFERRED, f.M.LinkDirection.TO, { sourceKind: kind });
        }
        const desired = override ? new Map([[target, second]]) : new Map();
        assert(await builder.reconcilePreparedUrlOriginsCooperative(state, [target], desired, new Set(), mode === 1));
        assert.equal(!!state.evidence.targetIndex, mode === 1, 'Ordinary Markdown reconciliation does not activate whole-graph metadata');
        const origins = [...state.evidence.declarations()].filter(item => item.sourceKind === 'url-origin');
        assert.deepEqual(origins.map(item => item.declaredByPath), supported ? [override ? second : first] : []);
      }
      assert.deepEqual(graphValue(fixtures[0].index), graphValue(fixtures[1].index));
    } finally { fixtures.forEach(f => f.close()); }
  }
});
