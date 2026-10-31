/** Real shared action and binding transactions with finite save gates. Native document/focus
 * acceptance remains in the serial Windows lane; these checks never substitute a text writer. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {loadPortableModules} from './support/portableTypeScript.mjs';
const {exports:{PlexEditorBindings,classicEditorKey,actionNodeRef,resolveActionPage}}=loadPortableModules(['src/application/PlexEditorBindings.ts','src/ui/plexViews/classic/occurrenceEditor.ts','src/adapters/obsidian/actionNode.ts']);
const source=ts.createSourceFile('PlexGraph.tsx',readFileSync(new URL('../src/ui/PlexGraph.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const appSource=ts.createSourceFile('App.tsx',readFileSync(new URL('../src/ui/App.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
/** Extract actual action/close code without initializing a synthetic native Obsidian editor. */
function production(name,deps,module=source){let expression;const visit=node=>{if(ts.isFunctionDeclaration(node)&&node.name?.text===name)expression=node.getText(module);if(ts.isVariableDeclaration(node)&&node.name.getText(module)===name){const value=node.initializer;expression=ts.isCallExpression(value)&&value.expression.getText(module)==='useCallback'?value.arguments[0].getText(module):value.getText(module)}ts.forEachChild(node,visit)};visit(module);assert(expression,name);
 const compiled=ts.transpileModule('const selected='+expression,{compilerOptions:{target:ts.ScriptTarget.ES2021,module:ts.ModuleKind.None}}).outputText;
 return Function(...Object.keys(deps),compiled+';return selected')(...Object.values(deps));}
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}};

test('one native format policy serves root and occurrence admission without relaxing native file identity',()=>{
 const supportsCentralEditorFile=production('supportsCentralEditorFile',{
  CENTRAL_EDITOR_IMAGE_EXTENSIONS:production('CENTRAL_EDITOR_IMAGE_EXTENSIONS',{}),
  CENTRAL_EDITOR_MEDIA_EXTENSIONS:production('CENTRAL_EDITOR_MEDIA_EXTENSIONS',{})});
 const files=new Map(),supports=production('supportsBoundEditor',{supportsCentralEditorFile,plugin:{app:{vault:{getFileByPath:path=>files.get(path)}}}});
 for(const [extension,expected]of [['md',true],['pdf',true],['canvas',true],['png',true],['webp',true],['mp4',true],['webm',true],['wav',true],['zip',false]]){
  const file={path:'File.'+extension,extension},page={path:file.path,file};files.set(file.path,file);
  assert.equal(supportsCentralEditorFile(page),expected);assert.equal(supports(page),expected);
  files.set(file.path,{...file});assert.equal(supports(page),false,'A supported format cannot authorize a replaced native file');
 }
});
/** All file, occurrence and lifetime facts are explicit. The production action owns admission. */
function fixture(occurrence=true){
 const events=[],notices=[],gate=deferred(),oldFile={path:'A.md'},file={path:'B.md'},node={occurrenceId:'B',page:{path:'B.md',file}},state={current:true,node};
 const editors=new PlexEditorBindings(()=>events.push('binding-change'));
 const old=editors.open({viewId:'mindmap',occurrenceId:'A',target:{nodeId:'A.md',path:'A.md',fileIdentity:'file-A'},dimensions:{width:660,height:410},mode:'source'}).binding;
 if(!occurrence){const close=editors.beginClose(old.id);close.commit();}
 events.length=0;
 const viewSession={editors,capture:()=>()=>state.current},boundEditorClose={current:{id:old.id,close:async()=>{events.push('native-save');await gate.promise;events.push('native-close')}}};
 const shared={viewSession,boundEditorClose,preserveCameraOnNextLayout:{current:false},retainedBoundEditor:{current:{id:old.id}},Notice:class{constructor(message){notices.push(message)}},translate:key=>key};
 const deps={...shared,closeBoundEditor:production('closeBoundEditor',shared),editorExpansion:()=>state.node,
  editorExpansionCurrent:{current:()=>state.node},occurrenceEditorPolicy:occurrence,occurrenceEditorCapable:occurrence,classic:undefined,editorSwitch:{current:null},setEditorSwitching:value=>events.push('busy:'+value),
  activePath:'A.md',editorAttention:{current:'A.md'},centralEditorAvailable:true,centralEditorPage:{path:'A.md',file:oldFile},
  onCentralNodeEditorChange:value=>events.push('enabled:'+value),setCentralEditorMaximizedState:value=>events.push('maximized:'+value),onActivate:page=>{events.push('navigate:'+page.path);return true},
  actionNodeRef:page=>({identity:page.path,path:page.path,fileIdentity:page.file===file?'file-B':'changed-file'}),occurrenceKey:row=>row.occurrenceId,
  viewDefinition:{id:occurrence?'mindmap':'wuxing'},settings:{centerEmbedWidth:660,centerEmbedHeight:410,centralNodeMarkdownMode:'source'},nodeId:value=>value,viewport:{current:{isConnected:true}}};
 return{events,notices,gate,editors,old,oldFile,file,node,state,deps,action:production('editorExpandAction',deps)};
}

test('another occurrence waits for native save/close before admitting one replacement editor',async()=>{
 const f=fixture(),result=f.action.execute({request:{id:'editor.expand'}});assert.equal(f.editors.bindings[0].id,f.old.id);assert.equal(f.editors.bindings[0].closing,true);
 assert.deepEqual(f.events,['busy:true','binding-change','native-save']);assert.equal(f.action.availability({}).state,'disabled');
 assert.equal((await f.action.execute({request:{id:'editor.expand'}})).status,'unavailable','Concurrent clicks cannot start another save/open');
 f.gate.resolve();assert.equal((await result).status,'completed');const binding=f.editors.bindings[0];
 assert.equal(binding.target.nodeId,'B.md');assert.notEqual(binding.id,f.old.id);assert.equal(f.editors.bindings.length,1);
 assert(f.events.indexOf('native-close')<f.events.lastIndexOf('binding-change'));assert.deepEqual(f.notices,[]);
});

test('Facets noncentral editor reuses binding save/close without attention navigation',async()=>{
 const f=fixture();f.deps.viewDefinition={id:'wuxing',editorHosting:'attention-and-occurrence'};
 const action=production('editorExpandAction',f.deps),pending=action.execute({request:{id:'editor.expand'}});f.gate.resolve();
 assert.equal((await pending).status,'completed');assert.equal(f.editors.bindings[0].viewId,'wuxing');
 assert.equal(f.editors.bindings[0].occurrenceId,'B');assert.equal(f.editors.bindings[0].target.path,'B.md');
 assert(!f.events.some(event=>event.startsWith('navigate:')||event.startsWith('enabled:')));
});

test('Facets central editor retains existing attention-host activation after saving a bound neighbor',async()=>{
 const f=fixture();f.deps.viewDefinition={id:'wuxing',editorHosting:'attention-and-occurrence'};f.deps.activePath='B.md';f.deps.editorAttention.current='B.md';
 const action=production('editorExpandAction',f.deps),pending=action.execute({request:{id:'editor.expand'}});f.gate.resolve();
 assert.equal((await pending).status,'completed');assert.equal(f.editors.bindings.length,0);
 assert(f.events.includes('navigate:B.md')&&f.events.includes('enabled:true'));
});

test('Facets corner buttons advertise supported noncentral native bindings and retain central representations',()=>{
 for(const [extension,central,expected]of [['md',false,true],['png',false,true],['mp4',false,true],['zip',false,false],['png',true,true]]){
  const page={path:central?'Focus':'Neighbor',file:{extension}},deps={classic:undefined,baseNode:{page,role:central?'center':'child'},editorTarget:page,hasCentralEditor:false,activePath:'Focus',
   occurrenceEditorPolicy:false,viewDefinition:{editorHosting:'attention-and-occurrence',capabilities:{editor:true}},supportsBoundEditor:page=>['md','png','mp4'].includes(page.file.extension),supportsCentralEditorFile:()=>true,isEditorOccurrence:()=>central,urlEmbed:()=>null};
  assert.equal(production('canOpenCentralEditor',deps),expected,extension+':'+central);
 }
});
test('failed native save keeps the original buffer binding and refuses replacement',async()=>{
 const f=fixture(),result=f.action.execute({request:{id:'editor.expand'}});f.gate.reject(Error('Disk failure'));assert.equal((await result).status,'failed');
 assert.equal(f.editors.bindings[0].id,f.old.id);assert.equal(f.editors.bindings[0].closing,false);assert.deepEqual(f.notices,['actions.editor-save-failed']);
 assert(!f.events.includes('native-close'));assert.equal(f.deps.editorSwitch.current,null);
});

for(const occurrence of [false,true])test('shared editor action maximizes only after accepted '+(occurrence?'occurrence':'central')+' opening',async()=>{
 for(const maximize of [false,true]){
  const f=fixture(occurrence),pending=f.action.execute({request:{id:'editor.expand',args:{maximize}}});
  assert(!f.events.some(event=>event.startsWith('maximized:')),'An outstanding native save cannot maximize another document');
  f.gate.resolve();assert.equal((await pending).status,'completed');assert.equal(f.events.at(-2),'maximized:'+maximize);
 }
 const f=fixture(occurrence),pending=f.action.execute({request:{id:'editor.expand',args:{maximize:true}}});
 f.gate.reject(Error('Save failed'));assert.equal((await pending).status,'failed');assert(!f.events.some(event=>event.startsWith('maximized:')));
});
for(const invalid of ['view','attention','hidden','incarnation'])test('save completion cannot reopen a retired '+invalid+' target',async()=>{
 const f=fixture(),result=f.action.execute({request:{id:'editor.expand'}});
 if(invalid==='view')f.state.current=false;
 if(invalid==='attention')f.deps.editorAttention.current='C.md';
 if(invalid==='hidden')f.state.node=null;
 if(invalid==='incarnation')f.state.node={...f.node,page:{...f.node.page,file:{path:'B.md'}}};
 f.gate.resolve();assert.notEqual((await result).status,'completed');assert.equal(f.editors.bindings.length,0);assert(!f.events.some(event=>event.startsWith('navigate:')));
});
test('same occurrence reuses the existing binding without saving or replacing its host',async()=>{
 const f=fixture();f.state.node={occurrenceId:'A',page:{path:'A.md',file:f.oldFile}};f.deps.actionNodeRef=page=>({identity:page.path,fileIdentity:'file-A'});
 f.action=production('editorExpandAction',f.deps);assert.equal((await f.action.execute({request:{id:'editor.expand'}})).status,'completed');
 assert.equal(f.editors.bindings[0].id,f.old.id);assert(!f.events.includes('native-save'));
});
test('attention-following views save the old document then use accepted navigation and the existing central editor',async()=>{
 const f=fixture(false),result=f.action.execute({request:{id:'editor.expand'}});assert.deepEqual(f.events,['busy:true','native-save']);
 f.gate.resolve();assert.equal((await result).status,'completed');assert.deepEqual(f.events,['busy:true','native-save','native-close','enabled:false','navigate:B.md','enabled:true','busy:false']);
 assert.equal(f.editors.bindings.length,0,'Attention views do not adopt independent occurrence bindings');
});
test('attention editor save failure retains its existing presentation and does not navigate',async()=>{
 const f=fixture(false),result=f.action.execute({request:{id:'editor.expand'}});f.gate.reject(Error('Disk failure'));assert.equal((await result).status,'failed');
 assert(!f.events.some(event=>event.startsWith('navigate:')||event==='enabled:false'));assert.deepEqual(f.notices,['actions.editor-save-failed']);
});
test('newer attention wins over a slow prior editor-button request',async()=>{
 const f=fixture(false),result=f.action.execute({request:{id:'editor.expand'}});f.deps.editorAttention.current='C.md';f.gate.resolve();assert.equal((await result).status,'cancelled');
 assert(!f.events.some(event=>event.startsWith('navigate:')||event==='enabled:false'));assert.equal(f.deps.editorSwitch.current,null);
});

/** Cached presentation may precede a metadata facade replacement; native identity stays exact. */
function admissionFixture(){
 const file={path:'B.md',extension:'md'},page={path:'B.md',file},node={occurrenceId:'B',page:{...page}};
 const deps={viewDefinition:{capabilities:{editor:true}},viewSession:{},occurrenceEditorPolicy:false,occurrenceEditorCapable:false,classic:undefined,
  graphActionPage:()=>page,scene:{nodes:[node],zoneViewports:{phase:{}}},occurrenceKey:node=>node.occurrenceId,isEditorOccurrence:()=>false,urlEmbed:()=>null,
  supportsCentralEditorFile:page=>page.file.extension==='md',plugin:{app:{vault:{getFileByPath:()=>file}}},index:{isVisiblePage:()=>true},
  actionNodeRef:page=>({path:page.path}),nodeMatchesCurrentFilter:()=>true,areaForNode:()=> 'phase',zoneDisplayLayouts:{phase:{localPositions:new Map([['B',{}]])}}};
 const context={target:{kind:'node',occurrenceId:'B',node:{path:'B.md'}}};
 return{file,page,node,deps,context,read:()=>production('editorExpansion',deps)(context)};
}
test('editor admission reacquires a newer metadata facade for the exact displayed native file',()=>{
 const f=admissionFixture(),admitted=f.read();assert(admitted);assert.equal(admitted.page,f.page);assert.equal(admitted.occurrenceId,'B');
 assert.notEqual(admitted,f.node);assert.notEqual(f.node.page,f.page,'Presentation snapshot is not mutated');
});
test('the shared action preserves legacy central URL editor admission without admitting arbitrary noncentral URLs',()=>{
 const f=admissionFixture();delete f.page.file;delete f.node.page.file;f.page.url=f.node.page.url='https://example.com';
 f.deps.supportsCentralEditorFile=()=>false;f.deps.isEditorOccurrence=()=>true;f.deps.urlEmbed=()=>({url:f.page.url});
 assert(f.read(),'Existing central web guests retain their editor route');
 f.deps.isEditorOccurrence=()=>false;assert.equal(f.read(),null);
});
test('metadata facade admission still refuses a replaced file, renamed occurrence or retired canonical target',()=>{
 for(const kind of ['file','path','physical-rename','canonical','native']){const f=admissionFixture();
  if(kind==='file')f.node.page={path:'B.md',file:{path:'B.md',extension:'md'}};
  if(kind==='path')f.node.page={path:'Old.md',file:f.file};
  if(kind==='physical-rename')f.file.path='Renamed.md';
  if(kind==='canonical')f.deps.graphActionPage=()=>null;
  if(kind==='native')f.deps.plugin.app.vault.getFileByPath=()=>({path:'B.md',extension:'md'});
  assert.equal(f.read(),null,kind);
 }
});
test('metadata facade admission retains current visibility, filter and exact area-occurrence checks',()=>{
 for(const kind of ['visible','filter','area','occurrence']){const f=admissionFixture();
  if(kind==='visible')f.deps.index.isVisiblePage=()=>false;
  if(kind==='filter')f.deps.nodeMatchesCurrentFilter=()=>false;
  if(kind==='area')f.deps.zoneDisplayLayouts.phase.localPositions.clear();
  if(kind==='occurrence')f.context.target.occurrenceId='another-copy';
  assert.equal(f.read(),null,kind);
 }
});


test('Compass noncentral editor saves its legacy central host then binds in place without attention navigation',async()=>{
 const f=fixture(false);f.deps.classic={editorKey:classicEditorKey};f.deps.occurrenceEditorCapable=true;f.deps.viewDefinition={id:'classic'};f.node.role='child';
 f.action=production('editorExpandAction',f.deps);const pending=f.action.execute({request:{id:'editor.expand'}});f.gate.resolve();assert.equal((await pending).status,'completed');
 const binding=f.editors.bindings[0];assert.equal(binding.viewId,'classic');assert.equal(binding.occurrenceId,classicEditorKey(f.node,'A.md'));assert.equal(binding.target.path,'B.md');
 assert(!f.events.some(event=>event.startsWith('navigate:')));assert(f.events.includes('enabled:false'));
});

/** Drive the actual navigation handoff and native close transaction across a root publication. */
function centerNavigationFixture(){
 const f=fixture(),pending={current:null};f.file.extension='md';f.oldFile.extension='md';f.state.root='A.md';
 const scene={nodes:[{occurrenceId:f.old.occurrenceId,page:{path:'A.md',file:f.oldFile},branch:{depth:0}}]};
 Object.assign(f.deps,{centerEditorNavigation:pending,rooted:true,sceneScope:'A.md',scene,
  viewDefinition:{id:'mindmap',hierarchy:{primary:'center'}},supportsBoundEditor:page=>page.file?.extension==='md',
  selectionPreflight:{current:async()=> !f.editors.bindings.length || (await f.deps.closeBoundEditor(f.old.id)).status==='completed'},
  setEditorNavigationRevision:()=>{},index:{isVisiblePage:()=>true},
  resolveActionPage:()=>f.state.node?.page??null});
 f.deps.viewSession.layoutRoot=()=>f.state.root;
 const hasPending=production('hasPendingEditorNavigation',f.deps);f.deps.hasPendingEditorNavigation=hasPending;
 return{...f,pending,scene,hasPending,prepare:production('prepareEditorNavigation',f.deps),complete:production('completeEditorNavigation',f.deps),restore:production('restoreNavigatedEditor',f.deps)};
}

test('Mind Map navigation saves its center then restores mode and dimensions at the new admitted root',async()=>{
 const f=centerNavigationFixture(),ready=f.prepare();assert(f.events.includes('native-save'));assert.equal(f.editors.bindings[0].id,f.old.id);
 f.gate.resolve();assert.equal(await ready,true);assert.equal(f.editors.bindings.length,0);
 f.state.root='B.md';f.complete(f.node.page);f.scene.nodes=[];f.restore();assert.equal(f.editors.bindings.length,0,'Wait for the new root occurrence to be displayed');
 f.scene.nodes=[{...f.node,occurrenceId:'new-root',branch:{depth:0}}];f.restore();
 const next=f.editors.bindings[0];assert(next);assert.notEqual(next.id,f.old.id);assert.equal(next.occurrenceId,'new-root');assert.equal(next.target.path,'B.md');
 assert.equal(next.mode,f.old.mode);assert.deepEqual(next.dimensions,f.old.dimensions);assert.equal(next.target.fileIdentity,'file-B');assert.equal(f.pending.current,null);assert.deepEqual(f.notices,[]);
});

for(const invalid of ['save','view','root','unsupported','hidden','missing'])test('center editor handoff rejects '+invalid,async()=>{
 const f=centerNavigationFixture(),ready=f.prepare();
 if(invalid==='save')f.gate.reject(Error('Save failed'));else f.gate.resolve();
 const accepted=await ready;
 if(invalid==='save'){assert.equal(accepted,false);assert.equal(f.editors.bindings[0].id,f.old.id);assert.equal(f.editors.bindings[0].closing,false);assert.equal(f.pending.current,null);return;}
 f.state.root='B.md';f.complete(f.node.page);f.scene.nodes=[{...f.node,branch:{depth:0}}];
 if(invalid==='view')f.state.current=false;
 if(invalid==='root')f.state.root='C.md';
 if(invalid==='unsupported')f.file.extension='png';
 if(invalid==='hidden')f.deps.index.isVisiblePage=()=>false;
 if(invalid==='missing')f.state.node=null;
 f.restore();assert.equal(f.editors.bindings.length,0);assert.equal(f.pending.current,null);
});

test('an editor on a different Mind Map occurrence is saved without becoming the new center editor',async()=>{
 const f=centerNavigationFixture();f.scene.nodes[0].branch.depth=1;
 const ready=f.prepare();f.gate.resolve();assert.equal(await ready,true);assert.equal(f.pending.current,null);
 f.state.root='B.md';f.complete(f.node.page);f.restore();assert.equal(f.editors.bindings.length,0);
});

test('a newer explicit editor cancels the pending center handoff',async()=>{
 const f=centerNavigationFixture(),ready=f.prepare();f.gate.resolve();await ready;
 f.state.root='B.md';f.complete(f.node.page);f.scene.nodes=[{...f.node,branch:{depth:0}}];
 const newer=f.editors.open({...f.old,occurrenceId:'chosen',target:{...f.old.target,nodeId:'C.md',path:'C.md'}}).binding;
 f.restore();assert.equal(f.editors.bindings[0].id,newer.id);assert.equal(f.pending.current,null);
 f.editors.beginClose(newer.id).commit();f.restore();assert.equal(f.editors.bindings.length,0);
});

/** Wire App and graph production callbacks to one editor/session, including synchronous root notifications. */
function onwardNavigationFixture(){
 const f=centerNavigationFixture(),pages=new Map([['A.md',{path:'A.md',file:f.oldFile}],['B.md',f.node.page],
  ...['C.md','D.md'].map(path=>[path,{path,file:{path,extension:'md'}}])]);
 const files=new Map([...pages].map(([path,page])=>[path,page.file]));
 Object.assign(f.deps.index,{get:path=>pages.get(path)});
 Object.assign(f.deps,{actionNodeRef,resolveActionPage,supportsBoundEditor:page=>page.file?.extension==='md'&&files.get(page.path)===page.file});
 f.hasPending=production('hasPendingEditorNavigation',f.deps);f.deps.hasPendingEditorNavigation=f.hasPending;
 f.prepare=production('prepareEditorNavigation',f.deps);f.complete=production('completeEditorNavigation',f.deps);f.restore=production('restoreNavigatedEditor',f.deps);
 const view=f.deps.viewSession;view.definition={navigation:'rooted'};
 view.setRoot=id=>{assert.equal(f.editors.bindings.length,0);f.state.root=id;f.restore();return true;};
 const active={current:'A.md'},pending={current:null};let activate;
 const deps={plugin:{app:{vault:{getFileByPath:path=>files.get(path)}},index:f.deps.index,settings:{navigationHistory:['A.md']},
  saveSettings:async()=>{},syncPageToDocumentLeaf:async()=>{},syncSidecarToPage:async()=>{}},
  documentSession:{plexView:view,footprints:{accept(){}},persist(){}},pendingEditorNavigation:pending,
  graphActionPorts:{current:{prepareEditorTransition:f.prepare,hasPendingEditorTransition:f.hasPending,completeEditorTransition:f.complete}},
  nodeId:id=>id,activePathRef:active,activePageRef:{current:pages.get('A.md')},activeFileRef:{current:f.oldFile},actionNodeRef,resolveActionPage,
  pendingFileExplorerDropRef:{current:null},pendingDocumentFollowRef:{current:null},pendingDocumentDemandRef:{current:null},
  wander:{pause(){}},setNavigationOrigin(){},setActivePath(){},setHistoryCursor(){},releasePendingDocumentDemand(){},hostLeaf:{},
  translate:key=>key,Notice:class{constructor(message){f.notices.push(message)}},activate:(...args)=>activate(...args)};
 activate=production('activate',deps,appSource);
 return{...f,pages,files,active,navigate:name=>activate(pages.get(name),true,true,'user',true),
  show(name){f.scene.nodes=[{page:pages.get(name),occurrenceId:'root',branch:{depth:0}}];f.restore();}};
}
/** Settle only promise continuations; no index progress, fake timer or manual editor opening. */
async function settleNavigation(){for(let n=0;n<20;n++)await Promise.resolve();}

for(const mode of ['source','preview'])test(`delayed Mind Map root B transfers ${mode} editor intent onward to C`,async()=>{
 const f=onwardNavigationFixture();f.editors.setMode(f.old.id,mode);
 f.navigate('B.md');f.gate.resolve();await settleNavigation();
 f.scene.nodes=[];f.restore();assert.equal(f.active.current,'B.md');assert(f.hasPending());assert.equal(f.editors.bindings.length,0);
 f.navigate('C.md');await settleNavigation();
 assert.equal(f.active.current,'C.md');assert.equal(f.pending.current.target.identity,'C.md');
 f.show('B.md');assert.equal(f.editors.bindings.length,0,'Late B publication cannot open its obsolete editor');
 f.show('C.md');const binding=f.editors.bindings[0];assert.equal(binding.target.path,'C.md');assert.equal(binding.mode,mode);
 assert.deepEqual(binding.dimensions,f.old.dimensions);assert.equal(f.events.filter(event=>event==='native-save').length,1);
 assert.equal(f.pending.current,null);assert.deepEqual(f.notices,[]);
});

test('several onward destinations share the saved intent and accept only the latest root',async()=>{
 const f=onwardNavigationFixture();f.navigate('B.md');f.gate.resolve();await settleNavigation();f.scene.nodes=[];
 f.navigate('C.md');f.navigate('D.md');await settleNavigation();
 assert.equal(f.state.root,'D.md');f.show('C.md');assert.equal(f.editors.bindings.length,0);
 f.show('D.md');assert.equal(f.editors.bindings[0].target.path,'D.md');assert.equal(f.events.filter(event=>event==='native-save').length,1);
});

for(const invalid of ['replaced-file','preflight','retired-view','unsupported'])test(`onward editor handoff handles ${invalid} without a stale replacement`,async()=>{
 const f=onwardNavigationFixture();f.navigate('B.md');f.gate.resolve();await settleNavigation();f.scene.nodes=[];
 if(invalid==='preflight')f.deps.selectionPreflight.current=async()=>false;
 if(invalid==='unsupported')f.files.get('C.md').extension='png';
 f.navigate('C.md');
 if(invalid==='replaced-file'){const page={path:'C.md',file:{path:'C.md',extension:'md'}};f.pages.set('C.md',page);f.files.set('C.md',page.file);}
 if(invalid==='retired-view')f.state.current=false;
 await settleNavigation();
 if(invalid==='replaced-file'||invalid==='preflight'){
  assert.equal(f.state.root,'B.md');f.show('B.md');assert.equal(f.editors.bindings[0].target.path,'B.md','Rejected onward navigation keeps the current saved editor intent');
 }else{f.show('C.md');assert.equal(f.editors.bindings.length,0);assert.equal(f.pending.current,null);}
 assert.equal(f.events.filter(event=>event==='native-save').length,1);
});
