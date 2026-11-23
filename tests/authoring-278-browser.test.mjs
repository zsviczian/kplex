/** Actual parent/child composers and shared native controls. Finite writes establish routing and
 * lifetime behavior; native Obsidian owns filesystem/cache/paint acceptance separately. */
import assert from 'node:assert/strict';
import test from 'node:test';

test('Define relationship offers six directions and commits the selected direction with its live form guard',async()=>{
 assert.equal(await authoringScenario(`
 const definitions=[];p.addOntologyToConnection=async(...args)=>{definitions.push(args);check(args[5](),'Live definition guard missing');return {state:'saved-published',page:target}};
 for(const role of ['parent','child','left','right','previous','next']){
  const modal=new M.RelationModal(p,{mode:'relink',purpose:'ontology-specify',origin,fixedTarget:target,semanticRole:'parent'});modal.open();
  await waitFor(()=>field(modal));const select=modal.contentEl.querySelector('.kplex-add-related-role-select');
  equal([...select.options].map(option=>option.value),['child','parent','left','right','previous','next'],'Definition directions incomplete');
  reactInput(select,role);await waitFor(()=>field(modal).value===p.defaultOntologyField(role));
  const input=field(modal);check(input.value===p.defaultOntologyField(role),'Field did not follow direction');
  button(modal,'relation.specifyOntologyButton').click();await waitFor(()=>!modal.modalEl.isConnected);
  const saved=definitions.at(-1);check(saved[2]===role&&saved[3]===p.defaultOntologyField(role),'Definition wrote the inferred default instead of the selected role');
  check(!saved[5](),'Closed definition retained write approval');
 }
 check(definitions.length===6,'Definitions were duplicated');
 `),true);
});

test('the native Rename form accepts a folder name and writes only through FileManager',async()=>{
 assert.equal(await authoringScenario(`
 const item=await p.app.vault.createFolder('Folder/Release.1'),modal=new M.RenameNoteModal(p,item);
 const input=()=>modal.contentEl.querySelector('.kplex-rename-note-name-setting input');
 modal.open();
 check(input().value==='Release.1','Folder draft lost its full name');
 check(modal.titleEl.textContent===t('rename.folderTitle'),'Folder form used the note title');
 check(!modal.contentEl.querySelector('input[type=checkbox]'),'Folder form offered a note metadata write');
 const count=writes.length;
 for(const invalid of ['..','../Escape','Part/Other']){
  reactInput(input(),invalid);button(modal,'common.rename').click();
  check(writes.length===count&&modal.modalEl.isConnected,'Invalid folder name reached FileManager');
 }
 addFile('Folder/Occupied.md');reactInput(input(),'Occupied.md');button(modal,'common.rename').click();
 check(writes.length===count&&modal.modalEl.isConnected,'A file at the destination did not block the rename');
 reactInput(input(),'Release.2');button(modal,'common.rename').click();await waitFor(()=>!modal.modalEl.isConnected);
 equal(writes.slice(count),[['move','Folder/Release.1','Folder/Release.2']],'Folder rename bypassed the selected native source or parent');
 check(folders.get('Folder/Release.2')===item,'Folder native identity was replaced');
 `),true);
});

test('adding to an existing ontology explains retained declarations and switches the same mounted form to replacement',async()=>{
 assert.equal(await authoringScenario(`
 const changes=[],adds=[];
 const primary={declaredByPath:origin.path,declaredTargetPath:target.path,declaredRole:'child',fieldName:'Child'};
 const approval={selection:{primary,declarations:[primary]}};
 p.index.evidenceBetween=()=>[{sourceKind:'frontmatter-ontology',fieldName:'Child'}];
 p.captureConnectionOntologyChange=()=>approval;
 p.addOntologyToConnection=async(...args)=>{adds.push(args);return {state:'saved-published',page:target}};
 p.changeConnectionOntology=async(...args)=>{changes.push(args);return {state:'saved-published',page:target}};
 const modal=new M.RelationModal(p,{mode:'relink',purpose:'ontology-add',origin,fixedTarget:target,semanticRole:'child',initialField:'Child'});modal.open();
 await waitFor(()=>field(modal));const mounted=modal.modalEl,input=field(modal);
 const guidance=modal.contentEl.querySelector('.kplex-relation-additional');
 check(!guidance.hidden&&guidance.textContent.includes(t('relation.additionalOntologyHelp')),'Additional role effect unexplained');
 modal.contentEl.querySelector('[data-kplex-replace-existing]').click();await waitFor(()=>modal.titleEl.textContent===t('actions.relationship.relink'));
 check(modal.modalEl===mounted&&field(modal)===input,'Replace created another dialog or discarded the picker');
 check(modal.contentEl.querySelector('.kplex-relation-storage').hidden,'Replacement can redirect approved ownership');
 check(!modal.contentEl.querySelector('.kplex-relation-additional'),'Replacement retains obsolete additive actions');
 reactInput(modal.contentEl.querySelector('.kplex-add-related-role-select'),'right');await waitFor(()=>field(modal).value==='Challenger');
 button(modal,'actions.relationship.relink').click();await waitFor(()=>!mounted.isConnected);
 check(!adds.length&&changes.length===1&&changes[0][0]===approval&&changes[0][1]==='right','Mode switch added a competing ontology or lost exact approval');
 `,{styles:true}),true);
});

test('Change ontology starts in its current direction, scopes suggestions and offers all six replacement directions',async()=>{
 assert.equal(await authoringScenario(`
 p.settings.hierarchy.children=['Child','Child alternative'];
 const approved={selection:{declarations:[{}]}},changes=[];
 p.changeConnectionOntology=async(...args)=>{changes.push(args);return {state:'saved-published',page:target}};
 const modal=new M.RelationModal(p,{mode:'relink',purpose:'ontology-change',ontologyChange:approved,
  origin,fixedTarget:target,semanticRole:'child',initialField:'Child',hostLeaf:leaf});modal.open();
 await waitFor(()=>field(modal));const direction=modal.contentEl.querySelector('.kplex-add-related-role-select');
 check(direction.value==='child'&&field(modal).value==='Child','Current direction and physical ontology were lost');
 equal([...direction.options].map(option=>option.value),['child','parent','left','right','previous','next'],'Replacement directions are incomplete');
 check(!modal.contentEl.querySelector('#kplex-relation-modal-storage'),'Replacement can redirect an approved property owner');
 modal.contentEl.querySelector('.kplex-fuzzy-disclosure').click();await waitFor(()=>document.querySelector('.kplex-ontology-results'));
 const choices=document.querySelector('.kplex-ontology-results').textContent;
 check(choices.includes('Child alternative')&&!choices.includes('Previous'),'Default ontology list is not scoped to Child');
 field(modal).dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
 reactInput(direction,'previous');await waitFor(()=>field(modal).value==='Previous');
 button(modal,'actions.relationship.relink').click();await waitFor(()=>!modal.modalEl.isConnected);
 check(changes.length===1&&changes[0][0]===approved&&changes[0][1]==='previous'&&changes[0][2]==='Previous','Replacement bypassed its exact approval/role/field');
 `,{styles:true}),true);
});

test('paired ontology replacement requires a valid inverse and Cancel never writes either note',async()=>{
 assert.equal(await authoringScenario(`
 p.settings.hierarchy.children=['Child/Parent','Unpaired child'];
 const approved={selection:{declarations:[{},{}]}},changes=[];
 p.changeConnectionOntology=async(...args)=>{changes.push(args);return {state:'saved-published',page:target}};
 const open=()=>{const modal=new M.RelationModal(p,{mode:'relink',purpose:'ontology-change',ontologyChange:approved,
  origin,fixedTarget:target,semanticRole:'child',initialField:'Child',hostLeaf:leaf});modal.open();return modal};
 let modal=open();await waitFor(()=>field(modal));check(modal.contentEl.textContent.includes(t('relation.changeOntologyPairHelp')),'Two-owner mutation is unexplained');
 reactInput(field(modal),'Unpaired child');await waitFor(()=>button(modal,'actions.relationship.relink').disabled);
 check(modal.contentEl.textContent.includes(t('reciprocal.requiresInverse')),'Missing replacement inverse is unexplained');
 button(modal,'common.cancel').click();check(!changes.length,'Cancel changed ontology');
 modal=open();await waitFor(()=>field(modal));reactInput(modal.contentEl.querySelector('.kplex-add-related-role-select'),'left');
 await waitFor(()=>field(modal).value==='Friend'&&!button(modal,'actions.relationship.relink').disabled);
 button(modal,'actions.relationship.relink').click();await waitFor(()=>!modal.modalEl.isConnected);
 check(changes.length===1&&changes[0][1]==='left'&&changes[0][2]==='Friend','Symmetric Friend replacement was rejected');
 `,{styles:true}),true);
});

test('partial ontology replacement retains frozen intent and retries its existing receipt',async()=>{
 assert.equal(await authoringScenario(`
 p.settings.hierarchy.children=['Child/Parent'];let retry=0,replacementWrites=0;const commits=[];
 const receipt={outcomes:[{path:origin.path,field:'Child',state:'saved'},{path:target.path,field:'Parent',state:'pending'}],retry:async()=>{retry++}};
 p.changeConnectionOntology=async()=>{replacementWrites++;throw new M.ReciprocalRelationshipWriteError(receipt,t('reciprocal.partial'),Error('Second file failure'))};
 const modal=new M.RelationModal(p,{mode:'relink',purpose:'ontology-change',ontologyChange:{selection:{declarations:[{},{}]}},
  origin,fixedTarget:target,semanticRole:'child',initialField:'Child',hostLeaf:leaf,onCommitted:outcome=>commits.push(outcome.state)});modal.open();
 await waitFor(()=>field(modal));button(modal,'actions.relationship.relink').click();await waitFor(()=>modal.contentEl.querySelector('[data-kplex-reciprocal-retry]'));
 check(field(modal).disabled&&modal.contentEl.querySelector('.kplex-add-related-role-select').disabled,'Partial intent remains editable');
 check(button(modal,'actions.relationship.relink').disabled,'Partial save can be submitted as a new replacement');
 modal.contentEl.querySelector('[data-kplex-reciprocal-retry]').click();await waitFor(()=>!modal.modalEl.isConnected);
 equal(commits,['saved-pending','saved-published'],'Durable partial/result status was lost');check(replacementWrites===1&&retry===1,'Retry repeated replacement intent');
 `),true);
});

test('actual Link completion reports its endpoint once to the captured canvas without changing the saved result',async()=>{
 assert.equal(await authoringScenario(`
 const feedback=[],release=p.registerLinkedNodeFeedback(leaf,(source,linked)=>feedback.push([source.path,linked.path]));
 const modal=openComposer(target);await waitFor(()=>button(modal,'addRelated.link'));
 button(modal,'addRelated.link').click();await waitFor(()=>!modal.modalEl.isConnected);
 equal(feedback,[[origin.path,target.path]],'Shared composer lost or duplicated originating feedback');
 check(links.length===1,'Feedback repeated the relationship write');release();
 `),true);
});

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

test('pasted Markdown web links enter link mode and preserve full targets plus authored or explicitly edited labels',async()=>{
 assert.equal(await authoringScenario(`
 const originalFiles=files.size,metadata=[];p.applyNewNoteCreationMetadata=async(...args)=>metadata.push(args);
 for(const [input,expected,edit]of [['[Authored title](https://example.com/path?t=90#Part)','Authored title',null],['[Extracted](https://youtu.be/z8UkHGpykYU?t=60)','Explicit alias','Explicit alias'],['[Extracted](https://example.com/clear)','', '']]){
  const modal=openComposer();await waitFor(()=>name(modal));reactInput(name(modal),input);await waitFor(()=>button(modal,'addRelated.addWebLink'));
  check(!button(modal,'addRelated.createMarkdownLink'),'Recognized web target still offers filename creation');
  const alias=modal.contentEl.querySelector('.kplex-create-alias-input');check(alias.value==='Authored title'||alias.value==='Extracted','Authored link label was lost');
  if(edit!==null)reactInput(alias,edit);
  button(modal,'addRelated.addWebLink').click();await waitFor(()=>!modal.modalEl.isConnected);
  const saved=links.at(-1);check(saved[0]==='web'&&saved[1].file===origin.file&&saved[4]===expected,'Web target lost source or explicit alias');
  const destination=input.slice(input.indexOf('](')+2,-1);check(saved[3]===destination,'Query, timestamp or fragment was rewritten');
 }
 check(files.size===originalFiles&&metadata.length===0&&writes.length===0,'Linking web targets created/retyped/relocated a file');
 `),true);
});

test('complete wikilinks and relative paths link exact existing notes and attachments without applying creation metadata',async()=>{
 assert.equal(await authoringScenario(`
 const picture=addFile('Folder/Wave.svg','svg'),metadata=[];p.applyNewNoteCreationMetadata=async(...args)=>metadata.push(args);const originalFiles=files.size;
 for(const [input,file,expectedAlias,edit]of [['[[Target]]',target.file,'',null],['[[Target|Authored alias]]',target.file,'Authored alias',null],['Target.md',target.file,'',null],['[[Folder/Wave.svg|Wave]]',picture,'Custom wave','Custom wave'],['Folder/Wave.svg',picture,'',null]]){
  const modal=openComposer();await waitFor(()=>name(modal));name(modal).focus();reactInput(name(modal),input);
  if(input==='Target.md'){await waitFor(()=>document.querySelector('.kplex-search-results button'));document.querySelector('.kplex-search-results button').click();}
  await waitFor(()=>modal.contentEl.querySelector('.kplex-add-related-note-search.has-selection')).catch(error=>{throw Error(input+' failed to resolve: '+modal.contentEl.textContent+' '+error.message)});
  check(!button(modal,'addRelated.createMarkdownLink'),'Existing target still offers physical creation');
  if(edit!==null)reactInput(modal.contentEl.querySelector('.kplex-create-alias-input'),edit);
  button(modal,'addRelated.link').click();await waitFor(()=>!modal.modalEl.isConnected);const saved=links.at(-1);
  check(saved[0].file===origin.file&&saved[2].file===file,'Pasted link did not retain exact source/target native identities');
  check(saved[4]===(expectedAlias?'[['+file.path+'|'+expectedAlias+']]':undefined),'Authored or explicit link alias was lost');
 }
 check(files.size===originalFiles&&!metadata.length&&!writes.length,'Existing/attachment targets inherited creation metadata');
 p.settings.alsoWriteInverseOntology=true;const blocked=openComposer();await waitFor(()=>name(blocked));reactInput(name(blocked),'[[Folder/Wave.svg]]');
 await waitFor(()=>blocked.contentEl.querySelector('.kplex-add-related-note-search.has-selection'));
 check(button(blocked,'addRelated.link').disabled&&blocked.contentEl.textContent.includes(t('reciprocal.requiresMarkdown')),'Pasted attachment bypasses reciprocal Markdown restriction');blocked.close();
 `),true);
});

test('recognized invalid links and unsupported subpaths stay recoverable and cannot create bracket-named files',async()=>{
 assert.equal(await authoringScenario(`
 const originalFiles=files.size,modal=openComposer();await waitFor(()=>name(modal));
 for(const [input,key]of [['[[Target#Heading]]','addRelated.linkSubpathUnsupported'],['[[Target#^block]]','addRelated.linkSubpathUnsupported'],['[[Missing]]','addRelated.linkTargetMissing'],['[[Target]] [[Source]]','addRelated.linkInputInvalid'],['[A](javascript:alert(1))','addRelated.linkInputInvalid'],['[A](https://example.com) [B](https://example.org)','addRelated.linkInputInvalid'],['see [[Target]] here','addRelated.linkInputInvalid'],['see [A](https://example.com) here','addRelated.linkInputInvalid']]){
  reactInput(name(modal),input);await waitFor(()=>modal.contentEl.textContent.includes(t(key)));
  check([...modal.contentEl.querySelectorAll('.kplex-add-related-create-actions button')].every(action=>action.disabled),'Invalid pasted link offers an enabled create action');
  modal.submitKey(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));await new Promise(resolve=>window.setTimeout(resolve,20));
  check(!links.length&&!writes.length&&files.size===originalFiles,'Keyboard submit materialized a malformed input');
 }
 for(const input of ['[Project]','Project: roadmap']){reactInput(name(modal),input);await new Promise(resolve=>window.setTimeout(resolve,20));check(!modal.contentEl.textContent.includes(t('addRelated.linkInputInvalid')),'Ordinary filename was reclassified as a pasted link');}
 reactInput(name(modal),'[[Target|Recovered]]');await waitFor(()=>modal.contentEl.querySelector('.kplex-add-related-note-search.has-selection'));check(!button(modal,'addRelated.link').disabled,'Correcting invalid input did not restore linking');modal.close();
 `),true);
});

test('generic relationship memory changes only after a durable save and persists independently of explicit direction defaults',async()=>{
 assert.equal(await authoringScenario(`
 const perRole=structuredClone(p.settings.relationDefaultFields),journal=structuredClone(p.settings.dailyNoteLinkFields),generic=()=>openComposer(target,{initialRoleFilter:'all',rememberGenericOntology:true});
 let modal=generic();await waitFor(()=>field(modal));reactInput(field(modal),'Next');modal.close();check(p.settings.genericRelationshipSelection===null,'Cancel remembered an unused selection');
 const writer=p.createRelationToPage;p.createRelationToPage=async()=>{throw Error('Expected relationship failure')};modal=generic();await waitFor(()=>field(modal));reactInput(field(modal),'Friend');button(modal,'addRelated.link').click();await waitFor(()=>window.notices.some(notice=>String(notice).includes('Expected relationship failure')));check(p.settings.genericRelationshipSelection===null,'Failed relationship remembered a selection');modal.close();p.createRelationToPage=writer;
 for(const [selected,role]of [['Friend','left'],['Previous','previous'],['Challenger','right'],['Next','next']]){
  modal=generic();await waitFor(()=>field(modal));reactInput(field(modal),selected);button(modal,'addRelated.link').click();await waitFor(()=>!modal.modalEl.isConnected);
  equal(p.settings.genericRelationshipSelection,{role,field:selected},'Generic selection did not follow the successful field role');
  equal(p.initialGenericRelationshipSelection(),{role,field:selected},'Next generic invocation lost the committed tuple');
 }
 equal(p.settings.relationDefaultFields,perRole,'Generic memory changed explicit-direction defaults');equal(p.settings.dailyNoteLinkFields,journal,'Generic memory changed journal defaults');
 const persisted=p.writes.at(-1);p.settings=M.migrateAndMergeSettings(JSON.parse(JSON.stringify(persisted)));equal(p.initialGenericRelationshipSelection(),{role:'next',field:'Next'},'Actual settings reload lost generic memory');
 modal=openComposer(target);await waitFor(()=>field(modal));check(field(modal).value==='Child','Explicit Child invocation was hijacked by generic Next memory');button(modal,'addRelated.link').click();await waitFor(()=>!modal.modalEl.isConnected);equal(p.settings.genericRelationshipSelection,{role:'next',field:'Next'},'Explicit direction overwrote generic memory');
 `),true);
});

test('generic preference failures leave durable links successful and saved-pending links still remember their selection once',async()=>{
 assert.equal(await authoringScenario(`
 const save=p.saveData;p.saveData=async()=>{throw Error('Expected preference failure')};let modal=openComposer(target,{initialRoleFilter:'all',rememberGenericOntology:true});await waitFor(()=>field(modal));reactInput(field(modal),'Friend');button(modal,'addRelated.link').click();await waitFor(()=>!modal.modalEl.isConnected);
 check(links.length===1&&p.settings.genericRelationshipSelection===null,'Preference failure duplicated or reclassified the durable link');check(window.notices.includes(t('addRelated.memorySaveFailed')),'Preference-only failure has no clear notice');p.saveData=save;
 let saves=0;const remember=p.rememberGenericRelationshipOntology.bind(p);p.rememberGenericRelationshipOntology=async(...args)=>{saves++;return remember(...args)};
 p.createRelationToPage=async(...args)=>{links.push(args);throw new M.SavedRelationshipPendingError('Expected publication pending')};modal=openComposer(target,{initialRoleFilter:'all',rememberGenericOntology:true});await waitFor(()=>field(modal));reactInput(field(modal),'Previous');button(modal,'addRelated.link').click();await waitFor(()=>p.settings.genericRelationshipSelection?.role==='previous');
 check(modal.modalEl.isConnected&&modal.contentEl.textContent.includes(t('addRelated.savedPending')),'Durable-pending relationship lost its recovery form');check(saves===1&&links.length===2,'Pending publication duplicated a relationship or preference save');equal(p.settings.genericRelationshipSelection,{role:'previous',field:'Previous'},'Durable-pending selection was not remembered');modal.close();
 `),true);
});

test('Markdown composer selects indexed attachments and submits their exact file identities',async()=>{
 assert.equal(await authoringScenario(`
 for(const extension of ['svg','pdf','canvas','custom']){
  const attachment=page(addFile('Attachment.'+extension,extension)),modal=openComposer();
  await waitFor(()=>name(modal));name(modal).focus();reactInput(name(modal),'Attachment.'+extension);
  await waitFor(()=>document.querySelector('.kplex-search-result'));
  const option=[...document.querySelectorAll('.kplex-search-result')].find(row=>row.textContent.includes(attachment.path));
  check(option,'Indexed attachment absent from suggestions: '+extension);option.click();
  await waitFor(()=>modal.contentEl.querySelector('.kplex-add-related-note-search.has-selection'));
  check(!modal.contentEl.querySelector('.kplex-creation-types'),'Existing attachment left creation controls active');
  const link=modal.contentEl.querySelector('.kplex-add-related-link-button');
  check(link&&!link.disabled,'Selected attachment did not enable linking');link.click();
  await waitFor(()=>links.length&&links[links.length-1][2].file===attachment.file);
  const args=links[links.length-1];check(args[0].file===origin.file&&args[2].path===attachment.path&&args[6]===false,'Wrong endpoints or property owner');
  check(!writes.length,'Existing attachment selection created a file');modal.close();
 }
 `),true);
});

for(const width of [900,360])for(const locale of ['en','de'])test(`compact related creation keeps long controls and type-specific status at ${width}px in ${locale}`,async()=>{
 assert.equal(await authoringScenario(`
 p.translator=M.createTranslator(${JSON.stringify(locale)});p.isExcalidrawAvailable=()=>true;p.settings.newNodeCreationTab='markdown';
 const modal=openComposer();await waitFor(()=>name(modal)&&modal.contentEl.querySelector('.kplex-creation-types'));
 reactInput(name(modal),'A'.repeat(160));await waitFor(()=>modal.contentEl.querySelector('.kplex-creation-status'));
 const rows=[...modal.contentEl.querySelectorAll('.kplex-create-name-pair .kplex-form-inline,.kplex-add-related-form > .kplex-form-inline,.kplex-creation-property-section .kplex-form-inline,.kplex-creation-completion')];
 equal(rows.map(row=>row.querySelector('label').textContent),[p.translator('common.name'),p.translator('creation.noteType'),p.translator('folderPicker.label'),p.translator('creation.alias'),p.translator('creation.action')],'Compact field labels follow the common/type creation order');
 for(const row of rows){const label=row.querySelector('label'),control=row.querySelector('input,select'),a=label.getBoundingClientRect(),b=control.getBoundingClientRect(),r=row.getBoundingClientRect();
 check(a.right<b.left&&b.width>=r.width*.65,'A short inline label squeezed the input');check(control.id===label.htmlFor,'Compact row lost visible label association');}
 const active=kind=>modal.contentEl.querySelector('.kplex-creation-types [role=tab][id$="tab-'+kind+'"]');
 for(const kind of ['markdown','excalidraw','placeholder']){active(kind).click();await waitFor(()=>active(kind).getAttribute('aria-selected')==='true');
 const status=modal.contentEl.querySelector('.kplex-creation-status');check(status.textContent===p.translator('creation.typeStatus',{name:'A'.repeat(160),type:p.translator('common.'+kind)}),'Creation status does not match selected type');
 if(kind==='placeholder')check(!modal.contentEl.querySelector('.kplex-relationship-direction'),'Ineligible Placeholder exposed property-direction section');
 else{const template=modal.contentEl.querySelector('.kplex-drawing-template'),picker=template.querySelector('.kplex-template-picker'),action=template.querySelector('.kplex-field-actions button'),a=picker.getBoundingClientRect(),b=action.getBoundingClientRect();
 check(a.right<b.left&&Math.abs(a.top+a.height/2-b.top-b.height/2)<2,'Template and create action must share a row');check(a.width>=template.getBoundingClientRect().width*.55,'Template input is too short');}
 }
 check(modal.contentEl.scrollWidth<=modal.contentEl.clientWidth+1,'Compact form overflowed horizontally '+JSON.stringify({client:modal.contentEl.clientWidth,scroll:modal.contentEl.scrollWidth,overflow:[...modal.contentEl.querySelectorAll('*')].filter(el=>el.getBoundingClientRect().right>modal.contentEl.getBoundingClientRect().right+1).map(el=>({tag:el.tagName,class:el.className,width:el.getBoundingClientRect().width,right:el.getBoundingClientRect().right})).slice(0,12)}));check(modal.contentEl.querySelector('.kplex-add-related-form').getBoundingClientRect().height<620,'Compact form remains too tall');modal.close();
 origin.file.extension='png';p.settings.newNodeCreationTab='markdown';const attachment=openComposer();await waitFor(()=>name(attachment));check(!attachment.contentEl.querySelector('.kplex-relationship-direction'),'An ineligible attachment exposed property direction');attachment.close();
 `,{styles:true,width,height:900}),true);
});

test('connection reciprocal preflight explains missing inverse or writable note before enabling Save',async()=>{
 assert.equal(await authoringScenario(`
 p.settings.alsoWriteInverseOntology=true;let semanticWork=0;p.index.invalidateSemanticPolicy=()=>semanticWork++;p.index.refreshSemanticSettings=async()=>semanticWork++;
 const open=()=>{const modal=new M.RelationModal(p,{mode:'relink',purpose:'ontology-add',origin,fixedTarget:target,semanticRole:'child',initialField:'Child'});modal.open();return modal};
 let modal=open();await waitFor(()=>field(modal));check(button(modal,'relation.addOntologyButton').disabled,'Unpaired inverse enabled Save');
 check(modal.contentEl.querySelector('.kplex-reciprocal-preflight').textContent===t('reciprocal.requiresInverse'),'Missing inverse was not explained');modal.close();
 p.settings.hierarchy={...p.settings.hierarchy,parents:[],children:['Child / Parent']};
 modal=open();await waitFor(()=>field(modal));check(!button(modal,'relation.addOntologyButton').disabled,'Configured pair did not enable Save');modal.close();
 target.file.extension='png';modal=open();await waitFor(()=>field(modal));check(button(modal,'relation.addOntologyButton').disabled,'Unwritable inverse endpoint enabled Save');
 check(modal.contentEl.querySelector('.kplex-reciprocal-preflight').textContent===t('reciprocal.requiresMarkdown'),'Unwritable endpoint was not explained');modal.close();
 p.settings.alsoWriteInverseOntology=false;modal=open();await waitFor(()=>field(modal));check(!button(modal,'relation.addOntologyButton').disabled,'Default-off workflow gained a reciprocal restriction');modal.close();
 check(!links.length&&!semanticWork,'Inspecting a reciprocal preflight wrote or indexed notes');
 `),true);
});

test('connection partial status owns one native retry and never resubmits a durable forward write',async()=>{
 assert.equal(await authoringScenario(`
 p.settings.alsoWriteInverseOntology=true;p.settings.hierarchy={...p.settings.hierarchy,parents:[],children:['Child / Parent']};
 let fail=true,operations=0;const effects=[];
 const receipt=M.createReciprocalWriteReceipt({app:p.app,first:{file:origin.file,target:target.file,field:'Child'},second:{file:target.file,target:origin.file,field:'Parent'},current:()=>true,
  write:async write=>{effects.push(write.file.path);if(write.file===target.file&&fail)throw Error('Native inverse unavailable')},failureMessage:()=>t('reciprocal.partial'),unavailableMessage:()=>t('addRelated.endpointChanged')});
 p.addOntologyToConnection=async()=>{operations++;await receipt.retry();return {state:'saved-published',page:target}};
 const commits=[],modal=new M.RelationModal(p,{mode:'relink',purpose:'ontology-add',origin,fixedTarget:target,semanticRole:'child',initialField:'Child',onCommitted:result=>commits.push(result.state)});modal.open();
 await waitFor(()=>field(modal));button(modal,'relation.addOntologyButton').click();await waitFor(()=>modal.contentEl.querySelector('.kplex-reciprocal-status'));
 const status=modal.contentEl.querySelector('.kplex-reciprocal-status');check(status.textContent.includes(origin.path)&&status.textContent.includes(target.path)&&status.textContent.includes(t('reciprocal.saved'))&&status.textContent.includes(t('reciprocal.pending')),'Per-file partial outcomes are missing');
 const retry=button(modal,'reciprocal.retry');await waitFor(()=>!retry.disabled);check(retry.querySelector('svg')&&!retry.hasAttribute('title'),'Retry did not use the native shared icon owner');
 await waitFor(()=>field(modal).disabled);check(button(modal,'relation.addOntologyButton').disabled&&modal.contentEl.querySelector('#kplex-relation-modal-storage').disabled&&field(modal).disabled,'Partial receipt left authoring drafts editable');
 check(modal.contentEl.scrollWidth<=modal.contentEl.clientWidth+1,'Partial feedback overflows a narrow form');
 equal(commits,['saved-pending'],'Durable first write was reported as unsaved');retry.focus();retry.click();await waitFor(()=>button(modal,'reciprocal.retry')!==retry&&!button(modal,'reciprocal.retry').disabled);
 const next=button(modal,'reciprocal.retry');check(document.activeElement===next,'A failed retry lost its keyboard focus');
 fail=false;next.click();next.click();await waitFor(()=>!modal.modalEl.isConnected);
 equal(effects,[origin.path,target.path,target.path,target.path],'Retry repeated a successful declaration');check(operations===1,'Retry resubmitted the original add operation');equal(commits,['saved-pending','saved-published'],'Retry completion was not published once');
 `,{styles:true,width:420}),true);
});

test('shared Template search exposes only its selected kind, commits exact paths and restores abandoned queries',async()=>{
 assert.equal(await authoringScenario(`
 const entries=[{path:'Templates/A/Same.md',kind:'markdown'},{path:'Templates/B/Same.md',kind:'markdown'},{path:'Drawings/B/Same.md',kind:'excalidraw'},...Array.from({length:80},(_,i)=>({path:'Templates/Long/'+i+'.md',kind:'markdown'}))],selected=[],container=host.createDiv(),templateRoot=M.createRoot(container);
 function Picker(){const [path,setPath]=M.React.useState('Templates/A/Same.md'),[kind,setKind]=M.React.useState('markdown');return M.React.createElement(M.DrawingTemplateSelect,{choices:{files:entries,selected:path,root:'',validate:()=>{throw new Error('Discovery executed template validation')}},value:path,kind,translate:t,onChange:(value,nextKind)=>{selected.push([value,nextKind]);setPath(value);setKind(nextKind)}})}
 M.flushSync(()=>templateRoot.render(M.React.createElement(Picker)));const input=container.querySelector('input'),browse=container.querySelector('.kplex-fuzzy-disclosure');
 const waitTemplate=async(predicate,label)=>{try{await waitFor(predicate)}catch(error){throw new Error(label+': '+JSON.stringify({value:input.value,selected,results:document.querySelector('.kplex-search-results')?.textContent})+' '+error)}};
 check(container.querySelector('label').htmlFor===input.id&&!input.hasAttribute('title'),'Shared field label ownership');
 input.focus();reactInput(input,'Same');await waitTemplate(()=>document.querySelectorAll('.kplex-search-results button').length===2,'Duplicate-name search');
 check(selected.length===0,'Query typing committed a path');check(document.querySelector('.kplex-search-results').textContent.includes('Templates/A/Same.md')&&document.querySelector('.kplex-search-results').textContent.includes('Templates/B/Same.md')&&!document.querySelector('.kplex-search-results').textContent.includes('Drawings/B/Same.md'),'Selected kind lost duplicate paths or exposed another kind');
 reactInput(input,'Templates/B');await waitTemplate(()=>document.querySelectorAll('.kplex-search-results button').length===1,'Path search');
 input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',ctrlKey:true,bubbles:true,cancelable:true}));await waitTemplate(()=>selected.length===1&&input.value==='Templates/B/Same.md','Keyboard selection');check(selected[0][1]==='markdown','Keyboard choice lost selected template kind');
 input.focus();reactInput(input,'Abandoned query');input.blur();await waitTemplate(()=>input.value==='Templates/B/Same.md','Abandoned query');check(selected.length===1,'Blur changed committed selection');
 browse.click();await waitTemplate(()=>document.querySelectorAll('.kplex-search-results button').length===32,'Bounded browse');check(selected.length===1,'Browsing executed a selection');
 document.querySelector('.kplex-search-results button').click();await waitTemplate(()=>selected.length===2&&selected[1][0]==='','Explicit blank');
 templateRoot.unmount();check(!document.querySelector('.kplex-search-results'),'Template portal survived owner teardown');
 `,{styles:true,width:420}),true);
});

test('Template combobox exposes one labelled listbox and keyboard active option across independent roots',async()=>{
 assert.equal(await authoringScenario(`
 const entries=[{path:'Templates/Alpha.md',kind:'markdown'},{path:'Templates/Beta.md',kind:'markdown'}],choices=[];
 const mounts=[host.createDiv(),host.createDiv()],roots=mounts.map(mount=>M.createRoot(mount));
 function Picker({index}){const [path,setPath]=M.React.useState(index===0?'Templates/Beta.md':'');return M.React.createElement(M.DrawingTemplateSelect,{choices:{files:entries,selected:'',root:''},value:path,kind:'markdown',translate:t,onChange:value=>{choices.push([index,value]);setPath(value)}})}
 M.flushSync(()=>roots.forEach((root,index)=>root.render(M.React.createElement(Picker,{index}))));
 const inputs=mounts.map(mount=>mount.querySelector('input')),browse=mounts.map(mount=>mount.querySelector('.kplex-fuzzy-disclosure'));
 check(inputs[0].id!==inputs[1].id,'Independent roots duplicated input IDs');
 for(const [index,input]of inputs.entries()){
  const label=mounts[index].querySelector('label');check(input.getAttribute('role')==='combobox'&&input.getAttribute('aria-autocomplete')==='list'&&input.getAttribute('aria-haspopup')==='listbox','Editable Template combobox semantics missing');
  check(label.htmlFor===input.id&&input.getAttribute('aria-labelledby')===label.id&&document.getElementById(label.id)===label&&label.textContent===t('drawing.template')&&!input.hasAttribute('aria-label'),'Combobox lost its unique visible label');
  check(input.getAttribute('aria-expanded')==='false'&&!input.hasAttribute('aria-controls')&&!input.hasAttribute('aria-activedescendant')&&browse[index].tabIndex===-1,'Closed picker advertises a stale popup or a second tab stop');
 }
 const popup=input=>document.getElementById(input.getAttribute('aria-controls'));
 const assertOpen=input=>{const list=popup(input),active=document.getElementById(input.getAttribute('aria-activedescendant'));check(input.getAttribute('aria-expanded')==='true'&&list?.getAttribute('role')==='listbox'&&list.getAttribute('aria-labelledby')===input.getAttribute('aria-labelledby'),'Combobox does not control its labelled popup');check(active&&list.contains(active)&&active.getAttribute('role')==='option'&&active.getAttribute('aria-selected')==='true','Active descendant is not the selected popup option');check(list.querySelectorAll('[role=option][aria-selected=true]').length===1&&[...list.querySelectorAll('[role=option]')].every(option=>option.tabIndex===-1),'Listbox has multiple selections or page tab stops');check(document.activeElement===input,'Option navigation moved DOM focus away from input');return list};
 inputs[0].focus();check(inputs[0].value==='Templates/Beta.md'&&inputs[0].getAttribute('aria-expanded')==='false','Committed value unexpectedly opened on focus');
 inputs[0].dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));await waitFor(()=>popup(inputs[0]));const firstPopup=assertOpen(inputs[0]),firstId=firstPopup.id,firstActive=inputs[0].getAttribute('aria-activedescendant');
 check(firstPopup.querySelectorAll('[role=option]').length===3&&document.getElementById(firstActive)===firstPopup.querySelector('[role=option]'),'Closed ArrowDown did not browse all choices at the first option');
 inputs[0].dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));await waitFor(()=>inputs[0].getAttribute('aria-activedescendant')!==firstActive);assertOpen(inputs[0]);check(document.getElementById(inputs[0].getAttribute('aria-activedescendant')).textContent.includes('Alpha.md'),'ArrowDown did not expose the keyboard-selected option');
 check(choices.length===0,'Accessible selection movement committed the template');
 inputs[0].dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));await waitFor(()=>choices.length===1&&inputs[0].getAttribute('aria-expanded')==='false');check(choices[0][0]===0&&choices[0][1]==='Templates/Alpha.md'&&inputs[0].value==='Templates/Alpha.md'&&!inputs[0].hasAttribute('aria-controls')&&!inputs[0].hasAttribute('aria-activedescendant')&&document.activeElement===inputs[0],'Keyboard Enter did not commit the selected exact template, retain focus and retire its popup');
 reactInput(inputs[0],'Beta');await waitFor(()=>popup(inputs[0])?.querySelectorAll('[role=option]').length===1);assertOpen(inputs[0]);check(choices.length===1,'Typing after retained-focus acceptance committed another path');inputs[0].dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));await waitFor(()=>inputs[0].getAttribute('aria-expanded')==='false');check(document.activeElement===inputs[0],'Escape after typing lost the combobox focus owner');
 inputs[0].dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',altKey:true,bubbles:true,cancelable:true}));await waitFor(()=>popup(inputs[0]));check(assertOpen(inputs[0]).id===firstId,'Closed Alt+ArrowDown did not reuse the disclosure popup');
 inputs[0].dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));await waitFor(()=>inputs[0].getAttribute('aria-expanded')==='false');check(!document.getElementById(firstId)&&!inputs[0].hasAttribute('aria-controls')&&!inputs[0].hasAttribute('aria-activedescendant')&&document.activeElement===inputs[0],'Escape left dangling popup references or lost input focus');
 inputs[0].dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));await waitFor(()=>popup(inputs[0]));check(assertOpen(inputs[0]).id===firstId,'Popup identity changed during the same picker lifetime');
 browse[1].click();await waitFor(()=>popup(inputs[1]));const secondPopup=assertOpen(inputs[1]),secondId=secondPopup.id;check(secondId!==firstId,'Independent roots duplicated popup IDs');
 check(inputs[0].getAttribute('aria-expanded')==='false'&&!inputs[0].hasAttribute('aria-controls')&&!document.getElementById(firstId),'Native blur left the first root popup referenced');
 const ids=[...document.querySelectorAll('[id]')].map(element=>element.id);check(new Set(ids).size===ids.length,'Combobox/listbox/option IDs collide across roots');
 const tabEvent=new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true});inputs[1].dispatchEvent(tabEvent);await waitFor(()=>inputs[1].getAttribute('aria-expanded')==='false');check(!tabEvent.defaultPrevented&&choices.length===1&&!document.getElementById(secondId)&&!inputs[1].hasAttribute('aria-controls')&&!inputs[1].hasAttribute('aria-activedescendant'),'Tab blocked native focus order, committed a choice or left popup references');
 inputs[1].dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));await waitFor(()=>popup(inputs[1]));check(assertOpen(inputs[1]).id===secondId,'Keyboard reopen after Tab changed popup identity');
 const firstOption=[...popup(inputs[1]).querySelectorAll('[role=option]')].find(option=>option.textContent.includes('Beta.md'));firstOption.click();await waitFor(()=>choices.length===2&&inputs[1].getAttribute('aria-expanded')==='false');check(choices[1][0]===1&&choices[1][1]==='Templates/Beta.md'&&!document.getElementById(secondId)&&!inputs[1].hasAttribute('aria-activedescendant')&&!inputs[1].hasAttribute('aria-controls')&&document.activeElement===inputs[1],'Pointer choice did not retain input focus and clean up the exact second-root popup');
 browse[1].click();await waitFor(()=>popup(inputs[1]));check(assertOpen(inputs[1]).id===secondId,'Second picker popup identity changed');
 roots[0].unmount();check(popup(inputs[1])?.id===secondId,'Retiring first root removed another root popup');roots[1].unmount();check(!document.querySelector('[role=listbox]')&&!document.querySelector('[role=option]'),'Popup/option semantics survived owning root teardown');
 `,{styles:true,width:420}),true);
});

test('folder Template choice keeps creation kind, primary action and native keyboard destination consistent',async()=>{
 assert.equal(await authoringScenario(`
 p.isExcalidrawAvailable=()=>true;p.settings.newNodeDefaultType='markdown';const remembered='Drawings/Same.md',selected=[],validated=[];p.settings.lastDrawingTemplatePath=remembered;
 p.creationTemplateOptions=()=>({files:[{path:'Templates/Same.md',kind:'markdown'},{path:remembered,kind:'excalidraw'}],selected:remembered,root:'',validate:(...args)=>validated.push(args)});
 p.createNewNodeInFolder=async(...args)=>{selected.push(args);return page(addFile('Folder/Created.md'))};
 const modal=new M.CreateFolderNoteModal(p,{...origin,path:'folder:Folder',file:null,isFolder:true,name:'Folder'},leaf);modal.open();
 await waitFor(()=>modal.contentEl.querySelector('.kplex-drawing-template input'));const nameInput=modal.contentEl.querySelector('.kplex-create-folder-note-name-setting input');reactInput(nameInput,'Created');
 const kindTab=kind=>modal.contentEl.querySelector('.kplex-creation-types [role=tab][id$="tab-'+kind+'"]'),picker=()=>modal.contentEl.querySelector('.kplex-drawing-template input');
 await waitFor(()=>button(modal,'addRelated.createExcalidraw')?.classList.contains('mod-cta'));check(picker().value===remembered&&kindTab('excalidraw').getAttribute('aria-selected')==='true','Remembered drawing path/type lost');
 check(modal.contentEl.querySelectorAll('.kplex-creation-type-panel:not([hidden]) .kplex-field-actions button').length===1&&!button(modal,'common.cancel'),'Multiple create actions or footer cancellation survived');
 kindTab('markdown').click();await waitFor(()=>picker().value===t('template.none'));picker().focus();reactInput(picker(),'Templates/Same');await waitFor(()=>document.querySelector('.kplex-search-results button'));check(!document.querySelector('.kplex-search-results').textContent.includes(remembered),'Markdown tab exposed a drawing');document.querySelector('.kplex-search-results button').click();
 await waitFor(()=>picker().value==='Templates/Same.md');kindTab('excalidraw').click();await waitFor(()=>picker().value===remembered);kindTab('markdown').click();await waitFor(()=>picker().value==='Templates/Same.md'&&!button(modal,'addRelated.createMarkdown').disabled);
 check(nameInput.value==='Created'&&selected.length===0&&validated.length===0&&p.settings.lastDrawingTemplatePath===remembered,'Tab/template selection changed common drafts or executed file work');
 const event=new KeyboardEvent('keydown',{key:'Enter',ctrlKey:true,bubbles:true,cancelable:true});for(const handler of [...modal.scope.handlers].filter(h=>h.key==='Enter'&&h.modifiers.join('+')==='Mod'))handler.callback(event);
 await waitFor(()=>selected.length===1);check(selected[0][2]==='markdown'&&selected[0][4]==='Templates/Same.md','Keyboard creation disagreed with selected template');check(validated.length===1&&validated[0][0]==='Templates/Same.md'&&validated[0][1]==='markdown','Save skipped captured template validation');modal.close();
 p.isExcalidrawAvailable=()=>false;const constrained=new M.CreateFolderNoteModal(p,{...origin,path:'folder:Folder',file:null,isFolder:true,name:'Folder'},leaf);constrained.open();
 await waitFor(()=>constrained.contentEl.querySelector('.kplex-drawing-template input'));reactInput(constrained.contentEl.querySelector('.kplex-create-folder-note-name-setting input'),'Plain');
 await waitFor(()=>!button(constrained,'addRelated.createMarkdown').disabled);check(!constrained.contentEl.querySelector('[role=tab][id$="tab-excalidraw"]')&&constrained.contentEl.querySelector('.kplex-drawing-template input').value===t('template.none'),'Markdown-only form silently retained drawing template');check(p.settings.lastDrawingTemplatePath===remembered,'Local fallback erased remembered drawing template');constrained.close();
 `,{styles:true}),true);
});

test('placeholder Template choice locks accepted partial type/path and retry retains its exact file',async()=>{
 assert.equal(await authoringScenario(`
 const chosen='Templates/Plain.md',created=addFile('Folder/Partial.md'),calls=[],validated=[];
 const modal=new M.MaterializeGhostModal(p.app,'Partial',[{folderPath:'Folder',label:'Folder'}],true,'markdown',async(...args)=>{calls.push(args);if(calls.length===1)throw new M.PartialRelatedFileError(created,new Error('Second write failed'));return true},false,{files:[{path:chosen,kind:'markdown'},{path:'Drawings/Sketch.md',kind:'excalidraw'}],selected:chosen,root:'',validate:(...args)=>validated.push(args)});modal.open();
 await waitFor(()=>modal.contentEl.querySelector('.kplex-drawing-template input'));const markdown=()=>button(modal,'addRelated.createMarkdown');
 check(markdown().classList.contains('mod-cta')&&modal.contentEl.querySelector('[role=tab][id$="tab-markdown"]').getAttribute('aria-selected')==='true','Initial explicit template and output kind disagree');markdown().click();
 await waitFor(()=>modal.contentEl.querySelector('.kplex-add-related-recovery'));check(modal.contentEl.querySelector('.kplex-drawing-template input').disabled&&[...modal.contentEl.querySelectorAll('.kplex-creation-types [role=tab]')].every(tab=>tab.disabled),'Partial outcome did not lock kind/template');
 markdown().click();await waitFor(()=>calls.length===2);check(calls[0][0]==='markdown'&&calls[1][2]===created&&calls[1][4]===chosen,'Retry changed template, kind or native file');check(validated.length===1,'Partial recovery re-executed template validation');modal.close();
 `,{styles:true}),true);
});

test('journal invocation restores a Parent field and retains a separate memory callback without linking on open',async()=>{
 assert.equal(await authoringScenario(`
 let remembered='';const modal=new M.NewRelatedNoteModal(p,origin,'parent',undefined,leaf,target,{initialOntology:'Parent',additiveOnly:true,onOntologySelected:async field=>{remembered=field}});modal.open();
 await waitFor(()=>field(modal));check(field(modal).value==='Parent'&&modal.contentEl.querySelector('.kplex-add-related-role-select').value==='parent','Journal field/role was not restored');
 check(name(modal).value===p.index.titleFor(target)&&links.length===0&&!remembered,'Opening a proposed daily link wrote data');
 button(modal,'addRelated.link').click();await waitFor(()=>links.length===1);check(remembered==='Parent','Chronological memory callback did not receive the confirmed field');
 modal.close();
 `),true);
});

test('materialization retains Daily Notes as the sole primary retry after a partial daily creation',async()=>{
 assert.equal(await authoringScenario(`
 const file=addFile('Folder/Daily.md'),calls=[];let ordinary=0;
 const modal=new M.MaterializeGhostModal(p.app,'Daily',[{folderPath:'Folder',label:'Folder'}],false,'markdown',async()=>{ordinary++;return true},false,
  {files:[],selected:'',root:''},undefined,{path:file.path,create:async(...args)=>{calls.push(args);if(calls.length===1)throw new M.PartialRelatedFileError(file,new Error('Daily completion pending'));return true}});
 modal.open();await waitFor(()=>modal.contentEl.querySelector('.kplex-creation-types'));
 button(modal,'ghost.createDailyNote').click();await waitFor(()=>modal.contentEl.querySelector('.kplex-add-related-recovery'));
 const daily=button(modal,'ghost.createDailyNote'),physical=button(modal,'addRelated.createMarkdown');
 check(daily.classList.contains('mod-cta')&&!daily.disabled&&physical.disabled&&!physical.classList.contains('mod-cta'),'Daily retry and physical tab disagree on primary action');
 const event=new KeyboardEvent('keydown',{key:'Enter',ctrlKey:true,bubbles:true,cancelable:true});for(const handler of modal.scope.handlers)if(handler.key==='Enter'&&handler.modifiers.join('+')==='Mod')handler.callback(event);
 await waitFor(()=>!modal.modalEl.isConnected);check(calls.length===2&&calls[1][0]===file&&ordinary===0,'Daily retry changed its retained file or invoked ordinary creation');
 `,{styles:true}),true);
});

for(const drawing of [false,true])test('linking footer keeps one compact native action and no creation tabs: '+drawing,async()=>{
 assert.equal(await authoringScenario(`
 p.isExcalidrawAvailable=()=>${drawing};const modal=openComposer(target);await waitFor(()=>modal.contentEl.querySelector('.kplex-add-related-link-button'));
 const footer=modal.contentEl.querySelector('.kplex-form-actions'),buttons=[...footer.querySelectorAll('button')];check(buttons.length===1&&!button(modal,'common.cancel'),'Linking keeps only Link and relies on native dismissal');
 const link=buttons[0].getBoundingClientRect(),area=modal.contentEl.querySelector('.kplex-add-related-action-area').getBoundingClientRect(),icon=buttons[0].querySelector('.kplex-icon').getBoundingClientRect();
 check(Math.abs(area.width-link.width)<.5,'Missing create buttons leave a reserved gap');
 check(Math.abs((icon.left+icon.right)-(link.left+link.right))<1&&Math.abs((icon.top+icon.bottom)-(link.top+link.bottom))<1,'Link icon is not centered');
 check(!modal.contentEl.querySelector('.kplex-add-related-type-button')&&!modal.contentEl.querySelector('.kplex-creation-types'),'Creation controls remain during linking');modal.close();
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
  const actions=[...modal.contentEl.querySelectorAll('.kplex-add-related-type-button')],expected=actions[0];
  check(expected.disabled&&expected.classList.contains('mod-cta')&&expected.dataset.kplexPrimaryAction==='true','Remembered native CTA disappears while disabled: '+kind);
  check(actions.length===1&&modal.contentEl.querySelector('[role=tab][id$="tab-'+kind+'"]').getAttribute('aria-selected')==='true','Only the remembered file type is active');
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
 const viewport=new EventTarget(),live=new Map(),add=viewport.addEventListener.bind(viewport),remove=viewport.removeEventListener.bind(viewport),listenerCount=()=>[...live.values()].reduce((sum,set)=>sum+set.size,0),wrappedViewport=new Map(),wrappedWindow=new Map(),windowLive=new Set(),addWindow=window.addEventListener.bind(window),removeWindow=window.removeEventListener.bind(window);let delivery=null;
 Object.assign(viewport,{offsetLeft:0,offsetTop:0,width:390,height:780});
 const wrap=(listener,target,type)=>function(event){const previous=delivery;delivery={listener,target,type};try{return typeof listener==='function'?listener.call(this,event):listener.handleEvent(event)}finally{delivery=previous}};
 viewport.addEventListener=(type,listener,options)=>{if(!live.has(type))live.set(type,new Set());live.get(type).add(listener);if(!wrappedViewport.has(type))wrappedViewport.set(type,new Map());const callbacks=wrappedViewport.get(type);if(!callbacks.has(listener))callbacks.set(listener,wrap(listener,'viewport',type));add(type,callbacks.get(listener),options)};viewport.removeEventListener=(type,listener,options)=>{remove(type,wrappedViewport.get(type)?.get(listener)??listener,options);live.get(type)?.delete(listener)};
 window.addEventListener=(type,listener,options)=>{if(type!=='resize')return addWindow(type,listener,options);windowLive.add(listener);if(!wrappedWindow.has(listener))wrappedWindow.set(listener,wrap(listener,'window',type));return addWindow(type,wrappedWindow.get(listener),options)};
 window.removeEventListener=(type,listener,options)=>{if(type!=='resize')return removeWindow(type,listener,options);windowLive.delete(listener);return removeWindow(type,wrappedWindow.get(listener)??listener,options)};
 Object.defineProperty(window,'visualViewport',{configurable:true,value:viewport});
 const nativeShape=new CSSStyleSheet();nativeShape.replaceSync('body>.modal{display:flex;flex-direction:column}.modal-title{flex:none}');document.adoptedStyleSheets=[...document.adoptedStyleSheets,nativeShape];
 const parent={...origin,path:'folder:Folder',file:null,isFolder:true,name:'Folder'};
 for(const create of [()=>new M.CreateFolderNoteModal(p,parent,leaf,{},true),()=>new M.NewRelatedNoteModal(p,origin,'child',undefined,leaf),()=>new M.CreatePeriodicNoteModal(p,'periodic:day','Today.md',leaf,()=>true,()=>{}),()=>new M.ExternalFileImportBatchModal(p,origin,{files:[new File(['one'],'One.md')],directory:false},'child',leaf,()=>true,()=>{})]){
   const modal=create(),baseline=listenerCount(),windowBaseline=windowLive.size,setProps=modal.modalEl.setCssProps,writes=[];let updates=0,windowResizes=0;
   // React-mounted controls yield to the browser; a real owner-window resize may arrive during
   // that wait. Count its delivery rather than confusing its legitimate CSS update with a lease.
   const resized=()=>windowResizes++;window.addEventListener('resize',resized,true);
   modal.modalEl.setCssProps=function(values){if('--kplex-visible-height' in values){updates++;writes.push(delivery)}return setProps.call(this,values)};
   try{modal.open();await waitFor(()=>modal.contentEl.querySelector('input,select,button'));
   check(modal.modalEl.classList.contains('kplex-mobile-fullscreen-modal')&&writes.filter(receipt=>!receipt).length===1&&updates===1+windowResizes,'Shared mobile shell was bypassed or duplicated: '+JSON.stringify({modal:modal.constructor.name,updates,windowResizes,listeners:listenerCount()-baseline}));
   const beforeResize=updates;
   viewport.height=320;viewport.offsetTop=24;viewport.dispatchEvent(new Event('resize'));
   check(updates===beforeResize+1&&modal.modalEl.style.getPropertyValue('--kplex-visible-height')==='320px'&&modal.modalEl.style.getPropertyValue('--kplex-visible-top')==='24px','Keyboard viewport was not applied exactly once');
   const resizeOwner=writes.at(-1);viewport.dispatchEvent(new Event('scroll'));check(updates===beforeResize+2,'Viewport scroll did not update exactly once');const scrollOwner=writes.at(-1);window.dispatchEvent(new Event('resize'));check(updates===beforeResize+3,'Owning window resize did not update exactly once');const windowOwner=writes.at(-1),lease=resizeOwner.listener;
   check(resizeOwner.target==='viewport'&&scrollOwner.target==='viewport'&&windowOwner.target==='window'&&scrollOwner.listener===lease&&windowOwner.listener===lease&&live.get('resize').has(lease)&&live.get('scroll').has(lease)&&windowLive.has(lease),'Three viewport events do not share one exact modal lease callback');
   const content=modal.contentEl;check(getComputedStyle(content).overflowY==='auto','Keyboard-sized content cannot scroll');
   content.scrollTop=content.scrollHeight;const buttons=[...content.querySelectorAll('.kplex-form-actions button')];const last=buttons.at(-1);if(last)check(last.getBoundingClientRect().bottom<=content.getBoundingClientRect().bottom+1,'Actions cannot be reached by scrolling');
   modal.close();const retiredUpdates=updates;await waitFor(()=>listenerCount()===baseline&&windowLive.size===windowBaseline+1);check(!modal.modalEl.classList.contains('kplex-mobile-fullscreen-modal')&&!live.get('resize').has(lease)&&!live.get('scroll').has(lease)&&!windowLive.has(lease),'Viewport listener leaked on dismissal');
   viewport.height=780;viewport.dispatchEvent(new Event('resize'));window.dispatchEvent(new Event('resize'));check(updates===retiredUpdates&&modal.modalEl.style.getPropertyValue('--kplex-visible-height')==='320px','Retired modal received viewport work');
   const beforeReopen=updates,resizesBeforeReopen=windowResizes;
   modal.open();await waitFor(()=>modal.contentEl.querySelector('button'));check(updates===beforeReopen+1+windowResizes-resizesBeforeReopen&&modal.modalEl.style.getPropertyValue('--kplex-visible-height')==='780px','Reopened modal did not reacquire exactly one viewport lease');const beforeReopenResize=updates;viewport.dispatchEvent(new Event('resize'));check(updates===beforeReopenResize+1&&writes.at(-1).listener!==lease,'Reopened modal did not acquire one new exact callback');modal.close();await waitFor(()=>listenerCount()===baseline&&windowLive.size===windowBaseline+1);
   }finally{modal.close();window.removeEventListener('resize',resized,true);}
 }
 `,{styles:true,width:390,height:800}),true);
});

for(const width of [390,1000])for(const theme of ['theme-light','theme-dark'])for(const locale of ['en','de'])test(`shared creation form geometry, typography and action ownership (${width}px, ${theme}, ${locale})`,async()=>{
 assert.equal(await authoringScenario(`
 document.body.className=${JSON.stringify(theme)};
 p.translator=M.createTranslator(${JSON.stringify(locale)});
 p.creationTemplateOptions=()=>({root:'Templates',selected:'Templates/Drawing.md',files:[{path:'Templates/Drawing.md',kind:'excalidraw'},{path:'Templates/Markdown.md',kind:'markdown'}]});
 // The finite browser host has theme tokens but no installed Obsidian base sheet. Give both
 // native dropdown owners the same host font/height before comparing production form layout.
 const nativeDropdowns=new CSSStyleSheet();nativeDropdowns.replaceSync('.kplex-modal .dropdown{font-family:var(--font-interface);font-size:var(--font-ui-medium);height:var(--input-height);box-sizing:border-box}');document.adoptedStyleSheets=[...document.adoptedStyleSheets,nativeDropdowns];
 p.isExcalidrawAvailable=()=>true;p.settings.folderCreationTab='note';
 const modal=new M.CreateFolderNoteModal(p,{...origin,path:'folder:Folder',file:null,isFolder:true,name:'Folder'},leaf,{},true);modal.open();
 await waitFor(()=>modal.contentEl.querySelectorAll('select').length===1&&modal.contentEl.querySelector('.kplex-drawing-template .kplex-native-combobox input')&&modal.contentEl.querySelector('[role="tab"][id$="tab-folder"]'));
 const form=modal.contentEl.getBoundingClientRect(),note=modal.nameInput.getBoundingClientRect();
 check(note.width>=form.width*.95,'Note name is not full width '+JSON.stringify({note:note.width,form:form.width}));
 const completion=modal.contentEl.querySelector('.kplex-creation-completion'),template=modal.contentEl.querySelector('.kplex-drawing-template');check(completion.classList.contains('kplex-form-inline')&&template.classList.contains('kplex-form-inline'),'Completion and Template must use the shared inline labelled field');
 const select=completion.querySelector('select'),combobox=template.querySelector('.kplex-native-combobox'),templateInput=combobox.querySelector('input'),browse=combobox.querySelector('.kplex-fuzzy-disclosure'),controls=[select,combobox],styles=controls.map(control=>getComputedStyle(control));
 equal(styles.map(style=>[style.fontFamily,style.fontSize,style.height]),[...Array(2)].map(()=>[styles[0].fontFamily,styles[0].fontSize,styles[0].height]),'Option typography or height differs');
 equal([getComputedStyle(templateInput).fontFamily,getComputedStyle(templateInput).fontSize],[styles[1].fontFamily,styles[1].fontSize],'Search input bypassed the native combobox typography owner');
 const rows=[completion,template],labels=rows.map(row=>row.querySelector('label')),labelStyles=labels.map(label=>getComputedStyle(label));equal(labelStyles.map(style=>[style.fontFamily,style.fontSize]),[...Array(2)].map(()=>[labelStyles[0].fontFamily,labelStyles[0].fontSize]),'Paired labels must match while native control typography stays host-owned');
 const bounds=controls.map(control=>control.getBoundingClientRect()),templateLabel=labels[1].getBoundingClientRect(),inputBounds=templateInput.getBoundingClientRect();
 check(labels[1].textContent===p.translator('drawing.template')&&labels[0].textContent===p.translator('creation.action'),'Localized Template or completion caption missing');
 check(select.classList.contains('dropdown')&&combobox.classList.contains('dropdown')&&templateInput.type==='text'&&templateInput.value==='Templates/Drawing.md','Template replaced searchable native chrome or lost committed path');
 const templateRow=template.getBoundingClientRect(),panel=template.closest('.kplex-creation-type-panel').getBoundingClientRect(),typeTabs=modal.contentEl.querySelector('.kplex-creation-types > [role=tablist]').getBoundingClientRect();
 check(Math.abs(inputBounds.width-bounds[1].width)<1&&bounds[1].width>=templateRow.width*.55,'Template input must retain most of the available row width');if(typeTabs.width<=360)check(templateLabel.bottom<=bounds[1].top,'Narrow Template label must wrap above input/action');else check(templateLabel.right<bounds[1].left,'Wide Template label must share the input row');
 check(Math.abs(bounds[0].right-form.right)<1&&bounds[1].right<templateRow.right&&templateRow.left>panel.left&&templateRow.right<panel.right,'Each native control must fill its own form or inset type-panel container');
 check(completion.getBoundingClientRect().bottom<=typeTabs.top,'After saving must precede the type tabs');
 check(labels[0].getBoundingClientRect().right<bounds[0].left&&bounds[0].width>=form.width*.65&&Math.abs(completion.getBoundingClientRect().width-form.width)<1,'Action must use a short inline label and a long native select');
 check(labels[0].htmlFor===select.id&&labels[1].htmlFor===templateInput.id&&templateInput.getAttribute('aria-labelledby')===labels[1].id&&!templateInput.hasAttribute('aria-label')&&browse.getAttribute('aria-label')===p.translator('template.browse'),'Native controls lost visible-label or disclosure accessibility ownership');
 const actions=template.querySelector('.kplex-field-actions'),actionBounds=actions.getBoundingClientRect();
 check(bounds[1].right<actionBounds.left&&Math.abs(bounds[1].top-actionBounds.top)<2,'Create action must sit beside Template without overlap');
 check(!modal.contentEl.querySelector('button[title]'),'A native title can stack tooltips');
 for(const action of actions.querySelectorAll('button')){check(action.classList.contains('kplex-icon-action')&&action.getAttribute('aria-label')&&action.querySelector('svg'),'Footer action bypasses shared accessible icons');}
 check(actions.querySelectorAll('button').length===1&&!button(modal,'common.cancel'),'Selected type has multiple create actions or a footer Cancel');
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
 let modal=open();await waitFor(()=>modal.contentEl.querySelector('[role="tab"][id$="tab-folder"]'));
 check(modal.folderTab==='note'&&!modal.tabPanels.note.hidden,'Note creation should be the default without another click');
 check(!button(modal,'moveNode.move'),'Creation offered a move');
 input(modal.nameInput,'Note draft');modal.contentEl.querySelector('[role="tab"][id$="tab-folder"]').click();await waitFor(()=>!modal.tabPanels.folder.hidden);
 input(modal.tabPanels.folder.querySelector('input'),'Child');modal.contentEl.querySelector('[role="tab"][id$="tab-note"]').click();await waitFor(()=>!modal.tabPanels.note.hidden);
 check(modal.nameInput.value==='Note draft','Tab switch discarded note draft');
 modal.contentEl.querySelector('[role="tab"][id$="tab-folder"]').click();await waitFor(()=>!modal.tabPanels.folder.hidden);
 check(modal.tabPanels.folder.querySelector('input').value==='Child','Tab switch discarded folder draft');
 check(!button(modal,'folderActions.create').disabled,'Folder create disabled '+JSON.stringify({name:modal.folderName,valid:modal.canComplete(),invalidated:modal.invalidated,busy:modal.creating,folder:modal.nativeFolder?.path,notices}));button(modal,'folderActions.create').click();await waitFor(()=>!modal.modalEl.isConnected);check(folders.has('Folder/Child'),'Subfolder was not created');
 modal=open();await waitFor(()=>modal.contentEl.querySelector('[role="tab"][id$="tab-folder"]'));check(modal.folderTab==='folder'&&!modal.tabPanels.folder.hidden,'Last tab was not remembered');
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

test('Finder trees skip .DS_Store and preserve every file in both deep sibling directories',async()=>{
 assert.equal(await authoringScenario(`
 const folderPage={...origin,path:'folder:Folder',file:null,isFolder:true,name:'Folder'};
 const entry=(name,body)=>({name,isFile:true,isDirectory:false,file(done){done(new File([body],name))}});
 const dir=(name,children)=>({name,isDirectory:true,isFile:false,createReader(){let read=false;return {readEntries(done){done(read?[]:(read=true,children))}}}});
 const deepName='Le'+String.fromCharCode(769)+'vel2',writtenName=deepName.normalize('NFC');
 const ignored=entry('.DS_Store','Finder metadata');
 const rootEntry=dir('Incoming',[entry('First.md','# First'),entry('Second.md','# Second'),ignored,dir('Level1',[
  dir(deepName,[ignored,entry('Deep.md','# Note'),entry('Data.bin',new Uint8Array([0,255,128])),dir('Empty',[])]),
  dir('Sibling',[ignored,entry('Sibling.md','# Sibling'),entry('Second.bin',new Uint8Array([1,2,3]))])
 ])]);
 const nativeCreateFolder=p.app.vault.createFolder,nativeCreateBinary=p.app.vault.createBinary;
 p.app.vault.createFolder=path=>nativeCreateFolder(path.normalize('NFC'));
 p.app.vault.createBinary=async(path,data)=>path.endsWith('/.DS_Store')?null:nativeCreateBinary(path.normalize('NFC'),data);
 p.createFileWithAutomation=async create=>{await create();throw Error('Copy-only import entered the creation template barrier');};
 p.waitForCreatedFileAutomation=async()=>{throw Error('Copy-only import waited for template completion');};
 const batch=new M.ExternalFileImportBatchModal(p,folderPage,{files:[],directory:true,entries:[rootEntry]},'child',leaf,()=>true,()=>{});
 batch.open();await waitFor(()=>batch.ready);check(!batch.contentEl.querySelector('input[aria-label="'+t('addRelated.ontologyAria')+'"]'),'Folder import offered ontology');
 button(batch,'fileImport.importAll').click();await waitFor(()=>!batch.busy);
 check(!batch.modalEl.isConnected,'Complete discovery was followed by failed writing: '+batch.feedback.textContent);
 check(batch.rows.length===6&&batch.directories.length===5&&!batch.rows.some(row=>row.name==='.DS_Store'),'Preview differs from the supported tree');
 const deep='Folder/Incoming/Level1/'+writtenName;
 const sibling='Folder/Incoming/Level1/Sibling';
 check(folders.has(deep+'/Empty')&&files.has(deep+'/Deep.md')&&files.has(sibling+'/Sibling.md'),'Hierarchy or empty directory lost');
 check(files.has('Folder/Incoming/First.md')&&files.has('Folder/Incoming/Second.md'),'Root files were lost');
 check(new TextDecoder().decode(bytes.get(files.get(deep+'/Deep.md')))==='# Note','Deep Markdown bytes changed');
 equal([...bytes.get(files.get(deep+'/Data.bin'))],[0,255,128],'Deep binary bytes changed');
 equal([...bytes.get(files.get(sibling+'/Second.bin'))],[1,2,3],'Sibling binary bytes changed');
 check(links.length===0,'Folder imports wrote ontology');
 `),true);
});

test('an import into a folder waits for templates before opening a single copied file',async()=>{
 assert.equal(await authoringScenario(`
 const folderPage={...origin,path:'folder:Folder',file:null,isFolder:true,name:'Folder'};
 const source=new File(['# Original'],'One.md'), importActions=[];
 p.createdNoteCompletionControl=()=>({value:'sidecar',choices:['return','sidecar'],onChange:()=>{}});
 p.createFileWithAutomation=async create=>{const file=await create();importActions.push(['template',file.path]);return file;};
 p.finishNewRelatedNode=async (page,_leaf,completion)=>{importActions.push([completion,page.path]);};
 const batch=new M.ExternalFileImportBatchModal(p,folderPage,{files:[source],directory:false},'child',leaf,()=>true,()=>{});
 batch.open();await waitFor(()=>batch.ready);button(batch,'fileImport.importAll').click();await waitFor(()=>!batch.modalEl.isConnected);
 equal(importActions,[['template','Folder/One.md'],['sidecar','Folder/One.md']],'The copied note opened before template completion');
 check(links.length===0,'A folder copy opening a note wrote ontology');
 `),true);
});

test('folder import refuses to finish a copy when the selected ancestor changes during the byte read',async()=>{
 assert.equal(await authoringScenario(`
 const folderPage={...origin,path:'folder:Folder',file:null,isFolder:true,name:'Folder'};
 let release,entered;const gate=new Promise(done=>release=done),readStarted=new Promise(done=>entered=done);
 const source=new File(['# Deep'],'Deep.md'),read=source.arrayBuffer.bind(source);
 source.arrayBuffer=async()=>{entered();await gate;return read()};
 const file={name:source.name,isFile:true,isDirectory:false,file(done){done(source)}};
 const dir=(name,child)=>({name,isDirectory:true,isFile:false,createReader(){let read=false;return {readEntries(done){done(read?[]:(read=true,[child]))}}}});
 const batch=new M.ExternalFileImportBatchModal(p,folderPage,{files:[],directory:true,entries:[dir('Incoming',dir('Nested',file))]},'child',leaf,()=>true,()=>{});
 batch.open();await waitFor(()=>batch.ready);button(batch,'fileImport.importAll').click();await readStarted;
 const imported=folders.get('Folder/Incoming'),replaced=Object.assign(new M.TFolder(),{path:'Folder/Incoming',children:[],parent:folder});
 folders.set(replaced.path,replaced);release();await waitFor(()=>!batch.busy);
 check(writes.every(write=>write[0]!=='binary'),'Copy continued through a replaced ancestor');
 check(folders.get(replaced.path)===replaced&&imported!==replaced,'Copy mutated the replacement');
 batch.close();
 `),true);
});

test('folder import retries a failed deep copy without replacing the folders or files already written',async()=>{
 assert.equal(await authoringScenario(`
 const folderPage={...origin,path:'folder:Folder',file:null,isFolder:true,name:'Folder'};
 const entry=(name,body)=>({name,isFile:true,isDirectory:false,file(done){done(new File([body],name))}});
 const dir=(name,children)=>({name,isDirectory:true,isFile:false,createReader(){let read=false;return {readEntries(done){done(read?[]:(read=true,children))}}}});
 const rootEntry=dir('Incoming',[entry('First.md','# First'),dir('Level1',[dir('Level2',[entry('Deep.bin',new Uint8Array([0,255])),dir('Empty',[])])])]);
 const nativeCreateFolder=p.app.vault.createFolder,nativeCreateBinary=p.app.vault.createBinary;
 let failFolder=true,failFile=true;
 p.app.vault.createFolder=async path=>failFolder&&path.endsWith('/Level2')?null:nativeCreateFolder(path);
 p.app.vault.createBinary=async(path,data)=>failFile&&path.endsWith('/Deep.bin')?null:nativeCreateBinary(path,data);
 const batch=new M.ExternalFileImportBatchModal(p,folderPage,{files:[],directory:true,entries:[rootEntry]},'child',leaf,()=>true,()=>{});
 batch.open();await waitFor(()=>batch.ready);button(batch,'fileImport.importAll').click();await waitFor(()=>!batch.busy);
 check(batch.feedback.textContent===t('folderActions.failed')&&!batch.createdDirectories.has('Incoming/Level1/Level2'),'Missing directory handle was accepted as a receipt');
 failFolder=false;button(batch,'fileImport.importAll').click();await waitFor(()=>!batch.busy);
 const first=files.get('Folder/Incoming/First.md'),deep='Folder/Incoming/Level1/Level2';
 const planted=folders.get(deep+'/Empty');
 check(first&&planted&&batch.modalEl.isConnected&&!files.has(deep+'/Deep.bin'),'Controlled partial writes differ');
 check(batch.feedback.textContent===t('fileImport.failed'),'Missing file handle did not use the normal localized copy failure');
 failFile=false;button(batch,'fileImport.importAll').click();await waitFor(()=>!batch.modalEl.isConnected);
 check(files.get('Folder/Incoming/First.md')===first&&folders.get(deep+'/Empty')===planted,'Retry replaced accepted copies');
 check(writes.filter(write=>write[0]==='binary').length===2&&writes.filter(write=>write[0]==='folder').length===4,'Retry repeated a Vault write');
 equal([...bytes.get(files.get(deep+'/Deep.bin'))],[0,255],'Retry altered binary data');check(links.length===0,'Folder retry wrote ontology');
 `),true);
});

test('import refuses to link or retry a copy renamed during the creation automation wait',async()=>{
 assert.equal(await authoringScenario(`
 const batch=new M.ExternalFileImportBatchModal(p,origin,{files:[new File(['# Original'],'Original.md')],directory:false},'child',leaf,()=>true,()=>{});
 let renamed;
 p.waitForCreatedFileAutomation=async file=>{if(!renamed){renamed=file;await p.app.fileManager.renameFile(file,'Renamed.md');}};
 batch.open();await waitFor(()=>batch.ready);button(batch,'fileImport.importAll').click();await waitFor(()=>!batch.busy);
 check(renamed&&batch.rows[0].file===renamed&&files.get('Renamed.md')===renamed,'Copy receipt lost across automation');
 check(!links.length&&batch.modalEl.isConnected,'Import linked or completed with an unapproved path');
 button(batch,'fileImport.importAll').click();await waitFor(()=>!batch.busy);
 check(!links.length&&writes.filter(write=>write[0]==='binary').length===1&&!files.has('Original.md'),'Retry created another copy or linked the renamed file');
 batch.close();
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

test('daily-gap consent reviews only after explicit creation and never on Cancel or stale candidate',async()=>{
 assert.equal(await authoringScenario(`
 let created=0,current=true,releaseOpening;const reviewed=[],effects=[];
 const opening=new Promise(resolve=>{releaseOpening=resolve;});
 p.createdNoteCompletionControl=()=>({value:'sidecar',choices:['sidecar'],onChange:()=>{}});
 p.createPeriodicPinNote=async()=>{created++;return target};p.finishNewRelatedNode=async(_page,_leaf,action)=>{effects.push(action);if(action==='sidecar')await opening;};
 const offer={load:async alive=>alive()?{label:'Earlier daily note',current:()=>current}:null,open:async(page,alive)=>{check(alive(),'Retired gap consent');reviewed.push(page)}};
 const open=()=>{const modal=new M.CreatePeriodicNoteModal(p,'periodic:day','Today.md',leaf,()=>true,()=>{},undefined,offer);modal.open();return modal};
 let modal=open();await waitFor(()=>modal.contentEl.querySelector('input[type=checkbox]'));check(modal.contentEl.textContent.includes('Earlier daily note'),'Gap target is not visible');modal.close();check(!created&&!reviewed.length,'Cancel created or linked a note');
 modal=open();await waitFor(()=>modal.contentEl.querySelector('input[type=checkbox]'));let toggle=modal.contentEl.querySelector('input[type=checkbox]');check(!toggle.checked,'Gap consent must default off');toggle.click();button(modal,'pins.createAction').click();
 await waitFor(()=>effects.includes('sidecar'));equal(effects,['follow','sidecar'],'The optional link altered the opening order');check(!reviewed.length,'Link review ran while the editor was still opening');releaseOpening();
 await waitFor(()=>!modal.busy&&!modal.modalEl.isConnected);check(created===1&&reviewed.length===1&&reviewed[0]===target,'Explicit creation did not open the reviewed gap composer');
 modal=open();await waitFor(()=>modal.contentEl.querySelector('input[type=checkbox]'));modal.contentEl.querySelector('input[type=checkbox]').click();current=false;button(modal,'pins.createAction').click();await waitFor(()=>!modal.busy);check(created===2&&reviewed.length===1,'Stale candidate opened a gap composer');
 `),true);
});

test('late native editor focus does not disable the reviewed daily-gap Link button',async()=>{
 assert.equal(await authoringScenario(`
 const modal=openComposer(target,{additiveOnly:true});
 await waitFor(()=>modal.contentEl.querySelector('button[data-kplex-primary-action=true]'));
 const editor=document.body.createEl('button');editor.focus();
 check(document.activeElement===editor,'Native focus race fixture did not move focus');
 modal.contentEl.querySelector('button[data-kplex-primary-action=true]').click();
 await waitFor(()=>links.length===1);
 check(links[0][0].file===origin.file&&links[0][2].file===target.file,'The reviewed endpoints changed');
 editor.remove();modal.close();
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

test('new-note Markdown Template and reciprocal receipt retain exact content through parser wait and inverse retry',async()=>{
 assert.equal(await authoringScenario(`
 p.settings.alsoWriteInverseOntology=true;p.settings.hierarchy={...p.settings.hierarchy,parents:[],children:['Child / Parent']};p.settings.newNodeDefaultType='excalidraw';p.isExcalidrawAvailable=()=>true;
 const templatePath='Templates/Markdown.md',templateFile=addFile(templatePath),validations=[],creations=[],operations=[],effects=[],commits=[],documents=new Map();
 const template={aliases:['Template alias'],title:'Template title',tags:['template-tag'],custom:{keep:'template'},Parent:['[[Old parent]]']};
 documents.set(origin.file,{frontmatter:{aliases:['Origin alias'],title:'Origin title',custom:{keep:'origin'},Child:['[[Old child]]']},body:'Origin body'});
 p.creationTemplateOptions=()=>({files:[{path:templatePath,kind:'markdown'},{path:'Templates/Drawing.md',kind:'excalidraw'}],root:'Templates',selected:'',validate:(path,kind)=>{check(files.get(path)===templateFile&&kind==='markdown','Template identity or kind changed');validations.push([path,kind])}});
 let releaseParser,parserEntered=false,failInverse=true,createdFile,receipt;
 const parserBarrier=new Promise(resolve=>{releaseParser=resolve});
 p.createNewRelatedFileForOrigin=async(...args)=>{creations.push(args);check(args[2]==='markdown'&&args[5]===templatePath,'Selected Template did not reach the native create port');createdFile=addFile(args[1]+'.md');const frontmatter=structuredClone(template);frontmatter.aliases.push(args[3]);documents.set(createdFile,{frontmatter,body:'Template body retained'});return createdFile};
 p.linkNewRelatedFile=async(...args)=>{operations.push(args);check(args[2]===createdFile&&args[3]==='Child'&&args[4]==='Visible alias'&&!args[6],'Initial link changed captured authoring values');
  receipt=M.createReciprocalWriteReceipt({app:p.app,first:{file:origin.file,target:createdFile,field:'Child'},second:{file:createdFile,target:origin.file,field:'Parent'},current:()=>p.settings.alsoWriteInverseOntology&&M.reciprocalOntologyFields(M.ontologyConfiguration(p.settings),'Child','child')?.inverse==='Parent',
   write:async(write,current)=>{check(current(),'Stale native property callback');effects.push([write.file.path,write.field]);if(write.file===createdFile&&failInverse)throw Error('Controlled inverse failure');const frontmatter=documents.get(write.file).frontmatter;frontmatter[write.field]=[...frontmatter[write.field],'[['+write.target.path+']]'];if(write.file===origin.file){parserEntered=true;await parserBarrier;check(current(),'Parser wait authorized stale policy')}},failureMessage:()=>t('reciprocal.partial'),unavailableMessage:()=>t('addRelated.endpointChanged')});
  await receipt.retry();return {state:'saved-published',page:page(createdFile)};};
 const modal=new M.NewRelatedNoteModal(p,origin,'child',result=>commits.push([result.state,result.page.file]),leaf);modal.open();await waitFor(()=>name(modal)&&modal.contentEl.querySelector('.kplex-template-picker input'));
 reactInput(name(modal),'Created');reactInput(modal.contentEl.querySelector('.kplex-create-alias-input'),'Visible alias');
 const markdownTab=modal.contentEl.querySelector('.kplex-creation-types [role=tab][id$="tab-markdown"]');markdownTab.click();await waitFor(()=>markdownTab.getAttribute('aria-selected')==='true');
 const picker=modal.contentEl.querySelector('.kplex-template-picker input');picker.focus();reactInput(picker,'Markdown');await waitFor(()=>[...document.querySelectorAll('.kplex-search-results button')].some(item=>item.textContent.includes(templatePath)));
 [...document.querySelectorAll('.kplex-search-results button')].find(item=>item.textContent.includes(templatePath)).click();
 const markdown=()=>modal.contentEl.querySelector('button[aria-label="'+t('addRelated.createMarkdownLink')+'"]'),drawing=()=>modal.contentEl.querySelector('button[aria-label="'+t('addRelated.createExcalidrawLink')+'"]');
 await waitFor(()=>markdown()?.dataset.kplexPrimaryAction==='true'&&!markdown().disabled);check(!drawing()&&modal.contentEl.querySelector('[role=tab][id$="tab-markdown"]').getAttribute('aria-selected')==='true','Selected Markdown tab left a drawing creation action mounted');check(validations.length===0&&creations.length===0,'Template browsing or selection performed a save');
 markdown().click();await waitFor(()=>parserEntered);equal(effects,[[origin.path,'Child']],'Inverse write escaped the controlled parser publication barrier');check(modal.modalEl.isConnected&&markdown().disabled&&commits.length===0,'Composer completed or accepted duplicate submit before parser publication');
 equal(validations,[[templatePath,'markdown'],[templatePath,'markdown']],'Save did not validate the captured template before and after remembered ontology');check(creations.length===1&&operations.length===1,'Single save duplicated a create or link callback');
 releaseParser();await waitFor(()=>button(modal,'reciprocal.retry')&&!button(modal,'reciprocal.retry').disabled);
 const recovery=modal.contentEl.querySelector('.kplex-add-related-recovery');check(recovery.textContent.includes(origin.path)&&recovery.textContent.includes(createdFile.path)&&recovery.textContent.includes(t('reciprocal.saved'))&&recovery.textContent.includes(t('reciprocal.pending')),'Partial receipt lost per-file durable status');
 equal(receipt.outcomes.map(item=>item.state),['saved','pending'],'First declaration was not retained as durable');check(name(modal).disabled&&picker.disabled,'Partial recovery left captured drafts editable');check(commits.length===0,'Partial two-file save was announced complete');
 failInverse=false;const retry=button(modal,'reciprocal.retry');retry.click();retry.click();await waitFor(()=>!modal.modalEl.isConnected);
 equal(effects,[[origin.path,'Child'],[createdFile.path,'Parent'],[createdFile.path,'Parent']],'Direct receipt retry repeated the durable forward mutation');check(creations.length===1&&operations.length===1&&validations.length===2,'Retry reissued file creation, original link, or template validation');
 check(files.get(createdFile.path)===createdFile&&commits.length===1&&commits[0][0]==='saved-published'&&commits[0][1]===createdFile,'Completion changed the retained physical file or fired twice');
 equal(documents.get(origin.file),{frontmatter:{aliases:['Origin alias'],title:'Origin title',custom:{keep:'origin'},Child:['[[Old child]]','[['+createdFile.path+']]']},body:'Origin body'},'Forward write changed unrelated origin content');
 equal(documents.get(createdFile),{frontmatter:{aliases:['Template alias','Visible alias'],title:'Template title',tags:['template-tag'],custom:{keep:'template'},Parent:['[[Old parent]]','[['+origin.path+']]']},body:'Template body retained'},'Inverse retry changed aliases, template properties, body or an existing inverse value');
 `,{styles:true,width:420}),true);
});

test('creation type tabs preserve shared drafts, isolated template choices and keyboard Placeholder submission',async()=>{
 assert.equal(await authoringScenario(`
 p.isExcalidrawAvailable=()=>true;p.settings.newNodeDefaultType='markdown';const operations=[],validated=[];
 p.creationTemplateOptions=()=>({files:[{path:'Templates/Article.md',kind:'markdown'},{path:'Drawings/Sketch.md',kind:'excalidraw'}],root:'',selected:'Templates/Article.md',validate:(...args)=>validated.push(args)});
 p.createNewRelatedFileForOrigin=async()=>{throw Error('Placeholder submission created a physical note')};
 p.createPlaceholderRelatedPage=async(...args)=>{operations.push(args);return {...origin,path:args[2],name:args[2],file:null}};
 const modal=openComposer();await waitFor(()=>name(modal)&&modal.contentEl.querySelector('.kplex-creation-types'));
 const tab=kind=>modal.contentEl.querySelector('.kplex-creation-types [role=tab][id$="tab-'+kind+'"]'),picker=()=>modal.contentEl.querySelector('.kplex-template-picker input');
 const alias=modal.contentEl.querySelector('.kplex-create-alias-input'),folderInput=modal.contentEl.querySelector('.kplex-create-folder-row input');reactInput(name(modal),'Unresolved draft');reactInput(alias,'Shared alias');reactInput(folderInput,'/');
 await waitFor(()=>picker().value==='Templates/Article.md');const originalDefault=p.settings.newNodeDefaultType;
 const completion=modal.contentEl.querySelector('.kplex-creation-completion'),types=modal.contentEl.querySelector('.kplex-creation-types');check(types.getBoundingClientRect().bottom<=completion.getBoundingClientRect().top,'Action must follow the full creation type section');
 tab('markdown').focus();tab('markdown').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
 await waitFor(()=>tab('excalidraw').getAttribute('aria-selected')==='true'&&picker().value===t('drawing.blank'));check(document.activeElement===tab('excalidraw'),'Shared tab keyboard selection lost focus');
 picker().focus();reactInput(picker(),'Sketch');await waitFor(()=>document.querySelector('.kplex-search-results button'));check(!document.querySelector('.kplex-search-results').textContent.includes('Article.md'),'Drawing tab exposed Markdown templates');document.querySelector('.kplex-search-results button').click();await waitFor(()=>picker().value==='Drawings/Sketch.md');
 tab('markdown').click();await waitFor(()=>picker().value==='Templates/Article.md');tab('excalidraw').click();await waitFor(()=>picker().value==='Drawings/Sketch.md');
 modal.contentEl.querySelector('.kplex-template-picker .kplex-fuzzy-disclosure').click();await waitFor(()=>document.querySelector('[role=listbox]'));tab('placeholder').click();
 await waitFor(()=>tab('placeholder').getAttribute('aria-selected')==='true'&&!picker()&&!document.querySelector('[role=listbox]'));
 check(name(modal).value==='Unresolved draft'&&alias.value==='Shared alias'&&folderInput.value==='/'&&field(modal).value==='Child','Switching type changed common drafts');
 check(p.settings.newNodeDefaultType===originalDefault&&validated.length===0&&operations.length===0,'Tab/template browsing wrote preferences or files');
 const actions=modal.contentEl.querySelector('.kplex-creation-type-panel:not([hidden]) .kplex-creation-type-actions');check(actions.querySelectorAll('button').length===1&&button(modal,'addRelated.createPlaceholder').dataset.kplexPrimaryAction==='true'&&!button(modal,'common.cancel'),'Placeholder tab did not own the sole default action');
 modal.submitKey(new KeyboardEvent('keydown',{key:'Enter',ctrlKey:true,bubbles:true,cancelable:true}));await waitFor(()=>operations.length===1&&!modal.modalEl.isConnected);check(operations[0][2]==='Unresolved draft'&&operations[0][5]==='Shared alias'&&validated.length===0,'Keyboard Placeholder submission changed shared drafts or executed a template');
 p.isExcalidrawAvailable=()=>false;const limited=openComposer();await waitFor(()=>name(limited));check(!limited.contentEl.querySelector('[role=tab][id$="tab-excalidraw"]')&&limited.contentEl.querySelector('[role=tab][id$="tab-placeholder"]'),'Companion absence did not restrict only the drawing type');limited.close();check(!document.querySelector('[role=listbox]'),'Tab picker popup survived modal close');
 `,{styles:true,width:420}),true);
});

test('Placeholder availability follows stable endpoint policy and projects a newly unsupported selection onto its physical draft',async()=>{
 assert.equal(await authoringScenario(`
 p.isExcalidrawAvailable=()=>true;p.settings.newNodeDefaultType='markdown';let saves=0,validations=0;
 p.creationTemplateOptions=()=>({files:[{path:'Templates/Retained.md',kind:'markdown'}],selected:'Templates/Retained.md',root:'',validate:()=>{validations++}});
 p.createNewRelatedFileForOrigin=async()=>{saves++;throw Error('Availability inspection must not create')};p.createPlaceholderRelatedPage=async()=>{saves++;throw Error('Availability inspection must not create')};
 const modal=openComposer();await waitFor(()=>name(modal)&&modal.contentEl.querySelector('[role=tab][id$="tab-placeholder"]'));
 const tab=kind=>modal.contentEl.querySelector('.kplex-creation-types [role=tab][id$="tab-'+kind+'"]'),picker=()=>modal.contentEl.querySelector('.kplex-template-picker input');
 tab('placeholder').click();await waitFor(()=>button(modal,'addRelated.createPlaceholder'));
 check(button(modal,'addRelated.createPlaceholder').disabled&&tab('placeholder').getAttribute('aria-selected')==='true','An empty name hid a supported type instead of disabling its create action');
 reactInput(name(modal),'Retained name');reactInput(modal.contentEl.querySelector('.kplex-create-alias-input'),'Retained alias');await waitFor(()=>!button(modal,'addRelated.createPlaceholder').disabled);
 check(!modal.contentEl.querySelector('.kplex-relationship-direction'),'Placeholder must hide the ineligible property-direction section');tab('markdown').click();await waitFor(()=>tab('markdown').getAttribute('aria-selected')==='true');
 modal.contentEl.querySelector('.kplex-relationship-direction button').click();
 await waitFor(()=>!tab('placeholder')&&tab('markdown').getAttribute('aria-selected')==='true'&&picker()?.value==='Templates/Retained.md');
 check(button(modal,'addRelated.createMarkdownLink')&&!button(modal,'addRelated.createPlaceholder'),'Projected tab, picker and default action disagree after flipping the property owner');
 check(name(modal).value==='Retained name'&&modal.contentEl.querySelector('.kplex-create-alias-input').value==='Retained alias','Policy projection discarded common authored drafts');
 modal.contentEl.querySelector('.kplex-relationship-direction button').click();await waitFor(()=>tab('placeholder'));tab('placeholder').click();
 p.settings.alsoWriteInverseOntology=true;reactInput(modal.contentEl.querySelector('.kplex-add-related-role-select'),'parent');
 await waitFor(()=>!tab('placeholder')&&tab('markdown').getAttribute('aria-selected')==='true'&&picker()?.value==='Templates/Retained.md');
 check(!button(modal,'addRelated.createPlaceholder')&&button(modal,'addRelated.createMarkdownLink'),'Inverse-policy transition left unsupported Placeholder as the default action');
 check(p.settings.newNodeDefaultType==='markdown'&&saves===0&&validations===0,'Availability projection persisted a type, created a file or evaluated a template');modal.close();
 p.settings.alsoWriteInverseOntology=false;origin.file.extension='png';const attachment=openComposer();await waitFor(()=>name(attachment));check(!attachment.contentEl.querySelector('[role=tab][id$="tab-placeholder"]')&&attachment.contentEl.querySelector('[role=tab][id$="tab-markdown"]'),'Non-Markdown origin offered virtual creation');attachment.close();
 `,{styles:true,width:420}),true);
});

test('Template option pointer ownership preserves tab switching and native Escape dismisses the popup before each creation modal',async()=>{
 assert.equal(await authoringScenario(`
 p.isExcalidrawAvailable=()=>true;p.settings.newNodeDefaultType='markdown';
 const choices={files:[{path:'Templates/Chosen.md',kind:'markdown'},{path:'Drawings/Chosen.md',kind:'excalidraw'}],selected:'',root:'',validate:()=>{throw Error('Popup interaction executed a template')}};
 p.creationTemplateOptions=()=>choices;const parent={...origin,path:'folder:Folder',file:null,isFolder:true,name:'Folder'};
 const factories=[()=>openComposer(),()=>{const modal=new M.CreateFolderNoteModal(p,parent,leaf);modal.open();return modal},()=>{const modal=new M.MaterializeGhostModal(p.app,'Draft',[{folderPath:'Folder',label:'Folder'}],true,'markdown',async()=>{throw Error('Popup interaction created a file')},false,choices,undefined,undefined,p.creationTypeTabControl());modal.open();return modal}];
 for(const create of factories){
  p.settings.newNodeCreationTab='markdown';const modal=create();await waitFor(()=>modal.contentEl.querySelector('.kplex-template-picker input'));
  const input=()=>modal.contentEl.querySelector('.kplex-template-picker input'),tab=kind=>modal.contentEl.querySelector('.kplex-creation-types [role=tab][id$="tab-'+kind+'"]');
  modal.contentEl.querySelector('.kplex-template-picker .kplex-fuzzy-disclosure').click();await waitFor(()=>document.querySelector('[role=listbox]'));
  const popup=document.querySelector('[role=listbox]');check(popup.getAttribute('data-fuzzy-owner')===modal.suggestionOwnerId,'Template portal lost its exact native owner');
  const option=[...popup.querySelectorAll('[role=option]')].find(item=>item.textContent.includes('Templates/Chosen.md'));option.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));option.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true}));option.click();await waitFor(()=>input().value==='Templates/Chosen.md');
  tab('excalidraw').click();await waitFor(()=>tab('excalidraw').getAttribute('aria-selected')==='true');tab('markdown').click();await waitFor(()=>tab('markdown').getAttribute('aria-selected')==='true'&&input().value==='Templates/Chosen.md');
  check(!('isSessionOpen' in modal)||modal.isSessionOpen(),'Selecting an owned template invalidated the parent composer');check(!('canComplete' in modal)||modal.canComplete(),'Selecting an owned template invalidated native completion');
  const browse=()=>modal.contentEl.querySelector('.kplex-template-picker .kplex-fuzzy-disclosure');
  browse().click();await waitFor(()=>input().getAttribute('aria-expanded')==='true');browse().click();await waitFor(()=>input().getAttribute('aria-expanded')==='false'&&input().value==='Templates/Chosen.md');check(document.activeElement===input(),'Disclosure dismissal changed Template focus');
  browse().click();await waitFor(()=>input().getAttribute('aria-expanded')==='true');input().dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));await waitFor(()=>input().getAttribute('aria-expanded')==='false'&&input().value==='Templates/Chosen.md');check(document.activeElement===input()&&modal.modalEl.isConnected,'Direct React Escape changed focus or closed the modal');
  browse().click();await waitFor(()=>input().getAttribute('aria-expanded')==='true');
  const first=new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});modal.onEscapeKey(first);await waitFor(()=>input().getAttribute('aria-expanded')==='false');
  check(first.defaultPrevented&&modal.modalEl.isConnected&&!document.querySelector('[role=listbox]')&&document.activeElement===input(),'Native-first Escape closed the modal, kept a popup or moved focus');
  check(input().value==='Templates/Chosen.md','Escape changed the committed template');
  modal.onEscapeKey(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));await waitFor(()=>!modal.modalEl.isConnected);check(!document.querySelector('[role=listbox]'),'Modal Escape left an owned portal');
 }
 check(writes.length===0&&links.length===0,'Popup interaction performed native creation or relationship writes');
 `,{styles:true,width:420}),true);
});

test('creation tab choices survive cancellation across related, folder and materialization forms without erasing unavailable memories',async()=>{
 assert.equal(await authoringScenario(`
 p.isExcalidrawAvailable=()=>true;p.settings.newNodeDefaultType='markdown';
 p.creationTemplateOptions=()=>({files:[{path:'Drawings/Default.md',kind:'excalidraw'}],selected:'Drawings/Default.md',root:''});
 const tab=(modal,kind)=>modal.contentEl.querySelector('.kplex-creation-types [role=tab][id$="tab-'+kind+'"]'),selected=(modal,kind)=>tab(modal,kind)?.getAttribute('aria-selected')==='true';
 const ready=modal=>waitFor(()=>modal.contentEl.querySelector('.kplex-creation-types'));
 let modal=openComposer();await ready(modal);tab(modal,'markdown').click();await waitFor(()=>selected(modal,'markdown'));modal.close();await p.settingsWriteQueue;
 check(p.settings.newNodeCreationTab==='markdown'&&p.settings.newNodeDefaultType==='markdown'&&p.writes.at(-1).newNodeCreationTab==='markdown','Cancellation lost the explicit tab or changed successful-create memory');
 modal=openComposer();await ready(modal);check(selected(modal,'markdown')&&modal.contentEl.querySelector('.kplex-template-picker input').value===t('template.none'),'A remembered drawing template overrode the explicit Markdown tab');tab(modal,'placeholder').click();await waitFor(()=>selected(modal,'placeholder'));modal.close();
 const parent={...origin,path:'folder:Folder',file:null,isFolder:true,name:'Folder'};
 const folderDialog=new M.CreateFolderNoteModal(p,parent,leaf);folderDialog.open();await ready(folderDialog);check(!tab(folderDialog,'placeholder')&&p.settings.newNodeCreationTab==='placeholder','Physical-folder fallback erased Placeholder memory');folderDialog.close();
 modal=openComposer();await ready(modal);check(selected(modal,'placeholder')&&button(modal,'addRelated.createPlaceholder').disabled,'Reopening an empty related form lost its supported Placeholder tab');modal.close();
 const materialize=()=>new M.MaterializeGhostModal(p.app,'Draft',[{folderPath:'Folder',label:'Folder'}],true,'markdown',async()=>{throw Error('Tab selection created a file')},false,p.creationTemplateOptions(),undefined,undefined,p.creationTypeTabControl());
 let ghost=materialize();ghost.open();await ready(ghost);check(!tab(ghost,'placeholder')&&p.settings.newNodeCreationTab==='placeholder','Materialization fallback erased virtual memory');tab(ghost,'markdown').click();await waitFor(()=>selected(ghost,'markdown'));ghost.close();
 ghost=materialize();ghost.open();await ready(ghost);check(selected(ghost,'markdown')&&ghost.contentEl.querySelector('.kplex-template-picker input').value===t('template.none'),'Materialization did not reopen its last cancelled tab');ghost.close();
 modal=openComposer();await ready(modal);tab(modal,'excalidraw').click();await waitFor(()=>selected(modal,'excalidraw'));modal.close();
 p.isExcalidrawAvailable=()=>false;const constrained=new M.CreateFolderNoteModal(p,parent,leaf);constrained.open();await ready(constrained);check(selected(constrained,'markdown')&&!tab(constrained,'excalidraw')&&p.settings.newNodeCreationTab==='excalidraw','Companion absence replaced remembered drawing with its local fallback');constrained.close();
 p.isExcalidrawAvailable=()=>true;modal=openComposer();await ready(modal);check(selected(modal,'excalidraw')&&modal.contentEl.querySelector('.kplex-template-picker input').value==='Drawings/Default.md','Returning companion did not restore remembered drawing tab/template');modal.close();await p.settingsWriteQueue;
 check(p.settings.newNodeDefaultType==='markdown'&&p.writes.at(-1).newNodeCreationTab==='excalidraw'&&writes.length===0&&links.length===0,'Tab memory required file creation or changed the legacy physical default');
 `,{styles:true,width:420}),true);
});
