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

for (const retireView of [false,true]) test(`daily drawing waits for exact metadata after the template write (retired view: ${retireView})`,async()=>{
  const source=ts.createSourceFile('main.ts',readFileSync(new URL('../src/main.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);
  const plugin=source.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='KplexPlugin');
  const declaration=plugin.members.find(node=>node.name?.getText(source)==='finishDailyNoteOpening');
  const code=ts.transpileModule(`class Host{${declaration.getText(source)}}`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  let recognized=false, changed, entered;
  const observing=new Promise(resolve=>{entered=resolve;});
  const file={path:'Daily/Today.md'},other={path:'Daily/Yesterday.md'},switched=[],timers=new Map();
  class FileView{constructor(file,type='markdown'){this.file=file;this.type=type;}getViewType(){return this.type;}}
  const view=new FileView(file),leaf={view};
  const window={setTimeout:callback=>{timers.set(1,callback);return 1;},clearTimeout:id=>timers.delete(id),ExcalidrawAutomate:{
    isExcalidrawFile:candidate=>candidate===file&&recognized,
    toggleViewMode:async target=>{switched.push(target);leaf.view=new FileView(file,'excalidraw');},
  }};
  const Host=Function('window','FileView','getFrontMatterInfo','parseYaml','Notice',code+';return Host;')(window,FileView,
    body=>({exists:body.startsWith('---'),frontmatter:body}),()=>({'excalidraw-plugin':'parsed'}),class{constructor(){assert.fail('Unexpected drawing notice');}});
  const host=Object.assign(new Host(),{createdDailyNotes:new WeakSet([file]),createdEditorWaits:new Map(),app:{
    vault:{getFileByPath:path=>path===file.path?file:other,read:async()=> '---\nexcalidraw-plugin: parsed\n---\n'},
    metadataCache:{on(name,callback){assert.equal(name,'changed');changed=callback;entered();return callback;},offref(ref){assert.equal(ref,changed);changed=null;}},
  }});
  const work=host.finishDailyNoteOpening(leaf,file);
  await observing;
  recognized=true;changed(other);
  assert.deepEqual(switched,[],'Another file cannot release the exact metadata wait');
  if(retireView)leaf.view=new FileView(other);
  changed(file);await work;
  assert.deepEqual(switched,retireView?[]:[view]);
  assert.equal(timers.size,0);assert.equal(host.createdEditorWaits.size,0);assert.equal(changed,null);
});
