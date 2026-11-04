/** Finite core Daily Notes boundary tests. Native acceptance separately proves actual template
 * expansion; these checks prevent empty fallback creation, wrong-path consent and stale effects. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

/** Load the actual adapter while retaining explicit native file identity and calendar ports. */
function subject() {
  class TFile {constructor(path){this.path=path}}
  const files=new Map(),calls=[];let parent='Notes',current=true,release;
  const instance={options:{folder:'Daily',format:'YYYY/MM-DD',template:'Templates/Daily.md'},
    async getDailyNote(date){calls.push({owner:this,date});const file=new TFile('Daily/2026/11-04.md');files.set(file.path,file);return file;}};
  const plugin={enabled:true,instance},app={internalPlugins:{getPluginById:()=>plugin},fileManager:{getNewFileParent:()=>({path:parent})},
    vault:{getFileByPath:path=>files.get(path)??null,create:()=>{throw Error('Adapter must not create an empty substitute')},getFiles:()=>{throw Error('No vault inventory')}}};
  const date={clone(){return this},startOf(unit){assert.equal(unit,'day');return this},isValid:()=>true,format:()=> '2026/11-04'};
  const old=globalThis.window;globalThis.window={moment:()=>date};
  const source=readFileSync(new URL('../src/adapters/obsidian/dailyNotes.ts',import.meta.url),'utf8');
  const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const module={exports:{}};
  Function('module','exports','require',output)(module,module.exports,name=>name==='obsidian'?{TFile}:{periodicPinPath:(folder,formatted)=>`${folder}/${formatted}.md`});
  return {api:module.exports,app,instance,plugin,calls,date,TFile,files,current:()=>current,
    retire:()=>{current=false},setParent:value=>{parent=value},hold:()=>{instance.getDailyNote=()=>new Promise(resolve=>{release=resolve})},
    release:()=>{const file=new TFile('Daily/2026/11-04.md');files.set(file.path,file);release(file)},restore:()=>{globalThis.window=old}};
}

test('configured creation delegates once to the core owner, retaining its date and native file identity',async()=>{
  const f=subject();try{const file=await f.api.createConfiguredDailyNote(f.app,'Daily/2026/11-04.md',f.current);
    assert.equal(file,f.files.get(file.path));assert.equal(f.calls.length,1);assert.equal(f.calls[0].owner,f.instance);assert.equal(f.calls[0].date,f.date);
    assert.equal(f.instance.options.template,'Templates/Daily.md');}finally{f.restore()}
});

test('disabled, absent, retired and mismatched Daily Notes capabilities never create substitutes',async()=>{
  for(const kind of ['disabled','absent','retired','wrong-path']){const f=subject();try{
    if(kind==='disabled')f.plugin.enabled=false;if(kind==='absent')delete f.instance.getDailyNote;if(kind==='retired')f.retire();
    const result=await f.api.createConfiguredDailyNote(f.app,kind==='wrong-path'?'Another.md':'Daily/2026/11-04.md',f.current);
    assert.equal(result,null,kind);assert.equal(f.calls.length,0,kind);
  }finally{f.restore()}}
});

test('dismissal during an accepted core write retires UI effects without deleting the durable note',async()=>{
  const f=subject();try{f.hold();const work=f.api.createConfiguredDailyNote(f.app,'Daily/2026/11-04.md',f.current);f.retire();f.release();
    assert.equal(await work,null);assert(f.files.has('Daily/2026/11-04.md'));}finally{f.restore()}
});

test('default Daily Notes parent is presentation-only and leaves the metadata projection unchanged',()=>{
  const f=subject();try{f.instance.options.folder='';f.setParent('Notes');
    assert.deepEqual(f.api.readDailyNotesSettings(f.app),{folder:'',format:'YYYY/MM-DD'});
    assert.deepEqual(f.api.readDailyPinSettings(f.app),{folder:'Notes',format:'YYYY/MM-DD'});
    assert.equal(f.calls.length,0);}finally{f.restore()}
});
