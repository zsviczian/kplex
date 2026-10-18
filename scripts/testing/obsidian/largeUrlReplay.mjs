/**
 * Native #153 scale gate: reconstruct actual cached URL owners from the authorized20k-note vault.
 * Each isolated installed index receives current real cache facts in its own disposable namespace;
 * actual vault files/cache are never removed. Counted origin iteration/display work stays separate
 * from low-instrumentation elapsed trials. Production five-second publication pacing is retained.
 * Optional test-owned hooks observe retained memory outside the API interval; importing this
 * fixture performs no native work. Its direct CLI retains the original two-lifetime experiment.
 */
import {runControlledProbe} from './controlledProbe.mjs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

/** Observe real warm URL restore plus current-owner validation, with explicit owned-cache cleanup. */
export async function largeUrlReplayScenario(app,c){
  const p=app.plugins.plugins['k-plex'],origin='https://example.com',crypto=require('node:crypto'),rows=[],indexes=[],caches=[];
  /** Failed prerequisites retain independent cleanup rather than weakening a source/cache fence. */
  const check=(value,message)=>{if(!value)throw Error(message);};
  check(p&&app.vault.getName()==='kplex-test','Use the authorized large vault');
  const files=app.vault.getMarkdownFiles();check(files.length>=20000&&files.length<=30000,'Expected preserved20k fixture');
  const captured=new Map(files.map(/** Capture exact current incarnations and physical facts outside observation. */file=>[file.path,{file,mtime:file.stat.mtime,size:file.stat.size,ctime:file.stat.ctime}]));
  let changed=false;
  const eventRefs=[];
  /** Per-cursor and storage callbacks use a scalar event/lifetime fence, never another vault scan. */
  const current=()=>!c.closed&&!changed;
  /** Exact physical inventory checks run only at defined setup/end boundaries outside elapsed time. */
  const physicalCurrent=()=>current()&&files.every(/** Same-stat recreation is rejected by exact live identity. */file=>{const fact=captured.get(file.path);return fact&&app.vault.getFileByPath(file.path)===file&&file.stat.mtime===fact.mtime&&file.stat.size===fact.size&&file.stat.ctime===fact.ctime;});
  /** Bounded setup polling does not change production scheduling or watchdogs. */
  const until=async(predicate)=>{const end=performance.now()+60000;while(!predicate()){check(!c.closed&&performance.now()<end,'Large URL setup deadline');await new Promise(/** Own just this setup wait. */done=>window.setTimeout(done,50));}};
  /** Primary URL/source work must not compete with the isolated measured instance. */
  const primaryIdle=()=>p.getIndexStatus().upToDate&&!p.index.building&&!p.index.urlDiscoveryRunning&&!p.index.urlPendingPublications&&!p.index.urlOwnerTasks.size&&!p.index.urlCacheWrites.size&&!p.index.sourceAcquisition.inventory;
  const remote=require('@electron/remote'),win=remote.getCurrentWindow(),previous={bounds:win.getBounds(),maximized:win.isMaximized(),minimized:win.isMinimized()};
  /** Visibility and primary quiescence are observations, never disabled throttling. */
  const foreground=()=>({hidden:document.hidden,documentFocused:document.hasFocus(),windowFocused:win.isFocused(),throttling:win.webContents.getBackgroundThrottling(),primaryIdle:primaryIdle()});
  /** Stream ordered values once outside elapsed observation; constructor property order is not relation order. */
  const digestState=state=>{const hash=crypto.createHash('sha256');for(const [path,page]of state.pages){const neighbours=[...page.neighbours].map(/** Preserve exact endpoint/key order and every relation value without cycles. */([key,{target,...relation}])=>[key,{targetPath:target.path,values:Object.fromEntries(Object.entries(relation).sort(/** Normalize only object property enumeration. */([a],[b])=>a.localeCompare(b)))}]);hash.update(JSON.stringify({path,name:page.name,url:page.url,aliases:page.aliases,tags:page.tags,styleTags:page.styleTags,neighbours})+'\n');}for(const record of state.evidence.declarations())hash.update(JSON.stringify(record)+'\n');return hash.digest('hex');};
  let active=false,visibilityLost=false,restore=[],progressTimer,heartbeatTimer;
  /** Reject an occluded or unfocused interval even when both endpoint samples look valid. */
  const onVisibility=()=>{if(active&&document.hidden)visibilityLost=true;};
  /** Focus loss during an unattended trial invalidates its native foreground comparison. */
  const onBlur=()=>{if(active)visibilityLost=true;};
  const operations={reads:0,parses:0};
  const namespacePrefix='__kplex153_scale_url_'+Date.now();
  /** One close failure must not prevent another owned namespace from being retired. */
  const close=async()=>{active=false;const errors=[];document.removeEventListener('visibilitychange',onVisibility);window.removeEventListener('blur',onBlur);if(progressTimer!==undefined)window.clearInterval(progressTimer);if(heartbeatTimer!==undefined)window.clearInterval(heartbeatTimer);for(const ref of eventRefs)try{app.vault.offref(ref);}catch(error){errors.push(String(error));}for(const undo of restore.reverse())try{undo();}catch(error){errors.push(String(error));}restore=[];for(const i of indexes)try{i.destroy();}catch(error){errors.push(String(error));}for(const cache of caches)try{check(cache.vaultName.startsWith(namespacePrefix)&&cache.vaultName!==app.vault.getName(),'Cache ownership');check(await cache.purgeAndClose(),'Owned scale cache purge');}catch(error){errors.push(String(error));}try{win.setBounds(previous.bounds);if(previous.maximized)win.maximize();if(previous.minimized)win.minimize();}catch(error){errors.push(String(error));}c.index=null;if(errors.length)throw Error('Scale cleanup: '+errors.join('; '));};
  c.cleanup=close;
  try{
    document.addEventListener('visibilitychange',onVisibility);window.addEventListener('blur',onBlur);
    const area=remote.screen.getDisplayMatching(previous.bounds).workArea;
    remote.app.show?.();remote.app.focus({steal:true});win.restore();win.setBounds({x:area.x+40,y:area.y+40,width:Math.min(1600,area.width-80),height:Math.min(1000,area.height-80)});win.show();win.moveTop();win.focus();
    c.progress={phase:'foreground-preflight'};await until(/** Confirm actual renderer visibility before any cache setup or measured work. */()=>!document.hidden&&document.hasFocus()&&win.isFocused());
    for(const name of ['create','modify','delete','rename'])eventRefs.push(app.vault.on(name,/** Any actual source event invalidates the fixed corpus, including equal-stat edits. */()=>{changed=true;}));
    c.progress={phase:'primary-quiescence'};await until(primaryIdle);check(physicalCurrent(),'Physical fixture current');
    const inventoryHash=crypto.createHash('sha256');for(const [path,fact]of [...captured].sort(/** Physical fingerprint order is independent of filesystem enumeration. */([a],[b])=>a.localeCompare(b)))inventoryHash.update(JSON.stringify([path,fact.mtime,fact.size,fact.ctime])+'\n');
    const trials=c.trials??[true,false];check(Array.isArray(trials)&&trials.length>0&&trials.length<=2&&trials.every(/** Only the existing counted/unwrapped lifetimes may be selected. */value=>typeof value==='boolean'),'Bounded replay lifetimes');
    for(const observe of trials){
      const namespace=namespacePrefix+'_'+rows.length;
      const vault=new Proxy(app.vault,{/** Override only private cache naming and source-call observation; all native identities stay real. */get(target,key){if(key==='getName')return /** No new vault directory is created. */()=>namespace;const value=Reflect.get(target,key,target);if(key==='read'||key==='cachedRead')return /** Count actual measured body reads, preserving their promise. */(...args)=>{if(active)operations.reads++;return value.apply(target,args);};return typeof value==='function'?value.bind(target):value;}});
      const host=new Proxy(app,{/** Retired localStorage cleanup has no payload in this owned namespace. */get(target,key){if(key==='vault')return vault;if(key==='saveLocalStorage')return /** Preserve actual vault legacy data. */()=>undefined;const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}});
      const settings=structuredClone(p.settings);settings.indexingMode='on-demand';const plugin={app:host,settings,manifest:{...p.manifest,dir:undefined},getIndexSourceRevision:/** Forward the actual physical event owner. */()=>p.getIndexSourceRevision(),notifyStartupProgress:/** Preserve native notification capability. */()=>p.notifyStartupProgress()};
      const i=new p.index.constructor(plugin,host),cache=i.indexedDb;indexes.push(i);caches.push(cache);c.index=i;
      let seeded=0,urls=0;const seen=new Set(),seedHash=crypto.createHash('sha256'),seedAt=performance.now();
      c.progress={phase:'copy-current-url-facts',seeded:0,total:files.length};
      check(await p.index.indexedDb.readUrlOwners(/** Copy only current real records; each bounded page is committed before release. */async records=>{
        for(const record of records){const fact=captured.get(record.path);check(fact&&app.vault.getFileByPath(record.path)===fact.file&&record.mtime===fact.mtime&&record.size===fact.size&&!seen.has(record.path),'Exact current unique URL fact');seen.add(record.path);seedHash.update(JSON.stringify(record)+'\n');urls+=record.urls.length;}
        check(await cache.putUrlOwners(records,/** Validate only this at-most64-record page at transaction-open, not all20k files. */()=>current()&&records.every(/** Exact captured physical source remains current. */record=>{const fact=captured.get(record.path);return fact&&app.vault.getFileByPath(record.path)===fact.file&&fact.file.stat.mtime===fact.mtime&&fact.file.stat.size===fact.size&&fact.file.stat.ctime===fact.ctime;})),'Copy real URL facts');seeded+=records.length;c.progress={phase:'copy-current-url-facts',seeded,total:files.length};
      },current,/** Test-only copying is untimed and yields between bounded pages without borrowing primary P4 pacing. */()=>new Promise(/** Release this setup task before the next page; measured replay keeps its production scheduler. */done=>window.setTimeout(done,0))),'Source URL cache available');
      check(seeded===files.length&&seen.size===files.length&&current(),'Complete source URL cache');seen.clear();const seedDigest=seedHash.digest('hex'),seedMs=performance.now()-seedAt;
      const parse=i.metadataParser.parse;i.metadataParser.parse=/** Warm URL reconstruction must not parse bodies. */function(...args){if(active)operations.parses++;return parse.apply(this,args);};restore.push(/** Restore this exact instance parser. */()=>{i.metadataParser.parse=parse;});
      const publish=i.publishUrlOwner,flush=i.flushUrlPublication;let flushing=false,workingEntries=0,displayEntries=0,retained,replayAt=0;const flushTimings=[];
      /** Restore one owned iterator property without calling a retired map's read operations. */
      const releaseIterator=(map,own)=>{if(map){if(own)Object.defineProperty(map,Symbol.iterator,own);else delete map[Symbol.iterator];}};
      if(observe){
        i.publishUrlOwner=/** Selected origin only; return the original publication promise unchanged. */function(...args){const map=this.urlState.pages.get(origin)?.neighbours,own=map&&Object.getOwnPropertyDescriptor(map,Symbol.iterator),iterator=map?.[Symbol.iterator];if(map)map[Symbol.iterator]=/** Attribute actual selected-origin iterator visits during private publication. */function*(){for(const entry of iterator.call(this)){if(!flushing)workingEntries++;yield entry;}};let result;try{result=publish.apply(this,args);}catch(error){releaseIterator(map,own);throw error;}result.then(/** Success retires only this temporary method. */()=>releaseIterator(map,own),/** Failure must also release the selected map. */()=>releaseIterator(map,own));return result;};
        i.flushUrlPublication=/** Observe the current selected origin at the actual production display flush. */function(...args){const map=this.urlState.pages.get(origin)?.neighbours,own=map&&Object.getOwnPropertyDescriptor(map,Symbol.iterator),iterator=map?.[Symbol.iterator];if(map)map[Symbol.iterator]=/** Count logical entries emitted for display, including private map flattening. */function*(){for(const entry of iterator.call(this)){displayEntries++;yield entry;}};flushing=true;try{return flush.apply(this,args);}finally{flushing=false;releaseIterator(map,own);if(!retained){const page=this.publishedUrlState.pages.get(origin);if(page?.neighbours.size)retained={map:page.neighbours,aliases:page.aliases,entries:JSON.stringify([...page.neighbours].map(/** Retain one early map only; target metadata may advance by its documented contract. */([key,{target,...relation}])=>[key,{...relation,targetPath:target.path}])),aliasValue:JSON.stringify(page.aliases)};}}};
        restore.push(/** Exact owner methods are restored before any final digest or cleanup. */()=>{i.publishUrlOwner=publish;i.flushUrlPublication=flush;});
      }
      if(c.flushDiagnostics){
        check(!observe,'Flush attribution uses an unwrapped working/publication lifetime');
        let currentFlush;
        for(const name of ['publishUrlSearch','patchSearchIndex','emitPresentation']){const original=i[name];check(typeof original==='function','Existing flush attribution owner: '+name);i[name]=/** Observe a coarse synchronous owner only inside an actual display flush, preserving its return. */function(...args){if(!active||!currentFlush)return original.apply(this,args);const start=performance.now(),row=currentFlush;try{return original.apply(this,args);}finally{row[name]=(row[name]??0)+performance.now()-start;}};restore.push(/** Restore this exact method before digest/disposal. */()=>{i[name]=original;});}
        i.flushUrlPublication=/** Time only the synchronous native flush, excluding observations and retained-map serialization. */function(...args){const count=this.urlPresentationFlushes,paths=this.pendingUrlPaths.size,owners=this.pendingUrlOwners.size,start=performance.now(),parts={},previous=currentFlush;currentFlush=parts;try{return flush.apply(this,args);}finally{const durationMs=performance.now()-start;currentFlush=previous;if(active&&this.urlPresentationFlushes!==count)flushTimings.push({atMs:start-replayAt,durationMs,paths,owners,originDegree:this.urlState.pages.get(origin)?.neighbours.size??0,parts});}};
        restore.push(/** This diagnostic owns only the exact instance's flush method. */()=>{i.flushUrlPublication=flush;});
      }
      await until(primaryIdle);await c.memory?.beforeRestore?.(i);await until(primaryIdle);const before=foreground();check(!before.hidden&&before.documentFocused&&before.windowFocused&&before.throttling,'Actual foreground before replay');check(physicalCurrent(),'Stable source before replay');operations.reads=0;operations.parses=0;
      let last=performance.now();const heartbeat={samples:0,largestGapMs:0,heapBefore:performance.memory?.usedJSHeapSize,observedHeapPeak:performance.memory?.usedJSHeapSize};
      if(c.flushDiagnostics)heartbeat.gaps=[];
      if(observe||c.flushDiagnostics)heartbeatTimer=window.setInterval(/** Aggregate event-loop/heap samples are not actual paint or retained-heap acceptance. */()=>{const now=performance.now();if(active){const gapMs=now-last;heartbeat.samples++;heartbeat.largestGapMs=Math.max(heartbeat.largestGapMs,gapMs);heartbeat.observedHeapPeak=Math.max(heartbeat.observedHeapPeak??0,performance.memory?.usedJSHeapSize??0);if(c.flushDiagnostics&&gapMs>=32&&(heartbeat.gaps.length<8||gapMs>heartbeat.gaps.at(-1).gapMs)){heartbeat.gaps.push({fromMs:last-replayAt,toMs:now-replayAt,gapMs});heartbeat.gaps.sort(/** Retain only eight largest observed gaps, without a per-owner trace. */(a,b)=>b.gapMs-a.gapMs);heartbeat.gaps.length=Math.min(heartbeat.gaps.length,8);}}last=now;},16);
      progressTimer=window.setInterval(/** Publish cheap aggregate progress without logging content or rescanning the vault. */()=>{c.progress={phase:'restore-and-validate',observe,restored:i.urlRestoredOwners,total:files.length,pages:i.urlState.pages.size,flushes:i.urlPresentationFlushes};},1000);
      visibilityLost=false;active=true;const at=performance.now();last=at;replayAt=at;if(c.flushDiagnostics)c.replayWindow={startEpoch:performance.timeOrigin+at};const complete=await i.startBackgroundUrlIndex(),end=performance.now(),elapsedMs=end-at;if(c.flushDiagnostics)c.replayWindow.endEpoch=performance.timeOrigin+end;
      if(observe||c.flushDiagnostics)heartbeat.largestGapMs=Math.max(heartbeat.largestGapMs,end-last);active=false;heartbeat.heapAfter=performance.memory?.usedJSHeapSize;window.clearInterval(progressTimer);progressTimer=undefined;if(heartbeatTimer!==undefined)window.clearInterval(heartbeatTimer);heartbeatTimer=undefined;
      if(c.flushDiagnostics&&end-last>=32){heartbeat.gaps.push({fromMs:last-replayAt,toMs:end-replayAt,gapMs:end-last});heartbeat.gaps.sort(/** The terminal interval matters even if no heartbeat callback ran before API completion. */(a,b)=>b.gapMs-a.gapMs);heartbeat.gaps.length=Math.min(heartbeat.gaps.length,8);}
      for(const undo of restore.reverse())undo();restore=[];
      check(!visibilityLost,'Continuous native visibility/focus');check(complete&&i.urlDiscoveryComplete&&i.urlOwners.size===files.length&&i.urlRestoredOwners===files.length,'Complete exact cached URL owner closure');check(operations.reads===0&&operations.parses===0,'No body work in warm replay');check(!i.urlPendingPublications&&!i.urlOwnerTasks.size&&!i.urlCacheWrites.size&&!i.urlReadActive&&!i.urlReadWaiters.length,'All measured URL work drained');
      for(const page of i.urlState.pages.values())for(const [key,relation]of page.neighbours)check(relation.target===i.urlState.pages.get(key),'Canonical working target');
      if(retained){check(JSON.stringify([...retained.map].map(/** Compare exact retained relation values, excluding cyclic target objects. */([key,{target,...relation}])=>[key,{...relation,targetPath:target.path}]))===retained.entries&&JSON.stringify(retained.aliases)===retained.aliasValue,'Retained display map/alias arrays unchanged');retained=null;}
      const workingDigest=digestState(i.urlState),displayDigest=digestState(i.publishedUrlState);await c.memory?.afterRestore?.(i);const after=foreground();check(physicalCurrent(),'Physical fixture unchanged');check([before,after].every(/** Timing requires real foreground and unrelated primary work idle. */v=>!v.hidden&&v.documentFocused&&v.windowFocused&&v.throttling&&v.primaryIdle),'Quiet native foreground');
      rows.push({observe,...(observe?{workingEntries,displayEntries,heartbeat}:{elapsedMs}),...(c.flushDiagnostics?{flushTimings,heartbeat}:{}),seedMs,seeded,urls,seedDigest,operations:{...operations},pages:i.urlState.pages.size,declarations:i.urlState.evidence.declarationCount,originDegree:i.urlState.pages.get(origin)?.neighbours.size,flushes:i.urlPresentationFlushes,workingDigest,displayDigest,before,after});c.progress={phase:'trial-complete',rows};i.destroy();c.index=null;check(await cache.purgeAndClose(),'Retire completed owned cache');
    }
    check(rows.every(/** Different observer/display cadence cannot change final graph values or source facts. */row=>row.seedDigest===rows[0].seedDigest&&row.workingDigest===rows[0].workingDigest&&row.displayDigest===rows[0].displayDigest),'Independent replay equivalence');
    return{files:files.length,physicalDigest:inventoryHash.digest('hex'),runtime:{node:process.versions.node,electron:process.versions.electron,chrome:process.versions.chrome,platform:process.platform},rows,limits:'Actual cached URL facts/real files, new namespace per isolated installed index. Warm URL reconstruction+owner closure, not full plugin startup/ordinary graph/source authority. Production five-second display cadence unchanged; instrumented runs can alter elapsed cadence and are work receipts only. Heap is unforced process sampling, not retained/peak/mobile acceptance.'};
  }finally{await close();}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await runControlledProbe('large-url-replay',largeUrlReplayScenario,'',['src/core/graph/evidence.ts','src/index/IndexedDbCache.ts',...(process.env.KPLEX_PROBE_BASELINE_REF?[]:['src/index/UrlAdjacencyMap.ts'])],{maximumMs:900000});
