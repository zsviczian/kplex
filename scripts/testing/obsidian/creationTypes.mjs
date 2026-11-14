/** Native creation-type, template and folder-suggester probe for the disposable Small vault.
 * Its staging caller owns the application lock and complete native workspace/configuration
 * capture, restoration and independent verification; this helper cleans its owned fixtures. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {nativeBatch270} from './nativeBatch270.mjs';
import {nativeDocumentSessions} from './nativeDocumentSessions.mjs';
import {nativeText,nativeModalClose} from './authoringCompass278.mjs';
import {runControlledProbe} from './controlledProbe.mjs';
import {validateTarget} from './runner.mjs';

/** Exercise actual native input while template availability is injected solely for UI coverage.
 * Markdown creation uses the real Vault/template path; drawing creation is not claimed here. */
async function creationTypes(app,c){
 const f=c.fixture(app,c),results=[],dialogs=[];
 try{
  await f.initialize();const p=f.p,t=p.translator,seed=await f.note('Type origin','Owned source\n');
  const markdown=await f.note('Markdown-only template','---\nTypeTabs: retained\n---\n# {{title}}\n'),drawing=await f.note('Drawing-only template','UI-only drawing template fixture\n');
  const leaf=await f.canvas(seed,'k-plex-react-view',c.destination);await f.ready();await f.focus(leaf.view.contentEl.ownerDocument);
  const originalDrawing=p.drawingTemplateOptions,originalAvailability=p.isExcalidrawAvailable;
  p.drawingTemplateOptions=()=>({files:[drawing],selected:drawing.path,root:f.folder});p.isExcalidrawAvailable=()=>true;
  f.restores.push(()=>{p.drawingTemplateOptions=originalDrawing;p.isExcalidrawAvailable=originalAvailability});
  p.settings.markdownTemplateFolder=f.folder;p.settings.folderCreationTab='note';p.settings.newNodeAfterSaving='return';p.settings.alsoWriteInverseOntology=false;await p.saveSettings(false,false);
  /** Native buttons and type tabs have distinct roles even when their translated names overlap. */
  const tab=(content,kind)=>content.querySelector('.kplex-creation-types [role=tab][id$="-tab-'+kind+'"]');
  const picker=content=>content.querySelector('.kplex-creation-types .kplex-template-picker input');
  /** A type switch retires its popup and restores only that kind's committed path. */
  const select=async(content,kind)=>{const target=tab(content,kind);f.check(target,'Offered native creation type '+kind);await f.click(target);await f.until(()=>tab(content,kind)?.getAttribute('aria-selected')==='true','Selected type '+kind);};
  /** Template typing is a real native search and Enter accepts only an active-kind option. */
  const choose=async(content,file,forbidden)=>{const input=picker(content);f.check(input,'Active type Template field');await c.type(f,input,file.basename);
   await f.until(()=>[...input.ownerDocument.querySelectorAll('[role=option]')].some(option=>option.textContent.includes(file.path)),'Type-scoped template results');
   f.check(![...input.ownerDocument.querySelectorAll('[role=option]')].some(option=>option.textContent.includes(forbidden.path)),'Other template kind leaked into active list');
   const option=[...input.ownerDocument.querySelectorAll('[role=option]')].find(option=>option.textContent.includes(file.path));await f.click(option);
   await f.until(()=>picker(content)?.value===file.path,'Committed native pointer-selected template');
   const disclosure=content.querySelector('.kplex-template-picker .kplex-fuzzy-disclosure');await f.click(disclosure);await f.until(()=>picker(content)?.getAttribute('aria-expanded')==='true','Native template popup reopened');
   await f.key(input.ownerDocument,'Escape',[],picker(content));await f.until(()=>picker(content)?.getAttribute('aria-expanded')==='false','Escape closes only the template popup');
   f.check(content.closest('.modal')?.isConnected&&picker(content).value===file.path,'Template popup Escape closed the modal or changed committed path');
  };
  /** Compare real native form geometry and chrome in both themes and desktop/popout widths. */
  const audit=async(modal,label)=>{
   const content=modal.contentEl,doc=content.ownerDocument,native=f.owner(doc),bounds=native.getBounds(),minimum=native.getMinimumSize(),maximized=native.isMaximized(),themes=['theme-light','theme-dark'],original=themes.map(theme=>doc.body.classList.contains(theme));
   try{if(maximized)native.unmaximize();native.setMinimumSize(200,200);for(const [theme,width]of [['theme-light',1160],['theme-dark',360]]){
    themes.forEach(value=>doc.body.classList.toggle(value,value===theme));native.setContentSize(width,900);await f.focus(doc);await f.wait(200);
    f.check(content.scrollWidth<=content.clientWidth+2,label+' horizontal overflow');
    const types=content.querySelector('.kplex-creation-types'),tabs=types?.querySelector('[role=tablist]'),completion=content.querySelector('.kplex-creation-completion');
    f.check(types&&tabs&&completion&&completion.getBoundingClientRect().bottom<=tabs.getBoundingClientRect().top+1,label+' After saving must precede type tabs');
    f.check(types.querySelectorAll('[role=tabpanel]:not([hidden])').length===1,label+' multiple active type panels');
    f.check(doc===leaf.view.containerEl.ownerDocument,label+' modal is outside its invoking native window');
    const close=c.close(modal.modalEl);f.check(close&&close.getBoundingClientRect().width>0,label+' native top-right X missing');
    f.check(![...content.querySelectorAll('.kplex-form-actions button')].some(button=>button.getAttribute('aria-label')===t('common.cancel')),label+' duplicate footer Cancel');
    const input=picker(content),chrome=input?.closest('.kplex-template-picker'),select=completion.querySelector('select');
    if(chrome){const a=doc.defaultView.getComputedStyle(chrome),b=doc.defaultView.getComputedStyle(select);f.check(Math.abs(chrome.getBoundingClientRect().height-select.getBoundingClientRect().height)<1&&a.fontFamily===b.fontFamily&&a.fontSize===b.fontSize,label+' native dropdown typography/height mismatch');}
    for(const field of content.querySelectorAll('.kplex-form-field')){const control=field.querySelector('.kplex-template-picker,input[type=text],textarea');if(!control?.getBoundingClientRect().height)continue;f.check(control.getBoundingClientRect().width>=field.getBoundingClientRect().width*.9,label+' authored field not full width');}
    for(const field of content.querySelectorAll('.kplex-form-inline')){const control=field.querySelector('.kplex-template-picker,input[type=text],select');if(!control?.getBoundingClientRect().height)continue;f.check(control.getBoundingClientRect().width>=field.getBoundingClientRect().width*(field.classList.contains('has-actions') ? 0.55 : 0.65),label+' compact input lost available width');}
    const actions=types.querySelector('[role=tabpanel]:not([hidden]) .kplex-field-actions,[role=tabpanel]:not([hidden]) .kplex-creation-type-actions'),button=actions?.querySelector('button'),glyph=button?.querySelector('svg');
    f.check(button&&glyph&&button.getAttribute('aria-label')&&!button.hasAttribute('title'),label+' create glyph/tooltip ownership');
    if(chrome){const a=chrome.getBoundingClientRect(),b=button.getBoundingClientRect();f.check(a.right<b.left&&Math.abs(a.top+a.height/2-b.top-b.height/2)<2,label+' Template and create action do not share a row');}
    results.push({form:label,theme,width,destination:c.destination,nativeWindow:native.id,afterSavingAboveTabs:true,fullWidth:true,nativeChrome:true});
    if(c.captureRoot){const shot=await native.webContents.capturePage();require('node:fs').writeFileSync(c.captureRoot+'/'+label+'-'+theme+'-'+width+'-'+c.destination+'.png',shot.toPNG());}
   }}finally{themes.forEach((theme,index)=>doc.body.classList.toggle(theme,original[index]));native.setMinimumSize(...minimum);native.setBounds(bounds);if(maximized)native.maximize();}
  };
  p.openCreateInFolderModal(p.index.get('folder:'+f.folder),leaf);let modal=[...p.actionDialogs.keys()].find(value=>value.allowSubfolders);dialogs.push(modal);
  await f.until(()=>modal?.contentEl.querySelector('.kplex-creation-types'),'Native folder type section');
  await select(modal.contentEl,'markdown');await f.click(c.close(modal.modalEl));
  p.openCreateInFolderModal(p.index.get('folder:'+f.folder),leaf);modal=[...p.actionDialogs.keys()].find(value=>value.allowSubfolders);dialogs.push(modal);
  await f.until(()=>tab(modal?.contentEl,'markdown')?.getAttribute('aria-selected')==='true','Folder tab remembered after native X despite drawing template default');
  await c.type(f,modal.nameInput,'Saved from Markdown tab');await select(modal.contentEl,'markdown');await choose(modal.contentEl,markdown,drawing);
  await select(modal.contentEl,'excalidraw');await choose(modal.contentEl,drawing,markdown);await select(modal.contentEl,'markdown');
  f.check(picker(modal.contentEl).value===markdown.path&&modal.nameInput.value==='Saved from Markdown tab','Native folder type switch lost drafts');f.check(!tab(modal.contentEl,'placeholder'),'Physical folder offered Placeholder');await audit(modal,'folder');
  await f.key(modal.contentEl.ownerDocument,'Enter',[process.platform==='darwin'?'meta':'control'],modal.nameInput);
  await f.until(()=>!!app.vault.getFileByPath(f.folder+'/Saved from Markdown tab.md'),'Native selected-kind Markdown creation');const created=app.vault.getFileByPath(f.folder+'/Saved from Markdown tab.md');f.files.push(created);
  await f.until(()=>!modal.opened,'Creation form completed');f.check((await app.vault.read(created)).includes('TypeTabs: retained'),'Selected Markdown template was not applied');
  await f.focus(leaf.view.contentEl.ownerDocument);modal=p.openRelationModal({mode:'create',origin:p.index.get(seed.path),semanticRole:'child',hostLeaf:leaf,invocation:{continuation:'return'}});dialogs.push(modal);
  await f.until(()=>modal.contentEl.querySelector('.kplex-creation-types'),'Related creation types');
  const relatedName=modal.contentEl.querySelector('.kplex-add-related-note-search input');await c.type(f,relatedName,'Related draft');await select(modal.contentEl,'markdown');await choose(modal.contentEl,markdown,drawing);
  await select(modal.contentEl,'placeholder');f.check(!picker(modal.contentEl)&&relatedName.value==='Related draft','Placeholder exposes file templates or loses common draft');await select(modal.contentEl,'markdown');f.check(picker(modal.contentEl).value===markdown.path,'Related template draft not restored');await audit(modal,'related');
  await select(modal.contentEl,'placeholder');await f.click(c.close(modal.modalEl));
  /** Reopening and unsupported-surface fallbacks exercise persisted selection without creating anything. */
  const openRelated=async()=>{await f.focus(leaf.view.contentEl.ownerDocument);const value=p.openRelationModal({mode:'create',origin:p.index.get(seed.path),semanticRole:'child',hostLeaf:leaf});dialogs.push(value);await f.until(()=>value.contentEl.querySelector('.kplex-creation-types'),'Reopened related types');return value;};
  modal=await openRelated();f.check(tab(modal.contentEl,'placeholder')?.getAttribute('aria-selected')==='true','Related Placeholder not remembered after X');modal.close();
  p.openCreateInFolderModal(p.index.get('folder:'+f.folder),leaf);modal=[...p.actionDialogs.keys()].find(value=>value.allowSubfolders);dialogs.push(modal);
  await f.until(()=>modal?.contentEl.querySelector('.kplex-creation-types'),'Physical fallback form');f.check(!tab(modal.contentEl,'placeholder'),'Physical fallback offered unsupported Placeholder');modal.close();
  modal=await openRelated();f.check(tab(modal.contentEl,'placeholder')?.getAttribute('aria-selected')==='true','Physical fallback erased remembered Placeholder');await select(modal.contentEl,'markdown');modal.close();
  const ghostSource=await f.note('Ghost source','[['+f.folder+'/Ghost destination]]');p.notifyNavigation(ghostSource.path,leaf);await f.ready();const ghost=p.index.get(f.folder+'/Ghost destination');f.check(ghost&&!ghost.file,'Native unresolved endpoint');await p.createGhostNote(ghost,true,true,leaf);
  const doc=leaf.view.contentEl.ownerDocument;await f.until(()=>doc.querySelector('.modal.kplex-modal .kplex-creation-types'),'Native materialization types');const element=doc.querySelector('.modal.kplex-modal');modal={modalEl:element,contentEl:element.querySelector('.modal-content'),close:()=>{if(element.isConnected)c.close(element)?.click();}};dialogs.push(modal);
  await select(modal.contentEl,'markdown');await choose(modal.contentEl,markdown,drawing);await select(modal.contentEl,'excalidraw');await select(modal.contentEl,'markdown');f.check(picker(modal.contentEl).value===markdown.path&&!tab(modal.contentEl,'placeholder'),'Materialization lost kind draft or offered Placeholder');await audit(modal,'materialize');await select(modal.contentEl,'excalidraw');await f.click(c.close(element));
  await p.createGhostNote(ghost,true,true,leaf);await f.until(()=>doc.querySelector('.modal.kplex-modal .kplex-creation-types'),'Reopened materialization');
  const reopened=doc.querySelector('.modal.kplex-modal'),reopenedContent=reopened.querySelector('.modal-content');
  dialogs.push({close:()=>{if(reopened.isConnected)c.close(reopened)?.click();}});f.check(tab(reopenedContent,'excalidraw')?.getAttribute('aria-selected')==='true','Materialization tab not remembered after X');await select(reopenedContent,'markdown');await f.click(c.close(reopened));
  await p.createGhostNote(ghost,true,true,leaf);await f.until(()=>doc.querySelector('.modal.kplex-modal .kplex-creation-types'),'Reopened Markdown materialization');
  const markdownReopen=doc.querySelector('.modal.kplex-modal'),markdownContent=markdownReopen.querySelector('.modal-content');
  dialogs.push({close:()=>{if(markdownReopen.isConnected)c.close(markdownReopen)?.click();}});f.check(tab(markdownContent,'markdown')?.getAttribute('aria-selected')==='true','Remembered Markdown lost to drawing template default');await select(markdownContent,'excalidraw');await f.click(c.close(markdownReopen));
  p.isExcalidrawAvailable=()=>false;modal=await openRelated();f.check(!tab(modal.contentEl,'excalidraw')&&tab(modal.contentEl,'markdown')?.getAttribute('aria-selected')==='true'&&tab(modal.contentEl,'placeholder'),'Unavailable companion fallback missing');modal.close();
  p.isExcalidrawAvailable=()=>true;modal=await openRelated();f.check(tab(modal.contentEl,'excalidraw')?.getAttribute('aria-selected')==='true','Unavailable companion fallback erased remembered Excalidraw');modal.close();await p.settingsWriteQueue;
  const savedPreferences=JSON.parse(await app.vault.adapter.read(app.vault.configDir+'/plugins/k-plex/data.json'));
  f.check(savedPreferences.newNodeCreationTab==='excalidraw','Explicit last-used tab was not durably saved');
  // Native onOpen restores its default page and search focus. Navigate only after that real
  // lifecycle receipt, otherwise late native initialization can replace a typed custom row.
  const openDescriptor=Object.getOwnPropertyDescriptor(app.setting,'onOpen'),onOpen=app.setting.onOpen;let opened=false,openError;
  const observedOpen=function(...args){try{const value=onOpen.apply(this,args);if(value&&typeof value.then==='function')value.then(()=>{opened=true;},error=>{openError=error;opened=true;});else opened=true;return value;}catch(error){openError=error;opened=true;throw error;}};
  const restoreOpen=()=>{if(app.setting.onOpen===observedOpen){if(openDescriptor)Object.defineProperty(app.setting,'onOpen',openDescriptor);else delete app.setting.onOpen;}};
  app.setting.onOpen=observedOpen;f.restores.push(restoreOpen);
  try{app.setting.open();await f.until(()=>opened,'Native Settings onOpen completion',10000);if(openError)throw openError;}finally{restoreOpen();}
  app.setting.openTabById('k-plex');await app.setting.openPagePath('k-plex',[t('settings.ui.ontology')]);
  const sourceField=()=>app.setting.getCurrentPageEl()?.querySelector('.kplex-folder-path-input input');
  await f.until(()=>sourceField(),'Native Markdown source folder suggester');await f.focus(sourceField().ownerDocument);
  await f.until(()=>sourceField()?.isConnected&&sourceField().ownerDocument.hasFocus()&&sourceField().getBoundingClientRect().width>0,'Current native Settings window/field');
  const settingsInput=sourceField(),row=settingsInput.closest('.setting-item');settingsInput.scrollIntoView({block:'center'});
  f.check(row.classList.contains('kplex-form-field')&&settingsInput.getAttribute('aria-label')===t('template.folder'),'Settings folder field bypasses shared layout/name');
  c.progress={phase:'Typing native Settings source folder',owner:f.owner(settingsInput.ownerDocument).id,connected:settingsInput.isConnected};
  try{await c.type(f,settingsInput,f.folder.slice(-10));}catch(error){throw Error(String(error)+'; native Settings focus: '+JSON.stringify({connected:settingsInput.isConnected,current:sourceField()===settingsInput,owner:f.owner(settingsInput.ownerDocument).id,rect:settingsInput.getBoundingClientRect().toJSON(),active:settingsInput.ownerDocument.activeElement?.outerHTML.slice(0,500)}));}
  await f.until(()=>[...settingsInput.ownerDocument.querySelectorAll('.kplex-folder-path-results button')].some(option=>option.textContent===f.folder),'Native folder suggestions');
  f.check(settingsInput.getBoundingClientRect().width>=row.getBoundingClientRect().width*.9,'Settings folder input is not full width');
  if(c.captureRoot){const shot=await f.owner(settingsInput.ownerDocument).webContents.capturePage();require('node:fs').writeFileSync(c.captureRoot+'/settings-folder-popup-'+c.destination+'.png',shot.toPNG());}
  await f.key(settingsInput.ownerDocument,'Enter',[],settingsInput);await f.until(()=>p.settings.markdownTemplateFolder===f.folder&&settingsInput.value===f.folder,'Folder autocomplete accepted exact path');
  await f.key(settingsInput.ownerDocument,'A',[process.platform==='darwin'?'meta':'control'],settingsInput);await f.key(settingsInput.ownerDocument,'Backspace',[],settingsInput);await f.until(()=>p.settings.markdownTemplateFolder===''&&settingsInput.value==='','Optional blank stays disabled');
  const rootInput=sourceField();c.progress={phase:'Typing explicit source root',owner:f.owner(rootInput.ownerDocument).id,connected:rootInput.isConnected};await c.type(f,rootInput,'/');await f.until(()=>p.settings.markdownTemplateFolder==='/','Explicit root remains distinct');await p.settingsWriteQueue;
  results.push({folderAutocomplete:true,blankDisabled:true,explicitRoot:true,typeDrafts:true,lastTabAfterCancel:true,unsupportedFallbackPreservesTab:true,actualMarkdownTemplate:true,companion:'Injected availability for UI only'});return{results};
 }finally{for(const modal of dialogs.reverse())modal?.close();await f.cleanup();}
}

/** Run only inside an exact-build staging caller that owns full native-state restoration. */
export async function runCreationTypes(){
 const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
 const definitions='c.close='+nativeModalClose.toString()+';c.fixture='+nativeBatch270.toString()+';c.sessions='+nativeDocumentSessions.toString()+';c.type='+nativeText.toString()+';c.fixturePrefix="__kplex_creation_types_";c.destination='+JSON.stringify(process.env.KPLEX_CREATION_WINDOW==='window'?'window':'tab')+';c.captureRoot='+JSON.stringify(process.env.KPLEX_HOST_REPORT_DIR)+';c.originalData='+JSON.stringify(readFileSync(join(target.pluginDir,'data.json'),'utf8'))+';c.originalEnabled='+JSON.stringify(readFileSync(join(target.config,'community-plugins.json'),'utf8'))+';';
 return runControlledProbe('creation-types',creationTypes,definitions,['src/main.ts','src/settings.ts','src/ui/FolderPathInput.tsx','src/ui/NewRelatedNoteModal.ts','src/ui/CreateFolderNoteModal.ts','src/ui/MaterializeGhostModal.ts','src/ui/features/CreationTypeTabs.tsx','src/ui/features/DrawingTemplateSelect.tsx','styles.css'],{maximumMs:420000});
}
