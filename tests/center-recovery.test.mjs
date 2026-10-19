/** Render-to-effect graph publication and bounded center recovery; actual React/DOM, no note payloads. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import {build} from 'esbuild';
import {chromiumHarness} from './support/browserTypeScript.mjs';
const source=ts.createSourceFile('src/ui/App.tsx',readFileSync('src/ui/App.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let publicationEffect;
function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(source)==='useEffect'&&node.arguments[0]?.getFullText(source).includes('Publications settle a pending native identity'))publicationEffect=node.arguments[0].getText(source);ts.forEachChild(node,visit)}
visit(source);assert(publicationEffect,'Actual App publication owner exists');
const plexSource=ts.createSourceFile('src/ui/PlexGraph.tsx',readFileSync('src/ui/PlexGraph.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let recoveryEffect;
/** Extract the production view lifetime rather than recreating its attempted/completed flags. */
function findRecovery(node){if(ts.isCallExpression(node)&&node.expression.getText(plexSource)==='useEffect'&&node.arguments[0]?.getFullText(plexSource).includes('Check the initial stationary center'))recoveryEffect=node.arguments[0].getText(plexSource);ts.forEachChild(node,findRecovery)}
findRecovery(plexSource);assert(recoveryEffect,'Actual PlexGraph recovery owner exists');
const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
export {startCenterWatchdog} from './src/ui/components/centerWatchdog';export {sanitizeCenterRecoveryDiagnostic} from './src/core/contracts/centerRecovery';
import {startCenterWatchdog} from './src/ui/components/centerWatchdog';
import React,{useState,useEffect,useLayoutEffect,useRef} from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
/** Exercise the actual mounted view effect across a pending check and native hide/reveal. */
export async function recoveryAfterReveal(mode='pending'){
 const element=document.body.appendChild(document.createElement('div')),root=createRoot(element);
 const timers=new Map(),listeners=new Set(),visibility=new Set();let serial=0,visible=true,local=false,calls=[];
 const set=window.setTimeout,clear=window.clearTimeout;
 window.setTimeout=(run,delay)=>{if(delay!==3000)return set(run,delay);const id=++serial;timers.set(id,run);return id};
 window.clearTimeout=id=>{if(!timers.delete(id))clear(id)};
 const plugin={isKplexLeafVisible:()=>visible,subscribeKplexVisibility:fn=>{visibility.add(fn);return()=>visibility.delete(fn)}};
 let finish;
 const index={hasLocalBaseline:()=>local,isCenterRecoverySourceReady:()=>false,subscribePresentation:fn=>{listeners.add(fn);return()=>listeners.delete(fn)},recheckVisibleCenter:async(path,counts,trigger,current)=>{calls.push(trigger);if(mode==='retired-complete'&&calls.length===1)return new Promise(resolve=>finish=resolve);return mode==='healthy'}};
 const hostLeaf={},activePath='Center.md',centerRelationCounts=()=>[0,0,0,0,0];
 /** Mount the extracted production effect with actual React refs and cleanup. */
 function Surface(){const viewport=useRef(element),initialCenterChecked=useRef(false),recoveryCenter=useRef(activePath),recoveryNeighborhood=useRef(null);useEffect(${recoveryEffect},[]);return null}
 /** Settle actual effect/promise callbacks without borrowing the intercepted recovery timers. */
 const settle=()=>new Promise(resolve=>set(resolve,25));
 /** Deliver only a timer scheduled by the production watchdog. */
 const fire=async()=>{const entry=timers.entries().next().value;if(!entry)return false;const[id,run]=entry;timers.delete(id);run();await settle();return true};
 try{
  flushSync(()=>root.render(<Surface/>));await settle();await fire();
  visible=false;for(const fn of visibility)fn();finish?.(true);await settle();local=true;for(const fn of listeners)fn();
  visible=true;for(const fn of visibility)fn();await fire();
  return {calls:[...calls],timers:timers.size,listeners:listeners.size};
 }finally{flushSync(()=>root.unmount());element.remove();window.setTimeout=set;window.clearTimeout=clear;if(timers.size||listeners.size||visibility.size)throw Error('View recovery leaked resources')}
}
export async function reproduce(channel){
 const events={semantic:new Set(),presentation:new Set()},file={path:'Center.md'},page={path:'Center.md',file};let children=2,sourceCalls=0,renders=0;
 const plugin={index:{subscribe:fn=>{events.semantic.add(fn);return()=>events.semantic.delete(fn)},get:()=>page,insertCreatedFile:()=>{throw Error('Unexpected admission')}},app:{vault:{getFileByPath:()=>file}},isKplexLeafVisible:()=>true,isManagedCreatedFile:()=>false};
 function Publisher(){useLayoutEffect(()=>{children=7;for(const fn of events[channel])fn()},[]);return null}
 function Surface(){const [revision,forceRender]=useState(0);renders++;const activePathRef={current:'Center.md'},activeFileRef={current:file},activePageRef={current:page};const hostLeaf={},activatePendingDocumentFollow=()=>{},setActivePath=()=>{throw Error('Unexpected navigation')};useEffect(${publicationEffect},[]);return <><Publisher/><div data-revision={revision}>{children}</div></>}
 const element=document.body.appendChild(document.createElement('div')),root=createRoot(element);flushSync(()=>root.render(<Surface/>));await new Promise(resolve=>setTimeout(resolve,40));const count=Number(element.querySelector('div').textContent);flushSync(()=>root.unmount());element.remove();return {count,renders,sourceCalls,listeners:events.semantic.size+events.presentation.size};
}`},bundle:true,write:false,format:'iife',globalName:'sourceModules',platform:'browser'});
for(const channel of ['semantic','presentation'])test('App catches '+channel+' publication between initial render and subscription',async()=>{const browser=await chromiumHarness(bundle.outputFiles[0].text);try{const result=await browser.evaluate(`sourceModules.reproduce(${JSON.stringify(channel)})`);assert.equal(result.count,7,'Stationary center must catch child publication without navigation or watchdog');assert.equal(result.sourceCalls,0);assert.equal(result.listeners,0)}finally{await browser.cleanup()}});

for(const mode of ['pending','retired-complete','healthy'])test('actual PlexGraph recovery owns '+mode+' checks across hide and reveal',async()=>{
 const browser=await chromiumHarness(bundle.outputFiles[0].text);try{
  const result=await browser.evaluate(`sourceModules.recoveryAfterReveal(${JSON.stringify(mode)})`);
  assert.deepEqual(result.calls,mode==='healthy'?['initial']:['initial','initial'],'Only a completed live attempt may retire recovery across native visibility changes');
  assert.equal(result.timers,0);assert.equal(result.listeners,mode==='healthy'?0:1,'Only an incomplete visible center retains its readiness subscription');
 }finally{await browser.cleanup()}
});


test('startup watchdog checks once, waits for real readiness and stops after one follow-up',async()=>{
 const browser=await chromiumHarness(bundle.outputFiles[0].text);try{assert.equal(await browser.evaluate(`(async()=>{
  const timers=new Map(),listeners=new Set();let id=0,ready=false,calls=[],complete=false;
  const stop=sourceModules.startCenterWatchdog({schedule:(run,delay)=>{if(delay!==3000)throw Error('Delay changed');const key=++id;timers.set(key,run);return()=>timers.delete(key)},sourceReady:()=>ready,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn)},check:async(trigger,current)=>{if(!current())throw Error('Retired check');calls.push(trigger);return complete}});
  const fire=async()=>{const [key,run]=timers.entries().next().value;timers.delete(key);run();await Promise.resolve();await Promise.resolve()};
  for(let i=0;i<20;i++)for(const fn of listeners)fn();if(timers.size!==1)throw Error('Progress resets/duplicates timer');
  await fire();if(timers.size||calls.join()!=='initial')throw Error('Polling after pending check');
  ready=true;for(let i=0;i<20;i++)for(const fn of listeners)fn();if(timers.size!==1)throw Error('Readiness must schedule exactly one follow-up');
  await fire();for(const fn of listeners)fn();if(timers.size||listeners.size||calls.join()!=='initial,source-ready')throw Error('Unbounded retry or leaked observer');stop();return true;
 })()`),true)}finally{await browser.cleanup()}
});

test('watchdog cancellation fences held completion; healthy and terminal-ready checks stop immediately',async()=>{
 const browser=await chromiumHarness(bundle.outputFiles[0].text);try{assert.equal(await browser.evaluate(`(async()=>{
  for(const mode of ['cancel-before','cancel-during','healthy','terminal']){
   let timer=null,listener=null,calls=0,finish,current;
   const stop=sourceModules.startCenterWatchdog({schedule:run=>{timer=run;return()=>timer=null},sourceReady:()=>mode==='terminal',subscribe:fn=>{listener=fn;return()=>listener=null},check:async(trigger,guard)=>{calls++;current=guard;return mode==='cancel-during'?new Promise(resolve=>finish=resolve):mode==='healthy'}});
   if(mode==='cancel-before'){stop();if(timer||listener||calls)throw Error('Cancelled startup did work');continue}
   const run=timer;timer=null;run();await Promise.resolve();if(mode==='cancel-during'){stop();if(current())throw Error('Stale completion retained ownership');finish(false)}
   await Promise.resolve();await Promise.resolve();if(timer||listener||calls!==1)throw Error('Watchdog retained work after '+mode);stop();
  }return true;
 })()`),true)}finally{await browser.cleanup()}
});

test('late local baseline admits one repair before global source readiness, without polling',async()=>{
 const browser=await chromiumHarness(bundle.outputFiles[0].text);try{assert.equal(await browser.evaluate(`(async()=>{
  const timers=new Map(),listeners=new Set();let serial=0,local=false,source=false,calls=[];
  const stop=sourceModules.startCenterWatchdog({schedule:run=>{const id=++serial;timers.set(id,run);return()=>timers.delete(id)},localReady:()=>local,sourceReady:()=>source,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn)},check:async trigger=>{calls.push(trigger);return source}});
  const fire=async()=>{const [id,run]=timers.entries().next().value;timers.delete(id);run();await Promise.resolve();await Promise.resolve()};
  await fire();if(timers.size||calls.join()!=='initial')throw Error('Initial pending check must not poll');
  local=true;for(let i=0;i<20;i++)for(const fn of listeners)fn();if(timers.size!==1)throw Error('Local baseline did not wake the stationary center independently of global sources');
  await fire();if(calls.join()!=='initial,local-ready'||timers.size)throw Error('Local milestone repeated work');
  source=true;for(const fn of listeners)fn();await fire();if(calls.join()!=='initial,local-ready,source-ready'||timers.size||listeners.size)throw Error('Finite source follow-up did not retire');stop();return true;
 })()`),true)}finally{await browser.cleanup()}
});

test('center diagnostic accepts only bounded aggregate vectors and refuses getters/private fields',async()=>{
 const browser=await chromiumHarness(bundle.outputFiles[0].text);try{assert.equal(await browser.evaluate(`(()=>{
  const value={trigger:'initial',outcome:'pending',sourceReadyBefore:false,sourceReadyAfter:false,activeBefore:true,coverageBefore:'preview',coverageAfter:'local',presented:[0,2,0,0,0],before:[0,2,0,0,0],after:[0,7,0,0,0],path:'private.md',content:'private'};
  const safe=sourceModules.sanitizeCenterRecoveryDiagnostic(value);if(!safe||safe.after[1]!==7||'path'in safe||'content'in safe)throw Error('Bad projection');
  for(const bad of [{...value,after:[0,-1,0,0,0]},{...value,before:[0,NaN,0,0,0]},{...value,presented:Array(6).fill(0)},{...value,coverageAfter:'private'}])if(sourceModules.sanitizeCenterRecoveryDiagnostic(bad))throw Error('Malformed receipt admitted');
  Object.defineProperty(value,'after',{get(){throw Error('Accessor invoked')}});if(sourceModules.sanitizeCenterRecoveryDiagnostic(value))throw Error('Getter admitted');return true;
 })()`),true)}finally{await browser.cleanup()}
});
