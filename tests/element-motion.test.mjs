/** Real browser regression for production animation replacement, interruption and completed-fill cleanup. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {browserBundle,chromiumHarness} from './support/browserTypeScript.mjs';

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
