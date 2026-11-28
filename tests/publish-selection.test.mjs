/** Observable publication scope, two-phase consent, native authority and recovery contracts. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import test from 'node:test';
import {build} from 'esbuild';

const yaml = createRequire(import.meta.url)('js-yaml');
const obsidian = `
export const Platform = {isMobile: false};
export class FileView {};
export class TextFileView extends FileView {};
export class WorkspaceLeaf {};
export class WorkspaceSplit {};
export const parseLinktext = text => ({path:text,subpath:''});
export const getAllTags = cache => cache.tags ?? [];
export const getFrontMatterInfo = text => {
  const match = /^---\\r?\\n([\\s\\S]*?)\\r?\\n---(?:\\r?\\n|$)/.exec(text);
  return match ? {exists:true, frontmatter:match[1], contentStart:match[0].length}
    : {exists:false, frontmatter:'', contentStart:0};
};`;
const entry=await build({stdin:{contents:`
  export {parsePublishProfile, publishUuid} from './src/application/publish/selection';
  export {createPublishSelection} from './src/adapters/obsidian/publishSelection';
  export {TextFileView, getFrontMatterInfo} from 'obsidian';`, resolveDir:process.cwd()},
  bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'native-boundary',setup(plugin){
    plugin.onResolve({filter:/^obsidian$/},()=>({path:'obsidian',namespace:'native-boundary'}));
    plugin.onLoad({filter:/^obsidian$/,namespace:'native-boundary'},()=>({contents:obsidian}));
  }}]});
const {parsePublishProfile, createPublishSelection, publishUuid, TextFileView, getFrontMatterInfo} = await import(
  'data:text/javascript;base64,'+Buffer.from(entry.outputFiles[0].text).toString('base64'));
globalThis.window = {setTimeout, clearTimeout, crypto: globalThis.crypto};

const aId = '4e1e4d15-cb4a-4ab5-8f3f-ce8ec1c15e51';
const bId = '4e1e4d15-cb4a-4ab5-8f3f-ce8ec1c15e52';
const profile = overrides => parsePublishProfile({version:1, id:'7f43fd0f-8185-43b4-9d65-13045e981c7c', title:'Test',
  entryPath:'Public/Home.md', include:[{kind:'folder',path:'Public',recursive:true}], ...overrides});

/** Event leases model Obsidian object identity, independent native edit and metadata convergence. */
function events() {
  const refs = new Set();
  return {
    on(name, fn) { const ref={name,fn}; refs.add(ref); return ref; },
    offref(ref) { refs.delete(ref); },
    emit(name, ...args) { for (const ref of [...refs]) if (ref.name===name) ref.fn(...args); },
    count() { return refs.size; },
  };
}

/** Model storage as separate from the metadata and buffers that users can concurrently replace. */
function fixture(initial, options = {}) {
  const vaultEvents=events(), metadataEvents=events(), files=new Map(), leaves=[], writes=[], reads=[];
  const f={files, leaves, writes, reads, metadataClean:true, beforeWrite:null, afterWrite:null, noConvergence:false};
  let created=0, activeWrites=0;
  const folders=new Set(['/']);
  /** Preserve bodies verbatim when the simulated native writer updates approved metadata. */
  const content = (frontmatter, body) => Object.keys(frontmatter).length ? `---\n${yaml.dump(frontmatter)}---\n${body}` : body;
  const rowFor = (path, frontmatter={}, tags=[], body='Body stays verbatim.\n\n') => {
    const segments=path.split('/'), name=segments.pop(), text=content(frontmatter, body);
    for (let length=1;length<=segments.length;length++) folders.add(segments.slice(0,length).join('/'));
    const file={name,basename:name.slice(0,-3),extension:'md',path,stat:{ctime:1,mtime:1,size:Buffer.byteLength(text)}};
    const row={file, text, cache:{frontmatter:structuredClone(frontmatter),tags:[...tags]}};
    files.set(path,row);
    return row;
  };
  for (const [path, ...rest] of initial) rowFor(path,...rest);
  const app={
    vault:{...vaultEvents,
      getMarkdownFiles:()=>[...files.values()].map(row=>row.file),
      getFileByPath:path=>files.get(path)?.file??null,
      getFolderByPath:path=>folders.has(path)?{path}:null,
      async read(file){reads.push(file.path);return files.get(file.path).text;},
      async cachedRead(file){return files.get(file.path).text;},
    },
    metadataCache:{...metadataEvents,
      isCacheClean:()=>f.metadataClean,
      getFileCache(file){const row=files.get(file.path); return row?.file===file?row.cache:null;},
    },
    workspace:{iterateAllLeaves(fn){for (const leaf of leaves) fn(leaf);}},
    fileManager:{
      async processFrontMatter(file, mutate){
        assert.equal(++activeWrites,1,'writes overlap');
        try {
          const row=files.get(file.path);
          await f.beforeWrite?.(file);
          const info=getFrontMatterInfo(row.text), before=info.exists?yaml.load(info.frontmatter):{};
          mutate(before);
          row.text=content(before, row.text.slice(info.contentStart));
          file.stat.mtime++;file.stat.size=Buffer.byteLength(row.text);
          writes.push(file.path);
          vaultEvents.emit('modify',file);
          if (!f.noConvergence) {
            row.cache={...row.cache,frontmatter:before};
            metadataEvents.emit('changed',file,row.text,row.cache);
          }
          await f.afterWrite?.(file);
        } finally {activeWrites--;}
      },
    },
  };
  Object.assign(f,{
    selection:createPublishSelection(app,{createId:()=>[aId,bId][created++],yield:async()=>{}, ...options}),
    replace(path){return rowFor(path).file;},
    add(path,frontmatter){const row=rowFor(path,frontmatter);vaultEvents.emit('create',row.file);},
    listeners:()=>vaultEvents.count()+metadataEvents.count(),
    stored:path=>{const info=getFrontMatterInfo(files.get(path).text);return info.exists?yaml.load(info.frontmatter):{};},
  });
  return f;
}

test('profiles validate their version and exact local paths, reserving native bookkeeping keys', () => {
  assert.equal(profile({}).uuidProperty,'kplex-id');
  assert.equal(profile({includePaths:['Public/Home.md','Public/Home.md']}).includePaths.length,1);
  assert.throws(()=>profile({version:2}),/invalid-publish-profile/);
  assert.throws(()=>profile({entryPath:'Public/../Home.md'}),/invalid-publish-profile/);
  assert.throws(()=>profile({uuidProperty:'Position'}),/invalid-publish-profile/);
  assert.throws(()=>profile({exclude:[{kind:'folder',path:'Public'}]}),/invalid-publish-rule/);
  assert.equal(publishUuid(aId.toUpperCase()),aId);
});

test('selection uses exact paths, explicit recursion, canonical nested tags and excludes before inclusion',async()=>{
  const f=fixture([['Public/Home.md'],['Elsewhere/Home.md'],['Public/sub/One.md'],['Public/sub/Secret.md',{},['#Open/Child']],
    ['Other/Public.md',{},['#OPEN/Child']],['Private.md',{},['#Private']]]);
  try{
    const p=profile({include:[{kind:'folder',path:'Public',recursive:false},{kind:'tag',tag:'#open'}],
      includePaths:['Public/sub/Secret.md'],exclude:[{kind:'folder',path:'Public/sub',recursive:true}]});
    const result=await f.selection.preview(p);
    assert.deepEqual(result.selectedPaths,['Other/Public.md','Public/Home.md']);
    assert.equal(result.changes.length,2);assert.ok(result.reviewId);
    assert.deepEqual(f.reads,[]);assert.deepEqual(f.writes,[]);
    assert.equal(f.selection.capture(result.reviewId),null,'proposed UUIDs cannot enter graph export');
  } finally{f.selection.dispose();}
  assert.equal(f.listeners(),0);
});

test('unsupported and unavailable exclusions and relocated exact rules block the review',async()=>{
  const f=fixture([['Public/Home.md',{rating:2,complex:{private:true}}],['Private.md']]);
  try{
    const accessible=await f.selection.preview(profile({exclude:[{kind:'predicate',expression:'note.rating > 4'}]}));
    assert.ok(accessible.reviewId);
    const broken=await f.selection.preview(profile({exclude:[{kind:'predicate',expression:'edge.role == "parent"'},
      {kind:'predicate',expression:'note.complex == "test"'},{kind:'note',path:'Private/Unmoved.md'},{kind:'folder',path:'Moved',recursive:true}]}));
    assert.equal(broken.reviewId,null);
    assert.deepEqual(new Set(broken.issues.map(issue=>issue.code)),new Set(['invalid-predicate','unavailable-predicate','missing-note','missing-folder']));
    assert.deepEqual(f.reads,[]);assert.equal(f.listeners(),0);
  }finally{f.selection.dispose();}
});

test('missing authoritative metadata blocks global duplicate detection without reading private bodies',async()=>{
  const f=fixture([['Public/Home.md',{'kplex-id':aId}],['Private.md',{'kplex-id':aId.toUpperCase()}]]);
  try{
    const duplicate=await f.selection.preview(profile({}));
    assert.equal(duplicate.reviewId,null);assert.deepEqual(duplicate.issues,[{code:'uuid-conflict',path:'Public/Home.md'}]);
    assert.deepEqual(duplicate.changes,[]);assert.equal(f.listeners(),0);
    f.files.get('Private.md').cache=null;
    const incomplete=await f.selection.preview(profile({}));
    assert.deepEqual(incomplete.issues,[{code:'metadata-unavailable',path:'Private.md'}]);
    assert.deepEqual(f.reads,[]);
    f.metadataClean=false;
    assert.deepEqual((await f.selection.preview(profile({}))).issues,[{code:'metadata-unavailable'}]);
  }finally{f.selection.dispose();}
});

test('consent is separate and single-use, updates one native field serially, and needs a fresh export review',async()=>{
  const f=fixture([['Public/Home.md',{'Kplex-Id':'incorrect',private:{keep:['nested']}}],['Public/Sub.md',{Name:'Keep'}],['Private.md']]);
  try{
    const p=profile({}), review=await f.selection.preview(p);
    assert.deepEqual(review.changes,[{path:'Public/Home.md',property:'Kplex-Id',before:'incorrect',after:aId},
      {path:'Public/Sub.md',property:'kplex-id',before:undefined,after:bId}]);
    assert.equal((await f.selection.applyIds(review.reviewId,false)).state,'blocked');
    assert.deepEqual(f.writes,[]);
    // The displayed values are a detached copy. Only the current accepted review authorizes writes.
    review.changes[0].after='rewrite-invalid';
    const outcome=await f.selection.applyIds(review.reviewId,true);
    assert.deepEqual(outcome,{state:'complete',receipts:[{path:'Public/Home.md',state:'saved'},{path:'Public/Sub.md',state:'saved'}],remaining:0});
    assert.deepEqual(f.reads,['Public/Home.md','Public/Sub.md']);
    assert.deepEqual(f.stored('Public/Home.md'),{'Kplex-Id':aId,private:{keep:['nested']}});
    assert.ok(f.files.get('Public/Home.md').text.endsWith('Body stays verbatim.\n\n'));
    assert.equal((await f.selection.applyIds(review.reviewId,true)).state,'stale');
    assert.equal(f.selection.capture(review.reviewId),null);
    const second=await f.selection.preview(p), captured=f.selection.capture(second.reviewId);
    assert.ok(captured?.isCurrent());
    assert.ok(captured.files.every(captured.fileIsCurrent));
    assert.deepEqual(captured.selection.identities,[{path:'Public/Home.md',id:aId},{path:'Public/Sub.md',id:bId}]);
    f.add('Copied Template.md',{'kplex-id':aId});
    assert.equal(captured.isCurrent(),false);
    assert.equal(f.selection.capture(second.reviewId),null);
  }finally{f.selection.dispose();}
  assert.equal(f.listeners(),0);
});

test('dirty, replaced or concurrently modified native sources cannot receive a reviewed write',async()=>{
  const p=profile({});
  for (const mode of ['dirty','drawing','replace','old-property','unrelated']){
    const f=fixture([['Public/Home.md']]);
    try {
      const review=await f.selection.preview(p), row=f.files.get('Public/Home.md');
      if (mode==='dirty') f.leaves.push({view:Object.assign(new TextFileView(),{file:row.file,getViewType:()=> 'markdown',getViewData:()=> 'Draft!'})});
      if (mode==='drawing') f.leaves.push({view:Object.assign(new TextFileView(),{file:row.file,getViewType:()=> 'excalidraw',getViewData:()=> row.text})});
      if (mode==='replace') f.replace('Public/Home.md');
      if (mode==='old-property') f.beforeWrite=()=>{row.text=`---\nkplex-id: ${bId}\n---\nNewer text.\n`;};
      if (mode==='unrelated') f.beforeWrite=()=>{f.add('Private Copy.md',{'kplex-id':aId});};
      const result=await f.selection.applyIds(review.reviewId,true);
      assert.equal(result.state,mode==='dirty'||mode==='drawing'?'blocked':'stale',mode);
      assert.deepEqual(f.writes,[],mode);assert.equal(f.listeners(),0,mode);
    }finally{f.selection.dispose();}
  }
});

test('partial cancellation and timeout distinguish durable writes from an unattempted tail',async()=>{
  const p=profile({});
  for (const mode of ['cancel','metadata']){
    const f=fixture([['Public/Home.md'],['Public/Sub.md']],{metadataSettleMs:15});
    try{
      const review=await f.selection.preview(p);
      let current=true;
      if (mode==='cancel') f.afterWrite=()=>{current=false;};
      else f.noConvergence=true;
      const outcome=await f.selection.applyIds(review.reviewId,true,()=>current);
      assert.deepEqual(outcome,{state:'partial',receipts:[{path:'Public/Home.md',state:mode==='cancel'?'saved':'saved-unverified'}],remaining:1});
      assert.deepEqual(f.stored('Public/Home.md'),{'kplex-id':aId});
      assert.deepEqual(f.stored('Public/Sub.md'),{});
      assert.equal(f.listeners(),0);
    }finally{f.selection.dispose();}
  }
});
