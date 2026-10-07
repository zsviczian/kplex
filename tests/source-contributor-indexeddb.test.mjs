/** SI4b1 real IndexedDB evidence. Missing/blocked Chromium fails rather than skipping this required lane. */
import assert from "node:assert/strict";
import test from "node:test";
import { chromiumHarness } from "./support/browserTypeScript.mjs";
import { contributorBrowserBundle, contributorBrowserInitialize } from "./support/contributorBrowserFixture.mjs";
import { reframeTitleCatalog } from "./support/urlTitleFixture.mjs";

const bundle = await contributorBrowserBundle();
const v4Initialize = `window.reframeContributorCatalog=${reframeTitleCatalog.toString()};true`;

test("real Chromium contributor catalogs: migration, integrity, mutation fences and lifetime", { timeout: 180000 }, async t => {
  const browser = await chromiumHarness(bundle);
  try {
    await browser.evaluate(contributorBrowserInitialize); await browser.evaluate(v4Initialize);
    await t.test("v4 host-owner coordinates write/reopen exactly, including authenticated empty coordinates, without source/body rewrites", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,orderValidity={isCurrent:()=>true};
        for(const empty of [false,true]){
          const name='contributor-v4-coordinate-'+(empty?'empty':'nonempty'),f=await seed(name),db=await f.cache.open(),before={};
          for(const store of ['sourceHeads','sourceChunks','sourcePostings','bodies'])before[store]=await value(db.transaction(store).objectStore(store).getAll());
          if(!empty){f.app.metadataCache.resolvedLinks={'B.md':{'A.md':1},'A.md':{}};f.app.metadataCache.unresolvedLinks={'C.md':{}};}
          const d=await f.build(),root=await f.repository.readDependencyRoot(()=>true),data=JSON.parse(root.data);
          equal(data.version,4,'Current derivative format');equal(data.hostLinkOwnerOrder.version,1,'Coordinate manifest format');
          const expected=empty?{resolved:[],unresolved:[]}:{resolved:['B.md','A.md'],unresolved:['C.md']};
          for(const family of ['resolved','unresolved']){
            const manifest=data.hostLinkOwnerOrder[family];
            equal(manifest.owners,expected[family].length,'Exact '+family+' owner count');
            equal(manifest.pages,expected[family].length?1:0,'Explicit '+family+' empty/nonempty coverage');
          }
          const pages=await value(db.transaction('sourceDependencies').objectStore('sourceDependencies').getAll()),rows=pages
            .filter(page=>page.slot===root.build.slot&&page.generation===root.build.generation).flatMap(page=>JSON.parse(page.data));
          for(const family of ['resolved','unresolved'])equal(rows.filter(row=>row.kind==='host-order'&&row.family===family)
            .sort((a,b)=>a.index-b.index).flatMap(row=>row.owners),expected[family],'Persisted '+family+' owner permutation');
          equal(rows.filter(row=>row.kind==='host-order-rank').length,expected.resolved.length+expected.unresolved.length,'One durable rank per coordinate owner');
          const direct=await d.discoverDirectOrder({kind:'neighborhood',endpoints:[ref('A.md')]},orderValidity);equal(direct.outcome,'ready','Current v4 coordinate reads');
          const connection=await f.cache.open();connection.close();const other=new M.KplexIndexedDbCache(name);ok(await other.open(),'Real reopen');
          const reopened=new M.SourceContributorDiscovery(other.sources,d.host,runtime());
          const again=await reopened.discoverDirectOrder({kind:'neighborhood',endpoints:[ref('A.md')]},orderValidity);equal(again.outcome,'ready','Reopened coordinate reads');
          equal(again.resolvedSourceIds,direct.resolvedSourceIds,'Resolved coordinate stable after reopen');
          equal(again.unresolvedSourceIds,direct.unresolvedSourceIds,'Unresolved coordinate stable after reopen');
          equal(again.markdownSourceIds,direct.markdownSourceIds,'Markdown coordinate stable after reopen');
          const reopenedDb=await other.open();for(const [store,records] of Object.entries(before))equal(await value(reopenedDb.transaction(store).objectStore(store).getAll()),records,store+' unchanged');
          other.close();f.close();
        }return true;
      })()`), true);
    });

    await t.test("v4 coordinate page/root/build/head faults fail closed and pre-activation abort preserves the prior root", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,orderValidity={isCurrent:()=>true},faults=['missing','corrupt','duplicate','truncated','out-of-order','wrong-root','wrong-build','wrong-head'];
        for(const fault of faults){
          const f=await seed('contributor-v4-fault-'+fault),db=await f.cache.open(),before={};
          f.app.metadataCache.resolvedLinks={'B.md':{'A.md':1},'A.md':{}};f.app.metadataCache.unresolvedLinks={'C.md':{}};
          const d=await f.build(),baseline=await d.discoverDirectOrder({kind:'neighborhood',endpoints:[ref('A.md')]},orderValidity);equal(baseline.outcome,'ready','Baseline '+fault);
          for(const store of ['sourceHeads','sourceChunks','sourcePostings','bodies'])before[store]=await value(db.transaction(store).objectStore(store).getAll());
          const root=await f.repository.readDependencyRoot(()=>true),pages=await value(db.transaction('sourceDependencies').objectStore('sourceDependencies').getAll());
          const active=pages.filter(page=>page.slot===root.build.slot&&page.generation===root.build.generation);
          const hostPage=active.find(page=>JSON.parse(page.data).some(row=>row.kind==='host-order'&&row.family==='resolved'));ok(hostPage,'Resolved coordinate physical page');
          if(fault==='missing'||fault==='corrupt'||fault==='wrong-build')await edit(db,['sourceDependencies'],tx=>{
            const store=tx.objectStore('sourceDependencies'),key=[hostPage.slot,hostPage.bucket,hostPage.index];
            if(fault==='missing')store.delete(key);
            else if(fault==='corrupt')store.put({...hostPage,data:hostPage.data+' '});
            else store.put({...hostPage,generation:'wrong-generation'});
          });
          else {
            const transform=rows=>{
              const coordinate=rows.find(row=>row.kind==='host-order'&&row.family==='resolved');ok(coordinate,'Logical resolved coordinate');
              if(fault==='duplicate')return [...rows,structuredClone(coordinate)];
              if(fault==='truncated')return rows.filter(row=>row!==coordinate);
              if(fault==='out-of-order')return rows.map(row=>row===coordinate?{...row,index:row.index+1}:row);
              if(fault==='wrong-head')return rows.map(row=>row.kind==='source'&&row.head.sourceId==='A.md'?{...row,head:{...row.head,sequence:row.head.sequence+100}}:row);
              return rows;
            };
            if(fault==='wrong-root'){
              const data=JSON.parse(root.data);data.hostLinkOwnerOrder.resolved.digest='0'.repeat(64);const text=JSON.stringify(data);
              const digest=await f.repository.observationDigest(text);await edit(db,['meta'],tx=>tx.objectStore('meta').put({...root,data:text,digest}));
            }else{
              const changed=await reframeContributorCatalog(M,root,pages,transform,text=>f.repository.observationDigest(text),4);
              await edit(db,['meta','sourceDependencies'],tx=>{const store=tx.objectStore('sourceDependencies');for(const page of active)store.delete([page.slot,page.bucket,page.index]);for(const page of changed.pages)store.put(page);tx.objectStore('meta').put(changed.root);});
            }
          }
          const rejected=await d.discoverDirectOrder({kind:'neighborhood',endpoints:[ref('A.md')]},orderValidity);ok(rejected.outcome!=='ready','Fault rejected: '+fault);ok(!('resolvedSourceIds'in rejected),'No ordered prefix: '+fault);
          for(const [store,records] of Object.entries(before))equal(await value(db.transaction(store).objectStore(store).getAll()),records,store+' unchanged after '+fault);
          f.close();
        }

        const f=await seed('contributor-v4-abort-before-activation');f.app.metadataCache.resolvedLinks={'B.md':{'A.md':1},'A.md':{}};const d=await f.build(),db=await f.cache.open(),add=IDBObjectStore.prototype.add;
        const previous=await f.repository.readDependencyRoot(()=>true),certificate=await d.discoverDirectOrder({kind:'neighborhood',endpoints:[ref('A.md')]},orderValidity);equal(certificate.outcome,'ready','Prior coordinate selected');
        const before={};for(const store of ['sourceHeads','sourceChunks','sourcePostings','bodies'])before[store]=await value(db.transaction(store).objectStore(store).getAll());
        let aborted=false;IDBObjectStore.prototype.add=function(...args){const request=add.apply(this,args);if(this.name==='sourceDependencies'&&!aborted){aborted=true;this.transaction.abort();}return request;};
        let failed;try{failed=await d.rebuild();}finally{IDBObjectStore.prototype.add=add;}
        ok(aborted,'Actual inactive dependency transaction aborted before activation');ok(failed.outcome!=='ready','Aborted build never activates');
        // An IDB transaction error deliberately closes/backoffs the failed connection. A fresh
        // storage owner must recover the committed root; immediate reads on f.repository are unavailable.
        const recovered=new M.KplexIndexedDbCache('contributor-v4-abort-before-activation');ok(await recovered.open(),'Real reopen after abort');
        const recoveredDiscovery=new M.SourceContributorDiscovery(recovered.sources,d.host,runtime());
        equal(await recovered.sources.readDependencyRoot(()=>true),previous,'Previous v4 root remains selected');
        equal((await recoveredDiscovery.discoverDirectOrder({kind:'neighborhood',endpoints:[ref('A.md')]},orderValidity)).outcome,'ready','Previous coordinate remains usable');
        const recoveredDb=await recovered.open();for(const [store,records] of Object.entries(before))equal(await value(recoveredDb.transaction(store).objectStore(store).getAll()),records,store+' unchanged across abort');
        recovered.close();f.close();return true;
      })()`), true);
    });
    await t.test("v5 upgrade preserves every neutral head/chunk/posting and legacy graph/body record; no root implies pending", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const seed=await window.seed('contributor-copy');const db=await seed.cache.open();
        const names=['meta','sourceHeads','sourceChunks','sourcePostings','bodies'];const copied={};
        for(const name of names)copied[name]=await value(db.transaction(name).objectStore(name).getAll());seed.close();
        const old=await rawOpen(dbName('contributor-v5'),5,db=>{
          db.createObjectStore('meta',{keyPath:'key'}).createIndex('sourceLease',['sourceId','revision']);
          db.createObjectStore('bodies',{keyPath:'path'});db.createObjectStore('sourceHeads',{keyPath:'sourceId'});
          for(const name of ['sourceChunks','sourcePostings']){
            const store=db.createObjectStore(name,{keyPath:['sourceId','revision','family','index']});
            store.createIndex('sourceRevision',['sourceId','revision']);store.createIndex('sourceFamilyRevision',['sourceId','revision','family']);
            if(name==='sourcePostings')store.createIndex('lookup',['kind','key','sourceId','revision','family','index']);
          }
        });
        await edit(old,names,tx=>{for(const name of names)for(const row of copied[name]){
          if(name==='meta'&&row.key.startsWith('source-dependency-'))continue;tx.objectStore(name).put(row);
        }tx.objectStore('meta').put({key:'checkpoint',schema:2,generation:'preserved',createdAt:1,vaultSignature:'v',settingsSignature:'s',discoveredFields:[],completedMarkdownPaths:[]});});ok(!old.objectStoreNames.contains('urlOwners'),'Genuine v5 schema has no independent URL cache');old.close();
        const f=await fixture('contributor-v5'),upgraded=await f.cache.open();equal(upgraded.version,10,'Additive upgrade');
        ok(upgraded.objectStoreNames.contains('urlOwners'),'Independent URL cache added alongside retained source stores');equal(await value(upgraded.transaction('urlOwners').objectStore('urlOwners').count()),0,'Upgrade invents no URL owners');
        for(const name of ['sourceHeads','sourceChunks','sourcePostings','bodies'])equal(await value(upgraded.transaction(name).objectStore(name).getAll()),copied[name],name+' byte-shape preservation');
        equal((await f.cache.readSnapshotMeta('checkpoint')).generation,'preserved','Graph pointer preserved');
        equal((await f.acquisition.contributorDiscovery(runtime()).discover(absent())).outcome,'pending','No migrated root is not empty');
        f.add('A.md','Friends:: [[B]]');f.add('B.md','Opposes:: [[A]]');f.add('C.md','[Page](https://example.com/path)');f.metadata.get('C.md').hostTags=['#project/nested'];
        for(const file of f.app.vault.getMarkdownFiles())file.stat={...file.stat,mtime:file.stat.mtime+1};
        await f.acquire();const d=await f.build();equal((await d.discover(absent())).outcome,'ready','Explicit complete rebuild certifies absence');
        equal(f.reads,[],'No Markdown reads');equal(f.parses,[],'No parsing during discovery');f.close();return true;
      })()`), true);
    });

    /** The fused producer is measured on real durable facts, not an in-memory catalog facade. */
    await t.test("four-family bootstrap persists authenticated owner summaries without rewriting accepted source or body data", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await seed('contributor-summary-fused'),db=await f.cache.open(),before={};
        const names=['sourceHeads','sourceChunks','sourcePostings','bodies'];
        for(const name of names)before[name]=await value(db.transaction(name).objectStore(name).getAll());
        let visits=0;const visit=f.repository.visitFamily.bind(f.repository);
        f.repository.visitFamily=(...args)=>{visits++;return visit(...args);};
        const d=f.acquisition.contributorDiscovery(runtime()),built=await d.rebuild();
        equal(built.outcome,'ready','Complete bootstrap');equal(built.familyVisits,12,'Four visits per owner');equal(visits,12,'Measured actual family traversal count');
        const owner=await d.readOwnerSummary('A.md');equal(owner.outcome,'ready','Authenticated source-local snapshot');
        ok(owner.stamp.saved&&owner.summary.sequence!==null,'Durable stamp is not a memory fixture coordinate');
        equal(owner.summary.sourceId,'A.md','Source identity');ok(owner.summary.keys.includes(M.contributorKey('literal','B')),'Dormant lexical dependency');
        equal((await d.discover({kind:'pair',endpoints:[ref('A.md'),ref('B.md')]})).outcome,'ready','Summary-authenticated direct cover');
        equal(visits,12,'Summary read and discovery perform zero family visits');
        for(const name of names)equal(await value(db.transaction(name).objectStore(name).getAll()),before[name],name+' unchanged');
        equal(f.reads,[],'Zero Markdown reads');equal(f.parses,[],'Zero parser calls');
        equal(f.repository.readers.size,0,'All durable readers released');equal(f.repository.decodeBytes,0,'Decode reservations released');f.close();return true;
      })()`), true);
    });

    /** A format change rejects only derivative authority; database and accepted records are retained. */
    await t.test("a migrated database with a v1 derivative root is not reset or misread as a v2 summary certificate", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await seed('contributor-summary-v6'),d=await f.build(),db=await f.cache.open(),before={};
        const names=['sourceHeads','sourceChunks','sourcePostings','bodies'];
        for(const name of names)before[name]=await value(db.transaction(name).objectStore(name).getAll());
        await edit(db,['meta'],tx=>tx.objectStore('meta').put({key:'checkpoint',schema:3,pageChunkCount:0,evidenceChunkCount:0,generation:'summary-migration-kept',createdAt:1,vaultSignature:'v',settingsSignature:'s',discoveredFields:[],completedMarkdownPaths:[]}));
        const old=await f.repository.readDependencyRoot(()=>true),oldData=JSON.stringify({...JSON.parse(old.data),version:1});
        const downgraded={...old,data:oldData,digest:await f.repository.observationDigest(oldData)};
        await edit(db,['meta'],tx=>tx.objectStore('meta').put(downgraded));
        equal((await d.discover(absent())).reason,'dependency-invalid','A v1 negative is not v2 authority');
        equal((await d.readOwnerSummary('A.md')).reason,'dependency-invalid','No synthesized owner summary');
        equal(db.version,10,'Supported v10 schema; old derivative remains rejected');
        equal((await f.cache.readSnapshotMeta('checkpoint')).generation,'summary-migration-kept','Graph snapshot preserved');
        equal((await d.rebuild()).outcome,'ready','Explicit derivative bootstrap can select v2');
        for(const name of names)equal(await value(db.transaction(name).objectStore(name).getAll()),before[name],name+' byte-shape preservation');
        equal(JSON.parse((await f.repository.readDependencyRoot(()=>true)).data).version,M.CONTRIBUTOR_CATALOG_VERSION,'Only derivative root format changes');f.close();return true;
      })()`), true);
    });

    /** Missing stored summary pages must break both positive selection and a colliding empty lookup. */
    await t.test("missing summary pages or rows cannot authenticate an owner or an empty bucket lookup", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules;
        for(const fault of ['page','row']){
          const f=await seed('contributor-summary-missing-'+fault),d=await f.build(),db=await f.cache.open();
          const key=M.contributorKey('summary','A.md'),bucket=M.sourceDependencyBucket(key),root=await f.repository.readDependencyRoot(()=>true);
          const before=await value(db.transaction('sourceHeads').objectStore('sourceHeads').get('B.md'));
          let index=0;while(M.sourceDependencyBucket(M.contributorKey('node','summary-empty:'+index))!==bucket)index++;
          const negative={kind:'pair',endpoints:[ref('summary-empty:'+index),ref('unrelated-missing')]};
          equal((await d.discover(negative)).outcome,'ready','Intact original empty-range proof');
          equal((await d.readOwnerSummary('A.md')).outcome,'ready','Intact independent owner proof');
          const pages=await value(db.transaction('sourceDependencies').objectStore('sourceDependencies').getAll());
          const page=pages.find(page=>page.slot===root.build.slot&&page.bucket===bucket&&JSON.parse(page.data).some(row=>row.kind==='summary'&&row.key===key));
          ok(page,'Original summary page is present');
          await edit(db,['sourceDependencies'],tx=>{
            const store=tx.objectStore('sourceDependencies');
            if(fault==='page')store.delete([page.slot,page.bucket,page.index]);
            else store.put({...page,data:JSON.stringify(JSON.parse(page.data).filter(row=>row.kind!=='summary'||row.key!==key))});
          });
          const owner=await d.readOwnerSummary('A.md'),positive=await d.discover({kind:'pair',endpoints:[ref('A.md'),ref('B.md')]}),empty=await d.discover(negative);
          for(const result of [owner,positive,empty]){ok(result.outcome!=='ready','Fault cannot select a surviving subset');ok(!('sourceIds'in result)&&!('summary'in result),'No partial result');}
          equal(await value(db.transaction('sourceHeads').objectStore('sourceHeads').get('B.md')),before,'Unrelated source data intact');
          f.close();
        }return true;
      })()`), true);
    });

    /** Awaited observation holds the original leases; a competing real connection can invalidate finality. */
    await t.test("an awaited observer retains its real selected lease and rejects cross-connection head activation", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await seed('contributor-summary-observer'),db=await f.cache.open();
        const other=new M.KplexIndexedDbCache('contributor-summary-observer');ok(await other.open(),'Independent real connection');
        const captured=await f.acquisition.captureForReplay('A.md',{noteTypeField:'',primaryTagField:''},runtime());equal(captured.outcome,'ready','Host request');
        const selected=await f.repository.inspect('A.md'),metadata=[];
        equal((await f.repository.readSelected('A.md',()=> 'ready',reader=>reader.visit('metadata',records=>{metadata.push(...records);return true;}))).outcome,'ready','Valid metadata frame capture');
        let enter,release,settled=false,calls=0;
        const entered=new Promise(resolve=>enter=resolve),gate=new Promise(resolve=>release=resolve);
        const reading=new M.CachedSourceReplay(f.repository).read(captured.request,runtime(),()=>true,async()=>{calls++;if(calls===1){enter();await gate;}return true;});
        reading.then(()=>settled=true);await entered;
        try{
          equal(settled,false,'Observer is awaited');equal(f.repository.readers.size,1,'One actual durable read lifetime');
          ok((await value(db.transaction('meta').objectStore('meta').getAll())).some(row=>row.sourceId==='A.md'&&row.owner===f.repository.owner),'Persistent lease retained across await');
          equal(await other.sources.cleanupRevision('A.md',selected.head.families.values.revision),false,'Other connection cannot reclaim pinned family');
          const replacement={sourceId:'A.md',physical:selected.head.physical,observation:selected.head.observation,expected:selected.expected,
            families:{...selected.head.families,metadata:async emit=>{for(const record of metadata)if(!await emit(record))return false;return emit({kind:'alias',value:'after-observer'});}}};
          equal((await other.sources.replace(replacement)).outcome,'activated','Competing head selected atomically');
        }finally{release();}
        const result=await reading;ok(result.outcome!=='ready','Private old observation is not terminal');ok(!('value'in result),'No partial summary or semantic stream');
        equal(f.repository.readers.size,0,'Reader lifetime released');equal(f.repository.decodeBytes,0,'Decoded bytes released');
        ok(!(await value(db.transaction('meta').objectStore('meta').getAll())).some(row=>row.sourceId&&row.owner),'No persistent reader or writer leases leaked');
        equal((await f.repository.inspect('B.md')).reason,'ready','Unrelated source remains readable');other.close();f.close();return true;
      })()`), true);
    });

    /** A failed summary-page stage cannot publish its prefix or retire the previous selected root. */
    await t.test("interrupted summary-page staging leaves the prior root, owner snapshot and unrelated source intact", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await seed('contributor-summary-stage'),d=await f.build(),db=await f.cache.open();
        const root=await f.repository.readDependencyRoot(()=>true),owner=await d.readOwnerSummary('A.md');equal(owner.outcome,'ready','Selected original owner');
        const certificate=await d.discover({kind:'pair',endpoints:[ref('A.md'),ref('B.md')]});equal(certificate.outcome,'ready','Selected original cover');
        const before=await value(db.transaction('sourceHeads').objectStore('sourceHeads').getAll());
        const put=f.repository.putDependencyPage.bind(f.repository);let interrupted=false;
        f.repository.putDependencyPage=async(build,page,current)=>{await put(build,page,current);if(!interrupted&&JSON.parse(page.data).some(row=>row.kind==='summary')){interrupted=true;throw new M.SourceFactError('write-error');}};
        let result;try{result=await d.rebuild();}finally{f.repository.putDependencyPage=put;}
        ok(interrupted,'A real summary-containing page committed before interruption');ok(result.outcome!=='ready','An incomplete prefix never activates');
        equal(await f.repository.readDependencyRoot(()=>true),root,'Original root remains selected');
        equal(await d.revalidate(certificate),'ready','Original exact cover remains valid with unchanged host');
        equal((await d.readOwnerSummary('A.md')).summary,owner.summary,'Original independently committed owner remains readable');
        equal(await value(db.transaction('sourceHeads').objectStore('sourceHeads').getAll()),before,'No accepted heads rewritten');
        equal(f.repository.readers.size,0,'No pin leak');equal((await d.rebuild()).outcome,'ready','Explicit bootstrap can replace interrupted inactive slot');
        ok(await d.revalidate(certificate)!=='ready','Successfully replaced root invalidates old certificate');f.close();return true;
      })()`), true);
    });

    await t.test("individual host literal bindings remain discoverable even without aggregate host-map entries", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await fixture('contributor-literal');f.add('A.md');f.add('B.md');
        f.metadata.get('A.md').links=[{link:'B',original:'[[B]]',position:{start:{line:0,offset:0},end:{line:0,offset:5}}}];await f.acquire();const d=await f.build();
        const found=await d.discover({kind:'pair',endpoints:[ref('B.md'),ref('absent')]});
        equal(found.outcome,'ready','Resolved individual literal cover');equal(found.sourceIds,['A.md','B.md'],'Both resolved-literal referrer and endpoint owner');
        const byLiteral=await d.discover({...absent(),literals:['B']});equal(byLiteral.outcome,'ready','Lexical cover');equal(byLiteral.sourceIds,['A.md'],'Genuine spelling retained');
        f.close();return true;
      })()`), true);
    });

    await t.test("missing root/page/lookup, corrupt page/manifest and missing owner never certify an empty set", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules;
        for(const fault of ['root','page','row','manifest','owner']){
          const f=await seed('contributor-fault-'+fault),d=await f.build(),db=await f.cache.open();
          const certificate=await d.discover({kind:'pair',endpoints:[ref('A.md'),ref('B.md')]});equal(certificate.outcome,'ready','Baseline cover');
          const root=await f.repository.readDependencyRoot(()=>true),key=M.contributorKey(fault==='owner'?'source':'node','A.md'),bucket=M.sourceDependencyBucket(key);
          let suffix=0;while(M.sourceDependencyBucket(M.contributorKey('node','absent:'+suffix))!==bucket)suffix++;
          const negative={kind:'pair',endpoints:[ref('absent:'+suffix),ref('unrelated-missing')]};
          equal((await d.discover(negative)).outcome,'ready','Authenticated negative before fault');
          await edit(db,['meta','sourceDependencies'],async tx=>{
            if(fault==='root'){tx.objectStore('meta').delete(M.SOURCE_DEPENDENCY_ROOT_KEY);return;}
            if(fault==='manifest'){tx.objectStore('meta').put({...root,data:root.data+' '});return;}
            const store=tx.objectStore('sourceDependencies'),pageKey=[root.build.slot,bucket,0];
            if(fault==='page'||fault==='owner'){store.delete(pageKey);return;}
            const page=await value(store.get(pageKey));ok(page,'Expected committed page');const rows=JSON.parse(page.data);rows.pop();store.put({...page,data:JSON.stringify(rows)});
          });
          const request=fault==='owner'?{kind:'pair',endpoints:[ref('A.md'),ref('B.md')]}:negative;
          const result=await d.discover(request);ok(result.outcome!=='ready','No false empty for '+fault);ok(!('sourceIds'in result),'No partial owners');
          equal((await f.repository.inspect('B.md')).reason,'ready','Unrelated neutral B intact');
          const repaired=await f.build();equal((await repaired.discover(absent())).outcome,'ready','Explicit derivative rebuild repairs fault');f.close();
        }return true;
      })()`), true);
    });

    await t.test("partial rebuild and two-slot reuse preserve current source leases and invalidate retired certificates", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await seed('contributor-slots'),d=await f.build();
        const first=await d.discover({kind:'pair',endpoints:[ref('A.md'),ref('B.md')]});equal(first.outcome,'ready','First catalog');
        const original=f.repository.putDependencyPage.bind(f.repository);let failed=false;
        f.repository.putDependencyPage=async(...args)=>{await original(...args);if(!failed){failed=true;throw new M.SourceFactError('write-error');}};
        ok((await d.rebuild()).outcome!=='ready','Interrupted inactive slot');f.repository.putDependencyPage=original;
        equal(await d.revalidate(first),'ready','Unchanged previous active catalog remains usable');
        const selected=await f.repository.inspect('A.md'),revision=selected.head.families.values.revision;
        equal(await f.repository.cleanupRevision('A.md',revision),false,'Active family protected');
        equal((await d.rebuild()).outcome,'ready','Second catalog');equal((await d.rebuild()).outcome,'ready','Reuse first slot');
        ok(await d.revalidate(first)!=='ready','Retired certificate invalidated');
        const db=await f.cache.open(),pages=await value(db.transaction('sourceDependencies').objectStore('sourceDependencies').getAll());
        ok(new Set(pages.map(page=>page.generation)).size<=2,'At most two page generations');
        const meta=await value(db.transaction('meta').objectStore('meta').getAll());ok(!meta.some(row=>row.sourceId&&row.owner),'No build reader leases leaked');
        equal((await f.repository.inspect('B.md')).reason,'ready','Unrelated B survives slot reuse');f.close();return true;
      })()`), true);
    });

    await t.test("cross-connection staging, durable dirty markers and evicted unsaved facts fence even negative queries", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await seed('contributor-writer'),d=await f.build();const other=new M.KplexIndexedDbCache('contributor-writer');ok(await other.open(),'Second connection');
        const selected=await f.repository.inspect('A.md'),metadata=[];let signal,release;
        equal((await f.repository.readSelected('A.md',()=> 'ready',async reader=>reader.visit('metadata',records=>{metadata.push(...records);return true;}))).outcome,'ready','Capture valid metadata frames');
        const paused=new Promise(resolve=>signal=resolve),gate=new Promise(resolve=>release=resolve);
        const replacement={sourceId:'A.md',physical:selected.head.physical,observation:selected.head.observation,expected:selected.expected,
          families:{...selected.head.families,metadata:async emit=>{signal();await gate;for(const record of metadata)if(!await emit(record))return false;return emit({kind:'alias',value:'replacement'});}}};
        const writing=other.sources.replace(replacement);await paused;
        ok((await d.discover(absent())).outcome!=='ready','Staging on another connection invalidates absence');
        equal(await f.repository.cleanupRevision('A.md',selected.head.families.values.revision),false,'Writer lease protects retained family');
        release();equal((await writing).outcome,'activated','Atomic new source head');ok((await d.discover(absent())).outcome!=='ready','Old root masked atomically');
        equal((await d.rebuild()).outcome,'ready','Explicit rebuild after settled replacement');
        const baseline=await other.sources.inspect('A.md'),add=IDBObjectStore.prototype.add;let fault=false;
        IDBObjectStore.prototype.add=function(value,...args){if(this.name==='sourceChunks'&&!fault){fault=true;throw new DOMException('fixture quota','QuotaExceededError');}return add.call(this,value,...args);};
        let unsaved;try{unsaved=await other.sources.replace({...replacement,expected:baseline.expected,families:{...baseline.head.families,metadata:async emit=>emit({kind:'alias',value:'unsaved'})}});}finally{IDBObjectStore.prototype.add=add;}
        equal(unsaved.outcome,'unsaved','Real storage failure uses existing bounded memory');
        other.sources.memory.delete('A.md');ok(other.sources.unsaved.has('A.md'),'Eviction mask retained');
        ok((await d.discover(absent())).outcome!=='ready','Cross-connection durable dirty marker survives eviction');
        equal((await f.repository.inspect('B.md')).reason,'ready','Unrelated B unchanged');other.close();f.close();return true;
      })()`), true);
    });

    await t.test("rename/delete/recreate and Date/topology changes cannot reuse a prior host certificate", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await seed('contributor-lifecycle');let d=await f.build();const old=f.files.get('A.md');
        f.files.delete('A.md');old.path='Moved.md';old.name='Moved.md';old.basename='Moved';f.files.set(old.path,old);
        f.texts.set(old.path,f.texts.get('A.md'));f.metadata.set(old.path,f.metadata.get('A.md'));f.app.vault.trigger('rename',old,'A.md');
        ok((await d.discover(absent())).outcome!=='ready','Rename invalidates topology');
        await f.acquisition.reconcile();ok(await f.repository.flush(),'Rename tombstone durably settled');d=await f.build();equal((await f.repository.inspect('A.md')).reason,'tombstone','Old owner tombstoned');
        const previous=(await f.repository.inspect('Moved.md')).head.physical.identity;
        f.files.delete('Moved.md');f.app.vault.trigger('delete',old);await f.acquisition.reconcile();ok(await f.repository.flush(),'Delete tombstone durably settled');
        ok((await d.discover(absent())).outcome!=='ready','Delete invalidates host');
        const file=f.add('Moved.md','Friends:: [[B]]',{DormantDate:'2026-09-30'});f.app.vault.trigger('create',file);await f.acquire();d=await f.build();
        ok((await f.repository.inspect('Moved.md')).head.physical.identity!==previous,'Recreation owns a new incarnation');
        f.app.dateFields.add('DormantDate');equal((await d.discover(absent())).reason,'host-catalog-stale','Non-Date becomes Date');
        equal((await f.repository.inspect('B.md')).reason,'ready','Unrelated B readable');f.close();return true;
      })()`), true);
    });

    await t.test("durable deletion crosses its own mask without unmasking readers, replaying families or touching B", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await seed('contributor-delete-mask'),d=await f.build(),db=await f.cache.open();
        const b=await value(db.transaction('sourceHeads').objectStore('sourceHeads').get('B.md'));
        let visits=0,signal,release;const visit=f.repository.visitFamily.bind(f.repository);
        f.repository.visitFamily=(...args)=>{visits++;return visit(...args);};
        const paused=new Promise(resolve=>signal=resolve),gate=new Promise(resolve=>release=resolve);
        const begin=f.repository.beginDependencyMutation.bind(f.repository);
        f.repository.beginDependencyMutation=async(...args)=>{const ticket=await begin(...args);signal();await gate;return ticket;};
        f.files.delete('A.md');
        const deleting=f.repository.tombstone('A.md',()=>!f.files.has('A.md'),true);await paused;
        equal((await f.repository.inspect('A.md')).reason,'tombstone','Immediate reader mask');
        equal(await f.repository.readBody('A.md',()=>true,()=>true,true),null,'Include-tombstone is not deletion authority');
        ok((await d.discover(absent())).outcome!=='ready','Unsettled durable dirty ticket fences absence');
        release();equal((await deleting).outcome,'activated','Tombstone can select its own masked disk head');
        f.repository.beginDependencyMutation=begin;
        ok(await f.repository.flush(),'Real durable deletion completion');equal(visits,0,'No source-family replay during deletion');
        const a=await value(db.transaction('sourceHeads').objectStore('sourceHeads').get('A.md'));
        equal(a.state,'tombstone','Disk tombstone committed');ok(Object.keys(a.families).length,'Rename body families retained');
        ok(await f.repository.readBody('A.md',p=>p.identity===a.physical.identity,()=>true,true),'Retained body still validates under its lease');
        const control=await value(db.transaction('meta').objectStore('meta').get(sourceModules.SOURCE_DEPENDENCY_STATE_KEY));
        equal(control.dirty,0,'Owned dirty ticket retired with the head');equal(f.repository.getDiagnostics().unsaved,0,'No stranded local mask');
        equal(await value(db.transaction('sourceHeads').objectStore('sourceHeads').get('B.md')),b,'Unrelated source bytes unchanged');
        equal(f.reads,[],'No Markdown read');equal(f.parses,[],'No parser invocation');
        ok((await d.discover(absent())).outcome!=='ready','Completion does not resurrect the rejected catalog root');
        f.close();return true;
      })()`), true);
    });

    await t.test("a superseded queued delete settles through flush; a genuinely missing binding retires its dirty ticket", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await seed('contributor-delete-queue'),db=await f.cache.open();let signal,release,first=true;
        const paused=new Promise(resolve=>signal=resolve),gate=new Promise(resolve=>release=resolve);
        const begin=f.repository.beginDependencyMutation.bind(f.repository);
        f.repository.beginDependencyMutation=async(...args)=>{const ticket=await begin(...args);if(first){first=false;signal();await gate;}return ticket;};
        f.files.delete('A.md');f.files.delete('C.md');
        const firstDelete=f.repository.tombstone('A.md',()=>!f.files.has('A.md'),true);await paused;
        equal((await f.repository.tombstone('A.md',()=>!f.files.has('A.md'))).reason,'backpressure','Latest final delete queued');
        equal((await f.repository.tombstone('C.md',()=>!f.files.has('C.md'))).reason,'backpressure','Independent delete queued');
        release();equal((await firstDelete).outcome,'cancelled','Old capability cannot consume latest mask');
        ok(await f.repository.flush(),'Both queued operations reach authoritative completion');
        for(const id of ['A.md','C.md']){const head=await value(db.transaction('sourceHeads').objectStore('sourceHeads').get(id));equal(head.state,'tombstone','Retired '+id);equal(head.families,{},'Final deletion retains no body');}
        equal((await f.repository.tombstone('never-existed',()=>true)).outcome,'absent','Missing head proven inside the finish transaction');
        ok(await f.repository.flush(),'Absent operation also settles');
        equal((await value(db.transaction('meta').objectStore('meta').get(sourceModules.SOURCE_DEPENDENCY_STATE_KEY))).dirty,0,'All owned tickets retired');
        equal(f.repository.getDiagnostics().unsaved,0,'No pending masks');equal((await f.repository.inspect('B.md')).reason,'ready','B remains readable');
        f.close();return true;
      })()`), true);
    });

    await t.test("an evicted unsaved source is retired, never republished as an older retained rename body", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await seed('contributor-delete-evicted'),before=await f.repository.inspect('A.md');
        const add=IDBObjectStore.prototype.add;let injected=false;
        IDBObjectStore.prototype.add=function(v,...args){if(this.name==='sourceChunks'&&!injected){injected=true;throw new DOMException('fixture quota','QuotaExceededError');}return add.call(this,v,...args);};
        let result;try{result=await f.repository.replace({sourceId:'A.md',physical:before.head.physical,observation:before.head.observation,expected:before.expected,
          families:{values:async()=>true,'body-urls':async()=>true,metadata:async emit=>emit({kind:'alias',value:'unsaved'}),resolution:async()=>true}});}finally{IDBObjectStore.prototype.add=add;}
        equal(result.outcome,'unsaved','Genuine storage fault');f.repository.memory.delete('A.md');ok(f.repository.unsaved.has('A.md'),'Eviction keeps the mask');
        f.files.delete('A.md');await f.repository.tombstone('A.md',()=>!f.files.has('A.md'),true);
        // Await the actual durable fence through the production connection backoff. Do not clear
        // the mask, override the clock/backoff, or assume a sleep proves that activation happened.
        let durable=false;const deadline=Date.now()+5000;
        do{durable=await f.repository.flush();if(!durable)await new Promise(resolve=>setTimeout(resolve,25));}while(!durable&&Date.now()<deadline);
        ok(durable,'Authoritative absence retires the evicted source after storage recovery');const reopened=await f.cache.open();
        const head=await value(reopened.transaction('sourceHeads').objectStore('sourceHeads').get('A.md'));
        equal(head.state,'tombstone','Retired disk head');equal(head.families,{},'Older disk body is not a rename input');
        equal(await f.repository.readBody('A.md',()=>true,()=>true,true),null,'No stale body resurrection');
        equal((await f.repository.inspect('B.md')).reason,'ready','Independent source intact');f.close();return true;
      })()`), true);
    });

    await t.test("cancellation cannot clear a mask or a newer connection's dirty ticket", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await seed('contributor-delete-tickets'),other=new M.KplexIndexedDbCache('contributor-delete-tickets');
        ok(await other.open(),'Second real connection');const db=await f.cache.open(),initial=await f.repository.inspect('A.md');
        let signalDelete,releaseDelete,signalWrite,releaseWrite;
        const deletingReady=new Promise(r=>signalDelete=r),deletingGate=new Promise(r=>releaseDelete=r);
        const writingReady=new Promise(r=>signalWrite=r),writingGate=new Promise(r=>releaseWrite=r);
        const begin=f.repository.beginDependencyMutation.bind(f.repository);
        f.repository.beginDependencyMutation=async(...args)=>{const ticket=await begin(...args);signalDelete();await deletingGate;return ticket;};
        let absentNow=true;const deleting=f.repository.tombstone('A.md',()=>absentNow);await deletingReady;
        const make=expected=>({sourceId:'A.md',physical:initial.head.physical,observation:initial.head.observation,expected,
          families:{values:async()=>true,'body-urls':async()=>true,metadata:async emit=>emit({kind:'alias',value:'new'}),resolution:async()=>true}});
        const replacement=make(initial.expected);replacement.families.values=async()=>{signalWrite();await writingGate;return true;};
        const writing=other.sources.replace(replacement);await writingReady;
        const key='source-dependency-dirty:'+JSON.stringify('A.md'),ticket=await value(db.transaction('meta').objectStore('meta').get(key));
        absentNow=false;releaseDelete();equal((await deleting).outcome,'cancelled','Invalid absence cannot activate');
        equal(await f.repository.flush(),false,'Cancellation is not durable completion');ok(f.repository.unsaved.has('A.md'),'Cancelled deletion stays masked');
        equal(await value(db.transaction('meta').objectStore('meta').get(key)),ticket,'Cancellation cannot consume the newer writer ticket');
        releaseWrite();equal((await writing).outcome,'activated','New writer selects its head atomically');
        equal((await value(db.transaction('meta').objectStore('meta').get(M.SOURCE_DEPENDENCY_STATE_KEY))).dirty,0,'New writer retires its own ticket');
        // This connection still needs an authoritative local operation; a remote write does not
        // silently erase its unsaved mask. Replacing against the current head provides that fence.
        f.repository.beginDependencyMutation=begin;
        equal((await f.repository.replace(make(await f.repository.catalogExpectation('A.md')))).outcome,'activated','Fresh authoritative replacement settles local mask');
        ok(await f.repository.flush(),'Local completion after valid replacement');equal((await f.repository.inspect('B.md')).reason,'ready','B intact');
        other.close();f.close();return true;
      })()`), true);
    });

    await t.test("a crashed deletion leaves a dirty ticket that only a fresh authoritative absence can repair", async () => {
      const before = await browser.evaluate(`(async()=>{
        const f=await seed('contributor-delete-crash');await f.build();const db=await f.cache.open();
        const b=await value(db.transaction('sourceHeads').objectStore('sourceHeads').get('B.md'));
        let signal;const paused=new Promise(r=>signal=r),begin=f.repository.beginDependencyMutation.bind(f.repository);
        f.repository.beginDependencyMutation=async(...args)=>{const ticket=await begin(...args);signal();await new Promise(()=>{});return ticket;};
        window.crashedDeletion=f.repository.tombstone('A.md',()=>true);await paused;
        equal((await value(db.transaction('sourceHeads').objectStore('sourceHeads').get('A.md'))).state,'complete','Crash precedes head activation');
        equal((await value(db.transaction('meta').objectStore('meta').get(sourceModules.SOURCE_DEPENDENCY_STATE_KEY))).dirty,1,'Dirty ticket committed before crash');return b;
      })()`);
      await browser.restart(); await browser.evaluate(contributorBrowserInitialize);
      const after = await browser.evaluate(`(async()=>{
        const f=await fixture('contributor-delete-crash'),db=await f.cache.open();
        let reason;try{await f.repository.beginDependencyBuild(()=>true);}catch(error){reason=error.reason;}
        equal(reason,'dependency-pending','Restart cannot certify away an unsettled owner');
        equal((await f.repository.tombstone('A.md',()=>!f.files.has('A.md'))).outcome,'activated','Fresh authoritative absence repairs only A');
        ok(await f.repository.flush(),'Recovered deletion is durable');
        equal((await value(db.transaction('meta').objectStore('meta').get(sourceModules.SOURCE_DEPENDENCY_STATE_KEY))).dirty,0,'Crash ticket retired by replacement ownership');
        const b=await value(db.transaction('sourceHeads').objectStore('sourceHeads').get('B.md'));equal(f.reads,[],'No Markdown reacquisition for deletion');equal(f.parses,[],'No parsing');f.close();return b;
      })()`);
      assert.deepEqual(after, before, "Unchanged B survives restart and targeted crash repair byte-for-byte");
    });

    await t.test("new browser process cannot reuse persisted host topology without explicit reacquisition and rebuild", async () => {
      await browser.evaluate(`(async()=>{window.restartFixture=await seed('contributor-restart');window.restartDiscovery=await restartFixture.build();equal((await restartDiscovery.discover(absent())).outcome,'ready','Before process restart');return true;})()`);
      await browser.restart(); await browser.evaluate(contributorBrowserInitialize);
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await fixture('contributor-restart');f.add('A.md','Friends:: [[B]]');f.add('B.md','Opposes:: [[A]]');f.add('C.md','[Page](https://example.com/path)');f.metadata.get('C.md').hostTags=['#project/nested'];
        equal((await f.acquisition.contributorDiscovery(runtime()).discover(absent())).reason,'host-catalog-stale','New session is not a structural certificate');
        for(const file of f.app.vault.getMarkdownFiles())file.stat={...file.stat,mtime:file.stat.mtime+1};
        await f.acquire();const d=await f.build();equal((await d.discover(absent())).outcome,'ready','Reconciled fresh capability');f.close();return true;
      })()`), true);
    });
  } finally { await browser.cleanup(); }
});

/** URL normalization is a checksum-bound derivative capability independent of retained order formats. */
test("canonical URL catalog capability roundtrips every root format and rejects historical URL negatives", async () => {
  const browser=await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize),true);
    assert.equal(await browser.evaluate(`(async()=>{
      const M=sourceModules;
      for(const version of [2,3,4]){
        const name='canonical-url-catalog-'+version,f=await fixture(name);let reopened=null;
        try{
          f.add('Owner.md','[Docs](https://Obsidian.md/Slug)');await f.acquire();
          const original=f.acquisition.contributorDiscovery(runtime()),host={...original.host};
          if(version<4){host.hostLinkOwnerOrderVersion=undefined;host.captureHostLinkOwnerOrder=undefined;}
          if(version<3){host.markdownOrderVersion=undefined;host.collect=emit=>original.host.collect(fact=>emit(fact));}
          const d=new M.SourceContributorDiscovery(f.repository,host,runtime());equal((await d.rebuild()).outcome,'ready','Current derivative root');
          const root=await f.repository.readDependencyRoot(()=>true),decoded=JSON.parse(root.data);equal(decoded.version,version,'Retained order format');equal(decoded.urlIdentityVersion,1,'Current capability committed');
          const endpoint=ref('https://obsidian.md/Slug','url'),scope={kind:'neighborhood',endpoints:[endpoint]};
          const selected=await d.discover(scope);equal(selected.outcome,'ready','Current canonical URL cover');equal(selected.sourceIds,['Owner.md'],'Genuine referring owner');
          const db=await f.cache.open(),before=await value(db.transaction('sourceHeads').objectStore('sourceHeads').getAll());
          reopened=new M.KplexIndexedDbCache(name);ok(await reopened.open(),'Durable reopen');
          const warm=new M.SourceContributorDiscovery(reopened.sources,host,runtime());equal((await warm.discover(scope)).sourceIds,['Owner.md'],'Capability survives durable root codec');
          const legacy={...decoded};delete legacy.urlIdentityVersion;const data=JSON.stringify(legacy),digest=await f.repository.observationDigest(data);
          await edit(db,['meta'],tx=>tx.objectStore('meta').put({...root,data,digest}));
          equal((await d.discover(scope)).reason,'dependency-pending','Old root cannot certify canonical URL absence');
          equal((await d.discover({kind:'neighborhood',endpoints:[ref('Owner.md')]})).outcome,'ready','Historical document capability retained');
          equal(await value(db.transaction('sourceHeads').objectStore('sourceHeads').getAll()),before,'No source head rewrite');
          // Keeping the old digest while restoring the flag must fail before any URL cover escapes.
          await edit(db,['meta'],tx=>tx.objectStore('meta').put({...root,digest}));
          equal((await d.discover(scope)).reason,'dependency-invalid','URL marker is checksum-bound');
        }finally{reopened?.close();f.close();}
      }return true;
    })()`),true);
  } finally { await browser.cleanup(); }
});
