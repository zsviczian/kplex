/** Actual browser Footprints disclosure: bounded newest-first DOM, repeated visits and owner-document dismissal. */
import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {build} from "esbuild";
import {chromiumHarness} from "./support/browserTypeScript.mjs";
const built=await build({stdin:{resolveDir:process.cwd(),loader:"tsx",contents:`
import React from 'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';
import{PlexFootprints}from'./src/application/PlexFootprints';import{PlexFootprintsPanel}from'./src/ui/PlexFootprintsPanel';import{createTranslator}from'./src/lang';
import{nodeMarkdownLink}from'./src/ui/nodeMarkdownLink';
export {PlexFootprints};
window.trail=new PlexFootprints();window.resolves=0;window.navigation=[];window.formats=0;window.clipboardWrites=[];
window.clipboardMode='resolved';Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText(text){clipboardWrites.push(text);if(clipboardMode==='throws')throw Error('private clipboard failure');if(clipboardMode==='rejected')return Promise.reject(Error('private clipboard failure'));if(clipboardMode==='pending')return new Promise(resolve=>window.finishCopy=resolve);return Promise.resolve();}}});
let root;
window.visit=(identity)=>trail.accept({identity,path:identity,kind:'file'});
window.mount=()=>{root??=createRoot(document.body.appendChild(document.createElement('div')));flushSync(()=>root.render(<PlexFootprintsPanel trail={trail} translate={createTranslator('en')}
 readRow={visit=>{window.resolves++;return{label:visit.node.identity,icon:'file-text',available:visit.node.identity!=='Missing.md'}}}
 formatLink={entry=>{window.formats++;return nodeMarkdownLink(entry.node)}} navigate={entry=>{navigation.push(entry.id);trail.accept(entry.node)}}/>));};
`},bundle:true,write:false,format:"iife",globalName:"sourceModules",platform:"browser",plugins:[{name:"host-icons",setup(builder){builder.onResolve({filter:/^obsidian$/},()=>({path:"obsidian",namespace:"native"}));builder.onLoad({filter:/.*/,namespace:"native"},()=>({contents:`export function getIcon(name){const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('data-icon',name);return icon}`,loader:"js"}));}}]});

/** Install repository CSS and keep the control at the actual upper-right disclosure position. */
async function browser(){const host=await chromiumHarness(built.outputFiles[0].text);try{await host.evaluate(`(()=>{window.mount();const css=document.createElement('style');css.textContent=${JSON.stringify(readFileSync("styles.css","utf8"))};document.head.append(css);document.querySelector('.kplex-footprints-trigger').parentElement.style.cssText='position:fixed;right:8px;top:8px';})()`);return host;}catch(error){await host.cleanup();throw error;}}
/** Wait one browser task for React store subscriptions and native layout to settle. */
async function settle(host){await host.evaluate("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");}

test("Footprints repeats, row activation, Start here, Escape, outside dismissal and focus stay in one owner",async()=>{
 const host=await browser();try{
  await host.evaluate(`['A.md','B.md','A.md','C.md'].forEach(visit);document.querySelector('.kplex-footprints-trigger').click()`);await settle(host);
  assert.deepEqual(await host.evaluate("Array.from(document.querySelectorAll('.kplex-footprints-row > span:not(.kplex-icon)')).map(el=>el.textContent)"),["C.md","A.md","B.md","A.md"]);
  assert.deepEqual(await host.evaluate("Array.from(document.querySelectorAll('.kplex-footprints-row')).map(el=>el.parentElement.getAttribute('aria-posinset'))"),["1","2","3","4"]);
  assert.equal(await host.evaluate("document.activeElement.dataset.footprintOrdinal"),"3");
  assert.equal(await host.evaluate("document.querySelector('.kplex-footprints-panel').parentElement===document.body"),true);
  await host.evaluate("document.querySelector('[data-footprint-ordinal=\"1\"]').click()");await settle(host);assert.equal(await host.evaluate("trail.length"),5);
  await host.evaluate("document.querySelector('[data-footprint-ordinal=\"4\"]').click()");await settle(host);assert.equal(await host.evaluate("trail.length"),5);
  await host.evaluate("document.querySelector('[aria-label=\"Start here\"]').click()");await settle(host);assert.equal(await host.evaluate("trail.length"),1);
  assert.equal(await host.evaluate("trail.at(0).node.identity"),"B.md");
  await host.command("Input.dispatchKeyEvent",{type:"keyDown",key:"Escape",code:"Escape"});await settle(host);
  assert.equal(await host.evaluate("Boolean(document.querySelector('.kplex-footprints-panel'))"),false);
  assert.equal(await host.evaluate("document.activeElement.classList.contains('kplex-footprints-trigger')"),true);
  await host.evaluate("document.querySelector('.kplex-footprints-trigger').click()");await settle(host);
  await host.command("Input.dispatchMouseEvent",{type:"mousePressed",x:10,y:440,button:"left",clickCount:1});await host.command("Input.dispatchMouseEvent",{type:"mouseReleased",x:10,y:440,button:"left",clickCount:1});await settle(host);
  assert.equal(await host.evaluate("Boolean(document.querySelector('.kplex-footprints-panel'))"),false);
  assert.equal(await host.evaluate("document.querySelector('[title]')===null"),true);
  await host.evaluate("document.querySelector('.kplex-footprints-trigger').click()");await settle(host);
  await host.evaluate("document.querySelector('.kplex-footprints-trigger').parentElement.style.display='none'");await settle(host);
  assert.equal(await host.evaluate("Boolean(document.querySelector('.kplex-footprints-panel'))"),false,"A native hidden tab must not leave its body portal visible");
  assert.equal(await host.evaluate("trail.length"),1,"Hiding the disclosure retains this native session's trail");
 }finally{await host.cleanup();}
});

test("copy uses all visits in visible order with native link kinds, repetitions and truthful clipboard feedback",async()=>{
 const host=await browser();try{
  await host.evaluate(`const refs=[{identity:'opaque-note',path:'First.md',kind:'file'},{identity:'opaque-tag',path:'tag:topic/subtag',kind:'tag'},{identity:'opaque-folder',path:'folder:Projects/Notes',kind:'folder'},{identity:'opaque-attachment',path:'Assets/file.pdf',kind:'file'},{identity:'opaque-url',path:'https://example.com/a_(b)?x=[1]',kind:'url'},{identity:'opaque-ghost',path:'Planned note',kind:'ghost'},{identity:'opaque-note',path:'First.md',kind:'file'}];refs.forEach(ref=>trail.accept(ref));document.querySelector('.kplex-footprints-trigger').click()`);await settle(host);
  assert.equal(await host.evaluate("formats"),0,"Disclosure never formats the whole trail");
  await host.evaluate(`document.querySelector('[aria-label="Copy as Markdown"]').click();window.wroteInHandler=clipboardWrites.length===1`);await settle(host);
  assert.equal(await host.evaluate("wroteInHandler"),true);
  assert.deepEqual(await host.evaluate("clipboardWrites"),["- [[First.md]]\n- [[Planned note]]\n- [https://example.com/a_(b)?x=\\[1\\]](<https://example.com/a_(b)?x=[1]>)\n- [[Assets/file.pdf]]\n- [[Projects/Notes]]\n- #topic/subtag\n- [[First.md]]"]);
  assert.equal(await host.evaluate("document.querySelector('[role=status]').textContent"),"Copied to clipboard.");
  await host.evaluate(`trail.startHere();for(let i=0;i<100;i++)visit(i%2?'A.md':'B.md');document.querySelector('[aria-label="Copy as Markdown"]').click()`);await settle(host);
  assert((await host.evaluate("document.querySelectorAll('.kplex-footprints-row').length"))<=40);
  assert.equal(await host.evaluate("clipboardWrites[1].split('\\n').length"),101,"Copy includes visits beyond the rendered window");
  assert.equal(await host.evaluate("trail.length"),101,"Copy leaves the trail untouched");
 }finally{await host.cleanup();}
});

test("clipboard denial retries, pending duplicate clicks and stale completion after dismissal remain safe",async()=>{
 const host=await browser();try{
  await host.evaluate(`visit('A.md');document.querySelector('.kplex-footprints-trigger').click();clipboardMode='rejected'`);await settle(host);
  await host.evaluate(`document.querySelector('[aria-label="Copy as Markdown"]').click()`);await settle(host);
  assert.equal(await host.evaluate("document.querySelector('[role=status]').textContent"),"Could not copy. Try again.");
  assert.equal(await host.evaluate("document.querySelector('[aria-label=\"Copy as Markdown\"]').disabled"),false);
  await host.evaluate(`clipboardMode='pending';const button=document.querySelector('[aria-label="Copy as Markdown"]');button.click();button.click()`);await settle(host);
  assert.equal(await host.evaluate("clipboardWrites.length"),2,"Pending attempts cannot submit twice");
  assert.equal(await host.evaluate("document.querySelector('[role=status]').textContent"),"Copying...");
  await host.evaluate(`document.querySelector('.kplex-footprints-trigger').click();finishCopy()`);await settle(host);
  assert.equal(await host.evaluate("Boolean(document.querySelector('.kplex-footprints-panel'))"),false);
  await host.evaluate(`document.querySelector('.kplex-footprints-trigger').click()`);await settle(host);
  assert.equal(await host.evaluate("Boolean(document.querySelector('[role=status]'))"),false,"A retired copy cannot publish into the reopened panel");
  await host.evaluate(`clipboardMode='resolved';document.querySelector('[aria-label="Copy as Markdown"]').click()`);await settle(host);
  assert.equal(await host.evaluate("document.querySelector('[role=status]').textContent"),"Copied to clipboard.");
 }finally{await host.cleanup();}
});

test("newest-first long trails retain older reading/focus anchors and follow visual keyboard order",async()=>{
 const host=await browser();try{
  await host.evaluate("for(let i=0;i<10000;i++)visit(i%2?'B.md':'A.md');document.querySelector('.kplex-footprints-trigger').click()");await settle(host);
  const initial=await host.evaluate("({length:trail.length,rows:document.querySelectorAll('.kplex-footprints-row').length,last:document.querySelector('.kplex-footprints-row:last-of-type')?.textContent,scroll:document.querySelector('.kplex-footprints-list').scrollTop})");
  assert.equal(initial.length,10000);assert(initial.rows<=40);assert.equal(initial.scroll,0);
  assert.equal(await host.evaluate("document.querySelector('.kplex-footprints-row').dataset.footprintOrdinal"),"9999");
  await host.evaluate("const list=document.querySelector('.kplex-footprints-list');list.scrollTop=160000;list.dispatchEvent(new Event('scroll'))");await settle(host);
  const older=await host.evaluate("({ordinal:document.querySelector('.kplex-footprints-row').dataset.footprintOrdinal,scroll:document.querySelector('.kplex-footprints-list').scrollTop})");
  await host.evaluate("document.querySelectorAll('.kplex-footprints-row')[4].focus()");await settle(host);
  const focused=await host.evaluate("document.activeElement.dataset.footprintOrdinal");
  const resolves=await host.evaluate("window.resolves");await host.evaluate("visit('C.md')");await settle(host);
  assert.equal(await host.evaluate("document.querySelector('.kplex-footprints-list').scrollTop"),older.scroll+40);
  assert.equal(await host.evaluate("document.querySelector('.kplex-footprints-row').dataset.footprintOrdinal"),older.ordinal);
  assert.equal(await host.evaluate("document.activeElement.dataset.footprintOrdinal"),focused);
  assert((await host.evaluate("window.resolves"))-resolves<=80,"One append resolves only the visible bounded window");
  await host.command("Input.dispatchKeyEvent",{type:"keyDown",key:"End",code:"End"});await settle(host);
  assert.equal(await host.evaluate("document.activeElement.dataset.footprintOrdinal"),"0");
  await host.command("Input.dispatchKeyEvent",{type:"keyDown",key:"ArrowUp",code:"ArrowUp"});await settle(host);
  assert.equal(await host.evaluate("document.activeElement.dataset.footprintOrdinal"),"1");
  await host.command("Input.dispatchKeyEvent",{type:"keyDown",key:"Home",code:"Home"});await settle(host);
  assert.equal(await host.evaluate("document.activeElement.dataset.footprintOrdinal"),"10000");
  assert.equal(await host.evaluate("document.querySelector('.kplex-footprints-list').scrollTop"),0);
  await host.command("Input.dispatchKeyEvent",{type:"keyDown",key:"ArrowDown",code:"ArrowDown"});await settle(host);
  assert.equal(await host.evaluate("document.activeElement.dataset.footprintOrdinal"),"9999");
  await host.command("Input.dispatchKeyEvent",{type:"keyDown",key:"Home",code:"Home"});await settle(host);
  await host.evaluate("visit('Missing.md')");await settle(host);const length=await host.evaluate("trail.length");
  await host.evaluate("document.querySelector('.kplex-footprints-row[aria-disabled=true]').click()");assert.equal(await host.evaluate("trail.length"),length);
 }finally{await host.cleanup();}
});
