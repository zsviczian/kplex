/** Exercise real structural-drop owners with finite native effects; native lanes verify host grammar/gestures. */
import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {build} from 'esbuild';
import {mkdtempSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import ts from 'typescript';
const root=fileURLToPath(new URL('..',import.meta.url)),temp=mkdtempSync(join(tmpdir(),'kplex-structural-drops-'));
after(()=>rmSync(temp,{recursive:true,force:true}));
const stub=`export class TFolder {};
export const notices=[]; export class Notice {constructor(message){notices.push(message)}};
export class Modal {constructor(app){this.app=app;this.contentEl={empty(){}}}close(){this.onClose?.()}open(){this.didOpen=true}}
export class Setting{};
export function normalizePath(value){return value.replace(/\\\\/g,'/').replace(/\\/+/g,'/').replace(/^\\/|\\/$/g,'')||'/'}
export function parseFrontMatterTags(fm){return (Array.isArray(fm.tags)?fm.tags:typeof fm.tags==='string'?fm.tags.split(/[ ,]+/):[]).filter(Boolean).map(t=>t.startsWith('#')?t:'#'+t)};
`;
writeFileSync(join(temp,'host.mjs'),stub);
await build({stdin:{contents:`export * from './src/adapters/obsidian/physicalNodeMove';export * from './src/adapters/obsidian/tagMembership';export * from './src/ui/StructuralNodeDropActions';export * from './src/ui/structuralConnectionActions';export * from './src/ui/MoveToFolderModal';export * from './src/ui/nodeListPresentation';export * from '${join(temp,'host.mjs').replaceAll('\\','/')}';`,resolveDir:root},outfile:join(temp,'test.mjs'),bundle:true,format:'esm',platform:'node',plugins:[{name:'finite-host',setup(b){b.onResolve({filter:/^obsidian$/},()=>({path:join(temp,'host.mjs')}))}}]});
const api=await import(pathToFileURL(join(temp,'test.mjs')));
/** Native incarnations and parent ownership are independent of the graph's facade identities. */
function fixture(){
 const nodes=new Map(),root=Object.assign(new api.TFolder(),{path:'/',name:'',parent:null});nodes.set('/',root);
 const folder=(path,parent=root)=>{const f=Object.assign(new api.TFolder(),{path,name:path.split('/').at(-1),parent});nodes.set(path,f);return f};
 const file=(path,parent=root)=>{const name=path.split('/').at(-1),f={path,name,basename:name.split('.')[0],extension:name.split('.').at(-1),parent};nodes.set(path,f);return f};
 const app={vault:{getRoot:()=>root,getFolderByPath:path=>nodes.get(path) instanceof api.TFolder?nodes.get(path):null,getFileByPath:path=>nodes.get(path) instanceof api.TFolder?null:nodes.get(path)??null,getAbstractFileByPath:path=>nodes.get(path)??null},fileManager:{}};
 const a=folder('A'),b=folder('B'),source=file('A/Note.md',a),child=folder('A/Child',a);
 return {app,nodes,root,a,b,source,child,file,folder};
}
/** Minimal explicit facets never derive node types from opaque identities. */
function page(values={}){return {path:'opaque',isFolder:false,isTag:false,file:null,url:null,...values}}
const translate=(key,args={})=>key+JSON.stringify(args);
const tick=()=>new Promise(resolve=>setImmediate(resolve));

/** Execute the actual JSX composition callback with finite native ports, preserving async behavior. */
function graphCallback(name,dependencies,filename='src/ui/PlexGraph.tsx'){
 const source=ts.createSourceFile(filename,readFileSync(new URL('../'+filename,import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let body;
 const visit=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(source)===name)body=node.initializer.getText(source);if(ts.isMethodDeclaration(node)&&node.name.getText(source)===name)body=(node.modifiers?.some(m=>m.kind===ts.SyntaxKind.AsyncKeyword)?'async ':'')+'function '+name+node.getText(source).slice(node.getText(source).indexOf('('));ts.forEachChild(node,visit)};visit(source);assert(body,name);
 const compiled=ts.transpileModule('const selected = '+body+';',{compilerOptions:{target:ts.ScriptTarget.ES2021}}).outputText;
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
 const owner=new api.StructuralNodeDropActions(f.app,translate,async(file,fields,mutate)=>{writes++;mutate(fm)}),note=page({file:f.source}),tag=page({path:'tag:Parent/Child',isTag:true});
 owner.open(note,tag);assert.equal(await owner.unlink(note,tag,()=>true),true);assert.deepEqual(fm.tags,['keep']);assert.equal(writes,2);
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
 for(const [kind,expected]of [['tag',['graph.connectionDetails','graph.unlinkConnection']],['folder',['graph.connectionDetails']],['note',['graph.connectionDetails','graph.unlinkConnection','hide.title']]]){
  const note=page({path:'N.md',file:{extension:'md'}}),other=page({path:'other',isTag:kind==='tag',isFolder:kind==='folder',file:kind==='note'?{extension:'md'}:null}),items=[];
  class Menu{addItem(configure){const item={setTitle(title){items.push(title);return this},setIcon(){return this},onClick(){return this}};configure(item)}}
  const callback=graphCallback('showEdgeContextMenuAt',{connectionActionAllowed:api.connectionActionAllowed,Menu,scene:{nodes:[{page:note},{page:other}]},index:{get:()=>null},touchDoubleTap:{current:{reset(){}}},translate:key=>key,viewport:{current:{ownerDocument:{}}},plugin:{showKplexMenuAtPosition(){}},hostLeaf:{}});
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
 const owner=new api.StructuralNodeDropActions(f.app,translate,async(file,fields,mutate)=>{writes.push(file.path);assert.deepEqual([...fields],['tags']);mutate(fm);if(writes.length===1)await new Promise(resolve=>release=resolve)});
 const origin=page({file:f.source}),tag=value=>page({path:'tag:'+value,isTag:true});
 assert(owner.open(origin,tag('parent/one')));assert(owner.open(origin,tag('parent/two')));await tick();assert.equal(writes.length,1);release();await tick();await tick();assert.equal(writes.length,2);assert.deepEqual(fm.tags,['preserved','parent/one','parent/two']);
 let start;const held=new api.StructuralNodeDropActions(f.app,translate,async()=>new Promise(resolve=>start=resolve));held.open(origin,tag('a'));held.open(origin,tag('b'));await tick();f.file(f.source.path,f.a);start();await tick();await tick();assert.equal(held.tagQueues.has(f.source),true);held.dispose();owner.dispose();
});
test('inactive/cancelled structural actions never start index work and unload retires pending dialogs',async()=>{
 const f=fixture();let writes=0;const owner=new api.StructuralNodeDropActions(f.app,translate,async()=>{writes++});
 assert.equal(api.structuralDropKind(page({file:{extension:'png'}}),page({isTag:true})),null);assert.equal(api.structuralDropKind(page({url:'url'}),page({isFolder:true})),null);
 owner.open(page({file:f.source}),page({isFolder:true,path:'folder:B'}));assert.equal(owner.dialogs.size,1);owner.dispose();assert.equal(owner.dialogs.size,0);
 assert.equal(owner.open(page({file:f.source}),page({isTag:true,path:'tag:a'})),false);await tick();assert.equal(writes,0);
});
test('production drop routing preserves explicit structural targets and empty folder-child creation',()=>{
 const graph=readFileSync(new URL('../src/ui/PlexGraph.tsx',import.meta.url),'utf8');
 assert.match(graph,/if \(structuralDropKind\(origin, target\)\) return \{ button, target \}/);
 assert.match(graph,/if \(plugin\.openStructuralNodeDrop\(origin, target\)\) return true/);
 assert.match(graph,/drag\.moved && drag\.gate === "bottom" && !target/);
 assert.match(graph,/openHistoryRelationshipMenu[\s\S]*\|\| relationshipChip/);
});
