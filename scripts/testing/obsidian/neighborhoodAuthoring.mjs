/** Exact-build acceptance for second-order Compass neighbors, saved-node drags, twelve Facets
 * categories, relationship commands, rename metadata, popout Sidecar content and toolbar modifiers.
 * The existing disposable Small fixture owns native views/notes/configuration;
 * this driver owns the application lock and receipts.
 * Desktop input and plugin reloads do not establish physical mobile or whole-app restart acceptance. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {acquireHostLock} from './hostLock.mjs';
import {runControlledProbe} from './controlledProbe.mjs';
import {validateTarget} from './runner.mjs';
import {nativeBatch270} from './nativeBatch270.mjs';
import {nativeDocumentSessions} from './nativeDocumentSessions.mjs';
import {nativeHtmlDrag} from './nativeHtmlDrag.mjs';

/** Enter actual native text, preserving ordinary React onChange and keyboard semantics. */
async function typeNative(f,input,value){
 await f.focus(input.ownerDocument);input.focus();await f.key(input.ownerDocument,'A',[process.platform==='darwin'?'meta':'control'],input);
 const native=f.owner(input.ownerDocument);await native.webContents.insertText(value);await f.until(()=>input.value===value,'Native text value',5000);
}

/** Exercise registered commands and both choices of the actual native Rename form. */
async function commandsRename(app,c){
 const f=c.fixture(app,c),cases=[];let dialog;
 try{
  await f.initialize();const p=f.p,file=await f.note('Rename source','---\ntitle: Display title\naliases: [First alias, Preserved alias]\n---\nBody remains unchanged.\n');
  const originalBody=await app.vault.read(file);await app.fileManager.renameFile(file,f.folder+'/Native rename baseline.md');
  f.check(await app.vault.read(file)===originalBody,'Native filename rename alone retains the stale display-name property');cases.push({nativeFilenameOnlyBaseline:true});
  Object.assign(p.settings,{nameFields:'title, aliases',renderAlias:true,nodeTitleScript:''});await p.saveSettings(false,false);
  const leaf=await f.canvas(file);await f.ready();const root=leaf.view.contentEl,doc=root.ownerDocument;
  for(const [suffix,role]of [['relationship','all'],['previous','previous'],['next','next']]){
   await app.workspace.revealLeaf(leaf);root.querySelector('.kplex-app').focus();
   f.check(app.commands.executeCommandById('k-plex:kplex-add-'+suffix),'Published Add '+suffix+' command');
   await f.until(()=>[...p.actionDialogs.keys()].some(value=>value.contentEl.querySelector('.kplex-add-related-role-select')),'Native composer command');
   dialog=[...p.actionDialogs.keys()].find(value=>value.contentEl.querySelector('.kplex-add-related-role-select'));
   await f.until(()=>dialog.contentEl.querySelector('.kplex-add-related-role-select').value===role,'Command role default');
   cases.push({command:suffix,role});dialog.close();dialog=null;await f.wait(80);
  }
  /** Resolve each invocation through the live action surface after every rename publication. */
  const openRename=async(target=file)=>{
   const result=await p.actionManager.dispatch({id:'node.rename',source:'internal',surfaceId:f.surface(leaf),target:{kind:'explicit',node:{identity:target.path,path:target.path,kind:'file'}}});
   f.check(result.status==='opened','Native rename action: '+JSON.stringify(result));
   await f.until(()=>doc.querySelector('.kplex-rename-note-modal input'),'Native Rename dialog');
   return doc.querySelector('.kplex-rename-note-modal');
  };
  for(const [name,enabled,field]of [['Title renamed',true,'title'],['Filename only',false,'title'],['Alias renamed',true,'aliases']]){
   if(field==='aliases'){p.settings.nameFields='aliases, title';await p.saveSettings(false,false);}
   const before=structuredClone(app.metadataCache.getFileCache(file).frontmatter),modal=await openRename();
   const toggle=modal.querySelector('.checkbox-container');f.check(toggle,'Existing configured name property toggle');
   if(!enabled)await f.click(toggle);
   await c.type(f,modal.querySelector('.kplex-rename-note-name-setting input'),name);await f.click(modal.querySelector('button.mod-cta'));
   await f.until(()=>file.path===f.folder+'/'+name+'.md'&&!modal.isConnected,'Native rename completed');
   await f.until(()=>{const fm=app.metadataCache.getFileCache(file)?.frontmatter;return fm&&(field==='aliases'?fm.aliases?.[0]===name:fm.title===(enabled?name:before.title));},'Renamed metadata observed');
   const after=app.metadataCache.getFileCache(file).frontmatter;
   f.check(after.aliases[1]==='Preserved alias','Other aliases retained');
   if(!enabled||field==='aliases')f.check(after.title===before.title,'Unselected title retained');
   f.check((await app.vault.read(file)).includes('Body remains unchanged.'),'Body retained');cases.push({rename:name,update:enabled,field});
   await f.ready();
   const expected=enabled?name:before.title;
   await f.until(()=>{const page=p.index.get(file.path);return page&&p.index.titleFor(page)===expected;},'Renamed configured display title');
   await f.until(()=>root.querySelector('[data-kplex-path="'+file.path+'"] .kplex-thought-text')?.textContent.includes(expected),'Renamed native canvas title');
  }
  const plain=await f.note('No name property','Plain body');const modal=await openRename(plain);
  f.check(!modal.querySelector('.checkbox-container'),'No toggle for missing configured metadata');
  await f.key(doc,'Escape');await f.until(()=>!modal.isConnected,'Native Rename Escape');
  const native=f.owner(doc),themes=['theme-light','theme-dark'],original=themes.map(theme=>doc.body.classList.contains(theme));
  f.restores.push(()=>{for(const [i,theme]of themes.entries())doc.body.classList.toggle(theme,original[i]);});
  for(const [theme,width]of [['theme-light',1000],['theme-dark',420]]){
   for(const value of themes)doc.body.classList.toggle(value,value===theme);native.setContentSize(width,1000);await f.wait(100);
   const form=await openRename(),content=form.querySelector('.modal-content'),input=form.querySelector('.kplex-rename-note-name-setting input');
   const field=input.getBoundingClientRect(),bounds=content.getBoundingClientRect(),buttons=[...form.querySelectorAll('.kplex-form-actions button')];
   f.check(field.width>=bounds.width*.85,'Full-width native rename name');
   f.check(content.scrollWidth<=content.clientWidth+1,'No horizontal form overflow');
   f.check(buttons.length===2&&buttons.every(button=>button.querySelector('svg')&&!button.hasAttribute('title')),'Native footer glyphs and single tooltip owner');
   await f.focus(doc);await f.wait(200);
   const formRect=form.getBoundingClientRect();f.check(form.contains(doc.elementFromPoint(formRect.x+formRect.width/2,formRect.y+formRect.height/2)),'Native rename modal owns visible input');
   const screenshot=await native.webContents.capturePage();require('node:fs').writeFileSync(c.captureRoot+'/rename-'+theme+'-'+width+'.png',screenshot.toPNG());
   await f.key(doc,'Escape');cases.push({theme,width,fullWidth:true,footerIcons:true});
  }
  native.setContentSize(1450,1000);
  const popup=await f.canvas(file,'k-plex-react-view','window');await f.ready();
  const popupDoc=popup.view.contentEl.ownerDocument;await f.focus(popupDoc);
  const result=await p.actionManager.dispatch({id:'node.rename',source:'internal',surfaceId:f.surface(popup),target:{kind:'explicit',node:{identity:file.path,path:file.path,kind:'file'}}});
  f.check(result.status==='opened','Popout rename');
  await f.until(()=>popupDoc.querySelector('.kplex-rename-note-modal .checkbox-container'),'Owning popout toggle');
  await f.key(popupDoc,'Escape');cases.push({popout:true,escape:true});
  return{cases};
 }finally{dialog?.close();await f.cleanup();}
}

/** Native HTML drags retain Obsidian's real link payload for relationship and Markdown targets. */
async function savedDrags(app,c){
 const f=c.fixture(app,c),cases=[];let dialog;
 try{
  await f.initialize();const p=f.p,source=await f.note('Canvas center'),saved=await f.note('Saved destination'),historySaved=await f.note('History destination'),text=await f.note('Drop editor','Drop target:\n\n');
  Object.assign(p.settings,{pinnedNodes:[saved.path],linkAfterSaving:'return'});await p.saveSettings(false,false);
  const leaf=await f.canvas(historySaved);await f.ready();p.notifyNavigation(source.path,leaf);
  await f.until(()=>leaf.view.documentSession.centerPath===source.path,'Canvas navigation');await f.ready();
  const textLeaf=app.workspace.getLeaf('split');f.leaves.push(textLeaf);await textLeaf.openFile(text,{state:{mode:'source'}});await app.workspace.revealLeaf(leaf);
  const root=leaf.view.contentEl,doc=root.ownerDocument;
  const open=p.openRelationModal;p.openRelationModal=function(options){c.lastDrop={origin:options.origin.path,target:options.fixedTarget?.path,role:options.semanticRole,additive:options.invocation?.additiveOnly};return dialog=open.call(this,options)};
  f.restores.push(()=>{p.openRelationModal=open});
  /** Chromium intercepts its actual native drag; the shared helper owns debugger release/cancellation. */
  const drag=async(button,target)=>{
   button.scrollIntoView({block:'nearest',inline:'center',behavior:'instant'});await f.wait(80);
   const native=await f.focus(doc),from=f.point(button),to=f.point(target);
   return c.htmlDrag({contents:native.webContents,from,to,wait:f.wait,until:f.until,input:(type,point,modifiers=[])=>native.webContents.sendInputEvent({type,...point,button:'left',clickCount:1,modifiers})});
  };
  for(const kind of ['pinned','history']){
   const target=kind==='pinned'?saved:historySaved;
   const selector=kind==='pinned'?'[data-kplex-pinned-path="'+target.path+'"]':'[data-kplex-history-path="'+target.path+'"]';
   await f.until(()=>root.querySelector(selector)?.draggable,'Native saved-node draggable body');
   const gate=root.querySelector('[data-kplex-path="'+source.path+'"] [data-kplex-gate="top"]');f.check(gate,'Central target gate');
   const receipt=await drag(root.querySelector(selector),gate);await f.until(()=>dialog?.contentEl.querySelector('.kplex-add-related-role-select'),'Saved drop relationship composer');
   f.check(c.lastDrop.origin===source.path&&c.lastDrop.target===target.path&&c.lastDrop.role==='parent'&&c.lastDrop.additive,'Exact additive saved-node relationship intent');
   if(kind==='pinned'){
    const button=dialog.contentEl.querySelector('.kplex-add-related-link-button');await f.until(()=>button&&!button.disabled,'Native Link availability');await f.click(button);
    await f.until(()=>!dialog.modalEl.isConnected,'Saved pin relationship commit');
    const body=await app.vault.read(source);f.check(body.includes(saved.basename),'Pin drop saved a real relationship');
   }else dialog.close();dialog=null;await f.ready();
   const editor=textLeaf.view.containerEl.querySelector('.cm-content');f.check(editor,'Native Markdown editor drop target');
   const textReceipt=await drag(root.querySelector(selector),editor);
   await f.until(()=>textLeaf.view.editor.getValue().includes(target.basename),'Native editor accepted saved-node link');
   f.check(leaf.view.documentSession.centerPath===source.path,'Saved drag must not navigate');cases.push({kind,relationship:receipt,workspaceEditor:textReceipt});
  }
  return{cases};
 }finally{dialog?.close();await f.cleanup();}
}

/** Check canonical second-order roles, excluded Date precedence and unchanged reload reuse. */
async function semantics(app,c){
 const f=c.fixture(app,c),cases=[];
 try{
  await f.initialize();let p=f.p;
  const fields=['Batch parent','Batch child','Batch friend','Batch challenger','Batch previous','Batch next'];
  p.settings.hierarchy={hidden:[],parents:[fields[0]],children:[fields[1]],leftFriends:[fields[2],'reading'],rightFriends:[fields[3]],previous:[fields[4]],next:[fields[5]],exclusions:[]};
  Object.assign(p.settings,{showFolderNodes:false,showTagNodes:false,renderSiblings:true,datePropertyRelations:'parent'});await p.saveSettings();
  const second=[],direct=[];for(let i=0;i<fields.length;i++){second.push(await f.note('Second '+i));direct.push(await f.note('Direct '+i,'---\n'+JSON.stringify(fields[(i+1)%fields.length])+': '+JSON.stringify('[['+second[i].path+']]')+'\n---\n'));}
  const origin=await f.note('Second order center','---\n'+fields.map((field,i)=>JSON.stringify(field)+': '+JSON.stringify('[['+direct[i].path+']]')).join('\n')+'\n---\n');
  let leaf=await f.canvas(origin);await f.ready();
  await f.until(()=>p.index.getNeighborhood(origin.path)?.siblings.length===6,'All-role second-order neighbors');
  f.check(JSON.stringify(p.index.getNeighborhood(origin.path).siblings.map(row=>row.page.path).sort())===JSON.stringify(second.map(file=>file.path).sort()),'Exact second-order set');cases.push({secondOrderRoles:6});
  const daily=app.internalPlugins.getPluginById('daily-notes');f.check(daily?.enabled&&daily.instance,'Enabled native Daily Notes prerequisite');
  const options=daily.instance.options;f.restores.push(()=>{daily.instance.options=options});daily.instance.options={...options,folder:f.folder,format:'[daily-]YYYY-MM-DD'};
  const registry=app.metadataTypeManager,assigned=registry.getAssignedWidget('created');
  f.restores.push(async()=>{if(assigned===null)await registry.unsetType('created');else await registry.setType('created',assigned);f.check(registry.getAssignedWidget('created')===assigned,'Original created property type restored');});
  await registry.setType('created','date');f.check(registry.getPropertyInfo('created')?.widget==='date','Actual native created Date property');
  const card=await f.note('Date card','---\ncreated: 2039-02-03\n---\n'),day=await f.note('daily-2039-02-03','- (reading:: [['+card.path+']])\n');
  p.notifyNavigation(day.path,leaf);await f.ready();
  await f.until(()=>p.index.evidenceBetween(day.path,card.path).some(item=>item.sourceKind==='date-property'),'Native created property really infers a Date relationship');
  p.settings.hierarchy={...p.settings.hierarchy,exclusions:['created']};await p.saveSettings();await f.ready();
  await f.until(()=>p.index.get(day.path)?.neighbours.get(card.path)?.isLeftFriend,'Inline reading survives excluded created Date');
  f.check(!p.index.evidenceBetween(day.path,card.path).some(item=>item.sourceKind==='date-property'),'Excluded date leaves no suppressing evidence');cases.push({excludedCreated:true,inlineReading:true});
  p.settings.futureBatchPreference={keep:'unknown'};await p.saveSettings(false,false);
  for(let n=0;n<2;n++){
   p=await f.reload();leaf=await f.canvas(day);await f.ready();
   f.check(p.settings.futureBatchPreference?.keep==='unknown','Unknown preference preserved');
   await f.until(()=>p.index.get(day.path)?.neighbours.get(card.path)?.isLeftFriend,'Warm reload excluded Date precedence');cases.push({warmPluginReload:n+1});
  }
  return{cases,scope:'Small-vault native semantics and plugin reload; whole-app and scale restart gates remain separate'};
 }finally{await f.cleanup();}
}

/** Save/render twelve actual Facets categories and inspect the real editor's bounded Add control. */
async function facets(app,c){
 const f=c.fixture(app,c);let manager;
 try{
  await f.initialize();const p=f.p,origin=await f.note('Twelve facets center'),leaf=await f.canvas(origin);await f.ready();
  const preset=structuredClone(p.readPortableSharingState().presets.wuxing),order=Array.from({length:12},(_,i)=>'category'+i);
  Object.assign(preset,{name:'Native twelve',order,start:order[0],source:'property',field:'Batch facet',categories:Object.fromEntries(order.map(id=>[id,{label:id,values:[id],color:'#888888'}]))});
  delete preset.interpretation;delete preset.flowOverrides;
  await p.updateCanvasViewConfiguration('wuxing',{field:'presets',path:['native-twelve']},{kind:'set',value:preset});
  const session=leaf.view.documentSession.plexView;session.select('wuxing');session.updateState({version:1,preset:'native-twelve'});
  await f.until(()=>leaf.view.contentEl.querySelectorAll('[data-kplex-decoration]').length>=12,'Twelve native facet regions');
  const regions=[...leaf.view.contentEl.querySelectorAll('[data-kplex-decoration]')].filter(element=>{try{const id=JSON.parse(element.dataset.kplexDecoration);return id[0]==='facets'&&id[1]==='native-twelve'&&id[2]==='category'}catch{return false}});
  f.check(regions.length===12,'Exactly twelve category regions');
  app.setting.open();app.setting.openTabById('k-plex');await f.until(()=>app.setting.getCurrentPageEl()?.isConnected,'Native preset Settings');
  f.check(p.settingsTab.openCanvasViewManager('wuxing','native-twelve'),'Native twelve-category preset editor');manager=[...p.settingsTab.colorDialogs].at(-1);
  const editor=[...manager.children].at(-1);await f.until(()=>editor?.contentEl.querySelector('button'),'Native preset draft');
  const add=[...editor.contentEl.querySelectorAll('button')].find(button=>button.textContent===p.translator('facets.addCategory'));f.check(add?.disabled,'The thirteenth category is unavailable');
  manager.close();manager=null;return{categories:regions.length,thirteenthDisabled:true};
 }finally{manager?.close();await f.cleanup();}
}

/** A first toolbar click must populate a newly split native popout companion without another navigation. */
async function sidecarPopout(app,c){
 const f=c.fixture(app,c),attempts=[],cases=[];
 try{
  await f.initialize();const p=f.p,files=[await f.note('Initial Sidecar note','Native initial Sidecar content.\n'),await f.note('Other Sidecar note','Native initial Sidecar content.\n')];
  const sync=p.syncSidecarToPage;p.syncSidecarToPage=async function(host,page,destination,...rest){
   const target=destination??this.sidecarLeaves.get(host);
   attempts.push({position:target?this.adjacentPosition(host,target):null,attached:!!target&&this.leafIsAttached(target),sameDocument:!!target&&host.view.containerEl.ownerDocument===target.view.containerEl.ownerDocument,file:page.file?.path});
   return sync.call(this,host,page,destination,...rest);
  };f.restores.push(()=>{p.syncSidecarToPage=sync});
  for(const destination of ['tab','window']){
   const leaf=await f.canvas(files[0],'k-plex-react-view',destination);await f.ready();
   const doc=leaf.view.contentEl.ownerDocument;await f.focus(doc);
   for(const [n,position]of ['right','left','above','below'].entries()){
    const file=files[n%2],mode=n%2?'preview':'source';p.notifyNavigation(file.path,leaf);await f.ready();
    p.documentSession(leaf).preferences.sidecarMarkdownMode=mode;
    await p.moveSidecar(leaf,position,p.index.get(file.path));
    const button=leaf.view.contentEl.querySelector('.kplex-sidecar-primary');f.check(button?.getAttribute('aria-pressed')==='false','Initially closed native Sidecar');
    await f.click(button);await f.until(()=>p.sidecarLeaves.has(leaf),'Owned native Sidecar');
    try{await f.until(()=>{const target=p.sidecarLeaves.get(leaf);return target&&p.fileForLeaf(target)===file&&!p.sidecarMovingHosts.has(leaf)&&target.view.contentEl.textContent.includes('Native initial Sidecar content.');},'First Sidecar click populates '+destination+'/'+position,10000);}catch(error){throw Error(error.message+': '+JSON.stringify({attempts,settledPosition:p.adjacentPosition(leaf,p.sidecarLeaves.get(leaf))}));}
    const sidecar=p.sidecarLeaves.get(leaf);f.check(sidecar.view.containerEl.ownerDocument===doc,'Companion remains in its owning window');
    f.check(p.adjacentPosition(leaf,sidecar)===position,'Actual requested Sidecar edge');f.check(sidecar.getViewState().state.mode===mode,'Initial Markdown representation');
    cases.push({destination,position,mode,firstClickPopulated:true});
    await f.click(leaf.view.contentEl.querySelector('.kplex-sidecar-primary'));await f.until(()=>!p.sidecarLeaves.has(leaf),'Native Sidecar closed');
   }
  }
  return{cases,attempts};
 }finally{await f.cleanup();}
}

/** Trusted modifier-clicks must allocate native surfaces from the initiating canvas and bypass menus. */
async function toolbarModifiers(app,c){
 const f=c.fixture(app,c),cases=[];
 try{
  await f.initialize();const p=f.p,file=await f.note('Toolbar origin'),leaf=await f.canvas(file);await f.ready();
  const mainDoc=leaf.view.contentEl.ownerDocument;
  const allLeaves=()=>{const leaves=[];app.workspace.iterateAllLeaves(l=>{leaves.push(l)});return leaves};
  const initialLeaves=new Set(allLeaves());
  // Record every newly allocated leaf for independent cleanup, including failed native assertions.
  f.restores.push(()=>{for(const l of allLeaves())if(!initialLeaves.has(l)&&!f.leaves.includes(l))f.leaves.push(l)});
  /** Native input retains modifiers on all pointer stages and proves that React received a trusted click. */
  const click=async(button,modifiers=[])=>{
   const doc=button.ownerDocument,native=await f.focus(doc);let point;
   try{point=f.point(button)}catch(error){const image=await native.webContents.capturePage();require('node:fs').writeFileSync(c.captureRoot+'/toolbar-input-failure.png',image.toPNG());throw Error(String(error)+'; viewport '+JSON.stringify({width:doc.defaultView.innerWidth,height:doc.defaultView.innerHeight,bounds:native.getBounds(),active:app.workspace.activeLeaf?.id,buttonLeaf:button.closest('.workspace-leaf')?.dataset.type}));}
   let trusted=false;
   const observe=e=>{if(button.contains(e.target))trusted=e.isTrusted};doc.addEventListener('click',observe,true);
   try{for(const type of ['mouseMove','mouseDown','mouseUp'])native.webContents.sendInputEvent({type,...point,button:'left',clickCount:1,modifiers});await f.until(()=>trusted,'Trusted toolbar click',5000);}
   finally{doc.removeEventListener('click',observe,true);}
  };
  const mod=process.platform==='darwin'?'meta':'control';let visualLeaf=leaf;
  for(const origin of [leaf,await f.canvas(file,'k-plex-react-view','window')]){
   visualLeaf=origin;
   const native=f.owner(origin.view.contentEl.ownerDocument),bounds=native.getBounds();
   if(origin!==leaf){native.setContentSize(1450,1000);f.restores.push(()=>{if(!native.isDestroyed())native.setBounds(bounds)});}
   await f.ready();await app.workspace.revealLeaf(origin);await f.focus(origin.view.contentEl.ownerDocument);
   for(const [name,modifiers]of [['tab',[mod]],['split',[mod,'alt']],['window',[mod,'alt','shift']],['sidepanel',['alt']],['default',[]]]){
    await app.workspace.revealLeaf(origin);await f.focus(origin.view.contentEl.ownerDocument);await f.wait(150);
    const before=new Set(allLeaves()),button=origin.view.contentEl.querySelector('button svg.lucide-plus')?.closest('button');f.check(button,'Native plus toolbar control');
    await click(button,modifiers);
    await f.until(()=>allLeaves().some(l=>!before.has(l)&&(l.view.getViewType()===(name==='sidepanel'?'k-plex-sidepanel-view':'k-plex-react-view'))),'Native toolbar destination '+name,15000);
    const opened=allLeaves().find(l=>!before.has(l)&&l.view.getViewType()===(name==='sidepanel'?'k-plex-sidepanel-view':'k-plex-react-view'));
    await opened.view.waitUntilReady();
    if(name==='tab')f.check(opened.parent===origin.parent,'Same invoking tab group');
    if(name==='split'||name==='default')f.check(opened.parent!==origin.parent&&opened.view.containerEl.ownerDocument===origin.view.containerEl.ownerDocument,'Adjacent invoking window group');
    if(name==='window')f.check(opened.view.containerEl.ownerDocument!==origin.view.containerEl.ownerDocument,'Actual new native popout');
    if(name==='sidepanel')f.check(opened.view.getViewType()==='k-plex-sidepanel-view','Actual sidebar canvas');
    cases.push({origin:origin===leaf?'main':'popout',destination:name});opened.detach();await f.wait(250);
   }
   await app.workspace.revealLeaf(origin);await f.focus(origin.view.contentEl.ownerDocument);
   const settings=origin.view.contentEl.querySelector('button svg.lucide-settings')?.closest('button');f.check(settings,'Native settings toolbar control');
   await click(settings,['alt']);await f.until(()=>origin.view.contentEl.querySelector('.is-area-settings-mode'),'Native area mode enabled');
   f.check(!p.activeKplexMenu&&!app.setting.win,'Area shortcut bypasses native menu');
   await click(settings,['alt']);await f.until(()=>!origin.view.contentEl.querySelector('.is-area-settings-mode'),'Native area mode disabled');
   await click(settings,[mod]);await f.until(()=>app.setting.win&&app.setting.activeTab?.id==='k-plex','Direct native plugin settings');
   f.check(!p.activeKplexMenu,'Plugin shortcut bypasses native menu');app.setting.close();await f.wait(200);
   await click(settings);await f.until(()=>p.activeKplexMenu,'Unmodified settings menu retained');p.dismissKplexMenu();
   cases.push({origin:origin===leaf?'main':'popout',settings:['areas','plugin','menu']});
  }
  const doc=visualLeaf.view.contentEl.ownerDocument,native=f.owner(doc),themes=['theme-light','theme-dark'],original=themes.map(theme=>doc.body.classList.contains(theme));
  native.setMinimumSize(200,200);
  f.restores.push(()=>{for(const [i,theme]of themes.entries())doc.body.classList.toggle(theme,original[i])});
  // Inspect actual native tooltip geometry, glyphs and single ownership in both themes and a narrow window.
  for(const [theme,width]of [['theme-light',1450],['theme-dark',420]]){
   for(const value of themes)doc.body.classList.toggle(value,value===theme);native.setContentSize(width,1000);
   await app.workspace.revealLeaf(visualLeaf);await f.focus(doc);await f.wait(300);
   for(const icon of ['plus','settings']){
    const button=visualLeaf.view.contentEl.querySelector('button svg.lucide-'+icon)?.closest('button'),point=f.point(button);
    f.check(!button.hasAttribute('title'),'Single toolbar tooltip owner');
    native.webContents.sendInputEvent({type:'mouseMove',...point});
    await f.until(()=>doc.querySelector('.kplex-control-tooltip')?.textContent===button.getAttribute('aria-label'),'Localized native toolbar hint',5000);
    const tooltip=doc.querySelector('.kplex-control-tooltip'),bounds=tooltip.getBoundingClientRect();
    f.check(doc.querySelectorAll('.kplex-control-tooltip').length===1&&bounds.left>=0&&bounds.right<=doc.defaultView.innerWidth&&bounds.top>=0&&bounds.bottom<=doc.defaultView.innerHeight,'One readable in-window toolbar hint');
    const image=await native.webContents.capturePage();require('node:fs').writeFileSync(c.captureRoot+'/toolbar-'+theme+'-'+width+'-'+icon+'.png',image.toPNG());
    native.webContents.sendInputEvent({type:'mouseMove',x:5,y:5});await f.wait(100);
   }
   cases.push({theme,width,tooltips:true});
  }
  f.check(mainDoc===leaf.view.contentEl.ownerDocument,'Original canvas retained');return{cases};
 }catch(error){throw Error(String(error)+'; toolbar cases: '+JSON.stringify(cases));}finally{await f.cleanup();}
}

const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const lane=process.env.KPLEX_NEIGHBORHOOD_LANE??'commands-rename',scenario={'commands-rename':commandsRename,'saved-drags':savedDrags,semantics,facets,'sidecar-popout':sidecarPopout,'toolbar-modifiers':toolbarModifiers}[lane];
if(!scenario)throw Error('Unknown neighborhood authoring lane');
const userData=process.env.KPLEX_OBSIDIAN_USER_DATA??(process.platform==='win32'?join(process.env.APPDATA,'obsidian'):process.platform==='darwin'?join(homedir(),'Library','Application Support','obsidian'):join(process.env.XDG_CONFIG_HOME??join(homedir(),'.config'),'obsidian'));
const lock=acquireHostLock({userDataPath:userData});
try{
 const definitions='c.sessions='+nativeDocumentSessions.toString()+';c.fixture='+nativeBatch270.toString()+';c.type='+typeNative.toString()+';c.htmlDrag='+nativeHtmlDrag.toString()+';c.captureRoot='+JSON.stringify(process.env.KPLEX_HOST_REPORT_DIR)+';c.fixturePrefix="__kplexNeighborhood_";c.originalData='+JSON.stringify(readFileSync(join(target.pluginDir,'data.json'),'utf8'))+';c.originalEnabled='+JSON.stringify(readFileSync(join(target.config,'community-plugins.json'),'utf8'))+';';
 await runControlledProbe('neighborhood-authoring-'+lane,scenario,definitions,['src/main.ts','src/adapters/obsidian/renameNote.ts','src/core/plex/views/classic/projection.ts','src/ui/RenameNoteModal.ts','src/ui/PinnedNodeBar.tsx','src/ui/App.tsx','src/ui/toolbarShortcuts.ts','src/ui/LongPressTooltip.ts','src/core/plex/actions.ts','src/core/graph/sourcePolicy.ts','src/core/graph/settingsPolicy.ts','src/core/plex/views/facets/validation.ts'],{maximumMs:900000});
}finally{lock.release();}
