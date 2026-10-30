/** Real portable-package admission/planning behind the public configuration capability. The
 * finite host port observes writes and queued acceptance; no vault, graph or browser is supplied. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {plexViewModules} from './support/plexViewFixture.mjs';

const M = await plexViewModules(['src/application/PublicApiConfiguration.ts',
  'src/core/plex/sharing/transfer.ts', 'src/core/plex/sharing/authoring.ts',
  'src/core/plex/views/facets/templates.ts']);
const copy = value => structuredClone(value);
const lens = {id:'draft-lens',name:'Drafts',enabled:true,scope:'node',mode:'include',expression:'note.state == "draft"'};
const selection = (targetId='imported-lens', extra={}) => ({targetId,replace:false,lensIds:[],replacePalette:[],...extra});

/** The fake host delegates all import semantics to the actual canonical planner; only disk
 * acceptance/readback is controlled. A source or index capability is intentionally absent. */
function fixture(options={}) {
  let state = {presets:copy(M.FACET_TEMPLATES),lenses:[copy(lens)],palette:[]}, now=1000, revision=1, incomingEpoch=0;
  const work={reads:0,previews:0,writes:0,exports:0};
  const host={current:true,saveError:null,previewError:null,readError:null,afterSave:null,beforeSave:null};
  const port={
    read:()=>{work.reads++;if(host.readError)throw host.readError;return state;}, current:()=>host.current,now:()=>now,
    preview:plan=>{work.previews++;if(host.previewError)throw host.previewError;M.applyPortableImport(plan,state);},
    save:async(plan,current)=>{
      if(host.beforeSave)await host.beforeSave();
      if(!current())throw Error('Retired queued import');
      if(host.saveError)throw host.saveError;
      const applied=M.applyPortableImport(plan,state);
      state={presets:{...state.presets,...(applied.preset?{[plan.choices.targetId]:applied.preset}:{})},lenses:applied.lenses,palette:applied.palette};
      revision++;work.writes++;host.afterSave?.();return {refreshPending:options.refreshPending===true};
    },
    export:request=>{work.exports++;
      if(request.kind==='lens')return M.exportLensPackage(state.lenses.find(item=>item.id===request.id),state.palette,M.LENS_AUTHORING_CONTEXT,request.allowPrivate===true);
      const preset=state.presets[request.id];
      return M.exportFacetPackage(request.id,preset,{name:preset.name||request.id,labels:Object.fromEntries(preset.order.map(id=>[id,preset.categories[id].label||id])),helpMarkdown:preset.helpMarkdown??'',locale:'en'},state.palette,state.lenses,request.lensIds??[],M.FACETS_AUTHORING_CONTEXT,request.allowPrivate===true);
    },
    ...(options.fallback?{}:{revision:()=>revision}),
    ...(options.sessionId?{sessionId:options.sessionId}:{}),
    ...(options.capture?{capture:()=>{const opening=incomingEpoch;return ()=>opening===incomingEpoch;}}:{}),
  };
  const api=new M.PublicApiConfiguration(port);
  return {api,host,work,port,state:()=>state,replace:value=>{state=value;revision++;},advance:milliseconds=>{now+=milliseconds;},
    receive:value=>{state=value;revision++;incomingEpoch++;},
    package:()=>M.exportLensPackage(lens,[],M.LENS_AUTHORING_CONTEXT)};
}

test('configuration list pages each existing collection without exporting definitions or retaining live values',()=>{
  const f=fixture(),rows=Array.from({length:900},(_,index)=>({...lens,id:'lens-'+index,name:'Lens '+index}));
  Object.defineProperty(rows[700],'expression',{get(){throw Error('Off-page definition was read');}});
  f.replace({...f.state(),lenses:rows});
  const page=f.api.list({offset:200,limit:25});
  assert.equal(page.lenses.length,25);assert.equal(page.lenses[0].id,'lens-200');assert.equal(page.lenses[0].expression,undefined);
  assert.equal(page.totals.lenses,900);assert.equal(page.truncated,true);assert.equal(f.work.writes,0);
  page.lenses[0].name='Changed output';assert.equal(f.state().lenses[200].name,'Lens 200');
  for(const request of [{limit:0},{limit:201},{offset:-1},{offset:Infinity}])assert.throws(()=>f.api.list(request),{code:'INVALID_ARGUMENT'});
  f.api.dispose();assert.equal(f.api.port,null);assert.equal(f.api.observed,null);assert.equal(f.api.plans.size,0);
  assert.throws(()=>f.api.list(),{code:'API_UNAVAILABLE'});
});

test('injected revision is constant-time and validation uses the canonical package format without writes',()=>{
  const f=fixture(),before=f.work.reads;assert.equal(f.api.revision(),1);assert.equal(f.work.reads,before);
  assert.equal(f.api.validate(f.package()).status,'valid');assert.equal(f.api.validate('{').status,'invalid');
  assert.equal(f.api.validate({...f.package(),version:9}).status,'invalid');assert.equal(f.work.writes,0);
  const fallback=fixture({fallback:true});assert.equal(fallback.api.revision(),1);assert.equal(fallback.api.revision(),1);
  fallback.replace({...fallback.state(),lenses:[]});assert.equal(fallback.api.revision(),2);
  fallback.replace({...fallback.state(),lenses:Array(8193).fill(lens)});assert.throws(()=>fallback.api.revision(),{code:'LIMIT_EXCEEDED'});
});

test('exports reuse privacy/dependency admission and detach packages from installed values',()=>{
  const f=fixture(),pkg=f.api.export({kind:'lens',id:lens.id});assert.equal(pkg.lens.enabled,undefined);
  pkg.lens.expression='note.other == "changed"';assert.equal(f.state().lenses[0].expression,lens.expression);
  const facetId=Object.keys(f.state().presets)[0],facet=f.api.export({kind:'facets',id:facetId,lensIds:[lens.id]});
  assert.equal(facet.lenses.length,1);assert.equal(facet.lenses[0].enabled,undefined);
  assert.throws(()=>f.api.export({kind:'lens',id:'absent'}),{code:'NOT_FOUND'});
  assert.throws(()=>f.api.export({kind:'lens',id:lens.id,lensIds:[lens.id]}),{code:'INVALID_ARGUMENT'});
  f.replace({...f.state(),lenses:[{...lens,expression:'file.path == "Private.md"'}]});
  assert.throws(()=>f.api.export({kind:'lens',id:lens.id}),{code:'INVALID_ARGUMENT'});
  assert.equal(f.api.export({kind:'lens',id:lens.id,allowPrivate:true}).lens.expression,'file.path == "Private.md"');
  assert.equal(f.work.writes,0);
});

test('reviewed data is detached, confirmation is explicit, and a successful import starts disabled',async()=>{
  const f=fixture(),review=f.api.preview(f.package(),selection());
  assert.equal(f.work.writes,0);assert.equal(review.configurationRevision,1);
  review.package.lens.expression='note.injected == true';review.choices.targetId='tampered';
  await assert.rejects(f.api.apply({previewId:review.previewId,confirm:false}),{code:'CONFIRMATION_REQUIRED'});
  const receipt=await f.api.apply({previewId:review.previewId,confirm:true});
  assert.equal(receipt.state,'saved');assert.equal(receipt.verified,true);assert.equal(receipt.configurationRevision,2);
  assert.equal(receipt.targetId,'imported-lens');assert.equal(receipt.readback.expression,lens.expression);assert.equal(receipt.readback.enabled,false);
  receipt.readback.expression='Changed output';assert.equal(f.state().lenses.find(item=>item.id==='imported-lens').expression,lens.expression);
  assert.equal(f.work.writes,1);
  await assert.rejects(f.api.apply({previewId:review.previewId,confirm:true}),{code:'STALE_REVISION'});
});

test('exact target changes stale a preview while unrelated installed entries remain mergeable',async()=>{
  const f=fixture(),review=f.api.preview(f.package(),selection());
  f.replace({...f.state(),lenses:[...f.state().lenses,{...lens,id:'unrelated',name:'Preserved'}]});
  assert.equal((await f.api.apply({previewId:review.previewId,confirm:true})).verified,true);
  assert(f.state().lenses.some(item=>item.id==='unrelated'&&item.name==='Preserved'));
  const stale=f.api.preview(f.package(),selection('imported-lens',{replace:true}));
  f.replace({...f.state(),lenses:f.state().lenses.map(item=>item.id==='imported-lens'?{...item,name:'Received from sync'}:item)});
  const before=JSON.stringify(f.state()),writes=f.work.writes;
  await assert.rejects(f.api.apply({previewId:stale.previewId,confirm:true}),{code:'STALE_REVISION'});
  assert.equal(JSON.stringify(f.state()),before);assert.equal(f.work.writes,writes);
});

test('Facets, selected disabled dependencies and referenced palette changes share one canonical import',async()=>{
  const f=fixture(),id=Object.keys(f.state().presets)[0],pkg=f.api.export({kind:'facets',id});
  const dependency={...lens,id:'new-dependency'};delete dependency.enabled;pkg.lenses=[dependency];
  pkg.preset.categories[pkg.preset.order[0]].color={kind:'palette',id:'reviewed-color'};
  pkg.palette=[{id:'reviewed-color',name:'Reviewed',light:'#223344',dark:'#aabbcc'}];
  const review=f.api.preview(pkg,selection('imported-facets',{lensIds:['new-dependency']}));
  assert.equal(f.work.writes,0);const saved=await f.api.apply({previewId:review.previewId,confirm:true});
  assert.equal(f.work.writes,1);assert.equal(saved.verified,true);assert.deepEqual(saved.readback,pkg.preset);
  assert.equal(f.state().lenses.find(item=>item.id==='new-dependency').enabled,false);
  assert.equal(f.state().lenses.find(item=>item.id===lens.id).enabled,true);
  assert.deepEqual(f.state().palette,pkg.palette);assert(f.state().presets[id]);
});

test('canonical collisions, actual installed-capacity refusal and malformed choices never grant a token',()=>{
  const f=fixture();assert.throws(()=>f.api.preview(f.package(),selection(lens.id)),{code:'INVALID_ARGUMENT'});
  for(const choices of [selection('bad/identity'),selection('x',{replace:undefined}),selection('x',{lensIds:Array(17).fill('x')}),selection('x',{replacePalette:['same','same']})])
    assert.throws(()=>f.api.preview(f.package(),choices),{code:'INVALID_ARGUMENT'});
  f.host.previewError=new M.PortableSharingCapacityError();
  assert.throws(()=>f.api.preview(f.package(),selection()),{code:'INVALID_ARGUMENT'});
  assert.equal(f.api.plans.size,0);assert.equal(f.work.writes,0);
});

test('review capabilities expire, evict at a fixed bound and disappear when the owning API retires',async()=>{
  const f=fixture(),first=f.api.preview(f.package(),selection('first'));
  for(let index=0;index<16;index++)f.api.preview(f.package(),selection('next-'+index));
  assert.equal(f.api.plans.size,16);await assert.rejects(f.api.apply({previewId:first.previewId,confirm:true}),{code:'STALE_REVISION'});
  const last=f.api.preview(f.package(),selection('last'));f.advance(M.PUBLIC_CONFIGURATION_LIMITS.previewMilliseconds);
  await assert.rejects(f.api.apply({previewId:last.previewId,confirm:true}),{code:'STALE_REVISION'});
  f.api.preview(f.package(),selection('retired'));f.api.dispose();assert.equal(f.api.plans.size,0);assert.equal(f.api.port,null);
  assert.throws(()=>f.api.validate(f.package()),{code:'API_UNAVAILABLE'});assert.equal(f.work.writes,0);
});

test('reload-session token identities cannot select a newly reviewed unrelated package',async()=>{
  const old=fixture({sessionId:'old-session'}),next=fixture({sessionId:'next-session'});
  const retired=old.api.preview(old.package(),selection('old-target'));old.api.dispose();
  const fresh=next.api.preview(next.package(),selection('fresh-target'));
  assert.notEqual(retired.previewId,fresh.previewId);
  await assert.rejects(next.api.apply({previewId:retired.previewId,confirm:true}),{code:'STALE_REVISION'});
  assert.equal(next.work.writes,0);assert.equal((await next.api.apply({previewId:fresh.previewId,confirm:true})).targetId,'fresh-target');
});

test('a rejected queued save publishes nothing, consumes the review and requires another preview',async()=>{
  const f=fixture(),review=f.api.preview(f.package(),selection()),before=JSON.stringify(f.state());
  f.host.saveError=Error('Expected storage failure');
  await assert.rejects(f.api.apply({previewId:review.previewId,confirm:true}),{code:'WRITE_FAILED'});
  assert.equal(JSON.stringify(f.state()),before);assert.equal(f.work.writes,0);
  await assert.rejects(f.api.apply({previewId:review.previewId,confirm:true}),{code:'STALE_REVISION'});
  f.host.saveError=null;const retry=f.api.preview(f.package(),selection());
  assert.equal((await f.api.apply({previewId:retry.previewId,confirm:true})).verified,true);
});

test('expiry or target changes while the existing queue waits cannot apply an unreviewed package',async()=>{
  const f=fixture(),review=f.api.preview(f.package(),selection());let release;
  f.host.beforeSave=()=>new Promise(resolve=>{release=resolve;});
  const saved=f.api.apply({previewId:review.previewId,confirm:true});f.advance(M.PUBLIC_CONFIGURATION_LIMITS.previewMilliseconds);release();
  await assert.rejects(saved,{code:'WRITE_FAILED'});assert.equal(f.work.writes,0);
  const target=f.api.preview(f.package(),selection());
  const queued=f.api.apply({previewId:target.previewId,confirm:true});
  f.replace({...f.state(),lenses:[...f.state().lenses,{...lens,id:'imported-lens',name:'Late remote target'}]});release();
  await assert.rejects(queued,{code:'WRITE_FAILED'});assert.equal(f.work.writes,0);
});

test('incoming-settings and appearance epoch guards reject ABA both before apply and inside the queue',async()=>{
  const f=fixture({capture:true}),opening=copy(f.state()),review=f.api.preview(f.package(),selection());
  f.receive({...opening,lenses:[{...lens,name:'Received B'}]});f.receive(copy(opening));
  await assert.rejects(f.api.apply({previewId:review.previewId,confirm:true}),{code:'STALE_REVISION'});assert.equal(f.work.writes,0);
  const queued=f.api.preview(f.package(),selection());let release;f.host.beforeSave=()=>new Promise(resolve=>{release=resolve;});
  const result=f.api.apply({previewId:queued.previewId,confirm:true});f.receive({...opening,lenses:[]});f.receive(copy(opening));release();
  await assert.rejects(result,{code:'WRITE_FAILED'});assert.equal(f.work.writes,0);assert.deepEqual(f.state(),opening);
});

test('durable refresh-pending and later supersession have truthful saved receipts',async()=>{
  const f=fixture({refreshPending:true}),review=f.api.preview(f.package(),selection());
  const saved=await f.api.apply({previewId:review.previewId,confirm:true});assert.equal(saved.refreshPending,true);assert.equal(saved.verified,true);
  const second=f.api.preview(f.package(),selection('other'));
  f.host.afterSave=()=>f.replace({...f.state(),lenses:f.state().lenses.map(item=>item.id==='other'?{...item,name:'Newer received edit'}:item)});
  const superseded=await f.api.apply({previewId:second.previewId,confirm:true});assert.equal(superseded.state,'saved');assert.equal(superseded.verified,false);
  assert.equal(superseded.readback.name,'Newer received edit');
});

test('an already accepted durable operation reports saved after disposal without rereading retired host state',async()=>{
  const f=fixture(),review=f.api.preview(f.package(),selection());
  f.host.afterSave=()=>{f.api.dispose();f.host.current=false;};
  const before=f.work.reads,receipt=await f.api.apply({previewId:review.previewId,confirm:true});
  assert.equal(receipt.state,'saved');assert.equal(receipt.verified,false);assert.equal(receipt.readback,null);
  assert.equal(receipt.configurationRevision,null);
  assert.equal(f.work.writes,1);assert.equal(f.work.reads,before+1);assert.equal(f.api.port,null);
});

test('a failed readback after durable acceptance remains a saved unverified receipt',async()=>{
  const f=fixture(),review=f.api.preview(f.package(),selection());f.host.afterSave=()=>{f.host.readError=Error('Expected readback failure');};
  const saved=await f.api.apply({previewId:review.previewId,confirm:true});
  assert.equal(f.work.writes,1);assert.equal(saved.state,'saved');assert.equal(saved.verified,false);assert.equal(saved.configurationRevision,null);assert.equal(saved.readback,null);
});
