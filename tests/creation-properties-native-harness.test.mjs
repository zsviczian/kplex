/** Portable transport/early-failure cleanup checks for the real serialized native scenario.
 * These do not claim native UI, desktop input or Obsidian mutation acceptance. */
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {creationPropertiesCases} from '../scripts/testing/obsidian/creationPropertiesCases.mjs';

test('creation-property native scenario survives closure-free transport and always cleans failed initialization',async()=>{
 const run=vm.runInNewContext('('+creationPropertiesCases.toString()+')'),events=[];
 const fixture={initialize:async()=>{events.push('initialize');throw Error('Controlled initialization failure')},cleanup:async()=>{events.push('cleanup')}};
 await assert.rejects(run({}, {fixture:()=>fixture}),/Controlled initialization failure/);assert.deepEqual(events,['initialize','cleanup']);
});

test('native configuration failure still executes independent fixture cleanup before any form is opened',async()=>{
 const run=vm.runInNewContext('('+creationPropertiesCases.toString()+')'),events=[];
 const fixture={initialize:async()=>{events.push('initialize')},cleanup:async()=>{events.push('cleanup')},p:{translator:key=>key,settings:{noteTypeField:'Note type',commonNodeProperties:[]},
  updateCommonNodeProperties:async()=>{events.push('common');throw Error('Controlled property-settings failure')}}};
 await assert.rejects(run({}, {fixture:()=>fixture}),/Controlled property-settings failure/);assert.deepEqual(events,['initialize','common','cleanup']);
});

test('native template input retains focus through browsing while ordinary property drafts release popups',async()=>{
 const source=ts.createSourceFile('creationPropertiesCases.mjs',readFileSync(new URL('../scripts/testing/obsidian/creationPropertiesCases.mjs',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),inputs=[];
 /** Run the actual native driver's input delivery helper against a finite keyboard transport. */
 const visit=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='input')inputs.push(node.initializer.getText(source));ts.forEachChild(node,visit)};
 visit(source);assert.equal(inputs.length,1);
 for(const keepOpen of [false,true]){
  const keys=[],doc={},element={ownerDocument:doc,disabled:false,value:'',scrollIntoView:()=>{}};
  const f={check:(value,message)=>assert(value,message),key:async(_doc,key)=>{keys.push(key)},focus:async()=>({webContents:{insertText:async value=>{element.value=value}}}),until:async check=>assert(check())};
  const input=vm.runInNewContext('('+inputs[0]+')',{f,process});await input(element,'Template name',keepOpen);
  assert.deepEqual(keys,keepOpen?['A']:['A','Tab']);assert.equal(element.value,'Template name');
 }
});

test('native long-label expectations already match the settings normalization contract',()=>{
 const source=ts.createSourceFile('creationPropertiesCases.mjs',readFileSync(new URL('../scripts/testing/obsidian/creationPropertiesCases.mjs',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),expressions=[];
 /** Evaluate the actual authored fixture value so normalization cannot make its paint wait impossible. */
 const visit=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='longLabel')expressions.push(node.initializer.getText(source));ts.forEachChild(node,visit)};
 visit(source);assert.equal(expressions.length,1);
 for(const id of ['classic','mindmap','wuxing']){
  const label=vm.runInNewContext(expressions[0],{id});
  assert.equal(label,label.trim());assert(label.length>80&&label.length<=128);assert(label.includes(id));
 }
});
