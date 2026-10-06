/** On-demand lifecycle and semantics through production owners and real Chromium IndexedDB. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { contributorBrowserBundle, contributorBrowserInitialize } from './support/contributorBrowserFixture.mjs';
import { chromiumHarness } from './support/browserTypeScript.mjs';
import { centerGateSettings } from './support/requestedCenterGateFixture.mjs';

const bundle = await contributorBrowserBundle(['src/index/GraphIndex.ts', 'src/index/GraphBuilder.ts', 'src/index/IndexSnapshot.ts']);
const initialize = `(() => {
  window.onDemandFixture = async(name, overrides={}) => {
    const f=await fixture(name);f.app.vault.getName=()=>name;
    f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??(path==='/'||path===''?f.app.vault.getRoot():null);
    const settings={...(${centerGateSettings.toString()})({showFolderNodes:false,renderSiblings:false}),
      hierarchy:{hidden:['Hidden'],parents:['Parent'],children:['Child'],leftFriends:['Friend'],rightFriends:['Right'],previous:['Previous'],next:['Next']},
      inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],indexingMode:'on-demand',urlIndexingMode:'on-demand',lastActivePath:'A.md',pinnedNodes:[],...overrides};
    let revision=0;const marks=[];
    const index=new sourceModules.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>revision,startupDiagnostics:{mark:key=>marks.push(key),count:()=>{},phase:()=>{}}},f.app);
    index.scheduleOrphanCleanup=()=>{};
    const parse=index.metadataParser.parse.bind(index.metadataParser);
    const parses=[];index.metadataParser.parse=async(...args)=>{parses.push(args[0]);return parse(...args);};
    let inventoryStarts=0;index.sourceAcquisition.enableInventory=()=>{inventoryStarts++;throw new Error('On-demand must never start global inventory');};
    return {f,index,settings,marks,parses,get inventoryStarts(){return inventoryStarts;},bump(){revision++;},close(){index.destroy();f.close();}};
  };
  window.settleDemand=async(index)=>{while(index.onDemandTasks.size)await Promise.all([...index.onDemandTasks.values()]);};
  return true;
})()`;

/** The browser deadline reports a missing closure instead of accepting eventual global readiness. */
async function scenario(code) {
  const browser=await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize),true);
    assert.equal(await browser.evaluate(initialize),true);
    assert.equal(await browser.evaluate(code),true);
  } finally { await browser.cleanup(); }
}

test('cold startup is body-free, local demand uses bounded canonical owners and revisit reuses durable data', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-demand-cold');const {f,index}=o;let release;
  try{
    f.add('A.md','[Site](https://example.com/local)',{Parent:'[[B]]'});f.add('B.md','',{Child:'[[A]]'});f.add('Incoming.md','',{Friend:'[[A]]'});
    for(let n=0;n<100;n++)f.add('Unrelated'+n+'.md','Hidden:: [[B]]');
    f.app.metadataCache.resolvedLinks={'A.md':{'B.md':1},'B.md':{'A.md':1},'Incoming.md':{'A.md':1}};
    await index.primePhysicalSearchCatalog();equal(o.parses.length,0,'Physical search performs no parses');
    const restore=await index.restorePersistedSnapshot(['A.md']);ok(!restore.restored,'No snapshot');
    ok(await index.initializeOnDemandBaseline(['A.md']),'Host baseline publishes');
    equal(f.reads.length,0,'Closed startup does not read body');equal(o.parses.length,0,'Closed startup does not parse body');
    ok(index.getNeighborhood('A.md'),'Body-free graph usable');ok(!index.sourceAcquisition.hasSemanticDependencies(),'No global authority');
    release=index.acquireSemanticDemand('A.md');await settleDemand(index);
    equal([...new Set(f.reads)].sort(),['A.md','B.md','Incoming.md'],'Only direct owners are acquired');
    equal(index.getNeighborhood('A.md').parents.map(x=>x.page.path),['B.md'],'Canonical explicit parent');
    ok(index.getNeighborhood('A.md').leftFriends.some(x=>x.page.path==='Incoming.md'),'Incoming ontology preserved');
    ok(index.getNeighborhood('A.md').children.some(x=>x.page.url==='https://example.com/local'),'Demand URL relation canonical');
    const gates=index.gateStats(index.get('A.md'));equal(gates.top.visibleCount,1,'Local parent count');equal(gates.top.coverage,'local','Coverage separate');equal(gates.top.complete,false,'No false global certainty');
    equal(o.inventoryStarts,0,'No global inventory');ok(!index.hasPendingSemanticPreparation(),'Local task settles without global authority');
    const count=f.reads.length;release();release=index.acquireSemanticDemand('B.md');await settleDemand(index);release();release=index.acquireSemanticDemand('A.md');await settleDemand(index);
    equal(f.reads.length,count,'A-B-A does not reread current owners');
    index.scheduleSnapshotPersist(0);await new Promise(resolve=>window.setTimeout(resolve,10));equal((await index.indexedDb.readSnapshotCatalog()).active,null,'Partial graph cannot become complete snapshot');
    const body=await index.indexedDb.getBody('A.md',1);ok(body?.urls.length,'Visited source body persisted');
    return true;
  }finally{release?.();o.close();}
})()`));

test('dense host totals are not truncated by the64owner or rendered item caps', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-demand-dense',{maxItemCount:3});const{f,index}=o;let release;
  try{
    f.add('A.md','');const targets={};for(let n=0;n<100;n++){const path='Target'+String(n).padStart(3,'0')+'.md';f.add(path,'');targets[path]=1;}
    f.app.metadataCache.resolvedLinks={'A.md':targets};ok(await index.initializeOnDemandBaseline(),'Baseline');
    release=index.acquireSemanticDemand('A.md');await settleDemand(index);
    equal(new Set(f.reads).size,64,'Body owner bound preserved');equal(index.getNeighborhood('A.md').children.length,3,'Rendered item bound');
    equal(index.gateStats(index.get('A.md')).bottom.visibleCount,100,'All native targets counted before caps');equal(o.inventoryStarts,0,'No inventory');return true;
  }finally{release?.();o.close();}
})()`));

test('optional URL scan publishes vocabulary without semantic edges or source authority', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-demand-urls',{urlIndexingMode:'background'});const{f,index}=o;
  try{
    f.add('A.md','');f.add('Other.md','[First](https://example.com/background)\\nParent:: [[A]]');
    ok(await index.initializeOnDemandBaseline(),'Baseline');ok(await index.startBackgroundUrlIndex(),'Independent URL scan completes');
    const url=index.get('https://example.com/background');ok(url?.url,'URL vocabulary');ok(index.search('First',10).some(x=>x.path===url.path),'URL alias searchable');
    ok(!index.get('Other.md').neighbours.has(url.path),'URL scan has no document incidence');ok(!index.get('Other.md').neighbours.has('A.md'),'No unrelated ontology compiled');
    ok(!index.sourceAcquisition.hasSemanticDependencies(),'No global authority');equal(o.inventoryStarts,0,'No inventory');return true;
  }finally{o.close();}
})()`));

test('incoming frontmatter beyond64bodyowners keeps canonical local count totals', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-demand-incoming',{maxItemCount:4});const{f,index}=o;let release;
  try{
    f.add('A.md','');const resolved={};for(let n=0;n<100;n++){const path='Incoming'+String(n).padStart(3,'0')+'.md';f.add(path,'',{Parent:'[[A]]'});resolved[path]={'A.md':1};}
    f.app.metadataCache.resolvedLinks=resolved;ok(await index.initializeOnDemandBaseline(),'Baseline');
    release=index.acquireSemanticDemand('A.md');await settleDemand(index);
    const gates=index.gateStats(index.get('A.md'));equal(gates.top.visibleCount,0,'Incoming frontmatter overrides ordinary backlink direction');equal(gates.bottom.visibleCount,100,'All known frontmatter children count, including uncached body owners');
    equal(index.getNeighborhood('A.md').children.length,4,'Rendered item limit does not truncate count');equal(new Set(f.reads).size,64,'Still at most64bodyowners');return true;
  }finally{release?.();o.close();}
})()`));

test('displayed neighbor counts use its direct host metadata without expanding body demand', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-demand-neighbor');const{f,index}=o;let release;
  try{
    f.add('A.md','');f.add('B.md','');const resolved={'A.md':{'B.md':1}};
    for(let n=0;n<100;n++){const path='Outer'+n+'.md';f.add(path,'',{Parent:'[[B]]'});resolved[path]={'B.md':1};}
    f.app.metadataCache.resolvedLinks=resolved;ok(await index.initializeOnDemandBaseline(),'Baseline');
    release=index.acquireSemanticDemand('A.md');await settleDemand(index);
    index.gateStats(index.get('B.md'));while(index.onDemandGateTasks.size)await Promise.all([...index.onDemandGateTasks.values()]);
    const gates=index.gateStats(index.get('B.md'));equal(gates.bottom.visibleCount,100,'Neighbor receives canonical incoming frontmatter count');equal(gates.top.visibleCount,1,'Only A is host-inferred parent');
    equal([...new Set(f.reads)].sort(),['A.md','B.md'],'Host-only neighbor count work never expands Markdown body demand');return true;
  }finally{release?.();o.close();}
})()`));

test('center plain/body declarations discover direct owners absent from resolvedLinks and persist reuse across restart', async()=>scenario(`(async()=>{
  const name='v2-demand-restart';let o=await onDemandFixture(name);let release;
  try{
    o.f.add('A.md','Child:: [[Body]]',{Parent:'[Plain](Plain.md)'});o.f.add('Plain.md','');o.f.add('Body.md','');
    ok(await o.index.initializeOnDemandBaseline(),'Baseline');release=o.index.acquireSemanticDemand('A.md');await settleDemand(o.index);
    equal([...new Set(o.f.reads)].sort(),['A.md','Body.md','Plain.md'],'Center-derived direct physical targets are canonicalized');
    equal(o.index.getNeighborhood('A.md').parents.map(x=>x.page.path),['Plain.md'],'Plain property target canonical');
    equal(o.index.getNeighborhood('A.md').children.map(x=>x.page.path),['Body.md'],'Body property target canonical');
    release();release=null;o.close();o=await onDemandFixture(name);
    o.f.add('A.md','Child:: [[Body]]',{Parent:'[Plain](Plain.md)'});o.f.add('Plain.md','');o.f.add('Body.md','');
    ok(await o.index.initializeOnDemandBaseline(),'Restart baseline');release=o.index.acquireSemanticDemand('A.md');await settleDemand(o.index);
    equal(o.f.reads.length,0,'Restart reuses durable unchanged bodies');equal(o.parses.length,0,'Restart performs no repeated body parsing');
    equal(o.index.getNeighborhood('A.md').parents.map(x=>x.page.path),['Plain.md'],'Same durable canonical result');equal(o.inventoryStarts,0,'No global inventory on restart');return true;
  }finally{release?.();o.close();}
})()`));

test('fresh cached neighborhood returns before any broad source or evidence hydration', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-demand-fresh');const{f,index}=o;let release,second;
  try{
    f.add('A.md','[Cached](https://example.com/cache)',{Parent:'[[B]]'});f.add('B.md','');f.app.metadataCache.resolvedLinks={'A.md':{'B.md':1}};
    ok(await index.initializeOnDemandBaseline(),'Baseline');release=index.acquireSemanticDemand('A.md');await settleDemand(index);
    const M=sourceModules,pages=[...index.state.pages.values()].map(p=>M.persistedPageFromGraphPage(p));
    const evidence=[...index.state.evidence.declarations()].map(e=>M.persistedDeclarationFromEvidence(e));
    ok(await index.indexedDb.writeSnapshot({createdAt:Date.now(),urlAliasVersion:2,vaultSignature:M.computeVaultSignature(f.app),settingsSignature:M.computeIndexSettingsSignature(o.settings),discoveredFields:[]},pages,evidence,()=>true),'Controlled complete fixture snapshot');
    release();release=null;index.destroy();
    second=new M.GraphIndex({app:f.app,settings:o.settings,getIndexSourceRevision:()=>0},f.app);
    second.startPersistedSourceInventory=()=>{throw new Error('No source inventory');};second.indexedDb.iterateSnapshotPages=()=>{throw new Error('No broad page hydration');};second.indexedDb.iterateSnapshotEvidence=()=>{throw new Error('No evidence hydration');};
    const result=await second.restorePersistedSnapshot(['A.md']);ok(result.restored&&result.fresh&&result.partial,'Finite fresh navigation restored');
    ok(second.get('A.md').neighbours.has('https://example.com/cache'),'Cached URL incidence available early');ok(!second.isFullSnapshotHydrated(),'Finite acceleration never becomes complete authority');
    ok(await second.initializeOnDemandBaseline(),'Native baseline');ok(second.get('A.md').neighbours.has('https://example.com/cache'),'Valid cached incidence retained over native baseline');return true;
  }finally{release?.();second?.destroy();o.close();}
})()`));

test('local graph/counts do not authorize editing; exact pair preparation works with global source work unavailable', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-demand-pair');const{f,index}=o;let release;
  try{
    f.add('A.md','',{Parent:'[[B]]'});f.add('B.md','');f.app.metadataCache.resolvedLinks={'A.md':{'B.md':1}};
    ok(await index.initializeOnDemandBaseline(),'Baseline');release=index.acquireSemanticDemand('A.md');await settleDemand(index);
    ok(!index.isSemanticWriteReady('A.md','B.md'),'Local numeric count has no write authority');
    index.sourceAcquisition.flush=()=>{throw new Error('Exact edits must not join broad flush');};
    ok(await index.prepareRelationshipPair('A.md','B.md'),'Exact selected pair independently prepares');ok(index.isSemanticWriteReady('A.md','B.md'),'Exact pair alone grants editing authority');
    ok(!index.sourceAcquisition.hasSemanticDependencies(),'Pair does not certify global dependencies');equal(o.inventoryStarts,0,'No inventory');return true;
  }finally{release?.();o.close();}
})()`));

test('ontology settings recanonicalize demanded unchanged owners without a body reread or global inventory', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-demand-policy');const{f,index}=o;let release;
  try{
    f.add('A.md','',{Parent:'[[B]]'});f.add('B.md','');f.app.metadataCache.resolvedLinks={'A.md':{'B.md':1}};
    ok(await index.initializeOnDemandBaseline(),'Baseline');release=index.acquireSemanticDemand('A.md');await settleDemand(index);const reads=f.reads.length;
    equal(index.getNeighborhood('A.md').parents.map(x=>x.page.path),['B.md'],'Initial parent interpretation');
    o.settings.hierarchy.parents=[];o.settings.hierarchy.leftFriends=['Parent'];index.invalidateSemanticPolicy();await index.refreshSemanticSettings();await settleDemand(index);
    equal(index.getNeighborhood('A.md').parents.length,0,'Old ontology interpretation retired');equal(index.getNeighborhood('A.md').leftFriends.map(x=>x.page.path),['B.md'],'Demanded fact reinterpreted');
    equal(index.state.pages.get('A.md').neighbours.get('B.md').isLeftFriend,true,'Incremental canonical state, not only preview, follows new ontology');equal(f.reads.length,reads,'Policy change reuses current body');equal(o.inventoryStarts,0,'No global inventory');return true;
  }finally{release?.();o.close();}
})()`));

test('a file change during current demand cancels the old owner and retries the new revision', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-demand-revision');const{f,index}=o;let release,unblock;
  try{
    const file=f.add('A.md','[Old](https://example.com/old)');ok(await index.initializeOnDemandBaseline(),'Baseline');
    const parse=index.metadataParser.parse.bind(index.metadataParser);let entered;const parsing=new Promise(resolve=>entered=resolve);const hold=new Promise(resolve=>unblock=resolve);let first=true;
    index.metadataParser.parse=async(...args)=>{if(first){first=false;entered();await hold;}return parse(...args);};
    release=index.acquireSemanticDemand('A.md');await parsing;
    f.texts.set('A.md','[New](https://example.com/new)');file.stat.mtime=2;f.app.vault.trigger('modify',file);o.bump();index.refreshVisibleHostMetadataPreviews('A.md',0);unblock();await settleDemand(index);
    ok(index.get('A.md').neighbours.has('https://example.com/new'),'Latest revision publishes');ok(!index.get('A.md').neighbours.has('https://example.com/old'),'Late stale owner does not publish');
    equal(index.onDemandIndexed.get('A.md').mtime,2,'Current physical token');equal(o.inventoryStarts,0,'No inventory');return true;
  }finally{unblock?.();release?.();o.close();}
})()`));

test('foreground navigation preempts and resumes an optional URL scan without acquiring unrelated ontology', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-demand-preemption',{urlIndexingMode:'background'});const{f,index}=o;let release,unblock;
  try{
    f.add('A.md','[Center](https://example.com/center)');f.add('Other.md','[Background](https://example.com/background)');
    ok(await index.initializeOnDemandBaseline(),'Baseline');let entered;const reading=new Promise(resolve=>entered=resolve);const hold=new Promise(resolve=>unblock=resolve);const read=f.app.vault.read;
    f.app.vault.read=async file=>{if(file.path==='Other.md'){entered();await hold;}return read(file);};
    const background=index.startBackgroundUrlIndex();await reading;release=index.acquireSemanticDemand('A.md');await settleDemand(index);
    ok(index.get('A.md').neighbours.has('https://example.com/center'),'Foreground canonicalization finishes while background read held');
    unblock();ok(await background,'Existing URL scan resumes');ok(index.get('https://example.com/background'),'Background URL vocabulary added');
    ok(!index.get('Other.md').neighbours.has('https://example.com/background'),'Background still grants no incidence');equal(o.inventoryStarts,0,'No inventory');return true;
  }finally{unblock?.();release?.();o.close();}
})()`));


test('local host cover preserves metadata larger than the eager preview budgets and fails explicitly at guards', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-demand-metadata-guard');const{f,index}=o;let release;
  try{
    f.add('A.md','');const resolved={};for(let n=0;n<5;n++){const path='Incoming'+n+'.md';f.add(path,'',{Parent:'[[A]]',description:'x'.repeat(10000)});resolved[path]={'A.md':1};}
    f.app.metadataCache.resolvedLinks=resolved;ok(await index.initializeOnDemandBaseline(),'Baseline');release=index.acquireSemanticDemand('A.md');await settleDemand(index);
    equal(index.gateStats(index.get('A.md')).bottom.visibleCount,5,'Known metadata beyond8KiB/file and16KiB total is not dropped');
    f.add('Missing.md','');f.app.metadataCache.resolvedLinks['Missing.md']={'A.md':1};const cache=f.app.metadataCache.getFileCache;
    f.app.metadataCache.getFileCache=file=>file.path==='Missing.md'?null:cache(file);o.bump();index.refreshVisibleHostMetadataPreviews('Missing.md',0);await settleDemand(index);
    ok(index.gateStats(index.get('A.md')).bottom.countUnavailable,'Absent Markdown metadata explicitly marks counts unavailable');ok(index.hasUnavailableLocalCounts(),'Guard failure exposed to status');
    f.app.metadataCache.getFileCache=cache;const fm=cache(f.files.get('Missing.md')).frontmatter;fm.description='x'.repeat(2100000);o.bump();index.refreshVisibleHostMetadataPreviews('Missing.md',1);await settleDemand(index);
    ok(index.gateStats(index.get('A.md')).bottom.countUnavailable,'Per-owner decode guard is explicit, not silently truncated');return true;
  }finally{release?.();o.close();}
})()`));

test('topology reset fences an in-flight demanded owner and retries against the new baseline', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-demand-topology');const{f,index}=o;let release,unblock;
  try{
    f.add('A.md','[Owner](https://example.com/owner)');ok(await index.initializeOnDemandBaseline(),'Baseline');
    const parse=index.metadataParser.parse.bind(index.metadataParser);let entered;const parsing=new Promise(resolve=>entered=resolve);const hold=new Promise(resolve=>unblock=resolve);let first=true;
    index.metadataParser.parse=async(...args)=>{if(first){first=false;entered();await hold;}return parse(...args);};
    release=index.acquireSemanticDemand('A.md');await parsing;f.add('New.md','');const refreshing=index.refreshOnDemandGraph(['A.md'],true);unblock();ok(await refreshing,'New baseline and retry settle');await settleDemand(index);
    ok(index.get('New.md'),'Fresh physical topology survives');ok(index.get('A.md').neighbours.has('https://example.com/owner'),'Current demanded owner republished after reset');ok(index.onDemandIndexed.has('A.md'),'Retry token is current');equal(o.inventoryStarts,0,'No global inventory');return true;
  }finally{unblock?.();release?.();o.close();}
})()`));

test('body canonicalization retires a neighbor count proof without a host source revision change', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-demand-count-revision');const{f,index}=o;
  try{
    f.add('A.md','');f.add('B.md','');f.add('C.md','Parent:: [[B]]');f.app.metadataCache.resolvedLinks={'A.md':{'B.md':1}};
    ok(await index.initializeOnDemandBaseline(),'Baseline');index.gateStats(index.get('B.md'));while(index.onDemandGateTasks.size)await Promise.all([...index.onDemandGateTasks.values()]);
    equal(index.gateStats(index.get('B.md')).bottom.visibleCount,0,'Initial host-only count');
    const result=await index.patchMarkdownPaths(['C.md'],{useDurableCache:true});equal(result.outcome,'patched','New owner publishes');
    index.gateStats(index.get('B.md'));while(index.onDemandGateTasks.size)await Promise.all([...index.onDemandGateTasks.values()]);
    equal(index.gateStats(index.get('B.md')).bottom.visibleCount,1,'Acquired body fact replaces stable page proof');return true;
  }finally{o.close();}
})()`));

test('fresh cached incoming body facts beyond64owners survive unchanged local canonicalization', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-demand-cached-many');const{f,index}=o;let release,second;
  try{
    f.add('A.md','');const resolved={};for(let n=0;n<100;n++){const path='Incoming'+String(n).padStart(3,'0')+'.md';f.add(path,'Parent:: [[A]]');resolved[path]={'A.md':1};}f.app.metadataCache.resolvedLinks=resolved;
    ok(await index.initializeOnDemandBaseline(),'Baseline');for(const path of Object.keys(resolved))await index.patchMarkdownPaths([path],{useDurableCache:true});
    const M=sourceModules,pages=[...index.state.pages.values()].map(p=>M.persistedPageFromGraphPage(p));const evidence=[...index.state.evidence.declarations()].map(e=>M.persistedDeclarationFromEvidence(e));
    ok(await index.indexedDb.writeSnapshot({createdAt:Date.now(),urlAliasVersion:2,vaultSignature:M.computeVaultSignature(f.app),settingsSignature:M.computeIndexSettingsSignature(o.settings),discoveredFields:[]},pages,evidence,()=>true),'Controlled fresh snapshot');index.destroy();
    second=new M.GraphIndex({app:f.app,settings:o.settings,getIndexSourceRevision:()=>0},f.app);second.scheduleOrphanCleanup=()=>{};
    ok((await second.restorePersistedSnapshot(['A.md'])).fresh,'Fresh finite restore');ok(await second.initializeOnDemandBaseline(),'Native baseline');release=second.acquireSemanticDemand('A.md');await settleDemand(second);
    const gates=second.gateStats(second.get('A.md'));equal(gates.bottom.visibleCount,100,'Current cached body-only incoming survives64owner demand');equal(gates.top.visibleCount,0,'No37-owner inferred regression');ok(!second.isSemanticWriteReady('A.md','Incoming099.md'),'Cached count grants no write authority');
    second.refreshVisibleHostMetadataPreviews('Incoming099.md',0);await settleDemand(second);ok(second.onDemandCachedScopes.size===0,'Resolve observation retires cached semantics even unchanged sourceRevision');return true;
  }finally{release?.();second?.destroy();o.close();}
})()`));

test('stale snapshot rejection stays independent of all global source and hydration work', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-demand-stale');const{f,index}=o;let second;
  try{
    const file=f.add('A.md','');ok(await index.initializeOnDemandBaseline(),'Baseline');const M=sourceModules;
    ok(await index.indexedDb.writeSnapshot({createdAt:Date.now(),urlAliasVersion:2,vaultSignature:M.computeVaultSignature(f.app),settingsSignature:M.computeIndexSettingsSignature(o.settings),discoveredFields:[]},[...index.state.pages.values()].map(p=>M.persistedPageFromGraphPage(p)),[],()=>true),'Cached fixture');index.destroy();file.stat.mtime=2;
    second=new M.GraphIndex({app:f.app,settings:o.settings,getIndexSourceRevision:()=>0},f.app);second.sourceAcquisition.enableInventory=()=>{throw new Error('No inventory');};second.indexedDb.iterateSnapshotPages=()=>{throw new Error('No broad hydration');};
    const restored=await second.restorePersistedSnapshot(['A.md']);ok(!restored.restored&&!restored.fresh,'Stale snapshot not used');ok(await second.initializeOnDemandBaseline(),'Live host baseline available');equal(f.reads.length,0,'Closed startup body-free');return true;
  }finally{second?.destroy();o.close();}
})()`));

test('purge fences a held owner and preserves the actual memoized deletion result', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-demand-purge');const{f,index}=o;let release,unblock;
  try{
    f.add('A.md','[Late](https://example.com/late)');ok(await index.initializeOnDemandBaseline(),'Baseline');const parse=index.metadataParser.parse.bind(index.metadataParser);let entered;const parsing=new Promise(resolve=>entered=resolve),hold=new Promise(resolve=>unblock=resolve);
    index.metadataParser.parse=async(...args)=>{entered();await hold;return parse(...args);};release=index.acquireSemanticDemand('A.md');await parsing;
    ok(await index.purgePersistentIndexCache(),'Disposable database deleted');unblock();await settleDemand(index);equal(index.onDemandIndexed.size,0,'Retired owner cannot acquire a successful token');ok(!index.state.pages.get('A.md').neighbours.has('https://example.com/late'),'Late parse cannot publish');equal(index.snapshotPersistTimer,null,'No persistence is scheduled after purge');ok(await index.purgePersistentIndexCache(),'Memoized actual deletion success');
    const failed=await onDemandFixture('v2-demand-purge-failure');try{failed.index.indexedDb.purgeAndClose=async()=>false;equal(await failed.index.purgePersistentIndexCache(),false,'Initial deletion failure');equal(await failed.index.purgePersistentIndexCache(),false,'Repeat retains actual failure');}finally{failed.close();}return true;
  }finally{unblock?.();release?.();o.close();}
})()`));


test('rapid navigation cancels released-demand running and queued count covers without delaying the new center', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-demand-navigation-counts');const{f,index}=o;let releaseA,releaseZ,unblock;
  try{
    for(const path of ['A.md','Old.md','Queued.md','Z.md','New.md'])f.add(path,'');
    f.app.metadataCache.resolvedLinks={'A.md':{'Old.md':1,'Queued.md':1},'Z.md':{'New.md':1}};
    ok(await index.initializeOnDemandBaseline(),'Baseline');releaseA=index.acquireSemanticDemand('A.md');await settleDemand(index);
    const build=index.hostPreview.build.bind(index.hostPreview);let entered,oldCurrent;const building=new Promise(resolve=>entered=resolve),hold=new Promise(resolve=>unblock=resolve);const calls=[];
    index.hostPreview.build=async(path,options={})=>{if(options.completeHostCover)calls.push(path);if(path==='Old.md'&&options.completeHostCover){oldCurrent=options.isCurrent;entered();await hold;}return build(path,options);};
    const old=index.state.pages.get('Old.md'),queued=index.state.pages.get('Queued.md');index.gateStats(index.get('Old.md'));await building;index.gateStats(index.get('Queued.md'));
    releaseA();releaseA=null;releaseZ=index.acquireSemanticDemand('Z.md');await settleDemand(index);
    ok(index.onDemandHostScopes.has('Z.md'),'New center completes independently of held old count lane');ok(!oldCurrent(),'Released count demand is cancelled at existing checkpoints');
    index.gateStats(index.get('New.md'));unblock();while(index.onDemandGateTasks.size)await Promise.all([...index.onDemandGateTasks.values()]);
    ok(!calls.includes('Queued.md'),'Old queued cover never begins compilation');ok(!index.onDemandGateCounts.has(old)&&!index.onDemandGateCounts.has(queued),'Released count proofs cannot publish');
    ok(!index.onDemandUnavailableCounts.has('Old.md')&&!index.onDemandUnavailableCounts.has('Queued.md'),'Demand cancellation is silent, not an input failure');
    equal(index.gateStats(index.get('New.md')).top.visibleCount,1,'Current neighbor receives its valid local count');ok(!index.hasPendingSemanticPreparation(),'Cancelled queue closes ready status');equal(o.inventoryStarts,0,'No global work');return true;
  }finally{unblock?.();releaseA?.();releaseZ?.();o.close();}
})()`));

test('virtual endpoints have numeric current host counts and incoming frontmatter overrides without physical metadata', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-demand-virtual');const{f,index}=o;let release;
  try{
    const virtual='Question with boldness even the existence of God,';
    f.add('A.md','');f.add('Incoming.md','',{Parent:'[['+virtual+']]'});
    f.app.metadataCache.unresolvedLinks={'A.md':{[virtual]:1},'Incoming.md':{[virtual]:1}};
    ok(await index.initializeOnDemandBaseline(),'Baseline');release=index.acquireSemanticDemand('A.md');await settleDemand(index);
    const page=index.get(virtual);ok(page&&!page.file,'Known virtual endpoint has no physical input');index.gateStats(page);
    while(index.onDemandGateTasks.size)await Promise.all([...index.onDemandGateTasks.values()]);
    const gates=index.gateStats(index.get(virtual));equal(gates.top.visibleCount,1,'Current host incoming counted');equal(gates.bottom.visibleCount,1,'Incoming explicit Parent overrides inferred direction');
    for(const side of ['top','bottom','left','right']){ok(!gates[side].countUnavailable,'Normal virtual absence is available');equal(gates[side].coverage,'local','Honest local coverage');ok(!gates[side].complete,'No global negative authority');}
    equal(f.reads,['A.md'],'Rendered virtual counts acquire no other body');ok(!index.isSemanticWriteReady(virtual,'A.md'),'Counts do not authorize editing');
    release();release=index.acquireSemanticDemand(virtual);await settleDemand(index);
    equal([...new Set(f.reads)].sort(),['A.md','Incoming.md'],'Virtual navigation selects only actual direct incoming owners');ok(index.onDemandHostScopes.has(virtual),'Virtual center cover publishes');ok(!index.hasUnavailableLocalCounts(),'Virtual center ready');
    f.app.metadataCache.unresolvedLinks['A.md']={};o.bump();index.refreshVisibleHostMetadataPreviews('A.md',0);await settleDemand(index);
    equal(index.gateStats(index.get(virtual)).top.visibleCount,0,'Resolve refresh retires old unresolved incoming');equal(index.gateStats(index.get(virtual)).bottom.visibleCount,1,'Explicit incoming remains');equal(o.inventoryStarts,0,'No global source work');return true;
  }finally{release?.();o.close();}
})()`));

test('virtual gate covers preserve already acquired body-only incoming ontology without host aggregate links', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-demand-virtual-body');const{f,index}=o;
  try{
    f.add('Body.md','Parent:: [[Ghost]]');ok(await index.initializeOnDemandBaseline(),'Baseline');
    equal((await index.patchMarkdownPaths(['Body.md'],{useDurableCache:true})).outcome,'patched','Known body owner compiled');
    const reads=f.reads.length;index.gateStats(index.get('Ghost'));while(index.onDemandGateTasks.size)await Promise.all([...index.onDemandGateTasks.values()]);
    const gates=index.gateStats(index.get('Ghost'));equal(gates.bottom.visibleCount,1,'Known canonical body incidence retained');equal(gates.top.visibleCount,0,'No invented host inference');ok(!gates.bottom.countUnavailable,'No physical virtual input required');equal(f.reads.length,reads,'Count-only cover reads no body');return true;
  }finally{o.close();}
})()`));

test('nonphysical URL and tag centers retain canonical identity and local incoming facts', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-demand-synthetic-identity',{showTagNodes:true});const{f,index}=o;let release;
  try{
    const url='https://example.com/center';f.add('A.md','[A site]('+url+')');f.metadata.get('A.md').hostTags=['#topic/child'];
    ok(await index.initializeOnDemandBaseline(),'Baseline');release=index.acquireSemanticDemand('A.md');await settleDemand(index);release();
    release=index.acquireSemanticDemand(url);await settleDemand(index);const urlPage=index.get(url);equal(urlPage.url,url,'URL identity retained');ok(!urlPage.isTag,'URL remains URL');ok(urlPage.neighbours.has('A.md'),'Known body URL incoming remains');ok(!index.hasUnavailableLocalCounts(),'URL requires no physical metadata');release();
    release=index.acquireSemanticDemand('tag:topic/child');await settleDemand(index);const tag=index.get('tag:topic/child');ok(tag.isTag&&!tag.url,'Tag identity retained');ok(tag.neighbours.has('A.md'),'Native tag membership retained');ok(tag.neighbours.has('tag:topic'),'Canonical tag parent retained');ok(!index.hasUnavailableLocalCounts(),'Tag requires no physical metadata');equal(o.inventoryStarts,0,'No global source inventory');return true;
  }finally{release?.();o.close();}
})()`));
