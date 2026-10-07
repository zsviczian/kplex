/** Eager foreground availability and authority fences through production GraphIndex with real browser IndexedDB. */
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
