/** Actual related-node composer creation-property routing and retained-file recovery in Chromium.
 * Native metadata serialization and source identity are independently exercised by creation-properties.test.mjs. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {authoringScenario} from './support/authoring278Browser.mjs';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const nativeSource=ts.createSourceFile('creationPropertiesCases.mjs',readFileSync(new URL('../scripts/testing/obsidian/creationPropertiesCases.mjs',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),nativeSectionLocators=[];
/** Exercise the actual serialized driver's locator rather than duplicating native selectors in a test. */
const findNativeLocator=node=>{if(ts.isFunctionDeclaration(node)&&node.name?.text==='creationPropertyFormSections')nativeSectionLocators.push(node.getText(nativeSource));ts.forEachChild(node,findNativeLocator)};
findNativeLocator(nativeSource);assert.equal(nativeSectionLocators.length,1);

const controls=`
 const property=(modal,field)=>modal.contentEl.querySelector('[data-kplex-creation-property="'+field+'"]');
 const noteTypeInput=modal=>{const label=[...modal.contentEl.querySelectorAll('label')].find(el=>el.textContent===t('creation.noteType'));return label?modal.contentEl.querySelector('[id="'+label.htmlFor+'"]'):null};
 const enterName=async(modal,value)=>{reactInput(name(modal),value);await waitFor(()=>name(modal).value===value)};
 const setType=async(modal,value)=>{reactInput(noteTypeInput(modal),value);await waitFor(()=>noteTypeInput(modal).value===value)};
`;

test('native creation audit locates all real inline shared fields and rejects a missing section',async()=>{
 assert.equal(await authoringScenario(`${controls}
 const sections=(${nativeSectionLocators[0]}),modal=openComposer();await waitFor(()=>noteTypeInput(modal));
 const selected=sections(modal.contentEl,noteTypeInput(modal));
 check(selected.length===6&&selected.every(Boolean),'Native audit could not locate every actual shared form section');
 check(selected[1].classList.contains('kplex-form-inline')&&selected[1].contains(noteTypeInput(modal)),'Native audit selected a different field owner');
 check(!noteTypeInput(modal).closest('.kplex-fuzzy-search'),'Note type uses the native tag picker input');
 check(selected.slice(1).every((element,index)=>Boolean(selected[index].compareDocumentPosition(element)&Node.DOCUMENT_POSITION_FOLLOWING)),'Actual creation sections are out of order');
 const clone=modal.contentEl.cloneNode(true),type=clone.querySelector('[id="'+noteTypeInput(modal).id+'"]'),owner=type.closest('.kplex-form-inline');owner.classList.remove('kplex-form-inline');owner.classList.add('kplex-form-field');
 check(!sections(clone,type).every(Boolean),'Native audit silently accepted an absent inline Note type owner');modal.close();
 `,{styles:true,width:420}),true);
});

test('Add relationship uses the native tag suggester and applies its selection to the creation draft',async()=>{
 assert.equal(await authoringScenario(`${controls}
 p.settings.noteTypeProperties={person:[{field:'email',visible:true}]};
 const proto=M.TagNameSuggest.prototype,open=proto.open,dispose=proto.dispose;
 let picker,retired=false;
 proto.open=function(){picker=this;return open.call(this)};
 proto.dispose=function(){if(this===picker)retired=true;return dispose.call(this)};
 const modal=openComposer();await waitFor(()=>noteTypeInput(modal));
 try{
  const input=noteTypeInput(modal);input.focus();
  input.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));
  check(picker instanceof M.TagNameSuggest,'Arrow Down did not open the shared native tag suggester');
  equal(picker.getSuggestions('#pers'),['person'],'Configured type must be browsable before any note uses it');
  picker.selectSuggestion('person');await waitFor(()=>property(modal,'email'));
  check(input.value==='person','Native selection did not update the Note type field');
 }finally{modal.close();proto.open=open;proto.dispose=dispose;}
 check(retired,'Modal close did not dispose the native tag picker');
 `),true);
});

test('creation rows merge common then type fields once, retain shared drafts and omit obsolete type-only values',async()=>{
 assert.equal(await authoringScenario(`${controls}
 p.settings.commonNodeProperties=[{field:'Name',visible:false,creationVisible:true},{field:'company',visible:true},{field:'untouched',visible:false}];
 p.settings.noteTypeProperties={person:[{field:'Company',visible:true,label:'Employer'},{field:'email',visible:true},{field:'hidden',visible:true,creationVisible:false}],book:[{field:'author',visible:true}]};
 const fm={Name:'Template name',company:'Template company',untouched:'Template value',tags:['existing']},metadata=[];
 p.applyNewNoteCreationMetadata=async(file,draft,current)=>{check(current(),'Current composer guard missing');metadata.push({file,draft});M.applyCreationProperties(fm,draft,p.settings.noteTypeField,'invalid')};
 const modal=openComposer();await waitFor(()=>noteTypeInput(modal));await enterName(modal,'Created');
 reactInput(property(modal,'company'),'ACME');reactInput(property(modal,'Name'),'Authored metadata');await setType(modal,'person');await waitFor(()=>property(modal,'email'));
 equal([...modal.contentEl.querySelectorAll('[data-kplex-creation-property]')].map(el=>el.dataset.kplexCreationProperty),['Name','Company','untouched','email'],'Common/type order or duplicate field');
 check(property(modal,'Company').value==='ACME'&&!property(modal,'hidden'),'Type refinement erased shared edit or offered hidden row');reactInput(property(modal,'email'),'person@example.com');
 await setType(modal,'book');await waitFor(()=>property(modal,'author'));
 check(!property(modal,'email')&&property(modal,'company').value==='ACME','Type switch persisted obsolete field or erased common value');reactInput(property(modal,'author'),'Author');
 button(modal,'addRelated.createMarkdownLink').click();await waitFor(()=>!modal.modalEl.isConnected);
 check(metadata.length===1&&metadata[0].draft.noteType==='book','Selected note type not submitted');
 equal(metadata[0].draft.properties,[{field:'Name',value:'Authored metadata'},{field:'company',value:'ACME'},{field:'author',value:'Author'}],'Obsolete or missing creation values');check(links.length===1,'Creation was not linked once');
 equal(fm,{Name:'Authored metadata',company:'ACME',untouched:'Template value',tags:['existing','book'],author:'Author',[p.settings.noteTypeField]:'book'},'Explicit creation values overwrote untouched template values');
 `),true);
});

test('existing and URL targets disable creation metadata, preserve drafts and never retype or populate the target',async()=>{
 assert.equal(await authoringScenario(`${controls}
 p.settings.commonNodeProperties=[{field:'Name',visible:false,creationVisible:true}];p.settings.noteTypeProperties={person:[{field:'email',visible:true}]};let metadata=0;
 p.applyNewNoteCreationMetadata=async()=>{metadata++};
 const modal=openComposer();await waitFor(()=>noteTypeInput(modal));await enterName(modal,'New note');reactInput(property(modal,'Name'),'Retained');await setType(modal,'person');await waitFor(()=>property(modal,'email'));reactInput(property(modal,'email'),'retained@example.com');
 await enterName(modal,'[[Target]]');await waitFor(()=>noteTypeInput(modal).disabled);
 check(property(modal,'Name').disabled&&property(modal,'email').disabled&&!modal.contentEl.querySelector('.kplex-create-folder-row'),'Existing target can receive creation defaults or move');
 await enterName(modal,'https://example.com/video?t=42');await waitFor(()=>button(modal,'addRelated.addWebLink'));
 check(noteTypeInput(modal).disabled&&property(modal,'Name').value==='Retained','URL mode erased drafts or enables metadata');
 await enterName(modal,'New note');await waitFor(()=>!noteTypeInput(modal).disabled);
 check(property(modal,'Name').value==='Retained'&&property(modal,'email').value==='retained@example.com','Returning to creation lost recoverable draft');
 await enterName(modal,'[[Target]]');await waitFor(()=>modal.contentEl.querySelector('.kplex-add-related-link-button'));
 const link=[...modal.contentEl.querySelectorAll('button')].find(el=>el.classList.contains('kplex-add-related-link-button'));link.click();await waitFor(()=>!modal.modalEl.isConnected);
 check(!metadata&&links.length===1&&links[0][2].file===target.file,'Existing selection wrote metadata or linked another target');
 `),true);
});

test('placeholder mode disables note properties without deleting drafts and Cancel creates nothing',async()=>{
 assert.equal(await authoringScenario(`${controls}
 p.settings.commonNodeProperties=[{field:'Name',visible:false,creationVisible:true}];let metadata=0;p.applyNewNoteCreationMetadata=async()=>{metadata++};
 const modal=openComposer();await waitFor(()=>property(modal,'Name'));await enterName(modal,'Draft');reactInput(property(modal,'Name'),'Keep me');
 const tab=kind=>modal.contentEl.querySelector('.kplex-creation-types [role=tab][id$="tab-'+kind+'"]');tab('placeholder').click();await waitFor(()=>property(modal,'Name').disabled);
 check(noteTypeInput(modal).disabled&&property(modal,'Name').value==='Keep me','Placeholder mode enabled Note type or lost the property draft');
 tab('markdown').click();await waitFor(()=>!property(modal,'Name').disabled);check(property(modal,'Name').value==='Keep me','Tab switch lost draft');modal.close();check(!metadata&&!links.length&&files.size===2,'Cancel wrote creation metadata or created a file');
 `,{styles:true,width:420}),true);
});

test('disabled or removed Alias creation rows never write their retained hidden draft',async()=>{
 assert.equal(await authoringScenario(`${controls}
 const fm={aliases:['Template alias'],Name:'Template name'},calls=[];
 p.createNewRelatedFileForOrigin=async(_origin,title,_kind,alias)=>{check(alias==='','Hidden Alias draft reached legacy alias writer');return addFile(title+'.md')};
 p.applyNewNoteCreationMetadata=async(_file,draft)=>{calls.push(draft);M.applyCreationProperties(fm,draft,p.settings.noteTypeField,'invalid')};
 for(const next of [[],[{field:'aliases',visible:false,creationVisible:false}]]){
  p.settings.commonNodeProperties=[{field:'aliases',visible:false,creationVisible:true}];
  const modal=openComposer();await waitFor(()=>property(modal,'aliases'));await enterName(modal,'Created'+calls.length);reactInput(property(modal,'aliases'),'Hidden draft');
  p.settings.commonNodeProperties=next;p.index.notifyPresentation();await waitFor(()=>!property(modal,'aliases'));
  button(modal,'addRelated.createMarkdownLink').click();await waitFor(()=>!modal.modalEl.isConnected);
 }
 check(calls.length===2&&calls.every(draft=>!draft.properties.length&&draft.noteType===null),'Hidden Alias/defaults were submitted');equal(fm,{aliases:['Template alias'],Name:'Template name'},'Untouched template changed');
 `),true);
});

test('URL and placeholder submission leave creation-only metadata untouched',async()=>{
 assert.equal(await authoringScenario(`${controls}
 p.settings.commonNodeProperties=[{field:'Name',visible:false}];let metadata=0,virtual=0;p.applyNewNoteCreationMetadata=async()=>{metadata++};
 p.createPlaceholderRelatedPage=async(_origin,_role,stem)=>{virtual++;return {path:stem,name:stem,file:null,neighbours:new Map()}};
 for(const mode of ['url','placeholder']){
  const modal=openComposer();await waitFor(()=>property(modal,'Name'));await enterName(modal,'Draft');reactInput(property(modal,'Name'),'Creation-only draft');
  if(mode==='url'){await enterName(modal,'https://example.com/path?t=42');await waitFor(()=>button(modal,'addRelated.addWebLink'));button(modal,'addRelated.addWebLink').click()}
  else{modal.contentEl.querySelector('.kplex-creation-types [role=tab][id$="tab-placeholder"]').click();await waitFor(()=>property(modal,'Name').disabled);button(modal,'addRelated.createPlaceholder').click()}
  await waitFor(()=>!modal.modalEl.isConnected);
 }
 check(!metadata&&virtual===1&&files.size===2,'Non-file target was given creation properties');
 `),true);
});

test('non-Markdown drawing mode disables metadata and ignores an invalid retained property draft',async()=>{
 assert.equal(await authoringScenario(`${controls}
 p.settings.commonNodeProperties=[{field:'deadline',visible:false}];p.isExcalidrawAvailable=()=>true;
 window.ExcalidrawAutomate={verifyMinimumPluginVersion:()=>true,getDrawingFilePath:title=>title+'.excalidraw',getListOfTemplateFiles:()=>[],getAPI:()=>({})};
 p.app.metadataTypeManager={getAssignedWidget:()=> 'text'};let metadata=0,created=0;
 p.applyNewNoteCreationMetadata=async()=>{metadata++};p.createNewRelatedFileForOrigin=async(_origin,title,kind,alias)=>{check(kind==='excalidraw'&&!alias,'Wrong physical type or hidden Alias');created++;return addFile(title+'.excalidraw','excalidraw')};
 const modal=openComposer();await waitFor(()=>property(modal,'deadline'));await enterName(modal,'Drawing');reactInput(property(modal,'deadline'),'2026-02-31');
 p.app.metadataTypeManager.getAssignedWidget=()=> 'date';modal.contentEl.querySelector('.kplex-creation-types [role=tab][id$="tab-excalidraw"]').click();await waitFor(()=>property(modal,'deadline').disabled);
 check(noteTypeInput(modal).disabled,'Drawing metadata remains writable');const create=button(modal,'addRelated.createExcalidrawLink');check(create&&!create.disabled,'Disabled metadata blocked physical drawing creation');create.click();await waitFor(()=>!modal.modalEl.isConnected);
 check(created===1&&!metadata&&links.length===1,'Invalid retained metadata was parsed or written to non-Markdown drawing');delete window.ExcalidrawAutomate;
 `),true);
});

for(const failure of ['relationship','legacy','metadata-pending'])test(`explicit Name survives ${failure} recovery without creating another file or replaying committed metadata`,async()=>{
 assert.equal(await authoringScenario(`${controls}
 p.settings.commonNodeProperties=[{field:'Name',visible:false,creationVisible:true}];
 const fm={},order=[];let created=0,metadata=0,finalized=0,linked=0,committed=0;
 p.index.withForegroundPriority=run=>run();
 p.createNewRelatedFileForOrigin=async(_origin,title,_kind,_alias,_folder,_template,synthesizeDisplayName)=>{check(synthesizeDisplayName===false,'Composer initial creation synthesized display metadata from filename');created++;const file=addFile(title+'.md');order.push('create');if('${failure}'==='legacy')throw new M.PartialRelatedFileError(file,Error('Legacy metadata failed'));return file};
 p.finalizeCreatedNoteMetadata=async(_file,_title,_alias,synthesizeDisplayName)=>{check(synthesizeDisplayName===false,'Retained composer file synthesized display metadata from filename');finalized++;order.push('legacy')};
 p.applyNewNoteCreationMetadata=async(_file,draft,current)=>{check(current(),'Creation draft lost its lifetime');metadata++;M.applyCreationProperties(fm,draft,p.settings.noteTypeField,'invalid');order.push('metadata');if('${failure}'==='metadata-pending')throw new M.SavedRelationshipPendingError('Metadata saved; cache pending')};
 p.linkNewRelatedFile=async(...args)=>{linked++;order.push('link');if(args[6])fm.Name=args[5];if('${failure}'==='relationship'&&linked===1)throw Error('Controlled relationship failure');return {state:'saved-published',page:page(args[2])}};
 const modal=new M.NewRelatedNoteModal(p,origin,'child',()=>{committed++},leaf);modal.open();await waitFor(()=>property(modal,'Name'));await enterName(modal,'Created');reactInput(property(modal,'Name'),'Authored');button(modal,'addRelated.createMarkdownLink').click();
 await waitFor(()=>modal.contentEl.querySelector('.kplex-add-related-recovery'));check(fm.Name==='Authored'||'${failure}'==='legacy','Explicit value was lost before recovery');
 check(!committed&&linked===('${failure}'==='relationship'?1:0),'Metadata-only save was reported as a committed relationship');
 check(modal.modalEl.isConnected&&name(modal).disabled,'Partial file not retained');button(modal,'addRelated.linkCreatedFile').click();await waitFor(()=>!modal.modalEl.isConnected);
 check(created===1&&metadata===1&&fm.Name==='Authored'&&files.size===3&&committed===1,'Recovery created a duplicate, repeated completion or overwrote an explicit property');
 check(finalized===('${failure}'==='legacy'?1:0),'Successful legacy metadata was replayed');
 equal(order,'${failure}'==='legacy'?['create','legacy','metadata','link']:'${failure}'==='relationship'?['create','metadata','link','link']:['create','metadata','link'],'Recovery order changed committed work');
 `),true);
});

test('untouched composer Name keeps template metadata and leaves an unset Name absent',async()=>{
 assert.equal(await authoringScenario(`${controls}
 p.settings.nameFields='Name';p.settings.commonNodeProperties=[{field:'Name',visible:false,creationVisible:true},{field:'aliases',visible:false,creationVisible:true}];
 for(const templateName of [undefined,'Template name']){
  const fm=templateName?{Name:templateName,TemplateKeep:'Template value'}:{};let created=0;
  p.createNewRelatedFileForOrigin=async(_origin,title,_kind,alias,_folder,_template,synthesizeDisplayName)=>{check(synthesizeDisplayName===false&&!alias,'Untouched composer inputs reached implicit metadata synthesis');created++;return addFile(title+'.md')};
  p.applyNewNoteCreationMetadata=async(_file,draft)=>{check(draft.properties.length===0,'Untouched inputs invented property values');M.applyCreationProperties(fm,draft,p.settings.noteTypeField,'invalid')};
  const modal=openComposer();await waitFor(()=>property(modal,'Name'));await enterName(modal,templateName?'Template copy':'Blank metadata');
  button(modal,'addRelated.createMarkdownLink').click();await waitFor(()=>!modal.modalEl.isConnected);
  equal(fm,templateName?{Name:templateName,TemplateKeep:'Template value'}:{},'Physical filename changed untouched template or unset metadata');check(created===1,'Composer repeated physical creation');
 }
 `),true);
});
