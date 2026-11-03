/** Existing source-posting projection: no parser, acquisition, inventory or persistent writer exists. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
const compiled=await build({entryPoints:['src/adapters/obsidian/ontologyUsage.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {readOntologyUsage}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));

/** Selected-source test port repeats native freshness checks and rejects poisoned family callbacks. */
function fixture(){
 const files=new Map(),sources=new Map(),queries=[];
 const put=(id,path,fields,options={})=>{const file={path,basename:path.split('/').at(-1).replace(/\.md$/,''),extension:'md',stat:{mtime:2,size:20}};files.set(path,file);sources.set(id,{head:{physical:{path,mtime:options.mtime??2,size:20}},fields,...options});return file;};
 const repository={async querySources(kind,key,consume,current){queries.push([kind,key]);assert(current());await consume([...sources.keys()]);return true;},
 async readSelected(id,matches,work,current){const source=sources.get(id);if(matches(source)!=='ready')return {outcome:'stale'};let failed=false;const value=await work({...source,async visit(family,consume){assert.equal(family,'metadata');if(source.invalid){failed=true;return 'invalid-frame';}await consume(source.fields.map(normalizedFieldName=>({kind:'field-name',normalizedFieldName})));return 'ready';}});return current()&&!failed&&matches(source)==='ready'?{outcome:'ready',value,stamp:source}:{outcome:'stale'};}};
 return {files,sources,queries,put,repository,read:(field,current=()=>true)=>readOntologyUsage(repository,field,path=>files.get(path)??null,current)};
}

test('lookup uses existing normalized physical-field postings, deduplicating sources without merging partners',async()=>{
 const f=fixture();f.put('opaque-owner-A','Two/Same.md',['builds-on']);f.put('opaque-owner-B','One/Same.md',['builds-on','builds-on']);f.put('opaque-partner','Other.md',['quoted-in']);
 const result=await f.read('Builds on');assert.deepEqual(f.queries,[['field','builds-on']]);assert.deepEqual(result,{documents:[{path:'One/Same.md',name:'Same'},{path:'Two/Same.md',name:'Same'}],partial:false});
});

test('unassigned scalar/inline metadata names work without a semantic relationship or GraphPage',async()=>{
 const f=fixture();f.put('id-unrelated-to-path','Notes/Context.md',['erroneous-property']);assert.equal((await f.read('Erroneous Property')).documents[0].path,'Notes/Context.md');
});

test('existing native usage keeps its prior large-family compatibility; only the public pager opts into extra budgets',async()=>{
 const f=fixture();f.put('large','Large.md',[...Array.from({length:8200},(_,i)=>'other-'+i),'field']);
 const result=await f.read('field');assert.equal(result.partial,false);assert.equal(result.documents[0].path,'Large.md');
});

test('stale, deleted and invalid metadata families are omitted with truthful partial coverage',async()=>{
 const f=fixture();f.put('stale','Old.md',['field'],{mtime:1});f.put('deleted','Gone.md',['field']);f.files.delete('Gone.md');f.put('bad','Bad.md',['field'],{invalid:true});f.put('good','Good.md',['field']);
 assert.deepEqual(await f.read('field'),{documents:[{path:'Good.md',name:'Good'}],partial:true});
});

test('lookup cancellation and incomplete postings never become complete empty proof',async()=>{
 const f=fixture();f.put('a','A.md',['field']);let live=true;f.repository.querySources=async(kind,key,consume)=>{await consume(['a']);live=false;return false;};assert.deepEqual(await f.read('field',()=>live),{documents:[],partial:true});
 const empty=fixture();empty.repository.querySources=async()=>false;assert.deepEqual(await empty.read('field'),{documents:[],partial:true});
});

test('a rename/change after one result but before lookup completion cannot escape the final native fence',async()=>{
 const f=fixture(),file=f.put('a','A.md',['field']);f.repository.querySources=async(kind,key,consume)=>{await consume(['a']);file.stat.mtime++;return true;};assert.deepEqual(await f.read('field'),{documents:[],partial:true});
});
