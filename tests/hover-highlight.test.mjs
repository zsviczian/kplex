/** Real owning-window events exercise the shared node/gate/connector highlight owner. */
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
import {after,before,test} from 'node:test';
import {chromiumHarness} from './support/browserTypeScript.mjs';
const bundle=await build({entryPoints:['src/ui/components/hoverHighlight.ts'],write:false,bundle:true,format:'iife',globalName:'sourceModules',platform:'browser'});
let host;
before(async()=>{host=await chromiumHarness(bundle.outputFiles[0].text)});
after(async()=>{await host?.cleanup()});

test('unmodified connection mode retains the 750ms delay and cancels crossing, leaving and teardown',async()=>{
 const result=await host.evaluate(`(async()=>{const {HoverHighlight}=sourceModules,seen=[],intent=new HoverHighlight(window,false,value=>seen.push(value));const wait=ms=>new Promise(r=>setTimeout(r,ms));intent.enter('node',{altKey:false,pointerType:'mouse'});await wait(120);const early=[...seen];intent.enter('gate',{altKey:true,pointerType:'mouse'});await wait(820);const settled=[...seen];intent.enter('edge',{altKey:false,pointerType:'mouse'});intent.clear();await wait(820);return{early,settled,final:seen}})()`);
 assert.deepEqual(result,{early:[],settled:['gate'],final:['gate',null]});
});

test('area mode can publish immediately without timers while modifier gating still handles stationary keys',async()=>{
 const result=await host.evaluate(`(()=>{const {HoverHighlight,bindHoverHighlight}=sourceModules,seen=[],instant=new HoverHighlight(window,false,v=>seen.push(v),0);instant.enter('parent',{altKey:false,pointerType:'mouse'});const immediate=[...seen];instant.enter('child',{altKey:false,pointerType:'mouse'});instant.clear();const area=new HoverHighlight(window,true,v=>seen.push(v),0),release=bindHoverHighlight(document.body,area);area.enter('friend',{altKey:false,pointerType:'mouse'});const blocked=[...seen];window.dispatchEvent(new KeyboardEvent('keydown',{key:'Alt',altKey:true}));const pressed=[...seen];window.dispatchEvent(new KeyboardEvent('keyup',{key:'Alt',altKey:false}));area.enter('touch',{altKey:true,pointerType:'touch'});release();window.dispatchEvent(new KeyboardEvent('keydown',{key:'Alt',altKey:true}));return{immediate,blocked,pressed,final:seen}})()`);
 assert.deepEqual(result,{immediate:['parent'],blocked:['parent','child',null,null],pressed:['parent','child',null,null,'friend'],final:['parent','child',null,null,'friend',null,null]});
});
test('modifier mode works immediately on all targets, including stationary press/release, blur and cleanup',async()=>{
 const result=await host.evaluate(`(()=>{const element=document.body,{HoverHighlight,bindHoverHighlight}=sourceModules,seen=[],intent=new HoverHighlight(window,true,value=>seen.push(value)),release=bindHoverHighlight(element,intent);const key=alt=>window.dispatchEvent(new KeyboardEvent(alt?'keydown':'keyup',{key:'Alt',altKey:alt}));intent.enter('node',{altKey:false,pointerType:'mouse'});key(true);key(false);intent.enter('gate',{altKey:true,pointerType:'mouse'});intent.enter('edge',{altKey:true,pointerType:'mouse'});window.dispatchEvent(new Event('blur'));key(true);intent.enter('new',{altKey:true,pointerType:'mouse'});release();key(false);key(true);return seen})()`);
 assert.deepEqual(result,[null,'node',null,'gate','edge',null,'new',null]);
});
test('no delayed activation without modifier; touch and retired hover cannot steal drag ownership',async()=>{
 const result=await host.evaluate(`(async()=>{const seen=[],intent=new sourceModules.HoverHighlight(window,true,v=>seen.push(v));intent.enter('node',{altKey:false,pointerType:'mouse'});await new Promise(r=>setTimeout(r,820));intent.enter('touch',{altKey:true,pointerType:'touch'});intent.clear(false);intent.modifier(true);return seen})()`);
 assert.deepEqual(result,[null]);
});
test('listeners and timers belong to the actual document, including a second window realm',async()=>{
 const result=await host.evaluate(`(async()=>{const frame=document.createElement('iframe');const loaded=new Promise(r=>frame.onload=r);document.body.append(frame);await loaded;const owner=frame.contentWindow,seen=[],intent=new sourceModules.HoverHighlight(owner,true,v=>seen.push(v)),release=sourceModules.bindHoverHighlight(owner.document.body,intent);intent.enter('gate',{altKey:false,pointerType:'mouse'});window.dispatchEvent(new KeyboardEvent('keydown',{altKey:true}));const main=[...seen];owner.dispatchEvent(new owner.KeyboardEvent('keydown',{altKey:true}));const secondary=[...seen];release();owner.dispatchEvent(new owner.KeyboardEvent('keydown',{altKey:true}));frame.remove();return{main,secondary,final:seen}})()`);
 assert.deepEqual(result,{main:[null],secondary:[null,'gate'],final:[null,'gate',null]});
});
test('all production hover targets forward the pointer modifier to one owner; preference stays outside themes',()=>{
 const graph=readFileSync('src/ui/PlexGraph.tsx','utf8'),node=readFileSync('src/ui/ThoughtNode.tsx','utf8');
 assert.match(graph,/scheduleHoverIntent\(\{ kind: "edge", id: edge.id \}, event\)/);
 assert.match(graph,/scheduleHoverIntent\(\{ kind: "node", path: baseNode.page.path \}, event\)/);
 assert.match(graph,/scheduleHoverIntent\(\{ kind: "gate", path: baseNode.page.path, gate \}, event\)/);
 assert.match(node,/onHoverNode\(node, e\)/);assert.match(node,/onHoverGate\(node, gate, e\)/);
 const themes=readFileSync('src/core/plex/appearanceThemes.ts','utf8');
 assert(!themes.includes('hoverHighlightRequiresAlt'));assert(!themes.includes('areaOutlineRequiresAlt'));assert(!themes.includes('gateTooltipRequiresAlt'));
});

test('opted-in mouse modifier feedback is immediate in both policies and never starts from synthetic, pen, touch or edge targets',async()=>{
 const result=await host.evaluate(`(async()=>{
  const results=[];for(const required of[false,true]){
   const ordinary=[],peeks=[],H=sourceModules.HoverHighlight;
   const h=new H(window,required,v=>ordinary.push(v),750,{accepts:t=>t!=='edge',publish:v=>peeks.push(v)});
   h.enter('node',{pointerType:'mouse',altKey:false,isTrusted:true});const initial=peeks.at(-1);
   h.modifier(true,true);const pressed={ordinary:ordinary.at(-1),peek:peeks.at(-1)},count=peeks.length;
   h.modifier(true,true);const repeat=peeks.length===count;
   h.modifier(false,true);const released=peeks.at(-1);
   await new Promise(r=>setTimeout(r,790));const delayed={ordinary:ordinary.at(-1),peek:peeks.at(-1)};
   h.enter('gate',{pointerType:'mouse',altKey:true,isTrusted:true});const held=peeks.at(-1);
   h.clear(false);h.modifier(true,true);const drag=peeks.at(-1);
   h.enter('edge',{pointerType:'mouse',altKey:true,isTrusted:true});const edge=peeks.at(-1);h.clear();
   h.enter('synthetic',{pointerType:'mouse',altKey:true,isTrusted:false});const synthetic=peeks.at(-1);h.clear();
   h.enter('pen',{pointerType:'pen',altKey:true,isTrusted:true});const pen=peeks.at(-1);h.clear();
   h.enter('node',{pointerType:'mouse',altKey:true,isTrusted:true});h.enter('touch',{pointerType:'touch',altKey:true,isTrusted:true});const touch=peeks.at(-1);h.clear();
   results.push({required,initial,pressed,repeat,released,delayed,held,drag,edge,synthetic,pen,touch});
  }return results;
 })()`);
 for(const row of result){assert.equal(row.initial,null);assert.deepEqual(row.pressed,{ordinary:'node',peek:'node'});assert(row.repeat);assert.equal(row.released,null);assert.equal(row.delayed.peek,null);assert.equal(row.delayed.ordinary,row.required?null:'node');assert.equal(row.held,'gate');for(const key of['drag','edge','synthetic','pen','touch'])assert.equal(row[key],null,key);}
});

test('trusted stationary Alt input reaches the existing bound owner; synthetic keys, leave, blur and teardown cannot retain a peek',async()=>{
 await host.evaluate(`(()=>{
  const button=document.createElement('button');button.textContent='Trusted peek target';button.style.cssText='position:fixed;left:20px;top:20px;width:180px;height:50px';document.body.append(button);
  const h=new sourceModules.HoverHighlight(window,false,v=>button.dataset.highlight=v??'',750,{accepts:()=>true,publish:v=>button.dataset.peek=v??''});
  button.addEventListener('pointerenter',event=>h.enter('node',event));button.addEventListener('pointerleave',()=>h.clear());
  const release=sourceModules.bindHoverHighlight(button,h);window.peekOwnerFixture={button,h,dispose(){release();button.remove();delete window.peekOwnerFixture}};return true;
 })()`);
 try{
  await host.command('Input.dispatchMouseEvent',{type:'mouseMoved',x:80,y:40});
  assert.equal(await host.evaluate("peekOwnerFixture.button.dataset.peek"),'');
  await host.evaluate("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Alt',altKey:true}));true");
  assert.equal(await host.evaluate("peekOwnerFixture.button.dataset.peek"),'','Synthetic modifier cannot start trusted mouse feedback');
  await host.command('Input.dispatchKeyEvent',{type:'keyDown',key:'Alt',code:'AltLeft',windowsVirtualKeyCode:18,modifiers:1});
  assert.equal(await host.evaluate("peekOwnerFixture.button.dataset.peek"),'node');
  assert.equal(await host.evaluate("peekOwnerFixture.button.dataset.highlight"),'node');
  await host.command('Input.dispatchKeyEvent',{type:'keyUp',key:'Alt',code:'AltLeft',windowsVirtualKeyCode:18,modifiers:0});
  assert.equal(await host.evaluate("peekOwnerFixture.button.dataset.peek"),'');
  await host.command('Input.dispatchKeyEvent',{type:'keyDown',key:'Alt',code:'AltLeft',windowsVirtualKeyCode:18,modifiers:1});
  assert.equal(await host.evaluate("peekOwnerFixture.button.dataset.peek"),'node');
  await host.evaluate("window.dispatchEvent(new Event('blur'));true");
  assert.equal(await host.evaluate("peekOwnerFixture.button.dataset.peek"),'');
  await host.command('Input.dispatchKeyEvent',{type:'keyUp',key:'Alt',code:'AltLeft',windowsVirtualKeyCode:18,modifiers:0});
  await host.command('Input.dispatchMouseEvent',{type:'mouseMoved',x:300,y:120});
 }finally{await host.evaluate('peekOwnerFixture.dispose();true')}
});
