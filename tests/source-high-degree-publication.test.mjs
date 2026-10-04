/** SI4-R3: independently stored source facts through real IDB and production semantic publication. */
import assert from "node:assert/strict";
import test from "node:test";
import { contributorBrowserBundle, contributorBrowserInitialize } from "./support/contributorBrowserFixture.mjs";
import { chromiumHarness } from "./support/browserTypeScript.mjs";
import { hostOracle, collect, semanticView } from "./support/cachedSourceFixture.mjs";
import { fullCenterIndex, currentNeighborhoodView, centerGateSettings } from "./support/requestedCenterGateFixture.mjs";

const bundle = await contributorBrowserBundle([
  "src/index/GraphIndex.ts", "src/index/GraphBuilder.ts", "src/index/CachedSourceSemantics.ts",
  "src/core/graph/compiler.ts", "src/core/graph/source.ts", "src/adapters/obsidian/metadataSourceCollector.ts",
  "src/adapters/obsidian/ontologySourceCollector.ts", "src/adapters/obsidian/hostLinkSourceCollector.ts",
]);

test("production root and nested folder centers retain host coordinates through settings publication", async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(`(async () => {
      const assert=Object.assign((v,m)=>ok(v,m),{equal}), M=sourceModules, f=await fixture('r3-folder-publication');
      const collect=${collect.toString()}, hostOracle=${hostOracle.toString()}, fullCenterIndex=${fullCenterIndex.toString()};
      const currentNeighborhoodView=${currentNeighborhoodView.toString()}, centerGateSettings=${centerGateSettings.toString()};
      let index,oracle;
      try {
        f.text=f.texts;const a=f.add('A.md',''),b=f.add('Nested/B.md',''),root=f.app.vault.getRoot(),folder=new window.ContributorFolder();
        root.path='/';folder.path=folder.name='Nested';folder.parent=root;folder.children=[b];b.parent=folder;root.children=[a,folder];
        f.app.vault.getRoot=()=>root;f.app.vault.getFolderByPath=path=>path==='/'||path===''?root:path==='Nested'?folder:null;
        await f.acquire();equal(await f.repository.completeLocalDependencyInventory(),'ready');
        f.acquisition.localDependenciesReady=f.acquisition.localDependencyAuthorityReady=true;
        const semantic={hierarchy:{hidden:[],parents:[],children:[],leftFriends:[],rightFriends:[],previous:[],next:[]},
          inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
        const presentation={noteTypeField:'Type',primaryTagField:'Style'},view=centerGateSettings();
        const initial=await hostOracle(f,['A.md','Nested/B.md'],semantic,presentation,true);
        index=await fullCenterIndex(M,f,initial,semantic,view);index.sourceAcquisition.close();index.sourceAcquisition=f.acquisition;
        const counters=f.acquisition.getCounters();
        for(const path of ['folder:/','folder:Nested']) {
          index.plugin.settings.lastActivePath=path;const release=index.acquireSemanticDemand(path);
          index.plugin.settings.inverseInfer=!index.plugin.settings.inverseInfer;index.invalidateSemanticPolicy();await index.refreshSemanticSettings();
          equal(index.hasPendingSemanticPreparation(),false,'Native-shaped folder scope: '+JSON.stringify(index.getSemanticPreparationDiagnostics()));
          const expected=await hostOracle(f,['A.md','Nested/B.md'],{...semantic,inverseInfer:index.plugin.settings.inverseInfer},presentation,true);
          oracle=await fullCenterIndex(M,f,expected,index.plugin.settings,view);
          equal(currentNeighborhoodView(index,path),currentNeighborhoodView(oracle,path),'Full canonical folder neighborhood/gates');
          oracle.destroy();oracle=null;release();
        }
        equal(f.acquisition.getCounters(),counters,'No folder settings reacquisition');equal(f.reads.length,0);equal(f.parses.length,0);
        return true;
      } finally {oracle?.destroy();index?.destroy();f.close();}
    })()`), true);
  } finally {await browser.cleanup();}
});

test("ordinary note preparation excludes a hidden root's children and expands visibility under the same policy", async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(`(async()=>{
      const assert=Object.assign((v,m)=>ok(v,m),{equal}),M=sourceModules,f=await fixture('si4-visible-request-coverage');
      const collect=${collect.toString()},hostOracle=${hostOracle.toString()},fullCenterIndex=${fullCenterIndex.toString()};
      const currentNeighborhoodView=${currentNeighborhoodView.toString()},centerGateSettings=${centerGateSettings.toString()};
      let index,oracle,release;
      try{
        f.text=f.texts;f.add('A.md','Friends:: [[B.md]]');f.add('B.md','');
        for(let n=0;n<1024;n++)f.add('Unrelated-'+n+'.md','');
        const ids=[...f.files.keys()];await f.acquire();equal(await f.repository.completeLocalDependencyInventory(),'ready');
        f.acquisition.localDependenciesReady=f.acquisition.localDependencyAuthorityReady=true;
        const semantic={hierarchy:{hidden:[],parents:[],children:[],leftFriends:['Friends'],rightFriends:[],previous:[],next:[]},
          inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
        const presentation={noteTypeField:'Type',primaryTagField:'Style'},view=centerGateSettings({showFolderNodes:false,renderSiblings:true});
        const initial=await hostOracle(f,ids,semantic,presentation,true);
        index=await fullCenterIndex(M,f,initial,semantic,view);index.sourceAcquisition.close();index.sourceAcquisition=f.acquisition;
        index.plugin.settings.lastActivePath='A.md';release=index.acquireSemanticDemand('A.md');
        const capture=f.acquisition.captureForReplay.bind(f.acquisition);let captured=[];
        f.acquisition.captureForReplay=async(id,...args)=>{captured.push(id);return capture(id,...args);};
        index.plugin.settings.hierarchy.leftFriends=[];index.plugin.settings.hierarchy.rightFriends=['Friends'];index.invalidateSemanticPolicy();
        await index.refreshSemanticSettings();equal(index.hasPendingSemanticPreparation(),false,'Ordinary current policy publishes');
        ok(new Set(captured).size<=2,'Hidden root does not replay unrelated Markdown owners: '+new Set(captured).size);
        ok(index.get('A.md').neighbours.get('B.md')?.isRightFriend,'Challenger publication');
        ok(!index.semanticScopes.get('A.md').completePaths.has('folder:/'),'Hidden root is not falsely marked complete');
        const config={...semantic,hierarchy:{...semantic.hierarchy,leftFriends:[],rightFriends:['Friends']}};
        const expected=await hostOracle(f,ids,config,presentation,true);
        for(const showFolderNodes of [false,true,false]){
          captured=[];const policyRevision=index.getSemanticPreparationDiagnostics().policyRevision;
          index.plugin.settings.showFolderNodes=showFolderNodes;await index.refreshPresentationSettings();await index.refreshSemanticSettings();
          equal(index.hasPendingSemanticPreparation(),false,'Visibility coverage publishes');
          equal(index.getSemanticPreparationDiagnostics().policyRevision,policyRevision,'Visibility does not invalidate semantic policy');
          oracle=await fullCenterIndex(M,f,expected,config,{...view,showFolderNodes});
          equal(currentNeighborhoodView(index,'A.md'),currentNeighborhoodView(oracle,'A.md'),'Full canonical gates/siblings after visibility change');
          if(!showFolderNodes)ok(new Set(captured).size<=2,'Contracted view retains bounded owner work');
          oracle.destroy();oracle=null;
        }
        equal(f.reads.length,0,'No body reads');equal(f.parses.length,0,'No parsing');return true;
      }finally{release?.();oracle?.destroy();index?.destroy();f.close();}
    })()`),true);
  }finally{await browser.cleanup();}
});

test("a local publication superseding ready-source preparation automatically retries live demand without a pending loop", async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(`(async()=>{
      const assert=Object.assign((v,m)=>ok(v,m),{equal}),M=sourceModules,f=await fixture('si4-local-publication-retry');
      const collect=${collect.toString()},hostOracle=${hostOracle.toString()},fullCenterIndex=${fullCenterIndex.toString()};
      const centerGateSettings=${centerGateSettings.toString()};let index,release,unblock;
      try{
        f.text=f.texts;f.add('A.md','Friends:: [[B.md]]');f.add('B.md','');await f.acquire();
        equal(await f.repository.completeLocalDependencyInventory(),'ready');
        f.acquisition.localDependenciesReady=f.acquisition.localDependencyAuthorityReady=true;
        const semantic={hierarchy:{hidden:[],parents:[],children:[],leftFriends:['Friends'],rightFriends:[],previous:[],next:[]},
          inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
        const initial=await hostOracle(f,['A.md','B.md'],semantic,{noteTypeField:'Type',primaryTagField:'Style'},true);
        index=await fullCenterIndex(M,f,initial,semantic,centerGateSettings({showFolderNodes:false}));
        index.sourceAcquisition.close();index.sourceAcquisition=f.acquisition;index.plugin.settings.lastActivePath='A.md';
        release=index.acquireSemanticDemand('A.md');await index.refreshSemanticSettings();
        const prepare=f.acquisition.prepareRequestedNeighborhood.bind(f.acquisition);let calls=0,entered;
        const held=new Promise(done=>entered=done);
        f.acquisition.prepareRequestedNeighborhood=async(...args)=>{
          calls++;const result=await prepare(...args);if(calls===1){entered();await new Promise(done=>unblock=done);}return result;
        };
        index.plugin.settings.hierarchy.leftFriends=[];index.plugin.settings.hierarchy.rightFriends=['Friends'];index.invalidateSemanticPolicy();
        const pending=index.refreshSemanticSettings();await held;
        index.publishIncrementalFile({sourcePath:'A.md',touchedPagePaths:new Set(['A.md']),semanticChanged:true},()=>{});
        unblock();await pending;
        const deadline=Date.now()+10000;
        while(index.hasPendingSemanticPreparation()&&Date.now()<deadline)await new Promise(done=>setTimeout(done,10));
        equal(index.hasPendingSemanticPreparation(),false,'Patch race converges without source callback or another settings save');
        equal(calls,2,'Exactly one changed-publication retry');ok(index.get('A.md').neighbours.get('B.md')?.isRightFriend,'Latest coherent policy');
        equal(f.reads.length,0);equal(f.parses.length,0);
        calls=0;f.acquisition.prepareRequestedNeighborhood=async()=>{calls++;return{outcome:'pending',reason:'missing'};};
        index.invalidateSemanticPolicy();await index.refreshSemanticSettings();await new Promise(done=>setTimeout(done,30));
        equal(calls,1,'Unchanged missing inputs never self-retry');return true;
      }finally{unblock?.();release?.();index?.destroy();f.close();}
    })()`),true);
  }finally{await browser.cleanup();}
});

test("20,015 independent owners publish complete cached scopes with exact gates/siblings/degrees and no IO", { timeout: 900_000 }, async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    await browser.evaluate(`(() => { window.r3LargeStatus={done:false};
      (async () => {
      const assert=Object.assign((v,m)=>ok(v,m),{equal});
      const M=sourceModules, f=await fixture('r3-large-final-publication');
      const collect=${collect.toString()}, hostOracle=${hostOracle.toString()}, fullCenterIndex=${fullCenterIndex.toString()};
      const semanticView=${semanticView.toString()};
      const currentNeighborhoodView=${currentNeighborhoodView.toString()}, centerGateSettings=${centerGateSettings.toString()};
      const presentation={noteTypeField:'Type',primaryTagField:'Style'};
      const count=${Number(process.env.KPLEX_R3_OWNERS ?? 20015)}, ids=Array.from({length:count},(_,i)=>'Owner-'+String(i).padStart(5,'0')+'.md');
      const hub=ids[0], semantic={hierarchy:{hidden:['Hidden'],parents:['Parent'],children:['Children'],leftFriends:['Friends'],rightFriends:['Opposes'],previous:['Previous'],next:['Next']},
        inverseInfer:false,inferAllLinksAsFriends:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
      const view=centerGateSettings({showFolderNodes:true,nodeSortOrder:'connections-desc',maxItemCount:100});
      let index, oracle, peakHeap=0, ownerChecks=0, replayPeak=0, reservation=null, combinedPeak=0, sampling=false, semanticHash=null;
      let heapTimer;
      const sample=()=>{if(sampling)peakHeap=Math.max(peakHeap,performance.memory?.usedJSHeapSize??0);};
      heapTimer=setInterval(sample,50);
      try {
        // Every owner has its own real writer/codec/revision/chunks and lexical target facts.
        for(let i=0;i<count;i++) f.add(ids[i],i===0?'Dormant:: [[Dormant Ghost]]':'Friends:: [['+hub+']]');
        f.text=f.texts;f.app.vault.getRoot();
        window.r3LargeStatus.phase='acquisition';
        const acquiring=f.acquisition.acquire.bind(f.acquisition);let seeded=0;
        f.acquisition.acquire=async(...args)=>{const r=await acquiring(...args);window.r3LargeStatus.seeded=++seeded;return r;};
        await f.acquire();window.r3LargeStatus.phase='initial oracle';
        ok(await f.repository.completeLocalDependencyInventory(),'Complete source-local authority');
        f.acquisition.localDependenciesReady=true; f.acquisition.localDependencyAuthorityReady=true;
        // Initial publication and independent expected output use all canonical live collectors.
        const initial=await hostOracle(f,ids,semantic,presentation,true);
        index=await fullCenterIndex(M,f,initial,semantic,view);index.rebuildSearchIndex();
        index.sourceAcquisition.close();index.sourceAcquisition=f.acquisition;
        index.plugin.settings.lastActivePath=hub;
        const release=index.acquireSemanticDemand(hub), before=index.getSemanticPreparationDiagnostics(), counters=f.acquisition.getCounters();
        const capture=f.acquisition.captureForReplay.bind(f.acquisition);
        f.acquisition.captureForReplay=async(...args)=>{const r=await capture(...args);if(r.outcome==='ready'){
          const live=r.request.host.isCurrent;r.request={...r.request,host:{...r.request.host,isCurrent:()=>{ownerChecks++;return live();}}};}return r;};
        const prepare=f.acquisition.prepareRequestedNeighborhood.bind(f.acquisition);
        f.acquisition.prepareRequestedNeighborhood=async(...args)=>{const result=await prepare(...args);sample();if(args[1].revision==='2')ok(result.outcome==='ready','Reader failed '+JSON.stringify(result));if(result.outcome==='ready'){
          if(args[1].revision==='2')semanticHash=await f.repository.observationDigest(JSON.stringify(semanticView(result.preparation.compilation)));
          reservation=result.preparation.memory;replayPeak=Math.max(replayPeak,reservation.peakBytes);equal(result.preparation.sources.length,count,'All independent owners finalized');}return result;};
        const prepareDegrees=f.acquisition.prepareRequestedCandidateDegrees.bind(f.acquisition);
        f.acquisition.prepareRequestedCandidateDegrees=async(...args)=>{const r=await prepareDegrees(...args);ok(r.outcome==='ready','Degree preparation failed '+JSON.stringify({result:r,retainedBytes:args[3].retainedBytes,neighborhood:reservation,ownerChecks}));if(r.outcome==='ready')combinedPeak=Math.max(combinedPeak,r.work.peakRetainedBytes);return r;};
        f.app.vault.read=f.app.vault.cachedRead=f.acquisition.acquire=f.acquisition.parse=async()=>{throw new Error('Forbidden settings body/acquisition work');};
        const oracleInput={...f,app:{...f.app,vault:{...f.app.vault}}};
        f.app.vault.getMarkdownFiles=()=>{throw new Error('Forbidden settings inventory scan');};
        window.r3LargeStatus.phase='cached publication';sampling=true;peakHeap=0;const start=performance.now();
        index.plugin.settings.hierarchy.leftFriends=[];index.plugin.settings.hierarchy.rightFriends=['Opposes','Friends'];
        index.invalidateSemanticPolicy();await index.refreshSemanticSettings();sample();
        equal(index.hasPendingSemanticPreparation(),false,'Final production scope current: '+JSON.stringify(index.getSemanticPreparationDiagnostics()));
        sampling=false;const elapsedMs=performance.now()-start, updated={...semantic,hierarchy:structuredClone(index.plugin.settings.hierarchy)};
        window.r3LargeStatus.phase='final oracle';const expected=await hostOracle(oracleInput,ids,updated,presentation,true);
        equal(semanticHash,await f.repository.observationDigest(JSON.stringify(semanticView(expected))),'Exact complete canonical nodes/declarations/provenance multiplicity');
        oracle=await fullCenterIndex(M,f,expected,updated,view);oracle.sourceAcquisition.localDependenciesReady=true;oracle.rebuildSearchIndex();
        const actualView=currentNeighborhoodView(index,hub),expectedView=currentNeighborhoodView(oracle,hub);
        ok(JSON.stringify(actualView)===JSON.stringify(expectedView),'Oracle mismatch '+JSON.stringify({gatesA:actualView.gates,gatesB:expectedView.gates,roles:Object.fromEntries(['parents','children','leftFriends','rightFriends','siblings'].map(k=>[k,{a:actualView[k].slice(0,2),b:expectedView[k].slice(0,2),aCount:actualView[k].length,bCount:expectedView[k].length}]))}));
        equal(index.get(hub).neighbours.size,count,'Complete center incidence including root');
        equal(index.gateStats(index.get(hub)).right.visibleCount,count-1,'Full untrimmed challenger gate');
        for(const id of [hub,ids[1],ids[Math.floor(count/2)],ids[count-1]]) {
          equal(index.preparedPageInfo.get(index.get(id))?.rawDegree,oracle.get(id).neighbours.size,'Exact degree '+id);
          equal(index.titleFor(index.get(id)),oracle.titleFor(oracle.get(id)),'Selected label '+id);
        }
        equal(index.search('Owner-19999',10).map(p=>p.path),oracle.search('Owner-19999',10).map(p=>p.path),'Current search');
        ok(index.isSemanticWriteReady(hub,ids[1]),'Current write readiness');
        equal(index.relationshipStorageCandidates(hub,ids[1]),oracle.relationshipStorageCandidates(hub,ids[1]),'Editable storage input');
        equal(f.acquisition.getCounters(),counters,'Zero source work');equal(f.reads.length,0,'Zero reads');equal(f.parses.length,0,'Zero parses');
        equal(index.getSemanticPreparationDiagnostics().fullBuilds,before.fullBuilds,'Zero full builds');
        ok(ownerChecks<800*count,'Linear complete reader work: '+ownerChecks);
        // Cancel between genuine compiler batches; no candidate scope or prefix may replace the publication.
        const revision=index.getSemanticPreparationDiagnostics().published, coherent=currentNeighborhoodView(index,hub);
        const liveRuntime=index.semanticPreparationRuntime.bind(index);let yields=0;
        let alive=true;index.semanticPreparationRuntime=current=>({...liveRuntime(()=>current()&&alive),yield:async()=>{if(++yields===2)alive=false;}});
        index.plugin.settings.inverseInfer=true;index.invalidateSemanticPolicy();await index.refreshSemanticSettings();
        equal(index.getSemanticPreparationDiagnostics().published,revision,'Cancelled continuation cannot publish');
        equal(currentNeighborhoodView(index,hub),coherent,'Cancelled continuation exposes no prefix');
        release();
        return {owners:count,ownerChecks,elapsedMs,peakHeap,replayPeak,combinedPeak,reservation,published:revision-before.published,cancellationYields:yields};
      } finally {clearInterval(heapTimer);oracle?.destroy();index?.destroy();f.close();}
      })().then(result=>window.r3LargeStatus={done:true,result},error=>window.r3LargeStatus={done:true,error:error.stack??String(error)});
      return true;
    })()`);
    let status, polls=0;
    const deadline=Date.now()+840_000;
    do {
      await new Promise(resolve => setTimeout(resolve, 1000));
      status = await browser.evaluate("window.r3LargeStatus");
      assert(Date.now()<deadline, `Large-case deadline: ${JSON.stringify(status)}`);
      if (++polls % 15 === 0 && !status.done) console.log(JSON.stringify({ r3Progress: status }));
    } while (!status.done);
    assert(!status.error, status.error);
    const report = status.result;
    assert.equal(report.owners, Number(process.env.KPLEX_R3_OWNERS ?? 20015));
    assert.equal(report.published, 1);
    assert(report.cancellationYields >= 2);
    console.log(JSON.stringify({ r3LargePublication: report }));
  } finally { await browser.cleanup(); }
});
