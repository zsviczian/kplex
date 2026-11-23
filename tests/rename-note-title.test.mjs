/** Native rename/title workflow with exact file identity and preserved user metadata. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import {loadPortableModules} from './support/portableTypeScript.mjs';
const {exports:M}=loadPortableModules(['src/adapters/obsidian/renameNote.ts','src/adapters/obsidian/fileReveal.ts']);

/** FileManager mutates the same native object; late host changes can be injected before metadata. */
function fixture(extension='md',frontmatter={title:'Old',aliases:['Other name'],keep:42}) {
  const file={path:`Old.${extension}`,extension},files=new Map([[file.path,file]]),calls=[];
  const f={file,files,calls,frontmatter,beforeMetadata:()=>{}};
  f.app={vault:{getFileByPath:path=>files.get(path)??null},metadataCache:{getFileCache:()=>({frontmatter})},fileManager:{
    async renameFile(target,path){calls.push('rename');files.delete(target.path);target.path=path;files.set(path,target)},
    async processFrontMatter(target,mutate){calls.push('metadata');await f.beforeMetadata();mutate(frontmatter)},
  }};return f;
}
/** Localized host guidance is supplied by the native shell. */
const unavailable=()=>Error('endpoint changed');

test('rename updates an existing title after native link maintenance and preserves aliases',async()=>{
  const f=fixture();await M.renameNoteWithDisplayName(f.app,f.file,'Renamed.md','Renamed','title',unavailable);
  assert.deepEqual(f.calls,['rename','metadata']);assert.equal(f.file.path,'Renamed.md');
  assert.deepEqual(f.frontmatter,{title:'Renamed',aliases:['Other name'],keep:42});
});

test('absent titles and attachments never gain document properties',async()=>{
  for(const f of [fixture('md',{keep:'Keep'}),fixture('png')]){
    await M.renameNoteWithDisplayName(f.app,f.file,`New.${f.file.extension}`,'New',M.renameDisplayField(f.app,f.file,'aliases, title'),unavailable);
    assert.deepEqual(f.calls,['rename']);
  }
});

test('the first configured available field supplies the toggle, including both alias spellings',async()=>{
  for(const field of ['aliases','alias','Custom name']){
    const f=fixture('md',{[field]:['Display name','Preserved alias'],title:'Separate title'});
    const selected=M.renameDisplayField(f.app,f.file,`Missing, ${field}, title`);assert.equal(selected,field);
    await M.renameNoteWithDisplayName(f.app,f.file,'New.md','New',selected,unavailable);
    assert.deepEqual(f.frontmatter[field],['New','Preserved alias']);assert.equal(f.frontmatter.title,'Separate title');
  }
  const f=fixture('md',{alias:'Old'});assert.equal(M.renameDisplayField(f.app,f.file,'aliases'),'alias');
  assert.equal(M.renameDisplayField(f.app,f.file,'title'),null,'Unconfigured fallback fields are not invented');
});

test('toggle off renames only the file and preserves every display-name field',async()=>{
  const f=fixture();await M.renameNoteWithDisplayName(f.app,f.file,'New.md','New',null,unavailable);
  assert.deepEqual(f.calls,['rename']);assert.equal(f.frontmatter.title,'Old');
});

test('same-path retry repairs a failed metadata write; title key spelling stays intact',async()=>{
  const f=fixture('md',{Title:'Old'});f.beforeMetadata=()=>{throw Error('write failed')};
  await assert.rejects(M.renameNoteWithDisplayName(f.app,f.file,'New.md','New','title',unavailable),/write failed/);
  f.beforeMetadata=()=>{};await M.renameNoteWithDisplayName(f.app,f.file,'New.md','New','title',unavailable);
  assert.equal(f.calls.filter(call=>call==='rename').length,1);assert.deepEqual(f.frontmatter,{Title:'New'});
});

test('replacement and competing move during the awaited native read reject late title writes',async()=>{
  for(const hazard of ['replace','move']){
    const f=fixture();f.beforeMetadata=()=>{if(hazard==='replace')f.files.set('New.md',{...f.file});else f.file.path='Moved.md'};
    await assert.rejects(M.renameNoteWithDisplayName(f.app,f.file,'New.md','New','title',unavailable),/endpoint changed/);
    assert.equal(f.frontmatter.title,'Old');
  }
});

function folderFixture() {
  const root={path:'/',parent:null,children:[]},parent={path:'Parent',parent:root,children:[]};
  const folder={path:'Parent/Old.1',parent,children:[]},folders=new Map([[root.path,root],[parent.path,parent],[folder.path,folder]]);
  const calls=[];
  const app={vault:{getRoot:()=>root,getFolderByPath:path=>folders.get(path)??null,getAbstractFileByPath:path=>folders.get(path)??null},
    fileManager:{async renameFile(target,path){calls.push({target,path});folders.delete(target.path);target.path=path;folders.set(path,target)}}};
  return {app,root,parent,folder,folders,calls};
}

test('folder rename uses FileManager with the exact native folder and fixed parent',async()=>{
  const f=folderFixture(),plan=M.captureFolderRename(f.app,f.folder);
  assert.equal(M.captureFolderRename(f.app,f.root),null);
  await M.renameFolder(f.app,plan,'Parent/Old.1',unavailable);
  assert.deepEqual(f.calls,[]);
  await assert.rejects(M.renameFolder(f.app,plan,'Outside',unavailable),/endpoint changed/);
  await assert.rejects(M.renameFolder(f.app,plan,'Parent/..',unavailable),/endpoint changed/);
  f.folders.set('Parent/Occupied',{});
  await assert.rejects(M.renameFolder(f.app,plan,'Parent/Occupied',unavailable),/endpoint changed/);
  assert.deepEqual(f.calls,[]);
  await M.renameFolder(f.app,plan,'Parent/New.2',unavailable);
  assert.deepEqual(f.calls,[{target:f.folder,path:'Parent/New.2'}]);
  assert.equal(f.folders.get('Parent/New.2'),f.folder);
});

test('a folder rename cannot follow a moved or substituted folder or parent',async()=>{
  for(const replace of [
    f=>{f.folders.set(f.folder.path,{...f.folder})},
    f=>{f.folders.set(f.parent.path,{...f.parent})},
    f=>{f.parent.path='Moved';f.folder.path='Moved/Old.1'},
  ]){
    const f=folderFixture(),plan=M.captureFolderRename(f.app,f.folder);
    replace(f);
    await assert.rejects(M.renameFolder(f.app,plan,'Parent/New',unavailable),/endpoint changed/);
    assert.deepEqual(f.calls,[]);
  }
});

/** Exercise production menu capture and action wiring without loading a graph scene. */
function productionGraphRename(dependencies) {
  const filename='src/ui/PlexGraph.tsx';
  const source=ts.createSourceFile(filename,readFileSync(new URL(`../${filename}`,import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const names=new Set(['renameTargetFor','renameFrom','capturedPage','capturedPersistent','capturedNativeTarget','capturedFolderPath',
    'capturedRenameTarget','capturedRenamePath','runCapturedNodeAction']);
  const statements=[];
  const visit=node=>{
    if(ts.isVariableDeclaration(node)&&names.has(node.name.getText(source))) statements.push('const '+node.getText(source)+';');
    if(ts.isPropertyAssignment(node)&&node.name.getText(source)==='"node.rename"') statements.push('const renameAction='+node.initializer.getText(source)+';');
    ts.forEachChild(node,visit);
  };
  visit(source);
  assert.equal(statements.length,names.size+1);
  const code=ts.transpileModule(statements.join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2021}}).outputText;
  return Function(...Object.keys(dependencies),`${code}\nreturn {renameAction, capturedRenameTarget, runCapturedNodeAction};`)(...Object.values(dependencies));
}

test('folder Rename action and captured context menu share native eligibility and reject replacement',()=>{
  const f=folderFixture(),page={path:'folder:'+f.folder.path,isFolder:true,file:null},file={path:'Note.md'};
  f.app.vault.getFileByPath=path=>path===file.path?file:null;
  const context={page,generation:4},opened=[],calls=[],sessionClosures=[];
  let liveMenu=true;
  const dependencies={page,persistent:page,plugin:{app:f.app,isActionSurfaceCurrent:(id,generation)=>id==='plex'&&generation===4,
    actionManager:{dispatch:request=>calls.push(request),closeSession:id=>sessionClosures.push(id)}},
    nativeRevealTarget:M.nativeRevealTarget,captureFolderRename:M.captureFolderRename,graphActionPage:value=>value.page,
    graphAction:(execute,canRun)=>({execute,canRun}),actionSurfaceId:'plex',graphDialogSerial:{current:0},graphDialogs:{current:new Set()},
    viewSession:null,viewport:{current:{isConnected:true}},menuCurrent:()=>liveMenu,actionNodeRef:value=>({identity:value.path}),
    occurrenceId:'row',RenameNoteModal:class {constructor(_plugin,target,invocation){Object.assign(this,{target,invocation})}open(){opened.push(this)}}};
  const {renameAction,capturedRenameTarget,runCapturedNodeAction}=productionGraphRename(dependencies);
  assert.equal(capturedRenameTarget,f.folder);
  assert.equal(renameAction.canRun(context),true);
  assert.equal(renameAction.canRun({page:{...page,path:'folder:/'}}),false);
  assert.equal(renameAction.canRun({page:{...page,path:'folder:Missing'}}),false);
  assert.equal(renameAction.canRun({page:{...page,transient:{kind:'section'}}}),false);
  assert.equal(renameAction.canRun({page:{path:file.path,file}}),true);
  const outcome=renameAction.execute(context);
  assert.equal(outcome.status,'opened');
  assert.equal(opened[0].target,f.folder);
  assert.equal(opened[0].invocation.current(),true);
  opened[0].invocation.onClosed();
  assert.deepEqual(sessionClosures,[outcome.sessionId]);
  runCapturedNodeAction('node.rename',page);
  assert.deepEqual(calls,[{id:'node.rename',source:'context-menu',surfaceId:'plex',target:{kind:'explicit',node:{identity:page.path},occurrenceId:'row'}}]);
  liveMenu=false;
  runCapturedNodeAction('node.rename',page);
  liveMenu=true;
  f.folders.set(f.folder.path,{...f.folder});
  runCapturedNodeAction('node.rename',page);
  assert.equal(calls.length,1);
});
