/**
 * Real IndexedDB startup recovery through actual coordinator members and GraphIndex owners.
 * Native host facts and a deliberate optional snapshot-evidence fault are controlled; source
 * acquisition, persistence, semantic preparation and automatic notification are production code.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {contributorBrowserBundle, contributorBrowserInitialize} from './support/contributorBrowserFixture.mjs';
import {chromiumHarness} from './support/browserTypeScript.mjs';
import {hostOracle, collect} from './support/cachedSourceFixture.mjs';
import {fullCenterIndex, currentNeighborhoodView, centerGateSettings} from './support/requestedCenterGateFixture.mjs';
import {startupSourceCoordinatorSource} from './support/startupSourceCoordinator.mjs';

const bundle = await contributorBrowserBundle(['src/main.ts', 'src/index/GraphIndex.ts', 'src/index/GraphBuilder.ts',
  'src/index/IndexSnapshot.ts', 'src/core/graph/compiler.ts', 'src/adapters/obsidian/metadataSourceCollector.ts',
  'src/adapters/obsidian/ontologySourceCollector.ts', 'src/adapters/obsidian/startupDiagnostics.ts'], {'src/main.ts': startupSourceCoordinatorSource()});

for (const damage of ['missing', 'chunks']) test(`eager coordinator completes ${damage} graph recovery before declaring startup ready`, async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(`(async()=>{
      const assert=Object.assign((v,m)=>ok(v,m),{equal}),M=sourceModules,f=await fixture('eager-startup-${damage}');
      const collect=${collect.toString()},hostOracle=${hostOracle.toString()},fullCenterIndex=${fullCenterIndex.toString()};
      const currentNeighborhoodView=${currentNeighborhoodView.toString()},centerGateSettings=${centerGateSettings.toString()};
      let initial,index,oracle,release,unlock,restore;
      try {
        f.text=f.texts;f.app.vault.getName=()=> 'eager-startup-${damage}';
        f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??(path==='/'||path===''?f.app.vault.getRoot():null);
        f.add('A.md','Friends:: [[B]]');f.add('B.md','');f.add('Unvisited.md','Friends:: [[Ghost]]');
        await f.acquire();ok(await f.acquisition.reconcile(),'Durable source authority');
        const semantic={hierarchy:{hidden:[],parents:[],children:[],leftFriends:['Friends'],rightFriends:[],previous:[],next:[]},inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
        const view=centerGateSettings({showFolderNodes:false}),settings={indexingMode:'eager',...semantic,...view,lastActivePath:'A.md',pinnedNodes:[]};
        initial=await fullCenterIndex(M,f,await hostOracle(f,[...f.files.keys()],semantic,view,true),semantic,view);
        if(${JSON.stringify(damage)}==='chunks'){
          ok(await f.cache.writeSnapshot({createdAt:Date.now(),urlAliasVersion:2,vaultSignature:M.computeVaultSignature(f.app),settingsSignature:M.computeIndexSettingsSignature(settings),discoveredFields:[]},
            [...initial.state.pages.values()].map(page=>M.persistedPageFromGraphPage(page)),[...initial.state.evidence.declarations()].map(item=>M.persistedDeclarationFromEvidence(item))),'Complete snapshot saved');
          const db=await f.cache.open();await edit(db,['snapshotChunks'],tx=>tx.objectStore('snapshotChunks').clear());
        }
        initial.destroy();initial=null;f.acquisition.close();const readsBefore=f.reads.length;
        const p=new M.StartupSourceCoordinator();Object.assign(p,{app:f.app,settings,layoutReady:true,indexPreparationAdmitted:true,
          notifyIndexStatus(){},hasVisibleKplexSurface:()=>false,refreshBookmarkedEntryPoints:async()=>{},startupGraphSeedPaths:()=>['A.md']});
        index=new M.GraphIndex(p,f.app);p.index=index;index.scheduleOrphanCleanup=()=>{};
        release=index.acquireSemanticDemand('A.md');ok((await index.restorePersistedSnapshot(['A.md'])).restored,'Physical recovery navigable');
        await index.waitForSnapshotHydration();ok(index.hasSourceBackedStartup(),'Recovery initially source-backed');
        let entered;const reached=new Promise(done=>entered=done),held=new Promise(done=>unlock=done);
        const patch=M.GraphBuilder.prototype.patchMarkdownFiles;
        M.GraphBuilder.prototype.patchMarkdownFiles=async function(state,files,options){if(options?.beforeFile){entered();await held;}return patch.call(this,state,files,options);};
        restore=()=>M.GraphBuilder.prototype.patchMarkdownFiles=patch;
        const adoption=p.finishStartupIndexPreparation();
        // Bound the observation of the real progressive P4 entry: the old coordinator returned
        // immediately after vocabulary adoption, so this is also the failing-before assertion.
        const enteredBuild=await Promise.race([reached.then(()=>true),adoption.then(()=>false)]);
        ok(enteredBuild,'Eager startup must schedule complete relationships, not stop at node vocabulary');
        equal(p.initialIndexComplete,false,'Incomplete graph cannot declare startup ready');
        const before=index.getSourceAcquisitionCounters(),foreground=index.acquireSemanticDemand('Unvisited.md');
        try{await index.ensureSemanticScope('Unvisited.md');ok(index.get('Unvisited.md').neighbours.get('Ghost')?.isLeftFriend,'Unvisited current-node request completes before held P4 ingestion');}finally{foreground();}
        equal(index.getSourceAcquisitionCounters().vaultReads,before.vaultReads,'Foreground uses durable source facts');
        unlock();await adoption;restore();restore=null;
        ok(p.initialIndexComplete,'Eager startup completes');ok(index.isFullSnapshotHydrated(),'Complete graph published');
        ok(!index.hasSourceBackedStartup(),'Recovered graph no longer depends on per-center reconstruction');
        equal(index.publicApiCoverage(),{scope:'global',complete:true,pending:false},'Actual global read coverage');
        oracle=await fullCenterIndex(M,f,await hostOracle(f,[...f.files.keys()],semantic,view,true),semantic,view);
        for(const path of f.files.keys())equal(currentNeighborhoodView(index,path),currentNeighborhoodView(oracle,path),'Recovered full graph/provenance/gate parity: '+path);
        const counts=index.getSourceAcquisitionCounters(),diagnostics=index.getSemanticPreparationDiagnostics();
        const second=index.acquireSemanticDemand('B.md');try{await index.ensureSemanticScope('B.md');}finally{second();}
        equal(index.getSourceAcquisitionCounters(),counts,'Navigation adds no source work');
        equal(index.getSemanticPreparationDiagnostics().requested,diagnostics.requested,'Unvisited navigation adds no local semantic request');
        equal(counts.vaultReads,0,'Recovery never rereads unchanged Markdown');equal(counts.parses,0,'Recovery never reparses unchanged Markdown');
        equal(f.reads.slice(readsBefore),[],'No native body reads hidden outside the source counters');
        return true;
      }finally{unlock?.();restore?.();release?.();oracle?.destroy();initial?.destroy();index?.destroy();f.close();}
    })()`), true);
  } finally {await browser.cleanup();}
});

test('source closure publishes terminal progress inside the per-note throttle window without demanded scopes', /** A real inventory release must notify even when semantic recovery has nothing to publish. */ async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(`(async()=>{
      const M=sourceModules,f=await fixture('source-terminal-progress');
      const centerGateSettings=${centerGateSettings.toString()};
      let index;
      try {
        f.add('A.md','');await f.acquire();f.acquisition.close();
        f.app.vault.getName=()=> 'source-terminal-progress';
        const progress=new M.StartupDiagnostics();progress.begin(false);
        const notifications=[],p=new M.StartupSourceCoordinator();
        Object.assign(p,{app:f.app,settings:{...centerGateSettings(),lastActivePath:'',pinnedNodes:[],tagStyleList:[],
          inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:false,
          hierarchy:{hidden:[],parents:[],children:[],leftFriends:[],rightFriends:[],previous:[],next:[],exclusions:[]}},
          startupDiagnostics:progress,lastStartupProgressNotification:performance.now()+10000,
          notifyIndexStatus(){notifications.push({phase:progress.progress('source')?.phase,active:!!index.sourceAcquisition.inventory});}});
        index=new M.GraphIndex(p,f.app,true,'eager');p.index=index;index.preparationDeferred=false;
        p.notifyStartupProgress();equal(notifications.length,0,'Ordinary progress is still throttled');
        index.sourceAcquisition.enableInventory();
        ok(await index.sourceAcquisition.reconcile(),'Actual source authority closes');
        equal(notifications,[{phase:'complete',active:false}],'Final notification bypasses throttling after inventory ownership releases');
        equal(index.semanticPreparationTasks.size,0,'No semantic publication or demand supplied the missing update');
        return true;
      } finally {index?.destroy();f.close();}
    })()`), true);
  } finally {await browser.cleanup();}
});

for (const fault of ['metadata', 'evicted-unsaved']) test(`real ${fault} recovery automatically completes the stranded startup coordinator`, /** Recover through native metadata notification, never a manual second adoption call. */ async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(`(async()=>{
      const assert=Object.assign((v,m)=>ok(v,m),{equal}),M=sourceModules,f=await fixture('coordinator-source-recovery-${fault}'),fault=${JSON.stringify(fault)};
      const collect=${collect.toString()},hostOracle=${hostOracle.toString()},fullCenterIndex=${fullCenterIndex.toString()},centerGateSettings=${centerGateSettings.toString()};
      let initial,index,release,resume,restoreTransaction;
      const until=async(predicate,message)=>{const end=Date.now()+10000;while(!predicate()){ok(Date.now()<end,message);await new Promise(done=>setTimeout(done,20));}};
      try {
        f.text=f.texts;f.add('A.md','Friends:: [[B]]');f.add('B.md','');
        f.app.vault.getName=()=> 'coordinator-source-recovery-${fault}';
        f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??(path==='/'||path===''?f.app.vault.getRoot():null);
        await f.acquire();ok(await f.acquisition.reconcile(),'Seed real neutral source authority');
        const semantic={hierarchy:{hidden:[],parents:[],children:[],leftFriends:['Friends'],rightFriends:[],previous:[],next:[]},inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
        initial=await fullCenterIndex(M,f,await hostOracle(f,[...f.files.keys()],semantic,{noteTypeField:'Type',primaryTagField:'Style'},true),semantic,centerGateSettings({showFolderNodes:false}));
        const settings={...initial.plugin.settings,lastActivePath:'A.md',pinnedNodes:[]};
        ok(await f.cache.writeSnapshot({createdAt:Date.now(),urlAliasVersion:2,vaultSignature:M.computeVaultSignature(f.app),settingsSignature:M.computeIndexSettingsSignature(settings),discoveredFields:[]},
          [...initial.state.pages.values()].map(page=>M.persistedPageFromGraphPage(page)),[...initial.state.evidence.declarations()].map(item=>M.persistedDeclarationFromEvidence(item))),'Seed genuine complete warm acceleration');
        initial.destroy();initial=null;f.acquisition.close();
        const p=new M.StartupSourceCoordinator();Object.assign(p,{app:f.app,settings,layoutReady:true,indexPreparationAdmitted:true,
          notifyIndexStatus(){},hasVisibleKplexSurface:()=>false,refreshBookmarkedEntryPoints:async()=>{},startupGraphSeedPaths:()=>['A.md'],
          performRebuild:async()=>{throw Error('Recovery cannot force a full build');}});
        index=new M.GraphIndex(p,f.app);p.index=index;index.scheduleOrphanCleanup=()=>{};
        const readyInventory=[],ready=index.sourceAcquisition.inventoryReady;
        index.sourceAcquisition.inventoryReady=/** Observe the relevant producer's actual release order. */function(...args){readyInventory.push(!!this.inventory);return ready.apply(this,args);};
        const gate=new Promise(done=>{resume=done}),flush=index.sourceAcquisition.flush,reconcile=index.sourceAcquisition.reconcile;
        index.sourceAcquisition.flush=async function(...args){await gate;return flush.apply(this,args);};
        index.sourceAcquisition.reconcile=async function(...args){await gate;return reconcile.apply(this,args);};
        index.indexedDb.iterateSnapshotEvidence=async()=>{throw Error('Owned optional evidence fault');};
        release=index.acquireSemanticDemand('A.md');ok((await index.restorePersistedSnapshot(['A.md'])).restored,'Early preview survives');
        equal((await index.waitForSnapshotHydration()).restored,false,'Optional evidence failure remains incomplete');
        ok(index.hasSourceBackedStartup(),'Actual warm recovery route retained');
        const metadata=f.metadata.get('B.md'),repository=index.sourceAcquisition.repository,transaction=repository.transaction;
        let rejecting=fault==='evicted-unsaved';
        if(fault==='metadata')f.metadata.delete('B.md');
        else{
          repository.transaction=/** Inject a storage error at the existing per-source write boundary. */function(...args){
            if(rejecting&&args[2]==='readwrite'&&args[3]==='B.md')return Promise.reject(new DOMException('Owned quota fault','QuotaExceededError'));
            return transaction.apply(this,args);
          };
          restoreTransaction=()=>{rejecting=false;repository.transaction=transaction;};
          f.texts.set('B.md','Status:: recovering');f.app.vault.trigger('modify',f.files.get('B.md'));
        }
        index.sourceAcquisition.flush=flush;index.sourceAcquisition.reconcile=reconcile;resume();
        let attempts=0;const adopt=index.adoptStartupSources;
        index.adoptStartupSources=function(...args){attempts++;return adopt.apply(this,args);};
        await p.finishStartupIndexPreparation();
        equal(p.initialIndexComplete,false,'Failed source prerequisites cannot establish completion');
        if(fault==='metadata')ok(index.getSourceAcquisitionCounters().pendingMetadata>0,'Actual source reconciliation found missing metadata');
        else{
          ok(repository.unsaved.has('B.md'),'Actual write failure leaves an unsaved source mask');
          // Inject the exact post-eviction state, not a new eviction algorithm or budget. Recovery
          // must reacquire through the source owner, since repository memory replay has no payload.
          const retained=repository.memory.get('B.md');
          if(retained){repository.memoryBytes-=retained.bytes;repository.memory.delete('B.md');}
          ok(repository.unsaved.has('B.md')&&!repository.memory.has('B.md'),'Evicted source remains explicitly masked');
        }
        equal(attempts,1,'The actual coordinator attempted adoption once');
        ok(index.get('A.md').neighbours.get('B.md')?.isLeftFriend,'Early coherent relation remains navigable');
        restoreTransaction?.();f.metadata.set('B.md',metadata);f.app.metadataCache.trigger('changed',f.files.get('B.md'));
        await until(()=>index.sourceAcquisition.hasSemanticDependencies()&&!index.hasPendingSemanticPreparation(),'Real source/semantic prerequisite recovery did not close');
        await until(()=>p.initialIndexComplete,'Recovered owners did not automatically resume initial adoption');
        equal(attempts,2,'Genuine recovery coalesces to one second attempt');
        ok(readyInventory.length>0&&readyInventory.every(active=>!active),'Recovery notification follows inventory owner release');
        equal(index.getSemanticPreparationDiagnostics().fullBuilds,1,'Recovered eager startup completes the global graph once');
        await until(()=>!index.publicApiCoverage().pending,'Recovered graph/event publication did not settle');
        equal(index.publicApiCoverage(),{scope:'global',complete:true,pending:false},'Recovery cannot finish with cached-only coverage');
        equal(index.getSourceAcquisitionCounters().vaultReads,fault==='evicted-unsaved'?1:0,'Only the genuinely edited owner needs native input');
        equal(repository.unsaved.size,0,'Only actual durable source recovery clears the mask');
        ok(index.get('A.md').neighbours.get('B.md')?.isLeftFriend,'Recovered canonical relation survives');
        return true;
      } finally {restoreTransaction?.();resume?.();release?.();initial?.destroy();index?.destroy();f.close();}
    })()`), true);
  } finally { await browser.cleanup(); }
});
