/** Exact-build native Mind Map export acceptance. The shared transport verifies disposable
 * vault identity/artifact hashes and restores settings bytes; this scenario owns its notes,
 * canvases, clipboard, menu forwarding and bounded zero-source-work observation. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {runControlledProbe} from './controlledProbe.mjs';
import {nativeDocumentSessions} from './nativeDocumentSessions.mjs';
import {validateTarget} from './runner.mjs';

/** Main-process-only test ownership: select one unique download destination before Electron returns from will-download. */
function ownNativeDownload(contents,filename,path){
 if(contents.__kplex237Download)throw Error('Existing native download owner');
 const state={done:false,status:null,events:[]},session=contents.session;let item,finished;
 const receive=(_event,candidate)=>{if(candidate.getFilename()!==filename)return;item=candidate;state.events.push({name:item.getFilename(),scheme:item.getURL().split(':')[0]});finished=(_event,status)=>{state.done=true;state.status=status};item.once('done',finished);item.setSavePath(path)};
 const cleanup=()=>{session.removeListener('will-download',receive);contents.removeListener('destroyed',cleanup);if(item){item.removeListener('done',finished);if(!state.done)item.cancel()}delete contents.__kplex237Download};
 contents.__kplex237Download={state,cleanup};session.on('will-download',receive);contents.once('destroyed',cleanup);return true;
}

/** Exercise the production formatter/dialog/command in independent main and popout sessions. */
async function scenario(app,c){
 const p=app.plugins.plugins['k-plex'],workspace=app.workspace;
 if(!p||app.vault.getFiles().length>=1000||app.setting.isOpen)throw Error('Prepared disposable Small required');
 const original=structuredClone(p.settings),policy=p.savedSettingsPolicy,layout=workspace.getLayout(),sessions=c.documentSessions(p),owners=sessions.capture();
 const files=[],hosts=[],releases=[],restores=[],cases=[],folder='Kplex-237-Export-'+Date.now();let createdFolder,failure,originalClipboard;
 /** Bound every continuation to this one native probe. */
 const check=(value,message)=>{if(c.closed||!value)throw Error(message)};
 /** Own task yields without changing host scheduling or throttling. */
 const wait=async ms=>{check(true,'Retired probe');await new Promise(resolve=>window.setTimeout(resolve,ms));check(true,'Retired probe')};
 /** Treat one fixed readiness deadline as a failure, not permission to restart the scenario. */
 const until=async(read,message)=>{const end=Date.now()+20000;while(!read()){check(Date.now()<end,message);await wait(30)}};
 const path=name=>folder+'/'+name+'.md';
 const root=host=>host.view.contentEl.querySelector('.kplex-app');
 const session=host=>host.view.documentSession.plexView;
 const surface=host=>[...p.actionSurfaceHosts].find(([,owner])=>owner.leaf===host)?.[0];
 const dialog=host=>root(host)?.ownerDocument.querySelector('.kplex-mindmap-markdown-export');
 const button=(modal,key)=>[...modal.querySelectorAll('button')].find(button=>button.textContent===p.translator(key));
 /** Native input events exercise the real public TextComponent handler. */
 const edit=(input,value)=>{const win=input.ownerDocument.defaultView;Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new win.Event('input',{bubbles:true}))};
 const close=host=>{const modal=dialog(host);if(modal)button(modal,'common.cancel')?.click()};
 /** Native success closes the exact modal and uses the shared Obsidian Notice feedback. */
 const copied=async modal=>until(()=>!modal.isConnected&&[...new Set([workspace.containerEl.ownerDocument,modal.ownerDocument])].some(document=>[...document.querySelectorAll('.notice')].some(notice=>notice.textContent.includes(p.translator('export.markdown.copied')))),'Copy did not close modal and show Notice');

 /** Deliver a trusted user gesture for clipboard/download APIs rather than relying on synthetic click permission. */
 const click=async element=>{check(element?.isConnected&&!element.disabled,'Enabled native button required');const doc=element.ownerDocument,win=doc.defaultView.require('@electron/remote').getCurrentWindow();win.show();win.focus();win.webContents.focus();element.scrollIntoView({block:'nearest'});await wait(60);const r=element.getBoundingClientRect(),x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2);check(element.contains(doc.elementFromPoint(x,y)),'Native button obscured');let trusted=false;const record=event=>{trusted=event.isTrusted};element.addEventListener('click',record,{once:true});try{win.webContents.sendInputEvent({type:'mouseMove',x,y});for(const type of ['mouseDown','mouseUp'])win.webContents.sendInputEvent({type,x,y,button:'left',clickCount:1});await until(()=>trusted,'Trusted button activation absent')}finally{element.removeEventListener('click',record)}};

 /** Observe exact originals with descriptor-preserving cleanup; no production instrumentation is added. */
 const observe=(owner,key,counter,counts)=>{check(typeof owner?.[key]==='function','Missing counter owner '+key);const original=owner[key],descriptor=Object.getOwnPropertyDescriptor(owner,key);owner[key]=function(...args){counts[counter]++;return original.apply(this,args)};const restore=()=>{if(descriptor)Object.defineProperty(owner,key,descriptor);else delete owner[key]};restores.push(restore);return restore};
 /** Snapshot per-canvas intent and the actual camera transform, independent of global active-file state. */
 const state=host=>JSON.stringify({center:host.view.documentSession.centerPath,root:session(host).layoutRoot(host.view.documentSession.centerPath),view:session(host).definition.id,state:session(host).state,camera:root(host).querySelector('.kplex-camera')?.style.transform,editor:session(host).editors.bindings.map(row=>row.id)});
 c.progress={phase:'startup',cases};
 try{
  const remote=require('@electron/remote'),win=remote.getCurrentWindow();if(remote.process.platform==='darwin')remote.app.focus({steal:true});win.show();win.focus();win.webContents.focus();
  await until(()=>!p.isStartupInitializing()&&!p.index.hasPendingSemanticPreparation()&&!p.index.hasActiveSemanticPreparation(),'Startup not settled');
  originalClipboard=await window.navigator.clipboard.readText();await sessions.off();c.progress={phase:'fixture',cases};
  createdFolder=await app.vault.createFolder(folder);const child=p.settings.hierarchy.children[0];check(child,'Configured child ontology required');
  const children={R:['A','C'],A:['B'],C:['B'],B:['R'],Other:[]};
  for(const [name,targets]of Object.entries(children)){const file=await app.vault.create(path(name),'---\n'+JSON.stringify(child)+': '+JSON.stringify(targets.map(target=>'[['+path(target)+']]'))+'\n---\n# '+name+'\n');files.push(file);p.index.insertCreatedFile(file);releases.push(p.index.acquireSemanticDemand(file.path))}
  await until(()=>{const cached=files.filter(file=>app.metadataCache.getFileCache(file)).length;c.fixture={cached,total:files.length,pending:p.index.hasPendingSemanticPreparation(),active:p.index.hasActiveSemanticPreparation(),diagnostics:p.index.getSemanticPreparationDiagnostics()};return cached===files.length&&!c.fixture.pending&&!c.fixture.active},'Fixture did not settle');
  Object.assign(p.settings,{documentSyncMode:'off',sidecarOpen:false,embedCentralNode:false,autoOpenCentralDocument:false,followActiveFile:false,animationSpeed:0,allowAutozoom:false,renderSiblings:false,showPageNodes:true,showFolderNodes:false,showTagNodes:false,showCrossLinks:true,graphLenses:[],applyPowerFilter:false,groupRelations:false,
   canvasViewSettings:{...p.settings.canvasViewSettings,mindmap:{version:1,values:{arrangement:'balanced',initialGenerations:3,maximumDepth:6,maximumOccurrences:128,horizontalSpacing:96,verticalSpacing:24}}}});p.index.notifyPresentation();
  /** Create only probe-owned leaves; ordinary user tabs are never repurposed. */
  const create=async(name,popout=false)=>{const host=workspace.getLeaf(popout?'window':'tab');hosts.push(host);await host.setViewState({type:'k-plex-react-view',active:true});await workspace.revealLeaf(host);await host.view.waitUntilReady();host.view.centerPresentation.update({embedCentralNode:false});p.notifyNavigation(path(name),host);await until(()=>host.view.documentSession.centerPath===path(name),'Fixture center absent');session(host).select('mindmap');session(host).setRoot(path(name));await until(()=>root(host)?.querySelector('[data-kplex-keyboard-id="root"]')&&session(host).definition.id==='mindmap','Native Mind Map absent');return host};
  c.progress={phase:'native-canvas',cases};const host=await create('R');await until(()=>root(host).querySelectorAll('[data-kplex-path]').length>=5&&!p.index.hasPendingSemanticPreparation()&&!p.index.hasActiveSemanticPreparation(),'Constructed hierarchy absent');await wait(1500);await until(()=>!p.rebuildTask&&!p.index.hasPendingSemanticPreparation()&&!p.index.hasActiveSemanticPreparation(),'Fixture work did not settle');
  const counts={reads:0,parses:0,acquisitions:0,rebuilds:0,semanticRefreshes:0};
  const stop=[observe(app.vault,'read','reads',counts),observe(app.vault,'cachedRead','reads',counts),observe(p.index.sourceAcquisition,'parse','parses',counts),observe(p.index.sourceAcquisition,'acquire','acquisitions',counts),observe(p.index,'rebuild','rebuilds',counts),observe(p.index,'refreshSemanticSettings','semanticRefreshes',counts)];
  c.progress={phase:'export-menu-copy',cases};const coordinator={checks:0};observe(p,'rebuildIndex','checks',coordinator);const semanticBefore=p.index.getSemanticPreparationDiagnostics().published;const before=state(host);let menu;
  const nativeMenu=p.showKplexMenuAtPosition,menuDescriptor=Object.getOwnPropertyDescriptor(p,'showKplexMenuAtPosition');
  p.showKplexMenuAtPosition=function(value,...args){menu=value;value.setUseNativeMenu(false);return nativeMenu.call(this,value,...args)};
  restores.push(()=>{if(menuDescriptor)Object.defineProperty(p,'showKplexMenuAtPosition',menuDescriptor);else delete p.showKplexMenuAtPosition});
  const node=root(host).querySelector('[data-kplex-keyboard-id="root"]'),bounds=node.getBoundingClientRect();node.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:bounds.left+10,clientY:bounds.top+10}));
  const exportItem=menu?.items.find(item=>item.titleEl?.textContent===p.translator('actions.view.export.markdown'));check(exportItem,'Central node export menu missing');exportItem.callback(new MouseEvent('click'));p.dismissKplexMenu();
  await until(()=>dialog(host),'Native export dialog absent');let modal=dialog(host),preview=modal.querySelector('textarea').value;
  check(preview.startsWith('# [[')&&preview.includes('R')&&preview.includes('A')&&preview.includes('B'),'Native hierarchy/links missing');
  await click(button(modal,'export.markdown.copy'));await copied(modal);
  check(await window.navigator.clipboard.readText()===preview,'Clipboard differs from exact preview');check(state(host)===before,'Export changed canvas state');
  check(Object.values(counts).every(value=>value===0),'Capture/preview/copy performed source/index work: '+JSON.stringify(counts));cases.push({id:'central-menu-preview-copy-zero-source-work',counts:{...counts}});
  check((await p.actionManager.dispatch({id:'view.export.markdown',source:'internal',surfaceId:surface(host)})).status==='opened','Save dialog unavailable');await until(()=>dialog(host),'Save dialog absent');modal=dialog(host);check(!modal.querySelector('input'),'Filename input remains');
  c.progress={phase:'system-download',cases};const filename='R - '+p.translator('export.markdown.filename')+'.md',contents=win.webContents;
  const main=source=>remote.require('vm').runInThisContext(source);
  check(main('('+c.ownNativeDownloadSource+')')(contents,filename,c.outputPath),'Native download ownership rejected');
  const downloadState=()=>main('(function(contents){return JSON.stringify(contents.__kplex237Download?.state??null)})')(contents);
  restores.push(()=>main('(function(contents){contents.__kplex237Download?.cleanup();return true})')(contents));
  await click(button(modal,'export.markdown.save'));await until(()=>JSON.parse(downloadState())?.done,'Native system download did not finish: '+downloadState()+' '+modal.textContent);check(JSON.parse(downloadState()).status==='completed','Native download failed: '+downloadState());
  check(require('node:fs').readFileSync(c.outputPath,'utf8')===preview,'Downloaded bytes differ from the exact preview');
  check(Object.values(counts).every(value=>value===0),'Native Save performed source/index work: '+JSON.stringify(counts));
  check(p.index.getSemanticPreparationDiagnostics().published===semanticBefore,'Export published new graph semantics');cases.push({id:'native-save-download-exact-bytes-zero-vault-work',counts:{...counts},coordinatorChecks:coordinator.checks,systemDestinationPicker:'Probe selected an owned temporary destination through the real DownloadItem; OS picker/overwrite UI was not automated'});
  for(const restore of stop)restore();close(host);
  c.progress={phase:'fold-and-subtree',cases};
  const aId=JSON.stringify([path('R'),path('A')]),aTarget={kind:'explicit',node:{identity:path('A'),path:path('A'),kind:'file'},occurrenceId:aId};
  const fold=await p.actionManager.dispatch({id:'branch.toggle',source:'internal',surfaceId:surface(host),target:aTarget});check(fold.status==='completed','Could not collapse the selected branch');await wait(100);
  const branchResult=await p.actionManager.dispatch({id:'view.export.markdown',source:'internal',surfaceId:surface(host),target:aTarget});check(branchResult.status==='opened','Selected branch export rejected');await until(()=>dialog(host),'Branch dialog absent');modal=dialog(host);
  const scope=modal.querySelector('select');check(scope&&[...scope.options].some(option=>option.value===aId),'Selected subtree scope absent');scope.value=aId;scope.dispatchEvent(new scope.ownerDocument.defaultView.Event('change',{bubbles:true}));
  const branchText=modal.querySelector('textarea').value;check(branchText.trim().startsWith('- [[')&&branchText.includes('|A]]')&&!branchText.includes('|B]]'),'Collapsed selected subtree expanded or retained another branch');close(host);cases.push({id:'native-collapsed-selected-subtree-preview'});
  c.progress={phase:'filters',cases};root(host).querySelector('.kplex-filter-trigger').click();await until(()=>root(host).ownerDocument.querySelector('.kplex-filter-panel .kplex-quick-lens-row input'),'Quick filter absent');
  const filter=root(host).ownerDocument.querySelector('.kplex-filter-panel .kplex-quick-lens-row input');edit(filter,'C');await wait(200);root(host).querySelector('.kplex-filter-trigger').click();
  const filtered=await p.actionManager.dispatch({id:'view.export.markdown',source:'internal',surfaceId:surface(host)});check(filtered.status==='opened','Filtered export rejected');await until(()=>dialog(host),'Filtered dialog absent');modal=dialog(host);const filteredText=modal.querySelector('textarea').value;
  check(filteredText.includes('|C]]')&&!filteredText.includes('|A]]')&&!filteredText.includes('|B]]'),'Current filter did not constrain export');close(host);cases.push({id:'native-filtered-hierarchy-preview'});
  workspace.setActiveLeaf(host,{focus:true});check(app.commands.commands['k-plex:kplex-export-mindmap-markdown']?.checkCallback(true),'Published native export command unavailable');app.commands.executeCommandById('k-plex:kplex-export-mindmap-markdown');await until(()=>dialog(host),'Command did not open export');/* A user cannot Cancel before the command dispatch microtasks finish. */await wait(0);close(host);cases.push({id:'native-command-palette-publication-and-execution'});

  c.progress={phase:'all-canvas-types',cases};
  root(host).querySelector('.kplex-filter-trigger').click();await until(()=>root(host).ownerDocument.querySelector('.kplex-filter-panel .kplex-filter-clear'),'Filter clear absent');root(host).ownerDocument.querySelector('.kplex-filter-panel .kplex-filter-clear').click();root(host).querySelector('.kplex-filter-trigger').click();
  p.settings.graphDepth=2;p.index.notifyPresentation();await wait(200);

  for(const view of['classic','wuxing','mindmap']){
   session(host).select(view);if(view==='mindmap')session(host).setRoot(path('R'));
   await until(()=>session(host).definition.id===view&&root(host).querySelectorAll('[data-kplex-path]').length>=2&&!p.rebuildTask&&!p.index.hasPendingSemanticPreparation()&&!p.index.hasActiveSemanticPreparation(),'Export view not settled '+view);await wait(200);
   workspace.setActiveLeaf(host,{focus:true});check(app.commands.commands['k-plex:kplex-export-mindmap-markdown'].checkCallback(true),'Markdown command unavailable in '+view+' '+JSON.stringify({availability:p.actionManager.check({id:'view.export.markdown',source:'obsidian-command'}),snapshot:p.actionManager.readSnapshot(surface(host)),error:root(host).querySelector('.kplex-view-error')?.textContent}));
   menu=undefined;const centerNode=root(host).querySelector('[data-kplex-path="'+path('R')+'"]'),r=centerNode.getBoundingClientRect();centerNode.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:r.left+8,clientY:r.top+8}));check(menu?.items.some(item=>item.titleEl?.textContent===p.translator('actions.view.export.markdown')),'Central export menu missing in '+view);p.dismissKplexMenu();
   const mapBefore=state(host),work={reads:0,parses:0,acquisitions:0,rebuilds:0,semanticRefreshes:0},stopWork=[observe(app.vault,'read','reads',work),observe(app.vault,'cachedRead','reads',work),observe(p.index.sourceAcquisition,'parse','parses',work),observe(p.index.sourceAcquisition,'acquire','acquisitions',work),observe(p.index,'rebuild','rebuilds',work),observe(p.index,'refreshSemanticSettings','semanticRefreshes',work)];
   app.commands.executeCommandById('k-plex:kplex-export-mindmap-markdown');await until(()=>dialog(host),'Export did not open in '+view);modal=dialog(host);
   const preview=modal.querySelector('textarea');check(!preview.hasAttribute('aria-label')&&!preview.hasAttribute('title'),'Markdown preview retains a tooltip');
   const ontology=[...modal.querySelectorAll('select')].find(select=>[...select.options].map(option=>option.value).join(',')==='none,visible,all');check(ontology,'Ontology options missing');
   const snapshots={};for(const mode of['none','visible','all']){ontology.value=mode;ontology.dispatchEvent(new ontology.ownerDocument.defaultView.Event('change',{bubbles:true}));snapshots[mode]=preview.value;check(preview.value.includes('|R]]')&&preview.value.includes('|C]]'),'Current view nodes lost in '+view+'/'+mode);}
   if(view==='classic'){const mini=root(host).querySelectorAll('.kplex-expanded-mini-thought[data-kplex-path="'+path('B')+'"]');check(mini.length>=2,'Constructed repeated descendant fixture missing');check(snapshots.all.split('|B]]').length-1>=mini.length,'Displayed Compass descendants were omitted');}
   check(!snapshots.none.includes('::'),'None mode retained ontology');check(snapshots.all.toLocaleLowerCase().includes(child.toLocaleLowerCase()+'::'),'All mode lost the resolved driving field '+view+': '+snapshots.all);
   check(Object.values(work).every(value=>value===0),'Ontology preview did source/index work '+JSON.stringify(work));
   await click(button(modal,'export.markdown.copy'));await copied(modal);check(await window.navigator.clipboard.readText()===snapshots.all,'Current map clipboard differs from all-ontology preview');
   check(state(host)===mapBefore,'Markdown export changed canvas state '+view);for(const restore of stopWork)restore();cases.push({id:'all-canvas-ontology-options-copy',view,counts:work,visible:snapshots.visible,all:snapshots.all});
  }
  c.progress={phase:'independent-popout',cases};const other=await create('Other',true);await wait(200);const otherBefore=state(other),mainBefore=state(host);
  const result=await p.actionManager.dispatch({id:'view.export.markdown',source:'internal',surfaceId:surface(other)});check(result.status==='opened','Popout action rejected');await until(()=>dialog(other),'Popout dialog absent');modal=dialog(other);check(modal.querySelector('textarea').value.includes('Other')&&!modal.querySelector('textarea').value.includes(path('A')),'Popout exported another canvas');await click(button(modal,'export.markdown.copy'));await copied(modal);check(state(other)===otherBefore&&state(host)===mainBefore,'Independent export changed a canvas');close(other);cases.push({id:'independent-main-popout-root-and-owning-window-copy'});
  return{cases,limitations:'Native DOM/menu callbacks and real clipboard/system download on this host; physical mobile input and full Mindmap Builder drawing rendering remain separate. The OS destination/overwrite UI and mobile share sheet are not automated.'};
 }catch(error){failure=error;c.progress={cases,fixture:c.fixture,failure:String(error),dialogs:[...document.querySelectorAll('.kplex-mindmap-markdown-export')].map(el=>el.textContent)};throw error}
 finally{
  const errors=[];const clean=async(label,action)=>{try{await action()}catch(error){errors.push(label+': '+String(error))}};
  for(const restore of restores.reverse())await clean('restore-forwarding-observer',restore);
  for(const host of hosts.reverse())await clean('close-owned-canvas',async()=>{close(host);if(workspace.getLeafById(host.id)===host)host.detach()});
  for(const release of releases.reverse())await clean('release-fixture-demand',release);
  p.settings=original;await clean('restore-live-settings',()=>p.saveSettings(false,false));p.savedSettingsPolicy=policy;
  await clean('restore-workspace',()=>workspace.changeLayout(layout));await clean('restore-document-sessions',()=>sessions.restore(owners));
  for(const file of files.reverse())if(app.vault.getFileByPath(file.path)===file)await clean('delete-output-or-fixture',()=>app.vault.delete(file,true));
  if(createdFolder&&app.vault.getFolderByPath(folder)===createdFolder&&!createdFolder.children.length)await clean('delete-fixture-folder',()=>app.vault.delete(createdFolder,true));
  if(originalClipboard!==undefined)await clean('restore-clipboard',()=>window.navigator.clipboard.writeText(originalClipboard));
  await new Promise(resolve=>window.setTimeout(resolve,500));await clean('drain-settings',()=>p.settingsWriteQueue);await clean('restore-settings-bytes',()=>app.vault.adapter.write(p.manifest.dir+'/data.json',c.originalData));
  if(errors.length)throw Error((failure?String(failure)+'; ':'')+errors.join('; '));
 }
}
if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Explicit disposable Small required');
const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
await runControlledProbe('mindmap-markdown-export-237',scenario,'c.ownNativeDownloadSource='+JSON.stringify(ownNativeDownload.toString())+';c.outputPath='+JSON.stringify(join(process.env.KPLEX_HOST_REPORT_DIR,'native-export.md'))+';c.originalData='+JSON.stringify(readFileSync(join(target.pluginDir,'data.json'),'utf8'))+';c.documentSessions=('+nativeDocumentSessions.toString()+');',
 ['src/core/plex/export/mindMapMarkdown.ts','src/ui/export/captureMindMapMarkdown.ts','src/ui/export/MindMapMarkdownModal.ts','src/adapters/obsidian/markdownExportFile.ts','src/ui/PlexGraph.tsx'],{maximumMs:240000});
