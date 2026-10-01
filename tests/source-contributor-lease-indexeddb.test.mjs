/** Real IndexedDB retirement checks for the retained SI4 lease fix, independent of rejected S2b. */
import assert from "node:assert/strict";
import test from "node:test";
import { chromiumHarness } from "./support/browserTypeScript.mjs";
import { contributorBrowserBundle, contributorBrowserInitialize } from "./support/contributorBrowserFixture.mjs";

const bundle = await contributorBrowserBundle();

test("real Chromium retired contributor lease: aborted cleanup, retry and version safety", { timeout: 90000 }, async t => {
  const browser = await chromiumHarness(bundle);
  try {
    await browser.evaluate(contributorBrowserInitialize);

    await t.test("an aborted lease deletion remains pinned until a later exact cleanup commits", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,name='si4-lease-abort',f=await fixture(name),other=new M.KplexIndexedDbCache(name);
        f.add('A.md','');await f.acquire();const discovery=await f.build();
        const stamp=discovery.host.stamp,owner={kind:'host',id:'catalog'};
        equal(await f.repository.markContributorHostDirty({epoch:stamp.epoch,from:0,to:1,kind:'environment'}),'ready','Durable host ticket');
        const originalDelete=IDBObjectStore.prototype.delete;let attempts=0;
        try{
          IDBObjectStore.prototype.delete=function(key){
            if(this.name==='meta'&&String(key).startsWith('source-impact-lease:')){attempts++;this.transaction.abort();}
            return originalDelete.call(this,key);
          };
          equal(await f.repository.withContributorJournal(owner,()=>true,async reader=>{
            equal(reader.record.subject.kind,'host','Real historical reader');return true;
          }),true,'Read result does not turn cleanup failure into authority');
        }finally{IDBObjectStore.prototype.delete=originalDelete;}
        equal(attempts,2,'Original and cleanup-only handles each attempted deletion once');
        equal(f.repository.impactReaders.size,1,'Retired pin retains local retry ownership');
        const db=await other.open();
        equal(await value(db.transaction('meta').objectStore('meta').index(M.SOURCE_IMPACT_LEASE_INDEX).count()),1,'Aborted deletion remains durable');
        equal(await f.repository.flush(),true,'Explicit flush drives the later retry');
        equal(f.repository.impactReaders.size,0,'Only committed cleanup retires local ownership');
        equal(await value(db.transaction('meta').objectStore('meta').index(M.SOURCE_IMPACT_LEASE_INDEX).count()),0,'Other connection sees committed removal');
        equal((await other.sources.readContributorJournal(owner)).status,'unknown','Cleanup cannot select an impact or root');
        other.close();f.close();return true;
      })()`), true);
    });

    await t.test("cleanup-only reopen cannot create or upgrade a database", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules;
        for(const version of [null,7,9]){
          const name='si4-lease-version-'+version,cache=new M.KplexIndexedDbCache(name),database=dbName(name);
          if(version!==null){const db=await rawOpen(database,version,db=>db.createObjectStore('meta',{keyPath:'key'}));db.close();}
          try{
            equal(await cache.releaseContributorLease({key:'source-impact-lease:retired',impactSlot:0}),false,'No compatible existing database');
            const found=(await indexedDB.databases()).find(db=>db.name===database);
            if(version===null)ok(!found,'Cleanup cannot create a missing database');
            else equal(found.version,version,'Cleanup cannot change database version');
          }finally{cache.close();}
        }
        return true;
      })()`), true);
    });
  } finally { await browser.cleanup(); }
});
