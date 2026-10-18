/**
 * Bounded native URL update/retirement retention exercise using the existing small-vault fixture.
 * Real file edits alternate two fixed512-target sets through the installed refreshUrlOwner path.
 * Structural/eligibility checks run each revision; post-GC heap/weak handles sample defined epochs
 * outside publication. Whole-renderer heap includes the primary index and is not an isolated
 * allocation, latency, process-peak or hours-long/mobile result. Owns debugger/listeners/fixture
 * cleanup, retains failures, and never changes production scheduling, settings or watchdogs.
 */
import assert from 'node:assert/strict';
import {runControlledProbe} from './controlledProbe.mjs';
import {nativeUrlFixture} from './nativeUrlFixture.mjs';

/** Exercise actual source replacements and collect only counts/weak ownership after each settled epoch. */
async function scenario(app,c){
  const p=app.plugins.plugins['k-plex'],origin='https://retention.example',targets=512,originalMarkdown=app.vault.getMarkdownFiles().length,samples=[],publishedMaps=[],seenMaps=new WeakSet();
  let fixture,debug,ownedDebugger=false,visibilityLost=false;const originalFileCount=app.vault.getFiles().length;
  /** Keep failure and cancellation visible rather than accepting stale facts or extending a deadline. */
  const check=(value,message)=>{if(!value)throw Error(message);};
  /** Diagnostic yields release WeakRef keep-alive jobs and do not alter production pacing. */
  const task=(ms=50)=>new Promise(/** Own one short native task. */resolve=>window.setTimeout(resolve,ms));
  /** Every wait retains the existing sixty-second setup bound and the outer controller fence. */
  const until=async(predicate,label)=>{const end=performance.now()+60000;while(!predicate()){check(!c.closed&&performance.now()<end,label);await task();}};
  /** Fixed endpoint cardinality distinguishes revision retention from growing vocabulary. */
  const mode=step=>step%2?'bravo':'alpha';
  /** Own actual Markdown input, including a metadata stamp observable after native parsing. */
  const text=step=>{const name=mode(step),lines=['---','kplex153Cycle: '+step,'---'];for(let n=0;n<targets;n++){const key=String(n).padStart(4,'0');lines.push('[retention-'+name+'-token-'+key+']('+origin+'/'+name+'/'+key+')');}return lines.join('\n');};
  /** Reject hidden or blurred work without disabling host background throttling. */
  const onVisibility=()=>{if(document.hidden)visibilityLost=true;};
  /** A foreground-loss event invalidates this exercise even if final samples look focused. */
  const onBlur=()=>{visibilityLost=true;};
  /** The primary observes real file edits too; collect only after both actors have settled. */
  const quiet=()=>{if(!fixture)return false;const state=fixture.foreground();return p.getIndexStatus().upToDate&&!state.primary.urlRunning&&!state.primary.publications&&!state.primary.owners&&!state.primary.writes&&!state.primary.sourceInventory&&!fixture.index.urlPendingPublications&&!fixture.index.urlOwnerTasks.size&&!fixture.index.urlCacheWrites.size;};
  /** Bound each native diagnostic response and independently retire its timeout. */
  const command=async(method)=>{let timer;try{return await Promise.race([debug.sendCommand(method),new Promise(/** Do not leave an unresponsive debugger holding fixture ownership. */(_,reject)=>{timer=window.setTimeout(/** Surface the specific missing native response. */()=>reject(Error('Retention diagnostic command deadline: '+method)),20000);})]);}finally{if(timer!==undefined)window.clearTimeout(timer);}};
  /** Actual renderer bytes after collection; never a claim about a private index's exclusive size. */
  const heap=async()=>{await task();await command('HeapProfiler.collectGarbage');await task();await command('HeapProfiler.collectGarbage');await task();const result=await command('Runtime.getHeapUsage');check(Number.isFinite(result.usedSize),'Renderer heap sample');return result.usedSize;};
  /** Retain no strong displayed Map reference across source work or collection. */
  const observeMap=()=>{const map=fixture.index.publishedUrlState.pages.get(origin)?.neighbours;if(map&&!seenMaps.has(map)){seenMaps.add(map);publishedMaps.push(new WeakRef(map));}};
  /** Verify logical shape/current support and that every displayed relation target avoids working maps. */
  const validate=step=>{
    const index=fixture.index,name=mode(step),old=name==='alpha'?'bravo':'alpha',first=origin+'/'+name+'/0000';
    check(index.urlState.pages.size===targets+2&&index.publishedUrlState.pages.size===targets+2,'Constant live URL graph cardinality');
    check(index.urlState.evidence.declarationCount===targets*2,'Exact current owner and origin declarations');
    check(index.get(first)&&!index.get(origin+'/'+old+'/0000'),'Current support and retired endpoint');
    const current=index.search('retention-'+name+'-token-0000',5,'vault-files'),retired=index.search('retention-'+old+'-token-0000',5,'vault-files');
    check(current.some(/** Requested lookup must retain the exact semantic endpoint. */page=>page.path===first)&&retired.length===0,'Current search aliases and retired vocabulary');
    const working=new Set();for(const page of index.urlState.pages.values()){working.add(page.neighbours);for(const[key,relation]of page.neighbours)check(relation.target===index.urlState.pages.get(key),'Canonical working relation');}
    for(const page of index.publishedUrlState.pages.values())for(const relation of page.neighbours.values())check(!working.has(relation.target.neighbours),'Displayed target never exposes a working map');
    check(index.urlPublishedTargets.size===index.publishedUrlState.pages.size,'Published targets bounded by live pages');
    check(index.urlState.pages.get(origin).neighbours.depth<=8,'Private adjacency history bound');
  };
  /** Capture actual GC/structural observations after all asynchronous revision frames have finished. */
  const sample=async(step)=>{const usedBytes=await heap();let livePublishedMaps=0;for(const ref of publishedMaps)if(ref.deref())livePublishedMaps++;const index=fixture.index,map=index.urlState.pages.get(origin).neighbours;
    check(livePublishedMaps<=1,'Superseded displayed origin maps collect without retained readers');
    samples.push({step,usedBytes,pages:index.urlState.pages.size,declarations:index.urlState.evidence.declarationCount,publishedTargets:index.urlPublishedTargets.size,originDepth:map.depth,originRetainedEntries:map.retainedEntries,observedPublishedMaps:publishedMaps.length,livePublishedMaps});c.progress={phase:'settled-epoch',step,total:retentionCycles,samples};};
  try{
    fixture=await nativeUrlFixture(app,text(0),c);await until(/** Confirm actual owning renderer foreground. */()=>{const state=fixture.foreground();return!state.hidden&&state.documentFocused&&state.windowFocused&&state.throttling;},'Foreground required');
    document.addEventListener('visibilitychange',onVisibility);window.addEventListener('blur',onBlur);
    debug=require('@electron/remote').getCurrentWindow().webContents.debugger;check(!debug.isAttached(),'Another debugger owns this renderer');debug.attach('1.3');ownedDebugger=true;
    await until(/** Recreated fixture paths must use this incarnation's actual initial metadata. */()=>app.metadataCache.getFileCache(fixture.file)?.frontmatter?.kplex153Cycle===0,'Initial native metadata stamp');
    await fixture.index.refreshUrlOwner(fixture.file.path,true);await until(quiet,'Initial native URL settle');validate(0);observeMap();await sample(0);fixture.begin();
    for(let step=1;step<=retentionCycles;step++){
      check(!c.closed&&!visibilityLost,'Current foreground retention lifetime');c.progress={phase:'native-source-replacement',step,total:retentionCycles,samples};
      await app.vault.modify(fixture.file,text(step));await until(/** Wait for real metadata for this exact source revision. */()=>app.vault.getFileByPath(fixture.file.path)===fixture.file&&app.metadataCache.getFileCache(fixture.file)?.frontmatter?.kplex153Cycle===step,'Current native metadata stamp');
      await fixture.index.refreshUrlOwner(fixture.file.path,true);await until(quiet,'Both native URL owners settle');validate(step);observeMap();
      if(step%8===0||step===retentionCycles)await sample(step);
    }
    fixture.end();const operations={...fixture.operations},path=fixture.file.path,indexRef=new WeakRef(fixture.index);
    await fixture.close();fixture=null;delete c.cleanup;c.index=null;
    await until(/** Deletion must retire the primary's actual owner and queued cache work. */()=>!app.vault.getFileByPath(path)&&!p.index.urlOwners.has(path)&&!p.index.urlDiscoveryRunning&&!p.index.urlPendingPublications&&!p.index.urlOwnerTasks.size&&!p.index.urlCacheWrites.size,'Primary owned-source retirement');
    const disposedHeapBytes=await heap();let liveDisposedPublishedMaps=0;for(const ref of publishedMaps)if(ref.deref())liveDisposedPublishedMaps++;
    check(indexRef.deref()===undefined&&liveDisposedPublishedMaps===0,'Disposed private index and every observed displayed map collect');check(app.vault.getMarkdownFiles().length===originalMarkdown&&app.vault.getFiles().length===originalFileCount,'Original native file inventory restored');check(!visibilityLost,'Continuous native foreground');
    return{cycles:retentionCycles,targets,samples,operations,disposedHeapBytes,indexCollected:true,liveDisposedPublishedMaps,originalMarkdown,originalFileCount,runtime:{node:process.versions.node,electron:process.versions.electron,chrome:process.versions.chrome,platform:process.platform},limits:'Fixed two-set real-file update exercise. Foreground refresh publishes immediately by production policy; primary background work settles before GC. Whole-renderer heap includes primary and private indexes, not exclusive graph allocation, elapsed speed or process peak. No retained displayed reader is deliberately held. This is not hours-long or mobile acceptance.'};
  }finally{try{fixture?.end();if(fixture)await fixture.close();fixture=null;delete c.cleanup;c.index=null;}finally{document.removeEventListener('visibilitychange',onVisibility);window.removeEventListener('blur',onBlur);if(ownedDebugger&&debug.isAttached())debug.detach();}}
}

const cycles=Number(process.env.KPLEX_URL_RETENTION_CYCLES??64);assert([2,64].includes(cycles),'Choose the two-revision setup check or prespecified64-revision exercise');
await runControlledProbe('url-update-retention',scenario,`const retentionCycles=${cycles};const nativeUrlFixture=${nativeUrlFixture.toString()};`,['src/index/UrlAdjacencyMap.ts'],{maximumMs:900000});
