/**
 * Ordinary source no-ops preserve publication/freshness while avoiding unrelated evidence and
 * adjacency maintenance. Real production builders run against finite native inputs; browser
 * regressions additionally exercise durable source acquisition and actual IndexedDB transactions.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { noopPatchBundle, portableNoopFixture } from './support/noopPatchPortable.mjs';
import { noopPatchFixture, probeNoopPatch } from './support/noopPatchFixture.mjs';
import { chromiumHarness } from './support/browserTypeScript.mjs';
import { contributorBrowserInitialize } from './support/contributorBrowserFixture.mjs';

const bundle = await noopPatchBundle();

/** Include exact declaration IDs/order and canonical neighbor identities in the retained oracle. */
function retainedValue(f) {
  return { evidence: f.state.evidence, declarations: JSON.stringify([...f.state.evidence.declarations()]),
    page: f.page, neighbours: f.page.neighbours, entries: [...f.page.neighbours], aliases: f.page.aliases,
    tags: f.page.tags, styleTags: f.page.styleTags };
}

/** A no-op may publish mtime/field metadata but cannot replace or mutate retained semantic values. */
function assertRetained(f, before) {
  assert.equal(f.state.evidence, before.evidence);
  assert.equal(JSON.stringify([...f.state.evidence.declarations()]), before.declarations);
  assert.equal(f.state.pages.get(f.file.path), before.page);
  assert.equal(f.page.neighbours, before.neighbours);
  assert.deepEqual([...f.page.neighbours], before.entries);
  for (const [path, relation] of f.page.neighbours) assert.equal(relation.target, f.state.pages.get(path));
  for (const key of ['aliases', 'tags', 'styleTags']) assert.equal(f.page[key], before[key]);
}

for (const degree of [256, 512, 1024, 2048, 4096]) {
  test(`a degree-${degree} hot source no-op copies no adjacency or evidence`, async /** Measure the actual staging/commit path. */ () => {
    const f = portableNoopFixture(bundle, degree), before = retainedValue(f), probe = probeNoopPatch(f);
    try {
      f.host.metadata.get(f.file.path).frontmatter['New scalar'] = 'value';
      let commits = 0;
      const result = await f.builder.patchMarkdownFiles(f.state, [f.file], {
        publishFileCommit: /** Check coherence inside the synchronous per-file boundary. */ (commit, publish) => {
          assert.equal(commit.semanticChanged, false); assert.equal(commits++, 0);
          assert(!f.state.discoveredFields.has('new-scalar'));
          publish();
          assert(f.state.discoveredFields.has('new-scalar'));
          assert.equal(f.hot.get(f.file.path).semanticSignature, f.signature);
        },
      });
      assert(result.ok); assert.equal(result.semanticNoops, 1); assert.equal(result.semanticChanges, 0);
      assert.equal(commits, 1);
      assert.deepEqual(probe.counts, { neighbourEntriesCopied: 0, evidenceCompactions: 0, compactedPairs: 0, compactedDeclarations: 0 });
      assert.equal(f.host.reads.length, 0); assert.equal(f.host.parses.length, 0);
    } finally { probe.restore(); }
    assertRetained(f, before);
  });
}

test('a prose edit still reads, parses, acquires and atomically publishes its new mtime/cache', async /** No semantic shortcut bypasses source work. */ () => {
  const f = portableNoopFixture(bundle, 512), before = retainedValue(f);
  f.host.texts.set(f.file.path, 'Changed prose'); f.file.stat.mtime++;
  let acquired = 0, publications = 0;
  f.builder.sourceAcquisition = { needsBodyRead: /** Force observed content acquisition despite hot input. */ () => true,
    getBodyCacheRequest: /** This partial acquisition double offers no optional parser input. */ () => null,
    captureBodyInput: /** Exercise parsing without certifying a reusable input. */ () => undefined,
    getFileRevision: /** Keep this source current throughout its successful publication. */ () => 1,
    captureGraphSource: /** This partial double owns no eager publication journal. */ () => undefined,
    acquire: async /** Observe current neutral-source acquisition before fingerprint admission. */ () => { acquired++; return { current: true }; } };
  const result = await f.builder.patchMarkdownFiles(f.state, [f.file], {
    publishFileCommit: /** The new mtime/cache must become visible together, exactly once. */ (commit, publish) => {
      assert.equal(f.page.mtime, 1); assert.equal(f.hot.get(f.file.path).mtime, 1);
      assert.equal(acquired, 1); assert.equal(commit.semanticChanged, false);
      publish(); publications++;
      assert.equal(f.page.mtime, 2); assert.equal(f.hot.get(f.file.path).mtime, 2);
      assert.equal(f.fingerprints.get(f.file.path), f.signature);
    },
  });
  assert(result.ok); assert.equal(publications, 1); assert.equal(f.host.reads.length, 1); assert.equal(f.host.parses.length, 1);
  assertRetained(f, before);
});

test('retirement, rename, delete and equal-stat replacement during no-op preparation publish nothing', async /** Awaited metadata work remains private. */ () => {
  for (const boundary of ['retire', 'rename', 'delete', 'replace', 'event']) {
    const f = portableNoopFixture(bundle, 256), before = retainedValue(f), hot = f.hot.get(f.file.path);
    const original = f.builder.applyFieldNameSourceFacts;
    let epoch = 1;
    f.builder.sourceAcquisition = { needsBodyRead: /** Isolate post-acquisition metadata fencing. */ () => false,
      getBodyCacheRequest: /** This fixture tests semantic lifetime, not parser-input reuse. */ () => null,
      captureBodyInput: /** Leave optional parser-input certification unavailable. */ () => undefined,
      getFileRevision: /** Same-stat host events still retire the captured revision. */ () => epoch,
      captureGraphSource: /** The existing native generation checks own this isolated fixture. */ () => undefined,
      acquire: async /** A valid acquisition cannot override later event/identity retirement. */ () => ({ current: true }) };
    f.builder.applyFieldNameSourceFacts = async /** Change captured lifetime only after real field staging. */ function (...args) {
      const result = await original.apply(this, args);
      if (boundary === 'retire') f.retire();
      if (boundary === 'rename') f.file.path = 'Renamed.md';
      if (boundary === 'delete') f.host.files.delete('Hub.md');
      if (boundary === 'replace') f.host.files.set('Hub.md', { ...f.file });
      if (boundary === 'event') epoch++;
      return result;
    };
    f.host.metadata.get('Hub.md').frontmatter['New scalar'] = 'value';
    const result = await f.builder.patchMarkdownFiles(f.state, [f.file]);
    assert.equal(result.cancelled, true, boundary);
    assert.equal(f.page.mtime, 1); assert.equal(f.hot.get('Hub.md'), hot);
    assert(!f.state.discoveredFields.has('new-scalar'));
    f.file.path = 'Hub.md';
    assertRetained(f, before);
  }
});

test('the next genuine semantic change still compacts the retained depth-eight evidence', async /** Deferral applies only when no evidence fork is added. */ () => {
  const f = portableNoopFixture(bundle, 256), probe = probeNoopPatch(f);
  try {
    assert((await f.builder.patchMarkdownFiles(f.state, [f.file])).ok);
    assert.equal(f.state.evidence.depth, 8); assert.equal(probe.counts.evidenceCompactions, 0);
    f.host.metadata.get(f.file.path).frontmatter.Child = [];
    const result = await f.builder.patchMarkdownFiles(f.state, [f.file]);
    assert(result.ok); assert.equal(result.semanticChanges, 1);
    assert.equal(probe.counts.evidenceCompactions, 1);
    assert.equal(f.state.evidence.depth, 1);
    assert([...f.state.evidence.declarations()].every(/** No old ontology survives the source rewrite. */ item => item.sourceKind === 'file-tree'));
    assert([...f.page.neighbours.keys()].every(/** Only independent physical ancestry may remain. */ path => path === 'folder:/'));
  } finally { probe.restore(); }
});

test('no-op metadata retains bounded map layers across large field-discovery publications', async /** Independent map lifetime maintenance is preserved. */ () => {
  const f = portableNoopFixture(bundle, 1), evidence = f.state.evidence;
  for (let round = 0; round < 10; round++) {
    for (let n = 0; n < 1025; n++) f.fields[`Scalar ${round}-${n}`] = 'value';
    assert((await f.builder.patchMarkdownFiles(f.state, [f.file])).ok);
    assert((f.state.pages.depth ?? 0) <= 8);
    assert((f.state.discoveredFields.depth ?? 0) <= 8);
    assert.equal(f.state.evidence, evidence);
  }
  assert.equal(f.state.discoveredFields.size, 10251);
});

test('real IndexedDB acquisition precedes no-op publication and fences a held late source', async /** Real durability and finality are independent of graph maintenance. */ () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(`(async()=>{
      const f=await fixture('noop-patch-real-idb');
      try {
        const n=(${noopPatchFixture.toString()})(sourceModules,f,256),old=n.state.evidence,map=n.page.neighbours;
        f.texts.set(n.file.path,'Changed prose');n.file.stat.mtime=2;
        const result=await n.builder.patchMarkdownFiles(n.state,[n.file],{awaitBodyWrite:true});
        ok(result.ok&&result.semanticNoops===1,'Current source no-op');
        ok(n.state.evidence===old&&n.page.neighbours===map,'Semantic views retained');
        equal(n.page.mtime,2,'Metadata committed');
        const info=await f.repository.inspect(n.file.path);ok(info,'Durable source inspection');
        ok((await f.cache.getBody(n.file.path,2))!==null,'Actual body persistence');
        equal(f.reads.length,1,'One body read');equal(f.parses.length,1,'One builder parse');
        const retained=n.hot.get(n.file.path),mtime=n.page.mtime,fields=n.state.discoveredFields;
        f.texts.set(n.file.path,'Later prose');n.file.stat.mtime=3;
        let entered,release;
        const gate=new Promise(/** Retain the explicit late-source release capability. */ r=>release=r),
          started=new Promise(/** Signal actual admission before retiring the owner. */ r=>entered=r);
        const acquire=f.acquisition.acquire;
        /** This fault injection holds the real acquisition, not a substitute durability result. */
        f.acquisition.acquire=function(...args){entered();return gate.then(/** Resume the original receiver after release. */ ()=>acquire.apply(this,args));};
        try {
          const pending=n.builder.patchMarkdownFiles(n.state,[n.file],{awaitBodyWrite:true});await started;
          n.retire();release();const late=await pending;ok(late.cancelled,'Late source cancelled');
          ok(n.hot.get(n.file.path)===retained&&n.page.mtime===mtime,'No half metadata publication');
          ok(n.state.evidence===old&&n.state.discoveredFields===fields,'No semantic/field publication');
        }finally{f.acquisition.acquire=acquire;release();}
        return true;
      }finally{f.close();}
    })()`), true);
  } finally { await browser.cleanup(); }
});
