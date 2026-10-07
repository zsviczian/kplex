/** C2-S2 real IDB transactions; a blocked/unavailable browser FAILS this required validation lane. */
import assert from "node:assert/strict";
import test from "node:test";
import { chromiumHarness } from "./support/browserTypeScript.mjs";
import { contributorBrowserBundle, contributorBrowserInitialize } from "./support/contributorBrowserFixture.mjs";
const bundle = await contributorBrowserBundle();

/**
 * Direct neutral-source replacement deliberately isolates an UNCHANGED host capability. It models
 * source-cache maintenance, not a vault edit with omitted events. Actual event-driven edits are
 * tested separately and MUST remain unknown until a complete changed-host capability exists.
 */
const initialize = `(() => {
  const M=sourceModules;
  window.sourceOwner=id=>({kind:'source',sourceId:id});
  window.journal=async(f,id='A.md')=>f.repository.readContributorJournal(sourceOwner(id));
  window.repairRequest=async(f,id='A.md')=>{const captured=await f.acquisition.captureForReplay(id,{noteTypeField:'Type',primaryTagField:'Style'},runtime());equal(captured.outcome,'ready','Current canonical replay capability');return captured.request;};
  window.repairInput=async(f,id='A.md',text='Friends:: [[B]]')=>{
    const inspection=await f.repository.inspect(id),file=f.files.get(id),cache=f.metadata.get(id);
    ok(inspection.head,'Selected head');const body=M.parseBodyMetadata(text),metadata=M.mergeFileMetadata(cache,body);
    return {sourceId:id,physical:inspection.head.physical,observation:inspection.head.observation,expected:inspection.expected,
      families:{values:async emit=>{for(const fact of M.sourceValueSteps(metadata))if(!await emit(fact))return false;return true;},
      'body-urls':async emit=>{for(const url of body.urls)if(!await emit({kind:'body-url',...url}))return false;return true;},
      metadata:inspection.head.families.metadata,
      resolution:f.acquisition.resolution(metadata,file,cache,inspection,false,false,()=>true)}};
  };
  window.repairSeed=async(name,owners=3)=>{
    const f=await fixture(name);f.add('A.md','Friends:: plain');f.add('B.md','');f.add('C.md','');
    for(let i=3;i<owners;i++)f.add('Unrelated-'+i+'.md','');await f.acquire();f.discovery=await f.build();return f;
  };
  window.rejected=async(promise,reason)=>{try{await promise;}catch(error){if(reason)equal(error.reason,reason,'Finite failure');return;}throw new Error('Expected rejection');};
  return true;
})()`;

test("real Chromium owner repair journal: atomic authority, recovery, leases and compatibility", { timeout: 180000 }, async t => {
  const browser = await chromiumHarness(bundle);
  try {
    await browser.evaluate(contributorBrowserInitialize); await browser.evaluate(initialize);

    await t.test("A adds B: durable unknown precedes staging and head activation, then known remains non-ready", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await repairSeed('s2-atomic'),db=await f.cache.open(),other=new M.KplexIndexedDbCache('s2-atomic');await other.open();
        const before=await f.repository.inspect('A.md'),root=await f.repository.readDependencyRoot(()=>true),input=await repairInput(f);
        let entered,release;const staged=new Promise(resolve=>entered=resolve),gate=new Promise(resolve=>release=resolve),values=input.families.values;
        input.families.values=async emit=>{entered();await gate;return values(emit);};
        const writing=f.repository.replace(input);await staged;
        const unknown=await other.sources.readContributorJournal(sourceOwner('A.md'));
        equal(unknown.status,'unknown','Ticket exists before any family producer');equal(unknown.selected,null,'Activation pending');
        equal(unknown.original.head,before.head,'Original selected head retained');equal(unknown.root,{build:root.build,digest:root.digest},'Original shared root retained');
        equal((await other.sources.inspect('A.md')).head,before.head,'Head has not changed');
        await rejected(other.sources.readDependencyRoot(()=>true),'dependency-pending');
        release();equal((await writing).outcome,'activated','New head and repair select atomically');
        const current=await journal(f);equal(current.ticket,unknown.ticket,'Same writer ticket');equal(current.status,'unknown','Activation is not impact closure');
        ok(current.selected.head.sequence>before.sequence,'New source sequence');
        const prepared=await f.discovery.prepareOwnerImpact('A.md',await repairRequest(f));equal(prepared.outcome,'known',JSON.stringify(prepared));
        ok(prepared.certificate.affectedKeys.includes(M.contributorKey('node','B.md')),'New target absent in old summary is included');
        ok(prepared.certificate.affectedKeys.includes(M.contributorKey('literal','B')),'New lexical key is included');
        equal(prepared.work.familyVisits,4,'Four canonical visits');equal((await journal(f)).ticket,unknown.ticket,'Known never retires ticket');
        equal((await f.discovery.discover(absent())).outcome,'pending','Even unrelated C/negative discovery stays pending');
        equal((await f.discovery.readOwnerImpact('A.md')).outcome,'known','Authenticated read-only proof');
        equal(await value(db.transaction('meta').objectStore('meta').get(M.SOURCE_DEPENDENCY_ROOT_KEY)),root,'No local root publication');
        other.close();f.close();return true;
      })()`), true);
    });

    await t.test("real edit plus C's Alias referrer stays unknown; topology/resolution/Date/Daily observations persist separately", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await fixture('s2-host');
        f.add('A.md','Friends:: plain');f.add('B.md','');f.add('C.md','Friends:: [[Alias]]');
        let alias='B.md';const resolve=f.app.metadataCache.getFirstLinkpathDest;
        f.app.metadataCache.getFirstLinkpathDest=(literal,...args)=>literal==='Alias'?f.files.get(alias):resolve(literal,...args);
        await f.acquire();f.discovery=await f.build();
        const oldC=await f.discovery.readOwnerSummary('C.md');ok(oldC.summary.keys.includes(M.contributorKey('node','B.md')),'Canonical old Alias binding');
        // Use the actual production event path, unlike isolated source-cache maintenance above.
        alias='A.md';
        const file=f.files.get('A.md');file.stat.mtime++;f.texts.set('A.md','Friends:: [[B]]');
        f.metadata.get('A.md').frontmatter.aliases=['Alias'];f.app.vault.trigger('modify',file);
        ok((await f.acquisition.acquire(file,M.parseBodyMetadata('Friends:: [[B]]'))).saved,'Edited source durable');await f.repository.flush();
        const host=await f.repository.readContributorJournal({kind:'host',id:'catalog'});equal(host.status,'unknown','Separate host owner');
        const result=await f.acquisition.contributorDiscovery(runtime()).prepareOwnerImpact('A.md',await repairRequest(f));
        equal(result.outcome,'unknown',JSON.stringify(result));equal(result.work.familyVisits,4,'Only edited owner prepared');ok(!('certificate'in result),'No incomplete referrer closure');
        equal((await journal(f)).status,'unknown','C cannot be excluded merely from direct keys');
        // The first resolver close belongs to the known modify wave. A second resolver event has no
        // causal TFile token and therefore exercises the uncertain/global host-journal lane.
        f.app.metadataCache.trigger('resolved');f.app.metadataCache.trigger('resolved');await f.repository.flush();
        const resolution=await f.repository.readContributorJournal({kind:'host',id:'catalog'});equal(resolution.change.kind,'resolution','Resolver event persisted');ok(resolution.ticket!==host.ticket,'Newer ticket');equal(resolution.root,host.root,'First anchor retained');
        f.app.vault.trigger('create',f.add('New.md',''));await f.repository.flush();equal((await f.repository.readContributorJournal({kind:'host',id:'catalog'})).change.kind,'topology','Topology unknown');
        const d=f.acquisition.contributorDiscovery(runtime());f.app.daily.folder='Other';equal(d.host.validate(),false,'Daily input observed');await f.repository.flush();
        equal((await f.repository.readContributorJournal({kind:'host',id:'catalog'})).change.kind,'environment','Environment unknown');
        f.close();return true;
      })()`), true);
    });

    await t.test("restoring a Date field does not erase its unknown host ticket or permit unchanged-host certification", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await fixture('s2-date');f.add('A.md','Friends:: plain',{Dormant:'2026-09-30'});f.add('B.md','');await f.acquire();const d=await f.build();
        equal((await f.repository.replace(await repairInput(f))).outcome,'activated','Source cache maintenance');
        f.app.dateFields.add('Dormant');equal(d.host.validate(),false,'Date change');f.app.dateFields.delete('Dormant');equal(d.host.validate(),true,'Accepted reversible validator');
        await f.repository.flush();const result=await d.prepareOwnerImpact('A.md',await repairRequest(f));
        ok(result.outcome!=='known','Open host transition still blocks impact CAS');equal((await journal(f)).status,'unknown','Not erased after revert');
        f.close();return true;
      })()`), true);
    });

    await t.test("stale tickets and head CAS across two real connections never overwrite a newer unknown", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await repairSeed('s2-cas'),other=new M.KplexIndexedDbCache('s2-cas');const db2=await other.open();
        equal((await f.repository.replace(await repairInput(f))).outcome,'activated','Initial dirty head');
        const original=(await journal(f)).original;let entered,release;const held=new Promise(resolve=>entered=resolve),gate=new Promise(resolve=>release=resolve);
        const digest=f.repository.runtime.digest;let paused=false;
        f.repository.runtime.digest=async text=>{if(!paused&&text.startsWith('{"version":1,"coverage":"complete-owner-impact"')){paused=true;entered();await gate;}return digest(text);};
        const preparing=f.discovery.prepareOwnerImpact('A.md',await repairRequest(f));await held;
        // Begin a newer real source mutation; its head has not yet activated.
        const ticket=await other.sources.beginDependencyMutation(db2,'A.md',()=>true);release();
        ok((await preparing).outcome!=='known','Old ticket rejected at durable activation');
        const newer=await other.sources.readContributorJournal(sourceOwner('A.md'));equal(newer.ticket,ticket,'Newer ticket survives');equal(newer.status,'unknown','No stale known overwrite');equal(newer.original,original,'First original retained');equal(newer.selected,null,'New writer pending');
        await rejected(other.sources.readDependencyRoot(()=>true),'dependency-pending');
        f.repository.runtime.digest=digest;other.close();f.close();return true;
      })()`), true);
    });

    await t.test("unchanged membership still updates the head-bound ticket; create/rename/delete/recreate retain separate original owners", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await repairSeed('s2-lifecycles');
        const first=await f.repository.inspect('A.md');equal((await f.repository.replace(await repairInput(f,'A.md','Friends:: plain'))).outcome,'activated','No key change still a new head');
        const one=await journal(f);ok(one.selected.head.sequence>first.sequence,'New sequence retained');
        equal((await f.repository.replace(await repairInput(f,'A.md','Friends:: plain'))).outcome,'activated','Second maintenance');
        const two=await journal(f);ok(two.ticket!==one.ticket,'New ticket');equal(two.original,one.original,'First anchor retained');
        equal(two.before,one.selected,'Exact immediate predecessor retained');
        // Production rename gives old/new physical paths distinct SourceIds and a host ticket.
        const file=f.files.get('A.md');f.files.delete('A.md');f.files.set('Renamed.md',file);f.metadata.set('Renamed.md',f.metadata.get('A.md'));f.texts.set('Renamed.md','Friends:: plain');file.path='Renamed.md';file.name='Renamed.md';file.basename='Renamed';
        f.app.vault.trigger('rename',file,'A.md');await f.repository.flush();
        ok((await f.acquisition.acquire(file,M.parseBodyMetadata('Friends:: plain'))).saved,'Renamed source durable');await f.repository.flush();
        const old=await journal(f),renamed=await journal(f,'Renamed.md');equal(old.original,one.original,'Old SourceId keeps original');equal(renamed.original.kind,'missing','New SourceId was absent');
        f.files.delete('Renamed.md');f.app.vault.trigger('delete',file);await f.repository.flush();equal((await journal(f,'Renamed.md')).status,'unknown','Delete remains repair');
        const recreated=f.add('Renamed.md','Friends:: plain');f.app.vault.trigger('create',recreated);await f.repository.flush();ok((await f.acquisition.acquire(recreated,M.parseBodyMetadata('Friends:: plain'))).saved,'Recreate durable');
        const replacement=await journal(f,'Renamed.md');ok(replacement.selected.head.physical.identity!==renamed.selected.head.physical.identity,'New incarnation');equal(replacement.original,renamed.original,'Cannot erase original absence');
        f.close();return true;
      })()`), true);
    });

    await t.test("quota/producer/activation interruption keeps old head plus unknown ticket, never a clean new head", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules;
        for(const fault of ['producer','impact-quota','activation']){
          const f=await repairSeed('s2-fault-'+fault),before=await f.repository.inspect('A.md'),input=await repairInput(f),observer=new M.KplexIndexedDbCache('s2-fault-'+fault),db=await observer.open();
          if(fault==='producer')input.families.values=async()=>{throw new Error('Injected producer interruption');};
          if(fault==='activation'){
            const finish=f.repository.finishDependencyMutation.bind(f.repository);
            f.repository.finishDependencyMutation=async(...args)=>{await finish(...args);args[0].abort();throw new M.SourceFactError('write-error');};
          }
          const result=await f.repository.replace(input);
          if(fault==='impact-quota'){
            equal(result.outcome,'activated','New head selected before impact');
            const original=IDBObjectStore.prototype.put;
            IDBObjectStore.prototype.put=function(row,...args){if(this.name===M.SOURCE_IMPACT_STORE&&row.status==='known')throw new DOMException('Injected quota','QuotaExceededError');return original.call(this,row,...args);};
            try{ok((await f.discovery.prepareOwnerImpact('A.md',await repairRequest(f))).outcome!=='known','Quota rejects certificate');}finally{IDBObjectStore.prototype.put=original;}
          }else{
            ok(result.outcome!=='activated','Head activation interrupted');equal(await value(db.transaction('sourceHeads').objectStore('sourceHeads').get('A.md')),before.head,'Old durable head preserved');
          }
          const retained=await value(db.transaction(M.SOURCE_IMPACT_STORE).objectStore(M.SOURCE_IMPACT_STORE).get(M.contributorJournalKey(sourceOwner('A.md'))));
          equal(retained.status,'unknown','Explicit repair survived fault');equal(retained.original.head,before.head,'Original evidence survived');
          observer.close();f.close();
        }return true;
      })()`), true);
    });

    await t.test("unknown recovery enumerates dirty owner IDs without unchanged heads; evicted/corrupt old pages stay non-ready", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await repairSeed('s2-reopen');equal((await f.repository.replace(await repairInput(f))).outcome,'activated','Dirty source');const retained=await journal(f);f.close();
        const cache=new M.KplexIndexedDbCache('s2-reopen'),db=await cache.open(),r=cache.sources;
        const reads=[];const get=IDBObjectStore.prototype.get;IDBObjectStore.prototype.get=function(...args){reads.push(this.name);return get.apply(this,args);};
        try{equal(await r.contributorJournalOwners(),[M.contributorJournalKey(sourceOwner('A.md'))],'Only changed owner enumerated');equal(await r.readContributorJournal(sourceOwner('A.md')),retained,'Exact ticket recovered');}finally{IDBObjectStore.prototype.get=get;}
        ok(!reads.includes('sourceHeads')&&!reads.includes('sourceChunks'),'Recovery does not scan/replay unchanged sources');await rejected(r.readDependencyRoot(()=>true),'dependency-pending');
        const anchor=await value(db.transaction('meta').objectStore('meta').get(M.SOURCE_IMPACT_ROOT_PREFIX+retained.slot));
        const host={stamp:JSON.parse(anchor.root.data).host,isCurrent:()=>true,validate:()=>true,collect:async()=>{throw new Error('No full host scan');},capture:async()=>{throw new Error('No owner scan');}};
        const d=new M.SourceContributorDiscovery(r,host,runtime());await edit(db,['sourceDependencies'],tx=>tx.objectStore('sourceDependencies').clear());
        ok((await d.readOwnerImpact('A.md')).outcome!=='known','Missing original pages never infer absence');equal((await r.readContributorJournal(sourceOwner('A.md'))).status,'unknown','Ticket retained');cache.close();return true;
      })()`), true);
    });

    await t.test("root-slot leases protect active historical readers across explicit full repair", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await repairSeed('s2-leases');equal((await f.repository.replace(await repairInput(f))).outcome,'activated','Dirty source');
        let entered,release;const held=new Promise(resolve=>entered=resolve),gate=new Promise(resolve=>release=resolve);
        const reading=f.repository.withContributorJournal(sourceOwner('A.md'),()=>true,async()=>{entered();await gate;return true;});
        // Observe rejection immediately so a superseded lease never becomes an unhandled promise.
        const settled=reading.then(()=>({ready:true}),error=>({reason:error.reason}));await held;
        equal((await f.discovery.rebuild()).outcome,'ready','Existing explicit global repair may select the other slot');
        const attempted=await f.discovery.rebuild();equal(attempted.reason,'backpressure','Next build cannot reclaim the leased old slot');
        release();equal((await settled).reason,'superseded','Full rebuild supersedes the old repair ticket');
        equal(f.repository.impactReaders.size,0,'Historical reader released');equal(f.repository.impactReadReservations,0,'Reservation released');
        equal((await f.discovery.rebuild()).outcome,'ready','Released slot reusable');
        const db=await f.cache.open(),leases=await value(db.transaction('meta').objectStore('meta').index(M.SOURCE_IMPACT_LEASE_INDEX).count());equal(leases,0,'No leaked durable root-slot pin');
        f.close();return true;
      })()`), true);
    });

    await t.test("actual v6 database upgrades additively to v10 and preserves every accepted record", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,seed=await repairSeed('s2-migration-seed'),db=await seed.cache.open(),names=[...db.objectStoreNames].filter(name=>![M.SOURCE_IMPACT_STORE,M.SOURCE_LOCAL_DEPENDENCY_STORE,M.SOURCE_LOCAL_OWNER_STORE,M.SOURCE_LOCAL_KEY_STORE,M.SOURCE_LOCAL_REPAIR_STORE,'urlOwners'].includes(name)),rows={},schema=[];
        for(const name of names){const store=db.transaction(name).objectStore(name);schema.push({name,keyPath:store.keyPath,indexes:[...store.indexNames].filter(index=>index!==M.SOURCE_IMPACT_LEASE_INDEX).map(index=>{const i=store.index(index);return {name:index,keyPath:i.keyPath,unique:i.unique,multiEntry:i.multiEntry};})});rows[name]=await value(store.getAll());}
        rows.meta=rows.meta.filter(row=>row.key!==M.SOURCE_IMPACT_ENABLED_KEY&&row.key!==M.SOURCE_LOCAL_DEPENDENCY_STATE_KEY);seed.close();
        const old=await rawOpen(dbName('s2-migrate-v6'),6,db=>{for(const spec of schema){const store=db.createObjectStore(spec.name,{keyPath:spec.keyPath});for(const index of spec.indexes)store.createIndex(index.name,index.keyPath,{unique:index.unique,multiEntry:index.multiEntry});}});
        await edit(old,names,tx=>{for(const name of names)for(const row of rows[name])tx.objectStore(name).put(row);});equal(old.version,6,'Actual old database, not just old root bytes');ok(!old.objectStoreNames.contains('urlOwners'),'Genuine v6 schema has no independent URL cache');old.close();
        const cache=new M.KplexIndexedDbCache('s2-migrate-v6'),upgraded=await cache.open();equal(upgraded.version,10,'Version upgrade');
        for(const name of names){
          const upgradedRows=await value(upgraded.transaction(name).objectStore(name).getAll());
          equal(name==='meta'?upgradedRows.filter(row=>row.key!==M.SOURCE_LOCAL_DEPENDENCY_STATE_KEY):upgradedRows,rows[name],name+' exact structured-record preservation');
        }
        equal(await value(upgraded.transaction('meta').objectStore('meta').get(M.SOURCE_LOCAL_DEPENDENCY_STATE_KEY)),M.sourceLocalDependencyState(),'New local derivative starts incomplete');
        ok(upgraded.objectStoreNames.contains(M.SOURCE_IMPACT_STORE),'New derivative journal store');equal(await value(upgraded.transaction(M.SOURCE_IMPACT_STORE).objectStore(M.SOURCE_IMPACT_STORE).count()),0,'Migration invents no dirty owners');
        ok(upgraded.objectStoreNames.contains('urlOwners'),'Independent URL cache added in the version-change transaction');equal(await value(upgraded.transaction('urlOwners').objectStore('urlOwners').count()),0,'Migration invents no URL source facts');
        ok(upgraded.transaction('meta').objectStore('meta').indexNames.contains(M.SOURCE_IMPACT_LEASE_INDEX),'Additive lease index');cache.close();return true;
      })()`), true);
    });

    await t.test("measured maintenance remains source-local with 128 unrelated owners; deletion uses zero families", async () => {
      const measured = await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await repairSeed('s2-local-work',131),r=f.repository;
        equal((await r.replace(await repairInput(f))).outcome,'activated','Source cache mutation');
        let families=0,heads=0,hostCalls=0,transactions=0,pages=0;const visited=[];
        const visit=r.visitFamily.bind(r),selected=r.readSelected.bind(r),transaction=r.transaction.bind(r),request=await repairRequest(f);
        r.visitFamily=(view,...args)=>{families++;visited.push(view.head.sourceId);return visit(view,...args);};
        r.readSelected=(...args)=>{heads++;return selected(...args);};r.transaction=(...args)=>{transactions++;return transaction(...args);};
        for(const name of ['structure','presentation']){const original=request.host[name];request.host[name]=(...args)=>{hostCalls++;return original(...args);};}
        const get=IDBObjectStore.prototype.get;IDBObjectStore.prototype.get=function(...args){if(this.name==='sourceDependencies')pages++;return get.apply(this,args);};
        let result;try{result=await f.discovery.prepareOwnerImpact('A.md',request);}finally{IDBObjectStore.prototype.get=get;}
        equal(result.outcome,'known',JSON.stringify(result));equal(families,4,'Four actual family visits');equal(heads,1,'One selected-source acquisition');equal([...new Set(visited)],['A.md'],'No unchanged source family visits');
        equal(f.reads,[],'No Markdown reads');equal(f.parses,[],'No parsing');const editWork={families,heads,hostCalls,transactions,pages,bytes:result.work.bytes};
        const deleted=f.files.get('A.md');f.files.delete('A.md');f.app.vault.trigger('delete',deleted);ok(await r.flush(),'Authoritative event-side deletion durable');
        families=0;heads=0;hostCalls=0;transactions=0;const deletion=await f.acquisition.contributorDiscovery(runtime()).prepareOwnerImpact('A.md',null,()=>!f.files.has('A.md'));
        equal(deletion.outcome,'unknown','Actual topology transition is not certified');
        equal(deletion.work.familyVisits,0,'No family replay for authoritative absence');equal(families,0,'Measured zero');equal(heads,0,'No source-head acquisition');
        const deleteWork={families,heads,hostCalls,transactions,pages:deletion.work.pages,bytes:deletion.work.bytes};
        const afterDelete=await f.discovery.discover(absent());equal(afterDelete.outcome,'stale','Actual topology change invalidates the old host capability');
        equal(afterDelete.reason,'host-catalog-stale','No changed-host proof is available');
        await rejected(r.readDependencyRoot(()=>true),'dependency-pending');
        f.close();return {owners:131,edit:editWork,deletion:deleteWork};
      })()`);
      assert.equal(measured.edit.families, 4); assert.equal(measured.deletion.families, 0);
      t.diagnostic(`S2 REAL-IDB MEASUREMENTS ${JSON.stringify(measured)}`);
    });

    await t.test("300 dirty owners share one root anchor, do not deadlock at 256, and oversized impacts preserve unknown", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await repairSeed('s2-shared-root',300),r=f.repository,db=await f.cache.open();
        for(const id of f.files.keys()){
          const inspected=await r.inspect(id),head=inspected.head;
          equal((await r.replace({sourceId:id,physical:head.physical,observation:head.observation,expected:inspected.expected,families:head.families})).outcome,'activated','No artificial dirty-owner ceiling');
        }
        const records=await value(db.transaction(M.SOURCE_IMPACT_STORE).objectStore(M.SOURCE_IMPACT_STORE).getAll());equal(records.length,300,'One ticket per changed owner');
        ok(records.every(row=>Object.keys(row.root).sort().join(',')==='build,digest'),'Full root is not duplicated per owner');
        const anchors=(await value(db.transaction('meta').objectStore('meta').getAll())).filter(row=>row.key.startsWith(M.SOURCE_IMPACT_ROOT_PREFIX));equal(anchors.length,1,'One shared original root');
        await r.withContributorJournal(sourceOwner('A.md'),()=>true,async reader=>{
          await rejected(r.storeContributorImpact(reader,'x'.repeat(M.SOURCE_IMPACT_DATA_BYTES+1),()=>true),'backpressure');
        });equal((await journal(f)).status,'unknown','No truncated impact');
        equal((await f.discovery.rebuild()).outcome,'ready','Explicit complete repair is still possible');equal(await r.contributorJournalOwners(),[],'Global repair retires only at full-root CAS');
        f.close();return true;
      })()`), true);
    });

    await t.test("coalesced host events keep the newest pending observation through an awaited open", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await repairSeed('s2-host-coalescing'),r=f.repository,open=r.open.bind(r);let entered,release,first=true;
        const held=new Promise(resolve=>entered=resolve),gate=new Promise(resolve=>release=resolve);
        r.open=async()=>{if(first){first=false;entered();await gate;}return open();};
        const event=(from,kind)=>({epoch:'same-session-event-test',from,to:from+1,kind});
        const writing=r.markContributorHostDirty(event(0,'source'));await held;
        for(let i=1;i<=50;i++)void r.markContributorHostDirty(event(i,'resolution'));
        release();await writing;await r.flush();
        const record=await r.readContributorJournal({kind:'host',id:'catalog'});equal(record.change.to,51,'Latest coalesced event survives old completion');equal(record.status,'unknown','No complete changed-host proof invented');
        equal(r.hostChange,null,'No pending value after flush');equal(r.hostJournalTask,null,'No active task leak');f.close();return true;
      })()`), true);
    });

    await t.test("process interruption during source staging recovers the exact unknown original without an all-owner replay", async () => {
      const before = await browser.evaluate(`(async()=>{
        const f=await repairSeed('s2-process-crash'),input=await repairInput(f);let entered;const paused=new Promise(resolve=>entered=resolve);
        input.families.resolution=async()=>{entered();await new Promise(()=>{});return true;};window.interruptedRepair=f.repository.replace(input);await paused;
        return journal(f);
      })()`);
      await browser.restart(); await browser.evaluate(contributorBrowserInitialize); await browser.evaluate(initialize);
      const after = await browser.evaluate(`(async()=>{
        const M=sourceModules,cache=new M.KplexIndexedDbCache('s2-process-crash');await cache.open();const r=cache.sources;
        const result=await r.readContributorJournal(sourceOwner('A.md'));await rejected(r.readDependencyRoot(()=>true),'dependency-pending');
        equal(result.status,'unknown','Interrupted repair recovered');equal(result.selected,null,'No new head activation');equal((await r.inspect('A.md')).head,result.original.head,'Old durable head selected');
        equal(await r.contributorJournalOwners(),[M.contributorJournalKey(sourceOwner('A.md'))],'Local recovery owner list');cache.close();return result;
      })()`);
      assert.deepEqual(after, before);
    });
  } finally { await browser.cleanup(); }
});
