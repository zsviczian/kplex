/** Actual parent/child composers and shared native controls. Finite writes establish routing and
 * lifetime behavior; native Obsidian owns filesystem/cache/paint acceptance separately. */
import assert from 'node:assert/strict';
import test from 'node:test';

test('connection property picker shares ontology browsing, descriptions and visible create/edit glyphs',async()=>{
 assert.equal(await authoringScenario(`
 p.settings.ontologyDescriptions.Child='A deliberately long relationship description that belongs under its name.';
 p.addOntologyToConnection=async(...args)=>{links.push(args);return {state:'saved-published',page:target}};
 const modal=new M.RelationModal(p,{mode:'relink',purpose:'ontology-add',origin,fixedTarget:target,semanticRole:'child',initialField:'Child'});modal.open();
 await waitFor(()=>field(modal));const input=field(modal),detail=modal.contentEl.querySelector('.kplex-relationship-selection-detail');
 check(input.value==='Child'&&!input.value.includes('—'),'Selection contains description text');
 check(detail.textContent===p.settings.ontologyDescriptions.Child&&detail.getBoundingClientRect().top>=input.getBoundingClientRect().bottom,'Selected description is not below the name');
 check(parseFloat(getComputedStyle(detail).fontSize)<parseFloat(getComputedStyle(input).fontSize),'Description is not smaller print');
 const create=button(modal,'ontology.createField');check(create?.querySelector('svg')&&modal.contentEl.querySelector('.kplex-edit-selected-ontology svg'),'Ontology action glyph missing');
 check(!create.hasAttribute('title')&&!create.hasAttribute('aria-label')&&create.hasAttribute('aria-labelledby'),'Competing creation tooltips');
 check(modal.titleEl.textContent===t('relation.addOntologyTitle')&&modal.contentEl.textContent.includes(t('relation.addOntologyHelp')),'Add property operation is unexplained');
 modal.contentEl.querySelector('.kplex-fuzzy-disclosure').click();await waitFor(()=>document.querySelector('.kplex-ontology-results'));
 check(document.querySelector('.kplex-ontology-results').textContent.includes(p.settings.ontologyDescriptions.Child),'Browse lost descriptions');modal.close();check(!links.length,'Inspection changed a connection');
 `,{styles:true}),true);
});

test('Markdown export gives the native ontology dropdown remaining width and centers its Cancel glyph',async()=>{
 assert.equal(await authoringScenario(`
 const node={id:'root',text:'[[Root]]',label:'Root',x:0,y:0,side:1,reference:false,expanded:true,canExpand:false,partial:false};
 p.app.vault.adapter={};
 const modal=new M.MindMapMarkdownModal(p.app,{snapshot:{root:'root',nodes:[node],links:[],omitted:0,limited:false},sourceScope:host,current:()=>true,closed:()=>{}});modal.open();
 for(const locale of ['en','de'])for(const font of [14,18])for(const width of [680,350]){modal.modalEl.style.width=width+'px';document.body.style.setProperty('--font-ui-medium',font+'px');
 const row=modal.contentEl.querySelector('.kplex-form-select-row'),select=row.querySelector('select'),desc=row.querySelector('.setting-item-description');
 row.querySelector('.setting-item-name').textContent=M.createTranslator(locale)('export.markdown.ontology');
 const info=row.querySelector('.setting-item-info');check(info.scrollWidth<=info.clientWidth+1,'Export label overlaps the selector');
 const r=row.getBoundingClientRect(),s=select.getBoundingClientRect();check(Math.abs(r.right-s.right)<2&&s.width>=r.width*.6,'Export selector leaves unused width');
 check(desc.getBoundingClientRect().top>=s.bottom,'Export help squeezes the dropdown');
 const cancel=button(modal,'common.cancel'),glyph=cancel.querySelector('svg').getBoundingClientRect(),b=cancel.getBoundingClientRect();
 check([...modal.contentEl.querySelectorAll('.kplex-modal-action-row button')].every(action=>Math.abs(action.getBoundingClientRect().top-b.top)<1),'Export footer actions wrap onto different rows');
 check(Math.abs((glyph.left+glyph.right)-(b.left+b.right))<1&&Math.abs((glyph.top+glyph.bottom)-(b.top+b.bottom))<1,'Cancel glyph not centered');
 }modal.close();
 `,{styles:true}),true);
});
import {authoringScenario} from './support/authoring278Browser.mjs';

test('journal invocation restores a Parent field and retains a separate memory callback without linking on open',async()=>{
 assert.equal(await authoringScenario(`
 let remembered='';const modal=new M.NewRelatedNoteModal(p,origin,'parent',undefined,leaf,target,{initialOntology:'Parent',additiveOnly:true,onOntologySelected:async field=>{remembered=field}});modal.open();
 await waitFor(()=>field(modal));check(field(modal).value==='Parent'&&modal.contentEl.querySelector('.kplex-add-related-role-select').value==='parent','Journal field/role was not restored');
 check(name(modal).value===p.index.titleFor(target)&&links.length===0&&!remembered,'Opening a proposed daily link wrote data');
 button(modal,'addRelated.link').click();await waitFor(()=>links.length===1);check(remembered==='Parent','Chronological memory callback did not receive the confirmed field');
 modal.close();
 `),true);
});

for(const drawing of [false,true])test('linking footer has two aligned compact icon actions without reserved creation space: '+drawing,async()=>{
 assert.equal(await authoringScenario(`
 p.isExcalidrawAvailable=()=>${drawing};const modal=openComposer(target);await waitFor(()=>modal.contentEl.querySelector('.kplex-add-related-link-button'));
 const footer=modal.contentEl.querySelector('.kplex-form-actions'),buttons=[...footer.querySelectorAll('button')];check(buttons.length===2,'Linking keeps only Cancel/Link');
 const [cancel,link]=buttons.map(button=>button.getBoundingClientRect()),area=modal.contentEl.querySelector('.kplex-add-related-action-area').getBoundingClientRect(),icon=buttons[1].querySelector('.kplex-icon').getBoundingClientRect();
 check(Math.abs(cancel.top-link.top)<.5&&Math.abs(cancel.width-link.width)<.5&&Math.abs(cancel.height-link.height)<.5,'Cancel/Link dimensions differ');
 check(link.left-cancel.right<=9&&Math.abs(area.width-link.width)<.5,'Missing create buttons leave a reserved gap');
 check(Math.abs((icon.left+icon.right)-(link.left+link.right))<1&&Math.abs((icon.top+icon.bottom)-(link.top+link.bottom))<1,'Link icon is not centered');
 check(!modal.contentEl.querySelector('.kplex-add-related-type-button'),'Hidden creation placeholders remain');modal.close();
 `,{styles:true}),true);
});

test('each creation direction restores only its own remembered ontology field',async()=>{
 assert.equal(await authoringScenario(`
 const roles=['parent','child','left','right','previous','next'];
 for(const role of roles){await p.assignFieldToOntology('Remembered '+role,role);p.settings.relationDefaultFields[role]='Remembered '+role;}
 for(const role of roles){
  const modal=new M.NewRelatedNoteModal(p,origin,role,undefined,leaf);modal.open();await waitFor(()=>field(modal));
  check(modal.contentEl.querySelector('.kplex-add-related-role-select').value===role&&field(modal).value==='Remembered '+role,'Gate default crossed a category: '+role);
  for(const next of roles){reactInput(modal.contentEl.querySelector('.kplex-add-related-role-select'),next);await waitFor(()=>field(modal).value==='Remembered '+next);}
  modal.close();
 }
 `),true);
});

test('remembered creation CTA remains marked before entering a name and follows the shortcut default',async()=>{
 assert.equal(await authoringScenario(`
 p.isExcalidrawAvailable=()=>true;
 for(const kind of ['markdown','excalidraw']){
  p.settings.newNodeDefaultType=kind;const modal=openComposer();await waitFor(()=>name(modal));
  const actions=[...modal.contentEl.querySelectorAll('.kplex-add-related-type-button')],expected=actions[kind==='markdown'?0:1];
  check(expected.disabled&&expected.classList.contains('mod-cta')&&expected.dataset.kplexPrimaryAction==='true','Remembered native CTA disappears while disabled: '+kind);
  check(actions.filter(action=>action.classList.contains('mod-cta')).length===1&&!actions[2].classList.contains('mod-cta'),'Only the remembered file type is primary');
  reactInput(name(modal),'New valid name');await waitFor(()=>!expected.disabled);
  check(expected.classList.contains('mod-cta')&&expected.getAttribute('aria-keyshortcuts').includes('Enter'),'Enabled CTA differs from keyboard default');modal.close();
 }
 `,{styles:true}),true);
});

for(const width of [360,760])test('periodic pin text fields keep intrinsic vertical size at '+width+'px',async()=>{
 assert.equal(await authoringScenario(`
 p.previewPeriodicPin=period=>({path:'Calendar/'+period+'.md',state:'missing'});
 const tab=new M.KplexSettingTab(p.app,p),settingsHost=document.body.createDiv();settingsHost.style.width='100%';
 for(const period of ['day','week','month']){
  const row=new M.Setting(settingsHost),release=tab.mountPeriodicPin(row,period);
  for(const input of row.settingEl.querySelectorAll('input[type=text]')){
   const field=input.closest('.setting-item'),info=field.querySelector('.setting-item-info'),control=field.querySelector('.setting-item-control'),label=info.getBoundingClientRect(),rect=input.getBoundingClientRect(),bounds=field.getBoundingClientRect();
   check(getComputedStyle(info).flexBasis==='auto'&&getComputedStyle(control).flexBasis==='auto','Compact horizontal flex basis must not become a stacked field height');
   check(label.bottom<=rect.top&&rect.top-label.bottom<40&&bounds.height<140,'Periodic field has excessive vertical space '+JSON.stringify({height:bounds.height,gap:rect.top-label.bottom}));
   check(rect.width>=bounds.width*.95,'Periodic field must fill the row');
  }
  release();row.settingEl.remove();
 }
 `,{styles:true,width}),true);
});

test('all native form shells share the keyboard viewport lease and release it across dismissal/reopen',async()=>{
 assert.equal(await authoringScenario(`
 document.body.classList.add('is-mobile');
 const viewport=new EventTarget(),live=new Map(),add=viewport.addEventListener.bind(viewport),remove=viewport.removeEventListener.bind(viewport),listenerCount=()=>[...live.values()].reduce((sum,set)=>sum+set.size,0);
 Object.assign(viewport,{offsetLeft:0,offsetTop:0,width:390,height:780});
 viewport.addEventListener=(type,listener)=>{if(!live.has(type))live.set(type,new Set());live.get(type).add(listener);add(type,listener)};viewport.removeEventListener=(type,listener)=>{remove(type,listener);live.get(type)?.delete(listener)};
 Object.defineProperty(window,'visualViewport',{configurable:true,value:viewport});
 const nativeShape=new CSSStyleSheet();nativeShape.replaceSync('body>.modal{display:flex;flex-direction:column}.modal-title{flex:none}');document.adoptedStyleSheets=[...document.adoptedStyleSheets,nativeShape];
 const parent={...origin,path:'folder:Folder',file:null,isFolder:true,name:'Folder'};
 for(const create of [()=>new M.CreateFolderNoteModal(p,parent,leaf,{},true),()=>new M.NewRelatedNoteModal(p,origin,'child',undefined,leaf),()=>new M.CreatePeriodicNoteModal(p,'periodic:day','Today.md',leaf,()=>true,()=>{}),()=>new M.ExternalFileImportBatchModal(p,origin,{files:[new File(['one'],'One.md')],directory:false},'child',leaf,()=>true,()=>{})]){
   const modal=create(),baseline=listenerCount(),setProps=modal.modalEl.setCssProps;let updates=0;modal.modalEl.setCssProps=function(values){if('--kplex-visible-height' in values)updates++;return setProps.call(this,values)};modal.open();await waitFor(()=>modal.contentEl.querySelector('input,select,button'));
   check(modal.modalEl.classList.contains('kplex-mobile-fullscreen-modal')&&updates===1,'Shared mobile shell was bypassed or duplicated: '+modal.constructor.name+' / '+updates);
   viewport.height=320;viewport.offsetTop=24;viewport.dispatchEvent(new Event('resize'));
   check(updates===2&&modal.modalEl.style.getPropertyValue('--kplex-visible-height')==='320px'&&modal.modalEl.style.getPropertyValue('--kplex-visible-top')==='24px','Keyboard viewport was not applied exactly once');
   const content=modal.contentEl;check(getComputedStyle(content).overflowY==='auto','Keyboard-sized content cannot scroll');
   content.scrollTop=content.scrollHeight;const buttons=[...content.querySelectorAll('.kplex-form-actions button')];const last=buttons.at(-1);if(last)check(last.getBoundingClientRect().bottom<=content.getBoundingClientRect().bottom+1,'Actions cannot be reached by scrolling');
   modal.close();await waitFor(()=>listenerCount()===baseline);check(!modal.modalEl.classList.contains('kplex-mobile-fullscreen-modal'),'Viewport listener leaked on dismissal');
   viewport.height=780;viewport.dispatchEvent(new Event('resize'));check(updates===2&&modal.modalEl.style.getPropertyValue('--kplex-visible-height')==='320px','Retired modal received viewport work');
   modal.open();await waitFor(()=>modal.contentEl.querySelector('button'));check(updates===3&&modal.modalEl.style.getPropertyValue('--kplex-visible-height')==='780px','Reopened modal did not reacquire exactly one viewport lease');modal.close();await waitFor(()=>listenerCount()===baseline);
 }
 `,{styles:true,width:390,height:800}),true);
});

for(const width of [390,1000])for(const theme of ['theme-light','theme-dark'])for(const locale of ['en','de'])test(`shared creation form geometry, typography and action ownership (${width}px, ${theme}, ${locale})`,async()=>{
 assert.equal(await authoringScenario(`
 document.body.className=${JSON.stringify(theme)};
 p.translator=M.createTranslator(${JSON.stringify(locale)});
 p.drawingTemplateOptions=()=>({root:'Templates',selected:'Templates/Drawing.md',files:[{path:'Templates/Drawing.md'}]});
 p.isExcalidrawAvailable=()=>true;p.settings.folderCreationTab='note';
 const modal=new M.CreateFolderNoteModal(p,{...origin,path:'folder:Folder',file:null,isFolder:true,name:'Folder'},leaf,{},true);modal.open();
 await waitFor(()=>modal.contentEl.querySelectorAll('select').length===2&&modal.contentEl.querySelector('[role="tab"][id$="tab-folder"]'));
 const form=modal.contentEl.getBoundingClientRect(),note=modal.nameInput.getBoundingClientRect();
 check(note.width>=form.width*.95,'Note name is not full width '+JSON.stringify({note:note.width,form:form.width}));
 const options=[...modal.contentEl.querySelectorAll('.kplex-form-option')];check(options.length===2,'Completion and template must share labelled selects');
 const selects=options.map(row=>row.querySelector('select')),styles=selects.map(select=>getComputedStyle(select));
 equal(styles.map(style=>[style.fontFamily,style.fontSize,style.height]),[...Array(2)].map(()=>[styles[0].fontFamily,styles[0].fontSize,styles[0].height]),'Option typography or height differs');
 const labelStyles=options.map(row=>getComputedStyle(row.querySelector('label')));equal(labelStyles.map(style=>[style.fontFamily,style.fontSize]),[...Array(2)].map(()=>[labelStyles[0].fontFamily,labelStyles[0].fontSize]),'Paired labels must match while native control typography stays host-owned');
 const bounds=selects.map(select=>select.getBoundingClientRect());check(Math.abs(bounds[0].left-bounds[1].left)<1&&Math.abs(bounds[0].width-bounds[1].width)<1,'Dropdown alignment differs');
 const actions=modal.contentEl.querySelector('.kplex-form-actions'),footer=actions.getBoundingClientRect();
 check(bounds.every(rect=>rect.bottom<footer.top-8),'A dropdown overlaps the footer divider');
 check(!modal.contentEl.querySelector('button[title]'),'A native title can stack tooltips');
 for(const action of actions.querySelectorAll('button')){check(action.classList.contains('kplex-icon-action')&&action.getAttribute('aria-label')&&action.querySelector('svg'),'Footer action bypasses shared accessible icons');}
 modal.contentEl.querySelector('[role="tab"][id$="tab-folder"]').click();await waitFor(()=>!modal.tabPanels.folder.hidden);
 const subfolder=modal.tabPanels.folder.querySelector('input'),rect=subfolder.getBoundingClientRect(),label=subfolder.closest('.setting-item').querySelector('.setting-item-name').getBoundingClientRect();
 check(rect.width>=form.width*.95,'Subfolder name is not full width');check(label.bottom<=rect.top,'Subfolder label is not above the field');modal.close();
 `,{styles:true,width}),true);
});

test('imports expose every relationship direction through the same selected-field control',async()=>{
 assert.equal(await authoringScenario(`
 for(const role of ['parent','child','left','right','previous','next']){
   const before=links.length,batch=new M.ExternalFileImportBatchModal(p,origin,{files:[new File(['one'],role+'.md')],directory:false},'child',leaf,()=>true,()=>{});
   batch.open();await waitFor(()=>batch.ready&&batch.contentEl.querySelector('.kplex-add-related-role-select'));
   reactInput(batch.contentEl.querySelector('.kplex-add-related-role-select'),role);await waitFor(()=>batch.roleFilter===role);
   check(batch.contentEl.querySelector('.kplex-add-related-ontology-search .kplex-search-icon'),'Shared ontology glyph missing');
   check(batch.contentEl.querySelector('.kplex-fuzzy-disclosure')&&batch.contentEl.querySelector('.kplex-edit-selected-ontology'),'Import has a reduced search-only picker');
   button(batch,'fileImport.importAll').click();await waitFor(()=>!batch.modalEl.isConnected);
   check(links.length===before+1&&links.at(-1)[1]===role,'Import locked the drag default: '+role);
 }
 `),true);
});

test('import selected ontology editing and parent close share exact child lifetime',async()=>{
 assert.equal(await authoringScenario(`
 const batch=new M.ExternalFileImportBatchModal(p,origin,{files:[new File(['one'],'One.md')],directory:false},'child',leaf,()=>true,()=>{});
 batch.open();await waitFor(()=>batch.ready&&batch.contentEl.querySelector('.kplex-edit-selected-ontology'));
 const edit=batch.contentEl.querySelector('.kplex-edit-selected-ontology');check(!edit.hasAttribute('title')&&!edit.hasAttribute('aria-label')&&edit.getAttribute('aria-labelledby'),'Shared edit has competing tooltip sources');edit.click();
 const child=batch.ontologyEditor.dialog;check(child&&child.fieldName===batch.ontology,'Import opened a different ontology');batch.close();
 check(!child.modalEl.isConnected,'Child survived import retirement');await child.save?.();check(writes.length===0&&links.length===0,'Retired import editor wrote data');
 `),true);
});

for(const linking of [false,true])test('selected ontology editor preserves '+(linking?'linking':'creation')+' drafts, exact pair endpoint and synchronous focus ownership',async()=>{
 assert.equal(await authoringScenario(`
 await p.assignFieldToOntology('Child','child','Parent');
 const modal=openComposer(${linking?'target':'undefined'});await waitFor(()=>field(modal));
 if(!${linking}){reactInput(name(modal),'My draft');const input=modal.contentEl.querySelector('.kplex-folder-path-input input');reactInput(input,'Folder');}
 await new Promise(r=>setTimeout(r,0));const beforeName=name(modal).value,beforeField=field(modal).value,before=p.writes.length;
 window.focusOnNativeOpen=true;const edit=modal.contentEl.querySelector('.kplex-edit-selected-ontology');edit.click();
 const child=modal.ontologyEditor.dialog;check(child&&child.fieldName==='Child','Selected physical endpoint not opened');check(child.partner==='Parent'&&child.selected==='child','Role/pair incorrect');
 check(modal.canComplete()&&!modal.isSessionOpen(),'Synchronous nested focus retired the parent or allowed parent submit');
 button(child,'common.cancel').click();await waitFor(()=>modal.isSessionOpen());
 equal([name(modal).value,field(modal).value],[beforeName,beforeField],'Cancel replaced parent drafts');check(p.writes.length===before&&links.length===0,'Opening/cancelling wrote a connection or settings');check(document.activeElement===edit,'Focus did not return to exact edit control');
 edit.click();const saved=modal.ontologyEditor.dialog;input(saved.contentEl.querySelector('textarea'),'A revised field description');button(saved,'common.save').click();
 await waitFor(()=>!saved.modalEl.isConnected);check(modal.isSessionOpen(),'Saved child left parent invalid');equal([name(modal).value,field(modal).value],[beforeName,beforeField],'Save replaced unrelated drafts');check(p.settings.ontologyDescriptions.Child==='A revised field description','Description not saved');check(links.length===0,'Vocabulary save wrote a relationship');modal.close();
 `),true);
});

test('parent close and native migration retire ontology children and stale callbacks',async()=>{
 assert.equal(await authoringScenario(`
 for(const migrate of [false,true]){const modal=openComposer();await waitFor(()=>field(modal));modal.contentEl.querySelector('.kplex-edit-selected-ontology').click();const child=modal.ontologyEditor.dialog;check(child,'Child missing');const before=p.writes.length;
 if(migrate)emitMigration(host);else modal.close();check(!child.modalEl.isConnected&&!modal.modalEl.isConnected,'Nested modal survived retirement');await child.save?.();check(p.writes.length===before&&links.length===0,'Retired child wrote');}
 check(window.migrationListeners===0,'Migration subscriptions leaked');
 `),true);
});

test('folder creation has direct remembered tabs, separate drafts and no move action',async()=>{
 assert.equal(await authoringScenario(`
 const folderPage={...origin,path:'folder:Folder',file:null,isFolder:true,name:'Folder'};
 const open=()=>{const modal=new M.CreateFolderNoteModal(p,folderPage,leaf,{},true);modal.open();return modal};
 let modal=open();await waitFor(()=>modal.contentEl.querySelector('[role="tab"]'));
 check(modal.folderTab==='note'&&!modal.tabPanels.note.hidden,'Note creation should be the default without another click');
 check(!button(modal,'moveNode.move'),'Creation offered a move');
 input(modal.nameInput,'Note draft');modal.contentEl.querySelector('[role="tab"][id$="tab-folder"]').click();await waitFor(()=>!modal.tabPanels.folder.hidden);
 input(modal.tabPanels.folder.querySelector('input'),'Child');modal.contentEl.querySelector('[role="tab"][id$="tab-note"]').click();await waitFor(()=>!modal.tabPanels.note.hidden);
 check(modal.nameInput.value==='Note draft','Tab switch discarded note draft');
 modal.contentEl.querySelector('[role="tab"][id$="tab-folder"]').click();await waitFor(()=>!modal.tabPanels.folder.hidden);
 check(modal.tabPanels.folder.querySelector('input').value==='Child','Tab switch discarded folder draft');
 check(!button(modal,'folderActions.create').disabled,'Folder create disabled '+JSON.stringify({name:modal.folderName,valid:modal.canComplete(),invalidated:modal.invalidated,busy:modal.creating,folder:modal.nativeFolder?.path,notices}));button(modal,'folderActions.create').click();await waitFor(()=>!modal.modalEl.isConnected);check(folders.has('Folder/Child'),'Subfolder was not created');
 modal=open();await waitFor(()=>modal.contentEl.querySelector('[role="tab"]'));check(modal.folderTab==='folder'&&!modal.tabPanels.folder.hidden,'Last tab was not remembered');
 input(modal.tabPanels.folder.querySelector('input'),'Cancelled');modal.close();check(!folders.has('Folder/Cancelled'),'Cancel created a folder');
 `),true);
});

test('actual external import composer copies binary bytes once and retains the exact file after linking failure',async()=>{
 assert.equal(await authoringScenario(`
 const source=new File([new Uint8Array([0,255,13,10,128])],'Image.bin'),retained=[];let fail=true;
 p.linkNewRelatedFile=async(...args)=>{links.push(args);if(fail)throw Error('Expected link failure');return {state:'saved-pending',page:page(args[2])}};
 const modal=openComposer(undefined,{importSource:source,onImported:file=>retained.push(file),continuation:'return'});await waitFor(()=>name(modal));
 check(name(modal).value==='Image.bin','Incoming extension lost');reactInput(name(modal),'Renamed.bin');
 const importButton=button(modal,'fileImport.import');check(importButton&&!importButton.disabled,'Import confirmation unavailable');importButton.click();await waitFor(()=>modal.contentEl.querySelector('.kplex-add-related-recovery'));
 check(retained.length===1&&files.get('Renamed.bin')===retained[0],'Exact durable identity not retained');equal([...bytes.get(retained[0])],[0,255,13,10,128],'Binary bytes changed');equal([...new Uint8Array(await source.arrayBuffer())],[0,255,13,10,128],'External original changed');
 check(writes.filter(row=>row[0]==='binary').length===1,'Repeated copy');fail=false;button(modal,'addRelated.linkCreatedFile').click();await waitFor(()=>!modal.modalEl.isConnected);
 check(writes.filter(row=>row[0]==='binary').length===1&&links.length===2&&links.every(args=>args[2]===retained[0]),'Recovery imported a duplicate or linked another file');
 `),true);
});

test('one import form applies a common relation and retains exact copies across retry',async()=>{
 assert.equal(await authoringScenario(`
 const sources=[new File(['one'],'One.md'),new File([new Uint8Array([0,255])],'Two.bin')],batch=new M.ExternalFileImportBatchModal(p,origin,{files:sources,directory:false},'child',leaf,()=>true,()=>{});
 let fail=true;p.linkNewRelatedFile=async(...args)=>{links.push(args);if(fail)throw Error('Expected link failure');return {state:'saved-pending',page:page(args[2])}};
 batch.open();await waitFor(()=>batch.ready);check(batch.rows.length===2,'A dropped file disappeared');
 check(!button(batch,'fileImport.configure')&&!button(batch,'relationship.flip'),'Import needs a second configure step or offers owner reversal');
 check(batch.contentEl.querySelectorAll('.kplex-import-files input').length===2,'Names not directly editable');
 button(batch,'fileImport.importAll').click();await waitFor(()=>!batch.busy&&batch.rows[0].file);
 const first=batch.rows[0].file;check(writes.filter(row=>row[0]==='binary').length===1,'First copy not retained');
 fail=false;button(batch,'fileImport.importAll').click();await waitFor(()=>!batch.modalEl.isConnected);
 check(writes.filter(row=>row[0]==='binary').length===2,'Retry created a duplicate');check(links.filter(args=>args[2]===first).length===2,'Retry did not reuse exact file');
 check(links.every(args=>args[1]==='child'&&args[3]===batch.ontology),'Bulk imports used different relation or role');equal([...bytes.get(batch.rows[1].file)],[0,255],'Binary changed');
 `),true);
});

test('folder imports preserve nested and empty directories without ontology writes',async()=>{
 assert.equal(await authoringScenario(`
 const folderPage={...origin,path:'folder:Folder',file:null,isFolder:true,name:'Folder'};
 const file={name:'Note.md',isFile:true,isDirectory:false,file(done){done(new File(['# Note'],'Note.md'))}};
 const empty={name:'Empty',isDirectory:true,isFile:false,createReader(){return {readEntries(done){done([])}}}};
 const rootEntry={name:'Incoming',isDirectory:true,isFile:false,createReader(){let read=false;return {readEntries(done){done(read?[]:(read=true,[file,empty]))}}}};
 const batch=new M.ExternalFileImportBatchModal(p,folderPage,{files:[],directory:true,entries:[rootEntry]},'child',leaf,()=>true,()=>{});
 batch.open();await waitFor(()=>batch.ready);check(!batch.contentEl.querySelector('input[aria-label="'+t('addRelated.ontologyAria')+'"]'),'Folder import offered ontology');
 button(batch,'fileImport.importAll').click();await waitFor(()=>!batch.modalEl.isConnected);
 check(folders.has('Folder/Incoming/Empty')&&files.has('Folder/Incoming/Note.md'),'Hierarchy or empty directory lost');check(links.length===0,'Folder imports wrote ontology');
 `),true);
});

test('single import opens directly and cancellation copies nothing',async()=>{
 assert.equal(await authoringScenario(`
 const batch=new M.ExternalFileImportBatchModal(p,origin,{files:[new File(['one'],'One.md')],directory:false},'child',leaf,()=>true,()=>{});
 batch.open();await waitFor(()=>batch.ready);check(batch.contentEl.querySelector('.kplex-import-files input').value==='One.md','Single file has no direct filename');check(!button(batch,'fileImport.configure'),'Unnecessary configure step');batch.close();check(writes.length===0&&links.length===0,'Dismissal copied or linked');
 `),true);
});

test('flip confirmation has stable before/after previews and only Cancel and Save',async()=>{
 assert.equal(await authoringScenario(`
 let submissions=0,refreshes=0;const modal=new M.ReverseRelationshipModal(p.app,t,{owner:'Source.md',field:'Child',target:'Target.md',inverse:'Parent'},()=>true,async()=>{submissions++;return submissions===1?{state:'pending',stage:'replacement'}:{state:'reversed'}},async()=>{refreshes++;return true},()=>{});
 modal.open();check(modal.contentEl.querySelectorAll('.kplex-ownership-preview').length===2,'Before/after not both visible');check(modal.contentEl.querySelectorAll('button').length===2,'Confirmation has a redundant toggle or refresh');check(modal.contentEl.textContent.includes('Source.md')&&modal.contentEl.textContent.includes('Target.md'),'Endpoints missing');
 button(modal,'common.save').click();await waitFor(()=>!modal.busy);check(modal.pending&&submissions===1&&!button(modal,'common.save').disabled,'Pending work cannot be completed with Save');
 button(modal,'common.save').click();await waitFor(()=>!modal.modalEl.isConnected);check(submissions===2&&refreshes===1,'Save failed to observe pending work before retry');
 `),true);
});

test('periodic creation remembers its opening choice and Cancel creates nothing',async()=>{
 assert.equal(await authoringScenario(`
 let choice='return',created=0;const opened=[];
 p.createdNoteCompletionControl=(_leaf,options)=>{check(options.operation==='periodic','Periodic preference was shared with normal creation');return {value:choice,choices:['return','sidecar','tab','window'],onChange:value=>{choice=value}}};
 p.createPeriodicPinNote=async()=>{created++;return target};p.finishNewRelatedNode=async(...args)=>opened.push(args);
 const open=()=>{const modal=new M.CreatePeriodicNoteModal(p,'periodic:day','Today.md',leaf,()=>true,()=>{});modal.open();return modal};
 let modal=open();await waitFor(()=>modal.contentEl.querySelector('select'));reactInput(modal.contentEl.querySelector('select'),'window');await new Promise(r=>setTimeout(r,0));modal.close();check(created===0,'Cancel created a periodic note');
 modal=open();await waitFor(()=>modal.contentEl.querySelector('select'));check(modal.contentEl.querySelector('select').value==='window','Opening preference not remembered');button(modal,'pins.createAction').click();await waitFor(()=>!modal.busy&&!modal.modalEl.isConnected);check(created===1&&opened.length===2&&opened[0][2]==='follow'&&opened[1][2]==='window','Wrong periodic opening');
 `),true);
});

test('native Move picker rejects replacement and Tab dismisses suggestions without accepting one',async()=>{
 assert.equal(await authoringScenario(`
 const modal=new M.MoveNodeModal(p.app,origin.file,t,()=>true,()=>{},host);modal.open();await waitFor(()=>modal.contentEl.querySelector('input'));
 const picker=modal.contentEl.querySelector('input');picker.focus();reactInput(picker,'Folder');await waitFor(()=>document.querySelector('.kplex-folder-path-results'));
 picker.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true}));await waitFor(()=>!document.querySelector('.kplex-folder-path-results'));
 check(picker.value==='Folder','Tab changed the typed folder');
 folders.set('Folder',Object.assign(new M.TFolder(),{path:'Folder',name:'Folder',parent:root,children:[]}));button(modal,'moveNode.move').click();await new Promise(r=>setTimeout(r,0));
 check(!writes.some(row=>row[0]==='move'),'Replacement inherited the selected destination');check(modal.feedback.textContent,'Replacement was silently ignored');modal.close();
 `),true);
});

test('Move context dialog uses the canonical native move for an ordinary file',async()=>{
 assert.equal(await authoringScenario(`
 const modal=new M.MoveNodeModal(p.app,origin.file,t,()=>true,()=>{},host);modal.open();await waitFor(()=>modal.contentEl.querySelector('input'));
 reactInput(modal.contentEl.querySelector('input'),'Folder');button(modal,'moveNode.move').click();await waitFor(()=>!modal.modalEl.isConnected);
 check(files.get('Folder/Source.md')===origin.file,'Move did not retain exact file identity');equal(writes.filter(row=>row[0]==='move'),[['move','Source.md','Folder/Source.md']],'Move bypassed canonical native owner');
 `),true);
});
