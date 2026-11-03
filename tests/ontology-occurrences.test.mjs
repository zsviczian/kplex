/** Original-text inspection contracts: canonical grammar, selected native reads and finite lifetimes. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),yaml=require('js-yaml');
const compiled=await build({entryPoints:['src/adapters/obsidian/ontologyOccurrences.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {createOntologyOccurrenceInspector}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const parserBuild=await build({entryPoints:['src/core/parser/metadata.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const parser=await import('data:text/javascript;base64,'+Buffer.from(parserBuild.outputFiles[0].text).toString('base64'));

/** Model the supported host frontmatter boundary; YAML grammar itself is decoded by js-yaml. */
function frontmatter(text){
 const lines=text.split('\n');
 if(lines[0].trim()!=='---')return {exists:false,frontmatter:''};
 let end=1;while(end<lines.length&&!['---','...'].includes(lines[end].trim()))end++;
 return end<lines.length?{exists:true,frontmatter:lines.slice(1,end).join('\n')}:{exists:false,frontmatter:''};
}

/** Track only the requested physical source; every await can inject a genuine lifetime mutation. */
function fixture(initial,{read,digest,yieldTask,dirty}={}){
 let text=initial,file={path:'Selected.md',extension:'md',stat:{mtime:5,size:Buffer.byteLength(initial)}};
 let reads=0,parses=0,digests=0,yields=0,lookups=0,now=0;
 const ports={fileForPath(path){lookups++;return file?.path===path?file:null;},
  async readFile(selected){reads++;assert.equal(selected,file);await read?.(f);return text;},
  hasUnsavedBuffer(path,saved){assert.equal(path,'Selected.md');assert.equal(saved,text);return dirty?.(f)??false;},
  getFrontmatter:frontmatter,parseYaml(raw){parses++;return yaml.load(raw);},
  runtime:{now:()=>++now,async yield(){yields++;await yieldTask?.(f);},async digest(raw){digests++;await digest?.(f);return createHash('sha256').update(raw).digest('hex');}}};
 const inspector=createOntologyOccurrenceInspector(ports);
 const f={ports,inspector,read:(fields=['Parent'],options={},current=()=>true)=>inspector.inspect({path:'Selected.md',fields,...options},current),
  setText(next,changeStat=true){text=next;if(changeStat&&file){file.stat.mtime++;file.stat.size=Buffer.byteLength(next);}},
  rename(path){file.path=path;},remove(){file=null;},
  counters:()=>({reads,parses,digests,yields,lookups})};return f;
}

/** Errors must remain finite public machine failures without returning a partial stale source. */
async function rejectsCode(operation,code){await assert.rejects(operation,error=>error.code===code);}

test('nested formatting exposing a list marker keeps existing worker/cooperative field identity',async()=>{
 const text='(**- Parent**:: [[A]])\r\n**- Parent**:: [[B]]',projected=[];
 const result=await parser.parseBodyMetadataCooperativeCore(text,{now:()=>0,yield:async()=>{},shouldContinue:()=>true,onFieldKey:key=>projected.push(key)});
 assert.deepEqual(result,parser.parseBodyMetadataCore(text));
 assert.deepEqual(projected.map(key=>key.name),['Parent','Parent']);
 for(const key of projected)assert.equal(text.slice(key.keyRange.start,key.keyRange.end),'Parent');
});

test('native YAML scalar object types are not mistaken for physical top-level property mappings',async()=>{
 for(const yaml of ['2026-11-03','!!binary aGVsbG8=']){
  const result=await fixture('---\n'+yaml+'\n---\n').read(['0','Field']);
  assert.equal(result.complete,false);assert.equal(result.unsupported[0].reason,'non-mapping-yaml');assert.deepEqual(result.occurrences,[]);
 }
});

test('on-demand canonical sink reports original CRLF/BOM/Unicode key tokens without changing legacy metadata',async()=>{
 const text='\ufeffIntro 😀\r\n- **Parent** :: [[A]]\r\nprose ( __Pärent__ :: [[B]]) [Friend:: 7] (Parent:: [[A]])\r\nChild:: [[C]]';
 const projected=[];
 const parsed=await parser.parseBodyMetadataCooperativeCore(text,{now:()=>0,yield:async()=>{},shouldContinue:()=>true,onFieldKey:key=>projected.push(key)});
 assert.deepEqual(parsed,parser.parseBodyMetadataCore(text));
 assert.deepEqual(projected.map(x=>[x.name,x.syntax]),[['Parent','line'],['Pärent','parenthesized'],['Friend','bracketed'],['Parent','parenthesized'],['Child','line']]);
 for(const key of projected){assert.equal(text.slice(key.keyRange.start,key.keyRange.end),key.name);assert.equal(key.keyRange.end-key.keyRange.start,key.name.length);}
 assert.equal(projected[0].keyRange.start,text.indexOf('Parent'));
 assert.equal(projected[0].line,2);assert.equal(projected[0].column,4);
 assert.notEqual(projected[0].keyRange.start,parsed.inlineFieldOccurrences[0].start);
});

test('selected inspection preserves repeated normalized spelling variants and never exposes values or text',async()=>{
 const text='Builds on:: [[One]]\r\nprose (builds-on:: [[One]]) [BUILDS ON:: 12]\r\n';
 const f=fixture(text),result=await f.read(['Builds on']);
 assert.equal(result.occurrences.length,3);assert(result.complete);assert(!result.truncated);
 assert.deepEqual(result.occurrences.map(x=>x.name),['Builds on','builds-on','BUILDS ON']);
 for(const x of result.occurrences)assert.equal(text.slice(x.keyRange.start,x.keyRange.end),x.name);
 assert.equal(JSON.stringify(result).includes('[[One]]'),false);
 assert.equal('text'in result,false);assert.equal('value'in result.occurrences[0],false);
 assert.equal(result.snapshot.id,createHash('sha256').update(text).digest('hex'));
 assert.equal(f.counters().reads,1);assert.equal(f.counters().digests,1);
});

test('canonical code/comment exclusions and empty-value grammar remain authoritative',async()=>{
 const text=['<!-- (Parent:: hidden) -->','`[Parent:: inline]`','```md','Parent:: fenced','```','Parent::','prose (Parent:: actual) [Parent:: repeat]'].join('\r\n');
 const result=await fixture(text).read();
 assert.deepEqual(result.occurrences.map(x=>x.syntax),['parenthesized','bracketed']);
 assert(result.complete);
});

test('YAML scalar/list/quoted physical keys get truthful exact logical locators and no replacement offsets',async()=>{
 const text='---\r\nParent: 12\r\n"Friend Name": [one, two]\r\n"builds-on": null\r\n---\r\n(Parent:: body)';
 const f=fixture(text),result=await f.read(['parent','Friend Name','builds-on']);
 assert.equal(f.counters().reads,1);assert.equal(f.counters().parses,1);
 assert.deepEqual(result.occurrences.slice(0,3).map(x=>({name:x.name,keyRange:x.keyRange,yamlKey:x.yamlKey,line:x.line})),[
  {name:'Parent',keyRange:null,yamlKey:'Parent',line:null},{name:'Friend Name',keyRange:null,yamlKey:'Friend Name',line:null},{name:'builds-on',keyRange:null,yamlKey:'builds-on',line:null}]);
 assert.equal(result.occurrences.at(-1).syntax,'parenthesized');assert(result.complete);
 assert(!JSON.stringify(result).includes('two'));
});

test('malformed/duplicate/non-mapping YAML are unsupported rather than silently complete',async()=>{
 for(const [yamlText,reason]of [['Parent: [broken','invalid-yaml'],['Parent: one\nParent: two','invalid-yaml'],['- Parent','non-mapping-yaml']]){
  const result=await fixture(`---\n${yamlText}\n---\nParent:: body`).read();
  assert.deepEqual(result.unsupported,[{surface:'frontmatter',reason}]);assert.equal(result.complete,false);
  assert.equal(result.occurrences.length,1);assert.equal(result.occurrences[0].syntax,'line');
 }
 const missing=await fixture('---\nParent: one').read();assert.equal(missing.complete,false);assert.equal(missing.unsupported[0].reason,'invalid-yaml');
});

test('YAML aliases, merge keys and complex keys never fabricate authored property locators',async()=>{
 for(const raw of ['defaults: &base {Parent: one}\n<<: *base','? [Parent, Child]\n: one','Parent: *source']){
  const result=await fixture(`---\n${raw}\n---\nParent:: body`).read();
  assert.equal(result.complete,false);assert.equal(result.unsupported[0].reason,'yaml-indirection');
  assert(result.occurrences.every(x=>x.syntax!=='frontmatter'));
 }
});

test('400-plus requested identities share one selected read and parser pass, including non-link values',async()=>{
 const fields=Array.from({length:450},(_,i)=>`Field ${i}`),text=fields.map((field,i)=>`${field}:: ${i}`).join('\r\n');
 const f=fixture(text),result=await f.read(fields,{limit:500});
 assert.equal(result.occurrences.length,450);assert.equal(result.complete,true);assert.equal(f.counters().reads,1);
 assert.equal(f.counters().parses,0);for(const key of result.occurrences)assert.equal(text.slice(key.keyRange.start,key.keyRange.end),key.name);
});

test('inspection-only parsing retains no value/URL payload or prototype-sensitive field maps',async()=>{
 const seen=[],result=await parser.parseBodyMetadataCooperativeCore('__proto__:: https://example.com\nconstructor:: value',{
  now:()=>0,yield:async()=>{},shouldContinue:()=>true,retainMetadata:false,onFieldKey:key=>seen.push(key)});
 assert.deepEqual(result,{inlineFields:{},inlineFieldOccurrences:[],urls:[]});assert.deepEqual(seen.map(x=>x.name),['proto','constructor']);
});

test('a finite result cap reports its omitted tail and never certifies a truncated source',async()=>{
 const text=Array(7).fill('(Parent:: repeat)').join('\n'),result=await fixture(text).read(['parent'],{limit:3});
 assert.equal(result.occurrences.length,3);assert.equal(result.truncated,true);assert.equal(result.complete,false);
 const exact=await fixture('(Parent:: one)\n(Parent:: two)').read(['parent'],{limit:2});
 assert.equal(exact.occurrences.length,2);assert.equal(exact.complete,true);assert.equal(exact.truncated,false);
});

test('YAML consumes the same bounded result page as body fields',async()=>{
 const text='---\nParent: one\nFriend: two\n---\nParent:: body';
 const result=await fixture(text).read(['parent','friend'],{limit:2});
 assert.equal(result.occurrences.length,2);assert.equal(result.truncated,true);assert.equal(result.complete,false);
});

test('invalid requests and oversized advertised sources reject before any selected read',async()=>{
 for(const request of [{fields:[]},{fields:Array(513).fill('parent')},{fields:[' ']},{fields:['x'.repeat(513)]},{limit:0},{limit:1025},{path:'../Selected.md'},{path:'/Selected.md'},{path:'C:\\Selected.md'},{expectedSnapshot:'not-a-hash'}]){
  const f=fixture('Parent:: value');await rejectsCode(f.read(['parent'],request),'INVALID_ARGUMENT');assert.equal(f.counters().reads,0);
 }
 const f=fixture('x'.repeat(1_048_577));await rejectsCode(f.read(),'LIMIT_EXCEEDED');assert.equal(f.counters().reads,0);
});

test('decoded-size and YAML budgets reject or disclose unsupported work without unbounded parsing',async()=>{
 const f=fixture('Parent:: value',{read:owner=>owner.setText('😀'.repeat(300_000),false)});
 await rejectsCode(f.read(),'LIMIT_EXCEEDED');assert.equal(f.counters().digests,0);
 const yamlText='---\nParent: '+ 'x'.repeat(65_536)+'\n---\nParent:: body';
 const g=fixture(yamlText),result=await g.read();assert.equal(g.counters().parses,0);
 assert.equal(result.unsupported[0].reason,'yaml-limit');assert.equal(result.complete,false);assert.equal(result.occurrences.length,1);
});

test('same-stat saved-content edits are detected by expectedSnapshot, not inferred from mtime/size',async()=>{
 const f=fixture('Parent:: one'),review=await f.read();f.setText('Parent:: two',false);
 await rejectsCode(f.read(['parent'],{expectedSnapshot:review.snapshot.id}),'STALE_REVISION');
});

test('rename/delete/stat changes after read or digest reject instead of returning stale locations',async()=>{
 for(const operation of [f=>f.rename('Renamed.md'),f=>f.remove(),f=>f.setText('Parent:: changed')]){
  const f=fixture('Parent:: one',{read:operation});await rejectsCode(f.read(),'STALE_REVISION');assert.equal(f.counters().digests,0);
  const g=fixture('Parent:: one',{digest:operation});await rejectsCode(g.read(),'STALE_REVISION');
 }
});

test('cancellation before work and during cooperative parsing cannot return partial stale success',async()=>{
 const f=fixture('Parent:: one');await rejectsCode(f.read(['parent'],{},()=>false),'CANCELLED');assert.equal(f.counters().reads,0);
 let live=true;const g=fixture('prose '.repeat(10_000)+'\nParent:: one',{yieldTask:()=>{live=false;}});
 await rejectsCode(g.read(['parent'],{},()=>live),'CANCELLED');assert(g.counters().yields>0);
});

test('dirty or ambiguous live editors reject and a changed editor after parsing is fenced',async()=>{
 const f=fixture('Parent:: one',{dirty:()=>true});await rejectsCode(f.read(),'UNAVAILABLE');assert.equal(f.counters().digests,0);
 let checks=0;const g=fixture('Parent:: one',{dirty:()=>++checks>1});await rejectsCode(g.read(),'STALE_REVISION');
});

test('the single inspection slot rejects concurrent work and disposal retires retained handles',async()=>{
 let release;const pending=new Promise(resolve=>release=resolve),f=fixture('Parent:: one',{read:()=>pending});
 const first=f.read();await rejectsCode(f.read(),'LIMIT_EXCEEDED');f.inspector.dispose();release();
 await rejectsCode(first,'API_UNAVAILABLE');await rejectsCode(f.read(),'API_UNAVAILABLE');assert.equal(f.counters().reads,1);
});

test('comments intersecting a key never receive a fabricated editable token',async()=>{
 const result=await fixture('Par<!--masked-->ent:: one').read(['Par             ent']);
 // The canonical mask is spaces; selecting its normalized identity remains possible, but not a write span.
 assert.equal(result.occurrences.length,1);assert.equal(result.occurrences[0].keyRange,null);
 assert.deepEqual(result.unsupported,[{surface:'body',reason:'masked-key'}]);assert.equal(result.complete,false);
});
