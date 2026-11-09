/** Cross-lifetime statistical persistence without source, Vault or indexing capabilities. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {browserBundle} from './support/browserTypeScript.mjs';
const host={};new Function('window',await browserBundle(['src/application/IndexingHistory.ts','src/application/IndexingActivity.ts','src/application/supportReport.ts','src/application/diagnosticBuildIdentity.ts']))(host);
const {IndexingHistory,IndexingActivity,decodeIndexingHistory,summarizeIndexingActivity,INDEXING_HISTORY_INTERVAL_MS:INTERVAL,
  INDEXING_HISTORY_BYTE_LIMIT:BYTES,INDEXING_ACTIVITY_COLUMNS:C,createDiagnosticJson,wrapDiagnosticJson,SUPPORT_REPORT_BYTE_LIMIT}=host.sourceModules;
const tick=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
/** Atomic fake storage models only one native meta value and commits transformed bytes unchanged. */
function memory(){let json,available=true,writes=0;return{get json(){return json},set json(value){json=value},get writes(){return writes},set available(value){available=value},
  update:async transform=>{if(!available)return{available:false};const result=transform(json);json=result.json;writes++;return{available:true,value:result.value};}};}
/** Independently controlled clocks distinguish historical order from elapsed duration and timer work. */
function fixture(store=memory(),version='0.4.1',build='0.4.2+abcdef012345.local.20261108T070000000Z',initialWall=Date.parse('2026-11-08T07:00:00.000Z')){
  let now=0,wall=initialWall,serial=0,captures=0,cache=null;const timers=new Map();
  const recorder=new IndexingActivity(()=>now),source=Object.fromEntries(C.pass.slice(8,17).map(key=>[key,0]));
  const capture=()=>{captures++;return recorder.capture('eager','background','responsive',build);};
  const runtime={now:()=>now,wallTime:()=>wall,schedule:(callback,delay)=>{assert.equal(delay,INTERVAL);timers.set(++serial,callback);return serial;},cancel:id=>timers.delete(id)};
  const history=new IndexingHistory(store,runtime,capture,version,build,()=>cache);
  return{history,recorder,source,store,capture,timers,setCache:value=>{cache=value},get captures(){return captures},advance:async(ms=INTERVAL)=>{now+=ms;wall+=ms;const pending=[...timers.values()];timers.clear();for(const callback of pending)callback();await tick();},setWall:value=>{wall=value}};
}

test('normal reload and unknown interruption preserve separate manifest/build identities and counters',async()=>{
  const store=memory(),first=fixture(store);first.history.start();assert.equal(first.history.snapshot().status,'loading');await tick();
  const token=first.recorder.begin('host-inventory','global','startup-offline',first.source);first.source.checked=27;first.recorder.end(token,'complete',first.source);
  first.history.changed();await first.advance();first.history.close();await tick();
  const second=fixture(store,'0.4.2','0.4.2+abcdef012346.local.20261108T070001000Z');second.history.start();await tick();
  const previous=second.history.snapshot().previousSessions;assert.equal(previous.length,1);assert.equal(previous[0].termination,'normal-unload');
  assert.equal(previous[0].manifestVersion,'0.4.1');assert.equal(previous[0].buildId,'0.4.2+abcdef012345.local.20261108T070000000Z');
  assert.equal(previous[0].statistics.lastGlobal[C.pass.indexOf('checked')],27);assert.equal(previous[0].statistics.ageMs,INTERVAL);
  assert.equal(previous[0].startedAt,'2026-11-08T07:00:00.000Z');assert.equal(previous[0].lastCheckpointAt,'2026-11-08T07:05:00.000Z');
  const third=fixture(store,'0.4.3','0.4.3');third.history.start();await tick();
  assert.equal(third.history.snapshot().previousSessions.find(item=>item.manifestVersion==='0.4.2').termination,'interrupted-or-unknown');
  assert.equal(third.history.snapshot().previousSessions.length,2);assert.equal(third.recorder.capture().totals[0],0);
  first.history.close();second.history.close();third.history.close();await tick();
});

test('coarse churn does no capture or writes; idle is quiet; a stalled active pass checkpoints every five minutes',async()=>{
  const f=fixture();f.history.start();await tick();assert.equal(f.store.writes,1);assert.equal(f.captures,1);
  for(let i=0;i<100000;i++)f.history.changed();assert.equal(f.store.writes,1);assert.equal(f.captures,1);
  f.history.background();await tick();assert.equal(f.store.writes,1);await f.advance();assert.equal(f.store.writes,2);
  await f.advance();assert.equal(f.store.writes,2,'An idle safeguard captures but never rewrites unchanged history');
  f.recorder.begin('full-build','global','manual');f.history.changed();await f.advance();await f.advance();
  assert.equal(f.store.writes,4);const record=decodeIndexingHistory(f.store.json).record.sessions[0];
  assert.equal(record.statistics.active[0][3],2*INTERVAL);assert.equal(f.timers.size,1);
  f.history.close();await tick();assert.equal(f.timers.size,0);assert.equal(f.store.writes,5);f.history.close();assert.equal(f.store.writes,5);
});

test('rolling bounds preserve recent interruptions while evicting older healthy sessions',async()=>{
  const store=memory();
  for(let i=0;i<24;i++){const f=fixture(store,'0.4.'+i,'0.4.'+i,Date.parse('2026-11-08T07:00:00.000Z')+i*1000);f.history.start();await tick();if(i!==10)f.history.close();await tick();}
  const result=decodeIndexingHistory(store.json);assert.equal(result.rejected,0);assert.equal(result.record.sessions.length,17);
  assert(Buffer.byteLength(store.json)<=BYTES);assert.equal(result.record.evicted,7);
  assert(result.record.sessions.some(item=>item.manifestVersion==='0.4.10'));assert(!result.record.sessions.some(item=>item.manifestVersion==='0.4.0'));
});

test('retention has no 24-hour expiry and wall-clock correction does not change elapsed attribution',async()=>{
  const store=memory(),old=fixture(store,'0.4.1','0.4.1',Date.parse('2026-09-01T00:00:00.000Z'));old.history.start();await tick();old.history.close();await tick();
  const current=fixture(store,'0.4.3','0.4.3');current.history.start();await tick();assert.equal(current.history.snapshot().previousSessions[0].startedAt,'2026-09-01T00:00:00.000Z');
  current.recorder.begin('full-build','global','manual');current.history.changed();current.setWall(Date.parse('2026-10-01T00:00:00.000Z'));await current.advance();
  const saved=decodeIndexingHistory(store.json).record.sessions.find(item=>item.manifestVersion==='0.4.3');
  assert.equal(saved.statistics.ageMs,INTERVAL);assert.equal(saved.statistics.active[0][3],INTERVAL);assert.equal(saved.lastCheckpointAt,'2026-10-01T00:05:00.000Z');current.history.close();await tick();
});

test('corrupt data, unsupported storage and synchronous throws cannot escape into indexing',async()=>{
  for(const value of ['broken',false,'x'.repeat(BYTES+1),JSON.stringify({formatVersion:1,next:Number.MAX_SAFE_INTEGER,evicted:0,sessions:[]})])assert.equal(decodeIndexingHistory(value).rejected,1);
  const store=memory();store.json='broken';store.available=false;const f=fixture(store);f.history.start();await tick();assert.equal(f.history.snapshot().status,'unavailable');
  store.available=true;await f.advance();assert.equal(f.history.snapshot().status,'available');assert.equal(f.history.snapshot().storage.rejectedSessions,1);
  const failing=fixture({update(){throw Error('private path/token/exception');}});assert.doesNotThrow(()=>failing.history.start());await tick();assert.equal(failing.history.snapshot().status,'unavailable');
  failing.history.close();f.history.close();await tick();
});

test('stored allowlists reject private fields, invalid ordinals, malformed rows and unknown versions',async()=>{
  const f=fixture();f.recorder.begin('host-inventory','global','startup-offline');f.history.start();await tick();
  const good=JSON.parse(f.store.json),row=good.sessions[0];assert(row.statistics);
  for(const mutate of [r=>r.manifestVersion='private-vault',r=>r.buildId='0.4.2+private-token',r=>r.startedAt='2026-02-30T00:00:00.000Z',
    r=>r.statistics.totals[0]=null,r=>r.statistics.active[0][0]=999,r=>r.statistics.active[0][7]=999999,r=>r.statistics.current[0]='secret',r=>r.statistics.recent=Array(5).fill([])]){
    const dirty=structuredClone(good);mutate(dirty.sessions[0]);const decoded=decodeIndexingHistory(JSON.stringify(dirty));assert.equal(decoded.record.sessions.length,0);assert.equal(decoded.rejected,1);
  }
  row.path='private-vault/medical.md';row.statistics.ontology='private-property';const decoded=decodeIndexingHistory(JSON.stringify(good));
  assert(!JSON.stringify(decoded).includes('private-'));assert.equal(summarizeIndexingActivity(JSON.parse(JSON.stringify(f.capture()))),null);
  f.history.close();await tick();
});

test('one pending plus latest final write preserves newer sessions and does not resurrect disposed capture',async()=>{
  const real=memory();let release,calls=0;const delayed={update:async transform=>{calls++;if(calls===1)await new Promise(resolve=>{release=resolve});return real.update(transform);}};
  const first=fixture(delayed);first.history.start();await tick();first.history.close();assert.equal(first.timers.size,0);
  const second=fixture(real,'0.4.3','0.4.3');second.history.start();await tick();release();await tick();await tick();
  const decoded=decodeIndexingHistory(real.json);assert.equal(decoded.record.sessions.length,2);assert.equal(calls,2);
  const current=decoded.record.sessions.find(row=>row.manifestVersion==='0.4.1');assert.equal(current.termination,'normal-unload');
  const captured=first.captures;first.history.changed();first.history.background();assert.equal(first.captures,captured);
  second.history.close();await tick();
});

test('coarse changes after a queued checkpoint remain dirty until a newer checkpoint captures them',async()=>{
  const real=memory();let release,calls=0;
  const delayed={update:async transform=>{if(++calls===1)await new Promise(resolve=>{release=resolve});return real.update(transform);}};
  const f=fixture(delayed);f.history.start();await tick();f.recorder.mark('strict-ready');f.history.settled();await tick();
  f.recorder.cause('known-file');f.history.changed();release();await tick();await tick();
  assert.equal(real.writes,2);const before=decodeIndexingHistory(real.json).record.sessions[0].statistics.causes[C.causes.indexOf('known-file')];
  assert.equal(before,0,'The queued snapshot predates the later observation');
  await f.advance();assert.equal(real.writes,3,'Later coarse activity must not be cleared by submitting the queued snapshot');
  assert.equal(decodeIndexingHistory(real.json).record.sessions[0].statistics.causes[C.causes.indexOf('known-file')],1);
  f.history.close();await tick();
});

test('canonical JSON equals Markdown payload and rejects unowned history without running serializers',async()=>{
  const f=fixture();f.history.start();await tick();const next=fixture(f.store,'0.4.3','0.4.3');next.history.start();await tick();
  const input={capturedAt:'2026-11-08T07:00:00.000Z',identity:{manifestVersion:'0.4.1',buildId:'0.4.2'},indexingHistory:next.history.snapshot()},capture=next.capture();
  const json=createDiagnosticJson(input,capture),wrapped=wrapDiagnosticJson(json),parsed=JSON.parse(json);
  assert.equal(wrapped.slice(wrapped.indexOf('```json\n')+8,-5),json);assert.equal(parsed.formatVersion,2);assert.deepEqual(parsed.plugin,{id:'k-plex',manifestVersion:'0.4.1',buildId:'0.4.2'});
  assert.equal(parsed.indexingActivity.settings.build,undefined);assert.equal(parsed.indexingHistory.previousSessions.length,1);assert.equal(parsed.indexingHistory.previousSessions[0].statistics.columns,undefined);
  assert(Buffer.byteLength(wrapped)<=SUPPORT_REPORT_BYTE_LIMIT);assert(json.includes('  "indexingHistory": {"schemaVersion"'));
  let calls=0;input.indexingHistory={toJSON(){calls++;throw Error('secret');}};assert.equal(JSON.parse(createDiagnosticJson(input)).indexingHistory.status,'unavailable');assert.equal(calls,0);
  f.history.close();next.history.close();await tick();
});

test('first strict readiness gets one early checkpoint; later boundaries retain the five-minute minimum',async()=>{
  const f=fixture();f.history.start();await tick();await f.advance(50);assert.equal(f.store.writes,1);
  f.recorder.mark('strict-ready');f.history.settled();f.history.settled();await tick();assert.equal(f.store.writes,2);
  assert.equal(decodeIndexingHistory(f.store.json).record.sessions[0].statistics.milestones[C.milestones.indexOf('strict-ready')],50);
  f.history.changed();f.history.background();f.history.settled();await tick();assert.equal(f.store.writes,2);
  await f.advance(INTERVAL-1);assert.equal(f.store.writes,2);await f.advance(1);assert.equal(f.store.writes,3);
  f.history.close();await tick();
});

test('stalled cache writers and throttled early failures survive quick reloads without repeated idle writes',async()=>{
  const store=memory(),f=fixture(store);const writer={phase:'pages',outcome:'running',errorName:'none',elapsedMs:0,pageChunks:2,evidenceChunks:0};
  f.setCache({pending:false,active:true,dueInMs:null,writer});f.history.start();await tick();writer.elapsedMs=INTERVAL;await f.advance();assert.equal(store.writes,2);
  writer.outcome='failed';writer.errorName='QuotaExceededError';f.setCache({pending:false,active:false,dueInMs:null,writer});
  f.recorder.cause('cache-failure');f.history.failed();f.history.failed();await tick();assert.equal(store.writes,3,'One immediate failure checkpoint, not one per notification');
  const row=decodeIndexingHistory(store.json).record.sessions[0];assert.equal(row.cache.writer.outcome,'failed');assert.equal(row.cache.writer.errorName,'QuotaExceededError');
  await f.advance();assert.equal(store.writes,3,'An unchanged settled failure does not cause idle writes');
  f.history.close();await tick();const next=fixture(store,'0.4.3','0.4.3');next.history.start();await tick();assert.equal(next.history.snapshot().previousSessions[0].cache.writer.errorName,'QuotaExceededError');next.history.close();await tick();
});

test('history cache receipts share current allowlists and never retain private exception or phase data',async()=>{
  const f=fixture();let calls=0;const writer={phase:'private-note',outcome:'failed',errorName:'private-error',elapsedMs:Infinity,pageChunks:-1,rawException:'private-token',toJSON(){calls++;assert.fail();}};
  Object.defineProperty(writer,'evidenceChunks',{get(){calls++;assert.fail();}});
  f.setCache({pending:'private-path',active:false,dueInMs:'private-duration',writer});f.history.start();await tick();
  assert.equal(calls,0);assert(!f.store.json.includes('private-'));const decoded=decodeIndexingHistory(f.store.json).record.sessions[0].cache;
  assert.equal(decoded.pending,null);assert.equal(decoded.writer.phase,'unavailable');assert.equal(decoded.writer.errorName,'unavailable');f.history.close();await tick();
});

test('bounded build grammar accepts local UTC identities and rejects private or impossible date strings',()=>{
  const validate=host.sourceModules.diagnosticBuildIdentity;
  for(const id of ['0.4.2','0.4.2+abcdef012345.dirty','0.4.2+source-archive','0.4.2+abcdef012345.local.20261108T070000000Z',
    '0.4.2-rc.1+source-archive.local.20240229T235959999Z'])assert.equal(validate(id),id);
  for(const id of ['0.4.2.local.20261108T070000000Z','0.4.2+abcdef012345.local.20260230T070000000Z',
    '0.4.2+abcdef012345.local.20261108T250000000Z','0.4.2+private-vault-name','x'.repeat(101),{toString(){assert.fail()}}])assert.equal(validate(id),null);
});

test('export pressure deterministically omits history without removing persisted rows or current failures',async()=>{
  const store=memory();
  for(let n=0;n<17;n++){const f=fixture(store,'0.4.'+n,'0.4.'+n);f.recorder.begin('full-build','global','manual');f.history.start();await tick();if(n<16){f.history.close();await tick();}}
  const f=fixture(store,'0.5.0','0.5.0');f.history.start();await tick();const prior=f.history.snapshot(),persisted=store.json;
  const input={capturedAt:'2026-11-08T07:00:00.000Z',indexingHistory:prior,
    indexReport:{hydration:{outcome:'failed',firstFailure:{reason:'read-error',phase:'pages',operation:'chunk'}}},
    environment:{activePluginsAvailability:'available',activePluginTotalCount:160,
      activePlugins:Array.from({length:160},(_,n)=>({kind:'community',id:'plugin-'+n,name:'Representative installed plugin '+('x'.repeat(60)),version:'1.2.3'}))}};
  const capture=f.capture(),first=createDiagnosticJson(input,capture),report=JSON.parse(first);
  assert.equal(createDiagnosticJson(input,capture),first);assert(Buffer.byteLength(wrapDiagnosticJson(first))<=SUPPORT_REPORT_BYTE_LIMIT);
  assert(report.truncation.historicalSessionsOmitted>0);assert.equal(report.indexingHistory.previousSessions.length+report.truncation.historicalSessionsOmitted,prior.previousSessions.length);
  assert.equal(report.index.hydration.outcome,'failed');assert.equal(report.index.hydration.firstFailure.reason,'read-error');
  assert.equal(store.json,persisted);assert.equal(decodeIndexingHistory(store.json).record.sessions.length,17);f.history.close();await tick();
});
