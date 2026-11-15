/** Real saved History/pin JSX and shared node style/drag owners. Trusted browser mouse input
 * distinguishes navigation from grab scrolling; fixtures expose only cached presentation facets. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {build} from 'esbuild';
import {chromiumHarness} from './support/browserTypeScript.mjs';
import {nativeIconBoundary} from './support/nativeIconBoundary.mjs';
const source=ts.createSourceFile('App.tsx',readFileSync('src/ui/App.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let history,pins,beginDrag,endDrag,enterPreview;
/** Extract production JSX so shared style wiring and disabled/loading behavior are exercised. */
function find(node){
 if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='enterSavedNodePreview')enterPreview=node.initializer.getText(source);
 if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='historyBar')history=node.initializer.getText(source);
 if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='beginSavedNodeDrag')beginDrag=node.initializer.getText(source);
 if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='endSavedNodeDrag')endDrag=node.initializer.getText(source);
 if(ts.isJsxExpression(node)&&node.expression?.getText(source).includes('<PinnedNodeBar rows={pinnedPages}'))pins=node.expression.getText(source);
 ts.forEachChild(node,find);
}
find(source);assert(history&&pins);
const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
import React from 'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';
import{HoverPreview,bindHoverPreview}from'./src/ui/components/hoverPreview';
import{HorizontalDragScroll}from'./src/ui/components/HorizontalDragScroll';
import{nodeListPresentation}from'./src/ui/nodeListPresentation';
import{PinnedNodeBar}from'./src/ui/PinnedNodeBar';
import{canDragNodeLink,startNodeLinkDrag,finishNodeLinkDrag,draggedGraphPage,isNodeLinkDragCurrent}from'./src/adapters/obsidian/nodeLinkDrag';
import{savedPinEntries,moveSavedPin}from'./src/core/plex/savedPins';
export {nodeListPresentation};
import{nodePaint,nodePaintFallbacks,resolveNodeStyle}from'./src/index/style';
const settings={baseNodeStyle:{backgroundColor:'#222222',textColor:'#eeeeee',borderColor:'#444444'},
 tagStyleList:['#topic','#Guide'],tagNodeStyles:{'#topic':{backgroundColor:'#114477',textColor:'#ffffff',borderColor:'#1199ff',prefix:'T ',icon:'tag',strokeStyle:'dotted',strokeWidth:2},'#Guide':{backgroundColor:'#774411',borderColor:'#ff9911',prefix:'G ',icon:'book',strokeStyle:'dashed'}},
 folderNodeStyle:{backgroundColor:'#227722'},tagNodeStyle:{backgroundColor:'#772277'},virtualNodeStyle:{fillStyle:'hachure'},urlNodeStyle:{textColor:'#00ffff'},attachmentNodeStyle:{backgroundColor:'#777722'}};
const pages=Array.from({length:16},(_,i)=>({path:'Note-'+i+'.md',name:'Note '+i,file:{extension:'md'},isFolder:false,isTag:false,url:null,primaryStyleTag:i===1||i===2?'#topic':null,styleTags:['#topic'],noteType:i===2?'Guide':null}));
pages[3]={...pages[3],file:null,isFolder:true,path:'folder:Notes'};pages[4]={...pages[4],file:null,isTag:true,path:'tag:topic/child'};
pages[5]={...pages[5],file:null};pages[6]={...pages[6],file:{extension:'pdf'}};pages[7]={...pages[7],file:null,url:'https://example.com'};
window.clicks=[];const actions={dispatch:request=>clicks.push(request.id)},actionNodeRef=page=>({identity:page.path}),translate=key=>key;
const plugin={settings:{navigationHistory:pages.map(p=>p.path),pinnedNodes:pages.slice(0,8).map(p=>p.path)},index:{get:path=>pages.find(p=>p.path===path),titleFor:page=>page.name},removePinnedEntry:async()=>{}};
for(const page of pages)if(page.file)page.file.path=page.path;
window.drags=[];plugin.app={vault:{getFileByPath:path=>pages.find(p=>p.path===path)?.file??null},dragManager:{draggable:null,
dragLink(event,linktext,sourcePath,title,source){event.dataTransfer.setData('text/plain',linktext);drags.push({linktext,sourcePath,title});return{type:'link',source}},
onDragStart(event,drag){this.draggable=drag},onDragEnd(){this.draggable=null}}};
const savedNodeDrag={current:null},rootRef={current:null},savedNodePreview={current:new HoverPreview()};
window.previews=[];plugin.triggerHoverPreview=(target,element,event)=>previews.push({path:target.path,ctrl:event.ctrlKey,meta:event.metaKey});
const enterSavedNodePreview=${enterPreview};
const endSavedNodeDrag=${endDrag},beginSavedNodeDrag=${beginDrag};
window.exportSaved=selector=>{const button=document.querySelector(selector),transfer=new DataTransfer(),event=new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:transfer});
button.dispatchEvent(event);const source=savedNodeDrag.current,target=draggedGraphPage(plugin.app,plugin.index,{dataTransfer:transfer});
const result={draggable:button.draggable,prevented:event.defaultPrevented,path:target?.path,current:isNodeLinkDragCurrent(source),role:source?.role,text:transfer.getData('text/plain')};
button.dispatchEvent(new DragEvent('dragend',{bubbles:true}));result.cleaned=!plugin.app.dragManager.draggable&&!savedNodeDrag.current;return result};
const activePath=pages[2].path,page=pages[2],paintSettings=settings;
const movePin=move=>{const next=moveSavedPin(plugin.settings.pinnedNodes,move);if(next){plugin.settings.pinnedNodes=next;window.mount()}},pinMoveMenu=()=>{},activateSavedPin=id=>{const row=savedPinEntries(plugin.settings.pinnedNodes).find(row=>row.id===id);if(row)actions.dispatch({id:'node.activate',target:{node:actionNodeRef(plugin.index.get(row.entry))}})};
const ObsidianIcon=({name})=><span className='kplex-icon' data-icon={name}/>;
let host,root,releasePreview;function Surface(){const pinnedPages=savedPinEntries(plugin.settings.pinnedNodes).map(row=>{const p=plugin.index.get(row.entry),v=nodeListPresentation(p,p.name,settings);return {id:row.id,path:row.entry,...v,active:row.entry===activePath,available:true,draggable:canDragNodeLink(p)}});return <>{${pins}}{${history}}</>};
window.mount=()=>{if(!root){host=document.body.appendChild(document.createElement('div'));host.className='kplex-main-column';host.style.width='450px';rootRef.current=host;releasePreview=bindHoverPreview(host,savedNodePreview.current);root=createRoot(host)}flushSync(()=>root.render(<Surface/>))};window.unmount=()=>{releasePreview?.();endSavedNodeDrag();flushSync(()=>root.unmount())};
window.repaint=()=>{settings.tagNodeStyles["#Guide"].backgroundColor='#336699';delete settings.tagNodeStyles["#Guide"].prefix;window.mount()};
window.expected=()=>nodePaint(resolveNodeStyle(pages[2],null,'child',settings),nodePaintFallbacks({page:pages[2],role:'child'}));
window.project=()=>pages.slice(0,8).map(p=>nodeListPresentation(p,p.name,settings));
window.checkOwnerDocument=()=>{const frame=document.body.appendChild(document.createElement('iframe')),doc=frame.contentDocument,counts={add:0,remove:0};
const add=doc.addEventListener.bind(doc),remove=doc.removeEventListener.bind(doc);doc.addEventListener=(type,...args)=>{if(['pointermove','pointerup','pointercancel'].includes(type))counts.add++;return add(type,...args)};doc.removeEventListener=(type,...args)=>{if(['pointermove','pointerup','pointercancel'].includes(type))counts.remove++;return remove(type,...args)};
const root=createRoot(doc.body.appendChild(doc.createElement('div')));flushSync(()=>root.render(<HorizontalDragScroll className='kplex-history-list'><button>Other document</button></HorizontalDragScroll>));flushSync(()=>root.unmount());frame.remove();return counts};
`},bundle:true,write:false,format:'iife',globalName:'sourceModules',platform:'browser',plugins:[nativeIconBoundary]});

/** Load actual plugin CSS; native theme fallbacks receive finite test tokens. */
async function browser(){const b=await chromiumHarness(bundle.outputFiles[0].text);try{await b.evaluate(`(()=>{window.mount();const s=document.createElement('style');s.textContent=${JSON.stringify(readFileSync('styles.css','utf8'))};document.head.append(s);document.body.style.setProperty('--text-normal','#eeeeee');})()`);return b}catch(e){await b.cleanup();throw e}}
/** Send real primary mouse input through the browser's pointer capture and synthesized-click path. */
async function mouse(b,type,x,y,buttons=0){
 if(type==='mousePressed')await b.command('Input.dispatchMouseEvent',{type:'mouseMoved',x,y,button:'none',buttons:0});
 await b.command('Input.dispatchMouseEvent',{type,x,y,button:type==='mouseMoved'&&!buttons?'none':'left',buttons,clickCount:type==='mouseMoved'?0:1});
}
/** Read a visible button's interior point independently of compact label wrapping. */
async function point(b,selector='.kplex-history-list button'){return b.evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`)}

/** Scroll from a list gap; draggable node bodies now belong to native link export. */
async function gapPoint(b,selector='.kplex-history-list'){return b.evaluate(`(()=>{const list=document.querySelector(${JSON.stringify(selector)}),r=list.firstElementChild.getBoundingClientRect();return{x:r.right+3,y:r.y+r.height/2}})()`)}

test('History and pins use live type/tag/kind node paint, prefix and icon without changing compact size',async()=>{
 const b=await browser();try{
  const result=await b.evaluate(`(()=>{const all=project(),p=document.querySelector('[data-kplex-pinned-path="Note-2.md"]'),h=document.querySelector('[data-kplex-history-path="Note-2.md"]');return {all,paint:expected(),pin:{text:p.textContent,icon:p.querySelector('[data-icon]').dataset.icon,bg:getComputedStyle(p.parentElement).backgroundColor,color:getComputedStyle(p).color,border:getComputedStyle(p.parentElement).borderStyle},history:{text:h.textContent,icon:h.querySelector('[data-icon]').dataset.icon,bg:getComputedStyle(h).backgroundColor,color:getComputedStyle(h).color,border:getComputedStyle(h).borderStyle,width:h.getBoundingClientRect().width}}})()`);
  assert.equal(result.history.text,'G Note 2');assert.equal(result.pin.text,'G Note 2');assert.equal(result.history.icon,'book');assert.equal(result.pin.icon,'book');
  assert.equal(result.history.bg,'rgb(119, 68, 17)');assert.equal(result.pin.bg,result.history.bg);assert.equal(result.pin.color,result.history.color);assert.equal(result.history.border,'dashed');assert.equal(result.pin.border,'dashed');assert.equal(result.history.width,180);
  assert.equal(result.all[1].icon,'tag');assert.equal(result.all[1].style.borderStyle,'dotted');assert.equal(result.all[3].style.background,'#227722');assert(result.all[4].label.includes('#topic/child'));assert(result.all[5].style.background.includes('gradient'));assert.equal(result.all[6].style.background,'#777722');
  await b.evaluate('repaint()');assert.deepEqual(await b.evaluate(`(()=>{const p=document.querySelector('[data-kplex-pinned-path="Note-2.md"]'),h=document.querySelector('[data-kplex-history-path="Note-2.md"]');return [getComputedStyle(p.parentElement).backgroundColor,getComputedStyle(h).backgroundColor,p.textContent,h.textContent]})()`),['rgb(51, 102, 153)','rgb(51, 102, 153)','T Note 2','T Note 2']);
 }finally{await b.cleanup()}
});

for(const [kind,selector]of [['pin','[data-kplex-pinned-path="Note-2.md"]'],['history','[data-kplex-history-path="Note-2.md"]']])test(`${kind} exports the exact native node link without navigating, scrolling or reordering`,async()=>{
 const b=await browser();try{
  assert.deepEqual(await b.evaluate(`exportSaved(${JSON.stringify(selector)})`),{draggable:true,prevented:false,path:'Note-2.md',current:true,role:'center',text:'Note-2.md',cleaned:true});
  assert.equal(await b.evaluate('clicks.length'),0);assert.equal(await b.evaluate(`!!document.querySelector('.is-mouse-scrolling,.is-reordering')`),false);
  assert.deepEqual(await b.evaluate('drags'),[{linktext:'Note-2.md',sourcePath:'Note-2.md',title:'G Note 2'}]);
 }finally{await b.cleanup()}
});

for(const selector of ['.kplex-history-list','.kplex-pinned-bar'])test(`${selector} gap grab scroll suppresses only its drag click; ordinary click and keyboard still navigate`,async()=>{
 const b=await browser();try{
  await b.evaluate(`window.gapTrace=[];for(const type of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture','dragstart'])document.addEventListener(type,e=>gapTrace.push({type:e.type,x:e.clientX,y:e.clientY,buttons:e.buttons,button:e.button,target:e.target.className,prevented:e.defaultPrevented,scroll:document.querySelector('${selector}').scrollLeft}),true)`);
  const button=selector+(selector.includes('pinned')?' .kplex-pinned-open':' button');
  const p=await gapPoint(b,selector);await mouse(b,'mousePressed',p.x,p.y,1);await mouse(b,'mouseMoved',p.x-45,p.y,1);await mouse(b,'mouseReleased',p.x-45,p.y);
  assert((await b.evaluate(`document.querySelector('${selector}').scrollLeft`))>35,JSON.stringify(await b.evaluate('gapTrace')));assert.equal(await b.evaluate('clicks.length'),0);assert.equal(await b.evaluate(`document.querySelector('.is-mouse-scrolling')===null`),true);
  const scrollbars=await b.evaluate(`(()=>{const el=document.querySelector('${selector}');return{width:getComputedStyle(el).scrollbarWidth,display:getComputedStyle(el,'::-webkit-scrollbar').display}})()`);assert.deepEqual(scrollbars,{width:'none',display:'none'});
  await b.evaluate(`document.querySelector('${selector}').scrollLeft=0`);const q=await point(b,button);await mouse(b,'mousePressed',q.x,q.y,1);await mouse(b,'mouseMoved',q.x+2,q.y,1);await mouse(b,'mouseReleased',q.x+2,q.y);assert.equal(await b.evaluate('clicks.length'),1);
  await b.evaluate(`document.querySelector('${button}').focus()`);await b.command('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});await b.command('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});assert.equal(await b.evaluate('clicks.length'),2);
 }finally{await b.cleanup()}
});

for(const list of ['.kplex-pinned-bar','.kplex-history-list'])test(`${list} retains native horizontal touch scrolling without navigation or reordering`,async()=>{
 const b=await browser();try{
  await b.command('Emulation.setTouchEmulationEnabled',{enabled:true});
  const p=await b.evaluate(`(()=>{const r=document.querySelector('${list}').querySelectorAll('button')[1].getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  const before=await b.evaluate(`Array.from(document.querySelectorAll('[data-reorder-id]'),el=>el.dataset.reorderId)`);
  await b.command('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1,radiusX:1,radiusY:1,force:1}]});
  for(let step=1;step<=8;step++){await b.command('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x-step*15,y:p.y,id:1,radiusX:1,radiusY:1,force:1}]});await b.evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);}
  await b.command('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert((await b.evaluate(`document.querySelector('${list}').scrollLeft`))>50);
  assert.equal(await b.evaluate('clicks.length'),0);assert.equal(await b.evaluate(`!!document.querySelector('.is-reordering')`),false);
  assert.deepEqual(await b.evaluate(`Array.from(document.querySelectorAll('[data-reorder-id]'),el=>el.dataset.reorderId)`),before);
 }finally{await b.cleanup()}
});

for(const selector of ['.kplex-history-list','.kplex-pinned-bar'])test(`${selector} horizontal mouse drag from a node body scrolls rather than exporting or activating`,async()=>{
 const b=await browser();try{
  await b.evaluate(`window.dragTrace=[];for(const type of ['pointerdown','pointermove','pointerup','pointercancel','dragstart','lostpointercapture'])document.addEventListener(type,e=>dragTrace.push({type:e.type,x:e.clientX,buttons:e.buttons,prevented:e.defaultPrevented,scroll:document.querySelector('${selector}').scrollLeft}))`);
  const p=await point(b,selector+' button');await mouse(b,'mousePressed',p.x,p.y,1);
  for(let i=1;i<=8;i++)await mouse(b,'mouseMoved',p.x-i*9,p.y,1);
  await mouse(b,'mouseReleased',p.x-72,p.y);
  assert((await b.evaluate(`document.querySelector('${selector}').scrollLeft`))>40,JSON.stringify(await b.evaluate('dragTrace')));
  assert.equal(await b.evaluate('clicks.length'),0);assert.equal(await b.evaluate('drags.length'),0);
 }finally{await b.cleanup()}
});

for(const selector of ['.kplex-history-list','.kplex-pinned-bar'])for(const delta of [-72,72])test(`${selector} rapid desktop body drag ${delta} scrolls in either direction without native export`,async()=>{
 const b=await browser();try{
  const p=await b.evaluate(`(()=>{const list=document.querySelector('${selector}');list.scrollLeft=150;const bounds=list.getBoundingClientRect(),button=[...list.querySelectorAll('${selector.includes('pinned')?'.kplex-pinned-open':'button'}')].find(el=>{const r=el.getBoundingClientRect();return r.left>=bounds.left&&r.right<=bounds.right});if(!button)throw Error('A complete visible chip is required');const r=button.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,left:list.scrollLeft,max:list.scrollWidth-list.clientWidth}})()`);
  await mouse(b,'mousePressed',p.x,p.y,1);await mouse(b,'mouseMoved',p.x+delta,p.y,1);await mouse(b,'mouseReleased',p.x+delta,p.y);
  assert.equal(await b.evaluate(`document.querySelector('${selector}').scrollLeft`),Math.max(0,Math.min(p.max,p.left-delta)));
  assert.equal(await b.evaluate('clicks.length'),0);assert.equal(await b.evaluate('drags.length'),0);
 }finally{await b.cleanup()}
});

for(const selector of ['.kplex-history-list','.kplex-pinned-bar'])test(`${selector} native drag recognition before the five-pixel scroll threshold cannot steal a horizontal gesture`,async()=>{
 const b=await browser();try{
  const p=await point(b,selector+' button');await mouse(b,'mousePressed',p.x,p.y,1);await mouse(b,'mouseMoved',p.x-4,p.y+1,1);
  // Native desktop drag thresholds vary. dragstart may precede our scroll threshold, and its
  // coordinates describe the press rather than the last pointermove; preserve that host fact.
  assert.equal(await b.evaluate(`(()=>{const button=document.querySelector('${selector} button'),event=new DragEvent('dragstart',{bubbles:true,cancelable:true,clientX:${p.x},clientY:${p.y},dataTransfer:new DataTransfer()});button.dispatchEvent(event);return event.defaultPrevented})()`),true);
  await mouse(b,'mouseMoved',p.x-48,p.y+2,1);await mouse(b,'mouseReleased',p.x-48,p.y+2);
  assert((await b.evaluate(`document.querySelector('${selector}').scrollLeft`))>=40);assert.equal(await b.evaluate('drags.length'),0);assert.equal(await b.evaluate('clicks.length'),0);
 }finally{await b.cleanup()}
});

for(const selector of ['.kplex-history-list','.kplex-pinned-bar'])test(`${selector} middle-button dragging scrolls chips without export or auxiliary activation`,async()=>{
 const b=await browser();try{
  const p=await point(b,selector+' button');
  await b.command('Input.dispatchMouseEvent',{type:'mouseMoved',...p,button:'none'});
  await b.command('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'middle',buttons:4,clickCount:1});
  await b.command('Input.dispatchMouseEvent',{type:'mouseMoved',x:p.x-48,y:p.y+8,button:'middle',buttons:4});
  await b.command('Input.dispatchMouseEvent',{type:'mouseReleased',x:p.x-48,y:p.y+8,button:'middle',buttons:0,clickCount:1});
  assert((await b.evaluate(`document.querySelector('${selector}').scrollLeft`))>=40);assert.equal(await b.evaluate('drags.length'),0);assert.equal(await b.evaluate('clicks.length'),0);
 }finally{await b.cleanup()}
});

for(const selector of ['.kplex-history-list','.kplex-pinned-bar'])test(`${selector} outward mouse drag still exports a node link`,async()=>{
 const b=await browser();try{
  await b.evaluate(`window.outTrace=[];for(const type of ['pointerdown','pointermove','pointercancel','dragstart','dragend'])document.addEventListener(type,e=>outTrace.push({type:e.type,x:e.clientX,y:e.clientY,target:e.target.className,prevented:e.defaultPrevented}),true)`);
  const p=await point(b,selector+' button'),dy=selector.includes('history')?-1:1;await mouse(b,'mouseMoved',p.x,p.y);await mouse(b,'mousePressed',p.x,p.y,1);
  for(let i=1;i<=25;i++){await mouse(b,'mouseMoved',p.x,p.y+dy*i*2,1);await b.evaluate('new Promise(resolve=>requestAnimationFrame(resolve))');}
  await mouse(b,'mouseReleased',p.x,p.y+dy*50);
  assert.equal(await b.evaluate('drags.length'),1,JSON.stringify(await b.evaluate('outTrace')));assert.equal(await b.evaluate(`document.querySelector('${selector}').scrollLeft`),0);assert.equal(await b.evaluate('clicks.length'),0);
 }finally{await b.cleanup()}
});

for(const selector of ['[data-kplex-history-path="Note-2.md"]','[data-kplex-pinned-path="Note-2.md"]'])test(`${selector} shares native preview for modifier-hover and a stationary modifier press`,async()=>{
 const b=await browser();try{
  await b.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'nearest',inline:'nearest'})`);
  const p=await point(b,selector);await mouse(b,'mouseMoved',p.x,p.y);
  assert.equal(await b.evaluate('previews.length'),0);
  await b.command('Input.dispatchKeyEvent',{type:'keyDown',key:'Control',code:'ControlLeft',windowsVirtualKeyCode:17,modifiers:2});
  assert.deepEqual(await b.evaluate('previews'),[{path:'Note-2.md',ctrl:true,meta:false}]);
  await b.command('Input.dispatchKeyEvent',{type:'keyUp',key:'Control',code:'ControlLeft',windowsVirtualKeyCode:17,modifiers:0});
  await mouse(b,'mouseMoved',600,400);
  await b.command('Input.dispatchMouseEvent',{type:'mouseMoved',x:p.x,y:p.y,modifiers:4});
  assert.equal(await b.evaluate('previews.length'),2);
  await b.evaluate('unmount()');await b.command('Input.dispatchKeyEvent',{type:'keyDown',key:'Control',code:'ControlLeft',windowsVirtualKeyCode:17,modifiers:2});
  assert.equal(await b.evaluate('previews.length'),2);
 }finally{await b.cleanup()}
});

test('touch retains native scrolling; mouse cancellation and unmount retire the owning document gesture',async()=>{
 const b=await browser();try{
  const value=await b.evaluate(`(()=>{const el=document.querySelector('.kplex-history-list');const event=(type,extra)=>new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:5,pointerType:'touch',isPrimary:true,button:0,buttons:1,clientX:100,clientY:20,...extra});const down=event('pointerdown'),move=event('pointermove',{clientX:40});el.dispatchEvent(down);document.dispatchEvent(move);return{left:el.scrollLeft,prevented:move.defaultPrevented}})()`);assert.deepEqual(value,{left:0,prevented:false});
  const p=await gapPoint(b);await mouse(b,'mousePressed',p.x,p.y,1);await mouse(b,'mouseMoved',p.x-30,p.y,1);await b.evaluate(`window.dispatchEvent(new Event('blur'))`);assert.equal(await b.evaluate(`document.querySelector('.is-mouse-scrolling')===null`),true);const stopped=await b.evaluate(`document.querySelector('.kplex-history-list').scrollLeft`);await mouse(b,'mouseMoved',p.x-80,p.y,1);assert.equal(await b.evaluate(`document.querySelector('.kplex-history-list').scrollLeft`),stopped);await mouse(b,'mouseReleased',p.x-80,p.y);
  await b.evaluate(`window.retired=document.querySelector('.kplex-history-list');unmount();document.dispatchEvent(new PointerEvent('pointermove',{pointerId:1,pointerType:'mouse',buttons:1,clientX:-100}));`);assert.equal(await b.evaluate(`retired.classList.contains('is-mouse-scrolling')`),false);
 }finally{await b.cleanup()}
});

test('a secondary document owns and releases its own pointer listeners',async()=>{
 const b=await browser();try{const counts=await b.evaluate('checkOwnerDocument()');assert.equal(counts.add,3);assert.equal(counts.remove,3)}finally{await b.cleanup()}
});

test('a new touch press is not swallowed after a cancelled mouse drag',async()=>{
 const b=await browser();try{
  await b.evaluate(`document.querySelector('.kplex-history-list').addEventListener('pointerdown',e=>window.testPointer=e.pointerId,{once:true})`);
  const p=await gapPoint(b);await mouse(b,'mousePressed',p.x,p.y,1);await mouse(b,'mouseMoved',p.x-30,p.y,1);
  await b.evaluate(`(()=>{const list=document.querySelector('.kplex-history-list'),button=list.querySelector('button');list.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:testPointer,pointerType:'mouse'}));button.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:22,pointerType:'touch',isPrimary:true}));button.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));})()`);
  assert.equal(await b.evaluate('clicks.length'),1);assert.equal(await b.evaluate(`document.querySelector('.is-mouse-scrolling')===null`),true);
  await mouse(b,'mouseReleased',p.x-30,p.y);
 }finally{await b.cleanup()}
});
