/** Restart host equality reuses exact source activations; family integrity remains checked on use. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {contributorBrowserBundle,contributorBrowserInitialize} from './support/contributorBrowserFixture.mjs';
import {chromiumHarness} from './support/browserTypeScript.mjs';
const bundle=await contributorBrowserBundle();

for(const type of ['date','text'])test('explicit '+type+' assignment survives incomplete or stale native property info on restart',async()=>{
 const browser=await chromiumHarness(bundle);try{
  await browser.evaluate(contributorBrowserInitialize);
  assert(await browser.evaluate(`(async()=>{
   const name='restart-assigned-type-${type}',first=await fixture(name);
   first.add('A.md','',{Due:'2026-11-08'});if('${type}'==='date')first.app.dateFields.add('Due');
   first.app.metadataTypeManager.getAssignedWidget=field=>field==='Due'?'${type}':null;
   await first.acquire();ok(await first.acquisition.reconcile(),'Accepted source under the explicit native type');first.close();
   const f=await fixture(name);f.add('A.md','',{Due:'2026-11-08'});if('${type}'==='text')f.app.dateFields.add('Due');
   f.app.metadataTypeManager.getAssignedWidget=field=>field==='Due'?'${type}':null;
   try{ok(await f.acquisition.reconcile(),'Native assignment preserves the unchanged source');
    equal(f.acquisition.getCounters().checked,0,'No invented source change from a default/stale info widget');
    equal(f.work.writes,[],'No source activation');equal(f.work.visits,[],'No fact replay');equal(f.reads,[],'No note reads');equal(f.parses,[],'No body parsing');return true;
   }finally{f.close();}
  })()`));
 }finally{await browser.cleanup();}
});

for(const cancel of [false,true])test('native enumeration coordinate updates use bounded settled IO waves'+(cancel?' with cancellation':''),async()=>{
 const browser=await chromiumHarness(bundle);try{
  await browser.evaluate(contributorBrowserInitialize);
  assert(await browser.evaluate(`(async()=>{
   const name='restart-coordinate-waves-${cancel}',first=await fixture(name),paths=Array.from({length:48},(_,n)=>'Owner'+n+'.md');
   for(const path of paths)first.add(path,'');await first.acquire();ok(await first.acquisition.reconcile(),'Closed accepted observations');first.close();
   const f=await fixture(name);for(const path of [...paths].reverse())f.add(path,'');
   let active=0,peak=0;const ensure=f.repository.ensureLocalDependencies.bind(f.repository);
   f.repository.ensureLocalDependencies=async(...args)=>{active++;peak=Math.max(peak,active);try{
    if(${cancel}&&active===2)f.acquisition.close();await new Promise(resolve=>setTimeout(resolve,0));return await ensure(...args);
   }finally{active--}};
   try{
    const ready=await f.acquisition.reconcile();equal(active,0,'All accepted coordinate requests settle before returning');
    ok(peak>1&&peak<=16,'Coordinate-only IO overlaps within a sixteen-owner bound');
    equal(ready,!${cancel},'Retired native scope cannot publish readiness');equal(f.acquisition.hasSemanticDependencies(),!${cancel},'Authority follows current complete scope');
    equal(f.reads,[],'No vault reads');equal(f.parses,[],'No parsing');equal(f.work.visits,[],'No source-family authentication');equal(f.work.writes,[],'No source activations');
    if(!${cancel}){const db=await f.cache.open();let ordinal=0,last=-1;
     for(const path of f.files.keys()){const row=await value(db.transaction('sourceLocalDependencyOwners').objectStore('sourceLocalDependencyOwners').get(path));equal(row.markdownOrder,ordinal++,'Current native Markdown order');ok(row.order>last,'Current structural order preserved');last=row.order;}
    }return true;
   }finally{f.repository.ensureLocalDependencies=ensure;f.close();}
  })()`));
 }finally{await browser.cleanup();}
});

test('restart header certificates use bounded concurrent reads in one coherent transaction',async()=>{
 const browser=await chromiumHarness(bundle);try{
  await browser.evaluate(contributorBrowserInitialize);
  assert(await browser.evaluate(`(async()=>{
   const f=await fixture('restart-certificate-read-waves');for(let n=0;n<48;n++)f.add('Owner'+n+'.md','');
   const original=IDBObjectStore.prototype.get;let pending=0,peak=0,reads=0,transactions=new Set();
   try{
    await f.acquire();ok(await f.acquisition.reconcile(),'Seed coherent observations');
    const expected=await f.repository.headPage(null,48,{hostObservations:true});equal(expected.hostObservations.length,48,'Every owner has a current certificate');
    IDBObjectStore.prototype.get=function(...args){const request=original.apply(this,args);
     if(this.transaction.mode==='readonly'&&this.transaction.objectStoreNames.contains('sourceHeads')
      &&['meta','sourceLocalDependencyOwners'].includes(this.name)){
      reads++;pending++;peak=Math.max(peak,pending);transactions.add(this.transaction);
      request.addEventListener('success',()=>pending--,{once:true});request.addEventListener('error',()=>pending--,{once:true});
     }return request;
    };
    const actual=await f.repository.headPage(null,48,{hostObservations:true});
    equal(actual,expected,'Batching preserves exact ordered heads and validated certificate contents');equal(reads,96,'Exactly two existing receipt reads per owner');
    equal(transactions.size,1,'All reads retain the same readonly snapshot');equal(pending,0,'No unobserved requests remain');
    ok(peak>2&&peak<=32,'Independent receipt reads use bounded sixteen-owner waves instead of per-record round trips');
    return true;
   }finally{IDBObjectStore.prototype.get=original;f.close();}
  })()`));
 }finally{await browser.cleanup();}
});

for(const kind of ['changed','resolve','changed-input','resolve-input'])test('settled native '+kind+' compares actual source facts before renewing a source activation',async()=>{
 const browser=await chromiumHarness(bundle);try{
  await browser.evaluate(contributorBrowserInitialize);
  assert(await browser.evaluate(`(async()=>{
   const f=await fixture('settled-native-${kind}'),a=f.add('A.md','Parent:: [[B]]');f.add('B.md','');f.add('C.md','');
   f.metadata.get(a.path).links=[{link:'B',position:{start:{line:0,col:9,offset:9},end:{line:0,col:14,offset:14}}}];
   f.app.metadataCache.resolvedLinks[a.path]={'B.md':1};
   try{
    await f.acquire();ok(await f.acquisition.reconcile(),'Initial source closure');
    f.work.writes.length=0;f.reads.length=0;f.parses.length=0;
    const repaired=f.acquisition.getCounters().repaired;
    if('${kind}'==='changed-input')f.metadata.get(a.path).frontmatter.Parent='[[C]]';
    if('${kind}'==='resolve-input')f.app.metadataCache.resolvedLinks[a.path]={'B.md':1,'C.md':1};
    f.app.metadataCache.trigger('${kind}'.startsWith('changed')?'changed':'resolve',a);f.app.metadataCache.trigger('resolved');
    ok(await f.acquisition.flush(),'Current known metadata wave closes');ok(f.acquisition.hasSemanticDependencies(),'No false pending dependency state');
    if('${kind}'.endsWith('input'))ok(f.work.writes.length>0,'Actual changed source inputs still persist');
    else{equal(f.work.writes,[],'Equal canonical source families do not need another activation');equal(f.acquisition.getCounters().repaired,repaired,'No invented source repair');}
    equal(f.reads,[],'Metadata comparison does not read Markdown');equal(f.parses,[],'Metadata comparison does not parse Markdown');return true;
   }finally{f.close();}
  })()`));
 }finally{await browser.cleanup();}
});
test('unchanged native caches restore source readiness without source-family reads, parsing, replay or activation',async()=>{
 const browser=await chromiumHarness(bundle);try{
  await browser.evaluate(contributorBrowserInitialize);
  assert(await browser.evaluate(`(async()=>{
   const first=await fixture('restart-host-observations');first.add('A.md','Parent:: [[B]]',{aliases:['A alias'],Parent:'[[B]]'});first.add('B.md','');
   first.app.metadataCache.resolvedLinks['A.md']={'B.md':1};await first.acquire();ok(await first.acquisition.reconcile(),'Initial closed source inventory');first.close();
   const second=await fixture('restart-host-observations');second.add('A.md','Parent:: [[B]]',{aliases:['A alias'],Parent:'[[B]]'});second.add('B.md','');second.app.metadataCache.resolvedLinks['A.md']={'B.md':1};
   try{
    ok(await second.acquisition.reconcile(),'Fresh owner reuses a closed unchanged observation');
    ok(second.acquisition.hasSemanticDependencies(),'Source maintenance becomes ready');
    equal(second.work.inspections,[],'No per-source fact inspection');equal(second.work.visits,[],'No source family authentication sweep');equal(second.work.writes,[],'No source activation');
    equal(second.reads,[],'No vault reads');equal(second.parses,[],'No body parsing');equal(second.acquisition.getCounters().checked,0,'No source reacquisition');
    const diagnostics=second.acquisition.getRecoveryDiagnostics();ok(diagnostics.restartChecked&&diagnostics.localAuthorityReady,'Closed native observation, not merely graph readiness');
    return true;
   }finally{second.close();}
  })()`));
 }finally{await browser.cleanup();}
});

test('initial resolver notifications for unchanged inputs do not force a whole-vault source audit',async()=>{
 const browser=await chromiumHarness(bundle);try{
  await browser.evaluate(contributorBrowserInitialize);
  assert(await browser.evaluate(`(async()=>{
   const name='restart-resolver-wave',first=await fixture(name);
   for(let n=0;n<300;n++)first.add('Owner'+n+'.md','',{Parent:'[[Target]]'});
   first.add('Target.md','');await first.acquire();ok(await first.acquisition.reconcile(),'Closed saved source inventory');first.close();
   const f=await fixture(name);for(let n=0;n<300;n++)f.add('Owner'+n+'.md','',{Parent:'[[Target]]'});f.add('Target.md','');
   try{
    f.acquisition.enableInventory();for(const file of f.files.values())f.app.metadataCache.trigger('resolve',file);
    ok(await f.acquisition.flush(),'Unchanged resolver notifications converge');
    equal(f.acquisition.getCounters().checked,0,'No reacquisition for unchanged native resolver observations');
    equal(f.work.visits,[],'No per-owner source-family authentication');equal(f.work.inspections,[],'No per-owner source inspection');
    equal(f.work.writes,[],'No source activation');equal(f.reads,[],'No body reads');equal(f.parses,[],'No parsing');
    ok(f.acquisition.hasSemanticDependencies(),'Readiness follows a complete current cached-input proof');return true;
   }finally{f.close()}
  })()`));
 }finally{await browser.cleanup()}
});

test('native resolver completion precedes restart equality checks and unload cancels the wait',async()=>{
 const browser=await chromiumHarness(bundle);try{
  await browser.evaluate(contributorBrowserInitialize);
  assert(await browser.evaluate(`(async()=>{
   for(const cancel of [false,true]){
    const name='restart-native-pending-'+cancel,first=await fixture(name);first.add('A.md','',{Parent:'[[B]]'});first.add('B.md','');first.app.metadataCache.resolvedLinks['A.md']={'B.md':1};await first.acquire();ok(await first.acquisition.reconcile(),'Seed complete native maps');first.close();
    const f=await fixture(name);f.add('A.md','',{Parent:'[[B]]'});f.add('B.md','');let clean=false;f.app.metadataCache.isCacheClean=()=>clean;
    try{
     let settled=false,headers=0;const headPage=f.repository.headPage.bind(f.repository);f.repository.headPage=(...args)=>{headers++;return headPage(...args)};
     const task=f.acquisition.reconcile().then(value=>{settled=true;return value});
     await new Promise(resolve=>setTimeout(resolve,100));ok(!settled,'Pending native resolution is awaited without auditing incomplete maps');
     equal(headers,0,'No source header comparison against temporarily absent native aggregate maps');
     if(!cancel){f.app.metadataCache.trigger('resolved');await Promise.resolve();ok(!settled,'An intermediate native close cannot release the readiness wait');}
     equal(f.work.inspections,[],'No source inspection before native completion');equal(f.work.visits,[],'No family authentication before native completion');
     if(cancel)f.acquisition.close();else{f.app.metadataCache.resolvedLinks['A.md']={'B.md':1};clean=true;f.app.metadataCache.trigger('resolved');}
     const result=await task;if(cancel)equal(result,false,'Unload settles the pending owner');
     else{if(!result)ok(await f.acquisition.flush(),'Retired observation retries after native completion');ok(f.acquisition.hasSemanticDependencies(),'Current complete maps close authority');equal(f.acquisition.getRecoveryDiagnostics().pass.phase,'local-maintenance','Native startup closes through equality reuse, not a full metadata audit');equal(f.work.visits,[],'No validation sweep for the temporarily absent maps');equal(f.work.writes,[],'No incomplete-map source activation');}
    }finally{f.close()}
   }return true;
  })()`));
 }finally{await browser.cleanup()}
});

for(const change of ['mtime','ctime','alias','property','resolved','unresolved','date','daily','addition','deletion','missing-certificate','malformed-certificate','old-certificate']) {
 test(`restart observations reject stale or missing equality proof: ${change}`,async()=>{
  const browser=await chromiumHarness(bundle);try{
   await browser.evaluate(contributorBrowserInitialize);
   assert(await browser.evaluate(`(async()=>{
    const change=${JSON.stringify(change)},first=await fixture('restart-fence-'+change);
    first.add('A.md','',{aliases:['old'],Parent:'[[B]]'});first.add('B.md','');
    await first.acquire();ok(await first.acquisition.reconcile(),'Seed closed source journal');first.close();
    const f=await fixture('restart-fence-'+change),a=f.add('A.md','',{aliases:['old'],Parent:'[[B]]'});f.add('B.md','');
    try{
     if(change==='mtime')a.stat.mtime++;
     if(change==='ctime')a.stat.ctime++;
     if(change==='alias')f.metadata.get('A.md').frontmatter.aliases=['new'];
     if(change==='property')f.metadata.get('A.md').frontmatter.Parent='[[Other]]';
     if(change==='resolved')f.app.metadataCache.resolvedLinks['A.md']={'B.md':2};
     if(change==='unresolved')f.app.metadataCache.unresolvedLinks['A.md']={Missing:1};
     if(change==='date')f.app.dateFields.add('Parent');
     if(change==='daily')f.app.daily.format='DD-MM-YYYY';
     if(change==='addition')f.add('New.md','');
     if(change==='deletion'){f.files.delete('B.md');f.metadata.delete('B.md');}
     if(change.includes('certificate'))await edit(await f.cache.open(),['meta'],async tx=>{
      const store=tx.objectStore('meta'),key='source-host-observation:A.md',row=await value(store.get(key));ok(row,'Atomic source activation stored its observation');
      if(change==='missing-certificate')store.delete(key);
      else if(change==='old-certificate')store.put({...row,sequence:row.sequence+1});
      else store.put({...row,digest:'private malformed value',extra:'rejected'});
     });
     const adopted=await f.acquisition.restoreRestartHostObservations(()=>true);
     equal(adopted,!change.includes('certificate'),'Only complete certificates admit bounded changed-owner recovery');
     ok(!f.acquisition.hasSemanticDependencies(),'Readiness remains closed');
     if(adopted){
      ok(await f.acquisition.reconcile(),'Changed owners close through ordinary local maintenance');
      ok(f.acquisition.hasSemanticDependencies(),'Readiness follows actual repair');
      if(!['daily','deletion','addition'].includes(change))ok(f.work.inspections.every(path=>path==='A.md'),'Unchanged B is not inspected');
     }
     return true;
    }finally{f.close();}
   })()`));
  }finally{await browser.cleanup();}
 });
}

test('restart equality cannot publish after a native edit or disposal while awaiting an observation',async()=>{
 const browser=await chromiumHarness(bundle);try{
  await browser.evaluate(contributorBrowserInitialize);
  assert(await browser.evaluate(`(async()=>{
   for(const disposal of [false,true]){
    const first=await fixture('restart-cancel-'+disposal);first.add('A.md','');await first.acquire();ok(await first.acquisition.reconcile(),'Seed');first.close();
    const f=await fixture('restart-cancel-'+disposal),a=f.add('A.md','');let entered,release;
    const reached=new Promise(done=>entered=done),held=new Promise(done=>release=done),digest=f.repository.observationDigest.bind(f.repository);
    f.repository.observationDigest=async value=>{entered();await held;return digest(value);};
    try{
     const task=f.acquisition.restoreRestartHostObservations(()=>true);await reached;
     if(disposal)f.acquisition.close();else{a.stat.mtime++;f.app.vault.trigger('modify',a);}
     release();equal(await task,false,'Retired capture cannot grant authority');ok(!f.acquisition.hasSemanticDependencies(),'No stale readiness');
    }finally{release?.();f.close();}
   }
   return true;
  })()`));
 }finally{await browser.cleanup();}
});

test('restart native ordering uses the existing coordinate CAS without reacquiring unchanged sources',async()=>{
 const browser=await chromiumHarness(bundle);try{
  await browser.evaluate(contributorBrowserInitialize);
  assert(await browser.evaluate(`(async()=>{
   const first=await fixture('restart-order');first.add('A.md','');first.add('B.md','');await first.acquire();ok(await first.acquisition.reconcile(),'Seed');first.close();
   const f=await fixture('restart-order');f.add('B.md','');f.add('A.md','');
   try{
    ok(await f.acquisition.reconcile(),'Changed native enumeration order closes');
    ok(f.work.localEnsures>=2,'Existing coordinate CAS updates both shifted ordinals');
    equal(f.work.writes,[],'No source activation for order alone');equal(f.reads,[],'No body reads');equal(f.parses,[],'No parsing');
    ok(f.acquisition.hasSemanticDependencies(),'Readiness follows coordinate closure');return true;
   }finally{f.close();}
  })()`));
 }finally{await browser.cleanup();}
});

test('host equality never bypasses actual source-family integrity checks',async()=>{
 const browser=await chromiumHarness(bundle);try{
  await browser.evaluate(contributorBrowserInitialize);
  assert(await browser.evaluate(`(async()=>{
   const first=await fixture('restart-family-integrity');first.add('A.md','',{Parent:'[[B]]'});await first.acquire();ok(await first.acquisition.reconcile(),'Seed');
   const head=(await first.repository.inspect('A.md')).head,db=await first.cache.open();
   await edit(db,['sourceChunks'],tx=>tx.objectStore('sourceChunks').delete(['A.md',head.families.values.revision,'values',0]));first.close();
   const f=await fixture('restart-family-integrity');f.add('A.md','',{Parent:'[[B]]'});
   try{
    ok(await f.acquisition.reconcile(),'Cached host equality needs no integrity scrub');
    equal(f.work.visits,[],'No family sweep');
    const inspection=await f.repository.inspect('A.md',['values']);
    equal(inspection.families.values,'missing-chunk','Actual reader rejects damaged facts');return true;
   }finally{f.close();}
  })()`));
 }finally{await browser.cleanup();}
});

test('a stale path lookup outside the native Markdown catalog retires its header without auditing current notes',async()=>{
 const browser=await chromiumHarness(bundle);try{
  await browser.evaluate(contributorBrowserInitialize);
  assert(await browser.evaluate(`(async()=>{
   const first=await fixture('restart-stale-native-lookup');first.add('A.md','');first.add('B.md','');const stale=first.add('Gone.md','');await first.acquire();ok(await first.acquisition.reconcile(),'Seed');
   await edit(await first.cache.open(),['meta'],tx=>tx.objectStore('meta').delete('source-host-observation:Gone.md'));first.close();
   const f=await fixture('restart-stale-native-lookup');f.add('A.md','');f.add('B.md','');const lookup=f.app.vault.getFileByPath;
   f.app.vault.getFileByPath=path=>lookup(path)??(path==='Gone.md'?stale:null);
   try{
    ok(await f.acquisition.reconcile(),'Canonical inventory retires the stale source');
    ok(f.acquisition.hasSemanticDependencies(),'Current sources close');
    equal(f.work.writes,['tombstone:Gone.md'],'Only obsolete derived facts are retired');
    ok(f.work.inspections.every(path=>path==='Gone.md'),'No current source inspection');
    equal(f.reads,[],'No note reads');equal(f.parses,[],'No parsing');
    equal((await f.repository.headPage()).heads.find(head=>head.sourceId==='Gone.md').state,'tombstone','Old path lookup cannot keep a source current');return true;
   }finally{f.close();}
  })()`));
 }finally{await browser.cleanup();}
});

test('more than one header page of changed native ordinals never becomes a source-family audit',async()=>{
 const browser=await chromiumHarness(bundle);try{
  await browser.evaluate(contributorBrowserInitialize);
  assert(await browser.evaluate(`(async()=>{
   const first=await fixture('restart-many-ordinals');for(let n=0;n<300;n++)first.add('Owner'+n+'.md','');await first.acquire();ok(await first.acquisition.reconcile(),'Seed');first.close();
   const f=await fixture('restart-many-ordinals');for(let n=299;n>=0;n--)f.add('Owner'+n+'.md','');
   try{
    ok(await f.acquisition.reconcile(),'Changed native ordinal headers close');
    ok(f.work.localEnsures>=300,'Existing coordinate CAS handles every shifted native ordinal');
    equal(f.work.inspections,[],'No per-note source inspection');equal(f.work.visits,[],'No family authentication');equal(f.work.writes,[],'No source activation');
    equal(f.reads,[],'No note reads');equal(f.parses,[],'No parsing');return true;
   }finally{f.close();}
  })()`));
 }finally{await browser.cleanup();}
});

for(const environment of ['date','daily'])test(`fast restart rejects ${environment} changes after observation hashing`,async()=>{
 const browser=await chromiumHarness(bundle);try{
  await browser.evaluate(contributorBrowserInitialize);
  assert(await browser.evaluate(`(async()=>{
   const first=await fixture('restart-environment-race-${environment}');first.add('A.md','',{Meeting:'2026-11-08'});await first.acquire();ok(await first.acquisition.reconcile(),'Seed');first.close();
   const f=await fixture('restart-environment-race-${environment}');f.add('A.md','',{Meeting:'2026-11-08'});
   const digest=f.repository.observationDigest.bind(f.repository);let changed=false;
   f.repository.observationDigest=async value=>{const result=await digest(value);if(!changed){changed=true;if('${environment}'==='date')f.app.dateFields.add('Meeting');else f.app.daily.format='DD-MM-YYYY';}return result;};
   try{equal(await f.acquisition.restoreRestartHostObservations(()=>true),false,'Old hash cannot certify a newer interpretation');ok(!f.acquisition.hasSemanticDependencies(),'No false readiness');return true;}finally{f.close();}
  })()`));
 }finally{await browser.cleanup();}
});

test('a known same-stat body edit during restart repairs that owner without inspecting unrelated notes',async()=>{
 const browser=await chromiumHarness(bundle);try{
  await browser.evaluate(contributorBrowserInitialize);
  assert(await browser.evaluate(`(async()=>{
   const first=await fixture('restart-known-body-edit');first.add('A.md','Friends:: [[B]]');first.add('B.md','');await first.acquire();ok(await first.acquisition.reconcile(),'Seed');first.close();
   const f=await fixture('restart-known-body-edit'),a=f.add('A.md','Friends:: [[B]]');f.add('B.md','');f.acquisition.start();
   try{
    f.texts.set(a.path,'Parents:: [[B]]');f.app.vault.trigger('modify',a);
    ok(await f.acquisition.reconcile(),'Known body edit closes through existing source owner');
    ok(f.acquisition.hasSemanticDependencies(),'No false partial authority');
    ok(f.work.inspections.every(path=>path==='A.md'),'Unchanged B is not inspected');ok(f.work.visits.every(row=>row.startsWith('A.md:')),'Unchanged B families are not read');
    equal(f.reads,['A.md'],'Only the actual edited body is read');equal(f.parses.length,1,'Only that body is parsed');
    const rows=[];equal(await f.repository.visit('A.md','values',batch=>{rows.push(...batch);return true}),'ready','Current source facts authenticate');
    ok(rows.some(row=>row.kind==='reference-value'&&row.fieldName==='Parents')&&!rows.some(row=>row.kind==='reference-value'&&row.fieldName==='Friends'),'Actual new ontology input persists');return true;
   }finally{f.close();}
  })()`));
 }finally{await browser.cleanup();}
});
