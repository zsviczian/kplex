/** Lazy canonical target/kind facts preserve original evidence order, COW generations and bounded work. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { loadPortableModules } from './support/portableTypeScript.mjs';
const loaded = loadPortableModules(['src/core/graph/evidence.ts', 'src/core/graph/relations.ts']);
const M = loaded.exports;
test.after(() => loaded.cleanup());
const kinds = ['obsidian-link', 'unresolved-link', 'frontmatter-ontology', 'inline-ontology', 'body-url', 'property-url', 'date-property', 'file-tree', 'tag-tree', 'url-origin'];
/** Production add supplies distinct original declarations, without generating inverse stored records. */
function add(store, source, target, kind = 'url-origin', label = source) {
  return store.addPair(source, target, 'child', M.RelationType.INFERRED, M.LinkDirection.TO, { sourceKind: kind, definition: label });
}
/** Ordinary original iteration is the independent oracle for counts, multiplicity and insertion order. */
async function compareFacts(store) {
  const all = [...store.declarations()];
  for (const target of new Set(['missing', ...all.map(item => item.declaredTargetPath)])) {
    for (const kind of kinds) assert.equal(store.declaredTargetCount(target, kind), all.filter(item => item.declaredTargetPath === target && item.sourceKind === kind).length, `${target}/${kind}`);
    const selected = [];
    assert(await store.visitDeclaredTargetKindCooperative(target, 'url-origin', item => selected.push(item), async () => true));
    assert.deepEqual(selected, all.filter(item => item.declaredTargetPath === target && item.sourceKind === 'url-origin'));
  }
}
/** Activate only the membership needed by the actual URL consumer. */
async function activate(store, checkpoint = async () => true) {
  return store.ensureDeclaredTargetIndexCooperative(['url-origin'], checkpoint);
}

test('ordinary stores allocate no derived metadata; private activation never changes an inactive published parent', async () => {
  const base = new M.RelationEvidenceStore();
  for (let n = 0; n < 600; n++) add(base, `owner${n}`, 'url', 'body-url');
  assert.equal(base.targetIndex, null);
  const child = base.fork(); add(child, 'origin', 'url');
  assert(await activate(child)); await compareFacts(child);
  assert.equal(base.targetIndex, null);
  const before = [...base.declarations()];
  assert.equal(base.adoptPrivateFork(child, 1024), false, 'First activation requires normal immutable pointer swap');
  assert.deepEqual([...base.declarations()], before);
  assert.deepEqual([...child.targetIndex.members.keys()], ['url-origin']);
});

test('activation cancels or rejects mutation in any captured layer without installing partial facts', async () => {
  for (const scenario of ['cancel', 'own-mutation', 'parent-mutation']) {
    const base = new M.RelationEvidenceStore();
    for (let n = 0; n < 800; n++) add(base, `owner${n}`, 'url', 'body-url');
    const child = base.fork(); let calls = 0;
    const ok = await activate(child, async () => {
      if (++calls === 1) {
        if (scenario === 'cancel') return false;
        add(scenario === 'parent-mutation' ? base : child, 'intervening', 'url');
      }
      return true;
    });
    assert.equal(ok, false, scenario); assert.equal(child.targetIndex, null); assert.equal(base.targetIndex, null);
    assert(await activate(child)); await compareFacts(child);
  }
});

test('counts and selected originals match full iteration across mutation, restore, sorting, rename, forks and compaction', async () => {
  let store = new M.RelationEvidenceStore();
  for (const kind of kinds) { add(store, 'A', 'url', kind, kind); add(store, 'url', 'A', kind, `reverse-${kind}`); }
  add(store, 'B', 'url'); add(store, 'B', 'url', 'url-origin', 'duplicate');
  assert(await activate(store)); await compareFacts(store);
  store.addDeclaration('restore', 'url', 'parent', M.RelationType.DEFINED, M.LinkDirection.FROM, { sourceKind: 'url-origin' }); await compareFacts(store);
  await store.orderDeclarationsCooperative((a, b) => b.definition.localeCompare(a.definition), async () => true); await compareFacts(store);
  store.removeDeclarations(item => item.definition === 'duplicate'); await compareFacts(store);
  store.removeDeclarationsTouching('A', item => item.sourceKind === 'property-url'); await compareFacts(store);
  await store.removeDeclarationsTouchingCooperative('A', item => item.sourceKind === 'tag-tree', async () => true); await compareFacts(store);
  store.renamePath('A', 'B'); await compareFacts(store);
  const retained = [...store.declarations()], retainedCounts = store.declaredTargetCount('url', 'url-origin');
  const child = store.fork(); child.removeDeclarationsTouching('B', item => item.sourceKind === 'url-origin'); add(child, 'C', 'url'); await compareFacts(child);
  assert.deepEqual([...store.declarations()], retained); assert.equal(store.declaredTargetCount('url', 'url-origin'), retainedCounts);
  assert(store.adoptPrivateFork(child, 1024)); await compareFacts(store);
  store = store.fork(); add(store, 'D', 'url'); await compareFacts(store);
  const compact = await store.compactCooperative(async () => true); assert(compact); await compareFacts(compact);
  assert.deepEqual([...compact.declarations()], [...store.declarations()]);
});

test('selective pair order follows original insertion rather than late membership arrival, deletion or adopted tombstones', async () => {
  for (const adopted of [false, true]) {
    let store = new M.RelationEvidenceStore();
    add(store, 'first', 'url', 'body-url'); add(store, 'second', 'url'); assert(await activate(store));
    add(store, 'first', 'url'); await compareFacts(store);
    const stage = adopted ? store.fork() : store;
    stage.removeDeclarationsTouching('first', () => true); add(stage, 'third', 'url'); add(stage, 'first', 'url');
    if (adopted) assert(store.adoptPrivateFork(stage, 1024));
    await compareFacts(store);
    const names = []; await store.visitDeclaredTargetKindCooperative('url', 'url-origin', item => names.push(item.declaredByPath), async () => true);
    assert.deepEqual(names, adopted ? ['first', 'second', 'third'] : ['second', 'third', 'first']);
  }
});

test('changed-parent, unrelated and oversized child rejection preserves indexed counts and originals', async () => {
  for (const scenario of ['changed', 'unrelated', 'oversized']) {
    const parent = new M.RelationEvidenceStore(); add(parent, 'A', 'url'); assert(await activate(parent));
    let child = parent.fork(); add(child, 'B', 'url');
    if (scenario === 'changed') add(parent, 'C', 'url');
    if (scenario === 'unrelated') { child = new M.RelationEvidenceStore(); add(child, 'B', 'url'); assert(await activate(child)); }
    const before = [...parent.declarations()];
    assert.equal(parent.adoptPrivateFork(child, scenario === 'oversized' ? 0 : 1024), false);
    assert.deepEqual([...parent.declarations()], before); await compareFacts(parent); if (scenario !== 'changed') await compareFacts(child);
  }
});

test('counts and selective visits open no unrelated incoming pair buckets', async () => {
  const store = new M.RelationEvidenceStore();
  for (let n = 0; n < 10000; n++) add(store, `owner${n}`, 'url', 'body-url');
  add(store, 'foreign-origin', 'url'); add(store, 'actual-origin', 'url'); add(store, 'actual-origin', 'url', 'url-origin', 'duplicate');
  assert(await activate(store));
  let reads = 0; const read = store.readPair;
  store.readPair = function(key) { reads++; assert(!key.includes('owner'), 'Unrelated pair opened'); return read.call(this, key); };
  assert.equal(store.declaredTargetCount('url', 'body-url'), 10000); assert.equal(reads, 0);
  const selected = []; assert(await store.visitDeclaredTargetKindCooperative('url', 'url-origin', item => selected.push(item), async () => true));
  assert.equal(reads, 2); assert.equal(selected.length, 3);
  assert.equal(await store.removeDeclaredTargetKindCooperative('url', 'url-origin', async () => true), 3);
  assert.equal(reads, 4); assert.equal(store.declaredTargetCount('url', 'url-origin'), 0);
});

test('dense mixed buckets and many matching pairs yield, cancel and retain parent/index consistency', async () => {
  const base = new M.RelationEvidenceStore();
  for (let n = 0; n < 1600; n++) add(base, 'dense', 'url', n % 2 ? 'body-url' : 'url-origin', `${n}`);
  for (let n = 0; n < 1000; n++) add(base, `origin${n}`, 'url');
  assert(await activate(base)); const original = [...base.declarations()];
  let calls = 0; const selected = [];
  assert(await base.visitDeclaredTargetKindCooperative('url', 'url-origin', item => selected.push(item), async () => { calls++; return true; }));
  assert(calls > 15); assert.equal(selected.length, 1800);
  const child = base.fork(); let reachedDense = false;
  const read = child.readPair; child.readPair = function(key) { if (key.includes('dense')) reachedDense = true; return read.call(this, key); };
  assert.equal(await child.removeDeclaredTargetKindCooperative('url', 'url-origin', async () => !reachedDense), null);
  assert.deepEqual([...child.declarations()], original, 'Cancelled dense filter does not publish an incomplete bucket'); await compareFacts(child);
  assert.deepEqual([...base.declarations()], original); await compareFacts(base);
  assert.equal(await child.removeDeclaredTargetKindCooperative('url', 'url-origin', async () => true), 1800); await compareFacts(child);
  assert.equal(child.declaredTargetCount('url', 'body-url'), 800);
});

test('cancelled ordering does not corrupt activated dense records or original multiplicity', async () => {
  const store = new M.RelationEvidenceStore();
  for (let n = 0; n < 1200; n++) add(store, 'dense', 'url', n % 2 ? 'body-url' : 'url-origin', String(n));
  assert(await activate(store)); const before = [...store.declarations()]; let checks = 0;
  assert.equal(await store.orderDeclarationsCooperative((a, b) => b.definition.localeCompare(a.definition), async () => ++checks < 8), false);
  assert.deepEqual([...store.declarations()], before); await compareFacts(store);
});


test('standalone repeated deletion releases derived pair/target strings while adopted tombstones retain only required ordering', async () => {
  const store = new M.RelationEvidenceStore(); assert(await activate(store));
  for (let n = 0; n < 2000; n++) {
    add(store, `origin${n}`, `url${n}`); store.removeDeclarationsTouching(`origin${n}`, () => true);
  }
  const index = store.targetIndex;
  assert.equal(store.pairCount, 0); assert.equal(index.summaries.size, 0); assert.equal(index.counts.size, 0);
  assert.equal(index.ordinals.size, 0); assert.equal(index.members.get('url-origin').size, 0);
  const child = store.fork(); add(child, 'retained', 'url'); child.removeDeclarationsTouching('retained', () => true);
  assert(store.adoptPrivateFork(child, 1024));
  assert.equal(index.summaries.size, 0); assert.equal(index.counts.size, 0); assert.equal(index.members.get('url-origin').size, 0);
  assert.equal(index.ordinals.size, 1, 'Canonical adopted tombstone keeps its insertion rank');
  add(store, 'retained', 'url'); await compareFacts(store);
});

test('adding a queried kind activates privately and rejects full-index synchronous adoption', async () => {
  const parent = new M.RelationEvidenceStore(); add(parent, 'A', 'url', 'body-url'); assert(await activate(parent));
  const retained = parent.targetIndex;
  const child = parent.fork(); add(child, 'B', 'url', 'property-url');
  assert(await child.ensureDeclaredTargetIndexCooperative(['body-url'], async () => true));
  assert.equal(parent.targetIndex, retained); assert.deepEqual([...retained.members.keys()], ['url-origin']);
  const found = []; assert(await child.visitDeclaredTargetKindCooperative('url', 'body-url', item => found.push(item), async () => true));
  assert.equal(found.length, 1); assert.equal(parent.adoptPrivateFork(child, 1024), false);
  await compareFacts(parent); await compareFacts(child);
});
