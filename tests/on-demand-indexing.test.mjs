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

test('URL scan publishes canonical incidence independently of global source authority', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-demand-urls',{urlIndexingMode:'background'});const{f,index}=o;
  try{
    f.add('A.md','');f.add('Other.md','[First](https://example.com/background)\\nParent:: [[A]]');
    ok(await index.initializeOnDemandBaseline(),'Baseline');ok(await index.startBackgroundUrlIndex(),'Independent URL scan completes');
    const url=index.get('https://example.com/background');ok(url?.url,'URL vocabulary');ok(index.search('First',10).some(x=>x.path===url.path),'URL alias searchable');
    ok(index.getNeighborhood(url.path).parents.some(x=>x.page.path==='Other.md'),'URL scan supplies incoming notes');ok(!index.get('Other.md').neighbours.has('A.md'),'No unrelated ontology compiled');
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

for(const mode of ['on-demand','eager']) test('displayed neighbor counts use its direct host metadata without expanding body demand ('+mode+')', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-demand-neighbor-'+${JSON.stringify(mode)},{indexingMode:${JSON.stringify(mode)}});const{f,index}=o;let release;
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
    ok(await index.initializeOnDemandBaseline(),'Baseline');let entered;const reading=new Promise(resolve=>entered=resolve);const hold=new Promise(resolve=>unblock=resolve);const read=f.app.vault.cachedRead;
    f.app.vault.cachedRead=async file=>{if(file.path==='Other.md'){entered();await hold;}return read(file);};
    const background=index.startBackgroundUrlIndex();await reading;release=index.acquireSemanticDemand('A.md');await settleDemand(index);
    ok(index.get('A.md').neighbours.has('https://example.com/center'),'Foreground canonicalization finishes while background read held');
    unblock();ok(await background,'Existing URL scan resumes');ok(index.get('https://example.com/background'),'Background URL vocabulary added');
    ok(index.getNeighborhood('https://example.com/background').parents.some(x=>x.page.path==='Other.md'),'Background publishes discovered incidence');equal(o.inventoryStarts,0,'No inventory');return true;
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


test('independent URL cache restores first, reuses unchanged owners and retires edits/deletions', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-url-cache-mutations');let second;const{f,index}=o;
  try{
    f.add('A.md','[Old](https://Obsidian.md/slug)');f.add('B.md','[Second](https://obsidian.md/slug)');
    await index.initializeOnDemandBaseline();await index.startBackgroundUrlIndex();
    equal(index.getUrlIndexProgress().reads,2,'Cold URL bodies read once');
    equal(index.gateStats(index.get('https://obsidian.md/slug')).top.visibleCount,3,'Two referrers and root parent');
    ok(index.getNeighborhood('https://Obsidian.md').children.some(x=>x.page.path==='https://obsidian.md/slug'),'Canonical origin child');
    ok(index.search('Old',10).some(x=>x.path==='https://obsidian.md/slug'),'First alias');
    f.files.get('A.md').stat.mtime++;f.texts.set('A.md','');await index.refreshUrlOwner('A.md');
    ok(!index.search('Old',10).some(x=>x.path==='https://obsidian.md/slug'),'Removed owner alias retires');
    ok(index.search('Second',10).some(x=>x.path==='https://obsidian.md/slug'),'Shared owner alias survives');
    equal(index.gateStats(index.get('https://obsidian.md/slug')).top.visibleCount,2,'Remaining referrer+root');
    index.destroy();
    second=new sourceModules.GraphIndex({app:f.app,settings:o.settings,getIndexSourceRevision:()=>0},f.app);
    await second.restoreUrlIndex();
    ok(second.get('https://Obsidian.md/slug'),'URL cache restores without broader graph');
    await second.startBackgroundUrlIndex();equal(second.getUrlIndexProgress().reads,0,'Warm owners need no body reads');
    equal(second.getUrlIndexProgress().restored,2,'Zero-link and URL owners restored');
    f.files.delete('B.md');await second.refreshUrlOwner('B.md');
    ok(!second.get('https://obsidian.md/slug'),'Final owner deletion retires URL');
    ok(!second.getUrlIndexProgress().active,'No forever-active completed background job');return true;
  }finally{second?.destroy();o.close();}
})()`));

test('URL-only scan honors native and inline ontology overrides without unrelated relations', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-url-ontology');const{f,index}=o;
  try{
    f.add('A.md','[Body](https://Obsidian.md)\\nFriend:: https://obsidian.md\\nParent:: [[B]]',{Parent:'https://Obsidian.md'});
    f.add('B.md','');f.add('Only.md','',{Child:'https://Obsidian.md/only'});
    await index.initializeOnDemandBaseline();await index.startBackgroundUrlIndex();
    ok(index.get('https://obsidian.md/only'),'Frontmatter-only URL discovered');
    const h=index.getNeighborhood('https://obsidian.md');
    ok(h.children.some(x=>x.page.path==='A.md'),'Explicit Parent beats inferred URL child direction');
    ok(!index.getNeighborhood('A.md').parents.some(x=>x.page.path==='B.md'),'Unrelated internal ontology omitted');
    ok(!index.sourceAcquisition.hasSemanticDependencies(),'Independent URL graph never authorizes global source writes');return true;
  }finally{o.close();}
})()`));


test('Eager foreground notes use local demand and apply edits before unrelated inventory closes', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-eager-foreground',{indexingMode:'eager'});const{f,index}=o;let release;
  try{
    f.add('A.md','');f.add('B.md','');for(let n=0;n<100;n++)f.add('Unrelated'+n+'.md','');
    await index.initializeOnDemandBaseline();release=index.acquireSemanticDemand('A.md');await settleDemand(index);
    equal(o.inventoryStarts,0,'Foreground demand does not flush unrelated inventory');
    f.texts.set('A.md','Child:: [[B]]');f.files.get('A.md').stat.mtime++;o.bump();
    index.refreshVisibleHostMetadataPreviews('A.md');await index.refreshVisibleMarkdownPath('A.md');await settleDemand(index);
    ok(index.getNeighborhood('A.md').children.some(x=>x.page.path==='B.md'),'Saved body edit appears while global authority is unavailable');
    equal(index.isOnDemandMode(),false,'Explicit saved Eager strategy preserved');return true;
  }finally{release?.();o.close();}
})()`));

test('URL cache survives metadata absence and updates on current frontmatter without rereading bodies', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-url-cached-properties');const{f,index}=o;let next;
  try{
    f.add('Only.md','',{Parent:'https://Obsidian.md'});await index.startBackgroundUrlIndex();index.destroy();
    const cache=f.metadata.get('Only.md');f.metadata.delete('Only.md');
    next=new sourceModules.GraphIndex({app:f.app,settings:o.settings,getIndexSourceRevision:()=>0},f.app);
    await next.restoreUrlIndex();ok(next.get('https://obsidian.md'),'FM-only URL survives missing host metadata');
    equal(next.gateStats(next.get('https://obsidian.md')).bottom.visibleCount,1,'Cached explicit parent incidence retained');
    equal(next.gateStats(next.get('https://obsidian.md')).bottom.coverage,'cached','Cached host property proof is explicit');
    f.metadata.set('Only.md',cache);next.refreshVisibleHostMetadataPreviews('Only.md');await next.urlOwnerTasks.get('Only.md');
    equal(next.getUrlIndexProgress().reads,0,'Native metadata reconciliation performs no body read');
    ok(next.getNeighborhood('https://obsidian.md').children.some(x=>x.page.path==='Only.md'),'Current ontology incidence retained');return true;
  }finally{next?.destroy();o.close();}
})()`));


test('cold URL demand stays central and progresses as body owners are discovered', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-url-progressive');const{f,index}=o;let release,unblock;
  try{
    for(let n=0;n<8;n++)f.add('Owner'+n+'.md','https://Obsidian.md');
    await index.initializeOnDemandBaseline();let entered;const held=new Promise(r=>entered=r),hold=new Promise(r=>unblock=r);
    const read=f.app.vault.cachedRead;f.app.vault.cachedRead=async file=>{if(file.path==='Owner6.md'){entered();await hold;}return read(file);};
    release=index.acquireSemanticDemand('https://Obsidian.md');await held;
    await index.urlPublicationLane;
    ok(index.get('https://Obsidian.md'),'Cold URL remains requested center');
    ok(index.getNeighborhood('https://Obsidian.md').parents.length>0,'Known referrers display before final discovery');
    ok(!index.getUrlIndexProgress().complete,'Partial discovery truthful');ok(!index.hasUnavailableLocalCounts(),'URL absence is not unavailable host metadata');
    unblock();await index.urlBackgroundTask;equal(index.gateStats(index.get('https://obsidian.md')).top.visibleCount,8,'Final refs complete');return true;
  }finally{unblock?.();release?.();o.close();}
})()`));

test('current URL removal replaces stale cached edges and previously queried count proofs', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-url-negative',{indexingMode:'eager'});const{f,index}=o;
  try{
    const a=f.add('A.md','https://obsidian.md');await index.initializeOnDemandBaseline();
    index.gateStats(index.get('A.md'));while(index.onDemandGateTasks.size)await Promise.all([...index.onDemandGateTasks.values()]);
    equal(index.gateStats(index.get('A.md')).bottom.visibleCount,0,'Old zero count cover');
    await index.startBackgroundUrlIndex();
    while(index.onDemandGateTasks.size)await Promise.all([...index.onDemandGateTasks.values()]);
    equal(index.gateStats(index.get('A.md')).bottom.visibleCount,1,'Independent URL discovery invalidates old proof');
    await index.patchMarkdownPaths(['A.md'],{useDurableCache:true});
    ok(index.state.pages.get('A.md').neighbours.has('https://obsidian.md'),'Broader old graph contains URL edge');
    f.texts.set('A.md','');a.stat.mtime++;await index.refreshUrlOwner('A.md');
    ok(!index.getNeighborhood('A.md').children.some(x=>x.page.url),'Current URL negative replaces stale cached body edge');
    equal(index.getNeighborhood('https://Obsidian.md').parents.length,0,'URL center drops stale referrer');
    ok(!index.search('obsidian.md',10).some(x=>x.url),'Retired URL absent from search');return true;
  }finally{o.close();}
})()`));


test('labeled repeated property URLs retain genuine provenance through metadata-free cache reopen', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-url-property-roundtrip');const{f,index}=o;let next;
  try{
    const raw='[Obsidian home](https://Obsidian.md/slug)';
    f.add('Only.md','',{Child:[raw,raw]});await index.startBackgroundUrlIndex();
    const before=index.evidenceBetween('Only.md','https://obsidian.md/slug');
    const lexical=JSON.stringify([raw,raw]);
    ok(before.some(x=>x.rawValue===lexical),'Original labeled repeated property payload preserved');
    const count=before.filter(x=>x.sourceKind==='frontmatter-ontology').length;
    equal(count,1,'Shared grammar deduplicates targets within one physical property value');index.destroy();f.metadata.delete('Only.md');
    next=new sourceModules.GraphIndex({app:f.app,settings:o.settings,getIndexSourceRevision:()=>0},f.app);
    await next.restoreUrlIndex();const restored=next.evidenceBetween('Only.md','https://Obsidian.md/slug');
    equal(restored.filter(x=>x.sourceKind==='frontmatter-ontology').length,count,'Cached multiplicity preserved');
    ok(restored.some(x=>x.rawValue===lexical),'Cached lexical provenance preserves repeated values, labels and target spelling');
    equal(next.getUrlIndexProgress().reads,0,'No body reread for physically unchanged property owner');return true;
  }finally{next?.destroy();o.close();}
})()`));

test('ordinary same-stat commit fences a held old URL cache restore without a duplicate URL read', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v3-url-held-restore',{indexingMode:'eager'});const{f,index}=o;let next,unblock;
  try{
    f.add('A.md','https://old.example');await index.startBackgroundUrlIndex();index.destroy();
    next=new sourceModules.GraphIndex({app:f.app,settings:o.settings,getIndexSourceRevision:()=>0},f.app);
    let entered;const held=new Promise(r=>entered=r),hold=new Promise(r=>unblock=r),read=next.indexedDb.readUrlOwners.bind(next.indexedDb);
    next.indexedDb.readUrlOwners=(consume,current)=>read(async rows=>{entered();await hold;await consume(rows);},current);
    const restore=next.restoreUrlIndex();await held;await next.initializeOnDemandBaseline();f.texts.set('A.md','https://new.example');
    equal((await next.patchMarkdownPaths(['A.md'])).outcome,'patched','Current canonical owner committed');
    unblock();await restore;ok(!next.semanticRelationSource(next.get('A.md')).page.neighbours.has('https://old.example'),'Late old URL cache cannot replace current same-stat owner');
    ok(next.getNeighborhood('A.md').children.some(x=>x.page.path==='https://new.example'),'Committed URL remains visible');
    equal(next.getUrlIndexProgress().reads,0,'Empty private lifetime does not duplicate canonical acquired read');return true;
  }finally{unblock?.();next?.destroy();o.close();}
})()`));

test('known same-object property edit refreshes URL incidence without body rereads', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v3-url-inplace-property');const{f,index}=o;let unblock;
  try{
    f.add('Only.md','',{Child:'https://obsidian.md/old'});await index.startBackgroundUrlIndex();
    const reads=index.getUrlIndexProgress().reads,cache=f.metadata.get('Only.md');
    const hold=new Promise(r=>unblock=r);index.urlPublicationLane=index.urlPublicationLane.then(()=>hold);
    cache.frontmatter.Child='[New site](https://obsidian.md/new)';o.bump();index.refreshVisibleHostMetadataPreviews('Only.md',0);
    ok(!index.getUrlIndexProgress().complete,'Known changed property retires complete URL negative proof immediately');
    unblock();await index.urlOwnerTasks.get('Only.md');
    ok(index.getUrlIndexProgress().complete,'Current replacement closes discovery after publication');
    ok(!index.getNeighborhood('Only.md').children.some(x=>x.page.path==='https://obsidian.md/old'),'Old property incidence retired');
    ok(index.getNeighborhood('https://obsidian.md/new').parents.some(x=>x.page.path==='Only.md'),'Current in-place property discovered');
    equal(index.getUrlIndexProgress().reads,reads,'Compact current body reused');return true;
  }finally{unblock?.();o.close();}
})()`));

test('mixed nested URL property payloads and shared YAML values preserve full lexical provenance on warm reopen', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v3-url-mixed-property');const{f,index}=o;let next;
  try{
    const raw='[Obsidian home](https://Obsidian.md/slug)',shared={label:raw,internal:'[[Unrelated]]',flag:true,number:2};
    const mixed=['plain',shared,null,shared,['nested',raw]],properties={Description:'nonURL first',Child:mixed,Unrelated:'private unrelated property'};
    f.add('Only.md','',properties);await index.startBackgroundUrlIndex();
    const lexical=JSON.stringify(mixed),before=index.evidenceBetween('Only.md','https://obsidian.md/slug');
    ok(before.some(x=>x.sourceKind==='frontmatter-ontology'&&x.rawValue===lexical&&x.fieldName==='Child'),'Whole mixed field lexical payload and genuine field retained');
    const rows=[];await index.indexedDb.readUrlOwners(async records=>{rows.push(...records);},()=>true);
    const row=rows.find(r=>r.path==='Only.md');equal(JSON.stringify(row.frontmatter.Child),lexical,'Cache retains nested shape, internal members and repeated values');
    ok(!('Description'in row.frontmatter)&&!('Unrelated'in row.frontmatter),'Unrelated fields omitted');
    index.destroy();f.metadata.delete('Only.md');next=new sourceModules.GraphIndex({app:f.app,settings:o.settings,getIndexSourceRevision:()=>0},f.app);
    await next.restoreUrlIndex();const restored=next.evidenceBetween('Only.md','https://obsidian.md/slug');
    equal(restored.map(x=>[x.sourceKind,x.fieldName,x.rawValue]),before.map(x=>[x.sourceKind,x.fieldName,x.rawValue]),'Cold and cached provenance exact');
    equal(next.getUrlIndexProgress().reads,0,'Unchanged nested property owner never rereads body');return true;
  }finally{next?.destroy();o.close();}
})()`));

test('equal-stat edit during awaited URL cache write cannot persist stale facts on warm restart', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-url-cache-write-race');const{f,index}=o;let next,unblock;
  try{
    f.add('A.md','https://obsidian.md');let entered;const held=new Promise(r=>entered=r),hold=new Promise(r=>unblock=r);
    const put=index.indexedDb.putUrlOwners.bind(index.indexedDb);let first=true;
    index.indexedDb.putUrlOwners=async records=>{if(first){first=false;entered();await hold;}return put(records);};
    const scan=index.startBackgroundUrlIndex();await held;f.texts.set('A.md','');void index.refreshUrlOwner('A.md');unblock();await scan;
    while(index.urlOwnerTasks.size)await Promise.all([...index.urlOwnerTasks.values()]);
    ok(!index.getNeighborhood('https://obsidian.md')?.parents.length,'Live superseded URL incidence retires');index.destroy();
    next=new sourceModules.GraphIndex({app:f.app,settings:o.settings,getIndexSourceRevision:()=>0},f.app);
    await next.startBackgroundUrlIndex();ok(!next.get('https://obsidian.md'),'Stale equal-stat URL cache cannot resurrect on warm reopen');
    equal(next.getUrlIndexProgress().reads,0,'Replacement zero-URL owner remains reusable');return true;
  }finally{unblock?.();next?.destroy();o.close();}
})()`));


test('independent URL policy replay uses cached facts and current ontology without native rereads', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-url-policy');const{f,index}=o;
  try{
    f.add('Only.md','',{Child:'https://obsidian.md/slug'});await index.startBackgroundUrlIndex();
    ok(index.getNeighborhood('https://obsidian.md/slug').parents.some(x=>x.page.path==='Only.md'),'Original child property');
    const reads=index.getUrlIndexProgress().reads;
    o.settings.hierarchy.children=[];o.settings.hierarchy.parents.push('Child');index.invalidateSemanticPolicy();
    await index.refreshSemanticSettings();await index.urlPublicationLane;
    ok(index.getNeighborhood('https://obsidian.md/slug').children.some(x=>x.page.path==='Only.md'),'Current parent property replaces old role');
    ok(!index.getNeighborhood('https://obsidian.md/slug').parents.some(x=>x.page.path==='Only.md'),'Old ontology incidence retired');
    equal(index.getUrlIndexProgress().reads,reads,'Policy replay does not read Markdown');ok(!index.getUrlIndexProgress().active,'Recompiled lane settles truthfully');return true;
  }finally{o.close();}
})()`));


test('dense URL cache restoration pages obey byte and count admission and consume outside transactions', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-url-dense-pages');const{index}=o;
  try{
    const projection='https://obsidian.md/'+ 'x'.repeat(300000);
    const owners=[];for(let n=0;n<5;n++)owners.push({path:'Dense'+n+'.md',mtime:1,size:1,urls:[],inlineFieldOccurrences:[],frontmatter:{Child:projection}});
    owners.push({path:'Huge.md',mtime:1,size:1,urls:[],inlineFieldOccurrences:[],frontmatter:{Child:projection.repeat(5)}});
    ok(await index.indexedDb.putUrlOwners(owners),'Dense cache seeded');
    let pageCount=0,total=0,hugeAlone=false;
    ok(await index.indexedDb.readUrlOwners(async records=>{
      pageCount++;total+=records.length;
      const chars=records.reduce((n,r)=>n+JSON.stringify(r).length,0);
      ok(records.length<=64,'Count admission retained');
      ok(chars*2<=2097152 || records.length===1,'Byte admission retained; one oversized owner alone');
      if(records.some(r=>r.path==='Huge.md'))hugeAlone=records.length===1;
      const db=await index.indexedDb.open();
      await new Promise((resolve,reject)=>{const tx=db.transaction('urlOwners','readwrite');tx.objectStore('urlOwners').get('Dense0.md');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
    },()=>true),'Cursor restoration completes');
    equal(total,6,'No page-boundary loss or duplicates');ok(pageCount>=3,'Dense owners span bounded pages');ok(hugeAlone,'Oversized owner delivered alone');return true;
  }finally{o.close();}
})()`));


test('unload releases queued URL readers without starting reads behind a hung native operation', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-url-queued-unload');const{f,index}=o;let unblock;
  try{
    for(let n=0;n<7;n++)f.add('Owner'+n+'.md','https://obsidian.md');
    let admitted=0,entered;const full=new Promise(r=>entered=r),hold=new Promise(r=>unblock=r);
    const read=f.app.vault.cachedRead;f.app.vault.cachedRead=async file=>{admitted++;if(admitted===6)entered();await hold;return read(file);};
    const tasks=[...f.files.keys()].map(path=>index.refreshUrlOwner(path));await full;
    equal(index.urlReadWaiters.length,1,'Seventh owner queued');index.destroy();await tasks[6];
    equal(admitted,6,'Unload does not admit another native read');equal(index.urlReadWaiters.length,0,'Queue released while active reads remain held');
    unblock();await Promise.all(tasks);equal(index.urlReadActive,0,'Admission accounting settles');equal(index.urlReadBytes,0,'Byte reservations released');return true;
  }finally{unblock?.();o.close();}
})()`));

test('URL cache writer rechecks owner fence after delayed open and cannot resurrect stale facts after unload', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-url-open-fence');const{f,index}=o;let next,unblock;
  try{
    f.add('A.md','');const cache=index.indexedDb;let current=true,entered;
    const record={path:'A.md',mtime:1,size:0,urls:[{url:'https://obsidian.md'}],inlineFieldOccurrences:[],frontmatter:{}};
    const db=await cache.open(),open=cache.open.bind(cache),held=new Promise(r=>entered=r),hold=new Promise(r=>unblock=r);let first=true;
    cache.open=async()=>{if(first){first=false;entered();await hold;return db;}return open();};
    const write=cache.putUrlOwners([record],()=>current);await held;current=false;await cache.deleteUrlOwner('A.md');index.destroy();unblock();
    equal(await write,false,'Delayed writer refuses a retired owner before transaction admission');
    next=new sourceModules.GraphIndex({app:f.app,settings:o.settings,getIndexSourceRevision:()=>0},f.app);
    await next.restoreUrlIndex();ok(!next.get('https://obsidian.md'),'Reopen cannot resurrect a stale equal-stat owner');return true;
  }finally{unblock?.();next?.destroy();o.close();}
})()`));


test('canonical URL identity survives independent progressive discovery in Eager and On demand', async()=>scenario(`(async()=>{
  for(const mode of ['eager','on-demand']){
    const o=await onDemandFixture('v2-url-public-identity-'+mode,{indexingMode:mode});const{f,index}=o;let unblock,release;
    try{
      const a=f.add('A.md','[Original](https://Obsidian.md/slug)');f.add('B.md','https://obsidian.md/slug');f.add('C.md','https://obsidian.md/slug');
      await index.initializeOnDemandBaseline();await index.patchMarkdownPaths(['A.md'],{useDurableCache:true});
      const path='https://obsidian.md/slug',canonical=index.state.pages.get(path);
      ok(index.get('https://Obsidian.md/slug')===canonical,'Public get preserves main graph canonical identity');
      let entered;const held=new Promise(r=>entered=r),hold=new Promise(r=>unblock=r),read=f.app.vault.cachedRead;
      f.app.vault.cachedRead=async file=>{if(file.path==='B.md'){entered();await hold;}return read(file);};
      const scan=index.startBackgroundUrlIndex();await held;await index.urlOwnerTasks.get('C.md');await index.urlPublicationLane;
      // Background discovery is now displayed in stable batches. Explicit navigation exposes
      // the freshest available batch while retaining the original canonical identity assertions.
      release=index.acquireSemanticDemand(path);
      ok(index.get(path)===canonical,'Discovery never replaces public identity');
      ok(index.semanticRelationSource(index.get(path)).page.neighbours.has('C.md'),'Public semantic URL incidence updates progressively');
      ok(index.getNeighborhood(path).parents.some(x=>x.page.path==='C.md'),'Semantic projection also progresses');
      unblock();await scan;
      ok(index.allPages().find(p=>p.path===path)===canonical,'Enumeration preserves same identity');
      ok(index.search('Original',10).find(p=>p.path===path)===canonical,'URL alias search returns public identity');
      for(const page of index.state.pages.values())for(const relation of page.neighbours.values())
        ok(relation.target===index.get(relation.target.path),'Core published relation target remains canonical');
      f.texts.set('A.md','');a.stat.mtime++;await index.refreshUrlOwner('A.md');
      ok(!index.semanticRelationSource(index.get(path)).page.neighbours.has('A.md'),'URL semantic incidence drops a stale owner');
      ok(!index.getNeighborhood('A.md').children.some(x=>x.page.path===path),'Note projection drops stale cached incidence');
    }finally{unblock?.();release?.();o.close();}
  }
  return true;
})()`));

test('settled URL owner deletion closes progress and reports pending retirement truthfully', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-url-delete-progress');const{f,index}=o;let unblock;
  try{
    f.add('A.md','https://obsidian.md');f.add('B.md','https://obsidian.md');await index.startBackgroundUrlIndex();
    const hold=new Promise(r=>unblock=r);index.urlPublicationLane=index.urlPublicationLane.then(()=>hold);
    f.files.delete('B.md');const retirement=index.refreshUrlOwner('B.md');
    ok(index.getUrlIndexProgress().active,'Pending deletion is active work');ok(!index.getUrlIndexProgress().complete,'Deletion awaits current publication');
    unblock();await retirement;
    ok(index.getUrlIndexProgress().complete,'Surviving current URL owners close discovery');ok(!index.getUrlIndexProgress().active,'No forever-active settled deletion');
    equal(index.gateStats(index.get('https://obsidian.md')).top.visibleCount,1,'Only surviving referrer counted');return true;
  }finally{unblock?.();o.close();}
})()`));


test('ordinary source publication retires stale URL closure and reuses its acquired body', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-url-ordinary-publication',{indexingMode:'eager'});const{f,index}=o;let unblock;
  try{
    const a=f.add('A.md','https://old.example/slug');f.add('B.md','https://old.example/slug');
    await index.initializeOnDemandBaseline();await index.patchMarkdownPaths(['A.md'],{useDurableCache:true});await index.startBackgroundUrlIndex();
    ok(index.getUrlIndexProgress().complete,'Initial private discovery is closed');const reads=index.getUrlIndexProgress().reads;
    let committed;const atCommit=new Promise(r=>committed=r),hold=new Promise(r=>unblock=r);
    index.urlPublicationLane=index.urlPublicationLane.then(()=>hold);
    const publish=index.publishIncrementalFile;index.publishIncrementalFile=(commit,swap)=>{publish(commit,swap);committed();};
    f.texts.set('A.md','https://repeat.example/path');a.stat.mtime++;
    const patch=index.withForegroundPriority(()=>index.patchMarkdownPaths(['A.md']),2);await atCommit;
    ok(!index.getUrlIndexProgress().complete,'Ordinary publication invalidates the stale global URL closure synchronously');
    equal(index.evidenceBetween('https://repeat.example','https://repeat.example/path').filter(e=>e.sourceKind==='url-origin').length,1,'New full-source origin evidence remains visible before private repair');
    ok(!index.getNeighborhood('A.md').children.some(x=>x.page.path==='https://old.example/slug'),'Retired private source incidence cannot reappear');
    ok(index.getNeighborhood('https://old.example/slug').parents.some(x=>x.page.path==='B.md'),'Still-current shared owner remains visible');
    equal((await Promise.race([patch,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Foreground patch waited for lower-priority URL repair')),1500))])).outcome,'patched','Foreground patch completes while lower-priority URL publication remains held');
    ok(!index.getUrlIndexProgress().complete,'Independent repair is still truthfully pending');
    unblock();await index.urlOwnerTasks.get('A.md');
    equal(index.getUrlIndexProgress().reads,reads,'Repair reuses the body already acquired by the source publisher');
    ok(index.getUrlIndexProgress().complete,'URL closure settles after the committed owner repair');
    equal(index.evidenceBetween('https://repeat.example','https://repeat.example/path').filter(e=>e.sourceKind==='url-origin').length,1,'Canonical derived evidence remains idempotent');
    const retireHold=new Promise(r=>unblock=r);index.urlPublicationLane=index.urlPublicationLane.then(()=>retireHold);
    f.texts.set('A.md','');a.stat.mtime++;
    equal((await index.withForegroundPriority(()=>index.patchMarkdownPaths(['A.md']),2)).outcome,'patched','Final owner retirement also stays foreground-safe');
    ok(!index.get('https://repeat.example/path')&&!index.get('https://repeat.example'),'Unsupported private URL and origin disappear before asynchronous retirement');
    ok(!index.search('repeat.example').some(p=>p.url),'Unsupported private URL search entries disappear immediately');
    unblock();await index.urlOwnerTasks.get('A.md');ok(index.getUrlIndexProgress().complete,'Retirement repair settles');return true;
  }finally{unblock?.();o.close();}
})()`));


test('fully current Eager URL discovery avoids local count tokens while partial Eager retains them', async()=>scenario(`(async()=>{
  for(const full of [true,false]){
    const o=await onDemandFixture('v2-url-eager-tokens-'+full,{indexingMode:'eager'});const{f,index}=o;
    try{
      f.add('A.md','https://obsidian.md');const b=f.add('B.md','');
      if(full){delete index.sourceAcquisition.enableInventory;ok(await index.rebuild(),'Real complete graph publishes');ok(!index.usesLocalForeground(),'Complete Eager uses full graph');}
      else{await index.initializeOnDemandBaseline();ok(index.usesLocalForeground(),'Partial Eager uses local proofs');}
      await index.startBackgroundUrlIndex();equal(index.gateStats(index.get('https://obsidian.md')).top.visibleCount,1,'Initial URL count');
      if(full)equal(index.onDemandGateRevisions.size,0,'Full Eager discovery allocates no local tokens');else ok(index.onDemandGateRevisions.size>0,'Partial Eager discovery invalidates local proofs');
      f.texts.set('B.md','https://obsidian.md');b.stat.mtime++;await index.refreshUrlOwner('B.md');
      equal(index.gateStats(index.get('https://obsidian.md')).top.visibleCount,2,'Independent URL updates invalidate current counts in either strategy');
      if(full)equal(index.onDemandGateRevisions.size,0,'Full Eager update still allocates no local tokens');else ok(index.onDemandGateRevisions.has('B.md'),'Partial Eager owner has a revision token');
    }finally{o.close();}
  }
  return true;
})()`));

test('dense active URL alias preparation remains cooperative and cancels privately', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-url-dense-aliases',{indexingMode:'eager'});const{f,index}=o;
  try{
    delete index.sourceAcquisition.enableInventory;const a=f.add('A.md','');ok(await index.rebuild(),'Complete Eager graph');await index.startBackgroundUrlIndex();
    const dense=Array.from({length:10000},(_,n)=>'https://perf-'+n+'.example/path/'+n).join('\\n');
    f.texts.set('A.md',dense);a.stat.mtime++;a.stat.size=dense.length;
    index.fieldCache.set('A.md',{mtime:a.stat.mtime,body:sourceModules.parseBodyMetadata(dense)});
    let previous=performance.now(),gap=0;const timer=setInterval(()=>{const now=performance.now();gap=Math.max(gap,now-previous);previous=now;},1);
    try{equal((await index.patchMarkdownPaths(['A.md'])).outcome,'patched','Dense ordinary patch publishes');}finally{clearInterval(timer);}
    ok(gap<50,'Dense source patch with active private URL lane preserves 50ms timer bound: '+gap.toFixed(1));
    equal(index.onDemandGateRevisions.size,0,'Complete Eager retains no per-URL local count tokens');
    await index.urlOwnerTasks.get('A.md');equal(index.gateStats(index.get('A.md')).bottom.visibleCount,10000,'All URL relations remain available');
    const before=index.urlAliasOwners.size;let current=true;const cancellation=setTimeout(()=>{current=false;},0);
    const prepared=await index.prepareUrlAliasOwners('Cancelled.md',Array.from({length:10000},(_,n)=>({url:'https://cancel-'+n+'.example',label:'Label '+n})),()=>current);clearTimeout(cancellation);
    equal(prepared,null,'Cancellation retires private alias staging at a released slice');equal(index.urlAliasOwners.size,before,'Cancelled alias preparation publishes nothing');return true;
  }finally{o.close();}
})()`));

test('parent-only folder rename transfers current URL owners and cached property facts without rereads', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-url-folder-rename',{indexingMode:'eager'});const{f,index}=o;let next;
  try{
    delete index.sourceAcquisition.enableInventory;const root=f.app.vault.getRoot(),folder=new ContributorFolder();folder.path='Old';folder.name='Old';folder.parent=root;
    const file=f.add('Old/A.md','https://obsidian.md',{Website:'[Property site](https://property.example/path)'});file.parent=folder;folder.children=[file];root.children=[folder];
    const folders=new Map([['Old',folder]]);f.app.vault.getRoot=()=>root;f.app.vault.getFolderByPath=path=>path==='/'||path===''?root:folders.get(path)??null;
    f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??folders.get(path)??(path==='/'?root:null);
    ok(await index.rebuild(),'Known folder tree publishes');await index.startBackgroundUrlIndex();const reads=index.getUrlIndexProgress().reads;
    const text=f.texts.get(file.path);f.files.delete(file.path);f.texts.delete(file.path);f.metadata.delete(file.path);folders.delete('Old');
    folder.path='New';folder.name='New';folders.set('New',folder);file.path='New/A.md';f.files.set(file.path,file);f.texts.set(file.path,text);
    await index.withForegroundPriority(()=>index.renameFolder('Old',folder),2);
    while(index.urlOwnerTasks.size)await Promise.all([...index.urlOwnerTasks.values()]);await index.urlPublicationLane;
    equal(index.getUrlIndexProgress().reads,reads,'Known subtree move reuses acquired URL bodies');
    ok(!index.urlOwners.has('Old/A.md')&&index.urlOwners.has('New/A.md'),'URL owner keys move after parent-only event');
    equal(index.getNeighborhood('https://obsidian.md').parents.map(x=>x.page.path),['New/A.md'],'Body URL referrer follows moved path');
    equal(index.getNeighborhood('https://property.example/path').parents.filter(x=>!x.page.url).map(x=>x.page.path),['New/A.md'],'Cached property URL survives missing post-move metadata');
    ok(index.getUrlIndexProgress().complete&&!index.getUrlIndexProgress().active,'Moved ownership settles discovery');
    const records=[];await index.indexedDb.readUrlOwners(page=>{records.push(...page);return Promise.resolve();},()=>true);
    ok(!records.some(r=>r.path==='Old/A.md')&&records.some(r=>r.path==='New/A.md'&&r.frontmatter.Website.includes('Property site')),'Separate durable cache retires old path and preserves original property declaration');
    index.destroy();next=new sourceModules.GraphIndex({app:f.app,settings:{...o.settings,indexingMode:'on-demand'},getIndexSourceRevision:()=>0},f.app);
    await next.restoreUrlIndex();equal(next.getNeighborhood('https://property.example/path').parents.filter(x=>!x.page.url).map(x=>x.page.path),['New/A.md'],'Warm URL restore retains moved cached property incidence');return true;
  }finally{next?.destroy();o.close();}
})()`));


test('partial Eager hands over to genuine ready source scopes and retires late local owners', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-eager-source-handover',{indexingMode:'eager'});const{f,index}=o;let release,unblock;
  try{
    delete index.sourceAcquisition.enableInventory;index.plugin.startupDiagnostics.processed=()=>{};f.add('A.md','Child:: [[B]]');f.add('B.md','');f.app.metadataCache.resolvedLinks={'A.md':{'B.md':1}};
    await index.initializeOnDemandBaseline();ok(index.usesLocalForeground(),'Missing source authority uses local foreground');
    let entered;const reached=new Promise(r=>entered=r),hold=new Promise(r=>unblock=r),host=index.publishOnDemandHostScope.bind(index);let first=true;
    index.publishOnDemandHostScope=async(...args)=>{if(first){first=false;entered();await hold;}return host(...args);};
    release=index.acquireSemanticDemand('A.md');await reached;const reads=f.reads.length;
    await f.acquire();ok(await index.sourceAcquisition.reconcile(),'Real native inventory and authenticated source closure complete');
    ok(index.sourceAcquisition.hasSemanticDependencies(),'Actual durable authority ready');ok(!index.fullSnapshotFresh,'No fabricated whole-graph freshness');
    ok(!index.usesLocalForeground(),'Ready Eager uses the existing finite source owner');await index.ensureSemanticScope('A.md');
    const canonical=index.get('A.md');ok(index.semanticScopes.get('A.md')?.completePaths.has('A.md'),'Ready finite center proof published');
    ok(index.getNeighborhood('A.md').children.some(x=>x.page.path==='B.md'),'Ready body ontology preserved');
    unblock();await settleDemand(index);ok(index.get('A.md')===canonical,'Late local owner cannot replace ready source publication');
    equal(index.onDemandHostScopes.size,0,'No stale local evidence overlay');equal(f.reads.length,reads,'Handover performs no native body reads');
    equal(index.onDemandGateTasks.size,0,'No local supplement remains after ready handover');index.gateStats(index.get('B.md'));
    equal(index.onDemandGateTasks.size,0,'Source-ready Eager neighbor gates use finite source proof without local supplements');
    equal(f.reads.length,reads,'Ready neighbor gate query performs no native body reads');
    ok(!index.hasPendingSemanticPreparation(),'No stale local pending owner remains');return true;
  }finally{unblock?.();release?.();o.close();}
})()`));


test('displayed URL projection batches 300 owners and survives unrelated renders until controlled flush', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('stable-url-300',{maxItemCount:300});const{f,index}=o;let release,unblockFirst,unblockLast;
  const timeout=window.setTimeout,clear=window.clearTimeout;let flush=null,flushId=987654;
  window.setTimeout=(callback,delay,...args)=>delay===5000?(flush=()=>callback(...args),flushId):timeout(callback,delay,...args);
  window.clearTimeout=id=>id===flushId?(flush=null):clear(id);
  try{
    for(let n=0;n<300;n++)f.add('Owner'+n+'.md','https://stable.example');
    await index.initializeOnDemandBaseline();let first,last;
    const firstReached=new Promise(r=>first=r),firstHeld=new Promise(r=>unblockFirst=r);
    const lastReached=new Promise(r=>last=r),lastHeld=new Promise(r=>unblockLast=r);
    const publish=index.publishUrlOwner.bind(index);let processed=0;
    index.publishUrlOwner=async(...args)=>{await publish(...args);processed++;if(processed===1){first();await firstHeld;}if(processed===299){last();await lastHeld;}};
    release=index.acquireSemanticDemand('https://stable.example');await firstReached;
    equal(index.getNeighborhood('https://stable.example').parents.length,1,'First useful requested URL result publishes promptly');
    unblockFirst();await lastReached;
    equal(index.urlState.pages.get('https://stable.example').neighbours.size,299,'Working acquisition progresses internally');
    index.notifyPresentation();index.relationViewCache=new WeakMap();
    equal(index.getNeighborhood('https://stable.example').parents.length,1,'Unrelated render and cache miss cannot leak intermediate URL owners');
    ok(flush,'A five-second maximum window is scheduled');flush();
    equal(index.getNeighborhood('https://stable.example').parents.length,299,'Controlled window exposes one coherent batch');
    unblockLast();ok(await index.urlBackgroundTask,'Discovery completes');
    equal(index.gateStats(index.get('https://stable.example')).top.visibleCount,300,'Completion flushes the final owner immediately');
    equal(index.evidenceBetween('Owner299.md','https://stable.example').length,1,'Final provenance retained');
    ok(index.getUrlPublicationDiagnostics().flushes<=4,'Hundreds of owners produce only bounded visible flushes');
    equal(index.getUrlPublicationDiagnostics().pendingPaths,0,'Final batch drained');return true;
  }finally{window.setTimeout=timeout;window.clearTimeout=clear;unblockFirst?.();unblockLast?.();release?.();o.close();}
})()`));

test('Eager retains coherent local incidence while durable handover publication is held', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('stable-eager-handover',{indexingMode:'eager'});const{f,index}=o;let release,unblock;
  try{
    delete index.sourceAcquisition.enableInventory;index.plugin.startupDiagnostics.processed=()=>{};
    f.add('A.md','Child:: [[B]]');f.add('B.md','');f.app.metadataCache.resolvedLinks={'A.md':{'B.md':1}};
    await index.initializeOnDemandBaseline();release=index.acquireSemanticDemand('A.md');await settleDemand(index);
    equal(index.getNeighborhood('A.md').children.map(x=>x.page.path),['B.md'],'Coherent local graph already visible');
    let entered;const reached=new Promise(r=>entered=r),hold=new Promise(r=>unblock=r),prepare=index.prepareSemanticScope.bind(index);
    index.prepareSemanticScope=async(...args)=>{entered();await hold;return prepare(...args);};
    await f.acquire();const reconcile=index.sourceAcquisition.reconcile();await reached;
    ok(index.sourceAcquisition.hasSemanticDependencies(),'Real durable source authority closes before its paused P4 tail');
    const catalog=await new sourceModules.GraphBuilder(index.plugin,f.app,index.fieldCache,index.metadataParser,index.indexedDb,()=>true,new Map(),index.sourceAcquisition).buildSourceNodeCatalog();
    ok(catalog,'Real source-backed node vocabulary prepared');index.publishRestoredState(catalog,null,false,false);
    ok(!index.usesLocalForeground(),'Acquisition strategy transfers to durable owner');
    for(let n=0;n<3;n++){index.notifyPresentation();equal(index.getNeighborhood('A.md').children.map(x=>x.page.path),['B.md'],'Held replacement cannot erase the coherent local predecessor');}
    ok(index.getLocalHandoverDiagnostics().retainedScopes>0,'Read-only predecessor retained while preparing');
    f.metadata.set('A.md',{...f.metadata.get('A.md')});index.refreshVisibleHostMetadataPreviews('A.md');
    equal(index.getNeighborhood('A.md').children.map(x=>x.page.path),['B.md'],'Identity-only resolve wave retains physically-current predecessor');
    unblock();await index.ensureSemanticScope('A.md');await reconcile;
    equal(index.getNeighborhood('A.md').children.map(x=>x.page.path),['B.md'],'Certified replacement switches atomically without navigation');
    equal(index.getLocalHandoverDiagnostics().retainedScopes,0,'Successful center switch retires its fallback');return true;
  }finally{unblock?.();release?.();o.close();}
})()`));


test('URL foreground replacement flushes pending growth and unload cancels its timer', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('stable-url-foreground');const{f,index}=o;let callback=null;
  const timeout=window.setTimeout,clear=window.clearTimeout;let cleared=0,events=0;
  window.setTimeout=(work,delay,...args)=>delay===5000?(callback=()=>work(...args),987655):timeout(work,delay,...args);
  window.clearTimeout=id=>id===987655?(cleared++):clear(id);
  try{
    const a=f.add('A.md','https://old.example'),b=f.add('B.md','https://batch.example');
    const body=sourceModules.parseBodyMetadata;
    await index.publishUrlOwner(a,body(f.texts.get(a.path)),0,undefined,true);
    ok(index.getUrlPublicationDiagnostics().timerPending,'Background batch timer admitted');
    await index.refreshUrlOwner('B.md',false);
    equal(index.getNeighborhood('https://batch.example').parents.map(x=>x.page.path),['B.md'],'Explicit current-source update flushes immediately');
    equal(index.getUrlPublicationDiagnostics().pendingPaths,0,'Foreground drains accumulated background growth');
    f.texts.set('A.md','https://new.example');a.stat.mtime++;await index.refreshUrlOwner('A.md');
    ok(!index.get('https://old.example'),'Foreground removal retires unsupported old URL immediately');
    equal(index.getNeighborhood('https://new.example').parents.map(x=>x.page.path),['A.md'],'Foreground new URL visible without window wait');
    const c=f.add('C.md','https://late.example');await index.publishUrlOwner(c,body(f.texts.get(c.path)),0,undefined,true);
    ok(index.getUrlPublicationDiagnostics().timerPending,'Another background window pending');
    index.subscribePresentation(()=>events++);index.destroy();const before=events;callback?.();
    equal(events,before,'Retired timer cannot publish after unload');ok(cleared>=2,'Flush and unload explicitly cancel timers');
    equal(index.getUrlPublicationDiagnostics().pendingPaths,0,'Unload releases touched owner/page sets');return true;
  }finally{window.setTimeout=timeout;window.clearTimeout=clear;o.close();}
})()`));

test('failed durable handover retains local read proof but a newer edit retires it immediately', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('stable-eager-failure',{indexingMode:'eager'});const{f,index}=o;let release;
  try{
    delete index.sourceAcquisition.enableInventory;index.plugin.startupDiagnostics.processed=()=>{};
    const a=f.add('A.md','Child:: [[B]]');f.add('B.md','');f.app.metadataCache.resolvedLinks={'A.md':{'B.md':1}};
    await index.initializeOnDemandBaseline();release=index.acquireSemanticDemand('A.md');await settleDemand(index);
    const prepare=index.sourceAcquisition.prepareRequestedNeighborhood.bind(index.sourceAcquisition);
    index.sourceAcquisition.prepareRequestedNeighborhood=async()=>({outcome:'pending',reason:'dependency-pending'});
    await f.acquire();ok(await index.sourceAcquisition.reconcile(),'Genuine source authority ready');
    index.retryDemandedSemanticScopes();await index.ensureSemanticScope('A.md');
    equal(index.getNeighborhood('A.md').children.map(x=>x.page.path),['B.md'],'Missing replacement proof retains coherent read-only incidence');
    ok(index.getLocalHandoverDiagnostics().failures>0,'Unsuccessful handover recorded without forgetting fallback');
    index.sourceAcquisition.prepareRequestedNeighborhood=prepare;
    f.texts.set('A.md','');a.stat.mtime++;a.stat.size=0;f.app.metadataCache.resolvedLinks={'A.md':{}};o.bump();
    equal((await index.patchMarkdownPaths(['A.md'])).outcome,'patched','Current physical edit commits through normal source publisher');
    ok(!index.getNeighborhood('A.md').children.some(x=>x.page.path==='B.md'),'Newer source removal is not masked by retained predecessor');
    equal(index.getLocalHandoverDiagnostics().retainedScopes,0,'Edited predecessor certificate retired');return true;
  }finally{release?.();o.close();}
})()`));


test('foreground URL repair owns P2 after P1 release while held P3 keeps P4 paused', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('stable-url-priorities');const{f,index}=o;let unblock,releaseP1,releaseP4;
  try{
    const a=f.add('A.md','https://old.example');f.add('B.md','https://inventory.example');await index.initializeOnDemandBaseline();
    let entered;const reached=new Promise(r=>entered=r),hold=new Promise(r=>unblock=r),read=f.app.vault.cachedRead;
    f.app.vault.cachedRead=async file=>{if(file.path==='B.md'){entered();await hold;}return read(file);};
    const inventory=index.startBackgroundUrlIndex();await reached;await index.urlOwnerTasks.get('A.md');
    releaseP4=index.workScheduler.begin(4);let broad=false;const broadCheckpoint=index.workScheduler.checkpoint(4).then(()=>broad=true);
    releaseP1=index.workScheduler.begin(1);f.texts.set('A.md','https://current.example');a.stat.mtime++;let completed=false;
    let stagedPriority=null;const stage=index.prepareUrlAliasOwners.bind(index);
    index.prepareUrlAliasOwners=async(...args)=>{if(args[0]==='A.md'){stagedPriority=args[3];equal(index.getWorkPriorityDiagnostics().active[2],1,'Foreground stage owns P2 only after joining predecessor');}return stage(...args);};
    const edit=index.refreshUrlOwner('A.md').then(()=>completed=true);await new Promise(r=>setTimeout(r,0));
    ok(!completed,'Current-node P1 legitimately pauses visible-source P2');ok(!broad,'P3 inventory keeps full P4 paused');
    releaseP1();releaseP1=null;await edit;equal(stagedPriority,2,'Current owner compilation uses P2');
    equal(index.getNeighborhood('https://current.example').parents.map(x=>x.page.path),['A.md'],'Foreground current incidence flushed without batch delay');
    ok(!broad,'P4 remains paused while independent P3 native read is held');unblock();await inventory;await broadCheckpoint;
    ok(broad,'P4 resumes after P3 completion');return true;
  }finally{unblock?.();releaseP1?.();releaseP4?.();o.close();}
})()`));


test('an admitted stale URL read cancels before parsing and retries the current owner at P2', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('stable-url-cancelled-inventory');const{f,index}=o;let unblock;
  try{
    const a=f.add('A.md','https://old.example');await index.initializeOnDemandBaseline();
    let entered;const reached=new Promise(r=>entered=r),hold=new Promise(r=>unblock=r),read=f.app.vault.cachedRead;
    let first=true;f.app.vault.cachedRead=async file=>{const text=await read(file);if(first){first=false;entered();await hold;}return text;};
    const inventory=index.startBackgroundUrlIndex();await reached;
    f.texts.set('A.md','https://current.example');a.stat.mtime++;a.stat.size=f.texts.get('A.md').length;
    const edit=index.refreshUrlOwner('A.md');unblock();await edit;await inventory;
    while(index.urlOwnerTasks.size)await Promise.all([...index.urlOwnerTasks.values()]);
    ok(!o.parses.includes('https://old.example'),'Retired native read never enters parser or compiler');
    equal(index.getNeighborhood('https://current.example').parents.map(x=>x.page.path),['A.md'],'Current replacement publishes urgently');
    ok(!index.get('https://old.example'),'Cancelled owner cannot leak an obsolete URL');
    equal(index.getUrlIndexProgress().complete,true,'Retry closes actual current owner coverage');
    equal(index.foregroundUrlOwners.size,0,'Settled owner releases foreground admission');return true;
  }finally{unblock?.();o.close();}
})()`));


test('partial source-backed Eager certifies only native folder top and bottom count proofs', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('stable-eager-structural-counts',{indexingMode:'eager',showFolderNodes:true});const{f}=o;
  let index=o.index,release,unblock;
  try{
    const root=f.app.vault.getRoot(),parent=new ContributorFolder(),nested=new ContributorFolder();
    parent.path='Parent';parent.name='Parent';parent.parent=root;nested.path='Parent/Nested';nested.name='Nested';nested.parent=parent;
    const a=f.add('Parent/A.md',''),b=f.add('Parent/Nested/B.md',''),c=f.add('Parent/Nested/C.md','');a.parent=parent;b.parent=nested;c.parent=nested;
    nested.children=[b,c];parent.children=[a,nested];root.children=[parent];
    const folders=new Map([['Parent',parent],['Parent/Nested',nested]]);
    f.app.vault.getRoot=()=>root;f.app.vault.getFolderByPath=path=>path==='/'||path===''?root:folders.get(path)??null;
    f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??folders.get(path)??(path==='/'||path===''?root:null);
    await f.acquire();ok(await f.acquisition.reconcile(),'Real durable neutral inventory prepared');
    delete index.sourceAcquisition.enableInventory;o.index.plugin.startupDiagnostics.processed=()=>{};
    ok(await index.rebuild(),'Real complete old-policy graph prepared');
    index.cancelPendingPersistence();ok(await index.persistIndexedDbSnapshot(index.snapshotPersistGeneration),'Real optional graph persisted');
    const settings={...o.settings,hierarchy:{...o.settings.hierarchy,rightFriends:['NewPolicy']},lastActivePath:'folder:Parent'};
    index.destroy();index=new sourceModules.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>0,startupDiagnostics:{mark:()=>{},count:()=>{},phase:()=>{},processed:()=>{}}},f.app);
    index.scheduleOrphanCleanup=()=>{};
    const hold=new Promise(r=>unblock=r);let entered;const reached=new Promise(r=>entered=r),checkpoint=index.sourceAcquisition.backgroundCheckpoint;
    index.sourceAcquisition.backgroundCheckpoint=async()=>{entered();await hold;await checkpoint?.();};
    release=index.acquireSemanticDemand('folder:Parent');
    const restore=await index.restorePersistedSnapshot(['folder:Parent']);ok(restore.restored,'Changed-policy native baseline restored');
    await reached;await settleDemand(index);
    ok(index.sourceBackedSemantics,'Actual restored old-policy cache retains source-backed strategy');
    ok(index.usesLocalForeground()&&!index.sourceAcquisition.hasSemanticDependencies(),'Local Eager remains usable during actual held inventory');
    const page=index.get('folder:Parent/Nested'),reads=f.reads.length;
    index.gateStats(page);while(index.onDemandGateTasks.size)await Promise.all([...index.onDemandGateTasks.values()]);
    const gates=index.gateStats(page);equal(gates.top.visibleCount,1,'Exact native parent total');equal(gates.bottom.visibleCount,2,'Exact native child total');
    equal(gates.top.complete,true,'Current native parent proof is numerical');equal(gates.bottom.complete,true,'Current native child proof is numerical');
    equal(gates.left.complete,false,'Count-only membership never certifies semantic friend totals');equal(gates.right.complete,false,'Count-only membership never certifies semantic challenger totals');
    equal(f.reads.length,reads,'Count-only preparation never acquires Markdown bodies');
    ok(!index.isSemanticWriteReady(page.path,b.path),'Native structural count cover cannot authorize linking');
    settings.showPageNodes=false;index.gateStats(page);
    while(index.onDemandGateTasks.size)await Promise.all([...index.onDemandGateTasks.values()]);
    const hidden=index.gateStats(page);equal(hidden.bottom.visibleCount,0,'Visibility change retires the former child-count certificate');
    equal(hidden.bottom.complete,true,'Replacement native cover certifies the new visibility policy');
    equal(hidden.left.complete,false,'Visibility refresh still cannot certify semantic totals');
    equal(f.reads.length,reads,'Visibility-specific structural repair remains body-free');
    return true;
  }finally{unblock?.();release?.();index.destroy();f.close();}
})()`));


for (const progressive of [false, true]) for(const lateEvent of [false,true]) test('complete Eager publication outranks an earlier sparse host preview ('+ (progressive ? 'progressive' : 'atomic') + (lateEvent ? ', late host event' : '') +')', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('stable-full-preview-'+${JSON.stringify(progressive)}+'-'+${JSON.stringify(lateEvent)},{indexingMode:'eager'});const{f,index}=o;let restoreBuild;
  try{
    delete index.sourceAcquisition.enableInventory;
    f.add('A.md','Child:: [[C]]',{Child:'[[B]]'});f.add('B.md','');f.add('C.md','');
    o.bump();await index.publishHostMetadataPreview('A.md');
    ok(index.hostPreviewScopes.has('A.md'),'A real sparse host preview is published before full work');
    ok(index.hostPreviewSettings.has(index.get('A.md')),'Reader initially selects the preview');
    if(${JSON.stringify(lateEvent)}){
      const method=${JSON.stringify(progressive)}?'patchMarkdownFiles':'build',proto=sourceModules.GraphBuilder.prototype;
      const build=proto[method];let changed=false;
      /** Deliver one host observation after source preparation but before presentation capture. */
      proto[method]=async function(...args){const result=await build.apply(this,args);if(!changed){changed=true;o.bump();}return result;};
      /** Restore the production builder even when a lifetime assertion fails. */
      restoreBuild=()=>{proto[method]=build;};
    }
    const built=${JSON.stringify(progressive)} ? await index.rebuildProgressively(['A.md']) : await index.rebuild();
    ok(built,'Real complete graph publishes');
    equal(index.hasCurrentCanonicalCenter('A.md'),!${JSON.stringify(lateEvent)},'Build certifies only its captured source epoch');
    if(${JSON.stringify(lateEvent)})ok(index.hostPreviewSettings.has(index.get('A.md')),'Newer host observation is not prematurely replaced');
    let acknowledged=false;const stop=index.subscribePresentation(()=>{acknowledged=index.get('A.md')===index.state.pages.get('A.md');});
    index.acknowledgeHostPresentation();stop();
    if(${JSON.stringify(lateEvent)})ok(acknowledged,'Drained current host observation publishes the reader switch');
    ok(index.hasCurrentCanonicalCenter('A.md'),'Complete source/settings observation is current');
    ok(index.get('A.md')===index.state.pages.get('A.md'),'Current complete page outranks the old sparse preview');
    equal(index.getNeighborhood('A.md').children.map(x=>x.page.path).sort(),['B.md','C.md'],'Body-only relation survives without navigation workaround');
    for(const gate of Object.values(index.gateStats(index.get('A.md'))))ok(gate.complete!==false,'Full-ready gates are numerical');
    const reads=f.reads.length;await index.publishHostMetadataPreview('A.md');
    ok(index.get('A.md')===index.state.pages.get('A.md'),'Later preview request cannot downgrade complete page');
    equal(f.reads.length,reads,'Navigation selection acquires no note body');return true;
  }finally{restoreBuild?.();o.close();}
})()`));


test('progressive full coverage retires partial relation views on retained page identities', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('stable-progressive-count-coverage',{indexingMode:'eager'});const{f,index}=o;let stop;
  try{
    delete index.sourceAcquisition.enableInventory;f.add('A.md','Child:: [[B]]');f.add('B.md','');
    await index.initializeOnDemandBaseline(['A.md']);let partial=0;
    stop=index.subscribe(()=>{const page=index.get('A.md');if(page&&index.gateStats(page).bottom.complete===false)partial++;});
    ok(await index.rebuildProgressively(['A.md']),'Real progressive compiler completes');stop();stop=null;
    ok(partial>0,'Partial coverage was actually cached before completion');
    ok(index.gateStats(index.get('A.md')).bottom.complete!==false,'Final coverage invalidates cached partial proof');
    equal(index.gateStats(index.get('A.md')).bottom.visibleCount,1,'Exact final child count');return true;
  }finally{stop?.();o.close();}
})()`));


for (const missNumber of [1,2]) test('background body miss '+missNumber+' reuses queued foreground input at native admission', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('stable-body-miss-preemption-'+${missNumber},{indexingMode:'eager'});const{f,index}=o;let unblockMiss,unblockForeground,unblockWrites,background,foreground;
  try{
    const a=f.add('A.md','');f.add('B.md','');await f.acquire();f.acquisition.close();
    a.stat.mtime++;f.texts.set('A.md','Child:: [[B]]');await index.initializeOnDemandBaseline(['A.md']);
    const source=index.sourceAcquisition,cache=index.indexedDb,read=cache.getBodies.bind(cache);let first=true,missReached,misses=0;
    const put=cache.putBodies.bind(cache),writesHold=new Promise(r=>unblockWrites=r);
    /** Keep the actual foreground write-behind optional while native source acquisition can finish. */
    cache.putBodies=async records=>{await writesHold;return put(records);};
    const missed=new Promise(r=>missReached=r),missHold=new Promise(r=>unblockMiss=r);
    /** Hold the final already-resolved P4 cache miss without changing its selected value. */
    cache.getBodies=async(...args)=>{const value=await read(...args);if(first&&args[0].some(r=>r.path===a.path&&r.mtime===a.stat.mtime)&&++misses===${missNumber}){first=false;ok(!value.has(a.path),'Actual old parsed body misses');missReached();await missHold;}return value;};
    background=index.workScheduler.run(4,()=>source.loadBody(a,()=>true,false,true));await missed;
    let foregroundReady;const prepared=new Promise(r=>foregroundReady=r),foregroundHold=new Promise(r=>unblockForeground=r);
    foreground=index.withForegroundPriority(async()=>{equal((await index.patchMarkdownPaths(['A.md'])).outcome,'patched','Actual foreground body/source publication completes');foregroundReady();await foregroundHold;},2);
    await prepared;equal(f.reads,['A.md'],'Foreground reads once');
    unblockMiss();const until=Date.now()+3000;while(index.workScheduler.diagnostics().waiting===0&&Date.now()<until)await new Promise(r=>window.setTimeout(r,5));
    ok(index.workScheduler.diagnostics().waiting>0,'Background continuation actually yields to retained foreground owner');
    equal(f.reads,['A.md'],'No second native read while P2 owns the source');
    unblockForeground();await foreground;const body=await background;ok(body,'Current foreground-acquired body reused');
    equal(body.inlineFields,index.fieldCache.get('A.md').body.inlineFields,'Exact current parsed values preserved');
    equal(f.reads,['A.md'],'No second native read after foreground release');
    equal(index.getSourceAcquisitionCounters().vaultReads,0,'Background native miss avoided');
    equal(index.getSourceAcquisitionCounters().parses,0,'Background reparsing avoided');
    equal(index.workScheduler.diagnostics().active,[0,0,0,0,0],'Both priority owners drain');return true;
  }finally{unblockMiss?.();unblockForeground?.();unblockWrites?.();await Promise.allSettled([foreground,background].filter(Boolean));o.close();}
})()`));

test('high-degree URL read composition is reused across roles and gates while inventory remains active',async()=>scenario(`(async()=>{
  const o=await onDemandFixture('url-projection-reuse',{indexingMode:'eager',maxItemCount:300});const{f,index}=o;
  try{
    for(let n=0;n<240;n++)f.add('Owner'+n+'.md','[Site](https://example.com/shared)');
    ok(await index.initializeOnDemandBaseline(),'Local host baseline');
    ok(await index.startBackgroundUrlIndex(),'Independent URL scan');
    index.urlDiscoveryRunning=true; // Full/source indexing is intentionally not a prerequisite.
    const q=index.get('https://example.com/shared'),original=index.semanticEvidence.bind(index);let resolutions=0;
    index.semanticEvidence=(...args)=>{resolutions++;return original(...args);};
    const first=index.getNeighborhood(q.path),cold=resolutions;
    equal(first.parents.filter(n=>n.page.file).length,240,'All URL referrers');ok(cold>0,'Initial composition resolves canonical evidence');
    const composed=index.semanticRelationSource(q).page;
    for(let n=0;n<20;n++){
      equal(index.getNeighborhood(q.path).parents.filter(n=>n.page.file).length,240,'Repeated neighborhood stays complete');
      equal(index.gateStats(q).top.visibleCount,241,'Repeated gates remain numeric');
      equal(index.semanticRelationSource(q).page,composed,'Read projection identity stable');
    }
    equal(resolutions,cold,'Roles and gate reads never repeat evidence composition');
    q.name='Current label';equal(index.semanticRelationSource(q).page.name,'Current label','Presentation facets stay live');
    return true;
  }finally{o.close();}
})()`));

test('URL projection reuse retires on unnotified physical/cache changes and coherent publication',async()=>scenario(`(async()=>{
  const o=await onDemandFixture('url-projection-fences');const{f,index}=o;
  try{
    const file=f.add('Owner.md','[Site](https://example.com)');
    ok(await index.initializeOnDemandBaseline(),'Baseline');ok(await index.startBackgroundUrlIndex(),'URL index');
    const q=index.get('https://example.com');
    equal(index.gateStats(q).top.visibleCount,1,'Current referrer');
    const prior=index.semanticRelationSource(q).page;
    file.stat.mtime++;equal(index.gateStats(q).top.visibleCount,0,'Unnotified physical edit retires old URL evidence');
    file.stat.mtime--;equal(index.gateStats(q).top.visibleCount,1,'Exact original physical observation restores read projection');
    const cache=f.app.metadataCache.getFileCache(file),getCache=f.app.metadataCache.getFileCache;
    f.app.metadataCache.getFileCache=target=>target===file?{...cache}:getCache(target);
    equal(index.gateStats(q).top.visibleCount,0,'Unnotified metadata identity change retires evidence');
    f.app.metadataCache.getFileCache=getCache;
    equal(index.gateStats(q).top.visibleCount,1,'Original metadata is current again');
    index.relationViewCache=new WeakMap();
    ok(index.semanticRelationSource(q).page!==prior,'Canonical publication lifetime replaces composition');
    return true;
  }finally{o.close();}
})()`));

test('the real per-file publisher retires affected URL overlays without a broad publication',async()=>scenario(`(async()=>{
  const o=await onDemandFixture('url-projection-file-commit',{indexingMode:'eager'});const{f,index}=o;
  try{
    f.add('A.md','https://example.com/shared');const b=f.add('B.md','Friend:: [[A]]');
    ok(await index.initializeOnDemandBaseline(),'Baseline');ok(await index.startBackgroundUrlIndex(),'URL inventory only');
    const a=index.get('A.md'),prior=index.semanticRelationSource(a).page;
    ok(!prior.neighbours.has('B.md'),'URL inventory does not compile unrelated inline ontology');
    const builder=new sourceModules.GraphBuilder(index.plugin,f.app,index.fieldCache,index.metadataParser,
      index.indexedDb,()=>true,index.semanticFingerprints);
    const flushes=index.urlPresentationFlushes;
    const result=await builder.patchMarkdownFiles(index.state,[b],{publishFileCommit:index.publishIncrementalFile});
    ok(result.ok,'Real prepared file commit');equal(index.urlPresentationFlushes,flushes,'No URL publication masks per-path invalidation');
    ok(index.state.pages.get('A.md').neighbours.has('B.md'),'Canonical incoming edge committed');
    const selected=index.semanticRelationSource(index.get('A.md')).page;
    ok(selected!==prior&&selected.neighbours.has('B.md'),'Affected composed reader immediately exposes new incoming edge');
    return true;
  }finally{o.close();}
})()`));

test('URL parent sorting follows live display-name fields without repeating evidence composition',async()=>scenario(`(async()=>{
  const o=await onDemandFixture('url-projection-title-sort',{renderAlias:true,nameFields:'aliases'});const{f,index}=o;
  try{
    f.add('A.md','https://example.com',{Rank:'Zulu'});f.add('B.md','https://example.com',{Rank:'Alpha'});
    ok(await index.initializeOnDemandBaseline(),'Baseline');ok(await index.startBackgroundUrlIndex(),'URL inventory');
    const q=index.get('https://example.com'),original=index.semanticEvidence.bind(index);let resolutions=0;
    index.semanticEvidence=(...args)=>{resolutions++;return original(...args);};
    equal(index.neighbours(q,'parent').map(n=>n.page.path),['A.md','B.md'],'Original filename sorting');
    const count=resolutions;
    index.plugin.settings.nameFields='Rank';await index.refreshPresentationSettings();
    equal(index.neighbours(q,'parent').map(n=>n.page.path),['B.md','A.md'],'Live display-field sorting');
    equal(resolutions,count,'Sort-only change reuses URL evidence projection');
    return true;
  }finally{o.close();}
})()`));
