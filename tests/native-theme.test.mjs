/** Real production CSS checks for native chrome, camera raster ownership and inherited overrides. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {chromiumHarness} from './support/browserTypeScript.mjs';
const css=readFileSync('styles.css','utf8');

test('idle graph camera permits scale rerasterization without changing native scroll or section geometry', async () => {
 const host=await chromiumHarness('window.sourceModules={}');
 try {
  await fixture(host);
  const samples=await host.evaluate(`(async()=>{
   const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
   const graph=document.querySelector('.kplex-app');
   graph.innerHTML='<div class="kplex-plex"><div class="kplex-camera"><div class="kplex-thought" style="left:10px;top:20px;width:200px;height:30px">Expanded heading</div><div class="kplex-zone-panel" style="left:10px;top:80px;width:250px;height:120px"><div class="kplex-zone-scroll"><div class="kplex-zone-content" style="height:600px"><div class="kplex-thought" style="left:10px;top:200px;width:200px;height:30px">Scrollable label</div></div></div></div></div></div>';
   const camera=graph.querySelector('.kplex-camera'),scroll=graph.querySelector('.kplex-zone-scroll');
   const section=camera.firstElementChild,node=scroll.querySelector('.kplex-thought'),samples=[];
   for(const scale of [1,1.25,.83,2,1]){
    camera.style.transform='translate(250.3px,100.7px) scale('+scale+')';
    scroll.scrollTop=100;await frame();const before=node.getBoundingClientRect().y;
    scroll.scrollTop=101;await frame();const after=node.getBoundingClientRect().y;
    samples.push({scale,scrollTop:scroll.scrollTop,delta:after-before,width:section.getBoundingClientRect().width,
     willChange:getComputedStyle(camera).willChange,animations:camera.getAnimations({subtree:true}).filter(a=>a.playState==='running').length});
   }
   return samples;
  })()`);
  for(const sample of samples){
   assert.equal(sample.scrollTop,101,'No scroll snapping or offset correction');
   assert(Math.abs(sample.delta+sample.scale)<.03,'Native scroll and camera coordinates remain coherent');
   assert(Math.abs(sample.width-200*sample.scale)<.03,'Unscrolled section geometry retains graph zoom');
   assert.equal(sample.animations,0);
   assert.equal(sample.willChange,'auto','Idle camera must release persistent transform raster hints');
  }
 } finally {await host.cleanup();}
});
/** Mount representative real CSS consumers without a graph, note reads or a second layout engine. */
async function fixture(host){await host.evaluate(`(()=>{
 const style=document.createElement('style');style.textContent=${JSON.stringify(`body.theme-light{--background-primary:#f8f8f8;--background-secondary:#eeeeee;--background-modifier-border:#bbbbbb;--text-normal:#222222;--text-muted:#555555;--interactive-normal:#dddddd;--interactive-hover:#cccccc;--interactive-accent:#5533aa;--shadow-s:0 2px 4px #00000022;--color-green:#228844;--color-red:#bb2233}body.theme-dark{--background-primary:#181818;--background-secondary:#242424;--background-modifier-border:#777777;--text-normal:#eeeeee;--text-muted:#bbbbbb;--interactive-normal:#333333;--interactive-hover:#444444;--interactive-accent:#aa99ff;--shadow-s:0 2px 4px #00000088;--color-green:#44bb66;--color-red:#ee6677}`+css)};document.head.append(style);
 document.body.innerHTML='<div class="kplex-view-host"><div class="kplex-app"><header class="kplex-topbar"><button>Native action</button><input class="kplex-search"></header><div class="kplex-thought" style="background:#123456;color:#abcdef"><span class="kplex-gate"></span><span class="kplex-gate has-connections"></span><span class="kplex-gate-count">3</span></div></div></div><button class="kplex-sidecar-unfold-plex">Detached control</button>';
 window.readNative=()=>{const read=s=>getComputedStyle(document.querySelector(s));return{app:read('.kplex-app').backgroundColor,text:read('.kplex-app').color,toolbar:read('.kplex-topbar').backgroundColor,toolbarImage:read('.kplex-topbar').backgroundImage,button:read('.kplex-topbar button').backgroundColor,buttonText:read('.kplex-topbar button').color,portal:read('.kplex-sidecar-unfold-plex').backgroundColor,portalText:read('.kplex-sidecar-unfold-plex').color,shadow:read('.kplex-thought').boxShadow,node:read('.kplex-thought').backgroundColor,nodeText:read('.kplex-thought').color,gateEmpty:read('.kplex-gate').backgroundColor,gateFilled:read('.kplex-gate.has-connections').backgroundColor,countShadow:read('.kplex-gate-count').textShadow}};
 })()`)}

test('native light/dark surfaces, controls, gate states and shadows update while explicit node colors remain',async()=>{
 const host=await chromiumHarness('window.sourceModules={}');try{await fixture(host);const r=await host.evaluate(`(async()=>{const settled=async()=>{readNative();await Promise.all(document.querySelector('.kplex-thought').getAnimations().map(a=>a.finished));return readNative()};document.body.className='theme-light';const light=await settled();document.body.className='theme-dark';return{light,dark:await settled()}})()`);
 for(const [mode,expected]of [['light',{app:'rgb(248, 248, 248)',toolbar:'rgb(238, 238, 238)',button:'rgb(221, 221, 221)',text:'rgb(34, 34, 34)'}],['dark',{app:'rgb(24, 24, 24)',toolbar:'rgb(36, 36, 36)',button:'rgb(51, 51, 51)',text:'rgb(238, 238, 238)'}]]){
  const value=r[mode];assert.equal(value.app,expected.app);assert.equal(value.toolbar,expected.toolbar);assert.equal(value.toolbarImage,'none');assert.equal(value.button,expected.button);assert.equal(value.buttonText,expected.text);assert.equal(value.portal,expected.button);assert.equal(value.portalText,expected.text);assert.equal(value.node,'rgb(18, 52, 86)');assert.equal(value.nodeText,'rgb(171, 205, 239)');assert.equal(value.gateEmpty,'rgba(0, 0, 0, 0)');assert.notEqual(value.gateFilled,value.gateEmpty);assert.equal(value.countShadow,'none');
 }assert.notEqual(r.light.shadow,r.dark.shadow);
 }finally{await host.cleanup()}
});

test('public body and view-local overrides inherit, reset cleanly, and also reach detached controls',async()=>{
 const host=await chromiumHarness('window.sourceModules={}');try{await fixture(host);const r=await host.evaluate(`(()=>{document.body.className='theme-light';document.body.style.setProperty('--kplex-panel','#123456');document.body.style.setProperty('--kplex-panel-2','#112233');document.body.style.setProperty('--kplex-text','#654321');document.body.style.setProperty('--kplex-control-bg','#abcdef');const body=readNative();const root=document.querySelector('.kplex-app');root.style.setProperty('--kplex-panel','#567890');root.style.setProperty('--kplex-panel-2','#445566');root.style.setProperty('--kplex-text','#102030');const local=readNative();root.style.removeProperty('--kplex-panel');root.style.removeProperty('--kplex-panel-2');root.style.removeProperty('--kplex-text');const reset=readNative();document.body.style.removeProperty('--kplex-panel');document.body.style.removeProperty('--kplex-panel-2');document.body.style.removeProperty('--kplex-text');document.body.style.removeProperty('--kplex-control-bg');return{body,local,reset,native:readNative()}})()`);
 assert.equal(r.body.toolbar,'rgb(17, 34, 51)');assert.equal(r.local.toolbar,'rgb(68, 85, 102)');assert.equal(r.reset.toolbar,r.body.toolbar);assert.equal(r.native.toolbar,'rgb(238, 238, 238)');assert.equal(r.body.app,'rgb(18, 52, 86)');assert.equal(r.body.text,'rgb(101, 67, 33)');assert.equal(r.body.portal,'rgb(171, 205, 239)');assert.equal(r.local.app,'rgb(86, 120, 144)');assert.equal(r.local.text,'rgb(16, 32, 48)');assert.equal(r.reset.app,r.body.app);assert.equal(r.reset.text,r.body.text);assert.equal(r.native.app,'rgb(248, 248, 248)');
 }finally{await host.cleanup()}
});
