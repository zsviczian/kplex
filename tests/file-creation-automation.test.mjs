/** Exercise the real guarded optional-integration adapter without scheduling graph work.
 * A controlled handler keeps its genuine promise pending before and during template parsing. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {mkdtempSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
const directory=mkdtempSync(join(tmpdir(),'kplex-template-barrier-'));
process.on('exit',()=>rmSync(directory,{recursive:true,force:true}));
await build({entryPoints:['src/adapters/obsidian/fileCreationAutomation.ts'],bundle:true,platform:'node',format:'esm',outfile:join(directory,'adapter.mjs')});
const {FileCreationAutomation}=await import(pathToFileURL(join(directory,'adapter.mjs')));
let evaluatedCopies=0;
/** A copied built module has its own module environment, as a real plugin bundle re-evaluation does. */
async function independentlyEvaluatedAutomation(){
 const path=join(directory,`adapter-reloaded-${++evaluatedCopies}.mjs`);writeFileSync(path,readFileSync(join(directory,'adapter.mjs')));
 return (await import(pathToFileURL(path))).FileCreationAutomation;
}
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
const tick=()=>new Promise(resolve=>setImmediate(resolve));

function fixture(handle){
 const previous=globalThis.window,timers=new Map(),files=new Map(),tasks=new Map(),messages=[];let serial=0,calls=0;
 globalThis.window={setTimeout:callback=>{timers.set(++serial,callback);return serial},clearTimeout:id=>timers.delete(id)};
 class Templater{static async on_file_creation(givenEngine,_app,file){calls++;if(handle)return handle.call(this,givenEngine,file,tasks);await tasks.get(file).promise;file.body='---\nfromTemplate: ready\n---\nRendered body';}}
 const engine=new Templater(),original=Templater.on_file_creation;
 const app={plugins:{plugins:{'templater-obsidian':{templater:engine}}},vault:{getFileByPath:path=>files.get(path)}};
 const automation=new FileCreationAutomation(app,{waiting:()=>{messages.push('waiting');return()=>messages.push('waiting-hidden')},unavailable:()=> 'unsupported template integration',cancelled:()=> 'retired file'});
 const create=(path,givenEngine=engine)=>async()=>{const file={path,extension:'md',body:'---\nfromTemplate: <% value %>\n---\n<% body %>'};files.set(path,file);tasks.set(file,deferred());void Templater.on_file_creation(givenEngine,app,file);return file};
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

test('concurrent automatic creations serialize unsafe native context and retain separate file receipts',async()=>{
 const f=fixture();try{const first=f.automation.create(f.create('One.md')),wrapper=f.Templater.on_file_creation,second=f.automation.create(f.create('Two.md'));
  await tick();assert.equal(f.Templater.on_file_creation,wrapper);let done=false;void first.then(()=>done=true);
  const one=f.files.get('One.md'),two=f.files.get('Two.md');f.tasks.get(two).resolve();await tick();assert.equal(f.calls(),1);assert.equal(done,false);assert.equal(f.Templater.on_file_creation,wrapper);
  f.tasks.get(one).resolve();assert.equal(await first,one);assert.equal(await second,two);assert.equal(f.Templater.on_file_creation,f.original);assert.equal(f.calls(),2);
 }finally{f.close()}
});

test('failed templates retain a partial native identity and recovery cannot bypass the rejected receipt',async()=>{
 const f=fixture();try{const work=f.automation.create(f.create('Failure.md'));await tick();const file=f.files.get('Failure.md');f.tasks.get(file).reject(Error('template failed'));
  await assert.rejects(work,error=>error.name==='PartialRelatedFileError'&&error.file===file&&error.cause.message==='template failed');
  await assert.rejects(f.automation.wait(file),/template failed/);assert.equal(f.files.get(file.path),file);
 }finally{f.close()}
});

test('unload rejects waiting creation and drains independent template work before restoring interception',async()=>{
 const f=fixture();try{const work=f.automation.create(f.create('Unload.md'));await tick();const file=f.files.get('Unload.md');f.automation.dispose();
  await assert.rejects(work,error=>error.file===file&&/retired/.test(error.message));assert.notEqual(f.Templater.on_file_creation,f.original);f.tasks.get(file).resolve();await tick();assert.match(file.body,/Rendered body/);assert.equal(f.Templater.on_file_creation,f.original);
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

test('an explicit template replaces automatic processing only for its exact returned file',async()=>{
 const f=fixture();try{
  let explicitCalls=0;
  const work=f.automation.create(f.create('Explicit.md'),{path:'Explicit.md',run:async file=>{explicitCalls++;file.body='---\nselected: true\n---\nExplicit body';}});
  await tick();const file=await work;
  assert.equal(explicitCalls,1);assert.equal(f.calls(),0);assert.match(file.body,/selected: true/);assert(!file.body.includes('<%'));
  assert.equal(f.Templater.on_file_creation,f.original);
 }finally{f.close()}
});

test('concurrent explicit templates and automatic creation share native admission without retaining foreign receipts',async()=>{
 const f=fixture();try{
  const gates=[deferred(),deferred()],applied=[];
  const first=f.automation.create(f.create('One.md'),{path:'One.md',run:async file=>{await gates[0].promise;applied.push(file.path)}});
  const second=f.automation.create(f.create('Two.md'),{path:'Two.md',run:async file=>{await gates[1].promise;applied.push(file.path)}});
  await tick();const other=await f.create('Unrelated.md')();f.tasks.get(other).resolve();
  gates[1].resolve();await tick();assert.deepEqual(applied,[]);assert.equal(f.calls(),0);
  gates[0].resolve();await first;await second;await tick();assert.deepEqual(applied,['One.md','Two.md']);assert.equal(f.calls(),1);
 }finally{f.close()}
});

/** Pinned Templater 2.27 shares InternalModule.config across awaits. This host-shaped race
 * matches the exact native failure: the first note rendered the second note's tp.file.title. */
test('creation handler receipts isolate shared native context for explicit and automatic templates',async()=>{
 for(const secondExplicit of [true,false]){
  const entered=[],gates=new Map([['One.md',deferred()],['Two.md',deferred()]]);let jobs=[];
  const render=async(engine,file)=>{engine.config={target_file:file};entered.push(file.path);await gates.get(file.path).promise;return engine.config.target_file.path};
  const f=fixture(async(engine,file)=>{file.body=await render(engine,file)});
  try{
   const first=f.automation.create(f.create('One.md'),{path:'One.md',run:async file=>{file.body=await render(f.engine,file)}});
   const second=f.automation.create(f.create('Two.md'),secondExplicit?{path:'Two.md',run:async file=>{file.body=await render(f.engine,file)}}:undefined);jobs=[first,second];
   await tick();assert.deepEqual(entered,['One.md'],'A second handler must not replace native context while the first parser awaits');
   gates.get('Two.md').resolve();gates.get('One.md').resolve();const [one,two]=await Promise.all(jobs);
   assert.equal(one.body,'One.md');assert.equal(two.body,'Two.md');assert.equal(f.calls(),secondExplicit?0:1);
  }finally{for(const gate of gates.values())gate.resolve();await Promise.allSettled(jobs);f.close();}
 }
});

test('a rejected serialized template does not poison the next creation receipt',async()=>{
 const f=fixture(),gate=deferred();let secondRuns=0;
 try{
  const first=f.automation.create(f.create('Failure.md'),{path:'Failure.md',run:async()=>{await gate.promise;throw Error('Expected parser failure')}}),failed=first.catch(error=>error);
  const second=f.automation.create(f.create('Next.md'),{path:'Next.md',run:async file=>{secondRuns++;file.body='Next output'}});
  await tick();assert.equal(secondRuns,0);gate.resolve();assert.match((await failed).message,/Expected parser failure/);
  assert.equal((await second).body,'Next output');assert.equal(secondRuns,1);assert.equal(f.Templater.on_file_creation,f.original);
 }finally{gate.resolve();await tick();f.close();}
});

test('dispose cancels queued explicit execution while admitted foreign native work drains once',async()=>{
 const f=fixture(),active=deferred();let queuedRuns=0;const caught=[];
 try{
  caught.push(f.automation.create(f.create('Active.md'),{path:'Active.md',run:async file=>{await active.promise;file.body='Active output'}}).catch(error=>error));
  caught.push(f.automation.create(f.create('Queued.md'),{path:'Queued.md',run:async()=>{queuedRuns++}}).catch(error=>error));
  await tick();const foreign=await f.create('Foreign.md')(),wrapper=f.Templater.on_file_creation;f.automation.dispose();
  for(const error of await Promise.all(caught))assert.match(error.message,/retired/);
  assert.equal(f.Templater.on_file_creation,wrapper);assert.equal(queuedRuns,0);assert.equal(f.calls(),0);
  active.resolve();await tick();assert.equal(queuedRuns,0);assert.equal(f.calls(),1);assert.equal(f.Templater.on_file_creation,wrapper);
  f.tasks.get(foreign).resolve();await tick();assert.match(foreign.body,/Rendered body/);assert.equal(f.Templater.on_file_creation,f.original);
 }finally{active.resolve();for(const task of f.tasks.values())task.resolve();await tick();f.close();}
});

test('dispose before native create returns cannot misclassify its selected file as a foreign automatic creation',async()=>{
 const admitted=[],f=fixture(async(_engine,file,tasks)=>{admitted.push(file.path);await tasks.get(file).promise;file.body='Foreign native output'}),active=deferred(),returned=deferred();let queuedRuns=0;const caught=[];
 try{
  caught.push(f.automation.create(f.create('Active.md'),{path:'Active.md',run:async()=>{await active.promise}}).catch(error=>error));
  caught.push(f.automation.create(async()=>{const file=await f.create('Delayed.md')();await returned.promise;return file},{path:'Delayed.md',run:async()=>{queuedRuns++}}).catch(error=>error));
  await tick();const foreign=await f.create('Foreign.md')();f.automation.dispose();returned.resolve();
  for(const error of await Promise.all(caught))assert.match(error.message,/retired/);
  active.resolve();await tick();assert.equal(queuedRuns,0);assert.deepEqual(admitted,['Foreign.md']);
  f.tasks.get(foreign).resolve();await tick();assert.equal(f.Templater.on_file_creation,f.original);
 }finally{active.resolve();returned.resolve();for(const task of f.tasks.values())task.resolve();await tick();f.close();}
});

test('reacquisition joins the existing hook while an unrelated native receipt is draining',async()=>{
 const f=fixture();try{
  const first=f.automation.create(f.create('Owned.md'));await tick();const foreign=await f.create('Foreign.md')(),wrapper=f.Templater.on_file_creation;
  f.tasks.get(f.files.get('Owned.md')).resolve();await first;await tick();assert.equal(f.calls(),2);assert.equal(f.Templater.on_file_creation,wrapper);
  const next=f.automation.create(f.create('Next.md'));await tick();assert.equal(f.Templater.on_file_creation,wrapper);assert.equal(f.calls(),2);
  f.tasks.get(foreign).resolve();await tick();assert.equal(f.calls(),3);f.tasks.get(f.files.get('Next.md')).resolve();await next;
  assert.equal(f.Templater.on_file_creation,f.original);
 }finally{for(const task of f.tasks.values())task.resolve();await tick();f.close();}
});

test('different native engine instances retain independent creation admission',async()=>{
 const f=fixture();let secondAutomation;
 try{
  const first=f.automation.create(f.create('First.md')),otherEngine=new f.Templater();
  f.app.plugins.plugins['templater-obsidian']={templater:otherEngine};
  secondAutomation=new FileCreationAutomation(f.app,{waiting:()=>{},unavailable:()=> 'unsupported',cancelled:()=> 'retired'});
  const second=secondAutomation.create(f.create('Second.md',otherEngine));await tick();assert.equal(f.calls(),2);
  f.tasks.get(f.files.get('Second.md')).resolve();assert.equal((await second).path,'Second.md');assert.equal(f.files.get('First.md').body.includes('<%'),true);
  f.tasks.get(f.files.get('First.md')).resolve();await first;assert.equal(f.Templater.on_file_creation,f.original);
 }finally{secondAutomation?.dispose();for(const task of f.tasks.values())task.resolve();await tick();f.close();}
});

test('handler delegation preserves its receiver and never replaces a later third-party wrapper',async()=>{
 let receiver;const f=fixture(async function(_engine,file,tasks){receiver=this;await tasks.get(file).promise;file.body='Native output'});
 try{
  const first=f.automation.create(f.create('First.md'));await tick();const wrapped=f.Templater.on_file_creation;
  const thirdParty=function(...args){return wrapped.apply(this,args)};f.Templater.on_file_creation=thirdParty;
  f.tasks.get(f.files.get('First.md')).resolve();await first;assert.equal(receiver,f.Templater);assert.equal(f.Templater.on_file_creation,thirdParty);
  const second=f.automation.create(f.create('Second.md'));await tick();f.tasks.get(f.files.get('Second.md')).resolve();await second;
  assert.equal(f.calls(),2);assert.equal(f.Templater.on_file_creation,thirdParty);f.Templater.on_file_creation=f.original;
 }finally{for(const task of f.tasks.values())task.resolve();await tick();f.Templater.on_file_creation=f.original;f.close();}
});

test('a freshly evaluated module joins an old native receipt through disposal and restores the actual original',async()=>{
 const Reloaded=await independentlyEvaluatedAutomation(),entered=[],f=fixture(async(engine,file,tasks)=>{
  engine.config={target_file:file};entered.push('native:'+file.path);await tasks.get(file).promise;file.body='TPL '+engine.config.target_file.path;
 }),gate=deferred();let after;
 const marker=Symbol.for('k-plex:templater-creation-receipts'),beforeSymbols=Object.getOwnPropertySymbols(f.Templater);
 try{
  const old=f.automation.create(f.create('Old.md')).catch(error=>error);await tick();const sharedHandler=f.Templater.on_file_creation;
  f.automation.dispose();assert.match((await old).message,/retired/);assert.equal(f.Templater.on_file_creation,sharedHandler);
  after=new Reloaded(f.app,{waiting:()=>{},unavailable:()=> 'unsupported',cancelled:()=> 'retired'});
  const next=after.create(f.create('New.md'),{path:'New.md',run:async file=>{f.engine.config={target_file:file};entered.push('explicit:'+file.path);await gate.promise;file.body='TPL '+f.engine.config.target_file.path}});
  await tick();assert.equal(f.Templater.on_file_creation,sharedHandler);assert.deepEqual(entered,['native:Old.md']);
  f.tasks.get(f.files.get('Old.md')).resolve();await tick();assert.deepEqual(entered,['native:Old.md','explicit:New.md']);assert.equal(f.files.get('Old.md').body,'TPL Old.md');
  gate.resolve();assert.equal((await next).body,'TPL New.md');assert.equal(f.calls(),1);assert.equal(f.Templater.on_file_creation,f.original);
  assert.equal(Object.getOwnPropertyDescriptor(f.Templater,marker),undefined);assert.deepEqual(Object.getOwnPropertySymbols(f.Templater),beforeSymbols);
 }finally{gate.resolve();for(const task of f.tasks.values())task.resolve();await tick();after?.dispose();f.close();}
});

test('two evaluated modules retain independent engine admission and one shared temporary registration',async()=>{
 const Reloaded=await independentlyEvaluatedAutomation(),f=fixture();let after;
 try{
  const old=f.automation.create(f.create('Old.md')),otherEngine=new f.Templater(),sharedHandler=f.Templater.on_file_creation;
  f.app.plugins.plugins['templater-obsidian']={templater:otherEngine};after=new Reloaded(f.app,{waiting:()=>{},unavailable:()=> 'unsupported',cancelled:()=> 'retired'});
  const next=after.create(f.create('New.md',otherEngine));await tick();assert.equal(f.calls(),2);assert.equal(f.Templater.on_file_creation,sharedHandler);
  f.tasks.get(f.files.get('New.md')).resolve();await next;assert.equal(f.Templater.on_file_creation,sharedHandler);
  f.tasks.get(f.files.get('Old.md')).resolve();await old;assert.equal(f.Templater.on_file_creation,f.original);
 }finally{for(const task of f.tasks.values())task.resolve();await tick();after?.dispose();f.close();}
});

test('an unknown owner-local registration fails before creation without stranding explicit path ownership',async()=>{
 const f=fixture(),marker=Symbol.for('k-plex:templater-creation-receipts'),unknown={otherIntegration:true};let creates=0;
 try{
  Object.defineProperty(f.Templater,marker,{value:unknown,configurable:true});
  await assert.rejects(f.automation.create(async()=>{creates++;return null},{path:'Retry.md',run:async()=>{}}),/unsupported/);
  assert.equal(creates,0);assert.equal(f.Templater[marker],unknown);assert.equal(f.Templater.on_file_creation,f.original);
  delete f.Templater[marker];const file=await f.automation.create(f.create('Retry.md'),{path:'Retry.md',run:async file=>{file.body='Retried'}});
  assert.equal(file.body,'Retried');assert.equal(f.Templater.on_file_creation,f.original);assert.equal(Object.getOwnPropertyDescriptor(f.Templater,marker),undefined);
 }finally{delete f.Templater[marker];f.close();}
});

test('failed native slot installation removes its marker and releases an explicit path for retry',async()=>{
 const f=fixture(),marker=Symbol.for('k-plex:templater-creation-receipts');let creates=0;
 try{
  Object.defineProperty(f.Templater,'on_file_creation',{configurable:true,get:()=>f.original,set:()=>{throw Error('Locked native slot')}});
  await assert.rejects(f.automation.create(async()=>{creates++;return null},{path:'Retry.md',run:async()=>{}}),/unsupported/);
  assert.equal(creates,0);assert.equal(f.Templater.on_file_creation,f.original);assert.equal(Object.getOwnPropertyDescriptor(f.Templater,marker),undefined);
  Object.defineProperty(f.Templater,'on_file_creation',{value:f.original,writable:true,configurable:true});
  assert.equal((await f.automation.create(f.create('Retry.md'),{path:'Retry.md',run:async file=>{file.body='Retried'}})).body,'Retried');
 }finally{Object.defineProperty(f.Templater,'on_file_creation',{value:f.original,writable:true,configurable:true});f.close();}
});

test('failed registration never overwrites a third party intervening in the native handler slot',async()=>{
 const f=fixture(),marker=Symbol.for('k-plex:templater-creation-receipts');let slot=f.original;
 const thirdParty=function(...args){return f.original.apply(this,args)};
 try{
  Object.defineProperty(f.Templater,'on_file_creation',{configurable:true,get:()=>slot,set:()=>{slot=thirdParty;throw Error('Intervening native wrapper')}});
  await assert.rejects(f.automation.create(async()=>assert.fail('Registration failed before create'),{path:'Retry.md',run:async()=>{}}),/unsupported/);
  assert.equal(f.Templater.on_file_creation,thirdParty);assert.equal(Object.getOwnPropertyDescriptor(f.Templater,marker),undefined);
  Object.defineProperty(f.Templater,'on_file_creation',{value:thirdParty,writable:true,configurable:true});
  await f.automation.create(f.create('Retry.md'),{path:'Retry.md',run:async()=>{}});assert.equal(f.Templater.on_file_creation,thirdParty);
 }finally{Object.defineProperty(f.Templater,'on_file_creation',{value:f.original,writable:true,configurable:true});f.close();}
});

test('a non-extensible native owner cannot strand marker state or explicit path ownership',async()=>{
 const f=fixture(),marker=Symbol.for('k-plex:templater-creation-receipts');
 try{
  Object.preventExtensions(f.Templater);
  await assert.rejects(f.automation.create(async()=>assert.fail('Registration failed before create'),{path:'Retry.md',run:async()=>{}}),/unsupported/);
  assert.equal(f.Templater.on_file_creation,f.original);assert.equal(Object.getOwnPropertyDescriptor(f.Templater,marker),undefined);
  class RecoveredOwner{}RecoveredOwner.on_file_creation=f.original;Object.defineProperty(f.engine,'constructor',{value:RecoveredOwner,configurable:true});
  const file=await f.automation.create(async()=>{const file={path:'Retry.md',extension:'md',body:''};f.files.set(file.path,file);void RecoveredOwner.on_file_creation(f.engine,f.app,file);return file},{path:'Retry.md',run:async file=>{file.body='Retried'}});
  assert.equal(file.body,'Retried');assert.equal(RecoveredOwner.on_file_creation,f.original);assert.equal(Object.getOwnPropertyDescriptor(RecoveredOwner,marker),undefined);
 }finally{f.close();}
});

test('shared hook construction retains no caller-bound error factory or automation instance',()=>{
 const source=ts.createSourceFile('fileCreationAutomation.ts',readFileSync('src/adapters/obsidian/fileCreationAutomation.ts','utf8'),ts.ScriptTarget.Latest,true);let hook;
 function find(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='creationHook')hook=node;ts.forEachChild(node,find)}find(source);
 assert(hook);assert.deepEqual(hook.parameters.map(parameter=>parameter.name.getText(source)),['owner']);const forbidden=[];
 function inspect(node){if(ts.isIdentifier(node)&&['unavailable','messages','FileCreationAutomation','App'].includes(node.text))forbidden.push(node.text);ts.forEachChild(node,inspect)}inspect(hook);
 assert.deepEqual(forbidden,[],'A third-party-retained retired handler must not retain the first automation through an error factory');
});

test('retirement tolerates an externally locked handler slot and leaves only a transparent retired delegate',async()=>{
 const f=fixture(),marker=Symbol.for('k-plex:templater-creation-receipts');
 try{
  const work=f.automation.create(f.create('Owned.md')).catch(error=>error);await tick();const retained=f.Templater.on_file_creation;
  Object.defineProperty(f.Templater,'on_file_creation',{value:retained,writable:false,configurable:true});f.automation.dispose();assert.match((await work).message,/retired/);
  f.tasks.get(f.files.get('Owned.md')).resolve();await tick();assert.equal(Object.getOwnPropertyDescriptor(f.Templater,marker),undefined);assert.equal(f.Templater.on_file_creation,retained);
  const foreign=await f.create('Foreign.md')();assert.equal(f.calls(),2);f.tasks.get(foreign).resolve();await tick();assert.match(foreign.body,/Rendered body/);
 }finally{Object.defineProperty(f.Templater,'on_file_creation',{value:f.original,writable:true,configurable:true});for(const task of f.tasks.values())task.resolve();await tick();f.close();}
});

test('same-path explicit creation refuses a competing owned operation before another file is created',async()=>{
 const f=fixture();try{
  const gate=deferred(),first=f.automation.create(f.create('Same.md'),{path:'Same.md',run:async()=>{await gate.promise}});await tick();let extraCreates=0;
  await assert.rejects(f.automation.create(async()=>{extraCreates++;return null},{path:'Same.md',run:async()=>{}}),/unsupported/);
  assert.equal(extraCreates,0);gate.resolve();await first;
 }finally{f.close()}
});

test('a foreign creation winning the selected path retains automatic processing when our create fails',async()=>{
 const f=fixture();try{
  let explicitCalls=0;
  await assert.rejects(f.automation.create(async()=>{const foreign=await f.create('Race.md')();f.tasks.get(foreign).resolve();throw Error('collision');},
   {path:'Race.md',run:async()=>{explicitCalls++}}),/collision/);
  await tick();assert.equal(f.calls(),1);assert.equal(explicitCalls,0);assert.match(f.files.get('Race.md').body,/Rendered body/);
 }finally{f.close()}
});

test('without Templater an explicit failure retains its file and rejected recovery receipt',async()=>{
 const f=fixture();try{
  delete f.app.plugins.plugins['templater-obsidian'];const file={path:'Plain.md',extension:'md'};f.files.set(file.path,file);
  await assert.rejects(f.automation.create(async()=>file,{path:file.path,run:async()=>{throw Error('explicit failure')}}),error=>error.file===file);
  await assert.rejects(f.automation.wait(file),/explicit failure/);assert.equal(f.files.get(file.path),file);
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
