/** Actual cache scheduling and view-close bodies protect completed rebuild durability. */
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
/** Extract an unchanged production method; fake capabilities supply only clocks and timer receipts. */
function load(path,name,dependencies){const source=ts.createSourceFile(path,readFileSync(new URL('../'+path,import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);let found;
  function visit(node){if(ts.isMethodDeclaration(node)&&node.name.getText(source)===name)found=node;ts.forEachChild(node,visit);}visit(source);assert(found,name);
  const text=found.getText(source),js=ts.transpileModule('const action=function '+name+text.slice(text.indexOf('('))+';', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  return new Function(...Object.keys(dependencies),js+'return action;')(...Object.values(dependencies));}
/** Wall-clock changes are intentionally absent: retained scheduling deadlines are monotonic. */
function fixture(){let now=0,serial=0;const timers=new Map(),writes=[];
  const window={performance:{now:()=>now},setTimeout:(callback,delay)=>{timers.set(++serial,{callback,at:now+delay});return serial;},clearTimeout:id=>timers.delete(id)};
  const notifications=[];
  const index={snapshotPersistTimer:null,snapshotPersistDueAt:null,snapshotPersistGeneration:0,orphanCleanupTimer:null,
    fullSnapshotHydrated:true,fullSnapshotFresh:true,
    semanticPolicyRevision:1,fullSemanticPolicyRevision:1,fullSemanticSourceRevision:0,fullSemanticMaintenanceRevision:0,
    sourceAcquisition:{isInventoryEnabled:()=>false,hasSemanticDependencies:()=>true,pendingGraphSources:()=>new Map(),getMaintenanceRevision:()=>0},
    plugin:{getIndexSourceRevision:()=>0,notifyStartupProgress(){notifications.push(index.snapshotPersistTimer===null?'writer':'scheduled');}},
    async persistIndexedDbSnapshot(run){writes.push(run);return true;}};
  for(const name of ['scheduleSnapshotPersist','cancelPendingPersistence','startSnapshotPersist'])index[name]=load('src/index/GraphIndex.ts',name,{window,Platform:{isMobile:false,isIosApp:false}});
  return{index,timers,writes,notifications,setNow:value=>{now=value},fire:()=>{const entry=[...timers.values()][0];assert(entry);now=entry.at;timers.clear();entry.callback();},window};}

test('an idle status subscriber observes cache scheduling, writer start and completion without a graph event',async()=>{
  const f=fixture();let release;f.index.persistIndexedDbSnapshot=()=>new Promise(done=>release=done);
  f.index.scheduleSnapshotPersist(5000);assert.deepEqual(f.notifications,['scheduled']);
  f.fire();assert.deepEqual(f.notifications,['scheduled','writer']);
  release(true);await new Promise(setImmediate);
  assert.deepEqual(f.notifications,['scheduled','writer','writer']);assert.equal(f.index.snapshotPersistDueAt,null);
});

test('startup completion consumes its pending save immediately; later edits keep their throttle',async()=>{
  const f=fixture();f.index.finishStartupSnapshot=load('src/index/GraphIndex.ts','finishStartupSnapshot',{window:f.window});
  f.index.scheduleSnapshotPersist(300000);f.setNow(1000);f.index.finishStartupSnapshot();
  assert.equal(f.timers.size,0,'No scheduled wait after completed startup');assert.equal(f.writes.length,1,'Writer starts in the completion call');
  await new Promise(setImmediate);f.setNow(2000);f.index.scheduleSnapshotPersist(300000);f.index.finishStartupSnapshot();
  assert.equal(f.writes.length,1,'The startup handoff happens once');assert.equal([...f.timers.values()][0].at,302000,'Ordinary later edits remain throttled');
});

test('unchanged cached startup needs no new write and an incomplete graph cannot flush',()=>{
  const f=fixture();f.index.finishStartupSnapshot=load('src/index/GraphIndex.ts','finishStartupSnapshot',{window:f.window});
  f.index.finishStartupSnapshot();assert.equal(f.writes.length,0);assert.equal(f.timers.size,0);
  const partial=fixture();partial.index.finishStartupSnapshot=load('src/index/GraphIndex.ts','finishStartupSnapshot',{window:partial.window});
  partial.index.fullSnapshotFresh=false;partial.index.scheduleSnapshotPersist(300000);partial.index.finishStartupSnapshot();
  assert.equal(partial.writes.length,0,'Source repair must finish before initial persistence');assert.equal(partial.timers.size,1);
});

test('startup source validation cannot consume the one-time handoff before its late graph repair schedules a save',async()=>{
  const f=fixture();let ready=false;
  f.index.sourceAcquisition={isInventoryEnabled:()=>true,hasSemanticDependencies:()=>ready,pendingGraphSources:()=>new Map(),getMaintenanceRevision:()=>0};
  f.index.finishStartupSnapshot=load('src/index/GraphIndex.ts','finishStartupSnapshot',{window:f.window});
  f.index.finishStartupSnapshot(); // Hydration is complete; source validation still owns startup.
  f.setNow(2000);f.index.scheduleSnapshotPersist(300000);ready=true;f.index.finishStartupSnapshot();
  assert.equal(f.writes.length,1,'The late startup repair must write at source/graph closure');
  assert.equal(f.timers.size,0,'No edit-idle wait for the startup repair');
  await new Promise(setImmediate);
});

for(const blocker of ['structural','policy','source','maintenance'])test('startup persistence retains its request while '+blocker+' ownership is not coherent',()=>{
  const f=fixture();f.index.finishStartupSnapshot=load('src/index/GraphIndex.ts','finishStartupSnapshot',{window:f.window});
  f.index.sourceAcquisition.isInventoryEnabled=()=>true;f.index.scheduleSnapshotPersist(300000);
  const key={structural:'pendingStructuralTasks',policy:'fullSemanticPolicyRevision',source:'fullSemanticSourceRevision',maintenance:'fullSemanticMaintenanceRevision'}[blocker],before=f.index[key];
  f.index[key]=blocker==='structural'?1:-1;f.index.finishStartupSnapshot();assert.equal(f.writes.length,0,'No mixed or partial snapshot');assert(f.index.startupSnapshotRequested);
  f.index[key]=before;f.index.finishStartupSnapshot();assert.equal(f.writes.length,1,'Coherent closure consumes the retained handoff');
});

test('ready text is absent while cached web links and a delayed save are still pending',()=>{
  const status=load('src/main.ts','getIndexStatus',{});
  const context={indexPreparationAdmitted:true,cachedMarkdownFileCount:12,
    computeIndexStatusFacts:()=>({upToDate:true,phase:'ready',indexedFiles:12,totalFiles:12}),translator:key=>key,
    index:{isOnDemandMode:()=>false,getUrlIndexProgress:()=>({active:true,total:0,restored:5}),
      getSnapshotPersistenceDiagnostics:()=>({pending:true,active:false,dueInMs:200000})}};
  const result=status.call(context);assert.equal(result.upToDate,true);assert.equal(result.activeWork,true);
  assert.equal(result.label,'indexing.urlsRestoring\nindex.statusCacheSavePending');
});

test('later edit/no-op scheduling cannot turn a completed-build five-second save into a five-minute delay',async()=>{
  const f=fixture();f.index.scheduleSnapshotPersist(5000);f.setNow(1000);
  f.index.cancelPendingPersistence(true);f.setNow(2000);f.index.scheduleSnapshotPersist(300000);
  assert.equal(f.timers.size,1);assert.equal([...f.timers.values()][0].at,5000);
  f.setNow(3000);f.index.scheduleSnapshotPersist(300000);assert.equal([...f.timers.values()][0].at,5000);
  f.fire();await new Promise(setImmediate);assert.deepEqual(f.writes,[f.index.snapshotPersistGeneration]);assert.equal(f.index.snapshotPersistDueAt,null);
});

test('a patch spanning the deadline requeues immediately; explicit retirement cancels every retained deadline',()=>{
  const f=fixture();f.index.scheduleSnapshotPersist(5000);f.index.cancelPendingPersistence(true);f.setNow(8000);f.index.scheduleSnapshotPersist(300000);
  assert.equal([...f.timers.values()][0].at,8000);f.index.cancelPendingPersistence();assert.equal(f.timers.size,0);assert.equal(f.index.snapshotPersistDueAt,null);
  f.index.scheduleSnapshotPersist(300000);assert.equal([...f.timers.values()][0].at,308000);f.index.cancelPendingPersistence();
});

test('an edit cancelling an active writer retains its already-due save instead of waiting five more minutes',async()=>{
  const f=fixture();let release;const held=new Promise(done=>release=done);
  f.index.persistIndexedDbSnapshot=async run=>{f.writes.push(run);if(f.writes.length===1)await held;return true;};
  f.index.scheduleSnapshotPersist(5000);f.fire();f.setNow(6000);
  try{
    f.index.cancelPendingPersistence(true);f.index.scheduleSnapshotPersist(300000);
    assert.equal([...f.timers.values()][0].at,6000,'The active writer already consumed the initial wait');
    release();await new Promise(setImmediate);
    assert.equal(f.index.snapshotPersistDueAt,5000,'Old writer completion cannot clear the newer retry deadline');
    f.fire();await new Promise(setImmediate);assert.equal(f.writes.length,2);
    assert.equal(f.index.snapshotPersistDueAt,null,'Only the current writer clears its completed deadline');
  }finally{release();}
});

test('closing the last Plex retains completed graph persistence and still cancels partial cache work',()=>{
  const f=fixture(),close=load('src/main.ts','onKplexViewClosed',{window:f.window,Platform:{isIosApp:false}});
  let cancelled=0;f.index.cancelRebuild=()=>{};f.index.isFullSnapshotHydrated=()=>true;
  const cancel=f.index.cancelPendingPersistence;f.index.cancelPendingPersistence=function(...args){cancelled++;return cancel.apply(this,args);};
  const context={openKplexViews:1,initialIndexComplete:true,rebuildTimer:null,index:f.index};
  f.index.scheduleSnapshotPersist(5000);close.call(context);assert.equal(cancelled,0);assert.equal(f.timers.size,1);f.fire();assert.equal(f.writes.length,1);
  context.openKplexViews=1;f.index.isFullSnapshotHydrated=()=>false;f.index.scheduleSnapshotPersist(5000);close.call(context);assert.equal(cancelled,1);assert.equal(f.timers.size,0);
});

test('concurrent source, graph compilation, URL and cache-save work retain separate status lines',()=>{
  const status=load('src/main.ts','getIndexStatus',{});
  const context={indexPreparationAdmitted:true,cachedMarkdownFileCount:12000,initialIndexComplete:false,
    computeIndexStatusFacts:()=>({upToDate:false,phase:'indexing',indexedFiles:6000,totalFiles:12000}),
    translator:(key,values)=>key+(values?' '+JSON.stringify(values):''),
    startupDiagnostics:{progress:()=>({phase:'source-reconciliation',pass:1,processed:4000,total:12000})},
    index:{getUrlIndexProgress:()=>({active:true,total:12000,processed:2000,restored:0}),getBuildProgress:()=>({stage:'notes',processed:6000}),
      isBuilding:()=>true,isOnDemandMode:()=>false,hasActiveSourcePreparation:()=>true,getSnapshotHydrationDiagnostics:()=>null,
      getSnapshotPersistenceDiagnostics:()=>({active:true})}};
  const result=status.call(context),lines=result.label.split('\n');assert.equal(lines.length,4);
  assert(lines.some(line=>line.includes('index.startupSemantics')));assert(lines.some(line=>line.includes('index.startupChecking')));
  assert(lines.some(line=>line.startsWith('indexing.urlsProgress')));assert(lines.some(line=>line==='index.statusSavingCache'));
});
