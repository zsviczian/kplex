/**
 * Real Chromium lifecycle, timing and rectangle checks for the shared hover/long-press owner.
 * Fixture DOM helpers only bridge Obsidian's createDiv/setCssStyles spellings to real DOM APIs;
 * native theme/host behavior is checked separately in the explicitly named disposable vault.
 */
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {chromiumHarness} from './support/browserTypeScript.mjs';
const result=await build({stdin:{resolveDir:process.cwd(),contents:`export {installKplexLongPressTooltips} from './src/ui/LongPressTooltip';`},write:false,bundle:true,format:'iife',globalName:'sourceModules',platform:'browser'});
const css=readFileSync('styles.css','utf8');
/** Mount real nodes with only the host DOM-helper names bridged and an intentionally translated theme. */
async function fixture(host){
 await host.evaluate(`(()=>{
  const hints=window.sourceModules;
  const helpers=win=>{win.HTMLElement.prototype.createDiv=function(options){const el=this.ownerDocument.createElement('div');el.className=options.cls??'';el.textContent=options.text??'';for(const [key,value]of Object.entries(options.attr??{}))el.setAttribute(key,value);this.append(el);return el};win.HTMLElement.prototype.addClass=function(value){this.classList.add(value)};win.HTMLElement.prototype.removeClass=function(value){this.classList.remove(value)};win.HTMLElement.prototype.toggleClass=function(value,on){this.classList.toggle(value,on)};win.HTMLElement.prototype.setCssStyles=function(values){Object.assign(this.style,values)}};
  helpers(window);document.body.innerHTML='<main data-kplex-tooltip-scope><button id="top" aria-label="Top control" style="position:fixed;top:10px;left:40px">Top</button><button id="bottom" aria-label="Bottom control" style="position:fixed;bottom:10px;right:10px"><span>Bottom</span></button><label id="rail" data-kplex-control-tooltip aria-label="A long explanatory help message which wraps over several lines and must fit before choosing a side." style="position:fixed;bottom:12px;left:110px;width:140px"><input type="range" aria-label="Concise range name"></label></main><button id="foreign" aria-label="Foreign">Foreign</button>';
  const style=document.createElement('style');style.textContent=${JSON.stringify('.tooltip{padding:8px;font:16px sans-serif;max-width:300px;transform:translateX(-50%);background:#222;color:white}.tooltip-arrow{position:absolute}'+css)};document.head.append(style);
  window.start=()=>{window.release=hints.installKplexLongPressTooltips(document)};
  window.fire=(id,type,related=null,extra={})=>document.querySelector(id).dispatchEvent(new PointerEvent(type,{bubbles:true,pointerType:'mouse',pointerId:1,isPrimary:true,relatedTarget:related?document.querySelector(related):null,...extra}));
  window.pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  window.read=()=>{const el=document.querySelector('.kplex-control-tooltip');if(!el)return null;const r=el.getBoundingClientRect();return{text:el.firstChild.textContent,top:r.top,bottom:r.bottom,left:r.left,right:r.right,above:el.classList.contains('mod-top'),pointer:getComputedStyle(el).pointerEvents}};start();
 })()`);
}

test('every hover waits even after a warm hint; top fits below and bottom flips above without overlap',/** Check elapsed boundaries and actual theme-transformed rectangles. */async()=>{
 const host=await chromiumHarness(result.outputFiles[0].text);
 try{await fixture(host);
  const observations=await host.evaluate(`(async()=>{fire('#top','pointerover');await pause(250);const early=read();await pause(470);const below=read(),top=document.querySelector('#top').getBoundingClientRect();fire('#top','pointerout','#bottom');fire('#bottom','pointerover');const immediate=read();await pause(300);const warmEarly=read();await pause(420);const above=read(),bottom=document.querySelector('#bottom').getBoundingClientRect();return{early,below,topBottom:top.bottom,immediate,warmEarly,above,bottomTop:bottom.top,width:innerWidth}})()`);
  assert.equal(observations.early,null);assert.equal(observations.immediate,null);assert.equal(observations.warmEarly,null);
  assert(observations.below.top>=observations.topBottom+8);assert.equal(observations.below.above,false);
  assert(observations.above.bottom<=observations.bottomTop-8);assert.equal(observations.above.above,true);
  assert(observations.above.right<=observations.width-8);assert.equal(observations.above.pointer,'none');
 }finally{await host.cleanup()}
});

test('gate modifier withholds hints, accepts a stationary Alt/Option press, and hides on release or live preference change',async()=>{
 const host=await chromiumHarness(result.outputFiles[0].text);
 try{await fixture(host);
  const data=await host.evaluate(`(async()=>{
   const gate=document.querySelector('#top');gate.dataset.kplexControlTooltip='';gate.dataset.kplexTooltipRequiresAlt='true';
   fire('#top','pointerover');await pause(720);const ordinary=read();
   document.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,key:'Alt',altKey:true}));await pause(250);const early=read();await pause(470);const held=read();
   document.dispatchEvent(new KeyboardEvent('keyup',{bubbles:true,key:'Alt',altKey:false}));const released=read();
   delete gate.dataset.kplexTooltipRequiresAlt;await pause(720);const optedOut=read();
   gate.dataset.kplexTooltipRequiresAlt='true';await pause(40);const optedIn=read();
   document.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,key:'Alt',altKey:true}));await pause(720);const renewed=read();window.dispatchEvent(new Event('blur'));const blurred=read();
   const accessible=gate.getAttribute('aria-label'),nativeSuppressed=getComputedStyle(gate).getPropertyValue('--no-tooltip').trim();window.release();
   document.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,key:'Alt',altKey:true}));await pause(720);return{ordinary,early,held,released,optedOut,optedIn,renewed,blurred,accessible,nativeSuppressed,retired:read()};
  })()`);
  assert.equal(data.ordinary,null);assert.equal(data.early,null);assert.equal(data.held.text,'Top control');assert.equal(data.released,null);assert.equal(data.optedOut.text,'Top control');assert.equal(data.optedIn,null);assert.equal(data.renewed.text,'Top control');assert.equal(data.blurred,null);assert.equal(data.accessible,'Top control');assert.equal(data.nativeSuppressed,'true');assert.equal(data.retired,null);
 }finally{await host.cleanup()}
});

test('range wrapper supplies measured help; quick crossing, clicking, scrolling and removal cancel work',/** Input labels remain accessible while the longer wrapper hint owns hover. */async()=>{
 const host=await chromiumHarness(result.outputFiles[0].text);
 try{await fixture(host);
  const data=await host.evaluate(`(async()=>{fire('#rail input','pointerover');await pause(720);const help=read(),r=document.querySelector('#rail').getBoundingClientRect();fire('#rail input','pointerout','#top');fire('#top','pointerover');await pause(100);fire('#top','pointerdown');await pause(650);const clicked=read();fire('#top','pointerover');await pause(100);document.dispatchEvent(new Event('scroll'));await pause(650);const scrolled=read();fire('#top','pointerover');document.querySelector('#top').remove();await pause(720);return{help,railTop:r.top,clicked,scrolled,removed:read()}})()`);
  assert.match(data.help.text,/long explanatory/);assert(data.help.bottom<=data.railTop-8);assert.equal(data.clicked,null);assert.equal(data.scrolled,null);assert.equal(data.removed,null);
 }finally{await host.cleanup()}
});

test('hover is scoped; leases are independent and final release retires visible and pending hints',/** The owner must neither suppress foreign tooltips nor leak late timers after unload. */async()=>{
 const host=await chromiumHarness(result.outputFiles[0].text);
 try{await fixture(host);
  const data=await host.evaluate(`(async()=>{fire('#foreign','pointerover');await pause(720);const foreign=read(),nativeSuppression=getComputedStyle(document.querySelector('#foreign')).getPropertyValue('--no-tooltip');const second=sourceModules.installKplexLongPressTooltips(document);release();release();fire('#top','pointerover');await pause(720);const leased=read();second();const removed=read();fire('#bottom','pointerover');await pause(720);const retired=read();start();fire('#top','pointerover');release();await pause(720);return{foreign,nativeSuppression,leased,removed,retired,late:read()}})()`);
  assert.equal(data.foreign,null);assert.notEqual(data.nativeSuppression.trim(),'true');assert.equal(data.leased.text,'Top control');assert.equal(data.removed,null);assert.equal(data.retired,null);assert.equal(data.late,null);
 }finally{await host.cleanup()}
});

test('touch long press consumes only its synthesized click; drag and mouse holds preserve normal actions',/** Preserve touch ownership while avoiding press hints during ordinary mouse use. */async()=>{
 const host=await chromiumHarness(result.outputFiles[0].text);
 try{await fixture(host);
  const data=await host.evaluate(`(async()=>{let clicks=0;document.querySelector('#bottom').addEventListener('click',()=>clicks++);const touch={pointerType:'touch',clientX:10,clientY:10};fire('#bottom','pointerdown',null,touch);await pause(510);const long=read();fire('#bottom','pointerup',null,touch);document.querySelector('#bottom').click();const suppressed=clicks;document.querySelector('#bottom').click();const normal=clicks;fire('#bottom','pointerdown',null,{...touch,pointerId:2});fire('#bottom','pointermove',null,{...touch,pointerId:2,clientX:40});await pause(510);fire('#bottom','pointerup',null,{...touch,pointerId:2});document.querySelector('#bottom').click();const drag=clicks;release();start();fire('#bottom','pointerdown');await pause(720);const mouse=read();fire('#bottom','pointerup');document.querySelector('#bottom').click();return{long,suppressed,normal,drag,mouse,mouseClick:clicks}})()`);
  assert.equal(data.long.text,'Bottom control');assert.equal(data.suppressed,0);assert.equal(data.normal,1);assert.equal(data.drag,2);assert.equal(data.mouse,null);assert.equal(data.mouseClick,3);
 }finally{await host.cleanup()}
});

test('a marked canvas boundary flips bottom controls above even when the window has room below',/** The history/adjacent pane space is outside the canvas control hint budget. */async()=>{
 const host=await chromiumHarness(result.outputFiles[0].text);
 try{await fixture(host);
  const data=await host.evaluate(`(async()=>{const pane=document.createElement('section');pane.setAttribute('data-kplex-tooltip-boundary','');pane.style.cssText='position:fixed;top:150px;left:20px;width:220px;height:100px';document.querySelector('main').append(pane);const control=document.querySelector('#bottom');control.style.position='absolute';pane.append(control);fire('#bottom','pointerover');await pause(720);const r=control.getBoundingClientRect(),b=pane.getBoundingClientRect();return{hint:read(),controlTop:r.top,boundaryTop:b.top,boundaryBottom:b.bottom,viewport:innerHeight}})()`);
  assert(data.viewport-data.boundaryBottom>50);assert.equal(data.hint.above,true);assert(data.hint.bottom<=data.controlTop-8);assert(data.hint.top>=data.boundaryTop+8);
 }finally{await host.cleanup()}
});

test('dedicated callouts replace generic hover/touch hints and retain the long-press click guard', async()=>{
 const host=await chromiumHarness(result.outputFiles[0].text);
 try{await fixture(host);
  const data=await host.evaluate(`(async()=>{const button=document.querySelector('#top');button.dataset.kplexTooltip='callout';let opened=0,clicks=0;button.addEventListener('kplex-control-long-press',()=>opened++);button.addEventListener('click',()=>clicks++);fire('#top','pointerover');await pause(720);const hover=read();button.removeAttribute('aria-label');const label=document.createElement('span');label.id='status-name';label.textContent='Current index status';document.querySelector('main').append(label);button.setAttribute('aria-labelledby',label.id);const touch={pointerType:'touch',clientX:50,clientY:20};fire('#top','pointerdown',null,touch);await pause(510);const long=read(),longOpened=opened;fire('#top','pointerup',null,touch);button.click();const consumed=clicks;button.click();const nextTap=clicks;fire('#top','pointerdown',null,{...touch,pointerId:2});fire('#top','pointermove',null,{...touch,pointerId:2,clientX:80});await pause(510);fire('#top','pointerup',null,{...touch,pointerId:2});return{hover,long,longOpened,opened,consumed,nextTap,accessibleName:document.getElementById(button.getAttribute('aria-labelledby')).textContent}})()`);
  assert.equal(data.hover,null);assert.equal(data.long,null);assert.equal(data.longOpened,1);assert.equal(data.opened,1);
  assert.equal(data.consumed,0);assert.equal(data.nextTap,1);assert.equal(data.accessibleName,'Current index status');
 }finally{await host.cleanup()}
});
