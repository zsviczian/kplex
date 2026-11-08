/** Real IndexedDB durability and failure isolation, including a forced browser-process restart. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {browserBundle,chromiumHarness} from './support/browserTypeScript.mjs';
const bundle=await browserBundle(['src/index/IndexedDbCache.ts','src/application/IndexingHistory.ts','src/application/IndexingActivity.ts'],{
  obsidian:'exports.Platform={isMobile:false,isIosApp:false};',
});
const setup=`(()=>{
  window.M=sourceModules;window.ok=(value,message)=>{if(!value)throw Error(message)};
  window.done=async history=>{for(let n=0;n<200;n++){if(history.snapshot().storage.checkpoints)return;await new Promise(resolve=>window.setTimeout(resolve,5));}throw Error('Checkpoint deadline')};
  window.makeHistory=(name,version)=>{const recorder=new M.IndexingActivity(()=>performance.now());const history=new M.IndexingHistory(M.createIndexingHistoryStorage(name),{
    now:()=>performance.now(),wallTime:()=>Date.now(),schedule:(callback,delay)=>window.setTimeout(callback,delay),cancel:id=>window.clearTimeout(id)
  },()=>recorder.capture('eager','background','responsive',version),version,version);return {recorder,history};};return true;
})()`;

test('real meta store checkpoints survive normal plugin reload and forced process termination without index effects',{timeout:60000},async()=>{
  const browser=await chromiumHarness(bundle);
  try{
    await browser.evaluate(setup);
    const first=await browser.evaluate(`(async()=>{
      const name='history-durability',cache=new M.KplexIndexedDbCache(name);ok(await cache.open(),'Existing production database opens');
      const activity=JSON.stringify(cache.getActivityState()),diagnostics=JSON.stringify(cache.sources.getDiagnostics());
      window.first=makeHistory(name,'0.4.1');first.history.start();await done(first.history);
      const writes=first.history.snapshot().storage.checkpoints;first.history.close();
      for(let n=0;n<200&&first.history.snapshot().storage.checkpoints===writes;n++)await new Promise(resolve=>window.setTimeout(resolve,5));
      window.second=makeHistory(name,'0.4.2');second.recorder.begin('full-build','global','manual');second.history.start();await done(second.history);
      const previous=second.history.snapshot().previousSessions;ok(previous.length===1&&previous[0].termination==='normal-unload','Normal lifetime marker retained');
      ok(JSON.stringify(cache.getActivityState())===activity,'No index writer activity');ok(JSON.stringify(cache.sources.getDiagnostics())===diagnostics,'No source work or storage-health changes');
      cache.close();return second.history.snapshot().storage.bytes;
    })()`);
    assert(first>0&&first<=96*1024);
    await browser.restart();
    await browser.evaluate(setup);
    assert(await browser.evaluate(`(async()=>{
      const third=makeHistory('history-durability','0.4.3');third.history.start();await done(third.history);
      const previous=third.history.snapshot().previousSessions;ok(previous.length===2,'Both plugin versions survive real process restart');
      const interrupted=previous.find(item=>item.manifestVersion==='0.4.2');ok(interrupted.termination==='interrupted-or-unknown','Missing unload never asserts crash');
      ok(interrupted.statistics.active[0][0]===3,'Incomplete full build retained');third.history.close();return true;
    })()`));
  }finally{await browser.cleanup();}
});

test('diagnostic storage never creates/upgrades index databases and quota failure leaves cache usable',{timeout:60000},async()=>{
  const browser=await chromiumHarness(bundle);
  try{
    await browser.evaluate(setup);
    assert(await browser.evaluate(`(async()=>{
      const missing=M.createIndexingHistoryStorage('history-absent');const unavailable=await missing.update(()=>({json:'{}',value:true}));ok(!unavailable.available,'Missing database remains unavailable');
      const databases=await indexedDB.databases();ok(!databases.some(item=>item.name==='k-plex-index-v1-'+[...new TextEncoder().encode('history-absent')].map(value=>value.toString(16).padStart(2,'0')).join('')),'Aborted open creates no database');
      const cache=new M.KplexIndexedDbCache('history-fault');ok(await cache.open(),'Actual cache initialized');const before=JSON.stringify(cache.sources.getDiagnostics());
      const original=IDBObjectStore.prototype.put;let transforms=0;
      try{IDBObjectStore.prototype.put=function(value,...args){if(this.name==='meta'&&value?.key==='indexing-history')throw new DOMException('synthetic','QuotaExceededError');return original.call(this,value,...args);};
        const failed=await M.createIndexingHistoryStorage('history-fault').update(()=>{transforms++;return {json:'{}',value:true};});ok(!failed.available,'Quota denial is best effort');
      }finally{IDBObjectStore.prototype.put=original;}
      ok(transforms===1,'No retry loop');ok(JSON.stringify(cache.sources.getDiagnostics())===before,'Index storage health unchanged');ok(await cache.open(),'Index handle remains available');
      const recovered=await M.createIndexingHistoryStorage('history-fault').update(()=>({json:'{}',value:true}));ok(recovered.available,'Independent diagnostic storage recovers');cache.close();return true;
    })()`));
  }finally{await browser.cleanup();}
});
