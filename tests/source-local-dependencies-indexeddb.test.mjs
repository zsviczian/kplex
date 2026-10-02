/** Delivery-1 source-local dependency integration: real Chromium IndexedDB, production acquisition/repository. */
import assert from "node:assert/strict";
import test from "node:test";
import { contributorBrowserBundle, contributorBrowserInitialize } from "./support/contributorBrowserFixture.mjs";
import { chromiumHarness } from "./support/browserTypeScript.mjs";

const bundle = await contributorBrowserBundle(["src/index/SourceRepository.ts"]);

const repairBrowserInitialize = `(() => {
  const M=sourceModules;
  window.r1Input=async(repo,id,prefix,count,duplicates=0)=>{
    const inspected=await repo.inspect(id),head=inspected.head,environment=await repo.observationDigest('r1-host');
    return {sourceId:id,physical:{identity:id+'-identity',path:id,mtime:(head?.physical.mtime??0)+1,size:count+duplicates+1,ctime:1},
      observation:{epoch:'r1',revision:(head?.observation.revision??0)+1,environment},expected:inspected.expected,
      families:{values:async()=>true,'body-urls':async()=>true,metadata:async emit=>{
        for(let i=0;i<count;i++)if(!await emit({kind:'field-name',fieldName:prefix+i,normalizedFieldName:prefix+i,surface:'frontmatter'}))return false;
        for(let i=0;i<duplicates;i++)if(!await emit({kind:'field-name',fieldName:prefix+'repeat',normalizedFieldName:prefix+'repeat',surface:'frontmatter'}))return false;
        return true;},resolution:async()=>true}};
  };
  window.r1FaultSession=async(cache,phase,mode='close')=>{
    const db=await cache.open(),control={phase,mode,hit:false,seen:[],live:true};let repository;
    const runtime={...M.sourceRepositoryRuntime(),localDependencyCheckpoint:point=>{
      control.seen.push(point);if(control.hit||point!==control.phase)return;control.hit=true;
      if(control.mode==='close')repository.close();else if(control.mode==='cancel')control.live=false;
    }};
    repository=new M.NeutralSourceRepository({open:async()=>db,failed:()=>{},unavailableReason:()=> 'storage-unavailable'},runtime);
    return {db,repository,control};
  };
  window.r1Run=(session,input)=>session.repository.replace(input,()=>session.control.live);
  return true;
})()`;

test("source-local semantic dependencies are incrementally activated, reusable, and bounded", { timeout: 180_000 }, async t => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(repairBrowserInitialize), true);

    await t.test("exact v8 source-local fixture upgrades additively to v9", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await fixture('local-r1-v8-template');
        try{
          f.add('A.md','Dormant:: [[LegacyGhost]]');f.add('B.md','Friends:: [[A]]');await f.acquire();ok(await f.acquisition.reconcile(),'Seed local owners');
          await f.build();ok(await f.cache.putBody('cached.md',1,M.parseBodyMetadata('Field:: [[A]]')),'Seed body cache');
          const db=await f.cache.open();await edit(db,['meta','pages','evidence','snapshotChunks'],tx=>{
            tx.objectStore('meta').put({key:'active',schema:3,generation:'r1-v8',createdAt:1,vaultSignature:'v',settingsSignature:'s',discoveredFields:[],pageChunkCount:1,evidenceChunkCount:1});
            tx.objectStore('pages').put({generation:'r1-v8',path:'retained',value:{retained:true}});tx.objectStore('evidence').put({generation:'r1-v8',key:'retained',value:{retained:true}});
            tx.objectStore('snapshotChunks').put({generation:'r1-v8',kind:'pages',index:0,values:[]});
          });
          const excluded=M.SOURCE_LOCAL_REPAIR_STORE,names=[...db.objectStoreNames].filter(name=>name!==excluded),schema=[],rows={};
          for(const name of names){
            const store=db.transaction(name).objectStore(name);schema.push({name,keyPath:store.keyPath,autoIncrement:store.autoIncrement,indexes:[...store.indexNames].map(index=>{const item=store.index(index);return {name:index,keyPath:item.keyPath,unique:item.unique,multiEntry:item.multiEntry};})});
            rows[name]=await value(store.getAll());
          }
          rows.meta=rows.meta.map(row=>row.key===M.SOURCE_LOCAL_DEPENDENCY_STATE_KEY?{key:row.key,version:row.version,revision:row.revision,complete:row.complete}:row);
          for(const required of ['pages','evidence','snapshotChunks','sourceHeads','sourceChunks','sourcePostings','bodies',M.SOURCE_DEPENDENCY_STORE,M.SOURCE_LOCAL_DEPENDENCY_STORE,M.SOURCE_LOCAL_OWNER_STORE,M.SOURCE_LOCAL_KEY_STORE]){
            ok(rows[required].length>0,'Seed accepted '+required);
          }
          f.close();
          const old=await rawOpen(dbName('local-r1-v8-upgrade'),8,created=>{for(const spec of schema){const store=created.createObjectStore(spec.name,{keyPath:spec.keyPath,autoIncrement:spec.autoIncrement});for(const index of spec.indexes)store.createIndex(index.name,index.keyPath,{unique:index.unique,multiEntry:index.multiEntry});}});
          await edit(old,names,tx=>{for(const name of names)for(const row of rows[name])tx.objectStore(name).put(row);});equal(old.version,8,'Exact old database version');old.close();
          const cache=new M.KplexIndexedDbCache('local-r1-v8-upgrade'),upgraded=await cache.open();equal(upgraded.version,9,'Additive v9 upgrade');
          for(const name of names){
            const expected=name==='meta'?rows.meta.map(row=>row.key===M.SOURCE_LOCAL_DEPENDENCY_STATE_KEY?{...row,pending:0}:row):rows[name];
            equal(await value(upgraded.transaction(name).objectStore(name).getAll()),expected,name+' preserved byte-for-byte except pending field migration');
          }
          ok(upgraded.objectStoreNames.contains(M.SOURCE_LOCAL_REPAIR_STORE),'Repair store added');equal(await value(upgraded.transaction(M.SOURCE_LOCAL_REPAIR_STORE).objectStore(M.SOURCE_LOCAL_REPAIR_STORE).count()),0,'No repair invented');
          equal((await value(upgraded.transaction('meta').objectStore('meta').get(M.SOURCE_LOCAL_DEPENDENCY_STATE_KEY))).pending,0,'Legacy state gains pending zero');cache.close();return true;
        }finally{try{f.close();}catch{}}
      })()`), true);
    });

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

    await t.test("large repair interruptions resume exactly once without partial lookup publication", async () => {
      const measured = await browser.evaluate(`(async()=>{
        const M=sourceModules,phases=['before-local-staging','after-local-staging-page','after-local-activation','after-local-old-count-batch','after-local-new-count-batch','before-local-repair-retire'],results=[];
        for(const phase of phases){
          const vault='local-r1-fault-'+phase,cache=new M.KplexIndexedDbCache(vault),r=cache.sources;ok(await cache.open(),'Open '+phase);
          equal((await r.replace(await r1Input(r,'A.md','old-',780))).outcome,'activated','Seed large A '+phase);
          equal((await r.replace(await r1Input(r,'B.md','b-',4))).outcome,'activated','Seed unrelated B '+phase);
          equal(await r.completeLocalDependencyInventory(),'ready','Initial inventory '+phase);
          const bBefore=(await r.inspect('B.md')).head,oldKey=M.sourceLocalDependencyKey('field','old-0'),newKey=M.sourceLocalDependencyKey('field','new-0');
          let lookup=await r.lookupLocalDependencies([oldKey]);equal(lookup.outcome,'ready','Old authority ready '+phase);equal(lookup.value.sources.map(s=>s.head.sourceId),['A.md'],'Old authority owner '+phase);
          const session=await r1FaultSession(cache,phase),write=await r1Run(session,await r1Input(session.repository,'A.md','new-',780));ok(session.control.hit,'Injected '+phase);
          ok(write.outcome==='cancelled'||write.outcome==='activated','Durable interruption outcome '+phase+': '+write.outcome);
          const readerCache=new M.KplexIndexedDbCache(vault),db=await readerCache.open();ok(db,'Second connection '+phase);const reader=readerCache.sources,state=await value(db.transaction('meta').objectStore('meta').get(M.SOURCE_LOCAL_DEPENDENCY_STATE_KEY)),repair=await value(db.transaction(M.SOURCE_LOCAL_REPAIR_STORE).objectStore(M.SOURCE_LOCAL_REPAIR_STORE).get('A.md'));
          if(phase==='before-local-staging'||phase==='after-local-staging-page'){
            equal(state.pending,0,'Pre-activation has no selected repair '+phase);lookup=await reader.lookupLocalDependencies([oldKey]);equal(lookup.outcome,'ready','Old lookup remains authoritative '+phase);equal(lookup.value.sources.map(s=>s.head.sourceId),['A.md'],'Old owner remains '+phase);
            lookup=await reader.lookupLocalDependencies([newKey]);equal(lookup.outcome,'ready','Staging rows are non-authoritative '+phase);equal(lookup.value.sources,[],'No staged owner leaks '+phase);
            if(phase==='after-local-staging-page')ok(repair&&repair.fromRevision===repair.toRevision&&repair.fromRecords>0&&repair.fromRecords<=M.SOURCE_MAX_BATCH_RECORDS,'Bounded staging marker survives interruption');else equal(repair,undefined,'No staging before first page');
            equal(await reader.completeLocalDependencyInventory(),'ready','Abandoned staging reclaimed '+phase);
            equal((await reader.replace(await r1Input(reader,'A.md','new-',780))).outcome,'activated','Retry activates '+phase);
          }else{
            equal(state.pending,1,'Selected repair publishes pending '+phase);ok(repair&&repair.fromRevision&&repair.toRevision,'Selected repair journal '+phase);
            lookup=await reader.lookupLocalDependencies([oldKey]);equal(lookup.reason,'dependency-pending','No old partial publication '+phase);lookup=await reader.lookupLocalDependencies([newKey]);equal(lookup.reason,'dependency-pending','No new partial publication '+phase);
            equal(await reader.cleanupRevision('A.md',repair.fromRevision),false,'Active old repair side protected '+phase);equal(await reader.cleanupRevision('A.md',repair.toRevision),false,'Active new repair side protected '+phase);
            equal(await reader.completeLocalDependencyInventory(),'ready','Repair resumes '+phase);
          }
          equal(await reader.completeLocalDependencyInventory(),'ready','Final inventory '+phase);
          lookup=await reader.lookupLocalDependencies([oldKey]);equal(lookup.outcome,'ready','Old key authenticated after '+phase);equal(lookup.value.sources,[],'Old owner removed '+phase);
          lookup=await reader.lookupLocalDependencies([newKey]);equal(lookup.outcome,'ready','New key authenticated after '+phase);equal(lookup.value.sources.map(s=>s.head.sourceId),['A.md'],'New owner exact '+phase);
          equal((await reader.inspect('B.md')).head,bBefore,'Unrelated B head unchanged '+phase);
          const finalDb=await readerCache.open(),owner=await value(finalDb.transaction(M.SOURCE_LOCAL_OWNER_STORE).objectStore(M.SOURCE_LOCAL_OWNER_STORE).get('A.md')),finalState=await value(finalDb.transaction('meta').objectStore('meta').get(M.SOURCE_LOCAL_DEPENDENCY_STATE_KEY));
          ok(owner.records>3*M.SOURCE_MAX_BATCH_RECORDS,'Source crosses several repair batches '+phase);equal(finalState.pending,0,'Pending retired '+phase);equal(await value(finalDb.transaction(M.SOURCE_LOCAL_REPAIR_STORE).objectStore(M.SOURCE_LOCAL_REPAIR_STORE).count()),0,'Journal retired '+phase);
          results.push({phase,records:owner.records,checkpoints:session.control.seen.length});readerCache.close();cache.close();
        }
        return results;
      })()`);
      assert.deepEqual(measured.map(entry => entry.phase), [
        "before-local-staging", "after-local-staging-page", "after-local-activation",
        "after-local-old-count-batch", "after-local-new-count-batch", "before-local-repair-retire",
      ]);
      assert.ok(measured.every(entry => entry.records > 768));
      t.diagnostic(`SI4-R1 FAULT MATRIX ${JSON.stringify(measured)}`);
    });

    await t.test("cancellation retry, repeated keys, and bounded staging cleanup stay exact", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,cache=new M.KplexIndexedDbCache('local-r1-cleanup'),r=cache.sources,db=await cache.open();
        equal((await r.replace(await r1Input(r,'A.md','oldc-',32))).outcome,'activated','Seed cancellation source');equal(await r.completeLocalDependencyInventory(),'ready','Seed inventory');
        const cancelled=await r1FaultSession(cache,'after-local-staging-page','cancel'),cancelledResult=await r1Run(cancelled,await r1Input(cancelled.repository,'A.md','cancelled-',700));
        equal(cancelledResult.outcome,'cancelled','Cancellation returned');ok(cancelled.control.hit,'Cancellation injected');
        equal(await value(db.transaction(M.SOURCE_LOCAL_REPAIR_STORE).objectStore(M.SOURCE_LOCAL_REPAIR_STORE).get('A.md')),undefined,'Cancelled staging marker reclaimed');
        const selected=(await r.inspect('A.md')).head,rowsAfterCancel=await value(db.transaction(M.SOURCE_LOCAL_DEPENDENCY_STORE).objectStore(M.SOURCE_LOCAL_DEPENDENCY_STORE).getAll());
        equal([...new Set(rowsAfterCancel.filter(row=>row.sourceId==='A.md').map(row=>row.sourceRevision))],[selected.sourceRevision],'Cancelled staging rows reclaimed');
        equal((await cancelled.repository.replace(await r1Input(cancelled.repository,'A.md','retry-',700))).outcome,'activated','Cancellation retry activates');equal(await cancelled.repository.completeLocalDependencyInventory(),'ready','Retry inventory');
        let lookup=await cancelled.repository.lookupLocalDependencies([M.sourceLocalDependencyKey('field','retry-0')]);equal(lookup.outcome,'ready','Retry lookup');equal(lookup.value.sources.map(s=>s.head.sourceId),['A.md'],'Retry owner');

        equal((await r.replace(await r1Input(r,'Dup.md','dup-',5,7))).outcome,'activated','Seed repeated keys');equal(await r.completeLocalDependencyInventory(),'ready','Repeated inventory');
        const repeatKey=M.sourceLocalDependencyKey('field','dup-repeat');lookup=await r.lookupLocalDependencies([repeatKey]);equal(lookup.outcome,'ready','Repeated lookup');equal(lookup.value.sources.map(s=>s.head.sourceId),['Dup.md'],'Repeated rows return one source');
        equal((await value(db.transaction(M.SOURCE_LOCAL_KEY_STORE).objectStore(M.SOURCE_LOCAL_KEY_STORE).get(repeatKey))).count,7,'Row-count representation exact');
        equal((await r.replace(await r1Input(r,'Dup.md','dup-',6,9))).outcome,'activated','Replace repeated keys');equal(await r.completeLocalDependencyInventory(),'ready','Repeated replacement inventory');
        lookup=await r.lookupLocalDependencies([repeatKey]);equal(lookup.value.sources.map(s=>s.head.sourceId),['Dup.md'],'Replacement still unique');equal((await value(db.transaction(M.SOURCE_LOCAL_KEY_STORE).objectStore(M.SOURCE_LOCAL_KEY_STORE).get(repeatKey))).count,9,'Repeated count repaired exactly');
        const dupOwner=await value(db.transaction(M.SOURCE_LOCAL_OWNER_STORE).objectStore(M.SOURCE_LOCAL_OWNER_STORE).get('Dup.md'));equal(await r.cleanupRevision('Dup.md',dupOwner.sourceRevision),false,'Selected owner revision protected');
        const retired='retired-unselected',retiredKey=M.sourceLocalDependencyKey('field','retired');await edit(db,[M.SOURCE_LOCAL_DEPENDENCY_STORE],tx=>tx.objectStore(M.SOURCE_LOCAL_DEPENDENCY_STORE).put({version:1,sourceId:'Dup.md',sourceRevision:retired,index:0,key:retiredKey}));
        ok(await r.cleanupRevision('Dup.md',retired),'Unselected retired revision reclaimed');equal(await value(db.transaction(M.SOURCE_LOCAL_DEPENDENCY_STORE).objectStore(M.SOURCE_LOCAL_DEPENDENCY_STORE).get(['Dup.md',retired,0])),undefined,'Retired row deleted');

        const orphanRevision='orphan-stage',orphanKey=M.sourceLocalDependencyKey('field','orphan'),orphanRows=300;await edit(db,[M.SOURCE_LOCAL_DEPENDENCY_STORE,M.SOURCE_LOCAL_REPAIR_STORE],tx=>{
          const rows=tx.objectStore(M.SOURCE_LOCAL_DEPENDENCY_STORE);for(let i=0;i<orphanRows;i++)rows.put({version:1,sourceId:'Orphan.md',sourceRevision:orphanRevision,index:i,key:orphanKey});
          tx.objectStore(M.SOURCE_LOCAL_REPAIR_STORE).put({version:1,sourceId:'Orphan.md',fromRevision:orphanRevision,fromRecords:orphanRows,fromIndex:0,toRevision:orphanRevision,toRecords:orphanRows,toIndex:0});
        });
        ok(await r.cleanupRevision('Orphan.md',orphanRevision),'cleanupRevision reclaims abandoned staging');equal(await value(db.transaction(M.SOURCE_LOCAL_REPAIR_STORE).objectStore(M.SOURCE_LOCAL_REPAIR_STORE).get('Orphan.md')),undefined,'Abandoned marker retired');
        equal(await value(db.transaction(M.SOURCE_LOCAL_DEPENDENCY_STORE).objectStore(M.SOURCE_LOCAL_DEPENDENCY_STORE).index(M.SOURCE_LOCAL_REVISION_INDEX).count(IDBKeyRange.only(['Orphan.md',orphanRevision]))),0,'Abandoned rows reclaimed in bounded pages');
        cancelled.repository.close();cache.close();return true;
      })()`), true);
    });

    await t.test("abandoned backfill staging under the selected source head is reclaimed without making cleanupRevision unsafe", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,cache=new M.KplexIndexedDbCache('local-r1-backfill-stage'),r=cache.sources;ok(await cache.open(),'Open backfill staging fixture');
        equal((await r.replace(await r1Input(r,'A.md','backfill-',40))).outcome,'activated','Seed selected source');equal(await r.completeLocalDependencyInventory(),'ready','Seed inventory');
        const db=await cache.open(),head=(await r.inspect('A.md')).head,state=await value(db.transaction('meta').objectStore('meta').get(M.SOURCE_LOCAL_DEPENDENCY_STATE_KEY)),rows=300,key=M.sourceLocalDependencyKey('field','abandoned-backfill');
        await edit(db,['meta',M.SOURCE_LOCAL_DEPENDENCY_STORE,M.SOURCE_LOCAL_OWNER_STORE,M.SOURCE_LOCAL_KEY_STORE,M.SOURCE_LOCAL_REPAIR_STORE],tx=>{
          tx.objectStore(M.SOURCE_LOCAL_DEPENDENCY_STORE).clear();tx.objectStore(M.SOURCE_LOCAL_OWNER_STORE).clear();tx.objectStore(M.SOURCE_LOCAL_KEY_STORE).clear();tx.objectStore(M.SOURCE_LOCAL_REPAIR_STORE).clear();
          tx.objectStore('meta').put({...state,revision:state.revision+1,complete:false,pending:0});const local=tx.objectStore(M.SOURCE_LOCAL_DEPENDENCY_STORE);
          for(let i=0;i<rows;i++)local.put({version:1,sourceId:'A.md',sourceRevision:head.sourceRevision,index:i,key});
          tx.objectStore(M.SOURCE_LOCAL_REPAIR_STORE).put({version:1,sourceId:'A.md',fromRevision:head.sourceRevision,fromRecords:rows,fromIndex:0,toRevision:head.sourceRevision,toRecords:rows,toIndex:0});
        });
        equal(await r.cleanupRevision('A.md',head.sourceRevision),false,'cleanupRevision never reclaims the selected head revision');
        equal(await value(db.transaction(M.SOURCE_LOCAL_DEPENDENCY_STORE).objectStore(M.SOURCE_LOCAL_DEPENDENCY_STORE).index(M.SOURCE_LOCAL_REVISION_INDEX).count(IDBKeyRange.only(['A.md',head.sourceRevision]))),rows,'Selected-head staging untouched by cleanupRevision');
        ok(await value(db.transaction(M.SOURCE_LOCAL_REPAIR_STORE).objectStore(M.SOURCE_LOCAL_REPAIR_STORE).get('A.md')),'Selected-head staging marker preserved for backfill recovery');
        equal(await r.ensureLocalDependencies('A.md',7,9),'ready','Backfill path reclaims private staging and selects rebuilt owner');equal(await r.completeLocalDependencyInventory(),'ready','Backfill inventory closes');
        const owner=await value(db.transaction(M.SOURCE_LOCAL_OWNER_STORE).objectStore(M.SOURCE_LOCAL_OWNER_STORE).get('A.md'));equal(owner.sourceRevision,head.sourceRevision,'Backfill selects the unchanged source head');equal(owner.order,7,'Backfill structural order');equal(owner.markdownOrder,9,'Backfill markdown order');
        const lookup=await r.lookupLocalDependencies([M.sourceLocalDependencyKey('field','backfill-0')]);equal(lookup.outcome,'ready','Rebuilt local dependency authenticates');equal(lookup.value.sources.map(s=>s.head.sourceId),['A.md'],'Rebuilt owner exact');
        equal(await value(db.transaction(M.SOURCE_LOCAL_REPAIR_STORE).objectStore(M.SOURCE_LOCAL_REPAIR_STORE).get('A.md')),undefined,'Backfill repair fully retired');cache.close();return true;
      })()`), true);
    });

    await t.test("an aborted repair transaction rolls back its batch and resumes exactly once", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,cache=new M.KplexIndexedDbCache('local-r1-abort-repair'),r=cache.sources;ok(await cache.open(),'Open repair abort fixture');
        equal((await r.replace(await r1Input(r,'A.md','abort-old-',700))).outcome,'activated','Seed repair abort source');equal(await r.completeLocalDependencyInventory(),'ready','Seed repair abort inventory');
        const session=await r1FaultSession(cache,'never'),put=IDBObjectStore.prototype.put;let fired=false;IDBObjectStore.prototype.put=function(value,...args){
          if(this.name===M.SOURCE_LOCAL_REPAIR_STORE&&!fired&&value?.sourceId==='A.md'&&value.fromRevision!==value.toRevision&&(value.fromIndex>0||value.toIndex>0)){
            fired=true;const request=put.call(this,value,...args);this.transaction.abort();return request;
          }
          return put.call(this,value,...args);
        };
        let outcome;try{outcome=await session.repository.replace(await r1Input(session.repository,'A.md','abort-new-',700));}finally{IDBObjectStore.prototype.put=put;}
        ok(fired,'Repair transaction abort injected');equal(outcome.outcome,'activated','Atomic head selection survives later repair abort');
        const recoveryCache=new M.KplexIndexedDbCache('local-r1-abort-repair'),recovery=recoveryCache.sources,db=await recoveryCache.open(),repair=await value(db.transaction(M.SOURCE_LOCAL_REPAIR_STORE).objectStore(M.SOURCE_LOCAL_REPAIR_STORE).get('A.md'));ok(repair&&repair.fromIndex===0&&repair.toIndex===0,'Aborted batch rolls journal cursor back');
        const state=await value(db.transaction('meta').objectStore('meta').get(M.SOURCE_LOCAL_DEPENDENCY_STATE_KEY));equal(state.pending,1,'Aborted repair remains pending');
        let lookup=await recovery.lookupLocalDependencies([M.sourceLocalDependencyKey('field','abort-new-0')]);equal(lookup.outcome,'pending-acquisition','Aborted repair never publishes a partial owner set');equal(lookup.reason,'dependency-pending','Aborted repair reason');
        equal(await recovery.completeLocalDependencyInventory(),'ready','Aborted repair resumes');
        lookup=await recovery.lookupLocalDependencies([M.sourceLocalDependencyKey('field','abort-old-0')]);equal(lookup.outcome,'ready','Old key authenticates');equal(lookup.value.sources,[],'Old membership decremented once');
        lookup=await recovery.lookupLocalDependencies([M.sourceLocalDependencyKey('field','abort-new-0')]);equal(lookup.outcome,'ready','New key authenticates');equal(lookup.value.sources.map(s=>s.head.sourceId),['A.md'],'New membership incremented once');
        equal((await value(db.transaction(M.SOURCE_LOCAL_KEY_STORE).objectStore(M.SOURCE_LOCAL_KEY_STORE).get(M.sourceLocalDependencyKey('field','abort-new-0')))).count,1,'New count exactly once after abort retry');
        session.repository.close();recoveryCache.close();cache.close();return true;
      })()`), true);
    });

    await t.test("a second connection can claim staging without allowing the live stager to activate partial rows", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,vault='local-r1-cross-connection',cache=new M.KplexIndexedDbCache(vault),r=cache.sources;ok(await cache.open(),'Writer cache');
        equal((await r.replace(await r1Input(r,'A.md','stable-',8))).outcome,'activated','Seed selected A');equal(await r.completeLocalDependencyInventory(),'ready','Seed inventory');const stable=(await r.inspect('A.md')).head;
        const writer=await r1FaultSession(cache,'never'),base=await r1Input(writer.repository,'A.md','race-',700);let entered,release;const staged=new Promise(resolve=>entered=resolve),gate=new Promise(resolve=>release=resolve);
        const input={...base,families:{...base.families,metadata:async emit=>{for(let i=0;i<700;i++){if(!await emit({kind:'field-name',fieldName:'race-'+i,normalizedFieldName:'race-'+i,surface:'frontmatter'}))return false;if(i===300){entered();await gate;}}return true;}}};
        const writing=writer.repository.replace(input);await staged;const db=await cache.open(),marker=await value(db.transaction(M.SOURCE_LOCAL_REPAIR_STORE).objectStore(M.SOURCE_LOCAL_REPAIR_STORE).get('A.md'));ok(marker&&marker.fromRecords>=256,'First staging page committed');
        const cleanerCache=new M.KplexIndexedDbCache(vault);ok(await cleanerCache.open(),'Independent cleaner connection');ok(await cleanerCache.sources.cleanupRevision('A.md',marker.fromRevision),'Cleaner claims and reclaims staging');release();
        const result=await writing;ok(result.outcome!=='activated','Fenced stager cannot activate after cleanup claim');equal((await cleanerCache.sources.inspect('A.md')).head,stable,'Selected head remains byte-for-byte stable');
        let lookup=await cleanerCache.sources.lookupLocalDependencies([M.sourceLocalDependencyKey('field','stable-0')]);equal(lookup.outcome,'ready','Old authority remains readable');equal(lookup.value.sources.map(s=>s.head.sourceId),['A.md'],'Old owner exact');
        equal(await value((await cleanerCache.open()).transaction(M.SOURCE_LOCAL_REPAIR_STORE).objectStore(M.SOURCE_LOCAL_REPAIR_STORE).get('A.md')),undefined,'No staging marker leak');writer.repository.close();cleanerCache.close();cache.close();return true;
      })()`), true);
    });

    await t.test("selected repair resumes after a real Chromium process restart", async () => {
      const before = await browser.evaluate(`(async()=>{
        const M=sourceModules,vault='local-r1-process-restart',cache=new M.KplexIndexedDbCache(vault),r=cache.sources;ok(await cache.open(),'Open restart seed');
        equal((await r.replace(await r1Input(r,'A.md','restart-old-',780))).outcome,'activated','Seed restart A');
        equal((await r.replace(await r1Input(r,'B.md','restart-b-',4))).outcome,'activated','Seed restart B');equal(await r.completeLocalDependencyInventory(),'ready','Seed restart inventory');
        const bHead=(await r.inspect('B.md')).head,session=await r1FaultSession(cache,'after-local-activation'),outcome=await r1Run(session,await r1Input(session.repository,'A.md','restart-new-',780));
        ok(session.control.hit,'Activation checkpoint reached');equal(outcome.outcome,'activated','Selected head committed before interruption');
        const db=await cache.open(),state=await value(db.transaction('meta').objectStore('meta').get(M.SOURCE_LOCAL_DEPENDENCY_STATE_KEY));equal(state.pending,1,'Selected repair remains pending across process boundary');
        const repair=await value(db.transaction(M.SOURCE_LOCAL_REPAIR_STORE).objectStore(M.SOURCE_LOCAL_REPAIR_STORE).get('A.md'));ok(repair&&repair.fromRevision!==null&&repair.toRevision!==null,'Selected repair journal durable');
        session.repository.close();cache.close();return {bHead};
      })()`);

      await browser.restart();
      assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
      assert.equal(await browser.evaluate(repairBrowserInitialize), true);
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,cache=new M.KplexIndexedDbCache('local-r1-process-restart'),r=cache.sources;ok(await cache.open(),'Open after Chromium restart');
        try{
          let lookup=await r.lookupLocalDependencies([M.sourceLocalDependencyKey('field','restart-new-779')]);equal(lookup.outcome,'pending-acquisition','Restart does not expose partial selected repair');equal(lookup.reason,'dependency-pending','Pending reason survives restart');
          equal(await r.completeLocalDependencyInventory(),'ready','Restart resumes selected repair');
          lookup=await r.lookupLocalDependencies([M.sourceLocalDependencyKey('field','restart-old-0')]);equal(lookup.outcome,'ready','Old key authenticates after repair');equal(lookup.value.sources,[],'Old authority retired exactly once');
          lookup=await r.lookupLocalDependencies([M.sourceLocalDependencyKey('field','restart-new-779')]);equal(lookup.outcome,'ready','New key authenticates after repair');equal(lookup.value.sources.map(s=>s.head.sourceId),['A.md'],'New authority exact after restart');
          equal((await r.inspect('B.md')).head,${JSON.stringify(before.bHead)},'Unrelated B head byte-for-byte stable across restart');
          const db=await cache.open(),state=await value(db.transaction('meta').objectStore('meta').get(M.SOURCE_LOCAL_DEPENDENCY_STATE_KEY));equal(state.pending,0,'Pending drains after restart');equal(await value(db.transaction(M.SOURCE_LOCAL_REPAIR_STORE).objectStore(M.SOURCE_LOCAL_REPAIR_STORE).count()),0,'Repair journal retired after restart');
          return true;
        }finally{cache.close();}
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
