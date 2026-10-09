/** Actual native suggester matching, compatibility oracle and deadline-bounded long editor inputs. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';

const temp=mkdtempSync(join(tmpdir(),'kplex-ontology-suggester-'));
process.once('exit',()=>rmSync(temp,{recursive:true,force:true}));
const entry=join(temp,'suggester.mjs');
await build({stdin:{resolveDir:process.cwd(),contents:'export {OntologySuggester} from "./src/editor/OntologySuggester";',loader:'ts'},outfile:entry,bundle:true,platform:'node',format:'esm',plugins:[{name:'native-owner-boundary',setup(builder){builder.onResolve({filter:/^obsidian$/},()=>({path:'obsidian',namespace:'native'}));builder.onLoad({filter:/.*/,namespace:'native'},()=>({contents:'export class EditorSuggest {constructor(app){this.app=app;this.context=null}}',loader:'js'}));}}]});
const {OntologySuggester}=await import(pathToFileURL(entry).href);
const defaults={allowOntologySuggester:true,ontologySuggesterTrigger:':::',ontologySuggesterParentTrigger:'::p',ontologySuggesterChildTrigger:'::c',ontologySuggesterLeftFriendTrigger:'::l',ontologySuggesterRightFriendTrigger:'::r',ontologySuggesterPreviousTrigger:'::e',ontologySuggesterNextTrigger:'::n',ontologySuggesterMidSentenceTrigger:'(',primaryTagField:'Tags',boldFields:false,hierarchy:{hidden:['Hidden'],parents:['Parent','Progenitor'],children:['Child'],leftFriends:['Friend'],rightFriends:['Challenger'],previous:['Previous'],next:['Next']}};

/** Exercise the unchanged native editor port and return its exact trigger/query replacement span. */
function invoke(owner,text,cursor={line:3,ch:text.length}) {return owner.onTrigger(cursor,{getLine:()=>text},null)}
/** Frozen prior matcher defines compatibility for short bounded custom inputs only. */
function legacy(text,settings,cursor={line:3,ch:text.length}) {
  if(!settings.allowOntologySuggester)return null;
  const before=text.substring(0,cursor.ch);
  const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const keys=['ontologySuggesterTrigger','ontologySuggesterParentTrigger','ontologySuggesterChildTrigger','ontologySuggesterLeftFriendTrigger','ontologySuggesterRightFriendTrigger','ontologySuggesterPreviousTrigger','ontologySuggesterNextTrigger'];
  for(const key of keys)for(const prefix of ['',settings.ontologySuggesterMidSentenceTrigger]){
    const trigger=settings[key],match=before.match(new RegExp(`(?:^|.*\\s)?${escape(prefix+trigger)}([^\\s:]*)$`));
    if(match){const query=match[1]??'';return{end:cursor,start:{line:cursor.line,ch:Math.max(0,cursor.ch-query.length-trigger.length)},query}}
  }
  return null;
}

test('native role precedence, query filtering, captured insertion range and live settings are retained',()=>{
  const plugin={app:{},settings:structuredClone(defaults)},owner=new OntologySuggester(plugin);
  const cases=[[':::',defaults.hierarchy.hidden.concat(defaults.hierarchy.parents,defaults.hierarchy.children,defaults.hierarchy.leftFriends,defaults.hierarchy.rightFriends,defaults.hierarchy.previous,defaults.hierarchy.next,'Tags').sort((a,b)=>a.localeCompare(b,undefined,{sensitivity:'base'}))],['::p',defaults.hierarchy.parents],['::c',defaults.hierarchy.children],['::l',defaults.hierarchy.leftFriends],['::r',defaults.hierarchy.rightFriends],['::e',defaults.hierarchy.previous],['::n',defaults.hierarchy.next]];
  for(const [trigger,fields] of cases){const info=invoke(owner,`Some prose (${trigger}`);assert.deepEqual(info,legacy(`Some prose (${trigger}`,plugin.settings));assert.deepEqual(owner.getSuggestions({...info,editor:{}}),fields)}
  const text='Some prose (::pPro trailing';const cursor={line:7,ch:'Some prose (::pPro'.length};
  const info=invoke(owner,text,cursor);assert.equal(info.query,'Pro');assert.deepEqual(owner.getSuggestions({...info,editor:{}}),['Progenitor']);
  let replacement;owner.context={editor:{replaceRange:(...args)=>{replacement=args}}};owner.selectSuggestion('Progenitor');
  assert.deepEqual(replacement,['Progenitor:: ',info.start,info.end]);assert.equal(text.substring(0,info.start.ch),'Some prose (');
  plugin.settings.boldFields=true;owner.selectSuggestion('Parent');assert.equal(replacement[0],'**Parent**:: ');
  plugin.settings.ontologySuggesterParentTrigger='🧠+';const custom='prefix 🧠+Pa';assert.deepEqual(invoke(owner,custom),legacy(custom,plugin.settings));
  plugin.settings.allowOntologySuggester=false;assert.equal(owner.onTrigger(cursor,{getLine:()=>{throw new Error('disabled owner must not read editor content')}},null),null);
});

test('bounded custom triggers preserve the prior matcher including embedded/repeated tokens and whitespace',()=>{
  const tokens=['x','xx',':','::p','', ' ', '\t',' x','x ','x:x','[.*]+','🧠','é','\u2028x','x\u2028'];
  const atoms=['','a','x',':',' ','\t','\n','\r','\u2028','\u2029','\u00a0','🧠','[.*]+'];
  const texts=new Set();
  for(const a of atoms)for(const b of atoms)for(const c of atoms)texts.add(a+b+c);
  for(const token of tokens)for(const prefix of ['', '(', ' x', '\u2028']){
    const settings={...defaults,ontologySuggesterTrigger:token,ontologySuggesterMidSentenceTrigger:prefix};
    const owner=new OntologySuggester({app:{},settings});
    for(const text of texts)assert.deepEqual(invoke(owner,text),legacy(text,settings),JSON.stringify({token,prefix,text}));
    for(const text of [token+'aaa'+token+'z','a '+token+'foo '+token+'bar','a'+token+'x','\u2028'+token+'x',token+'x\u2028'+token+'z'])assert.deepEqual(invoke(owner,text),legacy(text,settings),JSON.stringify({token,prefix,text}));
  }
});

test('large native no-trigger prose and overlapping custom literal input finish within a subprocess deadline',{timeout:15000},()=>{
  const probe=join(temp,'large-input.mjs');
  writeFileSync(probe,`import assert from 'node:assert/strict';import {OntologySuggester} from './suggester.mjs';const settings=${JSON.stringify(defaults)};const owner=new OntologySuggester({app:{},settings});for(const text of ['Ordinary prose about a quiet afternoon. '.repeat(5000),'z'.repeat(512*1024)])assert.equal(owner.onTrigger({line:0,ch:text.length},{getLine:()=>text},null),null);settings.ontologySuggesterTrigger='a'.repeat(10000)+'b';const repeated='a'.repeat(512*1024);assert.equal(owner.onTrigger({line:0,ch:repeated.length},{getLine:()=>repeated},null),null);const text='Ordinary prose words. '.repeat(5000)+'::pPro';const info=owner.onTrigger({line:0,ch:text.length},{getLine:()=>text},null);assert.equal(info.query,'Pro');assert.equal(info.start.ch,text.length-6);console.log('bounded real owner passed');`);
  const result=spawnSync(process.execPath,[probe],{encoding:'utf8',timeout:8000});
  assert.equal(result.error,undefined,result.error?.message);assert.equal(result.status,0,result.stdout+result.stderr);assert.match(result.stdout,/bounded real owner passed/);
});
