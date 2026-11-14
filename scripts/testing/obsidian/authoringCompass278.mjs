/** Exact-build #278 acceptance in the explicitly selected disposable Small vault. The staging
 * caller owns immutable artifacts and the shared application-user-data lock. Production vaults
 * are never selected; every lane restores its own native/configuration/fixture lifetimes. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {homedir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {acquireHostLock} from './hostLock.mjs';
import {runControlledProbe} from './controlledProbe.mjs';
import {nativeDocumentSessions} from './nativeDocumentSessions.mjs';
import {nativeBatch270} from './nativeBatch270.mjs';
import {pins as nativePins270, settings as nativePinSettings270} from './pinsPreviewUri.mjs';
import {validateTarget} from './runner.mjs';

/** Capture the selected disposable renderer, independent of Windows foreground activation.
 * The staging caller supplies an owned external report directory; no vault file is written. */
async function nativeScreenshot(c,native,name){
 if(!c.captureRoot)return;
 if(!/^[a-zA-Z0-9-]+$/.test(name))throw Error('Owned native screenshot name');
 const screenshot=await native.webContents.capturePage();require('node:fs').writeFileSync(c.captureRoot+'/'+name+'.png',screenshot.toPNG());
}

/** Resolve the core Modal's actual X across the native markup used by supported hosts. */
export function nativeModalClose(modal){
 return modal.querySelector('.modal-close-button')??modal.querySelector('.modal-header-button .lucide-x')?.closest('.modal-header-button')??null;
}

/** Enter actual native text while proving focus, trusted input and the resulting control value. */
export async function nativeText(f,element,value){
 const doc=element.ownerDocument,native=await f.focus(doc);element.focus();f.check(doc.activeElement===element,'Native text focus');let trusted=false;
 const observe=event=>{if(event.target===element)trusted=event.isTrusted};doc.addEventListener('input',observe,true);
 try{await f.key(doc,'A',[process.platform==='darwin'?'meta':'control'],element);await native.webContents.insertText(value);
  await f.until(()=>trusted&&(element.value??element.textContent)===value,'Trusted native text',5000);
 }finally{doc.removeEventListener('input',observe,true);}
}

/** Real Files create/name input, delayed naming, nested/repeated operations and bounded source work. */
async function folders(app,c){
 const f=c.fixture(app,c),samples=[],events=[];
 try{
  await f.initialize();const p=f.p,note=await f.note('Origin','[[Native278Alias]]'),leaf=await f.canvas(note);await f.ready();
  const explorer=app.workspace.getLeavesOfType('file-explorer')[0]?.view;f.check(explorer&&app.commands.commands['file-explorer:new-folder'],'Actual Files command');
  const parent=app.vault.getFolderByPath(f.folder);let inspected=[],heads=0,passes=0;
  const repo=p.index.sourceAcquisition.repository,inspect=repo.inspect,headPage=repo.headPage,record=p.startupDiagnostics.recordWork;
  repo.inspect=function(...args){inspected.push(args[0]);return inspect.apply(this,args)};repo.headPage=function(...args){heads++;return headPage.apply(this,args)};
  p.startupDiagnostics.recordWork=function(key,...args){if(key==='sourceInventoryPasses')passes++;return record.call(this,key,...args)};
  f.restores.push(()=>{repo.inspect=inspect;repo.headPage=headPage;p.startupDiagnostics.recordWork=record;});
  for(const [owner,name]of [[app.vault,'create'],[app.vault,'rename'],[app.metadataCache,'resolved']]){
   const ref=owner.on(name,(file,old)=>events.push({event:name,path:file?.path,old,physical:p.index.completePhysicalFolderInventory,maintenance:p.index.sourceAcquisition.getMaintenanceRevision()}));f.restores.push(()=>owner.offref(ref));
  }
  /** Native command targeting is verified against the actual created parent, never assumed. */
  const createAndName=async(destination,name,delay)=>{
   let created;const ref=app.vault.on('create',file=>{if(Array.isArray(file.children)&&app.vault.getFolderByPath(file.path)===file)created=file});
   try{
    app.workspace.leftSplit?.expand();await app.workspace.revealLeaf(explorer.leaf);await explorer.revealInFolder(destination);
    await f.until(()=>explorer.containerEl.querySelector('[data-path="'+destination.path+'"]'),'Native parent Files row');
    const parentRow=explorer.containerEl.querySelector('[data-path="'+destination.path+'"]'),entry=parentRow.closest('.nav-folder-title')??parentRow.querySelector('.nav-folder-title')??parentRow;
    let hostMenu;const menuRef=app.workspace.on('file-menu',(menu,file)=>{if(file===destination){hostMenu=menu;menu.setUseNativeMenu(false)}});
    try{
     const doc=entry.ownerDocument,native=await f.focus(doc),xy=f.point(entry);
     native.webContents.sendInputEvent({type:'mouseMove',...xy});native.webContents.sendInputEvent({type:'mouseDown',...xy,button:'right',clickCount:1});native.webContents.sendInputEvent({type:'mouseUp',...xy,button:'right',clickCount:1});
     await f.until(()=>hostMenu&&doc.querySelector('.menu'),'Native Files context menu',5000);
     c.progress={phase:'Native Files context choices',items:hostMenu.items?.map(item=>({title:item.title,icon:item.icon}))};
     const choice=[...doc.querySelectorAll('.menu .menu-item')].find(item=>item.querySelector('svg.lucide-folder-plus')||item.querySelector('.menu-item-title')?.textContent==='New folder');
     f.check(choice,'Native New folder action not found: '+JSON.stringify(c.progress));await f.click(choice);
    }finally{app.workspace.offref(menuRef);}
    await f.until(()=>created,'Native Files folder CREATE');
    const owned=created;f.restores.push(async()=>{if(app.vault.getFolderByPath(owned.path)===owned)await app.vault.delete(owned,true)});
    f.check(created.parent===destination,'Native command created outside the selected parent');
    await f.until(()=>{const row=explorer.containerEl.querySelector('[data-path="'+created.path+'"]');return row?.querySelector('input,[contenteditable=true]')},'Native Files naming editor');
    const row=explorer.containerEl.querySelector('[data-path="'+created.path+'"]'),input=row.querySelector('input,[contenteditable=true]');
    if(delay)await f.wait(delay);await c.type(f,input,name);await f.key(input.ownerDocument,'Enter',[],input);
    const path=(destination.path==='/'?'':destination.path+'/')+name;
    await f.until(()=>created.path===path&&app.vault.getFolderByPath(path)===created,'Native Files rename receipt');
    await p.index.folderRenameTasks.get(created);
    await f.until(()=>p.index.sourceAcquisition.hasSemanticDependencies()&&!p.index.sourceAcquisition.inventory&&!p.index.isBuilding(),'Native naming source settlement');
    await p.index.physicalFolderValidationTask;await app.workspace.revealLeaf(leaf);await f.ready();return created;
   }finally{app.vault.offref(ref);}
  };
  for(const unrelated of [3,103]){
   for(let i=unrelated===3?0:3;i<unrelated;i++)f.files.push(await app.vault.create(f.folder+'/Unrelated-'+i+'.md',''));
   await f.until(()=>f.files.every(file=>!!app.metadataCache.getFileCache(file)),'Unrelated fixture metadata');await f.ready();
   inspected=[];heads=0;passes=0;const source=p.index.getSourceAcquisitionCounters(),builds=p.index.getSemanticPreparationDiagnostics().fullBuilds;
   const created=await createAndName(parent,'Named-'+unrelated,450),nested=await createAndName(created,'Nested',0);
   const file=await app.vault.create(nested.path+'/Target.md','---\naliases: [Native278Alias]\n---\n');f.files.push(file);
   await f.until(()=>!!app.metadataCache.getFileCache(file),'New nested note metadata');await f.ready();await p.index.physicalFolderValidationTask;
   f.check(p.index.completePhysicalFolderInventory,'Native naming lost complete folder coverage');
   f.check(passes===0&&heads===0,'Eligible native folder wave performed a global cached-source pass: '+JSON.stringify({passes,heads,events}));
   f.check(!inspected.some(path=>path.includes('/Unrelated-')),'Eligible native wave inspected unrelated notes');
   f.check(p.index.getSemanticPreparationDiagnostics().fullBuilds===builds,'Native folder naming started a full graph build');
   const after=p.index.getSourceAcquisitionCounters();samples.push({unrelated,files:app.vault.getFiles().length,inspections:inspected.length,headPages:heads,sourceInventoryPasses:passes,reads:after.vaultReads-source.vaultReads,parses:after.parses-source.parses,physicalComplete:true,delayedNamingMs:450,nested:true});
  }
  f.check(samples[1].inspections===samples[0].inspections,'Native eligible checks grew with unrelated vault size');
  return{samples,events};
 }finally{await f.cleanup();}
}

/** Real folder-gate pointer input and explicit native create/move/cancel choices. */
async function structural(app,c){
 const f=c.fixture(app,c),results=[];
 try{
  await f.initialize();let p=f.p;const parent=app.vault.getFolderByPath(f.folder);p.settings.showFolderNodes=true;p.settings.folderCreationTab='note';p.settings.newNodeAfterSaving='return';await p.saveSettings(false,false);
  const source=await app.vault.createFolder(f.folder+'/Source'),destination=await app.vault.createFolder(f.folder+'/Destination');
  f.restores.push(async()=>{for(const folder of [source,destination])if(app.vault.getFolderByPath(folder.path)===folder)await app.vault.delete(folder,true)});
  const child=await app.vault.create(source.path+'/Child.md','Preserve exact child bytes\n');f.files.push(child);
  await f.until(()=>!!app.metadataCache.getFileCache(child),'Structural child metadata');
  await f.until(()=>p.index.get('folder:'+source.path),'Native folder graph');
  const leaf=await f.canvas({path:'folder:'+source.path});await f.ready();
  const doc=leaf.view.contentEl.ownerDocument;
  /** Start at the rendered physical folder gate and release over proven empty canvas. */
  const open=async()=>{
   const node=[...leaf.view.contentEl.querySelectorAll('[data-kplex-path]')].find(node=>node.dataset.kplexPath==='folder:'+source.path),gate=node?.querySelector('[data-kplex-gate="bottom"]');
   f.check(gate,'Rendered folder child gate');const native=await f.focus(doc),start=f.point(gate),viewport=gate.closest('.kplex-plex');
   f.check(viewport,'Native graph viewport');const rect=viewport.getBoundingClientRect();let end;
   for(const [x,y]of [[rect.right-45,rect.bottom-80],[rect.left+45,rect.bottom-80],[rect.right-80,rect.top+100]]){
    const hit=doc.elementFromPoint(x,y);if(hit&&viewport.contains(hit)&&!hit.closest('[data-kplex-path],button,[data-kplex-gate],.kplex-edge-hit')){end={x:Math.round(x),y:Math.round(y)};break}
   }
   f.check(end,'Proven empty graph drop point');let trusted=false;const observe=event=>{if(event.target===gate)trusted=event.isTrusted};doc.addEventListener('pointerdown',observe,true);
   try{
    native.webContents.sendInputEvent({type:'mouseMove',...start});native.webContents.sendInputEvent({type:'mouseDown',...start,button:'left',clickCount:1});
    await f.until(()=>trusted,'Trusted folder gate pointerdown',5000);
    for(let i=1;i<=8;i++){native.webContents.sendInputEvent({type:'mouseMove',x:Math.round(start.x+(end.x-start.x)*i/8),y:Math.round(start.y+(end.y-start.y)*i/8),modifiers:['leftbuttondown']});await f.wait(25)}
    native.webContents.sendInputEvent({type:'mouseUp',...end,button:'left',clickCount:1});
    await f.until(()=>[...p.actionDialogs.keys()].some(dialog=>dialog.allowSubfolders),'Native folder creation tabs',5000);
    return [...p.actionDialogs.keys()].find(dialog=>dialog.allowSubfolders);
   }finally{doc.removeEventListener('pointerdown',observe,true);native.webContents.sendInputEvent({type:'mouseUp',...end,button:'left',clickCount:1})}
  };
  /** Buttons inside the active panel cannot be confused with identically named tabs. */
  const button=(modal,key)=>{const panel=modal.tabPanels?.[modal.folderTab]??modal.contentEl,action=key==='common.markdown'?'addRelated.createMarkdown':key;
   const value=key==='common.cancel'?c.close(modal.modalEl):[...panel.querySelectorAll('button')].find(item=>item.getAttribute('role')!=='tab'&&(item.getAttribute('aria-label')===p.translator(action)||item.textContent===p.translator(action)));f.check(value,'Native creation button '+key+': '+panel.outerHTML.slice(0,5500));return value};
  const press=async element=>{element.scrollIntoView({block:'center'});await f.wait(230);await f.click(element)};
  let modal=await open();if(c.visualPhase==='folder-note'){c.progress={phase:'Visual review',until:Date.now()+45000,dialog:'Create note'};await f.wait(45000)}f.check(modal.folderTab==='note'&&!modal.tabPanels.note.hidden,'Create note is not the default direct form');
  await press(button(modal,'common.cancel'));f.check(source.parent===parent&&source.children.length===1,'Cancel changed native structure');results.push('trusted folder gate/direct note/cancel');
  modal=await open();await c.type(f,modal.nameInput,'Direct note');await press(modal.contentEl.querySelector('.kplex-creation-types [role=tab][id$="-tab-markdown"]'));await f.until(()=>modal.selectedKind==='markdown','Explicit native Markdown tab');await press(button(modal,'common.markdown'));
  await f.until(()=>app.vault.getFileByPath(source.path+'/Direct note.md'),'Direct native note creation');const direct=app.vault.getFileByPath(source.path+'/Direct note.md');f.files.push(direct);await f.ready();results.push('note creation without an extra chooser');
  modal=await open();await press(modal.contentEl.querySelector('[role="tab"][id$="tab-folder"]'));await f.until(()=>!modal.tabPanels.folder.hidden,'Create subfolder tab');const fieldBounds=modal.tabPanels.folder.querySelector('input').getBoundingClientRect(),formBounds=modal.contentEl.getBoundingClientRect();f.check(fieldBounds.width>=formBounds.width*.9,'Subfolder name must occupy the full form width '+JSON.stringify({field:fieldBounds.width,form:formBounds.width}));if(c.visualPhase==='folder-subfolder'){c.progress={phase:'Visual review',until:Date.now()+45000,dialog:'Create subfolder',width:560};const native=f.owner(modal.contentEl.ownerDocument),bounds=native.getBounds();try{native.setContentSize(560,900);await f.focus(modal.contentEl.ownerDocument);await f.wait(45000)}finally{native.setBounds(bounds)}}
  await c.type(f,modal.tabPanels.folder.querySelector('input'),'Nested');await press(button(modal,'folderActions.create'));
  await f.until(()=>app.vault.getFolderByPath(source.path+'/Nested'),'Native subfolder');await f.ready();
  modal=await open();f.check(modal.folderTab==='folder'&&!modal.tabPanels.folder.hidden,'Last creation tab was not remembered');await press(button(modal,'common.cancel'));results.push('native subfolder/remembered tab');
  const observer=await f.note('Move observer','[['+child.path+']]'),oldChild=child.path,oldBody=await app.vault.read(observer);
  const show=p.showKplexMenuAtPosition;p.showKplexMenuAtPosition=function(menu,...args){menu.setUseNativeMenu(false);return show.call(this,menu,...args)};f.restores.push(()=>p.showKplexMenuAtPosition=show);
  const rename=app.fileManager.renameFile;let renames=0;app.fileManager.renameFile=async function(...args){renames++;return rename.apply(this,args)};f.restores.push(()=>app.fileManager.renameFile=rename);
  const node=leaf.view.contentEl.querySelector('[data-kplex-path="folder:'+source.path+'"]'),native=await f.focus(doc),xy=f.point(node);
  native.webContents.sendInputEvent({type:'mouseMove',...xy});native.webContents.sendInputEvent({type:'mouseDown',...xy,button:'right',clickCount:1});native.webContents.sendInputEvent({type:'mouseUp',...xy,button:'right',clickCount:1});
  await f.until(()=>[...doc.querySelectorAll('.menu-item')].some(item=>item.textContent.trim()===p.translator('moveNode.move')),'Physical node Move context action');
  await press([...doc.querySelectorAll('.menu-item')].find(item=>item.textContent.trim()===p.translator('moveNode.move')));
  await f.until(()=>[...p.actionDialogs.keys()].some(dialog=>dialog.source===source),'Move destination dialog');modal=[...p.actionDialogs.keys()].find(dialog=>dialog.source===source);
  const input=modal.contentEl.querySelector('.kplex-folder-path-input input');await c.type(f,input,destination.path);await f.key(doc,'Tab',[],input);await press(button(modal,'moveNode.move'));
  await f.until(()=>source.parent===destination&&child.path===destination.path+'/Source/Child.md','Native folder move');
  await f.until(()=>app.metadataCache.getFileCache(observer)?.links?.[0]?.link!==oldChild,'Obsidian link maintenance');
  const link=app.metadataCache.getFileCache(observer)?.links?.[0]?.link;f.check(link&&app.metadataCache.getFirstLinkpathDest(link,observer.path)===child&&(await app.vault.read(observer))!==oldBody,'Move did not preserve the actual incoming link');
  f.check(renames===1&&await app.vault.read(child)==='Preserve exact child bytes\n','Move bypassed FileManager or changed bytes');await f.ready();results.push('node Move uses FileManager and updates incoming links');
  f.check(!Object.keys(app.metadataCache.getFileCache(child)?.frontmatter??{}).filter(key=>key!=='position').length,'Structural actions wrote ontology');
  await p.settingsWriteQueue;p=await f.reload();f.check(p.settings.folderCreationTab==='folder','Creation tab did not survive reload');results.push('creation tab persisted across native reload');
  return{results,renames,physicalComplete:p.index.completePhysicalFolderInventory};
 }finally{await f.cleanup();}
}

/** Actual selected-field children, real metadata writes and selected-source reversal. */
async function authoring(app,c){
 const f=c.fixture(app,c),dialogs=[],results=[];
 /** Native modal entry animation must settle before its button hit test. */
 const press=async element=>{f.check(element,'Current authoring control after '+results.join('; '));element.scrollIntoView({block:'center'});await f.wait(230);const r=element.getBoundingClientRect(),hit=element.ownerDocument.elementFromPoint(r.x+r.width/2,r.y+r.height/2);c.progress={phase:'Authoring click',text:element.textContent,connected:element.isConnected,hit:hit?.outerHTML.slice(0,800)};await f.click(element)};
 try{
  await f.initialize();const p=f.p,t=p.translator,forward='Native278 child',reverse='Native278 parent';
  await p.assignFieldToOntology(reverse,'parent');await p.assignFieldToOntology(forward,'child',reverse);await f.ready();
  const a=await f.note('Author A','---\nUnrelated: preserve\n---\nBody survives\n'),b=await f.note('Author B','Body B survives\n');
  const leaf=await f.canvas(a);await f.ready();const doc=leaf.view.contentEl.ownerDocument;
  /** Every click resolves the currently mounted native button rather than a retired render. */
  const button=(modal,key)=>{const result=[...modal.contentEl.querySelectorAll('button')].find(button=>button.textContent===t(key));f.check(result,'Native authoring button '+key);return result};
  const field=modal=>modal.contentEl.querySelector('.kplex-add-related-ontology-search input'),name=modal=>modal.contentEl.querySelector('.kplex-add-related-note-search input');
  const open=(target)=>{const modal=p.openRelationModal({mode:'create',origin:p.index.get(a.path),fixedTarget:target? p.index.get(target.path):undefined,semanticRole:'child',hostLeaf:leaf,invocation:{continuation:'return'}});dialogs.push(modal);return modal};
  /** Real composer drafts survive both native child cancellation and canonical description Save. */
  for(const linking of [false,true]){
   const modal=open(linking?b:undefined);await f.until(()=>field(modal),'Mounted native composer');
   await c.type(f,field(modal),forward);await f.wait(80);await f.key(doc,'Enter',[],field(modal));
   if(!linking){await c.type(f,name(modal),'Draft retained');await f.key(doc,'Tab',[],name(modal))}
   const before={name:name(modal).value,field:field(modal).value,folder:modal.contentEl.querySelector('.kplex-folder-path-input input')?.value};
   const flip=modal.contentEl.querySelector('.kplex-relationship-direction button');await press(flip);
   await f.until(()=>modal.contentEl.querySelector('.kplex-relationship-direction').textContent.includes(linking?b.basename:'Draft retained'),'Native flipped owner preview');
   const edit=modal.contentEl.querySelector('.kplex-edit-selected-ontology');await press(edit);
   const child=modal.ontologyEditor.dialog;f.check(child&&child.fieldName===forward&&child.partner===reverse&&child.selected==='child','Exact selected ontology endpoint/pair/role');
   await press(button(child,'common.cancel'));await f.until(()=>modal.isSessionOpen(),'Parent composer after Cancel');
   f.check(name(modal).value===before.name&&field(modal).value===before.field&&modal.contentEl.querySelector('.kplex-folder-path-input input')?.value===before.folder,'Child Cancel replaced native drafts');
   f.check(doc.activeElement===edit,'Native child focus restoration');await press(edit);
   const saved=modal.ontologyEditor.dialog,description=saved.contentEl.querySelector('textarea[aria-label="'+t('ontology.description')+'"]');
   await c.type(f,description,'Native saved description');await press(button(saved,'common.save'));await f.until(()=>!saved.modalEl.isConnected,'Native ontology description Save');
   f.check(p.settings.ontologyDescriptions[forward]==='Native saved description','Canonical description not saved');f.check(name(modal).value===before.name&&field(modal).value===before.field,'Child Save replaced drafts');
   f.check(!(app.metadataCache.getFileCache(a)?.frontmatter??{})[forward]&&!(app.metadataCache.getFileCache(b)?.frontmatter??{})[reverse],'Editor shortcut wrote connection');
   modal.close();results.push((linking?'link':'create')+' exact editor/cancel/save/drafts/focus');
  }
  // Saved vocabulary changes must invalidate the old direction instead of silently reassigning it.
  let guarded=open(b);await f.until(()=>field(guarded),'Selection revalidation composer');await c.type(f,field(guarded),forward);await f.wait(80);await f.key(doc,'Enter',[],field(guarded));
  await press(guarded.contentEl.querySelector('.kplex-edit-selected-ontology'));let vocabulary=guarded.ontologyEditor.dialog;
  await f.key(doc,'Down',[],vocabulary.roleControl.selectEl);f.check(vocabulary.selected==='left','Native role selection');await press(vocabulary.saveButton.buttonEl);await f.until(()=>!vocabulary.opened,'Saved role change');
  f.check(guarded.contentEl.querySelector('.kplex-add-related-link-button').disabled&&name(guarded).value===b.basename,'Changed ontology role was silently reassigned or replaced target');
  await press(guarded.contentEl.querySelector('.kplex-edit-selected-ontology'));vocabulary=guarded.ontologyEditor.dialog;await f.key(doc,'Up',[],vocabulary.roleControl.selectEl);await press(vocabulary.saveButton.buttonEl);await f.until(()=>!vocabulary.opened,'Restore native role');
  await press(guarded.contentEl.querySelector('.kplex-edit-selected-ontology'));vocabulary=guarded.ontologyEditor.dialog;await press(button(vocabulary,'ontology.manager.remove'));await press(vocabulary.saveButton.buttonEl);await f.until(()=>!vocabulary.opened,'Saved field removal');
  f.check(guarded.contentEl.querySelector('.kplex-add-related-link-button').disabled&&name(guarded).value===b.basename&&!p.ontologyRoleForField(forward),'Deleted field was silently recreated');guarded.close();
  await p.assignFieldToOntology(forward,'child',reverse);results.push('saved role/removal revalidation preserves target and prevents implicit reassignment');
  // The retained native relink shell shares the same physical field editor, including its inverse.
  const relink=p.openRelationModal({mode:'relink',purpose:'ontology-add',origin:p.index.get(b.path),fixedTarget:p.index.get(a.path),semanticRole:'parent',initialField:reverse,hostLeaf:leaf});dialogs.push(relink);
  await f.until(()=>relink.contentEl.querySelector('.kplex-edit-selected-ontology'),'Native relink editor');await press(relink.contentEl.querySelector('.kplex-edit-selected-ontology'));
  const child=relink.selectedOntologyEditor.dialog;f.check(child.fieldName===reverse&&child.partner===forward&&child.selected==='parent','Inverse physical editor endpoint incorrect');await press(button(child,'common.cancel'));relink.close();results.push('relink inverse editor');
  let modal=open(b);await f.until(()=>field(modal),'Existing-note native composer');await c.type(f,field(modal),forward);await f.wait(80);await f.key(doc,'Enter',[],field(modal));
  await press(modal.contentEl.querySelector('.kplex-relationship-direction button'));await press(modal.contentEl.querySelector('.kplex-add-related-link-button'));
  await f.until(()=>!modal.modalEl.isConnected,'Existing reversed link completion');await f.ready();
  f.check(JSON.stringify(app.metadataCache.getFileCache(b)?.frontmatter?.[reverse]).includes('Author A'),'Flipped existing link wrote wrong owner/field');
  f.check(!(app.metadataCache.getFileCache(a)?.frontmatter??{})[forward],'Flipped existing link also wrote origin');results.push('existing reversed owner/property');
  // Inspect the actual pair through the registered surface action, then its per-declaration flip.
  const ref=file=>({kind:'file',identity:file.path,path:file.path});
  const outcome=await p.actionManager.dispatch({id:'relationship.details',source:'local-menu',surfaceId:f.surface(leaf),target:{kind:'edge',origin:ref(a),target:ref(b)}});
  f.check(outcome.status==='opened','Connection details surface dispatch '+JSON.stringify(outcome));
  await f.until(()=>doc.querySelector('.kplex-explanation-modal'),'Native details mounted');let details=doc.querySelector('.kplex-explanation-modal');
  const edit=[...details.querySelectorAll('button')].find(button=>button.getAttribute('aria-label')===t('ontology.editSelected',{field:reverse}));f.check(edit,'Details physical ontology edit');await press(edit);
  await f.until(()=>[...doc.querySelectorAll('.modal')].some(modal=>modal!==details&&modal.querySelector('textarea[aria-label="'+t('ontology.description')+'"]')),'Details child editor');
  const editor=[...doc.querySelectorAll('.modal')].find(modal=>modal!==details&&modal.querySelector('textarea[aria-label="'+t('ontology.description')+'"]'));
  f.check(editor.textContent.includes(reverse),'Details opened unrelated ontology');await press([...editor.querySelectorAll('button')].find(button=>button.textContent===t('common.cancel')));
  const reverseButton=[...details.querySelectorAll('button')].find(button=>button.getAttribute('aria-label')===t('relationship.flip'));f.check(reverseButton&&!reverseButton.disabled,'Selected-source flip missing');await press(reverseButton);
  await f.until(()=>[...doc.querySelectorAll('.modal')].some(modal=>modal!==details&&modal.querySelector('.kplex-ownership-preview')),'Reversal confirmation');
  const confirmation=[...doc.querySelectorAll('.modal')].find(modal=>modal!==details&&modal.querySelector('.kplex-ownership-preview'));
  if(c.visualPhase==='flip'){c.progress={phase:'Visual review',until:Date.now()+45000,dialog:'Flip owner'};await f.wait(45000)}
  const publish=p.publishSavedRelationship;p.publishSavedRelationship=async()=>{throw Error('Native278 expected post-save publication exception')};f.restores.push(()=>p.publishSavedRelationship=publish);
  f.check(confirmation.querySelectorAll('.kplex-ownership-preview').length===2&&confirmation.querySelectorAll('button').length===2,'Flip must show stable before/after with only Cancel and Save');
  await press([...confirmation.querySelectorAll('button')].find(button=>button.textContent===t('common.save')));
  await f.until(()=>confirmation.textContent.includes(t('relationship.replacementPending')),'Native saved replacement/pending publication');
  f.check(JSON.stringify(app.metadataCache.getFileCache(a)?.frontmatter?.[forward]).includes('Author B')&&JSON.stringify(app.metadataCache.getFileCache(b)?.frontmatter?.[reverse]).includes('Author A'),'Publication exception lost either durable replacement or original');
  p.publishSavedRelationship=publish;
  await press([...confirmation.querySelectorAll('button')].find(button=>button.textContent===t('common.save')));results.push('stable before/after; pending Save observes and safely completes');
  await f.until(()=>!confirmation.isConnected,'Selected declaration reversal');await f.ready();
  f.check(JSON.stringify(app.metadataCache.getFileCache(a)?.frontmatter?.[forward]).includes('Author B'),'Selected reversal replacement absent');
  f.check(!(app.metadataCache.getFileCache(b)?.frontmatter??{})[reverse],'Selected reversal did not remove original');
  f.check((await app.vault.read(a)).includes('Unrelated: preserve')&&(await app.vault.read(a)).includes('Body survives')&&(await app.vault.read(b)).includes('Body B survives'),'Reversal changed unrelated content');
  await f.key(doc,'Escape');await f.until(()=>!details.isConnected,'Native details Escape');results.push('details editor/selected reversal/unrelated content');
  modal=open();await f.until(()=>field(modal),'New-note native composer');await c.type(f,field(modal),forward);await f.wait(80);await f.key(doc,'Enter',[],field(modal));await c.type(f,name(modal),'New reversed');await f.key(doc,'Tab',[],name(modal));
  const folderInput=modal.contentEl.querySelector('.kplex-folder-path-input input');await c.type(f,folderInput,f.folder);await f.key(doc,'Tab',[],folderInput);
  await press(modal.contentEl.querySelector('.kplex-relationship-direction button'));
  const created=[];const createRef=app.vault.on('create',file=>{if(file.extension==='md'&&file.parent?.path===f.folder){created.push(file);f.files.push(file)}});
  try{const create=modal.contentEl.querySelector('.kplex-add-related-type-button[aria-label="'+t('addRelated.createMarkdown')+'"]')??modal.contentEl.querySelector('[data-kplex-primary-action="true"]');await press(create);await f.until(()=>created.length===1&&!modal.modalEl.isConnected,'New reversed file creation/link completion')}finally{app.vault.offref(createRef)}
  await f.ready();f.check(JSON.stringify(app.metadataCache.getFileCache(created[0])?.frontmatter?.[reverse]).includes('Author A'),'New note receiving property incorrect');results.push('new reversed file/metadata');
  return{results};
 }finally{for(const modal of dialogs)modal.close();await f.cleanup();}
}

/** Chromium's documented native Files payload transports actual filesystem Markdown/binary inputs.
 * The Node caller creates these owned source fixtures outside the vault; product code receives Files. */
async function imports(app,c){
 const f=c.fixture(app,c),results=[];let debuggerOwner;
 try{
  await f.initialize();const p=f.p,t=p.translator,a=await f.note('Import origin','Origin body\n'),other=await f.note('Unrelated active note','Untouched\n');p.settings.newNodeAfterSaving='return';await p.saveSettings(false,false);
  const leaf=await f.canvas(a,'k-plex-react-view',c.importWindow??'tab');await f.ready();const doc=leaf.view.contentEl.ownerDocument,native=await f.focus(doc),debuggerApi=native.webContents.debugger;
  if(!debuggerApi.isAttached()){debuggerApi.attach('1.3');debuggerOwner=debuggerApi}
  const created=[];const createRef=app.vault.on('create',file=>{if(file.extension&&file.path.startsWith(f.folder+'/')&&!f.files.includes(file)){created.push(file);f.files.push(file)}});f.restores.push(()=>app.vault.offref(createRef));
  const press=async element=>{f.check(element,'Native import control');element.scrollIntoView({block:'center'});await f.wait(230);await f.click(element)};
  const button=(modal,key)=>[...modal.contentEl.querySelectorAll('button')].find(button=>button.textContent===t(key));
  /** Trusted Chromium Files transport preserves every supplied external path and directory entry. */
  const drop=async(paths,targetPath=a.path)=>{
   const target=leaf.view.contentEl.querySelector('[data-kplex-path="'+targetPath+'"]'),xy=f.point(target);let receipt;
   const observe=event=>{receipt={trusted:event.isTrusted,types:[...event.dataTransfer.types],files:[...event.dataTransfer.files].map(file=>file.name)}};doc.addEventListener('drop',observe,true);
   try{for(const type of ['dragEnter','dragOver','drop'])await debuggerApi.sendCommand('Input.dispatchDragEvent',{type,...xy,data:{items:[],files:paths,dragOperationsMask:1}});
    await f.until(()=>receipt&&[...p.actionDialogs.keys()].some(dialog=>dialog.payload),'Actual filesystem import form');const batch=[...p.actionDialogs.keys()].find(dialog=>dialog.payload);
    await f.until(()=>batch.ready,'Complete native import inventory');f.check(receipt.trusted&&receipt.types.includes('Files'),'Files payload lost native trust');return{batch,receipt};
   }finally{doc.removeEventListener('drop',observe,true)}
  };
  let {batch,receipt}=await drop(c.externalSources.map(source=>source.path));if(c.visualPhase==='imports'){c.progress={phase:'Visual review',until:Date.now()+45000,dialog:'Import files'};await f.wait(45000)}f.check(created.length===0&&batch.rows.length===2,'Drop copied or omitted an input');
  f.check(!button(batch,'fileImport.configure')&&!button(batch,'relationship.flip'),'Import form has redundant configuration or owner flipping');batch.close();f.check(created.length===0,'Cancel copied');results.push({case:'one form/all rows/cancel/no flip',receipt});
  ({batch}=await drop(c.externalSources.map(source=>source.path)));
  const direction=batch.contentEl.querySelector('.kplex-add-related-role-select');f.check(direction?.value==='child','Import drop did not supply its child default');
  await f.key(doc,'Down',[],direction);await f.until(()=>direction.value==='parent'&&batch.roleFilter==='parent','Native editable import direction');
  const selectedField=p.defaultOntologyField('parent');f.check(batch.ontology===selectedField&&batch.contentEl.querySelector('.kplex-edit-selected-ontology svg'),'Import does not share the selected ontology editor');
  const filename=batch.contentEl.querySelector('.kplex-import-files input');await c.type(f,filename,'Renamed.bin');
  const original=p.linkNewRelatedFile;let attempts=0;p.linkNewRelatedFile=async function(...args){attempts++;if(attempts===1)throw Error('Native278 expected link failure');return original.apply(this,args)};f.restores.push(()=>p.linkNewRelatedFile=original);
  await app.workspace.getLeaf('tab').openFile(other);await press(button(batch,'fileImport.importAll'));
  await f.until(()=>!batch.busy&&batch.rows[0].file,'Saved copy before link failure');const first=batch.rows[0].file;f.check(created.length===1&&!batch.rows[0].saved,'Failure lost partial copy');
  await press(button(batch,'fileImport.importAll'));await f.until(()=>!batch.opened,'Common import retry');f.check(created.length===2&&batch.rows[0].file===first&&batch.rows.every(row=>row.saved),'Retry duplicated a file or omitted one');
  for(let i=0;i<2;i++)f.check(JSON.stringify([...new Uint8Array(await app.vault.readBinary(batch.rows[i].file))])===JSON.stringify(c.externalSources[i].bytes),'Imported bytes differ');
  await app.workspace.revealLeaf(leaf);await f.focus(doc);await f.ready();const properties=app.metadataCache.getFileCache(a)?.frontmatter??{};f.check(JSON.stringify(properties[selectedField]).includes('Renamed.bin')&&JSON.stringify(properties[selectedField]).includes('Native278'),'Selected parent relation lost captured origin');f.check(!app.metadataCache.getFileCache(other)?.frontmatter,'An unrelated active note received properties');results.push('editable parent relation/shared ontology editor/captured origin/exact-file retry');p.linkNewRelatedFile=original;
  ({batch}=await drop([c.externalSources[0].path]));f.check(batch.rows.length===1&&batch.contentEl.querySelector('.kplex-import-files input'),'Single file needs a direct form');batch.close();results.push('single-file direct confirmation');
  p.settings.showFolderNodes=true;await p.saveSettings(false,false);p.notifyNavigation('folder:'+f.folder,leaf);await f.until(()=>leaf.view.contentEl.querySelector('[data-kplex-path="folder:'+f.folder+'"]'),'Folder import target');await f.ready();
  ({batch}=await drop([c.externalDirectory],'folder:'+f.folder));f.check(batch.directories.length===3&&batch.rows.length===2,'Recursive inventory missing nested or empty folders');f.check(!batch.contentEl.querySelector('input[aria-label="'+t('addRelated.ontologyAria')+'"]'),'Folder import offered ontology');
  const rootName=c.externalDirectory.split(/[\\/]/).at(-1),importRoot=f.folder+'/'+rootName;
  f.restores.push(async()=>{const folder=app.vault.getFolderByPath(importRoot);if(folder&&folder.path.startsWith(f.folder+'/'))await app.vault.delete(folder,true)});
  await press(button(batch,'fileImport.importAll'));await f.until(()=>!batch.opened,'Recursive native folder import');
  f.check(app.vault.getFolderByPath(importRoot+'/Empty')&&app.vault.getFileByPath(importRoot+'/Nested/Note.md'),'Recursive import lost hierarchy');
  f.check(await app.vault.read(app.vault.getFileByPath(importRoot+'/Nested/Note.md'))==='# Nested external note\n','Nested Markdown bytes changed');results.push('recursive folder import/empty directories/no ontology');
  const hostFs=require('node:fs');for(const source of c.externalSources)f.check(JSON.stringify([...hostFs.readFileSync(source.path)])===JSON.stringify(source.bytes),'External source changed');
  return{results,filesCopied:created.length,realm:c.importWindow??'tab'};
 }finally{debuggerOwner?.detach();await f.cleanup();}
}

/** Presentation-only Compass orientation in two native realms, including persisted reload. */
async function compass(app,c){
 const f=c.fixture(app,c),samples=[];
 try{
  await f.initialize();let p=f.p;const roles=['parent','child','left','right','previous','next'],names=['Parent','Child','صديق Friend','אתגר Challenger','Previous السابق','Next הבא'],files=[];
  for(const name of names)files.push(await f.note(name,'Mixed-direction labels remain literal.\n'));
  const fields=roles.map(role=>p.defaultOntologyField(role));
  const center=await f.note('Compass center','---\n'+roles.map((role,i)=>JSON.stringify(fields[i])+': '+JSON.stringify(['[['+files[i].path.replace(/\.md$/,'')+']]'])).join('\n')+'\n---\nCenter\n');
  await p.updateCanvasViewConfiguration('classic',{field:'flipEastWest'},{kind:'set',value:false});
  const main=await f.canvas(center),popout=await f.canvas(center,'k-plex-react-view','window');await f.ready();
  /** Compare physical screen displacement after native rendering, independent of each camera. */
  const positions=leaf=>{const root=leaf.view.contentEl,origin=root.querySelector('[data-kplex-path="'+center.path+'"]')?.getBoundingClientRect();if(!origin)return null;
   const out={};for(let i=0;i<files.length;i++){const node=root.querySelector('[data-kplex-path="'+files[i].path+'"]');if(!node)return null;const r=node.getBoundingClientRect();out[roles[i]]={x:r.x+r.width/2-origin.x-origin.width/2,y:r.y+r.height/2-origin.y-origin.height/2,text:node.textContent}}return out};
  await f.until(()=>positions(popout),'Native all six Compass roles');await app.workspace.revealLeaf(main);await f.until(()=>positions(main),'Main Compass six roles');const normal=positions(main);
  const source=p.index.getSourceAcquisitionCounters(),builds=p.index.getSemanticPreparationDiagnostics().fullBuilds;
  await p.updateCanvasViewConfiguration('classic',{field:'flipEastWest'},{kind:'set',value:true});await f.wait(300);
  await f.until(()=>positions(main)?.left.x>0&&positions(main)?.right.x<0,'Mirrored main physical positions');
  await app.workspace.revealLeaf(popout);await f.until(()=>positions(popout)?.left.x>0&&positions(popout)?.right.x<0,'Mirrored popout physical positions');
  for(const leaf of [main,popout]){const mirrored=positions(leaf);f.check(mirrored.previous.x>0&&mirrored.next.x<0&&mirrored.parent.y<0&&mirrored.child.y>0,'Native Compass role geometry');
   f.check(mirrored.left.text.includes(names[2])&&mirrored.right.text.includes(names[3]),'Mixed-direction text was transformed');const labels=leaf.view.contentEl.querySelectorAll('.kplex-zone-label');f.check([...labels].some(label=>label.classList.contains('zone-right')&&label.textContent===p.translator('app.zoneFriendsPrevious')),'Physical backdrop label not mirrored');
  }
  f.check(JSON.stringify(p.index.getSourceAcquisitionCounters())===JSON.stringify(source)&&p.index.getSemanticPreparationDiagnostics().fullBuilds===builds,'Orientation acquired source facts or rebuilt semantics');samples.push({case:'main/popout six-role orientation',normal,mirrored:positions(main),sourceReads:0,fullBuilds:0});
  await app.workspace.revealLeaf(main);const appEl=main.view.contentEl.querySelector('.kplex-app');await p.actionManager.dispatch({id:'selection.center',source:'internal',surfaceId:f.surface(main)});await f.key(appEl.ownerDocument,'Right',[],appEl);
  await f.until(()=>[...main.view.contentEl.querySelectorAll('.is-keyboard-selected')].some(node=>node.dataset.kplexPath===files[2].path||node.dataset.kplexPath===files[4].path),'Mirrored physical Right navigation');samples.push({case:'trusted physical Right keyboard navigation'});
  const centerNode=main.view.contentEl.querySelector('[data-kplex-path="'+center.path+'"]'),gate=centerNode.querySelector('[data-kplex-gate="right"]'),doc=gate.ownerDocument,native=await f.focus(doc),start=f.point(gate),viewport=gate.closest('.kplex-plex'),bounds=viewport.getBoundingClientRect();
  const end={x:Math.round(bounds.right-35),y:Math.round(bounds.bottom-70)},hit=doc.elementFromPoint(end.x,end.y);f.check(hit&&viewport.contains(hit)&&!hit.closest('[data-kplex-path],button,[data-kplex-gate]'),'Compass empty gate drop point');
  let opened,chosen;const open=p.openRelationModal;p.openRelationModal=function(options){chosen=options.semanticRole;return opened=open.call(this,options)};
  try{native.webContents.sendInputEvent({type:'mouseMove',...start});native.webContents.sendInputEvent({type:'mouseDown',...start,button:'left',clickCount:1});for(let i=1;i<=8;i++){native.webContents.sendInputEvent({type:'mouseMove',x:Math.round(start.x+(end.x-start.x)*i/8),y:Math.round(start.y+(end.y-start.y)*i/8),modifiers:['leftbuttondown']});await f.wait(25)}native.webContents.sendInputEvent({type:'mouseUp',...end,button:'left',clickCount:1});await f.until(()=>opened,'Mirrored native gate composer');f.check(chosen==='left','Physical right gate created wrong semantic role: '+chosen);samples.push({case:'trusted physical right gate drag',semanticRole:chosen});}
  finally{native.webContents.sendInputEvent({type:'mouseUp',...end,button:'left',clickCount:1});opened?.close();p.openRelationModal=open}
  await p.settingsTab.setControlValue('layout.'+p.getTypographyDevice()+'.leaf.lateralArrangement',true);
  await f.until(()=>positions(main)?.right.x>0,'Native one-sided mirrored composition '+JSON.stringify({device:p.getTypographyDevice(),arrangement:p.getViewSettings('leaf').lateralArrangement,positions:positions(main)}));samples.push({case:'one-sided mirrored composition'});
  popout.detach();p=await f.reload();f.check(p.readCanvasViewConfiguration('classic').values.flipEastWest===true,'Orientation not persisted/reloaded');samples.push({case:'native writer/reload',value:true});
  return{samples};
 }finally{await f.cleanup();}
}

/** Reuse the accepted native pin suite, adding computed visual evidence during each held gesture. */
async function pins(app,c){
 const fixture=c.fixture,visual=[];
 c.fixture=(app,context)=>{const f=fixture(app,context),drag=f.drag;
  /** Inspect the real held gesture before its existing release/cancel paths execute. */
  f.drag=(handle,destination,cancel)=>drag(handle,destination,async(doc,native)=>{
   const source=doc.querySelector('.kplex-pinned-chip.is-reorder-source'),list=source?.parentElement,other=[...list.children].find(row=>row!==source&&!row.classList.contains('is-reorder-before'));
   f.check(source&&list.classList.contains('is-reordering'),'Native visual source missing');
   const css=doc.defaultView.getComputedStyle(source),offset=source.style.getPropertyValue('--reorder-drag-x'),dim=other&&doc.defaultView.getComputedStyle(other).opacity;
   f.check(offset&&Number.parseFloat(offset)!==0&&css.transform!=='none'&&css.outlineStyle!=='none'&&css.opacity==='1'&&dim==='0.5','Native drag feedback not rendered');
   f.check(list.classList.contains('is-reorder-end')||list.querySelector('.is-reorder-before'),'Native insertion feedback absent');
   visual.push({sourceMoves:true,accentOutline:true,otherOpacity:dim,insertionMarker:true,popout:doc!==document});
   if(c.visualHold&&visual.length===1){c.progress={phase:'Held native pin gesture for visual review',visual:visual[0]};await f.wait(40000)}
   if(cancel)await cancel(doc,native);
  });return f;
 };
 try{const accepted=await c.pins(app,c);return{...accepted,visual};}finally{c.fixture=fixture}
}

/** Native popout close and main-to-popout migration retire parent/child authoring capabilities. */
async function lifetime(app,c){
 const f=c.fixture(app,c),dialogs=[],results=[];
 try{
  await f.initialize();const p=f.p,a=await f.note('Lifetime A'),b=await f.note('Lifetime B');await p.assignFieldToOntology('Native278 lifetime','child');
  for(const kind of ['popout-close','migration']){
   const leaf=await f.canvas(a,'k-plex-react-view',kind==='popout-close'?'window':'tab'),doc=leaf.view.contentEl.ownerDocument;await f.focus(doc);
   const modal=p.openRelationModal({mode:'create',origin:p.index.get(a.path),fixedTarget:p.index.get(b.path),semanticRole:'child',hostLeaf:leaf,invocation:{continuation:'return'}});dialogs.push(modal);
   await f.until(()=>modal.contentEl.querySelector('.kplex-add-related-ontology-search input'),'Native lifetime composer');f.check(modal.contentEl.ownerDocument===doc,'Composer mounted in another document');
   const field=modal.contentEl.querySelector('.kplex-add-related-ontology-search input');await c.type(f,field,'Native278 lifetime');await f.wait(80);await f.key(doc,'Enter',[],field);
   const edit=modal.contentEl.querySelector('.kplex-edit-selected-ontology');await f.click(edit);const child=modal.ontologyEditor.dialog;
   f.check(child&&child.modalEl.ownerDocument===doc,'Ontology child mounted in another document');const before=JSON.stringify(p.settings.ontologyDescriptions);
   if(kind==='popout-close')leaf.detach();else{app.workspace.moveLeafToPopout(leaf);await f.until(()=>leaf.view.contentEl.ownerDocument!==doc,'Native authoring migration');await leaf.view.waitUntilReady()}
   await f.until(()=>!modal.isSessionOpen()&&!child.opened,'Native authoring lifetime retirement',5000);
   await child.save();f.check(JSON.stringify(p.settings.ontologyDescriptions)===before,'Retired child persisted a draft');
   f.check(!Object.keys(app.metadataCache.getFileCache(a)?.frontmatter??{}).length&&!Object.keys(app.metadataCache.getFileCache(b)?.frontmatter??{}).length,'Retirement wrote a connection');results.push({case:kind,parentReady:modal.isSessionOpen(),childOpen:child.opened});
   modal.close();leaf.detach();
  }
  const leaf=await f.canvas(a,'k-plex-react-view','window'),doc=leaf.view.contentEl.ownerDocument;await f.focus(doc);const before=app.vault.getFiles().length;
  p.openExternalFileImports(p.index.get(a.path),{files:[new doc.defaultView.File(['Not copied'],'Cancelled.md')],directory:false},'child',leaf,f.surface(leaf));
  await f.until(()=>[...p.actionDialogs.keys()].some(dialog=>dialog.ready&&dialog.rows?.length===1),'Direct popout import form');
  const batch=[...p.actionDialogs.keys()].find(dialog=>dialog.ready&&dialog.rows?.length===1);f.check(batch.contentEl.ownerDocument===doc,'Import form mounted in another document');
  leaf.detach();await f.until(()=>!batch.opened,'Popout import close retires direct form',5000);await batch.submit();
  f.check(app.vault.getFiles().length===before&&batch.rows.every(row=>!row.file),'Closing unconfirmed popout import copied a file');results.push({case:'popout-import-close',copies:0,batchOpen:batch.opened,staleSubmitCreatesNothing:true});
  return{results};
 }finally{for(const modal of dialogs)modal.close();await f.cleanup();}
}

/** Inspect the installed host's actual native command/Files controls before choosing input routes. */
/** Actual Files folder menu and native drag-manager source opening an existing canvas. */
async function navigation(app,c){
 const f=c.fixture(app,c),results=[];let debuggerOwner;
 try{
  await f.initialize();const p=f.p,t=p.translator,seed=await f.note('Opening seed','Seed\n');p.settings.showFolderNodes=true;await p.saveSettings(false,false);
  const folder=await app.vault.createFolder(f.folder+'/Open target'),file=await app.vault.create(folder.path+'/Child.md','Child\n');f.files.push(file);f.restores.push(async()=>{if(folder.path.startsWith(f.folder+'/')&&app.vault.getFolderByPath(folder.path)===folder)await app.vault.delete(folder,true)});
  const leaf=await f.canvas(seed);await f.ready();const explorer=app.workspace.getLeavesOfType('file-explorer')[0]?.view;f.check(explorer,'Native Files view');app.workspace.leftSplit.expand();await app.workspace.revealLeaf(explorer.leaf);await explorer.revealInFolder(folder);
  await f.until(()=>explorer.containerEl.querySelector('[data-path="'+folder.path+'"]'),'Native Files folder');const row=explorer.containerEl.querySelector('[data-path="'+folder.path+'"]'),entry=row.closest('.nav-folder-title')??row.querySelector('.nav-folder-title')??row;
  let menu;const menuRef=app.workspace.on('file-menu',(value,target)=>{if(target===folder){menu=value;value.setUseNativeMenu(false)}});f.restores.push(()=>app.workspace.offref(menuRef));
  const doc=entry.ownerDocument,native=await f.focus(doc),point=f.point(entry);native.webContents.sendInputEvent({type:'mouseMove',...point});native.webContents.sendInputEvent({type:'mouseDown',...point,button:'right',clickCount:1});native.webContents.sendInputEvent({type:'mouseUp',...point,button:'right',clickCount:1});
  await f.until(()=>menu&&[...doc.querySelectorAll('.menu-item')].some(item=>item.textContent.trim()===t('fileMenu.openFolder')),'Folder Open in K-Plex menu');
  await f.click([...doc.querySelectorAll('.menu-item')].find(item=>item.textContent.trim()===t('fileMenu.openFolder')));
  const path='folder:'+folder.path;await f.until(()=>app.workspace.getLeavesOfType('k-plex-react-view').some(item=>p.documentSession(item)?.centerPath===path&&item.view.contentEl.querySelector('[data-kplex-path="'+path+'"]')),'Native folder menu target');results.push('Files context menu opens captured folder');
  p.notifyNavigation(seed.path,leaf);await f.until(()=>leaf.view.contentEl.querySelector('[data-kplex-path="'+seed.path+'"]'),'Different canvas center before drag');await f.ready();
  await app.workspace.revealLeaf(explorer.leaf);await explorer.revealInFolder(folder);const currentRow=explorer.containerEl.querySelector('[data-path="'+folder.path+'"]'),source=currentRow.closest('.nav-folder-title')??currentRow.querySelector('.nav-folder-title')??currentRow;
  const start=f.point(source),end=f.point(leaf.view.contentEl.querySelector('[data-kplex-path="'+seed.path+'"]'));let dragStarted=false,dropped=false;
  const observeStart=event=>{if(source.contains(event.target)||event.target.contains?.(source)){dragStarted=event.isTrusted;c.pinState={dragStarted,shape:Object.keys(app.dragManager?.draggable??{})}}},observeDrop=event=>{dropped=event.isTrusted};
  doc.addEventListener('dragstart',observeStart,true);doc.addEventListener('drop',observeDrop,true);
  try{
   await f.focus(doc);native.webContents.sendInputEvent({type:'mouseMove',...start});native.webContents.sendInputEvent({type:'mouseDown',...start,button:'left',clickCount:1});
   for(let i=1;i<=12;i++){native.webContents.sendInputEvent({type:'mouseMove',x:Math.round(start.x+(end.x-start.x)*i/12),y:Math.round(start.y+(end.y-start.y)*i/12),modifiers:['leftbuttondown']});await f.wait(30)}
   if(dragStarted&&!dropped){const api=native.webContents.debugger;if(!api.isAttached()){api.attach('1.3');debuggerOwner=api}for(const type of ['dragEnter','dragOver','drop'])await api.sendCommand('Input.dispatchDragEvent',{type,...end,data:{items:[{mimeType:'text/plain',data:folder.path}],dragOperationsMask:1}});}
   native.webContents.sendInputEvent({type:'mouseUp',...end,button:'left',clickCount:1});
   await f.until(()=>dragStarted&&dropped&&p.documentSession(leaf)?.centerPath===path&&leaf.view.contentEl.querySelector('[data-kplex-path="'+path+'"]'),'Trusted native folder drag opening',10000);results.push('native Files drag source and trusted canvas drop open folder');
  }finally{doc.removeEventListener('dragstart',observeStart,true);doc.removeEventListener('drop',observeDrop,true);native.webContents.sendInputEvent({type:'mouseUp',...end,button:'left',clickCount:1});}
  return{results};
 }finally{debuggerOwner?.detach();await f.cleanup();}
}

/** Real periodic pin confirmation, independent persisted opening choice and native destinations. */
async function periodic(app,c){
 const f=c.fixture(app,c),results=[];
 try{
  await f.initialize();let p=f.p;const seed=await f.note('Periodic origin','Seed\n'),leaf=await f.canvas(seed);await f.ready();let doc=leaf.view.contentEl.ownerDocument;
  const trace=[],acquisition=p.index.sourceAcquisition;
  for(const name of ['durableHostInventory','markResolutionDependents']){const original=acquisition[name];acquisition[name]=async function(...args){trace.push({phase:'begin',name,source:typeof args[0]==='string'?args[0]:args[0]?.slice?.(0,3)});if(trace.length>40)trace.shift();try{return await original.apply(this,args)}finally{trace.push({phase:'end',name});if(trace.length>40)trace.shift()}};f.restores.push(()=>acquisition[name]=original)}
  const baseBuilds=p.index.getSemanticPreparationDiagnostics().fullBuilds;
  const cases=[['day','return'],['week','sidecar'],['month','tab'],['day','window']];
  for(let i=0;i<cases.length;i++){
   const [period,destination]=cases[i];p.settings.pinnedNodes=[];
   await p.updatePeriodicPin(period,{folder:f.folder+'/Periodic '+i,useDailyNotes:false,format:period==='day'?'YYYY-MM-DD':period==='week'?'GGGG-[W]WW':'YYYY-MM'},true);
   const row=p.readSavedPins().find(row=>row.period===period);f.check(row?.state==='missing'&&row.path.startsWith(f.folder+'/'),'Owned missing periodic path');
   const configRoot=f.folder+'/Periodic '+i;f.restores.push(async()=>{const folder=app.vault.getFolderByPath(configRoot);if(folder&&folder.path.startsWith(f.folder+'/'))await app.vault.delete(folder,true)});
   const open=async()=>{await p.actionManager.dispatch({id:'pin.open-slot.1',source:'internal',surfaceId:f.surface(leaf)});await f.until(()=>[...p.actionDialogs.keys()].some(dialog=>dialog.pinId===row.id),'Native periodic confirmation');return [...p.actionDialogs.keys()].find(dialog=>dialog.pinId===row.id)};
   let modal=await open();f.check(modal.contentEl.textContent.includes(row.path)&&!app.vault.getFileByPath(row.path),'Missing pin created before confirmation');modal.close();f.check(!app.vault.getFileByPath(row.path),'Cancel created periodic file');
   modal=await open();await f.until(()=>modal.contentEl.querySelector('select'),'Periodic opening control');if(i===0&&c.visualPhase==='periodic'){c.progress={phase:'Visual review',until:Date.now()+45000,dialog:'Create periodic note'};await f.wait(45000)}const select=modal.contentEl.querySelector('select'),index=[...select.options].findIndex(option=>option.value===destination);f.check(index>=0,'Opening choice unavailable');
   await f.key(doc,'Home',[],select);for(let n=0;n<index;n++)await f.key(doc,'Down',[],select);await f.key(doc,'Tab',[],select);
   await f.until(()=>p.settings.periodicNoteAfterSaving===destination,'Remembered periodic opening choice');
   const create=[...modal.contentEl.querySelectorAll('button')].find(button=>button.textContent===p.translator('pins.createAction'));create.scrollIntoView({block:'center'});await f.wait(230);await f.click(create);
   await f.until(()=>app.vault.getFileByPath(row.path)&&!modal.opened&&!modal.busy&&!modal.completing,'Confirmed periodic file and completed native opening');const file=app.vault.getFileByPath(row.path);f.files.push(file);
   if(destination==='return'){
    await f.until(()=>p.documentSession(leaf)?.centerPath===file.path,'Do not open still follows the pin');f.check(!app.workspace.getLeavesOfType('markdown').some(item=>item.view.file===file),'Do not open created a native editor');
   }else{
    const matching=()=>app.workspace.getLeavesOfType('markdown').filter(item=>item.view.file===file);
    const destinationLeaf=()=>destination==='sidecar'?matching().find(item=>item===p.documentSession(leaf)?.linkedDocumentLeaf)
      :destination==='window'?matching().find(item=>item.view.containerEl.ownerDocument!==doc)
      :matching().find(item=>item.parent===leaf.parent&&item!==leaf);
    await f.until(()=>destinationLeaf(),'Exact periodic native destination');const opened=destinationLeaf();
    for(const item of matching())if(!f.leaves.includes(item))f.leaves.push(item);
    f.check(opened,'Configured periodic destination absent');
   }
   await p.revealActionSurface(f.surface(leaf));await f.until(()=>p.isKplexLeafVisible(leaf),"Periodic canvas revealed");await f.focus(doc);
   const inspect=()=>{const a=p.index.sourceAcquisition;return{period,destination,center:p.documentSession(leaf)?.centerPath,initial:p.initialIndexComplete,visible:p.isKplexLeafVisible(leaf),dirty:p.indexDirty,reasons:[...p.indexBacklogReasons],dirtyPaths:[...p.dirtyMarkdownPaths],rebuild:!!p.rebuildTask,timer:p.rebuildTimer!==null,building:p.index.isBuilding(),demand:[...p.index.semanticDemandCounts],tasks:[...p.index.semanticPreparationTasks.keys()],source:a.getActivityState(),pendingKnown:[...a.pendingKnownFiles].map(file=>file.path),pendingImpacts:[...a.pendingKnownImpacts.keys()].map(file=>file.path),fanouts:[...a.knownFanoutTasks.keys()].map(file=>file.path),scheduler:p.index.workScheduler.diagnostics(),trace:trace.slice(-12)}};
   c.pinState=inspect();const observer=window.setInterval(()=>{c.pinState=inspect()},300);
   try{await f.ready()}finally{window.clearInterval(observer)}
   results.push({period,destination,path:row.path,confirmed:true,cancelCreatesNothing:true});
  }
  await p.settingsWriteQueue;p=await f.reload();f.check(p.settings.periodicNoteAfterSaving==='window','Periodic preference did not survive reload');
  return{results,persistedChoice:p.settings.periodicNoteAfterSaving,fullBuildsBefore:baseBuilds};
 }finally{await f.cleanup();}
}

/** Core Daily Notes performs actual template expansion; K-Plex owns confirmation and opening. */
async function dailyTemplate(app,c){
 const f=c.fixture(app,c),results=[];
 try{
  await f.initialize();const p=f.p,seed=await f.note('Daily origin','Seed\n'),templateText='---\nsentinel: native-daily-template-278\n---\n# {{title}}\nDate: {{date:YYYY-MM-DD}}\nTime: {{time:HH:mm}}\n';
  const template=await f.note('Configured daily template',templateText),leaf=await f.canvas(seed);await f.ready();
  const record=app.internalPlugins.getPluginById('daily-notes'),core=record?.instance;
  f.check(record?.enabled!==false&&typeof core?.getDailyNote==='function','Enabled native core Daily Notes capability');
  const options=core.options;f.restores.push(()=>core.options=options);const ownedRoot=app.vault.getFolderByPath(f.folder);f.restores.push(async()=>{for(const child of [...ownedRoot.children])if(app.vault.getFolderByPath(child.path)===child&&child.path.startsWith(f.folder+'/'))await app.vault.delete(child,true)});
  const configPath=app.vault.configDir+'/daily-notes.json',hadConfig=await app.vault.adapter.exists(configPath),configBefore=hadConfig?await app.vault.adapter.read(configPath):null;
  p.settings.periodicNoteAfterSaving='return';
  const doc=leaf.view.contentEl.ownerDocument;
  const open=async row=>{await p.actionManager.dispatch({id:'pin.open-slot.1',source:'internal',surfaceId:f.surface(leaf)});await f.until(()=>[...p.actionDialogs.keys()].some(dialog=>dialog.pinId===row.id),'Configured daily confirmation');return [...p.actionDialogs.keys()].find(dialog=>dialog.pinId===row.id)};
  for(const useDefault of [false,true]){
   const parent=app.fileManager.getNewFileParent('').path,format=useDefault?'['+f.folder+'/Default/]YYYY-MM-DD':'YYYY/YYYY-MM-DD dddd';
   core.options={...options,folder:useDefault?'':f.folder,format,template:template.path};
   if(useDefault&&parent!=='/'){const ownedPath=parent+'/'+f.folder;f.restores.push(async()=>{const folder=app.vault.getFolderByPath(ownedPath);if(folder&&folder.path===ownedPath&&ownedPath.endsWith('/'+f.folder))await app.vault.delete(folder,true)});}
   p.settings.pinnedNodes=[];await p.updatePeriodicPin('day',{useDailyNotes:true},true);
   const row=p.readSavedPins().find(item=>item.period==='day');f.check(row?.state==='missing'&&row.path.includes(f.folder+'/'),'Owned configured daily destination');
   let modal=await open(row);f.check(modal.contentEl.textContent.includes(row.path),'Wrong displayed daily destination');modal.close();f.check(!app.vault.getFileByPath(row.path),'Daily Cancel wrote a note');
   modal=await open(row);await f.until(()=>modal.contentEl.querySelector('select'),'Configured daily opening choice');
   if(c.visualPhase==='daily-template'){c.progress={phase:'Visual review',until:Date.now()+45000,dialog:'Configured Daily Notes creation'};await f.wait(45000)}
   await f.click([...modal.contentEl.querySelectorAll('button')].find(button=>button.textContent===p.translator('pins.createAction')));
   await f.until(()=>!modal.busy&&!modal.completing&&!modal.modalEl.isConnected&&app.vault.getFileByPath(row.path),'Native daily template creation');
   const file=app.vault.getFileByPath(row.path);f.files.push(file);const content=await app.vault.read(file),stamp=window.moment().format('YYYY-MM-DD');
   f.check(content.includes('sentinel: native-daily-template-278')&&content.includes('Date: '+stamp)&&/Time: \d{2}:\d{2}/.test(content)&&!content.includes('{{'),'Core template was not expanded '+content);
   f.check(content.includes('# '+window.moment().startOf('day').format(format)),'Daily title/configured format was not applied');
   f.check(!app.workspace.getLeavesOfType('markdown').some(item=>item.view.file===file),'Do not open created a native daily editor');
   f.check(await app.vault.read(template)===templateText,'Template source changed');results.push({case:useDefault?'default native parent':'configured folder/nested date format',path:row.path,templateExpanded:true,cancelCreatesNothing:true});
   await p.revealActionSurface(f.surface(leaf));await f.ready();
  }
  core.options={...options,folder:f.folder,format:'[Missing template ]YYYY-MM-DD',template:f.folder+'/Absent template.md'};p.settings.pinnedNodes=[];await p.updatePeriodicPin('day',{useDailyNotes:true},true);
  const missing=p.readSavedPins().find(item=>item.period==='day'),modal=await open(missing);
  await f.until(()=>modal.contentEl.querySelector('select'),'Missing-template confirmation');await f.click([...modal.contentEl.querySelectorAll('button')].find(button=>button.textContent===p.translator('pins.createAction')));
  await f.until(()=>!modal.busy&&modal.feedback?.textContent.includes(p.translator('pins.createFailed')),'Native template failure is explained');f.check(!app.vault.getFileByPath(missing.path),'Missing template created an empty substitute');modal.close();results.push({case:'missing template',explained:true,emptyFallback:false});
  f.check(await app.vault.adapter.exists(configPath)===hadConfig&&(hadConfig?await app.vault.adapter.read(configPath):null)===configBefore,'Core Daily Notes configuration bytes changed');
  return{results};
 }finally{await f.cleanup();}
}

/** Inspect real shared forms in native themes/windows, preserving every draft and host preference.
 * Template choices are real owned paths with an injected availability capability for layout only;
 * this lane never claims an Excalidraw creation/integration test. */
async function forms(app,c){
 const f=c.fixture(app,c),results=[],dialogs=[];
 try{
  await f.initialize();const p=f.p,t=p.translator,seed=await f.note('Form origin','Form source\n'),template=await f.note('Drawing template','Layout-only template choice\n');
  const leaf=await f.canvas(seed,'k-plex-react-view',c.importWindow);await f.ready();
  const drawing=p.drawingTemplateOptions,available=p.isExcalidrawAvailable;p.drawingTemplateOptions=()=>({files:[template],selected:template.path,root:f.folder});p.isExcalidrawAvailable=()=>true;
  f.restores.push(()=>{p.drawingTemplateOptions=drawing;p.isExcalidrawAvailable=available});
  /** Native dimensions and computed styles establish geometry; screenshots establish the visual review. */
  const audit=async(modal,label)=>{
   const doc=modal.contentEl.ownerDocument,native=f.owner(doc),bounds=native.getBounds(),minimum=native.getMinimumSize(),maximized=native.isMaximized(),themes=['theme-light','theme-dark'],original=themes.map(theme=>doc.body.classList.contains(theme));
   try{if(maximized)native.unmaximize();native.setMinimumSize(200,200);for(const [theme,width]of [['theme-light',1160],['theme-dark',440]]){
    themes.forEach(value=>doc.body.classList.toggle(value,value===theme));native.setContentSize(width,900);await f.focus(doc);await f.wait(220);
    const content=modal.contentEl,rect=content.getBoundingClientRect();f.check(content.scrollWidth<=content.clientWidth+2,label+' horizontal overflow');
    for(const row of content.querySelectorAll('.setting-item:not(.kplex-form-actions):not(.kplex-modal-action-row)')){
     if(!row.getBoundingClientRect().height)continue;const style=doc.defaultView.getComputedStyle(row);
     f.check(parseFloat(style.paddingTop)===0&&parseFloat(style.paddingBottom)===0&&parseFloat(style.borderTopWidth)===0,label+' native row spacing bypassed shared form '+JSON.stringify({classes:row.className,paddingTop:style.paddingTop,paddingBottom:style.paddingBottom,border:style.borderTopWidth}));
    }
    const longFields=[];
    for(const row of content.querySelectorAll('.kplex-form-field')){
     const input=row.querySelector('input[type=text],textarea');if(!input||!input.getBoundingClientRect().height)continue;
     // Native dropdown padding reserves its caret around the editable input. The shared Template
     // chrome is the full-width control; its inner text area must remain visible and contained.
     const chrome=input.closest('.kplex-template-picker.kplex-native-combobox'),owner=chrome&&row.contains(chrome)?chrome:input;
     const field=owner.getBoundingClientRect(),inner=input.getBoundingClientRect(),rowRect=row.getBoundingClientRect(),name=row.querySelector('.setting-item-info,label').getBoundingClientRect();
     f.check(field.width>=rowRect.width*.9&&field.top>=name.bottom-1,label+' long field not full width/below label '+JSON.stringify({owner:owner.className,field:field.toJSON(),inner:inner.toJSON(),row:rowRect.toJSON(),name:name.toJSON()}));
     if(chrome)f.check(inner.width>0&&inner.height>0&&inner.left>=field.left-1&&inner.right<=field.right+1&&inner.top>=field.top-1&&inner.bottom<=field.bottom+1,label+' Template text input not visible/contained by native chrome '+JSON.stringify({chrome:field.toJSON(),inner:inner.toJSON()}));
     longFields.push({owner:chrome?'template-native-combobox':'input',field:field.toJSON(),inner:inner.toJSON(),row:rowRect.toJSON(),label:name.toJSON(),fullWidth:true,labelAbove:true});
    }
    const options=[...content.querySelectorAll('.kplex-form-option select')].filter(input=>input.getBoundingClientRect().height);
    const optionStyles=options.map(input=>{const style=doc.defaultView.getComputedStyle(input);return {font:style.fontFamily,size:style.fontSize,height:input.getBoundingClientRect().height,left:input.getBoundingClientRect().left,width:input.getBoundingClientRect().width}});
    if(options.length>1)f.check(optionStyles.every(style=>JSON.stringify(style)===JSON.stringify(optionStyles[0])),label+' option rows differ '+JSON.stringify(optionStyles));
    const templateChrome=[...content.querySelectorAll('.kplex-drawing-template > .kplex-template-picker.kplex-native-combobox')].filter(control=>control.getBoundingClientRect().height);
    for(const chrome of templateChrome){const input=chrome.querySelector('input'),caption=chrome.parentElement.querySelector('label');f.check(chrome.classList.contains('dropdown')&&chrome.querySelectorAll('input').length===1&&input?.getAttribute('role')==='combobox'&&input.getAttribute('aria-autocomplete')==='list'&&input.getAttribute('aria-labelledby')===caption?.id&&caption?.htmlFor===input.id,label+' actual Template combobox chrome/shape/label ownership');}
    const controls=[...options,...templateChrome],controlStyles=controls.map(control=>{const style=doc.defaultView.getComputedStyle(control),r=control.getBoundingClientRect();return{kind:control.matches('select')?'finite-select':'template-native-combobox',font:style.fontFamily,size:style.fontSize,height:r.height,left:r.left,right:r.right,width:r.width,bottom:r.bottom}});
    if(controls.length>1)f.check(controlStyles.every(style=>style.font===controlStyles[0].font&&style.size===controlStyles[0].size&&Math.abs(style.height-controlStyles[0].height)<1),label+' finite option and Template native chrome typography/height differ '+JSON.stringify(controlStyles));
    const actions=[...content.querySelectorAll('.kplex-form-actions')].filter(row=>row.getBoundingClientRect().height);
    for(const action of actions){const top=action.getBoundingClientRect().top;
     for(const button of action.querySelectorAll('button')){const glyph=button.querySelector('svg'),r=button.getBoundingClientRect();f.check(button.getAttribute('aria-label')&&!button.hasAttribute('title')&&glyph&&glyph.getBoundingClientRect().width>=14&&r.top>=top+10,label+' footer glyph/tooltip/divider');}
     for(const control of controls)f.check(control.getBoundingClientRect().bottom<top,label+' native dropdown/Template chrome intersects footer divider');
    }
    const actualWidth=doc.defaultView.innerWidth,background=doc.defaultView.getComputedStyle(modal.modalEl).backgroundColor;
    f.check(Math.abs(actualWidth-width)<5,'Native viewport resize did not apply '+JSON.stringify({actualWidth,width}));
    results.push({dialog:label,theme,width,actualWidth,background,bodyClasses:doc.body.className,contentWidth:rect.width,optionStyles,controlStyles,longFields,fullWidthFields:true,footerClear:true,window:c.importWindow});
    await c.nativeScreenshot(c,native,'form-'+label.toLowerCase().replaceAll(' ','-')+'-'+theme+'-'+width+'-'+c.importWindow);
    if(c.visualPhase==='forms'||c.visualPhase==='form:'+label){c.progress={phase:'Visual review',until:Date.now()+15000,dialog:label,theme,width,window:c.importWindow};await f.wait(15000)}
   }}finally{themes.forEach((theme,i)=>doc.body.classList.toggle(theme,original[i]));native.setMinimumSize(...minimum);native.setBounds(bounds);if(maximized)native.maximize()}
  };
  p.settings.folderCreationTab='note';p.openCreateInFolderModal(p.index.get('folder:'+f.folder),leaf);let modal=[...p.actionDialogs.keys()].find(item=>item.allowSubfolders);dialogs.push(modal);await f.until(()=>modal?.contentEl.querySelectorAll('.kplex-form-option select').length===1&&modal.contentEl.querySelectorAll('.kplex-template-picker input[role=combobox]').length===1,'Native searchable template and completion choices');await audit(modal,'Create note');
  await f.click(modal.contentEl.querySelector('[role=tab][id$="tab-folder"]'));await f.until(()=>!modal.tabPanels.folder.hidden,'Native subfolder panel');await audit(modal,'Create subfolder');modal.close();
  modal=p.openRelationModal({mode:'create',origin:p.index.get(seed.path),semanticRole:'child',hostLeaf:leaf,invocation:{continuation:'return'}});dialogs.push(modal);await f.until(()=>modal.contentEl.querySelectorAll('.kplex-form-option select').length===1&&modal.contentEl.querySelectorAll('.kplex-template-picker input[role=combobox]').length===1,'Native searchable relationship template choices');await audit(modal,'Add relationship');
  const edit=modal.contentEl.querySelector('.kplex-edit-selected-ontology');await f.click(edit);const ontology=modal.ontologyEditor.dialog;dialogs.push(ontology);await audit(ontology,'Ontology description');ontology.close();modal.close();
  app.setting.open();app.setting.openTabById('k-plex');app.setting.openPagePath('k-plex',[t('settings.ui.plex.behavior')]);
  await f.until(()=>app.setting.getCurrentPageEl()?.querySelector('textarea'),'Native excluded paths settings');
  await f.until(()=>{const input=app.setting.getCurrentPageEl()?.querySelector('textarea'),row=input?.closest('.setting-item');return row&&row.ownerDocument.fonts.status==='loaded'&&row.ownerDocument.defaultView.getComputedStyle(row).flexDirection==='column'},'Shared native Settings field styles');
  const page=app.setting.getCurrentPageEl(),textarea=page.querySelector('textarea'),row=textarea.closest('.setting-item');
  await f.focus(page.ownerDocument);textarea.scrollIntoView({block:'center',behavior:'instant'});await f.wait(200);
  const r=textarea.getBoundingClientRect(),name=row.querySelector('.setting-item-info').getBoundingClientRect();
  f.check(row.classList.contains('kplex-form-field')&&r.width>=row.getBoundingClientRect().width*.9&&r.top>=name.bottom-1,'Native declarative textarea layout '+JSON.stringify({field:r.toJSON(),row:row.getBoundingClientRect().toJSON(),name:name.toJSON(),classes:row.className}));results.push({dialog:'Settings excluded paths',fullWidth:true,labelAbove:true});
  if(c.visualPhase==='forms'){c.progress={phase:'Visual review',until:Date.now()+15000,dialog:'Settings excluded paths'};await f.wait(15000)}
  return{results,templateChoices:'Injected availability with real owned file paths; no Excalidraw creation'};
 }finally{for(const dialog of dialogs.reverse())dialog?.close();await f.cleanup();}
}

/** Isolate the template's active-editor command from explicit-file Sidecar switching.
 * Templater parsing is not simulated: this runs its already-rendered callback against
 * actual metadata events, native Markdown/Excalidraw views and the installed command. */
async function dailyAutomation(app,c){
 const f=c.fixture(app,c),samples=[];let handler;
 try{
  await f.initialize();const p=f.p,ex=app.plugins.plugins['obsidian-excalidraw-plugin'];
  f.check(ex?.getBlankDrawing&&ex.ea?.toggleViewMode,'Installed Excalidraw blank/template view capability');
  const seed=await f.note('Daily automation origin','Owned origin\n'),leaf=await f.canvas(seed);
  const file=await f.note('Daily automation target',await ex.getBlankDrawing());await f.ready();
  await f.until(()=>ex.isExcalidrawFile(file),'Native Excalidraw metadata');
  await p.openSidecar(leaf,p.index.get(file.path));const sidecar=p.sidecarLeaves.get(leaf);f.check(sidecar,'Owned daily Sidecar');
  /** Normalize only the owned file's representation; no shared plugin preference is changed. */
  const markdown=async()=>{if(sidecar.view.getViewType()==='excalidraw')await ex.ea.toggleViewMode(sidecar.view);await f.until(()=>sidecar.view.file===file&&sidecar.view.getViewType()==='markdown','Owned Markdown Sidecar');};
  const trigger=async(targeted)=>{
   let fired=false,finished=false,error;const sample={targeted};
   handler=changed=>{if(changed.path!==file.path)return;app.metadataCache.off('changed',handler);handler=null;
    fired=true;sample.activeType=app.workspace.activeLeaf?.view.getViewType();sample.activeFile=app.workspace.getActiveFile()===file;
    if(targeted)ex.ea.toggleViewMode(sidecar.view).then(()=>{finished=true},failure=>{error=failure;finished=true});
    else{sample.accepted=app.commands.executeCommandById('obsidian-excalidraw-plugin:toggle-excalidraw-view');finished=true;}
   };
   app.metadataCache.on('changed',handler);await app.vault.modify(file,(await app.vault.read(file))+'\n');
   await f.until(()=>fired&&finished,'Actual metadata automation callback');if(error)throw error;return sample;
  };
  await markdown();app.workspace.setActiveLeaf(leaf,{focus:true});
  const inactive=await trigger(false);await f.wait(250);f.check(sidecar.view.getViewType()==='markdown','Inactive command unexpectedly switched the exact target');samples.push({...inactive,case:'template command while canvas active',targetSwitched:false});
  p.focusAssociatedEditor(leaf);const active=await trigger(false);await f.until(()=>sidecar.view.getViewType()==='excalidraw','Active-editor command positive control');samples.push({...active,case:'same callback with Sidecar active',targetSwitched:true});
  await markdown();app.workspace.setActiveLeaf(leaf,{focus:true});const targeted=await trigger(true);await f.until(()=>sidecar.view.getViewType()==='excalidraw','Explicit-view automation while canvas active');samples.push({...targeted,case:'explicit target view while canvas active',targetSwitched:true});
  /** Execute the proposed block with only its Templater hook delivery supplied by the fixture. */
  const runProposal=()=>{let ready;const tp={file:{path:()=>file.path},hooks:{on_all_templates_executed:callback=>{ready=callback}}};
   new Function('tp','app','ExcalidrawAutomate',c.dailySwitchScript)(tp,app,ex.ea);f.check(ready,'Proposal did not register the template-complete hook');const cleanup=ready();if(typeof cleanup==='function')f.restores.push(cleanup);};
  await markdown();app.workspace.setActiveLeaf(leaf,{focus:true});runProposal();await f.until(()=>sidecar.view.getViewType()==='excalidraw','Proposal switches inactive existing Sidecar');samples.push({case:'proposal with inactive existing editor',targetSwitched:true});
  await markdown();app.workspace.setActiveLeaf(leaf,{focus:true});await p.closeSidecar(leaf);runProposal();await f.wait(50);
  f.check(!app.workspace.getLeavesOfType('markdown').some(item=>item.view.file===file),'Proposal opened an unrequested editor');
  const future=p.ensureSidecarLeaf(leaf),modes=ex.excalidrawFileModes,key=future.id||file.path,hadMode=Object.hasOwn(modes,key),oldMode=modes[key];
  modes[key]='markdown';f.restores.push(()=>{if(hadMode)modes[key]=oldMode;else delete modes[key]});
  await p.openSidecar(leaf,p.index.get(file.path));await f.until(()=>p.sidecarLeaves.get(leaf)?.view.file===file&&p.sidecarLeaves.get(leaf)?.view.getViewType()==='excalidraw','Proposal waits for subsequent Sidecar opening');samples.push({case:'proposal before editor opens',initialNativeMode:'markdown',noUnrequestedLeaf:true,targetSwitched:true});
  return{samples,templaterInstalled:Boolean(app.plugins.plugins['templater-obsidian']),scope:'Exact rendered metadata callback only; no full Templater/DNP template processing claim'};
 }finally{if(handler)app.metadataCache.off('changed',handler);await f.cleanup();}
}

/** Run real Templater folder/regex/core-Daily processing, including a suspended YAML command.
 * The exact installed companion binary is staged by the disposable-vault caller, never mocked. */
async function templateLifecycle(app,c){
 const f=c.fixture(app,c),samples=[];let releaseTemplate;
 try{
  await f.initialize();const p=f.p,tpl=app.plugins.plugins['templater-obsidian'];f.check(tpl?.templater?.constructor?.on_file_creation,'Staged real Templater');
  const local=app.loadLocalStorage('templater-local-settings'),settings=structuredClone(tpl.settings),original=tpl.templater.constructor.on_file_creation;
  app.saveLocalStorage('templater-local-settings',{...local,trigger_on_file_creation:false});
  f.restores.push(()=>{tpl.settings=settings;app.saveLocalStorage('templater-local-settings',local)});
  const seed=await f.note('Template origin','---\nChildren: ["[[Preserved.md]]"]\n---\nOrigin body\n'),leaf=await f.canvas(seed);await f.ready();
  const fullBuilds=p.index.getSemanticPreparationDiagnostics().fullBuilds;
  f.check(typeof fullBuilds==='number','Native full-build counter is available');
  const folder=await app.vault.createFolder(f.folder+'/Created');f.restores.push(async()=>{if(app.vault.getFolderByPath(folder.path)===folder)await app.vault.delete(folder,true)});
  const key='__kplex278TemplateBarrier';f.check(!(key in app.workspace),'Template barrier already owned');
  f.restores.push(()=>{releaseTemplate?.();delete app.workspace[key]});
  const templateProperty=p.inverseOntologyField(p.defaultOntologyField('child'),'child');
  const templateText='---\nsentinel: <%* await app.workspace.'+key+'.promise; tR += "rendered"; %>\nPreserved: template-value\n'+JSON.stringify(templateProperty)+': ['+JSON.stringify('[['+f.folder+'/Keep existing]]')+']\n---\n# <% tp.file.title %>\nEvaluated template body\n';
  const template=await f.note('Folder template',templateText);await f.ready();
  tpl.settings={...settings,templates_folder:f.folder+'/Templates',ignore_folders_on_creation:[],trigger_on_file_creation_mode:'folder',folder_templates:[{folder:folder.path,template:template.path}],file_templates:[]};
  app.saveLocalStorage('templater-local-settings',{...local,trigger_on_file_creation:true});
  const createdRef=app.vault.on('create',file=>{if(file.extension&&file.path.startsWith(folder.path+'/')&&!f.files.includes(file))f.files.push(file)});f.restores.push(()=>app.vault.offref(createdRef));
  const process=app.fileManager.processFrontMatter;let metadataWrites=0;
  app.fileManager.processFrontMatter=function(file,...args){if(file.path.startsWith(folder.path+'/'))metadataWrites++;return process.call(this,file,...args)};
  f.restores.push(()=>app.fileManager.processFrontMatter=process);
  const arm=()=>{const barrier={};barrier.promise=new Promise(resolve=>releaseTemplate=resolve);app.workspace[key]=barrier};
  for(const mode of ['folder','regex']){
   tpl.settings.trigger_on_file_creation_mode=mode;tpl.settings.file_templates=[{regex:'^'+folder.path.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'/',template:template.path}];
   arm();metadataWrites=0;let finished=false;
   const work=p.createNewRelatedFileForOrigin(p.index.get(seed.path),'Native '+mode,'markdown','Added alias',folder.path).then(file=>{finished=true;return file});
   await f.until(()=>tpl.templater.files_with_pending_templates.size>0,'Real '+mode+' template suspended in YAML');
   f.check(!finished&&metadataWrites===0,'K-Plex wrote properties before template completion');
   let advanced=false;const checkpoint=p.index.workScheduler.checkpoint(1).then(()=>{advanced=true});
   await f.until(()=>advanced,'Template wait must not block the actual navigation-priority checkpoint',2000);await checkpoint;
   let backgroundAdvanced=false;const background=p.index.workScheduler.checkpoint(4).then(()=>{backgroundAdvanced=true});
   await f.until(()=>backgroundAdvanced,'Template wait must not block the actual background checkpoint',2000);await background;
   releaseTemplate();const file=await work;f.check(file,'Created templated note');
   const before=await app.vault.read(file);f.check(before.includes('sentinel: rendered')&&before.includes('Evaluated template body')&&!before.includes('<%'),'YAML/body template was not fully evaluated');
   const field=p.defaultOntologyField('child'),inverse=p.inverseOntologyField(field,'child');
   await p.linkNewRelatedFile(p.index.get(seed.path),'child',file,field,'','',false,true);
   const cache=app.metadataCache,expectedReference=p.referenceForPage(p.index.get(seed.path),file);
   await f.until(()=>{const value=cache.getFileCache(file)?.frontmatter?.[inverse];return Array.isArray(value)?value.includes(expectedReference):value===expectedReference},'Reversed property appended on templated note');
   const references=JSON.stringify(cache.getFileCache(file).frontmatter[inverse]);f.check(references.includes('Keep existing'),'Reversed relation did not preserve the template property');
   const after=await app.vault.read(file);f.check(after.includes('Preserved: template-value')&&after.includes('Evaluated template body'),'Relationship overwrote template data');
   f.check(tpl.templater.constructor.on_file_creation===original,'Templater handler not restored');
   samples.push({case:mode+' template with reversed owner',yamlEvaluated:true,bodyEvaluated:true,propertiesWrittenAfterTemplate:true,templatePreserved:true,navigationPriorityAdvancedWhileTemplatePending:true,backgroundPriorityAdvancedWhileTemplatePending:true});
  }
  arm();const record=app.internalPlugins.getPluginById('daily-notes'),core=record?.instance;f.check(typeof core?.getDailyNote==='function','Core Daily Notes');
  const options=core.options;f.restores.push(()=>core.options=options);core.options={...options,folder:folder.path,format:'[Native daily ]YYYY-MM-DD',template:template.path};
  p.settings.pinnedNodes=[];await p.updatePeriodicPin('day',{useDailyNotes:true},true);const row=p.readSavedPins().find(item=>item.period==='day');f.check(row?.state==='missing','Owned daily destination');
  let done=false;const work=p.createPeriodicPinNote(row.id,row.path,()=>true).then(page=>{done=true;return page});
  await f.until(()=>tpl.templater.files_with_pending_templates.size>0,'Real Daily Notes template suspended');f.check(!done,'Daily creation returned during template evaluation');releaseTemplate();
  const page=await work;f.check(page?.file,'Created daily file');const body=await app.vault.read(page.file);f.check(body.includes('sentinel: rendered')&&!body.includes('<%'),'Daily YAML/body commands not rendered');
  samples.push({case:'core Daily Notes template',yamlEvaluated:true,bodyEvaluated:true});
  f.check(await app.vault.read(template)===templateText,'Template source modified');
  await f.ready();f.check(p.index.getSemanticPreparationDiagnostics().fullBuilds===fullBuilds,'Templated creation restarted full semantic indexing');
  return{samples,templater:tpl.manifest.version,handlerRestored:tpl.templater.constructor.on_file_creation===original,additionalFullBuilds:0,scope:'Real Templater execution in owned folder/regex/Daily files; no production template execution'};
 }finally{releaseTemplate?.();await f.cleanup();}
}

/** Native UI acceptance for the retained connection shell and captured Markdown exporter. */
async function ontologyExport(app,c){
 const f=c.fixture(app,c),samples=[];let modal;
 try{
  await f.initialize();const p=f.p,a=await f.note('Connection source','Source\n'),b=await f.note('Connection target','Target\n'),leaf=await f.canvas(a);await f.ready();
  const field=p.defaultOntologyField('child'),description='A relationship description displayed below its name, with enough detail to wrap on a narrow screen.';
  p.settings.ontologyDescriptions[field]=description;p.index.notifyPresentation();
  const doc=leaf.view.contentEl.ownerDocument,themes=['theme-light','theme-dark'],original=themes.map(value=>doc.body.classList.contains(value)),native=f.owner(doc),bounds=native.getBounds(),minimum=native.getMinimumSize(),maximized=native.isMaximized();
  f.restores.push(()=>{for(const [i,value]of themes.entries())doc.body.classList.toggle(value,original[i]);native.setMinimumSize(...minimum);native.setBounds(bounds);if(maximized)native.maximize()});
  if(maximized)native.unmaximize();native.setMinimumSize(200,200);
  const button=(element,key)=>[...element.querySelectorAll('button')].find(value=>value.textContent===p.translator(key));
  const hold=async(kind,theme,width)=>{
   await f.focus(doc);native.webContents.sendInputEvent({type:'mouseMove',x:2,y:2});await f.wait(100);
   await c.nativeScreenshot(c,native,'ontology-export-'+kind.replace(/\W/g,'-')+'-'+theme+'-'+width);
   if(c.visualPhase==='ontology-export'||c.visualPhase==='ontology-export-dark'&&theme==='theme-dark'){c.progress={phase:'Visual '+kind,theme,width,until:Date.now()+20000};await f.wait(20000)}
  };
  for(const [theme,width]of [['theme-light',1000],['theme-dark',420]]){
   for(const value of themes)doc.body.classList.toggle(value,value===theme);native.setContentSize(width,1000);await f.wait(100);
   modal=p.openRelationModal({mode:'relink',purpose:'ontology-add',origin:p.index.get(a.path),fixedTarget:p.index.get(b.path),semanticRole:'child',initialField:field,hostLeaf:leaf});
   await f.until(()=>modal.contentEl.querySelector('.kplex-relationship-selection-detail'),'Native shared description');
   const input=modal.contentEl.querySelector('.kplex-add-related-ontology-search input'),detail=modal.contentEl.querySelector('.kplex-relationship-selection-detail'),create=button(modal.contentEl,'ontology.createField'),edit=modal.contentEl.querySelector('.kplex-edit-selected-ontology');
   const storage=modal.contentEl.querySelector('#kplex-relation-modal-storage');f.check(!storage||storage.getBoundingClientRect().width>=modal.contentEl.getBoundingClientRect().width*.95,'Stacked note-owner dropdown must use the full field width');
   f.check(input.value===field&&detail.textContent===description&&detail.getBoundingClientRect().top>=input.getBoundingClientRect().bottom,'Native description/name layout');
   f.check(parseFloat(doc.defaultView.getComputedStyle(detail).fontSize)<parseFloat(doc.defaultView.getComputedStyle(input).fontSize),'Native description typography');
   for(const control of [create,edit])f.check(control?.querySelector('svg')&&!control.hasAttribute('title')&&!control.hasAttribute('aria-label')&&control.hasAttribute('aria-labelledby'),'Native ontology glyph/tooltip ownership');
   await f.click(create);f.check(modal.ontologyDialog,'Native Create definition action');modal.ontologyDialog.close();await f.until(()=>!input.disabled,'Vocabulary cancellation restores parent');
   await hold('connection property',theme,width);samples.push({case:'connection property',theme,width,sharedPicker:true,descriptionBelow:true,createGlyph:true});modal.close();modal=null;
   const session=leaf.view.documentSession.plexView;session.select('mindmap');session.setRoot(a.path);await f.until(()=>leaf.view.contentEl.querySelector('[data-kplex-keyboard-id="root"]')&&session.definition.id==='mindmap','Native Mind Map');
   const outcome=await p.actionManager.dispatch({id:'view.export.markdown',source:'internal',surfaceId:f.surface(leaf)});f.check(outcome.status==='opened','Native Markdown export action');
   await f.until(()=>doc.querySelector('.kplex-mindmap-markdown-export'),'Native export dialog');const element=doc.querySelector('.kplex-mindmap-markdown-export'),row=element.querySelector('.kplex-form-select-row'),select=row.querySelector('select'),help=row.querySelector('.setting-item-description');
   const r=row.getBoundingClientRect(),s=select.getBoundingClientRect();f.check(Math.abs(r.right-s.right)<2&&s.width>r.width*.6&&help.getBoundingClientRect().top>=s.bottom,'Native export selector/help layout');
   const cancel=button(element,'common.cancel'),glyph=cancel.querySelector('svg').getBoundingClientRect(),rect=cancel.getBoundingClientRect();f.check(Math.abs(glyph.left+glyph.right-rect.left-rect.right)<1&&Math.abs(glyph.top+glyph.bottom-rect.top-rect.bottom)<1,'Native Cancel glyph centering');
   f.check([...element.querySelectorAll('.kplex-modal-action-row button')].every(button=>Math.abs(button.getBoundingClientRect().top-rect.top)<1),'Native export footer actions wrap');
   await hold('Markdown export',theme,width);samples.push({case:'Markdown export',theme,width,availableWidthUsed:true,cancelCentered:true});await f.click(cancel);
  }
  return{samples};
 }finally{modal?.close();for(const element of app.workspace.containerEl.ownerDocument.querySelectorAll('.kplex-mindmap-markdown-export'))[...element.querySelectorAll('button')].find(button=>button.getAttribute('aria-label')===f.p.translator('common.cancel'))?.click();await f.cleanup();}
}

/** Native preset review uses the real manager, color sampler and detached Cancel ownership. */
async function presetUi(app,c){
 const f=c.fixture(app,c),samples=[];let manager,editor;
 try{
  await f.initialize();const p=f.p,seed=await f.note('Preset UI origin','Owned preset review\n'),leaf=await f.canvas(seed);await f.ready();
  app.setting.open();app.setting.openTabById('k-plex');await f.until(()=>app.setting.getCurrentPageEl()?.isConnected,'Native Settings source for color sampler');
  const before=JSON.stringify(p.settings),source=p.index.getSourceAcquisitionCounters(),doc=app.setting.getCurrentPageEl().ownerDocument;
  const themes=['theme-light','theme-dark'],roots=[...new Set([app.workspace.containerEl.ownerDocument,doc])].flatMap(document=>[document.body,document.documentElement]),original=roots.map(root=>themes.map(value=>root.classList.contains(value))),native=f.owner(doc),bounds=native.getBounds(),minimum=native.getMinimumSize(),maximized=native.isMaximized();
  f.restores.push(()=>{for(const [i,root]of roots.entries())for(const [j,value]of themes.entries())root.classList.toggle(value,original[i][j]);native.setMinimumSize(...minimum);native.setBounds(bounds);if(maximized)native.maximize()});
  if(maximized)native.unmaximize();native.setMinimumSize(200,200);
  for(const [theme,width]of [['theme-light',1000],['theme-dark',420]]){
   for(const root of roots)for(const value of themes)root.classList.toggle(value,value===theme);native.setContentSize(width,1000);
   await f.focus(doc);
   f.check(p.settingsTab.openCanvasViewManager('wuxing','wuxing'),'Registered native Facets manager');manager=[...p.settingsTab.colorDialogs].at(-1);editor=[...manager.children].at(-1);f.check(editor?.modalEl.classList.contains('kplex-facet-preset-editor'),'Native preset editor');
   await f.until(()=>editor.contentEl.querySelector('.kplex-style-color-row .kplex-color-swatch'),'Native paired color preview');await f.wait(100);
   const byLabel=key=>[...editor.contentEl.querySelectorAll('.setting-item')].find(row=>row.querySelector('.setting-item-name')?.textContent===p.translator(key));
   const classification=byLabel('wuxing.source'),layout=byLabel('facets.layout'),help=editor.contentEl.querySelector('.kplex-facet-help-settings');
   f.check(classification.getBoundingClientRect().top-help.getBoundingClientRect().bottom>=8,'Native Classification source needs separation');
   const a=classification.querySelector('select').getBoundingClientRect(),b=layout.querySelector('select').getBoundingClientRect();f.check(Math.abs(a.left-b.left)<1&&Math.abs(a.right-b.right)<1,'Native preset dropdowns are not aligned');
   const actions=[...editor.contentEl.querySelectorAll('.kplex-modal-action-row button')];for(const button of actions){const rect=button.getBoundingClientRect(),glyph=button.querySelector('svg').getBoundingClientRect();f.check(Math.abs(rect.left+rect.right-glyph.left-glyph.right)<1&&Math.abs(rect.top+rect.bottom-glyph.top-glyph.bottom)<1,'Native preset footer glyph not centered');}
   const hold=async phase=>{
    await f.focus(doc);native.webContents.sendInputEvent({type:'mouseMove',x:2,y:2});await f.wait(100);
    await c.nativeScreenshot(c,native,'preset-'+theme+'-'+width+'-'+(phase.includes('color')?'color':'header'));
    if(c.visualPhase==='preset-ui-dark'&&theme==='theme-dark'){c.progress={phase,theme,width,until:Date.now()+20000};await f.wait(20000)}
   };
   editor.body.scrollTop=0;await hold('Preset native header');
   const color=editor.contentEl.querySelector('.kplex-style-color-row');color.scrollIntoView({block:'center',behavior:'instant'});await f.wait(80);
   const controls=color.querySelector(':scope > .setting-item-control'),button=controls.querySelector('button'),rect=button.getBoundingClientRect(),bounds=color.getBoundingClientRect();
   f.check(color.classList.contains('setting-item')&&controls.contains(color.querySelector('.kplex-color-strips')),'Native color controls bypass Setting column');
   f.check(rect.right<=bounds.right+1&&rect.left>=controls.getBoundingClientRect().left-1,'Native color source not inside right-side group');
   await hold('Preset native category color');samples.push({case:'native preset polish',theme,width,classificationSpacing:true,uniformDropdowns:true,centeredIcons:true,nativeColorRow:true});editor.close();editor=null;manager.close();manager=null;
  }
  f.check(JSON.stringify(p.settings)===before,'Preset review/cancel wrote settings');f.check(JSON.stringify(p.index.getSourceAcquisitionCounters())===JSON.stringify(source),'Preset review acquired source data');return{samples,settingsWrites:0,sourceReads:0};
 }finally{editor?.close();manager?.close();await f.cleanup();}
}

/** Read actual core Settings control skins without changing any core preference. */
async function controls(app,c){
 const f=c.fixture(app,c);let modal;
 try{
  await f.initialize();const samples=[];
  for(const [tab,selector]of [['editor','select.dropdown'],['daily-notes','input[type=text]']]){
   app.setting.open();app.setting.openTabById(tab);await f.until(()=>app.setting.getCurrentPageEl()?.querySelector(selector),'Core Settings control '+tab);
   const field=app.setting.getCurrentPageEl().querySelector(selector),doc=field.ownerDocument,referenceWindow=await f.focus(doc);field.scrollIntoView({block:'center'});referenceWindow.webContents.sendInputEvent({type:'mouseMove',x:2,y:2});await f.wait(200);
   field.blur();const style=doc.defaultView.getComputedStyle(field),properties=['height','fontFamily','fontSize','appearance','backgroundColor','backgroundImage','backgroundPosition','paddingLeft','paddingRight','borderColor','borderRadius','boxShadow'];
   const variables=[...style].filter(name=>name.startsWith('--dropdown')||name==='--input-height').map(name=>[name,style.getPropertyValue(name)]);
   const rules=[];for(const sheet of [...doc.styleSheets]){try{for(const rule of [...sheet.cssRules])if(rule.selectorText?.includes('.dropdown')&&rules.length<25)rules.push(rule.cssText)}catch{}}
   samples.push({tab,tag:field.tagName,classes:field.className,style:Object.fromEntries(properties.map(name=>[name,style[name]])),variables,rules});
   c.progress={phase:'Core control visual reference',tab,until:Date.now()+30000,sample:samples.at(-1)};if(c.visualPhase==='controls-reference')await f.wait(30000);
  }
  app.setting.close();const p=f.p,seed=await f.note('Native controls origin','Native control comparison\n'),template=await f.note('Native drawing template','Layout-only template\n');
  const leaf=await f.canvas(seed);await f.ready();const drawing=p.drawingTemplateOptions,available=p.isExcalidrawAvailable;
  p.drawingTemplateOptions=()=>({files:[template],selected:template.path,root:f.folder});p.isExcalidrawAvailable=()=>true;f.restores.push(()=>{p.drawingTemplateOptions=drawing;p.isExcalidrawAvailable=available});
  modal=p.openRelationModal({mode:'create',origin:p.index.get(seed.path),semanticRole:'child',hostLeaf:leaf,invocation:{continuation:'return'}});
  await f.until(()=>modal.contentEl.querySelectorAll('select').length===3,'Native-skin relationship controls');
  const compared=[],doc=modal.contentEl.ownerDocument,keys=['height','fontFamily','fontSize','appearance','backgroundColor','backgroundImage','backgroundPosition','paddingLeft','paddingRight','borderColor','borderRadius','boxShadow'];
  await f.until(()=>doc.fonts.status==='loaded','Control comparison fonts');
  modal.contentEl.tabIndex=-1;modal.contentEl.focus();const controlWindow=await f.focus(doc);controlWindow.webContents.sendInputEvent({type:'mouseMove',x:2,y:2});await f.wait(100);
  for(const field of [...modal.contentEl.querySelectorAll('select'),modal.contentEl.querySelector('.kplex-native-combobox')]){
   const style=doc.defaultView.getComputedStyle(field),actual=Object.fromEntries(keys.map(key=>[key,style[key]])),reference=samples[0].style;
   f.check(keys.every(key=>actual[key]===reference[key]),'Dropdown must retain the core Settings skin '+JSON.stringify({classes:field.className,actual,reference}));compared.push({classes:field.className,matchedCoreDropdown:true});
  }
  for(const field of modal.contentEl.querySelectorAll('.kplex-add-related-note-search input,.kplex-create-alias-input,.kplex-folder-path-input input')){
   const style=doc.defaultView.getComputedStyle(field),actual=Object.fromEntries(keys.map(key=>[key,style[key]])),reference=samples[1].style;
   f.check(keys.every(key=>actual[key]===reference[key]),'Authored input must retain the core Settings skin '+JSON.stringify({classes:field.className,actual,reference}));compared.push({classes:field.className,matchedCoreInput:true});
  }
  const disclosure=modal.contentEl.querySelector('.kplex-fuzzy-disclosure'),skin=doc.defaultView.getComputedStyle(disclosure);f.check(skin.backgroundColor==='rgba(0, 0, 0, 0)'&&skin.boxShadow==='none'&&parseFloat(skin.borderWidth)===0&&!disclosure.querySelector('svg'),'Ontology disclosure draws an extra boxed caret');
  const footerButtons=[...modal.contentEl.querySelectorAll('.kplex-form-actions button')].map(button=>button.getBoundingClientRect());f.check(footerButtons.length===4&&footerButtons.every(rect=>Math.abs(rect.top-footerButtons[0].top)<.5&&Math.abs(rect.height-footerButtons[0].height)<.5),'Cancel and creation buttons must align in the shared footer '+JSON.stringify(footerButtons.map(rect=>rect.toJSON())));
  await f.click(disclosure);await f.until(()=>modal.contentEl.ownerDocument.querySelector('.kplex-ontology-results'),'Native-skinned disclosure opens ontology choices');await f.key(doc,'Escape',[],modal.contentEl.querySelector('.kplex-native-combobox input'));f.check(modal.modalEl.isConnected,'Closing ontology choices dismissed the form');
  const originalDefault=p.settings.newNodeDefaultType,primaryActions=[];f.restores.push(()=>{p.settings.newNodeDefaultType=originalDefault});
  for(const kind of ['markdown','excalidraw']){
   modal.close();p.settings.newNodeDefaultType=kind;
   modal=p.openRelationModal({mode:'create',origin:p.index.get(seed.path),semanticRole:'child',hostLeaf:leaf,invocation:{continuation:'return'}});
   await f.until(()=>modal.contentEl.querySelectorAll('.kplex-add-related-type-button').length===3,'Three native create actions');
   const buttons=[...modal.contentEl.querySelectorAll('.kplex-add-related-type-button')],primary=buttons[kind==='markdown'?0:1],other=buttons[kind==='markdown'?1:0];
   f.check(primary.disabled&&primary.classList.contains('mod-cta')&&primary.dataset.kplexPrimaryAction==='true'&&!other.classList.contains('mod-cta')&&!buttons[2].classList.contains('mod-cta'),'Remembered native CTA does not match shortcut default');
   const appearance=doc.defaultView.getComputedStyle(primary),secondary=doc.defaultView.getComputedStyle(other);f.check(appearance.backgroundColor!==secondary.backgroundColor,'Disabled CTA has no visible accent');
   await c.type(f,modal.contentEl.querySelector('.kplex-add-related-note-search input'),'Native CTA '+kind);
   await f.until(()=>!primary.disabled,'Valid name enables remembered CTA');f.check(primary.classList.contains('mod-cta')&&primary.dataset.kplexPrimaryAction==='true','Enabled CTA lost primary ownership');
   primaryActions.push({kind,disabledAccent:true,enabledAccent:true,keyboardDefault:true});
  }
  const linking=[];
  for(const installed of [false,true]){
   modal.close();p.isExcalidrawAvailable=()=>installed;
   modal=p.openRelationModal({mode:'create',origin:p.index.get(seed.path),fixedTarget:p.index.get(template.path),semanticRole:'left',hostLeaf:leaf});
   await f.until(()=>modal.contentEl.querySelector('.kplex-add-related-link-button'),'Native existing-note Link footer');
   const buttons=[...modal.contentEl.querySelectorAll('.kplex-form-actions button')],rects=buttons.map(button=>button.getBoundingClientRect()),area=modal.contentEl.querySelector('.kplex-add-related-action-area').getBoundingClientRect(),icon=buttons[1].querySelector('.kplex-icon').getBoundingClientRect();
   f.check(buttons.length===2&&!modal.contentEl.querySelector('.kplex-add-related-type-button'),'Linking leaves creation-button placeholders');
   f.check(Math.abs(rects[0].top-rects[1].top)<.5&&Math.abs(rects[0].height-rects[1].height)<.5&&Math.abs(rects[0].width-rects[1].width)<.5,'Native Cancel/Link sizes differ');
   f.check(rects[1].left-rects[0].right<=9&&Math.abs(area.width-rects[1].width)<.5,'Native linking footer reserves absent creation buttons');
   f.check(Math.abs(icon.left+icon.right-rects[1].left-rects[1].right)<1&&Math.abs(icon.top+icon.bottom-rects[1].top-rects[1].bottom)<1,'Native Link glyph is off-center');
   linking.push({excalidrawInstalled:installed,buttons:2,aligned:true,compact:true,iconCentered:true});
  }
  c.progress={phase:'Native-skin relationship visual review',until:Date.now()+45000,compared};if(c.visualPhase==='controls')await f.wait(45000);
  const beforeCapture=JSON.stringify(p.index.getSourceAcquisitionCounters()),priorityBefore=JSON.stringify(p.index.getWorkPriorityDiagnostics().active);
  const recovery=p.index.getIndexRecoveryDiagnostics();
  f.check(recovery.source&&recovery.snapshot&&typeof recovery.waitingForSources==='boolean','Native recovery facts unavailable');
  f.check(JSON.stringify(p.index.getSourceAcquisitionCounters())===beforeCapture&&JSON.stringify(p.index.getWorkPriorityDiagnostics().active)===priorityBefore,'Diagnostic capture admitted source/priority work');
  return{samples,compared,disclosureUnboxed:true,primaryActions,linking,recoveryDiagnostics:{available:true,sourceReads:0,newLeases:0}};
 }finally{modal?.close();await f.cleanup();}
}

/** Trusted gate-to-gate and empty-canvas drops retain source intent in both orientations. */
async function gateDefaults(app,c){
 const f=c.fixture(app,c),samples=[];let modal;
 try{
  await f.initialize();const p=f.p,target=await f.note('Gate destination','Existing target\n');
  const child=p.defaultOntologyField('child'),origin=await f.note('Gate source','---\n'+JSON.stringify(child)+': '+JSON.stringify(['[['+target.path.replace(/\.md$/,'')+']]'])+'\n---\n');
  const leaf=await f.canvas(origin);await f.ready();const root=leaf.view.contentEl,doc=root.ownerDocument;
  const open=p.openRelationModal;let chosen;
  p.openRelationModal=function(options){chosen=options;return modal=open.call(this,options)};f.restores.push(()=>{p.openRelationModal=open});
  for(const flipped of [false,true]){
   await p.updateCanvasViewConfiguration('classic',{field:'flipEastWest'},{kind:'set',value:flipped});await f.wait(250);
   for(const role of ['left','right','parent','child'])for(const modified of role==='left'||role==='right'?[false,true]:[false])for(const targetSide of role==='left'||role==='right'?['left','right']:[null]){
    const side=role==='parent'?'top':role==='child'?'bottom':(role==='left')!==flipped?'left':'right';
    const sourceNode=root.querySelector('[data-kplex-path="'+origin.path+'"]'),gate=sourceNode?.querySelector('[data-kplex-gate="'+side+'"]');f.check(gate,'Rendered source gate');
    const lateral=role==='left'||role==='right';
    const destination=lateral?root.querySelector('[data-kplex-path="'+target.path+'"] [data-kplex-gate="'+targetSide+'"]'):null;
    const viewport=root.querySelector('.kplex-plex'),bounds=viewport.getBoundingClientRect();
    const start=f.point(gate),end=destination?f.point(destination):{x:Math.round(bounds.right-35),y:Math.round(bounds.bottom-70)},native=await f.focus(doc),mods=modified?['control']:[];
    chosen=null;modal=null;
    try{
     native.webContents.sendInputEvent({type:'mouseMove',...start,modifiers:mods});native.webContents.sendInputEvent({type:'mouseDown',...start,button:'left',clickCount:1,modifiers:mods});
     for(let n=1;n<=8;n++){native.webContents.sendInputEvent({type:'mouseMove',x:Math.round(start.x+(end.x-start.x)*n/8),y:Math.round(start.y+(end.y-start.y)*n/8),modifiers:[...mods,'leftbuttondown']});await f.wait(25)}
     native.webContents.sendInputEvent({type:'mouseUp',...end,button:'left',clickCount:1,modifiers:mods});await f.until(()=>modal?.contentEl.querySelector('.kplex-add-related-role-select'),'Source-owned native gate composer');
     const expected=modified?(role==='left'?'previous':'next'):role;
     f.check(chosen.semanticRole===expected,'Destination gate overrode source role '+JSON.stringify({flipped,role,modified,actual:chosen.semanticRole}));
     if(lateral)f.check(chosen.fixedTarget?.path===target.path,'Gate destination did not select target');
     f.check(modal.contentEl.querySelector('.kplex-add-related-role-select').value===expected&&modal.contentEl.querySelector('.kplex-add-related-ontology-search input').value===p.defaultOntologyField(expected),'Composer did not use per-category remembered default');
     samples.push({flipped,role,modified,targetSide,expected,fixedTarget:lateral,defaultMatches:true});
    }finally{native.webContents.sendInputEvent({type:'mouseUp',...end,button:'left',clickCount:1});modal?.close();await f.wait(50)}
   }
  }
  return{samples};
 }finally{modal?.close();await f.cleanup();}
}

async function inventory(app,c){
 const f=c.fixture(app,c);
 try{
  await f.initialize();const explorer=app.workspace.getLeavesOfType('file-explorer')[0]?.view;
  const methods=[];for(let proto=explorer;proto&&proto!==Object.prototype;proto=Object.getPrototypeOf(proto))for(const key of Object.getOwnPropertyNames(proto))if(typeof Object.getOwnPropertyDescriptor(proto,key)?.value==='function'&&/folder|create|reveal/i.test(key))methods.push(key);
  return{commands:Object.keys(app.commands.commands).filter(id=>/folder|file-explorer/.test(id)),methods,
   fixtureFiles:app.vault.getFiles().length,markdown:app.vault.getMarkdownFiles().length,mode:f.p.settings.indexingMode,
   physicalComplete:f.p.index.completePhysicalFolderInventory,status:f.p.getIndexStatus(),source:f.p.index.getSourceAcquisitionCounters(),
   ownFolder:explorer?.containerEl.querySelector('[data-path="'+f.folder+'"]')?.outerHTML.slice(0,3000)};
 }finally{await f.cleanup();}
}

/** Exercise conservative source recovery against actual native cache/metadata, without production access.
 * Only the disposable acquisition's lookup authority is retired; final durable closure remains real. */
async function sourceRecovery(app,c){
 const f=c.fixture(app,c);
 try{
  await f.initialize();const p=f.p,note=await f.note('Recovery origin','Recovery fixture\n');await f.canvas(note);await f.ready();
  const source=p.index.sourceAcquisition,repo=source.repository,transaction=repo.transaction,clean=repo.cleanLocalDependencyInspection;
  const diagnostics=p.startupDiagnostics,phase=diagnostics.phase;
  let currentPhase='',headOnly=0,selections=0;const misses=[];
  repo.cleanLocalDependencyInspection=function(...args){const result=clean.apply(this,args);if(!result&&currentPhase==='source-reconciliation'&&misses.length<5){const [id,selected,revision,order,markdownOrder]=args;misses.push({order,markdownOrder,owner:selected.owner,repair:selected.repair,headParser:selected.head?.bodyParserVersion,headSequence:selected.head?.sequence,headRevision:selected.head?.sourceRevision,activationChanged:revision!==this.sourceActivationRevision,memory:this.memory.has(id),unsaved:this.unsaved.has(id),deleting:this.pendingDeletes.has(id)});}return result;};
  diagnostics.phase=function(kind,value,...rest){if(kind==='source')currentPhase=value;return phase.call(this,kind,value,...rest)};
  repo.transaction=function(db,stores,mode,...rest){
   if(currentPhase==='source-reconciliation'&&mode==='readonly'){
    if(stores.length===1&&stores[0]==='sourceHeads')headOnly++;
    if(stores.includes('sourceHeads')&&stores.includes('sourceLocalDependencyOwners'))selections++;
   }
   return transaction.call(this,db,stores,mode,...rest);
  };
  const retire=()=>{diagnostics.phase=phase;repo.transaction=transaction;repo.cleanLocalDependencyInspection=clean};f.restores.push(retire);
  const before=p.index.getSourceAcquisitionCounters(),fullBuilds=p.index.getSemanticPreparationDiagnostics().fullBuilds,files=app.vault.getMarkdownFiles().length;
  source.localDependencyAuthorityReady=false;source.localDependenciesReady=false;
  c.progress={phase:'Actual cached-source recovery',files};const started=Date.now();
  f.check(await source.reconcile(),'Actual dependency projection must close');
  const after=p.index.getSourceAcquisitionCounters(),elapsedMs=Date.now()-started;
  f.check(headOnly===0,'Recovery reread clean source heads '+headOnly+' '+JSON.stringify(misses));
  f.check(selections===files,'One native selection per clean owner '+JSON.stringify({selections,files}));
  f.check(after.vaultReads===before.vaultReads&&after.parses===before.parses,'Unchanged recovery read or parsed Markdown');
  f.check(source.hasSemanticDependencies(),'Actual local dependency authority not restored');retire();
  await app.vault.modify(note,'Recovery fixture after native edit\n');await f.until(()=>p.index.getSourceAcquisitionCounters().checked>after.checked,'Native edit source acquisition');await f.ready();
  f.check((await app.vault.read(note))==='Recovery fixture after native edit\n','Native edit lost');
  f.check(p.index.getSemanticPreparationDiagnostics().fullBuilds===fullBuilds,'Recovery or later edit started a full semantic build');
  return {files,headOnly,selections,elapsedMs,unchangedVaultReads:0,unchangedParses:0,dependencyAuthority:true,laterNativeEdit:true,additionalFullBuilds:0,scope:'Forced dependency-authority retry in disposable Small; not reproduction of the Mac storage failure'};
 }finally{await f.cleanup();}
}

/** Every run validates installed artifact/source hashes and preserves exact configuration bytes. */
export async function runAuthoringCompass278(){
 const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
 const lane=process.env.KPLEX_278_NATIVE_LANE??'inventory',scenario={inventory,folders,structural,authoring,imports,compass,pins,lifetime,periodic,navigation,forms,controls,'source-recovery':sourceRecovery,'gate-defaults':gateDefaults,'daily-automation':dailyAutomation,'template-lifecycle':templateLifecycle,'ontology-export':ontologyExport,'preset-ui':presetUi,'pin-settings':nativePinSettings270,'daily-template':dailyTemplate}[lane];if(!scenario)throw Error('Unknown #278 native lane');
 const dailySwitchScript=lane==='daily-automation'?readFileSync(new URL('../../../docs/snippets/daily-note-excalidraw-view.md',import.meta.url),'utf8').match(/```javascript\r?\n([\s\S]*?)\r?\n```/)[1].replace(/^<%\*\s*/, '').replace(/\s*%>$/, ''):'';
 const sources=lane==='imports'?[{path:join(process.env.KPLEX_HOST_REPORT_DIR,'Native278.bin'),bytes:[0,255,13,10,128,1]},{path:join(process.env.KPLEX_HOST_REPORT_DIR,'Native278.md'),bytes:[...new TextEncoder().encode('# External native fixture\n\nExact Markdown bytes.\n')]}]:[];
 for(const source of sources)writeFileSync(source.path,new Uint8Array(source.bytes));
 const directory=lane==='imports'?join(process.env.KPLEX_HOST_REPORT_DIR,'Native278-directory'):null;if(directory){mkdirSync(directory);mkdirSync(join(directory,'Empty'));mkdirSync(join(directory,'Nested'));writeFileSync(join(directory,'Nested','Note.md'),'# Nested external note\n');writeFileSync(join(directory,'Root.bin'),new Uint8Array([0,255,13,10]));}
 const definitions='c.close='+nativeModalClose.toString()+';c.nativeScreenshot='+nativeScreenshot.toString()+';c.captureRoot='+JSON.stringify(process.env.KPLEX_HOST_REPORT_DIR)+';c.dailySwitchScript='+JSON.stringify(dailySwitchScript)+';c.sessions='+nativeDocumentSessions.toString()+';c.fixture='+nativeBatch270.toString()+';c.type='+nativeText.toString()+';c.pins='+nativePins270.toString()+';c.visualHold='+(process.env.KPLEX_278_VISUAL_HOLD==='true')+';c.visualPhase='+JSON.stringify(process.env.KPLEX_278_UX_VISUAL_PHASE??'')+';c.fixturePrefix="__kplex278_";c.importWindow='+JSON.stringify(process.env.KPLEX_278_IMPORT_WINDOW==='window'?'window':'tab')+';c.externalSources='+JSON.stringify(sources)+';c.externalDirectory='+JSON.stringify(directory)+';c.originalData='+JSON.stringify(readFileSync(join(target.pluginDir,'data.json'),'utf8'))+';c.originalEnabled='+JSON.stringify(readFileSync(join(target.config,'community-plugins.json'),'utf8'))+';';
 return runControlledProbe('authoring-compass-'+lane+'-278',scenario,definitions,
  ['src/index/SourceRepository.ts','src/ui/StyleColorControls.ts','src/ui/plexViews/facets/FacetPresetEditor.ts','src/ui/export/MindMapMarkdownModal.ts','src/adapters/obsidian/fileCreationAutomation.ts','src/adapters/obsidian/KplexModal.ts','src/ui/components/FormField.tsx','src/ui/components/FormSelect.tsx','src/ui/components/FuzzySuggester.tsx','src/ui/features/DrawingTemplateSelect.tsx','src/ui/features/RelationshipFieldControl.tsx','src/ui/features/gateRelationshipIntent.ts','src/application/indexRecoveryDiagnostics.ts','src/ui/RelationshipSelectionControl.tsx','src/adapters/obsidian/dailyNotes.ts','src/main.ts','src/adapters/obsidian/sourceAcquisition.ts','src/adapters/obsidian/externalFileImport.ts','src/adapters/obsidian/relationshipOwner.ts',
   'src/ui/App.tsx','src/ui/PlexGraph.tsx','src/ui/NewRelatedNoteModal.ts','src/ui/SelectedOntologyEditor.ts','src/ui/CreateFolderNoteModal.ts','src/ui/CreatePeriodicNoteModal.ts','src/ui/MoveNodeModal.ts','src/ui/components/Tabs.tsx','src/adapters/obsidian/fileExplorerDrag.ts','src/adapters/obsidian/fileMenu.ts',
   'src/ui/RelationModal.ts','src/ui/RelationshipExplanationModal.ts','src/ui/ReverseRelationshipModal.ts','src/ui/ExternalFileImportBatchModal.ts',
   'src/ui/features/RelationshipDirectionControl.tsx','src/ui/components/ReorderableList.tsx','src/core/plex/views/classic/configuration.ts',
   'src/core/plex/views/classic/definition.ts','src/core/plex/views/classic/geometry.ts','src/ui/plexViews/classic/layout.ts','src/ui/plexViews/classic/ClassicAreaLabels.tsx'],{maximumMs:420000});
}

// The exact-build caller may stage artifacts itself; a direct invocation still owns the same
// application-user-data lock and requires explicit, verified disposable target/report paths.
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const userData=process.env.KPLEX_OBSIDIAN_USER_DATA??(process.platform==='win32'?join(process.env.APPDATA,'obsidian'):process.platform==='darwin'?join(homedir(),'Library','Application Support','obsidian'):join(process.env.XDG_CONFIG_HOME??join(homedir(),'.config'),'obsidian'));
 const lock=acquireHostLock({userDataPath:userData});
 try{await runAuthoringCompass278();}finally{lock.release()}
}
