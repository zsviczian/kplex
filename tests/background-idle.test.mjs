/** Test production short-wait cancellation, compatibility fallback and shared index priority ownership. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {loadPortableModules} from './support/portableTypeScript.mjs';
const {exports:{scheduleBackgroundIdle,ForegroundWorkScheduler,INDEX_WORK_PRIORITY:P}}=loadPortableModules([
 'src/adapters/obsidian/backgroundIdle.ts','src/index/ForegroundWorkScheduler.ts']);

/** Supply actual private buffers but deterministic asynchronous wait delivery and deliberately held timers. */
function fixture(){
 const waits=[],timers=new Map(),notifications=[];let next=0;
 const owner={SharedArrayBuffer,Int32Array,
  Atomics:{waitAsync(cell,index,expected,delay){assert.equal(cell.length,1);assert.equal(index,0);assert.equal(expected,0);
   let resolve,reject;const value=new Promise((ok,fail)=>{resolve=ok;reject=fail;});waits.push({cell,delay,resolve,reject});return{async:true,value};},
   notify(cell,index,count){assert.equal(index,0);assert.equal(count,1);notifications.push(cell);waits.find(wait=>wait.cell===cell)?.resolve('ok');return 1;}},
  setTimeout(callback,delay){const id=++next;timers.set(id,{callback,delay});return id;},clearTimeout(id){timers.delete(id);}};
 owner.document={defaultView:owner};
 return{owner,waits,timers,notifications,fire(){const [id,timer]=timers.entries().next().value;timers.delete(id);timer.callback();}};
}
/** Flush ordinary promise continuations without pretending they dispatch native event-loop tasks. */
async function turn(){await Promise.resolve();await Promise.resolve();await Promise.resolve();}

test('a short native wait keeps the requested rest without a background-clamped browser timer',async()=>{
 const f=fixture();let calls=0;const cancel=scheduleBackgroundIdle(()=>calls++,24,f.owner);
 assert.equal(calls,0);assert.equal(f.timers.size,0);assert.equal(f.waits.length,1);assert.equal(f.waits[0].delay,24);
 f.waits[0].resolve('timed-out');await turn();assert.equal(calls,1);cancel();cancel();assert.equal(f.notifications.length,0);
});
test('foreground cancellation wakes only the private waiter and suppresses queued completion',async()=>{
 const f=fixture();let calls=0;const cancel=scheduleBackgroundIdle(()=>calls++,24,f.owner);
 f.waits[0].resolve('timed-out');cancel();cancel();await turn();assert.equal(calls,0);assert.equal(f.notifications.length,1);
});
test('independent waits never notify each other',async()=>{
 const f=fixture(),calls=[];const first=scheduleBackgroundIdle(()=>calls.push('first'),24,f.owner);
 const second=scheduleBackgroundIdle(()=>calls.push('second'),12,f.owner);
 assert.notEqual(f.waits[0].cell.buffer,f.waits[1].cell.buffer);first();await turn();assert.deepEqual(calls,[]);
 f.waits[1].resolve('timed-out');await turn();assert.deepEqual(calls,['second']);second();assert.equal(f.notifications.length,1);
});
for(const missing of ['SharedArrayBuffer','Int32Array','waitAsync'])test(`missing ${missing} retains the owning timer and cancellation`,async()=>{
 const f=fixture();if(missing==='waitAsync')delete f.owner.Atomics.waitAsync;else delete f.owner[missing];
 let calls=0;const cancel=scheduleBackgroundIdle(()=>calls++,24,f.owner);assert.equal(f.waits.length,0);
 assert.equal(f.timers.size,1);assert.equal([...f.timers.values()][0].delay,24);cancel();cancel();assert.equal(f.timers.size,0);assert.equal(calls,0);
 scheduleBackgroundIdle(()=>calls++,12,f.owner);f.fire();await turn();assert.equal(calls,1);
});
for(const failure of ['constructor','wait','synchronous','rejection'])test(`failed ${failure} capability falls back once and remains cancellable`,async()=>{
 const f=fixture();let calls=0;
 if(failure==='constructor')f.owner.SharedArrayBuffer=class{constructor(){throw Error('Unavailable');}};
 if(failure==='wait')f.owner.Atomics.waitAsync=()=>{throw Error('Unavailable');};
 if(failure==='synchronous')f.owner.Atomics.waitAsync=()=>({async:false,value:'timed-out'});
 const cancel=scheduleBackgroundIdle(()=>calls++,24,f.owner);
 if(failure==='rejection'){f.waits[0].reject(Error('Unavailable'));await turn();}
 assert.equal(f.timers.size,1);assert.equal(calls,0);cancel();assert.equal(f.timers.size,0);await turn();assert.equal(calls,0);
});
test('a rejection after cancellation cannot create a fallback timer',async()=>{
 const f=fixture();const cancel=scheduleBackgroundIdle(assert.fail,24,f.owner);cancel();f.waits[0].reject(Error('Late'));
 await turn();assert.equal(f.timers.size,0);
});
test('ambient atomic globals without an owning document loop retain timer-backed liveness',async()=>{
 const f=fixture();delete f.owner.document;let calls=0;
 const cancel=scheduleBackgroundIdle(()=>calls++,24,f.owner);assert.equal(f.waits.length,0);assert.equal(f.timers.size,1);
 f.fire();await turn();assert.equal(calls,1);cancel();
 const retired=fixture();retired.owner.document.defaultView=null;
 const stop=scheduleBackgroundIdle(assert.fail,24,retired.owner);assert.equal(retired.waits.length,0);stop();assert.equal(retired.timers.size,0);
});
test('notification failure still retires the callback before the bounded timeout arrives',async()=>{
 const f=fixture();f.owner.Atomics.notify=()=>{throw Error('Retired realm');};
 const cancel=scheduleBackgroundIdle(assert.fail,24,f.owner);assert.doesNotThrow(cancel);f.waits[0].resolve('timed-out');await turn();
});
test('the shared scheduler preserves preemption, rest budgets and unload with native waits',async()=>{
 const f=fixture();let now=0;
 const scheduler=new ForegroundWorkScheduler({now:()=>now,throttle:()=> 'responsive',
  setTimeout:f.owner.setTimeout,clearTimeout:f.owner.clearTimeout,scheduleIdle:(callback,delay)=>scheduleBackgroundIdle(callback,delay,f.owner)});
 await scheduler.checkpoint(P.background);now=6;let resumed=false;
 const pending=scheduler.checkpoint(P.background).then(()=>{resumed=true;});assert.equal(f.waits[0].delay,24);assert.equal(f.timers.size,0);
 const release=scheduler.begin(P.currentNode);await turn();assert.equal(resumed,false);assert.equal(f.notifications.length,1);
 await scheduler.checkpoint(P.currentNode);release();await pending;assert.equal(resumed,true);
 now+=6;const next=scheduler.checkpoint(P.background);assert.equal(f.waits[1].delay,24);scheduler.close();await next;
 assert.equal(f.notifications.length,2);assert.equal(scheduler.diagnostics().pacing,false);assert.equal(f.timers.size,0);
});
test('a cancelled host completion cannot end a newer scheduler rest',async()=>{
 let now=0;const callbacks=[],cancels=[];
 const scheduler=new ForegroundWorkScheduler({now:()=>now,throttle:()=> 'responsive',setTimeout:assert.fail,clearTimeout:assert.fail,
  scheduleIdle:(callback,delay)=>{assert.equal(delay,24);callbacks.push(callback);return()=>cancels.push(callback);}});
 await scheduler.checkpoint(P.background);now=6;const first=scheduler.checkpoint(P.background);const release=scheduler.begin(P.currentNode);
 release();await first;now+=6;let completed=false;const second=scheduler.checkpoint(P.background).then(()=>{completed=true;});
 callbacks[0]();await turn();assert.equal(completed,false);assert.equal(scheduler.diagnostics().pacing,true);
 callbacks[1]();await second;assert.equal(completed,true);assert.equal(cancels.length,2);scheduler.close();
});
