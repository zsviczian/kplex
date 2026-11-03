/** Grouping is a finite presentation projection; real layout, React and Chromium exercise its output. */
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { chromiumHarness } from './support/browserTypeScript.mjs';

const projectionBundle=await build({stdin:{resolveDir:process.cwd(),contents:"export * from './src/ui/relationGroups';export * from './src/core/plex/relationGroups';export * from './src/ui/filteredGateCounts';export * from './src/core/graph/settingsPolicy';export {isPeriodicPin} from './src/core/plex/savedPins';"},write:false,bundle:true,format:'cjs',platform:'node'});
const compiled={exports:{}};Function('module','exports',projectionBundle.outputFiles[0].text)(compiled,compiled.exports);
const {groupNeighborhood,groupRelations,projectFilteredGateCounts}=compiled.exports;
const translate = (key, params) => params ? `${params.name} (${params.count})` : key;
const page = (name, facets = {}) => ({ path: name, name, file: { extension: 'md' }, url: null, isTag: false, isFolder: false,
  aliases: [], tags: [], styleTags: [], neighbours: new Map(), noteType: 'Book', ...facets });
const relation = (p, role = 'child') => ({ page: p, role, relationType: 2, linkDirection: 0, typeDefinition: 'original' });
const neighborhood = (values = {}) => ({ center: page('Center'), parents: [], children: [], leftFriends: [], rightFriends: [], siblings: [], ...values });
const project = (n, single = false, unfolded = new Set()) => groupNeighborhood(n, single, unfolded, translate);

test('note types, role classes, singleton identity and original relations survive group/unfold', () => {
  const children = [relation(page('Book1')), relation(page('Book2', {noteType: ' book '})), relation(page('Only', {noteType: 'Article'}))];
  for (const facets of [{file:{extension:'pdf'}}, {url:'https://example.invalid',file:null}, {file:null}, {isTag:true,file:null}, {isFolder:true,file:null}, {noteType:null}]) {
    children.push(relation(page('a'+children.length, facets)), relation(page('b'+children.length, facets)));
  }
  const input = neighborhood({children});
  const grouped = project(input);
  assert.equal(grouped.children.length, 8);
  assert.equal(grouped.children[0].page.name, 'Book');
  assert.equal(grouped.children[1], children[2]);
  const groups = grouped.children.filter(item => item.page.transient);
  assert.deepEqual(groups.map(item => item.page.name), ['Book','groups.attachments','groups.links','groups.placeholders','groups.tags','groups.folders','groups.notes']);
  assert(groups.every(item => item.page.transient.groupMembers.length === 2));
  assert(groups.every(item => !item.page.transient.actualPath && item.page.neighbours.size === 0));
  const unfolded = project(input, false, new Set(groups.map(item => item.page.transient.sectionId)));
  assert.equal(unfolded.children.length, children.length);
  assert(children.every(item => unfolded.children.includes(item)), 'Unfold restores exact original relation objects');
  assert(children.every(item => !item.page.transient), 'Projection never mutates semantic endpoints');
});

test('physical areas group independently; shared-left combines roles without rewriting unfolded semantics', () => {
  const n = neighborhood({ parents:[relation(page('P1'),'parent'),relation(page('P2'),'parent')],
    children:[relation(page('C'))], leftFriends:[relation(page('L'),'previous')],rightFriends:[relation(page('R'),'next')] });
  const split = project(n), single = project(n,true);
  assert.equal(split.parents.length,1);assert.equal(split.children[0],n.children[0]);
  assert.equal(split.leftFriends[0],n.leftFriends[0]);assert.equal(split.rightFriends[0],n.rightFriends[0]);
  assert.equal(single.leftFriends.length,1);assert.equal(single.rightFriends.length,0);
  assert.deepEqual(single.leftFriends[0].page.transient.groupMembers.map(row=>row.role),['previous','next']);
  const key = single.leftFriends[0].page.transient.sectionId;
  const unfolded=project(n,true,new Set([key]));
  assert.equal(unfolded.leftFriends[0],n.leftFriends[0]);assert.equal(unfolded.rightFriends[0],n.rightFriends[0]);
  assert.equal(project({...n,center:page('Next')},true,new Set([key])).leftFriends.length,1,'A new center starts folded');
  assert.equal(project(n,true).leftFriends.length,1,'Another view owns independent unfolding');
});

test('heading containers retain their identity and blank note types group separately from named types', () => {
  const heading = relation(page('Heading',{transient:{kind:'section',sourcePath:'Center',sectionId:'h'}}));
  const n = project(neighborhood({children:[heading,relation(page('a',{noteType:null})),relation(page('b',{noteType:' '}))]}));
  assert(n.children.includes(heading));assert.equal(n.children.find(item=>item!==heading).page.name,'groups.notes');
  const many=Array.from({length:100000},(_,value)=>({value,kind:'notes',noteType:`Type${value%20}`}));
  const groups=groupRelations(many);assert.equal(groups.length,20);assert.equal(groups[0].members.length,5000);
});

test('filtered center gate numerators count grouped members without reading synthetic or hidden source nodes', () => {
  const n = project(neighborhood({children:[relation(page('a')),relation(page('b'))]}));
  const group=n.children[0].page, calls=[];
  const result=projectFilteredGateCounts([{page:n.center},{page:group}], [{sourcePath:n.center.path,targetPath:group.path}],new Set([n.center.path,group.path]),{
    captureSemanticGateRead:()=>({isCurrent:()=>true,read:(p,targets)=>{calls.push(p.path);return new Map([...targets].map(path=>[path,['bottom']]))}}),
  });
  assert.equal(result.counts.get('Center').bottom,2);assert.deepEqual(calls,['Center']);
});

const graphSource=ts.createSourceFile('graph.tsx',readFileSync('src/ui/PlexGraph.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
/** Compile production gesture callbacks with finite effect dependencies, not a duplicate interaction policy. */
function callback(name,context) {
  let selected;
  const visit=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(graphSource)===name&&ts.isArrowFunction(node.initializer))selected=node.initializer.getText(graphSource);if(ts.isFunctionDeclaration(node)&&node.name?.text===name)selected=node.getText(graphSource);ts.forEachChild(node,visit)};
  visit(graphSource);assert(selected,name);
  const emitted=ts.transpileModule(`const selected=${selected}`,{compilerOptions:{target:ts.ScriptTarget.ES2021}}).outputText;
  return Function(...Object.keys(context),`${emitted};return selected`)(...Object.values(context));
}

test('click, touch and keyboard resolve a group to in-place unfolding without native navigation or index lookup', () => {
  const group=project(neighborhood({children:[relation(page('a')),relation(page('b'))]})).children[0].page;
  let state={center:'Center',keys:new Set()};
  const ctx={activePath:'Center',sceneScope:'Center',setUnfoldedGroups:fn=>{state=fn(state)},suppressActivateUntil:{current:0},suppressSyntheticClickUntil:{current:0},
    touchDoubleTap:{current:{reset(){}}},index:{get(){throw Error('Synthetic lookup')}},persistentPageFor(){throw Error('Native endpoint')},
    scene:{nodes:[{page:group}]},sceneNodeKeys:new Map(),resolveActionPage(){throw Error('Canonical action lookup')}};
  ctx.unfoldGroup=callback('unfoldGroup',ctx);
  callback('activateNode',ctx)(group);assert(state.keys.has(group.transient.sectionId));
  state={center:'Center',keys:new Set()};callback('completeTouchTap',ctx)(group,{});assert(state.keys.has(group.transient.sectionId));
  const actionPage=callback('graphActionPage',ctx);
  assert.equal(actionPage({target:{kind:'node',node:{identity:group.path}},request:{id:'node.activate'}}),group);
  assert.equal(actionPage({target:{kind:'node',node:{identity:group.path}},request:{id:'node.delete'}}),null);
});

test('area filters match group labels and member names/aliases, never synthetic source identities', () => {
  const group=project(neighborhood({children:[relation(page('alpha')),relation(page('beta',{aliases:['Alternate']}))]})).children[0].page;
  const matches=callback('matchesZoneFilter',{}),node={page:group,label:group.name};
  assert.equal(matches(node,'Book'),true);assert.equal(matches(node,'alpha'),true);assert.equal(matches(node,'Alternate'),true);
  assert.equal(matches(node,'Center'),false);assert.equal(matches(node,'missing'),false);
});

test('grouping saves, policy signatures and unfolded state have presentation-only lifetimes', async () => {
  const {captureSettingsPolicy,classifySettingsChange,encodeIndexSettingsSignature}=compiled.exports;
  const settings={hierarchy:{hidden:[],parents:[],children:[],leftFriends:[],rightFriends:[],previous:[],next:[],exclusions:[]},inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:false,noteTypeField:'Note type',primaryTagField:'',tagStyleList:[],baseNodeStyle:{},groupRelations:false};
  const before=captureSettingsPolicy(settings),signature=encodeIndexSettingsSignature(settings);
  settings.groupRelations=true;
  const effects=classifySettingsChange(before,captureSettingsPolicy(settings));
  assert.deepEqual(effects.changedKeys,['groupRelations']);assert.equal(effects.semanticInvalidation,false);
  assert.equal(effects.presentationFacets,false);assert.equal(effects.searchTerms,false);assert.equal(effects.render,true);
  assert.equal(encodeIndexSettingsSignature(settings),signature);
  const main=ts.createSourceFile('main.ts',readFileSync('src/main.ts','utf8'),ts.ScriptTarget.Latest,true);
  const owner=main.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='KplexPlugin');
  const methods=['saveSettings','refreshPeriodicPins','stopPeriodicPinTimer'].map(name=>owner.members.find(node=>node.name?.getText(main)===name));assert(methods.every(Boolean));
  const emitted=ts.transpileModule(`class SaveOwner {periodicPinTimer=null;periodicPinSignature=null;${methods.map(method=>method.getText(main)).join('\n')}}`,{compilerOptions:{target:ts.ScriptTarget.ES2021}}).outputText;
  const SaveOwner=Function('ontologyConfiguration','captureSettingsPolicy','classifySettingsChange','STYLE_SETTINGS_KEYS','isStyleOnlySettingsChange','isPeriodicPin',`${emitted};return SaveOwner`)(()=>{},captureSettingsPolicy,classifySettingsChange,[],()=>false,compiled.exports.isPeriodicPin);
  settings.pinnedNodes=[];
  const saved=new SaveOwner(),calls=[];Object.assign(saved,{settings,savedSettingsPolicy:before,index:{notifyPresentation:()=>calls.push('notify')},persistSettingsSnapshot:async()=>calls.push('persist'),refreshSavedSettings:async semantic=>{calls.push(semantic?'semantic':'presentation');return{refreshPending:false}}});
  await saved.saveSettings();assert.deepEqual(calls,['persist','presentation']);
});

test('real layout and React show class styling, external counts, independent documents and retained sibling connectors', async () => {
  const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export * from './src/ui/relationGroups';export * from './src/ui/layout';export {resolveNodeStyle} from './src/index/style';export {ThoughtNode} from './src/ui/ThoughtNode';export {migrateAndMergeSettings} from './src/settings';export {createElement} from 'react';export {createRoot} from 'react-dom/client';export {flushSync} from 'react-dom';`},write:false,bundle:true,format:'iife',globalName:'sourceModules',platform:'browser',plugins:[{name:'native-components',setup(builder){
    builder.onResolve({filter:/^obsidian$/},()=>({path:'obsidian',namespace:'double'}));
    builder.onLoad({filter:/.*/,namespace:'double'},()=>({contents:`export class Component {load(){} unload(){}} export const MarkdownRenderer={render:()=>{throw Error("Native Markdown is outside this finite fixture")}}; export class App {} export class ButtonComponent {} export class Modal {} export class SuggestModal extends Modal {} export class ColorComponent {} export class Notice {} export class Setting {} export class AbstractInputSuggest {} export class ExtraButtonComponent {} export class Scope {} export class SearchComponent {} export class PluginSettingTab {} export const setIcon=()=>{};export const setTooltip=()=>{};export const getIcon=()=>null;export const getIconIds=()=>[];export const getLanguage=()=> 'en';export const Platform={};`}));
  }}]});
  const host=await chromiumHarness(bundle.outputFiles[0].text);
  try {
    const result=await host.evaluate(`(async()=>{
      const U=sourceModules,css=document.createElement('style');css.textContent=${JSON.stringify(readFileSync('styles.css','utf8'))};document.head.append(css);
      const p=${page.toString()},r=${relation.toString()},n=${neighborhood.toString()},t=${translate.toString()},page=p;
      const settings=U.migrateAndMergeSettings({graphDepth:2,showNeighborCount:false,noteTypeStyles:{Book:{backgroundColor:'#123456',textColor:'#abcdef',icon:'book'}}});
      const input=n({parents:[r(p('P1'),'parent'),r(p('P2'),'parent')],children:[r(p('a')),r(p('b'))],siblings:[r(p('S1'),'sibling'),r(p('S2'),'sibling')]});
      const index={titleFor:p=>p.name,neighbourCount:()=>0,gateStats:()=>({}),neighbours:p=>{if(p.transient?.kind==='group')throw Error('Synthetic descendant read');return[]},visibleRelationshipsWithin:(p,targets)=>{if(p.transient)throw Error('Synthetic incidence read');return [...targets].map(path=>r(input.siblings.find(row=>row.page.path===path).page))}};
      const projected=U.groupNeighborhood(input,false,new Set(),t),scene=U.buildScene(projected,index,settings,false,undefined,true),group=scene.nodes.find(node=>node.role==='child');
      let categoryStyles=true;
      for(const [key,facets]of [['folderNodeStyle',{isFolder:true,file:null}],['tagNodeStyle',{isTag:true,file:null}],['urlNodeStyle',{url:'https://example.invalid',file:null}],['attachmentNodeStyle',{file:{extension:'pdf'}}],['virtualNodeStyle',{file:null}]]){
        const options={...settings,[key]:{backgroundColor:'#246810',icon:'test-category'}},rows=n({children:[r(p('one',facets)),r(p('two',facets))]}),bucket=U.groupNeighborhood(rows,false,new Set(),t).children[0];
        const style=U.resolveNodeStyle(bucket.page,bucket,'child',options);categoryStyles&&=style.backgroundColor==='#246810'&&style.icon==='test-category'&&bucket.page.noteType===null;
      }
      let activations=0;const rootEl=document.createElement('main');rootEl.style.position='relative';rootEl.style.width='900px';rootEl.style.height='600px';document.body.append(rootEl);
      const frame=document.createElement('iframe');document.body.append(frame);await new Promise(resolve=>setTimeout(resolve,30));frame.contentDocument.head.append(css.cloneNode(true));
      const root=U.createRoot(rootEl),other=U.createRoot(frame.contentDocument.body);
      const props={node:{...group,x:300,y:150},settings,translate:t,selected:false,highlighted:false,dimmed:false,highlightedGates:new Set(),onActivate:()=>activations++,onOpen(){},onHoverNode(){},onHoverGate(){},onHoverEnd(){},onHoverPreview(){},onGatePointerDown(){},onNodePointerDown(){}};
      U.flushSync(()=>{root.render(U.createElement(U.ThoughtNode,props));other.render(U.createElement(U.ThoughtNode,props))});
      const el=rootEl.querySelector('.kplex-thought'),count=el.querySelector('.kplex-group-count'),rect=el.getBoundingClientRect(),badge=count.getBoundingClientRect();el.click();
      const output={text:el.querySelector('.kplex-thought-text').textContent,count:count.textContent,outside:badge.bottom>rect.bottom&&badge.right>rect.right,color:getComputedStyle(el).backgroundColor,icon:group.style.icon,categoryStyles,pathRoundTrip:el.dataset.kplexPath===group.page.path,gates:el.querySelectorAll('[data-kplex-gate]').length,aria:el.getAttribute('aria-label'),other:frame.contentDocument.querySelector('.kplex-group-count').textContent,activations,siblingEdges:scene.edges.filter(edge=>edge.id.startsWith('sibling-parent:')).length,unfolded:U.buildScene(input,index,{...settings,graphDepth:1},false,undefined,true).nodes.filter(node=>node.role==='child').length};
      U.flushSync(()=>{root.unmount();other.unmount()});rootEl.remove();frame.remove();css.remove();return output;
    })()`);
    assert.deepEqual(result,{text:'Book',count:'2',outside:true,color:'rgb(18, 52, 86)',icon:'book',categoryStyles:true,pathRoundTrip:true,gates:0,aria:'Book (2)',other:'2',activations:1,siblingEdges:1,unfolded:2});
  } finally {await host.cleanup()}
});
