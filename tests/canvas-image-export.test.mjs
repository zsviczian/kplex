/** Raster allocation, immutable clipboard payload, cancellation and native handoff boundaries.
 * Browser pixels and native Obsidian UI are exercised in separate real-rendering lanes. */
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
const directory=mkdtempSync(join(tmpdir(),'kplex-image-unit-'));
process.on('exit',/** All emitted modules belong to this single suite. */()=>rmSync(directory,{recursive:true,force:true}));
await build({stdin:{resolveDir:process.cwd(),contents:`export * from './src/core/plex/export/imageDimensions';export * from './src/core/plex/export/artifactFilename';export * from './src/application/ClipboardSession';export * from './src/ui/export/imageExportLifetime';export * from './src/adapters/obsidian/pngExport';export {Platform} from 'obsidian';`},outfile:join(directory,'suite.cjs'),bundle:true,platform:'node',format:'cjs',plugins:[{name:'platform-only',setup(builder){builder.onResolve({filter:/^obsidian$/},()=>({path:'host',namespace:'host'}));builder.onLoad({filter:/.*/,namespace:'host'},()=>({contents:'export const Platform={isDesktopApp:true};',loader:'js'}));}}]});
const api=createRequire(import.meta.url)(join(directory,'suite.cjs'));

/** Observe every owned timer without changing the production lifetime implementation. */
function owner(){let sequence=0;const timers=new Map();return{timers,closed:false,AbortController,Blob,FileReader:undefined,
 setTimeout(fn,ms){const id=++sequence;timers.set(id,setTimeout(()=>{timers.delete(id);fn()},ms));return id},clearTimeout(id){clearTimeout(timers.get(id));timers.delete(id)}}}

test('raster preflight preserves complete bounds while capping both sides and allocation',()=>{
 assert.deepEqual(api.canvasRasterSize(640,480,2),{width:1280,height:960,scale:2,reduced:false});
 for(const [width,height]of [[100000,100000],[20000,1],[1,20000],[8000,4000]]){const result=api.canvasRasterSize(width,height,3);assert(result.width<=8192&&result.height<=8192);assert(result.width*result.height<=8000000);assert(result.reduced);assert(result.scale<=3);}
 const mobile=api.canvasRasterSize(2500,1800,2,4000000);assert(mobile.width*mobile.height<=4000000);assert(mobile.reduced);
 for(const values of [[0,1],[1,-1],[NaN,1],[Infinity,1],[1,1,0],[1,1,4]])assert.throws(()=>api.canvasRasterSize(...values));
});

test('immutable PNG clipboard writes start in the handler and retired completions release UI',async()=>{
 const blob=new Blob(['finite PNG fixture'],{type:'image/png'}),states=[];let captured,resolve;
 const session=new api.ClipboardSession(blob,payload=>{captured=payload;return new Promise(done=>{resolve=done})});session.listen(state=>states.push(state));session.copy();
 assert.equal(captured,blob);assert.equal(session.state,'copying');session.dispose();resolve();await new Promise(done=>setImmediate(done));assert.deepEqual(states,['idle','copying']);
});

test('capture lifetime aborts waits and clears exact owning-window timers',async()=>{
 const window=owner(),cancel=new AbortController(),lifetime=new api.ImageExportLifetime(window,{signal:cancel.signal,current:()=>true},1000);
 const pending=lifetime.wait(new Promise(()=>{}));cancel.abort();await assert.rejects(pending,error=>error instanceof api.CanvasImageError&&error.reason==='retired');lifetime.dispose();lifetime.dispose();assert.equal(window.timers.size,0);
 let live=true;const next=new api.ImageExportLifetime(window,{current:()=>live});await next.yield();live=false;assert.throws(()=>next.check(),error=>error.reason==='retired');next.dispose();assert.equal(window.timers.size,0);
});

test('capture deadlines normalize stalled native work without leaving a live timer',async()=>{
 const window=owner(),lifetime=new api.ImageExportLifetime(window,{current:()=>true},15);await assert.rejects(lifetime.wait(new Promise(()=>{})),error=>error.reason==='limit');lifetime.dispose();assert.equal(window.timers.size,0);
});

test('an early native timeout retains limit ownership before the wall-clock deadline',async()=>{
 const window=owner(),schedule=window.setTimeout;let expire;
 window.setTimeout=(callback,delay)=>{expire=callback;return schedule(callback,delay)};
 const lifetime=new api.ImageExportLifetime(window,{current:()=>true},10000),pending=lifetime.wait(new Promise(()=>{}));
 expire();await assert.rejects(pending,error=>error.reason==='limit');assert.throws(()=>lifetime.check(),error=>error.reason==='limit');lifetime.dispose();assert.equal(window.timers.size,0);
});

test('PNG filenames are destination-independent and share Markdown safety without rewriting source paths',()=>{
 for(const name of ['../map','/map','map/a','map\\a','map:bad','map\nfile'])assert.equal(api.artifactFilename(name,'png'),null);
 assert.equal(api.artifactFilename('Ideas','png'),'Ideas.png');assert.equal(api.artifactFilename('Ideas.PNG','png'),'Ideas.PNG');assert.equal(api.artifactFilename('Ideas','md'),'Ideas.md');
});

test('owning-window clipboard capability is feature-detected and receives the exact Blob',async()=>{
 const calls=[],blob=new Blob(['png'],{type:'image/png'}),window={ClipboardItem:class{constructor(data){this.data=data}},navigator:{clipboard:{write:async items=>{calls.push(items)}}}};
 const write=api.pngClipboardWriter({defaultView:window});await write(blob);assert.equal(calls[0][0].data['image/png'],blob);assert.equal(api.pngClipboardWriter({defaultView:{navigator:{}}}),null);
});

test('desktop native handoff retires its object URL and never calls a Vault writer',async()=>{
 const calls=[],blob=new Blob(['png'],{type:'image/png'}),window={URL:{createObjectURL(value){assert.equal(value,blob);calls.push('create');return'blob:owned'},revokeObjectURL(url){calls.push(['revoke',url])}},navigator:{}},document={defaultView:window,adoptNode:fragment=>fragment};
 const previous=Object.getOwnPropertyDescriptor(globalThis,'createFragment');globalThis.createFragment=()=>({createEl(tag,options){assert.equal(tag,'a');return{click(){calls.push(['download',options.attr.download,options.attr.href])}}},replaceChildren(){calls.push('dispose')}});
 try{api.Platform.isDesktopApp=true;await api.savePng(document,'Map.png',blob,()=>true);assert.deepEqual(calls,['create',['download','Map.png','blob:owned'],['revoke','blob:owned'],'dispose']);
  await assert.rejects(api.savePng(document,'Map.png',blob,()=>false));await assert.rejects(api.savePng(document,'../Map.png',blob,()=>true));assert.equal(calls.length,4);
 }finally{if(previous)Object.defineProperty(globalThis,'createFragment',previous);else delete globalThis.createFragment}
});

test('mobile handoff uses supported file share only and reports actual native rejection',async()=>{
 const files=[],blob=new Blob(['png'],{type:'image/png'}),window={File,navigator:{canShare:()=>true,share:async data=>{files.push(data.files[0])}}},document={defaultView:window};
 api.Platform.isDesktopApp=false;
 try{assert.equal(api.canSavePng(document,blob),true);await api.savePng(document,'Map.png',blob,()=>true);assert.equal(files[0].name,'Map.png');assert.equal(files[0].type,'image/png');assert.equal(await files[0].text(),'png');
  window.navigator.canShare=()=>false;assert.equal(api.canSavePng(document,blob),false);await assert.rejects(api.savePng(document,'Map.png',blob,()=>true));
  window.navigator.canShare=()=>true;window.navigator.share=async()=>{throw new Error('native denied')};await assert.rejects(api.savePng(document,'Map.png',blob,()=>true),/native denied/);
 }finally{api.Platform.isDesktopApp=true}
});
