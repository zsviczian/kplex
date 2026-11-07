/** Actual native-form content/settings queue plus the production React node in real Chromium. */
import assert from 'node:assert/strict';import test from 'node:test';import {readFileSync} from 'node:fs';import {build} from 'esbuild';
import {colorEditorScenario} from './support/colorEditorBrowser.mjs';import {chromiumHarness} from './support/browserTypeScript.mjs';import {nativeIconBoundary} from './support/nativeIconBoundary.mjs';

test('node-property drafts retain visibility/order and Cancel/validation never save',async()=>{
 assert.equal(await colorEditorScenario(`(async()=>{
  const M=sourceModules,t=M.createTranslator('en'),saved=[],initial=[{field:'title',visible:true},{field:'email',visible:false}];
  let closed=0;
  const options={translate:t,types:()=>['person'],read:()=>initial,closed:()=>closed++,save:async(type,opening,rows)=>{saved.push(structuredClone({type,opening,rows}));return{refreshPending:false}}};
  const button=(modal,label)=>[...modal.contentEl.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===label);
  let modal=new M.NoteTypePropertiesEditor({},'person',options,()=>{});modal.open();button(modal,'Cancel').click();if(saved.length||modal.modalEl.isConnected)throw Error('Cancel saved');
  modal=new M.NoteTypePropertiesEditor({},'person',options,()=>{});modal.open();
  const text=modal.contentEl.querySelectorAll('input[type=text]');if(!text[0].disabled)throw Error('Edited type changed identity');
  text[1].value='email';text[1].dispatchEvent(new Event('input'));if(!button(modal,'Save').disabled)throw Error('Duplicate field accepted');
  text[1].value='description';text[1].dispatchEvent(new Event('input'));if(button(modal,'Save').disabled)throw Error('Valid draft blocked');
  const toggle=modal.contentEl.querySelector('input[type=checkbox]');toggle.checked=false;toggle.dispatchEvent(new Event('change'));
  button(modal,'Move down').click();button(modal,'Save').click();await new Promise(resolve=>setTimeout(resolve,50));
  if(saved.length!==1||JSON.stringify(saved[0].rows)!==JSON.stringify([{field:'email',visible:false},{field:'description',visible:false}]))throw Error('Draft ordering/visibility lost');
  if(JSON.stringify(initial)!==JSON.stringify([{field:'title',visible:true},{field:'email',visible:false}]))throw Error('Opening state mutated');
  modal=new M.NoteTypePropertiesEditor({},null,options,()=>{});modal.open();button(modal,'Add property').click();if(!button(modal,'Save').disabled)throw Error('Incomplete property saved');button(modal,'Delete').click();modal.close();
  const manager=new M.NoteTypePropertiesManager({},options);manager.open();manager.contentEl.querySelector('.kplex-style-manager-row').click();
  const child=[...manager.children][0];if(!child?.modalEl.isConnected)throw Error('Manager child missing');manager.retire();
  if(closed!==1||child.modalEl.isConnected||manager.modalEl.isConnected||saved.length!==1)throw Error('Retired manager retained a child or saved its draft');
  return true;
 })()`),true);
});

test('queued property settings preserve other types/unknown keys and reject stale or failed writes',async()=>{
 assert.equal(await colorEditorScenario(`(async()=>{
  const M=sourceModules,p=await createAppearanceHost({noteTypeProperties:{other:[{field:'status',visible:true}]},sentinel:{future:7}});
  const rows=[{field:'title',visible:true}];p.writes=[];let notifications=0;p.index.notifyPresentation=()=>notifications++;
  await p.updateNoteTypeProperties('person',[],rows,()=>true);if(p.writes.length!==1||notifications!==1)throw Error('Expected one durable save and render');
  const saved=p.writes[0];if(saved.sentinel.future!==7||saved.noteTypeProperties.other[0].field!=='status')throw Error('Unrelated settings lost');
  if(M.migrateAndMergeSettings(saved).noteTypeProperties.person[0].field!=='title')throw Error('Reload lost properties');
  p.saveData=async()=>{throw Error('Controlled disk failure')};let failed=false;try{await p.updateNoteTypeProperties('person',rows,[],()=>true)}catch{failed=true}if(!failed||p.settings.noteTypeProperties.person.length!==1)throw Error('Failed disk write published');
  p.saveData=async value=>p.writes.push(value);let release;p.settingsWriteQueue=new Promise(resolve=>release=resolve);
  const pending=p.updateNoteTypeProperties('person',rows,[],()=>true).then(()=>false,()=>true);p.settings.noteTypeProperties={...p.settings.noteTypeProperties,person:[{field:'newer',visible:true}]};release();
  if(!await pending||p.settings.noteTypeProperties.person[0].field!=='newer'||p.writes.length!==1)throw Error('Stale draft overwrote a newer edit');
  return true;
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
