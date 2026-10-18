/**
 * Deterministic URL clone-facet work counts for #153 B1. The real parser/builder/evidence owners
 * stage a one-edge append with independently sized existing URL metadata. Fixture setup is outside
 * observation, and fake-clock execution reports counts only. Baselines compile committed sources.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { contributorBrowserBundle } from '../../tests/support/contributorBrowserFixture.mjs';
import { noopPatchEntries, portableNoopFixture } from '../../tests/support/noopPatchPortable.mjs';
import { probeUrlPageCopies } from '../../tests/support/urlPageCopyProbe.mjs';
import { spawnNativeSync } from './obsidian/processTools.mjs';

const ref=process.argv.find(/** Only a committed source hash selects the baseline. */ arg=>arg.startsWith('--baseline-ref='))?.split('=')[1],source='src/index/GraphBuilder.ts',overrides={};
if(ref){
  assert.match(ref,/^[a-f0-9]{7,40}$/);
  const result=spawnNativeSync('git',['show',`${ref}:${source}`],{cwd:process.cwd(),encoding:'utf8',timeout:10_000});
  assert.equal(result.status,0,result.stderr);overrides[source]=result.stdout;
}
const bundle=await contributorBrowserBundle(noopPatchEntries,overrides),results=[];
for(const size of [256,512,1024,2048,4096]){
  const f=portableNoopFixture(bundle,0),state=f.M.createGraphState(),target='https://shared.example/path';
  const seed=f.host.add('Seed.md',`[First](${target})`);
  assert(await f.builder.patchUrlReferences(state,seed,f.M.parseBodyMetadata(f.host.texts.get(seed.path)),/** Setup is an isolated working commit. */ (_,publish)=>publish()));
  const page=state.pages.get(target);
  page.aliases=Array.from({length:size},/** Vary existing alias vocabulary independently of this one-edge delta. */ (_,n)=>`Label ${n}`);
  page.tags=Array.from({length:size},/** Nonempty retained facets also exercise negative mutation controls. */ (_,n)=>`Tag ${n}`);
  page.styleTags=Array.from({length:size},/** Preserve ordered style vocabulary rather than comparing sorted sets. */ (_,n)=>`Style ${n}`);
  const retained={aliases:page.aliases,tags:page.tags,styleTags:page.styleTags},expected=JSON.stringify(retained);
  const added=f.host.add('Added.md',`[First](${target})`),probe=probeUrlPageCopies(f.builder);
  try{
    assert(await f.builder.patchUrlReferences(state,added,f.M.parseBodyMetadata(f.host.texts.get(added.path)),/** Commit only the actual staged publication. */ (_,publish)=>publish()));
    assert.equal(JSON.stringify(retained),expected);assert.equal(JSON.stringify({aliases:page.aliases,tags:page.tags,styleTags:page.styleTags}),expected);
    assert(page.neighbours.has(added.path));
    results.push({facetEntries:size,...probe.counts,bodyReads:f.host.reads.length,parses:f.host.parses.length});
  }finally{probe.restore();}
}
console.log(JSON.stringify({node:process.version,baselineRef:ref??null,sourceSha256:createHash('sha256').update(overrides[source]??readFileSync(source)).digest('hex'),results},null,2));
