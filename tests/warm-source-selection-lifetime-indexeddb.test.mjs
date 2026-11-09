/**
 * PR212 native-observation, overlay, repair and reader-retirement races. Finite real-IDB fixtures
 * preserve canonical source operations and original failure reasons; no product vault is accessed.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { warmSelectionScenario as scenario } from './support/warmSourceSelectionBrowser.mjs';

for (const mutation of ['none', 'cancel', 'overlay', 'delete', 'activation', 'independent-writer', 'storage-failure']) {
  test(`inventory selection reuse preserves its finality fences: ${mutation}`, async () => {
    assert.equal(await scenario(`inventory-selection-${mutation}`, String.raw`
      let live=true;
      const current=()=>live;
      const projection=await r.beginLocalDependencyInventoryProjection(1,current);
      const selected=await r.inspectWithLocalDependencies(id,0,0,current,projection);
      equal(selected.dependencyReason,'ready','Original selection authenticated');
      let other=null;
      const transaction=r.transaction;let headReads=0;
      r.transaction=function(database,stores,mode,...rest){if(stores.includes('sourceHeads'))headReads++;return transaction.call(this,database,stores,mode,...rest);};
      try {
        if(${JSON.stringify(mutation)}==='cancel')live=false;
        if(${JSON.stringify(mutation)}==='overlay')r.unsaved.add(id);
        if(${JSON.stringify(mutation)}==='delete')equal((await r.tombstone(id)).outcome,'activated','Actual selected deletion');
        if(${JSON.stringify(mutation)}==='storage-failure')f.cache.storageFailed(db);
        if(['activation','independent-writer'].includes(${JSON.stringify(mutation)})) {
          other=${JSON.stringify(mutation)}==='activation'?c.fixture.cache:new M.KplexIndexedDbCache(c.name);
          ok(await other.open(),'Writer connection');
          equal((await other.sources.replace({sourceId:id,expected:selected.inspection.expected,
            physical:originalHead.physical,observation:originalHead.observation,bodyParserVersion:originalHead.bodyParserVersion,
            families:originalHead.families})).outcome,'activated','Actual canonical activation');
          headReads=0;
        }
        const ensured=await r.ensureLocalDependencies(id,0,0,current,projection);
        const complete=await r.completeLocalDependencyInventory(current,projection);
        if(${JSON.stringify(mutation)}==='none') {equal(ensured,'ready','Shared clean selection');equal(headReads,0,'No duplicate owner/head IO');equal(complete,'ready','Final durable proof still required');}
        if(${JSON.stringify(mutation)}==='cancel')ok(ensured!=='ready'&&complete!=='ready','Cancelled selection never grants closure');
        if(${JSON.stringify(mutation)}==='overlay')ok(ensured!=='ready'&&complete!=='ready','Unsaved memory masks the observed durable head');
        if(${JSON.stringify(mutation)}==='delete')ok(ensured!=='ready'&&complete!=='ready','Deleted selection never grants closure');
        if(${JSON.stringify(mutation)}==='activation'){equal(ensured,'ready','Current canonical replacement can be checked afresh');ok(headReads>0,'New activation forces native re-selection');equal(complete,'ready','Owned current activation satisfies exact final sequence');}
        if(${JSON.stringify(mutation)}==='independent-writer'){equal(ensured,'ready','Copied observation is advisory within its captured pass');equal(complete,'superseded','Independent sequence change rejects final authority');}
        if(${JSON.stringify(mutation)}==='storage-failure')equal(complete,'storage-unavailable','A copied observation cannot hide unavailable storage at final closure');
      } finally {r.transaction=transaction;r.unsaved.delete(id);if(other&&other!==c.fixture.cache)other.close();}
    `,{reopenForCleanup:mutation==='storage-failure'}),true);
  });
}

for (const mode of ['unsaved', 'delete', 'activation', 'cancel', 'close', 'selection-error']) {
  test(`${mode} during the awaited local selection cannot expose a stale ready receipt`, /** The initial native result must survive repository overlays and the caller's lifetime. */async () => {
    assert.equal(await scenario(`warm-selection-late-${mode}`, String.raw`
      const select=r.localDependencySelection;let fired=false,live=true;
      r.localDependencySelection=/** Forward the original operation and inject one controlled transition. */async function(...args){
        const result=await select.apply(this,args);
        if(!fired){fired=true;
          if(${JSON.stringify(mode)}==='unsaved')r.unsaved.add(id);
          if(${JSON.stringify(mode)}==='delete')equal((await r.tombstone(id)).outcome,'activated','Real tombstone');
          if(${JSON.stringify(mode)}==='activation')equal((await r.replace({sourceId:id,expected:{kind:'head',revision:originalHead.sourceRevision,sequence:originalHead.sequence},
            physical:originalHead.physical,observation:originalHead.observation,bodyParserVersion:originalHead.bodyParserVersion,families:originalHead.families})).outcome,'activated','Same-repository source CAS');
          if(${JSON.stringify(mode)}==='cancel')live=false;
          if(${JSON.stringify(mode)}==='close')r.close();
          if(${JSON.stringify(mode)}==='selection-error')throw new M.SourceFactError('read-error');
        }
        return result;
      };
      let result;
      try{result=await r.inspectWithLocalDependencies(id,0,0,/** Retire this request at the injected lifetime boundary. */()=>live);}finally{r.localDependencySelection=select;}
      ok(fired,'Actual native selection reached');
      if(${JSON.stringify(mode)}==='activation'){
        equal(result.dependencyReason,'ready','A newly inspected and normally checked source may recover');
        ok(result.inspection.head.sourceRevision!==originalHead.sourceRevision,'Recovered head is the new source, never the captured old one');
      }else ok(result.dependencyReason!=='ready','Uncertain selection cannot certify dependencies');
      if(${JSON.stringify(mode)}==='unsaved'){
        equal(result.inspection.head,null,'Evicted unsaved mask hides old disk');
        equal(result.inspection.reason,'unsaved','Mask classification retained');
      }
    `), true);
  });
}

test('an actual unsaved in-memory replacement masks the captured durable head', /** Memory authority is distinct from a durable dependency proof or the old disk revision. */async () => {
  assert.equal(await scenario('warm-selection-memory', String.raw`
    const selected=await r.inspectWithLocalDependencies(id,0,0),families={};
    for(const family of M.SOURCE_FAMILIES){const records=[];equal(await r.visit(id,family,/** Collect authenticated facts before the controlled replacement. */rows=>{records.push(...rows);return true;}),'ready','Original facts authenticate');
      families[family]=/** Stream only these authenticated test-owned replacement facts. */async emit=>{for(const item of records){const fact=family==='metadata'&&item.kind==='alias'?{...item,value:'Unsaved replacement alias'}:item;if(!await emit(fact))return false;}return true;};}
    const open=r.storage.open;
    try{r.storage.open=/** Simulate unavailable durable storage for this one real memory replacement. */async()=>null;
      equal((await r.replace({sourceId:id,expected:selected.inspection.expected,physical:originalHead.physical,
        observation:originalHead.observation,bodyParserVersion:originalHead.bodyParserVersion,families})).outcome,'unsaved','Actual storage-degraded source replacement');
    }finally{r.storage.open=open;}
    const replacement=await r.inspectWithLocalDependencies(id,0,0);
    equal(replacement.inspection.saved,false,'Memory head cannot impersonate durable selection');
    equal(replacement.dependencyReason,'unsaved','No ready durable dependency proof from memory');
    ok(replacement.inspection.head.sourceRevision!==originalHead.sourceRevision,'New memory source, never the old disk head');
    let delivered=0;equal(await r.visit(id,'metadata',/** Count any incorrectly delivered memory replacement facts. */()=>{delivered++;return true;},/** Keep this isolated request live through the controlled phase. */()=>true,selected.inspection.expected),'superseded','Old observation cannot read replacement memory facts');
    equal(delivered,0,'No memory family delivered under the old disk receipt');
    ok(await r.flush(),'Normal source retry durably closes the synthetic unsaved work');
  `), true);
});

test('a selected pending count repair is settled before the new observation becomes ready', /** An interrupted real source activation leaves the actual old/new count journal. */async () => {
  assert.equal(await scenario('warm-selection-pending', String.raw`
    const oldField='aliases',metadataRows=[];
    equal(await r.visit(id,'metadata',/** Retain the real metadata records for this replacement fixture. */batch=>{metadataRows.push(...batch);return true;}),'ready','Old metadata authenticates');
    const checkpoint=r.runtime.localDependencyCheckpoint;let live=true,hit=false;
    const families={...originalHead.families,metadata:/** Stream only these authenticated test-owned replacement facts. */async emit=>{for(const record of metadataRows)if(!await emit(record.kind==='field-name'&&record.normalizedFieldName===oldField?{...record,fieldName:'Repaired field',normalizedFieldName:'repaired field'}:record))return false;return true;}};
    let write;
    try{r.runtime.localDependencyCheckpoint=/** Interrupt actual activation before normal selected-count repair. */phase=>{if(phase==='after-local-activation'){hit=true;live=false;}};
      write=await r.replace({sourceId:id,expected:{kind:'head',revision:originalHead.sourceRevision,sequence:originalHead.sequence},
        physical:originalHead.physical,observation:originalHead.observation,bodyParserVersion:originalHead.bodyParserVersion,families},/** Retire this request at the injected lifetime boundary. */()=>live);
    }finally{r.runtime.localDependencyCheckpoint=checkpoint;}
    ok(hit&&write.outcome==='activated','Real source activation interrupted before selected count repair');
    const repair=await value(db.transaction(M.SOURCE_LOCAL_REPAIR_STORE).objectStore(M.SOURCE_LOCAL_REPAIR_STORE).get(id));
    ok(repair&&repair.fromRevision!==repair.toRevision,'Actual selected journal, not a private staging marker');
    const selected=(await r.inspect(id,[])).head;
    equal((await r.inspectWithLocalDependencies(id,0,0)).dependencyReason,'ready','Actual selected repair settles');
    equal(await value(db.transaction(M.SOURCE_LOCAL_REPAIR_STORE).objectStore(M.SOURCE_LOCAL_REPAIR_STORE).count()),0,'Journal really retired');
    equal((await value(db.transaction('meta').objectStore('meta').get(M.SOURCE_LOCAL_DEPENDENCY_STATE_KEY))).pending,0,'Pending count closes');
    for(const [field,expected] of [[oldField,[]],['repaired field',[id]]]){const lookup=await r.lookupLocalDependencies([M.sourceLocalDependencyKey('field',field)]);
      equal(lookup.outcome,'ready','Repaired lookup is authenticated');equal(lookup.value.sources.map(/** Compare exact selected owner identities. */item=>item.head.sourceId),expected,'Exact old/new field ownership');}
    equal((await r.inspect(id,[])).head,selected,'Dependency recovery does not rewrite the activated source');
  `), true);
});

test('a supported older local owner upgrades through the original authenticated fallback', /** A source observation never skips an older derivative protocol. */async () => {
  assert.equal(await scenario('warm-selection-local-legacy', String.raw`
    const owner=await value(db.transaction(M.SOURCE_LOCAL_OWNER_STORE).objectStore(M.SOURCE_LOCAL_OWNER_STORE).get(id));
    await edit(db,[M.SOURCE_LOCAL_OWNER_STORE],/** Mutate only this fixture's explicitly named durable records. */tx=>tx.objectStore(M.SOURCE_LOCAL_OWNER_STORE).put({...owner,version:3}));
    equal((await r.inspectWithLocalDependencies(id,0,0)).dependencyReason,'ready','Legacy derivative upgrade completes');
    equal((await value(db.transaction(M.SOURCE_LOCAL_OWNER_STORE).objectStore(M.SOURCE_LOCAL_OWNER_STORE).get(id))).version,M.SOURCE_LOCAL_DEPENDENCY_VERSION,'Actual current owner installed');
    equal((await r.inspect(id,[])).head,originalHead,'Derivative upgrade retains exact source head');
  `, { urlFree: true }), true);
});

test('an awaited metadata consumer retains all protection until it completes', /** Exact-head finality cannot retire immutable-family leases before consumer work settles. */async () => {
  assert.equal(await scenario('warm-selection-held-consumer', String.raw`
    const selected=await r.inspectWithLocalDependencies(id,0,0);let release,entered;
    const gate=new Promise(/** Hold consumer completion at a known await. */resolve=>release=resolve),started=new Promise(/** Observe that the protected consumer actually started. */resolve=>entered=resolve);
    const pending=r.visit(id,'metadata',/** Keep authenticated records private until the held consumer completes. */async()=>{entered();await gate;return true;},/** Keep this isolated request live through the controlled phase. */()=>true,selected.inspection.expected);
    try{await started;equal(r.readers.size,1,'Selected reader remains registered');ok(r.decodeBytes>0,'Prepared decode remains bounded and owned');
      const leases=await value(db.transaction('meta').objectStore('meta').getAll());ok(leases.some(/** Select only this fixture's observed durable protection records. */row=>row.key?.startsWith('source-lease:')),'Durable protection remains through consumer await');
    }finally{release();}
    equal(await pending,'ready','Consumer, final matching read and lease retirement complete together');
  `), true);
});

for (const mode of ['cancel', 'close', 'unsaved', 'throw']) {
  test(`${mode} while authenticating expected metadata rejects final readiness and retires resources`, /** Prepared bytes and hashes never outlive caller/repository validity as a ready result. */async () => {
    assert.equal(await scenario(`warm-selection-auth-${mode}`, String.raw`
      const selected=await r.inspectWithLocalDependencies(id,0,0),digest=r.runtime.digest;let live=true,fired=false;
      r.runtime.digest=/** Forward the original operation and inject one controlled transition. */async function(...args){const result=await digest.apply(this,args);if(!fired){fired=true;
        if(${JSON.stringify(mode)}==='cancel')live=false;if(${JSON.stringify(mode)}==='close')r.close();
        if(${JSON.stringify(mode)}==='unsaved')r.unsaved.add(id);if(${JSON.stringify(mode)}==='throw')throw new M.SourceFactError('invalid-chunk');}
        return result;};
      let reason;try{reason=await r.visit(id,'metadata',/** Keep this isolated request live through the controlled phase. */()=>true,/** Retire this request at the injected lifetime boundary. */()=>live,selected.inspection.expected);}finally{r.runtime.digest=digest;}
      ok(fired,'Actual crypto boundary reached');ok(reason!=='ready','Retired/failed proof cannot become ready');
    `), true);
  });
}

for (const mode of ['date', 'daily']) {
  test(`${mode} interpretation changing after selection requires a current environment before full readiness`, /** The enclosing reconciliation retains its independent Date/Daily Notes proof. */async () => {
    assert.equal(await scenario(`warm-selection-environment-${mode}`, String.raw`
      // Exercise the historical selected-dependency await rather than bypassing it with reuse.
      await edit(db,['meta'],tx=>tx.objectStore('meta').delete('source-host-observation:'+id));
      const inspect=r.inspectWithLocalDependencies;let fired=false;
      r.inspectWithLocalDependencies=/** Forward the original operation and inject one controlled transition. */async function(...args){const result=await inspect.apply(this,args);if(!fired){fired=true;
        if(${JSON.stringify(mode)}==='date')f.app.dateFields.add('Date');else f.app.daily.format='YYYY/MM/DD';}return result;};
      let ready;try{ready=await f.acquisition.reconcile();}finally{r.inspectWithLocalDependencies=inspect;}
      if(!ready)ok(await f.acquisition.flush(),'Finite interpretation change resumes through actual owner');
      ok(f.acquisition.hasSemanticDependencies(),'Full current projection is actually ready');
      const after=await r.inspect(id,[]),environment=await r.observationDigest(f.acquisition.environment(f.metadata.get(id)));
      equal(after.head.observation.environment,environment,'Current environment independently authenticated');
      ok(after.head.sourceRevision!==originalHead.sourceRevision,'Changed interpretation cannot retain the old source observation');
    `, { beforeSeed: "f.metadata.get(id).frontmatter.Date='2026-10-24';" }), true);
  });
}

for (const mode of ['abort', 'head-error']) {
  test(`${mode} in original-connection retirement cannot certify metadata readiness`, /** Failure leaves conservative protection; only the fixture's exact owned keys are restored. */async () => {
    assert.equal(await scenario(`warm-selection-release-${mode}`, String.raw`
      const selected=await r.inspectWithLocalDependencies(id,0,0),transaction=db.transaction,get=IDBObjectStore.prototype.get;
      let injected=false,reason;
      try{
        db.transaction=/** Abort only the selected final retirement transaction. */function(stores,...args){const tx=transaction.call(this,stores,...args);
          if(${JSON.stringify(mode)}==='abort'&&args[0]==='readwrite'&&[...tx.objectStoreNames].sort().join(',')==='meta,sourceHeads'){injected=true;tx.abort();}return tx;};
        IDBObjectStore.prototype.get=/** Intercept only this scenario's final-head request. */function(...args){
          if(${JSON.stringify(mode)}==='head-error'&&this.name===M.SOURCE_HEAD_STORE&&this.transaction.mode==='readwrite'&&this.transaction.objectStoreNames.length===2){injected=true;throw new Error('Deliberate final-head read failure');}
          return get.apply(this,args);};
        reason=await r.visit(id,'metadata',/** Keep this isolated request live through the controlled phase. */()=>true,/** Keep this isolated request live through the controlled phase. */()=>true,selected.inspection.expected);
      }finally{db.transaction=transaction;IDBObjectStore.prototype.get=get;}
      ok(injected,'Exact final native transaction reached');equal(reason,'read-error','Failed retirement never returns ready');
      const remaining=(await value(db.transaction('meta').objectStore('meta').getAll())).filter(/** Select only this fixture's observed durable protection records. */row=>row.key?.startsWith('source-lease:'));
      ok(remaining.length>0,'Failed native retirement conservatively retains protection');
      ok(remaining.every(/** Select only this fixture's observed durable protection records. */row=>row.sourceId===id&&row.owner===r.owner),'Only this fixture owns the retained keys');
      await edit(db,['meta'],/** Mutate only this fixture's explicitly named durable records. */tx=>{for(const row of remaining)tx.objectStore('meta').delete(row.key);});
      equal(await r.visit(id,'metadata',/** Keep this isolated request live through the controlled phase. */()=>true,/** Keep this isolated request live through the controlled phase. */()=>true,selected.inspection.expected),'ready','Healthy original path recovers after the injected failure');
    `), true);
  });
}

for (const mode of ['revision', 'sequence', 'format']) {
  test(`a ${mode} mismatch in the dependency owner remains non-ready`, /** A valid source head cannot repair or certify an unknown derivative by implication. */async () => {
    assert.equal(await scenario(`warm-selection-owner-${mode}`, String.raw`
      const owner=await value(db.transaction(M.SOURCE_LOCAL_OWNER_STORE).objectStore(M.SOURCE_LOCAL_OWNER_STORE).get(id));
      const broken=${mode === 'revision' ? "{...owner,sourceRevision:'unselected-owner-revision'}" : mode === 'sequence' ? '{...owner,sequence:owner.sequence+1}' : '{...owner,version:999}'};
      await edit(db,[M.SOURCE_LOCAL_OWNER_STORE],/** Mutate only this fixture's explicitly named durable records. */tx=>tx.objectStore(M.SOURCE_LOCAL_OWNER_STORE).put(broken));
      const result=await r.inspectWithLocalDependencies(id,0,0);
      equal(result.dependencyReason,'dependency-invalid','Unknown owner consistency cannot be called ready');
      equal(result.inspection.head,originalHead,'The independent head observation is preserved');
      await edit(db,[M.SOURCE_LOCAL_OWNER_STORE],/** Mutate only this fixture's explicitly named durable records. */tx=>tx.objectStore(M.SOURCE_LOCAL_OWNER_STORE).put(owner));
      equal((await r.inspectWithLocalDependencies(id,0,0)).dependencyReason,'ready','A restored actual derivative passes normally');
    `), true);
  });
}

for (const mutation of ['same-stat-modify', 'replace-file', 'rename', 'delete', 'cache', 'unload']) {
  test(`${mutation} between head observation and metadata pin rejects restart comparison`, /** The adapter retains native/cache/lifetime fences around the new repository seam. */async () => {
    assert.equal(await scenario(`warm-selection-native-${mutation}`, String.raw`
      const inspect=r.inspectWithLocalDependencies;let fired=false;
      r.inspectWithLocalDependencies=/** Forward the original operation and inject one controlled transition. */async function(...args){
        const result=await inspect.apply(this,args);
        if(!fired){fired=true;
          if(${JSON.stringify(mutation)}==='same-stat-modify'){f.texts.set(id,'Value:: changed at the same stat');f.app.vault.trigger('modify',file);}
          if(${JSON.stringify(mutation)}==='replace-file')f.files.set(id,new window.ContributorFile(id));
          if(${JSON.stringify(mutation)}==='rename'){f.files.delete(id);file.path='Renamed.md';f.files.set(file.path,file);}
          if(${JSON.stringify(mutation)}==='delete')f.files.delete(id);
          if(${JSON.stringify(mutation)}==='cache')f.metadata.set(id,{...f.metadata.get(id),frontmatter:{aliases:['Changed after selection']}});
          if(${JSON.stringify(mutation)}==='unload')f.acquisition.close();
        }
        return result;
      };
      let result;
      try{result=await f.acquisition.reconcileRestartHostInventory([file],new Map([[id,0]]),/** Keep this isolated request live through the controlled phase. */()=>true);}
      finally{r.inspectWithLocalDependencies=inspect;}
      ok(fired,'Actual new seam exercised');
      if(${JSON.stringify(mutation)}==='cache'){
        ok(result===false||f.acquisition.states.get(file)?.dirty,'Changed cache is rejected or marked for actual repair');
      }else equal(result,false,'Retired owner cannot complete comparison');
    `), true);
  });
}
