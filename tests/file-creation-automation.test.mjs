/** Exercise the real guarded optional-integration adapter without scheduling graph work.
 * A controlled handler keeps its genuine promise pending before and during template parsing. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const directory=mkdtempSync(join(tmpdir(),'kplex-template-barrier-'));
process.on('exit',()=>rmSync(directory,{recursive:true,force:true}));
await build({entryPoints:['src/adapters/obsidian/fileCreationAutomation.ts'],bundle:true,platform:'node',format:'esm',outfile:join(directory,'adapter.mjs')});
const {FileCreationAutomation}=await import(pathToFileURL(join(directory,'adapter.mjs')));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
const tick=()=>new Promise(resolve=>setImmediate(resolve));

function fixture(){
 const previous=globalThis.window,timers=new Map(),files=new Map(),tasks=new Map(),messages=[];let serial=0,calls=0;
 globalThis.window={setTimeout:callback=>{timers.set(++serial,callback);return serial},clearTimeout:id=>timers.delete(id)};
 class Templater{static async on_file_creation(_engine,_app,file){calls++;await tasks.get(file).promise;file.body='---\nfromTemplate: ready\n---\nRendered body';}}
 const engine=new Templater(),original=Templater.on_file_creation;
 const app={plugins:{plugins:{'templater-obsidian':{templater:engine}}},vault:{getFileByPath:path=>files.get(path)}};
 const automation=new FileCreationAutomation(app,{waiting:()=>{messages.push('waiting');return()=>messages.push('waiting-hidden')},unavailable:()=> 'unsupported template integration',cancelled:()=> 'retired file'});
 const create=path=>async()=>{const file={path,extension:'md',body:'---\nfromTemplate: <% value %>\n---\n<% body %>'};files.set(path,file);tasks.set(file,deferred());void Templater.on_file_creation(engine,app,file);return file};
 return {automation,app,files,tasks,messages,timers,Templater,engine,original,create,calls:()=>calls,
  close(){automation.dispose();assert.equal(timers.size,0);assert.equal(Templater.on_file_creation,original);globalThis.window=previous}};
}

test('creation waits for deferred admission and complete YAML/body evaluation before any property write',async()=>{
 const f=fixture();try{let written=false;const work=f.automation.create(f.create('Folder/New.md')).then(file=>{file.body+='\nrelationship: target';written=true;return file});
  await tick();const file=f.files.get('Folder/New.md');assert.equal(written,false);assert(file.body.includes('<%'));
  for(const timer of [...f.timers.values()])timer();assert.deepEqual(f.messages,['waiting']);assert.equal(written,false,'A progress timer must not grant write authority');
  f.tasks.get(file).resolve();assert.equal(await work,file);assert.equal(written,true);assert(!file.body.includes('<%'));assert.match(file.body,/fromTemplate: ready/);assert.equal(f.calls(),1);assert.deepEqual(f.messages,['waiting','waiting-hidden']);
 }finally{f.close()}
});

test('concurrent creations wait for their own file and restore a single shared handler after both settle',async()=>{
 const f=fixture();try{const first=f.automation.create(f.create('One.md')),wrapper=f.Templater.on_file_creation,second=f.automation.create(f.create('Two.md'));
  await tick();assert.equal(f.Templater.on_file_creation,wrapper);let done=false;void first.then(()=>done=true);
  const one=f.files.get('One.md'),two=f.files.get('Two.md');f.tasks.get(two).resolve();assert.equal(await second,two);assert.equal(done,false);assert.equal(f.Templater.on_file_creation,wrapper);
  f.tasks.get(one).resolve();assert.equal(await first,one);assert.equal(f.Templater.on_file_creation,f.original);assert.equal(f.calls(),2);
 }finally{f.close()}
});

test('failed templates retain a partial native identity and recovery cannot bypass the rejected receipt',async()=>{
 const f=fixture();try{const work=f.automation.create(f.create('Failure.md'));await tick();const file=f.files.get('Failure.md');f.tasks.get(file).reject(Error('template failed'));
  await assert.rejects(work,error=>error.name==='PartialRelatedFileError'&&error.file===file&&error.cause.message==='template failed');
  await assert.rejects(f.automation.wait(file),/template failed/);assert.equal(f.files.get(file.path),file);
 }finally{f.close()}
});

test('unload rejects waiting creation and restores interception without cancelling independent template work',async()=>{
 const f=fixture();try{const work=f.automation.create(f.create('Unload.md'));await tick();const file=f.files.get('Unload.md');f.automation.dispose();
  await assert.rejects(work,error=>error.file===file&&/retired/.test(error.message));assert.equal(f.Templater.on_file_creation,f.original);f.tasks.get(file).resolve();await tick();assert.match(file.body,/Rendered body/);
 }finally{f.close()}
});

test('same-file rename follows identity while replacement fails with a recoverable partial file',async()=>{
 for(const replace of [false,true]){const f=fixture();try{const work=f.automation.create(f.create('Old.md'));await tick();const file=f.files.get('Old.md');
  if(replace)f.files.set(file.path,{path:file.path});else{f.files.delete(file.path);file.path='New.md';f.files.set(file.path,file)}
  f.tasks.get(file).resolve();if(replace)await assert.rejects(work,error=>error.file===file);else assert.equal(await work,file);
 }finally{f.close()}}
});

test('absent Templater creates directly; unsupported enabled versions fail before creating',async()=>{
 const f=fixture();try{let creates=0;delete f.app.plugins.plugins['templater-obsidian'];const file={path:'Plain.md'};
  assert.equal(await f.automation.create(async()=>{creates++;return file}),file);assert.equal(f.timers.size,0);
  f.app.plugins.plugins['templater-obsidian']={templater:{}};await assert.rejects(f.automation.create(async()=>{creates++;return file}),/unsupported/);assert.equal(creates,1);
 }finally{f.close()}
});

test('missing create receipt stays blocked during recovery rather than authorizing early metadata writes',async()=>{
 const f=fixture();try{const file={path:'Missing.md'};f.files.set(file.path,file);
  await assert.rejects(f.automation.create(async()=>file),error=>error.file===file&&/unsupported/.test(error.message));await assert.rejects(f.automation.wait(file),/unsupported/);
 }finally{f.close()}
});

test('unrelated Sync/plugin creations are neither retained for recovery nor awaited by the owned file',async()=>{
 const f=fixture();try{const own=f.automation.create(f.create('Owned.md'));await tick();const other=await f.create('Sync.md')();
  const file=f.files.get('Owned.md');f.tasks.get(file).resolve();assert.equal(await own,file);
  let unrelatedWaitFinished=false;await f.automation.wait(other).then(()=>unrelatedWaitFinished=true);assert.equal(unrelatedWaitFinished,true);
  f.tasks.get(other).resolve();await tick();
 }finally{f.close()}
});
