/** Exact-artifact explicit-template and reciprocal authoring in disposable Small. The caller
 * stages verified companion releases; this lane restores native settings, owned fixtures and views. */
import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {homedir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {runControlledProbe} from './controlledProbe.mjs';
import {validateTarget} from './runner.mjs';
import {acquireHostLock} from './hostLock.mjs';
import {nativeBatch270} from './nativeBatch270.mjs';
import {nativeDocumentSessions} from './nativeDocumentSessions.mjs';
import {nativeText} from './authoringCompass278.mjs';

/** Use real native parsers and property callbacks; only selected delay/failure points are controlled. */
async function templates(app,c){
 const f=c.fixture(app,c),cases=[];let failure;
 try{
  f.check(!document.querySelector('.modal'),'Clean native modal stack before template acceptance');
  await f.initialize();let p=f.p;
  const templater=app.plugins.plugins['templater-obsidian'],ea=window.ExcalidrawAutomate;
  f.check(templater?.manifest.version==='2.27.0'&&ea?.verifyMinimumPluginVersion('2.29.1'),'Pinned supported native companions');
  const local=app.loadLocalStorage('templater-local-settings'),settings=structuredClone(templater.settings);
  f.restores.push(()=>{templater.settings=settings;app.saveLocalStorage('templater-local-settings',local);});
  app.saveLocalStorage('templater-local-settings',{...local,trigger_on_file_creation:false});
  const ownedFolders=[];
  /** Cleanup may remove only descendants whose exact native identities this fixture owns. */
  const folder=async name=>{const value=await app.vault.createFolder(f.folder+'/'+name);ownedFolders.push(value);f.restores.push(async()=>{
   const owned=entry=>f.files.includes(entry)||ownedFolders.includes(entry)&&entry.children.every(owned);
   if(app.vault.getFolderByPath(value.path)===value){f.check(value.children.every(owned),'Foreign descendant in owned fixture');await app.vault.delete(value,true);}
  });return value;};
  const source=await folder('Templates'),output=await folder('Output');
  /** All fixture text is created before automatic templates are enabled. */
  const note=async(name,body)=>{const file=await app.vault.create(source.path+'/'+name+'.md',body);f.files.push(file);await f.until(()=>app.metadataCache.getFileCache(file),'Template fixture metadata');return file;};
  const automatic=await note('Automatic','---\nAutomatic302: true\n---\nAUTO302 <% tp.file.title %>\n');
  const plain=await note('Plain','---\nPreserved302: plain\n---\n# {{title}}\nDate: {{date:YYYY-MM-DD}}\n');
  const properties=await note('Properties','---\nPreserved302: properties\n---\n');
  const selected=await note('Selected','---\naliases: [Template302]\nPreserved302: selected\nParent: ['+JSON.stringify('[['+f.folder+'/Kept parent.md]]')+']\n---\n# {{title}}\nTPL302 <% tp.file.title %>\n');
  const renameTemplate=await note('Rename','<%* await tp.file.rename("RenamedResult"); tR += "RENAMED302:"+tp.file.title; %>');
  const errorTemplate=await note('Error','<%* throw new Error("Owned template failure302"); %>');
  const ex=app.plugins.plugins['obsidian-excalidraw-plugin'],drawing=await note('Drawing',await ex.getBlankDrawing()),drawingSource=ex.settings.templateFilePath;
  ex.settings.templateFilePath=drawing.path;f.restores.push(()=>{ex.settings.templateFilePath=drawingSource;});
  await f.note('Kept parent');const origin=await f.note('Origin','---\nUnrelated302: keep\n---\nOrigin body\n'),leaf=await f.canvas(origin);await f.ready();
  p.settings.markdownTemplateFolder=source.path;p.settings.newNodeDefaultType='markdown';p.settings.lastDrawingTemplatePath='';
  p.settings.alsoWriteInverseOntology=false;p.settings.creation302Future={retained:true};await p.saveSettings(false,false);
  templater.settings={...templater.settings,templates_folder:source.path,trigger_on_file_creation_mode:'folder',folder_templates:[{folder:output.path,template:automatic.path}]};
  app.saveLocalStorage('templater-local-settings',{...local,trigger_on_file_creation:true});
  const engine=templater.templater,parse=engine.parse_template,handler=engine.constructor.on_file_creation,frontmatter=app.fileManager.processFrontMatter;
  const nativePlugin=p,link=p.linkNewRelatedFile,linkDescriptor=Object.getOwnPropertyDescriptor(p,'linkNewRelatedFile'),parseDescriptor=Object.getOwnPropertyDescriptor(engine,'parse_template'),frontmatterDescriptor=Object.getOwnPropertyDescriptor(app.fileManager,'processFrontMatter');
  const executions=[],automaticAdmissions=[],nativeCompletions=new WeakMap(),writes=[];let heldPath=null,releaseParser=null,parserEntered=false,failInverse=false,pairTarget=null;
  p.linkNewRelatedFile=function(...args){pairTarget=args[2];return link.apply(this,args);};
  engine.parse_template=async function(config,content){const execution={target:config.target_file?.path,template:config.template_file?.path};executions.push(execution);if(config.target_file?.path===heldPath){parserEntered=true;await new Promise(resolve=>{releaseParser=resolve});}const rendered=await parse.call(this,config,content);execution.rendered=rendered;return rendered;};
  const observedNative=function(engine,owner,file){if(file.path.startsWith(output.path+'/'))automaticAdmissions.push(file.path);const completion=handler.call(this,engine,owner,file);nativeCompletions.set(file,completion);return completion;};engine.constructor.on_file_creation=observedNative;
  app.fileManager.processFrontMatter=async function(file,callback,options){if(file===origin||file.path.startsWith(output.path+'/'))writes.push(file.path);if(failInverse&&file===pairTarget&&file.path===heldPath)throw Error('Owned inverse failure302');return frontmatter.call(this,file,callback,options);};
  f.restores.push(()=>{releaseParser?.();if(parseDescriptor)Object.defineProperty(engine,'parse_template',parseDescriptor);else delete engine.parse_template;engine.constructor.on_file_creation=handler;if(frontmatterDescriptor)Object.defineProperty(app.fileManager,'processFrontMatter',frontmatterDescriptor);else delete app.fileManager.processFrontMatter;if(linkDescriptor)Object.defineProperty(nativePlugin,'linkNewRelatedFile',linkDescriptor);else delete nativePlugin.linkNewRelatedFile;});
  /** Every shell commits the same real searchable control with native keyboard input. */
  const chooseTemplate=async(content,template)=>{const kind=template===drawing?'excalidraw':'markdown',tab=content.querySelector('.kplex-creation-types [role=tab][id$="-tab-'+kind+'"]');f.check(tab,'Template type tab');await f.click(tab);
   await f.until(()=>tab.getAttribute('aria-selected')==='true','Selected template type');const input=content.querySelector('.kplex-template-picker input');f.check(input,'Single native Template combobox');await c.type(f,input,template.basename);
   await f.until(()=>[...content.ownerDocument.querySelectorAll('.kplex-search-results button')].some(option=>option.textContent.includes(template.path)),'Searchable kind/path template option');await f.key(content.ownerDocument,'Enter',[],input);};
  /** Capture metadata-only browsing work independently from physical creation and parser execution. */
  const before=p.index.getSourceAcquisitionCounters(),semantic=p.index.getSemanticPreparationDiagnostics(),catalogue=p.creationTemplateOptions();
  f.check(catalogue.files.some(item=>item.path===plain.path&&item.kind==='markdown'),'Configured Markdown catalogue');
  f.check(catalogue.files.filter(item=>item.path===drawing.path).length===1&&catalogue.files.some(item=>item.path===drawing.path&&item.kind==='excalidraw'),'Public drawing template retains one actual-kind catalogue entry');
  f.check(executions.length===0&&JSON.stringify(p.index.getSourceAcquisitionCounters())===JSON.stringify(before)
   &&p.index.getSemanticPreparationDiagnostics().fullBuilds===semantic.fullBuilds,'Template catalogue performed source/semantic work');
  const result=await p.updateOntologyField('children',['Child/Parent'],[...p.settings.hierarchy.children],()=>true);f.check(typeof result.refreshPending==='boolean','Paired native ontology');await f.ready();
  for(const [name,template,expected]of [['PlainResult',plain,'Preserved302: plain'],['PropertiesResult',properties,'Preserved302: properties']]){
   const file=await p.createNewRelatedFileForOrigin(p.index.get(origin.path),name,'markdown','',output.path,template.path);f.check(file,'Explicit core template output');f.files.push(file);
   const content=await app.vault.read(file);f.check(content.includes(expected)&&!content.includes('AUTO302')&&!content.includes('{{title}}'),'Explicit plain/properties template content');
   f.check(!automaticAdmissions.includes(file.path)&&!executions.some(call=>call.target===file.path),'Explicit plain choice ran automatic/parser work');cases.push({case:name,explicitOnly:true});
   if(name==='PlainResult'){await p.linkNewRelatedFile(p.index.get(origin.path),'child',file,'Child');f.check(!(await app.vault.read(file)).includes('Parent:'),'Default-off authoring added an inverse property');cases.push({case:'default-off',oneOwner:true});}
  }
  const auto=await p.createNewRelatedFileForOrigin(p.index.get(origin.path),'AutomaticResult','markdown','',output.path,'');f.check(auto,'Automatic native output');f.files.push(auto);
  f.check((await app.vault.read(auto)).includes('AUTO302 AutomaticResult')&&automaticAdmissions.filter(path=>path===auto.path).length===1
   &&executions.filter(call=>call.target===auto.path).length===1,'No K-Plex template preserved exactly one native automatic template');cases.push({case:'no-explicit',automaticOnce:true});
  const renamed=await p.createNewRelatedFileForOrigin(p.index.get(origin.path),'BeforeRename','markdown','',output.path,renameTemplate.path);f.check(renamed,'Native template-renamed result');f.files.push(renamed);
  const renameOutput=executions.find(call=>call.target===output.path+'/BeforeRename.md')?.rendered,renameBody=await app.vault.read(renamed);
  f.check(renamed.path===output.path+'/RenamedResult.md'&&renameOutput?.startsWith('RENAMED302:')&&renameBody.includes(renameOutput)
   &&!engine.files_with_pending_templates.has(output.path+'/BeforeRename.md'),'Native rename keeps exact parser output identity and ends original task token: '+JSON.stringify({path:renamed.path,renameOutput,renameBody,pending:engine.files_with_pending_templates.has(output.path+'/BeforeRename.md')}));cases.push({case:'native-parser-rename',sameFile:true});
  const concurrent=await Promise.allSettled(['ConcurrentOne','ConcurrentTwo'].map(name=>p.createNewRelatedFileForOrigin(p.index.get(origin.path),name,'markdown','',output.path,selected.path)));
  for(const result of concurrent){const file=result.status==='fulfilled'?result.value:result.reason?.file;if(file)f.files.push(file);}
  const concurrentBodies=[];
  for(const result of concurrent){f.check(result.status==='fulfilled'&&result.value,'Concurrent native result');const file=result.value,content=await app.vault.read(file);concurrentBodies.push({path:file.path,content});}
  for(const {path,content} of concurrentBodies){const file=app.vault.getFileByPath(path);
   f.check(content.includes('TPL302 '+file.basename)&&!content.includes('AUTO302')&&executions.filter(call=>call.target===path).length===1,'Concurrent explicit native receipts remain independent: '+JSON.stringify({concurrentBodies,executions}));}
  cases.push({case:'concurrent-explicit',independent:true});
  heldPath=output.path+'/HeldExplicit.md';parserEntered=false;
  const held=p.createNewRelatedFileForOrigin(p.index.get(origin.path),'HeldExplicit','markdown','',output.path,selected.path);
  void held.catch(()=>{});f.restores.push(async()=>{releaseParser?.();await held.catch(()=>{});});
  await f.until(()=>parserEntered,'Owned parser context held before foreign creation');const heldPhysical=app.vault.getFileByPath(heldPath);f.check(heldPhysical,'Owned held native identity');f.files.push(heldPhysical);
  const foreign=await app.vault.create(output.path+'/ForeignAutomatic.md','');f.files.push(foreign);
  f.check(!executions.some(call=>call.target===foreign.path),'Foreign parser overlapped owned native context');releaseParser();const heldFile=await held;f.check(heldFile===heldPhysical,'Completed held explicit result');heldPath=null;
  await f.until(()=>nativeCompletions.has(foreign),'Original foreign handler admission');await nativeCompletions.get(foreign);
  f.check((await app.vault.read(heldFile)).includes('TPL302 HeldExplicit')&&(await app.vault.read(foreign)).includes('AUTO302 ForeignAutomatic')
   &&automaticAdmissions.filter(path=>path===foreign.path).length===1,'Foreign automatic template retained exactly its native context');
  await f.until(()=>engine.constructor.on_file_creation===observedNative,'Creation wrapper retired after foreign receipts drain');cases.push({case:'explicit-and-foreign-automatic',nativeContextIsolated:true,foreignOnce:true,wrapperRestored:true});
  const drawingFile=await p.createNewRelatedFileForOrigin(p.index.get(origin.path),'DrawingResult','excalidraw','',output.path,drawing.path);f.check(drawingFile,'Public native drawing-template output');f.files.push(drawingFile);
  f.check(ex.isExcalidrawFile(drawingFile)&&!(await app.vault.read(drawingFile)).includes('AUTO302')&&p.settings.lastDrawingTemplatePath===drawing.path,'Drawing choice preserves public creation and remembered path');cases.push({case:'native-drawing-template',actualKind:true,remembered:true});
  const stale=p.creationTemplateOptions(),selectedPath=selected.path;
  await app.vault.rename(selected,source.path+'/Renamed source.md');let staleRejected=false;
  try{stale.validate(selectedPath,'markdown');}catch{staleRejected=true;}finally{await app.vault.rename(selected,selectedPath);}
  f.check(staleRejected,'Renamed template source cannot borrow captured selection authority');cases.push({case:'renamed-source',refusedBeforeCreate:true});
  p.settings.alsoWriteInverseOntology=true;await p.saveSettings(false,false);await f.ready();
  heldPath=output.path+'/CombinedResult.md';failInverse=true;
  const modal=p.openRelationModal({mode:'create',origin:p.index.get(origin.path),semanticRole:'child',hostLeaf:leaf,invocation:{initialOntology:'Child',continuation:'return'}});
  f.restores.push(()=>{if(modal.modalEl.isConnected)modal.close();});
  const doc=modal.contentEl.ownerDocument;
  await f.until(()=>modal.contentEl.querySelector('.kplex-add-related-note-search input'),'Native related-note composer');
  await c.type(f,modal.contentEl.querySelector('.kplex-add-related-note-search input'),'CombinedResult');
  // Folder is a normal shared searchable field; the native creation API below still validates it.
  const folderInput=modal.contentEl.querySelector('.kplex-folder-path-input input');
  f.check(folderInput,'Native destination field');await c.type(f,folderInput,output.path);await f.key(doc,'Tab',[],folderInput);
  await chooseTemplate(modal.contentEl,selected);
  const create=modal.contentEl.querySelector('[data-kplex-primary-action=true]');f.check(create&&!create.disabled,'Validated native primary create action');
  const startWrites=writes.length,startOrigin=await app.vault.read(origin);await f.click(create);await f.until(()=>parserEntered,'Actual native selected parser admission');
  const target=app.vault.getFileByPath(heldPath);f.check(target,'Durable native file exists during parser wait');f.files.push(target);
  f.check(writes.length===startWrites&&(await app.vault.read(origin))===startOrigin,'Ontology saved before template completion');
  releaseParser();await f.until(()=>modal.contentEl.querySelector('.kplex-add-related-recovery'),'Native per-file partial receipt');
  const retained=await app.vault.read(target),forward=await app.vault.read(origin);
  f.check(retained.includes('TPL302 CombinedResult')&&retained.includes('Preserved302: selected')&&retained.includes('Template302')&&!retained.includes('AUTO302'),'Native template content survives inverse failure');
  f.check(forward.includes('CombinedResult')&&modal.contentEl.textContent.includes(origin.path)&&modal.contentEl.textContent.includes(target.path),'Truthful independent native file outcomes');
  const firstWrites=writes.filter(path=>path===origin.path).length;failInverse=false;
  const retry=[...modal.contentEl.querySelectorAll('button')].find(button=>button.textContent===p.translator('reciprocal.retry'));f.check(retry,'Native receipt retry');await f.until(()=>!retry.disabled,'Completed native failure delivery');await f.click(retry);
  await f.until(()=>!modal.modalEl.isConnected,'Native reciprocal completion');
  f.check(writes.filter(path=>path===origin.path).length===firstWrites&&executions.filter(call=>call.target===target.path).length===1
   &&automaticAdmissions.filter(path=>path===target.path).length===0,'Retry duplicated forward, creation or template execution');
  const final=await app.vault.read(target);f.check(final.includes('Parent:')&&final.includes('Origin')&&final.includes('Kept parent')&&final.includes('TPL302 CombinedResult')&&final.includes('Template302'),'Native inverse preserves selected properties/body');
  cases.push({case:'combined-native-form',templateOnce:true,forwardOnce:true,inverseRetried:true,sameFile:true});
  heldPath=null;p.settings.alsoWriteInverseOntology=false;await p.saveSettings(false,false);
  p.settings.folderCreationTab='note';await p.createdNoteCompletionControl(leaf).onChange('return');
  p.openCreateInFolderModal(p.index.get('folder:'+output.path),leaf);const folderModal=[...p.actionDialogs.keys()].find(dialog=>dialog.allowSubfolders);
  f.restores.push(()=>{if(folderModal?.modalEl.isConnected)folderModal.close();});
  await f.until(()=>folderModal?.nameInput&&folderModal.contentEl.querySelector('.kplex-template-picker input'),'Actual folder creation Template form');
  await c.type(f,folderModal.nameInput,'FolderResult');await chooseTemplate(folderModal.contentEl,plain);
  const folderSave=[...folderModal.contentEl.querySelectorAll('.kplex-form-actions button')].find(button=>button.getAttribute('aria-label')===p.translator('addRelated.createMarkdown'));
  f.check(folderSave&&!folderSave.disabled,'Matching native folder creation action');await f.click(folderSave);
  await f.until(()=>!folderModal.modalEl.isConnected,'Native folder template completion');const folderFile=app.vault.getFileByPath(output.path+'/FolderResult.md');f.check(folderFile,'Created folder note');f.files.push(folderFile);
  f.check((await app.vault.read(folderFile)).includes('# FolderResult')&&!automaticAdmissions.includes(folderFile.path),'Folder form executed explicit template only');cases.push({case:'folder-form',explicitOnly:true});
  const ghostPath=output.path+'/GhostResult';await app.fileManager.processFrontMatter(origin,fm=>{fm.Child=[...(Array.isArray(fm.Child)?fm.Child:fm.Child?[fm.Child]:[]),'[['+ghostPath+']]'];});await f.ready();
  const ghost=p.index.get(ghostPath);f.check(ghost&&!ghost.file,'Actual unresolved native creation target');await p.createGhostNote(ghost,true,true,leaf);
  await f.until(()=>doc.querySelector('.modal.kplex-modal .kplex-template-picker input'),'Actual placeholder Template form');const ghostEl=doc.querySelector('.modal.kplex-modal'),ghostContent=ghostEl.querySelector('.modal-content');
  f.restores.push(async()=>{for(let attempt=0;attempt<3&&ghostEl.isConnected;attempt++)await f.key(doc,'Escape');f.check(!ghostEl.isConnected,'Owned placeholder modal retired');});
  const ghostFolder=ghostContent.querySelector('.kplex-folder-path-input input');f.check(ghostFolder,'Native placeholder destination');await f.until(()=>doc.activeElement===ghostFolder,'Native placeholder initial destination focus',5000);
  if(ghostFolder.value!==output.path)await c.type(f,ghostFolder,output.path);await f.key(doc,'Tab',[],ghostFolder);await chooseTemplate(ghostContent,plain);
  const ghostSave=[...ghostContent.querySelectorAll('.kplex-form-actions button')].find(button=>button.getAttribute('aria-label')===p.translator('addRelated.createMarkdown'));
  f.check(ghostSave&&!ghostSave.disabled,'Matching native placeholder creation action');await f.click(ghostSave);await f.until(()=>!ghostEl.isConnected,'Native placeholder template completion');
  const ghostFile=app.vault.getFileByPath(ghostPath+'.md');f.check(ghostFile,'Materialized native template target');f.files.push(ghostFile);
  f.check((await app.vault.read(ghostFile)).includes('# GhostResult')&&!automaticAdmissions.includes(ghostFile.path),'Placeholder form executed explicit template only');cases.push({case:'placeholder-form',explicitOnly:true});
  let failedFile;try{await p.createNewRelatedFileForOrigin(p.index.get(origin.path),'FailureResult','markdown','',output.path,errorTemplate.path);throw Error('Expected native parser rejection');}
  catch(error){failedFile=error.file;f.check(failedFile&&app.vault.getFileByPath(failedFile.path)===failedFile,'Failed parser retained exact native result');f.files.push(failedFile);}
  let rejected=false;try{await p.waitForCreatedFileAutomation(failedFile);}catch{rejected=true;}
  f.check(rejected&&executions.filter(call=>call.target===failedFile.path).length===1&&(await app.vault.read(failedFile))==='','Parser error receipt blocks repeated execution and ontology');
  cases.push({case:'parser-error',retained:true,executedOnce:true});
  p.settings.alsoWriteInverseOntology=true;await p.saveSettings(false,false);
  p=await f.reload();f.check(p.settings.markdownTemplateFolder===source.path&&p.settings.alsoWriteInverseOntology===true
   &&p.settings.creation302Future.retained===true&&p.settings.lastDrawingTemplatePath===drawing.path,'Non-default/unknown template settings survive actual reload');
  cases.push({case:'settings-reload',preserved:true});
  return{cases,companions:{templater:templater.manifest.version,excalidraw:app.plugins.plugins['obsidian-excalidraw-plugin'].manifest.version}};
 }catch(error){failure=Error(String(error)+'; template cases: '+JSON.stringify(cases));throw failure;}finally{try{await f.cleanup();}catch(cleanup){throw Error((failure?String(failure)+'; ':'')+'Independent fixture cleanup: '+String(cleanup));}}
}

/** Reload only K-Plex while its old automatic native template remains inside a real parser await.
 * Exact receipt admission, rather than a quiet-time delay, proves when the new bundle owns work. */
async function templateReload(app,c){
 const f=c.fixture(app,c);let failure,oldWait,newWait,oldReceipt,newReceipt,oldAutomation,newAutomation;
 let releaseOld=()=>{},oldInstalledHandler,newInstalledHandler;const executions=[],parserTasks=[],ownedFolders=[];
 try{
  f.check(!document.querySelector('.modal'),'Clean native modal stack before reload acceptance');await f.initialize();
  const oldPlugin=f.p,templater=app.plugins.plugins['templater-obsidian'],engine=templater?.templater;
  f.check(templater?.manifest.version==='2.27.0'&&engine,'Pinned supported native Templater');
  const local=app.loadLocalStorage('templater-local-settings'),settings=structuredClone(templater.settings);
  f.restores.push(()=>{templater.settings=settings;app.saveLocalStorage('templater-local-settings',local);});
  app.saveLocalStorage('templater-local-settings',{...local,trigger_on_file_creation:false});
  /** The shared fixture removes only these exact native descendants, after every receipt drains. */
  const folder=async name=>{const value=await app.vault.createFolder(f.folder+'/'+name);ownedFolders.push(value);f.restores.push(async()=>{
   const owned=entry=>f.files.includes(entry)||ownedFolders.includes(entry)&&entry.children.every(owned);
   if(app.vault.getFolderByPath(value.path)===value){f.check(value.children.every(owned),'Foreign descendant in reload fixture');await app.vault.delete(value,true);}
  });return value;};
  const source=await folder('Templates'),output=await folder('Output');
  const note=async(name,body)=>{const file=await app.vault.create(source.path+'/'+name+'.md',body);f.files.push(file);await f.until(()=>app.metadataCache.getFileCache(file),'Reload template metadata');return file;};
  const automatic=await note('Automatic','<%* window.kplexIndexingProbe.templateReloadEntered=true; await window.kplexIndexingProbe.templateReloadGate; %>\nTPL302 <% tp.file.title %> PATH302 <% tp.file.path(true) %>\n');
  const selected=await note('Selected','# {{title}}\nTPL302 <% tp.file.title %> PATH302 <% tp.file.path(true) %>\n');
  const origin=await f.note('Origin');await f.canvas(origin);await f.ready();
  oldPlugin.settings.markdownTemplateFolder=source.path;oldPlugin.settings.alsoWriteInverseOntology=false;await oldPlugin.saveSettings(false,false);
  templater.settings={...templater.settings,templates_folder:source.path,trigger_on_file_creation_mode:'folder',folder_templates:[{folder:output.path,template:automatic.path}]};
  app.saveLocalStorage('templater-local-settings',{...local,trigger_on_file_creation:true});
  const owner=engine.constructor,originalHandler=owner.on_file_creation,parse=engine.parse_template,parseDescriptor=Object.getOwnPropertyDescriptor(engine,'parse_template');
  const marker=Symbol.for('k-plex:templater-creation-receipts'),oldPath=output.path+'/AutomaticOld.md',newPath=output.path+'/SelectedNew.md';
  f.check(!Object.getOwnPropertyDescriptor(owner,marker),'No prior native creation registration');
  c.templateReloadEntered=false;c.templateReloadGate=new Promise(resolve=>{releaseOld=resolve;});
  /** Observe the genuine parser only. The old template itself owns its awaited command. */
  engine.parse_template=function(config,content){
   const execution={target:config.target_file?.path,template:config.template_file?.path,started:executions.length+1,completed:false};executions.push(execution);
   const task=(async()=>{try{const rendered=await parse.call(this,config,content);execution.rendered=rendered;return rendered;}catch(error){execution.error=String(error);throw error;}finally{execution.completed=true;}})();
   parserTasks.push(task);void task.catch(()=>{});return task;
  };
  /** Harvest before and after waiting: a failure cannot leave an unregistered asynchronously created file. */
  const harvest=()=>{for(const path of [oldPath,newPath]){const file=app.vault.getFileByPath(path);if(file&&!f.files.includes(file))f.files.push(file);}return{oldFile:app.vault.getFileByPath(oldPath),newFile:app.vault.getFileByPath(newPath)};};
  const drain=async()=>{
   releaseOld();harvest();await Promise.allSettled([oldWait,newWait,oldReceipt,newReceipt].filter(Boolean));
   const {oldFile,newFile}=harvest();const receipts=[oldFile&&oldAutomation?.tasks.get(oldFile),newFile&&newAutomation?.tasks.get(newFile)].filter(Boolean);
   await Promise.allSettled([...receipts,...parserTasks]);harvest();
  };
  f.restores.push(async()=>{
   await drain();
   if(parseDescriptor)Object.defineProperty(engine,'parse_template',parseDescriptor);else delete engine.parse_template;
   // The intentionally failing baseline leaves its known retired wrapper installed. Remove only
   // that observed fixture-owned wrapper after all old/new native work has completed.
   if(owner.on_file_creation!==originalHandler){f.check(owner.on_file_creation===oldInstalledHandler||owner.on_file_creation===newInstalledHandler,'Unknown later native handler owner');owner.on_file_creation=originalHandler;}
   f.check(owner.on_file_creation===originalHandler&&!Object.getOwnPropertyDescriptor(owner,marker),'Reload parser/creation registration cleanup');
   delete c.templateReloadGate;delete c.templateReloadEntered;
  });
  oldAutomation=oldPlugin.fileCreationAutomation;
  oldWait=oldPlugin.createNewRelatedFileForOrigin(oldPlugin.index.get(origin.path),'AutomaticOld','markdown','',output.path,'')
   .then(file=>({status:'fulfilled',file}),error=>({status:'rejected',file:error.file,message:String(error)}));
  await f.until(()=>{const {oldFile}=harvest();return c.templateReloadEntered&&oldFile&&oldAutomation.tasks.has(oldFile);},'Old automatic parser awaits inside native template');
  const oldFile=app.vault.getFileByPath(oldPath);oldReceipt=oldAutomation.tasks.get(oldFile);void oldReceipt.catch(()=>{});oldInstalledHandler=owner.on_file_creation;
  f.check(executions.filter(call=>call.target===oldPath).length===1&&!executions.find(call=>call.target===oldPath).completed,'One old native parser owns the pending automatic receipt');
  const newPlugin=await f.reload();
  f.check(oldPlugin.constructor!==newPlugin.constructor,'K-Plex bundle was genuinely re-evaluated');
  f.check(app.plugins.plugins['templater-obsidian']===templater&&templater.templater===engine,'K-Plex-only reload preserved exact native engine');
  const oldOutcome=await oldWait;f.check(oldOutcome.status==='rejected'&&oldOutcome.file===oldFile,'Old K-Plex wait cancelled while its native automatic receipt remained');
  f.check(!executions.find(call=>call.target===oldPath).completed,'Old native template remains pending after reload');
  newAutomation=newPlugin.fileCreationAutomation;
  newWait=newPlugin.createNewRelatedFileForOrigin(newPlugin.index.get(origin.path),'SelectedNew','markdown','',output.path,selected.path);void newWait.catch(()=>{});
  await f.until(()=>{const {newFile}=harvest();return newFile&&newAutomation.tasks.has(newFile);},'New exact native creation receipt admitted after bundle reload');
  const newFile=app.vault.getFileByPath(newPath);newReceipt=newAutomation.tasks.get(newFile);void newReceipt.catch(()=>{});newInstalledHandler=owner.on_file_creation;
  // The receipt exists only after createdIdentity acceptance. Flush its immediately runnable
  // continuations; no fixed quiet window or outer-handler observer establishes parser admission.
  await Promise.resolve();await Promise.resolve();
  const overlap=executions.some(call=>call.target===newPath)&&!executions.find(call=>call.target===oldPath).completed;
  const admission={overlap,oldNativePending:!executions.find(call=>call.target===oldPath).completed,newReceiptCaptured:newAutomation.tasks.has(newFile),sameHandler:oldInstalledHandler===newInstalledHandler,events:executions.map(call=>({...call}))};
  c.progress={phase:'Native reload receipt admission',expectation:c.templateReloadExpectation,admission};
  releaseOld();await oldReceipt;const created=await newWait;await newReceipt;await drain();
  const oldBody=await app.vault.read(oldFile),newBody=await app.vault.read(newFile),originalRestored=owner.on_file_creation===originalHandler,markerRemoved=!Object.getOwnPropertyDescriptor(owner,marker);
  const evidence={expectation:c.templateReloadExpectation,actualBundleReevaluation:oldPlugin.constructor!==newPlugin.constructor,sameNativeEngine:templater.templater===engine,admission,oldBody,newBody,executions,originalRestored,markerRemoved,oldWaitStatus:oldOutcome.status};
  c.progress={phase:'Native reload completed before cleanup',...evidence};
  f.check(created===newFile&&executions.filter(call=>call.target===oldPath).length===1&&executions.filter(call=>call.target===newPath).length===1,'Old/new native parsers executed exactly once: '+JSON.stringify(evidence));
  f.check(!engine.files_with_pending_templates.has(oldPath)&&!engine.files_with_pending_templates.has(newPath),'Old/new native task tokens drained');
  if(c.templateReloadExpectation==='overlap')f.check(overlap,'Baseline must demonstrate parser overlap after actual bundle re-evaluation: '+JSON.stringify(evidence));
  else f.check(!overlap&&admission.sameHandler&&oldBody.includes('TPL302 AutomaticOld')&&oldBody.includes(oldPath)&&newBody.includes('TPL302 SelectedNew')&&newBody.includes(newPath)&&originalRestored&&markerRemoved,'Reload joins native context and retires true original/marker: '+JSON.stringify(evidence));
  return evidence;
 }catch(error){failure=error;throw error;}finally{try{await f.cleanup();}catch(cleanup){throw Error((failure?String(failure)+'; ':'')+'Independent reload fixture cleanup: '+String(cleanup));}}
}

/** A staging caller retains one application lock across companion deployment, this lane and cleanup. */
export async function runAuthoringWorkspaceTemplates(){
 const reloadLane=process.env.KPLEX_TEMPLATE_LANE==='reload',expectation=process.env.KPLEX_TEMPLATE_RELOAD_EXPECT??'isolated';
 if(process.env.KPLEX_TEMPLATE_LANE&&!['full','reload'].includes(process.env.KPLEX_TEMPLATE_LANE))throw Error('Unknown template acceptance lane');
 if(reloadLane&&!['isolated','overlap'].includes(expectation))throw Error('Unknown native template reload expectation');
 const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
 const definitions='c.fixture='+nativeBatch270.toString()+';c.sessions='+nativeDocumentSessions.toString()+';c.type='+nativeText.toString()+';c.fixturePrefix='+JSON.stringify(reloadLane?'__kplex302_template_reload_':'__kplex302_templates_')+';c.templateReloadExpectation='+JSON.stringify(expectation)+';c.originalData='+JSON.stringify(readFileSync(join(target.pluginDir,'data.json'),'utf8'))+';c.originalEnabled='+JSON.stringify(readFileSync(join(target.config,'community-plugins.json'),'utf8'))+';';
 return runControlledProbe(reloadLane?'authoring-workspace-template-reload':'authoring-workspace-templates',reloadLane?templateReload:templates,definitions,['src/main.ts','src/settings.ts','src/ui/NewRelatedNoteModal.ts','src/ui/features/DrawingTemplateSelect.tsx','src/ui/components/FuzzySuggester.tsx','src/adapters/obsidian/creationTemplates.ts','src/adapters/obsidian/fileCreationAutomation.ts','src/adapters/obsidian/reciprocalRelationshipWrite.ts'],{maximumMs:420000});
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const userData=process.env.KPLEX_OBSIDIAN_USER_DATA??(process.platform==='win32'?join(process.env.APPDATA,'obsidian'):process.platform==='darwin'?join(homedir(),'Library','Application Support','obsidian'):join(process.env.XDG_CONFIG_HOME??join(homedir(),'.config'),'obsidian'));
 const lock=acquireHostLock({userDataPath:userData});
 try{await runAuthoringWorkspaceTemplates();}finally{lock.release();}
}
