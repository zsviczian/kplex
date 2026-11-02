/** Admission regressions invoke the complete production plugin methods. Phase spies deliberately
 * control existing owners; actual dormant GraphIndex I/O is observed separately below. */
import assert from 'node:assert/strict';

export async function runStartupAdmission({KplexPlugin,GraphIndex,app,settings,TFile,TFolder,fixtureEvents}) {
  let cases=0;
  const settle=async()=>{for(let n=0;n<12;n++)await Promise.resolve()};
  const gate=()=>{let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve}};
  for(const mode of ['eager','on-demand'])for(const warm of [false,true])for(const device of ['desktop','tablet','mobile'])for(const enabled of [false,true])for(const urlIndexingMode of ["on-demand","background"]){
    const p=new KplexPlugin(),counts={catalog:0,restore:0,initial:0,urls:0,admit:0},hold=gate();let urlsStarted=false;
    p.layoutReady=true;p.startupIndexPolicy={device,beforeView:enabled,mode};
    p.index={isOnDemandMode:()=>mode==='on-demand',admitPreparation(){counts.admit++},async startBackgroundUrlIndex(){if(!urlsStarted){urlsStarted=true;counts.urls++;}return true;},
      async primePhysicalSearchCatalog(){counts.catalog++;await hold.promise},
      async restorePersistedSnapshot(){counts.restore++;return {restored:warm,fresh:warm}},
      getRestoreInventorySourceRevision:()=>0,withForegroundPriority:work=>work(),publishHostMetadataPreview:async()=>{}};
    p.settings={...settings,indexingMode:mode,urlIndexingMode,lastActivePath:'A.md',navigationHistory:['A.md'],pinnedNodes:['B.md']};
    p.startupGraphSeedPaths=()=>['A.md'];p.refreshBookmarkedEntryPoints=async()=>{};
    p.registerReactiveIndexListeners=()=>{};p.ensureInitialIndex=async()=>{counts.initial++;p.initialIndexComplete=true;if(mode==='eager')void p.index.startBackgroundUrlIndex();};
    p.notifyIndexStatus=()=>{};p.performRebuild=async()=>{};p.restorePersistedSidecar=async()=>{};
    p.hasVisibleKplexSurface=()=>false;
    p.index.cancelRebuild=()=>{};p.index.cancelPendingPersistence=()=>{};
    p.prepareIndexIfRequested();
    await settle();
    assert.deepEqual(counts,enabled?{catalog:1,restore:0,initial:0,urls:mode==='on-demand'?1:0,admit:1}:{catalog:0,restore:0,initial:0,urls:0,admit:0});
    const first=p.onKplexViewOpened(),second=p.onKplexViewOpened();
    await settle();assert.equal(counts.catalog,1,'Concurrent views join one admitted session');
    assert.equal(counts.restore,0,'Held search owner cannot be silently bypassed');
    hold.resolve();await Promise.all([first,second]);
    assert.equal(counts.restore,1);assert.equal(counts.urls,1);assert.equal(counts.admit,1);
    p.onKplexViewClosed();p.onKplexViewClosed();
    await p.onKplexViewOpened();assert.equal(counts.restore,1,'Reopening cannot replay completed restoration');cases++;
  }
  // A pending owner can reenter through notifications; admission must already have its task.
  {
    const p=new KplexPlugin();let catalogs=0,notifies=0;
    p.layoutReady=true;p.index={isOnDemandMode:()=>true,admitPreparation(){},async startBackgroundUrlIndex(){},async primePhysicalSearchCatalog(){catalogs++},
      async restorePersistedSnapshot(){return {restored:false,fresh:false}},getRestoreInventorySourceRevision:()=>0};
    p.startupGraphSeedPaths=()=>[];p.registerReactiveIndexListeners=()=>{};p.ensureInitialIndex=async()=>{};
    p.hasVisibleKplexSurface=()=>false;p.notifyIndexStatus=()=>{if(!notifies++)void p.startIndexPreparation()};
    await p.startIndexPreparation();assert.equal(catalogs,1);cases++;
  }
  // Early native opening is remembered without blocking native reveal or starting broad work.
  {
    const p=new KplexPlugin();p.layoutReady=false;p.restorePersistedSidecar=async()=>{};
    let starts=0;p.startIndexPreparation=async()=>{starts++};
    p.startupIndexPolicy={device:'tablet',beforeView:false,mode:'on-demand'};
    await p.onKplexViewOpened();assert.equal(starts,0);assert.equal(p.indexViewOpened,true);
    p.layoutReady=true;p.prepareIndexIfRequested();await settle();assert.equal(starts,1);cases++;
  }
  // A real explicit invocation admits closed work; mere method availability and passive reads do not.
  {
    const p=new KplexPlugin();p.layoutReady=true;let starts=0,builds=0;
    p.startIndexPreparation=async()=>{starts++;p.indexPreparationAdmitted=true};p.performRebuild=async()=>{builds++};
    p.index={isOnDemandMode:()=>false,isFullSnapshotHydrated:()=>true,startBackgroundUrlIndex:async()=>true};p.notifyIndexStatus=()=>{};
    await p.rebuildIndex(false,false,'interval');assert.equal(starts,0);
    await p.rebuildIndex(true,true,'ontology-discovery');assert.equal(starts,1);assert.equal(builds,1);cases++;
  }
  // The first explicit rebuild supplies initial work itself, rather than building twice.
  {
    const p=new KplexPlugin();p.layoutReady=true;let initialBuilds=0,explicitBuilds=0;
    p.index={admitPreparation(){},async startBackgroundUrlIndex(){},async primePhysicalSearchCatalog(){},
      async restorePersistedSnapshot(){return {restored:false,fresh:false}},getRestoreInventorySourceRevision:()=>0,
      isOnDemandMode:()=>false,isFullSnapshotHydrated:()=>true};
    p.startupGraphSeedPaths=()=>[];p.registerReactiveIndexListeners=()=>{};
    p.ensureInitialIndex=async()=>{initialBuilds++};p.performRebuild=async()=>{explicitBuilds++};
    p.hasVisibleKplexSurface=()=>false;p.notifyIndexStatus=()=>{};
    await p.rebuildIndex(true,true,'ontology-discovery');
    assert.equal(initialBuilds,0,'A first explicit rebuild must not first run an ordinary initial build');
    assert.equal(explicitBuilds,1);assert.equal(p.initialIndexComplete,true,'Successful explicit preparation also establishes initial readiness');cases++;
  }
  // Successful search work survives a failed restore; only a later genuine request retries storage.
  {
    const p=new KplexPlugin();p.layoutReady=true;let catalogs=0,restores=0;
    p.index={isOnDemandMode:()=>true,admitPreparation(){},async startBackgroundUrlIndex(){},async primePhysicalSearchCatalog(){catalogs++},
      async restorePersistedSnapshot(){if(!restores++)throw Error('Storage unavailable');return {restored:false,fresh:false}},getRestoreInventorySourceRevision:()=>0};
    p.startupGraphSeedPaths=()=>[];p.registerReactiveIndexListeners=()=>{};p.ensureInitialIndex=async()=>{};
    p.hasVisibleKplexSurface=()=>false;p.notifyIndexStatus=()=>{};
    await assert.rejects(p.startIndexPreparation(),/Storage unavailable/);await settle();
    assert.equal(p.indexPreparationTask,null);await p.startIndexPreparation();
    assert.equal(catalogs,1);assert.equal(restores,2);cases++;
  }
  // Unload fences both not-yet-started admission and a late held catalog completion.
  for(const held of [false,true]){
    const p=new KplexPlugin(),hold=gate();let catalogs=0,restores=0;
    p.layoutReady=true;p.index={isOnDemandMode:()=>true,admitPreparation(){},async startBackgroundUrlIndex(){},async primePhysicalSearchCatalog(){catalogs++;if(held)await hold.promise},
      async restorePersistedSnapshot(){restores++;return {restored:false,fresh:false}}};
    p.notifyIndexStatus=()=>{};
    const pending=p.startIndexPreparation();if(held)await settle();p.unloading=true;hold.resolve();await pending;
    assert.equal(catalogs,Number(held));assert.equal(restores,0,'Retired startup cannot begin hydration');cases++;
  }
  // Waiting for a view is distinct from an early opening still awaiting host layout readiness.
  {
    const p=new KplexPlugin();p.startupIndexPolicy={device:'tablet',beforeView:false,mode:'on-demand'};
    assert.equal(p.computeIndexStatusFacts(null,false).phase,'deferred');
    p.indexViewOpened=true;assert.equal(p.computeIndexStatusFacts(null,false).phase,'preparing');
    p.indexViewOpened=false;p.explicitIndexPreparationRequested=true;
    assert.equal(p.computeIndexStatusFacts(null,false).phase,'preparing');cases++;
  }
  // Actual GraphIndex demand, settings, structure and URL entry points must do no dormant I/O.
  for(const mode of ['eager','on-demand']){
    const counts={catalog:0,bodies:0,storage:0},files=new Map([['A.md',new TFile('A.md',1)]]);
    const host={...app,vault:{...app.vault,...fixtureEvents(),
      getFiles(){counts.catalog++;return [...files.values()]},getMarkdownFiles(){counts.catalog++;return [...files.values()]},
      getFileByPath:path=>files.get(path)??null,cachedRead:async()=>{counts.bodies++;return 'changed'},read:async()=>{counts.bodies++;return 'changed'}},
      metadataCache:{...app.metadataCache,...fixtureEvents()}};
    const p=new KplexPlugin();p.app=host;p.settings={...settings,indexingMode:mode,lastActivePath:'A.md',navigationHistory:['A.md'],pinnedNodes:['A.md']};
    p.startupIndexPolicy={device:'desktop',beforeView:false,mode};
    const i=new GraphIndex(p,host,true,mode);p.index=i;
    p.settings.indexingMode=mode==='eager'?'on-demand':'eager';
    assert.equal(i.isOnDemandMode(),mode==='on-demand','Captured mode outranks legacy settings and later edits');p.register=()=>{};p.notifyIndexStatus=()=>{};
    for(const key of ['readSnapshotCatalog','readUrlOwnerPage','loadParsedBodies','deleteUrlOwner'])i.indexedDb[key]=async()=>{counts.storage++;throw Error('Dormant I/O')};
    const originalTimeout=window.setTimeout,originalNow=Date.now;let timers=0;
    window.setTimeout=(...args)=>{timers++;return originalTimeout(...args)};
    try{
      p.installPreRestoreChangeFence();i.primeSavedNavigation(['A.md']);
      const release=i.acquireSemanticDemand('A.md');
      await i.primePhysicalSearchCatalog();await i.startBackgroundUrlIndex();await i.restorePersistedSnapshot(['A.md']);
      await i.initializeOnDemandBaseline();await i.refreshUrlOwner('A.md');
      for(let n=0;n<3;n++){host.vault.trigger('modify',files.get('A.md'));host.metadataCache.trigger('changed',files.get('A.md'));}
      for(let n=0;n<100;n++){
        const item=new TFile('Transient.md',1);files.set(item.path,item);host.vault.trigger('create',item);await i.refreshUrlOwner(item.path);
        files.delete(item.path);host.vault.trigger('delete',item);await i.refreshUrlOwner(item.path);
      }
      const child=new TFile('Transient/Child.md',1);files.set(child.path,child);host.vault.trigger('create',child);await i.refreshUrlOwner(child.path);
      files.delete(child.path);host.vault.trigger('delete',new TFolder('Transient'));
      assert.equal(p.preRestoreMarkdownPaths.size,1,'Deleted transient paths cannot become a dormant event history');
      assert.equal(i.urlOwnerEvents.size,1,'URL fences retain current owners, not every deleted identity');
      i.invalidateHostStructure();i.invalidateSemanticPolicy();await i.refreshSemanticSettings();
      p.settings.showFullTagName=!p.settings.showFullTagName;await i.refreshPresentationSettings();
      const status=p.computeIndexStatusFacts(null,false);assert.equal(status.phase,'deferred');assert.equal(status.upToDate,false);
      await settle();release();
      assert.deepEqual(counts,{catalog:0,bodies:0,storage:0});
      assert.equal(i.sourceAcquisition.getActivityState().pendingKnown,1,'Repeated changes coalesce in the existing source owner');
      Date.now=()=>originalNow()+12*60*60*1000;
      assert.equal(p.computeIndexStatusFacts(null,false).phase,'deferred','Twelve virtual dormant hours do not time out');
      assert.equal(i.getSnapshotHydrationDiagnostics().phase,'idle');assert.equal(timers,0,'No dormant watchdog/retry timer');
      Date.now=originalNow;window.setTimeout=originalTimeout;
      assert.equal(i.sourceAcquisition.needsBodyRead(files.get('A.md')),true,'Equal-stat edits cannot reuse an old body after admission');
      assert.equal(i.sourceAcquisition.getCounters().vaultReads,0);
      assert.equal(i.sourceAcquisition.getCounters().parses,0);
      await i.sourceAcquisition.flush();
      cases++;
    }finally{Date.now=originalNow;window.setTimeout=originalTimeout;p.preRestoreListenerCleanup?.();i.destroy();}
  }
  return cases;
}
