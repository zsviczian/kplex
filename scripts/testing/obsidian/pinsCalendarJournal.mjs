/** Exact-build native pins/calendar/journal acceptance in disposable Small. Trusted Electron
 * input exercises actual registered canvases, native menus and dialogs. Owned files, settings,
 * Core Daily Notes options, themes, geometry and sessions are independently restored. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {runControlledProbe} from './controlledProbe.mjs';
import {nativeBatch270} from './nativeBatch270.mjs';
import {nativeDocumentSessions} from './nativeDocumentSessions.mjs';
import {validateTarget} from './runner.mjs';
import {acquireHostLock} from './hostLock.mjs';

/** The only data writes belong to the fixture-owned journal and its original disposable settings. */
async function scenario(app,c){
 const f=c.fixture(app,c),samples=[],modals=[],folders=[];
 let daily,options,initialLight;const captures=[];
 try{
  await f.initialize();const p=f.p;daily=app.internalPlugins.getPluginById('daily-notes')?.instance;f.check(daily,'Enabled Core Daily Notes prerequisite');options=daily.options;
  const year=await app.vault.createFolder(f.folder+'/2026');folders.push(year);
  const template=await f.note('Template','Calendar template marker\nTitle: {{title}}\nCreated: {{date:YYYY-MM-DD}}\n');
  daily.options={...options,folder:f.folder,format:'YYYY/YYYY-MM-DD',template:template.path};
  const previous=await f.note('2026/2026-11-03'),source=await f.note('2026/2026-11-07'),next=await f.note('2026/2026-11-12');
  const pins=[];for(let index=0;index<12;index++)pins.push(await f.note('Long saved pin '+index));
  const priorField=p.defaultOntologyField('parent'),nextField=p.defaultOntologyField('child');
  Object.assign(p.settings,{pinnedNodes:pins.map(file=>file.path),showDailyCalendar:true,dailyNoteLinkFields:{previous:priorField,next:nextField},periodicNoteAfterSaving:'return'});
  await p.saveSettings(false,false);p.index.notifyPresentation();const leaf=await f.canvas(source);await f.ready();
  const root=leaf.view.contentEl,doc=root.ownerDocument,session=p.documentSession(leaf),surface=f.surface(leaf);
  const nodes=()=>[...root.querySelectorAll('.kplex-pinned-chip')],toggle=()=>root.querySelector('.kplex-pin-edit-toggle');
  f.check(nodes().length===12&&toggle().getAttribute('aria-pressed')==='false'&&!root.querySelector('[data-reorder-handle],.kplex-pinned-remove'),'Pins must start compact and locked');
  /** Body input remains scrolling in both editing modes, with no navigation or saved-order change. */
  const scroll=async()=>{
   const bar=root.querySelector('.kplex-pinned-bar'),order=JSON.stringify(p.settings.pinnedNodes),center=session.centerPath,native=await f.focus(doc);
   bar.scrollLeft=0;const start=f.point(nodes()[1].querySelector('.kplex-pinned-open')),end={x:start.x-65,y:start.y};
   try{native.webContents.sendInputEvent({type:'mouseDown',...start,button:'left',clickCount:1});native.webContents.sendInputEvent({type:'mouseMove',...end,modifiers:['leftbuttondown']});native.webContents.sendInputEvent({type:'mouseUp',...end,button:'left',clickCount:1});await f.wait(100);}
   finally{native.webContents.sendInputEvent({type:'mouseUp',...end,button:'left',clickCount:1});}
   f.check(bar.scrollLeft>=55&&JSON.stringify(p.settings.pinnedNodes)===order&&session.centerPath===center,'Pin body scroll changed order or navigated');bar.scrollLeft=0;
  };
  await scroll();await f.click(toggle());await f.until(()=>root.querySelectorAll('[data-reorder-handle]').length===12,'Edit controls');await scroll();
  const order=JSON.stringify(p.settings.pinnedNodes),end=nodes()[2].getBoundingClientRect();
  await f.drag(nodes()[0].querySelector('[data-reorder-handle]'),{x:Math.round(end.right-2),y:Math.round(end.y+end.height/2)});await p.settingsWriteQueue;f.check(JSON.stringify(p.settings.pinnedNodes)!==order,'Enabled pin reorder did not persist');
  await f.click(nodes()[0].querySelector('.kplex-pinned-remove'));await f.until(()=>p.settings.pinnedNodes.length===11,'Enabled removal');await f.click(toggle());await f.until(()=>!root.querySelector('[data-reorder-handle],.kplex-pinned-remove'),'Locked controls hidden');
  samples.push({case:'pin edit mode',defaultLocked:true,bodyScrollBothModes:true,reorder:true,remove:true});

  /** Read the actual tracked native calendar, not a separately rendered test component. */
  const calendar=async(owner=leaf)=>{const content=owner.view.contentEl;await f.click(content.querySelector('.kplex-pin-calendar'));await f.until(()=>[...p.actionDialogs.keys()].some(modal=>modal.contentEl?.querySelector('[data-calendar-date]:enabled')),'Native calendar ready');const modal=[...p.actionDialogs.keys()].find(modal=>modal.contentEl?.querySelector('.kplex-calendar-picker'));modals.push(modal);return modal;};
  let picker=await calendar();f.check(picker.contentEl.querySelector('[data-calendar-date="2026-11-03"]').classList.contains('has-note'),'Nested historical daily note missing from calendar');
  await f.click(picker.contentEl.querySelector('[data-calendar-date="2026-11-03"]'));await f.until(()=>session.centerPath===previous.path,'Existing calendar date navigation');f.check(!app.vault.getFileByPath(f.folder+'/2026-11-03.md'),'Calendar created a duplicate flat note');
  p.notifyNavigation(source.path,leaf);await f.until(()=>session.centerPath===source.path,'Return to journal source');picker=await calendar();
  const missing=f.folder+'/2026/2026-11-05.md';await f.click(picker.contentEl.querySelector('[data-calendar-date="2026-11-05"]'));
  await f.until(()=>[...p.actionDialogs.keys()].some(modal=>modal.path===missing),'Missing-date confirmation');let creation=[...p.actionDialogs.keys()].find(modal=>modal.path===missing);modals.push(creation);
  await f.click(creation.contentEl.querySelector('button[aria-label="'+p.translator('common.cancel')+'"]'));f.check(!app.vault.getFileByPath(missing),'Cancel created a daily note');
  picker=await calendar();await f.click(picker.contentEl.querySelector('[data-calendar-date="2026-11-05"]'));await f.until(()=>[...p.actionDialogs.keys()].some(modal=>modal.path===missing),'Second explicit creation prompt');creation=[...p.actionDialogs.keys()].find(modal=>modal.path===missing);modals.push(creation);
  await f.click(creation.contentEl.querySelector('button[aria-label="'+p.translator('pins.createAction')+'"]'));await f.until(()=>!!app.vault.getFileByPath(missing)&&session.centerPath===missing,'Confirmed selected date creation');
  const created=app.vault.getFileByPath(missing);f.files.push(created);const body=await app.vault.read(created);c.progress={phase:'Core Daily Notes template observation',fixtureBody:body,selectedDay:'2026-11-05'};f.check(body.includes('Title: 2026/2026-11-05')&&body.includes('Created: '+window.moment().format('YYYY-MM-DD'))&&body.split('Calendar template marker').length===2&&!body.includes('{{'),'Core template did not preserve its selected title and native creation-date tokens');
  samples.push({case:'calendar',nestedExisting:true,cancelCreatesNothing:true,explicitHistoricalCreation:true,coreTemplateExpanded:true});

  p.notifyNavigation(source.path,leaf);await f.until(()=>session.centerPath===source.path,'Journal context source');await f.ready();
  const show=p.showKplexMenuAtPosition;p.showKplexMenuAtPosition=function(menu,...args){menu.setUseNativeMenu(false);return show.call(this,menu,...args)};f.restores.push(()=>{p.showKplexMenuAtPosition=show;});
  /** Open the actual shared node menu with native right-click input. */
  const context=async()=>{const element=root.querySelector('[data-kplex-path="'+source.path+'"]'),native=await f.focus(doc),xy=f.point(element);native.webContents.sendInputEvent({type:'mouseDown',...xy,button:'right',clickCount:1});native.webContents.sendInputEvent({type:'mouseUp',...xy,button:'right',clickCount:1});await f.until(()=>doc.querySelector('.menu'),'Native node menu');return[...doc.querySelectorAll('.menu-item')];};
  for(const view of ['classic','mindmap','wuxing']){
   f.check(await session.plexView.requestSelection(view),'Native view selection '+view);await f.until(()=>root.querySelector('[data-kplex-path="'+source.path+'"]'),'Journal node in '+view);
   await f.until(()=>p.publicCanvases.list().some(row=>row.attention===source.path&&row.visible&&row.viewId===view),'Committed native canvas definition '+view);
   const menu=await context(),item=menu.find(element=>element.textContent.trim()===p.translator('daily.linkPrevious'));f.check(item&&menu.some(element=>element.textContent.trim()===p.translator('daily.linkNext')),'Journal gap actions missing in '+view);await f.click(item);
   await f.until(()=>[...p.actionDialogs.keys()].some(modal=>modal.contentEl?.querySelector('.kplex-add-related-note-search input')),'Proposed journal link');
   const modal=[...p.actionDialogs.keys()].find(modal=>modal.contentEl?.querySelector('.kplex-add-related-note-search input'));modals.push(modal);
   f.check(modal.contentEl.textContent.includes(created.path)&&modal.contentEl.querySelector('.kplex-add-related-ontology-search input').value===priorField&&modal.contentEl.querySelector('.kplex-add-related-role-select').value==='parent','Nearest previous note/Parent ontology not preselected in '+view);modal.close();
   samples.push({case:'journal gap menu',view,preselectedHistoricalFile:true,rememberedParentField:true});
  }
  await session.plexView.requestSelection('classic');await f.until(()=>root.querySelector('[data-kplex-path="'+source.path+'"]'),'Compass source');
  await p.openDailyNoteGapLink(p.index.get(source.path),'previous',leaf,surface,()=>true);await f.until(()=>[...p.actionDialogs.keys()].some(modal=>modal.contentEl?.querySelector('.kplex-add-related-link-button')),'Reviewed journal link');
  let link=[...p.actionDialogs.keys()].find(modal=>modal.contentEl?.querySelector('.kplex-add-related-link-button'));modals.push(link);await f.click(link.contentEl.querySelector('.kplex-add-related-link-button'));await f.until(()=>!link.modalEl.isConnected,'Journal link saved');await f.ready();
  f.check(p.index.isConnected(p.index.get(source.path),created.path)&&!p.dailyNoteGapDirections(p.index.get(source.path)).includes('previous'),'Saved earlier connector did not suppress its action');
  await p.openDailyNoteGapLink(p.index.get(source.path),'next',leaf,surface,()=>true);await f.until(()=>[...p.actionDialogs.keys()].some(modal=>modal.contentEl?.querySelector('.kplex-add-related-note-search input')),'Next journal proposal');link=[...p.actionDialogs.keys()].find(modal=>modal.contentEl?.querySelector('.kplex-add-related-note-search input'));modals.push(link);
  f.check(link.contentEl.textContent.includes(next.path)&&link.contentEl.querySelector('.kplex-add-related-ontology-search input').value===nextField,'Next direction lost independent Child memory or nearest daily note');link.close();
  samples.push({case:'journal save',previousConnector:true,previousActionHidden:true,nextMemoryIndependent:true,previousNearestUpdated:true});

  initialLight=doc.body.classList.contains('theme-light');const native=await f.focus(doc);native.setContentSize(440,800);picker=await calendar();
  for(let index=0;index<2;index++){
   const light=doc.body.classList.contains('theme-light');await f.wait(150);await new Promise(done=>doc.defaultView.requestAnimationFrame(()=>doc.defaultView.requestAnimationFrame(done)));
   const background=doc.defaultView.getComputedStyle(picker.modalEl).backgroundColor,rgb=background.match(/[\d.]+/g)?.slice(0,3).map(Number);
   f.check(rgb&&(light?rgb.reduce((a,b)=>a+b)>384:rgb.reduce((a,b)=>a+b)<384),'Native modal theme was not applied: '+JSON.stringify({light,background,classes:doc.body.className}));
   f.check(picker.contentEl.scrollWidth<=picker.contentEl.clientWidth+1,'Narrow native calendar horizontal overflow');
   const name='calendar-'+(light?'light':'dark')+'.png';require('node:fs').writeFileSync(require('node:path').join(c.reportDirectory,name),(await native.webContents.capturePage()).toPNG());captures.push(name);
   app.commands.executeCommandById('theme:toggle-light-dark');await f.until(()=>{c.pinState={classes:doc.body.className,background:doc.defaultView.getComputedStyle(picker.modalEl).backgroundColor};return doc.body.classList.contains('theme-light')!==light&&c.pinState.background!==background},'Native calendar theme styles');
  }picker.close();native.setContentSize(1100,900);
  const popout=await f.canvas(source,'k-plex-react-view','window');picker=await calendar(popout);f.check(picker.contentEl.ownerDocument===popout.view.contentEl.ownerDocument,'Calendar borrowed the main document');
  await f.click(picker.contentEl.querySelector('[data-calendar-date="2026-11-12"]'));await f.until(()=>p.documentSession(popout).centerPath===next.path,'Popout daily navigation');f.check(session.centerPath===source.path,'Popout calendar retargeted main canvas');
  picker=await calendar(popout);const popoutNative=await f.focus(popout.view.contentEl.ownerDocument);require('node:fs').writeFileSync(require('node:path').join(c.reportDirectory,'calendar-popout.png'),(await popoutNative.webContents.capturePage()).toPNG());captures.push('calendar-popout.png');picker.close();popout.detach();await f.workspace.revealLeaf(leaf);
  p.settings.showDailyCalendar=false;await p.saveSettings(false,true);await f.until(()=>!root.querySelector('.kplex-pin-calendar'),'Calendar visibility setting');
  samples.push({case:'native ownership and appearance',narrow:true,themes:true,popoutIndependent:true,hideSetting:true});return{samples,captures,limitations:'Windows Electron native input and DOM-menu backend; physical touch and macOS remain separate acceptance.'};
 }finally{
  const errors=[],clean=async(name,work)=>{try{await work()}catch(error){errors.push(name+': '+error)}};
  for(const modal of modals)await clean('dialog',()=>modal?.close());
  if(daily&&options)daily.options=options;
  if(initialLight!==undefined&&document.body.classList.contains('theme-light')!==initialLight)await clean('theme',()=>app.commands.executeCommandById('theme:toggle-light-dark'));
  for(const file of app.vault.getFiles())if(file.path.startsWith(f.folder+'/')&&!f.files.includes(file))f.files.push(file);
  for(const file of [...f.files].reverse())if(app.vault.getFileByPath(file.path)===file)await clean('owned note',()=>app.vault.delete(file,true));
  for(const folder of folders.reverse())if(app.vault.getFolderByPath(folder.path)===folder&&!folder.children.length)await clean('owned subfolder',()=>app.vault.delete(folder,true));
  await clean('fixture',()=>f.cleanup());await clean('appearance bytes',()=>app.vault.adapter.write(app.vault.configDir+'/appearance.json',c.originalAppearance));
  if(errors.length)throw Error(errors.join('; '));
 }
}

const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Explicit disposable Small required');
const userData=process.env.KPLEX_OBSIDIAN_USER_DATA??(process.platform==='win32'?join(process.env.APPDATA,'obsidian'):process.platform==='darwin'?join(homedir(),'Library','Application Support','obsidian'):join(homedir(),'.config','obsidian'));
const lock=acquireHostLock({userDataPath:userData});
try{
 const originalAppearance=readFileSync(join(target.config,'appearance.json'),'utf8');
 const definitions='c.fixturePrefix="__kplex_daily_calendar_";c.sessions='+nativeDocumentSessions.toString()+';c.fixture='+nativeBatch270.toString()+';c.reportDirectory='+JSON.stringify(process.env.KPLEX_HOST_REPORT_DIR)+';c.originalData='+JSON.stringify(readFileSync(join(target.pluginDir,'data.json'),'utf8'))+';c.originalEnabled='+JSON.stringify(readFileSync(join(target.config,'community-plugins.json'),'utf8'))+';c.originalAppearance='+JSON.stringify(originalAppearance)+';';
 await runControlledProbe('pins-calendar-journal',scenario,definitions,['src/ui/PinnedNodeBar.tsx','src/ui/components/ReorderableList.tsx','src/ui/components/HorizontalDragScroll.tsx','src/ui/DailyNoteCalendarModal.ts','src/ui/features/CalendarDatePicker.tsx','src/core/plex/calendarDates.ts','src/adapters/obsidian/dailyNoteNavigation.ts','src/adapters/obsidian/dailyNotes.ts','src/ui/NewRelatedNoteModal.ts','src/ui/CreatePeriodicNoteModal.ts','src/main.ts','src/settings.ts','src/ui/App.tsx','src/ui/PlexGraph.tsx'],{maximumMs:420000});
 if(readFileSync(join(target.config,'appearance.json'),'utf8')!==originalAppearance)throw Error('Appearance bytes differ');
}finally{lock.release()}
