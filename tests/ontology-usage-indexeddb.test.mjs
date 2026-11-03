/** Real native IndexedDB posting continuations; memory fallbacks cannot establish durable
 * lookup ordering, cross-page deduplication, old-revision masks or selected-reader budgets. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {browserBundle,chromiumHarness} from './support/browserTypeScript.mjs';
const bundle=await browserBundle(['src/index/IndexedDbCache.ts','src/index/SourceRepository.ts','src/adapters/obsidian/ontologyUsagePager.ts'],{obsidian:'exports.Platform={isMobile:false,isIosApp:false};'});
test('real Chromium: durable field pages resume raw lookup keys without skipped/duplicated tails', {timeout:120000},async()=>{
 const browser=await chromiumHarness(bundle);
 try{
  const result=await browser.evaluate(`(async()=>{
   const cache=new sourceModules.KplexIndexedDbCache('ontology-pagination-'+crypto.randomUUID());await cache.open();
   const repository=cache.sources,check=(value,message)=>{if(!value)throw Error(message)};
   try{
    for(let i=0;i<135;i++){
     const sourceId='opaque-'+String(i).padStart(3,'0');
     const input={sourceId,physical:{identity:sourceId,path:i+'.md',mtime:1,size:20},observation:{epoch:'test',revision:1,environment:await repository.observationDigest('host')},expected:{kind:'missing'},
      families:{values:async()=>true,'body-urls':async()=>true,resolution:async()=>true,metadata:async emit=>{
       if(!await emit({kind:'field-name',fieldName:'Scalar',normalizedFieldName:'scalar',surface:'frontmatter'}))return false;
       return emit({kind:'field-name',fieldName:'Scalar',normalizedFieldName:'scalar',surface:'inline'});
      }}};
     const written=await repository.replace(input);check(written.outcome==='activated','durable source write: '+JSON.stringify(written));
    }
    const ids=[],pages=[];
    for await(const page of repository.sourcePostingPages('field','scalar',()=>true)){
     check(page.scanned<=128,'raw scan bound');pages.push(page);ids.push(...page.ids);
    }
    check(ids.length===135&&new Set(ids).size===135,'no skip or duplicate across raw posting pages');
    check(pages.length>=3&&pages.at(-1).complete,'posting exhausted with storage authority');
    let callback=false;
    const refused=await repository.readSelected('opaque-000',()=>{callback=true;return 'ready'},async()=>true,()=>true,{family:'metadata',records:1,bytes:1048576,chunks:128});
    check(refused.outcome!=='ready'&&refused.reason==='decode-budget'&&!callback,'manifest budget refuses before selected callbacks');
    const selected=await repository.readSelected('opaque-000',()=> 'ready',async reader=>{let count=0;const reason=await reader.visit('metadata',records=>{count+=records.length;return true});return {count,reason};},()=>true,{family:'metadata',records:8192,bytes:1048576,chunks:128});
    check(selected.outcome==='ready'&&selected.value.count===2&&selected.value.reason==='ready','bounded authentic metadata read');
    return {documents:ids.length,pages:pages.length,budgetRefusal:true};
   }finally{cache.close();}
  })()`);
  assert.equal(result.documents,135);assert(result.pages>=3);assert(result.budgetRefusal);
 }finally{await browser.cleanup();}
});

test('real Chromium: internal durable/overlay fences reject mutations during metadata awaits and pending-only tails', {timeout:120000},async()=>{
 const browser=await chromiumHarness(bundle);
 try{
  const result=await browser.evaluate(`(async()=>{
   const cache=new sourceModules.KplexIndexedDbCache('ontology-page-fence-'+crypto.randomUUID());await cache.open();
   const repository=cache.sources,other=new sourceModules.NeutralSourceRepository({open:()=>cache.open(),failed:()=>{throw Error('Unexpected source storage failure')}});
   const files=new Map(),check=(value,message)=>{if(!value)throw Error(message)};
   const write=async(owner,id)=>{
    const path=id+'.md';files.set(path,{path,basename:id,extension:'md',stat:{mtime:1,size:20}});
    const result=await owner.replace({sourceId:id,physical:{identity:id,path,mtime:1,size:20},observation:{epoch:'test',revision:1,environment:await owner.observationDigest('host')},expected:{kind:'missing'},families:{values:async()=>true,'body-urls':async()=>true,resolution:async()=>true,metadata:async emit=>emit({kind:'field-name',fieldName:'Scalar',normalizedFieldName:'scalar',surface:'frontmatter'})}});
    check(result.outcome==='activated','Real source activation failed');
   };
   const create=()=>new sourceModules.OntologyUsagePager({repository,fileForPath:path=>files.get(path)??null,revision:()=> 'unchanged-public-coordinate',current:()=>true,now:()=>Date.now(),uniqueId:()=>crypto.randomUUID()});
   let pager;
   try{
    for(let i=1;i<=32;i++)await write(repository,'opaque-'+String(i).padStart(3,'0'));
    const original=repository.readSelected.bind(repository);let selected=0,inject=true;
    repository.readSelected=async(...args)=>{selected++;const value=await original(...args);if(inject){inject=false;await write(other,'opaque-000');}return value;};
    pager=create();let rejected=false;
    try{await pager.read({field:'Scalar',limit:1},()=>true)}catch(error){rejected=error.code==='STALE_REVISION'}
    check(rejected&&selected===1,'A source inserted before the cursor during metadata work escaped the durable fence');pager.dispose();
    pager=create();const first=await pager.read({field:'Scalar',limit:1},()=>true);check(first.cursor&&first.documents.length===1,'Expected retained pending disk tail');
    const before=selected;await write(other,'opaque-000-before');rejected=false;
    try{await pager.read({field:'Scalar',limit:1,cursor:first.cursor},()=>true)}catch(error){rejected=error.code==='STALE_REVISION'}
    check(rejected&&selected===before,'Pending-only continuation read selected data before detecting another owner durable activation');pager.dispose();
    pager=create();const next=await pager.read({field:'Scalar',limit:1},()=>true);await write(repository,'opaque-000-own');rejected=false;
    try{await pager.read({field:'Scalar',limit:1,cursor:next.cursor},()=>true)}catch(error){rejected=error.code==='STALE_REVISION'}
    check(rejected,'In-process source activation failed to retire the pending tail');
    return {midAwait:true,pendingTail:true,ownActivation:true,selected};
   }finally{pager?.dispose();other.close();cache.close();}
  })()`);
  assert.equal(result.midAwait,true);assert.equal(result.pendingTail,true);assert.equal(result.ownActivation,true);
 }finally{await browser.cleanup();}
});
