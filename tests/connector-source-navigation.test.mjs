/** Exact physical provenance and stale-read fencing using production grouping, source acquisition,
 * navigation dispatch and finite modifier contracts. No vault-wide or hover preparation is allowed. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {loadPortableModules} from './support/portableTypeScript.mjs';
const {exports:M}=loadPortableModules(['src/ui/features/relationshipSourceOccurrences.ts','src/ui/components/modifierClick.ts','src/ui/features/gateRelationshipIntent.ts','src/core/graph/relations.ts','src/core/plex/actions.ts','src/core/contracts/fieldName.ts','src/adapters/obsidian/actionNode.ts']);

/** Extract the actual method without starting the plugin or rebuilding the graph. */
function method(name,dependencies={}) {
 const tree=ts.createSourceFile('main.ts',readFileSync('src/main.ts','utf8'),ts.ScriptTarget.Latest,true);
 let code;function visit(node){if(ts.isMethodDeclaration(node)&&node.name.getText(tree)===name)code=(node.modifiers?.some(m=>m.kind===ts.SyntaxKind.AsyncKeyword)?'async ':'')+'function '+name+node.getText(tree).slice(node.getText(tree).indexOf('('));ts.forEachChild(node,visit)}visit(tree);assert(code,name);
 const js=ts.transpileModule('const f='+code,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 return Function(...Object.keys(dependencies),js+';return f')(...Object.values(dependencies));
}
const decision=(id,kind='inline-ontology',path='A.md',extra={})=>({active:true,evidence:{id,sourceKind:kind,declaredByPath:path,declaredTargetPath:path==='A.md'?'B.md':'A.md',relationType:M.RelationType.DEFINED,...extra}});
const section=(path,start,end,line=2)=>({path,startLine:0,endLine:6,occurrence:{start,end,line}});

test('batched native source acquisition retains repeated same-line links and exact inline/property navigation',async()=>{
 const content='---\r\nParent: "[[B]]"\r\n---\r\n\r\nParent:: [[B]]\r\n\r\n[[B]][[B]]\r\n',file={path:'A.md',extension:'md'},target={path:'B.md'};
 const links=[...content.matchAll(/\[\[B\]\]/g)].slice(1).map(match=>{const line=content.slice(0,match.index).split('\n').length-1;return{link:'B',position:{start:{line,offset:match.index},end:{line,offset:match.index+5}}}});
 let reads=0;const host={app:{vault:{getFileByPath:path=>path==='A.md'?file:target,cachedRead:async()=>{reads++;return content}},metadataCache:{getFileCache:()=>({links}),getFirstLinkpathDest:()=>target}},translator:key=>key};
 host.relationshipEvidenceLocations=method('relationshipEvidenceLocations');host.relationshipEvidenceSectionsBatch=method('relationshipEvidenceSectionsBatch',{normalizeFieldName:M.normalizeFieldName});
 const property=decision('property','frontmatter-ontology','A.md',{fieldName:'Parent'}),inline=decision('inline','inline-ontology','A.md',{line:5,start:content.indexOf('Parent::'),end:content.indexOf('Parent::')+14}),generic=decision('generic','obsidian-link');
 const sections=await host.relationshipEvidenceSectionsBatch([property.evidence,inline.evidence,generic.evidence]);
 assert.equal(reads,1);assert.equal(sections.get('generic').length,3,'Two links in one paragraph remain distinct physical occurrences');
 assert.equal(sections.get('property')[0].occurrence.line,1);assert.equal(sections.get('inline')[0].occurrence.line,4);
 assert.equal(M.groupRelationshipSourceOccurrences([property,inline,generic],sections).groups.length,4,'One property, one inline field with its host mirror, two body links');
});

test('physical offsets retain separate adjacent links in one paragraph and merge only overlapping mirrors',()=>{
 const a=decision('inline'),b=decision('host','obsidian-link');
 const rows=new Map([['inline',[section('A.md',10,30)]],['host',[section('A.md',15,20)]]]);
 assert.equal(M.groupRelationshipSourceOccurrences([a,b],rows).groups.length,1);
 rows.set('host',[section('A.md',15,20),section('A.md',35,40)]);
 assert.equal(M.groupRelationshipSourceOccurrences([a,b],rows).groups.length,2);
 const adjacent=new Map([['host',[section('A.md',10,15),section('A.md',15,20)]]]);
 assert.equal(M.groupRelationshipSourceOccurrences([b],adjacent).groups.length,2);
 rows.set('host',[section('B.md',15,20)]);assert.equal(M.groupRelationshipSourceOccurrences([a,b],rows).groups.length,2);
});

for(const additional of [false,true])test(`native YAML host mirrors retain ${additional?'two distinct properties':'one physical property'} without additional source reads`,async()=>{
 const content='---\nParent:\n  - "[[B]]"\n'+(additional?'Other: "[[B]]"\n':'')+'---\n',file={path:'A.md',extension:'md'},target={path:'B.md'};
 const frontmatter={Parent:['[[B]]'],...(additional?{Other:'[[B]]'}:{})},frontmatterLinks=[{key:'Parent.0',link:'B'},...(additional?[{key:'Other',link:'B'}]:[])];
 let reads=0;const host={app:{vault:{getFileByPath:path=>path==='A.md'?file:target,cachedRead:async()=>{reads++;return content}},metadataCache:{getFileCache:()=>({links:[],frontmatter,frontmatterLinks}),getFirstLinkpathDest:()=>target}},translator:key=>key};
 host.relationshipEvidenceLocations=method('relationshipEvidenceLocations');host.relationshipEvidenceSectionsBatch=method('relationshipEvidenceSectionsBatch',{normalizeFieldName:M.normalizeFieldName});
 const property=decision('property','frontmatter-ontology','A.md',{fieldName:'Parent'}),generic=decision('generic','obsidian-link'),decisions=[property,generic];
 const rows=await host.relationshipEvidenceSectionsBatch(decisions.map(row=>row.evidence)),grouped=M.groupRelationshipSourceOccurrences(decisions,rows);
 assert.equal(reads,1);assert.equal(grouped.unlocated.length,0);assert.equal(grouped.groups.length,additional?2:1);assert.equal(grouped.groups[0].section.occurrence.line,1);
});

test('ambiguous dotted native YAML keys cannot disappear behind one located inline occurrence',async()=>{
 const content='---\nOther: "[[B]]"\nOther.0: "[[B]]"\n---\n\nChild:: [[B]]\n',file={path:'A.md',extension:'md'},target={path:'B.md'},start=content.indexOf('Child::');
 const host={app:{vault:{getFileByPath:path=>path==='A.md'?file:target,cachedRead:async()=>content},metadataCache:{getFileCache:()=>({frontmatter:{Other:'[[B]]','Other.0':'[[B]]'},frontmatterLinks:[{key:'Other.0',link:'B'}],links:[{link:'B',position:{start:{line:5,offset:start+8},end:{line:5,offset:start+13}}}]}),getFirstLinkpathDest:()=>target}},translator:key=>key};
 host.relationshipEvidenceLocations=method('relationshipEvidenceLocations');host.relationshipEvidenceSectionsBatch=method('relationshipEvidenceSectionsBatch',{normalizeFieldName:M.normalizeFieldName});
 const inline=decision('inline','inline-ontology','A.md',{fieldName:'Child',line:6,start,end:start+13}),generic=decision('generic','obsidian-link'),decisions=[inline,generic];
 const rows=await host.relationshipEvidenceSectionsBatch(decisions.map(row=>row.evidence)),grouped=M.groupRelationshipSourceOccurrences(decisions,rows);
 assert.equal(grouped.groups.length,1);assert.equal(grouped.unlocated.length,1);assert.equal(grouped.unlocated[0],generic);
});

/** A finite selected pair: preparation and unrelated source reads are absent by construction. */
function hostFixture(decisions,sections) {
 let revision=1,alive=true,ready=true,reads=0;
 const files=new Map(['A.md','B.md'].map(path=>[path,{path,extension:'md',stat:{mtime:1,size:100}}]));
 const host={unloading:false,app:{vault:{getFileByPath:path=>files.get(path)}},index:{isSemanticWriteReady:()=>ready,explainRelationship:()=>({decisions})},getIndexSourceRevision:()=>revision,
  relationshipEvidenceSectionsBatch:async()=>{reads++;return sections}};
 host.singleRelationshipSourceLocation=method('singleRelationshipSourceLocation',{groupRelationshipSourceOccurrences:M.groupRelationshipSourceOccurrences,RelationType:M.RelationType});
 return{host,files,current:()=>alive,reads:()=>reads,retire:()=>{alive=false},revise:()=>{revision++},unready:()=>{ready=false}};
}

test('one explicit frontmatter source plus duplicate host evidence opens its exact property line',async()=>{
 const a=decision('property','frontmatter-ontology'),b=decision('mirror','obsidian-link');
 const f=hostFixture([a,b],new Map([['property',[section('A.md',4,28,1)]],['mirror',[section('A.md',12,18,1)]]]));
 const result=await f.host.singleRelationshipSourceLocation('A.md','B.md',f.current);
 assert.equal(result.path,'A.md');assert.equal(result.line,1);assert.equal(result.current(),true);assert.equal(f.reads(),1);
 f.files.get('A.md').stat.mtime++;assert.equal(result.current(),false);
});

for(const kind of ['multiple-paragraph','property-and-body','opposite-note','inferred','unlocated','loading'])test(`${kind} evidence cannot authorize an arbitrary source jump`,async()=>{
 const a=decision('a',kind==='property-and-body'?'frontmatter-ontology':'inline-ontology'),b=decision('b','inline-ontology',kind==='opposite-note'?'B.md':'A.md');
 let decisions=[a,b],rows=new Map([['a',[section('A.md',4,20)]],['b',[section(b.evidence.declaredByPath,30,45,4)]]]);
 if(kind==='inferred'){a.evidence.relationType=M.RelationType.INFERRED;decisions=[a];rows.delete('b')}
 if(kind==='unlocated')rows.set('b',[]);
 const f=hostFixture(decisions,rows);if(kind==='loading')f.unready();
 assert.equal(await f.host.singleRelationshipSourceLocation('A.md','B.md',f.current),null);if(kind==='loading'||kind==='inferred')assert.equal(f.reads(),0);
});

for(const mutation of ['edit','replace','revision','close','authority'])test(`a source read retired by ${mutation} offers no direct destination`,async()=>{
 const f=hostFixture([decision('a')],new Map([['a',[section('A.md',5,20)]]]));let release;
 f.host.relationshipEvidenceSectionsBatch=()=>new Promise(resolve=>{release=resolve});
 const pending=f.host.singleRelationshipSourceLocation('A.md','B.md',f.current);
 if(mutation==='edit')f.files.get('A.md').stat.size++;
 if(mutation==='replace')f.files.set('A.md',{...f.files.get('A.md')});
 if(mutation==='revision')f.revise();if(mutation==='close')f.retire();if(mutation==='authority')f.unready();
 release(new Map([['a',[section('A.md',5,20)]]]));assert.equal(await pending,null);
});

test('connector modifier defaults to no gesture and rejects combinations on both primary-key conventions',()=>{
 const none={altKey:false,ctrlKey:false,metaKey:false,shiftKey:false};
 for(const convention of ['macos','ios','windows','android']){
  const key=convention==='macos'||convention==='ios'?'metaKey':'ctrlKey';
  const primary=key==='metaKey'?'meta':'control';
  assert.equal(M.matchesSourceModifier({...none,[key]:true},'none',primary),false);
  assert.equal(M.matchesSourceModifier({...none,[key]:true},'mod',primary),true);
  assert.equal(M.matchesSourceModifier({...none,[key]:true,shiftKey:true},'mod',primary),false);
  assert.equal(M.matchesSourceModifier({...none,shiftKey:true},'shift',primary),true);
  assert.equal(M.matchesSourceModifier({...none,shiftKey:true,altKey:true},'shift',primary),false);
 }
 assert(M.validActionArguments('relationship.details',{directSource:true}));assert(!M.validActionArguments('relationship.details',{directSource:'yes'}));assert(!M.validActionArguments('relationship.details',{directSource:true,path:'untrusted.md'}));
});

test('connector primary-key binding follows native Apple flags and retains Control on Linux',()=>{
 const tree=ts.createSourceFile('PlexGraph.tsx',readFileSync('src/ui/PlexGraph.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let expression;
 function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(tree)==='sourcePrimaryKey')expression=node.initializer.getText(tree);ts.forEachChild(node,visit)}visit(tree);assert(expression);
 const read=Function('Platform','return '+expression);
 assert.equal(read({isMacOS:true,isIosApp:false}),'meta');assert.equal(read({isMacOS:false,isIosApp:true}),'meta');
 for(const platform of [{isMacOS:false,isIosApp:false},{}])assert.equal(read(platform),'control');
});

test('lateral families restore independently, Alt forces sequence, primary forces friend/challenger, Shift leaves memory',()=>{
 const none={altKey:false,ctrlKey:false,metaKey:false,shiftKey:false},memory={left:'previous',right:'next'};
 for(const role of ['left','right']){
  const sequence=role==='left'?'previous':'next';assert.equal(M.gateCreationRole(role,none,memory),sequence);
  assert.equal(M.gateCreationRole(role,{...none,shiftKey:true},memory),sequence);
  assert.equal(M.gateCreationRole(role,{...none,altKey:true}),sequence);
  for(const key of ['ctrlKey','metaKey'])assert.equal(M.gateCreationRole(role,{...none,[key]:true,altKey:true},memory),role);
 }
 assert.equal(M.gateCreationRole('parent',{...none,altKey:true},memory),'parent');
 assert.equal(M.gateCreationRole('left',none,{...memory,left:'left'}),'left');
});

for(const mode of ['single','multiple','unavailable','stale','read-error','retired-surface'])test(`actual connector action handles ${mode} through the existing navigation or inspector owner`,async()=>{
 const tree=ts.createSourceFile('PlexGraph.tsx',readFileSync('src/ui/PlexGraph.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let expression;
 function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(tree)==='performEdgeAction')expression=node.initializer.getText(tree);ts.forEachChild(node,visit)}visit(tree);assert(expression);
 const a={path:'A.md',file:{}},b={path:'B.md',file:{}},opened=[],navigated=[],dialogs={current:new Set()},serial={current:0};let alive=true;
 const plugin={isActionSurfaceCurrent:()=>alive,actionManager:{closeSession(){}},singleRelationshipSourceLocation:async()=>{
  if(mode==='read-error')throw Error('unavailable');if(mode==='retired-surface')alive=false;
  return mode==='multiple'||mode==='unavailable'?null:{path:'A.md',line:2,current:()=>mode!=='stale'};
 },openRelationshipEvidenceLocation:async(...args)=>navigated.push(args)};
 const dependencies={semanticSceneEdge:()=>true,viewSession:undefined,viewLifetime:0,plugin,actionSurfaceId:'graph',scene:{nodes:[{page:a},{page:b}]},
  index:{get:path=>path==='A.md'?a:b,explainRelationship:()=>({decisions:[decision('one')]})},connectionActionAllowed:()=>true,sectionExpansion:null,
  RelationshipExplanationModal:class{constructor(...args){opened.push(args)}open(){}},graphDialogSerial:serial,graphDialogs:dialogs,viewDefinition:{hierarchy:false},neighborhood:{center:a},hostLeaf:{id:'owning-leaf'}};
 const js=ts.transpileModule('const f='+expression,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const run=Function(...Object.keys(dependencies),js+';return f')(...Object.values(dependencies));
 const result=await run({generation:1,request:{id:'relationship.details',args:{directSource:true}}},{sourcePath:a.path,targetPath:b.path,role:'child'},'relationship.details');
 if(mode==='single'){assert.equal(result.status,'completed');assert.equal(navigated.length,1);assert.equal(navigated[0][0].line,2);assert.equal(navigated[0][1],dependencies.hostLeaf);assert.equal(opened.length,0)}
 else if(mode==='retired-surface'){assert.equal(result.status,'cancelled');assert.equal(opened.length,0);assert.equal(navigated.length,0)}
 else{assert.equal(result.status,'opened');assert.equal(opened.length,1);assert.equal(opened[0][2].initialFocus,'sources');assert.equal(navigated.length,0)}
});

/** Exercise the production pointer-release and direct-action callbacks together. Native camera
 * capture retargets clicks to the viewport; only a stationary same-edge release may navigate. */
for(const mode of ['stationary','dragged','middle-button','released-modifier','different-edge','retired-edge','disabled'])test('captured connector release '+mode,()=>{
 const tree=ts.createSourceFile('PlexGraph.tsx',readFileSync('src/ui/PlexGraph.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),names=['openConnectorSource','up'],definitions=[];
 function visit(node){if(ts.isVariableDeclaration(node)&&names.includes(node.name.getText(tree)))definitions.push('const '+node.name.getText(tree)+'='+node.initializer.getText(tree)+';');ts.forEachChild(node,visit)}visit(tree);assert.equal(definitions.length,2);
 const a={path:'A.md',file:{}},b={path:'B.md',file:{}},edge={id:'source',sourcePath:a.path,targetPath:b.path},calls=[];
 const hit={dataset:{kplexEdgeId:mode==='different-edge'?'other':'source'},closest(selector){return selector==='.kplex-edge-hit'?this:null}},suppressActivateUntil={current:0};
 const panDrag={current:{pointerId:1,button:mode==='middle-button'?1:0,pointerType:'mouse',moved:mode==='dragged',sourceEdgeId:'source'}};
 const dependencies={connectDrag:null,nodeDrag:null,clearHistoryDragHover(){},areaResizeDrag:{current:null},finishAreaSettingsDismiss(){},pendingGateLongPress:{current:null},panDrag,suppressActivateUntil,
  matchesSourceModifier:M.matchesSourceModifier,settings:{connectionSourceModifier:mode==='disabled'?'none':'shift'},sourcePrimaryKey:'control',index:{get:path=>path===a.path?a:b},actionNodeRef:M.actionNodeRef,
  plugin:{actionManager:{dispatch:request=>calls.push(request)}},actionSurfaceId:'graph',visibleEdges:mode==='retired-edge'?[]:[edge]};
 const js=ts.transpileModule(definitions.join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const callbacks=Function(...Object.keys(dependencies),js+';return {up,openConnectorSource}')(...Object.values(dependencies));
 const event={pointerId:1,pointerType:'mouse',button:0,clientX:10,clientY:20,altKey:false,ctrlKey:false,metaKey:false,shiftKey:mode!=='released-modifier',currentTarget:{ownerDocument:{elementFromPoint:()=>hit}}};
 callbacks.up(event);assert.equal(panDrag.current,null);
 assert.equal(calls.length,mode==='stationary'?1:0);
 if(mode==='stationary'){assert.equal(calls[0].id,'relationship.details');assert.deepEqual(calls[0].args,{directSource:true});assert.equal(calls[0].target.origin.identity,a.path);assert.equal(callbacks.openConnectorSource(edge,event),false,'A synthesized click cannot dispatch a second source action');assert.equal(calls.length,1);}
});
