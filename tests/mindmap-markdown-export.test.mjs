/**
 * Real Mindmap Builder Markdown-import round trips, finite native-output guards and
 * committed-scene capture. The upstream importer is pinned/unmodified; EA action doubles
 * observe its actual tree/link construction without inventing a second Markdown parser.
 */
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {createHash} from 'node:crypto';
const dir=mkdtempSync(join(tmpdir(),'kplex-markdown-export-'));
process.on('exit',/** All generated compatibility artifacts are owned by this one suite. */()=>rmSync(dir,{recursive:true,force:true}));
const require=createRequire(import.meta.url);
await build({stdin:{resolveDir:process.cwd(),contents:`export * from './src/core/plex/export/mindMapMarkdown'; export * from './src/ui/export/captureMindMapMarkdown'; export * from './src/adapters/obsidian/markdownExportFile';`},bundle:true,platform:'node',format:'cjs',outfile:join(dir,'exports.cjs'),plugins:[{name:'native-path-only',setup(builder){builder.onResolve({filter:/^obsidian$/},()=>({path:'obsidian',namespace:'native'}));builder.onLoad({filter:/.*/,namespace:'native'},()=>({contents:'exports.normalizePath=value=>value;',loader:'js'}));}}]});
const api=require(join(dir,'exports.cjs'));
await build({entryPoints:['tests/fixtures/mindmap-builder/markdownImport.js'],bundle:true,platform:'node',format:'cjs',outfile:join(dir,'builder.cjs'),plugins:[{name:'unused-native-paste',setup(builder){builder.onResolve({filter:/branchClipboard|branchPaste/},args=>({path:args.path,namespace:'paste'}));builder.onLoad({filter:/.*/,namespace:'paste'},()=>({contents:'export const parseBranchClipboard=()=>null;export const createBranchPaste=()=>({pasteBranch(){},cancelBranchPaste(){},disposeBranchPaste(){},isBranchPasteBusy(){return false},watchPasteMetadata(){}});',loader:'js'}));}}]});
const {createMarkdownImport}=require(join(dir,'builder.cjs'));

/** Supply exactly the native drawing operations used by the real importer; record its outputs. */
async function importBuilder(markdown){
 const nodes=[],arrows=[],elements=new Map();let selected=null;
 const ea={clear(){},getElements:()=>[...elements.values()],getViewElements:()=>[...elements.values()],getElement:id=>elements.get(id),
  addAppendUpdateCustomData(id,data){Object.assign(elements.get(id).customData,data)},
  connectObjects(source,_start,target){const id='edge'+arrows.length,edge={id,type:'arrow',source,target,customData:{}};arrows.push(edge);elements.set(id,edge);return id}};
 const context={ea,isViewSet:()=>true,getMindmapNodeFromSelection:()=>selected,t:key=>key,Notice:class{setMessage(){}setAutoHide(){}},currentModalGrowthMode:'Right',
  async addNode(text,_commit,_root,_all,parent,_unused,ontology){const node={id:'node'+nodes.length,text,parent:parent?.id,ontology,customData:{},x:0,y:0,width:100,height:30};nodes.push(node);elements.set(node.id,node);return node},
  getHierarchy(node){let root=node;while(root.parent)root=elements.get(root.parent);return{rootId:root.id}},
  addUpdateArrowLabel(edge,label){edge.label=label},async addElementsToView(){},selectNodeInView(node){selected=node},async triggerGlobalLayout(){}};
 const originalSleep=Object.getOwnPropertyDescriptor(globalThis,'sleep');
 globalThis.sleep=async()=>{};
 try{await createMarkdownImport(context).importTextToMap(markdown)}finally{if(originalSleep)Object.defineProperty(globalThis,'sleep',originalSleep);else delete globalThis.sleep}
 return{nodes,arrows};
}
/** Plain detached occurrence data deliberately has no graph/source capabilities. */
function row(id,parent,extra={}){return{id,parent,identity:id,text:`[[${id}.md|${id}]]`,label:id,x:parent?100:0,y:0,side:1,reference:false,expanded:true,canExpand:false,partial:false,...extra}}
/** Freeze the same small export contract consumed by native callers. */
function snapshot(nodes,extra={}){return{root:'root',nodes,links:[],omitted:0,limited:false,...extra}}

test('pinned importer fixture retains the actual upstream bytes',()=>{
 const hash=createHash('sha256').update(readFileSync('tests/fixtures/mindmap-builder/markdownImport.js')).digest('hex');
 assert(readFileSync('tests/fixtures/mindmap-builder/README.md','utf8').includes(hash));
});

test('whole hierarchy and visual balanced order round-trip through the real Builder importer',async()=>{
 const input=snapshot([row('root'),row('left','root',{side:-1,y:-100}),row('right2','root',{y:100}),row('right1','root',{y:-100}),row('deep','right1',{y:20,annotation:'Related projects'})]);
 const result=api.exportMindMapMarkdown(input), imported=await importBuilder(result.markdown);
 assert.deepEqual(imported.nodes.map(node=>node.text),['[[root.md|root]]','[[right1.md|right1]]','[[deep.md|deep]]','[[right2.md|right2]]','[[left.md|left]]']);
 assert.deepEqual(imported.nodes.map(node=>node.parent),[undefined,'node0','node1','node0','node0']);
 assert.equal(imported.nodes[2].ontology,'Related projects');assert.equal(result.nodes,5);
});

test('root-only, collapsed branches and selected subtree retain exact labels without extra nodes',async()=>{
 const input=snapshot([row('root'),row('closed','root',{expanded:false,canExpand:true}),row('hidden','closed')]);
 const result=api.exportMindMapMarkdown(input);assert(!result.markdown.includes('hidden'));assert.equal(result.warnings.collapsed,1);
 const leaf=api.exportMindMapMarkdown(input,'closed');assert.equal(leaf.markdown,'- [[closed.md|closed]]\n');
 assert.deepEqual((await importBuilder(leaf.markdown)).nodes.map(node=>node.text),['[[closed.md|closed]]']);
 assert.equal((await importBuilder(api.exportMindMapMarkdown(snapshot([row('root')])).markdown)).nodes[0].text,'[[root.md|root]]');
});

test('repeated occurrences stay independent while ancestor cycles and crosslinks restore as actual Builder crosslinks',async()=>{
 const input=snapshot([row('root'),row('a','root',{identity:'same'}),row('repeat','root',{identity:'same',text:'[[a.md|a again]]',y:20}),row('cycle','a',{identity:'root',reference:true,expanded:false})],{links:[{source:'a',target:'repeat',label:'See also'}]});
 const result=api.exportMindMapMarkdown(input), imported=await importBuilder(result.markdown);
 assert.equal(result.nodes,3);assert.equal(result.warnings.references,1);assert.equal(imported.nodes.length,3);
 assert.deepEqual(imported.arrows.map(edge=>[edge.source,edge.target,edge.label]),[['node1','node0',null],['node1','node2','See also']]);
 assert(imported.arrows.every(edge=>edge.strokeStyle==='dashed'));
 assert.equal(api.exportMindMapMarkdown(input).markdown,result.markdown,'Serialization must be deterministic');
 const self=api.exportMindMapMarkdown(snapshot([row('root'),row('self','root',{identity:'root',reference:true,expanded:false})]));
 assert.equal(self.nodes,1);assert.equal(self.warnings.omitted,1);assert.equal((await importBuilder(self.markdown)).nodes[0].text,'[[root.md|root]]');
});

test('Builder metadata-like text, deep/wide limits and malformed hierarchy are handled without mutation',async()=>{
 const root=row('root',undefined,{text:'[[Root.md|title:: data #boundary ^12345678]]'});
 const input=snapshot([root,row('a','root',{text:'[[a.md|line\nbreak]]',unresolved:true,partial:true})],{omitted:1,limited:true});
 const before=JSON.stringify(input),result=api.exportMindMapMarkdown(input),imported=await importBuilder(result.markdown);
 assert.equal(imported.nodes[0].ontology,null);assert.equal(imported.nodes.length,2);assert.equal(result.warnings.adjusted,2);assert.equal(result.warnings.unresolved,1);assert.equal(result.warnings.partial,2);assert.equal(result.warnings.omitted,1);assert.equal(JSON.stringify(input),before);
 assert.throws(()=>api.exportMindMapMarkdown(snapshot([row('root','a'),row('a','root')])));
 assert.throws(()=>api.exportMindMapMarkdown(snapshot([row('root'),row('root')])));
 assert.throws(()=>api.exportMindMapMarkdown(snapshot(Array.from({length:2049},(_,i)=>row(i?'n'+i:'root',i?'root':undefined)))));
 const deep=[row('root')];for(let i=1;i<=20;i++)deep.push(row('deep'+i,i===1?'root':'deep'+(i-1)));
 assert.equal((await importBuilder(api.exportMindMapMarkdown(snapshot(deep)).markdown)).nodes.length,21);
 const wide=[row('root'),...Array.from({length:256},(_,i)=>row('wide'+i,'root',{y:i}))];
 assert.equal((await importBuilder(api.exportMindMapMarkdown(snapshot(wide)).markdown)).nodes.length,257);
});

test('capture uses only admitted scene data and cached native link formatting, including offscreen rows',()=>{
 const file={path:'Folder/A.md'},rootFile={path:'Root.md'},files=new Map([[file.path,file],[rootFile.path,rootFile]]);
 const app={vault:{getFileByPath:path=>files.get(path)??null},metadataCache:{fileToLinktext:file=>file.path}};
 const node=(id,file,parent)=>({occurrenceId:id,page:{path:file.path,file},label:id,x:100,y:9999,branch:{parent,side:1,reference:false,expanded:true,canExpand:false,status:'ready'}});
 const scene={nodes:[node('root',rootFile),node('a',file,'root'),node('filtered',file,'root')],edges:[],projection:{root:'root',truncated:false}};
 const captured=api.captureMindMapMarkdown(app,scene,new Set(['root','a']));
 assert.equal(captured.nodes.length,2);assert.equal(captured.nodes[1].text,'[[Folder/A.md|a]]');assert.equal(captured.nodes[1].y,9999);
 assert(!api.exportMindMapMarkdown(captured).markdown.includes('filtered'));
 scene.nodes[1].label='Alpha & Beta:: [details]';
 const special=api.exportMindMapMarkdown(api.captureMindMapMarkdown(app,scene,new Set(['root','a'])));
 assert(special.markdown.includes('Alpha & Beta&#58;&#58; &#91;details&#93;'));assert.equal(special.warnings.adjusted,1);
 scene.nodes[1].page.file.path='Unsafe:: target.md';
 const unsafe=api.exportMindMapMarkdown(api.captureMindMapMarkdown(app,scene,new Set(['root','a'])));
 assert.equal(unsafe.warnings.unresolved,1);
});

test('native artifact handoff validates filenames and performs no Vault note writes',async()=>{
 const calls=[],adapter={async exportTextFile(text,filename){assert.equal(this,adapter);calls.push([text,filename])}};
 const app={vault:{adapter}};
 for(const name of ['../a','/a','a/b','a\\b','a:bad'])assert.equal(api.markdownExportFilename(name),null);
 assert.equal(api.markdownExportFilename('My map'),'My map.md');assert.equal(api.canExportMarkdownFile(app),true);
 await api.exportMarkdownFile(app,'My map.md','export',()=>true);assert.deepEqual(calls,[['export','My map.md']]);
 await assert.rejects(api.exportMarkdownFile(app,'My map.md','stale',()=>false));
 await assert.rejects(api.exportMarkdownFile(app,'../a.md','bad',()=>true));
 assert.equal(api.canExportMarkdownFile({vault:{adapter:{}}}),false);
 await assert.rejects(api.exportMarkdownFile({vault:{adapter:{}}},'Map.md','bytes',()=>true));
 assert.equal(calls.length,1);
});
