/**
 * Exact-installed E3 native dense-pair receipt. A real note contains separate physical inline
 * ontology occurrences; no duplicate URL facts or fabricated parser output are supplied. Actual
 * warm full rebuilds separate append work attribution/heartbeat from low-instrumentation timings.
 * Owned files/cache/indexes/wrappers/timers/window geometry are retired independently on every exit.
 */
import {runControlledProbe} from './controlledProbe.mjs';
import {nativeUrlFixture} from './nativeUrlFixture.mjs';
import {probeEvidenceAppends} from '../../../tests/support/evidenceAppendProbe.mjs';

const timingTrials=Number(process.env.KPLEX_EVIDENCE_TIMING_TRIALS??3),occurrences=Number(process.env.KPLEX_EVIDENCE_OCCURRENCES??4096);
if(!Number.isInteger(timingTrials)||timingTrials<1||timingTrials>3||!Number.isInteger(occurrences)||occurrences<256||occurrences>16384)throw Error('Use1-3timing trials and256-16384physical occurrences');

/** Rebuild actual native source twice per lifetime: untimed cache calibration, then observation. */
async function scenario(app,c){
  const text=Array.from({length:evidenceOccurrences},/** Every physical inline value has its own line/offset provenance. */()=> 'Child:: [[__kplex153_dense_target]]').join('\n'),f=await nativeUrlFixture(app,text,c),indexes=[],rows=[];
  let probe,restoreParse,timer;
  /** Observe actual queued production work without forcing a flush or replacing scheduling. */
  const cacheState=i=>{const scheduler=i.workScheduler.diagnostics();return{hotFields:i.fieldCache.size,queuedBodies:i.indexedDb.queuedBodyWrites.size,bodyWriteInFlight:i.indexedDb.bodyWriteInFlight,bodyWriteTimer:i.indexedDb.bodyWriteTimer!==null,snapshotTimer:i.snapshotPersistTimer!==null,activeWork:scheduler.active.reduce(/** Sum existing lane ownership without changing any scheduler lease. */(sum,count)=>sum+count,0),waitingWork:scheduler.waiting,pacing:scheduler.pacing,sourceReady:i.sourceAcquisition.localDependencyAuthorityReady,sourceEnabled:i.sourceAcquisition.enabled,sourceInventory:Boolean(i.sourceAcquisition.inventory),sourceInventoryTimer:i.sourceAcquisition.timer!==null,sourceKnownImpacts:i.sourceAcquisition.knownImpactTasks};};
  /** Natural warmup uses bounded native event tasks and retains controller cancellation. */
  const until=async(predicate)=>{const end=performance.now()+60000;while(!predicate()){f.check(!c.closed&&performance.now()<end,'Native append cache warmup deadline');await new Promise(/** Own only this fixture's polling task. */done=>window.setTimeout(done,25));}};
  try{
    f.check(f.body.inlineFieldOccurrences.length===evidenceOccurrences,'Actual native parser preserves every physical inline occurrence');
    const crypto=require('node:crypto');
    for(const observe of [true,...Array(evidenceTimingTrials).fill(false)]){
      const settings=structuredClone(f.settings);settings.indexingMode='eager';settings.hierarchy.children=['Child'];settings.hierarchy.parents=['Parent'];
      const i=new f.index.constructor({...f.index.plugin,settings},f.index.app);indexes.push(i);c.index=i;
      f.check(await i.rebuild(),'Untimed native body-cache calibration');
      const sourceWasEnabled=i.sourceAcquisition.pauseInventory();
      await until(/** Rebuilds already pause optional inventory; use that boundary before natural body/snapshot drain, without claiming source authority. */()=>{const state=cacheState(i);c.progress={rows,warmup:state};return!state.queuedBodies&&!state.bodyWriteInFlight&&!state.bodyWriteTimer&&!state.snapshotTimer&&!state.activeWork&&!state.waitingWork&&!state.pacing&&!state.sourceEnabled&&!state.sourceInventory&&!state.sourceInventoryTimer&&!state.sourceKnownImpacts;});
      const snapshot=await i.indexedDb.readSnapshotMeta();f.check(snapshot&&snapshot.createdAt===i.savedSnapshotSummary.active?.createdAt,'Current complete snapshot actually persisted before timing');
      const originals=()=>[...i.state.evidence.declarations()].filter(/** Attribute only actual originals declared by this owned note. */item=>item.declaredByPath===f.file.path);
      f.check(originals().filter(/** Inline declarations are genuine physical values, not an aggregate link count. */item=>item.sourceKind==='inline-ontology').length===evidenceOccurrences,'Dense native multiplicity');
      const retained=i.state.evidence,retainedValue=JSON.stringify([...retained.declarations()]),parse=i.metadataParser.parse;
      i.metadataParser.parse=/** Count unexpected warm parser admissions without replacing its promise. */function(...args){f.operations.parses++;return parse.apply(this,args);};
      restoreParse=/** Restore this trial instance independently of success. */()=>{i.metadataParser.parse=parse;};
      let last=performance.now(),active=false;const heartbeat={samples:0,largestObservedGapMs:0};
      if(observe){
        probe=probeEvidenceAppends(Object.getPrototypeOf(i.state.evidence),/** New compilers share a prototype, but only this owned native source is selected. */(_store,record)=>record.declaredByPath===f.file.path);
        timer=window.setInterval(/** Native event-loop gaps include host waiting/dispatch; they are not paint or exclusive CPU. */()=>{const now=performance.now();if(active){heartbeat.samples++;heartbeat.largestObservedGapMs=Math.max(heartbeat.largestObservedGapMs,now-last);}last=now;},16);
      }
      const before=f.foreground(),cacheBefore=cacheState(i);f.begin();active=true;const at=performance.now();last=at;
      const result=await i.rebuild(),end=performance.now(),elapsedMs=end-at;
      if(observe)heartbeat.largestObservedGapMs=Math.max(heartbeat.largestObservedGapMs,end-last);active=false;f.end();
      const counts=probe?{...probe.counts}:undefined;probe?.restore();probe=null;restoreParse();restoreParse=null;if(timer!==undefined)window.clearInterval(timer);timer=undefined;
      f.check(result,'Actual installed warm rebuild');f.check(f.operations.reads===0&&f.operations.parses===0,'Warm source budget unchanged');
      f.check(JSON.stringify([...retained.declarations()])===retainedValue,'Retained evidence generation unchanged');
      const owned=originals(),physical=owned.filter(/** Check exact provenance multiplicity after actual warm publication. */item=>item.sourceKind==='inline-ontology');
      f.check(physical.length===evidenceOccurrences&&new Set(physical.map(/** Every real physical occurrence keeps its distinct character position. */item=>item.start)).size===evidenceOccurrences,'Native positions and multiplicity');
      const value={pages:[...i.state.pages].map(/** Keep ordered scalar/facet/adjacency values without host object cycles. */([path,page])=>({path,name:page.name,aliases:page.aliases,tags:page.tags,styleTags:page.styleTags,neighbours:[...page.neighbours].map(/** Verify actual canonical identity before retaining target paths. */([key,{target,...relation}])=>{f.check(i.state.pages.get(key)===target,'Canonical native relation target');return[key,{...relation,target:target.path}];})})),evidence:[...i.state.evidence.declarations()]};
      const after=f.foreground();f.check([before,after].every(/** No competing primary fixture inventory or background window timing is accepted. */v=>!v.hidden&&v.documentFocused&&v.windowFocused&&!v.primary.urlRunning&&!v.primary.publications&&!v.primary.owners&&!v.primary.writes&&!v.primary.sourceInventory),'Quiet native foreground');
      if(observe)f.check(counts.appends===owned.length&&counts.largestBucket>=evidenceOccurrences,'Attribute every actual owned-source original');
      rows.push({observe,...(observe?{counts,heartbeat}:{elapsedMs}),operations:{...f.operations},sourcePausedForWarmup:sourceWasEnabled,cacheBefore,cacheAfter:cacheState(i),physicalOccurrences:physical.length,declarations:i.state.evidence.declarationCount,ownedDeclarations:owned.length,graphDigest:crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'),before,after});
      c.progress={rows};i.destroy();c.index=f.index;
    }
    f.check(rows.every(/** Actual graph/evidence IDs and ordering remain equal across independent lifetimes. */row=>row.graphDigest===rows[0].graphDigest),'Independent warm rebuild digests');
    return{occurrences:evidenceOccurrences,runtime:{node:process.versions.node,electron:process.versions.electron,chrome:process.versions.chrome,platform:process.platform},rows,limitations:'Warm complete rebuild of the small vault with a dense physical inline note, after actual untimed calibration/cache drain. Optional source inventory is explicitly paused using the existing rebuild boundary; global source authority/total pipeline closure is not measured. No body source work is removed; not startup, natural edits, paint, retained heap or device acceptance. Heartbeat is a timer/partial-end gap; no separate full-rebuild atomic-commit observer.'};
  }finally{
    const errors=[];for(const cleanup of [/** End read attribution even after a failed assertion. */()=>f.end(),/** Retire native prototype observation. */()=>probe?.restore(),/** Restore actual parser method. */()=>restoreParse?.(),/** Release the owned responsiveness timer. */()=>{if(timer!==undefined)window.clearInterval(timer);}])try{cleanup();}catch(error){errors.push(String(error));}
    for(const i of indexes)try{i.destroy();}catch(error){errors.push(String(error));}
    try{await f.close();}catch(error){errors.push(String(error));}if(errors.length)throw Error('Native append cleanup: '+errors.join('; '));
  }
}

await runControlledProbe('evidence-append',scenario,`const evidenceTimingTrials=${timingTrials},evidenceOccurrences=${occurrences};const nativeUrlFixture=${nativeUrlFixture.toString()};const probeEvidenceAppends=${probeEvidenceAppends.toString()};`,['src/core/graph/evidence.ts']);
