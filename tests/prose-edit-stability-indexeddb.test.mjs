/** Coherent neighborhood reads across real source events and delayed body preparation. Native paint is separate. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {contributorBrowserBundle,contributorBrowserInitialize} from './support/contributorBrowserFixture.mjs';
import {chromiumHarness} from './support/browserTypeScript.mjs';
import {centerGateSettings} from './support/requestedCenterGateFixture.mjs';
const bundle=await contributorBrowserBundle(['src/index/GraphIndex.ts','src/index/GraphBuilder.ts','src/index/IndexSnapshot.ts']);

test('late startup resolution repair activates its replacement snapshot without an edit-idle delay',async()=>{
 const browser=await chromiumHarness(bundle);try{
  await browser.evaluate(contributorBrowserInitialize);
  assert(await browser.evaluate(`(async()=>{
   const M=sourceModules,f=await fixture('late-startup-source-save');let index,release;
   try{
    const owner=f.add('A.md','Parent:: [[B]]');f.add('B.md','');const target=f.add('C.md','');
    f.metadata.get(owner.path).links=[{link:'B',position:{start:{line:0,col:9,offset:9},end:{line:0,col:14,offset:14}}}];
    f.app.metadataCache.resolvedLinks[owner.path]={'B.md':1};
    f.app.vault.getName=()=> 'late-startup-source-save';
    f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??(path===''||path==='/'?f.app.vault.getRoot():null);
    const settings={...(${centerGateSettings.toString()})({showFolderNodes:false}),indexingMode:'eager',
     hierarchy:{hidden:[],parents:['Parent'],children:[],leftFriends:[],rightFriends:[],previous:[],next:[],exclusions:[]},tagStyleList:[],showFullTagName:true,
     inferAllLinksAsFriends:false,inverseInfer:false,lastActivePath:'',pinnedNodes:[]};
    const plugin={app:f.app,settings,getIndexSourceRevision:()=>0};
    index=new M.GraphIndex(plugin,f.app);index.scheduleOrphanCleanup=()=>{};
    ok(await index.rebuild(),'Seed full graph');await index.sourceAcquisition.flush();index.cancelPendingPersistence();
    ok(await index.persistIndexedDbSnapshot(index.snapshotPersistGeneration),'Seed saved generation');const saved=index.getSavedSnapshotSummary().active.createdAt;index.destroy();
    const resolve=f.app.metadataCache.getFirstLinkpathDest;
    f.app.metadataCache.getFirstLinkpathDest=(literal,...args)=>literal==='B'?target:resolve(literal,...args);
    f.app.metadataCache.resolvedLinks[owner.path]={[target.path]:1};
    index=new M.GraphIndex(plugin,f.app);index.scheduleOrphanCleanup=()=>{};
    const acquisition=index.sourceAcquisition,observe=acquisition.restoreRestartHostObservations;
    let enter;const gate=new Promise(done=>release=done),entered=new Promise(done=>enter=done);
    acquisition.restoreRestartHostObservations=async function(...args){enter();await gate;return observe.apply(this,args)};
    ok((await index.restorePersistedSnapshot([],{deferEagerVocabulary:true})).restored,'Warm complete graph');await index.waitForSnapshotHydration();
    await Promise.race([entered,new Promise((_,reject)=>setTimeout(()=>reject(Error('Source startup owner did not enter')),3000))]);
    let writes=0;const persist=index.persistIndexedDbSnapshot;index.persistIndexedDbSnapshot=function(...args){writes++;return persist.apply(this,args)};
    index.finishStartupSnapshot();equal(writes,0,'Independent source validation is not yet closed');
    release();ok(await acquisition.flush(),'Late native resolution repair closes');
    for(let n=0;n<300&&(writes===0||index.getSnapshotPersistenceDiagnostics().active||index.getSnapshotPersistenceDiagnostics().pending);n++)await new Promise(done=>setTimeout(done,10));
    equal(writes,1,'The source/graph completion callback starts the actual cache writer');
    ok(!index.getSnapshotPersistenceDiagnostics().pending&&!index.getSnapshotPersistenceDiagnostics().active,'No delayed startup cache debt');
    ok(index.getSavedSnapshotSummary().active.createdAt!==saved,'Replacement generation actually activated');
    ok(index.get('A.md').neighbours.get(target.path)?.isParent,'The saved repair contains the current ontology target');
    equal(index.sourceAcquisition.getCounters().vaultReads,0,'Cached repair does not read Markdown');equal(index.sourceAcquisition.getCounters().parses,0,'No body parse');return true;
   }finally{release?.();index?.destroy();f.close();}
  })()`));
 }finally{await browser.cleanup();}
});

test('an unchanged metadata patch preserves the saved warm cache without scheduling another whole snapshot',async()=>{
  const browser=await chromiumHarness(bundle);
  try{
    await browser.evaluate(contributorBrowserInitialize);
    assert(await browser.evaluate(String.raw`(async()=>{
      const M=sourceModules,f=await fixture('noop-warm-snapshot');let index;
      try{
        const file=f.add('A.md','Parent:: [[B]]'),target=f.add('B.md','');
        f.app.vault.getName=()=> 'noop-warm-snapshot';
        f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??(path===''||path==='/'?f.app.vault.getRoot():null);
        const settings={...(${centerGateSettings.toString()})({showFolderNodes:false}),indexingMode:'eager',
          hierarchy:{hidden:[],parents:['Parent'],children:[],leftFriends:[],rightFriends:[],previous:[],next:[],exclusions:[]},
          tagStyleList:[],showFullTagName:true,inferAllLinksAsFriends:false,inverseInfer:false,lastActivePath:file.path,pinnedNodes:[]};
        const plugin={app:f.app,settings,getIndexSourceRevision:()=>0};
        index=new M.GraphIndex(plugin,f.app);index.scheduleOrphanCleanup=()=>{};
        ok(await index.rebuild(),'Canonical graph');await index.sourceAcquisition.flush();index.cancelPendingPersistence();
        ok(await index.persistIndexedDbSnapshot(index.snapshotPersistGeneration),'Naturally serializable full graph');index.destroy();
        index=new M.GraphIndex(plugin,f.app);index.scheduleOrphanCleanup=()=>{};
        ok((await index.restorePersistedSnapshot([file.path],{deferEagerVocabulary:true})).restored,'Warm graph');
        await index.waitForSnapshotHydration();await index.sourceAcquisition.flush();index.cancelPendingPersistence();
        const saved=index.getSavedSnapshotSummary().active.createdAt;
        const generation=index.snapshotPersistGeneration;
        equal((await index.patchMarkdownPaths([file.path],{useDurableCache:true})).outcome,'patched','Real metadata assessment');
        ok(!index.getSnapshotPersistenceDiagnostics().pending,'No-op notification must not schedule another complete graph write');
        equal(index.snapshotPersistGeneration,generation,'A pure no-op does not cancel an existing snapshot writer');
        equal(index.getSavedSnapshotSummary().active.createdAt,saved,'Existing saved generation retained');
        equal(index.get(file.path).neighbours.has(target.path),true,'Connections unchanged');
        f.metadata.get(file.path).frontmatter['New field']='value';f.app.metadataCache.trigger('changed',file);
        await index.sourceAcquisition.flush();
        equal((await index.patchMarkdownPaths([file.path],{useDurableCache:true})).outcome,'patched','New field discovery');
        ok(index.getSnapshotPersistenceDiagnostics().pending,'Discovery changes remain durable even without new relationships');
        index.cancelPendingPersistence();ok(await index.persistIndexedDbSnapshot(index.snapshotPersistGeneration),'Persist discovery');
        f.texts.set(file.path,f.texts.get(file.path)+'\nPlain prose');file.stat.size=f.texts.get(file.path).length;
        f.app.vault.trigger('modify',file);f.app.metadataCache.trigger('changed',file);
        equal((await index.patchMarkdownPaths([file.path],{useDurableCache:true})).outcome,'patched','Equal-mtime physical size edit');
        ok(index.getSnapshotPersistenceDiagnostics().pending,'Physical size changes still require a replacement restart cache');
        const pendingGeneration=index.snapshotPersistGeneration,pendingDue=index.snapshotPersistDueAt;
        equal((await index.patchMarkdownPaths([file.path],{useDurableCache:true})).outcome,'patched','No-op while a real edit awaits persistence');
        ok(index.getSnapshotPersistenceDiagnostics().pending,'No-op must retain the earlier real edit save');
        equal(index.snapshotPersistGeneration,pendingGeneration,'No-op cannot cancel a queued or active writer');
        equal(index.snapshotPersistDueAt,pendingDue,'No-op cannot postpone the earlier deadline');
        index.cancelPendingPersistence();ok(await index.persistIndexedDbSnapshot(index.snapshotPersistGeneration),'Persist physical-only edit');
        equal((await index.patchMarkdownPaths([file.path],{useDurableCache:true})).outcome,'patched','Later metadata no-op');
        ok(!index.getSnapshotPersistenceDiagnostics().pending,'A prior real edit does not make every later no-op request another snapshot');
        file.stat.mtime++;
        equal((await index.patchMarkdownPaths([file.path],{useDurableCache:true})).outcome,'patched','Physical-only edit');
        ok(index.getSnapshotPersistenceDiagnostics().pending,'A changed physical stamp still needs a new cache');
        return true;
      }finally{index?.destroy();f.acquisition.close();f.cache.close();}
    })()`));
  }finally{await browser.cleanup();}
});

for(const contributor of [false,true])for(const [label,mode,prime] of [['eager','eager',false],['eager-after-edit','eager',true],['on-demand','on-demand',false]])test(label+(contributor?' incoming contributor':' center')+': prose saves retain body ontology throughout changed/resolve and current replacement',async()=>{
  const browser=await chromiumHarness(bundle);
  try{
    await browser.evaluate(contributorBrowserInitialize);
    assert(await browser.evaluate(String.raw`(async()=>{
      const M=sourceModules,name='prose-scene-${label}',f=await fixture(name);let index,releaseDemand,release;
      try{
        const center=f.add('Center.md',${contributor}?'':'Parent:: [[Parent]]\n\nOriginal prose.'),parent=f.add('Parent.md',${contributor}?'Parent:: [[Center]]\n\nOriginal prose.':'');
        const edited=${contributor}?parent:center,target=${contributor}?center:parent,link=target.basename,original='Parent:: [['+link+']]\n\nOriginal prose.';
        const cachedLink={link,position:{start:{line:0,col:9,offset:9},end:{line:0,col:19,offset:19}}};
        f.metadata.get(edited.path).links=[cachedLink];f.app.metadataCache.resolvedLinks[edited.path]={[target.path]:1};
        f.app.vault.getName=()=>name;f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??(path===''||path==='/'?f.app.vault.getRoot():null);
        await f.acquire();ok(await f.acquisition.reconcile(),'Initial neutral authority');f.acquisition.close();
        const settings={...(${centerGateSettings.toString()})({showFolderNodes:false,showTagNodes:false,renderSiblings:false}),indexingMode:'${mode}',
          hierarchy:{hidden:[],parents:['Parent'],children:[],leftFriends:[],rightFriends:[],previous:[],next:[],exclusions:[]},tagStyleList:[],showFullTagName:true,
          inferAllLinksAsFriends:false,inverseInfer:false,lastActivePath:center.path,pinnedNodes:[]};
        let revision=0;const plugin={app:f.app,settings,getIndexSourceRevision:()=>revision};
        index=new M.GraphIndex(plugin,f.app);index.scheduleOrphanCleanup=()=>{};
        if('${mode}'==='eager'){
          ok(await index.rebuild(),'Initial canonical graph');ok(await index.sourceAcquisition.flush(),'Initial source closure');
          index.cancelPendingPersistence();ok(await index.persistIndexedDbSnapshot(index.snapshotPersistGeneration),'Warm input prepared outside observation');index.destroy();
          index=new M.GraphIndex(plugin,f.app);index.scheduleOrphanCleanup=()=>{};
          ok((await index.restorePersistedSnapshot([center.path],{deferEagerVocabulary:true})).restored,'Actual warm restoration');await index.waitForSnapshotHydration();
          equal(index.fieldCache.size,0,'Warm graph has no hot body-policy marker');
        }else ok(await index.initializeOnDemandBaseline(),'Local physical baseline');
        releaseDemand=index.acquireSemanticDemand(center.path);
        if('${mode}'==='on-demand')await index.ensureOnDemandCenter(center.path);else await index.ensureSemanticScope(center.path);
        if(${prime}){
          f.texts.set(edited.path,original+'First ordinary edit.');edited.stat.mtime++;edited.stat.size=f.texts.get(edited.path).length;
          f.app.vault.trigger('modify',edited);const previous=revision;revision++;f.app.metadataCache.trigger('changed',edited);
          index.refreshVisibleHostMetadataPreviews(edited.path,previous);await index.refreshVisibleMarkdownPath(edited.path);
          for(let n=0;n<100&&index.hasActiveSemanticPreparation();n++)await new Promise(resolve=>setTimeout(resolve,10));
        }
        const read=()=>{const value=index.getNeighborhood(center.path);return value?{parents:value.parents.map(row=>row.page.path),children:value.children.map(row=>row.page.path),left:value.leftFriends.map(row=>row.page.path),right:value.rightFriends.map(row=>row.page.path)}:null;};
        const role=${contributor}?'children':'parents',before=read();equal(before[role],['Parent.md'],'Body ontology initially present');
        let semanticEvents=0;const commits=[],publish=index.commitPreparedFile;
        index.commitPreparedFile=function(commit,...args){commits.push(commit.semanticChanged);return publish.call(this,commit,...args);};
        const samples=[],observe=()=>samples.push(read()),off=index.subscribe(()=>{semanticEvents++;observe();}),offPaint=index.subscribePresentation(observe);
        let entered;const gate=new Promise(resolve=>release=resolve),started=new Promise(resolve=>entered=resolve),parse=index.metadataParser.parse;
        index.metadataParser.parse=async function(text,...args){if(text.includes('Edited prose')){entered();await gate;}return parse.call(this,text,...args);};
        try{
          f.texts.set(edited.path,original+'Edited prose without changed links.');edited.stat.mtime++;edited.stat.size=f.texts.get(edited.path).length;
          f.app.vault.trigger('modify',edited);observe();
          const previous=revision;revision++;f.app.metadataCache.trigger('changed',edited);void index.refreshVisiblePresentation(edited.path);index.refreshVisibleHostMetadataPreviews(edited.path,previous);observe();
          const work=index.refreshVisibleMarkdownPath(edited.path);await Promise.race([started,new Promise(resolve=>setTimeout(resolve,80))]);
          await new Promise(resolve=>setTimeout(resolve,80));observe();
          f.app.metadataCache.trigger('resolve',edited);index.refreshVisibleHostMetadataPreviews(edited.path);void index.refreshVisiblePresentation(edited.path);observe();await new Promise(resolve=>setTimeout(resolve,80));observe();
          release();await work;for(let n=0;n<100&&(index.hasActiveSemanticPreparation()||index.onDemandTasks.size);n++)await new Promise(resolve=>setTimeout(resolve,10));observe();
          equal(samples.filter(value=>JSON.stringify(value)!==JSON.stringify(before)),[],'No intermediate body-ontology removal or reclassification on prose-only save');
          // Scope readiness may notify readers independently; the file assessment itself must
          // retain its existing evidence/adjacency and must never publish a topology change.
          ok(commits.length>0&&commits.every(changed=>!changed),'Prose-only file commits are semantic no-ops');
          // Actual edits still pass through the same native observation and foreground owner.
          const edit=async(text,linked)=>{
            f.texts.set(edited.path,text);edited.stat.mtime++;edited.stat.size=text.length;
            f.metadata.get(edited.path).links=linked?[cachedLink]:[];
            f.app.metadataCache.resolvedLinks[edited.path]=linked?{[target.path]:1}:{};
            f.app.vault.trigger('modify',edited);const previous=revision;revision++;f.app.metadataCache.trigger('changed',edited);
            index.refreshVisibleHostMetadataPreviews(edited.path,previous);await index.refreshVisibleMarkdownPath(edited.path);
            for(let n=0;n<100&&(index.hasActiveSemanticPreparation()||index.onDemandTasks.size);n++)await new Promise(resolve=>setTimeout(resolve,10));
          };
          await edit('The link was removed.',false);equal(read()[role],[],'Genuine relationship removal is published');
          await edit(original+'Restored relationship.',true);equal(read()[role],['Parent.md'],'Genuine relationship restoration is published');
          ok(semanticEvents>=2,'Real relationship changes notify semantic consumers');
          return true;
        }finally{release();index.metadataParser.parse=parse;index.commitPreparedFile=publish;off();offPaint();}
      }finally{release?.();releaseDemand?.();index?.destroy();f.close();}
    })()`));
  }finally{await browser.cleanup();}
});
