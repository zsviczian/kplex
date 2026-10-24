/** Exact-build native Canvas/Compass settings proof. Test-only registration is scoped to this owned native session. */
import {buildSync} from 'esbuild';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {runControlledProbe} from './controlledProbe.mjs';
import {acceptCanvasSelector} from './canvasSelectorProbe.mjs';

async function scenario(app,c){
 const p=app.plugins.plugins['k-plex'],workspace=app.workspace,tab=p?.settingsTab;
 if(!p||!tab||app.vault.getFiles().length>=1000||app.setting.isOpen)throw Error('Clean disposable Small required');
 const original=structuredClone(p.settings),policy=p.savedSettingsPolicy,layout=workspace.getLayout(),registry=p.viewSettingsRegistry,tabRegistry=tab.viewSettings;
 const remote=require('@electron/remote'),main=remote.getCurrentWindow(),files=[],hosts=[],releases=[],restores=[],cases=[],cleanup=[];
 const folder='Kplex-218-Settings-'+Date.now(),path=name=>folder+'/'+name+'.md';let createdFolder,failure;
 c.settingsMode='main';
 const popoutDescriptor=Object.getOwnPropertyDescriptor(app.setting,'shouldUsePopout');
 app.setting.shouldUsePopout=()=>c.settingsMode==='popout';
 restores.push(()=>{if(popoutDescriptor)Object.defineProperty(app.setting,'shouldUsePopout',popoutDescriptor);else delete app.setting.shouldUsePopout});
 const check=(value,message)=>{if(c.closed||!value)throw Error(message)};
 const wait=async ms=>{check(true,'Retired controller');await new Promise(resolve=>window.setTimeout(resolve,ms));check(true,'Retired controller')};
 const until=async(read,message,maximumMs=20000)=>{const end=Date.now()+maximumMs;while(!read()){check(Date.now()<end,message);await wait(30)}};
 const visible=element=>{if(!element?.isConnected)return false;const rect=element.getBoundingClientRect(),style=element.ownerDocument.defaultView.getComputedStyle(element);return rect.width>0&&rect.height>0&&style.display!=='none'&&style.visibility!=='hidden'};
 const settingsDocument=()=>tab.containerEl.ownerDocument;
 const row=name=>[...settingsDocument().querySelectorAll('.setting-item-name')].find(element=>element.textContent===name&&visible(element))?.closest('.setting-item');
 const keyRow=key=>row(p.translator(key));
 const input=(element,value)=>{const rect=element?.getBoundingClientRect(),style=element&&element.ownerDocument.defaultView.getComputedStyle(element);check(visible(element)&&!element.disabled,'Enabled visible native input required: '+JSON.stringify({present:!!element,type:element?.type,width:rect?.width,height:rect?.height,display:style?.display,visibility:style?.visibility,connected:element?.isConnected}));
  if(element.type==='range'){const keyCode=Number(value)===Number(element.max)?'End':Number(value)===Number(element.min)?'Home':null;check(keyCode,'Native range fixture requests one bounded endpoint');const owner=element.ownerDocument.defaultView.require('@electron/remote').getCurrentWindow();owner.show();owner.focus();owner.webContents.focus();element.focus();check(element.ownerDocument.activeElement===element,'Native range did not take owning-document focus');for(const type of ['keyDown','keyUp'])owner.webContents.sendInputEvent({type,keyCode});return}
  element.value=String(value);element.dispatchEvent(new element.ownerDocument.defaultView.Event('input',{bubbles:true}))};
 const open=async(...pages)=>{
  if(app.setting.isOpen){const previous=app.setting.isInPopoutWindow()?app.setting.getPopoutWindow():null;app.setting.close();if(previous)await until(()=>previous.closed,'Owned Settings popout did not close');await wait(100)}
  main.show();main.focus();main.webContents.focus();p.openSettings();await until(()=>tab.containerEl.isConnected,'Native Settings root absent');
  await until(()=>app.setting.isInPopoutWindow()===(c.settingsMode==='popout'),'Settings window policy did not apply');
  for(const page of pages){check(tab.openSettingsPage(p.translator(page)),'Native page absent: '+page);await wait(60)}
 };
 const clickAction=async key=>{const name=p.translator('colors.edit')+': '+p.translator(key),button=[...settingsDocument().querySelectorAll('.setting-item button[aria-label]')].find(element=>element.getAttribute('aria-label')===name&&visible(element));check(button&&!button.disabled,'Native Edit action missing/disabled: '+JSON.stringify({key,present:!!button,colorFuture:p.settings.colorPreferencesFuture!==undefined,themeFuture:p.settings.appearanceThemesFuture!==undefined}));button.scrollIntoView({block:'nearest'});button.addEventListener('click',event=>cases.push({id:'native-edit-click-delivery',trusted:event.isTrusted}),{once:true});button.click();await wait(40)};
 let pendingObserved=0;
 const observe=(owner,key,label,work)=>{const previous=owner[key];check(typeof previous==='function','Missing observation owner '+key);owner[key]=function(...args){work[label]++;const result=previous.apply(this,args);if(result&&typeof result.then==='function'){pendingObserved++;result.then(()=>pendingObserved--,()=>pendingObserved--)}return result};const restore=()=>{owner[key]=previous};restores.push(restore);return restore};
 c.progress={phase:'native-settings',cases};
 const openTint=tab.openCompassSettings;tab.openCompassSettings=function(...args){const owner=p.captureAppearanceOwner(),page=this.colorActionPage(),scope=this.colorSourceScope(),doc=scope.ownerDocument,generation=this.colorDialogGeneration;cases.push({id:'native-tint-action-start',pageConnected:page.isConnected,scopeConnected:scope.isConnected});const result=openTint.apply(this,args);result.then(()=>cases.push({id:'native-tint-action-complete',ownerCurrent:p.isAppearanceOwnerCurrent(owner),generationCurrent:this.colorDialogGeneration===generation+1,pageConnected:page.isConnected,scopeConnected:scope.isConnected,sameDocument:scope.ownerDocument===doc,dialogs:[...tab.colorDialogs].filter(dialog=>dialog.modalEl.isConnected).length}));return result};restores.push(()=>{tab.openCompassSettings=openTint});
 try{
  remote.app.focus({steal:true});main.show();main.focus();main.webContents.focus();await until(()=>!document.hidden,'Selected renderer unavailable');
  workspace.leftSplit.collapse();workspace.rightSplit.collapse();
  await until(()=>!p.isStartupInitializing()&&!p.index.hasPendingSemanticPreparation(),'Native index not ready');
  if(c.inspect){
   await open('settings.ui.plex.behavior','view.classic');
   const controller=app.setting,methods=new Set();for(let item=controller;item&&methods.size<180;item=Object.getPrototypeOf(item))for(const key of Object.getOwnPropertyNames(item))if(typeof controller[key]==='function')methods.add(key);
   return {mode:'inspection',methods:[...methods],buttons:[...settingsDocument().querySelectorAll('.modal.mod-settings button,.modal.mod-settings .clickable-icon,.setting-page-header .clickable-icon')].slice(0,30).map(element=>({label:element.getAttribute('aria-label'),class:element.className,icon:element.querySelector('svg')?.getAttribute('data-lucide')}))};
  }
  createdFolder=await app.vault.createFolder(folder);
  const child=p.settings.hierarchy.children[0];check(child,'Configured child ontology required');
  for(const name of ['Focus','Root','Repeated']){const file=await app.vault.create(path(name),name==='Root'?`---\n${JSON.stringify(child)}: "[[${path('Repeated')}]]"\n---\n# Root\n`:`# ${name}\n`);files.push(file);p.index.insertCreatedFile(file);releases.push(p.index.acquireSemanticDemand(file.path))}
  await until(()=>files.every(file=>app.metadataCache.getFileCache(file))&&!p.index.hasPendingSemanticPreparation()&&!p.index.hasActiveSemanticPreparation(),'Fixture not ready');
  const probe=c.createProbe({root:path('Root'),repeated:path('Repeated')});
  const second={...probe,id:'test.second',labelKey:'Second probe'},blocked={...probe,id:'test.blocked',labelKey:'Probe without editor',capabilities:{...probe.capabilities,editor:false}};
  const views=new registry.views.constructor([...registry.views.available,probe,second,blocked]);
  const contributed={id:probe.id,items:({key})=>[{name:'Probe ridge offset',control:{type:'slider',key:key('ridgeOffset'),min:0,max:50,step:1}}]};
  const testRegistry=new registry.constructor(views,[...registry.contributions.values(),contributed]);p.viewSettingsRegistry=testRegistry;tab.viewSettings=testRegistry;tab.update();
  const host=workspace.getLeaf('tab');hosts.push(host);await host.setViewState({type:'k-plex-react-view',active:true});await host.view.waitUntilReady();
  const productionRoot=()=>host.view.contentEl.querySelector('.kplex-app');await until(()=>productionRoot()?.querySelector('.kplex-filter-trigger'),'Production panel trigger absent');
  productionRoot().querySelector('.kplex-filter-trigger').click();
  const productionSelect=()=>host.view.containerEl.ownerDocument.querySelector('.kplex-filter-panel .kplex-view-selector select');
  await until(productionSelect,'Production selector absent');check(productionSelect().disabled&&productionSelect().options.length===1&&productionSelect().value==='classic','Production exposes an unfinished view');
  host.view.containerEl.ownerDocument.querySelector('.kplex-filter-panel-header button').click();cases.push({id:'production-one-option-compass'});
  const session=host.view.documentSession.plexView;session.registry=views;await p.setDocumentSyncMode(host,'off');
  host.view.centerPresentation.update({embedCentralNode:false});p.notifyNavigation(path('Focus'),host);session.select(probe.id);
  const root=()=>host.view.contentEl.querySelector('.kplex-app'),node=()=>root()?.querySelector('[data-kplex-keyboard-id="layout-root"]');
  await until(()=>visible(node()),'Test-only native view absent');
  await until(()=>!p.index.hasPendingSemanticPreparation()&&!p.index.hasActiveSemanticPreparation(),'Native scope did not settle');await p.settingsWriteQueue;await wait(250);
  const work={reads:0,parses:0,semantic:0,builds:0,acquisitions:0,saves:0},stop=[observe(app.vault,'read','reads',work),observe(app.vault,'cachedRead','reads',work),observe(p.index.metadataParser,'parse','parses',work),observe(p.index,'refreshSemanticSettings','semantic',work),observe(p.index,'rebuild','builds',work),observe(p.index,'rebuildProgressively','builds',work),observe(p.index,'acquireSemanticDemand','acquisitions',work),observe(p,'saveSettings','saves',work)];
  await wait(100);check(Object.values(work).every(value=>value===0),'Quiet control did source work');
  const before={root:node().dataset.kplexPath,attention:session.definition.id,state:JSON.stringify(session.getState()),left:node().style.left};
  await open('settings.ui.plex.behavior');
  check(keyRow('settings.centralNodeEditor.defaultMode')&&keyRow('settings.ui.maximum.nodes.per.zone'),'Shared controls missing');
  check(!keyRow('settings.ui.parent.maximum.height')&&!keyRow('settings.ui.infer.normal.links.as.friends'),'Moved controls duplicated on shared page');
  check(tab.openSettingsPage(p.translator('view.classic')),'Compass contribution missing');await wait(70);
  check(keyRow('settings.ui.parent.maximum.height')&&keyRow('settings.ui.show.siblings')&&keyRow('compass.title'),'Compass controls missing');
  const slider=keyRow('settings.ui.parent.maximum.height').querySelector('input[type=range]');const next=Number(slider.value)===800?140:800;
  slider.focus();input(slider,next);await until(()=>p.settings.parentMaxHeight===next,'Actual legacy slider did not save');await p.settingsWriteQueue;
  check((await p.loadData()).parentMaxHeight===next,'Legacy slider not durable');
  cases.push({id:'native-legacy-slider-save',pendingAtDurableReceipt:pendingObserved});
  await until(()=>pendingObserved===0&&!p.index.hasPendingSemanticPreparation()&&!p.index.hasActiveSemanticPreparation(),'Legacy slider completion still pending before opening tint');await wait(0);
  await clickAction('compass.title');await until(()=>[...tab.colorDialogs].some(dialog=>dialog.modalEl.isConnected),'Area tint did not reuse native modal');
  const tint=[...tab.colorDialogs].find(dialog=>dialog.modalEl.isConnected);check(tint.modalEl.ownerDocument===settingsDocument(),'Area tint in wrong document');tint.close();
  cases.push({id:'main-shared-compass-native-controls-and-area-tint',parentMaxHeight:next});
  await open('settings.ui.ontology');check(keyRow('settings.ui.infer.normal.links.as.friends')&&keyRow('settings.datePropertyRelations.name'),'Ontology policy controls absent');check(!keyRow('settings.ui.reverse.displayed.arrow.direction'),'Arrow presentation misplaced');
  await open('settings.ui.visual.styling','settings.ui.link.styling');check(keyRow('settings.ui.reverse.displayed.arrow.direction'),'Displayed arrows missing');
  await until(()=>pendingObserved===0&&!p.index.hasPendingSemanticPreparation()&&!p.index.hasActiveSemanticPreparation(),'Existing flat-control completion did not settle');
  const legacyControlWork={...work};for(const key of Object.keys(work))work[key]=0;
  await wait(100);check(Object.values(work).every(value=>value===0),'Type-configuration quiet control did work');
  await open('settings.ui.plex.behavior');check(tab.openSettingsPage(probe.labelKey),'Test-only contributed page missing');await wait(70);
  const contributedRow=row('Probe ridge offset'),contributedSlider=contributedRow?.querySelector('input[type=range]');check(contributedSlider,'Actual contributed native slider absent');
  contributedSlider.focus();input(contributedSlider,50);await until(()=>node()?.style.left!==before.left,'Type configuration did not reach native renderer');await p.settingsWriteQueue;
  check(settingsDocument().activeElement===contributedSlider,'Background reflow stole native Settings focus');
  check(node().dataset.kplexPath===before.root&&JSON.stringify(session.getState())===before.state,'Type setting retargeted root/session');
  check((await p.loadData()).canvasViewSettings[probe.id].values.ridgeOffset===50,'Contributed setting not durable');
  cases.push({id:'main-test-contribution-to-effective-native-view',beforeLeft:before.left,afterLeft:node().style.left,rootRetained:true,sessionRetained:true,focusRetained:true});
  await until(()=>pendingObserved===0,'Type-configuration writer did not complete');
  for(const restore of stop)restore();check(Object.values(work).every(value=>value===0),'New type configuration performed source/semantic or compatibility-save work');
  cases.push({id:'native-type-configuration-zero-work',work:{...work}});
  const saveData=p.saveData;let rejectedSaves=0;
  p.saveData=async()=>{rejectedSaves++;throw Error('Owned native configuration storage failure')};restores.push(()=>{p.saveData=saveData});
  try{input(contributedSlider,0);await until(()=>rejectedSaves===1,'Native failed-save control did not submit');await p.settingsWriteQueue;await wait(100);
   check(p.settings.canvasViewSettings[probe.id].values.ridgeOffset===50,'Failed native save published configuration');
   check(Number(row('Probe ridge offset')?.querySelector('input[type=range]')?.value)===50,'Failed native save left an optimistic control value');
   cases.push({id:'native-contributed-save-failure-rolls-back-control',rejectedSaves});
  }finally{p.saveData=saveData}
  const recoveredSlider=row('Probe ridge offset')?.querySelector('input[type=range]');input(recoveredSlider,0);
  await until(()=>p.settings.canvasViewSettings[probe.id].values.ridgeOffset===0,'Replacement native control could not save after recovery');await p.settingsWriteQueue;
  check((await p.loadData()).canvasViewSettings[probe.id].values.ridgeOffset===0,'Recovered native control not durable');
  cases.push({id:'native-contributed-control-recovers-after-storage-failure'});
  const search=app.setting.searchComponent?.inputEl;check(search?.ownerDocument===settingsDocument(),'Native global Settings search absent');input(search,p.translator('settings.ui.sibling.relative.size'));
  const result=()=>[...(app.setting.searchResultsEl?.querySelectorAll('.setting-search-result-item')??[])].find(element=>visible(element)&&element.querySelector('.vertical-tab-nav-item-title')?.textContent.trim()===p.translator('settings.ui.sibling.relative.size'));
  await until(result,'Moved control absent from native search');result().click();await until(()=>keyRow('settings.ui.sibling.relative.size'),'Search did not reach Compass control');
  tab.focusSetting(p.translator('settings.ui.sibling.relative.size'));await until(()=>keyRow('settings.ui.sibling.relative.size').contains(settingsDocument().activeElement),'Moved native control did not receive focus');
  cases.push({id:'main-native-search-and-moved-control-focus'});
  const back=app.setting.getCurrentPageEl()?.querySelector('.setting-page-back-button');check(visible(back),'Native subpage Back control missing');back.click();
  await until(()=>keyRow('settings.centralNodeEditor.defaultMode'),'Native Back did not return to Canvas behavior');check(tab.openSettingsPage(p.translator('view.classic')),'Compass entry absent after native Back');
  cases.push({id:'main-native-back-navigation'});
  c.settingsMode='popout';await open('settings.ui.plex.behavior','view.classic');
  check(settingsDocument()!==document&&app.setting.isInPopoutWindow(),'Settings did not use an actual popout');
  const popSlider=keyRow('settings.ui.sibling.relative.size')?.querySelector('input[type=range]');check(popSlider,'Popout legacy control absent');
  const siblingNext=Number(popSlider.value)===85?30:85;popSlider.focus();input(popSlider,siblingNext);
  await until(()=>p.settings.siblingRelativeSize===siblingNext,'Popout control did not save');await p.settingsWriteQueue;
  check((await p.loadData()).siblingRelativeSize===siblingNext,'Popout control not durable');
  tab.focusSetting(p.translator('settings.ui.sibling.relative.size'));await until(()=>keyRow('settings.ui.sibling.relative.size').contains(settingsDocument().activeElement),'Popout focus routing failed');
  await clickAction('compass.title');await until(()=>[...tab.colorDialogs].some(dialog=>dialog.modalEl.isConnected),'Popout area tint absent');
  const popTint=[...tab.colorDialogs].find(dialog=>dialog.modalEl.isConnected);check(popTint.modalEl.ownerDocument===settingsDocument(),'Popout tint adopted wrong document');popTint.close();
  cases.push({id:'native-settings-popout-control-focus-and-tint',siblingRelativeSize:siblingNext});
  await c.acceptSelector({app,p,c,host,views,probe,files,hosts,restores,cases,check,wait,until,observe});
  c.progress={phase:'native-main-complete',cases,work,legacyControlWork};return {cases,work,legacyControlWork,mode:'acceptance'};
 }catch(error){failure=error;c.progress={...c.progress,cases};throw error}
 finally{
  const errors=[];const clean=async(label,action)=>{try{await action();cleanup.push({label,status:'passed'})}catch(error){errors.push(label+': '+String(error));cleanup.push({label,status:'failed',error:String(error)})}c.progress={...c.progress,cleanup}};
  for(const restore of restores.reverse())await clean('restore-observer',restore);
  await clean('close-settings',()=>{if(app.setting.isOpen)app.setting.close();for(const dialog of [...tab.colorDialogs])dialog.close()});
  p.viewSettingsRegistry=registry;tab.viewSettings=tabRegistry;await clean('restore-settings-definitions',()=>tab.update());
  for(const host of hosts.reverse())if(workspace.getLeafById(host.id)===host)await clean('detach-owned-host',()=>host.detach());
  for(const release of releases.reverse())await clean('release-source-demand',release);
  p.settings=original;await clean('restore-live-settings',()=>p.saveSettings(false,false));p.savedSettingsPolicy=policy;
  await clean('restore-workspace',()=>workspace.changeLayout(layout));
  for(const file of files.reverse())if(app.vault.getFileByPath(file.path)===file)await clean('delete-fixture',()=>app.vault.delete(file,true));
  if(createdFolder&&app.vault.getFolderByPath(folder)===createdFolder&&!createdFolder.children.length)await clean('delete-folder',()=>app.vault.delete(createdFolder,true));
  await clean('drain-settings',()=>p.settingsWriteQueue);await new Promise(resolve=>window.setTimeout(resolve,500));
  await clean('restore-settings-bytes',()=>app.vault.adapter.write(p.manifest.dir+'/data.json',c.originalData));
  if(errors.length)throw Error((failure?String(failure)+'; ':'')+'Native settings cleanup: '+errors.join('; '));
 }
}

if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Explicit Small fixture required');
const bundle=buildSync({entryPoints:['tests/support/plexViewProbe.ts'],bundle:true,write:false,platform:'browser',format:'cjs'}).outputFiles[0].text;
const definitions='c.inspect='+JSON.stringify(process.env.KPLEX_CANVAS_SETTINGS_INSPECT==='true')+';c.osSelectKeys='+JSON.stringify(process.env.KPLEX_CANVAS_SELECTOR_OS_KEYS==='true')+';c.acceptSelector='+acceptCanvasSelector.toString()+';c.originalData='+JSON.stringify(readFileSync(join(process.env.KPLEX_TEST_CONFIG_DIR,'plugins/k-plex/data.json'),'utf8'))+';c.createProbe=(()=>{const module={exports:{}},exports=module.exports;'+bundle+';return module.exports.createProbeViewDefinition})();';
await runControlledProbe('canvas-settings-218',scenario,definitions,['src/settings.ts','src/ui/plexViews/settingsContributions.ts','src/core/plex/views/configuration.ts','src/adapters/obsidian/settingsReconciliation.ts','scripts/testing/obsidian/canvasSelectorProbe.mjs'],{maximumMs:240000});
