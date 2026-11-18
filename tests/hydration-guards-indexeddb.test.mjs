/**
 * Hydration lifetime/value/publication regressions through the production index and real Chromium
 * IndexedDB. Only explicit reentry/await holds are injected; snapshot decoding, graph semantics and
 * cancellation ownership remain production behavior. Complete warm-cache work counts preserve exact
 * ordered records without granting new source authority. Fixtures/wrappers retire on failure.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { chromiumHarness } from './support/browserTypeScript.mjs';
import { hydrationWorkBundle, contributorBrowserInitialize, initializeHydrationWork } from './support/hydrationWorkFixture.mjs';
import {indexPacingHintSource} from './support/indexPacingHost.mjs';

const bundle = await hydrationWorkBundle({}, ['src/index/SectionExpansion.ts', 'src/ui/plexViews/sections.ts', 'src/core/plex/views/sections.ts']);

test('cache saves wait for focus then finish after switching away even with optional indexing paused',async()=>{
 const browser=await chromiumHarness(bundle);
 try{
  await browser.evaluate(contributorBrowserInitialize);await browser.evaluate(initializeHydrationWork);
  await browser.evaluate(`(async()=>{
   const q=await hydrationWorkFixture('cache-focus-admission',1600,0,'eager',true),i=q.index;
   let releaseOptional;
   try{
    q.releaseSources();await i.restoreIndexedDbSnapshot([q.file.path],true);await i.waitForSnapshotHydration();
    ok(i.isFullSnapshotHydrated(),'Production restore prepares the complete graph');
    i.cancelPendingPersistence();const before=await i.indexedDb.readSnapshotMeta();
    let foreground=false,admissions=0,queued;const statuses=[];
    const waiting=new Promise(resolve=>queued=resolve);
    i.isCacheSaveForeground=()=>foreground;
    i.workScheduler.pacing.isForeground=()=>foreground;i.workScheduler.pacing.backgroundEffort=()=>0;
    q.plugin.notifyStartupProgress=()=>{const status=i.getSnapshotPersistenceDiagnostics();statuses.push(status);if(i.cacheFocusWaiters.size)queued();};
    const write=i.indexedDb.writeSnapshot;
    i.indexedDb.writeSnapshot=function(...args){admissions++;foreground=false;i.refreshHostActivity();return write.apply(this,args);};
    const saving=i.persistIndexedDbSnapshot(++i.snapshotPersistGeneration);
    await waiting;equal(admissions,0,'No snapshot serialization or write admission while inactive');
    equal((await i.indexedDb.readSnapshotMeta()).generation,before.generation,'The previous durable generation remains active');
    ok(i.getSnapshotPersistenceDiagnostics().waitingForFocus,'Status discloses the retained save');
    releaseOptional=i.workScheduler.begin(3);
    foreground=true;i.refreshHostActivity();
    ok(await saving,'Once admitted, tab switching and zero optional effort cannot pause the save');
    equal(admissions,1,'Focus resumes the same request exactly once');
    ok(statuses.some(status=>status.active&&!status.waitingForFocus),'An idle UI subscriber observes the writer start after the focus wait');
    const after=await i.indexedDb.readSnapshotMeta();ok(after.generation!==before.generation,'Complete replacement generation activates');
    equal(i.indexedDb.getSnapshotWriteDiagnostics().outcome,'complete','Actual multi-batch IndexedDB writer completed');
    equal(i.cacheFocusWaiters.size,0,'No retained focus receipts');
    ok(i.workScheduler.diagnostics().paused,'Other optional indexing remains paused');
   }finally{releaseOptional?.();q.close();}
   return true;
  })()`);
 }finally{await browser.cleanup();}
});

for(const effort of [0,10])test('inactive initial hydration keeps its original rate and saved graph at effort '+effort,async()=>{
 const browser=await chromiumHarness(bundle);
 try{
  await browser.evaluate(contributorBrowserInitialize);await browser.evaluate(initializeHydrationWork);
  const result=await browser.evaluate(`(async()=>{
   const q=await hydrationWorkFixture('inactive-startup-pacing-${effort}',12000,0,'eager',true),i=q.index;
   q.plugin.settings.backgroundIndexingEffort=${effort};
   const host={initialIndexComplete:false,isKplexIndexingForeground:()=>false};
   const hint=new Function('return ('+${JSON.stringify(indexPacingHintSource)}+');').call(host);
   const pacing=i.workScheduler.pacing,iterate=i.indexedDb.iterateSnapshotPages,rests=[];
   let clock=0,revision=0,edits=0;
   q.plugin.getIndexSourceRevision=()=>revision;
   // Reproduce host saves at 400/800 ms of consumed work+rest time. Virtual CPU cost
   // avoids wall-clock/CI races; actual IDB decoding, file-stat guards and publication stay real.
   i.workScheduler.pacing={...pacing,isForeground:hint,now:()=>clock,
    scheduleIdle:(callback,ms)=>{
     rests.push(ms);clock+=ms;
     if(!host.initialIndexComplete&&edits<2&&clock>=(edits+1)*400){edits++;q.file.stat.mtime++;revision++;}
     const timer=window.setTimeout(callback,0);return()=>window.clearTimeout(timer);
    }};
   i.indexedDb.iterateSnapshotPages=function(meta,onValue,...args){return iterate.call(this,meta,value=>{clock+=0.001;onValue(value);},...args);};
   try{
    q.releaseSources();
    await i.restoreIndexedDbSnapshot([q.file.path],true);await i.waitForSnapshotHydration();
    ok(i.isFullSnapshotHydrated(),'Inactive startup must retain the complete saved graph: '+JSON.stringify(i.getSnapshotHydrationDiagnostics()));
    equal(i.state.pages.size,q.state.pages.size,'All saved pages survive');
    equal(i.getSemanticPreparationDiagnostics().fullBuilds,0,'No full graph fallback');
    equal(q.f.reads.length,0,'Unchanged Markdown is not reread');equal(q.f.parses.length,0,'Unchanged Markdown is not reparsed');
    equal(i.getSnapshotHydrationDiagnostics().attempts,1,'No hydration restart');
    const startupRests=[...rests];ok(startupRests.length>0,'Real hydration consumed background work slices');
    ok(startupRests.every(ms=>ms===24),'Startup retains the responsive rest in an inactive tab');
    let visiblePrepared=false;await i.workScheduler.run(1,async()=>{visiblePrepared=true;});
    ok(visiblePrepared,'Initial local preparation is exempt even at zero inactive effort');
    host.initialIndexComplete=true;clock+=6;
    let progressed=false;const work=i.workScheduler.checkpoint(4).then(()=>{progressed=true;});
    if(${effort}===0){
     await Promise.resolve();await Promise.resolve();equal(progressed,false,'Settled inactive maintenance now pauses');
     host.isKplexIndexingForeground=()=>true;i.refreshHostActivity();await work;
     equal(rests.at(-1),24,'Focus resumes the retained task at normal responsive speed');
    }else{await work;equal(rests.at(-1),1338,'Settled inactive maintenance uses the conservative default effort');}
    return{pages:i.state.pages.size,startupRests:startupRests.length,edits,clock};
   }finally{i.indexedDb.iterateSnapshotPages=iterate;i.workScheduler.pacing=pacing;q.close();}
  })()`);
  assert.equal(result.edits,0,'Original startup pacing closes before the simulated later saves');
 }finally{await browser.cleanup();}
});

for(const secondPhase of ['pages','relations','evidence-only'])test('fresh saved pages retain '+(secondPhase==='evidence-only'?'a late same-stat native source repair':'repeated same-stat native source repairs')+' without a compiler detour ('+secondPhase+')',async()=>{
 const browser=await chromiumHarness(bundle);try{
  await browser.evaluate(contributorBrowserInitialize);await browser.evaluate(initializeHydrationWork);
  assert(await browser.evaluate(`(async()=>{
   const q=await hydrationWorkFixture('fresh-native-repairs',8000,1,'eager',true),i=q.index,f=q.f;
   ok((await i.sourceAcquisition.acquire(q.file,sourceModules.parseBodyMetadata(f.texts.get(q.file.path)))).saved,'Authentic durable source body before restart');
   let revision=0,commits=0,injectionError;const checkpoint=i.indexedDb.backgroundCheckpoint,trace=[];
   f.reads.length=0;f.parses.length=0;
   q.plugin.getIndexSourceRevision=()=>revision;
   i.indexedDb.backgroundCheckpoint=async function(){
    const phase=i.snapshotHydrationDiagnostics.phase;
    if(${secondPhase==='evidence-only'} ? commits===0&&phase==='evidence' :
      commits===0&&phase==='pages'||commits===1&&phase==='${secondPhase}'&&('${secondPhase}'!=='pages'||i.snapshotHydrationDiagnostics.pages>0)){
     try{const n=++commits;
     trace.push({n,local:i.usesLocalForeground(),fresh:i.fullSnapshotFresh,navigable:i.navigableSnapshotSourceRevision,deps:i.sourceAcquisition.hasSemanticDependencies(),window:i.snapshotForegroundWindow});
     // Native metadata/resolution may change without a body/stat edit. Commit through the real
     // source owner while the complete cache is decoding, at two separate suspension boundaries.
     const native=f.metadata.get(q.file.path);
     f.metadata.set(q.file.path,{...native,frontmatter:{...native.frontmatter,'Dormant parent 0':'[[Ghost-'+n+']]'}});revision++;
     f.app.metadataCache.trigger('changed',q.file);
     if(${secondPhase!=='evidence-only'})i.fieldCache.delete(q.file.path);q.releaseSources();
     equal((await i.patchMarkdownPaths([q.file.path],{useDurableCache:true,forceRecompile:true})).outcome,'patched','Actual same-stat native source publication');
     ok(i.state.pages.get(q.file.path)?.neighbours.get('Ghost-'+n)?.isParent,'Native repair actually published its changed relationship before cache continuation');
     }catch(error){injectionError=error;throw error;}
    }
    return checkpoint?.call(this);
   };
   try{
    await i.restoreIndexedDbSnapshot([q.file.path],true);await i.waitForSnapshotHydration();if(injectionError)throw injectionError;
    equal(commits,${secondPhase==='evidence-only'?1:2},'Native repairs occurred at their declared boundaries: '+JSON.stringify({trace,diagnostic:i.getSnapshotHydrationDiagnostics()}));
    ok(i.isFullSnapshotHydrated(),'Known native repairs must not discard the complete cached graph: '+JSON.stringify(i.getSnapshotHydrationDiagnostics()));
    equal(i.fullSnapshotFresh,false,'Changed host semantics cannot inherit old freshness');
    ok(i.hasIncrementalRestorePatch(),'Current source closure and finite repair remain mandatory');
    ok(!i.hasCurrentFullSemanticGraph(),'Cached promotion cannot certify changed host semantics');
    const retained=i.retainedLocalScopes.get(q.file.path),host=i.onDemandHostScopes.get(q.file.path);
    // Current foreground reads stay available while old evidence remains a repair candidate.
    const target='Ghost-${secondPhase==='evidence-only'?1:2}';
    ok(i.get(q.file.path)?.neighbours.get(target)?.isParent,'Latest same-stat relationship survives the readonly cache: '+JSON.stringify({canonical:i.state.pages.get(q.file.path)?.neighbours.get(target)?.isParent,retained:retained&&{revision:retained.sourceRevision,current:retained.state===host,parent:retained.state.pages.get(q.file.path)?.neighbours.get(target)?.isParent},hostParent:host?.pages.get(q.file.path)?.neighbours.get(target)?.isParent,revision}));
    ok((await i.reconcileRestoredSnapshot()).reconciled,'Normal source closure and finite repair complete');
    ok(i.state.pages.get(q.file.path)?.neighbours.get(target)?.isParent,'Canonical repair retains the latest native relationship');
    equal(i.getSemanticPreparationDiagnostics().fullBuilds,0,'No full source compiler');
    equal(f.reads.length,0,'Native metadata repair uses the retained body');return true;
   }finally{i.indexedDb.backgroundCheckpoint=checkpoint;q.close();}
  })()`));
 }finally{await browser.cleanup();}
});

for (const mode of ['eager', 'on-demand']) test(`${mode}: central sections reuse saved incidence before private evidence hydration`, async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert(await browser.evaluate(contributorBrowserInitialize));assert(await browser.evaluate(initializeHydrationWork));
    assert(await browser.evaluate(String.raw`(async()=>{
      const M=sourceModules,q=await hydrationWorkFixture('sections-saved-${mode}',4,0,'${mode}'),i=q.index,f=q.f;
      let release,enter;const gate=new Promise(resolve=>release=resolve),entered=new Promise(resolve=>enter=resolve);
      const read=i.indexedDb.iterateSnapshotEvidence;
      const deadline=(promise,label)=>{let timer;return Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error(label)),3000))]).finally(()=>clearTimeout(timer));};
      try {
        Object.assign(q.settings,{showVirtualNodes:true,showAttachments:true,showFolderNodes:false,showTagNodes:false,showPageNodes:true,showURLNodes:true,
          showInferredNodes:true,renderAlias:false,nodeSortOrder:'name-asc',renderSiblings:false});
        const text='[[Ghost-0]]\n# First\n[[Ghost-1]]\n# Second\n[[Ghost-2]]\n[[Ghost-3]]',file=q.file;
        file.stat.size=text.length;f.texts.set(file.path,text);
        f.metadata.get(file.path).links=[...text.matchAll(/\[\[([^\]]+)\]\]/g)].map(match=>({link:match[1],position:{start:{line:text.slice(0,match.index).split('\n').length-1,col:0,offset:match.index},end:{offset:match.index+match[0].length}}}));
        await f.cache.putBody(file.path,file.stat.mtime,M.parseBodyMetadata(text));
        const fingerprints=new Map(),builder=new M.GraphBuilder(q.plugin,f.app,new Map(),i.metadataParser,f.cache,()=>true,fingerprints);
        const saved=await builder.build({acquireSources:false});ok(saved,'Actual canonical seed');
        ok(await f.cache.writeSnapshot({createdAt:Date.now(),urlAliasVersion:M.URL_ALIAS_FACET_VERSION,vaultSignature:M.computeVaultSignature(f.app),
          settingsSignature:M.computeIndexSettingsSignature(q.settings),discoveredFields:[]},[...saved.pages.values()].map(page=>M.persistedPageFromGraphPage(page,fingerprints.get(page.path))),
          [...saved.evidence.declarations()].map(item=>M.persistedDeclarationFromEvidence(item)),()=>true),'Actual saved snapshot');
        i.indexedDb.iterateSnapshotEvidence=async function(...args){enter();await gate;return read.apply(this,args);};
        ok((await deadline(i.restoreIndexedDbSnapshot([file.path]),'Saved preview')).restored,'Warm preview available');
        if('${mode}'==='eager')await deadline(entered,'Private evidence hold');
        const paths=n=>n.children.map(row=>row.page.transient?.actualPath??row.page.path).filter(path=>!path.startsWith('kplex-section:')).sort();
        equal(paths(i.getNeighborhood(file.path)),q.targets,'Compass canonical incidence already visible');
        equal(i.evidenceFrom(file.path),[],'Detailed evidence is genuinely absent');
        equal(i.fullSnapshotHydrated,false,'Full hydration deliberately incomplete');
        equal(i.isSemanticWriteReady(file.path,'Ghost-1'),false,'Preview grants no write authority');
        const canonical=hydrationWorkValue(i),counters=i.sourceAcquisition.getCounters();f.reads.length=0;f.parses.length=0;f.work.reset();
        const expanded=await M.buildCentralSectionExpansion(q.plugin,i,i.get(file.path));ok(expanded,'Explicit one-file outline');
        const current=M.projectCentralSectionExpansion(q.plugin,i,expanded),view=()=>M.createPlexSectionViewContext(current,'saved-outline',new Set(),i,()=>true);
        equal(paths(current.centerNeighborhood),['Ghost-0'],'Preamble retained on canonical note');
        equal(paths(current.sections[0].neighborhood),['Ghost-1'],'First section link appears before hydration');
        equal(paths(current.sections[1].neighborhood),['Ghost-2','Ghost-3'],'Second section links appear before hydration');
        const context=view();ok(context,'Shared section context available');
        equal(M.plexSectionAnchor(context.snapshot,'Ghost-1','child')?.sectionId,current.sections[0].id,'Mind Map connector immediately starts at its physical section');
        equal(M.plexSectionAnchor(context.snapshot,'Ghost-0','child'),null,'Preamble stays at root');
        equal([...current.explanations.values()].flatMap(row=>row.decisions).length,0,'No fabricated indexed/editable evidence');
        equal(hydrationWorkValue(i),canonical,'No canonical edge/provenance mutation');equal(i.sourceAcquisition.getCounters(),counters,'No source acquisition');
        equal(f.reads,[file.path],'Only explicit source body read');equal(f.parses.length,0,'No index parsing');
        const work=f.work.snapshot();
        for(let n=0;n<3;n++)M.projectCentralSectionExpansion(q.plugin,i,expanded);
        equal(f.reads,[file.path],'Presentation never rereads Markdown');equal(f.work.snapshot(),work,'No index/store/inventory work');
        file.stat.mtime++;const stale=M.projectCentralSectionExpansion(q.plugin,i,expanded);
        equal(stale.previewPlacements,[],'Changed native source retires physical preview proof');
        equal(paths(stale.centerNeighborhood),q.targets,'Changed native source still retains all readable canonical relationships at the header');file.stat.mtime--;
        const cache=f.metadata.get(file.path);f.metadata.set(file.path,{...cache});
        const replaced=M.projectCentralSectionExpansion(q.plugin,i,expanded);
        equal(replaced.previewPlacements,[],'Same-stat metadata replacement retires physical preview proof');
        equal(paths(replaced.centerNeighborhood),q.targets,'Metadata replacement cannot erase readable canonical relationships');f.metadata.set(file.path,cache);
        release();
        if('${mode}'==='eager'){
          ok((await deadline(i.waitForSnapshotHydration(),'Full evidence promotion')).restored,'Real evidence eventually promotes');
          const final=M.projectCentralSectionExpansion(q.plugin,i,expanded);
          equal(final.previewPlacements,[],'Detailed evidence replaces the preview path');
          equal(paths(final.centerNeighborhood),paths(current.centerNeighborhood),'Header remains stable');
          for(let n=0;n<final.sections.length;n++)equal(paths(final.sections[n].neighborhood),paths(current.sections[n].neighborhood),'Same section targets after hydration');
        }
        return true;
      }finally{release();i.indexedDb.iterateSnapshotEvidence=read;q.close();}
    })()`));
  }finally{await browser.cleanup();}
});

/** Run independent actual-IDB cases in one browser, with bounded waits that cannot hide a leaked task. */
test('hydration guards retain policy/lifetime/physical fences while removing per-record signatures', async t => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(initializeHydrationWork), true);
    assert.equal(await browser.evaluate(String.raw`(() => {
      /** Limit a public wait without releasing the deliberately held storage operation. */
      window.hydrationDeadline=(promise,label)=>{
        let timer;return Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error(label+' remained pending')),3000))]).finally(()=>clearTimeout(timer));
      };
      /** Pause the real reader's open await once, retaining its original continuation/receiver. */
      window.holdHydrationOpen=(index,phase)=>{
        const owner=index.indexedDb,original=owner.open;
        let enter,release,held=false;
        const entered=new Promise(resolve=>enter=resolve),gate=new Promise(resolve=>release=resolve);
        owner.open=async function(...args){
          const result=await original.apply(this,args);
          if(!held && index.getSnapshotHydrationDiagnostics().phase===phase){held=true;enter();await gate;}
          return result;
        };
        return {entered,release,restore(){owner.open=original;release();}};
      };
      return true;
    })()`), true);

    await t.test('a genuine unchanged complete warm snapshot preserves exact records without compilation or rewriting', async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await hydrationWorkFixture('guards-warm-no-rebuild',12,4,'eager',true);
        const calls={build:0,persist:0,write:0},restores=[];
        /** Observe actual owners after canonical preparation, retaining their original promises. */
        const observe=(owner,key,count)=>{const original=owner[key];owner[key]=function(...args){calls[count]++;return original.apply(this,args)};restores.push(()=>owner[key]=original)};
        /** Preserve every persisted page field and adjacency order outside preparation/observation. */
        const pages=state=>[...state.pages.values()].map(page=>M.persistedPageFromGraphPage(page,f.fingerprints.get(page.path)));
        /** Preserve declaration order, provenance and duplicate multiplicity; do not sort an oracle. */
        const evidence=state=>[...state.evidence.declarations()].map(item=>M.persistedDeclarationFromEvidence(item));
        try{
          const expected={pages:pages(f.state),evidence:evidence(f.state),fields:[...f.state.discoveredFields]};
          observe(M.GraphBuilder.prototype,'build','build');observe(f.index,'persistIndexedDbSnapshot','persist');observe(f.index.indexedDb,'writeSnapshot','write');
          ok((await hydrationDeadline(f.index.restoreIndexedDbSnapshot(['Hub.md']),'complete warm preview')).restored,'Real saved preview');
          const restored=await hydrationDeadline(f.index.waitForSnapshotHydration(),'complete warm promotion');
          ok(restored.restored&&restored.fresh,'Actual unchanged complete promotion');
          equal({pages:pages(f.index.state),evidence:evidence(f.index.state),fields:[...f.index.state.discoveredFields]},expected,'All persisted fields, adjacency, aliases and evidence preserve exact encounter order/multiplicity');
          equal(calls,{build:0,persist:0,write:0},'No canonical rebuild or snapshot rewrite');
          equal(f.index.snapshotPersistTimer,null,'No deferred rewrite beyond observation');
          equal(f.f.reads.length,0,'No fresh note reads');equal(f.f.parses.length,0,'No parsing');
          return true;
        }finally{for(const restore of restores.reverse())restore();f.close();}
      })()`),true);
    });

    for (const records of [256, 1024, 4096]) {
      await t.test(`current chunked ${records}-record graph preserves ordered semantics with bounded signature work`, async () => {
        const result=await browser.evaluate(`(async()=>{
          const f=await hydrationWorkFixture('guards-work-${records}',${records},256);
          const probe=sourceModules.installHydrationWorkProbe(()=>performance.now(),()=>f.index.getSnapshotHydrationDiagnostics().phase);
          try {
            const expected=hydrationWorkValue({state:f.state});
            ok((await f.index.restoreIndexedDbSnapshot(['Hub.md'])).restored,'Preview');
            ok((await f.index.waitForSnapshotHydration()).restored,'Full graph');
            const phases=probe.snapshot();probe.restore();
            equal(hydrationWorkValue(f.index),expected,'Exact ordered roles, direction and provenance');
            equal(f.f.reads.length,0,'Warm body reads');equal(f.f.parses.length,0,'Warm parses');
            return {records:${records},phases};
          } finally {probe.restore();f.close();}
        })()`);
        // Notifications occur every 256 records; storage batches/yields add full checks. This bound
        // detects per-record serialization without asserting scheduler-dependent exact call counts.
        for (const phase of ['pages','relations','evidence']) {
          assert.ok(result.phases[phase].calls < records / 8, `${phase}: ${JSON.stringify(result.phases[phase])}`);
        }
      });
    }

    for (const mutation of ['in-place','replacement','observed-ABA','invalidate-ABA','unload','purge','supersede','physical-replacement','membership']) {
      await t.test(`${mutation} during a real storage await rejects late hydration`, async () => {
        assert.equal(await browser.evaluate(`(async()=>{
          const f=await hydrationWorkFixture('guards-await-${mutation}',512,128),index=f.index;
          const hold=holdHydrationOpen(index,'pages');let fullGuard;
          const iterate=index.indexedDb.iterateSnapshotPages;
          index.indexedDb.iterateSnapshotPages=function(meta,visit,current,...args){fullGuard=current;return iterate.call(this,meta,visit,current,...args);};
          try {
            const restore=index.restoreIndexedDbSnapshot(['Hub.md']);
            await hydrationDeadline(hold.entered,'Storage hold');
            const state=index.state,revision=index.publicationRevision,waiting=index.waitForSnapshotHydration();
            const mutation='${mutation}';
            if(mutation==='in-place') f.settings.hierarchy.parents.push('Changed');
            if(mutation==='replacement') f.plugin.settings={...f.settings,inverseInfer:true};
            if(mutation==='observed-ABA'){
              f.settings.hierarchy.parents.push('Changed');equal(fullGuard(),false,'Observe changed policy');
              f.settings.hierarchy.parents.pop();equal(fullGuard(),false,'Retired value lifetime cannot revive');
            }
            if(mutation==='invalidate-ABA'){
              f.settings.hierarchy.parents.push('Changed');index.invalidateSemanticPolicy();f.settings.hierarchy.parents.pop();
            }
            if(mutation==='unload') index.destroy();
            if(mutation==='purge') await index.purgePersistentIndexCache();
            if(mutation==='supersede') index.publishRestoredState(state,null,true,false);
            if(mutation==='physical-replacement'){
              const replacement=new ContributorFile(f.file.path);replacement.stat={...f.file.stat};replacement.parent=f.file.parent;
              f.f.files.set(f.file.path,replacement);
            }
            if(mutation==='membership') f.f.add('Added.md','');
            const retiredState=index.state;
            if(['invalidate-ABA','unload','purge'].includes(mutation)){
              equal((await hydrationDeadline(waiting,'Cancelled public hydration')).restored,false,'Public wait settles before storage resumes');
            }
            hold.release();
            await hydrationDeadline(restore,'Initial restore');
            equal((await hydrationDeadline(waiting,'Late hydration')).restored,false,'Captured generation rejected');
            equal(index.state===retiredState,true,'Late private records do not replace visible graph or unloaded state');
            equal(index.publicationRevision,revision+(mutation==='supersede'?1:0),'No late publication');
            equal(index.fullSnapshotHydrated,false,'Rejected generation is not complete');
            if(mutation==='supersede'){
              const failure=index.getSnapshotHydrationDiagnostics().firstFailure;
              equal(failure.reason,'publication-superseded','Failed publication guard survives its cancellation');
              equal(failure.operation,'open','Exact first failed reader boundary');
              equal(failure.pages,0,'The candidate was rejected before decoding pages');
              equal(failure.publicationCause,'snapshot','Real replacement owner is reported');
              failure.reason='private injected value';
              equal(index.getSnapshotHydrationDiagnostics().firstFailure.reason,'publication-superseded','Exported failure is an independent copy');
            }
            if(mutation==='physical-replacement') equal(index.getSnapshotHydrationDiagnostics().firstFailure.reason,'physical-identity-changed','Same-stat replacement has a distinct reason');
            if(mutation==='membership') equal(index.getSnapshotHydrationDiagnostics().firstFailure.reason,'physical-membership-changed','Membership failure remains distinct');
            equal(f.f.reads.length,0,'No fallback body scan');equal(f.f.parses.length,0,'No fallback parser');
            return true;
          } finally {index.indexedDb.iterateSnapshotPages=iterate;hold.restore();f.close();}
        })()`), true);
      });
    }

    for(const changedVault of [false,true])await t.test('a real unchanged foreground file commit before page delivery does not force a source-vocabulary detour (changed vault='+changedVault+')', /** Exercise coordinator recovery using the genuine source publisher and compiler snapshot. */ async () => {
      const result=await browser.evaluate(`(async()=>{
        const f=await hydrationWorkFixture('guards-real-foreground-${changedVault}',512,0,'eager',true),index=f.index;
        if(${JSON.stringify(changedVault)})f.f.add('Offline.md','');
        const hold=holdHydrationOpen(index,'pages');let inventories=0,catalogs=0;
        const inventory=index.startPersistedSourceInventory,catalog=sourceModules.GraphBuilder.prototype.buildSourceNodeCatalog;
        index.startPersistedSourceInventory=/** Count fallback admission without replacing its work/result. */ async function(...args){inventories++;return inventory.apply(this,args);};
        sourceModules.GraphBuilder.prototype.buildSourceNodeCatalog=/** Count only actual global vocabulary calls. */ async function(...args){catalogs++;return catalog.apply(this,args);};
        try{
          const restore=index.restoreIndexedDbSnapshot(['Hub.md'],${JSON.stringify(changedVault)});
          await hydrationDeadline(hold.entered,'Actual full-reader open');
          f.releaseSources();
          const patch=await hydrationDeadline(index.patchMarkdownPaths(['Hub.md'],{useDurableCache:true}),'Real foreground source publication');
          equal(patch.outcome,'patched','Actual current source transaction committed');
          const publication=index.publicationRevision;
          hold.release();
          await hydrationDeadline(restore,'Preview result');
          const outcome=await hydrationDeadline(index.waitForSnapshotHydration(),'Coordinator recovery');
          const diagnostic=index.getSnapshotHydrationDiagnostics();
          return {outcome,diagnostic,inventories,catalogs,publication,finalPublication:index.publicationRevision,
            full:index.fullSnapshotHydrated,reads:f.f.reads.length,parses:f.f.parses.length,
            canonical:[...index.state.pages.values()].every(/** Every restored relation targets this published generation's canonical page. */ page=>[...page.neighbours].every(/** Do not retain targets from the retired foreground graph. */ ([path,relation])=>relation.target===index.state.pages.get(path)))};
        }finally{index.startPersistedSourceInventory=inventory;sourceModules.GraphBuilder.prototype.buildSourceNodeCatalog=catalog;hold.restore();f.close();}
      })()`);
      if(changedVault)assert.equal(result.diagnostic.firstFailure,null,'Readonly stale-cache page loading retains the accounted commit without discarding its decode');
      else {
        assert.equal(result.diagnostic.firstFailure?.reason,'publication-superseded');
        assert.equal(result.diagnostic.firstFailure?.publicationCause,'file-patch');
        assert.equal(result.diagnostic.firstFailure?.operation,'open');
        assert.equal(result.diagnostic.firstFailure?.pages,0);
      }
      assert.equal(result.full,true,JSON.stringify(result));
      assert.equal(result.diagnostic.attempts,changedVault?1:2,'Readonly page retention avoids replay; authoritative candidates keep the single fenced retry');
      assert.equal(result.diagnostic.route,'full-snapshot');
      assert.equal(result.canonical,true,'The newly published graph keeps canonical target identities');
      assert.equal(result.inventories,0,'An unchanged reusable graph does not need global source recovery');
      assert.equal(result.catalogs,0,'No unnecessary full source node catalog');
      assert.equal(result.reads,0);assert.equal(result.parses,0);
    });

    for(const changedSource of [false,true])await t.test('changed-vault retry joins the real center task between structural and file publication (changed source='+changedSource+')',async()=>{
      const result=await browser.evaluate(`(async()=>{
        const f=await hydrationWorkFixture('guards-center-between-publications-${changedSource}',32,0,'eager',true),index=f.index;
        f.f.add('Offline.md','');const hold=holdHydrationOpen(index,'pages');
        const candidates=index.hostPreview.candidateMarkdownPaths,iterate=index.indexedDb.iterateSnapshotPages;
        let entered,release,center,passes=0;
        const waiting=new Promise(resolve=>entered=resolve),gate=new Promise(resolve=>release=resolve);
        index.hostPreview.candidateMarkdownPaths=async function(...args){entered();await gate;return candidates.apply(this,args)};
        index.indexedDb.iterateSnapshotPages=async function(...args){if(++passes===2)await center;return iterate.apply(this,args)};
        try{
          const restore=index.restoreIndexedDbSnapshot(['Hub.md'],true);await hydrationDeadline(hold.entered,'First full reader');
          f.releaseSources();center=index.ensureOnDemandCenter('Hub.md');await hydrationDeadline(waiting,'Actual center metadata read');
          equal(index.getSnapshotHydrationDiagnostics().attempts,1,'Structural producer interrupted the first candidate');
          if(${JSON.stringify(changedSource)}){
            const text='[[NewTarget]]';f.f.texts.set(f.file.path,text);f.f.app.metadataCache.unresolvedLinks[f.file.path]={NewTarget:1};
            await f.f.cache.putBody(f.file.path,f.file.stat.mtime,sourceModules.parseBodyMetadata(text));index.fieldCache.delete(f.file.path);
          }
          hold.release();setTimeout(release,10);
          await hydrationDeadline(center,'Actual center source publication');await hydrationDeadline(restore,'Preview');
          const outcome=await hydrationDeadline(index.waitForSnapshotHydration(),'Retry after center');
          return{outcome,full:index.fullSnapshotHydrated,fresh:index.fullSnapshotFresh,patch:index.hasIncrementalRestorePatch(),
            current:!!index.get('Hub.md')?.neighbours.has('NewTarget'),diagnostic:index.getSnapshotHydrationDiagnostics()};
        }finally{release();index.hostPreview.candidateMarkdownPaths=candidates;index.indexedDb.iterateSnapshotPages=iterate;hold.restore();f.close();}
      })()`);
      assert.equal(result.full,true,JSON.stringify(result));
      assert.equal(result.outcome.restored,true);
      assert.equal(result.fresh,false,'The changed-vault generation cannot grant current authority');
      assert.equal(result.patch,true,'A finite current-policy repair remains mandatory');
      if(changedSource)assert.equal(result.current,true,'Current foreground vocabulary survives the readonly cache baseline');
      assert.equal(result.diagnostic.attempts,1,'Accounted bootstrap/file receipts retain the private decode without spending a retry');
      assert.equal(result.diagnostic.firstFailure,null,'A known readonly repair obligation is not a superseded decode');
      assert.equal(result.diagnostic.route,'full-snapshot','A changed source retains the compatible readonly graph and an explicit repair obligation');
    });

    // A save with a new creation stamp still has the same native owner and must reacquire its
    // body through the finite repair. Actual replacement and a second save keep rejecting.
    for(const bootstrap of [false,true])for(const mutation of ['one-save','save-ctime','second-save','replacement'])await t.test(`eager startup shares one retry for a changing Markdown stat: ${mutation}, bootstrap=${bootstrap}`,async()=>{
      const result=await browser.evaluate(`(async()=>{
        const f=await hydrationWorkFixture('guards-bounded-stat-${mutation}-${bootstrap}',12,0,'eager',true),index=f.index;
        const hold=holdHydrationOpen(index,'pages'),iterate=index.indexedDb.iterateSnapshotPages;let mutatedAgain=false;
        index.indexedDb.iterateSnapshotPages=async function(...args){const result=await iterate.apply(this,args);if('${mutation}'==='second-save'&&index.getSnapshotHydrationDiagnostics().attempts===2&&!mutatedAgain){mutatedAgain=true;f.file.stat.mtime++;f.f.texts.set(f.file.path,'[[SecondTarget]]');}return result;};
        try{
          const restore=index.restoreIndexedDbSnapshot(['Hub.md'],true);await hydrationDeadline(hold.entered,'Initial warm reader');
          if(${bootstrap})ok(await hydrationDeadline(index.initializeOnDemandBaseline(['Hub.md']),'Body-free bootstrap before the real edit'),'Actual bootstrap publishes');
          f.f.texts.set(f.file.path,'[[NewTarget]]');f.f.app.metadataCache.unresolvedLinks[f.file.path]={NewTarget:1};
          if('${mutation}'==='replacement')f.f.add(f.file.path,'[[NewTarget]]');else{f.file.stat.mtime++;if('${mutation}'==='save-ctime')f.file.stat.ctime++;}
          f.releaseSources();hold.release();await hydrationDeadline(restore,'Preview');await hydrationDeadline(index.waitForSnapshotHydration(),'Bounded retry');
          const diagnostic=index.getSnapshotHydrationDiagnostics();
          if(['one-save','save-ctime'].includes('${mutation}')){
            ok(index.isFullSnapshotHydrated()&&!index.fullSnapshotFresh&&index.hasIncrementalRestorePatch(),'Only a readonly repair candidate is restored');
            ok((await index.reconcileRestoredSnapshot()).reconciled,'The changed note commits through the existing per-file owner');
            ok(index.get('NewTarget'),'Actual new reference vocabulary survives repair');equal(index.getSemanticPreparationDiagnostics().fullBuilds,0,'No full graph compilation');
          }
          return{diagnostic,full:index.isFullSnapshotHydrated(),reads:f.f.reads};
        }finally{index.indexedDb.iterateSnapshotPages=iterate;hold.restore();f.close();}
      })()`);
      assert.equal(result.diagnostic.attempts,['one-save','save-ctime','second-save'].includes(mutation)?2:1,'No third attempt or native replacement shortcut');
      if(['one-save','save-ctime'].includes(mutation)){assert.equal(result.full,true);assert.equal(result.diagnostic.route,'full-snapshot');assert(result.reads.every(path=>path==='Hub.md'));assert.equal(result.reads.length,1,'Changed physical stamps require one fresh body read');}
      else assert.equal(result.full,false,'Repeated edits and native reincarnation retain conservative recovery');
    });

    for (const scenario of ['baseline-only','baseline-file','baseline-changed-file','baseline-mixed','baseline-reentrant']) {
      await t.test(`a genuine startup structural publication remains safely accounted for: ${scenario}`,/** Reproduce the native baseline producer rather than changing a publication integer. */ async()=>{
        const result=await browser.evaluate(`(/** Execute the real body-free producer while the actual full reader is held. */ async()=>{
          const scenario='${scenario}',f=await hydrationWorkFixture('guards-structural-'+scenario,32,0,'eager',true),index=f.index;
          const hold=holdHydrationOpen(index,'pages'),inventory=index.startPersistedSourceInventory,catalog=sourceModules.GraphBuilder.prototype.buildSourceNodeCatalog,publisher=index.publishRestoredState;
          let inventories=0,catalogs=0;
          index.startPersistedSourceInventory=/** Count the actual recovery owner without replacing its result. */ function(...args){inventories++;return inventory.apply(this,args);};
          sourceModules.GraphBuilder.prototype.buildSourceNodeCatalog=/** Count actual vocabulary compilation. */ function(...args){catalogs++;return catalog.apply(this,args);};
          try{
            const expected=hydrationWorkValue({state:f.state}),restore=index.restoreIndexedDbSnapshot(['Hub.md']);await hydrationDeadline(hold.entered,'Full reader');
            if(scenario==='baseline-reentrant'){
              let reentered=false;
              index.publishRestoredState=/** A second real publication before the producer returns must never borrow its receipt. */ function(...args){const value=publisher.apply(this,args);if(!reentered){reentered=true;publisher.call(this,this.state,null,true,false);}return value;};
            }
            ok(await hydrationDeadline(index.initializeOnDemandBaseline(['Hub.md']),'Real structural baseline'),'Actual baseline publication');
            f.releaseSources();
            if(scenario==='baseline-changed-file'){
              const text='[[Current target]]';f.f.texts.set(f.file.path,text);f.f.app.metadataCache.unresolvedLinks[f.file.path]={'Current target':1};
              ok(await f.f.cache.putBody(f.file.path,f.file.stat.mtime,sourceModules.parseBodyMetadata(text)),'Real same-stat changed facts');index.fieldCache.delete(f.file.path);
            }
            if(scenario==='baseline-mixed')index.publishRestoredState(index.state,null,true,false);
            if(scenario!=='baseline-only')equal((await index.patchMarkdownPaths(['Hub.md'],{useDurableCache:true,forceRecompile:true})).outcome,'patched','Actual source publication');
            hold.release();await restore;await hydrationDeadline(index.waitForSnapshotHydration(),'Coordinator outcome');
            if(index.fullSnapshotHydrated)equal(hydrationWorkValue(index),expected,'Exact saved canonical adjacency/provenance after startup baseline');
            return {full:index.fullSnapshotHydrated,diagnostic:index.getSnapshotHydrationDiagnostics(),inventories,catalogs,
              reads:f.f.reads.length,parses:f.f.parses.length,current:!!index.state.pages.get('Current target'),retired:index.snapshotForegroundWindow===null};
          }finally{index.publishRestoredState=publisher;index.startPersistedSourceInventory=inventory;sourceModules.GraphBuilder.prototype.buildSourceNodeCatalog=catalog;hold.restore();f.close();}
        })()`);
        const reusable=scenario==='baseline-only'||scenario==='baseline-file';
        assert.equal(result.full,reusable,JSON.stringify(result));assert.equal(result.retired,true);
        assert.equal(result.diagnostic.attempts,scenario==='baseline-only'||scenario==='baseline-mixed'||scenario==='baseline-reentrant'?1:2);
        if(scenario==='baseline-only')assert.equal(result.diagnostic.firstFailure,null,'A known body-free bootstrap is not failed semantic hydration');
        else assert.equal(result.diagnostic.firstFailure?.reason,'publication-superseded');
        if(reusable){assert.equal(result.inventories,0);assert.equal(result.catalogs,0);assert.equal(result.diagnostic.route,'full-snapshot');}
        if(scenario==='baseline-changed-file')assert.equal(result.current,true,'Changed facts survive conservative fallback');
        assert.equal(result.reads,0);assert.equal(result.parses,0);
      });
    }

    for(const fresh of [false,true])for(const mutation of ['mixed-publication','file-replacement','policy','missing-fingerprint'])await t.test((fresh?'fresh':'stale')+' page retention rejects '+mutation+' outside the accounted file proof',async()=>{
      const result=await browser.evaluate(`(async()=>{
        const f=await hydrationWorkFixture('page-fence-${fresh}-${mutation}',32,0,'eager',true),index=f.index;
        if(!${fresh})f.f.add('Offline.md','');const hold=holdHydrationOpen(index,'pages');
        try{
          const restore=index.restoreIndexedDbSnapshot(['Hub.md'],true);await hydrationDeadline(hold.entered,'Stale page reader');f.releaseSources();
          equal((await index.patchMarkdownPaths(['Hub.md'],{useDurableCache:true,forceRecompile:true})).outcome,'patched','Genuine canonical source publication');
          if('${mutation}'==='mixed-publication')index.publishRestoredState(index.state,null,true,false);
          if('${mutation}'==='file-replacement')f.f.files.set(f.file.path,Object.assign(Object.create(Object.getPrototypeOf(f.file)),f.file));
          if('${mutation}'==='policy')f.settings.hierarchy.parents.push('New policy');
          if('${mutation}'==='missing-fingerprint')index.semanticFingerprints.delete(f.file.path);
          hold.release();await restore;await hydrationDeadline(index.waitForSnapshotHydration(),'Rejected stale page proof');
          return {full:index.fullSnapshotHydrated,diagnostic:index.getSnapshotHydrationDiagnostics(),windowRetired:index.snapshotForegroundWindow===null};
        }finally{hold.restore();f.close();}
      })()`);
      assert.equal(result.full,false,JSON.stringify(result));assert.equal(result.windowRetired,true);
      assert.ok(result.diagnostic.attempts<=2,'No expanded retry budget');
    });

    await t.test('a tracked body-free bootstrap after the readonly cached preview retains its private evidence decode',async()=>{
      const result=await browser.evaluate(`(async()=>{
        const f=await hydrationWorkFixture('stale-late-bootstrap',32,0,'eager',true),index=f.index;
        f.f.add('Offline.md','');const hold=holdHydrationOpen(index,'evidence');
        try{
          const restore=index.restoreIndexedDbSnapshot(['Hub.md'],true);await hydrationDeadline(hold.entered,'Readonly evidence reader');f.releaseSources();
          ok(await index.initializeOnDemandBaseline(['Hub.md']),'Actual body-free bootstrap publishes after the saved preview');
          hold.release();await restore;await hydrationDeadline(index.waitForSnapshotHydration(),'Retained evidence decode');
          return {full:index.fullSnapshotHydrated,fresh:index.fullSnapshotFresh,patch:index.hasIncrementalRestorePatch(),diagnostic:index.getSnapshotHydrationDiagnostics()};
        }finally{hold.restore();f.close();}
      })()`);
      assert.equal(result.full,true,JSON.stringify(result));assert.equal(result.fresh,false);assert.equal(result.patch,true);
      assert.equal(result.diagnostic.attempts,1);assert.equal(result.diagnostic.firstFailure,null);
    });

    await t.test('readonly stale hydration retains a late changed foreground read without granting write authority',async()=>{
      const result=await browser.evaluate(`(async()=>{
        const f=await hydrationWorkFixture('stale-late-fingerprint',32,0,'eager',true),index=f.index;
        f.f.add('Offline.md','');const hold=holdHydrationOpen(index,'evidence');
        try{
          const restore=index.restoreIndexedDbSnapshot(['Hub.md'],true);await hydrationDeadline(hold.entered,'Stale evidence reader');f.releaseSources();
          const stat={...f.file.stat};f.f.texts.set(f.file.path,'[[Changed after pages]]');
          f.f.app.metadataCache.unresolvedLinks[f.file.path]={'Changed after pages':1};f.f.app.vault.trigger('modify',f.file);
          equal((await index.patchMarkdownPaths([f.file.path],{forceRecompile:true})).outcome,'patched','Real changed source publication');
          equal(f.file.stat,stat,'Controlled equal-stat edit still changes the authenticated source fingerprint');
          hold.release();await restore;await hydrationDeadline(index.waitForSnapshotHydration(),'Late changed source rejection');
          const result={full:index.fullSnapshotHydrated,fresh:index.fullSnapshotFresh,patch:index.hasIncrementalRestorePatch(),write:index.isSemanticWriteReady(f.file.path,'Changed after pages'),diagnostic:index.getSnapshotHydrationDiagnostics(),current:!!index.get(f.file.path)?.neighbours.has('Changed after pages')};
          result.reconciled=(await index.reconcileRestoredSnapshot()).reconciled;result.canonical=!!index.get('Changed after pages');return result;
        }finally{hold.restore();f.close();}
      })()`);
      assert.equal(result.full,true,JSON.stringify(result));assert.equal(result.current,true,'Cached evidence cannot replace the retained current read');
      assert.equal(result.fresh,false);assert.equal(result.patch,true);assert.equal(result.write,false,'Only ordinary source closure and per-file repair may authorize writes');
      assert.equal(result.reconciled,true);assert.equal(result.canonical,true,'Normal source repair incorporates the target into the canonical graph');
    });

    for (const mutation of ['changed-source','missing-saved-proof','mixed-publication']) {
      await t.test(`${mutation} cannot replace a current foreground commit with an older saved graph`, /** Reject unproved saved semantics through the actual outer coordinator. */ async () => {
        const result=await browser.evaluate(`(async()=>{
          const mutation='${mutation}',f=await hydrationWorkFixture('guards-proof-'+mutation,32,0,'eager',mutation!=='missing-saved-proof'),index=f.index;
          const hold=holdHydrationOpen(index,'pages');
          try{
            const restore=index.restoreIndexedDbSnapshot(['Hub.md']);await hydrationDeadline(hold.entered,'First page reader');
            f.releaseSources();
            if(mutation==='changed-source'){
              const text='[[Current target]]';f.f.texts.set(f.file.path,text);
              f.f.app.metadataCache.unresolvedLinks[f.file.path]={'Current target':1};
              await f.f.cache.putBody(f.file.path,f.file.stat.mtime,sourceModules.parseBodyMetadata(text));
              index.fieldCache.delete(f.file.path);
            }
            if(mutation==='mixed-publication') index.publishRestoredState(index.state,null,true,false);
            equal((await index.patchMarkdownPaths(['Hub.md'],{useDurableCache:true,forceRecompile:true})).outcome,'patched','Real file publisher');
            hold.release();await restore;await hydrationDeadline(index.waitForSnapshotHydration(),'Safe fallback');
            return {full:index.fullSnapshotHydrated,diagnostic:index.getSnapshotHydrationDiagnostics(),
              reasons:index.getIndexDiagnostics().map(/** Return only safe decision enums. */ row=>row.reason),
              current:!!index.state.pages.get('Current target'),windowRetired:index.snapshotForegroundWindow===null};
          }finally{hold.restore();f.close();}
        })()`);
        assert.equal(result.full,false,JSON.stringify(result));
        assert.equal(result.windowRetired,true);
        assert.equal(result.diagnostic.attempts,mutation==='mixed-publication'?1:2);
        if(mutation!=='mixed-publication') assert.ok(result.reasons.includes('snapshot-foreground-proof-mismatch'),JSON.stringify(result));
        if(mutation==='changed-source') assert.equal(result.current,true,'Current source vocabulary survives conservative fallback');
      });
    }

    await t.test('a checkpoint fallback cannot borrow retry eligibility from a corrupt fresh active snapshot',/** Keep the single new attempt restricted to the actual complete active generation. */ async()=>{
      const result=await browser.evaluate(`(/** Corrupt an actual active chunk and interrupt the independently stored checkpoint reader. */ async()=>{
        const f=await hydrationWorkFixture('guards-checkpoint-retry',32,0,'eager',true),i=f.index,M=sourceModules;
        let enter,release,checkpoint=false,held=false;const entered=new Promise(/** Report the checkpoint storage boundary. */ resolve=>enter=resolve),gate=new Promise(/** Own independent late-read cleanup. */ resolve=>release=resolve);
        const open=i.indexedDb.open,iterate=i.indexedDb.iterateSnapshotPages;
        try{
          const active=await f.f.cache.readSnapshotMeta(),db=await f.f.cache.open();
          ok(await f.f.cache.writeSnapshot({createdAt:Date.now(),vaultSignature:M.computeVaultSignature(f.f.app),settingsSignature:M.computeIndexSettingsSignature(f.settings),
            urlAliasVersion:M.URL_ALIAS_FACET_VERSION,discoveredFields:[],completedMarkdownPaths:['Hub.md']},
            [...f.state.pages.values()].map(/** Preserve genuine checkpoint owner signatures. */ page=>M.persistedPageFromGraphPage(page,f.fingerprints.get(page.path))),
            [...f.state.evidence.declarations()].map(/** Use actual saved provenance. */ item=>M.persistedDeclarationFromEvidence(item)),/** Setup has no competing writer. */ ()=>true,'checkpoint'),'Real checkpoint activation');
          await edit(db,['snapshotChunks'],/** Damage only the active generation, leaving the checkpoint intact. */ tx=>tx.objectStore('snapshotChunks').delete([active.generation,'pages',0]));
          i.indexedDb.iterateSnapshotPages=/** Identify the real candidate without substituting returned records. */ function(meta,...args){checkpoint=meta.key==='checkpoint';return iterate.call(this,meta,...args);};
          i.indexedDb.open=/** Capture this reader before awaiting, then hold its genuine connection completion. */ async function(...args){const holding=checkpoint&&!held;if(holding)held=true;const db=await open.apply(this,args);if(holding){enter();await gate;}return db;};
          f.releaseSources();const restore=i.restoreIndexedDbSnapshot(['Hub.md']);await hydrationDeadline(entered,'Checkpoint reader');
          equal((await i.patchMarkdownPaths(['Hub.md'],{useDurableCache:true,forceRecompile:true})).outcome,'patched','Current foreground source');
          release();await restore;await hydrationDeadline(i.waitForSnapshotHydration(),'Checkpoint interruption fallback');
          return {diagnostic:i.getSnapshotHydrationDiagnostics(),full:i.fullSnapshotHydrated,windowRetired:i.snapshotForegroundWindow===null};
        }finally{release();i.indexedDb.open=open;i.indexedDb.iterateSnapshotPages=iterate;f.close();}
      })()`);
      assert.equal(result.diagnostic.firstFailure?.reason,'missing-chunk');
      assert.equal(result.diagnostic.attempts,2,'Exactly the active and checkpoint attempts; no borrowed retry');
      assert.equal(result.full,false);
      assert.equal(result.windowRetired,true);
    });

    for (const mutation of ['second-file-commit','physical-replacement','stat','membership','folder','attachment','policy-ABA','unload','purge','second-restore','watchdog-progress']) {
      await t.test(`a held second attempt remains fenced after ${mutation}`, /** Retire a new candidate independently of the first failure and its public wait. */ async () => {
        const result=await browser.evaluate(`(async()=>{
          const mutation='${mutation}',f=await hydrationWorkFixture('guards-retry-'+mutation,32,0,'eager',true),index=f.index;
          const hold=holdHydrationOpen(index,'pages'),open=index.indexedDb.open;
          let enter,release,held=false,quietProgress=null;const entered=new Promise(/** Report actual second-reader entry. */ resolve=>enter=resolve),gate=new Promise(/** Independent cleanup owns release. */ resolve=>release=resolve);
          index.indexedDb.open=/** Hold only the new candidate, retaining its original storage promise/result. */ async function(...args){
            const value=await open.apply(this,args);
            if(!held&&index.getSnapshotHydrationDiagnostics().attempts===2){held=true;enter();await gate;}return value;
          };
          try{
            const restore=index.restoreIndexedDbSnapshot(['Hub.md']);await hydrationDeadline(hold.entered,'First candidate');f.releaseSources();
            await index.patchMarkdownPaths(['Hub.md'],{useDurableCache:true,forceRecompile:true});
            if(mutation==='watchdog-progress'){
              await hydrationDeadline(index.sourceAcquisition.flush(),'Real source closure');
              quietProgress=index.getSnapshotHydrationDiagnostics().lastProgressAt;
              await new Promise(/** Cross a real clock tick without advancing source or decoder work. */ resolve=>setTimeout(resolve,20));
            }
            hold.release();await hydrationDeadline(entered,'Second candidate');await restore;
            if(mutation==='watchdog-progress')equal(index.getSnapshotHydrationDiagnostics().lastProgressAt,quietProgress,'Retry admission does not credit empty progress or extend the watchdog');
            const waiting=index.waitForSnapshotHydration(),publication=index.publicationRevision;
            if(mutation==='second-file-commit') await index.patchMarkdownPaths(['Hub.md'],{useDurableCache:true,forceRecompile:true});
            if(mutation==='physical-replacement'){const file=new ContributorFile(f.file.path);file.stat={...f.file.stat};file.parent=f.file.parent;f.f.files.set(file.path,file);}
            if(mutation==='stat') f.file.stat.mtime++;
            if(mutation==='membership') f.f.add('New.md','');
            if(mutation==='folder') {const folder=new ContributorFolder();folder.path='New folder';folder.name='New folder';const get=f.f.app.vault.getRoot;f.f.app.vault.getRoot=/** Expose changed membership through the production inventory's actual tree input. */ ()=>{const root=get();root.children.push(folder);return root;};}
            if(mutation==='attachment') f.f.add('New.png','');
            if(mutation==='policy-ABA'){f.settings.hierarchy.parents.push('Changed');index.invalidateSemanticPolicy();f.settings.hierarchy.parents.pop();}
            if(mutation==='unload') index.destroy();
            if(mutation==='purge') await index.purgePersistentIndexCache();
            let second;
            if(mutation==='second-restore') second=index.restoreIndexedDbSnapshot(['Hub.md']);
            if(['policy-ABA','unload','purge','second-restore'].includes(mutation)) equal((await hydrationDeadline(waiting,'Public cancellation')).restored,false,'Old public wait settles while storage is held');
            release();await hydrationDeadline(waiting,'Retired candidate');
            if(second){await second;await hydrationDeadline(index.waitForSnapshotHydration(),'New restore');}
            return {full:index.fullSnapshotHydrated,diagnostic:index.getSnapshotHydrationDiagnostics(),windowRetired:index.snapshotForegroundWindow===null,publication,finalPublication:index.publicationRevision};
          }finally{release();index.indexedDb.open=open;hold.restore();f.close();}
        })()`);
        assert.equal(result.windowRetired,true,JSON.stringify(result));
        if(mutation!=='second-restore') {
          assert.equal(result.full,mutation==='watchdog-progress',JSON.stringify(result));
          assert.equal(result.diagnostic.attempts,2,'Further changes never trigger a third attempt');
        }else assert.ok(result.diagnostic.run>1,'A new restore owns independent diagnostics');
      });
    }

    for (const phase of ['pages','relations','evidence']) {
      await t.test(`${phase} transaction completion revalidates settings before decoding returned chunks`, async () => {
        assert.equal(await browser.evaluate(`(async()=>{
          const f=await hydrationWorkFixture('guards-transaction-${phase}',1024,128),index=f.index;
          const owner=index.indexedDb,open=owner.openTransaction;
          let enter,release,held=false;
          const entered=new Promise(resolve=>enter=resolve),gate=new Promise(resolve=>release=resolve);
          const native=Object.getOwnPropertyDescriptor(IDBTransaction.prototype,'oncomplete');
          owner.openTransaction=function(...args){
            const tx=open.apply(this,args);
            if(!held && index.getSnapshotHydrationDiagnostics().phase==='${phase}' && args[1]==='snapshotChunks'){
              held=true;
              // Retain the actual transaction/request results. Only completion delivery is paused,
              // so the production reader must validate its values after transactionDone awaits.
              Object.defineProperty(tx,'oncomplete',{configurable:true,get(){return native.get.call(this);},set(callback){
                native.set.call(this,function(event){enter();gate.then(()=>callback.call(tx,event));});
              }});
            }
            return tx;
          };
          try {
            const restore=index.restoreIndexedDbSnapshot(['Hub.md']);
            await hydrationDeadline(entered,'Transaction completion hold');
            const state=index.state,revision=index.publicationRevision,processed=index.getSnapshotHydrationDiagnostics()['${phase}'];
            f.settings.hierarchy.parents.push('Changed');release();await restore;
            equal((await index.waitForSnapshotHydration()).restored,false,'Returned transaction cannot adopt old policy');
            equal(index.getSnapshotHydrationDiagnostics()['${phase}'],processed,'No returned stale record decoded');
            equal(index.state===state,true,'No stale graph publication');equal(index.publicationRevision,revision,'Revision retained');
            return true;
          } finally {owner.openTransaction=open;release?.();f.close();}
        })()`), true);
      });
    }

    for (const phase of ['pages','relations','evidence','promote']) {
      await t.test(`${phase} progress reentry cannot publish the captured policy after an in-place edit`, async () => {
        assert.equal(await browser.evaluate(`(async()=>{
          const f=await hydrationWorkFixture('guards-progress-${phase}',1024,128),index=f.index;let changed=false,visible,revision,notificationPhase;
          // The phase owner receives the new phase before the index's passive diagnostic mirror.
          f.plugin.startupDiagnostics={phase:(_,phase)=>notificationPhase=phase,count(){},processed(){},mark(){},/** Preserve the passive work-counter contract during reentry. */recordWork(){}};
          f.plugin.notifyStartupProgress=()=>{
            const d=index.getSnapshotHydrationDiagnostics();
            if(!changed && notificationPhase==='${phase}' && ('${phase}'==='promote' || d['${phase}']>=256)){
              changed=true;visible=index.state;revision=index.publicationRevision;f.settings.hierarchy.parents.push('Changed');
            }
          };
          try {
            await index.restoreIndexedDbSnapshot(['Hub.md']);
            equal((await index.waitForSnapshotHydration()).restored,false,'Policy edit rejects promotion');
            ok(changed,'Actual progress callback exercised');equal(index.state===visible,true,'Retain published generation');
            equal(index.publicationRevision,revision,'No late promotion');equal(index.fullSnapshotHydrated,false,'Not complete');
            return true;
          } finally {f.plugin.notifyStartupProgress=undefined;f.close();}
        })()`), true);
      });
    }

    await t.test('legacy cursors retain full value validation on each host continuation', async () => {
      assert.equal(await browser.evaluate(String.raw`(async()=>{
        const f=await fixture('guards-legacy'),generation='legacy';let changed=false,calls=0,visits=0;
        try {
          const db=await f.cache.open();
          await edit(db,['pages'],tx=>{for(let n=0;n<3;n++)tx.objectStore('pages').put({generation,path:'P'+n,value:{path:'P'+n}});});
          const current=()=>{calls++;return !changed;};
          const okRead=await f.cache.iterateSnapshotPages({schema:2,generation},()=>{visits++;changed=true;},current,undefined,()=>true);
          equal(okRead,false,'Legacy full guard survives an independently cheap record capability');
          equal(visits,1,'Next cursor callback cannot use retired policy');ok(calls>=2,'Full value checks on host callbacks');
          return true;
        } finally {f.close();}
      })()`), true);
    });
  } finally { await browser.cleanup(); }
});
