/** Actual IndexedDB body availability/reopen drives the production cache-only presentation provider. */
import assert from "node:assert/strict";
import test from "node:test";
import { chromiumHarness } from "./support/browserTypeScript.mjs";
import { contributorBrowserBundle, contributorBrowserInitialize } from "./support/contributorBrowserFixture.mjs";
import { centerGateSettings } from "./support/requestedCenterGateFixture.mjs";

const bundle = await contributorBrowserBundle(["src/index/GraphPresentation.ts", "src/index/GraphIndex.ts"]);

/** Actual GraphIndex with a finite host inventory; no semantic demand or background scan is started. */
const initialize = `(() => {
  window.presentationFixture = async(name, frontmatter={}, tags=['#card','#drawing']) => {
    const f=await fixture(name);f.app.vault.getName=()=>name;
    f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??(path==='/'||path===''?f.app.vault.getRoot():null);
    const file=f.add('Card.md','',frontmatter);f.metadata.get(file.path).hostTags=tags;
    const settings={...(${centerGateSettings.toString()})({showFolderNodes:false,renderSiblings:false}),
      hierarchy:{hidden:[],parents:[],children:[],leftFriends:[],rightFriends:[],previous:[],next:[]},
      inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:['#card','#drawing'],
      indexingMode:'on-demand',urlIndexingMode:'background',lastActivePath:file.path,pinnedNodes:[]};
    let revision=0;const index=new sourceModules.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>revision,
      startupDiagnostics:{mark:()=>{},count:()=>{},phase:()=>{}}},f.app);
    index.scheduleOrphanCleanup=()=>{};
    ok(await index.initializeOnDemandBaseline(),'Production structural baseline');
    const page=index.state.pages.get(file.path),clone={...page,tags:[],styleTags:[...page.styleTags]};
    return {f,file,index,page,clone,settings,bump(){revision++;},close(){index.destroy();f.close();}};
  };
  return true;
})()`;

/** Run production GraphIndex/cache/browser code; only native Obsidian input surfaces are doubled. */
async function scenario(code) {
  const browser=await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize),true);
    assert.equal(await browser.evaluate(initialize),true);
    assert.equal(await browser.evaluate(code),true);
  } finally { await browser.cleanup(); }
}

test("visible presentation preserves unknown facets and recovers from durable body availability and reopen", async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(`(async()=>{
      const M=sourceModules,name='presentation-input-recovery',f=await fixture(name);let other=null;
      try{
        const file=f.add('Card.md','Type:: Drawing\\nStyle:: #drawing');f.metadata.get(file.path).hostTags=['#card','#drawing'];
        const settings={noteTypeField:'Type',primaryTagField:'Style',tagStyleList:['#card','#drawing'],showFullTagName:true,baseNodeStyle:{maxLabelLength:30}};
        const page={path:file.path,file,isTag:false,tags:[],noteType:'Card',primaryStyleTag:'#card',styleTags:['#drawing'],maxLabelLength:20};
        const statuses=new WeakMap(),hot=new Map(),reads=f.reads.length,parses=f.parses.length;
        const prepare=cache=>M.prepareGraphPresentation([page],settings,M.ALL_PRESENTATION_FACETS,f.app,hot,cache,()=>true);
        const missing=await prepare(f.cache);ok(missing&&missing.isCurrent(),'Current missing-input preparation');equal(missing.pending,1,'Only this visible note is pending');
        equal(missing.facets.get(page),{maxLabelLength:30,status:{noteType:'pending',styleTags:'pending'}},'Unknown fields are omitted');
        M.applyPreparedPresentation(missing,statuses);equal(page.noteType,'Card','Known type retained');equal(page.primaryStyleTag,'#card','Known style retained');equal(page.styleTags,['#drawing'],'Secondary style retained');
        const body=M.parseBodyMetadata(f.texts.get(file.path));ok(await f.cache.putBody(file.path,file.stat.mtime,body),'Real body-cache availability');
        const ready=await prepare(f.cache);ok(ready&&ready.isCurrent(),'Ready cache-only preparation');equal(ready.pending,0,'Presentation closure');M.applyPreparedPresentation(ready,statuses);
        equal(page.noteType,'Drawing','Current durable type selected');equal(page.primaryStyleTag,'#drawing','Current durable primary selected');equal(page.styleTags,['#card'],'Current secondary selected');equal(page.tags,[],'Semantic tag facts untouched');
        const before=await value((await f.cache.open()).transaction('bodies').objectStore('bodies').getAll());
        f.cache.close();other=new M.KplexIndexedDbCache(name);ok(await other.open(),'Real independent durable reopen');
        const warm=await prepare(other);ok(warm&&warm.isCurrent(),'Warm presentation inputs remain ready');M.applyPreparedPresentation(warm,statuses);
        equal(await value((await other.open()).transaction('bodies').objectStore('bodies').getAll()),before,'Read-only preparation preserves exact body cache records');
        f.metadata.get(file.path).hostTags=[];ok(await other.putBody(file.path,file.stat.mtime,M.parseBodyMetadata('')),'Current genuine empty body cache');
        const empty=await prepare(other);ok(empty&&empty.isCurrent(),'Genuine ready empty replacement');equal(empty.pending,0,'Empty is ready');M.applyPreparedPresentation(empty,statuses);
        equal(page.noteType,null,'Ready empty clears type');equal(page.primaryStyleTag,null,'Ready empty clears primary');equal(page.styleTags,[],'Ready empty clears secondary');
        equal(statuses.get(page),{noteType:'ready',styleTags:'ready'},'Runtime readiness follows current inputs');
        equal(f.reads.length,reads,'No Vault Markdown reads');equal(f.parses.length,parses,'No acquisition parser calls');
        return true;
      }finally{other?.close();f.close();}
    })()`), true);
  } finally { await browser.cleanup(); }
});

test("visible demand repairs falsely-ready sparse candidates and UI clones from native tags without semantic work", async()=>scenario(`(async()=>{
  const o=await presentationFixture('presentation-demand-native',{Type:'Drawing',Style:'#drawing'},['#drawing']);let release;
  try{
    const {f,file,index,page,clone}=o;
    // Reproduce a sparse incoming target which an earlier compilation incorrectly certified ready.
    for(const p of [page,clone]){p.tags=[];p.noteType=null;p.primaryStyleTag=null;p.styleTags=[];index.presentationStatuses.set(p,{noteType:'ready',styleTags:'ready'});}
    const hiddenFile=f.add('Hidden.md','',{Type:'Drawing',Style:'#drawing'});f.metadata.get(hiddenFile.path).hostTags=['#drawing'];
    const hidden={...clone,path:hiddenFile.path,file:hiddenFile};index.state.pages.set(hidden.path,hidden);
    const state=index.state,neighbours=page.neighbours,semantic=index.getSemanticRevision(),reads=f.reads.length,parses=f.parses.length;
    let semanticEvents=0,presentationEvents=0;const off=index.subscribe(()=>semanticEvents++),offPresentation=index.subscribePresentation(()=>presentationEvents++);
    release=index.acquirePresentationDemand([clone]);await index.refreshVisiblePresentation(file.path);
    for(const p of [page,clone]){equal(p.noteType,'Drawing','Current native type');equal(p.primaryStyleTag,'#drawing','Current native style');equal(p.styleTags,[],'Current secondary');equal(p.tags,[],'Semantic tags remain sparse');equal(index.getPresentationStatus(p),{noteType:'ready',styleTags:'ready'},'Actually ready facets');}
    equal(hidden.primaryStyleTag,null,'Hidden undemanded page is not traversed');ok(index.state===state&&page.neighbours===neighbours,'Canonical graph state and relation identity retained');
    equal(index.getSemanticRevision(),semantic,'Presentation does not advance semantic revision');equal(semanticEvents,0,'No semantic notifications');ok(presentationEvents>0,'Render-only publication');
    equal(f.reads.length,reads,'No note reads');equal(f.parses.length,parses,'No body acquisition/parser calls');equal(index.getVisiblePresentationDiagnostics().demanded,1,'Finite path demand');
    release();release=null;f.metadata.get(file.path).hostTags=[];f.metadata.get(file.path).frontmatter={};await index.refreshVisiblePresentation(file.path);
    equal(page.primaryStyleTag,'#drawing','Released hidden path retains previous known value');equal(index.getVisiblePresentationDiagnostics().demanded,0,'Release removes enumerable demand');
    off();offPresentation();return true;
  }finally{release?.();o.close();}
})()`));

test("visible pending facets retain values and retry on genuine durable body availability before ready-empty clearing", async()=>scenario(`(async()=>{
  const o=await presentationFixture('presentation-demand-availability');let release;
  try{
    const {f,file,index,page,clone}=o;
    for(const p of [page,clone]){p.tags=[];p.noteType='Card';p.primaryStyleTag='#card';p.styleTags=['#drawing'];}
    const semantic=index.getSemanticRevision(),reads=f.reads.length,parses=f.parses.length;
    release=index.acquirePresentationDemand([clone]);await index.refreshVisiblePresentation(file.path);
    for(const p of [page,clone]){equal(p.noteType,'Card','Unknown type retained');equal(p.primaryStyleTag,'#card','Unknown primary retained');equal(p.styleTags,['#drawing'],'Unknown secondary retained');equal(index.getPresentationStatus(p),{noteType:'pending',styleTags:'pending'},'Unknown is pending');}
    equal(index.getVisiblePresentationDiagnostics().pending,1,'One finite pending visible path');
    const retries=index.getVisiblePresentationDiagnostics().retries;await new Promise(resolve=>window.setTimeout(resolve,20));equal(index.getVisiblePresentationDiagnostics().retries,retries,'Pending does not poll');
    ok(await index.indexedDb.putBody(file.path,file.stat.mtime,sourceModules.parseBodyMetadata('Type:: Drawing\\nStyle:: #drawing')),'Actual body-cache availability');
    // The host event owner calls this API for the affected path; no navigation/demand replacement.
    await index.refreshVisiblePresentation(file.path);
    for(const p of [page,clone]){equal(p.noteType,'Drawing','Body event completes type');equal(p.primaryStyleTag,'#drawing','Body event completes style');equal(p.styleTags,['#card'],'Body event selects secondary');}
    equal(index.getVisiblePresentationDiagnostics().pending,0,'Pending closes on genuine input');
    f.metadata.get(file.path).hostTags=[];ok(await index.indexedDb.putBody(file.path,file.stat.mtime,sourceModules.parseBodyMetadata('')),'Current genuine empty input');await index.refreshVisiblePresentation(file.path);
    for(const p of [page,clone]){equal(p.noteType,null,'Ready empty clears type');equal(p.primaryStyleTag,null,'Ready empty clears primary');equal(p.styleTags,[],'Ready empty clears secondary');equal(index.getPresentationStatus(p),{noteType:'ready',styleTags:'ready'},'Empty is ready');}
    equal(index.getSemanticRevision(),semantic,'Optional events preserve semantic revision');equal(f.reads.length,reads,'No Vault body read');equal(f.parses.length,parses,'No acquisition parses');return true;
  }finally{release?.();o.close();}
})()`));

for(const mode of ['metadata-replaced','metadata-in-place','file-modified','file-replaced','file-renamed','source-revision','policy-revision','undemand','unload'])
test('visible presentation rejects stale '+mode+' across held durable cache availability',async()=>scenario(`(async()=>{
  const mode=${JSON.stringify(mode)},o=await presentationFixture('presentation-demand-fence-'+mode);let release,unblock;
  try{
    const {f,file,index,page,clone}=o;for(const p of [page,clone]){p.noteType='Card';p.primaryStyleTag='#card';p.styleTags=['#drawing'];}
    ok(await index.indexedDb.putBody(file.path,file.stat.mtime,sourceModules.parseBodyMetadata('Type:: Drawing\\nStyle:: #drawing')),'Current fixture body');
    let entered;const barrier=new Promise(resolve=>{entered=resolve;}),held=new Promise(resolve=>{unblock=resolve;});
    const original=index.indexedDb.getBodies.bind(index.indexedDb);index.indexedDb.getBodies=async requests=>{const bodies=await original(requests);entered();await held;return bodies;};
    const semantic=index.getSemanticRevision();let published=0;const off=index.subscribePresentation(()=>published++);
    release=index.acquirePresentationDemand([clone]);const task=index.refreshVisiblePresentation(file.path);await barrier;
    if(mode==='metadata-replaced')f.metadata.set(file.path,{...f.metadata.get(file.path)});
    if(mode==='metadata-in-place')f.metadata.get(file.path).hostTags.splice(0,2,'#drawing');
    if(mode==='file-modified')file.stat.mtime++;
    if(mode==='file-replaced')f.files.set(file.path,new window.ContributorFile(file.path));
    if(mode==='file-renamed'){f.files.delete(file.path);file.path='Renamed.md';f.files.set(file.path,file);}
    if(mode==='source-revision')f.app.metadataCache.trigger('changed',file);
    if(mode==='policy-revision')index.presentationRevision++;
    if(mode==='undemand'){release();release=null;}
    if(mode==='unload')index.destroy();
    unblock();await task;
    for(const p of [page,clone]){equal(p.noteType,'Card','Stale type cannot apply');equal(p.primaryStyleTag,'#card','Stale style cannot apply');equal(p.styleTags,['#drawing'],'Stale secondary cannot apply');}
    equal(published,0,'No stale render publication');equal(index.getSemanticRevision(),semantic,'No semantic change');equal(f.reads.length,0,'No body read');equal(f.parses.length,0,'No acquisition parse');
    if(mode==='undemand'||mode==='unload')equal(index.getVisiblePresentationDiagnostics().demanded,0,'Cancelled finite demand removed');else ok(index.getVisiblePresentationDiagnostics().superseded>0,'Superseded observation diagnosed');
    off();return true;
  }finally{unblock?.();release?.();o.close();}
})()`));

test('one surface release during a held retry still completes the surviving visible demand',async()=>scenario(`(async()=>{
  const o=await presentationFixture('presentation-demand-two-surfaces');let first,second,unblock;
  try{
    const {file,index,page,clone}=o;for(const p of [page,clone]){p.noteType='Card';p.primaryStyleTag='#card';p.styleTags=['#drawing'];}
    ok(await index.indexedDb.putBody(file.path,file.stat.mtime,sourceModules.parseBodyMetadata('Type:: Drawing\\nStyle:: #drawing')),'Current durable body');
    let entered,calls=0;const barrier=new Promise(resolve=>{entered=resolve;}),held=new Promise(resolve=>{unblock=resolve;});
    const original=index.indexedDb.getBodies.bind(index.indexedDb);index.indexedDb.getBodies=async requests=>{calls++;const bodies=await original(requests);entered();await held;return bodies;};
    first=index.acquirePresentationDemand([clone]);second=index.acquirePresentationDemand([clone]);const task=index.refreshVisiblePresentation(file.path);await barrier;
    first();first=null;unblock();await task;
    for(const p of [page,clone]){equal(p.noteType,'Drawing','Surviving surface completes type');equal(p.primaryStyleTag,'#drawing','Surviving surface completes style');}
    equal(calls,2,'One superseded attempt and one demand-change replacement');equal(index.getVisiblePresentationDiagnostics().demanded,1,'Remaining demand retained');equal(index.getVisiblePresentationDiagnostics().pending,0,'Remaining demand completed');return true;
  }finally{unblock?.();first?.();second?.();o.close();}
})()`));

test('coalesced same-file availability replaces a held stale retry once without publishing its old body',async()=>scenario(`(async()=>{
  const o=await presentationFixture('presentation-demand-coalesced');let release,unblock;
  try{
    const {f,file,index,page,clone}=o;for(const p of [page,clone]){p.noteType='Card';p.primaryStyleTag='#card';p.styleTags=['#drawing'];}
    ok(await index.indexedDb.putBody(file.path,file.stat.mtime,sourceModules.parseBodyMetadata('Type:: Drawing\\nStyle:: #drawing')),'Prior available body');
    let entered,calls=0;const barrier=new Promise(resolve=>{entered=resolve;}),held=new Promise(resolve=>{unblock=resolve;});
    const original=index.indexedDb.getBodies.bind(index.indexedDb);index.indexedDb.getBodies=async requests=>{calls++;const bodies=await original(requests);entered();await held;return bodies;};
    const published=[];const off=index.subscribePresentation(()=>published.push([clone.noteType,clone.primaryStyleTag]));
    release=index.acquirePresentationDemand([clone]);const task=index.refreshVisiblePresentation(file.path);await barrier;
    ok(await index.indexedDb.putBody(file.path,file.stat.mtime,sourceModules.parseBodyMetadata('Type:: Canvas\\nStyle:: #card')),'New genuine available body');
    f.app.metadataCache.trigger('changed',file);const retry=index.refreshVisiblePresentation(file.path);ok(retry===task,'Events coalesce into same current task');unblock();await task;
    for(const p of [page,clone]){equal(p.noteType,'Canvas','Only latest type publishes');equal(p.primaryStyleTag,'#card','Only latest primary publishes');equal(p.styleTags,['#drawing'],'Latest secondary selected');}
    equal(published,[['Canvas','#card']],'Stale Drawing body never becomes visible');equal(calls,2,'One coalesced event replacement');return true;
  }finally{unblock?.();release?.();o.close();}
})()`));

test('unrelated source and global revision events do not starve selected visible presentation',async()=>scenario(`(async()=>{
  const o=await presentationFixture('presentation-demand-unrelated');let release,unblock;
  try{
    const {f,file,index,page,clone}=o;for(const p of [page,clone]){p.noteType='Card';p.primaryStyleTag='#card';p.styleTags=['#drawing'];}
    const unrelated=f.add('Other.md','Unrelated');ok(await index.indexedDb.putBody(file.path,file.stat.mtime,sourceModules.parseBodyMetadata('Type:: Drawing\\nStyle:: #drawing')),'Current visible body');
    let entered;const barrier=new Promise(resolve=>{entered=resolve;}),held=new Promise(resolve=>{unblock=resolve;});
    const original=index.indexedDb.getBodies.bind(index.indexedDb);index.indexedDb.getBodies=async requests=>{const bodies=await original(requests);entered();await held;return bodies;};
    release=index.acquirePresentationDemand([clone]);const task=index.refreshVisiblePresentation(file.path);await barrier;
    const selectedEvent=index.sourceAcquisition.getFileRevision(file),superseded=index.getVisiblePresentationDiagnostics().superseded;
    unrelated.stat.mtime++;f.app.metadataCache.trigger('changed',unrelated);o.bump();
    equal(index.sourceAcquisition.getFileRevision(file),selectedEvent,'Unrelated native event preserves selected source token');unblock();await task;
    for(const p of [page,clone]){equal(p.noteType,'Drawing','Selected type still completes');equal(p.primaryStyleTag,'#drawing','Selected style still completes');}
    equal(index.getVisiblePresentationDiagnostics().superseded,superseded,'Unrelated event cannot supersede selected presentation');equal(f.reads.length,0,'No extra Vault reads');equal(f.parses.length,0,'No acquisition parse');return true;
  }finally{unblock?.();release?.();o.close();}
})()`));

test('repeated ephemeral visible facade reacquisition settles without a presentation emission feedback loop',async()=>scenario(`(async()=>{
  const o=await presentationFixture('presentation-demand-facades');let release;
  try{
    const {f,file,index,page}=o;ok(await index.indexedDb.putBody(file.path,file.stat.mtime,sourceModules.parseBodyMetadata('Type:: Drawing\\nStyle:: #drawing')),'Current durable body');
    release=index.acquirePresentationDemand([page]);await index.refreshVisiblePresentation(file.path);release();release=null;
    let emitted=0,cacheBatches=0;const off=index.subscribePresentation(()=>emitted++),semantic=index.getSemanticRevision();
    const cached=index.indexedDb.getBodies.bind(index.indexedDb);index.indexedDb.getBodies=async requests=>{cacheBatches++;return cached(requests);};
    for(let n=0;n<12;n++){
      const facade={...index.get(file.path),styleTags:[...page.styleTags]};release=index.acquirePresentationDemand([facade]);await index.refreshVisiblePresentation(file.path);
      equal(facade.noteType,'Drawing','Reacquired type remains correct');equal(facade.primaryStyleTag,'#drawing','Reacquired style remains correct');release();release=null;
    }
    equal(emitted,0,'Stable facade values cannot feed back into render emissions');equal(index.getSemanticRevision(),semantic,'Stable retries never notify semantics');equal(f.reads.length,0,'No repeated body acquisition');equal(f.parses.length,0,'No repeated acquisition parses');equal(index.getVisiblePresentationDiagnostics().demanded,0,'All finite facade leases released');
    equal(cacheBatches,12,'Each explicit facade lease performs one finite cache-only batch, with no self-triggered extra batches');off();return true;
  }finally{release?.();o.close();}
})()`));
