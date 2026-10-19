/**
 * Exact-installed #153 E2 receipt: genuine frontmatter role edits over a real high-degree native
 * note. Independent production GraphIndex lifetimes separate maintenance work counts from inclusive
 * patch timings. Files, cache namespace, wrappers and geometry have independent cleanup ownership.
 */
import {runControlledProbe} from './controlledProbe.mjs';
import {nativeUrlFixture} from './nativeUrlFixture.mjs';
import {probeEvidenceMaintenance} from '../../../tests/support/evidenceMaintenanceProbe.mjs';

const timingTrials=Number(process.env.KPLEX_EVIDENCE_TIMING_TRIALS??3);
if(!Number.isInteger(timingTrials)||timingTrials<1||timingTrials>3)throw Error('Choose one to three evidence timing trials; paired invocations retain at least three samples per version');

/** Native source changes settle outside observation; the installed patch API owns all actual acquisition. */
async function scenario(app,c){
  const degree=4096,edits=8,leafPath='__kplex-153-evidence-leaf.md',target='__kplex-153-url-probe';
  const f=await nativeUrlFixture(app,Array.from({length:degree},/** Distinct native unresolved links provide unrelated original evidence. */(_,n)=>'[[__kplex153_evidence_target_'+n+']]').join('\n'),c),indexes=[],rows=[];
  let leaf,probe,restoreParse,restoreCommit,heartbeatTimer,revision=0;
  /** Poll native event progress without substituting source facts, revisions or host scheduling. */
  const delay=ms=>new Promise(/** This controller owns only its bounded setup waits. */done=>window.setTimeout(done,ms));
  /** Actual metadata plus primary inventory must settle before each isolated patch. */
  const quiet=()=>{const p=app.plugins.plugins['k-plex'];return p.getIndexStatus().upToDate&&!p.index.building&&!p.index.urlDiscoveryRunning&&!p.index.urlPendingPublications&&!p.index.urlOwnerTasks.size&&!p.index.urlCacheWrites.size&&!p.index.sourceAcquisition.inventory;};
  /** Preserve controller cancellation and a finite setup deadline on every poll. */
  const until=async(predicate)=>{const end=performance.now()+60000;while(!predicate()){f.check(!c.closed&&performance.now()<end,'Evidence setup deadline');await delay(25);}};
  /** Real native frontmatter writes exercise genuine changed-note source acquisition. */
  const setRole=async(role)=>{
    const previousSize=leaf.stat.size,marker='x'.repeat(++revision*2);let modified=false;
    const ref=app.vault.on('modify',/** Observe a real native body-change event; metadata availability alone does not prove it arrived. */file=>{if(file===leaf)modified=true;});
    try{
      await app.fileManager.processFrontMatter(leaf,/** A bounded non-ontology marker gives every physical edit a distinct size even on coarse host timestamps. */fm=>{delete fm.Child;delete fm.Parent;fm[role]='[['+target+']]';fm.__kplex153_evidence_revision=marker;});
      await until(/** Wait for actual modify delivery, exact physical/metadata facts and primary reconciliation outside timing. */()=>modified&&leaf.stat.size!==previousSize&&app.metadataCache.getFileCache(leaf)?.frontmatter?.[role]==='[['+target+']]'&&app.metadataCache.getFileCache(leaf)?.frontmatter?.__kplex153_evidence_revision===marker&&quiet());
    }finally{app.vault.offref(ref);}
  };
  /** Canonical targets and complete unsorted evidence/adjacency values remain acceptance data. */
  const value=i=>({pages:[...i.state.pages].map(/** Preserve page and relation insertion order; remove only host object cycles. */([path,page])=>({path,name:page.name,aliases:page.aliases,neighbours:[...page.neighbours].map(/** Verify actual object identity before keeping the target path. */([key,{target,...relation}])=>{f.check(i.state.pages.get(key)===target,'Canonical native target');return[key,{...relation,target:target.path}];})})),evidence:[...i.state.evidence.declarations()]});
  try{
    f.check(!app.vault.getFileByPath(leafPath),'Owned evidence leaf already exists');
    leaf=await app.vault.create(leafPath,'---\nChild: "[['+target+']]"\n---\nOwned evidence maintenance fixture.');await until(/** Native metadata precedes isolated rebuild. */()=>Boolean(app.metadataCache.getFileCache(leaf))&&quiet());
    const crypto=require('node:crypto');
    for(const observe of [true,...Array(evidenceTimingTrials).fill(false)]){
      await setRole('Child');const settings=structuredClone(f.settings);settings.indexingMode='eager';settings.hierarchy.children=['Child'];settings.hierarchy.parents=['Parent'];
      const plugin={...f.index.plugin,settings},i=new f.index.constructor(plugin,f.index.app);indexes.push(i);c.index=i;
      f.check(await i.rebuild(),'Actual isolated native rebuild');f.check(i.state.evidence.declarationCount>=degree,'Unrelated originals present');
      await setRole('Parent');f.check((await i.patchMarkdownPaths([leafPath])).outcome==='patched','Calibrate a genuine positive local replacement');
      const retained=i.state.evidence,retainedValue=JSON.stringify([...retained.declarations()]),before=f.foreground(),times=[],sourcePreparation={reads:0,parses:0,supersededPasses:0};let reads=0,parses=0;
      const parse=i.metadataParser.parse;i.metadataParser.parse=/** Attribute actual parser calls to preparation or the measured patch, preserving its promise. */function(...args){if(measuring)parses++;else if(priming)sourcePreparation.parses++;return parse.apply(this,args);};
      let measuring=false,priming=false,lastHeartbeat=performance.now();const responsiveness={samples:0,largestObservedGapMs:0,largestSynchronousCommitMs:0};
      restoreParse=/** Restore even when a patch or assertion fails. */()=>{i.metadataParser.parse=parse;};
      if(observe){
        probe=probeEvidenceMaintenance(/** Compaction admission follows the current published store, never another index. */()=>i.state.evidence);
        heartbeatTimer=window.setInterval(/** Record native event-loop gaps only during patches; this is neither exclusive CPU nor paint. */()=>{const now=performance.now();if(measuring){responsiveness.samples++;responsiveness.largestObservedGapMs=Math.max(responsiveness.largestObservedGapMs,now-lastHeartbeat);}lastHeartbeat=now;},16);
        const publish=i.publishIncrementalFile;i.publishIncrementalFile=/** Measure only the synchronous atomic boundary, preserving original return/throw behavior. */function(...args){const at=performance.now();try{return publish.apply(this,args);}finally{responsiveness.largestSynchronousCommitMs=Math.max(responsiveness.largestSynchronousCommitMs,performance.now()-at);}};
        restoreCommit=/** Release the per-instance wrapper on both success and failure. */()=>{i.publishIncrementalFile=publish;};
      }
      for(let n=0;n<edits;n++){
        await setRole(n%2?'Parent':'Child');
        f.begin();priming=true;
        try{
          let prepared=false;
          for(let attempt=0;attempt<3&&!prepared;attempt++){
            const source=i.sourceAcquisition,captured=source.inventory?source.inventoryCaptureRevision:source.inventoryRevision;
            prepared=await source.reconcile();
            if(!prepared){c.progress={rows,preparationFailure:{captured,current:source.inventoryRevision,counters:source.getCounters()}};f.check(source.inventoryRevision!==captured,'Unchanged native source preparation failed');sourcePreparation.supersededPasses++;}
          }
          f.check(prepared,'Native source setup did not converge after three superseded passes');
          await until(/** Complete the real source owner before measuring semantic maintenance. */()=>!i.sourceAcquisition.inventory&&i.sourceAcquisition.knownImpactTasks===0&&!i.sourceAcquisition.needsBodyRead(leaf));
        }finally{priming=false;f.end();sourcePreparation.reads+=f.operations.reads;}
        while(i.state.evidence.depth<8)i.state.evidence=i.state.evidence.fork();
        const fingerprint=i.semanticFingerprints.get(leafPath);f.begin();measuring=true;const at=performance.now();lastHeartbeat=at;
        const result=await i.patchMarkdownPaths([leafPath],{isCurrent:/** Retired controllers cannot publish another edit. */()=>!c.closed});
        const end=performance.now(),elapsed=end-at;if(observe)responsiveness.largestObservedGapMs=Math.max(responsiveness.largestObservedGapMs,end-lastHeartbeat);measuring=false;f.end();reads+=f.operations.reads;
        f.check(result.outcome==='patched'&&result.count===1&&i.semanticFingerprints.get(leafPath)!==fingerprint,'One genuine semantic edit published');times.push(elapsed);
      }
      const counts=probe?{...probe.counts}:undefined;probe?.restore();probe=null;restoreParse();restoreParse=null;restoreCommit?.();restoreCommit=null;if(heartbeatTimer!==undefined)window.clearInterval(heartbeatTimer);heartbeatTimer=undefined;
      f.check(JSON.stringify([...retained.declarations()])===retainedValue,'Retained evidence generation unchanged');f.check(i.state.evidence.targetIndex===null,'Ordinary target facts stay inactive');
      const after=f.foreground();f.check([before,after].every(/** Timing requires native foreground and no concurrent primary inventory. */v=>!v.hidden&&v.documentFocused&&v.windowFocused&&!v.primary.urlRunning&&!v.primary.publications&&!v.primary.owners&&!v.primary.writes&&!v.primary.sourceInventory),'Quiet native foreground');
      rows.push({observe,...(observe?{counts,responsiveness}:{patchMs:times,totalPatchMs:times.reduce(/** Inclusive patch times exclude physical edit/source-preparation waits. */(sum,ms)=>sum+ms,0)}),reads,parses,sourcePreparation,depth:i.state.evidence.depth,declarations:i.state.evidence.declarationCount,graphDigest:crypto.createHash('sha256').update(JSON.stringify(value(i))).digest('hex'),before,after});
      c.progress={rows};i.destroy();c.index=f.index;
    }
    f.check(rows.every(/** Ordered IDs and source acquisition budgets agree across independent lifetimes. */row=>row.graphDigest===rows[0].graphDigest&&row.reads===rows[0].reads&&row.parses===rows[0].parses),'Independent trial equivalence');
    return{degree,edits,runtime:{node:process.versions.node,electron:process.versions.electron,chrome:process.versions.chrome,platform:process.platform},rows,limitations:'Forced depth-eight maintenance for eight real role edits per independent index after actual source reconciliation; inclusive prepared-source patch API time excludes physical edits/acquisition, and is not natural compaction frequency, startup, actual paint, heap or device acceptance.'};
  }finally{
    const errors=[];
    for(const cleanup of [/** Stop counters independently of all following cleanup. */()=>f.end(),/** Restore shared evidence methods even after assertion failure. */()=>probe?.restore(),/** Restore this index's parser. */()=>restoreParse?.(),/** Restore its synchronous publisher. */()=>restoreCommit?.(),/** No heartbeat timer may outlive the controller. */()=>{if(heartbeatTimer!==undefined)window.clearInterval(heartbeatTimer);}])try{cleanup();}catch(error){errors.push(String(error));}
    for(const i of indexes)try{i.destroy();}catch(error){errors.push(String(error));}
    try{if(leaf){if(app.vault.getFileByPath(leafPath)===leaf)await app.vault.delete(leaf);f.check(!app.vault.getFileByPath(leafPath),'Owned evidence leaf cleanup');}}catch(error){errors.push(String(error));}
    try{await f.close();}catch(error){errors.push(String(error));}
    if(errors.length)throw Error('Evidence cleanup: '+errors.join('; '));
  }
}

await runControlledProbe('evidence-maintenance',scenario,`const evidenceTimingTrials=${timingTrials};const nativeUrlFixture=${nativeUrlFixture.toString()};const probeEvidenceMaintenance=${probeEvidenceMaintenance.toString()};`,['src/core/graph/evidence.ts']);
