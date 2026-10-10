/**
 * Serial native acceptance for linked-document representation and embedded initial defaults.
 * Owns test-scoped fixture files, native call observations, trusted shortcut assignments and
 * restoration. Requires the explicit disposable small vault, an unlocked foreground Mac and
 * exactly matching built/installed artifacts; Electron input does not prove physical-device use.
 */
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
const root=resolve(process.env.KPLEX_PROJECT_ROOT??fileURLToPath(new URL('../../..',import.meta.url)));
const {validateTarget}=await import(pathToFileURL(join(root,'scripts/testing/obsidian/runner.mjs')));
const vaultName=process.env.KPLEX_TEST_VAULT_NAME;
assert.equal(vaultName,'kplex-test-small','Select the disposable small test vault explicitly');
const target=validateTarget({vaultName,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const vault=target.vault,config=target.config,out=process.env.KPLEX_HOST_REPORT_DIR;
assert(out&&(!existsSync(out)||readdirSync(out).length===0),'Choose a fresh explicit KPLEX_HOST_REPORT_DIR');
mkdirSync(out,{recursive:true});
/** Hash exact driver and artifact bytes for reproducible receipts. */
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const driver=readFileSync(fileURLToPath(import.meta.url));writeFileSync(join(out,'driver-source.mjs'),driver);
const names=['plugins/k-plex/data.json','plugins/obsidian-excalidraw-plugin/data.json','community-plugins.json','hotkeys.json'];
const backups=names.map(name=>({name,bytes:existsSync(`${config}/${name}`)?readFileSync(`${config}/${name}`):null}));
const sourceHead=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',timeout:5000});assert.equal(sourceHead.status,0,'Read actual native receipt source provenance');
const report={startedAt:new Date().toISOString(),base:sourceHead.stdout.trim(),driverSha256:sha(driver),vault:vaultName,scope:'native representation/command routing, passive destination identity and embedded initial defaults',limits:['Electron trusted input is not physical keyboard or Windows acceptance','Bounded settlement/DOM checks do not establish actual paint latency','Embedded leaf capture is temporary native-call observation, not a production diagnostic API'],artifacts:{}};
/** Invoke one bounded CLI operation and retain exact failure text. */
function cli(command,...args){const r=spawnSync(process.env.KPLEX_OBSIDIAN_CLI??'obsidian',[`vault=${vaultName}`,command,...args],{cwd:root,encoding:'utf8',timeout:30000,killSignal:'SIGKILL',maxBuffer:8*1024*1024});if(r.error||r.status!==0||/^Error:/m.test(r.stdout))throw r.error??Error(r.stderr||r.stdout);return r.stdout.trim();}
/** Read the serializable result of a native owning-window operation. */
function evaluate(code){return JSON.parse(cli('eval',`code=${code}`).replace(/^=>\s*/,''));}
/** Yield between bounded native controller reads without blocking the renderer. */
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

/** Install an owned, bounded fixture/controller and begin its asynchronous native scenarios. */
function probe(){
 if(window.__kplexInteractionFinal)throw Error('Existing interaction final controller');
 const p=app.plugins.plugins['k-plex'],ex=app.plugins.plugins['obsidian-excalidraw-plugin'];
 const remote=require('@electron/remote');
 const windows=remote.BrowserWindow.getAllWindows().filter(/** Restrict trusted input to the explicitly configured disposable vault, never an unrelated active window. */ item=>item.getTitle().includes('kplex-test-small'));
 if(windows.length!==1)throw Error('Disposable native window identity ambiguous');
 const win=windows[0],wc=win.webContents;
 if(remote.powerMonitor.getSystemIdleState(10)==='locked')throw Error('Locked native session');
 if(app.setting.isOpen||document.querySelector('.modal-container'))throw Error('Existing modal');
 remote.app.show();remote.app.focus({steal:true});win.show();win.moveTop();win.focus();wc.focus();
 const host=app.workspace.getLeavesOfType('k-plex-react-view').find(leaf=>leaf.view.containerEl.isShown());
 if(!p||!host||!ex?.createDrawing||!ex.ea?.toggleViewMode||!app.hotkeyManager?.setHotkeys)throw Error('Native prerequisites unavailable');
 const c=window.__kplexInteractionFinal={p,ex,host,folder:`Kplex-Interaction-Final-${Date.now()}`,originalSettings:JSON.parse(JSON.stringify(p.settings)),originalExModes:{...ex.excalidrawFileModes},layout:app.workspace.getLayout(),originalLeaf:app.workspace.activeLeaf,owners:{linkedDocumentLeaf:p.linkedDocumentLeaf,lastDocumentLeaf:p.lastDocumentLeaf,recentLeafHistory:[...p.recentLeafHistory],sidecarLeaves:new Map(p.sidecarLeaves)},leaves:[],wrappers:[],events:[],cases:[],done:false};
 /** Let native events settle without imposing product timing behavior. */
 const wait=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
 /** Fail with the captured native scenario evidence retained in the controller. */
 const check=(value,label)=>{if(!value)throw Error(label);};
 /** Await an observable native state under a finite cancellation-aware deadline. */
 const until=async(fn,label,timeout=20000)=>{const end=Date.now()+timeout;while(!fn()){if(c.cancelled||Date.now()>end)throw Error(label);await wait(25);}};
 /** Label only owned native leaves without serializing live host objects. */
 const id=leaf=>leaf===c.note?'note':leaf===c.sidecar?'sidecar':leaf===c.embeddedLeaf?'embedded':leaf===host?'graph':leaf?'other':null;
 /** Capture representation and command/focus ownership independently. */
 const snap=leaf=>({type:leaf?.getViewState().type,file:leaf?.getViewState().state?.file,mode:leaf?.getViewState().state?.mode,activeLeaf:id(app.workspace.activeLeaf),focus:document.activeElement?.className,hidden:document.hidden,focused:document.hasFocus()});
 /** Bound test-only event observations; production code receives no diagnostic API. */
 const emit=(name,detail)=>{if(c.events.length<1000)c.events.push({at:performance.now(),name,...detail});};
 /** Retain each completed scenario before starting the next native mutation. */
 const record=(name,detail)=>{c.cases.push({name,...detail});};
 /** Establish the actual native command target and foreground document. */
 const activate=async leaf=>{win.show();win.focus();wc.focus();app.workspace.setActiveLeaf(leaf,{focus:true});leaf.view.focus?.();await wait(80);};
 /** Reacquire the current rendered graph after each presentation update. */
 const root=()=>host.view.containerEl.querySelector('.kplex-app');
 /** Read the mounted embedded editor rather than retaining a retired DOM owner. */
 const editor=()=>root()?.querySelector('.kplex-central-editor-content');
 /** Locate the exact localized production control through its accessible name. */
 const button=key=>Array.from(editor()?.querySelectorAll('.kplex-central-editor-toolbar button')??[]).find(element=>element.getAttribute('aria-label')===p.translator(key));
 // CLI eval has Electron require but no plugin-module resolver for "obsidian". The real native
 // workspace leaf supplies the same prototype used by the embedded adapter's typed constructor.
 const nativePrototype=Object.getPrototypeOf(host);
 check(typeof nativePrototype.setViewState==='function','Native WorkspaceLeaf prototype unavailable');
 const originalSetViewState=nativePrototype.setViewState;
 nativePrototype.setViewState=function(...args){
  const owned=String(args[0]?.state?.file??this.getViewState()?.state?.file??'').startsWith(c.folder+'/');
  if(owned)emit('setViewState',{leaf:id(this),requested:args[0],before:snap(this)});
  const result=originalSetViewState.apply(this,args);
  result?.then(()=>{
   if(owned&&this.view.containerEl.closest('.kplex-central-editor-leaf-host'))c.embeddedLeaf=this;
   if(owned)emit('setViewState:done',{leaf:id(this),after:snap(this)});
  },error=>{if(owned)emit('setViewState:error',{error:String(error)});});
  return result;
 };
 c.wrappers.push(()=>{nativePrototype.setViewState=originalSetViewState;});
 const originalToggle=ex.ea.toggleViewMode;
 ex.ea.toggleViewMode=function(view,...args){emit('ea-toggle',{leaf:id(view?.leaf),type:view?.getViewType()});return originalToggle.call(this,view,...args);};
 c.wrappers.push(()=>{ex.ea.toggleViewMode=originalToggle;});
 for(const name of ['syncPageToDocumentLeaf','syncSidecarToPage']){
  const original=p[name];p[name]=function(...args){emit(name,{path:args[0]?.path??args[1]?.path});return original.apply(this,args);};
  c.wrappers.push(()=>{p[name]=original;});
 }
 const fileRef=app.workspace.on('file-open',file=>emit('file-open',{path:file?.path,active:snap(app.workspace.activeLeaf)}));
 /** Record trusted shortcut delivery separately from the resulting representation. */
 const keys=event=>{if(event.key===c.hotkeyKey||event.code===c.hotkeyKey)emit('trusted-key',{key:event.key,code:event.code,trusted:event.isTrusted,meta:event.metaKey,alt:event.altKey,shift:event.shiftKey,active:snap(app.workspace.activeLeaf)});};
 // The native document hotkey scope consumes command chords before later document observers.
 // Observe on the owning window's earlier capture phase without intercepting/default cancellation.
 window.addEventListener('keydown',keys,true);
 c.wrappers.push(()=>{app.workspace.offref(fileRef);window.removeEventListener('keydown',keys,true);});
 /** Observe native opens on one exact owned leaf and retain its original method for teardown. */
 const wrapLeaf=leaf=>{const original=leaf.openFile;leaf.openFile=function(...args){emit('openFile',{leaf:id(leaf),path:args[0]?.path,before:snap(leaf)});return original.apply(this,args);};c.wrappers.push(()=>{leaf.openFile=original;});};
 const commandId='obsidian-excalidraw-plugin:toggle-excalidraw-view';
 const originalHotkeys=app.hotkeyManager.getHotkeys(commandId);
 c.restoreHotkeys=async()=>{if(originalHotkeys===undefined)app.hotkeyManager.removeHotkeys(commandId);else app.hotkeyManager.setHotkeys(commandId,originalHotkeys);await app.hotkeyManager.save();};
 c.task=(async()=>{
  await app.vault.createFolder(c.folder);
  const created=await ex.createDrawing('Interaction-default.excalidraw.md',c.folder);
  c.file=typeof created==='string'?app.vault.getFileByPath(created):created;
  check(c.file?.path.startsWith(c.folder+'/'),'Excalidraw returned a non-owned file');
  c.other=await app.vault.create(c.folder+'/Ordinary.md','# Ordinary fixture\n');
  /** Change only the owned fixture frontmatter and await authoritative cache observation. */
  const setFlag=async flag=>{
   await app.fileManager.processFrontMatter(c.file,fm=>{if(flag===undefined)delete fm['excalidraw-open-md'];else fm['excalidraw-open-md']=flag;});
   await until(()=>app.metadataCache.getFileCache(c.file)?.frontmatter?.['excalidraw-plugin']&&app.metadataCache.getFileCache(c.file)?.frontmatter?.['excalidraw-open-md']===flag,'Metadata flag did not settle');
   p.index.insertCreatedFile(c.file);await p.index.publishHostMetadataPreview(c.file.path);
  };
  await setFlag(true);p.index.insertCreatedFile(c.other);await p.index.publishHostMetadataPreview(c.other.path);
  c.hotkeyKey=['F8','F7','F6','F10'].find(key=>!Object.keys(app.commands.commands).some(command=>command!==commandId&&(app.hotkeyManager.getHotkeys(command)??[]).some(binding=>binding.key===key&&['Alt','Mod','Shift'].every(modifier=>binding.modifiers.includes(modifier))&&binding.modifiers.length===3)));
  check(c.hotkeyKey,'No unused bounded native shortcut fixture chord');
  app.hotkeyManager.setHotkeys(commandId,[{modifiers:['Mod','Alt','Shift'],key:c.hotkeyKey}]);await app.hotkeyManager.save();
  await activate(host);c.note=app.workspace.getLeaf('split');c.leaves.push(c.note);wrapLeaf(c.note);
  p.settings.embedCentralNode=false;p.index.notify();
  for(const mode of ['off','recent','pinned','sidecar']){
   await p.setDocumentSyncMode('off');await c.note.openFile(c.file,{active:false});await activate(c.note);
   if(mode==='sidecar'){
    await p.openSidecar(host,p.index.get(c.file.path));c.sidecar=p.sidecarLeaves.get(host);
    check(c.sidecar,'Managed Sidecar missing');c.leaves.push(c.sidecar);wrapLeaf(c.sidecar);
   }else{p.lastDocumentLeaf=c.note;await p.setDocumentSyncMode(mode,p.index.get(c.file.path));}
   const leaf=mode==='sidecar'?c.sidecar:c.note;
   for(const action of ['canonical-toggle','native-command','trusted-shortcut']){
    // Establish the original report's Markdown representation before each independent path.
    if(leaf.getViewState().type==='excalidraw')await ex.ea.toggleViewMode(leaf.view);
    await until(()=>leaf.getViewState().type==='markdown','Failed Markdown precondition');await activate(leaf);
    const start=c.events.length,before=snap(leaf);let returned,accepted;
    if(action==='canonical-toggle')returned=(await ex.ea.toggleViewMode(leaf.view))?.getViewType();
    if(action==='native-command')accepted=app.commands.executeCommandById(commandId);
    if(action==='trusted-shortcut'){
     wc.sendInputEvent({type:'keyDown',keyCode:c.hotkeyKey,modifiers:['meta','alt','shift']});await wait(35);
     wc.sendInputEvent({type:'keyUp',keyCode:c.hotkeyKey,modifiers:['meta','alt','shift']});
    }
    await until(()=>leaf.getViewState().type==='excalidraw'&&leaf.view.excalidrawAPI,'Toggle did not enter mounted native drawing: '+mode+'/'+action);await wait(600);
    const settled=snap(leaf),events=c.events.slice(start);
    check(settled.type==='excalidraw'&&settled.file===c.file.path,'Representation reset: '+mode+'/'+action);
    check(app.workspace.activeLeaf===leaf,'Command ownership changed: '+mode+'/'+action);
    check(events.filter(event=>event.name==='openFile'&&event.leaf===id(leaf)).length===0,'Passive follow reopened originating destination');
    if(action==='trusted-shortcut')check(events.some(event=>event.name==='trusted-key'&&event.trusted)&&events.some(event=>event.name==='ea-toggle'&&event.leaf===id(leaf)),'Trusted shortcut did not target exact native leaf');
    record(mode+'/'+action,{before,settled,returned,accepted,events});
   }
   if(mode==='sidecar'){await p.closeSidecar(host,false);c.sidecar=null;}
  }
  // An observed originating file must still propagate into another, genuinely different companion.
  await p.setDocumentSyncMode('off');await p.openSidecar(host,p.index.get(c.other.path));
  c.sidecar=p.sidecarLeaves.get(host);c.leaves.push(c.sidecar);wrapLeaf(c.sidecar);
  p.settings.sidecarMarkdownMode='preview';
  p.settings.documentSyncMode='recent';p.linkedDocumentLeaf=null;p.lastDocumentLeaf=c.note;
  await c.note.setViewState({type:'markdown',state:{file:c.file.path,mode:'source'},active:false},{focus:false});
  await until(()=>c.note.getViewState().type==='markdown','Different-file origin Markdown precondition');await activate(c.note);
  await ex.ea.toggleViewMode(c.note.view);await until(()=>c.note.getViewState().type==='excalidraw','Different-file origin drawing missing');
  await until(()=>c.sidecar.getViewState().state?.file===c.file.path,'Different-file companion did not follow');await wait(350);
  check(c.note.getViewState().type==='excalidraw','Different-file companion update reset originating drawing');
  check(c.sidecar.getViewState().type==='markdown'&&c.sidecar.getViewState().state?.mode==='preview','Different-file companion lost configured Markdown mode');
  record('different-file-companion',{origin:snap(c.note),sidecar:snap(c.sidecar)});
  // Explicit provenance inspection must retain its source representation and requested location.
  await p.openMarkdownInSidecar(host,c.other,1,true);await wait(200);
  check(c.sidecar.getViewState().type==='markdown'&&c.sidecar.getViewState().state?.file===c.other.path&&c.sidecar.getViewState().state?.mode==='source','Explicit source inspection contract lost');
  check(c.sidecar.view.editor?.getCursor?.().line===1,'Explicit source inspection did not apply requested line');
  record('explicit-source-inspection',{sidecar:snap(c.sidecar),line:c.sidecar.view.editor?.getCursor?.().line});
  await p.closeSidecar(host,false);c.sidecar=null;await p.setDocumentSyncMode('off');
  // Fresh editor sessions exercise both initial Markdown modes, not a settings edit on an old session.
  /** Navigate through the production graph signal and await its actual embedded native destination. */
  const go=async file=>{
   await activate(host);p.notifyNavigation(file.path);
   await until(()=>root()?.querySelector('.kplex-role-center')?.getAttribute('data-kplex-path')===file.path,'Plex center did not navigate');
   await until(()=>c.embeddedLeaf?.getViewState().state?.file===file.path&&editor()&&!editor().querySelector('.kplex-central-editor-status'),'Embedded editor did not settle');
  };
  /** Dispose the preceding session so initial defaults are evaluated from fresh metadata. */
  const fresh=async(mode,flag)=>{
   p.settings.embedCentralNode=false;p.index.notify();await until(()=>!editor(),'Previous embedded editor did not dispose');c.embeddedLeaf=null;
   p.settings.centralNodeMarkdownMode=mode;await setFlag(flag);p.settings.embedCentralNode=true;p.index.notify();await go(c.file);
   await wait(250);return snap(c.embeddedLeaf);
  };
  for(const mode of ['source','preview']){
   const initial=await fresh(mode,true);
   check(initial.type==='markdown'&&initial.mode===mode,'Initial embedded Markdown preference/mode failed: '+mode);
   check(button('centralEditor.showDrawing'),'Marked Markdown lost explicit drawing capability');
   button('centralEditor.showDrawing').click();await until(()=>c.embeddedLeaf.getViewState().type==='excalidraw'&&c.embeddedLeaf.view.excalidrawAPI&&button('centralEditor.showMarkdown'),'Explicit embedded drawing toggle failed');await wait(500);
   check(c.embeddedLeaf.getViewState().type==='excalidraw','Initial preference forced back after explicit drawing toggle');
   const drawing=snap(c.embeddedLeaf);button('centralEditor.showMarkdown').click();
   // Native representation notification precedes the adapter's awaited source/preview restoration.
   await until(()=>c.embeddedLeaf.getViewState().type==='markdown'&&c.embeddedLeaf.getViewState().state.mode===mode&&button('centralEditor.showDrawing'),'Explicit embedded Markdown toggle/mode did not settle');
   check(c.embeddedLeaf.getViewState().state.mode===mode,'Embedded toggle lost source/preview mode');
   await go(c.other);check(c.embeddedLeaf.getViewState().type==='markdown'&&!button('centralEditor.showDrawing')&&!button('centralEditor.showMarkdown'),'Ordinary Markdown exposed drawing toggle');
   await go(c.file);check(c.embeddedLeaf.getViewState().type==='markdown'&&c.embeddedLeaf.getViewState().state.mode===mode,'Navigation back failed to reapply initial Markdown preference');
   record('embedded-flag-true/'+mode,{initial,drawing,reopened:snap(c.embeddedLeaf),ordinaryHasDrawingToggle:false});
  }
  for(const flag of [false,undefined]){
   const initial=await fresh('preview',flag);
   await until(()=>c.embeddedLeaf?.view.excalidrawAPI,'Default drawing did not mount its native API');
   check(initial.type==='excalidraw'&&button('centralEditor.showMarkdown'),'Flag false/missing lost drawing default');
   record('embedded-drawing-default/'+String(flag),{initial});
  }
  p.settings.embedCentralNode=false;p.index.notify();await until(()=>!editor(),'Final embedded teardown did not complete');
  return {cases:c.cases,events:c.events,folder:c.folder,metadata:app.metadataCache.getFileCache(c.file).frontmatter,hotkey:{key:c.hotkeyKey,modifiers:['Mod','Alt','Shift']},foreground:{hidden:document.hidden,focused:document.hasFocus()}};
 })().then(value=>{c.value=value;c.done=true;},error=>{c.error=String(error);c.done=true;});
 return JSON.stringify({started:true,folder:c.folder});
}

let started=false,attempted=false;
try{
 if(cli('vault','info=path')!==vault)throw Error('Wrong disposable vault');
 for(const name of ['main.js','styles.css','manifest.json']){
  const built=sha(readFileSync(`${root}/dist/${name}`)),installed=sha(readFileSync(`${config}/plugins/k-plex/${name}`));
  report.artifacts[name]={built,installed};if(built!==installed)throw Error('Installed/build hash mismatch: '+name);
 }
 report.obsidian=cli('version');cli('dev:errors','clear');attempted=true;report.start=evaluate(`(${probe.toString()})()`);started=true;
 const end=Date.now()+240000;
 while(true){await delay(300);const state=evaluate('JSON.stringify({done:window.__kplexInteractionFinal?.done,error:window.__kplexInteractionFinal?.error})');
  if(state.done){report.result=evaluate('JSON.stringify(window.__kplexInteractionFinal.value??{error:window.__kplexInteractionFinal.error,cases:window.__kplexInteractionFinal.cases,events:window.__kplexInteractionFinal.events})');if(state.error)throw Error(state.error);break;}
  if(Date.now()>end)throw Error('Native acceptance deadline');
 }
 const errors=cli('dev:errors');if(errors&&!/^No errors captured\.?$/i.test(errors))throw Error('Native JavaScript errors: '+errors.slice(0,1000));
 report.nativeErrorsClear=true;report.status='passed';
}catch(error){report.status='failed';report.error=String(error);}
finally{
 if(attempted&&!started){try{started=evaluate('JSON.stringify(Boolean(window.__kplexInteractionFinal))');}catch(error){report.cleanupError='Unable to inspect partial controller: '+String(error);}}
 const cleanupErrors=[];
 if(started){try{
  evaluate(`(()=>{const c=window.__kplexInteractionFinal;c.cancelled=true;c.cleanup=(async()=>{
   const errors=[],steps=[];
   /** Attempt every owned resource even when an earlier teardown fails. */
   const attempt=async(name,work)=>{try{await work();steps.push({name,status:'passed'});}catch(error){errors.push({name,error:String(error)});steps.push({name,status:'failed'});}};
   await attempt('finish-probe-task',async()=>{await c.task;});
   for(const [index,undo] of c.wrappers.reverse().entries())await attempt('native-wrapper-'+index,undo);
   await attempt('native-shortcut',async()=>{await c.restoreHotkeys?.();});
   await attempt('embedded-editor-disposal',async()=>{c.p.settings.embedCentralNode=false;c.p.index.notify();await new Promise(resolve=>window.setTimeout(resolve,100));});
   for(const [index,leaf] of [...new Set(c.leaves)].reverse().entries())await attempt('owned-leaf-'+index,()=>{if(leaf?.view.containerEl.isConnected)leaf.detach();});
   await attempt('Excalidraw-representation-memory',()=>{for(const key of Object.keys(c.ex.excalidrawFileModes))if(!Object.hasOwn(c.originalExModes,key))delete c.ex.excalidrawFileModes[key];Object.assign(c.ex.excalidrawFileModes,c.originalExModes);});
   await attempt('fixture-folder',async()=>{const folder=app.vault.getFolderByPath(c.folder);if(folder)await app.vault.delete(folder,true);});
   await attempt('settings-before-layout',async()=>{Object.assign(c.p.settings,c.originalSettings);await c.p.saveSettings(false,false);await c.p.settingsWriteQueue;});
   await attempt('workspace-layout',async()=>{await app.workspace.changeLayout(c.layout);});
   await attempt('settings-after-layout',async()=>{Object.assign(c.p.settings,c.originalSettings);await c.p.saveSettings(false,false);await c.p.settingsWriteQueue;});
   await attempt('native-leaf-associations',()=>{
    // Workspace restoration may replace leaves. Rebind original associations by serialized native id.
    /** Restore original associations by native serialized id after layout replaces leaf objects. */
    const rebind=old=>old?app.workspace.getLeavesOfType(old.getViewState().type).find(leaf=>leaf.id===old.id)??null:null;
    c.p.linkedDocumentLeaf=rebind(c.owners.linkedDocumentLeaf);c.p.lastDocumentLeaf=rebind(c.owners.lastDocumentLeaf);
    c.p.recentLeafHistory=c.owners.recentLeafHistory.map(rebind).filter(Boolean);c.p.sidecarLeaves.clear();
    for(const [oldHost,oldLeaf] of c.owners.sidecarLeaves){const host=rebind(oldHost),leaf=rebind(oldLeaf);if(host&&leaf)c.p.sidecarLeaves.set(host,leaf);}
    c.p.index.notify();
   });
   const result={errors,steps,nativeWrappersRemoved:steps.filter(step=>step.name.startsWith('native-wrapper-')).every(step=>step.status==='passed')};
   await attempt('cleanup-assertions',()=>{result.folderRemoved=!app.vault.getFolderByPath(c.folder);result.remainingOwnedWorkspaceLeaves=app.workspace.getLeavesOfType('markdown').concat(app.workspace.getLeavesOfType('excalidraw')).filter(leaf=>String(leaf.getViewState().state?.file??'').startsWith(c.folder+'/')).length;result.restoredSettings=JSON.stringify(c.p.settings)===JSON.stringify(c.originalSettings);});
   return result;
  })().then(value=>{c.cleaned=value;},error=>{c.cleanupError=String(error);});return JSON.stringify({cleanupStarted:true});})()`);
  const end=Date.now()+90000;
  while(true){await delay(300);const state=evaluate('JSON.stringify({cleaned:window.__kplexInteractionFinal?.cleaned,error:window.__kplexInteractionFinal?.cleanupError})');if(state.error)throw Error(state.error);if(state.cleaned){report.cleanup=state.cleaned;break;}if(Date.now()>end)throw Error('Cleanup deadline');}
  for(const error of report.cleanup.errors)cleanupErrors.push(`${error.name}: ${error.error}`);
  if(!report.cleanup.folderRemoved||report.cleanup.remainingOwnedWorkspaceLeaves!==0||!report.cleanup.restoredSettings||!report.cleanup.nativeWrappersRemoved)cleanupErrors.push('Native cleanup assertions failed');
  try{evaluate('(()=>{delete window.__kplexInteractionFinal;return JSON.stringify({removed:true});})()');}catch(error){cleanupErrors.push('controller removal: '+String(error));}
 }catch(error){cleanupErrors.push('native cleanup: '+String(error));}}
 // Byte restoration is independent of native teardown success; attempt every configuration file.
 if(attempted){for(const backup of backups){try{const path=`${config}/${backup.name}`;if(backup.bytes===null){if(existsSync(path))rmSync(path);}else writeFileSync(path,backup.bytes);if(backup.bytes===null?existsSync(path):!readFileSync(path).equals(backup.bytes))throw Error('Bytes differ');}catch(error){cleanupErrors.push(`configuration ${backup.name}: ${String(error)}`);}}report.configurationRestored=!cleanupErrors.some(error=>error.startsWith('configuration '));}
 if(cleanupErrors.length){report.cleanupError=cleanupErrors.join('\n');report.status='failed';}
 report.completedAt=new Date().toISOString();writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));
}
console.log(JSON.stringify({status:report.status,error:report.error,cleanupError:report.cleanupError,cases:report.result?.cases?.map(value=>({name:value.name,type:value.settled?.type??value.initial?.type})),report:`${out}/report.json`}));
if(report.status!=='passed')process.exitCode=1;
