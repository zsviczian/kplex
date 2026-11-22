/** #318 command/navigation write-target checks run production callbacks with delayed local readiness.
 * The native Vault boundary stores exact serialized file contents; actual Obsidian command/paint
 * and Android acceptance are separate. KPLEX_SAFETY_BASELINE_REF selects committed baseline source.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import ts from 'typescript';
import {build} from 'esbuild';

const baseline=process.env.KPLEX_SAFETY_BASELINE_REF;
if(baseline&&!/^[a-f0-9]{7,40}$/.test(baseline))throw Error('Use an exact baseline commit');
/** Read committed runtime owners without checking out or mutating the shared implementation tree. */
function source(path){
 if(!baseline)return readFileSync(path,'utf8');
 const result=spawnSync('git',['show',baseline+':'+path],{encoding:'utf8',timeout:10000});
 assert.equal(result.status,0,result.stderr);return result.stdout;
}
const main=ts.createSourceFile('main.ts',source('src/main.ts'),ts.ScriptTarget.Latest,true);
const app=ts.createSourceFile('App.tsx',source('src/ui/App.tsx'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
/** Compile original function bodies, preserving all native identity, await and dispatch branches. */
function extracted(tree,predicate){let found;const visit=node=>{if(predicate(node))found=node;ts.forEachChild(node,visit);};visit(tree);assert(found,'Production owner exists');return found;}
const methods=['commandCentralPage','linkNewRelatedFile','appendRelationshipReference','finishNewRelatedNode'];
const methodBodies=methods.map(name=>extracted(main,node=>ts.isMethodDeclaration(node)&&node.name.getText(main)===name).getText(main));
const activateNode=extracted(app,node=>ts.isVariableDeclaration(node)&&node.name.getText(app)==='activate');
const activateSource=activateNode.initializer.arguments[0].getText(app);
const commandNode=extracted(main,node=>ts.isCallExpression(node)&&node.expression.getText(main)==='operation'
 &&node.arguments[1]?.getText(main).includes('const origin = pageFor(context)')
 &&node.arguments[1]?.getText(main).includes('NewRelatedNoteModal'));
const commandSource=commandNode.arguments[1].getText(main);
const output=await build({stdin:{resolveDir:process.cwd(),loader:'ts',contents:`
export {ActionManager} from './src/application/ActionManager';
export {actionNodeRef,resolveActionPage} from './src/adapters/obsidian/actionNode';
import {eligibleRelationshipOwner} from './src/adapters/obsidian/relationshipOwner';
import {normalizeFieldName} from './src/core/contracts/fieldName';
import {ontologyConfiguration} from './src/core/contracts/ontologyConfiguration';
import {reciprocalOntologyFields} from './src/adapters/obsidian/reciprocalRelationshipWrite';
import {SavedRelationshipPendingError} from './src/adapters/obsidian/relationshipMetadataWrite';
export class Host {${methodBodies.join('\n')}}
`},bundle:true,write:false,format:'cjs',platform:'node'});
const module={exports:{}};Function('module','exports',output.outputFiles[0].text)(module,module.exports);const M=module.exports;
/** Bind supplied native/UI capabilities around the unchanged callback expression. */
function callback(expression,dependencies){
 const js=ts.transpileModule('const selected = '+expression,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 return Function(...Object.keys(dependencies),js+';return selected;').call(dependencies.__owner,...Object.values(dependencies));
}

/** Deterministic readiness is independent of the exact physical file used by a native writer. */
function fixture(surface='sidepanel'){
 const files=new Map(),pages=new Map(),disk=new Map(),writes=[],dialogs=[],snapshots=[];
 for(const name of ['A','B','C']){const file={path:name+'.md',extension:'md'};files.set(file.path,file);pages.set(file.path,{path:file.path,name,file,url:null,isFolder:false,isTag:false,neighbours:new Map()});disk.set(file.path,JSON.stringify({Keep:name}));}
 const a=pages.get('A.md'),b=pages.get('B.md'),c=pages.get('C.md'),leaf={surface};let ready=false;
 const host=Object.assign(new M.Host(),{settings:{lastActivePath:a.path,navigationHistory:[a.path],alsoWriteInverseOntology:false},
  openKplexViews:1,actionInvocationSequence:0,actionDialogs:new Map(),managedMetadataWrites:new Map(),fileCreationAutomation:{wait:async()=>{}},
  translator:key=>key,pruneManagedMetadataWrites(){},configuredDisplayNameField:()=>'',referenceForPage:page=>'[['+page.path+']]',
  saveSettings:async()=>{},syncPageToDocumentLeaf:async()=>{},syncSidecarToPage:async()=>{},
  app:{vault:{getFileByPath:path=>files.get(path)??null},fileManager:{processFrontMatter:async(file,mutate)=>{
   const data=JSON.parse(disk.get(file.path));mutate(data);disk.set(file.path,JSON.stringify(data));writes.push(file.path);
  }}},index:{get:path=>pages.get(path),titleFor:page=>page.name,insertCreatedFile:file=>pages.get(file.path),
   withForegroundPriority:work=>work(),refreshVisibleHostMetadataPreviews(){},viewScopeCoverage:()=>({prepared:ready,complete:ready}),
   prepareRelationshipPair:()=>assert.fail('New-file writes cannot wait on unrelated local semantic readiness')},
  actionHostLeaf:()=>leaf,isActionSurfaceCurrent:()=>true});
 const documentSession={centerPath:a.path,pendingFollow:null,pendingUrl:null,persist(){},footprints:{accept(){}},
  plexView:{definition:{navigation:'attention'},editors:{bindings:[]},layoutRoot:()=>a.path}};
 const activePathRef={current:a.path},activePageRef={current:a},activeFileRef={current:a.file};
 const dependencies={plugin:host,hostLeaf:leaf,documentSession,activePathRef,activePageRef,activeFileRef,
  pendingDocumentFollowRef:{current:null},pendingDocumentDemandRef:{current:null},pendingFileExplorerDropRef:{current:null},pendingEditorNavigation:{current:null},
  graphActionPorts:{current:{prepareNavigation(){}}},wander:{pause(){}},releasePendingDocumentDemand(){},
  setNavigationOrigin(){},setActivePath(){},setHistoryCursor(){},actionNodeRef:M.actionNodeRef,isObsidianUri:()=>false};
 const activate=callback(activateSource,dependencies);
 host.notifyNavigation=path=>assert.equal(activate(pages.get(path),true,true,'user',true),true);
 const manager=new M.ActionManager({readCommandContext:()=>({sharedCenter:host.commandCentralPage()?M.actionNodeRef(host.commandCentralPage()):null,
  preferredSurfaceId:surface,windowId:'main',focusRegion:'graph'}),validateNode:node=>!!M.resolveActionPage(host.index,node)});
 host.actionManager=manager;
 class Dialog{constructor(plugin,origin,role,_committed,hostLeaf){this.origin=origin;this.role=role;this.host=hostLeaf;this.namedSource=plugin.index.titleFor(origin);}open(){dialogs.push(this);}close(){}}
 const open=callback(commandSource,{__owner:host,role:'left',family:'center',pageFor:context=>context.target.kind==='node'?M.resolveActionPage(host.index,context.target.node):null,
  NewRelatedNoteModal:Dialog,CreateFolderNoteModal:class{},enabled:{state:'enabled'}}).bind(host);
 manager.registerSurface({id:surface,generation:1,readSnapshot:()=>({mounted:true,visible:true,windowId:'main',center:M.actionNodeRef(pages.get(documentSession.centerPath)??a),selected:null,focusRegion:'graph',interactionRevision:1}),
  implementations:{'relationship.create-center.left':{availability:()=>({state:'enabled'}),execute:open}}});
 return{host,manager,a,b,c,files,pages,disk,writes,dialogs,snapshots,documentSession,activePathRef,
  set ready(value){ready=value;},async invoke(source='obsidian-command'){
   const request={id:'relationship.create-center.left',source,...(source==='local-hotkey'?{surfaceId:surface}:{})};
   const result=await manager.dispatch(request);snapshots.push({result,shared:host.settings.lastActivePath,session:documentSession.centerPath,ready});return result;
  },close(){manager.dispose();}};
}

for(const surface of ['sidepanel','tab'])for(const source of ['obsidian-command','local-hotkey'])for(const ready of [false,true]){
 test(`#318 A to B to C retains exact named source before/after local readiness: ${surface}/${source}/${ready}`,async()=>{
  const f=fixture(surface);try{
   f.ready=ready;assert.equal((await f.invoke(source)).status,'opened');const first=f.dialogs.at(-1);
   assert.equal(first.origin,f.a);assert.equal(first.namedSource,'A');assert.equal(first.origin.file,f.files.get('A.md'));
   await f.host.linkNewRelatedFile(first.origin,'left',f.b.file,'Friend');await f.host.finishNewRelatedNode(f.b,first.host,'follow');
   f.manager.closeSession('composer-1');assert.equal(f.host.settings.lastActivePath,'B.md');assert.equal(f.documentSession.centerPath,'B.md');
   assert.equal((await f.invoke(source)).status,'opened');const second=f.dialogs.at(-1);
   assert.equal(second.origin,f.b);assert.equal(second.namedSource,'B');assert.equal(second.origin.file,f.files.get('B.md'));
   await f.host.linkNewRelatedFile(second.origin,'left',f.c.file,'Friend');await f.host.finishNewRelatedNode(f.c,second.host,'follow');
   assert.deepEqual(JSON.parse(f.disk.get('A.md')),{Keep:'A',Friend:['[[B.md]]']});
   assert.deepEqual(JSON.parse(f.disk.get('B.md')),{Keep:'B',Friend:['[[C.md]]']});assert.deepEqual(JSON.parse(f.disk.get('C.md')),{Keep:'C'});
   assert.deepEqual(f.writes,['A.md','B.md']);assert.equal(f.host.settings.lastActivePath,'C.md');
  }finally{f.close();}
 });
}

test('#318 unavailable current center refuses without falling back to the previous indexed note',async()=>{
 const f=fixture();try{
  await f.host.finishNewRelatedNode(f.b,{},'follow');f.pages.delete('B.md');
  const result=await f.invoke();assert.equal(result.status,'unavailable');assert.equal(result.reasonKey,'actions.target-unavailable');assert.equal(f.dialogs.length,0);assert.deepEqual(f.writes,[]);
 }finally{f.close();}
});

test('#318 replacement of captured native owner before a queued write refuses all file mutations',async()=>{
 const f=fixture();try{
  await f.host.finishNewRelatedNode(f.b,{},'follow');assert.equal((await f.invoke()).status,'opened');const selected=f.dialogs.at(-1);
  let release;f.host.fileCreationAutomation.wait=()=>new Promise(done=>{release=done;});
  const pending=f.host.linkNewRelatedFile(selected.origin,'left',f.c.file,'Friend');
  f.files.set('B.md',{path:'B.md',extension:'md'});release();await assert.rejects(pending,/endpointChanged/);
  assert.deepEqual(f.writes,[]);assert.deepEqual(JSON.parse(f.disk.get('A.md')),{Keep:'A'});assert.deepEqual(JSON.parse(f.disk.get('B.md')),{Keep:'B'});
 }finally{f.close();}
});
