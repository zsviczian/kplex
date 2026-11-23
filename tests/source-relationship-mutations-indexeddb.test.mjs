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
  const names=new Set(["captureConnectionOntologyChange","changeConnectionOntology","prepareRelationshipMutation","publishSavedRelationship","mutateRelationshipMetadata","writeRelationship","writeReciprocalRelationship",
    "addRelationshipOntology","appendRelationshipReference","clearFrontmatterRelationship","createRelationToPage","addOntologyToConnection","relinkCentralNeighbour",
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

/** Share the real command invocation, gate eligibility and Link callback for the same durable writer. */
function productionAuthoringEntryPoints() {
  function find(path,select) {
    const source=ts.createSourceFile(path,readFileSync(new URL(`../${path}`,import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    let match;
    function visit(node){match??=select(node,source);if(!match)ts.forEachChild(node,visit);}
    visit(source);assert(match,path);return match.getText(source);
  }
  const fromVariable=(name)=>(node,source)=>ts.isVariableDeclaration(node)&&node.name.getText(source)===name?node.initializer:null;
  const fromComposerFunction=name=>find('src/ui/NewRelatedNoteModal.ts',node=>ts.isFunctionDeclaration(node)&&node.name?.text===name?node:null).replace(/^export /,'');
  const link=find('src/ui/NewRelatedNoteModal.ts',fromVariable('linkExisting'));
  const gateRoles=find('src/ui/PlexGraph.tsx',fromVariable('relationshipDropRoles'));
  const command=find('src/main.ts',(node,source)=>ts.isCallExpression(node)&&node.expression.getText(source)==='operation'
    &&node.arguments[1]?.getText(source).includes('const origin = pageFor(context)')
    &&node.arguments[1]?.getText(source).includes('NewRelatedNoteModal')?node.arguments[1]:null);
  return ts.transpileModule(`${fromComposerFunction('captureRelatedEndpoint')}
   ${fromComposerFunction('refreshCapturedPage')}
   window.inferredParentEntryPoints={
    link:({plugin,origin,selectedTarget,role,prepareField,complete,reportFailure})=>{
     const session={isSessionOpen:()=>true,setWriting(){}},busyRef={current:true};
     const continuation='return',storeOnTarget=false,effectiveAlias='',ontology='',setBusy=()=>{},beginWrite=()=>true;
     const reciprocalCheck=()=>({approval:{enabled:false}}),assertReciprocalApproval=()=>{};
     return ${link};
    },
    gate:({index,gateGroupRole})=>${gateRoles},
    command:function({role,pageFor,NewRelatedNoteModal,CreateFolderNoteModal}){return ${command};}
   };`,{compilerOptions:{target:ts.ScriptTarget.ES2021,module:ts.ModuleKind.None}}).outputText;
}

const bundle=await contributorBrowserBundle(["src/index/GraphIndex.ts","src/index/GraphBuilder.ts","src/index/IndexSnapshot.ts",
  "src/core/graph/compiler.ts","src/core/graph/evidence.ts","src/core/graph/relations.ts","src/adapters/obsidian/metadataSourceCollector.ts",
  "src/adapters/obsidian/ontologySourceCollector.ts","src/adapters/obsidian/relationshipMetadataWrite.ts","src/adapters/obsidian/reciprocalRelationshipWrite.ts","src/adapters/obsidian/relationshipOwner.ts","src/application/frontmatterUnlink.ts","src/application/connectionOntology.ts","src/adapters/obsidian/placeholderRelocation.ts","src/core/contracts/ontologyConfiguration.ts","src/adapters/obsidian/fileCreationAutomation.ts","src/ui/features/gateRelationshipIntent.ts"]);
const methods=`const assert=Object.assign((value,message)=>ok(value,message),{equal}),M=sourceModules,normalizeFieldName=M.normalizeFieldName,extractLinksFromValue=M.extractLinksFromValue;
const writeRelationshipMetadata=M.writeRelationshipMetadata,SavedRelationshipPendingError=M.SavedRelationshipPendingError;
const relationshipMetadataPayload=M.relationshipMetadataPayload,SOURCE_DECODE_BUDGET_BYTES=M.SOURCE_DECODE_BUDGET_BYTES;
const frontmatterDeclarationKey=M.frontmatterDeclarationKey,iterateResolvedLinksFromValue=M.iterateResolvedLinksFromValue;
const placeholderReference=M.placeholderReference,ontologyConfiguration=M.ontologyConfiguration,ontologyEndpointState=M.ontologyEndpointState,selectConnectionOntology=M.selectConnectionOntology,eligibleRelationshipOwner=M.eligibleRelationshipOwner;
const createReciprocalWriteReceipt=M.createReciprocalWriteReceipt,reciprocalOntologyFields=M.reciprocalOntologyFields,hasIndependentFrontmatterDeclarations=M.hasIndependentFrontmatterDeclarations;
const normalizePath=x=>x,LinkDirection=M.LinkDirection,RelationType=M.RelationType,Notice=class{constructor(message){window.notices.push(message);}};
const isUnknownRecord=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);${productionMethods()}`;
const setup=`window.notices=[];${methods}${productionAuthoringEntryPoints()}
window.makeRelationshipFixture=async (name,inferredParent,includeBodyLink=true)=>{
 const f=await fixture(name),collect=${collect.toString()},hostOracle=${hostOracle.toString()},centerGateSettings=${centerGateSettings.toString()};
 const bodies=new Map();
 f.text=f.texts;
 if(inferredParent){
  f.add('A.md','');f.add('B.md',includeBodyLink?'[[A]]\\n':'');
  for(const [path,body] of f.texts)bodies.set(path,body);
  if(includeBodyLink)f.app.metadataCache.resolvedLinks['B.md']={'A.md':1};
 }else{
  f.add('A.md','[[Unrelated]]');f.add('B.md','',{Parents:['[[A]]']});f.add('Unrelated.md','');f.add('image.png','');f.add('icon.svg','<svg/>');
  f.add('URL-owner.md','[Upper](https://Obsidian.md)\\n[Lower](https://obsidian.md)',{Children:['[[image.png]]']});
  for(let i=0;i<80;i++)f.add('Shared-'+i+'.md','[Shared](https://Obsidian.md)');
  f.app.metadataCache.resolvedLinks['A.md']={'Unrelated.md':1};
 }
 const semantic={hierarchy:{hidden:[],parents:[inferredParent??'Parents'],children:['Children'],leftFriends:['Friends'],rightFriends:['Opposes'],previous:[],next:[],exclusions:[]},inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
 f.app.vault.getName=()=>name;f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??(path===''||path==='/'?f.app.vault.getRoot():null);
 await f.acquire();ok(await f.acquisition.reconcile(),'Seed genuine source inventory');
 const compilation=await hostOracle(f,f.app.vault.getMarkdownFiles().map(file=>file.path),semantic,{noteTypeField:'Type',primaryTagField:'Style'},true);
 f.acquisition.close();
 const plugin={app:f.app,settings:{indexingMode:'eager',...semantic,...centerGateSettings({showFolderNodes:false,showTagNodes:false}),lastActivePath:'',pinnedNodes:[],alsoWriteInverseOntology:false},getIndexSourceRevision:()=>index.sourceAcquisition.getMaintenanceRevision()};
 const index=new M.GraphIndex(plugin,f.app),builder=new M.GraphBuilder(plugin,f.app,new Map(),index.metadataParser,index.indexedDb,()=>true);
 index.state=await builder.bindCompiledGraph(compilation,{materializedFile:facet=>f.files.get(facet.path)??null});
 ok(await index.sourceAcquisition.reconcile(),'Actual index reuses authenticated sources');
 f.acquisition=index.sourceAcquisition;
 const context={...relationshipMethods,app:f.app,index,settings:plugin.settings,translator:key=>key,
  fileCreationAutomation:new M.FileCreationAutomation(f.app,{waiting:()=>{},unavailable:()=>"unavailable",cancelled:()=>"cancelled"}),
  relationshipWriteCancels:new Set(),managedMetadataWrites:new Map(),pruneManagedMetadataWrites:()=>{}};
 f.app.fileManager={generateMarkdownLink:file=>'[['+file.path+']]',processFrontMatter:async(file,update)=>{
  const frontmatter=structuredClone(f.metadata.get(file.path).frontmatter??{});update(frontmatter);
  file.stat.mtime++;
  if(inferredParent){
   const properties=Object.entries(frontmatter).map(([field,value])=>field+': '+JSON.stringify(value)).join('\\n');
   f.texts.set(file.path,(properties?'---\\n'+properties+'\\n---\\n':'')+bodies.get(file.path));
  }else f.texts.set(file.path,f.texts.get(file.path)+'\\n');
  f.app.vault.trigger('modify',file);const cache={...f.metadata.get(file.path),frontmatter};f.metadata.set(file.path,cache);
  f.app.metadataCache.trigger('changed',file,f.texts.get(file.path),cache);
 }};
 return {...f,index,plugin,context,close(){context.fileCreationAutomation.dispose();for(const cancel of context.relationshipWriteCancels)cancel();index.destroy();f.cache.close();}};
};`;

/** #299 reproduces the ordinary one-way body link with real source collection and pair authority. */
test("inferred Parent can be authored on the origin without changing its incoming body link", async () => {
 const browser=await chromiumHarness(bundle);
 try {
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
  assert.equal(await browser.evaluate(`(async()=>{
   const entry=window.inferredParentEntryPoints;
   for(const route of ['generic','parent-command','gate','define-ontology'])for(const field of ['Parent','parent']){
    const fixtureName=route+'-'+(field==='Parent'?'saved-key':'lowercase');
    const f=await makeRelationshipFixture('ordinary-inferred-parent-'+fixtureName,field),i=f.index,c=f.context;
    try {
     const a=i.get('A.md'),b=i.get('B.md'),body=f.texts.get(b.path),baseline=i.evidenceBetween(a.path,b.path);
     equal([c.settings.inferAllLinksAsFriends,c.settings.inverseInfer,c.settings.alsoWriteInverseOntology],[false,false,false],'Reported settings');
     ok(baseline.length>0&&baseline.every(row=>row.sourceKind==='obsidian-link'&&row.relationType===M.RelationType.INFERRED
       &&row.declaredByPath===b.path),'Only the ordinary body link from B contributes');
     ok(i.getNeighborhood(a.path).parents.some(row=>row.page.path===b.path&&row.relationType===M.RelationType.INFERRED),'B is the inferred Parent of A');
     window.notices.length=0;
     if(route==='define-ontology'){
      equal((await c.addOntologyToConnection(a,b,'parent',field,a.path)).state,'saved-published','Definition action uses its explicit storage choice');
     }else{
      let opened;
      if(route==='gate'){
       ok(!i.gateNeighbourPaths(a,'top').has(b.path),'Gate hover permits an inferred-only target');
       equal(entry.gate({index:i,gateGroupRole:M.gateGroupRole})(a,b,'parent'),['parent'],'Existing target is eligible through the Parent gate');
       opened={origin:a,role:'parent'};
      }else{
       c.actionInvocationSequence=0;c.actionDialogs=new Map();c.actionHostLeaf=()=>undefined;
       c.initialGenericRelationshipSelection=()=>({role:'child',field:'Children'});
       const command=entry.command.call(c,{role:route==='generic'?'all':'parent',pageFor:context=>context.target,
        NewRelatedNoteModal:class { constructor(_plugin,origin,role,_onCommitted,_leaf,_fixedTarget,invocation){opened={origin,role,invocation};} open(){} }});
       equal(command({target:a,request:{}}).status,'opened','Existing production command opens the composer');
       equal(opened.role,route==='generic'?'child':'parent','Command supplies the expected initial role');
       equal(opened.invocation.initialRoleFilter,route==='generic'?'all':undefined,'Only the generic composer has the role selector');
      }
      let completed;await entry.link({plugin:c,origin:opened.origin,selectedTarget:b,
       role:route==='generic'?'parent':opened.role,prepareField:async()=>field,complete:async page=>{completed=page.path;},reportFailure:error=>{throw error;}})();
      equal(completed,b.path,'An inferred Parent allows the selected explicit declaration; notices '+JSON.stringify(window.notices));
     }
     equal(f.metadata.get(a.path).frontmatter,{[field]:['[[B.md]]']},'The selected spelling is saved on A');
     equal(f.texts.get(a.path),'---\\n'+field+': ["[[B.md]]"]\\n---\\n','The saved note contains exactly one Parent declaration');
     equal(f.metadata.get(b.path).frontmatter,{},'The ordinary link owner has no inverse property');
     equal(f.texts.get(b.path),body,'The existing body link stays byte-for-byte intact');
     const evidence=i.evidenceBetween(a.path,b.path);
     equal(evidence.filter(row=>row.sourceKind==='frontmatter-ontology').map(row=>row.declaredByPath),[a.path],'Only one authored declaration participates');
     ok(evidence.some(row=>row.sourceKind==='obsidian-link'&&row.declaredByPath===b.path),'Ordinary evidence is retained under explicit precedence');
     equal(i.getNeighborhood(a.path).parents.find(row=>row.page.path===b.path)?.relationType,M.RelationType.DEFINED,'The same parent is now defined');
     const saved=f.texts.get(a.path),repeated=await c.createRelationToPage(i.get(a.path),'parent',i.get(b.path),field);
     equal(repeated.state,'unavailable','Mixed inferred and explicit evidence keeps duplicate protection');
     equal(window.notices,['notice.alreadyConnected'],'Duplicate refusal still provides the existing notice');
     equal(f.texts.get(a.path),saved,'Repeating the authored declaration performs no write');
     equal(i.getSemanticPreparationDiagnostics().fullBuilds,0,'The operation publishes only the exact pair');
    }finally{f.close();}
   }
   return true;
  })()`),true);
 }finally{await browser.cleanup();}
});

test("Parent authoring preserves explicit duplicate, relink, append and pair-authority policies", async () => {
 const browser=await chromiumHarness(bundle);
 try {
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
  assert.equal(await browser.evaluate(`(async()=>{
   for(const scenario of ['defined-duplicate','legacy-relink','append-only','reverse-owner','unavailable']){
    const f=await makeRelationshipFixture('parent-policies-'+scenario,'Parent',scenario!=='defined-duplicate'),i=f.index,c=f.context;
    try {
     const a=f.files.get('A.md'),b=f.files.get('B.md'),native=f.app.fileManager.processFrontMatter;
     if(scenario==='defined-duplicate')await native(a,fm=>{fm.Parent=['[[B|Alias]]','[[Unrelated]]'];fm.Keep='Unchanged';});
     if(scenario==='legacy-relink'||scenario==='append-only')await native(a,fm=>{fm.Children=['[[B|Old alias]]','[[Unrelated]]'];fm.Keep='Unchanged';});
     if(scenario==='reverse-owner')await native(b,fm=>{fm.Parent=['[[A]]','[[Unrelated]]'];fm.Keep='Unchanged';});
     ok(await i.prepareRelationshipPair(a.path,b.path),'Prepared exact pair for '+scenario);
     const contents=[f.texts.get(a.path),f.texts.get(b.path)],writes=[];
     f.app.fileManager.processFrontMatter=async(file,update)=>{writes.push(file.path);return native(file,update);};
     if(scenario==='unavailable'){
      i.prepareRelationshipPair=async()=>false;
      let failure;try{await c.createRelationToPage(i.get(a.path),'parent',i.get(b.path),'Parent');}catch(error){failure=error;}
      equal(failure?.message,'relation.preparingRelationship','Missing exact authority refuses a write');
      equal(writes,[],'No native callback can run without pair authority');
      equal([f.texts.get(a.path),f.texts.get(b.path)],contents,'Both note bodies remain untouched');
      continue;
     }
     const result=await c.createRelationToPage(i.get(a.path),'parent',i.get(b.path),'Parent','[[B.md|New alias]]',scenario==='append-only');
     const stored=f.metadata.get(scenario==='reverse-owner'?b.path:a.path).frontmatter;
     if(scenario==='defined-duplicate'){
      equal(result.state,'unavailable','An explicit Parent stays a duplicate regardless of alias');
      equal(writes,[],'Duplicate refusal performs no write');
      equal(stored.Parent,['[[B|Alias]]','[[Unrelated]]'],'Existing declaration and alias stay intact');
     }else if(scenario==='reverse-owner'){
      equal(result.state,'saved-published','The opposite explicit role uses legacy relink');
      equal(writes,[b.path],'Relink stays on the existing definition owner');
      equal(stored.Parent,['[[Unrelated]]'],'Only the moved target leaves the original field');
      equal(stored.Children,['[[A.md]]'],'The existing owner retains the inverse definition');
      equal(f.texts.get(a.path),contents[0],'The viewed origin stays untouched when B owns the definition');
      equal(f.texts.get(b.path).split('\\n---\\n')[1],'[[A]]\\n','Relink on B preserves its ordinary body link');
     }else{
      equal(result.state,'saved-published','A different explicit role can be selected');
      equal(writes,[a.path],'Only the exact writable owner changes');
      equal(stored.Children,scenario==='append-only'?['[[B|Old alias]]','[[Unrelated]]']:['[[Unrelated]]'],'Legacy relink removes the moved declaration and explicit append keeps it');
      equal(stored.Parent,scenario==='append-only'?['[[B.md|New alias]]']:['[[B.md]]'],'Each write policy retains its reference handling');
     }
     equal(stored.Keep,'Unchanged','Unrelated document properties stay intact');
     if(scenario!=='reverse-owner')equal(f.texts.get(b.path),contents[1],'The target body stays byte-for-byte intact');
    }finally{f.close();}
   }
   return true;
  })()`),true);
 }finally{await browser.cleanup();}
});

/** Saved pair replacements must compose across edits without changing unedited old-policy relations. */

test("connection details additive ontology consent expires across preparation, native reads and reciprocal retry", async () => {
 const browser=await chromiumHarness(bundle);
 try {
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
  assert.equal(await browser.evaluate(`(async()=>{
   for(const mode of ['legacy-success','closed','preparation','native','saved','reciprocal-native','reciprocal-retry']){
    const f=await makeRelationshipFixture('details-add-lifetime-'+mode),i=f.index,c=f.context;
    try{
     if(mode.startsWith('reciprocal')){c.settings.alsoWriteInverseOntology=true;i.invalidateSemanticPolicy();}
     ok(await i.prepareRelationshipPair('A.md','B.md'),'Exact details pair');
     let live=mode!=='closed',attempts=0,saved=0;
     const prepare=c.prepareRelationshipMutation,native=f.app.fileManager.processFrontMatter;
     c.prepareRelationshipMutation=async(...args)=>{const result=await prepare.apply(c,args);if(mode==='preparation')live=false;return result;};
     f.app.fileManager.processFrontMatter=async(file,update)=>{attempts++;
      if(mode==='reciprocal-retry'&&attempts===2)throw Error('Second native write unavailable');
      await native(file,fm=>{if(mode==='native'||mode==='reciprocal-native')live=false;update(fm);});saved++;if(mode==='saved')live=false;
     };
     let outcome,failure;try{outcome=await c.addOntologyToConnection(i.get('A.md'),i.get('B.md'),'right','Opposes',null,mode==='legacy-success'?undefined:()=>live);}catch(error){failure=error;}
     if(mode==='legacy-success'){equal(outcome?.state,'saved-published','Existing callers keep successful additive behavior');equal(saved,1,'One additive owner');}
     else if(mode==='saved'){ok(failure instanceof M.SavedRelationshipPendingError,'Consent retirement after durable save is truthful');equal(saved,1);}
     else if(mode==='reciprocal-retry'){
      ok(failure instanceof M.ReciprocalRelationshipWriteError,'Partial receipt retained');equal(saved,1,'Only first owner saved');live=false;
      try{await failure.receipt.retry();}catch{}equal(attempts,2,'Closed details cannot authorize missing reciprocal owner on Retry');equal(saved,1);
     }else{ok(failure,'Retired details reject '+mode);equal(saved,0,'No durable assignment after retired consent');}
     equal(c.relationshipWriteCancels.size,0,'All native observers retired');
    }finally{f.close();}
   }return true;
  })()`),true);
 }finally{await browser.cleanup();}
});

test("connection ontology replacement supports all six directions, preserves other targets and leaves a single owner single", async () => {
 const browser=await chromiumHarness(bundle);
 try {
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
  assert.equal(await browser.evaluate(`(async()=>{
   const f=await makeRelationshipFixture('change-single-ontology'),i=f.index,c=f.context;
   try {
    c.settings.hierarchy.previous=['Earlier'];c.settings.hierarchy.next=['Later'];c.settings.alsoWriteInverseOntology=true;i.invalidateSemanticPolicy();
    await f.app.fileManager.processFrontMatter(f.files.get('B.md'),fm=>{fm.Parents=['[[A]]','[[Unrelated]]','[[A]]'];fm.Keep='Unchanged';});
    ok(await i.prepareRelationshipPair('A.md','B.md'),'Fresh document-property declaration');
    const roles={child:'Children',left:'Friends',right:'Opposes',previous:'Earlier',next:'Later',parent:'Parents'},native=f.app.fileManager.processFrontMatter;
    let writes=0;f.app.fileManager.processFrontMatter=async(file,update)=>{writes++;return native(file,fm=>{if(writes===1)fm.Parents.push('[[Unrelated]]');update(fm)})};
    for(const [role,field]of Object.entries(roles)){
     const approved=c.captureConnectionOntologyChange('A.md','B.md');ok(approved,'One physical document-property selection for '+role);
     equal(approved.selection.primary.declaredByPath,'B.md','Inverse viewed declaration keeps its physical owner');
     const result=await c.changeConnectionOntology(approved,role,field,()=>true);equal(result.state,'saved-published','Exact committed role '+role);
     const fm=f.metadata.get('B.md').frontmatter;equal(fm.Keep,'Unchanged','Unrelated property retained');
     ok(fm.Parents.includes('[[Unrelated]]'),'Other target survives a field move');
     equal(fm.Parents.filter(value=>value==='[[Unrelated]]').length,2,'Concurrent unrelated member addition is preserved');
     ok(c.valueContainsTarget(fm[field],f.files.get('B.md'),i.get('A.md')),'New property contains exact target');
     equal(f.metadata.get('A.md').frontmatter,{},'Global mirroring preference does not manufacture a second owner');
     equal(i.evidenceBetween('A.md','B.md').filter(e=>e.sourceKind==='frontmatter-ontology').length,1,'One canonical explicit declaration');
    }
    const before=writes,approved=c.captureConnectionOntologyChange('A.md','B.md');await c.changeConnectionOntology(approved,'parent','Parents',()=>true);
    equal(writes,before,'No-op reselect performs zero native writes');equal(i.getSemanticPreparationDiagnostics().fullBuilds,0,'No full graph rebuild');return true;
   } finally {f.close();}
  })()`),true);
 } finally {await browser.cleanup();}
});

test("connection ontology replacement supports single Markdown owners of attachments, unresolved notes and exact URLs", async () => {
 const browser=await chromiumHarness(bundle);
 try {
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
  assert.equal(await browser.evaluate(`(async()=>{
   for(const kind of ['attachment','unresolved','url','attachment-replaced','unresolved-materialized']){
    const f=await makeRelationshipFixture('change-nonmarkdown-'+kind),i=f.index,c=f.context;
    try {
     let target;c.validateRelatedNoteName=name=>({valid:true,existing:null,stem:name});
     if(kind.startsWith('attachment')){
      await f.app.fileManager.processFrontMatter(f.files.get('A.md'),fm=>{fm.Children=['[[icon.svg]]'];});
      ok(await i.prepareRelationshipPair('A.md','icon.svg'),'Exact SVG target');target=i.get('icon.svg');
     }else if(kind.startsWith('unresolved'))target=await c.createPlaceholderRelatedPage(i.get('A.md'),'child','Not created yet','Children');
     else target=await c.createWebLinkRelatedPage(i.get('A.md'),'child','https://example.com/ExactCase','Exact URL','Children');
     ok(target,'Canonical non-Markdown endpoint');const approved=c.captureConnectionOntologyChange(target.path,'A.md');
     ok(approved&&approved.selection.declarations.length===1,'Single Markdown storage can change '+kind);
     equal(approved.selection.primary.declaredByPath,'A.md','Reverse viewing does not adopt non-Markdown storage');
     const native=f.app.fileManager.processFrontMatter;let writes=0;
     f.app.fileManager.processFrontMatter=async(file,update)=>{equal(file.path,'A.md','Only approved Markdown owns native writes');writes++;return native(file,fm=>{
      if(kind==='attachment-replaced')f.files.set(target.path,{...target.file});
      if(kind==='unresolved-materialized')f.add(target.path,'A new note');
      update(fm);
     })};
     let outcome,error;try{outcome=await c.changeConnectionOntology(approved,'right','Opposes',()=>true)}catch(failure){error=failure}
     equal(writes,1,'One native callback without manufacturing inverse storage');
     const fm=f.metadata.get('A.md').frontmatter;
     if(kind==='attachment-replaced'||kind==='unresolved-materialized'){
      ok(error,'A new native target cannot inherit prior approval: '+kind);ok(fm.Children,'Old target remains after rejected native callback');equal(fm.Opposes,undefined,'No replacement property assigned');
     }else{
      equal(outcome?.state,'saved-published','Non-Markdown target changes successfully '+kind);equal(fm.Children,undefined,'Only selected old reference moved');
      ok(c.valueContainsTarget(fm.Opposes,f.files.get('A.md'),i.get(target.path)),'Exact native or nullable target preserved');
      ok(c.captureConnectionOntologyChange('A.md',target.path),'Changed single-owner connection remains editable');
     }
    }finally{f.close();}
   }return true;
  })()`),true);
 }finally{await browser.cleanup();}
});

test("connection ontology replacement changes both approved reciprocal owners and retries only the failed second write", async () => {
 const browser=await chromiumHarness(bundle);
 try {
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
  assert.equal(await browser.evaluate(`(async()=>{
   const f=await makeRelationshipFixture('change-reciprocal-ontology'),i=f.index,c=f.context;
   try {
    c.settings.ontologyPairingVersion=1;c.settings.hierarchy.children=['Children/Parents'];c.settings.hierarchy.parents=[];
    c.settings.hierarchy.previous=['Earlier/Later'];c.settings.hierarchy.next=[];i.invalidateSemanticPolicy();
    await f.app.fileManager.processFrontMatter(f.files.get('A.md'),fm=>{fm.Children=['[[B]]','[[Unrelated]]'];fm.Keep='first';});
    await f.app.fileManager.processFrontMatter(f.files.get('B.md'),fm=>{fm.Keep='second';});
    ok(await i.prepareRelationshipPair('A.md','B.md'),'Reciprocal document properties ready');
    const approved=c.captureConnectionOntologyChange('A.md','B.md');ok(approved&&approved.selection.declarations.length===2,'One configured reciprocal pair');
    const native=f.app.fileManager.processFrontMatter,calls=[];let fail=true;
    f.app.fileManager.processFrontMatter=async(file,update)=>{calls.push(file.path);if(file.path==='B.md'&&fail){fail=false;throw Error('Second native write failed');}return native(file,update)};
    let partial;try{await c.changeConnectionOntology(approved,'previous','Earlier',()=>true)}catch(error){partial=error}
    ok(partial instanceof M.ReciprocalRelationshipWriteError,'Truthful reciprocal recovery receipt');
    equal(partial.outcomes.map(x=>x.state),['saved','pending'],'First replacement durably saved before second failed');
    equal(f.metadata.get('A.md').frontmatter.Children,['[[Unrelated]]'],'Only selected old target moved');
    ok(f.metadata.get('A.md').frontmatter.Earlier,'First new field persisted');ok(f.metadata.get('B.md').frontmatter.Parents,'Unsaved second old field retained');
    await partial.receipt.retry();equal(calls,['A.md','B.md','B.md'],'Successful first owner is never replayed');
    equal(f.metadata.get('B.md').frontmatter.Parents,undefined,'Second old target removed after retry');ok(f.metadata.get('B.md').frontmatter.Later,'Inverse field saved');
    equal(f.metadata.get('A.md').frontmatter.Keep,'first','First unrelated field retained');equal(f.metadata.get('B.md').frontmatter.Keep,'second','Second unrelated field retained');
    const changed=c.captureConnectionOntologyChange('A.md','B.md');ok(changed&&changed.selection.primary.declaredRole==='previous','New canonical reciprocal intent remains editable');
    await c.changeConnectionOntology(changed,'right','Opposes',()=>true);
    equal(f.metadata.get('A.md').frontmatter.Earlier,undefined,'Previous property retired by the next explicit change');
    equal(f.metadata.get('B.md').frontmatter.Later,undefined,'Next counterpart retired together');
    const symmetric=c.captureConnectionOntologyChange('B.md','A.md');ok(symmetric&&symmetric.selection.declarations.length===2,'Same symmetric Challenger field remains a reciprocal edit intent');
    const beforeCalls=calls.length;await c.changeConnectionOntology(symmetric,'child','Children',()=>true);
    ok(calls.length===beforeCalls+2,'Both original physical owners are updated from the reverse view');
    c.settings.hierarchy.previous.push('Standalone previous');i.invalidateSemanticPolicy();
    const unpaired=c.captureConnectionOntologyChange('A.md','B.md'),beforeRefusal=calls.length;let refused;
    try{await c.changeConnectionOntology(unpaired,'previous','Standalone previous',()=>true)}catch(error){refused=error}
    ok(refused&&refused.message==='reciprocal.requiresInverse','A two-owner replacement requires an explicit new counterpart');equal(calls.length,beforeRefusal,'Missing inverse fails before any native write');
    return true;
   } finally {f.close();}
  })()`),true);
 } finally {await browser.cleanup();}
});

test("single-owner ontology replacement reports a thrown post-save publication failure as saved-pending", async () => {
 const browser=await chromiumHarness(bundle);
 try {
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
  assert.equal(await browser.evaluate(`(async()=>{
   const f=await makeRelationshipFixture('change-single-publication-failure'),i=f.index,c=f.context;
   try {
    ok(await i.prepareRelationshipPair('A.md','B.md'),'Original exact document-property pair');
    const approved=c.captureConnectionOntologyChange('A.md','B.md');ok(approved&&approved.selection.declarations.length===1,'One original physical owner');
    const native=f.app.fileManager.processFrontMatter,failure=new Error('Canonical publication failed');let writes=0,publications=0;
    f.app.fileManager.processFrontMatter=async(...args)=>{writes++;return native(...args)};
    c.publishSavedRelationship=async()=>{publications++;throw failure};
    let outcome;try{await c.changeConnectionOntology(approved,'right','Opposes',()=>true)}catch(error){outcome=error}
    ok(outcome instanceof M.SavedRelationshipPendingError,'Durable replacement must not report an unsaved failure');
    equal(outcome.message,'relation.savedUpdatePending','Pending outcome uses the existing saved-relationship copy');
    ok(Reflect.get(outcome,'cause')===failure,'Original private publication failure is retained for diagnostics');
    equal(writes,1,'Exactly one native write, with no replay after publication failure');equal(publications,1,'One attempted canonical publication');
    equal(f.metadata.get('B.md').frontmatter.Parents,undefined,'Old selected property is durably removed');
    ok(c.valueContainsTarget(f.metadata.get('B.md').frontmatter.Opposes,f.files.get('B.md'),i.get('A.md')),'Replacement reference is durably saved');
    equal(f.metadata.get('A.md').frontmatter,{},'No other owner was manufactured');return true;
   } finally {f.close();}
  })()`),true);
 } finally {await browser.cleanup();}
});

test("connection ontology replacement resumes first-write failure and saved-pending receipts without replaying saved owners", async () => {
 const browser=await chromiumHarness(bundle);
 try {
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
  assert.equal(await browser.evaluate(`(async()=>{
   for(const mode of ['first-failed','first-saved-pending','last-saved-pending']){
    const f=await makeRelationshipFixture('change-reciprocal-retry-'+mode),i=f.index,c=f.context;
    try {
     c.settings.ontologyPairingVersion=1;c.settings.hierarchy.children=['Children/Parents'];c.settings.hierarchy.parents=[];
     c.settings.hierarchy.previous=['Earlier/Later'];c.settings.hierarchy.next=[];i.invalidateSemanticPolicy();
     await f.app.fileManager.processFrontMatter(f.files.get('A.md'),fm=>{fm.Children=['[[B]]'];});
     ok(await i.prepareRelationshipPair('A.md','B.md'),'Reciprocal source authority');
     const approved=c.captureConnectionOntologyChange('A.md','B.md');ok(approved,'Reciprocal selection');
     const native=f.app.fileManager.processFrontMatter,mutate=c.mutateRelationshipMetadata,calls=[],foreground=i.withForegroundPriority.bind(i);let once=true,priority=0;
     i.withForegroundPriority=(work,...args)=>foreground(async()=>{priority++;try{return await work()}finally{priority--}},...args);
     f.app.fileManager.processFrontMatter=async(file,update)=>{ok(priority>0,'Retained receipt owns mutation priority');calls.push(file.path);if(mode==='first-failed'&&once){once=false;throw Error('First write rejected');}return native(file,update)};
     c.mutateRelationshipMetadata=async(...args)=>{await mutate.apply(c,args);if(mode!=='first-failed'&&once&&args[0].path===(mode==='first-saved-pending'?'A.md':'B.md')){once=false;throw new M.SavedRelationshipPendingError('Saved metadata still pending');}};
     let partial;try{await c.changeConnectionOntology(approved,'previous','Earlier',()=>true)}catch(error){partial=error}
     ok(partial instanceof M.ReciprocalRelationshipWriteError,'Retained native outcome for '+mode);
     equal(partial.outcomes.map(x=>x.state),mode==='first-failed'?['pending','pending']:mode==='first-saved-pending'?['saved-pending','pending']:['saved','saved-pending'],'Truthful per-owner states');
     await partial.receipt.retry();
     equal(calls,mode==='first-failed'?['A.md','A.md','B.md']:['A.md','B.md'],'Only genuinely missing native work retries');
     const after=c.captureConnectionOntologyChange('A.md','B.md');ok(after&&after.selection.declarations.length===2&&after.selection.primary.declaredRole==='previous','Actual pair publication after retry');
    } finally {f.close();}
   }return true;
  })()`),true);
 } finally {await browser.cleanup();}
});

test("connection ontology replacement cannot advance saved-pending owners before their actual new metadata is observed", async () => {
 const browser=await chromiumHarness(bundle);
 try {
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
  assert.equal(await browser.evaluate(`(async()=>{
   const f=await makeRelationshipFixture('change-reciprocal-observation'),i=f.index,c=f.context;
   try {
    c.settings.ontologyPairingVersion=1;c.settings.hierarchy.children=['Children/Parents'];c.settings.hierarchy.parents=[];
    c.settings.hierarchy.previous=['Earlier/Later'];c.settings.hierarchy.next=[];i.invalidateSemanticPolicy();
    await f.app.fileManager.processFrontMatter(f.files.get('A.md'),fm=>{fm.Children=['[[B]]'];});
    ok(await i.prepareRelationshipPair('A.md','B.md'),'Original actual pair');const approved=c.captureConnectionOntologyChange('A.md','B.md');ok(approved,'Approved reciprocal intent');
    const native=f.app.fileManager.processFrontMatter,calls=[];let pending,hold=true;
    f.app.fileManager.processFrontMatter=async(file,update)=>{
     calls.push(file.path);
     if(file.path!=='A.md'||!hold)return native(file,update);
     hold=false;const frontmatter=structuredClone(f.metadata.get(file.path).frontmatter);update(frontmatter);
     file.stat.mtime++;f.texts.set(file.path,f.texts.get(file.path)+'\\n');f.app.vault.trigger('modify',file);
     pending={file,cache:{...f.metadata.get(file.path),frontmatter}};
     window.setTimeout(()=>{for(const cancel of c.relationshipWriteCancels)cancel()},0);
    };
    let partial;try{await c.changeConnectionOntology(approved,'previous','Earlier',()=>true)}catch(error){partial=error}
    ok(partial instanceof M.ReciprocalRelationshipWriteError,'Saved-but-unobserved first owner yields a retained receipt');
    equal(partial.outcomes.map(x=>x.state),['saved-pending','pending'],'Actual first persistence is not reissued');
    let blocked;try{await partial.receipt.retry()}catch(error){blocked=error}
    ok(blocked,'Unobserved replacement cannot authorize the second file');equal(calls,['A.md'],'No new mutation before current metadata');
    f.metadata.set(pending.file.path,pending.cache);f.app.metadataCache.trigger('changed',pending.file,f.texts.get(pending.file.path),pending.cache);
    await partial.receipt.retry();equal(calls,['A.md','B.md'],'Observed saved-pending first owner is reused');
    ok(c.captureConnectionOntologyChange('A.md','B.md')?.selection.primary.declaredRole==='previous','Real canonical publication after observation');return true;
   } finally {f.close();}
  })()`),true);
 } finally {await browser.cleanup();}
});

test("connection ontology replacement refuses stale declarations, native replacements and competing fields inside the native read", async () => {
 const browser=await chromiumHarness(bundle);
 try {
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
  assert.equal(await browser.evaluate(`(async()=>{
   for(const mode of ['declaration','replacement','native-field','cancelled','configuration','destination-shape','ambiguous-key']){
    const f=await makeRelationshipFixture('change-ontology-fence-'+mode),i=f.index,c=f.context;
    try{
     ok(await i.prepareRelationshipPair('A.md','B.md'),'Initial exact pair');const approved=c.captureConnectionOntologyChange('A.md','B.md');ok(approved,'Captured single property');
     const original=structuredClone(f.metadata.get('B.md').frontmatter),native=f.app.fileManager.processFrontMatter;let writes=0;
     if(mode==='declaration'){await native(f.files.get('B.md'),fm=>{fm.Friends=['[[A]]'];});}
     if(mode==='replacement')f.files.set('A.md',new window.ContributorFile('A.md'));
     if(mode==='configuration'){c.settings.hierarchy.parents=['Different parent'];i.invalidateSemanticPolicy();}
     f.app.fileManager.processFrontMatter=async(file,update)=>native(file,fm=>{if(mode==='native-field')fm.Friends=['[[A]]'];if(mode==='destination-shape')fm.Opposes={unsupported:'shape'};if(mode==='ambiguous-key')fm.parents=['[[A]]'];update(fm);writes++});
     let failure;try{await c.changeConnectionOntology(approved,'right','Opposes',()=>mode!=='cancelled')}catch(error){failure=error}
     ok(failure,'Stale intent rejected: '+mode);equal(writes,0,'No replacement metadata assignment for '+mode);
     const fm=f.metadata.get('B.md').frontmatter;equal(fm.Opposes,undefined,'No new field for '+mode);equal(fm.Parents,original.Parents,'Original selected field retained');
    }finally{f.close();}
   }return true;
  })()`),true);
 } finally {await browser.cleanup();}
});

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
for(const mode of ['policy','unnotified-policy','unnotified-presentation','cache','file','unrelated']){
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
     if(mode==='unnotified-policy')i.plugin.settings.hierarchy.children.push('Uncommitted child field');
     if(mode==='unnotified-presentation')i.plugin.settings.baseNodeStyle.maxLabelLength++;
     if(mode==='cache')f.metadata.set('A.md',{...f.metadata.get('A.md'),frontmatter:{Children:['[[B]]']}});
     if(mode==='file')f.files.set('A.md',new window.ContributorFile('A.md'));
     if(mode==='unrelated'){const file=f.files.get('Unrelated.md');file.stat.mtime++;f.texts.set(file.path,'Changed');f.app.vault.trigger('modify',file);}
     release();const ready=await task;
     const mayReprepare=mode==='unrelated'||mode==='unnotified-presentation';
     equal(ready,mayReprepare,'Semantic/selected identity changes reject; unrelated source or presentation inputs may reprepare');
     equal(i.getSemanticRevision(),revision+(mayReprepare?1:0),'No partial or stale semantic prefix publication');
     if(mode==='unnotified-presentation')equal([...i.relationshipPairs.values()][0].settings.maxLabelLength,i.plugin.settings.baseNodeStyle.maxLabelLength,'Retry captures the changed presentation input');
     ok(!i.isConnected(i.get('A.md'),'image.png'),'Negative evidence retained coherently');return true;
    }finally{f.close();}
   })()`),true);
  }finally{await browser.cleanup();}
 });
}

/** Known linked-source fanout must settle before the unchanged exact pair spends its last retry. */
test('published exact pairs survive presentation edits and reject unnotified semantic edits',async()=>{
 const browser=await chromiumHarness(bundle);
 try{
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
  assert.equal(await browser.evaluate(`(async()=>{
   const f=await makeRelationshipFixture('pair-published-policy'),i=f.index;
   try{
    ok(await i.prepareRelationshipPair('A.md','image.png'),'Exact pair prepares');
    const pair=[...i.relationshipPairs.values()][0];ok(pair.current(),'Published current pair');
    i.plugin.settings.baseNodeStyle.maxLabelLength++;
    i.plugin.settings.tagStyleList.push('New presentation style');
    ok(pair.current(),'Presentation does not retire published semantic relations');
    i.plugin.settings.inferAllLinksAsFriends=!i.plugin.settings.inferAllLinksAsFriends;
    ok(!pair.current(),'Direct semantic edits still retire published authority');return true;
   }finally{f.close();}
  })()`),true);
 }finally{await browser.cleanup();}
});

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

/** New physical files save before graph reconciliation; virtual targets retain their existing canonical publication contract. */
for(const kind of ['file','url','placeholder']){
 test(`new ${kind} related node persists and reconciles to canonical saved publication`,async()=>{
  const browser=await chromiumHarness(bundle);
  try{
   assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
   assert.equal(await browser.evaluate(`(async()=>{
    const f=await makeRelationshipFixture('creation-${kind}'),i=f.index,c=f.context,kind=${JSON.stringify(kind)};
    try{
     let page;
     c.validateRelatedNoteName=name=>({valid:true,existing:null,stem:name});
     if(kind==='file'){const file=f.add('Created.md','');f.app.vault.trigger('create',file);const result=await c.linkNewRelatedFile(i.get('A.md'),'child',file,'Children');equal(result.state,'saved-pending','Native write completes before index reconciliation');page=result.page;ok(await i.prepareRelationshipPair('A.md',page.path),'Ordinary source reconciliation can publish the saved pair afterward');}
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

/** An actively blocked index cannot prevent persisting a new drawing's additive parent property. */
test("new drawing relationship saves during structural refresh with unavailable semantic pair readiness", async () => {
 const browser=await chromiumHarness(bundle);
 try {
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
  assert.equal(await browser.evaluate(`(async()=>{
   const f=await makeRelationshipFixture('new-drawing-index-independent'),i=f.index,c=f.context;
   const previous=i.pendingStructuralTasks;let pairCalls=0;
   try {
    const file=f.add('New drawing.md','',{ 'excalidraw-plugin':'parsed' });f.app.vault.trigger('create',file);
    const parent=f.files.get('A.md'),prior={ 'excalidraw-plugin':'parsed',Children:['[[Unrelated]]'],Parents:['[[B]]'],Title:'Preserved' };
    f.metadata.set(parent.path,{frontmatter:prior});i.pendingStructuralTasks++;
    const pair=i.prepareRelationshipPair;i.prepareRelationshipPair=async()=>{pairCalls++;return false;};
    ok(!i.isSemanticWriteReady(parent.path,file.path),'Actual structural refresh closes semantic authority');
    const result=await c.linkNewRelatedFile(i.get(parent.path),'child',file,'Children');
    equal(result.state,'saved-pending','Persistence succeeds independently of graph publication');ok(result.page.file===file,'Exact created file retained');
    equal(pairCalls,0,'Creation never asks the canonical pair gate to authorize a property addition');
    equal(f.metadata.get(parent.path).frontmatter,{...prior,Children:['[[Unrelated]]','[[New drawing.md]]']},'Native additive property saved without changing other metadata');
    ok(i.neighbours(i.get(parent.path),'child').some(row=>row.page.file===file),'The saved child is visible during structural refresh');
    ok(i.neighbours(i.get(file.path),'parent').some(row=>row.page.file===parent),'The inverse reading is also visible immediately');
    ok(!i.isSemanticWriteReady(parent.path,file.path),'Local presentation cannot authorize canonical edits');
    parent.stat.mtime++;
    ok(!i.neighbours(i.get(parent.path),'child').some(row=>row.page.file===file),'A later owner edit invalidates the unpublished receipt');
    i.pendingStructuralTasks=previous;i.prepareRelationshipPair=pair;
    ok(await i.prepareRelationshipPair(parent.path,file.path),'Ordinary canonical reconciliation catches up after refresh');
    ok(i.isConnected(i.get(parent.path),file.path),'Saved new child becomes canonical');return true;
   }finally{i.pendingStructuralTasks=previous;f.close();}
  })()`),true);
 }finally{await browser.cleanup();}
});

test("a newly saved Friend appears in the Classic scene before MetadataCache or the global owner catches up", async () => {
 const browser=await chromiumHarness(bundle);
 try {
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
  assert.equal(await browser.evaluate(`(async()=>{
   const f=await makeRelationshipFixture('friend-local-publication'),i=f.index,c=f.context;
   let sourceReleased, sourceWork;
   try {
    const parent=f.files.get('A.md');
    const file=f.add('New friend.md','');f.app.vault.trigger('create',file);
    const hold=new Promise(resolve=>sourceReleased=resolve);
    sourceWork=i.workScheduler.run(4,()=>hold);
    i.pendingStructuralTasks++;
    let saved;
    f.app.fileManager.processFrontMatter=async (owner,update)=>{
      saved={owner,frontmatter:structuredClone(f.metadata.get(owner.path).frontmatter??{})};
      update(saved.frontmatter);owner.stat.mtime++;
    };
    await c.linkNewRelatedFile(i.get(parent.path),'left',file,'Friends');
    equal(saved.frontmatter.Friends,['[[New friend.md]]'],'Friend added to the actual writer payload');
    ok(!f.metadata.get(parent.path).frontmatter?.Friends,'Obsidian metadata still lags the successful save');
    ok(i.getNeighborhood(parent.path).leftFriends.some(row=>row.page.file===file),'Rendered neighborhood includes the new Friend before releasing index work');
    ok(!i.isSemanticWriteReady(parent.path,file.path),'The displayed link does not grant edit authority');
    f.plugin.settings.showPageNodes=false;
    ok(!i.getNeighborhood(parent.path).leftFriends.some(row=>row.page.file===file),'The current page filter still applies to the saved link');
    f.plugin.settings.showPageNodes=true;
    f.files.delete(file.path);
    f.app.vault.trigger('delete',file);
    ok(!i.getNeighborhood(parent.path).leftFriends.some(row=>row.page.file===file),'Retired target identity prevents stale display');
    return true;
   }finally{i.pendingStructuralTasks--;sourceReleased?.();await sourceWork;f.close();}
  })()`),true);
 }finally{await browser.cleanup();}
});

/** A usage dialog is a projection of existing field postings, including fields with scalar values. */
test('ontology usage queries real stored unassigned/inline field names without acquiring, compiling or writing sources',async()=>{
 const browser=await chromiumHarness(bundle);
 try{
  assert.equal(await browser.evaluate(contributorBrowserInitialize),true);await browser.evaluate(setup);
  assert.equal(await browser.evaluate(`(async()=>{
   const f=await makeRelationshipFixture('ontology-usage-existing-postings'),i=f.index;
   try{
    const file=f.add('Scalar.md','[Erroneous Property:: scalar]',{'Erroneous Property':'not a link'});
    const acquired=await i.sourceAcquisition.acquire(file,M.parseBodyMetadata(f.texts.get(file.path)));
    ok(acquired.current&&acquired.saved,'Seed existing neutral-source facts');
    const before=JSON.stringify(i.sourceAcquisition.getCounters()),headsBefore=await value((await i.indexedDb.open()).transaction('sourceHeads').objectStore('sourceHeads').getAll());
    const original=i.sourceAcquisition.acquire,replace=i.indexedDb.sources.replace;let acquisitions=0,replacements=0;
    i.sourceAcquisition.acquire=async(...args)=>{acquisitions++;return original.apply(i.sourceAcquisition,args)};
    i.indexedDb.sources.replace=async(...args)=>{replacements++;return replace.apply(i.indexedDb.sources,args)};
    const result=await i.ontologyUsage('Erroneous Property',()=>true);
    equal(result,{documents:[{path:'Scalar.md',name:'Scalar'}],partial:false},'Name-only data returns one document despite repeated surfaces');
    equal(acquisitions,0,'Lookup never acquires sources');equal(replacements,0,'Lookup never rewrites sources');
    equal(await value((await i.indexedDb.open()).transaction('sourceHeads').objectStore('sourceHeads').getAll()),headsBefore,'Existing selected heads unchanged');
    equal(JSON.stringify(i.sourceAcquisition.getCounters()),before,'No acquisition counters changed');
    const parents=await i.ontologyUsage('Parents',()=>true);equal(parents.documents,[{path:'B.md',name:'B'}],'Configured field uses physical declaration owner');
    return true;
   }finally{f.close();}
  })()`),true);
 }finally{await browser.cleanup();}
});
