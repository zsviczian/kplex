/**
 * PR #153 E2 measurement gate: actual ordinary GraphBuilder patches against fixed unrelated
 * evidence and growing progressive evidence. Native facts/body-cache hits are finite doubles;
 * fake-clock elapsed times are excluded. Count compaction separately from adjacency copying.
 * An optional exact committed baseline replaces only the named production source modules during
 * compilation. No scheduler, source authority or evidence implementation is simulated.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {noopPatchEntries,portableNoopFixture} from '../../tests/support/noopPatchPortable.mjs';
import {contributorBrowserBundle} from '../../tests/support/contributorBrowserFixture.mjs';
import {probeEvidenceMaintenance} from '../../tests/support/evidenceMaintenanceProbe.mjs';
import {probeUrlPageCopies} from '../../tests/support/urlPageCopyProbe.mjs';
import {spawnNativeSync} from './obsidian/processTools.mjs';

const sources=['src/index/GraphBuilder.ts','src/core/graph/evidence.ts'],ref=process.argv.find(/** Baseline bytes come only from an exact committed source. */arg=>arg.startsWith('--baseline-ref='))?.split('=')[1],overrides={};
if(ref){assert.match(ref,/^[a-f0-9]{7,40}$/);for(const source of sources){const result=spawnNativeSync('git',['show',`${ref}:${source}`],{cwd:process.cwd(),encoding:'utf8',timeout:10000});assert.equal(result.status,0,result.stderr);overrides[source]=result.stdout;}}
const bundle=await contributorBrowserBundle(noopPatchEntries,overrides),rows=[];

/** Supply exact materialized target facts while preserving production reference classification. */
function materialize(f,path,text='Original prose'){
  const file=f.host.add(path,text),page=f.state.pages.get(path)??f.builder.createPage({path,name:file.basename,file});
  page.file=file;f.builder.addPage(f.state,page);f.host.metadata.set(path,{frontmatter:{}});
  f.hot.set(path,{mtime:file.stat.mtime,body:f.M.parseBodyMetadata(text)});return file;
}

/** Resolve only known physical fixtures and use actual hot parsed bodies rather than fake durability. */
function hostFacts(f){
  f.host.app.vault.getMarkdownFiles=/** Ordinary patch inputs are exact controlled native identities. */()=>[...f.host.files.values()];
  f.host.app.metadataCache.getFirstLinkpathDest=/** Canonical physical target paths match the seeded graph. */literal=>f.host.files.get(literal)??f.host.files.get(literal+'.md')??null;
}

/** Keep unsorted relations, target paths, facets and declaration IDs in the receipt outside observation. */
function digest(f){return createHash('sha256').update(JSON.stringify({pages:[...f.state.pages].map(/** Remove only cyclic target objects, retaining exact paths. */([path,page])=>({path,name:page.name,aliases:page.aliases,neighbours:[...page.neighbours].map(/** Every ordered relationship keeps its scalar semantics and target path. */([key,{target,...relation}])=>[key,{...relation,target:target.path}])})),evidence:[...f.state.evidence.declarations()]})).digest('hex');}

for(const change of ['endpoint','role'])for(const degree of [256,512,1024,2048,4096]){
  const f=portableNoopFixture(bundle,degree);hostFacts(f);
  if(change==='role')f.builder.plugin.settings.hierarchy.parents=['Parent'];
  for(let n=0;n<degree;n++)materialize(f,`Target-${n}.md`);
  const leaf=materialize(f,'Leaf.md');f.host.metadata.get(leaf.path).frontmatter.Child=`[[Target-${change==='role'?0:1}]]`;
  assert((await f.builder.patchMarkdownFiles(f.state,[leaf])).ok,'Calibrate through actual semantic publication');
  const before=f.state.evidence.declarationCount,maintenance=probeEvidenceMaintenance(/** Follow this publication's current store across completed replacements. */()=>f.state.evidence),copies=probeUrlPageCopies(f.builder);
  try{
    for(let n=0;n<64;n++){
      f.host.metadata.get(leaf.path).frontmatter=change==='role'?{[n%2?'Child':'Parent']:'[[Target-0]]'}:{Child:`[[Target-${n%2}]]`};
      const result=await f.builder.patchMarkdownFiles(f.state,[leaf]);assert(result.ok);assert.equal(result.semanticChanges,1);assert.equal(result.semanticNoops,0);
    }
    assert.equal(f.state.evidence.declarationCount,before);assert.equal(f.state.evidence.targetIndex,null,'Ordinary work keeps target-kind metadata inactive');
    assert.equal(f.host.reads.length,0);assert.equal(f.host.parses.length,0);
    rows.push({workload:`64 small ordinary ${change} edits over unrelated fixed graph`,degree,edits:64,declarations:before,...maintenance.counts,workingNeighborCopies:copies.counts.neighboursCopied,finalDepth:f.state.evidence.depth,graphDigest:digest(f)});
  }finally{maintenance.restore();copies.restore();f.retire();}
}

for(const owners of [256,512,1024,2048,4096]){
  const f=portableNoopFixture(bundle,0);hostFacts(f);
  // Start with structural identities and hot body facts; every semantic original is ingested by
  // the actual per-file patch path, not seeded in a substitute evidence implementation.
  f.state.evidence=new f.state.evidence.constructor();
  const files=[];for(let n=0;n<owners;n++){const file=materialize(f,`Owner-${n}.md`);f.host.metadata.get(file.path).frontmatter.Child='[[Hub]]';files.push(file);}
  // Supply the next already-parsed body only at its bounded admission boundary. Preloading an
  // entire vault would exceed the production 1,200-entry desktop hot cache and cause LRU thrash.
  const body=f.M.parseBodyMetadata('Original prose');f.hot.clear();
  const maintenance=probeEvidenceMaintenance(/** Scope counts to this progressive publication only. */()=>f.state.evidence),copies=probeUrlPageCopies(f.builder);
  try{
    for(const file of files){f.hot.set(file.path,{mtime:file.stat.mtime,body});const result=await f.builder.patchMarkdownFiles(f.state,[file]);assert(result.ok);assert.equal(result.semanticChanges,1);}
    assert.equal(f.state.evidence.declarationCount,owners);assert.equal(f.state.pages.get('Hub.md').neighbours.size,owners);
    assert.equal(f.state.evidence.targetIndex,null);assert.equal(f.host.reads.length,0);assert.equal(f.host.parses.length,0);
    rows.push({workload:'growing ordinary per-file ingestion',owners,declarations:f.state.evidence.declarationCount,...maintenance.counts,workingNeighborCopies:copies.counts.neighboursCopied,finalDepth:f.state.evidence.depth,graphDigest:digest(f)});
  }finally{maintenance.restore();copies.restore();f.retire();}
}

console.log(JSON.stringify({node:process.version,baselineRef:ref??null,sources:Object.fromEntries(sources.map(/** Attribute exact implementation bytes without a fake timing claim. */source=>[source,createHash('sha256').update(overrides[source]??readFileSync(source)).digest('hex')])),rows,limitations:'Controlled actual ordinary patch work; not native timing, offline-change inventory, full one-shot compilation, retained heap or whole startup. Separate focused/native acceptance owns retention/order/cancellation and latency.'},null,2));
