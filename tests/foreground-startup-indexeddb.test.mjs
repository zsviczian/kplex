/** Foreground availability and authority fences through production GraphIndex with real browser IndexedDB. */
import assert from "node:assert/strict";
import test from "node:test";
import { contributorBrowserBundle, contributorBrowserInitialize } from "./support/contributorBrowserFixture.mjs";
import { chromiumHarness } from "./support/browserTypeScript.mjs";
import { hostOracle, collect } from "./support/cachedSourceFixture.mjs";
import { fullCenterIndex, centerGateSettings } from "./support/requestedCenterGateFixture.mjs";

const bundle = await contributorBrowserBundle(["src/index/GraphIndex.ts", "src/index/GraphBuilder.ts", "src/index/IndexSnapshot.ts",
  "src/core/graph/compiler.ts", "src/adapters/obsidian/metadataSourceCollector.ts", "src/adapters/obsidian/ontologySourceCollector.ts"]);

const initialize = `(() => {
  const M=sourceModules,assert=Object.assign((v,m)=>ok(v,m),{equal});
  const collect=${collect.toString()},hostOracle=${hostOracle.toString()},fullCenterIndex=${fullCenterIndex.toString()},centerGateSettings=${centerGateSettings.toString()};
  window.startupSeed=async(name,key='active')=>{
    const M=sourceModules,f=await fixture(name);let initial;
    try{
      f.text=f.texts;f.add('A.md','[Evidence URL](https://example.com/startup-evidence)',{Parent:'[[B]]'});f.add('B.md','');f.add('C.md','');
      f.app.metadataCache.resolvedLinks={'A.md':{'B.md':1}};f.app.vault.getName=()=>name;
      f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??(path==='/'||path===''?f.app.vault.getRoot():null);
      await f.acquire();ok(await f.acquisition.reconcile(),'Seeded neutral sources have genuine authority');
      const semantic={hierarchy:{hidden:['Hidden'],parents:['Parent'],children:['Child'],leftFriends:['Friend'],rightFriends:['Right'],previous:['Previous'],next:['Next']},inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
      initial=await fullCenterIndex(M,f,await hostOracle(f,[...f.files.keys()],semantic,{noteTypeField:'Type',primaryTagField:'Style'},true),semantic,centerGateSettings({showFolderNodes:false,renderSiblings:false}));
      const settings={...initial.plugin.settings,lastActivePath:'A.md',pinnedNodes:[]};
      const pages=[...initial.state.pages.values()].map(page=>M.persistedPageFromGraphPage(page));
      const evidence=[...initial.state.evidence.declarations()].map(item=>M.persistedDeclarationFromEvidence(item));
      ok(await f.cache.writeSnapshot({createdAt:Date.now(),urlAliasVersion:2,vaultSignature:M.computeVaultSignature(f.app),settingsSignature:M.computeIndexSettingsSignature(settings),discoveredFields:[],...(key==='checkpoint'?{completedMarkdownPaths:[]}: {})},pages,evidence,()=>true,key),'Actual schema-3 snapshot activation');
      f.acquisition.close();return {f,settings,pages,evidence,semantic};
    }finally{initial?.destroy();}
  };
  window.deadline=(promise,label)=>{
    let timer;return Promise.race([promise,new Promise((resolve,reject)=>{timer=window.setTimeout(()=>reject(new Error(label+' did not finish independently')),8000);})]).finally(()=>window.clearTimeout(timer));
  };
  return true;
})()`;

/** Source/evidence holds are outside transactions; real page reads and exact source preparation are never replaced. */
for (const mutation of [false, true]) {
  test(`trusted warm navigation precedes source authority and evidence${mutation ? " and late evidence cannot replace a foreground canonical commit" : " while an exact pair survives promotion"}`, async () => {
    const browser = await chromiumHarness(bundle);
    try {
      assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
      assert.equal(await browser.evaluate(initialize), true);
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,{f,settings}=await startupSeed('foreground-trusted-'+${mutation});let index,releaseEvidence,releaseSources,releaseDemand;
        try{
          let sourceRevision=0,inventoryScans=0,inventoryStarts=0,evidenceEntered;
          const evidenceHeld=new Promise(resolve=>{evidenceEntered=resolve}),evidenceGate=new Promise(resolve=>{releaseEvidence=resolve}),sourceGate=new Promise(resolve=>{releaseSources=resolve});
          index=new M.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>sourceRevision},f.app);index.scheduleOrphanCleanup=()=>{};
          const scan=index.startPersistedSourceInventory.bind(index);index.startPersistedSourceInventory=async(...args)=>{inventoryScans++;return scan(...args);};
          const enable=index.sourceAcquisition.enableInventory.bind(index.sourceAcquisition);index.sourceAcquisition.enableInventory=()=>{
            equal(inventoryScans,0,'Trusted startup does not scan source heads before navigation');
            ok(index.state.pages.get('A.md')?.neighbours.has('https://example.com/startup-evidence'),'Source inventory is enabled only after full page+relation navigation publication');
            inventoryStarts++;enable();
          };
          const reconcile=index.sourceAcquisition.reconcile.bind(index.sourceAcquisition);index.sourceAcquisition.reconcile=async(...args)=>{await sourceGate;return reconcile(...args);};
          const flush=index.sourceAcquisition.flush.bind(index.sourceAcquisition);index.sourceAcquisition.flush=async(...args)=>{await sourceGate;return flush(...args);};
          const evidence=index.indexedDb.iterateSnapshotEvidence.bind(index.indexedDb);index.indexedDb.iterateSnapshotEvidence=async(...args)=>{evidenceEntered();await evidenceGate;return evidence(...args);};
          await index.primePhysicalSearchCatalog();ok(index.search('C',10,'vault-files').some(page=>page.path==='C.md'),'Find before DB/source restore');
          await index.publishHostMetadataPreview('A.md');ok(index.get('A.md').neighbours.has('B.md'),'Immediate frontmatter host preview');
          ok(!index.get('A.md').neighbours.has('https://example.com/startup-evidence'),'Host preview does not parse body URLs');
          const restore=index.restorePersistedSnapshot(['A.md']);
          await deadline(evidenceHeld,'page/relation hydration').catch(error=>{throw new Error(error.message+' '+JSON.stringify({phase:index.snapshotHydrationDiagnostics,decisions:index.indexDiagnostics,inventoryScans,inventoryStarts,pages:index.state.pages.size}));});
          equal(inventoryScans,0,'No durable source inventory on trusted warm critical path');equal(inventoryStarts,1,'Existing background source owner starts after navigation');
          equal([...index.state.evidence.declarations()].length,0,'Partial provenance never becomes authoritative');
          ok(index.get('A.md').neighbours.has('https://example.com/startup-evidence'),'Richer persisted first-order navigation replaces host preview before evidence');
          ok(index.search('C',10,'vault-files').some(page=>page.path==='C.md'),'Find remains usable during evidence hydration');
          equal(index.isSemanticWriteReady('A.md','B.md'),false,'Navigation alone grants no relationship authority');
          releaseDemand=index.acquireSemanticDemand('C.md');await deadline(index.publishHostMetadataPreview('C.md'),'foreground center navigation');ok(index.getNeighborhood('C.md'),'Navigation during blocked evidence/source work');
          ok(await deadline(index.prepareRelationshipPair('A.md','B.md'),'targeted pair preparation'),'Exact editable pair prepares without blocked broad authority');
          ok(index.isSemanticWriteReady('A.md','B.md'),'Only prepared pair grants write authority');equal(index.isSemanticWriteReady('A.md','C.md'),false,'Unrelated pair stays uncertified');
          const fullTask=index.waitForSnapshotHydration();
          if(${mutation}){
            const canonical={...index.state.pages.get('A.md'),name:'Foreground canonical center',neighbours:new Map(index.state.pages.get('A.md').neighbours)};
            index.publishIncrementalFile({sourcePath:'A.md',touchedPagePaths:new Set(['A.md']),semanticChanged:true},()=>{index.state.pages.set('A.md',canonical);});
            releaseEvidence();await deadline(fullTask,'cancelled hydration completion');await deadline(restore,'cancelled preview completion');
            ok(index.state.pages.get('A.md')===canonical,'Late old evidence cannot overwrite canonical per-file owner');
            equal(index.state.pages.get('A.md').name,'Foreground canonical center','Canonical publication survives late continuation');
            ok(index.hasSourceBackedStartup(),'Canceled warm evidence retains existing source-backed recovery owner');
            index.rebuild=()=>{throw new Error('Warm source recovery must not start a full rebuild');};
            releaseSources();ok(await deadline(index.adoptStartupSources(),'canceled warm source adoption'),'Warm source authority converges through existing adoption');
            ok(index.sourceAcquisition.hasSemanticDependencies(),'Canceled warm source closure completes');
            equal(index.getNeighborhood('A.md').parents.map(item=>item.page.path),['B.md'],'Recovered canonical parent matches clean compiler');
            equal(index.getNeighborhood('A.md').children.map(item=>item.page.path),['https://example.com/startup-evidence'],'Recovered body URL matches clean compiler');
          }else{
            releaseEvidence();const result=await deadline(fullTask,'evidence promotion');ok(result.restored,'Real complete graph/evidence restore');await restore;
            ok(index.get('A.md').neighbours.has('https://example.com/startup-evidence'),'Richer graph survives evidence promotion');
            ok(index.isSemanticWriteReady('A.md','B.md'),'Exact canonical pair survives matching final promotion');
            equal([...index.state.evidence.declarations()].length>0,true,'Only complete evidence becomes visible');
            releaseSources();ok(await deadline(index.sourceAcquisition.flush(),'eventual source authority'),'Background source owner resumes and converges');
            ok(index.sourceAcquisition.hasSemanticDependencies(),'Canonical source closure eventually completes');
            await deadline(index.refreshSemanticSettings(),'eventual requested semantics');
            equal(index.getNeighborhood('A.md').parents.map(item=>item.page.path),['B.md'],'Canonical eventual parent matches clean compiler');
            equal(index.getNeighborhood('A.md').children.map(item=>item.page.path),['https://example.com/startup-evidence'],'Canonical eventual body URL matches clean compiler');
          }
          equal(f.reads.length,0,'Warm foreground availability requires no body reads');equal(f.parses.length,0,'Warm availability requires no parsing');return true;
        }finally{releaseDemand?.();index?.destroy();releaseEvidence?.();releaseSources?.();f.close();}
      })()`), true);
    } finally { await browser.cleanup(); }
  });
}

/** A selected host observation expires snapshot presentation even when managed writes retain the main dirty revision. */
test("warm visible metadata refresh replaces cached incidence without a main source revision change", async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(initialize), true);
    assert.equal(await browser.evaluate(`(async()=>{
      const M=sourceModules,{f,settings}=await startupSeed('foreground-managed-visible');let index,releaseEvidence,releaseSources;
      try{
        const sourceGate=new Promise(resolve=>releaseSources=resolve),evidenceGate=new Promise(resolve=>releaseEvidence=resolve);
        let entered;const reached=new Promise(resolve=>entered=resolve);
        index=new M.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>0},f.app);index.scheduleOrphanCleanup=()=>{};
        const reconcile=index.sourceAcquisition.reconcile.bind(index.sourceAcquisition);
        index.sourceAcquisition.reconcile=async(...args)=>{await sourceGate;return reconcile(...args)};
        const evidence=index.indexedDb.iterateSnapshotEvidence.bind(index.indexedDb);
        index.indexedDb.iterateSnapshotEvidence=async(...args)=>{entered();await evidenceGate;return evidence(...args)};
        const restore=index.restorePersistedSnapshot(['A.md']);await deadline(reached,'warm graph publication');
        equal(index.getNeighborhood('A.md').parents.map(item=>item.page.path),['B.md'],'Original cached center incidence');
        f.metadata.get('A.md').frontmatter.Parent='[[C]]';
        f.app.metadataCache.trigger('changed',f.files.get('A.md'));
        ok(index.refreshVisibleHostMetadataPreviews('A.md'),'Visible center selected by actual host observation');
        await deadline(index.publishHostMetadataPreview('A.md'),'managed-event host preview');
        equal(index.plugin.getIndexSourceRevision(),0,'Main managed dirty revision remains unchanged');
        equal(index.getNeighborhood('A.md').parents.map(item=>item.page.path),['C.md'],'Fresh host parent precedes blocked source inventory');
        equal(index.isSemanticWriteReady('A.md','C.md'),false,'Host edit grants no provenance authority');
        releaseEvidence();equal((await deadline(index.waitForSnapshotHydration(),'old evidence completion')).restored,false,'Host observation fences the captured warm generation');await restore;
        equal(index.getNeighborhood('A.md').parents.map(item=>item.page.path),['C.md'],'Old evidence promotion cannot shadow the fresh visible preview');
        ok(index.hasSourceBackedStartup(),'Interrupted warm graph keeps neutral-source recovery');
        releaseSources();ok(await deadline(index.adoptStartupSources(),'managed-event canonical recovery'),'Existing source owner converges');
        equal(index.getNeighborhood('A.md').parents.map(item=>item.page.path),['C.md'],'Canonical result agrees with the fresh host preview');
        equal(index.getSemanticPreparationDiagnostics().fullBuilds,0,'Observation does not restart a full graph build');
        return true;
      }finally{index?.destroy();releaseEvidence?.();releaseSources?.();f.close()}
    })()`),true);
  }finally{await browser.cleanup()}
});

/** Active completeness, exact physical membership/stats and semantic policy are required for the trusted lane. */
for (const mode of ["mtime", "membership", "settings", "checkpoint"]) {
  test(`${mode} mismatch does not bypass source inventory as a trusted active generation`, async () => {
    const browser = await chromiumHarness(bundle);
    try {
      assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
      assert.equal(await browser.evaluate(initialize), true);
      assert.equal(await browser.evaluate(`(async()=>{
        const mode=${JSON.stringify(mode)},M=sourceModules,{f,settings}=await startupSeed('foreground-untrusted-'+mode,mode==='checkpoint'?'checkpoint':'active');let index,unblock;
        try{
          if(mode==='mtime')f.files.get('A.md').stat.mtime++;
          if(mode==='membership')f.add('D.md','');
          if(mode==='settings')settings.inverseInfer=true;
          index=new M.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>0},f.app);index.scheduleOrphanCleanup=()=>{};
          let entered;const scanned=new Promise(resolve=>{entered=resolve}),held=new Promise(resolve=>{unblock=resolve});
          const scan=index.startPersistedSourceInventory.bind(index);let calls=0;
          index.startPersistedSourceInventory=async(...args)=>{calls++;entered();await held;return scan(...args);};
          await index.primePhysicalSearchCatalog();await index.publishHostMetadataPreview('A.md');
          const restore=index.restorePersistedSnapshot(['A.md']);await deadline(scanned,'safe source inventory classification');
          equal(calls,1,'Untrusted generation enters source inventory first');
          equal(index.state.pages.size,0,'Unverified generation has not published a complete semantic base');
          ok(index.get('A.md'),'Host-only center remains available while stronger path waits');
          ok(index.search('C',10,'vault-files').some(page=>page.path==='C.md'),'Find is independent of the stronger fallback');
          index.destroy();unblock();await deadline(restore,'unload cancellation');return true;
        }finally{index?.destroy();unblock?.();f.close();}
      })()`), true);
    } finally { await browser.cleanup(); }
  });
}
