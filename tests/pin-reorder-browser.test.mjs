/** Trusted Chromium input through the real pin component and canonical order owner. Finite host
 * callbacks record writes/navigation/menu intent; no graph/source capabilities are supplied. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import {chromiumHarness} from './support/browserTypeScript.mjs';
import {nativeIconBoundary} from './support/nativeIconBoundary.mjs';
const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
 import React from 'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';
 import{PinnedNodeBar}from'./src/ui/PinnedNodeBar';import{moveSavedPin,savedPinEntries}from'./src/core/plex/savedPins';
 export{savedPinEntries};
 let pins=['A.md','Unavailable.md','B.md','C.md'];const owners=[];
 window.calls={writes:0,navigation:0,remove:0,menus:0};window.order=()=>[...pins];
 const rows=()=>savedPinEntries(pins).map(row=>({id:row.id,path:row.entry,label:row.entry,icon:'file',active:false,available:row.entry!=='Unavailable.md'}));
 const props=()=>({rows:rows(),translate:(key,args)=>key+(args?.title??''),onActivate:()=>calls.navigation++,onRemove:()=>calls.remove++,
 onMenu:(id,button)=>{calls.menus++;window.menuOwner=button.ownerDocument===document?'main':'frame'},
 onMove:move=>{const next=moveSavedPin(pins,move);if(next){pins=next;calls.writes++;render()}}});
 function render(){for(const owner of owners)flushSync(()=>owner.root.render(<PinnedNodeBar {...props()}/>))}
 window.concurrent=value=>{pins=value;render()};
 window.mount=()=>{const el=document.body.appendChild(document.createElement('div'));el.style.width='900px';owners.push({el,root:createRoot(el)});render()};
 window.unmount=()=>{for(const owner of owners.splice(0)){flushSync(()=>owner.root.unmount());owner.el.remove()}};
 window.frame=()=>{const frame=document.body.appendChild(document.createElement('iframe'));frame.style.width='950px';frame.style.height='150px';
  const doc=frame.contentDocument,style=doc.createElement('style');style.textContent=window.testCss;doc.head.append(style);
  const counts=window.listenerCounts={add:0,remove:0},add=doc.addEventListener.bind(doc),remove=doc.removeEventListener.bind(doc);
  doc.addEventListener=(type,...args)=>{if(['pointermove','pointerup','pointercancel','keydown'].includes(type))counts.add++;return add(type,...args)};
  doc.removeEventListener=(type,...args)=>{if(['pointermove','pointerup','pointercancel','keydown'].includes(type))counts.remove++;return remove(type,...args)};
  const el=doc.body.appendChild(doc.createElement('div'));el.style.width='900px';const owner={el,root:createRoot(el)};owners.push(owner);render();
  window.closeFrame=()=>{owners.splice(owners.indexOf(owner),1);flushSync(()=>owner.root.unmount());frame.remove()};
 };
 document.addEventListener('pointerdown',event=>window.pointer=event.pointerId,true);
 window.point=(index,frame=false)=>{const host=frame?document.querySelector('iframe'):null,doc=host?.contentDocument??document,
  r=doc.querySelectorAll('.kplex-pin-reorder-handle')[index].querySelector('svg').getBoundingClientRect(),box=host?.getBoundingClientRect();
  return{x:r.x+r.width/2+(box?.left??0)+(host?.clientLeft??0),y:r.y+r.height/2+(box?.top??0)+(host?.clientTop??0)}};
`},bundle:true,write:false,format:'iife',globalName:'sourceModules',platform:'browser',plugins:[nativeIconBoundary]});

/** Own actual CSS and browser lifetime independently for each gesture case. */
async function browser(){const b=await chromiumHarness(bundle.outputFiles[0].text);try{await b.evaluate(`(()=>{window.testCss=${JSON.stringify(readFileSync('styles.css','utf8'))};const s=document.createElement('style');s.textContent=testCss;document.head.append(s);mount()})()`);return b}catch(error){await b.cleanup();throw error}}
/** Hardware-style primary input exercises native capture and post-release synthesized clicks. */
async function mouse(b,type,point,buttons=0){await b.command('Input.dispatchMouseEvent',{type,...point,button:type==='mouseMoved'?'none':'left',buttons,clickCount:type==='mouseMoved'?0:1})}
/** Start on the actual SVG glyph, including adopted native icons inside another document. */
async function start(b,index=3,frame=false){await b.evaluate(`(()=>{const doc=${frame}?document.querySelector('iframe').contentDocument:document,toggle=doc.querySelector('.kplex-pin-edit-toggle');if(toggle.getAttribute('aria-pressed')==='false')toggle.click()})()`);const p=await b.evaluate(`point(${index},${frame})`);await mouse(b,'mousePressed',p,1);return p}

test('real handle drop inserts once without navigation, menu activation or unpin',async()=>{
 const b=await browser();try{
  const source=await start(b);const target=await b.evaluate('point(0)');await mouse(b,'mouseMoved',target,1);
  assert.equal(await b.evaluate(`document.querySelectorAll('.is-reorder-before').length`),1);
  const feedback=await b.evaluate(`(()=>{const source=document.querySelector('.is-reorder-source'),other=document.querySelector('.kplex-pinned-chip:not(.is-reorder-source):not(.is-reorder-before)');return {offset:parseFloat(source.style.getPropertyValue('--reorder-drag-x')),transform:getComputedStyle(source).transform,sourceOpacity:getComputedStyle(source).opacity,otherOpacity:getComputedStyle(other).opacity}})()`);
  assert.equal(feedback.offset,target.x-source.x);assert.notEqual(feedback.transform,'none');assert.ok(Number(feedback.sourceOpacity)>Number(feedback.otherOpacity));
  await mouse(b,'mouseReleased',target);assert.deepEqual(await b.evaluate('order()'),['C.md','A.md','Unavailable.md','B.md']);
  assert.deepEqual(await b.evaluate('calls'),{writes:1,navigation:0,remove:0,menus:0});
  assert.equal(await b.evaluate(`Array.from(document.querySelectorAll('.kplex-pinned-chip')).some(row=>row.style.getPropertyValue('--reorder-drag-x'))`),false);
  assert.equal(await b.evaluate(`document.querySelector('[data-kplex-pinned-path="Unavailable.md"]').disabled`),true);
 }finally{await b.cleanup()}
});

test('pins start locked, edit mode alone exposes mutation controls and disabling it cancels an active drag',async()=>{
 const b=await browser();try{
  assert.equal(await b.evaluate(`document.querySelector('.kplex-pin-edit-toggle').getAttribute('aria-pressed')`),'false');
  assert.equal(await b.evaluate(`document.querySelectorAll('.kplex-pin-reorder-handle,.kplex-pinned-remove').length`),0);
  await b.evaluate(`document.querySelector('.kplex-pinned-open').click()`);assert.equal(await b.evaluate('calls.navigation'),1);
  await start(b);const target=await b.evaluate('point(0)');await mouse(b,'mouseMoved',target,1);
  assert.equal(await b.evaluate(`!!document.querySelector('.is-reordering')`),true);
  await b.evaluate(`document.querySelector('.kplex-pin-edit-toggle').click()`);await mouse(b,'mouseReleased',target);
  assert.equal(await b.evaluate(`document.querySelectorAll('.kplex-pin-reorder-handle,.kplex-pinned-remove').length`),0);
  assert.equal(await b.evaluate(`!!document.querySelector('.is-reordering')`),false);
  assert.deepEqual(await b.evaluate('calls'),{writes:0,navigation:1,remove:0,menus:0});
 }finally{await b.cleanup()}
});

test('threshold and keyboard handle activation preserve normal menu and note clicks',async()=>{
 const b=await browser();try{
  const p=await start(b,0);await mouse(b,'mouseMoved',{x:p.x+2,y:p.y},1);await mouse(b,'mouseReleased',{x:p.x+2,y:p.y});
  assert.deepEqual(await b.evaluate('calls'),{writes:0,navigation:0,remove:0,menus:1});
  await b.evaluate(`document.querySelector('.kplex-pin-reorder-handle').focus()`);
  await b.command('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});await b.command('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  assert.equal(await b.evaluate('calls.menus'),2);assert.equal(await b.evaluate('calls.writes'),0);
  await b.evaluate(`document.querySelector('.kplex-pinned-open').click()`);assert.equal(await b.evaluate('calls.navigation'),1);
 }finally{await b.cleanup()}
});

test('overflowing pins scroll from their body while handles alone reorder and remove still works',async()=>{
 const b=await browser();try{
  await b.evaluate(`document.querySelector('.kplex-pinned-bar').parentElement.style.width='220px'`);
  const body=await b.evaluate(`(()=>{const r=document.querySelector('.kplex-pinned-open').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await mouse(b,'mousePressed',body,1);await mouse(b,'mouseMoved',{x:body.x-40,y:body.y},1);await mouse(b,'mouseReleased',{x:body.x-40,y:body.y});
  assert((await b.evaluate(`document.querySelector('.kplex-pinned-bar').scrollLeft`))>30);
  assert.deepEqual(await b.evaluate('calls'),{writes:0,navigation:0,remove:0,menus:0});
  await b.evaluate(`document.querySelector('.kplex-pinned-bar').scrollLeft=0`);
  await start(b,0);const target=await b.evaluate(`(()=>{const r=document.querySelectorAll('.kplex-pinned-chip')[1].getBoundingClientRect();return{x:r.x+r.width/2+5,y:r.y+r.height/2}})()`);await mouse(b,'mouseMoved',target,1);
  assert.equal(await b.evaluate(`document.querySelector('.kplex-pinned-bar').scrollLeft`),0);
  assert.equal(await b.evaluate(`!!document.querySelector('.is-mouse-scrolling')`),false);
  await mouse(b,'mouseReleased',target);assert.equal(await b.evaluate('calls.writes'),1);
  assert.deepEqual(await b.evaluate('order()'),['Unavailable.md','A.md','B.md','C.md']);
  const remove=await b.evaluate(`(()=>{const r=document.querySelector('.kplex-pinned-remove').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await mouse(b,'mousePressed',remove,1);await mouse(b,'mouseReleased',remove);assert.equal(await b.evaluate('calls.remove'),1);
 }finally{await b.cleanup()}
});

for(const mode of ['escape','blur','cancel','unmount'])test(`committed ${mode} cancellation never writes or navigates`,async()=>{
 const b=await browser();try{
  await start(b);const target=await b.evaluate('point(0)');await mouse(b,'mouseMoved',target,1);
  if(mode==='escape')await b.command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  else await b.evaluate(mode==='blur'?`window.dispatchEvent(new Event('blur'))`:mode==='cancel'?`document.querySelector('.kplex-pinned-bar').dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:pointer}))`:'unmount()');
  await mouse(b,'mouseReleased',target);assert.deepEqual(await b.evaluate('order()'),['A.md','Unavailable.md','B.md','C.md']);
  assert.equal(await b.evaluate('calls.writes+calls.navigation+calls.remove'),0);assert.equal(await b.evaluate(`!!document.querySelector('.is-reordering')`),false);
  assert.equal(await b.evaluate(`Array.from(document.querySelectorAll('.kplex-pinned-chip')).some(row=>row.style.getPropertyValue('--reorder-drag-x'))`),false);
 }finally{await b.cleanup()}
});

test('a concurrent addition survives an old drag and a new touch remains browser-owned',async()=>{
 const b=await browser();try{
  await start(b);const target=await b.evaluate('point(0)');await mouse(b,'mouseMoved',target,1);await b.evaluate(`concurrent(['A.md','Unavailable.md','B.md','C.md','New.md'])`);
  await mouse(b,'mouseReleased',target);assert.equal(await b.evaluate('calls.writes'),0);assert.deepEqual(await b.evaluate('order()'),['A.md','Unavailable.md','B.md','C.md','New.md']);
  const prevented=await b.evaluate(`(()=>{const target=document.querySelector('.kplex-pinned-open'),event=new PointerEvent('pointerdown',{pointerType:'touch',pointerId:12,isPrimary:true,bubbles:true,cancelable:true});target.dispatchEvent(event);return event.defaultPrevented})()`);assert.equal(prevented,false);
 }finally{await b.cleanup()}
});

test('another document accepts adopted SVG handles and releases its exact listeners',async()=>{
 const b=await browser();try{
  await b.evaluate('frame()');await start(b,3,true);const target=await b.evaluate('point(0,true)');await mouse(b,'mouseMoved',target,1);await mouse(b,'mouseReleased',target);
  assert.deepEqual(await b.evaluate('order()'),['C.md','A.md','Unavailable.md','B.md']);assert.equal(await b.evaluate('calls.writes'),1);
  await b.evaluate('closeFrame()');assert.deepEqual(await b.evaluate('listenerCounts'),{add:7,remove:7});
 }finally{await b.cleanup()}
});
