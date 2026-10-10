/**
 * Serial exact-build native acceptance for per-note Markdown camera scaling.
 * Owns test-scoped fixture files, path-free text geometry, trusted caret/input observations
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
// Native reload/Settings ownership and companion drawing creation retain exact configuration bytes.
const names=['plugins/k-plex/data.json','plugins/obsidian-excalidraw-plugin/data.json','community-plugins.json','app.json'];
const backups=names.map(/** Snapshot only settings files this driver can mutate for independent byte restoration. */ name=>({name,bytes:existsSync(`${config}/${name}`)?readFileSync(`${config}/${name}`):null}));
const gitHead=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'});assert.equal(gitHead.status,0,'Read native receipt Git provenance');
const report={startedAt:new Date().toISOString(),base:gitHead.stdout.trim(),driverSha256:sha(driver),vault:vaultName,scope:'per-note Markdown camera scaling and native coordinate input',limits:['Electron trusted input is not physical keyboard or Windows acceptance','Bounded settlement/DOM checks do not establish actual paint latency','Text Range geometry and editor-model state establish functional scale/input behavior, not physical touch or paint'],artifacts:{}};
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

/** Start one owned asynchronous native suite; all mutations remain in the named disposable vault. */
function install(){
 if(window.__kplexMarkdownZoom)throw Error('Existing owned Markdown zoom controller');
 const p=app.plugins.plugins['k-plex'],remote=require('@electron/remote');
 const win=remote.getCurrentWindow();
 if(!p||!win||!win.getTitle().includes('kplex-test-small')||remote.powerMonitor.getSystemIdleState(10)==='locked')throw Error('Native prerequisites unavailable, wrong owning vault window or locked');
 if(app.isMobile||(!app.setting.isOpen&&document.querySelector('.modal-container')))throw Error('Requires desktop without unrelated dialogs');
 const wc=win.webContents;
 const c=window.__kplexMarkdownZoom={p,folder:`Kplex-Markdown-Zoom-${Date.now()}`,settings:JSON.parse(JSON.stringify(p.settings)),layout:app.workspace.getLayout(),windowId:win.id,bounds:win.getBounds(),throttling:wc.getBackgroundThrottling(),sidebars:{left:app.workspace.leftSplit.collapsed,right:app.workspace.rightSplit.collapsed},settingsWindow:{open:app.setting.isOpen,lastTabId:app.setting.lastTabId,query:app.setting.searchComponent?.getValue?.()},owners:{linkedDocumentLeaf:p.linkedDocumentLeaf,lastDocumentLeaf:p.lastDocumentLeaf,recentLeafHistory:[...p.recentLeafHistory],sidecarLeaves:new Map(p.sidecarLeaves)},exModes:{...app.plugins.plugins['obsidian-excalidraw-plugin']?.excalidrawFileModes},scenarios:[],leaves:[],timers:new Set(),phase:'setup',done:false};
 if(c.settingsWindow.open)app.setting.close();
 if(document.querySelector('.modal-container'))throw Error('Unrelated dialog remains after retaining Settings ownership');
 /** Reject resumed asynchronous work after cleanup retires the suite lifetime. */
 const active=()=>{if(c.cancelled)throw Error('Owned Markdown zoom suite cancelled');};
 /** Yield a tracked test timer while retaining cancellation ownership. */
 const wait=async ms=>{active();await new Promise(/** Release the exact owned timer before resuming native work. */ resolve=>{const timer=window.setTimeout(/** Retire ownership on normal completion. */ ()=>{c.timers.delete(timer);resolve();},ms);c.timers.add(timer);});active();};
 /** Fail on an observable missing contract instead of substituting a fixture state. */
 const check=(ok,message)=>{if(!ok)throw Error(message);};
 /** Observe actual native readiness with one finite deadline. */
 const until=async(predicate,label,timeout=15000)=>{const end=Date.now()+timeout;while(!predicate()){if(Date.now()>end)throw Error(label);await wait(25);}active();};
 /** Resolve live roots after navigation, native replacement and reload. */
 const root=()=>c.leaf?.view.containerEl.querySelector('.kplex-app');
 /** Resolve the current embedded content, avoiding stale detached native DOM. */
 const editor=()=>root()?.querySelector('.kplex-central-editor-content');
 /** Resolve a localized toolbar action only when it has a usable physical box. */
 const button=key=>Array.from(root()?.querySelectorAll('button')??[]).find(/** Match the current locale's production label and visible geometry. */ element=>element.getAttribute('aria-label')===c.p.translator(key)&&element.getBoundingClientRect().width>0);
 /** Reveal and focus only the suite's K-Plex host before trusted native input. */
 const foreground=async()=>{win.show();win.focus();wc.focus();app.workspace.setActiveLeaf(c.leaf,{focus:true});await wait(50);};
 /** Native setViewState resolves before React’s navigation subscription effect; require the real owned graph, then cross two owning-window frames before sending its first event. */
 const mounted=async()=>{await until(/** Prove the actual owned K-Plex React graph mounted, rather than relying on the native leaf’s type alone. */ ()=>root()?.querySelector('.kplex-plex')&&root()?.querySelector('.kplex-zoom-controls button'),'Owned K-Plex graph not mounted');const owner=root().ownerDocument.defaultView;await new Promise(/** Allow the mounted graph’s passive navigation effect to subscribe before its first notification. */ resolve=>owner.requestAnimationFrame(/** Cross a second render frame, following the established native UX setup prerequisite. */ ()=>owner.requestAnimationFrame(resolve)));active();};
 /** Deliver actual Electron pointer events and require the exact target's trusted receipt. */
 const click=async element=>{check(element?.isConnected,'Trusted input target is unavailable');await foreground();const rect=element.getBoundingClientRect(),x=Math.round(rect.left+rect.width/2),y=Math.round(rect.top+rect.height/2),hit=document.elementFromPoint(x,y);
  c.lastInput={label:element.getAttribute('aria-label'),targetTag:element.tagName,targetClass:element.className,rect:{left:rect.left,top:rect.top,width:rect.width,height:rect.height},point:{x,y},viewport:{width:window.innerWidth,height:window.innerHeight},hitTag:hit?.tagName,hitClass:typeof hit?.className==='string'?hit.className:null,hitAria:hit?.getAttribute('aria-label')??null,hitWithinOwnedEditor:Boolean(editor()?.contains(hit)),hitWithinOwnedGraph:Boolean(root()?.contains(hit)),hitWithinTarget:element.contains(hit)};
  check(rect.width>0&&rect.height>0&&x>0&&y>0&&x<window.innerWidth&&y<window.innerHeight,'Trusted target is outside viewport: '+c.lastInput.label);check(c.lastInput.hitWithinTarget,'Trusted target is covered: '+c.lastInput.label);let received=false;
  /** Observe only the exact intended production target's native event. */
  const observe=event=>{if(element.contains(event.target)&&event.isTrusted)received=true;};
  element.addEventListener('pointerdown',observe,true);try{wc.sendInputEvent({type:'mouseMove',x,y});wc.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,x,y});wc.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,x,y});await until(/** Require an actual trusted pointerdown instead of assuming Electron delivery. */ ()=>received,'Trusted pointer receipt missing',5000);await wait(80);}finally{element.removeEventListener('pointerdown',observe,true);}
 };
 /** Retain finite scenario facts without note content or vault paths. */
 const record=(id,value={})=>{c.scenarios.push({id,...value});};
 /** Observe the native Markdown view/model bound to the current disposable fixture. */
 const native=()=>c.embedded?.view;
 /** Sample one identical eight-character native text Range, logical boxes and applied transform. */
 const sample=()=>{
  const content=editor(),host=content?.querySelector('.kplex-central-editor-leaf-host'),overlay=content?.closest('.kplex-central-editor-overlay');check(host&&overlay,'Native Markdown geometry absent');
  const search=native()?.getViewType()==='markdown'&&native().getMode?.()==='preview'?host.querySelector('.markdown-preview-view'):host.querySelector('.cm-content');check(search,'Native Markdown text surface unavailable');
  const walker=document.createTreeWalker(search,NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode())){if(node.textContent.startsWith('NODEZOOMMARKER'))break;}check(node,'Synthetic geometry marker unavailable');const range=document.createRange();range.setStart(node,0);range.setEnd(node,8);const text=range.getBoundingClientRect(),computed=window.getComputedStyle(host),scale=Number(window.getComputedStyle(overlay).getPropertyValue('--kplex-editor-camera-scale'));
  check(Number.isFinite(scale)&&scale>0&&text.width>0&&text.height>0,'Nonfinite native text geometry');
  return{scale,textWidth:text.width,textHeight:text.height,logicalWidth:host.clientWidth,logicalHeight:host.clientHeight,contentWidth:content.clientWidth,contentHeight:content.clientHeight,transform:computed.transform,scaled:content.classList.contains('is-markdown-zoom-scaled'),maximized:content.classList.contains('is-maximized'),fontSize:window.getComputedStyle(node.parentElement).fontSize,mode:native()?.getMode?.()};
 };
 /** Wait for native opening completion and its public model/preview before sampling text. */
 const ready=async file=>{await until(/** Fence native capture and React controller completion behind the exact requested fixture. */ ()=>c.embedded?.view.file===file&&native()?.getViewType()==='markdown'&&!editor()?.querySelector('.kplex-central-editor-status'),'Embedded Markdown opening did not finish');await until(/** Require actual source text/reading DOM, not a timer-only claim of readiness. */ ()=>editor()?.textContent.includes('NODEZOOMMARKER'),'Native Markdown text unavailable');await wait(120);};
 /** Navigate through the real K-Plex center notification; never substitute a native editor leaf. */
 const go=async file=>{c.p.notifyNavigation(file.path);c.p.index.notify();await ready(file);};
 /** Capture only real embedded leaves created by the current product adapter. */
 const prototype=Object.getPrototypeOf(app.workspace.getLeaf(false)),originalSetState=prototype.setViewState;
 prototype.setViewState=/** Forward all native calls unchanged while retaining only this suite’s exact K-Plex embedded owner; another existing Plex may observe the same navigation. */ function(...args){if(String(args[0]?.state?.file??'').startsWith(c.folder+'/')){if(this.containerEl.closest('.kplex-central-editor-leaf-host')&&c.leaf?.view.containerEl.contains(this.containerEl))c.embedded=this;}return originalSetState.apply(this,args);};
 c.restoreCapture=/** Restore the original native method once the suite stops observing. */ ()=>{prototype.setViewState=originalSetState;};
 /** Flush user-triggered settings writes before checking the persisted map or reloading. */
 const saved=async()=>{await c.p.settingsWriteQueue;const data=await c.p.loadData();return data.centralNodeMarkdownZoomModes??{};};
 /** Deliver normal zoom toolbar gestures, requiring camera state to change after each one. */
 const zoom=async(key,count)=>{for(let i=0;i<count;i++){const previous=sample().scale;await click(button(key));await until(/** Prove this gesture changed the live CSS camera scale. */ ()=>sample().scale!==previous,'Camera zoom did not change');}return sample();};
 /** Check screen-space text scaling and exact inverse logical host layout from observed content. */
 const scaledEqual=(before,after,label)=>{const ratio=after.scale/before.scale;check(Math.abs(after.textWidth/before.textWidth-ratio)<.015,label+' text width does not follow camera scale');check(Math.abs(after.textHeight/before.textHeight-ratio)<.015,label+' text height does not follow camera scale');for(const value of [before,after]){check(value.scaled&&value.transform!=='none',label+' lacks scoped Markdown transform');check(Math.abs(value.logicalWidth-value.contentWidth/value.scale)<1,label+' inverse logical width mismatch');check(Math.abs(value.logicalHeight-value.contentHeight/value.scale)<1,label+' inverse logical height mismatch');}};
 /** Perform trusted pointer placement and native typing against the actual CodeMirror cursor. */
 const caretInput=async()=>{
  const view=native(),cm=view.editor?.cm,content=editor().querySelector('.cm-content'),cameraScale=sample().scale;check(cm?.coordsAtPos&&cm?.posAtCoords&&content,'Actual CodeMirror coordinate APIs unavailable');view.editor.setCursor({line:0,ch:0});view.editor.scrollIntoView({from:{line:0,ch:0},to:{line:0,ch:12}},true);await wait(80);
  const coords=cm.coordsAtPos(8),x=Math.round(coords.left),y=Math.round((coords.top+coords.bottom)/2);check(x>0&&y>0&&x<window.innerWidth&&y<window.innerHeight,'Scaled native caret outside viewport');const expected=cm.posAtCoords({x,y});check(expected===8,'Known model position eight did not round-trip its native screen coordinate');let trusted=false;
  /** Retain only a trusted receipt within this exact owned text surface. */
  const observe=event=>{if(content.contains(event.target)&&event.isTrusted)trusted=true;};
  content.addEventListener('pointerdown',observe,true);try{wc.sendInputEvent({type:'mouseMove',x,y});wc.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,x,y});wc.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,x,y});await until(/** Require both host delivery and the cursor mapping expected for the delivered screen point. */ ()=>trusted&&cm.state.selection.main.head===expected,'Scaled pointer caret coordinate mismatch',5000);const before=view.editor.getValue();let inputTrusted=false;
   /** Authenticate ordinary native typing without synthesizing the editor model. */
   const inputObserve=event=>{if(content.contains(event.target)&&event.isTrusted)inputTrusted=true;};content.addEventListener('input',inputObserve,true);
   try{wc.sendInputEvent({type:'keyDown',keyCode:'x'});wc.sendInputEvent({type:'char',keyCode:'x'});wc.sendInputEvent({type:'keyUp',keyCode:'x'});await until(/** Verify actual document insertion at the cursor selected by the trusted physical point. */ ()=>inputTrusted&&view.editor.getValue()===before.slice(0,expected)+'x'+before.slice(expected),'Scaled native text insertion mismatch',5000);record('scaled-source-trusted-caret-and-input',{trustedPointer:trusted,trustedInput:inputTrusted,cursor:expected,scale:cameraScale});}
   finally{content.removeEventListener('input',inputObserve,true);view.editor.setValue(before);await wait(100);}
  }finally{content.removeEventListener('pointerdown',observe,true);}
 };
 c.task=(async()=>{
  // The test deliberately covers increased camera scale. A 900px window can put the enlarged
  // editor over the zoom controls; use the established desktop acceptance viewport and restore
  // its exact prior native bounds independently during cleanup rather than clicking through it.
  win.show();win.focus();wc.focus();win.setBounds({x:0,y:25,width:1440,height:875});await until(/** Observe the native renderer’s real resized viewport before mounting the owned graph. */ ()=>window.innerWidth>=1400&&window.innerHeight>=800,'Native acceptance viewport did not resize');app.workspace.leftSplit.collapse();app.workspace.rightSplit.collapse();await c.p.setDocumentSyncMode('off');c.p.settings.embedCentralNode=true;c.p.settings.centralNodeMarkdownMode='source';c.p.settings.sidecarOpen=false;
  await app.vault.createFolder(c.folder);c.a=await app.vault.create(c.folder+'/Alpha.md','NODEZOOMMARKER ordinary native Markdown text for stable geometry.\n\nSecond paragraph stays outside the measured range.\n');c.b=await app.vault.create(c.folder+'/Beta.md','NODEZOOMMARKER separate per-note preference fixture.\n');
  for(const file of [c.a,c.b]){c.p.index.insertCreatedFile(file);await c.p.index.publishHostMetadataPreview(file.path);}
  c.leaf=app.workspace.getLeaf(true);c.leaves.push(c.leaf);await c.leaf.setViewState({type:'k-plex-react-view',active:true});await app.workspace.revealLeaf(c.leaf);await mounted();await go(c.a);
  const toggle=()=>editor()?.querySelector('[data-kplex-markdown-zoom-toggle]');check(toggle()?.getAttribute('aria-pressed')==='false','New note does not default to fixed text size');
  const fixedInitial=sample(),fixedOut=await zoom('graph.zoomOut',2),fixedIn=await zoom('graph.zoomIn',4);for(const value of [fixedInitial,fixedOut,fixedIn])check(!value.scaled&&value.transform==='none'&&Math.abs(value.textWidth-fixedInitial.textWidth)<.5&&Math.abs(value.textHeight-fixedInitial.textHeight)<.5,'Default fixed font changes screen size with camera zoom');record('default-fixed-source-three-camera-scales',{samples:[fixedInitial,fixedOut,fixedIn]});
  await click(toggle());await until(/** Require the current production toggle's state and scoped class to commit. */ ()=>toggle()?.getAttribute('aria-pressed')==='true'&&editor().classList.contains('is-markdown-zoom-scaled'),'Scale toggle did not commit');check((await saved())[c.a.path]==='scale','User toggle did not persist this note preference');
  const scaledInitial=sample(),scaledOut=await zoom('graph.zoomOut',3);scaledEqual(scaledInitial,scaledOut,'Scaled zoom out');await caretInput();const scaledIn=await zoom('graph.zoomIn',5);scaledEqual(scaledOut,scaledIn,'Scaled zoom in');record('scaled-source-three-camera-scales',{samples:[scaledInitial,scaledOut,scaledIn]});
  // The high-scale geometry is already retained. Restore a normal camera through visible
  // production zoom controls before changing reading mode: at 1.749 the editor toolbar can
  // legitimately lie under the native pane header, and acceptance must never click through it.
  await zoom('graph.zoomOut',4);
  await click(button('centralEditor.showPreview'));await until(/** Require native view mode completion and the measured reading paragraph. */ ()=>native().getMode?.()==='preview'&&editor().querySelector('.markdown-preview-view p'),'Reading mode unavailable');const reading=sample(),readingOut=await zoom('graph.zoomOut',2);scaledEqual(reading,readingOut,'Reading scale');record('scaled-reading-mode-camera-zoom',{samples:[reading,readingOut]});
  await click(button('centralEditor.maximize'));await until(/** Require actual fullscreen native geometry and removed local zoom control. */ ()=>editor().classList.contains('is-maximized')&&!toggle(),'Fullscreen Markdown policy unavailable');const maximal=sample();check(!maximal.scaled&&maximal.transform==='none','Fullscreen retained Markdown camera transform');check(Math.abs(maximal.textWidth-reading.textWidth/reading.scale)<.5&&Math.abs(maximal.textHeight-reading.textHeight/reading.scale)<.5,'Fullscreen failed to restore native reading text size');record('fullscreen-native-text-size-and-hidden-toggle',{sample:maximal});
  await click(button('centralEditor.restore'));await until(/** Normal restore resumes this same note’s remembered scaling choice. */ ()=>!editor().classList.contains('is-maximized')&&toggle()?.getAttribute('aria-pressed')==='true','Normal restore lost remembered Markdown scale');record('fullscreen-restore-retains-normal-scaling');
  await go(c.b);check(toggle()?.getAttribute('aria-pressed')==='false'&&!sample().scaled,'New second note inherited first-note scaling');await go(c.a);check(toggle()?.getAttribute('aria-pressed')==='true'&&sample().scaled,'Returning to first note lost saved scaling');record('normal-navigation-per-note-preferences');
  await click(toggle());await until(/** Require removing the first note’s sparse preference to update the live native host. */ ()=>toggle()?.getAttribute('aria-pressed')==='false'&&!sample().scaled,'Fixed toggle did not commit');check(!Object.hasOwn(await saved(),c.a.path),'Fixed mode did not remove sparse preference');record('fixed-mode-removes-note-override');await click(toggle());check((await saved())[c.a.path]==='scale','Scale preference was not saved before reload');
  c.phase='plugin-reload';await app.plugins.disablePlugin('k-plex');await app.plugins.enablePlugin('k-plex');c.p=app.plugins.plugins['k-plex'];check(c.p&&c.p!==p,'Actual plugin reload did not replace instance');check(c.p.settings.centralNodeMarkdownZoomModes[c.a.path]==='scale','Actual plugin reload lost user preference');
  c.leaf=app.workspace.getLeaf(true);c.leaves.push(c.leaf);await c.leaf.setViewState({type:'k-plex-react-view',active:true});await app.workspace.revealLeaf(c.leaf);await mounted();await go(c.a);check(toggle()?.getAttribute('aria-pressed')==='true'&&sample().scaled,'Reloaded native UI does not apply saved preference');record('actual-plugin-reload-persists-scaled-note');
  c.canvas=await app.vault.create(c.folder+'/Canvas.canvas',JSON.stringify({nodes:[],edges:[]}));c.p.index.insertCreatedFile(c.canvas);c.p.notifyNavigation(c.canvas.path);c.p.index.notify();await until(/** Require real native Canvas surface and the editor controller to finish opening. */ ()=>native()?.file===c.canvas&&native().getViewType()==='canvas'&&!editor()?.querySelector('.kplex-central-editor-status'),'Native Canvas unavailable');check(!toggle()&&!editor().classList.contains('is-markdown-zoom-scaled')&&window.getComputedStyle(editor().querySelector('.kplex-central-editor-leaf-host')).transform==='none','Markdown scaling leaked into native Canvas');record('native-Canvas-untransformed-and-toggle-hidden');
  const ex=app.plugins.plugins['obsidian-excalidraw-plugin'];check(ex?.createDrawing,'Companion Excalidraw required');const created=await ex.createDrawing('Drawing.excalidraw.md',c.folder);c.drawing=typeof created==='string'?app.vault.getFileByPath(created):created;check(c.drawing?.path.startsWith(c.folder+'/'),'Non-owned Excalidraw drawing');c.p.index.insertCreatedFile(c.drawing);await c.p.index.publishHostMetadataPreview(c.drawing.path);c.p.notifyNavigation(c.drawing.path);c.p.index.notify();await until(/** Require the genuine Excalidraw API after native representation routing. */ ()=>native()?.file===c.drawing&&native()?.excalidrawAPI&&!editor()?.querySelector('.kplex-central-editor-status'),'Native Excalidraw unavailable');check(!toggle()&&!editor().classList.contains('is-markdown-zoom-scaled')&&window.getComputedStyle(editor().querySelector('.kplex-central-editor-leaf-host')).transform==='none','Markdown scaling leaked into native Excalidraw');record('native-Excalidraw-untransformed-and-toggle-hidden');
  await go(c.a);check(sample().scaled&&toggle()?.getAttribute('aria-pressed')==='true','Returning from Canvas/drawing lost Markdown preference');record('drawing-Canvas-return-to-scaled-Markdown');
  return{scenarios:c.scenarios,desktop:true,physicalDevice:false};
 })().then(/** Publish a complete finite success receipt after every required scenario. */ value=>{c.value=value;c.done=true;},/** Preserve completed observations and bounded, content-free native prerequisites for independent cleanup. */ error=>{c.error=String(error);const view=native(),content=editor(),cm=content?.querySelector('.cm-content'),model=view?.editor?.getValue?.(),rect=cm?.getBoundingClientRect();c.failure={phase:c.phase,scenarios:c.scenarios.length,lastInput:c.lastInput,embeddedType:view?.getViewType(),contentClass:content?.className,modelHasMarker:typeof model==='string'&&model.includes('NODEZOOMMARKER'),modelCharacters:typeof model==='string'?model.length:null,embeddedBelongsToOwnedHost:Boolean(c.leaf?.view.containerEl.contains(view?.containerEl)),embeddedMatchesAlpha:view?.file===c.a,embeddedMatchesBeta:view?.file===c.b,hostShown:Boolean(c.leaf?.view.containerEl.isShown()),nativeShown:Boolean(view?.containerEl.isShown()),contentHasMarker:Boolean(content?.textContent.includes('NODEZOOMMARKER')),codeMirrorCount:content?.querySelectorAll('.cm-content').length??0,codeMirrorHasMarker:Boolean(cm?.textContent.includes('NODEZOOMMARKER')),codeMirrorCharacters:cm?.textContent.length??0,codeMirrorRect:rect?{width:rect.width,height:rect.height}:null,buttons:Array.from(content?.querySelectorAll('button')??[]).map(/** Retain only accessible local control labels for a routing failure. */ element=>element.getAttribute('aria-label'))};c.done=true;});
 return JSON.stringify({started:true});
}

/** Restore all independent owned resources, even after native scenario failure or reload. */
function cleanup(){
 const c=window.__kplexMarkdownZoom;if(!c)return JSON.stringify({absent:true});c.cancelled=true;
 c.cleanup=(async()=>{
  const errors=[],steps=[];
  /** Attempt every restoration step independently and retain explicit failure names. */
  const attempt=async(name,work)=>{try{await work();steps.push({name,status:'passed'});}catch(error){errors.push({name,error:String(error)});steps.push({name,status:'failed'});}};
  /** Observe real teardown/state without resuming the cancelled suite’s timer owner. */
  const until=async(predicate,label)=>{const end=Date.now()+15000;while(!predicate()){if(Date.now()>end)throw Error(label);await new Promise(/** Yield within the separate cleanup lifetime. */ resolve=>window.setTimeout(resolve,25));}};
  await attempt('settle-suite',/** Retire async scenario work before restoring native methods and fixture state. */ async()=>{await c.task;});
  await attempt('native-leaf-capture',/** Restore the unchanged WorkspaceLeaf prototype after reload or partial setup failure. */ ()=>{c.restoreCapture?.();});
  c.p=app.plugins.plugins['k-plex']??c.p;
  await attempt('embedded-disposal',/** Stop the current real embedded file owner before deleting fixtures. */ async()=>{c.p.settings.embedCentralNode=false;c.p.index.notify();await until(/** Require native editor React disposal rather than merely clearing its preference. */ ()=>!c.leaf?.view.containerEl.querySelector('.kplex-central-editor-content'),'Embedded cleanup did not finish');});
  await attempt('owned-native-leaves',/** Detach only leaves created by this suite, never preexisting user leaves. */ async()=>{for(const leaf of [...new Set(c.leaves)].reverse()){if(leaf.view.containerEl.isConnected)leaf.detach();}await until(/** Excalidraw must relinquish its file write lifetime before owned folder deletion. */ ()=>!c.embedded?.view?.excalidrawAPI,'Native drawing did not retire');});
  await attempt('owned-fixtures',/** Delete only the freshly created disposable folder after native teardown. */ async()=>{const folder=app.vault.getFolderByPath(c.folder);if(folder)await app.vault.delete(folder,true);});
  await attempt('settings-before-layout',/** Restore settings on the currently loaded instance and flush its queue. */ async()=>{Object.assign(c.p.settings,JSON.parse(JSON.stringify(c.settings)));await c.p.saveSettings(false,false);await c.p.settingsWriteQueue;});
  await attempt('workspace-layout',/** Recreate the exact captured workspace after retiring only owned native leaves. */ async()=>{await app.workspace.changeLayout(c.layout);});
  await attempt('settings-after-layout',/** View initialization may persist preferences; restore original values again afterward. */ async()=>{Object.assign(c.p.settings,JSON.parse(JSON.stringify(c.settings)));await c.p.saveSettings(false,false);await c.p.settingsWriteQueue;});
  await attempt('native-leaf-associations',/** Rebind original native routing owners by serialized identity after reload/layout replacement. */ ()=>{
   /** Locate only the captured original leaf identity in the restored native workspace. */
   const rebind=old=>old?app.workspace.getLeavesOfType(old.getViewState().type).find(/** Reassociate the exact serialized owner rather than another same-file leaf. */ leaf=>leaf.id===old.id)??null:null;
   c.p.linkedDocumentLeaf=rebind(c.owners.linkedDocumentLeaf);c.p.lastDocumentLeaf=rebind(c.owners.lastDocumentLeaf);c.p.recentLeafHistory=c.owners.recentLeafHistory.map(rebind).filter(Boolean);c.p.sidecarLeaves.clear();for(const [oldHost,oldLeaf] of c.owners.sidecarLeaves){const host=rebind(oldHost),leaf=rebind(oldLeaf);if(host&&leaf)c.p.sidecarLeaves.set(host,leaf);}c.p.index.notify();
  });
  await attempt('companion-representation-memory',/** Remove only probe-created remembered drawing representations and restore prior entries. */ ()=>{const modes=app.plugins.plugins['obsidian-excalidraw-plugin']?.excalidrawFileModes;if(modes){for(const key of Object.keys(modes))if(!Object.hasOwn(c.exModes,key))delete modes[key];Object.assign(modes,c.exModes);}});
  await attempt('bounds-sidebars-throttling',/** Restore the exact retained owning native window; a separate Settings window can share the same vault title. */ ()=>{const remote=require('@electron/remote'),win=remote.BrowserWindow.fromId(c.windowId);if(!win||!win.getTitle().includes('kplex-test-small'))throw Error('Original owning test window missing');win.setBounds(c.bounds);if(win.webContents.getBackgroundThrottling()!==c.throttling)win.webContents.setBackgroundThrottling(c.throttling);for(const side of ['left','right']){const split=app.workspace[side+'Split'];if(c.sidebars[side])split.collapse();else split.expand();}});
  await attempt('native-settings-window',/** Reopen only the Settings window that this suite temporarily closed, retaining its remembered page and query. */ ()=>{app.setting.lastTabId=c.settingsWindow.lastTabId;if(c.settingsWindow.open){app.setting.open();if(c.settingsWindow.lastTabId)app.setting.openTabById(c.settingsWindow.lastTabId);if(c.settingsWindow.query!==undefined)app.setting.searchComponent?.setValue?.(c.settingsWindow.query);}});
  const receipt={errors,steps,folderRemoved:!app.vault.getFolderByPath(c.folder),settingsRestored:JSON.stringify(c.p.settings)===JSON.stringify(c.settings),timersRemoved:c.timers.size===0,remainingOwnedLeaves:app.workspace.getLeavesOfType('markdown').concat(app.workspace.getLeavesOfType('canvas'),app.workspace.getLeavesOfType('excalidraw')).filter(/** Count only fixture-bound native workspace leaves. */ leaf=>String(leaf.getViewState().state?.file??'').startsWith(c.folder+'/')).length};
  if(!receipt.folderRemoved||!receipt.settingsRestored||!receipt.timersRemoved||receipt.remainingOwnedLeaves!==0)errors.push({name:'cleanup-contract',error:'Restoration receipt failed'});
  return receipt;
 })().then(/** Publish cleanup independently of the primary suite outcome. */ value=>{c.cleaned=value;},/** Preserve unexpected cleanup rejection for outer reporting. */ error=>{c.cleanupError=String(error);});
 return JSON.stringify({started:true});
}

let attempted=false,started=false;
try{
 assert.equal(cli('vault','info=path'),vault,'Wrong disposable native vault');
 for(const name of ['main.js','styles.css','manifest.json']){const built=sha(readFileSync(`${root}/dist/${name}`)),installed=sha(readFileSync(`${config}/plugins/k-plex/${name}`));report.artifacts[name]={built,installed};assert.equal(installed,built,'Installed/build hash mismatch: '+name);}
 report.obsidian=cli('version');cli('dev:errors','clear');attempted=true;evaluate(`(${install.toString()})()`,'suite-start');started=true;
 const end=Date.now()+240000;
 while(true){await delay(250);const state=await readState('JSON.stringify({done:window.__kplexMarkdownZoom?.done,error:window.__kplexMarkdownZoom?.error})','suite-state',end);if(state.done){report.result=await readState('JSON.stringify(window.__kplexMarkdownZoom?.value??{error:window.__kplexMarkdownZoom?.error,scenarios:window.__kplexMarkdownZoom?.scenarios,failure:window.__kplexMarkdownZoom?.failure})','suite-result',end);if(state.error)throw Error(state.error);break;}assert(Date.now()<end,'Native Markdown zoom suite deadline');}
 const errors=cli('dev:errors');assert(!errors||/^No errors captured\.?$/i.test(errors),'Captured native JavaScript errors');report.nativeErrorsClear=true;report.status='passed';
}catch(error){report.status='failed';report.error=String(error);if(started&&!report.result){try{report.result=evaluate('JSON.stringify({scenarios:window.__kplexMarkdownZoom?.scenarios,failure:window.__kplexMarkdownZoom?.failure,error:window.__kplexMarkdownZoom?.error})','failure-observations');}catch(recoveryError){report.observationRecoveryError=String(recoveryError);}}}
finally{
 const errors=[];
 if(attempted&&!started){try{started=evaluate('JSON.stringify(Boolean(window.__kplexMarkdownZoom))','partial-start-observation');}catch(error){errors.push('partial controller: '+String(error));}}
 if(started){try{const end=Date.now()+120000;evaluate(`(${cleanup.toString()})()`,'cleanup-start',end);while(true){await delay(250);const state=await readState('JSON.stringify({value:window.__kplexMarkdownZoom?.cleaned,error:window.__kplexMarkdownZoom?.cleanupError})','cleanup-state',end);if(state.error)throw Error(state.error);if(state.value){report.cleanup=state.value;break;}assert(Date.now()<end,'Native cleanup deadline');}for(const error of report.cleanup.errors)errors.push(error.name+': '+error.error);evaluate('(/** Remove the controller after all independent cleanup work has settled. */ ()=>{delete window.__kplexMarkdownZoom;return JSON.stringify({removed:true});})()','controller-remove');}catch(error){errors.push('native cleanup: '+String(error));}}
 if(attempted){for(const backup of backups){try{const path=`${config}/${backup.name}`;if(backup.bytes===null){if(existsSync(path))rmSync(path);}else writeFileSync(path,backup.bytes);assert(backup.bytes===null?!existsSync(path):readFileSync(path).equals(backup.bytes),'Original configuration bytes differ');}catch(error){errors.push('configuration '+backup.name+': '+String(error));}}report.configurationRestored=!errors.some(/** Distinguish file restoration from native teardown outcomes. */ value=>value.startsWith('configuration '));}
 if(errors.length){report.cleanupError=errors.join('\n');report.status='failed';}
 report.completedAt=new Date().toISOString();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));
}
console.log(JSON.stringify({status:report.status,error:report.error,cleanupError:report.cleanupError,scenarios:report.result?.scenarios?.length??0,report:join(out,'report.json')}));
if(report.status!=='passed')process.exitCode=1;
