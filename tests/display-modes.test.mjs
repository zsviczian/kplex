/** Real-browser display leases and extracted production resize/lifecycle policies; native Obsidian acceptance remains separate. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import ts from 'typescript';
import {chromiumHarness} from './support/browserTypeScript.mjs';

/** Locate a production callback or native-view method without restating its behavior in the test. */
function sourceParts() {
  const graph=ts.createSourceFile('graph.tsx',readFileSync('src/ui/PlexGraph.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let controls,resize,prepare,editorResize;
  const visit=node=>{
    if(ts.isJsxElement(node)&&node.openingElement.attributes.properties.some(item=>ts.isJsxAttribute(item)&&item.name.text==='className'&&item.initializer?.getText(graph)==='"kplex-zoom-controls"'))controls=node.getText(graph);
    if(ts.isVariableDeclaration(node)&&node.name.getText(graph)==='updateViewport')resize=node.initializer.getText(graph);
    if(ts.isPropertyAssignment(node)&&node.name.getText(graph)==='prepareDisplayResize')prepare=node.initializer.getText(graph);
    if(ts.isCallExpression(node)&&node.expression.getText(graph)==='useLayoutEffect'&&node.arguments[0]?.getText(graph).includes('restoreCentralEditorCamera.current'))editorResize=node.arguments[0].getText(graph);
    ts.forEachChild(node,visit);
  };
  visit(graph);assert(controls&&resize&&prepare&&editorResize);
  const view=ts.createSourceFile('view.tsx',readFileSync('src/ui/KplexView.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const declaration=view.statements.find(node=>ts.isClassDeclaration(node)&&node.name.text==='BaseKplexView');
  const methods=['onOpen','onClose'].map(name=>declaration.members.find(node=>ts.isMethodDeclaration(node)&&node.name.getText(view)===name).getText(view)).join('\n');
  return {controls,resize,prepare,editorResize,methods};
}

/** Bundle the actual controller/native controls and lifecycle callbacks with only a narrow host icon/environment boundary. */
async function bundle() {
  const {controls,resize,prepare,editorResize,methods}=sourceParts();
  const result=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
    import React from 'react';export {createElement,useState,useEffect,useSyncExternalStore} from 'react';export {createRoot} from 'react-dom/client';export {flushSync} from 'react-dom';
    import {KplexDisplayModes,registerDisplayModeUnload} from './src/ui/KplexDisplayModes';export {KplexDisplayModes};
    import {ObsidianIcon} from './src/ui/ObsidianIcon';
    export {ActionManager} from './src/application/ActionManager';export {surfaceAction} from './src/ui/surfaceActionImplementation';export {createTranslator} from './src/lang';
    export function DisplayControls({plugin,translate,displayState,fullscreenAvailable,actionSurfaceId}){return ${controls}}
    export function resizePolicy(ports){const{el,displayResizePending,measuredViewport,preserveCameraOnNextLayout,displayResizeLayout,setViewportSize,centralEditorMaximized,suppressAutoFitUntil,settings,fit}=ports;const viewport={current:el},centralEditorAvailable=true,restoreCentralEditorCamera={current:false},centralEditorRestoreCamera={current:null},applyCamera=()=>ports.applyCount++,flushCameraTransform=()=>{};return{update:${resize},prepare:${prepare},editor:${editorResize}}}
    const readObsidianPresentationEnvironment=()=>({device:'desktop'});
    class NativeBase {async onOpen(){}async onClose(){}getSurface(){return'leaf'}}
    class NativeView extends NativeBase {${methods}}
    export function lifecycleView(properties){return Object.assign(new NativeView(),{root:null,windowMigrationCleanup:null,ready:false,renderGeneration:0,readyResolvers:[],displayModes:null,releaseDisplayLifecycle:null},properties)}
  `},bundle:true,write:false,platform:'browser',format:'iife',globalName:'sourceModules',plugins:[{name:'native-icons',setup(builder){builder.onResolve({filter:/^obsidian$/},()=>({path:'obsidian',namespace:'native'}));builder.onLoad({filter:/.*/,namespace:'native'},()=>({contents:`export function getIcon(name){const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('data-icon',name);return icon}`,loader:'js'}));}}]});
  return result.outputFiles[0].text;
}

/** Install only the Obsidian DOM creation primitives used by the real view/controller. */
async function browser() {
  const host=await chromiumHarness(await bundle());
  await host.evaluate(`(()=>{HTMLElement.prototype.createDiv=function(options={}){const element=document.createElement('div');element.className=options.cls??'';for(const[key,value]of Object.entries(options.attr??{}))element.setAttribute(key,value);this.append(element);return element};HTMLElement.prototype.empty=function(){this.replaceChildren()};HTMLElement.prototype.addClass=function(value){this.classList.add(value)};HTMLElement.prototype.toggleClass=function(value,enabled){this.classList.toggle(value,enabled)};window.testStyles=document.createElement('style');testStyles.textContent=${JSON.stringify(readFileSync('styles.css','utf8'))};document.head.append(testStyles);})()`);
  return host;
}

test('all four display combinations retain one React root, native insertion, live controls and independent view state',async()=>{
  const host=await browser();
  try {
    const result=await host.evaluate(`(async()=>{
      const{createElement:h,useState,useEffect,useSyncExternalStore,createRoot,flushSync,KplexDisplayModes,DisplayControls,ActionManager,surfaceAction,createTranslator}=sourceModules;
      document.body.style.margin='0';const parent=document.body.createDiv();parent.style.cssText='width:640px;height:420px;contain:strict;overflow:hidden';const before=parent.createDiv(),content=parent.createDiv({cls:'kplex-view-host'}),after=parent.createDiv();
      const modes=new KplexDisplayModes(content,true),otherContent=document.body.createDiv(),other=new KplexDisplayModes(otherContent,true),translate=createTranslator('en');let mounts=0,unmounts=0,fit=0,prepared=0;
      modes.onBeforeResize(()=>prepared++);
      const manager=new ActionManager({readCommandContext:()=>({sharedCenter:null})});manager.registerSurface({id:'display',generation:1,readSnapshot:()=>({mounted:true,visible:true,windowId:'main',center:null,selected:null,focusRegion:'graph',interactionRevision:0,historyBack:false,historyForward:false,editorAvailable:false}),implementations:{'view.fullscreen.toggle':surfaceAction(()=>modes.toggleFullscreen()),'view.zen.toggle':surfaceAction(()=>modes.toggleZen()),'view.fit':surfaceAction(()=>fit++),'view.zoom-in':surfaceAction(()=>{}),'view.zoom-out':surfaceAction(()=>{})}});
      function App(){const state=useSyncExternalStore(modes.subscribe,modes.getSnapshot),[selection,setSelection]=useState('selected');useEffect(()=>{mounts++;return()=>unmounts++},[]);return h('div',{className:'kplex-app'+(state.zen?' is-zen':''),tabIndex:0},h('div',{className:'kplex-main-column'},h('div',{className:'kplex-top-stack'},'Toolbar and pins'),h('main',{},h('button',{id:'selection',onClick:()=>setSelection('retained')},selection),h(DisplayControls,{plugin:{actionManager:manager},translate,displayState:state,fullscreenAvailable:true,actionSurfaceId:'display'})),h('footer',{className:'kplex-history-bar'},'History')))}
      const root=createRoot(content);flushSync(()=>root.render(h(App)));const graph=content.firstChild;graph.querySelector('#selection').click();await new Promise(r=>setTimeout(r,0));graph.querySelector('#selection').focus();const selected=graph.querySelector('#selection');
      const click=async mode=>{content.querySelector('[data-kplex-display-control="'+mode+'"]').click();await new Promise(r=>setTimeout(r,0))};
      await click('fullscreen');const overlay=document.querySelector('.kplex-fullscreen-overlay'),bounds=overlay.getBoundingClientRect();const covers=bounds.width===innerWidth&&bounds.height===innerHeight&&content.parentElement===overlay&&Number(getComputedStyle(overlay).zIndex)<30;
      await click('zen');const both=modes.getSnapshot().fullscreen&&modes.getSnapshot().zen&&getComputedStyle(graph.querySelector('.kplex-top-stack')).display==='none'&&getComputedStyle(graph.querySelector('.kplex-history-bar')).display==='none'&&graph.querySelector('[data-kplex-display-control=zen]').getAttribute('aria-pressed')==='true';
      const icons=graph.querySelector('[data-kplex-display-control=fullscreen] [data-icon]').getAttribute('data-icon')==='minimize'&&graph.querySelector('[data-kplex-display-control=zen] [data-icon]').getAttribute('data-icon')==='shrink';
      await click('fullscreen');const zenOnly=!modes.getSnapshot().fullscreen&&modes.getSnapshot().zen&&content.parentElement===parent&&parent.children[0]===before&&parent.children[1]===content&&parent.children[2]===after;
      await click('zen');const normal=getComputedStyle(graph.querySelector('.kplex-top-stack')).display!=='none'&&getComputedStyle(graph.querySelector('.kplex-history-bar')).display!=='none';
      const retained=content.firstChild===graph&&graph.querySelector('#selection')===selected&&selected.textContent==='retained'&&mounts===1&&unmounts===0&&other.getSnapshot().zen===false&&prepared===4;
      await manager.dispatch({id:'view.fit',source:'toolbar',surfaceId:'display'});const deliberateFit=fit===1;
      modes.dispose();other.dispose();flushSync(()=>root.unmount());manager.dispose();parent.remove();otherContent.remove();return{covers,both,icons,zenOnly,normal,retained,deliberateFit,cleanup:!document.querySelector('.kplex-fullscreen-overlay,.kplex-fullscreen-anchor')&&unmounts===1};
    })()`);
    assert.deepEqual(result,Object.fromEntries(Object.keys(result).map(key=>[key,true])));
  } finally {await host.cleanup();}
});

test('fullscreen leases transfer per document, remain isolated across documents, and retire on pagehide or disposal',async()=>{
  const host=await browser();
  try {
    const result=await host.evaluate(`(()=>{
      const{KplexDisplayModes}=sourceModules;const parent=document.body.createDiv(),a=parent.createDiv(),b=parent.createDiv(),first=new KplexDisplayModes(a,true),second=new KplexDisplayModes(b,true);first.toggleZen();first.toggleFullscreen();second.toggleFullscreen();
      const transfer=!first.getSnapshot().fullscreen&&first.getSnapshot().zen&&second.getSnapshot().fullscreen&&a.parentElement===parent&&document.querySelectorAll('.kplex-fullscreen-overlay').length===1;
      const frame=document.createElement('iframe');document.body.append(frame);const doc=frame.contentDocument;Object.setPrototypeOf(doc.body,HTMLElement.prototype);const pop=doc.body.createDiv(),third=new KplexDisplayModes(pop,true);third.toggleFullscreen();const isolated=second.getSnapshot().fullscreen&&third.getSnapshot().fullscreen;
      window.dispatchEvent(new Event('pagehide'));const hidden=!second.getSnapshot().fullscreen&&third.getSnapshot().fullscreen&&b.parentElement===parent;
      third.dispose();third.dispose();first.dispose();second.dispose();const mobile=new KplexDisplayModes(a,false);mobile.toggleFullscreen();mobile.toggleZen();const constrained=!mobile.getSnapshot().fullscreen&&mobile.getSnapshot().zen;mobile.dispose();parent.remove();frame.remove();return{transfer,isolated,hidden,constrained,cleanup:!document.querySelector('.kplex-fullscreen-overlay,.kplex-fullscreen-anchor')};
    })()`);
    assert.deepEqual(result,{transfer:true,isolated:true,hidden:true,constrained:true,cleanup:true});
  } finally {await host.cleanup();}
});

test('production resize policy preserves exact camera for display transitions while ordinary pane resize and explicit fit remain available',async()=>{
  const host=await browser();
  try {
    const result=await host.evaluate(`(()=>{
      let fits=0,measures=0;const camera={x:217,y:-43,scale:1.7},ports={el:{clientWidth:900,clientHeight:700},displayResizePending:{current:false},measuredViewport:{current:{width:600,height:400}},preserveCameraOnNextLayout:{current:false},displayResizeLayout:{current:false},setViewportSize:()=>measures++,centralEditorMaximized:false,suppressAutoFitUntil:{current:0},settings:{allowAutozoom:true},fit:()=>{fits++;camera.x=0;camera.scale=1}};
      const policy=sourceModules.resizePolicy(ports);policy.prepare();policy.update();policy.update();const transition=JSON.stringify(camera)==='{"x":217,"y":-43,"scale":1.7}'&&fits===0&&measures===1&&ports.preserveCameraOnNextLayout.current&&ports.displayResizeLayout.current;
      ports.el.clientHeight=740;policy.update();const ordinary=fits===1&&measures===2;ports.fit();const explicit=fits===2;const editorPorts={...ports,centralEditorMaximized:true,applyCount:0};const editor=sourceModules.resizePolicy(editorPorts);editor.prepare();editor.editor();const editorPreserved=editorPorts.applyCount===0;return{transition,ordinary,explicit,editorPreserved};
    })()`);
    assert.deepEqual(result,{transition:true,ordinary:true,explicit:true,editorPreserved:true});
  } finally {await host.cleanup();}
});

test('production native lifecycle restores before cross-document adoption and releases listeners on close or plugin unload',async()=>{
  const host=await browser();
  try {
    const result=await host.evaluate(`(async()=>{
      const{lifecycleView}=sourceModules,events=new Set(),cleanup=[];const workspace={on(name,callback){const ref={name,callback};events.add(ref);return ref},offref(ref){events.delete(ref)}};
      const container=document.body.createDiv(),content=container.createDiv(),plugin={register:fn=>cleanup.push(fn),onKplexViewOpened:async()=>{},onKplexViewClosed:()=>{}},leaf={view:{containerEl:container}};let migrate,unmountDoc,renders=0;
      container.onWindowMigrated=fn=>{migrate=fn;return()=>{migrate=null}};
      const view=lifecycleView({contentEl:content,containerEl:container,app:{workspace},leaf,plugin,renderReact(){renders++;this.root={unmount:()=>{unmountDoc=content.ownerDocument}}}});await view.onOpen();view.displayModes.toggleZen();view.displayModes.toggleFullscreen();const outside=document.createElement('input');document.body.append(outside);outside.focus();[...events].find(ref=>ref.name==='active-leaf-change').callback({view:{containerEl:outside}});const changed=!view.displayModes.getSnapshot().fullscreen&&view.displayModes.getSnapshot().zen&&document.activeElement===outside;view.displayModes.toggleFullscreen();outside.remove();
      const frame=document.createElement('iframe');document.body.append(frame);Object.setPrototypeOf(frame.contentDocument.body,HTMLElement.prototype);frame.contentDocument.body.append(container);migrate();const migrated=unmountDoc===document&&content.ownerDocument===frame.contentDocument&&!view.displayModes.getSnapshot().fullscreen&&view.displayModes.getSnapshot().zen&&renders===2&&!document.querySelector('.kplex-fullscreen-overlay');
      view.displayModes.toggleFullscreen();cleanup[0]();const unload=events.size===0&&!frame.contentDocument.querySelector('.kplex-fullscreen-overlay');await view.onClose();const closed=migrate===null&&view.displayModes===null;container.remove();frame.remove();return{migrated,unload,closed,changed};
    })()`);
    assert.deepEqual(result,{migrated:true,unload:true,closed:true,changed:true});
  } finally {await host.cleanup();}
});
