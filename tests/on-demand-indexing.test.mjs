/** On-demand lifecycle and semantics through production owners and real Chromium IndexedDB. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { contributorBrowserBundle, contributorBrowserInitialize } from './support/contributorBrowserFixture.mjs';
import { chromiumHarness } from './support/browserTypeScript.mjs';
import { centerGateSettings } from './support/requestedCenterGateFixture.mjs';

const bundle = await contributorBrowserBundle(['src/index/GraphIndex.ts', 'src/index/GraphBuilder.ts', 'src/index/GraphState.ts', 'src/index/IndexSnapshot.ts',
  'src/core/graph/settingsPolicy.ts', 'src/core/plex/typographyPreferences.ts', 'src/core/contracts/appearance.ts', 'src/core/plex/colorPreferences.ts', 'src/core/plex/appearanceThemes.ts', 'src/ui/layout.ts']);

/** Keep the actual settings classifier, save queue and typography writers without plugin startup. */
function typographyHostSource() {
  const file=ts.createSourceFile('main.ts',readFileSync('src/main.ts','utf8'),ts.ScriptTarget.Latest,true);
  const names=new Set(['saveSettings','updateStyleSettings','enqueueSettingsWrite','settingsSnapshotForPersistence','persistSettingsSnapshot',
    'captureAppearanceOwner','isAppearanceOwnerCurrent','stageTypographyOverride','persistTypographySettings','updateTypographyOverride','resetTypographyOverride']);
  const methods=[];
  const visit=node=>{if(ts.isMethodDeclaration(node)&&names.has(node.name.getText(file)))methods.push(node.getText(file));ts.forEachChild(node,visit);};
  visit(file);assert.equal(methods.length,names.size);
  return ts.transpileModule('class TypographyHost {'+methods.join('\n')+'}',{compilerOptions:{target:ts.ScriptTarget.ES2021}}).outputText;
}
const initialize = `(() => {
  window.onDemandFixture = async(name, overrides={}) => {
    const f=await fixture(name);f.app.vault.getName=()=>name;
    f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??(path==='/'||path===''?f.app.vault.getRoot():null);
    const settings={...(${centerGateSettings.toString()})({showFolderNodes:false,renderSiblings:false}),
      hierarchy:{hidden:['Hidden'],parents:['Parent'],children:['Child'],leftFriends:['Friend'],rightFriends:['Right'],previous:['Previous'],next:['Next']},
      inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],indexingMode:'on-demand',urlIndexingMode:'on-demand',lastActivePath:'A.md',pinnedNodes:[],...overrides};
    let revision=0;const marks=[];
    const index=new sourceModules.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>revision,startupDiagnostics:{mark:key=>marks.push(key),count:()=>{},phase:()=>{},recordWork:/** Local-mode fixture discards aggregate work receipts. */()=>{}}},f.app);
    index.scheduleOrphanCleanup=()=>{};
    const parse=index.metadataParser.parse.bind(index.metadataParser);
    const parses=[];index.metadataParser.parse=async(...args)=>{parses.push(args[0]);return parse(...args);};
    let inventoryStarts=0;index.sourceAcquisition.enableInventory=()=>{inventoryStarts++;throw new Error('On-demand must never start global inventory');};
    return {f,index,settings,marks,parses,get inventoryStarts(){return inventoryStarts;},bump(){revision++;},close(){index.destroy();f.close();}};
  };
  window.settleDemand=async(index)=>{while(index.onDemandTasks.size)await Promise.all([...index.onDemandTasks.values()]);};
  window.typographyHost=o=>{
    const appearanceThemes=sourceModules;
    const {STYLE_SETTINGS_KEYS,cyclicSemanticColorSlots,migrateColorPreferences,captureSettingsPolicy,classifySettingsChange,isStyleOnlySettingsChange,mergeTypographyOverride,resetTypographyOverride:resetDeviceTypography}=sourceModules;
    class Notice {constructor(message){throw new Error('Unexpected settings failure: '+message);}}
    ${typographyHostSource()}
    const host=new TypographyHost();host.settings=o.settings;host.index=o.index;host.settingsWriteQueue=Promise.resolve();
    host.savedSettingsPolicy=captureSettingsPolicy(o.settings);host.unloading=false;host.translator=key=>key;
    host.saveData=async data=>localStorage.setItem('typography-settings',JSON.stringify(data));
    return host;
  };
  return true;
})()`;

for(const mode of ['on-demand','eager']) test('focused crosslinks use actual published adjacency without source or semantic work ('+mode+')',async()=>scenario(`(async()=>{
  const mode=${JSON.stringify(mode)},o=await onDemandFixture('v2-crosslink-peek-'+mode,{indexingMode:mode,baseLinkStyle:{},hierarchyLinkStyles:{Child:{strokeWidth:3,showLabel:true}}});const {f,index}=o,releases=[];
  try{
    f.add('Center.md','',{Child:['[[A]]','[[B]]','[[C]]']});f.add('A.md','',{Child:'[[B]]',Friend:'[[C]]'});f.add('B.md','',{Right:'[[C]]'});f.add('C.md','');
    f.app.metadataCache.resolvedLinks={'Center.md':{'A.md':1,'B.md':1,'C.md':1},'A.md':{'B.md':1,'C.md':1},'B.md':{'C.md':1}};
    ok(await index.initializeOnDemandBaseline(),'Actual physical baseline');
    if(mode==='eager'){delete index.sourceAcquisition.enableInventory;index.plugin.startupDiagnostics.processed=()=>{};index.sourceAcquisition.enableInventory();await index.sourceAcquisition.reconcile();await index.sourceAcquisition.flush();ok(index.sourceAcquisition.hasSemanticDependencies(),'Actual source authority');}
    for(const path of ['Center.md','A.md','B.md','C.md'])releases.push(index.acquireSemanticDemand(path));
    await settleDemand(index);if(mode==='eager')for(const path of ['Center.md','A.md','B.md','C.md'])await index.ensureSemanticScope(path);
    const nodes=['Center.md','A.md','B.md','C.md'].map(path=>({page:index.get(path)}));
    const normal=[];sourceModules.appendVisibleCrossLinks(nodes,normal,index,o.settings,'Center.md');
    equal(normal.map(edge=>edge.id).sort(),['cross:A.md:B.md:child','cross:A.md:C.md:left','cross:B.md:C.md:right'],'Independently specified real ontology pairs and canonical orientation');
    const before=[f.reads.length,o.parses.length,index.publicationRevision,index.semanticPolicyRevision];let notifications=0;const stop=index.subscribe(()=>notifications++);
    for(const path of ['A.md','B.md','C.md']){
      const focused=[];sourceModules.appendVisibleCrossLinks(nodes,focused,index,o.settings,'Center.md',{path,accepts:()=>true});
      equal(focused,normal.filter(edge=>edge.sourcePath===path||edge.targetPath===path),'Incoming and outgoing exact styles/orientation for '+path);
    }
    const clipped=[];sourceModules.appendVisibleCrossLinks(nodes.filter(node=>node.page.path!=='B.md'),clipped,index,o.settings,'Center.md',{path:'A.md',accepts:()=>true});
    equal(clipped.map(edge=>edge.id),['cross:A.md:C.md:left'],'Absent endpoints remain absent');stop();
    equal([f.reads.length,o.parses.length,index.publicationRevision,index.semanticPolicyRevision],before,'No read/parse/revision work');equal(notifications,0,'No semantic notifications');return true;
  }finally{for(const release of releases)release();o.close();}
})()`));

for (const mode of ['on-demand','eager']) test('native rename synchronously remaps separately published center incidence before source repair ('+mode+')', async()=>scenario(`(async()=>{
  const mode=${JSON.stringify(mode)};const o=await onDemandFixture('v2-rename-read-scope-'+mode,{renderAlias:false,indexingMode:mode});const {f,index}=o;let release;
  try{
    f.add('A.md','[[B]]',{Child:'[[B]]'});const file=f.add('B.md','');f.app.metadataCache.resolvedLinks={'A.md':{'B.md':2}};
    ok(await index.initializeOnDemandBaseline(),'Baseline');
    if(mode==='eager'){delete index.sourceAcquisition.enableInventory;index.plugin.startupDiagnostics.processed=()=>{};index.sourceAcquisition.enableInventory();await index.sourceAcquisition.reconcile();await index.sourceAcquisition.flush();ok(index.sourceAcquisition.hasSemanticDependencies(),'Actual source authority');}
    release=index.acquireSemanticDemand('A.md');await settleDemand(index);if(mode==='eager')await index.ensureSemanticScope('A.md');
    const before=index.getNeighborhood('A.md').children.find(n=>n.page.file===file)?.page;ok(before,'Native source has a separately published materialized neighbor');
    const retainedBefore=[...index.semanticScopes.values()].map(scope=>scope.pagesByPath.get('B.md')).find(Boolean);
    const observations=[];const unsubscribe=index.subscribePresentation(()=>observations.push(index.getNeighborhood('A.md').children.filter(n=>n.page.file===file).map(n=>n.page.path)));
    f.files.delete('B.md');file.path='Renamed.md';file.name='Renamed.md';file.basename='Renamed';f.files.set(file.path,file);
    index.invalidateHostStructure();f.app.vault.trigger('rename',file,'B.md');
    ok(index.renameFile('B.md',file),'Known rename handled');
    unsubscribe();ok(observations.every(paths=>paths.every(path=>path===file.path)),'No presentation subscriber observes a partially remapped native identity');
    const after=index.getNeighborhood('A.md').children.filter(n=>n.page.file===file);
    equal(after.length,1,'Exactly one materialized occurrence survives at the rename boundary');
    equal(after[0].page.path,file.path,'Published neighbor coordinates follow the same native file immediately');
    equal(index.titleFor(after[0].page),'Renamed','Filename title changes before metadata/acquisition repair');
    ok(!index.get('B.md')?.file,'Old path cannot still materialize the renamed native file');
    ok(index.get(file.path)?.file===file,'New lookup owns the canonical file');
    ok(!index.isSemanticWriteReady('A.md',file.path),'Remapping a retained view cannot certify fresh source authority');
    if(mode==='on-demand')ok(after[0].page===before,'Retained page identity survives the synchronous move');
    else ok([...index.semanticScopes.values()].some(scope=>scope.pagesByPath.get(file.path)===retainedBefore),'Canonical retained semantic page identity survives presentation composition');
    const movedText=f.texts.get('B.md'),movedMetadata=f.metadata.get('B.md');f.texts.delete('B.md');f.metadata.delete('B.md');f.texts.set(file.path,movedText);f.metadata.set(file.path,movedMetadata);
    f.app.metadataCache.resolvedLinks={'A.md':{},[file.path]:{}};f.app.metadataCache.unresolvedLinks={'A.md':{'B':2}};
    f.app.metadataCache.trigger('changed',f.files.get('A.md'));f.app.metadataCache.trigger('changed',file);
    if(mode==='eager'){await index.sourceAcquisition.flush();await index.ensureSemanticScope('A.md');}else{await index.refreshVisibleMarkdownPath('A.md');await settleDemand(index);}
    const ghost=index.getNeighborhood('A.md').children.find(n=>n.page.path==='B');ok(ghost&&!ghost.page.file,'Unupdated raw links retain an actual old-name ghost');
    ok(index.get(file.path)?.file===file,'Renamed physical file remains distinct from supported ghost');
    return true;
  }finally{release?.();o.close();}
})()`));

test('retained native rename preserves aliases, merges a destination ghost and follows repeated moves without stealing duplicate basenames', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-rename-alias-collision',{renderAlias:true,nameFields:'aliases,title'});const {f,index}=o;let release;
  try{
    f.add('A.md','[[B]] [[Renamed]]',{Child:['[[B]]','[[Renamed]]']});const file=f.add('B.md','',{aliases:['Stable alias'],title:'Stable title'});const other=f.add('Other/B.md','');
    f.app.metadataCache.resolvedLinks={'A.md':{'B.md':1}};f.app.metadataCache.unresolvedLinks={'A.md':{Renamed:1}};
    ok(await index.initializeOnDemandBaseline(),'Baseline');release=index.acquireSemanticDemand('A.md');await settleDemand(index);
    ok(index.getNeighborhood('A.md').children.some(n=>!n.page.file),'Destination starts as a supported ghost');
    for(const path of ['Renamed.md','Moved/Renamed.md','Moved/renamed.md','Final.md']){
      const old=file.path;f.files.delete(old);file.path=path;file.name=path.split('/').pop();file.basename=file.name.slice(0,-3);f.files.set(path,file);
      index.invalidateHostStructure();index.renameFile(old,file);
      const actual=index.getNeighborhood('A.md').children.filter(n=>n.page.file===file);
      equal(actual.length,1,'One retained materialized endpoint after '+path);equal(actual[0].page.path,path,'Native coordinates after '+path);
      equal(index.titleFor(actual[0].page),'Stable alias','Configured alias survives physical rename');
      if(old.toLowerCase()!==path.toLowerCase())ok(!index.get(old)?.file,'Retired path has no moved native identity: '+old+' -> '+path);
      else equal(index.get(old)?.path,path,'Case-insensitive lookup returns the current physical spelling');
      ok(index.get(other.path)?.file===other,'Same basename in another folder keeps its independent native identity');
      ok(!index.isSemanticWriteReady('A.md',path),'Read-only rename cannot grant selected-pair write authority');
    }
    const replacement=f.add('B.md','');index.insertCreatedFile(replacement);
    index.renameFile('B.md',file);
    ok(index.get('B.md')?.file===replacement,'A late duplicate rename cannot steal a replacement at the original path');
    ok(index.get(file.path)?.file===file,'Late work keeps the renamed native identity separate');
    return true;
  }finally{release?.();o.close();}
})()`));

test('parent-only rename remaps requested file incidence absent from the main graph before yielding', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-rename-requested-folder',{renderAlias:false});const {f,index}=o;let release;
  try{
    const root=f.app.vault.getRoot(),folder=new ContributorFolder();folder.path='Old';folder.name='Old';folder.parent=root;
    const file=f.add('Old/B.md','');file.parent=folder;folder.children=[file];root.children=[folder];f.add('A.md','[[Old/B]]',{Child:'[[Old/B]]'});
    const folders=new Map([['Old',folder]]);f.app.vault.getFolderByPath=path=>path==='/'||path===''?root:folders.get(path)??null;
    f.app.metadataCache.resolvedLinks={'A.md':{'Old/B.md':2}};ok(await index.initializeOnDemandBaseline(),'Baseline');release=index.acquireSemanticDemand('A.md');await settleDemand(index);
    ok(index.getNeighborhood('A.md').children.some(n=>n.page.file===file),'Requested file visible');
    f.files.delete(file.path);folders.delete('Old');folder.path='New';folder.name='New';folders.set('New',folder);file.path='New/B.md';f.files.set(file.path,file);
    index.invalidateHostStructure();const task=index.renameFolder('Old',folder);
    equal(index.getNeighborhood('A.md').children.filter(n=>n.page.file===file).map(n=>n.page.path),['New/B.md'],'Requested incidence follows parent-only event synchronously');
    await task;ok(!index.get('Old/B.md')?.file,'No retired physical occurrence survives');return true;
  }finally{release?.();o.close();}
})()`));

test('a retained moved-file scope follows current native folder membership synchronously', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-rename-retained-ancestry',{renderAlias:false,showFolderNodes:true});const {f,index}=o;let release;
  try{
    const root=f.app.vault.getRoot(),old=new ContributorFolder(),next=new ContributorFolder();
    old.path='Old';old.name='Old';old.parent=root;next.path='Next';next.name='Next';next.parent=root;root.children=[old,next];
    const folders=new Map([['Old',old],['Next',next]]);f.app.vault.getFolderByPath=path=>path==='/'||path===''?root:folders.get(path)??null;
    const file=f.add('Old/B.md','');file.parent=old;old.children=[file];
    ok(await index.initializeOnDemandBaseline(),'Baseline');release=index.acquireSemanticDemand(file.path);await settleDemand(index);
    ok(index.getNeighborhood(file.path).parents.some(n=>n.page.path==='folder:Old'),'Actual native old ancestry published');
    f.files.delete(file.path);file.path='Next/B.md';file.parent=next;old.children=[];next.children=[file];f.files.set(file.path,file);index.invalidateHostStructure();index.renameFile('Old/B.md',file);
    const parents=index.getNeighborhood(file.path).parents.map(n=>n.page.path);
    ok(parents.includes('folder:Next')&&!parents.includes('folder:Old'),'Read-only retained scope follows actual moved-file ancestry before source repair');return true;
  }finally{release?.();o.close();}
})()`));

test('rename retains an exact negative relationship cover while retiring its write certificate', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-rename-negative-pair',{renderAlias:false});const {f,index}=o;const releases=[];
  try{
    const a=f.add('A.md','',{Child:'[[B]]'}),b=f.add('B.md','');f.app.metadataCache.resolvedLinks={'A.md':{'B.md':1}};
    ok(await index.initializeOnDemandBaseline(),'Baseline');releases.push(index.acquireSemanticDemand('A.md'),index.acquireSemanticDemand('B.md'));await settleDemand(index);
    ok(await index.prepareRelationshipPair('A.md','B.md'),'Initial exact positive pair');
    f.metadata.set('A.md',{});f.texts.set('A.md','');a.stat.mtime++;f.app.metadataCache.resolvedLinks={'A.md':{}};
    f.app.vault.trigger('modify',a);f.app.metadataCache.trigger('changed',a);
    ok(await index.prepareRelationshipPair('A.md','B.md'),'Actual cleared source publishes exact negative replacement');
    equal(index.getNeighborhood('A.md').children.filter(n=>n.page.file===b).length,0,'Negative cover hides retained old incidence');
    f.files.delete('B.md');b.path='New.md';b.name='New.md';b.basename='New';f.files.set(b.path,b);index.invalidateHostStructure();f.app.vault.trigger('rename',b,'B.md');index.renameFile('B.md',b);
    equal(index.getNeighborhood('A.md').children.filter(n=>n.page.file===b).length,0,'Rename cannot reveal an already removed retained edge');
    ok(!index.isSemanticWriteReady('A.md',b.path),'Old exact negative proof cannot authorize new-coordinate writes');
    ok(index.relationshipPairs.has(JSON.stringify(['A.md','New.md'])),'Coherent negative pair follows native coordinates');return true;
  }finally{for(const release of releases)release();o.close();}
})()`));

test('eager rename keeps newer requested alias facets over an older complete full graph without granting authority', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-rename-eager-newer-alias',{renderAlias:true,nameFields:'aliases,title',indexingMode:'eager'});const {f,index}=o;let release;
  try{
    delete index.sourceAcquisition.enableInventory;index.plugin.startupDiagnostics.processed=()=>{};
    f.add('A.md','',{Child:'[[B]]'});const b=f.add('B.md','');f.app.metadataCache.resolvedLinks={'A.md':{'B.md':1}};
    ok(await index.rebuild(),'Actual complete canonical graph');await index.sourceAcquisition.reconcile();await index.sourceAcquisition.flush();
    ok(index.sourceAcquisition.hasSemanticDependencies(),'Real source authority');
    const M=sourceModules;
    ok(await index.indexedDb.writeSnapshot({createdAt:Date.now(),urlAliasVersion:2,vaultSignature:M.computeVaultSignature(f.app),settingsSignature:M.computeIndexSettingsSignature(o.settings),discoveredFields:[]},
      [...index.state.pages.values()].map(p=>M.persistedPageFromGraphPage(p)),[...index.state.evidence.declarations()].map(e=>M.persistedDeclarationFromEvidence(e)),()=>true),'Actual complete acceleration persisted');
    ok((await index.restorePersistedSnapshot(['A.md'])).restored,'Real warm acceleration restored');
    f.metadata.set('B.md',{frontmatter:{aliases:['Stable alias'],title:'Stable title'}});
    release=index.acquireSemanticDemand('A.md');
    while(index.semanticPreparationTasks.size)await Promise.all([...index.semanticPreparationTasks.values()].map(entry=>entry.task));
    await index.prepareSemanticScope('A.md',index.semanticPolicyRevision,index.semanticDemandRevision.get('A.md')??0);
    await index.sourceAcquisition.flush();
    while(index.semanticPreparationTasks.size)await Promise.all([...index.semanticPreparationTasks.values()].map(entry=>entry.task));
    await index.prepareSemanticScope('A.md',index.semanticPolicyRevision,index.semanticDemandRevision.get('A.md')??0);
    while(index.semanticPreparationTasks.size)await Promise.all([...index.semanticPreparationTasks.values()].map(entry=>entry.task));
    ok(index.semanticScopes.get('A.md')?.pagesByPath.get('B.md')?.aliases.includes('Stable alias'),'Actual newer scope published: '+JSON.stringify(index.getSemanticPreparationDiagnostics()));
    const before=index.getNeighborhood('A.md').children.find(n=>n.page.file===b)?.page;
    equal(index.titleFor(before),'Stable alias','Actual requested physical facets are newer than the full graph');
    equal(index.state.pages.get('B.md').aliases,[],'Older full state has not acquired those optional aliases');
    // Use the real startup retention boundary after acquisition closes its queued publications.
    index.retainCachedStartupPresentation(index.state);
    ok(index.cachedSnapshotPages.has(index.state.pages.get('B.md')),'Old full-page fallback remains actually cached');
    f.files.delete('B.md');b.path='New.md';b.name='New.md';b.basename='New';f.files.set(b.path,b);index.invalidateHostStructure();index.renameFile('B.md',b);
    const after=index.getNeighborhood('A.md').children.find(n=>n.page.file===b)?.page;
    equal(after.path,b.path,'Retained coordinates remapped');equal(index.titleFor(after),'Stable alias','Closing source proof cannot choose older full-graph facets');
    ok(!index.isSemanticWriteReady('A.md',b.path),'Retained presentation cannot certify renamed source identity');return true;
  }finally{release?.();o.close();}
})()`));

for (const variant of ['ordinary','missing-canonical','destination-collision','missing-canonical-with-destination','held-scope','local-foreground','host-preview']) test('explicit placeholder materialization remaps actual retained incidence ('+variant+')', async()=>scenario(`(async()=>{
  const variant=${JSON.stringify(variant)},local=variant==='local-foreground',o=await onDemandFixture('materialize-retained-'+variant,{indexingMode:local?'on-demand':'eager',renderAlias:false});const {f,index}=o;let release,unblock,late;
  try{
    f.add('A.md','',{Child:'[[Ghost]]'});f.app.metadataCache.unresolvedLinks={'A.md':{Ghost:1}};
    ok(await index.initializeOnDemandBaseline(),'Native baseline');
    if(!local){delete index.sourceAcquisition.enableInventory;index.plugin.startupDiagnostics.processed=()=>{};
      index.sourceAcquisition.enableInventory();await index.sourceAcquisition.reconcile();await index.sourceAcquisition.flush();}
    release=index.acquireSemanticDemand('A.md');
    await settleDemand(index);
    if(!local){
    while(index.semanticPreparationTasks.size)await Promise.all([...index.semanticPreparationTasks.values()].map(entry=>entry.task));
    await index.prepareSemanticScope('A.md',index.semanticPolicyRevision,index.semanticDemandRevision.get('A.md')??0);
    await index.sourceAcquisition.flush();
    while(index.semanticPreparationTasks.size)await Promise.all([...index.semanticPreparationTasks.values()].map(entry=>entry.task));
    await index.prepareSemanticScope('A.md',index.semanticPolicyRevision,index.semanticDemandRevision.get('A.md')??0);
    }
    const ghost=index.getNeighborhood('A.md').children.find(n=>n.page.path==='Ghost')?.page;ok(ghost&&!ghost.file,'Actual unresolved source incidence');
    ok(local?index.onDemandHostScopes.get('A.md')?.pages.has('Ghost'):index.semanticScopes.get('A.md')?.pagesByPath.has('Ghost'),'Separately published ghost exists');
    if(variant!=='host-preview')ok(await index.prepareRelationshipPair('A.md','Ghost'),'Real exact pair facade before materialization');
    if(variant==='missing-canonical'||variant==='missing-canonical-with-destination'){index.state=sourceModules.createGraphState();index.rebuildSearchIndex();}
    if(variant==='host-preview'){
      index.state=sourceModules.createGraphState();index.rebuildSearchIndex();index.semanticScopes.clear();
      await index.publishHostMetadataPreview('A.md');ok(index.hostPreviewScopes.get('A.md')?.pages.has('Ghost'),'Actual native-only incidence before source repair');
    }
    if(variant==='held-scope'){
      const aliases=index.prepareSelectedPhysicalAliases.bind(index);let arrive;
      const reached=new Promise(resolve=>arrive=resolve),gate=new Promise(resolve=>unblock=resolve);
      index.prepareSelectedPhysicalAliases=async(...args)=>{const result=await aliases(...args);arrive();await gate;return result;};
      late=index.prepareSemanticScope('A.md',index.semanticPolicyRevision,index.semanticDemandRevision.get('A.md')??0);await reached;
    }
    const file=f.add('Ghost.md','');
    if(variant==='destination-collision'||variant==='missing-canonical-with-destination')index.insertCreatedFile(file);
    index.invalidateHostStructure();
    const observations=[],observe=()=>observations.push(index.getNeighborhood('A.md').children.map(n=>({path:n.page.path,physical:n.page.file===file})));
    const unsubscribers=[index.subscribe(observe),index.subscribePresentation(observe)];
    const beforeReads=f.reads.length,beforeParses=o.parses.length,publication=index.publicationRevision;
    ok(index.materializeFile('Ghost',file),'Explicit materialization handled');for(const unsubscribe of unsubscribers)unsubscribe();
    const children=index.getNeighborhood('A.md').children;
    equal(children.filter(n=>n.page.file===file).map(n=>n.page.path),['Ghost.md'],'Exactly one materialized child immediately');
    ok(!children.some(n=>n.page.path==='Ghost'),'Old ghost removed before source repair');
    ok(observations.length>0&&observations.every(items=>!items.some(n=>n.path==='Ghost')),'No subscriber observes old incidence after promotion');
    ok(index.pages.get(file.path)?.file===file,'Canonical file exists even if old incidence was only retained');
    ok(index.getNeighborhood(file.path).parents.some(n=>n.page.path==='A.md'),'Inverse incidence preserved');
    ok(!index.get('Ghost'),'Old exact-pair facade cannot resurrect the ghost');
    ok(!index.isSemanticWriteReady('A.md',file.path),'Promotion cannot certify durable source authority');
    equal(f.reads.length,beforeReads,'Promotion reads no Markdown');equal(o.parses.length,beforeParses,'Promotion parses no Markdown');
    ok(index.publicationRevision>publication,'Captured asynchronous graph publications superseded');
    if(late){
      const retained=index.semanticScopes.get('A.md');unblock();await late;
      ok(index.semanticScopes.get('A.md')===retained,'Late pre-promotion scope cannot replace remapped incidence');
      equal(index.getNeighborhood('A.md').children.filter(n=>n.page.file===file).map(n=>n.page.path),['Ghost.md'],'Late preparation cannot resurrect placeholder');
    }
    return true;
  }finally{unblock?.();await late;release?.();o.close();}
})()`));

test('same-coordinate placeholder promotion publishes once and preserves canonical identity',async()=>scenario(`(async()=>{
  const o=await onDemandFixture('materialize-same-coordinate');const {f,index}=o;
  try{
    const ghost=index.insertVirtualPage('Exact.md');
    index.onDemandHostScopes.set('Exact.md',index.state);
    const file=f.add('Exact.md',''),observations=[];
    const unsubscribe=index.subscribe(()=>observations.push(index.get('Exact.md')?.file===file));
    ok(index.materializeFile('Exact.md',file),'Same-coordinate promotion');unsubscribe();
    ok(index.pages.get(file.path)===ghost,'Canonical page identity preserved');ok(index.get(file.path)?.file===file,'All retained readers promoted');
    ok(observations.length>0&&observations.every(Boolean),'Promotion notifies only coherent physical readers');
    equal(index.allPages().filter(p=>p.path===file.path).length,1,'One endpoint');
    const replacement=f.add(file.path,'');ok(!index.materializeFile(file.path,file),'Stale native identity rejected');
    ok(index.pages.get(file.path)?.file===file,'Rejected stale completion changes no canonical binding');
    ok(index.app.vault.getFileByPath(file.path)===replacement,'Replacement native identity preserved');
    const section=index.insertVirtualPage('Section');section.transient={kind:'section',sourcePath:'A.md',sectionId:'heading'};
    const unrelated=f.add('Section.md','');ok(!index.materializeFile(section.path,unrelated),'Transient section cannot be materialized as an unresolved note');
    ok(index.pages.get('Section')===section&&!section.file,'Rejected transient identity remains intact');return true;
  }finally{o.close();}
})()`));

test('stale placeholder materialization declines a different current native endpoint owned only by a host preview',async()=>scenario(`(async()=>{
  const o=await onDemandFixture('materialize-newer-native-preview');const {f,index}=o;
  try{
    f.add('A.md','',{Child:'[[Old.md]]'});f.app.metadataCache.unresolvedLinks={'A.md':{'Old.md':1}};
    ok(await index.initializeOnDemandBaseline(),'Actual native baseline');
    const selected=index.getNeighborhood('A.md').children.find(n=>!n.page.file)?.page;ok(selected,'Original selected placeholder');
    const oldPath=selected.path;index.state=sourceModules.createGraphState();index.rebuildSearchIndex();
    const existing=f.add(oldPath,'');f.app.metadataCache.resolvedLinks={'A.md':{[oldPath]:1}};f.app.metadataCache.unresolvedLinks={};
    index.updateHostFileAvailability(oldPath,existing);await index.publishHostMetadataPreview('A.md');
    const newer=index.get(oldPath);ok(newer?.file===existing,'Actual separately published native endpoint supersedes original placeholder');
    ok(!index.pages.has(oldPath),'Native read owner is absent from sparse canonical graph');
    const created=f.add('Created.md',''),scope=index.hostPreviewScopes.get('A.md'),revision=index.publicationRevision;
    o.settings.lastActivePath=oldPath;o.settings.navigationHistory=[oldPath];
    equal(index.materializeFile(oldPath,created),false,'Stale placeholder intent must decline another current native identity');
    ok(index.hostPreviewScopes.get('A.md')===scope&&index.get(oldPath)?.file===existing,'Rejected intent preserves newer readable incidence');
    ok(!index.pages.has(created.path),'Rejected intent does not publish the unrelated newly created endpoint');
    equal(index.publicationRevision,revision,'Rejected intent causes no graph publication');
    equal(o.settings.lastActivePath,oldPath,'Existing navigation identity preserved');equal(o.settings.navigationHistory,[oldPath],'History preserved');
    ok(f.app.vault.getFileByPath(created.path)===created,'Native created file remains available for normal reconciliation');return true;
  }finally{o.close();}
})()`));

for(const mode of ['full','progressive']) test('materialization cancels an older '+mode+' build before private graph publication',async()=>scenario(`(async()=>{
  const mode=${JSON.stringify(mode)},o=await onDemandFixture('materialize-'+mode+'-build',{indexingMode:'eager'});const {f,index}=o;let unblock;
  try{
    delete index.sourceAcquisition.enableInventory;index.plugin.startupDiagnostics.processed=()=>{};
    f.add('A.md','',{Child:'[[Ghost]]'});f.app.metadataCache.unresolvedLinks={'A.md':{Ghost:1}};
    const prepare=index.preparePresentationPublication.bind(index);let held=false,arrive;
    const reached=new Promise(resolve=>arrive=resolve),gate=new Promise(resolve=>unblock=resolve);
    index.preparePresentationPublication=async(...args)=>{const prepared=await prepare(...args);if(!held){held=true;arrive();await gate;}return prepared;};
    const build=mode==='full'?index.rebuild():index.rebuildProgressively(['A.md']);await reached;
    const ghost=index.insertVirtualPage('Ghost'),file=f.add('Ghost.md','');
    ok(index.materializeFile(ghost.path,file),'Promotion while a private full graph awaits publication');
    unblock();equal(await build,false,'Captured full build rejected by existing generation');
    ok(index.pages.get(file.path)?.file===file,'Rejected private graph cannot erase created endpoint');ok(!index.pages.has('Ghost'),'Rejected private graph cannot resurrect ghost');
    index.preparePresentationPublication=prepare;
    f.app.metadataCache.resolvedLinks={'A.md':{'Ghost.md':1}};f.app.metadataCache.unresolvedLinks={};
    ok(await index.rebuild(),'Normal catch-up build succeeds');
    equal(index.getNeighborhood('A.md').children.filter(n=>n.page.file===file).map(n=>n.page.path),['Ghost.md'],'Current source resolves exactly one physical endpoint');return true;
  }finally{unblock?.();o.close();}
})()`));

test('native case rename retains an actual host preview while the older canonical graph awaits source repair', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-rename-native-preview',{indexingMode:'eager',renderAlias:true,nameFields:'aliases,title'});const {f,index}=o;
  try{
    delete index.sourceAcquisition.enableInventory;index.plugin.startupDiagnostics.processed=()=>{};
    f.add('A.md','',{Child:'[[Gone]]'});const b=f.add('B.md','',{aliases:['Stable alias']});
    f.app.metadataCache.unresolvedLinks={'A.md':{Gone:1}};ok(await index.rebuild(),'Actual older canonical graph');
    f.metadata.set('A.md',{frontmatter:{Child:'[[B]]'},links:[]});
    f.app.metadataCache.resolvedLinks={'A.md':{'B.md':1}};f.app.metadataCache.unresolvedLinks={};o.bump();
    await index.publishHostMetadataPreview('A.md');
    ok(index.hostPreviewScopes.has('A.md'),'Actual host preview is the newer readable owner');
    const before=index.getNeighborhood('A.md').children.find(n=>n.page.file===b)?.page;ok(before,'Current host preview exposes linked native identity');
    equal(index.titleFor(before),'Stable alias','Known host-preview alias');
    f.files.delete('B.md');b.path='b.md';b.name='b.md';b.basename='b';f.files.set(b.path,b);
    index.invalidateHostStructure();f.app.vault.trigger('rename',b,'B.md');index.renameFile('B.md',b);
    const nodes=index.getNeighborhood('A.md').children.filter(n=>n.page.file===b);
    equal(nodes.length,1,'Closing preview build requests cannot discard its coherent native incidence');
    equal(nodes[0].page.path,b.path,'Preview coordinates follow case-only rename');
    equal(index.titleFor(nodes[0].page),'Stable alias','Preview retains known facets');
    ok(!index.isSemanticWriteReady('A.md',b.path),'Provisional host read never grants source write authority');return true;
  }finally{o.close();}
})()`));

test('durable and compatibility style saves retain real on-demand authority with zero source acquisition', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-demand-style-commit',{noteTypeStyles:{},tagNodeStyles:{},tagStyleList:[],hierarchyLinkStyles:{}});
  const {f,index}=o;let release;const restores=[];
  try{
    f.add('A.md','',{Parent:'[[B]]',Style:'#work'});f.metadata.get('A.md').hostTags=['#work'];f.add('B.md','');f.app.metadataCache.resolvedLinks={'A.md':{'B.md':1}};
    ok(await index.initializeOnDemandBaseline(),'Baseline');release=index.acquireSemanticDemand('A.md');await settleDemand(index);
    ok(await index.prepareRelationshipPair('A.md','B.md'),'Real selected pair prepared');await index.sourceAcquisition.repository.flush();
    ok(index.isSemanticWriteReady('A.md','B.md'),'Initial selected pair is authoritative before styles');
    const host=typographyHost(o),work={reads:0,parses:0,acquisitions:0,semanticRefreshes:0,publications:0};
    const observe=(owner,name,counter)=>{const original=owner[name];owner[name]=function(...args){work[counter]++;return original.apply(this,args);};restores.push(()=>owner[name]=original);};
    observe(f.app.vault,'read','reads');observe(f.app.vault,'cachedRead','reads');observe(index.sourceAcquisition,'parse','parses');observe(index.sourceAcquisition,'acquire','acquisitions');observe(index,'refreshSemanticSettings','semanticRefreshes');
    restores.push(index.subscribe(()=>work.publications++));
    const publication=index.publicationRevision,policy=index.semanticPolicyRevision,token=index.onDemandIndexed.get('A.md');let presentations=0;restores.push(index.subscribePresentation(()=>presentations++));
    await index.withForegroundPriority(async()=>{
      let timer;try{await Promise.race([(async()=>{
        equal(await host.updateStyleSettings(draft=>{draft.noteTypeStyles.Project={icon:'box'};}),{refreshPending:false},'Actual durable style commit');
        await host.updateStyleSettings(draft=>{draft.tagNodeStyles['#work']={icon:'info'};draft.tagStyleList.push('#work');});
        host.settings.hierarchyLinkStyles.parent={strokeWidth:3};await host.saveSettings(false);
      })(),new Promise((_,reject)=>timer=setTimeout(()=>reject(new Error('Style save awaited unrelated semantic work')),3000))]);}finally{clearTimeout(timer);}
    });
    equal(work,{reads:0,parses:0,acquisitions:0,semanticRefreshes:0,publications:0},'Styles never acquire sources or rebuild semantics');
    equal(index.publicationRevision,publication,'Canonical publication retained');equal(index.semanticPolicyRevision,policy,'Semantic policy retained');
    ok(index.onDemandIndexed.get('A.md')===token,'Demanded scope token retained');ok(index.isSemanticWriteReady('A.md','B.md'),'Exact selected pair remains authoritative');
    ok(presentations>=3,'Actual committed style changes notify presentation consumers');
    equal(JSON.parse(localStorage.getItem('typography-settings')).tagStyleList,['#work'],'Real persistence includes matching order');
    equal(index.get('A.md').primaryStyleTag,'#work','Tag-order commit applies actual cached facets');
    return true;
  }finally{restores.reverse().forEach(restore=>restore());release?.();o.close();}
})()`));

test('actual color saves emit paint only and retain source, search and presentation authority', async()=>scenario(`(async()=>{
 const o=await onDemandFixture('v2-demand-color-commit',{noteTypeStyles:{},tagNodeStyles:{},tagStyleList:[],hierarchyLinkStyles:{},colorPreferences:sourceModules.defaultColorPreferences()});const{f,index}=o;let release;const restores=[];
 try{f.add('A.md','',{Parent:'[[B]]'});f.add('B.md','');f.app.metadataCache.resolvedLinks={'A.md':{'B.md':1}};ok(await index.initializeOnDemandBaseline(),'Baseline');release=index.acquireSemanticDemand('A.md');await settleDemand(index);await index.sourceAcquisition.repository.flush();
 const host=typographyHost(o),work={reads:0,parses:0,acquisitions:0,semantics:0,search:0,visuals:0,publications:0},events=[];
 const observe=(owner,name,counter)=>{const original=owner[name];owner[name]=function(...args){work[counter]++;return original.apply(this,args)};restores.push(()=>owner[name]=original)};
 observe(f.app.vault,'read','reads');observe(f.app.vault,'cachedRead','reads');observe(index.sourceAcquisition,'parse','parses');observe(index.sourceAcquisition,'acquire','acquisitions');observe(index,'refreshSemanticSettings','semantics');observe(index,'prepareSearchIndex','search');observe(index,'invalidateNodeVisuals','visuals');restores.push(index.subscribe(()=>work.publications++));restores.push(index.subscribePresentation(event=>events.push(event)));
 const revision=index.presentationRevision,token=index.onDemandIndexed.get('A.md');
 await host.updateStyleSettings(draft=>{draft.baseNodeStyle={...draft.baseNodeStyle,textColor:{kind:'theme',variable:'--text-normal'}};});
 await host.updateStyleSettings(draft=>{draft.colorPreferences.palette.push({id:'a',name:'A',light:'#11223300',dark:'#aabbcc80'});draft.backgroundColor={kind:'palette',id:'a'};});
 host.settings.baseLinkStyle={...host.settings.baseLinkStyle,strokeColor:'#abcdef80'};await host.saveSettings(false);
 equal(work,{reads:0,parses:0,acquisitions:0,semantics:0,search:0,visuals:0,publications:0},'Color changes do not request work');equal(events.map(event=>event.kind),['paint','paint','paint'],'No ordinary scene notification');equal(index.presentationRevision,revision,'Presentation capability remains valid');ok(index.onDemandIndexed.get('A.md')===token,'Exact source token retained');return true;
 }finally{restores.reverse().forEach(restore=>restore());release?.();o.close()}
})()`));

test('actual typography saves and resets retain on-demand authority with zero source work; mixed overlapping saves still recanonicalize', async()=>scenario(`(async()=>{
  const o=await onDemandFixture('v2-demand-typography',{typographyProfiles:{},baseFontSize:12.4,wrapNodeLabels:true});
  const {f,index}=o;let release,releaseStorage;const restores=[];
  try{
    f.add('A.md','',{Parent:'[[B]]'});f.add('B.md','');f.app.metadataCache.resolvedLinks={'A.md':{'B.md':1}};
    ok(await index.initializeOnDemandBaseline(),'Baseline');release=index.acquireSemanticDemand('A.md');await settleDemand(index);
    ok(await index.prepareRelationshipPair('A.md','B.md'),'Real selected pair prepared');await index.sourceAcquisition.repository.flush();
    ok(index.isSemanticWriteReady('A.md','B.md'),'Exact authority established without global inventory');
    const host=typographyHost(o),work={reads:0,parses:0,acquisitions:0,publications:0};
    const observe=(owner,name,counter)=>{const original=owner[name];owner[name]=function(...args){work[counter]++;return original.apply(this,args);};restores.push(()=>owner[name]=original);};
    observe(f.app.vault,'read','reads');observe(f.app.vault,'cachedRead','reads');observe(index.sourceAcquisition,'parse','parses');observe(index.sourceAcquisition,'acquire','acquisitions');
    restores.push(index.subscribe(()=>work.publications++));
    const publication=index.publicationRevision,policy=index.semanticPolicyRevision,token=index.onDemandIndexed.get('A.md'),parseCount=o.parses.length;
    let presentations=0;restores.push(index.subscribePresentation(()=>presentations++));
    await index.withForegroundPriority(async()=>{
      let timer;
      try{await Promise.race([(async()=>{
        await host.updateTypographyOverride('desktop',{baseFontSize:18,maxLabelLength:120,wrapNodeLabels:false});
        equal(JSON.parse(localStorage.getItem('typography-settings')).typographyProfiles.desktop.wrapNodeLabels,false,'Actual queued persistence retains false');
        await host.resetTypographyOverride('desktop','maxLabelLength');await host.resetTypographyOverride('desktop');
        equal(JSON.parse(localStorage.getItem('typography-settings')).typographyProfiles,{},'Actual queued reset persists inheritance');
        // Direct map replacement/import callers need the presentation notification too.
        host.settings.typographyProfiles={tablet:{maxWidth:500}};await host.saveSettings(false);
      })(),new Promise((_,reject)=>timer=setTimeout(()=>reject(new Error('Typography save awaited lower-priority semantic work')),3000))]);}
      finally{clearTimeout(timer);}
    });
    equal(work,{reads:0,parses:0,acquisitions:0,publications:0},'Device save/reset performs no Markdown/source or semantic publication work');
    equal(o.parses.length,parseCount,'The actual metadata parser is not invoked');
    equal(index.publicationRevision,publication,'Canonical publication retained');equal(index.semanticPolicyRevision,policy,'Semantic policy retained');
    ok(index.onDemandIndexed.get('A.md')===token,'Existing demanded scope token retained');ok(index.isSemanticWriteReady('A.md','B.md'),'Exact selected-pair authority retained');
    ok(presentations>=4,'Actual save/reset/direct writers notify mounted presentation consumers');
    restores.splice(0).reverse().forEach(restore=>restore());

    // An earlier typography save cannot swallow a simultaneous semantic edit while storage waits.
    let entered;const storing=new Promise(resolve=>entered=resolve),hold=new Promise(resolve=>releaseStorage=resolve),saveData=host.saveData;let first=true;
    host.saveData=async data=>{if(first){first=false;entered();await hold;}await saveData(data);};
    host.stageTypographyOverride('mobile',{maxLabelLength:60});const early=host.saveSettings(false);await storing;
    host.settings.hierarchy.parents=[];host.settings.hierarchy.leftFriends=['Parent'];host.stageTypographyOverride('mobile',{maxWidth:450});
    const mixed=host.saveSettings(false);equal(index.semanticPolicyRevision,policy+1,'Mixed semantic edit invalidates before queued persistence');
    releaseStorage();await Promise.all([early,mixed]);await settleDemand(index);
    ok(index.state.pages.get('A.md').neighbours.get('B.md').isLeftFriend,'Actual mixed save recanonicalizes the published relationship');
    ok(!index.isSemanticWriteReady('A.md','B.md'),'Old exact-pair authority is revoked by the semantic edit');
    // Existing pair projections remain visible until exact re-preparation. Require current real
    // pair authority before comparing the public composed neighborhood under the new policy.
    ok(await index.prepareRelationshipPair('A.md','B.md'),'Mixed save exact pair prepares under current policy');
    ok(index.isSemanticWriteReady('A.md','B.md'),'New pair has genuine current authority');
    equal(index.getNeighborhood('A.md').parents.length,0,'Previous role retired by actual mixed save');
    equal(index.getNeighborhood('A.md').leftFriends.map(x=>x.page.path),['B.md'],'Real requested graph recanonicalized for mixed save');
    equal(JSON.parse(localStorage.getItem('typography-settings')).typographyProfiles.mobile,{maxLabelLength:60,maxWidth:450},'Overlapping queue persists latest scalar state');
    equal(o.inventoryStarts,0,'No global inventory introduced');return true;
  }finally{releaseStorage?.();restores.reverse().forEach(restore=>restore());release?.();o.close();}
})()`));

/** The browser deadline reports a missing closure instead of accepting eventual global readiness. */
async function scenario(code) {
  const browser=await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize),true);
    assert.equal(await browser.evaluate(initialize),true);
    assert.equal(await browser.evaluate(code),true);
  } finally { await browser.cleanup(); }
}

for(const variant of ['stationary','released','reacquired','baseline-reset','policy-change','late-retirement','purged','destroyed']) test('build-blocked local demand wakes only its current lifetime ('+variant+')',async()=>scenario(`(async()=>{
 const variant=${JSON.stringify(variant)},o=await onDemandFixture('pr172-build-blocked-'+variant);const{f,index}=o;let release,otherRelease,unblock,releaseRetirement;
 const deadline=async(promise,label)=>{let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Deadline: '+label)),5000);})]);}finally{clearTimeout(timer);}};
 try{
  f.add('A.md','Child:: [[B]]');f.add('B.md','');f.add('Other.md','Parent:: [[U]]');f.add('U.md','unrelated held body');f.app.metadataCache.resolvedLinks={'A.md':{'B.md':1}};
  ok(await index.initializeOnDemandBaseline(),'Real structural baseline');
  const parse=index.metadataParser.parse.bind(index.metadataParser);let arrived;
  const reached=new Promise(resolve=>arrived=resolve),gate=new Promise(resolve=>unblock=resolve);
  index.metadataParser.parse=async(text,...args)=>{if(text==='unrelated held body'){arrived();await gate;}return parse(text,...args);};
  const unrelated=index.patchMarkdownPaths(['U.md']);await deadline(reached,'actual unrelated patch parser');
  let retirementReached;
  if(variant==='late-retirement'){
   const ensure=index.ensureSemanticScope.bind(index);let arrived;retirementReached=new Promise(resolve=>arrived=resolve);const retired=new Promise(resolve=>releaseRetirement=resolve);
   index.ensureSemanticScope=async(...args)=>{await ensure(...args);arrived();await retired;};
  }
  release=index.acquireSemanticDemand('A.md');await deadline(retirementReached??settleDemand(index),'blocked demand settles without holding build');
  ok(!index.fieldCache.has('A.md'),'Blocked owner has not acquired center body');equal(f.reads,['U.md'],'No extra source work while unrelated owner is held');
  ok(index.hasPendingSemanticPreparation(),'A genuinely blocked live demand remains pending');
  if(variant==='released'){release();release=null;}
  if(variant==='reacquired'){release();otherRelease=index.acquireSemanticDemand('Other.md');otherRelease();otherRelease=null;release=index.acquireSemanticDemand('A.md');await deadline(settleDemand(index),'new demand lifetime defers');}
  if(variant==='baseline-reset')ok(await deadline(index.refreshOnDemandGraph([],true),'actual structural baseline reset'),'Fresh baseline owner settles');
  if(variant==='policy-change')index.invalidateSemanticPolicy();
  if(variant==='purged')ok(await deadline(index.purgePersistentIndexCache(),'actual purge'),'Cache owner closes');
  if(variant==='destroyed')index.destroy();
  unblock();const result=await deadline(unrelated,'unrelated patch finishes');
  if(variant==='late-retirement'){equal(index.onDemandBuildWaiters.size,1,'Completion preserves notification while older exact center task retires');releaseRetirement();}
  await deadline(settleDemand(index),'deferred center after dependency completion');
  equal(index.onDemandTasks.size,0,'No stranded center task');equal(index.onDemandBuildWaiters.size,0,'No stranded dependency notification');
  if(variant==='released'||variant==='purged'||variant==='destroyed')equal(f.reads,['U.md'],'Retired demand never acquires a body after dependency completion');
  else{
   const relation=index.semanticRelationSource(index.get('A.md')).page.neighbours.get('B.md');
   ok(relation?.isChild&&relation.childType===1,'Stationary live center gains actual explicit Child declaration without navigation');
   equal(f.reads.filter(path=>path==='A.md').length,1,'Center acquired once');equal(f.reads.filter(path=>path==='B.md').length,1,'Direct owner acquired once');
   equal(f.reads.filter(path=>path==='Other.md').length,0,'Superseded unrelated center is not acquired');
   equal(index.semanticPreparationDiagnostics.fullBuilds,0,'No full compilation manufactures recovery');
  }
  if(variant==='stationary')equal(result.outcome,'patched','Unrelated source committed normally');
  return true;
 }finally{unblock?.();releaseRetirement?.();otherRelease?.();release?.();o.close();}
})()`));

for(const variant of ['lookup','handover']) test('issue-161 published local native neighbor remains addressable before source acquisition ('+variant+')',async()=>scenario(`(async()=>{
 const variant=${JSON.stringify(variant)},o=await onDemandFixture('pr172-borrowed-native-'+variant);const{f,index}=o;let release,releaseChild,unblock,unsubscribePublication;
 const deadline=async(promise,label)=>{let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Deadline: '+label)),5000);})]);}finally{clearTimeout(timer);}};
 try{
  f.add('A.md','Child:: [[B]]');f.app.metadataCache.unresolvedLinks={'A.md':{B:1}};
  ok(await index.initializeOnDemandBaseline(),'Real native baseline');release=index.acquireSemanticDemand('A.md');await settleDemand(index);
  ok(index.getNeighborhood('A.md').children.some(n=>n.page.path==='B'&&!n.page.file),'Actual explicit ghost before native creation');
  const file=f.add('B.md','');o.bump();f.app.vault.trigger('create',file);f.app.metadataCache.unresolvedLinks={'A.md':{}};f.app.metadataCache.resolvedLinks={'A.md':{'B.md':1}};
  f.app.metadataCache.trigger('changed',file);f.app.metadataCache.trigger('resolve',file);f.app.metadataCache.trigger('resolved');
  const parse=index.metadataParser.parse.bind(index.metadataParser);let arrived;
  const reached=new Promise(resolve=>arrived=resolve),gate=new Promise(resolve=>unblock=resolve);
  index.metadataParser.parse=async(text,...args)=>{if(text===''){arrived();await gate;}return parse(text,...args);};
  let observed=false;
  unsubscribePublication=index.subscribePresentation(()=>{
   if(observed||index.onDemandHostScopes.get('A.md')?.pages.get('B.md')?.file!==file)return;
   observed=true;
   ok(!index.state.pages.has('B.md'),'Initial borrowed read does not manufacture canonical membership');
   ok(index.get('B.md')?.file===file&&index.getVaultSearchPage('B.md')?.file===file,'Exact lookup agrees synchronously with published native neighbor');
   const reads=f.reads.length;
   if(variant==='lookup'){
    const mtime=file.stat.mtime,size=file.stat.size;file.stat.mtime++;ok(!index.get('B.md'),'Unnotified revision change rejects borrowed endpoint');file.stat.mtime=mtime;
    file.stat.size++;ok(!index.get('B.md'),'Same-mtime size change rejects borrowed endpoint');file.stat.size=size;
    f.add('B.md','');ok(!index.get('B.md'),'Same-stat native replacement rejects borrowed identity');f.files.set(file.path,file);
    f.files.delete(file.path);ok(!index.get('B.md'),'Deleted native endpoint is never borrowed');f.files.set(file.path,file);
   }
   equal(f.reads.length,reads,'Synchronous endpoint safety checks acquire no source/body');
  });
  const refresh=index.refreshOnDemandGraph(['A.md']);
  // The baseline defect ends its task before acquisition. The fix reaches the real parser hold.
  await deadline(Promise.race([reached,refresh]),'new native endpoint publication');
  const displayed=index.getNeighborhood('A.md').children.find(n=>n.page.file===file)?.page;
  ok(displayed&&displayed.path==='B.md','Published parent scope renders exact current native child');
  ok(observed,'Actual publication was observed before ordinary canonical admission');
  ok(index.get('B.md')?.file===file,'Rendered native child resolves through exact lookup');
  ok(index.getVaultSearchPage('B.md')?.file===file,'Existing physical navigation lookup agrees');
  ok(!index.isSemanticWriteReady('A.md','B.md'),'Provisional endpoint cannot grant source write authority');
  if(variant==='handover'){
   let ready;const childScope=new Promise(resolve=>ready=resolve);
   const unsubscribe=index.subscribePresentation(()=>{if(index.onDemandHostScopes.has('B.md'))ready();});
   try{releaseChild=index.acquireSemanticDemand('B.md');await deadline(childScope,'child own-center preview');}finally{unsubscribe();}
   release();release=null;ok(index.get('B.md')?.file===file,'Own-center demand preserves native identity when parent scope retires');
  }
  unblock();await deadline(refresh,'normal patch refresh');await deadline(settleDemand(index),'final center handover');
  ok(index.get('B.md')?.file===file,'Settled native identity remains addressable');ok(index.fieldCache.has('B.md'),'Normal selected owner actually acquires the new body');return true;
 }finally{unblock?.();unsubscribePublication?.();releaseChild?.();release?.();o.close();}
})()`));

for(const variant of ['ghost','replaced-native']) test('current physical availability outranks a superseded exact-path canonical identity ('+variant+')',async()=>scenario(`(async()=>{
 const variant=${JSON.stringify(variant)},o=await onDemandFixture('pr172-physical-canonical-mask-'+variant);const{f,index}=o;
 try{
  f.add('A.md','Child:: [[Late.md]]');
  if(variant==='ghost')f.app.metadataCache.unresolvedLinks={'A.md':{'Late.md':1}};
  else{f.add('Late.md','');f.app.metadataCache.resolvedLinks={'A.md':{'Late.md':1}};}
  ok(await index.rebuild(),'Actual old canonical source graph');
  const old=index.state.pages.get('Late.md');ok(old,'Exact-path old canonical endpoint exists');
  if(variant==='ghost')ok(!old.file,'Real unresolved source keeps exact suffix coordinate');
  const file=f.add('Late.md','');o.bump();f.app.vault.trigger('create',file);index.updateHostFileAvailability(file.path,file);
  ok(index.getVaultSearchPage(file.path)?.file===file,'New exact native availability wins over prior canonical identity');
  ok(index.search('Late',10,'vault-files').some(page=>page.file===file),'Find cannot be masked by the old same-path record');
  ok(index.get(file.path)?.file===file,'Navigation lookup agrees on exact current native identity');
  ok(index.state.pages.get(file.path)===old,'Read availability never rewrites canonical provenance');
  ok(!index.isSemanticWriteReady('A.md',file.path),'Physical replacement cannot grant new source authority');
  return true;
 }finally{o.close();}
})()`));

for(const variant of ['ordinary','deleted','renamed','replaced']) test('new provisional filenames survive an older full publication ('+variant+')',async()=>scenario(`(async()=>{
 const variant=${JSON.stringify(variant)},o=await onDemandFixture('pr172-provisional-publication-'+variant);const{f,index}=o;let unblock;
 try{
  f.add('A.md','');ok(await index.initializeOnDemandBaseline(),'Initial native baseline');
  const prepare=index.preparePresentationPublication.bind(index);let arrived,held=false;
  const reached=new Promise(resolve=>arrived=resolve),gate=new Promise(resolve=>unblock=resolve);
  // The compiler's physical inventory is captured; presentation must still capture the newer host
  // observation normally. Holding after original preparation instead correctly rejects publication.
  index.preparePresentationPublication=async(...args)=>{if(!held){held=true;arrived();await gate;}return prepare(...args);};
  const build=index.rebuild();await reached;
  let file=f.add('Late.md','');o.bump();f.app.vault.trigger('create',file);index.updateHostFileAvailability(file.path,file);
  ok(index.search('Late',10,'vault-files').some(page=>page.file===file),'Native filename appears while old publication is held');
  if(variant==='deleted'){f.files.delete(file.path);o.bump();f.app.vault.trigger('delete',file);index.updateHostFileAvailability(file.path);}
  if(variant==='renamed'){const old=file.path;f.files.delete(old);file.path='Moved.md';file.name=file.path;file.basename='Moved';f.files.set(file.path,file);o.bump();f.app.vault.trigger('rename',file,old);index.updateHostFileAvailability(old,file);}
  if(variant==='replaced'){file=f.add(file.path,'');o.bump();f.app.vault.trigger('create',file);index.updateHostFileAvailability(file.path,file);}
  unblock();ok(await build,'Older graph still publishes its captured source revision');
  if(variant==='deleted')ok(!index.search('Late',10,'vault-files').length&&!index.getVaultSearchPage('Late.md'),'Deleted provisional identity is not resurrected');
  else{
   ok(!index.state.pages.has(file.path),'Earlier private graph does not acquire later canonical authority');
   ok(index.getVaultSearchPage(file.path)?.file===file,'Current native availability survives older graph publication');
   ok(index.search(file.basename,10,'vault-files').some(page=>page.file===file),'Filename stays discoverable until catch-up');
   ok(index.fullSemanticSourceRevision!==index.plugin.getIndexSourceRevision(),'Provisional visibility does not certify the newer source epoch');
   index.insertCreatedFile(file);
   equal((await index.patchMarkdownPaths([file.path])).outcome,'patched','Existing native admission and normal source-local catch-up own the endpoint');
   ok(index.state.pages.get(file.path)?.file===file,'Catch-up publishes actual canonical identity');
   ok(!index.physicalSearchUpdatedPaths.has(file.path)&&!index.physicalSearchEntries.has(file.path),'Covered native-event acceleration retires at ordinary source publication');
  }
  return true;
 }finally{unblock?.();o.close();}
})()`));

test('current native availability remains searchable over an older requested semantic scope',async()=>scenario(`(async()=>{
 const o=await onDemandFixture('pr172-physical-requested-scope-mask',{indexingMode:'eager'});const{f,index}=o;let release;
 try{
  f.add('A.md','Child:: [[Late.md]]');f.app.metadataCache.unresolvedLinks={'A.md':{'Late.md':1}};
  ok(await index.initializeOnDemandBaseline(),'Real native structural baseline');
  delete index.sourceAcquisition.enableInventory;index.plugin.startupDiagnostics.processed=()=>{};
  index.sourceAcquisition.enableInventory();ok(await index.sourceAcquisition.flush(),'Real durable source authority');
  release=index.acquireSemanticDemand('A.md');await index.ensureSemanticScope('A.md');
  const scope=index.semanticScopes.get('A.md'),ghost=scope?.pagesByPath.get('Late.md');
  ok(ghost&&!ghost.file,'Actual requested semantic publication owns an exact-path unresolved endpoint');
  const maintenance=index.sourceAcquisition.getMaintenanceRevision();
  const file=f.add('Late.md','');o.bump();f.app.vault.trigger('create',file);index.updateHostFileAvailability(file.path,file);
  ok(index.sourceAcquisition.getMaintenanceRevision()>maintenance,'Native create invalidates the prior requested source lifetime');
  ok(index.semanticScopes.get('A.md')===scope,'Coherent prior requested scope remains published while local repair is pending');
  ok(index.getVaultSearchPage(file.path)?.file===file,'Explicit physical lookup owns the new native identity');
  const hits=index.search('Late',10,'vault-files').filter(page=>page.path===file.path);
  equal(hits.length,1,'Actual Find catalog keeps one current file despite the retained semantic ghost');
  ok(hits[0].file===file,'Actual Find and explicit lookup select the same current native identity');
  ok(!index.isSemanticWriteReady('A.md',file.path),'Physical discovery does not certify fresh source authority');
  return true;
 }finally{release?.();o.close();}
})()`));

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

for(const mode of ['on-demand','eager'])for(const remove of [false,true])for(const sameStat of [false,true])test('pending body replacement retains its prior parent presentation then publishes the real result ('+mode+', remove='+remove+', same-stat='+sameStat+')',async()=>scenario(`(async()=>{
 const o=await onDemandFixture('save-parent-'+${JSON.stringify(mode)}+'-'+${remove}+'-'+${sameStat},{indexingMode:${JSON.stringify(mode)}});const{f,index}=o;let release,unblock;
 try{
  const file=f.add('A.md','Parent:: [[B]]');f.add('B.md','');f.app.metadataCache.resolvedLinks={'A.md':{'B.md':1}};
  ok(await index.initializeOnDemandBaseline(),'Physical baseline');release=index.acquireSemanticDemand('A.md');await settleDemand(index);
  equal(index.getNeighborhood('A.md').parents.map(row=>row.page.path),['B.md'],'Actual body-defined parent initially compiled');
  const commits=[],publish=index.publishIncrementalFile;index.publishIncrementalFile=(commit,apply)=>{commits.push(commit.semanticChanged);return publish(commit,apply)};
  const parse=index.metadataParser.parse.bind(index.metadataParser);let entered,first=true;const parsing=new Promise(resolve=>entered=resolve),hold=new Promise(resolve=>unblock=resolve);
  index.metadataParser.parse=async(...args)=>{if(first){first=false;entered();await hold}return parse(...args)};
  f.texts.set('A.md',${remove}?'Prose without the parent declaration.':'Parent:: [[B]]\\n\\nAnother paragraph.');if(!${sameStat})file.stat.mtime++;
  f.app.metadataCache.resolvedLinks={'A.md':${remove}?{}:{'B.md':1}};
  f.app.vault.trigger('modify',file);o.bump();index.refreshVisibleHostMetadataPreviews('A.md',0);await parsing;
  equal(index.getNeighborhood('A.md').parents.map(row=>row.page.path),['B.md'],'Pending host projection cannot demote a compiled body parent');
  ok(!index.isSemanticWriteReady('A.md','B.md'),'Presentation retention never renews source or relationship-write authority');
  unblock();await settleDemand(index);
  equal(index.getNeighborhood('A.md').parents.map(row=>row.page.path),${remove}?[]:['B.md'],'Real replacement publishes after parsing, including parent removal');
  equal(index.onDemandIndexed.get('A.md').mtime,file.stat.mtime,'Newest source revision is indexed');
  if(!${remove}){ok(commits.length>0,'The ordinary source patch still commits');ok(commits.every(changed=>!changed),'Prose-only source uses existing fingerprint no-op instead of forced compilation')}
  equal(o.inventoryStarts,0,'No global inventory/rebuild workaround');return true;
 }finally{unblock?.();release?.();o.close()}
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

for(const operation of ['materialize','rename']) test('a settled gate task retires its captured key after '+operation,async()=>scenario(`(async()=>{
  const operation=${JSON.stringify(operation)},o=await onDemandFixture('gate-admission-coordinate-'+operation);const {f,index}=o;let unblock;
  try{
    f.add('A.md','');const file=operation==='rename'?f.add('Old.md',''):undefined;
    if(file)f.app.metadataCache.resolvedLinks={'A.md':{'Old.md':1}};
    else f.app.metadataCache.unresolvedLinks={'A.md':{Ghost:1}};
    ok(await index.initializeOnDemandBaseline(),'Actual native baseline');
    const original=operation==='rename'?'Old.md':'Ghost',page=index.state.pages.get(original);ok(page,'Canonical mutable endpoint');
    let entered,oldCurrent;const reached=new Promise(resolve=>entered=resolve),gate=new Promise(resolve=>unblock=resolve);
    const build=index.hostPreview.build.bind(index.hostPreview),calls=[];
    index.hostPreview.build=async(path,options={})=>{
      if(options.completeHostCover){calls.push(path);if(path===original){oldCurrent=options.isCurrent;entered();await gate;}}
      return build(path,options);
    };
    const reads=f.reads.length,parses=o.parses.length;
    index.gateStats(page);const oldTask=index.onDemandGateTasks.get(original);ok(oldTask,'Actual count task registered at admission');await reached;
    let current;
    if(operation==='materialize'){
      current=f.add('New.md','');ok(index.materializeFile(original,current),'Actual placeholder promotion');
    }else{
      current=file;f.files.delete(original);file.path='New.md';file.name='New.md';file.basename='New';f.files.set(file.path,file);
      index.invalidateHostStructure();f.app.vault.trigger('rename',file,original);ok(index.renameFile(original,file),'Actual native rename');
    }
    equal(page.path,current.path,'Canonical endpoint retains identity at new coordinate');ok(!oldCurrent(),'Old count proof rejects moved admission coordinate');
    unblock();await oldTask;
    equal(index.onDemandGateTasks.size,0,'Settled old task removed by original registration key');
    ok(!index.hasActiveSemanticPreparation()&&!index.hasPendingSemanticPreparation(),'Settled renamed counts cannot leave indexing active');
    ok(!index.onDemandGateCounts.has(page),'Rejected old request publishes no new-coordinate count proof');
    index.gateStats(index.get(current.path));const fresh=index.onDemandGateTasks.get(current.path);ok(fresh,'Current coordinate can admit a fresh count request');await fresh;
    equal(index.onDemandGateTasks.size,0,'Fresh count task settles normally');ok(calls.includes(current.path),'Current cover uses current coordinate');
    equal(f.reads.length,reads,'Count lifecycle adds no body reads');equal(o.parses.length,parses,'Count lifecycle adds no parsing');return true;
  }finally{unblock?.();o.close();}
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
    index.destroy();index=new sourceModules.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>0,startupDiagnostics:{mark:()=>{},count:()=>{},phase:()=>{},processed:()=>{},recordWork:/** Restart fixture retains the passive diagnostics interface. */()=>{}}},f.app);
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

for (const mode of ['on-demand','eager']) test('a superseded local host cover retries before a new-target patch fallback can strand a stationary center ('+mode+')',async()=>scenario(`(async()=>{
  const o=await onDemandFixture('local-cover-url-epoch-race-${mode}',{indexingMode:${JSON.stringify(mode)},lastActivePath:'Anchor.md'});const{f,index}=o;let release,unblock;
  try{
    f.add('Anchor.md','');ok(await index.initializeOnDemandBaseline(),'Existing local structural baseline');
    f.add('A.md','',{Parent:'[[B]]'});f.add('B.md','');f.app.metadataCache.resolvedLinks['A.md']={'B.md':1};
    index.hostPreview.refreshSource('A.md');await index.primePhysicalSearchCatalog();
    ok(!index.state.pages.has('A.md')&&!index.state.pages.has('B.md'),'Native late-created endpoints are not an invented canonical baseline');
    const build=index.hostPreview.build.bind(index.hostPreview),patch=index.patchMarkdownPaths.bind(index),outcomes=[],attemptWork=[];
    let entered,first=true,attempts=0;const reached=new Promise(resolve=>entered=resolve),hold=new Promise(resolve=>unblock=resolve);
    index.hostPreview.build=async(...args)=>{if(args[0]==='A.md'&&args[1]?.completeHostCover){attempts++;attemptWork.push([f.reads.length,o.parses.length]);if(first){first=false;entered();await hold;}}return build(...args)};
    index.patchMarkdownPaths=(...args)=>{const result=patch(...args);void result.then(value=>outcomes.push(value.outcome));return result};
    index.rebuild=()=>{throw Error('Local cover recovery must not request a full build')};
    release=index.acquireSemanticDemand('A.md');await reached;
    ok(index.search('B',10,'vault-files').some(page=>page.path==='B.md'),'Foreground physical Find remains available while host preparation is held');
    const epoch=index.onDemandGateRevisions.get('A.md')??0;
    index.publishUrlSearch(new Set(['A.md']));equal(index.onDemandGateRevisions.get('A.md'),epoch+1,'Actual URL publication supersedes the captured host cover');
    unblock();await settleDemand(index);
    ok(outcomes.includes('needs-rebuild'),'Actual ordinary patch conservatively refuses the absent target baseline');
    equal(index.getNeighborhood('A.md').parents.map(node=>node.page.path),['B.md'],'Stationary demand gets the current host Parent despite patch fallback');
    equal(attempts,2,'Only the superseded host preparation retries; no polling owner');
    equal(attemptWork,[[0,0],[0,0]],'The host-only retry adds no Markdown reads or parsing');
    equal(index.onDemandTasks.size,0,'Actual demand drains after the current cover publishes');
    ok(!index.isSemanticWriteReady('A.md','B.md'),'Local host read does not manufacture canonical write authority');
    equal(o.inventoryStarts,0,'No global inventory is started');return true;
  }finally{unblock?.();release?.();o.close();}
})()`));

for (const mode of ['on-demand','eager']) test('retiring demand stops a superseded local host cover without retrying or publishing its stale result ('+mode+')',async()=>scenario(`(async()=>{
  const o=await onDemandFixture('local-cover-retired-demand-${mode}',{indexingMode:${JSON.stringify(mode)}});const{f,index}=o;let release,unblock;
  try{
    f.add('A.md','',{Parent:'[[B]]'});f.add('B.md','');f.app.metadataCache.resolvedLinks['A.md']={'B.md':1};
    ok(await index.initializeOnDemandBaseline(),'Baseline');
    const build=index.hostPreview.build.bind(index.hostPreview);let entered,attempts=0;
    const reached=new Promise(resolve=>entered=resolve),hold=new Promise(resolve=>unblock=resolve);
    index.hostPreview.build=async(...args)=>{if(args[0]==='A.md'&&args[1]?.completeHostCover){attempts++;entered();await hold;}return build(...args)};
    release=index.acquireSemanticDemand('A.md');await reached;index.publishUrlSearch(new Set(['A.md']));
    release();release=null;unblock();await settleDemand(index);
    equal(attempts,1,'A retired view cannot retry host preparation');ok(!index.onDemandHostScopes.has('A.md'),'No stale local cover is published');
    equal(f.reads.length,0,'Canceled host-only preparation reads no note body');equal(o.inventoryStarts,0,'No global inventory');return true;
  }finally{unblock?.();release?.();o.close();}
})()`));
