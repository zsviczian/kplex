/** Context-menu sources must explain the same inheritance and predicates as actual paint. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {runInNewContext} from 'node:vm';
const result=await build({stdin:{resolveDir:process.cwd(),contents:`export * from './src/index/style';export * from './src/ui/ElementStyleMenu';export * from './src/core/plex/lens';export * from './src/core/plex/predicate';export * from './src/lens/GraphLens';export * from './src/core/contracts/tagStyle';export {RelationType} from './src/types';`},bundle:true,write:false,platform:'node',format:'cjs'});
const module={exports:{}};runInNewContext(result.outputFiles[0].text,{module,exports:module.exports,console,URL});const m=module.exports;
const plain=value=>JSON.parse(JSON.stringify(value));
const settings=()=>({baseNodeStyle:{fontSize:12,backgroundColor:'#111'},centralNodeStyle:{fontSize:20},inferredNodeStyle:{textColor:'#888'},virtualNodeStyle:{strokeStyle:'dashed'},siblingNodeStyle:{fontSize:9},urlNodeStyle:{icon:'globe'},attachmentNodeStyle:{icon:'paperclip'},folderNodeStyle:{icon:'folder'},tagNodeStyle:{icon:'hash'},tagStyleList:['#work','#work/project','#other'],tagNodeStyles:{'#work':{prefix:'W ',backgroundColor:'#222'},'#work/project':{fontSize:18},'#other':{prefix:'O '}},displayAllStylePrefixes:false,centerEmbedHeight:300,centerEmbedWidth:400,baseLinkStyle:{strokeWidth:1,strokeColor:'#111'},inferredLinkStyle:{strokeStyle:'dashed'},folderLinkStyle:{strokeWidth:2},tagLinkStyle:{strokeColor:'#333'},hierarchyLinkStyles:{Parent:{strokeColor:'#444'},child:{strokeWidth:3}}});
const page=overrides=>({path:'A.md',file:{extension:'md'},url:null,isFolder:false,isTag:false,styleTags:['#work'],primaryStyleTag:'#work',noteType:null,...overrides});

test('node sources retain exact type/prefix precedence and folder/tag early inheritance',()=>{
 const s=settings(),p=page({noteType:'work/project'}),layers=m.nodeStyleLayers(p,null,'center',s);
 assert.deepEqual(plain(layers.flatMap(x=>x.sources)),[{kind:'standard',key:'baseNodeStyle'},{kind:'standard',key:'centralNodeStyle'},{kind:'tag',key:'#work'},{kind:'note-type',key:'#work'},{kind:'note-type',key:'#work/project'}]);
 assert.deepEqual(plain(m.resolveNodeStyle(p,null,'center',s)),{fontSize:18,backgroundColor:'#222',prefix:'W ',embedHeight:300,embedWidth:400});
 for(const kind of ['isFolder','isTag']){const p=page({[kind]:true});assert.deepEqual(plain(m.nodeStyleLayers(p,null,'sibling',s).flatMap(x=>x.sources).map(x=>x.key)),['baseNodeStyle','siblingNodeStyle',kind==='isFolder'?'folderNodeStyle':'tagNodeStyle']);assert.equal(m.resolveNodeStyle(p,null,'sibling',s).embedWidth,undefined);}
 const inferred=page({file:null,url:'https://example.com'});assert.deepEqual(plain(m.nodeStyleLayers(inferred,{relationType:m.RelationType.INFERRED},'child',s).flatMap(x=>x.sources).filter(x=>x.kind==='standard').map(x=>x.key)),['baseNodeStyle','inferredNodeStyle','urlNodeStyle']);
});

test('all-prefix provenance opens each real editor once and preserves the combined rendered prefix',()=>{
 const s={...settings(),displayAllStylePrefixes:true},p=page({styleTags:['#work','#other'],noteType:'work/project'});
 assert.equal(m.resolveNodeStyle(p,null,'center',s).prefix,'W O ');
 const sources=m.uniqueElementStyleSources(m.nodeStyleLayers(p,null,'center',s).flatMap(x=>x.sources));
 assert.deepEqual(plain(sources.filter(x=>['tag','prefix','note-type'].includes(x.kind))),[{kind:'note-type',key:'#work'},{kind:'note-type',key:'#work/project'},{kind:'prefix',key:'#other'}]);
});

test('connector sources share normalized imported-key order and inferred structural inheritance',()=>{
 const s=settings();s.hierarchyLinkStyles['Related Idea']={strokeColor:'#abc'};
 const relation={typeDefinition:'file-tree, related-idea, child',relationType:m.RelationType.INFERRED,page:page({})};
 const layers=m.linkStyleLayers(relation,s);
 assert.deepEqual(plain(layers.flatMap(x=>x.sources)),[{kind:'standard',key:'baseLinkStyle'},{kind:'standard',key:'inferredLinkStyle'},{kind:'standard',key:'folderLinkStyle'},{kind:'ontology',key:'Related Idea'},{kind:'ontology',key:'child'}]);
 assert.deepEqual(plain(m.resolveLinkStyle(relation,s)),{strokeWidth:3,strokeColor:'#abc',strokeStyle:'dashed'});
});

test('style-lens sources and paint agree for node, edge, evidence and filtering lenses',()=>{
 const engine={matches:(_predicate,context)=>context.evidence?context.evidence.active:context.node.label==='Match'},evidence={decisions:()=>[{evidence:{},active:false},{evidence:{},active:true}]};
 const lenses=[{id:'one',scope:'node',mode:'style',predicate:{},style:{node:{strokeWidth:2}}},{id:'filter',scope:'node',mode:'include',predicate:{}},{id:'edge',scope:'edge',mode:'style',predicate:{},style:{edge:{strokeWidth:4}}},{id:'evidence',scope:'evidence',mode:'style',predicate:{},style:{edge:{strokeColor:'#abc'}}},{id:'last',scope:'node',mode:'style',predicate:{},style:{node:{strokeWidth:0}}}];
 const candidate={node:{path:'Target'},label:'Match',center:{path:'Source'},edge:{sourcePath:'Source',targetPath:'Target'}};
 assert.deepEqual(plain(m.matchingPortableStyleLenses(engine,evidence,lenses,candidate,'node').map(x=>x.id)),['one','last']);
 assert.deepEqual(plain(m.portableLensStyle(engine,evidence,lenses,candidate,'node')),{strokeWidth:0});
 assert.deepEqual(plain(m.matchingPortableStyleLenses(engine,evidence,lenses,candidate,'edge').map(x=>x.id)),['edge','evidence']);
 assert.deepEqual(plain(m.portableLensStyle(engine,evidence,lenses,candidate,'edge')),{strokeWidth:4,strokeColor:'#abc'});
 assert.deepEqual(plain(m.matchingPortableStyleLenses(engine,{decisions:()=>[]},lenses,{...candidate,label:'Other'},'edge')),[]);
});

test('native source menu preserves named labels, order, and stale selection guard',()=>{
 class Menu{items=[];addItem(prepare){const row={setTitle(value){this.title=value;return this},setIcon(){return this},onClick(fn){this.click=fn;return this},setSubmenu(){return this.submenu=new Menu()}};prepare(row);this.items.push(row);return this}}
 const menu=new Menu(),opened=[],sources=[{kind:'standard',key:'baseNodeStyle'},{kind:'tag',key:'#work'},{kind:'lens',id:'lens-A',name:'Important'}];let current=true;
 m.addElementStyleMenu(menu,sources,(key,params)=>key+(params?' '+params.name:''),()=>current,source=>opened.push(source));
 assert.equal(menu.items[0].title,'styleSources.menu');const rows=menu.items[0].submenu.items;
 assert.deepEqual(rows.map(x=>x.title),['colors.standard.baseNodeStyle','styleSources.tag #work','styleSources.lens Important']);rows[2].click();current=false;rows[0].click();assert.deepEqual(plain(opened),[sources[2]]);
});
