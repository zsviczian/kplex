/**
 * Native #153 URL-container allocation gate over the shared preserved20k fixture. Counts actual
 * working wrappers, captured bases and separate delta Maps after the replay API has completed.
 * An installed wrapper constructor and native Map control then retain identical numeric entries
 * in separate post-GC lifetimes. Those component bytes include every wrapper field, not just its
 * second Map, and do not predict an implementation's savings or whole-plugin/process peak.
 * Owns its debugger, bounded commands, temporary roots and cleanup; no heap snapshot is saved.
 */
import {runControlledProbe} from './controlledProbe.mjs';
import {largeUrlReplayScenario} from './largeUrlReplay.mjs';

/** Measure representation counts and native component heap outside actual URL replay observation. */
async function scenario(app,c){
  const observation={heapRows:[]};let roots=null;
  /** Fail a missing capability or lifetime proof rather than replacing it with estimated bytes. */
  const check=(value,message)=>{if(!value)throw Error(message);};
  /** Release native callback/WeakRef keep-alive jobs; this is diagnostic pacing only. */
  const task=(ms=0)=>new Promise(/** Own one cancellable diagnostic task at a time. */done=>window.setTimeout(done,ms));
  c.trials=[false];
  c.memory={
    /** The replay is complete and its index remains live while representation and component bytes are observed. */
    async afterRestore(index){
      const originMap=index.urlState.pages.get('https://example.com')?.neighbours,Ctor=originMap?.constructor;
      check(Ctor&&Ctor!==Map,'Installed private URL wrapper constructor');
      const nativeSize=Object.getOwnPropertyDescriptor(Map.prototype,'size').get,wrappers=new Set(),locals=new Set();
      const storage={workingPages:index.urlState.pages.size,urlPages:0,nativeDocumentMaps:0,uniqueWrappers:0,separateDeltaMaps:0,logicalEntries:0,nativeBackingEntries:0,localEntries:0,maximumDepth:0,degrees:{zero:0,one:0,two:0,threeToEight:0,nineTo256:0,over256:0}};
      for(const page of index.urlState.pages.values()){
        if(!page.url){storage.nativeDocumentMaps++;continue;}
        storage.urlPages++;const map=page.neighbours;check(map instanceof Ctor,'One installed URL adjacency owner');
        const size=map.size;storage.logicalEntries+=size;storage.maximumDepth=Math.max(storage.maximumDepth,map.depth);
        const bucket=size===0?'zero':size===1?'one':size===2?'two':size<=8?'threeToEight':size<=256?'nineTo256':'over256';storage.degrees[bucket]++;
        let layer=map,depth=0;
        while(layer){check(++depth<=32,'Bound captured private history');if(wrappers.has(layer))break;wrappers.add(layer);storage.nativeBackingEntries+=nativeSize.call(layer);
          const local=Object.getOwnPropertyDescriptor(layer,'local')?.value;
          if(local){check(nativeSize.call(layer)===0,'Separate delta leaves the native wrapper backing empty');locals.add(local);storage.localEntries+=nativeSize.call(local);}
          layer=layer.base;
        }
        if((storage.urlPages&255)===0)await task();
      }
      storage.uniqueWrappers=wrappers.size;storage.separateDeltaMaps=locals.size;observation.storage=storage;wrappers.clear();locals.clear();
      const debug=require('@electron/remote').getCurrentWindow().webContents.debugger;
      check(!debug.isAttached(),'Another debugger owns this renderer');let owned=false;
      /** Preserve native CDP results and retire this command's timeout on success or failure. */
      const command=async(method)=>{let timer;try{return await Promise.race([debug.sendCommand(method),new Promise(/** Bound diagnostic transport without changing production deadlines. */(_,reject)=>{timer=window.setTimeout(/** Surface an unresponsive native command. */()=>reject(Error('Storage diagnostic command deadline: '+method)),20000);})]);}finally{if(timer!==undefined)window.clearTimeout(timer);}};
      /** Sample actual renderer JS after collection; the live real graph is the same background in each component lifetime. */
      const heap=async()=>{await task(50);await command('HeapProfiler.collectGarbage');await task(50);const result=await command('Runtime.getHeapUsage');check(Number.isFinite(result.usedSize),'Native renderer heap bytes');return result.usedSize;};
      try{
        debug.attach('1.3');owned=true;
        for(const entries of [0,1,2,8])for(let round=1;round<=3;round++)for(const kind of round%2?['native','wrapper']:['wrapper','native']){
          check(!c.closed,'Storage controller current');c.progress={phase:'component-retained-heap',entries,round,kind};
          const before=await heap(),count=16384;roots=new Array(count);
          for(let n=0;n<count;n++){const map=kind==='wrapper'?new Ctor():new Map();for(let k=0;k<entries;k++)map.set(k,k);roots[n]=map;if((n&255)===255)await task();}
          const live=await heap(),weak=new WeakRef(roots);roots=null;await task(50);await heap();await task(50);check(weak.deref()===undefined,'Component root array collected');
          observation.heapRows.push({entries,round,kind,count,beforeBytes:before,liveBytes:live,retainedBytes:live-before,rootsCollected:true});
        }
      }finally{roots=null;if(owned&&debug.isAttached())debug.detach();}
    },
  };
  try{const result=await largeUrlReplayScenario(app,c);return{...result,...observation,limits:'Actual working URL representation counts plus isolated post-GC component bytes for identical numeric entries. Wrapper/native difference includes all metadata and separate storage, not an exact proposed saving. Setup/component allocation is outside replay timing. No full-plugin/process peak/paint/device claim.'};}
  finally{roots=null;delete c.memory;delete c.cleanup;}
}

await runControlledProbe('large-url-storage',scenario,`const largeUrlReplayScenario=${largeUrlReplayScenario.toString()};`,['src/index/UrlAdjacencyMap.ts'],{maximumMs:900000});
