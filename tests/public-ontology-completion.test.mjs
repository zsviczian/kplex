/** Real public composition/native-owner parity over settings-only completion. Obsidian shell
 * doubles provide registration/editor context; production matching, projection and envelopes
 * remain intact. Any graph/source/status access beyond scalar revisions fails the fixture. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import ts from 'typescript';

const directory=mkdtempSync(join(tmpdir(),'kplex-public-completion-'));
process.once('exit',/** Retire only this test's generated bundle. */()=>rmSync(directory,{recursive:true,force:true}));
const outfile=join(directory,'completion.mjs');
const source=ts.createSourceFile('main.ts',readFileSync('src/main.ts','utf8'),ts.ScriptTarget.Latest,true);
const pluginClass=source.statements.find(/** Use the real owning plugin class. */ node=>ts.isClassDeclaration(node)&&node.name?.text==='KplexPlugin');
const persistence=pluginClass.members.find(/** Extract production code, never a second settings observer. */ node=>ts.isMethodDeclaration(node)&&node.name.getText(source)==='persistSettingsSnapshot');
assert(persistence,'Missing production settings boundary');
await build({stdin:{resolveDir:process.cwd(),loader:'ts',contents:`export {createPublicApi} from './src/publicApi/createPublicApi';export {OntologySuggester} from './src/editor/OntologySuggester';export {migrateAndMergeSettings} from './src/settings';/** Finite fixture for the actual submitted-write observation boundary. */ export class SettingsOwnerFixture {${persistence.getText(source)}}`},outfile,bundle:true,platform:'node',format:'esm',plugins:[{name:'native-shell-only',
  /** Supply unused native UI classes without mocking a production completion owner. */
  setup(builder){
    builder.onResolve({filter:/^obsidian$/},/** Isolate the Obsidian import. */()=>({path:'obsidian',namespace:'native'}));
    builder.onLoad({filter:/.*/,namespace:'native'},/** Selection uses the real owner over this finite editor context. */()=>({contents:'export class EditorSuggest {constructor(app){this.app=app;this.context=null}} export class Component {load(){} unload(){}} export const MarkdownRenderer={render:()=>{throw Error("Unexpected Markdown rendering")}}; export class App {} export class Modal {} export class SuggestModal extends Modal {} export class ColorComponent {} export class Notice {} export class AbstractInputSuggest {} export class PluginSettingTab {} export class Scope {} export class Setting {} export class ButtonComponent {} export class ExtraButtonComponent {} export class SearchComponent {} export const setIcon=()=>{},setTooltip=()=>{},getIcon=()=>null,getIconIds=()=>[],getLanguage=()=>"en",Platform={};'}));
  }}]});
globalThis.window={crypto:{randomUUID},performance};
const M=await import(pathToFileURL(outfile).href);

/** Compose the real API before graph readiness; accidental source/graph capabilities throw. */
function fixture(overrides={}){
  const settings=M.migrateAndMergeSettings({ontologyPairingVersion:1,hierarchy:{parents:['Parent/Child','Ancestor'],children:[],leftFriends:['Friend/Ally'],rightFriends:['Challenge'],previous:['Before/After'],next:[],hidden:['Hidden'],exclusions:[]},ontologyDescriptions:{Parent:'Authored <b>literal</b> meaning.',Child:'Independent inverse meaning.'},...overrides});
  const accesses=[],lifetime={alive:true};
  const index=new Proxy({getSemanticRevision:/** Scalar revision is passive. */()=>1},{
    /** No coverage, search, hydration, indexing or source capability is permitted. */
    get(target,key){accesses.push(String(key));if(key==='getSemanticRevision')return target[key];throw Error('Unexpected index access: '+String(key));},
  });
  const plugin={settings,index,app:{},getIndexSourceRevision:/** Source revision is passive. */()=>2};
  const owner=M.createPublicApi(plugin,/** The host can begin retirement before releasing the service. */()=>lifetime.alive,/** Completion never requests graph status. */()=>{throw Error('Unexpected status read');});
  return {settings,plugin,owner,api:owner.api.v1,accesses,lifetime};
}

/** Compare exact public ranges, queries and ordered physical names with native EditorSuggest. */
function parity(host,text,cursor=text.length){
  const result=host.api.completeOntology({text,cursor,limit:100});assert.equal(result.ok,true,JSON.stringify(result));
  const before=text.slice(0,cursor),lineStart=Math.max(before.lastIndexOf('\n'),before.lastIndexOf('\r'),before.lastIndexOf('\u2028'),before.lastIndexOf('\u2029'))+1;
  const native=new M.OntologySuggester(host.plugin),info=native.onTrigger({line:4,ch:cursor-lineStart},{getLine:/** Supply the actual current logical line. */()=>text.slice(lineStart)},null);
  if(!info){assert.equal(result.value.state,host.settings.allowOntologySuggester?'no-match':'disabled');return result;}
  assert.equal(result.value.state,'matched');assert.deepEqual(result.value.context.range,{start:lineStart+info.start.ch,end:cursor});assert.equal(result.value.context.query,info.query);
  assert.deepEqual(result.value.items.map(/** Compare physical insertion names, not annotations. */ item=>item.name),native.getSuggestions({...info,editor:{}}));
  return result;
}

test('completion is discoverable and configuration-complete before any graph or canvas exists',/** Exercise actual API composition and passive ownership. */()=>{
  const h=fixture(),caps=h.api.capabilities();assert(caps.ok);assert(caps.value.operations.includes('completeOntology'));
  const result=parity(h,':::');assert.equal(result.coverage.scope,'configuration');assert.equal(result.coverage.complete,true);assert.equal(result.coverage.pending,false);
  assert.equal(result.value.items[0].name,'After');assert(result.value.items.some(/** Generic selection retains the configured tag field. */ item=>item.name===h.settings.primaryTagField));
  assert(h.accesses.every(/** No graph/source capability was used. */ key=>key==='getSemanticRevision'));h.owner.dispose();
});

test('native/public parity preserves roles, generic/role collisions, historical/custom/empty triggers and filtering',/** Both consumers use the same real owner. */()=>{
  const h=fixture();
  for(const trigger of [':::','::p','::c','::f','::r','::s','::n'])for(const query of ['','a','Parent','unlikely'])parity(h,'Prose ('+trigger+query+') suffix',('Prose ('+trigger+query).length);
  h.settings.ontologySuggesterLeftFriendTrigger='::l';h.settings.ontologySuggesterPreviousTrigger='::e';
  for(const text of ['::l','::eB','(::lAl','[:::Par'])parity(h,text);
  h.settings.ontologySuggesterParentTrigger='🧠[.*]+';h.settings.ontologySuggesterMidSentenceTrigger='<<';parity(h,'Prefix <<🧠[.*]+Par');
  h.settings.ontologySuggesterTrigger=h.settings.ontologySuggesterParentTrigger;parity(h,'🧠[.*]+');
  h.settings.ontologySuggesterTrigger='';parity(h,'Ordinary Parent');
  h.settings.ontologySuggesterTrigger=':::';h.settings.ontologySuggesterLeftFriendTrigger='';parity(h,'::eBefore');h.owner.dispose();
});

test('offsets are absolute UTF-16 on the current logical line and preserve text after the cursor',/** Surrogates, CRLF and Unicode line separators must not shift ranges. */()=>{
  const h=fixture();
  for(const separator of ['\n','\r\n','\u2028','\u2029']){
    const text='😀 previous'+separator+'(::pPar) unrelated',cursor=text.indexOf('Par)')+3,result=parity(h,text,cursor);
    assert.equal(text.slice(result.value.context.range.start,result.value.context.range.end),'::pPar');assert.equal(text.slice(cursor),') unrelated');
  }
  h.owner.dispose();
});

test('inverse annotations stay inert and exact physical spelling is detached from settings',/** Mutation of returned data cannot edit a field or description. */()=>{
  const h=fixture(),result=parity(h,':::Parent');
  assert.deepEqual(result.value.items.map(/** Direct matches precede inverse-only matches. */ item=>item.name),['Parent','Child']);
  assert.equal(result.value.items[0].description,'Authored <b>literal</b> meaning.');assert.equal(result.value.items[1].description,'Independent inverse meaning.');
  assert.equal(result.value.items[1].partner,'Parent');result.value.items[0].roles.push('hidden');result.value.items[0].name='Mutated';
  const fresh=h.api.completeOntology({text:':::Parent',cursor:9});assert.equal(fresh.value.items[0].name,'Parent');assert.deepEqual(fresh.value.items[0].roles,['parent']);h.owner.dispose();
});

test('no-trigger, disabled, empty-result and unloaded states remain distinguishable',/** A retained old API never consults its retired provider. */()=>{
  const h=fixture();assert.equal(parity(h,'ordinary prose').value.state,'no-match');
  const empty=parity(h,':::nothing-matches');assert.equal(empty.value.state,'matched');assert.deepEqual(empty.value.items,[]);
  h.settings.allowOntologySuggester=false;assert.equal(parity(h,':::').value.state,'disabled');
  h.owner.dispose();const count=h.accesses.length;assert.equal(h.api.completeOntology({text:':::',cursor:3}).error.code,'API_UNAVAILABLE');assert.equal(h.accesses.length,count);
  const fresh=M.createPublicApi(h.plugin,/** Fresh plugin incarnation. */()=>true,/** Status is still outside the request. */()=>{throw Error('Unexpected status');});
  assert.notEqual(fresh.api,h.owner.api);assert.equal(fresh.api.v1.completeOntology({text:':::',cursor:3}).value.state,'disabled');fresh.dispose();
});

test('input/result budgets, cancellation and full revision fences use ordinary API envelopes',/** Limits reject input instead of silently shifting replacement offsets. */()=>{
  const h=fixture();
  for(const cursor of [-1,4,1.5,NaN,Infinity,'3'])assert.equal(h.api.completeOntology({text:':::',cursor}).error.code,'INVALID_ARGUMENT');
  for(const limit of [0,-1,101,1.5,'2'])assert.equal(h.api.completeOntology({text:':::',cursor:3,limit}).error.code,'INVALID_ARGUMENT');
  assert.equal(h.api.completeOntology({text:'x'.repeat(65537),cursor:0}).error.code,'LIMIT_EXCEEDED');
  const clipped=h.api.completeOntology({text:':::',cursor:3,limit:1});assert(clipped.ok);assert.equal(clipped.value.items.length,1);assert.equal(clipped.truncated,true);
  assert.equal(h.api.completeOntology({text:':::',cursor:3,limit:1,requireComplete:true}).error.code,'INDEX_INCOMPLETE');
  assert.equal(h.api.completeOntology({text:':::',cursor:3,isCancelled:/** Cancel before work. */()=>true}).error.code,'CANCELLED');
  h.settings.ontologySuggesterTrigger='@@';const changed=h.api.completeOntology({text:'@@',cursor:2});assert(changed.revision.configuration>clipped.revision.configuration);
  assert.equal(h.api.completeOntology({text:'@@',cursor:2,expectedRevision:clipped.revision}).error.code,'STALE_REVISION');
  h.settings.ontologySuggesterTrigger=':::';h.owner.revisions();const returned=h.api.completeOntology({text:':::',cursor:3});assert(returned.revision.configuration>changed.revision.configuration);
  h.settings.hierarchy.parents=Array.from({length:8193},/** A large configured vocabulary is refused before projection. */(_,index)=>'Field'+index);
  assert.equal(h.api.completeOntology({text:'::p',cursor:3}).error.code,'LIMIT_EXCEEDED');h.owner.dispose();
});

test('a host beginning unload rejects completion before its API owner is disposed',/** No retained callback may read retiring settings. */()=>{
  const h=fixture();h.lifetime.alive=false;
  assert.equal(h.api.completeOntology({text:':::',cursor:3}).error.code,'API_UNAVAILABLE');h.owner.dispose();
});

test('native insertion retains bold and trailing space while public candidates stay plain',/** Completion has no editor mutation authority. */()=>{
  const h=fixture({boldFields:true}),native=new M.OntologySuggester(h.plugin);let edit;
  const info=native.onTrigger({line:0,ch:5},{getLine:/** Read one current line. */()=>'(::pP'},null);
  native.context={editor:{replaceRange:/** Record the real native insertion call. */(...args)=>{edit=args;}}};native.selectSuggestion('Parent');
  assert.deepEqual(edit,['**Parent**:: ',info.start,info.end]);assert.equal(parity(h,'(::pP').value.items[0].name,'Parent');h.owner.dispose();
});

test('actual queued settings boundary observes A-to-B-to-A without intervening API or canvas reads',/** Submitted local edits retire the original result before an asynchronous writer runs. */async()=>{
  const h=fixture(),host=new M.SettingsOwnerFixture(),offered=h.api.completeOntology({text:':::',cursor:3});let writes=0;
  Object.assign(host,{publicApiOwner:h.owner,settings:h.settings,
    enqueueSettingsWrite:/** Model the established asynchronous queue-entry gap. */ effect=>Promise.resolve().then(effect),
    settingsForWrite:/** Supply the current finite live configuration. */()=>h.settings,
    settingsSnapshotForPersistence:/** Identity is sufficient to observe the submission boundary. */(_preferences,settings)=>settings,
    writeSettingsSnapshot:/** Portable tests count writes; native tests verify physical persistence. */async()=>{writes++;},
  });
  h.settings.ontologySuggesterTrigger='@@';const first=host.persistSettingsSnapshot();
  h.settings.ontologySuggesterTrigger=':::';const second=host.persistSettingsSnapshot();
  const current=h.api.completeOntology({text:':::',cursor:3});assert(current.revision.configuration>offered.revision.configuration);
  assert.equal(h.api.completeOntology({text:':::',cursor:3,expectedRevision:offered.revision}).error.code,'STALE_REVISION');
  assert.equal(writes,0);await Promise.all([first,second]);assert.equal(writes,2);h.owner.dispose();
});

test('same-reference description edits cannot revive a captured configuration after A-to-B-to-A saves',/** Legacy imperative settings writers retain dictionary identity. */async()=>{
  const h=fixture(),host=new M.SettingsOwnerFixture(),offered=h.api.completeOntology({text:':::',cursor:3});
  Object.assign(host,{publicApiOwner:h.owner,settings:h.settings,
    enqueueSettingsWrite:/** Preserve the asynchronous queue gap. */ effect=>Promise.resolve().then(effect),
    settingsForWrite:/** No configuration clone hides same-reference edits. */()=>h.settings,
    settingsSnapshotForPersistence:/** Reuse the actual snapshot boundary over this finite fixture. */(_preferences,settings)=>settings,
    writeSettingsSnapshot:/** This test exercises observation, not storage. */async()=>{},
  });
  const original=h.settings.ontologyDescriptions.Parent;
  h.settings.ontologyDescriptions.Parent='Changed';const first=host.persistSettingsSnapshot();
  h.settings.ontologyDescriptions.Parent=original;const second=host.persistSettingsSnapshot();
  assert(h.api.completeOntology({text:':::',cursor:3}).revision.configuration>offered.revision.configuration);
  await Promise.all([first,second]);h.owner.dispose();
});
