/** Native rename/title workflow with exact file identity and preserved user metadata. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {loadPortableModules} from './support/portableTypeScript.mjs';
const {exports:M}=loadPortableModules(['src/adapters/obsidian/renameNote.ts']);

/** FileManager mutates the same native object; late host changes can be injected before metadata. */
function fixture(extension='md',frontmatter={title:'Old',aliases:['Other name'],keep:42}) {
  const file={path:`Old.${extension}`,extension},files=new Map([[file.path,file]]),calls=[];
  const f={file,files,calls,frontmatter,beforeMetadata:()=>{}};
  f.app={vault:{getFileByPath:path=>files.get(path)??null},metadataCache:{getFileCache:()=>({frontmatter})},fileManager:{
    async renameFile(target,path){calls.push('rename');files.delete(target.path);target.path=path;files.set(path,target)},
    async processFrontMatter(target,mutate){calls.push('metadata');await f.beforeMetadata();mutate(frontmatter)},
  }};return f;
}
/** Localized host guidance is supplied by the native shell. */
const unavailable=()=>Error('endpoint changed');

test('rename updates an existing title after native link maintenance and preserves aliases',async()=>{
  const f=fixture();await M.renameNoteWithDisplayName(f.app,f.file,'Renamed.md','Renamed','title',unavailable);
  assert.deepEqual(f.calls,['rename','metadata']);assert.equal(f.file.path,'Renamed.md');
  assert.deepEqual(f.frontmatter,{title:'Renamed',aliases:['Other name'],keep:42});
});

test('absent titles and attachments never gain document properties',async()=>{
  for(const f of [fixture('md',{keep:'Keep'}),fixture('png')]){
    await M.renameNoteWithDisplayName(f.app,f.file,`New.${f.file.extension}`,'New',M.renameDisplayField(f.app,f.file,'aliases, title'),unavailable);
    assert.deepEqual(f.calls,['rename']);
  }
});

test('the first configured available field supplies the toggle, including both alias spellings',async()=>{
  for(const field of ['aliases','alias','Custom name']){
    const f=fixture('md',{[field]:['Display name','Preserved alias'],title:'Separate title'});
    const selected=M.renameDisplayField(f.app,f.file,`Missing, ${field}, title`);assert.equal(selected,field);
    await M.renameNoteWithDisplayName(f.app,f.file,'New.md','New',selected,unavailable);
    assert.deepEqual(f.frontmatter[field],['New','Preserved alias']);assert.equal(f.frontmatter.title,'Separate title');
  }
  const f=fixture('md',{alias:'Old'});assert.equal(M.renameDisplayField(f.app,f.file,'aliases'),'alias');
  assert.equal(M.renameDisplayField(f.app,f.file,'title'),null,'Unconfigured fallback fields are not invented');
});

test('toggle off renames only the file and preserves every display-name field',async()=>{
  const f=fixture();await M.renameNoteWithDisplayName(f.app,f.file,'New.md','New',null,unavailable);
  assert.deepEqual(f.calls,['rename']);assert.equal(f.frontmatter.title,'Old');
});

test('same-path retry repairs a failed metadata write; title key spelling stays intact',async()=>{
  const f=fixture('md',{Title:'Old'});f.beforeMetadata=()=>{throw Error('write failed')};
  await assert.rejects(M.renameNoteWithDisplayName(f.app,f.file,'New.md','New','title',unavailable),/write failed/);
  f.beforeMetadata=()=>{};await M.renameNoteWithDisplayName(f.app,f.file,'New.md','New','title',unavailable);
  assert.equal(f.calls.filter(call=>call==='rename').length,1);assert.deepEqual(f.frontmatter,{Title:'New'});
});

test('replacement and competing move during the awaited native read reject late title writes',async()=>{
  for(const hazard of ['replace','move']){
    const f=fixture();f.beforeMetadata=()=>{if(hazard==='replace')f.files.set('New.md',{...f.file});else f.file.path='Moved.md'};
    await assert.rejects(M.renameNoteWithDisplayName(f.app,f.file,'New.md','New','title',unavailable),/endpoint changed/);
    assert.equal(f.frontmatter.title,'Old');
  }
});
