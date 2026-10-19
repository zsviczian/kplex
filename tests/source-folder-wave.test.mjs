/** Folder-wave admission through the actual create callback, complete GraphIndex and real IDB.
 * These host fixtures model event order/tree identity; native timing and resource savings are
 * separate acceptance lanes. No test manufactures complete/fresh graph flags or receipt trust. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {contributorBrowserBundle, contributorBrowserInitialize} from './support/contributorBrowserFixture.mjs';
import {chromiumHarness} from './support/browserTypeScript.mjs';
import {centerGateSettings} from './support/requestedCenterGateFixture.mjs';

/** Preserve only the actual native create/rename owner, without plugin startup or a native app. */
function externalVaultEventSource(event,factoryName) {
  const source=ts.createSourceFile('main.ts',readFileSync(new URL('../src/main.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);
  let callback;
  /** The registered reactive owner is distinct from the pre-restore availability listener. */
  const visit=node=>{
    if(ts.isMethodDeclaration(node)&&node.name.getText(source)==='registerReactiveIndexListeners'){
      const find=child=>{
        if(ts.isCallExpression(child)&&child.expression.getText(source)==='this.app.vault.on'
          &&child.arguments[0]?.getText(source)===JSON.stringify(event))callback=child.arguments[1].getText(source);
        ts.forEachChild(child,find);
      };find(node);
    }
    ts.forEachChild(node,visit);
  };visit(source);assert(callback,'Production reactive Vault:'+event+' owner is required');
  return ts.transpileModule(`const ${factoryName}=function(){return ${callback};};`,{
    compilerOptions:{target:ts.ScriptTarget.ES2021,module:ts.ModuleKind.None},
  }).outputText;
}

const bundle=await contributorBrowserBundle(['src/index/GraphIndex.ts','src/index/GraphBuilder.ts']);
const initialize=`(()=>{
  const M=sourceModules,TFile=window.ContributorFile,TFolder=window.ContributorFolder;
  ${externalVaultEventSource('create','makeExternalCreate')}
  ${externalVaultEventSource('rename','makeExternalRename')}
  let sequence=0;
  /** Extend only the native tree ports: the shared fixture otherwise flattens getRoot on each read. */
  window.folderWaveFixture=async(options={})=>{
    const name='folder174-'+(++sequence),f=await fixture(name),root=f.app.vault.getRoot(),folders=new Map([['',root],['/',root]]),aliases=new Map();
    const treeRoot=()=>{f.work.rootEnumerations++;return root;};
    f.app.vault.getRoot=treeRoot;f.app.vault.getFolderByPath=path=>folders.get(path)??null;
    f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??folders.get(path)??null;
    const fallback=f.app.metadataCache.getFirstLinkpathDest;
    f.app.metadataCache.getFirstLinkpathDest=(literal,owner)=>aliases.has(literal)?f.files.get(aliases.get(literal))??null:fallback(literal,owner);
    /** Native fixture mutation only: publishing the create event remains the actual host owner. */
    const folder=(path,parent=root)=>{const item=new TFolder();item.path=path;item.name=path.split('/').pop();item.parent=parent;parent.children.push(item);folders.set(path,item);return item;};
    const established=folder('Journal');
    const add=(path,text='',frontmatter={})=>{const file=f.add(path,text,frontmatter),slash=path.lastIndexOf('/'),parent=slash<0?root:folders.get(path.slice(0,slash));ok(parent,'Fixture parent exists');file.parent=parent;parent.children.push(file);return file;};
    const ref=add('Ref.md','Friends:: [[Journal/Date/Note]] [[Alias174]] [[Note]]'),old=add('Note.md',''),other=add('Other.md','Friends:: [[Unchanged]]');
    for(let n=0;n<(options.unrelated??3);n++)add('Unrelated-'+n+'.md','');
    f.app.metadataCache.resolvedLinks[ref.path]={'Note.md':1};f.app.metadataCache.unresolvedLinks[ref.path]={'Journal/Date/Note':1,Alias174:1};
    if(options.existing)folder('Journal/Date',established);
    const settings={...(${centerGateSettings.toString()})({renderSiblings:false}),hierarchy:{hidden:[],parents:[],children:[],leftFriends:['Friends'],rightFriends:[],previous:[],next:[]},
      inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],indexingMode:options.mode??'eager',urlIndexingMode:'on-demand',lastActivePath:'Ref.md',pinnedNodes:[]};
    let revision=0,wholePasses=0;const plugin={app:f.app,settings,getIndexSourceRevision:()=>revision,
      startupDiagnostics:{mark(){},count(){},phase(){},processed(){},recordWork(key){if(key==='sourceInventoryPasses')wholePasses++;}},
      dirtyMarkdownPaths:new Set(),deletedMarkdownFiles:new WeakSet(),managedCreatedPaths:new Map(),initialIndexComplete:true,rebuildTask:null,
      renameMetadataSuppressions:new Map(),remapNavigationPaths(){return false;},
      pruneManagedMetadataWrites(){},adjustCachedMarkdownFileCount(){},notifyIndexStatus(){},hasVisibleKplexSurface:()=>true,scheduleRebuild(){}};
    f.app.vault.getName=()=>name;
    let parseCalls=0;
    /** Each actual plugin-index lifetime gets its own ordinary parser observer. */
    const makeIndex=()=>{const owner=new M.GraphIndex(plugin,f.app);plugin.index=owner;owner.scheduleOrphanCleanup=()=>{};
      const parse=owner.metadataParser.parse.bind(owner.metadataParser);owner.metadataParser.parse=async(...args)=>{parseCalls++;return parse(...args);};return owner;};
    let index=makeIndex();
    const register=()=>f.app.vault.on('create',makeExternalCreate.call(plugin));
    // Cold ordering is an explicit conservative control, not a synthetic proof handoff.
    const mainFirst=options.order==='main-first';let mainRef=mainFirst?register():null;
    if(options.physicalBootstrap||options.mode==='on-demand'){
      ok(await index.initializeOnDemandBaseline(),'Real complete physical baseline with partial semantics');
      if(options.physicalBootstrap)index.enableGlobalSourceInventoryIfConfigured();
    }
    else ok(await index.rebuild(),'Real complete Eager graph');
    ok(await index.sourceAcquisition.flush(),'Actual initial source authority');
    if(options.sourceBacked){
      // Retain genuine durable source heads, then take the actual cache-absent restart route.
      index.cancelPendingPersistence();index.destroy();index=makeIndex();
      ok(await index.initializeOnDemandBaseline(),'Actual local physical bootstrap in an Eager session');
      await index.restorePersistedSnapshot(['Ref.md']);await index.waitForSnapshotHydration();
      ok(await index.sourceAcquisition.flush(),'Restart source authority closes');
      ok(index.sourceBackedStartup&&index.sourceNodeVocabularyPublished,'Actual source-backed complete node catalog publishes');
      ok(!index.fullSnapshotHydrated&&!index.fullSnapshotFresh,'No manufactured complete semantic graph');
    }
    let heldHydration=null;
    if(options.heldHydration){
      ok(await index.persistIndexedDbSnapshot(index.snapshotPersistGeneration),'Actual complete snapshot writer commits restart input');
      index.cancelPendingPersistence();index.destroy();index=makeIndex();
      const iterate=index.indexedDb.iterateSnapshotEvidence;let release,entered,finished;
      const gate=new Promise(resolve=>{release=resolve}),held=new Promise(resolve=>{entered=resolve}),done=new Promise(resolve=>{finished=resolve});
      /** Hold actual evidence hydration after the complete saved-page publication milestone. */
      index.indexedDb.iterateSnapshotEvidence=async function(...args){entered();await gate;try{return await iterate.apply(this,args);}finally{finished();}};
      const restoring=index.restorePersistedSnapshot(['Ref.md']),task=index.waitForSnapshotHydration();
      await Promise.race([held,task.then(()=>{throw new Error('Real restart ended before held evidence hydration');})]);
      heldHydration={release,restoring,task,done};
    }
    if(!mainRef)mainRef=register();
    const renameRef=options.nativeRename?f.app.vault.on('rename',makeExternalRename.call(plugin)):null;
    const repo=index.sourceAcquisition.repository,work={inspections:[],visits:[],writes:[],headPages:0};
    for(const key of ['inspect','visit','replace','tombstone','headPage']){const original=repo[key];repo[key]=function(...args){
      if(key==='inspect')work.inspections.push(args[0]);else if(key==='visit')work.visits.push(args[0]+':'+args[1]);
      else if(key==='headPage')work.headPages++;else work.writes.push(key+':'+(key==='replace'?args[0].sourceId:args[0]));return original.apply(this,args);
    };}
    const reset=()=>{wholePasses=0;parseCalls=0;work.inspections.length=work.visits.length=work.writes.length=0;work.headPages=0;f.reads.length=0;f.work.reset();};
    reset();
    /** Finish the real acquisition/journal owner; no readiness field or dependency row is assigned. */
    const settle=async()=>{for(let n=0;n<6;n++)if(await index.sourceAcquisition.flush())return true;return false;};
    const createFolder=(item)=>{revision++;f.app.vault.trigger('create',item);};
    const createFile=(item,metadata=true)=>{revision++;f.app.vault.trigger('create',item);if(metadata)f.app.metadataCache.trigger('changed',item);};
    /** Move the exact native fixture identity, then deliver the real source and main rename owners. */
    const rename=(file,path)=>{const old=file.path,metadata=f.metadata.get(old),text=f.texts.get(old);f.files.delete(old);f.metadata.delete(old);f.texts.delete(old);
      file.path=path;file.name=path.split('/').pop();file.basename=file.name.replace(/\\.[^.]+$/,'');
      f.files.set(path,file);f.metadata.set(path,metadata);f.texts.set(path,text);revision++;f.app.vault.trigger('rename',file,old);};
    const target=(parent=folders.get('Journal/Date'))=>{const file=add(parent.path+'/Note.md','',{aliases:['Alias174']});aliases.set('Alias174',file.path);
      f.app.metadataCache.resolvedLinks[ref.path]={'Note.md':1,[file.path]:2};f.app.metadataCache.unresolvedLinks[ref.path]={};return file;};
    const closeWave=()=>{const before=index.sourceAcquisition.getMaintenanceRevision();f.app.metadataCache.trigger('resolved');return index.sourceAcquisition.getMaintenanceRevision()-before;};
    return {f,index,plugin,root,folders,established,folder,add,ref,old,other,repo,work,target,createFolder,createFile,rename,closeWave,settle,reset,heldHydration,
      get wholePasses(){return wholePasses;},get summary(){return {wholePasses,markdownEnumerations:f.work.markdownEnumerations,headPages:work.headPages,reads:[...f.reads],parses:parseCalls};},
      close(){f.app.vault.offref(mainRef);if(renameRef)f.app.vault.offref(renameRef);index.destroy();f.close();}};
  };
  /** Inspect only one authenticated source's exact lexical bindings after ordinary event maintenance. */
  window.folderResolution=async(f,path)=>{const rows=[];equal(await f.repo.visit(path,'resolution',records=>{rows.push(...records);return true;}),'ready','Current stored resolution');return rows.filter(record=>record.kind==='reference-resolution').map(record=>({raw:record.rawTarget,target:record.target?.entity?.id,kind:record.target?.entity?.kind}));};
  return true;
})()`;

/** A single real browser owns serial cases; resource counts are operation checks, not native CPU claims. */
test('folder creation wave uses complete physical ownership and real source-local finality',async(t)=>{
  const browser=await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize),true);assert.equal(await browser.evaluate(initialize),true);
    await t.test('complete Eager existing-parent folder plus immediate note remains local and repairs true referrers',async()=>{
      const result=await browser.evaluate(`(async()=>{
        const f=await folderWaveFixture();try{
          ok(f.index.get('folder:Journal')?.isFolder,'Established parent exists in actual complete graph');ok(!f.index.get('folder:Journal/Date'),'Pre-insert canonical absence');
          const beforeOther=(await f.repo.inspect('Other.md')).head;f.reset();const created=f.folder('Journal/Date',f.established);f.createFolder(created);
          const file=f.target();f.createFile(file);equal(f.closeWave(),0,'Qualified folder+file close does not add global host maintenance');
          ok(await f.settle(),'All ordinary changed/referrer sources close');equal(f.wholePasses,0,'No whole-source pass');equal(f.f.work.markdownEnumerations,0,'No Markdown inventory traversal');equal(f.work.headPages,0,'No head inventory paging');
          ok(!f.work.inspections.some(id=>id==='Other.md'||id.startsWith('Unrelated-')),'No unrelated inspection');ok(!f.work.visits.some(id=>id.startsWith('Other.md:')||id.startsWith('Unrelated-')),'No unrelated source-family replay');
          equal((await f.repo.inspect('Other.md')).head,beforeOther,'Unrelated durable source remains exact');ok(f.index.get(file.path)?.file===file,'Real create owner publishes exact file identity');
          const resolution=await folderResolution(f,'Ref.md');ok(resolution.some(row=>row.target===file.path&&row.kind==='document'),'Prior unresolved/alias incidence resolves to new file');ok(resolution.some(row=>row.target==='Note.md'),'Existing basename target is preserved');
          equal(f.f.reads,[file.path],'Only new body is read');equal(f.summary.parses,1,'Only new body is parsed by the actual index parser');
          const folderPage=f.index.get('folder:Journal/Date');ok(folderPage?.isFolder,'New folder materialized');ok(folderPage.neighbours.has('folder:Journal'),'Bidirectional native ancestry retained');ok(folderPage.neighbours.has(file.path),'Native file membership retained');
          const summary=f.summary;equal(f.closeWave(),1,'One consumed folder token cannot cover an extra resolved close');ok(await f.settle(),'Extra close takes conservative maintenance');equal(f.wholePasses,1,'Extra close really performs cached inventory');return summary;
        }finally{f.close();}
      })()`);assert.equal(result.wholePasses,0);
    });

    await t.test('existing-folder note and note after a folder wave expires retain their existing local path',async()=>{
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await folderWaveFixture();try{
          const existing=f.add('Journal/Existing.md','');f.createFile(existing);equal(f.closeWave(),0,'Ordinary existing-folder close');ok(await f.settle(),'Existing-folder note converges');equal(f.wholePasses,0,'Existing-folder note has no global pass');
          f.reset();const folder=f.folder('Journal/Date',f.established);f.createFolder(folder);await new Promise(resolve=>window.setTimeout(resolve,80));ok(f.index.completePhysicalFolderInventory,'Ordinary expiry with exact valid membership preserves physical proof');ok(await f.settle(),'Folder-only pending work closes');equal(f.wholePasses,0,'Folder alone adds no full pass without a resolver close');f.reset();
          const file=f.target();f.createFile(file);equal(f.closeWave(),0,'Later note has its own known native wave');ok(await f.settle(),'Later note converges');equal(f.wholePasses,0,'Settled-folder note remains local');return true;
        }finally{f.close();}
      })()`),true);
    });

    await t.test('eligible fixed local impact does not grow with unrelated Markdown inventory',async()=>{
      const result=await browser.evaluate(`(async()=>{
        const counts=[];for(const unrelated of [3,120]){const f=await folderWaveFixture({unrelated});try{
          f.createFolder(f.folder('Journal/Date',f.established));const file=f.target();f.createFile(file);equal(f.closeWave(),0,'Qualified close');ok(await f.settle(),'Local work converges');equal(f.wholePasses,0,'No global pass at either scale');
          counts.push({inspections:f.work.inspections.length,visits:f.work.visits.length,writes:f.work.writes.length,headPages:f.work.headPages,reads:f.summary.reads.length,parses:f.summary.parses});
        }finally{f.close();}}return counts;
      })()`);assert.deepEqual(result[1],result[0]);
    });

    await t.test('rapid native create fill rename closes an authoritative absent old source locally',async()=>{
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await folderWaveFixture({nativeRename:true}),tombstone=f.repo.tombstone,outcomes=[];try{
          const folder=f.folder('Journal/Date',f.established),oldPath=folder.path+'/Untitled.md',path=folder.path+'/Filled.md';
          const builds=f.index.getSemanticPreparationDiagnostics().fullBuilds;
          f.repo.tombstone=async function(...args){const result=await tombstone.apply(this,args);if(args[0]===oldPath)outcomes.push(result.outcome);return result;};
          f.createFolder(folder);const file=f.add(oldPath,'');f.createFile(file,false);equal(f.closeWave(),0,'Qualified folder and empty native create close without acquisition');
          // All edits/rename remain in this synchronous burst; the old path is never acquired.
          const text='Friends:: [[Note]]';f.f.texts.set(oldPath,text);file.stat={...file.stat,mtime:file.stat.mtime+1,size:text.length};
          f.f.app.vault.trigger('modify',file);f.f.app.metadataCache.trigger('changed',file);f.rename(file,path);equal(f.closeWave(),0,'Known modify/rename close stays local');
          const db=await f.index.indexedDb.open();ok(db,'Real source database remains available');
          equal(await value(db.transaction('sourceHeads').objectStore('sourceHeads').get(oldPath)),undefined,'Old native path has no durable head');
          ok(await f.settle(),'Absent old source allows current source/count/fan-out closure');ok(outcomes.includes('absent'),'Actual repository transaction returns authoritative absence');
          equal(f.index.sourceAcquisition.states.get(file).oldPath,undefined,'Completed old-path intent is retired');
          ok(f.index.sourceAcquisition.hasSemanticDependencies(),'Current local source authority is ready');equal(f.index.sourceAcquisition.pendingKnownFiles.size,0,'No stranded source');
          equal(f.index.sourceAcquisition.pendingResolutionKeys.size,0,'Deferred referrers close');equal(f.index.sourceAcquisition.localInventoryCompletionPending,false,'Count completion closes');
          const patched=await f.index.patchMarkdownPaths([path],{useDurableCache:true});equal(patched.outcome,'patched','Normal saved-source patch publishes authored relation');
          ok(f.index.get(path)?.file===file&&!f.index.get(oldPath)?.file,'Canonical navigation owns only the renamed native endpoint');
          ok(f.index.get(path).neighbours.has('Note.md'),'Authored link is present in the canonical graph');
          ok(f.index.evidenceBetween(path,'Note.md').some(row=>row.declaredByPath===path&&row.fieldName?.toLowerCase()==='friends'),'Authored field evidence belongs to the current path');
          equal(f.wholePasses,0,'No global recovery masks absent-source completion');equal(f.work.headPages,0,'No whole-head inventory');
          equal(f.index.getSemanticPreparationDiagnostics().fullBuilds,builds,'No extra full graph build');ok(!f.work.writes.includes('replace:'+oldPath),'Old source was never acquired');return true;
        }finally{f.repo.tombstone=tombstone;f.close();}
      })()`),true);
    });

    await t.test('older absent-source completion cannot clear a concurrently newer native rename',async()=>{
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await folderWaveFixture({nativeRename:true}),a=f.index.sourceAcquisition,tombstone=f.repo.tombstone;let release,pass;
        try{
          const folder=f.folder('Journal/Date',f.established),oldPath=folder.path+'/Untitled.md',middle=folder.path+'/Filled.md',path=folder.path+'/Final.md';
          let entered;const held=new Promise(resolve=>{entered=resolve}),gate=new Promise(resolve=>{release=resolve});let first=true;
          /** Hold the real local retirement result after its transaction, before adapter acceptance. */
          f.repo.tombstone=async function(...args){const result=await tombstone.apply(this,args);if(first&&args[0]===oldPath&&args.length===3){first=false;equal(result.outcome,'absent','Held local result is genuine missing-head proof');entered();await gate;}return result;};
          f.createFolder(folder);const file=f.add(oldPath,'');f.createFile(file,false);equal(f.closeWave(),0,'Initial known folder/file close');
          const text='Friends:: [[Note]]';f.f.texts.set(oldPath,text);file.stat={...file.stat,mtime:file.stat.mtime+1,size:text.length};
          f.f.app.vault.trigger('modify',file);f.f.app.metadataCache.trigger('changed',file);f.rename(file,middle);equal(f.closeWave(),0,'Initial rename remains known');
          pass=a.reconcile();await Promise.race([held,pass.then(()=>{throw new Error('Actual local owner ended before the held absent-source boundary');})]);
          f.rename(file,path);equal(f.closeWave(),0,'Concurrent second rename remains a known native wave');
          equal(a.states.get(file).oldPath,middle,'Actual newer source event owns its prior path');release();equal(await pass,false,'Older inventory cannot certify a newer source revision');
          equal(a.states.get(file).oldPath,middle,'Old absence completion preserves the newer rename intent');f.repo.tombstone=tombstone;
          ok(await f.settle(),'Newer native path and its count journal converge');equal(a.states.get(file).oldPath,undefined,'Only successful current retirement clears intent');
          ok(a.hasSemanticDependencies(),'Latest source state is ready');ok(f.index.get(path)?.file===file&&!f.index.get(middle)?.file&&!f.index.get(oldPath)?.file,'Canonical native identity follows both actual main rename callbacks');
          equal(f.wholePasses,0,'Concurrent rename needs no global recovery');return true;
        }finally{release?.();if(pass)await pass;f.repo.tombstone=tombstone;f.close();}
      })()`),true);
    });

    await t.test('actual source-backed Eager physical ownership is independent of partial semantics',async()=>{
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await folderWaveFixture({sourceBacked:true});try{
          /** Fixed scalar proof states only; native file/folder identities and contents stay out. */
          const proof=()=>{const i=f.index,a=i.sourceAcquisition,w=a.emptyFolderCreateWave;return {
            physical:i.completePhysicalFolderInventory,canonicalCreateOwner:i.hasPhysicalBaseline(),sourceBacked:i.sourceBackedStartup,
            enabled:a.enabled,ready:a.localDependenciesReady,authority:a.localDependencyAuthorityReady,restart:a.restartInventoryChecked,
            inventory:Boolean(a.inventory),known:a.knownResolverWave,uncovered:a.uncoveredResolverWave,coverageEpoch:i.physicalFolderCoverageEpoch,
            building:i.building,hydration:Boolean(i.snapshotHydrationTask),structural:i.pendingStructuralTasks,
            wave:Boolean(w),qualified:Boolean(w?.current),current:w?.current?w.current():null,members:w?.members.size??0};};
          ok(f.index.onDemandPartialState,'Actual local bootstrap remains semantically partial');ok(f.index.completePhysicalFolderInventory,'Complete physical producer grants the independent certificate');
          const before=proof();f.createFolder(f.folder('Journal/Date',f.established));const qualified=proof();const file=f.target();f.createFile(file);const closing=proof();
          equal(f.closeWave(),0,'Complete physical owner qualifies ordinary new folder '+JSON.stringify({before,qualified,closing}));
          ok(await f.settle(),'Ordinary source-local maintenance closes');equal(f.wholePasses,0,'No forced full source inventory');return true;
        }finally{f.close();}
      })()`),true);
    });

    await t.test('body-free bootstrap lacking main physical admission remains conservative',async()=>{
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await folderWaveFixture({physicalBootstrap:true});try{
          ok(f.index.completePhysicalFolderInventory,'Actual body-free producer supplies complete physical membership');
          ok(f.index.onDemandPartialState,'Semantic bootstrap remains partial');ok(!f.index.hasPhysicalBaseline(),'Main canonical-create admission has not opened');
          f.createFolder(f.folder('Journal/Date',f.established));const wave=f.index.sourceAcquisition.emptyFolderCreateWave;
          ok(wave&&!wave.current,'Native candidate cannot manufacture the missing main-owner qualification');
          const file=f.target();f.createFile(file);equal(f.closeWave(),1,'Unqualified bootstrap close retains global fallback');
          ok(await f.settle(),'Conservative source maintenance converges');equal(f.wholePasses,1,'Actual full source pass remains');return true;
        }finally{f.close();}
      })()`),true);
    });

    await t.test('actual clipped saved preview cannot inherit a previous physical-folder certificate',async()=>{
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await folderWaveFixture({unrelated:120});try{
          ok(f.index.completePhysicalFolderInventory,'Actual full producer grants physical proof');
          ok(await f.index.persistIndexedDbSnapshot(f.index.snapshotPersistGeneration),'Actual complete snapshot writer commits');
          const catalog=await f.index.indexedDb.readSnapshotCatalog();ok(catalog.active,'Real saved active generation');const before=f.index.state.pages.size;
          ok(await f.index.publishSnapshotPreview(catalog.active,['Ref.md'],()=>true),'Actual bounded saved preview publishes');
          ok(f.index.state.pages.size<before,'Producer really clips unrelated physical membership');equal(f.index.completePhysicalFolderInventory,false,'Atomic partial publisher clears old physical proof');
          f.createFolder(f.folder('Journal/Date',f.established));const file=f.target();f.createFile(file);equal(f.closeWave(),1,'Clipped state never lends negative folder authority');return true;
        }finally{f.close();}
      })()`),true);
    });

    await t.test('skipped native folder during real held evidence hydration cannot regain proof through warm retention',async()=>{
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await folderWaveFixture({heldHydration:true});try{
          ok(f.index.completePhysicalFolderInventory,'Actual complete saved-page producer grants physical proof');
          ok(f.index.hasPendingSnapshotHydration()&&f.index.warmSourceRecoveryAvailable,'Real evidence owner is held after navigable warm milestone');
          ok(!f.index.hasPhysicalBaseline(),'Main physical-create admission is not yet open');
          f.createFolder(f.folder('Journal/Date',f.established));ok(!f.index.state.pages.has('folder:Journal/Date'),'Actual main owner skips canonical folder insertion during this hydration phase');
          equal(f.index.completePhysicalFolderInventory,false,'Topology invalidation retires the already-published certificate');
          ok(typeof f.index.cancelSnapshotHydration==='function','Actual hydration owner exposes its normal cancellation lifetime');f.index.cancelSnapshotHydration();
          await f.heldHydration.task;ok(f.index.sourceBackedStartup,'Actual cancellation takes retained warm recovery');
          equal(f.index.completePhysicalFolderInventory,false,'Retaining warm presentation cannot revive physical negative proof');
          f.heldHydration.release();await f.heldHydration.done;await f.heldHydration.restoring;
          f.closeWave();ok(await f.settle(),'Earlier uncertain native folder maintenance closes');f.reset();
          ok(f.index.hasPhysicalBaseline(),'Retained warm route now admits normal canonical create events');
          const folder=f.folder('Journal/Next',f.established);f.createFolder(folder);const file=f.add(folder.path+'/Next.md','');f.createFile(file);
          equal(f.closeWave(),1,'A later new-folder wave cannot borrow the retired pre-hydration proof');ok(await f.settle(),'Later conservative fallback converges');equal(f.wholePasses,1,'Actual cached source inventory remains');return true;
        }finally{f.heldHydration.release();await f.heldHydration.done;await f.heldHydration.task;await f.heldHydration.restoring;f.close();}
      })()`),true);
    });

    for(const options of [{order:'main-first'},{mode:'on-demand'},{existing:true}])await t.test('ineligible physical ownership keeps fallback '+JSON.stringify(options),async()=>{
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await folderWaveFixture(${JSON.stringify(options)});try{
          const folder=f.folders.get('Journal/Date')??f.folder('Journal/Date',f.established);f.createFolder(folder);
          const file=f.target();f.createFile(file);equal(f.closeWave(),1,'Unsupported/replayed folder never certifies resolver close');ok(await f.settle(),'Conservative fallback converges');equal(f.wholePasses,1,'Actual whole-source fallback remains');return true;
        }finally{f.close();}
      })()`),true);
    });

    for(const finish of ['close','expiry'])await t.test('unobserved nested folder retires proof on '+finish+' before a later new-folder wave',async()=>{
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await folderWaveFixture();try{
          const folder=f.folder('Journal/Date',f.established);f.createFolder(folder);ok(f.index.sourceAcquisition.emptyFolderCreateWave?.current,'Actual main owner qualifies the original empty folder');
          f.folder(folder.path+'/UnobservedNested',folder);ok(!f.index.state.pages.has('folder:'+folder.path+'/UnobservedNested'),'Missing native CREATE leaves descendant absent from canonical membership');
          if(${JSON.stringify(finish)}==='expiry'){await new Promise(resolve=>window.setTimeout(resolve,80));equal(f.index.completePhysicalFolderInventory,false,'Timer checks bounded membership independently of elapsed eligibility');}
          equal(f.closeWave(),1,'Unobserved nested membership keeps resolver fallback');equal(f.index.completePhysicalFolderInventory,false,'Uncertain membership retires graph coverage');
          ok(await f.settle(),'Ordinary global source maintenance closes');f.reset();
          const next=f.folder('Journal/AfterMissing',f.established);f.createFolder(next);const file=f.add(next.path+'/Next.md','');f.createFile(file);
          equal(f.closeWave(),1,'Later empty folder cannot borrow the incomplete physical inventory');ok(await f.settle(),'Later conservative maintenance closes');equal(f.wholePasses,1,'Source validation does not rebuild missing folder membership');return true;
        }finally{f.close();}
      })()`),true);
    });

    for(const mode of ['nonempty','missing-member','nested','prior-unknown','foreign','rename','delete-recreate','folder-replacement','file-replacement','parent-replacement','overflow','expired','pause'])await t.test('folder proof fails closed for '+mode,async()=>{
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await folderWaveFixture();try{
          const mode=${JSON.stringify(mode)},folder=f.folder('Journal/Date',f.established);
          if(mode==='prior-unknown')f.f.app.vault.trigger('create',{});
          if(mode==='nonempty')f.add(folder.path+'/Imported.md','');
          f.createFolder(folder);
          if(mode==='nonempty')equal(f.index.completePhysicalFolderInventory,false,'Nonempty imported subtree retires incomplete descendant coverage');
          if(mode==='missing-member')f.add(folder.path+'/Missing.md','');
          if(mode==='nested')f.createFolder(f.folder(folder.path+'/Nested',folder));
          if(mode==='foreign')f.f.app.vault.trigger('modify',{});
          if(mode==='rename'){const old=folder.path;f.folders.delete(old);folder.path='Journal/Moved';f.folders.set(folder.path,folder);f.f.app.vault.trigger('rename',folder,old);}
          if(mode==='delete-recreate'){f.folders.delete(folder.path);f.established.children=f.established.children.filter(item=>item!==folder);f.f.app.vault.trigger('delete',folder);f.createFolder(f.folder('Journal/Date',f.established));}
          if(mode==='folder-replacement'){f.folders.delete(folder.path);f.established.children=f.established.children.filter(item=>item!==folder);f.folder('Journal/Date',f.established);}
          if(mode==='parent-replacement'){f.folders.delete('Journal');f.root.children=f.root.children.filter(item=>item!==f.established);
            const replacement=f.folder('Journal');replacement.children=f.established.children;for(const child of replacement.children)child.parent=replacement;f.established.children=[];}
          if(mode==='overflow')for(let n=0;n<33;n++){const file=f.add(folder.path+'/Overflow-'+n+'.md','');f.createFile(file);}
          if(mode==='pause'){const enabled=f.index.sourceAcquisition.pauseInventory();f.index.sourceAcquisition.resumeInventory(enabled);}
          if(mode==='expired')await new Promise(resolve=>window.setTimeout(resolve,80));
          if(mode!=='rename'&&mode!=='expired'){const file=f.target();f.createFile(file);}
          if(mode==='file-replacement'){const prior=f.f.files.get(folder.path+'/Note.md');folder.children=folder.children.filter(item=>item!==prior);f.add(prior.path,'Replacement');}
          equal(f.closeWave(),1,'Uncertain folder close advances global maintenance for '+mode);ok(await f.settle(),'Conservative '+mode+' converges');ok(f.wholePasses>0,'Actual inventory fallback for '+mode);
          if(mode==='nonempty'){
            f.reset();const next=f.folder('Journal/AfterImport',f.established);f.createFolder(next);const file=f.add(next.path+'/Next.md','');f.createFile(file);
            equal(f.closeWave(),1,'A later wave cannot borrow omitted imported-folder descendants');ok(await f.settle(),'Later conservative maintenance converges');equal(f.wholePasses,1,'Source fallback does not manufacture physical folder proof');
          }return true;
        }finally{f.close();}
      })()`),true);
    });

    for(const replace of [false,true])await t.test('suspended ordinary fan-out retains finality'+(replace?' across a real second-connection source replacement':''),async()=>{
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await folderWaveFixture();let release,connection;const lookup=f.repo.lookupLocalDependencies;
        try{
          let entered;const held=new Promise(resolve=>{entered=resolve}),gate=new Promise(resolve=>{release=resolve});let first=true;
          f.repo.lookupLocalDependencies=async function(...args){if(first){first=false;entered();await gate;}return lookup.apply(this,args);};
          f.createFolder(f.folder('Journal/Date',f.established));const file=f.target();f.createFile(file);equal(f.closeWave(),0,'Native coverage does not await lower-level fan-out');await held;
          ok(!f.index.sourceAcquisition.hasSemanticDependencies(),'Suspended source maintenance cannot grant semantic readiness');
          if(${JSON.stringify(replace)}){
            connection=new sourceModules.KplexIndexedDbCache(f.f.app.vault.getName());ok(await connection.open(),'Independent real IDB connection opens');
            const r=connection.sources,selected=await r.inspect('Ref.md');ok(selected.head&&selected.saved,'Select genuine durable referrer');
            equal((await r.replace({sourceId:'Ref.md',physical:selected.head.physical,expected:selected.expected,bodyParserVersion:selected.head.bodyParserVersion,
              observation:{...selected.head.observation,revision:selected.head.observation.revision+1},families:selected.head.families})).outcome,'activated','Concurrent source activates through production CAS');
          }
          release();ok(await f.settle(),'Ordinary source-local lookup and journal repair close');ok(f.index.sourceAcquisition.hasSemanticDependencies(),'Only final current maintenance grants readiness');
          const rows=await folderResolution(f,'Ref.md');ok(rows.some(row=>row.target===file.path),'New endpoint binding survives the held/replaced owner');
          if(!${JSON.stringify(replace)}){equal(f.wholePasses,0,'Suspended known fan-out stays source-local');ok(!f.work.visits.some(id=>id.startsWith('Other.md:')),'Known repair does not replay unrelated source families');}return true;
        }finally{release?.();f.repo.lookupLocalDependencies=lookup;connection?.close();f.close();}
      })()`),true);
    });

    for(const mode of ['unload','purge'])await t.test('pending folder proof releases all lifecycle ownership on '+mode,async()=>{
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await folderWaveFixture();try{
          f.createFolder(f.folder('Journal/Date',f.established));const before=f.index.sourceAcquisition.getMaintenanceRevision();
          if(${JSON.stringify(mode)}==='purge')await f.index.purgePersistentIndexCache();else f.index.destroy();
          equal(f.index.sourceAcquisition.emptyFolderCreateWave,null,'No folder/native identity retained after teardown');
          f.f.app.metadataCache.trigger('resolved');equal(f.index.sourceAcquisition.getMaintenanceRevision(),before,'Retired listener cannot consume or schedule a close');return true;
        }finally{f.close();}
      })()`),true);
    });

    await t.test('actual held complete rebuild retires folder qualification before resolver close',async()=>{
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await folderWaveFixture();let release,build;const prepare=f.index.preparePresentationPublication;
        try{
          f.createFolder(f.folder('Journal/Date',f.established));let entered;const held=new Promise(resolve=>{entered=resolve}),gate=new Promise(resolve=>{release=resolve});
          f.index.preparePresentationPublication=async function(...args){entered();await gate;return prepare.apply(this,args)};
          build=f.index.rebuild();await held;equal(f.closeWave(),1,'Active real build cannot retain the old folder witness');
          release();await build;f.index.preparePresentationPublication=prepare;ok(await f.settle(),'Build and source fallback close');ok(f.wholePasses>0,'Interrupted folder proof requires real source inventory');return true;
        }finally{release?.();if(build)await build;f.index.preparePresentationPublication=prepare;f.close();}
      })()`),true);
    });

    await t.test('an already active real structural rename cannot lend complete folder absence',async()=>{
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await folderWaveFixture();let release,renaming;const update=f.index.updateHostFolderAvailability;
        try{
          const moved=f.folder('Renaming');f.createFolder(moved);f.closeWave();ok(await f.settle(),'Earlier native folder event settles');
          let entered;const held=new Promise(resolve=>{entered=resolve}),gate=new Promise(resolve=>{release=resolve});let first=true;
          f.index.updateHostFolderAvailability=async function(...args){if(first){first=false;entered();await gate;}return update.apply(this,args);};
          f.folders.delete(moved.path);const old=moved.path;moved.path='Moved';moved.name='Moved';f.folders.set(moved.path,moved);
          f.f.app.vault.trigger('rename',moved,old);renaming=f.index.renameFolder(old,moved);await held;
          f.closeWave();ok(await f.settle(),'Unrelated source resolver maintenance closes while actual structural owner is held');f.reset();
          ok(f.index.pendingStructuralTasks>0,'Actual rename retains its structural lifetime');ok(f.index.fullSnapshotHydrated&&f.index.fullSnapshotFresh,'Legacy complete flags alone remain set during rename');
          f.createFolder(f.folder('Journal/Date',f.established));const file=f.target();f.createFile(file);
          equal(f.closeWave(),1,'Partial physical tree mutation cannot certify folder absence');ok(await f.settle(),'Conservative resolver work closes');equal(f.wholePasses,1,'Actual full inventory fallback remains');
          release();await renaming;return true;
        }finally{release?.();if(renaming)await renaming;f.index.updateHostFolderAvailability=update;f.close();}
      })()`),true);
    });

    for(const mode of ['rename','remove'])await t.test('failed real structural '+mode+' cannot revive physical proof when its counter drains',async()=>{
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await folderWaveFixture();let release,terminal;const update=f.index.updateHostFolderAvailability;
        try{
          const moved=f.folder('Retiring');f.createFolder(moved);f.closeWave();ok(await f.settle(),'Earlier native folder creation settles');
          let entered;const held=new Promise(resolve=>{entered=resolve}),gate=new Promise(resolve=>{release=resolve});
          f.index.updateHostFolderAvailability=async()=>{entered();await gate;throw new Error('held structural interruption');};
          const mode=${JSON.stringify(mode)},old=moved.path;f.folders.delete(old);
          if(mode==='rename'){moved.path='Moved';moved.name='Moved';f.folders.set(moved.path,moved);f.f.app.vault.trigger('rename',moved,old);terminal=f.index.renameFolder(old,moved);}
          else{f.root.children=f.root.children.filter(item=>item!==moved);f.f.app.vault.trigger('delete',moved);terminal=f.index.removeDeletedFolder(moved);}
          terminal=terminal.then(()=>null,error=>error.message);await held;equal(f.index.completePhysicalFolderInventory,false,'Structural admission immediately retires proof');
          f.closeWave();ok(await f.settle(),'Existing conservative resolver maintenance closes');release();equal(await terminal,'held structural interruption','Actual owner rejects at its held await');
          equal(f.index.pendingStructuralTasks,0,'Actual finally drains ownership');equal(f.index.completePhysicalFolderInventory,false,'Finally does not recreate failed physical proof');f.reset();
          f.createFolder(f.folder('Journal/Date',f.established));const file=f.target();f.createFile(file);equal(f.closeWave(),1,'Next folder stays conservative after failed tree mutation');return true;
        }finally{release?.();if(terminal)await terminal;f.index.updateHostFolderAvailability=update;f.close();}
      })()`),true);
    });
    // These deterministic clock cases prove causal logic, not real elapsed/native performance.
    await t.test('deterministic continuously live 50 ms native wave covers virtual 0/30/60/65 ms causes',async()=>{
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await folderWaveFixture(),clock=window.performance,descriptor=Object.getOwnPropertyDescriptor(clock,'now'),origin=clock.now();
        let offset=0,installed=false;
        /** Restore the exact original own descriptor (or inherited native method) before async work. */
        const restore=()=>{if(!installed)return;installed=false;if(descriptor)Object.defineProperty(clock,'now',descriptor);else delete clock.now;};
        try{
          Object.defineProperty(clock,'now',{configurable:true,value:/** Coarse monotonic offsets in this single synchronous test turn. */()=>origin+offset});installed=true;
          const folder=f.folder('Journal/Date',f.established);f.createFolder(folder);const a=f.index.sourceAcquisition,wave=a.emptyFolderCreateWave;
          ok(wave?.current&&wave.current()&&wave.openedAt===origin,'Actual complete native owner qualifies at virtual zero');
          offset=30;const file=f.target();f.createFile(file,false);
          offset=60;f.f.app.metadataCache.trigger('changed',file);
          offset=65;ok(clock.now()-wave.openedAt===65,'The original opening deadline is exceeded in the controlled clock');
          ok(a.emptyFolderCreateWave===wave&&a.knownResolverWave&&!a.uncoveredResolverWave,'Actual per-cause timer rearming retains the wave');
          ok(wave.current()&&wave.members.size===1&&folder.children.length===1,'Exact physical owner and native member remain valid');
          equal(f.closeWave(),0,'Continuously live virtual causes remain source-local');
          restore();ok(await f.settle(),'Ordinary real-IDB changed/referrer work closes after clock restoration');equal(f.wholePasses,0,'No full source inventory on the live-wave path');return true;
        }finally{restore();f.close();}
      })()`),true);
    });

    await t.test('deterministic overdue native timer cannot revive folder proof before its callback executes',async()=>{
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await folderWaveFixture(),clock=window.performance,descriptor=Object.getOwnPropertyDescriptor(clock,'now'),origin=clock.now();
        let offset=0,installed=false;
        /** Restore the exact original own descriptor (or inherited native method) before async work. */
        const restore=()=>{if(!installed)return;installed=false;if(descriptor)Object.defineProperty(clock,'now',descriptor);else delete clock.now;};
        try{
          Object.defineProperty(clock,'now',{configurable:true,value:/** Advance observed time without yielding the native timer callback. */()=>origin+offset});installed=true;
          f.createFolder(f.folder('Journal/Date',f.established));const file=f.target();f.createFile(file,false);
          const a=f.index.sourceAcquisition,wave=a.emptyFolderCreateWave,timer=a.resolverWaveTimer;
          ok(wave?.current&&wave.current()&&wave.openedAt===origin,'Actual native folder/file setup is valid at virtual zero');
          offset=65;ok(clock.now()-wave.openedAt===65&&a.resolverWaveTimer===timer&&a.emptyFolderCreateWave===wave,
            'Virtual deadline passed without any await or execution of the real timer callback');
          f.f.app.metadataCache.trigger('changed',file);ok(a.resolverWaveTimer!==timer,'Actual known metadata cause rearms the unchanged native timer owner');
          equal(f.closeWave(),1,'Rearming cannot revive the overdue pre-callback folder proof');
          restore();ok(await f.settle(),'Conservative real-IDB maintenance closes after clock restoration');equal(f.wholePasses,1,'Overdue proof performs the actual full source inventory');return true;
        }finally{restore();f.close();}
      })()`),true);
    });
  } finally {await browser.cleanup();}
});
