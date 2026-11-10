/** Actual native-shell drafts and queued appearance writer in Chromium; exact native staging
 * separately establishes Obsidian metadata events, sidebar focus and mobile-window ownership. */
import assert from 'node:assert/strict';import test from 'node:test';import {readFileSync} from 'node:fs';import {build} from 'esbuild';
import {colorEditorScenario} from './support/colorEditorBrowser.mjs';import {chromiumHarness} from './support/browserTypeScript.mjs';import {nativeIconBoundary} from './support/nativeIconBoundary.mjs';

test('selector draft validates tags, keeps old tags by default, discloses inline Clear and excludes duplicate submissions',async()=>{
 assert.equal(await colorEditorScenario(`(async()=>{
  const M=sourceModules,t=M.createTranslator('en'),file={path:'Person.md',extension:'md',stat:{mtime:1,size:100}},fm={'Note type':'person',tags:['person','person/friend']};let writes=0,release;
  const pending=new Promise(resolve=>release=resolve),p={app:{metadataCache:{getFileCache:()=>({frontmatter:fm})},vault:{getFileByPath:()=>file,cachedRead:async()=> 'note type:: #inline\\n#person/friend'}},settings:{noteTypeField:'Note type'},index:{allPages:()=>[]},translator:t,
   editNoteType:async(file,field,opening,value,remove,current)=>{writes++;await pending;if(!current())throw Error('retired');M.setNoteType(fm,field,opening,value,remove,'invalid')},rebuildIndex:()=>{throw Error('Unwanted rebuild')}};
  const button=(modal,key)=>[...modal.contentEl.querySelectorAll('button')].find(el=>el.getAttribute('aria-label')===t(key));
  const modal=new M.NoteTypeModal(p,file,'person');modal.open();await new Promise(resolve=>setTimeout(resolve,30));
  const input=modal.contentEl.querySelector('input[type=text]'),change=value=>{input.value=value;input.dispatchEvent(new Event('input'))};
  change('Big idea');if(!button(modal,'common.save').disabled)throw Error('Invalid tag allowed');change('project');
  const toggle=modal.contentEl.querySelector('input[type=checkbox]');if(toggle.checked)throw Error('Old tag removal default changed');
  if(!modal.contentEl.textContent.includes('#inline'))throw Error('Inline fallback hidden');
  button(modal,'common.save').click();button(modal,'common.clear').click();button(modal,'common.save').click();if(writes!==1)throw Error('Duplicate Save/Clear');release();await new Promise(resolve=>setTimeout(resolve,40));
  if(fm['Note type']!=='project'||JSON.stringify(fm.tags)!==JSON.stringify(['person','person/friend','project']))throw Error('Tag/type atom lost');
  const clear=new M.NoteTypeModal(p,file,'project');clear.open();await new Promise(resolve=>setTimeout(resolve,30));button(clear,'common.clear').click();if(writes!==1)throw Error('Clear wrote without preview Save');button(clear,'common.save').click();await new Promise(resolve=>setTimeout(resolve,40));if('Note type'in fm||!fm.tags.includes('project'))throw Error('Clear lost old tag');
  return true;
 })()`),true);
});

test('compact details keep detached order/visibility, validate duplicate fields and refresh an inert live preview',async()=>{
 assert.equal(await colorEditorScenario(`(()=>{
  const M=sourceModules,t=M.createTranslator('en'),rows=[{field:'title',visible:true},{field:'company',visible:false}],container=createDiv();document.body.append(container);
  let previews=0;const fields=new M.NodeDetailsFields(container,t,{rows,preview:(type,values)=>{previews++;return{title:'ER12345',lines:values.filter(row=>row.visible).map(row=>({field:row.field,text:'<script>'+row.field+'</script>'}))}}},()=> 'person',()=>true);
  if(container.querySelector('script')||!container.textContent.includes('<script>title</script>'))throw Error('Preview escaped incorrectly');
  const buttons=[...container.querySelectorAll('button')];buttons.find(button=>button.getAttribute('aria-label')==='Move down').click();
  if(fields.read()[0].field!=='company'||rows[0].field!=='title')throw Error('Draft ordering mutated source');
  const input=container.querySelector('input[type=text]');input.value='title';input.dispatchEvent(new Event('input'));let rejected=false;try{fields.read()}catch{rejected=true}if(!rejected||previews<2)throw Error('Duplicate or preview regression');
  return true;
 })()`),true);
});

test('inline inspection finishing during a rejected save leaves Clear available without reenabling a pending operation',async()=>{
 assert.equal(await colorEditorScenario(`(async()=>{
  const M=sourceModules,t=M.createTranslator('en'),file={path:'Retry.md',extension:'md',stat:{mtime:1,size:50}};let read,fail;
  const p={app:{vault:{getFileByPath:()=>file,cachedRead:()=>new Promise(resolve=>read=resolve)},metadataCache:{getFileCache:()=>({frontmatter:{'Note type':'person',tags:['person']}})}},settings:{noteTypeField:'Note type'},translator:t,index:{allPages:()=>[]},editNoteType:()=>new Promise((resolve,reject)=>fail=reject)};
  const modal=new M.NoteTypeModal(p,file,'person');modal.open();const button=key=>[...modal.contentEl.querySelectorAll('button')].find(el=>el.getAttribute('aria-label')===t(key));button('common.save').click();read('note type:: #inline');await new Promise(resolve=>setTimeout(resolve,25));if(!button('common.save').disabled)throw Error('Inspection enabled pending Save');fail(Error('Controlled disk failure'));await new Promise(resolve=>setTimeout(resolve,25));button('common.clear').click();if(button('common.save').disabled)throw Error('Completed inspection was lost after failed save');modal.close();return true;
 })()`),true);
});

test('one durable Save commits style/details outside theme records, preserving unrelated settings and rejecting stale or failed writes',async()=>{
 assert.equal(await colorEditorScenario(`(async()=>{
  const M=sourceModules,p=await createAppearanceHost({noteTypeProperties:{other:[{field:'status',visible:true}]},sentinel:{future:7}});p.writes=[];
  const edit={type:'#Person',opening:[],rows:[{field:'title',visible:true}]};await p.updateStyleSettings(draft=>{draft.noteTypeStyles.person={icon:'user'}},p.captureAppearanceOwner(),{nodePropertiesEdit:edit});
  if(p.writes.length!==1||p.writes[0].noteTypeProperties.person[0].field!=='title'||p.settings.noteTypeStyles.person.icon!=='user'||p.writes[0].sentinel.future!==7||!p.writes[0].noteTypeProperties.other)throw Error('Save not atomic/preserving');
  if(JSON.stringify(p.writes[0].appearanceThemes).includes('noteTypeProperties'))throw Error('Defaults leaked into themes');
  await p.updateStyleSettings(()=>{},p.captureAppearanceOwner(),{nodePropertiesEdit:{type:'__proto__',opening:[],rows:[{field:'title',visible:true}]}});if(!Object.hasOwn(p.settings.noteTypeProperties,'__proto__')||JSON.parse(JSON.stringify(p.settings)).noteTypeProperties['__proto__'][0].field!=='title')throw Error('Authored tag lost as inherited dictionary key');
  const before=JSON.stringify(p.settings);p.saveData=async()=>{throw Error('Controlled disk failure')};let failed=false;try{await p.updateStyleSettings(draft=>{draft.noteTypeStyles.person={icon:'tag'}},p.captureAppearanceOwner(),{nodePropertiesEdit:{...edit,type:'person',opening:edit.rows,rows:[]}})}catch{failed=true}if(!failed||JSON.stringify(p.settings)!==before)throw Error('Failed save published');
  p.saveData=async()=>{};failed=false;try{await p.updateStyleSettings(()=>{},p.captureAppearanceOwner(),{nodePropertiesEdit:edit})}catch{failed=true}if(!failed)throw Error('Stale property draft accepted');
  return true;
 })()`),true);
});

test('review inspection never writes; invalid repair previews selectable files and commits both type/tag only for included notes',async()=>{
 assert.equal(await colorEditorScenario(`(async()=>{
  const M=sourceModules,t=M.createTranslator('en'),files=[0,1].map(n=>({path:'Invalid'+n+'.md',extension:'md',stat:{mtime:1,size:10}})),data=new Map(files.map(file=>[file,{'Note type':'Big idea',tags:['research']} ]));let writes=0;
  // Native ButtonComponent also retains disabled state in its event gate. A DOM-only enable is insufficient.
  const nativeAdd=M.Setting.prototype.addButton;M.Setting.prototype.addButton=function(create){return nativeAdd.call(this,button=>{let disabled=false;const setDisabled=button.setDisabled,onClick=button.onClick;button.setDisabled=value=>{disabled=value;return setDisabled.call(button,value)};button.onClick=handler=>onClick.call(button,event=>{if(!disabled)handler(event)});create(button)})};
  const p={app:{vault:{getMarkdownFiles:()=>files,getFileByPath:path=>files.find(file=>file.path===path)},metadataCache:{getFileCache:file=>({frontmatter:data.get(file)})}},settings:{noteTypeField:'Note type',noteTypeProperties:{}},translator:t,openOntologyUsageDocument:async()=>{},
   editNoteType:async(file,field,opening,value)=>{writes++;M.setNoteType(data.get(file),field,opening,value,false,'invalid');return true},addNoteTypeProperties:async()=>{throw Error('Wrong repair')}};
  const modal=new M.NoteTypeReviewModal(p);modal.open();await new Promise(resolve=>setTimeout(resolve,30));const button=key=>[...modal.contentEl.querySelectorAll('button')].find(el=>el.getAttribute('aria-label')===t(key));
  button('noteType.viewNotes').click();if(modal.contentEl.querySelectorAll('a').length!==2||writes)throw Error('View notes edited or hid files');button('noteType.fix').click();
  const input=modal.contentEl.querySelector('input[type=text]');input.value='big-idea';input.dispatchEvent(new Event('input'));
  if(!modal.contentEl.querySelector('pre').textContent.includes('tags: +"big-idea"'))throw Error('Canonical type/tag preview missing');
  const first=modal.contentEl.querySelector('input[type=checkbox]');first.checked=false;first.dispatchEvent(new Event('change'));
  const toggle=modal.contentEl.querySelectorAll('input[type=checkbox]')[1];toggle.checked=false;toggle.dispatchEvent(new Event('change'));if(writes)throw Error('Preview wrote');
  if(!button('noteType.apply').disabled)throw Error('Empty selection kept Apply enabled');first.checked=true;first.dispatchEvent(new Event('change'));
  button('noteType.apply').click();await new Promise(resolve=>setTimeout(resolve,40));if(writes!==1||data.get(files[0])['Note type']!=='big-idea'||!data.get(files[0]).tags.includes('big-idea')||data.get(files[1])['Note type']!=='Big idea')throw Error('Selection/atomic repair failed');
  if(!modal.contentEl.textContent.includes('Changed: 1'))throw Error('Outcome counts missing');modal.close();return true;
 })()`),true);
});

test('review cache gaps and failed discovery never claim a clean vault',async()=>{
 assert.equal(await colorEditorScenario(`(async()=>{
  const M=sourceModules,t=M.createTranslator('en'),file={path:'Uncached.md',extension:'md',stat:{mtime:1,size:10}};
  const p={app:{vault:{getMarkdownFiles:()=>[file],getFileByPath:()=>file},metadataCache:{getFileCache:()=>null}},settings:{noteTypeField:'Note type',noteTypeProperties:{}},translator:t};
  let modal=new M.NoteTypeReviewModal(p);modal.open();await new Promise(resolve=>setTimeout(resolve,25));if(modal.contentEl.textContent.includes(t('noteType.noFindings')))throw Error('Uncached note claimed clean');modal.close();
  p.app.vault.getMarkdownFiles=()=>{throw Error('Controlled discovery failure')};modal=new M.NoteTypeReviewModal(p);modal.open();await new Promise(resolve=>setTimeout(resolve,25));if(!modal.contentEl.textContent.includes(t('actions.failed'))||modal.contentEl.textContent.includes(t('noteType.noFindings')))throw Error('Failed scan claimed clean');modal.close();return true;
 })()`),true);
});

const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
 import React from 'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';
 import{ThoughtNode}from'./src/ui/ThoughtNode';import{nodeSize}from'./src/ui/plexViews/measurement';
 export{ThoughtNode};
 let root;const noop=()=>{};
 window.render=(role='child',wrap=false,details=[{field:'title',text:'Improve performance '+ 'long '.repeat(100)},{field:'company',text:'<script>Microsoft</script>'}],embedded=false)=>{
  root??=createRoot(document.body.appendChild(document.createElement('div')));
  const settings={baseFontSize:12.4,wrapNodeLabels:wrap,allowRemoteNodeImages:false,baseNodeStyle:{}},style={fontSize:18,maxLabelLength:30,maxWidth:240,strokeWidth:1};
  const node={page:{path:'ER12345.md',file:{path:'ER12345.md'},noteType:'requirement'},label:'ER12345',role,style,x:200,y:150,propertyLines:details,physicalPorts:{},gateStats:{},neighbourCount:0,...nodeSize('ER12345',18,settings,role==='center',30,240,1,details)};
  flushSync(()=>root.render(<ThoughtNode node={node} settings={settings} translate={key=>key} selected={false} highlighted={false} dimmed={false} highlightedGates={new Set()} onActivate={noop} onOpen={noop} onHoverNode={noop} onHoverGate={noop} onHoverEnd={noop} onHoverPreview={noop} onGatePointerDown={noop} onNodePointerDown={noop} content={embedded?<div>Native editor</div>:undefined}/>));
 };
`},bundle:true,write:false,format:'iife',globalName:'sourceModules',platform:'browser',plugins:[nativeIconBoundary]});

test('measured property text fits below the unchanged title, stays smaller/inert and respects editor hosting',async()=>{
 const b=await chromiumHarness(bundle.outputFiles[0].text);try{
  await b.evaluate(`(()=>{const css=document.createElement('style');css.textContent=${JSON.stringify(readFileSync('styles.css','utf8'))};document.head.append(css)})()`);
  for(const role of ['center','child','sibling'])for(const wrap of [false,true]){
   await b.evaluate(`render('${role}',${wrap})`);
   const value=await b.evaluate(`(()=>{const node=document.querySelector('.kplex-thought'),label=node.querySelector('.kplex-thought-label'),lines=[...node.querySelectorAll('.kplex-node-property')],r=node.getBoundingClientRect();return{title:label.textContent,small:parseFloat(getComputedStyle(lines[0]).fontSize)<parseFloat(getComputedStyle(label).fontSize),fit:lines.every(l=>{const b=l.getBoundingClientRect();return b.bottom<=r.bottom&&b.left>=r.left&&b.right<=r.right}),literal:lines[1].textContent,scripts:node.querySelectorAll('script').length,ellipsis:getComputedStyle(lines[0]).textOverflow}})()`);
   assert.equal(value.title,'ER12345');assert.equal(value.small,true);assert.equal(value.fit,true);assert.equal(value.literal,'<script>Microsoft</script>');assert.equal(value.scripts,0);assert.equal(value.ellipsis,'ellipsis');
  }
  await b.evaluate(`render('child',false,[],false)`);assert.equal(await b.evaluate(`!!document.querySelector('.kplex-thought-caption')`),false);
  await b.evaluate(`render('child',false,[{field:'title',text:'Hidden by editor'}],true)`);assert.equal(await b.evaluate(`!!document.querySelector('.kplex-node-properties')`),false);
 }finally{await b.cleanup()}
});
