/** Real-browser coverage of the host-free attachment controls and directional synchronization affordances. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {chromiumHarness} from './support/browserTypeScript.mjs';
const bundled=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
import React from 'react'; import {createRoot} from 'react-dom/client'; import {flushSync} from 'react-dom';
import {SidecarAttachControls} from './src/ui/features/SidecarAttachControls'; export {SidecarAttachControls};
let root; window.renderAttach=(position,toLeaf=true,toPlex=true)=>{root??=createRoot(document.body.appendChild(document.createElement('div')));flushSync(()=>root.render(<SidecarAttachControls position={position} toLeaf={toLeaf} toPlex={toPlex} toLeafLabel="Open center in pane" toPlexLabel="Center pane note" icon={name=><span data-icon={name}/>} onToLeaf={()=>window.chosen='to-leaf'} onToPlex={()=>window.chosen='to-plex'}/>))};
`},write:false,bundle:true,format:'iife',globalName:'sourceModules',platform:'browser'});
test('attachment arrows point toward their destination on every edge and empty panes expose only outward flow',async()=>{
 const host=await chromiumHarness(bundled.outputFiles[0].text);
 try{
  for(const [position,outward,inward] of [['left','left','right'],['right','right','left'],['above','up','down'],['below','down','up']]){
   const state=await host.evaluate(`renderAttach('${position}');Array.from(document.querySelectorAll('button')).map(b=>({flow:b.dataset.kplexSidecarAttach,icon:b.firstChild.dataset.icon,label:b.getAttribute('aria-label'),title:b.hasAttribute('title')}))`);
   assert.deepEqual(state,[{flow:'to-leaf',icon:`arrow-big-${outward}-dash`,label:'Open center in pane',title:false},{flow:'to-plex',icon:`arrow-big-${inward}-dash`,label:'Center pane note',title:false}]);
  }
  assert.equal(await host.evaluate("renderAttach('right',true,false);document.querySelectorAll('button').length"),1);
  const rect=await host.evaluate("document.querySelector('button').getBoundingClientRect().toJSON()");
  await host.command('Input.dispatchMouseEvent',{type:'mousePressed',x:rect.x+rect.width/2,y:rect.y+rect.height/2,button:'left',clickCount:1});
  await host.command('Input.dispatchMouseEvent',{type:'mouseReleased',x:rect.x+rect.width/2,y:rect.y+rect.height/2,button:'left',clickCount:1});
  assert.equal(await host.evaluate('window.chosen'),'to-leaf');
  assert.equal(await host.evaluate("renderAttach('right',false,false);document.querySelectorAll('button').length"),0);
 }finally{await host.cleanup()}
});
