/** Exact editable-pair mutations and native metadata convergence over real Chromium IndexedDB. */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { contributorBrowserBundle, contributorBrowserInitialize } from "./support/contributorBrowserFixture.mjs";
import { chromiumHarness } from "./support/browserTypeScript.mjs";
import { collect, hostOracle } from "./support/cachedSourceFixture.mjs";
import { centerGateSettings } from "./support/requestedCenterGateFixture.mjs";

/** Extract actual host mutation methods; only their native Plugin shell is replaced in the browser. */
function productionMethods() {
  const source=ts.createSourceFile("main.ts",readFileSync(new URL("../src/main.ts",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  const names=new Set(["prepareRelationshipMutation","publishSavedRelationship","mutateRelationshipMetadata","writeRelationship",
    "addRelationshipOntology","clearFrontmatterRelationship","createRelationToPage","addOntologyToConnection","relinkCentralNeighbour",
    "unlinkFrontmatterEvidence","captureFrontmatterUnlinkExpectation","referenceForPage","referenceMatchesTarget","nonTargetReferenceCounts","valueContainsTarget","removeTargetFromValue","stripTargetFromScalar",
    "normalizedNoteReferenceMatches","inverseOntologyField","inverseRelationshipRole","allOntologyFields","ontologyRoleForField","defaultOntologyField","ontologyFieldsForRole","linkNewRelatedFile","createWebLinkRelatedPage","createPlaceholderRelatedPage","normalizedWebUrl","placeholderPath","configuredDisplayNameField"]), methods=[];
  /** Keep the method body intact and remove only the inaccessible native class wrapper. */
  function visit(node) {
    if(ts.isMethodDeclaration(node)&&names.has(node.name.getText(source))) {
      const text=node.getText(source);methods.push(`${node.name.getText(source)}: ${node.modifiers?.some(m=>m.kind===ts.SyntaxKind.AsyncKeyword)?"async ":""}function${text.slice(text.indexOf("("))}`);
    }
    ts.forEachChild(node,visit);
  }
  visit(source);assert.equal(methods.length,names.size);
  return ts.transpileModule("window.relationshipMethods={"+methods.join(",\n")+"};",{compilerOptions:{target:ts.ScriptTarget.ES2021,module:ts.ModuleKind.None}}).outputText;
}
const bundle=await contributorBrowserBundle(["src/index/GraphIndex.ts","src/index/GraphBuilder.ts","src/index/IndexSnapshot.ts",
  "src/core/graph/compiler.ts","src/core/graph/evidence.ts","src/core/graph/relations.ts","src/adapters/obsidian/metadataSourceCollector.ts",
  "src/adapters/obsidian/ontologySourceCollector.ts","src/adapters/obsidian/relationshipMetadataWrite.ts","src/application/frontmatterUnlink.ts"]);
const methods=`const assert=Object.assign((value,message)=>ok(value,message),{equal}),M=sourceModules,normalizeFieldName=M.normalizeFieldName,extractLinksFromValue=M.extractLinksFromValue;
const writeRelationshipMetadata=M.writeRelationshipMetadata,SavedRelationshipPendingError=M.SavedRelationshipPendingError;
const relationshipMetadataPayload=M.relationshipMetadataPayload,SOURCE_DECODE_BUDGET_BYTES=M.SOURCE_DECODE_BUDGET_BYTES;
const frontmatterDeclarationKey=M.frontmatterDeclarationKey,iterateResolvedLinksFromValue=M.iterateResolvedLinksFromValue;
const normalizePath=x=>x,LinkDirection=M.LinkDirection,Notice=class{constructor(message){window.notices.push(message);}};
const isUnknownRecord=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);${productionMethods()}`;
const setup=`window.notices=[];${methods}
window.makeRelationshipFixture=async name=>{
 const f=await fixture(name),collect=${collect.toString()},hostOracle=${hostOracle.toString()},centerGateSettings=${centerGateSettings.toString()};
 f.text=f.texts;f.add('A.md','[[Unrelated]]');f.add('B.md','',{Parents:['[[A]]']});f.add('Unrelated.md','');f.add('image.png','');
 f.add('URL-owner.md','[Upper](https://Obsidian.md)\\n[Lower](https://obsidian.md)',{Children:['[[image.png]]']});
 for(let i=0;i<80;i++)f.add('Shared-'+i+'.md','[Shared](https://Obsidian.md)');
 const semantic={hierarchy:{hidden:[],parents:['Parents'],children:['Children'],leftFriends:['Friends'],rightFriends:['Opposes'],previous:[],next:[],exclusions:[]},inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
 f.app.metadataCache.resolvedLinks['A.md']={'Unrelated.md':1};
 f.app.vault.getName=()=>name;f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??(path===''||path==='/'?f.app.vault.getRoot():null);
 await f.acquire();ok(await f.acquisition.reconcile(),'Seed genuine source inventory');
 const compilation=await hostOracle(f,f.app.vault.getMarkdownFiles().map(file=>file.path),semantic,{noteTypeField:'Type',primaryTagField:'Style'},true);
 f.acquisition.close();
 const plugin={app:f.app,settings:{indexingMode:'eager',...semantic,...centerGateSettings({showFolderNodes:false,showTagNodes:false}),lastActivePath:'',pinnedNodes:[]},getIndexSourceRevision:()=>index.sourceAcquisition.getMaintenanceRevision()};
 const index=new M.GraphIndex(plugin,f.app),builder=new M.GraphBuilder(plugin,f.app,new Map(),index.metadataParser,index.indexedDb,()=>true);
 index.state=await builder.bindCompiledGraph(compilation,{materializedFile:facet=>f.files.get(facet.path)??null});
 ok(await index.sourceAcquisition.reconcile(),'Actual index reuses authenticated sources');
 f.acquisition=index.sourceAcquisition;
 const context={...relationshipMethods,app:f.app,index,settings:plugin.settings,translator:key=>key,
  relationshipWriteCancels:new Set(),managedMetadataWrites:new Map(),pruneManagedMetadataWrites:()=>{}};
 f.app.fileManager={generateMarkdownLink:file=>'[['+file.path+']]',processFrontMatter:async(file,update)=>{
  const frontmatter=structuredClone(f.metadata.get(file.path).frontmatter??{});update(frontmatter);
  file.stat.mtime++;const body=f.texts.get(file.path);f.texts.set(file.path,body+'\\n');
  f.app.vault.trigger('modify',file);const cache={...f.metadata.get(file.path),frontmatter};f.metadata.set(file.path,cache);
  f.app.metadataCache.trigger('changed',file,f.texts.get(file.path),cache);
 }};
 return {...f,index,plugin,context,close(){for(const cancel of context.relationshipWriteCancels)cancel();index.destroy();f.cache.close();}};
};`;

/** Saved pair replacements must compose across edits without changing unedited old-policy relations. */
test("canonical pair edits preserve earlier relationships, normalized URL authority, inverse provenance and old-policy baselines",async()=>{
 const browser=await chromiumHarness(bundle);
 try{
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
  assert.equal(await browser.evaluate(`(async()=>{
   const f=await makeRelationshipFixture('pair-edits'),i=f.index,c=f.context;
   try{
    const oldSettings=i.fullSemanticSettings;
    // An actual retained complete scope from the old policy, not a sparse policy-number surrogate.
    i.invalidateSemanticPolicy();await i.ensureSemanticScope('A.md');ok(i.semanticScopes.has('A.md'),'Old canonical scope published');
    c.settings.inferAllLinksAsFriends=true;i.invalidateSemanticPolicy();
    const oldRole=i.neighbours(i.get('A.md'),'child').some(x=>x.page.path==='Unrelated.md');ok(oldRole,'Old coherent inferred body relationship');
    // This actual unrelated task must never be joined by the pair mutation consumer.
    let release;const blocked=new Promise(done=>{release=done});i.semanticPreparationTasks.set('https://dense.example.com',{task:blocked});
    const url='https://obsidian.md',upper='https://Obsidian.md';
    const read=i.sourceAcquisition.prepareRequestedPair.bind(i.sourceAcquisition),covers=[];
    i.sourceAcquisition.prepareRequestedPair=async(...args)=>{const result=await read(...args);if(result.outcome==='ready')covers.push(result.certificate.sourceIds);return result;};
    await c.createRelationToPage(i.get('A.md'),'child',i.get('image.png'),'Children');
    ok(i.get('A.md').neighbours.has('image.png'),'Direct get reflects retained-scope overlay');
    ok(i.neighbours(i.get('image.png'),'parent').some(x=>x.page.path==='URL-owner.md'),'Attachment retains genuine pre-existing incidence');
    await c.createRelationToPage(i.get('A.md'),'child',i.get(url),'Children');
    ok(i.neighbours(i.get('A.md'),'child').some(x=>x.page.path==='image.png'),'First saved attachment remains visible after URL commit');
    ok(i.neighbours(i.get('A.md'),'child').some(x=>x.page.path===url),'Canonical web URL is child');
    equal(i.get(upper),i.get(url),'Host capitalization selects the same canonical URL node');
    ok(i.neighbours(i.get(url),'parent').length>80,'URL neighbor page preserves its genuine full baseline incidence');
    ok(covers.every(ids=>!ids.some(id=>id.startsWith('Shared-'))),'Editable document pair omits unrelated shared URL owners');
    ok(i.neighbours(i.get('A.md'),'child').some(x=>x.page.path==='Unrelated.md'),'Unedited body edge still uses retained old policy');
    equal(i.fullSemanticSettings,oldSettings,'No mixed-policy base mutation');
    let candidate=i.evidenceBetween('A.md','image.png').find(x=>x.sourceKind==='frontmatter-ontology');ok(candidate,'Canonical exact attachment provenance');
    ok(await c.unlinkFrontmatterEvidence(candidate),'Immediate attachment unlink succeeds');
    ok(!i.isConnected(i.get('A.md'),'image.png'),'Negative overlay removes old-scope relationship');
    ok(i.isConnected(i.get('A.md'),url),'Later URL remains visible after earlier pair unlink');
    ok(await i.prepareRelationshipPair('A.md',url),'Refresh exact URL provenance after another property edit');candidate=i.evidenceBetween('A.md',url).find(x=>x.sourceKind==='frontmatter-ontology');equal(candidate.rawValue,JSON.stringify([url]),'Raw exact URL provenance');
    ok(await c.unlinkFrontmatterEvidence(candidate),'Immediate raw URL unlink succeeds');ok(!i.isConnected(i.get('A.md'),url),'Exact URL relationship removed');
    await c.relinkCentralNeighbour(i.get('A.md'),i.get('B.md'),'child','Children');
    const inverse=i.evidenceBetween('A.md','B.md').filter(x=>x.sourceKind==='frontmatter-ontology');ok(inverse.length===1&&inverse[0].declaredByPath==='B.md','Inverse Markdown owner preserved');
    ok(i.isSemanticWriteReady('A.md','B.md'),'Immediate exact-pair authority current');
    const before=i.getSemanticRevision();ok(await i.prepareRelationshipPair('A.md','B.md'),'Canonical recheck ready');equal(i.getSemanticRevision(),before+1,'One atomic semantic publication');
    equal(i.getSemanticPreparationDiagnostics().fullBuilds,0,'No whole-vault rebuild');
    release();i.semanticPreparationTasks.delete('https://dense.example.com');return true;
   }finally{f.close();}
  })()`),true);
 }finally{await browser.cleanup();}
});

/** Endpoint navigation must not retire an edit while another endpoint still selects an older scope. */
test("saved relationships survive endpoint scope publication and subsequent pair unlink",async()=>{
 const browser=await chromiumHarness(bundle);
 try{
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
  assert.equal(await browser.evaluate(`(async()=>{
   const f=await makeRelationshipFixture('pair-navigation'),i=f.index,c=f.context;
   try{
    i.invalidateSemanticPolicy();await i.ensureSemanticScope('A.md');
    await c.createRelationToPage(i.get('A.md'),'parent',i.get('Unrelated.md'),'Parents');
    ok(i.neighbours(i.get('A.md'),'parent').some(x=>x.page.path==='Unrelated.md'),'Saved parent visible');
    await i.ensureSemanticScope('Unrelated.md');
    ok(i.neighbours(i.get('A.md'),'parent').some(x=>x.page.path==='Unrelated.md'),'Endpoint publication retains saved parent');
    ok(i.relationshipPairs.size===1,'One incomplete directed baseline retains the pair replacement');
    await i.ensureSemanticScope('A.md');
    ok(i.relationshipPairs.size===1,'Scoped publication retains the pair until the full fallback absorbs it');
    ok(i.get('A.md').neighbours.has('Unrelated.md'),'Direct get prefers complete incidence over a sparse endpoint');
    i.publishRestoredState(i.state);
    ok(i.relationshipPairs.size===1&&i.neighbours(i.get('A.md'),'parent').some(x=>x.page.path==='Unrelated.md'),'Unchanged full fallback cannot discard the saved parent');
    await c.createRelationToPage(i.get('A.md'),'child',i.get('image.png'),'Children');
    await i.ensureSemanticScope('image.png');
    const candidate=i.evidenceBetween('A.md','image.png').find(x=>x.sourceKind==='frontmatter-ontology');
    ok(candidate&&await c.unlinkFrontmatterEvidence(candidate),'Subsequent child unlink succeeds');
    ok(i.neighbours(i.get('A.md'),'parent').some(x=>x.page.path==='Unrelated.md'),'Subsequent unlink retains earlier parent');
    ok(await i.rebuild(),'Actual full rebuild publishes canonical saved properties');
    ok(i.relationshipPairs.size===0,'Full publication retires absorbed positive and negative pairs');
    ok(i.neighbours(i.get('A.md'),'parent').some(x=>x.page.path==='Unrelated.md'),'Parent survives actual pair retirement');
    return true;
   }finally{f.close();}
  })()`),true);
 }finally{await browser.cleanup();}
});

/** Ordinary endpoint events refresh saved overlays without globally discarding other exact edits. */
test("selected host changes replace retained pairs while unrelated saved targets survive",async()=>{
 const browser=await chromiumHarness(bundle);
 try{
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
  assert.equal(await browser.evaluate(`(async()=>{
   const f=await makeRelationshipFixture('pair-preview-refresh'),i=f.index,c=f.context;
   try{
    const refresh=i.refreshChangedRelationshipPairs.bind(i);let refreshTask;
    i.refreshChangedRelationshipPairs=(...args)=>{refreshTask=refresh(...args);return refreshTask;};
    f.plugin.settings.lastActivePath='A.md';
    await c.createRelationToPage(i.get('A.md'),'child',i.get('image.png'),'Children');
    await c.createRelationToPage(i.get('A.md'),'child',i.get('https://Obsidian.md'),'Children');
    ok(i.isConnected(i.get('A.md'),'image.png'),'Saved attachment overlay is present');
    // Use actual Vault/MetadataCache changes, without a managed mutation preparation call.
    const change=async(path,frontmatter)=>{
     const file=f.files.get(path);file.stat.mtime++;f.texts.set(path,f.texts.get(path)+'\\n');
     f.app.vault.trigger('modify',file);const cache={...f.metadata.get(path),frontmatter};f.metadata.set(path,cache);
     f.app.metadataCache.trigger('changed',file,f.texts.get(path),cache);i.refreshVisibleHostMetadataPreviews(path);
     await refreshTask;
     while(i.relationshipPairTasks.size)await Promise.all([...i.relationshipPairTasks.values()]);
    };
    await change('Unrelated.md',{Title:'Changed'});
    ok(i.isConnected(i.get('A.md'),'image.png'),'Unrelated endpoint churn retains saved overlay');
    await change('A.md',{Children:['https://Obsidian.md']});
    ok(!i.isConnected(i.get('A.md'),'image.png'),'Current negative canonical pair replaces removed saved attachment');
    equal(i.evidenceBetween('A.md','image.png').length,0,'Stale ontology evidence cannot shadow current negative pair');
    ok(i.isConnected(i.get('A.md'),'https://Obsidian.md'),'Other saved target remains after same-source edit');
    ok(await i.prepareRelationshipPair('A.md','B.md'),'Inverse declaration has an exact retained overlay');
    ok(i.isConnected(i.get('A.md'),'B.md'),'Inverse B declaration present');
    await change('B.md',{});ok(!i.isConnected(i.get('A.md'),'B.md'),'Inverse-owner edit also replaces its saved pair');
    equal(i.getSemanticPreparationDiagnostics().fullBuilds,0,'No whole-vault build needed');return true;
   }finally{f.close();}
  })()`),true);
 }finally{await browser.cleanup();}
});

/** Delayed/old metadata events and saved cancellation must never silently complete a commit. */
for(const mode of ['delayed-conflict','old-event','no-op','cancel','rename','delete']){
 test(`frontmatter convergence ${mode} retains authoritative write semantics`,async()=>{
  const browser=await chromiumHarness(bundle);
  try{
   assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
   assert.equal(await browser.evaluate(`(async()=>{
    const f=await makeRelationshipFixture('metadata-${mode}'),mode=${JSON.stringify(mode)},file=f.files.get('A.md'),fields=new Set(['children','parents']);
    let cancel,notified=0,finished=false;
    const life={own:fn=>{cancel=fn;return()=>{cancel=null;}},pending:()=>notified++,savedPendingMessage:()=> 'saved-pending'};
    try{
     const old={frontmatter:{Children:['[[B]]'],Parents:['[[B]]']}},beforeBody=f.texts.get(file.path);f.metadata.set(file.path,old);
     const expected={Children:['[[B]]']};let publish;
     f.app.fileManager.processFrontMatter=async(selected,update)=>{
      const next=structuredClone(old.frontmatter);update(next);
      if(mode==='no-op'){f.metadata.set(file.path,{frontmatter:expected});return;}
      file.stat.mtime++;f.texts.set(file.path,beforeBody+'new');f.app.vault.trigger('modify',file);
      publish=()=>{const cache={frontmatter:next};f.metadata.set(file.path,cache);f.app.metadataCache.trigger('changed',file,f.texts.get(file.path),cache);};
     };
     if(mode==='no-op'){old.frontmatter=expected;f.app.fileManager.processFrontMatter=async(selected,update)=>update(old.frontmatter);}
     const task=M.writeRelationshipMetadata(f.app,file,fields,fm=>{fm.Children=['[[B]]'];delete fm.Parents;},life).then(()=>{finished=true;return 'ready';},e=>{finished=true;return e;});
     await Promise.resolve();await Promise.resolve();
     if(mode==='no-op'){equal(await task,'ready','Actual unchanged no-op may reuse cache authority');return true;}
     ok(!finished,'Desired target alone in stale cache is not authority');
     if(mode==='cancel'||mode==='rename'||mode==='delete'){
      if(mode==='cancel')cancel();else if(mode==='rename'){f.files.delete(file.path);file.path='Moved.md';f.app.vault.trigger('rename',file,'A.md');}else{f.files.delete(file.path);f.app.vault.trigger('delete',file);}
      const result=await task;ok(result instanceof M.SavedRelationshipPendingError,'Cancellation reports saved pending, not unsaved');return true;
     }
     if(mode==='old-event'){
      const cache={frontmatter:expected};f.metadata.set(file.path,cache);f.app.metadataCache.trigger('changed',file,beforeBody,cache);
      await new Promise(done=>setTimeout(done,0));ok(!finished,'Queued old event cannot authorize a newer body');
     }
     publish();equal(await task,'ready','Genuine matching cache/current body completes saved write');equal(cancel,null,'Observer released');equal(notified,0,'No false timeout completion');return true;
    }finally{cancel?.();f.close();}
   })()`),true);
  }finally{await browser.cleanup();}
 });
}

/** A newer selected observation drains an older exact task without borrowing its cancellation or negative result. */
for(const changeWhileDraining of [false,true]){
 test(`new selected pair observation ${changeWhileDraining?'cancels if changed again':'publishes after the retired task drains'}`,async()=>{
  const browser=await chromiumHarness(bundle);
  try{
   assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
   assert.equal(await browser.evaluate(`(async()=>{
    const f=await makeRelationshipFixture('pair-observation-${changeWhileDraining}'),i=f.index,changedAgain=${changeWhileDraining};let release;
    try{
     const prepare=i.sourceAcquisition.prepareRequestedPair.bind(i.sourceAcquisition);let entered,once=true,calls=0;
     const reached=new Promise(done=>entered=done),blocked=new Promise(done=>release=done);
     i.sourceAcquisition.prepareRequestedPair=async(...args)=>{calls++;const result=await prepare(...args);if(once){once=false;entered();await blocked;}return result;};
     const old=i.prepareRelationshipPair('A.md','image.png');ok(i.prepareRelationshipPair('A.md','image.png')===old,'Unchanged observation preserves original task identity');await reached;
     const file=f.files.get('A.md');file.stat.mtime++;f.texts.set(file.path,f.texts.get(file.path)+'\\n');f.app.vault.trigger('modify',file);
     const cache={...f.metadata.get(file.path),frontmatter:{Children:['[[image.png]]']}};f.metadata.set(file.path,cache);f.app.metadataCache.trigger('changed',file,f.texts.get(file.path),cache);
     const fresh=i.prepareRelationshipPair('A.md','image.png');ok(fresh!==old,'New observation owns a fresh task');
     ok(i.relationshipPairTasks.get(JSON.stringify(['A.md','image.png']))===fresh,'Alias/source owners drain the latest task including its predecessor');
     ok(i.prepareRelationshipPair('A.md','image.png')===fresh,'Same new observation shares queued original promise');equal(calls,1,'New task cannot overtake the retired exact writer');
     if(changedAgain)f.metadata.set(file.path,{...cache,frontmatter:{Children:['[[B]]']}});
     release();equal(await old,false,'Old caller remains cancelled after selected change');equal(await fresh,!changedAgain,'New caller may use only its own unchanged captured observation');
     equal(calls,changedAgain?1:2,'Fresh canonical source read occurs once only after drain');
     equal(i.relationshipPairTasks.size,0,'All task ownership released');
     if(!changedAgain){ok(i.isConnected(i.get('A.md'),'image.png'),'Authenticated current positive pair replaces the former negative');ok(i.evidenceBetween('A.md','image.png').some(e=>e.sourceKind==='frontmatter-ontology'),'Current exact declaration provenance');ok(i.isSemanticWriteReady('A.md','image.png'),'New canonical pair grants immediate write authority');}
     else ok(!i.isConnected(i.get('A.md'),'image.png'),'Cancelled new observation cannot publish evidence');
     equal(i.getSemanticPreparationDiagnostics().fullBuilds,0,'No whole-vault rebuild');return true;
    }finally{release?.();f.close();}
   })()`),true);
  }finally{await browser.cleanup();}
 });
}

/** Different editable pairs cannot invalidate a shared document's in-progress source replay. */
test("concurrent distinct pairs drain only their shared document owners through full replay",async()=>{
 const browser=await chromiumHarness(bundle);
 try{
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
  assert.equal(await browser.evaluate(`(async()=>{
   const f=await makeRelationshipFixture('pair-shared-owner'),i=f.index;let release;
   try{
    const prepare=i.sourceAcquisition.prepareRequestedPair.bind(i.sourceAcquisition);let entered,once=true;const calls=[];
    const reached=new Promise(done=>entered=done),blocked=new Promise(done=>release=done);
    i.sourceAcquisition.prepareRequestedPair=async(...args)=>{calls.push(args[0].endpoints.map(ref=>ref.semanticPath));const result=await prepare(...args);if(once){once=false;entered();await blocked;}return result;};
    const image=i.prepareRelationshipPair('A.md','image.png');await reached;
    const inverse=i.prepareRelationshipPair('A.md','B.md'),url=i.prepareRelationshipPair('A.md','https://Obsidian.md');
    ok(inverse!==image&&url!==image&&url!==inverse,'Each exact pair retains its own task');
    equal(calls.length,1,'Shared-owner pair preparations cannot enter before the older complete replay drains');
    ok(await i.prepareRelationshipPair('Unrelated.md','https://obsidian.md'),'Disjoint document owner prepares while A replay is held');
    equal(calls.length,2,'Only the disjoint owner may overtake held A source work');release();
    ok(await image&&await inverse&&await url,'All shared-owner canonical pairs complete after finite ordered drain');
    equal(calls.length,4,'Each requested pair canonically prepared once');
    ok(i.isConnected(i.get('A.md'),'B.md'),'Inverse B ontology remains canonical');ok(!i.isConnected(i.get('A.md'),'image.png'),'Genuine attachment negative remains authoritative');
    ok(i.isSemanticWriteReady('A.md','B.md')&&i.isSemanticWriteReady('A.md','image.png'),'Shared-owner pairs retain exact write authority');
    equal(i.relationshipPairTasks.size,0,'All finite task lifetimes released');equal(i.getWorkPriorityDiagnostics().active,[0,0,0,0,0],'No priority owner leaks');return true;
   }finally{release?.();f.close();}
  })()`),true);
 }finally{await browser.cleanup();}
});

/** Retired parser cancellation belongs to its original caller, including equal-stat/cache native events. */
for(const eventOnly of [false,true]){
 test(`new pair drains thrown cancellation after ${eventOnly?'same-cache/stat selected event':'selected cache replacement'}`,async()=>{
  const browser=await chromiumHarness(bundle);
  try{
   assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
   assert.equal(await browser.evaluate(`(async()=>{
    const f=await makeRelationshipFixture('pair-thrown-${eventOnly}'),i=f.index,eventOnly=${eventOnly};let release;
    try{
     const prepare=i.sourceAcquisition.prepareRequestedPair.bind(i.sourceAcquisition);let entered,once=true,calls=0;
     const reached=new Promise(done=>entered=done),blocked=new Promise(done=>release=done),cancelled=new Error('MetadataParseCancelledError');
     i.sourceAcquisition.prepareRequestedPair=async(...args)=>{calls++;const result=await prepare(...args);if(once){once=false;entered();await blocked;throw cancelled;}return result;};
     const original=i.prepareRelationshipPair('A.md','image.png'),oldOutcome=original.catch(error=>error);await reached;
     const file=f.files.get('A.md'),beforeStat={...file.stat},beforeCache=f.metadata.get(file.path);
     if(eventOnly)beforeCache.frontmatter={...beforeCache.frontmatter,Children:['[[image.png]]']};
     else{file.stat.mtime++;f.texts.set(file.path,f.texts.get(file.path)+'\\n');f.app.vault.trigger('modify',file);f.metadata.set(file.path,{...beforeCache,frontmatter:{Children:['[[image.png]]']}});}
     f.app.metadataCache.trigger('changed',file,f.texts.get(file.path),f.metadata.get(file.path));
     if(eventOnly){equal(file.stat,beforeStat,'Actual native event leaves physical stats identical');ok(f.metadata.get(file.path)===beforeCache,'Actual native event retains cache identity');}
     const fresh=i.prepareRelationshipPair('A.md','image.png');ok(fresh!==original,'Selected native event owns new task even with equal stats/cache');equal(calls,1,'Retired exact task drains before fresh source work');release();
     ok(await oldOutcome===cancelled,'Original caller receives its original cancellation error');ok(await fresh,'New selected observation independently certifies after old throw');equal(calls,2,'Exactly one new source preparation, with no action retry');
     ok(i.isConnected(i.get('A.md'),'image.png'),'Current positive declaration published');ok(i.isSemanticWriteReady('A.md','image.png'),'Current exact pair grants write authority');equal(i.relationshipPairTasks.size,0,'Task lifetime released');return true;
    }finally{release?.();f.close();}
   })()`),true);
  }finally{await browser.cleanup();}
 });
}

/** Caller policy/physical identity changes cancel private preparation; unrelated edits may reprepare once. */
for(const mode of ['policy','cache','file','unrelated']){
 test(`exact pair publication fences ${mode} changes during preparation`,async()=>{
  const browser=await chromiumHarness(bundle);
  try{
   assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
   assert.equal(await browser.evaluate(`(async()=>{
    const f=await makeRelationshipFixture('pair-fence-${mode}'),i=f.index,mode=${JSON.stringify(mode)};
    try{
     const prepare=i.sourceAcquisition.prepareRequestedPair.bind(i.sourceAcquisition);let entered,release,once=true;
     const reached=new Promise(done=>{entered=done}),blocked=new Promise(done=>{release=done});
     i.sourceAcquisition.prepareRequestedPair=async(...args)=>{const result=await prepare(...args);if(once){once=false;entered();await blocked;}return result;};
     const revision=i.getSemanticRevision(),task=i.prepareRelationshipPair('A.md','image.png');await reached;
     if(mode==='policy'){i.plugin.settings.inferAllLinksAsFriends=true;i.invalidateSemanticPolicy();}
     if(mode==='cache')f.metadata.set('A.md',{...f.metadata.get('A.md'),frontmatter:{Children:['[[B]]']}});
     if(mode==='file')f.files.set('A.md',new window.ContributorFile('A.md'));
     if(mode==='unrelated'){const file=f.files.get('Unrelated.md');file.stat.mtime++;f.texts.set(file.path,'Changed');f.app.vault.trigger('modify',file);}
     release();const ready=await task;
     equal(ready,mode==='unrelated','Only unchanged selected identity/policy may reprepare after an unrelated source event');
     equal(i.getSemanticRevision(),revision+(mode==='unrelated'?1:0),'No partial or stale semantic prefix publication');
     ok(!i.isConnected(i.get('A.md'),'image.png'),'Negative evidence retained coherently');return true;
    }finally{f.close();}
   })()`),true);
  }finally{await browser.cleanup();}
 });
}

/** Known linked-source fanout must settle before the unchanged exact pair spends its last retry. */
test('exact pair retry drains admitted linked-owner resolution fanout without joining semantic inventory',async()=>{
 const browser=await chromiumHarness(bundle);
 try{
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
  assert.equal(await browser.evaluate(`(async()=>{
   const f=await makeRelationshipFixture('pair-admitted-fanout'),i=f.index;let releasePair,releaseFanout;
   try{
    const prepare=i.sourceAcquisition.prepareRequestedPair.bind(i.sourceAcquisition),lookup=i.sourceAcquisition.repository.lookupLocalDependencies.bind(i.sourceAcquisition.repository);
    let enteredPair,enteredFanout,enteredRetry,once=true,calls=0,bodyBeforeFanout=false,fanoutReleased=false;
    const pairReached=new Promise(r=>enteredPair=r),pairHold=new Promise(r=>releasePair=r),fanoutReached=new Promise(r=>enteredFanout=r),fanoutHold=new Promise(r=>releaseFanout=r),retryReached=new Promise(r=>enteredRetry=r);
    i.sourceAcquisition.prepareRequestedPair=async(...args)=>{calls++;if(calls===2)enteredRetry();const result=await prepare(...args);if(once){once=false;enteredPair();await pairHold;}return result;};
    i.sourceAcquisition.repository.lookupLocalDependencies=async(...args)=>{const result=await lookup(...args);if(args[0].some(key=>key.includes('Unrelated'))){ok(result.outcome==='ready'&&result.value.sources.some(s=>s.head.sourceId==='A.md'),'Real admitted fanout identifies selected A owner');enteredFanout();await fanoutHold;}return result;};
    const load=i.sourceAcquisition.loadBody.bind(i.sourceAcquisition);i.sourceAcquisition.loadBody=async(file,...args)=>{if(calls===2&&!fanoutReleased&&file.path==='A.md')bodyBeforeFanout=true;return load(file,...args);};
    // An unrelated semantic lifetime remains held; exact cached native fanout is the only drain.
    i.semanticPreparationTasks.set('Unrelated.md',{task:new Promise(()=>{}),policyRevision:i.semanticPolicyRevision});
    const revision=i.getSemanticRevision(),task=i.prepareRelationshipPair('A.md','image.png');await pairReached;
    const unrelated=f.files.get('Unrelated.md');unrelated.stat.mtime++;f.texts.set(unrelated.path,'Changed');f.app.vault.trigger('modify',unrelated);
    await fanoutReached;releasePair();await retryReached;await new Promise(r=>setTimeout(r,0));
    equal(bodyBeforeFanout,false,'Retry captures selected owner only after its admitted resolution impact');fanoutReleased=true;releaseFanout();
    ok(await task,'Unchanged endpoint/policy prepares after exact cached fanout');equal(calls,2,'Original two-attempt budget retained');
    equal(i.getSemanticRevision(),revision+1,'One complete pair publication');ok(!i.isConnected(i.get('A.md'),'image.png'),'Coherent negative pair preserved');
    equal(i.getWorkPriorityDiagnostics().active,[0,0,0,0,0],'All exact priority owners released');return true;
   }finally{releasePair?.();releaseFanout?.();f.close();}
  })()`),true);
 }finally{await browser.cleanup();}
});

/** Cancellation before the native callback must prevent persistence, unlike a saved pending outcome. */
for(const mode of ['cancel','rename','delete']){
 test(`native awaited read ${mode} cannot mutate after cancellation`,async()=>{
  const browser=await chromiumHarness(bundle);
  try{
   assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
   assert.equal(await browser.evaluate(`(async()=>{
    const f=await makeRelationshipFixture('before-write-${mode}'),file=f.files.get('A.md'),mode=${JSON.stringify(mode)};let cancel,release,mutations=0,saves=0;
    const blocked=new Promise(done=>{release=done}),life={own:fn=>{cancel=fn;return()=>{cancel=null;}},pending:()=>{},savedPendingMessage:()=> 'saved-pending'};
    try{
     f.app.fileManager.processFrontMatter=async(selected,update)=>{await blocked;const next={};update(next);saves++;};
     const task=M.writeRelationshipMetadata(f.app,file,new Set(['children']),fm=>{mutations++;fm.Children=['[[B]]'];},life).catch(error=>error);
     if(mode==='cancel')cancel();else if(mode==='rename'){f.files.delete(file.path);file.path='Renamed.md';f.app.vault.trigger('rename',file,'A.md');}else{f.files.delete(file.path);f.app.vault.trigger('delete',file);}
     release();const result=await task;ok(result instanceof Error&&!(result instanceof M.SavedRelationshipPendingError),'Nothing was persisted');
     equal(mutations,0,'Cancelled callback cannot mutate');equal(saves,0,'Cancelled native read cannot save');equal(cancel,null,'Lifetime released');return true;
    }finally{cancel?.();f.close();}
   })()`),true);
  }finally{await browser.cleanup();}
 });
}

/** Existing limits admit no extra retained body/property payload, before or after persistence. */
for(const mode of ['before-body','before-properties','event','growth','in-place']){
 test(`relationship observer bounds ${mode} observations without timeout authority`,async()=>{
  const browser=await chromiumHarness(bundle);
  try{
   assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
   assert.equal(await browser.evaluate(`(async()=>{
    const f=await makeRelationshipFixture('observer-bound-${mode}'),file=f.files.get('A.md'),mode=${JSON.stringify(mode)},limit=M.SOURCE_DECODE_BUDGET_BYTES;
    let cancel,callback,saves=0,finished=false;const life={own:fn=>{cancel=fn;return()=>{cancel=null;}},pending:()=>{},savedPendingMessage:()=> 'saved-pending'};
    try{
     const initial=f.metadata.get(file.path);initial.frontmatter={Children:['[[B]]']};
     if(mode==='before-body')file.stat.size=limit;
     if(mode==='before-properties')initial.frontmatter.Children='x'.repeat(limit);
     f.app.fileManager.processFrontMatter=async(selected,update)=>{callback=update;update(initial.frontmatter);saves++;if(mode!=='in-place')file.stat.mtime++;};
     const task=M.writeRelationshipMetadata(f.app,file,new Set(['children']),fm=>{fm.Children=['[[Unrelated]]'];},life).then(()=>{finished=true;return 'ready';},e=>{finished=true;return e;});
     await Promise.resolve();await Promise.resolve();
     if(mode.startsWith('before-')){const result=await task;ok(result instanceof Error&&!(result instanceof M.SavedRelationshipPendingError),'Preflight refuses before save');equal(saves,0,'No oversized preflight write');return true;}
     ok(!finished,'Changed payload is not an unchanged no-op, even with the same cache/stat identity');
     if(mode==='event')f.app.metadataCache.trigger('changed',file,'x'.repeat(limit),initial);
     else if(mode==='growth'){file.stat.size=limit;f.app.metadataCache.trigger('changed',file,'small',initial);}
     else{f.texts.set(file.path,'Genuine updated body');f.app.metadataCache.trigger('changed',file,f.texts.get(file.path),initial);}
     const result=await task;if(mode==='in-place')equal(result,'ready','Matching current event body supplies real authority');else ok(result instanceof M.SavedRelationshipPendingError,'Post-save bounded rejection is truthful pending');
     equal(cancel,null,'Terminal observation releases retained payload and lifetime');return true;
    }finally{cancel?.();f.close();}
   })()`),true);
  }finally{await browser.cleanup();}
 });
}

/** Reauthorize provenance before deletion; a changed role cannot be cleared using retired evidence. */
test("unlink rejects a changed canonical declaration and allows same-field payload changes for another target",async()=>{
 const browser=await chromiumHarness(bundle);
 try{
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
  assert.equal(await browser.evaluate(`(async()=>{
   const f=await makeRelationshipFixture('unlink-provenance'),i=f.index,c=f.context;
   try{
    await c.createRelationToPage(i.get('A.md'),'child',i.get('image.png'),'Children');
    const before=i.evidenceBetween('A.md','image.png').find(x=>x.sourceKind==='frontmatter-ontology');
    await c.createRelationToPage(i.get('A.md'),'child',i.get('https://Obsidian.md'),'Children');
    ok(await c.unlinkFrontmatterEvidence(before),'Another target in the same property changes the raw payload but not this exact semantic declaration');
    await c.createRelationToPage(i.get('A.md'),'child',i.get('image.png'),'Children');
    const retired=i.evidenceBetween('A.md','image.png').find(x=>x.sourceKind==='frontmatter-ontology');
    await c.relinkCentralNeighbour(i.get('A.md'),i.get('image.png'),'right','Opposes');
    const payload=structuredClone(f.metadata.get('A.md').frontmatter);
    equal(await c.unlinkFrontmatterEvidence(retired),false,'Retired role/field cannot authorize deletion');
    equal(f.metadata.get('A.md').frontmatter,payload,'Changed canonical declaration remains untouched');return true;
   }finally{f.close();}
  })()`),true);
 }finally{await browser.cleanup();}
});

/** Source selection preserves independent fields, reverse declarations and body evidence over real durable facts. */
test("selected property removal keeps multi-source and inverse evidence with exact repeated-target semantics", async () => {
 const browser=await chromiumHarness(bundle);
 try {
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
  assert.equal(await browser.evaluate(`(async()=>{
   const f=await makeRelationshipFixture('selected-property-removal'),c=f.context,i=f.index;
   try{
    const file=f.files.get('A.md');f.texts.set(file.path,'[[B]]');f.app.metadataCache.resolvedLinks[file.path]={'B.md':1};
    await f.app.fileManager.processFrontMatter(file,fm=>{fm.Children=['[[B|first]]','[[B#Heading|again]]','[[Unrelated]]'];fm.Friends=['[[B]]'];fm.Keep={empty:[],blank:{},enabled:false,count:3};});
    ok(await i.prepareRelationshipPair('A.md','B.md'),'Canonical multi-source pair');
    const candidate=i.evidenceBetween('A.md','B.md').find(e=>e.sourceKind==='frontmatter-ontology'&&e.declaredByPath==='A.md'&&e.fieldName.toLowerCase()==='children');
    ok(candidate,'Selected exact field candidate');const approved=c.captureFrontmatterUnlinkExpectation(candidate);ok(approved,'Exact edit expectation');
    const body=f.texts.get(file.path),inverse=structuredClone(f.metadata.get('B.md').frontmatter),keep=structuredClone(f.metadata.get('A.md').frontmatter.Keep);
    ok(await c.unlinkFrontmatterEvidence(candidate,approved,()=>true),'Selected save published');
    equal(f.metadata.get('A.md').frontmatter.Children,['[[Unrelated]]'],'Repeated target references removed only from selected property');
    equal(f.metadata.get('A.md').frontmatter.Friends,['[[B]]'],'Independent field retained');equal(f.metadata.get('A.md').frontmatter.Keep,keep,'Unrelated empty containers and scalars retained');
    equal(f.metadata.get('B.md').frontmatter,inverse,'Inverse physical owner untouched');ok(f.texts.get(file.path).startsWith(body),'Body preserved');
    const explanation=i.explainRelationship('A.md','B.md');ok(!explanation.hidden&&explanation.resolvedRoles.length,'Canonical connection remains');
    ok(explanation.decisions.some(d=>d.evidence.declaredByPath==='B.md'),'Reverse declaration remains');
    ok(!explanation.decisions.some(d=>M.frontmatterDeclarationKey(d.evidence)===approved.declarationKey),'Removed property absent from canonical evidence');
    const inverseCandidate=explanation.decisions.find(d=>d.evidence.sourceKind==='frontmatter-ontology'&&d.evidence.declaredByPath==='B.md').evidence;
    const originalDirection=i.evidenceBetween('B.md','A.md').find(e=>e.sourceKind==='frontmatter-ontology'&&e.declaredByPath==='B.md').direction;
    ok(inverseCandidate.direction!==originalDirection,'Genuine virtual inverse direction differs from physical declaration view');
    const beforeInverseBody=f.texts.get('A.md'),beforeIndependent=structuredClone(f.metadata.get('A.md').frontmatter);
    ok(await c.unlinkFrontmatterEvidence(inverseCandidate,c.captureFrontmatterUnlinkExpectation(inverseCandidate),()=>true),'Selected inverse-view property removal reauthorizes original direction in approved orientation');
    equal(f.metadata.get('B.md').frontmatter.Parents,undefined,'Only inverse declaring note property removed');equal(f.metadata.get('A.md').frontmatter,beforeIndependent,'Independent forward declaration preserved');equal(f.texts.get('A.md'),beforeInverseBody,'Forward body untouched');
    ok(i.explainRelationship('A.md','B.md').resolvedRoles.length,'Forward independent evidence retains visible pair');
    equal(i.getSemanticPreparationDiagnostics().fullBuilds,0,'No whole-vault semantic rebuild');return true;
   }finally{f.close();}
  })()`),true);
 }finally{await browser.cleanup();}
});

/** Pre-confirmation identities and exact YAML keys cannot be replaced while native reads are pending. */
for (const mode of ['source-replaced','target-replaced','closed-before-prepare','closed-during-read','duplicate-key','key-renamed','unsupported']) {
 test(`selected property authorization refuses ${mode} without persistence`, async () => {
  const browser=await chromiumHarness(bundle);
  try {
   assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
   assert.equal(await browser.evaluate(`(async()=>{
    const f=await makeRelationshipFixture('selected-refusal-${mode}'),c=f.context,i=f.index,mode=${JSON.stringify(mode)};
    try{
     await f.app.fileManager.processFrontMatter(f.files.get('A.md'),fm=>{fm.Children=['[[B]]'];});
     ok(await i.prepareRelationshipPair('A.md','B.md'),'Selected declaring owner prepared');
     const candidate=i.evidenceBetween('A.md','B.md').find(e=>e.sourceKind==='frontmatter-ontology'&&e.declaredByPath==='A.md');
     const approved=c.captureFrontmatterUnlinkExpectation(candidate);ok(approved,'Captured pre-confirmation identity');
     let saves=0,current=true;const native=f.app.fileManager.processFrontMatter;
     f.app.fileManager.processFrontMatter=async(file,mutate)=>{
      if(mode==='closed-during-read')current=false;
      if(mode==='duplicate-key')f.metadata.get(file.path).frontmatter.children=['[[B]]'];
      if(mode==='key-renamed'){const fm=f.metadata.get(file.path).frontmatter;fm.children=fm.Children;delete fm.Children;}
      if(mode==='unsupported')f.metadata.get(file.path).frontmatter.Children='https://other.example/[[B]]';
      await native(file,mutate);saves++;
     };
     if(mode==='source-replaced')f.files.set('A.md',new window.ContributorFile('A.md'));
     if(mode==='target-replaced')f.files.set('B.md',new window.ContributorFile('B.md'));
     if(mode==='closed-before-prepare')current=false;
     const before=f.texts.get('A.md'),result=await c.unlinkFrontmatterEvidence(candidate,approved,()=>current).catch(error=>error);
     ok(result===false||result instanceof Error,'Unsafe authority rejected');equal(saves,0,'No native save');equal(f.texts.get('A.md'),before,'Disk/body unchanged');
     equal(c.relationshipWriteCancels.size,0,'Observers released');return true;
    }finally{f.close();}
   })()`),true);
  }finally{await browser.cleanup();}
 });
}

/** Actual shared parser resolution governs safe scalar/list transforms, including case-distinct same basenames. */
test("selected property candidate refuses existing decode budget before preview transformation", async () => {
 const browser=await chromiumHarness(bundle);
 try {
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
  assert.equal(await browser.evaluate(`(async()=>{const f=await makeRelationshipFixture('selected-preview-budget'),c=f.context,i=f.index;try{const file=f.files.get('A.md');await f.app.fileManager.processFrontMatter(file,fm=>{fm.Children=['[[B]]']});ok(await i.prepareRelationshipPair('A.md','B.md'),'Exact selected pair');const evidence=i.evidenceBetween('A.md','B.md').find(e=>e.sourceKind==='frontmatter-ontology'&&e.declaredByPath==='A.md');const transform=c.removeTargetFromValue;let transformed=0;c.removeTargetFromValue=function(...args){transformed++;return transform.apply(this,args)};file.stat.size=M.SOURCE_DECODE_BUDGET_BYTES/4;equal(c.captureFrontmatterUnlinkExpectation(evidence),null,'Existing writer inequality refuses oversized preview');equal(transformed,0,'No unsafe dry-run transformation before admission');file.stat.size=100;ok(c.captureFrontmatterUnlinkExpectation(evidence),'Ordinary supported candidate remains editable');return true}finally{f.close()}})()`),true);
 }finally{await browser.cleanup();}
});

/** Actual shared parser resolution governs safe scalar/list transforms, including case-distinct same basenames. */
test("selected property transforms preserve non-target grammar and refuse mixed lexical tokens", async () => {
 const browser=await chromiumHarness(bundle);
 try {
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
  assert.equal(await browser.evaluate(`(async()=>{
   const f=await makeRelationshipFixture('selected-value-grammar'),c=f.context;
   try{
    const file=f.files.get('A.md'),target=f.index.get('B.md');
    equal(c.removeTargetFromValue('[[B|alias]]',file,target),undefined,'Scalar alias');
    equal(c.removeTargetFromValue('[[B#Heading|alias]]',file,target),undefined,'Heading alias');
    equal(c.removeTargetFromValue('[[B]], [Other](Unrelated.md); [[B.md]]',file,target),'[Other](Unrelated.md)','Multiple tokens preserve other target');
    equal(c.removeTargetFromValue({nested:['[[B]]','[[Unrelated]]',false,5,null,[],{}],unchanged:{empty:[]}},file,target),{nested:['[[Unrelated]]',false,5,null,[],{}],unchanged:{empty:[]}},'Nested unrelated values retained');
    const special=JSON.parse('{"drop":"[[B]]","__proto__":{"keep":"[[Unrelated]]"}}'),safe=c.removeTargetFromValue(special,file,target);
    ok(Object.hasOwn(safe,'__proto__')&&Object.getPrototypeOf(safe)===Object.prototype,'YAML prototype-spelled key remains an own data property');
    equal(safe,JSON.parse('{"__proto__":{"keep":"[[Unrelated]]"}}'),'Unrelated prototype-spelled metadata preserved');
    const one=f.add('one/Same.md'),two=f.add('two/Same.md'),lower=f.add('one/same.md');
    const resolve=f.app.metadataCache.getFirstLinkpathDest;f.app.metadataCache.getFirstLinkpathDest=(literal,host)=>literal==='Same'?one:resolve(literal,host);
    const page={path:two.path,file:two,url:null};equal(c.removeTargetFromValue(['[[Same]]','[[two/Same]]','[[one/same]]'],file,page),['[[Same]]','[[one/same]]'],'Canonical resolver preserves basename/case-distinct files');
    const url=f.index.get('https://Obsidian.md');equal(c.removeTargetFromValue(['[Web](https://Obsidian.md)','https://obsidian.md','https://obsidian.md/Other'],file,url),['https://obsidian.md/Other'],'Canonical URL host preserved and distinct paths retained');
    let refused=false;try{c.removeTargetFromValue('https://other.example/[[B]]',file,target);}catch{refused=true;}ok(refused,'Mixed token must fail closed');
    return true;
   }finally{f.close();}
  })()`),true);
 }finally{await browser.cleanup();}
});

/** New nodes keep their actual physical/provisional insertion ordering and finish under exact pair authority. */
for(const kind of ['file','url','placeholder']){
 test(`new ${kind} related node awaits bound canonical saved publication`,async()=>{
  const browser=await chromiumHarness(bundle);
  try{
   assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
   assert.equal(await browser.evaluate(`(async()=>{
    const f=await makeRelationshipFixture('creation-${kind}'),i=f.index,c=f.context,kind=${JSON.stringify(kind)};
    try{
     let page;
     c.validateRelatedNoteName=name=>({valid:true,existing:null,stem:name});
     if(kind==='file'){const file=f.add('Created.md','');f.app.vault.trigger('create',file);page=await c.linkNewRelatedFile(i.get('A.md'),'child',file,'Children');}
     if(kind==='url')page=await c.createWebLinkRelatedPage(i.get('A.md'),'child','https://created.example/path','Created label','Children');
     if(kind==='placeholder')page=await c.createPlaceholderRelatedPage(i.get('A.md'),'child','New placeholder','Children');
     ok(page&&i.get(page.path),'Established creator inserted its bound node');
     ok(i.neighbours(i.get('A.md'),'child').some(x=>x.page.path===page.path),'Saved relationship visible');
     ok(i.isSemanticWriteReady('A.md',page.path),'Exact current pair authority on creation completion');
     ok(i.evidenceBetween('A.md',page.path).some(x=>x.sourceKind==='frontmatter-ontology'&&x.declaredByPath==='A.md'),'Canonical saved provenance');return true;
    }finally{f.close();}
   })()`),true);
  }finally{await browser.cleanup();}
 });
}

/** A later metadata event retires blocked background work; exact saved-pair publication never joins it. */
for (const followup of ['queued','already-started']) {
test(`subscribed pair writes pre-empt the newer ${followup} metadata pass and retain immediate unlink authority`,async()=>{
 const browser=await chromiumHarness(bundle);
 try{
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
  assert.equal(await browser.evaluate(`(async()=>{
   const f=await makeRelationshipFixture('pair-native-metadata-${followup}'),i=f.index,c=f.context,a=i.sourceAcquisition,followup=${JSON.stringify(followup)};
   let oldPass,newPass,oldSettled=false,newSettled=false,notifications=0,foregroundFlushes=0,gate=null;
   const releases=[i.subscribe(()=>{notifications++;i.getNeighborhood('A.md');})];
   const checkpoint=a.backgroundCheckpoint,flush=a.flush.bind(a),nativeWrite=f.app.fileManager.processFrontMatter;
   /** The production background checkpoint is intercepted before any owner read or writer lane. */
   const barrier=()=>{let release,reached;const blocked=new Promise(done=>release=done),entered=new Promise(done=>reached=done);return {release,reached,blocked,entered};};
   const retired=barrier(),replacement=barrier();
   try{
    // The production plugin source revision tracks host events separately from maintenance.
    // This older shared fixture aliases them; use the existing event observation for this probe.
    f.plugin.getIndexSourceRevision=()=>a.contributorObservation;
    f.plugin.settings.lastActivePath='A.md';i.invalidateSemanticPolicy();
    releases.push(i.acquireSemanticDemand('A.md'));
    await i.refreshSemanticSettings();
    a.backgroundCheckpoint=async()=>{const selected=gate;if(selected){selected.reached();await selected.blocked;}
     // A retired pass performs no further owner work; expose its normal post-checkpoint rejection
     // before the foreground barrier so the second variant can capture an already-started replacement.
     if(a.inventoryCaptureRevision!==a.inventoryRevision)return;await checkpoint?.();};
    a.flush=async(...args)=>{foregroundFlushes++;return flush(...args);};
    f.app.fileManager.processFrontMatter=async(file,update)=>{
     const frontmatter=structuredClone(f.metadata.get(file.path).frontmatter??{});update(frontmatter);
     file.stat.mtime++;const body=f.texts.get(file.path);f.texts.set(file.path,body+'\\n');
     f.app.vault.trigger('modify',file);
     gate=retired;oldPass=a.reconcile();oldPass.then(()=>{oldSettled=true;});await retired.entered;
     const cache={...f.metadata.get(file.path),frontmatter};f.metadata.set(file.path,cache);
     f.app.metadataCache.trigger('changed',file,f.texts.get(file.path),cache);
     ok(a.inventoryCaptureRevision!==a.inventoryRevision,'Actual native metadata event retires the captured modify pass');
     if(followup==='already-started'){
      gate=replacement;retired.release();equal(await oldPass,false,'Old captured pass rejects the newer metadata event');
      newPass=a.reconcile();newPass.then(()=>{newSettled=true;});await replacement.entered;
      equal(a.inventoryCaptureRevision,a.inventoryRevision,'Replacement is a real current captured pass');
     }
    };
    await c.createRelationToPage(i.get('A.md'),'child',i.get('image.png'),'Children');
    equal(foregroundFlushes,0,'Foreground saved relationship never joins a broad source flush');
    equal(followup==='queued'?oldSettled:newSettled,false,'Saved pair completes while unrelated background owner stays blocked');
    ok(!a.hasSemanticDependencies(),'Current pair does not fabricate global source readiness');
    ok(i.isSemanticWriteReady('A.md','image.png'),'Exact pair grants current write authority ahead of inventory');
    ok(i.neighbours(i.get('A.md'),'child').some(x=>x.page.path==='image.png'),'Saved child is published');
    a.maintenanceRevision++;ok(i.isSemanticWriteReady('A.md','image.png'),'Unrelated inventory maintenance cannot retire current exact pair');
    gate=null;retired.release();replacement.release();
    equal(await oldPass,false,'The older pass remains canceled, never relabeled ready');
    if(newPass)ok(await newPass,'Current replacement resumes and closes without restart');
    a.flush=flush;ok(await a.flush(),'Released background work eventually restores full source authority');
    f.app.fileManager.processFrontMatter=nativeWrite;
    await i.refreshSemanticSettings();
    await c.createRelationToPage(i.get('A.md'),'child',i.get('https://Obsidian.md'),'Children');
    await i.refreshSemanticSettings();
    ok(i.isConnected(i.get('A.md'),'image.png'),'Earlier child survives the next saved pair');
    const candidate=i.evidenceBetween('A.md','image.png').find(x=>x.sourceKind==='frontmatter-ontology');
    ok(await c.unlinkFrontmatterEvidence(candidate),'Immediate unlink retains current exact provenance');
    ok(!i.isConnected(i.get('A.md'),'image.png'),'Unlinked child removed');
    ok(i.isConnected(i.get('A.md'),'https://Obsidian.md'),'Later exact URL survives unlink');
    ok(notifications>0,'Actual live subscriber observed publications');
    equal(i.getSemanticPreparationDiagnostics().fullBuilds,0,'No full index rebuild');return true;
   }finally{gate=null;retired.release();replacement.release();a.backgroundCheckpoint=checkpoint;a.flush=flush;for(const release of releases)release();f.close();}
  })()`),true);
 }finally{await browser.cleanup();}
});

}

/** Real bounded unsaved source facts must be reacquired before deferred lookup can authenticate their referrers. */
for (const mode of ['recovered','storage-unavailable','closed']) {
 test(`changed unsaved owner fan-out ${mode} preserves current authority`, async()=>{
  const browser=await chromiumHarness(bundle);
  try{
   assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
   assert.equal(await browser.evaluate(`(async()=>{
    const f=await makeRelationshipFixture('pair-unsaved-fanout-${mode}'),i=f.index,a=i.sourceAcquisition,file=f.files.get('A.md'),mode=${JSON.stringify(mode)};
    const open=i.indexedDb.open.bind(i.indexedDb);
    try{
     file.stat.mtime++;f.texts.set(file.path,'Changed');f.app.vault.trigger('modify',file);
     i.indexedDb.open=async()=>null;
     const result=await a.acquire(file,await i.metadataParser.parse(f.texts.get(file.path)));
     ok(result.current&&!result.saved,'Canonical bounded unsaved source established');
     equal(a.getDiagnostics().unsaved,1,'The actual repository masks its retired durable owner');
     f.metadata.set(file.path,{...f.metadata.get(file.path)});
     f.app.metadataCache.trigger('changed',file,f.texts.get(file.path),f.metadata.get(file.path));
     if(mode!=='storage-unavailable')i.indexedDb.open=open;
     if(mode==='closed')a.close();
     equal(await a.flush(),mode==='recovered','Only actual current durable recovery grants authority');
     equal(a.hasSemanticDependencies(),mode==='recovered','Lookup completeness remains required');
     if(mode==='recovered'){
      equal(a.getDiagnostics().unsaved,0,'The known owner was genuinely reacquired');
      equal(a.pendingKnownFiles.size,0,'All newly proven referrers were acquired');
      equal(a.pendingResolutionKeys.size,0,'Deferred negative/positive lookup proof closed');
      await i.refreshSemanticSettings();
      await f.context.createRelationToPage(i.get('A.md'),'child',i.get('image.png'),'Children');
      ok(i.isConnected(i.get('A.md'),'image.png'),'Relationship editing resumes after genuine recovery');
     }else if(mode==='storage-unavailable')ok(a.pendingKnownFiles.size>0,'Unchanged storage failure retains source work');
     return true;
    }finally{i.indexedDb.open=open;f.close();}
   })()`),true);
  }finally{await browser.cleanup();}
 });
}


/** Actual request cancellation and benign rollback preserve the shared cache; genuine faults retain backoff. */
for (const mode of ["cancel-read", "cancel-delayed", "cancel-write", "domain-rollback", "constraint", "foreign-abort", "quota", "timeout"]) {
 test(`actual source transaction ${mode} preserves cache recovery and current mutation authority`, async () => {
  const browser = await chromiumHarness(bundle);
  try {
   assert.equal(await browser.evaluate(contributorBrowserInitialize), true); await browser.evaluate(setup);
   assert.equal(await browser.evaluate(`(async()=>{
    const name='pair-cache-health-${mode}',f=await makeRelationshipFixture(name),i=f.index,cache=i.indexedDb,repo=cache.sources,mode=${JSON.stringify(mode)};
    let observer, scheduledTimeout;const schedule=repo.runtime.schedule;
    try {
     const db=await cache.open(),heads=await value(db.transaction('sourceHeads').objectStore('sourceHeads').getAll());
     let failure;
     if(mode==='timeout')repo.runtime.schedule=(callback,delay)=>{scheduledTimeout=callback;return schedule(callback,delay);};
     const benign=mode.startsWith('cancel-')||mode==='domain-rollback';
     if(mode==='constraint')await edit(db,['meta'],transaction=>value(transaction.objectStore('meta').add({key:'cache-health-constraint'})));
     try {
      await repo.transaction(db,mode==='constraint'?['meta']:['sourceHeads'],mode==='cancel-write'||mode==='constraint'?'readwrite':'readonly','A.md',async transaction=>{
       if(mode==='constraint')return value(transaction.objectStore('meta').add({key:'cache-health-constraint'}));
       if(mode==='quota')throw new DOMException('Fixture quota rejection','QuotaExceededError');
       const request=mode==='cancel-write'
        ?transaction.objectStore('sourceHeads').put({...heads.find(head=>head.sourceId==='A.md'),sourceRevision:'never-activated'})
        :transaction.objectStore('sourceHeads').get('A.md');
       const pending=value(request);
       if(mode==='domain-rollback'){void pending.catch(()=>{});throw new M.SourceFactError('superseded');}
       if(mode==='timeout')scheduledTimeout();else if(mode==='foreign-abort')transaction.abort();else repo.cancelSource('A.md');
       if(mode==='cancel-delayed')try{return await pending;}catch(error){await Promise.resolve();await Promise.resolve();throw error;}
       return pending;
      });
     }catch(error){failure=error;}
     ok(failure,'An aborted or failed transaction must reject');
     // Let the actual bubbling request-error/abort events settle; this does not advance cache clocks.
     await new Promise(resolve=>setTimeout(resolve,0));
     const reopened=await cache.open();
     equal(cache.connection===db,benign,'Only attributed intentional abort preserves the original connection');
     equal(Boolean(reopened),benign,'Genuine storage errors retain immediate recovery backoff');
     if(benign){
      equal(reopened,db,'No healthy connection replacement or forced reopen');
      equal(failure.reason,mode==='domain-rollback'?'superseded':'cancelled','Keep original domain rejection or actual cancellation');
     }
     observer=new M.KplexIndexedDbCache(name);const independent=await observer.open();
     ok(independent,'Independent read of original durable heads');
     equal(await value(independent.transaction('sourceHeads').objectStore('sourceHeads').getAll()),heads,'Aborted writes never activate or alter existing heads');
     if(benign){
      await f.context.createRelationToPage(i.get('A.md'),'child',i.get('image.png'),'Children');
      ok(i.neighbours(i.get('A.md'),'child').some(entry=>entry.page.path==='image.png'),'Real mutation succeeds immediately after cancellation without changing backoff/readiness');
      ok(i.isSemanticWriteReady('A.md','image.png'),'Actual current canonical pair closes');
     }
     return true;
    }finally{repo.runtime.schedule=schedule;observer?.close();f.close();}
   })()`),true);
  }finally{await browser.cleanup();}
 });
}
