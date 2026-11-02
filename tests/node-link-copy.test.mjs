/** Copy uses the invoking clipboard and an explicit paste marker, never an active-note guess. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {build} from 'esbuild';
import {randomUUID} from 'node:crypto';
const bundled=await build({entryPoints:['src/adapters/obsidian/nodeLinkClipboard.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {NodeLinkClipboard}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));

/** Finite native boundary double: file identity and generator calls, never a competing link resolver. */
function fixture({rich=true}={}) {
  const files=new Map(),writes=[],notices=[],generated=[],inserted=[];
  const file={path:'one/Target.md'},destination={path:'notes/Destination.md'};files.set(file.path,file);files.set(destination.path,destination);
  const app={vault:{getFileByPath:path=>files.get(path)??null},fileManager:{generateMarkdownLink:(...args)=>{generated.push(args);return 'native:'+args[1];}}};
  class ClipboardItem {constructor(data){this.data=data;} static supports(type){return type==='text/html';}}
  const clipboard={writeText:text=>{writes.push({text});return Promise.resolve();},...(rich?{write:items=>{writes.push({items});return Promise.resolve();}}:{})};
  const document={defaultView:{navigator:{clipboard},ClipboardItem,Blob,crypto:{randomUUID}}};
  const service=new NodeLinkClipboard(app,key=>notices.push(key));
  const editor={replaceSelection:text=>inserted.push(text)};
  async function event(overrides={}) {
    const item=writes.at(-1),data=new Map(item.items?await Promise.all(Object.entries(item.items[0].data).map(async([key,value])=>[key,await value.text()])):[['text/plain',item.text]]);
    for(const [key,value] of Object.entries(overrides))data.set(key,value);
    return {defaultPrevented:false,clipboardData:{getData:key=>data.get(key)??''},preventDefault(){this.defaultPrevented=true;}};
  }
  return {service,app,files,writes,notices,generated,inserted,file,destination,document,editor,event};
}

/** Execute the actual graph copy handler without mounting an unrelated graph/index. */
function copyAction(dependencies) {
  const source=ts.createSourceFile('PlexGraph.tsx',readFileSync(new URL('../src/ui/PlexGraph.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);
  let expression;
  function visit(node) {if(ts.isPropertyAssignment(node)&&node.name.getText(source)==='"node.copy-link"')expression=node.initializer.arguments[0].getText(source);ts.forEachChild(node,visit);}
  visit(source);assert(expression);
  const code=ts.transpileModule(`const implementation=${expression}`,{compilerOptions:{target:ts.ScriptTarget.ES2021}}).outputText;
  return Function(...Object.keys(dependencies),code+';return implementation;')(...Object.values(dependencies));
}

test('graph Copy link delegates captured identity to its owning native clipboard service in the gesture turn',async()=>{
  const calls=[],page={path:'one/Target.md',file:{path:'one/Target.md'}},document={defaultView:{navigator:{clipboard:{writeText:text=>calls.push(['legacy',text])}}}};
  const plugin={nodeLinkClipboard:{copy:(target,doc,current)=>{calls.push([target,doc,current()]);return Promise.resolve();}},actionManager:{readSnapshot:()=>({mounted:true})}};
  const action=copyAction({plugin,viewport:{current:{ownerDocument:document,isConnected:true}},graphActionPage:()=>page,
    viewSession:undefined,viewLifetime:1,clipboardOwner:{}});
  const pending=action({});assert.deepEqual(calls,[[page,document,true]]);await pending;
});

test('copy once formats at each actual paste destination, including sections and attachment links',async()=>{
  for(const kind of ['file','section','attachment']) {
    const f=fixture();if(kind==='attachment')f.file.path='one/Picture.png';f.files.set(f.file.path,f.file);
    const page={path:f.file.path,file:f.file,...(kind==='section'?{transient:{kind:'section',sourcePath:f.file.path,subpath:'#Second'}}:{})};
    const pending=f.service.copy(page,f.document,()=>true);assert.equal(f.writes.length,1,'Write starts before returning');await pending;
    const other={path:'other/Destination.md'};f.files.set(other.path,other);
    for(const target of [f.destination,other]){const e=await f.event();f.service.paste(e,f.editor,{file:target});assert(e.defaultPrevented);}
    assert.deepEqual(f.generated,[[f.file,f.destination.path,kind==='section'?'#Second':undefined],[f.file,other.path,kind==='section'?'#Second':undefined]]);
    assert.deepEqual(f.inserted,['native:notes/Destination.md','native:other/Destination.md']);
  }
});

test('ordinary text, altered payloads, another receipt and already handled paste retain native ownership',async()=>{
  const f=fixture();await f.service.copy({path:f.file.path,file:f.file},f.document,()=>true);
  for(const overrides of [{'text/html':''},{'text/plain':'ordinary'},{'text/html':'<span data-kplex-node-link="00000000-0000-0000-0000-000000000000">same</span>'}]) {
    const e=await f.event(overrides);f.service.paste(e,f.editor,{file:f.destination});assert(!e.defaultPrevented);
  }
  const handled=await f.event();handled.defaultPrevented=true;f.service.paste(handled,f.editor,{file:f.destination});
  const unknown=await f.event();f.service.paste(unknown,f.editor,{file:null});assert(!unknown.defaultPrevented);
  assert.equal(f.generated.length,0);assert.equal(f.inserted.length,0);
});

for(const change of ['rename','delete','replace','view-teardown','plugin-teardown']) test('owned copy does not retarget after '+change,async()=>{
  const f=fixture();let current=true;await f.service.copy({path:f.file.path,file:f.file},f.document,()=>current);const e=await f.event();
  if(change==='rename')f.file.path='Renamed.md';if(change==='delete')f.files.delete(f.file.path);if(change==='replace')f.files.set(f.file.path,{path:f.file.path});
  if(change==='view-teardown')current=false;if(change==='plugin-teardown')f.service.dispose();
  f.service.paste(e,f.editor,{file:f.destination});assert.equal(f.inserted.length,0);assert.equal(f.generated.length,0);
  if(change!=='plugin-teardown'){assert(e.defaultPrevented);assert.deepEqual(f.notices,['copyLink.targetUnavailable']);}
});

test('plain clipboard fallback is explicit, full-path and never guessed from an active note',async()=>{
  const f=fixture({rich:false});await f.service.copy({path:f.file.path,file:f.file},f.document,()=>true);
  assert.deepEqual(f.writes,[{text:'[[one/Target.md]]'}]);assert.deepEqual(f.notices,['copyLink.fallback']);
  const e=await f.event();f.service.paste(e,f.editor,{file:f.destination});assert(!e.defaultPrevented);assert.equal(f.generated.length,0);
});

test('URLs, tags and unresolved links copy as text; folders and display groups are unavailable',async()=>{
  const f=fixture();for(const [page,text] of [[{path:'url:1',url:'https://example.com/a'},'https://example.com/a'],[{path:'tag:One/Two',isTag:true},'#One/Two'],[{path:'folder/Missing'},'[[folder/Missing]]']]){
    assert(f.service.canCopy(page,f.document));await f.service.copy(page,f.document,()=>true);assert.equal(f.writes.at(-1).text,text);
  }
  for(const page of [{path:'folder:/',isFolder:true},{path:'group:x',transient:{kind:'group'}}])assert(!f.service.canCopy(page,f.document));
  assert.equal(f.generated.length,0);
});

test('clipboard rejection reports failure without retaining paste authority or claiming fallback success',async()=>{
  const f=fixture();f.document.defaultView.navigator.clipboard.write=()=>Promise.reject(Error('denied'));
  await f.service.copy({path:f.file.path,file:f.file},f.document,()=>true);assert.deepEqual(f.notices,['copyLink.failed']);assert.equal(f.writes.length,0);
});

test('retired copy owners release captures without retiring a later copy from another mounted canvas',async()=>{
  const f=fixture(),a={},b={};await f.service.copy({path:f.file.path,file:f.file},f.document,()=>true,a);
  const old=await f.event();f.service.retireOwner(a);f.service.paste(old,f.editor,{file:f.destination});
  assert(old.defaultPrevented);assert.deepEqual(f.notices,['copyLink.targetUnavailable']);assert.equal(f.inserted.length,0);
  await f.service.copy({path:f.file.path,file:f.file},f.document,()=>true,b);const current=await f.event();
  f.service.retireOwner(a);f.service.paste(current,f.editor,{file:f.destination});assert.deepEqual(f.inserted,['native:notes/Destination.md']);
});

test('a pending native write cannot notify a retired view or plugin',async()=>{
  for(const retire of ['view','plugin']){
    const f=fixture(),owner={};let reject;f.document.defaultView.navigator.clipboard.write=()=>new Promise((_,failed)=>reject=failed);
    f.service.copy({path:f.file.path,file:f.file},f.document,()=>true,owner);
    if(retire==='view')f.service.retireOwner(owner);else f.service.dispose();reject(Error('late denial'));await Promise.resolve();await Promise.resolve();
    assert.deepEqual(f.notices,[]);
  }
});
