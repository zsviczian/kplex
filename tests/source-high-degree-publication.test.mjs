/** SI4-R3: independently stored source facts through real IDB and production semantic publication. */
import assert from "node:assert/strict";
import test from "node:test";
import { contributorBrowserBundle, contributorBrowserInitialize } from "./support/contributorBrowserFixture.mjs";
import { chromiumHarness } from "./support/browserTypeScript.mjs";
import { hostOracle, collect, semanticView } from "./support/cachedSourceFixture.mjs";
import { fullCenterIndex, currentNeighborhoodView, centerGateSettings } from "./support/requestedCenterGateFixture.mjs";

/**
 * Project this root-and-hub fixture's independent full compiler oracle to exact direct-center
 * structural coverage. Every node facet, field, non-structural declaration and duplicate stays
 * byte-for-byte intact; only root-to-other-owner incidence outside the hub request is omitted.
 */
function directHubOracleView(compilation, hub, ownerIds) {
  const view = semanticView(compilation), owners = new Set(ownerIds);
  const roots = view.nodes.filter(node => node.kind === "container");
  assert.equal(roots.length, 1, "Fixture has exactly one physical root");
  const root = roots[0];
  assert.equal(root.semanticPath, "folder:/", "Explicit oracle root coordinate");
  assert.equal(view.nodes.length, ownerIds.length + 1, "All owner facets and only the root exist");
  assert(view.nodes.every(node => node.id === root.id || owners.has(node.id)), "Exact fixture node IDs");
  let omittedDeclarations = 0, omittedNeighbours = 0, rootOccurrences = 0;
  const declarations = view.declarations.filter(encoded => {
    const item = JSON.parse(encoded);
    if (item.sourceKind !== "file-tree") {
      assert(item.sourceId === hub || item.targetId === hub, "Every non-structural declaration belongs to complete hub incidence");
      return true;
    }
    assert.equal(item.declaredById, root.id, "No other structural parent may be projected away");
    assert(owners.has(item.declaredTargetId), "Structural child is an exact fixture owner");
    rootOccurrences++;
    if (item.declaredTargetId === hub) return true;
    omittedDeclarations++;
    return false;
  });
  const nodes = view.nodes.map(node => ({ ...node, neighbours: node.neighbours.filter(relation => {
    if ((node.id === root.id && owners.has(relation.target) && relation.target !== hub)
      || (owners.has(node.id) && node.id !== hub && relation.target === root.id)) {
      omittedNeighbours++;
      return false;
    }
    return true;
  }) }));
  assert.equal(rootOccurrences, ownerIds.length, "One full canonical root occurrence per owner");
  assert.equal(omittedDeclarations, ownerIds.length - 1, "Only non-hub root declarations are omitted");
  assert.equal(omittedNeighbours, 2 * (ownerIds.length - 1), "Only both directions of uncertified root pairs are omitted");
  return { ...view, nodes, declarations };
}

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
          // Full-oracle equality includes optional root-parent siblings after tracked P3 work settles.
          await index.workScheduler.checkpoint(4);
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
          await index.workScheduler.checkpoint(4);
          equal(index.hasPendingSemanticPreparation(),false,'Visibility coverage publishes');
          equal(index.getSemanticPreparationFailure(),null,'Optional structural deferral is no center failure');
          equal(index.getSemanticPreparationDiagnostics().policyRevision,policyRevision,'Visibility does not invalidate semantic policy');
          oracle=await fullCenterIndex(M,f,expected,config,{...view,showFolderNodes});
          const actualView=currentNeighborhoodView(index,'A.md'),expectedView=currentNeighborhoodView(oracle,'A.md');
          if(showFolderNodes){
            // Intentional progressive difference: the visible root has 1026 members, exceeding the
            // 256-owner optional closure bound. Direct roles/gates remain the complete full oracle;
            // root siblings stay deferred without claiming complete parent incidence or absence.
            const {siblings:actualSiblings,...actualDirect}=actualView;
            const {siblings:expectedSiblings,...expectedDirect}=expectedView;
            equal(actualDirect,expectedDirect,'Exact full-oracle center roles/gates after root visibility');
            equal(actualSiblings,[],'High-degree root siblings are deferred');
            ok(expectedSiblings.length>0,'Full oracle genuinely contains omitted optional root siblings');
            const scope=index.semanticScopes.get('A.md');
            ok(scope.completePaths.has('A.md')&&!scope.completePaths.has('folder:/'),'Complete center and incomplete root certificate');
            equal(index.gateStats(index.get('folder:/')).bottom.complete,false,'Root gate count honestly marks partial incidence');
          }else equal(actualView,expectedView,'Full canonical gates/siblings with hidden root');
          ok(new Set(captured).size<=2,'Both visibility states retain bounded unrelated-owner work');
          ok(captured.every(id=>!id.startsWith('Unrelated-')),'Optional root deferral reads no unrelated source families');
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

test("20,015 independent owners publish complete cached center incidence with exact metadata/evidence/gates/degrees and no IO", { timeout: 900_000 }, async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    await browser.evaluate(`(() => { window.r3LargeStatus={done:false};
      (async () => {
      const assert=Object.assign((v,m)=>ok(v,m),{equal});
      const M=sourceModules, f=await fixture('r3-large-final-publication');
      const collect=${collect.toString()}, hostOracle=${hostOracle.toString()}, fullCenterIndex=${fullCenterIndex.toString()};
      const semanticView=${semanticView.toString()},directHubOracleView=${directHubOracleView.toString()};
      const currentNeighborhoodView=${currentNeighborhoodView.toString()}, centerGateSettings=${centerGateSettings.toString()};
      const presentation={noteTypeField:'Type',primaryTagField:'Style'};
      const count=${Number(process.env.KPLEX_R3_OWNERS ?? 20015)}, ids=Array.from({length:count},(_,i)=>'Owner-'+String(i).padStart(5,'0')+'.md');
      const hub=ids[0], semantic={hierarchy:{hidden:['Hidden'],parents:['Parent'],children:['Children'],leftFriends:['Friends'],rightFriends:['Opposes'],previous:['Previous'],next:['Next']},
        inverseInfer:false,inferAllLinksAsFriends:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
      const view=centerGateSettings({showFolderNodes:true,nodeSortOrder:'connections-desc',maxItemCount:100});
      let index, oracle, peakHeap=0, ownerChecks=0, replayPeak=0, reservation=null, combinedPeak=0, sampling=false, semanticHash=null;
      const canonicalPasses={direct:0,optional:0};
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
          if(args[1].revision==='2'){
            canonicalPasses[args[0].siblingClosure==='selected'?'optional':'direct']++;
            if(args[0].siblingClosure==='deferred')semanticHash=await f.repository.observationDigest(JSON.stringify(semanticView(result.preparation.compilation)));
          }
          reservation=result.preparation.memory;replayPeak=Math.max(replayPeak,reservation.peakBytes);equal(result.preparation.sources.length,count,'All independent owners finalized');}return result;};
        const prepareDegrees=f.acquisition.prepareRequestedCandidateDegrees.bind(f.acquisition);
        f.acquisition.prepareRequestedCandidateDegrees=async(...args)=>{const r=await prepareDegrees(...args);ok(r.outcome==='ready','Degree preparation failed '+JSON.stringify({result:r,retainedBytes:args[3].retainedBytes,neighborhood:reservation,ownerChecks}));if(r.outcome==='ready')combinedPeak=Math.max(combinedPeak,r.work.peakRetainedBytes);return r;};
        f.app.vault.read=f.app.vault.cachedRead=f.acquisition.acquire=f.acquisition.parse=async()=>{throw new Error('Forbidden settings body/acquisition work');};
        const oracleInput={...f,app:{...f.app,vault:{...f.app.vault}}};
        f.app.vault.getMarkdownFiles=()=>{throw new Error('Forbidden settings inventory scan');};
        window.r3LargeStatus.phase='cached publication';sampling=true;peakHeap=0;const start=performance.now();
        index.plugin.settings.hierarchy.leftFriends=[];index.plugin.settings.hierarchy.rightFriends=['Opposes','Friends'];
        index.invalidateSemanticPolicy();await index.refreshSemanticSettings();
        // Settle actual optional admission before comparing eventual full output or cancelling it.
        await index.workScheduler.checkpoint(4);sample();
        equal(index.hasPendingSemanticPreparation(),false,'Final production scope current: '+JSON.stringify(index.getSemanticPreparationDiagnostics()));
        sampling=false;const elapsedMs=performance.now()-start, updated={...semantic,hierarchy:structuredClone(index.plugin.settings.hierarchy)};
        window.r3LargeStatus.phase='final oracle';const expected=await hostOracle(oracleInput,ids,updated,presentation,true);
        equal(semanticHash,await f.repository.observationDigest(JSON.stringify(directHubOracleView(expected,hub,ids))),
          'Exact direct-center canonical nodes/metadata/declarations/provenance multiplicity; only uncertified non-hub root pairs omitted');
        oracle=await fullCenterIndex(M,f,expected,updated,view);
        // A genuinely complete live compilation earns full policy authority through production
        // publication; manually assigning a blank index's state cannot grant mutation readiness.
        oracle.publishRestoredState(oracle.state);oracle.sourceAcquisition.localDependenciesReady=true;
        const actualView=currentNeighborhoodView(index,hub),expectedView=currentNeighborhoodView(oracle,hub);
        const rootComplete=index.semanticScopes.get(hub).completePaths.has('folder:/');
        equal(rootComplete,2*count<=256,'Conservative owner+physical-child admission bounds optional root closure');
        if(rootComplete)equal(actualView,expectedView,'Full canonical neighborhood after bounded optional root closure');
        else {
          const {siblings:actualSiblings,...actualDirect}=actualView,{siblings:expectedSiblings,...expectedDirect}=expectedView;
          equal(actualDirect,expectedDirect,'Exact full-oracle center roles/gates despite high-degree root deferral');
          equal(actualSiblings,[],'Uncertified root siblings are deferred');
          if(count>view.maxItemCount+1)ok(expectedSiblings.length>0,'Full oracle genuinely contains deferred optional siblings');
          equal(index.gateStats(index.get('folder:/')).bottom.complete,false,'Partial root count is a lower bound');
        }
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
        equal(canonicalPasses,{direct:1,optional:rootComplete?1:0},'Only one direct pass and its admitted optional closure run');
        // Small fixtures admit one additional canonical parent pass. Keep the accepted 800 checks
        // per owner per pass; the 20,015-owner deferred-root case retains its original single bound.
        ok(ownerChecks<800*count*(canonicalPasses.direct+canonicalPasses.optional),'Linear complete reader work: '+ownerChecks);
        // Cancel between genuine compiler batches; no candidate scope or prefix may replace the publication.
        const revision=index.getSemanticPreparationDiagnostics().published, coherent=currentNeighborhoodView(index,hub);
        const liveRuntime=index.semanticPreparationRuntime.bind(index);let yields=0;
        let alive=true;index.semanticPreparationRuntime=current=>({...liveRuntime(()=>current()&&alive),yield:async()=>{if(++yields===2)alive=false;}});
        index.plugin.settings.inverseInfer=true;index.invalidateSemanticPolicy();await index.refreshSemanticSettings();
        equal(index.getSemanticPreparationDiagnostics().published,revision,'Cancelled continuation cannot publish');
        equal(currentNeighborhoodView(index,hub),coherent,'Cancelled continuation exposes no prefix');
        release();
        return {owners:count,ownerChecks,elapsedMs,peakHeap,replayPeak,combinedPeak,reservation,rootComplete,canonicalPasses,published:revision-before.published,cancellationYields:yields};
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
    assert.equal(report.published, report.rootComplete ? 2 : 1);
    assert(report.cancellationYields >= 2);
    console.log(JSON.stringify({ r3LargePublication: report }));
  } finally { await browser.cleanup(); }
});
