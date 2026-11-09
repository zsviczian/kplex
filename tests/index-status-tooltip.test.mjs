/** Exercise the actual status component and shared gesture owner without starting the graph host. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import ts from 'typescript';
import {chromiumHarness} from './support/browserTypeScript.mjs';

const source=ts.createSourceFile('App.tsx',readFileSync('src/ui/App.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const component=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='IndexStatusIndicator');
assert(component,'Actual status component required');
const statusHook=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='useIndexStatus');
assert(statusHook,'Actual status subscription hook required');
const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
import React,{useRef,useState,useEffect,useId} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {DoubleTapGesture} from './src/ui/components/DoubleTapGesture';
import {installKplexLongPressTooltips,KPLEX_CONTROL_LONG_PRESS_EVENT} from './src/ui/LongPressTooltip';
${component.getText(source)}
${statusHook.getText(source)}
export {IndexStatusIndicator};
function Fixture(){const ref=useRef(null),[open,setOpen]=useState(false),[summary,setSummary]=useState(0);useEffect(()=>installKplexLongPressTooltips(document),[]);return <main data-kplex-tooltip-scope><IndexStatusIndicator status={{upToDate:false,phase:'incomplete',label:'Relationship data is incomplete'}} indicatorRef={ref} open={open} onHoverStart={()=>setOpen(true)} onHoverEnd={()=>setOpen(false)} onToggle={()=>{setOpen(false);setSummary(value=>value+1)}}/>{open&&<aside data-status-callout>Relationship data is incomplete</aside>}<output data-summary>{summary}</output></main>}
window.mountStatus=()=>{document.body.innerHTML='<div id="fixture"></div>';window.statusRoot=createRoot(document.getElementById('fixture'));flushSync(()=>window.statusRoot.render(<Fixture/>))};
window.renderActivityStatus=(activeWork,cacheSavePending=false)=>{if(!window.statusRoot){document.body.innerHTML='<div id="fixture"></div>';window.statusRoot=createRoot(document.getElementById('fixture'))}flushSync(()=>window.statusRoot.render(<IndexStatusIndicator status={{upToDate:true,activeWork,cacheSavePending,phase:'ready',label:activeWork?'Validating note metadata':cacheSavePending?'Index ready; cache save pending':'Index ready'}} open={false} onHoverStart={()=>{}} onHoverEnd={()=>{}} onToggle={()=>{}}/>))};
function SubscribedFixture({plugin}){const status=useIndexStatus(plugin,plugin.leaf);return <IndexStatusIndicator status={status} open={false} onHoverStart={()=>{}} onHoverEnd={()=>{}} onToggle={()=>{}}/>}
window.mountSubscribedStatus=()=>{
 let current={upToDate:true,activeWork:true,cacheSavePending:false,phase:'ready',label:'Loading cached web links',indexedFiles:1,totalFiles:1},visible=true;
 const listeners=new Set(),subscribe=listener=>{const registration=()=>listener();listeners.add(registration);return()=>listeners.delete(registration)};
 const plugin={leaf:{},getIndexStatus:()=>current,isKplexLeafVisible:()=>visible,subscribeIndexStatus:subscribe,subscribeKplexVisibility:subscribe,index:{subscribe,subscribePresentation:subscribe}};
 document.body.innerHTML='<div id="fixture"></div>';window.statusRoot=createRoot(document.getElementById('fixture'));flushSync(()=>statusRoot.render(<SubscribedFixture plugin={plugin}/>));
 window.updateSubscribedStatus=(active,pending,hidden)=>{visible=!hidden;current={...current,activeWork:active,cacheSavePending:pending,label:active?'Loading cached web links':pending?'Index ready; cache save pending':'Index ready'};flushSync(()=>{for(const listener of listeners)listener()})};window.statusListenerCount=()=>listeners.size;
};
`},write:false,bundle:true,format:'iife',globalName:'sourceModules',platform:'browser'});

test('a terminal status notification clears red without navigation even when native geometry is hidden',async()=>{
 const host=await chromiumHarness(bundle.outputFiles[0].text);try{
  assert.deepEqual(await host.evaluate(`(async()=>{mountSubscribedStatus();await new Promise(done=>setTimeout(done,30));const button=document.querySelector('button'),read=()=>({green:button.classList.contains('is-ready'),blinking:button.classList.contains('is-updating'),label:document.getElementById(button.getAttribute('aria-labelledby')).textContent});const active=read(),listeners=statusListenerCount();updateSubscribedStatus(false,true,true);const pending=read();updateSubscribedStatus(false,false,true);const saved=read();statusRoot.unmount();return{active,pending,saved,listeners,remaining:statusListenerCount()}})()`),
   {active:{green:false,blinking:true,label:'Loading cached web links'},pending:{green:true,blinking:false,label:'Index ready; cache save pending'},saved:{green:true,blinking:false,label:'Index ready'},listeners:4,remaining:0});
 }finally{await host.cleanup();}
});

test('status retains one callout, accessible naming, keyboard activation and touch summary gestures',async()=>{
 const host=await chromiumHarness(bundle.outputFiles[0].text);
 try{
  const result=await host.evaluate(`(async()=>{mountStatus();const wait=ms=>new Promise(r=>setTimeout(r,ms));await wait(60);const button=document.querySelector('button'),read=()=>({callouts:document.querySelectorAll('[data-status-callout]').length,tooltips:document.querySelectorAll('.tooltip').length,summary:Number(document.querySelector('[data-summary]').textContent)}),fire=(type,extra={})=>button.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:1,isPrimary:true,pointerType:'touch',button:0,clientX:10,clientY:10,...extra}));const name=document.getElementById(button.getAttribute('aria-labelledby')).textContent,noLabel=!button.hasAttribute('aria-label')&&!button.hasAttribute('title');button.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));button.dispatchEvent(new PointerEvent('pointerover',{bubbles:true,pointerType:'mouse',buttons:0}));await wait(720);const hover=read();button.dispatchEvent(new MouseEvent('mouseout',{bubbles:true,relatedTarget:document.body}));await wait(40);const dismissed=read();fire('pointerdown');await wait(510);const long=read();fire('pointerup');button.click();await wait(40);const released=read();button.focus();await wait(40);button.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,key:'Enter'}));await wait(40);const keyboard=read();button.blur();fire('pointerdown');fire('pointerup');await wait(80);fire('pointerdown');fire('pointerup');await wait(40);const doubleTap=read();statusRoot.unmount();await wait(40);return{name,noLabel,hover,dismissed,long,released,keyboard,doubleTap,removed:!document.querySelector('button,.tooltip')}})()`);
  assert.equal(result.name,'Relationship data is incomplete');assert.equal(result.noLabel,true);
  assert.deepEqual(result.hover,{callouts:1,tooltips:0,summary:0});assert.equal(result.dismissed.callouts,0);
  assert.deepEqual(result.long,{callouts:1,tooltips:0,summary:0});assert.deepEqual(result.released,result.long);
  assert.deepEqual(result.keyboard,{callouts:0,tooltips:0,summary:1});assert.equal(result.doubleTap.summary,2);
  assert.equal(result.removed,true);
 }finally{await host.cleanup()}
});

test('a ready usable graph retains the updating indicator while background validation is active',async()=>{
 const host=await chromiumHarness(bundle.outputFiles[0].text);
 try{
  assert.deepEqual(await host.evaluate(`(()=>{renderActivityStatus(true);const button=document.querySelector('button');const active={updating:button.classList.contains('is-updating'),green:button.classList.contains('is-ready')};renderActivityStatus(false);const settled={updating:button.classList.contains('is-updating'),green:button.classList.contains('is-ready')};statusRoot.unmount();return{active,settled}})()`),
   {active:{updating:true,green:false},settled:{updating:false,green:true}});
 }finally{await host.cleanup();}
});

test('a ready graph stays green with an unsaved cache disclosed in the tooltip',async()=>{
 const host=await chromiumHarness(bundle.outputFiles[0].text);
 try{
  assert.deepEqual(await host.evaluate(`(()=>{renderActivityStatus(false,true);const button=document.querySelector('button');const pending={amber:button.classList.contains('is-cache-pending'),green:button.classList.contains('is-ready'),blinking:button.classList.contains('is-updating'),label:document.getElementById(button.getAttribute('aria-labelledby')).textContent};renderActivityStatus(false,false);const saved=button.classList.contains('is-ready')&&!button.classList.contains('is-cache-pending');statusRoot.unmount();return{pending,saved}})()`),
   {pending:{amber:false,green:true,blinking:false,label:'Index ready; cache save pending'},saved:true});
 }finally{await host.cleanup();}
});
