/**
 * Startup convergence regressions drive the production plugin coordinator and GraphIndex's
 * source-ready consumer. Controlled prerequisite gates isolate liveness from acquisition cost;
 * these cases do not establish native timing or storage recovery correctness.
 */
import assert from 'node:assert/strict';

/** Drain bounded promise continuations without advancing any watchdog or inventory timer. */
async function settle() { for (let n = 0; n < 80; n++) await Promise.resolve(); }

/** Supply an already-restored source-backed baseline to the actual production coordinator. */
function fixture({KplexPlugin,GraphIndex,app,settings,mode='eager'}) {
  const p = new KplexPlugin();
  p.app = app; p.settings = { ...settings, indexingMode:mode, lastActivePath: '' };
  p.layoutReady = true; p.indexPreparationAdmitted = true;
  p.startupIndexPolicy = { device: 'desktop', beforeView: true, mode };
  p.notifyIndexStatus = /** Observe readiness independently of native product UI. */ () => {};
  p.hasVisibleKplexSurface = /** Closed startup remains authorized only by captured policy. */ () => false;
  p.startupGraphSeedPaths = /** No native workspace participates in this coordinator-only fixture. */ () => [];
  const i = new GraphIndex(p, app, true, mode); p.index = i;
  // The restore owner has already handed a source-backed baseline to the real coordinator.
  i.sourceBackedStartup = true;
  i.retryDemandedSemanticScopes = /** Controlled scope gates below isolate the notification owner. */ () => {};
  i.retrySourceNodeImpacts = /** Avoid unrelated presentation work in coordinator-only cases. */ () => {};
  i.retryUrlAliasUpgrade = /** Keep optional alias maintenance in its own regression inventory. */ () => {};
  const state = {authority:false, attempts:0, rebuilds:0, completeGraphs:0, maintenance:0};
  i.rebuild = /** Count eager completion separately from an unrelated fallback coordinator. */ async () => { state.completeGraphs++; return true; };
  i.sourceAcquisition.hasSemanticDependencies = /** Supply an explicit prerequisite without granting completion. */ () => state.authority;
  i.adoptStartupSources = /** Count actual coordinator attempts against the controlled prerequisite. */ async () => { state.attempts++; return state.authority; };
  i.sourceAcquisition.getMaintenanceRevision = /** Controlled meaningful host revision. */ () => state.maintenance;
  p.performRebuild = /** Detect any forbidden full-rebuild fallback. */ async () => { state.rebuilds++; };
  p.indexDirty = true; p.indexBacklogReasons.add('startup:no-snapshot');
  return {p,i,state,
    /** Use the existing production source-ready consumer. */ signal(){i.sourceAcquisition.inventoryReady();},
    /** Retire actual index resources. */ close(){i.destroy();}};
}

/** Exercise automatic recovery without calling adoption or reopening a view a second time. */
export async function runStartupSourceConvergence({ KplexPlugin, GraphIndex, app, settings }) {
  let cases = 0;
  const f=fixture({KplexPlugin,GraphIndex,app,settings}),{p,i,state}=f;
  try {
    await p.finishStartupIndexPreparation();
    assert.equal(state.attempts, 1);
    assert.equal(p.initialIndexComplete, false, 'Missing authority remains visibly incomplete');
    assert.equal(p.initialIndexTask, null, 'An incomplete attempt releases its existing owner');
    state.authority = true;
    // This is the existing production notification, not a manual second adoption call.
    i.sourceAcquisition.inventoryReady();
    await settle();
    assert.equal(p.initialIndexComplete, true,
      'Recovered source authority must automatically resume the stranded startup coordinator');
    assert.equal(state.attempts, 2, 'Recovery has one coalesced adoption owner');
    assert.equal(state.rebuilds, 0, 'Recovery does not force a full rebuild');
    assert.equal(state.completeGraphs, 1, 'Eager recovery completes relationships before startup readiness');
    assert.equal(p.indexDirty, false, 'Only successful adoption retires the startup backlog');
    for (let n = 0; n < 20; n++) i.sourceAcquisition.inventoryReady();
    await settle();
    assert.equal(state.attempts, 2, 'Repeated ready notifications do not restart completed startup');
    cases++;
  } finally { i.destroy(); }
  /** Keep each lifecycle case isolated from prior readiness stamps and tasks. */
  const make=(mode='eager')=>fixture({KplexPlugin,GraphIndex,app,settings,mode});
  for(const retirement of ['unload','index','generation','hydration','source','policy','demand']){
    const f=make(),{p,i,state}=f;
    try{
      await p.finishStartupIndexPreparation();state.authority=true;f.signal();
      if(retirement==='unload')p.unloading=true;
      if(retirement==='index')p.index={};
      if(retirement==='generation')i.generation++;
      if(retirement==='hydration')i.snapshotHydrationRun++;
      if(retirement==='source')p.indexDirtyRevision++;
      if(retirement==='policy')i.semanticPolicyRevision++;
      if(retirement==='demand'){p.startupIndexPolicy.beforeView=false;p.openKplexViews=0;}
      await settle();assert.equal(state.attempts,1,retirement+' fences queued recovery');
      assert.equal(p.initialIndexComplete,false);cases++;
    }finally{p.index=i;f.close();}
  }
  {
    const f=make(),{p,i,state}=f;
    try{
      await p.finishStartupIndexPreparation();
      for(let n=0;n<20;n++)f.signal();await settle();assert.equal(state.attempts,1,'Absent authority cannot retry');
      state.authority=true;
      i.adoptStartupSources=/** Persistent failure cannot spin through unchanged ready notifications. */async()=>{state.attempts++;f.signal();return false;};
      for(let n=0;n<20;n++)f.signal();await settle();
      assert.equal(state.attempts,2);assert.equal(p.initialIndexComplete,false);assert.equal(p.initialSourceRecoveryTask,null);cases++;
    }finally{f.close();}
  }
  {
    const f=make(),{p,i,state}=f;let release;
    const hold=new Promise(/** Hold the initial adopter through a genuine recovery notification. */done=>{release=done;});
    try{
      i.adoptStartupSources=/** Preserve the first incomplete result even when a later prerequisite recovers. */async()=>{const n=++state.attempts;if(n===1){await hold;return false;}return state.authority;};
      const initial=p.finishStartupIndexPreparation();await settle();state.authority=true;
      for(let n=0;n<20;n++)f.signal();await settle();assert.equal(state.attempts,1,'Recovery joins the active initial owner');
      release();await initial;await settle();assert.equal(state.attempts,2);assert.equal(p.initialIndexComplete,true);cases++;
    }finally{release();f.close();}
  }
  {
    const f=make(),{p,i,state}=f;let release;
    const hold=new Promise(/** Hold a recovery attempt while a newer host observation arrives. */done=>{release=done;});
    try{
      await p.finishStartupIndexPreparation();state.authority=true;
      i.adoptStartupSources=/** Only the genuinely newer recovery may complete after interruption. */async()=>{const n=++state.attempts;if(n===2){await hold;return false;}return true;};
      f.signal();await settle();assert.equal(state.attempts,2);
      state.maintenance++;f.signal();await settle();release();await settle();
      assert.equal(state.attempts,3);assert.equal(p.initialIndexComplete,true);cases++;
    }finally{release();f.close();}
  }
  {
    const f=make(),{p,i,state}=f;
    try{
      await p.finishStartupIndexPreparation();p.startupIndexPolicy.beforeView=false;state.authority=true;
      f.signal();await settle();assert.equal(state.attempts,1,'Closed deferred policy retains incompleteness');
      p.startIndexPreparation=/** Reuse the completed restore through the normal next-open path. */async()=>{};
      p.rebuildIndex=/** No edit backlog is owed by this controlled fixture. */async()=>{};
      await p.onKplexViewOpened();assert.equal(state.attempts,2);assert.equal(p.initialIndexComplete,true);cases++;
    }finally{f.close();}
  }
  {
    const f=make('on-demand'),{p,i,state}=f;let baselines=0;
    try{
      p.startupGraphSeedPaths=/** No native seed is needed to test mode isolation. */()=>[];
      i.initializeOnDemandBaseline=/** Local incompleteness cannot start eager source adoption. */async()=>{baselines++;return false;};
      await p.finishStartupIndexPreparation();state.authority=true;f.signal();await settle();
      assert.equal(baselines,1);assert.equal(state.attempts,0);assert.equal(p.initialIndexComplete,false);cases++;
    }finally{f.close();}
  }
  {
    const f=make(),{p,state}=f,scheduled=[];
    try{
      await p.finishStartupIndexPreparation();p.indexDirtyRevision++;
      p.indexBacklogReasons.add('metadata:changed');p.dirtyMarkdownPaths.add('A.md');
      p.hasVisibleKplexSurface=/** A live surface owns the ordinary per-file reconciliation lane. */()=>true;
      p.scheduleRebuild=/** Observe normal backlog admission without substituting a full rebuild. */reason=>{scheduled.push(reason);};
      state.authority=true;f.signal();await settle();
      assert.equal(p.initialIndexComplete,true);assert.equal(p.indexDirty,true,'Recovery cannot clear a genuine edit backlog');
      assert.deepEqual([...p.dirtyMarkdownPaths],['A.md']);assert(p.indexBacklogReasons.has('metadata:changed'));
      assert.deepEqual(scheduled,['startup:post-initial-backlog']);assert.equal(state.rebuilds,0);cases++;
    }finally{f.close();}
  }
  {
    const f=make(),{p,i,state}=f;let release;
    const hold=new Promise(/** Hold actual semantic task ownership until a current publication is available. */done=>{release=done;});
    try{
      state.authority=true;i.preparationDeferred=false;i.fullSemanticPolicyRevision=-1;i.semanticDemandCounts.set('A.md',1);
      i.withForegroundPriority=/** Keep real semantic task/finalizer ordering while controlling its prerequisite. */work=>work();
      i.prepareSemanticScope=/** Publish the simulated current policy before the actual task finalizer. */async()=>{await hold;i.fullSemanticPolicyRevision=i.semanticPolicyRevision;i.fullSemanticMaintenanceRevision=state.maintenance;};
      i.adoptStartupSources=/** Source readiness alone cannot bypass requested semantics. */async()=>{state.attempts++;return state.authority&&!i.hasPendingSemanticPreparation();};
      const scope=i.ensureSemanticScope('A.md');await p.finishStartupIndexPreparation();f.signal();await settle();assert.equal(state.attempts,1);
      release();await scope;await settle();assert.equal(state.attempts,2);assert.equal(p.initialIndexComplete,true);cases++;
    }finally{release();f.close();}
  }
  return cases;
}
