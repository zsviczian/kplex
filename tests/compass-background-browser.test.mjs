/** Actual graph camera/underlay callbacks in real Chromium, with bounded explicit owner ports. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {build} from 'esbuild';
import {chromiumHarness} from './support/browserTypeScript.mjs';
const graph=ts.createSourceFile('PlexGraph.tsx',readFileSync('src/ui/PlexGraph.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
/** Extract complete production callbacks; the fixture supplies effects and data, never replacement geometry or scheduling. */
function callback(name){let value;const visit=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(graph)===name&&ts.isArrowFunction(node.initializer))value=node.initializer.getText(graph);ts.forEachChild(node,visit)};visit(graph);assert(value,name);return value}
const built=await build({stdin:{resolveDir:process.cwd(),loader:'ts',contents:`
 import {ElementMotion} from './src/ui/components/ElementMotion';import {centerArrivalFrames} from './src/ui/components/centerArrival';
 import {compassPolygons} from './src/core/plex/compassBackground';const classic={tint:compassPolygons};import {COMPASS_DIRECTIONS} from './src/core/plex/colorPreferences';
 export function fixture(count=0){
  const root=document.createElement('div'),cameraNode=document.createElement('div'),svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),node=document.createElement('div');
  root.style.cssText='position:fixed;left:10px;top:10px;width:800px;height:600px;overflow:hidden';svg.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
  cameraNode.style.cssText='position:absolute;transform-origin:0 0';node.style.cssText='position:absolute;left:30px;top:40px;width:120px;height:26px';
  for(const direction of COMPASS_DIRECTIONS)svg.append(document.createElementNS(svg.namespaceURI,'polygon'));
  cameraNode.append(node);for(let n=0;n<count;n++){const other=document.createElement('div');other.style.cssText='position:absolute;left:100px;top:100px;width:2px;height:2px';cameraNode.append(other)}root.append(svg,cameraNode);document.body.append(root);
  const viewport={current:root},compassElement={current:svg},compassCenter={current:{element:node,owner:document,left:30,top:40,width:120,height:26}},
   compassPreferences={current:{compass:{enabled:true}}},compassOpacity={current:.07},compassSync={current:null},measuredViewport={current:{width:800,height:600}},camera={current:{x:200,y:150,scale:1}},
   cameraFrame={current:null},cameraFrameWindow={current:null},cameraWritePending={current:false},cameraElement={current:cameraNode},cameraIntentPlaced={current:false},automaticFit={current:null},activePath='Center',sceneMotion=new ElementMotion();
  const committedCamera={current:{...camera.current}},cameraFlushRevision={current:0},publishPublicScene={current:()=>{}};
  let overlayWrites=0;const syncCentralEditorOverlay=()=>overlayWrites++;
  const requestCameraFrame=${callback('requestCameraFrame')};const syncCompass=${callback('syncCompass')};compassSync.current=syncCompass;
  const applyCamera=${callback('applyCamera')};const flushCameraTransform=${callback('flushCameraTransform')};
  flushCameraTransform();
  return{root,svg,node,camera,cameraNode,compassCenter,compassPreferences,compassOpacity,measuredViewport,sceneMotion,cameraFrame,applyCamera,flushCameraTransform,sync:syncCompass,requestCameraFrame,
   arrival(){const current=node.getBoundingClientRect(),poses=[];const frames=centerArrivalFrames({left:current.left-90,top:current.top+40,width:current.width*1.3,height:current.height*.9},current,camera.current.scale,poses);return sceneMotion.play(node,frames,{duration:180,easing:'cubic-bezier(.2,.72,.22,1)'},poses)},
   overlayWrites:()=>overlayWrites,
   dispose(){sceneMotion.cancelAll();if(cameraFrame.current!==null)(cameraFrameWindow.current??window).cancelAnimationFrame(cameraFrame.current);root.remove()}};
 }
`},bundle:true,write:false,platform:'browser',format:'iife',globalName:'sourceModules'});
/** Own one browser/profile and always dispose it independently of assertion outcomes. */
async function scenario(code){const host=await chromiumHarness(built.outputFiles[0].text);try{return await host.evaluate(code)}finally{await host.cleanup()}}

test('actual underlay follows animated center, current camera, resizing, native overlay and retired owners',async()=>{
 const result=await scenario(`(async()=>{
  const f=sourceModules.fixture();let maxError=0,comparisons=0,rectReads=0;const nativeRect=f.node.getBoundingClientRect.bind(f.node);f.node.getBoundingClientRect=()=>{rectReads++;return nativeRect()};
  const points=()=>[...f.svg.children].map(p=>p.getAttribute('points').split(' ').filter(Boolean).map(pair=>pair.split(',').map(Number)));
  const apex=()=>points()[0].find(p=>points().every(poly=>poly.some(q=>Math.abs(p[0]-q[0])<1e-7&&Math.abs(p[1]-q[1])<1e-7)));
  const animation=f.arrival();animation.pause();await animation.ready;rectReads=0;
  for(const scale of [.3,.7,1,2])for(const time of [0,.15,.35,.5,.65,.85,.99]){
   f.applyCamera({x:220,y:190,scale});f.flushCameraTransform();animation.currentTime=time*180;f.sync();
   const p=apex(),rect=nativeRect(),root=f.root.getBoundingClientRect();if(!p)throw Error('Missing shared apex');
   maxError=Math.max(maxError,Math.abs(p[0]-(rect.left+rect.width/2-root.left)),Math.abs(p[1]-(rect.top+rect.height/2-root.top)));comparisons++;
  }
  if(rectReads)throw Error('Production frame measured node rectangles');
  f.sceneMotion.cancelAll();f.compassPreferences.current.compass.enabled=false;f.sync();if(f.svg.style.display!=='none')throw Error('Disabled tint visible');
  const next=f.arrival();rectReads=0;next.pause();await next.ready;next.currentTime=90;f.compassPreferences.current.compass.enabled=true;f.sync();if(!apex())throw Error('Late enable lost active pose');f.sceneMotion.cancelAll();
  f.measuredViewport.current={width:500,height:200};f.sync();if(f.svg.getAttribute('viewBox')!=='0 0 500 200')throw Error('Stale viewport');
  f.compassCenter.current={element:null,owner:document,left:10,top:20,width:200,height:100};f.camera.current={x:0,y:0,scale:1};if(f.sync())throw Error('Native overlay placeholder followed motion');
  const overlayApex=apex();if(!overlayApex||Math.abs(overlayApex[0]-110)>1e-7||Math.abs(overlayApex[1]-70)>1e-7)throw Error('Wrong native overlay center');
  f.compassCenter.current.owner=document.implementation.createHTMLDocument();if(f.sync()||f.svg.style.display!=='none')throw Error('Retired owner painted');
  f.dispose();return{maxError,comparisons,rectReads};
 })()`);
 console.log(JSON.stringify({compassGeometry:result}));
 assert.equal(result.comparisons,28);assert.equal(result.rectReads,0);assert(result.maxError<.03,JSON.stringify(result));
});

test('shared camera frame stops at settle, cancel, disable, hidden or zero viewport independent of scene size',async()=>{
 const rows=await scenario(`(async()=>{
  const rows=[],wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  for(const count of [0,300]){
   const f=sourceModules.fixture(count),original=window.requestAnimationFrame;let frames=0;
   window.requestAnimationFrame=function(callback){frames++;return original.call(this,callback)};
   try{
    f.arrival();f.requestCameraFrame();await wait(270);const settled=frames,writes=f.overlayWrites();await wait(70);if(frames!==settled||f.cameraFrame.current!==null)throw Error('Idle follower retained');
    f.arrival();f.requestCameraFrame();await wait(30);f.sceneMotion.cancelAll();await wait(40);const cancelled=frames;await wait(50);if(frames!==cancelled)throw Error('Cancelled follower retained');
    f.arrival();f.requestCameraFrame();f.compassPreferences.current.compass.enabled=false;await wait(40);const disabled=frames;await wait(50);if(frames!==disabled)throw Error('Disabled follower retained');
    f.sceneMotion.cancelAll();f.compassPreferences.current.compass.enabled=true;f.measuredViewport.current={width:0,height:0};if(f.sync())throw Error('Zero viewport follows');
    f.measuredViewport.current={width:800,height:600};Object.defineProperty(document,'hidden',{configurable:true,value:true});if(f.sync()||f.svg.style.display!=='none')throw Error('Hidden owner follows');delete document.hidden;
    if(f.overlayWrites()!==writes)throw Error('Follow-only frames rewrote native camera overlay');
    rows.push({count,settledFrames:settled,idleFrames:frames-disabled,cameraOverlayWrites:writes});
   }finally{window.requestAnimationFrame=original;f.dispose();delete document.hidden}
  }
  return rows;
 })()`);
 console.log(JSON.stringify({compassFrames:rows}));
 assert.equal(rows.length,2);for(const row of rows){assert(row.settledFrames>0&&row.settledFrames<50,JSON.stringify(rows));assert.equal(row.idleFrames,0);assert.equal(row.cameraOverlayWrites,1)}
});
