/** Exact-build native daily-template creation from placeholders, calendar and Today.
 * Requires real Templater and Excalidraw staged in disposable Small; never uses production notes.
 * The caller owns executable staging and the application lock, while this fixture restores all
 * notes, template handlers, settings, Daily Notes options and workspace state independently. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {runControlledProbe} from './controlledProbe.mjs';
import {nativeBatch270} from './nativeBatch270.mjs';
import {nativeDocumentSessions} from './nativeDocumentSessions.mjs';
import {validateTarget} from './runner.mjs';

async function scenario(app,c){
 const f=c.fixture(app,c),samples=[],dialogs=[];let dailyFolder;
 try{
  await f.initialize();const p=f.p,tpl=app.plugins.plugins['templater-obsidian'],ex=app.plugins.plugins['obsidian-excalidraw-plugin'];
  f.check(tpl?.templater?.constructor?.on_file_creation&&ex?.ea?.toggleViewMode&&ex?.getBlankDrawing,'Real Templater and Excalidraw required');
  const local=app.loadLocalStorage('templater-local-settings'),settings=structuredClone(tpl.settings);
  app.saveLocalStorage('templater-local-settings',{...local,trigger_on_file_creation:false});
  f.restores.push(()=>{tpl.settings=settings;app.saveLocalStorage('templater-local-settings',local)});
  const core=app.internalPlugins.getPluginById('daily-notes')?.instance;f.check(core?.getDailyNote,'Enabled core Daily Notes required');
  const options=core.options;f.restores.push(()=>{core.options=options});
  const date='2032-03-05',name=window.moment(date).format('YYYY-MM-DD dddd');
  const inferenceField='Kplex daily inference',types=app.metadataTypeManager;
  f.check(types?.getTypeInfo&&types.getAssignedWidget(inferenceField)===null,'Unassigned native inference fixture');
  const dateFrontmatter='---\n'+JSON.stringify(inferenceField)+': "2000-01-01"\n---\n';
  const source=await f.note('Daily placeholder origin',dateFrontmatter+'An unresolved day: [['+name+']]\nUnrelated: [[Not a daily note]]\n');
  const unrelatedDateHolders=new Set();for(let n=0;n<40;n++)unrelatedDateHolders.add((await f.note('Unrelated Date holder '+n,dateFrontmatter)).path);
  f.check(types.getPropertyInfo(inferenceField).widget==='date','Native field hint starts as Date');
  const leaf=await f.canvas(source);await f.ready();const doc=leaf.view.contentEl.ownerDocument;
  const unrelated=app.workspace.getLeaf('tab');f.leaves.push(unrelated);await unrelated.openFile(source,{active:false});
  // Allocating a tab selects its group even when openFile is inactive. Keep the actual canvas
  // visible: hidden-canvas pause is intentional and cannot establish an indexing failure.
  await app.workspace.revealLeaf(leaf);f.check(p.hasVisibleKplexSurface(),'Visible daily creation canvas');
  dailyFolder=await app.vault.createFolder(f.folder+'/Daily');
  const key='__kplexDailyTemplateFixture';f.check(!(key in app.workspace),'Owned template callback key');
  app.workspace[key]={refs:[],calls:[]};
  f.restores.push(()=>{for(const ref of app.workspace[key]?.refs??[])app.metadataCache.offref(ref);delete app.workspace[key]});
  // Reproduce the supplied template's active-editor callback, retaining only booleans for assertions.
  const callback='<%* const path=tp.file.path(true); let ref; ref=app.metadataCache.on("changed",file=>{if(file.path!==path)return;app.metadataCache.offref(ref);app.workspace.'+key+'.calls.push({matched:app.workspace.getActiveFile()===file});app.commands.executeCommandById("obsidian-excalidraw-plugin:toggle-excalidraw-view");});app.workspace.'+key+'.refs.push(ref); %>';
  const blank=await ex.getBlankDrawing(),newline=blank.startsWith('---\r\n')?'\r\n':'\n';f.check(blank.startsWith('---'+newline),'Drawing template frontmatter');
  const drawingBody='---'+newline+JSON.stringify(inferenceField)+': "[[Kplex inference text]]"'+newline+blank.slice(3+newline.length);
  const drawing=await f.note('Daily drawing template',drawingBody+'\n'+callback+'\nRendered day: <% tp.file.title %>\n');
  const plain=await f.note('Daily Markdown template','---\nsentinel: <% tp.file.title %>\n---\nPlain daily body\n');
  core.options={...options,folder:dailyFolder.path,format:'YYYY-MM-DD dddd',template:drawing.path};
  tpl.settings={...settings,templates_folder:f.folder+'/Templates',ignore_folders_on_creation:[],folder_templates:[],file_templates:[]};
  app.saveLocalStorage('templater-local-settings',{...local,trigger_on_file_creation:true});
  const created=app.vault.on('create',file=>{if(file.extension&&file.path.startsWith(dailyFolder.path+'/'))f.files.push(file)});f.restores.push(()=>app.vault.offref(created));
  unrelatedDateHolders.add((await f.note('Inference baseline Date',dateFrontmatter)).path);
  await f.until(()=>types.getPropertyInfo(inferenceField).widget==='date','Native Date hint restored before measured creation');
  await p.index.sourceAcquisition.flush();await f.ready();const fullBuilds=p.index.getSemanticPreparationDiagnostics().fullBuilds;
  const inventories=p.startupDiagnostics.snapshot().sessionWork.sourceInventoryPasses;
  const environmentBefore=JSON.stringify(p.index.sourceAcquisition.getRecoveryDiagnostics().environmentChange),acquisition=p.index.sourceAcquisition,originalAcquire=acquisition.acquire,acquireDescriptor=Object.getOwnPropertyDescriptor(acquisition,'acquire'),unrelatedAcquired=new Set();
  const observedAcquire=function(file,...args){if(unrelatedDateHolders.has(file.path))unrelatedAcquired.add(file.path);return originalAcquire.call(this,file,...args)};
  acquisition.acquire=observedAcquire;f.restores.push(()=>{if(acquisition.acquire===observedAcquire){if(acquireDescriptor)Object.defineProperty(acquisition,'acquire',acquireDescriptor);else delete acquisition.acquire}});
  const button=(content,key)=>[...content.querySelectorAll('button')].find(item=>item.getAttribute('aria-label')===p.translator(key)||item.textContent===p.translator(key));
  const modal=()=>[...doc.querySelectorAll('.modal')].find(item=>button(item,'ghost.createDailyNote'));
  const completeInSidecar=async(content)=>{
   await f.until(()=>content.querySelector('.kplex-creation-completion-row select')||content.querySelector('select'),'Native completion selector');
   const select=content.querySelector('.kplex-creation-completion-row select')??content.querySelector('select');
   f.check([...select.options].some(item=>item.value==='sidecar'),'Sidecar completion available');
   select.value='sidecar';select.dispatchEvent(new doc.defaultView.Event('change',{bubbles:true}));await f.wait(40);
  };
  const verify=async(path,drawingExpected=true)=>{
   await f.until(()=>app.vault.getFileByPath(path),'Native daily file created');const file=app.vault.getFileByPath(path);
   await f.until(()=>p.sidecarLeaves.get(leaf)?.view.file===file&&p.sidecarLeaves.get(leaf)?.view.getViewType()===(drawingExpected?'excalidraw':'markdown'),'Exact daily editor representation');
   const body=await app.vault.read(file);f.check(!body.includes('<%'),'Actual Templater expressions evaluated');
   f.check(body.includes(drawingExpected?'Rendered day: '+file.basename:'Plain daily body'),'Configured template applied');
   f.check(unrelated.view.file===source&&unrelated.view.getViewType()==='markdown','Unrelated document representation changed');
   await f.ready();samples.push({pathMatched:true,templateEvaluated:true,view:drawingExpected?'excalidraw':'markdown'});return file;
  };
  // Ordinary placeholders keep their existing choices and opening the dialog creates nothing.
  const ordinary=p.index.get('Not a daily note');f.check(ordinary&&!ordinary.file,'Ordinary placeholder');
  await p.createGhostNote(ordinary,false,false,leaf);await f.until(()=>doc.querySelector('.kplex-materialize-folder-row'),'Ordinary materialization dialog');
  f.check(!modal(),'Non-date placeholder offered daily creation');
  await f.click(button(doc.querySelector('.modal'),'common.cancel'));
  const ghost=p.index.get(name);f.check(ghost&&!ghost.file,'Daily placeholder');
  p.notifyNavigation(ghost.path,leaf);await f.until(()=>p.documentSession(leaf)?.centerPath===ghost.path,'Daily placeholder centered');
  const thought=()=>[...leaf.view.containerEl.querySelectorAll('.kplex-thought[data-kplex-path]')].find(node=>node.getAttribute('data-kplex-path')===ghost.path);
  await f.until(()=>thought()?.querySelector('.kplex-thought-label'),'Daily placeholder label mounted');
  await f.doubleClick(thought().querySelector('.kplex-thought-label'));await f.until(()=>modal(),'Double-click daily materialization option');
  const content=modal();f.check(content.textContent.includes(dailyFolder.path+'/'+name+'.md'),'Daily action destination is visible');
  await completeInSidecar(content);await f.click(button(content,'ghost.createDailyNote'));
  const createdDaily=await verify(dailyFolder.path+'/'+name+'.md');
  f.check(p.index.get(ghost.path)?.file||p.index.get(dailyFolder.path+'/'+name+'.md')?.file,'Placeholder materialized');
  await app.vault.delete(createdDaily);await f.ready();
  await f.until(()=>p.documentSession(leaf)?.centerPath===name,'Deleted daily center follows its unresolved spelling');
  const deleted=p.index.get(name);f.check(deleted&&!deleted.file&&deleted.neighbours.has(source.path),'Deleted daily placeholder retains its parent');
  f.check(p.index.get(source.path).neighbours.has(name),'Surviving parent retains its deleted daily child');
  // Calendar uses its actual confirmation shell and the same native creator, not a fake template.
  const calendarDate='2032-03-06',surface=f.surface(leaf);
  await p.navigateDailyNote(calendarDate,[],leaf,surface,()=>true);const calendar=[...p.actionDialogs.keys()].find(item=>item.path?.includes('2032-03-06'));f.check(calendar,'Calendar confirmation');dialogs.push(calendar);
  await completeInSidecar(calendar.contentEl);await f.click(button(calendar.contentEl,'pins.createAction'));
  await verify(dailyFolder.path+'/'+window.moment(calendarDate).format('YYYY-MM-DD dddd')+'.md');
  // Today retains the identical opening semantics.
  await p.updatePeriodicPin('day',{useDailyNotes:true},true);const today=p.readSavedPins().find(item=>item.period==='day');f.check(today?.state==='missing','Owned Today destination');
  p.openPeriodicPinCreation(today.id,today.path,leaf,()=>true,surface);const prompt=[...p.actionDialogs.keys()].find(item=>item.pinId===today.id);f.check(prompt,'Today confirmation');dialogs.push(prompt);
  await completeInSidecar(prompt.contentEl);await f.click(button(prompt.contentEl,'pins.createAction'));await verify(today.path);
  // A normal Markdown template is not promoted merely because its filename is a date.
  core.options={...core.options,template:plain.path};const plainDate='2032-03-07';
  await p.navigateDailyNote(plainDate,[],leaf,surface,()=>true);const plainPrompt=[...p.actionDialogs.keys()].find(item=>item.path?.includes(plainDate));f.check(plainPrompt,'Plain daily confirmation');dialogs.push(plainPrompt);
  await completeInSidecar(plainPrompt.contentEl);await f.click(button(plainPrompt.contentEl,'pins.createAction'));
  await verify(dailyFolder.path+'/'+window.moment(plainDate).format('YYYY-MM-DD dddd')+'.md',false);
  f.check(p.index.getSemanticPreparationDiagnostics().fullBuilds===fullBuilds,'Daily creation triggered a full graph rebuild');
  f.check(p.startupDiagnostics.snapshot().sessionWork.sourceInventoryPasses===inventories,'Daily creation/deletion triggered a vault-wide source inventory');
  f.check(unrelatedAcquired.size===0,'Native inferred-widget changes rechecked unrelated Date holders: '+unrelatedAcquired.size);
  f.check(JSON.stringify(p.index.sourceAcquisition.getRecoveryDiagnostics().environmentChange)===environmentBefore,'Native inferred-widget changes were treated as a global assignment change');
  f.check(p.index.publicApiCoverage().scope==='global'&&!p.index.publicApiCoverage().pending,'Settled daily creation must retain complete global coverage');
  return{samples,ordinaryPlaceholderUnchanged:true,trustedDoubleClick:true,deletedPlaceholderReconnected:true,unrelatedDateHolders:unrelatedDateHolders.size,unrelatedDateAcquisitions:unrelatedAcquired.size,callbackCount:app.workspace[key].calls.length,additionalFullBuilds:0,additionalSourceInventories:0,templaterVersion:tpl.manifest.version};
 }catch(error){
  const p=f.p;c.progress={...c.progress,dailyFailure:{source:p.index.sourceAcquisition.getRecoveryDiagnostics(),
   coordinator:{initial:p.initialIndexComplete,dirty:p.indexDirty,paths:[...p.dirtyMarkdownPaths],reasons:[...p.indexBacklogReasons],rebuildTask:Boolean(p.rebuildTask)},
   scheduler:p.index.getWorkPriorityDiagnostics(),activeScopes:[...p.index.semanticPreparationTasks.keys()],
   graph:{building:p.index.building,pendingStructural:p.index.pendingStructuralTasks,eagerMaintenance:Boolean(p.index.eagerGraphMaintenanceTask),pendingSources:[...p.index.sourceAcquisition.pendingGraphSources().keys()]},
   scopes:[...p.index.semanticScopes].map(([path,value])=>({path,state:value.state})),stage:samples.length}};
  throw error;
 }finally{
  for(const dialog of dialogs)dialog.close();
  try{await f.cleanup();}finally{
   if(dailyFolder&&app.vault.getFolderByPath(dailyFolder.path)===dailyFolder&&!dailyFolder.children.length)await app.vault.delete(dailyFolder,true);
   const parent=app.vault.getFolderByPath(f.folder);if(parent&&!parent.children.length)await app.vault.delete(parent,true);
  }
 }
}

if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Explicit disposable Small required');
const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
await runControlledProbe('daily-note-materialization',scenario,'c.fixture='+nativeBatch270.toString()+';c.sessions='+nativeDocumentSessions.toString()+';c.fixturePrefix="__kplex_daily_creation_";c.originalData='+JSON.stringify(readFileSync(join(target.pluginDir,'data.json'),'utf8'))+';c.originalEnabled='+JSON.stringify(readFileSync(join(target.config,'community-plugins.json'),'utf8'))+';',
 ['src/main.ts','src/ui/MaterializeGhostModal.ts','src/adapters/obsidian/dailyNoteNavigation.ts'],{maximumMs:360000});
