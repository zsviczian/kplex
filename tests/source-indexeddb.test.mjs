/** Real browser IndexedDB integration; a missing/blocked browser FAILS this lane, never counts as a skip. */
import assert from "node:assert/strict";
import test from "node:test";
import { browserBundle, chromiumHarness } from "./support/browserTypeScript.mjs";

const bundle = await browserBundle(["src/index/IndexedDbCache.ts", "src/index/SourceFacts.ts", "src/core/parser/metadata.ts", "src/index/CachedSourceSemantics.ts"], {
  obsidian: "exports.Platform={isMobile:false,isIosApp:false};",
});

/** Test-only helpers call production owners and real IDB transactions. No IndexedDB implementation is mocked. */
const initialize = `(() => {
  const M = window.sourceModules;
  window.ok = (value, message) => { if (!value) throw new Error(message); };
  window.equal = (actual, expected, message) => ok(JSON.stringify(actual) === JSON.stringify(expected), message + ': ' + JSON.stringify(actual));
  window.requestValue = request => new Promise((resolve, reject) => { request.onsuccess=()=>resolve(request.result); request.onerror=()=>reject(request.error); });
  window.databaseName = vault => 'k-plex-index-v1-' + [...new TextEncoder().encode(vault)].map(v=>v.toString(16).padStart(2,'0')).join('').slice(0,96);
  window.rawOpen = (name, version, upgrade) => new Promise((resolve,reject) => {
    const request = indexedDB.open(name,version); request.onupgradeneeded=()=>upgrade?.(request.result,request.transaction);
    request.onsuccess=()=>resolve(request.result); request.onerror=()=>reject(request.error); request.onblocked=()=>reject(new Error('Unexpected blocked fixture open'));
  });
  window.edit = async (db, stores, callback) => {
    const tx = db.transaction(stores,'readwrite');
    const done = new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error ?? new Error('Fixture transaction aborted'));tx.onerror=()=>reject(tx.error);});
    const [value] = await Promise.all([callback(tx),done]); return value;
  };
  window.fresh = async vault => { const cache = new M.KplexIndexedDbCache(vault); ok(await cache.open(), 'Production cache must open real IDB'); return cache; };
  window.make = async (repository,id,expected={kind:'missing'},bodyText='Field:: [[Alpha]]',frontmatter={}) => {
    const body=M.parseBodyMetadata(bodyText); const metadata={...body,frontmatter,aliases:[],tags:[]};
    return {sourceId:id,physical:{identity:id+'-incarnation',path:id+'.md',mtime:1,size:bodyText.length,ctime:1},
      observation:{epoch:'browser',revision:1,environment:await repository.observationDigest('host')},expected,
      families:{values:async emit=>{for(const fact of M.sourceValueSteps(metadata))if(!await emit(fact))return false;return true;},
        'body-urls':async emit=>{for(const url of body.urls)if(!await emit({kind:'body-url',...url}))return false;return true;},
        metadata:async emit=>emit({kind:'alias',value:'label'}),resolution:async()=>true}};
  };
  window.owners = async (repository,key) => { const ids=[];ok(await repository.querySources('literal',key,batch=>{ids.push(...batch);return true;}),'Posting query available');return ids; };
  window.cache = null;
  return true;
})()`;

// One profile is intentionally retained through a NEW Chromium process, then removed in finally.
test("real Chromium: version migration, atomic source heads, repair, failure recovery and process restart", { timeout: 180000 }, async t => {
  const browser = await chromiumHarness(bundle);
  try {
    await browser.evaluate(initialize);
    await t.test("cold v6 plus v4 upgrade preserve legacy stores, body-v2 and schema-1/2/3 pointers", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        cache=await fresh('cold'); const db=await cache.open(); equal(db.version,6,'Cold database version');
        for(const name of ['meta','pages','evidence','bodies','snapshotChunks','sourceHeads','sourceChunks','sourcePostings','sourceDependencies'])ok(db.objectStoreNames.contains(name),'Missing store '+name);
        const tx=db.transaction(['sourceChunks','sourcePostings','meta'],'readonly');
        ok(tx.objectStore('sourceChunks').indexNames.contains('sourceFamilyRevision'),'Family index');
        ok(tx.objectStore('sourcePostings').indexNames.contains('lookup'),'Posting lookup index');
        ok(tx.objectStore('meta').indexNames.contains('sourceLease'),'Persistent lease index');cache.close();
        const legacy=await rawOpen(databaseName('upgrade'),4,db=>{
          db.createObjectStore('meta',{keyPath:'key'}); db.createObjectStore('bodies',{keyPath:'path'});
          for(const [name,keyPath] of [['pages',['generation','path']],['evidence',['generation','key']],['snapshotChunks',['generation','kind','index']]])db.createObjectStore(name,{keyPath}).createIndex('generation','generation');
        });
        const body=sourceModules.parseBodyMetadata('Field:: [[Alpha]]');
        await edit(legacy,['bodies','meta','pages','evidence','snapshotChunks'],tx=>{
          tx.objectStore('bodies').put({path:'legacy.md',mtime:1,parserVersion:2,body});
          tx.objectStore('meta').put({key:'active',schema:3,generation:'legacy',createdAt:1,vaultSignature:'v',settingsSignature:'s',discoveredFields:[],pageChunkCount:1,evidenceChunkCount:0});
          tx.objectStore('meta').put({key:'checkpoint',schema:2,generation:'checkpoint',createdAt:1,vaultSignature:'v',settingsSignature:'s',discoveredFields:[],completedMarkdownPaths:[]});
          tx.objectStore('pages').put({generation:'legacy',path:'retained',value:{retained:true}});
          tx.objectStore('evidence').put({generation:'legacy',key:'retained',value:{retained:true}});
          tx.objectStore('snapshotChunks').put({generation:'legacy',kind:'pages',index:0,values:[]});
        });legacy.close();
        cache=await fresh('upgrade'); equal(await cache.getBody('legacy.md',1),body,'Body-v2 unchanged');
        const upgraded=await cache.open();const stored=await requestValue(upgraded.transaction('bodies').objectStore('bodies').get('legacy.md'));
        ok(!Object.hasOwn(stored,'size'),'Legacy record must not invent size');
        equal((await cache.readSnapshotMeta()).schema,3,'Schema 3 pointer preserved');equal((await cache.readSnapshotMeta('checkpoint')).schema,2,'Schema 2 pointer preserved');
        for(const name of ['pages','evidence','snapshotChunks'])equal(await requestValue(upgraded.transaction(name).objectStore(name).count()),1,'Legacy store retained');
        await edit(upgraded,['meta'],tx=>tx.objectStore('meta').put({key:'active',schema:1,generation:'one',createdAt:1,vaultSignature:'v',settingsSignature:'s',discoveredFields:[]}));
        equal((await cache.readSnapshotMeta()).schema,1,'Schema 1 remains readable');cache.close();cache=await fresh('durability');return true;
      })()`), true);
    });

    await t.test("staging is invisible; activated A/B survive process interruption with only C incomplete", async () => {
      const before = await browser.evaluate(`(async()=>{
        const r=cache.sources;
        equal((await r.replace(await make(r,'A'))).outcome,'activated','A activation');
        equal((await r.replace(await make(r,'B'))).outcome,'activated','B activation');
        const a=await r.inspect('A'),b=await r.inspect('B');ok(b.sequence>a.sequence,'Global monotonic sequence');
        const pending=await make(r,'C'); let signal;const staged=new Promise(resolve=>signal=resolve);
        pending.families.metadata=async emit=>{for(let i=0;i<256;i++)if(!await emit({kind:'alias',value:'stage-'+i}))return false;signal();await new Promise(()=>{});return true;};
        window.interruptedWrite=r.replace(pending);await staged;
        equal((await r.inspect('C')).reason,'missing','No head for staged C');
        equal(await owners(r,'Alpha'),['A','B'],'Staged postings invisible');
        return [a.sequence,b.sequence];
      })()`);
      await browser.restart();
      await browser.evaluate(initialize);
      const after = await browser.evaluate(`(async()=>{
        cache=await fresh('durability');const r=cache.sources;const a=await r.inspect('A'),b=await r.inspect('B');
        equal(a.reason,'ready','A restored');equal(b.reason,'ready','B restored');equal((await r.inspect('C')).reason,'missing','Only C pending');
        ok(await r.readBody('A',()=>true),'Immutable body restored without parser');
        equal(await owners(r,'Alpha'),['A','B'],'Orphan staging remains invisible after new process');return [a.sequence,b.sequence];
      })()`);
      assert.deepEqual(after, before);
    });

    await t.test("family-local missing/corrupt chunks and postings repair without dropping other sources", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const r=cache.sources,db=await cache.open();let a=await r.inspect('A');const b=await r.inspect('B');
        const key=['A',a.head.families.metadata.revision,'metadata',0];
        await edit(db,['sourceChunks'],tx=>tx.objectStore('sourceChunks').delete(key));
        const bad=await r.inspect('A');equal(bad.families.metadata,'missing-chunk','Only missing metadata rejected');equal(bad.families.values,'ready','Values retained');
        equal((await r.inspect('B')).sequence,b.sequence,'Unrelated B unchanged');ok(await r.readBody('A',()=>true),'Body independent of metadata corruption');
        let replacement=await make(r,'A',bad.expected);for(const family of ['values','body-urls','resolution'])replacement.families[family]=bad.head.families[family];
        equal((await r.replace(replacement)).outcome,'activated','Selective family repair');a=await r.inspect('A');equal(a.reason,'ready','Repair validated');
        equal(a.head.families.values.revision,bad.head.families.values.revision,'Valid family revision retained');
        const postingKey=['A',a.head.families.values.revision,'values',0];
        await edit(db,['sourcePostings'],tx=>tx.objectStore('sourcePostings').delete(postingKey));
        const missing=await r.inspect('A');equal(missing.families.values,'missing-posting','Missing posting rejected');equal((await r.inspect('B')).reason,'ready','B still valid');
        replacement=await make(r,'A',missing.expected);equal((await r.replace(replacement)).outcome,'activated','Posting repaired from canonical facts');
        a=await r.inspect('A');const corruptKey=['A',a.head.families.values.revision,'values',0];
        await edit(db,['sourceChunks'],async tx=>{const store=tx.objectStore('sourceChunks');const chunk=await requestValue(store.get(corruptKey));chunk.data+=' ';store.put(chunk);});
        equal((await r.inspect('A')).families.values,'invalid-chunk','Payload/digest corruption rejected');
        equal((await r.replace(await make(r,'A',(await r.inspect('A')).expected))).outcome,'activated','Corrupt chunk repaired');return true;
      })()`), true);
    });

    await t.test("cross-connection CAS rejects an obsolete writer; pinned and head-selected revisions cannot be cleaned", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const r=cache.sources;const initial=await r.inspect('A');
        const other=await fresh('durability');let signal,release;
        const paused=new Promise(resolve=>signal=resolve),gate=new Promise(resolve=>release=resolve);
        const old=await make(r,'A',initial.expected,'Field:: [[Old]]');
        old.families.metadata=async emit=>{signal();await gate;return emit({kind:'alias',value:'old'});};
        const obsolete=r.replace(old);await paused;
        const newer=await make(other.sources,'A',initial.expected,'Field:: [[New]]');equal((await other.sources.replace(newer)).outcome,'activated','Independent newer writer');
        release();equal((await obsolete).outcome,'superseded','Expected-head CAS rejects old writer');other.close();
        equal(await owners(r,'Old'),[],'Obsolete postings hidden');equal(await owners(r,'New'),['A'],'Only new revision contributes');
        const selected=await r.inspect('A');const revision=selected.head.families.values.revision;
        equal(await r.cleanupRevision('A',revision),false,'Head-referenced revision protected');
        let readerReady,readerRelease;const ready=new Promise(resolve=>readerReady=resolve),wait=new Promise(resolve=>readerRelease=resolve);
        const reader=r.visit('A','values',async()=>{readerReady();await wait;return true;});await ready;
        equal((await r.replace(await make(r,'A',selected.expected,'Field:: [[Newest]]'))).outcome,'activated','Replace while reader owns old pin');
        equal(await r.cleanupRevision('A',revision),false,'Pinned old revision protected');readerRelease();equal(await reader,'ready','Reader snapshot remains complete');
        equal(await r.cleanupRevision('A',revision),true,'Retired revision reclaimed after release');
        const db=await cache.open();const head=await requestValue(db.transaction('sourceHeads').objectStore('sourceHeads').get('A'));
        await edit(db,['sourceHeads'],tx=>tx.objectStore('sourceHeads').put({...head,formatVersion:999}));
        equal((await r.inspect('A')).reason,'format-version','Unknown format invalidates only A');
        equal(await r.cleanupRevision('A',initial.head.sourceRevision),false,'Uncertain catalog never authorizes deletion');
        equal((await r.inspect('B')).reason,'ready','Format corruption does not delete B');
        await edit(db,['sourceHeads'],tx=>tx.objectStore('sourceHeads').put(head));return true;
      })()`), true);
    });

    await t.test("faults before/between chunks and during head activation leave old disk head readable, unsaved memory reusable and retry bounded", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        for(const phase of ['before-chunks','between-chunks','before-head','abort-head']){
          const vault='fault-'+phase;const writer=await fresh(vault);const r=writer.sources;
          equal((await r.replace(await make(r,'source'))).outcome,'activated','Baseline activated');const previous=await r.inspect('source');
          const add=IDBObjectStore.prototype.add,put=IDBObjectStore.prototype.put;let chunks=0,fired=false;
          IDBObjectStore.prototype.add=function(value,...args){
            if(this.name==='sourceChunks'&&!fired&&((phase==='before-chunks')||(phase==='between-chunks'&&++chunks===2))){fired=true;throw new DOMException('Injected quota','QuotaExceededError');}
            return add.call(this,value,...args);
          };
          IDBObjectStore.prototype.put=function(value,...args){
            if(this.name==='sourceHeads'&&!fired&&(phase==='before-head'||phase==='abort-head')){
              fired=true;if(phase==='before-head')throw new DOMException('Injected quota','QuotaExceededError');
              const request=put.call(this,value,...args);this.transaction.abort();return request;
            }
            return put.call(this,value,...args);
          };
          let result;
          try {result=await r.replace(await make(r,'source',previous.expected,'Field:: [[Changed]]', {Long:'[[Changed]] '+ 'x'.repeat(600000)}));}
          finally {IDBObjectStore.prototype.add=add;IDBObjectStore.prototype.put=put;}
          ok(fired,'Fault reached '+phase);equal(result.outcome,'unsaved','Storage failure keeps validated memory');equal(result.sequence,null,'No false durable sequence');ok(result.live,'Live caller may continue');
          const inspector=await fresh(vault);equal((await inspector.sources.inspect('source')).sequence,previous.sequence,'Old activated disk head readable');inspector.close();
          ok(await r.readBody('source',()=>true),'Memory uses identical immutable body contract');
          ok(r.getDiagnostics().unsaved>0,'Unsaved progress exposed');
          // Wait through the production connection-owner backoff; the explicit stop coalesces retries.
          await new Promise(resolve=>setTimeout(resolve,1100));ok(await r.flush(),'Recovered retry durably saves facts');
          ok((await r.inspect('source')).sequence>previous.sequence,'Recovery advances sequence');writer.close();
        }return true;
      })()`), true);
    });

    await t.test("evicted unsaved facts mask an older durable head until selective reacquisition", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const vault='memory-eviction';const writer=await fresh(vault);const r=writer.sources;
        equal((await r.replace(await make(r,'A',{kind:'missing'},'Field:: [[Old]]'))).outcome,'activated','Old A activation');
        const old=await r.inspect('A');const originalOpen=r.storage.open;
        r.storage.open=async()=>null;
        const large=target=>({Long:'[['+target+']] '+ 'x'.repeat(3000000)});
        equal((await r.replace(await make(r,'A',old.expected,'',large('Changed')))).outcome,'unsaved','Changed A held unsaved');
        equal((await r.replace(await make(r,'B',{kind:'missing'},'',large('Beta')))).outcome,'unsaved','B held unsaved');
        equal((await r.replace(await make(r,'C',{kind:'missing'},'',large('Gamma')))).outcome,'unsaved','C evicts oldest payload');
        const masked=await r.inspect('A');equal(masked.reason,'unsaved','Evicted A masks old disk head');equal(masked.head,null,'No stale head exposed');
        equal(await r.readBody('A',()=>true),null,'No stale body replay after eviction');
        r.storage.open=originalOpen;
        const leaked=[];equal(await r.querySources('literal','Old',ids=>{leaked.push(...ids);return true;}),false,'Evicted unsaved lookup is incomplete');
        equal(leaked,[],'No old durable owner leak');
        equal((await r.readSelected('A',()=> 'ready',async()=>true)).outcome,'pending-acquisition','New multi-family path respects eviction');
        const expected=await r.catalogExpectation('A');
        equal((await r.replace(await make(r,'A',expected,'',large('Changed')))).outcome,'activated','A selectively reacquired');
        const restored=await r.inspect('A');ok(restored.sequence>old.sequence,'Reacquisition advances durable sequence');
        equal(await owners(r,'Old'),[],'Old posting remains inactive');equal(await owners(r,'Changed'),['A'],'Current posting restored');
        writer.close();return true;
      })()`), true);
    });

    await t.test("record/byte bounds, explicit empty source, source cancellation and unload", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const r=cache.sources;const input=await make(r,'bounded',{kind:'missing'},'', {Long:'[[Alpha]] '+'x'.repeat(700000)});
        equal((await r.replace(input)).outcome,'activated','Large payload activation');const head=(await r.inspect('bounded')).head;
        const db=await cache.open();const chunks=await requestValue(db.transaction('sourceChunks').objectStore('sourceChunks').index('sourceRevision').getAll(['bounded',head.sourceRevision]));
        ok(chunks.length>4,'Large shared payload is chunked');for(const chunk of chunks){ok(chunk.records<=256,'Record cap');ok(chunk.bytes<=256*1024,'Ordinary payload chunk byte cap');}
        ok(r.getDiagnostics().peakDecodeBytes<=sourceModules.SOURCE_DECODE_BUDGET_BYTES,'Simultaneous decode budget');
        const empty=await make(r,'empty',{kind:'missing'},'');empty.families.metadata=async()=>true;
        equal((await r.replace(empty)).outcome,'activated','Empty is acquired');const emptyHead=(await r.inspect('empty')).head;
        for(const family of sourceModules.SOURCE_FAMILIES){equal(emptyHead.families[family].records,0,'Empty record count');equal(emptyHead.families[family].chunks,1,'Explicit final chunk');}
        let release,signal;const ready=new Promise(resolve=>signal=resolve),gate=new Promise(resolve=>release=resolve);
        const pending=await make(r,'cancelled');pending.families.metadata=async()=>{signal();await gate;return true;};
        const task=r.replace(pending);await ready;r.cancelSource('cancelled');release();equal((await task).outcome,'cancelled','Cancellation prevents activation');equal((await r.inspect('cancelled')).head,null,'No cancelled head');
        const closing=await fresh('close');const closed=closing.sources.replace(await make(closing.sources,'closed'));closing.close();equal((await closed).outcome,'cancelled','Unload fence');
        return true;
      })()`), true);
    });

    await t.test("SI4a selected-head replay is coherent across connections and releases pins on all terminal paths", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const first=await fresh('si4a-selection'),second=await fresh('si4a-selection'),r=first.sources,other=second.sources;
        await r.replace(await make(r,'A'));await r.replace(await make(r,'B'));
        const a=await r.inspect('A'),b=await r.inspect('B');const db=await second.open();
        const leases=()=>requestValue(db.transaction('meta').objectStore('meta').index('sourceLease').count(['A',a.head.sourceRevision]));
        let held,seen=[];
        const changed=await r.readSelected('A',()=> 'ready',async selected=>{
          held=selected;ok(await leases()>0,'Reader lease exists during multi-family callback');
          equal(await selected.visit('values',records=>{seen.push(...records);return true;}),'ready','Initial family');
          equal((await other.replace(await make(other,'A',a.expected,'Field:: [[Replacement]]'))).outcome,'activated','Other connection changes head');
          equal(await other.cleanupRevision('A',a.head.sourceRevision),false,'Pinned retired family cannot be reclaimed');
          equal(await selected.visit('metadata',records=>{seen.push(...records);return true;}),'superseded','Different head rejects the entire read');
          return 'not published';
        });
        equal(changed.outcome,'stale','No mixed-head result');ok(!('value' in changed),'No partial value');
        ok(!JSON.stringify(seen).includes('Replacement'),'One selected revision only');equal(await leases(),0,'Stale read released lease');
        equal(await held.visit('values',()=>true),'cancelled','Reader capability cannot escape lifetime');
        ok(await other.cleanupRevision('A',a.head.sourceRevision),'Retired revision can be reclaimed after release');
        const current=await r.inspect('A');
        const currentLeases=()=>requestValue(db.transaction('meta').objectStore('meta').index('sourceLease').count(['A',current.head.sourceRevision]));
        const ready=await r.readSelected('A',()=> 'ready',async selected=>{
          for(const family of sourceModules.SOURCE_FAMILIES)equal(await selected.visit(family,()=>true),'ready','Validated family '+family);return 'complete';
        });equal(ready.outcome,'ready','Success');equal(await currentLeases(),0,'Success released lease');
        const rejected=await r.readSelected('A',()=> 'ready',async()=>{throw new sourceModules.SourceFactError('invalid-frame','resolution');});
        equal(rejected.outcome,'invalid-family','Consumer rejection');equal(await currentLeases(),0,'Rejection released lease');
        let valid=true;
        const cancelled=await r.readSelected('A',()=> 'ready',async selected=>{await selected.visit('values',()=>true);valid=false;return true;},()=>valid);
        equal(cancelled.outcome,'cancelled','Cancellation');equal(await currentLeases(),0,'Cancellation released lease');
        const closed=await r.readSelected('A',()=> 'ready',async()=>{first.close();return true;});
        equal(closed.outcome,'cancelled','Unload');equal(await currentLeases(),0,'Unload released lease using original connection');
        equal((await other.inspect('B')).sequence,b.sequence,'Independent source intact');second.close();return true;
      })()`), true);
    });

    await t.test("SI4a selected reads reject corrupt durable families and newer format without publishing", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const owner=await fresh('si4a-corruption'),r=owner.sources,db=await owner.open();
        await r.replace(await make(r,'intact'));const intact=await r.inspect('intact');
        for(const fault of ['missing-chunk','invalid-chunk','missing-posting','invalid-posting','format-version']){
          await r.replace(await make(r,fault));const selected=await r.inspect(fault),revision=selected.head.families.values.revision;
          if(fault==='format-version')await edit(db,['sourceHeads'],tx=>tx.objectStore('sourceHeads').put({...selected.head,sequence:selected.sequence,formatVersion:99}));
          else {const store=fault.includes('posting')?'sourcePostings':'sourceChunks',key=[fault,revision,'values',0];
            await edit(db,[store],async tx=>{const value=await requestValue(tx.objectStore(store).get(key));
              if(fault.startsWith('missing'))tx.objectStore(store).delete(key);else tx.objectStore(store).put({...value,[store==='sourcePostings'?'key':'digest']:'corrupt'});
            });}
          const result=await r.readSelected(fault,()=> 'ready',async reader=>{await reader.visit('values',()=>true);return 'must not escape';});
          equal(result.outcome,'invalid-family','Closed failure '+fault);ok(!('value' in result),'No partial value '+fault);
          equal(await requestValue(db.transaction('meta').objectStore('meta').index('sourceLease').count([fault,selected.head.sourceRevision])),0,'Failure released all leases');
          equal((await r.inspect('intact')).sequence,intact.sequence,'Intact source preserved');
        }owner.close();return true;
      })()`), true);
    });

    await t.test("SI4a postings union competing endpoints and durable replay changes policy without changing source heads", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const owner=await fresh('si4a-semantics'),r=owner.sources,M=sourceModules;
        const refs=Object.fromEntries(['A','B'].map(id=>[id,{id,kind:'document',state:'materialized',semanticPath:id+'.md',physicalPath:id+'.md'}]));
        const entities=Object.fromEntries(['A','B'].map(id=>[id,{kind:'entity',source:refs[id],sourceRevision:'physical:1',entity:refs[id],name:id,url:null,semanticMtime:1,
          file:{path:id+'.md',name:id+'.md',extension:'md',mtime:1,ctime:1,size:100,basename:id}}]));
        for(const [id,field,target] of [['A','Friends','B'],['B','Opposes','A']]){
          const input=await make(r,id,{kind:'missing'},'',{[field]:'[['+target+']]'});
          const metadata={...M.parseBodyMetadata(''),frontmatter:{[field]:'[['+target+']]'},aliases:[],tags:[]};
          input.families.metadata=async emit=>{for(const name of M.sourceFieldNames(metadata))if(!await emit(name))return false;return true;};
          input.families.resolution=async emit=>{for(const fact of M.sourceValueSteps(metadata))if(fact?.kind==='reference-candidate'){
            if(!await emit({kind:'reference-resolution',valueId:fact.valueId,ordinal:fact.ordinal,target:{entity:refs[target],rawTarget:fact.rawTarget,resolvedBy:'host'},hostOccurrenceCount:0}))return false;
          }return true;};
          equal((await r.replace(input)).outcome,'activated','Durable source '+id);
        }
        const reader=new M.CachedSourceSemanticReader(r);
        const queries=[{kind:'field',key:'friends'},{kind:'target',key:'A'},{kind:'literal',key:'A'},{kind:'field',key:'friends'}];
        const candidates=await reader.discover(queries,()=>true);equal(candidates.outcome,'candidates','Indexed discovery');
        equal(candidates.coverage,'candidates-only','Never claim pair completeness');equal([...candidates.sourceIds].sort(),['A','B'],'Both endpoints exactly once');
        const families=await reader.discover([{kind:'family',key:'values'}],()=>true);equal([...families.sourceIds].sort(),['A','B'],'Family posting discovery');
        const heads=await Promise.all(['A','B'].map(id=>r.inspect(id)));
        const requests=heads.map((selected,index)=>{const id=['A','B'][index];return {sourceId:id,host:{source:refs[id],physical:selected.head.physical,observation:selected.head.observation,isCurrent:()=>true,
          structure:emit=>emit(entities[id]),presentation:async()=>true,hostLink:()=>{throw Error('No host-link in fixture');},bodyUrl:()=>{throw Error('No body URL in fixture');}}};});
        const config={hierarchy:{hidden:[],parents:[],children:[],leftFriends:['Friends'],rightFriends:['Opposes'],previous:[],next:[]},inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
        const runtime={now:()=>performance.now(),yield:()=>new Promise(resolve=>setTimeout(resolve,0)),isCurrent:()=>true,sliceBudgetMs:8,resolverBatchSize:50};
        const write=r.replace;r.replace=async()=>{throw Error('Policy must not write source facts');};
        for(let index=0;index<2;index++){
          const settings=index?{...config,hierarchy:{...config.hierarchy,leftFriends:[],rightFriends:['Friends','Opposes']}}:config;
          const result=await reader.prepare([...requests,requests[0]],{revision:'policy:'+index,settings,isCurrent:()=>true},{entity:ref=>entities[ref.id]},runtime);
          equal(result.outcome,'ready','Durable cached semantics');equal(result.work.map(work=>work.familyVisits),[4,4],'Exactly one replay per owner');
          equal([...result.compilation.declarations()].length,2,'Two genuine endpoint declarations, no duplicate requested owner');
          const roles=[...result.compilation.declarations()].map(d=>d.role).sort();equal(roles,index?['right','right']:['left','right'],'Current policy semantics');
          for(let source=0;source<2;source++){equal(result.sources[source].sequence,heads[source].sequence,'Policy leaves completion sequence unchanged');equal(result.sources[source].head.sourceRevision,heads[source].head.sourceRevision,'Same neutral head');}
        }
        r.replace=write;
        const invalidPosting=await requestValue((await owner.open()).transaction('sourcePostings').objectStore('sourcePostings').index('lookup').get(IDBKeyRange.bound(['field','friends'],['field','friends',[]],false,true)));
        await edit(await owner.open(),['sourcePostings'],tx=>tx.objectStore('sourcePostings').put({...invalidPosting,unexpected:true}));
        const incomplete=await reader.discover(queries,()=>true);equal(incomplete.outcome,'pending-acquisition','Malformed indexed candidate makes discovery incomplete');ok(!('sourceIds' in incomplete),'No partial candidate list');
        owner.close();return true;
      })()`), true);
    });

    await t.test("broken graph snapshot does not remove sources; newer-database VersionError is nondestructive", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const r=cache.sources;const db=await cache.open();const a=await r.inspect('A');
        const meta={key:'active',schema:3,generation:'broken',createdAt:1,vaultSignature:'v',settingsSignature:'s',discoveredFields:[],pageChunkCount:1,evidenceChunkCount:0};
        await edit(db,['meta'],tx=>tx.objectStore('meta').put(meta));const reasons=[];
        equal(await cache.iterateSnapshotPages(meta,()=>{throw new Error('No page expected');},()=>true,reason=>reasons.push(reason)),false,'Missing graph chunk rejected');
        equal(reasons,['missing-chunk'],'Graph failure reason');equal((await r.inspect('A')).sequence,a.sequence,'Neutral head unaffected');
        let oldError;try{await rawOpen(databaseName('durability'),4);}catch(error){oldError=error.name;}equal(oldError,'VersionError','An old binary cannot downgrade v6');
        const newer=await rawOpen(databaseName('newer'),7,db=>db.createObjectStore('sentinel'));await edit(newer,['sentinel'],tx=>tx.objectStore('sentinel').put('retained','key'));newer.close();
        const old=new sourceModules.KplexIndexedDbCache('newer');equal(await old.readSnapshotMeta(),null,'VersionError falls back');
        equal(old.sources.getDiagnostics().activated,0,'No fake progress');await old.sources.inspect('anything');equal(old.sources.getDiagnostics().lastReason,'newer-database','Closed reason');old.close();
        const intact=await rawOpen(databaseName('newer'),7);equal(await requestValue(intact.transaction('sentinel').objectStore('sentinel').get('key')),'retained','No destructive reset');intact.close();
        const diagnostics=JSON.stringify(r.getDiagnostics());ok(!/\.md|Alpha|Changed|Dormant|hierarchy|Field|Long/.test(diagnostics),'Aggregate-only diagnostic privacy');cache.close();return true;
      })()`), true);
    });
  } finally { await browser.cleanup(); }
});
