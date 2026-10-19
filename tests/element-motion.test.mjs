/** Real browser regression for production animation replacement, interruption and completed-fill cleanup. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {browserBundle,chromiumHarness} from './support/browserTypeScript.mjs';
import {loadPortableModules} from './support/portableTypeScript.mjs';

const {exports:{ElementMotion}} = loadPortableModules(['src/ui/components/ElementMotion.ts']);

/** Controlled native effects expose acquisition and exact asynchronous completion ownership. */
function animationFixture() {
 let resolve,reject,canceled=0;
 const effect={finished:new Promise((done,fail)=>{resolve=done;reject=fail}),cancel(){canceled++},effect:{getComputedTiming:()=>({progress:.5})}};
 return {effect,finish:()=>resolve(),fail:()=>reject(Error('canceled')),get canceled(){return canceled}};
}
const motionPoses=[{offset:0,x:0,y:0,scaleX:1,scaleY:1,originX:0,originY:0},{offset:1,x:10,y:0,scaleX:1,scaleY:1,originX:0,originY:0}];

test('native null animation acquisition retains no effect or pose and cancelAll stays safe',()=>{
 const motion=new ElementMotion(),element={animate:()=>null};
 assert.equal(motion.play(element,[{},{}],{duration:20},motionPoses),null);
 assert.equal(motion.isRunning(),false);assert.equal(motion.isRunning(element),false);assert.equal(motion.sample(element),null);
 assert.doesNotThrow(()=>motion.cancelAll());assert.doesNotThrow(()=>motion.cancelAll());
});

test('native null replacement retires old motion before admitting a later valid exact owner',async()=>{
 const motion=new ElementMotion(),old=animationFixture(),current=animationFixture();let next=old.effect;
 const element={animate:()=>next};
 assert.equal(motion.play(element,[{},{}],{duration:20},motionPoses),old.effect);assert(motion.sample(element));
 next=null;assert.equal(motion.play(element,[{},{}],{duration:20},motionPoses),null);assert.equal(old.canceled,1);assert.equal(motion.isRunning(),false);assert.equal(motion.sample(element),null);
 next=current.effect;assert.equal(motion.play(element,[{},{}],{duration:20},motionPoses),current.effect);assert.equal(motion.isRunning(element),true);
 old.fail();await Promise.resolve();assert.equal(motion.isRunning(element),true,'Retired completion cannot erase the new owner');assert(motion.sample(element));
 motion.cancelAll();assert.equal(current.canceled,1);assert.equal(motion.isRunning(),false);assert.equal(motion.sample(element),null);
 current.fail();await Promise.resolve();assert.equal(motion.isRunning(),false);
});

test('native valid animation preserves no-fill options and releases only its completed owner',async()=>{
 const motion=new ElementMotion(),effect=animationFixture(),frames=[{},{}],options={duration:20,fill:'both'};let received;
 const element={animate(actualFrames,actualOptions){received={frames:actualFrames,options:actualOptions};return effect.effect}};
 assert.equal(motion.play(element,frames,options,motionPoses),effect.effect);assert.equal(received.frames,frames);assert.equal(received.options.fill,'none');assert.equal(options.fill,'both');assert(motion.sample(element));
 effect.finish();await Promise.resolve();assert.equal(motion.isRunning(element),false);assert.equal(motion.sample(element),null);motion.cancelAll();assert.equal(effect.canceled,0);
});

test('element motion retires repeated transforms and restores actual scaled layout on finish or interruption',async()=>{
 const browser=await chromiumHarness(await browserBundle(['src/ui/components/ElementMotion.ts']));
 try {
  const result=await browser.evaluate(`(async()=>{
   const {ElementMotion}=window.sourceModules,motion=new ElementMotion();
   const parent=document.createElement('div'),node=document.createElement('div');
   parent.style.cssText='position:absolute;left:100px;top:100px;transform:scale(.7);transform-origin:0 0';
   node.style.cssText='position:absolute;left:30px;top:40px;width:120px;height:26px;font-size:12px';
   parent.append(node);document.body.append(parent);
   const baseline=node.getBoundingClientRect();let max=0;
   for(let step=0;step<30;step++){
    motion.play(node,[{transform:'translate(40px,20px) scale(1.8)',transformOrigin:'0 0'},{transform:'none',transformOrigin:'0 0'}],{duration:50,fill:'both'});
    max=Math.max(max,node.getAnimations().length);
    await new Promise(r=>setTimeout(r,2));
   }
   motion.cancelAll();const interrupted=node.getBoundingClientRect(),afterCancel=node.getAnimations().length;
   const final=motion.play(node,[{transform:'scale(2)'},{transform:'none'}],{duration:20,fill:'both'});
   await final.finished;await Promise.resolve();const complete=node.getBoundingClientRect();
   const values={max,afterCancel,afterFinish:node.getAnimations().length,baseline:[baseline.x,baseline.y,baseline.width,baseline.height],interrupted:[interrupted.x,interrupted.y,interrupted.width,interrupted.height],complete:[complete.x,complete.y,complete.width,complete.height],font:getComputedStyle(node).fontSize,fill:final.effect.getTiming().fill};
   motion.cancelAll();parent.remove();return values;
  })()`);
  assert.equal(result.max,1);assert.equal(result.afterCancel,0);assert.equal(result.afterFinish,0);
  assert.equal(result.fill,'none');assert.equal(result.font,'12px');
  assert.deepEqual(result.interrupted,result.baseline);assert.deepEqual(result.complete,result.baseline);
 }finally{await browser.cleanup()}
});

/** Compare real paused Web Animations, including global easing, against the exact owned numeric poses. */
test('tracked center poses match browser interpolation at every arrival segment and never survive replacement',async()=>{
 const browser=await chromiumHarness(await browserBundle(['src/ui/components/ElementMotion.ts','src/ui/components/centerArrival.ts']));
 try{
  const result=await browser.evaluate(`(async()=>{
   const {ElementMotion,centerArrivalFrames}=window.sourceModules,motion=new ElementMotion();let comparisons=0,maxError=0;
   const parent=document.createElement('div'),node=document.createElement('div');parent.append(node);document.body.append(parent);
   parent.style.cssText='position:absolute;left:0;top:0;transform-origin:0 0';node.style.cssText='position:absolute;left:30px;top:40px;width:123px;height:37px;transform-origin:27px 11px';
   for(const scale of [.3,.7,1,2,2.6])for(const curved of [true,false]){
    motion.cancelAll();parent.style.transform='translate(100px,70px) scale('+scale+')';const target=node.getBoundingClientRect(),poses=[];
    const frames=curved?centerArrivalFrames({left:target.left-87,top:target.top+43,width:target.width*1.4,height:target.height*.8},target,scale,poses):[{transform:'translate(0px,-22px) scale(.92)'},{transform:'translate(0px,0px) scale(1)'}];
    if(!curved)poses.push({offset:0,x:0,y:-22,scaleX:.92,scaleY:.92,originX:27,originY:11},{offset:1,x:0,y:0,scaleX:1,scaleY:1,originX:27,originY:11});
    const animation=motion.play(node,frames,{duration:1000,easing:'cubic-bezier(.2,.72,.22,1)'},poses);animation.pause();await animation.ready;
    for(const time of [0,.15,.35,.5,.65,.85,.99]){
     animation.currentTime=time*1000;const pose=motion.sample(node),rect=node.getBoundingClientRect();if(!pose)throw Error('Missing active pose');
     const x=target.left+(pose.originX+(target.width/scale/2-pose.originX)*pose.scaleX+pose.x)*scale;
     const y=target.top+(pose.originY+(target.height/scale/2-pose.originY)*pose.scaleY+pose.y)*scale;
     maxError=Math.max(maxError,Math.abs(rect.left+rect.width/2-x),Math.abs(rect.top+rect.height/2-y));comparisons++;
    }
   }
   motion.cancelAll();if(motion.sample(node)||motion.isRunning(node))throw Error('Canceled pose retained');
   const poses=[{offset:0,x:0,y:0,scaleX:1,scaleY:1,originX:0,originY:0},{offset:1,x:10,y:0,scaleX:1,scaleY:1,originX:0,originY:0}];
   const old=motion.play(node,[{transform:'translateX(0)'},{transform:'translateX(10px)'}],{duration:1000},poses);
   const newer=motion.play(node,[{transform:'translateX(0)'},{transform:'translateX(10px)'}],{duration:1000},poses);newer.pause();await newer.ready;newer.currentTime=500;await Promise.resolve();if(!motion.sample(node)||old.playState!=='idle')throw Error('Retired completion erased replacement');
   motion.cancelAll();parent.remove();return{comparisons,maxError,retired:!motion.sample(node)&&!motion.isRunning()};
  })()`);
  assert.equal(result.comparisons,70);assert(result.maxError<.03,JSON.stringify(result));assert(result.retired);
 }finally{await browser.cleanup()}
});
