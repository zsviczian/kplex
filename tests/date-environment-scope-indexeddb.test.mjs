/** Real-IDB Date-registry drift uses existing field memberships; Daily Notes drift retains broad recovery. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {contributorBrowserBundle,contributorBrowserInitialize} from './support/contributorBrowserFixture.mjs';
import {chromiumHarness} from './support/browserTypeScript.mjs';
import {centerGateSettings} from './support/requestedCenterGateFixture.mjs';
const bundle=await contributorBrowserBundle(['src/index/GraphIndex.ts','src/index/GraphBuilder.ts','src/index/IndexSnapshot.ts']);

test('a new text-valued note cannot change Date inference or recheck unrelated holders',async()=>{
 const browser=await chromiumHarness(bundle);try{
  await browser.evaluate(contributorBrowserInitialize);
  assert(await browser.evaluate(`(async()=>{
   const f=await fixture('date-inference-create');let hint='date';
   f.app.metadataTypeManager={getAssignedWidget:()=>null,getPropertyInfo:()=>({widget:hint}),getTypeInfo:(_field,value)=>({inferred:{type:value==='2026-11-08'?'date':'text'}})};
   try{
    const owner=f.add('Affected.md','',{Due:'2026-11-08'});for(let n=0;n<40;n++)f.add('Unrelated'+n+'.md','',{Due:'2026-11-08'});
    await f.acquire();ok(await f.acquisition.reconcile(),'Closed inferred-Date sources');f.work.reset();f.reads.length=0;f.parses.length=0;
    hint='text';const created=f.add('New daily.md','',{Due:'[[Other]]'});f.app.vault.trigger('create',created);
    ok(await f.acquisition.flush(),'Known creation converges without a global type change');
    equal(f.work.headPages,0,'No source inventory');ok(f.work.inspections.every(path=>path===created.path),'Existing Date holders are not inspected');
    ok(f.work.writes.every(path=>path==='replace:'+created.path),'Existing Date holders are not rewritten');
    equal(f.acquisition.getRecoveryDiagnostics().environmentChange,null,'An inferred hint is not a Date-registry event');
    const records=[];equal(await f.repository.visit(owner.path,'resolution',rows=>{records.push(...rows);return true}),'ready','Existing owner remains readable');
    equal(records.filter(row=>row.kind==='date-property').length,1,'Original Date inference remains valid');
    return true;
   }finally{f.close()}
  })()`));
 }finally{await browser.cleanup()}
});

test('explicit Text and Date assignments and unsetting them update inferred-Date graph edges',async()=>{
 const browser=await chromiumHarness(bundle);try{
  await browser.evaluate(contributorBrowserInitialize);
  assert(await browser.evaluate(`(async()=>{
   const f=await fixture('date-inference-assignment');let index,release;const assigned=new Map();
   f.app.metadataTypeManager={getAssignedWidget:field=>assigned.get(field)??null,getPropertyInfo:()=>({widget:'text'}),getTypeInfo:(_field,value)=>({inferred:{type:value==='2026-11-08'?'date':'text'}})};
   try{
    const owner=f.add('A.md','',{Due:'2026-11-08'}),target=f.add('Daily/2026-11-08.md','');
    f.app.vault.getName=()=> 'date-inference-assignment';f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??(path===''||path==='/'?f.app.vault.getRoot():null);
    const settings={...(${centerGateSettings.toString()})({showFolderNodes:false}),indexingMode:'eager',hierarchy:{hidden:[],parents:['Due'],children:[],leftFriends:[],rightFriends:[],previous:[],next:[],exclusions:[]},tagStyleList:[],showFullTagName:true,inferAllLinksAsFriends:false,inverseInfer:false,lastActivePath:owner.path,pinnedNodes:[]};
    index=new sourceModules.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>0},f.app);index.scheduleOrphanCleanup=()=>{};
    ok(await index.rebuild(),'Initial inferred-Date graph');await index.sourceAcquisition.flush();index.cancelPendingPersistence();release=index.acquireSemanticDemand(owner.path);await index.ensureSemanticScope(owner.path);
    const parents=()=>index.getNeighborhood(owner.path).parents.map(row=>row.page.path);equal(parents(),[target.path],'Per-value inference creates the Date relationship');f.reads.length=0;f.parses.length=0;
    for(const mode of ['text',null,'date','text',null]){
     if(mode===null)assigned.delete('Due');else assigned.set('Due',mode);
     index.sourceAcquisition.markContributorHostChange('environment');ok(await index.sourceAcquisition.flush(),'Assignment scope closes');await index.ensureSemanticScope(owner.path);
     for(let n=0;n<100&&index.hasActiveSemanticPreparation();n++)await new Promise(resolve=>setTimeout(resolve,10));
     equal(parents(),mode==='text'?[]:[target.path],'Explicit Text wins; unsetting it restores local Date inference');
     ok(index.sourceAcquisition.getRecoveryDiagnostics().environmentChange.scoped,'Actual assignment changes stay field-scoped');
    }
    equal(f.reads,[],'No Markdown reads for type changes');equal(f.parses,[],'No body reparsing');return true;
   }finally{release?.();index?.destroy();f.close()}
  })()`));
 }finally{await browser.cleanup()}
});

for(const order of ['before-create','after-create'])test('Date registry repair stays scoped when '+order+' overlaps a known note creation',async()=>{
 const browser=await chromiumHarness(bundle);try{
  await browser.evaluate(contributorBrowserInitialize);
  assert(await browser.evaluate(`(async()=>{
   const f=await fixture('date-environment-create-${order}');
   try{
    f.add('Affected.md','',{Due:'2026-11-08'});for(let n=0;n<40;n++)f.add('Unrelated'+n+'.md','',{Title:'Unchanged'});
    await f.acquire();ok(await f.acquisition.reconcile(),'Closed source and dependency inventory');f.work.reset();f.reads.length=0;f.parses.length=0;
    const date=()=>{f.app.dateFields.add('Due');f.acquisition.markContributorHostChange('environment')};
    if('${order}'==='before-create')date();
    const created=f.add('New daily.md','',{Due:'2026-11-09'});f.app.vault.trigger('create',created);
    if('${order}'==='after-create')date();
    ok(await f.acquisition.flush(),'Creation and Date interpretation converge');
    equal(f.work.headPages,0,'Known creation does not turn Date repair into a vault inventory');
    ok(f.work.inspections.every(path=>path==='Affected.md'||path===created.path),'Only affected and created owners are inspected');
    ok(f.acquisition.hasSemanticDependencies(),'Both owners close without leaving relationship authority incomplete');
    equal(f.acquisition.getRecoveryDiagnostics().environmentChange,{kind:'date-registry',fields:1,scoped:true},'Date repair remains scoped');
    return true;
   }finally{f.close()}
  })()`));
 }finally{await browser.cleanup()}
});

test('scoped Date changes publish and remove configured graph relationships without a Markdown edit',async()=>{
 const browser=await chromiumHarness(bundle);try{
  await browser.evaluate(contributorBrowserInitialize);
  assert(await browser.evaluate(`(async()=>{
   const f=await fixture('date-environment-graph');let index,release;
   try{
    const owner=f.add('A.md','',{ParentDue:'2026-11-08'}),target=f.add('Daily/2026-11-08.md','');
    f.app.vault.getName=()=> 'date-environment-graph';
    f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??(path===''||path==='/'?f.app.vault.getRoot():null);
    const settings={...(${centerGateSettings.toString()})({showFolderNodes:false}),indexingMode:'eager',
     hierarchy:{hidden:[],parents:['ParentDue'],children:[],leftFriends:[],rightFriends:[],previous:[],next:[],exclusions:[]},
     tagStyleList:[],showFullTagName:true,inferAllLinksAsFriends:false,inverseInfer:false,lastActivePath:owner.path,pinnedNodes:[]};
    index=new sourceModules.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>0},f.app);index.scheduleOrphanCleanup=()=>{};
    ok(await index.rebuild(),'Initial graph');await index.sourceAcquisition.flush();index.cancelPendingPersistence();
    release=index.acquireSemanticDemand(owner.path);await index.ensureSemanticScope(owner.path);
    const parents=()=>index.getNeighborhood(owner.path).parents.map(row=>row.page.path);
    equal(parents(),[],'A text scalar has no Date edge');
    for(const date of [true,false]){
     if(date)f.app.dateFields.add('ParentDue');else f.app.dateFields.delete('ParentDue');
     index.sourceAcquisition.markContributorHostChange('environment');ok(await index.sourceAcquisition.flush(),'Scoped source repair');
     await index.ensureSemanticScope(owner.path);
     for(let n=0;n<100&&index.hasActiveSemanticPreparation();n++)await new Promise(resolve=>setTimeout(resolve,10));
     equal(parents(),date?[target.path]:[],'The current graph follows Date interpretation without a file event');
     equal(index.sourceAcquisition.getRecoveryDiagnostics().environmentChange,{kind:'date-registry',fields:1,scoped:true},'Local proof remains scoped');
    }
    return true;
   }finally{release?.();index?.destroy();f.close();}
  })()`));
 }finally{await browser.cleanup();}
});

for(const date of [true,false])test('Date registry '+(date?'addition':'removal')+' repairs only holders of the changed field',async()=>{
 const browser=await chromiumHarness(bundle);try{
  await browser.evaluate(contributorBrowserInitialize);
  assert(await browser.evaluate(`(async()=>{
   const f=await fixture('date-environment-'+${date});
   try{
    f.add('Affected.md','',{Due:'2026-11-08'});for(let n=0;n<40;n++)f.add('Unrelated'+n+'.md','',{Title:'Unchanged'});
    if(!${date})f.app.dateFields.add('Due');await f.acquire();ok(await f.acquisition.reconcile(),'Closed source and dependency inventory');
    f.work.reset();f.reads.length=0;f.parses.length=0;
    if(${date})f.app.dateFields.add('Due');else f.app.dateFields.delete('Due');
    f.acquisition.markContributorHostChange('environment');ok(!f.acquisition.hasSemanticDependencies(),'Old Date semantics immediately lose readiness');
    ok(await f.acquisition.flush(),'Current Date semantics converge');
    equal(f.work.headPages,0,'No vault-wide head inventory');
    ok(f.work.inspections.every(path=>path==='Affected.md'),'Unrelated sources are not inspected');
    ok(f.work.visits.every(row=>row.startsWith('Affected.md:')),'Unrelated source families are not authenticated');
    ok(f.work.writes.every(row=>row==='replace:Affected.md'),'Only affected neutral facts activate');
    equal(f.reads,[],'Cached Date changes do not read notes');equal(f.parses,[],'No body parsing');
    equal(f.acquisition.getRecoveryDiagnostics().environmentChange,{kind:'date-registry',fields:1,scoped:true},'Fixed diagnostic reason distinguishes scoped Date work');
    const facts=[];for(const family of ['values','metadata','resolution','body-urls'])equal(await f.repository.visit('Affected.md',family,rows=>{facts.push(...rows);return true}),'ready','Current facts authenticate');
    equal(facts.filter(row=>row.kind==='date-property').length,${date}?1:0,'Date relationships follow the actual registry');
    ok(f.acquisition.hasSemanticDependencies(),'Authority follows completed affected-source repair');return true;
   }finally{f.close();}
  })()`));
 }finally{await browser.cleanup();}
});

test('retired Date field with no remaining owners does not trigger any source acquisition',async()=>{
 const browser=await chromiumHarness(bundle);try{
  await browser.evaluate(contributorBrowserInitialize);
  assert(await browser.evaluate(`(async()=>{
   const f=await fixture('retired-date-environment');
   try{
    const a=f.add('A.md','',{Due:'2026-11-08'});f.add('B.md','');f.app.dateFields.add('Due');await f.acquire();ok(await f.acquisition.reconcile(),'Seed Date observation');
    delete f.metadata.get(a.path).frontmatter.Due;f.app.metadataCache.trigger('changed',a);ok(await f.acquisition.flush(),'Ordinary removal closes its dependency counts');
    f.work.reset();f.reads.length=0;f.parses.length=0;f.app.dateFields.delete('Due');f.acquisition.markContributorHostChange('environment');
    ok(await f.acquisition.flush(),'Empty field impact closes through existing count proof');
    equal(f.work.headPages,0,'No global scan for a retired unused field');equal(f.work.inspections,[],'No source inspection');equal(f.work.visits,[],'No source-family read');equal(f.work.writes,[],'No neutral rewrite');
    equal(f.reads,[],'No vault reads');equal(f.parses,[],'No parsing');ok(f.acquisition.hasSemanticDependencies(),'Empty impact is explicitly proven');return true;
   }finally{f.close();}
  })()`));
 }finally{await browser.cleanup();}
});

test('Daily Notes interpretation changes retain ordinary all-owner recovery',async()=>{
 const browser=await chromiumHarness(bundle);try{
  await browser.evaluate(contributorBrowserInitialize);
  assert(await browser.evaluate(`(async()=>{
   const f=await fixture('daily-environment-global');
   try{
    f.add('A.md','',{Due:'2026-11-08'});f.add('B.md','');f.app.dateFields.add('Due');await f.acquire();ok(await f.acquisition.reconcile(),'Seed');f.work.reset();
    f.app.daily.format='DD-MM-YYYY';f.acquisition.markContributorHostChange('environment');ok(await f.acquisition.flush(),'New Daily Notes interpretation closes');
    ok(f.work.headPages>0,'Global validity descriptor still requires ordinary recovery');ok(f.acquisition.hasSemanticDependencies(),'New global descriptor is fully validated');return true;
   }finally{f.close();}
  })()`));
 }finally{await browser.cleanup();}
});

for(const drift of ['incomplete-counts','second-date-change'])test('Date scoping fails closed for '+drift,async()=>{
 const browser=await chromiumHarness(bundle);try{
  await browser.evaluate(contributorBrowserInitialize);
  assert(await browser.evaluate(`(async()=>{
   const f=await fixture('date-environment-fallback-${drift}');const lookup=f.repository.lookupLocalDependencies;
   try{
    f.add('A.md','',{Due:'2026-11-08'});f.add('B.md','',{Other:'2026-11-09'});await f.acquire();ok(await f.acquisition.reconcile(),'Seed');f.work.reset();
    if('${drift}'==='incomplete-counts')await edit(await f.cache.open(),['meta'],async tx=>{const store=tx.objectStore('meta'),row=await value(store.get('source-local-dependency-state'));store.put({...row,complete:false})});
    else{let changed=false;f.repository.lookupLocalDependencies=async function(...args){const result=await lookup.apply(this,args);if(!changed){changed=true;f.app.dateFields.add('Other')}return result;};}
    f.app.dateFields.add('Due');f.acquisition.markContributorHostChange('environment');ok(await f.acquisition.flush(),'Ordinary recovery validates the final actual environment');
    ok(f.work.headPages>0,'No local certificate from incomplete counts or a stale environment');
    ok(f.acquisition.hasSemanticDependencies(),'Final authority follows completed recovery');
    for(const id of ['A.md',...('${drift}'==='second-date-change'?['B.md']:[])]){
     const facts=[];for(const family of ['values','metadata','resolution','body-urls'])equal(await f.repository.visit(id,family,rows=>{facts.push(...rows);return true}),'ready','Current facts');
     equal(facts.filter(row=>row.kind==='date-property').length,1,'Every newly Date-typed owner was repaired');
    }return true;
   }finally{f.repository.lookupLocalDependencies=lookup;f.close();}
  })()`));
 }finally{await browser.cleanup();}
});

test('unload during Date field lookup cannot publish new environment authority',async()=>{
 const browser=await chromiumHarness(bundle);try{
  await browser.evaluate(contributorBrowserInitialize);
  assert(await browser.evaluate(`(async()=>{
   const f=await fixture('date-environment-unload'),lookup=f.repository.lookupLocalDependencies;let release,enter;
   const gate=new Promise(resolve=>release=resolve),entered=new Promise(resolve=>enter=resolve);
   try{
    f.add('A.md','',{Due:'2026-11-08'});await f.acquire();ok(await f.acquisition.reconcile(),'Seed');f.work.reset();
    f.repository.lookupLocalDependencies=async function(...args){const result=await lookup.apply(this,args);enter();await gate;return result;};
    f.app.dateFields.add('Due');f.acquisition.markContributorHostChange('environment');const task=f.acquisition.reconcile();await entered;
    f.acquisition.close();release();equal(await task,false,'Retired attempt is cancelled');
    equal(f.acquisition.environmentFields.get('Due'),false,'No stale observation publication');equal(f.work.writes,[],'No source replacement after unload');
    ok(!f.acquisition.hasSemanticDependencies(),'No retired semantic authority');return true;
   }finally{release();f.repository.lookupLocalDependencies=lookup;f.close();}
  })()`));
 }finally{await browser.cleanup();}
});

test('a paused inventory cannot reuse an earlier Date membership-scope receipt',async()=>{
 const browser=await chromiumHarness(bundle);try{
  await browser.evaluate(contributorBrowserInitialize);
  assert(await browser.evaluate(`(async()=>{
   const f=await fixture('date-environment-paused-scope');
   try{
    f.add('A.md','',{Due:'2026-11-08'});await f.acquire();ok(await f.acquisition.reconcile(),'Seed');f.work.reset();
    f.app.dateFields.add('Due');f.acquisition.markContributorHostChange('environment');f.acquisition.pauseInventory();
    f.add('New.md','',{Due:'2026-11-09'});
    ok(await f.acquisition.flush(),'Ordinary inventory closes the changed scope');ok(f.work.headPages>0,'Old scope receipt is not sufficient after inventory retirement');
    const facts=[];for(const family of ['values','metadata','resolution','body-urls'])equal(await f.repository.visit('New.md',family,rows=>{facts.push(...rows);return true}),'ready','New source is validated');
    equal(facts.filter(row=>row.kind==='date-property').length,1,'New Date owner was not missed');return true;
   }finally{f.close();}
  })()`));
 }finally{await browser.cleanup();}
});

test('one Date change consumes its coalesced request without a second empty maintenance pass',async()=>{
 const browser=await chromiumHarness(bundle);try{
  await browser.evaluate(contributorBrowserInitialize);
  assert(await browser.evaluate(`(async()=>{
   const f=await fixture('date-environment-single-owner');let starts=0;
   try{
    f.add('A.md','',{Due:'2026-11-08'});await f.acquire();ok(await f.acquisition.reconcile(),'Seed');
    f.acquisition.startupDiagnostics={phase(){},mark(){},activityCause(){},processed(){},recordWork(){},beginActivity(){starts++;return 0},endActivity(){}};
    f.acquisition.enableInventory();f.app.dateFields.add('Due');f.acquisition.markContributorHostChange('environment');ok(await f.acquisition.flush(),'One current change closes');
    await new Promise(resolve=>setTimeout(resolve,650));equal(starts,1,'No empty scheduled follow-up after all current work was consumed');return true;
   }finally{f.close();}
  })()`));
 }finally{await browser.cleanup();}
});
