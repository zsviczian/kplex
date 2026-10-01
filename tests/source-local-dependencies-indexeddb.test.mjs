/** Delivery-1 source-local dependency integration: real Chromium IndexedDB, production acquisition/repository. */
import assert from "node:assert/strict";
import test from "node:test";
import { contributorBrowserBundle, contributorBrowserInitialize } from "./support/contributorBrowserFixture.mjs";
import { chromiumHarness } from "./support/browserTypeScript.mjs";

const bundle = await contributorBrowserBundle();

test("source-local semantic dependencies are incrementally activated, reusable, and bounded", { timeout: 180_000 }, async t => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);

    await t.test("replacement and tombstone change only the selected source-local memberships", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await fixture('local-dependency-lifecycle');
        try{
          const A=f.add('A.md','Dormant:: [[OldGhost]]\\nFriends:: [[B]]');f.add('B.md','Opposes:: [[A]]');f.add('C.md','');
          await f.acquire();ok(await f.acquisition.reconcile(),'Initial local inventory closes');ok(f.acquisition.hasSemanticDependencies(),'Settings dependency path ready');
          const oldKey=M.sourceLocalDependencyKey('literal','OldGhost'),newKey=M.sourceLocalDependencyKey('literal','NewGhost');
          let selected=await f.repository.lookupLocalDependencies([oldKey]);equal(selected.outcome,'ready','Old literal lookup');equal(selected.value.sources.map(s=>s.head.sourceId),['A.md'],'Old owner');
          const bBefore=(await f.repository.inspect('B.md')).head;
          const db=await f.cache.open();equal(await value(db.transaction(M.SOURCE_DEPENDENCY_STORE).objectStore(M.SOURCE_DEPENDENCY_STORE).count()),0,'Production did not build global contributor catalog');
          f.reads.length=0;f.parses.length=0;
          f.texts.set('A.md','Dormant:: [[NewGhost]]\\nFriends:: [[B]]');A.stat={...A.stat,mtime:A.stat.mtime+1,size:f.texts.get('A.md').length};
          const replacement=await f.acquisition.acquire(A,M.parseBodyMetadata(f.texts.get('A.md')));
          ok(replacement.current&&replacement.saved,'Changed source activates directly');
          equal(f.reads,[],'Caller-owned body avoids a vault read');equal(f.parses,[],'Caller-owned parse avoids duplicate parsing');
          selected=await f.repository.lookupLocalDependencies([oldKey]);equal(selected.outcome,'ready','Removed literal authenticates');equal(selected.value.sources,[],'Removed membership is empty');
          selected=await f.repository.lookupLocalDependencies([newKey]);equal(selected.outcome,'ready','New literal lookup');equal(selected.value.sources.map(s=>s.head.sourceId),['A.md'],'Replacement owner');
          equal((await f.repository.inspect('B.md')).head,bBefore,'Unrelated head is byte-for-byte unchanged');
          const aHead=(await f.repository.inspect('A.md')).head;
          const aRows=await value(db.transaction(M.SOURCE_LOCAL_DEPENDENCY_STORE).objectStore(M.SOURCE_LOCAL_DEPENDENCY_STORE).index(M.SOURCE_LOCAL_REVISION_INDEX).getAll(IDBKeyRange.only(['A.md',aHead.sourceRevision])));
          ok(aRows.length>0,'Current A memberships durable');
          const allRows=await value(db.transaction(M.SOURCE_LOCAL_DEPENDENCY_STORE).objectStore(M.SOURCE_LOCAL_DEPENDENCY_STORE).getAll());
          equal([...new Set(allRows.filter(r=>r.sourceId==='A.md').map(r=>r.sourceRevision))],[aHead.sourceRevision],'Old selected local revision retired atomically');

          f.files.delete('A.md');f.metadata.delete('A.md');f.texts.delete('A.md');f.app.vault.trigger('delete',A);ok(await f.repository.flush(),'Deletion durable');
          selected=await f.repository.lookupLocalDependencies([newKey]);equal(selected.outcome,'ready','Deleted literal authenticates');equal(selected.value.sources,[],'Tombstone removed membership');
          const owner=await value(db.transaction(M.SOURCE_LOCAL_OWNER_STORE).objectStore(M.SOURCE_LOCAL_OWNER_STORE).get('A.md'));equal(owner.state,'tombstone','Tombstone owner selected');equal(owner.records,0,'Tombstone has no memberships');
          equal((await f.repository.inspect('B.md')).head,bBefore,'Deletion does not rewrite unrelated source');
          equal(await value(db.transaction(M.SOURCE_DEPENDENCY_STORE).objectStore(M.SOURCE_DEPENDENCY_STORE).count()),0,'No global dependency pages after lifecycle changes');
          return true;
        }finally{f.close();}
      })()`), true);
    });

    await t.test("clean restart reuses owners and affected local corruption fails closed without deleting unrelated heads", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await fixture('local-dependency-restart');let cache2,acquisition2;
        try{
          f.add('A.md','Dormant:: [[RestartGhost]]');f.add('B.md','Friends:: [[A]]');await f.acquire();ok(await f.acquisition.reconcile(),'Initial inventory');
          const db=await f.cache.open(),headsBefore=await value(db.transaction('sourceHeads').objectStore('sourceHeads').getAll()),ownersBefore=await value(db.transaction(M.SOURCE_LOCAL_OWNER_STORE).objectStore(M.SOURCE_LOCAL_OWNER_STORE).getAll());
          const resolutionBefore=Object.fromEntries(headsBefore.map(h=>[h.sourceId,h.families.resolution.revision]));
          f.acquisition.close();f.cache.close();let reads=0,parses=0;
          const forbiddenRead=async()=>{reads++;throw new Error('Clean restart must not read Markdown');};f.app.vault.read=f.app.vault.cachedRead=forbiddenRead;
          cache2=new M.KplexIndexedDbCache('local-dependency-restart');ok(await cache2.open(),'Reopen durable database');
          acquisition2=new M.ObsidianSourceAcquisition(f.app,cache2,async()=>{parses++;throw new Error('Clean restart must not parse Markdown');});
          ok(await acquisition2.reconcile(),'Clean-restart local inventory reuses durable owners');ok(acquisition2.hasSemanticDependencies(),'Restart settings dependency path ready');
          const reopened=await cache2.open(),headsAfter=await value(reopened.transaction('sourceHeads').objectStore('sourceHeads').getAll()),ownersAfter=await value(reopened.transaction(M.SOURCE_LOCAL_OWNER_STORE).objectStore(M.SOURCE_LOCAL_OWNER_STORE).getAll());
          equal(headsAfter,headsBefore,'New process epoch does not rewrite source heads');equal(ownersAfter,ownersBefore,'Matching local owners reused without rewrite');equal(reads,0,'No Markdown reads');equal(parses,0,'No Markdown parses');
          equal(Object.fromEntries(headsAfter.map(h=>[h.sourceId,h.families.resolution.revision])),resolutionBefore,'No resolution refresh on restart');
          const ghost=M.sourceLocalDependencyKey('literal','RestartGhost'),bKey=M.sourceLocalDependencyKey('node','B.md');
          let result=await cache2.sources.lookupLocalDependencies([ghost]);equal(result.outcome,'ready','Restart lookup');equal(result.value.sources.map(s=>s.head.sourceId),['A.md'],'Durable owner reused');
          const aOwner=ownersAfter.find(o=>o.sourceId==='A.md'),rows=await value(reopened.transaction(M.SOURCE_LOCAL_DEPENDENCY_STORE).objectStore(M.SOURCE_LOCAL_DEPENDENCY_STORE).index(M.SOURCE_LOCAL_REVISION_INDEX).getAll(IDBKeyRange.only(['A.md',aOwner.sourceRevision]))),victim=rows.find(r=>r.key===ghost);ok(victim,'Affected membership row exists');
          await edit(reopened,[M.SOURCE_LOCAL_DEPENDENCY_STORE],tx=>tx.objectStore(M.SOURCE_LOCAL_DEPENDENCY_STORE).delete(['A.md',aOwner.sourceRevision,victim.index]));
          result=await cache2.sources.lookupLocalDependencies([ghost]);equal(result.outcome,'invalid-family','Missing affected membership fails closed');equal(result.reason,'dependency-invalid','Corruption reason');
          result=await cache2.sources.lookupLocalDependencies([bKey]);equal(result.outcome,'ready','Unrelated key remains queryable');equal(result.value.sources.map(s=>s.head.sourceId),['B.md'],'Unrelated owner retained');
          await edit(reopened,[M.SOURCE_LOCAL_OWNER_STORE],tx=>tx.objectStore(M.SOURCE_LOCAL_OWNER_STORE).delete('A.md'));
          equal(await acquisition2.reconcile(),false,'Complete inventory refuses missing selected owner');
          const bAfter=(await cache2.sources.inspect('B.md')).head;equal(bAfter,headsBefore.find(h=>h.sourceId==='B.md'),'Corruption handling does not delete unrelated head');
          return true;
        }finally{acquisition2?.close();cache2?.close();f.close();}
      })()`), true);
    });

    await t.test("20,015-owner skew is deterministic and a hot dependency rejects before any row scan", async () => {
      const measured = await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await fixture('local-dependency-hot');
        try{
          const hot=M.sourceLocalDependencyKey('node','Hot.md'),owners=20015;let projected=0;
          for(let i=0;i<owners;i++)for(const key of M.sourceLocalStoredDependencyKeys('S'+i+'.md',{kind:'host-link',state:'resolved',target:'Hot.md',count:1}))if(key===hot)projected++;
          equal(projected,owners,'Deterministic source-local projector cardinality');
          const db=await f.cache.open();await edit(db,['meta',M.SOURCE_LOCAL_KEY_STORE],tx=>{
            tx.objectStore('meta').put(M.sourceLocalDependencyState(1,true));tx.objectStore(M.SOURCE_LOCAL_KEY_STORE).put({version:1,key:hot,count:owners});
          });
          let scans=0;const cursor=IDBIndex.prototype.openCursor;IDBIndex.prototype.openCursor=function(...args){if(this.objectStore?.name===M.SOURCE_LOCAL_DEPENDENCY_STORE)scans++;return cursor.apply(this,args);};
          let result;try{result=await f.repository.lookupLocalDependencies([hot]);}finally{IDBIndex.prototype.openCursor=cursor;}
          equal(result.outcome,'pending-acquisition','Hot key is bounded backpressure');equal(result.reason,'backpressure','Explicit bound');equal(scans,0,'Count certificate rejects before membership scan');
          equal(await value(db.transaction(M.SOURCE_DEPENDENCY_STORE).objectStore(M.SOURCE_DEPENDENCY_STORE).count()),0,'No global catalog pages');
          return {owners,projected,scans,outcome:result.outcome,reason:result.reason};
        }finally{f.close();}
      })()`);
      assert.deepEqual(measured, { owners: 20015, projected: 20015, scans: 0, outcome: "pending-acquisition", reason: "backpressure" });
      t.diagnostic(`SOURCE-LOCAL HOT-KEY MEASUREMENT ${JSON.stringify(measured)}`);
    });
  } finally { await browser.cleanup(); }
});
