/** SI5 production restart adoption and selective replay repair through real browser IndexedDB. */
import assert from "node:assert/strict";
import test from "node:test";
import { contributorBrowserBundle, contributorBrowserInitialize } from "./support/contributorBrowserFixture.mjs";
import { chromiumHarness } from "./support/browserTypeScript.mjs";
import { hostOracle, collect } from "./support/cachedSourceFixture.mjs";
import { fullCenterIndex, currentNeighborhoodView, centerGateSettings } from "./support/requestedCenterGateFixture.mjs";

const bundle = await contributorBrowserBundle(["src/index/GraphIndex.ts", "src/index/GraphBuilder.ts", "src/index/IndexSnapshot.ts",
  "src/core/graph/compiler.ts", "src/adapters/obsidian/metadataSourceCollector.ts", "src/adapters/obsidian/ontologySourceCollector.ts"]);

test("navigation and a superseded scope retry preserve complete graph aliases and expanded relationships", async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(`(async()=>{
      const assert=Object.assign((v,m)=>ok(v,m),{equal}),M=sourceModules,f=await fixture('ux-complete-authority');
      const collect=${collect.toString()},hostOracle=${hostOracle.toString()},fullCenterIndex=${fullCenterIndex.toString()},centerGateSettings=${centerGateSettings.toString()};
      let index,release;
      try {
        f.text=f.texts;f.add('Hub.md','Friends:: [[Friend.md]]\\nChild:: [[Child.md]]');
        f.add('Friend.md','',{aliases:['Shared alias']});f.add('Child.md','Child:: [[Grandchild.md]]',{aliases:['Shared alias']});f.add('Grandchild.md','');
        await f.acquire();equal(await f.repository.completeLocalDependencyInventory(),'ready');
        f.acquisition.localDependenciesReady=f.acquisition.localDependencyAuthorityReady=true;
        const semantic={hierarchy:{hidden:[],parents:[],children:['Child'],leftFriends:['Friends'],rightFriends:[],previous:[],next:[]},
          inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
        const presentation={noteTypeField:'Type',primaryTagField:'Style'},view=centerGateSettings({showFolderNodes:false});
        index=await fullCenterIndex(M,f,await hostOracle(f,[...f.files.keys()],semantic,presentation,true),semantic,view);
        index.sourceAcquisition.close();index.sourceAcquisition=f.acquisition;
        ok(await index.rebuild(),'Production complete graph publication');
        index.plugin.settings.lastActivePath='Hub.md';const before=index.getSemanticPreparationDiagnostics(),counters=f.acquisition.getCounters();
        release=index.acquireSemanticDemand('Hub.md');
        await index.ensureSemanticScope('Hub.md'); // A stale task can request this retry after a full publication.
        equal(index.getSemanticPreparationDiagnostics().requested,before.requested,'Complete current graph requires no partial overlay');
        equal(index.semanticScopes.size,0,'No narrower source scope replaces complete nodes');
        equal(index.get('Friend.md').aliases,['Shared alias']);equal(index.get('Child.md').aliases,['Shared alias']);
        ok(index.neighbours(index.get('Child.md'),'child').some(n=>n.page.path==='Grandchild.md'),'Expanded outgoing relationship retained');
        equal(index.search('Shared alias',10).map(n=>n.path).sort(),['Child.md','Friend.md'],'Global alias search retained');
        equal(f.acquisition.getCounters(),counters,'Navigation/retry performs no source work');return true;
      } finally {release?.();index?.destroy();f.close();}
    })()`), true);
  } finally {await browser.cleanup();}
});

for (const { cancel, retry } of [{ cancel: false, retry: false }, { cancel: true, retry: false }, { cancel: false, retry: true }, { cancel: true, retry: true }]) {
  test(`source authority and requested views precede full hydration${cancel ? retry ? " with a pending authority observer cancelled" : " with late cancellation fenced" : retry ? " across a transient resolver retry" : " while preserving global search"}`, async () => {
    const browser = await chromiumHarness(bundle);
    try {
      assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
      assert.equal(await browser.evaluate(`(async()=>{
        const assert=Object.assign((v,m)=>ok(v,m),{equal}),M=sourceModules,cancel=${cancel},retry=${retry},f=await fixture('si5-source-first-'+cancel+'-'+retry);
        const collect=${collect.toString()},hostOracle=${hostOracle.toString()},fullCenterIndex=${fullCenterIndex.toString()};
        const centerGateSettings=${centerGateSettings.toString()};let initial,index,release,unblock;
        const wait=async predicate=>{const at=Date.now();while(Date.now()-at<10000){if(predicate())return;await new Promise(r=>setTimeout(r,20))}throw Error('Source-first phase not reached')};
        try{
          f.text=f.texts;f.add('A.md','Friends:: [[B]]');f.add('B.md','');f.add('C.md','Friends:: [[RemoteGhost]]');
          f.app.vault.getName=()=> 'si5-source-first-'+cancel+'-'+retry;
          f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??(path==='/'||path===''?f.app.vault.getRoot():null);
          await f.acquire();ok(await f.acquisition.reconcile(),'Durable authority seeded');
          const semantic={hierarchy:{hidden:[],parents:[],children:[],leftFriends:['Friends'],rightFriends:[],previous:[],next:[]},
            inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
          const view=centerGateSettings({showFolderNodes:false}),presentation={noteTypeField:'Type',primaryTagField:'Style'};
          initial=await fullCenterIndex(M,f,await hostOracle(f,['A.md','B.md','C.md'],semantic,presentation,true),semantic,view);
          ok(await f.cache.writeSnapshot({createdAt:Date.now(),vaultSignature:M.computeVaultSignature(f.app),
            settingsSignature:M.computeIndexSettingsSignature(initial.plugin.settings),discoveredFields:[]},
            [...initial.state.pages.values()].map(p=>M.persistedPageFromGraphPage(p)),
            [...initial.state.evidence.declarations()].map(e=>M.persistedDeclarationFromEvidence(e))),'Complete acceleration seeded');
          initial.destroy();initial=null;f.acquisition.close();
          const db=await f.cache.open(),heads=await value(db.transaction('sourceHeads').objectStore('sourceHeads').getAll());
          index=new M.GraphIndex({app:f.app,settings:{...semantic,...view,lastActivePath:'A.md',pinnedNodes:[]},getIndexSourceRevision:()=>0},f.app);
          index.scheduleOrphanCleanup=()=>{};release=index.acquireSemanticDemand('A.md');
          let entered=false,pagePasses=0,evidencePasses=0;
          const blocked=new Promise(resolve=>{unblock=resolve}),flush=index.sourceAcquisition.flush;
          index.sourceAcquisition.flush=async function(){
            entered=true;await blocked;
            if(retry&&cancel){f.app.metadataCache.trigger('resolved');this.pauseInventory();return false}
            const task=flush.call(this);
            if(retry)f.app.metadataCache.trigger('resolved');
            const adopted=await task;if(retry)ok(!adopted,'Native resolver wave interrupts the first pass');return adopted;
          };
          const pages=index.indexedDb.iterateSnapshotPages,evidence=index.indexedDb.iterateSnapshotEvidence;
          index.indexedDb.iterateSnapshotPages=async function(...args){
            pagePasses++;ok(index.sourceAcquisition.hasSemanticDependencies(),'Authority before full pages');
            ok(index.semanticScopes.has('A.md'),'Requested publication before full pages');
            ok(index.get('A.md').neighbours.get('B.md')?.isLeftFriend,'Current requested role before acceleration');
            return pages.apply(this,args);
          };
          index.indexedDb.iterateSnapshotEvidence=async function(...args){evidencePasses++;return evidence.apply(this,args)};
          const restored=await index.restorePersistedSnapshot(['A.md']);ok(restored.partial,'Bounded preview remains usable');
          await wait(()=>entered);equal(index.getSnapshotHydrationDiagnostics().phase,'source-authority','Observable priority phase');
          equal(pagePasses,0,'No full page reads during source adoption');equal(evidencePasses,0,'No evidence retention during source adoption');
          ok(!index.search('RemoteGhost',10).length,'Unloaded global vocabulary not claimed early');
          if(cancel){
            if(retry){unblock();await wait(()=>index.startupSourceAuthorityWaiter!==null)}
            const pending=index.waitForSnapshotHydration();index.invalidateSemanticPolicy();equal((await pending).restored,false,'Cancelled startup');
            const state=index.state,diagnostics=index.getSnapshotHydrationDiagnostics();unblock();await new Promise(r=>setTimeout(r,100));
            equal(index.startupSourceAuthorityWaiter,null,'Cancelled authority observer released immediately');
            equal(pagePasses,0,'Late authority cannot launch cancelled hydration');equal(evidencePasses,0,'No late evidence reads');
            ok(index.state===state,'Late authority cannot replace publication');equal(index.getSnapshotHydrationDiagnostics(),diagnostics,'Terminal diagnostics immutable');
          }else{
            unblock();equal((await index.waitForSnapshotHydration()).restored,true,'Complete search acceleration still loads');
            ok(pagePasses>0&&evidencePasses>0,'Full reads follow authority/requested publication');
            ok(index.search('RemoteGhost',10).some(p=>p.path==='RemoteGhost'),'Body-only global vocabulary preserved');
            equal(index.startupSourceAuthorityWaiter,null,'Restore authority observer released');
            equal(index.getSemanticPreparationDiagnostics().fullBuilds,0,'No new full build');
            equal(index.getSourceAcquisitionCounters().vaultReads,0,'No valid body reads');equal(index.getSourceAcquisitionCounters().parses,0,'No parsing');
            equal(await value(db.transaction('sourceHeads').objectStore('sourceHeads').getAll()),heads,'Exact source heads preserved');
          }
          return true;
        }finally{unblock?.();release?.();initial?.destroy();index?.destroy();f.close()}
      })()`), true);
    } finally { await browser.cleanup(); }
  });
}

test("restart resolver waves retain identical heads and automatically update genuinely changed bindings", async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(`(async()=>{
      const M=sourceModules,f=await fixture('si5-restart-resolver-wave');let restarted;
      const wait=async predicate=>{const start=Date.now();while(Date.now()-start<15000){if(predicate())return;await new Promise(r=>setTimeout(r,20))}throw Error('Resolver adoption did not converge')};
      try{
        f.add('A.md','Friends:: [[Alias]]');f.add('B.md','');f.add('C.md','');
        let target=f.files.get('B.md');f.app.metadataCache.getFirstLinkpathDest=literal=>literal==='Alias'?target:f.files.get(literal)??f.files.get(literal+'.md')??null;
        await f.acquire();ok(await f.acquisition.reconcile(),'Initial source authority');
        const db=await f.cache.open(),heads=await value(db.transaction('sourceHeads').objectStore('sourceHeads').getAll());
        f.acquisition.close();f.work.reset();f.reads.length=0;f.parses.length=0;
        restarted=new M.ObsidianSourceAcquisition(f.app,f.cache,async text=>{f.parses.push(text);return M.parseBodyMetadata(text)});
        restarted.start();f.app.metadataCache.trigger('resolved');ok(!restarted.hasSemanticDependencies(),'Uncertain startup event closes readiness');
        restarted.enableInventory();await wait(()=>restarted.hasSemanticDependencies()&&!restarted.inventory);
        equal(await value(db.transaction('sourceHeads').objectStore('sourceHeads').getAll()),heads,'Identical current resolutions retain exact prior heads');
        equal(f.work.writes,[],'No source restamping for resolver close');equal(f.reads,[],'No Markdown reads');equal(f.parses,[],'No parsing');
        equal(restarted.getCounters().resolutionRefreshes,0,'No resolution persistence for equal output');
        const transaction=f.repository.transaction,modes=[];f.repository.transaction=function(db,stores,mode,...args){modes.push({stores,mode});return transaction.call(this,db,stores,mode,...args)};
        let inspected;try{inspected=await f.repository.inspect('A.md',[])}finally{f.repository.transaction=transaction}
        equal(modes,[{stores:['sourceHeads'],mode:'readonly'}],'Head-only inspection never writes cleanup leases');
        const leasesBefore=await value(db.transaction('meta').objectStore('meta').getAll());
        ok(inspected.saved,'Head-only inspection ready');ok(!leasesBefore.some(row=>row.key?.startsWith('source-lease:')),'Reader leases released');
        target=f.files.get('C.md');f.work.reset();f.app.metadataCache.trigger('resolved');
        ok(!restarted.hasSemanticDependencies(),'Later unknown binding change fences authority');await wait(()=>restarted.hasSemanticDependencies()&&!restarted.inventory);
        const after=await value(db.transaction('sourceHeads').objectStore('sourceHeads').getAll());
        ok(after.find(h=>h.sourceId==='A.md').sourceRevision!==heads.find(h=>h.sourceId==='A.md').sourceRevision,'Changed resolver source persisted');
        for(const id of ['B.md','C.md'])equal(after.find(h=>h.sourceId===id),heads.find(h=>h.sourceId===id),'Unrelated head stays exact');
        const facts=[];equal(await f.repository.visit('A.md','resolution',rows=>{facts.push(...rows);return true}), 'ready','Changed resolution readable');
        equal(facts.filter(r=>r.kind==='reference-resolution').map(r=>r.target?.entity.id),['C.md'],'Canonical new target');
        equal(f.work.writes,['replace:A.md'],'Only changed resolution replaced');equal(f.reads,[],'Cached binding change reads no Markdown');equal(f.parses,[],'Cached binding change parses nothing');
        return true;
      }finally{restarted?.close();f.close()}
    })()`), true);
  } finally { await browser.cleanup(); }
});

test("resolution equality is bounded, chunk independent, and fenced against cancellation, replacement and corruption", async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(`(async()=>{
      const M=sourceModules,f=await fixture('si5-resolution-equality');
      try{
        f.add('A.md','Friends:: '+Array.from({length:600},(_,i)=>'[[Ghost'+i+']]').join(' '));await f.acquire();
        const inspection=await f.repository.inspect('A.md'),rows=[];
        equal(await f.repository.visit('A.md','resolution',records=>{rows.push(...records);return true}),'ready','Dense family seeded');
        ok(inspection.head.families.resolution.chunks>1,'Multiple physical chunks');
        const produce=async emit=>{for(const row of rows){if(!await emit(null)||!await emit(row))return false}return true};
        const same=await f.repository.matchesFamily('A.md','resolution',inspection,produce,()=>true);equal(same.outcome,'ready','Current equality authenticated');equal(same.value,true,'Null steps/storage chunk boundaries ignored');
        let current=true;const cancelled=await f.repository.matchesFamily('A.md','resolution',inspection,async emit=>{current=false;return emit(rows[0])},()=>current);
        equal(cancelled.outcome,'cancelled','Cancelled comparison cannot publish');equal(cancelled.reason,'cancelled','Cancellation retained');
        const different=await f.repository.matchesFamily('A.md','resolution',inspection,async emit=>{for(const [i,row] of rows.entries())if(!await emit(i===rows.length-1?{...row,hostOccurrenceCount:1}:row))return false;return true},()=>true);
        equal(different.outcome,'ready','Different valid family measured');equal(different.value,false,'Late change cannot equal a prefix');
        const replaced=await f.repository.matchesFamily('A.md','resolution',inspection,async emit=>{const file=f.files.get('A.md');file.stat.mtime++;ok((await f.acquisition.acquire(file,M.parseBodyMetadata('Other:: [[NewGhost]]'))).saved,'Concurrent replacement');return produce(emit)},()=>true);
        ok(replaced.outcome!=='ready','Replacement cannot authenticate old family');equal(replaced.reason,'superseded','Exact selected-head fence');
        const selected=await f.repository.inspect('A.md'),db=await f.cache.open();
        await edit(db,['sourcePostings'],tx=>tx.objectStore('sourcePostings').delete(['A.md',selected.head.families.resolution.revision,'resolution',0]));
        const damaged=await f.repository.matchesFamily('A.md','resolution',selected,produce,()=>true);
        ok(damaged.outcome!=='ready','Missing posting cannot authenticate equality');equal(damaged.reason,'missing-posting','Corruption cause preserved');
        equal(await value(db.transaction('meta').objectStore('meta').getAll()).then(all=>all.filter(row=>row.key?.startsWith('source-lease:'))),[],'All equality leases released');
        equal(f.repository.decodeBytes,0,'All transient digest reservations released');return true;
      }finally{f.close()}
    })()`), true);
  } finally { await browser.cleanup(); }
});

test("decoded body validation is reused only while the exact selected head is unchanged", async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(`(async()=>{
      const M=sourceModules,f=await fixture('si5-body-selection');
      try{
        const file=f.add('A.md','Friends:: [[Ghost]]');await f.acquire();
        const body=await f.acquisition.readBody(file),before=await f.repository.inspect('A.md');ok(body,'Durable body decoded');
        const inspect=f.repository.inspect,families=[];f.repository.inspect=function(id,selected,...args){families.push(selected);return inspect.call(this,id,selected,...args)};
        try{
          ok((await f.acquisition.acquire(file,body)).saved,'Same head ready');equal(families,[['metadata','resolution']],'No duplicate body-family validation');
          const replaced=await f.repository.replace({sourceId:'A.md',physical:before.head.physical,observation:before.head.observation,
            expected:before.expected,families:before.head.families});equal(replaced.outcome,'activated','Another selected revision');
          families.length=0;ok((await f.acquisition.acquire(file,body)).saved,'New head independently validated');
          equal(families,[['metadata','resolution'],M.SOURCE_FAMILIES],'Sequence change requires full validation');
          return true;
        }finally{f.repository.inspect=inspect}
      }finally{f.close()}
    })()`), true);
  } finally { await browser.cleanup(); }
});

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
          f.text=f.texts;f.add('A.md','Friends:: [[B]]');f.add('B.md','');
          f.add('C.md','Friends:: [[RemoteGhost]]\\nType:: RemoteType\\nDormant:: [[DormantGhost]]\\n[Remote URL](https://example.com/remote)',{aliases:['RemoteAlias']});
          f.metadata.get('C.md').hostTags=['#remote/nested'];f.metadata.get('C.md').tags=[{tag:'#remote/nested'}];f.app.vault.getName=()=>name;
          f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??(path==='/'||path===''?f.app.vault.getRoot():null);
          await f.acquire();ok(await f.acquisition.reconcile(),'Initial facts complete');
          const semantic={hierarchy:{hidden:[],parents:[],children:[],leftFriends:['Friends'],rightFriends:[],previous:[],next:[]},
            inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
          const presentation={noteTypeField:'Type',primaryTagField:'Style'},view=centerGateSettings({showFolderNodes:false});
          initial=await fullCenterIndex(M,f,await hostOracle(f,['A.md','B.md','C.md'],semantic,presentation,true),semantic,view);
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
          ok(index.search('RemoteGhost',10).some(p=>p.path==='RemoteGhost'),'Body-only virtual target outside requested scope restored');
          ok(index.search('Remote URL',10).some(p=>p.path==='https://example.com/remote'),'Body-only URL label outside scope restored');
          ok(index.search('RemoteAlias',10).some(p=>p.path==='C.md'),'Global alias restored');
          ok(!index.search('DormantGhost',10).some(p=>p.path==='DormantGhost'),'Dormant references cannot materialize search nodes');
          const suggestions=index.suggestionCatalog();ok(suggestions.noteTypes.includes('RemoteType'),'Inline note type suggestion outside scope restored');
          ok(suggestions.tags.includes('#remote/nested'),'Host tag suggestion outside scope restored');
          equal(index.state.evidence.declarationCount,0,'Global vocabulary retains no full evidence');
          for(const page of index.state.pages.values())equal(page.neighbours.size,0,'Only requested scopes own relationships');
          const counters=index.getSourceAcquisitionCounters();equal(counters.vaultReads,damage==='offline-edit'?1:0,'Only offline body misses read');
          equal(counters.parses,damage==='offline-edit'?1:0,'Only offline body misses parse');
          equal(index.getSemanticPreparationDiagnostics().fullBuilds,0,'No full graph/source rebuild');
          const after=await value(db.transaction('sourceHeads').objectStore('sourceHeads').getAll());
          if(damage!=='offline-edit')equal(after,heads,'Valid neutral heads preserved exactly');
          else equal(after.find(h=>h.sourceId==='B.md'),heads.find(h=>h.sourceId==='B.md'),'Unchanged owner preserved');
          oracle=await fullCenterIndex(M,f,await hostOracle(f,['A.md','B.md','C.md'],semantic,presentation,true),semantic,view);
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

/** Cache-loss vocabulary must retain a shared URL when only one referring note drops it. */
test("source-backed node vocabulary preserves shared URL lifetime through ordinary edits", async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(`(async()=>{
      const M=sourceModules,f=await fixture('si5-node-shared-lifetime');
      const centerGateSettings=${centerGateSettings.toString()};let index,release;
      try {
        f.app.vault.getName=()=> 'si5-node-shared-lifetime';
        f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??(path==='/'||path===''?f.app.vault.getRoot():null);
        const url='https://example.com/shared';
        f.add('A.md','');f.add('C.md','[First label]('+url+')');f.add('D.md','[Second label]('+url+')');
        await f.acquire();ok(await f.acquisition.reconcile(),'Durable source inventory');f.acquisition.close();
        const settings={...centerGateSettings({showFolderNodes:false}),hierarchy:{hidden:[],parents:[],children:[],leftFriends:[],rightFriends:[],previous:[],next:[]},
          inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30,lastActivePath:'A.md'};
        index=new M.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>0},f.app);
        index.scheduleOrphanCleanup=()=>{};release=index.acquireSemanticDemand('A.md');
        ok((await index.restorePersistedSnapshot(['A.md'])).restored,'Source-backed restore');
        if(index.hasPendingSnapshotHydration())ok((await index.waitForSnapshotHydration()).restored,'Vocabulary hydration completes');
        ok(await index.adoptStartupSources(),'Global vocabulary complete');
        const C=f.files.get('C.md');
        f.texts.set('C.md','[First label]('+url+')\\nType:: Changed');C.stat.mtime++;
        f.app.vault.trigger('modify',C);
        equal((await index.patchMarkdownPaths(['C.md'])).outcome,'patched','First ordinary patch');
        f.texts.set('C.md','Type:: Changed');C.stat.mtime++;
        f.app.vault.trigger('modify',C);
        equal((await index.patchMarkdownPaths(['C.md'])).outcome,'patched','Second ordinary patch');
        ok(index.search('shared',10).some(p=>p.path===url),'Unchanged D still materializes shared URL');
        equal(index.get(url).name,'Second label','URL label moves to the remaining first meaningful owner');
        const D=f.files.get('D.md');f.texts.set('D.md','');D.stat.mtime++;f.app.vault.trigger('modify',D);
        equal((await index.patchMarkdownPaths(['D.md'])).outcome,'patched','First edit on an evidence-free owner');
        ok(!index.search('shared',10).some(p=>p.path===url),'Last owner removal prunes URL on its first edit');
        ok(!index.search('https://example.com',10).some(p=>p.path==='https://example.com'),'Unused URL origin pruned');
        equal(index.sourceAcquisition.nodeImpacts.size,0,'Committed edit backlog released');
        return true;
      }finally{release?.();index?.destroy();f.close()}
    })()`),true);
  }finally{await browser.cleanup()}
});

/** Deleted owners retire source incidence before tombstoning, then close global vocabulary locally. */
test("source-backed vocabulary repairs deleted owners without a graph or vocabulary rebuild", async () => {
  const browser=await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize),true);
    assert.equal(await browser.evaluate(`(async()=>{
      const M=sourceModules,f=await fixture('si5-node-deletion');
      const centerGateSettings=${centerGateSettings.toString()};let index,release;
      const wait=async predicate=>{const at=Date.now();while(Date.now()-at<10000){if(predicate())return;await new Promise(r=>setTimeout(r,20))}throw Error('Node impact repair did not close')};
      try {
        f.app.vault.getName=()=> 'si5-node-deletion';
        f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??(path==='/'||path===''?f.app.vault.getRoot():null);
        f.add('A.md','');f.add('C.md','Friends:: [[Ghost]]\\n[Deleted URL](https://example.com/deleted)');
        await f.acquire();ok(await f.acquisition.reconcile(),'Initial facts');f.acquisition.close();
        const settings={...centerGateSettings({showFolderNodes:false}),hierarchy:{hidden:[],parents:[],children:[],leftFriends:['Friends'],rightFriends:[],previous:[],next:[]},
          inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30,lastActivePath:'A.md'};
        index=new M.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>0},f.app);index.scheduleOrphanCleanup=()=>{};release=index.acquireSemanticDemand('A.md');
        ok((await index.restorePersistedSnapshot(['A.md'])).restored,'Source-backed restore');ok(index.hasPendingSearchVocabulary(),'Physical baseline is not global vocabulary');
        if(index.hasPendingSnapshotHydration())ok((await index.waitForSnapshotHydration()).restored,'Vocabulary hydration completes');
        ok(await index.adoptStartupSources(),'Global vocabulary');ok(!index.hasPendingSearchVocabulary(),'Vocabulary ready');
        equal(index.removeVirtualPageIfUnreferenced('Ghost'),false,'Empty optional evidence is not global absence proof');
        equal(await index.removeVirtualPageIfUnreferencedFromSources('Ghost'),false,'Current source still materializes ghost');
        const C=f.files.get('C.md');f.files.delete('C.md');f.texts.delete('C.md');f.metadata.delete('C.md');
        f.app.vault.trigger('delete',C);index.dematerializeFile('C.md');ok(await index.flushSourceRepository(),'Tombstone and dependencies close');
        await wait(()=>!index.hasPendingSearchVocabulary());
        ok(!index.search('Ghost',10).some(p=>p.path==='Ghost'),'Retired virtual target pruned');
        ok(!index.search('Deleted URL',10).some(p=>p.path==='https://example.com/deleted'),'Retired body URL pruned');
        equal(index.getSourceAcquisitionCounters().vaultReads,0,'No body IO for retirement');equal(index.getSemanticPreparationDiagnostics().fullBuilds,0,'No global graph rebuild');
        return true;
      }finally{release?.();index?.destroy();f.close()}
    })()`),true);
  }finally{await browser.cleanup()}
});

/** Display-only controls remain usable while damaged graph acceleration recovers from sources. */
for (const stage of ["replay", "presentation"]) test(`embedded-center toggle during ${stage} retains source-backed startup`, async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(`(async()=>{
      const assert=Object.assign((v,m)=>ok(v,m),{equal}),M=sourceModules,f=await fixture('startup-display-${stage}');
      const hostOracle=${hostOracle.toString()},collect=${collect.toString()},fullCenterIndex=${fullCenterIndex.toString()};
      const centerGateSettings=${centerGateSettings.toString()};let initial,index,release,unblock;
      try {
        f.text=f.texts;f.app.vault.getName=()=> 'startup-display-${stage}';
        f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??(path==='/'||path===''?f.app.vault.getRoot():null);
        f.add('A.md','Friends:: [[B]]');f.add('B.md','');f.add('C.md','[Remote URL](https://example.com/remote)');
        await f.acquire();ok(await f.acquisition.reconcile(),'Durable source inventory');
        const semantic={hierarchy:{hidden:[],parents:[],children:[],leftFriends:['Friends'],rightFriends:[],previous:[],next:[]},
          inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
        const view=centerGateSettings({showFolderNodes:false}),settings={...semantic,...view,lastActivePath:'A.md',embedCentralNode:false};
        initial=await fullCenterIndex(M,f,await hostOracle(f,['A.md','B.md','C.md'],semantic,{noteTypeField:'Type',primaryTagField:'Style'},true),semantic,view);
        ok(await f.cache.writeSnapshot({createdAt:Date.now(),vaultSignature:M.computeVaultSignature(f.app),
          settingsSignature:M.computeIndexSettingsSignature(initial.plugin.settings),discoveredFields:[]},
          [...initial.state.pages.values()].map(p=>M.persistedPageFromGraphPage(p)),
          [...initial.state.evidence.declarations()].map(e=>M.persistedDeclarationFromEvidence(e))),'Graph acceleration saved');
        const db=await f.cache.open(),heads=await value(db.transaction('sourceHeads').objectStore('sourceHeads').getAll());
        await edit(db,['snapshotChunks'],tx=>tx.objectStore('snapshotChunks').clear());
        initial.destroy();initial=null;f.acquisition.close();
        index=new M.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>0},f.app);
        index.scheduleOrphanCleanup=()=>{};release=index.acquireSemanticDemand('A.md');
        let entered;const started=new Promise(r=>entered=r),blocked=new Promise(r=>unblock=r);
        ${stage === "replay" ? `const replay=index.sourceAcquisition.replayNodeMetadata;
        index.sourceAcquisition.replayNodeMetadata=async function(id,...args){if(id==='C.md'){entered();await blocked}return replay.call(this,id,...args)};` : `const prepare=index.prepareSearchIndex;let blockedOnce=false;
        index.prepareSearchIndex=async function(state,...args){
          if(index.hasSourceBackedStartup()&&state.pages.has('https://example.com/remote')&&!blockedOnce){blockedOnce=true;entered();await blocked}
          return prepare.call(this,state,...args)};`}
        ok((await index.restorePersistedSnapshot(['A.md'])).restored,'Coherent startup preview');
        const hydration=index.waitForSnapshotHydration();await started;
        ok(index.get('A.md').neighbours.get('B.md')?.isLeftFriend,'Requested relationships ready before toggle');
        settings.embedCentralNode=true;await index.refreshPresentationSettings();await index.refreshSemanticSettings();
        unblock();ok((await hydration).restored,'Display-only toggle cannot fail source adoption');
        equal(index.getSnapshotHydrationDiagnostics().phase,'complete','Hydration completes');
        ok(index.hasSourceBackedStartup(),'Retained source-backed authority');ok(!index.hasPendingSearchVocabulary(),'Complete vocabulary');
        ok(index.get('A.md').neighbours.get('B.md')?.isLeftFriend,'Requested relationships retained');
        ok(index.search('Remote URL',10).some(p=>p.path==='https://example.com/remote'),'Global search retained');
        equal(index.withPreparedPresentationSettings(settings).embedCentralNode,true,'Latest display preference');
        equal(index.getSemanticPreparationDiagnostics().fullBuilds,0,'No full rebuild');
        equal(index.getSourceAcquisitionCounters().vaultReads,0,'No body reads');equal(index.getSourceAcquisitionCounters().parses,0,'No reparsing');
        equal(await value(db.transaction('sourceHeads').objectStore('sourceHeads').getAll()),heads,'Durable sources untouched');
        return true;
      }finally{unblock?.();release?.();initial?.destroy();index?.destroy();f.close()}
    })()`), true);
  } finally { await browser.cleanup(); }
});

/** A policy supersession after replay has begun must retain the previously complete vocabulary. */
for (const cancellation of ["policy", "restore"]) test(`late ${cancellation} cancellation cannot publish a partially replayed global vocabulary`, async()=>{
  const browser=await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize),true);
    assert.equal(await browser.evaluate(`(async()=>{
      const M=sourceModules,f=await fixture('si5-node-cancellation');const centerGateSettings=${centerGateSettings.toString()};let index,release,unblock,originalCatalog;
      try {
        f.app.vault.getName=()=> 'si5-node-cancellation';
        f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??(path==='/'||path===''?f.app.vault.getRoot():null);
        f.add('A.md','');f.add('C.md','[URL](https://example.com/late)');await f.acquire();ok(await f.acquisition.reconcile(),'Initial facts');f.acquisition.close();
        const settings={...centerGateSettings({showFolderNodes:false}),hierarchy:{hidden:[],parents:[],children:[],leftFriends:[],rightFriends:[],previous:[],next:[]},
          inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30,lastActivePath:'A.md'};
        index=new M.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>0},f.app);index.scheduleOrphanCleanup=()=>{};release=index.acquireSemanticDemand('A.md');
        let finished;const catalogFinished=new Promise(r=>finished=r);originalCatalog=M.GraphBuilder.prototype.buildSourceNodeCatalog;
        M.GraphBuilder.prototype.buildSourceNodeCatalog=async function(...args){const result=await originalCatalog.apply(this,args);finished(result);return result};
        let entered;const started=new Promise(r=>entered=r),blocked=new Promise(r=>unblock=r),replay=index.sourceAcquisition.replayNodeMetadata;
        index.sourceAcquisition.replayNodeMetadata=async function(id,...args){if(id==='C.md'){entered();await blocked}return replay.call(this,id,...args)};
        ok((await index.restorePersistedSnapshot(['A.md'])).restored,'Source baseline preview');
        const task=index.waitForSnapshotHydration();await started;const state=index.state;
        ${cancellation === 'policy' ? 'index.invalidateSemanticPolicy()' : 'index.cancelSnapshotHydration()'};unblock();equal((await task).restored,false,'Cancelled catalog stays pending');
        equal(await catalogFinished,null,'Cancelled private catalog rejects before binding/publication');
        ok(index.state===state,'No partially compiled global state published');ok(!index.search('late',10).length,'No late URL leak');
        equal(index.sourceAcquisition.repository.readers.size,0,'Selected reader pins released');return true;
      }finally{if(originalCatalog)M.GraphBuilder.prototype.buildSourceNodeCatalog=originalCatalog;unblock?.();release?.();index?.destroy();f.close()}
    })()`),true);
  }finally{await browser.cleanup()}
});
