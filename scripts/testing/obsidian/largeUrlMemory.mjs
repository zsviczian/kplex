/**
 * Native #153 retained-heap/unload and display-flush diagnostic over the shared20k fixture.
 * Forced GC is outside replay and changes allocation conditions; these diagnostic runs do not
 * replace the elapsed comparison. Owns a bounded Chromium trace/debugger and clears its marks.
 * Only GC intervals/own markers survive trace delivery; no full trace, heap snapshot or vault
 * contents are saved. The shared fixture independently owns index/cache/window cleanup.
 */
import {runControlledProbe} from './controlledProbe.mjs';
import {largeUrlReplayScenario} from './largeUrlReplay.mjs';

/** Observe actual native GC/flushes, retained JS at fixed boundaries and collection of owned roots. */
async function scenario(app,c){
  const win=require('@electron/remote').getCurrentWindow(),debug=win.webContents.debugger;
  const events=[],markers=new Map(),traceMarks=new Map(),weak=[],memory={},prefix='kplex153_url_memory_'+Date.now()+'_';
  let owned=false,tracing=false,dropped=0,finish;const complete=new Promise(/** Resolve only after all native trace chunks are delivered. */resolve=>{finish=resolve;});
  /** Missing capabilities/trace loss fail this diagnostic rather than substituting weaker evidence. */
  const check=(value,message)=>{if(!value)throw Error(message);};
  /** Bound CDP responses and trace completion; retire every timer independently. */
  const bounded=async(promise,label)=>{let timer;try{return await Promise.race([promise,new Promise(/** Own one diagnostic timeout, never production scheduling. */(_,reject)=>{timer=window.setTimeout(/** Stop a missing response without leaving the controller waiting indefinitely. */()=>reject(Error('Diagnostic deadline: '+label)),20000);})]);}finally{if(timer!==undefined)window.clearTimeout(timer);}};
  /** Preserve the documented optional CDP argument and its native response. */
  const command=(method,parameters)=>bounded(parameters===undefined?debug.sendCommand(method):debug.sendCommand(method,parameters),method);
  /** Let completed async frames and WeakRef keep-alive jobs finish before collection. */
  const task=()=>new Promise(/** This short yield belongs only to the diagnostic. */done=>window.setTimeout(done,50));
  /** Calibrate trace timestamps using actual user marks, with a bounded synchronous read span. */
  const mark=label=>{const name=prefix+label,before=performance.timeOrigin+performance.now();performance.mark(name);const after=performance.timeOrigin+performance.now();check(after-before<5,'Bounded marker clock span');markers.set(name,{epochMs:(before+after)/2,spanMs:after-before});};
  /** Filter on delivery: unrelated trace payloads/arguments never enter retained observations. */
  const onMessage=(_event,method,params)=>{
    if(method==='Tracing.tracingComplete'){finish(params);return;}
    if(method!=='Tracing.dataCollected')return;
    for(const event of params.value){
      if(event.name?.startsWith(prefix)){traceMarks.set(event.name,{ts:event.ts,pid:event.pid,tid:event.tid});continue;}
      if(!event.name?.startsWith('V8.GC')||event.ph!=='X')continue;
      if(events.length>=8192){dropped++;continue;}
      events.push({name:event.name,ts:event.ts,dur:event.dur,pid:event.pid,tid:event.tid});
    }
  };
  /** Finish only this acquired trace and validate bounded native buffer delivery. */
  const stopTrace=async()=>{if(!tracing)return;await command('Tracing.end');const result=await bounded(complete,'Trace delivery');tracing=false;check(!result.dataLossOccurred&&dropped===0,'Complete bounded trace without dropped GC intervals');};
  /** Collect outside replay, measuring actual renderer JS bytes and current process KB, never peak. */
  const snapshot=async label=>{c.progress={phase:label};await task();mark(label+'_begin');await command('HeapProfiler.collectGarbage');mark(label+'_end');await task();const heap=await command('Runtime.getHeapUsage'),processMemoryKb=await process.getProcessMemoryInfo();check(Number.isFinite(heap.usedSize),'Native CDP heap bytes');return{heap,processMemoryKb};};
  try{
    check(app.vault.getName()==='kplex-test'&&process.type==='renderer','Exact authorized renderer required');
    check(!debug.isAttached(),'Another debugger owns this renderer');debug.attach('1.3');owned=true;
    const identity=await command('Runtime.evaluate',{expression:'window.app?.vault?.getName()',returnByValue:true});check(!identity.exceptionDetails&&identity.result?.value===app.vault.getName(),'CDP default realm must be this vault');
    debug.on('message',onMessage);
    await command('Tracing.start',{transferMode:'ReportEvents',traceConfig:{recordMode:'recordUntilFull',traceBufferSizeInKb:8192,includedCategories:['v8','blink.user_timing'],excludedCategories:['*']}});tracing=true;
    c.trials=[false];c.flushDiagnostics=true;
    c.memory={
      /** The empty actual index/cache is ready; retained mode collects before API/heartbeat observation. */
      async beforeRestore(){if(urlMemoryMode==='retained')memory.before=await snapshot('gc-before-restore');else{c.progress={phase:'unforced-before-restore'};memory.before={heap:await command('Runtime.getHeapUsage'),processMemoryKb:await process.getProcessMemoryInfo()};}mark('replay-start');},
      /** Keep the validated graph live at collection, while retaining only weak ownership handles. */
      async afterRestore(index){mark('replay-end');for(const[name,value]of Object.entries({index,cache:index.indexedDb,workingPages:index.urlState.pages,workingEvidence:index.urlState.evidence,publishedPages:index.publishedUrlState.pages,publishedEvidence:index.publishedUrlState.evidence,originAdjacency:index.urlState.pages.get('https://example.com')?.neighbours,aliasOwners:index.urlAliasOwners,aliasFacets:index.urlAliasFacets,publishedTargets:index.urlPublishedTargets}))if(value&&typeof value==='object')weak.push({name,ref:new WeakRef(value)});memory.live=await snapshot('gc-live-graph');},
    };
    const result=await largeUrlReplayScenario(app,c);
    // The fixture's finally has destroyed/purged its resources. Drop its cleanup closure, which
    // otherwise intentionally retains its closed-index array, before testing actual collection.
    delete c.cleanup;delete c.memory;c.index=null;
    memory.disposed=await snapshot('gc-after-disposal');await task();await command('HeapProfiler.collectGarbage');await task();
    memory.collected=weak.map(/** Inspect only after collection; deref keeps a survivor alive until this job ends. */({name,ref})=>({name,collected:ref.deref()===undefined}));
    c.progress={phase:'unload-collection',memory};check(memory.collected.every(/** Remaining owned roots fail unload acceptance. */entry=>entry.collected),'Owned isolated index/containers must be collected');
    await stopTrace();
    const start=traceMarks.get(prefix+'replay-start'),end=traceMarks.get(prefix+'replay-end');
    check(start&&end&&start.pid===process.pid&&end.pid===start.pid&&end.tid===start.tid,'Exact renderer/main-thread trace marks');
    const offset=markers.get(prefix+'replay-start').epochMs-start.ts/1000,endOffset=markers.get(prefix+'replay-end').epochMs-end.ts/1000;
    memory.clock={offsetMs:offset,driftMs:endOffset-offset};check(Math.abs(memory.clock.driftMs)<5,'Trace clock alignment stable across replay');
    const interval=c.replayWindow;check(interval&&interval.endEpoch>=interval.startEpoch,'Exact replay API interval');
    const nativeGc=events.filter(/** Only complete intervals on this renderer thread can explain its heartbeat. */event=>event.pid===start.pid&&event.tid===start.tid&&Number.isFinite(event.dur)).map(/** Trace microseconds become calibrated renderer milliseconds. */event=>({name:event.name,startEpoch:event.ts/1000+offset,durationMs:event.dur/1000}));
    const calibrationLabel=urlMemoryMode==='retained'?'gc-before-restore':'gc-live-graph',calibrationBegin=markers.get(prefix+calibrationLabel+'_begin').epochMs,calibrationEnd=markers.get(prefix+calibrationLabel+'_end').epochMs;
    check(nativeGc.some(/** Verify actual browser GC around the deliberate pre-collection, not Node observer availability. */event=>event.name==='V8.GCCompactor'&&event.startEpoch>=calibrationBegin-5&&event.startEpoch<=calibrationEnd),'Actual forced Chromium GC captured');
    const replayGc=nativeGc.filter(/** Keep overlapping intervals; nested scopes may overlap and must never be summed as exclusive CPU. */event=>event.startEpoch<=interval.endEpoch&&event.startEpoch+event.durationMs>=interval.startEpoch).map(/** Align GC with bounded flush/heartbeat receipts, omitting all trace payloads. */({startEpoch,...event})=>({...event,atMs:startEpoch-interval.startEpoch}));
    memory.retainedDeltaBytes=urlMemoryMode==='retained'?memory.live.heap.usedSize-memory.before.heap.usedSize:null;
    memory.afterDisposalDeltaBytes=urlMemoryMode==='retained'?memory.disposed.heap.usedSize-memory.before.heap.usedSize:null;
    return{...result,mode:urlMemoryMode,memory,replayGc,replayWindow:interval,trace:{bufferKb:8192,dataLoss:false,gcIntervals:events.length,markerCount:traceMarks.size},limitations:'Retained mode: post-GC live-minus-empty renderer JS delta. Unforced mode: no pre-replay collection and no retained delta claim. Current process metrics KB are not peak. Single replay/no early retained map. Complete Chromium GC scopes on this renderer thread can overlap; do not sum nested durations or equate GC with exclusive compiler CPU. Collection/tracing changes conditions; prior elapsed/paint/mobile/long-session acceptance is separate. Disposal releases fixture bookkeeping, so its heap delta need not be zero.'};
  }finally{
    try{if(tracing)await stopTrace();}finally{for(const name of markers.keys())performance.clearMarks(name);debug.removeListener('message',onMessage);delete c.memory;delete c.cleanup;if(owned&&debug.isAttached())debug.detach();}
  }
}

const mode=process.env.KPLEX_URL_MEMORY_MODE??'retained';
if(!['retained','unforced'].includes(mode))throw Error('KPLEX_URL_MEMORY_MODE must be retained or unforced');
await runControlledProbe('large-url-memory',scenario,`const urlMemoryMode=${JSON.stringify(mode)};const largeUrlReplayScenario=${largeUrlReplayScenario.toString()};`,['src/core/graph/evidence.ts','src/index/IndexedDbCache.ts',...(process.env.KPLEX_PROBE_BASELINE_REF?[]:['src/index/UrlAdjacencyMap.ts'])],{maximumMs:900000});
