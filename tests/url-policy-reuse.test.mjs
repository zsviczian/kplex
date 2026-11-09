/** Actual URL-owner compilation reuses one captured field policy while retaining source/policy fences. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {contributorBrowserBundle} from './support/contributorBrowserFixture.mjs';
import {urlPublicationFixture} from './support/urlPublicationFixture.mjs';
const bundle=await contributorBrowserBundle(['src/index/GraphIndex.ts','src/index/GraphBuilder.ts']);
const target='https://policy.example/shared';

test('web-link completion notifies status even when no URL publication is pending',async()=>{
 const f=urlPublicationFixture(bundle),i=f.index,notifications=[];let enter,release,task;
 const entered=new Promise(resolve=>enter=resolve),gate=new Promise(resolve=>release=resolve);
 i.restoreUrlIndex=async()=>{enter();await gate;};
 i.plugin.notifyStartupProgress=terminal=>notifications.push({terminal,active:i.getUrlIndexProgress().active});
 try{
  task=i.startBackgroundUrlIndex();await entered;
  assert.equal(i.getUrlIndexProgress().active,true);assert.equal(i.pendingUrlPaths.size,0);
  release();await task;
  assert.equal(i.getUrlIndexProgress().active,false);
  assert.deepEqual(notifications.at(-1),{terminal:true,active:false},'The UI receives terminal status without another graph/file event');
 }finally{release();await task;f.close();}
});

for(const dispose of [false,true])test(`web-link startup duration includes held cached restoration (dispose ${dispose})`,async()=>{
 const f=urlPublicationFixture(bundle),i=f.index,marks=[];let now=7,enter,release,task;
 const entered=new Promise(resolve=>enter=resolve),gate=new Promise(resolve=>release=resolve);
 const restore=i.restoreUrlIndex;
 i.plugin.startupDiagnostics={mark(name){marks.push({name,at:now});}};
 i.restoreUrlIndex=async()=>{enter();await gate;};
 try{
  task=i.startBackgroundUrlIndex();await entered;
  assert.deepEqual(marks,[{name:'url-background-start',at:7}],'Cached restoration is already part of the reported operation');
  assert.equal(i.getUrlIndexProgress().active,true,'The loading operation remains visible');
  now=57;if(dispose)i.destroy();release();await task;
  assert.deepEqual(marks,dispose?[{name:'url-background-start',at:7}]:[
   {name:'url-background-start',at:7},{name:'url-background-complete',at:57}],
  'A normal duration includes the held restore; disposal never claims completion');
 }finally{release();await task;i.restoreUrlIndex=restore;f.close();}
});

test('many URL owners share one normalized policy, and a new policy reclassifies all contributions',async()=>{
 const parents=['Resource',...Array.from({length:426},(_,n)=>'Dormant '+n)];
 const hierarchy={hidden:[],parents,children:[],leftFriends:[],rightFriends:[],previous:[],next:[],exclusions:[]};
 const f=urlPublicationFixture(bundle,undefined,{ontologyPairingVersion:1,hierarchy}),i=f.index;
 try{
  for(let n=0;n<12;n++){const row=f.add('Owner'+n+'.md','',{Resource:'[Owner '+n+']('+target+')'});await i.publishUrlOwner(row.file,row.body,0,undefined,true);}
  assert.equal(i.getUrlPublicationDiagnostics().policyPreparations,1,'One immutable policy serves all owners');
  for(const file of f.files.values())assert.equal(i.urlState.pages.get(file.path).neighbours.get(target).isParent,true);
  i.plugin.settings.hierarchy={...hierarchy,parents:parents.slice(1),children:['Resource']};i.invalidateSemanticPolicy();await i.urlPublicationLane;
  assert.equal(i.getUrlPublicationDiagnostics().policyPreparations,2,'Semantic invalidation captures the new policy exactly once');
  for(const file of f.files.values()){
   const relation=i.urlState.pages.get(file.path).neighbours.get(target);assert.equal(relation.isParent,false);assert.equal(relation.isChild,true);
  }
  assert.equal(i.urlAliasOwners.get(target).size,12,'Owner identities and label contributions are retained');
 }finally{f.close();}
});

test('policy supersession during private URL preparation cannot publish the old role',async()=>{
 const hierarchy={hidden:[],parents:['Resource'],children:[],leftFriends:[],rightFriends:[],previous:[],next:[],exclusions:[]};
 const f=urlPublicationFixture(bundle,undefined,{ontologyPairingVersion:1,hierarchy}),i=f.index;
 const prepare=i.prepareUrlAliasOwners;let enter,release,held=false;
 const entered=new Promise(resolve=>enter=resolve),gate=new Promise(resolve=>release=resolve);
 try{
  const row=f.add('Owner.md','',{Resource:'[Label]('+target+')'});
  i.prepareUrlAliasOwners=async function(...args){if(!held){held=true;enter();await gate;}return prepare.apply(this,args)};
  const task=i.publishUrlOwner(row.file,row.body,0,undefined,true);await entered;
  i.plugin.settings.hierarchy={...hierarchy,parents:[],previous:['Resource']};i.invalidateSemanticPolicy();release();await task;
  const relation=i.urlState.pages.get(row.file.path).neighbours.get(target);
  assert.equal(relation.isParent,false);assert.equal(relation.isPreviousFriend,true);
  assert.equal(i.getUrlPublicationDiagnostics().policyPreparations,2,'The retry uses a new captured policy');
  assert.equal(i.urlOwners.get(row.file.path).file,row.file,'Exact native source ownership is preserved');
 }finally{release();i.prepareUrlAliasOwners=prepare;f.close();}
});

test('reused policy does not retain a replaced owner metadata observation',async()=>{
 const f=urlPublicationFixture(bundle,undefined,{hierarchy:{hidden:[],parents:['Resource'],children:[],leftFriends:[],rightFriends:[],previous:[],next:[],exclusions:[]}}),i=f.index;
 try{
  const row=f.add('Owner.md','',{Resource:'[Old]('+target+')'});await i.publishUrlOwner(row.file,row.body,0,undefined,true);
  const next='https://policy.example/replacement';f.metadata.set(row.file.path,{frontmatter:{Resource:'[New]('+next+')'}});
  await i.publishUrlOwner(row.file,row.body,0,undefined,true);
  assert.equal(i.getUrlPublicationDiagnostics().policyPreparations,1);
  assert.equal(i.urlState.pages.get(row.file.path).neighbours.has(target),false,'Old URL contribution retires');
  assert.equal(i.urlState.pages.get(row.file.path).neighbours.get(next).isParent,true,'Current metadata uses the captured ontology');
  assert.deepEqual([...i.urlAliasOwners.get(next).get(row.file.path)],['New']);
 }finally{f.close();}
});

test('image-property changes retire the cached reference selection',async()=>{
 const f=urlPublicationFixture(bundle,undefined,{nodeImageProperty:'Other image'}),i=f.index;
 try{
  const row=f.add('Owner.md','',{Cover:target});await i.publishUrlOwner(row.file,row.body,0,undefined,true);
  assert(i.urlState.pages.get(row.file.path).neighbours.has(target),'Ordinary URL property creates incidence');
  i.plugin.settings.nodeImageProperty='Cover';i.invalidateSemanticPolicy();await i.urlPublicationLane;
  assert.equal(i.getUrlPublicationDiagnostics().policyPreparations,2);
  assert.equal(i.urlState.pages.get(row.file.path).neighbours.has(target),false,'Image-only property no longer creates ordinary incidence');
 }finally{f.close();}
});
