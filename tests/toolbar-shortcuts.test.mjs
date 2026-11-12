/** Actual toolbar controls, click handlers and localized hints with real React/DOM events. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import {build} from 'esbuild';
import {chromiumHarness} from './support/browserTypeScript.mjs';
const tree=ts.createSourceFile('App.tsx',readFileSync('src/ui/App.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let button,settings,canvasControl,settingsControl;
/** Extract production handlers and JSX so this fixture cannot silently substitute a new dispatch path. */
function visit(node){
 if(ts.isFunctionDeclaration(node)&&node.name?.text==='ToolButton')button=node.getText(tree);
 if(ts.isVariableDeclaration(node)&&node.name.getText(tree)==='showSettingsMenu')settings=node.initializer.getText(tree);
 if(ts.isJsxSelfClosingElement(node)&&node.tagName.getText(tree)==='ToolButton'){
  const icon=node.attributes.properties.find(a=>a.name?.getText(tree)==='icon')?.initializer?.text;
  if(icon==='plus')canvasControl=node.getText(tree);if(icon==='settings')settingsControl=node.getText(tree);
 }
 ts.forEachChild(node,visit);
}
visit(tree);assert(button&&settings&&canvasControl&&settingsControl);
const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
import {canvasToolbarRequest,settingsToolbarChoice,toolbarShortcutHints} from './src/ui/toolbarShortcuts';
import {createTranslator} from './src/lang';
export {canvasToolbarRequest,settingsToolbarChoice,toolbarShortcutHints};
const ObsidianIcon=()=>null;${button}
export function mount(convention='windows',device='desktop',keyboard=true,locale='en'){
 const translate=createTranslator(locale),environment={device,keyConvention:convention,inputModes:{keyboard,pointer:true,touch:false},hostActions:{graphTab:true,sidepanel:true,popout:device==='desktop'}};
 const calls=[],rootRef={current:null},hostLeaf={},graphActionPorts={current:{canEditAreas:()=>true}},areaSettingsMode=false;
 const plugin={openSettings:()=>calls.push('plugin'),showKplexMenuAtMouseEvent:()=>calls.push('menu')};
 class Menu{addItem(run){const item={setTitle(){return item},setIcon(){return item},setChecked(){return item},onClick(){return item}};run(item)}}
 const runAction=id=>calls.push({id}),actions={dispatch:request=>calls.push(request)},showSettingsMenu=${settings};
 const el=document.body.appendChild(document.createElement('main')),root=createRoot(el);
 flushSync(()=>root.render(<>{${canvasControl}}{${settingsControl}}</>));
 return {calls,labels:[...el.querySelectorAll('button')].map(b=>b.getAttribute('aria-label')),click:(index,flags={})=>el.querySelectorAll('button')[index].dispatchEvent(new MouseEvent('click',{bubbles:true,...flags})),close:()=>{flushSync(()=>root.unmount());el.remove()}};
}
`},write:false,bundle:true,platform:'browser',format:'iife',globalName:'sourceModules'});

test('toolbar canvas gestures follow native navigation precedence on Windows and macOS',async()=>{
 const host=await chromiumHarness(bundle.outputFiles[0].text);
 try{for(const convention of ['windows','macos']){
  const result=await host.evaluate(`(()=>{const f=sourceModules.mount(${JSON.stringify(convention)}),mod=${JSON.stringify(convention==='macos'?'metaKey':'ctrlKey')};
   for(const flags of [{},{[mod]:true},{[mod]:true,altKey:true},{[mod]:true,altKey:true,shiftKey:true},{altKey:true},{shiftKey:true}])f.click(0,flags);
   const result={calls:f.calls,labels:f.labels};f.close();return result;})()`);
  assert.deepEqual(result.calls,[{id:'surface.new-tab',source:'toolbar'},{id:'surface.new-tab',source:'toolbar',args:{placement:'tab'}},
   {id:'surface.new-tab',source:'toolbar',args:{placement:'split'}},{id:'surface.open-popout',source:'toolbar'},
   {id:'surface.open-sidepanel',source:'toolbar'},{id:'surface.new-tab',source:'toolbar'}]);
  assert.match(result.labels[0],convention==='macos'?/Command\+Option\+Shift\+Click/:/Control\+Alt\+Shift\+Click/);
 }}finally{await host.cleanup()}
});

test('settings modified clicks bypass the menu, preserving ordinary menu and action ownership',async()=>{
 const host=await chromiumHarness(bundle.outputFiles[0].text);
 try{for(const convention of ['windows','macos']){
  const result=await host.evaluate(`(()=>{const f=sourceModules.mount(${JSON.stringify(convention)}),mod=${JSON.stringify(convention==='macos'?'metaKey':'ctrlKey')};
   f.click(1);f.click(1,{[mod]:true});f.click(1,{altKey:true});f.click(1,{[mod]:true,altKey:true});
   const r={calls:f.calls,labels:f.labels};f.close();return r;})()`);
  assert.deepEqual(result.calls,['menu','plugin',{id:'view.areas.toggle'},'plugin']);
  assert.match(result.labels[1],/Plugin settings/);assert.match(result.labels[1],/Area settings/);
 }}finally{await host.cleanup()}
});

test('mobile popout is neither executed nor advertised; keyboard and locale facts govern hints',async()=>{
 const host=await chromiumHarness(bundle.outputFiles[0].text);
 try{
  const result=await host.evaluate(`(()=>{
   const mobile=sourceModules.mount('ios','tablet',true);mobile.click(0,{metaKey:true,altKey:true,shiftKey:true});mobile.click(0,{metaKey:true});
   const touch=sourceModules.mount('android','tablet',false),unknown=sourceModules.mount('unknown'),french=sourceModules.mount('macos','desktop',true,'fr');
   const r={mobile:mobile.labels,calls:mobile.calls,touch:touch.labels,unknown:unknown.labels,french:french.labels};
   for(const f of [mobile,touch,unknown,french])f.close();return r;
  })()`);
  assert.deepEqual(result.calls,[{id:'surface.new-tab',source:'toolbar',args:{placement:'tab'}}]);
  assert.doesNotMatch(result.mobile[0],/Shift|window/i);
  assert.deepEqual(result.touch,['New canvas tab','Settings menu']);assert.deepEqual(result.unknown,['New canvas tab','Settings menu']);
  assert.match(result.french[0],/Clic/);assert.doesNotMatch(result.french[0],/New tab/);
 }finally{await host.cleanup()}
});
