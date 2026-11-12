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

test('shared Template search commits exact kind/path only on choice, bounds results and restores abandoned queries',async()=>{
 assert.equal(await authoringScenario(`
 const entries=[{path:'Templates/A/Same.md',kind:'markdown'},{path:'Drawings/B/Same.md',kind:'excalidraw'},...Array.from({length:80},(_,i)=>({path:'Templates/Long/'+i+'.md',kind:'markdown'}))],selected=[],container=host.createDiv(),templateRoot=M.createRoot(container);
 function Picker(){const [path,setPath]=M.React.useState('Templates/A/Same.md'),[kind,setKind]=M.React.useState('markdown');return M.React.createElement(M.DrawingTemplateSelect,{choices:{files:entries,selected:path,root:'',validate:()=>{throw new Error('Discovery executed template validation')}},value:path,kind,translate:t,onChange:(value,nextKind)=>{selected.push([value,nextKind]);setPath(value);setKind(nextKind)}})}
 M.flushSync(()=>templateRoot.render(M.React.createElement(Picker)));const input=container.querySelector('input'),browse=container.querySelector('.kplex-fuzzy-disclosure');
 const waitTemplate=async(predicate,label)=>{try{await waitFor(predicate)}catch(error){throw new Error(label+': '+JSON.stringify({value:input.value,selected,results:document.querySelector('.kplex-search-results')?.textContent})+' '+error)}};
 check(container.querySelector('label').htmlFor===input.id&&!input.hasAttribute('title'),'Shared field label ownership');
 input.focus();reactInput(input,'Same');await waitTemplate(()=>document.querySelectorAll('.kplex-search-results button').length===2,'Duplicate-name search');
 check(selected.length===0,'Query typing committed a path');check(document.querySelector('.kplex-search-results').textContent.includes('Templates/A/Same.md')&&document.querySelector('.kplex-search-results').textContent.includes('Drawings/B/Same.md'),'Duplicate names lost path/type detail');
 reactInput(input,'Drawings/B');await waitTemplate(()=>document.querySelectorAll('.kplex-search-results button').length===1,'Path search');
 input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',ctrlKey:true,bubbles:true,cancelable:true}));await waitTemplate(()=>selected.length===1&&input.value==='Drawings/B/Same.md','Keyboard selection');check(selected[0][1]==='excalidraw','Keyboard choice lost real template kind');
 input.focus();reactInput(input,'Abandoned query');input.blur();await waitTemplate(()=>input.value==='Drawings/B/Same.md','Abandoned query');check(selected.length===1,'Blur changed committed selection');
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
 const input=modal.contentEl.querySelector('.kplex-drawing-template input'),markdown=button(modal,'common.markdown'),drawing=button(modal,'common.excalidraw');
 await waitFor(()=>drawing.classList.contains('mod-cta')&&markdown.disabled);check(input.value===remembered,'Remembered drawing path lost');
 input.focus();reactInput(input,'Templates/Same');await waitFor(()=>document.querySelector('.kplex-search-results button'));document.querySelector('.kplex-search-results button').click();
 await waitFor(()=>markdown.classList.contains('mod-cta')&&!markdown.disabled&&drawing.disabled);check(selected.length===0&&validated.length===0,'Template selection executed file work');
 const event=new KeyboardEvent('keydown',{key:'Enter',ctrlKey:true,bubbles:true,cancelable:true});for(const handler of [...modal.scope.handlers].filter(h=>h.key==='Enter'&&h.modifiers.join('+')==='Mod'))handler.callback(event);
 await waitFor(()=>selected.length===1);check(selected[0][2]==='markdown'&&selected[0][4]==='Templates/Same.md','Keyboard creation disagreed with selected template');check(validated.length===1&&validated[0][0]==='Templates/Same.md'&&validated[0][1]==='markdown','Save skipped captured template validation');modal.close();
 p.isExcalidrawAvailable=()=>false;const constrained=new M.CreateFolderNoteModal(p,{...origin,path:'folder:Folder',file:null,isFolder:true,name:'Folder'},leaf);constrained.open();
 await waitFor(()=>constrained.contentEl.querySelector('.kplex-drawing-template input'));reactInput(constrained.contentEl.querySelector('.kplex-create-folder-note-name-setting input'),'Plain');
 await waitFor(()=>!button(constrained,'common.markdown').disabled);check(!button(constrained,'common.excalidraw')&&constrained.contentEl.querySelector('.kplex-drawing-template input').value===t('template.none'),'Markdown-only form silently retained drawing template');check(p.settings.lastDrawingTemplatePath===remembered,'Local fallback erased remembered drawing template');constrained.close();
 `,{styles:true}),true);
});

test('placeholder Template choice locks accepted partial type/path and retry retains its exact file',async()=>{
 assert.equal(await authoringScenario(`
 const chosen='Templates/Plain.md',created=addFile('Folder/Partial.md'),calls=[],validated=[];
 const modal=new M.MaterializeGhostModal(p.app,'Partial',[{folderPath:'Folder',label:'Folder'}],true,'markdown',async(...args)=>{calls.push(args);if(calls.length===1)throw new M.PartialRelatedFileError(created,new Error('Second write failed'));return true},false,{files:[{path:chosen,kind:'markdown'},{path:'Drawings/Sketch.md',kind:'excalidraw'}],selected:chosen,root:'',validate:(...args)=>validated.push(args)});modal.open();
 await waitFor(()=>modal.contentEl.querySelector('.kplex-drawing-template input'));const drawing=button(modal,'common.excalidraw'),markdown=button(modal,'common.markdown');
 check(drawing.disabled&&markdown.classList.contains('mod-cta'),'Initial explicit template and output kind disagree');markdown.click();
 await waitFor(()=>modal.contentEl.querySelector('.kplex-add-related-recovery'));check(modal.contentEl.querySelector('.kplex-drawing-template input').disabled&&drawing.disabled,'Partial outcome did not lock kind/template');
 markdown.click();await waitFor(()=>calls.length===2);check(calls[0][0]==='markdown'&&calls[1][2]===created&&calls[1][4]===chosen,'Retry changed template, kind or native file');check(validated.length===1,'Partial recovery re-executed template validation');modal.close();
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
 const options=[...modal.contentEl.querySelectorAll('.kplex-form-option')],completion=options[0],template=modal.contentEl.querySelector('.kplex-drawing-template');check(options.length===1&&template.classList.contains('kplex-form-field'),'Completion must use FormSelect and searchable Template must use FormField');
 const select=completion.querySelector('select'),combobox=template.querySelector('.kplex-native-combobox'),templateInput=combobox.querySelector('input'),browse=combobox.querySelector('.kplex-fuzzy-disclosure'),controls=[select,combobox],styles=controls.map(control=>getComputedStyle(control));
 equal(styles.map(style=>[style.fontFamily,style.fontSize,style.height]),[...Array(2)].map(()=>[styles[0].fontFamily,styles[0].fontSize,styles[0].height]),'Option typography or height differs');
 equal([getComputedStyle(templateInput).fontFamily,getComputedStyle(templateInput).fontSize],[styles[1].fontFamily,styles[1].fontSize],'Search input bypassed the native combobox typography owner');
 const rows=[completion,template],labels=rows.map(row=>row.querySelector('label')),labelStyles=labels.map(label=>getComputedStyle(label));equal(labelStyles.map(style=>[style.fontFamily,style.fontSize]),[...Array(2)].map(()=>[labelStyles[0].fontFamily,labelStyles[0].fontSize]),'Paired labels must match while native control typography stays host-owned');
 const bounds=controls.map(control=>control.getBoundingClientRect()),templateLabel=labels[1].getBoundingClientRect(),inputBounds=templateInput.getBoundingClientRect();
 check(labels[1].textContent===p.translator('drawing.template')&&labels[0].textContent===p.translator('addRelated.completionMode'),'Localized Template or completion caption missing');
 check(select.classList.contains('dropdown')&&combobox.classList.contains('dropdown')&&templateInput.type==='text'&&templateInput.value==='Templates/Drawing.md','Template replaced searchable native chrome or lost committed path');
 check(templateLabel.bottom<=bounds[1].top&&Math.abs(bounds[1].left-form.left)<1&&bounds[1].width>=form.width*.95&&Math.abs(inputBounds.width-bounds[1].width)<1,'Searchable Template must be labelled above its full-width native combobox');
 check(Math.abs(bounds[0].right-bounds[1].right)<1,'Native controls must share the form right edge');
 if(${width}<=480)check(labels[0].getBoundingClientRect().bottom<=bounds[0].top&&bounds[0].width>=form.width*.95,'Narrow completion option did not stack full width');else check(labels[0].getBoundingClientRect().right<bounds[0].left&&Math.abs(completion.getBoundingClientRect().width-form.width)<1,'Wide completion option lost shared inline label/control columns');
 check(labels[0].htmlFor===select.id&&labels[1].htmlFor===templateInput.id&&templateInput.getAttribute('aria-labelledby')===labels[1].id&&!templateInput.hasAttribute('aria-label')&&browse.getAttribute('aria-label')===p.translator('template.browse'),'Native controls lost visible-label or disclosure accessibility ownership');
 const actions=modal.tabPanels.note.querySelector('.kplex-form-actions'),footer=actions.getBoundingClientRect();
 check(bounds.every(rect=>rect.bottom<footer.top-8),'A native control overlaps the footer divider');
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
 const picker=modal.contentEl.querySelector('.kplex-template-picker input');picker.focus();reactInput(picker,'Markdown');await waitFor(()=>[...document.querySelectorAll('.kplex-search-results button')].some(item=>item.textContent.includes(templatePath)));
 [...document.querySelectorAll('.kplex-search-results button')].find(item=>item.textContent.includes(templatePath)).click();
 const markdown=()=>modal.contentEl.querySelector('button[aria-label="'+t('addRelated.createMarkdownLink')+'"]'),drawing=()=>modal.contentEl.querySelector('button[aria-label="'+t('addRelated.createExcalidrawLink')+'"]');
 await waitFor(()=>markdown()?.dataset.kplexPrimaryAction==='true'&&!markdown().disabled);check(drawing().disabled,'Selected Markdown Template left the mismatched drawing action enabled');check(validations.length===0&&creations.length===0,'Template browsing or selection performed a save');
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
