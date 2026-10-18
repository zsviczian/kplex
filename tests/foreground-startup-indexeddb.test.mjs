/** Eager foreground availability and authority fences through production GraphIndex with real browser IndexedDB. */
import assert from "node:assert/strict";
import test from "node:test";
import { contributorBrowserBundle, contributorBrowserInitialize } from "./support/contributorBrowserFixture.mjs";
import { chromiumHarness } from "./support/browserTypeScript.mjs";
import { hostOracle, collect } from "./support/cachedSourceFixture.mjs";
import { fullCenterIndex, centerGateSettings } from "./support/requestedCenterGateFixture.mjs";

const bundle = await contributorBrowserBundle(["src/index/GraphIndex.ts", "src/index/GraphBuilder.ts", "src/index/IndexSnapshot.ts",
  "src/core/graph/compiler.ts", "src/adapters/obsidian/metadataSourceCollector.ts", "src/adapters/obsidian/ontologySourceCollector.ts", "src/ui/components/centerWatchdog.ts"]);

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
      // These fixtures exercise optional Eager hydration/inventory authority; On-demand startup has its own suite.
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

/** Unrelated known observations preserve complete warm counts without granting evidence authority. */
test("warm numeric gates survive unrelated metadata revisions while affected targets retire", async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(initialize), true);
    assert.equal(await browser.evaluate(`(async()=>{
      const M=sourceModules,{f,settings}=await startupSeed('foreground-unrelated-counts');let index,releaseEvidence,releaseSources,releaseDemand;
      try{
        let sourceRevision=0,entered;const reached=new Promise(resolve=>entered=resolve);
        const sourceGate=new Promise(resolve=>releaseSources=resolve),evidenceGate=new Promise(resolve=>releaseEvidence=resolve);
        index=new M.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>sourceRevision},f.app);index.scheduleOrphanCleanup=()=>{};
        const reconcile=index.sourceAcquisition.reconcile.bind(index.sourceAcquisition);
        index.sourceAcquisition.reconcile=async(...args)=>{await sourceGate;return reconcile(...args)};
        const evidence=index.indexedDb.iterateSnapshotEvidence.bind(index.indexedDb);
        index.indexedDb.iterateSnapshotEvidence=async(...args)=>{entered();await evidenceGate;return evidence(...args)};
        const restore=index.restorePersistedSnapshot(['A.md']);await deadline(reached,'warm numeric graph');
        const original=index.get('A.md'),expected=index.gateStats(original);
        equal(expected.bottom.visibleCount,1,'Warm graph includes body-only child outside host preview');
        f.metadata.get('C.md').frontmatter.Type='Changed type';sourceRevision++;
        f.app.metadataCache.trigger('changed',f.files.get('C.md'));
        index.refreshVisibleHostMetadataPreviews('C.md',0);
        releaseDemand=index.acquireSemanticDemand('A.md');await deadline(index.publishHostMetadataPreview('A.md'),'unaffected navigation');
        ok(index.get('A.md')===original,'Unrelated known event preserves richer complete incidence');
        equal(index.gateStats(index.get('A.md')),expected,'All four warm gates retain their numeric proof');
        equal(index.hostPreviewScopes.has('A.md'),false,'Partial host preview cannot shadow unaffected warm counts');
        equal(index.isSemanticWriteReady('A.md','B.md'),false,'Counts do not certify provenance or editing');
        f.metadata.get('C.md').frontmatter.Parent='[[A]]';f.app.metadataCache.resolvedLinks['C.md']={'A.md':1};sourceRevision++;
        f.app.metadataCache.trigger('changed',f.files.get('C.md'));
        ok(index.refreshVisibleHostMetadataPreviews('C.md',1),'New incoming target selects affected visible center');
        await deadline(index.publishHostMetadataPreview('A.md'),'affected-target replacement');
        ok(index.hostPreviewScopes.has('A.md'),'Affected target cannot reuse its old warm count proof');
        ok(index.getNeighborhood('A.md').children.some(item=>item.page.path==='C.md'),'New host relationship is visible before source inventory');
        equal(index.gateStats(index.get('A.md')).bottom.complete,false,'Unproved body-inclusive total stays partial');
        equal(f.reads.length,0,'No foreground body reads');equal(f.parses.length,0,'No foreground parsing');
        releaseEvidence();await deadline(restore,'fenced warm completion');return true;
      }finally{releaseDemand?.();index?.destroy();releaseEvidence?.();releaseSources?.();f.close()}
    })()`),true);
  }finally{await browser.cleanup()}
});

/** Unbounded host/source changes cannot renew an unrelated cached count certificate. */
for (const mode of ["unknown-revision", "physical-edit", "same-mtime-size-edit", "oversized-metadata", "alias-resolution", "date-property"]) {
  test(`warm count retention rejects ${mode}`, async () => {
    const browser = await chromiumHarness(bundle);
    try {
      assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
      assert.equal(await browser.evaluate(initialize), true);
      assert.equal(await browser.evaluate(`(async()=>{
        const mode=${JSON.stringify(mode)},M=sourceModules,{f,settings}=await startupSeed('foreground-count-fence-'+mode);
        let index,releaseEvidence,releaseSources;
        try{
          let sourceRevision=0,entered;const reached=new Promise(resolve=>entered=resolve);
          const sourceGate=new Promise(resolve=>releaseSources=resolve),evidenceGate=new Promise(resolve=>releaseEvidence=resolve);
          index=new M.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>sourceRevision},f.app);index.scheduleOrphanCleanup=()=>{};
          const reconcile=index.sourceAcquisition.reconcile.bind(index.sourceAcquisition);
          index.sourceAcquisition.reconcile=async(...args)=>{await sourceGate;return reconcile(...args)};
          const evidence=index.indexedDb.iterateSnapshotEvidence.bind(index.indexedDb);
          index.indexedDb.iterateSnapshotEvidence=async(...args)=>{entered();await evidenceGate;return evidence(...args)};
          const restore=index.restorePersistedSnapshot(['A.md']);await deadline(reached,'warm fenced counts');
          if(mode==='unknown-revision')sourceRevision=2;
          if(mode==='physical-edit')f.files.get('C.md').stat.mtime++;
          if(mode==='same-mtime-size-edit')f.files.get('C.md').stat.size++;
          if(mode==='oversized-metadata')f.metadata.get('C.md').frontmatter.Large='x'.repeat(20000);
          if(mode==='alias-resolution')f.metadata.get('C.md').frontmatter.aliases=['New alias'];
          if(mode==='date-property'){f.metadata.get('C.md').frontmatter.Date='2026-01-01';f.app.metadataTypeManager={getAssignedWidget:name=>name==='Date'?'date':'text'}};
          index.refreshVisibleHostMetadataPreviews('C.md',0);
          await deadline(index.publishHostMetadataPreview('A.md'),'safe unrelated fallback');
          ok(index.hostPreviewScopes.has('A.md'),'Unknown impact cannot preserve old warm incidence');
          equal(index.gateStats(index.get('A.md')).bottom.complete,false,'No invented numeric certainty');
          equal(index.isSemanticWriteReady('A.md','B.md'),false,'No stronger editing authority');
          releaseEvidence();await deadline(restore,'fenced completion');return true;
        }finally{index?.destroy();releaseEvidence?.();releaseSources?.();f.close()}
      })()`),true);
    }finally{await browser.cleanup()}
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
        releaseEvidence();equal((await deadline(index.waitForSnapshotHydration(),'old evidence completion')).restored,true,'Physically coherent cache survives as read-only presentation');await restore;
        equal(index.gateStats(index.get('A.md')).top.coverage,'cached','Old count presentation explicitly cached, not current proof');equal(index.isSemanticWriteReady('A.md','B.md'),false,'Retained cached evidence grants no old-pair authority');
        equal(index.getNeighborhood('A.md').parents.map(item=>item.page.path),['B.md'],'Retained complete cache stays coherent until current source replacement');
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

/** Node-only recovery must retain released certified incidence for immediate A→B→A navigation. */
test('eager source-backed navigation retains bounded canonical scopes and reuses unchanged revisits', async () => {
  const browser=await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize),true);
    assert.equal(await browser.evaluate(initialize),true);
    assert.equal(await browser.evaluate(`(async()=>{
      const M=sourceModules,{f,settings}=await startupSeed('foreground-released-scopes');let index,releaseA,releaseB,unblock;
      try {
        const db=await f.cache.open();await new Promise((resolve,reject)=>{const tx=db.transaction(['snapshotChunks'],'readwrite');tx.objectStore('snapshotChunks').clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
        index=new M.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>0},f.app);index.scheduleOrphanCleanup=()=>{};
        const replay=index.sourceAcquisition.replayNodeMetadata.bind(index.sourceAcquisition);let entered;const started=new Promise(resolve=>entered=resolve),hold=new Promise(resolve=>unblock=resolve);
        index.sourceAcquisition.replayNodeMetadata=async(path,...args)=>{if(path==='C.md'){entered();await hold;}return replay(path,...args)};
        settings.lastActivePath='A.md';releaseA=index.acquireSemanticDemand('A.md');ok((await index.restorePersistedSnapshot(['A.md'])).restored,'Physical preview');await deadline(started,'held vocabulary');
        equal(index.state.pages.get('A.md').neighbours.size,0,'Recovery catalog baseline has no incidence');ok(index.get('A.md').neighbours.has('https://example.com/startup-evidence'),'Canonical center scope includes body-only URL');
        const center=index.get('A.md'),count=index.gateStats(center).bottom.visibleCount;let requests=0;const prepare=index.sourceAcquisition.prepareRequestedNeighborhood.bind(index.sourceAcquisition);index.sourceAcquisition.prepareRequestedNeighborhood=async(...args)=>{requests++;return prepare(...args)};
        releaseA();releaseA=null;settings.lastActivePath='B.md';releaseB=index.acquireSemanticDemand('B.md');await index.ensureSemanticScope('B.md');
        ok(index.get('A.md').neighbours.has('https://example.com/startup-evidence'),'Released complete A outranks borrowed sparse A in B scope');equal(index.gateStats(index.get('A.md')).bottom.visibleCount,count,'Neighbor retains canonical gate count');
        const before=requests;releaseB();releaseB=null;settings.lastActivePath='A.md';releaseA=index.acquireSemanticDemand('A.md');await index.ensureSemanticScope('A.md');equal(requests,before,'Unchanged revisit has no requested-source recomputation');ok(index.get('A.md')===center,'Canonical page reused');
        ok(index.releasedSemanticScopePaths.size<=8,'Finite released scope cover');unblock();ok((await index.waitForSnapshotHydration()).restored,'Global vocabulary finishes independently');
        ok(index.get('A.md').neighbours.has('https://example.com/startup-evidence'),'Node vocabulary publication retains requested incidence');return true;
      }finally{unblock?.();releaseA?.();releaseB?.();index?.destroy();f.close()}
    })()`),true);
  }finally{await browser.cleanup()}
});

/** The policy projection budget follows cooperative slices, not normalized host-link cardinality. */
test('eager source node catalog avoids full mutable settings projection for every host-link record', async () => {
  const browser=await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize),true);
    assert.equal(await browser.evaluate(initialize),true);
    assert.equal(await browser.evaluate(`(async()=>{
      const M=sourceModules,{f,settings}=await startupSeed('foreground-policy-record-budget');let index;
      try {
        const db=await f.cache.open();await new Promise((resolve,reject)=>{const tx=db.transaction(['snapshotChunks'],'readwrite');tx.objectStore('snapshotChunks').clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
        const targets={};for(let n=0;n<1500;n++)targets['Ghost'+n]=1;f.app.metadataCache.unresolvedLinks={'C.md':targets};await f.acquisition.reconcile();f.acquisition.close();
        settings.lastActivePath='';let projections=0;const lenses=Array.from({length:100},(_,n)=>({name:'Lens'+n,predicate:'x'.repeat(256)}));Object.defineProperty(settings,'graphLenses',{enumerable:true,configurable:true,get(){projections++;return lenses;}});
        index=new M.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>0},f.app);index.scheduleOrphanCleanup=()=>{};
        ok((await index.restorePersistedSnapshot([])).restored,'Source recovery preview');ok((await deadline(index.waitForSnapshotHydration(),'node projection budget')).restored,'Node vocabulary completes');
        ok(index.search('Ghost1499',10).some(page=>page.path==='Ghost1499'),'Canonical host-only vocabulary retained');
        ok(projections<250,'Full policy projection is bounded by slices/phases, not1500links: '+projections);equal(index.getSourceAcquisitionCounters().vaultReads,0,'No body reads hide replay cost');return true;
      }finally{index?.destroy();f.close()}
    })()`),true);
  }finally{await browser.cleanup()}
});

/** Retained navigation cover is bounded independently of active requests and expires on source/policy change. */
test('released eager scopes evict oldest inactive centers and retain current active authority only', async () => {
  const browser=await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize),true);
    assert.equal(await browser.evaluate(initialize),true);
    assert.equal(await browser.evaluate(`(async()=>{
      const M=sourceModules,{f,settings}=await startupSeed('foreground-released-budget');let index,releaseA,releaseNext,unblock;
      try {
        for(let n=0;n<10;n++)f.add('Visit'+n+'.md','');await f.acquisition.reconcile();
        const db=await f.cache.open();await new Promise((resolve,reject)=>{const tx=db.transaction(['snapshotChunks'],'readwrite');tx.objectStore('snapshotChunks').clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
        index=new M.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>0},f.app);index.scheduleOrphanCleanup=()=>{};
        const replay=index.sourceAcquisition.replayNodeMetadata.bind(index.sourceAcquisition);let entered;const started=new Promise(resolve=>entered=resolve),hold=new Promise(resolve=>unblock=resolve);
        index.sourceAcquisition.replayNodeMetadata=async(path,...args)=>{if(path==='C.md'){entered();await hold;}return replay(path,...args)};
        releaseA=index.acquireSemanticDemand('A.md');ok((await index.restorePersistedSnapshot(['A.md'])).restored,'Source preview');await deadline(started,'held catalog');
        for(let n=0;n<10;n++){const path='Visit'+n+'.md';releaseNext=index.acquireSemanticDemand(path);await index.ensureSemanticScope(path);releaseNext();releaseNext=null;}
        equal(index.releasedSemanticScopePaths.size,8,'Only8inactive centers retained');ok(!index.semanticScopes.has('Visit0.md')&&!index.semanticScopes.has('Visit1.md'),'Oldest inactive scopes evicted');ok(index.semanticScopes.has('A.md'),'Active certified scope never evicted');
        const prepare=index.sourceAcquisition.prepareRequestedNeighborhood.bind(index.sourceAcquisition);let requests=0;index.sourceAcquisition.prepareRequestedNeighborhood=async(...args)=>{requests++;return prepare(...args)};
        releaseNext=index.acquireSemanticDemand('Visit0.md');await index.ensureSemanticScope('Visit0.md');ok(requests>0,'Evicted center uses canonical preparation again');releaseNext();releaseNext=null;
        const prior=index.semanticScopes.get('Visit9.md');f.metadata.get('Visit9.md').frontmatter.Parent='[[B]]';f.app.metadataCache.trigger('changed',f.files.get('Visit9.md'));index.refreshVisibleHostMetadataPreviews('Visit9.md',0);await index.flushSourceRepository();
        releaseNext=index.acquireSemanticDemand('Visit9.md');await index.ensureSemanticScope('Visit9.md');ok(index.semanticScopes.get('Visit9.md')!==prior,'Host metadata refresh cannot reuse released old scope');equal(index.getNeighborhood('Visit9.md').parents.map(x=>x.page.path),['B.md'],'New host interpretation wins');
        index.invalidateSemanticPolicy();ok(!index.isSemanticWriteReady('Visit9.md','B.md'),'Policy invalidation closes retained write authority');ok([...index.semanticScopes.values()].every(scope=>scope.policyRevision!==index.semanticPolicyRevision),'Coherent retained scopes cannot masquerade as current policy');index.destroy();equal(index.releasedSemanticScopePaths.size,0,'Lifetime disposal clears retention metadata');return true;
      }finally{unblock?.();releaseA?.();releaseNext?.();index?.destroy();f.close()}
    })()`),true);
  }finally{await browser.cleanup()}
});

/** Actual vault startup loads metadata while a physically unchanged trusted graph is being decoded. */
test('eager trusted cache survives startup metadata waves as honest read-only presentation without node-catalog rebuild', async () => {
  const browser=await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize),true);
    assert.equal(await browser.evaluate(initialize),true);
    assert.equal(await browser.evaluate(`(async()=>{
      const M=sourceModules,{f,settings}=await startupSeed('foreground-startup-host-wave');let index,unblock,release;
      try {
        let revision=0,entered;const scanning=new Promise(resolve=>entered=resolve),hold=new Promise(resolve=>unblock=resolve);
        index=new M.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>revision},f.app);index.scheduleOrphanCleanup=()=>{};
        const reconcile=index.sourceAcquisition.reconcile.bind(index.sourceAcquisition);index.sourceAcquisition.reconcile=async(...args)=>{entered();await hold;return reconcile(...args)};
        const pages=index.indexedDb.iterateSnapshotPages.bind(index.indexedDb);let wave=false;
        index.indexedDb.iterateSnapshotPages=async(meta,visit,...args)=>pages(meta,saved=>{
          if(!wave){wave=true;index.refreshVisibleHostMetadataPreviews('C.md',0);revision++;index.refreshVisibleHostMetadataPreviews('B.md',0);}
          return visit(saved);
        },...args);
        const result=await index.restorePersistedSnapshot(['A.md']);ok(result.restored,'Warm coherent preview retained');
        ok((await deadline(index.waitForSnapshotHydration(),'read-only wave cache')).restored,'Trusted cache hydration completes through metadata wave');await deadline(scanning,'background source inventory');
        ok(index.hasSourceBackedStartup(),'Current source owner certifies independently');ok(index.sourceNodeVocabularyPublished,'Already decoded global vocabulary remains available');
        ok(index.state.pages.get('A.md').neighbours.has('https://example.com/startup-evidence'),'Complete cached body-only incidence preserved');
        const gates=index.gateStats(index.state.pages.get('A.md'));equal(gates.bottom.visibleCount,1,'Cached numeric body-only gate retained');equal(gates.bottom.coverage,'cached','Count explicitly cached');equal(gates.bottom.complete,false,'No current exact-count authority');
        ok(!index.isSemanticWriteReady('A.md','B.md'),'Cached evidence never grants write authority');equal(index.getSourceAcquisitionCounters().vaultReads,0,'No cold Markdown rebuild');
        ok(index.getIndexDiagnostics().some(x=>x.reason==='startup-host-wave-cached-presentation'),'Explicit cause recorded');
        index.sourceAcquisition.replayNodeMetadata=()=>{throw new Error('Decoded complete vocabulary must not rebuild node catalog');};
        unblock();ok(await deadline(index.adoptStartupSources(),'retained vocabulary source adoption'),'Current source adoption completes without broad node replay');
        release=index.acquireSemanticDemand('A.md');await index.ensureSemanticScope('A.md');ok(index.preparedPageInfo.get(index.get('A.md')).completeRelations,'Current requested scope supersedes cached center');ok(index.gateStats(index.get('A.md')).bottom.coverage!=='cached','Known current scope never downgraded');return true;
      }finally{unblock?.();release?.();index?.destroy();f.close()}
    })()`),true);
  }finally{await browser.cleanup()}
});

/** Numeric cached counts require all saved adjacent targets; a first-hop neighbor remains partial. */
test('finite trusted warm preview labels complete saved gates cached and leaves truncated neighbor gates partial', async () => {
  const browser=await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize),true);
    assert.equal(await browser.evaluate(initialize),true);
    assert.equal(await browser.evaluate(`(async()=>{
      const M=sourceModules,{f,settings}=await startupSeed('foreground-finite-cached');let index,unblock;
      try {
        let entered;const reached=new Promise(resolve=>entered=resolve),hold=new Promise(resolve=>unblock=resolve);
        index=new M.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>0},f.app);index.scheduleOrphanCleanup=()=>{};
        const iterate=index.indexedDb.iterateSnapshotPages.bind(index.indexedDb);index.indexedDb.iterateSnapshotPages=async(...args)=>{entered();await hold;return iterate(...args)};
        const restored=await index.restorePersistedSnapshot(['A.md']);ok(restored.restored&&restored.partial,'Finite preview precedes broad page decode');await deadline(reached,'held full pages');
        const center=index.get('A.md'),gates=index.gateStats(center);equal(gates.top.visibleCount,1,'Complete cached center parent count');equal(gates.bottom.visibleCount,1,'Complete cached center body URL count');equal(gates.bottom.coverage,'cached','Complete finite center explicitly cached');equal(gates.bottom.complete,false,'No current/global count authority');
        const url=index.get('https://example.com/startup-evidence');ok(url,'Direct URL rendered');ok(index.preparedPageInfo.get(url)?.completeRelations===false,'URL origin outside first hop leaves neighbor incomplete');equal(index.gateStats(url).top.complete,false,'No total from partial neighbor');ok(index.gateStats(url).top.coverage!=='cached','Truncated neighbor is not mislabeled a cached total');ok(!index.isSemanticWriteReady('A.md','B.md'),'Finite cache never permits edits');return true;
      }finally{unblock?.();index?.destroy();f.close()}
    })()`),true);
  }finally{await browser.cleanup()}
});

for(const change of ['mtime','same-mtime-size','membership','policy']) {
  test('trusted warm host-wave retention rejects an intervening '+change+' mutation', async()=>{
    const browser=await chromiumHarness(bundle);
    try{
      assert.equal(await browser.evaluate(contributorBrowserInitialize),true);assert.equal(await browser.evaluate(initialize),true);
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,{f,settings}=await startupSeed('foreground-wave-fence-${change}');let index;
        try{
          index=new M.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>0},f.app);index.scheduleOrphanCleanup=()=>{};index.startPersistedSourceInventory=async()=>false;
          const pages=index.indexedDb.iterateSnapshotPages.bind(index.indexedDb);let changed=false;
          index.indexedDb.iterateSnapshotPages=async(meta,visit,...args)=>pages(meta,saved=>{if(!changed){changed=true;
            if('${change}'==='mtime')f.files.get('C.md').stat.mtime++;
            if('${change}'==='same-mtime-size')f.files.get('C.md').stat.size++;
            if('${change}'==='membership')f.add('New.md','');
            if('${change}'==='policy')settings.inverseInfer=true;
            index.refreshVisibleHostMetadataPreviews('C.md',0);
          }return visit(saved)},...args);
          await index.restorePersistedSnapshot(['A.md']);ok(!(await index.waitForSnapshotHydration()).restored,'Changed captured generation is rejected');ok(!index.isFullSnapshotHydrated(),'No complete cache promotion');ok(!index.isSemanticWriteReady('A.md','B.md'),'No stale authority');ok(!index.getIndexDiagnostics().some(x=>x.reason==='startup-host-wave-cached-presentation'),'Physical/policy change is not a harmless resolver wave');return true;
        }finally{index?.destroy();f.close()}
      })()`),true);
    }finally{await browser.cleanup()}
  });
}

/** Keep one unchanged visible demand across saved-preview restore and delayed source authority. */
for(const policy of [false,true])for(const order of ['before','after'])test('stationary offline-changed center receives current host relations before source authority ('+order+', policy '+policy+')',async()=>{
 const browser=await chromiumHarness(bundle);
 try{
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);assert.equal(await browser.evaluate(initialize),true);
  assert.equal(await browser.evaluate(`(async()=>{
   const M=sourceModules,{f,settings}=await startupSeed('stationary-offline-'+${JSON.stringify(order)});let index,release,unblock;
   try{
    if(${JSON.stringify(policy)})settings.hierarchy={...settings.hierarchy,rightFriends:['New challenger']};
    f.metadata.get('A.md').frontmatter.Parent='[[C]]';f.files.get('A.md').stat.mtime++;
    const gate=new Promise(resolve=>unblock=resolve);
    index=new M.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>0},f.app);index.scheduleOrphanCleanup=()=>{};
    const reconcile=index.sourceAcquisition.reconcile.bind(index.sourceAcquisition);
    index.sourceAcquisition.reconcile=async(...args)=>{await gate;return reconcile(...args)};
    if(${JSON.stringify(order)}==='before')release=index.acquireSemanticDemand('A.md');
    const restoring=index.restorePersistedSnapshot(['A.md']);
    if(${JSON.stringify(order)}==='after')release=index.acquireSemanticDemand('A.md');
    const restored=await deadline(restoring,'saved preview');ok(restored.restored,'Saved preview actually publishes');
    await deadline((async()=>{while(index.onDemandTasks.size)await Promise.all([...index.onDemandTasks.values()]);})(),'stationary local task drain');
    const parents=index.getNeighborhood('A.md')?.parents.map(n=>n.page.path);
    equal(parents,['C.md'],'Stationary center has current host parent without navigation or background source closure');
    ok(!index.isSemanticWriteReady('A.md','C.md'),'Host preview grants no pair write authority');
    unblock();await deadline(index.adoptStartupSources(),'eventual current source closure');
    await deadline(index.ensureSemanticScope('A.md'),'eventual stationary scope');
    equal(index.getNeighborhood('A.md').parents.map(n=>n.page.path),['C.md'],'Eventual canonical stationary center remains current');return true;
   }finally{unblock?.();release?.();index?.destroy();f.close()}
  })()`),true);
 }finally{await browser.cleanup()}
});


test('center watchdog repaints a canonical stationary view without semantic/source/snapshot work and keeps its receipt',async()=>{
 const browser=await chromiumHarness(bundle);try{
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);assert.equal(await browser.evaluate(initialize),true);
  assert.equal(await browser.evaluate(`(async()=>{
   const M=sourceModules,{f,settings}=await startupSeed('center-watchdog-current');let index,release;
   try{
    index=new M.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>0},f.app);index.scheduleOrphanCleanup=()=>{};
    release=index.acquireSemanticDemand('A.md');ok((await index.restorePersistedSnapshot(['A.md'])).restored,'Actual warm restore');await index.waitForSnapshotHydration();await index.adoptStartupSources();await index.ensureSemanticScope('A.md');
    ok(index.hasCurrentCanonicalCenter('A.md'),'Current complete center proof');const before=index.getSemanticRevision();let acquisitions=0,reads=0,snapshots=0,presentations=0;
    const acquire=index.sourceAcquisition.acquire.bind(index.sourceAcquisition);index.sourceAcquisition.acquire=(...args)=>{acquisitions++;return acquire(...args)};
    const read=f.app.vault.read.bind(f.app.vault);f.app.vault.read=(...args)=>{reads++;return read(...args)};
    const write=index.indexedDb.writeSnapshot.bind(index.indexedDb);index.indexedDb.writeSnapshot=(...args)=>{snapshots++;return write(...args)};
    const stop=index.subscribePresentation(()=>presentations++);
    ok(await index.recheckVisibleCenter('A.md',[0,0,0,0,0],'initial',()=>true),'Watchdog reads current canonical coverage');stop();
    equal([acquisitions,reads,snapshots,index.getSemanticRevision()-before],[0,0,0,0],'Repaint is presentation-only');equal(presentations,1,'Exactly one corrective notification');
    const receipt=index.getIndexDiagnostics().find(item=>item.reason==='center-watchdog:repainted');ok(receipt,'Repair is shareable');equal(receipt.centerCheck.before[0],1,'Available Parent count');equal(receipt.centerCheck.presented[0],0,'Stale rendered Parent count');equal(receipt.centerCheck.coverageAfter,'canonical','Coverage is explicit');
    for(let i=0;i<40;i++)index.noteBuildDecision('per-file-patch','fixture',i);
    equal(index.getIndexDiagnostics().length,20,'Diagnostic ring stays bounded');ok(index.getIndexDiagnostics().some(item=>item.reason==='center-watchdog:repainted'),'Background traffic cannot erase the latest useful receipt');await index.diagnosticWriteTask;
    ok((await f.cache.readIndexDiagnostics()).some(item=>item.reason==='center-watchdog:repainted'),'Receipt uses existing durable diagnostics');return true;
   }finally{release?.();index?.destroy();f.close()}
  })()`),true);
 }finally{await browser.cleanup()}
});

test('center watchdog refreshes late host relationships while global source authority is held',async()=>{
 const browser=await chromiumHarness(bundle);try{
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);assert.equal(await browser.evaluate(initialize),true);
  assert.equal(await browser.evaluate(`(async()=>{
   const M=sourceModules,{f,settings}=await startupSeed('center-watchdog-pending');let index,release,unblock;
   try{
    settings.hierarchy={...settings.hierarchy,rightFriends:['Changed challenger policy']};
    const gate=new Promise(resolve=>unblock=resolve);index=new M.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>0},f.app);index.scheduleOrphanCleanup=()=>{};
    const reconcile=index.sourceAcquisition.reconcile.bind(index.sourceAcquisition);index.sourceAcquisition.reconcile=async(...args)=>{await gate;return reconcile(...args)};
    release=index.acquireSemanticDemand('A.md');ok((await deadline(index.restorePersistedSnapshot(['A.md']),'preview')).restored,'Saved preview');
    await deadline((async()=>{while(index.onDemandTasks.size)await Promise.all([...index.onDemandTasks.values()])})(),'initial center');
    const visible=index.getNeighborhood('A.md'),presented=[visible.parents.length,visible.children.length,visible.leftFriends.length,visible.rightFriends.length,visible.siblings.length];
    equal(visible.parents.map(node=>node.page.path),['B.md'],'Initial stationary view');
    // Model a late host cache observation whose normal foreground notification was missed.
    f.metadata.get('A.md').frontmatter.Parent='[[C]]';f.app.metadataCache.resolvedLinks['A.md']={'C.md':1};f.files.get('A.md').stat.mtime++;
    let builds=0;index.rebuild=async()=>{builds++;throw Error('Watchdog requested a full build')};
    const complete=await deadline(index.recheckVisibleCenter('A.md',presented,'initial',()=>true),'bounded local watchdog');
    equal(complete,false,'Local paint is not global authority');equal(builds,0,'No full build');equal(index.getNeighborhood('A.md').parents.map(node=>node.page.path),['C.md'],'Same center updates from current host metadata without navigation');
    ok(!index.isSemanticWriteReady('A.md','C.md'),'Watchdog does not weaken write proof');const receipt=index.getIndexDiagnostics().filter(item=>item.centerCheck).at(-1);equal(receipt.centerCheck.sourceReadyBefore,false,'Held source closure recorded');ok(receipt.centerCheck.coverageAfter!=='canonical','Local repair is not represented as complete');
    // Replacing one Parent with another keeps role counts unchanged. The finite body cover now
    // also retains the existing body URL rather than dropping it to manufacture a count repair.
    equal(receipt.centerCheck.before,receipt.centerCheck.after,'Same-role replacement preserves every role count');equal(receipt.centerCheck.outcome,'pending','Unchanged counts retain honest pending global authority');
    unblock();await deadline(index.waitForSnapshotHydration(),'hydration');await deadline(index.adoptStartupSources(),'source closure');await deadline(index.ensureSemanticScope('A.md'),'canonical center');ok(await index.recheckVisibleCenter('A.md',presented,'source-ready',()=>true),'Single readiness follow-up');equal(index.getNeighborhood('A.md').parents.map(node=>node.page.path),['C.md'],'Canonical result preserved');return true;
   }finally{unblock?.();release?.();index?.destroy();f.close()}
  })()`),true);
 }finally{await browser.cleanup()}
});

for(const cancellation of ['navigation','same-stat-source-revision','file-replacement'])test('center watchdog rejects stale repair completion after '+cancellation,async()=>{
 const browser=await chromiumHarness(bundle);try{
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);assert.equal(await browser.evaluate(initialize),true);
  assert.equal(await browser.evaluate(`(async()=>{
   const M=sourceModules,{f,settings}=await startupSeed('center-watchdog-fence-${cancellation}');let index,release,unblock,finish;
   try{
    let source=0,owns=true,entered;settings.hierarchy={...settings.hierarchy,rightFriends:['Changed challenger policy']};
    const sourceGate=new Promise(resolve=>unblock=resolve);index=new M.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>source},f.app);index.scheduleOrphanCleanup=()=>{};
    const reconcile=index.sourceAcquisition.reconcile.bind(index.sourceAcquisition);index.sourceAcquisition.reconcile=async(...args)=>{await sourceGate;return reconcile(...args)};
    release=index.acquireSemanticDemand('A.md');await index.restorePersistedSnapshot(['A.md']);while(index.onDemandTasks.size)await Promise.all([...index.onDemandTasks.values()]);
    const reached=new Promise(resolve=>entered=resolve),gate=new Promise(resolve=>finish=resolve),preview=index.publishHostMetadataPreview.bind(index);
    index.publishHostMetadataPreview=async(...args)=>{await preview(...args);entered();await gate};
    const task=index.recheckVisibleCenter('A.md',[0,0,0,0,0],'initial',()=>owns);await deadline(reached,'held preview');
    if('${cancellation}'==='navigation')owns=false;
    if('${cancellation}'==='same-stat-source-revision')source++;
    if('${cancellation}'==='file-replacement')f.files.set('A.md',Object.assign(Object.create(Object.getPrototypeOf(f.files.get('A.md'))),f.files.get('A.md')));
    let notifications=0;const stop=index.subscribePresentation(()=>notifications++);finish();await deadline(task,'retired repair');stop();
    equal(notifications,0,'Retired continuation does not repaint or acquire its next scope');equal(index.getIndexDiagnostics().filter(row=>row.centerCheck).at(-1).centerCheck.outcome,'cancelled','Exact stale lifetime is diagnosed');return true;
   }finally{finish?.();unblock?.();release?.();index?.destroy();f.close()}
  })()`),true);
 }finally{await browser.cleanup()}
});

test('stationary startup watchdog retains finite center reads across a late real local baseline',async()=>{
 const browser=await chromiumHarness(bundle);try{
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);assert.equal(await browser.evaluate(initialize),true);
  assert.equal(await browser.evaluate(`(async()=>{
   const M=sourceModules,{f,settings}=await startupSeed('late-local-watchdog');let index,release,stop,first,second,source;
   const build=M.GraphBuilder.prototype.buildStructuralBaseline;
   try{
    settings.hierarchy={...settings.hierarchy,rightFriends:['Changed challenger policy']};
    f.metadata.get('A.md').frontmatter.Large='x'.repeat(20000);f.files.get('A.md').stat.mtime++;
    const firstGate=new Promise(r=>first=r),secondGate=new Promise(r=>second=r),sourceGate=new Promise(r=>source=r);let baselines=0;
    M.GraphBuilder.prototype.buildStructuralBaseline=async function(...args){const ordinal=++baselines;await(ordinal===1?firstGate:secondGate);return build.apply(this,args)};
    index=new M.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>0},f.app);index.scheduleOrphanCleanup=()=>{};
    const reconcile=index.sourceAcquisition.reconcile.bind(index.sourceAcquisition);index.sourceAcquisition.reconcile=async(...args)=>{await sourceGate;return reconcile(...args)};
    let requests=0;const request=index.ensureOnDemandCenter.bind(index);index.ensureOnDemandCenter=(...args)=>{requests++;return request(...args)};
    await index.primePhysicalSearchCatalog();release=index.acquireSemanticDemand('A.md');await deadline((async()=>{while(!baselines)await new Promise(r=>setTimeout(r,0))})(),'first baseline');
    const timers=new Map();let serial=0,initialFinished=false;
    stop=M.startCenterWatchdog({schedule:run=>{const id=++serial;timers.set(id,run);return()=>timers.delete(id)},localReady:()=>index.hasLocalBaseline(),sourceReady:()=>index.isCenterRecoverySourceReady(),subscribe:fn=>index.subscribePresentation(fn),check:async(trigger,current)=>{const complete=await index.recheckVisibleCenter('A.md',[0,0,0,0,0],trigger,current);if(trigger==='initial')initialFinished=true;return complete}});
    const fire=()=>{const [id,run]=timers.entries().next().value;timers.delete(id);run()};fire();
    await index.publishHostMetadataPreview('A.md');equal(index.getNeighborhood('A.md')?.parents.length??0,1,'Finite center cover already exposes the Parent independently of the held baseline');
    await deadline((async()=>{while(requests<2)await new Promise(r=>setTimeout(r,0))})(),'watchdog joined original center owner');
    const restoring=index.restorePersistedSnapshot(['A.md']);first();
    await deadline((async()=>{while(!initialFinished||baselines<2)await new Promise(r=>setTimeout(r,0))})(),'pending first check and replacement baseline').catch(error=>{throw Error(error.message+' '+JSON.stringify({baselines,initialFinished,timers:timers.size,baselineReady:index.hasLocalBaseline(),arbitration:Boolean(index.eagerPreviewArbitration),tasks:index.onDemandTasks.size,source:index.isCenterRecoverySourceReady(),decisions:index.getIndexDiagnostics(),phase:index.getSnapshotHydrationDiagnostics()}))});
    equal(index.getIndexDiagnostics().filter(row=>row.centerCheck).at(-1).centerCheck.outcome,'repainted','Stale presented counts repaint from the independent finite cover');
    equal(timers.size,0,'No polling while local baseline is held');ok(!index.hasLocalBaseline(),'Replacement local baseline remains held');
    second();await deadline((async()=>{while(!index.hasLocalBaseline()||!timers.size)await new Promise(r=>setTimeout(r,0))})(),'local readiness notification');
    ok(!index.isCenterRecoverySourceReady(),'Global source inventory remains held');fire();
    await deadline((async()=>{while(!index.getIndexDiagnostics().some(row=>row.centerCheck?.trigger==='local-ready'&&row.centerCheck.outcome!=='checking'))await new Promise(r=>setTimeout(r,0))})(),'local milestone repair');
    equal(index.getNeighborhood('A.md').parents.map(node=>node.page.path),['B.md'],'Stationary center has complete direct host Parent without navigation');
    const receipt=index.getIndexDiagnostics().filter(row=>row.centerCheck?.trigger==='local-ready').at(-1);equal(receipt.centerCheck.sourceReadyAfter,false,'Local repair does not claim global source readiness');equal(timers.size,0,'No timer loop after local work');
    stop();source();await deadline(restoring,'release held source inventory');return true;
   }finally{first?.();second?.();source?.();stop?.();release?.();index?.destroy();M.GraphBuilder.prototype.buildStructuralBaseline=build;f.close()}
  })()`),true);
 }finally{await browser.cleanup()}
});

/** A current center's finite host/body cover must not join unrelated whole-vault compilation. */
for (const surface of ["frontmatter", "body", "cached-body"]) {
  test(`stationary dense ${surface} center becomes readable before a held whole-vault baseline`, async () => {
    const browser = await chromiumHarness(bundle);
    try {
      assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
      assert.equal(await browser.evaluate(initialize), true);
      assert.equal(await browser.evaluate(`(async () => {
        const M = sourceModules, { f, settings } = await startupSeed('finite-center-before-baseline-${surface}');
        const build = M.GraphBuilder.prototype.buildStructuralBaseline;
        let index, releaseDemand, releaseBaseline, releaseSources, unsubscribe;
        let baselineEntered = false, baselineReleased = false;
        const baselineGate = new Promise(resolve => { releaseBaseline = resolve; });
        const sourceGate = new Promise(resolve => { releaseSources = resolve; });
        try {
          const targets = Array.from({ length: 37 }, (_, ordinal) => 'Use case ' + String(ordinal + 1).padStart(2, '0'));
          const links = targets.map(path => '[[' + path + ']]');
          // The finite cover accepts this ordinary note. The frontmatter control exceeds only
          // the tiny first-paint budget; the body control has small ordinary frontmatter and
          // hides aggregate inferred edges so only actual body ontology can satisfy the check.
          const frontmatter = f.metadata.get('A.md').frontmatter;
          if (${JSON.stringify(surface)} === 'frontmatter') {
            frontmatter.Large = 'x'.repeat(20000);
            frontmatter.Child = links;
          }
          else f.texts.set('A.md', 'Child:: ' + links.join(' '));
          f.files.get('A.md').stat.mtime++;
          if (${JSON.stringify(surface)} === 'cached-body') {
            ok(await f.cache.putBody('A.md', f.files.get('A.md').stat.mtime, M.parseBodyMetadata(f.texts.get('A.md'))), 'Current parsed body is genuinely persisted');
          }
          f.app.metadataCache.unresolvedLinks = { 'A.md': Object.fromEntries(targets.map(path => [path, 1])) };
          settings.indexingThrottle = 'responsive';
          settings.renderSiblings = false;
          settings.showFolderNodes = false;
          settings.showInferredNodes = false;
          f.reads.length = 0;
          f.parses.length = 0;

          // Hold the actual producer before it can prepare or publish any all-vault state.
          // Neither the body/cache/source owners nor the canonical compiler are substituted.
          M.GraphBuilder.prototype.buildStructuralBaseline = async function (...args) {
            baselineEntered = true;
            await baselineGate;
            return build.apply(this, args);
          };
          index = new M.GraphIndex({ app: f.app, settings, getIndexSourceRevision: () => 0 }, f.app);
          index.scheduleOrphanCleanup = () => {};
          const reconcile = index.sourceAcquisition.reconcile.bind(index.sourceAcquisition);
          index.sourceAcquisition.reconcile = async (...args) => { await sourceGate; return reconcile(...args); };
          await index.primePhysicalSearchCatalog();
          let available;
          const readable = new Promise(resolve => { available = resolve; });
          const observe = () => {
            const children = index.getNeighborhood('A.md')?.children.map(node => node.page.path) ?? [];
            if (targets.every(path => children.includes(path))) available();
          };
          unsubscribe = index.subscribePresentation(observe);
          releaseDemand = index.acquireSemanticDemand('A.md');
          await deadline((async () => {
            while (!baselineEntered) await new Promise(resolve => setTimeout(resolve, 0));
          })(), 'real all-vault baseline admission');
          observe();
          await deadline(readable, 'finite current-center ${surface} cover before all-vault baseline').catch(error => {
            throw new Error(error.message + ' ' + JSON.stringify({
              baselineReleased, localBaseline: index.hasLocalBaseline(), sourceReady: index.isCenterRecoverySourceReady(),
              reads: f.reads.length, children: index.getNeighborhood('A.md')?.children.length ?? 0,
            }));
          });
          equal(baselineReleased, false, 'No global baseline work was released');
          equal(index.hasLocalBaseline(), false, 'Finite readability does not pretend the global baseline completed');
          equal(index.isCenterRecoverySourceReady(), false, 'Global semantic source inventory remains held');
          equal(index.getNeighborhood('A.md').children.map(node => node.page.path).sort(), [...targets].sort(), 'All 37 unresolved children are readable while stationary');
          equal(index.isSemanticWriteReady('A.md', 'B.md'), false, 'Readonly finite cover grants no relationship write authority');
          ok(f.reads.every(path => path === 'A.md'), 'Foreground body acquisition is confined to the actual center');
          if (${JSON.stringify(surface)} === 'body') equal(f.reads, ['A.md'], 'Body-only children use the real bounded center acquisition once');
          if (${JSON.stringify(surface)} === 'cached-body') {
            equal(f.reads, [], 'Current warm parser input avoids native body reads');
            equal(index.getSourceAcquisitionCounters().parses, 0, 'Current warm parser input avoids parsing');
          }
          return true;
        } finally {
          unsubscribe?.();
          releaseDemand?.();
          index?.destroy();
          baselineReleased = true;
          releaseBaseline?.();
          releaseSources?.();
          M.GraphBuilder.prototype.buildStructuralBaseline = build;
          f.close();
        }
      })()`), true);
    } finally {
      await browser.cleanup();
    }
  });
}

/** Held native I/O closes the real parser/publication fences on release and changed observations. */
for (const interruption of ["navigation", "unload", "source-wave"]) {
  test(`finite center preview rejects a held body after ${interruption}`, async () => {
    const browser = await chromiumHarness(bundle);
    try {
      assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
      assert.equal(await browser.evaluate(initialize), true);
      assert.equal(await browser.evaluate(`(async () => {
        const M = sourceModules, { f, settings } = await startupSeed('finite-held-body-${interruption}');
        const build = M.GraphBuilder.prototype.buildStructuralBaseline;
        const nativeRead = f.app.vault.cachedRead;
        let index, releaseDemand, releaseBody, releaseBaseline, entered, owner;
        const bodyGate = new Promise(resolve => { releaseBody = resolve; });
        const baselineGate = new Promise(resolve => { releaseBaseline = resolve; });
        const bodyEntered = new Promise(resolve => { entered = resolve; });
        let sourceRevision = 0, reads = 0;
        try {
          f.texts.set('A.md', 'Child:: [[Current body child]]');
          f.files.get('A.md').stat.mtime++;
          settings.showInferredNodes = false;
          settings.showFolderNodes = false;
          settings.renderSiblings = false;
          f.reads.length = 0;
          f.app.vault.cachedRead = async file => {
            const text = await nativeRead(file);
            if (file.path === 'A.md' && ++reads === 1) { entered(); await bodyGate; }
            return text;
          };
          M.GraphBuilder.prototype.buildStructuralBaseline = async function (...args) {
            await baselineGate;
            return build.apply(this, args);
          };
          index = new M.GraphIndex({ app: f.app, settings, getIndexSourceRevision: () => sourceRevision }, f.app);
          index.scheduleOrphanCleanup = () => {};
          await index.primePhysicalSearchCatalog();
          releaseDemand = index.acquireSemanticDemand('A.md');
          await deadline(bodyEntered, 'real requested native body read');
          owner = index.onDemandTasks.get('A.md');
          ok(owner, 'The existing finite demand owner retains the pending native read');
          if (${JSON.stringify(interruption)} !== 'source-wave') {
            if (${JSON.stringify(interruption)} === 'navigation') releaseDemand();
            else index.destroy();
            releaseBody();
            await deadline(owner, 'retired body owner');
            ok(!index.onDemandHostScopes.has('A.md'), 'Late native result cannot republish a retired center scope');
            equal(index.getSourceAcquisitionCounters().parses, 0, 'Cancelled native result is rejected before parsing');
          } else {
            // A changed source stamp retires the first read while the exact same demand stays
            // live. There is no navigation, source-ready signal or second demand to rescue it.
            sourceRevision++;
            releaseBody();
            await deadline((async () => {
              while (!index.getNeighborhood('A.md')?.children.some(node => node.page.path === 'Current body child')) {
                await new Promise(resolve => setTimeout(resolve, 0));
              }
            })(), 'same-demand readmission after changed source observation');
            equal(reads, 2, 'One genuinely changed observation admits one replacement native read');
            equal(index.getSourceAcquisitionCounters().parses, 1, 'Only the current native result reaches the canonical parser');
            equal(index.hasLocalBaseline(), false, 'Source-wave recovery is independent of held global baseline');
            equal(index.isCenterRecoverySourceReady(), false, 'Source-wave recovery grants no global source authority');
          }
          equal(index.isSemanticWriteReady('A.md', 'B.md'), false, 'Neither cancellation path grants semantic write authority');
          return true;
        } finally {
          releaseDemand?.();
          index?.destroy();
          releaseBody?.();
          releaseBaseline?.();
          M.GraphBuilder.prototype.buildStructuralBaseline = build;
          f.app.vault.cachedRead = nativeRead;
          f.close();
        }
      })()`), true);
    } finally {
      await browser.cleanup();
    }
  });
}

/** The actual host collector rejects its mixed map; its existing baseline owner must retain demand. */
test("local baseline retries a real host-link finality rejection without another demand or source-ready signal", async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(initialize), true);
    assert.equal(await browser.evaluate(`(async () => {
      const M = sourceModules, { f, settings } = await startupSeed('baseline-host-finality-retry');
      const build = M.GraphBuilder.prototype.buildStructuralBaseline;
      const finalize = M.ObsidianHostLinkSourceCollector.prototype.finalize;
      let index, builds = 0, changed = false, rejected = false;
      try {
        index = new M.GraphIndex({ app: f.app, settings, getIndexSourceRevision: () => 0 }, f.app);
        index.scheduleOrphanCleanup = () => {};
        M.GraphBuilder.prototype.buildStructuralBaseline = async function (...args) {
          builds++;
          return build.apply(this, args);
        };
        M.ObsidianHostLinkSourceCollector.prototype.finalize = async function (...args) {
          const alter = this.startingSourcePath === null && !changed;
          if (alter) {
            changed = true;
            f.app.metadataCache.resolvedLinks['A.md']['B.md']++;
            index.refreshVisibleHostMetadataPreviews('C.md');
          }
          const result = await finalize.apply(this, args);
          if (alter) rejected = result === null;
          return result;
        };
        ok(await deadline(index.initializeOnDemandBaseline(['A.md']), 'same-owner baseline host-wave recovery'), 'Actual replacement baseline publishes');
        equal(rejected, true, 'The production collector rejected the first mixed host-link family');
        equal(builds, 2, 'One changed observation admits exactly one replacement private pass');
        equal(index.hasLocalBaseline(), true, 'Existing baseline readiness is eventually published');
        ok(index.getNeighborhood('A.md')?.children.some(node => node.page.path === 'B.md'), 'Current host relationships remain readable');
        equal(index.isCenterRecoverySourceReady(), false, 'Local baseline grants no global source authority');
        equal(f.reads, [], 'Baseline recovery reads no Markdown bodies');
        return true;
      } finally {
        index?.destroy();
        M.GraphBuilder.prototype.buildStructuralBaseline = build;
        M.ObsidianHostLinkSourceCollector.prototype.finalize = finalize;
        f.close();
      }
    })()`), true);
  } finally {
    await browser.cleanup();
  }
});

/** A policy token can retire a private baseline even when no ordinary builder advanced generation. */
test("semantic policy invalidation rejects a held real local baseline without a generation change", async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(initialize), true);
    assert.equal(await browser.evaluate(`(async () => {
      const M = sourceModules, { f, settings } = await startupSeed('baseline-semantic-policy-fence');
      const build = M.GraphBuilder.prototype.buildStructuralBaseline;
      let index, releaseBuild, entered;
      const gate = new Promise(resolve => { releaseBuild = resolve; });
      const reached = new Promise(resolve => { entered = resolve; });
      try {
        index = new M.GraphIndex({ app: f.app, settings, getIndexSourceRevision: () => 0 }, f.app);
        index.scheduleOrphanCleanup = () => {};
        M.GraphBuilder.prototype.buildStructuralBaseline = async function (...args) {
          entered();
          await gate;
          return build.apply(this, args);
        };
        const baseline = index.initializeOnDemandBaseline(), state = index.state;
        await deadline(reached, 'real local baseline producer admission');
        const generation = index.generation;
        index.invalidateSemanticPolicy();
        equal(index.generation, generation, 'No ordinary active builder advances the generation');
        releaseBuild();
        equal(await deadline(baseline, 'policy-retired local baseline'), false, 'Old-policy baseline cannot publish');
        ok(index.state === state, 'Policy-retired producer leaves published graph identity unchanged');
        equal(index.hasLocalBaseline(), false, 'Retired baseline grants no current readiness');
        equal(index.isCenterRecoverySourceReady(), false, 'Retired baseline grants no source authority');
        return true;
      } finally {
        index?.destroy();
        releaseBuild?.();
        M.GraphBuilder.prototype.buildStructuralBaseline = build;
        f.close();
      }
    })()`), true);
  } finally {
    await browser.cleanup();
  }
});

/** Native host maps can close after a successful sparse cover while its canonical owner awaits P2. */
test("stationary plain-link host waves refresh finite cover before the same held baseline and retain unrelated observations", async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(initialize), true);
    assert.equal(await browser.evaluate(`(async () => {
      const M = sourceModules, { f, settings } = await startupSeed('finite-host-map-wave');
      const build = M.GraphBuilder.prototype.buildStructuralBaseline;
      let index, releaseDemand, releaseBuild, entered;
      const gate = new Promise(resolve => { releaseBuild = resolve; });
      const reached = new Promise(resolve => { entered = resolve; });
      try {
        const children = Array.from({ length: 37 }, (_, ordinal) => 'Plain use case ' + ordinal);
        f.texts.set('A.md', children.map(path => '[[' + path + ']]').join(' '));
        f.metadata.get('A.md').frontmatter = { Parent: ['[[B]]', '[[C]]'] };
        f.files.get('A.md').stat.mtime++;
        f.add('D.md', '[[A]]');
        f.add('Unrelated.md', '');
        f.app.metadataCache.resolvedLinks = { 'A.md': { 'B.md': 1, 'C.md': 1 } };
        f.app.metadataCache.unresolvedLinks = {};
        settings.showFolderNodes = false;
        settings.renderSiblings = false;
        settings.showInferredNodes = true;
        f.reads.length = 0;
        M.GraphBuilder.prototype.buildStructuralBaseline = async function (...args) {
          entered();
          await gate;
          return build.apply(this, args);
        };
        index = new M.GraphIndex({ app: f.app, settings, getIndexSourceRevision: () => 0 }, f.app);
        index.scheduleOrphanCleanup = () => {};
        let previewActive = 0, previewMaximum = 0, previews = 0;
        const prepare = index.prepareOnDemandCenterPreview.bind(index);
        index.prepareOnDemandCenterPreview = async (...args) => {
          previews++;
          previewMaximum = Math.max(previewMaximum, ++previewActive);
          try { return await prepare(...args); } finally { previewActive--; }
        };
        const waitFor = async (predicate, label) => deadline((async () => {
          while (!predicate()) {
            if (index.diagnosticsClosed) return;
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        })(), label);
        await index.primePhysicalSearchCatalog();
        releaseDemand = index.acquireSemanticDemand('A.md');
        await deadline(reached, 'real held all-vault baseline admission');
        equal(index.getNeighborhood('A.md').parents.length, 2, 'Initial native host projection succeeds sparsely');
        equal(index.getNeighborhood('A.md').children.length, 0, 'Plain wiki links require the actual host link facts');
        const canonicalOwner = index.onDemandTasks.get('A.md');

        // Feed the same actual host/source event owners as startup metadata acquisition. The
        // existing canonical task remains pending on its unchanged global baseline promise.
        f.app.metadataCache.unresolvedLinks['A.md'] = Object.fromEntries(children.map(path => [path, 1]));
        f.app.metadataCache.resolvedLinks['D.md'] = { 'A.md': 1 };
        for (const path of ['A.md', 'D.md']) {
          f.app.metadataCache.trigger('changed', f.files.get(path));
          index.refreshVisibleHostMetadataPreviews(path);
        }
        await waitFor(() => {
          const visible = index.getNeighborhood('A.md');
          return visible?.parents.length === 3 && visible.children.length === 37;
        }, 'stationary 3-parent 37-child finite host-wave recovery before global baseline');
        ok(index.onDemandTasks.get('A.md') === canonicalOwner, 'No replacement canonical request or navigation rescues the center');
        equal(index.hasLocalBaseline(), false, 'Global baseline remains held');
        equal(index.isCenterRecoverySourceReady(), false, 'No global source-ready signal rescues the center');

        const cover = index.get('A.md'), completedPreviews = previews;
        f.metadata.get('Unrelated.md').hostTags = ['#late/host-tag'];
        f.app.metadataCache.trigger('changed', f.files.get('Unrelated.md'));
        equal(index.refreshVisibleHostMetadataPreviews('Unrelated.md'), false, 'Unrelated loaded metadata has no center impact');
        ok(index.get('A.md') === cover, 'Unrelated host revision retains the current readonly cover');
        equal(index.getNeighborhood('A.md').children.length, 37, 'Unrelated startup waves cannot erase the usable center');
        equal(previews, completedPreviews, 'Unrelated observations schedule no extra P1 center compiler');

        delete f.app.metadataCache.unresolvedLinks['A.md'][children[0]];
        f.app.metadataCache.trigger('changed', f.files.get('A.md'));
        index.refreshVisibleHostMetadataPreviews('A.md');
        await waitFor(() => index.getNeighborhood('A.md')?.children.length === 36, 'current negative host observation');
        ok(!index.getNeighborhood('A.md').children.some(node => node.page.path === children[0]), 'Actual center removal replaces cached positive incidence');
        equal(previewMaximum, 1, 'Finite center work is coalesced across source/host observations');
        ok(f.reads.every(path => path === 'A.md'), 'Host waves acquire no unrelated note bodies');
        equal(index.isSemanticWriteReady('A.md', 'B.md'), false, 'Finite host recovery grants no semantic write authority');
        return true;
      } finally {
        releaseDemand?.();
        index?.destroy();
        releaseBuild?.();
        M.GraphBuilder.prototype.buildStructuralBaseline = build;
        f.close();
      }
    })()`), true);
  } finally {
    await browser.cleanup();
  }
});


test('optional settings retry exhaustion cannot reject a valid hydrated snapshot or admit source recovery',async()=>{
 const browser=await chromiumHarness(bundle);
 try{
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);assert.equal(await browser.evaluate(initialize),true);
  assert.equal(await browser.evaluate(`(async()=>{
   const M=sourceModules,{f,settings}=await startupSeed('foreground-optional-settings-pending');let index,release;
   try{
    index=new M.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>0},f.app);index.scheduleOrphanCleanup=()=>{};
    const gate=new Promise(resolve=>release=resolve),reconcile=index.sourceAcquisition.reconcile.bind(index.sourceAcquisition);
    index.sourceAcquisition.reconcile=async(...args)=>{await gate;return reconcile(...args)};
    let recovery=0,retries=0,fail=false;const recover=index.restoreSourceBackedBaseline.bind(index),search=index.prepareSearchIndex.bind(index),evidence=index.indexedDb.iterateSnapshotEvidence.bind(index.indexedDb);
    index.restoreSourceBackedBaseline=(...args)=>{recovery++;return recover(...args)};
    index.prepareSearchIndex=(...args)=>{if(fail){retries++;return Promise.resolve(null)}return search(...args)};
    const original=settings.showFullTagName;
    index.indexedDb.iterateSnapshotEvidence=async(...args)=>{const result=await evidence(...args);settings.showFullTagName=!original;fail=true;return result};
    const restored=await deadline(index.restorePersistedSnapshot(['A.md']),'trusted preview');ok(restored.restored,'Navigation preview remains valid');
    const full=await deadline(index.waitForSnapshotHydration(),'optional-pending full hydration');ok(full.restored,'Optional failure does not reject source snapshot');
    equal(recovery,0,'No source recovery admission');ok(retries>0&&retries<=8,'Actual optional retry budget reached');
    ok(index.state.pages.get('A.md').neighbours.has('https://example.com/startup-evidence'),'Cached body-only relationships retained');
    equal(index.presentationSettings.showFullTagName,original,'Coherent prior display policy remains prepared');equal(index.getSourceAcquisitionCounters().vaultReads,0,'No repair reads');
    fail=false;await index.refreshPresentationSettings();equal(index.presentationSettings.showFullTagName,settings.showFullTagName,'Explicit later valid display retry converges');return true;
   }finally{release?.();index?.destroy();f.close()}
  })()`),true);
 }finally{await browser.cleanup()}
});
