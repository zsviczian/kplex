/** Execute the guide's exact reviewed migration helpers over production occurrence inspection.
 * Native storage/frontmatter boundaries are finite disposable doubles; Markdown grammar remains
 * the canonical K-Plex implementation and YAML decoding uses the installed supported grammar. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {webcrypto,createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),yaml=require('js-yaml');
const guide=readFileSync('docs/ONTOLOGY_CONSOLIDATION.md','utf8');

/** Load only explicitly marked executable examples, keeping tested instructions identical to documentation. */
function example(name){
 const marker=`<!-- tested-example: ${name} -->`,start=guide.indexOf(marker);
 assert(start>=0,`Missing maintained recipe block ${name}`);
 const open=guide.indexOf('```js',start)+5,end=guide.indexOf('```',open);
 assert(open>=5&&end>open,`Invalid recipe block ${name}`);return guide.slice(open,end);
}
const helpers=new Function('crypto',example('body-plan')+'\n'+example('yaml-plan')+'\n'+example('guarded-writes')+'\nreturn {sourceDigest,prepareBodyPlan,applyYamlRenames,assertNoOpenMarkdown,writeReviewedYaml,writeReviewedBody};')(webcrypto);
const bundle=await build({entryPoints:['src/adapters/obsidian/ontologyOccurrences.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {createOntologyOccurrenceInspector}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));

/** Supply host frontmatter extraction for these known CRLF fixtures, not another body-field parser. */
function frontmatter(text){
 if(!text.startsWith('---\r\n'))return {exists:false,frontmatter:''};
 const end=text.indexOf('\r\n---\r\n',5);
 return end<0?{exists:false,frontmatter:''}:{exists:true,frontmatter:text.slice(5,end)};
}

/** One synthetic selected file owns source/settings effects; never enumerate or touch a real vault. */
function fixture(initial){
 let text=initial,reads=0,bodyWrites=0,yamlWrites=0,open=false,embedded=false,exclusive=true,beforeProcess=null;
 const file={path:'__ontology_consolidation_example__/Source.md',extension:'md',stat:{mtime:1,size:Buffer.byteLength(initial)}};
 const app={workspace:{getLeavesOfType:()=>open?[{view:{file}}]:[]},vault:{
  getFileByPath:path=>path===file.path?file:null,
  async read(selected){assert.equal(selected,file);reads++;return text;},
  async process(selected,callback){assert.equal(selected,file);await beforeProcess?.();const result=callback(text);bodyWrites++;setText(result);return result;},
 },fileManager:{async processFrontMatter(selected,callback){assert.equal(selected,file);const info=frontmatter(text),fm=yaml.load(info.frontmatter)||{};callback(fm);yamlWrites++;const end=text.indexOf('\r\n---\r\n',5);setText('---\r\n'+yaml.dump(fm,{lineWidth:-1}).replaceAll('\n','\r\n')+'---\r\n'+text.slice(end+7));}}};
 /** Simulate the native source identity change after each completed file phase. */
 function setText(next){text=next;file.stat.mtime++;file.stat.size=Buffer.byteLength(next);}
 const inspector=createOntologyOccurrenceInspector({fileForPath:app.vault.getFileByPath,readFile:app.vault.read,
  hasUnsavedBuffer:()=>open,getFrontmatter:frontmatter,parseYaml:raw=>yaml.load(raw),
  runtime:{now:()=>0,yield:async()=>{},digest:async raw=>createHash('sha256').update(raw).digest('hex')}});
 return {app,file,inspector,text:()=>text,parsedYaml:()=>yaml.load(frontmatter(text).frontmatter),setText,
  inspect:(fields=['Cites old','Cites','Cited by'])=>inspector.inspect({path:file.path,fields,limit:1024},()=>true),
  ownership:(path,selected)=>exclusive&&!embedded&&selected===file&&path===file.path,setEmbedded:value=>embedded=value,setExclusive:value=>exclusive=value, counters:()=>({reads,bodyWrites,yamlWrites}),setOpen:value=>open=value,setBeforeProcess:value=>beforeProcess=value};
}

const original='---\r\n"Cites old": ["[[One]]", "[[Two]]"]\r\nUnrelated: 7\r\nKeep: true\r\n---\r\nIntro 😀 stays exact.\r\n- **Cites old** :: [[One]]\r\nText (Cites old:: [[Two]]) [Cites old:: 8]\r\n`Cites old:: unchanged code`\r\n';
const mapping=[{from:'Cites old',to:'Cites'}];

test('documented recipe uses canonical physical ranges and preserves unrelated CRLF/Unicode/body bytes',async()=>{
 const f=fixture(original),inspection=await f.inspect();
 assert.equal(inspection.occurrences.length,4);assert.equal(inspection.occurrences[0].keyRange,null);
 const plan=await helpers.prepareBodyPlan(original,inspection,mapping);
 assert.equal(plan.edits.length,3);for(const edit of plan.edits)assert.equal(original.slice(edit.start,edit.end),'Cites old');
 assert(plan.after.includes('Intro 😀 stays exact.\r\n'));assert(plan.after.includes('- **Cites** :: [[One]]'));
 assert(plan.after.includes('(Cites:: [[Two]]) [Cites:: 8]'));assert(plan.after.includes('`Cites old:: unchanged code`'));
 assert.equal(plan.after.split('\r\n').length,original.split('\r\n').length);assert(plan.after.startsWith(original.slice(0,original.indexOf('Intro'))));
 const receipt=await helpers.writeReviewedBody(f.app,f.file,plan,f.ownership);assert.equal(receipt.state,'saved');assert.equal(receipt.changes,3);assert.equal(receipt.snapshot,await helpers.sourceDigest(f.text()));assert.equal(f.counters().bodyWrites,1);
});

test('documented CLI YAML review runs without resolving the Obsidian module or writing source',async()=>{
 const f=fixture(original),AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
 const evaluate=new AsyncFunction('app','window','sourceDigest','require',example('yaml-review')+'\nreturn {reviewedYaml,sourceSnapshot:inspected.value.snapshot.id};');
 const result=await evaluate(f.app,{kplexApi:{v1:{inspectOntologyOccurrences:async request=>({ok:true,value:await f.inspector.inspect(request,()=>true)})}}},helpers.sourceDigest,()=>{throw Error('Plain CLI cannot resolve Obsidian modules');});
 assert.deepEqual(result.reviewedYaml,f.parsedYaml());assert.equal(result.sourceSnapshot,await helpers.sourceDigest(original));assert.equal(f.counters().bodyWrites,0);assert.equal(f.counters().yamlWrites,0);
});

test('YAML collision and stale-value reviews fail before any mutation, including prototype-shaped keys',()=>{
 const fm={'Cites old':['one'],'Cites':['two'],Keep:7},before=structuredClone(fm);
 assert.throws(()=>helpers.applyYamlRenames(fm,before,mapping),/already exists/);assert.deepEqual(fm,before);
 assert.throws(()=>helpers.applyYamlRenames(fm,{...before,Keep:8},mapping),/Stale/);assert.deepEqual(fm,before);
 assert.throws(()=>helpers.applyYamlRenames({Old:new Date('2026-01-01')},{Old:'2026-01-01T00:00:00.000Z'},[{from:'Old',to:'New'}]),/Stale/);
 assert.throws(()=>helpers.applyYamlRenames({Old:NaN},{Old:null},[{from:'Old',to:'New'}]),/Stale/);
 const multi={'old A':1,'old B':2},snapshot=structuredClone(multi);
 assert.throws(()=>helpers.applyYamlRenames(multi,snapshot,[{from:'old A',to:'Canonical'},{from:'old B',to:'Canonical'}]),/collision/);assert.deepEqual(multi,snapshot);
 const literal=JSON.parse('{"__proto__":[1,2],"constructor":true,"Keep":7}');
 helpers.applyYamlRenames(literal,structuredClone(literal),[{from:'__proto__',to:'Canonical'}]);assert.deepEqual(literal.Canonical,[1,2]);assert.equal(literal.constructor,true);assert.equal(Object.getPrototypeOf(literal),Object.prototype);assert(!Object.hasOwn(literal,'__proto__'));
});

test('YAML review stops before large tails, never invokes accessors and rejects cycles/unsupported types',()=>{
 let getterReads=0;
 const accessor={};Object.defineProperty(accessor,'Old',{enumerable:true,get(){getterReads++;return 'hidden';}});
 assert.throws(()=>helpers.applyYamlRenames(accessor,accessor,[{from:'Old',to:'New'}]),/accessors/);assert.equal(getterReads,0);
 const huge=Object.create(null);for(let index=0;index<20000;index++)Object.defineProperty(huge,'field'+index,{enumerable:true,configurable:true,writable:true,value:index});
 Object.defineProperty(huge,'tail',{enumerable:true,get(){getterReads++;throw Error('Tail should not be visited');}});
 assert.throws(()=>helpers.applyYamlRenames(huge,huge,[]),/budget/);assert.equal(getterReads,0);
 const sparse=Array(20000);Object.defineProperty(sparse,19999,{enumerable:true,get(){getterReads++;return 1;}});
 assert.throws(()=>helpers.applyYamlRenames({Old:sparse},{Old:sparse},[]),/budget/);assert.equal(getterReads,0);
 const cyclic={};cyclic.self=cyclic;assert.throws(()=>helpers.applyYamlRenames(cyclic,cyclic,[]),/cyclic/);
 assert.throws(()=>helpers.applyYamlRenames({Old:new Map()},{Old:new Map()},[]),/Unsupported/);
 assert.throws(()=>helpers.applyYamlRenames({Old:()=>1},{Old:()=>1},[]),/Unsupported/);
});

test('interrupted YAML/body phases resume by reinspection and a second pass is idempotent',async()=>{
 const f=fixture(original),initial=await f.inspect(),obsoletePlan=await helpers.prepareBodyPlan(f.text(),initial,mapping),receipts=[];
 const reviewed=structuredClone(f.parsedYaml()),backup=f.text();
 await helpers.writeReviewedYaml(f.app,f.file,reviewed,mapping,f.ownership);receipts.push({phase:'yaml',snapshot:await helpers.sourceDigest(f.text())});
 assert.equal(f.text().slice(f.text().indexOf('Intro')),original.slice(original.indexOf('Intro')),'YAML phase must preserve every body byte');
 assert.deepEqual(f.parsedYaml().Cites,['[[One]]','[[Two]]']);assert.equal(f.parsedYaml().Unrelated,7);assert.equal(f.parsedYaml().Keep,true);
 assert.equal(f.parsedYaml()['Cites old'],undefined);assert.notEqual(f.text(),backup);
 // An interruption here leaves a durable YAML receipt and untouched old body declarations.
 await assert.rejects(()=>helpers.writeReviewedBody(f.app,f.file,obsoletePlan,f.ownership),/Stale source/);assert.equal(f.counters().bodyWrites,0);
 const fresh=await f.inspect(),plan=await helpers.prepareBodyPlan(f.text(),fresh,mapping);
 assert.notEqual(fresh.snapshot.id,initial.snapshot.id);assert.notEqual(plan.edits[0].start,obsoletePlan.edits[0].start);
 receipts.push({phase:'body',...await helpers.writeReviewedBody(f.app,f.file,plan,f.ownership)});assert.equal(receipts.length,2);
 assert(!f.text().includes('**Cites old**'));assert(f.text().includes('`Cites old:: unchanged code`'));
 const second=await f.inspect(),nextPlan=await helpers.prepareBodyPlan(f.text(),second,mapping);
 assert.equal(nextPlan.edits.length,0);assert.equal((await helpers.writeReviewedBody(f.app,f.file,nextPlan,f.ownership)).state,'unchanged');
 const values=structuredClone(f.parsedYaml());assert.deepEqual(helpers.applyYamlRenames(f.parsedYaml(),values,mapping),[]);
 assert.equal(f.counters().bodyWrites,1);assert.equal(f.counters().yamlWrites,1);
});

test('incomplete inspection, stale source, overlapping ranges and live editors prevent unsafe writes',async()=>{
 const f=fixture(original),inspection=await f.inspect();
 await assert.rejects(()=>helpers.prepareBodyPlan(original,{...inspection,complete:false},mapping),/Incomplete/);
 await assert.rejects(()=>helpers.prepareBodyPlan(original+'changed',inspection,mapping),/Stale/);
 const body=inspection.occurrences.filter(o=>o.keyRange);
 await assert.rejects(()=>helpers.prepareBodyPlan(original,{...inspection,occurrences:[...body,body[0]]},mapping),/Overlapping/);
 const plan=await helpers.prepareBodyPlan(original,inspection,mapping);
 f.setOpen(true);await assert.rejects(()=>helpers.writeReviewedBody(f.app,f.file,plan,f.ownership),/Defer/);assert.equal(f.counters().bodyWrites,0);
 f.setOpen(false);f.setBeforeProcess(()=>f.setText(original+'concurrent edit'));
 await assert.rejects(()=>helpers.writeReviewedBody(f.app,f.file,plan,f.ownership),/Stale/);assert.equal(f.counters().bodyWrites,0);assert(f.text().endsWith('concurrent edit'));
});

test('writer ownership prerequisite covers embedded editors absent from workspace leaves',async()=>{
 const f=fixture(original),inspection=await f.inspect(),plan=await helpers.prepareBodyPlan(original,inspection,mapping),reviewed=structuredClone(f.parsedYaml());
 await assert.rejects(()=>helpers.writeReviewedBody(f.app,f.file,plan),/ownership/);
 await assert.rejects(()=>helpers.writeReviewedYaml(f.app,f.file,reviewed,mapping),/ownership/);
 await assert.rejects(()=>helpers.writeReviewedBody(f.app,f.file,plan,async()=>true),/ownership/);
 f.setEmbedded(true);assert.deepEqual(f.app.workspace.getLeavesOfType('markdown'),[]);
 await assert.rejects(()=>helpers.writeReviewedBody(f.app,f.file,plan,f.ownership),/ownership/);
 await assert.rejects(()=>helpers.writeReviewedYaml(f.app,f.file,reviewed,mapping,f.ownership),/ownership/);
 f.setEmbedded(false);f.setBeforeProcess(()=>f.setEmbedded(true));
 await assert.rejects(()=>helpers.writeReviewedBody(f.app,f.file,plan,f.ownership),/ownership/);
 assert.equal(f.counters().bodyWrites,0);assert.equal(f.counters().yamlWrites,0);
});

test('unchanged body receipts require current identity, text and exclusive ownership without writes',async()=>{
 const f=fixture(original),inspection=await f.inspect(),plan=await helpers.prepareBodyPlan(original,inspection,[{from:'Absent',to:'Canonical'}]);
 assert.equal(plan.before,plan.after);assert.equal((await helpers.writeReviewedBody(f.app,f.file,plan,f.ownership)).state,'unchanged');
 f.setText(original+'\r\nCites old:: Reintroduced');await assert.rejects(()=>helpers.writeReviewedBody(f.app,f.file,plan,f.ownership),/Stale source/);
 f.setText(original);f.setExclusive(false);await assert.rejects(()=>helpers.writeReviewedBody(f.app,f.file,plan,f.ownership),/ownership/);
 f.setExclusive(true);const replacement={...f.file};await assert.rejects(()=>helpers.writeReviewedBody(f.app,replacement,plan,()=>true),/identity/);
 assert.equal(f.counters().bodyWrites,0);assert.equal(f.counters().yamlWrites,0);
});

test('root skill retains explicit authorization, coverage, canvas and timeout safeguards',()=>{
 const skill=readFileSync('skill.md','utf8');assert(skill.startsWith('---\nname: kplex-obsidian-cli\n'));
 const header=yaml.load(skill.slice(4,skill.indexOf('\n---',4)));assert.deepEqual(Object.keys(header),['name','description']);assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(header.name));assert(header.name.length<64);assert(header.description.length<=1024);assert(!/[<>]/.test(header.description));
 for(const required of ['vault info=path','whole-vault negative','AMBIGUOUS_CANVAS','scenePending','motionPending','read back','**does not authorize**','ontologyDocuments','inspectOntologyOccurrences','previewOntologyConfiguration','applyOntologyConfiguration'])assert(skill.includes(required),required);
 assert(!skill.includes('12%20Automation/'));assert(skill.includes('https://github.com/zsviczian/kplex/blob/2026-11-03-ontology-consolidation-api/docs/ONTOLOGY_CONSOLIDATION.md'));
});
