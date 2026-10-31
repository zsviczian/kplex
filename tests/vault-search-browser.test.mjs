/** Actual global SearchBox and shared fuzzy control in Chromium. Ranking has independent 100k
 * production coverage; this lane checks bounded DOM, inherited theme CSS and keyboard/focus lifetime. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import {chromiumHarness} from './support/browserTypeScript.mjs';
const built=await build({stdin:{resolveDir:process.cwd(),contents:`
 export {createElement} from 'react';export {createRoot} from 'react-dom/client';export {flushSync} from 'react-dom';
 export {SearchBox} from './src/ui/features/SearchBox';
`},bundle:true,write:false,platform:'browser',format:'iife',globalName:'sourceModules'});

/** No host globals or files: the caller supplies ranked results and opaque activation identities. */
test('vault search focus renders only 24 quiet theme-native rows and retains keyboard/outside behavior',async()=>{
 const host=await chromiumHarness(built.outputFiles[0].text);
 try{
  const result=await host.evaluate(`(async()=>{
   const M=sourceModules,check=(value,message)=>{if(!value)throw Error(message)},wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
   const style=document.createElement('style');style.textContent=':root{--text-normal:#222;--text-muted:#555;--background-secondary:#fafafa;--background-primary:#fff;--background-modifier-hover:#eee;--background-modifier-border:#bbb;--background-modifier-border-faint:#ddd;--interactive-normal:#dcc69c;--interactive-accent:#e80}'+${JSON.stringify(readFileSync('styles.css','utf8'))};document.head.append(style);
   const app=document.createElement('div');app.className='kplex-app kplex-view-host';app.style.cssText='width:800px;height:700px;position:relative';document.body.append(app);
   const topbar=document.createElement('div');topbar.className='kplex-topbar';app.append(topbar);
   let searches=0;const chosen=[],graph={search(query,limit){searches++;return Array.from({length:limit},(_,n)=>({node:{id:'opaque:'+n,kind:'document'},label:'Note '+n,detail:'Folder/Note '+n+'.md'}))}};
   const root=M.createRoot(topbar);const render=focusRequest=>M.flushSync(()=>root.render(M.createElement(M.SearchBox,{graph,revision:0,focusRequest,placeholder:'Search',ariaLabel:'Search',onActivate:id=>chosen.push(id),portalSelector:'.kplex-app',appTopbarSelector:'.kplex-topbar'})));
   render(0);await wait(20);check(searches===0,'Hidden search called provider');render(1);await wait(40);
   const input=topbar.querySelector('input'),rows=()=>[...app.querySelectorAll('.kplex-search-result')];
   check(input===document.activeElement&&rows().length===24,'Focus request did not open a bounded list');
   const normal=getComputedStyle(rows()[1]),selected=getComputedStyle(rows()[0]);
   check(normal.backgroundColor==='rgba(0, 0, 0, 0)'&&normal.boxShadow==='none'&&normal.borderRightWidth==='0px','Toolbar/theme button chrome leaked into result rows');
   check(normal.borderTopWidth==='1px'&&normal.borderTopColor==='rgb(221, 221, 221)','Quiet separator missing');check(selected.backgroundColor==='rgb(238, 238, 238)','Selection not visible');
   const key=value=>M.flushSync(()=>input.dispatchEvent(new KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true})));
   key('ArrowDown');check(rows()[1].classList.contains('is-selected'),'Down did not select next row');key('ArrowUp');key('ArrowDown');key('Enter');await wait(20);
   check(chosen.join()==='opaque:1'&&rows().length===0,'Enter did not activate opaque selection and close');
   render(2);await wait(20);key('Escape');check(rows().length===0,'Escape did not dismiss');
   render(3);await wait(20);M.flushSync(()=>app.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})));await wait(20);check(rows().length===0,'Outside did not close');
   render(4);await wait(20);check(rows().length===24,'Repeated focus did not reopen');M.flushSync(()=>root.unmount());check(!app.querySelector('.kplex-search-results'),'Retired portal retained rows');
   app.remove();style.remove();return{maximumRows:24,searches,chosen};
  })()`);
  assert.equal(result.maximumRows,24);assert.deepEqual(result.chosen,['opaque:1']);
 }finally{await host.cleanup()}
});
