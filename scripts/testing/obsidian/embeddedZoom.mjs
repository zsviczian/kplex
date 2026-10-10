/**
 * Serial reproduction-first native measurements for embedded Excalidraw zoom policy.
 * Owns test-scoped fixture files, path-free native call observations, measured viewport matching
 * and restoration. Requires the explicit disposable small vault, an unlocked foreground Mac and
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
// Only these two plugin settings files are mutated; enablement and native hotkeys are untouched.
const names=['plugins/k-plex/data.json','plugins/obsidian-excalidraw-plugin/data.json'];
const backups=names.map(/** Snapshot only settings files this driver can mutate for independent byte restoration. */ name=>({name,bytes:existsSync(`${config}/${name}`)?readFileSync(`${config}/${name}`):null}));
const gitHead=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'});assert.equal(gitHead.status,0,'Read native receipt Git provenance');
const report={startedAt:new Date().toISOString(),base:gitHead.stdout.trim(),driverSha256:sha(driver),vault:vaultName,scope:'reproduction-first native Excalidraw viewport/zoom comparison',limits:['Electron trusted input is not physical keyboard or Windows acceptance','Bounded settlement/DOM checks do not establish actual paint latency','Embedded leaf capture is temporary native-call observation, not a production diagnostic API'],artifacts:{}};
/** Invoke one bounded CLI operation and retain only a safe command label, timing and outcome. */
function invoke(label,command,args,deadline=Infinity){
 const started=Date.now(),remaining=deadline-started;if(remaining<=0)throw Error(label+' exceeded its existing deadline');
 const run=spawnSync(process.env.KPLEX_OBSIDIAN_CLI??'obsidian',[`vault=${vaultName}`,command,...args],{cwd:root,encoding:'utf8',timeout:Math.min(30000,remaining),killSignal:'SIGKILL',maxBuffer:8*1024*1024});
 const elapsedMs=Date.now()-started,code=run.error?.code??(run.status!==0?'nonzero-exit':/^Error:/m.test(run.stdout)?'host-error':'success');
 const calls=report.cliCalls??(report.cliCalls=[]);if(calls.length<256)calls.push({label,command,elapsedMs,code,exitCode:run.status??null});
 if(code!=='success'){const error=new Error(`${label} (${command}) failed after ${elapsedMs} ms: ${code}`);error.code=code;throw error;}
 return run.stdout.trim();
}
/** Run a named native CLI command without retaining arguments or stdout in timing diagnostics. */
function cli(command,...args){return invoke(command,command,args);}
/** Decode one native JSON result; the label identifies its purpose without retaining eval source. */
function evaluate(code,label='native-eval',deadline=Infinity){return JSON.parse(invoke(label,'eval',[`code=${code}`],deadline).replace(/^=>\s*/,''));}
/** Retry only lost read-only state/result responses under the caller's original deadline. */
async function readState(code,label,deadline){
 for(let attempt=0;attempt<3;attempt++){
  try{return evaluate(code,label,deadline);}catch(error){if(error.code!=='ETIMEDOUT'||attempt===2||Date.now()>=deadline)throw error;report.cliTimeouts=(report.cliTimeouts??0)+1;await delay(Math.min(250,Math.max(0,deadline-Date.now())));}
 }
}
/** Yield between bounded native controller reads without blocking the renderer. */
const delay=ms=>new Promise(/** Yield between serial CLI reads without blocking native rendering. */ resolve=>setTimeout(resolve,ms));

/** Install an owned, bounded fixture/controller and begin its asynchronous native scenarios. */
function probe(expectNativePolicy=false){
 if(window.__kplexInteractionFinal)throw Error('Existing owned native controller');
 const p=app.plugins.plugins['k-plex'],ex=app.plugins.plugins['obsidian-excalidraw-plugin'];
 const remote=require('@electron/remote');
 const win=remote.BrowserWindow.getAllWindows().find(/** Select only the explicitly authorized disposable-vault window. */ item=>item.getTitle().includes('kplex-test-small')),wc=win?.webContents;
 if(!win||remote.powerMonitor.getSystemIdleState(10)==='locked')throw Error('Native test window unavailable or locked');
 if(app.setting.isOpen||document.querySelector('.modal-container'))throw Error('Existing modal');
 const host=app.workspace.getLeavesOfType('k-plex-react-view').find(/** Acquire the visible real K-Plex host rather than a synthetic or hidden native leaf. */ leaf=>leaf.view.containerEl.isShown());
 if(!p||!host||!ex?.createDrawing||!ex.ea?.getAPI||typeof p.createNewFileInFolder!=='function')throw Error('Native prerequisites unavailable');
 const c=window.__kplexInteractionFinal={p,ex,host,folder:`Kplex-Zoom-${Date.now()}`,originalSettings:JSON.parse(JSON.stringify(p.settings)),originalExSettings:JSON.parse(JSON.stringify(ex.settings)),originalExModes:{...ex.excalidrawFileModes},layout:app.workspace.getLayout(),originalLeaf:app.workspace.activeLeaf,originalBounds:win.getBounds(),originalSidebarStates:{left:app.workspace.leftSplit.collapsed,right:app.workspace.rightSplit.collapsed},owners:{linkedDocumentLeaf:p.linkedDocumentLeaf,lastDocumentLeaf:p.lastDocumentLeaf,recentLeafHistory:[...p.recentLeafHistory],sidecarLeaves:new Map(p.sidecarLeaves)},leaves:[],wrappers:[],events:[],cases:[],done:false,ownedFiles:new Set(),phase:'setup',styles:[],fixtureBytes:new Map(),timers:new Set(),retiredViews:new Set()};
 /** Reject additional probe work after outer cleanup has retired this controller's lifetime. */
 const ensureActive=()=>{if(c.cancelled)throw Error('Owned zoom probe cancelled');};
 /** Yield within the bounded probe, retiring its timer before checking cancellation on resume. */
 const wait=async ms=>{ensureActive();await new Promise(/** Track the exact test-owned timer until its single completion. */ resolve=>{const timer=window.setTimeout(/** Release timer ownership before resuming the probe. */ ()=>{c.timers.delete(timer);resolve();},ms);c.timers.add(timer);});ensureActive();};
 /** Retain an actionable finite failure rather than a passing incomplete comparison. */
 const check=(value,label)=>{if(!value)throw Error(label);};
 /** Await exact observable view/API state without manufacturing native readiness. */
 const until=async(fn,label,timeout=15000)=>{ensureActive();const end=Date.now()+timeout;while(!fn()){if(Date.now()>end)throw Error(label);await wait(25);}ensureActive();};
 /** Record path-free finite scene facts and actual viewport/ancestor geometry. */
 const snap=leaf=>{
  const view=leaf?.view,api=view?.excalidrawAPI,state=api?.getAppState(),root=view?.excalidrawContainer??view?.containerEl.querySelector('.excalidraw'),canvas=root?.querySelector('canvas');
  const elements=api?.getSceneElements()?.filter(/** Measure only the currently rendered native scene elements. */ element=>!element.isDeleted)??[];
  const bounds=elements.length?[Math.min(...elements.map(/** Extract the synthetic scene’s left coordinate without its text or identity. */ e=>e.x)),Math.min(...elements.map(/** Extract the synthetic scene’s top coordinate without its text or identity. */ e=>e.y)),Math.max(...elements.map(/** Extract the synthetic scene’s right extent for comparable fit bounds. */ e=>e.x+e.width)),Math.max(...elements.map(/** Extract the synthetic scene’s bottom extent for comparable fit bounds. */ e=>e.y+e.height))]:null;
  const ancestors=[];for(let node=root,i=0;node&&i<10;node=node.parentElement,i++){const style=node.ownerDocument.defaultView.getComputedStyle(node);if(style.transform!=='none'||style.zoom!=='1')ancestors.push({depth:i,transform:style.transform,zoom:style.zoom});}
  const rect=canvas?.getBoundingClientRect(),viewRect=root?.getBoundingClientRect();
  return {phase:c.phase,at:performance.now(),owner:leaf===c.embeddedLeaf?'embedded':leaf===c.note?'native':'other',type:view?.getViewType(),apiReady:Boolean(api),fileLoaded:view?.isLoaded??null,canvasLoading:state?.isLoading??null,zoom:state?.zoom?.value??null,scrollX:state?.scrollX??null,scrollY:state?.scrollY??null,width:state?.width??null,height:state?.height??null,rootRect:viewRect?{width:viewRect.width,height:viewRect.height}:null,canvas:rect?{width:rect.width,height:rect.height,clientWidth:canvas.clientWidth,clientHeight:canvas.clientHeight,backingWidth:canvas.width,backingHeight:canvas.height}:null,dpr:root?.ownerDocument.defaultView.devicePixelRatio??null,ancestors,count:elements.length,bounds,grid:{size:state?.gridSize??null,step:state?.gridStep??null,enabled:state?.gridModeEnabled??null},strokeWidth:state?.currentItemStrokeWidth??null,pendingFit:view?.pendingOpenZoomToFit??null,justLoaded:view?.semaphores?.justLoaded??null,preventAutozoom:view?.semaphores?.preventAutozoom??null,fitPreferences:{open:ex.settings.zoomToFitOnOpen,resize:ex.settings.zoomToFitOnResize,max:ex.settings.zoomToFitMaxLevel},embeddedPolicy:{enabled:p.settings.excalidrawFitOnNodeOpen,maximized:Boolean(view?.containerEl.closest('.kplex-central-editor-overlay.is-maximized')),nativeFullscreen:Boolean(view?.containerEl.closest('.excalidraw-visible'))},recognizedSameFileLeaves:app.workspace.getLeavesOfType('excalidraw').concat(app.workspace.getLeavesOfType('markdown')).filter(/** Count normal workspace owners of this exact native file identity. */ item=>item.view.file===view?.file).length,savedZoom:view?.excalidrawData?.scene?.appState?.zoom?.value??null};
 };
 /** Bound owned event observations; do not retain raw native arguments or error messages. */
 const emit=(name,detail)=>{if(c.events.length<512)c.events.push({name,phase:c.phase,at:performance.now(),...detail});};
 /** Restrict every temporary method observation to disposable fixture leaves/files. */
 const owned=leaf=>c.ownedFiles.has(leaf?.view?.file?.path)||c.ownedFiles.has(leaf?.getViewState()?.state?.file);
 /** Wrap one method reversibly, preserving invocation and return behavior. */
 const wrap=(object,name,observe)=>{const original=object[name];if(typeof original!=='function')return;object[name]=/** Observe the original receiver without substituting its native return or Promise. */ function(...args){observe(this,args);return original.apply(this,args);};c.wrappers.push(/** Restore the exact method this controller temporarily observed. */ ()=>{object[name]=original;});};
 const prototype=Object.getPrototypeOf(host);
 const originalState=prototype.setViewState;let requestSequence=0;
 /** Observe only owned requests and their real Promise completion without replacing the result. */
 prototype.setViewState=function(...args){
  const isOwned=c.ownedFiles.has(args[0]?.state?.file),requestId=++requestSequence,requestedMode=args[0]?.state?.mode??null;
  if(isOwned){if(this.containerEl.closest('.kplex-central-editor-leaf-host'))c.embeddedLeaf=this;emit('open-request',{requestId,owner:this===c.embeddedLeaf?'embedded':'native',requestedType:args[0]?.type,requestedFit:args[0]?.state?.zoomToFit??null,requestedMode});}
  const result=originalState.apply(this,args);
  result?.then(/** Capture completion only while the observing controller remains live. */ ()=>{if(isOwned&&!c.cancelled)emit('open-complete',{requestId,requestedMode,type:this.getViewState().type,mode:this.getViewState().state?.mode??null});},/** Retain a finite failure code while preserving the caller's rejected Promise. */ ()=>{if(isOwned&&!c.cancelled)emit('open-failure',{requestId});});
  return result;
 };
 c.wrappers.push(/** Retire the native request observer before restoring the workspace. */ ()=>{prototype.setViewState=originalState;});
 /** Reveal the owned real host before a production local toolbar gesture. */
 const activateHost=async()=>{win.show();win.focus();wc.focus();app.workspace.setActiveLeaf(host,{focus:true});host.view.focus?.();await wait(80);};
 /** Finish native owned drawing persistence before retiring its real/synthetic leaf. */
 const flush=async leaf=>{ensureActive();const view=leaf?.view;if(view?.excalidrawAPI&&typeof view.forceSave==='function'){await view.forceSave(true,true);await until(/** Prove no queued native persistence can overwrite the next baseline input. */ ()=>!view.isSaveInProgress(),'Owned native save did not finish');}};
 /** Await native teardown before restoring the same fixture bytes for another opening. */
 const retireNativeLeaf=async leaf=>{const view=leaf.view;c.retiredViews.add(view);await flush(leaf);leaf.detach();await until(/** Observe upstream close relinquishing its canvas API before reusing the file. */ ()=>!view.excalidrawAPI,'Owned native view did not retire');};
 /** Restore only disposable fixture content, and prove the native Vault cache observes its bytes. */
 const restoreFixture=async file=>{const bytes=c.fixtureBytes.get(file.path);if(bytes===undefined)return;await app.vault.modify(file,bytes);const observed=await app.vault.cachedRead(file);check(observed===bytes,'Owned drawing baseline was not restored');};
 /** Find the current owned editor after each React/native replacement. */
 const editor=()=>host.view.containerEl.querySelector('.kplex-central-editor-content');
 /** Use the actual localized production control for size and representation actions. */
 const button=key=>Array.from(editor()?.querySelectorAll('.kplex-central-editor-toolbar button')??[]).find(/** Resolve the requested production toolbar action in the active language. */ element=>element.getAttribute('aria-label')===p.translator(key));
 /** Capture the earliest observable API and a finite settled sample; neither claims paint. */
 const ready=async(leaf,label)=>{await until(/** Require an actual API bound to an owned disposable file. */ ()=>leaf?.view?.excalidrawAPI&&leaf.view.file&&owned(leaf),label+' API unavailable');const first=snap(leaf);await until(/** API attachment and justLoaded=false can precede asynchronous file loading; require the native load-completion flag before scene mutation or measurement. */ ()=>leaf.view.isLoaded===true&&!leaf.view.semaphores?.justLoaded&&leaf.view.excalidrawAPI.getAppState().isLoading!==true&&leaf.view.excalidrawAPI.getAppState().width>0&&leaf.view.excalidrawAPI.getAppState().height>0,label+' first complete unavailable');const complete=snap(leaf);await wait(500);return{first,complete,settled:snap(leaf)};};
 /** Dispose an embedded session to avoid hidden same-file leaves biasing native fit policy. */
 const disable=async()=>{const view=c.embeddedLeaf?.view,hadDrawing=Boolean(view?.excalidrawAPI);if(view)c.retiredViews.add(view);await flush(c.embeddedLeaf);p.settings.embedCentralNode=false;p.index.notify();await until(/** Await real React/native editor disposal before another owner opens the same file. */ ()=>!editor(),'Embedded teardown failed');if(hadDrawing)await until(/** Observe upstream close relinquishing its canvas API before reusing the file. */ ()=>!view.excalidrawAPI,'Embedded native view did not retire');c.embeddedLeaf=null;};
 /** Open through K-Plex's current real center-editor routing, with no extra fit invocation. */
 const embedded=async(file,label)=>{await disable();if(c.note?.view.containerEl.isConnected){await retireNativeLeaf(c.note);}c.note=null;await wait(100);await restoreFixture(file);await activateHost();c.phase=label;p.settings.centralNodeMarkdownMode='source';p.settings.embedCentralNode=true;p.notifyNavigation(file.path);p.index.notify();await until(/** Require the actual center editor to own the exact requested fixture identity. */ ()=>c.embeddedLeaf?.view.file===file&&editor(),'Embedded destination unavailable');return ready(c.embeddedLeaf,label);};
 /** Hold the native real leaf to the observed embedded viewport; assert actual API pixels. */
 const native=async(file,target,label)=>{
  await disable();await wait(100);await restoreFixture(file);c.phase=label;c.note=app.workspace.getLeaf('split');c.leaves.push(c.note);const el=c.note.containerEl;c.styles.push({el,value:el.getAttribute('style')});
  el.setCssStyles({width:`${target.width}px`,height:`${target.height+40}px`,flex:'0 0 auto',position:'absolute',left:'0px',top:'0px',maxWidth:'none',maxHeight:'none'});
  await c.note.openFile(file,{active:false});await ready(c.note,label+'-sizing');
  // Seek exact API pixels within the existing finite correction budget. Chromium layout can
  // retain a subpixel residual; the final gate still reports the actual measured dimensions.
  for(let i=0;i<4;i++){const actual=snap(c.note),rect=el.getBoundingClientRect();if(actual.width===target.width&&actual.height===target.height)break;el.setCssStyles({width:`${rect.width+target.width-actual.width}px`,height:`${rect.height+target.height-actual.height}px`});c.note.view.onResize?.();await wait(150);}
  const sizing=snap(c.note);check(Math.abs(sizing.width-target.width)<1&&Math.abs(sizing.height-target.height)<1,'Cannot match actual native viewport');
  // Reopen from a different owned file after fitting the physical leaf so first-ready is matched.
  await flush(c.note);await c.note.setViewState({type:'markdown',state:{file:c.other.path,mode:'source'},active:false},{focus:false});
  await wait(100);await restoreFixture(file);
  await c.note.setViewState({type:'excalidraw',state:{file:file.path,mode:'edit'},active:false},{focus:false});
  return ready(c.note,label);
 };
 /** Own sequential native mutations; every awaited probe yield fences cancellation. */
 c.task=(async()=>{
  win.show();win.focus();wc.focus();await p.setDocumentSyncMode('off');await app.vault.createFolder(c.folder);
  c.other=await app.vault.create(c.folder+'/Ordinary.md','# Disposable zoom fixture\n');c.ownedFiles.add(c.other.path);p.index.insertCreatedFile(c.other);await p.index.publishHostMetadataPreview(c.other.path);
  // This invokes the actual K-Plex creation owner used by its related-note drawing action.
  c.blank=await p.createNewFileInFolder('Embedded-created','excalidraw',c.folder);check(c.blank,'K-Plex drawing creation failed');
  const nativeCreated=await ex.createDrawing('Native-created.excalidraw.md',c.folder),populatedCreated=await ex.createDrawing('Populated.excalidraw.md',c.folder);
  c.nativeBlank=typeof nativeCreated==='string'?app.vault.getFileByPath(nativeCreated):nativeCreated;
  c.populated=typeof populatedCreated==='string'?app.vault.getFileByPath(populatedCreated):populatedCreated;
  for(const file of [c.blank,c.nativeBlank,c.populated]){check(file?.path.startsWith(c.folder+'/'),'Non-owned drawing');c.ownedFiles.add(file.path);p.index.insertCreatedFile(file);await p.index.publishHostMetadataPreview(file.path);}
  // Native generation, persistence and API geometry provide one populated fixture to both routes.
  c.note=app.workspace.getLeaf('split');c.leaves.push(c.note);await c.note.openFile(c.populated,{active:false});await ready(c.note,'fixture-generation');
  const viewPrototype=Object.getPrototypeOf(c.note.view);
  wrap(viewPrototype,'zoomToFit',/** Retain only bounded fit-policy arguments and owned viewport facts. */ (view,args)=>{if(owned(view.leaf))emit('native-fit',{delay:args[0]??true,justLoaded:args[1]??false,before:snap(view.leaf)});});
  wrap(viewPrototype,'onResize',/** Attribute native geometry notifications without changing resize behavior. */ (view)=>{if(owned(view.leaf))emit('native-resize',{before:snap(view.leaf)});});
  const eaPrototype=Object.getPrototypeOf(ex.ea);
  for(const name of ['viewZoomToFit','viewZoomToElements'])wrap(eaPrototype,name,/** Distinguish K-Plex-issued Automate fits from native first-render fits. */ (ea)=>{if(owned(ea.targetView?.leaf))emit('ea-fit',{method:name,before:snap(ea.targetView.leaf)});});
  const ea=ex.ea.getAPI(c.note.view);check(ea?.addRect&&ea.addText&&ea.addElementsToView,'Scene construction API unavailable');
  c.phase='fixture-generation';c.fixturePrerequisites={};
  try{
   ea.addRect(0,0,800,500);ea.addText(80,80,'Disposable zoom comparison');
   // Saving inside insertion can capture the old canvas before its scene update is acknowledged.
   // Use the real API without saving, then prove the actual scene before the native forced write.
   check(await ea.addElementsToView(false,false),'Scene insertion failed');
   await until(/** Require exactly the synthetic scene geometry before persisting it. */ ()=>{const value=snap(c.note);return value.count===2&&JSON.stringify(value.bounds)==='[0,0,800,500]';},'Owned populated scene insertion was not acknowledged');
   c.fixturePrerequisites.afterInsertion=snap(c.note);
   c.note.view.excalidrawAPI.updateScene({appState:{zoom:{value:0.55},scrollX:0,scrollY:0}});
   await until(/** Require the real saved-input zoom to reach the API instead of assuming updateScene is synchronous. */ ()=>Math.abs(snap(c.note).zoom-0.55)<0.00001,'Owned populated scene zoom was not acknowledged');
   await wait(80);await flush(c.note);c.fixturePrerequisites.afterSave=snap(c.note);
   check(c.fixturePrerequisites.afterSave.count===2&&JSON.stringify(c.fixturePrerequisites.afterSave.bounds)==='[0,0,800,500]'&&Math.abs(c.fixturePrerequisites.afterSave.zoom-0.55)<0.00001,'Owned populated scene changed during native save');
  }finally{ea.destroy?.();}
  await wait(250);await retireNativeLeaf(c.note);c.note=null;await wait(100);
  // Decode saved bytes through the documented native API, including compressed drawings. API
  // insertion/save completion alone does not prove later route comparisons share populated input.
  check(typeof ex.ea.getSceneFromFile==='function','Native saved-scene decoder unavailable');
  const serialized=await ex.ea.getSceneFromFile(c.populated),serializedElements=serialized?.elements?.filter(/** Only live elements belong to the comparison fixture. */ element=>!element.isDeleted)??[];
  const serializedBounds=serializedElements.length?[Math.min(...serializedElements.map(/** Saved left extent. */ element=>element.x)),Math.min(...serializedElements.map(/** Saved top extent. */ element=>element.y)),Math.max(...serializedElements.map(/** Saved right extent. */ element=>element.x+element.width)),Math.max(...serializedElements.map(/** Saved bottom extent. */ element=>element.y+element.height))]:null;
  c.fixturePrerequisites.serialized={count:serializedElements.length,bounds:serializedBounds,zoom:serialized?.appState?.zoom?.value??null};
  check(serializedElements.length===2&&JSON.stringify(serializedBounds)==='[0,0,800,500]'&&Math.abs(c.fixturePrerequisites.serialized.zoom-0.55)<0.00001,'Owned populated fixture did not persist exact scene and zoom');
  for(const file of [c.blank,c.nativeBlank,c.populated])c.fixtureBytes.set(file.path,await app.vault.read(file));
  // Preserve the historical native-following matrix with the normal-node override disabled.
  p.settings.excalidrawFitOnNodeOpen=false;
  // Current preferences are measured first, followed by finite explicit preference comparisons.
  for(const preference of [...new Set([c.originalExSettings.zoomToFitOnOpen,false,true])]){
   ex.settings.zoomToFitOnOpen=preference;ex.settings.zoomToFitOnResize=c.originalExSettings.zoomToFitOnResize;
   for(const [kind,file] of [['blank-embedded-created',c.blank],['blank-native-created',c.nativeBlank],['populated',c.populated]]){
    const label=kind+'/open-'+preference;const embed=await embedded(file,label+'/embedded');const target={width:embed.settled.width,height:embed.settled.height};check(target.width>40&&target.height>40,'Embedded canvas has no usable viewport');
    const normal=await native(file,target,label+'/native');
    const matched=[normal.first,normal.complete,normal.settled].every(/** Gate interpretation on comparable actual API pixel dimensions at every sample. */ value=>Math.abs(value.width-target.width)<1&&Math.abs(value.height-target.height)<1);
    c.cases.push({name:label,matched,embedded:embed,native:normal,settledDelta:embed.settled.zoom-normal.settled.zoom});
   }
  }
  // The user-selected normal-node policy deliberately fits even with native opening fit disabled.
  // Its reference is an actual native fit at matched geometry, not a favorable hardcoded zoom.
  p.settings.excalidrawFitOnNodeOpen=true;ex.settings.zoomToFitOnResize=false;
  for(const preference of [false,true]){
   ex.settings.zoomToFitOnOpen=preference;
   const label='normal-override/native-'+preference,embed=await embedded(c.populated,label+'/embedded');
   const target={width:embed.settled.width,height:embed.settled.height};
   ex.settings.zoomToFitOnOpen=true;const reference=await native(c.populated,target,label+'/native-fit-reference');ex.settings.zoomToFitOnOpen=preference;
   const matched=Math.abs(reference.settled.width-target.width)<1&&Math.abs(reference.settled.height-target.height)<1;
   const value={name:label,matched,embedded:embed,nativeFitReference:reference,settledDelta:embed.settled.zoom-reference.settled.zoom};c.cases.push(value);
   check(matched&&Math.abs(value.settledDelta)<0.00001,'Normal-node override did not match native fit at the measured viewport');
   if(!preference){
    const reopened=await embedded(c.populated,'normal-override/reopen');
    const oldView=c.embeddedLeaf.view;await flush(c.embeddedLeaf);p.notifyNavigation(c.other.path);
    await until(/** Require actual ordinary replacement and released old drawing before the next saved-input opening. */ ()=>c.embeddedLeaf?.view.file===c.other&&!oldView.excalidrawAPI,'Normal-node navigation did not retire the drawing');
    await restoreFixture(c.populated);c.phase='normal-override/return-navigation';p.notifyNavigation(c.populated.path);
    await until(/** Require the actual normal editor to own the returned drawing identity. */ ()=>c.embeddedLeaf?.view.file===c.populated&&!editor()?.classList.contains('is-maximized'),'Normal-node return navigation unavailable');
    const returned=await ready(c.embeddedLeaf,c.phase);
    for(const [name,sample] of [['normal-override/reopen',reopened],['normal-override/return-navigation',returned]]){
     const sameGeometry=Math.abs(sample.settled.width-target.width)<1&&Math.abs(sample.settled.height-target.height)<1;
     c.cases.push({name,matched:sameGeometry,...sample,nativeFitReference:reference,settledDelta:sample.settled.zoom-reference.settled.zoom});
     check(sameGeometry&&Math.abs(sample.settled.zoom-reference.settled.zoom)<0.00001,'Normal-node navigation/reopen did not apply opening fit');
    }
   }
  }
  for(const preference of [false,true]){
   ex.settings.zoomToFitOnOpen=preference;
   await embedded(c.populated,'maximized/native-'+preference+'/setup');await activateHost();const control=button('centralEditor.maximize');check(control,'Maximized opening control unavailable');control.click();
   await until(/** Require actual production editor geometry to be maximized before navigating. */ ()=>editor()?.classList.contains('is-maximized'),'Editor did not maximize');await wait(100);
   const oldView=c.embeddedLeaf.view;await flush(c.embeddedLeaf);p.notifyNavigation(c.other.path);
   await until(/** Require ordinary replacement and completed old drawing teardown before restoring saved input. */ ()=>c.embeddedLeaf?.view.file===c.other&&!oldView.excalidrawAPI,'Maximized ordinary navigation did not retire the drawing');
   await restoreFixture(c.populated);c.phase='maximized/native-'+preference;p.notifyNavigation(c.populated.path);
   await until(/** Require the actual maximal editor to open the requested drawing after navigation. */ ()=>c.embeddedLeaf?.view.file===c.populated&&editor()?.classList.contains('is-maximized'),'Maximized drawing navigation unavailable');
   const embed=await ready(c.embeddedLeaf,c.phase),target={width:embed.settled.width,height:embed.settled.height},normal=await native(c.populated,target,c.phase+'/native');
   const matched=Math.abs(normal.settled.width-target.width)<1&&Math.abs(normal.settled.height-target.height)<1;
   const sceneBounds=embed.settled.bounds;
   check(sceneBounds&&JSON.stringify(sceneBounds)===JSON.stringify(normal.settled.bounds)&&embed.settled.count===normal.settled.count,'Maximized zoom comparison scene bounds differ');
   const extent={width:sceneBounds[2]-sceneBounds[0],height:sceneBounds[3]-sceneBounds[1]};
   check(Number.isFinite(extent.width)&&Number.isFinite(extent.height)&&extent.width>0&&extent.height>0,'Maximized zoom comparison has no finite scene extent');
   const dimensionMismatch={width:Math.abs(normal.settled.width-target.width),height:Math.abs(normal.settled.height-target.height)};
   // Native containment zoom is the smaller viewport/scene ratio, reduced by nonnegative fit
   // margins and clamped by a shared maximum. Those operations cannot magnify viewport error:
   // |delta zoom| <= max(|delta width|/scene width, |delta height|/scene height).
   // Only this maximized fit comparison uses its measured geometry bound. Disabled fit and all
   // historical normal-opening pairs retain the existing strict saved/equal-zoom tolerance.
   const derivedZoomBound=Math.max(dimensionMismatch.width/extent.width,dimensionMismatch.height/extent.height);
   const zoomComparisonBound=preference?Math.max(0.00001,derivedZoomBound):0.00001;
   const value={name:'maximized/native-'+preference,matched,embedded:embed,native:normal,settledDelta:embed.settled.zoom-normal.settled.zoom,dimensionMismatch,sceneExtent:extent,derivedZoomBound,zoomComparisonBound};c.cases.push(value);
   check(matched&&Math.abs(value.settledDelta)<=zoomComparisonBound,'Maximized editor did not follow the native opening preference within measured geometry uncertainty');
  }
  // Verify normal-node automatic opening does not override subsequent manual zoom or resizing.
  ex.settings.zoomToFitOnOpen=false;ex.settings.zoomToFitOnResize=false;
  await embedded(c.populated,'manual/embedded');const leaf=c.embeddedLeaf;
  leaf.view.excalidrawAPI.updateScene({appState:{zoom:{value:0.55}}});await wait(100);const manual=snap(leaf);await wait(1000);const quiet=snap(leaf);c.cases.push({name:'manual-zoom-quiet',manual,quiet,unchanged:Math.abs(quiet.zoom-manual.zoom)<0.00001});
  for(const key of ['centralEditor.maximize','centralEditor.restore']){const control=button(key);check(control,'Size control unavailable');c.phase=key;const before=snap(c.embeddedLeaf);control.click();await wait(600);c.cases.push({name:key,before,after:snap(c.embeddedLeaf)});}
  c.phase='window-resize';const beforeResize=snap(c.embeddedLeaf),bounds=win.getBounds();win.setBounds({...bounds,width:bounds.width+60,height:bounds.height+40});await wait(600);c.cases.push({name:'window-resize',before:beforeResize,after:snap(c.embeddedLeaf)});win.setBounds(bounds);await wait(300);
  for(const value of c.cases.filter(/** Select only no-new-opening manual, resize and maximize/restore observations. */ item=>['manual-zoom-quiet','centralEditor.maximize','centralEditor.restore','window-resize'].includes(item.name)))check(Math.abs((value.quiet??value.after).zoom-0.55)<0.00001,'Normal-node opening policy reset subsequent manual zoom');
  // Explicitly disable compatibility for the established saved-zoom representation/reopen probes.
  p.settings.excalidrawFitOnNodeOpen=false;
  await activateHost();c.phase='drawing-to-source';const sourceStart=c.events.length;button('centralEditor.showMarkdown').click();await until(/** Wait for both native Markdown replacement and completed source-mode integration. */ ()=>c.embeddedLeaf.getViewState().type==='markdown'&&c.embeddedLeaf.getViewState().state.mode==='source'&&button('centralEditor.showPreview')&&button('centralEditor.showDrawing')&&c.events.slice(sourceStart).some(/** Fence toolbar gestures behind the actual source restoration Promise. */ event=>event.name==='open-complete'&&event.requestedMode==='source'&&event.mode==='source'),'Source representation integration did not complete');
  await activateHost();c.phase='source-preview-toggle';button('centralEditor.showPreview').click();await until(/** Observe requested native preview mode and its corresponding production control. */ ()=>c.embeddedLeaf.getViewState().state.mode==='preview'&&button('centralEditor.showEditor'),'Markdown preview did not settle');button('centralEditor.showEditor').click();await until(/** Observe requested native source mode before the next representation action. */ ()=>c.embeddedLeaf.getViewState().state.mode==='source'&&button('centralEditor.showPreview'),'Markdown source did not settle');c.cases.push({name:'source-preview-toggle',after:snap(c.embeddedLeaf)});
  await activateHost();c.phase='drawing-source-drawing';button('centralEditor.showDrawing').click();const toggled=await ready(c.embeddedLeaf,'drawing-source-drawing');c.cases.push({name:'drawing-source-drawing',...toggled});
  c.phase='return-navigation';p.notifyNavigation(c.other.path);await until(/** Require navigation away to the exact ordinary disposable note. */ ()=>c.embeddedLeaf?.view.file===c.other,'Ordinary navigation failed');p.notifyNavigation(c.populated.path);await until(/** Require return navigation to the exact populated drawing. */ ()=>c.embeddedLeaf?.view.file===c.populated,'Drawing return failed');c.cases.push({name:'return-navigation',...await ready(c.embeddedLeaf,'return-navigation')});
  c.cases.push({name:'reopen',...await embedded(c.populated,'reopen')});
  if(expectNativePolicy){
   const pairs=c.cases.filter(/** Select only paired initial-opening measurements for the policy regression gate. */ item=>item.name.includes('/open-'));
   check(pairs.every(/** Require equivalent input geometry and settled native zoom on each opening pair. */ item=>item.matched&&Math.abs(item.settledDelta)<0.00001),'Opening preference does not match native saved-zoom policy');
   check(c.cases.filter(/** Select explicit representation, navigation and fresh-session reopen probes. */ item=>['drawing-source-drawing','return-navigation','reopen'].includes(item.name)).every(/** Require disabled auto-fit to retain the fixture’s actual saved zoom. */ item=>Math.abs(item.settled.zoom-0.55)<0.00001),'Disabled opening-fit preference reset saved zoom after representation/navigation');
  }
  // A genuine resize preference is Excalidraw-owned: compare both routes after actual geometry
  // changes under an enabled preference, instead of asserting every resize must preserve zoom.
  ex.settings.zoomToFitOnResize=true;c.phase='resize-preference-enabled/embedded';
  c.embeddedLeaf.view.excalidrawAPI.updateScene({appState:{zoom:{value:0.55}}});await wait(100);
  const embeddedBefore=snap(c.embeddedLeaf),resizeBounds=win.getBounds();win.setBounds({...resizeBounds,width:resizeBounds.width+80,height:resizeBounds.height+40});await wait(600);const embeddedAfter=snap(c.embeddedLeaf);
  await native(c.populated,{width:embeddedBefore.width,height:embeddedBefore.height},'resize-preference-enabled/native');
  c.note.view.excalidrawAPI.updateScene({appState:{zoom:{value:0.55}}});await wait(100);const nativeBefore=snap(c.note),nativeBox=c.note.containerEl.getBoundingClientRect();
  c.note.containerEl.setCssStyles({width:`${nativeBox.width+embeddedAfter.width-nativeBefore.width}px`,height:`${nativeBox.height+embeddedAfter.height-nativeBefore.height}px`});c.note.view.onResize?.();await wait(600);const nativeAfter=snap(c.note);
  const resizeCase={name:'resize-preference-enabled',matchedBefore:Math.abs(nativeBefore.width-embeddedBefore.width)<1&&Math.abs(nativeBefore.height-embeddedBefore.height)<1,matchedAfter:Math.abs(nativeAfter.width-embeddedAfter.width)<1&&Math.abs(nativeAfter.height-embeddedAfter.height)<1,embedded:{before:embeddedBefore,after:embeddedAfter},native:{before:nativeBefore,after:nativeAfter},settledDelta:embeddedAfter.zoom-nativeAfter.zoom};c.cases.push(resizeCase);
  check(resizeCase.matchedBefore&&resizeCase.matchedAfter&&Math.abs(resizeCase.settledDelta)<0.00001,'Enabled native resize preference comparison was not equivalent');win.setBounds(resizeBounds);
  await disable();return{cases:c.cases,events:c.events,fixturePrerequisites:c.fixturePrerequisites,eventLimit:512,expectNativePolicy,reproductionGate:{matchedPairs:c.cases.filter(/** Count only viewport-matched opening pairs as admissible reproduction evidence. */ item=>item.name.includes('/open-')&&item.matched).length,mismatchedZoomPairs:c.cases.filter(/** Identify measured opening mismatches without retaining fixture identities or text. */ item=>item.name.includes('/open-')&&item.matched&&Math.abs(item.settledDelta)>0.00001).map(/** Retain the finite scenario alias rather than its native file path. */ item=>item.name)},preferenceBaseline:{open:c.originalExSettings.zoomToFitOnOpen,resize:c.originalExSettings.zoomToFitOnResize,max:c.originalExSettings.zoomToFitMaxLevel},excalidrawVersion:ex.manifest.version,limits:['First API and complete samples are observable lifecycle points, not first paint','Native matching uses only test-owned real-leaf geometry; every comparison reports a matched gate','Scene constructed with actual Excalidraw Automate API; manual zoom uses actual native API rather than physical pinch/wheel']};
 })().then(/** Publish the finite successful receipt once the serial mutation task completes. */ value=>{c.value=value;c.done=true;},/** Preserve the primary failure even when a retired native view cannot supply secondary facts. */ error=>{c.error=String(error);try{c.failureState={phase:c.phase,embedded:snap(c.embeddedLeaf),buttons:Array.from(editor()?.querySelectorAll('.kplex-central-editor-toolbar button')??[]).map(/** Retain only known accessible toolbar labels for a failed mode transition. */ element=>element.getAttribute('aria-label')),visible:Boolean(host.view.containerEl.isShown()),focused:document.hasFocus(),activeOwner:app.workspace.activeLeaf===host?'host':app.workspace.activeLeaf===c.embeddedLeaf?'embedded':'other'};}catch{c.failureState={phase:c.phase,snapshotStatus:'unavailable'};}finally{c.done=true;}});
 return JSON.stringify({started:true});
}

let started=false,attempted=false,probeDeadline;
try{
 if(cli('vault','info=path')!==vault)throw Error('Wrong disposable vault');
 for(const name of ['main.js','styles.css','manifest.json']){
  const built=sha(readFileSync(`${root}/dist/${name}`)),installed=sha(readFileSync(`${config}/plugins/k-plex/${name}`));
  report.artifacts[name]={built,installed};if(built!==installed)throw Error('Installed/build hash mismatch: '+name);
 }
 report.obsidian=cli('version');cli('dev:errors','clear');attempted=true;report.start=evaluate(`(${probe.toString()})(${process.env.KPLEX_EXPECT_ZOOM_POLICY==='1'})`,'probe-start');started=true;
 const end=probeDeadline=Date.now()+360000;
 while(true){await delay(300);const state=await readState('JSON.stringify({done:window.__kplexInteractionFinal?.done,error:window.__kplexInteractionFinal?.error})','probe-state',end);
  if(state.done){report.result=await readState('JSON.stringify(window.__kplexInteractionFinal.value??{error:window.__kplexInteractionFinal.error,cases:window.__kplexInteractionFinal.cases,events:window.__kplexInteractionFinal.events,fixturePrerequisites:window.__kplexInteractionFinal.fixturePrerequisites,failureState:window.__kplexInteractionFinal.failureState})','probe-result',end);if(state.error)throw Error(state.error);break;}
  if(Date.now()>end)throw Error('Native acceptance deadline');
 }
 const errors=cli('dev:errors');if(errors&&!/^No errors captured\.?$/i.test(errors))throw Error('Native JavaScript errors: '+errors.slice(0,1000));
 report.nativeErrorsClear=true;report.status='passed';
}catch(error){
 report.status='failed';report.error=String(error);
 // Recover useful completed/partial observations after a lost read response. This does not rerun
 // probe mutations or change the original acceptance outcome/deadline.
 if(started&&!report.result&&Date.now()<probeDeadline){try{report.result=await readState('JSON.stringify(window.__kplexInteractionFinal?.value??{done:window.__kplexInteractionFinal?.done,error:window.__kplexInteractionFinal?.error,cases:window.__kplexInteractionFinal?.cases,events:window.__kplexInteractionFinal?.events,fixturePrerequisites:window.__kplexInteractionFinal?.fixturePrerequisites,failureState:window.__kplexInteractionFinal?.failureState})','failure-observations',probeDeadline);report.observationsRecovered=true;}catch(recoveryError){report.observationRecoveryStatus=recoveryError.code??'unavailable';}}
}
finally{
 if(attempted&&!started){try{started=await readState('JSON.stringify(Boolean(window.__kplexInteractionFinal))','partial-start-observed',Date.now()+30000);}catch(error){report.cleanupError='Unable to inspect partial controller: '+String(error);}}
 const cleanupErrors=[];
 if(started){try{
  const cleanupDeadline=Date.now()+90000;
  try{evaluate(`(/** Retire probe work and start a separate restoration lifetime. */ ()=>{const c=window.__kplexInteractionFinal;c.cancelled=true;c.cleanup=(/** Restore every owned resource even if another cleanup step fails. */ async()=>{
   const errors=[],steps=[];
   /** Attempt every owned resource even when an earlier teardown fails. */
   const attempt=async(name,work)=>{try{await work();steps.push({name,status:'passed'});}catch(error){errors.push({name,error:String(error)});steps.push({name,status:'failed'});}};
   await attempt('finish-probe-task',/** Await cancellation before removing observers or native owners. */ async()=>{await c.task;});
   for(const [index,undo] of c.wrappers.reverse().entries())await attempt('native-wrapper-'+index,undo);
   /** Await cleanup-only native completion without reopening the retired probe lifetime. */
   const settled=async(predicate,label)=>{const end=Date.now()+15000;while(!predicate()){if(Date.now()>end)throw Error(label);await new Promise(/** Yield to the owned native close/save without blocking the renderer. */ resolve=>window.setTimeout(resolve,25));}};
   /** Finish a real native save before disposal; never clear product dirty/save state. */
   const finishSave=async view=>{if(view?.excalidrawAPI&&typeof view.forceSave==='function'){await view.forceSave(true,true);await settled(/** Verify queued native saves are finished before leaf retirement. */ ()=>!view.isSaveInProgress(),'Owned cleanup save remained busy');}};
   await attempt('embedded-editor-disposal',/** Flush the owned drawing then dispose the real embedded editor despite save failure. */ async()=>{const view=c.embeddedLeaf?.view,hadDrawing=Boolean(view?.excalidrawAPI);if(view)c.retiredViews.add(view);try{await finishSave(view);}finally{c.p.settings.embedCentralNode=false;c.p.index.notify();}if(hadDrawing)await settled(/** Wait for upstream close to relinquish its API and file lifetime. */ ()=>!view.excalidrawAPI,'Embedded drawing close did not finish');});
   for(const [index,leaf] of [...new Set(c.leaves)].reverse().entries())await attempt('owned-leaf-'+index,/** Flush and detach this exact test-created native leaf. */ async()=>{if(leaf?.view.containerEl.isConnected){const view=leaf.view,hadDrawing=Boolean(view.excalidrawAPI);c.retiredViews.add(view);try{await finishSave(view);}finally{leaf.detach();}if(hadDrawing)await settled(/** Wait for upstream close to relinquish its API and file lifetime. */ ()=>!view.excalidrawAPI,'Native drawing close did not finish');}});
   await attempt('owned-timers',/** Ensure cancelled probe work retained no scheduled callbacks. */ ()=>{if(c.timers.size)throw Error('Owned probe timer survived task cancellation');});
   await attempt('Excalidraw-representation-memory',/** Restore only the pre-probe representation map after disposing fixture views. */ ()=>{for(const key of Object.keys(c.ex.excalidrawFileModes))if(!Object.hasOwn(c.originalExModes,key))delete c.ex.excalidrawFileModes[key];Object.assign(c.ex.excalidrawFileModes,c.originalExModes);});
   await attempt('fixture-folder',/** Delete fixture bytes only after every retired native drawing has finished closing. */ async()=>{await settled(/** Reject deletion while a native drawing can still write fixture content. */ ()=>[...c.retiredViews].every(/** Require upstream teardown to have released this drawing’s API. */ view=>!view.excalidrawAPI),'Native drawing teardown still owns fixture');const folder=app.vault.getFolderByPath(c.folder);if(folder)await app.vault.delete(folder,true);});
   await attempt('owned-native-style',/** Restore exact pre-probe inline geometry on test-created leaves. */ ()=>{for(const item of c.styles){if(item.value===null)item.el.removeAttribute('style');else item.el.setAttribute('style',item.value);}});
   await attempt('Excalidraw-settings',/** Persist the original companion preferences before workspace restoration. */ async()=>{Object.assign(c.ex.settings,c.originalExSettings);await c.ex.saveSettings();});
   await attempt('window-bounds',/** Restore only the disposable test vault’s original desktop geometry. */ ()=>{const remote=require('@electron/remote');const win=remote.BrowserWindow.getAllWindows().find(/** Select only the explicitly authorized disposable-vault window. */ item=>item.getTitle().includes('kplex-test-small'));if(win)win.setBounds(c.originalBounds);});
   await attempt('sidebar-states',/** Restore each sidebar’s original collapsed state. */ ()=>{for(const side of ['left','right']){const split=app.workspace[side+'Split'];if(c.originalSidebarStates[side])split.collapse();else split.expand();}});
   await attempt('settings-before-layout',/** Restore K-Plex preferences before recreating its original workspace views. */ async()=>{Object.assign(c.p.settings,c.originalSettings);await c.p.saveSettings(false,false);await c.p.settingsWriteQueue;});
   await attempt('workspace-layout',/** Recreate the original serialized workspace without retaining test leaves. */ async()=>{await app.workspace.changeLayout(c.layout);});
   await attempt('settings-after-layout',/** Restore preferences again after view initialization may have persisted state. */ async()=>{Object.assign(c.p.settings,c.originalSettings);await c.p.saveSettings(false,false);await c.p.settingsWriteQueue;});
   await attempt('native-leaf-associations',/** Rebind original native routing owners to the restored workspace leaf identities. */ ()=>{
    // Workspace restoration may replace leaves. Rebind original associations by serialized native id.
    /** Restore original associations by native serialized id after layout replaces leaf objects. */
    const rebind=old=>old?app.workspace.getLeavesOfType(old.getViewState().type).find(/** Locate only the original serialized leaf identity in the restored workspace. */ leaf=>leaf.id===old.id)??null:null;
    c.p.linkedDocumentLeaf=rebind(c.owners.linkedDocumentLeaf);c.p.lastDocumentLeaf=rebind(c.owners.lastDocumentLeaf);
    c.p.recentLeafHistory=c.owners.recentLeafHistory.map(rebind).filter(Boolean);c.p.sidecarLeaves.clear();
    for(const [oldHost,oldLeaf] of c.owners.sidecarLeaves){const host=rebind(oldHost),leaf=rebind(oldLeaf);if(host&&leaf)c.p.sidecarLeaves.set(host,leaf);}
    c.p.index.notify();
   });
   const result={errors,steps,nativeWrappersRemoved:steps.filter(/** Select restoration receipts for every temporary native observer. */ step=>step.name.startsWith('native-wrapper-')).every(/** Require every native method wrapper to be restored successfully. */ step=>step.status==='passed')};
   await attempt('cleanup-assertions',/** Prove disposal, settings and path-free timer ownership were restored. */ ()=>{result.folderRemoved=!app.vault.getFolderByPath(c.folder);result.remainingOwnedWorkspaceLeaves=app.workspace.getLeavesOfType('markdown').concat(app.workspace.getLeavesOfType('excalidraw')).filter(/** Count only remaining leaves bound to the disposable fixture folder. */ leaf=>String(leaf.getViewState().state?.file??'').startsWith(c.folder+'/')).length;result.restoredSettings=JSON.stringify(c.p.settings)===JSON.stringify(c.originalSettings);result.ownedTimersRemoved=c.timers.size===0;result.nativeViewsRetired=[...c.retiredViews].every(/** Require upstream teardown to have released this drawing’s API. */ view=>!view.excalidrawAPI);result.restoredExcalidrawSettings=JSON.stringify(c.ex.settings)===JSON.stringify(c.originalExSettings);});
   return result;
  })().then(/** Publish exact cleanup receipts after every restoration attempt. */ value=>{c.cleaned=value;},/** Preserve an unexpected restoration failure for outer reporting. */ error=>{c.cleanupError=String(error);});return JSON.stringify({cleanupStarted:true});})()`,'cleanup-start',cleanupDeadline);}catch(error){
   if(error.code!=='ETIMEDOUT')throw error;
   const state=await readState('JSON.stringify({started:Boolean(window.__kplexInteractionFinal?.cleanup)})','cleanup-start-observed',cleanupDeadline);if(!state.started)throw error;
  }
  const end=cleanupDeadline;
  while(true){await delay(300);const state=await readState('JSON.stringify({cleaned:window.__kplexInteractionFinal?.cleaned,error:window.__kplexInteractionFinal?.cleanupError})','cleanup-state',end);if(state.error)throw Error(state.error);if(state.cleaned){report.cleanup=state.cleaned;break;}if(Date.now()>end)throw Error('Cleanup deadline');}
  for(const error of report.cleanup.errors)cleanupErrors.push(`${error.name}: ${error.error}`);
  if(!report.cleanup.folderRemoved||report.cleanup.remainingOwnedWorkspaceLeaves!==0||!report.cleanup.restoredSettings||!report.cleanup.nativeWrappersRemoved||!report.cleanup.ownedTimersRemoved||!report.cleanup.nativeViewsRetired||!report.cleanup.restoredExcalidrawSettings)cleanupErrors.push('Native cleanup assertions failed');
  try{evaluate('(/** Remove the test controller only after native cleanup has settled. */ ()=>{delete window.__kplexInteractionFinal;return JSON.stringify({removed:true});})()','controller-remove');}catch(error){cleanupErrors.push('controller removal: '+String(error));}
 }catch(error){cleanupErrors.push('native cleanup: '+String(error));}}
 // Byte restoration is independent of native teardown success; attempt every configuration file.
 if(attempted){for(const backup of backups){try{const path=`${config}/${backup.name}`;if(backup.bytes===null){if(existsSync(path))rmSync(path);}else writeFileSync(path,backup.bytes);if(backup.bytes===null?existsSync(path):!readFileSync(path).equals(backup.bytes))throw Error('Bytes differ');}catch(error){cleanupErrors.push(`configuration ${backup.name}: ${String(error)}`);}}report.configurationRestored=!cleanupErrors.some(/** Distinguish independent configuration-byte restoration failure from native teardown failure. */ error=>error.startsWith('configuration '));}
 if(cleanupErrors.length){report.cleanupError=cleanupErrors.join('\n');report.status='failed';}
 report.completedAt=new Date().toISOString();writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));
}
console.log(JSON.stringify({status:report.status,error:report.error,cleanupError:report.cleanupError,cases:report.result?.cases?.map(/** Print finite scenario summaries without native paths or scene content. */ value=>({name:value.name,type:value.settled?.type??value.initial?.type})),report:`${out}/report.json`}));
if(report.status!=='passed')process.exitCode=1;
