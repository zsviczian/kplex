/** Bounded reviewed ontology batches over canonical grammar and explicit host lifetimes. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {runInNewContext} from 'node:vm';
import {loadPortableModules} from './support/portableTypeScript.mjs';
const {exports:M}=loadPortableModules(['src/application/PublicApiOntologyConfiguration.ts','src/core/contracts/ontologyBatch.ts','src/application/PublicApi.ts']);
const hierarchy=extra=>Object.fromEntries(['hidden','parents','children','leftFriends','rightFriends','previous','next','exclusions'].map(group=>[group,extra?.[group]??[]]));
const initial=()=>({hierarchy:hierarchy({parents:['Parent'],children:['Child'],leftFriends:['Friend']}),ontologyPairingVersion:1,ontologyDescriptions:{Parent:'Ancestor',Child:'Descendant'}});
/** Only settings operations exist in this fixture; no Vault/index/network capability is supplied. */
function fixture(){
 let state=initial(),revision=1,epoch=0,now=1000,writes=0;
 const host={active:true,beforeSave:null,afterSave:null,saveError:null,refreshPending:false};
 const port={read:()=>state,revision:()=>revision,current:()=>host.active,now:()=>now,sessionId:'fixture',capture:()=>{const expected=epoch;return()=>epoch===expected;},save:async(edits,opening,current)=>{
  await host.beforeSave?.();if(!current()){const error=Error('Retired review');error.name='SettingsConflictError';throw error;}if(host.saveError)throw host.saveError;
  const plan=M.prepareOntologyBatch(state,edits);state={...state,...plan.output};revision++;writes++;host.afterSave?.();return{refreshPending:host.refreshPending};
 }};
 return {api:new M.PublicApiOntologyConfiguration(port),host,state:()=>state,writes:()=>writes,replace:next=>{state=next;revision++;},receive:next=>{state=next;revision++;epoch++;},advance:ms=>{now+=ms;}};
}
const assign=(field='Parent',role='parent',partner=null,extra={})=>({kind:'assign',field,role,partner,...extra});

test('preview detaches exact batch diffs; one confirmed save creates pair and independent descriptions',async()=>{
 const f=fixture(),review=f.api.preview([assign('Parent','parent','Child',{description:'Ancestor, formerly elder',partnerDescription:'Descendant, formerly younger'})]);
 assert.equal(review.state,'ready');assert.equal(f.writes(),0);assert.equal(review.after.find(v=>v.name==='Parent').partner,'Child');assert.equal(review.changes.length,1);
 review.after[0].description='Tampered';review.changes[0].edit.description='Tampered';
 await assert.rejects(f.api.apply({previewId:review.previewId,confirm:false}),{code:'CONFIRMATION_REQUIRED'});
 const saved=await f.api.apply({previewId:review.previewId,confirm:true});assert.equal(saved.state,'saved');assert.equal(saved.verified,true);assert.equal(f.writes(),1);
 assert.equal(f.state().ontologyDescriptions.Parent,'Ancestor, formerly elder');assert.equal(f.state().ontologyDescriptions.Child,'Descendant, formerly younger');
 await assert.rejects(f.api.apply({previewId:review.previewId,confirm:true}),{code:'STALE_REVISION'});
});
test('whole batch conflicts are review data and no earlier valid intent is saved',()=>{
 const f=fixture(),before=structuredClone(f.state());const review=f.api.preview([assign('New'),assign('Parent','parent','Friend')]);
 assert.equal(review.state,'conflict');assert.equal(review.previewId,null);assert.equal(review.conflicts[0].index,1);assert.deepEqual(f.state(),before);assert.equal(f.writes(),0);
});
test('normalized spelling is changed exactly with description migration; stale old-name removal refuses canonical deletion',()=>{
 const source={...initial(),hierarchy:hierarchy({parents:['Replies to/Answered by']}),ontologyDescriptions:{'Replies to':'reply meaning','Answered by':'answer meaning'}};
 const plan=M.prepareOntologyBatch(source,[assign('replies-to','parent','Answered by')]);
 assert.equal(plan.after.find(v=>v.key==='replies-to').name,'replies-to');assert.equal(plan.output.ontologyDescriptions['replies-to'],'reply meaning');assert.equal(plan.output.ontologyDescriptions['Replies to'],undefined);assert.equal(plan.output.ontologyDescriptions['Answered by'],'answer meaning');
 assert.throws(()=>M.prepareOntologyBatch(source,[assign('replies-to','parent','Answered by'),{kind:'remove',field:'Replies to'}]),e=>e.issue==='spelling');
 assert.throws(()=>M.prepareOntologyBatch({...source,ontologyDescriptions:{...source.ontologyDescriptions,'replies-to':'different'}},[assign('replies-to','parent','Answered by')]),e=>e.issue==='description');
});
test('describe, unpair and assignment removal share canonical endpoints without removing counterpart',()=>{
 const source=initial();const plan=M.prepareOntologyBatch(source,[assign('Parent','parent','Child'),{kind:'describe',field:'Child',description:'Own independent wording'},assign('Parent'),{kind:'remove',field:'Parent'}]);
 assert.equal(plan.after.some(v=>v.name==='Parent'),false);assert.equal(plan.after.find(v=>v.name==='Child').description,'Own independent wording');assert.equal(plan.after.find(v=>v.name==='Child').partner,undefined);assert.deepEqual(source,initial());
});
test('stale reviewed endpoints and incoming A-to-B-to-A reject while unrelated settings merge',async()=>{
 const f=fixture(),review=f.api.preview([{kind:'describe',field:'Parent',description:'Updated'}]);f.replace({...f.state(),unknownFuture:{kept:true}});
 assert.equal((await f.api.apply({previewId:review.previewId,confirm:true})).verified,true);assert.deepEqual(f.state().unknownFuture,{kept:true});
 const stale=f.api.preview([assign('Parent','child')]),original=structuredClone(f.state());f.receive({...original,ontologyDescriptions:{...original.ontologyDescriptions,Parent:'Transient'}});f.receive(original);
 await assert.rejects(f.api.apply({previewId:stale.previewId,confirm:true}),{code:'STALE_REVISION'});
 const endpoint=f.api.preview([assign('Parent','child')]);f.replace({...f.state(),ontologyDescriptions:{...f.state().ontologyDescriptions,Parent:'New wording'}});
 await assert.rejects(f.api.apply({previewId:endpoint.previewId,confirm:true}),{code:'STALE_REVISION'});
});
test('queue cancellation, expiry and disposal refuse before save; durable acceptance remains truthful after unload',async()=>{
 for(const event of ['cancel','expire','dispose']){
  const f=fixture(),review=f.api.preview([assign('New')]);let cancelled=false;
  f.host.beforeSave=()=>{if(event==='cancel')cancelled=true;if(event==='expire')f.advance(300001);if(event==='dispose')f.api.dispose();};
  await assert.rejects(f.api.apply({previewId:review.previewId,confirm:true,isCancelled:()=>cancelled}),{code:event==='cancel'?'CANCELLED':event==='expire'?'STALE_REVISION':'API_UNAVAILABLE'});assert.equal(f.writes(),0);
 }
 const f=fixture(),review=f.api.preview([assign('New')]);f.host.refreshPending=true;f.host.afterSave=()=>f.api.dispose();
 assert.deepEqual(await f.api.apply({previewId:review.previewId,confirm:true}),{state:'saved',refreshPending:true,verified:false,configurationRevision:null,readbackScope:'reviewed-endpoints',readback:null});assert.equal(f.writes(),1);
});
test('storage failure consumes a plan, while expiry/capacity and wire budgets are finite',async()=>{
 const f=fixture(),review=f.api.preview([assign('New')]);f.host.saveError=Error('Disk denied');await assert.rejects(f.api.apply({previewId:review.previewId,confirm:true}),{code:'WRITE_FAILED'});assert.equal(f.writes(),0);
 await assert.rejects(f.api.apply({previewId:review.previewId,confirm:true}),{code:'STALE_REVISION'});
 const old=f.api.preview([assign('New')]);for(let i=0;i<16;i++)f.api.preview([assign('New'+i)]);await assert.rejects(f.api.apply({previewId:old.previewId,confirm:true}),{code:'STALE_REVISION'});
 assert.throws(()=>f.api.preview(Array.from({length:129},(_,i)=>assign('N'+i))),{code:'LIMIT_EXCEEDED'});
 assert.equal(f.api.preview([{kind:'describe',field:'Parent',description:'x'.repeat(1001)}]).state,'conflict');
 assert.equal(f.api.preview([assign('Bad',{value:'role'})]).state,'conflict');
 const expired=f.api.preview([assign('New')]);f.advance(300001);await assert.rejects(f.api.apply({previewId:expired.previewId,confirm:true}),{code:'STALE_REVISION'});
 f.api.dispose();assert.equal(f.api.port,null);assert.equal(f.api.plans.size,0);assert.throws(()=>f.api.preview([assign('New')]),{code:'API_UNAVAILABLE'});
});
test('more than 400 configured fields survive bounded consolidation batches and prototype-like exact names',()=>{
 const source={...initial(),hierarchy:hierarchy({parents:Array.from({length:450},(_,i)=>'Field '+i)}),ontologyDescriptions:{}};
 const edits=Array.from({length:128},(_,i)=>({kind:'describe',field:'Field '+i,description:'Alternative '+i}));const plan=M.prepareOntologyBatch(source,edits);
 assert.equal(plan.after.length,450);assert.equal(plan.output.ontologyDescriptions['Field 127'],'Alternative 127');assert.equal(plan.output.hierarchy.parents.length,450);
 const special=M.prepareOntologyBatch(source,[assign('__proto__'),{kind:'describe',field:'__proto__',description:'Literal physical key'}]);assert.equal(Object.hasOwn(special.output.ontologyDescriptions,'__proto__'),true);assert.equal(special.after.find(v=>v.name==='__proto__').description,'Literal physical key');
});

test('saved readback is scoped to reviewed endpoints and cannot lose durable status when unrelated vocabulary grows',async()=>{
 const f=fixture(),review=f.api.preview([{kind:'describe',field:'Parent',description:'Updated ancestor'}]);
 const saved=await f.api.apply({previewId:review.previewId,confirm:true});assert.equal(saved.verified,true);assert.equal(saved.readbackScope,'reviewed-endpoints');assert.deepEqual(saved.readback.map(field=>field.name),['Parent']);
 const publicApi=new M.PublicApi({ontologyConfiguration:f.api,revisions:()=>({semantic:1,source:1,configuration:1}),configuration:{}});
 const oversized=publicApi.previewOntologyConfiguration({edits:[{kind:'describe',field:'Child',description:'Updated descendant'}]}).value;
 f.host.afterSave=()=>f.replace({...f.state(),hierarchy:{...f.state().hierarchy,leftFriends:Array.from({length:8193},(_,i)=>'Unrelated '+i)}});
 const envelope=await publicApi.applyOntologyConfiguration({previewId:oversized.previewId,confirm:true});assert.equal(envelope.ok,true);
 const accepted=envelope.value;assert.equal(accepted.state,'saved');assert.equal(accepted.verified,false);assert.equal(accepted.readback,null);assert.equal(accepted.readbackScope,'reviewed-endpoints');assert.equal(f.state().ontologyDescriptions.Child,'Updated descendant');assert.equal(f.writes(),2);
});

test('configuration and intent budgets stop before tail getters and preserve cross-realm plain requests',()=>{
 const source=initial(),dictionary=Object.fromEntries(Array.from({length:8192},(_,i)=>['Description '+i,'Literal wording']));let getterCalls=0;
 Object.defineProperty(dictionary,'tail',{enumerable:true,get(){getterCalls++;throw Error('Unbounded description tail read');}});
 assert.throws(()=>M.captureOntologyBatchInput({...source,ontologyDescriptions:dictionary}),error=>error.issue==='limit');assert.equal(getterCalls,0);
 const accessor={};Object.defineProperty(accessor,'Parent',{enumerable:true,get(){getterCalls++;throw Error('Description accessor executed');}});
 assert.throws(()=>M.captureOntologyBatchInput({...source,ontologyDescriptions:accessor}),error=>error.issue==='malformed');assert.equal(getterCalls,0);
 const edit=assign('New');Object.defineProperty(edit,'unknown',{enumerable:true,get(){getterCalls++;throw Error('Unknown edit member executed');}});
 assert.throws(()=>M.validateOntologyBatchEdits([edit]),error=>error.issue==='malformed');assert.equal(getterCalls,0);
 const dynamic={kind:'remove'};Object.defineProperty(dynamic,'field',{enumerable:true,get(){getterCalls++;return 'Parent';}});
 assert.throws(()=>M.validateOntologyBatchEdits([dynamic]),error=>error.issue==='malformed');assert.equal(getterCalls,0);
 const foreign=runInNewContext('[{kind:"describe",field:"Parent",description:"Popout wording"}]');
 assert.equal(M.prepareOntologyBatch(source,foreign).output.ontologyDescriptions.Parent,'Popout wording');
});

test('exact public preview budget is checked before retaining a token or evicting usable reviews',()=>{
 const f=fixture(),kept=f.api.preview([assign('New')]);assert.equal(kept.state,'ready');const sequence=f.api.sequence;
 f.replace({...f.state(),hierarchy:hierarchy({parents:Array.from({length:3000},(_,i)=>'Field '+i)})});
 assert.throws(()=>f.api.preview([{kind:'describe',field:'Field 0',description:'Updated'}]),{code:'LIMIT_EXCEEDED'});
 assert.equal(f.api.plans.size,1);assert(f.api.plans.has(kept.previewId));assert.equal(f.api.sequence,sequence);
 const publicApi=new M.PublicApi({ontologyConfiguration:f.api,revisions:()=>({semantic:1,source:1,configuration:1}),configuration:{}});
 assert.equal(publicApi.previewOntologyConfiguration({edits:[assign('Added')]}).error.code,'LIMIT_EXCEEDED');assert.equal(f.api.plans.size,1);
});
