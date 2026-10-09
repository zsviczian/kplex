/** Configured and fallback Date roles use the canonical compiler/patch/selector and historical settings boundary. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import ts from 'typescript';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadPortableModules} from './support/portableTypeScript.mjs';
const {exports:c}=loadPortableModules(['src/core/graph/compiler.ts','src/core/graph/patch.ts','src/core/graph/source.ts','src/core/graph/sourcePolicy.ts','src/core/graph/settingsPolicy.ts','src/core/graph/relations.ts','src/core/graph/resolver.ts','src/core/graph/evidence.ts']);
const temp=mkdtempSync(join(tmpdir(),'kplex-date-policy-'));process.once('exit',()=>rmSync(temp,{recursive:true,force:true}));
const entry=join(temp,'host.mjs');
await build({stdin:{resolveDir:process.cwd(),contents:'export {DEFAULT_SETTINGS,migrateAndMergeSettings,importExcaliBrainGraphSettings} from "./src/settings";export {createTranslator} from "./src/lang";export {graphCompilerSettingsFromLegacy,semanticIndexSettingsFromLegacy} from "./src/adapters/obsidian/graphContracts";',loader:'ts'},outfile:entry,bundle:true,platform:'node',format:'esm',plugins:[{name:'settings-host-boundary',setup(b){b.onResolve({filter:/^obsidian$/},()=>({path:'obsidian',namespace:'native'}));b.onLoad({filter:/.*/,namespace:'native'},()=>({contents:'export class App {} export class ButtonComponent {} export class Modal {} export class Notice {} export class AbstractInputSuggest {} export class Setting {} export class ExtraButtonComponent {} export class Scope {} export class SearchComponent {} export class PluginSettingTab {} export const getIcon=()=>null,getIconIds=()=>[],setIcon=()=>{},setTooltip=()=>{},getLanguage=()=>"en",Platform={};',loader:'js'}));}}]});
const host=await import(pathToFileURL(entry).href);
const empty=()=>({hidden:[],parents:[],children:[],leftFriends:[],rightFriends:[],previous:[],next:[],exclusions:[]});
const settings=(roles={},extra={})=>({hierarchy:{...empty(),...roles},inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30,...extra});
const runtime=()=>({now:()=>0,yield:async()=>{},isCurrent:()=>true,sliceBudgetMs:8,resolverBatchSize:32});
const meeting={id:'meeting',kind:'document',state:'materialized',semanticPath:'2026-10-08 Meeting with John.md',physicalPath:'2026-10-08 Meeting with John.md'};
const daily={id:'daily',kind:'document',state:'materialized',semanticPath:'2026-10-08.md',physicalPath:'2026-10-08.md'};
const entity=ref=>({kind:'entity',source:ref,sourceRevision:'physical:1',entity:ref,name:ref.id,url:null});
const date=(fieldName='date',rawValue='2026-10-08')=>({kind:'date-property',source:meeting,sourceRevision:'physical:1',target:{entity:daily,rawTarget:'2026-10-08.md',resolvedBy:'daily-notes'},provenance:{surface:'frontmatter',fieldName,rawValue}});
const body=(source=daily,target=meeting)=>({kind:'obsidian-link',source,sourceRevision:'physical:1',target:{entity:target,rawTarget:target.semanticPath,resolvedBy:'host'},occurrenceCount:1});
/** A physical wiki-link property keeps its existing neutral reference stream and explicit tier. */
function reference(fieldName,surface='frontmatter') {
  const base={source:meeting,sourceRevision:'physical:1',valueId:`${surface}:${fieldName}`};
  return [{...base,kind:'reference-value',fieldName,normalizedFieldName:fieldName.toLowerCase().replace(/\s+/g,'-'),surface,ordinal:0,origin:'physical'},
    {...base,kind:'reference-payload',index:0,final:true,text:'[[2026-10-08]]'},
    {...base,kind:'reference-candidate',ordinal:0,final:true,hostOccurrenceCount:0,target:{entity:daily,rawTarget:'2026-10-08',resolvedBy:'host'}}];
}
/** Feed actual compiler/patch cursor finality without substituting any semantic policy. */
async function feed(owner,records){const boundary={generation:'date-test',snapshotRevision:'date-test'},read=owner.beginRead(boundary);assert.equal(await owner.acceptBatch(read,{boundary,sequence:0,final:true,records}),true);assert.equal(owner.completeRead(read,boundary),true)}
async function compile(records,policy){const compiler=new c.NormalizedGraphCompiler(policy,runtime());await feed(compiler,records);const graph=await compiler.finish();assert(graph);return graph}
const declarations=graph=>[...graph.declarations()].map(({id,...rest})=>rest);
const pair=graph=>graph.node(meeting.id).neighbours.get(daily.semanticPath);

test('all six default Date roles and inverse views beat reciprocal body links and generic inference flags',async()=>{
  const inverse={parent:'child',child:'parent',left:'left',right:'right',previous:'next',next:'previous'};
  for(const [role,reverseRole] of Object.entries(inverse))for(const inferAllLinksAsFriends of [false,true])for(const inverseInfer of [false,true])for(const link of [body(),body(meeting,daily)]){
    const graph=await compile([entity(meeting),entity(daily),link,date()],settings({}, {datePropertyRelations:role,inferAllLinksAsFriends,inverseInfer}));
    assert.equal(c.classifyRelation(pair(graph),role,inferAllLinksAsFriends),c.RelationType.DEFINED);
    const reverse=graph.node(daily.id).neighbours.get(meeting.semanticPath);
    assert.equal(c.classifyRelation(reverse,reverseRole,inferAllLinksAsFriends),c.RelationType.DEFINED);
    const evidence=declarations(graph).find(item=>item.sourceKind==='date-property');
    assert.equal(evidence.declaredRole,role);assert.equal(evidence.rawValue,'2026-10-08');assert.equal(evidence.fieldName,'date');
  }
  for(const policy of [settings(),settings({}, {datePropertyRelations:'inferred'}),settings({}, {datePropertyRelations:'ontology'})]){
    const graph=await compile([entity(meeting),entity(daily),body(),date()],policy);
    assert.equal(c.classifyRelation(pair(graph),'parent',false),c.RelationType.DEFINED,'missing/interim preferences use Parent');
  }
});

test('every configured Date role wins over every default independent of generic inference toggles',async()=>{
  const groups={hidden:'hidden',parents:'parent',children:'child',leftFriends:'left',rightFriends:'right',previous:'previous',next:'next'};
  for(const [group,role] of Object.entries(groups))for(const fallback of ['parent','child','left','right','previous','next'])for(const inferAllLinksAsFriends of [false,true])for(const inverseInfer of [false,true]){
    const graph=await compile([entity(meeting),entity(daily),body(),date()],settings({[group]:['DATE']},{datePropertyRelations:fallback,inferAllLinksAsFriends,inverseInfer}));
    const evidence=declarations(graph).find(item=>item.sourceKind==='date-property');
    assert.equal(evidence.declaredRole,role);assert.equal(evidence.fieldName,'DATE');assert.equal(evidence.definition,'date');
    assert.equal(evidence.relationType,c.RelationType.DEFINED);
    assert.equal(pair(graph).isHidden,role==='hidden');
    if(role!=='hidden')assert.equal(c.classifyRelation(pair(graph),role,inferAllLinksAsFriends),c.RelationType.DEFINED);
    else assert.equal(graph.node(daily.id).neighbours.get(meeting.semanticPath).isHidden,false,'Hidden is directional');
  }
});

test('all configured roles, hidden and normalized exact-label duplicates retain full/patch ordering and multiplicity',async()=>{
  const roleMap={hidden:'hidden',parents:'parent',children:'child',leftFriends:'left',rightFriends:'right',previous:'previous',next:'next'};
  for(const [group,role] of Object.entries(roleMap)){
    const policy=settings({[group]:['Meeting Date','meeting-date','Meeting Date']},{datePropertyRelations:'left'});
    const records=[entity(meeting),entity(daily),date('MEETING DATE'),date('meeting-date','2026-10-08T00:00:00')];
    const graph=await compile(records,policy);const owned=declarations(graph);
    assert(owned.every(item=>item.sourceKind==='date-property'&&item.relationType===c.RelationType.DEFINED));
    assert.deepEqual(owned.map(d=>[d.fieldName,d.declaredRole,d.rawValue]),[
      ['Meeting Date',role,'2026-10-08'],['Meeting Date',role,'2026-10-08'],['Meeting Date',role,'2026-10-08T00:00:00'],['Meeting Date',role,'2026-10-08T00:00:00'],
      ['meeting-date',role,'2026-10-08'],['meeting-date',role,'2026-10-08T00:00:00']]);
    assert.equal(pair(graph).isHidden,role==='hidden');
    const patch=new c.NormalizedSourcePatchPreparer(meeting.id,policy,runtime(),{entity:ref=>[meeting,daily].some(item=>item.id===ref.id)?entity(ref):undefined});
    await feed(patch,records.filter(item=>item.kind==='date-property'));const result=await patch.finish();assert.equal(result.outcome,'prepared');assert.deepEqual(declarations(result.patch.compilation),owned);
  }
});

/** Execute the actual consumer filter; no mutation safety predicate is reconstructed by this fixture. */
function productionEvidenceFilter(path,name,needle) {
  const file=ts.createSourceFile(path,readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let expression;
  const visit=node=>{
    if(ts.isVariableDeclaration(node)&&node.name.getText(file)===name&&node.initializer?.getText(file).includes(needle)) expression=node.initializer.getText(file);
    ts.forEachChild(node,visit);
  };
  visit(file);assert(expression,`Missing production filter ${name}`);
  return new Function('explanation','evidenceItems',`return ${expression};`);
}

test('configured scalar dates retain date filters and decline direct wiki-link relink/unlink eligibility',async()=>{
  const graph=await compile([entity(meeting),entity(daily),date()],settings({parents:['date']},{datePropertyRelations:'left'}));
  const evidence=graph.evidenceBetween(meeting.id,daily.id);
  assert.equal(evidence.length,1);assert.equal(evidence[0].sourceKind,'date-property');
  assert.equal(evidence[0].relationType,c.RelationType.DEFINED);
  const relink=productionEvidenceFilter('src/ui/PlexGraph.tsx','explicit','explanation.decisions.filter');
  const unlink=productionEvidenceFilter('src/main.ts','frontmatter','evidenceItems.filter');
  assert.deepEqual(relink({decisions:c.applyOntologyPrecedence(evidence)},evidence),[]);
  assert.deepEqual(unlink({},evidence),[]);
  const links=declarations(await compile([entity(meeting),entity(daily),...reference('date')],settings({parents:['date']},{datePropertyRelations:'left'})));
  assert.equal(relink({decisions:links.map(item=>({active:true,evidence:item}))},links).length,1);
  assert.equal(unlink({},links).length,1,'ordinary configured wiki-link declarations keep their existing authorizer');
});

test('configured dates keep explicit property precedence and ordinary wiki-link field roles unchanged',async()=>{
  const policy=settings({parents:['date'],children:['Children'],leftFriends:['working on']},{datePropertyRelations:'left'});
  const selector=new c.ReferencePolicySelector(policy);
  assert.equal(selector.assignmentsForField('DATE').length,1);
  assert.equal(selector.select({...reference('date')[0],normalizedFieldName:'DATE'}).assignments.length,0,'producer normalized identities are not broadened by scalar date normalization');
  const graph=await compile([entity(meeting),entity(daily),date(),...reference('Children','inline')],policy);
  assert.equal(c.classifyRelation(pair(graph),'parent',false),c.RelationType.DEFINED);
  assert.equal(c.classifyRelation(pair(graph),'child',false),null);
  const decisions=c.applyOntologyPrecedence(graph.evidenceBetween(meeting.id,daily.id));
  assert(decisions.some(item=>item.evidence.sourceKind==='inline-ontology'&&!item.active));
  for(const field of ['date','working on']) {
    const records=[entity(meeting),entity(daily),body(),...reference(field)];
    const expected=await compile(records,{...policy,datePropertyRelations:'right'});
    const current=await compile(records,policy);assert.deepEqual(declarations(current),declarations(expected));
    assert.equal(c.classifyRelation(pair(current),field==='date'?'parent':'left',false),c.RelationType.DEFINED);
  }
  const hidden=await compile([entity(meeting),entity(daily),body(),date(),...reference('working on')],settings({hidden:['date'],leftFriends:['working on']},{datePropertyRelations:'left'}));
  assert.equal(pair(hidden).isHidden,true);
  const conflicting=await compile([entity(meeting),entity(daily),date(),...reference('working on')],settings({leftFriends:['working on']},{datePropertyRelations:'parent'}));
  assert.equal(c.classifyRelation(pair(conflicting),'left',false),c.RelationType.DEFINED,'conflicting explicit Date/property roles retain canonical Friend reconciliation');
  const fallback=await compile([entity(meeting),entity(daily),date(),...reference('Children','inline')],settings({children:['Children']},{datePropertyRelations:'parent'}));
  assert(c.applyOntologyPrecedence(fallback.evidenceBetween(meeting.id,daily.id)).some(item=>item.evidence.sourceKind==='inline-ontology'&&!item.active),'default Date role retains explicit property precedence above conflicting inline ontology');
});

test('Date-only definitions explain Date roles while suppression, conflict and non-Date definition reasons stay authoritative',async()=>{
  /** Give the resolver its explicit legacy path facets while retaining actual compiled relations/evidence. */
  const summary=graph=>c.explainResolvedRelationship({...graph.node(meeting.id),path:meeting.semanticPath},{...graph.node(daily.id),path:daily.semanticPath},graph.evidenceBetween(meeting.id,daily.id),false).summary;
  for(const role of ['parent','child','left','right','previous','next']){
    assert.equal(summary(await compile([entity(meeting),entity(daily),body(),date()],settings({}, {datePropertyRelations:role}))),'date-property');
  }
  assert.equal(summary(await compile([entity(meeting),entity(daily),date()],settings({parents:['date']}))),'date-property','configured Date fields retain scalar Date explanation');
  assert.equal(summary(await compile([entity(meeting),entity(daily),date()],settings({hidden:['date']}))),'hidden');
  assert.equal(summary(await compile([entity(meeting),entity(daily),date(),...reference('Children','inline')],settings({children:['Children']}))),'ontology-precedence');
  assert.equal(summary(await compile([entity(meeting),entity(daily),date(),...reference('Children')],settings({children:['Children']}))),'conflicting-defined-roles');
  assert.equal(summary(await compile([entity(meeting),entity(daily),date(),...reference('Parent')],settings({parents:['Parent']}))),'defined-ontology','a matching non-Date definition still uses ordinary ontology explanation');
  assert.equal(summary(await compile([entity(meeting),entity(daily),...reference('Parent')],settings({parents:['Parent']}))),'defined-ontology');
});

test('native declarative Date role dropdown exposes six localized choices with Parent initial value',()=>{
  const path='src/settings.ts',file=ts.createSourceFile(path,readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true);
  let expression;
  /** Find the actual declarative row by its persisted control key rather than duplicating its schema. */
  const visit=node=>{
    if(ts.isObjectLiteralExpression(node)){
      const control=node.properties.find(item=>ts.isPropertyAssignment(item)&&item.name.getText(file)==='control');
      if(control&&ts.isObjectLiteralExpression(control.initializer)&&control.initializer.properties.some(item=>ts.isPropertyAssignment(item)&&item.name.getText(file)==='key'&&item.initializer.getText(file)==='"datePropertyRelations"'))expression=node.getText(file);
    }
    ts.forEachChild(node,visit);
  };
  visit(file);assert(expression);
  const row=new Function('translate',`return (${expression});`)(host.createTranslator('en'));
  assert.equal(row.name,'Default Date role');assert.match(row.desc,/Configured field ontology always takes precedence/);
  assert.equal(row.control.type,'dropdown');assert.equal(row.control.defaultValue,'parent');
  assert.deepEqual(row.control.options,{parent:'Parent',left:'Friend',child:'Child',right:'Challenger',previous:'Previous',next:'Next'});
});

test('six-role persistence, foreign import, semantic invalidation and historical signature migration are conservative',()=>{
  assert.equal(host.DEFAULT_SETTINGS.datePropertyRelations,'parent');
  for(const raw of [undefined,{}, {datePropertyRelations:'future'},{datePropertyRelations:null},{datePropertyRelations:2},{datePropertyRelations:'inferred'},{datePropertyRelations:'ontology'}]){
    assert.equal(host.migrateAndMergeSettings(raw).datePropertyRelations,'parent');
  }
  for(const role of ['parent','child','left','right','previous','next'])assert.equal(host.migrateAndMergeSettings({datePropertyRelations:role}).datePropertyRelations,role);
  const current=host.migrateAndMergeSettings({datePropertyRelations:'right',futureCompanion:{keep:true}});assert.deepEqual(current.futureCompanion,{keep:true});
  assert.equal(host.importExcaliBrainGraphSettings({datePropertyRelations:'child'},current).datePropertyRelations,'right');
  const before=host.migrateAndMergeSettings({});const impact=c.classifySettingsChange(c.captureSettingsPolicy(before),c.captureSettingsPolicy(current));assert(impact.semanticInvalidation);assert(impact.changedKeys.includes('datePropertyRelations'));assert.deepEqual(c.sanitizeChangedSettingKeys(['private','datePropertyRelations']),['datePropertyRelations']);
  assert.equal(host.graphCompilerSettingsFromLegacy(current).datePropertyRelations,'right');assert.equal(host.semanticIndexSettingsFromLegacy(current).datePropertyRelations,'right');
  const signature=c.encodeIndexSettingsSignature(before),v4=JSON.parse(signature);assert.equal(v4.signatureVersion,4);
  const v3={...v4,signatureVersion:3,datePropertyRelations:'ontology'};
  const v2={...v4,signatureVersion:2};delete v2.datePropertyRelations;
  const legacy={schema:1,hierarchy:before.hierarchy,inferAllLinksAsFriends:before.inferAllLinksAsFriends,inverseInfer:before.inverseInfer,showFullTagName:before.showFullTagName,noteTypeField:before.noteTypeField,primaryTagField:before.primaryTagField,tagStyleList:before.tagStyleList,maxLabelLength:before.baseNodeStyle.maxLabelLength};
  for(const role of ['parent','child','left','right','previous','next']){
    const policy={...before,datePropertyRelations:role};assert.equal(c.compareIndexSettingsSignature(c.encodeIndexSettingsSignature(policy),policy).compatible,true);
    for(const saved of [v3,{...v3,datePropertyRelations:'inferred'},v2,legacy]){
      const result=c.compareIndexSettingsSignature(JSON.stringify(saved),policy);assert.equal(result.reason,'semantic-settings-changed');assert.deepEqual(result.changedKeys,['datePropertyRelations']);
    }
  }
  const changed=c.compareIndexSettingsSignature(signature,current);assert.equal(changed.reason,'semantic-settings-changed');assert.deepEqual(changed.changedKeys,['datePropertyRelations']);
  const missing={...v4};delete missing.datePropertyRelations;
  for(const saved of [{...v4,datePropertyRelations:'future'},{...v4,datePropertyRelations:'inferred'},missing,{...v4,signatureVersion:5},{...v3,datePropertyRelations:'parent'},{...v2,datePropertyRelations:'parent'},{...v4,privateKey:true}])assert.equal(c.compareIndexSettingsSignature(JSON.stringify(saved),before).reason,'signature-format-unknown');
});
