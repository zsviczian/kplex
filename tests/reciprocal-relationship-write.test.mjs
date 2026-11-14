/** Exact native-file and per-write outcomes for opt-in reciprocal ontology authoring. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=ts.createSourceFile('src/main.ts',readFileSync('src/main.ts','utf8'),ts.ScriptTarget.Latest,true);
const names=new Set(['writeReciprocalRelationship','createRelationToPage','addOntologyToConnection','relinkCentralNeighbour','linkNewRelatedFile','appendRelationshipReference','addRelationshipOntology','writeRelationship']),methods=[];
/** Test actual writer dispatch and queued callback fencing rather than a parallel authoring implementation. */
const visit=node=>{if(ts.isMethodDeclaration(node)&&names.has(node.name.getText(source)))methods.push(node.getText(source));ts.forEachChild(node,visit)};visit(source);assert.equal(methods.length,names.size);
const modalSource=ts.createSourceFile('RelationModal.ts',readFileSync('src/ui/RelationModal.ts','utf8'),ts.ScriptTarget.Latest,true);
const modalNames=new Set(['reciprocalValidation','canSave','confirm','retryReciprocal','onClose']),modalMethods=[];
/** Source-extracted native shell methods retain their real save/preflight/retry/lifetime branches. */
const visitModal=node=>{if(ts.isMethodDeclaration(node)&&modalNames.has(node.name.getText(modalSource)))modalMethods.push(node.getText(modalSource));ts.forEachChild(node,visitModal)};visitModal(modalSource);assert.equal(modalMethods.length,modalNames.size);
const endpointSource=ts.createSourceFile('NewRelatedNoteModal.ts',readFileSync('src/ui/NewRelatedNoteModal.ts','utf8'),ts.ScriptTarget.Latest,true);
const endpointFunctions=endpointSource.statements.filter(node=>ts.isFunctionDeclaration(node)&&['captureRelatedEndpoint','refreshCapturedPage'].includes(node.name?.text)).map(node=>node.getText(endpointSource));
assert.equal(endpointFunctions.length,2);
const result=await build({stdin:{resolveDir:process.cwd(),loader:'ts',contents:`
export * from './src/adapters/obsidian/reciprocalRelationshipWrite';
export {SavedRelationshipPendingError} from './src/adapters/obsidian/relationshipMetadataWrite';
export {ontologyConfiguration} from './src/core/contracts/ontologyConfiguration';
import {createReciprocalWriteReceipt,hasIndependentFrontmatterDeclarations,reciprocalOntologyFields,reciprocalPreflight,ReciprocalRelationshipWriteError} from './src/adapters/obsidian/reciprocalRelationshipWrite';
import {SavedRelationshipPendingError} from './src/adapters/obsidian/relationshipMetadataWrite';
import {ontologyConfiguration} from './src/core/contracts/ontologyConfiguration';
import {normalizeFieldName} from './src/core/contracts/fieldName';
import {eligibleRelationshipOwner} from './src/adapters/obsidian/relationshipOwner';
export const notices=[];class Notice{constructor(message){notices.push(message)}}
${endpointFunctions.join('\n')}
export class AuthoringHost{${methods.join('\n')}}
export class RelationShell{${modalMethods.join('\n')}}
`},bundle:true,write:false,format:'cjs',platform:'node'});
const module={exports:{}};Function('module','exports',result.outputFiles[0].text)(module,module.exports);const M=module.exports;
/** Start from real configured pairing syntax; neither tests nor adapter synthesize an inverse name. */
const configuration=(parents=['Parent / Child'],leftFriends=['Friend'],rightFriends=['Challenger'])=>M.ontologyConfiguration({ontologyPairingVersion:1,hierarchy:{parents,children:[],leftFriends,rightFriends,previous:['Previous / Next'],next:[],hidden:['Hidden'],exclusions:['Excluded']}});

test('reciprocal field selection uses authored pairing and configured symmetric fields only',()=>{
 const c=configuration();
 assert.deepEqual(M.reciprocalOntologyFields(c,'parent','parent'),{forward:'Parent',inverse:'Child'});
 assert.deepEqual(M.reciprocalOntologyFields(c,'Child','child'),{forward:'Child',inverse:'Parent'});
 assert.deepEqual(M.reciprocalOntologyFields(c,'Friend','left'),{forward:'Friend',inverse:'Friend'});
 assert.deepEqual(M.reciprocalOntologyFields(c,'Challenger','right'),{forward:'Challenger',inverse:'Challenger'});
 assert.deepEqual(M.reciprocalOntologyFields(c,'Next','next'),{forward:'Next',inverse:'Previous'});
 for(const [field,role]of [['Parent','child'],['Unknown','parent'],['Hidden','left'],['Excluded','right']])assert.equal(M.reciprocalOntologyFields(c,field,role),null);
 assert.equal(M.reciprocalOntologyFields(configuration(['Parent']),'Parent','parent'),null,'Missing pairing cannot invent the usual Child field');
});

test('independent property ownership requires two distinct physical declarers, not reverse inferred/body evidence',()=>{
 const first={sourceKind:'frontmatter-ontology',declaredByPath:'A.md'},second={sourceKind:'frontmatter-ontology',declaredByPath:'B.md'};
 assert.equal(M.hasIndependentFrontmatterDeclarations([first,second],'A.md','B.md'),true);
 assert.equal(M.hasIndependentFrontmatterDeclarations([first,first],'A.md','B.md'),false);
 assert.equal(M.hasIndependentFrontmatterDeclarations([first,{...second,sourceKind:'inline-ontology'}],'A.md','B.md'),false);
 assert.equal(M.hasIndependentFrontmatterDeclarations([first],'A.md','A.md'),false);
});

/** A queued native writer mutates only its own file and preserves unrelated concurrent values. */
function fixture(){
 const a={path:'A.md',extension:'md'},b={path:'B.md',extension:'md'},files=new Map([[a.path,a],[b.path,b]]),metadata=new Map([[a,{Keep:'A'}],[b,{Keep:'B'}]]),calls=[];
 let enabled=true,fail=null,before=null,after=null;
 const receipt=M.createReciprocalWriteReceipt({app:{vault:{getFileByPath:path=>files.get(path)??null}},
  first:{file:a,target:b,field:'Parent'},second:{file:b,target:a,field:'Child'},current:()=>enabled,
  write:async(write,current)=>{calls.push(write.file.path);await before?.(write);if(!current())throw Error('Retired native write');if(fail===write.file)throw Error('Native write failed');
   const data=metadata.get(write.file),reference='[['+write.target.path+']]';data[write.field]=[...new Set([...(data[write.field]??[]),reference])];await after?.(write);},
  failureMessage:()=> 'Reciprocal write incomplete',unavailableMessage:()=> 'Endpoints or policy changed'});
 return{a,b,files,metadata,calls,receipt,set enabled(value){enabled=value},set fail(value){fail=value},set before(value){before=value},set after(value){after=value}};
}

test('two successful declarations retain independent per-file outcomes and unrelated metadata',async()=>{
 const f=fixture();await f.receipt.retry();assert.deepEqual(f.calls,['A.md','B.md']);
 assert.deepEqual(f.metadata.get(f.a),{Keep:'A',Parent:['[[B.md]]']});assert.deepEqual(f.metadata.get(f.b),{Keep:'B',Child:['[[A.md]]']});
 assert.deepEqual(f.receipt.outcomes,[{path:'A.md',field:'Parent',state:'saved'},{path:'B.md',field:'Child',state:'saved'}]);
 await f.receipt.retry();assert.equal(f.calls.length,2,'Completed native writes never replay');
});

test('a failed inverse retains the first declaration and retries only the missing approved write',async()=>{
 const f=fixture();f.fail=f.b;let error;
 await assert.rejects(f.receipt.retry(),value=>{error=value;return value instanceof M.ReciprocalRelationshipWriteError});
 assert.equal(error.receipt,f.receipt);assert.deepEqual(error.outcomes.map(value=>value.state),['saved','pending']);
 f.metadata.get(f.a).Parent=['[[User change.md]]'];f.metadata.get(f.b).NewValue='Concurrent edit';f.fail=null;
 await error.receipt.retry();assert.deepEqual(f.calls,['A.md','B.md','B.md']);
 assert.deepEqual(f.metadata.get(f.a),{Keep:'A',Parent:['[[User change.md]]']},'Retry must not reconstruct a successful file from old state');
 assert.deepEqual(f.metadata.get(f.b),{Keep:'B',NewValue:'Concurrent edit',Child:['[[A.md]]']});
});

test('a failed first write stays pending and can retry both declarations without duplicate effects',async()=>{
 const f=fixture();f.fail=f.a;await assert.rejects(f.receipt.retry(),M.ReciprocalRelationshipWriteError);
 assert.deepEqual(f.receipt.outcomes.map(value=>value.state),['pending','pending']);assert.deepEqual(f.metadata.get(f.b),{Keep:'B'});
 f.fail=null;await f.receipt.retry();assert.deepEqual(f.calls,['A.md','A.md','B.md']);
});

for(const change of ['source-rename','target-replacement','policy','attachment'])test(`queued ${change} rejects before mutating either file`,async()=>{
 const f=fixture();f.before=async()=>{if(change==='source-rename')f.a.path='Moved.md';if(change==='target-replacement')f.files.set('B.md',{path:'B.md',extension:'md'});if(change==='policy')f.enabled=false;if(change==='attachment')f.b.extension='png';};
 await assert.rejects(f.receipt.retry(),M.ReciprocalRelationshipWriteError);
 assert.deepEqual(f.metadata.get(f.a),{Keep:'A'});assert.deepEqual(f.metadata.get(f.b),{Keep:'B'});assert.deepEqual(f.receipt.outcomes.map(value=>value.state),['pending','pending']);
});

test('changed policy after a durable first write leaves a recoverable partial without starting the inverse',async()=>{
 const f=fixture();f.after=async(write)=>{if(write.file===f.a)f.enabled=false};
 await assert.rejects(f.receipt.retry(),M.ReciprocalRelationshipWriteError);
 assert.deepEqual(f.receipt.outcomes.map(value=>value.state),['saved','pending']);assert.deepEqual(f.metadata.get(f.a).Parent,['[[B.md]]']);assert.deepEqual(f.calls,['A.md']);
 f.enabled=true;f.after=null;await f.receipt.retry();assert.deepEqual(f.calls,['A.md','B.md']);
});

test('a saved-but-unpublished native write is durable and its retry only fills the missing inverse',async()=>{
 const f=fixture();f.after=async(write)=>{if(write.file===f.a)throw new M.SavedRelationshipPendingError('Saved; native metadata pending')};
 await assert.rejects(f.receipt.retry(),M.ReciprocalRelationshipWriteError);
 assert.deepEqual(f.receipt.outcomes.map(value=>value.state),['saved-pending','pending']);assert.deepEqual(f.metadata.get(f.a).Parent,['[[B.md]]']);
 f.after=null;await f.receipt.retry();assert.deepEqual(f.calls,['A.md','B.md']);
});

test('concurrent retry joins one native operation and only one inverse write',async()=>{
 const f=fixture();let release;const held=new Promise(resolve=>{release=resolve});f.before=async(write)=>{if(write.file===f.a)await held};
 const first=f.receipt.retry(),second=f.receipt.retry();assert.equal(first,second);await Promise.resolve();assert.deepEqual(f.calls,['A.md']);
 release();await Promise.all([first,second]);assert.deepEqual(f.calls,['A.md','B.md']);
});

/** Supply narrow native capabilities while all authoring branches and append grammar remain production code. */
function authoringFixture(){
 const a={path:'A.md',extension:'md'},b={path:'B.md',extension:'md'},files=new Map([[a.path,a],[b.path,b]]);
 const origin={path:a.path,file:a,isFolder:false,isTag:false,url:null},target={path:b.path,file:b,isFolder:false,isTag:false,url:null};
 const metadata=new Map([[a,{Keep:'A'}],[b,{Keep:'B'}]]),calls=[];let fail=null,before=null,publicationFailure=false;
 const settings={alsoWriteInverseOntology:true,ontologyPairingVersion:1,hierarchy:configuration().hierarchy};
 // Retain authored pair syntax, not its already projected role lists.
 settings.hierarchy={parents:['Parent / Child'],children:[],leftFriends:['Friend'],rightFriends:['Challenger'],previous:['Previous / Next'],next:[],hidden:[],exclusions:[]};
 const host=Object.assign(new M.AuthoringHost(),{settings,unloading:false,managedMetadataWrites:new Map(),
  app:{vault:{getFileByPath:path=>files.get(path)??null},fileManager:{processFrontMatter:async(file,mutate)=>{calls.push('native:'+file.path);await before?.(file);if(fail===file)throw Error('Native write failed');const next=structuredClone(metadata.get(file));mutate(next);metadata.set(file,next)}}},
  translator:key=>key,configuredDisplayNameField:()=>null,pruneManagedMetadataWrites(){},referenceForPage:page=>'[['+page.file.path+']]',
  allOntologyFields:()=>[...M.ontologyConfiguration(settings).roles.keys()],
  valueContainsTarget:(value,_file,page)=>Array.isArray(value)&&value.includes('[['+page.file.path+']]'),
  removeTargetFromValue:(value,_file,page)=>Array.isArray(value)?value.filter(item=>item!=='[['+page.file.path+']]'):value,
  mutateRelationshipMetadata:async(file,_fields,mutate,_target,current)=>{calls.push('observed:'+file.path);await before?.(file);if(current?.()===false)throw Error('Retired write');if(fail===file)throw Error('Native write failed');const next=structuredClone(metadata.get(file));mutate(next);metadata.set(file,next)},
  prepareRelationshipMutation:async()=>[origin,target],publishSavedRelationship:async()=>{calls.push('publish');if(publicationFailure)throw new M.SavedRelationshipPendingError('publication pending')},
  fileCreationAutomation:{wait:async file=>{calls.push('template:'+file.path)}},
  index:{withForegroundPriority:async run=>run(),isSemanticWriteReady:()=>true,gateNeighbourPaths:()=>new Set(),isConnected:()=>false,insertCreatedFile:()=>target,get:path=>path===target.path?target:origin,
   relationshipStorageCandidates:()=>[origin.path,target.path],refreshVisibleHostMetadataPreviews:path=>calls.push('preview:'+path)},
 });
 return{host,a,b,origin,target,files,metadata,calls,set fail(value){fail=value},set before(value){before=value},set publicationFailure(value){publicationFailure=value}};
}

for(const storeOnTarget of [false,true])test(`actual create writer preserves ${storeOnTarget?'target':'origin'} ownership and reciprocal field direction`,async()=>{
 const f=authoringFixture();const result=await f.host.createRelationToPage(f.origin,'parent',f.target,'Parent',undefined,true,storeOnTarget);
 assert.equal(result.state,'saved-published');assert.deepEqual(f.metadata.get(f.a),{Keep:'A',Parent:['[[B.md]]']});assert.deepEqual(f.metadata.get(f.b),{Keep:'B',Child:['[[A.md]]']});
 assert.deepEqual(f.calls,storeOnTarget?['observed:B.md','observed:A.md','publish']:['observed:A.md','observed:B.md','publish']);
});

test('actual add-ontology writer follows the selected physical owner and preserves existing fields',async()=>{
 const f=authoringFixture();f.metadata.get(f.a).Other=['[[B.md]]'];f.metadata.get(f.b).Child=['[[Kept.md]]'];
 await f.host.addOntologyToConnection(f.origin,f.target,'parent','Parent',f.target.path);
 assert.deepEqual(f.calls,['observed:B.md','observed:A.md','publish']);
 assert.deepEqual(f.metadata.get(f.a),{Keep:'A',Other:['[[B.md]]'],Parent:['[[B.md]]']});assert.deepEqual(f.metadata.get(f.b).Child,['[[Kept.md]]','[[A.md]]']);
});

test('actual existing-note partial retry does not revisit the successful forward declaration',async()=>{
 const f=authoringFixture();f.fail=f.b;let failure;
 await assert.rejects(f.host.createRelationToPage(f.origin,'parent',f.target,'Parent'),error=>{failure=error;return error instanceof M.ReciprocalRelationshipWriteError});
 assert.deepEqual(f.metadata.get(f.a).Parent,['[[B.md]]']);f.metadata.get(f.a).Keep='Concurrent edit';f.fail=null;await failure.receipt.retry();
 assert.deepEqual(f.calls,['observed:A.md','observed:B.md','observed:B.md','publish']);assert.equal(f.metadata.get(f.a).Keep,'Concurrent edit');
});

test('actual pair-publication retry never repeats either successful file write',async()=>{
 const f=authoringFixture();f.publicationFailure=true;let failure;
 await assert.rejects(f.host.addOntologyToConnection(f.origin,f.target,'parent','Parent'),error=>{failure=error;return error instanceof M.ReciprocalRelationshipWriteError});
 assert.deepEqual(failure.outcomes.map(value=>value.state),['saved','saved']);f.publicationFailure=false;await failure.receipt.retry();
 assert.deepEqual(f.calls,['observed:A.md','observed:B.md','publish','publish']);
});

test('new-file reciprocal writes wait for the exact template receipt and preserve template/concurrent values',async()=>{
 const f=authoringFixture();let release;const held=new Promise(resolve=>{release=resolve});
 f.host.fileCreationAutomation.wait=async file=>{assert.equal(file,f.b);f.calls.push('template:pending');await held;f.metadata.get(f.b).Template='Evaluated';f.calls.push('template:complete')};
 f.host.index.prepareRelationshipPair=()=>assert.fail('New-file reciprocal authoring must not await semantic indexing');
 const task=f.host.linkNewRelatedFile(f.origin,'parent',f.b,'Parent');await Promise.resolve();assert.deepEqual(f.calls,['template:pending']);
 release();assert.equal((await task).state,'saved-pending');assert.deepEqual(f.metadata.get(f.b),{Keep:'B',Template:'Evaluated',Child:['[[A.md]]']});
 assert.deepEqual(f.calls,['template:pending','template:complete','native:A.md','preview:A.md','native:B.md','preview:B.md']);
});

test('new-file inverse failure retains the created file and retries no creation or successful property write',async()=>{
 const f=authoringFixture();f.fail=f.b;let failure;
 await assert.rejects(f.host.linkNewRelatedFile(f.origin,'parent',f.b,'Parent'),error=>{failure=error;return error instanceof M.ReciprocalRelationshipWriteError});
 assert.equal(f.files.get('B.md'),f.b);assert.deepEqual(f.metadata.get(f.a).Parent,['[[B.md]]']);f.fail=null;await failure.receipt.retry();
 assert.deepEqual(f.calls,['template:B.md','native:A.md','preview:A.md','native:B.md','native:B.md','preview:B.md']);
});

test('actual queued native inverse refuses a changed pairing rather than using a fallback field',async()=>{
 const f=authoringFixture();f.before=async file=>{if(file===f.b)f.host.settings.hierarchy={...f.host.settings.hierarchy,parents:['Parent / Changed']}};
 await assert.rejects(f.host.createRelationToPage(f.origin,'parent',f.target,'Parent'),M.ReciprocalRelationshipWriteError);
 assert.deepEqual(f.metadata.get(f.a).Parent,['[[B.md]]']);assert.deepEqual(f.metadata.get(f.b),{Keep:'B'});
});

test('default-off authoring retains its single normal declaration',async()=>{
 const f=authoringFixture();f.host.settings.alsoWriteInverseOntology=false;
 await f.host.createRelationToPage(f.origin,'parent',f.target,'Parent');
 assert.deepEqual(f.calls,['observed:A.md','publish']);assert.deepEqual(f.metadata.get(f.b),{Keep:'B'});
});

for(const invalid of ['unpaired','missing-markdown'])test(`actual ${invalid} reciprocal request fails before either document is edited`,async()=>{
 const f=authoringFixture();if(invalid==='unpaired')f.host.settings.hierarchy={...f.host.settings.hierarchy,parents:['Parent']};else f.target.file=null;
 await assert.rejects(f.host.createRelationToPage(f.origin,'parent',f.target,'Parent'),new RegExp(invalid==='unpaired'?'reciprocal.requiresInverse':'reciprocal.requiresMarkdown'));
 assert.deepEqual(f.calls,[]);assert.deepEqual(f.metadata.get(f.a),{Keep:'A'});assert.deepEqual(f.metadata.get(f.b),{Keep:'B'});
});

for(const mutation of ['pair','preference'])test(`existing-note ${mutation} changes during pair preparation require fresh approval`,async()=>{
 const f=authoringFixture();f.host.prepareRelationshipMutation=async()=>{if(mutation==='pair')f.host.settings.hierarchy={...f.host.settings.hierarchy,parents:['Parent / Different']};else f.host.settings.alsoWriteInverseOntology=false;return[f.origin,f.target]};
 await assert.rejects(f.host.createRelationToPage(f.origin,'parent',f.target,'Parent'),/endpointChanged/);
 assert.deepEqual(f.calls,[]);assert.deepEqual(f.metadata.get(f.a),{Keep:'A'});assert.deepEqual(f.metadata.get(f.b),{Keep:'B'});
});

test('new-file pairing changes during its template receipt cannot silently select a different inverse',async()=>{
 const f=authoringFixture();f.host.fileCreationAutomation.wait=async()=>{f.host.settings.hierarchy={...f.host.settings.hierarchy,parents:['Parent / Different']}};
 await assert.rejects(f.host.linkNewRelatedFile(f.origin,'parent',f.b,'Parent'),/endpointChanged/);
 assert.deepEqual(f.calls,[]);assert.equal(f.files.get(f.b.path),f.b);assert.deepEqual(f.metadata.get(f.a),{Keep:'A'});
});

for(const enabled of [false,true])test(`relink keeps an independent reverse declaration with reciprocal option ${enabled?'on':'off'}`,async()=>{
 const f=authoringFixture();f.host.settings.alsoWriteInverseOntology=enabled;
 f.metadata.get(f.a).Parent=['[[B.md]]'];f.metadata.get(f.b).Child=['[[A.md]]','[[Other.md]]'];
 f.host.inverseOntologyField=()=> 'Parent';
 f.host.index.evidenceBetween=()=>[{sourceKind:'frontmatter-ontology',declaredByPath:f.a.path},{sourceKind:'frontmatter-ontology',declaredByPath:f.b.path}];
 f.host.clearFrontmatterRelationship=async(file,other)=>{f.calls.push('clear:'+file.path);f.metadata.get(file).Child=f.metadata.get(file).Child.filter(value=>value!=='[['+other.path+']]')};
 await f.host.relinkCentralNeighbour(f.origin,f.target,'child','Child',null,f.a.path);
 assert.deepEqual(f.metadata.get(f.b),{Keep:'B',Child:['[[A.md]]','[[Other.md]]']},'A source-specific edit cannot silently erase the other note\'s declaration');
 assert.equal(f.calls.some(value=>value.startsWith('clear:')),false);
});

test('a deliberate single-owner storage move retains legacy cleanup',async()=>{
 const f=authoringFixture();f.host.inverseOntologyField=()=> 'Parent';f.metadata.get(f.b).Child=['[[A.md]]','[[Other.md]]'];
 f.host.index.evidenceBetween=()=>[{sourceKind:'frontmatter-ontology',declaredByPath:f.b.path}];
 f.host.clearFrontmatterRelationship=async(file,other)=>{f.calls.push('clear:'+file.path);f.metadata.get(file).Child=f.metadata.get(file).Child.filter(value=>value!=='[['+other.path+']]')};
 await f.host.relinkCentralNeighbour(f.origin,f.target,'child','Child',null,f.a.path);
 assert.deepEqual(f.metadata.get(f.b).Child,['[[Other.md]]']);assert.equal(f.calls[0],'clear:B.md');
});

/** Native DOM rendering is covered separately; this fixture observes actual shell policy and lifetime. */
function modalFixture(){
 const f=authoringFixture(),commits=[],ends=[],renders=[];
 f.host.ontologyRoleForField=field=>M.ontologyConfiguration(f.host.settings).roles.get(field.toLowerCase());
 const modal=Object.assign(new M.RelationShell(),{plugin:f.host,options:{mode:'relink',purpose:'ontology-add',origin:f.origin,fixedTarget:f.target,onCommitted:result=>commits.push(result),onCommitEnd:success=>ends.push(success)},
  semanticRole:'parent',selectedField:'Parent',opened:true,busy:false,pending:false,selectedStoragePath:f.a.path,storageIdentity:f.a,
  selectedOntologyEditor:{active:false,close(){}},ontologyDialog:null,ontologyRoot:null,releaseRename:null,reciprocalReceipt:null,reciprocalTarget:null,
  contentEl:{empty(){}},renderOntologySelection(){},
  updateSaveButton(){this.saveDisabled=this.busy||!this.canSave()},
  renderReciprocalFailure(){renders.push({busy:this.busy,outcomes:this.reciprocalReceipt.outcomes})},
  close(){this.onClose()},
 });
 return Object.assign(f,{modal,commits,ends,renders});
}

for(const invalid of ['unpaired','attachment'])test(`connection form explains ${invalid} reciprocal authoring before Save`,()=>{
 const f=modalFixture();if(invalid==='unpaired')f.host.settings.hierarchy={...f.host.settings.hierarchy,parents:['Parent']};else f.b.extension='png';
 assert.equal(f.modal.canSave(),false);assert.equal(f.modal.reciprocalValidation().reasonKey,invalid==='unpaired'?'reciprocal.requiresInverse':'reciprocal.requiresMarkdown');
 assert.deepEqual(f.calls,[]);
});

test('connection partial status retains the original receipt and directly retries only the missing inverse',async()=>{
 const f=modalFixture();f.fail=f.b;await f.modal.confirm();
 assert.equal(f.modal.opened,true);assert.equal(f.modal.pending,true);assert.equal(f.modal.saveDisabled,true);
 assert.deepEqual(f.commits.map(value=>value.state),['saved-pending']);assert.deepEqual(f.modal.reciprocalReceipt.outcomes.map(value=>value.state),['saved','pending']);
 assert.equal(f.renders.at(-1).busy,false,'Retry control is enabled after confirm releases its busy guard');
 f.fail=null;await f.modal.retryReciprocal();
 assert.deepEqual(f.calls,['observed:A.md','observed:B.md','observed:B.md','publish']);assert.deepEqual(f.commits.map(value=>value.state),['saved-pending','saved-published']);
 assert.equal(f.modal.opened,false);assert.equal(f.modal.reciprocalReceipt,null,'Closing the native shell releases its operation receipt');
});

test('a failed first connection write remains explicitly unsaved and can retry without a second create/add call',async()=>{
 const f=modalFixture();f.fail=f.a;await f.modal.confirm();assert.deepEqual(f.commits,[]);assert.deepEqual(f.ends,[false]);
 assert.deepEqual(f.modal.reciprocalReceipt.outcomes.map(value=>value.state),['pending','pending']);
 f.fail=null;await f.modal.retryReciprocal();assert.deepEqual(f.calls,['observed:A.md','observed:A.md','observed:B.md','publish']);assert.equal(f.commits.length,1);
});

test('closing the connection form during receipt retry cannot publish into its retired UI',async()=>{
 const f=modalFixture();f.fail=f.b;await f.modal.confirm();f.fail=null;
 let release;const held=new Promise(resolve=>{release=resolve});f.before=async file=>{if(file===f.b)await held};
 const retry=f.modal.retryReciprocal();await Promise.resolve();f.modal.close();release();await retry;
 assert.deepEqual(f.commits.map(value=>value.state),['saved-pending']);assert.equal(f.modal.reciprocalReceipt,null);assert.equal(f.modal.opened,false);
});
