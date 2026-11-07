/** Real Moment plus native filename doubles verify journal lookup without body reads or index work.
 * Portable calendar arithmetic and chronological side selection share the production implementation. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {buildSync} from 'esbuild';
import moment from 'moment';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const output=buildSync({stdin:{contents:`export * from './src/adapters/obsidian/dailyNoteNavigation';export * from './src/core/plex/calendarDates';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'cjs',external:['obsidian']}).outputFiles[0].text;
class TFile {constructor(path){this.path=path;this.name=path.split('/').at(-1);this.basename=this.name.slice(0,-3);this.extension='md';}}
class TFolder {constructor(path){this.path=path;this.children=[];}}
const module={exports:{}};Function('module','exports','require',output)(module,module.exports,()=>({TFile,TFolder}));const M=module.exports;
const main=ts.createSourceFile('main.ts',readFileSync('src/main.ts','utf8'),ts.ScriptTarget.Latest,true),names=['dailyNoteGapDirections','openDailyNoteGapLink','navigateDailyNote'];
const declaration=main.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='KplexPlugin');
const methods=names.map(name=>{const method=declaration.members.find(node=>node.name?.getText(main)===name);assert(method,'Missing production method '+name);return method.getText(main)});
const hostOutput=ts.transpileModule(`class JournalHost{${methods.join('\n')}}exports.JournalHost=JournalHost`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
class CreationPrompt {constructor(...args){this.path=args[2];this.createNote=args[6]}open(){this.opened=true}}
const loaded={};Function('exports','collectDailyNotes','dailyNoteDate','dailyEntryForDate','dailyNotesSettingsCurrent','readDailyPinSettings','adjacentJournalEntry','missingJournalDirections','Notice','calendarDay','dailyNotePath','CreatePeriodicNoteModal',hostOutput)(loaded,M.collectDailyNotes,M.dailyNoteDate,M.dailyEntryForDate,M.dailyNotesSettingsCurrent,app=>({folder:app.internalPlugins.getPluginById().instance.options.folder,format:app.internalPlugins.getPluginById().instance.options.format}),M.adjacentJournalEntry,M.missingJournalDirections,class{constructor(text){this.text=text}},M.calendarDay,M.dailyNotePath,CreationPrompt);

/** Construct only native folder/file metadata; all body/index effects are forbidden. */
function fixture({folder='Daily',format='YYYY-MM-DD dddd'}={}){
 const old=globalThis.window;globalThis.window={moment,setTimeout};const root=new TFolder(''),files=new Map([['',root]]);
 const instance={options:{folder,format}},app={internalPlugins:{getPluginById:()=>({enabled:true,instance})},fileManager:{getNewFileParent:()=>root},vault:{
  getRoot:()=>root,getFileByPath:path=>files.get(path) instanceof TFile?files.get(path):null,getFolderByPath:path=>files.get(path) instanceof TFolder?files.get(path):null,
  getFiles:()=>{throw Error('No global file scan')},getMarkdownFiles:()=>{throw Error('No global Markdown scan')},read:()=>{throw Error('No body reads')},create:()=>{throw Error('No implicit creation')}}};
 const add=path=>{let parent=root;const parts=path.split('/');for(let i=0;i<parts.length-1;i++){const key=parts.slice(0,i+1).join('/');if(!files.has(key)){const next=new TFolder(key);parent.children.push(next);files.set(key,next)}parent=files.get(key)}const file=new TFile(path);parent.children.push(file);files.set(path,file);return file};
 return {app,files,instance,add,restore:()=>{globalThis.window=old}};
}

test('nested daily notes retain their actual paths and nearest dates skip missing journal days',async()=>{
 const f=fixture();try{
  const previous=f.add('Daily/2026/2026-11-03 Tuesday.md'),source=f.add('Daily/2026/2026-11-07 Saturday.md'),next=f.add('Daily/2026/2026-11-12 Thursday.md');
  f.add('Daily/Not a date.md');f.add('Daily/2026-11-04 Saturday.md');f.add('Dailyish/2026-11-06 Friday.md');f.add('Private/2026-11-08 Sunday.md');
  const entries=await M.collectDailyNotes(f.app,()=>true);assert.deepEqual(entries.map(e=>e.date),['2026-11-03','2026-11-07','2026-11-12']);
  assert.equal(M.dailyNoteDate(f.app,source),'2026-11-07');assert.equal(M.adjacentJournalEntry(entries,'2026-11-07','previous').file,previous);assert.equal(M.adjacentJournalEntry(entries,'2026-11-07','next').file,next);
  assert.equal(M.dailyEntryForDate(f.app,entries,'2026-11-03').file,previous);assert.equal(M.dailyNotePath(f.app,'2026-11-07'),'Daily/2026-11-07 Saturday.md');
  assert.deepEqual(M.missingJournalDirections('2026-11-07',['2026-11-03']),['next']);assert.deepEqual(M.missingJournalDirections('2026-11-07',['2026-11-12']),['previous']);assert.deepEqual(M.missingJournalDirections('2026-11-07',['2026-11-03','2026-11-12']),[]);
 }finally{f.restore()}
});

test('formatted year folders and additional archive directories never borrow the current year',async()=>{
 const f=fixture({format:'YYYY/MM-DD'});try{
  const historical=f.add('Daily/Archive/2020/02-29.md');f.add('Daily/Archive/nested/02-29.md');f.add('Daily/2021/02-29.md');
  assert.equal(M.dailyNoteDate(f.app,historical),'2020-02-29');assert.deepEqual((await M.collectDailyNotes(f.app,()=>true)).map(e=>e.date),['2020-02-29']);
  assert.equal(M.dailyNotePath(f.app,'2020-02-29'),'Daily/2020/02-29.md');assert.equal(M.dailyNotePath(f.app,'2021-02-29'),null);
 }finally{f.restore()}
});

test('configured exact file wins duplicate dates and deleted native identities cannot become candidates',async()=>{
 const f=fixture();try{
  const old=f.add('Daily/2026/2026-11-07 Saturday.md'),preferred=f.add('Daily/2026-11-07 Saturday.md'),entries=await M.collectDailyNotes(f.app,()=>true);
  assert.equal(M.dailyEntryForDate(f.app,entries,'2026-11-07').file,preferred);f.files.delete(old.path);assert.equal(M.dailyNoteDate(f.app,old),null);
  assert.equal(M.adjacentJournalEntry(entries,'2026-11-07','next'),null);assert.equal(M.adjacentJournalEntry(entries,'2026-11-07','previous'),null);
 }finally{f.restore()}
});

for(const reason of ['dismissed','settings'])test('cooperative folder traversal retires on '+reason,async()=>{
 const f=fixture({format:'YYYY-MM-DD'});try{
  for(let i=0;i<130;i++)f.add('Daily/'+M.shiftCalendarDay('2026-01-01',i)+'.md');let current=true,yields=0;
  window.setTimeout=callback=>{yields++;if(reason==='dismissed')current=false;else f.instance.options.folder='Other';return setTimeout(callback,0)};
  assert.equal(await M.collectDailyNotes(f.app,()=>current),null);assert.equal(yields,1);
 }finally{f.restore()}
});

test('calendar dates handle leap years, month rollover, locale week starts and strict invalid values',()=>{
 assert.equal(M.calendarDay('2026-02-29'),null);assert.equal(M.calendarDay('2024-02-29')?.getDate(),29);assert.equal(M.calendarDay('2026-2-03'),null);
 assert.equal(M.shiftCalendarDay('2024-02-29',1),'2024-03-01');assert.equal(M.shiftCalendarMonth('2024-01-31',1),'2024-02-01');
 assert.equal(M.shiftCalendarDay('2026-12-31',1),'2027-01-01');const days=M.calendarMonthDays('2024-02-29',1);
 assert.equal(days.length,42);assert.equal(days[0],'2024-01-29');assert.equal(days.at(-1),'2024-03-10');assert.equal(M.calendarDayKey(M.calendarDay('2026-03-29')),'2026-03-29');
});

/** Compose actual plugin methods over read-only filename and modal/save receipts. */
function journalHost(f,source,targets){
 const pages=new Map([source,...targets].map(file=>[file.path,{path:file.path,file,neighbours:new Map()}])),dialogs=[],writes=[],navigation=[];
 const host=Object.assign(new loaded.JournalHost(),{app:f.app,settings:{dailyNoteLinkFields:{previous:'Yesterday',next:'Tomorrow'}},unloading:false,
  actionSurfaceHosts:new Map([['surface',{generation:1}]]),actionDialogs:new Map(),index:{get:path=>pages.get(path),isConnected:(page,target)=>page.neighbours.has(target),insertCreatedFile:()=>{throw Error('Known native candidate must remain its indexed identity')}},
  ontologyRoleForField:field=>field==='Yesterday'?'parent':field==='Tomorrow'?'child':null,defaultOntologyField:role=>role,saveSettings:async(...args)=>{writes.push(args)},translator:key=>key,
  finishNewRelatedNode:async(...args)=>{navigation.push(args)},
  openRelationModal:options=>{const dialog={options};dialogs.push(dialog);return dialog}});
 return {host,pages,dialogs,writes,navigation};
}

test('gap linking proposes the nearest existing file and remembers previous/next fields independently of Parent/Child roles',async()=>{
 const f=fixture();try{
  const source=f.add('Daily/2026/2026-11-07 Saturday.md'),before=f.add('Daily/2026/2026-11-03 Tuesday.md'),after=f.add('Daily/2026/2026-11-12 Thursday.md'),j=journalHost(f,source,[before,after]),origin=j.pages.get(source.path);
  await j.host.openDailyNoteGapLink(origin,'previous',{},'surface',()=>true);assert.equal(j.dialogs.length,1);
  const previous=j.dialogs[0].options;assert.equal(previous.fixedTarget.file,before);assert.equal(previous.semanticRole,'parent');assert.equal(previous.invocation.initialOntology,'Yesterday');assert.equal(previous.invocation.additiveOnly,true);assert.equal(j.writes.length,0);
  await previous.invocation.onOntologySelected('Prior journal entry');assert.deepEqual(j.host.settings.dailyNoteLinkFields,{previous:'Prior journal entry',next:'Tomorrow'});assert.deepEqual(j.writes,[[false,false]]);
  await j.host.openDailyNoteGapLink(origin,'next',{},'surface',()=>true);const next=j.dialogs[1].options;assert.equal(next.fixedTarget.file,after);assert.equal(next.semanticRole,'child');assert.equal(next.invocation.initialOntology,'Tomorrow');
  previous.invocation.onClosed();assert.equal(j.host.actionDialogs.size,1);
  origin.neighbours.set(before.path,{target:j.pages.get(before.path)});assert.deepEqual(j.host.dailyNoteGapDirections(origin),['next']);
  await j.host.openDailyNoteGapLink(origin,'previous',{},'surface',()=>true);assert.equal(j.dialogs.length,2,'Existing chronological connector cannot open a duplicate link proposal');
 }finally{f.restore()}
});

test('a native source replacement during cooperative gap discovery cannot open a composer on a different file',async()=>{
 const f=fixture({format:'YYYY-MM-DD'});try{
  const source=f.add('Daily/2026-11-07.md');for(let i=0;i<130;i++)f.add('Daily/'+M.shiftCalendarDay('2026-01-01',i)+'.md');
  const j=journalHost(f,source,[]);window.setTimeout=callback=>{f.files.set(source.path,new TFile(source.path));return setTimeout(callback,0)};
  await j.host.openDailyNoteGapLink(j.pages.get(source.path),'previous',{},'surface',()=>true);assert.equal(j.dialogs.length,0);assert.equal(j.writes.length,0);
 }finally{f.restore()}
});

test('calendar selection rechecks newly arrived historical notes before proposing canonical-path creation',async()=>{
 const f=fixture();try{
  const source=f.add('Daily/2026/2026-11-07 Saturday.md'),newlyArrived=f.add('Daily/Archive/2026-11-10 Tuesday.md'),j=journalHost(f,source,[newlyArrived]);
  await j.host.navigateDailyNote('2026-11-10',[],{},'surface',()=>true);
  assert.equal(j.navigation.length,1);assert.equal(j.navigation[0][0].file,newlyArrived);assert.equal(j.navigation[0][2],'follow');assert.equal(j.host.actionDialogs.size,0);assert.equal(j.writes.length,0);
 }finally{f.restore()}
});

test('missing calendar dates only open a confirmation and never create a note during lookup',async()=>{
 const f=fixture();try{
  const source=f.add('Daily/2026/2026-11-07 Saturday.md'),j=journalHost(f,source,[]),inventory=f.files.size;
  await j.host.navigateDailyNote('2026-11-10',[],{},'surface',()=>true);
  const [prompt]=j.host.actionDialogs.keys();assert(prompt instanceof CreationPrompt);assert.equal(prompt.path,'Daily/2026-11-10 Tuesday.md');assert.equal(prompt.opened,true);assert.equal(typeof prompt.createNote,'function');assert.equal(f.files.size,inventory);assert.equal(j.navigation.length,0);assert.equal(j.writes.length,0);
 }finally{f.restore()}
});
