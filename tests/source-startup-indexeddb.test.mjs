/** SI5 production restart adoption and selective replay repair through real browser IndexedDB. */
import assert from "node:assert/strict";
import test from "node:test";
import { contributorBrowserBundle, contributorBrowserInitialize } from "./support/contributorBrowserFixture.mjs";
import { chromiumHarness } from "./support/browserTypeScript.mjs";
import { hostOracle, collect } from "./support/cachedSourceFixture.mjs";
import { fullCenterIndex, currentNeighborhoodView, centerGateSettings } from "./support/requestedCenterGateFixture.mjs";

const bundle = await contributorBrowserBundle(["src/index/GraphIndex.ts", "src/index/GraphBuilder.ts", "src/index/IndexSnapshot.ts",
  "src/core/graph/compiler.ts", "src/adapters/obsidian/metadataSourceCollector.ts", "src/adapters/obsidian/ontologySourceCollector.ts"]);

test("restart after ontology changes reuses the old graph only as a source-backed baseline", async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(`(async()=>{
      const assert=Object.assign((v,m)=>ok(v,m),{equal}),M=sourceModules,f=await fixture('si5-policy-restart');
      const collect=${collect.toString()},hostOracle=${hostOracle.toString()},fullCenterIndex=${fullCenterIndex.toString()};
      const currentNeighborhoodView=${currentNeighborhoodView.toString()},centerGateSettings=${centerGateSettings.toString()};
      const wait=async(fn)=>{const at=Date.now();while(Date.now()-at<10000){if(await fn())return;await new Promise(r=>setTimeout(r,20))}throw Error('Restart did not converge')};
      let initial,index,oracle,release;
      try{
        f.text=f.texts;f.add('A.md','Friends:: [[B]]');f.add('B.md','');f.app.vault.getName=()=> 'si5-policy-restart';f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??(path==='/'||path===''?f.app.vault.getRoot():null);
        await f.acquire();ok(await f.acquisition.reconcile(),'Initial neutral inventory');
        const semantic={hierarchy:{hidden:[],parents:[],children:[],leftFriends:['Friends'],rightFriends:[],previous:[],next:[]},
          inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
        const presentation={noteTypeField:'Type',primaryTagField:'Style'},view=centerGateSettings({showFolderNodes:false});
        initial=await fullCenterIndex(M,f,await hostOracle(f,['A.md','B.md'],semantic,presentation,true),semantic,view);
        ok(await f.cache.writeSnapshot({createdAt:Date.now(),vaultSignature:M.computeVaultSignature(f.app),
          settingsSignature:M.computeIndexSettingsSignature(initial.plugin.settings),discoveredFields:[]},
          [...initial.state.pages.values()].map(p=>M.persistedPageFromGraphPage(p)),
          [...initial.state.evidence.declarations()].map(e=>M.persistedDeclarationFromEvidence(e))),'Complete optional acceleration');
        const db=await f.cache.open(),heads=await value(db.transaction('sourceHeads').objectStore('sourceHeads').getAll());
        initial.destroy();initial=null;f.acquisition.close();
        const changed={...semantic,hierarchy:{...semantic.hierarchy,leftFriends:[],rightFriends:['Friends']}};
        index=new M.GraphIndex({app:f.app,settings:{...changed,...view,lastActivePath:'A.md',pinnedNodes:[]},getIndexSourceRevision:()=>0},f.app);
        index.scheduleOrphanCleanup=()=>{};
        release=index.acquireSemanticDemand('A.md');
        const restore=await index.restorePersistedSnapshot(['A.md']);ok(restore.restored,'Changed policy does not discard physical acceleration '+JSON.stringify({restore,diagnostics:index.getIndexDiagnostics(),source:index.getSourceRepositoryDiagnostics(),catalog:await index.indexedDb.readSnapshotCatalog(),comparison:M.compareIndexSettingsSignature?.((await index.indexedDb.readSnapshotCatalog()).active?.settingsSignature,index.plugin.settings)}));
        equal((await index.waitForSnapshotHydration()).restored,true,'Complete optional baseline');
        await wait(()=>index.sourceAcquisition.hasSemanticDependencies());await index.refreshSemanticSettings();
        equal(index.hasPendingSemanticPreparation(),false,'Current requested publication ready');
        ok(index.get('A.md').neighbours.get('B.md')?.isRightFriend,'Challenger from saved new policy');
        ok(index.sourceBackedSemantics,'Old policy never promoted as current semantic authority');
        equal(index.getSemanticPreparationDiagnostics().fullBuilds,0,'No startup full graph build');
        equal(index.getSourceAcquisitionCounters().vaultReads,0,'No valid-fact Markdown reads');equal(index.getSourceAcquisitionCounters().parses,0,'No reparsing');
        equal(await value(db.transaction('sourceHeads').objectStore('sourceHeads').getAll()),heads,'No source restamping');
        oracle=await fullCenterIndex(M,f,await hostOracle(f,['A.md','B.md'],changed,presentation,true),changed,view);
        equal(currentNeighborhoodView(index,'A.md'),currentNeighborhoodView(oracle,'A.md'),'Canonical new-policy provenance/gates/siblings');
        index.scheduleSnapshotPersist();equal(index.snapshotPersistTimer,null,'Borrowed baseline never written as complete new-policy graph');
        return true;
      }finally{release?.();oracle?.destroy();initial?.destroy();index?.destroy();f.close()}
    })()`), true);
  } finally { await browser.cleanup(); }
});

for (const damage of ["missing", "metadata", "chunks", "offline-edit"]) {
  test(`source-backed startup recovers ${damage} graph acceleration without reacquiring valid owners`, async () => {
    const browser = await chromiumHarness(bundle);
    try {
      assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
      assert.equal(await browser.evaluate(`(async()=>{
        const assert=Object.assign((v,m)=>ok(v,m),{equal}),M=sourceModules,damage=${JSON.stringify(damage)},name='si5-graph-'+damage,f=await fixture(name);
        const collect=${collect.toString()},hostOracle=${hostOracle.toString()},fullCenterIndex=${fullCenterIndex.toString()};
        const currentNeighborhoodView=${currentNeighborhoodView.toString()},centerGateSettings=${centerGateSettings.toString()};
        let initial,index,oracle,release;
        try {
          f.text=f.texts;f.add('A.md','Friends:: [[B]]');f.add('B.md','');f.app.vault.getName=()=>name;
          f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??(path==='/'||path===''?f.app.vault.getRoot():null);
          await f.acquire();ok(await f.acquisition.reconcile(),'Initial facts complete');
          const semantic={hierarchy:{hidden:[],parents:[],children:[],leftFriends:['Friends'],rightFriends:[],previous:[],next:[]},
            inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
          const presentation={noteTypeField:'Type',primaryTagField:'Style'},view=centerGateSettings({showFolderNodes:false});
          initial=await fullCenterIndex(M,f,await hostOracle(f,['A.md','B.md'],semantic,presentation,true),semantic,view);
          if(damage==='chunks')ok(await f.cache.writeSnapshot({createdAt:Date.now(),vaultSignature:M.computeVaultSignature(f.app),
            settingsSignature:M.computeIndexSettingsSignature(initial.plugin.settings),discoveredFields:[]},
            [...initial.state.pages.values()].map(p=>M.persistedPageFromGraphPage(p)),
            [...initial.state.evidence.declarations()].map(e=>M.persistedDeclarationFromEvidence(e))),'Acceleration saved');
          const db=await f.cache.open(),heads=await value(db.transaction('sourceHeads').objectStore('sourceHeads').getAll());
          if(damage==='metadata')await edit(db,['meta'],tx=>tx.objectStore('meta').put({key:'active',schema:999,generation:'invalid'}));
          if(damage==='chunks')await edit(db,['snapshotChunks'],tx=>tx.objectStore('snapshotChunks').clear());
          initial.destroy();initial=null;f.acquisition.close();
          if(damage==='offline-edit'){f.files.get('A.md').stat.mtime++;f.texts.set('A.md','Friends:: [[B]]\\nFriends:: [[Ghost]]');}
          index=new M.GraphIndex({app:f.app,settings:{...semantic,...view,lastActivePath:'A.md',pinnedNodes:[]},getIndexSourceRevision:()=>0},f.app);
          index.scheduleOrphanCleanup=()=>{};release=index.acquireSemanticDemand('A.md');
          ok((await index.restorePersistedSnapshot(['A.md'])).restored,'Source progress restores requested startup');
          if(index.hasPendingSnapshotHydration())await index.waitForSnapshotHydration();
          ok(index.hasSourceBackedStartup(),'Distinct source-backed startup, not full graph authority');
          ok(index.hasPhysicalBaseline(),'Physical operations supported');equal(index.isFullSnapshotHydrated(),false,'No fabricated full graph');
          ok(await index.adoptStartupSources(),'Normal source owner closes startup readiness');
          const counters=index.getSourceAcquisitionCounters();equal(counters.vaultReads,damage==='offline-edit'?1:0,'Only offline body misses read');
          equal(counters.parses,damage==='offline-edit'?1:0,'Only offline body misses parse');
          equal(index.getSemanticPreparationDiagnostics().fullBuilds,0,'No full graph/source rebuild');
          const after=await value(db.transaction('sourceHeads').objectStore('sourceHeads').getAll());
          if(damage!=='offline-edit')equal(after,heads,'Valid neutral heads preserved exactly');
          else equal(after.find(h=>h.sourceId==='B.md'),heads.find(h=>h.sourceId==='B.md'),'Unchanged owner preserved');
          oracle=await fullCenterIndex(M,f,await hostOracle(f,['A.md','B.md'],semantic,presentation,true),semantic,view);
          equal(currentNeighborhoodView(index,'A.md'),currentNeighborhoodView(oracle,'A.md'),'Canonical requested view, provenance and gates');
          index.scheduleSnapshotPersist();equal(index.snapshotPersistTimer,null,'Partial scopes cannot overwrite full graph pointer');
          return true;
        } finally {release?.();oracle?.destroy();initial?.destroy();index?.destroy();f.close()}
      })()`), true);
    } finally { await browser.cleanup(); }
  });
}

test("unavailable storage does not fabricate source-backed readiness", async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(`(async()=>{
      const M=sourceModules,f=await fixture('si5-unavailable');f.app.vault.getName=()=> 'si5-unavailable';
      const view=${centerGateSettings.toString()}({showFolderNodes:false});
      const index=new M.GraphIndex({app:f.app,settings:{hierarchy:{hidden:[],parents:[],children:[],leftFriends:[],rightFriends:[],previous:[],next:[]},tagStyleList:[],inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,maxLabelLength:30,...view,lastActivePath:'A.md',pinnedNodes:[]},getIndexSourceRevision:()=>0},f.app);
      try {
        index.indexedDb.open=async()=>null;
        const restored=await index.restorePersistedSnapshot(['A.md']);equal(restored.restored,false,'No source/graph fabricated');
        equal(index.hasSourceBackedStartup(),false,'No startup authority');equal(index.isFullSnapshotHydrated(),false,'No complete graph');
        ok(index.getIndexDiagnostics().some(row=>row.reason==='storage-unavailable'),'Storage failure explicit');
        return true;
      } finally {index.destroy();f.close()}
    })()`), true);
  } finally { await browser.cleanup(); }
});

test("a damaged requested source schedules one local repair and automatic ready retry", async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(`(async()=>{
      const M=sourceModules,f=await fixture('si5-requested-repair');
      const policy={revision:'si5',settings:{hierarchy:{hidden:[],parents:[],children:[],leftFriends:['Friends'],rightFriends:[],previous:[],next:[]},
        inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30},isCurrent:()=>true};
      const gates={revision:'si5',settings:{excludeFilepaths:[],showVirtualNodes:true,showAttachments:true,showFolderNodes:false,showTagNodes:true,showPageNodes:true,showURLNodes:true,showInferredNodes:true},isCurrent:()=>true};
      const presentation={noteTypeField:'Type',primaryTagField:'Style'},request={kind:'neighborhood',center:ref('A.md')};
      try{
        f.add('A.md','Friends:: [[B]]');f.add('B.md','');await f.acquire();ok(await f.acquisition.reconcile(),'Inventory ready');f.acquisition.enableInventory();
        const db=await f.cache.open(),a=(await f.repository.inspect('A.md')).head,b=(await f.repository.inspect('B.md')).head;
        ok(a.families.values.chunks>0,'Values chunk exists');
        await edit(db,['sourceChunks'],tx=>tx.objectStore('sourceChunks').delete(['A.md',a.families.values.revision,'values',0]));
        f.reads.length=0;f.parses.length=0;f.work.reset();
        const failed=await f.acquisition.prepareRequestedNeighborhood(request,policy,presentation,gates,runtime());
        ok(failed.outcome!=='ready','No prefix from damaged source');equal(failed.sourceId,'A.md','Exact repair owner');
        equal(f.acquisition.hasSemanticDependencies(),false,'Damage closes semantic writes');
        f.acquisition.requestReplayRepair(failed);equal(f.acquisition.pendingKnownFiles.size,1,'Duplicate failure coalesces');
        const at=Date.now();while(Date.now()-at<10000&&!f.acquisition.hasSemanticDependencies())await new Promise(r=>setTimeout(r,20));
        ok(f.acquisition.hasSemanticDependencies(),'Normal scheduler repairs without manual reconcile');
        const ready=await f.acquisition.prepareRequestedNeighborhood(request,policy,presentation,gates,runtime());equal(ready.outcome,'ready','Current facts replay after repair');
        equal((await f.repository.inspect('B.md')).head,b,'Unrelated durable head unchanged');
        equal(f.work.markdownEnumerations,0,'No whole inventory');equal(f.work.headPages,0,'No head paging');
        equal(f.work.writes,['replace:A.md'],'Exactly one source replacement');equal(f.reads,['A.md'],'Only the damaged source needs its body');
        const repaired=(await f.repository.inspect('A.md')).head;
        await edit(db,['sourceChunks'],tx=>tx.objectStore('sourceChunks').delete(['A.md',repaired.families.values.revision,'values',0]));
        await f.acquisition.prepareRequestedNeighborhood(request,policy,presentation,gates,runtime());
        const again=Date.now();while(Date.now()-again<10000&&!f.acquisition.hasSemanticDependencies())await new Promise(r=>setTimeout(r,20));
        ok(f.acquisition.hasSemanticDependencies(),'Independent second damage repairs at the same physical revision');
        equal((await f.acquisition.prepareRequestedNeighborhood(request,policy,presentation,gates,runtime())).outcome,'ready','Second repaired source replays');
        equal(f.work.writes,['replace:A.md','replace:A.md'],'One replacement per separate damage');

        return true;
      }finally{f.close()}
    })()`), true);
  } finally { await browser.cleanup(); }
});
