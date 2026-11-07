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
let history,pins;
/** Extract production JSX so shared style wiring and disabled/loading behavior are exercised. */
function find(node){
 if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='historyBar')history=node.initializer.getText(source);
 if(ts.isJsxExpression(node)&&node.expression?.getText(source).includes('<PinnedNodeBar rows={pinnedPages}'))pins=node.expression.getText(source);
 ts.forEachChild(node,find);
}
find(source);assert(history&&pins);
const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
import React from 'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';
import{HorizontalDragScroll}from'./src/ui/components/HorizontalDragScroll';
import{nodeListPresentation}from'./src/ui/nodeListPresentation';
import{PinnedNodeBar}from'./src/ui/PinnedNodeBar';
import{savedPinEntries,moveSavedPin}from'./src/core/plex/savedPins';
export {nodeListPresentation};
import{nodePaint,nodePaintFallbacks,resolveNodeStyle}from'./src/index/style';
const settings={baseNodeStyle:{backgroundColor:'#222222',textColor:'#eeeeee',borderColor:'#444444'},
 tagStyleList:['topic'],tagNodeStyles:{topic:{backgroundColor:'#114477',textColor:'#ffffff',borderColor:'#1199ff',prefix:'T ',icon:'tag',strokeStyle:'dotted',strokeWidth:2}},
 noteTypeStyles:{Guide:{backgroundColor:'#774411',borderColor:'#ff9911',prefix:'G ',icon:'book',strokeStyle:'dashed'}},
 folderNodeStyle:{backgroundColor:'#227722'},tagNodeStyle:{backgroundColor:'#772277'},virtualNodeStyle:{fillStyle:'hachure'},urlNodeStyle:{textColor:'#00ffff'},attachmentNodeStyle:{backgroundColor:'#777722'}};
const pages=Array.from({length:16},(_,i)=>({path:'Note-'+i+'.md',name:'Note '+i,file:{extension:'md'},isFolder:false,isTag:false,url:null,primaryStyleTag:i===1||i===2?'topic':null,styleTags:['topic'],noteType:i===2?'Guide':null}));
pages[3]={...pages[3],file:null,isFolder:true,path:'folder:Notes'};pages[4]={...pages[4],file:null,isTag:true,path:'tag:topic/child'};
pages[5]={...pages[5],file:null};pages[6]={...pages[6],file:{extension:'pdf'}};pages[7]={...pages[7],file:null,url:'https://example.com'};
window.clicks=[];const actions={dispatch:request=>clicks.push(request.id)},actionNodeRef=page=>({identity:page.path}),translate=key=>key;
const plugin={settings:{navigationHistory:pages.map(p=>p.path),pinnedNodes:pages.slice(0,8).map(p=>p.path)},index:{get:path=>pages.find(p=>p.path===path),titleFor:page=>page.name},removePinnedEntry:async()=>{}};
const activePath=pages[2].path,page=pages[2],paintSettings=settings;
const movePin=move=>{const next=moveSavedPin(plugin.settings.pinnedNodes,move);if(next){plugin.settings.pinnedNodes=next;window.mount()}},pinMoveMenu=()=>{},activateSavedPin=id=>{const row=savedPinEntries(plugin.settings.pinnedNodes).find(row=>row.id===id);if(row)actions.dispatch({id:'node.activate',target:{node:actionNodeRef(plugin.index.get(row.entry))}})};
const ObsidianIcon=({name})=><span className='kplex-icon' data-icon={name}/>;
let host,root;function Surface(){const pinnedPages=savedPinEntries(plugin.settings.pinnedNodes).map(row=>{const p=plugin.index.get(row.entry),v=nodeListPresentation(p,p.name,settings);return {id:row.id,path:row.entry,...v,active:row.entry===activePath,available:true}});return <>{${pins}}{${history}}</>};
window.mount=()=>{if(!root){host=document.body.appendChild(document.createElement('div'));host.className='kplex-main-column';host.style.width='450px';root=createRoot(host)}flushSync(()=>root.render(<Surface/>))};window.unmount=()=>flushSync(()=>root.unmount());
window.repaint=()=>{settings.noteTypeStyles.Guide.backgroundColor='#336699';delete settings.noteTypeStyles.Guide.prefix;window.mount()};
window.expected=()=>nodePaint(resolveNodeStyle(pages[2],null,'child',settings),nodePaintFallbacks({page:pages[2],role:'child'}));
window.project=()=>pages.slice(0,8).map(p=>nodeListPresentation(p,p.name,settings));
window.checkOwnerDocument=()=>{const frame=document.body.appendChild(document.createElement('iframe')),doc=frame.contentDocument,counts={add:0,remove:0};
const add=doc.addEventListener.bind(doc),remove=doc.removeEventListener.bind(doc);doc.addEventListener=(type,...args)=>{if(['pointermove','pointerup','pointercancel'].includes(type))counts.add++;return add(type,...args)};doc.removeEventListener=(type,...args)=>{if(['pointermove','pointerup','pointercancel'].includes(type))counts.remove++;return remove(type,...args)};
const root=createRoot(doc.body.appendChild(doc.createElement('div')));flushSync(()=>root.render(<HorizontalDragScroll className='kplex-history-list'><button>Other document</button></HorizontalDragScroll>));flushSync(()=>root.unmount());frame.remove();return counts};
`},bundle:true,write:false,format:'iife',globalName:'sourceModules',platform:'browser',plugins:[nativeIconBoundary]});

/** Load actual plugin CSS; native theme fallbacks receive finite test tokens. */
async function browser(){const b=await chromiumHarness(bundle.outputFiles[0].text);try{await b.evaluate(`(()=>{window.mount();const s=document.createElement('style');s.textContent=${JSON.stringify(readFileSync('styles.css','utf8'))};document.head.append(s);document.body.style.setProperty('--text-normal','#eeeeee');})()`);return b}catch(e){await b.cleanup();throw e}}
/** Send real primary mouse input through the browser's pointer capture and synthesized-click path. */
async function mouse(b,type,x,y,buttons=0){await b.command('Input.dispatchMouseEvent',{type,x,y,button:type==='mouseMoved'?'none':'left',buttons,clickCount:type==='mouseMoved'?0:1})}
/** Read a visible button's interior point independently of compact label wrapping. */
async function point(b,selector='.kplex-history-list button'){return b.evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`)}

test('History and pins use live type/tag/kind node paint, prefix and icon without changing compact size',async()=>{
 const b=await browser();try{
  const result=await b.evaluate(`(()=>{const all=project(),p=document.querySelector('[data-kplex-pinned-path="Note-2.md"]'),h=document.querySelector('[data-kplex-history-path="Note-2.md"]');return {all,paint:expected(),pin:{text:p.textContent,icon:p.querySelector('[data-icon]').dataset.icon,bg:getComputedStyle(p.parentElement).backgroundColor,color:getComputedStyle(p).color,border:getComputedStyle(p.parentElement).borderStyle},history:{text:h.textContent,icon:h.querySelector('[data-icon]').dataset.icon,bg:getComputedStyle(h).backgroundColor,color:getComputedStyle(h).color,border:getComputedStyle(h).borderStyle,width:h.getBoundingClientRect().width}}})()`);
  assert.equal(result.history.text,'G Note 2');assert.equal(result.pin.text,'G Note 2');assert.equal(result.history.icon,'book');assert.equal(result.pin.icon,'book');
  assert.equal(result.history.bg,'rgb(119, 68, 17)');assert.equal(result.pin.bg,result.history.bg);assert.equal(result.pin.color,result.history.color);assert.equal(result.history.border,'dashed');assert.equal(result.pin.border,'dashed');assert.equal(result.history.width,180);
  assert.equal(result.all[1].icon,'tag');assert.equal(result.all[1].style.borderStyle,'dotted');assert.equal(result.all[3].style.background,'#227722');assert(result.all[4].label.includes('#topic/child'));assert(result.all[5].style.background.includes('gradient'));assert.equal(result.all[6].style.background,'#777722');
  await b.evaluate('repaint()');assert.deepEqual(await b.evaluate(`(()=>{const p=document.querySelector('[data-kplex-pinned-path="Note-2.md"]'),h=document.querySelector('[data-kplex-history-path="Note-2.md"]');return [getComputedStyle(p.parentElement).backgroundColor,getComputedStyle(h).backgroundColor,p.textContent,h.textContent]})()`),['rgb(51, 102, 153)','rgb(51, 102, 153)','T Note 2','T Note 2']);
 }finally{await b.cleanup()}
});

for(const selector of ['.kplex-history-list','.kplex-pinned-bar'])test(`${selector} mouse grab scroll suppresses only its drag click; ordinary click and keyboard still navigate`,async()=>{
 const b=await browser();try{
  const button=selector+(selector.includes('pinned')?' .kplex-pinned-open':' button');
  const p=await point(b,button);await mouse(b,'mousePressed',p.x,p.y,1);await mouse(b,'mouseMoved',p.x-45,p.y,1);await mouse(b,'mouseReleased',p.x-45,p.y);
  assert((await b.evaluate(`document.querySelector('${selector}').scrollLeft`))>35);assert.equal(await b.evaluate('clicks.length'),0);assert.equal(await b.evaluate(`document.querySelector('.is-mouse-scrolling')===null`),true);
  const scrollbars=await b.evaluate(`(()=>{const el=document.querySelector('${selector}');return{width:getComputedStyle(el).scrollbarWidth,display:getComputedStyle(el,'::-webkit-scrollbar').display}})()`);assert.deepEqual(scrollbars,{width:'none',display:'none'});
  await b.evaluate(`document.querySelector('${selector}').scrollLeft=0`);const q=await point(b,button);await mouse(b,'mousePressed',q.x,q.y,1);await mouse(b,'mouseMoved',q.x+2,q.y,1);await mouse(b,'mouseReleased',q.x+2,q.y);assert.equal(await b.evaluate('clicks.length'),1);
  await b.evaluate(`document.querySelector('${button}').focus()`);await b.command('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});await b.command('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});assert.equal(await b.evaluate('clicks.length'),2);
 }finally{await b.cleanup()}
});

test('pins retain native horizontal touch scrolling without navigation or reordering',async()=>{
 const b=await browser();try{
  await b.command('Emulation.setTouchEmulationEnabled',{enabled:true});
  const p=await b.evaluate(`(()=>{const r=document.querySelectorAll('.kplex-pinned-open')[1].getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  const before=await b.evaluate(`Array.from(document.querySelectorAll('[data-reorder-id]'),el=>el.dataset.reorderId)`);
  await b.command('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1,radiusX:1,radiusY:1,force:1}]});
  for(let step=1;step<=8;step++){await b.command('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x-step*15,y:p.y,id:1,radiusX:1,radiusY:1,force:1}]});await b.evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);}
  await b.command('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert((await b.evaluate(`document.querySelector('.kplex-pinned-bar').scrollLeft`))>50);
  assert.equal(await b.evaluate('clicks.length'),0);assert.equal(await b.evaluate(`!!document.querySelector('.is-reordering')`),false);
  assert.deepEqual(await b.evaluate(`Array.from(document.querySelectorAll('[data-reorder-id]'),el=>el.dataset.reorderId)`),before);
 }finally{await b.cleanup()}
});

test('touch retains native scrolling; mouse cancellation and unmount retire the owning document gesture',async()=>{
 const b=await browser();try{
  const value=await b.evaluate(`(()=>{const el=document.querySelector('.kplex-history-list');const event=(type,extra)=>new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:5,pointerType:'touch',isPrimary:true,button:0,buttons:1,clientX:100,clientY:20,...extra});const down=event('pointerdown'),move=event('pointermove',{clientX:40});el.dispatchEvent(down);document.dispatchEvent(move);return{left:el.scrollLeft,prevented:move.defaultPrevented}})()`);assert.deepEqual(value,{left:0,prevented:false});
  const p=await point(b);await mouse(b,'mousePressed',p.x,p.y,1);await mouse(b,'mouseMoved',p.x-30,p.y,1);await b.evaluate(`window.dispatchEvent(new Event('blur'))`);assert.equal(await b.evaluate(`document.querySelector('.is-mouse-scrolling')===null`),true);const stopped=await b.evaluate(`document.querySelector('.kplex-history-list').scrollLeft`);await mouse(b,'mouseMoved',p.x-80,p.y,1);assert.equal(await b.evaluate(`document.querySelector('.kplex-history-list').scrollLeft`),stopped);await mouse(b,'mouseReleased',p.x-80,p.y);
  await b.evaluate(`window.retired=document.querySelector('.kplex-history-list');unmount();document.dispatchEvent(new PointerEvent('pointermove',{pointerId:1,pointerType:'mouse',buttons:1,clientX:-100}));`);assert.equal(await b.evaluate(`retired.classList.contains('is-mouse-scrolling')`),false);
 }finally{await b.cleanup()}
});

test('a secondary document owns and releases its own pointer listeners',async()=>{
 const b=await browser();try{const counts=await b.evaluate('checkOwnerDocument()');assert.equal(counts.add,3);assert.equal(counts.remove,3)}finally{await b.cleanup()}
});

test('a new touch press is not swallowed after a cancelled mouse drag',async()=>{
 const b=await browser();try{
  await b.evaluate(`document.querySelector('.kplex-history-list').addEventListener('pointerdown',e=>window.testPointer=e.pointerId,{once:true})`);
  const p=await point(b);await mouse(b,'mousePressed',p.x,p.y,1);await mouse(b,'mouseMoved',p.x-30,p.y,1);
  await b.evaluate(`(()=>{const list=document.querySelector('.kplex-history-list'),button=list.querySelector('button');list.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:testPointer,pointerType:'mouse'}));button.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:22,pointerType:'touch',isPrimary:true}));button.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));})()`);
  assert.equal(await b.evaluate('clicks.length'),1);assert.equal(await b.evaluate(`document.querySelector('.is-mouse-scrolling')===null`),true);
  await mouse(b,'mouseReleased',p.x-30,p.y);
 }finally{await b.cleanup()}
});
