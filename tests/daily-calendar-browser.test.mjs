/** Real browser calendar interactions validate local-date selection, keyboard ownership and popup
 * readiness with injected navigation only. Native Obsidian separately owns modal and file effects. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
import {chromiumHarness} from './support/browserTypeScript.mjs';
const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
 import React from 'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';
 import{CalendarDatePicker}from'./src/ui/features/CalendarDatePicker';
 export{CalendarDatePicker};
 let root;window.chosen=[];window.mount=()=>{const host=document.body.appendChild(document.createElement('div'));host.className='modal kplex-modal';host.style.width='330px';const content=host.appendChild(document.createElement('div'));content.className='modal-content kplex-form';root=createRoot(content);render()};
 window.render=(ready=true)=>flushSync(()=>root.render(<CalendarDatePicker initialDate='2024-02-29' today='2024-02-29' locale='de' weekStart={1} dates={new Set(['2024-02-28','2024-02-29'])} ready={ready} translate={key=>key} onChoose={value=>chosen.push(value)}/>));
 window.unmount=()=>flushSync(()=>root.unmount());
`},bundle:true,write:false,platform:'browser',format:'iife',globalName:'sourceModules'});
/** Each case owns a fresh browser and actual calendar CSS. */
async function browser(){const b=await chromiumHarness(bundle.outputFiles[0].text);try{await b.evaluate(`(()=>{mount();const s=document.createElement('style');s.textContent='*,*::before,*::after{box-sizing:border-box}'+${JSON.stringify(readFileSync('styles.css','utf8'))};document.head.append(s)})()`);return b}catch(error){await b.cleanup();throw error}}
/** Trusted key dispatch lets the real browser deliver focus and native button activation. */
async function key(b,key,code,virtual,text){await b.command('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:virtual,...text?{text}:{}});await b.command('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:virtual})}

test('calendar shows existing dates, localized month/weekdays and navigates only on explicit selection',async()=>{
 const b=await browser();try{
  assert.equal(await b.evaluate(`document.querySelectorAll('[data-calendar-date]').length`),42);
  assert((await b.evaluate(`document.querySelector('.kplex-calendar-heading').textContent`)).includes('Februar 2024'));
  assert.equal(await b.evaluate(`document.querySelector('[data-calendar-date]').dataset.calendarDate`),'2024-01-29');
  assert.equal(await b.evaluate(`document.querySelectorAll('.has-note').length`),2);assert.equal(await b.evaluate(`document.querySelectorAll('[aria-current="date"]').length`),1);
  await b.evaluate(`document.querySelector('[aria-label="daily.nextMonth"]').click()`);assert.deepEqual(await b.evaluate('chosen'),[]);
  await b.evaluate(`document.querySelector('[data-calendar-date="2024-03-03"]').click()`);assert.deepEqual(await b.evaluate('chosen'),['2024-03-03']);
  assert.equal(await b.evaluate(`document.querySelector('.kplex-calendar-picker').scrollWidth<=document.querySelector('.kplex-calendar-picker').clientWidth`),true);
 }finally{await b.cleanup()}
});

test('keyboard crosses leap-day month boundaries without selecting until Enter',async()=>{
 const b=await browser();try{
  await b.evaluate(`document.querySelector('[data-calendar-date="2024-02-29"]').focus()`);await key(b,'ArrowRight','ArrowRight',39);
  assert.equal(await b.evaluate('document.activeElement.dataset.calendarDate'),'2024-03-01');assert.deepEqual(await b.evaluate('chosen'),[]);
  await key(b,'Home','Home',36);assert.equal(await b.evaluate('document.activeElement.dataset.calendarDate'),'2024-02-26');
  await key(b,'End','End',35);assert.equal(await b.evaluate('document.activeElement.dataset.calendarDate'),'2024-03-03');
  await key(b,'Enter','Enter',13,'\r');assert.deepEqual(await b.evaluate('chosen'),['2024-03-03']);
 }finally{await b.cleanup()}
});

test('loading cannot navigate, exact-date input submits and unmount leaves no popup controls',async()=>{
 const b=await browser();try{
  await b.evaluate('render(false)');assert.equal(await b.evaluate(`document.querySelectorAll('[data-calendar-date]:enabled').length`),0);
  await b.evaluate(`document.querySelector('[data-calendar-date]').click()`);assert.deepEqual(await b.evaluate('chosen'),[]);
  await b.evaluate('render(true)');await b.evaluate(`(()=>{const input=document.querySelector('input[type=date]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'2025-12-31');input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));input.focus()})()`);
  await key(b,'Enter','Enter',13,'\r');assert.deepEqual(await b.evaluate('chosen'),['2025-12-31']);await b.evaluate('unmount()');assert.equal(await b.evaluate(`document.querySelectorAll('[data-calendar-date]').length`),0);
 }finally{await b.cleanup()}
});
