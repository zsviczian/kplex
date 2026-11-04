/** Supported File/Vault copy boundary with real binary File objects. No external filesystem
 * mutation capability is supplied; UI/native drop transport has separate browser/Obsidian lanes. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
const built=await build({stdin:{resolveDir:process.cwd(),contents:`export * from './src/adapters/obsidian/externalFileImport'`},bundle:true,write:false,format:'cjs',platform:'node'});
const module={exports:{}};Function('module','exports',built.outputFiles[0].text)(module,module.exports);const M=module.exports;
/** Exact destination incarnations and native create acceptance are independently observable. */
function fixture(){const root={path:'/'},folder={path:'Imports'},folders=new Map([['/',root],['Imports',folder]]),files=new Map(),writes=[];
 const app={vault:{getRoot:()=>root,getFolderByPath:path=>folders.get(path)??null,getFileByPath:path=>files.get(path)??null,getAbstractFileByPath:path=>files.get(path)??folders.get(path)??null,
  createBinary:async(path,bytes)=>{assert(!files.has(path));const file={path,bytes:new Uint8Array(bytes).slice()};writes.push(file);files.set(path,file);return file}}};return{app,root,folder,folders,files,writes};}
const t=key=>key;

for(const name of ['Image.png','Notes.md','résumé.pdf','empty.bin'])test('copy preserves exact bytes, extension and external original: '+name,async()=>{
 const f=fixture(),bytes=name==='empty.bin'?new Uint8Array():new Uint8Array([0,255,128,13,10,65]),source=new File([bytes],name),original=new Uint8Array(await source.arrayBuffer());
 const file=await M.copyExternalFile(f.app,source,name,f.folder,t,()=>true);assert.equal(file.path,'Imports/'+name);assert.deepEqual(file.bytes,original);assert.deepEqual(new Uint8Array(await source.arrayBuffer()),original);assert.equal(f.writes.length,1);
});

for(const name of ['../escape.png','bad/name.png','file.md','a.png/child','CON.png','x?.png','file.png.',''])test('invalid or changed-extension name is rejected before copying: '+name,async()=>{
 const f=fixture(),source=new File(['bytes'],'file.png');assert.equal(M.validateExternalImportName(f.app,source,name,'Imports',t).valid,false);
 await assert.rejects(M.copyExternalFile(f.app,source,name,f.folder,t,()=>true));assert.equal(f.writes.length,0);
});

for(const change of ['cancel','folder-replacement','folder-rename','collision'])test('byte-read await cannot cross '+change,async()=>{
 const f=fixture(),source=new File(['payload'],'File.bin');let release,entered,live=true;
 const gate=new Promise(done=>release=done),held=new Promise(done=>entered=done),read=source.arrayBuffer.bind(source);
 source.arrayBuffer=async()=>{entered();await gate;return read()};const copy=M.copyExternalFile(f.app,source,source.name,f.folder,t,()=>live);await held;
 if(change==='cancel')live=false;if(change==='folder-replacement')f.folders.set('Imports',{path:'Imports'});if(change==='folder-rename')f.folder.path='Moved';if(change==='collision')f.files.set('Imports/File.bin',{path:'Imports/File.bin',untouched:true});
 release();await assert.rejects(copy);assert.equal(f.writes.length,0);if(change==='collision')assert.equal(f.files.get('Imports/File.bin').untouched,true);
});

test('missing destination and oversized input cannot create ancestors or allocate a copy',async()=>{
 const f=fixture();f.folders.delete('Imports');let reads=0;const source=new File(['a'],'File.bin');source.arrayBuffer=async()=>{reads++;return new ArrayBuffer(1)};
 await assert.rejects(M.copyExternalFile(f.app,source,source.name,f.folder,t,()=>true));assert.equal(reads,0);f.folders.set('Imports',f.folder);
 Object.defineProperty(source,'size',{value:M.EXTERNAL_IMPORT_LIMITS.fileBytes+1});await assert.rejects(M.copyExternalFile(f.app,source,source.name,f.folder,t,()=>true),/fileImport.limits/);assert.equal(reads,0);assert.equal(f.writes.length,0);
});

test('directory payloads are explicitly distinguished without enumeration',()=>{
 let read=0;const file=new File(['a'],'A.md');const payload=M.externalFilesPayload({files:[file],items:[{kind:'file',webkitGetAsEntry:()=>({isDirectory:true,createReader:()=>read++})}]});
 assert.equal(payload.directory,true);assert.deepEqual(payload.files,[file]);assert.equal(read,0);
});

/** Browser-shaped entry callbacks model paged discovery without external filesystem mutation. */
function directory(name, pages, calls = []) {
 return {name,isDirectory:true,isFile:false,createReader(){let i=0;return {readEntries(done){calls.push(name);done(pages[i++]??[]);}}}};
}
/** Discovery retains File handles; no test allocates their bytes until explicit copying. */
function entry(name, body='bytes') {return {name,isFile:true,isDirectory:false,file(done){done(new File([body],name));}};}

test('recursive discovery drains every directory page and preserves empty folders before any copy',async()=>{
 const calls=[],first=Array.from({length:100},(_,i)=>entry(`File${i}.bin`));
 const nested=directory('Nested',[[entry('Note.md'),directory('Empty',[[]],calls)],[]],calls);
 const root=directory('Incoming',[first,[nested,entry('Last.bin')],[]],calls),progress=[];
 const inventory=await M.discoverExternalImports({files:[],directory:true,entries:[root]},t,()=>true,(files,dirs)=>progress.push([files,dirs]));
 assert.equal(inventory.files.length,102);assert.deepEqual(inventory.directories,['Incoming','Incoming/Nested','Incoming/Nested/Empty']);
 assert(inventory.files.some(f=>f.relativePath==='Incoming/Nested/Note.md'));assert.equal(inventory.files.at(-1).relativePath,'Incoming/Last.bin');
 assert.equal(calls.filter(name=>name==='Incoming').length,3,'Reader must be drained past the first 100 entries');assert.deepEqual(progress.at(-1),[102,3]);
});

test('directory discovery cancellation stops before processing a delayed page',async()=>{
 let release,entered,live=true;const held=new Promise(done=>entered=done),gate=new Promise(done=>release=done);
 const root={name:'Incoming',isDirectory:true,isFile:false,createReader:()=>({readEntries(done){entered();void gate.then(()=>done([entry('Late.md')]));}})};
 const task=M.discoverExternalImports({files:[],directory:true,entries:[root]},t,()=>live,()=>{});await held;live=false;release();await assert.rejects(task,/endpointChanged/);
});

test('unreadable or duplicate roots and invalid segments cannot silently import a subset',async()=>{
 for(const payload of [
  {files:[],directory:true,entries:[],unreadable:true},
  {files:[],directory:true,entries:[directory('Same',[[]]),directory('Same',[[]])]},
  {files:[],directory:true,entries:[directory('../Escape',[[]])]},
 ])await assert.rejects(M.discoverExternalImports(payload,t,()=>true,()=>{}));
});

test('recursive discovery enforces byte, file and depth limits before reading file contents',async()=>{
 const big=new File(['a'],'Big.bin');Object.defineProperty(big,'size',{value:M.EXTERNAL_IMPORT_LIMITS.fileBytes+1});
 await assert.rejects(M.discoverExternalImports({files:[big],directory:false},t,()=>true,()=>{}),/limits/);
 const many=Array.from({length:M.EXTERNAL_IMPORT_LIMITS.files+1},(_,i)=>new File(['a'],`File${i}.md`));
 await assert.rejects(M.discoverExternalImports({files:many,directory:false},t,()=>true,()=>{}),/limits/);
 let root=directory('Leaf',[[]]);for(let i=0;i<M.EXTERNAL_IMPORT_LIMITS.depth;i++)root=directory('D'+i,[[root],[]]);
 await assert.rejects(M.discoverExternalImports({files:[],directory:true,entries:[root]},t,()=>true,()=>{}),/folderLimits/);
});
