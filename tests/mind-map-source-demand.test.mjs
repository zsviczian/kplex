/** Actual GraphIndex/IndexedDB frontier preparation and cancellation for Mind Map. Native host cache/files are finite doubles; source/demand/publication owners are production code. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {contributorBrowserBundle,contributorBrowserInitialize} from './support/contributorBrowserFixture.mjs';
import {chromiumHarness} from './support/browserTypeScript.mjs';
import {plexViewBrowserModules} from './support/plexViewBrowser.mjs';
import {nativeDomHelpers} from './support/nativeColorControls.mjs';
import {centerGateSettings} from './support/requestedCenterGateFixture.mjs';
const bundle=await contributorBrowserBundle(['src/index/GraphIndex.ts','src/ui/plexViews/prepareScene.ts',
 'src/application/PlexHierarchyDemand.ts','src/core/plex/views/mindmap/definition.ts']);

for(const mode of ['on-demand','eager'])test('unprepared Mind Map branches use existing source owners and retire held covers ('+mode+')',{timeout:90000},async()=>{
 const browser=await chromiumHarness(bundle);
 try{
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);
  assert.equal(await browser.evaluate(`(async()=>{
   const mode=${JSON.stringify(mode)},name='mindmap-cold-frontier-'+mode,M=sourceModules,f=await fixture(name),releases=[];let owner,index,unblock;
   const until=async(read,message)=>{const end=Date.now()+15000;while(!read()){ok(Date.now()<end,message);await new Promise(resolve=>setTimeout(resolve,10))}};
   const settle=async()=>{await until(()=>!index.hasPendingSemanticPreparation()&&!index.hasActiveSemanticPreparation(),'Existing preparation did not settle')};
   try{
    f.app.vault.getName=()=>name;f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??(path==='/'||path===''?f.app.vault.getRoot():null);
    const settings={...(${centerGateSettings.toString()})({showFolderNodes:false,renderSiblings:false,maxItemCount:32}),
     hierarchy:{hidden:['Hidden'],parents:['Parent'],children:['Child'],leftFriends:['Friend'],rightFriends:['Right'],previous:['Previous'],next:['Next']},
     inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],indexingMode:mode,urlIndexingMode:'on-demand',lastActivePath:'R.md',pinnedNodes:[]};
    f.add('R.md','',{Child:['[[B.md]]','[[Held.md]]']});f.add('B.md','',{Child:'[[D.md]]'});f.add('D.md','');f.add('Held.md','',{Child:'[[Late.md]]'});f.add('Late.md','');f.add('Attention.md','');
    f.app.metadataCache.resolvedLinks={'R.md':{'B.md':1,'Held.md':1},'B.md':{'D.md':1},'Held.md':{'Late.md':1}};
    index=new M.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>0,startupDiagnostics:{mark(){},count(){},phase(){},recordWork(){},processed(){}}},f.app);index.scheduleOrphanCleanup=()=>{};
    let inventory=0;const enableInventory=index.sourceAcquisition.enableInventory.bind(index.sourceAcquisition);
    index.sourceAcquisition.enableInventory=()=>{inventory++;if(mode!=='eager')throw Error('No global inventory allowed');return enableInventory()};
    ok(await index.initializeOnDemandBaseline(),'Actual physical baseline');
    if(mode==='eager'){index.sourceAcquisition.enableInventory();await index.sourceAcquisition.reconcile();await index.sourceAcquisition.flush();ok(index.sourceAcquisition.hasSemanticDependencies(),'Actual durable Eager source authority')}
    releases.push(index.acquireSemanticDemand('R.md'));await settle();const initialInventory=inventory;
    const before=index.viewScopeCoverage('B.md');ok(!before.prepared&&!before.complete,'B must be genuinely unprepared before explicit expansion: '+JSON.stringify(before));
    const project=state=>M.mindMapViewDefinition.project({attention:'Attention.md',layoutRoot:'R.md',maximum:32,state,read:M.plexViewRead(index,()=>true,32,'Attention.md',256),retainedScopes:owner?.snapshot().held??[]});
    let projection=project(null);ok(projection,'Root projection');ok(!projection.occurrences.some(row=>row.nodeId==='D.md'),'Collapsed branch excludes its descendants');
    const branch=projection.occurrences.find(row=>row.nodeId==='B.md');ok(branch?.branch.canExpand,'Unknown branch is expandable, never a fabricated leaf');
    const acquire=[];owner=new M.PlexHierarchyDemand(id=>{acquire.push(id);return index.acquireSemanticDemand(id)});
    const expanded=M.mindMapViewDefinition.hierarchy.reduce(null,projection,{kind:'toggle',occurrenceId:branch.id});projection=project(expanded);owner.synchronize('mindmap','R.md',projection.preparation.parents);await settle();
    projection=project(expanded);ok(projection.occurrences.some(row=>row.nodeId==='D.md'),'Actually prepared next generation is displayed');ok(index.viewScopeCoverage('B.md').prepared,'Production owner reports current local preparation');equal(acquire,['B.md'],'Exactly the explicit frontier acquired');
    const stable=[f.reads.length,index.publicationRevision,index.semanticPolicyRevision];
    for(let i=0;i<3;i++)owner.synchronize('mindmap','R.md',project(expanded).preparation.parents);equal(acquire,['B.md'],'Unchanged projection does not reacquire');equal([f.reads.length,index.publicationRevision,index.semanticPolicyRevision],stable,'Pure projection/reconciliation does no source or semantic work');
    owner.synchronize('mindmap','R.md',[]);ok(!index.semanticDemandCounts.has('B.md'),'Collapse releases only its frontier');ok(index.semanticDemandCounts.has('R.md'),'Root retained independently');
    ok(!index.viewScopeCoverage('Held.md').prepared,'Held branch starts unprepared');
    let entered=false;const hold=new Promise(resolve=>unblock=resolve);
    if(mode==='on-demand'){const build=index.hostPreview.build.bind(index.hostPreview);index.hostPreview.build=async(...args)=>{if(args[0]==='Held.md'&&args[1]?.completeHostCover){entered=true;await hold;}return build(...args)}}
    else{const prepare=index.sourceAcquisition.prepareRequestedNeighborhood.bind(index.sourceAcquisition);index.sourceAcquisition.prepareRequestedNeighborhood=async(...args)=>{if(args[0].center.id==='Held.md'){entered=true;await hold;}return prepare(...args)}}
    owner.synchronize('mindmap','R.md',['Held.md']);await until(()=>entered,'Actual Held native/source cover not reached');
    const captured=owner.capture('Held.md');owner.synchronize('mindmap','R.md',[]);ok(!captured(),'Retired frontier loses incarnation authority immediately');unblock();await settle();
    ok(!index.onDemandHostScopes.has('Held.md')&&!index.semanticScopes.has('Held.md'),'Held stale cover cannot publish after collapse');ok(!index.semanticDemandCounts.has('Held.md'),'No retired frontier lease retained');equal(inventory,initialInventory,'No expansion-time global inventory');
    return true;
   }finally{unblock?.();owner?.dispose();for(const release of releases)release();index?.destroy();f.close();}
  })()`),true);
 }finally{await browser.cleanup()}
});

/** #250 uses the shipped selector and scene with genuine graph/index storage against a finite native host. */
async function switchChallengerViews(mode, styles, nativeDom, brokenSnapshot) {
  const M=sourceModules;
  const check=(value,message)=>{if(!value)throw new Error(message);};
  const equal=(actual,expected,message)=>check(JSON.stringify(actual)===JSON.stringify(expected),
    message+': '+JSON.stringify({actual,expected}));
  const until=async(read,message)=>{
    const deadline=Date.now()+15000;
    while(!read()){
      check(Date.now()<deadline,typeof message==='function'?message():message);
      await new Promise(resolve=>setTimeout(resolve,20));
    }
  };
  const events=()=>({on:(name,callback)=>({name,callback}),offref:()=>{}});
  const files=new Map(),texts=new Map(),metadata=new Map(),rootFolder=new M.TFolder();
  rootFolder.path='/';
  const expected=['A.md','B.md','C.md','D.md'];
  const resolvedLinks={};
  for(const letter of ['R','A','B','C','D','E']){
    const path=letter+'.md',file=new M.TFile(path);
    const targets=letter==='R'?expected:letter==='C'?['E.md']:[];
    const frontmatter=targets.length?{Challenger:targets.map(target=>'[['+target.slice(0,-3)+']]')}:undefined;
    const body=(frontmatter?'---\nChallenger: '+JSON.stringify(frontmatter.Challenger)+'\n---\n':'')+'# '+letter+'\n';
    file.parent=rootFolder;file.stat.size=body.length;
    files.set(path,file);texts.set(path,body);rootFolder.children.push(file);
    metadata.set(path,{frontmatter,links:[],frontmatterLinks:targets.map((target,ordinal)=>({
      key:'Challenger.'+ordinal,link:target.slice(0,-3),original:'[['+target.slice(0,-3)+']]'
    }))});
    resolvedLinks[path]=Object.fromEntries(targets.map(target=>[target,1]));
  }
  const read=async file=>texts.get(file.path);
  const folder=path=>path==='/'||path===''?rootFolder:null;
  const vault={...events(),getName:()=>`challenger-switch-${mode}`,getRoot:()=>rootFolder,getFolderByPath:folder,
    getAbstractFileByPath:path=>files.get(path)??folder(path),getFileByPath:path=>files.get(path)??null,
    getFiles:()=>[...files.values()],getMarkdownFiles:()=>[...files.values()],read,cachedRead:read};
  const app={vault,workspace:events(),metadataCache:{...events(),resolvedLinks,unresolvedLinks:{},
    getFileCache:file=>metadata.get(file.path)??null,getFirstLinkpathDest:link=>files.get(link)??files.get(link+'.md')??null}};
  const settings=M.migrateAndMergeSettings({indexingMode:mode,indexBeforeViewDesktop:true,inferAllLinksAsFriends:false,
    inverseInfer:false,showFolderNodes:false,showTagNodes:false,renderSiblings:false,graphDepth:1,groupRelations:false,
    maxItemCount:32,animationSpeed:0,allowAutozoom:false,embedCentralNode:false,
    canvasViewSettings:{mindmap:{version:1,values:{initialGenerations:1}}},
    hierarchy:{parents:['Parent'],children:['Child'],leftFriends:['Friend'],rightFriends:['Challenger'],previous:[],next:[],hidden:[]}});
  const translate=M.createTranslator('en');
  let inventoryPasses=0;
  const plugin={app,settings,translator:translate,viewSettingsRegistry:M.builtInCanvasViewSettings,
    startupDiagnostics:{mark(){},count(){},phase(){},processed(){},recordWork(kind){if(kind==='sourceInventoryPasses')inventoryPasses++;}},
    getIndexSourceRevision:()=>0,getTypographyDevice:()=> 'desktop',isKplexLeafVisible:()=>true,
    subscribeKplexVisibility:()=>()=>{},subscribeNodeFlair:()=>()=>{},registerLinkedNodeFeedback:()=>()=>{},
    getHierarchyColorRevision:()=>0,getSavedSettingsPolicy:()=>null,isActionSurfaceCurrent:()=>true};
  plugin.actionManager=new M.ActionManager({readCommandContext:()=>({sharedCenter:null,focusRegion:'graph'}),validateNode:()=>true});
  let index,releaseEvidence,restoreTask,releaseClosingScope;
  const canvases=[];
  const createIndex=()=>{
    const next=new M.GraphIndex(plugin,app,false,mode,()=>true,()=>true);
    next.scheduleOrphanCleanup=()=>{};
    plugin.index=next;
    return next;
  };
  const mount=(path,doc=document)=>{
    const errors=[];
    const onError=event=>errors.push(event.error?.stack??event.message);
    doc.defaultView.addEventListener('error',onError);
    const style=doc.createElement('style');style.textContent=styles;doc.head.append(style);
    const container=doc.createElement('div');container.className='kplex-app';
    container.style.cssText='width:1200px;height:900px;position:relative';doc.body.append(container);
    const session=new M.PlexViewSession(M.builtInPlexViews,()=>{},()=>path);
    const graph=index,reactRoot=M.createRoot(container),actionPorts={current:null},hostLeaf={},lenses={lenses:[]};
    const subscribe=notify=>{
      const releaseGraph=graph.subscribe(notify);
      const releasePresentation=graph.subscribePresentation(()=>{paintRevision++;notify();});
      return()=>{releaseGraph();releasePresentation();};
    };
    let paintRevision=0;
    const readRevision=()=>graph.getSemanticRevision()+paintRevision;
    const noop=()=>{};
    function Canvas(){
      const viewRevision=M.useSyncExternalStore(session.subscribe,session.getSnapshot);
      const renderRevision=M.useSyncExternalStore(subscribe,readRevision);
      return [M.createElement(M.PlexViewSelector,{key:'view',session,translate}),
        M.createElement(M.PlexGraph,{key:'graph',plugin,index:graph,settings,paintSettings:settings,paintLenses:lenses,
          surface:'leaf',hostLeaf,predicate:null,lenses,filterLayoutMode:'keep',predicateRevision:0,
          showCrossLinks:true,activePath:path,renderRevision,semanticRevision:graph.getSemanticRevision(),findFocusRequest:0,
          areaSettingsMode:false,onAreaSettingsModeChange:noop,onApplyFindFilter:noop,appliedFindFilterQuery:null,onClearFindFilter:noop,
          onActivate:noop,onOpen:noop,onOpenInSidecar:async()=>{},onCentralNodeEditorChange:noop,onCentralNodeModeChange:noop,
          actionPorts,actionSurfaceId:'challenger-'+path,displayState:{zen:false,fullscreen:false},fullscreenAvailable:false,
          sidecarOpen:false,viewDefinition:session.definition,viewSession:session,viewRevision})];
    }
    M.flushSync(()=>reactRoot.render(M.createElement(Canvas)));
    const choose=async id=>{
      const select=container.querySelector('.kplex-view-selector select');
      check(select&&!select.disabled,'Owning selector missing or busy: '+JSON.stringify({path,errors}));
      M.flushSync(()=>{select.value=id;select.dispatchEvent(new doc.defaultView.Event('change',{bubbles:true}));});
      await until(()=>!select.disabled&&select.value===id&&session.definition.id===id,'Selector did not switch to '+id);
    };
    const paths=()=>Array.from(container.querySelectorAll('.kplex-thought[data-kplex-path]'),node=>node.dataset.kplexPath).sort();
    let closed=false;
    const close=()=>{if(closed)return;closed=true;M.flushSync(()=>reactRoot.unmount());session.dispose();container.remove();style.remove();
      doc.defaultView.removeEventListener('error',onError);};
    const view={container,session,choose,paths,errors,close};canvases.push(view);return view;
  };
  const records=()=>expected.map(path=>{
    const row=index.cachedViewRelation('R.md',path,'right');
    const explanation=index.explainRelationship('R.md',path);
    check(row&&explanation,`Missing current Challenger incidence/evidence: ${path}`);
    check(explanation.decisions.some(({active,evidence})=>active&&evidence.sourceKind==='frontmatter-ontology'
      &&evidence.declaredByPath==='R.md'&&evidence.declaredTargetPath===path&&evidence.declaredRole==='right'),
      'The connection must include active authored Challenger evidence from R: '+path);
    // Evidence IDs are assigned within each index lifetime. Compare its exact authored owners,
    // values and decisions across restore, retaining multiplicity and the ordered pair coordinates.
    const decisions=explanation.decisions.map(({evidence:{id,...fact},...decision})=>({fact,...decision}));
    return {target:row.page.path,role:row.role,field:row.typeDefinition,type:row.relationType,direction:row.linkDirection,
      roles:explanation.resolvedRoles,summary:explanation.summary,decisions};
  });
  const coverage=()=>index.viewScopeCoverage('R.md');
  const assertCoverage=async(canvas,phase)=>{
    const rendered=[...expected,'R.md'];
    await until(()=>JSON.stringify(canvas.paths())===JSON.stringify(rendered)&&coverage().prepared&&!coverage().pending,
      ()=>`${phase}: coverage/render failed ${JSON.stringify({scope:coverage(),nodes:canvas.paths()})}`);
    const neighborhood=index.getNeighborhood('R.md');
    equal(neighborhood.rightFriends.map(row=>row.page.path).sort(),expected,phase+' exact direct Challenger identities');
    check(!canvas.container.querySelector('.kplex-view-error'),phase+' view rejected its rendered scene');
    return coverage();
  };
  const originalBytes=[...texts];
  let iframe,seedEvidence;
  try{
    index=createIndex();
    if(mode==='eager'){
      check(await index.rebuild(),'Existing Eager before-view build must publish the fixture');
      check(await index.sourceAcquisition.flush(),'Durable Eager sources required before seeding the warm restore');
      seedEvidence=JSON.stringify(records());
      index.cancelPendingPersistence();
      check(await index.persistIndexedDbSnapshot(++index.snapshotPersistGeneration),'Genuine complete warm snapshot must activate');
      if(brokenSnapshot){
        const active=await index.indexedDb.readSnapshotMeta(),db=await index.indexedDb.open();
        check(active&&db,'Active snapshot generation must exist before removing its chunk');
        await new Promise((resolve,reject)=>{
          const transaction=db.transaction('snapshotChunks','readwrite');
          transaction.oncomplete=()=>resolve();transaction.onabort=()=>reject(transaction.error);
          transaction.objectStore('snapshotChunks').delete([active.generation,'pages',0]);
        });
      }
      index.destroy();index=createIndex();
      const releaseOnHold=new Promise(resolve=>{releaseEvidence=resolve;});
      let held=false;
      if(brokenSnapshot){
        const reconcile=index.sourceAcquisition.reconcile.bind(index.sourceAcquisition);
        index.sourceAcquisition.reconcile=async(...args)=>{held=true;await releaseOnHold;return reconcile(...args);};
      }else{
        const readEvidence=index.indexedDb.iterateSnapshotEvidence.bind(index.indexedDb);
        index.indexedDb.iterateSnapshotEvidence=async(...args)=>{held=true;await releaseOnHold;return readEvidence(...args);};
      }
      restoreTask=index.restorePersistedSnapshot(['R.md'],{deferEagerVocabulary:true});
      await until(()=>held,brokenSnapshot?'Missing chunk must enter real source recovery':'Warm restoration must reach the genuine evidence worker');
    }else check(await index.initializeOnDemandBaseline(),'On-demand physical baseline must publish');
    const beforeBuilds=index.getSemanticPreparationDiagnostics().fullBuilds;
    const canvas=mount('R.md');
    iframe=document.createElement('iframe');document.body.append(iframe);
    iframe.contentWindow.eval(nativeDom);
    const second=mount('C.md',iframe.contentDocument);
    await second.choose('mindmap');
    equal(second.session.layoutRoot('R.md'),'C.md','Second document owns its own root');
    if(mode==='eager'){
      for(const id of ['mindmap','classic']){
        await canvas.choose(id);
        if(!brokenSnapshot) await until(()=>JSON.stringify(canvas.paths())===JSON.stringify([...expected,'R.md']),
          ()=>`Warm ${id}: relations unavailable while evidence decoding is held ${JSON.stringify({scope:coverage(),nodes:canvas.paths()})}`);
      }
      check(index.hasPendingSnapshotHydration(),'Selector must run while the genuine restore is held');
      releaseEvidence();
      await restoreTask;
      check((await index.waitForSnapshotHydration()).restored,'Held snapshot or its source recovery never finished');
      if(brokenSnapshot) equal(index.getSnapshotHydrationDiagnostics().firstFailure?.reason,'missing-chunk',
        'The report’s missing-chunk recovery must originate in real storage');
      await index.sourceAcquisition.flush();
    }
    const baseline=await assertCoverage(canvas,'Settled Compass');
    const evidence=JSON.stringify(records());
    if(seedEvidence) equal(evidence,seedEvidence,'Warm restoration must preserve the exact authored evidence');
    check(baseline.complete||mode==='on-demand','Eager Compass root requires current canonical coverage');
    const beforeInventories=inventoryPasses;
    for(const id of ['mindmap','classic','mindmap','classic']){
      await canvas.choose(id);
      const scope=await assertCoverage(canvas,id);
      equal(scope,baseline,id+' must retain the same root coverage after settlement');
      equal(JSON.stringify(records()),evidence,id+' must retain the same direct evidence');
      if(id==='mindmap'){
        equal(canvas.session.layoutRoot('R.md'),'R.md','Mind Map selects the current note as the root');
        if(baseline.complete) check(!canvas.container.querySelector('[data-kplex-path="R.md"] .kplex-node-status'),
          'Authoritative root must not be rendered as partial');
      }
      equal([second.session.definition.id,second.session.layoutRoot('R.md')],['mindmap','C.md'],
        'Switching the first canvas must preserve the second document’s view and root');
    }
    const rootLeases=index.semanticDemandCounts.get('R.md');
    second.close();
    await until(()=>!index.semanticDemandCounts.has('C.md'),'Closing second document must release its root demand');
    equal(index.semanticDemandCounts.get('R.md'),rootLeases,'Closing second document must retain the first root lease');
    if(mode==='on-demand'){
      let entered=false;
      const held=new Promise(resolve=>releaseClosingScope=resolve);
      const build=index.hostPreview.build.bind(index.hostPreview);
      index.hostPreview.build=async(...args)=>{
        if(args[0]==='E.md'&&args[1]?.completeHostCover){entered=true;await held;}
        return build(...args);
      };
      const closing=mount('E.md',iframe.contentDocument);
      await until(()=>entered&&index.viewScopeCoverage('E.md').pending,'Second document never entered real local preparation');
      closing.close();releaseClosingScope();
      await until(()=>!index.viewScopeCoverage('E.md').pending,'Retired preparation never settled');
      check(!index.semanticDemandCounts.has('E.md')&&!index.onDemandHostScopes.has('E.md'),
        'A retired browser document cannot publish its held root scope');
      await assertCoverage(canvas,'First canvas after pending second-document teardown');
    }
    equal(index.getSemanticPreparationDiagnostics().fullBuilds,beforeBuilds,'View changes may not admit a full rebuild');
    equal(inventoryPasses,beforeInventories,'View changes may not admit a source inventory');
    equal([...texts],originalBytes,'Fixture bodies and authored frontmatter must remain byte-identical');
    equal(canvases.flatMap(view=>view.errors),[],'Native window shells reported no render errors');
    return {coverage:baseline,targets:canvas.paths(),field:records()[0].field};
  }finally{
    releaseEvidence?.();releaseClosingScope?.();
    for(const canvas of canvases.reverse()) canvas.close();
    iframe?.remove();index?.destroy();plugin.actionManager.dispose();
    await restoreTask?.catch(()=>{});
  }
}

for(const [label,mode,brokenSnapshot] of [['Eager warm restore','eager',false],['Eager missing-chunk recovery','eager',true],['On-demand','on-demand',false]])test('four authored Challengers survive real view-selector switches ('+label+')',{timeout:90000},async()=>{
 const ui=await plexViewBrowserModules({graphIndex:true});
 const browser=await chromiumHarness(ui.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{
   const result=await browser.evaluate(`(${switchChallengerViews.toString()})(${JSON.stringify(mode)},${JSON.stringify(readFileSync('styles.css','utf8'))},${JSON.stringify(`(()=>{${nativeDomHelpers}})()`)},${JSON.stringify(brokenSnapshot)})`);
   assert.deepEqual(result.targets,['A.md','B.md','C.md','D.md','R.md']);
   assert.equal(result.field,'challenger');
   if(mode==='eager')assert.equal(result.coverage.complete,true);
 }finally{await browser.cleanup();}
});
