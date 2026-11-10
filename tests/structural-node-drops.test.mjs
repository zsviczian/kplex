/** Exercise real structural-drop owners with finite native effects; native lanes verify host grammar/gestures.
 * Canonical temporary paths keep the exported host stub identical to its Obsidian import on macOS. */
import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {build} from 'esbuild';
import {mkdtempSync,realpathSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import ts from 'typescript';
const root=fileURLToPath(new URL('..',import.meta.url)),temp=realpathSync(mkdtempSync(join(tmpdir(),'kplex-structural-drops-')));
after(()=>rmSync(temp,{recursive:true,force:true}));
const stub=`export class TFolder {};
export const Platform={isMobile:false,isWin:true};
export const notices=[]; export class Notice {constructor(message){notices.push(message)}};
export class Modal {constructor(app){this.app=app;this.modalEl={addClass(){},isConnected:false};this.contentEl={empty(){},addClass(){}}}close(){this.onClose?.()}open(){this.didOpen=true}}
export class Setting{};
export function getIcon(){return null};
export function normalizePath(value){return value.replace(/\\\\/g,'/').replace(/\\/+/g,'/').replace(/^\\/|\\/$/g,'')||'/'}
export function parseFrontMatterTags(fm){return (Array.isArray(fm.tags)?fm.tags:typeof fm.tags==='string'?fm.tags.split(/[ ,]+/):[]).filter(Boolean).map(t=>t.startsWith('#')?t:'#'+t)};
`;
writeFileSync(join(temp,'host.mjs'),stub);
await build({stdin:{contents:`export * from './src/adapters/obsidian/physicalNodeMove';export * from './src/adapters/obsidian/tagMembership';export * from './src/adapters/obsidian/tagNoteType';export * from './src/adapters/obsidian/noteTypeProperties';export * from './src/adapters/obsidian/noteTypeReview';export * from './src/adapters/obsidian/fileProperties';export * from './src/core/graph/presentation';export * from './src/index/style';export * from './src/ui/StructuralNodeDropActions';export * from './src/ui/structuralConnectionActions';export * from './src/ui/plexViews/scene';export * from './src/ui/MoveToFolderModal';export * from './src/ui/nodeListPresentation';export * from '${join(temp,'host.mjs').replaceAll('\\','/')}';`,resolveDir:root},outfile:join(temp,'test.mjs'),bundle:true,format:'esm',platform:'node',plugins:[{name:'finite-host',setup(b){b.onResolve({filter:/^obsidian$/},()=>({path:join(temp,'host.mjs')}))}}]});
const api=await import(pathToFileURL(join(temp,'test.mjs')));
/** Native incarnations and parent ownership are independent of the graph's facade identities. */
function fixture(){
 const nodes=new Map(),root=Object.assign(new api.TFolder(),{path:'/',name:'',parent:null});nodes.set('/',root);
 const folder=(path,parent=root)=>{const f=Object.assign(new api.TFolder(),{path,name:path.split('/').at(-1),parent});nodes.set(path,f);return f};
 const file=(path,parent=root)=>{const name=path.split('/').at(-1),f={path,name,basename:name.split('.')[0],extension:name.split('.').at(-1),parent};nodes.set(path,f);return f};
 const app={vault:{getRoot:()=>root,getFolderByPath:path=>nodes.get(path) instanceof api.TFolder?nodes.get(path):null,getFileByPath:path=>nodes.get(path) instanceof api.TFolder?null:nodes.get(path)??null,getAbstractFileByPath:path=>nodes.get(path)??null},fileManager:{},metadataCache:{getFileCache:()=>({frontmatter:{}})}};
 const a=folder('A'),b=folder('B'),source=file('A/Note.md',a),child=folder('A/Child',a);
 return {app,nodes,root,a,b,source,child,file,folder};
}
/** Minimal explicit facets never derive node types from opaque identities. */
function page(values={}){return {path:'opaque',isFolder:false,isTag:false,file:null,url:null,...values}}
const translate=(key,args={})=>key+JSON.stringify(args);
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('explicit note-type edits validate tag tokens and atomically preserve or remove only the exact old tag',()=>{
 for(const tag of ['person','#Person','person/friend','note-type','_kind','中文','🧠','👋🏽','topic/123','123/456','١٢٣','Ⅳ','a£b','a∑b'])assert(api.noteTypeAsTag(tag),tag);
 for(const tag of ['Big idea','a//b','/a','a/','##a','a#b','[[a]]','123','a.b','a+b','a^b','a$b','a:b','a\\b','👩‍🔬',''])assert.equal(api.noteTypeAsTag(tag),null,tag);
 const original={'NOTE TYPE':'#person',tags:['person','person/friend','work'],other:{keep:0}},opening=api.noteTypeSelection(original,'Note type');
 for(const remove of [false,true]){const fm=structuredClone(original);assert(api.setNoteType(fm,'Note type',opening,'#project',remove,'invalid'));assert.equal(fm['NOTE TYPE'],'project');assert.deepEqual(fm.tags,remove?['person/friend','work','project']:['person','person/friend','work','project']);assert.deepEqual(fm.other,original.other);}
 for(const remove of [false,true]){const fm=structuredClone(original);api.setNoteType(fm,'Note type',opening,null,remove,'invalid');assert(!('NOTE TYPE'in fm));assert.deepEqual(fm.tags,remove?['person/friend','work']:original.tags);}
 for(const change of [fm=>{fm['NOTE TYPE']='newer'},fm=>{fm.tags={unsupported:true}}]){const fm=structuredClone(original);change(fm);const before=structuredClone(fm);assert.throws(()=>api.setNoteType(fm,'Note type',opening,'project',false,'invalid'));assert.deepEqual(fm,before);}
 const invalid={'Note type':'Big idea',tags:['research']};api.setNoteType(invalid,'Note type',api.noteTypeSelection(invalid,'Note type'),'big-idea',false,'invalid');assert.deepEqual(invalid,{'Note type':'big-idea',tags:['research','big-idea']});
});

test('optional defaults add only absent normalized YAML keys including hidden fields, preserving empty/false/zero values',()=>{
 const fm={'Note type':'#person',tags:['person'],Title:null,active:false,score:0,body:'kept'},opening=api.noteTypeSelection(fm,'Note type');
 assert(api.initializeNoteProperties(fm,'Note type',opening,[{field:'title',visible:true},{field:'active',visible:true},{field:'score',visible:true},{field:'company',visible:false}],'invalid'));
 assert.deepEqual(fm,{ 'Note type':'#person',tags:['person'],Title:null,active:false,score:0,body:'kept',company:null});assert.equal(Object.keys(fm).at(-1),'company');
 assert.equal(api.initializeNoteProperties(fm,'Note type',opening,[{field:'company',visible:false}],'invalid'),false);
 const untagged={'Note type':'person',tags:['person/friend']};assert.throws(()=>api.initializeNoteProperties(untagged,'Note type',api.noteTypeSelection(untagged,'Note type'),[{field:'title',visible:true}],'invalid'));assert(!('title'in untagged));
});

test('review classifies invalid values, exact missing YAML tags, optional defaults and manual structures without body reads',async()=>{
 const f=fixture(),metadata=new Map(),files=[];const add=(name,fm)=>{const file=f.file(name);file.stat={mtime:1,size:30};files.push(file);metadata.set(file,{frontmatter:fm});return file};
 add('Invalid.md',{'Note type':'Big idea',tags:['research']});add('Tag.md',{'Note type':'person',tags:['person/friend']});add('Defaults.md',{'Note type':'PERSON',tags:['person'],title:null});add('Manual.md',{'Note type':['a','b']});add('Duplicate.md',{'Note type':'person','note-type':'project'});add('Inline.md',{});const gap=add('Gap.md',{});metadata.delete(gap);
 f.app.vault.getMarkdownFiles=()=>files;f.app.metadataCache.getFileCache=file=>metadata.get(file);f.app.vault.read=()=>{throw Error('Review read a body')};
 const report=await api.reviewNoteTypes(f.app,'Note type',{person:[{field:'title',visible:true},{field:'company',visible:false}]},()=>true,async()=>{},()=>{});
 assert.equal(report.scanned,7);assert.equal(report.unavailable,1);assert.equal(report.withoutYaml,1);assert.deepEqual(report.findings.map(row=>row.kind),['invalid','missing-tag','missing-properties','manual','manual']);assert.deepEqual(report.findings[2].missing,['company']);
});

test('review of 20,000 cached notes yields in bounded batches, never acquires sources, and retains truthful cancellation coverage',async()=>{
 const files=Array.from({length:20000},(_,i)=>({path:'Scale/'+i+'.md',stat:{mtime:1,size:100}})),byPath=new Map(files.map(file=>[file.path,file]));let reads=0,yields=0;
 const app={vault:{getMarkdownFiles:()=>files,getFileByPath:path=>byPath.get(path),read:()=>{throw Error('Body acquisition')}},metadataCache:{getFileCache:()=>{reads++;return{frontmatter:{'Note type':'person',tags:['person']}}}}};
 let previousReads=0,maximumSlice=0;const report=await api.reviewNoteTypes(app,'Note type',{person:[{field:'title',visible:true}]},()=>true,async()=>{maximumSlice=Math.max(maximumSlice,reads-previousReads);previousReads=reads;yields++},()=>{});assert.equal(reads,20000);assert(yields>=312);assert(maximumSlice<=64);assert.equal(report.findings.length,20000);assert.equal(report.cancelled,false);
 reads=0;yields=0;const partial=await api.reviewNoteTypes(app,'Note type',{},()=>yields<2,async()=>{yields++},()=>{});assert(reads>0&&reads<=128);assert.equal(partial.scanned,reads);assert.equal(partial.cancelled,true);
});

test('review repair keeps per-file atomicity, selected-file exclusions, stale skips and partial cancellation',async()=>{
 const f=fixture(),data=new Map(),files=[];for(const name of ['One','Excluded','Stale','Broken','Later']){const file=f.file(name+'.md');file.stat={mtime:1,size:30};files.push(file);data.set(file,{'Note type':'Big idea',tags:['research']});}
 f.app.vault.getMarkdownFiles=()=>files;f.app.metadataCache.getFileCache=file=>({frontmatter:data.get(file)});
 const report=await api.reviewNoteTypes(f.app,'Note type',{},()=>true,async()=>{},()=>{});files[2].stat.mtime++;data.get(files[3]).tags={unsupported:true};let writes=0,live=true;
 const ports={field:()=> 'Note type',properties:()=>({}),set:async(file,field,opening,value)=>{writes++;const next=structuredClone(data.get(file));api.setNoteType(next,field,opening,value,false,'invalid');data.set(file,next);return true},initialize:async()=>{throw Error('Unexpected initialization')}};
 const outcomes=await api.repairNoteTypes(f.app,report.findings.filter(row=>row.file!==files[1]),'big-idea',ports,()=>live,()=>{});
 assert.deepEqual(outcomes.map(row=>row.status),['changed','skipped','skipped','changed']);assert.equal(writes,2);assert.deepEqual(data.get(files[0]),{'Note type':'big-idea',tags:['research','big-idea']});assert.equal(data.get(files[1])['Note type'],'Big idea');assert.equal(data.get(files[3])['Note type'],'Big idea');
 for(const file of files){file.stat.mtime=1;data.set(file,{'Note type':'Big idea',tags:[]});}
 writes=0;const cancelled=await api.repairNoteTypes(f.app,report.findings,'big-idea',{...ports,set:async(...args)=>{const changed=await ports.set(...args);live=false;return changed}},()=>live,()=>{});assert.equal(writes,1);assert.deepEqual(cancelled.map(row=>row.status),['changed','pending','pending','pending','pending']);
});

test('context selector edits share the structural queue and revalidate identity/settings during the native mutation',async()=>{
 const f=fixture();f.source.stat={mtime:1,size:10};let fm={'Note type':'person',tags:['person']},writes=0,field='Note type',release;
 f.app.metadataCache.getFileCache=()=>({frontmatter:fm});const gate=new Promise(resolve=>release=resolve);
 const owner=new api.StructuralNodeDropActions(f.app,translate,async(file,fields,mutate)=>{writes++;await gate;const next=structuredClone(fm);mutate(next);fm=next;},()=>field);
 const opening=api.noteTypeSelection(fm,field),first=owner.editNoteType(f.source,field,opening,'project',false,()=>true),second=owner.editNoteType(f.source,field,opening,'book',false,()=>true);await tick();assert.equal(writes,1);release();await first;await assert.rejects(second,api.NoteTypeChangedError);assert.equal(fm['Note type'],'project');assert.deepEqual(fm.tags,['person','project']);
 const replaced=new api.StructuralNodeDropActions(f.app,translate,async(file,fields,mutate)=>{f.nodes.set(file.path,{...file});mutate(fm);},()=>field);await assert.rejects(replaced.editNoteType(f.source,field,api.noteTypeSelection(fm,field),'book',false,()=>true));assert.equal(fm['Note type'],'project');
});

test('native File properties uses the default core action with the clicked physical note and is absent when disabled',async()=>{
 const f=fixture(),calls=[];f.app.internalPlugins={plugins:{properties:{enabled:true,instance:{ensurePropertiesView:async file=>calls.push(file)}}}};
 assert(api.canShowFileProperties(f.app));assert(await api.showFileProperties(f.app,f.source));assert.deepEqual(calls,[f.source]);
 f.app.internalPlugins.plugins.properties.enabled=false;assert.equal(api.canShowFileProperties(f.app),false);assert.equal(await api.showFileProperties(f.app,f.source),false);
 f.app.internalPlugins.plugins.properties.enabled=true;f.nodes.set(f.source.path,{...f.source});assert.equal(await api.showFileProperties(f.app,f.source),false);assert.equal(calls.length,1);
});

test('missing-tag and missing-default repairs preserve selector spelling and report native storage failures individually',async()=>{
 const f=fixture(),files=['Tag','Defaults','Failure'].map(name=>{const file=f.file(name+'.md');file.stat={mtime:1,size:10};return file}),data=new Map([[files[0],{'NOTE TYPE':'#Person',tags:['person/friend'],keep:0}],[files[1],{'Note type':'person',tags:['person'],title:null}],[files[2],{'Note type':'Big idea',tags:[]}]]);
 f.app.vault.getMarkdownFiles=()=>files;f.app.metadataCache.getFileCache=file=>({frontmatter:data.get(file)});const properties={person:[{field:'title',visible:true},{field:'company',visible:false}]};
 const report=await api.reviewNoteTypes(f.app,'Note type',properties,()=>true,async()=>{},()=>{}),writes=[];
 const outcomes=await api.repairNoteTypes(f.app,report.findings,'big-idea',{field:()=> 'Note type',properties:()=>properties,
  ensureMembership:async(file,field,opening)=>{writes.push(file.path);return api.ensureNoteTypeMembership(data.get(file),field,opening,'invalid')},
  initialize:async(file,field,opening,rows)=>{writes.push(file.path);return api.initializeNoteProperties(data.get(file),field,opening,rows,'invalid')},
  set:async()=>{throw Error('Controlled native write failure')},
 },()=>true,()=>{});
 assert.deepEqual(outcomes.map(row=>row.status),['changed','changed','failed']);assert.equal(data.get(files[0])['NOTE TYPE'],'#Person');assert.deepEqual(data.get(files[0]).tags,['person/friend','Person']);assert.equal(data.get(files[0]).keep,0);assert.deepEqual(data.get(files[1]),{'Note type':'person',tags:['person'],title:null,company:null});assert.equal(writes.length,2);assert.equal(data.get(files[2])['Note type'],'Big idea');
});
/** Submit the native dialog's explicit data capability; rendering/gestures remain covered natively. */
const acceptTag=owner=>[...owner.dialogs].at(-1).options.save('tag',api.noteTypeSelection({},'Note type'),undefined,()=>true);

/** Execute the actual JSX composition callback with finite native ports, preserving async behavior. */
function graphCallback(name,dependencies,filename='src/ui/PlexGraph.tsx'){
 dependencies={viewDefinition:{hierarchy:undefined},...dependencies};
 const source=ts.createSourceFile(filename,readFileSync(new URL('../'+filename,import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let body;
 const visit=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(source)===name)body=node.initializer.getText(source);if(ts.isMethodDeclaration(node)&&node.name.getText(source)===name)body=(node.modifiers?.some(m=>m.kind===ts.SyntaxKind.AsyncKeyword)?'async ':'')+'function '+name+node.getText(source).slice(node.getText(source).indexOf('('));ts.forEachChild(node,visit)};visit(source);assert(body,name);
 const compiled=ts.transpileModule('const selected = '+body+';',{compilerOptions:{target:ts.ScriptTarget.ES2021}}).outputText;
 dependencies={semanticSceneEdge:api.semanticSceneEdge,viewSession:undefined,viewLifetime:0,...dependencies};
 return Function(...Object.keys(dependencies),compiled+';return selected')(...Object.values(dependencies));
}

test('saved lists retain full tag paths and reuse every Find icon without index work',()=>{
 for(const [input,icon] of [[{isTag:true,path:'tag:Parent/Child'},'tags'],[{isFolder:true},'folder'],[{url:'https://example.com'},'globe'],[{},'file-question'],...[['md','file-text'],['png','image'],['mp4','video'],['mp3','audio-lines'],['pdf','file-text'],['zip','paperclip']].map(([extension,icon])=>[{file:{extension}},icon])]){
  const result=api.nodeListPresentation(page(input),'alias');assert.equal(result.icon,icon);assert.equal(result.label,input.isTag?'#Parent/Child':'alias');
 }
});
test('tag assignment preserves exact child membership, scalar/list data and unrelated properties',()=>{
 for(const tags of [undefined,null,[],['other'],'other, #second']){
  const fm={other:{a:1},...(tags===undefined?{}:{tags})};assert.equal(api.appendTagMembership(fm,'Parent/Child','invalid'),true);assert(Array.isArray(fm.tags));assert(fm.tags.includes('Parent/Child'));assert.deepEqual(fm.other,{a:1});
  const saved=structuredClone(fm);assert.equal(api.appendTagMembership(fm,'parent/child','invalid'),false);assert.deepEqual(fm,saved);
 }
 const fm={tags:['Parent']};api.appendTagMembership(fm,'Parent/Child','invalid');assert.deepEqual(fm.tags,['Parent','Parent/Child']);
 for(const tags of [42,{custom:'preserve'},['ok',42]]){const fm={tags},saved=structuredClone(fm);assert.throws(()=>api.appendTagMembership(fm,'new','invalid'),/invalid/);assert.deepEqual(fm,saved)}
});
test('tag unlink removes only exact YAML entries and preserves malformed data and neighboring tags',()=>{
 for(const tags of [['Parent','parent/child','#PARENT/CHILD','Parent/Child/Grandchild','other'],'#Parent/Child, other']){
  const fm={tags,custom:{keep:true}};assert.equal(api.removeTagMembership(fm,'Parent/Child','invalid'),true);assert(Array.isArray(fm.tags));assert(!api.hasYamlTagMembership(fm,'Parent/Child'));assert(api.hasYamlTagMembership(fm,'other'));assert.deepEqual(fm.custom,{keep:true});
  if(Array.isArray(tags))assert.deepEqual(fm.tags,['Parent','Parent/Child/Grandchild','other']);
 }
 for(const tags of [undefined,null,[],['unrelated'],{preserve:true},['ok',42]]){
  const fm={tags},saved=structuredClone(fm);assert.equal(api.hasYamlTagMembership(fm,'wanted'),false);
  if(tags&&(!Array.isArray(tags)||tags.some(t=>typeof t!=='string')))assert.throws(()=>api.removeTagMembership(fm,'wanted','invalid'));else assert.equal(api.removeTagMembership(fm,'wanted','invalid'),false);
  assert.deepEqual(fm,saved);
 }
});
test('tag assignment and unlink share one queue, while inline-only and retired actions never write YAML',async()=>{
 const f=fixture(),fm={tags:['keep']};let writes=0;f.app.metadataCache={getFileCache:()=>({frontmatter:fm,tags:[{tag:'#body'}]})};
 const owner=new api.StructuralNodeDropActions(f.app,translate,async(file,fields,mutate)=>{writes++;mutate(fm)},()=> 'Note type'),note=page({file:f.source}),tag=page({path:'tag:Parent/Child',isTag:true});
 owner.open(note,tag);assert.equal(writes,0);await acceptTag(owner);assert.equal(await owner.unlink(note,tag,()=>true),true);assert.deepEqual(fm.tags,['keep']);assert.equal(writes,2);
 assert.equal(await owner.unlink(note,page({path:'tag:body',isTag:true}),()=>true),false);assert.equal(writes,2);
 fm.tags.push('Parent/Child');assert.equal(await owner.unlink(note,tag,()=>false),false);assert.equal(writes,2);assert(fm.tags.includes('Parent/Child'));owner.dispose();
});
test('structural connection capability omits impossible mutations in both view orientations',()=>{
 const note=page({file:{extension:'md'}}),folder=page({isFolder:true}),tag=page({isTag:true});
 for(const [a,b]of [[note,folder],[folder,note],[folder,folder],[tag,tag]]){
  assert(api.connectionActionAllowed('relationship.details',a,b));for(const id of ['relationship.unlink','relationship.hide','relationship.relink'])assert.equal(api.connectionActionAllowed(id,a,b),false);
 }
 for(const [a,b]of [[note,tag],[tag,note]]){assert(api.connectionActionAllowed('relationship.unlink',a,b));assert.equal(api.connectionActionAllowed('relationship.hide',a,b),false);assert.equal(api.connectionActionAllowed('relationship.relink',a,b),false)}
 assert(api.connectionActionAllowed('relationship.hide',note,note));
});
test('actual edge menu hides tag Hidden and every folder mutation while preserving note actions',()=>{
 for(const [kind,expected]of [['tag',['tagAssignment.toNoteType','graph.connectionDetails','graph.unlinkConnection']],['folder',['graph.connectionDetails']],['note',['graph.connectionDetails','graph.unlinkConnection','hide.title']]]){
  const note=page({path:'N.md',file:{extension:'md'}}),other=page({path:'other',isTag:kind==='tag',isFolder:kind==='folder',file:kind==='note'?{extension:'md'}:null}),items=[];
  class Menu{addItem(configure){const item={setTitle(title){items.push(title);return this},setIcon(){return this},onClick(){return this}};configure(item)}}
  const callback=graphCallback('showEdgeContextMenuAt',{tagMembershipPair:api.tagMembershipPair,isNoteTypeTagConnection:api.isNoteTypeTagConnection,captureSurfaceContinuation:()=>()=>true,actionSurfaceId:'surface',connectionActionAllowed:api.connectionActionAllowed,Menu,scene:{nodes:[{page:note},{page:other}]},index:{get:()=>null},touchDoubleTap:{current:{reset(){}}},translate:key=>key,viewport:{current:{ownerDocument:{}}},plugin:{showKplexMenuAtPosition(){}},hostLeaf:{}});
  callback({sourcePath:note.path,targetPath:other.path},10,20);assert.deepEqual(items,expected);
 }
});
test('actual tag Unlink removes YAML and opens existing details for retained body evidence',async()=>{
 for(const body of [false,true]){
  const note=page({path:'N.md',file:{path:'N.md',extension:'md'}}),tag=page({path:'tag:Parent/Child',isTag:true}),nodes=[{page:note},{page:tag}],dialogs=[];let writes=0;
  class Details{constructor(...args){dialogs.push(args)}open(){}}
  const callback=graphCallback('performEdgeAction',{connectionActionAllowed:api.connectionActionAllowed,tagMembershipPair:api.tagMembershipPair,graphTagValue:api.graphTagValue,index:{get:path=>nodes.find(n=>n.page.path===path)?.page,explainRelationship:()=>({decisions:[]})},scene:{nodes},sectionExpansion:null,actionSurfaceId:'surface',graphDialogSerial:{current:0},graphDialogs:{current:new Set()},RelationshipExplanationModal:Details,neighborhood:{center:note},hostLeaf:{},actionNodeRef:page=>page.path,clearHoverIntent(){},SavedRelationshipPendingError:class extends Error{},plugin:{isActionSurfaceCurrent:()=>true,unlinkTagMembership:async()=>{writes++;return true},app:{metadataCache:{getFileCache:()=>({tags:body?[{tag:'#Parent/Child'}]:[]})}},directFrontmatterUnlinkCandidate:()=>assert.fail('Tags never use ontology unlink'),actionManager:{closeSession(){}}}});
  const outcome=await callback({generation:1},{sourcePath:note.path,targetPath:tag.path},'relationship.unlink');assert.equal(writes,1);assert.equal(outcome.status,body?'opened':'committed');assert.equal(dialogs.length,body?1:0);
 }
});
test('actual tag evidence uses native body locations and one pair-scoped read of the note, never the tag identity as a file',async()=>{
 const f=fixture(),note=page({path:f.source.path,file:f.source}),tag=page({path:'tag:Parent/Child',isTag:true}),nodes=[note,tag];let reads=0;
 f.app.metadataCache={getFileCache:()=>({tags:[{tag:'#Parent',position:{start:{line:0}}},{tag:'#Parent/Child',position:{start:{line:1}}}]})};f.app.vault.cachedRead=async file=>{assert.equal(file,f.source);reads++;return '#Parent\nActual #Parent/Child evidence\n'};
 const owner={app:f.app,index:{get:path=>nodes.find(n=>n.path===path)},translator:translate};
 owner.relationshipEvidenceLocations=graphCallback('relationshipEvidenceLocations',{tagMembershipPair:api.tagMembershipPair,graphTagValue:api.graphTagValue},'src/main.ts');
 const sections=graphCallback('relationshipEvidenceSectionsBatch',{tagMembershipPair:api.tagMembershipPair},'src/main.ts'),evidence={id:'membership',sourceKind:'tag-tree',sourcePath:tag.path,targetPath:note.path,declaredByPath:tag.path};
 const result=await sections.call(owner,[evidence]);assert.equal(reads,1);assert.equal(result.get(evidence.id).length,1);assert.equal(result.get(evidence.id)[0].text,'Actual #Parent/Child evidence');assert.equal(result.get(evidence.id)[0].path,note.path);
});
test('move planning handles files, attachments and folders, root destinations and rejected ancestry/collisions',()=>{
 const f=fixture();assert.equal(api.prepareNativeMove(f.app,f.source,f.b).plan.destination,'B/Note.md');assert.equal(api.prepareNativeMove(f.app,f.child,f.b).plan.destination,'B/Child');assert.equal(api.prepareNativeMove(f.app,f.source,f.root).plan.destination,'Note.md');
 assert.equal(api.prepareNativeMove(f.app,f.root,f.b).reason,'root');assert.equal(api.prepareNativeMove(f.app,f.a,f.child).reason,'recursive');assert.equal(api.prepareNativeMove(f.app,f.a,f.a).reason,'recursive');assert.equal(api.prepareNativeMove(f.app,f.source,f.a).reason,'same');
 for(const collision of [()=>f.file('B/Note.md',f.b),()=>f.folder('B/Note.md',f.b)]){collision();assert.equal(api.prepareNativeMove(f.app,f.source,f.b).reason,'conflict');f.nodes.delete('B/Note.md')}
 const attachment=f.file('A/Picture.png',f.a);assert.equal(api.preparePhysicalMove(f.app,page({file:attachment}),page({path:'folder:B',isFolder:true})).ok,true);
});
test('confirmation rejects replaced/renamed source or destination and newly occupied names',()=>{
 for(const change of [f=>f.file(f.source.path,f.a),f=>{f.source.path='A/Renamed.md'},f=>f.folder('B'),f=>{f.b.path='C'},f=>f.file('B/Note.md',f.b)]){
  const f=fixture(),prepared=api.prepareNativeMove(f.app,f.source,f.b);change(f);assert.equal(api.revalidatePhysicalMove(f.app,prepared.plan).ok,false);
 }
});
test('native confirmation excludes double submits and does no move after Cancel',async()=>{
 const f=fixture(),plan=api.prepareNativeMove(f.app,f.source,f.b).plan;let calls=0,finish;
 f.app.fileManager.renameFile=()=>{calls++;return new Promise(resolve=>finish=resolve)};
 const modal=new api.MoveToFolderModal(f.app,plan,translate,()=>true,()=>{});modal.opened=true;
 const accepted=modal.submit();await modal.submit();assert.equal(calls,1);modal.close();finish();await accepted;assert.equal(calls,1);
 const cancelled=new api.MoveToFolderModal(f.app,plan,translate,()=>true,()=>{});cancelled.opened=true;cancelled.close();await cancelled.submit();assert.equal(calls,1);
});
test('move rejection remains retryable; a committed native move with link failure is never retried',async()=>{
 const f=fixture(),plan=api.prepareNativeMove(f.app,f.source,f.b).plan;let calls=0;
 f.app.fileManager.renameFile=async()=>{calls++;throw Error('disk')};
 const modal=new api.MoveToFolderModal(f.app,plan,translate,()=>true,()=>{});modal.opened=true;modal.feedback={};await modal.submit();assert.equal(modal.pending,false);assert.match(modal.feedback.textContent,/disk/);
 f.app.fileManager.renameFile=async()=>{calls++;f.nodes.delete(f.source.path);f.source.path=plan.destination;f.nodes.set(plan.destination,f.source);throw Error('link update')};
 await modal.submit();assert.equal(modal.opened,false);assert.match(api.notices.at(-1),/movedWarning/);await modal.submit();assert.equal(calls,2);
});
test('tag drops serialize native writes, merge fresh values, and reject stale queued incarnations',async()=>{
 const f=fixture(),fm={tags:['preserved']},writes=[];let release;
 const owner=new api.StructuralNodeDropActions(f.app,translate,async(file,fields,mutate)=>{writes.push(file.path);assert.deepEqual([...fields],['tags']);mutate(fm);if(writes.length===1)await new Promise(resolve=>release=resolve)},()=> 'Note type');
 const origin=page({file:f.source}),tag=value=>page({path:'tag:'+value,isTag:true});
 assert(owner.open(origin,tag('parent/one')));const first=acceptTag(owner);assert(owner.open(origin,tag('parent/two')));const second=acceptTag(owner);await tick();assert.equal(writes.length,1);release();await Promise.all([first,second]);assert.equal(writes.length,2);assert.deepEqual(fm.tags,['preserved','parent/one','parent/two']);
 let start;const held=new api.StructuralNodeDropActions(f.app,translate,async()=>new Promise(resolve=>start=resolve),()=> 'Note type');held.open(origin,tag('a'));const a=acceptTag(held);held.open(origin,tag('b'));const b=acceptTag(held);await tick();f.file(f.source.path,f.a);start();await Promise.all([a,b]);assert.equal(held.tagQueues.has(f.source),true);held.dispose();owner.dispose();
});
test('inactive/cancelled structural actions never start index work and unload retires pending dialogs',async()=>{
 const f=fixture();let writes=0;const owner=new api.StructuralNodeDropActions(f.app,translate,async()=>{writes++},()=> 'Note type');
 assert.equal(api.structuralDropKind(page({file:{extension:'png'}}),page({isTag:true})),null);assert.equal(api.structuralDropKind(page({url:'url'}),page({isFolder:true})),null);
 owner.open(page({file:f.source}),page({isFolder:true,path:'folder:B'}));assert.equal(owner.dialogs.size,1);owner.dispose();assert.equal(owner.dialogs.size,0);
 assert.equal(owner.open(page({file:f.source}),page({isTag:true,path:'tag:a'})),false);await tick();assert.equal(writes,0);
});
test('production drop routing preserves explicit structural targets and empty folder-child creation',()=>{
 const graph=readFileSync(new URL('../src/ui/PlexGraph.tsx',import.meta.url),'utf8');
 assert.match(graph,/if \(structuralDropKind\(origin, target\)\) return \{ button, target \}/);
 assert.match(graph,/if \(plugin\.openStructuralNodeDrop\(origin, target, \{immediateMove\}\)\) return true/);
 assert.match(graph,/if \(origin\?\.isFolder\) \{\s*if \(drag\.moved && !target\) plugin\.openCreateInFolderModal/);
 assert.match(graph,/openHistoryRelationshipMenu[\s\S]*\|\| relationshipChip/);
});

test('tag and Note Type assignment preserve independent tags, one selector and exact unrelated data',()=>{
 const fm={tags:['kept'],'Note type':'#Old',other:{preserve:true}},opening=api.noteTypeSelection(fm,'Note type');
 const keep=structuredClone(fm);assert(api.assignTag(keep,'New','Note type','note-type',opening,'keep','invalid'));
 assert.equal(keep['Note type'],'#Old');assert.deepEqual(keep.tags,['kept','New']);assert.deepEqual(keep.other,fm.other);
 const replace=structuredClone(fm);assert(api.assignTag(replace,'New','Note type','note-type',opening,'replace','invalid'));
 assert.equal(replace['Note type'],'#New');assert.deepEqual(replace.tags,['kept','New','Old']);
 assert(api.demoteNoteType(replace,'New','Note type',api.noteTypeSelection(replace,'Note type'),'invalid'));
 assert.equal(replace['Note type'],undefined);assert.deepEqual(replace.tags,['kept','New','Old']);
 assert(api.unlinkTagAssignment(keep,'Old','Note type','invalid'));assert.equal(keep['Note type'],undefined);assert(keep.tags.includes('New'));
});

test('fresh conflict decisions, normalized field spellings and unsupported values cannot overwrite data',()=>{
 for(const mode of ['no-choice','concurrent']){
  const fm={tags:['keep'],'NOTE TYPE':'#Old'},opening=api.noteTypeSelection(fm,'Note type');
  if(mode==='concurrent')fm['NOTE TYPE']='#Other';const saved=structuredClone(fm);
  assert.throws(()=>api.assignTag(fm,'New','Note type','note-type',opening,mode==='concurrent'?'replace':undefined,'invalid'),api.NoteTypeChangedError);assert.deepEqual(fm,saved);
 }
 const fresh={tags:[],'NOTE TYPE':'#Old'};api.assignTag(fresh,'New','Note type','note-type',api.noteTypeSelection(fresh,'Note type'),'replace','invalid');
 assert.equal(fresh['NOTE TYPE'],'#New');assert.equal(fresh['Note type'],undefined);
 for(const value of [42,{keep:'future'},['a','b']]){
  const fm={tags:['keep'],'Note type':value},saved=structuredClone(fm);assert.throws(()=>api.assignTag(fm,'New','Note type','note-type',api.noteTypeSelection(fm,'Note type'),'replace','invalid'));assert.deepEqual(fm,saved);
  assert(api.assignTag(fm,'New','Note type','tag',api.noteTypeSelection(fm,'Note type'),undefined,'invalid'));assert.deepEqual(fm['Note type'],value);
 }
 const duplicate={'Note type':'#A','note-type':'#B',tags:[]};assert.equal(api.noteTypeSelection(duplicate,'Note type').supported,false);
 const malformed={tags:{keep:true},'Note type':'#Old'},saved=structuredClone(malformed);assert.throws(()=>api.assignTag(malformed,'New','Note type','note-type',api.noteTypeSelection(malformed,'Note type'),'replace','invalid'));assert.deepEqual(malformed,saved);
 assert.equal(api.noteTypeSelection({},'tags').supported,false);
});

test('two open Note Type drafts serialize and require a fresh decision after the first commit',async()=>{
 const f=fixture(),fm={tags:['keep']};let writes=0;
 f.app.metadataCache.getFileCache=()=>({frontmatter:fm});
 const owner=new api.StructuralNodeDropActions(f.app,translate,async(_file,fields,mutate)=>{writes++;assert.deepEqual([...fields],['tags','note-type']);mutate(fm)},()=> 'Note type');
 const note=page({file:f.source}),tag=value=>page({path:'tag:'+value,isTag:true});
 owner.open(note,tag('First'));owner.open(note,tag('Second'));const [a,b]=[...owner.dialogs].map(dialog=>dialog.options);
 const results=await Promise.allSettled([a.save('note-type',a.selection,undefined,()=>true),b.save('note-type',b.selection,undefined,()=>true)]);
 assert.equal(results[0].status,'fulfilled');assert.equal(results[1].status,'rejected');assert(results[1].reason instanceof api.NoteTypeChangedError);
 assert.equal(fm['Note type'],'#First');assert.deepEqual(fm.tags,['keep','First']);
 await b.save('note-type',results[1].reason.selection,'replace',()=>true);
 assert.equal(fm['Note type'],'#Second');assert.deepEqual(fm.tags,['keep','First','Second']);assert.equal(writes,3);owner.dispose();
});

test('failed storage, renamed draft targets and changed selector policy preserve saved metadata',async()=>{
 const f=fixture(),fm={tags:['keep']};let field='Note type',fail=true,writes=0;
 f.app.metadataCache.getFileCache=()=>({frontmatter:fm});
 const owner=new api.StructuralNodeDropActions(f.app,translate,async(_file,_fields,mutate)=>{writes++;const draft=structuredClone(fm);mutate(draft);if(fail)throw Error('disk');Object.assign(fm,draft)},()=>field);
 const note=page({file:f.source}),tag=page({isTag:true,path:'tag:New'});owner.open(note,tag);let options=[...owner.dialogs].at(-1).options;
 await assert.rejects(options.save('note-type',options.selection,undefined,()=>true),/disk/);assert.deepEqual(fm,{tags:['keep']});fail=false;
 await options.save('note-type',options.selection,undefined,()=>true);assert.equal(fm['Note type'],'#New');
 owner.open(note,page({isTag:true,path:'tag:Later'}));options=[...owner.dialogs].at(-1).options;field='Another field';const saved=structuredClone(fm);
 await assert.rejects(options.save('note-type',options.selection,'replace',()=>true),/changed/);assert.deepEqual(fm,saved);
 field='Note type';f.source.path='A/Renamed.md';const before=writes;
 await assert.rejects(options.save('tag',options.selection,undefined,()=>true),/endpointChanged/);assert.equal(writes,before);assert.deepEqual(fm,saved);owner.dispose();
});

test('Note Type tag styling is symmetric, doubles current tag width and stays in the existing theme override map',()=>{
 const note=page({noteType:'Topic',path:'N.md'}),tag=page({noteType:null,isTag:true,path:'tag:Topic'}),ordinary=page({noteType:null,isTag:true,path:'tag:Other'});
 const settings={baseLinkStyle:{strokeWidth:2,strokeStyle:'dashed'},tagLinkStyle:{strokeWidth:3},inferredLinkStyle:{},folderLinkStyle:{},hierarchyLinkStyles:{}};
 const relation=page=>({page,typeDefinition:'tag-tree',relationType:1});
 assert(api.isNoteTypeTagConnection(note,tag));assert(api.isNoteTypeTagConnection(tag,note));assert(!api.isNoteTypeTagConnection(note,ordinary));
 assert.equal(api.resolveLinkStyle(relation(tag),settings,note).strokeWidth,6);assert.equal(api.resolveLinkStyle(relation(note),settings,tag).strokeWidth,6);
 assert.equal(api.resolveLinkStyle(relation(ordinary),settings,note).strokeWidth,3);
 assert.equal(api.resolveLinkStyle(relation(tag),{...settings,baseLinkStyle:{},tagLinkStyle:{}},note).strokeWidth,2.4,'A missing width doubles the real renderer inheritance');
 settings.hierarchyLinkStyles[api.NOTE_TYPE_TAG_LINK_STYLE]={strokeWidth:4,strokeStyle:'dotted'};
 assert.equal(api.resolveLinkStyle(relation(tag),settings,note).strokeWidth,4);assert.equal(api.resolveLinkStyle(relation(tag),settings,note).strokeStyle,'dotted');assert.equal(api.noteTypeTagDefaultStyle(settings).strokeWidth,6);
});

test('central structural gates accept only valid physical members and area drops retain parent-child meaning',()=>{
 const note=page({path:'N',file:{extension:'md'}}),tag=page({path:'tag:T',isTag:true}),folder=page({path:'folder:F',isFolder:true}),attachment=page({path:'A',file:{extension:'png'}}),ghost=page({path:'G'});
 for(const [a,b]of [[tag,note],[note,tag]])assert.equal(api.structuralDropKind(a,b),'tag');
 assert.equal(api.structuralDropKind(folder,note),'move');assert.equal(api.structuralDropKind(folder,attachment),'move');
 for(const endpoint of [tag,ghost,page({path:'U',url:'https://example.com'}),page({path:'S',file:{extension:'md'},transient:{}})])assert.equal(api.structuralDropKind(folder,endpoint),null);
 assert(api.structuralAreaDrop(note,tag,'parent'));assert(!api.structuralAreaDrop(note,tag,'child'));assert(api.structuralAreaDrop(tag,note,'child'));assert(!api.structuralAreaDrop(tag,note,'left'));
});

test('modifier moves use the same native validation, reverse a central folder/file pair and exclude duplicate in-flight moves',async()=>{
 const f=fixture();let calls=0,finish;f.app.fileManager.renameFile=()=>{calls++;return new Promise(resolve=>finish=resolve)};
 const owner=new api.StructuralNodeDropActions(f.app,translate,async()=>{throw Error('No metadata write')},()=> 'Note type');
 const folder=page({path:'folder:B',isFolder:true}),source=page({path:f.source.path,file:f.source});
 assert(owner.open(folder,source,{immediateMove:true}));assert(owner.open(folder,source,{immediateMove:true}));assert.equal(calls,1);assert.equal(owner.dialogs.size,0);finish();await tick();owner.dispose();
 const changed=fixture();changed.file('B/Note.md',changed.b);let moved=0;changed.app.fileManager.renameFile=async()=>moved++;
 const plan={source:changed.source,sourcePath:changed.source.path,folder:changed.b,folderPath:changed.b.path,destination:'B/Note.md'};
 assert.deepEqual(await api.commitPhysicalMove(changed.app,plan),{ok:false,reason:'conflict'});assert.equal(moved,0);
});


test('retiring a view before a held tag write reports cancellation without a false commit or late details',async()=>{
 const note=page({path:'N.md',file:{path:'N.md',extension:'md'}}),tag=page({path:'tag:Parent/Child',isTag:true}),nodes=[{page:note},{page:tag}];
 let epoch=0,release,writes=0;const held=new Promise(resolve=>{release=resolve});
 const callback=graphCallback('performEdgeAction',{connectionActionAllowed:api.connectionActionAllowed,tagMembershipPair:api.tagMembershipPair,graphTagValue:api.graphTagValue,
  viewSession:{getLifetime:()=>epoch,capture(){const captured=epoch;return()=>epoch===captured}},
  index:{get:path=>nodes.find(n=>n.page.path===path)?.page,explainRelationship:()=>({decisions:[]})},scene:{nodes},sectionExpansion:null,actionSurfaceId:'surface',
  graphDialogSerial:{current:0},graphDialogs:{current:new Set()},RelationshipExplanationModal:class{constructor(){assert.fail('Retired view opened details')}},
  neighborhood:{center:note},hostLeaf:{},actionNodeRef:page=>page.path,clearHoverIntent(){assert.fail('Retired view changed hover')},SavedRelationshipPendingError:class extends Error{},
  plugin:{isActionSurfaceCurrent:()=>true,async unlinkTagMembership(_note,_tag,current){await held;if(!current())return false;writes++;return true}}});
 const task=callback({generation:1},{sourcePath:note.path,targetPath:tag.path},'relationship.unlink');epoch++;release();
 assert.equal((await task).status,'cancelled');assert.equal(writes,0);
});
