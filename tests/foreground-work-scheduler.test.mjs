/** Exercise actual cooperative priority ownership, nested requests and unload wakeups. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSync} from 'esbuild';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {browserBundle} from './support/browserTypeScript.mjs';
const directory=mkdtempSync(join(tmpdir(),'kplex-priority-'));
process.once('exit',()=>rmSync(directory,{recursive:true,force:true}));
const output=join(directory,'scheduler.cjs');
buildSync({entryPoints:['src/index/ForegroundWorkScheduler.ts'],outfile:output,bundle:true,platform:'node',format:'cjs'});
const {ForegroundWorkScheduler,INDEX_WORK_PRIORITY:P,sanitizeIndexingThrottle}=createRequire(import.meta.url)(output);
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

/** Deterministic host clock/timers exercise pacing without sleep or altered timing bounds. */
function pacedScheduler(throttle='responsive'){
 let now=0,next=0;const timers=new Map(),delays=[];
 const scheduler=new ForegroundWorkScheduler({now:()=>now,throttle:()=>throttle,
  setTimeout:(callback,delay)=>{const id=++next;timers.set(id,callback);delays.push(delay);return id;},
  clearTimeout:id=>{timers.delete(id);}});
 return{scheduler,timers,delays,advance:ms=>{now+=ms;},setThrottle:value=>{throttle=value;},
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
