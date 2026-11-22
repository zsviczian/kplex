/** Actual owner-document font shaping, CSS boxes and resource lifetimes for property geometry.
 * Real Chromium/DOM ranges are the measurement oracle; this is not native Obsidian/device evidence. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {colorEditorScenario} from './support/colorEditorBrowser.mjs';

const setup=`
 const M=sourceModules,check=(value,message)=>{if(!value)throw Error(message)};
 const sheet=new CSSStyleSheet();sheet.replaceSync(${JSON.stringify(readFileSync(new URL('../styles.css',import.meta.url),'utf8'))});document.adoptedStyleSheets=[...document.adoptedStyleSheets,sheet];
 const host=document.body.createDiv({cls:'kplex-app'}),viewport=host.createDiv({cls:'kplex-plex'});viewport.style.width='1000px';viewport.style.height='800px';
 const measureDom=(line,size)=>{
  const card=viewport.createDiv({cls:'kplex-thought'});card.style.width='max-content';card.style.setProperty('--kplex-node-property-font-size',size+'px');
  const properties=card.createSpan({cls:'kplex-node-properties'}),row=properties.createSpan({cls:'kplex-node-property'});
  if(line.icon)row.createSpan({cls:'kplex-node-property-icon',text:'🧭'});
  if(line.label)row.createSpan({cls:'kplex-node-property-label',text:line.label+':'});
  row.createSpan({cls:'kplex-node-property-value',text:line.text});const rect=row.getBoundingClientRect(),result={width:rect.width,height:rect.height};card.remove();return result;
 };
`;

test('property Canvas metrics match actual CSS label/icon/value boxes across fonts, Unicode and property sizes',async()=>{
 assert.equal(await colorEditorScenario(`(()=>{${setup}
 const values=['WWWWWWWWWWWW','iiiiiiiiiiii','中文 日本語','👩‍💻 🧭 🏄‍♀️','2026-11-22','12,345.67','  spaced   text  ','non\u00a0breaking\u00a0spaces','em\u2003spaces'];
 for(const family of ['Arial, sans-serif','Georgia, serif','monospace'])for(const size of [8,12,18,20]){
  viewport.style.fontFamily=family;const reader=new M.NodePropertyTextMeasurement(viewport,size);
  for(const text of values)for(const label of [undefined,'Very wide WWW label 中文','Label  with   spaces'])for(const icon of [undefined,'compass']){
   const line={field:'value',text,label,icon},actual=measureDom(line,size),measured=reader.measure(line);
   check(measured&&Math.abs(measured.width-actual.width)<1.1&&Math.abs(measured.height-actual.height)<1.1,'Measured CSS mismatch '+JSON.stringify({family,size,line,measured,actual}));
  }
  const wide=reader.measure({field:'x',text:values[0]}),narrow=reader.measure({field:'x',text:values[1]});
  if(family!=='monospace')check(wide.width>narrow.width*1.5,'Actual glyph advances were replaced by character counts');reader.dispose();
 }
 check(!viewport.querySelector('.kplex-property-measurement'),'Font sampling retained a DOM probe');host.remove();return true;
 })()`),true);
});

test('measurement cache hits do not read DOM styles and font changes/disposal revoke old metrics',async()=>{
 assert.equal(await colorEditorScenario(`(()=>{${setup}
 viewport.style.fontFamily='Arial, sans-serif';const reader=new M.NodePropertyTextMeasurement(viewport,18),line={field:'value',text:'WWWWiii',label:'Label',icon:'tag'};
 const original=window.getComputedStyle;let reads=0;window.getComputedStyle=(...args)=>{reads++;return original(...args)};
 try{
  const first=reader.measure(line);for(let i=0;i<100;i++)check(reader.measure(line)===first,'Stable cache did not preserve its metrics');check(reads===0,'Ordinary cached property reads sampled DOM styles');
  viewport.style.fontFamily='monospace';check(reader.refresh(),'Changed actual font did not invalidate metrics');const next=reader.measure(line);check(next.width!==first.width,'Font change retained the old shaped width');
  check(!reader.refresh(),'Unchanged font context caused another layout invalidation');reader.dispose();check(reader.measure(line)===undefined,'Disposed document capability stayed live');
 }finally{window.getComputedStyle=original;reader.dispose();host.remove()}return true;
 })()`),true);
});

test('font-context updates replace the measurement capability consumed by cached node-property readers',async()=>{
 assert.equal(await colorEditorScenario(`(async()=>{${setup}
 let latest,element;const subscribers=new Set(),subscribe=callback=>{subscribers.add(callback);return()=>subscribers.delete(callback)};
 const root=M.createRoot(viewport),before=window.migrationListeners;
 function Meter({size=12}){const ref=M.React.useRef(null);latest=M.useNodePropertyMeasurement(ref,size,0,subscribe);M.React.useLayoutEffect(()=>{element=ref.current},[]);return M.React.createElement('div',{ref,className:'kplex-plex',style:{fontFamily:'Arial, sans-serif',width:500,height:400}})}
 try{
  M.flushSync(()=>root.render(M.React.createElement(Meter,{})));await waitFor(()=>latest?.({field:'x',text:'WWWWWW'}));
  const original=latest,first=latest({field:'x',text:'WWWWWW'});element.style.fontFamily='monospace';
  await waitFor(()=>latest!==original&&latest({field:'x',text:'WWWWWW'}).width!==first.width);
  const resized=latest;M.flushSync(()=>root.render(M.React.createElement(Meter,{size:20})));await waitFor(()=>latest!==resized&&latest({field:'x',text:'WWWWWW'}).height>first.height);
 }finally{M.flushSync(()=>root.unmount());host.remove()}
 check(subscribers.size===0&&window.migrationListeners===before,'Font context listeners survived unmount');return true;
 })()`),true);
});

test('Compass, Mindmap and Facets position from actual font metrics and keep values ahead of long labels at width caps',async()=>{
 assert.equal(await colorEditorScenario(`(async()=>{${setup}
 const file={path:'A.md',extension:'md',stat:{mtime:1,size:1}},page={path:'A.md',name:'A',file,url:null,isFolder:false,isTag:false,transient:undefined,aliases:[],tags:[],styleTags:[],primaryStyleTag:null,noteType:null,maxLabelLength:30,neighbours:new Map()};
 const frontmatter={wide:'WWWWWWWWWW',narrow:'iiiiiiiiii',date:'2026-11-22',number:12345,cjk:'中文 日本語',emoji:'👩‍💻 🏄‍♀️'},cache={frontmatter};
 const app={vault:{getFileByPath:()=>file,read:()=>{throw Error('Body read')},cachedRead:()=>{throw Error('Source read')}},metadataCache:{getFileCache:()=>cache}};
 const gates=Object.fromEntries(['top','bottom','left','right'].map(key=>[key,{hasAny:false,visibleCount:0,complete:true}])),noop=()=>{};
 const index={get:id=>id===page.path?page:undefined,titleFor:p=>p.name,isVisiblePage:()=>true,captureSemanticGateRead:()=>({isCurrent:()=>true}),neighbours:()=>[],sortNeighbours:rows=>rows,neighbourCount:()=>0,gateStats:()=>gates,visibleRelationshipsWithin:()=>[],viewScopeCoverage:()=>({coverage:'local',prepared:true,complete:true,pending:false}),explainRelationship:()=>null};
 const neighborhood={center:page,parents:[],children:[],leftFriends:[],rightFriends:[],siblings:[]},root=M.createRoot(viewport.createDiv());
 try{for(const family of ['Arial, sans-serif','Georgia, serif'])for(const size of [12,20])for(const maximum of [800,320]){
  viewport.style.fontFamily=family;const reader=new M.NodePropertyTextMeasurement(viewport,size);
  const common=Object.keys(frontmatter).map(field=>({field,visible:true,showName:true,label:maximum===320?'A long translated label 中文 '+ 'word '.repeat(12):field,icon:'🧭'}));
  const details=M.nodePropertyReader(app,{},common,reader.measure),lines=details(page);check(lines.length===6&&lines.every(line=>line.measurement),'Actual metrics did not enter display-only lines');
  const settings=M.migrateAndMergeSettings({propertyFontSize:size,baseNodeStyle:{maxWidth:maximum},centralNodeStyle:{maxWidth:maximum},groupRelations:false});
  const source={...index,detailsFor:details};
  const scenes=[{id:'classic',scene:M.buildScene(neighborhood,source,settings,false,undefined,true)}];
  for(const definition of [M.mindMapViewDefinition,M.wuXingViewDefinition]){
   const prepared=M.prepareViewScene(definition,M.plexViewRead(source,()=>true,32,page.path,256),source,page.path,null,settings,()=>true);check(!prepared.failure,'View failed '+definition.id);scenes.push({id:definition.id,scene:prepared.scene});
  }
  const expected=Math.max(180,Math.min(maximum,32+Math.max(...lines.map(line=>line.measurement.width))));
  for(const {id,scene} of scenes){
   const node=scene.nodes.find(node=>node.page.path===page.path);check(Math.abs(node.width-expected)<.1,'View ignored actual measured width '+JSON.stringify({id,family,size,maximum,width:node.width,expected}));
   M.flushSync(()=>root.render(M.React.createElement(M.ThoughtNode,{node:{...node,x:500,y:220},settings,translate:M.createTranslator('en'),selected:false,highlighted:false,dimmed:false,highlightedGates:new Set(),onActivate:noop,onOpen:noop,onHoverNode:noop,onHoverGate:noop,onHoverEnd:noop,onHoverPreview:noop,onGatePointerDown:noop,onNodePointerDown:noop})));
   const card=viewport.querySelector('.kplex-thought'),bounds=card.getBoundingClientRect(),rows=[...card.querySelectorAll('.kplex-node-property')];
   check(rows.length===6&&rows.every(row=>{const r=row.getBoundingClientRect();return r.left>=bounds.left-.5&&r.right<=bounds.right+.5&&r.bottom<=bounds.bottom+.5}),'Actual lines do not fit positioned node '+id);
   for(const row of rows){const value=row.querySelector('.kplex-node-property-value'),range=value.ownerDocument.createRange();range.selectNodeContents(value);
    const painted=range.getBoundingClientRect(),box=value.getBoundingClientRect();check(painted.width<=box.width+.015625,'Value clipped before label '+JSON.stringify({id,family,size,maximum,text:value.textContent,textWidth:painted.width,boxWidth:box.width}));range.detach()}
   if(maximum===320)check(rows[0].querySelector('.kplex-node-property-label').scrollWidth>rows[0].querySelector('.kplex-node-property-label').clientWidth,'Long label was not truncated before value');
  }
  reader.dispose();
 }}finally{M.flushSync(()=>root.unmount());host.remove()}return true;
 })()`),true);
});

test('advanced CSS shaping falls back to cached real DOM and invalidates when feature values change',async()=>{
 assert.equal(await colorEditorScenario(`(()=>{${setup}
 viewport.style.fontFamily='Georgia, serif';const style=new CSSStyleSheet();style.replaceSync('.kplex-node-property-value{font-feature-settings:"tnum";letter-spacing:1px;word-spacing:2px}');document.adoptedStyleSheets=[...document.adoptedStyleSheets,style];
 const reader=new M.NodePropertyTextMeasurement(viewport,18),line={field:'number',text:'12345 67890',label:'Numbers',icon:'tag'};
 const actual=measureDom(line,18),measured=reader.measure(line);check(Math.abs(actual.width-measured.width)<.1,'Advanced CSS did not use the actual row');
 const original=Element.prototype.getBoundingClientRect;let reads=0;Element.prototype.getBoundingClientRect=function(...args){reads++;return original.apply(this,args)};
 try{for(let i=0;i<100;i++)check(reader.measure(line)===measured,'Advanced fallback cache missed');check(reads===0,'Advanced cache hit performed DOM layout reads')}
 finally{Element.prototype.getBoundingClientRect=original}
 style.replaceSync('.kplex-node-property-value{font-feature-settings:"pnum";letter-spacing:1px;word-spacing:2px}');check(reader.refresh(),'Advanced feature-value change did not retire the cached metrics');
 const changed=reader.measure(line),next=measureDom(line,18);check(Math.abs(changed.width-next.width)<.1,'Changed feature settings kept stale widths');reader.dispose();host.remove();return true;
 })()`),true);
});

test('property values keep their full fractional text width before labels while oversized values still ellipsize',async()=>{
 assert.equal(await colorEditorScenario(`(async()=>{${setup}
 const container=viewport.createDiv({cls:'kplex-node-properties'}),root=M.createRoot(container);
 try{for(const family of ['Arial, sans-serif','Georgia, serif'])for(const size of [12,20])for(const width of [120,220])for(const label of [undefined,'Short','A very long translated label '.repeat(8)])for(const text of ['A','Authored display name','Oversized property value '.repeat(24)]){
  container.style.fontFamily=family;container.style.fontSize=size+'px';container.style.width=width+'px';
  M.flushSync(()=>root.render(M.React.createElement(M.NodePropertyCaption,{line:{field:'value',text,label,icon:'compass'}})));
  const row=container.querySelector('.kplex-node-property'),value=row.querySelector('.kplex-node-property-value'),range=document.createRange();range.selectNodeContents(value);
  const full=range.getBoundingClientRect(),box=value.getBoundingClientRect(),available=width-size-(label?8:4),context=JSON.stringify({family,size,width,label,text: text.slice(0,30),full:full.width,box:box.width});
  if(full.width<=available)check(full.width<=box.width+.015625,'Fitting value lost fractional width '+context);
  else check(full.width>box.width+.015625&&getComputedStyle(value).textOverflow==='ellipsis','Oversized value stopped ellipsizing '+context);
  check(box.right<=row.getBoundingClientRect().right+.015625,'Value overflowed the row '+context);
  if(label==='Short'&&full.width+size+8+row.querySelector('.kplex-node-property-label').scrollWidth<width){const labelBox=row.querySelector('.kplex-node-property-label').getBoundingClientRect();check(Math.abs(box.left-labelBox.right-4)<.015625,'Short labels introduced an empty alignment gap '+context)}
  range.detach();
 }}finally{M.flushSync(()=>root.unmount());host.remove()}return true;
 })()`),true);
});

test('measurement readers keep independent document fonts and reject the old owner after adoption',async()=>{
 assert.equal(await colorEditorScenario(`(()=>{${setup}
 viewport.style.fontFamily='Arial, sans-serif';const first=new M.NodePropertyTextMeasurement(viewport,18),line={field:'wide',text:'WWWWWWWW',label:'Label'};check(first.measure(line),'Main measurement unavailable');
 const iframe=document.body.createEl('iframe'),doc=iframe.contentDocument,win=iframe.contentWindow;
 for(const name of ['createEl','createDiv','createSpan','setText'])win.HTMLElement.prototype[name]=HTMLElement.prototype[name];
 const css=doc.createElement('style');css.textContent=${JSON.stringify(readFileSync(new URL('../styles.css',import.meta.url),'utf8'))};doc.head.append(css);
 const remote=doc.body.appendChild(doc.createElement('div'));remote.className='kplex-app';remote.style.fontFamily='monospace';
 const second=new M.NodePropertyTextMeasurement(remote,18),different=second.measure(line);check(different&&different.width!==first.measure(line).width,'Independent document reused another font context');
 doc.body.append(doc.adoptNode(host));viewport.style.fontFamily='Georgia, serif';check(first.measure(line)===undefined,'Migrated node retained main-document measurement authority');
 const replacement=new M.NodePropertyTextMeasurement(viewport,18);check(replacement.measure(line),'Adopted node could not measure through its new owner');
 first.dispose();second.dispose();replacement.dispose();iframe.remove();check(!document.querySelector('.kplex-property-measurement'),'Measurement probe survived document cleanup');return true;
 })()`),true);
});

test('font loading and owner migration replace hook capabilities and retire outgoing document listeners',async()=>{
 assert.equal(await colorEditorScenario(`(async()=>{${setup}
 let latest,element,migrate,released=0;const subscribers=new Set(),subscribe=callback=>{subscribers.add(callback);return()=>subscribers.delete(callback)};
 const root=M.createRoot(viewport),line={field:'x',text:'WWWWWWWW',label:'Label'};
 const iframe=document.body.createEl('iframe'),doc=iframe.contentDocument,win=iframe.contentWindow;
 for(const name of ['createEl','createDiv','createSpan','setText'])win.HTMLElement.prototype[name]=HTMLElement.prototype[name];
 const css=doc.createElement('style');css.textContent=${JSON.stringify(readFileSync(new URL('../styles.css',import.meta.url),'utf8'))};doc.head.append(css);
 function Meter(){const ref=M.React.useRef(null),attach=M.React.useCallback(node=>{ref.current=node;if(node){element=node;node.onWindowMigrated=callback=>{migrate=callback;return()=>{released++}}}},[]);latest=M.useNodePropertyMeasurement(ref,18,0,subscribe);return M.React.createElement('div',{ref:attach,className:'kplex-plex',style:{fontFamily:'Arial, sans-serif',width:500,height:400}})}
 try{
  M.flushSync(()=>root.render(M.React.createElement(Meter)));await waitFor(()=>latest?.(line));
  const initial=latest;document.fonts.dispatchEvent(new Event('loadingdone'));await waitFor(()=>latest!==initial);const oldPort=latest,oldWidth=latest(line).width;
  doc.body.append(doc.adoptNode(element));element.style.fontFamily='monospace';migrate();
  await waitFor(()=>latest!==oldPort&&latest(line)?.width!==oldWidth);check(oldPort(line)===undefined,'Outgoing document still measured adopted nodes');check(subscribers.size===1,'Migration retained an old CSS subscription');
  const current=latest;document.fonts.dispatchEvent(new Event('loadingdone'));await new Promise(resolve=>setTimeout(resolve,30));check(latest===current,'Outgoing document font event replaced the successor reader');
  doc.fonts.dispatchEvent(new win.Event('loadingdone'));await waitFor(()=>latest!==current);check(latest(line),'Successor document font event lost its live reader');
 }finally{if(element)viewport.append(document.adoptNode(element));M.flushSync(()=>root.unmount());iframe.remove();host.remove()}
 check(subscribers.size===0&&released===1,'Migration resources survived hook unmount');check(!document.querySelector('.kplex-property-measurement'),'Migration retained a measurement probe');return true;
 })()`),true);
});
