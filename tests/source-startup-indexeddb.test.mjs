/** Production restart adoption, finite physical presentation facets and selective source repair through real browser IndexedDB. */
import assert from "node:assert/strict";
import test from "node:test";
import { contributorBrowserBundle, contributorBrowserInitialize } from "./support/contributorBrowserFixture.mjs";
import { chromiumHarness } from "./support/browserTypeScript.mjs";
import { hostOracle, collect } from "./support/cachedSourceFixture.mjs";
import { fullCenterIndex, currentNeighborhoodView, centerGateSettings } from "./support/requestedCenterGateFixture.mjs";

const bundle = await contributorBrowserBundle(["src/index/GraphIndex.ts", "src/index/GraphBuilder.ts", "src/index/IndexSnapshot.ts",
  "src/core/graph/compiler.ts", "src/adapters/obsidian/metadataSourceCollector.ts", "src/adapters/obsidian/ontologySourceCollector.ts"]);

/** An exception after complete navigation must retain that owner until existing neutral recovery finishes. */
test("trusted warm evidence exception retains navigable graph for source recovery", async () => {
  const browser=await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize),true);
    assert.equal(await browser.evaluate(`(async()=>{
      const assert=Object.assign((v,m)=>ok(v,m),{equal}),M=sourceModules,f=await fixture('startup-evidence-exception');
      const collect=${collect.toString()},hostOracle=${hostOracle.toString()},fullCenterIndex=${fullCenterIndex.toString()},centerGateSettings=${centerGateSettings.toString()};
      let initial,index,release,resume;
      try {
        f.text=f.texts;f.add('A.md','Friends:: [[B]]');f.add('B.md','');f.add('Remote.md','[Remote exception URL](https://example.com/exception)');
        f.app.vault.getName=()=> 'startup-evidence-exception';
        f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??(path==='/'||path===''?f.app.vault.getRoot():null);
        await f.acquire();ok(await f.acquisition.reconcile(),'Seed genuine neutral source authority');
        const semantic={hierarchy:{hidden:[],parents:[],children:[],leftFriends:['Friends'],rightFriends:[],previous:[],next:[]},inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
        initial=await fullCenterIndex(M,f,await hostOracle(f,[...f.files.keys()],semantic,{noteTypeField:'Type',primaryTagField:'Style'},true),semantic,centerGateSettings({showFolderNodes:false}));
        const settings={...initial.plugin.settings,lastActivePath:'A.md',pinnedNodes:[]};
        ok(await f.cache.writeSnapshot({createdAt:Date.now(),urlAliasVersion:2,vaultSignature:M.computeVaultSignature(f.app),settingsSignature:M.computeIndexSettingsSignature(settings),discoveredFields:[]},
          [...initial.state.pages.values()].map(page=>M.persistedPageFromGraphPage(page)),[...initial.state.evidence.declarations()].map(item=>M.persistedDeclarationFromEvidence(item))),'Seed exact trusted warm acceleration');
        initial.destroy();initial=null;f.acquisition.close();
        index=new M.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>0},f.app);index.scheduleOrphanCleanup=()=>{};
        index.rebuild=()=>{throw Error('Existing warm recovery must not start a full rebuild');};
        let inventoryScans=0,navigable;const scan=index.startPersistedSourceInventory.bind(index);
        index.startPersistedSourceInventory=async(...args)=>{inventoryScans++;return scan(...args);};
        const gate=new Promise(resolve=>{resume=resolve}),flush=index.sourceAcquisition.flush,reconcile=index.sourceAcquisition.reconcile;
        index.sourceAcquisition.flush=async function(...args){await gate;return flush.apply(this,args);};
        index.sourceAcquisition.reconcile=async function(...args){await gate;return reconcile.apply(this,args);};
        index.indexedDb.iterateSnapshotEvidence=async()=>{
          navigable=index.state;
          ok(index.get('A.md').neighbours.get('B.md')?.isLeftFriend,'Complete relation maps publish before provenance exception');
          ok(index.search('Remote exception URL',10).some(page=>page.path==='https://example.com/exception'),'Complete global search available before exception');
          throw Error('Injected optional evidence read exception');
        };
        release=index.acquireSemanticDemand('A.md');ok((await index.restorePersistedSnapshot(['A.md'])).restored,'Bounded preview available');
        equal((await index.waitForSnapshotHydration()).restored,false,'Optional evidence failure remains truthful');
        ok(navigable&&index.state===navigable,'Exception cannot replace complete navigable owner with a physical baseline');
        equal([...index.state.evidence.declarations()].length,0,'Failed provenance never becomes authoritative');
        equal(inventoryScans,0,'Post-navigation exception does not restart source inventory classification');
        ok(index.hasSourceBackedStartup(),'Existing source-backed recovery owner retained');
        equal(index.isSemanticWriteReady('A.md','B.md'),false,'Borrowed navigation cannot authorize a relationship write');
        resume();ok(await index.adoptStartupSources(),'Existing neutral owner converges without whole-graph rebuild');
        ok(!index.hasPendingSemanticPreparation(),'Requested canonical scope closes');
        ok(index.get('A.md').neighbours.get('B.md')?.isLeftFriend,'Canonical current relationship matches coherent cache');
        ok(index.search('Remote exception URL',10).some(page=>page.path==='https://example.com/exception'),'Canonical global vocabulary retained');
        equal(index.getSourceAcquisitionCounters().vaultReads,0,'Existing sources need no body reads');equal(index.getSourceAcquisitionCounters().parses,0,'No parser work');
        equal(index.getSemanticPreparationDiagnostics().fullBuilds,0,'No fallback full build');return true;
      } finally {resume?.();release?.();initial?.destroy();index?.destroy();f.close();}
    })()`),true);
  } finally {await browser.cleanup();}
});

/** Real source/storage work consumes a queued debounce while a genuinely newer event retains its own pass. */
for(const lateEvent of [false,true]){
  test(`explicit source reconciliation consumes its scheduled request${lateEvent?' and preserves an event during the pass':''}`,async()=>{
    const browser=await chromiumHarness(bundle);
    try{
      assert.equal(await browser.evaluate(contributorBrowserInitialize),true);
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await fixture('explicit-inventory-'+${lateEvent}),lateEvent=${lateEvent};
        const schedule=window.setTimeout,cancel=window.clearTimeout,queued=new Map();let timerId=-1,notifications=0,release;
        // Control only the existing 350 ms debounce so scheduling ownership is deterministic.
        // Real repository/browser tasks, yields, transactions, parser and clock remain unchanged.
        window.setTimeout=function(callback,delay,...args){if(delay===350){const id=timerId--;queued.set(id,()=>callback(...args));return id;}return schedule.call(this,callback,delay,...args);};
        window.clearTimeout=function(id){if(!queued.delete(id))return cancel.call(this,id);};
        try{
          const file=f.add('A.md','Field:: Original');await f.acquire();
          const before=(await f.repository.inspect(file.path)).head;f.acquisition.inventoryReady=()=>{notifications++;};
          f.acquisition.enableInventory();const scheduled=f.acquisition.timer;ok(queued.has(scheduled),'Actual existing request timer scheduled');
          let entered;const reached=new Promise(resolve=>{entered=resolve}),blocked=new Promise(resolve=>{release=resolve}),headPage=f.repository.headPage;
          if(lateEvent)f.repository.headPage=async function(...args){entered();await blocked;return headPage.apply(this,args);};
          const first=f.acquisition.reconcile();equal(queued.size,0,'Explicit pass consumes the already-scheduled request');equal(f.acquisition.timer,null,'No orphan debounce handle');
          if(lateEvent){
            await reached;ok(f.acquisition.inventory,'A real captured pass is active');
            const joined=f.acquisition.reconcile();file.stat.mtime++;f.texts.set(file.path,'Field:: Changed');
            f.app.vault.trigger('modify',file);ok(f.acquisition.requested,'New event retains follow-up ownership');
            release();equal(await first,false,'New source event supersedes the earlier captured pass');equal(await joined,false,'Active joins retain the same superseded outcome');
            // The actual event fan-out has its own completion request. Let that existing owner
            // finish before firing its shared debounce, matching an ordinary quiet event burst.
            await f.acquisition.knownFanoutTasks.get(file);
            equal(notifications,0,'A stale pass cannot emit readiness');equal(queued.size,1,'Exactly one new event pass scheduled');
            const next=f.acquisition.timer;ok(next!==scheduled&&queued.has(next),'New request is independently owned');
            f.repository.headPage=headPage;const callback=queued.get(next);queued.delete(next);callback();
            ok(await f.acquisition.flush(),'The existing follow-up repairs and closes real source authority');
            const current=await f.repository.inspect(file.path);equal(current.head.physical.mtime,file.stat.mtime,'Actual changed physical revision acquired');
            ok(current.head.sourceRevision!==before.sourceRevision,'New event produces a genuine canonical head');
            const values=[];equal(await f.repository.visit(file.path,'values',rows=>{values.push(...rows);return true;}),'ready','Current canonical family authenticated');
            ok(JSON.stringify(values).includes('Changed'),'Latest event values are durable');equal(f.reads,[file.path],'Only the actual changed body is read');equal(f.parses.length,1,'Only the actual changed body is parsed');
          }else{
            ok(await first,'Explicit source authority closes');equal(f.acquisition.requested,false,'Captured request consumed');
            equal((await f.repository.inspect(file.path)).head,before,'Unchanged source head remains exact');equal(f.reads,[],'Warm explicit pass reuses canonical body');equal(f.parses,[],'Warm explicit pass does not reparse');
          }
          equal(notifications,1,'One current completion emits one readiness signal');ok(!queued.has(scheduled),'The original request cannot fire again');
          if(!lateEvent){equal(f.acquisition.timer,null,'No unchanged second inventory pass scheduled');equal(queued.size,0,'No empty second pass can fire');}
          else{
            // A genuine canonical replacement can itself request a later durable completion pass;
            // retain that existing finally ownership rather than suppressing newly acquired work.
            const owners=[f.acquisition.timer,f.acquisition.deferredResolutionRetryTimer].filter(id=>id!==null);
            equal([...queued.keys()].sort(),owners.sort(),'Only current source/deferred-resolution owners retain clocks');
          }
          equal(f.acquisition.pendingResolutionKeys.size,0,'Actual event fan-out has closed');ok(f.acquisition.hasSemanticDependencies(),'Primary dependency authority is current');return true;
        }finally{try{release?.();f.close();equal(queued.size,0,'Unload releases owned debounces');}finally{window.setTimeout=schedule;window.clearTimeout=cancel;}}
      })()`),true);
    }finally{await browser.cleanup();}
  });
}

/** A genuine full-cache restart overlays only finite current note aliases, including sparse endpoints. */
for (const replace of [false, true]) {
  test(`sparse requested candidates retain current aliases in all three roles${replace ? ' replacing and removing stale cached aliases' : ''}`, async () => {
    const browser=await chromiumHarness(bundle);
    try {
      assert.equal(await browser.evaluate(contributorBrowserInitialize),true);
      assert.equal(await browser.evaluate(`(async()=>{
        const assert=Object.assign((v,m)=>ok(v,m),{equal}),M=sourceModules,f=await fixture('sparse-aliases-'+${replace});
        const collect=${collect.toString()},hostOracle=${hostOracle.toString()},fullCenterIndex=${fullCenterIndex.toString()},centerGateSettings=${centerGateSettings.toString()};
        let initial,index,release;
        try{
          f.text=f.texts;f.add('Hub.md',['Parents:: [[Parent]]','Friends:: [[Friend]]','Children:: [[Child]]'].join(String.fromCharCode(10)));
          const expected=${replace} ? {Parent:['Hidden overflow alias'],Friend:['Replacement alias'],Child:[]} : {Parent:['Hidden overflow alias'],Friend:['Hidden overflow alias'],Child:['Hidden overflow alias']};
          for(const name of ['Parent','Friend','Child'])f.add(name+'.md',name==='Friend'?'Children:: [[Orphan.png]]':'',{aliases:expected[name]});
          f.add('Orphan.png','');f.app.vault.getName=()=> 'sparse-aliases-'+${replace};
          f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??(path==='/'||path===''?f.app.vault.getRoot():null);
          await f.acquire();ok(await f.acquisition.reconcile(),'Current canonical sources seeded');
          const semantic={hierarchy:{hidden:[],parents:['Parents'],children:['Children'],leftFriends:['Friends'],rightFriends:[],previous:[],next:[]},inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
          initial=await fullCenterIndex(M,f,await hostOracle(f,[...f.files.keys()],semantic,{noteTypeField:'Type',primaryTagField:'Style'},true),semantic,centerGateSettings({showFolderNodes:false}));
          const settings={...initial.plugin.settings,lastActivePath:'Hub.md',pinnedNodes:[]},pages=[...initial.state.pages.values()].map(p=>M.persistedPageFromGraphPage(p)),evidence=[...initial.state.evidence.declarations()].map(e=>M.persistedDeclarationFromEvidence(e));
          if(${replace})for(const page of pages)if(page.path==='Friend.md'||page.path==='Child.md')page.aliases=['Retired alias'];
          ok(await f.cache.writeSnapshot({createdAt:Date.now(),urlAliasVersion:2,vaultSignature:M.computeVaultSignature(f.app),settingsSignature:M.computeIndexSettingsSignature(settings),discoveredFields:[]},pages,evidence),'Complete cache seeded');
          const db=await f.cache.open(),heads=await value(db.transaction('sourceHeads').objectStore('sourceHeads').getAll());
          initial.destroy();initial=null;f.acquisition.close();
          index=new M.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>0},f.app);index.scheduleOrphanCleanup=()=>{};
          const bind=index.preparedPageFromNode;let sparseFriend=false,sparseChild=false;
          index.preparedPageFromNode=function(node){if(node.semanticPath==='Friend.md'&&!node.aliases.length)sparseFriend=true;if(node.semanticPath==='Child.md'&&!node.aliases.length)sparseChild=true;return bind.call(this,node);};
          release=index.acquireSemanticDemand('Hub.md');await index.restorePersistedSnapshot(['Hub.md']);ok((await index.waitForSnapshotHydration()).restored,'Actual full cache hydrated');
          ok(await index.flushSourceRepository(),'Background neutral authority closes independently of warm graph hydration');
          await index.refreshSemanticSettings();
          ok(index.semanticScopes.has('Hub.md'),'Current requested scope over coherent cache');ok(sparseFriend&&sparseChild,'Canonical compiler endpoints are genuinely sparse');
          const scope=index.semanticScopes.get('Hub.md');
          for(const name of ['Parent','Friend','Child']){
            equal(scope.pagesByPath.get(name+'.md').aliases,expected[name],name+' current private facets');
            equal(index.get(name+'.md').aliases,expected[name],name+' current published view');
          }
          equal(index.titleFor(index.get('Friend.md')),expected.Friend[0],'Sparse current alias drives presentation');
          equal(index.neighbours(index.get('Friend.md'),'child').map(item=>item.page.path),['Orphan.png'],
            'Complete warm incidence survives sparse metadata publication without replacing current aliases');
          const neighborhood=index.getNeighborhood('Hub.md');
          equal(neighborhood.parents.map(n=>n.page.path),['Parent.md'],'Parent role preserved');equal(neighborhood.leftFriends.map(n=>n.page.path),['Friend.md'],'Friend role preserved');equal(neighborhood.children.map(n=>n.page.path),['Child.md'],'Child role preserved');
          if(${replace}){
            equal(index.state.pages.get('Friend.md').aliases,['Retired alias'],'The cached base is unchanged');
            ok(!index.search('Retired alias',10).some(p=>p.path==='Friend.md'||p.path==='Child.md'),'Old aliases do not leak through current overlay');
            equal(index.titleFor(index.get('Child.md')),'Child','Removed alias falls back to filename');
          }
          equal([...index.state.evidence.declarations()].map(e=>M.persistedDeclarationFromEvidence(e)),evidence,'Every cached declaration and its provenance remain unchanged');
          equal(await value(db.transaction('sourceHeads').objectStore('sourceHeads').getAll()),heads,'No source head writes for finite facets');
          const counters=index.sourceAcquisition.getCounters();equal(counters.vaultReads,0,'No source body reads');equal(counters.parses,0,'No source body parsing');equal(index.getSemanticPreparationDiagnostics().fullBuilds,0,'No whole-graph replay');
          return true;
        }finally{release?.();index?.destroy();initial?.destroy();f.close();}
      })()`),true);
    }finally{await browser.cleanup();}
  });
}

/** Dense borrowed alias values remain cooperative and cannot publish past cache/file or byte fences. */
test('finite alias preparation rejects supersession, cyclic values and the existing retained-byte ceiling',async()=>{
  const browser=await chromiumHarness(bundle);
  try{
    assert.equal(await browser.evaluate(contributorBrowserInitialize),true);
    assert.equal(await browser.evaluate(`(async()=>{
      const assert=Object.assign((v,m)=>ok(v,m),{equal}),M=sourceModules,f=await fixture('finite-alias-fences');
      const collect=${collect.toString()},hostOracle=${hostOracle.toString()},fullCenterIndex=${fullCenterIndex.toString()},centerGateSettings=${centerGateSettings.toString()};let index;
      try{
        f.text=f.texts;f.add('A.md','',{aliases:['Published']});f.add('Image.png','');await f.acquire();ok(await f.acquisition.reconcile(),'Sources seeded');
        const semantic={hierarchy:{hidden:[],parents:[],children:[],leftFriends:[],rightFriends:[],previous:[],next:[]},inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
        index=await fullCenterIndex(M,f,await hostOracle(f,[...f.files.keys()],semantic,{noteTypeField:'Type',primaryTagField:'Style'},true),semantic,centerGateSettings({showFolderNodes:false}));
        const db=await f.cache.open(),heads=await value(db.transaction('sourceHeads').objectStore('sourceHeads').getAll()),published=index.state;
        const node={kind:'document',physicalPath:'A.md'},file=f.files.get('A.md');
        for(const mode of ['cache','file','cancel']){
          const cache={frontmatter:{aliases:[...Array.from({length:1024},()=>null),' Fresh ']},links:[]};f.metadata.set(file.path,cache);
          const tokens=index.captureSelectedMetadata([node]);let ticks=0,yields=0,current=true;
          const runtime={now:()=>ticks+=9,sliceBudgetMs:8,isCurrent:()=>current,yield:async()=>{yields++;if(yields===1){if(mode==='cache')f.metadata.set(file.path,{...cache});else if(mode==='file')file.stat.mtime++;else current=false;}}};
          equal((await index.prepareSelectedPhysicalAliases(tokens,runtime,0)).reason,'superseded',mode+' fence after actual alias traversal yield');ok(yields>0,'Ignored values expose cooperative work');
          ok(index.state===published,'Superseded private aliases do not mutate publication');equal(index.get('A.md').aliases,['Published'],'Current page facets survive supersession');
        }
        let nested=' Deep ';for(let i=0;i<4096;i++)nested=[nested];f.metadata.set(file.path,{frontmatter:{aliases:[nested,nested]},links:[]});
        let ticks=0,yields=0;const runtime={now:()=>ticks+=9,sliceBudgetMs:8,isCurrent:()=>true,yield:async()=>{yields++;}};
        const ready=await index.prepareSelectedPhysicalAliases(index.captureSelectedMetadata([node]),runtime,0);
        equal(ready.reason,'ready','Deep iterative normalization succeeds');equal(ready.byPath.get('A.md'),['Deep','Deep'],'Repeated siblings preserve duplicates');ok(yields>100,'Descent and unwind both cooperate');
        const limit=M.MAX_CACHED_SCOPE_RETAINED_BYTES;ok(limit>0,'Use the real production ceiling');
        f.metadata.set(file.path,{frontmatter:{aliases:[' Edge ']},links:[]});
        const tokens=index.captureSelectedMetadata([node]),beforeTrim=String.prototype.trim;let trims=0;
        String.prototype.trim=function(){trims++;return beforeTrim.call(this);};
        try{equal((await index.prepareSelectedPhysicalAliases(tokens,runtime,limit-64)).reason,'decode-budget','Near-ceiling overhead rejected');equal(trims,0,'Rejection precedes normalized allocation');
          f.metadata.set(file.path,{frontmatter:{aliases:[' '.repeat(limit/2+1)]},links:[]});
          equal((await index.prepareSelectedPhysicalAliases(index.captureSelectedMetadata([node]),runtime,0)).reason,'decode-budget','Oversized raw alias rejected at unchanged ceiling');equal(trims,0,'Oversized string never reaches trim');
        }finally{String.prototype.trim=beforeTrim;}
        const cyclic=[];cyclic.push(cyclic);f.metadata.set(file.path,{frontmatter:{aliases:cyclic},links:[]});let rejected=false;
        try{await index.prepareSelectedPhysicalAliases(index.captureSelectedMetadata([node]),runtime,0);}catch(error){rejected=/Cyclic frontmatter aliases/.test(error.message);}ok(rejected,'Cyclic array rejects instead of retaining unbounded traversal');
        equal(index.captureSelectedMetadata([{kind:'attachment',physicalPath:'Image.png'},{kind:'url',semanticPath:'https://help.obsidian.md'},{kind:'tag',semanticPath:'tag:x'},{kind:'folder',semanticPath:'folder:/'}]).size,0,'Synthetic and attachment facets are not selected');
        equal(await value(db.transaction('sourceHeads').objectStore('sourceHeads').getAll()),heads,'Facet staging never writes source heads');equal(index.state,published,'Private facet work preserves state');return true;
      }finally{index?.destroy();f.close();}
    })()`),true);
  }finally{await browser.cleanup();}
});

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
  test(`untrusted active generation source authority and requested views precede full hydration${cancel ? retry ? " with a pending authority observer cancelled" : " with late cancellation fenced" : retry ? " across a transient resolver retry" : " while preserving global search"}`, async () => {
    const browser = await chromiumHarness(bundle);
    try {
      assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
      assert.equal(await browser.evaluate(`(async()=>{
        const assert=Object.assign((v,m)=>ok(v,m),{equal}),M=sourceModules,cancel=${cancel},retry=${retry},f=await fixture('si5-source-first-'+cancel+'-'+retry);
        const collect=${collect.toString()},hostOracle=${hostOracle.toString()},fullCenterIndex=${fullCenterIndex.toString()};
        const centerGateSettings=${centerGateSettings.toString()};let initial,index,release,unblock;
        const wait=async predicate=>{const at=Date.now();while(Date.now()-at<10000){if(predicate())return;await new Promise(r=>setTimeout(r,20))}throw Error('Source-first phase not reached')};
        try{
          f.text=f.texts;f.add('A.md','Friends:: [[B]]');f.add('B.md','');f.add('C.md','Friends:: [[RemoteGhost]]');f.add('Orphan.png','');
          f.app.vault.getName=()=> 'si5-source-first-'+cancel+'-'+retry;
          f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??(path==='/'||path===''?f.app.vault.getRoot():null);
          await f.acquire();ok(await f.acquisition.reconcile(),'Durable authority seeded');
          const semantic={hierarchy:{hidden:[],parents:[],children:[],leftFriends:['Friends'],rightFriends:[],previous:[],next:[]},
            inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
          const view=centerGateSettings({showFolderNodes:false}),presentation={noteTypeField:'Type',primaryTagField:'Style'};
          initial=await fullCenterIndex(M,f,await hostOracle(f,['A.md','B.md','C.md'],semantic,presentation,true),semantic,view);
          // A stale acceleration certificate must retain source-first certification. The separate
          // trusted-warm regressions prove that an exact current schema-3 generation navigates first.
          ok(await f.cache.writeSnapshot({createdAt:Date.now(),vaultSignature:'stale:'+M.computeVaultSignature(f.app),
            settingsSignature:M.computeIndexSettingsSignature(initial.plugin.settings),discoveredFields:[]},
            [...initial.state.pages.values()].map(p=>M.persistedPageFromGraphPage(p)),
            [...initial.state.evidence.declarations()].map(e=>M.persistedDeclarationFromEvidence(e))),'Complete acceleration seeded');
          initial.destroy();initial=null;f.acquisition.close();
          const db=await f.cache.open(),heads=await value(db.transaction('sourceHeads').objectStore('sourceHeads').getAll());
          index=new M.GraphIndex({app:f.app,settings:{indexingMode:'eager',...semantic,...view,lastActivePath:'A.md',pinnedNodes:[]},getIndexSourceRevision:()=>0},f.app);
          index.scheduleOrphanCleanup=()=>{};release=index.acquireSemanticDemand('A.md');
          let entered=false,pagePasses=0,evidencePasses=0;
          const blocked=new Promise(resolve=>{unblock=resolve}),flush=index.sourceAcquisition.flush;
          index.sourceAcquisition.flush=async function(){
            entered=true;await blocked;
            if(retry&&cancel){f.app.metadataCache.trigger('resolved');this.pauseInventory();return false}
            const reconcile=this.reconcile,passes=[];
            this.reconcile=async function(...args){const result=await reconcile.apply(this,args);passes.push(result);return result;};
            try{
              const task=flush.call(this);
              if(retry)f.app.metadataCache.trigger('resolved');
              const adopted=await task;
              if(retry){
                equal(passes,[false,true],'Native resolver wave cancels its pass; flush joins only the queued current replacement');
                ok(adopted&&this.hasSemanticDependencies(),'Actual replacement closure grants source authority');
              }
              return adopted;
            }finally{this.reconcile=reconcile;}
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
          index.search('Orph',10,'visible');
          equal(index.search('Orphan.png',10,'vault-files').map(p=>p.path),['Orphan.png'],'Orphan attachment searchable before full vocabulary hydration');
          equal(index.search('Orphan.png',10,'visible'),[],'Vault prefix matches cannot leak filename-only facets into graph search');
          equal(index.search('Orphan.png',10,'vault-files').map(p=>p.path),['Orphan.png'],'Alternating search scopes preserve independent prefix coverage');
          ok(index.getVaultSearchPage('Orphan.png')?.file===f.files.get('Orphan.png'),'Filename-only hit binds the exact current file');
          ok(!index.state.pages.has('Orphan.png'),'Physical search does not publish a canonical graph page');
          ok(!index.semanticScopes.get('Orphan.png')?.completePaths.has('Orphan.png'),'Physical filename does not certify a semantic scope');
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
            await index.refreshSemanticSettings();
            ok(!index.hasPendingSemanticPreparation(),'Healthy compatible warm restart closes requested semantics');
            equal(index.fullSemanticPolicyRevision,0,'Borrowed graph cache is not promoted as source semantic authority');
            ok(index.semanticScopes.get('A.md')?.maintenanceRevision===index.sourceAcquisition.getMaintenanceRevision(),'Exact current source authority retained after cache hydration');
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
        index=new M.GraphIndex({app:f.app,settings:{indexingMode:'eager',...changed,...view,lastActivePath:'A.md',pinnedNodes:[]},getIndexSourceRevision:()=>0},f.app);
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
          index=new M.GraphIndex({app:f.app,settings:{indexingMode:'eager',...semantic,...view,lastActivePath:'A.md',pinnedNodes:[]},getIndexSourceRevision:()=>0},f.app);
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
      const index=new M.GraphIndex({app:f.app,settings:{indexingMode:'eager',hierarchy:{hidden:[],parents:[],children:[],leftFriends:[],rightFriends:[],previous:[],next:[]},tagStyleList:[],inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,maxLabelLength:30,...view,lastActivePath:'A.md',pinnedNodes:[]},getIndexSourceRevision:()=>0},f.app);
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
      const policy={revision:'si5',settings:{indexingMode:'eager',hierarchy:{hidden:[],parents:[],children:[],leftFriends:['Friends'],rightFriends:[],previous:[],next:[]},
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
        const settings={indexingMode:'eager',...centerGateSettings({showFolderNodes:false}),hierarchy:{hidden:[],parents:[],children:[],leftFriends:[],rightFriends:[],previous:[],next:[]},
          inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30,lastActivePath:'A.md'};
        index=new M.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>0},f.app);
        index.scheduleOrphanCleanup=()=>{};release=index.acquireSemanticDemand('A.md');
        ok((await index.restorePersistedSnapshot(['A.md'])).restored,'Source-backed restore');
        if(index.hasPendingSnapshotHydration())ok((await index.waitForSnapshotHydration()).restored,'Vocabulary hydration completes');
        ok(await index.adoptStartupSources(),'Global vocabulary complete');
        const patch=async paths=>{
          const result=await index.withForegroundPriority(()=>index.patchMarkdownPaths(paths),2);
          if(result.outcome!=='cancelled')return result;
          equal(result.count,0,'Pending global negative proof cannot partially commit a file');
          equal(result.pendingPaths,paths,'Exact uncommitted source retains its normal coordinator retry');
          ok(index.get(url),'Pending synthetic lifetime proof retains the coherent shared URL');
          ok(index.search('shared',10).some(page=>page.path===url),'Pending synthetic removal retains coherent global search');
          // The coordinator keeps cancelled paths. Let the actual source owner close its indexes
          // outside foreground priority, then perform the same finite retry without a full rebuild.
          ok(await index.flushSourceRepository(),'Actual source maintenance closes pending synthetic negative proof');
          return index.withForegroundPriority(()=>index.patchMarkdownPaths(paths),2);
        };
        const C=f.files.get('C.md');
        f.texts.set('C.md','[First label]('+url+')\\nType:: Changed');C.stat.mtime++;
        f.app.vault.trigger('modify',C);
        equal((await patch(['C.md'])).outcome,'patched','First ordinary patch');
        f.texts.set('C.md','Type:: Changed');C.stat.mtime++;
        f.app.vault.trigger('modify',C);
        equal((await patch(['C.md'])).outcome,'patched','Second ordinary patch');
        ok(index.search('shared',10).some(p=>p.path===url),'Unchanged D still materializes shared URL');
        equal(index.get(url).name,'Second label','URL label moves to the remaining first meaningful owner');
        const D=f.files.get('D.md');f.texts.set('D.md','');D.stat.mtime++;f.app.vault.trigger('modify',D);
        equal((await patch(['D.md'])).outcome,'patched','First edit on an evidence-free owner');
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
        const settings={indexingMode:'eager',...centerGateSettings({showFolderNodes:false}),hierarchy:{hidden:[],parents:[],children:[],leftFriends:['Friends'],rightFriends:[],previous:[],next:[]},
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
        const view=centerGateSettings({showFolderNodes:false}),settings={indexingMode:'eager',...semantic,...view,lastActivePath:'A.md',embedCentralNode:false};
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
        const settings={indexingMode:'eager',...centerGateSettings({showFolderNodes:false}),hierarchy:{hidden:[],parents:[],children:[],leftFriends:[],rightFriends:[],previous:[],next:[]},
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

/** A bounded requested-center failure remains incomplete after optional graph hydration, then another center can recover. */
test("warm decode-budget failure settles truthfully and navigation prepares another current center", async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(`(async()=>{
      const assert=Object.assign((v,m)=>ok(v,m),{equal}),M=sourceModules,f=await fixture('ux-budget-outcome');
      const collect=${collect.toString()},hostOracle=${hostOracle.toString()},fullCenterIndex=${fullCenterIndex.toString()},centerGateSettings=${centerGateSettings.toString()};
      let initial,index,releaseA,releaseB;
      try {
        f.text=f.texts;f.add('A.md','Friends:: [[B]]');f.add('B.md','');f.app.vault.getName=()=> 'ux-budget-outcome';
        f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??(path==='/'||path===''?f.app.vault.getRoot():null);
        await f.acquire();ok(await f.acquisition.reconcile(),'Durable authority seeded');
        const semantic={hierarchy:{hidden:[],parents:[],children:[],leftFriends:['Friends'],rightFriends:[],previous:[],next:[]},inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
        initial=await fullCenterIndex(M,f,await hostOracle(f,['A.md','B.md'],semantic,{noteTypeField:'Type',primaryTagField:'Style'},true),semantic,centerGateSettings({showFolderNodes:false}));
        const settings={...initial.plugin.settings,lastActivePath:'A.md',pinnedNodes:[]};
        ok(await f.cache.writeSnapshot({createdAt:Date.now(),vaultSignature:M.computeVaultSignature(f.app),settingsSignature:M.computeIndexSettingsSignature(settings),discoveredFields:[]},
          [...initial.state.pages.values()].map(p=>M.persistedPageFromGraphPage(p)),[...initial.state.evidence.declarations()].map(e=>M.persistedDeclarationFromEvidence(e))),'Acceleration seeded');
        initial.destroy();initial=null;f.acquisition.close();
        index=new M.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>0},f.app);index.scheduleOrphanCleanup=()=>{};
        const prepare=index.sourceAcquisition.prepareRequestedNeighborhood;
        index.sourceAcquisition.prepareRequestedNeighborhood=async function(request,...args){
          if(request.center.id==='A.md')return {outcome:'pending',reason:'decode-budget'};
          return prepare.call(this,request,...args);
        };
        releaseA=index.acquireSemanticDemand('A.md');await index.restorePersistedSnapshot(['A.md']);
        ok((await index.waitForSnapshotHydration()).restored,'Optional graph cache still usable');
        ok(await index.flushSourceRepository(),'Current source authority closes independently of optional graph cache');await index.refreshSemanticSettings();
        ok(index.hasPendingSemanticPreparation(),'Failed request never claims complete authority');
        equal(index.hasActiveSemanticPreparation(),false,'No nonexistent work continues spinning');
        equal(index.getSemanticPreparationFailure(),'decode-budget','Exact current failure retained');
        equal(index.fullSemanticPolicyRevision,0,'Cached graph is not authority after a source failure');
        const requests=index.getSemanticPreparationDiagnostics().requested;await new Promise(r=>setTimeout(r,100));
        equal(index.getSemanticPreparationDiagnostics().requested,requests,'Unchanged budget outcome does not auto-retry');
        releaseA();releaseA=null;index.plugin.settings.lastActivePath='B.md';releaseB=index.acquireSemanticDemand('B.md');await index.refreshSemanticSettings();
        equal(index.getSemanticPreparationFailure(),null,'Another center cannot inherit the failed center reason');
        ok(!index.hasPendingSemanticPreparation(),'Navigation to a bounded center recovers requested readiness');
        ok(index.semanticScopes.has('B.md'),'Recovered scope published with real source compiler');
        equal(index.getSemanticPreparationDiagnostics().fullBuilds,0,'No full fallback build or widened limits');
        equal(index.getSourceAcquisitionCounters().vaultReads,0,'No body rereads');return true;
      } finally {releaseA?.();releaseB?.();initial?.destroy();index?.destroy();f.close();}
    })()`), true);
  } finally {await browser.cleanup();}
});

for (const { failure, oldParser, interruption, storageFailure } of [{ failure: false, oldParser: false }, { failure: true, oldParser: false }, { failure: false, oldParser: true }, { failure: false, oldParser: true, interruption: "primary" }, ...["edit", "delete", "rename", "unload"].map(mutation => ({failure:false,oldParser:true,interruption:"primary-"+mutation})), ...["stage", "activation", "open", "reclaim"].map(storageFailure=>({failure:false,oldParser:true,interruption:"primary-storage",storageFailure})), ...["layout", "title", "title-facade"].map(interruption => ({ failure: false, oldParser: false, interruption }))]) {
  /** A disposable facet marker upgrades URL aliases while retaining the same graph and durable sources. */
  test(`legacy warm URL aliases replay outside the active center${interruption ? ` with deferred ${interruption} change${storageFailure?` (${storageFailure})`:""}` : ""}${oldParser ? " with old parser repair" : ""}${failure ? " retains cached graph on failure" : " and skip replay on the next warm restore"}`, async () => {
    const browser = await chromiumHarness(bundle);
    try {
      assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
      assert.equal(await browser.evaluate(`(async()=>{
        const assert=Object.assign((v,m)=>ok(v,m),{equal}),M=sourceModules,failure=${failure},oldParser=${oldParser},interruption=${JSON.stringify(interruption ?? null)},storageFailure=${JSON.stringify(storageFailure ?? null)},f=await fixture('ux-url-alias-upgrade-'+failure);
        const collect=${collect.toString()},hostOracle=${hostOracle.toString()},fullCenterIndex=${fullCenterIndex.toString()},centerGateSettings=${centerGateSettings.toString()};
        let initial,index,restarted,release,releaseRestart,unblock,restoreStorageFault;const original=M.GraphBuilder.prototype.buildSourceNodeCatalog;
        try {
          f.text=f.texts;f.add('A.md','Friends:: [[B]]'+(interruption==='primary'?'\\n[Current owner alias](https://help.obsidian.md)':''),{Title:'Current A title'});f.add('B.md','');f.add('Remote.md','[Documentation](https://help.obsidian.md) [Same owner second](https://help.obsidian.md)\\n[Same owner third](https://help.obsidian.md)');f.add('SecondRemote.md','[Obsidian help alias](https://help.obsidian.md)');
          f.app.vault.getName=()=> 'ux-url-alias-upgrade-'+failure;
          f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??(path==='/'||path===''?f.app.vault.getRoot():null);
          await f.acquire();ok(await f.acquisition.reconcile(),'Durable neutral source authority seeded');
          const semantic={hierarchy:{hidden:[],parents:[],children:[],leftFriends:['Friends'],rightFriends:[],previous:[],next:[]},inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
          initial=await fullCenterIndex(M,f,await hostOracle(f,['A.md','B.md','Remote.md','SecondRemote.md'],semantic,{noteTypeField:'Type',primaryTagField:'Style'},true),semantic,centerGateSettings({showFolderNodes:false}));
          const settings={...initial.plugin.settings,lastActivePath:'A.md',pinnedNodes:[]};
          const saved=[...initial.state.pages.values()].map(p=>M.persistedPageFromGraphPage(p));
          const oldUrl=saved.find(p=>p.url==='https://help.obsidian.md');ok(oldUrl,'URL cached outside active center');oldUrl.aliases=[];
          const evidence=[...initial.state.evidence.declarations()].map(e=>M.persistedDeclarationFromEvidence(e));
          ok(await f.cache.writeSnapshot({createdAt:Date.now(),urlAliasVersion:1,vaultSignature:M.computeVaultSignature(f.app),settingsSignature:M.computeIndexSettingsSignature(settings),discoveredFields:[]},saved,evidence),'Legacy facet version seeded');
          if(oldParser){
            for(const file of f.files.values()){
              const selected=await f.repository.inspect(file.path);
              const oldRecords=[];await f.repository.visit(file.path,'body-urls',records=>{for(const {aliases,...primary} of records)oldRecords.push(primary);return true;});
              ok((await f.repository.replace({sourceId:file.path,physical:selected.head.physical,observation:selected.head.observation,
                expected:selected.expected,bodyParserVersion:2,families:{...selected.head.families,'body-urls':async emit=>{for(const record of oldRecords)if(!await emit(record))return false;return true;}}})).outcome==='activated','Authentic parser2 primary facts seeded without optional labels');
            }
          }
          if(oldParser){
            const retired=f.add('Retired.md','');ok((await f.acquisition.acquire(retired,M.parseBodyMetadata(''))).saved,'Retirement fixture acquired');
            f.files.delete(retired.path);ok((await f.repository.tombstone(retired.path)).outcome==='activated','Canonical retired marker seeded');
          }
          const db=await f.cache.open(),heads=await value(db.transaction('sourceHeads').objectStore('sourceHeads').getAll());
          initial.destroy();initial=null;f.acquisition.close();
          if(oldParser){
            await edit(db,['sourceHeads','bodies'],tx=>{
              for(const head of heads) tx.objectStore('sourceHeads').put({...head,bodyParserVersion:2});
              for(const file of f.files.values()) tx.objectStore('bodies').put({path:file.path,mtime:file.stat.mtime,parserVersion:2,body:M.parseBodyMetadata('')});
            });
          }
          let signal;const paused=new Promise(resolve=>signal=resolve),held=new Promise(resolve=>unblock=resolve);
          let replayCount=0;M.GraphBuilder.prototype.buildSourceNodeCatalog=async function(...args){replayCount++;if(interruption&&replayCount===1){signal();await held;}return failure?null:original.apply(this,args)};
          index=new M.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>0},f.app);index.scheduleOrphanCleanup=()=>{};
          if(interruption?.startsWith('primary')){
            const repair=index.sourceAcquisition.prepareUrlAliasVocabulary;
            index.sourceAcquisition.prepareUrlAliasVocabulary=async function(...args){signal();await held;return repair.apply(this,args)};
          }
          release=index.acquireSemanticDemand('A.md');const startup=index.restorePersistedSnapshot(['A.md']);
          if(interruption){
            await paused;const before=index.urlAliasUpgradeToken();
            if(interruption?.startsWith('primary')){
              await startup;ok((await index.waitForSnapshotHydration()).restored,'Primary cache promotes before alias repair');
              ok(index.isFullSnapshotHydrated()&&!index.hasPendingSnapshotHydration(),'Full coherent cache is already available');
              await index.refreshSemanticSettings();ok(!index.hasPendingSemanticPreparation(),'Current requested semantics are ready before aliases');
              ok(index.neighbours(index.get('A.md'),'left').some(n=>n.page.path==='B.md'),'Requested cached relationship available');
              ok(index.state.pages.get('Remote.md').neighbours.has(oldUrl.path),'Global cached URL relationship available before repair');
              equal([...index.state.evidence.declarations()].length,evidence.length,'Primary cached provenance remains available');
              equal(await value(db.transaction('sourceHeads').objectStore('sourceHeads').getAll()),heads.map(head=>({...head,bodyParserVersion:2})),'Primary authority does not restamp any old head');
              equal(index.getSourceAcquisitionCounters().vaultReads,0,'No parser repair is needed to expose cached relationships');
              equal(index.getSourceAcquisitionCounters().parses,0,'No optional parser work claimed complete');
              ok(index.hasPendingSearchVocabulary(),'Alias vocabulary truthfully remains pending');
              equal(index.getUrlAliasUpgradeProgress(),{phase:'repair',processed:0,total:interruption==='primary'?3:2},'Owned optional progress is distinct from hydration');
              equal((await f.cache.readSnapshotMeta()).urlAliasVersion,1,'No false current alias certificate');
              if(storageFailure){
                const repo=index.indexedDb.sources,storageBefore=await Promise.all(['sourceHeads',M.SOURCE_LOCAL_OWNER_STORE,M.SOURCE_LOCAL_KEY_STORE,M.SOURCE_IMPACT_STORE].map(store=>value(db.transaction(store).objectStore(store).getAll())));
                const primaryBefore=await value(db.transaction('meta').objectStore('meta').getAll());
                const put=IDBObjectStore.prototype.put,add=IDBObjectStore.prototype.add,remove=IDBObjectStore.prototype.delete,write=repo.write;
                if(storageFailure==='stage')IDBObjectStore.prototype.add=function(...args){if(this.name==='sourceChunks')throw new DOMException('Owned quota fixture','QuotaExceededError');return add.apply(this,args)};
                if(storageFailure==='activation')IDBObjectStore.prototype.put=function(...args){if(this.name==='sourceHeads')throw new DOMException('Owned quota fixture','QuotaExceededError');return put.apply(this,args)};
                if(storageFailure==='reclaim')IDBObjectStore.prototype.delete=function(...args){if(this.name===M.SOURCE_LOCAL_DEPENDENCY_STORE)throw new DOMException('Owned reclaim quota fixture','QuotaExceededError');return remove.apply(this,args)};
                if(storageFailure==='open')repo.write=async function(...args){const open=this.storage.open;this.storage.open=async()=>null;try{return await write.apply(this,args)}finally{this.storage.open=open}};
                restoreStorageFault=()=>{IDBObjectStore.prototype.put=put;IDBObjectStore.prototype.add=add;IDBObjectStore.prototype.delete=remove;repo.write=write};
                const task=index.urlAliasUpgradeTask;unblock();await task;
                ok(index.sourceAcquisition.hasSemanticDependencies(),'Optional write failure preserves primary authority');
                ok(!index.hasPendingSemanticPreparation(),'Requested semantic publication remains ready');
                ok(index.neighbours(index.get('A.md'),'left').some(n=>n.page.path==='B.md'),'Current primary relationship survives failed optional storage');
                equal(repo.unsaved.size,0,'Optional storage failure creates no unsaved masks');equal(repo.memory.size,0,'Optional storage failure creates no fallback source');
                equal(index.sourceAcquisition.pendingKnownFiles.size,0,'Optional storage failure queues no generic inventory');
                if(storageFailure!=='reclaim'){
                  equal(await Promise.all(['sourceHeads',M.SOURCE_LOCAL_OWNER_STORE,M.SOURCE_LOCAL_KEY_STORE,M.SOURCE_IMPACT_STORE].map(store=>value(db.transaction(store).objectStore(store).getAll()))),storageBefore,'Every pre-CAS failure preserves exact selected head/owner/counts/journal');
                  const control=rows=>rows.filter(row=>row.key==='source-sequence'||row.key==='source-local-dependency-state'||row.key==='source-dependency-state'||row.key.startsWith('source-dependency-dirty:'));
                  equal(control(await value(db.transaction('meta').objectStore('meta').getAll())),control(primaryBefore),'Pre-CAS failure does not alter authority state or dirty tickets');
                  ok(index.hasPendingSearchVocabulary()&&index.getSearchVocabularyFailure(),'Optional storage failure is explicitly terminal incomplete');
                  equal(index.urlAliasFacetVersion,1,'Failed storage cannot certify complete aliases');
                }else{
                  const owner=await value(db.transaction(M.SOURCE_LOCAL_OWNER_STORE).objectStore(M.SOURCE_LOCAL_OWNER_STORE).get('Remote.md'));
                  equal((await f.repository.inspect('Remote.md')).head.bodyParserVersion,3,'Successful CAS records actual current URL grammar');
                  equal(await f.repository.ensureLocalDependencies('Remote.md',owner.order,owner.markdownOrder),'ready','Failed inactive reclaim cannot block selected owner');
                  equal(await f.repository.completeLocalDependencyInventory(),'ready','Primary closed-world counts survive inactive reclaim failure');
                  const lookup=await f.repository.lookupLocalDependencies([M.sourceLocalDependencyKey('node','https://help.obsidian.md')]);equal(lookup.outcome,'ready','Fresh dependency discovery works despite inactive reclaim');
                  equal(await value(db.transaction(M.SOURCE_LOCAL_KEY_STORE).objectStore(M.SOURCE_LOCAL_KEY_STORE).getAll()),storageBefore[2],'Alias CAS preserves proven equivalent count totals');
                  index.destroy();index=null;release=null;
                  restarted=new M.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>0},f.app);restarted.scheduleOrphanCleanup=()=>{};
                  const prepare=restarted.sourceAcquisition.prepareUrlAliasVocabulary;let resume;const hold=new Promise(resolve=>resume=resolve);
                  restarted.sourceAcquisition.prepareUrlAliasVocabulary=async function(...args){await hold;return prepare.apply(this,args)};
                  releaseRestart=restarted.acquireSemanticDemand('Remote.md');await restarted.restorePersistedSnapshot(['Remote.md']);
                  ok((await restarted.waitForSnapshotHydration()).restored,'Reopened graph remains usable despite safe inactive reclaim');
                  ok(await restarted.flushSourceRepository(),'Reopened source authority authenticates independently of warm navigation');await restarted.refreshSemanticSettings();
                  ok(!restarted.hasPendingSemanticPreparation(),'Reopened requested semantics remain ready after reclaim failure');
                  ok(restarted.neighbours(restarted.get('Remote.md'),'child').some(n=>n.page.path===oldUrl.path),'Fresh current URL primary semantics retain their canonical child role');
                  restarted.destroy();resume();
                }
                restoreStorageFault();restoreStorageFault=null;return true;
              }
              if(interruption!=='primary'){
                const owner=f.files.get('Remote.md'),beforeHead=await index.indexedDb.sources.inspect(owner.path);
                if(interruption==='primary-edit'){owner.stat.mtime++;f.texts.set(owner.path,'[Edited](https://help.obsidian.md)');f.app.vault.trigger('modify',owner);}
                if(interruption==='primary-delete'){f.files.delete(owner.path);f.app.vault.trigger('delete',owner);}
                if(interruption==='primary-rename'){f.files.delete(owner.path);const oldPath=owner.path;owner.path='MovedRemote.md';f.files.set(owner.path,owner);f.app.vault.trigger('rename',owner,oldPath);}
                const task=index.urlAliasUpgradeTask,retainedUrl=index.state.pages.get(oldUrl.path);
                if(interruption==='primary-unload'){index.destroy();}else index.sourceAcquisition.pauseInventory();
                unblock();await task;
                equal(index.urlAliasFacetVersion,1,'Superseded alias work cannot claim complete vocabulary');
                equal((await f.cache.readSnapshotMeta()).urlAliasVersion,1,'Superseded work cannot advance persisted facet certificate');
                equal(retainedUrl.aliases,[],'Late source repair cannot replace coherent cache facets');
                if(interruption==='primary-edit'){
                  const after=await f.cache.sources.inspect('Remote.md');equal(after.head,beforeHead.head,'Edited owner rejects obsolete repair without a false head restamp');
                }
                if(interruption!=='primary-unload')ok(index.hasPendingSearchVocabulary(),'Externally newer source work remains incomplete');
                return true;
              }
            }else if(interruption==='layout'){
              settings.embedCentralNode=!settings.embedCentralNode;settings.compactingFactor+=0.1;
              await index.refreshPresentationSettings();equal(index.urlAliasUpgradeToken(),before,'Pure layout/editor changes retain alias lifetime');
            }else{
              settings.renderAlias=true;settings.nameFields='Title';
              if(interruption==='title-facade')index.refreshDisplayNames();else await index.refreshPresentationSettings();
              ok(index.urlAliasUpgradeToken()!==before,'True search policy advances narrow lifetime');
            }
            unblock();
          }
          await startup;ok((await index.waitForSnapshotHydration()).restored,'Graph cache survives optional alias replay outcome');await index.refreshSemanticSettings();
          const settledAt=Date.now();while(index.hasPendingSearchVocabulary()&&!index.getSearchVocabularyFailure()&&Date.now()-settledAt<10000)await new Promise(resolve=>setTimeout(resolve,10));
          if(interruption){
            const at=Date.now();while(index.hasPendingSearchVocabulary()&&Date.now()-at<10000)await new Promise(resolve=>setTimeout(resolve,10));
            ok(!index.hasPendingSearchVocabulary(),'Deferred alias vocabulary settles');
            equal(replayCount,interruption==='layout'||interruption==='primary'?1:2,'Only relevant presentation/search changes repeat the catalog');
            if(interruption!=='layout'&&interruption!=='primary')equal(index.search('Current A title',10,'vault-files').map(page=>page.path),['A.md'],'Current title policy search is published');
          }
          const url=index.get(oldUrl.path);ok(url,'Cached URL remains');equal(url.name,oldUrl.name,'First meaningful URL display label stays stable');
          ok(index.state.pages.get('Remote.md').neighbours.has(oldUrl.path),'Full cached relationship survives alias upgrade');
          equal([...index.state.evidence.declarations()].length,evidence.length,'Cached provenance count retained');
          equal(index.getSemanticPreparationDiagnostics().fullBuilds,0,'Facet upgrade is not a full build');
          equal(index.getSourceAcquisitionCounters().vaultReads,oldParser?(interruption==='primary'?3:2):0,'Only obsolete parser inputs require Markdown rereads');equal(index.getSourceAcquisitionCounters().parses,oldParser?(interruption==='primary'?3:2):0,'Grammar migration intentionally reparses old bodies');
          const currentHeads=await value(db.transaction('sourceHeads').objectStore('sourceHeads').getAll());
          if(!oldParser) equal(currentHeads,heads,'Current neutral heads preserved exactly');
          else {
            for(const head of currentHeads){
              const before=heads.find(item=>item.sourceId===head.sourceId);
              if(before.state==='tombstone')equal(head,{...before,bodyParserVersion:2},'Known retired parser2 marker remains byte-identical');
              else if(before.families['body-urls'].records===0) equal(head,{...before,bodyParserVersion:2},'URL-free parser2 head remains byte-identical');
              else equal(head.bodyParserVersion,M.SOURCE_BODY_PARSER_VERSION,'URL-bearing old head repaired for optional alias completeness');
            }
          }
          if(failure){
            ok(index.hasPendingSearchVocabulary(),'Failed optional vocabulary remains incomplete');
            equal(index.getSearchVocabularyFailure(),'url-alias-vocabulary-unavailable','Explicit terminal failure instead of fake readiness');
            equal(url.aliases,[],'Last coherent cache facets retained');
            const attempts=replayCount,token=index.urlAliasUpgradeToken();
            settings.embedCentralNode=!settings.embedCentralNode;settings.compactingFactor+=0.1;await index.refreshPresentationSettings();index.retryUrlAliasUpgrade();
            equal(index.urlAliasUpgradeToken(),token,'Pure layout keeps terminal failure lifetime');
            equal(index.getSearchVocabularyFailure(),'url-alias-vocabulary-unavailable','Layout cannot hide an unchanged terminal failure');
            await new Promise(r=>setTimeout(r,100));equal(replayCount,attempts,'Unchanged failed vocabulary does not auto-loop or retry for layout');
          }else{
            equal(url.aliases,[...(interruption==='primary'?['Current owner alias']:[]),'Same owner second','Documentation','Same owner third','Obsidian help alias'],'All source aliases replayed outside requested neighborhood');
            equal(index.search('Obsidian help alias',10,'vault-files').map(p=>p.path),[oldUrl.path],'Second URL alias finds the global URL');
            ok(!index.hasPendingSearchVocabulary(),'Upgraded full vocabulary complete');
            index.cancelPendingPersistence();ok(await index.persistIndexedDbSnapshot(index.snapshotPersistGeneration),'Versioned repaired snapshot persisted');
            equal((await f.cache.readSnapshotMeta()).urlAliasVersion,2,'Future warm cache carries the current alias facet marker');
            release();release=null;index.destroy();index=null;const beforeReplay=replayCount;
            restarted=new M.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>0},f.app);restarted.scheduleOrphanCleanup=()=>{};
            releaseRestart=restarted.acquireSemanticDemand('A.md');await restarted.restorePersistedSnapshot(['A.md']);ok((await restarted.waitForSnapshotHydration()).restored,'Second warm restore');
            equal(replayCount,beforeReplay,'Current facet marker skips global node replay');
            equal(restarted.search('Obsidian help alias',10,'vault-files').map(p=>p.path),[oldUrl.path],'Warm alias remains searchable');
            equal(restarted.search('Same owner third',10,'vault-files').map(p=>p.path),[oldUrl.path],'Later alias within one owner survives warm restore');
            equal(restarted.getSourceAcquisitionCounters().vaultReads,0,'Current-version next warm requires no body reads');equal(restarted.getSourceAcquisitionCounters().parses,0,'Current-version next warm requires no parsing');
            if(!oldParser){
              const owner=f.files.get('Remote.md');owner.stat.mtime++;
              const edited='[Edited alias](https://help.obsidian.md)';f.texts.set(owner.path,edited);
              ok((await restarted.sourceAcquisition.acquire(owner,M.parseBodyMetadata(edited))).current,'Edited canonical source acquired');
              ok(await restarted.sourceAcquisition.reconcile(),'Edited source authority settles');
              const builder=new M.GraphBuilder(restarted.plugin,f.app,restarted.fieldCache,restarted.metadataParser,restarted.indexedDb,()=>true,new Map(),restarted.sourceAcquisition);
              const patch=await builder.prepareNodeImpactPatch(restarted.state,[{id:oldUrl.path,kind:'url',state:'materialized',semanticPath:oldUrl.path}]);
              ok(patch,'Current contributor facets staged after edit');patch.publish();
              equal(restarted.get(oldUrl.path).aliases,['Edited alias','Obsidian help alias'],'Removed within-owner labels retire; other owner survives');
              equal([...restarted.state.evidence.declarations()].length,evidence.length,'Facet edits preserve relationship multiplicity');
            }
          }
          return true;
        } finally {restoreStorageFault?.();unblock?.();M.GraphBuilder.prototype.buildSourceNodeCatalog=original;release?.();releaseRestart?.();initial?.destroy();index?.destroy();restarted?.destroy();f.close();}
      })()`), true);
    } finally {await browser.cleanup();}
  });
}


/** Actual optional CAS work yields to new primary demand, including policy and supersession owners. */
for (const mode of ['navigation','supersession','policy','missing-metadata','corrupt']) {
  test(`optional alias owner boundaries prioritize requested primary scopes (${mode})`, async () => {
    const browser=await chromiumHarness(bundle);
    try {
      assert.equal(await browser.evaluate(contributorBrowserInitialize),true);
      assert.equal(await browser.evaluate(`(async()=>{
        const assert=Object.assign((v,m)=>ok(v,m),{equal}),M=sourceModules,mode=${JSON.stringify(mode)},f=await fixture('alias-priority-'+mode);
        const collect=${collect.toString()},hostOracle=${hostOracle.toString()},fullCenterIndex=${fullCenterIndex.toString()},centerGateSettings=${centerGateSettings.toString()};
        let initial,index,release,releaseTarget;const wait=async predicate=>{const at=Date.now();while(Date.now()-at<15000){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,10));}throw Error('Alias priority fixture did not close');};
        try{
          f.text=f.texts;f.add('A.md','Friends:: [[B]]');f.add('B.md','');f.add('Limited.md','Field:: Original');
          const owners=Array.from({length:12},(_,i)=>'Remote-'+String(i).padStart(2,'0')+'.md');
          for(const [i,path]of owners.entries())f.add(path,'[First '+i+'](https://help.obsidian.md) [Second '+i+'](https://help.obsidian.md)');
          f.app.vault.getName=()=> 'alias-priority-'+mode;f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??(path==='/'||path===''?f.app.vault.getRoot():null);
          await f.acquire();ok(await f.acquisition.reconcile(),'Seed current primary sources');
          const semantic={hierarchy:{hidden:[],parents:[],children:[],leftFriends:['Friends'],rightFriends:[],previous:[],next:[]},inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
          initial=await fullCenterIndex(M,f,await hostOracle(f,[...f.files.keys()],semantic,{noteTypeField:'Type',primaryTagField:'Style'},true),semantic,centerGateSettings({showFolderNodes:false}));
          const settings={...initial.plugin.settings,lastActivePath:'A.md',pinnedNodes:[]},saved=[...initial.state.pages.values()].map(page=>M.persistedPageFromGraphPage(page)),evidence=[...initial.state.evidence.declarations()].map(item=>M.persistedDeclarationFromEvidence(item));
          for(const page of saved)if(page.url)page.aliases=[];
          ok(await f.cache.writeSnapshot({createdAt:Date.now(),urlAliasVersion:1,vaultSignature:M.computeVaultSignature(f.app),settingsSignature:M.computeIndexSettingsSignature(settings),discoveredFields:[]},saved,evidence),'Seed legacy alias facets');
          for(const path of owners){const selected=await f.repository.inspect(path),records=[];await f.repository.visit(path,'body-urls',rows=>{for(const {aliases,...primary}of rows)records.push(primary);return true;});
            equal((await f.repository.replace({sourceId:path,physical:selected.head.physical,observation:selected.head.observation,expected:selected.expected,bodyParserVersion:2,families:{...selected.head.families,'body-urls':async emit=>{for(const record of records)if(!await emit(record))return false;return true;}}})).outcome,'activated','Seed authenticated old grammar');}
          const db=await f.cache.open();initial.destroy();initial=null;f.acquisition.close();
          index=new M.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>0},f.app);index.scheduleOrphanCleanup=()=>{};
          const repo=index.indexedDb.sources,activate=repo.activate,prepare=index.prepareSemanticScope;
          let introduced=false,activated=0,targetAttempts=0,layoutChanged=false,conflict=false;const target=mode==='missing-metadata'||mode==='corrupt'?'Limited.md':owners[2];
          index.prepareSemanticScope=async function(...args){if(args[0]===target)targetAttempts++;const task=prepare.apply(this,args);
            if(mode==='supersession'&&args[0]===target&&targetAttempts===2&&!layoutChanged){layoutChanged=true;settings.embedCentralNode=!settings.embedCentralNode;await this.refreshPresentationSettings();}return task;};
          repo.activate=async function(...args){
            const head=args[1];if(head.bodyParserVersion===3&&owners.includes(head.sourceId)){
              if(!introduced){introduced=true;
                if(mode!=='missing-metadata'&&mode!=='corrupt'){release();release=null;}settings.lastActivePath=target;
                if(mode==='missing-metadata')f.metadata.delete(target);
                if(mode==='corrupt'){
                  index.sourceAcquisition.pauseInventory();const selected=await this.inspect(target),family=selected.head.families.values;
                  await edit(db,['sourceChunks'],async tx=>{const store=tx.objectStore('sourceChunks'),key=[target,family.revision,'values',0],chunk=await value(store.get(key));store.put({...chunk,data:'not canonical JSON'});});
                }
                releaseTarget=index.acquireSemanticDemand(target);await index.refreshSemanticSettings();
                conflict=index.hasPendingSemanticPreparation();ok(conflict,'New demand cannot publish while the optional writer owns the repository lane');
                if(mode==='policy'){settings.inferAllLinksAsFriends=true;index.invalidateSemanticPolicy();}
              }else if(mode!=='missing-metadata'&&mode!=='corrupt'){
                ok(!index.hasPendingSemanticPreparation(),'Requested publication precedes the next optional alias CAS');
                const role=mode==='policy'?'left':'child';ok(index.neighbours(index.get(target),role).some(item=>item.page.path==='https://help.obsidian.md'),'Current primary role is authoritative before alias maintenance continues');
              }
            }
            const result=await activate.apply(this,args);if(result.outcome==='activated'&&head.bodyParserVersion===3&&owners.includes(head.sourceId))activated++;return result;
          };
          release=index.acquireSemanticDemand('A.md');await index.restorePersistedSnapshot(['A.md']);ok((await index.waitForSnapshotHydration()).restored,'Full coherent cache restored');
          await wait(()=>introduced);
          if(mode==='corrupt'){
            await wait(()=>!index.urlAliasUpgradeTask);await index.refreshSemanticSettings();
            ok(!index.sourceAcquisition.hasSemanticDependencies(),'Corrupt primary input closes genuine source authority');
            ok(index.sourceAcquisition.pendingKnownFiles.has(f.files.get(target)),'Canonical damaged owner has its normal repair owner');
            ok(index.hasPendingSearchVocabulary(),'Corrupt input cannot certify alias vocabulary');
            const before=activated;index.sourceAcquisition.enableInventory();await index.sourceAcquisition.flush();
            await wait(()=>index.sourceAcquisition.hasSemanticDependencies()&&!index.hasPendingSemanticPreparation());
            await wait(()=>!index.urlAliasUpgradeTask&&!index.hasPendingSearchVocabulary());ok(activated>=before,'Ordinary primary repair resumes optional work without a restamp');
          }else await wait(()=>!index.urlAliasUpgradeTask);
          if(mode==='missing-metadata'){
            equal(index.getSemanticPreparationFailure(),'metadata-pending','Actual missing primary metadata remains explicit');equal(targetAttempts,1,'Unchanged terminal input is not retried once per alias owner');
            equal(activated,owners.length,'A terminal requested input does not stall unrelated optional owner repairs');ok(index.neighbours(index.get('A.md'),'left').some(item=>item.page.path==='B.md'),'Other current primary scopes survive a terminal requested outcome');
          }else{
            ok(!index.hasPendingSemanticPreparation(),'Current requested scopes close during the migration');equal(activated,owners.length,'All old URL owners eventually acquire current grammar');ok(!index.hasPendingSearchVocabulary(),'Final vocabulary is atomically complete');
            if(mode==='supersession'){ok(layoutChanged,'Real presentation refresh supersedes the first stable-window task');ok(targetAttempts>=3,'The gate drains the existing automatic supersession retry');}
            if(mode==='navigation')equal(targetAttempts,2,'One transient lane conflict is retried in the stable primary window');
          }
          equal([...index.state.evidence.declarations()].map(item=>M.persistedDeclarationFromEvidence(item)),evidence,'Optional repairs preserve every cached primary declaration');equal(index.getSemanticPreparationDiagnostics().fullBuilds,0,'Priority does not force a whole graph build');
          return true;
        }finally{release?.();releaseTarget?.();index?.destroy();initial?.destroy();f.close();}
      })()`),true);
    } finally {await browser.cleanup();}
  });
}
