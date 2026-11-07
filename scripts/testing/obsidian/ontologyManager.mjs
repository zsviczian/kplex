/** Exact-build unified ontology manager acceptance. Reuses native style-manager mechanics and
 * the existing controlled transport/restoration owner; no production vault or benchmark is used. */
import assert from 'node:assert/strict';import {readFileSync,writeFileSync,existsSync} from 'node:fs';import {join,resolve} from 'node:path';
import {obsidianCliExecutable,spawnNativeSync} from './processTools.mjs';import {validateTarget} from './runner.mjs';import {runControlledProbe} from './controlledProbe.mjs';

/** Exercise real declarative Settings, pair editing and read-only operation guards with no new scheduler. */
async function scenario(app,c){
 const p=app.plugins.plugins['k-plex'];if(!p||app.setting.isOpen||app.vault.getFiles().length>=1000)throw Error('Clean disposable Small vault required');
 await p.settingsWriteQueue;await p.settingsReconciliation?.prepare(false);
 const settings=structuredClone(p.settings),policy=p.savedSettingsPolicy,layout=app.workspace.getLayout(),dialogs=[],restores=[];let restoreWindow=null;
 const check=(value,label)=>{if(!value)throw Error(label)},wait=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
 /** Keep UI/readiness waits bounded; never suppress unrelated index work to meet a counter assertion. */
 const until=async(read,label)=>{const end=Date.now()+30000;while(!read()){check(!c.closed&&Date.now()<end,label);await wait(30)}};
 const cases=[],work={reads:0,parses:0,acquisitions:0,rebuilds:0,semantic:0,snapshots:0,writes:0};c.progress={phase:'native manager',cases,work};
 /** Forward the original operation without changing scheduling, arguments or return values. */
 const observe=(owner,key,counter)=>{const original=owner[key];check(typeof original==='function','Missing counter '+key);owner[key]=function(...args){work[counter]++;return original.apply(this,args)};restores.push(()=>owner[key]=original);};
 /** Native text input goes through the installed component handlers. */
 const input=(element,value)=>{element.value=value;element.dispatchEvent(new element.ownerDocument.defaultView.Event('input',{bubbles:true}));};
 /** Select native roles/filters through their actual change handlers. */
 const choose=(element,value)=>{element.value=value;element.dispatchEvent(new element.ownerDocument.defaultView.Event('change',{bubbles:true}));};
 /** Choose the named action in the current actual modal only. */
 const button=(modal,key)=>{const found=[...modal.contentEl.querySelectorAll('button')].find(item=>item.textContent===p.translator(key));check(found,'Missing action '+key);return found};
 /** Save through the actual editor button and wait for its own lifetime completion. */
 const save=async(modal,key='common.save')=>{button(modal,key).click();await until(()=>!modal.modalEl.isConnected,'Editor Save did not finish')};
 /** Declarative Settings can migrate asynchronously; require the displayed native owner, not a retired collection document. */
 const visibleOntologyOwner=()=>{const doc=p.settingsTab.containerEl.ownerDocument,view=doc.defaultView;return view?.innerWidth>100&&!view.closed&&doc.visibilityState==='visible'&&doc.hasFocus()&&window.activeWindow?.document===doc&&[...doc.querySelectorAll('.setting-item-name')].some(element=>element.textContent===p.translator('ontology.manager.title')&&element.getBoundingClientRect().width>20)};
 try{
  await until(()=>!p.isStartupInitializing()&&!p.index.hasPendingSemanticPreparation(),'Initial index not ready');
  p.settings={...p.settings,ontologyPairingVersion:1,hierarchy:{...p.settings.hierarchy,parents:['Parent',...Array.from({length:45},(_,index)=>'Kplex194 vocabulary '+index+' with a deliberately long descriptive property name that must remain readable')],children:['Child'],leftFriends:['supports/supported by'],rightFriends:['challenges/challenged by'],previous:['replies to/replied by'],next:[],hidden:['Hidden'],exclusions:['Meta']}};
  await p.saveSettings();await until(()=>!p.index.hasPendingSemanticPreparation()&&!p.externalSettingsQueued&&p.settings.hierarchy.parents.length===46,'Fixture policy not ready');
  const remote=require('@electron/remote'),native=remote.getCurrentWindow();native.show();native.focus();native.webContents.focus();
  p.openSettings();check(p.settingsTab.openSettingsPage(p.translator('settings.ui.ontology')),'Ontology page absent');
  await until(visibleOntologyOwner,'Native Settings owner not visible');
  const entry=[...p.settingsTab.containerEl.ownerDocument.querySelectorAll('.setting-item')].find(row=>row.querySelector('.setting-item-name')?.textContent===p.translator('ontology.manager.title')&&row.getClientRects().length);check(entry,'Manage ontology entry absent');(entry.querySelector('button')??entry).click();
  const manager=[...p.settingsTab.ontologyManagers][0];check(manager?.opened,'Native manager absent');dialogs.push(manager);
  const rows=()=>[...manager.contentEl.querySelectorAll('.kplex-style-manager-row')],filter=manager.contentEl.querySelector('select');
  /** Reveal a physical row through actual progressive disclosure, including searches that match role text. */
  const namedRow=name=>{let row=rows().find(item=>item.querySelector('.kplex-style-manager-name')?.textContent===name);while(!row){const more=manager.contentEl.querySelector('.kplex-style-manager-more');check(more,'Physical row absent: '+name);more.click();row=rows().find(item=>item.querySelector('.kplex-style-manager-name')?.textContent===name);}return row};
  if(c.narrow){
    c.progress.phase='resize actual manager owner';const ownerNative=manager.contentEl.ownerDocument.defaultView.require('@electron/remote').getCurrentWindow(),bounds=ownerNative.getBounds(),minimum=ownerNative.getMinimumSize(),maximized=ownerNative.isMaximized();restoreWindow=()=>{ownerNative.setMinimumSize(...minimum);ownerNative.setBounds(bounds);if(maximized)ownerNative.maximize()};ownerNative.setMinimumSize(200,200);ownerNative.restore();ownerNative.show();ownerNative.focus();ownerNative.webContents.focus();ownerNative.setBounds({...bounds,width:440,height:760});
    await until(()=>{c.progress.window={width:manager.contentEl.ownerDocument.defaultView?.innerWidth,closed:manager.contentEl.ownerDocument.defaultView?.closed,bounds:JSON.parse(JSON.stringify(ownerNative.getBounds()))};return manager.contentEl.ownerDocument.defaultView.innerWidth>100&&manager.contentEl.ownerDocument.defaultView.innerWidth<=460;},'Native narrow window did not settle');
    const content=manager.contentEl,list=manager.manager.list,style=content.ownerDocument.defaultView.getComputedStyle(list);
    c.progress.narrow={viewport:content.ownerDocument.defaultView.innerWidth,content:{client:content.clientWidth,scroll:content.scrollWidth},list:{client:list.clientWidth,scroll:list.scrollWidth},columns:content.ownerDocument.defaultView.getComputedStyle(manager.manager.controls).gridTemplateColumns,controls:[...manager.manager.controls.children].map(element=>({tag:element.tagName,client:element.clientWidth,scroll:element.scrollWidth})),children:[...content.children].map(element=>({tag:element.tagName,cls:element.className,client:element.clientWidth,scroll:element.scrollWidth}))};
    check(content.scrollWidth<=content.clientWidth+1&&list.scrollWidth<=list.clientWidth+1,'Narrow manager overflowed horizontally');check(style.overflowY!=='auto'&&style.overflowY!=='scroll','Manager introduced a nested list scroller');
    const longName=namedRow(p.settings.hierarchy.parents[1]).querySelector('.kplex-style-manager-name');check(longName&&content.ownerDocument.defaultView.getComputedStyle(longName).whiteSpace==='normal'&&longName.getBoundingClientRect().height>24,'Long physical field was truncated rather than wrapped');
    cases.push({id:'actual-narrow-window-long-fields-wrap-single-scroll-surface',width:content.clientWidth});
  }


  observe(app.vault,'read','reads');observe(app.vault,'cachedRead','reads');observe(p.index.sourceAcquisition,'parse','parses');observe(p.index.sourceAcquisition,'acquire','acquisitions');observe(p.index,'rebuild','rebuilds');observe(p.index,'invalidateSemanticPolicy','semantic');observe(p.index,'persistIndexedDbSnapshot','snapshots');observe(p,'saveData','writes');
  const before={...work};
  choose(filter,'parent');Object.assign(c.progress,{phase:'bounded manager',rows:rows().length,parentFields:p.settings.hierarchy.parents.length,selected:filter.value,filter:manager.filter,summary:manager.manager.status.textContent});check(rows().length===12,'Initial manager window is not bounded');manager.contentEl.querySelector('.kplex-style-manager-more').click();check(rows().length===32,'Show more did not reuse shared disclosure');cases.push({id:'bounded-vocabulary-and-show-more'});
  choose(filter,'next');input(manager.manager.search,'replies');check(rows().length===1&&rows()[0].querySelector('.kplex-style-manager-name').textContent==='replied by'&&rows()[0].textContent.includes('replies to'),'Next pair orientation/search failed');
  input(manager.manager.search,'');choose(filter,'left');check(rows().length===1&&rows()[0].textContent.includes('supports')&&rows()[0].textContent.includes('supported by'),'Same-role pair was duplicated or hidden');
  choose(filter,'excluded');check(rows().length===1&&rows()[0].textContent.includes('Meta'),'Excluded missing');choose(filter,'hidden');check(rows().length===1&&rows()[0].textContent.includes('Hidden'),'Hidden missing');
  choose(filter,'previous');rows()[0].click();let editor=[...manager.children][0];dialogs.push(editor);input(editor.partnerControl.inputEl,'');button(editor,'common.cancel').click();
  for(const key of Object.keys(work))check(work[key]===before[key],'Read-only manager performed '+key);cases.push({id:'real-settings-filter-search-pairs-cancel-no-work',work:{...work}});
  rows()[0].click();editor=[...manager.children][0];dialogs.push(editor);choose(editor.roleControl.selectEl,'parent');check(editor.preview.textContent.includes(p.translator('role.child'))&&editor.preview.textContent.includes(p.translator('role.parent')),'Pair preview incomplete');
  await save(editor,'ontology.manager.saveBoth');check(p.ontologyRoleForField('replies to')==='parent'&&p.ontologyRoleForField('replied by')==='child','Pair-wide roles incomplete');check(work.writes===before.writes+1&&work.semantic===before.semantic+1,'Pair move was not one durable policy edit');cases.push({id:'pair-wide-role-edit-one-write'});
  choose(filter,'all');input(manager.manager.search,'replies');rows()[0].click();editor=[...manager.children][0];dialogs.push(editor);const partnerName=editor.fieldName==='replies to'?'replied by':'replies to';
  const pairBefore={...work};button(editor,'ontology.clearPair').click();await save(editor);check(work.writes===pairBefore.writes+1&&work.semantic===pairBefore.semantic,'Unpair invalidated semantics');check(p.ontologyRoleForField(partnerName),'Unpair removed counterpart');cases.push({id:'unpair-retains-roles-no-semantic-work'});
  input(manager.manager.search,'');manager.manager.controls.querySelector('.mod-cta').click();editor=[...manager.children][0];dialogs.push(editor);
  const name=editor.contentEl.querySelector('input[aria-label="'+p.translator('ontology.manager.fieldName')+'"]');input(name,'Kplex194 fresh / one');input(editor.partnerControl.inputEl,'Kplex194 fresh \\ two');editor.createPartnerControl.toggleEl.click();await save(editor);check(p.inverseOntologyField('Kplex194 fresh / one','child')==='Kplex194 fresh \\ two','New escaped pair incomplete');cases.push({id:'two-new-physical-names-one-save'});
  input(manager.manager.search,'Kplex194 fresh / one');rows()[0].click();editor=[...manager.children][0];dialogs.push(editor);button(editor,'ontology.manager.remove').click();check(editor.preview.textContent.includes(editor.fieldName),'Removal did not identify endpoint');const other=editor.partner;await save(editor,'ontology.manager.confirmRemove');check(p.ontologyRoleForField(other)&&!p.ontologyRoleForField(editor.fieldName),'Removal lost partner or kept assignment');cases.push({id:'confirmed-named-assignment-removal'});
  input(manager.manager.search,'Parent');choose(filter,'parent');namedRow('Parent').click();editor=[...manager.children][0];dialogs.push(editor);input(editor.partnerControl.inputEl,'Child');
  const store=p.saveData,beforeFailure={...work},rawBeforeFailure=JSON.stringify(p.settings.hierarchy);p.saveData=async()=>{throw Error('Expected native194 storage rejection')};
  try{button(editor,'common.save').click();await until(()=>!editor.busy,'Failed storage did not settle');check(editor.modalEl.isConnected&&editor.partnerControl.inputEl.value==='Child'&&JSON.stringify(p.settings.hierarchy)===rawBeforeFailure,'Failed Save published or lost draft');}finally{p.saveData=store;}
  check(work.writes===beforeFailure.writes,'Rejected storage was treated as saved');await save(editor);check(p.settings.hierarchy.parents.includes('Parent/Child'),'Retry failed');cases.push({id:'native-storage-rejection-retains-draft-and-retry'});
  namedRow('Parent').click();editor=[...manager.children][0];dialogs.push(editor);button(editor,'ontology.clearPair').click();
  const refresh=p.index.refreshPresentationSettings;p.index.refreshPresentationSettings=async()=>{throw Error('Expected native194 post-save refresh failure')};
  const pendingBefore={...work};try{await save(editor);}finally{p.index.refreshPresentationSettings=refresh;}
  check(work.writes===pendingBefore.writes+1&&p.settings.hierarchy.parents.includes('Parent')&&!p.settings.hierarchy.parents.includes('Parent/Child'),'Saved-refresh-pending invited replay');cases.push({id:'saved-refresh-pending-is-durable'});
  const notes=p.index.allPages().filter(page=>page.file?.extension==='md').slice(0,2);check(notes.length===2,'Two existing physical notes required for selection-only composer probes');
  const composerBefore={...work};
  for(const fixedTarget of [undefined,notes[1]]){
    const composer=p.openRelationModal({mode:'create',origin:notes[0],semanticRole:'left',fixedTarget});dialogs.push(composer);
    await until(()=>composer.contentEl.querySelector('.kplex-add-related-ontology-search .kplex-fuzzy-disclosure'),'Native composer did not mount');
    composer.contentEl.querySelector('.kplex-add-related-ontology-search .kplex-fuzzy-disclosure').click();
    const owner=composer.contentEl.ownerDocument;
    await until(()=>owner.querySelectorAll('.kplex-fuzzy-floating-results button').length===2,'Same-role composer options absent');
    const options=[...owner.querySelectorAll('.kplex-fuzzy-floating-results button')];
    for(const name of ['supports','supported by'])check(options.some(row=>row.querySelector('span')?.textContent===name&&row.querySelector('small')?.textContent.includes(name==='supports'?'supported by':'supports')),'Composer primary/partner annotation missing');
    options.find(row=>row.querySelector('span')?.textContent==='supported by').click();
    await until(()=>composer.contentEl.querySelector('.kplex-add-related-ontology-search input').value==='supported by','Physical composer selection did not settle');composer.close();
  }
  for(const key of Object.keys(work))check(work[key]===composerBefore[key],'Selection-only composer performed '+key);cases.push({id:'new-and-fixed-target-composer-independent-physical-pair-options-no-work'});
  manager.close();p.openHiddenOntologySettings();const hidden=[...p.settingsTab.ontologyManagers][0];check(hidden?.filter==='hidden','Hidden deep link missed manager');dialogs.push(hidden);hidden.close();cases.push({id:'hidden-deep-link'});
  if(restoreWindow){restoreWindow();restoreWindow=null;}if(app.setting.isOpen)app.setting.close();for(const type of ['k-plex-react-view','k-plex-sidepanel-view'])for(const leaf of app.workspace.getLeavesOfType(type))leaf.detach();
  check(!app.workspace.getLeavesOfType('k-plex-react-view').length&&!app.workspace.getLeavesOfType('k-plex-sidepanel-view').length,'No-Plex prerequisite failed');
  p.openSettings();check(p.settingsTab.openSettingsPage(p.translator('settings.ui.ontology')),'No-Plex Ontology page absent');await until(visibleOntologyOwner,'No-Plex Settings owner not visible');p.settingsTab.openOntologyManager();const noView=[...p.settingsTab.ontologyManagers][0];dialogs.push(noView);noView.manager.controls.querySelector('.mod-cta').click();
  const noViewEditor=[...noView.children][0];dialogs.push(noViewEditor);input(noViewEditor.contentEl.querySelector('input[aria-label="'+p.translator('ontology.manager.fieldName')+'"]'),'Kplex194 NoView');const noViewWrites=work.writes;await save(noViewEditor);check(work.writes===noViewWrites+1&&p.ontologyRoleForField('Kplex194 NoView')==='child','No-Plex assignment was not durable');cases.push({id:'explicit-no-plex-configuration-save'});noView.close();

  c.progress.phase='complete';return {cases,mode:p.index.isOnDemandMode()?'on-demand':'eager',work,limitations:'Native handler activation, not physical mobile or macOS. Full application restart remains separate.'};
 }finally{
  const errors=[],clean=async run=>{try{await run()}catch(error){errors.push(String(error))}};
  for(const restore of restores.reverse())await clean(restore);if(restoreWindow)await clean(restoreWindow);for(const dialog of dialogs.reverse())await clean(()=>dialog.close());if(app.setting.isOpen)await clean(()=>app.setting.close());
  await clean(()=>p.settingsWriteQueue);p.settings=settings;p.savedSettingsPolicy=policy;await clean(()=>p.saveSettings(false,false));
  await clean(()=>p.index.refreshPresentationSettings());await clean(()=>p.index.refreshSemanticSettings());await clean(()=>app.workspace.changeLayout(layout));await wait(2500);
  await clean(()=>app.vault.adapter.write(p.manifest.dir+'/data.json',c.originalData));if(errors.length)throw Error('Ontology manager cleanup: '+errors.join('; '));
 }
}
if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Explicit disposable Small vault required');
const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const requestedMode=process.env.KPLEX_ONTOLOGY_INPUT_MODE;assert(!requestedMode||['eager','on-demand'].includes(requestedMode),'Unsupported session mode');
/** Use the same native transport as the controlled fixture, retaining an independent process deadline. */
const cli=(name,...args)=>{const result=spawnNativeSync(obsidianCliExecutable(),['vault=kplex-test-small',name,...args],{encoding:'utf8',timeout:30000,killSignal:'SIGKILL',maxBuffer:4*1024*1024});if(result.error||result.status||/^Error:/m.test(result.stdout))throw result.error??Error(result.stderr||result.stdout);return result.stdout.trim()};
/** Read only detached test-owner state, not note content. */
const evaluate=code=>JSON.parse(cli('eval','code='+code).replace(/^=>\s*/,''));
/** Wait for the loaded plugin's actual session after an explicitly requested reload. */
const waitNative=async(predicate,label)=>{const end=Date.now()+60000;while(!evaluate('JSON.stringify('+predicate+')')){assert(Date.now()<end,label);await new Promise(resolve=>setTimeout(resolve,100));}};
assert.equal(resolve(cli('vault','info=path')),target.vault);
const backups=['plugins/k-plex/data.json','community-plugins.json','workspace.json','appearance.json'].filter(name=>existsSync(join(target.config,name))).map(name=>({path:join(target.config,name),bytes:readFileSync(join(target.config,name))}));
const dataFile=join(target.pluginDir,'data.json'),originalData=readFileSync(dataFile),layout=evaluate('JSON.stringify(app.workspace.getLayout())');
let modeChanged=false;
try{
 if(requestedMode){
  cli('plugin:disable','id=k-plex');modeChanged=true;
  const snapshot=JSON.parse(originalData);snapshot.indexingModeDesktop=requestedMode;snapshot.indexingMode=requestedMode;writeFileSync(dataFile,JSON.stringify(snapshot));
  cli('plugin:enable','id=k-plex');await waitNative('Boolean(app.plugins.plugins["k-plex"]?.index)','Requested session not loaded');
  assert.equal(evaluate('JSON.stringify(app.plugins.plugins["k-plex"].index.isOnDemandMode())'),requestedMode==='on-demand');
 }
 const data=readFileSync(dataFile,'utf8');
 const report=await runControlledProbe('ontology-manager-194',scenario,'c.originalData='+JSON.stringify(data)+';c.narrow='+JSON.stringify(process.env.KPLEX_ONTOLOGY_MANAGER_NARROW==='true')+';',['src/ui/OntologyManagerModal.ts','src/ui/features/ontologyPresentation.ts','src/ui/AddToOntologyModal.ts','src/core/contracts/ontologyConfiguration.ts','src/main.ts','src/settings.ts']);
 if(report.status==='passed'&&requestedMode)assert.equal(report.result.mode,requestedMode);
}finally{
 if(modeChanged){cli('plugin:disable','id=k-plex');for(const item of backups)writeFileSync(item.path,item.bytes);cli('plugin:enable','id=k-plex');await waitNative('Boolean(app.plugins.plugins["k-plex"]?.index)','Original session not loaded');evaluate('(async()=>{await app.workspace.changeLayout('+JSON.stringify(layout)+');return JSON.stringify(true)})()');}
 await new Promise(resolve=>setTimeout(resolve,2500));
 for(const item of backups){writeFileSync(item.path,item.bytes);assert(readFileSync(item.path).equals(item.bytes),'Configuration restoration');}
}
