/** Exercise the actual window-publication adapter with explicit workspace event doubles.
 * Native acceptance separately verifies real Obsidian windows, reload and migration. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';

const bundle=await build({entryPoints:[fileURLToPath(new URL('../src/adapters/obsidian/publicApiWindow.ts',import.meta.url))],
  bundle:true,platform:'node',format:'esm',write:false});
const {publishPublicApiWindows}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));

/** Model only typed workspace windows, leaf enumeration and event registration/removal. */
function fixture(existing=[],layoutReady=true){
  const main={},listeners=new Set(),registered=[],ready=[];
  const workspace={rootSplit:layoutReady?{win:main}:null,
    onLayoutReady:/** Obsidian invokes immediately after readiness, otherwise queues startup work. */ callback=>{if(layoutReady)callback();else ready.push(callback);},
    iterateAllLeaves:/** Existing leaves may share a window. */ callback=>existing.forEach(win=>callback({getContainer:()=>({win})})),
    on:/** Retain the exact event token so disposal can release it. */ (name,callback)=>{const event={name,callback};listeners.add(event);return event;},
    offref:/** Match Obsidian's idempotent event retirement. */ event=>listeners.delete(event)};
  return {main,workspace,listeners,registered,
    layoutReady:/** Restore windows before invoking callbacks, as the native workspace does. */ ()=>{layoutReady=true;workspace.rootSplit={win:main};for(const callback of ready.splice(0))callback();},
    register:/** Capture registration through the plugin's lifecycle helper. */ event=>registered.push(event),
    emit:/** Deliver a real adapter callback for the named workspace lifecycle event. */ (name,win)=>{for(const event of listeners)if(event.name===name)event.callback({win},win);}};
}

test('main, existing and new popouts share one root; closing a window releases only its alias',()=>{
  const existing={},host=fixture([existing,existing]),api=Object.freeze({version:1,v1:{}});
  const dispose=publishPublicApiWindows(host.workspace,api,host.register,host.main),opened={};
  assert.equal(host.main.kplexApi,api);assert.equal(existing.kplexApi,api);assert.equal(host.registered.length,2);
  host.emit('window-open',opened);assert.equal(opened.kplexApi,api);
  assert.throws(()=>{opened.kplexApi={};},TypeError);
  host.emit('window-close',opened);assert(!Object.hasOwn(opened,'kplexApi'));assert.equal(host.main.kplexApi,api);
  dispose();dispose();assert.equal(host.listeners.size,0);
  for(const win of [host.main,existing,opened])assert(!Object.hasOwn(win,'kplexApi'));
  const late={};host.registered[0].callback({},late);assert(!Object.hasOwn(late,'kplexApi'));assert.equal(host.listeners.size,0);
});

test('unload preserves earlier properties and deliberate replacements; reload publishes a fresh root',()=>{
  const host=fixture(),original={local:true};
  Object.defineProperty(host.main,'kplexApi',{value:original,writable:true,enumerable:true,configurable:true});
  const descriptor=Object.getOwnPropertyDescriptor(host.main,'kplexApi');
  const dispose=publishPublicApiWindows(host.workspace,Object.freeze({version:1}),host.register,host.main);
  dispose();assert.deepEqual(Object.getOwnPropertyDescriptor(host.main,'kplexApi'),descriptor);
  const replacement={new:true},fresh=Object.freeze({version:1});
  const disposeFresh=publishPublicApiWindows(host.workspace,fresh,host.register,host.main);assert.equal(host.main.kplexApi,fresh);
  Object.defineProperty(host.main,'kplexApi',{value:replacement,configurable:true});
  dispose();disposeFresh();assert.equal(host.main.kplexApi,replacement);
});

test('partial installation failure rolls back aliases and listeners',()=>{
  const blocked={};Object.defineProperty(blocked,'kplexApi',{value:{reserved:true},configurable:false});
  const host=fixture([blocked]);
  assert.throws(()=>publishPublicApiWindows(host.workspace,{},host.register,host.main),TypeError);
  assert(!Object.hasOwn(host.main,'kplexApi'));assert.equal(host.listeners.size,0);
});

test('cold startup publishes the main alias with no root split and enumerates restored windows after layout',/** Cover the reported native pre-layout null-root failure. */ ()=>{
  const restored={},opened={},host=fixture([restored],false),api=Object.freeze({version:1});
  host.workspace.iterateAllLeaves=/** Leaf traversal is invalid until the root layout exists. */ callback=>{
    assert(host.workspace.rootSplit,'Do not enumerate leaves before layout');
    callback({getContainer:()=>({win:restored})});
  };
  const dispose=publishPublicApiWindows(host.workspace,api,host.register,host.main);
  assert.equal(host.main.kplexApi,api);assert(!Object.hasOwn(restored,'kplexApi'));
  host.emit('window-open',opened);assert.equal(opened.kplexApi,api);
  host.layoutReady();assert.equal(restored.kplexApi,api);
  dispose();for(const win of [host.main,opened,restored])assert(!Object.hasOwn(win,'kplexApi'));
});

test('unload before layout prevents a queued startup callback from republishing retired aliases',/** Fence the non-cancellable host readiness callback after disposal. */ ()=>{
  const restored={},host=fixture([restored],false),api=Object.freeze({version:1});
  const dispose=publishPublicApiWindows(host.workspace,api,host.register,host.main);
  dispose();host.layoutReady();
  assert(!Object.hasOwn(host.main,'kplexApi'));assert(!Object.hasOwn(restored,'kplexApi'));assert.equal(host.listeners.size,0);
});
