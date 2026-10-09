/** Lazy canonical endpoint existence matches the full original iterator without whole-degree Set materialization. */
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { MessageChannel } from 'node:worker_threads';
import { webcrypto } from 'node:crypto';
import { loadPortableModules } from './support/portableTypeScript.mjs';
import { contributorBrowserBundle } from './support/contributorBrowserFixture.mjs';
const loaded = loadPortableModules(['src/core/graph/evidence.ts', 'src/core/graph/relations.ts']);
const M = loaded.exports;
test.after(() => loaded.cleanup());
const bundle = await contributorBrowserBundle(['src/index/GraphIndex.ts', 'src/index/GraphBuilder.ts', 'src/core/graph/evidence.ts', 'src/core/graph/relations.ts']);
const kinds = ['obsidian-link', 'unresolved-link', 'frontmatter-ontology', 'inline-ontology', 'body-url', 'property-url', 'date-property', 'file-tree', 'tag-tree', 'url-origin'];
/** Populate actual original declarations, preserving canonical IDs/provenance. */
function add(store, source, target, kind = 'body-url') {
  store.addPair(source, target, 'child', M.RelationType.INFERRED, M.LinkDirection.TO, { sourceKind: kind, definition: kind });
}
/** The unchanged complete original iterator provides an independent existence oracle. */
async function compare(store, extras = []) {
  const declarations = [...store.declarations()];
  const paths = new Set([...extras, 'missing', ...declarations.flatMap(item => [item.declaredByPath, item.declaredTargetPath])]);
  for (const path of paths) assert.equal(await store.hasDeclarationsTouchingCooperative(path, async () => true), !store.declarationsTouchingIterator(path).next().done, path);
}
/** Real host-bound publication is exercised using controlled file/cache facts only. */
function hostFixture() {
  const w = { performance: { now: () => 0 }, MessageChannel, crypto: webcrypto, setTimeout, clearTimeout };
  vm.runInContext(bundle, vm.createContext({ window: w, performance: w.performance, URL, Date, TextEncoder, TextDecoder, structuredClone, setTimeout, clearTimeout }));
  const core = w.sourceModules, files = new Map(), metadata = new Map(), root = new w.ContributorFolder();
  const events = { on: () => ({}), offref() {} };
  const app = { saveLocalStorage() {}, vault: { ...events, getName: () => 'evidence-existence', getFileByPath: p => files.get(p) ?? null,
    getFiles: () => [...files.values()], getMarkdownFiles: () => [...files.values()], getRoot: () => root, getFolderByPath: p => p === '' ? root : null,
    cachedRead: async () => '' }, metadataCache: { ...events, getFileCache: f => metadata.get(f.path) ?? null, resolvedLinks: {}, unresolvedLinks: {} } };
  const settings = { indexingMode: 'on-demand', hierarchy: { hidden: [], parents: [], children: [], leftFriends: [], rightFriends: [], previous: [], next: [], exclusions: [] },
    inferAllLinksAsFriends: false, inverseInfer: false, showFullTagName: true, tagStyleList: [], baseNodeStyle: { maxLabelLength: 30 }, maxItemCount: 30,
    pinnedNodes: [], excludeFilepaths: [], nameFields: '', noteTypeField: 'Type', primaryTagField: 'Style' };
  const index = new core.GraphIndex({ app, settings, getIndexSourceRevision: () => 0 }, app);
  index.indexedDb.putUrlOwners = async () => true;
  /** Exact files feed the actual URL publisher and compiler. */
  const owner = (path, text) => {
    let file = files.get(path);
    if (!file) { file = new w.ContributorFile(path); file.parent = root; root.children.push(file); files.set(path, file); metadata.set(path, { frontmatter: {} }); }
    return { file, body: core.parseBodyMetadata(text) };
  };
  return { core, index, owner, close: () => index.destroy() };
}

test('either endpoint and every original kind sustain existence without changing directional provenance or metadata', async () => {
  for (const kind of kinds) {
    const store = new M.RelationEvidenceStore(); add(store, 'source', 'target', kind);
    const before = [...store.declarations()]; let checkpoints = 0;
    assert.equal(await store.hasDeclarationsTouchingCooperative('source', async () => { checkpoints++; return true; }), true);
    assert.equal(await store.hasDeclarationsTouchingCooperative('target', async () => { checkpoints++; return true; }), true);
    assert.equal(await store.hasDeclarationsTouchingCooperative('missing', async () => { checkpoints++; return true; }), false);
    assert.equal(checkpoints, 0); assert.equal(store.targetIndex, null); assert.deepEqual([...store.declarations()], before);
  }
  const hidden = new M.RelationEvidenceStore(); hidden.addHidden('hiddenSource', 'hiddenTarget', { sourceKind: 'frontmatter-ontology' });
  await compare(hidden); assert.equal(hidden.between('hiddenTarget', 'hiddenSource').length, 0, 'No inverse hidden evidence was materialized');
});

test('multiple/deleted/shadowed/readded/forked/adopted/compacted evidence matches unchanged complete iterator', async () => {
  let store = new M.RelationEvidenceStore();
  add(store, 'first', 'shared'); add(store, 'second', 'shared', 'url-origin'); add(store, 'shared', 'second', 'property-url');
  await compare(store);
  const retained = [...store.declarations()];
  const child = store.fork(); child.removeDeclarationsTouching('first', () => true); child.removeDeclarationsTouching('second', () => true);
  await compare(child, ['first', 'second', 'shared']); assert.equal(await child.hasDeclarationsTouchingCooperative('shared', async () => true), false);
  assert.deepEqual([...store.declarations()], retained);
  add(child, 'first', 'shared'); await compare(child, ['second']);
  assert(store.adoptPrivateFork(child, 1024)); await compare(store, ['second']);
  store = store.fork(); add(store, 'third', 'shared'); store.renamePath('third', 'renamed'); await compare(store, ['third']);
  const compact = await store.compactCooperative(async () => true); assert(compact); await compare(compact, ['first', 'second', 'third']);
  compact.removeDeclarations(() => true); await compare(compact, ['first', 'shared', 'renamed']);
});

test('positive many-owner queries stop after one current bucket without materializing inherited path-key unions', async () => {
  const base = new M.RelationEvidenceStore();
  for (let n = 0; n < 10000; n++) add(base, `owner${n}`, 'shared');
  const child = base.fork(); add(child, 'latest', 'shared');
  for (const store of [base, child]) store.pairKeysForPath = () => { throw new Error('Whole-degree Set materialization forbidden'); };
  let candidates = 0, checkpoints = 0; const original = child.lazyPairKeysForPath;
  child.lazyPairKeysForPath = function*(...args) { for (const key of original.apply(this, args)) { candidates++; yield key; } };
  assert.equal(await child.hasDeclarationsTouchingCooperative('shared', async () => { checkpoints++; return true; }), true);
  assert.equal(candidates, 1); assert.equal(checkpoints, 0);
  child.removeDeclarations = () => { throw new Error('No mutation or materialization required'); };
  assert.equal(await child.hasDeclarationsTouchingCooperative('latest', async () => true), true);
});

test('dense negative inherited tombstones yield at256 keys and cancellation returns null without mutating evidence', async () => {
  const base = new M.RelationEvidenceStore();
  for (let n = 0; n < 1600; n++) add(base, `owner${n}`, 'shared');
  const child = base.fork(); child.removeDeclarationsTouching('shared', () => true);
  const original = [...base.declarations()]; let checkpoints = 0;
  assert.equal(await child.hasDeclarationsTouchingCooperative('shared', async () => { checkpoints++; return true; }), false);
  assert.equal(checkpoints, Math.floor(3200 / 256), 'Local and inherited dead keys are visited lazily without a dedup Set');
  assert.equal(await child.hasDeclarationsTouchingCooperative('shared', async () => false), null);
  assert.deepEqual([...base.declarations()], original); assert.equal(child.declarationCount, 0); assert.equal(child.targetIndex, null);
});

test('intervening current or base mutation retires an awaited negative scan rather than certifying absence or new positive evidence', async () => {
  for (const changedLayer of ['current', 'base']) {
    const base = new M.RelationEvidenceStore();
    for (let n = 0; n < 900; n++) add(base, `owner${n}`, 'shared');
    const child = base.fork(); child.removeDeclarationsTouching('shared', () => true);
    let calls = 0;
    assert.equal(await child.hasDeclarationsTouchingCooperative('shared', async () => {
      if (++calls === 1) add(changedLayer === 'current' ? child : base, 'intervening', 'shared');
      return true;
    }), null, changedLayer);
    assert.equal(calls, 1); assert.equal(child.targetIndex, null);
  }
});

test('URL-only pruning opts into lazy existence and preserves shared children/origins until last owner removal', async () => {
  const f = hostFixture(), target = 'https://shared.example/item', origin = 'https://shared.example';
  try {
    let calls = 0; const has = f.core.RelationEvidenceStore.prototype.hasDeclarationsTouchingCooperative;
    f.core.RelationEvidenceStore.prototype.hasDeclarationsTouchingCooperative = async function(...args) { calls++; return has.apply(this, args); };
    for (const path of ['A.md', 'B.md']) { const a = f.owner(path, target); await f.index.publishUrlOwner(a.file, a.body, 0, undefined, true); }
    assert(calls > 0); assert(f.index.urlState.pages.has(target)); assert(f.index.urlState.pages.has(origin));
    await f.index.retireUrlOwner('A.md'); assert(f.index.urlState.pages.has(target)); assert(f.index.urlState.pages.has(origin));
    await f.index.retireUrlOwner('B.md'); assert.equal(f.index.urlState.pages.has(target), false); assert.equal(f.index.urlState.pages.has(origin), false);
    assert.equal(f.index.urlState.evidence.declarationCount, 0);
  } finally { f.close(); }
});

test('ordinary Markdown pruning retains iterator fallback; cancelled URL existence cannot remove its private candidate', async () => {
  const f = hostFixture();
  try {
    const state = f.index.urlState, target = 'https://unused.example/item';
    const builder = new f.core.GraphBuilder(f.index.plugin, f.index.app, new Map(), f.index.metadataParser, f.index.indexedDb, () => true);
    state.pages.set(target, builder.createPage({ path: target, name: target, url: target }));
    let lazyCalls = 0, orderedCalls = 0; const ordered = state.evidence.declarationsTouchingIterator;
    state.evidence.hasDeclarationsTouchingCooperative = async () => { lazyCalls++; return null; };
    state.evidence.declarationsTouchingIterator = function*(...args) { orderedCalls++; yield* ordered.apply(this, args); };
    assert.equal(await builder.pruneUnusedUrlNodesCooperative(state, [target], new Set(), false, true), false);
    assert(state.pages.has(target)); assert.equal(lazyCalls, 1); assert.equal(orderedCalls, 0);
    assert.equal(await builder.pruneUnusedUrlNodesCooperative(state, [target], new Set()), true);
    assert.equal(state.pages.has(target), false); assert.equal(lazyCalls, 1); assert.equal(orderedCalls, 1);
  } finally { f.close(); }
});
