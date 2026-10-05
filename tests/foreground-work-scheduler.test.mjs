/** Exercise actual cooperative priority ownership, nested requests and unload wakeups. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSync} from 'esbuild';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
const directory=mkdtempSync(join(tmpdir(),'kplex-priority-'));
process.once('exit',()=>rmSync(directory,{recursive:true,force:true}));
const output=join(directory,'scheduler.cjs');
buildSync({entryPoints:['src/index/ForegroundWorkScheduler.ts'],outfile:output,bundle:true,platform:'node',format:'cjs'});
const {ForegroundWorkScheduler}=createRequire(import.meta.url)(output);
/** Observe promise completion without relying on elapsed time or timers. */
async function turn(){await Promise.resolve();await Promise.resolve();}
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
