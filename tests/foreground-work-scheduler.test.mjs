/** Exercise actual cooperative priority ownership, nested requests and unload wakeups. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSync} from 'esbuild';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {browserBundle} from './support/browserTypeScript.mjs';
import {hostPacingProbe,hostActivityProbe} from './support/indexPacingHost.mjs';
const directory=mkdtempSync(join(tmpdir(),'kplex-priority-'));
process.once('exit',()=>rmSync(directory,{recursive:true,force:true}));
const output=join(directory,'scheduler.cjs');
buildSync({entryPoints:['src/index/ForegroundWorkScheduler.ts'],outfile:output,bundle:true,platform:'node',format:'cjs'});
const {ForegroundWorkScheduler,INDEX_WORK_PRIORITY:P,sanitizeIndexingThrottle}=createRequire(import.meta.url)(output);
const {sanitizeBackgroundIndexingEffort}=createRequire(import.meta.url)(output);
const cacheBundle=await browserBundle(['src/index/IndexedDbCache.ts'],{
 obsidian:'exports.Platform={isMobile:false};',
});
const cacheScope={};new Function('window',cacheBundle)(cacheScope);
const {KplexIndexedDbCache}=cacheScope.sourceModules;
/** Supply bounded transaction results only; the production iterator owns priority and lifetime checks. */
function pagedCache(checkpoint){
 const cache=Object.create(KplexIndexedDbCache.prototype);let reads=0;
 cache.backgroundCheckpoint=checkpoint;cache.open=async()=>({});
 cache.readUrlOwnerPage=async()=>{reads++;return reads===1
  ?{values:[],lastKey:'first',exhausted:false}:{values:[],exhausted:true};};
 return{cache,reads:()=>reads};
}
/** Observe promise completion without relying on elapsed time or timers. */
async function turn(){await Promise.resolve();await Promise.resolve();}

test('inactive effort is bounded and malformed persisted values select the conservative default',()=>{
 for(const value of [undefined,null,'0',NaN,Infinity,{}])assert.equal(sanitizeBackgroundIndexingEffort(value),10);
 for(const [value,want] of [[0,0],[-20,0],[10.4,10],[67,67],[110,100]])assert.equal(sanitizeBackgroundIndexingEffort(value),want);
});

test('paused optional work has no timer, retains progress and resumes on actual host/preference events',async()=>{
 const f=pacedScheduler(),s=f.scheduler;let effort=0,completed=0;
 s.pacing.backgroundEffort=()=>effort;f.setForeground(false);
 const first=s.checkpoint(P.background).then(()=>{completed++;});
 const second=s.checkpoint(P.urlInventory).then(()=>{completed++;});
 await turn();assert.equal(completed,0);assert.equal(f.timers.size,0);assert.equal(s.diagnostics().paused,true);
 const release=s.begin(P.mutation);await s.checkpoint(P.mutation);release();await turn();
 assert.equal(completed,0,'Mutation admission cannot bypass a background pause');
 effort=10;s.refreshPacing();await Promise.all([first,second]);assert.equal(completed,2);
 assert.equal(s.diagnostics().paused,false);assert(s.diagnostics().restMs>1000);
 effort=0;s.refreshPacing();const third=s.checkpoint(P.background).then(()=>{completed++;});
 await turn();assert.equal(completed,2);f.setForeground(true);s.refreshPacing();await third;
 assert.equal(completed,3);assert.equal(s.diagnostics().restMs,24);
 f.setForeground(false);const retired=s.checkpoint(P.background);s.close();await retired;
 assert.equal(f.timers.size,0);assert.equal(s.activityWaiters.size,0);
});

test('effort spans a long low-power rest through exactly the chosen foreground speed',()=>{
 for(const mode of ['responsive','balanced','faster']){
  const f=pacedScheduler(mode,false),s=f.scheduler;let effort=1;s.pacing.backgroundEffort=()=>effort;
  assert.equal(s.diagnostics().restMs,2000);let previous=2001;
  for(effort=1;effort<=100;effort++){
   const current=s.diagnostics();assert(current.restMs<=previous);previous=current.restMs;
  }
  effort=100;const inactive=s.diagnostics();f.setForeground(true);const foreground=s.diagnostics();
  assert.equal(inactive.workMs,foreground.workMs);assert.equal(inactive.restMs,foreground.restMs);s.close();
 }
});

test('paused inactive views cannot admit current-center or neighbor preparation before focus returns',async()=>{
 const f=pacedScheduler('responsive',false),s=f.scheduler;s.pacing.backgroundEffort=()=>0;
 const published=[];
 const tasks=[P.currentNode,P.visibleNeighborhood].map(priority=>s.run(priority,async()=>{published.push(priority);}));
 await turn();const before=[...published];
 let checkpointPassed=false;const checkpoint=s.checkpoint(P.visibleNeighborhood).then(()=>{checkpointPassed=true;});
 await turn();const checkpointBefore=checkpointPassed;
 const release=s.begin(P.mutation);await s.checkpoint(P.mutation);release();
 const save=s.checkpoint(P.background,true);await save;
 f.setForeground(true);s.refreshPacing();await Promise.all([...tasks,checkpoint]);s.close();
 assert.deepEqual(before,[],'Visible does not mean foreground: automatic work must remain private while paused');
 assert.equal(checkpointBefore,false,'An already running visible task pauses at its next safe boundary');
 assert.deepEqual(published,[P.currentNode,P.visibleNeighborhood]);assert.equal(f.timers.size,0);
 f.setForeground(false);await s.run(P.currentNode,async()=>{});
 assert.equal(s.activityWaiters.size,0,'A late retired caller cannot install a new unload-blocked wait');
});

test('paused native catch-up retains one dirty backlog and visible path set without retry timers',async()=>{
 const timers=new Map();let serial=0,foreground=false,patches=0,visible=0,wakes=0;
 const Probe=hostActivityProbe({setTimeout:(callback)=>{timers.set(++serial,callback);return serial;},clearTimeout:id=>timers.delete(id)});
 const p=new Probe();Object.assign(p,{initialIndexComplete:true,settings:{backgroundIndexingEffort:0},lastIndexForeground:false,
  indexDirty:false,indexDirtyRevision:7,indexBacklogReasons:new Set(),visibleMetadataPaths:new Set(),visibleMetadataTimer:null,rebuildTimer:null,rebuildTask:null,
  isKplexIndexingForeground:()=>foreground,hasVisibleKplexSurface:()=>true,hasIndexMaintenanceDemand:()=>true,
  notifyIndexStatus:()=>{},notifyStartupProgress:()=>{},runtimePatchDelayMs:()=>1100,supportEvents:{record:()=>{}},
  index:{refreshHostActivity:()=>{wakes++;return ['A.md'];},refreshVisibleMarkdownPath:async()=>visible++},rebuildIndex:async()=>patches++});
 for(let edit=0;edit<3;edit++){p.scheduleRebuild('metadata:changed');p.scheduleVisibleMetadataRefresh('A.md');}
 assert.equal(timers.size,0,'Paused edits must not start the 1.1-second catch-up loop');
 assert.equal(p.indexDirty,true);assert.deepEqual([...p.visibleMetadataPaths],['A.md']);
 assert.equal(p.indexDirtyRevision,10,'Real edit observations remain dirty');
 foreground=true;p.refreshIndexActivity();assert.equal(timers.size,2,'Focus schedules each existing owner once');
 for(const [id,callback]of [...timers]){timers.delete(id);callback();}await turn();
 assert.equal(patches,1);assert.equal(visible,1);assert.equal(wakes,1);assert.equal(p.indexDirtyRevision,10,'Focus cannot manufacture source changes');
});

test('an admitted save keeps normal pacing and mutation preemption after switching to a paused background',async()=>{
 const f=pacedScheduler('responsive',false),s=f.scheduler;s.pacing.backgroundEffort=()=>0;
 await s.checkpoint(P.background,true);f.advance(6);
 let saved=false;const pending=s.checkpoint(P.background,true).then(()=>{saved=true;});
 assert.deepEqual(f.delays,[24]);const release=s.begin(P.mutation);await turn();assert.equal(saved,false);
 release();await pending;assert.equal(saved,true);assert.equal(s.diagnostics().paused,true);s.close();
});

for(const lane of [P.currentNode,P.visibleNeighborhood,P.urlInventory])test('an admitted save bypasses paused automatic lane '+lane+' while mutations still preempt it',async()=>{
 const f=pacedScheduler('responsive',true),s=f.scheduler;s.pacing.backgroundEffort=()=>0;
 const releaseUrl=s.begin(lane);let saved=false;
 const pending=s.checkpoint(P.background,true).then(()=>{saved=true;});
 await turn();assert.equal(saved,false,'Normal automatic priority is retained before focus loss');
 f.setForeground(false);const releaseMutation=s.begin(P.mutation);s.refreshPacing();await turn();
 assert.equal(saved,false,'Foreground mutation still preempts the save when automatic work is paused');
 releaseMutation();await turn();await turn();
 const passed=saved;s.close();releaseUrl();await pending;
 assert.equal(passed,true,'A paused optional owner cannot indefinitely stop an admitted save');
});

/** Deterministic host clock/timers exercise pacing without sleep or altered timing bounds. */
function pacedScheduler(throttle='responsive',foreground=true){
 let now=0,next=0;const timers=new Map(),delays=[];
 const scheduler=new ForegroundWorkScheduler({now:()=>now,throttle:()=>throttle,isForeground:()=>foreground,
  setTimeout:(callback,delay)=>{const id=++next;timers.set(id,callback);delays.push(delay);return id;},
  clearTimeout:id=>{timers.delete(id);}});
 return{scheduler,timers,delays,advance:ms=>{now+=ms;},setThrottle:value=>{throttle=value;},setForeground:value=>{foreground=value;},
  fire:()=>{const [id,callback]=timers.entries().next().value;timers.delete(id);callback();}};
}

test('background pacing creates shared host idle windows while foreground checkpoints stay immediate',async()=>{
 const f=pacedScheduler(),scheduler=f.scheduler;
 await scheduler.checkpoint(P.background);f.advance(6);
 let urlDone=false,backgroundDone=false;
 const url=scheduler.checkpoint(P.urlInventory).then(()=>{urlDone=true;});
 const background=scheduler.checkpoint(P.background).then(()=>{backgroundDone=true;});
 assert.deepEqual(f.delays,[24]);assert.equal(f.timers.size,1);
 await scheduler.checkpoint(P.visibleNeighborhood);await turn();
 assert.equal(urlDone,false);assert.equal(backgroundDone,false);
 f.advance(24);f.fire();await Promise.all([url,background]);
 assert.equal(urlDone,true);assert.equal(backgroundDone,true);assert.equal(f.timers.size,0);
 assert.equal(scheduler.diagnostics().idleWindows,1);scheduler.close();
});

test('inactive inventories share finite slower rests in every preference and retain their exact progress',async()=>{
 for(const mode of ['responsive','balanced','faster']){
  const f=pacedScheduler(mode,false),s=f.scheduler,committed=[];
  const release=s.begin(P.background);
  await s.checkpoint(P.background);
  for(let file=0;file<3;file++){
   f.advance(6);let urlReady=false;
   const url=s.checkpoint(P.urlInventory).then(()=>{urlReady=true;});
   const background=s.checkpoint(P.background).then(()=>{committed.push(file);});
   await turn();assert.equal(urlReady,false);assert.deepEqual(committed,Array.from({length:file},(_,n)=>n));
   assert.equal(f.timers.size,1,'Concurrent inventories cannot multiply their work allowance');
   assert.equal(f.delays.at(-1),240);
   f.advance(240);f.fire();await Promise.all([url,background]);assert.equal(urlReady,true);
  }
  assert.deepEqual(committed,[0,1,2],'Same retained job finishes without replay or cancellation');
  release();assert.deepEqual(s.diagnostics().active,[0,0,0,0,0]);s.close();
 }
});

test('tab focus changes restore the live preference without restarting retained work or shortening a pending rest',async()=>{
 const f=pacedScheduler('faster'),s=f.scheduler;
 await s.checkpoint(P.background);f.advance(6);await s.checkpoint(P.background);assert.equal(f.timers.size,0);
 f.setForeground(false);let completed=0;
 const pending=s.checkpoint(P.background).then(()=>{completed++;});assert.deepEqual(f.delays,[240]);
 f.setForeground(true);f.setThrottle('balanced');f.advance(240);f.fire();await pending;
 assert.equal(completed,1);f.advance(11);await s.checkpoint(P.background);assert.equal(f.timers.size,0);
 f.advance(1);const next=s.checkpoint(P.background);assert.deepEqual(f.delays,[240,12]);f.fire();await next;s.close();
});

test('inactive pacing never delays foreground checkpoints and mutations still preempt the same pending inventory',async()=>{
 const f=pacedScheduler('responsive',false),s=f.scheduler;
 await s.checkpoint(P.background);f.advance(6);
 let done=false;const pending=s.checkpoint(P.background).then(()=>{done=true;});
 for(const lane of [P.mutation,P.currentNode,P.visibleNeighborhood])await s.checkpoint(lane);
 assert.equal(done,false);assert.equal(f.timers.size,1);
 const release=s.begin(P.mutation);assert.equal(f.timers.size,0);await turn();assert.equal(done,false);
 release();await pending;assert.equal(done,true);assert.equal(s.diagnostics().waiting,0);s.close();
});

test('unload settles an inactive rest without allowing late publication',async()=>{
 const f=pacedScheduler('responsive',false),s=f.scheduler;let current=true,published=0;
 await s.checkpoint(P.background);f.advance(6);
 const pending=s.checkpoint(P.background).then(()=>{if(current)published++;});
 current=false;s.close();await pending;assert.equal(published,0);assert.equal(f.timers.size,0);
});

test('native selection uses the selected Plex owning document, including sidepanels and popouts',()=>{
 const {Probe,ItemView}=hostPacingProbe();
 const probe=new Probe();let active=null,calls=0;
 probe.app={workspace:{getActiveViewOfType(type){assert.equal(type,ItemView);calls++;return active;}}};
 /** Each view owns independent native-document state; main-window globals cannot authorize a popout. */
 const view=(type,focused=true,visibilityState='visible')=>({getViewType:()=>type,
  leaf:{getViewState(){throw Error('Pacing must never serialize a native view session');}},
  containerEl:{ownerDocument:{visibilityState,hasFocus:()=>focused}}});
 assert.equal(probe.isKplexIndexingForeground(),false);
 active=view('markdown');assert.equal(probe.isKplexIndexingForeground(),false);
 for(const type of ['plex','sidepanel']){
  active=view(type);assert.equal(probe.isKplexIndexingForeground(),true);
  active=view(type,false);assert.equal(probe.isKplexIndexingForeground(),false);
  active=view(type,true,'hidden');assert.equal(probe.isKplexIndexingForeground(),false);
 }
 assert.equal(calls,8,'One native selection read per hint, without enumerating leaves or reading geometry');
});

test('inactive startup retains normal pacing until its initial index is complete, then slows the same maintenance job',async()=>{
 const {Probe,ItemView}=hostPacingProbe(),host=new Probe();let reads=0,now=0,next=0;
 host.initialIndexComplete=false;
 host.app={workspace:{getActiveViewOfType(type){assert.equal(type,ItemView);reads++;return null;}}};
 const timers=new Map(),delays=[];
 const scheduler=new ForegroundWorkScheduler({now:()=>now,throttle:()=> 'responsive',isForeground:()=>host.pacingHint(),
  setTimeout:(callback,ms)=>{const id=++next;timers.set(id,callback);delays.push(ms);return id;},clearTimeout:id=>timers.delete(id)});
 const release=scheduler.begin(P.background);let completed=0;
 try{
  await scheduler.checkpoint(P.background);now+=6;
  let pending=scheduler.checkpoint(P.background).then(()=>{completed++;});
  assert.deepEqual(delays,[24],'Inactive cache hydration must retain its pre-change rest, not a 240 ms interruption window');
  assert.equal(reads,0,'Before readiness, native focus cannot change startup throughput');
  let [id,callback]=timers.entries().next().value;timers.delete(id);callback();await pending;
  host.initialIndexComplete=true;now+=6;
  pending=scheduler.checkpoint(P.background).then(()=>{completed++;});
  assert.deepEqual(delays,[24,240],'Only subsequent inactive maintenance uses the long rest');
  [id,callback]=timers.entries().next().value;timers.delete(id);callback();await pending;
  assert.equal(completed,2,'The existing job and its progress survive startup completion');
 }finally{release();scheduler.close();}
});

test('foreground admission cancels idle resource and resumed background waits for all foreground owners',async()=>{
 const f=pacedScheduler(),scheduler=f.scheduler;
 await scheduler.checkpoint(P.background);f.advance(6);let done=false;
 const task=scheduler.checkpoint(P.background).then(()=>{done=true;});
 const navigation=scheduler.begin(P.currentNode),mutation=scheduler.begin(P.mutation);
 assert.equal(f.timers.size,0);await turn();assert.equal(done,false);
 mutation();await turn();assert.equal(done,false);
 navigation();await task;assert.equal(done,true);assert.equal(scheduler.diagnostics().waiting,0);
 f.advance(6);const next=scheduler.checkpoint(P.background);
 assert.deepEqual(f.delays,[24,24]);scheduler.close();await next;assert.equal(f.timers.size,0);
});

test('live throttle choices change future pacing windows and invalid preferences remain responsive',async()=>{
 const f=pacedScheduler(),scheduler=f.scheduler;
 await scheduler.checkpoint(P.urlInventory);f.advance(6);
 let task=scheduler.checkpoint(P.urlInventory);f.fire();await task;
 f.setThrottle('balanced');f.advance(6);await scheduler.checkpoint(P.background);
 f.advance(6);task=scheduler.checkpoint(P.background);f.fire();await task;
 f.setThrottle('faster');f.advance(23);await scheduler.checkpoint(P.urlInventory);
 f.advance(1);task=scheduler.checkpoint(P.urlInventory);f.fire();await task;
 f.setThrottle('invalid');f.advance(6);task=scheduler.checkpoint(P.background);f.fire();await task;
 assert.deepEqual(f.delays,[24,12,4,24]);assert.equal(sanitizeIndexingThrottle(undefined),'responsive');
 assert.equal(scheduler.diagnostics().throttle,'responsive');scheduler.close();
});

test('close cancels pacing and priority waits without granting authority to late work',async()=>{
 const f=pacedScheduler(),scheduler=f.scheduler;
 await scheduler.checkpoint(P.background);f.advance(6);let current=true,publications=0;
 const task=scheduler.checkpoint(P.background).then(()=>{if(current)publications++;});
 current=false;scheduler.close();await task;assert.equal(publications,0);
 assert.equal(f.timers.size,0);assert.equal(scheduler.diagnostics().pacing,false);
 await scheduler.checkpoint(P.background);assert.equal(f.timers.size,0);
});

test('production URL owner cache iterator honors injected pacing and foreground preemption before reads',async()=>{
 const f=pacedScheduler(),scheduler=f.scheduler;
 const fixture=pagedCache(()=>scheduler.checkpoint(P.background));
 await scheduler.checkpoint(P.urlInventory);f.advance(6);
 let current=true;
 const task=scheduler.run(P.urlInventory,()=>fixture.cache.readUrlOwners(async()=>{},()=>current,
  ()=>scheduler.checkpoint(P.urlInventory)));
 await turn();assert.equal(fixture.reads(),0);assert.deepEqual(f.delays,[24]);
 const release=scheduler.begin(P.currentNode);
 await scheduler.checkpoint(P.currentNode);await turn();assert.equal(fixture.reads(),0);
 current=false;scheduler.close();assert.equal(await task,false);release();
 assert.equal(fixture.reads(),0);assert.equal(f.timers.size,0);
 assert.deepEqual(scheduler.diagnostics().active,[0,0,0,0,0]);
});
test('background retains progress across nested foreground requests and priority ordering',async()=>{
 const scheduler=new ForegroundWorkScheduler(),events=[];
 const releaseNavigation=scheduler.begin(1),releaseMutation=scheduler.begin(0);
 const background=(async()=>{events.push('chunk1');await scheduler.checkpoint(3);events.push('chunk2');})();
 const navigation=(async()=>{await scheduler.checkpoint(1);events.push('navigation');})();
 await turn();assert.deepEqual(events,['chunk1']);
 releaseMutation();await navigation;assert.deepEqual(events,['chunk1','navigation']);
 releaseMutation();await turn();assert.equal(scheduler.diagnostics().waiting,1);
 releaseNavigation();await background;assert.deepEqual(events,['chunk1','navigation','chunk2']);
 assert.deepEqual(scheduler.diagnostics().active,[0,0,0,0,0]);
});
test('foreground does not join paused background and releases ownership on throw',async()=>{
 const scheduler=new ForegroundWorkScheduler();let completed=false;
 await assert.rejects(scheduler.run(0,async()=>{
   const background=scheduler.checkpoint(4).then(()=>{completed=true;});
   await scheduler.run(0,async()=>{await scheduler.checkpoint(0);});
   await turn();assert.equal(completed,false);void background;throw Error('write failed');
 }),/write failed/);
 await turn();assert.equal(completed,true);assert.equal(scheduler.diagnostics().waiting,0);
 assert.deepEqual(scheduler.diagnostics().active,[0,0,0,0,0]);
});
test('unload wakes paused continuations without pretending their lifetime is current',async()=>{
 const scheduler=new ForegroundWorkScheduler(),release=scheduler.begin(0);
 const pause=scheduler.checkpoint(3);assert.equal(scheduler.diagnostics().waiting,1);
 scheduler.close();await pause;assert.equal(scheduler.diagnostics().waiting,0);
 release();assert.deepEqual(scheduler.diagnostics().active,[0,0,0,0,0]);
 await scheduler.checkpoint(4);
});

test('named lanes preserve the P0 through P4 hierarchy',()=>{
 assert.deepEqual(P,{mutation:0,currentNode:1,visibleNeighborhood:2,urlInventory:3,background:4});
});

test('whole-graph progress pauses behind URL inventory, which pauses behind navigation',async()=>{
 const scheduler=new ForegroundWorkScheduler(),events=[];
 const releaseFull=scheduler.begin(P.background);
 await scheduler.checkpoint(P.background);events.push('full chunk1');
 const releaseUrl=scheduler.begin(P.urlInventory);
 const full=(async()=>{await scheduler.checkpoint(P.background);events.push('full chunk2');releaseFull();})();
 await scheduler.checkpoint(P.urlInventory);events.push('URL chunk1');
 const releaseNavigation=scheduler.begin(P.currentNode);
 const url=(async()=>{await scheduler.checkpoint(P.urlInventory);events.push('URL chunk2');})();
 await turn();assert.deepEqual(events,['full chunk1','URL chunk1']);
 assert.deepEqual(scheduler.diagnostics().active,[0,1,0,1,1]);
 releaseNavigation();await url;
 assert.deepEqual(events,['full chunk1','URL chunk1','URL chunk2']);
 releaseUrl();
 await full;assert.deepEqual(events,['full chunk1','URL chunk1','URL chunk2','full chunk2']);
 assert.deepEqual(scheduler.diagnostics().pausesByLane,[0,0,0,1,1]);
 assert.deepEqual(scheduler.diagnostics().active,[0,0,0,0,0]);
});

test('each lower lane waits for every strictly higher lane and never its peers',async()=>{
 for(let higher=0;higher<4;higher++)for(let lower=higher+1;lower<=4;lower++){
  const scheduler=new ForegroundWorkScheduler(),releaseHigher=scheduler.begin(higher),releasePeer=scheduler.begin(lower);
  let complete=false;const task=scheduler.checkpoint(lower).then(()=>{complete=true;});
  await turn();assert.equal(complete,false,`P${lower} must wait for P${higher}`);
  releaseHigher();await task;assert.equal(complete,true,`P${lower} cannot wait for its own peer`);
  releasePeer();assert.deepEqual(scheduler.diagnostics().active,[0,0,0,0,0]);
 }
});

test('P4 stays paused until all higher foreground and URL owners have released',async()=>{
 const scheduler=new ForegroundWorkScheduler(),releases=[1,2,3].map(lane=>scheduler.begin(lane));
 let complete=false;const task=scheduler.checkpoint(P.background).then(()=>{complete=true;});
 for(const release of releases.slice(0,2)){release();await turn();assert.equal(complete,false);}
 releases[2]();await task;assert.equal(complete,true);
});

test('P0 preempts every lower active lane and close wakes work without granting publication authority',async()=>{
 const scheduler=new ForegroundWorkScheduler(),releaseMutation=scheduler.begin(P.mutation),events=[];
 let current=true;
 const tasks=[1,2,3,4].map(lane=>scheduler.run(lane,async()=>{
  await scheduler.checkpoint(lane);if(current)events.push(lane);
 }));
 await turn();assert.deepEqual(events,[]);assert.equal(scheduler.diagnostics().waiting,4);
 current=false;scheduler.close();await Promise.all(tasks);releaseMutation();
 assert.deepEqual(events,[]);assert.equal(scheduler.diagnostics().waiting,0);
 assert.deepEqual(scheduler.diagnostics().active,[0,0,0,0,0]);
});

test('diagnostics are detached aggregate copies',()=>{
 const scheduler=new ForegroundWorkScheduler(),release=scheduler.begin(P.urlInventory),snapshot=scheduler.diagnostics();
 snapshot.active[3]=99;snapshot.pausesByLane[4]=99;
 assert.deepEqual(scheduler.diagnostics().active,[0,0,0,1,0]);
 assert.deepEqual(scheduler.diagnostics().pausesByLane,[0,0,0,0,0]);release();
});

test('URL cache restore supplies its P3 checkpoint instead of borrowing its shared P4 checkpoint',{timeout:3000},async()=>{
 const scheduler=new ForegroundWorkScheduler(),fixture=pagedCache(()=>scheduler.checkpoint(P.background));
 await scheduler.run(P.urlInventory,async()=>{
  assert.equal(await fixture.cache.readUrlOwners(async()=>{},()=>true,()=>scheduler.checkpoint(P.urlInventory)),true);
 });
 assert.equal(fixture.reads(),2);assert.equal(scheduler.diagnostics().waiting,0);
});

test('caller-specific foreground cache iteration cannot self-deadlock through a lower background checkpoint',{timeout:3000},async()=>{
 const scheduler=new ForegroundWorkScheduler(),fixture=pagedCache(()=>scheduler.checkpoint(P.background));
 await scheduler.run(P.currentNode,async()=>{
  assert.equal(await fixture.cache.readUrlOwners(async()=>{},()=>true,()=>scheduler.checkpoint(P.currentNode)),true);
 });
 assert.equal(fixture.reads(),2);assert.equal(scheduler.diagnostics().waiting,0);
});

test('shared P4 cache work pauses before its first read and unload rejects the resumed continuation',async()=>{
 const scheduler=new ForegroundWorkScheduler(),fixture=pagedCache(()=>scheduler.checkpoint(P.background));
 const release=scheduler.begin(P.urlInventory);let current=true,settled=false;
 const task=fixture.cache.readUrlOwners(async()=>{},()=>current).finally(()=>{settled=true;});
 await turn();assert.equal(fixture.reads(),0);assert.equal(settled,false);
 current=false;scheduler.close();assert.equal(await task,false);release();assert.equal(fixture.reads(),0);
});
