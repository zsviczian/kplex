/** Exercise the actual plugin calendar coordinator with a deterministic main-window clock.
 * Only native scheduling and exact files are doubles; source acquisition/navigation are absent. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {plexViewModules} from './support/plexViewFixture.mjs';
const M=await plexViewModules(['src/core/plex/periodicPins.ts','src/core/plex/savedPins.ts']);
const source=ts.createSourceFile('main.ts',readFileSync('src/main.ts','utf8'),ts.ScriptTarget.Latest,true);
const names=new Set(['refreshPeriodicPins','stopPeriodicPinTimer']);const methods=[];
/** Extract production methods without importing the plugin's unrelated native startup surface. */
function visit(node){if(ts.isMethodDeclaration(node)&&names.has(node.name.getText(source)))methods.push(node.getText(source));ts.forEachChild(node,visit);}visit(source);
assert.equal(methods.length,names.size);
const emitted=ts.transpileModule('class Owner{'+methods.join('\n')+'}',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const Owner=Function('isPeriodicPin',emitted+';return Owner')(M.isPeriodicPin);

test('one bounded calendar clock refreshes presentation on rollover/resume and releases on disable/unload',()=>{
 const prior=global.window,timers=new Map();let serial=0,notices=0,path='Daily/2026-11-03.md',exists=true;
 global.window={setTimeout:(callback,delay)=>{assert.equal(delay,60000);const id=++serial;timers.set(id,callback);return id},clearTimeout:id=>timers.delete(id)};
 try{
  const owner=new Owner();Object.assign(owner,{settings:{pinnedNodes:['Fixed.md',{kind:'periodic',period:'day'}],navigationHistory:['Keep.md']},index:{notifyPresentation:()=>notices++},periodicPinTimer:null,periodicPinSignature:null,unloading:false,
   readSavedPins:()=>[{id:'symbolic-day',period:'day',path,state:exists?'ready':'missing'}]});
  owner.refreshPeriodicPins();assert.equal(timers.size,1);assert.equal(notices,1);
  owner.refreshPeriodicPins();assert.equal(timers.size,1);assert.equal(notices,1,'Unchanged reveal does not republish or navigate');
  path='Daily/2026-11-04.md';const callback=[...timers.values()][0];timers.clear();callback();assert.equal(timers.size,1);assert.equal(notices,2);
  exists=false;owner.refreshPeriodicPins();assert.equal(notices,3,'Current exact-file availability is refreshed independently of hydration');
  assert.deepEqual(owner.settings.navigationHistory,['Keep.md']);assert.deepEqual(owner.settings.pinnedNodes,['Fixed.md',{kind:'periodic',period:'day'}]);
  owner.settings.pinnedNodes=['Fixed.md'];owner.refreshPeriodicPins();assert.equal(timers.size,0);
  owner.settings.pinnedNodes=[{kind:'periodic',period:'day'}];owner.refreshPeriodicPins();owner.unloading=true;owner.refreshPeriodicPins();assert.equal(timers.size,0);
 }finally{global.window=prior;}
});
