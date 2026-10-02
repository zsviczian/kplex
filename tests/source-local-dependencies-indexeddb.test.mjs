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
  window.r2DowngradeResolverOwner=async(db,sourceId)=>{
    const owner=await value(db.transaction(M.SOURCE_LOCAL_OWNER_STORE).objectStore(M.SOURCE_LOCAL_OWNER_STORE).get(sourceId));
    ok(owner&&owner.version===M.SOURCE_LOCAL_DEPENDENCY_VERSION,'Current resolver owner required');
    const rows=await value(db.transaction(M.SOURCE_LOCAL_DEPENDENCY_STORE).objectStore(M.SOURCE_LOCAL_DEPENDENCY_STORE)
      .index(M.SOURCE_LOCAL_REVISION_INDEX).getAll(IDBKeyRange.only([sourceId,owner.sourceRevision])));
    const keep=rows.filter(row=>JSON.parse(row.key)[0]!=='resolver').map((row,index)=>({...row,index}));
    const resolverKeys=[...new Set(rows.filter(row=>JSON.parse(row.key)[0]==='resolver').map(row=>row.key))];
    await edit(db,[M.SOURCE_LOCAL_DEPENDENCY_STORE,M.SOURCE_LOCAL_OWNER_STORE,M.SOURCE_LOCAL_KEY_STORE],tx=>{
      tx.objectStore(M.SOURCE_LOCAL_DEPENDENCY_STORE).delete(IDBKeyRange.bound([sourceId,owner.sourceRevision,0],[sourceId,owner.sourceRevision,Number.MAX_SAFE_INTEGER]));
      for(const row of keep)tx.objectStore(M.SOURCE_LOCAL_DEPENDENCY_STORE).put(row);
      for(const key of resolverKeys)tx.objectStore(M.SOURCE_LOCAL_KEY_STORE).delete(key);
      tx.objectStore(M.SOURCE_LOCAL_OWNER_STORE).put({...owner,version:1,records:keep.length});
    });
    return {...owner,version:1,records:keep.length};
  };
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

    await t.test("accepted R1 owners lazily add resolver-neutral memberships without rewriting source heads", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await fixture('local-r2-resolver-upgrade');
        try{
          f.add('Folder/Ref.md','Friends:: [[../Target#Heading]] [[AliasTarget#^block]]');
          await f.acquire();ok(await f.acquisition.reconcile(),'Seed current owner');
          const headBefore=(await f.repository.inspect('Folder/Ref.md')).head,db=await f.cache.open();
          await r2DowngradeResolverOwner(db,'Folder/Ref.md');
          const key=M.sourceLocalResolverDependencyKey('../Target#Heading','Folder/Ref.md');
          let lookup=await f.repository.lookupLocalDependencies([key]);equal(lookup.outcome,'ready','Accepted R1 owner remains closed-world before additive upgrade');
          equal(lookup.value.sources,[],'R1 fixture has no resolver-neutral row');
          equal(await f.repository.ensureLocalDependencies('Folder/Ref.md',0,0),'ready','Lazy R1 to R2 owner upgrade completes');
          const owner=await value(db.transaction(M.SOURCE_LOCAL_OWNER_STORE).objectStore(M.SOURCE_LOCAL_OWNER_STORE).get('Folder/Ref.md'));
          equal(owner.version,M.SOURCE_LOCAL_DEPENDENCY_VERSION,'Owner version upgraded in place');
          lookup=await f.repository.lookupLocalDependencies([key]);equal(lookup.outcome,'ready','Resolver token authenticates');
          equal(lookup.value.sources.map(s=>s.head.sourceId),['Folder/Ref.md'],'Relative/subpath referrer selected');
          equal((await f.repository.inspect('Folder/Ref.md')).head,headBefore,'Source head remains byte-for-byte unchanged');
          equal(await value(db.transaction(M.SOURCE_DEPENDENCY_STORE).objectStore(M.SOURCE_DEPENDENCY_STORE).count()),0,'Upgrade does not bootstrap global contributor catalog');
          equal(await value(db.transaction(M.SOURCE_LOCAL_REPAIR_STORE).objectStore(M.SOURCE_LOCAL_REPAIR_STORE).count()),0,'Upgrade count journal retires exactly once');
          return true;
        }finally{f.close();}
      })()`), true);
    });

    await t.test("interrupted resolver-token owner upgrade resumes exactly once with closed-world lookup", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,vault='local-r2-resolver-upgrade-restart',f=await fixture(vault);let recovery=null;
        try{
          const body=Array.from({length:700},(_,i)=>'Field'+i+':: [[Target'+i+'#Heading]]').join('\\n');f.add('A.md',body);await f.acquire();ok(await f.acquisition.reconcile(),'Seed v2 owner');
          const db=await f.cache.open(),headBefore=(await f.repository.inspect('A.md')).head;await r2DowngradeResolverOwner(db,'A.md');
          const session=await r1FaultSession(f.cache,'after-local-new-count-batch'),result=await session.repository.ensureLocalDependencies('A.md',0,0);
          ok(session.control.hit,'Resolver upgrade count checkpoint reached');equal(result,'cancelled','Interrupted owner upgrade stops current continuation');
          recovery=new M.KplexIndexedDbCache(vault);ok(await recovery.open(),'Open independent recovery connection');
          let lookup=await recovery.sources.lookupLocalDependencies([M.sourceLocalResolverDependencyKey('Target699#Heading')]);equal(lookup.outcome,'pending-acquisition','Partial resolver counts never publish');equal(lookup.reason,'dependency-pending','Pending maintenance is explicit');
          equal(await recovery.sources.completeLocalDependencyInventory(),'ready','Interrupted resolver upgrade resumes');
          lookup=await recovery.sources.lookupLocalDependencies([M.sourceLocalResolverDependencyKey('Target699#Heading')]);equal(lookup.outcome,'ready','Recovered resolver key authenticates');equal(lookup.value.sources.map(s=>s.head.sourceId),['A.md'],'Recovered owner selected exactly once');
          const finalDb=await recovery.open(),state=await value(finalDb.transaction('meta').objectStore('meta').get(M.SOURCE_LOCAL_DEPENDENCY_STATE_KEY)),repairCount=await value(finalDb.transaction(M.SOURCE_LOCAL_REPAIR_STORE).objectStore(M.SOURCE_LOCAL_REPAIR_STORE).count());
          equal(state.pending,0,'Pending slot retires once');equal(repairCount,0,'Upgrade journal retires once');equal((await recovery.sources.inspect('A.md')).head,headBefore,'Maintenance upgrade never rewrites source head');
          const keyState=await value(finalDb.transaction(M.SOURCE_LOCAL_KEY_STORE).objectStore(M.SOURCE_LOCAL_KEY_STORE).get(M.sourceLocalResolverDependencyKey('Target699#Heading')));equal(keyState.count,1,'Recovered count is exact, not double-applied');
          equal(await value(finalDb.transaction(M.SOURCE_DEPENDENCY_STORE).objectStore(M.SOURCE_DEPENDENCY_STORE).count()),0,'Recovery does not create global catalog rows');
          return true;
        }finally{recovery?.close();f.close();}
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

    await t.test("live target and alias changes repair only proven relative/subpath referrers without unchanged body IO", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await fixture('local-r2-live-impact');
        const settle=async()=>{for(let attempt=0;attempt<4;attempt++)if(await f.acquisition.reconcile())return true;return false;};
        const assertLocal=label=>{const work=f.work.snapshot();equal(work.markdownEnumerations,0,label+' does not enumerate Markdown inventory');equal(work.fileEnumerations,0,label+' does not enumerate Vault files');equal(work.rootEnumerations,0,label+' does not rebuild structural order');equal(work.headPages,0,label+' does not page durable heads');
          ok(!work.inspections.some(id=>id.startsWith('Unrelated-')),label+' inspects no unrelated source');ok(!work.visits.some(id=>id.startsWith('Unrelated-')),label+' visits no unrelated source family');ok(!work.writes.some(id=>id.includes('Unrelated-')),label+' writes no unrelated source');return work;};
        const resolutionTargets=async id=>{const rows=[];equal(await f.repository.visit(id,'resolution',records=>{rows.push(...records);return true;}),'ready','Read selected resolution');return rows.filter(r=>r.kind==='reference-resolution').map(r=>({raw:r.rawTarget,target:r.target?.entity?.id,kind:r.target?.entity?.kind}));};
        try{
          const ref=f.add('Folder/Ref.md','Friends:: [[../Target#Heading]] [[AliasTarget#^block]]'),other=f.add('Other.md','Friends:: [[Else]]');
          for(let index=0;index<256;index++)f.add('Unrelated-'+String(index).padStart(3,'0')+'.md','Status:: plain');
          const fallback=f.app.metadataCache.getFirstLinkpathDest;
          f.app.metadataCache.getFirstLinkpathDest=(literal,source)=>{
            if(literal==='../Target')return f.files.get('Target.md')??null;
            if(literal==='AliasTarget')return [...f.files.values()].find(file=>file.extension==='md'&&(f.metadata.get(file.path)?.frontmatter?.aliases??[]).includes('AliasTarget'))??null;
            return fallback(literal,source);
          };
          await f.acquire();ok(await f.acquisition.reconcile(),'Initial local authority closes');
          const refBefore=(await f.repository.inspect(ref.path)).head,otherBefore=(await f.repository.inspect(other.path)).head;
          equal((await resolutionTargets(ref.path)).map(r=>r.kind),['unresolved','unresolved'],'Relative and alias targets begin unresolved');
          f.reads.length=0;f.parses.length=0;f.work.reset();

          const target=f.add('Target.md','',{aliases:['AliasTarget']});f.app.vault.trigger('create',target);ok(await settle(),'Create converges');
          const createWork=assertLocal('Create');ok(createWork.localLookups>0,'Create uses source-local dependency lookup');
          const created=await resolutionTargets(ref.path);equal(created.map(r=>r.target),['Target.md','Target.md'],'Create resolves relative/subpath and alias references');
          ok((await f.repository.inspect(ref.path)).head.sourceRevision!==refBefore.sourceRevision,'Inbound referrer receives a new selected resolution revision');
          equal((await f.repository.inspect(other.path)).head,otherBefore,'Unrelated durable head remains byte-for-byte unchanged');
          equal(f.reads,['Target.md'],'Only the newly created source body is read');equal(f.parses.length,1,'Only the newly created source body is parsed');

          f.reads.length=0;f.parses.length=0;f.work.reset();f.metadata.set(target.path,{...f.metadata.get(target.path),frontmatter:{aliases:[]}});f.app.metadataCache.trigger('changed',target);ok(await settle(),'Alias removal converges');
          assertLocal('Alias removal');
          let aliasChanged=await resolutionTargets(ref.path);equal(aliasChanged.map(r=>r.target),['Target.md','AliasTarget'],'Alias removal preserves relative target and makes alias unresolved');
          equal(aliasChanged.map(r=>r.kind),['document','unresolved'],'Alias-only change replays resolver output');equal((await f.repository.inspect(other.path)).head,otherBefore,'Alias removal keeps unrelated owner exact');equal(f.reads,[],'Alias-only change reuses target body');equal(f.parses,[],'Alias-only change reparses no Markdown');
          f.work.reset();f.metadata.set(target.path,{...f.metadata.get(target.path),frontmatter:{aliases:['AliasTarget']}});f.app.metadataCache.trigger('changed',target);ok(await settle(),'Alias restoration converges');
          assertLocal('Alias restoration');
          aliasChanged=await resolutionTargets(ref.path);equal(aliasChanged.map(r=>r.target),['Target.md','Target.md'],'Alias restoration repairs inbound alias');equal(f.reads,[],'Alias restoration reuses target body');equal(f.parses,[],'Alias restoration reparses no Markdown');

          f.reads.length=0;f.parses.length=0;f.work.reset();
          const oldPath=target.path,frontmatter=f.metadata.get(oldPath),body=f.texts.get(oldPath);f.files.delete(oldPath);f.metadata.delete(oldPath);f.texts.delete(oldPath);
          target.path='Renamed.md';target.name='Renamed.md';target.basename='Renamed';f.files.set(target.path,target);f.metadata.set(target.path,frontmatter);f.texts.set(target.path,body);
          f.app.vault.trigger('rename',target,oldPath);ok(await settle(),'Rename converges');
          assertLocal('Rename');
          const renamed=await resolutionTargets(ref.path);equal(renamed.map(r=>r.target),['../Target','Renamed.md'],'Old relative path becomes unresolved while alias follows renamed target');
          equal(renamed.map(r=>r.kind),['unresolved','document'],'Resolver remains the final binding authority');
          equal((await f.repository.inspect(oldPath)).reason,'tombstone','Old target path is durably tombstoned');
          equal((await f.repository.inspect(other.path)).head,otherBefore,'Rename does not rewrite unrelated owner');
          equal(f.reads,[],'Rename reuses immutable bodies');equal(f.parses,[],'Rename performs no Markdown parse');

          f.reads.length=0;f.parses.length=0;f.work.reset();f.files.delete(target.path);f.app.vault.trigger('delete',target);f.metadata.delete(target.path);f.texts.delete(target.path);ok(await settle(),'Delete converges');
          assertLocal('Delete');
          const deleted=await resolutionTargets(ref.path);equal(deleted.map(r=>r.kind),['unresolved','unresolved'],'Delete repairs inbound alias and relative resolution');
          equal((await f.repository.inspect(target.path)).reason,'tombstone','Deleted target remains tombstoned');
          equal((await f.repository.inspect(other.path)).head,otherBefore,'Delete keeps unrelated durable head exact');equal(f.reads,[],'Delete does not reread referrer');equal(f.parses,[],'Delete does not reparse referrer');

          f.reads.length=0;f.parses.length=0;f.work.reset();const recreated=f.add('Target.md','',{aliases:['AliasTarget']});f.app.vault.trigger('create',recreated);ok(await settle(),'Recreate converges');
          assertLocal('Recreate');
          const restored=await resolutionTargets(ref.path);equal(restored.map(r=>r.target),['Target.md','Target.md'],'Recreate repairs both inbound bindings');
          equal((await f.repository.inspect(other.path)).head,otherBefore,'Recreate keeps unrelated durable head exact');equal(f.reads,['Target.md'],'Only recreated body is read');equal(f.parses.length,1,'Only recreated body is parsed');
          const db=await f.cache.open();equal(await value(db.transaction(M.SOURCE_DEPENDENCY_STORE).objectStore(M.SOURCE_DEPENDENCY_STORE).count()),0,'Known-impact maintenance never bootstraps global contributor catalog');
          return true;
        }finally{f.close();}
      })()`), true);
    });

    await t.test("native create rename modify delete and recreate resolver waves stay source-local", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await fixture('local-r2-native-event-waves');
        const settle=async()=>{for(let attempt=0;attempt<6;attempt++)if(await f.acquisition.reconcile())return true;return false;};
        const resolutionTargets=async id=>{const rows=[];equal(await f.repository.visit(id,'resolution',records=>{rows.push(...records);return true;}),'ready','Read selected resolution');return rows.filter(r=>r.kind==='reference-resolution').map(r=>({raw:r.rawTarget,target:r.target?.entity?.id,kind:r.target?.entity?.kind}));};
        const assertLocal=label=>{const work=f.work.snapshot();equal(work.markdownEnumerations,0,label+' performs zero full Markdown enumeration');equal(work.fileEnumerations,0,label+' performs zero Vault file enumeration');equal(work.rootEnumerations,0,label+' performs zero structural traversal');equal(work.headPages,0,label+' performs zero durable-head paging');
          ok(!work.inspections.some(id=>id==='Other.md'||id.startsWith('Unrelated-')),label+' inspects no unrelated source');ok(!work.visits.some(id=>id.startsWith('Other.md:')||id.startsWith('Unrelated-')),label+' visits no unrelated family');ok(!work.writes.some(id=>id.includes('Other.md')||id.includes('Unrelated-')),label+' acquires/writes no unrelated source');return work;};
        const closeKnownWave=label=>{const before=f.acquisition.getMaintenanceRevision();f.app.metadataCache.trigger('resolved');equal(f.acquisition.getMaintenanceRevision(),before,label+' resolved close does not advance the global maintenance fence');};
        try{
          const ref=f.add('Folder/Ref.md','Friends:: [[../Target#Heading]] [[AliasTarget#^block]]'),other=f.add('Other.md','Friends:: [[Else]]');f.add('Unrelated-1.md','');f.add('Unrelated-2.md','');
          const fallback=f.app.metadataCache.getFirstLinkpathDest;
          f.app.metadataCache.getFirstLinkpathDest=(literal,source)=>{
            if(literal==='../Target')return f.files.get('Target.md')??null;
            if(literal==='AliasTarget')return [...f.files.values()].find(file=>file.extension==='md'&&(f.metadata.get(file.path)?.frontmatter?.aliases??[]).includes('AliasTarget'))??null;
            return fallback(literal,source);
          };
          await f.acquire();ok(await f.acquisition.reconcile(),'Four-file source-local authority closes');ok(f.acquisition.hasSemanticDependencies(),'Initial maintenance readiness open');
          const otherBefore=(await f.repository.inspect(other.path)).head;f.reads.length=0;f.parses.length=0;f.work.reset();

          const target=f.add('Target.md','',{aliases:['AliasTarget']});f.app.vault.trigger('create',target);f.app.metadataCache.trigger('changed',target);ok(!f.acquisition.hasSemanticDependencies(),'Create closes maintenance readiness');closeKnownWave('Create');ok(await settle(),'Create native wave converges');ok(f.acquisition.hasSemanticDependencies(),'Create reopens maintenance readiness');assertLocal('Create');
          let targets=await resolutionTargets(ref.path);equal(targets.map(r=>r.target),['Target.md','Target.md'],'Create repairs proven relative and alias referrers');equal((await f.repository.inspect(other.path)).head,otherBefore,'Create keeps unrelated head exact');equal(f.reads,['Target.md'],'Create reads only the changed source');equal(f.parses.length,1,'Create parses only the changed source');

          f.reads.length=0;f.parses.length=0;f.work.reset();f.metadata.set(target.path,{...f.metadata.get(target.path),frontmatter:{aliases:[]}});target.stat={...target.stat,mtime:target.stat.mtime+1};f.app.vault.trigger('modify',target);f.app.metadataCache.trigger('changed',target);ok(!f.acquisition.hasSemanticDependencies(),'Modify closes maintenance readiness');closeKnownWave('Modify');ok(await settle(),'Modify native wave converges');ok(f.acquisition.hasSemanticDependencies(),'Modify reopens maintenance readiness');assertLocal('Modify');
          targets=await resolutionTargets(ref.path);equal(targets.map(r=>r.kind),['document','unresolved'],'Modify/alias wave refreshes only proven inbound resolution');equal((await f.repository.inspect(other.path)).head,otherBefore,'Modify keeps unrelated head exact');equal(f.reads,['Target.md'],'Modify reads only its changed source');equal(f.parses.length,1,'Modify parses only its changed source');

          f.reads.length=0;f.parses.length=0;f.work.reset();f.metadata.set(target.path,{...f.metadata.get(target.path),frontmatter:{aliases:['AliasTarget']}});const oldPath=target.path,frontmatter=f.metadata.get(oldPath),body=f.texts.get(oldPath);f.files.delete(oldPath);f.metadata.delete(oldPath);f.texts.delete(oldPath);target.path='Renamed.md';target.name='Renamed.md';target.basename='Renamed';f.files.set(target.path,target);f.metadata.set(target.path,frontmatter);f.texts.set(target.path,body);f.app.vault.trigger('rename',target,oldPath);ok(!f.acquisition.hasSemanticDependencies(),'Rename closes maintenance readiness');closeKnownWave('Rename');ok(await settle(),'Rename native wave converges');ok(f.acquisition.hasSemanticDependencies(),'Rename reopens maintenance readiness');assertLocal('Rename');
          targets=await resolutionTargets(ref.path);equal(targets.map(r=>r.target),['../Target','Renamed.md'],'Rename repairs path and alias bindings');equal((await f.repository.inspect(oldPath)).reason,'tombstone','Rename tombstones old source binding');equal((await f.repository.inspect(other.path)).head,otherBefore,'Rename keeps unrelated head exact');equal(f.reads,[],'Rename rereads no unchanged body');equal(f.parses,[],'Rename reparses no unchanged body');

          f.reads.length=0;f.parses.length=0;f.work.reset();f.files.delete(target.path);f.metadata.delete(target.path);f.texts.delete(target.path);f.app.vault.trigger('delete',target);ok(!f.acquisition.hasSemanticDependencies(),'Delete closes maintenance readiness');closeKnownWave('Delete');ok(await settle(),'Delete native wave converges');ok(f.acquisition.hasSemanticDependencies(),'Delete reopens maintenance readiness');assertLocal('Delete');
          targets=await resolutionTargets(ref.path);equal(targets.map(r=>r.kind),['unresolved','unresolved'],'Delete repairs proven inbound resolution');equal((await f.repository.inspect(other.path)).head,otherBefore,'Delete keeps unrelated head exact');equal(f.reads,[],'Delete rereads no unchanged body');equal(f.parses,[],'Delete reparses no unchanged body');

          f.reads.length=0;f.parses.length=0;f.work.reset();const recreated=f.add('Target.md','',{aliases:['AliasTarget']});f.app.vault.trigger('create',recreated);f.app.metadataCache.trigger('changed',recreated);closeKnownWave('Recreate');ok(await settle(),'Recreate native wave converges');ok(f.acquisition.hasSemanticDependencies(),'Recreate reopens maintenance readiness');assertLocal('Recreate');
          targets=await resolutionTargets(ref.path);equal(targets.map(r=>r.target),['Target.md','Target.md'],'Recreate repairs both inbound bindings');equal((await f.repository.inspect(other.path)).head,otherBefore,'Recreate keeps unrelated head exact');equal(f.reads,['Target.md'],'Recreate reads only recreated source');equal(f.parses.length,1,'Recreate parses only recreated source');

          // Two complete native waves can arrive synchronously before maintenance gets CPU time.
          f.reads.length=0;f.parses.length=0;f.work.reset();for(let index=0;index<2;index++){recreated.stat={...recreated.stat,mtime:recreated.stat.mtime+1};f.app.vault.trigger('modify',recreated);f.app.metadataCache.trigger('changed',recreated);closeKnownWave('Synchronous modify '+index);}ok(await settle(),'Synchronous native waves coalesce');assertLocal('Synchronous waves');equal(f.reads,['Target.md'],'Synchronous waves read the changed body once');equal(f.parses.length,1,'Synchronous waves parse the changed body once');

          // A later resolved event has no causal token and must take the uncertain cached-fact lane.
          f.reads.length=0;f.parses.length=0;f.work.reset();const beforeUnscoped=f.acquisition.getMaintenanceRevision();f.app.metadataCache.trigger('resolved');equal(f.acquisition.getMaintenanceRevision(),beforeUnscoped+1,'Later unscoped resolved advances exactly one maintenance fence');ok(!f.acquisition.hasSemanticDependencies(),'Unscoped resolved closes maintenance readiness');ok(await f.acquisition.reconcile(),'Later unscoped resolved converges');ok(f.acquisition.hasSemanticDependencies(),'Unscoped pass reopens maintenance readiness');const uncertain=f.work.snapshot();equal(uncertain.markdownEnumerations,1,'Unscoped pass enumerates cached Markdown inventory once');equal(uncertain.rootEnumerations,1,'Unscoped pass rebuilds structural order once');ok(uncertain.headPages>0,'Unscoped pass pages durable heads');equal(f.reads,[],'Unscoped pass rereads no unchanged Markdown');equal(f.parses,[],'Unscoped pass reparses no unchanged Markdown');
          return true;
        }finally{f.close();}
      })()`), true);
    });

    await t.test("production scheduler retries deferred known impacts without manual reconcile and keeps every native wave local", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await fixture('local-r2-production-scheduler');
        const resolutionTargets=async id=>{const rows=[];equal(await f.repository.visit(id,'resolution',records=>{rows.push(...records);return true;}),'ready','Read scheduled resolution');return rows.filter(r=>r.kind==='reference-resolution').map(r=>({raw:r.rawTarget,target:r.target?.entity?.id,kind:r.target?.entity?.kind}));};
        const waitReady=async label=>{const deadline=performance.now()+6000;while(performance.now()<deadline){if(f.acquisition.hasSemanticDependencies())return;await new Promise(resolve=>window.setTimeout(resolve,25));}throw new Error(label+' did not reopen source readiness from production scheduling');};
        const closeKnownWave=label=>{const before=f.acquisition.getMaintenanceRevision();f.app.metadataCache.trigger('resolved');equal(f.acquisition.getMaintenanceRevision(),before,label+' resolved close remains source-local');};
        const assertLocal=(label,acquisitions)=>{const work=f.work.snapshot();equal(work.markdownEnumerations,0,label+' getMarkdownFiles count');equal(work.fileEnumerations,0,label+' getFiles count');equal(work.rootEnumerations,0,label+' structural traversal count');equal(work.headPages,0,label+' durable-head page count');
          equal(work.inspections.filter(id=>id==='Other.md'||id.startsWith('Unrelated-')).length,0,label+' unrelated inspection count');equal(work.visits.filter(id=>id.startsWith('Other.md:')||id.startsWith('Unrelated-')).length,0,label+' unrelated visit count');equal(acquisitions.filter(id=>id==='Other.md'||id.startsWith('Unrelated-')).length,0,label+' unrelated acquisition count');equal(work.writes.filter(id=>id.includes('Other.md')||id.includes('Unrelated-')).length,0,label+' unrelated write count');};
        try{
          const ref=f.add('Folder/Ref.md','Friends:: [[../Target#Heading]] [[AliasTarget#^block]]'),other=f.add('Other.md','Friends:: [[Else]]');f.add('Unrelated-1.md','');f.add('Unrelated-2.md','');
          const fallback=f.app.metadataCache.getFirstLinkpathDest;
          f.app.metadataCache.getFirstLinkpathDest=(literal,source)=>{
            if(literal==='../Target')return f.files.get('Target.md')??null;
            if(literal==='AliasTarget')return [...f.files.values()].find(file=>file.extension==='md'&&(f.metadata.get(file.path)?.frontmatter?.aliases??[]).includes('AliasTarget'))??null;
            return fallback(literal,source);
          };
          await f.acquire();ok(await f.acquisition.reconcile(),'Initial authority closes before production scheduling');ok(f.acquisition.hasSemanticDependencies(),'Initial source readiness open');
          const otherBefore=(await f.repository.inspect(other.path)).head;
          const liveLookup=f.repository.lookupLocalDependencies.bind(f.repository);let transientLookups=0,totalLookupCalls=0;
          f.repository.lookupLocalDependencies=async(...args)=>{totalLookupCalls+=1;if(transientLookups>0){transientLookups-=1;return {outcome:'pending-acquisition',reason:'dependency-pending'};}return liveLookup(...args);};
          const liveAcquire=f.acquisition.acquire.bind(f.acquisition),acquisitions=[];f.acquisition.acquire=async(file,...args)=>{acquisitions.push(file.path);return liveAcquire(file,...args);};
          const beginWave=()=>{transientLookups=2;totalLookupCalls=0;acquisitions.length=0;f.reads.length=0;f.parses.length=0;f.work.reset();};
          const finishWave=async label=>{ok(!f.acquisition.hasSemanticDependencies(),label+' closes readiness synchronously');closeKnownWave(label);await waitReady(label);equal(totalLookupCalls,3,label+' performs exactly one deferred retry pass before automatic closure');assertLocal(label,acquisitions);equal((await f.repository.inspect(other.path)).head,otherBefore,label+' keeps unrelated source head exact');};
          f.acquisition.enableInventory();

          beginWave();const target=f.add('Target.md','',{aliases:['AliasTarget']});f.app.vault.trigger('create',target);f.app.metadataCache.trigger('changed',target);await finishWave('Create');
          let targets=await resolutionTargets(ref.path);equal(targets.map(r=>r.target),['Target.md','Target.md'],'Scheduled create repairs both proven referrers');equal(f.reads,['Target.md'],'Scheduled create reads only the new source body');equal(f.parses.length,1,'Scheduled create parses only the new source body');

          beginWave();f.metadata.set(target.path,{...f.metadata.get(target.path),frontmatter:{aliases:[]}});target.stat={...target.stat,mtime:target.stat.mtime+1};f.app.vault.trigger('modify',target);f.app.metadataCache.trigger('changed',target);await finishWave('Modify');
          targets=await resolutionTargets(ref.path);equal(targets.map(r=>r.kind),['document','unresolved'],'Scheduled modify repairs alias resolution');equal(f.reads,['Target.md'],'Scheduled modify reads only the changed source body');equal(f.parses.length,1,'Scheduled modify parses only the changed source body');

          beginWave();f.metadata.set(target.path,{...f.metadata.get(target.path),frontmatter:{aliases:['AliasTarget']}});const oldPath=target.path,frontmatter=f.metadata.get(oldPath),body=f.texts.get(oldPath);f.files.delete(oldPath);f.metadata.delete(oldPath);f.texts.delete(oldPath);target.path='Renamed.md';target.name='Renamed.md';target.basename='Renamed';f.files.set(target.path,target);f.metadata.set(target.path,frontmatter);f.texts.set(target.path,body);f.app.vault.trigger('rename',target,oldPath);await finishWave('Rename');
          targets=await resolutionTargets(ref.path);equal(targets.map(r=>r.target),['../Target','Renamed.md'],'Scheduled rename repairs path and alias bindings');equal((await f.repository.inspect(oldPath)).reason,'tombstone','Scheduled rename tombstones old source binding');equal(f.reads,[],'Scheduled rename rereads no unchanged body');equal(f.parses,[],'Scheduled rename reparses no unchanged body');

          beginWave();f.files.delete(target.path);f.metadata.delete(target.path);f.texts.delete(target.path);f.app.vault.trigger('delete',target);await finishWave('Delete');
          targets=await resolutionTargets(ref.path);equal(targets.map(r=>r.kind),['unresolved','unresolved'],'Scheduled delete repairs both inbound bindings');equal(f.reads,[],'Scheduled delete reads no body');equal(f.parses,[],'Scheduled delete parses no body');

          beginWave();const recreated=f.add('Target.md','',{aliases:['AliasTarget']});f.app.vault.trigger('create',recreated);f.app.metadataCache.trigger('changed',recreated);await finishWave('Recreate');
          targets=await resolutionTargets(ref.path);equal(targets.map(r=>r.target),['Target.md','Target.md'],'Scheduled recreate repairs both inbound bindings');equal(f.reads,['Target.md'],'Scheduled recreate reads only the recreated source body');equal(f.parses.length,1,'Scheduled recreate parses only the recreated source body');
          return true;
        }finally{f.close();}
      })()`), true);
    });

    await t.test("native resolved during reconciliation stays covered, while folder causes remain uncertain and unload cancels bounded state", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const setup=async vault=>{const f=await fixture(vault),target=f.add('Target.md','',{aliases:['AliasTarget']});f.add('Ref.md','Friends:: [[Target]] [[AliasTarget]]');f.add('Other.md','');f.app.metadataCache.getFirstLinkpathDest=literal=>literal==='Target'||literal==='AliasTarget'?target:null;await f.acquire();ok(await f.acquisition.reconcile(),'Initial authority closes');return {f,target};};
        const settle=async f=>{for(let attempt=0;attempt<6;attempt++)if(await f.acquisition.reconcile())return true;return false;};
        let first=null,second=null,firstTarget=null,secondTarget=null;
        try{
          ({f:first,target:firstTarget}=await setup('local-r2-native-inflight'));
          first.work.reset();first.reads.length=0;first.parses.length=0;
          const liveLookup=first.repository.lookupLocalDependencies.bind(first.repository);let releaseLookup,markStarted;const lookupStarted=new Promise(resolve=>{markStarted=resolve;});const lookupGate=new Promise(resolve=>{releaseLookup=resolve;});let held=true;
          first.repository.lookupLocalDependencies=async(...args)=>{if(held){held=false;markStarted();await lookupGate;}return liveLookup(...args);};
          firstTarget.stat={...firstTarget.stat,mtime:firstTarget.stat.mtime+1};first.app.vault.trigger('modify',firstTarget);first.app.metadataCache.trigger('changed',firstTarget);const beforeClose=first.acquisition.getMaintenanceRevision();first.app.metadataCache.trigger('resolved');equal(first.acquisition.getMaintenanceRevision(),beforeClose,'Resolved close before reconciliation remains covered');const pass=first.acquisition.reconcile();await lookupStarted;
          firstTarget.stat={...firstTarget.stat,mtime:firstTarget.stat.mtime+1};first.app.vault.trigger('modify',firstTarget);first.app.metadataCache.trigger('changed',firstTarget);const during=first.acquisition.getMaintenanceRevision();first.app.metadataCache.trigger('resolved');equal(first.acquisition.getMaintenanceRevision(),during,'Resolved arriving during reconciliation remains covered');releaseLookup();await pass;first.repository.lookupLocalDependencies=liveLookup;ok(await settle(first),'Superseding known event converges after in-flight pass');ok(first.acquisition.hasSemanticDependencies(),'Readiness reopens after in-flight known waves');let work=first.work.snapshot();equal(work.markdownEnumerations,0,'In-flight known waves never enumerate Markdown inventory');equal(work.headPages,0,'In-flight known waves never page durable heads');ok(!work.inspections.includes('Other.md'),'In-flight known waves inspect no unrelated source');ok(!work.visits.some(id=>id.startsWith('Other.md:')),'In-flight known waves visit no unrelated source');ok(!work.writes.some(id=>id.includes('Other.md')),'In-flight known waves write no unrelated source');

          // A folder/non-file cause is not proof that the resolver wave is source-local.
          first.work.reset();const folder=new window.ContributorFolder();folder.path='Empty';folder.name='Empty';const beforeFolder=first.acquisition.getMaintenanceRevision();first.app.vault.trigger('create',folder);const afterFolder=first.acquisition.getMaintenanceRevision();equal(afterFolder,beforeFolder+1,'Folder event advances its known maintenance observation');first.app.metadataCache.trigger('resolved');equal(first.acquisition.getMaintenanceRevision(),afterFolder+1,'Folder-following resolved remains uncertain');ok(await first.acquisition.reconcile(),'Folder uncertain pass converges');work=first.work.snapshot();equal(work.markdownEnumerations,1,'Folder uncertain pass enumerates cached Markdown inventory');ok(work.headPages>0,'Folder uncertain pass pages durable heads');

          ({f:second,target:secondTarget}=await setup('local-r2-native-unload'));second.work.reset();secondTarget.stat={...secondTarget.stat,mtime:secondTarget.stat.mtime+1};second.app.vault.trigger('modify',secondTarget);second.app.metadataCache.trigger('changed',secondTarget);const beforeUnloadClose=second.acquisition.getMaintenanceRevision();second.app.metadataCache.trigger('resolved');equal(second.acquisition.getMaintenanceRevision(),beforeUnloadClose,'Unload fixture known close is covered');second.acquisition.close();await Promise.resolve();await Promise.resolve();work=second.work.snapshot();equal(work.markdownEnumerations,0,'Unload starts no full Markdown enumeration');equal(work.headPages,0,'Unload starts no durable-head paging');ok(!work.writes.some(id=>id.includes('Other.md')),'Unload performs no unrelated write');second.close();second=null;
          return true;
        }finally{first?.close();second?.close();}
      })()`), true);
    });

    await t.test("known-event bursts coalesce while unscoped resolver waves take one uncertain cached-fact pass", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await fixture('local-r2-coalescing');
        const settle=async()=>{for(let attempt=0;attempt<4;attempt++)if(await f.acquisition.reconcile())return true;return false;};
        try{
          const ref=f.add('Ref.md','Friends:: [[Target]]'),target=f.add('Target.md','',{aliases:['AliasTarget']});
          for(let index=0;index<256;index++)f.add('Unrelated-'+String(index).padStart(3,'0')+'.md','Status:: plain');
          f.app.metadataCache.getFirstLinkpathDest=literal=>literal==='Target'||literal==='AliasTarget'?target:null;
          await f.acquire();ok(await f.acquisition.reconcile(),'Initial local authority closes');
          f.reads.length=0;f.parses.length=0;f.work.reset();
          for(let index=0;index<100;index++)f.app.metadataCache.trigger('changed',target);
          ok(await settle(),'Known burst converges');
          let work=f.work.snapshot();
          equal(work.markdownEnumerations,0,'Known burst performs no Markdown inventory enumeration');equal(work.rootEnumerations,0,'Known burst performs no structural-order rebuild');equal(work.headPages,0,'Known burst performs no durable-head page pass');
          equal(work.localLookups,1,'Known burst performs one coalesced source-local fan-out lookup');
          ok(!work.inspections.some(id=>id.startsWith('Unrelated-')),'Known burst inspects no unrelated source');ok(!work.visits.some(id=>id.startsWith('Unrelated-')),'Known burst visits no unrelated source');ok(!work.writes.some(id=>id.includes('Unrelated-')),'Known burst writes no unrelated source');
          equal(f.reads,[],'Known burst rereads no Markdown');equal(f.parses,[],'Known burst reparses no Markdown');

          f.reads.length=0;f.parses.length=0;f.work.reset();const before=f.acquisition.getMaintenanceRevision();
          for(let index=0;index<20;index++)f.app.metadataCache.trigger('resolved');
          equal(f.acquisition.getMaintenanceRevision(),before+1,'Unscoped resolver burst advances one maintenance fence');
          ok(await f.acquisition.reconcile(),'Unscoped resolver burst converges in one pass');
          work=f.work.snapshot();equal(work.markdownEnumerations,1,'Uncertain resolver burst enumerates cached Markdown inventory once');equal(work.rootEnumerations,1,'Uncertain resolver burst rebuilds structural order once');equal(work.headPages,3,'Uncertain resolver burst reads the 258 durable heads in three bounded pages');
          equal(f.reads,[],'Uncertain resolver burst rereads no unchanged Markdown');equal(f.parses,[],'Uncertain resolver burst reparses no unchanged Markdown');
          return true;
        }finally{f.close();}
      })()`), true);
    });

    await t.test("idle polling is observation-only and invalid local fan-out advances the GraphIndex maintenance fence", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await fixture('local-r2-idle-promotion');
        try{
          const ref=f.add('Ref.md','Friends:: [[Target]]'),target=f.add('Target.md','');
          for(let index=0;index<256;index++)f.add('Unrelated-'+String(index).padStart(3,'0')+'.md','Status:: plain');
          f.app.metadataCache.getFirstLinkpathDest=literal=>literal==='Target'?target:null;
          await f.acquire();ok(await f.acquisition.reconcile(),'Initial local authority closes');

          const nativeSetTimeout=window.setTimeout,nativeClearTimeout=window.clearTimeout;let idlePoll=null;const fakeTimer=987654321;
          window.setTimeout=(callback,delay)=>{if(delay===30000){idlePoll=callback;return fakeTimer;}return nativeSetTimeout(callback,delay);};
          window.clearTimeout=id=>{if(id!==fakeTimer)nativeClearTimeout(id);};
          try{
            f.acquisition.enableInventory();ok(idlePoll,'Idle poll scheduled');f.work.reset();f.reads.length=0;f.parses.length=0;
            idlePoll();await Promise.resolve();
            const idle=f.work.snapshot();equal(idle.markdownEnumerations,0,'Idle poll enumerates no Markdown');equal(idle.fileEnumerations,0,'Idle poll enumerates no Vault files');equal(idle.rootEnumerations,0,'Idle poll performs no structural traversal');equal(idle.headPages,0,'Idle poll pages no heads');equal(idle.inspections,[],'Idle poll inspects no source');equal(idle.visits,[],'Idle poll visits no family');equal(idle.writes,[],'Idle poll writes nothing');equal(f.reads,[],'Idle poll reads no bodies');equal(f.parses,[],'Idle poll parses no bodies');
          }finally{window.setTimeout=nativeSetTimeout;window.clearTimeout=nativeClearTimeout;}

          const liveLookup=f.repository.lookupLocalDependencies.bind(f.repository);let rejectOnce=true;
          f.repository.lookupLocalDependencies=async(...args)=>rejectOnce?(rejectOnce=false,{outcome:'pending-acquisition',reason:'dependency-invalid'}):liveLookup(...args);
          const before=f.acquisition.getMaintenanceRevision();f.app.metadataCache.trigger('changed',target);
          equal(f.acquisition.hasSemanticDependencies(),false,'Known event immediately makes relationship writes non-ready');
          for(let attempt=0;attempt<30&&f.acquisition.getMaintenanceRevision()<before+2;attempt++)await new Promise(resolve=>nativeSetTimeout(resolve,0));
          equal(f.acquisition.getMaintenanceRevision(),before+2,'Invalid local fan-out promotion advances the same maintenance fence again');
          equal(f.acquisition.hasSemanticDependencies(),false,'Promoted uncertain maintenance remains non-ready until reconciliation');
          f.repository.lookupLocalDependencies=liveLookup;
          ok(await f.acquisition.reconcile(),'Promoted uncertain maintenance converges');ok(f.acquisition.hasSemanticDependencies(),'Current authority reopens only after uncertain reconciliation');
          equal((await f.repository.inspect(ref.path)).reason,'ready','Referrer remains selected after promoted repair');
          return true;
        }finally{f.close();}
      })()`), true);
    });

    await t.test("offline create delete and recreate repair inbound owners on restart without reading unchanged Markdown", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,vault='local-r2-restart-impact',f=await fixture(vault);let cache2=null,acquisition2=null;
        const resolutionTargets=async(repo,id)=>{const rows=[];equal(await repo.visit(id,'resolution',records=>{rows.push(...records);return true;}),'ready','Read restart resolution');return rows.filter(r=>r.kind==='reference-resolution').map(r=>r.target?.entity?.id);};
        const settle=async acquisition=>{for(let attempt=0;attempt<4;attempt++)if(await acquisition.reconcile())return true;return false;};
        try{
          const ref=f.add('Folder/Ref.md','Friends:: [[../Target#Heading]] [[AliasTarget#^block]]'),other=f.add('Other.md','');
          const fallback=f.app.metadataCache.getFirstLinkpathDest;
          f.app.metadataCache.getFirstLinkpathDest=(literal,source)=>{
            if(literal==='../Target')return f.files.get('Target.md')??null;
            if(literal==='AliasTarget')return [...f.files.values()].find(file=>file.extension==='md'&&(f.metadata.get(file.path)?.frontmatter?.aliases??[]).includes('AliasTarget'))??null;
            return fallback(literal,source);
          };
          await f.acquire();ok(await f.acquisition.reconcile(),'Seed restart authority');
          const otherBefore=(await f.repository.inspect(other.path)).head;f.acquisition.close();f.cache.close();

          f.add('Target.md','',{aliases:['AliasTarget']});f.reads.length=0;f.parses.length=0;let parses=0;
          cache2=new M.KplexIndexedDbCache(vault);ok(await cache2.open(),'Reopen after offline create');acquisition2=new M.ObsidianSourceAcquisition(f.app,cache2,async text=>{parses++;return M.parseBodyMetadata(text);});
          ok(await settle(acquisition2),'Offline create restart converges');equal(await resolutionTargets(cache2.sources,ref.path),['Target.md','Target.md'],'Restart create repairs unresolved relative and alias referrers');
          equal((await cache2.sources.inspect(other.path)).head,otherBefore,'Unrelated restart head remains byte-for-byte reusable');equal(f.reads,['Target.md'],'Restart reads only offline-created source');equal(parses,1,'Restart parses only offline-created source');
          acquisition2.close();cache2.close();acquisition2=null;cache2=null;

          const target=f.files.get('Target.md'),frontmatter=f.metadata.get('Target.md'),body=f.texts.get('Target.md');f.files.delete('Target.md');f.metadata.delete('Target.md');f.texts.delete('Target.md');target.path='Renamed.md';target.name='Renamed.md';target.basename='Renamed';f.files.set(target.path,target);f.metadata.set(target.path,frontmatter);f.texts.set(target.path,body);f.reads.length=0;parses=0;
          cache2=new M.KplexIndexedDbCache(vault);ok(await cache2.open(),'Reopen after offline rename');acquisition2=new M.ObsidianSourceAcquisition(f.app,cache2,async text=>{parses++;return M.parseBodyMetadata(text);});
          ok(await settle(acquisition2),'Offline rename restart converges');equal(await resolutionTargets(cache2.sources,ref.path),['../Target','Renamed.md'],'Restart rename repairs relative target loss while alias follows renamed source');
          equal((await cache2.sources.inspect('Target.md')).reason,'tombstone','Restart rename tombstones old path');equal((await cache2.sources.inspect(other.path)).head,otherBefore,'Offline rename does not rewrite unrelated head');equal(f.reads,['Renamed.md'],'Restart rename reads only topology-changed source');equal(parses,1,'Restart rename parses only topology-changed source');
          acquisition2.close();cache2.close();acquisition2=null;cache2=null;

          f.files.delete('Renamed.md');f.metadata.delete('Renamed.md');f.texts.delete('Renamed.md');f.reads.length=0;parses=0;
          cache2=new M.KplexIndexedDbCache(vault);ok(await cache2.open(),'Reopen after offline delete');acquisition2=new M.ObsidianSourceAcquisition(f.app,cache2,async text=>{parses++;return M.parseBodyMetadata(text);});
          ok(await settle(acquisition2),'Offline delete restart converges');equal(await resolutionTargets(cache2.sources,ref.path),['../Target','AliasTarget'],'Restart delete repairs both inbound bindings to unresolved identities');
          equal((await cache2.sources.inspect('Renamed.md')).reason,'tombstone','Restart deletion selects durable tombstone');equal((await cache2.sources.inspect(other.path)).head,otherBefore,'Offline delete does not rewrite unrelated head');equal(f.reads,[],'Offline delete rereads no unchanged Markdown');equal(parses,0,'Offline delete reparses no unchanged Markdown');
          acquisition2.close();cache2.close();acquisition2=null;cache2=null;

          f.add('Target.md','',{aliases:['AliasTarget']});f.reads.length=0;parses=0;
          cache2=new M.KplexIndexedDbCache(vault);ok(await cache2.open(),'Reopen after offline recreate');acquisition2=new M.ObsidianSourceAcquisition(f.app,cache2,async text=>{parses++;return M.parseBodyMetadata(text);});
          ok(await settle(acquisition2),'Offline recreate restart converges');equal(await resolutionTargets(cache2.sources,ref.path),['Target.md','Target.md'],'Restart recreate restores inbound bindings');
          equal((await cache2.sources.inspect(other.path)).head,otherBefore,'Offline recreate keeps unrelated head reusable');equal(f.reads,['Target.md'],'Restart recreate reads only recreated source');equal(parses,1,'Restart recreate parses only recreated source');
          const db=await cache2.open();equal(await value(db.transaction(M.SOURCE_DEPENDENCY_STORE).objectStore(M.SOURCE_DEPENDENCY_STORE).count()),0,'Restart maintenance never builds global contributor catalog');
          return true;
        }finally{acquisition2?.close();cache2?.close();f.close();}
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
          const beforeMaintenance=acquisition2.getMaintenanceRevision(),discovery=acquisition2.localContributorDiscovery({isCurrent:()=>true});ok(discovery,'Production local discovery available before corruption is observed');
          const invalid=await discovery.discover({kind:'neighborhood',endpoints:[{id:'A.md',kind:'document',state:'materialized',semanticPath:'A.md',physicalPath:'A.md'}]});equal(invalid.outcome,'invalid','Requested lookup exposes corrupt local owner as invalid');
          equal(acquisition2.getMaintenanceRevision(),beforeMaintenance+1,'Requested corruption advances one maintenance fence');equal(acquisition2.hasSemanticDependencies(),false,'Requested corruption closes semantic readiness immediately');
          equal(await acquisition2.reconcile(),false,'Complete inventory refuses missing selected owner');
          const bBefore=headsBefore.find(h=>h.sourceId==='B.md'),bAfter=(await cache2.sources.inspect('B.md')).head;ok(bAfter&&bAfter.state==='complete','Corruption handling does not delete unrelated head');equal(bAfter.physical,bBefore.physical,'Uncertain reconciliation preserves unrelated physical identity');equal(bAfter.families.values,bBefore.families.values,'Uncertain reconciliation reuses unrelated value facts');equal(bAfter.families['body-urls'],bBefore.families['body-urls'],'Uncertain reconciliation reuses unrelated body URLs');equal(bAfter.families.metadata,bBefore.families.metadata,'Uncertain reconciliation reuses unrelated metadata');equal(reads,0,'Corruption reconciliation reads no Markdown');equal(parses,0,'Corruption reconciliation parses no Markdown');
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
