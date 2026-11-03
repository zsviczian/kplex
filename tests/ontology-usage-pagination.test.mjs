/** Resume actual bounded posting and authenticated metadata readers, including empty/partial
 * pages and publication retirement. These fixtures cannot read Markdown, repair sources or write. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {createHash,randomUUID} from 'node:crypto';
const compiled=await build({stdin:{resolveDir:process.cwd(),contents:`export * from './src/adapters/obsidian/ontologyUsagePager';export * from './src/index/SourceRepository';export * from './src/application/PublicApi';`},bundle:true,write:false,format:'esm',platform:'node'});
const M=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));

/** An existing posting contains 450 physical documents, each with more than400 property names. */
function fixture(total=450){
 let revision=1,now=0,alive=true,reads=0,pages=0;
 const files=new Map(Array.from({length:total},(_,i)=>{const path=`Notes/${i}.md`;return [path,{path,basename:String(i),extension:'md',stat:{mtime:1,size:20}}]}));
 const repository={async *sourcePostingPages(kind,key,current){assert.equal(kind,'field');assert.equal(key,'scalar');for(let start=0;start<total;start+=128){assert(current());pages++;yield {ids:Array.from({length:Math.min(128,total-start)},(_,i)=>String(start+i)),scanned:Math.min(128,total-start),exhausted:start+128>=total,complete:start+128>=total,validate:async()=>true};}if(!total)yield {ids:[],scanned:0,exhausted:true,complete:true,validate:async()=>true};},
 async readSelected(id,matches,work,current){reads++;const head={physical:{path:`Notes/${id}.md`,mtime:1,size:20}};if(matches({head})!=='ready')return {outcome:'stale'};const value=await work({head,async visit(family,consume){assert.equal(family,'metadata');const records=Array.from({length:450},(_,i)=>({kind:'field-name',normalizedFieldName:i===449?'scalar':`field-${i}`}));return await consume(records)?'ready':'cancelled';}});return current()&&matches({head})==='ready'?{outcome:'ready',value}:{outcome:'stale'};}};
 const pager=new M.OntologyUsagePager({repository,fileForPath:path=>files.get(path)??null,revision:()=>String(revision),current:()=>alive,now:()=>now,uniqueId:randomUUID});
 return {pager,repository,files,counters:()=>({reads,pages}),rev:()=>revision++,tick:ms=>now+=ms,retire:()=>alive=false};
}

test('450 documents/450 names traverse all pages once; each call has bounded selected work and detached IDs',async()=>{
 const f=fixture(),seen=[];let cursor;
 do{const before=f.counters();const result=await f.pager.read({field:'Scalar',limit:7,cursor},()=>true);seen.push(...result.documents.map(x=>x.sourceId));assert(result.documents.every(x=>x.path===`Notes/${x.sourceId}.md`));assert(f.counters().reads-before.reads<=16);assert(result.scanned<=512);assert.equal(result.wholeVaultComplete,false);assert.equal(result.partial,true);cursor=result.cursor??undefined;if(!cursor){assert(result.exhausted);assert(result.postingComplete);}}while(cursor);
 assert.equal(new Set(seen).size,450);assert.equal(seen.length,450);assert.equal(f.counters().reads,450);assert.equal(f.counters().pages,4);f.pager.dispose();
});

test('stale/deleted documents yield partial empty continuation pages without losing a later tail',async()=>{
 const f=fixture(35);for(let i=0;i<33;i++)f.files.delete(`Notes/${i}.md`);
 const a=await f.pager.read({field:'Scalar'},()=>true);assert.equal(a.documents.length,0);assert(a.cursor);assert(!a.exhausted);
 const b=await f.pager.read({field:'Scalar',cursor:a.cursor},()=>true);assert.equal(b.documents.length,0);assert(b.cursor);
 const c=await f.pager.read({field:'Scalar',cursor:b.cursor},()=>true);assert.deepEqual(c.documents.map(d=>d.sourceId),['33','34']);assert(c.exhausted);assert.equal(c.postingComplete,false);f.pager.dispose();
});

test('empty exhausted posting is never a whole-vault negative; expired/replayed/changed tokens refuse',async()=>{
 const empty=fixture(0);const result=await empty.pager.read({field:'Scalar'},()=>true);assert(result.exhausted);assert(result.postingComplete);assert.equal(result.wholeVaultComplete,false);
 for(const change of ['replay','revision','field','expiry']){
  const f=fixture(30),first=await f.pager.read({field:'Scalar',limit:1},()=>true);assert(first.cursor);
  if(change==='replay')await f.pager.read({field:'Scalar',cursor:first.cursor},()=>true);
  if(change==='revision')f.rev();if(change==='expiry')f.tick(120001);
  await assert.rejects(f.pager.read({field:change==='field'?'Other':'Scalar',cursor:first.cursor},()=>true),e=>e.code==='STALE_REVISION');f.pager.dispose();
 }
});

test('source changes/cancellation during metadata awaits reject; retired handles release ports',async()=>{
 const f=fixture(30),read=f.repository.readSelected;f.repository.readSelected=async(...args)=>{const value=await read(...args);f.rev();return value;};
 await assert.rejects(f.pager.read({field:'Scalar'},()=>true),e=>e.code==='STALE_REVISION');
 f.pager.dispose();await assert.rejects(f.pager.read({field:'Scalar'},()=>true),e=>e.code==='API_UNAVAILABLE');
});

test('actual repository overlay traversal bounds empty work and authenticates scalar facts without storage',async()=>{
 const runtime={now:()=>0,yield:async()=>{},digest:async value=>createHash('sha256').update(value).digest('hex'),uniqueId:randomUUID,schedule:()=>0,cancel:()=>{}};
 const repository=new M.NeutralSourceRepository({open:async()=>null,failed:()=>assert.fail('No writes')},runtime);
 try{
  for(let i=0;i<3;i++){
   const meta=async emit=>{for(let j=0;j<450;j++)if(!await emit({kind:'field-name',fieldName:`Field${j}`,normalizedFieldName:`field${j}`,surface:'frontmatter'}))return false;return true;};
   const result=await repository.replace({sourceId:`opaque-${i}`,physical:{identity:`file-${i}`,path:`${i}.md`,mtime:1,size:20},observation:{epoch:'session',revision:1,environment:await runtime.digest('host')},expected:{kind:'missing'},families:{values:async()=>true,'body-urls':async()=>true,metadata:meta,resolution:async()=>true}});
   assert.equal(result.reason,'storage-unavailable');
  }
  const pages=[];for await(const page of repository.sourcePostingPages('field','not-present',()=>true)){pages.push(page);assert(page.scanned<=128);}
  assert(pages.length>3);assert(pages.every(page=>!page.ids.length));assert.equal(pages.at(-1).complete,false);
  const found=[];for await(const page of repository.sourcePostingPages('field','field449',()=>true))found.push(...page.ids);
  assert.deepEqual(found,['opaque-0','opaque-1','opaque-2']);
 }finally{repository.close();}
});

test('public async reads advertise effects and preserve passive graph/GraphQL and cancellation envelopes',async()=>{
 let revision=1,inspections=0;
 const ports={revisions:()=>({semantic:1,source:revision,configuration:1}),ontologyDocuments:async()=>({documents:[],truncated:false}),inspectOntologyOccurrences:async()=>{inspections++;return {complete:true,truncated:false};},graph:{coverage:()=>({scope:'cached',complete:false,pending:false})},graphql:()=>({data:{passive:true}})};
 const api=new M.PublicApi(ports);
 assert(api.capabilities().value.operations.includes('ontologyDocuments'));assert(api.capabilities().value.operations.includes('inspectOntologyOccurrences'));
 assert(api.query({query:'{status{phase}}'}).ok);assert.equal(inspections,0);
 assert.equal((await api.ontologyDocuments({field:'Scalar',requireComplete:true})).error.code,'INDEX_INCOMPLETE');
 assert((await api.inspectOntologyOccurrences({path:'One.md',fields:['Scalar'],requireComplete:true})).ok);
 assert.equal((await api.inspectOntologyOccurrences({path:'One.md',fields:['Scalar'],isCancelled:()=>true})).error.code,'CANCELLED');
 ports.inspectOntologyOccurrences=async()=>{revision++;return {complete:true,truncated:false};};
 assert.equal((await api.inspectOntologyOccurrences({path:'One.md',fields:['Scalar']})).error.code,'STALE_REVISION');
 ports.inspectOntologyOccurrences=async()=>{api.dispose();return {complete:true,truncated:false};};
 assert.equal((await api.inspectOntologyOccurrences({path:'One.md',fields:['Scalar']})).error.code,'API_UNAVAILABLE');
});
